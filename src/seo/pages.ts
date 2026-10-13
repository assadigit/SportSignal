// SportSignal — server-rendered public pages (Phase 1/3): match page, time
// hubs, teams, competitions. Every page: unique title+description (P-04/P-05),
// self canonical (P-06), one h1 (P-12), answer-first block (G-03), absolute
// dates + Tehran time + Jalali (G-04), breadcrumbs (P-17), internal links
// (P-18), honest data only. Static trust pages live in pages-static.ts.

import { SEO, absUrl } from "./config";
import { matchPath, compSlug, teamSlug } from "../slugs";
import { esc, faTime, faGregorianDate, faGregorianDateShort, jalaliDateStr, tehranDayKey, utcTime, statusLabelFa, weekendWindowTehran, enDate } from "./utils";
import { toFaDigits } from "../utils";
import { COMP_EN } from "../tables";
import type { SeoCtx, SeoMatch, TeamEntry, CompEntry } from "./data";
import { upcomingBig, finishedRecent, teamMatches, compMatches, teamsIndex, compsIndex, findMatchBySlug, findTeamBySlug, payloadTop3, hydrateMatchVenue, similarMatches } from "./data";
import * as M from "./markup";
import * as JL from "./jsonld";
import { buildHead, pageShell } from "./page-shell";
import { normalizeTeamName } from "../teams";

const PER_PAGE = 50;

function faName(t: any): string {
  return (t && (t.faName || t.name)) || "";
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
export function matchAnswerSentence(sm: SeoMatch): string {
  const m = sm.s;
  const h = faName(m.homeTeam), a = faName(m.awayTeam);
  const comp = M.compNameFa(m);
  const finished = String(sm.raw.status || "").toUpperCase() === "FINISHED";
  const when = faGregorianDate(m.utcDate) + " (" + jalaliDateStr(m.utcDate) + ") ساعت " + faTime(m.utcDate);
  if (finished) {
    let s = h + " و " + a + " " + when + " به وقت تهران در " + comp + " به مصاف هم رفتند.";
    if (m.score && m.score.home != null) s += " نتیجه نهایی " + scoreStr(m.score) + " بود.";
    return s;
  }
  let s = h + " در " + comp + (m.roundFa ? " (" + m.roundFa + ")" : "") + " میزبان " + a + " است؛ این بازی " + when + " به وقت تهران برگزار می‌شود";
  if (m.venue) s += "؛ ورزشگاه " + (m.venueFa || m.venue);
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

// ---- v13.81-matchpage: the scoreboard head + actions row ----
// The match page is where every homepage/list row now lands (v13.80 made
// those links canonical), so the destination gets a proper "big match"
// treatment: crests facing each other, kickoff + live countdown, and the
// growth loop (calendar / WhatsApp / Telegram / copy — all carrying the
// canonical URL). Server-rendered HTML + ONE tiny inline script; no new
// asset, no client fetch.

function crestHtml(t: any): string {
  if (t && t.crest) {
    return '<img class="mcrest" src="' + esc(t.crest) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="64" height="64" onerror="this.remove()">';
  }
  const mono = String((t && (t.faName || t.name)) || "?").trim().charAt(0) || "?";
  return '<span class="mcrest mcrest-mono" aria-hidden="true">' + esc(mono) + "</span>";
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

function matchHeadHtml(sm: SeoMatch): string {
  const m = sm.s;
  const compFa = M.compNameFa(m);
  const compHref = "/competitions/" + compSlug(m.competition.code);
  const emblem = m.competition && m.competition.emblem;
  const live = /IN_PLAY|LIVE|PAUSED/i.test(String(sm.raw.status || ""));
  const finished = String(sm.raw.status || "").toUpperCase() === "FINISHED";
  const scored = (live || finished) && m.score && m.score.home != null;
  const roundTxt = m.roundFa || "";

  // center column: comp chip → big time / score → date (+ jalali) → countdown
  let center = '<span class="mchip">' + (emblem ? '<img class="mcomplogo" src="' + esc(emblem) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">' : "") + '<a href="' + compHref + '">' + esc(compFa) + "</a>" + (roundTxt ? " · " + esc(roundTxt) : "") + "</span>";
  if (scored) {
    center += '<div class="mscore"' + (live ? ' aria-label="در جریان"' : "") + ">" + scoreStr(m.score) + "</div>";
    if (live) center += '<div class="mlive"><span class="mdot" aria-hidden="true"></span>' + esc(statusFaOf(sm)) + (m.minute != null ? " (" + toFaDigits(String(m.minute)) + "ʹ)" : "") + "</div>";
    else center += '<div class="mkicksub">' + esc(statusFaOf(sm)) + "</div>";
  } else {
    center += '<div class="mkick"><time datetime="' + esc(m.utcDate) + '">' + toFaDigits(faTime(m.utcDate)) + "</time></div>";
  }
  center += '<div class="mkickdate">' + esc(faGregorianDateShort(m.utcDate)) + ' <span class="jdate">(' + esc(jalaliDateStr(m.utcDate)) + ")</span></div>";
  // countdown only for upcoming matches (JS fills .mcount; hidden until then)
  if (!live && !finished) {
    center += '<div class="mcount" data-kickoff="' + esc(m.utcDate) + '" hidden></div>';
  }
  if (m.venue) center += venueMapLink(m, "🏟\uFE0F ");

  return '<section class="matchhead" aria-label="خلاصه بازی">' +
    '<div class="mteam">' + crestHtml(m.homeTeam) + '<div class="mname">' + M.nameHtml(faName(m.homeTeam)) + '</div><div class="mside-lbl">میزبان</div></div>' +
    '<div class="mcenter">' + center + "</div>" +
    '<div class="mteam away"><div class="mside-lbl">میهمان</div><div class="mname">' + M.nameHtml(faName(m.awayTeam)) + "</div>" + crestHtml(m.awayTeam) + "</div>" +
    "</section>";
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
export async function buildMatchPage(ctx: SeoCtx, slug: string): Promise<{ html: string; notFound: boolean }> {
  let sm = findMatchBySlug(ctx, slug);
  if (!sm) return { html: "", notFound: true };
  sm = await hydrateMatchVenue(ctx.env, sm);
  const m = sm.s;
  const path = matchPath(m.homeTeam.name, m.awayTeam.name, m.utcDate);
  const compFa = M.compNameFa(m);
  const finished = String(sm.raw.status || "").toUpperCase() === "FINISHED";
  const live = M && /IN_PLAY|LIVE|PAUSED/i.test(String(sm.raw.status || ""));

  const h1 = faName(m.homeTeam) + " – " + faName(m.awayTeam) + " | " + compFa + "، " + faGregorianDateShort(m.utcDate);
  // Title ≤ ~60 chars (P-04): short fa date (no year — the slug carries it)
  const shortDate = new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long", timeZone: "Asia/Tehran" }).format(new Date(m.utcDate));
  const title = faName(m.homeTeam) + " – " + faName(m.awayTeam) + " | " + compFa + "، " + shortDate + " | SportSignal";
  let desc = matchAnswerSentence(sm).replace(/<[^>]+>/g, "");
  if (desc.length > 175) desc = desc.slice(0, 172) + "…";
  if (desc.length < 70) desc += " برنامه و ساعت دقیق بازی‌های مهم فوتبال در SportSignal.";

  // Key facts table (7.4 item 3) — only fields that exist.
  const rows: [string, string][] = [];
  rows.push(["رقابت", '<a href="/competitions/' + compSlug(m.competition.code) + '">' + esc(compFa) + "</a>"]);
  if (m.roundFa || m.round) rows.push(["مرحله", esc(m.roundFa || m.round)]);
  rows.push(["تاریخ", M.fullWhenHtml(m.utcDate)]);
  if (m.venue) rows.push(["ورزشگاه", venueMapLink(m, "")]);
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
  const main = matchHeadHtml(sm) + matchActionsHtml(sm, path) + matchHeadScript() + whyBigHtml(sm, ctx) + facts + similarCard + resultBlock + related;
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
    out += '<div class="dategroup">' + esc(faGregorianDate(matches[0].s.utcDate)) + " (" + esc(jalaliDateStr(matches[0].s.utcDate)) + ")</div>";
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
  const top = all[0];
  let answer = "همه بازی‌های بزرگ فوتبال که SportSignal دنبال می‌کند، به تفکیک تاریخ و به وقت تهران.";
  if (top) {
    answer = "نزدیک‌ترین بازی بزرگ: " + faName(top.s.homeTeam) + " – " + faName(top.s.awayTeam) + "، " +
      faGregorianDateShort(top.s.utcDate) + " (" + jalaliDateStr(top.s.utcDate) + ") ساعت " + faTime(top.s.utcDate) + " به وقت تهران. " +
      "در مجموع " + toFaDigits(String(all.length)) + " بازی بزرگ در برنامه پیش‌رو است.";
  }
  const title = "بازی‌های بزرگ فوتبال پیش‌رو — تاریخ و ساعت شروع | SportSignal";
  const desc = ("برنامه کامل بازی‌های مهم فوتبال: لیگ قهرمانان اروپا، لیگ برتر، لالیگا، سری‌آ، بوندسلیگا و لیگ یک — " +
    (top ? "نزدیک‌ترین بازی: " + faName(top.s.homeTeam) + " – " + faName(top.s.awayTeam) + "، " + faGregorianDateShort(top.s.utcDate) + "." : "به‌زودی به‌روزرسانی می‌شود.")).slice(0, 165);
  const trail = [{ name: "خانه", href: "/" }, { name: "بازی‌ها" }];
  const main =
    '<div class="answercard">' + esc(answer) + "</div>" +
    '<div class="card"><div class="listhead"><h2>بازی‌های پیش‌رو</h2><span class="pagesub">' +
    toFaDigits(String(all.length)) + " بازی</span></div>" + dateGroupedRows(slice, false) + paginationHtml(path, p, totalPages) + "</div>" +
    hubTiles();
  return pageShell({
    head: buildHead({
      path, title, description: desc, indexable: true,
      jsonldNodes: [...JL.siteNodes(), JL.collectionPageNode(path, "بازی‌های بزرگ فوتبال", ctx.fetchedAt), JL.itemListNode(all, "بازی‌های بزرگ پیش‌رو"), JL.breadcrumbNode(trail)]
    }),
    h1: "بازی‌های بزرگ فوتبال پیش‌رو",
    crumbHtml: M.breadcrumbsHtml(trail),
    mainHtml: main,
    updatedHtml: M.lastUpdatedHtml(ctx.fetchedAt)
  });
}

function hubTiles(): string {
  return '<div class="card"><h2>میان‌برها</h2><div class="hubgrid">' +
    hubTile("/matches/today", "بازی‌های امروز", "بازی‌های بزرگ امروز به وقت تهران") +
    hubTile("/matches/tomorrow", "بازی‌های فردا", "برنامه بازی‌های بزرگ فردا") +
    hubTile("/matches/this-week", "بازی‌های این هفته", "برنامه ۷ روز آینده") +
    hubTile("/matches/this-weekend", "بازی‌های آخر هفته", "شنبه و یکشنبه این هفته") +
    "</div></div>";
}
function hubTile(href: string, t: string, d: string): string {
  return '<a class="hubtile" href="' + href + '"><div class="t">' + t + '</div><div class="d">' + d + "</div></a>";
}

// ================= TIME HUBS =================
interface HubDef { path: string; h1: string; title: string; desc: string; filter: (sm: SeoMatch) => boolean; crumb: string }

function buildHub(ctx: SeoCtx, def: HubDef): string {
  const all = upcomingBig(ctx).filter(def.filter);
  const nowIso = new Date().toISOString();
  const top = all[0];
  let answer = def.desc + ".";
  if (top) {
    answer = toFaDigits(String(all.length)) + " بازی بزرگ " + def.crumb + " در برنامه است. بزرگ‌ترین: " +
      faName(top.s.homeTeam) + " – " + faName(top.s.awayTeam) + " (" + M.compNameFa(top.s) + ")، " +
      faGregorianDateShort(top.s.utcDate) + " ساعت " + faTime(top.s.utcDate) + " به وقت تهران.";
  }
  const main =
    '<div class="answercard">' + esc(answer) + "</div>" +
    '<div class="card"><h2>' + def.h1 + "</h2>" + dateGroupedRows(all, false) + "</div>" +
    hubTiles();
  // P-05: descriptions stay 70+ chars even on empty days (honest text).
  const descFull = (answer + " تاریخ و ساعت هر بازی به وقت تهران و زمان جهانی نمایش داده می‌شود و هر بازی صفحه اختصاصی دارد.").slice(0, 165);
  const trail = [{ name: "خانه", href: "/" }, { name: "بازی‌ها", href: "/matches" }, { name: def.crumb }];
  return pageShell({
    head: buildHead({
      path: def.path, title: def.title, description: descFull, indexable: true,
      jsonldNodes: [...JL.siteNodes(), JL.collectionPageNode(def.path, def.h1, ctx.fetchedAt), JL.itemListNode(all, def.h1), JL.breadcrumbNode(trail)]
    }),
    h1: def.h1 + " — " + faGregorianDateShort(nowIso) + " (" + jalaliDateStr(nowIso) + ")",
    crumbHtml: M.breadcrumbsHtml(trail),
    mainHtml: main,
    updatedHtml: M.lastUpdatedHtml(ctx.fetchedAt)
  });
}

export function buildTodayPage(ctx: SeoCtx): string {
  const day = tehranDayKey(new Date().toISOString());
  return buildHub(ctx, {
    path: "/matches/today",
    h1: "بازی‌های فوتبال امروز",
    title: "بازی‌های فوتبال امروز — " + faGregorianDateShort(new Date().toISOString()) + " | SportSignal",
    desc: "برنامه بازی‌های بزرگ امروز",
    crumb: "امروز",
    filter: (sm) => tehranDayKey(sm.s.utcDate) === day
  });
}

export function buildTomorrowPage(ctx: SeoCtx): string {
  const tomorrow = new Date(Date.now() + 864e5).toISOString();
  const day = tehranDayKey(tomorrow);
  return buildHub(ctx, {
    path: "/matches/tomorrow",
    h1: "بازی‌های فوتبال فردا",
    title: "بازی‌های فوتبال فردا — " + faGregorianDateShort(tomorrow) + " | SportSignal",
    desc: "برنامه بازی‌های بزرگ فردا",
    crumb: "فردا",
    filter: (sm) => tehranDayKey(sm.s.utcDate) === day
  });
}

export function buildThisWeekPage(ctx: SeoCtx): string {
  const now = Date.now();
  return buildHub(ctx, {
    path: "/matches/this-week",
    h1: "بازی‌های فوتبال این هفته",
    title: "بازی‌های بزرگ فوتبال این هفته — ۷ روز آینده | SportSignal",
    desc: "برنامه بازی‌های بزرگ ۷ روز آینده",
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
    title: "بازی‌های بزرگ آخر هفته — " + faGregorianDateShort(win.start) + " | SportSignal",
    desc: "برنامه بازی‌های بزرگ شنبه و یکشنبه",
    crumb: "آخر هفته",
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
      ? "بازی بعدی: " + faName(e.next.s.homeTeam) + " – " + faName(e.next.s.awayTeam) + "، " + faGregorianDateShort(e.next.s.utcDate)
      : "";
    grid += '<a class="hubtile" href="/teams/' + e.slug + '"><div class="t">' + esc(e.faName || e.name) +
      '</div><div class="d">' + esc(d) + "</div></a>";
  }
  if (!grid) grid = '<div class="empty">در حال حاضر بازی پیش‌رویی برای تیم‌های دنبال‌شده در برنامه نیست.</div>';
  const main = '<div class="answercard">صفحه هر تیم، برنامه بازی‌های بزرگ بعدی و نتایج اخیر آن تیم را نشان می‌دهد — به وقت تهران و با لینک به صفحه هر بازی.</div>' +
    '<div class="card"><div class="listhead"><h2>تیم‌ها</h2><span class="pagesub">' + toFaDigits(String(entries.length)) + " تیم</span></div>" +
    '<div class="hubgrid">' + grid + "</div></div>";
  return pageShell({
    head: buildHead({
      path,
      title: "تیم‌های فوتبال دنبال‌شده — برنامه بازی‌ها | SportSignal",
      description: "فهرست تیم‌های فوتبال که SportSignal دنبال می‌کند؛ صفحه هر تیم شامل تاریخ و ساعت بازی بعدی و نتایج اخیر است.",
      indexable: true,
      jsonldNodes: [...JL.siteNodes(), JL.collectionPageNode(path, "تیم‌ها", ctx.fetchedAt), JL.breadcrumbNode(trail)]
    }),
    h1: "تیم‌های دنبال‌شده",
    crumbHtml: M.breadcrumbsHtml(trail),
    mainHtml: main,
    updatedHtml: M.lastUpdatedHtml(ctx.fetchedAt)
  });
}

export function buildTeamPage(ctx: SeoCtx, slug: string): { html: string; notFound: boolean } {
  const entry = findTeamBySlug(ctx, slug);
  if (!entry) return { html: "", notFound: true };
  const name = entry.faName || entry.name;
  const { upcoming, finished } = teamMatches(ctx, entry.name);
  const indexable = upcoming.length >= SEO.MIN_UPCOMING_FOR_INDEX;
  const path = "/teams/" + slug;
  const trail = [{ name: "خانه", href: "/" }, { name: "تیم‌ها", href: "/teams" }, { name }];
  const next = upcoming[0];
  let answer = "برنامه بازی‌های " + name + " در SportSignal — به وقت تهران.";
  if (next) {
    answer = "بازی بعدی " + name + ": " + faName(next.s.homeTeam) + " – " + faName(next.s.awayTeam) + " در " +
      M.compNameFa(next.s) + "، " + faGregorianDate(next.s.utcDate) + " (" + jalaliDateStr(next.s.utcDate) + ") ساعت " +
      faTime(next.s.utcDate) + " به وقت تهران.";
  }
  const title = name + " — برنامه بازی بعدی و ساعت شروع | SportSignal";
  const desc = (answer + (next ? " لینک صفحه هر بازی در ادامه است." : " به‌محض اعلام برنامه به‌روزرسانی می‌شود.")).slice(0, 165);
  const main =
    '<div class="answercard">' + esc(answer) + "</div>" +
    '<div class="card"><div class="listhead"><h2>بازی‌های پیش‌روی ' + esc(name) + "</h2></div>" + dateGroupedRows(upcoming, false) + "</div>" +
    (finished.length
      ? '<div class="card"><h2>نتایج اخیر</h2>' + dateGroupedRows(finished, true) + "</div>"
      : "");
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
      ? "بازی بعدی: " + faName(e.next.s.homeTeam) + " – " + faName(e.next.s.awayTeam) + "، " + faGregorianDateShort(e.next.s.utcDate)
      : "";
    grid += '<a class="hubtile" href="/competitions/' + e.slug + '"><div class="t">' + esc(String(cName)) +
      '</div><div class="d">' + esc(d) + "</div></a>";
  }
  if (!grid) grid = '<div class="empty">رقابتی در برنامه پیش‌رو نیست.</div>';
  const main = '<div class="answercard">صفحه هر رقابت، بازی‌های بزرگ پیش‌روی همان لیگ یا جام را با تاریخ و ساعت نشان می‌دهد.</div>' +
    '<div class="card"><h2>رقابت‌ها</h2><div class="hubgrid">' + grid + "</div></div>";
  return pageShell({
    head: buildHead({
      path,
      title: "رقابت‌های فوتبال — لیگ‌ها و جام‌ها | SportSignal",
      description: "برنامه بازی‌های بزرگ لیگ قهرمانان اروپا، لیگ برتر انگلیس، لالیگا، سری‌آ، بوندسلیگا، لیگ یک فرانسه و جام‌های حذفی در SportSignal.",
      indexable: true,
      jsonldNodes: [...JL.siteNodes(), JL.collectionPageNode(path, "رقابت‌ها", ctx.fetchedAt), JL.breadcrumbNode(trail)]
    }),
    h1: "رقابت‌های دنبال‌شده",
    crumbHtml: M.breadcrumbsHtml(trail),
    mainHtml: main,
    updatedHtml: M.lastUpdatedHtml(ctx.fetchedAt)
  });
}

export function buildCompetitionPage(ctx: SeoCtx, slug: string): { html: string; notFound: boolean; code?: string } {
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
  let answer = "بازی‌های بزرگ پیش‌روی " + cNameFa + " در SportSignal — به وقت تهران.";
  if (next) {
    answer = "نزدیک‌ترین بازی بزرگ " + cNameFa + ": " + faName(next.s.homeTeam) + " – " + faName(next.s.awayTeam) +
      "، " + faGregorianDate(next.s.utcDate) + " (" + jalaliDateStr(next.s.utcDate) + ") ساعت " + faTime(next.s.utcDate) + " به وقت تهران.";
  }
  const title = cNameFa + " — برنامه بازی‌های بزرگ پیش‌رو | SportSignal";
  const desc = (answer + " تاریخ و ساعت دقیق هر بازی در ادامه آمده است.").slice(0, 165);
  let standingsBlock = "";
  const st = ctx.payload && ctx.payload.standings && ctx.payload.standings[code];
  if (st && Array.isArray(st.teams) && st.teams.length) {
    let tbl = '<div class="stbox"><div class="stbox-head">';
    if (st.emblem) tbl += '<img src="' + esc(st.emblem) + '" alt="" loading="lazy">';
    tbl += esc(cNameFa) + "</div>";
    tbl += '<div class="sthead"><span class="sthead-fill"></span><span class="stnum ucl-hidem sthead-num">بازی</span><span class="sthead-p">امتیاز</span></div>';
    for (const t of st.teams) {
      tbl += '<div class="strow' + (t.pos === 1 ? " top1" : "") + '"><span class="stpos' + (t.pos <= 3 ? " top3" : "") + '">' +
        toFaDigits(String(t.pos == null ? "—" : t.pos)) + '</span><span class="stname">' + M.nameHtml(t.faName || t.name) +
        '</span><span class="stnum ucl-hidem">' + (t.played == null ? "—" : toFaDigits(String(t.played))) +
        '</span><span class="stpts">' + (t.points == null ? "—" : toFaDigits(String(t.points))) + "</span></div>";
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
