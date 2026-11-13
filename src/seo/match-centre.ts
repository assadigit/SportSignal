// SportSignal — Match Centre (M1/S02): the match page's section composer.
//
// OWNERSHIP SPLIT (MATCH-CENTRE-IMPLEMENTATION-AUDIT.md §12/§16):
// src/seo/pages.ts buildMatchPage keeps every GSC measurement surface (the
// <title> ladder, the meta-description funnel, canonical, JSON-LD nodes,
// breadcrumbs, the h1) and every data load (hydrateMatchVenue / loadArchive
// / fullByCodeFor — the three pre-existing bounded reads; the S1/S2 SEO
// measurement runs until Dec 4–8, so those surfaces stay byte-for-byte).
// THIS module owns the page BODY composition: the semantic section registry
// and the anchored <section> wrappers.
//
// S02 LAWS (milestones-and-sessions.md M1/S02 + engineering-guardrails §1/§3):
// - Pure string composition: no imports, no KV, no fetch, no client script,
//   no new dependencies. The section content arrives fully built from ctx by
//   the existing pages.ts builders — zero new data work by construction.
// - The no-empty-cards law (specification §3/§16): a section with no content
//   is OMITTED entirely — never an empty placeholder, never a fake zero.
// - NO global redesign: the wrappers are inert <section> anchors (no CSS of
//   their own — the shell's .page-col stays the centered editorial
//   container). S03 applies the design system (responsive/RTL/spacing);
//   S04+ migrate the section builders into this module one session at a
//   time (S04 hero — THIS session, S06 nav, S07 facts layout, S10/S11
//   standings, S12 form lists, S14 venue, S15 schedule, S16 faq, S18
//   telegram).
//
// S04 LAW (specification §5, decisions 7–10/85/91–99, Q4=A): the hero
// renderer receives PRE-BUILT content atoms (every data-bearing string
// arrives escaped/finished from pages.ts's matchHeroInput projection), so
// this module stays the pure leaf the S02 cost law pinned — zero imports,
// zero KV, zero client scripts. It owns the hero MARKUP: the competition
// header line above the teams (decision 98), the balanced face-off (home
// right / away left under Persian RTL, equal DOM shape both sides — decision
// 96/97), the central scoreboard's lifecycle branch (decision 10: same core
// identity across upcoming/live/finished; upcoming = kickoff time + the
// untouched hidden .mcount mount, decision 92; live = score + status +
// minute, no extra live apparatus, decision 90; finished = score + the
// «پایان بازی» status, NO scorer block — Q4=A: finished scorers are not in
// the data pool, so none is ever rendered).
//
// S05 LAW (specification §5 Player portraits/Atmosphere/Date and time,
// decisions 7/8/85/93–95/99, Q1=A): the hero gains the both-or-neither
// portrait face-off — the projection (pages.ts) looks BOTH clubs up via the
// shared heroArtSrv data helper and passes EITHER two prebuilt portrait
// <img> atoms OR none, and THIS renderer independently enforces the same
// law (a one-sided portraitHtml never renders half a face-off — decision 7:
// the cinematic face-off exists only when both portraits are available).
// The portrait <img> rides the .mc-port SSR vocabulary (lazy + async +
// no-referrer, decision 85) and carries a pure-DOM onerror that removes
// BOTH portraits when either image fails — no retry, no fetch, no timer
// (decision 85: the fallback is the S04 no-portrait scoreboard, restored
// exactly). The portrait sits at the TOP of each side column, so on mobile
// the existing 560px grid areas keep the two portraits side-by-side ABOVE
// the scoreboard (decision 8). The kickoff line keeps the Tehran wall clock
// + gains the «به وقت تهران» note and the Latin UTC island (Q1=A — no new
// JS; option B stays available to the owner), and the date line upgrades
// to the D1 full localized date (decision 95) — both atoms still arrive
// PREBUILT from the projection. Atmosphere (decision 99) is CSS-only in the
// page-shell style block — zero new assets/requests. The countdown/copy
// script and the actions row stay in pages.ts and ride the hero part
// unchanged.
//
// S07 LAW (specification §5, M3/S07, decisions 75–77 + the editorial briefing/
// facts pairing): the summary renderer receives PRE-BUILT content atoms from
// pages.ts's MatchSummaryInput projection (the answer-first sentence, the facts
// rows, the finished result text — each pre-escaped/prebuilt), so this module
// stays the pure leaf the S02 cost law pinned — zero imports, zero KV, zero
// client scripts. It owns the summary MARKUP: the answer-first briefing card
// (the G-03-style card, id="answer" preserved — the semantic anchor carried
// from the S02 answercard), the compact facts panel wrapping the <table
// class="facts"> shape (the caption + the <th>/<td> rows with their border
// dividers — the fullWhenHtml date row rides byte-identical inside its <td>,
// S05 decision 95 frozen), the .mcentre-cols two-column pairing (briefing |
// facts at the 1080px wide threshold, one-column below — briefing first on
// mobile per spec §5; the S03 pairing grid), and the finished result block
// below the pair (the «نتیجه نهایی» heading + the answer sentence restated).
// No <h2>«خلاصه» heading precedes the briefing (spec §5: "No repeated Summary
// heading before briefing" — the briefing card itself is the answer-first
// surface). The no-empty-cards law holds (the summary is always present — every
// match has an answer sentence — but the facts panel and the result block are
// independently conditional). The mcentre-summary slot (S02 contract) and the
// nav's adaptive Q9=B filter (the non-empty summary drives the خلاصه nav item)
// hold.

// THE ANCHOR VOCABULARY — specification §3 page order. The five sticky-nav
// destinations (decisions 11/13: خلاصه، جدول، فرم، بازی‌ها، ورزشگاه) land on
// summary/standings/form/schedule/venue once S06 ships. The `mcentre-` id
// prefix is deliberately NOT `mc-`: the mobile-card family (mcCells,
// mcHint, the mc-heroes toolchain) already owns that spelling — the two
// vocabularies never mix.

// One registry entry: the HTML id anchor + the Persian landmark label.
export interface MatchCentreSectionDef {
  slot: string;  // HTML id anchor ("mcentre-hero" …)
  label: string; // Persian aria-label (the landmark name)
}

// The registry — specification §3 order, the locked anchor vocabulary every
// later session fills. S02 renders hero/summary/form/related/footer-hook
// (the slots that carry existing content today); nav (S06), standings
// (S10/S11), venue (S14), schedule (S15), faq (S16) and telegram (S18)
// join as their sessions land. The order here is the DOM order — the
// composer never reorders.
export const MC_SECTION_ORDER: MatchCentreSectionDef[] = [
  { slot: "mcentre-hero", label: "تیم‌ها و وضعیت بازی" },
  { slot: "mcentre-nav", label: "ناوبری بخش‌های صفحه" },
  { slot: "mcentre-summary", label: "خلاصه و مشخصات بازی" },
  { slot: "mcentre-standings", label: "جدول رقابت" },
  { slot: "mcentre-form", label: "فرم تیم‌ها" },
  { slot: "mcentre-venue", label: "ورزشگاه" },
  { slot: "mcentre-schedule", label: "بازی‌های هفته" },
  { slot: "mcentre-faq", label: "سوالات متداول" },
  { slot: "mcentre-related", label: "بازی‌های مرتبط" },
  { slot: "mcentre-telegram", label: "کانال تلگرام اسپرت‌سیگنال" },
  { slot: "mcentre-footer-hook", label: "پیوندهای مرتبط" }
];

// The section payloads — the existing builders' output, byte-identical
// (the S02 delegation moves composition, never content). The five S02 keys
// are required (a key may still be "" — that section is then omitted);
// the six later-milestone keys are optional so S06/S10/S14/S15/S16/S18 can
// start passing them without touching this contract again.
export interface MatchCentreParts {
  hero: string;       // the S04 hero (matchHeroHtml output) + actions row + the inline countdown/copy script
  summary: string;    // answer-first card + facts table (+ the finished result block)
  form: string;       // W/D/L strip — "" fail-closed when neither side has history
  related: string;    // sibling-fixtures card — "" when none qualify
  footerHook: string; // the related-links card just before the global footer
  nav?: string;         // sticky section navigation (S06)
  standings?: string;   // five-row context windows (S10/S11)
  venue?: string;       // verified venue panel (S14)
  schedule?: string;    // seven-day fixture schedule (S15)
  faq?: string;         // editorial FAQ (S16)
  telegram?: string;    // featured Telegram promotion (S18)
}

// ---- Match Centre S04 (M2): the hero renderer (specification §5) ----
//
// One side of the face-off. crestHtml carries either the crest <img> or the
// .mcrest-mono initial fallback (pages.ts crestHtml — the branded-image
// fallback rule, decision 85); nameHtml carries the SEO name markup
// (Latin names isolate in <bdi dir="ltr">). Both arrive fully built so this
// module never needs esc itself.
export interface MatchHeroSideInput {
  crestHtml: string; // <img class="mcrest"> or <span class="mcrest mcrest-mono"> — prebuilt
  nameHtml: string;   // M.nameHtml(faName(team)) — prebuilt
  portraitHtml?: string; // <img class="mport"> hero portrait — prebuilt (S05, both-or-neither)
}

// The hero projection. Every field is a pre-escaped/pre-finished string or
// a lifecycle flag computed exactly as the legacy matchHeadHtml center
// column did (live = IN_PLAY|LIVE|PAUSED, finished = FINISHED, scored =
// (live||finished) && score.home != null) — the branch below reuses the
// same gates byte-for-byte, so no data state changes with the rework.
export interface MatchHeroInput {
  compHtml: string;     // the .mchip inner content (emblem <img>? + linked comp name + " · " + round) — prebuilt; emblem omitted when unavailable (decision 98)
  home: MatchHeroSideInput;  // home team — renders FIRST = the right side under Persian RTL
  away: MatchHeroSideInput;  // away team — renders LAST = the left side
  live: boolean;        // IN_PLAY|LIVE|PAUSED
  finished: boolean;   // FINISHED
  scored: boolean;     // (live || finished) && score.home != null
  scoreTxt: string;    // Persian-digit "H – A" (scoreStr) — "" when !scored
  liveTxt: string;     // live status + " (minuteʹ)" suffix — prebuilt (decision 90: no extra live apparatus)
  kickTimeHtml: string;// <time datetime="…">HH:MM</time> + «به وقت تهران» + «… UTC» note spans — prebuilt (S05, Q1=A; decision 93/94: Tehran wall clock, 24h, Persian digits, the Latin UTC island)
  kickDateHtml: string; // faDateD1 full localized date «شنبه ۱۵ آبان ۱۴۰۵ (۵ نوامبر ۲۰۲۶)» — prebuilt (S05, decision 95)
  countHtml: string;   // the hidden-until-filled .mcount mount ("" for live/finished) — prebuilt, preserved exactly (decision 92: no new countdown dependency)
  venueHtml: string;   // the .mvenue map link ("" when none) — prebuilt (S14 owns the venue panel)
}

// The Persian role labels (decision 97: subtle, near the respective teams,
// no additional team color coding or decorative distinction) and the
// finished status (specification §5: a clear «پایان بازی» status — a UI
// label, not a data claim; the scorer block never renders: finished scorers
// are not in the data pool, Q4=A).
const MC_HERO_HOME_LABEL = "میزبان";
const MC_HERO_AWAY_LABEL = "میهمان";
const MC_HERO_FINISHED_LABEL = "پایان بازی";

// One face-off side. BOTH sides share one builder and one DOM shape —
// [portrait?, label, name, crest] — so the two teams are equal by construction
// (decision 96: balanced face-off, equal prominence), and the RTL face-off
// order comes from the document: home first = right, away last = left
// (decision 97). No side-specific color or decoration. The portrait slot
// (S05) renders ONLY when the caller resolved BOTH sides' portraits — the
// both-or-neither law is enforced in matchHeroHtml before this runs, so a
// one-sided portraitHtml can never reach the DOM (decision 7).
function heroSideHtml(side: MatchHeroSideInput, label: string, extraClass: string, portraitHtml: string): string {
  return '<div class="mteam' + (extraClass ? " " + extraClass : "") + '">' +
    (portraitHtml || "") +
    '<div class="mside-lbl">' + label + "</div>" +
    '<div class="mname">' + side.nameHtml + "</div>" +
    side.crestHtml +
    "</div>";
}

// The hero renderer. DOM = the restrained competition header line ABOVE the
// teams (decision 98 — secondary to teams and score), then the three-track
// face-off grid with the central scoreboard between the sides. The center
// column keeps the legacy's exact lifecycle assembly order (chip→score/time
// →status→date→countdown→venue became score/time→status→date→countdown→
// venue with the chip promoted above): same identity across all three
// states (decision 10) — score (or kickoff time) dominant, status clear,
// date + the hidden countdown mount + the venue link carried over
// unchanged for S05/S14.
export function matchHeroHtml(h: MatchHeroInput): string {
  // S05 both-or-neither (decisions 7/8): the cinematic portrait face-off
  // renders ONLY when BOTH sides carry a portrait atom; either side missing
  // (or a one-sided projection bug) collapses to the S04 no-portrait
  // scoreboard with crests and names — never half a face-off.
  const ports = h.home.portraitHtml && h.away.portraitHtml;
  const homePort = ports ? h.home.portraitHtml || "" : "";
  const awayPort = ports ? h.away.portraitHtml || "" : "";
  let center = "";
  if (h.scored) {
    center += '<div class="mscore"' + (h.live ? ' aria-label="در جریان"' : "") + ">" + h.scoreTxt + "</div>";
    if (h.live) center += '<div class="mlive"><span class="mdot" aria-hidden="true"></span>' + h.liveTxt + "</div>";
    else if (h.finished) center += '<div class="mfin">' + MC_HERO_FINISHED_LABEL + "</div>";
  } else {
    center += '<div class="mkick">' + h.kickTimeHtml + "</div>";
  }
  center += '<div class="mkickdate">' + h.kickDateHtml + "</div>";
  if (h.countHtml) center += h.countHtml;
  if (h.venueHtml) center += h.venueHtml;
  return '<section class="mcentre-hero" aria-label="خلاصه بازی">' +
    '<div class="mcentre-hero-comp"><span class="mchip">' + h.compHtml + "</span></div>" +
    '<div class="mcentre-hero-face">' +
    heroSideHtml(h.home, MC_HERO_HOME_LABEL, "", homePort) +
    '<div class="mcenter">' + center + "</div>" +
    heroSideHtml(h.away, MC_HERO_AWAY_LABEL, "away", awayPort) +
    "</div>" +
    "</section>";
}

// ---- Match Centre S07 (M3): the summary & editorial system (specification §5) ----
//
// One facts row: the Persian label (pre-escaped plain text) + the prebuilt
// value HTML (may contain <a>, <span>, <time> — the fullWhenHtml date row, the
// venue map link, the competition link, the score string). The label/value
// pairing is the spec §5 "Persian label/value rows with dividers" — the
// <th>/<td> border dividers carry the separation (the existing .facts table
// vocabulary, unchanged). Missing facts are omitted at the projection (a row
// with no data never enters the array — the no-empty-cards law at the row
// level).
export interface MatchFactRow {
  label: string;     // Persian label, pre-escaped («رقابت», «مرحله», «تاریخ», …)
  valueHtml: string; // prebuilt HTML (links, spans, <time> — the fullWhenHtml atom rides here)
}

// The summary projection. Every field is a pre-escaped/prebuilt string or a
// facts-row array computed exactly as the legacy pages.ts summaryHtml did
// (whyBigHtml's answer sentence + the facts rows + the finished result block)
// — the branch below reuses the same gates byte-for-byte, so no data state
// changes with the rework. The answer sentence text (matchAnswerSentence)
// feeds the meta description + the SportsEvent JSON-LD (GSC surfaces,
// byte-frozen in pages.ts) AND the visible briefing card — one source of
// truth. The facts rows' fullWhenHtml date row stays byte-frozen inside its
// <td> (S05 decision 95). The resultHtml is "" when not finished (the
// no-empty-cards law at the block level).
//
// S08 (M3): the projection GAINS the `narrativeHtml` atom — the deterministic
// narrative engine's pre-built ".mcentre-narrative" element (the "why this
// match matters" editorial layer, distinct from the answer sentence). The atom
// is OPTIONAL + ""-safe: when no narrative qualifies (a match with no eligible
// category — no rivalry/derby/top-table/knockout/big), the engine returns ""
// and the composer omits the element (the no-empty-cards law — the
// briefing|facts pairing still renders; the S07 contract holds byte-for-byte
// when narrativeHtml is "" — `"" + pair + result` === `pair + result`). The
// narrative is a SEPARATE editorial layer — its variant templates carry ONLY
// the rivalry/derby/top-table/knockout/featured context and never reference
// the kickoff time/venue/score (the answer sentence's domain), so the two
// layers never repeat each other (spec M3 gate: "Keep answer-first context and
// facts table distinct; avoid repetition").
export interface MatchSummaryInput {
  answerHtml: string;    // esc(matchAnswerSentence(sm)) — the briefing copy (the G-03 answer-first sentence)
  factsRows: MatchFactRow[];  // the facts rows (empty array = no facts panel; the projection always fills ≥1 row today)
  resultHtml: string;    // the finished result inner content (h2 + the answer sentence) — "" when not finished (prebuilt)
  narrativeHtml?: string;  // the S08 narrative atom (the engine's pre-built .mcentre-narrative element) — "" when no narrative qualifies (prebuilt; the composer slots it ABOVE the pairing)
}

// The facts panel caption — a static Persian label, like the hero's «میزبان»/
// «میهمان» role labels (a composer constant, not a data atom). The spec §5
// "compact facts panel" heading: the caption names the table for screen
// readers (the <caption> element is the accessible name).
const MC_SUMMARY_FACTS_CAPTION = "مشخصات بازی";

// The summary renderer. DOM = the S08 narrative element (the "why this
// matters" editorial lead, ABOVE the pairing — omitted when no narrative
// qualifies), then the .mcentre-cols pairing grid (briefing | facts) when BOTH
// atoms are present, collapsing to one column below 1080px (briefing first on
// mobile — spec §5; the S03 pairing grid rides the page-shell style block).
// The finished result block rides below the pair. The answer-first briefing
// card carries id="answer" (the G-03 semantic anchor preserved from the S02
// answercard — the answer-first surface's id).
//
// The no-empty-cards law: the summary is always present (every match has an
// answer sentence), but the narrative element, the facts panel and the result
// block are independently conditional. When only one of {briefing, facts} is
// present, the pairing grid is omitted (a single card renders alone — no
// .mcentre-cols wrapper for a single child, so the grid never strands a lone
// card in one track). When neither is present (a future projection edge case),
// the renderer returns "" and sectionHtml omits the mcentre-summary section
// entirely. The narrative element rides ABOVE whatever pair/result renders;
// when narrativeHtml is "" (or undefined), it contributes nothing — `"" + pair
// + result` === `pair + result` (the S07 contract holds byte-for-byte when no
// narrative qualifies).
export function matchSummaryHtml(s: MatchSummaryInput): string {
  // The S08 narrative atom — the pre-built .mcentre-narrative element (the
  // engine's output; "" when no narrative qualifies). Rides ABOVE the pairing
  // (the editorial lead-in, then the answer-first briefing | facts, then the
  // result). The narrative is DISTINCT from the answer sentence (no
  // repetition — the variant templates never reference the kickoff time/venue/
  // score).
  const narrative = s.narrativeHtml || "";
  // The briefing card (answer-first) — id="answer" preserved (the G-03 anchor;
  // the S02 answercard's id carries to the new editorial card).
  const brief = s.answerHtml
    ? '<div class="mcentre-card mcentre-brief" id="answer">' + s.answerHtml + "</div>"
    : "";
  // The facts panel — wraps the existing <table class="facts"> shape (the
  // caption + the <th>/<td> rows with their border dividers). The fullWhenHtml
  // date row rides byte-identical inside a <td> (S05 decision 95 — frozen).
  const factsTable = s.factsRows.length
    ? '<div class="mcentre-facts"><table class="facts"><caption>' + MC_SUMMARY_FACTS_CAPTION + "</caption><tbody>" +
      s.factsRows.map((r) => '<tr><th scope="row">' + r.label + "</th><td>" + r.valueHtml + "</td></tr>").join("") +
      "</tbody></table></div>"
    : "";
  // The pairing grid — briefing FIRST (DOM order = right under native Persian
  // RTL at the wide threshold; first on mobile when collapsed to one column).
  // When only one atom is present, the pairing grid is omitted (the single
  // card renders alone — no .mcentre-cols wrapper for a single child).
  const pair = brief && factsTable
    ? '<div class="mcentre-cols">' + brief + factsTable + "</div>"
    : brief + factsTable;
  // The finished result block rides below the pair (the answer restated — the
  // «نتیجه نهایی» heading + the answer sentence). Omitted when not finished.
  const result = s.resultHtml
    ? '<div class="mcentre-card mcentre-result">' + s.resultHtml + "</div>"
    : "";
  const inner = narrative + pair + result;
  if (!inner || !inner.trim()) return "";
  return inner;
}

// ---- Match Centre S12 (M5): the form renderer (specification §9) ----
//
// S12 LAW (specification §9 + the S04/S07/S11 precedent): the form renderer
// receives PRE-BUILT content atoms from pages.ts's matchFormInput projection
// (each side's pre-escaped team name, the pre-built W/D/L dot atoms, the
// count-summary text, the pre-built season-record chip, the latest-results
// rows — each pre-escaped/prebuilt), so this module stays the pure leaf the
// S02 cost law pinned — zero imports, zero KV, zero fetch, zero client
// scripts. It owns the form MARKUP: the .card.formstrip container (the
// v13.87/v13.88 vocabulary — shared CSS with the team-page form card,
// consistent visual language across the site) + the <h2> title («فرم اخیر»
// when any side has per-match dots; «وضعیت فصل» when every side falls back to
// the season aggregate) + the dot legend (the ب=برد م=مساوی ش=شکست decoder —
// spec §9 "Accessible labels; never rely on color alone": the Persian letters
// ride inside the dots, the legend spells them out) + the two sides STACKED
// vertically (home FIRST, away underneath — spec §9 layout: "home team first,
// away team underneath"; ONE mcentre-form section wraps both sides) + the
// participant-mark typography (.mcentre-form-participant on the team names —
// font-weight:600 + #7dd3fc via the page-shell S12 CSS, typography-only, NO
// background, decision 25 — the S11 .strow-participant precedent; the dots +
// the summary + the chip stay default) + the NEW latest-results list under
// the dots (.formresults — spec §9 "Latest five results": up to five rows per
// side, each row = the W/D/L dot + the opponent + the score + the date — the
// dots' hover-title text promoted to VISIBLE text, spec §9 "Non-interactive:
// no tooltip, click or expand": the dot atoms carry NO title) + the
// season-record chip fallback (the .fseason vocabulary — a side with fewer
// than 3 finished results falls back to the aggregate W/D/L from the
// standings snapshot; no fake per-match granularity, no results list for a
// chip side). The no-empty-cards law: a side with NEITHER dots NOR a record
// renders nothing (one-sided rendering); when BOTH sides are empty the
// renderer returns "" and sectionHtml omits the mcentre-form section
// entirely (the فرم nav item stays filtered out — the nav's adaptive Q9=B
// filter reads the same part).

// One latest-result row — the atoms the projection pre-builds from teamForm's
// { r, oppFa, score, date } return (ZERO new data work — the same last-5
// finished results the dots read; the loadArchive await already loaded them).
export interface MatchFormResultRow {
  dotHtml: string;   // <i class="fdot fW/fD/fL">ب/م/ش</i> — prebuilt; NO title attribute (spec §9: non-interactive, no tooltip — the title text is promoted to this visible row)
  oppHtml: string;   // the opponent's Persian name — pre-escaped
  scoreHtml: string; // the score «۲ – ۰» (Persian digits, the en-dash form) — prebuilt
  dateHtml: string;  // the compact D2 date «۱۵ آبان (۵ نوامبر)» — prebuilt
}

// One side of the form projection (home or away). Every string arrives
// pre-escaped/prebuilt from pages.ts's matchFormInput projection (the S04
// hero precedent) — the composer never needs esc itself.
export interface MatchFormSideInput {
  team: string;      // the side's Persian faName — pre-escaped plain text
  dotsHtml: string;  // the joined <i class="fdot"> atoms (oldest→newest, the teamForm DOM order) — "" when teamForm returned null (the min-3 gate)
  sumHtml: string;   // the W·D·L count-summary text «۳ برد · ۱ مساوی · ۱ شکست» — "" when no dots
  seasonHtml: string;// the pre-built <span class="fseason">…</span> season-record chip — "" when no record (the fallback when the dots are dark)
  results: MatchFormResultRow[]; // the latest-results rows — [] when no dots (the list is the dots' data promoted to visible text; a chip side carries none)
}

// The form projection — both participating sides.
export interface MatchFormInput {
  home: MatchFormSideInput;
  away: MatchFormSideInput;
}

// The card titles + the dot legend — static Persian constants (the v13.87/
// v13.88 vocabulary; the MC_HERO label precedent: a composer constant, not a
// data atom). The legend bytes match formLegendHtml()'s output so the
// match-page + team-page cards decode ب/م/ش identically.
const MC_FORM_TITLE = "فرم اخیر";
const MC_FORM_SEASON_TITLE = "وضعیت فصل";
const MC_FORM_LEGEND = '<p class="formlegend"><i class="fdot fw">ب</i>برد · <i class="fdot fd">م</i>مساوی · <i class="fdot fl">ش</i>شکست</p>';

// One side's block: the .formrow (the participant-marked team name + the
// dots + the count summary, OR the season-record chip) + the latest-results
// list under the dots. A side with NEITHER dots NOR a record renders ""
// (one-sided rendering — the v13.88 fail-closed; the other side still
// renders). The dots + the summary + the chip stay default — the
// participant-mark (.mcentre-form-participant) rides the TEAM NAME only.
function formSideHtml(side: MatchFormSideInput): string {
  const mid = side.dotsHtml
    ? '<span class="formdots">' + side.dotsHtml + "</span>" +
      '<span class="formsum">' + side.sumHtml + "</span>"
    : side.seasonHtml;
  if (!mid) return "";
  let out = '<div class="formrow"><span class="formteam mcentre-form-participant">' + side.team + "</span>" + mid + "</div>";
  // The latest-results list — ONLY a dots side carries one (the chip side
  // has no per-match data; no fake granularity, no empty list).
  if (side.dotsHtml && side.results.length) {
    out += '<ul class="formresults">' + side.results.map((r) =>
      "<li>" + r.dotHtml + '<span class="fropp">' + r.oppHtml + '</span><b class="frscore">' + r.scoreHtml + '</b><span class="frdate">' + r.dateHtml + "</span></li>"
    ).join("") + "</ul>";
  }
  return out;
}

// The form renderer. DOM = the .card.formstrip container (the v13.87
// vocabulary) + the <h2> title + the legend (when any side has dots) + the
// two sides stacked (home FIRST — the spec §9 layout). Fail-closed: BOTH
// sides empty → "" (the no-empty-cards law — the composer's sectionHtml
// omits the mcentre-form section; the فرم nav item stays filtered out).
export function matchFormHtml(f: MatchFormInput): string {
  const home = formSideHtml(f.home);
  const away = formSideHtml(f.away);
  if (!home && !away) return "";
  const anyDots = !!(f.home.dotsHtml || f.away.dotsHtml);
  return '<div class="card formstrip"><h2>' + (anyDots ? MC_FORM_TITLE : MC_FORM_SEASON_TITLE) + "</h2>" +
    (anyDots ? MC_FORM_LEGEND : "") + home + away + "</div>";
}

// One anchored wrapper. The no-empty-cards law lives HERE: empty or
// whitespace-only content returns "" — a section never renders hollow, so
// a missing dataset can never leave a blank box on the page.
function sectionHtml(def: MatchCentreSectionDef, inner: string): string {
  if (!inner || !inner.trim()) return "";
  return '<section id="' + def.slot + '" aria-label="' + def.label + '">' + inner + "</section>";
}

// The composer: registry order, always. Every non-empty part is wrapped in
// its semantic anchor; empty parts are skipped (never reordered, never
// padded) so the DOM order equals the specification §3 order for every
// lifecycle state (upcoming / live / finished render the same shell — the
// sections differ only by content).
export function matchCentreMain(parts: MatchCentreParts): string {
  const bySlot: Record<string, string> = {
    "mcentre-hero": parts.hero,
    "mcentre-nav": parts.nav || "",
    "mcentre-summary": parts.summary,
    "mcentre-standings": parts.standings || "",
    "mcentre-form": parts.form,
    "mcentre-venue": parts.venue || "",
    "mcentre-schedule": parts.schedule || "",
    "mcentre-faq": parts.faq || "",
    "mcentre-related": parts.related,
    "mcentre-telegram": parts.telegram || "",
    "mcentre-footer-hook": parts.footerHook
  };
  let out = "";
  for (const def of MC_SECTION_ORDER) out += sectionHtml(def, bySlot[def.slot] || "");
  return out;
}
