// SportSignal — v13.133-clubalt: the club alternates library's runtime
// tier. The library (assets/players/clubs/** + its manifest) exists because
// players retire and move (owner directive 2026-10-21: "players retire, so
// their picture must alternate; players go to other clubs, so their picture
// must alternate — track the transfers market and when a player retires/
// moves, remove him from that club's jersey database and use another
// alternative").
//
// v13.276-slim (C1): the AUTOMATIC transfer watch (the staggered FD.org
// /v4/teams/{id} squad checks, ≤5 clubs per quiet tick, 84h/12h per-club
// intervals, the ≥25min anti-storm gap) is REMOVED — the owner-approved
// live strip. KEPT, unchanged: the KV registry
// (hero_rotation_v1 — the accumulated events/cursor persist and stay
// readable), the /api/hero-rotation report, heroClubActive() (the
// event-aware effective-hero resolver), every pure primitive
// (squadHasPlayer / isTransferWindow / watchIntervalMs / pickWatchBatch /
// mergeWatchResult / suggestNext) and the manual rotation commands
// (npm run heroes:rotate + clubs:alt — the agentic tier that verifies a
// live squad BEFORE promoting). A future re-add re-wires one cron hook;
// the registry disciplines are all still here.
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
      // v13.276-slim (C1): the automatic watch is retired — these fields
      // surface the LAST registry state (a future re-add or the manual
      // rotation commands keep them meaningful); active is the verdict.
      active: false,
      interval_hours: isTransferWindow(now) ? 12 : 84,
      transfer_window: isTransferWindow(now),
      cursor: reg2.cursor || 0,
      clubs_checked: checkedCount,
      last_sweep_at: reg2.last_sweep_at || null,
      batch_per_sweep: 5,
    },
    counts: { open: open, resolved_recent: resolved },
    events: events,
    how_to_rotate: "docs/scrapping/uefa-players/INSTRUCTIONS.md §14: npm run heroes:rotate -- --club <slug> (promotes the next in-squad candidate, marks the departed player, removes his file from the club folder)",
  };
}
