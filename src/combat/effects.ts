import * as THREE from 'three';

export class CombatFx {
  private readonly decals: THREE.Mesh[] = [];
  private readonly flashes: THREE.PointLight[] = [];
  private readonly scene: THREE.Scene;
  private readonly decalMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.decalMat = new THREE.MeshBasicMaterial({
      color: 0x1a1a1a,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
  }

  muzzleFlash(pos: THREE.Vector3): void {
    const light = new THREE.PointLight(0xffcc88, 3.5, 6, 2);
    light.position.copy(pos);
    this.scene.add(light);
    this.flashes.push(light);
    window.setTimeout(() => {
      this.scene.remove(light);
      light.dispose();
      const i = this.flashes.indexOf(light);
      if (i >= 0) this.flashes.splice(i, 1);
    }, 40);
  }

  spawnDecal(point: THREE.Vector3, normal: THREE.Vector3): void {
    const geo = new THREE.CircleGeometry(0.08 + Math.random() * 0.06, 10);
    const mesh = new THREE.Mesh(geo, this.decalMat.clone());
    mesh.position.copy(point).addScaledVector(normal, 0.01);
    mesh.lookAt(point.clone().add(normal));
    this.scene.add(mesh);
    this.decals.push(mesh);
    if (this.decals.length > 64) {
      const old = this.decals.shift()!;
      this.scene.remove(old);
      old.geometry.dispose();
      (old.material as THREE.Material).dispose();
    }
  }

  hitSpark(point: THREE.Vector3): void {
    const spark = new THREE.PointLight(0xffeeaa, 2, 3);
    spark.position.copy(point);
    this.scene.add(spark);
    window.setTimeout(() => {
      this.scene.remove(spark);
      spark.dispose();
    }, 50);
  }
}
