import { getAuthStateFromToken, getSessionTokenFromRequest } from '../services/auth.service.js';

export async function attachAuthSession(request, _response, next) {
  try {
    const sessionToken = getSessionTokenFromRequest(request);
    const authState = await getAuthStateFromToken(sessionToken);

    request.user = authState.user;
    request.session = authState.session;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(request, response, next) {
  if (!request.user) {
    response.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
    return;
  }

  next();
}

export function requireAdmin(request, response, next) {
  if (request.user?.role !== 'admin') {
    response.status(403).json({
      success: false,
      message: 'Admin access is required.'
    });
    return;
  }

  next();
}

export function requirePasswordChangeResolved(request, response, next) {
  if (request.user?.mustChangePassword) {
    response.status(403).json({
      success: false,
      message: 'Password change required before continuing.'
    });
    return;
  }

  next();
}
