// Self-check: v12.29-goldtop — the user's ask:
//   "Make this : golden <span class="topbadge">🔥 صدر جدول</span>. Also use
//   Golden Cup or something like that for it. implying stating at top of
//   league will award a cup for that team."
// The top-of-the-table badge becomes a GOLD TROPHY plate: a vertical
// metallic gold gradient (highlight #fde68a → #fbbf24 → #f59e0b → deep
// #b45309), dark ENGRAVED text (#451a03 — reads on both themes, no light
// override needed), a deep-gold edge via the --badge-top token (now the
// badge's own gold anchor — the v12.27 success-green mapping retired),
// an inset top sheen + soft amber glow; the 🔥 swaps for 🏆 at BOTH render
// sites (render() + spotItemNode()) — leading the table = lifting the cup.
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../src/worker.ts"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"));
let pass = 0, fail = 0;
function ok(cond, label){ if(cond){ pass++; console.log("  ✔ " + label); } else { fail++; console.log("  ✘ " + label); } }

console.log("A) THE GOLDEN TROPHY PLATE — .topbadge");
ok(src.includes('.topbadge{display:inline-flex;align-items:center;background:linear-gradient(180deg,#fde68a,#fbbf24 38%,#f59e0b 62%,#b45309);'), "A1 a vertical METALLIC gold gradient (highlight → deep gold, the cup's sheen)");
ok(src.includes('color:#451a03;'), "A2 dark ENGRAVED text — gold-plate engraving, readable on both themes (no light override needed)");
ok(src.includes('border:1px solid var(--badge-top);'), "A3 a deep-gold edge through the --badge-top token");
ok(src.includes('box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 1px 10px rgba(245,158,11,.30);'), "A4 the metal sheen (inset top highlight) + a soft amber glow");
ok(src.includes('text-shadow:0 1px 0 rgba(255,255,255,.35)'), "A5 the engraved text carries a faint top light");
ok(!src.includes('background:var(--badge-top);color:#fff'), "A6 the old flat badge (solid fill + white text) is GONE");

console.log("B) THE GOLD CUP — 🏆 instead of 🔥");
ok((src.match(/tb\.textContent = "🏆 " \+ T\("topBadge"\);/g) || []).length === 2, "B1 🏆 at BOTH render sites (render() + spotItemNode())");
ok(!src.includes('"🔥 " + T("topBadge")'), "B2 no 🔥 left in the badge context");
ok((src.match(/topBadge:"صدر جدول"/g) || []).length === 1 && (src.match(/topBadge:"Top 3"/g) || []).length === 1, "B3 the label itself unchanged (صدر جدول / Top 3)");

console.log("C) THE TOKEN — --badge-top is the badge's gold anchor now");
ok((src.match(/--badge-top:#b45309;/g) || []).length === 2, "C1 both theme blocks: --badge-top = deep gold #b45309");
ok(!src.includes('--badge-top:var(--t-success)'), "C2 the v12.27 success-green mapping retired (gold is brand, like .bigcard's greens)");
ok(src.includes('--t-success:#15803d;'), "C3 the success token itself stays (live chips, winner scores still use it)");

console.log("D) VERSION (12.30 roll superseded — strict 12.30 assertions live in check-v1230.js)");
ok(/const VERSION = "12\.3\d-/.test(src), "D1 VERSION stays a 12.3x release tag");
ok((src.match(/ver:"نسخه ۱۲\.۳/g) || []).length >= 3, "D2 fa ver strings present (public + login + admin dicts)");
ok((src.match(/data-i="ver">نسخه ۱۲\.۳/g) || []).length === 1, "D3 the static footer ver div present");
ok((src.match(/ver:"v12\.3/g) || []).length >= 3, "D4 en ver strings present");
ok(pkg.version === "12.30.0" && pkg.scripts.test.includes("check-v1229.js"), "D5 (v12.30 roll) package.json 12.30.0 + this suite wired into npm test");

console.log(`\n${pass} passed, ${fail} failed (v12.29-goldtop checks)`);
process.exit(fail ? 1 : 0);
