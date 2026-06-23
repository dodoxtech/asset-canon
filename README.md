# Asset-Canon

Codex-powered **image asset generation** skills + commands for AI coding agents (Claude Code, Codex, Cursor).

Turn a one-line brief into production-ready image files on disk — icons, illustrations, sprites, textures, and social/OG images — with a deterministic pipeline: **brief → plan → generate (Codex) → optimize → write → report.**

## Install

### Via `npx skills add` (Vercel Agent Skills)

```bash
# all skills
npx skills add github:dodoxtech/asset-canon

# a single skill
npx skills add github:dodoxtech/asset-canon/skills/asset-icon
```

### Via Claude Code plugin marketplace

```bash
/plugin marketplace add dodoxtech/asset-canon
/plugin install asset-canon
```

This installs both the **skills** and the **slash commands**.

## Skills

| Skill | Install name | Purpose |
|---|---|---|
| Orchestrator | `asset-canon` | Routes a brief to a specialist and runs the full pipeline |
| Icons | `asset-icon` | Favicons, app icons, UI glyph families |
| Illustrations | `asset-illustration` | Heroes, spots, empty states with one style system |
| Sprites | `asset-sprite` | Game sprites, tiles, spritesheets + atlas |
| Textures | `asset-texture` | Seamless tileable backgrounds & patterns |
| Social | `asset-social` | OG cards, thumbnails, banners at exact sizes |

## Commands

| Command | Does |
|---|---|
| `/asset-new` | Scaffold a brief and lock the style system |
| `/asset-gen` | Generate assets from a brief via Codex, then optimize + write |
| `/asset-variants` | Produce color / size / state variants of an existing asset |
| `/asset-optimize` | Resize ladder, webp/png/ico export, sprite packing, metadata strip |

## Requirements

- **Node.js ≥ 18** — runs every script.
- **An image model** — the [generate step](#pipeline-scripts) calls Codex CLI or the OpenAI image API (`OPENAI_API_KEY`). Assets are always rendered by a model, never drawn in code.
- **[`sharp`](https://sharp.pixelplumbing.com/)** — *optional*, for the pixel-processing steps. It's declared as an `optionalDependency`, so installing the skill does **not** pull it in automatically.

### Do I need `sharp`?

`sharp` does all the work that touches pixels: resizing, format export, composing a sprite sheet, and measuring real dimensions. Generation itself does not use it.

| Task | Needs `sharp`? |
|---|---|
| Generate images (Codex / OpenAI) | ❌ no |
| Write a descriptor / sprite atlas **data** | ❌ no (falls back to WxH in the filename) |
| Resize ladder + webp/png/ico export (`optimize-assets`) | ✅ yes |
| Compose the actual sprite **sheet PNG** (`pack-sprite`) | ✅ yes |
| Full image QA — alpha, color budget (`asset-qa`) | ✅ yes |

Every script **degrades gracefully** without `sharp` (prints a plan or emits data-only output) instead of crashing. To enable the pixel steps, install it in the directory the scripts run from:

```bash
npm install        # pulls sharp (downloads a native libvips binary for your OS)
```

End users who only generate images and emit atlas/descriptor data can skip it.

## Pipeline scripts

```bash
# define the shared style once, validate it, then every asset inherits it
node scripts/validate-style-profile.mjs --in docs/style-profile.yaml

# generate one asset (Codex CLI backend, or OpenAI image API if OPENAI_API_KEY is set)
# --style-profile appends the shared style suffix + anti-slop guard + seed
node scripts/codex-imagegen.mjs --prompt "minimal line icon of a cart" \
  --size 1024x1024 --background transparent \
  --style-profile docs/style-profile.yaml \
  --out assets/generated/icons/cart-icon-line-1024x1024.png

# optimize a folder into a size/format ladder (needs `npm install` for sharp)
node scripts/optimize-assets.mjs --in assets/generated/icons \
  --sizes 512,256,128 --formats webp,png --strip

# pack animation frames into a sheet + atlas (json / xml / texturepacker)
node scripts/pack-sprite.mjs --in assets/generated/sprites/hero_run \
  --name hero_run --columns 8 --fps 12 --formats json,xml,texturepacker

# write a sidecar descriptor so other agents can place the asset without opening it
node scripts/write-descriptor.mjs --spec cart.spec.json   # -> docs/assets/cart.yaml

# gate: every asset must have a valid descriptor (CI-friendly, exit 1 on failure)
node scripts/validate-descriptors.mjs --in assets/generated/icons
```

Every generated asset ships with a YAML descriptor in [`docs/assets/`](docs/assets/)
(content, style, intended placement, file variants) — see that folder's README.

### Backend selection
- **Codex CLI** (default): drives the `codex` executor to generate and save the file.
- **OpenAI image API**: set `OPENAI_API_KEY` to call `gpt-image-1` directly.

## Repo structure

```
asset-canon/
├── .claude-plugin/
│   ├── plugin.json          # Claude Code plugin manifest
│   └── marketplace.json     # marketplace entry
├── commands/                # slash commands
│   ├── asset-new.md
│   ├── asset-gen.md
│   ├── asset-variants.md
│   └── asset-optimize.md
├── skills/                  # SKILL.md files (one folder each)
│   ├── llms.txt             # index of skills
│   ├── asset-canon/SKILL.md # orchestrator
│   ├── asset-icon/SKILL.md
│   ├── asset-illustration/SKILL.md
│   ├── asset-sprite/SKILL.md
│   ├── asset-texture/SKILL.md
│   └── asset-social/SKILL.md
├── scripts/
│   ├── codex-imagegen.mjs      # generation executor
│   ├── optimize-assets.mjs     # post-process
│   ├── asset-qa.mjs            # image quality gate
│   ├── pack-sprite.mjs        # frames -> sheet + atlas (json/xml/texturepacker)
│   ├── write-descriptor.mjs   # emit docs/assets/<id>.yaml descriptor
│   ├── validate-descriptors.mjs # descriptor gate (every asset described)
│   └── validate-style-profile.mjs # gate the shared style profile
├── docs/
│   ├── style-profile.example.yaml # shared style context (copy to style-profile.yaml)
│   └── assets/              # one YAML descriptor per asset
├── assets/                  # generated output + brief templates
├── examples/                # sample outputs
├── skill.sh                 # local install-name -> path registry
├── package.json
├── CHANGELOG.md
└── LICENSE
```

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=dodoxtech/asset-canon&type=Date)](https://star-history.com/#dodoxtech/asset-canon&Date)

## License

MIT
