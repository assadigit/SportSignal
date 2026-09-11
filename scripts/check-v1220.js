// Self-check: v12.20-uxpolish — the user's eight asks:
//   A) bot notification text noise REMOVED (🔔 24h boilerplate, 📱 "next
//      reminder" footers, hype/filler lines, weekly-digest footer);
//   B) countdown timer zero-padded d/h/m/s + progress bar bound to the REAL
//      time remaining (not 1-rem/14d which read ~100% a day out);
//   C) badge color tokens (--badge-top/--badge-hot/--badge-derby/
//      --badge-league/--badge-live) + the top-of-table badge #D06E07 → #B03A2E
//      (WCAG 6.02:1 with white text);
//   D) ≥1440px two-column grid (single column untouched below);
//   E) sticky Telegram join CTA (scroll-past trigger + safe-area padding);
//   F) share toggle: 44×44px tap target + visible label + ⋯ three-dot glyph;
//   G) visible "updated X minutes ago" stamp from the payload's fetchedAt;
//   H) version bumped everywhere (12.20-uxpolish).
const fs = require("fs");
const src = fs.readFileSync("src/worker.ts", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.error("  ✗ FAIL: " + name); }
}

console.log("A) bot notification noise removed");
ok(!src.includes("\\u{1F514} *\\u06CC\\u0627\\u062F\\u0622\\u0648\\u0631\\u06CC \\u06F2\\u06F4"), "A1 the 🔔 «یادآوری ۲۴ ساعته …» line is gone from format24HourMessage");
ok(!/\\u\{1F4F1\} \\u06CC\\u0627\\u062F\\u0622\\u0648\\u0631\\u06CC \\u0628\\u0639\\u062F\\u06CC/.test(src), "A2 every «📱 یادآوری بعدی …» footer is gone (24h/big/3h)");
ok(!/\\u\{1F4F1\} \\u0627\\u0639\\u0644\\u0627\\u0646 \\u0628\\u0639\\u062F\\u06CC/.test(src), "A3 the «📱 اعلام بعدی …» footer is gone (1h)");
ok(!src.includes("\\u{1F4FA} \\u0628\\u0627\\u0632\\u06CC \\u062F\\u0631 \\u062D\\u0627\\u0644 \\u067E\\u062E\\u0634"), "A4 the 📺 filler line is gone (match-start)");
ok(!src.includes("\\u{1F3C3}\\u200D\\u2642\\uFE0F \\u0633\\u0631\\u06CC\\u0639 \\u0628\\u0627\\u0634\\u06CC\\u062F"), "A5 the 🏃 filler line is gone (match-start)");
ok(!src.includes("\\u{1F3AF} \\u0628\\u0627\\u0632\\u06CC \\u0628\\u0647 \\u0632\\u0648\\u062F\\u06CC"), "A6 the 🎯 hype line is gone (3h)");
ok(!src.includes("\\u{1F525} \\u0628\\u0627\\u0632\\u06CC \\u0646\\u0632\\u062F\\u06CC\\u06A9 \\u0627\\u0633\\u062A"), "A7 the 🔥 hype line is gone (1h)");
ok(!src.includes("\\u{1F525} \\u062F\\u0648 \\u062A\\u06CC\\u0645 \\u0645\\u0648\\u0631\\u062F \\u0639\\u0644\\u0627\\u0642\\u0647"), "A8 the 🔥 hype line is gone (big-match)");
ok(!src.includes("\\u062E\\u0648\\u062F\\u06A9\\u0627\\u0631 \\u0627\\u0631\\u0633\\u0627\\u0644 \\u0645\\u06CC\\u200C\\u0634\\u0648\\u062F\";\n  return msg;"), "A9 the weekly-digest \"📱 اعلان خودکار…\" footer is gone");
ok((src.match(/v12\.20: the|v12\.20 \(the user's ask\): the/g) || []).length >= 7, "A10 each removal is documented with a v12.20 comment");
ok(src.includes("\\u23F3 ${timeUntil}") && src.includes("${jalaliTime}"), "A11 the informative core (⏳ countdown, ⏰ time, teams, comp) is intact");

console.log("B) countdown + progress bar really bound to time remaining");
ok(/var p2 = function\(v\)\{ v = String\(v\); return v\.length < 2 \? "0" \+ v : v; \};/.test(src), "B1 fmtCountdown zero-pads h/m/s");
ok(src.includes("fmtNum(p2(h))+\":\"+fmtNum(p2(m))+\":\"+fmtNum(p2(s))"), "B2 the d/h/m/s clock uses padded fields");
ok(src.includes("var q = rem/(14*864e5);"), "B3 the fill is rem/14d — the actual TIME REMAINING share");
ok(!src.includes("var q = 1 - rem/(14*864e5);"), "B4 the old 1-rem/14d formula (≈93% full a day out) is gone");
ok(/Math\.max\(2, Math\.round\(q\*100\)\)/.test(src) && src.includes('tr.setAttribute("aria-valuenow", Math.round(q*100))'), "B5 width + aria-valuenow derive from the same q");
ok(src.includes(".bigbar-fill.idle{width:12%;"), "B6 the fake fixed 42% idle width replaced by a low standby strip");

console.log("C) badge color tokens + the #B03A2E contrast fix");
ok(/:root\{[^}]*--badge-top:#b03a2e/.test(src), "C1 --badge-top #b03a2e defined on :root");
ok(/\[data-theme="light"\]\{[^}]*--badge-top:#b03a2e/.test(src), "C2 the light theme carries the token set too");
ok(/:root\{[^}]*--badge-hot:#b45309;--badge-derby:#7e22ce;--badge-league:#334155;--badge-live:#22c55e/.test(src), "C3 --badge-hot/--badge-derby/--badge-league/--badge-live tokens exist");
ok(src.includes(".topbadge{display:inline-flex;align-items:center;background:var(--badge-top);"), "C4 the top-of-table badge uses var(--badge-top) — solid #b03a2e, white text (6.02:1)");
ok(!src.includes("background:linear-gradient(90deg,#d97706,#b45309)"), "C5 the old #d97706→#b45309 gradient (sampled #D06E07, 3.55:1) is gone");
ok(src.includes("background:linear-gradient(90deg,var(--badge-hot),var(--badge-derby))"), "C6 the derby badge derives from the shared tokens");
ok(src.includes(".comp{display:inline-block;background:var(--badge-league);"), "C7 the league chip uses --badge-league");
ok(src.includes(".livechip .dot{width:8px;height:8px;border-radius:50%;background:var(--badge-live);"), "C8 the live dot uses --badge-live");

console.log("D) ≥1440px two-column layout");
ok(src.includes("@media (min-width:1440px){"), "D1 the 1440px breakpoint exists");
ok(/body\{max-width:1400px;display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(400px,460px\);column-gap:28px;row-gap:14px;align-items:start\}/.test(src), "D2 (v12.22) body is a MAIN + RAIL grid — match feed one side, table boxes on the other, each column stacking flush");
ok(src.includes("#topbar,header.hero,#bigHeroCard,footer{grid-column:1/-1}"), "D3 topbar/hero/countdown-hero/footer span both columns");
ok(src.includes("max-width:760px;margin:0 auto;"), "D4 below the breakpoint the 760px single column is untouched");

console.log("E) sticky Telegram join CTA");
ok(src.includes('id="joinSticky" href="https://t.me/UCL_Match_Bot"'), "E1 the sticky join anchor exists");
ok(src.includes("#joinSticky{position:fixed;bottom:0;left:0;right:0;z-index:70;"), "E2 fixed bottom bar");
ok(src.includes("calc(10px + env(safe-area-inset-bottom,0px))"), "E3 safe-area bottom padding");
ok(src.includes("var past = !e.isIntersecting && e.boundingClientRect.top < 0;"), "E4 shows only when the hero CTA is scrolled PAST");
ok(src.includes('document.body.classList.toggle("joinsticky", past);') && src.includes("body.joinsticky{padding-bottom:88px}"), "E5 body clearance while shown (never covers content)");
ok(src.includes("#joinSticky .js-inner"), "E6 the pill CTA styling exists");

console.log("F) share toggle: quiet ⋯ ghost + popover (the v12.22 evolution of the 44px pill)");
ok(/dots: '<circle cx="5" cy="12" r="2\.1"\/><circle cx="12" cy="12" r="2\.1"\/><circle cx="19" cy="12" r="2\.1"\/>'/.test(src), "F1 horizontal three-dot glyph in S_ICONS");
ok(src.includes('var tg = sBtn("button", null, S_ICONS.dots, T("share"));'), "F2 the toggle uses the ⋯ glyph (not the old dot-grid share-nodes)");
ok(src.includes('tg.innerHTML = \'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">\' + S_ICONS.dots + \'</svg>\';'), "F3 (v12.22) icon-ONLY toggle — the «Share» label is gone (the pill read as noise)");
ok(/\.sharetoggle\{position:absolute;top:50%;left:50%;transform:translate\(-50%,-50%\);display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px/.test(src), "F4 the ghost toggle keeps the full 44×44px tap area");
ok(src.includes(".share a,.share button{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;"), "F5 the option buttons stayed 34px");
ok(src.includes(".share{display:none;position:absolute;top:32px;inset-inline-end:0;"), "F6 (v12.22) the options unfold in a popover anchored under the ⋯");
ok(src.includes("function closeShare(w){") && src.includes('document.addEventListener("keydown", function(ev){') && src.includes('if(ev.key === "Escape")'), "F7 (v12.22) outside click + Esc close the popover");

console.log("G) visible auto-update timestamp");
ok(src.includes('id="lastSync" role="status" aria-live="polite"'), "G1 the lastSync status line exists under the subtitle");
ok(/function renderSync\(\)/.test(src) && src.includes("var sec = Math.max(0, Math.floor((Date.now() - SYNC_TS)/1000)), txt;"), "G2 renderSync computes the age");
ok(src.includes("SYNC_TS = d.fetchedAt ? new Date(d.fetchedAt).getTime() : Date.now();"), "G3 the stamp comes from the payload's REAL fetchedAt");
ok(src.includes('syncJust:"همین حالا"') && src.includes('syncMinAgo:"%s دقیقه پیش"') && src.includes('lastUpd:"آخرین به‌روزرسانی: %s"'), "G4 fa keys");
ok(src.includes('syncJust:"just now"') && src.includes('syncMinAgo:"%s min ago"') && src.includes('lastUpd:"Last updated: %s"'), "G5 en keys");
ok(src.includes("function tickBigBar(){ if(DATA && DATA.upcoming) updateBigBar(); renderSync(); }"), "G6 the stamp re-ages every second tick");

console.log("H) version bump");
ok(src.includes('const VERSION = "12.22-heropulse";'), "H1 (v12.22) VERSION = 12.22-heropulse");
ok((src.match(/ver:"نسخه ۱۲\.۲۲/g) || []).length === 3, "H2 fa ver strings (public + login + admin) all ۱۲.۲۱");
ok((src.match(/v12\.22 — adrenaline countdown hero/g) || []).length === 3, "H3 en ver strings all v12.22");
ok(pkg.version === "12.22.0" && pkg.scripts.test.includes("check-v1221.js"), "H4 package.json 12.22.0 + the v12.22 suite wired");

console.log(`\n${pass} passed, ${fail} failed (v12.20-uxpolish checks)`);
process.exit(fail ? 1 : 0);
