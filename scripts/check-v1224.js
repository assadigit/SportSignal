// Self-check: v12.25-alignment — the user's four asks:
//   1) "i actually prefer like 40% of the logo appear in the bg, but bigger
//      and more prominent." — the countdown hero's watermark crests.
//   2) "increase the team logos (of next big upcoming match by 100% in pc
//      view)" — the hero face-off crests.
//   3) the progress bar's BASE — "when we have a loading like 0%-100% we
//      know the base is zero. but when less than 38 hours is remaining …
//      why only about 30% of the progress bar is filled? … we need to find
//      a logic for that." — a defined base + a printed percent.
//   4) "I want to create a header, first add the logo I uploaded. and
//      remove this texts: ⚽ اعلان‌دهنده مسابقات / مسابقات پیش‌رو … —
//      [settings icons etc] [telegram cta button] [logo] Like websites
//      logo." — the SportSignal brand header.
const fs = require("fs");
const src = fs.readFileSync("src/worker.ts", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.error("  ✗ FAIL: " + name); }
}

console.log("A) the WEBSITE header — logo + controls + Telegram CTA");
ok(src.includes('<header id="topbar">'), "A1 the top bar is now a semantic <header> (same id, so every button/popover wire keeps working)");
ok(src.includes('<a class="brand" href="/" aria-label="SportSignal"><img src="/logo.png" alt="SportSignal" width="146" height="50" referrerpolicy="no-referrer"></a>'), "A2 (v12.26 roll) the uploaded SportSignal logo rides the start corner as ONE transparent img — fixed width/height attrs so the header can never shift while the png loads (the CLS lesson); the white-remap variant is retired (the dark-mode silhouette fix)");
ok(fs.existsSync("assets/logo.png") && !fs.existsSync("assets/logo-light.png"), "A3 (v12.26 roll) the original png lives in [assets]; logo-light.png is deleted — the GIVEN logo serves both themes (bg.jpg/fonts pattern)");
ok(src.includes('.brand img{display:block;height:50px;width:auto;transition:transform .15s cubic-bezier(.16,1,.3,1)}') && !src.includes('background:#fff;box-shadow:var(--glass-shadow),inset 0 1px 0 var(--glass-hi)}'), "A4 (v12.26 roll) the white plate stays RETIRED — a bare TRANSPARENT png, now 40% SMALLER on PC per the ask (84px → 50px; phones already 50px), the same file on light AND dark");
ok(src.includes('.head-actions{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-inline-start:auto}') && src.includes('<div class="head-actions"><a class="cta" href="https://t.me/UCL_Match_Bot"'), "A5 the Telegram CTA lives IN the header next to the settings icons — [settings icons] [telegram cta] ··· [logo] (the user's sketch, mirrored correctly for RTL start/end)");
ok(!src.includes('<h1 data-i="h1">') && !src.includes('<p class="sub" data-i="sub1">') && !src.includes('<header class="hero">'), "A6 the old «⚽ اعلان‌دهنده مسابقات» h1 + subtitle + hero block are GONE (the user asked to remove both texts)");
ok(src.includes('<p class="sub sync" id="lastSync" role="status" aria-live="polite"></p>') && src.includes('#topbar .sync{flex:1 1 100%;margin:2px 0 0}'), "A7 the v12.20 sync stamp survives as the header's quiet second row (wraps to its own line inside the flex header)");
ok(src.includes('<div id="tzpanel" role="group" aria-label="منطقه زمانی">') && src.includes('<button id="sbtn"'), "A8 the tz popover + gear still anchor to the header bar (position:relative, absolute popover — untouched wiring)");
ok(src.includes('#topbar .cta{margin-top:0}') && src.includes('#topbar .cta{font-size:11.5px;padding:8px 12px;gap:6px}') && !src.includes('.brand img{height:50px}'), "A9 (v12.26 roll) compact phone header — the base 50px logo rule serves every width (the separate phone override is retired); tighter CTA pill, no full-width hero button");
ok(src.includes('#topbar,.herowrap,footer{grid-column:1/-1}') && src.includes('#topbar{margin-bottom:0}') && !src.includes('header.hero{text-align:center}'), "A10 (v12.27 roll) the ≥1440px grid — the hero spans via its .herowrap shell now: the header spans the full chrome row (logo start, controls end — website style), countdown hero + footer still span");
ok(src.includes('var cta = document.querySelector("a.cta"), stick = document.getElementById("joinSticky");'), "A11 the sticky join bar still watches the (now header) CTA — scrolled-past semantics unchanged");

console.log("B) the watermark: ~40% presence, bigger, more prominent");
ok(src.includes('.hero-wm img{position:absolute;top:52%;width:320px;height:320px;object-fit:contain;opacity:.157;transform:translateY(-50%)}'), "B1 (v12.27 roll) 320px at opacity .157 (imgs unfiltered — the filter moved to the clipped .hero-wm layer) — the v12.28 roll: .196 reduced by another 20% (the user: 'still reduce opacity by 20%') (the user: \"it's still too visible\")");
ok(src.includes('.hero-wm img:first-child{inset-inline-start:-48px}') && src.includes('.hero-wm img:last-child{inset-inline-end:-48px}'), "B2 deeper edge bleed (-48px, was -22px) — the crest reads EXPANDED, cropped safely by the clipped layer");
ok(src.includes('[data-theme="light"] .hero-wm img{opacity:.157}') && src.includes('[data-theme="light"] .hero-wm{filter:none}'), "B3 (v12.27 roll) light theme: .196, the layer filter off");
ok(src.includes('@media (max-width:600px){.hero-wm{display:none}}'), "B4 (v12.30 roll) phones: the watermark layer is OFF (the v12.30 declutter — two 210px ghosts fought the face-off); PC keeps the .157 pair");
ok(src.includes('.hero-wm::after{content:"";position:absolute;inset:0;background:radial-gradient(58% 62% at 50% 58%,rgba(2,6,23,.32),transparent 72%)}') && src.includes('[data-theme="light"] .hero-wm::after{background:radial-gradient(58% 62% at 50% 58%,rgba(248,250,252,.38),transparent 72%)}'), "B5 a soft radial SCRIM behind the card's center — the bolder crests stay background, the countdown/names stay readable (WCAG)");
ok(src.includes('.bighero .team{text-shadow:0 1px 12px rgba(2,6,23,.65)}') && src.includes('[data-theme="light"] .bighero .team{text-shadow:0 1px 12px rgba(255,255,255,.8)}'), "B6 the hero team names gain a gentle text shadow (dark: navy glow, light: white glow) for separation on top of the watermarks");

console.log("C) the hero face-off crests DOUBLE on PC");
ok(src.includes('@media (min-width:601px){.bighero .logo{width:102px;height:102px;font-size:44px}}'), "C1 51px → 102px (+100%) on every non-phone viewport, monogram fallback font scales with the circle (phones keep their own 46px)");
ok(src.includes('.bighero .logo{box-shadow:0 0 12px rgba(52,211,153,.35)}') && src.includes('.logo{width:51px;height:51px;'), "C2 every OTHER row keeps its 51px crest — only the countdown hero's face-off is poster-sized");

console.log("D) the progress bar: a DEFINED base (the 0%–100% loading logic)");
ok(src.includes('var q = 1 - rem/(14*864e5);'), "D1 the formula: progress = 1 − remaining/14d — 0% while the match is ≥14 days out (the \"base is zero\"), 100% AT kickoff; 38h out reads ~89%");
ok(src.includes('if(q<0) q=0; if(q>1) q=1;') && src.includes('fill.style.width = Math.max(2, Math.round(q*100)) + "%";'), "D2 clamped to [0,1]; the painted width keeps a 2px sliver so the burning-fuse tip stays visible at the very start");
ok(src.includes('<span id="bigbarPct" class="bigbar-pct" aria-hidden="true"></span>') && src.includes('.bb-end{display:inline-flex;align-items:center;gap:8px;min-width:0}'), "D3 the PERCENT chip rides the clock group at the row's end (aria-hidden — the track's aria-valuenow is the accessible source)");
ok(src.includes('var pctTxt = function(v){ return fmtNum(v) + (curLang()==="en" ? "%" : "٪"); };') && src.includes('if(pct) pct.textContent = pctTxt(Math.round(q*100));'), "D4 the percent prints every tick — Persian digits + ٪ in fa, plain % in en");
ok(src.includes('if(tr.getAttribute("title") !== T("barBase")) tr.setAttribute("title", T("barBase"));') && (src.match(/barBase:"/g) || []).length === 6, "D5 the tooltip spells the base out — barBase exists in all 6 dictionaries (fa/en × public/login/admin)");
ok(src.includes('barBase:"نوار پیشرفت از ۱۴ روز مانده به شروع بازی پر می‌شود و در روز بازی به ۱۰۰٪ می‌رسد"') && src.includes('barBase:"The bar starts filling 14 days before kickoff and reaches 100% at kickoff"'), "D6 the barBase copy — fa + en (both state the 14-day base and the 100% endpoint)");
ok(src.includes('tr.setAttribute("aria-valuenow", Math.round(q*100));'), "D7 aria-valuenow = the same percent (screen readers read the progress, not the mystery)");
ok(src.includes('.bigbar-pct{font-size:12px;font-weight:800;color:var(--countdown);background:var(--countdown-bg);border-radius:999px;padding:2px 9px;min-width:46px;') && src.includes('.bigbar-pct:empty{display:none}'), "D8 the chip has a fixed min-width (tabular-nums — no jitter as the digits change; the heartbeat lesson) and hides when empty (idle state)");
ok(src.includes('if(pct) pct.textContent = pctTxt(100);'), "D9 live state: the chip reads 100% alongside the live bar");
ok(!src.includes('var q = rem/(14*864e5);'), "D10 the v12.20 DRAIN formula is gone — the fill direction now matches the user's 0→100 loading mental model");

console.log("E) version bump");
ok(src.includes('const VERSION = "12.30-herocalm";'), "E1 (v12.30 roll) VERSION = 12.30-herocalm");
ok((src.match(/ver:"نسخه ۱۲\.۳۰/g) || []).length === 3, "E2 (v12.30 roll) fa ver strings (public + login + admin) all ۱۲.۳۰");
ok((src.match(/v12\.30 — the next big match/g) || []).length === 3, "E3 (v12.30 roll) en ver strings all v12.30");
ok((src.match(/نسخه ۱۲\.۳۰/g) || []).length === 4, "E4 (v12.30 roll) fa ver strings + the admin static footer = 4 spots");
ok(pkg.version === "12.30.0" && pkg.scripts.test.includes("check-v1224.js"), "E5 (v12.30 roll) package.json 12.30.0 + this suite wired into npm test");

console.log(`\n${pass} passed, ${fail} failed (v12.25-alignment checks)`);
process.exit(fail ? 1 : 0);
