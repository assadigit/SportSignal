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
import { upcomingBig, upcomingFollowed, isBigForSeo, finishedRecent, teamMatches, compMatches, teamsIndex, compsIndex, findMatchBySlug, findTeamBySlug, payloadTop3, hydrateMatchVenue, similarMatches, teamStandingsWindow, teamForm, teamSeasonRecord, heroArtSrv } from "./data";
import * as M from "./markup";
import * as JL from "./jsonld";
import { buildHead, pageShell } from "./page-shell";
import { normalizeTeamName } from "../teams";
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
import { matchCentreMain, matchHeroHtml, type MatchHeroInput } from "./match-centre";
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

function isTopTable(m: any, top3: Record<string, Set<string>>): boolean {
  const set = top3[m.competition && m.competition.code];
  if (!set) return false;
  return set.has(normalizeTeamName(m.homeTeam.name)) && set.has(normalizeTeamName(m.awayTeam.name));
}

// ---- answer-first sentence for a match (G-03) ----
// SS-11 (Phase-2 spec §3): opts.noVenue drops the STADIUM clause only (the
// meta-description trim ladder's first step). The UTC clause never drops —
// timezone honesty outranks length. The visible answercard, the finished
// result block and the SportsEvent description all keep the full sentence.
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
  if (m.venue && !(opts && opts.noVenue)) s += "؛ ورزشگاه " + (m.venueFa || m.venue);
  s += ".";
  s += " زمان جهانی این بازی " + utcTime(m.utcDate) + " است.";
  return s;
}

// ---- "why this is a big match" (7.4 item 4) — real data only ----
export function whyBigHtml(sm: SeoMatch, ctx: SeoCtx): string {
  const m = sm.s;
  const top3 = payloadTop3(ctx.payload);
  const parts: string[] = [];
  if (m.rivalryFa) parts.push("این دیدار «" + esc(m.rivalryFa) + "» است — یکی از حساس‌ترین بازی‌های فوتبال جهان.");
  if (m.derby && !m.rivalryFa) parts.push("این بازی یک دربی است؛ دیداری حساس بین دو حریف همیشه‌جدی.");
  if (isTopTable(m, top3)) parts.push("هر دو تیم هم‌اکنون در صدر جدول " + esc(M.compNameFa(m)) + " قرار دارند؛ برد این بازی در رقابت عنوان اهمیت دارد.");
  else if (m.big) parts.push("هر دو تیم جزو تیم‌های منتخب و پرطرفدار SportSignal هستند.");
  if (m.roundFa && /فینال|نهایی|یک‌چهارم|نیمه/.test(m.roundFa || "")) {
    parts.push("این بازی در مرحله " + esc(m.roundFa) + " " + esc(M.compNameFa(m)) + " برگزار می‌شود.");
  }
  if (!parts.length) {
    const followed = m.big ? "هر دو تیم" : "حداقل یکی از دو تیم";
    parts.push(followed + " جزو تیم‌های منتخب SportSignal است و بازی‌هایش به‌طور خودکار در این سایت دنبال می‌شود.");
  }
  return '<div class="answercard" id="answer">' + esc(matchAnswerSentence(sm)) + "</div>";
}

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
  const facts = '<table class="facts"><caption>مشخصات بازی</caption><tbody>' +
    rows.map((r) => '<tr><th scope="row">' + r[0] + "</th><td>" + r[1] + "</td></tr>").join("") + "</tbody></table>";

  // Result block (7.4 item 7)
  let resultBlock = "";
  if (finished && m.score && m.score.home != null) {
    resultBlock = '<div class="card"><h2>نتیجه نهایی</h2><p class="prose">' + esc(matchAnswerSentence(sm)) + "</p></div>";
  }

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
  const formCard = formStripHtml(ctx, sm, archive, fullByCode);

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
  const main = matchCentreMain({
    hero: matchHeroHtml(heroInput) + matchActionsHtml(sm, path) + matchHeadScript(),
    summary: whyBigHtml(sm, ctx) + facts + resultBlock,
    form: formCard,
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
