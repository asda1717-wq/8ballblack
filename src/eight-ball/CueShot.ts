import { Middleware } from "polymatic";
import { CueStick, type BilliardContext } from "./BilliardContext";
import { isMyTurn } from "../eight-ball-client/ClientContext";

export class CueShot extends Middleware<BilliardContext> {
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

    this.pointerStart = point;
    this.isAiming = true;

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
    const power = this.force * 15;
    const impulseX = this.direction.x * power;
    const impulseY = this.direction.y * power;
    this.context.cue = null;
    this.emit("cue-shot", {
      ball: ball,
      shot: { x: impulseX, y: impulseY },
      spin: { x: this.spinX, y: this.spinY }
    });
    this.spinX = 0;
    this.spinY = 0;
  };

  handleFrameLoop = () => {
    // Mantenemos la lógica vacía, solo actualizamos en los eventos.
  };
}
