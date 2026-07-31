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
  private aimLeftBtn: HTMLButtonElement;
  private aimRightBtn: HTMLButtonElement;
  private spinDragging: boolean = false;

  constructor() {
    super();
    this.on("activate", this.handleActivate);
    this.on("deactivate", this.handleDeactivate);
  }

  handleActivate = () => {
    this.container = document.createElement("div");
    Object.assign(this.container.style, {
      position: "absolute",
      top: "20px",
      left: "20px",
      right: "20px",
      bottom: "20px",
      pointerEvents: "none",
      zIndex: "1000",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
    });

    // --- BARRA DE FUERZA (izquierda) ---
    const forceWrapper = document.createElement("div");
    Object.assign(forceWrapper.style, {
      pointerEvents: "auto",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "5px",
      background: "rgba(0,0,0,0.6)",
      padding: "10px 5px",
      borderRadius: "12px",
      backdropFilter: "blur(4px)",
    });
    const forceLabel = document.createElement("span");
    forceLabel.textContent = "FUERZA";
    Object.assign(forceLabel.style, { color: "#fff", fontSize: "10px", fontWeight: "bold", letterSpacing: "1px" });
    this.forceSlider = document.createElement("input");
    this.forceSlider.type = "range";
    this.forceSlider.min = "0";
    this.forceSlider.max = "100";
    this.forceSlider.value = "50";
    Object.assign(this.forceSlider.style, {
      width: "150px",
      height: "8px",
      writingMode: "bt-lr",
      WebkitAppearance: "slider-vertical",
      appearance: "slider-vertical",
      background: "linear-gradient(to top, #4ecdc4, #f7971e, #e94560)",
      borderRadius: "4px",
      outline: "none",
      cursor: "pointer",
    });
    this.forceSlider.addEventListener("input", () => {
      this.force = parseFloat(this.forceSlider.value) / 100;
      this.emit("force-update", this.force);
    });
    forceWrapper.appendChild(forceLabel);
    forceWrapper.appendChild(this.forceSlider);
    this.container.appendChild(forceWrapper);

    // --- JOYSTICK DE EFECTO (derecha) ---
    const spinWrapper = document.createElement("div");
    Object.assign(spinWrapper.style, {
      pointerEvents: "auto",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "5px",
      background: "rgba(0,0,0,0.6)",
      padding: "10px",
      borderRadius: "12px",
      backdropFilter: "blur(4px)",
    });
    const spinLabel = document.createElement("span");
    spinLabel.textContent = "EFECTO";
    Object.assign(spinLabel.style, { color: "#fff", fontSize: "10px", fontWeight: "bold", letterSpacing: "1px" });
    this.spinJoystick = document.createElement("div");
    Object.assign(this.spinJoystick.style, {
      width: "70px",
      height: "70px",
      borderRadius: "50%",
      background: "#2a2a3a",
      border: "2px solid #555",
      position: "relative",
      cursor: "grab",
      touchAction: "none",
    });
    this.spinKnob = document.createElement("div");
    Object.assign(this.spinKnob.style, {
      width: "16px",
      height: "16px",
      borderRadius: "50%",
      background: "#ffd700",
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      pointerEvents: "none",
      boxShadow: "0 0 10px #ffd700",
    });
    this.spinJoystick.appendChild(this.spinKnob);
    this.spinJoystick.addEventListener("pointerdown", this.onSpinStart);
    spinWrapper.appendChild(spinLabel);
    spinWrapper.appendChild(this.spinJoystick);
    this.container.appendChild(spinWrapper);

    // --- AJUSTE FINO (derecha abajo) ---
    const aimWrapper = document.createElement("div");
    Object.assign(aimWrapper.style, {
      pointerEvents: "auto",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "5px",
      background: "rgba(0,0,0,0.6)",
      padding: "8px 12px",
      borderRadius: "12px",
      backdropFilter: "blur(4px)",
      marginBottom: "10px",
    });
    const aimLabel = document.createElement("span");
    aimLabel.textContent = "AJUSTE";
    Object.assign(aimLabel.style, { color: "#fff", fontSize: "10px", fontWeight: "bold", letterSpacing: "1px" });
    const aimButtons = document.createElement("div");
    Object.assign(aimButtons.style, { display: "flex", gap: "8px" });
    this.aimLeftBtn = document.createElement("button");
    this.aimLeftBtn.textContent = "◀";
    Object.assign(this.aimLeftBtn.style, {
      background: "#333",
      color: "#fff",
      border: "none",
      padding: "6px 12px",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "16px",
    });
    this.aimLeftBtn.addEventListener("click", () => {
      this.aimAngle -= 0.02;
      this.emit("aim-adjust", this.aimAngle);
    });
    this.aimRightBtn = document.createElement("button");
    this.aimRightBtn.textContent = "▶";
    Object.assign(this.aimRightBtn.style, {
      background: "#333",
      color: "#fff",
      border: "none",
      padding: "6px 12px",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "16px",
    });
    this.aimRightBtn.addEventListener("click", () => {
      this.aimAngle += 0.02;
      this.emit("aim-adjust", this.aimAngle);
    });
    aimButtons.appendChild(this.aimLeftBtn);
    aimButtons.appendChild(this.aimRightBtn);
    aimWrapper.appendChild(aimLabel);
    aimWrapper.appendChild(aimButtons);
    this.container.appendChild(aimWrapper);

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
