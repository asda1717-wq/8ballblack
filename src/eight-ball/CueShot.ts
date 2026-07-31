import { Middleware } from "polymatic";
import { CueStick, type BilliardContext } from "./BilliardContext";
import { isMyTurn } from "../eight-ball-client/ClientContext";

/**
 * CueShot mejorado con soporte para fuerza, spin y ajuste fino.
 */
export class CueShot extends Middleware<BilliardContext> {
  // Estado actual
  private direction: { x: number; y: number } = { x: 1, y: 0 };
  private force: number = 0.5;
  private spinX: number = 0;
  private spinY: number = 0;
  private aimAngle: number = 0;
  private pointerStart: { x: number; y: number } | null = null;
  private isAiming: boolean = false;

  constructor() {
    super();
    this.on("activate", this.handleActivate);
    this.on("deactivate", this.handleDeactivate);
    this.on("user-pointer-start", this.handlePointerStart);
    this.on("user-pointer-move", this.handlePointerMove);
    this.on("user-pointer-end", this.handlePointerUp);
    this.on("frame-loop", this.handleFrameLoop);
    // Escuchar eventos de AdvancedControls
    this.on("force-update", (force: number) => { this.force = force; });
    this.on("spin-update", (spin: { x: number; y: number }) => {
      this.spinX = spin.x;
      this.spinY = spin.y;
    });
    this.on("aim-adjust", (angle: number) => {
      this.aimAngle = angle;
      // Recalcular dirección si hay un taco activo
      if (this.context.cue) {
        this.updateCueDirection();
      }
    });
  }

  handleActivate() {
    // Inicializar dirección por defecto (hacia la derecha)
    this.direction = { x: 1, y: 0 };
  }

  handleDeactivate() {
    this.context.cue = null;
  }

  private updateCueDirection() {
    const cue = this.context.cue;
    if (!cue) return;
    const angle = Math.atan2(this.direction.y, this.direction.x) + this.aimAngle;
    const len = 1.5; // longitud del taco (en unidades del juego)
    cue.end.x = cue.start.x + Math.cos(angle) * len;
    cue.end.y = cue.start.y + Math.sin(angle) * len;
  }

  handlePointerStart = (point: { x: number; y: number }) => {
    if (!isMyTurn(this.context)) return;
    const ball = this.context.balls?.find(b => b.color === "white");
    if (!ball) return;

    this.pointerStart = point;
    this.isAiming = true;

    // Crear el taco
    const cue = new CueStick();
    cue.ball = ball;
    cue.start.x = ball.position.x;
    cue.start.y = ball.position.y;
    // Dirección inicial hacia el puntero
    const dx = point.x - cue.start.x;
    const dy = point.y - cue.start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.01) {
      this.direction.x = dx / dist;
      this.direction.y = dy / dist;
    }
    this.updateCueDirection();
    this.context.cue = cue;
  };

  handlePointerMove = (point: { x: number; y: number }) => {
    if (!this.isAiming || !this.context.cue) return;
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
    if (!this.isAiming || !this.context.cue) return;
    this.isAiming = false;

    const cue = this.context.cue;
    const ball = cue.ball;

    // Calcular impulso basado en la fuerza y dirección
    const power = this.force * 15; // factor de escala
    const impulseX = this.direction.x * power;
    const impulseY = this.direction.y * power;

    // Eliminar el taco de la vista
    this.context.cue = null;

    // Emitir el tiro con fuerza y spin
    this.emit("cue-shot", {
      ball: ball,
      shot: { x: impulseX, y: impulseY },
      spin: { x: this.spinX, y: this.spinY }
    });

    // Resetear spin a cero después del tiro
    this.spinX = 0;
    this.spinY = 0;
  };

  handleFrameLoop = () => {
    // Si el taco está activo, actualizar su posición (ya se hace en los eventos)
  };
}
