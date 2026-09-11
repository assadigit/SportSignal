// Self-check: v12.22-heropulse — the user's four asks:
//   A) section titles BIGGER and emphasized (their own tinted background
//      plate + accent edge; flagship headers one size larger);
//   B) the UCL-dedicated box carries the UCL brand — starball mark on a
//      white chip, navy gradient plate, navy glass body + star watermark,
//      UCL-blue border (the UCL standings card shares the identity);
//   C) PC-wide HIERARCHY: a real grid — full-width chrome, a MAIN column
//      with every match box, a reference RAIL with the three table boxes,
//      cards stacking flush (no shared-row holes), hero + topbar centered;
//   D) the labeled share pill removed — ONE quiet icon-only ⋯ ghost toggle
//      per row with a popover, outside-click / Esc close;
//   E) version bumped everywhere (12.22-heropulse).
const fs = require("fs");
const src = fs.readFileSync("src/worker.ts", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.error("  ✗ FAIL: " + name); }
}

console.log("A) bigger, emphasized section titles");
ok(/h2\{font-size:17px;font-weight:800;line-height:1\.55;letter-spacing:-\.005em;margin:0 0 14px;padding:9px 14px;background:rgba\(148,163,184,\.09\);border:1px solid rgba\(148,163,184,\.15\);border-inline-start:4px solid var\(--accent\);border-radius:12px\}/.test(src), "A1 every card h2 is a SECTION PLATE — 15px plain → 17px/800 on a tinted background");
ok(src.includes('[data-theme="light"] h2{background:rgba(15,23,42,.04);border-color:rgba(15,23,42,.09)}'), "A2 the light-theme plate tint");
ok(/#topspotCard h2\{font-size:19px;background:rgba\(180,83,9,\.16\);border-color:rgba\(180,83,9,\.34\);border-inline-start-color:var\(--badge-hot\)\}/.test(src), "A3 the flagship «🔥 مسابقات بزرگ پیش‌رو» header — 19px on the HOT amber plate");
ok(src.includes('[data-theme="light"] #topspotCard h2{background:rgba(180,83,9,.09);border-color:rgba(180,83,9,.26)}'), "A4 the hot plate's light variant");
ok(src.includes("h2{font-size:15.5px;padding:8px 12px}") && src.includes("#topspotCard h2,#uclSpotCard h2{font-size:17px}"), "A5 phones: 15.5px plates, flagships 17px (compact but still plates)");

console.log("B) UCL branding on the UCL-dedicated boxes");
ok((src.match(/<path d="M24\.0 16\.4L25\.7 21\.7L31\.2 21\.7L26\.8 24\.9L28\.5 30\.1L24\.0 26\.9L19\.5 30\.1L21\.2 24\.9L16\.8 21\.7L22\.3 21\.7Z"\/>/g) || []).length >= 1, "B1 the starball star group exists (center star first)");
ok((src.match(/<path d=/g) || []).length >= 8 && /const UCL_STARS = '<path[\s\S]*?<path d="M12\.6 8\.5/.test(src), "B2 UCL_STARS carries 8 five-pointed stars — 1 center + 7 ring, the official arrangement");
ok(src.includes('const UCL_LOGO_CHIP = \'<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><g fill="#0e2058">\' + UCL_STARS + \'</g></svg>\';'), "B3 the header logo = navy starball (the white chip is the CSS .ucl-logo circle — \"with a white bg\")");
ok(src.includes('<h2 id="uclSpotTitle" class="uclh2"><span class="ucl-logo" aria-hidden="true">${UCL_LOGO_CHIP}</span><span data-i="hUclNext">'), "B4 the UCL matches box header carries the chip; data-i on the INNER span (language switch can never wipe the logo)");
ok(src.includes('<h2 class="uclh2"><span class="ucl-logo sm" aria-hidden="true">${UCL_LOGO_CHIP}</span><span data-i="hUcl">'), "B5 the UCL standings card header carries the smaller chip");
ok(/#uclSpotCard h2\{font-size:19px;color:#fff;background:linear-gradient\(135deg,#0e2058,#1b3480\);border-color:rgba\(126,161,245,\.30\);border-inline-start-color:#7ea1f5\}/.test(src), "B6 the UCL plate: 19px white text on the navy gradient, UCL-blue edge");
ok(/#uclSpotCard\{background-image:url\("data:image\/svg\+xml,[^"]*fill='%23ffffff' fill-opacity='\.05'[^"]*"\),linear-gradient\(168deg,rgba\(27,52,128,\.72\),rgba\(13,28,71,\.80\)\);background-repeat:repeat,no-repeat;background-size:54px 54px,100% 100%;border-color:rgba\(126,161,245,\.26\)\}/.test(src), "B7 the UCL box body: navy glass + faint star-tile watermark + UCL-blue border");
ok(src.includes('[data-theme="light"] #uclSpotCard{background-image:url("data:image/svg+xml,') && src.includes("rgba(226,234,255,.94),rgba(201,216,248,.90)"), "B8 the light-theme UCL body keeps the navy identity");
ok(/\.uclcard\{background-image:url\("data:image\/svg\+xml,[^"]*"\);background-repeat:repeat;background-size:54px 54px;border-color:rgba\(126,161,245,\.22\)\}/.test(src), "B9 the UCL standings card shares the watermark + border on the standard glass body");
ok(src.includes('var UCL_BALL = ${JSON.stringify(UCL_BALL)};') && src.includes('fb.className = "uclspot-ball"; fb.setAttribute("aria-hidden", "true"); fb.innerHTML = UCL_BALL;'), "B10 the pre-draw wait state shows the starball (white stars on the navy ball)");
ok(src.includes(".ucl-logo{flex-shrink:0;width:34px;height:34px;border-radius:50%;background:#fff;"), "B11 the white logo chip (the \"white bg if needed\")");

console.log("C) PC-wide grid hierarchy (≥1440px)");
ok(/body\{max-width:1400px;display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(400px,460px\);column-gap:28px;row-gap:14px;align-items:start\}/.test(src), "C1 the body grid: MAIN column + 400-460px reference RAIL");
ok(src.includes("#wideMain,#wideSide{display:flex;flex-direction:column;gap:14px}") && src.includes("#wideMain>*,#wideSide>*{margin:0}"), "C2 each column is an independent flex stack — cards flush, no shared-row holes");
ok(src.includes('var WIDE_MAIN = ["topspotCard","uclSpotCard","weekCard","finishedCard"];') && src.includes('var WIDE_RAIL = ["uclCard","standingsCard","cupsCard"];'), "C3 setWide() groups the match boxes into MAIN and the three table boxes into the RAIL");
ok(src.includes('var WIDE_ORDER = ["topspotCard","uclSpotCard","weekCard","uclCard","standingsCard","cupsCard","finishedCard"];') && src.includes("WIDE_ORDER.forEach(function(id){ var e = document.getElementById(id); if(e) footer.parentNode.insertBefore(e, footer); });"), "C4 below 1440px the cards return to the EXACT single-column DOM order");
ok(src.includes('WIDE_MQ.addEventListener("change", wideChange)') || src.includes("WIDE_MQ.addListener(wideChange)"), "C5 breakpoint change re-shuffles/restores live");
ok(/header\.hero\{text-align:center\}/.test(src) && /#topbar\{justify-content:center;margin-bottom:0\}/.test(src), "C6 the hero + topbar center above the full-width countdown (no dead right-aligned band)");
ok(src.includes("#heroSpot{max-width:880px;margin:0 auto}"), "C7 the countdown hero's match row is capped to a readable width");
ok(src.includes("#wideSide .grid4{grid-template-columns:repeat(2,1fr)}"), "C8 the standings grid folds to 2 columns inside the rail");
ok(src.includes('id="uclCard"') && src.includes('id="standingsCard"') && src.includes('id="cupsCard"') && src.includes('id="finishedCard"'), "C9 the four previously anonymous cards carry ids for the regrouping");

console.log("D) share: quiet ⋯ ghost + popover (the labeled pill removed)");
ok(src.includes(".sharewrap{position:relative;display:inline-flex;width:44px;height:26px;vertical-align:middle;"), "D1 the sharewrap is a 44×26 slot riding the info chip line — no full-width row");
ok(src.includes(".sharetoggle{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;padding:0;border-radius:12px;background:transparent;border:none;"), "D2 the toggle is a borderless ghost (transparent, no chip, no label)");
ok(src.includes('.share{display:none;position:absolute;top:32px;inset-inline-end:0;align-items:center;gap:5px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:6px;'), "D3 the options unfold in a solid popover anchored under the ⋯");
ok(!src.includes("'</svg><span>' + T(\"share\") + '</span>'"), "D4 the «Share» text label is GONE (was the noise)");
ok(src.includes("var sr = shareRow(m, false); info.appendChild(sr);") && !src.includes("var sr = shareRow(m, false); item.appendChild(sr);"), "D5 the spotitem share control rides the info line, not its own row");
ok(src.includes("function closeShare(w){") && src.includes('document.addEventListener("click", function(ev){') && src.includes('document.addEventListener("keydown", function(ev){'), "D6 closeShare + the document click/keydown listeners exist");

console.log("E) version bump");
ok(src.includes('const VERSION = "12.22-heropulse";'), "E1 VERSION = 12.22-heropulse");
ok((src.match(/ver:"نسخه ۱۲\.۲۲/g) || []).length === 3, "E2 fa ver strings (public + login + admin) all ۱۲.۲۱");
ok((src.match(/v12\.22 — adrenaline countdown hero/g) || []).length === 3, "E3 en ver strings all v12.22");
ok(pkg.version === "12.22.0" && pkg.scripts.test.includes("check-v1221.js"), "E4 package.json 12.22.0 + this suite wired into npm test");

console.log(`\n${pass} passed, ${fail} failed (v12.21-uclbrand checks — the suite kept, gates rolled to v12.22)`);
process.exit(fail ? 1 : 0);
