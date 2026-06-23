#!/usr/bin/env node
/**
 * validate-descriptors.mjs — descriptor gate for asset-canon (Layer 3b).
 *
 * Enforces HARD RULE #8: every generated asset must ship with a valid sidecar
 * descriptor in docs/assets/. Runs two-way integrity, dependency-free:
 *
 *   1. Each docs/assets/*.yaml has the required fields and every path it lists
 *      under `files:` actually exists on disk (no descriptor pointing at ghosts).
 *   2. Every image in the scanned asset dir(s) is referenced by some descriptor
 *      (no "orphan" asset that an agent would find without any description).
 *
 * This is a lightweight STRUCTURAL check (line scan), not a full YAML parse —
 * matching the repo's zero-dependency stance. It pairs with write-descriptor.mjs,
 * which produces canonical, parseable files.
 *
 * Exit 0 = all pass, 1 = at least one failure (CI-friendly).
 *
 * Usage:
 *   node scripts/validate-descriptors.mjs --in assets/generated/icons
 *   node scripts/validate-descriptors.mjs --in assets/generated/icons,assets/generated/sprites \
 *     --docs docs/assets --root .
 */

import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, basename } from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a?.startsWith("--")) args[a.slice(2)] = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const root = resolve(args.root || ".");
const docsDir = resolve(root, args.docs || "docs/assets");
const inDirs = (args.in || "").split(",").map((d) => d.trim()).filter(Boolean);

const IMG = /\.(png|jpe?g|webp|ico)$/i;
// fields the descriptor MUST carry for an agent to place the asset blind.
const REQUIRED_TOP = ["id", "type", "subject", "description", "placement", "palette", "background", "files", "source"];
const REQUIRED_NESTED = ["intended_use", "alt_text", "model"]; // placement / accessibility / source

let failures = 0;
const fail = (m) => { console.log(`  ✗ ${m}`); failures++; };
const ok = (m) => console.log(`  ✓ ${m}`);

if (!existsSync(docsDir)) {
  console.error(`No descriptor directory at ${docsDir}. Generate descriptors with write-descriptor.mjs.`);
  process.exit(1);
}

// --- 1. validate each descriptor + collect referenced file paths -------------
const yamlFiles = (await readdir(docsDir)).filter((f) => /\.ya?ml$/i.test(f));
if (yamlFiles.length === 0) {
  console.error(`No *.yaml descriptors in ${docsDir}.`);
  process.exit(1);
}

const referenced = new Set();

console.log(`DESCRIPTOR QA — ${docsDir}\n`);
for (const yf of yamlFiles) {
  console.log(`  ${yf}`);
  const text = await readFile(join(docsDir, yf), "utf8");
  const lines = text.split("\n");

  for (const key of REQUIRED_TOP) {
    if (lines.some((l) => new RegExp(`^${key}:`).test(l))) ok(`has ${key}`);
    else fail(`${yf}: missing top-level "${key}:"`);
  }
  for (const key of REQUIRED_NESTED) {
    if (new RegExp(`(^|\\s)${key}:`, "m").test(text)) ok(`has ${key}`);
    else fail(`${yf}: missing "${key}:"`);
  }

  // collect every `path:` under files: and verify it exists on disk
  const paths = [];
  for (const l of lines) {
    const m = l.match(/^\s*-?\s*path:\s*(.+?)\s*$/);
    if (m) paths.push(m[1].replace(/^["']|["']$/g, ""));
  }
  if (paths.length === 0) fail(`${yf}: files: lists no path entries`);
  for (const p of paths) {
    const abs = resolve(root, p);
    referenced.add(abs);
    if (existsSync(abs)) ok(`file ${p}`);
    else fail(`${yf}: references missing file ${p}`);
  }
  console.log("");
}

// --- 2. ensure no image asset is left without a descriptor -------------------
for (const dir of inDirs) {
  const abs = resolve(root, dir);
  if (!existsSync(abs)) { fail(`asset dir not found: ${dir}`); continue; }
  const entries = (await readdir(abs)).filter((f) => IMG.test(f));
  for (const f of entries) {
    const filePath = resolve(abs, f);
    if (referenced.has(filePath)) ok(`covered: ${dir}/${f}`);
    else fail(`orphan asset (no descriptor references it): ${dir}/${basename(f)}`);
  }
}

console.log(`\n${failures === 0 ? "✓ ALL PASS" : `✗ ${failures} FAILURE(S)`} — ${yamlFiles.length} descriptor(s)`);
process.exit(failures === 0 ? 0 : 1);
