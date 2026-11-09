#!/usr/bin/env node
// check-a11y.js — the web-optimization Phase 6 accessibility gate
// (v13.209-a11y). Pins the F-M3 contrast matrix (computed from the REAL
// stylesheet tokens with the Lighthouse/axe compositing model), the F-M6
// touch-target floors, the F-L3 skip-link-first order, the F-M3b static
// contracts and the R13 CSP stance. What is tested is what ships: every
// assertion reads the live source files (ADR-005 idiom).
//
// The contrast model replicates what Lighthouse/axe measure: sRGB alpha
// compositing through the ancestor BACKGROUND-COLOR stack (images and
// backdrop-filter bitmaps are invisible to the audit) + the WCAG 2.x
// relative-luminance formula. The layer stack under a .spotitem text node:
//   body --bg -> .card --glass -> .spotitem --rowsurf (or the v13.209 past
//   tint) -> .countdown pill --countdown-bg (for pill'd nodes only).
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

let failed = 0;
let passed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log("OK   " + name.slice(0, 150)); }
  else { failed++; console.error("FAIL   " + name); }
}

// --- WCAG math (axe's model) ---
function hexToRgb(h) {
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
}
function rgbaToRgb(s) {
  const m = String(s).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(",").map((x) => parseFloat(x.trim()));
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}
function comp(fg, bg) { // composite fg over bg in sRGB
  const a = fg.a == null ? 1 : fg.a;
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
}
function lum(c) {
  const f = (v) => { v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
function contrast(fg, bg) {
  const l1 = Math.max(lum(fg), lum(bg)), l2 = Math.min(lum(fg), lum(bg));
  return (l1 + 0.05) / (l2 + 0.05);
}

// --- parse the LIVE stylesheet tokens ---
const css = read("assets/public-13.83.css"); // v13.249-ranktip: the read follows the 13.82 -> 13.83 rename (the .ranktip rules; every token this gate parses rides unchanged); was 13.82 since v13.248-rankchip: the read follows the 13.81 -> 13.82 rename (the .rankchip rules; every token this gate parses rides unchanged); was 13.81 since v13.209-a11y
const rootBlock = css.match(/:root\{([^}]*)\}/)[1];
function token(name) {
  const m = rootBlock.match(new RegExp("--" + name + ":([^;}]+)"));
  if (!m) throw new Error("token --" + name + " missing");
  return m[1].trim();
}
const T = {
  bg: hexToRgb(token("bg")),
  glass: rgbaToRgb(token("glass")),
  rowsurf: rgbaToRgb(token("rowsurf")),
  countdown: hexToRgb(token("countdown")),
  countdownBg: rgbaToRgb(token("countdown-bg")),
  text: hexToRgb(token("text")),
  muted: hexToRgb(token("muted")),
  score: hexToRgb(token("score")),
};

// the v13.209 past-state tokens (parsed from the rules we ship)
const pastRule = css.match(/\.spotitem\.past\{([^}]*)\}/);
check("F-M3: the .spotitem.past rule exists and dims by COLOR (no opacity token — the unfixable .48 compositing retired)", !!pastRule && !/opacity/.test(pastRule[1]) && /background:rgba\(11,17,31,\.72\)/.test(pastRule[1]) && /saturate\(\.55\)/.test(pastRule[1]));
const pastBg = rgbaToRgb("rgba(11,17,31,.72)");
const pastTeam = hexToRgb(css.match(/\.spotitem\.past \.team\{color:(#[0-9a-fA-F]{3,6})\}/)[1]);
const pastBlue = hexToRgb(css.match(/\.spotitem\.past \.kickdate,\.spotitem\.past \.kick \.countdown\{color:(#[0-9a-fA-F]{3,6})\}/)[1]);
const pastInfo = hexToRgb(css.match(/\.spotitem\.past \.info\{color:(#[0-9a-fA-F]{3,6})\}/)[1]);

// layer stacks
const cardBg = comp(T.glass, T.bg);                    // .card over body
const normBg = comp(T.rowsurf, cardBg);                // .spotitem over .card
const pastStack = comp(pastBg, cardBg);                // v13.209 past box over .card
const normPill = comp(T.countdownBg, normBg);          // countdown pill (normal)
const pastPill = comp(T.countdownBg, pastStack);       // countdown pill (past)

const AA_TEXT = 4.5;
const ratio = (fg, bg) => +contrast(fg, bg).toFixed(2);
check("F-M3 sanity: the compositing model matches the live browser measurement (normal team ≈ 12:1 on the normal stack, the before-evidence matrix reproduces)", ratio(T.text, normBg) > 9 && ratio(T.text, normBg) < 14);

// F-M3 matrix — every steady state ≥ 4.5:1
const matrix = [
  ["normal .team", T.text, normBg],
  ["normal .kickdate", T.countdown, normBg],
  ["normal .info (.comp sibling text)", T.muted, normBg],
  ["normal .countdown pill", T.countdown, normPill],
  ["normal .score", T.score, normBg],
  ["past .team", pastTeam, pastStack],
  ["past .kickdate", pastBlue, pastStack],
  ["past .countdown pill", pastBlue, pastPill],
  ["past .info", pastInfo, pastStack],
  ["past .score at .85", comp({ r: T.score.r, g: T.score.g, b: T.score.b, a: 0.85 }, pastStack), pastStack],
];
const r2 = (n) => Math.round(n * 100) / 100;
for (const [name, fg, bg] of matrix) {
  const c = r2(contrast(fg, bg));
  check(`F-M3 contrast: ${name} = ${c}:1 ≥ ${AA_TEXT}:1`, c >= AA_TEXT);
}
// the impossible-by-any-ink proof stays green in the record: pure white at
// .48 over the OLD pill stack lands 4.48:1 — the documented retirement basis.
const oldPastPill = comp(T.countdownBg, comp({ r: 255, g: 255, b: 255, a: 0.48 }, comp({ r: T.countdownBg.r, g: T.countdownBg.g, b: T.countdownBg.b, a: 0.48 }, normBg)));
check("F-M3 evidence pin (exact): #fff at .48 over the old stack < 4.5:1", contrast(comp({ r: 255, g: 255, b: 255, a: 1 }, oldPastPill), oldPastPill) < 4.5);

// --- F-M6 touch targets: the rules exist with the floor-producing values ---
check("F-M6: .tb-btns button is 44x44 (was 34x34)", /width:44px;height:44px/.test(css.match(/\.tb-btns button\{[^}]*\}/)[0]));
check("F-M6: .mainnav a padding reaches the 44px row (13.5px x1.6 line + 2x12px padding = 45.6px)", /padding:12px 16px/.test(css.match(/\.mainnav a\{color:var\(--nav-link\)[^}]*\}/)[0]));
check("F-M6: .footnav a (mobile footer) padding 10px 14px (13px x2 + 20 = 46px)", /padding:10px 14px/.test(css));
check("F-M6: .finmore padding 12px 22px (20 + 24 = 44px)", /padding:12px 22px/.test(css.match(/\.finmore\{[^}]*\}/)[0]));
check("F-M6: mobile #backTop 44px (was 42)", /#backTop\{bottom:18px;left:18px;width:44px;height:44px\}/.test(css));
check("F-M6: .contact-email padding carries the mailto over 44px (26 + 20)", /padding:10px 12px/.test(css.match(/\.contactbox \.contact-email\{[^}]*\}/)[0]));
check("F-M6: .foot-base a clears the WCAG 2.5.8 AA 24px floor (12px x1.5 + 12 = 30px) — the 44px exception documented", /\.foot-base a\{display:inline-block;padding:6px 8px;line-height:1\.5;margin:0 2px\}/.test(css));

// --- F-L3: the skip link is the FIRST focusable on the page ---
const pub = read("src/pages/public.ts");
const bodyIdx = pub.indexOf("<body>");
const headerIdx = pub.indexOf('<header id="topbar">');
const skipIdx = pub.indexOf('<a class="skip-link" href="#main">');
check("F-L3: the homepage skip link precedes the topbar (first focusable in the DOM)", bodyIdx > -1 && skipIdx > bodyIdx && skipIdx < headerIdx);
check("F-L3: the homepage has exactly ONE skip link", pub.split('class="skip-link"').length === 2);
const shell = read("src/seo/page-shell.ts");
const shellBody = shell.indexOf('<body class=');
const shellHeader = shell.indexOf('<header id="topbar">');
const shellSkip = shell.indexOf('<a class="skip-link" href="#main">');
check("F-L3/2.4.1: the page-shell sub-pages gained the same skip link, first focusable (they had none before v13.209)", shellSkip > shellBody && shellSkip < shellHeader);
check("F-L3: the shell carries the skip-link CSS (off-canvas until :focus)", /\.skip-link\{position:absolute;inset-inline-start:-9999px\}\n\.skip-link:focus\{[^}]*padding:14px 18px/.test(shell));

// --- F-M3b: the static side (the bundle side rides check-stats) ---
check("F-M3b: the ticking .mc-cells digits are aria-hidden in the static markup (mobile card)", /<div class="mc-cells" id="mcCells" role="timer" dir="ltr" aria-hidden="true">/.test(pub));
check("F-M3b: the ticking .hud-cells digits are aria-hidden in the static markup (desktop card)", /<div class="hud-cells" role="timer" dir="ltr" aria-hidden="true">/.test(pub));
const mcSr = pub.indexOf('<span id="mcSr"');
const mcAnchorClose = pub.lastIndexOf("</a>", mcSr);
check("F-M3b: #mcSr (the polite countdown announcer) lives OUTSIDE the #heroMCard anchor", mcSr > -1 && pub.slice(mcAnchorClose + 4, mcSr).replace(/<!--[\s\S]*?-->/g, "").indexOf("<") === -1);
const hcSr = pub.indexOf('<span id="hcSr"');
const hcAnchorClose = pub.lastIndexOf("</a>", hcSr);
check("F-M3b: #hcSr lives OUTSIDE the #bigHeroCard anchor", hcSr > -1 && pub.slice(hcAnchorClose + 4, hcSr).replace(/<!--[\s\S]*?-->/g, "").indexOf("<") === -1);

// --- F-M3b final shape (v13.210): BOTH hero card anchors are UNLABELED ---
const bundle = read("assets/public-13.76.js"); // v13.249-ranktip: the read follows the 13.75 -> 13.76 rename (the S38 tooltip round; the hero-card aria contracts this gate pins ride unchanged); was 13.75 since v13.248-rankchip: the read follows the 13.74 -> 13.75 rename (the S37 team rank-chip round; the hero-card aria contracts this gate pins ride unchanged); was 13.74 since v13.226.1-herowirefix: the read follows the 13.72 -> 13.73 rename (the elision hotfix rename — the immutable-published 13.72.js was edited in place by the first hotfix, violating ADR-006; 13.73 is the rule-following cure); was 13.72 since v13.226-herowire (SS-27): the read follows the 13.70 -> 13.71 rename
check("F-M3b (v13.210 close-out): the live bundle sets NO aria-label on either hero card (axe's label-content-name-mismatch only MATCHES aria-labeled widgets; name-from-content is always content-matched and the ticking painted digits make every static label unmatchable)", !/e\.setAttribute\("aria-label",\(nm\(t\.homeTeam\)/.test(bundle) && !/e\.setAttribute\("aria-label",hn\+/.test(bundle));

// --- the sub-page final-pass catch (v13.210): the .simcount count chip ---
const sim = css_match = shell.match(/\.simcount\{([^}]*)\}/);
check("F-M3 sub-page: the .simcount chip ink is the AA-passing #b6c5da (the pre-existing muted ink landed 4.4:1 on its 12% gray pill over the glass card — the sub-page 95s in the frozen audit)", !!sim && /color:#b6c5da/.test(sim[1]));
const shellBg = comp(rgbaToRgb('rgba(148,163,184,.12)'), comp(T.glass, T.bg));
check("F-M3 sub-page: #b6c5da on the simcount pill stack >= 4.5:1 (computed)", contrast(hexToRgb('#b6c5da'), shellBg) >= 4.5);

// --- the reduced-motion global kill rule (WCAG 2.3.3) still stands ---
check("WCAG 2.3.3: the global prefers-reduced-motion kill rule survives the rename", /@media \(prefers-reduced-motion:reduce\)\{\*\{transition:none!important;animation:none!important\}\}/.test(css));

// --- R13 CSP stance: unsafe-inline stays (documented), beacon origins stay allowed ---
const tables = read("src/tables.ts");
const csp = tables.match(/"content-security-policy":\s*"([^"]+)"/)[1];
check("R13: CSP script-src still allows the Web-Analytics beacon origin (static.cloudflareinsights.com)", /script-src [^;]*https:\/\/static\.cloudflareinsights\.com/.test(csp));
check("R13: CSP connect-src still allows cloudflareinsights.com (the beacon endpoint)", /connect-src 'self' https:\/\/cloudflareinsights\.com/.test(csp));
check("R13: CSP keeps 'unsafe-inline' in script-src (the documented keep — inline JSON-LD + theme-init + signature scripts; a nonce CSP is incompatible with the edge-cached HTML design, RESULTS §17.4)", /script-src 'self' 'unsafe-inline'/.test(csp));
check("R13: CSP keeps frame-ancestors 'none'", /frame-ancestors 'none'/.test(csp));

console.log("\n" + (failed === 0 ? "OK   check-a11y: all " + passed + " checks passed" : "\u274C " + failed + " a11y check(s) failed"));
process.exit(failed === 0 ? 0 : 1);
