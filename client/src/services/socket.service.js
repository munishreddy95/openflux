import { io } from 'socket.io-client';

let socket;

export function getSocket() {
  if (!socket) {
    socket = io({
      autoConnect: false
    });
  }

  return socket;
}

export function connectSocket(handlers = {}) {
  const client = getSocket();

  Object.entries(handlers).forEach(([eventName, handler]) => {
    client.on(eventName, handler);
  });

  if (!client.connected) {
    client.connect();
  }

  client.emit('client:connected');

  return () => {
    Object.entries(handlers).forEach(([eventName, handler]) => {
      client.off(eventName, handler);
    });
  };
}
