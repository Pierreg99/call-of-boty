# ITERATIONS — Call of Boty

Each system: implement, list 3 weaknesses, fix, proceed.

## System 1 — Grundframework

### Weaknesses found
1. Camera FOV snapped instantly on sprint/ADS — felt robotic.
2. Viewmodel had no look-sway; weapon felt glued to the lens.
3. Physics body used a box; corners snagged on crate edges.

### Fixes applied
1. Exponential FOV lerp (sprint 82 / ADS 52 / hip 75).
2. Look-delta sway + recoil kick on the viewmodel group.
3. Switched player collider to cannon-es Cylinder with fixedRotation.

## System 2 — Environment and lighting

### Weaknesses found
1. Flat unlit greybox; no material response under lamps.
2. Hard shadow acne on modular wall seams.
3. Post stack lacked cinematic grade (only bloom).

### Fixes applied
1. Procedural PBR canvas maps (floor tiles, brick walls, rust crates) + RoomEnvironment PMREM.
2. PCF soft shadows with bias/normalBias; selective point-lamp shadows on medium+.
3. Custom chromatic+vignette+grain shader pass after bloom; ACES on renderer + in-shader filmic curve.

## System 3 — Gameplay

### Weaknesses found
1. Hits registered through walls (no level mesh in ray mask).
2. Enemies only chased; no search after losing LOS.
3. Damage had no directional cue — hard to know where fire came from.

### Fixes applied
1. Raycast against level colliders + bot meshes; decals on world hits.
2. FSM Idle/Alert/Attack/Search with cover nav targets and LOS probes.
3. Screen-edge damage wedges from attacker yaw + hit flash + camera shake.

## System 4 — Audio

### Weaknesses found
1. Mono bus; shots always centered.
2. No footfall feedback while sprinting.
3. Gamepad owners got zero haptics on fire/hit.

### Fixes applied
1. Web Audio PannerNode HrTF for shots/steps at world positions.
2. Gait-timed procedural step blips scaled by sprint.
3. dual-rumble vibrationActuator (fallback navigator.vibrate) on fire, hit, kill.

## System 5 — Performance and polish

### Weaknesses found
1. Far bots kept full mesh detail (visor/head always on).
2. Crosshair static; no ADS/fire feedback.
3. No situational awareness HUD beyond numeric HP.

### Fixes applied
1. Distance LOD hides non-body parts past 40m; frustumCulled enabled on level/bots.
2. Dynamic crosshair spread classes for ADS and fire pulse.
3. Tacmap minimap, killfeed, objective counter; streaming left as stub export in main.ts.

## Ship polish (post systems 1–5)

### Weaknesses found
1. Head/visor hits missed bots — only torso carried `botId`.
2. Death/win left the match stuck; DEPLOY did not reset HP/bots/ammo.
3. Jump ground check used a crude Y threshold; capsule contacts ignored.
4. Duplicate Pages workflows raced and cancelled each other.

### Fixes applied
1. Tag entire bot mesh tree with `botId`; parent walk resolves any part.
2. `redeploy()` resets player, weapon, bots, HUD; REDEPLOY after fail/win.
3. cannon-es contact normals via `PhysicsWorld.isGrounded`.
4. Single `deploy.yml` Pages workflow; audio win/lose stings + reload/empty cues.
5. Overlay click-anywhere deploys; health fill warn (≤55) / crit pulse (≤30).

## Build gate

`npm run build` must exit 0 before ship. Player-facing UI has no placeholder copy.

