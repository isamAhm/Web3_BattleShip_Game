import { io, Socket } from "socket.io-client";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000";

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(SERVER_URL, {
      withCredentials: true,   // send session cookie
      autoConnect: false,
    });
  }
  return _socket;
}

export function connectSocket(): Socket {
  const socket = getSocket();
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket(): void {
  _socket?.disconnect();
  _socket = null;
}
