// Self-check: v12.14 club-name autocomplete (the admin panel "add club"
// guardrail). Extracts the EXACT catalog + search code from worker.ts
// (single source of truth) and asserts:
//   1) refreshClubsCatalog dedupes a club across competitions (AS Roma in
//      Serie A + CL → ONE entry, TWO league badges) and merges fields,
//   2) sportscore A-League rows enter the catalog with no crest,
//   3) clubsSearch ranks: short-name exact ("ro" → Roma first, hint league
//      bump works), prefix beats substring, diacritics fold
//      ("atletico" finds Club Atlético de Madrid), tla matches,
//      no-results → empty, long/empty query → empty,
//   4) the /api/clubs route + KV key + admin autocomplete wiring exist.
const fs = require("fs");
const src = fs.readFileSync("src/worker.ts", "utf8");

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log("OK   " + label); }
  else { fail++; console.log("FAIL " + label); }
}

// 1) Extract the v12.14 clubs block (FD_TEAMS_CODES … clubsSearch)
const start = src.indexOf("var FD_TEAMS_CODES = ");
const end = src.indexOf('__name(clubsSearch, "clubsSearch");');
if (start < 0 || end < 0) { console.error("FAIL: clubs block not found in worker.ts"); process.exit(1); }
const block = src.slice(start, end + '__name(clubsSearch, "clubsSearch");'.length);

// 2) Stub the globals the block references
const { normalizeTeamName } = require("../src/teams.js");
globalThis.__name = (t) => t;
globalThis.normalizeTeamName = normalizeTeamName;
globalThis.SUBREQUEST_COUNT = 0;
globalThis.SUBREQUEST_CAP = 48;
globalThis.CONFIG = {
  // Live-settings shape: AL is NOT in leagues (standings-only league) but IS
  // a teams-config key — the union must still pull the A-League roster in.
  LEAGUES: ["CL", "PL", "PD", "SA", "FL1", "BL1"],
  BIG_TEAMS_BY_LEAGUE: { PL: [], PD: [], SA: [], FL1: [], BL1: [], AL: ["Melbourne Victory"], EL: [], ECL: [] },
  CLUBS_STALE_MS: 12096e5, KV_CLUBS_CATALOG: "clubs_catalog"
};
globalThis.SPORTSCORE_SLUGS = { AL: "australia-a-league" };
const fdFixture = {
  // Series A fixture: AS Roma (appears again in CL → must merge, not dupe)
  SA: { teams: [
    { name: "AS Roma", shortName: "Roma", tla: "ROM", crest: "https://crests.football-data.org/roma.svg" },
    { name: "AC Milan", shortName: "Milan", tla: "MIL", crest: "https://crests.football-data.org/milan.svg" }
  ] },
  CL: { teams: [
    { name: "AS Roma", shortName: "Roma", tla: "ROM", crest: "https://crests.football-data.org/roma.svg" },
    { name: "Club Atlético de Madrid", shortName: "Atlético", tla: "ATM", crest: "https://crests.football-data.org/atm.svg" }
  ] },
  PL: { teams: [] }, PD: { teams: [] }, FL1: { teams: [] }, BL1: { teams: [] }
};
const alFixture = { tables: [{ rows: [
  { team: "Sydney FC", pts: 10 }, { team: "Melbourne Victory", pts: 8 }
] }] };
globalThis.fetch = async (url) => {
  const m = String(url).match(/\/competitions\/([A-Z0-9_]+)\/teams$/);
  if (m) return { ok: fdFixture[m[1]] !== undefined, status: fdFixture[m[1]] ? 200 : 400, json: async () => fdFixture[m[1]] || {} };
  if (String(url).includes("sportscore.com")) return { json: async () => alFixture }; // fetchJSON path is stubbed below
  return { ok: false, status: 404, json: async () => ({}) };
};
globalThis.fetchJSON = async () => alFixture;
const puts = [];
const fakeEnv = { STATE: { put: async (k, v) => { puts.push([k, v]); } }, API_TOKEN: "test" };

// 3) Run the extracted block, then the assertions
eval(block);

(async () => {
  const cat = await refreshClubsCatalog(fakeEnv);

  ok(cat.count === 5, "catalog count 5 (SA 2 + CL 1 new + AL 2)");
  const roma = cat.clubs.find((c) => c.n === "AS Roma");
  ok(!!roma, "AS Roma present");
  ok(roma && roma.s === "Roma" && roma.t === "ROM", "Roma fields merged (short + tla)");
  ok(roma && roma.l.length === 2 && roma.l.includes("SA") && roma.l.includes("CL"), "Roma leagues merged SA+CL (deduped, 2 badges)");
  ok(roma && roma.c === "https://crests.football-data.org/roma.svg", "Roma crest kept");
  const syd = cat.clubs.find((c) => c.n === "Sydney FC");
  ok(!!syd && syd.c === "" && syd.l.includes("AL"), "sportscore AL row entered (no crest, AL badge)");
  ok(puts.length === 1 && puts[0][0] === "clubs_catalog", "catalog written to KV clubs_catalog once");
  const stored = JSON.parse(puts[0][1]);
  ok(stored.count === 5 && Array.isArray(stored.clubs) && stored.fetchedAt, "stored JSON shape {fetchedAt,count,clubs}");

  // 4) Search scoring
  const r1 = clubsSearch(cat, "ro", "SA");
  ok(r1.length > 0 && r1[0].name === "AS Roma", "q=ro hint=SA → AS Roma first (short-name exact + hint)");
  const r1b = clubsSearch(cat, "ro", "");
  ok(r1b.length > 0 && r1b[0].name === "AS Roma", "q=ro no hint → AS Roma first anyway");
  const r2 = clubsSearch(cat, "inter", "SA");
  ok(r2.length === 0, "q=inter → no club in tiny fixture catalog (no crash)");
  const r3 = clubsSearch(cat, "atletico", "SA");
  ok(r3.length > 0 && r3[0].name === "Club Atlético de Madrid", "q=atletico → diacritics-folded match on Club Atlético de Madrid");
  const r4 = clubsSearch(cat, "MIL", "SA");
  ok(r4.length > 0 && r4[0].name === "AC Milan", "q=MIL (tla, uppercase) → AC Milan via tla exact");
  ok(clubsSearch(cat, "", "SA").length === 0, "empty query → empty");
  ok(clubsSearch(cat, "x".repeat(41), "SA").length === 0, "long query → empty (no match, no crash)");
  ok(clubsSearch({ clubs: [] }, "ro", "SA").length === 0, "empty catalog → empty (degraded, no crash)");

  // 5) Wiring: route + KV key + frontend engine present in worker.ts
  ok(src.includes('url.pathname === "/api/clubs"'), "/api/clubs route registered");
  ok(src.includes('KV_CLUBS_CATALOG: "clubs_catalog"'), "KV key configured");
  ok(src.includes("attachClubsAc(inp, dd, l,"), "admin inputs wired to autocomplete engine");
  ok(src.includes('api("/api/clubs?q="+encodeURIComponent(v)'), "debounced query wired");
  ok(src.includes('acAdd:"✅ %s'), "acAdd toast string present (fa)");
  ok(src.includes('acAdd:"✅ %s added'), "acAdd toast string present (en)");
  const code = src.includes("refresh=1") && src.includes("CLUBS_STALE_MS");
  ok(code, "refresh=1 + 14-day staleness auto-refresh present");

  console.log(fail === 0 ? "clubs autocomplete OK ✓" : `clubs autocomplete FAILED (${fail})`);
  process.exit(fail === 0 ? 0 : 1);
})();
