import * as THREE from 'three';
import type { PhysicsWorld } from '../engine/physics';
import { pbrCrate, pbrFloor, pbrWall } from './materials';

export interface LevelModule {
  group: THREE.Group;
  spawnPoints: THREE.Vector3[];
  coverPoints: THREE.Vector3[];
}

function boxMesh(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function addStatic(
  physics: PhysicsWorld,
  mesh: THREE.Mesh,
  w: number,
  h: number,
  d: number,
): void {
  physics.addStaticBox(mesh, new THREE.Vector3(w, h, d), mesh.position.clone());
}

/** Modular corridor + courtyard kit. */
export function buildLevel(scene: THREE.Scene, physics: PhysicsWorld): LevelModule {
  const group = new THREE.Group();
  group.name = 'level';
  const floorMat = pbrFloor();
  const wallMat = pbrWall();
  const crateMat = pbrCrate();

  // Ground slabs (modular tiles)
  for (let gx = -2; gx <= 2; gx++) {
    for (let gz = -2; gz <= 2; gz++) {
      const tile = boxMesh(10, 0.4, 10, floorMat, gx * 10, -0.2, gz * 10);
      group.add(tile);
      addStatic(physics, tile, 10, 0.4, 10);
    }
  }

  // Perimeter walls
  const walls: Array<[number, number, number, number, number, number]> = [
    [50, 4, 1, 0, 2, -25],
    [50, 4, 1, 0, 2, 25],
    [1, 4, 50, -25, 2, 0],
    [1, 4, 50, 25, 2, 0],
  ];
  for (const [w, h, d, x, y, z] of walls) {
    const mesh = boxMesh(w, h, d, wallMat, x, y, z);
    group.add(mesh);
    addStatic(physics, mesh, w, h, d);
  }

  // Interior modules: corridors / rooms
  const modules: Array<[number, number, number, number, number, number]> = [
    [8, 3.5, 0.6, -10, 1.75, -8],
    [8, 3.5, 0.6, 10, 1.75, -8],
    [0.6, 3.5, 10, -6, 1.75, 2],
    [0.6, 3.5, 10, 6, 1.75, 2],
    [12, 3.5, 0.6, 0, 1.75, 12],
    [0.6, 3.5, 8, -14, 1.75, -14],
    [0.6, 3.5, 8, 14, 1.75, -14],
    [6, 2.2, 1.2, 0, 1.1, -2],
  ];
  for (const [w, h, d, x, y, z] of modules) {
    const mesh = boxMesh(w, h, d, wallMat, x, y, z);
    group.add(mesh);
    addStatic(physics, mesh, w, h, d);
  }

  // Cover crates (LOD-ready: single mesh)
  const coverPoints: THREE.Vector3[] = [];
  const crateSpots: Array<[number, number, number]> = [
    [-4, 0.6, -4],
    [4, 0.6, -4],
    [-3, 0.6, 6],
    [3, 0.6, 6],
    [-12, 0.6, 4],
    [12, 0.6, 4],
    [0, 0.6, -14],
    [-8, 0.6, 14],
    [8, 0.6, 14],
  ];
  for (const [x, y, z] of crateSpots) {
    const crate = boxMesh(1.4, 1.2, 1.4, crateMat, x, y, z);
    crate.userData.lod = 'near';
    group.add(crate);
    addStatic(physics, crate, 1.4, 1.2, 1.4);
    coverPoints.push(new THREE.Vector3(x, 0, z));
  }

  // Elevated platform module
  const plat = boxMesh(6, 0.5, 6, floorMat, -16, 1.5, -16);
  group.add(plat);
  addStatic(physics, plat, 6, 0.5, 6);
  const ramp = boxMesh(2, 0.35, 5, floorMat, -16, 0.7, -11.5);
  ramp.rotation.x = -0.35;
  group.add(ramp);
  addStatic(physics, ramp, 2, 0.35, 5);

  // Ramp approx center for nav
  coverPoints.push(new THREE.Vector3(-16, 1.5, -16));

  scene.add(group);

  const spawnPoints = [
    new THREE.Vector3(0, 1.2, 10),
    new THREE.Vector3(-18, 1.2, -8),
    new THREE.Vector3(18, 1.2, -8),
    new THREE.Vector3(-10, 1.2, 18),
    new THREE.Vector3(10, 1.2, 18),
    new THREE.Vector3(-18, 2.5, -18),
    new THREE.Vector3(16, 1.2, 0),
    new THREE.Vector3(-16, 1.2, 0),
  ];

  return { group, spawnPoints, coverPoints };
}
