// Shared match-identity / de-duplication helpers (M1 slice #2).
//
// Pure logic, depends only on src/teams.ts. Consumed by:
//   - the esbuild Worker bundle via `import { matchKey, canonDedupe } from "./dedupe"`
//   - scripts/check-dedupe.js and live-derby-test.js via
//     `require("../src/dedupe.ts")` (Node type stripping; erasable syntax only)
//
// v13.33-ts: migrated from plain JS to TypeScript. The MatchLike interface
// documents the exact fields this module touches (provider payloads carry
// many more — they pass through untouched). Logic is byte-identical to the
// previous JS.
//
// Do not inline copies back into the worker.
import { normalizeTeamName } from "./teams.ts";

// Minimal structural type for the provider match objects this module reads.
// canonDedupe passes provider rows through WHOLESALE (extra fields ride
// along); downstream consumers read additional fields (e.g. `status`) off
// the same rows, so the interface documents those too.
interface MatchLike {
  id?: string;
  utcDate?: string;
  venue?: string;
  status?: string;
  competition: { code: string };
  homeTeam: { name: string; crest?: string };
  awayTeam: { name: string; crest?: string };
}

// Stable identity key for a single match (used for notification tracking, NOT
// for cross-provider dedupe — that is canonDedupe's shorter key).
function matchKey(match: MatchLike): string {
  return normalizeTeamName(match.homeTeam.name) + "|" + normalizeTeamName(match.awayTeam.name) + "|" + String(match.utcDate || "").slice(0, 16);
}

// Collapse two providers' copies of the SAME match to one row, keeping venue +
// crests from whichever copy carries them. Late copies (watch-order) win for
// the row body but adopt earlier venue/crest.
// v12.2 pairing-proximity pass: providers occasionally report the SAME fixture
// with kickoffs ~a day apart (one copy shifted to a next-day default slot —
// observed live: FD day-N evening vs TSP day-N+1 ~15:00Z). The date-suffixed
// key above lets both survive and the page showed the same pairing twice.
// A same-competition same-pairing pass collapses them:
//  - identical non-empty id ⇒ same provider's same fixture (time drift or a
//    reschedule) — the LATER list entry wins (fresher copy overwrites, matching
//    cacheMatches' documented intent);
//  - otherwise within 48h ⇒ cross-provider kickoff noise — the earlier kickoff
//    wins (the varied/authoritative slot in every observed pair).
// In both cases venue/crests are adopted from the dropped copy. Legit distinct
// meetings of the same ordered pairing are weeks apart (leagues are double
// round-robin with swapped venues), so the window can't merge real fixtures.
function canonDedupe(list: MatchLike[]): MatchLike[] {
  const canon = (m: MatchLike) => `${m.competition.code}|${normalizeTeamName(m.homeTeam.name)}|${normalizeTeamName(m.awayTeam.name)}|${(m.utcDate || "").slice(0, 10)}`;
  const adopt = (cur: MatchLike, m: MatchLike) => {
    if (!cur.venue && m.venue) cur.venue = m.venue;
    if (!cur.homeTeam.crest && m.homeTeam.crest) cur.homeTeam.crest = m.homeTeam.crest;
    if (!cur.awayTeam.crest && m.awayTeam.crest) cur.awayTeam.crest = m.awayTeam.crest;
  };
  const byKey = new Map<string, MatchLike>();
  for (const m of list) {
    const k = canon(m);
    const cur = byKey.get(k);
    if (cur) adopt(m, cur);
    byKey.set(k, m);
  }
  const byPair = new Map<string, MatchLike>();
  const out: MatchLike[] = [];
  for (const m of [...byKey.values()]) {
    const pk = `${m.competition.code}|${normalizeTeamName(m.homeTeam.name)}|${normalizeTeamName(m.awayTeam.name)}`;
    const cur = byPair.get(pk);
    const t = Date.parse(m.utcDate || "");
    const tc = cur ? Date.parse(cur.utcDate || "") : NaN;
    const sameId = !!(m.id && cur && cur.id === m.id);
    const near = !!cur && !isNaN(t) && !isNaN(tc) && Math.abs(t - tc) <= 48 * 36e5;
    if (cur && (sameId || near)) {
      if (sameId || t < tc) {
        // m wins the row (fresher same-id copy, or earlier cross-provider
        // kickoff) and adopts the dropped copy's venue/crests; the slot
        // stays at cur's list position.
        adopt(m, cur);
        out[out.indexOf(cur)] = m;
        byPair.set(pk, m);
      } else {
        adopt(cur, m);
      }
      continue;
    }
    out.push(m);
    byPair.set(pk, m);
  }
  return out;
}

export { matchKey, canonDedupe };
export type { MatchLike };
