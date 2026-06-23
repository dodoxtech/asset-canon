---
name: asset-texture
description: Generate seamless tileable textures and patterns with Codex — backgrounds, surfaces, noise, paper/fabric/concrete, geometric patterns, gradient meshes — and verify edge-wrap continuity so they tile without visible seams. Use for repeating backgrounds, surface materials, and pattern fills.
---

# ASSET-TEXTURE

A texture is only good if it **tiles seamlessly**. Generation is half the job; the seam check is the other half.

## SYSTEM
- **Category:** organic (paper/fabric/stone) / geometric (grid/dots/waves) / noise / gradient-mesh.
- **Tonality:** keep contrast low for backgrounds so foreground text stays readable.
- **Palette:** 1–3 colors, derive from project tokens.
- **Scale:** define the tile size the texture is designed to repeat at.

## CANVAS & OUTPUT
| Use | Master | Export |
|---|---|---|
| Background tile | 1024×1024 | 512, 256 webp + png |
| Hi-dpi surface | 2048×2048 | @1x @2x webp |

## PROMPT TEMPLATE
> "Seamless tileable {category} texture, {palette} palette, low contrast, even lighting, no focal point, no visible seams when repeated, edges designed to wrap continuously, flat top-down view."

## SEAMLESS CHECK (required before write)
Tile the image 2×2 and inspect the center cross for discontinuity. If seams appear:
- offset-wrap and heal the seam, or
- regenerate with a stronger "edges wrap continuously" constraint.
Only ship after a clean 2×2 tile.

Run through the `asset-canon` pipeline.
