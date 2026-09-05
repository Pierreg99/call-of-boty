import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export class PhysicsWorld {
  readonly world: CANNON.World;
  private readonly meshes = new Map<CANNON.Body, THREE.Object3D>();

  constructor() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -18, 0) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    (this.world.solver as CANNON.GSSolver).iterations = 10;
    this.world.defaultContactMaterial.friction = 0.35;
    this.world.defaultContactMaterial.restitution = 0.02;
  }

  addStaticBox(
    mesh: THREE.Object3D,
    size: THREE.Vector3,
    center: THREE.Vector3,
  ): CANNON.Body {
    const half = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
    const body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(half),
      position: new CANNON.Vec3(center.x, center.y, center.z),
    });
    this.world.addBody(body);
    this.meshes.set(body, mesh);
    return body;
  }

  addPlayerBody(radius: number, height: number, pos: THREE.Vector3): CANNON.Body {
    const body = new CANNON.Body({
      mass: 80,
      fixedRotation: true,
      position: new CANNON.Vec3(pos.x, pos.y, pos.z),
      linearDamping: 0.12,
    });
    // cannon-es Cylinder is Z-aligned; rotate to stand on Y
    const shape = new CANNON.Cylinder(radius, radius, height, 12);
    const q = new CANNON.Quaternion();
    q.setFromEuler(Math.PI / 2, 0, 0);
    body.addShape(shape, new CANNON.Vec3(0, 0, 0), q);
    body.collisionFilterGroup = 1;
    body.collisionFilterMask = 1;
    this.world.addBody(body);
    return body;
  }

  step(dt: number): void {
    const clamped = Math.min(dt, 1 / 30);
    this.world.step(1 / 60, clamped, 3);
  }

  /** True when the body has a contact with upward normal (standing on something). */
  isGrounded(body: CANNON.Body, upDot = 0.5): boolean {
    for (const contact of this.world.contacts) {
      let other: CANNON.Body | null = null;
      let normalY = 0;
      if (contact.bi === body) {
        other = contact.bj;
        normalY = -contact.ni.y;
      } else if (contact.bj === body) {
        other = contact.bi;
        normalY = contact.ni.y;
      }
      if (other && other.mass === 0 && normalY > upDot) return true;
    }
    return false;
  }

  sync(): void {
    for (const [body, mesh] of this.meshes) {
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.quaternion.set(
        body.quaternion.x,
        body.quaternion.y,
        body.quaternion.z,
        body.quaternion.w,
      );
    }
  }
}
