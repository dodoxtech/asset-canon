#!/usr/bin/env node
/**
 * write-descriptor.mjs — emit a sidecar asset descriptor (Layer 3b).
 *
 * Turns the "ASSET DESCRIPTOR" contract in skills/asset-canon/SKILL.md into a
 * real file: docs/assets/<id>.yaml. Another agent reads that YAML and knows
 * what the asset depicts, how it looks, and where it belongs — WITHOUT ever
 * opening the image.
 *
 * You author the descriptive content (description, placement, style, …) once
 * as a small JSON spec; this script enriches it with the facts it can measure
 * (each variant's real bytes + pixel dimensions + format) and the generated
 * date, then writes valid YAML. No third-party deps; uses `sharp` for exact
 * dimensions when installed, otherwise falls back to the WxH in the filename.
 *
 * Spec JSON (minimum):
 *   {
 *     "id": "cart",
 *     "type": "icon",
 *     "subject": "shopping cart",
 *     "description": "A minimal line-art shopping cart …",
 *     "keywords": ["cart", "checkout"],
 *     "placement": { "intended_use": "primary add-to-cart button", "context": "header" },
 *     "style": { "art_style": "flat line", "stroke": "2px @ 24px grid", "shading": "none" },
 *     "palette": ["#1A1A1A"],
 *     "background": "transparent",
 *     "accessibility": { "alt_text": "Shopping cart icon" },
 *     "files": ["assets/generated/icons/cart-icon-line-512x512.png",
 *               "assets/generated/icons/cart-icon-line-512x512.webp"],
 *     "source": { "model": "codex-imagegen (openai images)", "prompt": "Minimal flat line icon …" }
 *   }
 *
 * Usage:
 *   node scripts/write-descriptor.mjs --spec cart.spec.json
 *   node scripts/write-descriptor.mjs --spec cart.spec.json --out-dir docs/assets --root .
 */

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { statSync, existsSync } from "node:fs";
import { resolve, join, extname } from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a?.startsWith("--")) args[a.slice(2)] = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.spec) {
  console.error("Required: --spec <descriptor.json>. Optional: --out-dir docs/assets --root .");
  process.exit(2);
}

const root = resolve(args.root || ".");
const outDir = resolve(root, args["out-dir"] || "docs/assets");

let spec;
try {
  spec = JSON.parse(await readFile(resolve(args.spec), "utf8"));
} catch (e) {
  console.error(`Cannot read spec ${args.spec}: ${e.message}`);
  process.exit(2);
}

// --- required descriptive fields (the part a human/agent must author) ---
const missing = [];
if (!spec.id) missing.push("id");
if (!spec.type) missing.push("type");
if (!spec.subject) missing.push("subject");
if (!spec.description) missing.push("description");
if (!spec.placement?.intended_use) missing.push("placement.intended_use");
if (!Array.isArray(spec.files) || spec.files.length === 0) missing.push("files[]");
if (missing.length) {
  console.error(`Spec missing required field(s): ${missing.join(", ")}`);
  process.exit(2);
}

const TYPES = ["icon", "illustration", "sprite", "texture", "social"];
if (!TYPES.includes(spec.type)) {
  console.error(`type must be one of ${TYPES.join(" | ")} (got "${spec.type}")`);
  process.exit(2);
}

let sharp = null;
try { sharp = (await import("sharp")).default; } catch { /* fall back to filename */ }

function dimsFromName(p) {
  const m = p.match(/(\d+)x(\d+)\.[a-z0-9]+$/i);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : null;
}

async function describeFile(entry) {
  const rel = typeof entry === "string" ? entry : entry.path;
  const abs = resolve(root, rel);
  if (!existsSync(abs)) {
    console.error(`✗ file listed in spec does not exist: ${rel}`);
    process.exit(1);
  }
  const bytes = statSync(abs).size;
  let dims = null;
  if (sharp) {
    try { const m = await sharp(abs).metadata(); dims = { w: m.width, h: m.height }; }
    catch { /* ignore, fall through */ }
  }
  if (!dims) dims = dimsFromName(rel);
  if (!dims) {
    console.error(`✗ cannot determine dimensions for ${rel} (no sharp, no WxH in name)`);
    process.exit(1);
  }
  return { path: rel, size: `${dims.w}x${dims.h}`, format: extname(rel).slice(1).toLowerCase(), bytes };
}

const files = [];
for (const f of spec.files) files.push(await describeFile(f));

// largest variant → master dimensions
const largest = files.reduce((a, b) => {
  const [aw, ah] = a.size.split("x").map(Number);
  const [bw, bh] = b.size.split("x").map(Number);
  return bw * bh > aw * ah ? b : a;
});
function gcd(a, b) { return b ? gcd(b, a % b) : a; }
const [mw, mh] = largest.size.split("x").map(Number);
const g = gcd(mw, mh) || 1;

// --- assemble the descriptor in canonical key order ---
const today = new Date().toISOString().slice(0, 10);
const descriptor = {
  id: spec.id,
  type: spec.type,
  subject: spec.subject,
  description: spec.description,
  keywords: spec.keywords || [],
  placement: spec.placement,
  style: spec.style || {},
  palette: spec.palette || [],
  background: spec.background || "transparent",
  dimensions: spec.dimensions || { master: largest.size, aspect: `${mw / g}:${mh / g}` },
  safe_area: spec.safe_area || "full",
  accessibility: spec.accessibility || { alt_text: spec.subject },
  ...(spec.animation ? { animation: spec.animation } : {}),
  ...(spec.composition ? { composition: spec.composition } : {}),
  ...(spec.tileable !== undefined ? { tileable: spec.tileable } : {}),
  ...(spec.tile_size ? { tile_size: spec.tile_size } : {}),
  ...(spec.platform ? { platform: spec.platform } : {}),
  ...(spec.text_overlay ? { text_overlay: spec.text_overlay } : {}),
  files,
  source: { ...(spec.source || {}), generated: spec.source?.generated || today },
};

// --- tiny YAML emitter (subset: maps, scalar arrays, arrays of flat maps) ---
function needsQuote(s) {
  if (s === "") return true;
  if (/^\s|\s$/.test(s)) return true;
  if (/[:#[\]{}&*!|>'"%@`,]/.test(s)) return true;
  if (/^(true|false|null|yes|no|~|-?\d|\.)/i.test(s)) return true;
  return false;
}
function fmtScalar(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const s = String(v);
  return needsQuote(s) ? JSON.stringify(s) : s;
}
const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);

function emit(node, pad, lines) {
  const sp = " ".repeat(pad);
  for (const [k, v] of Object.entries(node)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) { lines.push(`${sp}${k}: []`); continue; }
      if (v.every((x) => !isMap(x) && !Array.isArray(x))) {
        lines.push(`${sp}${k}: [${v.map(fmtScalar).join(", ")}]`);
      } else {
        lines.push(`${sp}${k}:`);
        for (const item of v) {
          const entries = Object.entries(item).filter(([, vv]) => vv !== undefined);
          entries.forEach(([ik, iv], idx) => {
            const prefix = idx === 0 ? `${sp}  - ` : `${sp}    `;
            lines.push(`${prefix}${ik}: ${fmtScalar(iv)}`);
          });
        }
      }
    } else if (isMap(v)) {
      lines.push(`${sp}${k}:`);
      emit(v, pad + 2, lines);
    } else if (typeof v === "string" && v.includes("\n")) {
      lines.push(`${sp}${k}: |-`);
      for (const ln of v.split("\n")) lines.push(`${sp}  ${ln}`);
    } else {
      lines.push(`${sp}${k}: ${fmtScalar(v)}`);
    }
  }
}

const lines = [`# docs/assets/${descriptor.id}.yaml — generated by write-descriptor.mjs`];
emit(descriptor, 0, lines);
const yaml = lines.join("\n") + "\n";

await mkdir(outDir, { recursive: true });
const outPath = join(outDir, `${descriptor.id}.yaml`);
await writeFile(outPath, yaml, "utf8");
console.log(`✓ wrote ${outPath} (${files.length} variant${files.length === 1 ? "" : "s"})`);
