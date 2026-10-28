# The Silent Coast — Field Operations

A browser-playable **3D** stealth-game prototype inspired by the social-stealth genre. The old 2D canvas presentation has been replaced by a Three.js WebGL scene with animated, license-verified human models, role-specific wardrobe styling, a navigable 3D venue, and a distributed animated crowd. Three original contracts share one reactive sandbox.

## Run

Serve the repository over HTTP (ES modules and local GLB assets do not work when opened directly as `file://`):

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

Then visit `http://localhost:8000`. The Three.js runtime, GLTF loader, character model, textures, and animations are bundled locally; no runtime CDN is needed for 3D rendering or character assets. A browser with WebGL 2 support is required.

## Play

Choose a contract, review its briefing, and deploy. The 3D build includes:

- A perspective, orbitable 3D view of the shared venue, with contract-specific lighting, surfaces, walls, water, furniture, and interactable environmental props.
- Animated CC0 MakeHuman-derived suited characters for the player and individual NPCs, with role-specific suit colors, badges, lanyards, safety equipment, or security gear. Twelve animated GLB crowd representatives are stratified across the venue and use the same collision-safe 1,120-agent simulation that powers ambient movement and reactions.
- Smooth idle/walk/run cross-fades with stride speed matched to movement, a lowered crouch silhouette, animated articulated crowd figures, target/enforcer markers, 3D vision cones, active searches, sound-wave rings, and visible weapon fire.
- Guard, civilian, and target behavior trees with separate knowledge and response rules; nearby members of the 1,120-agent crowd are promoted to individual AI during disturbances.
- A* navigation, patrol schedules, scripted target opportunities, target evacuation, safe rooms, protective guard perimeters, and role-specific area access.
- Two white-dot enforcers, light/angle/line-of-sight detection, area-specific disguise compromise, and a central suspicion meter.
- Body dragging and concealment, exposed-body discovery, civilian reports, guard vital checks, drawn weapons, and local searches/lockdowns.
- Sound propagation and investigation, environmental disruptions and repair tasks, health, extraction, campaign progress, pause, and a tactical minimap.

The detailed cast and the 12 visible crowd representatives share one suited CC0 base model, with role-specific material and accessory variations rather than a unique high-detail mesh for every gender, face, or uniform.

### Controls

- **WASD / arrow keys** — move
- **Shift** — run (louder footsteps)
- **C** — toggle crouch
- **E** — interact with props, change disguise, blend, or extract
- **Q** — close-quarters takedown
- **G** — drag / drop a body
- **H** — hide a body in a nearby container
- **1 / 2 / 3** — fiber wire / silenced pistol / coin
- **F** or **left click** — use equipped item
- **Right-drag / middle-drag** — orbit the 3D camera
- **Mouse wheel** — zoom the 3D camera
- **Tab** — expand map
- **Esc** — pause

## Assets and licences

- `vendor/three.module.js`, `vendor/three.core.js`, and the selected Three.js addon modules are from Three.js **0.186.1**, licensed under the MIT License; see `vendor/THREE-LICENSE.txt`.
- `assets/characters/suited.glb` is a MakeHuman / MPFB2-derived model released under **CC0 1.0**. Its upstream source commit, model attribution, texture notes, and animation provenance are documented in [`assets/characters/CREDITS.md`](assets/characters/CREDITS.md).
- Additional verified CC0 source models (`human.glb` and `man.glb`) are retained alongside the suited model; the current close-up cast uses the suited model so wardrobe differences remain visible and characters stay clothed.

This is an original stealth-game prototype and does not use proprietary game assets. Some gameplay systems remain prototype implementations and should not be treated as production-tested simulations.
