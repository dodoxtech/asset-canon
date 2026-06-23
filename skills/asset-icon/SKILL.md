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
> "Minimal {style} icon of {subject}, {stroke}px stroke, {radius}px rounded corners, centered on a 24px grid with even padding, single color {fg} on a solid chroma-green #00B140 background, no green in the icon itself, flat, no shadow, no gradient, no background shape, pixel-crisp edges."

Generate on the chroma plate, then key `#00B140` to alpha in post (see **CHROMA-KEY BACKGROUND** in `asset-canon`). Never request "transparent" directly. If the icon's own color is green, set `{fg}` away from green or swap the plate to chroma-magenta `#FF00FF`.

**GOOD:** charcoal `#1A1A1A` cart glyph on a `#00B140` plate → keying leaves a clean, halo-free glyph.
**BAD:** a green recycling glyph on a `#00B140` plate → keying deletes the glyph's own green strokes, leaving a broken icon.

## CHECKS BEFORE WRITING
- [ ] Background actually transparent (chroma-green fully keyed out, not white).
- [ ] Icon color avoids the plate's green family — no interior holes after keying.
- [ ] All icons share stroke + radius + optical size.
- [ ] App icons that forbid alpha are flattened on the brand bg.
- [ ] Favicon ladder + apple-touch + maskable generated.
- [ ] Sidecar `docs/assets/<slug>.yaml` written (subject, placement/intended_use, alt_text, files).

Follow the `asset-canon` pipeline for generate → optimize → write → report.
