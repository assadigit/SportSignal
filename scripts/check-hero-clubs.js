// Self-check: the club alternates library + transfer watch (v13.133-clubalt).
// Asserts:
//  1) LIBRARY INTEGRITY — assets/players/clubs/manifest.json covers every
//     hero-clubs.json club with a full bench: ≥3 non-departed candidates
//     (or a documented exhaustion), the active candidate matches the
//     published hero (player parity + no card/head styles on the bench),
//     fd_team_id for the runtime watch, and every referenced file exists
//     on disk at the URL the manifest claims.
//  2) DRIFT GATE — src/hero-club-alternates.ts is byte-identical (modulo
//     the generated_at stamp) to what sync-hero-clubs.js would regenerate
//     from the manifest.
//  3) PURE LOGIC — the watch primitives (squadHasPlayer identity matching,
//     the transfer-window cadence, the round-robin batch pick, the event
//     merge: departure → open, return/rotation → resolved, write
//     discipline) behave per the contract in src/hero-rotation.ts.
//  4) WIRING — the cron hook is subrequest-gated, the admin route exists,
//     the KV key is configured, watchHeroTransfers is fail-silent.
const fs = require("fs");
const path = require("path");
const src = require("./lib/worker-src")();
const sync = require("./sync-hero-clubs.js");

const ROOT = path.resolve(__dirname, "..");
let fails = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) fails++;
};

// grabFn/grabVar — the check-hero-coverage.js scanner (comment/string/
// brace-aware slices of the transformed worker source).
function grabFn(sig) {
  const i = src.indexOf(sig);
  if (i < 0) throw new Error("missing " + sig);
  const open = src.indexOf("{", i);
  let depth = 0, j = open;
  let state = 0;
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
    } else if (state === 1) { if (ch === "\n") state = 0; }
    else if (state === 2) { if (ch === "*" && next === "/") { state = 0; j += 2; continue; } }
    else if (state === 3) { if (ch === "\\") { j += 2; continue; } if (ch === '"') state = stack.pop(); }
    else if (state === 4) { if (ch === "\\") { j += 2; continue; } if (ch === "'") state = stack.pop(); }
    else if (state === 5) { if (ch === "\\") { j += 2; continue; } if (ch === "`") state = stack.pop(); }
    j++;
  }
  return src.slice(i, j + 1);
}
function grabVar(name) {
  const i = src.indexOf("var " + name + " =");
  if (i < 0) throw new Error("missing var " + name);
  const eq = src.indexOf("=", i);
  let depth = 0, j = eq;
  let state = 0;
  const stack = [];
  while (j < src.length) {
    const ch = src[j], next = src[j + 1] || "";
    if (state === 0) {
      if (ch === '"' || ch === "'" || ch === "`") { stack.push(0); state = ch === '"' ? 3 : ch === "'" ? 4 : 5; j++; continue; }
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === ";" && depth === 0) break;
    } else if (state === 3) { if (ch === "\\") { j += 2; continue; } if (ch === '"') state = stack.pop(); }
    else if (state === 4) { if (ch === "\\") { j += 2; continue; } if (ch === "'") state = stack.pop(); }
    else if (state === 5) { if (ch === "\\") { j += 2; continue; } if (ch === "`") state = stack.pop(); }
    j++;
  }
  return src.slice(i, j + 1);
}

// ---- 1) library integrity ---------------------------------------------------
const heroClubs = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "players", "uefa", "hero-clubs.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(sync.MANIFEST, "utf8"));
const LEAGUE_FOLDERS = ["premier-league", "laliga", "serie-a", "bundesliga", "ligue-1"];

check("manifest covers every hero-clubs club (" + Object.keys(heroClubs.clubs).length + ")",
  Object.keys(heroClubs.clubs).every((s) => manifest.clubs[s]) &&
  Object.keys(manifest.clubs).length === Object.keys(heroClubs.clubs).length);

let benchOk = true, filesOk = true, activeOk = true, styleOk = true, fdOk = true;
const benchShort = [];
for (const [slug, e] of Object.entries(manifest.clubs)) {
  const live = (e.candidates || []).filter((c) => c.status !== "departed");
  if (live.length < 3 && !e.exhausted) { benchOk = false; benchShort.push(slug + ":" + live.length); }
  if (!LEAGUE_FOLDERS.includes(e.league_folder)) { filesOk = false; }
  if (e.fd_team_id == null) { fdOk = false; }
  const ai = typeof e.active_index === "number" ? e.active_index : 0;
  const active = (e.candidates || [])[ai];
  if (!active || active.status === "departed") { activeOk = false; }
  const hero = heroClubs.clubs[slug];
  if (active && hero && hero.player && !sameName(active.player, hero.player)) { activeOk = false; }
  for (const c of live) {
    if (!["jersey_photo", "bust_photo"].includes(c.style || "")) { styleOk = false; }
    if (!c.file || !c.url) { filesOk = false; continue; }
    const expectedUrl = "/players/clubs/" + e.league_folder + "/" + slug + "/" + c.file;
    if (c.url !== expectedUrl) { filesOk = false; }
    const onDisk = path.join(ROOT, "assets", "players", "clubs", e.league_folder, slug, c.file);
    if (!fs.existsSync(onDisk)) { filesOk = false; }
  }
}
function sameName(a, b) {
  const f = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const ta = f(a).split(" ").filter(Boolean), tb = f(b).split(" ").filter(Boolean);
  const sub = (x, y) => { let i = 0; for (const t of y) if (i < x.length && t === x[i]) i++; return i === x.length; };
  return f(a) === f(b) || sub(ta, tb) || sub(tb, ta);
}
check("every club carries a bench of >=3 live candidates (or documented exhaustion)" + (benchShort.length ? " — short: " + benchShort.slice(0, 6).join(", ") : ""), benchOk);
check("every live candidate has a valid style (jersey_photo|bust_photo — no cards/heads/unverified)", styleOk);
check("active candidate = the published hero (player parity, none departed)", activeOk);
check("every club has an fd_team_id for the watch", fdOk);
check("every candidate file exists at its claimed URL shape", filesOk);

// the manifest's own shape
check("manifest carries rotation_policy + rights blocks",
  typeof manifest.rotation_policy === "string" && manifest.rights && manifest.rights.reuse_permission_established === false);

// ---- 2) drift gate -----------------------------------------------------------
const norm = (s) => s.replace(/generated_at: "[^"]+"/g, "");
const idx = sync.buildIndex();
const expected = sync.renderModule(idx);
const onDisk = fs.readFileSync(sync.OUT, "utf8");
check("hero-club-alternates.ts in sync with the clubs manifest (run: npm run heroes:clubs-sync)",
  norm(expected) === norm(onDisk));
check("index sanity: 96 clubs, every entry has an active + candidates",
  idx.n === 96 && Object.values(idx.clubs).every((c) => c.active && c.candidates.length >= 2));

// ---- 3) pure logic -----------------------------------------------------------
eval(
  grabVar("HERO_CLUB_ALTERNATES_RAW") + ";\n" +
  grabVar("altIdx") + ";\n" +
  grabFn("function alternatesIndex()") + "\n" +
  grabFn("function squadHasPlayer(squadNames, player)") + "\n" +
  grabFn("function isTransferWindow(d)") + "\n" +
  grabFn("function watchIntervalMs(d)") + "\n" +
  grabFn("function pickWatchBatch(sortedSlugs, checked, cursor, nowMs, batchSize)") + "\n" +
  grabFn("function suggestNext(candidates, squadNames)") + "\n" +
  grabFn("function mergeWatchResult(stored, slug, result, nowMs)") + "\n"
);

// squadHasPlayer: the Dybala lesson — display names vs legal squad forms
check("squadHasPlayer: exact + legal-form subsequence + diacritics fold",
  squadHasPlayer(["Paulo Exequiel Dybala"], "Paulo Dybala") === true &&
  squadHasPlayer(["Bruno Borges Fernandes"], "Bruno Fernandes") === true &&
  squadHasPlayer(["Vinícius José Paixão de Oliveira Júnior"], "Vinícius Júnior") === true &&
  squadHasPlayer(["Kenan Yildiz"], "Kenan Yıldız") === true &&
  squadHasPlayer(["Paulo Dybala", "Other Player"], "Paulo Dybala") === true);
check("squadHasPlayer: rejects different players",
  squadHasPlayer(["Paulo Gazzaniga"], "Paulo Dybala") === false &&
  squadHasPlayer(["Marco Asensio"], "Nico Paz") === false &&
  squadHasPlayer([], "Anyone") === false &&
  squadHasPlayer(["Someone"], "") === false);

// cadence
check("transfer windows: Jan + Jun-Sep10 are window, Feb/May/Oct are not",
  isTransferWindow(new Date("2027-01-15T00:00:00Z")) === true &&
  isTransferWindow(new Date("2027-06-01T00:00:00Z")) === true &&
  isTransferWindow(new Date("2027-08-31T00:00:00Z")) === true &&
  isTransferWindow(new Date("2027-09-10T23:00:00Z")) === true &&
  isTransferWindow(new Date("2027-09-11T00:00:00Z")) === false &&
  isTransferWindow(new Date("2027-02-15T00:00:00Z")) === false &&
  isTransferWindow(new Date("2027-10-20T00:00:00Z")) === false);
check("watch interval: 84h normal, 12h in-window",
  watchIntervalMs(new Date("2027-02-15T00:00:00Z")) === 84 * 3600e3 &&
  watchIntervalMs(new Date("2027-07-15T00:00:00Z")) === 12 * 3600e3);

// batch pick: due filtering + round-robin cursor + no duplicates
(function () {
  const slugs = ["a", "b", "c", "d", "e"];
  const now = Date.parse("2027-02-15T12:00:00Z");
  const checked = { a: new Date(now - 10 * 3600e3).toISOString() }; // a: 10h ago — NOT due (84h)
  const p1 = pickWatchBatch(slugs, checked, 0, now, 2);
  check("pickWatchBatch: skips recently-checked, advances the cursor",
    p1.batch.length === 2 && !p1.batch.includes("a") && p1.nextCursor === 3);
  const all = pickWatchBatch(slugs, {}, 4, now, 5); // wraps
  check("pickWatchBatch: wraps the cursor without duplicates",
    all.batch.length === 5 && new Set(all.batch).size === 5 && all.nextCursor === 4);
})();

// event merge: departure → open with a verified suggestion; return → resolved;
// rotation (active changed) → resolved; same-day re-check of an open event is
// not a re-detect
(function () {
  const now = Date.parse("2027-02-15T12:00:00Z");
  const cand = [
    { player: "Star One", url: "/players/clubs/x/y/star-one.webp", style: "jersey_photo" },
    { player: "Star Two", url: "/players/clubs/x/y/star-two.webp", style: "jersey_photo" },
  ];
  const m1 = mergeWatchResult(null, "paris-saint-germain-fc", {
    inSquad: false, squadNames: ["Star One", "Someone"], activePlayer: "Ousmane Dembélé", candidates: cand,
  }, now);
  check("mergeWatchResult: departure opens an event with the VERIFIED bench suggestion",
    m1.dirty === true && m1.newEvents.length === 1 &&
    m1.reg.events["paris-saint-germain-fc"].status === "open" &&
    m1.reg.events["paris-saint-germain-fc"].suggested_next.player === "Star One" &&
    m1.reg.events["paris-saint-germain-fc"].suggested_next.verified_in_squad === true);
  const reg = m1.reg;
  const m2 = mergeWatchResult(reg, "paris-saint-germain-fc", {
    inSquad: false, squadNames: ["Star One"], activePlayer: "Ousmane Dembélé", candidates: cand,
  }, now + 3600e3);
  check("mergeWatchResult: still-absent stays open, no duplicate event",
    m2.newEvents.length === 0 && m2.reg.events["paris-saint-germain-fc"].status === "open");
  const m3 = mergeWatchResult(m2.reg, "paris-saint-germain-fc", {
    inSquad: true, squadNames: ["Ousmane Dembélé"], activePlayer: "Ousmane Dembélé", candidates: cand,
  }, now + 2 * 3600e3);
  check("mergeWatchResult: player returns → resolved",
    m3.reg.events["paris-saint-germain-fc"].status === "resolved" && m3.resolvedNow.length === 1);
  const m4 = mergeWatchResult({ checked: {}, events: { "ac-milan": { club: "AC Milan", player: "Old Star", status: "open", first_detected: new Date(now).toISOString(), last_checked: new Date(now).toISOString(), suggested_next: null, resolved_at: null } } },
    "ac-milan", { inSquad: false, squadNames: [], activePlayer: "New Star", candidates: [] }, now + 3 * 3600e3);
  check("mergeWatchResult: rotation deploy (active changed) resolves the event",
    m4.reg.events["ac-milan"].status === "resolved" &&
    /rotation deploy/.test(m4.reg.events["ac-milan"].resolve_reason || ""));
})();

// suggestNext without squad data: first candidate, unverified
(function () {
  const s = suggestNext([{ player: "Star One", url: "u", style: "jersey_photo" }], []);
  check("suggestNext: no squad data → first candidate, flagged unverified",
    s && s.player === "Star One" && s.verified_in_squad === false);
  check("suggestNext: empty bench → null", suggestNext([], ["x"]) === null);
})();

// ---- 4) wiring ----------------------------------------------------------------
const cronSrc = fs.readFileSync(path.join(ROOT, "src", "cron-public.ts"), "utf8");
check("cron hook: watchHeroTransfers gated (budgetHard + subrequest < 38)",
  /watchHeroTransfers\(env\)/.test(cronSrc) && /subrequestCount\(\) < 38[\s\S]{0,200}watchHeroTransfers/.test(cronSrc));
check("cron hook: fail-silent (try/catch around the watch)",
  /catch \(e\) \{\s*console\.warn\("hero transfer watch failed: " \+ e\.message\);/.test(cronSrc));
const apiSrc = fs.readFileSync(path.join(ROOT, "src", "admin-ops.ts"), "utf8");
check("admin route /api/hero-rotation registered (admin-gated)",
  apiSrc.includes('"/api/hero-rotation"') && apiSrc.includes("heroRotationReport(env, reset)"));
const configSrc = fs.readFileSync(path.join(ROOT, "src", "config.ts"), "utf8");
check("KV key KV_HERO_ROTATION configured", configSrc.includes('KV_HERO_ROTATION: "hero_rotation_v1"'));
check("watchHeroTransfers is fail-silent (outer try/catch)",
  /async function watchHeroTransfers\(env\) \{\s*try \{/.test(src.replace(/: Env/g, "")));

if (fails) {
  console.error("FAILURES: " + fails);
  process.exit(1);
}
console.log("OK   hero-clubs: all checks passed");
