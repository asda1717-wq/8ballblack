import { Runtime } from "polymatic";
import { LobbyClient } from "./lobby-client/LobbyClient";

const client = new LobbyClient();
Runtime.activate(client, {});

document.getElementById('play-offline')?.addEventListener('click', () => {
  setTimeout(() => {
    const gameDiv = document.getElementById('game');
    if (gameDiv && gameDiv.querySelector('svg')) {
      document.getElementById('lobby')?.classList.add('hidden');
      gameDiv.classList.add('active');
    }
  }, 300);
});
