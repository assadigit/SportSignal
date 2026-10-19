// Self-check: the hero gap loop (v13.129-herogaploop). Asserts:
//  1) DRIFT GATE — src/hero-coverage.ts is byte-identical (modulo the
//     generated_at stamp) to what sync-hero-coverage.js would regenerate
//     from the two truths (the live bundle's HERO_ART + hero-clubs.json).
//  2) SLUG PARITY — the runtime heroTeamSlug() matches the sync script's
//     slugify() on the tricky-name corpus (accents, "&", dots, slashes,
//     digits) AND matches real hero-clubs.json keys end-to-end.
//  3) PURE LOGIC — the scan (window/filter/hero flag/coverage filter) and
//     the registry merge (write discipline: new-team write, same-day no-op,
//     daily bump, hero-pick bump, resolution, reopen, prunes) behave per
//     the contract in src/hero-gaps.ts.
//  4) WIRING — the cron hook is gated (budgetHard + subrequest ceiling),
//     the admin route exists, the KV key is configured, noteHeroGaps is
//     fail-silent.
const fs = require("fs");
const path = require("path");
const src = require("./lib/worker-src")();
const sync = require("./sync-hero-coverage.js");

const ROOT = path.resolve(__dirname, "..");
let fails = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) fails++;
};

// grabFn — brace-balanced slice (the check-scheduler.js scanner, trimmed to
// the states the hero modules use: line/block comments + strings + braces).
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

// grabVar — var X = …; slice (brace-balanced for object literals).
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

// ---- 1) drift gate ----------------------------------------------------------
const norm = (s) => s.replace(/generated_at: "[^"]+"/g, "");
const expected = sync.renderModule(sync.buildCoverage());
const onDisk = fs.readFileSync(sync.OUT, "utf8");
check("hero-coverage.ts in sync with HERO_ART + hero-clubs.json (run: npm run heroes:sync)",
  norm(expected) === norm(onDisk));
const cov = sync.buildCoverage();
check("coverage sanity: wired > 0 and library_only + wired-slugs partition the library",
  cov.wired.length > 0 && cov.wired.length + cov.libraryOnly.length >= cov.libraryTotal);
check("coverage carries the live bundle name", /^public-\d+\.\d+\.js$/.test(cov.bundle));

// ---- 2) slug parity ---------------------------------------------------------
// normTeamKey: the REAL implementation (Node ≥23 requires .ts directly —
// erasable-syntax leaf, the check-fa-dict.js pattern). The hero functions
// grabbed below close over it in the eval scope.
const { normTeamKey } = require("../src/teams.ts");
eval(
  grabVar("HERO_COVERAGE_RAW") + ";\n" +
  grabVar("heroCovIdx") + ";\n" +
  grabFn("function heroCoverageIndex()") + "\n" +
  grabFn("function heroTeamSlug(name)") + "\n" +
  grabFn("function heroTeamArt(name)") + "\n" +
  grabFn("function heroLibraryFor(name)") + "\n"
);
const tricky = [
  "Brighton & Hove Albion FC",
  "Club Atlético de Madrid",
  "FC Bayern München",
  "Real Betis Balompié",
  "FK Bodø/Glimt",
  "København",
  "Paris Saint-Germain FC",
  "1. FC Köln",
  "ŠK Slovan Bratislava",
  "Galatasaray SK"
];
check("slug parity: heroTeamSlug === sync.slugify on the tricky corpus",
  tricky.every((n) => heroTeamSlug(n) === sync.slugify(n)));
// end-to-end: every wired entry whose slug is in hero-clubs.json really
// resolves through heroLibraryFor (the library annotation contract)
const wiredLib = cov.wired.filter((w) => w.player);
check("wired entries with library match resolve via heroLibraryFor (" + wiredLib.length + " of " + cov.wired.length + " wired)",
  wiredLib.every((w) => { const l = heroLibraryFor(w.name); return l && l.slug === w.slug && l.player === w.player; }));
check("wired teams resolve via heroTeamArt (exact + normalized spelling)",
  cov.wired.every((w) => heroTeamArt(w.name) && heroTeamArt(w.name.toUpperCase())));

// ---- 3) pure logic ----------------------------------------------------------
eval(
  grabFn("function scanHeroGaps(matches, heroMatch)") + "\n" +
  grabFn("function mergeHeroGapRegistry(stored, scan, nowMs)") + "\n"
);
const DAY = 864e5;
const now = Date.now();
const iso = (t) => new Date(t).toISOString();
const mkMatch = (h, a, opts) => Object.assign({
  status: "SCHEDULED",
  utcDate: iso(now + 2 * 36e5),
  homeTeam: { name: h },
  awayTeam: { name: a },
  competition: { code: "PL" }
}, opts || {});
// covered vs uncovered vs windows
const matches = [
  mkMatch("Arsenal FC", "Galatasaray SK"),                 // both wired → no gap
  mkMatch("Aston Villa FC", "Everton FC"),                // library-only clubs → gap
  mkMatch("Newcastle United FC", "Nottingham Forest FC"), // library-only → gap
  mkMatch("København", "Malmö FF", { utcDate: iso(now + 30 * DAY) }), // beyond window
  mkMatch("Feyenoord Rotterdam", "FC Porto"),             // wired (UCL set) → no gap
  mkMatch("Olympique Lyonnais", "Lille OSC", { status: "FINISHED" }) // finished → excluded
];
const heroM = mkMatch("Aston Villa FC", "Newcastle United FC", { utcDate: iso(now + 36e5) });
const scan = scanHeroGaps(matches, heroM);
check("scan: covered teams excluded (Arsenal/Galatasaray/Feyenoord/Porto)",
  !scan.has("arsenal-fc") && !scan.has("galatasaray-sk") && !scan.has("feyenoord-rotterdam") && !scan.has("fc-porto"));
check("scan: uncovered in-window teams present with comp counts",
  scan.has("aston-villa-fc") && scan.has("newcastle-united-fc") && scan.has("everton-fc") &&
  scan.has("nottingham-forest-fc") && scan.get("aston-villa-fc").comps.PL === 2);
check("scan: hero-match flag only on the featured sides",
  scan.get("aston-villa-fc").heroPick === 1 && scan.get("newcastle-united-fc").heroPick === 1 && scan.get("everton-fc").heroPick === 0);
check("scan: >7d and FINISHED rows excluded",
  !scan.has("kobenhavn") && !scan.has("malmo-ff") && !scan.has("olympique-lyonnais") && !scan.has("lille-osc"));
check("scan: library-only gap carries no library annotation confusion (portrait exists, unwired)",
  heroLibraryFor("Everton FC") !== null && heroTeamArt("Everton FC") === null);

// merge discipline
const t0 = now;
const m1 = mergeHeroGapRegistry(null, scan, t0);
check("merge: cold registry → dirty, all scanned teams created, hero picks counted",
  m1.dirty && m1.teams["aston-villa-fc"].seen_days === 1 && m1.teams["aston-villa-fc"].hero_picks === 1 &&
  m1.teams["newcastle-united-fc"].hero_picks === 1 && m1.teams["everton-fc"].hero_picks === 0);
check("merge: library-ready annotation lands on the record",
  m1.teams["everton-fc"].library_slug === "everton-fc" && !!m1.teams["everton-fc"].library_player);
const m2 = mergeHeroGapRegistry(m1.teams, scan, t0 + 6e4); // same UTC day, minutes later
check("merge: same-day re-merge is a no-op (write discipline)", !m2.dirty);
const nextDay = t0 + DAY + 36e5;
const scan2 = scanHeroGaps([mkMatch("Aston Villa FC", "Everton FC")], null);
const m3 = mergeHeroGapRegistry(m1.teams, scan2, nextDay);
check("merge: day rollover bumps seen_days and refreshes comps, absent teams retained",
  m3.dirty && m3.teams["aston-villa-fc"].seen_days === 2 && m3.teams["nottingham-forest-fc"].seen_days === 1 &&
  m3.teams["aston-villa-fc"].comps.PL === 1);
// resolution: portrait lands (splice a wired entry in, re-scan so the now-
// covered team drops OUT of the scan, then merge — the resolution path only
// fires for stored teams ABSENT from the current scan)
const rawWired = HERO_COVERAGE_RAW;
const savedWired = rawWired.wired;
rawWired.wired = savedWired.concat([{ name: "Everton FC", src: "/players/uefa/test.webp", fade: null, slug: "everton-fc", player: "Test Player", league: "Premier League" }]);
heroCovIdx = null; // bust the lazy index
const scanAfterCover = scanHeroGaps([mkMatch("Aston Villa FC", "Everton FC")], null);
check("scan: freshly-wired team leaves the scan immediately", !scanAfterCover.has("everton-fc") && scanAfterCover.has("aston-villa-fc"));
const m4 = mergeHeroGapRegistry(m3.teams, scanAfterCover, nextDay + 6e5);
check("merge: covered-again team marked resolved (not deleted)",
  m4.dirty && m4.teams["everton-fc"].resolved_at && m4.resolvedNow.length === 1);
const m5 = mergeHeroGapRegistry(m4.teams, scanAfterCover, nextDay + 8 * DAY);
check("merge: resolved entries pruned after 7 days", m5.dirty && !m5.teams["everton-fc"]);
rawWired.wired = savedWired;
heroCovIdx = null;
// reopen: resolved team reappears in the scan
const m6 = mergeHeroGapRegistry(m4.teams, scan, nextDay + 36e5);
check("merge: a reappearing gap reopens (resolved_at cleared)", m6.dirty && !m6.teams["everton-fc"].resolved_at);
// stale prune: 30d unseen, zero hero picks
const stale = { "stale-fc": { name: "Stale FC", nkey: "stale", comps: {}, first_seen: iso(now - 40 * DAY), last_seen: iso(now - 40 * DAY), seen_days: 1, hero_picks: 0, resolved_at: null } };
const m7 = mergeHeroGapRegistry(stale, scan, now);
check("merge: 30-day unseen no-hero team pruned", !m7.teams["stale-fc"]);

// ---- 4) wiring --------------------------------------------------------------
const cronPub = fs.readFileSync(path.join(ROOT, "src", "cron-public.ts"), "utf8");
check("cron hook: noteHeroGaps gated on !budgetHard + subrequest ceiling in runPublicPhase",
  /if \(!budgetHard && subrequestCount\(\) < 42\) \{\s*await noteHeroGaps\(env, matches\);/.test(cronPub));
const adminOps = fs.readFileSync(path.join(ROOT, "src", "admin-ops.ts"), "utf8");
check("admin route: /api/hero-gaps registered with isAdminAuthed fall-through + reset param",
  /path: "\/api\/hero-gaps"/.test(adminOps) && /heroGapReport\(env, reset\)/.test(adminOps) && /get\("reset"\) === "1"/.test(adminOps));
check("config: KV_HERO_GAPS key declared", /KV_HERO_GAPS: "hero_gaps_v1"/.test(src));
check("noteHeroGaps is fail-silent (own try/catch, registry write .caught)",
  /} catch \(e\) \{\s*console\.warn\("hero gap scan failed/.test(src));
check("new-gap visibility: console.warn herogap tag in the tail logs",
  /herogap: new team\(s\) without artwork/.test(src));

if (fails) {
  console.error("FAIL check-hero-coverage: " + fails + " failure(s)");
  process.exit(1);
}
console.log("OK   check-hero-coverage: all hero gap loop checks passed");
