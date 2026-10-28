import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let socketInstance: Socket | null = null;

export function getSocket(token?: string): Socket {
  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  const storedToken =
    token || (typeof window !== 'undefined' ? sessionStorage.getItem('wba_session_token') : null);

  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false,
      auth: storedToken ? { token: storedToken } : undefined,
    });
  } else if (storedToken) {
    socketInstance.auth = { token: storedToken };
  }

  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
