#!/usr/bin/env node
/**
 * codex-imagegen.mjs — generation executor for asset-canon.
 *
 * Calls an image model to render one asset and write it to disk.
 * Two backends are supported:
 *   1. Codex CLI    (default if `codex` is on PATH) — drives codex to call its image tool.
 *   2. OpenAI image API (gpt-image-1) — direct, used when OPENAI_API_KEY is set.
 *
 * To keep a whole batch visually consistent, pass --style-profile: it appends
 * the profile's `prompt_suffix` and an "Avoid: <negative>" guard to every prompt,
 * and locks `seed` on backends that support it (the Codex executor; gpt-image-1
 * has no seed parameter, so seed is skipped there). See docs/style-profile.yaml.
 *
 * Usage:
 *   node scripts/codex-imagegen.mjs \
 *     --prompt "minimal line icon of a cart..." \
 *     --size 1024x1024 \
 *     --background transparent \
 *     --style-profile docs/style-profile.yaml \
 *     --out assets/generated/icons/cart-icon-line-1024x1024.png
 */

import { writeFile, mkdir } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { spawn } from "node:child_process";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    if (key) args[key] = argv[i + 1];
  }
  return args;
}

// Read the shared style context (minimal YAML-subset parse — no deps).
// Returns { prompt_suffix, negative[], seed } or {} when no profile.
function readStyleProfile(path) {
  if (!path) return {};
  if (!existsSync(path)) {
    console.error(`✗ style profile not found: ${path}`);
    process.exit(1);
  }
  const text = readFileSync(path, "utf8");
  // strip a trailing "  # comment" (won't eat "#hex"), then surrounding quotes.
  const clean = (s) => s.replace(/\s+#.*$/, "").trim().replace(/^["']|["']$/g, "");
  const scalar = (key) => {
    const m = text.match(new RegExp(`^${key}:[ \\t]*(.+?)[ \\t]*$`, "m"));
    if (!m) return undefined;
    const v = clean(m[1]);
    return v === "" ? undefined : v;
  };
  const list = (key) => {
    const inline = text.match(new RegExp(`^${key}:[ \\t]*\\[(.*)\\][ \\t]*(#.*)?$`, "m"));
    if (inline) return inline[1].split(",").map((s) => clean(s)).filter(Boolean);
    const lines = text.split("\n");
    const idx = lines.findIndex((l) => new RegExp(`^${key}:[ \\t]*(#.*)?$`).test(l));
    if (idx === -1) return [];
    const out = [];
    for (let i = idx + 1; i < lines.length; i++) {
      const m = lines[i].match(/^[ \t]+-[ \t]*(.+?)[ \t]*$/);
      if (!m) { if (lines[i].trim() === "") continue; if (/^\s*#/.test(lines[i])) continue; break; }
      out.push(clean(m[1]));
    }
    return out;
  };
  return { prompt_suffix: scalar("prompt_suffix"), negative: list("negative"), seed: scalar("seed") };
}

const args = parseArgs(process.argv.slice(2));
const out = args.out;
const size = args.size || "1024x1024";
const background = args.background || "opaque"; // transparent | opaque
const backend = args.backend || (process.env.OPENAI_API_KEY ? "openai" : "codex");

const profile = readStyleProfile(args["style-profile"]);
const seed = profile.seed && /^\d+$/.test(profile.seed) ? Number(profile.seed) : undefined;

// Compose the effective prompt: base + shared style suffix + anti-slop guard.
let prompt = args.prompt;
if (prompt && profile.prompt_suffix) prompt += `, ${profile.prompt_suffix}`;
if (prompt && profile.negative?.length) prompt += `. Avoid: ${profile.negative.join("; ")}.`;

if (!args.prompt || !out) {
  console.error("Required: --prompt <text> --out <path>. Optional: --size WxH --background transparent --backend openai|codex --style-profile <path>");
  process.exit(1);
}

if (args["style-profile"]) {
  console.log(`• style-profile applied: ${args["style-profile"]}${seed !== undefined ? ` (seed ${seed})` : ""}`);
  console.log(`• effective prompt: ${prompt}`);
}

async function viaOpenAI() {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.IMAGE_MODEL || "gpt-image-1",
      prompt,
      size,
      background: background === "transparent" ? "transparent" : "opaque",
      n: 1,
    }),
  });
  if (!res.ok) throw new Error(`Image API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned");
  return Buffer.from(b64, "base64");
}

function viaCodex() {
  // Delegate to the Codex CLI as the executor. Codex receives a structured
  // instruction to generate the image and write the PNG to `out`.
  return new Promise((resolve, reject) => {
    const instruction =
      `Generate an image and save it to "${out}".\n` +
      `Prompt: ${prompt}\nSize: ${size}\nBackground: ${background}\n` +
      (seed !== undefined ? `Seed: ${seed} (use for reproducibility if the image tool supports it)\n` : "") +
      `Return only after the file exists.`;
    const child = spawn("codex", ["exec", instruction], { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve(null) : reject(new Error(`codex exited ${code}`))
    );
  });
}

async function main() {
  await mkdir(dirname(out), { recursive: true });
  if (backend === "openai") {
    const buf = await viaOpenAI();
    await writeFile(out, buf);
    console.log(`✓ wrote ${out} (${size}, ${background}, openai)`);
  } else {
    await viaCodex(); // codex writes the file itself
    console.log(`✓ codex generated ${out} (${size}, ${background})`);
  }
}

main().catch((err) => {
  console.error("✗ generation failed:", err.message);
  process.exit(1);
});
