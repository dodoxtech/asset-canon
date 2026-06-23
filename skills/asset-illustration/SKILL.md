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
> "{style} illustration of {scene}, palette {hexes}, {shading} shading, {line} linework, {perspective} perspective, generous negative space, no text, no UI chrome, transparent background, cohesive with a {brand-vibe} product."

## CHECKS
- [ ] Same palette + line + shading as the rest of the set.
- [ ] No embedded text (text belongs in code/HTML, not the raster).
- [ ] Composition leaves room for headline overlay if it's a hero.

Run through the `asset-canon` pipeline.
