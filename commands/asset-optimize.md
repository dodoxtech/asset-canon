---
description: Post-process existing images — resize ladder, webp/png/ico export, strip metadata, sprite packing
argument-hint: "[dir or glob] [--sizes 512,256 --formats webp,png]"
allowed-tools: Bash(node scripts/*), Read, Glob
---

You are running the **/asset-optimize** command from the asset-canon plugin.

Load the `asset-canon` skill (POST-PROCESS stage). Optimize existing images without regenerating them.

Input: $ARGUMENTS

Steps:
1. Resolve the input dir/glob and the requested sizes + formats (default: 512,256,128 → webp,png).
2. Run `node scripts/optimize-assets.mjs --in <dir> --sizes <list> --formats <list> --strip`.
3. For sprite sets, pack into a grid sheet + emit `atlas.json`.
4. For favicons, emit the .ico ladder + apple-touch + maskable.
5. Report a before/after size table (bytes saved).

Never upscale. Never re-generate — this command only transforms existing files.
