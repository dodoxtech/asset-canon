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
> "{style} game sprite of {subject}, {camera} view, {palette} palette, {light} lighting, {outline} outline, centered on a {NxN} grid, on a solid chroma-green #00B140 background with no green in the sprite, no drop shadow on the canvas, crisp edges."

Generate on the chroma plate, then key `#00B140` to alpha in post (see **CHROMA-KEY BACKGROUND** in `asset-canon`). Never request "transparent" directly. **Reserve one slot of the locked palette as the chroma plate and exclude it from every sprite** so keying never eats sprite pixels. If sprites are predominantly green (forests, slimes), switch the plate to chroma-magenta `#FF00FF` for the whole set.

**GOOD:** a red-and-steel knight on a `#00B140` plate → keying yields clean alpha around the silhouette.
**BAD:** a green slime on a `#00B140` plate → keying punches a hole through the slime; use a `#FF00FF` plate instead.

## SPRITESHEET PACKING
After generating frames, pack into a grid sheet and emit:
```json
{ "frames": { "walk_0": { "x":0,"y":0,"w":64,"h":64 } }, "meta": { "size": {"w":256,"h":64} } }
```

## CHECKS
- [ ] Chroma plate fully keyed to alpha; sprite has no interior holes from keying.
- [ ] Sprite palette excludes the plate color (green family, or magenta if plated magenta).
- [ ] Every frame identical canvas + registration point.
- [ ] Palette stays within the locked index set.
- [ ] Tiles pass the seamless-edge check (delegate to asset-texture check).

Run through the `asset-canon` pipeline.
