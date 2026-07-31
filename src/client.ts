import { Runtime } from "polymatic";
import { LobbyClient } from "./lobby-client/LobbyClient";

// Elementos del DOM
const lobbyEl = document.getElementById('lobby')!;
const gameContainer = document.getElementById('game')!;
const statusText = document.getElementById('status-text')!;
const balanceEl = document.getElementById('balance')!;
const potEl = document.getElementById('pot')!;

// Instancia del cliente
const client = new LobbyClient();
let currentRoomId: string | null = null;

// Función para actualizar el estado
function setStatus(msg: string, isError = false) {
  statusText.textContent = msg;
  statusText.style.color = isError ? '#e94560' : '#4ecdc4';
}

// Función para iniciar el juego (oculta el lobby y muestra el contenedor)
function startGame() {
  lobbyEl.classList.add('hidden');
  gameContainer.classList.add('active');
  // El motor de Polymatic ya se encargará de renderizar en #game
}

// --- EVENTOS DE BOTONES ---

// 1. Jugar Offline
document.getElementById('play-offline')!.addEventListener('click', async () => {
  try {
    setStatus('Creando partida offline...');
    const roomName = `offline-${Date.now()}`;
    // Creamos la sala
    await client.createLobby(roomName);
    currentRoomId = roomName;
    setStatus(`Sala ${roomName} creada. Uniendo al bot...`);
    
    // Unimos un segundo jugador simulado (bot)
    // En un entorno real, esto sería otro cliente, pero aquí forzamos la unión
    // Nota: El servidor debe permitir que un segundo jugador se una.
    // Si no, puedes modificar el servidor para añadir un bot automáticamente.
    await client.joinLobby(roomName, 'Bot');
    setStatus('¡Partida iniciada!');
    startGame();
  } catch (err: any) {
    setStatus(`Error: ${err.message || err}`, true);
    console.error(err);
  }
});

// 2. Crear Sala (multijugador)
document.getElementById('create-room')!.addEventListener('click', async () => {
  try {
    const roomName = `sala-${Math.floor(Math.random() * 10000)}`;
    setStatus(`Creando sala ${roomName}...`);
    await client.createLobby(roomName);
    currentRoomId = roomName;
    setStatus(`Sala creada: ${roomName}. Comparte el código con tu amigo.`);
    // Opcional: mostrar el código en la interfaz
  } catch (err: any) {
    setStatus(`Error: ${err.message || err}`, true);
    console.error(err);
  }
});

// 3. Unirse a Sala
document.getElementById('join-room')!.addEventListener('click', async () => {
  const roomCode = prompt('Introduce el código de la sala:');
  if (!roomCode) return;
  try {
    setStatus(`Uniéndose a sala ${roomCode}...`);
    await client.joinLobby(roomCode);
    currentRoomId = roomCode;
    setStatus(`Te has unido a la sala ${roomCode}. Esperando a que comience...`);
    // El juego comenzará cuando el servidor lo indique (evento 'game-start')
  } catch (err: any) {
    setStatus(`Error: ${err.message || err}`, true);
    console.error(err);
  }
});

// --- SUSCRIPCIÓN A EVENTOS DEL CLIENTE (para saber cuándo empieza el juego) ---

// Escuchamos cuando el cliente recibe el evento de inicio de partida
client.on('game-start', () => {
  setStatus('¡La partida ha comenzado!');
  startGame();
});

// También podemos escuchar errores del servidor
client.on('error', (err: any) => {
  setStatus(`Error del servidor: ${err.message || err}`, true);
});

// --- INICIALIZACIÓN ---
// Activamos el Runtime de Polymatic con nuestro cliente
// El motor se encargará de renderizar en el contenedor #game
Runtime.activate(client, { container: gameContainer });

// Estado inicial
setStatus('Listo. Elige una opción.');
