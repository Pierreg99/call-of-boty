# COMPARE_GROKY -- Boty vs Groky

How Call of Boty differs from Call of Groky, and what Groky should steal.

## Architectural differences

| Area | Boty | Groky |
|------|------|-------|
| Physics | cannon-es rigid player cylinder + static world boxes | Custom kinematic controller (no full physics stack) |
| Assets | Procedural only (canvas textures, geometry kits) | GLTF / HDRI-style pipeline + richer preset art |
| Enemies | FSM Idle/Alert/Attack/Search + cover nav | Archetypes (scout etc.) + wave/defend loop |
| Audio | Full procedural Web Audio + HRTF panners + gamepad rumble | Mix of asset/SFX paths |
| Post | SMAA / Bloom / SSAO / custom chromatic+vignette+grain temporal-feel | Similar post stack; more preset polish |
| Scope | Sector clear (8 kills), physics-first greybox | Defend-tower objective, touch, settings, multi-weapon |

## What Boty does better (steal these)

1. Real physics integration -- player movement and world collision share one cannon world. Groky should add at least a dynamic capsule player body.
2. Procedural purity -- zero network fetches for meshes/textures. Groky can keep GLTF for characters but should offer a full procedural fallback path.
3. Enemy Search state -- losing LOS sends bots to last-known then cover wander, not instant idle.
4. Haptics bridge -- gamepad vibrationActuator with phone vibrate fallback on fire/hit/kill.
5. Iteration log discipline -- every system records 3 weaknesses + fixes in ITERATIONS.md.

## What Groky does better (Boty should steal next)

1. Touch / mobile control overlay and settings panel (sensitivity + quality persist).
2. Multi-weapon loadout, inspect anims, compass, defend-objective loop.
3. Richer enemy archetypes and presentation (scout / killcam-lite).
4. Polished ship docs (RELEASE.md, CRITIC.md, gallery).

## Positioning

Boty = physics-first procedural arena shooter for engine iteration.
Groky = cinematic presentation FPS with broader player-facing feature surface.

Recommended merge: port Boty cannon-player + Search FSM into Groky, and port Groky touch/settings/inspect into Boty.
