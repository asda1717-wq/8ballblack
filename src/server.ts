import express from "express";
import http from "http";
import path from "path";
import ViteExpress from "vite-express";
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";
import { lobby } from "./lobby-server/LobbyServer";

const PORT = process.env.PORT || 8000;

const expressApp = express();
const httpServer = http.createServer(expressApp);

// Servir el frontend con ViteExpress
ViteExpress.bind(expressApp, httpServer);

// Crear el servidor de Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Activar el LobbyServer (maneja creación de salas y partidas)
lobby(io);

// Admin UI (opcional)
instrument(io, { auth: false, mode: "development" });

// Iniciar servidor
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
