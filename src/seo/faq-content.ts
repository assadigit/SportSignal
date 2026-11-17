// SportSignal — Match Centre S16 (M7): the authored FAQ content module.
//
// OWNERSHIP (MATCH-CENTRE-IMPLEMENTATION-AUDIT.md §4 row "FAQ content" grade F
// → S16 authors it, facts-only + §12 file-plan row S16):
// THIS module owns the AUTHORED FAQ copy — which questions to ask, how to phrase
// them (lifecycle-aware), and how to compose the answers from the match's
// already-loaded fields. It is the manually-authored, facts-only content source
// the audit flagged as missing (grade F → S16 fills it).
//
// S16 LAWS (specification §12 "FAQ" + milestones-and-sessions.md M7/S16 +
// decisions 57/58/64/80/13 + audit §4 row "FAQ content"):
// - Facts-only, no fabrication (spec §12 "No fabricated or keyword-stuffed
//   content"; §17 "Never invent broadcast availability, venue details,
//   predictions, stats, events or fixture coverage"). Every answer is a FACT
//   from the match's already-loaded fields (the S04 kickoff, the S14 venue, the
//   competition) OR a standalone editorial policy answer (the timezone policy).
//   A missing venue → that Q OMITS, NOT a placeholder (the no-fabrication
//   discipline — the S14/S15 no-false-empty precedent).
// - Answerable questions only (spec §12 "Only genuinely useful, answerable
//   questions"; decision 57). The candidate set derives from the ALREADY-LOADED
//   ctx (the S04 kickoff/timezone, the S14 venue) + standalone editorial (the
//   timezone policy). The competition question restates the hero's .mchip
//   context in Q&A form (the GEO/AI-citation contract — the hub faqHtml
//   precedent restates the visible list in Q&A form).
// - Plain-text answers (no inner markup — the esc() discipline; the hub
//   faqHtml precedent). Persian throughout; faDateD1/faTime already produce
//   Persian digits (the S05 precedent) — no extra toFaDigits needed in the
//   answers (the dates/times are already Persian-digit).
// - Zero new awaits, zero new KV reads, zero new fetches (ADR-006 — the
//   zero-runtime-cost law). This module reads the SeoMatch fields already
//   loaded by buildMatchPage's three pre-existing awaits (hydrateMatchVenue,
//   loadArchive, fullByCodeFor); the faDateD1/faTime/compNameFa helpers are
//   pure string formatters.
//
// S16 CONTENT DECISION (resolved + recorded per the session brief):
//   S16-Content: 4 candidate questions (3 always + 1 conditional → 3–4 Qs,
//   compact per spec §12; the hub precedent = 4–6):
//   1. «بازی چه زمانی برگزار می‌شود؟»/«… برگزار شد؟» (lifecycle-aware) — the
//      kickoff date+time (faDateD1 + faTime + «به وقت تهران»). ALWAYS (every
//      match carries a utcDate).
//   2. «بازی کجا برگزار می‌شود؟»/«… برگزار شد؟» (lifecycle-aware) — the venue
//      (sm.s.venueFa || sm.s.venue — the S14 venue, ALREADY LOADED by
//      hydrateMatchVenue). CONDITIONAL (omits when no venue — the
//      no-fabrication discipline).
//   3. «این بازی در کدام رقابت است؟» — the competition (compNameFa — the
//      hero's .mchip context restated in Q&A form). ALWAYS (when compFa
//      non-empty; guards the degenerate empty-comp edge).
//   4. «ساعت بازی به وقت کجاست؟» — the timezone policy (standalone editorial —
//      NOT in the hero; the hero shows «به وقت تهران» but does not explain the
//      policy). ALWAYS.
//   The standings/form/schedule questions (the task brief's candidates) are
//   DELIBERATELY omitted: the standings/form/schedule sections already render
//   that data in their own sections, and re-deriving them in the FAQ would
//   re-compute teamStandingsWindow/teamForm/windowSchedule (redundant CPU — the
//   CPU budget is the highest structural risk per audit §13). The FAQ adds
//   value via the Q&A form + the standalone timezone policy, NOT via
//   re-stating the standings/form/schedule.
//
// S16 SCHEMA DECISION (resolved + recorded per the session brief):
//   S16-Schema: OMIT the FAQPage JSON-LD node for the match-page FAQ. Spec §12
//   "No FAQPage schema solely to pursue Google FAQ rich results" governs —
//   Google retired FAQ rich results in August 2023, and the match page's
//   primary structured data (the SportsEvent JSON-LD node — JL.sportsEventNode)
//   already carries the kickoff date/time/venue facts. The visible FAQ text
//   (in the DOM, expandable) is crawlable; no FAQPage node is added. The hub
//   faqHtml()/faqNode() pattern stays byte-frozen (the /about, /methodology,
//   /data hub pages + the window hubs keep their GEO FAQPage node — the match
//   page takes the conservative omit path; spec §12 caution). This module
//   returns RAW { q, a } strings (un-escaped) — the projection (pages.ts
//   matchFaqInput) escapes them into the MatchFaqItemInput { qHtml, aHtml }
//   atoms for the accordion; the byte-frozen JL.faqNode helper is NOT called
//   from the match page (the omit path).
//
// The raw { q, a } return shape mirrors the hub faqHtml() contract ({ q, a }[])
// so the SAME authored content could feed a future FAQPage node if the owner
// authorizes the GEO emit path — but S16 does NOT wire that node (the omit
// decision). The projection escapes; the renderer (matchFaqHtml) wraps in the
// accordion markup.
//
// SEO Follow-up Track Session 17 (S17-M1 — the P1-6 gap fix,
// docs/specs/seo-followup-track.md §Session 17): the module's ownership
// EXTENDS to the TEAM-page authored FAQ (buildTeamFaqItems). The S17 spec is
// the owner-authorized GEO emit path the header above anticipated: the
// detail-page FAQPage node IS now wired (pages.ts buildTeamPage + S17-M2
// buildMatchPage), always fed from the SAME raw { q, a } array the visible
// section renders (the T-20 byte-identical contract — M.faqHtml visible +
// JL.faqNode machine, one source).
//
// S17-CONTENT (the team-page Q&A — real, data-sourced, Persian; NEVER a
// "where to watch" Q — the no-broadcast-claims law):
//   1. «بازی بعدی [team] کی است؟» — the next fixture (the date + the
//      competition + the Tehran time). ALWAYS (the #1 GSC-observed query
//      pattern — «بازی بعدی بارسلونا»; an empty window answers honestly
//      that nothing is scheduled, the hub empty-state precedent).
//   2. «بازی‌های [team] در کدام لیگ است؟» — the competition(s) the team's
//      OWN upcoming fixtures name (the distinct compNameFa values — a team
//      in league + cup names BOTH, honestly; compNameFa comes from the
//      already-loaded ctx pool). CONDITIONAL (omits when no upcoming fixture
//      names a competition — the no-fabrication discipline).
//   3. «ساعت بازی بعدی [team] به وقت تهران چند است؟» — the next fixture's
//      kickoff time in Tehran + the UTC-honesty note (the match page carries
//      the UTC time — matchAnswerSentence's «زمان جهانی» clause — so the
//      pointer is true). CONDITIONAL (omits when there is no next fixture).
//   The zero-runtime-cost law holds: buildTeamFaqItems reads the team's
//   ALREADY-LOADED upcoming list (teamMatches — one of buildTeamPage's
//   pre-existing loads) + the pure faDateD1/faTime/compNameFa/seoTeamFaName
//   string formatters. Zero new awaits, zero new KV reads, zero new fetches.
//   Persian digits ride the faDateD1/faTime helpers (no toFaDigits needed).

import type { SeoMatch } from "./data";
import { faDateD1, faTime } from "./utils";
import { compNameFa } from "./markup";
import { seoTeamFaName } from "./team-names";

// The question phrasings (lifecycle-aware — the verb swaps for past/present).
// The upcoming phrasing («برگزار می‌شود») vs the live/finished phrasing
// («برگزار شد») — the question tense matches the answer tense (the
// lifecycle-aware discipline; a finished match asks «چه زمانی برگزار شد؟»,
// NOT «چه زمانی برگزار می‌شود؟» — the latter would be misleading for a past
// match).
const FAQ_KICKOFF_Q_UPCOMING = "بازی چه زمانی برگزار می‌شود؟";
const FAQ_KICKOFF_Q_PAST = "بازی چه زمانی برگزار شد؟";
const FAQ_VENUE_Q_UPCOMING = "بازی کجا برگزار می‌شود؟";
const FAQ_VENUE_Q_PAST = "بازی کجا برگزار شد؟";
const FAQ_COMP_Q = "این بازی در کدام رقابت است؟";
const FAQ_TIMEZONE_Q = "ساعت بازی به وقت کجاست؟";

// The standalone editorial answer (the timezone policy — NOT derived from a
// specific match's data; explains SportSignal's general time-display policy).
// Facts-only, manually authored (audit §4 row "FAQ content" grade F → S16).
const FAQ_TIMEZONE_A =
  "ساعت همه بازی\u200cها در اسپرت\u200cسیگنال به وقت تهران نمایش داده می\u200cشود و زمان جهانی هر بازی در صفحه اختصاصی همان بازی آمده است.";

// The answer-verb (lifecycle-aware — swaps with the question tense).
const FAQ_VERB_UPCOMING = "برگزار می\u200cشود";
const FAQ_VERB_PAST = "برگزار شد";

// The lifecycle flag — computed exactly as buildMatchPage does (sm.raw.status
// FINISHED → past; IN_PLAY|LIVE|PAUSED → live (treated as past-tense — the
// match has started); else upcoming). The verb + the question phrasing pick
// the past form for live/finished (the match has already started/ended), the
// upcoming form for SCHEDULED.
function isPast(sm: SeoMatch): boolean {
  const st = String((sm && sm.raw && sm.raw.status) || "").toUpperCase();
  return st === "FINISHED" || /IN_PLAY|LIVE|PAUSED/i.test(st);
}

// The authored FAQ items — the raw { q, a } list (un-escaped; the projection
// in pages.ts escapes into the MatchFaqItemInput { qHtml, aHtml } atoms). The
// list is built from the match's already-loaded fields (zero new awaits/KV/
// fetches — the zero-runtime-cost law). Every answer is plain text (no inner
// markup — the esc() discipline; the hub faqHtml precedent). The conditional
// questions (venue) omit when their answer is unavailable (the no-fabrication
// discipline — a missing venue → that Q omits, NOT a placeholder).
export function buildMatchFaqItems(sm: SeoMatch): { q: string; a: string }[] {
  if (!sm || !sm.s) return [];
  const s = sm.s;
  const past = isPast(sm);
  const verb = past ? FAQ_VERB_PAST : FAQ_VERB_UPCOMING;
  const out: { q: string; a: string }[] = [];

  // Q1: the kickoff date+time (faDateD1 + faTime + «به وقت تهران»). ALWAYS
  // present (every match carries a utcDate). Lifecycle-aware phrasing.
  if (s.utcDate) {
    out.push({
      q: past ? FAQ_KICKOFF_Q_PAST : FAQ_KICKOFF_Q_UPCOMING,
      a: "این بازی " + faDateD1(s.utcDate) + " ساعت " + faTime(s.utcDate) + " به وقت تهران " + verb + "."
    });
  }

  // Q2: the venue (sm.s.venueFa || sm.s.venue — the S14 venue, ALREADY LOADED
  // by hydrateMatchVenue). CONDITIONAL — omits when no venue (the
  // no-fabrication discipline; the S14 no-empty-cards precedent: a missing
  // venue is NOT «ورزشگاه نامشخص»).
  const venue = s.venueFa || s.venue;
  if (venue) {
    out.push({
      q: past ? FAQ_VENUE_Q_PAST : FAQ_VENUE_Q_UPCOMING,
      a: "این بازی در " + venue + " " + verb + "."
    });
  }

  // Q3: the competition (compNameFa — the hero's .mchip context restated in
  // Q&A form). ALWAYS (when compFa non-empty; guards the degenerate empty-comp
  // edge — the no-fabrication discipline).
  const compFa = compNameFa(s);
  if (compFa) {
    out.push({
      q: FAQ_COMP_Q,
      a: "این بازی در " + compFa + " است."
    });
  }

  // Q4: the timezone policy (standalone editorial — NOT derived from the
  // match's data; explains SportSignal's general time-display policy). ALWAYS
  // present (the policy is a static authored fact).
  out.push({ q: FAQ_TIMEZONE_Q, a: FAQ_TIMEZONE_A });

  return out;
}

// ==================== S17-M1: the team-page FAQ ====================
// The authored team Q&A — the raw { q, a } list (un-escaped; pages.ts
// buildTeamPage feeds the SAME array to M.faqHtml [visible] and JL.faqNode
// [JSON-LD] — the T-20 byte-identical contract, the hub faqHtml/faqNode
// precedent). Reads the team's ALREADY-LOADED upcoming list (teamMatches —
// one of buildTeamPage's pre-existing loads); zero new awaits/KV/fetches.
// The Q phrasings carry the GSC-observed query heads («بازی بعدی X» /
// «ساعت بازی X» — the keyword map + the gap audit P1-6). NEVER a
// "where to watch" Q (the no-broadcast-claims law — S-04/S-05).

// The Persian "and"-join for a short list: [A] → «A»; [A,B] → «A و B»;
// [A,B,C] → «A، B و C» (the distinct-competition list is realistically
// ≤ 3 — league + a continental + a domestic cup).
function faJoinAnd(items: string[]): string {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return items[0] + " و " + items[1];
  return items.slice(0, -1).join("، ") + " و " + items[items.length - 1];
}

// The honest empty answer when nothing is queued (the hub empty-state
// precedent — an empty schedule answers honestly that nothing is scheduled,
// NEVER a fabricated fixture).
const TEAM_FAQ_EMPTY_A =
  "در برنامه فعلی اسپرت\u200cسیگنال بازی بعدی برای این تیم ثبت نشده است؛ به\u200cمحض اعلام برنامه بازی\u200cهای جدید، همین صفحه به\u200cروزرسانی می\u200cشود.";

export function buildTeamFaqItems(name: string, upcoming: SeoMatch[]): { q: string; a: string }[] {
  if (!name) return [];
  const list = Array.isArray(upcoming) ? upcoming : [];
  const next = list.length ? list[0] : null;
  const ns = next && next.s ? next.s : null;
  const out: { q: string; a: string }[] = [];

  // Q1: the next fixture — ALWAYS (the #1 query pattern; the honest empty
  // answer when nothing is queued). The answer mirrors the page's own
  // answer-sentence facts (the fixture + the competition + the date + the
  // Tehran time) in a full Q&A sentence.
  if (ns && ns.utcDate) {
    out.push({
      q: "بازی بعدی " + name + " کی است؟",
      a: "بازی بعدی " + name + "، " + seoTeamFaName(ns.homeTeam) + " – " + seoTeamFaName(ns.awayTeam) +
        " در " + compNameFa(ns) + " است؛ " + faDateD1(ns.utcDate) + " ساعت " + faTime(ns.utcDate) +
        " به وقت تهران برگزار می\u200cشود."
    });
  } else {
    out.push({ q: "بازی بعدی " + name + " کی است؟", a: TEAM_FAQ_EMPTY_A });
  }

  // Q2: the competition(s) — CONDITIONAL on >= 1 competition named by the
  // team's OWN upcoming fixtures (the distinct compNameFa values — a team in
  // league + cup names BOTH, honestly). Omits when the window is empty (the
  // no-fabrication discipline — a missing league is NOT a placeholder).
  const comps: string[] = [];
  for (const sm of list) {
    const c = sm && sm.s ? compNameFa(sm.s) : "";
    if (c && !comps.includes(c)) comps.push(c);
  }
  if (comps.length) {
    out.push({
      q: "بازی\u200cهای " + name + " در کدام لیگ است؟",
      a: "بازی\u200cهای " + name + " در " + faJoinAnd(comps) + " برگزار می\u200cشود."
    });
  }

  // Q3: the next fixture's kickoff time in Tehran — CONDITIONAL on a next
  // fixture (omits when nothing is queued). The UTC pointer is TRUE: every
  // match page carries the UTC time (matchAnswerSentence's «زمان جهانی»
  // clause).
  if (ns && ns.utcDate) {
    out.push({
      q: "ساعت بازی بعدی " + name + " به وقت تهران چند است؟",
      a: "بازی بعدی " + name + " ساعت " + faTime(ns.utcDate) +
        " به وقت تهران شروع می\u200cشود؛ زمان جهانی همان بازی در صفحه اختصاصی\u200cاش آمده است."
    });
  }

  return out;
}
