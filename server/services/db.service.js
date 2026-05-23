import fs from 'fs-extra';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

const defaultData = {
  torrents: [],
  settings: {},
  media: [],
  users: [],
  sessions: []
};

let db = null;

function cloneDefaultData() {
  return structuredClone(defaultData);
}

export async function initializeDb(dbPath) {
  await fs.ensureFile(dbPath);
  const rawContents = await fs.readFile(dbPath, 'utf8');
  let requiresWrite = false;

  if (!rawContents.trim()) {
    await fs.writeJson(dbPath, defaultData, { spaces: 2 });
    requiresWrite = true;
  }

  const adapter = new JSONFile(dbPath);
  db = new Low(adapter, cloneDefaultData());
  await db.read();
  if (!db.data) {
    db.data = cloneDefaultData();
    requiresWrite = true;
  }

  if (!Array.isArray(db.data.torrents)) {
    db.data.torrents = [];
    requiresWrite = true;
  }

  if (!db.data.settings || typeof db.data.settings !== 'object' || Array.isArray(db.data.settings)) {
    db.data.settings = {};
    requiresWrite = true;
  }

  if (!Array.isArray(db.data.media)) {
    db.data.media = [];
    requiresWrite = true;
  }

  if (!Array.isArray(db.data.users)) {
    db.data.users = [];
    requiresWrite = true;
  }

  if (!Array.isArray(db.data.sessions)) {
    db.data.sessions = [];
    requiresWrite = true;
  }

  if (requiresWrite) {
    await db.write();
  }

  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database has not been initialized');
  }

  return db;
}

export async function refreshDb() {
  const database = getDb();
  await database.read();
  database.data ||= cloneDefaultData();
  database.data.torrents ||= [];
  database.data.settings ||= {};
  database.data.media ||= [];
  database.data.users ||= [];
  database.data.sessions ||= [];
  return database;
}

export async function writeDb() {
  await getDb().write();
}

export async function updateDb(mutator) {
  const database = await refreshDb();
  await mutator(database.data);
  await database.write();
  return database.data;
}
