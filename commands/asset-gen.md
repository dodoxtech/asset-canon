---
description: Generate image assets from a brief via the Codex imagegen pipeline, then optimize and write them
argument-hint: "[brief slug or inline request]"
allowed-tools: Bash(node scripts/*), Read, Write, Glob
---

You are running the **/asset-gen** command from the asset-canon plugin.

Load the `asset-canon` skill and run its full pipeline: PLAN → GENERATE → POST-PROCESS → WRITE → REPORT.

Input: $ARGUMENTS

Steps:
1. If the argument matches a file in `assets/briefs/`, load that brief. Otherwise build a quick plan inline (and offer to save it as a brief).
2. For each asset, build the art-directed prompt using the routed specialist skill's template.
3. Generate at the largest target size via:
   `node scripts/codex-imagegen.mjs --prompt "..." --size WxH --background transparent --out <path>`
   Loop over the asset list; announce progress (Asset N of M).
4. Optimize: `node scripts/optimize-assets.mjs --in <dir> --sizes ... --formats webp,png --strip`
5. Write files with deterministic names `<slug>-<variant>-<WxH>.<ext>` and print the report table + import snippet.

Respect the hard rules: one palette per batch, transparent where required, no upscaling, no AI slop.
