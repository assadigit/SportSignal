// Self-check: v12.26-herostage — the user's asks:
//   1) "In lightmode logo works, but in darkmode it turns to a white
//      sillohuette. fix this. show the given logo in both light and dark
//      mode. reduce the size of logo in pc view by 40%" — the white-remap
//      swap is retired (logo-light.png deleted), the uploaded png rides
//      BOTH themes, PC 84px → 50px (a 40% cut).
//   2) "reduce the opacity of background logos by 30% (it's still too
//      visible)" — the hero crests drop .28 → .196 on both themes + phones.
//   3) "remove this tag from UCL box : <span class=comp>…لیگ قهرمانان
//      اروپا</span> because it's redundant since that box is already UCL
//      dedicated" — the UCL box's rows drop the per-row league chip.
//   4) "use the given video as background for the next big upcoming match.
//      with this layers: A.deepest layer : Video > B> background logos >
//      C> css effects > D> actual data (surface)" — the VIDEO STAGE with
//      the exact z-ladder; "the تماس با ما and درباره ما must be right
//      aligned. currently they're center aligned" — start-aligned nav +
//      footer; "turn the text of this button … عضویت در ربات تلگرام" —
//      the new CTA; "instead of showing this: «آخرین به‌روزرسانی: همین
//      حالا» show a truthful API call update like: آخرین به روز رسانی:
//      جمعه 21:30 شب" — the truthful absolute stamp.
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../src/worker.ts"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"));
let pass = 0, fail = 0;
function ok(cond, label){ if(cond){ pass++; console.log("  ✔ " + label); } else { fail++; console.log("  ✘ " + label); } }

console.log("A) the VIDEO STAGE — the user's layer ladder (video › logos › fx › data)");
ok(src.includes('<div class="hero-video" aria-hidden="true"><video src="/hero-stage.mp4" autoplay muted loop playsinline preload="auto" tabindex="-1" disablepictureinpicture referrerpolicy="no-referrer"></video></div>'), "A1 layer A: the video div is the hero card's FIRST child — the user's mp4 at /hero-stage.mp4, autoplay + muted + loop + playsinline (autoplay-safe), tabindex -1");
ok(fs.existsSync("assets/hero-stage.mp4") && fs.statSync("assets/hero-stage.mp4").size > 600000, "A2 the 645KB mp4 actually lives in the worker's [assets] directory (served before the worker runs)");
ok(src.includes('.hero-video{position:absolute;inset:0;z-index:0;border-radius:16px;overflow:hidden;pointer-events:none;background:transparent}'), "A3 (v12.27 roll) .hero-video: deepest layer, z:0, clipped to the card's radius, pointer-transparent");
ok(src.includes('.hero-video video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.78;filter:saturate(1.18) brightness(1.02)}'), "A4 (v12.28 roll) the video runs at .78 — a PLAYING stage is VISIBLE now (was .42 + brightness .92 = a still, per the user's chrome report)");
ok(src.includes('.hero-video::after{content:"";position:absolute;inset:0;background:linear-gradient(168deg,rgba(2,6,23,.38),rgba(2,6,23,.18))}') && src.includes('[data-theme="light"] .hero-video::after{background:linear-gradient(168deg,rgba(248,250,252,.44),rgba(248,250,252,.26))}'), "A5 (v12.28 roll) a LIGHT theme-aware scrim (.38/.18 dark, .44/.26 light) — live text keeps its own plates so the data still reads");
ok(src.includes('.hero-wm{position:absolute;inset:0;z-index:1;'), "A6 layer B: the background crests (.hero-wm) sit at z:1 — ABOVE the video, below the fx");
ok(src.includes('.hero-fx{position:absolute;inset:0;z-index:2;'), "A7 layer C: the css effects (sweep + embers) sit at z:2 — above the crests, below the data");
ok(src.includes('.hero-data{position:relative;z-index:3}') && src.includes('<div class="hero-data">') && src.indexOf('<div class="hero-data">') < src.indexOf('<div id="bigbar"'), "A8 layer D: .hero-data (z:3) wraps the countdown bar + the match row — the data is the SURFACE, exactly the user's ladder");
ok(src.indexOf('<div class="hero-video"') < src.indexOf('<div class="hero-fx"') && src.indexOf('<div class="hero-fx"') < src.indexOf('class="hero-wm"') && src.indexOf('class="hero-wm"') < src.indexOf('<div class="hero-data">'), "A9 DOM order = the user's ladder: video first, then fx, then crests, then the data surface");
ok(src.includes('document.querySelector(".hero-video video")') && src.includes('try{ hv.muted = true; }catch(e){}'), "A10 (v12.28 roll) autoplay WINS under reduce-motion too (the user asked twice) — muted set as a JS property; no hv.pause() left");

console.log("B) the original logo on BOTH themes + PC −40%");
ok(src.includes('<a class="brand" href="/" aria-label="SportSignal"><img src="/logo.png" alt="SportSignal" width="146" height="50" referrerpolicy="no-referrer"></a>'), "B1 ONE logo img — the uploaded /logo.png with fixed width/height attrs (zero CLS); no second variant");
ok(!src.includes('brand-ink') && !src.includes('brand-white') && !src.includes('src="/logo-light.png"'), "B2 the two-variant swap is RETIRED — no brand-ink/brand-white classes, no /logo-light.png reference in markup (the dark-mode white silhouette is gone)");
ok(!fs.existsSync("assets/logo-light.png") && fs.existsSync("assets/logo.png"), "B3 the white remap png is DELETED from assets; the original stays");
ok(src.includes('.brand img{display:block;height:50px;width:auto;transition:transform .15s cubic-bezier(.16,1,.3,1)}'), "B4 PC size TRIMMED 40%: 84px → 50px (the user's ask); phones were already 50px — one size, no theme swap rule left");
ok((src.match(/\[data-theme="light"\] \.brand/g) || []).length === 0, "B5 zero [data-theme] brand rules — the SAME logo file rides light and dark, unchanged");

console.log("C) background crests — one more 30% cut");
ok(src.includes('.hero-wm img{position:absolute;top:52%;width:320px;height:320px;object-fit:contain;opacity:.157;transform:translateY(-50%)}'), "C1 (v12.27 roll) dark: .157 (imgs unfiltered — the brightness moved to the clipped .hero-wm layer), same big 320px canvas");
ok(src.includes('[data-theme="light"] .hero-wm img{opacity:.157}') && src.includes('[data-theme="light"] .hero-wm{filter:none}'), "C2 (v12.27 roll) light: .157, the filter moved to the clipped layer");
ok(src.includes('@media (max-width:600px){.hero-wm img{width:210px;height:210px;opacity:.157}'), "C3 phones: 210px at .157");
ok((src.match(/opacity:\.157/g) || []).length === 3, "C4 exactly three .157 rules (dark + light + phone) — no stray .28 left");

console.log("D) the UCL box's redundant league tag retired");
ok(src.includes('if(!(opts && opts.noComp)){'), "D1 spotItemNode guards the competition chip behind opts.noComp");
ok(src.includes('el.appendChild(spotItemNode(m, idx, {noComp:true}));'), "D2 renderUclSpot passes noComp — the UCL-dedicated box's rows carry NO «لیگ قهرمانان اروپا» chip (its heading already says it)");
ok((src.match(/el\.appendChild\(spotItemNode\(m, idx \+ 1\)\);/g) || []).length === 1 && (src.match(/el\.appendChild\(spotItemNode\(m, 0\)\);/g) || []).length === 1, "D3 the topspot box AND the hero still render their rows unguarded — mixed-competition boxes KEEP the informative chip");
ok((src.match(/var c = document\.createElement\("span"\); c\.className = "comp";/g) || []).length === 2, "D4 BOTH chip builders keep their construction code (render() + the guarded spotItemNode) — only the UCL box skips RENDERING it");

console.log("E) right-aligned about/contact (start edge)");
ok(src.includes('footer{text-align:start;color:var(--footer);font-size:12px;margin-top:28px;line-height:2}'), "E1 the footer block aligns to the START edge — right on the RTL page (was centered)");
ok(src.includes('.footnav{display:flex;justify-content:flex-start;align-items:center;gap:2px;flex-wrap:wrap;margin:0 0 8px}'), "E2 the phone footer's خانه/درباره/تماس row packs to the start (right on RTL)");
ok(src.includes('.mainnav{display:flex;order:3;flex:1 1 100%;justify-content:flex-start;align-items:center;gap:2px}') && src.includes('.mainnav{display:flex;flex:1 1 auto;justify-content:flex-start;align-items:center;gap:2px;min-width:0}'), "E3 the PC header nav aligns to the start on BOTH breakpoints — hugging the logo, no longer centered");
ok((src.match(/justify-content:flex-start/g) || []).length === 3, "E4 exactly three flex-start rules (header mid + header wide + footer nav) — nothing else was disturbed");

console.log("F) the join button «عضویت در ربات تلگرام»");
ok((src.match(/join:"عضویت در ربات تلگرام"/g) || []).length === 3, "F1 fa join key = «عضویت در ربات تلگرام» in all THREE dicts (public + admin + static)");
ok((src.match(/join:"Join the Telegram bot"/g) || []).length === 3, "F2 en join key = \"Join the Telegram bot\" in all three dicts");
ok(src.includes('data-i="join">عضویت در ربات تلگرام</a>') && src.includes('<span data-i="join">عضویت در ربات تلگرام</span>'), "F3 BOTH static CTAs updated — the header pill and the sticky bottom bar");
ok(!src.includes("در تلگرام به ربات بپیوندید"), "F4 the old long label is gone everywhere (fa dicts + markup)");

console.log("G) the TRUTHFUL update stamp");
ok(src.includes('const poolMeta = matches ? await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null) : null;') && src.includes('data.fetchedAt = (poolMeta && poolMeta.fetchedAt) || new Date().toISOString();'), "G1 server: the payload's fetchedAt is the upstream pool's REAL stamp (read from the KV pool after the sweep), not the request clock");
ok(src.includes('ucl, fetchedAt: null };'), "G2 the payload starts stamp-null and is patched to the truthful stamp BEFORE the KV write/return");
ok(src.includes('function fmtStamp(ts){') && src.includes('var per = (h < 5 || h >= 19) ? "شب" : (h < 12 ? "صبح" : (h < 16 ? "ظهر" : "عصر"));'), "G3 fmtStamp: weekday + HH:MM + a Persian period word (صبح/ظهر/عصر/شب) — «جمعه ۲۱:۳۰ شب» exactly like the user's example");
ok(src.includes('el.textContent = fmt("lastUpd", fmtStamp(SYNC_TS));'), "G4 renderSync prints the ABSOLUTE stamp through the lastUpd template");
ok(!src.includes("syncJust") && !src.includes("syncMinAgo") && !src.includes("syncHourAgo") && !src.includes("syncDayAgo"), "G5 the relative-age keys are RETIRED — «همین حالا» can never show again");
ok(src.includes('faNum(t)') && src.includes('toLocaleDateString("fa-IR",{weekday:"long",timeZone:curTz()})'), "G6 fa renders Persian digits + the fa-IR weekday in the user's SELECTED timezone; en renders \"Friday 21:30\"");

console.log("H) version + wiring");
ok(src.includes('const VERSION = "12.28-herostage";'), "H1 VERSION = 12.26-herostage");
ok((src.match(/ver:"نسخه ۱۲\.۲۸ — صحنهٔ ویدیویی/g) || []).length === 3, "H2 (v12.27 roll) fa ver strings (public + admin + static dicts) all ۱۲.۲۷");
ok((src.match(/data-i="ver">نسخه ۱۲\.۲۸/g) || []).length === 1, "H3 the static footer ver div ۱۲.۲۶");
ok((src.match(/ver:"v12\.28 — the video stage/g) || []).length === 3, "H4 en ver strings all v12.26");
ok(pkg.version === "12.28.0" && pkg.scripts.test.includes("check-v1226.js"), "H5 package.json 12.28.0 + this suite wired into npm test");

console.log(`\n${pass} passed, ${fail} failed (v12.26-herostage checks)`);
process.exit(fail ? 1 : 0);
