// SportSignal — SEO Follow-up Track Session 18 (S18 — the P1-1 gap fix,
// docs/specs/seo-followup-track.md §Session 18): the authored editorial
// body-content module.
//
// OWNERSHIP (the session brief's deliverable: "extend narrative.ts or a new
// content-*.ts module; one file one responsibility; do NOT bloat pages.ts"):
// THIS module owns the EDITORIAL BODY COPY on the team + competition detail
// pages — the substantive Persian prose BELOW the answer-sentence (the
// Helpful-Content depth the gap audit P1-1 names: "the pages are technically
// correct but thin — an editorial body of original prose is the biggest
// ranking lever"). It follows the faq-content.ts S17 authoring discipline
// (a NEW sibling module, never pages.ts bloat) + the narrative.ts S08
// deterministic-template precedent (original prose COMPOSED from the real
// loaded fields — never scraped, never aggregated, never invented).
//
// S18 LAWS (the spec §Session 18 + the standing constraints):
// - ORIGINAL CONTENT ONLY (the original-content rule): every sentence is
//   deterministic Persian prose composed from the already-loaded data
//   fields. NO scraped/aggregated text (no copy-paste markers, no provider
//   descriptions), NO invented facts (the no-fabrication guard: every figure
//   cited in the prose comes from the window's own snapshot row / the
//   team's own fixture list — the SAME sources the visible cards render).
// - E-E-A-T grounding: each editorial section cites the data source once
//   (football-data.org — the footer's own srcline contract), in Persian,
//   so the prose self-identifies its provenance without a new DOM element.
// - MISSING-IS-NOT-ZERO (the standing law): a team with no standings row
//   omits the standings paragraph (NEVER a «ردیف نامعلوم» placeholder); a
//   team with no finished window omits the form paragraph (NEVER a «بدون
//   فرم» placeholder); the H2 rides ALWAYS (the section shell renders with
//   the honest one-line lead) — the no-empty-cards law applies to CARDS,
//   this is ONE prose card whose inner paragraphs degrade honestly.
// - ZERO-RUNTIME-COST (ADR-006 — the law every session restates): the
//   functions read ONLY the already-loaded arguments (stw/meRow/finished/
//   upcoming/name + the pure formatters). Zero new awaits, zero new KV
//   reads, zero new fetches — buildTeamPage's await count stays unchanged.
// - FREEZE-SAFE: the editorial card renders BELOW the answer-sentence +
//   ABOVE the S17 faqcard (the content, then the Q&A — the S18 brief's
//   placement directive) — NOT a byte-frozen title/H1/description/answer
//   byte (the Dec 4-8 freeze holds; the gate pins this order).
// - PERSIAN + RTL typography: «،» / «؛» / «.» punctuation, ZWNJ (U+200C)
//   in compounds (بازی‌ها / به‌روزرسانی / صدرنشین / رده‌بندی), Persian digits
//   via toFaDigits (the faq-content precedent — numbers in prose are
//   Persian-Indic, never Latin), guillemets around quoted names.
//
// S18 CONTENT DECISION (S18-Content, recorded in docs/DECISIONS.md):
//   the TEAM-page editorial = 2–3 paragraphs (the standings-position
//   narrative [pos/points/played/won-draw-lost + the honest neighborhood]
//   + the recent-results run [the last finished matches, W/D/L phrasing]
//   + the upcoming-run close [the next-fixture outlook, the schedule-list
//   facts]). Each paragraph is CONDITIONAL on its data (MISSING-IS-NOT-
//   ZERO); the lead sentence + the source line ride ALWAYS (the page's
//   editorial section never renders empty — the minimum is the honest
//   schedule-lead + the source citation).
//   the COMPETITION-page editorial = 2 paragraphs (the title-race read
//   [leader + the top-3 spread from the SAME table the page renders] + the
//   coverage note [what this page tracks]). The same laws hold.
//   The MATCH page takes the narrative.ts engine + the Match Centre
//   sections as its editorial depth ALREADY (S08's "why this match
//   matters" + the facts table + the FAQ) — S18 adds NO match-page prose
//   (DECISIONS S18-3: the match page is not thin; the audit's P1-1 named
//   the team/competition pages).
//
// The return shape is a plain string (the pre-built HTML atom — the S04
// hero precedent: pages.ts passes the pre-built atom; the module is the
// projection layer, pages.ts stays the assembler).

import { esc } from "./utils";
import { toFaDigits } from "../utils";
import type { SeoMatch } from "./data";
import { compNameFa } from "./markup";

// ---- the shared source citation (the E-E-A-T provenance line) ----
// One Persian sentence, self-identifying the data provenance — the same
// source the footer's srcline names (football-data.org). Composed once,
// reused by both page builders (the footer precedent's Persian mirror).
const EDITORIAL_SOURCE_NOTE = "داده‌های این بخش از " + "football-data.org" + " دریافت و به‌روزرسانی می‌شود.";

// The Persian W/D/L words (the formRowHtml W_LABEL precedent — reused for
// prose, never rendered as bare letters here).
function wdlFa(cnt: { W: number; D: number; L: number }): string {
  return toFaDigits(String(cnt.W)) + " برد، " + toFaDigits(String(cnt.D)) + " مساوی و " + toFaDigits(String(cnt.L)) + " شکست";
}

// The opponent + score phrase for one finished match of the team, from the
// team's perspective: «برابر حریف (۲–۱)» — the score reads the shaped row's
// FLAT score (pubMatch flattens score.fullTime → s.score.home/away — the
// same shape the visible results card renders; the archived rows carry the
// flat shape too), with the raw fullTime nesting as the fallback. The phrase
// keeps the pair order neutral (never claims home/away side, which the
// archive rows do not always carry honestly for prose).
function resultPhrase(sm: SeoMatch): string {
  const s = sm && sm.s;
  if (!s || !s.utcDate) return "";
  const sc = s.score || (sm.raw && sm.raw.score && sm.raw.score.fullTime) || (sm.raw && sm.raw.score);
  const gh = sc && typeof sc.home === "number" ? sc.home : null;
  const ga = sc && typeof sc.away === "number" ? sc.away : null;
  const opp = (s.homeTeam && (s.homeTeam.faName || s.homeTeam.name)) || "";
  const opp2 = (s.awayTeam && (s.awayTeam.faName || s.awayTeam.name)) || "";
  const pair = opp && opp2 ? opp + " – " + opp2 : (opp || opp2);
  const score = gh != null && ga != null ? " (" + toFaDigits(String(gh)) + "–" + toFaDigits(String(ga)) + ")" : "";
  return pair + score;
}

// ==================== S18-M1: the team-page editorial ====================
// buildTeamEditorialHtml — the team's season-so-far prose. Reads ONLY the
// arguments buildTeamPage already holds (name, stw/meRow, finished list,
// upcoming list) — zero new loads. Returns a card with an h2 + 1–3 <p>
// paragraphs (the .prose card family — the faqcard/hub prose vocabulary,
// zero new CSS) + the source note (the E-E-A-T line). Paragraphs degrade
// honestly per MISSING-IS-NOT-ZERO; the card itself always renders (the
// lead + the source note are always honest).
export function buildTeamEditorialHtml(opts: {
  name: string;
  stw: { code: string; compFa: string; emblem: string | null; rows: any[]; meIdx: number } | null;
  meRow: any; // stw.rows[stw.meIdx] when meIdx >= 0 (pos/points/played/won/draw/lost)
  finished: SeoMatch[]; // the team's own finished list (teamMatches — already loaded)
  upcoming: SeoMatch[]; // the team's own upcoming list (teamMatches — already loaded)
}): string {
  const name = opts && opts.name ? String(opts.name) : "";
  if (!name) return ""; // the degenerate guard (no nameless editorial card)
  const out: string[] = [];

  // P1 — the standings-position narrative (CONDITIONAL on the row; the
  // figures are the SAME snapshot row the window renders — one source).
  const r = opts.meRow;
  if (r && r.pos != null && r.points != null && opts.stw && opts.stw.compFa) {
    const pos = toFaDigits(String(r.pos));
    const pts = toFaDigits(String(r.points));
    const played = r.played != null ? toFaDigits(String(r.played)) : null;
    const wdl = (r.won != null && r.draw != null && r.lost != null)
      ? wdlFa({ W: Number(r.won), D: Number(r.draw), L: Number(r.lost) })
      : null;
    const compFa = String(opts.stw.compFa);
    // the honest position bands (composed facts only — no promotion/
    // relegation claims: the pool carries no zone data for prose).
    let band = "";
    const posN = Number(r.pos);
    const totalRows = (opts.stw.rows && opts.stw.rows.length) || 0;
    if (posN > 1 && posN <= 3) {
      band = "در رده‌بندی صدرنشین‌ها";
    } else if (posN > 3 && posN <= 6) {
      band = "در بخش بالای جدول";
    } else if (totalRows && posN > totalRows - 3) {
      band = "در انتهای جدول";
    }
    const lead = name + " با " + pts + " امتیاز" + (played ? " از " + played + " بازی" : "") +
      " در ردهٔ " + pos + " " + compFa + " قرار دارد" + (posN === 1 ? " — در صدر جدول" : (band ? " (" + band + ")" : "")) + ".";
    const rest = wdl ? " کارنامهٔ فصل این تیم تا این لحظه " + wdl + " است." : "";
    out.push(lead + rest);
  }

  // P2 — the recent-results run (CONDITIONAL on a non-empty finished list —
  // the team's OWN finished matches, the same list the «نتایج اخیر» card
  // renders; no streak/winless labels — only the composed run).
  const fin = Array.isArray(opts.finished) ? opts.finished : [];
  if (fin.length) {
    const n = Math.min(fin.length, 5);
    const runs: string[] = [];
    for (let i = 0; i < n; i++) {
      const ph = resultPhrase(fin[i]);
      if (ph) runs.push(ph);
    }
    if (runs.length) {
      out.push("بازی‌های اخیر این تیم (به‌ترتیب از جدیدترین): " + runs.join("؛ ") + " — نتایج کامل در بخش «نتایج اخیر» همین صفحه آمده است.");
    }
  }

  // P3 — the upcoming-run close (CONDITIONAL on a next fixture; the
  // schedule facts the answer sentence already leads with are NOT restated
  // — only the window's shape: how many queued + the next opponent + the
  // distinct competitions, from the team's OWN upcoming list).
  const up = Array.isArray(opts.upcoming) ? opts.upcoming : [];
  const next = up.length ? up[0] : null;
  if (next && next.s && next.s.utcDate) {
    const comps: string[] = [];
    for (const m of up) {
      const c = m && m.s ? compNameFa(m.s) : "";
      if (c && !comps.includes(c)) comps.push(c);
      if (comps.length >= 3) break;
    }
    const countFa = up.length > 1 ? toFaDigits(String(up.length)) + " بازی ثبت‌شده" : "یک بازی ثبت‌شده";
    const opp = (next.s.homeTeam && (next.s.homeTeam.faName || next.s.homeTeam.name)) || "";
    const opp2 = (next.s.awayTeam && (next.s.awayTeam.faName || next.s.awayTeam.name)) || "";
    const pair = opp && opp2 ? opp + " – " + opp2 : (opp || opp2);
    const compTail = comps.length === 1 ? " در " + comps[0] : (comps.length ? " در " + comps.join(" و ") : "");
    out.push("در برنامه پیش‌رو " + countFa + " است؛ نزدیک‌ترین دیدار " + pair + compTail + " است و فاصلهٔ زمانی آن در پاسخ بالا و بخش «بازی‌های پیش‌رو» آمده است.");
  }

  // the assembly: the .prose card (the hub/faucard family — zero new CSS)
  // + the h2 + the honest lead + the paragraphs + the E-E-A-T source note.
  const lead = out.length
    ? "در ادامه، وضعیت فصل " + esc(name) + " بر پایهٔ داده‌های همین صفحه مرور می‌شود."
    : "برنامه و نتایج " + esc(name) + " بر پایهٔ داده‌های همین صفحه به‌روزرسانی می‌شود.";
  const paras = out.map((p) => "<p>" + esc(p) + "</p>").join("");
  return '<div class="card prose editorialcard"><h2>وضعیت فصل ' + esc(name) + "</h2>" +
    "<p>" + lead + "</p>" + paras +
    '<p class="editorsrc">' + esc(EDITORIAL_SOURCE_NOTE) + "</p></div>";
}

// ==================== S18-M2: the competition-page editorial ====================
// buildCompetitionEditorialHtml — the competition's title-race read. Reads
// ONLY the arguments buildCompetitionPage already holds (cNameFa + the
// standings rows the page's own table renders — the same `st.teams` array,
// passed in by the caller; zero new loads). Two paragraphs: the title-race
// read (leader + the top-3 points spread — composed facts only) + the
// coverage note (what this hub tracks, the page's own honest scope).
export function buildCompetitionEditorialHtml(opts: {
  cNameFa: string;
  rows: any[]; // the standings rows the page's own table renders (pos/name/faName/points/played)
  upcomingCount: number; // the count the «بازی‌های پیش‌رو» listhead renders
}): string {
  const cName = opts && opts.cNameFa ? String(opts.cNameFa) : "";
  if (!cName) return ""; // the degenerate guard
  const rows = Array.isArray(opts.rows) ? opts.rows : [];
  const out: string[] = [];

  // P1 — the title-race read (CONDITIONAL on ≥2 table rows with pos+points —
  // the SAME rows the visible table renders; cups with no table omit).
  const top = rows.filter((t: any) => t && t.pos != null && t.points != null).slice(0, 3);
  if (top.length >= 2) {
    const leader = top[0];
    const leaderName = (leader.faName || leader.name) || "";
    const leaderPts = toFaDigits(String(leader.points));
    const second = top[1];
    const gap = Number(second.points) != null && Number(leader.points) != null
      ? Math.max(0, Number(leader.points) - Number(second.points))
      : null;
    const gapFa = gap != null ? toFaDigits(String(gap)) : null;
    const p1 = "صدر جدول " + cName + " در دست " + leaderName + " با " + leaderPts + " امتیاز است" +
      (gapFa ? " و فاصلهٔ آن با ردهٔ دوم " + gapFa + " امتیاز است." : ".");
    const third = top[2];
    const p2 = third && (third.faName || third.name)
      ? "رده‌های دوم و سوم — " + (second.faName || second.name) + " و " + (third.faName || third.name) +
        " — در فاصلهٔ امتیازی نزدیک‌تری به ستیز قهرمانی قرار دارند."
      : "نبرد رده‌های بالای جدول در ادامهٔ فصل تعیین‌کننده است.";
    out.push(p1 + " " + p2);
  }

  // P2 — the coverage note (ALWAYS; the page's own honest scope — the same
  // facts the answer sentence + the listhead render, phrased as the hub's
  // editorial self-description; no invented coverage claims).
  const cntFa = opts.upcomingCount != null ? toFaDigits(String(opts.upcomingCount)) : "۰";
  out.push("این صفحه بازی‌های بزرگ پیش‌روی " + cName + " را دنبال می‌کند — هم‌اکنون " + cntFa +
    " بازی ثبت‌شده — و جدول کامل رقابت را در بخش «جدول» همین صفحه می‌بینید.");

  const lead = "در ادامه، تصویر کلی " + cName + " بر پایهٔ داده‌های همین صفحه مرور می‌شود.";
  const paras = out.map((p) => "<p>" + esc(p) + "</p>").join("");
  return '<div class="card prose editorialcard"><h2>تصویر کلی ' + esc(cName) + "</h2>" +
    "<p>" + esc(lead) + "</p>" + paras +
    '<p class="editorsrc">' + esc(EDITORIAL_SOURCE_NOTE) + "</p></div>";
}
