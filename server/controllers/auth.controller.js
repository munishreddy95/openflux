import {
  authenticateUser,
  buildClearedSessionCookieHeader,
  buildSessionCookieHeader,
  changeOwnPassword,
  destroySession,
  getAuthSessionStatus,
  getSessionTokenFromRequest
} from '../services/auth.service.js';

export async function getSessionStatus(request, response, next) {
  try {
    const status = await getAuthSessionStatus(getSessionTokenFromRequest(request));
    response.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
}

export async function login(request, response, next) {
  try {
    const username = request.body?.username;
    const password = request.body?.password;

    if (!username || !password) {
      response.status(400).json({
        success: false,
        message: 'Username and password are required.'
      });
      return;
    }

    const result = await authenticateUser({ username, password });
    response.setHeader('Set-Cookie', buildSessionCookieHeader(request, result.sessionToken));
    response.json({
      success: true,
      data: result.status
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(request, response, next) {
  try {
    const sessionToken = getSessionTokenFromRequest(request);

    if (sessionToken) {
      await destroySession(sessionToken);
    }

    response.setHeader('Set-Cookie', buildClearedSessionCookieHeader(request));
    response.json({
      success: true,
      data: {
        authenticated: false,
        user: null
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOwnPassword(request, response, next) {
  try {
    const currentPassword = request.body?.currentPassword;
    const nextPassword = request.body?.nextPassword;

    if (!currentPassword || !nextPassword) {
      response.status(400).json({
        success: false,
        message: 'Current password and next password are required.'
      });
      return;
    }

    const user = await changeOwnPassword({
      userId: request.user.id,
      currentPassword,
      nextPassword,
      currentSessionId: request.session?.id || null
    });

    response.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
}
