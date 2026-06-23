---
name: asset-icon
description: Generate icon sets and app icons with Codex — favicons, PWA/manifest icons, macOS/iOS/Android app icons, and consistent UI glyph families (line, solid, duotone). Enforces a shared grid, stroke weight, corner radius, and optical alignment so every icon in a set looks like one family. Outputs transparent PNG/WebP plus .ico/.icns where relevant. Use for any request to create icons, glyphs, favicons, or app launcher art.
---

# ASSET-ICON

Generate icon **families** — not one-off pictures. Consistency across the set is the whole job.

## DESIGN SYSTEM (lock these once per set)
- **Grid:** 24px live area on a 32px canvas (or 1024 master for app icons).
- **Stroke:** one weight for the whole set (e.g. 2px @ 24px). Never mix.
- **Corner radius:** one value. Terminals rounded or square — pick one.
- **Optical balance:** circular glyphs slightly larger than square ones so they read equal.
- **Style:** line / solid / duotone — pick ONE per set.
- **Palette:** monochrome by default (single fg color), accent only if briefed.

## CANVAS & OUTPUT
| Use | Master size | Exports |
|---|---|---|
| UI icon set | 1024×1024 | 512, 256, 128, 64, 32 png+webp, transparent |
| Favicon | 512×512 | favicon.ico (16/32/48), 180 apple-touch, 512 maskable |
| iOS app icon | 1024×1024 | full Contents.json size ladder, opaque, no alpha |
| Android | 1024×1024 | adaptive fg+bg layers, 432 mipmaps |

## PROMPT TEMPLATE (per icon, fed to codex-imagegen)
> "Minimal {style} icon of {subject}, {stroke}px stroke, {radius}px rounded corners, centered on a 24px grid with even padding, single color {fg} on transparent background, flat, no shadow, no gradient, no background shape, pixel-crisp edges."

## CHECKS BEFORE WRITING
- [ ] Background actually transparent (not white).
- [ ] All icons share stroke + radius + optical size.
- [ ] App icons that forbid alpha are flattened on the brand bg.
- [ ] Favicon ladder + apple-touch + maskable generated.

Follow the `asset-canon` pipeline for generate → optimize → write → report.
