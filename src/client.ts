import { Runtime } from "polymatic";
import { LobbyClient } from "./lobby-client/LobbyClient";

// Creamos la instancia del cliente
const client = new LobbyClient();

// Activamos el Runtime con el cliente
// El LobbyClient se encargará de manejar los botones y la lógica de juego
Runtime.activate(client, {});
