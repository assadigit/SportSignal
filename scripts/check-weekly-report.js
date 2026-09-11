// Self-check: v12.16-weekly — the weekly-report batch + the DETAILED UCL table
// (the user's ask: matches played, goals scored, etc.). Extracts the EXACT
// code from worker.ts (single source of truth) and asserts:
//   A) UCL table: football-data mapping carries MP/W/D/L/GF/GA/GD; the public
//      payload passes them; renderUcl emits # | team | MP | W | D | L | GF |
//      GA | GD | Pts with W/D/L/GF/GA folding away on phones; thGF/thGA
//      i18n (fa+en); GD falls back to GF-GA;
//   B) weekly digest: specialBanner (⚔️🔥 derby + 🏆🔥 both-selected UCL)
//      prefixes EVERY notification; the end-of-week digest appends the
//      week-AHEAD fixtures (derbies first) from the KV pool;
//   C) members directory: getBotMembers (≤40 getChat backfills, KV-cached),
//      /api/members route, the admin members card (HTML+JS+boot wiring),
//      profile capture from incoming Telegram updates;
//   D) API frugality: quiet-period sweep gate (last_full_sweep +
//      QUIET_SWEEP_MS + active windows) + the sportscore circuit breaker;
//   E) Iranian PGL: sportscore → Wikipedia (full 18-team table) → TheSportsDB
//      ONLY when not truncated (≥8 rows — the old top-5 bug);
//   F) «در این هفته» box: payload + card + renderer wiring;
//   G) dark mode default + 46px mobile club crests; H) version strings.
const fs = require("fs");
const src = fs.readFileSync("src/worker.ts", "utf8");

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log("OK   " + label); }
  else { fail++; console.log("FAIL " + label); }
}

// ─── A) the DETAILED UCL league table ───────────────────────────────────────
ok(src.includes("played: r.playedGames != null ? r.playedGames : r.played") && src.includes("gf: r.goalsFor") && src.includes("ga: r.goalsAgainst") && src.includes("gd: r.goalDifference"), "A1 football-data standings carry MP/W/D/L/GF/GA/GD per team");
ok(/teams: stCL \? stCL\.teams\.map\(\(t\) => \(\{[^}]*gf: t\.gf[^}]*ga: t\.ga/.test(src), "A2 public UCL payload passes gf/ga (goals scored/conceded) through");
{
  const i = src.indexOf('function renderUcl(d)');
  const body = src.slice(i, src.indexOf("function renderUclSpot", i));
  const hi = body.indexOf("uclhead"), ri = body.indexOf("d.teams.forEach");
  const head = body.slice(hi, ri), rows = body.slice(ri, body.indexOf("} else {", ri));
  const order = ["hmp", "hw", "hd", "hl", "hgf", "hga", "hgd", "hpt"];
  const pos = order.map((v) => head.indexOf("var " + v + " ="));
  ok(pos.every((p) => p >= 0) && pos.every((p, i2) => i2 === 0 || p > pos[i2 - 1]), "A3 header order = # | team | MP | W | D | L | GF | GA | GD | Pts (standard table order)");
  ok((head.match(/ucl-hidem/g) || []).length === 5, "A4 header folds W/D/L/GF/GA away on phones (5 ucl-hidem)");
  ok(rows.includes('num(t.gf)') && rows.includes('num(t.ga)'), "A5 every team row renders goals-for AND goals-against cells");
  ok(rows.includes('num(t.played)') && rows.includes('num(t.won)') && rows.includes('num(t.draw)') && rows.includes('num(t.lost)'), "A6 every team row renders MP/W/D/L cells");
  ok(/var gdTxt = function\(t2\)\{ if\(t2\.gd == null\) return \(t2\.gf == null \|\| t2\.ga == null\) \? "—" : fmtNum\(t2\.gf - t2\.ga\)/.test(src), "A7 GD falls back to GF−GA when the provider omits goalDifference");
}
ok(src.includes('@media (max-width:600px){.ucl-hidem{display:none}}') && src.includes(".strow.uclhead .stnum{font-size:9.5px;font-weight:700;color:var(--muted);line-height:1.3}"), "A8 CSS: ucl-hidem mobile fold + 2-line-capable header labels");
ok((src.match(/thGF:"گل زده"/g) || []).length >= 1 && (src.match(/thGA:"گل خورده"/g) || []).length >= 1, "A9 fa i18n thGF «گل زده» / thGA «گل خورده»");
ok((src.match(/thGF:"GF"/g) || []).length >= 1 && (src.match(/thGA:"GA"/g) || []).length >= 1, "A10 en i18n thGF/thGA");

// ─── B) weekly digest + unmissable emphasis banners ─────────────────────────
{
  globalThis.__name = (t) => t;
  const s = src.indexOf("function specialBanner(match)");
  const e = src.indexOf('__name(specialBanner, "specialBanner");');
  ok(s >= 0 && e > s, "B1 specialBanner exists");
  eval(src.slice(s, e + '__name(specialBanner, "specialBanner");'.length));
  const derby = { competition: { code: "PL" } };
  const ucl = { competition: { code: "CL" } };
  const plain = { competition: { code: "SA" } };
  globalThis.isDerby = (m) => m === derby;
  globalThis.isMasterPair = (m) => m === ucl;
  const bd = specialBanner(derby);
  const bu = specialBanner(ucl);
  ok(bd.includes("⚔️") && bd.includes("🔥") && bd.includes("دربی"), "B2 derby banner: ⚔️🔥 + bold «دربی»");
  ok(bu.includes("🏆") && bu.includes("دوئل بزرگ لیگ قهرمانان اروپا"), "B3 both-selected UCL duel banner: 🏆🔥");
  ok(specialBanner(plain) === "", "B4 ordinary match gets NO banner");
  ok((bd.match(/\*/g) || []).length >= 2 && (bu.match(/\*/g) || []).length >= 2, "B5 banner text is Telegram-bold (wrapped in *)");
}
ok((src.match(/specialBanner\(match\) \+ await config\.messageFormatter\(match, env\)/g) || []).length >= 1, "B6 EVERY notification message is prefixed with the banner");
ok(src.includes("async function buildWeekAheadMessage") && src.includes('CONFIG.WEEK_AHEAD_DAYS * 864e5'), "B7 week-ahead fixtures section exists (7 days from the KV pool)");
ok(/const derbies = worthy\.filter\(\(m\) => isDerby\(m\)\)\.sort\(byKick\)/.test(src) && /const uclDuels = worthy\.filter\(\(m\) => !isDerby\(m\) && m\.competition && m\.competition\.code === "CL" && isMasterPair\(m\)\)/.test(src), "B8 week-ahead list: derbies LEAD, both-selected UCL duels follow");
ok(src.includes("await sendWeekAhead(env, chatIds)") && src.includes("res.weekAhead = { sent: weekAhead.sent, failed: weekAhead.failed, skipped: !weekAhead.text }"), "B9 the end-of-week digest delivers tables + week-ahead together, one flag");
ok(src.includes('const wt = await maybeSendWeeklyTables(env, chatIds);'), "B10 the cron fires the weekly digest");

// ─── C) bot members directory (admin panel) ─────────────────────────────────
ok(src.includes("async function getBotMembers(env)") && src.includes("if (backfilled >= 40) break;") && src.includes('members.sort((a, b) => String(a.id).localeCompare(String(b.id)))'), "C1 getBotMembers: every /start chat, ≤40 getChat backfills, id-sorted");
ok(src.includes('if (url.pathname === "/api/members" && req.method === "GET")'), "C2 GET /api/members route (admin-gated by the /api/* check)");
ok(src.includes('<div id="members">') && src.includes('onclick="loadMembers(true)"') && src.includes('data-i="hMembers"'), "C3 admin members card in the panel HTML");
ok(src.includes("async function loadMembers(force)") && src.includes("function renderMembers()") && src.includes('var d = await api("/api/members");'), "C4 loadMembers/renderMembers fetch + render the directory");
ok(src.includes("setTheme(initTheme()); applyLang(true); load(); refreshStatus(); loadNextMatches(); loadMembers();") && src.includes("load(); refreshStatus(); loadNextMatches(); loadMembers();"), "C5 members card loads at boot AND after (re)login");
ok(src.includes('var onLang = function(){ refreshStatus(); loadNextMatches(); renderMembers(); loadFai(); };'), "C6 language switch re-renders the members + FA-AI rows");
ok(src.includes('memCount:"%s عضو"') && src.includes('memCount:"%s members"'), "C7 member-count i18n fa+en");
ok(src.includes('const key = String(chatId);') && src.includes('profiles[key] = next;') && src.includes('joined: cur.joined || new Date().toISOString()'), "C8 incoming Telegram updates capture member profiles into KV (username/name/title/joined)");

// ─── D) API frugality + provider circuit breaker ────────────────────────────
ok(src.includes("QUIET_SWEEP_MS: 2 * 60 * 60 * 1e3") && src.includes("ACTIVE_WINDOW_AHEAD_MS: 60 * 60 * 1e3") && src.includes("ACTIVE_WINDOW_BEHIND_MS: 8 * 60 * 60 * 1e3"), "D1 frugality windows: 2h quiet sweep / 1h ahead / 8h behind");
ok(src.includes('const lastSweep = parseInt(await env.STATE.get("last_full_sweep")') && src.includes("if (!isActiveTime && sweepFresh && cachedPool.length) {"), "D2 cron skips the provider sweep in quiet periods (reuses the KV pool)");
ok(src.includes("PROVIDER_SUSPEND_MS: 45 * 60 * 1e3") && src.includes("async function providerSuspended(env, key)"), "D3 provider circuit breaker config + check");
ok((src.match(/providerSuspended\(env, "sportscore"\)/g) || []).length >= 3, "D4 sportscore calls gated by the circuit breaker (fixtures + standings chains)");
ok(src.includes('await env.STATE.put("last_full_sweep", String(NOW)).catch(() => {});'), "D5 full sweeps timestamp themselves");

// ─── E) Iranian PGL — the top-5 bug root cause + the fix ────────────────────
{
  const wStart = src.indexOf("async function fetchPglTableFromWikipedia");
  ok(wStart >= 0, "E1 Wikipedia PGL table parser exists");
  const chainP = src.indexOf('} else if (code === "PGL") {');
  const chain = src.slice(chainP, chainP + 2200);
  const pSports = chain.indexOf("sportscore.com/api/v1/standings");
  const pWiki = chain.indexOf("fetchPglTableFromWikipedia(env)");
  const pSdb = chain.indexOf("thesportsdb.com");
  ok(pSports >= 0 && pWiki > pSports && pSdb > pWiki, "E2 PGL chain order: sportscore → Wikipedia → TheSportsDB");
  ok(chain.includes("if (rows.length >= 8) {") && chain.includes("truncated preview is what shipped the"), "E3 TheSportsDB accepted ONLY when NOT truncated (≥8 rows) — the top-5 bug guard");
  const wiki = src.slice(wStart, src.indexOf('__name(fetchPglTableFromWikipedia', wStart));
  ok(wiki.includes("team_order") && wiki.includes("win") && wiki.includes("draw") && wiki.includes("loss") && wiki.includes("gf") && wiki.includes("ga") && wiki.includes("if (teams.length < 8) return null;"), "E4 Wikipedia parser: positions + W/D/L/GF/GA, rejects partial templates");
  ok(/teams: st\.teams\.slice\(0, 8\)\.map\(\(t\) => \(\{[^}]*gf: t\.gf/.test(src), "E5 league boxes show the SAME top-8 for every league (incl. Iran) with full stats");
}

// ─── F) «در این هفته» box ───────────────────────────────────────────────────
ok(src.includes('const thisWeek = matches') && src.includes("const weekEnd = weekStart + 7 * 864e5;") && src.includes(".slice(0, 16);"), "F1 this-week payload: Iranian week (Sat→Fri), live-first sort, capped 16");
ok(src.includes('thisWeek: thisWeek.map(withTop)') && src.includes("renderWeek(d.thisWeek);"), "F2 public payload carries thisWeek + page renders it");
ok(src.includes('id="weekCard"') && src.includes('data-i="hWeek"') && src.includes("function renderWeek(list)"), "F3 the «در این هفته» card + renderer exist");
ok(src.includes('hWeek:"📅 در این هفته"') && src.includes('hWeek:"📅 This Week"'), "F4 week-card i18n fa+en");

// ─── G) dark default + bigger mobile crests ─────────────────────────────────
ok((src.match(/localStorage\.getItem\("ucl_theme"\)\|\|"dark"/g) || []).length === 6, "G1 dark theme is the DEFAULT on all 3 pages (head script + initTheme, no light fallback)");
ok((src.match(/function initTheme\(\)\{try\{return localStorage\.getItem\("ucl_theme"\)\|\|"dark";\}catch\(e\)\{return "dark";\}\}/g) || []).length >= 2, "G2 initTheme falls back to dark (no FOUC of light)");
ok(src.includes(".logo{width:46px;height:46px;font-size:20px}"), "G3 mobile club crests ~53% bigger (30px → 46px)");

// ─── H) version strings ─────────────────────────────────────────────────────
ok(src.includes('const VERSION = "12.17-fai"'), "H1 VERSION = 12.17-fai");
ok((src.match(/۱۲\.۱۷/g) || []).length >= 4 && (src.match(/v12\.17/g) || []).length >= 3, "H2 ver labels updated (fa + en dicts, static fallbacks)");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
ok(pkg.version === "12.17.0", "H3 package.json 12.17.0");

console.log(`\n${pass} passed, ${fail} failed (v12.16-weekly checks — version gate now 12.17-fai)`);
process.exit(fail ? 1 : 0);
