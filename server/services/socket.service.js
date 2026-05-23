import { getAuthStateFromToken, getSessionTokenFromRequest } from './auth.service.js';

const ioInstances = new Set();
const ADMIN_ROOM = 'role:admin';

function getUserRoom(userId) {
  return `user:${userId}`;
}

export function initializeSocketService(io) {
  ioInstances.add(io);
  io.use(async (socket, next) => {
    try {
      const sessionToken = getSessionTokenFromRequest(socket.request);
      const authState = await getAuthStateFromToken(sessionToken);

      if (!authState.user) {
        next(new Error('Authentication required.'));
        return;
      }

      socket.data.user = authState.user;
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on('connection', (socket) => {
    const currentUser = socket.data.user;
    socket.join(getUserRoom(currentUser.id));

    if (currentUser.role === 'admin') {
      socket.join(ADMIN_ROOM);
    }

    socket.emit('server:ready', { success: true });
    socket.on('client:connected', () => {
      socket.emit('server:ack', { connectedAt: new Date().toISOString() });
    });
    socket.on('torrent:watch', (payload = {}) => {
      if (payload.id) {
        socket.join(`torrent:${payload.id}`);
      }
    });
  });
}

export function emitSocketEvent(eventName, payload, { ownerUserId = null, includeAdmins = true } = {}) {
  if (ioInstances.size === 0) {
    return;
  }

  for (const io of ioInstances) {
    if (!ownerUserId && !includeAdmins) {
      continue;
    }

    let broadcaster = io;

    if (ownerUserId) {
      broadcaster = broadcaster.to(getUserRoom(ownerUserId));
    }

    if (includeAdmins) {
      broadcaster = broadcaster.to(ADMIN_ROOM);
    }

    broadcaster.emit(eventName, payload);
  }
}
