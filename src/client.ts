import { Runtime } from "polymatic";
import { LobbyClient } from "./lobby-client/LobbyClient";

// Creamos una instancia del cliente de lobby
const client = new LobbyClient();

// Activamos el Runtime con el cliente
// El LobbyClient se encargará de los botones y de activar MainOffline o MainClient
Runtime.activate(client, {});
