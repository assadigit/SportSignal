// Self-check: page-template BYTE PARITY — the guard the admin-split +
// shared-styles refactor (v13.83) was gated on.
//
// What it does:
//   1. Loads every src/pages/*.ts module (sorted, same as the worker-src
//      concat), strips import/export syntax, and evals the blob with FIXED
//      STUB values for the two runtime interpolations (VERSION in the admin
//      footer, UCL_LOGO_CHIP in the public hero section). Using fixed stubs
//      (not the live values) means a version bump does NOT invalidate the
//      baseline — the parity question is "same source in → same bytes out".
//   2. Renders ADMIN_PAGE / LOGIN_PAGE / PUBLIC_PAGE to strings.
//   3. Byte-compares each against the frozen baseline in
//      scripts/fixtures/<page>-page-baseline.html. On mismatch it reports the
//      first differing offset + a context window so the escape mistake is
//      findable in seconds.
//
// Re-baselining is DELIBERATE and reviewed:
//   node scripts/check-admin-parity.js --update
// (a --update run must accompany any INTENDED output change, never a
//  refactor that claims byte-parity.)
//
// History: the split + inline-CSS dedupe were deferred across the whole
// v13.72-13.82 hygiene arc precisely because there was no harness to catch
// a one-byte template escape mistake on owner-facing pages. This check is
// that harness (RUNBOOK lesson: parity proof before template surgery).
const fs = require("fs");
const path = require("path");

const PAGES_DIR = path.join(__dirname, "..", "src", "pages");
const FIXTURES_DIR = path.join(__dirname, "..", "scripts", "fixtures");

const STUBS =
  'var VERSION = "PARITY-STUB-VERSION";\n' +
  'var UCL_LOGO_CHIP = "PARITY-STUB-CHIP";\n';

const TEMPLATES = [
  { varName: "ADMIN_PAGE", fixture: "admin-page-baseline.html", page: "admin" },
  { varName: "LOGIN_PAGE", fixture: "login-page-baseline.html", page: "login" },
  { varName: "PUBLIC_PAGE", fixture: "public-page-baseline.html", page: "public" },
];

function transform(ts) {
  return ts
    .replace(/^import\s+[^;]+;\n?/gm, "")
    .replace(/^export const\s+/gm, "var ")
    .replace(/^export (async )?function\s+/gm, "$1function ");
}

function renderPages() {
  // ESM-semantics order: styles-shared.ts declares the constants the three
  // templates interpolate. In a flat var-concat the template literals
  // evaluate AT DECLARATION TIME, so a consumer module listed before
  // styles-shared.ts reads `undefined` (the v13.83 harness caught exactly
  // this on its first run). Dependency-first, then alphabetical — the same
  // principle as the worker-src.js concat order.
  const files = ["styles-shared.ts"].concat(
    fs.readdirSync(PAGES_DIR).filter((x) => x.endsWith(".ts") && x !== "styles-shared.ts").sort()
  );
  const blob = files.map((f) =>
    "// ===== src/pages/" + f + " =====\n" + transform(fs.readFileSync(path.join(PAGES_DIR, f), "utf8"))
  ).join("\n");
  const sandbox = {};
  new Function("sandbox", STUBS + blob + "\n; sandbox.ADMIN_PAGE = ADMIN_PAGE; sandbox.LOGIN_PAGE = LOGIN_PAGE; sandbox.PUBLIC_PAGE = PUBLIC_PAGE;")(sandbox);
  return sandbox;
}

const UPDATE = process.argv.includes("--update");
let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) failed++;
};

fs.mkdirSync(FIXTURES_DIR, { recursive: true });
let rendered;
try {
  rendered = renderPages();
} catch (e) {
  console.error("FAIL pages blob did not evaluate: " + e.message);
  process.exit(1);
}

for (const t of TEMPLATES) {
  const live = rendered[t.varName];
  const fixturePath = path.join(FIXTURES_DIR, t.fixture);
  if (!live) { check(t.page + " page renders from the pages blob", false); continue; }
  check(t.page + " page renders from the pages blob", true);
  if (UPDATE) {
    fs.writeFileSync(fixturePath, live);
    console.log("     baseline updated: " + t.fixture + " (" + live.length + " bytes)");
    continue;
  }
  if (!fs.existsSync(fixturePath)) {
    check(t.page + " page has a committed baseline (run --update once to create)", false);
    continue;
  }
  const base = fs.readFileSync(fixturePath, "utf8");
  if (base === live) {
    check(t.page + " page output is BYTE-IDENTICAL to the baseline (" + live.length + " bytes)", true);
  } else {
    check(t.page + " page output is BYTE-IDENTICAL to the baseline", false);
    let off = 0;
    while (off < Math.min(base.length, live.length) && base[off] === live[off]) off++;
    console.log("     first diff at offset " + off + " (baseline " + base.length + "B, live " + live.length + "B)");
    console.log("     baseline: ..." + JSON.stringify(base.slice(Math.max(0, off - 40), off + 40)) + "...");
    console.log("     live:     ..." + JSON.stringify(live.slice(Math.max(0, off - 40), off + 40)) + "...");
  }
}

// The split itself: the composer must stay the only ADMIN_PAGE exporter and
// api.ts must keep importing it (route wiring is outside the pages blob).
const apiSrc = fs.readFileSync(path.join(__dirname, "..", "src", "api.ts"), "utf8");
check("api.ts still serves ADMIN_PAGE from ./pages/admin", /import \{ ADMIN_PAGE \} from "\.\/pages\/admin"/.test(apiSrc));

console.log(failed ? "\n❌ " + failed + " parity check(s) failed" : "\n✅ all parity checks passed");
process.exit(failed ? 1 : 0);
