import { io } from 'socket.io-client';

let socket;

export function getSocket() {
  if (!socket) {
    socket = io({
      autoConnect: false,
      withCredentials: true
    });
  }

  return socket;
}

export function connectSocket(handlers = {}) {
  const client = getSocket();
  const emitConnected = () => {
    client.emit('client:connected');
  };

  Object.entries(handlers).forEach(([eventName, handler]) => {
    client.on(eventName, handler);
  });
  client.on('connect', emitConnected);

  if (!client.connected) {
    client.connect();
  }

  return () => {
    Object.entries(handlers).forEach(([eventName, handler]) => {
      client.off(eventName, handler);
    });
    client.off('connect', emitConnected);
  };
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
  }
}
