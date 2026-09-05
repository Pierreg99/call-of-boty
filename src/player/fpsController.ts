import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export interface FpsInput {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
  fire: boolean;
  ads: boolean;
  reload: boolean;
}

const BASE_FOV = 75;
const ADS_FOV = 52;
const SPRINT_FOV = 82;
const EYE_HEIGHT = 1.55;

export class FpsController {
  readonly camera: THREE.PerspectiveCamera;
  readonly body: CANNON.Body;
  readonly yawObject = new THREE.Object3D();
  readonly pitchObject = new THREE.Object3D();

  sensitivity = 0.0022;
  private pitch = 0;
  private yaw = 0;
  private bobPhase = 0;
  private targetFov = BASE_FOV;
  private onGround = false;
  private jumpQueued = false;
  private shakeAmp = 0;
  private shakeDecay = 6;
  readonly velocityXZ = new THREE.Vector2();
  private readonly _quat = new THREE.Quaternion();
  private readonly _dir = new THREE.Vector3();

  constructor(body: CANNON.Body) {
    this.body = body;
    this.camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 0.05, 220);
    this.yawObject.add(this.pitchObject);
    this.pitchObject.add(this.camera);
  }

  getYaw(): number {
    return this.yaw;
  }

  respawn(x: number, y: number, z: number): void {
    this.body.position.set(x, y, z);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.pitch = 0;
    this.yaw = 0;
    this.shakeAmp = 0;
    this.bobPhase = 0;
    this.jumpQueued = false;
  }

  addShake(amp: number): void {
    this.shakeAmp = Math.min(0.35, this.shakeAmp + amp);
  }

  onMouseMove(dx: number, dy: number): void {
    this.yaw -= dx * this.sensitivity;
    this.pitch -= dy * this.sensitivity;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
  }

  update(dt: number, input: FpsInput, locked: boolean, grounded = false): void {
    if (!locked) return;

    this.onGround = grounded || (Math.abs(this.body.velocity.y) < 0.2 && this.body.position.y < 1.2);

    const wish = new THREE.Vector3();
    if (input.forward) wish.z -= 1;
    if (input.back) wish.z += 1;
    if (input.left) wish.x -= 1;
    if (input.right) wish.x += 1;
    if (wish.lengthSq() > 0) wish.normalize();

    const speed = input.sprint && !input.ads ? 9.5 : input.ads ? 4.2 : 6.8;
    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move = new THREE.Vector3()
      .addScaledVector(forward, -wish.z)
      .addScaledVector(right, wish.x);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed);
      this.body.velocity.x = THREE.MathUtils.lerp(this.body.velocity.x, move.x, 1 - Math.exp(-12 * dt));
      this.body.velocity.z = THREE.MathUtils.lerp(this.body.velocity.z, move.z, 1 - Math.exp(-12 * dt));
    } else {
      this.body.velocity.x *= Math.exp(-8 * dt);
      this.body.velocity.z *= Math.exp(-8 * dt);
    }

    if (input.jump && this.onGround) this.jumpQueued = true;
    if (this.jumpQueued && this.onGround) {
      this.body.velocity.y = 7.2;
      this.jumpQueued = false;
      this.onGround = false;
    }

    this.velocityXZ.set(this.body.velocity.x, this.body.velocity.z);
    const spd = this.velocityXZ.length();

    if (this.onGround && spd > 0.8) {
      this.bobPhase += dt * (input.sprint ? 14 : 10) * (spd / speed);
    } else {
      this.bobPhase *= Math.exp(-4 * dt);
    }
    const bobY = Math.sin(this.bobPhase) * 0.035 * Math.min(1, spd / 6);
    const bobX = Math.cos(this.bobPhase * 0.5) * 0.02 * Math.min(1, spd / 6);

    let fov = BASE_FOV;
    if (input.ads) fov = ADS_FOV;
    else if (input.sprint && spd > 4) fov = SPRINT_FOV;
    this.targetFov = fov;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.targetFov, 1 - Math.exp(-10 * dt));
    this.camera.updateProjectionMatrix();

    this.shakeAmp = Math.max(0, this.shakeAmp - this.shakeDecay * dt);
    const sx = (Math.random() - 0.5) * this.shakeAmp;
    const sy = (Math.random() - 0.5) * this.shakeAmp;

    this.yawObject.rotation.y = this.yaw;
    this.pitchObject.rotation.x = this.pitch;
    this.yawObject.position.set(
      this.body.position.x + bobX + sx,
      this.body.position.y + EYE_HEIGHT + bobY + sy,
      this.body.position.z,
    );
  }

  lookDirection(out = this._dir): THREE.Vector3 {
    return out.set(0, 0, -1).applyQuaternion(this.camera.getWorldQuaternion(this._quat));
  }

  eyeWorld(out = new THREE.Vector3()): THREE.Vector3 {
    return this.camera.getWorldPosition(out);
  }
}
