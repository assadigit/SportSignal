// SportSignal — server-side markup builders (Phase 1, R-01/P-12/P-14).
// These mirror the client JS renderers (public-13.x.js) class-for-class so
// the no-JS HTML looks native in the existing design, and the client JS
// simply re-renders the same sections with live data on load.
// Language: fa (server default). Time: Asia/Tehran. Digits: Persian.
// Every match row/spotitem is a real <a href> to its match page (R-02).

import { SEO } from "./config";
import { matchPath, compSlug } from "../slugs";
import { esc, faTime, faGregorianDateShort, faWeekdayShort, jalaliDateStr, tehranDayKey, isLiveSt, faGregorianDate, faHeroDate, tehranParts, toJalali } from "./utils";
import { toFaDigits } from "../utils";
import { translateCompetition } from "../translate";
import type { SeoMatch } from "./data";

const T = {
  live: "در حال برگزاری",
  derby: "🔥 دربی",
  topBadge: "صدر جدول",
  wkDone: "پایان‌یافته",
  stEmpty: "جدول هنوز در دسترس نیست",
  stNot: "شروع نشده",
  cupsNone: "برنامه‌ای هنوز اعلام نشده",
  thP: "بازی", thW: "برد", thD: "مساوی", thL: "باخت",
  thGF: "گل زده", thGA: "گل خورده", thGD: "تفاضل", thPts: "امتیاز",
  // v13.120-hero: the Stadium-Pulse hero strings (fa; the client carries
  // the en twins in core-13.11.js I18N)
  heroHome: "میزبان", heroAway: "میهمان", heroKickoff: "ساعت شروع"
};

function compNameFa(m: any): string {
  return (m.competition && (m.competition.faName || translateCompetition(m.competition.code))) || m.competition.code;
}

// nameInto equivalent: Latin names get an isolated <bdi dir="ltr"> (A-03),
// and the full name rides the title attr as a hover tooltip (v12.x-team-title-tooltip —
// mirrored so the server markup and the client render agree).
export function nameHtml(s: any): string {
  const str = String(s == null ? "" : s);
  if (/[A-Za-z]/.test(str) && !/[\u0600-\u06FF]/.test(str)) {
    return '<bdi dir="ltr" title="' + esc(str) + '">' + esc(str) + "</bdi>";
  }
  return '<span title="' + esc(str) + '">' + esc(str) + "</span>";
}

function monogram(t: any): string {
  const n = String((t && (t.faName || t.name)) || "");
  const w = n.split(/\s+/).filter(Boolean);
  if (!w.length) return "⚽";
  if (w.length === 1) return w[0].substring(0, 2);
  return w[0].substring(0, 1) + w[w.length - 1].substring(0, 1);
}

// logo() equivalent. Crests are provider-hosted https images (existing
// design); alt="" is decorative — the team name is adjacent text (A-01/A-02).
export function logoHtml(t: any): string {
  if (t && t.crest) {
    return '<span class="logo"><img src="' + esc(t.crest) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="40" height="40"></span>';
  }
  return '<span class="logo">' + esc(monogram(t)) + "</span>";
}

function scoreHtml(score: any, extraClass?: string): string {
  if (!score || score.home == null) return "";
  const h = score.home == null ? 0 : score.home, a = score.away == null ? 0 : score.away;
  const hEl = h > a ? "<b>" + toFaDigits(String(score.home)) + "</b>" : '<span class="lose">' + toFaDigits(String(score.home)) + "</span>";
  const aEl = a > h ? "<b>" + toFaDigits(String(score.away)) + "</b>" : '<span class="lose">' + toFaDigits(String(score.away)) + "</span>";
  return '<div class="score' + (extraClass ? " " + extraClass : "") + '">' + hEl + '<span class="sep"> - </span>' + aEl + "</div>";
}

function kickHtml(iso: string, extra?: string): string {
  // P-14: machine-readable <time datetime> + human Tehran time.
  return '<div class="kick"><span class="countdown">🕒 <time datetime="' + esc(iso) + '">' + faTime(iso) + "</time></span>" + (extra || "") + "</div>";
}

function sideHome(t: any, teamName: string): string {
  return '<div class="side">' + logoHtml(t) + '<div class="team">' + nameHtml(teamName) + "</div></div>";
}
function sideAway(t: any, teamName: string): string {
  return '<div class="side away"><div class="team">' + nameHtml(teamName) + "</div>" + logoHtml(t) + "</div>";
}

function displayName(t: any): string {
  return (t && (t.faName || t.name)) || "";
}

function roundChipHtml(m: any): string {
  // v14.0.1-uifix: EXACTLY the client rule (roundChip() in public-13.x.js):
  // FA mode shows only a translated roundFa — a raw Latin round ("LEAGUE_STAGE",
  // "16") is NEVER shown. This is what leaked raw English chips into the UCL
  // box before; the server must mirror the client, not "improve" on it.
  const txt = m && m.roundFa ? m.roundFa : "";
  if (!txt) return "";
  return '<span class="roundchip">' + esc(txt) + "</span>";
}

function derbyBadgeHtml(m: any): string {
  if (!m.derby) return "";
  const label = m.rivalryFa ? "🔥 " + m.rivalryFa : m.rivalry && false ? "" : "🔥 دربی";
  // fa consumers drop English-only rivalry names (client rule) — the row
  // keeps its .derby styling either way.
  if (!m.rivalryFa && m.rivalry) return "";
  return '<span class="derbybadge">' + esc(label) + "</span>";
}

function infoLineHtml(m: any, opts?: { noComp?: boolean; past?: boolean; noRound?: boolean; isLiveCard?: boolean; isRow?: boolean }): string {
  let info = '<div class="info">';
  if (!opts || !opts.noComp) {
    info += '<span class="comp">';
    if (m.competition && m.competition.emblem) {
      info += '<img class="complogo" src="' + esc(m.competition.emblem) + '" alt="" loading="lazy" decoding="async">';
    }
    info += esc(compNameFa(m)) + "</span>";
  }
  // v14.0.1-uifix: roundchips ride LIST rows only (client render() —
  // "cups only — league rows carry no round data anyway"), and only when a
  // translated roundFa exists. Spotitems never carried them in the original
  // design (client spotItemNode has no roundChip call at all).
  if (!opts || !opts.noRound) info += roundChipHtml(m);
  info += derbyBadgeHtml(m);
  if (m.top) info += '<span class="topbadge">🏆 ' + esc(T.topBadge) + "</span>";
  const live = isLiveSt(m.status);
  // v14.0.1-uifix: the bare date text node rides LIST rows right after the
  // badges (client render(): info.appendChild(textNode(fmtDate(m.utcDate)))) —
  // spotitems never get it (v12.40-datebelow — their date rides .kickdate).
  if (!opts || opts.isRow) info += " " + faFullDateHtml(m.utcDate) + " ";
  // v14.0.1-uifix: the livechip is SKIPPED inside the live card (v12.44-
  // livepolish — the card itself is the live section; the chip is redundant).
  const inLiveCard = !!(opts && opts.isLiveCard);
  if (live && !inLiveCard) {
    info += '<span class="livechip"><span class="dot"></span>' + esc(T.live) + "</span>";
  }
  // lmin rides ANY live row (client renders it regardless of isLiveCard).
  if (live && m.minute != null) info += '<span class="lmin">' + toFaDigits(String(m.minute)) + "ʹ</span>";
  if (!live && opts && opts.past) {
    info += '<span class="wkdone">⌛ ' + esc(T.wkDone) + "</span>";
  }
  if (m.venue) info += '<span class="venue">🏟️ ' + esc(m.venueFa || m.venue) + "</span>";
  info += "</div>";
  return info;
}

export function matchHref(m: any): string {
  return matchPath(m.homeTeam.name, m.awayTeam.name, m.utcDate);
}

// The list-row anatomy (client render()): .mrow > a.match + .info.
// The row is ONE real link to the match page (R-02) — visually identical
// to the div version (same classes; a gets color:inherit in CSS).
export function mrowHtml(sm: SeoMatch, idx: number, finished: boolean): string {
  const m = sm.s;
  const live = !finished && isLiveSt(m.status);
  const scored = (finished || live) && m.score && m.score.home !== null;
  let row = '<a class="match' + (m.derby ? " derby" : "") + '" style="--i:' + idx + '" href="' + esc(matchHref(m)) + '">';
  row += sideHome(m.homeTeam, displayName(m.homeTeam));
  if (scored) row += scoreHtml(m.score);
  else row += kickHtml(m.utcDate);
  row += sideAway(m.awayTeam, displayName(m.awayTeam));
  row += "</a>";
  // v14.0.1-uifix: isRow → the client's list-row info (with the bare date
  // text node + roundFa chip allowance) — matches render() exactly.
  return '<div class="mrow">' + row + infoLineHtml(m, { isRow: true }) + "</div>";
}

// v13.120-hero: the SERVER mirror of the client hero card (renderHeroSpot/
// heroTeamNode/heroMidNode in public-13.29.js) — class-for-class so the
// no-JS first paint looks native and the client re-render is seamless.
// One real <a> to the match page wraps the grid + chips (R-02, A-01/A-02).
export function heroCardHtml(sm: SeoMatch): string {
  const m = sm.s;
  const live = isLiveSt(m.status);
  const post = /POSTPON|CANCEL|SUSPEND/i.test(String(m.status || ""));
  const scored = (live || m.status === "FINISHED") && m.score && m.score.home !== null;
  let row = '<a class="match" href="' + esc(matchHref(m)) + '">';
  if (m.big) row += '<span class="sr-only">بازی مهم</span>';
  row += '<div class="hero-grid">';
  row += heroSideHtml(m.homeTeam, T.heroHome, false);
  let mid = '<div class="hero-mid' + (live ? " live" : "") + '">';
  if (live) {
    mid += '<span class="livechip hero-chip"><span class="dot"></span>' + esc(T.live) + "</span>";
  } else if (m.status === "FINISHED") {
    mid += '<span class="wkdone hero-chip">⌛ ' + esc(T.wkDone) + "</span>";
  } else if (post) {
    mid += '<span class="hero-stchip hero-chip">' + esc(/CANCEL/i.test(String(m.status)) ? "لغوشده" : "معلق") + "</span>";
  }
  if (scored) {
    mid += scoreHtml(m.score, "hero-score");
    if (live && m.minute != null) mid += '<span class="lmin hero-min">' + toFaDigits(String(m.minute)) + "ʹ</span>";
  } else if (m.utcDate && !post) {
    mid += '<span class="hero-kick-label">' + esc(T.heroKickoff) + '</span>';
    mid += '<span class="hero-clock" dir="ltr"><time datetime="' + esc(m.utcDate) + '">' + esc(faTime(m.utcDate)) + "</time></span>";
    mid += '<span class="hero-date">' + esc(faHeroDate(m.utcDate)) + "</span>";
    mid += '<span class="kicktz">به وقت تهران</span>';
  }
  mid += "</div>";
  row += mid;
  row += heroSideHtml(m.awayTeam, T.heroAway, true);
  row += "</div>";
  row += '<div class="hero-chips">';
  row += '<span class="comp">';
  if (m.competition && m.competition.emblem) {
    row += '<img class="complogo" src="' + esc(m.competition.emblem) + '" alt="" loading="lazy" decoding="async">';
  }
  row += esc(compNameFa(m)) + "</span>";
  row += derbyBadgeHtml(m);
  if (m.top) row += '<span class="topbadge">🏆 ' + esc(T.topBadge) + "</span>";
  if (m.venue) row += '<span class="venue">🏟️ ' + esc(m.venueFa || m.venue) + "</span>";
  row += "</div>";
  row += "</a>";
  return row;
}

function heroSideHtml(t: any, role: string, away: boolean): string {
  return '<div class="hero-side' + (away ? " away" : "") + '"><span class="hero-role">' + esc(role) + "</span>" + logoHtml(t) + '<div class="hero-name">' + nameHtml(displayName(t)) + "</div></div>";
}

// The spotitem anatomy (hero / big-matches / week / ucl boxes).
// opts.finished → show final score · opts.past → dimmed expired ·
// opts.noComp → UCL box (skip comp chip) · opts.noDate → hero stack.
export function spotItemHtml(sm: SeoMatch, idx: number, opts?: { finished?: boolean; past?: boolean; noComp?: boolean; noDate?: boolean; isLiveCard?: boolean }): string {
  const m = sm.s;
  const live = isLiveSt(m.status);
  const done = !!(opts && opts.finished);
  const hero = !!(opts && opts.noDate);
  let item = '<div class="spotitem' + (opts && opts.past ? " past" : "") + '">';
  let row = '<a class="match' + (m.derby ? " derby" : "") + '" style="--i:' + idx + '" href="' + esc(matchHref(m)) + '">';
  const kickdate = m.utcDate && !live && !done
    ? '<div class="kickdate"><time datetime="' + esc(m.utcDate) + '">' + esc(faGregorianDateShort(m.utcDate)) + "</time></div>"
    : "";
  row += sideHome(m.homeTeam, displayName(m.homeTeam));
  if ((live || done) && m.score && m.score.home !== null) {
    row += '<div class="kick">' + scoreHtml(m.score) + kickdate + "</div>";
  } else {
    row += kickHtml(m.utcDate, kickdate);
  }
  row += sideAway(m.awayTeam, displayName(m.awayTeam));
  row += "</a>";
  // Spotitem info: comp (unless noComp) + derby + top + livechip (unless
  // isLiveCard) + venue — NO roundchip, NO date text (client spotItemNode).
  item += row + infoLineHtml(m, { noComp: opts && opts.noComp, past: opts && opts.past, noRound: true, isLiveCard: opts && opts.isLiveCard });
  item += "</div>";
  return item;
}

// --- standings grid (mirror renderStandings) ---
export function standingsHtml(standings: any): string {
  if (!standings) return "";
  let grid = '<div class="grid4">';
  for (const code of ["PL", "PD", "SA", "FL1", "BL1", "PGL"]) {
    const st = standings[code];
    grid += '<div class="stbox"><div class="stbox-head">';
    if (st && st.emblem) {
      grid += '<img src="' + esc(st.emblem) + '" alt="" loading="lazy">';
    }
    grid += esc((st && (st.faName || st.name)) || code) + "</div>";
    if (st && st.started === false) {
      grid += '<div class="stnot-overlay"><div class="stnot-ovl-label">' + esc(T.stNot) + "</div></div>";
    }
    if (st && Array.isArray(st.teams) && st.teams.length) {
      grid += '<div class="sthead"><span class="sthead-fill"></span><span class="stnum ucl-hidem sthead-num">' + esc(T.thP) + '</span><span class="sthead-p">' + esc(T.thPts) + "</span></div>";
      for (const t of st.teams) {
        const r = '<div class="strow' + (t.pos === 1 ? " top1" : "") + '">' +
          '<span class="stpos' + (t.pos <= 3 ? " top3" : "") + '">' + toFaDigits(String(t.pos == null ? "—" : t.pos)) + "</span>" +
          '<span class="stname">' + nameHtml(t.faName || t.name) + "</span>" +
          '<span class="stnum ucl-hidem">' + (t.played == null ? "—" : toFaDigits(String(t.played))) + "</span>" +
          '<span class="stpts">' + (t.points == null ? "—" : toFaDigits(String(t.points))) + "</span>" +
          "</div>";
        grid += r;
      }
    } else {
      grid += '<div class="stempty">' + esc(T.stEmpty) + "</div>";
    }
    grid += "</div>";
  }
  grid += "</div>";
  return grid;
}

// --- cups grid (mirror renderCups: grouped 2-col grids) ---
export function cupsHtml(cups: any[]): string {
  if (!Array.isArray(cups) || !cups.length) return "";
  const euro: any[] = [], intl: any[] = [], dom: Record<string, any[]> = {};
  for (const c of cups) {
    if (c.code === "CL" || c.code === "EL" || c.code === "ECL") euro.push(c);
    else if (c.tier === "gold") intl.push(c);
    else (dom[c.country || ""] = dom[c.country || ""] || []).push(c);
  }
  const groups: { title: string; items: any[] }[] = [];
  if (euro.length) groups.push({ title: "🏆 لیگ‌های قاره اروپا", items: euro });
  if (intl.length) groups.push({ title: "🏆 جام‌های بین‌المللی", items: intl });
  let allDom: any[] = [];
  for (const cc of ["EN", "ES", "IT", "DE", "IR"]) if (dom[cc]) allDom = allDom.concat(dom[cc]);
  if (allDom.length) groups.push({ title: "جام‌های حذفی", items: allDom });
  let out = "";
  for (const g of groups) {
    out += '<div class="cupgroup-title">' + esc(g.title) + '</div><div class="cupgrid">';
    for (const c of g.items) {
      out += '<div class="cupbox"><div class="cupbox-head">';
      if (c.emblem) out += '<img src="' + esc(c.emblem) + '" alt="" loading="lazy">';
      out += esc((c.faName || c.name) || c.code) + (c.qualifying ? " (مقدماتی)" : "") + " " +
        (c.tier === "gold" ? "🥇 " : c.tier === "silver" ? "🥈 " : c.tier === "bronze" ? "🥉 " : "") + "</div>";
      if (c.next) {
        const n = c.next;
        const live = isLiveSt(n.status);
        out += '<div class="cupmatch"><div class="teams">' +
          '<span>' + nameHtml(displayName(n.homeTeam)) + "</span> – " +
          '<span>' + nameHtml(displayName(n.awayTeam)) + "</span></div>";
        out += roundChipHtml(n);
        out += '<div class="cupdate">' + (live
          ? '<span class="live-tag">🔴 ' + esc(T.live) + "</span>"
          : '<time datetime="' + esc(n.utcDate) + '">' + esc(faGregorianDate(n.utcDate)) + "</time>") + "</div></div>";
      } else {
        out += '<div class="stempty">' + esc(T.cupsNone) + "</div>";
      }
      out += "</div>";
    }
    out += "</div>";
  }
  return out;
}

// --- UCL table (mirror renderUcl) ---
export function uclHtml(ucl: any): string {
  if (!ucl) return "";
  let out = "";
  if (Array.isArray(ucl.matches) && ucl.matches.length) {
    let best = null, bestT = 0;
    for (const m of ucl.matches) {
      if (!m || !m.utcDate) continue;
      const t0 = new Date(m.utcDate).getTime();
      if (!isNaN(t0) && t0 > Date.now() && (!best || t0 < bestT)) { best = m.utcDate; bestT = t0; }
    }
    if (best) {
      out += '<div class="ucl-next">📅 <span>هفته بعدی مسابقات: </span><b>' +
        esc(jalaliDateStr(best)) + "، ساعت " + faTime(best) + "</b></div>";
    }
  }
  out += '<div class="ucl-stand-wrap"><div class="ucl-stand">';
  if (ucl.started === false) {
    out += '<div class="stnot-overlay"><div class="stnot-ovl-label">' + esc(T.stNot) + "</div></div>";
  }
  if (Array.isArray(ucl.teams) && ucl.teams.length) {
    out += '<div class="strow uclhead">' +
      '<span class="stpos">#</span><span class="stname">تیم</span>' +
      '<span class="stnum">' + esc(T.thP) + '</span><span class="stnum ucl-hidem">' + esc(T.thW) + '</span>' +
      '<span class="stnum ucl-hidem">' + esc(T.thD) + '</span><span class="stnum ucl-hidem">' + esc(T.thL) + '</span>' +
      '<span class="stnum ucl-hidem">' + esc(T.thGF) + '</span><span class="stnum ucl-hidem">' + esc(T.thGA) + '</span>' +
      '<span class="stnum">' + esc(T.thGD) + '</span><span class="stnum stpts">' + esc(T.thPts) + "</span></div>";
    for (const t of ucl.teams) {
      const dash = "—";
      out += '<div class="strow' + (t.pos === 1 ? " top1" : "") + '">' +
        '<span class="stpos' + (t.pos <= 3 ? " top3" : "") + '">' + toFaDigits(String(t.pos == null ? dash : t.pos)) + "</span>" +
        '<span class="stname">' + nameHtml(t.faName || t.name) + "</span>" +
        '<span class="stnum">' + (t.played == null ? dash : toFaDigits(String(t.played))) + "</span>" +
        '<span class="stnum ucl-hidem">' + (t.won == null ? dash : toFaDigits(String(t.won))) + "</span>" +
        '<span class="stnum ucl-hidem">' + (t.draw == null ? dash : toFaDigits(String(t.draw))) + "</span>" +
        '<span class="stnum ucl-hidem">' + (t.lost == null ? dash : toFaDigits(String(t.lost))) + "</span>" +
        '<span class="stnum ucl-hidem">' + (t.gf == null ? dash : toFaDigits(String(t.gf))) + "</span>" +
        '<span class="stnum ucl-hidem">' + (t.ga == null ? dash : toFaDigits(String(t.ga))) + "</span>" +
        '<span class="stnum">' + (t.gd == null ? dash : toFaDigits(String(t.gd))) + "</span>" +
        '<span class="stnum stpts">' + (t.points == null ? dash : toFaDigits(String(t.points))) + "</span>" +
        "</div>";
    }
  }
  out += "</div></div>";
  return out;
}

// --- time element (P-14: <time datetime> + visible human text) ---
export function timeEl(iso: string, visible: string, cls?: string): string {
  return '<time datetime="' + esc(iso) + '"' + (cls ? ' class="' + cls + '"' : "") + ">" + esc(visible) + "</time>";
}

// Full human datetime line: «شنبه ۱۱ اکتبر ۲۰۲۶ ساعت ۲۱:۳۰ (۱۴ مهر ۱۴۰۵) —
// 18:00 UTC» — absolute Gregorian + Jalali + UTC (G-04, CALENDAR_DISPLAY).
export function fullWhenHtml(iso: string): string {
  return timeEl(iso, faGregorianDate(iso)) + "، ساعت " + timeEl(iso, faTime(iso)) +
    ' <span class="tznote">' + esc(SEO.DISPLAY_TZ_LABEL) + "</span>" +
    ' <span class="jdate">(' + esc(jalaliDateStr(iso)) + ')</span>' +
    ' <span class="utcnote" dir="ltr">' + esc(iso.slice(11, 16) + " UTC") + "</span>";
}

export function lastUpdatedHtml(fetchedAt: string | null): string {
  if (!fetchedAt) return "";
  // EXACTLY the client's renderSync() one-line format (fmtStamp + lastUpd)
  // so the JS handover causes zero height change (PF-08). Source attribution
  // (G-07) lives in the footer instead.
  const t = faTime(fetchedAt);
  const hh = parseInt(String(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: SEO.DISPLAY_TZ }).format(new Date(fetchedAt))), 10) || 0;
  const per = (hh < 5 || hh >= 19) ? "شب" : (hh < 12 ? "صبح" : (hh < 16 ? "ظهر" : "عصر"));
  const wd = new Intl.DateTimeFormat("fa-IR", { weekday: "long", timeZone: SEO.DISPLAY_TZ }).format(new Date(fetchedAt));
  return "آخرین به‌روزرسانی: " + timeEl(fetchedAt, wd + " " + t + " " + per);
}

// Breadcrumbs (P-17) — visible trail + BreadcrumbList source of truth.
export interface Crumb { name: string; href?: string }
export function breadcrumbsHtml(trail: Crumb[]): string {
  if (!trail || trail.length < 2) return "";
  let out = '<nav class="crumbs" aria-label="مسیر صفحه"><ol>';
  trail.forEach((c, i) => {
    out += "<li>";
    if (c.href && i < trail.length - 1) out += '<a href="' + esc(c.href) + '">' + esc(c.name) + "</a>";
    else out += '<span aria-current="page">' + esc(c.name) + "</span>";
    out += "</li>";
  });
  out += "</ol></nav>";
  return out;
}

// fmtDate equivalent (client public-13.x.js) — the bare date text node of
// LIST rows: «جمعه، ۲۴ مهر ۱۴۰۵ ساعت ۲۱:۳۰» (Jalali, fa-IR, Tehran clock).
// Mirrored server-side so finished-list rows carry the same run the client
// renders (the server version previously omitted it entirely).
export function faFullDateHtml(iso: string): string {
  const t = tehranParts(iso);
  const j = toJalali(t.y, t.m, t.d);
  const months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
  const weekdays = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
  const z = (n: number) => (n < 10 ? "0" + n : "" + n);
  return esc(weekdays[t.wd] + "، " + toFaDigits(String(j.jd)) + " " + months[j.jm - 1] + " " + toFaDigits(String(j.jy)) + " ساعت " + toFaDigits(z(t.hh) + ":" + z(t.mm)));
}

export { compNameFa };
