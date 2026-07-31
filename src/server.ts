import express from "express";
import http from "http";
import path from "path";
import ViteExpress from "vite-express";
import { Server, Socket } from "socket.io";
import { instrument } from "@socket.io/admin-ui";

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

// --- Lógica de salas (en memoria) ---
const rooms: Map<string, Set<string>> = new Map(); // roomId -> set de socketIds
const socketRooms: Map<string, string> = new Map(); // socketId -> roomId

io.on('connection', (socket: Socket) => {
  console.log(`Socket conectado: ${socket.id}`);

  // Crear sala
  socket.on('create-room', () => {
    const roomId = generateRoomId();
    rooms.set(roomId, new Set([socket.id]));
    socketRooms.set(socket.id, roomId);
    socket.join(roomId);
    socket.emit('room-created', roomId);
    console.log(`Sala creada: ${roomId} por ${socket.id}`);
  });

  // Unirse a sala
  socket.on('join-room', (roomId: string) => {
    if (!rooms.has(roomId)) {
      socket.emit('error', 'La sala no existe');
      return;
    }
    const room = rooms.get(roomId)!;
    if (room.size >= 2) {
      socket.emit('error', 'La sala está llena');
      return;
    }
    room.add(socket.id);
    socketRooms.set(socket.id, roomId);
    socket.join(roomId);
    socket.emit('room-joined', roomId);
    // Notificar al otro jugador que alguien se unió (opcional)
    socket.to(roomId).emit('player-joined', socket.id);
    console.log(`Socket ${socket.id} se unió a sala ${roomId}`);

    // Si ya hay 2 jugadores, iniciar el juego
    if (room.size === 2) {
      io.to(roomId).emit('game-start');
      console.log(`Iniciando juego en sala ${roomId}`);
    }
  });

  // Desconexión
  socket.on('disconnect', () => {
    const roomId = socketRooms.get(socket.id);
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId)!;
      room.delete(socket.id);
      socketRooms.delete(socket.id);
      if (room.size === 0) {
        rooms.delete(roomId);
        console.log(`Sala ${roomId} eliminada (vacía)`);
      } else {
        // Notificar al otro jugador que el oponente se fue
        socket.to(roomId).emit('opponent-left');
      }
    }
    console.log(`Socket desconectado: ${socket.id}`);
  });
});

// Generar ID de sala (6 dígitos)
function generateRoomId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Admin UI (opcional)
instrument(io, { auth: false, mode: "development" });

// Iniciar servidor
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
