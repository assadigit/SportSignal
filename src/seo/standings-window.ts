// SportSignal — Match Centre S10 (M4): the standings selection/window logic.
//
// OWNERSHIP (milestones-and-sessions.md M4/S10 + specification §8):
// THIS module owns the unified-competition-table DATA layer for the match page
// — the pure SELECTION algorithm that computes the five-row neighbourhood for
// BOTH participating teams, merges overlapping or touching ranges into one
// contiguous block, inserts a discreet ellipsis sentinel between separated
// ranges, marks which rows are the participating teams (home + away), and
// fail-closes (returns null) when the standings cache is missing, the
// competition hasn't started, the table is degenerate, OR neither team is
// found. The RENDERING (the unified table markup + the participant highlight +
// the responsive mobile layout + the CSS) rides S11 (M4/S11 — the spec's
// selection-vs-rendering split). S10 ships the SELECTION LOGIC + the tests only;
// the mcentre-standings section stays empty this session (the جدول nav item
// stays filtered out until S11 populates the part).
//
// S10 DECISION POINTS (resolved + recorded for the execution log):
//
// 1. The unified-window algorithm — both teams in the SAME competition (the
//    usual case): compute each team's five-row neighbourhood, then MERGE
//    overlapping or touching ranges into one contiguous block (the union of both
//    ranges — the merged block may be 5–11 rows). If the ranges are SEPARATED
//    (non-overlapping, non-touching — a gap of ≥2 rows between them), insert a
//    discreet ellipsis sentinel row between them + show BOTH neighbourhoods (do
//    NOT load/display the intervening teams). Both teams in DIFFERENT
//    competitions (rare — a friendly/cross-competition fixture): two separate
//    windows (one block per competition). The lookup strategy mirrors the
//    existing teamStandingsWindow (data.ts): try the fixture's competition code
//    FIRST (the table the user is about to see played — fullByCode is loaded for
//    it by buildMatchPage's fullByCodeFor, the freshest complete source), then
//    fall back to ANY code in fullByCode or the payload's top-8 compacts that
//    contains the team (covers the cross-competition branch when the away team's
//    league isn't the fixture's code).
//
// 2. The neighbourhood size — "five-row neighbourhood around each participating
//    team" = the team's row ± 2 (2 above, the team, 2 below — 5 rows total),
//    CLAMPED at the table edges. A team at pos 1 → rows 1–5 (no rows above —
//    fewer than 5 above is acceptable, no fabricated rows); a team at pos N (the
//    last team) → rows N-4..N (no rows below). A team near the middle → the team
//    centered in its 5-row window. This is the EXACT clamp logic the existing
//    teamStandingsWindow uses (data.ts — the team-page precedent, byte-frozen).
//
// 3. The merge/touch boundary — two ranges [startA, endA] and [startB, endB]
//    (each a 5-row window, indices into the standings array):
//      gap = max(0, max(startA, startB) - min(endA, endB) - 1)
//      gap == 0 (adjacent, endA+1==startB) → touching → MERGE
//      gap == 1 (one row between them)   → touching → MERGE (the 1 gap row IS
//                                          included in the merged block — it is
//                                          CONTEXTUAL between the two
//                                          neighbourhoods, not "intervening" in
//                                          the separated-ranges sense)
//      gap >= 2 (two+ rows between them) → SEPARATED → ELLIPSIS sentinel + show
//                                          both neighbourhoods (the intervening
//                                          teams are NOT loaded/displayed — spec
//                                          §8: "Do not load or display
//                                          intervening teams")
//    The merge produces the UNION of both ranges (contiguous, de-duplicated, in
//    standings order). The max merged block is 5 + 1 + 5 = 11 rows (a 1-row gap
//    bridged); the max separated block is 5 + ellipsis + 5 = 11 entries.
//
// 4. The participant-mark — each row in the window carries a `participant`
//    flag: 'home' | 'away' | null. The renderer (S11) applies the stronger
//    typography + the icy-blue text to the participant rows (spec §8 +
//    decision 25 — typography-ONLY participant highlight, NO highlighted row
//    background). The selection returns the row data + the marks; the renderer
//    applies the visual treatment (the S04 hero precedent — the projection owns
//    the data, the composer owns the markup).
//
// 5. The column projection — the standings_cache rows carry the full data
//    shape (pos/name/faName/crest/points/played/won/draw/lost/gf/ga/gd — audit
//    §R3/§67). The spec §8 visible columns: رتبه (pos) | تیم (name/faName +
//    crest) | بازی (played) | تفاضل (gd = gf-ga) | امتیاز (points). The
//    selection returns the FULL row + the participant-mark (the won/draw/lost/
//    gf/ga stay in the cache, NOT displayed — the spec's "Do not load or
//    display intervening teams" discipline extends to columns: only the 5
//    visible columns surface in S11). The selection is pure DATA; the renderer
//    (S11) projects the 5 columns + computes gd = (gf||0) - (ga||0). This keeps
//    the selection pure data + the renderer pure presentation (the S04 hero
//    projection precedent).
//
// 6. The ellipsis sentinel — a row with the marker { ellipsis: true }. The
//    selection inserts ONE sentinel between separated neighbourhoods (never
//    between touching/overlapping ones — those merge). The renderer (S11)
//    renders the sentinel as «⋯» (a discreet ellipsis) with no team data (no
//    pos/name/played/gd/points cells). S10 owns the sentinel shape; S11 owns
//    the discreet visual.
//
// 7. The pre-season / missing-table / cups-KO gate — the audit §67: "pre-season
//    (started:false)/missing table → drop section fail-closed; cups/KO → not
//    applicable." The selection returns null (no window) when:
//      - the standings cache is missing for a code (no fullByCode[code] AND no
//        payload.standings[code]) — covers cups/KO (no league table for the
//        code — FA_CUP/EFL_CUP/DFB_POKAL/CDR/COPPA_ITALIA/HAZFI_CUP have no
//        standings_cache entry; the missing-cache gate handles them naturally);
//      - st.started === false (pre-season — FD roster-alphabetical, no matches
//        played yet — the existing public-matches.ts/digest-weekly.ts/seo/
//        markup.ts gates use the same flag);
//      - the table has <2 teams (degenerate — a 1-team table is not a table);
//      - NEITHER participating team is found in the table (the team isn't in
//        this competition's standings).
//    When only ONE team is found (the other isn't in any standings_cache — e.g.
//    a cup game where one side is from a lower division not covered), the
//    selection shows that team's window ALONE (a single-team neighbourhood —
//    the spec's "five-row neighbourhood around each participating team" doesn't
//    require BOTH to be found; we show the ones we CAN find, no fabricated
//    rows). The composer's no-empty-cards law: when the selection returns
//    null, the mcentre-standings section is omitted (the slot +
//    MatchCentreParts.standings? exist since S02). The nav's adaptive Q9=B
//    filter: the جدول nav item renders ONLY when the standings part is
//    non-empty (today it's filtered out because the part is empty; S11
//    populates it).
//
// 8. The module home — a NEW module (this file), the S08 narrative precedent.
//    The composer purity law means match-centre.ts cannot import it (the
//    composer stays the S02 pure leaf — zero runtime imports); the algorithm
//    runs HERE, the pre-built window DATA arrives at pages.ts's buildMatchPage
//    (in S11) which builds the standings HTML string + passes it to the
//    composer's MatchCentreParts.standings (the S04 hero precedent — pages.ts
//    calls the module + passes the pre-built string to the composer). S10 ships
//    the SELECTION LOGIC + the tests only; the composer wiring + the renderer
//    ride S11. The worker-src.js harness gains "seo/standings-window.ts" after
//    "seo/narrative.ts" (the co-evolution law).
//
// ZERO-RUNTIME-COST LAW (the S08 narrative precedent, audited §R3): the module
// is PURE LOGIC. It reads ONLY the already-loaded standings data:
//   - ctx.payload.standings — the 7 top-8 compacts (PL/PD/SA/BL1/FL1/CL/PGL),
//     cache-only reads already loaded by getSeoCtx (audit §R3: "standings_cache
//     ×7 already read by getSeoCtx; teamStandingsWindow() exists | 0 / 0").
//   - fullByCode — the full cached tables, already loaded by buildMatchPage's
//     fullByCodeFor (one of the 3 pre-existing awaits; audit §R3: "fullByCodeFor
//     read already happens in buildMatchPage").
//   - sm.s.homeTeam/awayTeam/competition — already-loaded SeoMatch fields.
// ZERO new KV reads, ZERO new awaits, ZERO new fetches. The module carries NO
// AI/network/KV/timer/polling code (the cost law gates this in check-match-centre
// — the same regex the S08 narrative engine is gated on). buildMatchPage's
// await count stays exactly 3 (the cost law asserts this — the standings-window
// module adds ZERO awaits).
//
// NO-FABRICATION GUARD (spec §8 + the S08 precedent): the selection NEVER
// fabricates standings rows. The five-row neighbourhood is a SLICE of the real
// cached table (start..start+5, clamped at the edges). The ellipsis sentinel is
// a marker row (no team data), NOT a fabricated team. The participant-mark flags
// real rows only (the home/away teams found in the cache). A team not in any
// standings_cache → no neighbourhood for it (never a fabricated row). A missing
// cache / pre-season table / degenerate table / cups-KO → null (the section is
// omitted, the no-empty-cards law).

import { normalizeTeamName } from "../teams";
import { COMP_EN } from "../tables";
import type { SeoMatch, SeoCtx } from "./data";

// ---- the row + block + window shapes (the selection result) ----
//
// One row in a window block. Either a real standings row (with the
// participant-mark) OR an ellipsis sentinel (inserted between separated
// neighbourhoods). The renderer (S11) discriminates on `ellipsis`:
//   - a real row → projects the 5 visible columns (pos | team+crest | played |
//     gd=gf-ga | points) + applies the icy-blue highlight to participant rows.
//   - an ellipsis row → renders «⋯» with no team data (a discreet separator).
//
// The `team` field is the RAW standings_cache row (pos/name/faName/crest/
// points/played/won/draw/lost/gf/ga/gd) — the full data shape, NOT a
// projection. The selection is pure DATA; S11's renderer projects the 5 visible
// columns (decision 4 — keeps the selection pure, the renderer pure
// presentation).
export type StandingsWindowRow =
  | { team: any; participant: "home" | "away" | null }
  | { ellipsis: true };

// One competition's window block (one unified table). Same-competition matches
// produce ONE block (the merged/touching neighbourhood OR the
// ellipsis-separated neighbourhoods of both teams). Different-competition
// matches produce TWO blocks (one per team's competition — the rare
// cross-competition case).
export interface StandingsWindowBlock {
  code: string;          // the competition code (PL/PD/SA/BL1/FL1/CL/PGL)
  compFa: string;        // the Persian competition name (st.faName || COMP_EN[code] || code — the same fallback teamStandingsWindow uses)
  emblem: string | null; // the competition emblem URL (st.emblem || null)
  rows: StandingsWindowRow[];  // the 5-row neighbourhood (or 5+ellipsis+5 for separated ranges)
}

// The match's standings window — the selection result. At most TWO blocks:
//   - same-competition: 1 block (the merged/touching neighbourhood OR the
//     ellipsis-separated neighbourhoods of both teams).
//   - different-competition: 2 blocks (one per team's competition).
//   - null when the standings cache is missing, the competition hasn't started,
//     the table is degenerate (<2 teams), OR neither team is found (cups/KO).
// The composer's no-empty-cards law: when null, the mcentre-standings section
// is omitted (the slot exists since S02; S11 wires the renderer).
export type StandingsWindow = StandingsWindowBlock[] | null;

// ---- the lookup helper (mirrors teamStandingsWindow in data.ts) ----
//
// Find a team in the standings cache. Tries the fixture's competition code
// FIRST (fullByCode is loaded for it — the freshest complete source), then
// falls back to ANY code in fullByCode or the payload's top-8 compacts that
// contains the team. This is the EXACT precedence the existing
// teamStandingsWindow uses (data.ts — the team-page precedent, byte-frozen;
// S10's unified-window does NOT call teamStandingsWindow — it computes both
// neighbourhoods directly so the team-page path stays byte-frozen).
//
// Returns { code, st, me, idx } — the code, the standings table, the team row,
// + the array index of the team. Returns null when the team isn't found in any
// eligible code (a code with started===false OR <2 teams is skipped — the
// fail-closed gate, audit §67).
function findTeamInStandings(
  teamName: string,
  fixtureCode: string | null,
  fullByCode: Record<string, any> | undefined,
  stAll: any
): { code: string; st: any; me: any; idx: number } | null {
  const norm = normalizeTeamName(teamName);
  if (!norm) return null;
  // The lookup candidates in priority order: the fixture's code first (fullByCode
  // preferred over stAll — the freshest, complete source), then ALL other codes
  // in fullByCode, then ALL other codes in stAll (the payload's top-8 compacts).
  // A code with started===false OR <2 teams is SKIPPED (the fail-closed gate).
  const seen = new Set<string>();
  const candidates: { code: string; st: any }[] = [];
  const push = (code: string, st: any) => {
    if (!code || seen.has(code)) return;
    if (!st || typeof st !== "object") return;
    if (st.started === false) return;       // pre-season — fail-closed (audit §67)
    if (!Array.isArray(st.teams) || st.teams.length < 2) return; // degenerate table
    seen.add(code);
    candidates.push({ code, st });
  };
  // 1. The fixture's code first (fullByCode preferred — the freshest source).
  if (fixtureCode) {
    const full = fullByCode && fullByCode[fixtureCode];
    if (full && Array.isArray(full.teams) && full.teams.length >= 2 && full.started !== false) {
      push(fixtureCode, full);
    } else if (stAll && stAll[fixtureCode]) {
      push(fixtureCode, stAll[fixtureCode]);
    }
  }
  // 2. All other codes in fullByCode (the freshest, complete source).
  if (fullByCode && typeof fullByCode === "object") {
    for (const c of Object.keys(fullByCode)) {
      if (c === fixtureCode) continue;
      push(c, fullByCode[c]);
    }
  }
  // 3. All other codes in stAll (the payload's top-8 compacts fallback).
  if (stAll && typeof stAll === "object") {
    for (const c of Object.keys(stAll)) {
      if (c === fixtureCode) continue;
      if (seen.has(c)) continue; // fullByCode already added this code (preferred)
      push(c, stAll[c]);
    }
  }
  // Walk the candidates in priority order; the first hit wins.
  for (const { code, st } of candidates) {
    const me = st.teams.find((t: any) => t && normalizeTeamName(t.name) === norm);
    if (me) {
      const idx = st.teams.indexOf(me);
      if (idx >= 0) return { code, st, me, idx };
    }
  }
  return null;
}

// Compute a team's five-row neighbourhood (the team's row ± 2, clamped at the
// table edges). Returns { st, rows, meIdx } — the standings table, the 5-row
// slice (fewer at the edges), + the team's index within the slice. This is the
// EXACT clamp logic the existing teamStandingsWindow uses (data.ts — the
// team-page precedent): start = max(0, min(idx-2, max(0, len-5))). The team at
// pos 1 → rows 0..4 (no rows above); the team at pos N → rows N-5..N-1 (no rows
// below); the team near the middle → the team centered.
function teamNeighbourhood(hit: { st: any; me: any; idx: number }): { rows: any[]; meIdx: number } {
  const teams = hit.st.teams;
  const len = teams.length;
  // Clamp: the team's row ± 2, but never start before 0 or after len-5 (so the
  // window stays within the table — fewer than 5 rows at the edges is
  // acceptable, no fabricated rows).
  const start = Math.max(0, Math.min(hit.idx - 2, Math.max(0, len - 5)));
  // The slice end is start+5, but clamped at the table length (edge clamp).
  const end = Math.min(start + 5, len);
  const rows = teams.slice(start, end);
  const meIdx = rows.indexOf(hit.me);
  return { rows, meIdx };
}

// Build a single-team neighbourhood block (one team's 5-row window, with the
// participant-mark on the team's row). Used when:
//   - same-competition but only ONE team is found (the other isn't in the
//     standings — a single-team window).
//   - different-competition (each team gets its own block — called once per
//     team).
function singleTeamBlock(
  code: string,
  st: any,
  neighbourhood: { rows: any[]; meIdx: number },
  participant: "home" | "away"
): StandingsWindowBlock {
  const rows: StandingsWindowRow[] = neighbourhood.rows.map((t: any, i: number) => ({
    team: t,
    participant: i === neighbourhood.meIdx ? participant : null
  }));
  return {
    code,
    compFa: st.faName || COMP_EN[code] || code,
    emblem: st.emblem || null,
    rows
  };
}

// Merge two neighbourhoods (same competition) into one block. The ranges are
// [startA, endA] and [startB, endB] (indices into the standings array). They:
//   - OVERLAP (startA <= endB && startB <= endA) → MERGE (the union is
//     contiguous).
//   - TOUCH (gap 0 — adjacent, endA+1==startB — OR gap 1 — one row between
//     them) → MERGE (the gap row IS included — it's contextual between the two
//     neighbourhoods, not "intervening" in the separated-ranges sense).
//   - SEPARATED (gap ≥ 2) → ELLIPSIS sentinel + show both neighbourhoods (the
//     intervening teams are NOT loaded/displayed — spec §8).
//
// The merged block is the UNION of both ranges (contiguous, de-duplicated, in
// standings order) with the participant-mark on each team's row. The separated
// block is neighbourhoodA + ellipsis + neighbourhoodB (in standings order — the
// lower-positioned team's neighbourhood first).
function mergeNeighbourhoods(
  code: string,
  st: any,
  hitA: { me: any; idx: number },
  hitB: { me: any; idx: number },
  participantA: "home" | "away",
  participantB: "home" | "away"
): StandingsWindowBlock {
  const teams = st.teams;
  // Order A before B by standings index (so the lower-positioned team's
  // neighbourhood renders first — the standings order, top to bottom).
  const [a, b] = hitA.idx <= hitB.idx ? [hitA, hitB] : [hitB, hitA];
  const [pa, pb] = hitA.idx <= hitB.idx ? [participantA, participantB] : [participantB, participantA];
  // Compute each team's neighbourhood (5-row window, clamped at the edges).
  const na = teamNeighbourhood({ st, me: a.me, idx: a.idx });
  const nb = teamNeighbourhood({ st, me: b.me, idx: b.idx });
  // The neighbourhood indices are relative to their slice start. Compute the
  // absolute indices in the standings array.
  const aStart = Math.max(0, Math.min(a.idx - 2, Math.max(0, teams.length - 5)));
  const bStart = Math.max(0, Math.min(b.idx - 2, Math.max(0, teams.length - 5)));
  const aEnd = Math.min(aStart + 5, teams.length);  // exclusive
  const bEnd = Math.min(bStart + 5, teams.length);  // exclusive
  // The gap between the two ranges (the number of teams BETWEEN them, exclusive
  // of the ranges themselves). gap 0 = adjacent (touching); gap 1 = one row
  // between them (still touching — merge); gap >= 2 = separated (ellipsis).
  const gap = Math.max(0, bStart - aEnd);
  const compFa = st.faName || COMP_EN[code] || code;
  const emblem = st.emblem || null;
  if (gap <= 1) {
    // MERGE: the union of both ranges (contiguous, de-duplicated, in standings
    // order). The gap row (if gap == 1) IS included — it's contextual between
    // the two neighbourhoods.
    const unionStart = aStart;
    const unionEnd = bEnd;  // exclusive (bEnd >= aEnd since b.idx >= a.idx)
    const unionRows = teams.slice(unionStart, unionEnd);
    const rows: StandingsWindowRow[] = unionRows.map((t: any) => {
      const isA = t === a.me;
      const isB = t === b.me;
      return {
        team: t,
        participant: isA ? pa : (isB ? pb : null)
      };
    });
    return { code, compFa, emblem, rows };
  }
  // SEPARATED: neighbourhoodA + ellipsis + neighbourhoodB. The intervening
  // teams (the gap rows) are NOT loaded/displayed (spec §8: "Do not load or
  // display intervening teams").
  const rowsA: StandingsWindowRow[] = na.rows.map((t: any) => ({
    team: t,
    participant: t === a.me ? pa : null
  }));
  const rowsB: StandingsWindowRow[] = nb.rows.map((t: any) => ({
    team: t,
    participant: t === b.me ? pb : null
  }));
  const rows: StandingsWindowRow[] = [...rowsA, { ellipsis: true }, ...rowsB];
  return { code, compFa, emblem, rows };
}

// ---- the unified-window entry point (the S10 selection algorithm) ----
//
// The match's standings window. Computes both participating teams' five-row
// neighbourhoods from the already-loaded standings data (the zero-runtime-cost
// law — zero new KV reads, zero new awaits, zero new fetches), merges/touches/
// separates them per the spec §8, marks the participant rows, and fail-closes
// (returns null) when neither team is found OR the cache is missing/pre-season/
// degenerate (the audit §67 gate).
//
// The lookup precedence mirrors the existing teamStandingsWindow (data.ts): the
// fixture's competition code first (fullByCode — the freshest complete source,
// already loaded by buildMatchPage's fullByCodeFor), then ANY code in
// fullByCode or the payload's top-8 compacts that contains the team (covers the
// cross-competition branch). The team-page path (teamStandingsWindow) is NOT
// modified — the unified-window computes both neighbourhoods directly (the S10
// module is purely additive; the team-page path stays byte-frozen).
export function matchStandingsWindow(
  sm: SeoMatch,
  ctx: SeoCtx,
  fullByCode?: Record<string, any>
): StandingsWindow {
  const m = sm && sm.s;
  if (!m || !m.homeTeam || !m.awayTeam) return null;
  const fixtureCode = m.competition && m.competition.code || null;
  const stAll = ctx && ctx.payload && ctx.payload.standings || null;
  // Find each participating team in the standings cache (try the fixture's code
  // first, then any code containing the team — the teamStandingsWindow
  // precedent). Each hit carries the code + the standings table + the team row
  // + the team's array index.
  const homeHit = findTeamInStandings(m.homeTeam.name, fixtureCode, fullByCode, stAll);
  const awayHit = findTeamInStandings(m.awayTeam.name, fixtureCode, fullByCode, stAll);
  // Fail-closed: NEITHER team found → no window (the no-empty-cards law — the
  // mcentre-standings section is omitted; the جدول nav item stays filtered out).
  if (!homeHit && !awayHit) return null;
  // Only ONE team found → a single-team window (the spec's "five-row
  // neighbourhood around each participating team" doesn't require BOTH to be
  // found — show the ones we CAN find, no fabricated rows).
  if (homeHit && !awayHit) {
    return [singleTeamBlock(homeHit.code, homeHit.st, teamNeighbourhood(homeHit), "home")];
  }
  if (awayHit && !homeHit) {
    return [singleTeamBlock(awayHit.code, awayHit.st, teamNeighbourhood(awayHit), "away")];
  }
  // Both teams found. Same competition → merge/touch/separate. Different
  // competition → two separate blocks (one per team's competition).
  const homeHitNonNull = homeHit!;
  const awayHitNonNull = awayHit!;
  if (homeHitNonNull.code === awayHitNonNull.code) {
    // Same competition — the unified window. Merge/touch/separate per the spec.
    const block = mergeNeighbourhoods(
      homeHitNonNull.code,
      homeHitNonNull.st,
      { me: homeHitNonNull.me, idx: homeHitNonNull.idx },
      { me: awayHitNonNull.me, idx: awayHitNonNull.idx },
      "home",
      "away"
    );
    return [block];
  }
  // Different competitions — two separate blocks (the rare cross-competition
  // case: a friendly/super-cup between teams from different leagues). Each
  // team gets its own 5-row neighbourhood in its own competition's table.
  return [
    singleTeamBlock(homeHitNonNull.code, homeHitNonNull.st, teamNeighbourhood(homeHitNonNull), "home"),
    singleTeamBlock(awayHitNonNull.code, awayHitNonNull.st, teamNeighbourhood(awayHitNonNull), "away")
  ];
}
