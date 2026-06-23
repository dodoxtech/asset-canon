---
name: asset-sprite
description: Generate game sprites and spritesheets with Codex — characters, items, tiles, props — at a fixed canvas with a consistent pixel or vector style, alpha background, and frame-grid packing plus a JSON atlas for animation. Use for game art, icon-like game items, tilesets, and animation frames.
---

# ASSET-SPRITE

Game art needs **strict consistency** in scale, palette, and pixel grid so sprites sit together in one world.

## STYLE SYSTEM (lock once per game)
- **Style:** pixel-art (fixed px resolution, e.g. 32×32 native) OR clean vector.
- **Palette:** locked indexed palette (e.g. 16 colors). Reuse for every sprite.
- **Lighting:** single consistent light direction (e.g. top-left).
- **Outline:** present/absent + color — pick one.
- **Camera:** top-down / side / 3-4 isometric — pick one for the whole set.

## CANVAS & OUTPUT
| Use | Native | Export |
|---|---|---|
| Character | 64×64 or 128×128 | @1x @2x png, transparent |
| Tile | 32×32 / 16×16 | seamless-tested png |
| Item | 64×64 | transparent png |
| Animation | N frames, one shared cell | packed sheet + atlas.json |

## PROMPT TEMPLATE
> "{style} game sprite of {subject}, {camera} view, {palette} palette, {light} lighting, {outline} outline, centered on a {NxN} grid, on a solid chroma-green #00B140 background with no green in the sprite, no drop shadow on the canvas, crisp edges."

Generate on the chroma plate, then key `#00B140` to alpha in post (see **CHROMA-KEY BACKGROUND** in `asset-canon`). Never request "transparent" directly. **Reserve one slot of the locked palette as the chroma plate and exclude it from every sprite** so keying never eats sprite pixels. If sprites are predominantly green (forests, slimes), switch the plate to chroma-magenta `#FF00FF` for the whole set.

**GOOD:** a red-and-steel knight on a `#00B140` plate → keying yields clean alpha around the silhouette.
**BAD:** a green slime on a `#00B140` plate → keying punches a hole through the slime; use a `#FF00FF` plate instead.

## FRAME GRID STANDARD (animation-ready)

A sheet is "detectable" only if frame `i`'s rectangle is **computable from the sheet alone** — no per-frame lookup needed. Lock these so any packer/reader derives positions with pure arithmetic:

- **Uniform cell.** Every frame occupies the exact same `cellW × cellH` box. Power-of-two cells only: `16, 32, 64, 128, 256`. Never mix cell sizes in one sheet.
- **Zero gutter, zero margin.** Frames butt edge-to-edge — no padding between cells, no border around the sheet. (If bleed is unavoidable, declare a single fixed `gutter` and apply it uniformly; the reader subtracts it. Default 0.)
- **Row-major order.** Fill left→right, then top→bottom. Frame 0 is top-left. No gaps, no skipped cells; trailing unused cells (if any) sit at the bottom-right and are excluded by `count`.
- **Fixed column count.** Declare `columns`. Then `rows = ceil(count / columns)`, `sheet = (columns·cellW) × (rows·cellH)`. One action per row is a good convention (`columns` = longest action's frame count).
- **Shared registration/anchor.** Every frame's pivot lands on the same pixel inside its cell (e.g. bottom-center `anchor: [0.5, 1.0]`). This is what stops the sprite from jittering during playback — the subject must not drift cell-to-cell.
- **Sequential, zero-padded names** in playback order: `hero_run_00.png … hero_run_07.png`. The numeric suffix *is* the frame index.

**Reader math** — given the atlas `meta`, frame `i` is:
```
cols = sheet.w / (cell.w + gutter)
x = (i % cols) * (cell.w + gutter)
y = floor(i / cols) * (cell.h + gutter)
w = cell.w ,  h = cell.h
```

## SPRITESHEET PACKING

Pack frames in name order into the grid above, then emit an atlas that carries the playback contract (cell, columns, count, fps, loop, anchor) — not just per-frame boxes:
```json
{
  "meta": {
    "image": "hero_run-512x128.png",
    "sheet":   { "w": 512, "h": 128 },
    "cell":    { "w": 64,  "h": 64 },
    "gutter":  0,
    "columns": 8,
    "count":   8,
    "fps":     12,
    "loop":    true,
    "anchor":  [0.5, 1.0]
  },
  "frames": {
    "hero_run_00": { "x": 0,   "y": 0, "w": 64, "h": 64 },
    "hero_run_07": { "x": 448, "y": 0, "w": 64, "h": 64 }
  }
}
```
With `meta` alone a script reconstructs every frame rect via the reader math; `frames` is a convenience/verification map. Multiple actions → either one row per action (with a `clips` map of `{ "run": [0,7], "jump": [8,11] }`) or one sheet+atlas per action.

## CHECKS
- [ ] Chroma plate fully keyed to alpha; sprite has no interior holes from keying.
- [ ] Sprite palette excludes the plate color (green family, or magenta if plated magenta).
- [ ] Uniform power-of-two cell; zero gutter/margin (or one declared gutter); row-major, no gaps.
- [ ] `sheet.w == columns·cell.w` and `sheet.h == ceil(count/columns)·cell.h` — reader math resolves.
- [ ] Every frame identical canvas + shared anchor pixel (no subject drift across frames).
- [ ] Frames zero-padded and named in playback order; atlas `meta` carries cell/columns/count/fps/loop/anchor.
- [ ] Palette stays within the locked index set.
- [ ] Tiles pass the seamless-edge check (delegate to asset-texture check).

Run through the `asset-canon` pipeline.
