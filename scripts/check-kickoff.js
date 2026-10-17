// check-kickoff.js — v13.117-kickoff: the owner's two reports.
//   (1) "Two matches starting at 20:00 — one notified ~7:57, one ~8:03;
//        they should be notified at 8:00 both." D1 forensics: the second
//        simultaneous match-start (Bayern–Leipzig 2026-10-17) was DEFERRED by
//        the fan-out reservation to the NEXT 10-min tick and landed lean
//        (text-only) at 20:10. The fix under test: the kickoff drain chain —
//        deferred units ride a SELF-FETCH to /api/kickoff-drain, a fresh
//        invocation with a fresh subrequest budget, so the full fan-out lands
//        same-minute — plus imminence-first sweep ordering.
//   (2) "When match starts the text must show مسابقه شروع شد with a nice
//        emoji." The ⚽️ headline — behavior pinned here + in
//        check-composers/check-mdstyle.
//
// Two layers:
//   STATIC — the wiring (route pre-gate, scheduled chain, cron return, du
//   payload, ordering, caps, fail-open contract, token guard).
//   BEHAVIORAL — the REAL kickoffUrgency / drainUnitPriority /
//   runKickoffDrain / handleKickoffDrainRoute / chainKickoffDrain extracted
//   from the concatenated worker source, with the engine's send path and the
//   user/store seams stubbed (their own dedicated harnesses own those).
const fs = require("fs");
const path = require("path");
const src = require("./lib/worker-src")();

const SRC_DIR = path.join(__dirname, "..", "src");
const readSrc = (f) => fs.readFileSync(path.join(SRC_DIR, f), "utf8");

// grabFn — brace-balanced slice (the check-composers.js scanner).
function grabFn(sig) {
  const i = src.indexOf(sig);
  if (i < 0) throw new Error("missing " + sig);
  const open = src.indexOf("{", i);
  let depth = 0, j = open;
  let state = 0, tplExprDepth = 0;
  const stack = [];
  while (j < src.length) {
    const ch = src[j], next = src[j + 1] || "";
    if (state === 0) {
      if (ch === "/" && next === "/") { state = 1; j += 2; continue; }
      if (ch === "/" && next === "*") { state = 2; j += 2; continue; }
      if (ch === '"') { stack.push(0); state = 3; j++; continue; }
      if (ch === "'") { stack.push(0); state = 4; j++; continue; }
      if (ch === "`") { stack.push(0); state = 5; j++; continue; }
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) break; }
      if (ch === "\\" && next === "u" && src[j + 2] === "{") {
        const end = src.indexOf("}", j + 3);
        if (end > 0) { j = end + 1; continue; }
      }
    } else if (state === 1) { if (ch === "\n") state = 0; }
    else if (state === 2) { if (ch === "*" && next === "/") { state = 0; j += 2; continue; } }
    else if (state === 3) { if (ch === "\\") { j += 2; continue; } if (ch === '"') state = stack.pop(); }
    else if (state === 4) { if (ch === "\\") { j += 2; continue; } if (ch === "'") state = stack.pop(); }
    else if (state === 5) {
      if (ch === "\\") { j += 2; continue; }
      if (ch === "`") { state = stack.pop(); j++; continue; }
      if (ch === "$" && next === "{") { state = 6; tplExprDepth = 1; j += 2; continue; }
    } else if (state === 6) {
      if (ch === "{") tplExprDepth++;
      else if (ch === "}") { tplExprDepth--; if (tplExprDepth === 0) state = 5; }
      else if (ch === '"') { stack.push(6); state = 3; }
      else if (ch === "'") { stack.push(6); state = 4; }
      else if (ch === "`") { stack.push(6); state = 5; }
      else if (ch === "\\") j++;
    }
    j++;
  }
  return src.slice(i, j + 1);
}

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) failed++;
};

// ============================================================================
// LAYER 1 — STATIC WIRING
// ============================================================================
const apiSrc = readSrc("api.ts");
const cronSrc = readSrc("cron.ts");
const engineSrc = readSrc("notify-engine.ts");
const drainSrc = readSrc("kickoff-drain.ts");
const cfgSrc = readSrc("config.ts");
const compSrc = readSrc("composers.ts");
const wranglerSrc = fs.readFileSync(path.join(__dirname, "..", "wrangler.toml"), "utf8");
const typesSrc = readSrc("types.ts");

check("api.ts routes POST /api/kickoff-drain BEFORE the admin auth gate (the caller is the worker itself)",
  apiSrc.indexOf('"/api/kickoff-drain"') >= 0 &&
  apiSrc.indexOf('"/api/kickoff-drain"') < apiSrc.indexOf('if (isAdminPath &&'));
check("api.ts scheduled handler chains deferred units via ctx.waitUntil (fresh budget, post-completion)",
  /ctx\.waitUntil\(chainKickoffDrain\(env, deferredUnits, 0\)/.test(apiSrc));
check("cron.ts returns the drain payload { deferredUnits } on the completion path",
  /return \{ deferredUnits \};/.test(cronSrc));
check("cron.ts reads the payload from the notify summary's du (capped, string-filtered)",
  /\(notifySummary as any\)\.du/.test(cronSrc) && /typeof u === "string"/.test(cronSrc));
check("notify-engine sorts the sweep time-critically (kickoffUrgency first key)",
  /kickoffUrgency\(a\) - kickoffUrgency\(b\)/.test(engineSrc));
check("notify-engine exports the du drain payload (sorted by drainUnitPriority, capped by CONFIG)",
  /du = deferredKeys/.test(engineSrc) && /drainUnitPriority\(a\) - drainUnitPriority\(b\)/.test(engineSrc) && /KICKOFF_DRAIN_MAX_UNITS/.test(engineSrc));
check("kickoff-drain.ts guards the route on WEBHOOK_SECRET (403 without it — fail-closed)",
  /token !== env\.WEBHOOK_SECRET/.test(drainSrc) && /jsonResponse\(\{ error: "forbidden" \}, 403\)/.test(drainSrc));
check("kickoff-drain.ts resets the subrequest budget at the runner start (deterministic fresh budget)",
  /resetSubrequestBudget\(\);/.test(drainSrc));
check("kickoff-drain.ts applies LIVE settings before computing the audience (applySettings)",
  /await applySettings\(env\);/.test(drainSrc));
check("kickoff-drain.ts re-runs the REAL engine gates (sendNotificationIfNeeded with the fresh counters)",
  /await sendNotificationIfNeeded\(match, config, groups, env, counts, notifiedMatches, deadChats, deferred\)/.test(drainSrc));
check("kickoff-drain.ts splits unit keys at the LAST colon (matchKey carries its own HH:MM colon)",
  /lastIndexOf\(":"\)/.test(drainSrc));
check("kickoff-drain.ts caps depth + units from CONFIG (no unbounded chain)",
  /KICKOFF_DRAIN_MAX_DEPTH/.test(drainSrc) && /KICKOFF_DRAIN_MAX_UNITS/.test(drainSrc));
check("kickoff-drain.ts fail-open: a failed/non-200 chain returns null (units ride the next-tick path)",
  /return null;/.test(drainSrc) && /HTTP " \+ res\.status/.test(drainSrc));
check("kickoff-drain.ts reports dead chats WITHOUT pruning (the sweep stays the single registry mutator)",
  /next sweep prunes/.test(drainSrc) && !/pruneChats\s*\(/.test(drainSrc));
check("config.ts carries the drain caps: MAX_UNITS + MAX_DEPTH (transport = the service binding, no public-origin fetch)",
  /KICKOFF_DRAIN_MAX_UNITS: 10/.test(cfgSrc) && /KICKOFF_DRAIN_MAX_DEPTH: 2/.test(cfgSrc) && !/SELF_ORIGIN/.test(cfgSrc));
check("wrangler.toml declares the self-referencing service binding DRAIN_SELF → ucl-notifier",
  /\[\[services\]\]/.test(wranglerSrc) && /binding = "DRAIN_SELF"/.test(wranglerSrc) && /service = "ucl-notifier"/.test(wranglerSrc));
check("types.ts documents the optional DRAIN_SELF binding (absent → chain fails open)",
  /DRAIN_SELF\?: any/.test(typesSrc));
check("the chain rides the DRAIN_SELF binding, never a public fetch of the worker's own origin (error 1042)",
  /env\.DRAIN_SELF\.fetch\(/.test(drainSrc) && !/fetch\(CONFIG\.SELF_ORIGIN/.test(drainSrc));
check("the chain requires the binding (missing → null, fail-open to the next-tick path)",
  /!env \|\| !env\.DRAIN_SELF/.test(drainSrc));
check("composers.ts carries the owner's verbatim «مسابقه شروع شد» headline through mdBold (fa)",
  /mdBold\("\\u0645\\u0633\\u0627\\u0628\\u0642\\u0647 \\u0634\\u0631\\u0648\\u0639 \\u0634\\u062F"\)/.test(compSrc));
check("composers.ts carries the en mirror headline (The match has started)",
  /mdBold\("The match has started"\)/.test(compSrc));
check("the notify-engine lean/defer semantics are UNTOUCHED (the drain is additive, not a rewrite)",
  /if \(verdict === "defer"\)/.test(engineSrc) && /fanoutReservation\(config, chatGroups\)/.test(engineSrc));

// ============================================================================
// LAYER 2 — BEHAVIORAL (real functions, stubbed seams)
// ============================================================================
const NOW = Date.parse("2026-10-17T16:30:00Z"); // the reported evening's kickoff minute
const CONFIG = {
  KV_MATCHES_KEY: "matches_v13_tracked",
  KICKOFF_DRAIN_MAX_UNITS: 10,
  KICKOFF_DRAIN_MAX_DEPTH: 2
};
const VERSION = "13.117-kickoff-test";
function jsonResponse(data, status) { return { __json: data, status: status || 200 }; }
function resetSubrequestBudget() { }
// the matchKey STUB mirrors the real shape INCLUDING the 16-char utcDate
// slice — the HH:MM colon inside the key is the drain-split's whole point.
function matchKey(m) {
  return String(m.homeTeam.name).toLowerCase().replace(/\s+/g, "") + "|" +
    String(m.awayTeam.name).toLowerCase().replace(/\s+/g, "") + "|" +
    String(m.utcDate || "").slice(0, 16);
}
const NOTIFICATION_CONFIGS = [
  { type: "pre-match-72h", windowCheck: () => true, messageFormatter: async () => "M", requiresFuture: true, bigMatchOnly: true },
  { type: "pre-match-24h", windowCheck: () => true, messageFormatter: async () => "M", requiresFuture: true },
  { type: "pre-match-3h", windowCheck: () => true, messageFormatter: async () => "M", requiresFuture: true },
  { type: "pre-match-1h", windowCheck: () => true, messageFormatter: async () => "M", requiresFuture: true },
  { type: "pre-match-5min", windowCheck: () => true, messageFormatter: async () => "M", requiresFuture: true, bigMatchOnly: true },
  { type: "match-start", windowCheck: () => true, messageFormatter: async () => "M", requiresFuture: false },
  { type: "result", windowCheck: () => true, messageFormatter: async () => "M", requiresFuture: false }
];
// the engine seam — stubbed (check-pervchat/check-lifecycle own the real one).
// MODE toggles: "send" increments the type counter (a landed fan-out);
// "defer" pushes into the deferred array (the reservation said no).
var STUB_MODE = "send";
var ENGINE_CALLS = [];
async function sendNotificationIfNeeded(match, config, chatGroups, env, counts, notifiedMatches, deadChats, deferred) {
  ENGINE_CALLS.push(config.type + "@" + matchKey(match));
  if (STUB_MODE === "defer" && deferred) { deferred.push(matchKey(match) + ":" + config.type); return; }
  counts[config.type] = (counts[config.type] || 0) + 1;
}
async function getRegisteredChats() { return [111, 222]; }
async function getUserPrefs() { return {}; }
function userFollowsMatch(prefs, chatId, match) { return "both"; }
function isBigMatch(match, prefs, chatId) { return true; }
function groupChatsByTz(chatIds) { return [{ tz: "Asia/Tehran", lang: "fa", chats: chatIds }]; }
async function getNotifiedMatches() { return {}; }
var APPLY_SETTINGS_CALLS = 0;
async function applySettings() { APPLY_SETTINGS_CALLS++; return {}; }

eval([
  grabFn("function drainUnitPriority(unitKey)"),
  grabFn("function kickoffUrgency(match, nowMs)"),
  grabFn("function VERSION_TAG()"),
  grabFn("async function runKickoffDrain(env, units, depth)"),
  grabFn("async function handleKickoffDrainRoute(req, env)"),
  grabFn("async function chainKickoffDrain(env, units, depth)")
].join("\n"));

// --- kickoffUrgency: the time-criticality table (the sweep's new order) ---
const at = (minFromNow) => new Date(NOW + minFromNow * 6e4).toISOString();
check("urgency: kickoff NOW → bucket 0 (match-start window)", kickoffUrgency({ utcDate: at(0) }, NOW) === 0);
check("urgency: kickoff 45min ago → bucket 0 (the window's upper edge)", kickoffUrgency({ utcDate: at(-45) }, NOW) === 0);
check("urgency: kickoff 46min ago → bucket 3 (window closed)", kickoffUrgency({ utcDate: at(-46) }, NOW) === 3);
check("urgency: kickoff 30s ahead → bucket 0 (the -1min grace)", kickoffUrgency({ utcDate: at(0.5) }, NOW) === 0);
check("urgency: kickoff 90s ahead → bucket 1 (inside the 5min window)", kickoffUrgency({ utcDate: at(1.5) }, NOW) === 1);
check("urgency: kickoff 10min ahead → bucket 1 (5min window edge)", kickoffUrgency({ utcDate: at(10) }, NOW) === 1);
check("urgency: kickoff 11min ahead → bucket 2 (near-hour band)", kickoffUrgency({ utcDate: at(11) }, NOW) === 2);
check("urgency: kickoff 90min ahead → bucket 2 (1h window + backfill edge)", kickoffUrgency({ utcDate: at(90) }, NOW) === 2);
check("urgency: kickoff 91min ahead → bucket 3 (long-range)", kickoffUrgency({ utcDate: at(91) }, NOW) === 3);
check("urgency: kickoff 3 days ahead → bucket 3", kickoffUrgency({ utcDate: at(3 * 24 * 60) }, NOW) === 3);
check("urgency: invalid utcDate → bucket 9 (sorts last, never crashes)", kickoffUrgency({ utcDate: "not-a-date" }, NOW) === 9);
check("urgency: default now — a live 0-min kickoff buckets 0 against Date.now()", kickoffUrgency({ utcDate: new Date().toISOString() }) === 0);

// --- drainUnitPriority: the drain order + the colon-split shape ---
const KO = "ateam|bteam|2026-10-17T16:30"; // a REAL-shape matchKey (HH:MM colon inside!)
check("drain priority: match-start first (0) even with the HH:MM colon in the key", drainUnitPriority(KO + ":match-start") === 0);
check("drain priority: match-start-big also 0", drainUnitPriority(KO + ":match-start-big") === 0);
check("drain priority: pre-match-5min → 1", drainUnitPriority(KO + ":pre-match-5min") === 1);
check("drain priority: pre-match-1h → 2", drainUnitPriority(KO + ":pre-match-1h") === 2);
check("drain priority: pre-match-24h → 3", drainUnitPriority(KO + ":pre-match-24h") === 3);
check("drain priority: result → 3", drainUnitPriority(KO + ":result") === 3);
check("drain priority: empty/garbage → 3 (never crashes)", drainUnitPriority("") === 3 && drainUnitPriority(null) === 3);

// --- runKickoffDrain: the runner ---
const poolMatch = {
  homeTeam: { name: "A Team" }, awayTeam: { name: "B Team" },
  competition: { code: "PD" }, utcDate: "2026-10-17T16:30:00Z", status: "IN_PLAY"
};
const poolMatch2 = {
  homeTeam: { name: "C Team" }, awayTeam: { name: "D Team" },
  competition: { code: "BL1" }, utcDate: "2026-10-17T16:30:00Z", status: "IN_PLAY"
};
const pool = { matches: [poolMatch, poolMatch2], fetchedAt: "x", source: "test" };
const mkEnv = (over) => Object.assign({
  WEBHOOK_SECRET: "s3cret",
  STATE: { async get(k) { return k === CONFIG.KV_MATCHES_KEY ? pool : null; } }
}, over || {});

(async () => {
  // happy path: one deferred match-start unit → the REAL runner finds the
  // match in the pool (lastIndexOf split over the HH:MM colon), runs the
  // engine seam, counts the landed send.
  STUB_MODE = "send"; ENGINE_CALLS = [];
  const r1 = await runKickoffDrain(mkEnv(), [matchKey(poolMatch) + ":match-start"], 0);
  check("drain: processes the deferred unit (match found through the colon-bearing key)", r1.processed === 1 && r1.sent === 1);
  check("drain: the engine seam saw the RIGHT type for the RIGHT match", ENGINE_CALLS[0] === "match-start@" + matchKey(poolMatch));
  check("drain: applySettings ran (the LIVE audience, not compile-time defaults)", APPLY_SETTINGS_CALLS >= 1);
  check("drain: reports the version stamp", r1.version === VERSION);

  // ghost match / unknown type / malformed key → missing, never a crash
  const r2 = await runKickoffDrain(mkEnv(), [
    "ghost|ghost|2030-01-01T00:00:match-start",
    matchKey(poolMatch) + ":pre-match-99",
    "no-colon-here"
  ], 0);
  check("drain: ghost match + unknown type + colon-less key all count as missing", r2.missing === 3 && r2.processed === 0);

  // ordering: match-start jumps ahead of a 24h unit in the same payload
  STUB_MODE = "send"; ENGINE_CALLS = [];
  await runKickoffDrain(mkEnv(), [matchKey(poolMatch) + ":pre-match-24h", matchKey(poolMatch2) + ":match-start"], 0);
  check("drain: time-critical ordering — match-start runs before the 24h unit", ENGINE_CALLS[0] === "match-start@" + matchKey(poolMatch2) && ENGINE_CALLS.length === 2);

  // no pool → explicit noPool (the units ride the next-tick path)
  const r3 = await runKickoffDrain(mkEnv({ STATE: { async get() { return null; } } }), [matchKey(poolMatch) + ":match-start"], 0);
  check("drain: a missing pool reports noPool instead of sending", r3.noPool === true && r3.processed === 0);

  // empty payload → immediate zero-cost return
  const r4 = await runKickoffDrain(mkEnv(), [], 0);
  check("drain: an empty unit list is a no-op", r4.processed === 0 && r4.noPool === false);

  // a re-deferral surfaces in out.deferred (the route chains from there)
  STUB_MODE = "defer";
  const r5 = await runKickoffDrain(mkEnv(), [matchKey(poolMatch) + ":match-start"], 0);
  check("drain: a still-deferred unit lands in out.deferred for the chain", r5.deferred.length === 1 && r5.deferred[0] === matchKey(poolMatch) + ":match-start" && r5.sent === 0);
  STUB_MODE = "send";

  // --- handleKickoffDrainRoute: the token gate + clamps ---
  const reqOf = (body) => ({ json: async () => body });
  const badToken = await handleKickoffDrainRoute(reqOf({ token: "wrong", units: [matchKey(poolMatch) + ":match-start"] }), mkEnv());
  check("route: a wrong token is a bare 403", badToken.status === 403);
  const noToken = await handleKickoffDrainRoute(reqOf({ units: [] }), mkEnv());
  check("route: a missing token is a bare 403", noToken.status === 403);
  const noSecret = await handleKickoffDrainRoute(reqOf({ token: "s3cret", units: [] }), mkEnv({ WEBHOOK_SECRET: undefined }));
  check("route: an env without WEBHOOK_SECRET fails CLOSED (403)", noSecret.status === 403);
  const badJson = await handleKickoffDrainRoute({ json: async () => { throw new Error("x"); } }, mkEnv());
  check("route: malformed JSON is a 400", badJson.status === 400);
  const good = await handleKickoffDrainRoute(reqOf({ token: "s3cret", units: [matchKey(poolMatch) + ":match-start"], depth: 0 }), mkEnv());
  check("route: the right token runs the drain (200 + processed=1)", good.status === 200 && good.__json.processed === 1 && good.__json.sent === 1);
  const clamped = await handleKickoffDrainRoute(reqOf({ token: "s3cret", units: [], depth: 99 }), mkEnv());
  check("route: depth clamps to CONFIG.KICKOFF_DRAIN_MAX_DEPTH", clamped.__json.depth === 2);
  const negative = await handleKickoffDrainRoute(reqOf({ token: "s3cret", units: [], depth: -7 }), mkEnv());
  check("route: negative depth clamps to 0", negative.__json.depth === 0);

  // the unit cap: 15 valid units → only the first 10 ride the payload
  const many = [];
  for (let i = 0; i < 15; i++) {
    pool.matches.push({ homeTeam: { name: "T" + i }, awayTeam: { name: "U" }, competition: { code: "PD" }, utcDate: "2026-10-17T16:30:00Z", status: "SCHEDULED" });
    many.push(matchKey(pool.matches[pool.matches.length - 1]) + ":match-start");
  }
  const capped = await handleKickoffDrainRoute(reqOf({ token: "s3cret", units: many, depth: 0 }), mkEnv());
  check("route: the unit payload is capped at KICKOFF_DRAIN_MAX_UNITS (10 of 15)", capped.__json.processed === 10);
  check("route: non-string unit entries are dropped (never crash)", (await handleKickoffDrainRoute(reqOf({ token: "s3cret", units: [null, 42, matchKey(poolMatch) + ":match-start"] }), mkEnv())).__json.processed === 1);

  // --- chainKickoffDrain: the service-binding invocation ---
  // The binding stub records every (url, init) pair — the real transport is
  // env.DRAIN_SELF.fetch (a self-referencing service binding; a public
  // self-fetch is refused by the edge with error 1042 — probed live).
  const fetches = [];
  const bindingOf = (impl) => ({ fetch: async (url, init) => { const r = await impl(url, init); fetches.push({ url, init, res: r }); return r; } });
  const okBinding = bindingOf(async () => ({ ok: true, status: 200, json: async () => ({ processed: 1, sent: 1, deferred: [] }) }));
  const chained = await chainKickoffDrain(mkEnv({ DRAIN_SELF: okBinding }), [matchKey(poolMatch) + ":match-start"], 0);
  check("chain: invokes DRAIN_SELF at /api/kickoff-drain (POST)", fetches.length === 1 && /\/api\/kickoff-drain$/.test(fetches[0].url) && fetches[0].init.method === "POST");
  const sentBody = JSON.parse(fetches[0].init.body);
  check("chain: the payload carries the WEBHOOK_SECRET token + units + depth", sentBody.token === "s3cret" && sentBody.depth === 0 && sentBody.units.length === 1);
  check("chain: returns the drained invocation's summary", chained && chained.processed === 1);
  // the depth bound + empty-input guard + the missing-binding guard
  fetches.length = 0;
  check("chain: refuses to invoke past KICKOFF_DRAIN_MAX_DEPTH", (await chainKickoffDrain(mkEnv({ DRAIN_SELF: okBinding }), ["x:match-start"], 3)) === null && fetches.length === 0);
  check("chain: refuses an empty unit list", (await chainKickoffDrain(mkEnv({ DRAIN_SELF: okBinding }), [], 0)) === null && fetches.length === 0);
  check("chain: no DRAIN_SELF binding -> null (local dev fail-open, next-tick path)", (await chainKickoffDrain(mkEnv(), ["x:match-start"], 0)) === null && fetches.length === 0);
  // fail-open shapes
  const badBinding = bindingOf(async () => ({ ok: false, status: 500, json: async () => ({}) }));
  check("chain: a non-200 returns null (units ride the next-tick path)", (await chainKickoffDrain(mkEnv({ DRAIN_SELF: badBinding }), ["x:match-start"], 0)) === null);
  const throwingBinding = bindingOf(async () => { throw new Error("binding says no"); });
  check("chain: a thrown binding call returns null (never propagates into the tick)", (await chainKickoffDrain(mkEnv({ DRAIN_SELF: throwingBinding }), ["x:match-start"], 0)) === null);

  // --- the route's own re-chain (a drain that STILL defers chains depth+1) ---
  fetches.length = 0;
  const rechainBinding = bindingOf(async () => ({ ok: true, status: 200, json: async () => ({ processed: 1, sent: 0, deferred: ["leftover|team|2030-01-01T00:00:match-start"] }) }));
  STUB_MODE = "defer";
  const rechain = await handleKickoffDrainRoute(reqOf({ token: "s3cret", units: [matchKey(poolMatch) + ":match-start"], depth: 0 }), mkEnv({ DRAIN_SELF: rechainBinding }));
  check("route: a still-deferred drain chains ONE more invocation (depth+1)", fetches.length === 1 && JSON.parse(fetches[0].init.body).depth === 1 && rechain.__json.chained && rechain.__json.chained.depth === 1);
  // at MAX depth the route stops chaining (bounded recursion)
  fetches.length = 0;
  const atMax = await handleKickoffDrainRoute(reqOf({ token: "s3cret", units: [matchKey(poolMatch) + ":match-start"], depth: 2 }), mkEnv({ DRAIN_SELF: rechainBinding }));
  check("route: at KICKOFF_DRAIN_MAX_DEPTH the chain stops (no binding call)", fetches.length === 0 && atMax.__json.deferred.length === 1);
  STUB_MODE = "send";

  // --- the headline on the REAL formatter (the owner's exact phrase) ---
  // (grabbed via the same eval slice as check-composers — one deep pin here)
  const { formatMatchStartMessage } = (function () {
    function toFaDigits(s) { return String(s).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]); }
    function escapeMarkdownCharacters(s) { return String(s).replace(/([\[\]\(\)~`>#\+\-=|{}\.!_])/g, "\\$1"); }
    function getJalaliDate() { return "شنبه ۲۶ مهر ۱۴۰۵"; }
    function getJalaliTime() { return "۲۰:۰۰"; }
    function getEnglishDate() { return "Sunday, 26 October 2026"; }
    function getEnglishTime() { return "20:00"; }
    function enStageName() { return null; }
    function translateTeam(n) { return n; }
    function translateCompetition(c) { return c; }
    function translateVenue(v) { return v; }
    function isDomesticCup() { return false; }
    function isDerby() { return false; }
    function rivalryName() { return null; }
    function isTrueBigDuel() { return false; }
    function normAlias(n) { return String(n || "").toLowerCase().replace(/\s+/g, ""); }
    const COMP_EN = { PD: "La Liga" };
    const STAGE_FA = {};
    const md = eval([
      (src.match(/var MDV2_RESERVED = "[^"]*";/) || [""])[0],
      (src.match(/var MDV2_ESCAPE_SRC = [^\n]*;/) || [""])[0],
      (src.match(/var MDV2_ESCAPE_RE = [^\n]*;/) || [""])[0],
      grabFn("function mdEscape(text)"),
      grabFn("function mdBold(text)"),
      grabFn("function mdItalic(text)")
    ].join("\n"));
    const fn = eval(grabFn("function formatMatchStartMessage(match, env, lang)") + "\nformatMatchStartMessage");
    return { formatMatchStartMessage: fn, md };
  })();
  const faHead = formatMatchStartMessage(poolMatch, { STATE: { async get() { return null; } }, TEHRAN_TZ: "Asia/Tehran" }, "fa");
  check("headline: the fa match-start opens with the owner's verbatim phrase, bold, ⚽️-prefixed",
    faHead.startsWith("⚽️ *مسابقه شروع شد*\n\n📅") && faHead.includes("🚀"));
  const enHead = formatMatchStartMessage(poolMatch, { STATE: { async get() { return null; } }, TEHRAN_TZ: "Asia/Tehran" }, "en");
  check("headline: the en match-start opens with the started mirror",
    enHead.startsWith("⚽️ *The match has started*\n\n📅") && enHead.includes("🚀"));

  console.log(failed ? failed + " FAILURES" : "kickoff invariants OK");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
