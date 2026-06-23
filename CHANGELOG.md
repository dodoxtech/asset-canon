# Changelog

## Unreleased

- Instruction-first skills: SKILL.md now describes each pipeline step as work the
  agent performs with its own tools (generate via the environment's image model,
  Write/Read/Bash to post-process and record), under the user's normal approval
  prompts. The `scripts/` are demoted to an **optional** repo/CI convenience —
  never required, never the only path. A user who only installed the skill is
  never told to download or run a bundled script.
- Shared style profile for cross-asset consistency: `docs/style-profile.yaml`
  (copy from `docs/style-profile.example.yaml`) is a single style context every
  generation reads — the design-tokens-as-style-brief pattern applied to image
  gen. `codex-imagegen.mjs --style-profile` appends `prompt_suffix` + an
  `Avoid: <negative>` anti-slop guard and locks `seed` on backends that support
  it (gpt-image-1 has no seed param). New `scripts/validate-style-profile.mjs`
  gates the profile (required fields, hex palette, numeric seed). Text/structured
  conditioning only; reference-image and LoRA backends are a future step.
- Sidecar descriptors: every generated asset now ships with a YAML descriptor in
  `docs/assets/<id>.yaml` (HARD RULE #8) so another agent can place it without
  opening the image. New `scripts/write-descriptor.mjs` (emits canonical YAML,
  measures real bytes/dimensions) and `scripts/validate-descriptors.mjs` (gate:
  fails on missing fields, ghost file refs, or orphan assets).
- Sprite frame-grid standard: animation-ready layout rules (uniform power-of-two
  cell, zero gutter, row-major order, fixed columns, shared anchor) plus an atlas
  schema carrying the playback contract.
- Sprite packer `scripts/pack-sprite.mjs`: lays frames out row-major, composes the
  transparent sheet, and emits the atlas in selectable formats — `json` (native),
  `xml` (TexturePacker/Starling), `texturepacker` (JSON-Hash for Phaser/PixiJS/Godot).
- Chroma-key background convention for transparent assets: generate on a
  chroma-green (`#00B140`) plate and key it out; forbid the plate color in the
  asset; magenta fallback for green subjects.
- HARD RULE #1: assets must be rendered by an image model (API/ChatGPT), never
  hand-drawn in code/canvas/SVG.
- Quality tooling: `scripts/asset-qa.mjs` automated quality gate (naming,
  dimensions, alpha, palette budget) and `evals/activation.md` activation
  regression checklist.
- Added `## CHECKS BEFORE WRITING` sections to `asset-social` and `asset-texture`
  for parity with the other specialists.

## 0.1.0 — initial scaffold

- Claude Code plugin manifest (`plugin.json` + `marketplace.json`).
- Six skills: `asset-canon` orchestrator + `asset-icon`, `asset-illustration`,
  `asset-sprite`, `asset-texture`, `asset-social`.
- Four slash commands: `/asset-new`, `/asset-gen`, `/asset-variants`, `/asset-optimize`.
- Pipeline scripts: `codex-imagegen.mjs` (Codex CLI / OpenAI image backend),
  `optimize-assets.mjs` (sharp resize/format ladder).
- `skills/llms.txt` index and `skill.sh` local registry.
