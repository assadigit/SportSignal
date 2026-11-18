// SportSignal — the SENIOR-INTERNATIONAL DAY FILL (S20, the all-matches day
// pages): the emptiness-gated sportscore scan that widens the day-hub data
// universe during FIFA windows (international friendlies + AFCON /
// CONCACAF-NL / UEFA-NL rows), plus the HYGIENE LAW the international feed
// requires before any row reaches the pool.
//
// The landmines this module kills (all verified live 2026-11-17/18, the
// audit's §3): REVERSED DUPLICATES (Qatar–South Korea upcoming AND South
// Korea–Qatar finished at the same kickoff — canonDedupe keys are ORDERED so
// both survive), GHOST "upcoming" rows for finished games (Tahiti–Cook
// Islands upcoming+finished), and youth/women noise (U16–U23 and women's
// internationals ride the same slugs). DECISIONS S20-3 + S20-6.
//
// Budget law (the audit's §6): club days pay ZERO extra sportscore calls —
// the intl slugs scan only when the CLUB calendar is idle; the 44-metered
// budget-stop stays the hard backstop (4 slugs × 3 days = ≤12 calls when
// the gate is open). Zero page-builder changes — the rows ride the pool.
import { CONFIG } from "./config";
import { SPORTSCORE_SLUGS, INTL_DAY_CODES } from "./tables";
import type { Env } from "./types";
import { subrequestCount } from "./utils";
import { providerSuspended } from "./provider-breaker";
import { sportScoreDay } from "./provider-sportscore";
import { normalizeTeamName } from "./teams";

const INTL_SET = new Set(INTL_DAY_CODES);

// The senior-international day-view code test (tables.ts INTL_DAY_CODES).
export function isIntlDayCode(code) {
  return !!code && INTL_SET.has(code);
}

// ----------------------------------------------------------------------------
// The HYGIENE LAW (S20-6) — no intl row enters the pool without it.
// ----------------------------------------------------------------------------

// Youth markers (U16..U23 word-bounded) + the women's markers. The women's
// set carries the spec's markers (Women/Frauen/Femenino/Femenil) PLUS the
// provider's live-verified "(w)" form (sportscore names women's sides
// "Italy (w)" — seen in the 2026-11-19 feed; a senior women's row must never
// pass as a senior-men row).
var INTL_YOUTH_WOMEN_RE = /\bU1[6-9]\b|\bU2[0-3]\b|Women|Frauen|Femenino|Femenil|\(w\)/i;

export function isSeniorMenName(name) {
  return !INTL_YOUTH_WOMEN_RE.test(String(name || ""));
}

// Status progression for the collapse: FINISHED(2) > LIVE(1) > SCHEDULED(0).
function statusProgress(m) {
  const s = String((m && m.status) || "").toUpperCase();
  if (s === "FINISHED") return 2;
  if (s === "LIVE" || s === "IN_PLAY") return 1;
  return 0;
}

// sanitizeIntlRows — the hygiene pass over a MIXED row list:
//   - club-coded rows (and non-intl rows generally) pass through UNTOUCHED
//     (the club feeds carry none of the intl landmines; zero risk of the
//     name filter touching a club row — it only ever applies to the four
//     intl codes);
//   - an intl row whose home OR away name trips the youth/women filter
//     DROPS (senior men only, v1);
//   - the unordered-pair + date collapse keeps the MOST-PROGRESSED row per
//     (code, unordered pairing, UTC date): the verified reversed-dupe and
//     ghost-row classes never render — a finished Qatar–South Korea kills
//     the ghost "upcoming" South Korea–Qatar; a tie keeps the LATER copy
//     (the fresher sweep, canonDedupe's own last-wins intent).
// Malformed intl rows (no home/away name) drop — never a ghost render.
export function sanitizeIntlRows(rows) {
  if (!Array.isArray(rows)) return [];
  const out = [];
  const byKey = new Map();
  for (const m of rows) {
    const code = m && m.competition && m.competition.code;
    if (!isIntlDayCode(code)) {
      out.push(m);
      continue;
    }
    const h = m.homeTeam && m.homeTeam.name;
    const a = m.awayTeam && m.awayTeam.name;
    if (!h || !a) continue;
    if (!isSeniorMenName(h) || !isSeniorMenName(a)) continue;
    // unordered pair + UTC date: two orderings of the same meeting collapse.
    const k = code + "|" + [normalizeTeamName(h), normalizeTeamName(a)].sort().join("|") + "|" + String(m.utcDate || "").slice(0, 10);
    const cur = byKey.get(k);
    if (!cur || statusProgress(m) >= statusProgress(cur)) byKey.set(k, m);
  }
  return out.concat([...byKey.values()]);
}

// ----------------------------------------------------------------------------
// The EMPTINESS GATE (S20-3) — the intl slugs scan only on idle club
// calendars; club days pay zero extra sportscore calls.
// ----------------------------------------------------------------------------

// The CLUB gate codes: the tracked club universe — CONFIG.LEAGUES (the
// monitored big-5+CL list) ∪ EL ∪ ECL ∪ PGL ∪ the domestic cups. Deliberately
// EXCLUDES the FD-4 day-view comps (DED/PPL/ELC/BSA — Brasileirão plays
// THROUGH windows; counting it as club-gate would close the gate exactly on
// the break days the fill exists for) and the site-hidden AL (an AL-only day
// renders empty on the site — the fill should run). The gate also never tests
// the intl rows it fetches (they are not club codes — it cannot close itself).
function clubGateCodes() {
  const codes = new Set(CONFIG.LEAGUES || []);
  codes.add("EL");
  codes.add("ECL");
  codes.add("PGL");
  for (const c of Object.keys(CONFIG.DOMESTIC_CUP_IDS || {})) codes.add(c);
  return codes;
}

// clubDayBusy — true when any CLUB row kicks off within [now-1d, now+1d].
// Pure predicate (no fetches): the caller passes the sweep's fetched rows.
export function clubDayBusy(rows, nowMs?) {
  const now = nowMs != null ? nowMs : Date.now();
  const codes = clubGateCodes();
  for (const m of Array.isArray(rows) ? rows : []) {
    if (!m || !m.competition || !codes.has(m.competition.code)) continue;
    const t = m.utcDate ? Date.parse(m.utcDate) : NaN;
    if (isNaN(t)) continue;
    if (t >= now - 864e5 && t <= now + 864e5) return true;
  }
  return false;
}

// ----------------------------------------------------------------------------
// The gated scan (S20-3) — [today-1d, tomorrow] × the four intl slugs, riding
// sportScoreDay, under the same 44-metered budget-stop as the club sweeps.
// ----------------------------------------------------------------------------

export async function fetchIntlDayFill(env: Env, clubRows) {
  try {
    if (await providerSuspended(env, "sportscore")) {
      console.log("\u23ED\uFE0F intl day-fill skipped \u2014 sportscore suspended");
      return [];
    }
    if (clubDayBusy(clubRows)) {
      // The quiet skip (the club-day budget law): zero extra calls.
      console.log("\u23ED\uFE0F intl day-fill skipped \u2014 club calendar active in [now\u22121d, now+1d] (0 extra sportscore calls)");
      return [];
    }
    // The scan window [today-1d, tomorrow]: the Tehran today/tomorrow
    // buckets span three UTC dates (a late-evening UTC kickoff belongs to
    // the NEXT Tehran day), so 4 slugs x 3 days = up to 12 metered calls —
    // bounded by the 44-stop, only on window days.
    const acc = { list: [], seen: new Set() };
    let calls = 0;
    let fails = 0;
    let raw = 0;
    scan:
    for (let i = -1; i <= 1; i++) {
      const dateStr = new Date(Date.now() + i * 864e5).toISOString().split("T")[0];
      for (const code of INTL_DAY_CODES) {
        if (subrequestCount() >= 44) {
          console.log(`\u23ED\uFE0F intl day-fill budget-stopped at ${calls} calls (${subrequestCount()}/48 metered)`);
          break scan;
        }
        calls++;
        try {
          raw += await sportScoreDay(code, SPORTSCORE_SLUGS[code], dateStr, acc);
        } catch (e) {
          fails++;
          console.error(`\u274C intl day-fill ${code} ${dateStr} failed: ${e.message}`);
        }
      }
    }
    const rows = sanitizeIntlRows(acc.list);
    console.log(`\uD83C\uDF10 Intl day-fill: ${rows.length} senior-intl rows (of ${raw} raw${calls ? ", " + calls + " calls" : ""}${fails ? ", " + fails + " fails" : ""})`);
    return rows;
  } catch (e) {
    console.error("intl day-fill failed: " + (e && e.message));
    return [];
  }
}
