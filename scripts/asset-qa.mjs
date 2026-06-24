#!/usr/bin/env node
/**
 * asset-qa.mjs — automated quality gate for generated assets (Layer 3a).
 *
 * Turns the "CHECKS" sections of the skills into runnable assertions:
 *   - naming       : <slug>-<variant>-<WxH>.<ext>, lowercase kebab-case
 *   - dimensions   : actual pixels match the WxH in the filename (no upscale lie)
 *   - alpha        : has real transparent pixels when --require-alpha
 *   - palette      : unique color count <= --max-colors (slop / off-palette guard)
 *   - plate residue: no opaque pixel still sits within --plate-tol of --plate
 *                    (catches a chroma plate the AI rendered un-flat, e.g. a
 *                    #FF00FF plate that came back as #F00AD9 / #E707D4 and was
 *                    missed by an exact-match key)
 *
 * Uses `sharp` if installed; otherwise checks naming only and warns.
 * Exit code 0 = all pass, 1 = at least one failure (CI-friendly).
 *
 * Usage:
 *   node scripts/asset-qa.mjs --in assets/generated/icons \
 *     --require-alpha --max-colors 8 --plate '#FF00FF' --plate-tol 70
 */

import { readdir } from "node:fs/promises";
import { join, extname, basename } from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--require-alpha") { args.requireAlpha = true; continue; }
    if (a?.startsWith("--")) args[a.slice(2)] = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const inDir = args.in;
const maxColors = args["max-colors"] ? Number(args["max-colors"]) : Infinity;

function parseHex(hex) {
  const h = hex?.replace(/^#/, "");
  if (!h || !/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const plate = parseHex(args.plate);
const plateTol = args["plate-tol"] ? Number(args["plate-tol"]) : 70; // RGB Euclidean distance

if (!inDir) {
  console.error("Required: --in <dir>. Optional: --require-alpha --max-colors N --plate '#RRGGBB' --plate-tol N");
  process.exit(2);
}
if (args.plate && !plate) {
  console.error(`Bad --plate '${args.plate}': expected #RRGGBB`);
  process.exit(2);
}

const IMG = /\.(png|jpe?g|webp)$/i;
const NAMING = /^[a-z0-9]+(?:-[a-z0-9]+)*-(\d+)x(\d+)\.(png|jpe?g|webp|ico|svg)$/;

let sharp = null;
try { sharp = (await import("sharp")).default; }
catch { console.warn("⚠ sharp not installed — running NAMING checks only. Run `npm install` for full QA.\n"); }

function countColors(data, channels) {
  const seen = new Set();
  for (let i = 0; i < data.length; i += channels) {
    // pack rgba into one key; ignore fully transparent pixels for palette count
    const a = channels === 4 ? data[i + 3] : 255;
    if (a === 0) continue;
    seen.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    if (seen.size > maxColors) break; // early exit once over budget
  }
  return seen.size;
}

function hasTransparency(data, channels) {
  if (channels < 4) return false;
  for (let i = 3; i < data.length; i += channels) if (data[i] < 255) return true;
  return false;
}

// Count opaque pixels still within `tol` (RGB Euclidean distance) of the plate
// color — i.e. leftover chroma-plate residue an exact-match key would miss.
function plateResidue(data, channels, [pr, pg, pb], tol) {
  const tol2 = tol * tol;
  let residue = 0;
  for (let i = 0; i < data.length; i += channels) {
    const a = channels === 4 ? data[i + 3] : 255;
    if (a < 200) continue; // only judge near-opaque pixels; edges are handled by spill suppression
    const dr = data[i] - pr, dg = data[i + 1] - pg, db = data[i + 2] - pb;
    if (dr * dr + dg * dg + db * db <= tol2) residue++;
  }
  return residue;
}

const files = (await readdir(inDir)).filter((f) => IMG.test(f));
if (files.length === 0) {
  console.error(`No images in ${inDir}`);
  process.exit(2);
}

let failures = 0;
const rows = [];

for (const file of files) {
  const checks = [];
  const fail = (msg) => { checks.push(`✗ ${msg}`); failures++; };
  const pass = (msg) => checks.push(`✓ ${msg}`);

  // 1. naming
  const m = file.match(NAMING);
  if (!m) fail("naming (expect <slug>-<variant>-WxH.ext)");
  else pass("naming");

  if (sharp) {
    try {
      const img = sharp(join(inDir, file));
      const meta = await img.metadata();

      // 2. dimensions match filename
      if (m) {
        const [wantW, wantH] = [Number(m[1]), Number(m[2])];
        if (meta.width === wantW && meta.height === wantH) pass(`dims ${wantW}x${wantH}`);
        else fail(`dims: file says ${wantW}x${wantH} but actual ${meta.width}x${meta.height}`);
      }

      const needsPixels = args.requireAlpha || maxColors !== Infinity || plate;
      if (needsPixels) {
        const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

        // 3. alpha
        if (args.requireAlpha) {
          hasTransparency(data, info.channels)
            ? pass("transparent")
            : fail("alpha: no transparent pixels (background not cut out)");
        }

        // 4. palette
        if (maxColors !== Infinity) {
          const n = countColors(data, info.channels);
          n <= maxColors
            ? pass(`colors ${n}<=${maxColors}`)
            : fail(`palette: ${n > maxColors ? ">" + maxColors : n} colors (over budget ${maxColors})`);
        }

        // 5. plate residue (un-flat chroma plate the key left behind)
        if (plate) {
          const residue = plateResidue(data, info.channels, plate, plateTol);
          residue === 0
            ? pass(`no plate residue (±${plateTol})`)
            : fail(`plate residue: ${residue} opaque px within ±${plateTol} of #${args.plate.replace(/^#/, "")} (re-key with wider tolerance)`);
        }
      }
    } catch (e) {
      fail(`unreadable: ${e.message}`);
    }
  }

  rows.push({ file, checks });
}

// report
console.log(`ASSET QA — ${inDir}\n`);
for (const { file, checks } of rows) {
  console.log(`  ${file}`);
  for (const c of checks) console.log(`      ${c}`);
}
console.log(`\n${failures === 0 ? "✓ ALL PASS" : `✗ ${failures} FAILURE(S)`} across ${files.length} asset(s)`);
process.exit(failures === 0 ? 0 : 1);
