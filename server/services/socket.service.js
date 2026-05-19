const ioInstances = new Set();

export function initializeSocketService(io) {
  ioInstances.add(io);

  io.on('connection', (socket) => {
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

export function emitSocketEvent(eventName, payload) {
  if (ioInstances.size === 0) {
    return;
  }

  for (const io of ioInstances) {
    io.emit(eventName, payload);
  }
}
