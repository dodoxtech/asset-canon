#!/usr/bin/env node
/**
 * codex-imagegen.mjs — generation executor for asset-canon.
 *
 * Calls an image model to render one asset and write it to disk.
 * Two backends are supported:
 *   1. Codex CLI    (default if `codex` is on PATH) — drives codex to call its image tool.
 *   2. OpenAI image API (gpt-image-1) — direct, used when OPENAI_API_KEY is set.
 *
 * Usage:
 *   node scripts/codex-imagegen.mjs \
 *     --prompt "minimal line icon of a cart..." \
 *     --size 1024x1024 \
 *     --background transparent \
 *     --out assets/generated/icons/cart-icon-line-1024x1024.png
 */

import { writeFile, mkdir } from "node:fs/promises";
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

const args = parseArgs(process.argv.slice(2));
const { prompt, out } = args;
const size = args.size || "1024x1024";
const background = args.background || "opaque"; // transparent | opaque
const backend = args.backend || (process.env.OPENAI_API_KEY ? "openai" : "codex");

if (!prompt || !out) {
  console.error("Required: --prompt <text> --out <path>. Optional: --size WxH --background transparent --backend openai|codex");
  process.exit(1);
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
