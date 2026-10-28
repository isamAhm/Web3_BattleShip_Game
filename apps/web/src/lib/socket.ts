import { io, Socket } from "socket.io-client";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000";

let _socket: Socket | null = null;

export function getSocket(token?: string): Socket {
  const currentToken =
    token ??
    (typeof window !== "undefined" ? localStorage.getItem("wba_session_token") : null);

  if (!_socket) {
    _socket = io(SERVER_URL, {
      withCredentials: true,
      auth: currentToken ? { token: currentToken } : undefined,
      autoConnect: false,
    });

    _socket.on("connect", () => {
      console.log("[Socket] Successfully connected to server:", _socket?.id);
    });

    _socket.on("connect_error", (err) => {
      console.warn("[Socket] Connect error:", err.message);
    });

    _socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
    });
  } else if (currentToken) {
    _socket.auth = { token: currentToken };
  }

  return _socket;
}

export function connectSocket(token?: string): Socket {
  const currentToken =
    token ??
    (typeof window !== "undefined" ? localStorage.getItem("wba_session_token") : null);

  const socket = getSocket(currentToken || undefined);
  if (currentToken) {
    socket.auth = { token: currentToken };
  }
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

export function disconnectSocket(): void {
  _socket?.disconnect();
  _socket = null;
}

