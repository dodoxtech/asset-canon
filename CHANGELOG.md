# Changelog

## 0.1.0 — initial scaffold

- Claude Code plugin manifest (`plugin.json` + `marketplace.json`).
- Six skills: `asset-canon` orchestrator + `asset-icon`, `asset-illustration`,
  `asset-sprite`, `asset-texture`, `asset-social`.
- Four slash commands: `/asset-new`, `/asset-gen`, `/asset-variants`, `/asset-optimize`.
- Pipeline scripts: `codex-imagegen.mjs` (Codex CLI / OpenAI image backend),
  `optimize-assets.mjs` (sharp resize/format ladder).
- `skills/llms.txt` index and `skill.sh` local registry.
