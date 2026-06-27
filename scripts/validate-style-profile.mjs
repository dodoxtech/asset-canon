#!/usr/bin/env node
/**
 * validate-style-profile.mjs — sanity-check the shared style profile.
 *
 * The style profile (docs/assets/style/style-profile.yaml/<id>.yaml) is the shared style context every
 * generation reads. A broken profile silently de-consistifies a whole batch, so
 * gate it: required fields present, palette entries are real hex, seed numeric,
 * negative is a list. Lightweight structural parse — no third-party deps.
 *
 * Exit 0 = pass, 1 = failure (CI-friendly).
 *
 * Usage:
 *   node scripts/validate-style-profile.mjs --in docs/assets/style/style-profile.yaml/<id>.yaml
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a?.startsWith("--")) args[a.slice(2)] = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const file = resolve(args.in || "docs/assets/style/style-profile.yaml/<id>.yaml");
if (!existsSync(file)) {
  console.error(`No style profile at ${file}. See the STYLE PROFILE section of the asset-canon skill for the shape to write.`);
  process.exit(1);
}

const text = await readFile(file, "utf8");

// --- minimal YAML-subset readers (top-level scalar + top-level list) ---------
// strip a trailing "  # comment" (whitespace before #, so it won't eat "#hex"),
// then surrounding quotes.
const clean = (s) => s.replace(/\s+#.*$/, "").trim().replace(/^["']|["']$/g, "");
function getScalar(key) {
  const m = text.match(new RegExp(`^${key}:[ \\t]*(.+?)[ \\t]*$`, "m"));
  if (!m) return undefined;
  const v = clean(m[1]);
  return v === "" ? undefined : v;
}
function getList(key) {
  // inline:  key: [a, b]   (optional trailing comment)
  const inline = text.match(new RegExp(`^${key}:[ \\t]*\\[(.*)\\][ \\t]*(#.*)?$`, "m"));
  if (inline) {
    return inline[1].split(",").map((s) => clean(s)).filter(Boolean);
  }
  // block:   key:   # comment\n  - a\n  - b
  const lines = text.split("\n");
  const idx = lines.findIndex((l) => new RegExp(`^${key}:[ \\t]*(#.*)?$`).test(l));
  if (idx === -1) return undefined;
  const out = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const m = lines[i].match(/^[ \t]+-[ \t]*(.+?)[ \t]*$/);
    if (!m) { if (lines[i].trim() === "") continue; if (/^\s*#/.test(lines[i])) continue; break; }
    out.push(clean(m[1]));
  }
  return out;
}

let failures = 0, warnings = 0;
const fail = (m) => { console.log(`  ✗ ${m}`); failures++; };
const warn = (m) => { console.log(`  ⚠ ${m}`); warnings++; };
const ok = (m) => console.log(`  ✓ ${m}`);

console.log(`STYLE PROFILE — ${file}\n`);

// required: id
getScalar("id") ? ok("id") : fail('missing required "id:"');

// required: palette (>=1 valid hex)
const palette = getList("palette");
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
if (!palette || palette.length === 0) {
  fail('missing required "palette:" (need >=1 hex color)');
} else {
  const bad = palette.filter((c) => !HEX.test(c));
  bad.length ? fail(`palette has invalid hex: ${bad.join(", ")}`) : ok(`palette (${palette.length} color${palette.length === 1 ? "" : "s"})`);
}

// required: prompt_suffix
getScalar("prompt_suffix") ? ok("prompt_suffix") : fail('missing required "prompt_suffix:" (positive style anchor)');

// optional but recommended
getScalar("shading") ? ok("shading") : warn('no "shading:" — recommended for consistency');
getScalar("line") || /^line:/m.test(text) ? ok("line") : warn('no "line:" — recommended');

// negative: if present must be a list
if (/^negative:/m.test(text)) {
  const neg = getList("negative");
  neg && neg.length ? ok(`negative (${neg.length} guard${neg.length === 1 ? "" : "s"})`) : fail('"negative:" present but lists no items');
} else {
  warn('no "negative:" — recommended as an anti-slop guard');
}

// seed: if present must be numeric
const seed = getScalar("seed");
if (seed !== undefined) {
  /^\d+$/.test(seed) ? ok(`seed ${seed}`) : fail(`seed must be an integer (got "${seed}")`);
}

console.log(`\n${failures === 0 ? "✓ PASS" : `✗ ${failures} FAILURE(S)`}${warnings ? ` (${warnings} warning${warnings === 1 ? "" : "s"})` : ""}`);
process.exit(failures === 0 ? 0 : 1);
