"use client";

import { io, type Socket } from "socket.io-client";

const socketUrl =
  process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(socketUrl, {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"]
    });
  }

  return socket;
}
