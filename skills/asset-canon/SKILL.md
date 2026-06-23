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
8. **Every asset ships with a sidecar descriptor.** Alongside the image files, write a machine-readable **YAML** descriptor to `docs/assets/<slug>.yaml` that describes the asset's content, style, and intended placement — so another agent can place it correctly **without ever opening the image**. An asset is not "done" until its descriptor exists. (See **ASSET DESCRIPTOR** below.)
9. **Key out a chroma plate — don't trust "transparent".** For any asset that needs a transparent background (icon, sprite, illustration), generate it on a solid **chroma-green** plate (`#00B140`) and key that green to alpha in post. Direct "transparent" output leaves white halos and ragged alpha. **The asset's own colors must avoid the green family (~`#00A040`–`#40FF80`)** — if any part of the subject uses that green, keying will punch holes in the asset. If the subject is naturally green (a leaf, a frog, money), switch to a **chroma-magenta** plate (`#FF00FF`) and forbid magenta instead. Full-bleed assets (texture, social) keep their background and skip this.

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

**Persist the style as a shared profile.** Don't keep palette/style only in this transient plan — write it once to `docs/style-profile.yaml` (copy `docs/style-profile.example.yaml`) so every later generation and every other agent inherits the same context. Validate it before generating:

```bash
node scripts/validate-style-profile.mjs --in docs/style-profile.yaml
```

See **STYLE PROFILE** below.

## 3. GENERATE — run the pipeline via Codex

Build one structured prompt per asset and invoke the generation wrapper:

```bash
node scripts/codex-imagegen.mjs \
  --prompt "<art-directed prompt from specialist>, centered on a solid chroma-green #00B140 background, no green anywhere in the subject" \
  --size 1024x1024 \
  --background opaque \
  --style-profile docs/style-profile.yaml \
  --out assets/generated/icons/cart-icon-line-1024x1024.png
```

The wrapper (`scripts/codex-imagegen.mjs`) calls the image model through the Codex CLI / OpenAI image API. **Pass `--style-profile docs/style-profile.yaml` on every call** so the shared `prompt_suffix` + anti-slop `negative` are appended and the `seed` is locked — this is what keeps a batch consistent. For a batch, loop over the asset list. Generate at the **largest** required size once; downscale in post-process. For transparent assets, bake the chroma plate into the prompt (see **CHROMA-KEY BACKGROUND** above) and key the green to alpha in post-process — don't request `--background transparent` directly.

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

Write files to the output dir using the deterministic naming scheme. **For every asset, also write its sidecar descriptor to `docs/assets/<slug>.yaml`** (see ASSET DESCRIPTOR below) — the image and its descriptor land together, in the same step. Then report a table:

```
| file                              | size    | format | bytes |
|-----------------------------------|---------|--------|-------|
| cart-icon-line-512x512.png        | 512x512 | png    | 4.1KB |
| cart-icon-line-512x512.webp       | 512x512 | webp   | 2.3KB |
```

Note the descriptor path in the report (`docs/assets/cart.yaml`), then end with the import snippet for the user's stack (e.g. `import cart from "@/assets/generated/icons/cart-icon-line-512x512.webp"`).

---

## ASSET DESCRIPTOR (sidecar metadata)

Goal: an agent that has **never seen the pixels** can read the descriptor and know what the asset depicts, how it looks, and where it belongs. One YAML file per logical asset at `docs/assets/<slug>.yaml`; all size/format variants are listed inside it.

Don't hand-write the YAML — author the descriptive content as a small JSON spec and let the writer fill in the measurable facts (real bytes, pixel dimensions, format, date) and emit canonical YAML, then gate it:

```bash
# write docs/assets/<id>.yaml from a spec (real dims/bytes measured from disk)
node scripts/write-descriptor.mjs --spec cart.spec.json

# gate: fail if any descriptor is invalid or any asset has no descriptor
node scripts/validate-descriptors.mjs --in assets/generated/icons
```

```yaml
# docs/assets/cart.yaml
id: cart
type: icon                      # icon | illustration | sprite | texture | social
subject: shopping cart          # the concrete thing depicted
description: >                  # plain-language content, enough to place it blind
  A minimal line-art shopping cart facing right, single charcoal stroke,
  no fill, no background. Reads as "add to cart / checkout".
keywords: [cart, ecommerce, checkout, basket, buy]
placement:                      # where another agent should USE this
  intended_use: primary "add to cart" button and cart nav link
  context: ecommerce header, product cards
  do: [use at 24–32px in UI, pair with accent on hover]
  dont: [do not stretch, do not place on busy photo backgrounds]
style:
  art_style: flat line
  stroke: 2px @ 24px grid
  shading: none
palette: ["#1A1A1A"]            # the asset's actual colors (not the chroma plate)
background: transparent         # transparent | full-bleed | chroma-keyed
dimensions:
  master: 1024x1024
  aspect: "1:1"
safe_area: full                 # or e.g. "inner 90%" for social
accessibility:
  alt_text: "Shopping cart icon"
files:                          # every variant on disk, by path
  - path: assets/generated/icons/cart-icon-line-512x512.webp
    size: 512x512
    format: webp
    bytes: 2360
  - path: assets/generated/icons/cart-icon-line-512x512.png
    size: 512x512
    format: png
    bytes: 4180
source:                         # provenance — never a code-drawn asset
  model: codex-imagegen (openai images)
  prompt: "Minimal flat line icon of a shopping cart, 2px stroke, …"
  generated: 2026-06-23
```

**Type-specific blocks to add when relevant:**

- **sprite** — add an `animation` block so the motion is reconstructable without opening the sheet:
  ```yaml
  animation:
    sheet: assets/generated/sprites/hero_run-512x128.png
    cell: { w: 64, h: 64 }
    columns: 8
    count: 8
    fps: 12
    loop: true
    anchor: [0.5, 1.0]
    clips: { run: [0, 7] }
  ```
- **social** — add `platform: og` / `safe_area: inner 90%` / `text_overlay: "added in code, not baked"`.
- **texture** — add `tileable: true`, `tile_size: 1024x1024`, `tonality: low-contrast`.
- **illustration** — add `composition: "negative space top-right for headline"`.

Rules: keep `description`/`placement` truthful to what was actually generated; list **only files that exist**; the `palette` is the asset's own colors, never the chroma plate. If you batch N assets, write N descriptor files (one per slug).

---

## STYLE PROFILE (shared style context)

A descriptor describes **one output**; the style profile prescribes the **shared input style** that keeps every asset consistent. It is the design-tokens-as-style-brief pattern (Style Dictionary / Penpot) applied to image generation: define the look once in `docs/style-profile.yaml`, and every generation — now or months later, by you or another agent — inherits it.

Copy `docs/style-profile.example.yaml`, fill it in, validate, then pass it to every generate call:

```bash
node scripts/validate-style-profile.mjs --in docs/style-profile.yaml          # gate
node scripts/codex-imagegen.mjs --prompt "<…>" --style-profile docs/style-profile.yaml --out <…>
```

The generator automatically:
- appends `prompt_suffix` (the positive style anchor) to the prompt,
- appends `Avoid: <negative…>` (the anti-slop guard),
- locks `seed` on backends that support it (the Codex executor; gpt-image-1 has no seed parameter, so it's skipped there).

Required fields: `id`, `palette` (hex), `prompt_suffix`. Recommended: `line`, `shading`, `negative`, `seed`. One profile per project (or per brand/sub-theme); commit it so the style is reproducible.

> **Scope note:** this is text/structured conditioning only. Stronger visual locking — passing reference images to gpt-image-1, or a local SD + LoRA backend — is a deliberate future step, not part of this profile.

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
