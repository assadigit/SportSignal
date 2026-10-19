// SportSignal — v13.133-clubalt: the TRANSFER WATCH (runtime tier of the
// club alternates library). The library (assets/players/clubs/** + its
// manifest) exists because players retire and move (owner directive
// 2026-10-21: "players retire, so their picture must alternate; players go
// to other clubs, so their picture must alternate — track the transfers
// market and when a player retires/moves, remove him from that club's
// jersey database and use another alternative"). This module is the track:
//
//   WATCH   watchHeroTransfers() — staggered Football-Data.org squad checks
//           (/v4/teams/{id} carries the CURRENT squad): is the club's
//           ACTIVE hero still on it? Round-robin cursor, ≤5 clubs per quiet
//           tick, per-club interval 84h normally / 12h inside transfer
//           windows (Jan + Jun-Sep 10). Shares the football-data circuit:
//           suspended → skip; 429 → suspend (the quota is the sweep's too).
//   LOG     KV hero_rotation_v1 — an EVENT per departure (open → resolved
//           when the rotation deploy lands or the player reappears), plus
//           the watch cursor. Write discipline: one write per sweep tick
//           that checked clubs (≤ ~6/day normal, ≤ ~48/day in windows —
//           the 700/day budget holds).
//   EXPOSE  heroRotationReport() — /api/hero-rotation (admin-gated): the
//           departure worklist with, for each event, the suggested NEXT
//           candidate (chosen from the club's bench BY THE LIVE SQUAD —
//           only a player still on the roster is suggested) and the
//           one-command rotation procedure.
//
// The ROTATION itself stays agentic-side BY DESIGN (the documented tier
// split, INSTRUCTIONS §13/§14): promoting a bench candidate rewrites the
// pipeline manifests + hero-clubs.json and re-wires the client bundle —
// owner-gated display decisions the worker must not make unilaterally.
// What the runtime CAN do standalone is served by heroClubActive(): the
// effective hero for a club TODAY (index active, event-aware override)
// for any server-side consumer.
//
// Eval-harness note: the pure functions below (squadHasPlayer,
// isTransferWindow, watchIntervalMs, pickWatchBatch, mergeWatchResult) are
// grabbed by scripts/check-hero-clubs.js — keep them free of TS-only
// syntax the worker-src transform cannot strip (untyped params, no
// generics).

import { CONFIG } from "./config";
import type { Env } from "./types";
import { fetchJSON, subrequestCount } from "./utils";
import { providerSuspended, suspendProvider } from "./provider-breaker";
import { HERO_CLUB_ALTERNATES_RAW } from "./hero-club-alternates";

// ---------- the alternates index (lazy, isolate-safe) ----------

var altIdx = null;
function alternatesIndex() {
  if (altIdx) return altIdx;
  var bySlug = new Map();
  var byName = new Map();
  var raw = HERO_CLUB_ALTERNATES_RAW;
  var slugs = Object.keys(raw.clubs).sort();
  for (var i = 0; i < slugs.length; i++) {
    var slug = slugs[i];
    var e = raw.clubs[slug];
    bySlug.set(slug, e);
    byName.set(e.club, { slug: slug, entry: e });
  }
  altIdx = { bySlug: bySlug, byName: byName, slugs: slugs, n: slugs.length };
  return altIdx;
}

// club name → slug (heroTeamSlug parity — byte-compatible with the
// manifest keys / sync-hero-coverage.js slugify)
export function heroClubSlug(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

// ---------- name matching (pure) ----------
//
// FD squad names are full legal forms ("Bruno Borges Fernandes",
// "Vinícius José Paixão de Oliveira Júnior") while the alternates index
// carries display names ("Bruno Fernandes", "Vinícius Júnior"). Exact
// normalized equality first, then ordered-token subsequence (the alt-fetch
// v2.3 identity gate — our tokens must appear in order inside the squad
// name; club-scoped FD data keeps this safe).
export function squadHasPlayer(squadNames, player) {
  if (!player || !squadNames || !squadNames.length) return false;
  var fold = function (s) {
    return String(s || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/ı/g, "i")
      .replace(/[^a-z0-9]+/g, " ").trim();
  };
  var want = fold(player);
  if (!want) return false;
  var wantTokens = want.split(" ").filter(Boolean);
  for (var i = 0; i < squadNames.length; i++) {
    var have = fold(squadNames[i]);
    if (!have) continue;
    if (have === want) return true;
    var haveTokens = have.split(" ").filter(Boolean);
    var j = 0;
    for (var k = 0; k < haveTokens.length; k++) {
      if (j < wantTokens.length && haveTokens[k] === wantTokens[j]) j++;
    }
    if (j === wantTokens.length && wantTokens.length > 0) return true;
  }
  return false;
}

// ---------- the watch cadence (pure) ----------
//
// Twice a week normally; ~daily inside the (generously padded) transfer
// windows — Jan 1-31 and Jun 1-Sep 10 catch every FIFA window plus the
// June 30 contract-expiry churn without being calendar-precise.
export function isTransferWindow(d) {
  var m = d.getUTCMonth(); // 0 = January
  var day = d.getUTCDate();
  if (m === 0) return true;
  if (m >= 5 && m <= 7) return true;
  if (m === 8 && day <= 10) return true;
  return false;
}

export function watchIntervalMs(d) {
  return isTransferWindow(d) ? 12 * 3600e3 : 84 * 3600e3;
}

// Round-robin batch pick: walk the sorted slug list from the cursor,
// collecting up to batchSize clubs whose last check is older than the
// interval. Pure — the caller applies the result.
export function pickWatchBatch(sortedSlugs, checked, cursor, nowMs, batchSize) {
  var interval = watchIntervalMs(new Date(nowMs));
  var out = [];
  var idx = typeof cursor === "number" ? cursor : 0;
  if (!sortedSlugs || !sortedSlugs.length) return { batch: out, nextCursor: 0 };
  for (var i = 0; i < sortedSlugs.length && out.length < batchSize; i++) {
    var slug = sortedSlugs[idx % sortedSlugs.length];
    idx++;
    var last = checked && checked[slug] ? Date.parse(checked[slug]) : 0;
    if (!(nowMs - last >= interval)) continue; // checked recently
    if (out.indexOf(slug) < 0) out.push(slug);
  }
  return { batch: out, nextCursor: idx % sortedSlugs.length };
}

// ---------- the registry merge (pure — the write-discipline contract) ----------
//
// stored: the registry { cursor, checked, events, last_sweep_at } (or null)
// slug:   the checked club
// result: { inSquad: bool, squadNames: [...], activePlayer, candidates: [...] }
// nowMs:  the tick's clock
// Returns { reg, dirty, newEvents, resolvedNow } — the caller writes ONLY
// when dirty. An event is OPEN while the player is absent; it RESOLVES
// when he reappears in the squad (return / data glitch) or the club's
// active player changed (the rotation deploy landed — the index is
// regenerated per deploy).
export function mergeWatchResult(stored, slug, result, nowMs) {
  var reg = stored && typeof stored === "object" ? stored : { schema: 1, checked: {}, events: {} };
  reg.schema = 1;
  reg.checked = reg.checked || {};
  reg.events = reg.events || {};
  var nowIso = new Date(nowMs).toISOString();
  var idx = alternatesIndex();
  var entry = idx.bySlug.get(slug);
  var dirty = false;
  var newEvents = [];
  var resolvedNow = [];

  reg.checked[slug] = nowIso;
  dirty = true;

  var ev = reg.events[slug];
  var activeNow = (entry && entry.active) || result.activePlayer || null;
  if (ev) {
    var activeChanged = !!(ev.player && activeNow && ev.player !== activeNow);
    if (result.inSquad || activeChanged) {
      if (ev.status !== "resolved") {
        ev.status = "resolved";
        ev.resolved_at = nowIso;
        ev.last_checked = nowIso;
        ev.resolve_reason = activeChanged ? "rotation deploy landed (active player changed)" : "player back in the squad";
        resolvedNow.push(slug);
        dirty = true;
      }
    } else if (ev.status === "open") {
      ev.last_checked = nowIso;
    }
  } else if (!result.inSquad && result.activePlayer) {
    reg.events[slug] = {
      club: (entry && entry.club) || slug,
      league: (entry && entry.league) || null,
      player: result.activePlayer,
      first_detected: nowIso,
      last_checked: nowIso,
      suggested_next: suggestNext(result.candidates, result.squadNames),
      status: "open",
      resolved_at: null,
    };
    newEvents.push(slug);
    dirty = true;
  }

  return { reg: reg, dirty: dirty, newEvents: newEvents, resolvedNow: resolvedNow };
}

// The suggested next candidate: the first bench player (manifest order =
// display priority) still ON the live squad; if the squad data is
// unavailable, the first bench candidate unverified (the rotation
// procedure re-verifies before promoting anyway).
function suggestNext(candidates, squadNames) {
  if (!candidates || !candidates.length) return null;
  if (!squadNames || !squadNames.length) {
    var first = candidates[0];
    return { player: first.player, url: first.url, style: first.style, verified_in_squad: false };
  }
  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];
    if (squadHasPlayer(squadNames, c.player)) {
      return { player: c.player, url: c.url, style: c.style, verified_in_squad: true };
    }
  }
  return null;
}

// ---------- the KV facade (fail-silent: never breaks a tick) ----------

var WATCH_BATCH = 5;         // FD calls per active tick (10/min free tier)
var WATCH_SUBREQ_MAX = 38;   // headroom gate (herogap uses 42; we ADD calls)
var SWEEP_MIN_GAP_MS = 25 * 60e3; // anti-storm: ≥25min between sweeps

export async function watchHeroTransfers(env: Env) {
  try {
    if (await providerSuspended(env, "football-data")) return;
    var idx = alternatesIndex();
    if (!idx.n) return;
    var stored = await env.STATE.get(CONFIG.KV_HERO_ROTATION, "json").catch(function () { return null; });
    var reg = stored && stored.events !== undefined ? stored : { schema: 1, checked: {}, events: {} };
    var nowMs = Date.now();

    // anti-storm: a sweep at most every 25 minutes (a full 96-club
    // transfer-window re-due after a deploy must not loop the tick)
    var lastSweep = reg.last_sweep_at ? Date.parse(reg.last_sweep_at) : 0;
    if (nowMs - lastSweep < SWEEP_MIN_GAP_MS) return;

    var pick = pickWatchBatch(idx.slugs, reg.checked, reg.cursor, nowMs, WATCH_BATCH);
    if (!pick.batch.length) return;
    reg.cursor = pick.nextCursor;
    reg.last_sweep_at = new Date(nowMs).toISOString();

    var dirty = false;
    var newEvents = [];
    var resolvedNow = [];
    for (var i = 0; i < pick.batch.length; i++) {
      var slug = pick.batch[i];
      var entry = idx.bySlug.get(slug);
      if (!entry || !entry.fdTeamId || !entry.active) continue;
      var squadNames = [];
      try {
        var data = await fetchJSON("https://api.football-data.org/v4/teams/" + entry.fdTeamId, 2, {
          "X-Auth-Token": env.API_TOKEN || "",
        });
        if (data && data.squad) {
          for (var s = 0; s < data.squad.length; s++) {
            if (data.squad[s] && data.squad[s].name) squadNames.push(data.squad[s].name);
          }
        }
      } catch (e) {
        if (String(e.message || "").indexOf("429") >= 0) {
          // the shared FD quota is exhausted — suspend the circuit (the
          // main sweep honors it too) and stop this sweep cleanly
          await suspendProvider(env, "football-data");
          console.warn("🖼️ herorotation: FD 429 — provider suspended, sweep stopped (resumes next due tick)");
          break;
        }
        continue; // one club's fetch glitch must not sink the sweep
      }
      var inSquad = squadHasPlayer(squadNames, entry.active);
      var merged = mergeWatchResult(reg, slug, {
        inSquad: inSquad,
        squadNames: squadNames,
        activePlayer: entry.active,
        candidates: entry.candidates || [],
      }, nowMs);
      if (merged.dirty) dirty = true;
      reg = merged.reg;
      for (var n = 0; n < merged.newEvents.length; n++) newEvents.push(merged.newEvents[n]);
      for (var r = 0; r < merged.resolvedNow.length; r++) resolvedNow.push(merged.resolvedNow[r]);
    }

    // prune: resolved events older than 30d, events for clubs gone from
    // the index (league turnover)
    var cutoff = nowMs - 30 * 864e5;
    var evSlugs = Object.keys(reg.events);
    for (var p = 0; p < evSlugs.length; p++) {
      var es = evSlugs[p];
      var e2 = reg.events[es];
      var resolvedMs = e2.resolved_at ? Date.parse(e2.resolved_at) : 0;
      if ((e2.status === "resolved" && resolvedMs && resolvedMs < cutoff) || !idx.bySlug.has(es)) {
        delete reg.events[es];
        dirty = true;
      }
    }

    if (newEvents.length) {
      console.warn("🖼️ herorotation: DEPARTED hero(s): " + newEvents.map(function (s) {
        return reg.events[s].club + " — " + reg.events[s].player +
          (reg.events[s].suggested_next ? " → suggest " + reg.events[s].suggested_next.player : " → no bench candidate in squad");
      }).join("; "));
    }
    if (resolvedNow.length) {
      console.log("🖼️ herorotation: resolved: " + resolvedNow.join(", "));
    }
    if (dirty) {
      reg.updated_at = new Date(nowMs).toISOString();
      await env.STATE.put(CONFIG.KV_HERO_ROTATION, JSON.stringify(reg)).catch(function (e) {
        console.warn("hero rotation registry write failed: " + e.message);
      });
    }
  } catch (e) {
    console.warn("hero transfer watch failed: " + e.message);
  }
}

// ---------- the resolver (event-aware active hero) ----------
//
// The EFFECTIVE hero for a club right now: the library's active candidate,
// overridden by an open event's verified suggestion (the bench player the
// live squad still carries). Server-side consumers (reports, future card/
// bot renders) get the already-rotated answer without waiting for the
// deploy; the site's HERO_ART still follows the deploy (owner-gated).
export async function heroClubActive(env: Env, name) {
  var idx = alternatesIndex();
  var slug = heroClubSlug(name);
  var entry = idx.bySlug.get(slug);
  if (!entry) return null;
  var out = { slug: slug, club: entry.club, league: entry.league, player: entry.active, url: entry.activeUrl, style: entry.activeStyle, rotated: false };
  try {
    var reg = await env.STATE.get(CONFIG.KV_HERO_ROTATION, "json").catch(function () { return null; });
    var ev = reg && reg.events && reg.events[slug];
    if (ev && ev.status === "open" && ev.suggested_next && ev.suggested_next.verified_in_squad) {
      out.player = ev.suggested_next.player;
      out.url = ev.suggested_next.url;
      out.style = ev.suggested_next.style;
      out.rotated = true;
    }
  } catch { /* fail-open: the index answer stands */ }
  return out;
}

// ---------- the admin report ----------

export async function heroRotationReport(env: Env, reset) {
  if (reset) {
    await env.STATE.delete(CONFIG.KV_HERO_ROTATION).catch(function () { });
    return { ok: true, reset: true, note: "registry cleared — the next due tick re-seeds the watch cursor (checked history restarts)" };
  }
  var reg = await env.STATE.get(CONFIG.KV_HERO_ROTATION, "json").catch(function () { return null; });
  var idx = alternatesIndex();
  var events = [];
  var open = 0;
  var resolved = 0;
  var reg2 = reg || { checked: {}, events: {} };
  Object.keys(reg2.events || {}).sort().forEach(function (slug) {
    var e = reg2.events[slug];
    if (e.status === "open") open++; else resolved++;
    events.push({
      slug: slug,
      club: e.club,
      league: e.league,
      player: e.player,
      status: e.status || "open",
      first_detected: e.first_detected,
      last_checked: e.last_checked,
      suggested_next: e.suggested_next || null,
      resolved_at: e.resolved_at || null,
    });
  });
  var checkedCount = Object.keys(reg2.checked || {}).length;
  var now = new Date();
  return {
    ok: true,
    generated_at: now.toISOString(),
    coverage: {
      clubs: idx.n,
      note: "the club alternates library (assets/players/clubs/) — 3-4 pre-fetched, VLM-style-gated candidates per big-5 club; rotation = a local manifest promotion, never a scraping session",
    },
    watch: {
      interval_hours: isTransferWindow(now) ? 12 : 84,
      transfer_window: isTransferWindow(now),
      cursor: reg2.cursor || 0,
      clubs_checked: checkedCount,
      last_sweep_at: reg2.last_sweep_at || null,
      batch_per_sweep: WATCH_BATCH,
    },
    counts: { open: open, resolved_recent: resolved },
    events: events,
    how_to_rotate: "docs/scrapping/uefa-players/INSTRUCTIONS.md §14: npm run heroes:rotate -- --club <slug> (promotes the next in-squad candidate, marks the departed player, removes his file from the club folder)",
  };
}
