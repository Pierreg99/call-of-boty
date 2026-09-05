# Call of Boty

Procedural **Three.js** browser FPS — Vite + TypeScript + Three.js r170+ + **cannon-es** physics. No external 3D assets (canvas / Data-URI procedural textures only).

Built as systems **1 → 5** with documented iteration passes in [ITERATIONS.md](./ITERATIONS.md). Sibling comparison: [COMPARE_GROKY.md](./COMPARE_GROKY.md).

## Play

**GitHub Pages:** https://pierreg99.github.io/call-of-boty/

## Run locally

```bash
npm ci
npm run dev
```

Production:

```bash
npm run build
npm run preview
```

Vite `base` is `/call-of-boty/`.

## Controls

| Input | Action |
|-------|-------|
| Click Deploy | Pointer lock |
| WASD | Move |
| Mouse | Look |
| Shift | Sprint |
| Space | Jump |
| LMB | Fire |
| RMB | ADS |
| R | Reload |
| Esc | Release lock |
| F3 | FPS counter |

## Objective

Eliminate **8** hostiles in the modular sector. Kill feed + tacmap track progress. Survive return fire.

## Stack
- Vite 5 + TypeScript (strict)
- Three.js >= 0.170 (EffectComposer, SMAA, UnrealBloom, SSAO, RoomEnvironment PMREM)
- cannon-es physics (player capsule + static world)
- Web Audio procedural SFX (positional)

## License

MIT — see [LICENSE](./LICENSE).
