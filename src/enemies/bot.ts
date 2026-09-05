import * as THREE from 'three';

export type BotState = 'Idle' | 'Alert' | 'Attack' | 'Search';

export interface Bot {
  id: number;
  mesh: THREE.Group;
  bodyMesh: THREE.Mesh;
  state: BotState;
  health: number;
  maxHealth: number;
  alertTimer: number;
  searchTimer: number;
  attackCooldown: number;
  lastKnown: THREE.Vector3;
  navTarget: THREE.Vector3;
  alive: boolean;
  lodLevel: 0 | 1 | 2;
}

let nextId = 1;

function makeBotMesh(accent: number): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x2a3038,
    metalness: 0.55,
    roughness: 0.4,
    emissive: accent,
    emissiveIntensity: 0.25,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x1a1e24,
    metalness: 0.7,
    roughness: 0.3,
    emissive: accent,
    emissiveIntensity: 0.6,
  });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.7, 4, 8), bodyMat);
  torso.position.y = 1.0;
  torso.castShadow = true;
  g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), headMat);
  head.position.y = 1.7;
  head.castShadow = true;
  g.add(head);

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.08, 0.08),
    new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 1.5,
      metalness: 0.2,
      roughness: 0.3,
    }),
  );
  visor.position.set(0, 1.72, 0.18);
  g.add(visor);

  g.userData.body = torso;
  return g;
}

export function spawnBot(
  scene: THREE.Scene,
  pos: THREE.Vector3,
  accent = 0xff3344,
): Bot {
  const mesh = makeBotMesh(accent);
  mesh.position.copy(pos);
  scene.add(mesh);
  const bodyMesh = mesh.userData.body as THREE.Mesh;
  bodyMesh.userData.botId = nextId;
  return {
    id: nextId++,
    mesh,
    bodyMesh,
    state: 'Idle',
    health: 100,
    maxHealth: 100,
    alertTimer: 0,
    searchTimer: 0,
    attackCooldown: 0,
    lastKnown: pos.clone(),
    navTarget: pos.clone(),
    alive: true,
    lodLevel: 0,
  };
}

const TMP = new THREE.Vector3();
const TMP2 = new THREE.Vector3();

export class BotSystem {
  bots: Bot[] = [];
  private readonly cover: THREE.Vector3[];
  private readonly raycaster = new THREE.Raycaster();
  kills = 0;

  constructor(coverPoints: THREE.Vector3[]) {
    this.cover = coverPoints;
  }

  spawnWave(scene: THREE.Scene, points: THREE.Vector3[], count: number): void {
    const shuffled = [...points].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count && i < shuffled.length; i++) {
      const p = shuffled[i].clone();
      p.y = 0;
      this.bots.push(spawnBot(scene, p));
    }
  }

  living(): Bot[] {
    return this.bots.filter((b) => b.alive);
  }

  hitTest(objects: THREE.Object3D[]): Map<number, Bot> {
    const map = new Map<number, Bot>();
    for (const b of this.living()) {
      map.set(b.id, b);
      b.bodyMesh.userData.botId = b.id;
      objects.push(b.mesh);
    }
    return map;
  }

  applyDamage(bot: Bot, dmg: number, from: THREE.Vector3): boolean {
    if (!bot.alive) return false;
    bot.health -= dmg;
    bot.state = 'Alert';
    bot.lastKnown.copy(from);
    bot.alertTimer = 4;
    if (bot.health <= 0) {
      bot.alive = false;
      bot.mesh.visible = false;
      this.kills += 1;
      return true;
    }
    // Hit flash
    const mats = bot.mesh.children
      .map((c) => (c as THREE.Mesh).material)
      .filter(Boolean) as THREE.MeshStandardMaterial[];
    for (const m of mats) {
      if ('emissive' in m) {
        const prev = m.emissiveIntensity;
        m.emissiveIntensity = 2.5;
        window.setTimeout(() => {
          m.emissiveIntensity = prev;
        }, 60);
      }
    }
    return false;
  }

  update(
    dt: number,
    playerPos: THREE.Vector3,
    levelMeshes: THREE.Object3D[],
    onBotShot: (origin: THREE.Vector3, dir: THREE.Vector3, damage: number) => void,
  ): void {
    for (const bot of this.living()) {
      const toPlayer = TMP.copy(playerPos).sub(bot.mesh.position);
      const dist = toPlayer.length();
      const dir = TMP2.copy(toPlayer).normalize();

      // LOS check
      this.raycaster.set(bot.mesh.position.clone().setY(1.4), dir);
      this.raycaster.far = dist;
      const hits = this.raycaster.intersectObjects(levelMeshes, false);
      const canSee = hits.length === 0 || hits[0].distance > dist - 0.5;

      bot.attackCooldown = Math.max(0, bot.attackCooldown - dt);

      switch (bot.state) {
        case 'Idle':
          if (canSee && dist < 22) {
            bot.state = 'Alert';
            bot.alertTimer = 2;
            bot.lastKnown.copy(playerPos);
          } else {
            // idle wander toward cover
            this.steer(bot, bot.navTarget, dt, 1.6);
            if (bot.mesh.position.distanceTo(bot.navTarget) < 0.6) {
              bot.navTarget.copy(this.randomCover());
            }
          }
          break;
        case 'Alert':
          bot.alertTimer -= dt;
          bot.lastKnown.copy(playerPos);
          if (canSee && dist < 18) bot.state = 'Attack';
          else if (bot.alertTimer <= 0) {
            bot.state = 'Search';
            bot.searchTimer = 5;
            bot.navTarget.copy(bot.lastKnown);
          } else {
            this.steer(bot, playerPos, dt, 3.2);
          }
          break;
        case 'Attack':
          if (!canSee || dist > 24) {
            bot.state = 'Search';
            bot.searchTimer = 4;
            bot.navTarget.copy(bot.lastKnown);
            break;
          }
          bot.lastKnown.copy(playerPos);
          // strafe / close distance
          if (dist > 10) this.steer(bot, playerPos, dt, 3.8);
          else if (dist < 5) this.steer(bot, playerPos, dt, -2.2);
          else this.strafe(bot, playerPos, dt);
          bot.mesh.lookAt(playerPos.x, bot.mesh.position.y, playerPos.z);
          if (bot.attackCooldown <= 0 && canSee) {
            bot.attackCooldown = 0.55 + Math.random() * 0.35;
            const origin = bot.mesh.position.clone().setY(1.5);
            const shotDir = playerPos.clone().setY(1.4).sub(origin).normalize();
            // slight inaccuracy
            shotDir.x += (Math.random() - 0.5) * 0.04;
            shotDir.y += (Math.random() - 0.5) * 0.03;
            shotDir.normalize();
            onBotShot(origin, shotDir, 8 + Math.floor(Math.random() * 6));
          }
          break;
        case 'Search':
          bot.searchTimer -= dt;
          this.steer(bot, bot.navTarget, dt, 2.8);
          if (canSee && dist < 20) {
            bot.state = 'Attack';
          } else if (bot.searchTimer <= 0) {
            bot.state = 'Idle';
            bot.navTarget.copy(this.randomCover());
          } else if (bot.mesh.position.distanceTo(bot.navTarget) < 0.8) {
            bot.navTarget.copy(this.randomCover());
          }
          break;
      }

      // Simple LOD by distance
      if (dist > 40) bot.lodLevel = 2;
      else if (dist > 22) bot.lodLevel = 1;
      else bot.lodLevel = 0;
      for (const child of bot.mesh.children) {
        if (child !== bot.bodyMesh) child.visible = bot.lodLevel < 2;
      }
    }
  }

  private randomCover(): THREE.Vector3 {
    return this.cover[Math.floor(Math.random() * this.cover.length)].clone();
  }

  private steer(bot: Bot, target: THREE.Vector3, dt: number, speed: number): void {
    const d = TMP.copy(target).sub(bot.mesh.position);
    d.y = 0;
    if (d.lengthSq() < 0.01) return;
    d.normalize().multiplyScalar(speed * dt);
    bot.mesh.position.add(d);
    bot.mesh.position.y = 0;
    if (speed > 0) bot.mesh.lookAt(target.x, 0, target.z);
  }

  private strafe(bot: Bot, player: THREE.Vector3, dt: number): void {
    const to = TMP.copy(player).sub(bot.mesh.position);
    to.y = 0;
    to.normalize();
    const side = TMP2.set(-to.z, 0, to.x).multiplyScalar((Math.random() > 0.5 ? 1 : -1) * 2.2 * dt);
    bot.mesh.position.add(side);
  }
}
