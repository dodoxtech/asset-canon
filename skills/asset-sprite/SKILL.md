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
| Animation | N frames same canvas | packed sheet + atlas.json |

## PROMPT TEMPLATE
> "{style} game sprite of {subject}, {camera} view, {palette} palette, {light} lighting, {outline} outline, centered on a {NxN} grid, transparent background, no drop shadow on the canvas, crisp edges."

## SPRITESHEET PACKING
After generating frames, pack into a grid sheet and emit:
```json
{ "frames": { "walk_0": { "x":0,"y":0,"w":64,"h":64 } }, "meta": { "size": {"w":256,"h":64} } }
```

## CHECKS
- [ ] Every frame identical canvas + registration point.
- [ ] Palette stays within the locked index set.
- [ ] Tiles pass the seamless-edge check (delegate to asset-texture check).

Run through the `asset-canon` pipeline.
