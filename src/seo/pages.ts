// SportSignal — server-rendered public pages (Phase 1/3): match page, time
// hubs, teams, competitions. Every page: unique title+description (P-04/P-05),
// self canonical (P-06), one h1 (P-12), answer-first block (G-03), absolute
// dates + Tehran time + Jalali (G-04), breadcrumbs (P-17), internal links
// (P-18), honest data only. Static trust pages live in pages-static.ts.

import { SEO, absUrl } from "./config";
import { matchPath, compSlug, teamSlug } from "../slugs";
import { esc, faTime, faDateD1, faDateD2, tehranDayKey, utcTime, statusLabelFa, weekendWindowTehran } from "./utils";
import { toFaDigits } from "../utils";
import { COMP_EN } from "../tables";
import type { SeoCtx, SeoMatch, TeamEntry, CompEntry } from "./data";
import { upcomingBig, upcomingFollowed, isBigForSeo, finishedRecent, teamMatches, compMatches, teamsIndex, compsIndex, findMatchBySlug, findTeamBySlug, payloadTop3, hydrateMatchVenue, similarMatches, teamStandingsWindow, teamForm, teamSeasonRecord, teamCompMetrics, windowSchedule, heroArtSrv } from "./data";
import * as M from "./markup";
import * as JL from "./jsonld";
import { buildHead, pageShell } from "./page-shell";
// S1 M2 (F3): the SEO-only spelling overrides — Leipzig «لایپزیگ»,
// Nordsjaelland «نورشلان», Roma + «آ س رم». The local faName() below is the
// ONE funnel every SEO-page surface reads (titles, H1, descriptions,
// answer sentences, scoreboard names, FAQ text), so consulting the override
// here changes the SEO surface while the bot/cards/digests (fa-dict.ts
// renderers that never import this) stay byte-identical.
import { seoTeamFaName, seoTeamAltName } from "./team-names";
// Match Centre S02 (M1): the section composer — buildMatchPage's main
// assembly delegates to it (semantic section anchors, spec §3 order). The
// GSC surfaces + every data load stay HERE (see match-centre.ts header).
// Match Centre S04 (M2): the hero renderer — the mcentre-hero MARKUP moved
// to the composer (matchHeroHtml); THIS file builds the data projection
// (matchHeroInput) and delegates. The legacy matchHeadHtml is retired.
import { matchCentreMain, matchHeroHtml, matchSummaryHtml, matchFormHtml, matchMetricsHtml, matchVenueHtml, matchScheduleHtml, type MatchHeroInput, type MatchSummaryInput, type MatchFormInput, type MatchFormSideInput, type MatchFormResultRow, type MatchMetricsInput, type MatchMetricsSideInput, type MatchVenueInput, type MatchScheduleInput, type MatchScheduleDayGroup, type MatchScheduleRowInput } from "./match-centre";
// Match Centre S08 (M3): the deterministic narrative engine — the "why this
// match matters" editorial layer. The engine runs HERE (pages.ts calls
// narrativeHtml + passes the pre-built atom to the composer's MatchSummaryInput
// projection); the composer stays the S02 pure leaf (it receives the pre-built
// string — the S04 hero precedent). The engine reads the SAME SeoMatch fields
// the legacy whyBigHtml read (m.rivalryFa / m.derby / m.big / m.roundFa /
// isTopTable / the standings top3) — zero new awaits, zero new KV reads, zero
// new fetches (the zero-runtime-cost law). whyBigHtml is RETIRED (its parts
// array + the answercard return were the embryonic registry S08 formalizes
// into src/seo/narrative.ts).
import { narrativeHtml, type NarrativeLifecycle } from "./narrative";
// Match Centre S11 (M4): the standings renderer — the unified competition table
// MARKUP (the 5 visible columns + the participant-mark typography + the ellipsis
// sentinel + the responsive mobile layout). The S10 selection (standings-window.ts)
// runs HERE (pages.ts buildMatchPage calls matchStandingsWindow + passes the
// pre-built window DATA to buildStandingsHtml); the renderer projects the 5
// visible columns from the S10 selection's full-row data + computes gd = gf-ga +
// applies the participant-mark typography + renders the ellipsis sentinel. The
// renderer is pure string composition — zero KV/await/fetch (the zero-runtime-cost
// law holds; buildMatchPage's await count stays 3 — the standings are already
// loaded by fullByCodeFor, the window is pure logic [S10], the renderer is pure
// presentation [S11]). The team-page buildStandingsWindowHtml stays byte-frozen
// (the S10/S11 split: the team-page path is untouched; the match-page renderer is
// a NEW function — the S04 hero precedent: pages.ts builds the HTML string, the
// composer wraps it in the mcentre-standings anchor).
import { matchStandingsWindow, type StandingsWindow } from "./standings-window";
import { loadArchive } from "./files";
// v13.89-stdetail: full-table sources for the competition pages — both
// cache-only/reads-only (the seo layer never triggers a provider sweep).
import { fetchStandings } from "../composers";
import { translateTeam } from "../translate";

const PER_PAGE = 50;

function faName(t: any): string {
  // S1 M2 (F3): the SEO-visible name — the override map first (searcher
  // spelling), else the dictionary faName (byte-identical to before for
  // every team not in the map).
  return seoTeamFaName(t);
}

function scoreStr(score: any): string {
  if (!score || score.home == null) return "";
  return toFaDigits(String(score.home)) + " – " + toFaDigits(String(score.away));
}

// ---- answer-first sentence for a match (G-03) ----
// SS-11 (Phase-2 spec §3): opts.noVenue drops the STADIUM clause only (the
// meta-description trim ladder's first step). The UTC clause never drops —
// timezone honesty outranks length. The visible answercard, the finished
// result block and the SportsEvent description all keep the full sentence.
// BYTE-FROZEN: this text feeds the meta description + the SportsEvent JSON-LD
// (GSC surfaces — the S1/S2 SEO measurement runs to Dec 4–8) AND the visible
// briefing card (the S07 MatchSummaryInput.answerHtml atom — one source of
// truth). The S08 narrative engine (src/seo/narrative.ts) is a SEPARATE
// editorial layer — its variant templates carry ONLY the "why this matters"
// context (rivalry significance / derby heat / title-race implications) and
// NEVER reference the kickoff time / venue / score (this sentence's domain),
// so the two layers never repeat each other (spec M3 gate: "Keep answer-first
// context and facts table distinct; avoid repetition").
export function matchAnswerSentence(sm: SeoMatch, opts?: { noVenue?: boolean }): string {
  const m = sm.s;
  const h = faName(m.homeTeam), a = faName(m.awayTeam);
  const comp = M.compNameFa(m);
  const finished = String(sm.raw.status || "").toUpperCase() === "FINISHED";
  // SS-27 / CALENDAR_DISPLAY_v2: answer sentences carry D1 — Shamsi first
  // with the Gregorian date in parentheses.
  const when = faDateD1(m.utcDate) + " ساعت " + faTime(m.utcDate);
  if (finished) {
    let s = h + " و " + a + " " + when + " به وقت تهران در " + comp + " به مصاف هم رفتند.";
    if (m.score && m.score.home != null) s += " نتیجه نهایی " + scoreStr(m.score) + " بود.";
    return s;
  }
  let s = h + " در " + comp + (m.roundFa ? " (" + m.roundFa + ")" : "") + " میزبان " + a + " است؛ این بازی " + when + " به وقت تهران برگزار می‌شود";
  // S14 R1 fix (audit §5 R1 — the double-wording bug): the curated venueFa
  // values already begin with «ورزشگاه» (e.g. «ورزشگاه آلیانز آرنا»), so the
  // prepend «؛ ورزشگاه » produced «؛ ورزشگاه ورزشگاه آلیانز آرنا» (two adjacent
  // «ورزشگاه»). The no-double fix: prepend ONLY when venueFa does NOT already
  // begin with «ورزشگاه» (the facts-table venue cell + the hero venue link
  // + the new S14 venue panel all show venueFa AS-IS, no prepend — this
  // sentence was the one surface that double-prepended). A string fix, NOT a
  // contract change (the title/meta [the venue clause is dropped via noVenue
  // below]/canonical/og:title/SportsEvent SHAPE/h1 unchanged; the JSON-LD
  // description string changes ONLY where the double-wording bug existed).
  if (m.venue && !(opts && opts.noVenue)) {
    const v = m.venueFa || m.venue;
    s += "؛ " + (String(v).startsWith("ورزشگاه") ? v : "ورزشگاه " + v);
  }
  s += ".";
  s += " زمان جهانی این بازی " + utcTime(m.utcDate) + " است.";
  return s;
}

// Match Centre S08 (M3): the legacy `whyBigHtml` function + its `isTopTable`
// helper are RETIRED. The "why this is a big match" editorial layer
// (specification §5, M3/S08) is now the deterministic narrative engine in
// src/seo/narrative.ts — a central category registry (rivalry / knockout-stage
// / top-table / derby / big-club) + a global priority ranking + explicit
// triggers/samples/exclusions + factual source fields + one primary narrative
// + an optional distinct secondary + stable deterministic variant selection.
// The engine's `topTableEligible` (both teams in the top-3 standings) replaces
// the local `isTopTable`; the engine's `narrativeHtml(sm, ctx, lifecycle)`
// replaces the `whyBigHtml` return. The engine reads the SAME SeoMatch fields
// whyBigHtml read (m.rivalryFa / m.derby / m.big / m.roundFa / the standings
// top3) — zero new awaits, zero new KV reads, zero new fetches. The narrative
// atom is built in buildMatchPage below (narrativeHtml) and passed to the
// composer's MatchSummaryInput.narrativeHtml projection (the S04 hero
// precedent — the composer stays the S02 pure leaf). The `<div class=
// "answercard" id="answer">` return whyBigHtml carried was dead code since S07
// (superseded by the composer's briefing card); the parts array computation
// is the embryonic registry S08 formalizes — both now live in the engine.

function statusFaOf(sm: SeoMatch): string {
  return statusLabelFa(sm.raw.status || sm.s.status);
}

// ---- v13.81-matchpage: the hero's content atoms + the actions row ----
// The match page is where every homepage/list row now lands (v13.80 made
// those links canonical), so the destination gets a proper "big match"
// treatment: crests facing each other, kickoff + live countdown, and the
// growth loop (calendar / WhatsApp / Telegram / copy — all carrying the
// canonical URL). Server-rendered HTML + ONE tiny inline script; no new
// asset, no client fetch.
// Match Centre S04 (M2): the hero markup itself moved to the composer
// (matchHeroHtml in src/seo/match-centre.ts); the atoms below feed its
// matchHeroInput projection (crestHtml, venueMapLink) and the facts table
// (venueMapLink) — shared vocabulary, one source of truth.

function crestHtml(t: any): string {
  if (t && t.crest) {
    return '<img class="mcrest" src="' + esc(t.crest) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="64" height="64" onerror="this.remove()">';
  }
  const mono = String((t && (t.faName || t.name)) || "?").trim().charAt(0) || "?";
  return '<span class="mcrest mcrest-mono" aria-hidden="true">' + esc(mono) + "</span>";
}

// Match Centre S05 (M2): the hero portrait atom — the both-or-neither
// cinematic face-off (specification §5 Player portraits, decisions 7/8/85).
// The shared heroArtSrv data helper (seo/data.ts — the SAME coverage
// decision the homepage .mc-port SSR mirror reads) resolves each side's
// library portrait from HERO_COVERAGE_RAW; the projection passes EITHER two
// atoms or none (the composer re-enforces the law). The <img> rides the
// .mc-port SSR vocabulary (lazy + async + no-referrer — the v13.205 mirror);
// the onerror is a PURE DOM walk that removes BOTH portraits when either
// image fails (decision 85: hide both, fall back to the S04 no-portrait
// scoreboard — no retry, no fetch, no timer). Decorative alt="" — the team
// names sit directly below (the crest alt="" precedent).
function portraitHtml(src: string): string {
  return '<img class="mport" src="' + esc(src) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="88" height="88" ' +
    "onerror=\"var h=this.closest('.mcentre-hero');if(h)h.querySelectorAll('.mport').forEach(function(x){x.remove()})\">";
}

function gcalBasic(iso: string, plusHours: number): string {
  const d = new Date(Date.parse(iso) + plusHours * 3600 * 1000);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// v13.82-matchday: the venue becomes a place — link it to a Google Maps
// search (api=1 universal URL, no key). The QUERY uses the English venue
// name (m.venue — Maps' index is Latin-script) while the LINK TEXT stays
// Persian (venueFa). Sits in both the scoreboard head (.mvenue) and the
// facts table row.
function venueMapLink(m: any, labelPrefix: string): string {
  const shown = m.venueFa || m.venue;
  const q = encodeURIComponent(m.venue + " stadium");
  return '<a class="mvenue mvenue-map" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + q + '">' + labelPrefix + esc(shown) + ' <span class="mven-arrow" aria-hidden="true">↗</span><span class="sr-only"> — نمایش روی نقشه</span></a>';
}

// ---- v13.81-matchpage → Match Centre S04/S05 (M2): the hero's data projection ----
// (the v13.81 "big match" treatment note lives above, on the atoms block)
// S04: the hero MARKUP is owned by src/seo/match-centre.ts (matchHeroHtml —
// the mcentre-hero composer render; audit §12). THIS projection computes
// every content atom from the same SeoMatch fields the legacy matchHeadHtml
// read — comp chip content, side crests/names, lifecycle flags, score,
// status+minute, kickoff time/date, the hidden countdown mount, the venue
// link — each PRE-ESCAPED (the composer is a pure leaf with no imports, so
// it never needs esc itself; zero new data work by construction). The
// lifecycle gates below are byte-for-byte the legacy ones.
// S05: the projection additionally resolves the both-or-neither portraits
// via heroArtSrv (the shared data-layer lookup — pure map read, zero KV /
// fetch; the same call the homepage .mc-port mirror makes) and upgrades the
// kickoff atoms to the Q1=A Tehran + UTC presentation (decisions 93/94/95:
// the tznote/utcnote spans mirror fullWhenHtml's vocabulary; the date line
// becomes the D1 full localized date). The h1/answer/facts-table surfaces
// keep their own D2/fullWhenHtml shapes — untouched GSC surfaces.
function matchHeroInput(sm: SeoMatch): MatchHeroInput {
  const m = sm.s;
  const emblem = m.competition && m.competition.emblem;
  const live = /IN_PLAY|LIVE|PAUSED/i.test(String(sm.raw.status || ""));
  const finished = String(sm.raw.status || "").toUpperCase() === "FINISHED";
  const scored = (live || finished) && m.score && m.score.home != null;
  const roundTxt = m.roundFa || "";
  // S05 both-or-neither (decisions 7/8): BOTH clubs must carry library
  // portrait coverage — one covered side alone renders NO portrait at all
  // (the composer enforces the same law again on the atoms).
  const hArt = heroArtSrv(m.homeTeam);
  const aArt = heroArtSrv(m.awayTeam);
  const ports = hArt && aArt ? { h: portraitHtml(hArt), a: portraitHtml(aArt) } : null;
  // the chip's inner content — emblem omitted when unavailable, never an
  // empty image frame (decision 98); the <a> keeps the competition hub link.
  const compHtml = (emblem ? '<img class="mcomplogo" src="' + esc(emblem) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">' : "") +
    '<a href="/competitions/' + compSlug(m.competition.code) + '">' + esc(M.compNameFa(m)) + "</a>" +
    (roundTxt ? " · " + esc(roundTxt) : "");
  return {
    compHtml,
    home: { crestHtml: crestHtml(m.homeTeam), nameHtml: M.nameHtml(faName(m.homeTeam)), portraitHtml: ports ? ports.h : "" },
    away: { crestHtml: crestHtml(m.awayTeam), nameHtml: M.nameHtml(faName(m.awayTeam)), portraitHtml: ports ? ports.a : "" },
    live,
    finished,
    scored,
    scoreTxt: scored ? scoreStr(m.score) : "",
    liveTxt: esc(statusFaOf(sm)) + (m.minute != null ? " (" + toFaDigits(String(m.minute)) + "ʹ)" : ""),
    // S05 (Q1=A, decisions 93/94): the Tehran wall-clock time keeps its
    // prominent <time> (24h, Persian digits) and gains the display-TZ label
    // + the Latin UTC island — fullWhenHtml's exact tznote/utcnote vocabulary
    // (the facts-table «تاریخ» row), hero-scoped; <time datetime> stays the
    // Gregorian ISO (SS-27). No new JS — option B stays available to the owner.
    kickTimeHtml: '<time datetime="' + esc(m.utcDate) + '">' + toFaDigits(faTime(m.utcDate)) + '</time> <span class="tznote">' + esc(SEO.DISPLAY_TZ_LABEL) + '</span> <span class="utcnote" dir="ltr">' + esc(m.utcDate.slice(11, 16) + " UTC") + "</span>",
    // S05 (decision 95): the D1 full localized date — «شنبه ۱۵ آبان ۱۴۰۵
    // (۵ نوامبر ۲۰۲۶)» — the same Jalali+Gregorian calendar shape the facts
    // table carries (one date vocabulary across the page; the compact D2
    // stays on the h1/list rows — their GSC surfaces are frozen).
    kickDateHtml: esc(faDateD1(m.utcDate)),
    // countdown mount only for upcoming matches (JS fills .mcount; hidden
    // until then) — preserved exactly (decision 92: no new countdown dep).
    countHtml: !live && !finished ? '<div class="mcount" data-kickoff="' + esc(m.utcDate) + '" hidden></div>' : "",
    venueHtml: m.venue ? venueMapLink(m, "🏟\uFE0F ") : ""
  };
}

// Match Centre S06 (M2): the sticky section navigation + the floating
// back-to-top (specification §3 page order, decisions 11/13: the five
// destinations خلاصه/جدول/فرم/بازی‌ها/ورزشگاه; audit §12/§16 row S06).
// Q9=B adaptive: the nav renders ONLY the destinations whose target
// mcentre-* section is present in the current parts (a nav item to a
// not-yet-built section is a broken anchor — the no-false-claim guardrail);
// the nav grows as S10/S14/S15 ship their sections. Q10=C responsive: the
// CSS in page-shell.ts sticks the nav to the top on desktop (≥600px) and a
// fixed bottom tab-bar on mobile (<600px). Q11=A IntersectionObserver drives
// the active-item highlight (the inline script below — no main-thread scroll
// thrash). Q12: the back-to-top button shows when the hero leaves the
// viewport (the same observer) and hides when it returns; fixed bottom-end
// (logical properties), raised above the mobile nav, reduced-motion = instant.
// Q13=A: the script is INLINE here — it rides the mcentre-nav part like the
// S04 countdown script rides the hero part (no public-*.js bundle rename, no
// SW cache bump — ADR-006 respected). Pure DOM: observer + click handlers +
// class/hidden toggles; no imports, no fetch, no timer, no polling. The
// composer stays the S02 pure leaf — this part arrives fully built, the
// composer only wraps it in the mcentre-nav anchor (the slot + MatchCentreParts
// .nav? exist since S02 — no contract change).
const MC_NAV_DESTS: { id: string; label: string }[] = [
  { id: "mcentre-summary", label: "خلاصه" },
  { id: "mcentre-standings", label: "جدول" },
  { id: "mcentre-form", label: "فرم" },
  { id: "mcentre-schedule", label: "بازی‌ها" },
  { id: "mcentre-venue", label: "ورزشگاه" }
];
function matchNavHtml(parts: { summary: string; standings?: string; form: string; venue?: string; schedule?: string }): string {
  const present = MC_NAV_DESTS.filter(d => {
    const html = d.id === "mcentre-summary" ? parts.summary :
                 d.id === "mcentre-standings" ? (parts.standings || "") :
                 d.id === "mcentre-form" ? parts.form :
                 d.id === "mcentre-schedule" ? (parts.schedule || "") :
                 (parts.venue || "");
    return html && html.trim().length > 0;
  });
  const items = present.map(d =>
    '<a class="mnav-item" href="#' + d.id + '" data-target="' + d.id + '">' + esc(d.label) + '</a>'
  ).join("");
  // The back-to-top button + the observer script always ride the nav part
  // (the hero is always present on a match page, so the button has a target
  // to observe). The <nav> renders ONLY when at least one destination is
  // present — a bare <nav> never renders (the no-empty-cards law).
  const navEl = items
    ? '<nav class="mnav" aria-label="ناوبری بخش‌های صفحه">' + items + '</nav>'
    : "";
  return navEl +
    '<button class="mtop" type="button" aria-label="بازگشت به بالا" hidden><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M12 4l-8 8 1.41 1.41L11 7.83V20h2V7.83l5.58 5.58L20 12z" fill="currentColor"/></svg></button>' +
    matchNavScript();
}

// The nav + back-to-top script — inline, CSP-legal (the page shell already
// carries inline scripts: the S04 countdown/copy script). DOMContentLoaded
// guard: the target sections (summary/form/…) render AFTER the mcentre-nav
// section in registry order, so the observer setup waits for the full DOM.
// IntersectionObserver (Q11=A) drives both the active-item highlight (a
// -20%/-60% rootMargin active-reading zone) and the back-to-top show/hide
// (hero out of view). Nav-item click → scrollIntoView (the CSS scroll-margin-
// top on desktop offsets the sticky bar); back-to-top click → scrollTo(0).
// Reduced motion = instant (no smooth behavior, no transitions). Pure DOM:
// no fetch, no timer, no polling, no imports.
function matchNavScript(): string {
  return "<script>\n" +
    "(function(){function init(){var hero=document.querySelector('.mcentre-hero');var topBtn=document.querySelector('.mtop');var nav=document.querySelector('.mnav');var reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;if(nav){var items=nav.querySelectorAll('.mnav-item');if(items.length&&'IntersectionObserver'in window){var obs=new IntersectionObserver(function(es){es.forEach(function(e){var it=nav.querySelector('.mnav-item[data-target=\"'+e.target.id+'\"]');if(!it)return;if(e.isIntersecting){items.forEach(function(i){i.classList.remove('is-active')});it.classList.add('is-active')}})},{rootMargin:'-20% 0px -60% 0px',threshold:0});items.forEach(function(i){var t=document.getElementById(i.getAttribute('data-target'));if(t)obs.observe(t)});items.forEach(function(i){i.addEventListener('click',function(ev){ev.preventDefault();var t=document.getElementById(i.getAttribute('data-target'));if(!t)return;t.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'})})})}}if(hero&&topBtn&&'IntersectionObserver'in window){var hobs=new IntersectionObserver(function(es){es.forEach(function(e){topBtn.hidden=e.isIntersecting})},{threshold:0});hobs.observe(hero);topBtn.addEventListener('click',function(){window.scrollTo({top:0,behavior:reduce?'auto':'smooth'})})}}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init()})();\n" +
    "<\/script>";
}

function matchActionsHtml(sm: SeoMatch, path: string): string {
  const m = sm.s;
  const finished = String(sm.raw.status || "").toUpperCase() === "FINISHED";
  const url = absUrl(path);
  const shareTxt = faName(m.homeTeam) + " – " + faName(m.awayTeam) + " | " + M.compNameFa(m);
  const waHref = "https://wa.me/?text=" + encodeURIComponent(shareTxt + "\n\n" + url);
  const tgHref = "https://t.me/share/url?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(shareTxt);
  let out = '<div class="mactions">';
  if (!finished) {
    const gcalHref = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" + encodeURIComponent(shareTxt) +
      "&dates=" + gcalBasic(m.utcDate, 0) + "/" + gcalBasic(m.utcDate, 2) +
      "&details=" + encodeURIComponent(shareTxt + "\n" + url);
    out += '<a class="mact mact-cal" href="' + esc(gcalHref) + '" target="_blank" rel="noopener">📅 افزودن به تقویم گوگل</a>';
  }
  out += '<a class="mact" href="' + esc(waHref) + '" target="_blank" rel="noopener">💬 واتساپ</a>';
  out += '<a class="mact" href="' + esc(tgHref) + '" target="_blank" rel="noopener">✈️ تلگرام</a>';
  out += '<button class="mact" type="button" id="copyMatchLink" data-url="' + esc(url) + '">🔗 کپی لینک</button>';
  out += "</div>";
  return out;
}

// The countdown + copy-link script (inline, ~15 lines, CSP-legal: the page
// shell already carries inline scripts). Ticks every 30s; Persian digits;
// stops at kickoff and swaps to a "started" state. Copy uses the clipboard
// API with a execCommand fallback (same pattern as public-13.x.js).
function matchHeadScript(): string {
  return "<script>\n" +
    "(function(){var el=document.querySelector('.mcount');if(el){var ko=Date.parse(el.getAttribute('data-kickoff'));if(ko){var FA=function(n){return String(n).replace(/\\d/g,function(d){return '\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9'[d]})};var tick=function(){var now=Date.now();if(now>=ko){el.hidden=false;el.textContent='\u26BD \u0628\u0627\u0632\u06CC \u0634\u0631\u0648\u0639 \u0634\u062F\u0647 \u0627\u0633\u062A';return}var s=Math.floor((ko-now)/1000),d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),mm=Math.floor((s%3600)/60);el.hidden=false;el.textContent='\u23F3 '+(d>0?FA(d)+' \u0631\u0648\u0632 \u0648 ':'')+FA(h)+' \u0633\u0627\u0639\u062A \u0648 '+FA(mm)+' \u062F\u0642\u06CC\u0642\u0647 \u062A\u0627 \u0634\u0631\u0648\u0639';setTimeout(tick,30000)};tick()}}\n" +
    "var cb=document.getElementById('copyMatchLink');if(cb){cb.addEventListener('click',function(){var u=cb.getAttribute('data-url');var done=function(){var t=cb.textContent;cb.textContent='\u2713 \u06A9\u067E\u06CC \u0634\u062F';setTimeout(function(){cb.textContent=t},1600)};if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(u).then(done,done)}else{var i=document.createElement('input');i.value=u;document.body.appendChild(i);i.select();try{document.execCommand('copy')}catch(e){}i.remove();done()}})}\n" +
    "})();" +
    "<\/script>";
}


// ================= MATCH PAGE =================
// v13.82-matchday: now async — the render hydrates the venue (FD detail,
// KV-cached 24h, fail-closed, 5s race guard — see hydrateMatchVenue) before
// any of the venue consumers run: the answer sentence (G-03), the facts
// table, the .mvenue scoreboard element and the meta description all read
// sm.s.venue, so ONE hydration feeds every surface. The only await on the
// slow path is a first-visit-per-match KV miss; the page HTML is cache-API
// cached (wantCached) so repeat views never re-fetch.
// v13.87-formtable: «فرم اخیر» — both sides' last-5 results as colored
// W/D/L dots (ب/م/ش) with hover titles carrying the opponent + score +
// date, plus a W·D·L count summary per side. Returns "" when NEITHER side
// has enough finished history (the card drops silently — fail-closed).
// v13.88-formagg: a side with no per-match history falls back to its
// SEASON record chip («فصل: ۶ برد · ۲ مساوی · ۱ شکست» from the standings
// snapshots — zero subrequests) so the card lights up while the archive
// is young; the card title honestly switches to «وضعیت فصل» when no side
// has dots. Still fail-closed: no dots AND no record → no card.
const W_FA: Record<string, string> = { W: "ب", D: "م", L: "ش" }; // برد/مساوی/شکست
const W_LABEL: Record<string, string> = { W: "برد", D: "مساوی", L: "شکست" };

// One side's row: dots when available, else the season chip. Shared by the
// match page's strip and the team page's card (v13.88 — one renderer, one
// vocabulary).
function formRowHtml(fa: string, dots: { r: string; oppFa: string; score: string; date: string }[] | null, rec: { won: number | null; draw: number | null; lost: number | null; played: number | null; pos?: number | null; compFa?: string | null } | null): string {
  let mid = "";
  if (dots && dots.length) {
    const cnt = { W: 0, D: 0, L: 0 };
    let ds = '<span class="formdots">';
    for (const d of dots) {
      cnt[d.r]++;
      ds += '<i class="fdot f' + d.r.toLowerCase() + '" title="' + esc(W_LABEL[d.r] + " " + toFaDigits(d.score.replace("-", " – ")) + " در برابر " + d.oppFa + " (" + d.date + ")") + '">' + W_FA[d.r] + "</i>";
    }
    ds += "</span>";
    mid = ds +
      '<span class="formsum">' + toFaDigits(String(cnt.W)) + " برد · " + toFaDigits(String(cnt.D)) + " مساوی · " + toFaDigits(String(cnt.L)) + " شکست</span>";
  } else if (rec && rec.won != null && rec.draw != null && rec.lost != null) {
    // season aggregate — visually distinct from dots (no fake per-match
    // granularity): three tabular count segments in the win/draw/loss hues.
    // v13.93-fullrec: the position badge rides first («ردیف ۲») — the
    // standings-rank context makes the W/D/L counts meaningful at a glance.
    mid = '<span class="fseason">' + (rec.pos != null ? '<b class="fspos">ردیف ' + toFaDigits(String(rec.pos)) + "</b>" : "") +
      '<b class="fsw">' + toFaDigits(String(rec.won)) + "</b>" + W_FA.W +
      ' <b class="fsd">' + toFaDigits(String(rec.draw)) + "</b>" + W_FA.D +
      ' <b class="fsl">' + toFaDigits(String(rec.lost)) + "</b>" + W_FA.L +
      (rec.played != null ? '<i class="fsplayed">از ' + toFaDigits(String(rec.played)) + " بازی" + (rec.compFa ? " " + esc(String(rec.compFa)) : "") + "</i>" : rec.compFa ? '<i class="fsplayed">' + esc(String(rec.compFa)) + "</i>" : "") + "</span>";
  } else return "";
  return '<div class="formrow"><span class="formteam">' + esc(fa) + "</span>" + mid + "</div>";
}

// The legend decodes the dots (ب=برد م=مساوی ش=شکست) for first-time
// visitors — muted microcopy under the card title (v13.88).
function formLegendHtml(): string {
  return '<p class="formlegend"><i class="fdot fw">' + W_FA.W + "</i>" + W_LABEL.W + " · <i class=\"fdot fd\">" + W_FA.D + "</i>" + W_LABEL.D + " · <i class=\"fdot fl\">" + W_FA.L + "</i>" + W_LABEL.L + "</p>";
}

function formStripHtml(ctx: SeoCtx, sm: SeoMatch, archive: any[], fullByCode?: Record<string, any>): string {
  const sides = [
    { name: sm.raw.homeTeam && sm.raw.homeTeam.name, fa: faName(sm.s.homeTeam) },
    { name: sm.raw.awayTeam && sm.raw.awayTeam.name, fa: faName(sm.s.awayTeam) }
  ];
  const forms = sides.map((x) => ({ ...x, dots: teamForm(ctx, x.name || "", archive), rec: teamSeasonRecord(ctx, x.name || "", fullByCode) }));
  if (!forms.some((f) => f.dots || (f.rec && f.rec.won != null && f.rec.draw != null && f.rec.lost != null))) return "";
  const anyDots = forms.some((f) => f.dots);
  let out = '<div class="card formstrip"><h2>' + (anyDots ? "فرم اخیر" : "وضعیت فصل") + "</h2>" + (anyDots ? formLegendHtml() : "");
  for (const f of forms) {
    out += formRowHtml(f.fa, f.dots, f.rec); // one-sided: render the side that has data
  }
  return out + "</div>";
}

// Match Centre S12 (M5): the form projection — matchFormInput. Builds the
// MatchFormInput (the composer's matchFormHtml contract — src/seo/
// match-centre.ts) from the ALREADY-LOADED data: teamForm (fed by the
// loadArchive await — one of the 3 pre-existing bounded reads) +
// teamSeasonRecord (fed by the fullByCodeFor await). ZERO new awaits, ZERO
// new KV reads, ZERO new fetches (the zero-runtime-cost law — the S08
// narrative + the S10/S11 standings precedent). The composer owns the form
// MARKUP; THIS projection owns the data atoms (the S04 hero precedent —
// every string arrives pre-escaped/prebuilt, the composer is a pure leaf).
// The existing formStripHtml/formRowHtml/formLegendHtml above STAY as the
// team-page renderer's vocabulary (teamFormCardHtml — byte-frozen; the
// match page no longer calls formStripHtml).
//
// S12 decision points (resolved + recorded per the session brief):
// 1. The renderer home — MIGRATED to the composer (matchFormHtml in
//    match-centre.ts — the S04 hero + the S07 summary + the S11 standings
//    precedent: the composer owns the .mcentre-form MARKUP, pages.ts owns
//    the data projection).
// 2. The projection — PRE-BUILT atoms (the S04 hero precedent): the
//    pre-escaped team name, the pre-built W/D/L dot atoms, the count-summary
//    text, the pre-built season-record chip, the latest-results rows.
// 3. The latest-results element — a compact list UNDER the dots (the
//    composer's .formresults): each row = the W/D/L dot + the opponent
//    faName + the score + the date (the dots' hover-title text promoted to
//    VISIBLE text — spec §9 "Non-interactive: no tooltip, click or expand").
//    The data source: the SAME teamForm return (the { r, oppFa, score,
//    date }[] already carries all 4 fields) — ZERO new data work. NO match
//    links: teamForm does not surface the fixture slug, and extending its
//    return would be new data work — the list stays static (the S11
//    "no team-page navigation" discipline); spec §9's link clause is noted
//    for a future session that extends the data shape.
// 4. The participant-mark — .mcentre-form-participant (a NEW class — the
//    form is a different vocabulary from S11's .strow-participant):
//    font-weight:600 + #7dd3fc on the TEAM NAME only, NO background
//    (decision 25 — the S11 precedent). The dots + the summary + the chip
//    stay default.
// 5. The dots carry NO title attribute (spec §9: "Non-interactive: no
//    tooltip, click or expand" — the title text is promoted to the visible
//    latest-results list instead; the Persian letters ب/م/ش inside the dots
//    remain the accessible non-color cue, decoded by the legend).
// 6. The date format — faDateD2 (the site's compact card/row date
//    «۱۵ آبان (۵ نوامبر)» — the CALENDAR_DISPLAY_v2 discipline; the D2
//    helper's own comment names cards/rows as its surface).
// 7. The season-chip gating — the record lookup runs ONLY when a side has
//    no dots (the teamFormCardHtml precedent — the chip is the fallback,
//    never a companion).
// 8. The two-side layout — STACKED vertically (home FIRST, away underneath
//    — spec §9 layout), ONE .mcentre-form section wrapping both sides; the
//    .mcentre-cols side-by-side pairing is the S07 summary's shape, not the
//    form's.
function matchFormSideInput(ctx: SeoCtx, name: string | undefined, fa: string, archive: any[], fullByCode?: Record<string, any>): MatchFormSideInput {
  const dots = teamForm(ctx, name || "", archive) || [];
  const rec = dots.length ? null : teamSeasonRecord(ctx, name || "", fullByCode);
  let dotsHtml = "";
  let sumHtml = "";
  let seasonHtml = "";
  const results: MatchFormResultRow[] = [];
  if (dots.length) {
    const cnt = { W: 0, D: 0, L: 0 };
    for (const d of dots) {
      cnt[d.r]++;
      // The dot atom — NO title (spec §9 non-interactive; the title text is
      // promoted to the visible results row below). Same shape formRowHtml
      // renders, minus the title.
      const dot = '<i class="fdot f' + d.r.toLowerCase() + '">' + W_FA[d.r] + "</i>";
      dotsHtml += dot;
      results.push({
        dotHtml: dot,
        oppHtml: esc(d.oppFa),
        scoreHtml: toFaDigits(d.score.replace("-", " – ")),
        dateHtml: faDateD2(d.date)
      });
    }
    sumHtml = toFaDigits(String(cnt.W)) + " برد · " + toFaDigits(String(cnt.D)) + " مساوی · " + toFaDigits(String(cnt.L)) + " شکست";
  } else if (rec && rec.won != null && rec.draw != null && rec.lost != null) {
    // The season aggregate — the pre-built .fseason chip (byte-identical
    // shape to formRowHtml's chip: the position badge + the three W/D/L
    // count segments + the played suffix — the v13.93-fullrec vocabulary).
    seasonHtml = '<span class="fseason">' + (rec.pos != null ? '<b class="fspos">ردیف ' + toFaDigits(String(rec.pos)) + "</b>" : "") +
      '<b class="fsw">' + toFaDigits(String(rec.won)) + "</b>" + W_FA.W +
      ' <b class="fsd">' + toFaDigits(String(rec.draw)) + "</b>" + W_FA.D +
      ' <b class="fsl">' + toFaDigits(String(rec.lost)) + "</b>" + W_FA.L +
      (rec.played != null ? '<i class="fsplayed">از ' + toFaDigits(String(rec.played)) + " بازی" + (rec.compFa ? " " + esc(String(rec.compFa)) : "") + "</i>" : rec.compFa ? '<i class="fsplayed">' + esc(String(rec.compFa)) + "</i>" : "") + "</span>";
  }
  return { team: esc(fa), dotsHtml, sumHtml, seasonHtml, results };
}

// The form projection — both participating sides (home FIRST, away second —
// the spec §9 layout). Reads the same team names formStripHtml read
// (sm.raw.*.name for the data lookups + faName(sm.s.*) for the visible
// atoms); the composer (matchFormHtml) enforces the fail-closed (both sides
// empty → "" → the mcentre-form section is omitted, the فرم nav item stays
// filtered out).
function matchFormInput(sm: SeoMatch, ctx: SeoCtx, archive: any[], fullByCode?: Record<string, any>): MatchFormInput {
  return {
    home: matchFormSideInput(ctx, sm.raw.homeTeam && sm.raw.homeTeam.name, faName(sm.s.homeTeam), archive, fullByCode),
    away: matchFormSideInput(ctx, sm.raw.awayTeam && sm.raw.awayTeam.name, faName(sm.s.awayTeam), archive, fullByCode)
  };
}

// Match Centre S13 (M5): the metrics projection — matchMetricsInput. Builds
// the MatchMetricsInput (the composer's matchMetricsHtml contract — src/seo/
// match-centre.ts) from the ALREADY-LOADED data: teamCompMetrics (src/seo/
// data.ts — the NEW S13 aggregation helper) reads the fixture's OWN
// competition standings rows (GF/GA/played/compFa) from the three
// already-loaded projections in preference order — fullByCode[compCode] (the
// fullByCodeFor await, loaded for exactly sm.s.competition.code; the row must
// carry the gf/ga aggregates — the v13.89-stdetail loader drops them today,
// so the lookup usually falls through), then ctx.payload.standings[compCode]
// (the top-8 compact, gf/ga included), then ctx.payload.ucl (the full CL
// league-phase table, CL fixtures only — the teamSeasonRecord third source)
// + the SAME pool-FINISHED/archive-row merge teamForm reads (fed by the
// loadArchive await — one of the 3 pre-existing bounded reads; the CALLER
// passes the archive rows in). ZERO new awaits, ZERO new KV reads, ZERO new
// fetches (the zero-runtime-cost law — the S08 narrative + the S10/S11
// standings + the S12 form precedent).
//
// S13 decision points (resolved + recorded per the session brief):
// 1. The render home — INSIDE the #mcentre-form section, AFTER the two form
//    sides (decision S13-1): the metrics are a SIBLING .card under the form
//    card; NO new section anchor, NO new nav destination. The combined form
//    part (formPartHtml = formHtml + metricsHtml) feeds BOTH matchNavHtml
//    (the فرم nav item lights when EITHER the form card or the metrics card
//    renders — the adaptive Q9=B filter) AND matchCentreMain (the
//    mcentre-form anchor).
// 2. The sample-label policy (decisions 33/34) — ONE shared label per team
//    column: «در N بازی [compFa]» where N = the standings row's OWN played
//    count (unequal samples label honestly — played 11 vs 10 renders «در ۱۱
//    بازی» vs «در ۱۰ بازی», each side its own count). The clean-sheet metric
//    carries its own window note («در N بازی») ONLY when its sample
//    MATERIALLY differs from played: |csSample − played| ≥ 2 (a one-match lag
//    between the standings snapshot and the newest finished round is timing
//    noise, not a different window; two or more missing games IS a genuinely
//    smaller window — the pool+archive merge covers the tracked big-match
//    universe only, the partial-coverage disclosure).
// 3. The minimum-sample gate — the data layer's csSample < 3 → cs = null →
//    the side's clean-sheet cell renders the muted «—» (missing ≠ zero; a
//    1-2 game clean-sheet sample is noise); BOTH sides below the gate → the
//    clean-sheet row omits entirely.
// 4. The missing-vs-zero law (spec §16) — a real zero (0 conceded in a
//    sufficient sample, or gf=0/ga=0 with played > 0 in the authoritative
//    standings table) renders «۰»; missing data NEVER renders a zero (null
//    side → the column drops; null cs → the «—» marker).
// 5. The numerals — toFaDigits everywhere (the S11 .stpos/.stgd precedent);
//    numbers only, NO bars/charts/gradients (decision 35).
// 6. The vocabulary — گل زده / گل خورده / کلین شیت (the common Persian
//    football-media loanword — compact for the label column) + the
//    «مقایسه آمار فصل» card title + the «آمار» corner header (composer
//    constants, the S13 CSS block styles them).
// 7. The participant-mark — REUSE the S12 .formteam.mcentre-form-participant
//    classes on the column team names (the page-shell S12 rule — scoped to
//    #mcentre-form, which contains the metrics card — applies
//    font-weight:600 + #7dd3fc; NO new participant rule, NO background).
function matchMetricsSideInput(ctx: SeoCtx, name: string | undefined, fa: string, archive: any[], fullByCode: Record<string, any> | undefined, compCode: string | null): MatchMetricsSideInput | null {
  const met = teamCompMetrics(ctx, name || "", archive, fullByCode, compCode);
  // missing table / team not in the table / pre-season / no games played →
  // the side omits entirely (a one-sided omission drops that side's column
  // honestly — the other side still renders)
  if (!met) return null;
  return {
    team: esc(fa),
    sampleHtml: "در " + toFaDigits(String(met.played)) + " بازی " + esc(met.compFa),
    gf: toFaDigits(String(met.gf)),
    ga: toFaDigits(String(met.ga)),
    // cs == null = below the min-sample gate → "" (the renderer's «—» cell;
    // 0 conceded in a sufficient sample IS a real zero and renders «۰»)
    cs: met.cs == null ? "" : toFaDigits(String(met.cs)),
    // the window note rides ONLY when the clean-sheet sample materially
    // differs from the shared label's played count (|csSample − played| ≥ 2)
    csNoteHtml: met.csSample != null && Math.abs(met.csSample - met.played) >= 2
      ? "در " + toFaDigits(String(met.csSample)) + " بازی"
      : ""
  };
}

// The metrics projection — both participating sides (home FIRST = right under
// native RTL; the fixture's competition scopes BOTH lookups). Reads the same
// team names matchFormInput read (sm.raw.*.name for the data lookups +
// faName(sm.s.*) for the visible atoms); the composer (matchMetricsHtml)
// enforces the fail-closed (both sides null → "" → the metrics block omits,
// the mcentre-form section survives on the S12 dots/chip alone).
function matchMetricsInput(sm: SeoMatch, ctx: SeoCtx, archive: any[], fullByCode?: Record<string, any>): MatchMetricsInput {
  const compCode = (sm.s.competition && sm.s.competition.code) || null;
  return {
    home: matchMetricsSideInput(ctx, sm.raw.homeTeam && sm.raw.homeTeam.name, faName(sm.s.homeTeam), archive, fullByCode, compCode),
    away: matchMetricsSideInput(ctx, sm.raw.awayTeam && sm.raw.awayTeam.name, faName(sm.s.awayTeam), archive, fullByCode, compCode)
  };
}

// Match Centre S14 (M6): the venue panel + the seven-day schedule DATA
// projection — matchVenueInput + matchScheduleInput. Builds the
// MatchVenueInput + MatchScheduleInput atoms (the composer's matchVenueHtml
// + matchScheduleHtml contract — src/seo/match-centre.ts) from the
// ALREADY-LOADED data. ZERO new awaits, ZERO new KV reads, ZERO new fetches
// (the zero-runtime-cost law — the S08 narrative + the S10/S11 standings +
// the S12/S13 form/metrics precedent).
//
// S14 decision points (resolved + recorded per the session brief):
// 1. The venue provenance (audit §4 row 72, grade A — ALREADY LOADED): the
//    fixture's OWN venue field — the ALREADY-LOADED sm.s.venue / m.venue
//    (the hydrateMatchVenue await [one of the 3 pre-existing awaits]
//    populates it: TEAM_STADIUMS curated homeGround() gate first [neutral
//    finals excluded], else the provider venue, else the FD-detail
//    hydration [KV 24h, ≤1 fetch/match/day, fail-closed]). Q2 = A: stadium
//    name ONLY (city/country omitted — zero invention; a curated
//    city/country table can be authorized later). Missing venue →
//    nameHtml "" → the panel omits (the no-empty-cards law; a missing venue
//    is NOT «ورزشگاه نامشخص»). The stadium name shows venueFa AS-IS (NO
//    «ورزشگاه » prepend — the R1 no-double pattern; the venueFa already
//    begins with «ورزشگاه» for the curated names).
// 2. The venue panel vs the S07 facts-table venue cell (decision
//    S14-Venue-Redundancy, option [a]) — the mcentre-venue panel carries
//    the RICHER presentation (the stadium name + the verified-source mark
//    «تأییدشده»), distinct from the S07 facts-table venue cell (byte-frozen
//    — the name only). The name appears in both (the facts table is
//    byte-frozen per the S07 contract; the panel re-states the name per
//    spec §10 "compact information panel with verified stadium name"). The
//    redundancy is the name, accepted because the panel adds the
//    verified-source mark (the distinct role).
// 3. The 7-day window anchor (audit §4 row 74, grade A — ALREADY LOADED):
//    the windowSchedule helper (src/seo/data.ts) reads the ALREADY-LOADED
//    ctx.pool rows (the matches_v13_tracked 92-day horizon, hidden leagues
//    filtered — the SAME pool the S12 form + the S13 clean-sheet reads use)
//    + payload.thisWeek/nextWeek (deduped). The window is ±3.5 days around
//    sm.s.utcDate. The fixture ITSELF is excluded by path. Same-day matches
//    first (the fixture's Tehran calendar day), next-48h emphasized (the
//    48h after kickoff on OTHER days), remaining days grouped for S15's
//    expand control. The day grouping uses the Tehran calendar day
//    (tehranDayKey — spec §11 "localized date headings").
// 4. The coverage-note policy (decision 42 + audit §4 row 74) — the
//    discreet tracked-universe coverage note is MANDATORY when the section
//    is present (windowSchedule.coverageNote is always true when the
//    window is anchored). The no-false-empty law (spec §11): an EMPTY
//    window (sameDay/next48h/remaining all empty) still renders the
//    coverage note (NEVER «بدون مسابقه»); a window that can't be anchored
//    (no fixture date — the degenerate guard) → coverageNote:false → the
//    section omits entirely.
// 5. The S14 render scope (decision S14-Sched) — the venue panel renders
//    the compact information card (the name + the mark); the schedule
//    section renders the <h2>«بازی‌های هفته»</h2> title + the coverage note
//    ALONE. The day-grouped rows + the localized date headings + the
//    «نمایش روزهای بعد» expand control + the inline JS are ALL S15. The
//    MatchScheduleInput atoms (sameDay/next48h/remaining day groups + the
//    pre-built rows) are forward-compatible for S15 (the projection
//    pre-builds them; S15's renderer consumes them). NO inline JS, NO
//    expand control this session.
// 6. The pre-existing slots (decision S14-2) — the mcentre-venue +
//    mcentre-schedule section slots ALREADY EXIST in the S02 registry
//    (MC_NAV_DESTS line 109/110 + the bySlot map line 571/572). NO new nav
//    destination, NO new section anchor — S14 wires content into the
//    pre-existing slots (the S13 discipline). The ورزشگاه + بازی‌های هفته
//    nav items light only when their part is non-empty (the adaptive Q9=B
//    filter — unchanged).
// 7. The numerals + dates — toFaDigits + faDateD2/faTime (the S11/S12/S13
//    precedent); the day-group dateHtml rides faDateD2.
function matchVenueInput(sm: SeoMatch): MatchVenueInput {
  // the venue is ALREADY LOADED by the hydrateMatchVenue await (the
  // homeGround() gate → the provider venue → the FD-detail hydration). The
  // stadium name shows venueFa AS-IS (NO prepend — the R1 no-double pattern).
  const v = sm.s.venueFa || sm.s.venue;
  return { nameHtml: v ? esc(v) : "" };
}

// The schedule projection — the 7-day window atoms (forward-compatible for
// S15). Reads the ALREADY-LOADED data through the windowSchedule aggregation
// helper (the ctx.pool — already loaded by getSeoCtx; ZERO new awaits).
// Pre-builds every atom (the S04 hero precedent — the composer is a pure
// leaf): the day groups with the localized date headings (faDateD2) + the
// rows with the pre-escaped faNames/competition + the Persian-digit score +
// the kickoff time <time>. The coverage-note flag rides the atoms.
function matchScheduleInput(sm: SeoMatch, ctx: SeoCtx): MatchScheduleInput {
  const fixtureDate = sm.s.utcDate;
  const fixturePath = sm.s.path || matchPath(sm.s.homeTeam.name, sm.s.awayTeam.name, sm.s.utcDate);
  const win = windowSchedule(ctx, fixtureDate, fixturePath);
  if (!win) return { sameDay: [], next48h: [], remaining: [], coverageNote: false };
  // one row's atoms — PRE-ESCAPED (the S04 hero precedent; the composer is a pure leaf)
  const fmtRow = (r: any): MatchScheduleRowInput => {
    const home = esc(r.homeFa), away = esc(r.awayFa);
    const scored = (r.live || r.finished) && r.gh != null && r.ga != null;
    return {
      pathHtml: r.path ? '<a href="' + esc(r.path) + '">' + home + " – " + away + "</a>" : home + " – " + away,
      timeHtml: '<time datetime="' + esc(r.utcDate) + '">' + toFaDigits(faTime(r.utcDate)) + "</time>",
      compHtml: esc(r.compFa),
      homeHtml: home,
      awayHtml: away,
      scoreHtml: scored ? toFaDigits(String(r.gh)) + " – " + toFaDigits(String(r.ga)) : "",
      live: !!r.live,
      finished: !!r.finished
    };
  };
  // one day group — the localized date heading (faDateD2) + the pre-built rows
  const fmtGroup = (g: any): MatchScheduleDayGroup => ({
    // the dayKey is "YYYY-MM-DD"; faDateD2 needs an ISO string — noon UTC keeps
    // the same Tehran calendar day under any DST edge (the tehranDayKey anchor)
    dateHtml: esc(faDateD2(g.dayKey + "T12:00:00Z")),
    rows: (g.rows || []).map(fmtRow)
  });
  return {
    sameDay: win.sameDay.map(fmtGroup),
    next48h: win.next48h.map(fmtGroup),
    remaining: win.remaining.map(fmtGroup),
    coverageNote: win.coverageNote
  };
}

export async function buildMatchPage(ctx: SeoCtx, slug: string): Promise<{ html: string; notFound: boolean }> {
  let sm = findMatchBySlug(ctx, slug);
  if (!sm) return { html: "", notFound: true };
  sm = await hydrateMatchVenue(ctx.env, sm);
  const m = sm.s;
  const path = matchPath(m.homeTeam.name, m.awayTeam.name, m.utcDate);
  const compFa = M.compNameFa(m);
  const finished = String(sm.raw.status || "").toUpperCase() === "FINISHED";
  const live = M && /IN_PLAY|LIVE|PAUSED/i.test(String(sm.raw.status || ""));

  // SS-27 / CALENDAR_DISPLAY_v2: the H1 always carries both calendars (D2
  // compact — «، ۱۵ آبان (۵ نوامبر)"); the <title> rides the D3 ladder.
  const h1 = faName(m.homeTeam) + " – " + faName(m.awayTeam) + " | " + compFa + "، " + faDateD2(m.utcDate);
  // D3 (CALENDAR_DISPLAY_v2): Shamsi short + Gregorian parens while the
  // assembled title stays ≤ 65 chars — the SS-10 trim ladder, in order:
  // drop the Gregorian parens → drop the brand → shorten the competition
  // name (trailing words fall off first, never past the first word) →
  // drop the competition clause entirely (SS-10 final guard: teams + date
  // is the irreducible unique core, and the date token is what keeps a
  // pairing's two legs distinct, so it NEVER drops; two real team names
  // plus a date cannot reach 65, and if they ever did the seo-check >75
  // backstop reports it instead of the ladder mangling the title).
  // v13.228-farsibrand: the title brand renders in Farsi — «اسپرت سیگنال»
  // (the owner's verified X display name, the S12 directive) — and the
  // pairing carries the leading ⚽ (the owner's S12 emoji ask: one ball, on
  // the fixture surface only; the hub/index/home titles stay text-only).
  const tCore = "⚽ " + faName(m.homeTeam) + " – " + faName(m.awayTeam) + " | ";
  const tDate = faDateD2(m.utcDate);
  const pIdx = tDate.indexOf(" (");
  const tDateShort = pIdx > 0 ? tDate.slice(0, pIdx) : tDate;
  let title = tCore + compFa + "، " + tDate + " | اسپرت سیگنال";
  if (title.length > 65) title = tCore + compFa + "، " + tDateShort + " | اسپرت سیگنال";
  if (title.length > 65) title = tCore + compFa + "، " + tDateShort;
  if (title.length > 65) {
    const words = String(compFa).split(" ");
    while (title.length > 65 && words.length > 1) {
      words.pop();
      title = tCore + words.join(" ") + "، " + tDateShort;
    }
  }
  if (title.length > 65) title = tCore + tDateShort;
  // SS-11 (Phase-2 spec §3): meta description ≤ 165 — the trim ladder:
  // (1) drop the stadium clause (noVenue; the UTC clause stays), (2) only
  // then trim at a word boundary with an ellipsis — never mid-word. The
  // meta/og/twitter description is the ONLY consumer of the trimmed text;
  // the visible answercard and the SportsEvent description keep the full
  // sentence (visible text == machine text stays byte-identical there).
  let desc = matchAnswerSentence(sm).replace(/<[^>]+>/g, "");
  if (desc.length > 165 && m.venue) desc = matchAnswerSentence(sm, { noVenue: true }).replace(/<[^>]+>/g, "");
  if (desc.length > 165) {
    const cut = desc.slice(0, 163);
    const sp = cut.lastIndexOf(" ");
    // strip a trailing sentence separator before the ellipsis («می‌شود.» →
    // «می‌شود…», never «می‌شود.…») — the ellipsis IS the continuation mark
    desc = (sp >= 100 ? cut.slice(0, sp) : cut).replace(/[.،؛]$/, "") + "…";
  }
  if (desc.length < 70) desc += " برنامه و ساعت دقیق بازی‌های مهم فوتبال در اسپرت سیگنال.";

  // Key facts table (7.4 item 3) — only fields that exist.
  const rows: [string, string][] = [];
  rows.push(["رقابت", '<a href="/competitions/' + compSlug(m.competition.code) + '">' + esc(compFa) + "</a>"]);
  if (m.roundFa || m.round) rows.push(["مرحله", esc(m.roundFa || m.round)]);
  rows.push(["تاریخ", M.fullWhenHtml(m.utcDate)]);
  if (m.venue) rows.push(["ورزشگاه", venueMapLink(m, "")]);
  // S1 M2 (F3): the alternate-spelling row — the SEO name (searcher
  // spelling) leads every surface on the page; the dictionary spelling
  // appears exactly once, here, so the page matches BOTH query spellings.
  const altSpellings = [seoTeamAltName(m.homeTeam), seoTeamAltName(m.awayTeam)].filter(Boolean) as string[];
  if (altSpellings.length) {
    const uniq = Array.from(new Set(altSpellings));
    rows.push(["نام‌های دیگر", esc(uniq.join("، "))]);
  }
  rows.push(["وضعیت", statusFaOf(sm) + (live && m.minute != null ? " (" + toFaDigits(String(m.minute)) + "ʹ)" : "")]);
  if ((finished || live) && m.score && m.score.home != null) rows.push(["نتیجه", scoreStr(m.score)]);

  // Match Centre S07 (M3): the summary atoms — the facts rows stay as the
  // projection's working array (the composer's matchSummaryHtml wraps them in
  // the <table class="facts"> shape + the .mcentre-facts panel). The labels
  // are pre-escaped here (the composer is a pure leaf — it never escapes);
  // the values are already prebuilt HTML (links, <time>, the fullWhenHtml
  // atom — the date row rides byte-identical inside its <td>, S05 decision 95
  // frozen). The finished result block's INNER content (the h2 + the answer
  // sentence) is built here too — the composer wraps it in the
  // .mcentre-card.mcentre-result shell.
  const resultHtml = finished && m.score && m.score.home != null
    ? '<h2>نتیجه نهایی</h2><p class="prose">' + esc(matchAnswerSentence(sm)) + "</p>"
    : "";

  // Related links (P-18)
  const related = '<div class="card"><h2>پیوندهای مرتبط</h2><ul class="prose" style="list-style:none;padding:0">' +
    '<li>🔨 تیم‌ها: <a href="/teams/' + teamSlug(m.homeTeam.name) + '">' + esc(faName(m.homeTeam)) + '</a> · <a href="/teams/' + teamSlug(m.awayTeam.name) + '">' + esc(faName(m.awayTeam)) + "</a></li>" +
    '<li>🏆 رقابت: <a href="/competitions/' + compSlug(m.competition.code) + '">' + esc(compFa) + "</a></li>" +
    '<li>📅 <a href="/matches/today">بازی‌های امروز</a> · <a href="/matches/this-week">بازی‌های این هفته</a> · <a href="/matches">همه بازی‌های بزرگ</a></li>' +
    "</ul></div>";

  // v13.82-matchday: the sibling fixtures card — same stage first (the rest
  // of this matchday/round), then the competition's next fixtures, then
  // same-day matches from other competitions. Every row links to its own
  // match page (matchHref/matchPath — canonical), so each match page
  // cross-links its siblings: the internal-linking loop the hub pages have
  // always had, now on every match destination.
  // v13.87-formtable: the recent-form strip — each side's last-5 W/D/L
  // from the pool's FINISHED rows (zero subrequests). Skipped for a side
  // with fewer than 3 finished rows in the 30-day window (fail-closed:
  // a 2-dot "form" reads as noise).
  // v13.87: the archive load is one bounded KV read per match-page render
  // (fail-closed on error \u2014 the strip drops, the page never breaks).
  const archive = await loadArchive(ctx.env).catch(() => [] as any[]);
  // v13.93-fullrec: the match's competition FULL cached table — every side
  // gets its season chip (bottom-half league sides were invisible to the
  // top-8 payload compacts). ONE bounded cache-only KV read, fail-closed
  // (null → the payload path, exactly v13.88 behavior).
  const fullByCode = await fullByCodeFor(ctx, [sm.s.competition && sm.s.competition.code]);
  // Match Centre S12 (M5): the form renderer — the W/D/L dots + the count
  // summary + the season-record chip fallback + the NEW latest-results list,
  // composer-rendered (matchFormHtml in src/seo/match-centre.ts — the S04
  // hero + the S07 summary + the S11 standings precedent). The projection
  // (matchFormInput) reads the ALREADY-LOADED data — teamForm (fed by the
  // loadArchive load above — one of the 3 pre-existing bounded reads) +
  // teamSeasonRecord (fed by the fullByCodeFor load — already loaded) —
  // ZERO new awaits, ZERO new KV reads, ZERO new fetches (the
  // zero-runtime-cost law). The existing formStripHtml/formRowHtml/
  // formLegendHtml stay as the team-page renderer's vocabulary (byte-frozen
  // — the match page no longer calls formStripHtml). The form string feeds
  // BOTH matchNavHtml (the فرم nav item — the adaptive Q9=B filter) AND
  // matchCentreMain (the mcentre-form section anchor). Fail-closed: when
  // neither side has dots nor a record, matchFormHtml returns "" → the
  // composer's sectionHtml omits the mcentre-form section → the فرم nav
  // item stays filtered out.
  const formHtml = matchFormHtml(matchFormInput(sm, ctx, archive, fullByCode));
  // Match Centre S13 (M5): the home/away performance metrics — the numerical
  // GF/GA/clean-sheets comparison of the two participants (specification §9
  // "Home/away performance"; decisions 33/34/35), composer-rendered
  // (matchMetricsHtml in src/seo/match-centre.ts — the S04/S07/S11/S12
  // precedent). The projection (matchMetricsInput) reads the ALREADY-LOADED
  // data through the NEW teamCompMetrics aggregation helper (src/seo/data.ts)
  // — the fixture's OWN competition standings rows (GF/GA/played — fed by the
  // fullByCodeFor load above, loaded for exactly sm.s.competition.code) + the
  // SAME pool-FINISHED/archive merge the form dots read (fed by the
  // loadArchive load above) — ZERO new awaits, ZERO new KV reads, ZERO new
  // fetches (the zero-runtime-cost law). Decision S13-1: the metrics ride
  // INSIDE the mcentre-form section, AFTER the two form sides (a SIBLING
  // .card under the form card; NO new section anchor, NO new nav
  // destination). The COMBINED form part (formPartHtml) feeds BOTH
  // matchNavHtml (the فرم nav item lights when EITHER the form card or the
  // metrics card renders — the adaptive Q9=B filter reads the same part) AND
  // matchCentreMain (the mcentre-form section anchor — the S11/S12
  // dual-passing precedent). Fail-closed: when neither side has sufficient
  // stats (missing table / team not in the table / pre-season),
  // matchMetricsHtml returns "" → the metrics card omits entirely → the فرم
  // section survives on the S12 dots/chip alone, the nav item logic
  // unchanged.
  const metricsHtml = matchMetricsHtml(matchMetricsInput(sm, ctx, archive, fullByCode));
  const formPartHtml = formHtml + metricsHtml;
  // Match Centre S11 (M4): the standings renderer — the unified competition
  // table MARKUP (specification §8). The S10 selection (matchStandingsWindow)
  // runs HERE — pure logic reading the already-loaded ctx.payload.standings ×7
  // + fullByCode (already loaded by the fullByCodeFor call above — one of the
  // 3 pre-existing bounded reads) + sm.s.homeTeam/awayTeam/competition (already-
  // loaded SeoMatch fields). ZERO new awaits, ZERO new KV reads, ZERO new
  // fetches (the zero-runtime-cost law — the S08 narrative precedent). The
  // renderer (buildStandingsHtml) projects the 5 visible columns (pos | team+
  // crest | played | gd=gf-ga | points) + applies the participant-mark
  // typography (the .strow-participant class — font-weight:600 + #7dd3fc on the
  // home/away team names + the icy-blue color on the rank; NO background —
  // decision 25) + renders the ellipsis sentinel («⋯» U+22EF) + the competition
  // header (.stbox-head). Returns "" when the S10 selection returns null (the
  // fail-closed gate — cups/KO / pre-season / degenerate / neither team found →
  // the mcentre-standings section is omitted, the جدول nav item stays filtered
  // out). The standings string is passed to BOTH matchNavHtml (so the nav's
  // adaptive Q9=B filter renders the جدول nav item when non-empty) AND
  // matchCentreMain (so the composer wraps it in the mcentre-standings anchor).
  // buildMatchPage's bounded-read count stays 3 (the standings are already loaded; the
  // window is pure logic [S10]; the renderer is pure string composition [S11]).
  const standingsHtml = buildStandingsHtml(matchStandingsWindow(sm, ctx, fullByCode));

  const sims = similarMatches(ctx, sm);
  const similarCard = sims.length
    ? '<div class="card simcard"><h2>بازی‌های مرتبط <span class="simcount">' + toFaDigits(String(sims.length)) + " بازی</span></h2>" +
      sims.map((x, i) => M.mrowHtml(x, i, false)).join("") + "</div>"
    : "";

  const trail = [
    { name: "خانه", href: "/" },
    { name: "بازی‌ها", href: "/matches" },
    { name: faName(m.homeTeam) + " – " + faName(m.awayTeam) }
  ];
  // Match Centre S02 (M1): the main assembly delegates to the section
  // composer — src/seo/match-centre.ts wraps the existing builders'
  // byte-identical output in the semantic section anchors (registry order,
  // spec §3: hero → nav → summary → standings → form → venue → schedule →
  // faq → related → telegram → footer-hook; empty parts are omitted, never
  // an empty placeholder). The one deliberate DOM-order change vs v13.9x:
  // the finished «نتیجه نهایی» block joins the SUMMARY section (it is the
  // answer restated — it sat after the similar card since v13.82) so the
  // summary stays the page's single answer/result zone; S07 owns this area
  // next. Everything above (title ladder, desc funnel, JSON-LD, trail) is
  // untouched — the GSC measurement surfaces stay byte-for-byte.
  // Match Centre S04 (M2): the hero part — the composer's matchHeroHtml
  // renders mcentre-hero from the matchHeroInput projection (the legacy
  // matchHeadHtml is retired); the actions row + the inline countdown/copy
  // script ride the hero part unchanged (their bytes and the three
  // pre-existing awaits are untouched).
  const heroInput = matchHeroInput(sm);
  // Match Centre S06: the sticky section nav + back-to-top ride the mcentre-nav
  // part. Q9=B adaptive — matchNavHtml inspects the parts that map to the five
  // destinations and renders nav items only for the present ones (summary is
  // always present; form may be empty; standings/venue/schedule join as S10/
  // S14/S15 ship). summaryHtml is extracted (byte-identical value) so the nav
  // and the matchCentreMain call read ONE summary string.
  // Match Centre S07 (M3): the summary & editorial system — the composer's
  // matchSummaryHtml renders the editorial card markup (the answer-first
  // briefing card + the compact facts panel + the .mcentre-cols two-column
  // pairing + the finished result block) from PRE-BUILT content atoms (the
  // S04 hero precedent — the composer stays the S02 pure leaf). The answer
  // sentence text (matchAnswerSentence) feeds the meta description + the
  // SportsEvent JSON-LD (GSC surfaces, byte-frozen) AND the visible briefing
  // card — one source of truth. The facts rows (the verified facts) and the
  // finished result text ride as atoms; the fullWhenHtml date row stays
  // byte-frozen inside its <td> (S05 decision 95). The summary is always
  // present (every match has an answer sentence), so the nav's adaptive Q9=B
  // filter still detects a non-empty summary (the خلاصه nav item renders).
  // Match Centre S08 (M3): the deterministic narrative engine — the "why this
  // match matters" editorial layer rides ABOVE the briefing|facts pairing as a
  // distinct .mcentre-narrative element (the engine's narrativeHtml atom).
  // The lifecycle flag (upcoming/live/finished) picks the variant tense:
  // upcoming/live use the pre-match variants (live = retained — spec §5 "do
  // not regenerate frequently"); finished uses the past-tense + significance
  // variants. The narrative is a SEPARATE layer from the answer sentence
  // (byte-frozen — feeds the meta description + the JSON-LD) — the variant
  // templates carry ONLY the rivalry/derby/top-table/knockout/featured context
  // and never reference the kickoff time/venue/score (no repetition). The
  // engine reads the SAME SeoMatch fields the legacy whyBigHtml read (already
  // loaded by the three pre-existing awaits — zero new awaits/KV/fetches). When
  // no narrative qualifies, narrativeHtml is "" and the element is omitted (the
  // no-empty-cards law — the briefing|facts pairing still renders).
  const narrativeLifecycle: NarrativeLifecycle = finished ? "finished" : (live ? "live" : "upcoming");
  const narrativeAtomHtml = narrativeHtml(sm, ctx, narrativeLifecycle);
  const summaryHtml = matchSummaryHtml({
    answerHtml: esc(matchAnswerSentence(sm)),
    factsRows: rows.map((r) => ({ label: esc(r[0]), valueHtml: r[1] })),
    resultHtml,
    narrativeHtml: narrativeAtomHtml
  });
  // S11: the standings string feeds BOTH the nav (so the جدول nav item renders
  // when the standings part is non-empty — the adaptive Q9=B filter) AND the
  // composer (so the mcentre-standings section wraps it in the anchor).
  // S12: the form string feeds BOTH too (the فرم nav item — the same adaptive
  // filter) — the composer-rendered matchFormHtml output.
  // S13: the COMBINED form part (formPartHtml = the S12 form card + the S13
  // metrics card) feeds BOTH — the فرم nav item lights when EITHER card
  // renders (the same adaptive Q9=B filter reads the same part).
  // S14: the venue + schedule strings feed BOTH too (the ورزشگاه + بازی‌ها
  // nav items — the same adaptive Q9=B filter — light only when their part
  // is non-empty). The venue panel omits when the venue is missing (the
  // no-empty-cards law); the schedule coverage note is mandatory when the
  // window is anchored (the no-false-empty law — NEVER «بدون مسابقه»). The
  // mcentre-venue + mcentre-schedule slots ALREADY EXIST in the S02 registry
  // (decision S14-2: NO new nav destination, NO new section anchor).
  const venueHtml = matchVenueHtml(matchVenueInput(sm));
  const scheduleHtml = matchScheduleHtml(matchScheduleInput(sm, ctx));
  const navHtml = matchNavHtml({ summary: summaryHtml, standings: standingsHtml, form: formPartHtml, venue: venueHtml, schedule: scheduleHtml });
  const main = matchCentreMain({
    hero: matchHeroHtml(heroInput) + matchActionsHtml(sm, path) + matchHeadScript(),
    nav: navHtml,
    summary: summaryHtml,
    standings: standingsHtml,
    form: formPartHtml,
    venue: venueHtml,
    schedule: scheduleHtml,
    related: similarCard,
    footerHook: related
  });
  const html = pageShell({
    head: buildHead({
      path,
      title,
      description: desc,
      indexable: true,
      ogImage: absUrl("/og/match-" + slug + ".png"),
      jsonldNodes: [
        ...JL.siteNodes(),
        JL.webPageNode(path, ctx.fetchedAt),
        JL.sportsEventNode(sm, matchAnswerSentence(sm).replace(/<[^>]+>/g, "")),
        JL.breadcrumbNode(trail)
      ]
    }),
    h1,
    crumbHtml: M.breadcrumbsHtml(trail),
    mainHtml: main,
    updatedHtml: M.lastUpdatedHtml(ctx.fetchedAt)
  });
  return { html, notFound: false };
}

// ================= LIST RENDERING =================
function dateGroupedRows(list: SeoMatch[], finished: boolean): string {
  if (!list.length) return '<div class="empty">مسابقه‌ای در راه نیست</div>';
  const byDay = new Map<string, SeoMatch[]>();
  for (const sm of list) {
    const k = tehranDayKey(sm.s.utcDate);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(sm);
  }
  let out = "";
  let idx = 0;
  for (const [day, matches] of byDay) {
    // SS-27: dategroup headers ride D1 — «شنبه ۱۵ آبان ۱۴۰۵ (۵ نوامبر ۲۰۲۶)».
    out += '<div class="dategroup">' + esc(faDateD1(matches[0].s.utcDate)) + "</div>";
    for (const sm of matches) {
      out += M.mrowHtml(sm, idx++, finished);
    }
  }
  return out;
}

function paginationHtml(path: string, page: number, totalPages: number): string {
  if (totalPages <= 1) return "";
  let out = '<nav class="pagination" aria-label="صفحه‌بندی">';
  const link = (p: number, label: string, cls?: string) =>
    '<a href="' + path + (p > 1 ? "?page=" + p : "") + '"' + (cls ? ' class="' + cls + '"' : "") + ">" + label + "</a>";
  if (page > 1) out += link(page - 1, "→ قبلی");
  const nums: number[] = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) nums.push(p);
  for (const p of nums) {
    out += p === page ? '<span class="cur">' + toFaDigits(String(p)) + "</span>" : link(p, toFaDigits(String(p)));
  }
  if (page < totalPages) out += link(page + 1, "بعدی ←");
  out += "</nav>";
  return out;
}

// ================= /matches (paginated) =================
export function buildMatchesPage(ctx: SeoCtx, page: number): string {
  const all = upcomingBig(ctx);
  const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const p = Math.min(Math.max(1, page), totalPages);
  const slice = all.slice((p - 1) * PER_PAGE, p * PER_PAGE);
  const path = "/matches";
  // SS-03 (Phase-2 spec): ?page=N (N ≥ 2) is its own indexable URL — a
  // self-referencing canonical + a « — صفحه N» title suffix (Persian
  // digits) before the brand; og:url follows the canonical. ?page=1 / the
  // bare path keep canonical /matches. The router caches per full key
  // (path + ?page=N), so each page's head is cached with its own canonical.
  const canonPath = p >= 2 ? path + "?page=" + p : path;
  const top = all[0];
  let answer = "همه بازی‌های بزرگ فوتبال که اسپرت سیگنال دنبال می‌کند، به تفکیک تاریخ و به وقت تهران.";
  if (top) {
    answer = "نزدیک‌ترین بازی بزرگ: " + faName(top.s.homeTeam) + " – " + faName(top.s.awayTeam) + "، " +
      faDateD1(top.s.utcDate) + " ساعت " + faTime(top.s.utcDate) + " به وقت تهران. " +
      "در مجموع " + toFaDigits(String(all.length)) + " بازی بزرگ در برنامه پیش‌رو است.";
  }
  const title = "بازی‌های بزرگ فوتبال پیش‌رو — تاریخ و ساعت شروع" +
    (p >= 2 ? " — صفحه " + toFaDigits(String(p)) : "") + " | اسپرت سیگنال";
  const desc = ("برنامه کامل بازی‌های مهم فوتبال: لیگ قهرمانان اروپا، لیگ برتر، لالیگا، سری‌آ، بوندسلیگا و لیگ یک — " +
    (top ? "نزدیک‌ترین بازی: " + faName(top.s.homeTeam) + " – " + faName(top.s.awayTeam) + "، " + faDateD2(top.s.utcDate) + "." : "به‌زودی به‌روزرسانی می‌شود.")).slice(0, 165);
  const trail = [{ name: "خانه", href: "/" }, { name: "بازی‌ها" }];
  const main =
    '<div class="answercard">' + esc(answer) + "</div>" +
    '<div class="card"><div class="listhead"><h2>بازی‌های پیش‌رو</h2><span class="pagesub">' +
    toFaDigits(String(all.length)) + " بازی</span></div>" + dateGroupedRows(slice, false) + paginationHtml(path, p, totalPages) + "</div>" +
    hubTiles();
  return pageShell({
    head: buildHead({
      path: canonPath, title, description: desc, indexable: true,
      jsonldNodes: [...JL.siteNodes(), JL.collectionPageNode(canonPath, "بازی‌های بزرگ فوتبال", ctx.fetchedAt), JL.itemListNode(all, "بازی‌های بزرگ پیش‌رو"), JL.breadcrumbNode(trail)]
    }),
    h1: "بازی‌های بزرگ فوتبال پیش‌رو",
    crumbHtml: M.breadcrumbsHtml(trail),
    mainHtml: main,
    updatedHtml: M.lastUpdatedHtml(ctx.fetchedAt)
  });
}

function hubTiles(): string {
  return '<div class="card"><h2>میان‌برها</h2><div class="hubgrid">' +
    hubTile("/matches/today", "بازی‌های امروز", "بازی‌های امروز به وقت تهران") +
    hubTile("/matches/tomorrow", "بازی‌های فردا", "برنامه بازی‌های فردا") +
    hubTile("/matches/this-week", "بازی‌های این هفته", "برنامه ۷ روز آینده") +
    hubTile("/matches/this-weekend", "بازی‌های آخر هفته", "شنبه و یکشنبه این هفته") +
    "</div></div>";
}
function hubTile(href: string, t: string, d: string): string {
  return '<a class="hubtile" href="' + href + '"><div class="t">' + t + '</div><div class="d">' + d + "</div></a>";
}

// ================= TIME HUBS =================
interface HubDef { path: string; h1: string; title: string; desc: string; filter: (sm: SeoMatch) => boolean; crumb: string; anchor?: string }

function buildHub(ctx: SeoCtx, def: HubDef): string {
  // SS-01 (Phase-2 spec): hubs list ALL followed-team fixtures in their
  // window (big matches first), not only big matches — the pool is the
  // followed universe, the same one team/competition pages list from.
  const all = upcomingFollowed(ctx).filter(def.filter);
  const top3 = payloadTop3(ctx.payload);
  const bigCount = all.filter((sm) => isBigForSeo(sm.raw, top3) || sm.s.big).length;
  const nowIso = new Date().toISOString();
  // SS-02 (Phase-2 spec): the H1 date rides the hub's own anchor day
  // (today / tomorrow / weekend start), never the bare render instant —
  // the tomorrow page must never say today's date.
  const anchorIso = def.anchor || nowIso;
  const top = all[0];
  let answer = def.desc + ".";
  if (top) {
    const topBig = isBigForSeo(top.raw, top3) || top.s.big;
    answer = toFaDigits(String(all.length)) + " بازی " + def.crumb + " در برنامه است" +
      (bigCount ? " (" + toFaDigits(String(bigCount)) + " بازی بزرگ)" : "") + ". " +
      (topBig ? "بزرگ‌ترین" : "نزدیک‌ترین") + ": " +
      faName(top.s.homeTeam) + " – " + faName(top.s.awayTeam) + " (" + M.compNameFa(top.s) + ")، " +
      faDateD1(top.s.utcDate) + " ساعت " + faTime(top.s.utcDate) + " به وقت تهران.";
  }
  // SS-06 (Phase-2 spec §3): the hub's DYNAMIC FAQ — the questions real
  // users ask about this window («چه بازی‌هایی امروز است؟»), answered from
  // the SAME upcomingFollowed list the page renders (rule §1.1: no invented
  // facts; an empty window answers honestly that nothing is scheduled). The
  // one array feeds both M.faqHtml (visible) and JL.faqNode (JSON-LD), so
  // the visible text and the FAQPage node agree byte-for-byte (T-20). All
  // dates ride the faDateD1/D2 helpers — never hand-rolled (rule §1.3).
  const FAQ_NAMED_CAP = 8;
  const hubFaq: { q: string; a: string }[] = [];
  if (all.length) {
    const named = all.slice(0, FAQ_NAMED_CAP)
      .map((sm) => faName(sm.s.homeTeam) + " – " + faName(sm.s.awayTeam) + " (" + M.compNameFa(sm.s) + ")، " + faDateD2(sm.s.utcDate) + " ساعت " + faTime(sm.s.utcDate))
      .join("؛ ");
    hubFaq.push({
      q: def.crumb + " چه بازی‌هایی است؟",
      a: def.crumb + " " + toFaDigits(String(all.length)) + " بازی در برنامه اسپرت سیگنال است: " + named +
        (all.length > FAQ_NAMED_CAP ? "؛ و " + toFaDigits(String(all.length - FAQ_NAMED_CAP)) + " بازی دیگر که فهرست کامل آن‌ها در همین صفحه آمده است." : ".")
    });
  } else {
    hubFaq.push({
      q: def.crumb + " چه بازی‌هایی است؟",
      a: "در برنامه فعلی اسپرت سیگنال بازی‌ای برای " + def.crumb + " ثبت نشده است؛ به‌محض اعلام برنامه بازی‌های جدید، همین صفحه به‌روزرسانی می‌شود."
    });
  }
  if (top) {
    const topBig = isBigForSeo(top.raw, top3) || top.s.big;
    hubFaq.push({
      q: (topBig ? "بزرگ‌ترین" : "نزدیک‌ترین") + " بازی " + def.crumb + " چیست؟",
      a: (topBig ? "بزرگ‌ترین بازی " : "نزدیک‌ترین بازی ") + def.crumb + ": " + faName(top.s.homeTeam) + " – " + faName(top.s.awayTeam) +
        " در " + M.compNameFa(top.s) + "، " + faDateD1(top.s.utcDate) + " ساعت " + faTime(top.s.utcDate) + " به وقت تهران."
    });
  }
  hubFaq.push({
    q: "ساعت بازی‌ها به وقت کجاست؟",
    a: "ساعت همه بازی‌ها به وقت تهران نمایش داده می‌شود و زمان جهانی هر بازی در صفحه خودش آمده است؛ تاریخ‌ها هم شمسی با معادل میلادی هستند."
  });
  hubFaq.push({
    q: "این صفحه چند وقت یک‌بار به‌روز می‌شود؟",
    a: "داده‌های مسابقات به‌صورت خودکار و مکرر بررسی می‌شوند و نتیجه بازی‌های در جریان تقریباً هر ۱۰ دقیقه یک‌بار تازه می‌شود؛ زمان آخرین به‌روزرسانی در بالای همین صفحه نمایش داده می‌شود."
  });
  hubFaq.push({
    q: "برنامه بازی‌های بعدی را کجا ببینم؟",
    a: "فهرست کامل بازی‌های بزرگ پیش‌رو در صفحه بازی‌ها و برنامه هفتگی در صفحه این هفته آمده است؛ صفحه هر تیم و هر رقابت هم برنامه اختصاصی خودش را دارد."
  });
  const main =
    '<div class="answercard">' + esc(answer) + "</div>" +
    '<div class="card"><h2>' + def.h1 + "</h2>" + dateGroupedRows(all, false) + "</div>" +
    M.faqHtml(hubFaq) +
    hubTiles();
  // P-05: descriptions stay 70+ chars even on empty days (honest text).
  const descFull = (answer + " تاریخ و ساعت هر بازی به وقت تهران و زمان جهانی نمایش داده می‌شود و هر بازی صفحه اختصاصی دارد.").slice(0, 165);
  const trail = [{ name: "خانه", href: "/" }, { name: "بازی‌ها", href: "/matches" }, { name: def.crumb }];
  return pageShell({
    head: buildHead({
      path: def.path, title: def.title, description: descFull, indexable: true,
      jsonldNodes: [...JL.siteNodes(), JL.collectionPageNode(def.path, def.h1, ctx.fetchedAt), JL.itemListNode(all, def.h1), JL.faqNode(hubFaq), JL.breadcrumbNode(trail)]
    }),
    h1: def.h1 + " — " + faDateD1(anchorIso),
    crumbHtml: M.breadcrumbsHtml(trail),
    mainHtml: main,
    updatedHtml: M.lastUpdatedHtml(ctx.fetchedAt)
  });
}

export function buildTodayPage(ctx: SeoCtx): string {
  const nowIso = new Date().toISOString();
  const day = tehranDayKey(nowIso);
  return buildHub(ctx, {
    path: "/matches/today",
    h1: "بازی‌های فوتبال امروز",
    title: "بازی‌های فوتبال امروز — " + faDateD2(nowIso) + " | اسپرت سیگنال",
    desc: "برنامه بازی‌های امروز",
    crumb: "امروز",
    anchor: nowIso,
    filter: (sm) => tehranDayKey(sm.s.utcDate) === day
  });
}

export function buildTomorrowPage(ctx: SeoCtx): string {
  const tomorrow = new Date(Date.now() + 864e5).toISOString();
  const day = tehranDayKey(tomorrow);
  return buildHub(ctx, {
    path: "/matches/tomorrow",
    h1: "بازی‌های فوتبال فردا",
    title: "بازی‌های فوتبال فردا — " + faDateD2(tomorrow) + " | اسپرت سیگنال",
    desc: "برنامه بازی‌های فردا",
    crumb: "فردا",
    anchor: tomorrow,
    filter: (sm) => tehranDayKey(sm.s.utcDate) === day
  });
}

export function buildThisWeekPage(ctx: SeoCtx): string {
  const now = Date.now();
  return buildHub(ctx, {
    path: "/matches/this-week",
    h1: "بازی‌های فوتبال این هفته",
    title: "بازی‌های فوتبال این هفته — ۷ روز آینده | اسپرت سیگنال",
    desc: "برنامه بازی‌های ۷ روز آینده",
    crumb: "این هفته",
    filter: (sm) => {
      const t = new Date(sm.s.utcDate).getTime();
      return t >= now && t < now + 7 * 864e5;
    }
  });
}

export function buildWeekendPage(ctx: SeoCtx): string {
  const nowIso = new Date().toISOString();
  const win = weekendWindowTehran(nowIso);
  const startKey = tehranDayKey(win.start);
  const endKey = tehranDayKey(win.end);
  return buildHub(ctx, {
    path: "/matches/this-weekend",
    h1: "بازی‌های فوتبال آخر هفته",
    title: "بازی‌های فوتبال آخر هفته — " + faDateD2(win.start) + " | اسپرت سیگنال",
    desc: "برنامه بازی‌های شنبه و یکشنبه",
    crumb: "آخر هفته",
    anchor: win.start,
    filter: (sm) => {
      const k = tehranDayKey(sm.s.utcDate);
      return k >= startKey && k <= endKey;
    }
  });
}

// ================= TEAMS =================
export function buildTeamsIndexPage(ctx: SeoCtx): string {
  const entries = teamsIndex(ctx);
  const path = "/teams";
  const trail = [{ name: "خانه", href: "/" }, { name: "تیم‌ها" }];
  let grid = "";
  for (const e of entries) {
    const d = e.next
      ? "بازی بعدی: " + faName(e.next.s.homeTeam) + " – " + faName(e.next.s.awayTeam) + "، " + faDateD2(e.next.s.utcDate)
      : "";
    // S1 M2 (F3): the tile title rides the SEO override so the index agrees
    // with the team page it links to (the machine list below uses the same
    // names — the SS-13 visible==machine contract).
    grid += '<a class="hubtile" href="/teams/' + e.slug + '"><div class="t">' + esc(seoTeamFaName(e)) +
      '</div><div class="d">' + esc(d) + "</div></a>";
  }
  if (!grid) grid = '<div class="empty">در حال حاضر بازی پیش‌رویی برای تیم‌های دنبال‌شده در برنامه نیست.</div>';
  const main = '<div class="answercard">صفحه هر تیم، برنامه بازی‌های بزرگ بعدی و نتایج اخیر آن تیم را نشان می‌دهد — به وقت تهران و با لینک به صفحه هر بازی.</div>' +
    '<div class="card"><div class="listhead"><h2>تیم‌ها</h2><span class="pagesub">' + toFaDigits(String(entries.length)) + " تیم</span></div>" +
    '<div class="hubgrid">' + grid + "</div></div>";
  // SS-13 (Phase-2 spec §3): the index's ItemList of child links — the same
  // names the visible tiles render, numberOfItems == the tile count (the
  // hub pattern). Every entry HAS a live page (teamsIndex only lists teams
  // with playable upcoming big matches — the same universe the router
  // resolves team slugs from).
  const teamList = JL.linkItemList(
    entries.map((e) => ({ name: seoTeamFaName(e), url: absUrl("/teams/" + e.slug) })),
    "تیم‌های دنبال‌شده"
  );
  return pageShell({
    head: buildHead({
      path,
      title: "تیم‌های فوتبال دنبال‌شده — برنامه بازی‌ها | اسپرت سیگنال",
      description: "فهرست تیم‌های فوتبال که اسپرت سیگنال دنبال می‌کند؛ صفحه هر تیم شامل تاریخ و ساعت بازی بعدی و نتایج اخیر است.",
      indexable: true,
      jsonldNodes: [...JL.siteNodes(), JL.collectionPageNode(path, "تیم‌ها", ctx.fetchedAt), teamList, JL.breadcrumbNode(trail)]
    }),
    h1: "تیم‌های دنبال‌شده",
    crumbHtml: M.breadcrumbsHtml(trail),
    mainHtml: main,
    updatedHtml: M.lastUpdatedHtml(ctx.fetchedAt)
  });
}

// v13.89-stdetail: the compact W·D·L cell — «۶-۲-۱» with each count in
// its win/draw/loss hue (the .fdot family), one cell per standings row.
// Rendered "—" when the snapshot row carries no stats (fail-closed cell,
// the row itself still shows pos/pts). Hidden ≤600px via .stwdl.
function stWdlHtml(t: any): string {
  if (t == null || (t.won == null && t.draw == null && t.lost == null)) return '<span class="stwdl">—</span>';
  const seg = (v: any, cls: string) => '<b class="' + cls + '">' + (v == null ? "—" : toFaDigits(String(v))) + "</b>";
  return '<span class="stwdl" title="برد-مساوی-شکست">' + seg(t.won, "stw-w") + "<i>–</i>" + seg(t.draw, "stw-d") + "<i>–</i>" + seg(t.lost, "stw-l") + "</span>";
}

// v13.87-formtable: the 5-row standings window markup. Reuses the site's
// .stbox/.strow/.stpos/.stname/.stpts vocabulary (the competition tables
// already render those) + .strow-me highlight + a .stmore "full table"
// link into the competition page.
// v13.89-stdetail: + the compact W·D·L column (payload rows carry
// won/draw/lost; desktop-only via .stwdl).
function buildStandingsWindowHtml(stw: { code: string; compFa: string; emblem: string | null; rows: any[]; meIdx: number }): string {
  let tbl = '<div class="stbox stwin">';
  tbl += '<div class="stbox-head">' + (stw.emblem ? '<img src="' + esc(stw.emblem) + '" alt="" loading="lazy">' : "") + esc(String(stw.compFa)) + "</div>";
  tbl += '<div class="sthead"><span class="sthead-fill"></span><span class="stnum ucl-hidem sthead-num">بازی</span><span class="sthead-wdl stwdl">ب-م-ش</span><span class="sthead-p">امتیاز</span></div>';
  stw.rows.forEach((t, i) => {
    tbl += '<div class="strow' + (i === stw.meIdx ? " strow-me" : "") + (t.pos === 1 ? " top1" : "") + '"><span class="stpos' + (t.pos <= 3 ? " top3" : "") + '">' +
      toFaDigits(String(t.pos == null ? "—" : t.pos)) + '</span><span class="stname">' + M.nameHtml(t.faName || t.name) +
      '</span><span class="stnum ucl-hidem">' + (t.played == null ? "—" : toFaDigits(String(t.played))) +
      "</span>" + stWdlHtml(t) +
      '<span class="stpts">' + (t.points == null ? "—" : toFaDigits(String(t.points))) + "</span></div>";
  });
  tbl += '<a class="stmore" href="/competitions/' + compSlug(stw.code) + '">جدول کامل ' + esc(String(stw.compFa)) + ' <span aria-hidden="true">↗</span><span class="sr-only">صفحه جدول کامل</span></a>';
  return tbl + "</div>";
}

// ---- Match Centre S11 (M4): the match-page standings renderer (specification §8) ----
//
// The RENDERING layer for the unified competition table (M4 session 2 of 2;
// specification §8 "Competition standings"). The S10 selection
// (src/seo/standings-window.ts — matchStandingsWindow) computed the pure DATA
// (both teams' five-row neighbourhoods, merged/touching/separated, with the
// participant-mark + the ellipsis sentinel + the fail-closed gate). THIS
// function projects the 5 visible columns from the S10 selection's full-row
// data + computes gd = gf-ga (a PRESENTATION concern — the selection is pure
// data, the renderer is pure presentation — decision 4, the S04 hero
// projection precedent) + applies the participant-mark typography + renders
// the ellipsis sentinel. The output is a pre-built HTML STRING passed to the
// composer's MatchCentreParts.standings (the S04 hero precedent — pages.ts
// builds the string, the composer wraps it in the mcentre-standings anchor;
// the composer stays the S02 pure leaf — zero imports/KV/fetch).
//
// SPECIFICATION §8 — Competition standings:
//   - "Use one unified competition table." (same-competition: ONE block;
//     different-competition: TWO blocks stacked — one per team's competition.)
//   - Visible columns: رتبه | تیم | بازی | تفاضل | امتیاز
//     (rank | team | played | goal difference | points).
//   - "Show a five-row neighbourhood around each participating team. Merge
//     overlapping or touching ranges. Use a discreet ellipsis when ranges are
//     separated. Do not load or display intervening teams." (the S10 selection
//     computes the neighbourhood + the merge/ellipsis; the renderer projects it.)
//   - "Highlight participating team names and rank numbers with stronger
//     typography and icy-blue text. No highlighted row background (decision 25
//     — typography-only participant highlight)." (the .strow-participant class
//     applies font-weight:600 + #7dd3fc to the name + the icy-blue color to the
//     rank — NO background, NO border. The .strow-me background highlight the
//     team-page uses is NOT applied here — the team-page path is byte-frozen.)
//   - "Static table: no expandable rows, team-page navigation or extra
//     controls." (NO .stmore "full table" link — the match-page table is a
//     read-only context window, not a navigation surface. The team-page
//     buildStandingsWindowHtml keeps its .stmore link; the match-page renderer
//     omits it.)
//   - "Mobile: keep all five columns visible; optimize padding and typography;
//     no horizontal scrolling or hidden columns; team names must remain
//     readable." (the played column does NOT carry .ucl-hidem — it stays
//     visible on mobile; the .stname truncates with ellipsis [overflow:hidden
//     + text-overflow:ellipsis + white-space:nowrap — the versioned stylesheet's
//     existing .stname behavior]; the S11 CSS block in page-shell.ts optimizes
//     the padding/font/gap + the crest size at the 600px breakpoint.)
//
// S11 DECISION POINTS (resolved + recorded for the execution log):
//
// 1. The renderer home — a NEW function in pages.ts (buildStandingsHtml). The
//    team-page buildStandingsWindowHtml stays byte-frozen (the S10/S11 split:
//    the team-page path is untouched; the match-page renderer is a NEW function
//    — the S04 hero precedent: pages.ts builds the HTML string, the composer
//    wraps it).
//
// 2. The table vocabulary — REUSE .stwin/.stbox/.stbox-head/.sthead/.strow/
//    .stpos/.stname/.stnum/.stpts (the competition tables already render those —
//    shared CSS, consistent visual language across the site; the S03 foundation
//    precedent — no new vocabulary when the existing one fits). The
//    participant-mark adds .strow-participant (typography-only — NO background,
//    decision 25). The crest uses .stname.haslogo + .stcrest + .sttxt (the
//    versioned stylesheet's existing crest-capable .stname variant). The gd
//    column carries .stnum.stgd (reuses .stnum + a min-width override for the
//    sign). The ellipsis uses .strow-ellipsis + .stellipsis.
//
// 3. The participant highlight (decision 25 — typography-only) — the
//    participating team NAMES get font-weight:600 + the icy-blue color
//    (#7dd3fc — the site's icy-blue token, the .mfin/.mcount/.mnav-item.is-active
//    family). The rank NUMBERS (.stpos) get the icy-blue color (their existing
//    font-weight:800 from the versioned stylesheet is already the strongest
//    weight — "stronger typography" is achieved by the icy-blue color contrast,
//    NOT by reducing the weight to 600; the brief's "font-weight 600" applies to
//    the NAME which needs to become bolder from its default normal weight). The
//    other columns (played/gd/points) stay default. NO highlighted row
//    background (the .strow-me background the team-page uses is NOT applied —
//    the match-page participant-mark is typography-only, scoped to
//    #mcentre-standings so the team-page .strow-me stays byte-frozen).
//
// 4. The ellipsis rendering — the { ellipsis: true } sentinel row renders as
//    «⋯» (U+22EF — the midline horizontal ellipsis) centered, spanning all 5
//    columns (a single .stellipsis span in a .strow-ellipsis row; the flex row
//    centers the single child). Discreet: muted color, smaller font, no team
//    data. aria-hidden="true" (the ellipsis is decorative — screen readers skip
//    it; the table is still navigable by the real rows).
//
// 5. The mobile layout — the design system's 600px breakpoint (public-13.87.css).
//    The S11 CSS block optimizes the padding (2.5px→2px), the font-size
//    (11.5px→11px), the gap (5px→3px), the crest size (16px→14px), and the
//    number-column widths (24px→20px) at ≤600px so all 5 columns stay visible
//    with no horizontal scroll. The team name truncates with ellipsis (the
//    existing .stname overflow:hidden + text-overflow:ellipsis behavior) —
//    readable, one line, no wrap.
//
// 6. The crest rendering — the standings_cache rows carry a crest URL. The
//    renderer renders it as a small <img class="stcrest"> anchored to the team
//    name (the .stname.haslogo variant — flex:1 + the .sttxt wrapper). Crest
//    size: 16px desktop, 14px mobile. alt="" decorative (the team name is the
//    accessible name — the crest is visual context only). loading="lazy" +
//    decoding="async" + referrerpolicy="no-referrer" (the S05 hero portrait
//    precedent). onerror="this.remove()" (a failed crest <img> removes just
//    itself — NOT both-portrait-walk; the standings crest is independent per
//    row, the both-or-neither law is the HERO's only).
//
// 7. The Persian digits — the pos/played/gd/points render with toFaDigits (the
//    site-wide convention — the existing buildStandingsWindowHtml uses it).
//    The gd column: gd = (gf||0) - (ga||0). Positive gd shows "+" + the Persian
//    digits (e.g. "+۵"); zero shows "۰"; negative shows the Persian digits with
//    the Latin hyphen-minus "-" (e.g. "-۳" — the toFaDigits default; the minus
//    sign stays as the Latin hyphen-minus U+002D, the existing site convention
//    — toFaDigits replaces [0-9] only, not the sign; no U+2212 override). The
//    sign is shown for BOTH positive (+) and negative (-) so the column is
//    scannable at a glance (the gd column is distinct from the points column —
//    the sign makes the difference explicit).
//
// 8. The competition header — the block's compFa + emblem render as a header
//    row ABOVE the table (reuse .stbox-head — the team-page + competition-page
//    vocabulary). The emblem is a small <img> (the versioned stylesheet's
//    .stbox-head img — 20px desktop, 40px ≥1440px) + the compFa text. Same
//    markup the team-page buildStandingsWindowHtml uses (byte-identical header
//    shape — the .stbox-head vocabulary is shared).
//
// 9. The two-block case (different-competition) — when the selection returns
//    TWO blocks (the rare cross-competition case — a friendly/super-cup between
//    teams from different leagues), the renderer renders TWO tables (one per
//    block), each with its own competition header. The two tables stack
//    vertically inside the mcentre-standings section (joined "" — the section's
//    natural block flow puts one above the other; spec §8: "Use one unified
//    competition table" — each competition gets its own table when the teams
//    play in different leagues).
//
// 10. The null → "" fail-closed — when matchStandingsWindow returns null (the
//     standings cache is missing / pre-season / degenerate / cups-KO / neither
//     team found — the S10 fail-closed gate), buildStandingsHtml returns "" (the
//     no-empty-cards law — the composer's sectionHtml omits the mcentre-standings
//     section entirely; the جدول nav item stays filtered out by the nav's
//     adaptive Q9=B filter). The S10 gate is the data layer; S11's renderer is
//     the presentation layer that respects it.
//
// 11. The composer wiring — pages.ts buildMatchPage calls matchStandingsWindow
//     (sm, ctx, fullByCode) (the S10 module — already loaded; fullByCode is
//     already loaded by the pre-existing fullByCodeFor await, one of the 3
//     bounded reads), builds the standings HTML string via buildStandingsHtml
//     (window), and passes it to matchCentreMain ({ standings: standingsHtml }).
//     The standings string is ALSO passed to matchNavHtml ({ standings:
//     standingsHtml }) so the nav's adaptive Q9=B filter detects the non-empty
//     standings part and renders the جدول nav item. The lifecycle/await count
//     stays 3 (the standings are already loaded; the window is pure logic [S10];
//     the renderer is pure string composition [S11] — ZERO new awaits, ZERO new
//     KV reads, ZERO new fetches; the zero-runtime-cost law holds).
//
// 12. The CSS home — the .mcentre-standings block rides the page-shell inline
//     <style> (the S03/S04/S05/S06/S07/S08 precedent — the match-centre CSS
//     lives in page-shell.ts, scoped to the mcentre vocabulary). The S11 style
//     block rides AFTER S08 and BEFORE the S03 foundation (chronological
//     session order: S04 → S05 → S06 → S07 → S08 → S11 → S03). Scoped to
//     #mcentre-standings + the .stwin/.strow vocabulary when inside it; logical
//     properties only — RTL/LTR clean under a dir flip; the block's own
//     icy/navy tokens, zero new assets/requests.
//
// ZERO-RUNTIME-COST LAW (the S08 narrative precedent, audited §R3): the
// renderer is PURE STRING COMPOSITION. It reads ONLY the S10 selection's
// pre-built window DATA (StandingsWindowBlock[] | null — already computed by
// matchStandingsWindow, which reads the already-loaded standings_cache + the
// already-loaded fullByCode). ZERO new KV reads, ZERO new awaits, ZERO new
// fetches. The renderer carries NO AI/network/KV/timer/polling code (the cost
// law gates this in check-match-centre — the same regex the S08 narrative
// engine + the S10 selection are gated on). buildMatchPage's await count stays
// exactly 3 (the cost law asserts this — the renderer adds ZERO awaits).
function buildStandingsHtml(window: StandingsWindow): string {
  // The fail-closed gate (the S10 null case — missing/pre-season/degenerate/
  // cups-KO/neither-team). Returns "" → the composer's sectionHtml omits the
  // mcentre-standings section (the no-empty-cards law); the جدول nav item
  // stays filtered out (the nav's adaptive Q9=B filter).
  if (!window || !Array.isArray(window) || !window.length) return "";
  return window.map(function (block) {
    // The competition header — reuse .stbox-head (the team-page + competition-
    // page vocabulary — the emblem <img> + the compFa text, byte-identical
    // shape to buildStandingsWindowHtml's header).
    let html = '<div class="stbox stwin">';
    html += '<div class="stbox-head">' + (block.emblem ? '<img src="' + esc(block.emblem) + '" alt="" loading="lazy">' : "") + esc(String(block.compFa)) + "</div>";
    // The column header row — رتبه | تیم | بازی | تفاضل | امتیاز.
    // .sthead-fill (flex:1) spans the pos + name columns (no text headers for
    // those — the position number + the team name are self-evident). Then
    // بازی (played) / تفاضل (gd) / امتیاز (points) headers. NO .ucl-hidem on
    // the played header (the spec: "keep all five columns visible" on mobile).
    html += '<div class="sthead"><span class="sthead-fill"></span><span class="stnum sthead-num">بازی</span><span class="stnum sthead-gd">تفاضل</span><span class="sthead-p">امتیاز</span></div>';
    // The data rows — project the 5 visible columns from the S10 selection's
    // full-row data + compute gd = gf-ga + apply the participant-mark
    // typography (the .strow-participant class — the CSS in page-shell.ts
    // applies font-weight:600 + #7dd3fc to the name + the icy-blue color to
    // the rank; NO background). The ellipsis sentinel renders «⋯».
    for (const row of block.rows) {
      // The ellipsis sentinel — { ellipsis: true } (the S10 sentinel shape).
      // Renders «⋯» (U+22EF) centered, spanning all 5 columns (a single
      // .stellipsis span in a .strow-ellipsis row — the flex row centers the
      // single child). Discreet: muted color, smaller font, no team data.
      // aria-hidden="true" (decorative — screen readers skip it).
      if ((row as any).ellipsis) {
        html += '<div class="strow strow-ellipsis"><span class="stellipsis" aria-hidden="true">\u22EF</span></div>';
        continue;
      }
      const t = (row as any).team;
      const participant = (row as any).participant;
      // gd = (gf||0) - (ga||0) — a PRESENTATION concern (decision 4 — the
      // selection is pure data, the renderer computes gd). Positive shows "+",
      // zero shows "۰", negative shows "-" (the toFaDigits default — the
      // Latin hyphen-minus, the existing site convention; no U+2212 override).
      const gd = (Number(t.gf) || 0) - (Number(t.ga) || 0);
      const gdStr = gd > 0 ? "+" + toFaDigits(String(gd)) : toFaDigits(String(gd));
      // The team name + crest — .stname.haslogo when a crest exists (the
      // versioned stylesheet's crest-capable variant: display:flex + gap + the
      // .sttxt wrapper for the text). The crest <img> rides .stcrest (16px
      // desktop / 14px mobile — the S11 CSS block) — lazy + async + no-referrer
      // + onerror="this.remove()" (a failed crest removes just itself, NOT a
      // both-portrait walk — the standings crest is independent per row).
      const nameAtom = M.nameHtml(t.faName || t.name);
      const nameHtml = t.crest
        ? '<span class="stname haslogo"><img class="stcrest" src="' + esc(t.crest) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="16" height="16" onerror="this.remove()"><span class="sttxt">' + nameAtom + '</span></span>'
        : '<span class="stname">' + nameAtom + "</span>";
      // The row — .strow + .strow-participant (when home/away — typography-only,
      // NO background) + .top1 (when pos 1 — the league leader, the versioned
      // stylesheet's existing class). The 5 cells: pos | name+crest | played |
      // gd | points. NO .ucl-hidem on played (the spec: "keep all five columns
      // visible"). NO .stwdl W/D/L column (the spec's 5 columns don't include
      // it). NO .stmore link (the spec: "no expandable rows, team-page
      // navigation or extra controls" — the match-page table is read-only).
      html += '<div class="strow' + (participant ? " strow-participant" : "") + (t.pos === 1 ? " top1" : "") + '">' +
        '<span class="stpos' + (t.pos <= 3 ? " top3" : "") + '">' + (t.pos == null ? "—" : toFaDigits(String(t.pos))) + "</span>" +
        nameHtml +
        '<span class="stnum">' + (t.played == null ? "—" : toFaDigits(String(t.played))) + "</span>" +
        '<span class="stnum stgd">' + gdStr + "</span>" +
        '<span class="stpts">' + (t.points == null ? "—" : toFaDigits(String(t.points))) + "</span>" +
        "</div>";
    }
    html += "</div>";
    return html;
  }).join("");
}

// v13.88-formagg: the team page's own form card — the shared renderer
// (dots when the archive+pool yield ≥3 finished rows, else the season
// record chip). Same fail-closed rule: neither → "" (no card). The
// archive load is one bounded KV read per render, same contract as the
// match pages (fail-closed on error).
// v13.93-fullrec: fullByCode widens the chip to every league side (see
// teamSeasonRecord).
function teamFormCardHtml(ctx: SeoCtx, entryName: string, fa: string, archive: any[], fullByCode?: Record<string, any>): string {
  const dots = teamForm(ctx, entryName, archive);
  const rec = dots ? null : teamSeasonRecord(ctx, entryName, fullByCode);
  const row = formRowHtml(fa, dots, rec);
  if (!row) return "";
  const title = dots ? "فرم اخیر " + esc(fa) : "وضعیت فصل " + esc(fa);
  return '<div class="card formstrip"><h2>' + title + "</h2>" + (dots ? formLegendHtml() : "") + row + "</div>";
}

export async function buildTeamPage(ctx: SeoCtx, slug: string): Promise<{ html: string; notFound: boolean }> {
  const entry = findTeamBySlug(ctx, slug);
  if (!entry) return { html: "", notFound: true };
  // S1 M2 (F3): the team page's own name rides the SEO override (Leipzig
  // renders «لایپزیگ» in the title/H1/answer; the dictionary spelling is
  // shown once via altNote below).
  const name = seoTeamFaName(entry);
  const altNote = seoTeamAltName(entry)
    ? '<p class="altnote">' + esc(name + " با نام «" + seoTeamAltName(entry) + "» هم شناخته می‌شود.") + "</p>"
    : "";
  const { upcoming, finished } = teamMatches(ctx, entry.name);
  const indexable = upcoming.length >= SEO.MIN_UPCOMING_FOR_INDEX;
  const path = "/teams/" + slug;
  const trail = [{ name: "خانه", href: "/" }, { name: "تیم‌ها", href: "/teams" }, { name }];
  const next = upcoming[0];
  // v13.85-stadiumchip: the sibling-fixtures loop reaches TEAM pages —
  // "بازی‌های مرتبط" for the team's NEXT match (same matchday card as the
  // match pages; internal-linking: every team page cross-links siblings).
  const sims = next ? similarMatches(ctx, next, 6) : [];
  // v13.93-fullrec: load the FULL cached tables for the competitions the
  // team's OWN fixtures name (≤ 2 codes: usually league, or league + cup —
  // the next fixture first so the window's preferred table is freshest).
  // LIVE-QA lesson: the payload's top-8 compacts CANNOT be the code source —
  // a rank-9+ team is invisible there by definition, and its league chip
  // silently fell back to a 1-game UCL record. The league ALWAYS appears in
  // the team's fixtures, so this derivation closes that gap. Fail-closed per
  // code (no cache → absent from the map → the payload path).
  const recCodes: string[] = [];
  for (const m of upcoming.slice(0, 12)) {
    const c = m.s.competition && m.s.competition.code;
    if (c && !recCodes.includes(c)) recCodes.push(c);
    if (recCodes.length >= 2) break;
  }
  const fullByCode = await fullByCodeFor(ctx, recCodes);
  // v13.87-formtable: the league-table window — the team's neighborhood in
  // its competition's standings (5 rows, the team highlighted, a link to the
  // full competition table). v13.93: the full cached table widens it beyond
  // the top-8 compacts (rank-9+ teams get their window too). Drops silently
  // when neither source covers the team (A-League, off-cup pages).
  const stw = teamStandingsWindow(ctx, entry.name, next, fullByCode);
  const stWinCard = stw ? buildStandingsWindowHtml(stw) : "";
  // v13.88-formagg: the team's own form card (dots or season record) —
  // one bounded archive read, fail-closed (error → dots path stays dark,
  // the season chip still lights from the payload).
  const archive = await loadArchive(ctx.env).catch(() => [] as any[]);
  const formCard = teamFormCardHtml(ctx, entry.name, name, archive, fullByCode);
  // v13.88-formagg: the standings position rides the answer sentence when
  // the window found the team's row (pos/points from the SAME snapshot the
  // window renders — one source of truth, no extra reads).
  const meRow = stw && stw.meIdx >= 0 ? stw.rows[stw.meIdx] : null;
  const posFa = meRow && meRow.pos != null ? toFaDigits(String(meRow.pos)) : null;
  const ptsFa = meRow && meRow.points != null ? toFaDigits(String(meRow.points)) : null;
  const simCard = sims.length
    ? '<div class="card simcard"><h2>بازی‌های مرتبط <span class="simcount">' + toFaDigits(String(sims.length)) + " بازی</span></h2>" +
      sims.map((x, i) => M.mrowHtml(x, i, false)).join("") + "</div>"
    : "";
  let answer = "برنامه بازی‌های " + name + " در اسپرت سیگنال — به وقت تهران.";
  if (next) {
    answer = "بازی بعدی " + name + ": " + faName(next.s.homeTeam) + " – " + faName(next.s.awayTeam) + " در " +
      M.compNameFa(next.s) + "، " + faDateD1(next.s.utcDate) + " ساعت " +
      faTime(next.s.utcDate) + " به وقت تهران.";
  }
  // v13.88-formagg: append the standings position to the answer (feeds the
  // answercard AND the meta description — honest data from the window's own
  // snapshot row; «ردهٔ» is the natural Persian ordinal intro).
  if (posFa) {
    answer += " " + name + (ptsFa ? " با " + ptsFa + " امتیاز" : "") + " در ردهٔ " + posFa + " " + esc(String(stw.compFa)) + " قرار دارد.";
  }
  // v13.229-teamladder: the SS-10 trim ladder reaches the per-team titles.
  // The v13.228 Farsi brand (+2 chars) pushed exactly ONE team into the
  // T-23 pixel-risk band: بروسیا مونشن‌گلادباخ at 66 (the 66–75 REPORT
  // band; the next-longest name, دپورتیوو لاکرونیا, sits at 63). The
  // ladder drops the least-essential qualifier — «بعدی » (5 chars) — only
  // when the assembled title exceeds 65: the rung title «… — برنامه بازی
  // و ساعت شروع | …» stays honest (the H1 is «برنامه بازی‌های X», the
  // whole upcoming schedule; the answer sentence still leads with «بازی
  // بعدی»), and the unique core (the team name) never drops — the match
  // ladder's date-token rule, mirrored. If a future name still exceeds 65
  // on the rung, the seo-check >75 hard backstop reports it; the ladder
  // never mangles.
  let title = name + " — برنامه بازی بعدی و ساعت شروع | اسپرت سیگنال";
  if (title.length > 65) title = name + " — برنامه بازی و ساعت شروع | اسپرت سیگنال";
  const desc = (answer + (next ? " لینک صفحه هر بازی در ادامه است." : " به‌محض اعلام برنامه به‌روزرسانی می‌شود.")).slice(0, 165);
  const main =
    '<div class="answercard">' + esc(answer) + "</div>" + altNote +
    '<div class="card"><div class="listhead"><h2>بازی‌های پیش‌روی ' + esc(name) + "</h2></div>" + dateGroupedRows(upcoming, false) + "</div>" +
    stWinCard +
    formCard +
    (finished.length
      ? '<div class="card"><h2>نتایج اخیر</h2>' + dateGroupedRows(finished, true) + "</div>"
      : "") + simCard;
  return {
    html: pageShell({
      head: buildHead({
        path, title, description: desc, indexable,
        jsonldNodes: [
          ...JL.siteNodes(),
          JL.sportsTeamNode(entry),
          indexable ? JL.itemListNode(upcoming, "بازی‌های " + name) : null,
          JL.breadcrumbNode(trail)
        ].filter(Boolean)
      }),
      h1: "برنامه بازی‌های " + esc(name),
      crumbHtml: M.breadcrumbsHtml(trail),
      mainHtml: main,
      updatedHtml: M.lastUpdatedHtml(ctx.fetchedAt)
    }),
    notFound: false
  };
}

// ================= COMPETITIONS =================
export function buildCompetitionsIndexPage(ctx: SeoCtx): string {
  const entries = compsIndex(ctx);
  const path = "/competitions";
  const trail = [{ name: "خانه", href: "/" }, { name: "رقابت‌ها" }];
  let grid = "";
  for (const e of entries) {
    const cName = (e.next && (e.next.s.competition.faName || COMP_EN[e.code])) || COMP_EN[e.code] || e.code;
    const d = e.next
      ? "بازی بعدی: " + faName(e.next.s.homeTeam) + " – " + faName(e.next.s.awayTeam) + "، " + faDateD2(e.next.s.utcDate)
      : "";
    grid += '<a class="hubtile" href="/competitions/' + e.slug + '"><div class="t">' + esc(String(cName)) +
      '</div><div class="d">' + esc(d) + "</div></a>";
  }
  if (!grid) grid = '<div class="empty">رقابتی در برنامه پیش‌رو نیست.</div>';
  const main = '<div class="answercard">صفحه هر رقابت، بازی‌های بزرگ پیش‌روی همان لیگ یا جام را با تاریخ و ساعت نشان می‌دهد.</div>' +
    '<div class="card"><h2>رقابت‌ها</h2><div class="hubgrid">' + grid + "</div></div>";
  // SS-13 (Phase-2 spec §3): the index's ItemList of child links — the
  // SAME cNameFa the visible tiles render, numberOfItems == the tile count.
  const compList = JL.linkItemList(
    entries.map((e) => ({
      name: String((e.next && (e.next.s.competition.faName || COMP_EN[e.code])) || COMP_EN[e.code] || e.code),
      url: absUrl("/competitions/" + e.slug)
    })),
    "رقابت‌های دنبال‌شده"
  );
  return pageShell({
    head: buildHead({
      path,
      title: "رقابت‌های فوتبال — لیگ‌ها و جام‌ها | اسپرت سیگنال",
      description: "برنامه بازی‌های بزرگ لیگ قهرمانان اروپا، لیگ برتر انگلیس، لالیگا، سری‌آ، بوندسلیگا، لیگ یک فرانسه و جام‌های حذفی در اسپرت سیگنال.",
      indexable: true,
      jsonldNodes: [...JL.siteNodes(), JL.collectionPageNode(path, "رقابت‌ها", ctx.fetchedAt), compList, JL.breadcrumbNode(trail)]
    }),
    h1: "رقابت‌های دنبال‌شده",
    crumbHtml: M.breadcrumbsHtml(trail),
    mainHtml: main,
    updatedHtml: M.lastUpdatedHtml(ctx.fetchedAt)
  });
}

// v13.89-stdetail: the FULL standings table for competition pages. The
// payload only carries the top-8 compact (public-matches compact()) —
// «جدول کامل» deserves the whole table. fetchStandings(env, code, false)
// is ONE cache-only KV read (allowFetch=false never touches a provider —
// the seo layer's reads-only-KV contract holds). Fail-closed: a missing/
// stale cache falls back to the payload's compact rows. Rows gain faName
// via the isolate-cached translateTeam (same mapping the payload uses).
async function fullStandings(env: any, code: string): Promise<any[] | null> {
  try {
    const st = await fetchStandings(env, code, false);
    if (st && Array.isArray(st.teams) && st.teams.length > 8) {
      return st.teams.map((t: any) => ({ pos: t.pos, name: t.name, faName: translateTeam(t.name), played: t.played, won: t.won, draw: t.draw, lost: t.lost, points: t.points }));
    }
  } catch (e) { /* fail-closed to the compact */ }
  return null;
}

// v13.93-fullrec: the shared full-table loader for the season chips and the
// standings window — fullStandings per code (cache-only, fail-closed), the
// payload shell's faName/emblem riding along so the window renders exactly
// like the competition page's table. Callers pass ≤ 2 codes (match pages 1:
// the match's comp; team pages 2: next-fixture's comp + the payload comp
// containing the team). Null tables are simply absent from the map.
async function fullByCodeFor(ctx: SeoCtx, codes: (string | null | undefined)[]): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  for (const code of codes) {
    if (!code || out[code]) continue;
    const full = await fullStandings(ctx.env, code).catch(() => null);
    if (full && full.length) {
      const shell = (ctx.payload && ctx.payload.standings && ctx.payload.standings[code]) || {};
      out[code] = { teams: full, faName: shell.faName || undefined, emblem: shell.emblem || null };
    }
  }
  return out;
}

export async function buildCompetitionPage(ctx: SeoCtx, slug: string): Promise<{ html: string; notFound: boolean; code?: string }> {
  const entries = compsIndex(ctx);
  const entry = entries.find((e) => e.slug === slug);
  if (!entry) return { html: "", notFound: true };
  const code = entry.code;
  const list = compMatches(ctx, code);
  const indexable = list.length >= SEO.MIN_UPCOMING_FOR_INDEX;
  const path = "/competitions/" + slug;
  const cNameFa = (entry.next && entry.next.s.competition.faName) || COMP_EN[code] || code;
  const cNameEn = COMP_EN[code] || code;
  const trail = [{ name: "خانه", href: "/" }, { name: "رقابت‌ها", href: "/competitions" }, { name: String(cNameFa) }];
  const next = list[0];
  let answer = "بازی‌های بزرگ پیش‌روی " + cNameFa + " در اسپرت سیگنال — به وقت تهران.";
  if (next) {
    answer = "نزدیک‌ترین بازی بزرگ " + cNameFa + ": " + faName(next.s.homeTeam) + " – " + faName(next.s.awayTeam) +
      "، " + faDateD1(next.s.utcDate) + " ساعت " + faTime(next.s.utcDate) + " به وقت تهران.";
  }
  const title = cNameFa + " — برنامه بازی‌های بزرگ پیش‌رو | اسپرت سیگنال";
  const desc = (answer + " تاریخ و ساعت دقیق هر بازی در ادامه آمده است.").slice(0, 165);
  let standingsBlock = "";
  let st: any = ctx.payload && ctx.payload.standings && ctx.payload.standings[code];
  // v13.89-stdetail: prefer the FULL cached table (one KV read, cache-only)
  // over the payload's top-8 compact; emblem/faName ride the payload shell.
  const full = await fullStandings(ctx.env, code);
  if (full) st = { ...st, teams: full };
  if (st && Array.isArray(st.teams) && st.teams.length) {
    let tbl = '<div class="stbox"><div class="stbox-head">';
    if (st.emblem) tbl += '<img src="' + esc(st.emblem) + '" alt="" loading="lazy">';
    tbl += esc(cNameFa) + "</div>";
    tbl += '<div class="sthead"><span class="sthead-fill"></span><span class="stnum ucl-hidem sthead-num">بازی</span><span class="sthead-wdl stwdl">ب-م-ش</span><span class="sthead-p">امتیاز</span></div>';
    for (const t of st.teams) {
      tbl += '<div class="strow' + (t.pos === 1 ? " top1" : "") + '"><span class="stpos' + (t.pos <= 3 ? " top3" : "") + '">' +
        toFaDigits(String(t.pos == null ? "—" : t.pos)) + '</span><span class="stname">' + M.nameHtml(t.faName || t.name) +
        '</span><span class="stnum ucl-hidem">' + (t.played == null ? "—" : toFaDigits(String(t.played))) +
        "</span>" + stWdlHtml(t) +
        '<span class="stpts">' + (t.points == null ? "—" : toFaDigits(String(t.points))) + "</span></div>";
    }
    tbl += "</div>";
    standingsBlock = '<div class="card"><h2>جدول ' + esc(String(cNameFa)) + '</h2><div class="grid4" style="grid-template-columns:1fr">' + tbl + "</div></div>";
  }
  const main =
    '<div class="answercard">' + esc(answer) + "</div>" +
    standingsBlock +
    '<div class="card"><div class="listhead"><h2>بازی‌های پیش‌رو</h2><span class="pagesub">' + toFaDigits(String(list.length)) + " بازی</span></div>" + dateGroupedRows(list, false) + "</div>";
  return {
    html: pageShell({
      head: buildHead({
        path, title, description: desc, indexable,
        jsonldNodes: [
          ...JL.siteNodes(),
          JL.sportsOrganizationNode(code),
          indexable ? JL.itemListNode(list, "بازی‌های " + cNameFa) : null,
          JL.breadcrumbNode(trail)
        ].filter(Boolean)
      }),
      h1: "برنامه بازی‌های " + esc(String(cNameFa)),
      crumbHtml: M.breadcrumbsHtml(trail),
      mainHtml: main,
      updatedHtml: M.lastUpdatedHtml(ctx.fetchedAt)
    }),
    notFound: false,
    code
  };
}

export { PER_PAGE };
