---
name: asset-social
description: Generate social and Open Graph images with Codex — OG cards, Twitter/X cards, YouTube thumbnails, link previews, and banners — at exact platform dimensions with safe-area-aware composition and a single brand palette. Keeps headline text crisp (prefer code/SVG overlay over raster text). Use for share images, OG cards, and social banners.
---

# ASSET-SOCIAL

Social images live at **exact platform sizes** with hard safe areas. Get the dimensions and text legibility right.

## PLATFORM DIMENSIONS (exact)
| Platform | Size | Notes |
|---|---|---|
| OG default | 1200×630 | keep key content in center 1100×540 |
| Twitter/X summary_large | 1200×628 | |
| YouTube thumb | 1280×720 | bottom-right covered by duration chip |
| LinkedIn | 1200×627 | |
| Instagram post | 1080×1080 | |

## COMPOSITION
- **One brand palette**, one accent. Match the site.
- **Safe area:** keep logo + headline inside the inner 90%.
- **Text:** prefer overlaying real text via SVG/HTML in post, not baked into the AI raster (raster text warps). If text must be in the image, keep it short and large.
- **Hierarchy:** one focal element, clear background/foreground separation.

## PROMPT TEMPLATE (background plate)
> "{style} social card background, {palette} palette, strong left-to-right or center composition with clear empty space for a headline overlay, {brand-vibe}, no text, no logos, {WxH} aspect."

## PIPELINE NOTE
1. Generate the background plate (no text).
2. Overlay headline + logo via the project's SVG/HTML template (deterministic, crisp).
3. Export PNG at exact size + a compressed webp.

## CHECKS BEFORE WRITING
- [ ] Exact platform dimensions (e.g. 1200×630 for OG); verify with `asset-qa`.
- [ ] Key content inside the safe area (inner 90%).
- [ ] Headline text overlaid via SVG/HTML, not baked/warped into the raster.
- [ ] Single brand palette, one accent — consistent with the site.
- [ ] Sidecar `docs/assets/<slug>.yaml` written, with `platform`, `safe_area`, and `text_overlay` notes so it's reused without opening the image.

Run through the `asset-canon` pipeline.
