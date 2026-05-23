import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { nanoid } from 'nanoid';
import { getDb } from './db.service.js';

const scryptAsync = promisify(crypto.scrypt);

const SESSION_COOKIE_NAME = 'openflux_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 256;
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;

function now() {
  return new Date().toISOString();
}

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeUsername(username = '') {
  return String(username || '').trim();
}

function getUsernameKey(username = '') {
  return normalizeUsername(username).toLowerCase();
}

function assertValidUsername(username) {
  const normalizedUsername = normalizeUsername(username);

  if (!USERNAME_PATTERN.test(normalizedUsername)) {
    throw createHttpError(
      'Username must be 3 to 32 characters and contain only letters, numbers, dots, dashes, or underscores.',
      400
    );
  }

  return normalizedUsername;
}

function assertValidPassword(password) {
  const normalizedPassword = String(password || '');

  if (normalizedPassword.length < PASSWORD_MIN_LENGTH || normalizedPassword.length > PASSWORD_MAX_LENGTH) {
    throw createHttpError(
      `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`,
      400
    );
  }

  return normalizedPassword;
}

async function createPasswordRecord(password, salt = crypto.randomBytes(16).toString('hex')) {
  const normalizedPassword = assertValidPassword(password);
  const derivedKey = await scryptAsync(normalizedPassword, salt, 64);

  return {
    passwordSalt: salt,
    passwordHash: Buffer.from(derivedKey).toString('hex')
  };
}

async function verifyPassword(password, user) {
  if (!user?.passwordSalt || !user?.passwordHash) {
    return false;
  }

  const normalizedPassword = String(password || '');
  const derivedKey = await scryptAsync(normalizedPassword, user.passwordSalt, 64);
  const expectedHash = Buffer.from(user.passwordHash, 'hex');
  const actualHash = Buffer.from(derivedKey);

  if (expectedHash.length !== actualHash.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedHash, actualHash);
}

function hashSessionToken(token = '') {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateTemporaryPassword() {
  return crypto.randomBytes(12).toString('base64url').slice(0, 16);
}

function getSafeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    mustChangePassword: Boolean(user.mustChangePassword),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt || null
  };
}

function isSessionExpired(session) {
  const expiresAt = Date.parse(session?.expiresAt || '');
  return !Number.isFinite(expiresAt) || expiresAt <= Date.now();
}

function pruneExpiredSessions(sessions = []) {
  return sessions.filter((session) => !isSessionExpired(session));
}

function findUserById(users = [], id) {
  return users.find((user) => user.id === id) || null;
}

function findUserByUsername(users = [], username) {
  const usernameKey = getUsernameKey(username);
  return users.find((user) => user.usernameKey === usernameKey) || null;
}

function sortUsers(left, right) {
  if (left.role !== right.role) {
    return left.role === 'admin' ? -1 : 1;
  }

  return left.username.localeCompare(right.username);
}

function countOwnedTorrents(torrents = [], userId) {
  return torrents.filter((torrent) => torrent.ownerUserId === userId).length;
}

function toUserSummary(user, torrents = []) {
  const safeUser = getSafeUser(user);
  return {
    ...safeUser,
    ownedTorrentCount: countOwnedTorrents(torrents, user.id)
  };
}

async function readAuthData() {
  const database = getDb();
  await database.read();
  database.data.users ||= [];
  database.data.sessions ||= [];
  database.data.torrents ||= [];
  return database;
}

function getAuthStateFromData(data, sessionToken) {
  if (!sessionToken) {
    return { session: null, user: null };
  }

  const session = (data.sessions || []).find((item) => item.tokenHash === hashSessionToken(sessionToken));
  if (!session || isSessionExpired(session)) {
    return { session: null, user: null };
  }

  const user = findUserById(data.users, session.userId);
  if (!user) {
    return { session: null, user: null };
  }

  return { session, user };
}

function getHasAdminFlag(users = []) {
  return users.some((user) => user.role === 'admin');
}

function buildNoAdminError() {
  return createHttpError(
    'No admin account exists yet. Create one from the terminal with: openflux admin create --username admin --password <password>',
    503
  );
}

function createUserRecord({
  username,
  role,
  passwordHash,
  passwordSalt,
  createdByUserId = null,
  mustChangePassword = false
}) {
  return {
    id: nanoid(),
    username,
    usernameKey: getUsernameKey(username),
    role,
    passwordHash,
    passwordSalt,
    mustChangePassword: Boolean(mustChangePassword),
    createdByUserId,
    createdAt: now(),
    updatedAt: now(),
    lastLoginAt: null
  };
}

function createSessionRecord(userId, tokenHash) {
  const createdAt = now();
  return {
    id: nanoid(),
    userId,
    tokenHash,
    createdAt,
    updatedAt: createdAt,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString()
  };
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function parseCookies(cookieHeader = '') {
  return String(cookieHeader || '')
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((cookies, entry) => {
      const separatorIndex = entry.indexOf('=');

      if (separatorIndex <= 0) {
        return cookies;
      }

      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();

      if (key) {
        cookies[key] = decodeURIComponent(value);
      }

      return cookies;
    }, {});
}

export function getSessionTokenFromRequest(request) {
  const cookies = parseCookies(request?.headers?.cookie);
  return cookies[SESSION_COOKIE_NAME] || null;
}

export function buildSessionCookieHeader(request, sessionToken, { maxAgeMs = SESSION_TTL_MS } = {}) {
  const isSecureRequest = Boolean(request?.secure) || String(request?.headers?.['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase() === 'https';
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`,
    'Path=/',
    `Max-Age=${Math.max(0, Math.floor(maxAgeMs / 1000))}`,
    'HttpOnly',
    'SameSite=Strict'
  ];

  if (isSecureRequest) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function buildClearedSessionCookieHeader(request) {
  return buildSessionCookieHeader(request, '', { maxAgeMs: 0 });
}

export async function getAuthSessionStatus(sessionToken) {
  const database = await readAuthData();
  const { user } = getAuthStateFromData(database.data, sessionToken);

  return {
    authenticated: Boolean(user),
    hasAdmin: getHasAdminFlag(database.data.users),
    user: getSafeUser(user)
  };
}

export async function getAuthStateFromToken(sessionToken) {
  const database = await readAuthData();
  const { user, session } = getAuthStateFromData(database.data, sessionToken);

  return {
    user: getSafeUser(user),
    session: session ? {
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt
    } : null
  };
}

export async function authenticateUser({ username, password }) {
  const normalizedUsername = normalizeUsername(username);
  const database = await readAuthData();
  database.data.sessions = pruneExpiredSessions(database.data.sessions);

  if (!getHasAdminFlag(database.data.users)) {
    throw buildNoAdminError();
  }

  const user = findUserByUsername(database.data.users, normalizedUsername);
  const passwordMatches = user ? await verifyPassword(password, user) : false;

  if (!user || !passwordMatches) {
    throw createHttpError('Invalid username or password.', 401);
  }

  const sessionToken = generateSessionToken();
  const sessionRecord = createSessionRecord(user.id, hashSessionToken(sessionToken));
  user.lastLoginAt = now();
  user.updatedAt = now();
  database.data.sessions.push(sessionRecord);

  await database.write();

  return {
    sessionToken,
    status: {
      authenticated: true,
      hasAdmin: getHasAdminFlag(database.data.users),
      user: getSafeUser(user)
    }
  };
}

export async function destroySession(sessionToken) {
  if (!sessionToken) {
    return;
  }

  const database = await readAuthData();
  const tokenHash = hashSessionToken(sessionToken);
  database.data.sessions = database.data.sessions.filter((session) => session.tokenHash !== tokenHash);
  await database.write();
}

export async function changeOwnPassword({ userId, currentPassword, nextPassword, currentSessionId = null }) {
  const normalizedPassword = assertValidPassword(nextPassword);
  const database = await readAuthData();
  const user = findUserById(database.data.users, userId);

  if (!user) {
    throw createHttpError('User not found.', 404);
  }

  const passwordMatches = await verifyPassword(currentPassword, user);
  if (!passwordMatches) {
    throw createHttpError('Current password is incorrect.', 400);
  }

  const nextPasswordRecord = await createPasswordRecord(normalizedPassword);
  user.passwordHash = nextPasswordRecord.passwordHash;
  user.passwordSalt = nextPasswordRecord.passwordSalt;
  user.mustChangePassword = false;
  user.updatedAt = now();

  database.data.sessions = pruneExpiredSessions(database.data.sessions).filter((session) => (
    session.userId !== user.id || session.id === currentSessionId
  ));

  await database.write();

  return getSafeUser(user);
}

export async function listUsers() {
  const database = await readAuthData();
  return database.data.users
    .slice()
    .sort(sortUsers)
    .map((user) => toUserSummary(user, database.data.torrents));
}

export async function createManagedUser({ username, password, createdByUserId }) {
  const normalizedUsername = assertValidUsername(username);
  const normalizedPassword = assertValidPassword(password);
  const database = await readAuthData();

  if (findUserByUsername(database.data.users, normalizedUsername)) {
    throw createHttpError('That username is already in use.', 409);
  }

  const passwordRecord = await createPasswordRecord(normalizedPassword);
  const user = createUserRecord({
    username: normalizedUsername,
    role: 'user',
    createdByUserId,
    mustChangePassword: false,
    ...passwordRecord
  });

  database.data.users.push(user);
  await database.write();

  return toUserSummary(user, database.data.torrents);
}

export async function issueTemporaryPassword(userId, { temporaryPassword = '', issuedByUserId = null } = {}) {
  const password = temporaryPassword ? assertValidPassword(temporaryPassword) : generateTemporaryPassword();
  const database = await readAuthData();
  const user = findUserById(database.data.users, userId);

  if (!user) {
    throw createHttpError('User not found.', 404);
  }

  if (user.role !== 'user') {
    throw createHttpError('Temporary passwords can only be issued for user accounts.', 400);
  }

  const passwordRecord = await createPasswordRecord(password);
  user.passwordHash = passwordRecord.passwordHash;
  user.passwordSalt = passwordRecord.passwordSalt;
  user.mustChangePassword = true;
  user.updatedAt = now();
  user.lastTemporaryPasswordIssuedAt = now();
  user.lastTemporaryPasswordIssuedByUserId = issuedByUserId;

  database.data.sessions = pruneExpiredSessions(database.data.sessions).filter((session) => session.userId !== user.id);

  await database.write();

  return {
    user: toUserSummary(user, database.data.torrents),
    temporaryPassword: password
  };
}

export async function createAdminUser({ username, password = '' }) {
  const normalizedUsername = assertValidUsername(username);
  const rawPassword = password ? assertValidPassword(password) : generateTemporaryPassword();
  const database = await readAuthData();

  if (findUserByUsername(database.data.users, normalizedUsername)) {
    throw createHttpError('That username is already in use.', 409);
  }

  const passwordRecord = await createPasswordRecord(rawPassword);
  const admin = createUserRecord({
    username: normalizedUsername,
    role: 'admin',
    createdByUserId: null,
    mustChangePassword: !password,
    ...passwordRecord
  });

  database.data.users.push(admin);
  await database.write();

  return {
    user: getSafeUser(admin),
    password: rawPassword,
    generatedPassword: !password
  };
}
