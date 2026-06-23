---
description: Scaffold an asset-generation brief and lock the style system before generating
argument-hint: "[asset type + subjects, e.g. 'icons: cart, heart, bell, flat line']"
---

You are running the **/asset-new** command from the asset-canon plugin.

Load the `asset-canon` skill, then turn the user's request into a concrete brief and write it to `assets/briefs/<slug>.brief.md`.

Request: $ARGUMENTS

Steps:
1. Parse the request into: asset type, subjects, style, palette, dimensions, format, count, output dir. Infer sensible defaults from any existing design tokens / CSS in the repo.
2. If a load-bearing value is missing (e.g. palette for a brand asset), ask once — otherwise proceed with defaults and state them.
3. Route to the correct specialist skill (asset-icon / asset-illustration / asset-sprite / asset-texture / asset-social).
4. Write the brief file with the locked style system (palette, stroke/line, canvas, naming scheme) so `/asset-gen` can run deterministically.
5. Print the brief and tell the user to run `/asset-gen <slug>` next.

Do not generate images in this command — only produce the brief.
