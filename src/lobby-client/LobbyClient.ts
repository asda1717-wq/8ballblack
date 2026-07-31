import { Runtime, Middleware } from "polymatic";
import { io, type Socket } from "socket.io-client";

import { MainClient } from "../eight-ball-client/MainClient";
import { MainOffline } from "../eight-ball-client/MainOffline";
import { isValidRoomId, normalizeRoomId } from "../lobby/RoomId";

export interface LobbyClientContext {}

export class LobbyClient extends Middleware<LobbyClientContext> {
  playOfflineButton: HTMLElement | null = null;
  createRoomButton: HTMLElement | null = null;
  joinRoomButton: HTMLElement | null = null;

  io: Socket;
  room: MainOffline | MainClient | null = null;

  constructor() {
    super();
    this.on("activate", this.handleActivate);
  }

  handleActivate() {
    // 1. Conectar eventos a los botones existentes en la interfaz
    this.bindButtons();

    // 2. Conectar Socket.io original para multijugador
    this.io = io();
    this.io.on("connect", () => console.log("Conectado al servidor de Lobby"));
    this.io.on("room-ready", this.handleRoomReady);
  }

  private hideModal() {
    // Oculta el modal de la pantalla (busca por id 'lobby-modal' o por selector)
    const modal = document.getElementById("lobby-modal") || document.querySelector(".modal-overlay") as HTMLElement;
    if (modal) {
      modal.style.display = "none";
    }
  }

  private bindButtons() {
    // Buscar botones por sus IDs actuales o textos
    const allButtons = Array.from(document.querySelectorAll("button"));

    // Botón Práctica / Bot / Offline
    const botBtn = document.getElementById("btn-start-bot") || 
                   allButtons.find(b => b.innerText.toLowerCase().includes("bot") || b.innerText.toLowerCase().includes("práctica"));

    // Botones de Mesa / Apuestas
    const betButtons = document.querySelectorAll(".bet-btn");

    if (botBtn) {
      botBtn.addEventListener("click", () => {
        this.hideModal();
        this.handlePlayOffline();
      });
    }

    betButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.hideModal();
        this.handleCreateRoom();
      });
    });

    // Soporte para botones originales si existen en el HTML
    this.playOfflineButton = document.getElementById("play-offline");
    this.createRoomButton = document.getElementById("create-room");
    this.joinRoomButton = document.getElementById("join-room");

    if (this.playOfflineButton) {
      this.playOfflineButton.addEventListener("click", () => {
        this.hideModal();
        this.handlePlayOffline();
      });
    }
    if (this.createRoomButton) {
      this.createRoomButton.addEventListener("click", () => {
        this.hideModal();
        this.handleCreateRoom();
      });
    }
    if (this.joinRoomButton) {
      this.joinRoomButton.addEventListener("click", () => {
        this.hideModal();
        this.handleJoinRoom();
      });
    }
  }

  handlePlayOffline = () => {
    this.hideModal();
    if (this.room) {
      Runtime.deactivate(this.room);
      this.room = null;
    }
    Runtime.activate((this.room = new MainOffline()), {});
  };

  handleCreateRoom = () => {
    this.hideModal();
    this.io.emit("create-room");
  };

  handleRoomReady = ({ id }: { id: string }) => {
    this.hideModal();
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

    this.hideModal();
    localStorage.setItem("eight-ball-room", id);
    Runtime.activate((this.room = new MainClient()), {
      room: id,
    });
  };
}
