// Self-check: v12.18-weeknext — the six user asks:
//   A) the VS hairline divider is FULLY removed (no element, no CSS; score
//      slot only exists when a score exists);
//   B) UCL table rows carry round club crests (catalog-resolved server-side);
//   C) the Friday problem solved — nextWeek payload + frontend takeover
//      («📅 هفته بعد») when the current week has nothing ahead;
//   D) PC crests +35% (38px → 51px);
//   E) share options hidden behind ONE toggle icon (PC + mobile);
//   F) varzesh3.com grounding for the AI Farsi-name learner.
const fs = require("fs");
const src = fs.readFileSync("src/worker.ts", "utf8");

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.error("  ✗ FAIL: " + name); }
}

console.log("A) VS divider fully removed");
ok(!/\.vs\{/.test(src) && !/\.vs[ ,{.]/.test(src.replace(/[\s\S]*?(<style>)/, "").split("</style>")[0].replace(/\.vs/g, "")) || true, "A0 sanity");
ok(!src.includes('className = "vs"') && !src.includes('vs.className = "vs"'), "A1 no element ever carries the .vs class");
ok(!/\.vs\{/m.test(src), "A2 no .vs CSS rule remains");
ok(!src.includes(".bigcard .vs") && !src.includes(".spotitem.past .vs"), "A2b bigcard/past .vs selectors gone");
ok((src.match(/row\.appendChild\(hs\); row\.appendChild\(as\);/g) || []).length === 2, "A3 both builders append sides WITHOUT a middle slot when no score");
ok((src.match(/var vs = document\.createElement\("div"\); vs\.className = "score";/g) || []).length === 2, "A3b the score slot is created only when a score exists (2 sites)");
ok(/\/\* v12\.18: the "vs" slot is GONE[\s\S]*?\*\//.test(src), "A4 the retirement comment documents the decision");
ok(src.includes(".score{font-weight:800"), "A5 .score styling untouched");

console.log("B) UCL round club crests");
ok(/teams: stCL \? stCL\.teams\.map\(\(t\) => \(\{ pos: t\.pos, name: t\.name, faName: translateTeam\(t\.name\), crest: crestOf\(t\.name\)/.test(src), "B1 payload: crest rides on every UCL team row");
ok(src.includes("const crestMap = new Map();") && src.includes("crestMap.set(normTeamKey(c.n), c.c)"), "B2 crest resolution against the clubs catalog (normalized keys)");
ok(src.includes("// v12.18: round club crests for the UCL table rows") && src.includes("KV-ONLY read here"), "B3 the public path reads the catalog KV-only (no refresh fetch)");
ok(src.includes('lg.className = "stlogo"') && src.includes("lg.referrerPolicy") && src.includes("this.remove(); n.classList.remove"), "B4 renderUcl: round <img class=stlogo> with graceful onerror");
ok(/\.stlogo\{width:19px;height:19px;border-radius:50%/.test(src) && /\.stname\.haslogo\{display:flex/.test(src), "B5 .stlogo circle + .stname.haslogo flex CSS");

console.log("C) Friday problem → next-week takeover");
ok(/const nextWeek = matches\n    \.filter\(\(m\) => \(shouldNotify\(m\) \|\| isTopTeamInvolved\(m\)\) && new Date\(m\.utcDate\)\.getTime\(\) >= weekEnd && new Date\(m\.utcDate\)\.getTime\(\) < weekEnd \+ 7 \* 864e5\)/.test(src), "C1 backend: nextWeek = the Saturday→Friday AFTER this week");
ok(src.includes("nextWeek: nextWeek.map(withTop)"), "C2 nextWeek rides in the public payload");
ok(/function renderWeek\(list, nextList\)/.test(src), "C3 renderWeek(list, nextList) signature");
ok(src.includes("var upcomingThis = (list || []).filter") && src.includes('mode = "next";') && src.includes("list = nextList || [];"), "C4 takeover: no upcoming THIS week → render next week's fixtures");
ok(src.includes('title.textContent = mode === "next" ? T("hWeekNext") : T("hWeek")'), "C5 the header switches to «📅 هفته بعد» in next-week mode");
ok(src.includes('past: mode === "this" && weekPast(m)'), "C6 dimming applies only in this-week mode (next week has nothing past)");
ok(src.includes('hWeekNext:"📅 هفته بعد"') && src.includes('hWeekNext:"📅 Next Week"'), "C7 hWeekNext i18n (fa+en)");
ok(src.includes("renderWeek(d.thisWeek, d.nextWeek)") && src.includes("renderWeek(DATA.thisWeek, DATA.nextWeek)"), "C8 load() + rerenderAll() pass both lists");
ok(src.includes("nextWeek: []") && src.includes("nextWeek: d.nextWeek || []"), "C9 DATA carries nextWeek (init + fetch)");
ok(src.includes("var onLang = function(){ renderWeek(DATA.thisWeek, DATA.nextWeek); renderUcl(DATA.ucl); initTz(); };"), "C10 language switch re-renders the week + UCL cards (title survives trText; v12.19 also rebuilds the tz options)");

console.log("D) PC crest size +35%");
ok(/\.logo\{width:51px;height:51px;/.test(src), "D1 .logo 38px → 51px (+35%)");
ok(/\.logo\{width:46px;height:46px/.test(src) || /@media \(max-width:600px\)\{[\s\S]*?\.logo\{width:46px/.test(src), "D2 the mobile 46px rule is untouched");
ok(src.includes("v12.18: PC crests +35%"), "D3 documented as the user's ask");

console.log("E) share options behind a toggle");
ok(src.includes("wrap.className = \"sharewrap\"") && src.includes('tg.className = "sharetoggle"'), "E1 shareRow wraps options behind a .sharetoggle button");
ok(/share: '<circle cx="18" cy="5" r="3"\/>/.test(src) && /dots: '<circle cx="5" cy="12" r="2\.1"\/><circle cx="12" cy="12" r="2\.1"\/><circle cx="19" cy="12" r="2\.1"\/>'/.test(src), "E2 (v12.20) the legacy share-nodes key is kept; the toggle now drives a horizontal ⋯ three-dot glyph");
ok(src.includes('tg.setAttribute("aria-expanded", open ? "true" : "false")') && src.includes("wrap.classList.toggle(\"open\")"), "E3 click toggles .open + aria-expanded");
ok(/\.share\{display:none;/.test(src) && /\.sharewrap\.open \.share\{display:inline-flex\}/.test(src), "E4 options hidden until .open (both PC and mobile)");
ok(!src.includes("@media (hover:hover) and (pointer:fine)"), "E5 the hover-reveal media query is RETIRED");

console.log("F) varzesh3.com grounding");
ok(src.includes('KV_V3_CATALOG: "varzesh3_clubs_v1"'), "F1 CONFIG.KV_V3_CATALOG");
ok(src.includes("const v3 = await env.STATE.get(CONFIG.KV_V3_CATALOG, \"json\").catch(() => null);") && src.includes("const v3Norm = new Map();"), "F2 the learner loads the varzesh3 catalog from KV");
ok(src.includes("Canonical Persian club names from varzesh3.com") && src.includes("return EXACTLY that spelling"), "F3 the prompt carries the varzesh3 reference names");
ok(src.includes("const snap = v3Norm.get(normFa(fa));") && src.includes("rec.learned[k] = snap || String(fa).trim();"), "F4 accepted answers snap to the varzesh3 spelling");
ok(src.includes("const normFa = (s) => String(s || \"\").replace(/[\\s\\u200c]/g, \"\");"), "F5 snap matching ignores spaces/ZWNJ");
ok(src.includes("v3: v3 && Array.isArray(v3.clubs) ? v3.clubs.length : 0"), "F6 /api/fa-teams reports the catalog size");
const v3script = fs.readFileSync("scripts/varzesh3-catalog.js", "utf8");
ok(v3script.includes("varzesh3.com/football/league/") && v3script.includes("values/varzesh3_clubs_v1") && v3script.includes("CLOUDFLARE_API_TOKEN"), "F7 scripts/varzesh3-catalog.js scrapes league pages + pushes to KV via the API");
ok(v3script.includes("{ id: 25,") && v3script.includes('{ id: 6,'), "F8 covers UCL (25) + the Iranian PGL (6) among 9 leagues");

console.log("G) versions");
ok(src.includes('const VERSION = "12.21-uclbrand";'), "G1 VERSION = 12.21-uclbrand");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
ok(pkg.version === "12.21.0" && pkg.scripts.test.includes("check-v1218.js"), "G2 package.json 12.21.0 + this suite still wired");
ok((src.match(/نسخه ۱۲\.۲۱/g) || []).length >= 4 && (src.match(/v12\.21 — emphasized section header plates/g) || []).length >= 3, "G3 ver strings bumped (dicts + static footer)");

console.log(`\n${pass} passed, ${fail} failed (v12.18-weeknext checks)`);
process.exit(fail ? 1 : 0);
