// SportSignal — SEO layer configuration (Phase 1+ of the SEO/GEO spec).
// All SEO constants in ONE place: hosts, slugs, toggles, file paths.
// Nothing here invents match data — it only describes the site itself.

export const SEO = {
  // Canonical origin (spec config block). No www. www + http 301 here.
  SITE_URL: "https://sportsignal.ir",
  CANONICAL_HOST: "sportsignal.ir",
  // Hosts that count as production (the worker answers on both custom
  // domains; football.* also hosts the Telegram webhook so it must keep
  // serving /webhook + /api/* without a redirect).
  PRODUCTION_HOSTS: ["sportsignal.ir", "football.sportsignal.ir"],
  // The Telegram webhook host — never redirect these paths (POSTs must land).
  NO_REDIRECT_PREFIXES: ["/webhook", "/api/", "/admin"],
  SITE_NAME: "SportSignal",
  SITE_NAME_FA: "اسپورت‌سیگنال",
  BRAND: "SportSignal",
  // From the existing homepage (SEO_AUDIT assumption #3).
  SITE_TAGLINE: "مسابقات پیش‌رو، رقابت‌های صدر جدول و نتایج تیم‌های منتخب — به‌روزرسانی خودکار",
  PRIMARY_LANGUAGE: "fa",
  TEXT_DIRECTION: "rtl",
  OG_LOCALE: "fa_IR",
  DISPLAY_TZ: "Asia/Tehran",
  DISPLAY_TZ_LABEL: "به وقت تهران",
  // Spec: never store local times; markup is always Gregorian ISO 8601 UTC.
  THEME_COLOR: "#0f172a",
  LOGO_PATH: "/android-chrome-512x512.png",
  OG_DEFAULT_IMAGE: "/og/default.png",
  DATA_SOURCE_NAME: "football-data.org",
  DATA_SOURCE_URL: "https://www.football-data.org/",
  // SS-04 (Phase-2 spec): the Organization node's sameAs — real, owned, live
  // profiles ONLY (rule §1.1: never invented). The Telegram bot was the
  // founding entry; v13.225-socialsec (SS-26, S9 2026-11-06) appends the
  // owner-supplied X profile — x.com/sportsignalz, display name
  // «اسپرت سیگنال», verified live 2026-11-05 21:33 UTC via the profile-page
  // title fetch. Future profiles keep appending here without touching
  // jsonld.ts.
  ORG_SAMEAS: ["https://t.me/SportSignalAlertsBot", "https://x.com/sportsignalz"],
  // SS-26 (v13.225-socialsec): the twitter:site handle — the same verified
  // X profile as ORG_SAMEAS[1]. page-shell emits the meta when set; the
  // homepage template hardcodes it (the og:site_name precedent).
  TWITTER_SITE: "@sportsignalz",
  // Bot policy toggles (spec Section 0 — all true by owner's spec).
  ALLOW_AI_SEARCH_BOTS: true,
  ALLOW_AI_USER_BOTS: true,
  ALLOW_AI_TRAINING_BOTS: true,
  INDEXNOW_ENABLED: true,
  // Public IndexNow key (served at /{key}.txt — it is not a secret).
  INDEXNOW_KEY: "6f1c2ab9d84e53a7c0b5e2f8a3d6c4b1",
  INDEXNOW_ENDPOINT: "https://api.indexnow.org/indexnow",
  // Bing Webmaster Tools XML site-auth (ownership verification, B-01). Bing
  // fetches /BingSiteAuth.xml VERBATIM (mixed case — must answer 200, never
  // a 301 to the lowercased path). Primary serving path is the Static
  // Assets file (assets/BingSiteAuth.xml — served before this worker);
  // files.ts + router.ts keep a code-side fallback with the same bytes,
  // exempted from the R-08 lowercase redirect. Keep the two copies in sync
  // when rotating the key.
  BING_AUTH_FILE: "BingSiteAuth.xml",
  BING_AUTH_KEY: "231A90C90F293E3FAAD90B3CB81009F1",
  // Match lifecycle policy (spec).
  FINISHED_MATCH_ARCHIVE_DAYS: 365,
  MIN_UPCOMING_FOR_INDEX: 1,
  // Honest lastmod for hand-written pages: bumped ONLY when their content
  // is actually edited (spec F-05 — never "now on every build").
  // v13.215-attribution (SS-08): every page footer gained the data-source
  // attribution line — hand-written page text changed on all page types.
  // v13.217-llmsfull (SS-07): the /data page gained the llms-full.txt
  // entry in its machine-files list — that page's text changed.
  // v13.219-faq (SS-06): /about + /methodology + /data gained their FAQ
  // blocks and the four time hubs gained the dynamic FAQ — hand-written
  // page text changed (the FAQ answers themselves ride the live data).
  // v13.225-socialsec (SS-26, S9): every page footer gained the social line
  // (the X + Telegram profiles) and the head gained twitter:site —
  // hand-written footer text changed on all page types (the v13.215
  // attribution precedent: footer text rides the pages' honest lastmod).
  CONTENT_VERSION: "2026-11-06T21:50:00Z",
  // Edge cache for rendered HTML (R-04: at least every 5 minutes).
  HTML_CACHE_TTL: 300,
  // v13.97-seocpu: the per-colo RENDER hold — the Cache API copy's TTL.
  // Public edge freshness stays s-maxage=60 (PF-01 unchanged: browsers
  // always revalidate, the edge refreshes every minute); only the RENDER
  // cadence stretches. The old code passed a ttl to wantCached that never
  // reached the cache (caches.default.put honors the RESPONSE headers, and
  // s-maxage=60 made every colo re-render every page EVERY minute — the
  // cold-render CPU-kill class observed live on the fresh zone, 2026-10-14:
  // GET /teams/villarreal Exceeded CPU Limit).
  SEO_PAGE_TTL: 900,
  // v13.97-seocpu: live surfaces hold their render briefly so a running
  // score never freezes on a match page.
  LIVE_PAGE_TTL: 120,
  // Sitemap edge cache.
  SITEMAP_CACHE_TTL: 600,
  // KV: per-URL honest lastmod map (F-05/G-06).
  KV_SEO_LASTMOD: "seo_lastmod_v1",
  KV_SEO_INDEXNOW: "seo_indexnow_v1"
};

// v13.80-canonical-hrefs: COMP_SLUGS/TEAM_SLUGS/compSlug/teamSlug/matchPath
// MOVED to src/slugs.ts (a root leaf the eval harness orders before its
// consumers) so pubMatch — the payload shaper — can stamp the canonical
// `path` on every match row. The client used to guess hrefs with its own
// slugifier (no TEAM_SLUGS) and produced 404 links; now it reads the path.

// Full public URL builders (always absolute https + canonical host).
export function absUrl(path: string): string {
  if (!path) path = "/";
  if (path.startsWith("http")) return path;
  return SEO.SITE_URL + (path.startsWith("/") ? path : "/" + path);
}
