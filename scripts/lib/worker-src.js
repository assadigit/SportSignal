// Concatenates every server module (src/*.ts + src/pages/*.ts) into one
// source string for the self-check scripts, transformed to runnable JS:
//   - `export const/var/function X` → plain declarations (grabVar finds `var X =`)
//   - TS optional-param markers (`lang?`) stripped (eval-safe)
// Stable file order; cached.
"use strict";
const fs = require("fs");
const path = require("path");

let cache = null;

function transform(ts) {
  let c = ts;
  // strip import lines (grabbed eval blocks never include them, but keep the
  // concatenated text uniform)
  c = c.replace(/^import\s+[^;]+;\n?/gm, "");
  // export const X = ... → var X = ...  (grabVar compatibility)
  c = c.replace(/^export const\s+/gm, "var ");
  c = c.replace(/^export let\s+/gm, "var ");
  c = c.replace(/^export var\s+/gm, "var ");
  // export function / export async function → plain
  c = c.replace(/^export (async )?function\s+/gm, "$1function ");
  c = c.replace(/^export default\s+/gm, "");
  // TS optional params: `name?` before `,` or `)` (never valid otherwise)
  c = c.replace(/(\w)\?([,)])/g, "$1$2");
  // TS type annotations added by v13.3 (eval-safety): env: Env, : any,
  // Promise<any>, as-any casts, index-signature types.
  c = c.replace(/env: Env/g, "env");
  c = c.replace(/\): Promise<any> \{/g, ") {");
  c = c.replace(/: any\]([)\s,;])/g, "$1");
  c = c.replace(/ as any\]/g, "");
  c = c.replace(/ as any\)/g, ")");
  c = c.replace(/: any\)/g, ")");
  c = c.replace(/: any =/g, " =");
  c = c.replace(/: any\]/g, "");
  c = c.replace(/: Record<string, any> =/g, " =");
  c = c.replace(/\(n: any\)/g, "(n)");
  return c;
}

function workerSrc() {
  if (cache) return cache;
  const order = [
    "worker.ts", "config.ts", "utils.ts", "fa-dict.ts", "translate.ts", "fa-ai.ts",
    "matches.ts", "providers.ts", "telegram.ts", "composers.ts", "digest.ts", "x.ts",
    "notifications.ts", "users.ts", "admin.ts", "public-matches.ts", "bot.ts", "cron.ts",
    "api.ts",
  ];
  const parts = [];
  for (const f of order) {
    const p = path.join(__dirname, "..", "..", "src", f);
    if (fs.existsSync(p)) parts.push(`// ===== src/${f} =====\n` + transform(fs.readFileSync(p, "utf8")));
  }
  const pagesDir = path.join(__dirname, "..", "..", "src", "pages");
  if (fs.existsSync(pagesDir)) {
    for (const f of fs.readdirSync(pagesDir).filter((x) => x.endsWith(".ts")).sort()) {
      parts.push(`// ===== src/pages/${f} =====\n` + fs.readFileSync(path.join(pagesDir, f), "utf8"));
    }
  }
  cache = parts.join("\n");
  return cache;
}

module.exports = workerSrc;
module.exports.workerSrc = workerSrc;
