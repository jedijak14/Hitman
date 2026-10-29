# Character and garment assets

- `body.glb.gz`, `shapes.bin.gz`, the MakeHuman skin atlas, eyes, brows, hair, shoes, and clothing proxies are from HumanForge, pinned to [`2226df1f50a04c5a8e1c02ea33780d28337dfbb1`](https://github.com/abdulrehman043/humanforge/tree/2226df1f50a04c5a8e1c02ea33780d28337dfbb1/assets/human). The source project is MIT-licensed; the bundled human assets are dedicated to **CC0 1.0**. Full upstream notes are in [`UPSTREAM-ASSET-LICENSES.md`](UPSTREAM-ASSET-LICENSES.md), and the runtime's MIT terms are in [`HUMANFORGE-MIT-LICENSE.txt`](HUMANFORGE-MIT-LICENSE.txt).
- The base mesh, rig, weights, shape data, skin, and `male_casualsuit05`, `male_casualsuit06`, `male_worksuit01`, and `shoes01` garment meshes are unchanged CC0 source assets. The worksuit proxy is used as the in-game roof-security disguise.
- `textures/clothes-male_casualsuit06.webp` is a derivative of the upstream `clothes-male_casualsuit06.webp`: the white tee atlas was recolored to pale rose, the printed MakeHuman marks were removed, and fabric luminance detail and denim were retained. The geometry is supplemented in code with a small polo collar and placket.
- `source/clothes-male_casualsuit06.webp` retains the unmodified CC0 source atlas for reproducibility. Run `python3 tools/recolor-player-textures.py` (with Pillow installed) to regenerate the rose shirt atlas and the neutral rifle atlas.

No proprietary game character or game-rip model is used.
