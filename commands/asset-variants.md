---
description: Generate variations of an existing asset — color, size, or state — keeping the locked style system
argument-hint: "[asset file] [variants: e.g. 'dark, hover, 2x']"
allowed-tools: Bash(node scripts/*), Read, Write, Glob
---

You are running the **/asset-variants** command from the asset-canon plugin.

Load the `asset-canon` skill. Take an existing generated asset and produce variants that stay inside the same style system (same palette family, stroke, canvas, naming).

Input: $ARGUMENTS

Steps:
1. Read the source asset and its brief (if present) to recover the locked style system.
2. Expand the requested variants: color (light/dark/brand), state (default/hover/disabled), size (@1x/@2x/@3x).
3. Generate each variant via `scripts/codex-imagegen.mjs`, reusing the original prompt with only the varied dimension changed — keep everything else identical for visual consistency.
4. Optimize and write with names `<slug>-<variant>-<WxH>.<ext>`.
5. Report the new files alongside the original.
