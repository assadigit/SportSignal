// Self-check: v12.28-herostage — the user's four asks:
//   1) "Video still doesnt play. (it's just a picture) - on chrome" —
//      root cause was DOUBLE: (a) the stage was tuned so dim (video at
//      .42 + a .58/.34 scrim over a clip whose own motion is ~4%
//      per-channel frame deltas) that a PLAYING video was visually a
//      still, and (b) prefers-reduced-motion users got an explicit
//      hv.pause() — a frozen first frame. Fix: the video runs at .78
//      with a light .38/.18 scrim (light theme .44/.26), the RM pause
//      is RETIRED (the user asked twice, unconditionally), muted is set
//      as a JS PROPERTY as well as the attribute, and the whole kicker
//      ladder (boot / canplay / loadeddata / visibility / first gesture
//      / 5s×6 retry) stays.
//   2) "<span class=\"countdown\">🕒 ۱۹:۰۰</span> this must be bigger for
//      next big upcoming match. make it considerably larger." — the
//      hero's kickoff chip is now a display-size element (24px PC /
//      20px phones, weight 800, own plate + ring + shadow) in an
//      auto-sized center slot; the hero's live score takes the same
//      size; the hero's info line runs one step larger.
//   3) "Also add these below it: <div class=\"uclspot-info\">…" — the
//      comp-logo + derby + date/time + share line is asserted to render
//      AFTER the match row inside the hero spotitem (DOM order), and
//      under the new phone layout it sits below the time line.
//   4) "still reduce opacity of CLub's logo on the background by 20%" —
//      crest watermarks .196 → .157 (dark, light AND the phone rule).
//      Plus: "find out why the place is limited in mobile mode, so a
//      club name like Manchester United, became two rows" — phone match
//      rows are FACE-OFF columns now (crest above its centered name,
//      time/score on its own centered line via flex order), padding
//      trimmed around the row.
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../src/worker.ts"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"));
let pass = 0, fail = 0;
function ok(cond, label){ if(cond){ pass++; console.log("  ✔ " + label); } else { fail++; console.log("  ✘ " + label); } }

console.log("A) VIDEO — the stage must visibly MOVE and always autoplay");
ok(src.includes('opacity:.78;filter:saturate(1.18) brightness(1.02)'), "A1 the video runs at .78 with a livelier filter (was .42 + brightness .92)");
ok(src.includes('.hero-video::after{content:"";position:absolute;inset:0;background:linear-gradient(168deg,rgba(2,6,23,.38),rgba(2,6,23,.18))}'), "A2 dark scrim lightened .58/.34 → .38/.18");
ok(src.includes('[data-theme="light"] .hero-video::after{background:linear-gradient(168deg,rgba(248,250,252,.44),rgba(248,250,252,.26))}'), "A3 light scrim lightened .66/.5 → .44/.26");
ok(!src.includes('if(RM){ hv.pause(); return; }') && !src.includes('var RM = !!(window.matchMedia'), "A4 the prefers-reduced-motion hard-pause is RETIRED (autoplay wins, the user's twice-repeated ask)");
ok(src.includes('try{ hv.muted = true; }catch(e){}'), "A5 muted set as a JS PROPERTY too (Safari's autoplay gate reads the property)");
ok(src.includes('hv.addEventListener("canplay", kick);') && src.includes('hv.addEventListener("loadeddata", kick);'), "A6 the kicker ladder stays (canplay + loadeddata)");
ok(src.includes('["pointerdown","keydown","touchstart"].forEach(function(ev){') && src.includes('}, 5000);'), "A7 first-gesture unlock + the 5s×6 retry ladder stay");
ok(src.includes('<video src="/hero-stage.mp4" autoplay muted loop playsinline preload="auto"'), "A8 the attribute trio unchanged (autoplay + muted + loop + playsinline)");
ok(src.includes('.bighero .bigbar{margin:0 0 12px;padding:2px 2px 8px;background:linear-gradient(90deg,rgba(2,6,23,.46)'), "A9 the countdown bar keeps its own scrim plate (live text never sits bare on the busier stage)");
ok(src.includes('background:var(--rowsurf)'), "A10 the match rows keep their own surface plate");

console.log("B) BIG HERO COUNTDOWN — the next-big-match time is the headline");
ok(src.includes('.bighero .kick{flex:0 0 auto}'), "B1 the hero's center slot auto-sizes around the big chip (92px slot retired there)");
ok(src.includes('.bighero .kick .countdown{font-size:24px;font-weight:800;padding:8px 20px;'), "B2 the hero chip is 24px/800 on PC (13px elsewhere — scoped, not global)");
ok(src.includes('font-variant-numeric:tabular-nums;background:rgba(2,6,23,.34);box-shadow:inset 0 0 0 1px rgba(148,163,184,.30)'), "B3 the chip rides its own plate + hairline ring + drop shadow");
ok(src.includes('[data-theme="light"] .bighero .kick .countdown{background:rgba(248,250,252,.5);'), "B4 light-theme plate variant");
ok(src.includes('.bighero .score{font-size:24px;flex:0 0 auto;'), "B5 the hero's live score takes the same display size");
ok(src.includes('.bighero .uclspot-info{font-size:13.5px}'), "B6 the hero's info line runs one step larger (13.5px)");

console.log("C) INFO LINE BELOW — comp logo + derby + date + share under the chip");
const heroFn = src.indexOf('function spotItemNode(');
const itemAppend = src.indexOf('item.appendChild(row);', heroFn);
const infoAppend = src.indexOf('item.appendChild(info);', heroFn);
ok(heroFn > 0 && itemAppend > 0 && infoAppend > itemAppend, "C1 inside spotItemNode the match row is appended BEFORE its info line (row → info DOM order)");
ok(src.includes('kc.className = "countdown"; kc.textContent = fmtKick(m.utcDate);'), "C2 the time chip is built from fmtKick (🕒 HH:MM in the user's tz)");
ok(src.includes('info.appendChild(sr);') && src.indexOf('function shareRow(') > 0, "C3 the share ⋯ control rides the info line (WhatsApp/Telegram/Email/gcal/copy)");
ok(src.includes('cimg.className="complogo"') || src.includes('cimg.className = "complogo"'), "C4 the comp chip carries the league logo");
ok(src.includes('db.className = "derbybadge"'), "C5 the 🔥 derby badge rides the info line");

console.log("D) CREST WATERMARKS — 20% fainter (.196 → .157)");
ok(src.includes('object-fit:contain;opacity:.157;transform:translateY(-50%)'), "D1 base watermark opacity .157");
ok(src.includes('[data-theme="light"] .hero-wm img{opacity:.157}'), "D2 light theme .157");
ok(src.includes('.hero-wm img{width:210px;height:210px;opacity:.157}'), "D3 phone rule .157");
ok(!src.includes('opacity:.196'), "D4 no .196 remnant anywhere");

console.log("E) PHONE ROWS — no more two-row club names");
ok(src.includes('.match .side{order:1;flex-direction:column;align-items:center;gap:3px}'), "E1 sides become columns (crest above its name) at ≤600px");
ok(src.includes('.match .side.away{flex-direction:column-reverse}'), "E2 the away side mirrors (logo on top, name below — symmetric face-off)");
ok(src.includes('.match .kick,.match .score{order:2;flex:1 1 100%;margin-top:2px}'), "E3 time/score move to their OWN centered line below (flex order)");
ok(src.includes('.match .side .team{flex:0 0 auto;width:100%;min-width:0;text-align:center;'), "E4 names are centered full-side-width, never a 55px sliver");
ok(src.includes('.match{flex-wrap:wrap;gap:6px;padding:6px 2px}'), "E5 row padding/gap trimmed (10px 6px/8 → 6px 2px/6)");
ok(src.includes('.bighero .kick .countdown{font-size:20px;padding:6px 16px;'), "E6 the hero's big chip is 20px on phones, centered on the time line");
ok(!src.includes('.score{font-size:15px;flex-basis:80px}') && !src.includes('.kick{flex:0 0 80px}'), "E7 the old fixed 80px phone slots retired");
ok(src.includes('@media (min-width:601px) and (max-width:900px){'), "E8 the NARROW-PC band (601–900px) exists — the 2x hero crests + big chip squeezed names to ~50px there even before this release");
ok(src.indexOf('@media (min-width:601px) and (max-width:900px)') > src.indexOf('.bighero .kick .countdown{font-size:24px'), "E9 the mid-band block comes AFTER the big-chip rules (same-specificity source-order duel — measured 1-line names at 601/768/900)");

console.log("F) VERSION + ROLLING GATES");
ok(src.includes('const VERSION = "12.28-herostage";'), "F1 VERSION = 12.28-herostage");
ok((src.match(/ver:"نسخه ۱۲\.۲۸ — صحنهٔ ویدیویی/g) || []).length === 3, "F2 fa ver strings (public + login + admin dicts) all ۱۲.۲۸");
ok((src.match(/data-i="ver">نسخه ۱۲\.۲۸ — صحنهٔ ویدیویی/g) || []).length === 1, "F3 the static footer ver div ۱۲.۲۸");
ok((src.match(/ver:"v12\.28 — the video stage/g) || []).length === 3, "F4 en ver strings all v12.28");
ok(pkg.version === "12.28.0" && pkg.scripts.test.includes("check-v1228.js"), "F5 package.json 12.28.0 + this suite wired into npm test");

console.log(`\n${pass} passed, ${fail} failed (v12.28-herostage checks)`);
process.exit(fail ? 1 : 0);
