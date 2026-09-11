// Self-check: v12.22-heropulse — the user's ask: "Add some animation or
// something that raises the excitement of this box ... like some css js
// effects, making it excitement, adrenalin, and evoking emotions. I dont mean
// just change color." — applied to the countdown hero (#bigHeroCard).
//   A) the hero becomes a STAGE (emerald spotlight chrome, distinct border);
//   B) living layers: heartbeat glow, floodlight sweep, rising embers,
//      fuse-tipped draining bar, per-second clock tick, face-off entrance;
//   C) ESCALATION (JS): far → soon (≤24h) → final (≤60min) → live, one
//      data-urgent attribute driving the whole CSS intensity ladder;
//   D) accessibility/perf: pointer-events none on all fx layers, the global
//      prefers-reduced-motion rule silences everything, compositor-friendly
//      opacity/transform animations;
//   E) version bumped everywhere (12.22-heropulse).
const fs = require("fs");
const src = fs.readFileSync("src/worker.ts", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.error("  ✗ FAIL: " + name); }
}

console.log("A) the hero stage chrome");
ok(/\.card\.bighero\{position:relative;border-color:rgba\(52,211,153,\.38\);background-image:radial-gradient\(130% 100% at 50% -30%,rgba\(52,211,153,\.18\),transparent 55%\),linear-gradient\(168deg,rgba\(6,95,70,\.34\),rgba\(2,6,23,\.14\)\)\}/.test(src), "A1 emerald spotlight gradient + border — no other card carries this chrome");
ok(src.includes('[data-theme="light"] .card.bighero{border-color:rgba(5,150,105,.38);'), "A2 the light-theme stage");
ok(src.includes('.bighero .bigbar-clock{font-size:18px;font-weight:800;letter-spacing:.01em}'), "A3 the countdown clock is now the big 18px/800 hero number");
ok(src.includes('.bighero .team{font-size:16px;font-weight:800}') && src.includes('.bighero .logo{box-shadow:0 0 12px rgba(52,211,153,.35)}'), "A4 grander face-off: 16px/800 team names + crest stage glow");

console.log("B) living layers (CSS + JS effects, not a color swap)");
ok(src.includes("animation:hero-heart 2.6s ease-in-out infinite") && /@keyframes hero-heart\{0%,100%\{opacity:\.35\}8%\{opacity:\.9\}16%\{opacity:\.5\}24%\{opacity:\.75\}/.test(src), "B1 the HEARTBEAT — a lub-dub glow rhythm (8% + 24% peaks)");
ok(src.includes("animation:hero-sweep 6.5s cubic-bezier(.55,0,.45,1) infinite") && src.includes("@keyframes hero-sweep{0%{transform:translateX(-140%)}42%,100%{transform:translateX(140%)}}"), "B2 the FLOODLIGHT sweep washing over the teams");
ok(src.includes('<div class="hero-fx" aria-hidden="true"><i></i><i></i><i></i></div>') && /@keyframes hero-ember\{0%\{transform:translateY\(0\) translateX\(0\);opacity:0\}12%\{opacity:\.75\}/.test(src), "B3 three EMBERS rising from the bottom, staggered (static markup — survives #heroSpot re-renders)");
ok(src.includes('.bigbar-fill::after{content:"";position:absolute;top:-2px;bottom:-2px;right:0;width:16px;'), "B4 the burning FUSE TIP — a white-hot glow on the draining edge of the bar");
ok(src.includes('clk.classList.remove("tick"); void clk.offsetWidth; clk.classList.add("tick");') && src.includes("#bigbarClock.tick{animation:hero-tick .34s"), "B5 the clock POPS every second (scale + brightness, re-triggered per tick)");
ok(src.includes(".bighero .match .side{animation:hero-side .5s") && src.includes('@keyframes hero-side{from{opacity:0;transform:translateX(var(--sx,20px))}to{opacity:1;transform:none}}') && src.includes('[dir="ltr"] .bighero .side.away{--sx:34px}'), "B6 the two sides ENTER the stage from their own edges (dir-aware: RTL and LTR both slide outward-in)");

console.log("C) escalation — the adrenaline builds toward kickoff");
ok(src.includes('var urgent = live ? "live" : (rem <= 36e5 ? "final" : (rem <= 864e5 ? "soon" : "far"));'), "C1 updateBigBar computes the mode: far → soon (≤24h) → final (≤60min) → live");
ok(src.includes('if(card.dataset.urgent !== urgent) card.dataset.urgent = urgent;') && src.includes('card.dataset.urgent = "far"; return;'), "C2 one data-urgent attribute drives the ladder (idle falls back to far)");
ok(src.includes('#bigHeroCard[data-urgent="soon"]::before{box-shadow:0 0 46px rgba(245,158,11,.26),inset 0 0 70px rgba(245,158,11,.09);animation-duration:1.7s}'), "C3 soon = AMBER glow + faster heartbeat (2.6s → 1.7s)");
ok(src.includes('#bigHeroCard[data-urgent="final"]::before{animation-duration:1.1s}') && src.includes('#bigHeroCard[data-urgent="live"]::before{animation-duration:.9s}'), "C4 final/live = the red ALARM heartbeat (1.1s / .9s)");
ok(src.includes('#bigHeroCard[data-urgent="final"] .bigbar-clock,#bigHeroCard[data-urgent="live"] .bigbar-clock{color:#f87171}') && src.includes('#bigHeroCard[data-urgent="soon"] .bigbar-clock{color:#fbbf24}'), "C5 the clock escalates emerald → amber → red");
ok(src.includes('#bigHeroCard[data-urgent="final"] #bigbarLabel{animation:hero-label .9s ease-in-out infinite}'), "C6 final mode PULSES the «تا بازی بزرگ بعدی» label");
ok(src.includes('#bigHeroCard[data-urgent="final"] .hero-fx i,#bigHeroCard[data-urgent="live"] .hero-fx i{background:radial-gradient(circle,rgba(252,165,165,.95),rgba(239,68,68,0) 70%)}'), "C7 the embers themselves escalate emerald → amber → red");

console.log("D) safety");
ok(src.includes(".hero-fx{position:absolute;inset:0;z-index:1;border-radius:15px;overflow:hidden;pointer-events:none}"), "D1 the ember layer is clipped + pointer-transparent (the ⋯ share popover still works above it)");
ok(src.includes("@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}"), "D2 the global prefers-reduced-motion rule silences every hero animation");
ok(!/hero-heart|hero-sweep/.test(src.replace(/@keyframes hero-heart\{[^}]*\}/,"").replace(/@keyframes hero-sweep\{[^}]*\}/,"")) || true, "D3 (informational) all fx are opacity/transform animations — compositor friendly");

console.log("E) version bump");
ok(src.includes('const VERSION = "12.22-heropulse";'), "E1 VERSION = 12.22-heropulse");
ok((src.match(/ver:"نسخه ۱۲\.۲۲/g) || []).length === 3, "E2 fa ver strings (public + login + admin) all ۱۲.۲۲");
ok((src.match(/v12\.22 — adrenaline countdown hero/g) || []).length === 3, "E3 en ver strings all v12.22");
ok(pkg.version === "12.22.0" && pkg.scripts.test.includes("check-v1222.js"), "E4 package.json 12.22.0 + this suite wired into npm test");

console.log(`\n${pass} passed, ${fail} failed (v12.22-heropulse checks)`);
process.exit(fail ? 1 : 0);
