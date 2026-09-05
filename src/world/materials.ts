import * as THREE from 'three';

function canvasTex(
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  size = 256,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export function makeMetalTexture(): THREE.CanvasTexture {
  return canvasTex((ctx, size) => {
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, '#3a4450');
    g.addColorStop(0.5, '#1e262e');
    g.addColorStop(1, '#4a5562');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }
  }, 128);
}

export function makeEmissiveStripe(): THREE.CanvasTexture {
  return canvasTex((ctx, size) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#4db0ff';
    ctx.fillRect(0, size * 0.4, size, size * 0.2);
  }, 64);
}

export function makeFloorTexture(): THREE.CanvasTexture {
  return canvasTex((ctx, size) => {
    ctx.fillStyle = '#1a222c';
    ctx.fillRect(0, 0, size, size);
    const cell = 32;
    for (let y = 0; y < size; y += cell) {
      for (let x = 0; x < size; x += cell) {
        const shade = 24 + ((x / cell + y / cell) % 2) * 10;
        ctx.fillStyle = `rgb(${shade},${shade + 4},${shade + 10})`;
        ctx.fillRect(x, y, cell - 1, cell - 1);
        ctx.strokeStyle = 'rgba(70,120,160,0.25)';
        ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
      }
    }
  }, 512);
}

export function makeWallTexture(): THREE.CanvasTexture {
  return canvasTex((ctx, size) => {
    ctx.fillStyle = '#2a3340';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 28) {
      for (let x = 0; x < size; x += 56) {
        const ox = (Math.floor(y / 28) % 2) * 28;
        ctx.fillStyle = `rgb(${40 + (x % 7)},${48 + (y % 5)},${58})`;
        ctx.fillRect(x + ox, y, 54, 26);
        ctx.strokeStyle = 'rgba(20,24,30,0.8)';
        ctx.strokeRect(x + ox, y, 54, 26);
      }
    }
  }, 512);
}

export function makeRustPanel(): THREE.CanvasTexture {
  return canvasTex((ctx, size) => {
    ctx.fillStyle = '#3a2e28';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `rgba(${80 + Math.random() * 60},${40 + Math.random() * 30},20,0.4)`;
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, 4 + Math.random() * 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(100,180,220,0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, size - 24, size - 24);
  }, 256);
}

export function makeNormalish(): THREE.CanvasTexture {
  return canvasTex((ctx, size) => {
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillStyle = `rgb(${120 + Math.random() * 40},${120 + Math.random() * 40},255)`;
      ctx.fillRect(x, y, 3, 3);
    }
  }, 128);
}

export function pbrFloor(): THREE.MeshStandardMaterial {
  const map = makeFloorTexture();
  map.repeat.set(8, 8);
  return new THREE.MeshStandardMaterial({
    map,
    roughness: 0.82,
    metalness: 0.12,
    color: 0xffffff,
  });
}

export function pbrWall(): THREE.MeshStandardMaterial {
  const map = makeWallTexture();
  map.repeat.set(2, 2);
  return new THREE.MeshStandardMaterial({
    map,
    roughness: 0.78,
    metalness: 0.08,
    color: 0xffffff,
  });
}

export function pbrCrate(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: makeRustPanel(),
    roughness: 0.65,
    metalness: 0.45,
    color: 0xffffff,
  });
}
