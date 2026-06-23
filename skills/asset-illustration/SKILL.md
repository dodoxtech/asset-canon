---
name: asset-illustration
description: Generate hero illustrations, spot illustrations, and empty-state art with Codex using one coherent style system (palette, line weight, shading model, character proportions) so every illustration in a product looks like the same artist made it. Use for marketing heroes, onboarding art, empty/error states, and feature spots.
---

# ASSET-ILLUSTRATION

The job is a **reusable style system**, not a single picture. Define the system once, then every illustration inherits it.

## STYLE SYSTEM (lock once per product)
- **Palette:** 4–6 colors max, one accent. Reuse across all art.
- **Line:** none (flat) / uniform / tapered — pick one.
- **Shading:** flat / two-tone / soft-gradient — pick one.
- **Geometry:** rounded-organic vs. sharp-geometric.
- **Proportions:** if characters appear, fix head:body ratio and stick to it.
- **Perspective:** flat-front / slight-isometric — pick one.

## CANVAS & OUTPUT
| Use | Master | Exports |
|---|---|---|
| Hero | 2400×1600 | 1600, 1200, 800 webp + png, transparent or scene bg |
| Spot | 1024×1024 | 512, 256 webp+png, transparent |
| Empty state | 1024×768 | 768, 512 webp, transparent |

## PROMPT TEMPLATE
> "{style} illustration of {scene}, palette {hexes}, {shading} shading, {line} linework, {perspective} perspective, generous negative space, no text, no UI chrome, on a solid chroma-green #00B140 background with no green used in the artwork, cohesive with a {brand-vibe} product."

Applies only when the illustration ships with a transparent/cut-out background (spot, empty state, or a hero with no scene bg). Generate on the chroma plate, then key `#00B140` to alpha in post (see **CHROMA-KEY BACKGROUND** in `asset-canon`). Never request "transparent" directly. **Keep the green family (`{hexes}`) out of the artwork**, or keying will eat matching regions. If the scene needs green (foliage, landscapes), either ship it as a full scene-bg hero (no keying) or use a chroma-magenta `#FF00FF` plate.

**GOOD:** a person at a desk in warm neutrals + one orange accent on a `#00B140` plate → clean cut-out.
**BAD:** a garden scene full of green plants on a `#00B140` plate → keying shreds the foliage; keep it as a scene-bg hero or plate it magenta.

## CHECKS
- [ ] If cut-out: chroma plate fully keyed, no interior holes; artwork avoids the plate color.
- [ ] Same palette + line + shading as the rest of the set.
- [ ] No embedded text (text belongs in code/HTML, not the raster).
- [ ] Composition leaves room for headline overlay if it's a hero.

Run through the `asset-canon` pipeline.
