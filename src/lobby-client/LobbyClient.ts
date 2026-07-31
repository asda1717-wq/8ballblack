import { Runtime, Middleware } from "polymatic";
import { io, type Socket } from "socket.io-client";

import { MainClient } from "../eight-ball-client/MainClient";
import { MainOffline } from "../eight-ball-client/MainOffline";
import { isValidRoomId, normalizeRoomId } from "../lobby/RoomId";

export interface LobbyClientContext {
  // context
}

// Variables globales para UI, fichas y controles
let userChips: number = 1000;
let currentBet: number = 0;
let cueAngle: number = 0;
let cuePower: number = 0;
let isBotGame: boolean = false;
let botDifficulty: string = "medium";

export class LobbyClient extends Middleware<LobbyClientContext> {
  playOfflineButton: HTMLElement;
  createRoomButton: HTMLElement;
  joinRoomButton: HTMLElement;

  io: Socket;
  room: MainOffline | MainClient;

  constructor() {
    super();
    this.on("activate", this.handleActivate);
  }

  handleActivate() {
    // 1. Inyectar la interfaz gráfica profesional sobre la mesa
    this.injectCustomUI();

    // 2. Mapear botones del lobby original
    this.playOfflineButton = document.getElementById("play-offline") || document.getElementById("btn-start-bot");
    this.createRoomButton = document.getElementById("create-room") || document.getElementById("btn-create-room");
    this.joinRoomButton = document.getElementById("join-room") || document.getElementById("btn-join-room");

    if (this.playOfflineButton) {
      this.playOfflineButton.addEventListener("click", this.handlePlayOffline);
    }
    if (this.createRoomButton) {
      this.createRoomButton.addEventListener("click", this.handleCreateRoom);
    }
    if (this.joinRoomButton) {
      this.joinRoomButton.addEventListener("click", this.handleJoinRoom);
    }

    // 3. Configurar eventos de la nueva UI (Apuestas, Barra de Potencia, Ajuste Fino)
    this.setupUIEvents();

    // 4. Conexión de Socket.io original
    this.io = io();
    this.io.on("connect", () => console.log("connected to lobby"));
    this.io.on("room-ready", this.handleRoomReady);
  }

  // --- INYECCIÓN DEL HUD Y MODO PROFESIONAL ---
  private injectCustomUI() {
    if (document.getElementById("hud-container")) return;

    const uiContainer = document.createElement("div");
    uiContainer.id = "hud-container";
    uiContainer.innerHTML = `
      <!-- HUD Superior -->
      <div id="hud" style="position: fixed; top: 15px; left: 50%; transform: translateX(-50%); width: 90%; max-width: 750px; display: flex; justify-content: space-between; align-items: center; background: rgba(15, 15, 15, 0.9); padding: 10px 20px; border-radius: 40px; border: 1px solid rgba(255,255,255,0.12); color: white; font-family: system-ui, sans-serif; z-index: 9999; box-shadow: 0 4px 20px rgba(0,0,0,0.6);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: #222; border: 2px solid #f39c12; display: flex; align-items: center; justify-content: center;">👤</div>
          <div>
            <div id="player-name" style="font-weight: bold; font-size: 14px;">Jugador 1</div>
            <small id="player-chips" style="color: #f1c40f; font-weight: bold;">1,000 Fichas</small>
          </div>
        </div>
        
        <div style="background: linear-gradient(135deg, #27ae60, #2dc997); padding: 6px 18px; border-radius: 20px; font-weight: bold; font-size: 13px; text-transform: uppercase;">
          Bote: $<span id="current-pot">0</span>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="text-align: right;">
            <div id="opponent-name" style="font-weight: bold; font-size: 14px;">Esperando...</div>
            <small id="opponent-status" style="color: #888;">Sin rival</small>
          </div>
          <div style="width: 40px; height: 40px; border-radius: 50%; background: #222; border: 2px solid #e74c3c; display: flex; align-items: center; justify-content: center;">🤖</div>
        </div>
      </div>

      <!-- Barra de Potencia Lateral (Izquierda) -->
      <div id="power-bar-container" style="position: fixed; left: 15px; top: 50%; transform: translateY(-50%); height: 250px; width: 30px; background: rgba(0,0,0,0.7); border-radius: 20px; border: 2px solid #444; padding: 4px; display: flex; flex-direction: column-reverse; z-index: 9999; cursor: pointer;">
        <div id="power-bar-fill" style="width: 100%; height: 0%; background: linear-gradient(to top, #f1c40f, #e74c3c); border-radius: 14px; transition: height 0.04s ease-out;"></div>
      </div>

      <!-- Ajuste Milimétrico (Derecha) -->
      <div id="fine-tune-container" style="position: fixed; right: 15px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; align-items: center; gap: 8px; background: rgba(0,0,0,0.7); padding: 12px 8px; border-radius: 22px; border: 1px solid #444; z-index: 9999;">
        <button id="btn-tune-up" style="background: #2a2a2a; color: white; border: 1px solid #555; width: 36px; height: 36px; border-radius: 50%; font-size: 16px; cursor: pointer;">▲</button>
        <span style="font-size: 9px; color: #aaa; font-family: sans-serif; font-weight: bold;">FINE</span>
        <button id="btn-tune-down" style="background: #2a2a2a; color: white; border: 1px solid #555; width: 36px; height: 36px; border-radius: 50%; font-size: 16px; cursor: pointer;">▼</button>
      </div>

      <!-- Modal de Apuestas / Lobby Principal -->
      <div id="lobby-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.88); display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 10000; color: white; font-family: system-ui, sans-serif;">
        <div style="background: #181818; padding: 25px; border-radius: 18px; width: 320px; text-align: center; border: 1px solid #333;">
          <h2 style="margin-bottom: 5px; font-size: 20px;">8 Ball Pool</h2>
          <p style="color: #777; font-size: 12px; margin-bottom: 18px;">Selecciona la apuesta para entrar</p>
          
          <button class="bet-btn" data-amount="100" style="width: 100%; margin: 6px 0; padding: 12px; background: #253342; color: white; border: 1px solid #3a4b5c; border-radius: 10px; font-weight: bold; cursor: pointer;">Mesa Principiante - $100</button>
          <button class="bet-btn" data-amount="500" style="width: 100%; margin: 6px 0; padding: 12px; background: #253342; color: white; border: 1px solid #3a4b5c; border-radius: 10px; font-weight: bold; cursor: pointer;">Mesa Pro - $500</button>
          
          <hr style="border: 0.5px solid #282828; margin: 15px 0;">

          <!-- Accesos directos a salas originales -->
          <div style="display: flex; gap: 8px; margin-bottom: 15px;">
            <button id="btn-create-room" style="flex: 1; padding: 8px; background: #34495e; color: white; border: none; border-radius: 6px; font-size: 11px; cursor: pointer;">Crear Sala</button>
            <button id="btn-join-room" style="flex: 1; padding: 8px; background: #34495e; color: white; border: none; border-radius: 6px; font-size: 11px; cursor: pointer;">Unirse a Sala</button>
          </div>

          <label style="font-size: 11px; color: #aaa; display: block; text-align: left; margin-bottom: 4px;">Dificultad del Bot:</label>
          <select id="bot-difficulty" style="width: 100%; padding: 8px; background: #222; color: white; border: 1px solid #444; border-radius: 8px; margin-bottom: 10px;">
            <option value="medium">Media</option>
            <option value="hard">Difícil</option>
          </select>
          <button id="btn-start-bot" style="width: 100%; padding: 11px; background: #f39c12; color: black; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Practicar / vs Bot</button>
        </div>
      </div>
    `;

    document.body.appendChild(uiContainer);
  }

  // --- CONFIGURACIÓN DE EVENTOS DE INTERFAZ ---
  private setupUIEvents() {
    // Selección de apuestas
    document.querySelectorAll(".bet-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const amount = parseInt(target.getAttribute("data-amount") || "100");
        this.applyBet(amount);
        this.handleCreateRoom(); // Intenta buscar sala online
      });
    });

    // Ajuste milimétrico (Fine Tuning)
    const FINE_TUNE_STEP = 0.005;
    document.getElementById("btn-tune-up")?.addEventListener("click", () => {
      cueAngle += FINE_TUNE_STEP;
      this.updateCueRotation();
    });

    document.getElementById("btn-tune-down")?.addEventListener("click", () => {
      cueAngle -= FINE_TUNE_STEP;
      this.updateCueRotation();
    });

    // Arrastre de Barra de Potencia Lateral
    const powerBar = document.getElementById("power-bar-container");
    const powerFill = document.getElementById("power-bar-fill");
    let isDragging = false;

    if (powerBar) {
      powerBar.addEventListener("mousedown", (e) => {
        isDragging = true;
        this.calcPower(e, powerBar, powerFill);
      });

      window.addEventListener("mousemove", (e) => {
        if (isDragging) this.calcPower(e, powerBar, powerFill);
      });

      window.addEventListener("mouseup", () => {
        if (isDragging) {
          isDragging = false;
          this.executeShot();
          if (powerFill) powerFill.style.height = "0%";
        }
      });
    }
  }

  private applyBet(amount: number) {
    if (userChips < amount) {
      alert("No tienes suficientes fichas");
      return;
    }
    currentBet = amount;
    userChips -= amount;

    const potElem = document.getElementById("current-pot");
    const chipsElem = document.getElementById("player-chips");
    const modal = document.getElementById("lobby-modal");

    if (potElem) potElem.innerText = (amount * 2).toString();
    if (chipsElem) chipsElem.innerText = `${userChips} Fichas`;
    if (modal) modal.style.display = "none";
  }

  private calcPower(e: MouseEvent, bar: HTMLElement, fill: HTMLElement | null) {
    const rect = bar.getBoundingClientRect();
    const offsetY = rect.bottom - e.clientY;
    cuePower = Math.max(0, Math.min(100, (offsetY / rect.height) * 100));
    if (fill) fill.style.height = `${cuePower}%`;
  }

  private updateCueRotation() {
    console.log("Ángulo ajustado milimétricamente:", cueAngle);
  }

  private executeShot() {
    if (cuePower <= 0) return;
    console.log(`Disparo lanzado | Potencia: ${cuePower}% | Ángulo: ${cueAngle}`);
    cuePower = 0;
  }

  // --- MÉTODOS ORIGINALES DE POLYMATIC CONSERVADOS ---
  handlePlayOffline = () => {
    const select = document.getElementById("bot-difficulty") as HTMLSelectElement;
    if (select) botDifficulty = select.value;
    isBotGame = true;

    const oppName = document.getElementById("opponent-name");
    const oppStatus = document.getElementById("opponent-status");
    if (oppName) oppName.innerText = `Bot (${botDifficulty.toUpperCase()})`;
    if (oppStatus) oppStatus.innerText = "En línea";

    this.applyBet(100);

    if (this.room) {
      Runtime.deactivate(this.room);
      this.room = null;
    }
    Runtime.activate((this.room = new MainOffline()), {});
  };

  handleCreateRoom = () => {
    this.io.emit("create-room");
  };

  handleRoomReady = ({ id }: { id: string }) => {
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
    const input = window.prompt("Please enter room id:");
    if (!input) return;

    const id = normalizeRoomId(input);

    if (!isValidRoomId(id)) {
      window.alert(
        "Invalid room id: '" +
          input.substring(0, 12) +
          "' \nRoom id format is 'xxx-xxx-xxx'."
      );
      return;
    }

    localStorage.setItem("eight-ball-room", id);
    Runtime.activate((this.room = new MainClient()), {
      room: id,
    });
  };
}
