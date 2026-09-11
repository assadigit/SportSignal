// Self-check: v12.23-watermark — three user asks (watermark gates rolled to v12.24-brandhead:
//   1) "Can you add the expanded logo of clubs in lower opacity on the
//      background of the next big upcoming match? something like this:
//      [faded logo big on background] [club logo] club name."
//   2) the heartbeat-scrollbar bug — "when user doesnt move anything, every
//      few seconds the page moves, a scroll appears … like a heartbeating
//      bug that causes scroll to show up, and in mobile there is a
//      transition slide every few seconds" (the unclipped ±140% sweep).
//   3) "the results of match must be aligned … Actually check alignment of
//      every part. everything must be aligned. (notice how match results
//      aren't in the same line)"
const fs = require("fs");
const src = fs.readFileSync("src/worker.ts", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.error("  ✗ FAIL: " + name); }
}

console.log("A) giant faded club crests behind the countdown hero");
ok(src.includes('.hero-wm{position:absolute;inset:0;z-index:0;border-radius:15px;overflow:hidden;pointer-events:none}'), "A1 the watermark layer — full-card, z:0 (under fx and content), clipped, pointer-transparent");
ok(src.includes('.hero-wm img{position:absolute;top:52%;width:320px;height:320px;object-fit:contain;opacity:.4;filter:brightness(1.28) saturate(1.05);transform:translateY(-50%)}'), "A2 (v12.24 roll) each crest is FAR bolder — 320px at 0.40 opacity (the user: \"like 40% of the logo appear in the bg, but bigger and more prominent\")");
ok(src.includes('.hero-wm img:first-child{inset-inline-start:-48px}') && src.includes('.hero-wm img:last-child{inset-inline-end:-48px}'), "A3 (v12.24) more edge bleed (-48px) — the bigger crests feel EXPANDED, cropped by the clipped layer (logical inline edges — RTL/LTR safe)");
ok(src.includes('<div class="hero-wm" aria-hidden="true"><img alt="" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'"><img alt="" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'"></div>'), "A4 static markup OUTSIDE #heroSpot (survives re-renders, like the ember layer) + broken-crest fallback");
ok(src.includes("function heroWm(card, m){") && src.includes("heroWm(card, m);") && src.includes("var c0 = m && m.homeTeam && m.homeTeam.crest, c1 = m && m.awayTeam && m.awayTeam.crest;"), "A5 heroWm() swaps the two crest srcs per match from renderHeroSpot (barTarget — the match being counted down to)");
ok(src.includes('wm.style.display = (c0 || c1) ? "" : "none";') && src.includes("imgs[i].removeAttribute(\"src\"); imgs[i].style.display = \"none\";"), "A6 a club without a crest hides its watermark; no crest at all hides the layer");
ok(src.includes('[data-theme="light"] .hero-wm img{opacity:.4;filter:none}') && src.includes('@media (max-width:600px){.hero-wm img{width:210px;height:210px;opacity:.4}'), "A7 (v12.24 roll) light-theme .40 unfiltered + phone variant 210px at .40 — plus the readability scrim .hero-wm::after radial + the team-name text-shadow");

console.log("B) the heartbeat-scrollbar bug — fx can never widen the page");
ok(src.includes('.hero-fx::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 32%,rgba(255,255,255,.05) 44%,rgba(255,255,255,.13) 50%,rgba(255,255,255,.05) 56%,transparent 68%);transform:translateX(-140%);animation:hero-sweep 6.5s cubic-bezier(.55,0,.45,1) infinite}'), "B1 the floodlight sweep now rides the CLIPPED .hero-fx layer (same gradient, same rhythm)");
ok(!src.includes('.card.bighero::after{content:""'), "B2 the old UNCLIPPED .card.bighero::after sweep (the ±140% escape that popped a scrollbar every 6.5s) is GONE");
ok(src.includes("html{overflow-x:hidden}"), "B3 root-level overflow-x clip — the hard net so no fx can ever widen the page again");
ok(src.includes(".bighero .match{overflow:hidden}"), "B4 the face-off ±34px entrance overshoot is clipped inside the hero row (the other periodic width spike)");
ok(src.includes('#bigHeroCard[data-urgent="soon"] .hero-fx::after{animation-duration:4.2s}') && src.includes('#bigHeroCard[data-urgent="final"] .hero-fx::after{animation-duration:3s}') && src.includes('#bigHeroCard[data-urgent="live"] .hero-fx::after{animation-duration:2.2s}'), "B5 the escalation ladder retargets the sweep through the clipped layer (soon 4.2s / final 3s / live 2.2s)");
ok(src.includes(".hero-fx{position:absolute;inset:0;z-index:1;border-radius:15px;overflow:hidden;pointer-events:none}"), "B6 the clipped ember/fx layer itself is untouched (overflow:hidden + radius)");

console.log("C) every match row aligned (the score sits on ONE line)");
ok(src.includes(".side{display:flex;align-items:center;gap:8px;flex:1 1 0;min-width:0;flex-wrap:nowrap}"), "C1 both sides share the row EXACTLY 50/50 (flex-basis 0 — was content-width auto, which made the score wander)");
ok(src.includes(".score{font-weight:800;font-size:17px;color:var(--score);flex:0 0 72px;text-align:center;white-space:nowrap;font-variant-numeric:tabular-nums}"), "C2 the score is a FIXED CENTERED slot (72px, centered, tabular) — every result sits at the same x line");
ok(src.includes(".score{font-size:15px;flex-basis:56px}"), "C3 the phone score slot (56px at 15px font) keeps rows identical on mobile");
ok(src.includes(".info{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;font-size:12.5px;color:var(--muted);margin-top:6px;text-align:center}"), "C4 the finished card's info line now matches the spot boxes — ONE centered chip-line style page-wide");
ok(src.includes('.uclspot-info{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;font-size:12.5px;color:var(--muted);text-align:center}'), "C5 .uclspot-info brought to the same 12.5px size — one aligned system");
ok(src.includes(".scorers{flex:1 1 100%;margin-top:8px;"), "C6 the scorers block spans its own full line inside the info flex row");
ok(src.includes(".wrap:last-child .match,.mrow:last-child .match{border-bottom:none}"), "C7 the finished card's LAST row loses its divider too (was .wrap-only)");
ok((src.match(/row\.appendChild\(vs\); row\.appendChild\(as\);/g) || []).length === 2, "C8 the stray double-append in render() is gone (exactly the 2 legitimate score branches remain — spotItemNode + render; it crashed on unscored rows via appendChild(undefined))");

console.log("D) version bump");
ok(src.includes('const VERSION = "12.24-brandhead";'), "D1 VERSION = 12.24-brandhead");
ok((src.match(/ver:"نسخه ۱۲\.۲۴/g) || []).length === 3, "D2 fa ver strings (public + login + admin) all ۱۲.۲۴");
ok((src.match(/v12\.24 — brand header/g) || []).length === 3, "D3 en ver strings all v12.24");
ok((src.match(/نسخه ۱۲\.۲۴/g) || []).length === 4, "D4 fa ver strings + the admin static footer = 4 spots");
ok(pkg.version === "12.24.0" && pkg.scripts.test.includes("check-v1223.js"), "D5 package.json 12.24.0 + this suite wired into npm test");

console.log(`\n${pass} passed, ${fail} failed (v12.23-watermark checks)`);
process.exit(fail ? 1 : 0);
