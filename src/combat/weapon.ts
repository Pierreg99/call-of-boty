import * as THREE from 'three';

export interface WeaponStats {
  name: string;
  magSize: number;
  reserve: number;
  rpm: number;
  damage: number;
  spreadHip: number;
  spreadAds: number;
  reloadTime: number;
}

export const BOTY_AR: WeaponStats = {
  name: 'BOTY-AR',
  magSize: 30,
  reserve: 120,
  rpm: 620,
  damage: 24,
  spreadHip: 0.028,
  spreadAds: 0.008,
  reloadTime: 1.55,
};

export class WeaponController {
  stats: WeaponStats;
  mag: number;
  reserve: number;
  private lastShot = 0;
  reloading = false;
  private reloadAt = 0;

  constructor(stats: WeaponStats = BOTY_AR) {
    this.stats = stats;
    this.mag = stats.magSize;
    this.reserve = stats.reserve;
  }

  get canFire(): boolean {
    return !this.reloading && this.mag > 0;
  }

  get empty(): boolean {
    return this.mag <= 0 && this.reserve <= 0;
  }

  tryFire(now: number, ads: boolean): { fired: boolean; spread: number } {
    const interval = 60_000 / this.stats.rpm;
    if (!this.canFire || now - this.lastShot < interval) {
      return { fired: false, spread: 0 };
    }
    this.mag -= 1;
    this.lastShot = now;
    return {
      fired: true,
      spread: ads ? this.stats.spreadAds : this.stats.spreadHip,
    };
  }

  startReload(now: number): boolean {
    if (this.reloading || this.mag >= this.stats.magSize || this.reserve <= 0) return false;
    this.reloading = true;
    this.reloadAt = now + this.stats.reloadTime * 1000;
    return true;
  }

  reset(): void {
    this.mag = this.stats.magSize;
    this.reserve = this.stats.reserve;
    this.reloading = false;
    this.reloadAt = 0;
    this.lastShot = 0;
  }

  update(now: number): void {
    if (this.reloading && now >= this.reloadAt) {
      const need = this.stats.magSize - this.mag;
      const take = Math.min(need, this.reserve);
      this.mag += take;
      this.reserve -= take;
      this.reloading = false;
    }
  }
}

export function rayFromCamera(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  spread: number,
  rng = Math.random,
): THREE.Raycaster {
  const d = dir.clone().normalize();
  if (spread > 0) {
    d.x += (rng() - 0.5) * spread * 2;
    d.y += (rng() - 0.5) * spread * 2;
    d.z += (rng() - 0.5) * spread * 2;
    d.normalize();
  }
  const ray = new THREE.Raycaster(origin.clone(), d, 0.1, 120);
  return ray;
}
