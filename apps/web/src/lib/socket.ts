import { io, Socket } from "socket.io-client";

const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ??
  process.env.NEXT_PUBLIC_SOCKET_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

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
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 5000,
      transports: ["websocket", "polling"],
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
  } else if (currentToken && (!_socket.auth || (_socket.auth as any).token !== currentToken)) {
    _socket.auth = { token: currentToken };
  }

  return _socket;
}

export function connectSocket(token?: string): Socket {
  const currentToken =
    token ??
    (typeof window !== "undefined" ? localStorage.getItem("wba_session_token") : null);

  // The socket instance is never replaced: components keep their listeners on it. When the
  // identity changes we only swap the auth token and reconnect the same instance.
  const previousToken = (_socket?.auth as { token?: string } | undefined)?.token;
  const socket = getSocket(currentToken || undefined);
  const tokenChanged = !!_socket && !!currentToken && previousToken !== currentToken;
  if (currentToken) {
    socket.auth = { token: currentToken };
  }
  if (tokenChanged && (socket.connected || socket.active)) {
    socket.disconnect();
  }
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

export function waitForSocketConnection(
  socket: Socket,
  timeoutMs = 3500
): Promise<{ ok: boolean; error?: string }> {
  if (socket.connected) return Promise.resolve({ ok: true });

  return new Promise((resolve) => {
    let timer: any;

    const onConnect = () => {
      clearTimeout(timer);
      socket.off("connect", onConnect);
      socket.off("connect_error", onError);
      resolve({ ok: true });
    };

    const onError = (err: any) => {
      clearTimeout(timer);
      socket.off("connect", onConnect);
      socket.off("connect_error", onError);
      const msg = err?.message || "Connection failed";
      console.warn("[waitForSocketConnection] connect_error:", msg);
      resolve({ ok: false, error: msg });
    };

    timer = setTimeout(() => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onError);
      if (socket.connected) {
        resolve({ ok: true });
      } else {
        resolve({
          ok: false,
          error: "Connection timed out. Battle server did not respond in time.",
        });
      }
    }, timeoutMs);

    socket.once("connect", onConnect);
    socket.once("connect_error", onError);

    if (!socket.connected) {
      socket.connect();
    }
  });
}

export function disconnectSocket(): void {
  // Keep the instance (and its listeners); a later connectSocket() reuses it.
  _socket?.disconnect();
}
