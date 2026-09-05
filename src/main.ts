import * as THREE from 'three';
import { PhysicsWorld } from './engine/physics';
import { GameRenderer } from './engine/renderer';
import { detectQuality, settingsFor } from './engine/quality';
import { FpsController, type FpsInput } from './player/fpsController';
import { ViewModel } from './player/viewmodel';
import { setupEnvironment } from './world/env';
import { buildLevel } from './world/level';
import { WeaponController, rayFromCamera } from './combat/weapon';
import { CombatFx } from './combat/effects';
import { BotSystem } from './enemies/bot';
import { GameAudio, vibrate } from './audio/audio';
import { Hud } from './ui/hud';

const GOAL_KILLS = 8;
const SPAWN = new THREE.Vector3(0, 2, 16);

const canvas = document.getElementById('game') as HTMLCanvasElement;
const overlay = document.getElementById('overlay')!;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;

const quality = settingsFor(detectQuality());
const scene = new THREE.Scene();
const physics = new PhysicsWorld();
const level = buildLevel(scene, physics);
const playerBody = physics.addPlayerBody(0.35, 1.6, SPAWN);
const player = new FpsController(playerBody);
scene.add(player.yawObject);

const renderer = new GameRenderer(canvas, scene, player.camera, quality);
setupEnvironment(scene, renderer, quality.shadowMapSize);

const viewmodel = new ViewModel(player.pitchObject);
const weapon = new WeaponController();
const fx = new CombatFx(scene);
const bots = new BotSystem(level.coverPoints);
bots.spawnWave(scene, level.spawnPoints, GOAL_KILLS);

const audio = new GameAudio();
const hud = new Hud();
hud.setHealth(100);
hud.setAmmo(weapon.mag, weapon.reserve, weapon.stats.name);
hud.setObjective(0, GOAL_KILLS);

const overlayTag = overlay.querySelector('.tag') as HTMLElement | null;
const DEFAULT_TAG = 'PROCEDURAL PHYSICS FPS · SYSTEMS 1–5';

const input: FpsInput = {
  forward: false,
  back: false,
  left: false,
  right: false,
  sprint: false,
  jump: false,
  fire: false,
  ads: false,
  reload: false,
};

let locked = false;
let playerHp = 100;
let won = false;
let lookDelta = new THREE.Vector2();
let firePulse = 0;
const clock = new THREE.Clock();
const levelColliders: THREE.Object3D[] = [];
level.group.traverse((o) => {
  if ((o as THREE.Mesh).isMesh) levelColliders.push(o);
});

function redeploy(): void {
  playerHp = 100;
  won = false;
  player.respawn(SPAWN.x, SPAWN.y, SPAWN.z);
  weapon.reset();
  bots.reset(scene, level.spawnPoints, GOAL_KILLS);
  hud.setHealth(100);
  hud.setAmmo(weapon.mag, weapon.reserve, weapon.stats.name);
  hud.setObjective(0, GOAL_KILLS);
  hud.hideWin();
  hud.clearFeed();
  if (overlayTag) overlayTag.textContent = DEFAULT_TAG;
  startBtn.textContent = 'DEPLOY';
}

function setLocked(v: boolean): void {
  locked = v;
  overlay.classList.toggle('visible', !v);
  if (v) {
    audio.ensure();
    audio.ambienceStart();
  }
}

function requestDeploy(): void {
  if (playerHp <= 0 || won) redeploy();
  canvas.requestPointerLock();
}

startBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  requestDeploy();
});

overlay.addEventListener('click', () => {
  requestDeploy();
});

document.addEventListener('pointerlockchange', () => {
  setLocked(document.pointerLockElement === canvas);
});

document.addEventListener('mousemove', (e) => {
  if (!locked) return;
  lookDelta.set(e.movementX, e.movementY);
  player.onMouseMove(e.movementX, e.movementY);
});

const keyMap: Record<string, keyof FpsInput> = {
  KeyW: 'forward',
  KeyS: 'back',
  KeyA: 'left',
  KeyD: 'right',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
  Space: 'jump',
  KeyR: 'reload',
};

window.addEventListener('keydown', (e) => {
  const k = keyMap[e.code];
  if (k) input[k] = true;
  if (e.code === 'F3') hud.toggleFps();
  if (e.code === 'Escape' && locked) document.exitPointerLock();
});

window.addEventListener('keyup', (e) => {
  const k = keyMap[e.code];
  if (k) input[k] = false;
});

window.addEventListener('mousedown', (e) => {
  if (!locked) return;
  if (e.button === 0) input.fire = true;
  if (e.button === 2) input.ads = true;
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0) input.fire = false;
  if (e.button === 2) input.ads = false;
});

window.addEventListener('contextmenu', (e) => e.preventDefault());

function damagePlayer(amount: number, from: THREE.Vector3): void {
  if (won || playerHp <= 0) return;
  playerHp = Math.max(0, playerHp - amount);
  hud.setHealth(playerHp);
  player.addShake(0.08);
  vibrate(40, 0.5, 0.8);
  audio.hit();

  const eye = player.eyeWorld();
  const to = from.clone().sub(eye);
  const yaw = player.getYaw();
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const flat = to.setY(0).normalize();
  const angle = Math.atan2(flat.dot(right), flat.dot(forward));
  hud.damageFeedback(angle);

  if (playerHp <= 0) {
    document.exitPointerLock();
    overlay.classList.add('visible');
    if (overlayTag) overlayTag.textContent = 'SYSTEM FAILURE — REDEPLOY';
    startBtn.textContent = 'REDEPLOY';
    audio.sting(false);
  }
}

function tryShoot(now: number): void {
  if (input.reload) {
    if (weapon.startReload(now)) {
      audio.reload();
    }
    input.reload = false;
  }
  weapon.update(now);

  if (!input.fire || !locked || won) return;
  const result = weapon.tryFire(now, input.ads);
  if (!result.fired) {
    if (weapon.mag <= 0 && weapon.reserve > 0) {
      if (weapon.startReload(now)) audio.reload();
    }
    else if (weapon.mag <= 0) audio.empty();
    return;
  }

  hud.setAmmo(weapon.mag, weapon.reserve, weapon.stats.name);
  viewmodel.applyRecoil(input.ads ? 0.028 : 0.045);
  player.addShake(input.ads ? 0.015 : 0.03);
  firePulse = 1;
  vibrate(18, 0.25, 0.45);

  const muzzle = viewmodel.muzzleWorld();
  fx.muzzleFlash(muzzle);
  audio.shot(muzzle.x, muzzle.y, muzzle.z, 1);

  const origin = player.eyeWorld();
  const dir = player.lookDirection();
  const ray = rayFromCamera(origin, dir, result.spread);

  const targets: THREE.Object3D[] = [...levelColliders];
  const botMap = bots.hitTest(targets);
  const hits = ray.intersectObjects(targets, true);

  if (hits.length > 0) {
    const hit = hits[0];
    let botId: number | undefined;
    let obj: THREE.Object3D | null = hit.object;
    while (obj) {
      if (typeof obj.userData.botId === 'number') {
        botId = obj.userData.botId;
        break;
      }
      obj = obj.parent;
    }
    if (botId !== undefined) {
      const bot = botMap.get(botId);
      if (bot) {
        const killed = bots.applyDamage(bot, weapon.stats.damage, origin);
        hud.showHitmarker();
        audio.hit();
        fx.hitSpark(hit.point);
        if (killed) {
          hud.pushKill(`BOT-${bot.id}`);
          hud.setObjective(bots.kills, GOAL_KILLS);
          audio.kill();
          vibrate(50, 0.4, 0.9);
          if (bots.kills >= GOAL_KILLS && !won) {
            won = true;
            hud.showWin();
            audio.sting(true);
            startBtn.textContent = 'REDEPLOY';
            if (overlayTag) overlayTag.textContent = 'SECTOR CLEARED — REDEPLOY';
            document.exitPointerLock();
            overlay.classList.add('visible');
          }
        }
      }
    } else {
      fx.spawnDecal(hit.point, hit.face?.normal.clone().transformDirection(hit.object.matrixWorld).normalize() ?? new THREE.Vector3(0, 1, 0));
      fx.hitSpark(hit.point);
    }
  }
}

function frustumCull(camera: THREE.Camera): void {
  const frustum = new THREE.Frustum();
  const m = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  frustum.setFromProjectionMatrix(m);
  for (const bot of bots.living()) {
    bot.mesh.frustumCulled = true;
    const inView = frustum.containsPoint(bot.mesh.position);
    // keep slightly visible when close even if edge-culled via sphere — mesh default handles it
    void inView;
  }
  level.group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.frustumCulled = true;
  });
}

function frame(): void {
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();

  physics.step(dt);
  const grounded = physics.isGrounded(playerBody);
  player.update(dt, input, locked && playerHp > 0 && !won, grounded);

  const moving = player.velocityXZ.length();
  viewmodel.update(dt, lookDelta, input.ads, Math.min(1, moving / 6));
  lookDelta.set(0, 0);
  firePulse = Math.max(0, firePulse - dt * 6);
  hud.setCrosshair(input.ads, firePulse > 0.2);

  tryShoot(now);

  const eye = player.eyeWorld();
  const look = player.lookDirection();
  audio.setListener(eye.x, eye.y, eye.z, look.x, look.y, look.z);
  audio.updateSteps(dt, locked && moving > 1.2 && !input.jump, input.sprint, eye.x, 0, eye.z);

  bots.update(dt, eye, levelColliders, (origin, dir, dmg) => {
    audio.shot(origin.x, origin.y, origin.z, 0.85);
    const toEye = eye.clone().sub(origin);
    const dist = toEye.length();
    if (dist > 35) return;
    const tAlong = Math.max(0, dir.dot(toEye));
    const closest = origin.clone().addScaledVector(dir, tAlong);
    if (closest.distanceTo(eye) < 0.62) {
      damagePlayer(dmg, origin);
    }
  });

  frustumCull(player.camera);

  hud.drawMinimap(
    playerBody.position.x,
    playerBody.position.z,
    player.getYaw(),
    bots.living().map((b) => ({ x: b.mesh.position.x, z: b.mesh.position.z })),
  );
  hud.tickFps(dt);
  hud.setAmmo(weapon.mag, weapon.reserve, weapon.reloading ? 'RELOAD…' : weapon.stats.name);

  renderer.render(scene, player.camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Streaming stub note for future asset pipelines
export const STREAMING_STUB = {
  enabled: false,
  note: 'Chunk streaming reserved for future sector modules; current map is monolithic modular kit.',
};
