// Self-check: v12.27-fixpack — the user's asks:
//   0) "the background video doesnt play it must be auto play" — the
//      attribute trio stays AND a heroVideoKick() driver re-tries play()
//      at boot / canplay / visibility / first gesture / a 5s×6 ladder.
//   Review items 1–10:
//   1) hero crest bleed — overflow:hidden on the card itself at its own
//      16px radius, the aura moved to .herowrap::before, the img filter
//      moved to the .hero-wm layer (WebKit filter-escape neutralized),
//      the countdown bar's scrim + clock text-shadow back.
//   2) star graphic over the standings — tiles dimmed .05→.028 /
//      .07→.04 and the .ucl-stand body is opaque, so the tiles sit
//      strictly behind the table content.
//   3) utility icon cluster — ONE grouped .tb-btns (6px gap + shell),
//      anchored to the logical inline end via inset-inline-start:auto on
//      .head-actions; the uneven-gap margin-inline-start:auto on
//      .tb-btns retired.
//   4) compact standings Pts column header — .sthead + T("thPts").
//   5) صدر جدول tag → the SUCCESS token (green), not red.
//   6) winner score digits bolded (scoreNode b/.lose).
//   7) 44×44px touch targets on the theme/lang/settings icon buttons.
//   8) Latin club names isolated — <bdi dir="ltr"> via nameInto().
//   9) ONE shared match-card surface — background:var(--rowsurf) on
//      .mrow/.spotitem everywhere.
//  10) semantic status tokens — --t-primary/success/warning/highlight/
//      danger/neutral, every tag mapped onto them.
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../src/worker.ts"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"));
let pass = 0, fail = 0;
function ok(cond, label){ if(cond){ pass++; console.log("  ✔ " + label); } else { fail++; console.log("  ✘ " + label); } }

console.log("A) VIDEO AUTOPLAY — the kicker (the user: \"it must be auto play\")");
ok(src.includes('var heroVideoKick = function(){'), "A1 heroVideoKick defined and");
ok(src.includes('heroVideoKick();'), "A2 …invoked at boot, right after the reduced-motion guard");
// v12.28 superseded: the reduced-motion hard-pause is RETIRED (the user asked twice that the video autoplay unconditionally) — asserted strictly in check-v1228.js.
ok(src.includes('var hv = document.querySelector(".hero-video video");') && !src.includes('if(RM){ hv.pause(); return; }'), "A3 (v12.28) the reduced-motion pause is GONE — autoplay wins");
ok(src.includes('hv.addEventListener("canplay", kick);') && src.includes('hv.addEventListener("loadeddata", kick);'), "A4 play() re-attempted on canplay + loadeddata");
ok(src.includes('document.addEventListener("visibilitychange", function(){ if(!document.hidden) kick(); });'), "A5 play() re-attempted when the tab becomes visible");
ok(src.includes('["pointerdown","keydown","touchstart"].forEach(function(ev){'), "A6 the FIRST pointer/key/touch gesture unlocks play (once, passive)");
ok(src.includes('if(hv.paused){ kick(); if(++tries >= 6) clearInterval(iv); }') && src.includes('}, 5000);'), "A7 a 5s retry ladder (6 tries) while the video sits paused");
ok(src.includes('<video src="/hero-stage.mp4" autoplay muted loop playsinline preload="auto" tabindex="-1"'), "A8 the attribute trio unchanged (autoplay + muted + loop + playsinline)");

console.log("B) HERO CLIP (review item 1) — crest constrained to the card's bounds");
ok(src.includes('.card.bighero{position:relative;overflow:hidden;border-radius:16px;margin:0;'), "B1 the card itself clips (overflow:hidden) at its OWN 16px radius");
ok(src.includes('.herowrap{position:relative;margin:14px 0}'), "B2 .herowrap owns the card's old margin (spacing identical)");
ok(src.includes('.herowrap::before{content:"";position:absolute;inset:0;border-radius:16px;pointer-events:none;box-shadow:0 0 40px rgba(5,150,105,.24);'), "B3 the heartbeat AURA lives on the wrapper (a child's outer shadow would be clipped)");
ok(src.includes('.card.bighero::before{content:"";position:absolute;inset:0;border-radius:16px;pointer-events:none;box-shadow:inset 0 0 64px rgba(16,185,129,.10);'), "B4 the card's ::before keeps only the INNER emerald wash");
ok(src.includes('<div class="herowrap">') && src.indexOf('<div class="herowrap">') < src.indexOf('id="bigHeroCard"'), "B5 the markup wraps the hero card");
ok(src.includes('#topbar,.herowrap,footer{grid-column:1/-1}'), "B6 the ≥1440 grid spans the wrapper (the card is no longer the grid item)");
ok(src.includes('var hw = card.parentNode;') && src.includes('hw.classList.contains("herowrap") && hw.dataset.urgent !== urgent) hw.dataset.urgent = urgent;', ), "B7 updateBigBar mirrors data-urgent onto the wrapper (ladder drives both pseudos)");
ok(src.includes('.herowrap[data-urgent="soon"]::before{box-shadow:0 0 46px rgba(245,158,11,.26);animation-duration:1.7s}'), "B8 the escalation ladder's outer glow selectors follow the wrapper");
ok(src.includes('.hero-wm{position:absolute;inset:0;z-index:1;border-radius:16px;overflow:hidden;pointer-events:none;filter:brightness(1.28) saturate(1.05)}'), "B9 the crest filter MOVED to the .hero-wm layer (a filtered child can escape WebKit border-radius clipping; a filtered container clips its own children)");
// v12.28 superseded: the watermark opacity dropped another 20% (.196 → .157, the user's ask) — strictly asserted in check-v1228.js.
ok(src.includes('.hero-wm img{position:absolute;top:52%;width:320px;height:320px;object-fit:contain;opacity:.1'), "B10 (v12.28) the imgs stay unfiltered (opacity now .157, same canvas)");
ok(src.includes('[data-theme="light"] .hero-wm{filter:none}'), "B11 light theme: the layer filter off");
ok(src.includes('.bighero .bigbar{margin:0 0 12px;padding:2px 2px 8px;background:linear-gradient(90deg,rgba(2,6,23,.46),rgba(2,6,23,.18) 16%'), "B12 the countdown bar's scrim is back (clock + ۸۸٪ no longer sit on the artwork)");
ok(src.includes('.bighero .bigbar-clock{text-shadow:0 1px 10px rgba(2,6,23,.55)}'), "B13 the clock carries a text-shadow");

console.log("C) FAINT STARS (review item 2) — behind the standings, ~3-4%");
ok((src.match(/fill='%23ffffff' fill-opacity='\.028'/g) || []).length === 2, "C1 dark star-tiles dimmed .05 → .028 (uclspot + uclcard)");
ok((src.match(/fill='%230e2058' fill-opacity='\.04'/g) || []).length === 2, "C2 light star-tiles dimmed .07 → .04");
ok(!src.includes("fill-opacity='.05'") && !src.includes("fill-opacity='.07'"), "C3 no star tile runs at the old opacities");
ok(src.includes('.ucl-stand{max-height:360px;overflow-y:auto;border:1px solid var(--border);border-radius:12px;padding:6px 10px;background:rgba(15,23,42,.72)}'), "C4 the UCL table body is OPAQUE dark (was .45 translucent — the tiles bled through the rows)");
ok(src.includes('[data-theme="light"] .ucl-stand{background:rgba(248,250,252,.78)}'), "C5 light table body opaque too");

console.log("D) UTILITY CLUSTER + TOUCH TARGETS (review items 3+7)");
ok(src.includes('.head-actions{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-inline-start:auto}'), "D1 the whole action group anchors to the LOGICAL inline end (inset-inline via margin-inline-start:auto)");
ok(src.includes('.tb-btns{display:inline-flex;align-items:center;gap:6px;padding:3px;border-radius:14px;background:var(--hover);border:1px solid var(--glass-border)}'), "D2 ONE grouped control: 6px internal gap + a subtle shell");
ok(!src.includes('.tb-btns{display:flex;gap:8px;align-items:center;margin-inline-start:auto}'), "D3 the uneven-gap culprit (auto margin inside the group) is GONE");
ok(src.includes('.tb-btns button{min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;'), "D4 every icon button: a 44×44px hit area, icon visually unchanged");
ok(!src.includes('.tb-btns{margin-inline-start:0}'), "D5 the dead ≥1440 tb-btns margin override retired");
ok(src.includes('.mrow,.spotitem{border:1px solid var(--border);border-radius:14px;padding:10px 12px;margin:0 0 10px;background:var(--rowsurf);'), "D6 (item 9) the SHARED match-card surface on .mrow/.spotitem — one treatment across hero/topspot/ucl/week/results");
ok(src.includes('.mrow:hover,.spotitem:hover{filter:brightness(1.07);border-color:rgba(37,99,235,.4)}'), "D7 hover brightens OVER the surface (no bg-swap that drops it)");
ok(src.includes('--rowsurf:rgba(15,23,42,.42);') && src.includes('--rowsurf:rgba(241,245,249,.72);'), "D8 the --rowsurf token defined on BOTH themes");

console.log("E) PTS HEADER + GREEN TAG + WINNER SCORES (review items 4+5+6)");
ok(src.includes('var th = document.createElement("div"); th.className = "sthead";') && src.includes('thp.textContent = T("thPts");'), "E1 every compact .stbox renders the Pts column header (امتیاز / Pts)");
ok(src.includes('.sthead{display:flex;align-items:center;gap:6px;padding:0 2px 3px;border-bottom:1px solid var(--border)}') && src.includes('.sthead-p{font-size:9.5px;font-weight:700;color:var(--muted);min-width:34px;text-align:end;flex-shrink:0}'), "E2 the header row rides the rows' own flex line, label end-aligned over the numbers");
ok(src.includes('.stpts{font-weight:800;flex-shrink:0;min-width:34px;text-align:end;font-variant-numeric:tabular-nums}'), "E3 .stpts locks the 34px end-aligned slot so label and numbers align");
ok(src.includes('--badge-top:var(--t-success);') && !src.includes('--badge-top:#b03a2e'), "E4 the صدر جدول tag carries the SUCCESS token — no red #b03a2e anywhere");
ok((src.match(/--badge-top:var\(--t-success\)/g) || []).length === 2, "E5 both themes' badge-top map to success");
ok(src.includes('.score b{font-weight:900;text-shadow:0 0 12px rgba(74,222,128,.45)}') && src.includes('.score .lose{font-weight:600;opacity:.55}'), "E6 winner digit <b> 900+glow, loser dimmed to .55");
ok(src.includes('function scoreNode(score){') && src.includes('document.createElement(h>a ? "b" : "span")'), "E7 ONE shared score builder (render + spotItemNode)");
ok(src.includes('scoreNode(m.score)') && (src.match(/scoreNode\(m\.score\)/g) || []).length === 2, "E8 both row anatomies use it");

console.log("F) LTR NAMES (review item 8)");
ok(src.includes('function nameInto(el, s){') && src.includes('b.setAttribute("dir","ltr"); b.textContent = s;'), "F1 nameInto() — the <bdi dir=\"ltr\"> wrap for Latin names");
ok(src.includes('nameInto(hName, en ? m.homeTeam.name') && src.includes('nameInto(aName, en ? m.awayTeam.name'), "F2 match rows (render + spotItemNode) route their team names through it");
ok((src.match(/nameInto\(hName/g) || []).length === 2, "F3 both renderers (mrow + spotitem) wrapped");
ok(src.includes('nameInto(n, curLang()==="en" ? t.name : (t.faName||t.name));'), "F4 the compact standings names wrapped");
ok(src.includes('nameInto(txt, curLang()==="en" ? t.name : (t.faName||t.name));'), "F5 the UCL table names wrapped");
ok(src.includes('nameInto(t1, en ? n.homeTeam.name') && src.includes('nameInto(t2, en ? n.awayTeam.name'), "F6 the cups box pair wrapped (spans, not one raw string)");
ok(src.includes('sb.setAttribute("dir","ltr"); sb.textContent = s.scorer;'), "F7 live scorers' Latin player names isolated too");
ok(src.includes('curLang()!=="en" && /[A-Za-z]/.test(s) && !/['), "F8 the wrap is fa-mode-only (EN page is LTR already)");

console.log("G) SEMANTIC STATUS TOKENS (review item 10)");
ok(src.includes('--t-primary:#2563eb;--t-success:#15803d;--t-success-ink:#4ade80;--t-success-soft:rgba(34,197,94,.14);--t-success-line:rgba(34,197,94,.35);--t-warning:#b45309;--t-highlight:#7e22ce;--t-danger:#f87171;--t-neutral:#334155;--t-neutral-soft:rgba(148,163,184,.14);'), "G1 the dark token set on :root");
ok(src.includes('--t-primary:#2563eb;--t-success:#15803d;--t-success-ink:#15803d;--t-success-soft:rgba(21,128,61,.12);--t-success-line:rgba(21,128,61,.32);--t-warning:#b45309;--t-highlight:#7e22ce;--t-danger:#dc2626;--t-neutral:#e2e8f0;--t-neutral-soft:rgba(15,23,42,.05);'), "G2 the light token set");
ok(src.includes('--badge-hot:var(--t-warning);--badge-derby:var(--t-highlight);--badge-league:var(--t-neutral);--badge-live:var(--t-success-ink)'), "G3 badge vars are token references");
ok(src.includes('.livechip{display:inline-flex;align-items:center;gap:6px;background:var(--t-success-soft);color:var(--t-success-ink);border:1px solid var(--t-success-line);'), "G4 the LIVE chip rides soft/ink/line success tokens");
ok(!src.includes('[data-theme="light"] .livechip{color:#15803d}'), "G5 the light livechip override retired (tokens are theme-aware)");
ok(src.includes('.cupdate .live-tag{color:var(--t-success-ink);font-weight:700}') && !src.includes('[data-theme="light"] .cupdate .live-tag'), "G6 the cups live-tag rides the token too");
ok(src.includes('.wkdone{color:var(--muted);font-weight:700;font-size:11.5px;background:var(--t-neutral-soft);'), "G7 wkdone on the neutral-soft token");
ok(src.includes('.venue{display:inline-block;background:var(--t-neutral-soft);'), "G8 venue on the neutral-soft token");
ok(src.includes('--danger:var(--t-danger);') && (src.match(/--danger:var\(--t-danger\)/g) || []).length === 2, "G9 --danger resolves through the token (both themes)");

console.log("H) VERSION (v12.28 superseded — strict 12.28 assertions live in check-v1228.js)");
ok(/const VERSION = "12\.2[78]-/.test(src), "H1 VERSION stays a 12.2x release tag");
ok((src.match(/ver:"نسخه ۱۲\.۲/g) || []).length >= 3, "H2 fa ver strings present (public + login + admin dicts)");
ok((src.match(/data-i="ver">نسخه ۱۲\.۲/g) || []).length === 1, "H3 the static footer ver div present");
ok((src.match(/ver:"v12\.2/g) || []).length >= 3, "H4 en ver strings present");
ok(pkg.scripts.test.includes("check-v1227.js"), "H5 this suite stays wired into npm test");

console.log(`\n${pass} passed, ${fail} failed (v12.27-fixpack checks)`);
process.exit(fail ? 1 : 0);
