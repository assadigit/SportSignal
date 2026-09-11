// Self-check: v12.25-alignment — the user's four asks:
//   1) "reduce the opacity of background logos by 30%" — the hero crests
//      drop .40 → .28 on both themes (PC + phones), same 320px/210px canvas.
//   2) "if you can align all of the fixtures in a same line" + "the borders
//      around the teams and rows are misleading … sometimes you incorrectly
//      think the game match time belong to a row, but actually it belongs to
//      upper row … so always match details inside the match box for example
//      A [match info] B" — every fixture is a real bordered MATCH BOX with
//      the kickoff TIME in the center slot (the score's x line).
//   3) "Also I gave you a png transparent logo, why you added white
//      background for it. use transparent logo. Also increase the size in
//      pc by 100% and Mobile by 50%" — the white plate is retired; two ink
//      variants (navy on light, white on dark), 84px PC / 50px phones.
//   4) "Also in heading of PC, and footer of Mobile add this : خانه درباره
//      تماس" — the classic nav, header on PC, footer on phones.
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../src/worker.ts"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"));
let pass = 0, fail = 0;
function ok(cond, label){ if(cond){ pass++; console.log("  ✔ " + label); } else { fail++; console.log("  ✘ " + label); } }

console.log("A) the TRANSPARENT logo (no white plate) + sizes (v12.26 roll: ONE logo on both themes, PC −40%)");
ok(src.includes('<a class="brand" href="/" aria-label="SportSignal"><img src="/logo.png" alt="SportSignal" width="146" height="50" referrerpolicy="no-referrer"></a>'), "A1 (v12.26 roll) ONE transparent img — the uploaded /logo.png with fixed width/height attrs (zero CLS); the two-variant swap is retired (the user: dark mode must show the GIVEN logo, not a white silhouette)");
ok(fs.existsSync("assets/logo.png") && !fs.existsSync("assets/logo-light.png"), "A2 (v12.26 roll) the original png lives in [assets]; the white remap logo-light.png is DELETED");
ok(src.includes('.brand img{display:block;height:50px;width:auto;transition:transform .15s cubic-bezier(.16,1,.3,1)}'), "A3 (v12.26 roll) the bare transparent img at 50px on PC — the requested 40% trim from 84px; phones were already 50px");
ok(!src.includes('background:#fff;box-shadow:var(--glass-shadow),inset 0 1px 0 var(--glass-hi)}'), "A4 no white-plate chrome left on the brand img (transparent png, per the user's ask)");
ok(!src.includes('.brand .brand-ink') && !src.includes('.brand .brand-white') && (src.match(/\[data-theme="light"\] \.brand/g) || []).length === 0, "A5 (v12.26 roll) the CSS theme swap is RETIRED — the SAME logo rides light and dark, no silhouette remap");
ok(!src.includes('.brand img{height:50px}'), "A6 (v12.26 roll) the separate phone rule is gone — the base 50px serves PC and phones alike");

console.log("B) background crests — opacity reduced by 30% (v12.26 roll: .28 → .196)");
ok(src.includes('.hero-wm img{position:absolute;top:52%;width:320px;height:320px;object-fit:contain;opacity:.196;filter:brightness(1.28) saturate(1.05);transform:translateY(-50%)}'), "B1 (v12.26 roll) dark: .196 (was .28 — the second 30% cut, the user: \"it's still too visible\"), same big 320px canvas");
ok(src.includes('[data-theme="light"] .hero-wm img{opacity:.196;filter:none}'), "B2 (v12.26 roll) light: .196 unfiltered");
ok(src.includes('@media (max-width:600px){.hero-wm img{width:210px;height:210px;opacity:.196}'), "B3 (v12.26 roll) phones: 210px at .196");
ok((src.match(/opacity:\.196/g) || []).length === 3, "B4 (v12.26 roll) exactly three .196 rules (dark + light + phone) — no stray .28 left");

console.log("C) MATCH BOXES — details inside the box, one aligned line");
ok(src.includes('.mrow,.spotitem{border:1px solid var(--border);border-radius:14px;padding:10px 12px;margin:0 0 10px;transition:background .15s,border-color .15s}'), "C1 every fixture is a real bordered box (border + radius + padding + gap below)");
ok(src.includes('.mrow:last-child,.spotitem:last-child{margin-bottom:0}') && src.includes('.mrow:hover,.spotitem:hover{background:var(--hover)}'), "C2 last box loses the gap; hover highlights the WHOLE unit");
ok(src.includes('.match{display:flex;align-items:center;gap:12px;padding:2px 0;border-radius:10px;animation:rise') && !src.includes('border-bottom:1px solid var(--border);border-radius:10px;transition:background'), "C3 the misleading hairline divider is RETIRED from .match (it sat BETWEEN a row's teams and its own info line — the misattribution source)");
ok(!src.includes('.wrap:last-child .match,.mrow:last-child .match{border-bottom:none}'), "C4 the old :last-child divider rule is gone");
ok((src.match(/var kt = document\.createElement\("div"\); kt\.className = "kick"/g) || []).length === 2, "C5 BOTH row builders (render + spotItemNode) give every unplayed row a .kick CENTER slot");
ok((src.match(/row\.appendChild\(hs\); row\.appendChild\(kt\); row\.appendChild\(as\);/g) || []).length === 2, "C6 the row is always [side A][center][side B] — upcoming, live and finished rows share ONE layout");
ok(src.includes('.kick{flex:0 0 92px;display:flex;align-items:center;justify-content:center;min-width:0}'), "C7 the kick slot is a FIXED 92px centered slot");
ok(src.includes('.score{font-weight:800;font-size:17px;color:var(--score);flex:0 0 92px;text-align:center;white-space:nowrap;font-variant-numeric:tabular-nums}'), "C8 the score slot widened 72px → 92px — EXACTLY the kick slot's width, so team columns line up across every fixture");
ok(src.includes('.kick .countdown{margin:0;font-size:13px;padding:4px 12px}'), "C9 the time chip is styled for the center stage (no info-line margins)");
ok(src.includes('.score{font-size:15px;flex-basis:80px}') && src.includes('.kick{flex:0 0 80px}') && src.includes('.kick .countdown{font-size:11.5px;padding:3px 9px}'), "C10 phones: both slots 80px — same aligned line on mobile");
ok(src.includes('.mrow,.spotitem{padding:8px 10px}'), "C11 phone boxes compact their padding (room for the center slot)");
ok((src.match(/kc\.textContent = fmtKick\(m\.utcDate\)/g) || []).length === 2, "C12 the kickoff TIME text rides the center slot in both builders");
ok(src.includes('cd.className = "wkdone";') && src.includes('cd.textContent = "⌛ " + T("wkDone");'), "C13 expired rows keep the «⌛ پایان‌یافته» marker in their info line (v12.17 semantics preserved)");
ok(!src.includes('} else if(!finished){\n      var cd = document.createElement("span"); cd.className = "countdown"; cd.textContent = fmtKick(m.utcDate);'), "C14 no countdown chip left in the info line (the time can no longer be misattributed to a neighbor row)");

console.log("D) the «خانه درباره تماس» nav (v12.26 roll: start-aligned, not centered)");
ok(src.includes('<nav class="mainnav" aria-label="ناوبری اصلی"><a href="/" data-i="navHome">خانه</a><a href="#about" data-i="navAbout">درباره</a><a href="https://t.me/UCL_Match_Bot" target="_blank" rel="noopener" data-i="navContact">تماس</a></nav>'), "D1 the three-link nav in the header (real destinations: home / #about / the Telegram bot)");
ok(src.includes('<footer id="about"><nav class="footnav"'), "D2 the footer carries id=\"about\" (the about anchor) + the same nav");
ok(src.includes('@media (min-width:1440px){\n.mainnav{display:flex;flex:1 1 auto;justify-content:flex-start;align-items:center;gap:2px;min-width:0}'), "D3 (v12.26 roll) ≥1440px: the nav hugs the logo at the START edge on ONE row — right-aligned on the RTL page, per the user's ask");
ok(src.includes('@media (min-width:601px) and (max-width:1439px){\n.mainnav{display:flex;order:3;flex:1 1 100%;justify-content:flex-start;align-items:center;gap:2px}'), "D4 (v12.26 roll) 601–1439px: the nav's own row packs to the start edge (no squeeze, no centering)");
ok(src.includes('.footnav{display:flex;justify-content:flex-start;align-items:center;gap:2px;flex-wrap:wrap;margin:0 0 8px}') && src.includes('.mainnav{display:none}') && src.includes('.footnav{display:none}'), "D5 (v12.26 roll) phones: header nav hidden, the footer nav row shows START-aligned — the user's درباره/تماس right-aligned split");
ok(src.includes('navHome:"خانه",navAbout:"درباره",navContact:"تماس"') && src.includes('navHome:"Home",navAbout:"About",navContact:"Contact"'), "D6 the nav labels are i18n keys in BOTH public dicts (fa + en)");
ok(src.includes('html{overflow-x:hidden;scroll-behavior:smooth}'), "D7 smooth anchor scrolling for the about link (the v12.23 overflow clip kept)");
ok(src.includes('var foot = document.getElementById("about");') && src.includes('var apply = function(){ var show = past && !footIn; stick.classList.toggle("show", show); document.body.classList.toggle("joinsticky", show); };'), "D8 the sticky join bar stands DOWN once the footer is in view — a «درباره» anchor lands on clean content, and the footer's own bot link takes the CTA duty at page end");

console.log("E) version + wiring");
ok(src.includes('const VERSION = "12.26-herostage";'), "E1 (v12.26 roll) VERSION = 12.26-herostage");
ok((src.match(/ver:"نسخه ۱۲\.۲۶ — صحنهٔ ویدیویی/g) || []).length === 3, "E2 (v12.26 roll) fa ver strings (public + login + admin) all ۱۲.۲۶");
ok((src.match(/v12\.26 — an adrenaline/g) || []).length === 3, "E3 (v12.26 roll) en ver strings all v12.26");
ok((src.match(/نسخه ۱۲\.۲۶ — صحنهٔ ویدیویی/g) || []).length === 4, "E4 (v12.26 roll) fa ver strings + the admin static footer = 4 spots");
ok(pkg.version === "12.26.0" && pkg.scripts.test.includes("check-v1225.js"), "E5 (v12.26 roll) package.json 12.26.0 + this suite wired into npm test");

console.log(`\n${pass} passed, ${fail} failed (v12.25-alignment checks)`);
process.exit(fail ? 1 : 0);
