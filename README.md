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

## Pipeline scripts

```bash
# generate one asset (Codex CLI backend, or OpenAI image API if OPENAI_API_KEY is set)
node scripts/codex-imagegen.mjs --prompt "minimal line icon of a cart" \
  --size 1024x1024 --background transparent \
  --out assets/generated/icons/cart-icon-line-1024x1024.png

# optimize a folder into a size/format ladder (needs `npm install` for sharp)
node scripts/optimize-assets.mjs --in assets/generated/icons \
  --sizes 512,256,128 --formats webp,png --strip
```

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
│   ├── codex-imagegen.mjs   # generation executor
│   └── optimize-assets.mjs  # post-process
├── assets/                  # generated output + brief templates
├── examples/                # sample outputs
├── skill.sh                 # local install-name -> path registry
├── package.json
├── CHANGELOG.md
└── LICENSE
```

## License

MIT
