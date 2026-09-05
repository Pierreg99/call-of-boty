/** Procedural Web Audio — no external samples. */

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private stepTimer = 0;
  private ambienceStarted = false;
  private lastEmpty = 0;

  ensure(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  setListener(x: number, y: number, z: number, fx = 0, fy = 0, fz = -1): void {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    if (l.positionX) {
      l.positionX.value = x;
      l.positionY.value = y;
      l.positionZ.value = z;
      l.forwardX.value = fx;
      l.forwardY.value = fy;
      l.forwardZ.value = fz;
      l.upX.value = 0;
      l.upY.value = 1;
      l.upZ.value = 0;
    } else {
      l.setPosition(x, y, z);
      l.setOrientation(fx, fy, fz, 0, 1, 0);
    }
  }

  private pannerAt(x: number, y: number, z: number): PannerNode {
    const ctx = this.ensure();
    const p = ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = 2;
    p.maxDistance = 40;
    p.rolloffFactor = 1.2;
    if (p.positionX) {
      p.positionX.value = x;
      p.positionY.value = y;
      p.positionZ.value = z;
    } else {
      p.setPosition(x, y, z);
    }
    p.connect(this.master!);
    return p;
  }

  shot(x: number, y: number, z: number, pitch = 1): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const ng = ctx.createGain();
    const panner = this.pannerAt(x, y, z);

    osc.type = 'square';
    osc.frequency.setValueAtTime(140 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(40 * pitch, t + 0.08);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    ng.gain.setValueAtTime(0.35, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain).connect(panner);
    noise.connect(ng).connect(panner);
    osc.start(t);
    noise.start(t);
    osc.stop(t + 0.12);
    noise.stop(t + 0.09);
  }

  step(x: number, y: number, z: number, sprint: boolean): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = this.pannerAt(x, y, z);
    osc.type = 'triangle';
    osc.frequency.value = sprint ? 90 : 70;
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain).connect(panner);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  hit(): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.1);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  reload(): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.12);
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(gain).connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  empty(): void {
    const now = performance.now();
    if (now - this.lastEmpty < 180) return;
    this.lastEmpty = now;
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 90;
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain).connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  kill(): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.18);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(gain).connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.24);
  }

  sting(win: boolean): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const freqs = win ? [392, 523, 659] : [220, 165, 110];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = win ? 'triangle' : 'sawtooth';
      const at = t + i * 0.09;
      osc.frequency.setValueAtTime(f, at);
      gain.gain.setValueAtTime(0.14, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.28);
      osc.connect(gain).connect(this.master!);
      osc.start(at);
      osc.stop(at + 0.3);
    });
  }

  ambienceStart(): void {
    if (this.ambienceStarted) return;
    this.ambienceStarted = true;
    const ctx = this.ensure();
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.02;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    const gain = ctx.createGain();
    gain.gain.value = 0.4;
    src.connect(filter).connect(gain).connect(this.master!);
    src.start();
  }

  updateSteps(dt: number, moving: boolean, sprint: boolean, x: number, y: number, z: number): void {
    if (!moving) {
      this.stepTimer = 0;
      return;
    }
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.step(x, y, z, sprint);
      this.stepTimer = sprint ? 0.28 : 0.42;
    }
  }
}

export function vibrate(ms: number, weak = 0.4, strong = 0.7): void {
  const pads = navigator.getGamepads?.() ?? [];
  for (const pad of pads) {
    if (pad?.vibrationActuator) {
      void pad.vibrationActuator.playEffect('dual-rumble', {
        duration: ms,
        startDelay: 0,
        strongMagnitude: strong,
        weakMagnitude: weak,
      });
      return;
    }
  }
  if (navigator.vibrate) navigator.vibrate(ms);
}
