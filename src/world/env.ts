import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { GameRenderer } from '../engine/renderer';

export function setupEnvironment(
  scene: THREE.Scene,
  renderer: GameRenderer,
  shadowMapSize: number,
): {
  sun: THREE.DirectionalLight;
  lamps: THREE.PointLight[];
  pmrem: THREE.Texture;
} {
  scene.background = new THREE.Color(0x0a1018);
  scene.fog = new THREE.FogExp2(0x0a1018, 0.028);

  const hemi = new THREE.HemisphereLight(0x6aa8d8, 0x1a1510, 0.35);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xcfe6ff, 1.35);
  sun.position.set(18, 28, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);

  const lamps: THREE.PointLight[] = [];
  const lampDefs: Array<[number, number, number, number]> = [
    [-8, 3.2, -6, 0xffaa66],
    [8, 3.2, -6, 0x66aaff],
    [-8, 3.2, 8, 0x66ffaa],
    [8, 3.2, 8, 0xff6688],
    [0, 4.5, 0, 0xaaccff],
  ];
  for (const [x, y, z, color] of lampDefs) {
    const lamp = new THREE.PointLight(color, 1.4, 18, 2);
    lamp.position.set(x, y, z);
    lamp.castShadow = shadowMapSize >= 1024;
    if (lamp.castShadow) {
      lamp.shadow.mapSize.set(512, 512);
      lamp.shadow.bias = -0.001;
    }
    scene.add(lamp);
    lamps.push(lamp);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 2.5,
        roughness: 0.4,
        metalness: 0.1,
      }),
    );
    bulb.position.copy(lamp.position);
    scene.add(bulb);
  }

  const pmremGen = new THREE.PMREMGenerator(renderer.renderer);
  pmremGen.compileEquirectangularShader();
  const envScene = new RoomEnvironment();
  const pmrem = pmremGen.fromScene(envScene, 0.04).texture;
  scene.environment = pmrem;
  envScene.dispose();
  pmremGen.dispose();

  return { sun, lamps, pmrem };
}
