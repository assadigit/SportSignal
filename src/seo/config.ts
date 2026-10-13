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
  CONTENT_VERSION: "2026-10-11T00:00:00Z",
  // Edge cache for rendered HTML (R-04: at least every 5 minutes).
  HTML_CACHE_TTL: 300,
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
