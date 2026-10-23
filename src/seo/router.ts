// SportSignal — the SEO request router (Phase 1..8). Handles every public
// page + machine file, host/path normalization (R-06/R-08), environment
// safety (R-13), edge caching + ETag (PF-01/R-12), the custom 404 (R-10/
// R-11) and IndexNow pings on data change (F-16/T-11). Returns null for
// non-SEO paths so the existing api.ts flow (webhook, admin, bot APIs)
// is untouched.

import type { Env } from "../types";
import { SEO, absUrl } from "./config";
import { fnv1a, esc } from "./utils";
import { getSeoCtx, upcomingBig, finishedRecent, findMatchBySlug, type SeoCtx, type SeoMatch } from "./data";
import * as M from "./markup";
import * as JL from "./jsonld";
import { PUBLIC_PAGE } from "../pages/public";
import { toFaDigits } from "../utils";
import {
  buildMatchPage, buildMatchesPage, buildTodayPage, buildTomorrowPage,
  buildThisWeekPage, buildWeekendPage, buildTeamsIndexPage, buildTeamPage,
  buildCompetitionsIndexPage, buildCompetitionPage
} from "./pages";
import {
  buildAboutPage, buildMethodologyPage, buildContactPage, buildPrivacyPage,
  buildTermsPage, buildDataPage, buildHumanSitemapPage, build404Page
} from "./pages-static";
import * as F from "./files";
import { pingIndexNowIfChanged } from "./indexnow";

// ------------------------------------------------------------ headers (SE-01..SE-03, PF-01)

function htmlHeaders(envSafe: boolean, extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = {
    "content-type": "text/html; charset=utf-8",
    // PF-01: browsers revalidate each visit; the edge (Cache API) holds the
    // HTML copy for 5 min so TTFB stays fast without serving stale data.
    "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
    // R-07: HSTS without preload (owner must approve preload in writing).
    "strict-transport-security": "max-age=31536000; includeSubDomains",
    // CSP: same policy as the existing PAGE_SEC_HEADERS (keeps the inline
    // JSON-LD + theme scripts allowed; no third-party origins).
    "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'"
  };
  if (envSafe) h["x-robots-tag"] = "noindex, nofollow";
  return Object.assign(h, extra || {});
}

function redirect(location: string, code = 301): Response {
  return new Response(null, {
    status: code,
    headers: {
      location,
      "cache-control": "public, max-age=3600"
    }
  });
}

// ------------------------------------------------------------ homepage (R-01)

function heroH1(sm: SeoMatch | null): string {
  if (!sm) return "بازی‌های بزرگ فوتبال";
  return "بازی بزرگ بعدی: " + (sm.s.homeTeam.faName || sm.s.homeTeam.name) + " – " + (sm.s.awayTeam.faName || sm.s.awayTeam.name);
}

// The client's keyOf/listSig formats (public-13.x.js) mirrored server-side:
// when the fresh /api/public-matches payload carries the SAME lists the
// server rendered, the client skips its rebuild entirely (PF-06/PF-08 —
// no post-load layout churn, no CLS).
function clientKeyOf(m: any): string {
  if (!m) return "";
  const st = String(m.status || "");
  const sc = m.score ? m.score.home + "-" + m.score.away : "";
  return (m.id || "") + "|" + (st[0] || "") + sc + m.utcDate;
}
// Null-safe list signature (mirrored EXACTLY in public-13.x.js ssPayloadSig —
// any difference breaks the skip-identical-rebuild handshake).
function payloadSig(p: any): string {
  const strip = (list: any) => (Array.isArray(list) ? list : []).filter(Boolean).map(clientKeyOf).join(";");
  const names = (list: any) => (Array.isArray(list) ? list : []).filter(Boolean).map((t: any) => (t && t.name) || "").join(";");
  const stTeams = (st: any) => (Array.isArray(st && st.teams) ? st.teams.filter(Boolean).map((t: any) => (t && t.name || "") + (t && t.points != null ? t.points : "")).join(";") : "");
  const core = {
    u: strip(p.upcoming), f: strip(p.finished),
    nb: p.nextBig ? clientKeyOf(p.nextBig) : "",
    ts: strip(p.topSpot && p.topSpot.matches), tw: strip(p.thisWeek), nw: strip(p.nextWeek),
    st: p.standings ? Object.keys(p.standings).map((k) => k + ":" + stTeams(p.standings[k])).join("|") : "",
    c: strip((p.cups || []).map((c: any) => c && c.next)),
    ucl: p.ucl ? String(p.ucl.matchday) + "|" + strip(p.ucl.matches) + "|" + names(p.ucl.teams) : ""
  };
  return fnv1aHex(JSON.stringify(core));
}

function asSm(m: any): SeoMatch | null {
  return m && m.homeTeam && m.utcDate ? { raw: m, s: m } : null;
}

export async function buildHomePage(ctx: SeoCtx, isProd = true): Promise<string> {
  // Render from THE PAYLOAD (the exact object the client JS fetches) so the
  // server HTML and the client's first re-render agree (and the signature
  // below lets the client SKIP rebuilding identical content).
  const p = ctx.payload || {};
  const upcomingAll = (Array.isArray(p.upcoming) ? p.upcoming : []).map(asSm).filter(Boolean) as SeoMatch[];
  const finished = (Array.isArray(p.finished) ? p.finished : []).slice(0, 5).map(asSm).filter(Boolean) as SeoMatch[];
  const topSpotAll = (p.topSpot && Array.isArray(p.topSpot.matches) ? p.topSpot.matches : []).map(asSm).filter(Boolean) as SeoMatch[];
  const weekAll = (Array.isArray(p.thisWeek) ? p.thisWeek : []).map(asSm).filter(Boolean) as SeoMatch[];
  const uclAll = (p.ucl && Array.isArray(p.ucl.matches) ? p.ucl.matches : []).map(asSm).filter(Boolean) as SeoMatch[];
  const upcoming = upcomingAll.slice(0, 45);
  // v13.153-heronext: the fallback (when nextBig is absent) must also skip
  // live/finished/already-kicked-off rows — the server-rendered hero and its
  // meta description describe the NEXT big match (owner: never the current
  // result); the upcoming list is live-ranked, so a bare [0] could be a
  // rolling ball.
  const nextBig = (asSm(p.nextBig) || upcoming.find((sm) => {
    const st = String(sm.raw.status || "").toUpperCase();
    if (st === "LIVE" || st === "IN_PLAY" || st === "PAUSED" || st === "FINISHED") return false;
    const kk = sm.s.utcDate ? Date.parse(sm.s.utcDate) : NaN;
    return !Number.isNaN(kk) && kk > Date.now();
  }) || null) as SeoMatch | null;
  const topSpotList = (topSpotAll.length ? topSpotAll : upcoming).slice(1, 11);
  const live = upcomingAll.filter((sm) => /IN_PLAY|LIVE|PAUSED/i.test(String(sm.raw.status)));
  const week = weekAll.slice(0, 12);
  const ucl = uclAll.slice(0, 8);
  const sig = payloadSig(p);

  // --- head values ---
  const title = "برنامه بازی‌های مهم فوتبال | تاریخ و ساعت شروع | SportSignal";
  let desc = "بازی‌های مهم فوتبال امروز و این هفته — لیگ قهرمانان اروپا، لیگ برتر، لالیگا، سری‌آ، بوندسلیگا و لیگ یک؛ با تاریخ و ساعت دقیق به وقت تهران.";
  if (nextBig) {
    desc = "بازی بزرگ بعدی: " + (nextBig.s.homeTeam.faName || nextBig.s.homeTeam.name) + " – " +
      (nextBig.s.awayTeam.faName || nextBig.s.awayTeam.name) + "، " + M.compNameFa(nextBig.s) + "، " +
      new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long", timeZone: "Asia/Tehran" }).format(new Date(nextBig.s.utcDate)) +
      " ساعت " + toFaDigits(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Tehran" }).format(new Date(nextBig.s.utcDate))) + " به وقت تهران.";
  }
  if (desc.length > 165) desc = desc.slice(0, 162) + "…";

  const jsonld = JL.jsonldScript([
    ...JL.siteNodes(),
    JL.collectionPageNode("/", "بازی‌های بزرگ فوتبال", ctx.fetchedAt),
    JL.itemListNode(upcoming.slice(0, 25), "بازی‌های بزرگ پیش‌رو")
  ]);

  // --- section fills (server-rendered, same classes as the client) ---
  // v13.120-hero: the hero is the Stadium-Pulse card (M.heroCardHtml — the
  // server mirror of renderHeroSpot in public-13.29.js).
  // v13.164-matchcard: M.mcardHtml — the mobile HUD card's server mirror
  // (renderMCard in public-13.50.js); the SAME nextBig selection feeds both
  // cards (one source of truth — the hero never differs between presentations).
  const heroHtml = nextBig ? M.heroCardHtml(nextBig) : "";
  const mheroHtml = nextBig ? M.mcardHtml(nextBig) : "";
  const liveHtml = live.length
    ? live.slice(0, 10).map((sm, i) => M.spotItemHtml(sm, i, { finished: true, isLiveCard: true })).join("")
    : "";
  const topspotHtml = topSpotList.length ? topSpotList.map((sm, i) => M.spotItemHtml(sm, i + 1)).join("") : "";
  const uclspotHtml = ucl.length ? ucl.map((sm, i) => M.spotItemHtml(sm, i, { noComp: true })).join("") : "";
  const weekHtml = week.length ? week.map((sm, i) => M.spotItemHtml(sm, i, { finished: String(sm.raw.status) === "FINISHED" })).join("") : "";
  const uclTableHtml = M.uclHtml(p.ucl);
  const standingsHtml = M.standingsHtml(p.standings);
  const cupsHtml = M.cupsHtml(p.cups);
  const finishedHtml = finished.length ? finished.map((sm, i) => M.mrowHtml(sm, i, true)).join("") : "";

  const syncHtml = ctx.fetchedAt
    ? M.lastUpdatedHtml(ctx.fetchedAt)
    : "";

  let html = PUBLIC_PAGE
    .replace(/<body>/, '<body data-ss-generated="' + esc(ctx.fetchedAt || new Date().toISOString()) + '"><script>window.__SS_SIG__=' + JSON.stringify(sig) + ";window.__SS_TS__=" + (ctx.fetchedAt ? Date.parse(ctx.fetchedAt) : Date.now()) + ";</script>")
    .replace("__PAGE_TZ__", (ctx.env && (ctx.env as any).TEHRAN_TZ) || "Asia/Tehran")
    .replace("__SEO_TITLE__", esc(title))
    .replace("__SEO_DESC__", esc(desc))
    .replace("__SEO_ROBOTS__", isProd
      ? "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
      : "noindex, nofollow")
    .replace(/__SEO_OG_TITLE__/g, esc(title))
    .replace(/__SEO_OG_DESC__/g, esc(desc))
    .replace(/__SEO_OG_IMAGE__/g, esc(absUrl(SEO.OG_DEFAULT_IMAGE)))
    .replace("__SEO_JSONLD__", jsonld)
    // v13.161-tzstamp: /g — the placeholder rides TWICE in the template
    // (#lastSyncM in-hero + #lastSync below the hero, public.ts); the old
    // first-occurrence-only string replace left the desktop line as a raw
    // «__SEO_SYNC__» literal until the client renderSync() overwrote it
    // (no-JS visitors saw the placeholder text). Both copies now carry the
    // server stamp — with the v13.161 zone note «(تهران 3:30 GMT)».
    .replace(/__SEO_SYNC__/g, syncHtml)
    .replace("__SEO_HERO__", heroHtml)
    // v13.164-matchcard: the mobile HUD card's data zone (Tehran stamps
    // the client renderMCard corrects to the user's ss_tz zone on load;
    // v13.165-mcfa: the mirror ships the FA/Jalali/Persian-digit presentation)
    .replace("__SEO_MHERO__", mheroHtml)
    // v13.170-mcref: the venue rides the STATIC #mcVenue layer (the
    // .mc-venuewrap flex group) — the router stamps it exactly like the
    // old mcardHtml venue div did (FA default + the localized neutral
    // fallback; renderMCard re-fills it by textContent on load/toggle).
    .replace("__SEO_MCVENUE__", esc((nextBig && (nextBig.s.venueFa || nextBig.s.venue)) || "استادیوم نامشخص"))
    .replace("__SEO_LIVE__", liveHtml || (live.length ? "" : '<span class="sr-only">در حال حاضر بازی زنده‌ای در برنامه نیست.</span>'))
    .replace("__SEO_TOPSPOT__", topspotHtml)
    .replace("__SEO_UCLSPOT__", uclspotHtml)
    .replace("__SEO_WEEK__", weekHtml)
    .replace("__SEO_UCL__", uclTableHtml)
    .replace("__SEO_STANDINGS__", standingsHtml)
    .replace("__SEO_CUPS__", cupsHtml)
    .replace("__SEO_FINISHED__", finishedHtml);

  // v14.0.1-uifix: the h1 is SR-ONLY — the pre-SEO design had NO heading
  // text above the hero card, and the owner asked for the original UI back.
  // P-12/R-01 still hold: exactly one <h1> exists in the raw HTML (grep-able,
  // announced by screen readers); it just does not occupy visual layout.
  // The injected styles stay inline so the shared stylesheet stays untouched.
  html = html.replace("</style>",
    ".hero-h1{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.skip-link{position:absolute;inset-inline-start:-9999px}.skip-link:focus{inset-inline-start:8px;top:8px;z-index:99;background:#0f172a;color:#fff;padding:8px 14px;border-radius:8px}a.match{color:inherit;text-decoration:none}a.match:hover .team{opacity:.85}a.match:focus-visible{outline:2px solid #5ea0ff;border-radius:8px}</style>");

  // The ONE <h1> (P-12) — sr-only (uifix, see above); a short sr-only page
  // summary follows it (A-04/A-01). The client JS leaves these nodes alone
  // (they live outside every container the JS re-renders).
  html = html.replace('<a class="hero-card" id="bigHeroCard"',
    '<h1 class="hero-h1">' + esc(heroH1(nextBig)) + "</h1>\n" +
    '<p class="sr-only">در این صفحه: بازی بزرگ بعدی، بازی‌های زنده، بازی‌های مهم پیش‌رو، جدول لیگ‌ها و نتایج اخیر — همه به وقت تهران.</p>\n<a class="hero-card" id="bigHeroCard"');

  // Cards hidden by default must SHOW their server content for no-JS
  // visitors; the client JS re-manages display on load (same rules).
  if (heroHtml) html = html.replace('<a class="hero-card" id="bigHeroCard" style="display:none" href="#">', '<a class="hero-card" id="bigHeroCard" href="#">');
  // v13.164-matchcard: the mobile card unhides under the SAME rule as the PC
  // card (a hero exists ⇒ content visible for no-JS; CSS decides which card
  // the viewport shows — ≤899px the mobile card, ≥900px the PC card).
  if (mheroHtml) html = html.replace('<a class="hero-mcard" id="heroMCard" style="display:none" href="#" dir="ltr">', '<a class="hero-mcard" id="heroMCard" href="#" dir="ltr">');
  // v13.165-mcfa: the scroll hint unhides under the SAME rule (a hero
  // exists => the hint shows for no-JS too; CSS decides which viewport
  // paints it — <=899px; renderMCard re-manages it client-side).
  if (mheroHtml) html = html.replace('<a class="mc-hint" id="mcHint" style="display:none" href="#topspotCard">', '<a class="mc-hint" id="mcHint" href="#topspotCard">');
  if (liveHtml) html = html.replace('<div class="card" id="liveCard" style="display:none">', '<div class="card" id="liveCard">');
  if (topspotHtml) html = html.replace('<div class="card" id="topspotCard" style="display:none">', '<div class="card" id="topspotCard">');
  if (weekHtml) html = html.replace('<div class="card" id="weekCard" style="display:none">', '<div class="card" id="weekCard">');

  // v13.120-hero: the countdown strip's server-rendered digits — the
  // remaining time from the hero kickoff AS OF the payload epoch (the page
  // is edge-cached ≤5min; updateBigBar corrects the values on load). Only
  // an UPCOMING hero gets digits: live/finished/postponed/missing ⇒ the
  // strip ships hidden (the client keeps the same rule every tick).
  {
    const z = (n: number) => (n < 10 ? "0" + n : "" + n);
    let hcD = "--", hcH = "--", hcM = "--", hcS = "--", hcPct = "0", hcUpcoming = false;
    // v13.164-matchcard + v13.170-mcref: the mobile card's cells ride the SAME
    // epoch + guard; the digits ship LATIN now (the V3 card's digit rule —
    // Poppins Digits in both locales; updateBigBar's mset writer keeps
    // plain Latin every tick exactly like the server stamp).
    let mcD = "--", mcH = "--", mcM = "--";
    if (nextBig && nextBig.s.utcDate) {
      const st = String(nextBig.s.status || "").toUpperCase();
      const liveHero = /IN_PLAY|LIVE|PAUSED/.test(st);
      const postHero = /POSTPON|CANCEL|SUSPEND/.test(st);
      const koMs = Date.parse(nextBig.s.utcDate);
      const ms = koMs - (ctx.fetchedAt ? Date.parse(ctx.fetchedAt) : Date.now());
      if (!liveHero && !postHero && !isNaN(koMs) && ms > 0) {
        hcUpcoming = true;
        hcD = toFaDigits(z(Math.floor(ms / 864e5)));
        hcH = toFaDigits(z(Math.floor(ms % 864e5 / 36e5)));
        hcM = toFaDigits(z(Math.floor(ms % 36e5 / 6e4)));
        hcS = toFaDigits(z(Math.floor(ms % 6e4 / 1e3)));
        mcD = z(Math.floor(ms / 864e5));
        mcH = z(Math.floor(ms % 864e5 / 36e5));
        mcM = z(Math.floor(ms % 36e5 / 6e4));
        let g = 1 - ms / 864e5; if (g < 0) g = 0; if (g > 1) g = 1;
        hcPct = String(Math.max(2, Math.round(g * 100)));
      }
    }
    if (hcUpcoming) {
      html = html
        .replace("__SEO_HCD__", hcD).replace("__SEO_HCH__", hcH)
        .replace("__SEO_HCM__", hcM).replace("__SEO_HCS__", hcS)
        .replace("__SEO_HCPCT__", hcPct)
        // v13.164-matchcard + v13.170-mcref: the mobile card's three pockets —
        // same remaining time, LATIN tabular cells (the V3 digit rule; the
        // client's mset writer keeps plain Latin in both locales)
        .replace("__SEO_MCD__", mcD).replace("__SEO_MCH__", mcH).replace("__SEO_MCM__", mcM);
    } else {
      // v13.150-hud: the countdown lives INSIDE the card as the static
      // .hud-cells layer now (the old #bigbar panel is gone) — ship the
      // layer hidden for non-upcoming heroes; updateBigBar keeps the same
      // rule every tick. __SEO_HCS__ has no tile anymore (three pockets)
      // but stays replaced so the placeholder never leaks into HTML.
      html = html.replace('<div class="hud-cells" role="timer" dir="ltr">', '<div class="hud-cells" role="timer" dir="ltr" style="display:none">');
      // v13.164-matchcard: the mobile card's cells hide under the SAME rule
      html = html.replace('<div class="mc-cells" id="mcCells" role="timer" dir="ltr">', '<div class="mc-cells" id="mcCells" role="timer" dir="ltr" style="display:none">');
      // v13.169-mcv2: a non-upcoming hero shows the match-state chip in the
      // middle countdown box instead of a stale countdown — the status
      // SUPPLIED BY THE MATCH DATA (live green «زنده», «پایان» finished,
      // muted «معلق»/«لغو شده» postponed/canceled); mcStateSet keeps the
      // same rule client-side every render + every tick.
      {
        const st = nextBig ? String(nextBig.s.status || "").toUpperCase() : "";
        let stTxt = "", stCls = "mc-slot mc-state";
        if (/IN_PLAY|LIVE|PAUSED/.test(st)) { stTxt = "زنده"; stCls += " mc-state-live"; }
        else if (st === "FINISHED") { stTxt = "پایان"; }
        else if (/CANCEL/.test(st)) { stTxt = "لغو شده"; stCls += " mc-state-mut"; }
        else if (/POSTPON|SUSPEND/.test(st)) { stTxt = "معلق"; stCls += " mc-state-mut"; }
        if (stTxt && mheroHtml) {
          html = html.replace(
            '<div class="mc-slot mc-state" id="mcState" style="display:none" aria-hidden="true"></div>',
            '<div class="' + stCls + '" id="mcState" aria-hidden="true">' + esc(stTxt) + "</div>");
        }
      }
      html = html.replace(/__SEO_HC[DHMS]__/g, "--").replace("__SEO_HCPCT__", "0").replace(/__SEO_MC[DHM]__/g, "--");
    }
  }

  return html;
}

// ------------------------------------------------------------ edge cache + ETag (PF-01/R-12)

// ETag/304 handling for HTML (R-12).
function withEtag(req: Request, body: string, headers: Record<string, string>): Response {
  const tag = '"ss-' + fnv1aHex(body) + '"';
  const h = Object.assign({}, headers, { etag: tag });
  // G-06: Last-Modified rides along when the data epoch is known via the
  // body's generator note (set by the page builders below).
  const gen = /data-ss-generated="([^"]+)"/.exec(body);
  if (gen) {
    const t = Date.parse(gen[1]);
    if (!isNaN(t)) h["last-modified"] = new Date(t).toUTCString();
  }
  const inm = req.headers.get("if-none-match");
  if (inm && inm.trim() === tag) {
    return new Response(null, { status: 304, headers: h });
  }
  return new Response(body, { status: 200, headers: h });
}
const HEX = "0123456789abcdef";
function fnv1aHex(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let out = "";
  for (let i = 28; i >= 0; i -= 4) out += HEX[(h >>> i) & 0xf];
  return out + str.length.toString(16);
}

// ------------------------------------------------------------ the router

// Legacy single-segment GET actions + /healthz: served by the legacy
// POST_GATE_ROUTES flow — the SEO router must not shadow them (the /teams
// debug action IS shadowed on purpose; the admin UI never calls it).
const LEGACY_PASSTHROUGH = new Set([
  "/healthz", "/clear-notifications", "/clear-locks", "/trigger", "/simple-test",
  "/send-tables", "/next-matches", "/debug-notifications", "/health"
]);

const PUBLIC_FILE_ROUTES = new Set([
  "/robots.txt", "/sitemap.xml", "/calendar.ics", "/feed.xml", "/api/matches.json",
  "/llms.txt", "/.well-known/security.txt"
]);

export async function handleSeoRequest(req: Request, env: Env, ctx: any, url: URL): Promise<Response | null> {
  const host = (url.hostname || "").toLowerCase();
  const path = url.pathname;
  const isProd = SEO.PRODUCTION_HOSTS.includes(host);

  // ---------- R-06: single canonical origin ----------
  // football.sportsignal.ir → apex (EXCEPT the bot's webhook + api + admin
  // paths — the Telegram webhook POST must never be redirected).
  if (host === "football.sportsignal.ir" && !SEO.NO_REDIRECT_PREFIXES.some((p) => path === p || path.startsWith(p))) {
    return redirect("https://sportsignal.ir" + path + (url.search || ""));
  }
  // www.sportsignal.ir → apex (R-06/D-08). The www hostname is attached to
  // this worker as a custom domain ONLY so it answers with a 301 — every
  // path, every method. Nothing was ever served on www (it was NXDOMAIN
  // before), so no webhook/API integration can break.
  if (host === "www.sportsignal.ir") {
    return redirect("https://sportsignal.ir" + path + (url.search || ""));
  }
  // http → https (production hosts only; local dev keeps http).
  if (url.protocol === "http:" && isProd) {
    return redirect("https://" + host + path + (url.search || ""));
  }

  // ---------- R-08: path normalization (public paths only) ----------
  const isBotPath = SEO.NO_REDIRECT_PREFIXES.some((p) => path === p || path.startsWith(p));
  // B-01: Bing's site-auth file must stay at its EXACT mixed-case URL —
  // Bing fetches /BingSiteAuth.xml verbatim and needs a direct 200 (a 301
  // to the lowercased path can fail verification). Static Assets normally
  // serves it before this worker runs; this exemption keeps the code
  // path (below) safe too.
  const isBingAuth = path === "/" + SEO.BING_AUTH_FILE;
  if (!isBotPath && !isBingAuth) {
    if (path === "/public") return redirect("https://sportsignal.ir/");
    if (path !== "/" && path.endsWith("/")) {
      return redirect("https://sportsignal.ir" + path.replace(/\/+$/, "") + (url.search || ""));
    }
    const lower = path.toLowerCase();
    if (lower !== path) {
      return redirect("https://sportsignal.ir" + lower + (url.search || ""));
    }
  }

  const method = req.method;
  if (method !== "GET" && method !== "HEAD") {
    // Non-GET on unknown public paths: fall through to the legacy 405 tail
    // (the webhook/admin/api POSTs are handled before this router).
    if (!PUBLIC_FILE_ROUTES.has(path)) return null;
  }

  // Guard: the SEO router NEVER touches bot/admin infrastructure paths —
  // /webhook (Telegram), /api/* (the card route, public-matches is handled
  // earlier, bot APIs) and /admin* must reach the legacy flow untouched.
  // Only /api/matches.json (below) is ours.
  if (path === "/webhook" || path.startsWith("/admin")) return null;
  if (path.startsWith("/api/") && path !== "/api/matches.json") return null;
  // Legacy GET actions + /healthz (POST_GATE_ROUTES entries) stay with the
  // legacy flow. NOTE: the legacy /teams debug action is intentionally
  // shadowed by the public /teams page (the admin UI never fetches it —
  // documented in the SEO report).
  if (LEGACY_PASSTHROUGH.has(path) || url.searchParams.has("action")) return null;

  // ---------- machine files (no data needed for robots/llms/security) ----------
  if (path === "/robots.txt") {
    return new Response(F.robotsTxt(), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=3600",
        ...(isProd ? {} : { "x-robots-tag": "noindex, nofollow" })
      }
    });
  }
  if (path === "/llms.txt") {
    return new Response(F.buildLlmsTxt(), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
  }
  if (path === "/.well-known/security.txt") {
    return new Response(F.buildSecurityTxt(), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
  }
  // Bing site-auth file (B-01) — code-side fallback serving the SAME bytes
  // as the Static-Assets file that normally wins (exempted from R-08 above).
  if (isBingAuth) {
    return new Response(F.buildBingSiteAuth(), {
      headers: {
        "content-type": "text/xml; charset=utf-8",
        "cache-control": "public, max-age=86400",
        ...(isProd ? {} : { "x-robots-tag": "noindex, nofollow" })
      }
    });
  }
  // IndexNow key file (F-16): served from code — always 200.
  if (path === "/" + SEO.INDEXNOW_KEY + ".txt") {
    return new Response(SEO.INDEXNOW_KEY, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" } });
  }

  const wantCached = async (key: string, ttl: number | (() => number), render: () => Promise<Response>): Promise<Response> => {
    let cacheKey: Request | null = null;
    try {
      cacheKey = new Request("https://edge-internal.sportsignal.ir" + key);
      const hit = await caches.default.match(cacheKey);
      if (hit) {
        // v13.97-seocpu: the stored copy carries the long render-hold TTL in
        // s-maxage plus the original public cache-control in x-ss-cc — restore
        // the public header before serving so edge/browser freshness
        // semantics never leak (PF-01 stays: max-age=0 + s-maxage=60).
        const h = new Headers(hit.headers);
        const orig = h.get("x-ss-cc");
        if (orig != null) {
          h.set("cache-control", orig);
          h.delete("x-ss-cc");
        }
        return new Response(hit.body, { status: hit.status, headers: h });
      }
    } catch (e) { cacheKey = null; }
    const res = await render();
    // v13.97-seocpu: the ttl is now REAL — caches.default.put derives its
    // TTL from the stored response's cache-control, so the copy we put
    // carries the intended hold (a plain put would inherit s-maxage=60 and
    // re-render the page every minute per colo).
    const holdTtl = typeof ttl === "function" ? ttl() : ttl;
    if (cacheKey && res.status === 200 && holdTtl > 0) {
      try {
        const store = res.clone();
        const h = new Headers(store.headers);
        h.set("x-ss-cc", h.get("cache-control") || "public, max-age=0");
        h.set("cache-control", "public, s-maxage=" + Math.max(60, Math.floor(holdTtl)));
        ctx.waitUntil(caches.default.put(cacheKey, new Response(store.body, { status: store.status, headers: h })));
      } catch (e) { }
    }
    return res;
  };

  if (path === "/sitemap.xml") {
    return wantCached("/sitemap.xml", SEO.SITEMAP_CACHE_TTL, async () => {
      const xml = await F.buildSitemapIndex(env);
      return new Response(xml, { headers: F.sitemapHeaders(SEO.SITEMAP_CACHE_TTL) });
    });
  }
  const smMatch = /^\/sitemaps\/([a-z-]+)\.xml$/.exec(path);
  if (smMatch) {
    const kind = smMatch[1];
    const allowed = ["pages", "competitions", "teams", "matches-upcoming", "matches-archive"];
    if (!allowed.includes(kind)) return notFoundResponse(req, ctx, isProd);
    return wantCached("/sitemaps/" + kind + ".xml", SEO.SITEMAP_CACHE_TTL, async () => {
      const { xml, changedUrls } = await F.buildSitemap(env, kind);
      // F-16/T-11: ping IndexNow for URLs whose content changed.
      if (changedUrls.length) ctx.waitUntil(pingIndexNowIfChanged(env, changedUrls).catch(() => { }));
      return new Response(xml, { headers: F.sitemapHeaders(SEO.SITEMAP_CACHE_TTL) });
    });
  }
  if (path === "/calendar.ics") {
    return wantCached("/calendar.ics", SEO.HTML_CACHE_TTL, async () => {
      const ics = await F.buildCalendar(env);
      return new Response(ics, { headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "public, max-age=300" } });
    });
  }
  if (path === "/feed.xml") {
    return wantCached("/feed.xml", SEO.HTML_CACHE_TTL, async () => {
      const xml = await F.buildFeed(env);
      return new Response(xml, { headers: { "content-type": "application/atom+xml; charset=utf-8", "cache-control": "public, max-age=300" } });
    });
  }
  if (path === "/api/matches.json") {
    return wantCached("/api/matches.json", 300, async () => {
      const json = await F.buildMatchesJson(env);
      return new Response(json, {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "public, max-age=60, s-maxage=300",
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, OPTIONS",
          "x-content-type-options": "nosniff"
        }
      });
    });
  }

  // Per-match OG image (SO-04): /og/match-{slug}.png (text-only, no crests).
  const ogMatch = /^\/og\/match-([a-z0-9-]+(?:-vs-[a-z0-9-]+-\d{4}-\d{2}-\d{2})?)\.png$/.exec(path);
  if (ogMatch) {
    const slug = ogMatch[1];
    const png = await F.buildMatchOgPng(env, slug).catch(() => null);
    if (!png) return new Response("og image unavailable", { status: 404, headers: { "content-type": "text/plain" } });
    return new Response(png, {
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=3600",
        "access-control-allow-origin": "*"
      }
    });
  }

  // ---------- HTML pages ----------
  // v13.97-seocpu: per-colo render hold, decided per render (the page knows
  // its own liveness). Default 15 min; live/upcoming match pages, live
  // listings and the homepage hold shorter (a running score must not
  // freeze). Public edge freshness is unchanged — only the render cadence.
  const pageHold = { v: SEO.SEO_PAGE_TTL };
  const renderPage = async (): Promise<{ body: string; status: number } | null> => {
    pageHold.v = SEO.SEO_PAGE_TTL;
    const seoCtx = await getSeoCtx(env);
    if (path === "/") {
      // the landing page stays the freshest surface (the hero may be live).
      pageHold.v = Math.min(pageHold.v, 300);
      return { body: await buildHomePage(seoCtx, isProd), status: 200 };
    }
    if (path === "/matches") {
      const page = Math.max(1, parseInt(url.searchParams.get("page") || "1") || 1);
      // the listing can carry today's live rows — keep a live listing fresh.
      if (seoCtx.pool.some((x: any) => x && /IN_PLAY|LIVE|PAUSED/i.test(String(x.status || "")))) pageHold.v = Math.min(pageHold.v, 300);
      return { body: buildMatchesPage(seoCtx, page), status: 200 };
    }
    if (path === "/matches/today") {
      if (seoCtx.pool.some((x: any) => x && /IN_PLAY|LIVE|PAUSED/i.test(String(x.status || "")))) pageHold.v = Math.min(pageHold.v, 300);
      return { body: buildTodayPage(seoCtx), status: 200 };
    }
    if (path === "/matches/tomorrow") return { body: buildTomorrowPage(seoCtx), status: 200 };
    if (path === "/matches/this-week") return { body: buildThisWeekPage(seoCtx), status: 200 };
    if (path === "/matches/this-weekend") return { body: buildWeekendPage(seoCtx), status: 200 };
    const mm = /^\/matches\/([a-z0-9-]+)$/.exec(path);
    if (mm) {
      // v13.82-matchday: async — the render may hydrate the venue (one
      // KV-cached FD detail call on first visit per match; fail-closed).
      const r = await buildMatchPage(seoCtx, mm[1]);
      if (r.notFound) return null;
      // v13.97-seocpu: live → short hold (the score moves every minute);
      // upcoming → the hold lapses just after kickoff (the next hit re-renders
      // into the live branch); finished → the full window (history is
      // immutable).
      const sm = findMatchBySlug(seoCtx, mm[1]);
      const st = sm ? String(sm.raw.status || "").toUpperCase() : "";
      if (/IN_PLAY|LIVE|PAUSED/.test(st)) pageHold.v = SEO.LIVE_PAGE_TTL;
      else if (sm && sm.raw.utcDate) {
        const secs = Math.ceil((new Date(sm.raw.utcDate).getTime() - Date.now()) / 1000);
        pageHold.v = Math.max(60, Math.min(SEO.SEO_PAGE_TTL, secs + 120));
      }
      return { body: r.html, status: 200 };
    }
    if (path === "/teams") return { body: buildTeamsIndexPage(seoCtx), status: 200 };
    const tm = /^\/teams\/([a-z0-9-]+)$/.exec(path);
    if (tm) {
      // v13.88-formagg: async — the team form card loads the seo archive
      // (one bounded KV read, fail-closed) before rendering.
      const r = await buildTeamPage(seoCtx, tm[1]);
      if (r.notFound) return null;
      return { body: r.html, status: 200 };
    }
    if (path === "/competitions") return { body: buildCompetitionsIndexPage(seoCtx), status: 200 };
    const cm = /^\/competitions\/([a-z0-9-]+)$/.exec(path);
    if (cm) {
      // v13.89-stdetail: async — the full standings table reads the
      // cache-only KV copy (one bounded read, fail-closed to compact).
      const r = await buildCompetitionPage(seoCtx, cm[1]);
      if (r.notFound) return null;
      return { body: r.html, status: 200 };
    }
    if (path === "/about") return { body: buildAboutPage(seoCtx), status: 200 };
    if (path === "/methodology") return { body: buildMethodologyPage(seoCtx), status: 200 };
    if (path === "/contact") return { body: buildContactPage(seoCtx), status: 200 };
    if (path === "/privacy") return { body: buildPrivacyPage(seoCtx), status: 200 };
    if (path === "/terms") return { body: buildTermsPage(seoCtx), status: 200 };
    if (path === "/data") return { body: buildDataPage(seoCtx), status: 200 };
    if (path === "/sitemap") return { body: buildHumanSitemapPage(seoCtx), status: 200 };
    return null;
  };

  // Static-file requests (fonts/css/js/imgs) never reach here (Workers
  // Static Assets serves them first); everything else is ours:
  const isHtmlish = !/\.(svg|png|jpg|jpeg|gif|webp|ico|mp4|woff2?|ttf|map|txt|xml|json|js|css)$/i.test(path) || path === "/" || /^\/(matches|teams|competitions|about|methodology|contact|privacy|terms|data|sitemap)/.test(path);
  if (!isHtmlish) return null; // let unknown extensions fall to the legacy flow (405/404)

  // v13.97-seocpu: scanner garbage must not pay the full 404 render. The
  // live tail caught vulnerability probes (/bin/.env, /node/.env, /.git/…)
  // dying to `Exceeded CPU Limit` — every one paid getSeoCtx (5 KV reads
  // + the 700-match map) to build a pretty 404, and 404s are never cached
  // so every probe re-rendered. Only the KNOWN route families reach the
  // expensive flow now; everything else gets the static cheap 404 (T-06
  // semantics preserved: 404 + link home + noindex).
  if (!/^\/($|matches(\/[a-z0-9-]*)?$|teams(\/[a-z0-9-]*)?$|competitions(\/[a-z0-9-]*)?$|about$|methodology$|contact$|privacy$|terms$|data$|sitemap$)/.test(path)) {
    return new Response("<!doctype html><html lang=\"fa\" dir=\"rtl\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex, nofollow\"><title>صفحه پیدا نشد | SportSignal</title></head><body style=\"font-family:system-ui,-apple-system,sans-serif;background:#0b1220;color:#e2e8f0;text-align:center;padding:3rem 1rem\"><h1 style=\"font-size:1.5rem\">صفحه پیدا نشد</h1><p style=\"margin-top:1rem\"><a href=\"/\" style=\"color:#f59e0b\">بازگشت به خانه</a></p></body></html>", {
      status: 404,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-robots-tag": "noindex, nofollow",
        "x-content-type-options": "nosniff"
      }
    });
  }

  const key = path + (url.searchParams.get("page") ? "?page=" + url.searchParams.get("page") : "");
  // v13.97-seocpu: the ttl is evaluated AFTER the render (the getter reads
  // what renderPage decided) — cache hits never evaluate it.
  const page = await wantCached("/html" + key, () => pageHold.v, async () => {
    const r = await renderPage();
    if (!r) {
      const seoCtx = await getSeoCtx(env);
      return notFoundResponse(req, seoCtx, isProd);
    }
    return withEtag(req, r.body, htmlHeaders(!isProd));
  });
  return page;
}

function notFoundResponse(req: Request, seoCtx: SeoCtx, isProd: boolean): Response {
  let body: string;
  try {
    body = build404Page(seoCtx);
  } catch (e) {
    body = "<!doctype html><html lang=\"fa\" dir=\"rtl\"><meta charset=\"utf-8\"><title>صفحه پیدا نشد | SportSignal</title><body><h1>صفحه پیدا نشد</h1><p><a href=\"/\">بازگشت به خانه</a></p></body></html>";
  }
  return new Response(body, {
    status: 404,
    headers: htmlHeaders(!isProd, { "x-robots-tag": "noindex, nofollow" })
  });
}
