# Changelog

## Unreleased

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
