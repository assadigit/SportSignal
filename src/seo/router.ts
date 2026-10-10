// SportSignal — the SEO request router (Phase 1..8). Handles every public
// page + machine file, host/path normalization (R-06/R-08), environment
// safety (R-13), edge caching + ETag (PF-01/R-12), the custom 404 (R-10/
// R-11) and IndexNow pings on data change (F-16/T-11). Returns null for
// non-SEO paths so the existing api.ts flow (webhook, admin, bot APIs)
// is untouched.

import type { Env } from "../types";
import { SEO, absUrl } from "./config";
import { fnv1a, esc } from "./utils";
import { getSeoCtx, upcomingBig, finishedRecent, type SeoCtx, type SeoMatch } from "./data";
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
function payloadSig(p: any): string {
  const strip = (list: any) => (Array.isArray(list) ? list.map(clientKeyOf).join(";") : "");
  const core = {
    u: strip(p.upcoming), f: strip(p.finished), nb: clientKeyOf(p.nextBig),
    ts: strip(p.topSpot && p.topSpot.matches), tw: strip(p.thisWeek), nw: strip(p.nextWeek),
    st: p.standings ? Object.keys(p.standings).map((k) => k + ":" + strip(p.standings[k] && p.standings[k].teams && p.standings[k].teams.map((t: any) => t.name + t.points))).join("|") : "",
    c: strip(p.cups && p.cups.map((c: any) => c && c.next)), ucl: p.ucl ? String(p.ucl.matchday) + strip(p.ucl.matches) + strip(p.ucl.teams && p.ucl.teams.map((t: any) => t && t.name)) : ""
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
  const nextBig = (asSm(p.nextBig) || upcoming[0] || null) as SeoMatch | null;
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
  const heroHtml = nextBig ? M.spotItemHtml(nextBig, 0, { noDate: true }) : "";
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
    .replace(/<body>/, '<body><script>window.__SS_SIG__=' + JSON.stringify(sig) + ";</script>")
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
    .replace("__SEO_SYNC__", syncHtml)
    .replace("__SEO_HERO__", heroHtml)
    .replace("__SEO_LIVE__", liveHtml || (live.length ? "" : '<span class="sr-only">در حال حاضر بازی زنده‌ای در برنامه نیست.</span>'))
    .replace("__SEO_TOPSPOT__", topspotHtml)
    .replace("__SEO_UCLSPOT__", uclspotHtml)
    .replace("__SEO_WEEK__", weekHtml)
    .replace("__SEO_UCL__", uclTableHtml)
    .replace("__SEO_STANDINGS__", standingsHtml)
    .replace("__SEO_CUPS__", cupsHtml)
    .replace("__SEO_FINISHED__", finishedHtml);

  // h1 styling for the injected hero heading (small inline block — kept
  // here so the shared stylesheet stays untouched).
  html = html.replace("</style>",
    ".hero-h1{font-size:1.05rem;font-weight:800;margin:2px 0 6px;line-height:1.7}.skip-link{position:absolute;inset-inline-start:-9999px}.skip-link:focus{inset-inline-start:8px;top:8px;z-index:99;background:#0f172a;color:#fff;padding:8px 14px;border-radius:8px}a.match{color:inherit;text-decoration:none}a.match:hover .team{opacity:.85}a.match:focus-visible{outline:2px solid #5ea0ff;border-radius:8px}</style>");

  // The ONE visible <h1> (P-12) rides above the hero content; a short
  // sr-only page summary follows it (A-04/A-01). The client JS leaves this
  // node alone (it lives outside every container the JS re-renders).
  html = html.replace('<div id="heroSpot">',
    '<h1 class="hero-h1">' + esc(heroH1(nextBig)) + "</h1>\n" +
    '<p class="sr-only">در این صفحه: بازی بزرگ بعدی، بازی‌های زنده، بازی‌های مهم پیش‌رو، جدول لیگ‌ها و نتایج اخیر — همه به وقت تهران.</p>\n<div id="heroSpot">');

  // Cards hidden by default must SHOW their server content for no-JS
  // visitors; the client JS re-manages display on load (same rules).
  if (heroHtml) html = html.replace('<div class="card bighero" id="bigHeroCard" style="display:none">', '<div class="card bighero" id="bigHeroCard">');
  if (liveHtml) html = html.replace('<div class="card" id="liveCard" style="display:none">', '<div class="card" id="liveCard">');
  if (topspotHtml) html = html.replace('<div class="card" id="topspotCard" style="display:none">', '<div class="card" id="topspotCard">');
  if (weekHtml) html = html.replace('<div class="card" id="weekCard" style="display:none">', '<div class="card" id="weekCard">');

  return html;
}

// ------------------------------------------------------------ edge cache + ETag (PF-01/R-12)

// ETag/304 handling for HTML (R-12).
function withEtag(req: Request, body: string, headers: Record<string, string>): Response {
  const tag = '"ss-' + fnv1aHex(body) + '"';
  const h = Object.assign({}, headers, { etag: tag });
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
  // http → https (production hosts only; local dev keeps http).
  if (url.protocol === "http:" && isProd) {
    return redirect("https://" + host + path + (url.search || ""));
  }

  // ---------- R-08: path normalization (public paths only) ----------
  const isBotPath = SEO.NO_REDIRECT_PREFIXES.some((p) => path === p || path.startsWith(p));
  if (!isBotPath) {
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
  // IndexNow key file (F-16): served from code — always 200.
  if (path === "/" + SEO.INDEXNOW_KEY + ".txt") {
    return new Response(SEO.INDEXNOW_KEY, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" } });
  }

  const wantCached = async (key: string, ttl: number, render: () => Promise<Response>): Promise<Response> => {
    let cacheKey: Request | null = null;
    try {
      cacheKey = new Request("https://edge-internal.sportsignal.ir" + key);
      const hit = await caches.default.match(cacheKey);
      if (hit) return hit;
    } catch (e) { cacheKey = null; }
    const res = await render();
    if (cacheKey && res.status === 200) {
      try { ctx.waitUntil(caches.default.put(cacheKey, res.clone())); } catch (e) { }
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
  const renderPage = async (): Promise<{ body: string; status: number } | null> => {
    const seoCtx = await getSeoCtx(env);
    if (path === "/" ) return { body: await buildHomePage(seoCtx, isProd), status: 200 };
    if (path === "/matches") {
      const page = Math.max(1, parseInt(url.searchParams.get("page") || "1") || 1);
      return { body: buildMatchesPage(seoCtx, page), status: 200 };
    }
    if (path === "/matches/today") return { body: buildTodayPage(seoCtx), status: 200 };
    if (path === "/matches/tomorrow") return { body: buildTomorrowPage(seoCtx), status: 200 };
    if (path === "/matches/this-week") return { body: buildThisWeekPage(seoCtx), status: 200 };
    if (path === "/matches/this-weekend") return { body: buildWeekendPage(seoCtx), status: 200 };
    const mm = /^\/matches\/([a-z0-9-]+)$/.exec(path);
    if (mm) {
      const r = buildMatchPage(seoCtx, mm[1]);
      if (r.notFound) return null;
      return { body: r.html, status: 200 };
    }
    if (path === "/teams") return { body: buildTeamsIndexPage(seoCtx), status: 200 };
    const tm = /^\/teams\/([a-z0-9-]+)$/.exec(path);
    if (tm) {
      const r = buildTeamPage(seoCtx, tm[1]);
      if (r.notFound) return null;
      return { body: r.html, status: 200 };
    }
    if (path === "/competitions") return { body: buildCompetitionsIndexPage(seoCtx), status: 200 };
    const cm = /^\/competitions\/([a-z0-9-]+)$/.exec(path);
    if (cm) {
      const r = buildCompetitionPage(seoCtx, cm[1]);
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

  const key = path + (url.searchParams.get("page") ? "?page=" + url.searchParams.get("page") : "");
  const page = await wantCached("/html" + key, SEO.HTML_CACHE_TTL, async () => {
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
