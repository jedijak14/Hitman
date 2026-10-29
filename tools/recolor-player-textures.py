#!/usr/bin/env python3
"""Create a subtle rose polo atlas and neutral charcoal CC0 rifle texture.

Inputs are the CC0 MakeHuman/HumanForge and Styloo source atlases. Only the
upper-shirt UV islands are recolored; denim and original fabric detail remain.
Requires Pillow when rerunning this offline asset-prep step.
"""
from pathlib import Path
from io import BytesIO
import json
import struct
from PIL import Image, ImageDraw, ImageOps, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
source_path = ROOT / 'assets/humanforge/source/clothes-male_casualsuit06.webp'


def embedded_image(glb_path: Path) -> Image.Image:
    """Read the first embedded GLB image without an external glTF utility."""
    data = glb_path.read_bytes()
    offset = 12
    document = None
    binary = None
    while offset < len(data):
        length, chunk_type = struct.unpack_from('<II', data, offset)
        offset += 8
        chunk = data[offset:offset + length]
        offset += length
        if chunk_type == 0x4E4F534A:
            document = json.loads(chunk.rstrip(b' \\0'))
        elif chunk_type == 0x004E4942:
            binary = chunk
    if not document or binary is None:
        raise ValueError(f'Invalid GLB: {glb_path}')
    view = document['bufferViews'][document['images'][0]['bufferView']]
    start = view.get('byteOffset', 0)
    return Image.open(BytesIO(binary[start:start + view['byteLength']])).convert('RGB')
image = Image.open(source_path).convert('RGB')
px = image.load()
width, height = image.size

# Map the MakeHuman white cotton tee to a pale, slightly warm rose while
# retaining the original tonal folds and textile grain. The pants UV islands
# begin below y=430 and are deliberately left unchanged.
for y in range(0, min(430, height)):
    for x in range(width):
        r, g, b = px[x, y]
        lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
        # A nonlinear luminance curve gives a light blush base and rose shadows.
        shade = max(0.70, min(1.035, 0.70 + 0.335 * ((lum / 255.0) ** 0.78)))
        px[x, y] = (
            min(255, int(226 * shade)),
            min(255, int(183 * shade)),
            min(255, int(187 * shade)),
        )

# The source shirt atlas carries MakeHuman marks on the two shirt panels. Fill
# those small UV regions from nearby clean cloth pixels, using same-row samples
# so the low-frequency cloth folds stay consistent with the surrounding fabric.
source = Image.open(source_path).convert('RGB')
src = source.load()
mask = Image.new('L', image.size, 0)
draw = ImageDraw.Draw(mask)
draw.rounded_rectangle((446, 103, 686, 210), radius=24, fill=255)  # chest logo + wordmark
# The second, smaller transfer mark sits on the adjacent torso island.
draw.rounded_rectangle((194, 104, 313, 174), radius=18, fill=255)
mask_px = mask.load()
for y in range(min(430, height)):
    for x in range(width):
        if not mask_px[x, y]:
            continue
        # Search near the marked region for plain cotton (neutral, bright pixels)
        # and copy that fabric value after the same rose conversion.
        if 440 <= x <= 720:
            lo, hi = 430, 735
        else:
            lo, hi = 0, min(400, width - 1)
        best = None
        for radius in range(1, 126):
            for candidate_x in (x - radius, x + radius):
                if candidate_x < lo or candidate_x > hi or mask_px[candidate_x, y]:
                    continue
                rr, gg, bb = src[candidate_x, y]
                chroma = max(rr, gg, bb) - min(rr, gg, bb)
                if min(rr, gg, bb) > 175 and chroma < 28:
                    best = (rr, gg, bb)
                    break
            if best:
                break
        if not best:
            best = (228, 228, 228)
        rr, gg, bb = best
        lum = 0.2126 * rr + 0.7152 * gg + 0.0722 * bb
        shade = max(0.70, min(1.035, 0.70 + 0.335 * ((lum / 255.0) ** 0.78)))
        px[x, y] = (int(226 * shade), int(183 * shade), int(187 * shade))

out = ROOT / 'assets/humanforge/textures/clothes-male_casualsuit06.webp'
out.parent.mkdir(parents=True, exist_ok=True)
image.save(out, 'WEBP', quality=96, method=6)

# Desaturate the CC0 AWP atlas into graphite tones without flattening the model's
# baked edge detail. The GLB geometry is unchanged; Three.js loads this atlas.
weapon = embedded_image(ROOT / 'assets/weapons/sniper-rifle.glb')
gray = ImageOps.autocontrast(ImageOps.grayscale(weapon), cutoff=1)
gray = ImageEnhance.Contrast(gray).enhance(1.16)
charcoal = ImageOps.colorize(gray, black='#161b1f', white='#a3aaac')
weapon_out = ROOT / 'assets/weapons/sniper-charcoal.png'
weapon_out.parent.mkdir(parents=True, exist_ok=True)
charcoal.save(weapon_out, 'PNG', optimize=True)
print(f'Wrote {out} ({image.width}x{image.height})')
print(f'Wrote {weapon_out} ({weapon.width}x{weapon.height})')
