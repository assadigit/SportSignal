// scripts/extract-page-assets.mjs — v13.6 one-shot extraction.
//
// Splits the monolithic PUBLIC_PAGE template into cacheable static assets:
//   assets/core-<V>.js    ← CLIENT_CORE_JS (shared I18N + theme/lang helpers)
//   assets/public-<V>.js  ← the public page app JS (UCL_BALL embedded)
//   assets/public-<V>.css ← the big <style> block
// and rewrites the three page templates to reference them.
//
// Run with bun (native TS imports):  bun scripts/extract-page-assets.mjs
// NOT idempotent — after it runs, src/pages/client-core.ts is deleted and the
// assets become the source of truth (edit them directly; bump the filename
// version when they change).

import fs from "node:fs";
import { PUBLIC_PAGE } from "../src/pages/public.ts";
import { CLIENT_CORE_JS } from "../src/pages/client-core.ts";

const V = "13.6";
const CORE_URL = `/core-${V}.js`;
const APP_URL = `/public-${V}.js`;
const CSS_URL = `/public-${V}.css`;

// ---------- 1. slice the EVALUATED page string (byte-exact served bytes) ----------
const page = PUBLIC_PAGE;
const core = CLIENT_CORE_JS;

// CSS: the big block starts with "<style>\n:root" (the font-face <style> is a
// single line, so this marker is unique to the big one).
const cssOpen = page.indexOf("<style>\n:root");
if (cssOpen < 0) throw new Error("big <style> block not found in evaluated page");
const cssClose = page.indexOf("</style>", cssOpen);
if (cssClose < 0) throw new Error("big </style> not found");
const cssText = page.slice(cssOpen + "<style>\n".length, cssClose);

// App JS: located after the interpolated core, ends at the final </script>.
const coreIdx = page.indexOf(core);
if (coreIdx < 0) throw new Error("CLIENT_CORE_JS not found in evaluated page");
const afterCore = coreIdx + core.length;
if (page[afterCore] !== ";") throw new Error("expected ';' after core, got: " + JSON.stringify(page.slice(afterCore, afterCore + 20)));
const appStart = page.indexOf("\n", afterCore) + 1;
const scriptClose = page.indexOf("</script>", appStart);
if (scriptClose < 0) throw new Error("app </script> not found");
let appJs = page.slice(appStart, scriptClose);

// The PAGE_TZ declaration stays INLINE (api.ts substitutes __PAGE_TZ__ at
// serve time — it can't reach inside an external file).
const tzLine = 'var PAGE_TZ = "__PAGE_TZ__";';
if (!appJs.startsWith(tzLine)) throw new Error("app JS does not start with PAGE_TZ line: " + JSON.stringify(appJs.slice(0, 80)));
appJs = appJs.slice(tzLine.length + 1); // + trailing newline

// ---------- 2. write the assets ----------
const cssHead = `/* SportSignal public styles — v${V}. Extracted from the PUBLIC_PAGE template;\n   served immutable. Cache-bust by renaming (bump the version suffix). */\n`;
const jsHead = `/* SportSignal client core — v${V}. Shared by /, /admin/login and /admin\n   (I18N dictionary + theme/language helpers). Edit THIS file; bump the\n   filename version when it changes. */\n`;
const appHead = `/* SportSignal public app JS — v${V}. Extracted from the PUBLIC_PAGE\n   template (UCL_BALL + all rendering logic). Edit THIS file; bump the\n   filename version when it changes. */\n`;
fs.writeFileSync(`assets/public-${V}.css`, cssHead + cssText + "\n");
fs.writeFileSync(`assets/core-${V}.js`, jsHead + core + "\n");
fs.writeFileSync(`assets/public-${V}.js`, appHead + appJs + "\n");
console.log(`wrote assets/public-${V}.css  ${(cssText.length / 1024).toFixed(1)}KB`);
console.log(`wrote assets/core-${V}.js    ${(core.length / 1024).toFixed(1)}KB`);
console.log(`wrote assets/public-${V}.js  ${(appJs.length / 1024).toFixed(1)}KB`);

// ---------- 3. rewrite src/pages/public.ts ----------
let pub = fs.readFileSync("src/pages/public.ts", "utf8");
const styleRe = /<style>\n:root[\s\S]*?\n<\/style>/;
if (!styleRe.test(pub)) throw new Error("public.ts: big <style> block not found in SOURCE");
pub = pub.replace(styleRe, `<link rel="stylesheet" href="${CSS_URL}">`);
// The script block: <script>\n${CLIENT_CORE_JS};\nvar PAGE_TZ = ...; ... <\/script>
// (source-level: the closing tag is the escaped "<\/script>" 3-char sequence "<" "\" "/")
const scriptRe = /<script>\n\$\{CLIENT_CORE_JS\};\nvar PAGE_TZ = "__PAGE_TZ__";\n[\s\S]*?\n<\\\/script>/;
if (!scriptRe.test(pub)) throw new Error("public.ts: big <script> block not found in SOURCE");
pub = pub.replace(
  scriptRe,
  `<script src="${CORE_URL}"><\\/script>
<script>var PAGE_TZ = "__PAGE_TZ__";<\\/script>
<script src="${APP_URL}"><\\/script>`
);
pub = pub.replace('import { CLIENT_CORE_JS } from "./client-core";\n', "");
pub = pub.replace('import { UCL_LOGO_CHIP, UCL_BALL } from "../config";', 'import { UCL_LOGO_CHIP } from "../config";');
if (pub.includes("CLIENT_CORE_JS") || pub.includes("UCL_BALL")) throw new Error("public.ts still references removed symbols");
fs.writeFileSync("src/pages/public.ts", pub);
console.log("rewrote src/pages/public.ts");

// ---------- 4. rewrite login.ts + admin.ts (shared core → external script) ----------
for (const f of ["src/pages/login.ts", "src/pages/admin.ts"]) {
  let s = fs.readFileSync(f, "utf8");
  const marker = '<script>\n${CLIENT_CORE_JS};\n';
  if (!s.includes(marker)) throw new Error(`${f}: core script marker not found`);
  s = s.replace(marker, `<script src="${CORE_URL}"><\\/script>\n<script>\n`);
  s = s.replace('import { CLIENT_CORE_JS } from "./client-core";\n', "");
  if (s.includes("CLIENT_CORE_JS")) throw new Error(`${f} still references CLIENT_CORE_JS`);
  fs.writeFileSync(f, s);
  console.log(`rewrote ${f}`);
}

// ---------- 5. retire the now-inlined source of the core ----------
fs.rmSync("src/pages/client-core.ts");
console.log("deleted src/pages/client-core.ts (assets/core-" + V + ".js is the source of truth)");

// ---------- 6. immutable cache headers ----------
let headers = fs.readFileSync("assets/_headers", "utf8");
if (!headers.includes(CORE_URL)) {
  headers += `
# v${V} extracted page assets — filename-versioned, safe to cache immutably
# for a year (bump the filename on change).
${CORE_URL}
  Cache-Control: public, max-age=31536000, immutable

${APP_URL}
  Cache-Control: public, max-age=31536000, immutable

${CSS_URL}
  Cache-Control: public, max-age=31536000, immutable
`;
  fs.writeFileSync("assets/_headers", headers);
  console.log("appended immutable rules to assets/_headers");
}

console.log("\nDONE. Remaining HTML ≈ " + ((page.length - cssText.length - core.length - appJs.length) / 1024).toFixed(1) + "KB (was " + (page.length / 1024).toFixed(1) + "KB).");
console.log("Next: npm test, deploy, verify live.");
