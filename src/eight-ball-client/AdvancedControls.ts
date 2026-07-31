import { Middleware } from "polymatic";

export class AdvancedControls extends Middleware {
  force: number = 0.5;
  spinX: number = 0;
  spinY: number = 0;
  aimAngle: number = 0;

  private container: HTMLDivElement;
  private forceSlider: HTMLInputElement;
  private spinJoystick: HTMLDivElement;
  private spinKnob: HTMLDivElement;
  private spinDragging: boolean = false;

  constructor() {
    super();
    this.on("activate", this.handleActivate);
    this.on("deactivate", this.handleDeactivate);
  }

  handleActivate = () => {
    this.container = document.createElement("div");
    this.container.className = "controls-container";

    // --- FUERZA (izquierda) ---
    const forceGroup = document.createElement("div");
    forceGroup.className = "controls-group";
    const forceLabel = document.createElement("label");
    forceLabel.textContent = "FUERZA";
    this.forceSlider = document.createElement("input");
    this.forceSlider.type = "range";
    this.forceSlider.min = "0";
    this.forceSlider.max = "100";
    this.forceSlider.value = "50";
    this.forceSlider.className = "power-slider";
    this.forceSlider.addEventListener("input", () => {
      this.force = parseFloat(this.forceSlider.value) / 100;
      this.emit("force-update", this.force);
    });
    forceGroup.appendChild(forceLabel);
    forceGroup.appendChild(this.forceSlider);
    this.container.appendChild(forceGroup);

    // --- EFECTO (derecha) ---
    const spinGroup = document.createElement("div");
    spinGroup.className = "controls-group";
    const spinLabel = document.createElement("label");
    spinLabel.textContent = "EFECTO";
    this.spinJoystick = document.createElement("div");
    this.spinJoystick.className = "spin-joystick";
    this.spinKnob = document.createElement("div");
    this.spinKnob.className = "spin-knob";
    this.spinJoystick.appendChild(this.spinKnob);
    this.spinJoystick.addEventListener("pointerdown", this.onSpinStart);
    spinGroup.appendChild(spinLabel);
    spinGroup.appendChild(this.spinJoystick);
    this.container.appendChild(spinGroup);

    // --- AJUSTE (derecha abajo) ---
    const aimGroup = document.createElement("div");
    aimGroup.className = "controls-group";
    const aimLabel = document.createElement("label");
    aimLabel.textContent = "AJUSTE";
    const aimButtons = document.createElement("div");
    aimButtons.className = "aim-buttons";
    const leftBtn = document.createElement("button");
    leftBtn.className = "aim-btn";
    leftBtn.textContent = "◀";
    leftBtn.addEventListener("click", () => {
      this.aimAngle -= 0.02;
      this.emit("aim-adjust", this.aimAngle);
    });
    const rightBtn = document.createElement("button");
    rightBtn.className = "aim-btn";
    rightBtn.textContent = "▶";
    rightBtn.addEventListener("click", () => {
      this.aimAngle += 0.02;
      this.emit("aim-adjust", this.aimAngle);
    });
    aimButtons.appendChild(leftBtn);
    aimButtons.appendChild(rightBtn);
    aimGroup.appendChild(aimLabel);
    aimGroup.appendChild(aimButtons);
    this.container.appendChild(aimGroup);

    const game = document.getElementById("game");
    if (game) {
      game.style.position = "relative";
      game.appendChild(this.container);
    }
  };

  handleDeactivate = () => {
    this.container?.remove();
  };

  private onSpinStart = (e: PointerEvent) => {
    this.spinDragging = true;
    this.spinJoystick.setPointerCapture(e.pointerId);
    this.spinJoystick.addEventListener("pointermove", this.onSpinMove);
    this.spinJoystick.addEventListener("pointerup", this.onSpinEnd);
    this.spinJoystick.addEventListener("pointercancel", this.onSpinEnd);
    this.updateSpin(e);
  };

  private onSpinMove = (e: PointerEvent) => {
    if (!this.spinDragging) return;
    this.updateSpin(e);
  };

  private onSpinEnd = (e: PointerEvent) => {
    this.spinDragging = false;
    this.spinJoystick.removeEventListener("pointermove", this.onSpinMove);
    this.spinJoystick.removeEventListener("pointerup", this.onSpinEnd);
    this.spinJoystick.removeEventListener("pointercancel", this.onSpinEnd);
    this.spinX = 0;
    this.spinY = 0;
    this.spinKnob.style.top = "50%";
    this.spinKnob.style.left = "50%";
    this.emit("spin-update", { x: 0, y: 0 });
  };

  private updateSpin(e: PointerEvent) {
    const rect = this.spinJoystick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const maxRadius = rect.width / 2 - 10;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    this.spinKnob.style.left = (dx / rect.width * 100 + 50) + "%";
    this.spinKnob.style.top = (dy / rect.height * 100 + 50) + "%";
    this.spinX = dx / maxRadius;
    this.spinY = dy / maxRadius;
    this.emit("spin-update", { x: this.spinX, y: this.spinY });
  }
}
