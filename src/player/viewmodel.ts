import * as THREE from 'three';
import { makeMetalTexture, makeEmissiveStripe } from '../world/materials';

export class ViewModel {
  readonly root = new THREE.Group();
  private readonly weapon: THREE.Group;
  private recoil = 0;
  private sway = new THREE.Vector2();
  private adsBlend = 0;
  private kick = 0;

  constructor(parent: THREE.Object3D) {
    this.weapon = this.buildRifle();
    this.root.add(this.weapon);
    parent.add(this.root);
    this.setHipPose(1);
  }

  private buildRifle(): THREE.Group {
    const g = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({
      color: 0x2a323c,
      metalness: 0.85,
      roughness: 0.35,
      map: makeMetalTexture(),
    });
    const accent = new THREE.MeshStandardMaterial({
      color: 0x1a8fd4,
      metalness: 0.6,
      roughness: 0.25,
      emissive: 0x0a4060,
      emissiveMap: makeEmissiveStripe(),
      emissiveIntensity: 0.8,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.55), metal);
    body.position.set(0, -0.02, -0.15);
    body.castShadow = true;
    g.add(body);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.38, 10), metal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, -0.48);
    g.add(barrel);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.22), metal);
    stock.position.set(0, -0.03, 0.22);
    g.add(stock);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.08), accent);
    mag.position.set(0, -0.12, -0.05);
    g.add(mag);

    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.1), accent);
    sight.position.set(0, 0.06, -0.1);
    g.add(sight);

    return g;
  }

  private setHipPose(t: number): void {
    const hip = new THREE.Vector3(0.28, -0.22, -0.42);
    const ads = new THREE.Vector3(0.0, -0.14, -0.28);
    this.root.position.lerpVectors(hip, ads, t);
  }

  applyRecoil(kick = 0.045): void {
    this.recoil = Math.min(0.18, this.recoil + kick);
    this.kick = 1;
  }

  update(dt: number, lookDelta: THREE.Vector2, ads: boolean, moving: number): void {
    this.adsBlend = THREE.MathUtils.lerp(this.adsBlend, ads ? 1 : 0, 1 - Math.exp(-12 * dt));
    this.setHipPose(this.adsBlend);

    this.sway.x = THREE.MathUtils.lerp(this.sway.x, -lookDelta.x * 0.015, 1 - Math.exp(-8 * dt));
    this.sway.y = THREE.MathUtils.lerp(this.sway.y, -lookDelta.y * 0.012, 1 - Math.exp(-8 * dt));

    this.recoil = Math.max(0, this.recoil - dt * 1.8);
    this.kick = Math.max(0, this.kick - dt * 8);

    const bob = Math.sin(performance.now() * 0.008) * 0.008 * moving;

    this.weapon.rotation.set(
      this.sway.y + this.recoil * 0.6,
      this.sway.x,
      -this.sway.x * 0.4,
    );
    this.weapon.position.z = this.recoil * 0.35 + this.kick * 0.02;
    this.weapon.position.y = bob - this.recoil * 0.1;
  }

  muzzleWorld(out = new THREE.Vector3()): THREE.Vector3 {
    return this.weapon.localToWorld(out.set(0, 0.01, -0.7));
  }
}
