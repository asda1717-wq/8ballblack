import { Runtime, Middleware } from "polymatic";
import { io, type Socket } from "socket.io-client";

import { MainClient } from "../eight-ball-client/MainClient";
import { MainOffline } from "../eight-ball-client/MainOffline";
import { isValidRoomId, normalizeRoomId } from "../lobby/RoomId";

export interface LobbyClientContext {}

export class LobbyClient extends Middleware<LobbyClientContext> {
  io: Socket;
  room: MainOffline | MainClient | null = null;

  constructor() {
    super();
    this.on("activate", this.handleActivate);
  }

  handleActivate() {
    // Escuchar cualquier clic en la pantalla (Delegación Global de Eventos)
    document.addEventListener("click", this.handleGlobalClick);

    // Conexión de Socket.io
    try {
      this.io = io();
      this.io.on("connect", () => console.log("Conectado al servidor de Lobby"));
      this.io.on("room-ready", this.handleRoomReady);
    } catch (e) {
      console.warn("Socket.io no pudo conectar:", e);
    }
  }

  // Cierra y elimina cualquier ventana/modal superpuesta
  private forceCloseModal() {
    // Ocultar por ID si existe
    const modalById = document.getElementById("lobby-modal");
    if (modalById) modalById.style.display = "none";

    // Ocultar cualquier div con opacidad u overlay que esté tapando la pantalla
    const overlays = document.querySelectorAll("div");
    overlays.forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.position === "fixed" || style.position === "absolute") {
        if (style.zIndex === "100" || style.zIndex === "10000" || el.innerText.includes("Entrar a una Mesa")) {
          el.style.display = "none";
        }
      }
    });
  }

  private handleGlobalClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target || target.tagName !== "BUTTON") return;

    const btnText = target.innerText.toLowerCase();

    // 1. Botón Práctica / Bot
    if (btnText.includes("bot") || btnText.includes("práctica") || target.id === "play-offline") {
      e.preventDefault();
      this.forceCloseModal();
      this.handlePlayOffline();
      return;
    }

    // 2. Botones de Mesas / Apuestas / Crear Sala
    if (btnText.includes("mesa") || btnText.includes("crear") || target.classList.contains("bet-btn") || target.id === "create-room") {
      e.preventDefault();
      this.forceCloseModal();
      this.handleCreateRoom();
      return;
    }

    // 3. Botón Unirse a Sala
    if (btnText.includes("unirse") || target.id === "join-room") {
      e.preventDefault();
      this.forceCloseModal();
      this.handleJoinRoom();
      return;
    }
  };

  handlePlayOffline = () => {
    console.log("Iniciando modo Offline / Bot...");
    this.forceCloseModal();

    if (this.room) {
      Runtime.deactivate(this.room);
      this.room = null;
    }
    
    // Activar juego local
    Runtime.activate((this.room = new MainOffline()), {});
  };

  handleCreateRoom = () => {
    console.log("Creando sala online...");
    this.forceCloseModal();
    if (this.io) {
      this.io.emit("create-room");
    } else {
      // Si falla socket, arranca offline como respaldo
      this.handlePlayOffline();
    }
  };

  handleRoomReady = ({ id }: { id: string }) => {
    this.forceCloseModal();

    if (this.room) {
      Runtime.deactivate(this.room);
      this.room = null;
    }

    localStorage.setItem("eight-ball-room", id);
    Runtime.activate((this.room = new MainClient()), {
      room: id,
    });
  };

  handleJoinRoom = () => {
    const input = window.prompt("Ingresa el ID de la sala:");
    if (!input) return;

    const id = normalizeRoomId(input);

    if (!isValidRoomId(id)) {
      window.alert("ID de sala inválido: '" + input.substring(0, 12) + "' \nEl formato debe ser 'xxx-xxx-xxx'.");
      return;
    }

    this.forceCloseModal();
    localStorage.setItem("eight-ball-room", id);
    Runtime.activate((this.room = new MainClient()), {
      room: id,
    });
  };
}
