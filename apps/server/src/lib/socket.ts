import type { Server as HttpServer } from "http";

import { Server as SocketIOServer } from "socket.io";

import { env } from "../config/env";

let io: SocketIOServer | null = null;

export function initializeSocketServer(server: HttpServer) {
  if (io) {
    return io;
  }

  io = new SocketIOServer(server, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    socket.on("join-deployment", (deploymentId: string) => {
      if (typeof deploymentId === "string" && deploymentId.trim()) {
        socket.join(deploymentId);
      }
    });

    socket.on("leave-deployment", (deploymentId: string) => {
      if (typeof deploymentId === "string" && deploymentId.trim()) {
        socket.leave(deploymentId);
      }
    });
  });

  return io;
}

export function getSocketServer() {
  if (!io) {
    throw new Error("Socket.IO server has not been initialized.");
  }

  return io;
}
