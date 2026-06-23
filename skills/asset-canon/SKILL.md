---
name: asset-canon
description: Orchestrator skill for generating production-ready image assets with Codex. Reads an asset brief, selects the right specialist (icon / illustration / sprite / texture / social), drives the codex-imagegen pipeline to produce the image(s), then post-processes (transparent background, resize, webp/png export, deterministic file names) and writes them into the project. Enforces a single consistent palette, fixed canvas sizes, alpha-correct edges, and zero AI slop. Use whenever the user asks to create, generate, redraw, or batch produce visual assets for a website, app, or game.
---

# ASSET-CANON — CODEX IMAGE ASSET ORCHESTRATOR

You are an asset director that turns a short brief into a set of **production-ready image files** on disk, using Codex as the generation executor.

You do not just "make an image." You run a deterministic pipeline:

```
BRIEF  ->  PLAN  ->  GENERATE (codex-imagegen)  ->  POST-PROCESS  ->  WRITE  ->  REPORT
```

---

## 0. HARD RULES — READ FIRST

1. **Pixels come from an image model — never from code.** Every asset must be rendered by an image-generation **API/model** (the `codex-imagegen` wrapper, OpenAI Images, or ChatGPT image generation). **Do NOT fabricate the image by drawing it in code** — no canvas/`<canvas>` rendering, no hand-written SVG/HTML/CSS "art", no ASCII, no programmatic shape-drawing dressed up as the asset. Those are not production art and will look like it. If no image model is reachable (no API key, wrapper fails, offline), **stop and say so immediately** — e.g. *"Can't generate: no image model available. I won't hand-draw this in code because the quality won't be acceptable."* — and wait for the user. Never silently substitute a code-drawn placeholder.
2. **Every asset is a real file on disk.** Never return a description in place of an actual generated file. If you cannot run the pipeline, say so explicitly.
3. **One consistent palette per batch.** All assets in a single request share one palette, one line weight, one shading model. Define it once in the PLAN and reuse it.
4. **Fixed canvas, never "approximately."** Each asset type has exact target dimensions. Generate at the largest target, then downscale — never upscale.
5. **Transparent where it matters.** Icons, sprites, illustrations with no background → alpha PNG. Verify the background is actually transparent, not white.
6. **Deterministic names.** Files use `<slug>-<variant>-<WxH>.<ext>` (e.g. `cart-icon-line-512x512.png`). No spaces, no timestamps, lowercase kebab-case.
7. **No AI slop.** No purple/blue glow defaults, no meaningless floating blobs, no fake-3D bevels unless the brief asks. Match the brand, not the model's defaults.
8. **Key out a chroma plate — don't trust "transparent".** For any asset that needs a transparent background (icon, sprite, illustration), generate it on a solid **chroma-green** plate (`#00B140`) and key that green to alpha in post. Direct "transparent" output leaves white halos and ragged alpha. **The asset's own colors must avoid the green family (~`#00A040`–`#40FF80`)** — if any part of the subject uses that green, keying will punch holes in the asset. If the subject is naturally green (a leaf, a frog, money), switch to a **chroma-magenta** plate (`#FF00FF`) and forbid magenta instead. Full-bleed assets (texture, social) keep their background and skip this.

---

## CHROMA-KEY BACKGROUND (transparent assets)

The plate exists only to be deleted. Pick the plate color that is *furthest* from everything in the asset, then forbid that color in the subject.

```
GOOD  ┌───────────────┐      BAD   ┌───────────────┐
      │███████████████│            │███████████████│
      │███┌───────┐███│            │███┌──▓▓▓──┐███│  ← asset uses the SAME green
      │███│ asset │███│            │███│ as▓et │███│    as the plate
      │███│ #FF5C │███│            │███│ #2FE0 │███│
      │███└───────┘███│            │███└──▓▓▓──┘███│
      │███████████████│            │███████████████│
      └───────────────┘            └───────────────┘
   plate #00B140, asset has         keying #00B140 also deletes the
   zero green → clean alpha cut      green pixels INSIDE the asset → holes
```

- **GOOD:** plate `#00B140`; asset palette is orange/charcoal/cream with no greens. Keying the green yields crisp, hole-free alpha edges.
- **BAD:** plate `#00B140`; asset has a green leaf/badge in the same hue range. Keying eats the leaf, leaving transparent gaps mid-asset.
- **FIX for green subjects:** swap the plate to chroma-magenta `#FF00FF` and forbid magenta in the asset instead.

Verify after keying: the background reads fully transparent **and** the subject is intact with no interior holes (`scripts/asset-qa.mjs` alpha check).

---

## 1. BRIEF — what to extract

Before generating anything, resolve these. Ask only if a value is load-bearing and missing:

- **Asset type** → icon / illustration / sprite / texture / social (routes to a specialist skill)
- **Subject(s)** → list of concrete items ("cart, heart, bell" → 3 assets)
- **Style** → flat / line / duotone / pixel / 3d-clay / photographic / gradient-mesh
- **Palette** → hex list, or derive from the project's existing tokens/CSS
- **Dimensions** → use the specialist's default if unspecified
- **Format** → png (alpha), webp, svg-trace, or sprite-sheet
- **Output dir** → default `assets/generated/`
- **Count / variants** → how many, and which variations (color, size, state)

## 2. PLAN — write it before generating

Emit a short plan the user can sanity-check:

```
Palette:   #0B0B0F bg, #F5F5F5 fg, #FF5C39 accent
Style:     flat line, 2px stroke, 24px grid, 4px corner radius
Assets:    3  ->  cart, heart, bell
Canvas:    512x512, transparent PNG, exported to assets/generated/icons/
Specialist: asset-icon
```

Route to the matching specialist SKILL.md (`asset-icon`, `asset-illustration`, `asset-sprite`, `asset-texture`, `asset-social`) and follow its art-direction rules for the prompt.

## 3. GENERATE — run the pipeline via Codex

Build one structured prompt per asset and invoke the generation wrapper:

```bash
node scripts/codex-imagegen.mjs \
  --prompt "<art-directed prompt from specialist>, centered on a solid chroma-green #00B140 background, no green anywhere in the subject" \
  --size 1024x1024 \
  --background opaque \
  --out assets/generated/icons/cart-icon-line-1024x1024.png
```

The wrapper (`scripts/codex-imagegen.mjs`) calls the image model through the Codex CLI / OpenAI image API. For a batch, loop over the asset list. Generate at the **largest** required size once; downscale in post-process. For transparent assets, bake the chroma plate into the prompt (see **CHROMA-KEY BACKGROUND** above) and key the green to alpha in post-process — don't request `--background transparent` directly.

If only one image can render at a time, generate them **sequentially in the same run** and announce progress: `Asset 1 of 3: cart`, `Asset 2 of 3: heart`, …

## 4. POST-PROCESS — make it production-ready

```bash
node scripts/optimize-assets.mjs --in assets/generated/icons --sizes 512,256,128,64 --formats webp,png --strip
```

- Downscale to every requested size.
- Export requested formats (webp for web, png for alpha-critical, ico for favicons).
- Strip metadata, quantize where lossless allows.
- For sprites: pack frames into a grid sheet + emit a JSON atlas.
- For textures: run the seamless-edge check.

## 5. WRITE + REPORT

Write files to the output dir using the deterministic naming scheme. Then report a table:

```
| file                              | size    | format | bytes |
|-----------------------------------|---------|--------|-------|
| cart-icon-line-512x512.png        | 512x512 | png    | 4.1KB |
| cart-icon-line-512x512.webp       | 512x512 | webp   | 2.3KB |
```

End with the import snippet for the user's stack (e.g. `import cart from "@/assets/generated/icons/cart-icon-line-512x512.webp"`).

---

## ROUTING TABLE

| Brief says… | Use specialist |
|---|---|
| favicon, app icon, glyph, ui icon set | `asset-icon` |
| hero art, spot illustration, empty state | `asset-illustration` |
| game sprite, character, tile, spritesheet | `asset-sprite` |
| background, pattern, seamless, surface | `asset-texture` |
| OG image, social card, thumbnail, banner | `asset-social` |

When in doubt, ask the user which specialist fits, then commit to one palette and run the pipeline.
