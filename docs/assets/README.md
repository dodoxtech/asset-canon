# Asset descriptors

One YAML file per generated asset (`<id>.yaml`). Each descriptor lets another
agent place an asset correctly **without opening the image** — it spells out
what the asset depicts, how it looks, and where it belongs.

This is enforced: see HARD RULE #8 and the **ASSET DESCRIPTOR** schema in
[`skills/asset-canon/SKILL.md`](../../skills/asset-canon/SKILL.md).

## Produce a descriptor

Author the descriptive content as a small JSON spec, then let the writer fill in
the measurable facts (real bytes, pixel dimensions, format, date):

```bash
node scripts/write-descriptor.mjs --spec cart.spec.json
# -> docs/assets/cart.yaml
```

Required spec fields: `id`, `type` (icon|illustration|sprite|texture|social),
`subject`, `description`, `placement.intended_use`, and a non-empty `files[]`
list of paths that exist on disk. Type-specific blocks (`animation` for sprites,
`composition` for illustrations, `tileable`/`tile_size` for textures,
`platform`/`text_overlay` for social) are passed through when present.

## Validate the gate

```bash
node scripts/validate-descriptors.mjs --in assets/generated/icons,assets/generated/sprites
```

Fails (exit 1) if a descriptor is missing a required field, points at a file
that doesn't exist, or if any image on disk has no descriptor referencing it.
Run it in CI alongside `asset-qa.mjs`.
