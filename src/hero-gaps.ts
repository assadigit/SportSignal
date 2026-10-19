// SportSignal — v13.129-herogaploop: the hero-portrait GAP LOOP (runtime
// tier). The site renders player artwork for a club only when the CLIENT
// bundle's HERO_ART map carries it (assets/hero/players/README.md §2); any
// other club renders the crest-only fallback BY DESIGN. Before this module
// the worker had no portrait awareness at all: a club surfacing in fixtures
// without artwork was invisible server-side, and filling it depended on
// somebody happening to notice. This closes the loop:
//
//   DETECT   scanHeroGaps() — every cron tick, from the pool the tick
//            already holds in memory (zero extra fetches): which teams on
//            live/upcoming rows (and, above all, on the FEATURED hero
//            match — pickHeroMatch) have no wired artwork.
//   LOG      noteHeroGaps() — a KV registry (hero_gaps_v1) with a strict
//            write discipline: one write per NEW gap team, one daily
//            last-seen/hero-pick bump per team, resolution marks when a
//            portrait lands, 7/30-day prunes, 300-team cap. Typical added
//            burn: 1 write/day + 1 per new club (budget: 700/day).
//   EXPOSE   heroGapReport() — /api/hero-gaps (admin-gated) returns the
//            prioritized worklist: hero-pick frequency first, then days
//            seen, each annotated with the suggested source (league
//            platform map) and — when hero-clubs.json already holds the
//            portrait — a "library-ready, needs WIRING not scraping" flag.
//
// The BACKFILL itself stays agentic-side BY DESIGN (the documented tier
// split, INSTRUCTIONS §13): choosing the hero MVP is curation, the portrait
// needs the local sharp pipeline (crop/normalize/fade-tier QA — §2b/§2c),
// and display changes are owner-gated (README §4 rights note). The runtime
// tier's job is to make the gap list impossible to miss:
// scripts/hero-gap-report.js pulls it, scripts/backfill-hero-gaps.js runs
// the documented pipeline steps, sync-hero-coverage.js regenerates this
// module's data, and the next deploy makes the gaps vanish from the
// registry (resolved_at) — the loop closes.
//
// Eval-harness note: the pure functions below (heroTeamSlug, heroTeamArt,
// heroLibraryFor, scanHeroGaps, mergeHeroGapRegistry) are grabbed by
// scripts/check-hero-coverage.js — keep them free of TS-only syntax the
// worker-src transform cannot strip (untyped params, no generics).

import { CONFIG } from "./config";
import type { Env } from "./types";
import { normTeamKey } from "./teams";
import { HERO_COVERAGE_RAW } from "./hero-coverage";
import { pickHeroMatch } from "./match-classify";

// ---------- the coverage index (lazy, isolate-safe) ----------

var heroCovIdx = null;
function heroCoverageIndex() {
  if (heroCovIdx) return heroCovIdx;
  var byName = new Map();
  var byKey = new Map();
  var raw = HERO_COVERAGE_RAW;
  for (var i = 0; i < raw.wired.length; i++) {
    var w = raw.wired[i];
    var entry = { src: w.src, fade: w.fade, slug: w.slug, player: w.player, league: w.league };
    byName.set(w.name, entry);
    byKey.set(normTeamKey(w.name), entry);
  }
  var libBySlug = new Map();
  // the library index covers BOTH unwired library clubs and wired ones that
  // matched the library (their player/league ride the wired entry) — so
  // heroLibraryFor answers "does a published portrait exist for this club
  // at all", regardless of wiring state.
  for (var j = 0; j < raw.library_only.length; j++) {
    var l = raw.library_only[j];
    libBySlug.set(l.slug, { slug: l.slug, player: l.player, src: l.src, league: l.league, club: l.club });
  }
  var wiredWithLib = 0;
  for (var k = 0; k < raw.wired.length; k++) {
    var w2 = raw.wired[k];
    if (w2.player) {
      wiredWithLib++;
      if (!libBySlug.has(w2.slug)) libBySlug.set(w2.slug, { slug: w2.slug, player: w2.player, src: w2.src, league: w2.league, club: w2.name });
    }
  }
  heroCovIdx = { byName: byName, byKey: byKey, libBySlug: libBySlug, wiredN: raw.wired.length, libraryOnlyN: raw.library_only.length, libraryTotalN: wiredWithLib + raw.library_only.length };
  return heroCovIdx;
}

// The club slug — byte-compatible with hero-clubs.json keys / the roster's
// state_key derivation (see scripts/sync-hero-coverage.js slugify).
export function heroTeamSlug(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

// Is this team rendering artwork today? Mirrors heroArtFor()'s client
// lookup (exact FD name first, normalized key second — provider spelling
// tolerance). Returns the wired entry or null (crest-only).
export function heroTeamArt(name) {
  if (!name) return null;
  var idx = heroCoverageIndex();
  return idx.byName.get(name) || idx.byKey.get(normTeamKey(name)) || null;
}

// The LIBRARY lookup — a published portrait that exists but is not wired
// into HERO_ART (a wiring/display decision, not a scraping gap).
export function heroLibraryFor(name) {
  if (!name) return null;
  var idx = heroCoverageIndex();
  return idx.libBySlug.get(heroTeamSlug(name)) || null;
}

// ---------- the scan (pure) ----------

// One pass over the pool: which teams on live/upcoming rows (7-day window,
// the hero layer's demand horizon) lack wired artwork. heroMatch is INJECTED
// (the caller passes pickHeroMatch(matches)) so the eval-harness grab set
// stays free of match-classify dependencies. Returns a Map:
//   slug -> { name, nkey, comps: {code: rows}, heroPick: 0|1 }
export function scanHeroGaps(matches, heroMatch) {
  var now = Date.now();
  var winMs = 7 * 864e5;
  var seen = new Map();
  var rows = [];
  if (heroMatch) rows.push(heroMatch);
  var list = matches || [];
  for (var i = 0; i < list.length; i++) {
    var m = list[i];
    var st = String((m && m.status) || "").toUpperCase();
    if (st === "FINISHED") continue;
    var t = new Date((m && m.utcDate) || 0).getTime();
    var live = st === "LIVE" || st === "IN_PLAY" || st === "PAUSED";
    if (!(live || (t && t > now && t <= now + winMs))) continue;
    rows.push(m);
  }
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var isHero = !!(heroMatch && row === heroMatch);
    var sides = [row.homeTeam, row.awayTeam];
    for (var s = 0; s < sides.length; s++) {
      var side = sides[s];
      var name = side && side.name;
      if (!name) continue;
      if (heroTeamArt(name)) continue; // wired — not a gap
      var slug = heroTeamSlug(name);
      var e = seen.get(slug);
      if (!e) {
        e = { name: name, nkey: normTeamKey(name), comps: {}, heroPick: 0 };
        seen.set(slug, e);
      }
      var code = (row.competition && row.competition.code) || "?";
      e.comps[code] = (e.comps[code] || 0) + 1;
      if (isHero) e.heroPick = 1;
    }
  }
  return seen;
}

// ---------- the registry merge (pure — the write-discipline contract) ----------
//
// stored: the registry's `teams` object (or null on a cold KV read)
// scan:   the Map from scanHeroGaps
// nowMs:  the tick's clock
// Returns { teams, dirty, newTeams, resolvedNow } — the caller writes ONLY
// when dirty. Daily semantics: `seen_days`/`hero_picks` bump at most once
// per UTC day per team (a per-tick counter would both churn writes and
// overcount a stable fixture list).
export function mergeHeroGapRegistry(stored, scan, nowMs) {
  var teams = stored && typeof stored === "object" ? stored : {};
  var nowIso = new Date(nowMs).toISOString();
  var day = nowIso.slice(0, 10);
  var dirty = false;
  var newTeams = [];
  var resolvedNow = [];

  scan.forEach(function (e, slug) {
    var t = teams[slug];
    if (!t) {
      var lib = heroLibraryFor(e.name);
      t = {
        name: e.name,
        nkey: e.nkey,
        comps: e.comps,
        first_seen: nowIso,
        last_seen: nowIso,
        seen_days: 1,
        hero_picks: e.heroPick ? 1 : 0,
        day: day,
        hpday: e.heroPick ? day : null,
        library_slug: lib ? lib.slug : null,
        library_player: lib ? lib.player : null,
        library_src: lib ? lib.src : null,
        resolved_at: null
      };
      teams[slug] = t;
      newTeams.push(t);
      dirty = true;
      return;
    }
    if (t.resolved_at) {
      // was resolved, gap again (e.g. a HERO_ART entry was removed) — reopen
      delete t.resolved_at;
      dirty = true;
    }
    if (t.day !== day) {
      t.day = day;
      t.seen_days = (t.seen_days || 0) + 1;
      t.last_seen = nowIso;
      t.comps = e.comps; // refresh the competition mix on the daily bump only
      dirty = true;
    }
    if (e.heroPick && t.hpday !== day) {
      t.hpday = day;
      t.hero_picks = (t.hero_picks || 0) + 1;
      dirty = true;
    }
    if (t.name !== e.name) {
      t.name = e.name; // provider spelling drift — keep the freshest
      dirty = true;
    }
  });

  // stored teams absent from this scan: resolved (portrait landed) or just
  // out of the current window (keep — historical demand evidence), then the
  // prunes (7d after resolution / 30d unseen with zero hero picks).
  var keys = Object.keys(teams);
  for (var i = 0; i < keys.length; i++) {
    var slug = keys[i];
    var t = teams[slug];
    if (scan.has(slug)) continue;
    if (!t.resolved_at && heroTeamArt(t.name)) {
      t.resolved_at = nowIso;
      resolvedNow.push(t);
      dirty = true;
    }
    var resolvedMs = t.resolved_at ? Date.parse(t.resolved_at) : 0;
    var lastSeenMs = Date.parse(t.last_seen || t.first_seen || nowIso) || nowMs;
    if ((resolvedMs && nowMs - resolvedMs > 7 * 864e5) || (!t.resolved_at && nowMs - lastSeenMs > 30 * 864e5 && !(t.hero_picks > 0))) {
      delete teams[slug];
      dirty = true;
    }
  }

  // hard cap: 300 teams — drop the least-demanded first (never a hero pick,
  // fewest days seen, oldest last_seen)
  var all = Object.keys(teams);
  if (all.length > 300) {
    all.sort(function (a, b) {
      var x = teams[a], y = teams[b];
      return (x.hero_picks || 0) - (y.hero_picks || 0) || (x.seen_days || 0) - (y.seen_days || 0) || String(x.last_seen || "").localeCompare(String(y.last_seen || ""));
    });
    while (all.length > 300) delete teams[all.shift()];
    dirty = true;
  }

  return { teams: teams, dirty: dirty, newTeams: newTeams, resolvedNow: resolvedNow };
}

// ---------- the KV facade (fail-silent: never breaks a tick) ----------

export async function noteHeroGaps(env: Env, matches) {
  try {
    var stored = await env.STATE.get(CONFIG.KV_HERO_GAPS, "json").catch(function () { return null; });
    var scan = scanHeroGaps(matches, pickHeroMatch(matches));
    if (!scan.size && !stored) return; // quiet short-circuit: no gaps, no registry
    var reg = stored && stored.teams ? stored : { schema: 1, teams: {} };
    var merged = mergeHeroGapRegistry(reg.teams, scan, Date.now());
    if (merged.newTeams.length) {
      console.warn("\u{1F5BC}\uFE0F herogap: new team(s) without artwork: " +
        merged.newTeams.map(function (t) { return t.name + (t.library_slug ? " (library portrait exists — needs WIRING, not scraping)" : " (no portrait — agentic backfill candidate)"); }).join(", "));
    }
    if (merged.resolvedNow.length) {
      console.log("\u{1F5BC}\uFE0F herogap: resolved (portrait wired): " + merged.resolvedNow.map(function (t) { return t.name; }).join(", "));
    }
    if (merged.dirty) {
      reg.schema = 1;
      reg.teams = merged.teams;
      reg.updated_at = new Date().toISOString();
      await env.STATE.put(CONFIG.KV_HERO_GAPS, JSON.stringify(reg)).catch(function (e) {
        console.warn("hero gap registry write failed: " + e.message);
      });
    }
  } catch (e) {
    console.warn("hero gap scan failed: " + e.message);
  }
}

// ---------- the admin report ----------

// League code → the alt-fetch platform (scripts/uefa-player-portraits/
// alt-fetch.js). UEFA-first for the continental codes; everything else has
// no league platform — honest "owner curation" verdict.
export function suggestHeroSource(comps) {
  var codes = Object.keys(comps || {});
  var has = function (c) { return codes.indexOf(c) >= 0; };
  if (has("PL") || has("FA_CUP") || has("EFL_CUP")) return "premierleague (alt-fetch)";
  if (has("PD") || has("CDR")) return "laliga (alt-fetch)";
  if (has("SA") || has("COPPA_ITALIA")) return "seriea (alt-fetch)";
  if (has("BL1") || has("DFB_POKAL")) return "bundesliga (alt-fetch)";
  if (has("FL1")) return "ligue1 (alt-fetch)";
  if (has("CL") || has("EL") || has("ECL")) return "uefa-first (discover), league platform otherwise";
  return "no league platform — UEFA discover is a long shot; owner curation needed";
}

export async function heroGapReport(env: Env, reset) {
  if (reset) {
    await env.STATE.delete(CONFIG.KV_HERO_GAPS).catch(function () { });
    return { ok: true, reset: true, note: "registry cleared — the next tick re-seeds it from the live pool" };
  }
  var reg = await env.STATE.get(CONFIG.KV_HERO_GAPS, "json").catch(function () { return null; });
  var teams = (reg && reg.teams) || {};
  var idx = heroCoverageIndex();
  var open = [];
  var resolved = [];
  Object.keys(teams).forEach(function (slug) {
    var t = teams[slug];
    var rec = {
      slug: slug,
      name: t.name,
      competitions: t.comps || {},
      hero_picks: t.hero_picks || 0,
      seen_days: t.seen_days || 0,
      first_seen: t.first_seen,
      last_seen: t.last_seen,
      library_ready: t.library_slug ? { slug: t.library_slug, player: t.library_player, src: t.library_src } : null,
      suggested_source: suggestHeroSource(t.comps),
      resolved_at: t.resolved_at || null
    };
    if (t.resolved_at) resolved.push(rec); else open.push(rec);
  });
  open.sort(function (a, b) { return b.hero_picks - a.hero_picks || b.seen_days - a.seen_days || String(a.name).localeCompare(String(b.name)); });
  resolved.sort(function (a, b) { return String(b.resolved_at).localeCompare(String(a.resolved_at)); });
  return {
    ok: true,
    generated_at: new Date().toISOString(),
    registry_updated_at: (reg && reg.updated_at) || null,
    coverage: {
      wired_teams: idx.wiredN,
      library_clubs: idx.libraryTotalN,
      library_only_unwired: idx.libraryOnlyN,
      note: "wired = rendering today (HERO_ART in the live bundle); library_only = published portrait not wired (owner display decision — assets/hero/players/README.md §4)"
    },
    counts: { open: open.length, resolved_recent: resolved.length, library_ready: open.filter(function (g) { return !!g.library_ready; }).length },
    gaps: open,
    resolved_recent: resolved,
    how_to_fill: "docs/scrapping/uefa-players/INSTRUCTIONS.md §13 (the hero gap loop): npm run heroes:report → backfill-hero-gaps.js → sync-hero-coverage.js → deploy"
  };
}
