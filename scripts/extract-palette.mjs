#!/usr/bin/env node
/**
 * extract-palette.mjs — read the measurable color character out of a reference
 * image, for the `asset-style-extract` skill.
 *
 * This is the "(A) — measured with code" half of style extraction: the things a
 * computer reads exactly so the agent doesn't eyeball them — dominant palette
 * with area weights, plus overall saturation / temperature / contrast. The
 * "(V) — judged" half (medium, hue-shift, shading model, outline) is the agent's
 * job. Output is YAML ready to paste under `palette` / `swatches` / `color` in
 * docs/assets/styles/style-profile-<slug>.yaml.
 *
 * Needs `sharp`. If it's missing, says so and exits non-zero (the skill falls
 * back to low-confidence visual estimates).
 *
 * Usage:
 *   node scripts/extract-palette.mjs --in docs/assets/refs/hero.png --colors 12
 */

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
const file = args.in && resolve(args.in);
const N = args.colors ? Number(args.colors) : 12;

if (!file) {
  console.error("Required: --in <image>. Optional: --colors N (default 12)");
  process.exit(2);
}
if (!existsSync(file)) {
  console.error(`No image at ${file}`);
  process.exit(2);
}

let sharp = null;
try { sharp = (await import("sharp")).default; }
catch {
  console.error("✗ sharp not installed — can't measure the palette. Run `npm install sharp`, then retry.");
  process.exit(1);
}

// Downsample for speed; color character survives a small thumbnail.
const MAX = 200;
const { data, info } = await sharp(file)
  .resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const ch = info.channels; // 4 after ensureAlpha

// --- bucket colors (4 bits/channel = 4096 cells), ignore transparent pixels ---
const buckets = new Map(); // key -> { r,g,b,count }
let opaque = 0;
for (let i = 0; i < data.length; i += ch) {
  if (data[i + 3] < 128) continue; // skip transparent
  opaque++;
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
  const e = buckets.get(key);
  if (e) { e.r += r; e.g += g; e.b += b; e.count++; }
  else buckets.set(key, { r, g, b, count: 1 });
}

if (opaque === 0) { console.error("✗ image is fully transparent — nothing to sample"); process.exit(1); }

// average each bucket to its centroid, rank by frequency, take top N
const centroids = [...buckets.values()]
  .map((e) => ({ r: Math.round(e.r / e.count), g: Math.round(e.g / e.count), b: Math.round(e.b / e.count), count: e.count }))
  .sort((a, b) => b.count - a.count)
  .slice(0, N);

const toHex = (r, g, b) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

// --- overall color character, weighted by pixel share ----------------------
let sumS = 0, sumL = 0, minL = 1, maxL = 0, warm = 0, cool = 0, total = 0;
for (const c of centroids) {
  const [h, s, l] = rgbToHsl(c.r, c.g, c.b);
  sumS += s * c.count; sumL += l * c.count; total += c.count;
  if (l < minL) minL = l; if (l > maxL) maxL = l;
  if (s > 0.12) { (h < 90 || h > 270) ? (warm += c.count) : (cool += c.count); }
}
const avgS = sumS / total, valueRange = maxL - minL;
const saturation = avgS < 0.18 ? "muted" : avgS < 0.45 ? "pastel" : "vivid";
const temperature = warm > cool * 1.3 ? "warm" : cool > warm * 1.3 ? "cool" : "neutral";
const contrast = valueRange > 0.6 ? "high" : valueRange > 0.35 ? "medium" : "low";

// --- emit YAML ------------------------------------------------------------
const lines = [];
lines.push(`# measured from ${args.in} — paste into docs/assets/styles/style-profile-<slug>.yaml`);
lines.push(`# (A) measured here; medium / hue-shift / shading / outline are (V) — judge by eye.`);
lines.push("");
lines.push("palette:");
for (const c of centroids) lines.push(`  - "${toHex(c.r, c.g, c.b)}"`);
lines.push("");
lines.push("swatches:");
for (const c of centroids) {
  const w = (c.count / total).toFixed(2);
  lines.push(`  - { hex: "${toHex(c.r, c.g, c.b)}", role: TODO, weight: ${w} }  # role: bg|subject|accent|line|shadow`);
}
lines.push("");
lines.push("color:");
lines.push(`  saturation: ${saturation}`);
lines.push(`  temperature: ${temperature}`);
lines.push(`  contrast: ${contrast}`);
lines.push(`  harmony: TODO        # complementary | analogous | triadic | monochrome  (V)`);
lines.push(`  hue_shift: TODO      # e.g. "shadows cooler ~20°"  (V)`);

console.log(lines.join("\n"));
