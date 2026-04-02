import { io } from "socket.io-client";

export const createSocketClient = (sessionId) => {
  return io(import.meta.env.VITE_SOCKET_URL || "http://localhost:4000", {
    autoConnect: false,
    transports: ["websocket"],
    auth: {
      sessionId
    }
  });
};
