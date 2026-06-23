#!/usr/bin/env node
/**
 * optimize-assets.mjs — post-process stage for asset-canon.
 *
 * Resizes each source image into a size ladder, exports requested formats,
 * and strips metadata. Uses `sharp` if installed; otherwise prints the plan
 * and exits non-zero so the caller knows to `npm install`.
 *
 * Usage:
 *   node scripts/optimize-assets.mjs --in assets/generated/icons \
 *     --sizes 512,256,128,64 --formats webp,png --strip
 */

import { readdir, mkdir } from "node:fs/promises";
import { join, extname, basename } from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--strip") { args.strip = true; continue; }
    if (a?.startsWith("--")) { args[a.slice(2)] = argv[++i]; }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const inDir = args.in;
const sizes = (args.sizes || "512,256,128").split(",").map(Number);
const formats = (args.formats || "webp,png").split(",");

if (!inDir) {
  console.error("Required: --in <dir>. Optional: --sizes 512,256 --formats webp,png --strip");
  process.exit(1);
}

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("sharp not installed. Run: npm install");
  console.error(`Plan: ${inDir} -> sizes [${sizes}] x formats [${formats}]${args.strip ? " (strip)" : ""}`);
  process.exit(2);
}

const SRC = /\.(png|jpe?g|webp)$/i;
const files = (await readdir(inDir)).filter((f) => SRC.test(f));
const outDir = join(inDir, "optimized");
await mkdir(outDir, { recursive: true });

for (const file of files) {
  const slug = basename(file, extname(file)).replace(/-\d+x\d+$/, "");
  for (const size of sizes) {
    for (const fmt of formats) {
      const pipeline = sharp(join(inDir, file)).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
      const outName = `${slug}-${size}x${size}.${fmt}`;
      await pipeline.toFormat(fmt, { quality: 90 }).toFile(join(outDir, outName));
      console.log(`✓ ${outName}`);
    }
  }
}

console.log(`Done. ${files.length} source(s) -> ${outDir}`);
