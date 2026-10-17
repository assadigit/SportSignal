// SportSignal — v13.113-nightgate CUP ELIMINATION detection: the owner's
// rule ("always cover elimination cups. for example Club x eliminated
// against...."). A FINISHED knockout match whose loser is DECIDED becomes
// an elimination event the night digest can never gate away.
//
// WHAT COUNTS (the tie-shape table — cupTieShape):
//   - CL / EL / ECL: the league phase has NO per-match elimination (a
//     table, not a bracket); the knockout playoff / R16 / QF / SF are
//     TWO-LEGGED (the aggregate decides — the loser of leg 1 is NOT out);
//     the FINAL is single-leg.
//   - Domestic cups (FA Cup, EFL Cup, Copa del Rey, Coppa Italia,
//     DFB Pokal) + the Hazfi Cup: single-leg knockout football — the FT
//     loser is eliminated — EXCEPT the EFL/CDR/Coppa/Hazfi SEMI-finals
//     (two-legged). The FA Cup (Wembley semis, replays abolished 2024-25)
//     and the DFB Pokal (always one leg) stay single even at the semis.
//   - International finals tournaments (WC/EC/COPA/AFCON/AFC): knockout
//     rounds R32+ are single-leg; groups/qualifying never claim.
//
// FAILURE DIRECTION: toward silence. A level score (replay/ET-unknown), a
// missing round label in a European tie, an unknown stage token, a
// two-leg tie whose first leg the pool no longer holds — all report NO
// elimination (the match still renders as a plain result line, and the
// individual cup tier still pushes it when a desired side plays). A
// false "X eliminated" is worse than a missed "حذف شد" phrasing.
//
// TWO-LEG LIMIT (documented honestly): the pool retains settled rows 7
// days back (match-pool.ts), so a tie whose first leg is older than that
// cannot be aggregated — leg 2 then reports as a plain result. EFL/CDR/
// Coppa semis (~1-2 week gaps) and CL/EL/ECL knockouts (2-4 weeks) are
// covered exactly when both legs sit inside the retention window.
// Extending retention for old legs would re-open the audit's unbounded
// hoursSince gap checks (notify-audit.ts has no upper time fence of its
// own — pool recency IS that fence) — not worth the false-page risk for
// a phrasing upgrade.
import { CONFIG } from "./config";
import { normalizeTeamName } from "./teams";
import { isDomesticCup } from "./translate";

// The canonical round token of a match: prefers the provider free-text
// roundRaw, falls back to the stage enum (REGULAR_SEASON = no round).
// ORDER MATTERS — the same trap public-matches.ts roundLabel documents:
// "3rd Round"/"Third Round" must be RD3 (a cup early round), never THIRD
// (the third-place playoff), so every "round" pattern runs BEFORE the
// third/place scan; "SEMI_FINALS" contains "final", so semi/quarter run
// before the bare final scan. Separators are [\s_-]* — FD enums are
// underscored ("1ST_ROUND"), sportscore free-text is spaced ("Round 3").
function stageTok(m) {
  const raw = m && m.roundRaw != null && String(m.roundRaw).trim() ? String(m.roundRaw).trim()
    : (m && m.stage != null && String(m.stage) !== "REGULAR_SEASON" ? String(m.stage) : null);
  if (!raw) return null;
  const s = raw.toLowerCase();
  let n;
  if ((n = s.match(/round[\s_-]*of[\s_-]*(\d+)/))) return "R" + parseInt(n[1], 10);
  if ((n = s.match(/round[\s_-]*(\d+)/))) {
    const v = parseInt(n[1], 10);
    if (v >= 1 && v <= 12) return "RD" + v;
  }
  if ((n = s.match(/^(\d+)[\s_-]*(?:st|nd|rd|th)[\s_-]*round/))) {
    const v = parseInt(n[1], 10);
    if (v >= 1 && v <= 12) return "RD" + v;
  }
  const WORDS = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8 };
  if ((n = s.match(/(first|second|third|fourth|fifth|sixth|seventh|eighth)[\s_]+round/))) return "RD" + WORDS[n[1]];
  if (/third|place/.test(s)) return "THIRD";
  if (/qualif|prelim/.test(s)) return "QUAL";
  if (/semi/.test(s)) return "SEMI";
  if (/quarter/.test(s)) return "QF";
  if (/final/.test(s)) return "FINAL";
  if (/play-?off/.test(s)) return "PLAYOFF";
  if (/league|group|regular/.test(s)) return "LEAGUE";
  return "OTHER";
}

// "single" = this match's FT loser is out; "two-leg" = the aggregate of
// this leg + its twin decides; null = no elimination semantics (league
// football, group/league phase, third-place games, qualifiers, unknown).
export function cupTieShape(code, tok) {
  if (!code || !tok) return null;
  if (code === "CL" || code === "EL" || code === "ECL") {
    if (tok === "FINAL") return "single";
    if (tok === "SEMI" || tok === "QF" || tok === "R16" || tok === "R32" || tok === "PLAYOFF") return "two-leg";
    return null; // LEAGUE / RDn / OTHER / THIRD — the league phase & friends
  }
  if (CONFIG.INTL_COMPETITIONS && Object.prototype.hasOwnProperty.call(CONFIG.INTL_COMPETITIONS, code)) {
    if (tok === "FINAL" || tok === "SEMI" || tok === "QF" || tok === "R16" || tok === "R32") return "single";
    return null; // groups + qualifying (two-leg playoffs exist there — never claim)
  }
  if (isDomesticCup(code) || code === "HAZFI_CUP") {
    if (tok === "FINAL") return "single";
    if (tok === "SEMI") {
      // FA Cup semis are one-off Wembley ties; DFB Pokal is single-leg all
      // the way. EFL/CDR/Coppa/Hazfi semis are home-and-away.
      return (code === "FA_CUP" || code === "DFB_POKAL") ? "single" : "two-leg";
    }
    if (tok === "THIRD" || tok === "QUAL" || tok === "PLAYOFF") return null;
    // Early rounds / R16 / QF / unlabeled rows: single-leg. The unlabeled
    // case accepts one documented risk — a label-less TWO-LEG domestic
    // semi would claim elimination after leg 1. Providers label semis
    // reliably (they're the headline rounds), and the alternative (null)
    // would silence the entire early-round coverage the owner asked for.
    return "single";
  }
  return null;
}

function ftFullTime(m) {
  const ft = m && m.score && m.score.fullTime;
  const h = ft && ft.home != null ? Number(ft.home) : null;
  const a = ft && ft.away != null ? Number(ft.away) : null;
  return h != null && a != null && !isNaN(h) && !isNaN(a) ? { home: h, away: a } : null;
}

// The OTHER leg of a two-leg tie, from the pool: same competition, same
// canonical round token, same pairing (either venue order), FINISHED,
// kickoff ≥48h away (legs are days-to-weeks apart — a same-day "twin" is
// a provider duplicate row, and canonDedupe should already have folded
// it; this fence keeps an aggregate from ever double-counting one match).
function findTwinLeg(match, pool) {
  if (!Array.isArray(pool) || !pool.length) return null;
  const code = match.competition.code;
  const tok = stageTok(match);
  if (!tok) return null;
  const homeN = normalizeTeamName(match.homeTeam.name);
  const awayN = normalizeTeamName(match.awayTeam.name);
  const t0 = new Date(match.utcDate).getTime();
  if (isNaN(t0)) return null;
  for (const t of pool) {
    if (!t || t === match || !t.competition || t.competition.code !== code) continue;
    if (String(t.status || "").toUpperCase() !== "FINISHED") continue;
    if (stageTok(t) !== tok) continue;
    if (!t.homeTeam || !t.awayTeam) continue;
    const th = normalizeTeamName(t.homeTeam.name);
    const ta = normalizeTeamName(t.awayTeam.name);
    if (!((th === homeN && ta === awayN) || (th === awayN && ta === homeN))) continue;
    const t1 = new Date(t.utcDate).getTime();
    if (isNaN(t1) || Math.abs(t1 - t0) < 48 * 36e5) continue;
    if (!ftFullTime(t)) continue;
    return t;
  }
  return null;
}

// THE elimination event of a FINISHED match, or null. Shape:
//   { code, home, away, loser, winner, final, agg }
// `final` marks single-leg FINALS (the phrasing says "در فینال"); `agg`
// is the two-leg aggregate { w, l } from the WINNER's perspective (null
// for single-leg). The pairing fields (home/away of the COMPLETING leg)
// let the digest exclude the row from the plain-results section.
export function eliminationOf(match, pool) {
  try {
    if (!match || !match.competition || !match.homeTeam || !match.awayTeam) return null;
    if (String(match.status || "").toUpperCase() !== "FINISHED") return null;
    const sc = ftFullTime(match);
    if (!sc) return null;
    const code = match.competition.code;
    const tok = stageTok(match);
    const shape = cupTieShape(code, tok);
    if (!shape) return null;
    const home = match.homeTeam.name;
    const away = match.awayTeam.name;
    if (shape === "single") {
      if (sc.home === sc.away) return null; // a draw eliminates nobody (replay / ET-unknown)
      return {
        code, home, away,
        loser: sc.home > sc.away ? away : home,
        winner: sc.home > sc.away ? home : away,
        final: tok === "FINAL",
        agg: null
      };
    }
    // two-leg: only the COMPLETED tie claims — both legs FINISHED, the
    // plain aggregate decisive (pens are unknown post-v13.111 slim, so a
    // level aggregate stays silent; the leg-2 result line still renders).
    const twin = findTwinLeg(match, pool);
    if (!twin) return null;
    const tsc = ftFullTime(twin);
    if (!tsc) return null;
    const twinHomeIsHome = normalizeTeamName(twin.homeTeam.name) === normalizeTeamName(home);
    const aggHome = sc.home + (twinHomeIsHome ? tsc.home : tsc.away);
    const aggAway = sc.away + (twinHomeIsHome ? tsc.away : tsc.home);
    if (aggHome === aggAway) return null;
    return {
      code, home, away,
      loser: aggHome > aggAway ? away : home,
      winner: aggHome > aggAway ? home : away,
      final: false,
      agg: { w: Math.max(aggHome, aggAway), l: Math.min(aggHome, aggAway) }
    };
  } catch (e) {
    return null;
  }
}

// The night's elimination events, in pool order, deduped by pairing (a
// tie reaching the night's set through two provider spellings claims
// once — the collapsePairings discipline at event level).
export function collectEliminations(nightMatches, pool) {
  const out = [];
  if (!Array.isArray(nightMatches)) return out;
  const seen = new Set();
  for (const m of nightMatches) {
    const ev = eliminationOf(m, pool);
    if (!ev) continue;
    const k = ev.code + "|" + normalizeTeamName(ev.home) + "|" + normalizeTeamName(ev.away);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(ev);
  }
  return out;
}
