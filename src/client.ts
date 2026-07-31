import { Runtime } from "polymatic";
import { LobbyClient } from "./lobby-client/LobbyClient";

// Creamos el cliente de lobby
const client = new LobbyClient();
Runtime.activate(client, {});

// --- Control de visibilidad ---

// Mostrar el juego cuando se hace clic en "Jugar Offline"
document.getElementById('play-offline')?.addEventListener('click', () => {
  // Esperamos a que LobbyClient active MainOffline (que emite 'game-start')
  setTimeout(() => {
    const gameDiv = document.getElementById('game');
    // Verificamos que el SVG esté renderizado (señal de que el juego cargó)
    if (gameDiv && gameDiv.querySelector('svg')) {
      document.getElementById('lobby')?.classList.add('hidden');
      gameDiv.classList.add('active');
    }
  }, 300);
});

// También ocultar el lobby al crear sala (por si el usuario quiere ver algo)
document.getElementById('create-room')?.addEventListener('click', () => {
  // Mostramos un mensaje de "creando sala" en el estado
  // No ocultamos el lobby aún, porque el juego no ha comenzado
  // Pero podemos añadir un indicador
  const statusText = document.getElementById('status-text');
  if (statusText) statusText.textContent = 'Creando sala...';
});

// Similar para unirse
document.getElementById('join-room')?.addEventListener('click', () => {
  const statusText = document.getElementById('status-text');
  if (statusText) statusText.textContent = 'Ingresa el código de la sala';
  // El prompt lo maneja LobbyClient internamente
});
