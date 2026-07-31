import { Middleware } from "polymatic";
import { CueStick, type BilliardContext } from "./BilliardContext";
import { isMyTurn } from "../eight-ball-client/ClientContext";

export class CueShot extends Middleware<BilliardContext> {
  private direction: { x: number; y: number } = { x: 1, y: 0 };
  private force: number = 0.5;
  private spinX: number = 0;
  private spinY: number = 0;
  private aimAngle: number = 0;
  private isCharging: boolean = false;
  private chargeStartTime: number = 0;
  private chargeInterval: any;

  constructor() {
    super();
    this.on("activate", this.handleActivate);
    this.on("deactivate", this.handleDeactivate);
    this.on("user-pointer-start", this.handlePointerStart);
    this.on("user-pointer-move", this.handlePointerMove);
    this.on("user-pointer-end", this.handlePointerUp);
    this.on("frame-loop", this.handleFrameLoop);

    this.on("force-update", (force: number) => { this.force = force; });
    this.on("spin-update", (spin: { x: number; y: number }) => {
      this.spinX = spin.x;
      this.spinY = spin.y;
    });
    this.on("aim-adjust", (angle: number) => {
      this.aimAngle = angle;
      if (this.context.cue) this.updateCueDirection();
    });
  }

  handleActivate() {
    this.direction = { x: 1, y: 0 };
  }

  handleDeactivate() {
    this.context.cue = null;
    if (this.chargeInterval) clearInterval(this.chargeInterval);
  }

  private updateCueDirection() {
    const cue = this.context.cue;
    if (!cue) return;
    const angle = Math.atan2(this.direction.y, this.direction.x) + this.aimAngle;
    const len = 1.5;
    cue.end.x = cue.start.x + Math.cos(angle) * len;
    cue.end.y = cue.start.y + Math.sin(angle) * len;
  }

  handlePointerStart = (point: { x: number; y: number }) => {
    if (!isMyTurn(this.context)) return;
    const ball = this.context.balls?.find(b => b.color === "white");
    if (!ball) return;

    // Iniciar apuntado
    const cue = new CueStick();
    cue.ball = ball;
    cue.start.x = ball.position.x;
    cue.start.y = ball.position.y;
    const dx = point.x - cue.start.x;
    const dy = point.y - cue.start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.01) {
      this.direction.x = dx / dist;
      this.direction.y = dy / dist;
    }
    this.updateCueDirection();
    this.context.cue = cue;

    // Iniciar carga de fuerza (mantener presionado)
    this.isCharging = true;
    this.chargeStartTime = Date.now();
    this.force = 0; // empezar desde 0
    this.emit("force-update", this.force);

    // Actualizar fuerza en intervalo (simula la barra subiendo y bajando)
    let increasing = true;
    if (this.chargeInterval) clearInterval(this.chargeInterval);
    this.chargeInterval = setInterval(() => {
      if (!this.isCharging) return;
      if (increasing) {
        this.force += 0.02;
        if (this.force >= 1) { this.force = 1; increasing = false; }
      } else {
        this.force -= 0.02;
        if (this.force <= 0) { this.force = 0; increasing = true; }
      }
      // Redondear a 2 decimales
      this.force = Math.round(this.force * 100) / 100;
      this.emit("force-update", this.force);
      // Actualizar el slider visual
      const slider = document.querySelector('.power-slider') as HTMLInputElement;
      if (slider) slider.value = String(this.force * 100);
    }, 50);
  };

  handlePointerMove = (point: { x: number; y: number }) => {
    if (!this.context.cue) return;
    const cue = this.context.cue;
    const dx = point.x - cue.start.x;
    const dy = point.y - cue.start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.01) {
      this.direction.x = dx / dist;
      this.direction.y = dy / dist;
    }
    this.updateCueDirection();
  };

  handlePointerUp = (point: { x: number; y: number }) => {
    if (!this.context.cue) return;
    this.isCharging = false;
    if (this.chargeInterval) {
      clearInterval(this.chargeInterval);
      this.chargeInterval = null;
    }

    const cue = this.context.cue;
    const ball = cue.ball;
    const power = this.force * 15;
    const impulseX = this.direction.x * power;
    const impulseY = this.direction.y * power;

    // Si la fuerza es muy baja, no disparar
    if (this.force < 0.05) {
      this.context.cue = null;
      return;
    }

    this.context.cue = null;
    this.emit("cue-shot", {
      ball: ball,
      shot: { x: impulseX, y: impulseY },
      spin: { x: this.spinX, y: this.spinY }
    });

    // Resetear fuerza y spin
    this.force = 0.5;
    this.spinX = 0;
    this.spinY = 0;
    this.emit("force-update", this.force);
    this.emit("spin-update", { x: 0, y: 0 });
    const slider = document.querySelector('.power-slider') as HTMLInputElement;
    if (slider) slider.value = "50";
    const knob = document.querySelector('.spin-knob') as HTMLDivElement;
    if (knob) { knob.style.top = "50%"; knob.style.left = "50%"; }
  };

  handleFrameLoop = () => {
    // Mantener actualización del taco
  };
          }
