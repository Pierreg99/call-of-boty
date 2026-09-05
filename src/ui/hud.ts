export class Hud {
  private readonly healthFill: HTMLElement;
  private readonly healthText: HTMLElement;
  private readonly ammoMag: HTMLElement;
  private readonly ammoReserve: HTMLElement;
  private readonly weaponName: HTMLElement;
  private readonly objText: HTMLElement;
  private readonly killFeed: HTMLElement;
  private readonly crosshair: HTMLElement;
  private readonly hitmarker: HTMLElement;
  private readonly damageFlash: HTMLElement;
  private readonly dmgDirs: HTMLElement;
  private readonly winBanner: HTMLElement;
  private readonly fpsCounter: HTMLElement;
  private readonly minimap: HTMLCanvasElement;
  private readonly mmCtx: CanvasRenderingContext2D;
  private fpsFrames = 0;
  private fpsAcc = 0;

  constructor() {
    this.healthFill = el('health-fill');
    this.healthText = el('health-text');
    this.ammoMag = el('ammo-mag');
    this.ammoReserve = el('ammo-reserve');
    this.weaponName = el('weapon-name');
    this.objText = el('obj-text');
    this.killFeed = el('kill-feed');
    this.crosshair = el('crosshair');
    this.hitmarker = el('hitmarker');
    this.damageFlash = el('damage-flash');
    this.dmgDirs = el('dmg-dirs');
    this.winBanner = el('win-banner');
    this.fpsCounter = el('fps-counter');
    this.minimap = document.getElementById('minimap-canvas') as HTMLCanvasElement;
    this.mmCtx = this.minimap.getContext('2d')!;
  }

  setHealth(hp: number, max = 100): void {
    const pct = Math.max(0, Math.min(100, (hp / max) * 100));
    this.healthFill.style.width = `${pct}%`;
    this.healthFill.classList.toggle('critical', pct <= 30);
    this.healthFill.classList.toggle('warn', pct > 30 && pct <= 55);
    this.healthText.textContent = String(Math.ceil(hp));
    this.healthText.classList.toggle('critical', pct <= 30);
  }

  setAmmo(mag: number, reserve: number, name: string): void {
    this.ammoMag.textContent = String(mag);
    this.ammoReserve.textContent = String(reserve);
    this.weaponName.textContent = name;
  }

  setObjective(kills: number, goal: number): void {
    this.objText.textContent = `CLEAR SECTOR · ${kills}/${goal}`;
  }

  showHitmarker(): void {
    this.hitmarker.classList.add('show');
    window.setTimeout(() => this.hitmarker.classList.remove('show'), 80);
  }

  setCrosshair(ads: boolean, firing: boolean): void {
    this.crosshair.classList.toggle('ads', ads);
    this.crosshair.classList.toggle('fire', firing);
  }

  pushKill(name: string): void {
    const line = document.createElement('div');
    line.className = 'kill-line';
    line.textContent = `YOU  >  ${name}`;
    this.killFeed.prepend(line);
    window.setTimeout(() => line.classList.add('fade'), 2400);
    window.setTimeout(() => line.remove(), 3000);
    while (this.killFeed.children.length > 5) this.killFeed.lastChild?.remove();
  }

  damageFeedback(angleRad: number): void {
    this.damageFlash.classList.add('show');
    window.setTimeout(() => this.damageFlash.classList.remove('show'), 100);
    const wedge = document.createElement('div');
    wedge.className = 'dmg-wedge show';
    wedge.style.transform = `rotate(${angleRad}rad)`;
    this.dmgDirs.appendChild(wedge);
    window.setTimeout(() => {
      wedge.classList.remove('show');
      window.setTimeout(() => wedge.remove(), 200);
    }, 350);
  }

  showWin(): void {
    this.winBanner.hidden = false;
  }

  hideWin(): void {
    this.winBanner.hidden = true;
  }

  clearFeed(): void {
    this.killFeed.replaceChildren();
    this.dmgDirs.replaceChildren();
  }

  toggleFps(): void {
    this.fpsCounter.hidden = !this.fpsCounter.hidden;
  }

  tickFps(dt: number): void {
    if (this.fpsCounter.hidden) return;
    this.fpsFrames += 1;
    this.fpsAcc += dt;
    if (this.fpsAcc >= 0.5) {
      const fps = Math.round(this.fpsFrames / this.fpsAcc);
      this.fpsCounter.textContent = `FPS ${fps}`;
      this.fpsFrames = 0;
      this.fpsAcc = 0;
    }
  }

  drawMinimap(
    playerX: number,
    playerZ: number,
    yaw: number,
    enemies: Array<{ x: number; z: number }>,
    extent = 28,
  ): void {
    const ctx = this.mmCtx;
    const w = this.minimap.width;
    const h = this.minimap.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a121c';
    ctx.fillRect(0, 0, w, h);

    // grid
    ctx.strokeStyle = 'rgba(70,130,180,0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const p = (i / 7) * w;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(w, p);
      ctx.stroke();
    }

    const sx = (x: number) => ((x - playerX) / extent) * (w * 0.5) + w * 0.5;
    const sy = (z: number) => ((z - playerZ) / extent) * (h * 0.5) + h * 0.5;

    for (const e of enemies) {
      ctx.fillStyle = '#ff4455';
      ctx.beginPath();
      ctx.arc(sx(e.x), sy(e.z), 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // player
    ctx.save();
    ctx.translate(w * 0.5, h * 0.5);
    ctx.rotate(-yaw);
    ctx.fillStyle = '#4db0ff';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function el(id: string): HTMLElement {
  const n = document.getElementById(id);
  if (!n) throw new Error(`Missing #${id}`);
  return n;
}
