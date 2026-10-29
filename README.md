# The Highline — Field Operations

A browser-playable, **third-person 3D** stealth-action vertical slice set above a Miami grand prix. The camera follows behind the operative at shoulder height; it is not a top-down or map-following view. The player can move around an elevated roof, shoulder a scoped rifle, acquire the event director on a VIP balcony, then use the stairwell to leave.

## Run locally

Serve this directory over HTTP (the ES modules and local GLB assets cannot load from `file://`):

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

Open `http://localhost:8000`. Three.js, fonts, the character runtime, and all 3D assets are local; the game does not fetch runtime assets from a CDN. WebGL 2 is required.

## Controls

- **WASD / arrow keys** — move relative to the camera
- **Shift** — sprint
- **C** — crouch
- **Hold right mouse** — aim through the scope; drag to adjust the view
- **Middle-mouse drag** — orbit the camera when not aiming
- **Left mouse** — fire
- **Mouse wheel** — adjust the view / optic magnification
- **R** — reload
- **E** — use the service stairwell after the target is down
- **Esc** — pause / resume

The operation starts with the operative on an elevated service roof, facing the pit-lane balcony. The target moves slightly along the balcony. The rooftop contains a small movement boundary and collision volumes around its service equipment. Missed shots alert security; after the target is down, reach the green stairwell marker and interact to finish the contract.

## Implementation

- `src/game3d.js` owns the Three.js scene, real-time third-person camera, rooftop, circuit, animated cars, skyline, palms, lighting, actors, and shot effects.
- `src/game.js` owns input, movement, interaction, the contract state, UI, pause, and extraction.
- `src/human-runtime.js` is a bundled HumanForge runtime. The build uses a CC0 MakeHuman-derived rigged human, a recolored pale-rose short-sleeve shirt texture, a small procedural polo collar, and a locally bundled CC0 scoped rifle.
- `vendor/` contains Three.js 0.186.1 and the GLTF loader, with the MIT notice in `vendor/THREE-LICENSE.txt`.

## Asset provenance

- The player and mission characters use HumanForge assets pinned to `2226df1f50a04c5a8e1c02ea33780d28337dfbb1`. The runtime is MIT; the model, skin, rig, and selected garments are CC0 1.0. Details and the upstream license text are in [`assets/humanforge/CREDITS.md`](assets/humanforge/CREDITS.md).
- The rifle mesh is the Styloo sniper rifle credited CC0 1.0 by [`zees-games/arena-weapons`](https://github.com/zees-games/arena-weapons); its source and texture derivative are documented in [`assets/weapons/CREDITS.md`](assets/weapons/CREDITS.md).
- UI fonts are bundled from Fontsource packages under the SIL Open Font License. Their license texts are in `assets/fonts/`.

The scene is an original, compact gameplay slice, not a full commercial game. It does not include proprietary franchise assets or game-rip models.
