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
  SITE_NAME_FA: "اسپرت سیگنال",
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
  CONTENT_VERSION: "2026-11-06T23:00:00Z",
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
  // v13.259.1-archttl: ARCHIVED finished-match pages (served from the
  // immutable seo_archive_v1, >7d past kickoff) hold their render for 6h —
  // history cannot change, and the free-plan 10ms CPU cliff (the chronic
  // cold-render kill class — 37 exceededResources in the 3h BEFORE the
  // 13.259 deploy, 789 on Nov 10) makes every re-render a crash lottery.
  // 6h = 24x fewer renders than the 900s window, operationally forgiving.
  ARCHIVE_PAGE_TTL: 21600,
  // Sitemap edge cache.
  SITEMAP_CACHE_TTL: 600,
  // KV: per-URL honest lastmod map (F-05/G-06).
  KV_SEO_LASTMOD: "seo_lastmod_v1",
  KV_SEO_INDEXNOW: "seo_indexnow_v1",
  // ---- Match-URL lifecycle (SEO Session 5 — MATCH-LIFECYCLE-POLICY.md) ----
  // The season-end noindex transition is an owner-approved mechanism: the
  // MECHANISM ships (the predicate + the buildHead wiring + the sitemap
  // filter + the transition test), but NO real page transitions until BOTH
  // this flag is true AND the competition's end date is in the map below.
  // Default false = the live site is byte-identical to the Session 4 close.
  // See MATCH-LIFECYCLE-POLICY.md §7 (the owner-approval point).
  SEASON_END_NOINDEX_ENABLED: false,
  // Competition season-end dates (ISO) — the season-boundary source of truth.
  // Populated from the football-data.org v4 `season.endDate` field (the same
  // field composers.ts:286 reads for pre-season detection). Starts EMPTY —
  // the owner confirms the dates against a fresh FD standings fetch before
  // enabling. A code not in the map = season considered still open
  // (conservative default). Reference dates recorded in
  // MATCH-LIFECYCLE-POLICY.md §3 (NOT baked into code — do not invent dates).
  SEASON_END_DATES: {} as Record<string, string>,
  // Marquee-match slug override (M5 — demonstrated GSC demand). Seeded from
  // the 2026-11-15 GSC export: every match-detail URL with >=1 click (51
  // slugs, 190 clicks total — the evidenced demand surface). Conservative:
  // retains MORE, not fewer. A fresh 16-month GSC export would refine this
  // set (MATCH-LIFECYCLE-POLICY.md §4 M5). A slug in this set stays
  // indexable through season-end regardless of the structural marquee
  // signals (selected-club / s.big / QF+ / derby).
  MARQUEE_MATCH_SLUGS: new Set([
    "barcelona-vs-manchester-city-2026-12-08",
    "paris-saint-germain-vs-barcelona-2026-10-20",
    "real-madrid-vs-rb-leipzig-2026-10-21",
    "barcelona-vs-aston-villa-2026-11-03",
    "bologna-vs-monza-2026-10-31",
    "real-racing-club-de-santander-vs-real-madrid-2026-11-01",
    "venezia-vs-internazionale-milano-2026-10-28",
    "sabah-vs-barcelona-2026-11-25",
    "lorient-vs-stade-brestois-29-2026-10-31",
    "getafe-vs-rayo-vallecano-de-madrid-2026-10-19",
    "bayern-munich-vs-arsenal-2026-10-21",
    "barcelona-vs-villarreal-2026-11-22",
    "valencia-vs-real-madrid-2026-11-07",
    "paris-saint-germain-vs-roma-2026-11-25",
    "ogc-nice-vs-stade-rennais-2026-10-30",
    "manchester-united-vs-roma-2026-11-03",
    "manchester-city-vs-ssc-napoli-2026-11-24",
    "crvena-zvezda-vs-inter-club-d-escaldes-2026-11-05",
    "como-vs-venezia-2026-11-01",
    "atalanta-vs-kairat-almaty-2026-11-05",
    "arsenal-vs-real-madrid-2026-12-09",
    "villarreal-vs-sabah-2026-12-08",
    "tsg-hoffenheim-vs-schalke-04-2026-11-08",
    "sunderland-vs-chelsea-2026-11-08",
    "ssc-napoli-vs-roma-2026-10-24",
    "sporting-clube-de-portugal-vs-manchester-united-2026-11-25",
    "slavia-praha-vs-arsenal-2026-11-04",
    "shakhtar-donetsk-vs-fenerbahce-2026-11-25",
    "real-madrid-vs-psv-2026-11-24",
    "porto-vs-psv-2026-10-20",
    "paris-saint-germain-vs-es-troyes-2026-11-07",
    "paderborn-07-vs-eintracht-frankfurt-2026-11-07",
    "olympique-lyonnais-vs-ogc-nice-2026-10-18",
    "newcastle-united-vs-manchester-united-2026-12-02",
    "monaco-vs-nordsjaelland-2026-11-05",
    "lech-poznan-vs-sunderland-2026-10-22",
    "le-havre-vs-paris-saint-germain-2026-10-30",
    "lazio-vs-cagliari-2026-11-01",
    "lask-linz-vs-slovan-bratislava-2026-11-03",
    "koln-vs-1-union-berlin-2026-10-27",
    "internazionale-milano-vs-shakhtar-donetsk-2026-10-21",
    "hamburger-sv-vs-vfb-stuttgart-2026-10-17",
    "galatasaray-vs-aston-villa-2026-11-24",
    "como-vs-manchester-united-2026-10-21",
    "borussia-dortmund-vs-real-betis-balompie-2026-11-04",
    "athletic-club-vs-real-madrid-2026-12-06",
    "arsenal-vs-manchester-united-2026-12-19",
    "arsenal-vs-hull-city-2026-11-07",
    "acf-fiorentina-vs-juventus-2026-11-08",
    "ac-milan-vs-bologna-2026-10-28",
    "1-fsv-mainz-05-vs-bayern-munich-2026-11-07"
  ])
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
