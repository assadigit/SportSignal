#!/usr/bin/env node
// refactor-prune-imports.mjs — remove imports whose symbols are never used in
// real code (comments stripped). Fixes false positives from the wiring pass.
import fs from "node:fs";

function stripComments(code) {
  // naive but sufficient: remove /* */ blocks and // line comments (string
  // literals containing // are rare; template pages are excluded below)
  let c = code.replace(/\/\*[\s\S]*?\*\//g, "");
  c = c.replace(/^[ \t]*\/\/.*$/gm, "");
  // trailing // comments after code (careful: URLs contain //) — only strip
  // when preceded by whitespace and not part of a URL string
  c = c.replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
  return c;
}

const files = fs.readdirSync("src").filter((f) => f.endsWith(".ts")).map((f) => "src/" + f).filter((f) => !f.includes("/pages/") && f !== "src/worker.ts");

for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  const lines = raw.split("\n");
  const importIdx = [];
  lines.forEach((l, i) => { if (/^import\s+\{[^}]*\}\s+from\s+"[^"]+";/.test(l)) importIdx.push(i); });
  if (!importIdx.length) continue;
  const body = stripComments(lines.slice(Math.max(...importIdx) + 1).join("\n"));
  let removed = [];
  const keptImports = [];
  for (const i of importIdx) {
    const m = lines[i].match(/^import\s+\{([^}]*)\}\s+from\s+"([^"]+)";/);
    const names = m[1].split(",").map((s) => s.trim()).filter(Boolean);
    const used = names.filter((n) => new RegExp(`(?<![\\w$.])${n}(?![\\w$])`).test(body));
    if (used.length !== names.length) removed.push(...names.filter((n) => !used.includes(n)));
    if (used.length) keptImports.push(`import { ${used.join(", ")} } from "${m[2]}";`);
  }
  // dedupe same-module imports merged into one
  const byMod = new Map();
  for (const imp of keptImports) {
    const m = imp.match(/^import\s+\{([^}]*)\}\s+from\s+"([^"]+)";/);
    if (!byMod.has(m[2])) byMod.set(m[2], new Set());
    m[1].split(",").map((s) => s.trim()).filter(Boolean).forEach((n) => byMod.get(m[2]).add(n));
  }
  const merged = [...byMod.entries()].map(([p, names]) => `import { ${[...names].join(", ")} } from "${p}";`);
  // rebuild: replace the contiguous import block region
  const first = Math.min(...importIdx), last = Math.max(...importIdx);
  const before = lines.slice(0, first);
  const after = lines.slice(last + 1).filter((l, idx) => !(idx === 0 && l === ""));
  fs.writeFileSync(file, [...before, ...merged, "", ...after].join("\n"));
  if (removed.length) console.log(`${file}: removed [${removed.join(", ")}]`);
}
console.log("prune done");
