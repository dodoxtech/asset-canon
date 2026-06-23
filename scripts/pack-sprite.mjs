#!/usr/bin/env node
/**
 * pack-sprite.mjs — pack animation frames into a sprite sheet + atlas.
 *
 * Implements the FRAME GRID STANDARD in skills/asset-sprite/SKILL.md: takes a
 * folder of equally-sized frame PNGs (in name order), lays them out row-major on
 * a uniform grid, and writes:
 *   - the packed sheet  <name>-<W>x<H>.png   (transparent, needs `sharp`)
 *   - an atlas data file in one or more formats so any engine can cut the sheet
 *     by pixel coordinates without opening the image.
 *
 * Atlas formats (--formats, comma-separated, default "json"):
 *   json          native asset-canon schema (meta + frames{x,y,w,h} + playback contract)
 *   xml           TexturePacker/Starling generic XML (<TextureAtlas><SubTexture .../></>)
 *   texturepacker TexturePacker "JSON (Hash)" — frame/rotated/trimmed/sourceSize;
 *                 the format Phaser, PixiJS, and many Godot/Unity importers read.
 *
 * If `sharp` is not installed, the image is skipped (warned) but every atlas
 * format is still emitted from the grid math — so the data side never blocks.
 *
 * Usage:
 *   node scripts/pack-sprite.mjs --in assets/generated/sprites/hero_run \
 *     --name hero_run --columns 8 --fps 12 --formats json,xml,texturepacker
 *   # --cell 64x64 required only when sharp is absent (can't measure frames)
 *   # --gutter 0  --no-loop  --clips run:0-7,jump:8-11  --out <dir>
 */

import { readdir, mkdir, writeFile } from "node:fs/promises";
import { resolve, join, basename, extname } from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-loop") { args.loop = false; continue; }
    if (a?.startsWith("--")) args[a.slice(2)] = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const inDir = args.in;
if (!inDir) {
  console.error("Required: --in <frame-dir>. Optional: --name --columns --cell WxH --gutter --fps --no-loop --formats json,xml,texturepacker --clips run:0-7 --out");
  process.exit(2);
}

const root = resolve(".");
const absIn = resolve(root, inDir);
const outDir = resolve(root, args.out || inDir);
const name = args.name || basename(absIn);
const gutter = args.gutter !== undefined ? Number(args.gutter) : 0;
const fps = args.fps !== undefined ? Number(args.fps) : 12;
const loop = args.loop !== false;
const formats = (args.formats || "json").split(",").map((s) => s.trim()).filter(Boolean);

const VALID = ["json", "xml", "texturepacker"];
for (const f of formats) if (!VALID.includes(f)) { console.error(`Unknown format "${f}". Valid: ${VALID.join(", ")}`); process.exit(2); }

const FRAME = /\.(png|webp)$/i;
const frameFiles = (await readdir(absIn)).filter((f) => FRAME.test(f)).sort();
if (frameFiles.length === 0) { console.error(`No frame images (.png/.webp) in ${inDir}`); process.exit(2); }
const count = frameFiles.length;

let sharp = null;
try { sharp = (await import("sharp")).default; } catch { /* data-only mode */ }

// --- cell size: measure first frame with sharp, else require --cell ----------
let cellW, cellH;
if (args.cell) {
  const m = args.cell.match(/^(\d+)x(\d+)$/);
  if (!m) { console.error(`--cell must be WxH (e.g. 64x64)`); process.exit(2); }
  [cellW, cellH] = [Number(m[1]), Number(m[2])];
} else if (sharp) {
  const meta = await sharp(join(absIn, frameFiles[0])).metadata();
  [cellW, cellH] = [meta.width, meta.height];
} else {
  console.error("sharp not installed and no --cell given — cannot determine frame size. Pass --cell WxH or run `npm install`.");
  process.exit(2);
}

// --- grid math (matches the FRAME GRID STANDARD reader math) ------------------
const columns = args.columns ? Number(args.columns) : count;
const rows = Math.ceil(count / columns);
const stepX = cellW + gutter;
const stepY = cellH + gutter;
const sheetW = columns * stepX;
const sheetH = rows * stepY;

const frames = frameFiles.map((file, i) => ({
  key: basename(file, extname(file)),
  file,
  x: (i % columns) * stepX,
  y: Math.floor(i / columns) * stepY,
  w: cellW,
  h: cellH,
}));

const sheetName = `${name}-${sheetW}x${sheetH}.png`;

// --- verify uniform frame sizes (catches mismatched frames before packing) ---
if (sharp) {
  for (const fr of frames) {
    const m = await sharp(join(absIn, fr.file)).metadata();
    if (m.width !== cellW || m.height !== cellH) {
      console.error(`✗ frame ${fr.file} is ${m.width}x${m.height}, expected uniform ${cellW}x${cellH}`);
      process.exit(1);
    }
  }
}

await mkdir(outDir, { recursive: true });

// --- compose the sheet image (sharp only) ------------------------------------
if (sharp) {
  const composites = frames.map((fr) => ({ input: join(absIn, fr.file), left: fr.x, top: fr.y }));
  await sharp({ create: { width: sheetW, height: sheetH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(composites)
    .png()
    .toFile(join(outDir, sheetName));
  console.log(`✓ sheet ${sheetName} (${count} frames, ${columns}x${rows} grid)`);
} else {
  console.warn(`⚠ sharp not installed — skipped packing ${sheetName}; emitting atlas data only.`);
}

// --- clips: "run:0-7,jump:8-11" -> { run:[0,7], jump:[8,11] } -----------------
function parseClips(s) {
  if (!s) return null;
  const out = {};
  for (const part of s.split(",")) {
    const m = part.trim().match(/^([\w-]+):(\d+)-(\d+)$/);
    if (!m) { console.error(`Bad --clips entry "${part}" (want name:start-end)`); process.exit(2); }
    out[m[1]] = [Number(m[2]), Number(m[3])];
  }
  return out;
}
const clips = parseClips(args.clips);

// --- emitters ----------------------------------------------------------------
function emitJson() {
  const atlas = {
    meta: {
      image: sheetName,
      sheet: { w: sheetW, h: sheetH },
      cell: { w: cellW, h: cellH },
      gutter,
      columns,
      count,
      fps,
      loop,
      anchor: [0.5, 1.0],
      ...(clips ? { clips } : {}),
    },
    frames: Object.fromEntries(frames.map((f) => [f.key, { x: f.x, y: f.y, w: f.w, h: f.h }])),
  };
  return { ext: "json", body: JSON.stringify(atlas, null, 2) + "\n" };
}

function xmlEscape(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function emitXml() {
  const lines = [`<?xml version="1.0" encoding="UTF-8"?>`, `<TextureAtlas imagePath="${xmlEscape(sheetName)}">`];
  for (const f of frames) lines.push(`  <SubTexture name="${xmlEscape(f.key)}" x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}"/>`);
  lines.push(`</TextureAtlas>`);
  return { ext: "xml", body: lines.join("\n") + "\n" };
}

function emitTexturePacker() {
  const tp = {
    frames: Object.fromEntries(frames.map((f) => [f.file, {
      frame: { x: f.x, y: f.y, w: f.w, h: f.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: f.w, h: f.h },
      sourceSize: { w: f.w, h: f.h },
    }])),
    meta: {
      app: "asset-canon/pack-sprite.mjs",
      image: sheetName,
      format: "RGBA8888",
      size: { w: sheetW, h: sheetH },
      scale: "1",
    },
  };
  return { ext: "tp.json", body: JSON.stringify(tp, null, 2) + "\n" };
}

const emitters = { json: emitJson, xml: emitXml, texturepacker: emitTexturePacker };
for (const fmt of formats) {
  const { ext, body } = emitters[fmt]();
  const outName = `${name}.${ext}`;
  await writeFile(join(outDir, outName), body, "utf8");
  console.log(`✓ atlas ${outName} (${fmt})`);
}

console.log(`Done. ${count} frame(s) -> ${outDir}`);
