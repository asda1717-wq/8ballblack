import { Runtime } from "polymatic";
import { io, Socket } from "socket.io-client";
import { MainOffline } from "./main/MainOffline"; // Ajusta la ruta si es diferente
import { MainClient } from "./main/MainClient";   // Ajusta la ruta si es diferente

// --- Elementos del DOM ---
const lobbyEl = document.getElementById('lobby')!;
const gameContainer = document.getElementById('game')!;
const statusText = document.getElementById('status-text')!;

// --- Estado del juego ---
let socket: Socket | null = null;
let currentRoom: string | null = null;
let isOffline = false;

// --- Funciones auxiliares ---
function setStatus(msg: string, isError = false) {
  statusText.textContent = msg;
  statusText.style.color = isError ? '#e94560' : '#4ecdc4';
}

function showGame() {
  lobbyEl.classList.add('hidden');
  gameContainer.classList.add('active');
}

function hideGame() {
  lobbyEl.classList.remove('hidden');
  gameContainer.classList.remove('active');
}

function connectSocket() {
  if (!socket) {
    socket = io(); // Se conecta al mismo host
    socket.on('connect', () => setStatus('Conectado al servidor'));
    socket.on('disconnect', () => setStatus('Desconectado del servidor', true));
    socket.on('error', (err) => setStatus(`Error: ${err}`, true));
    socket.on('room-created', (roomId) => {
      setStatus(`Sala creada: ${roomId}. Comparte este código.`);
      currentRoom = roomId;
    });
    socket.on('room-joined', (roomId) => {
      setStatus(`Te has unido a la sala ${roomId}. Esperando inicio...`);
      currentRoom = roomId;
    });
    socket.on('game-start', () => {
      setStatus('¡La partida ha comenzado!');
      showGame();
      // Iniciamos el juego multijugador
      startMultiplayerGame();
    });
  }
  return socket;
}

// --- Iniciar juego offline ---
function startOfflineGame() {
  isOffline = true;
  setStatus('Iniciando partida offline...');
  showGame();
  // Desactivamos socket si estaba conectado
  if (socket) { socket.disconnect(); socket = null; }
  // Lanzamos el MainOffline (sin conexión)
  Runtime.activate(new MainOffline(), { container: gameContainer });
}

// --- Iniciar juego multijugador (cliente) ---
function startMultiplayerGame() {
  if (!socket) return;
  // Creamos una instancia de MainClient que usará el socket existente
  // Nota: MainClient debe recibir el socket en su constructor o tener un método setSocket
  // Si no, tendremos que modificar MainClient.
  // Asumo que MainClient tiene un constructor que acepta socket.
  // Si no, puedes pasar el socket como propiedad.
  const mainClient = new MainClient(socket);
  Runtime.activate(mainClient, { container: gameContainer });
}

// --- Eventos de botones ---

// 1. Jugar Offline
document.getElementById('play-offline')!.addEventListener('click', () => {
  try {
    startOfflineGame();
  } catch (err: any) {
    setStatus(`Error: ${err.message}`, true);
    console.error(err);
  }
});

// 2. Crear Sala
document.getElementById('create-room')!.addEventListener('click', () => {
  try {
    const s = connectSocket();
    s.emit('create-room');
    setStatus('Creando sala...');
  } catch (err: any) {
    setStatus(`Error: ${err.message}`, true);
    console.error(err);
  }
});

// 3. Unirse a Sala
document.getElementById('join-room')!.addEventListener('click', () => {
  const roomCode = prompt('Introduce el código de la sala:');
  if (!roomCode) return;
  try {
    const s = connectSocket();
    s.emit('join-room', roomCode);
    setStatus(`Uniéndose a sala ${roomCode}...`);
  } catch (err: any) {
    setStatus(`Error: ${err.message}`, true);
    console.error(err);
  }
});

// --- Estado inicial ---
setStatus('Listo. Elige una opción.');

// --- (Opcional) Si quieres que el juego se cierre al recargar ---
window.addEventListener('beforeunload', () => {
  if (socket) socket.disconnect();
});
