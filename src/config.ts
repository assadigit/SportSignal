// SportSignal — central configuration & static data tables.
// Extracted verbatim from the v12.33-xpost bundle; KV keys and semantics are
// LIVE-STATE contracts — never rename casually.

export const VERSION = "13.33-tsdebt";

export const CONFIG: Record<string, any> = {
  API_URL: "https://api.football-data.org/v4/matches",
  API_RETRY_ATTEMPTS: 2,
  API_RETRY_DELAY: 1e3,
  LEAGUES: ["CL", "PL", "PD", "SA", "FL1", "BL1"],
  // Season-dependent cup phase windows (review/update each August): EL/ECL are
  // in the qualifying phase until their league phase starts (late Sep); the FA
  // Cup's big clubs enter at the First Round Proper (~early Nov). sportscore's
  // fixture list exposes no round field, so cups are classified by calendar.
  CUP_PHASE_WINDOWS: { EURO_LL_START: "2026-09-28T00:00:00Z", FA_ROUND1: "2026-11-09T00:00:00Z" },
  BIG_TEAMS_BY_LEAGUE: {
    "PL": [
      "Arsenal FC",
      "Chelsea FC",
      "Manchester United FC",
      "Manchester City FC",
      "Liverpool FC"
    ],
    "PD": [
      "FC Barcelona",
      "Real Madrid CF",
      "Atl\xE9tico Madrid"
    ],
    "SA": [
      "Inter Milan",
      "AC Milan"
    ],
    "FL1": [
      "Paris Saint-Germain"
    ],
    // v12.15: ONE exact provider name per club. "Bayern Munich" (a
    // pre-12.x variant spelling) duplicated "FC Bayern M\u00FCnchen" in the
    // admin chips — the exact duplicate the user reported. Variant names
    // are now folded onto the catalog name by canonicalizeTeams() instead
    // of being stored side by side.
    "BL1": [
      "FC Bayern M\xFCnchen",
      "Borussia Dortmund"
    ],
    "AL": [
      "Melbourne Victory",
      "Melbourne City",
      "Sydney FC",
      "Adelaide United",
      "Western Sydney Wanderers"
    ],
    "EL": [
      "Arsenal FC",
      "Chelsea FC",
      "Manchester United FC",
      "Manchester City FC",
      "Liverpool FC",
      "FC Barcelona",
      "Real Madrid CF",
      "Atl\xE9tico Madrid",
      "Inter Milan",
      "AC Milan",
      "Paris Saint-Germain"
    ],
    "ECL": [
      "Arsenal FC",
      "Chelsea FC",
      "Manchester United FC",
      "Manchester City FC",
      "Liverpool FC",
      "FC Barcelona",
      "Real Madrid CF",
      "Atl\xE9tico Madrid",
      "Inter Milan",
      "AC Milan",
      "Paris Saint-Germain"
    ]
  },
  DOMESTIC_CUP_IDS: {
    "FA_CUP": 2055,
    // football-data FA Cup (was 2018 = Euro Championship — cups never fetched!)
    "EFL_CUP": 2139,
    // Carabao Cup (Football League Cup)
    "CDR": 2079,
    // Copa del Rey (was 2013 = Brasileirão Série A)
    "COPPA_ITALIA": 2122,
    // Coppa Italia (was 2022 = Austrian Playoffs)
    "DFB_POKAL": 4555
    // DFB Pokal (German Cup)
  },
  // International tournaments (world/continental cups). Fetched near-term only and
  // shown in the app only while in process (a fixture on the horizon). Kept OUT of
  // LEAGUES: national teams never match the followed clubs, so they can't notify.
  INTL_COMPETITIONS: {
    "WC": 2e3,
    // FIFA World Cup
    "EC": 2018,
    // UEFA Euro
    "COPA": 2029,
    // Copa América
    "AFCON": 2088,
    // Africa Cup of Nations
    "AFC": 2092
    // AFC Asian Cup
  },
  LATE_STAGES: [
    "QUARTER_FINALS",
    "QUARTER_FINAL",
    "SEMI_FINALS",
    "SEMI_FINAL",
    "FINAL",
    "THIRD_PLACE"
  ],
  PRIORITY: {
    "CL": 1,
    "EL": 2,
    "ECL": 3,
    "PL": 4,
    "PD": 5,
    "SA": 6,
    "FL1": 7,
    "FA_CUP": 8,
    "EFL_CUP": 9,
    "CDR": 10,
    "COPPA_ITALIA": 11,
    "DEFAULT": 12
  },
  // FIXED: Wider windows to account for cron timing
  PRE_MATCH_NOTIFICATION_HOURS: 24,
  BIG_MATCH_NOTIFICATION_HOURS: 72,
  REMINDER_3_HOURS: 3,
  REMINDER_1_HOUR: 1,
  // Future-plan fix: MATCH_START_WINDOW_MINUTES (45) is REMOVED — it opened
  // the "match started" window 45 minutes BEFORE kickoff, so a 22:30 match
  // was announced as live from 21:45. isMatchStartingNow() now fires only
  // after the real kickoff (see its comment).
  POST_MATCH_NOTIFICATION_HOURS: 6,
  // 24h — cache is used only when ALL providers fail, so staleness is fine and
  // helps the bot survive a weekend API outage without missing matches
  CACHE_STALE_TTL: 86400,
  TELEGRAM_RETRY_ATTEMPTS: 3,
  KV_USERS_KEY: "telegram_users_v6",
  KV_MATCHES_KEY: "matches_v13_tracked",
  KV_NOTIFIED_KEY: "notified_matches_v6",
  KV_SETTINGS_KEY: "bot_settings_v1",
  KV_LAST_SOURCE: "last_api_source",
  KV_STANDINGS_SNAP: "standings_snap_",
  KV_STANDINGS_CACHE: "standings_cache_",
  KV_PUBLIC_MATCHES: "public_matches_v1",
  // v12.x-resilience: long-TTL (7 day) snapshot of the last successful
  // public-matches build. Read ONLY when the live fetch fails (or returns
  // an empty pool) so the page can still render last week's fixtures with
  // a subtle "cached data" indicator instead of empty cards.
  KV_PUBLIC_SNAPSHOT: "cache:snapshot:v1",
  KV_PUBLIC_SNAPSHOT_TTL: 7 * 24 * 60 * 60,
  KV_USER_PREFS: "user_prefs_v1",
  // v12.16: bot-member profiles (telegram username/"slug" + first name + join
  // date), captured from every incoming message and backfilled via getChat
  // when the admin opens the members card. Keyed by chat id.
  KV_USER_PROFILES: "user_profiles_v1",
  KV_MATCH_STATUS: "match_status_v1",
  KV_LIVE_DETAIL: "live_detail_",
  // v12.9: end-of-week league-tables digest. KV_WEEKLY_TABLES stores the ISO
  // week key ("2026-W37") of the last delivered digest; WEEKLY_TABLES is the
  // delivery window — Monday 01:30–06:00 Tehran, i.e. after the LAST European
  // Sunday kickoff wraps (La Liga's late slot ends ~01:20 Tehran) and before
  // the morning — the "end of the week's work" for football.
  KV_WEEKLY_TABLES: "weekly_tables_v1",
  WEEKLY_TABLES: { day: 1, fromMin: 90, toMin: 360 },
  // Fallback API providers (used only when the primary API fails)
  FALLBACK_DAYS_PAST: 1,
  FALLBACK_DAYS_FUTURE: 2,
  KNOWN_LEAGUE_CODES: [
    "CL",
    "PL",
    "PD",
    "SA",
    "FL1",
    "BL1",
    "EL",
    "ECL",
    "FA_CUP",
    "EFL_CUP",
    "CDR",
    "COPPA_ITALIA",
    "DFB_POKAL"
  ],
  // v12.14: club-name autocomplete catalog for the admin panel's "add club"
  // inputs. The roster is pre-downloaded from the SAME providers the matcher
  // uses (football-data /teams + sportscore for the A-League) and cached in
  // KV; /api/clubs serves prefix matches so the panel stores the EXACT API
  // name ("AS Roma", not a guessed "Roma"). Stale after 14 days (rosters
  // move in windows, not daily).
  KV_CLUBS_CATALOG: "clubs_catalog",
  CLUBS_STALE_MS: 12096e5,
  // v12.17: AI-learned Farsi club names (Workers AI, binding "AI" in
  // wrangler.toml). Layer 2 of the translation stack — the static FA_TEAMS
  // dict always wins; names the dict misses (UCL's 36-team table brings clubs
  // from 16+ countries — SK Slavia Praha, Viking FK, PAE AEK…) are learned
  // INCREMENTALLY: one batched AI call for whatever is currently unknown,
  // results validated + stored in KV, then served forever (the user's
  // "translate → store in db → show Farsi next sessions" design). A failed
  // or rejected name cools down FA_AI_FAIL_RETRY_MS before being re-asked;
  // the learner itself runs at most every FA_AI_RUN_EVERY_MS and only when
  // unknown names exist — zero AI calls when everything is translated.
  KV_FA_TEAMS: "fa_teams_ai",
  KV_FA_LAST_RUN: "fa_ai_last_run",
  // v13.13-venues: AI-learned Persian stadium/venue names. Separate KV
  // from fa_teams_ai (stadiums translate differently — "Emirates Stadium" →
  // "امارات"). The AI learner collects unknown venue names from the match
  // pool and translates them in the same batch as team names.
  KV_FA_VENUES: "fa_venues_ai",
  FA_AI_MAX_BATCH: 16,
  FA_AI_RUN_EVERY_MS: 9e5,
  FA_AI_FAIL_RETRY_MS: 432e5,
  // v12.18: varzesh3.com directory (the user's pointer) — canonical Persian
  // club names scraped from varzesh3 league tables by
  // scripts/varzesh3-catalog.js and pushed here via the Cloudflare API. The
  // AI learner uses it as GROUNDING: candidate names ride in the prompt and
  // accepted answers snap to the exact varzesh3 spelling. KV-only read in the
  // worker — zero extra fetches.
  KV_V3_CATALOG: "varzesh3_clubs_v1",
  // ✅ UPDATED: Bumped version after TTL fix
  KV_LAST_CRON: "last_cron_execution",
  KV_HEARTBEAT: "heartbeat",
  KV_EXECUTION_LOCK: "execution_lock",
  LOCK_TIMEOUT: 24e4,
  // v13.9-reliability: dependability infrastructure KV keys (all v1, additive).
  // #3 Dead-letter outbox for Telegram sends that exhausted their 3 retries
  // (Telegram 5xx/429/network). Drained at the start of every cron sweep
  // with exponential backoff. A message here is NEVER lost — retried until
  // success or the chat is dead.
  KV_OUTBOX: "pending_sends_v1",
  KV_OUTBOX_MAX: 200,
  // #1 Pre-scheduled notifications: per-match schedule record written at
  // discovery time, reconciled every sweep. Eliminates the cron-timing
  // dependency — a missed cron fires the notification late on the next run
  // instead of losing it.
  KV_SCHEDULE_PREFIX: "sched_v1:",
  // #4 Canonical kickoff-time KV: kickoff:<matchKey> written at first
  // discovery, never overwritten unless the match is POSTPONED. Prevents
  // provider-time-shift from moving the notification windows.
  KV_KICKOFF_PREFIX: "kickoff_v1:",
  // #5 Canary match: a synthetic worthy match injected into the pool so the
  // full notification pipeline (discovery → window → dedupe → send) is
  // exercised end-to-end. If the canary's reminders don't arrive at the
  // expected times, the pipeline is broken.
  KV_CANARY: "canary_match_v1",
  CANARY_REFRESH_MS: 6 * 60 * 60 * 1e3,
  // #9 Heartbeat: the bot sends a "✅ alive" to the admin chat every 6h.
  // If the admin doesn't see it, something broke (cron, worker, KV, Telegram).
  KV_HEARTBEAT_LAST: "heartbeat_sent_v1",
  HEARTBEAT_INTERVAL_MS: 6 * 60 * 60 * 1e3,
  // v13.11-migration: bot migration broadcast. Sends a "this bot is
  // deprecated, join the new bot" message to all registered chats, every
  // 3 days for 2 weeks (5 sends: day 0, 3, 6, 9, 12). Per-chat KV dedupe
  // so each user gets it exactly once per send-round. The admin starts the
  // migration via POST /api/migrate/start; it auto-expires after 14 days.
  KV_MIGRATION: "migration_v1",
  MIGRATION_INTERVAL_DAYS: 3,
  MIGRATION_TOTAL_DAYS: 14,
  MIGRATION_NEW_BOT_URL: "https://t.me/SportSignalAlertsBot",
  MIGRATION_NEW_BOT_HANDLE: "@SportSignalAlertsBot",
  DATE_RANGE_DAYS: 10,
  DAYS_IN_PAST: 2,
  DAYS_IN_FUTURE: 8,
  LONG_VIEW_DAYS: 92,
  NOTIFICATION_COOLDOWN_HOURS: 6,
  EXECUTION_FREQUENCY_MINUTES: 10,
  // v12.16 (API frugality, the user's ask): the cron still ticks every 10 min
  // but the full provider sweep only runs when it MATTERS — a followed match
  // is live, kicks off within 1h, or ended <8h ago (result pending). Quiet
  // periods re-sweep at most every QUIET_SWEEP_MS; pre-match reminders keep
  // firing from the KV pool (fixtures are known days ahead).
  QUIET_SWEEP_MS: 2 * 60 * 60 * 1e3,
  ACTIVE_WINDOW_AHEAD_MS: 60 * 60 * 1e3,
  ACTIVE_WINDOW_BEHIND_MS: 8 * 60 * 60 * 1e3,
  // v12.16: week-ahead fixtures section of the weekly digest — days covered.
  WEEK_AHEAD_DAYS: 7,
  // v12.16: provider circuit breaker — when a provider fails across a whole
  // sweep (sportscore is currently serving a bot challenge), suspend it for
  // this long instead of burning subrequests on every 10-min tick.
  PROVIDER_SUSPEND_MS: 45 * 60 * 1e3,
  // Time constants
  ONE_HOUR_MS: 60 * 60 * 1e3,
  TWO_HOURS_MS: 2 * 60 * 60 * 1e3,
  ONE_DAY_MS: 24 * 60 * 60 * 1e3,
  // A-League Men season start (review each year): sportscore serves the prior
  // season's final table in pre-season, so before this date AL standings are
  // zeroed and shown as not-started rather than presenting a stale table.
  SEASON_STARTS: { AL: "2026-10-17T00:00:00Z" }
};
export const STAGE_EN = {
  "PLAYOFF_ROUND": "Playoff",
  "ROUND_OF_16": "Round of 16",
  "QUARTER_FINALS": "Quarter-finals",
  "QUARTER_FINAL": "Quarter-final",
  "SEMI_FINALS": "Semi-finals",
  "SEMI_FINAL": "Semi-final",
  "FINAL": "Final",
  "THIRD_PLACE": "Third-place play-off"
};
export const LEAGUE_LOGOS = {
  "CL": "https://media.api-sports.io/football/leagues/2.png",
  "EL": "https://media.api-sports.io/football/leagues/3.png",
  "ECL": "https://media.api-sports.io/football/leagues/848.png",
  "PL": "https://media.api-sports.io/football/leagues/39.png",
  "PD": "https://media.api-sports.io/football/leagues/140.png",
  "SA": "https://media.api-sports.io/football/leagues/135.png",
  "FL1": "https://media.api-sports.io/football/leagues/61.png",
  "BL1": "https://media.api-sports.io/football/leagues/78.png",
  "AL": "https://media.api-sports.io/football/leagues/188.png",
  "FA_CUP": "https://media.api-sports.io/football/leagues/45.png",
  "EFL_CUP": "https://media.api-sports.io/football/leagues/41.png",
  "CDR": "https://media.api-sports.io/football/leagues/143.png",
  "COPPA_ITALIA": "https://media.api-sports.io/football/leagues/137.png",
  "DFB_POKAL": "https://media.api-sports.io/football/leagues/4540.png",
  "PGL": "https://media.api-sports.io/football/leagues/290.png",
  "HAZFI_CUP": "https://media.api-sports.io/football/leagues/719.png",
  "WC": "https://media.api-sports.io/football/leagues/1.png",
  "EC": "https://media.api-sports.io/football/leagues/4.png",
  "COPA": "https://media.api-sports.io/football/leagues/9.png",
  "AFCON": "https://media.api-sports.io/football/leagues/79.png",
  "AFC": "https://media.api-sports.io/football/leagues/77.png"
};
export const COMP_EN = {
  "CL": "Champions League",
  "EL": "Europa League",
  "ECL": "Conference League",
  "PL": "Premier League",
  "PD": "La Liga",
  "SA": "Serie A",
  "FL1": "Ligue 1",
  "BL1": "Bundesliga",
  "FA_CUP": "FA Cup",
  "EFL_CUP": "EFL Cup",
  "CDR": "Copa del Rey",
  "COPPA_ITALIA": "Coppa Italia",
  "DFB_POKAL": "DFB Pokal",
  "PGL": "Persian Gulf Pro League",
  "HAZFI_CUP": "Hazfi Cup",
  "AL": "A-League",
  "WC": "World Cup",
  "EC": "European Championship",
  "COPA": "Copa Am\xE9rica",
  "AFCON": "Africa Cup of Nations",
  "AFC": "AFC Asian Cup"
};
export const STAGE_FA = {
  "PLAYOFF_ROUND": "\u067E\u0644\u06CC\u200C\u0622\u0641 \u0645\u0631\u062D\u0644\u0647 \u062D\u0630\u0641\u06CC",
  "ROUND_OF_16": "\u06CC\u06A9\u200C\u0647\u0634\u062A\u0645 \u0646\u0647\u0627\u06CC\u06CC",
  "QUARTER_FINALS": "\u06CC\u06A9\u200C\u0686\u0647\u0627\u0631\u0645 \u0646\u0647\u0627\u06CC\u06CC",
  "QUARTER_FINAL": "\u06CC\u06A9\u200C\u0686\u0647\u0627\u0631\u0645 \u0646\u0647\u0627\u06CC\u06CC",
  "SEMI_FINALS": "\u0646\u06CC\u0645\u0647\u200C\u0646\u0647\u0627\u06CC\u06CC",
  "SEMI_FINAL": "\u0646\u06CC\u0645\u0647\u200C\u0646\u0647\u0627\u06CC\u06CC",
  "FINAL": "\u0641\u06CC\u0646\u0627\u0644",
  "THIRD_PLACE": "\u0631\u062F\u0647\u200C\u0628\u0646\u062F\u06CC"
};
export const X_CONFIG = {
  KV_PHASE: "x_phase_v1",
  // comma-separated: coronation,ft,kickoff,tables,media
  KV_BUDGET_PREFIX: "x_budget_v1:",
  // + yyyymm — monthly automated posts counter
  KV_DAILY_PREFIX: "x_daily_v1:",
  // + yyyymmdd — daily automated posts counter
  KV_TEST_PREFIX: "x_test_v1:",
  // + yyyymmdd — admin test-post counter
  KV_DEDUPE_PREFIX: "x_post_v1:",
  // + <type>:<key> — exactly-once per event
  KV_LAST_POST: "x_last_post_v1",
  // JSON {ts, text, id, kind}
  KV_LAST_ERROR: "x_last_error_v1",
  // JSON {ts, status, error}
  KV_PAUSE: "x_pause_v1",
  // RFC-3339 timestamp until which X is paused (429 backoff)
  KV_DRY_RUN: "x_dry_run_v1",
  // "1" overrides secret X_DRY_RUN=0; "0" overrides secret X_DRY_RUN=1
  KV_ENABLED: "x_enabled_v1",
  // same override pattern for X_ENABLED
  MONTHLY_CAP: 450,
  // safety margin under X free-tier 500/month
  DAILY_CAP: 12,
  TEST_DAILY_CAP: 5,
  DEDUPE_TTL_SEC: 7 * 86400,
  // 7 days
  DAILY_TTL_SEC: 36 * 3600,
  PAUSE_TTL_SEC: 900,
  // 15 minutes (429 backoff)
  RETRY_5XX: 1,
  POST_CHAR_LIMIT: 280,
  DEFAULT_PHASE: "coronation,ft",
  // phase B by default once live (X_DRY_RUN=0)
  API_BASE: "https://api.x.com",
  TWEET_PATH: "/2/tweets"
};
export const PAGE_SEC_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store, no-cache, must-revalidate",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  // v13.7-security: tightened CSP — removed `https://cdn.jsdelivr.net` from
  // style-src + font-src (dead since v13.4 removed the Lottie CDN player and
  // v13.6 self-hosted the Vazirmatn fonts). All assets are now same-origin
  // (Workers Static Assets). The inline @font-face + theme-init script still
  // require 'unsafe-inline' for style-src / script-src respectively (accepted
  // tradeoff: a nonce/hash scheme would need serve-time injection into the
  // static HTML string). frame-ancestors 'none' blocks all framing (clickjacking).
  "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'"
};
export const PROVIDER_LEAGUE_MAP = {
  "Premier League": "PL",
  "English Premier League": "PL",
  "La Liga": "PD",
  "Spanish La Liga": "PD",
  "Serie A": "SA",
  "Italian Serie A": "SA",
  "Ligue 1": "FL1",
  "French Ligue 1": "FL1",
  "Bundesliga": "BL1",
  "German Bundesliga": "BL1",
  "Champions League": "CL",
  "UEFA Champions League": "CL",
  "Europa League": "EL",
  "UEFA Europa League": "EL",
  "Conference League": "ECL",
  "UEFA Conference League": "ECL",
  "FA Cup": "FA_CUP",
  "English FA Cup": "FA_CUP",
  "EFL Cup": "EFL_CUP",
  "Carabao Cup": "EFL_CUP",
  "English League Cup": "EFL_CUP",
  "Copa del Rey": "CDR",
  "Spanish Copa del Rey": "CDR",
  "Coppa Italia": "COPPA_ITALIA",
  "Italian Coppa Italia": "COPPA_ITALIA",
  "World Cup": "WC",
  "UEFA Euro": "EC",
  "European Championship": "EC",
  "Copa America": "COPA",
  "Copa Am\xE9rica": "COPA",
  "Africa Cup of Nations": "AFCON",
  "Asian Cup": "AFC",
  "AFC Asian Cup": "AFC",
  "Persian Gulf Pro League": "PGL",
  "Iranian Persian Gulf Pro League": "PGL",
  "Iran Pro League": "PGL",
  "Iranian Persian Gulf Cup": "PGL",
  "Hazfi Cup": "HAZFI_CUP"
};
export const SPORTSCORE_SLUGS = {
  "CL": "uefa-champions-league",
  "EL": "uefa-europa-league",
  "ECL": "uefa-europa-conference-league",
  "PL": "english-premier-league",
  "PD": "spanish-la-liga",
  "SA": "italian-serie-a",
  "FL1": "french-ligue-1",
  "BL1": "bundesliga",
  "PGL": "iran-pro-league",
  "AL": "australia-a-league",
  "FA_CUP": "fa-cup",
  "EFL_CUP": "efl-cup",
  "CDR": "copa-del-rey",
  "COPPA_ITALIA": "coppa-italia",
  // v12.6: the Iranian Hazfi Cup (جام حذفی ایران) — slug verified live against
  // the fixtures API (2026-01-13: Foolad Hormozgan 0-2 Esteghlal Tehran, Shams
  // Azar Qazvin 3-0 Tractor S.C.). Display-only: never added to the near-scan
  // slug filter, so the cron/bot budget and notification semantics are flat.
  "HAZFI_CUP": "iran-cup"
};
export const TSP_LEAGUE_IDS = {
  "PL": 4328,
  "BL1": 4331,
  "SA": 4332,
  "EL": 4481,
  // verified via thesportsdb lookupleague
  "PGL": 4742
  // Iran Persian Gulf Pro League (display-only, never in fd leagues URL)
};
export const CUP_TSP_IDS = {
  "EFL_CUP": 4570,
  // English League Cup (Plymouth/Exeter etc.)
  "CDR": 4483,
  // Copa del Rey (R1 not published before ~Nov → honest empty until then)
  "COPPA_ITALIA": 4506
  // Coppa Italia (Parma/Catania R64 ...)
};
export const UCL_STARBALL_D = "m293.4 123.4c-0.2 0.5-0.7 0.8-1.3 0.9-12.6 1.5-26.0-0.3-31.2-1.1-8.6-8.6-18.0-18.2-24.9-26.6-0.7-0.9-0.7-2.1-0.1-3.0 9.8-13.7 18.8-24.6 22.6-28.9 10.9-2.4 21.7-4.5 29.0-4.8 0.6-0.0 1.1 0.2 1.4 0.7 9.4 13.1 16.2 25.7 18.4 30.3-4.3 11.6-9.5 23.4-14.0 32.5zm-12.0 22.2c-7.0 11.7-12.2 18.7-13.9 20.8-2.3 3.2-8.2 11.7-17.3 20.3-0.6 0.5-1.3 0.9-2.1 0.9-11.4 0.5-22.0-0.3-26.1-1.2-3.5-1.4-11.6-5.1-21.3-10.4-0.8-0.5-1.3-1.4-1.3-2.3 0.5-7.5 2.9-18.1 5.0-29.3 5.2-9.1 10.5-19.5 16.1-28.0 0.6-0.9 1.7-1.3 2.7-1.0 16.7 4.5 31.1 8 37.0 9.3 8.0 9.3 15.8 15.9 21.1 19.9 0.3 0.3 0.4 0.7 0.2 1.1zm-100.8 16.2c-0.8 0.5-1.9 0.5-2.7-0.1-7.3-5.1-15.9-11.7-23.1-18.4-4.3-7.3-7.5-16.6-9.8-24.5-0.1-0.5-0.0-1.1 0.3-1.5 8.1-9.9 17.8-17.8 21.9-20.8 9.2 3.9 19.7 7.4 28.9 10.5 0.9 0.3 1.6 1.2 1.7 2.1 1.3 16.4 4.3 29.6 5.1 34.6-3.4 3.7-12.4 12.0-22.1 18.0zm-40.3-64.3c-1.2-7.7-2.0-15.8-2.1-19.5-0.2-8.6 1.2-16.2 2.7-23.2 0.3-1.2 0.9-2.2 1.7-3.0 4.6-4.2 12.9-11.6 18.1-15.0 4.9-3.2 18.7-7.6 24.3-9.2 1.1-0.3 2.3 0.2 2.8 1.2 0.7 1.2 1.4 2.4 2.1 3.6 4.5 6.9 9.4 12.9 11.4 15.5-2.7 10.9-3.9 23.1-4.4 33.4-0.1 1.0-0.7 1.8-1.6 2.2-14.3 5.6-25.2 10.0-28.8 11.6-9.8 0.4-19.2 2.1-25.6 3.2-0.4 0.1-0.9-0.2-0.9-0.7zm72.3-74.8c0.4-0.6 1.0-1.0 1.8-1.1 14.7-1.9 28.2-2.2 33.4-2.1 9.4 6.3 18.6 14.5 26.0 22.4 0.5 0.6 0.6 1.4 0.2 2.0-5.2 8.2-12.9 16.1-16.2 19.5-12.4 2.9-25.6 7.2-36.3 10.7-1.0 0.3-2.2-0.0-2.8-0.9-8.1-11.8-13.3-21.9-15.3-25.7 2.2-9.8 5.3-18.6 9.3-24.9zm98.5 96.8c-0.3 0.1-0.6-0.1-0.6-0.4-0.6-12.1-1.7-23.9-2.3-28.2 0.0-10.5-1.7-21.3-3.4-29.3-0.1-0.3 0.2-0.5 0.5-0.5 9.9 2.0 13.1 5.7 13.1 5.7-5.2-11.7-12.8-20.6-21.0-27.3-7.0-14.7-15.1-21.5-15.1-21.5 0.7 3.2 0.2 6.9-1.0 10.7-0.1 0.2-0.3 0.4-0.6 0.2-13.4-6.6-27.3-9.6-32.7-10.3-8.0-3.9-16.8-6.5-23.9-8.4-0.2-0.1-0.2-0.3-0.1-0.4 9.5-7.8 18.2-9.8 18.2-9.8-15.4-0.6-28.7 2.2-39.7 6.4-16.6-1.3-27.1 1.6-27.1 1.6s4.6 5.5 6.4 8.5c0.2 0.4 0.1 0.8-0.2 1.1-10.4 7.2-17.9 15.1-20.8 18.4-3.3 0.4-9.0 1.2-13.9 2.5-0.2 0.0-0.4-0.1-0.3-0.3 5.0-11.8 10.4-18.4 10.4-18.4s-32.0 22.7-38.0 63.4c0 0 2.6-7.2 11.5-18.2 0.1-0.1 0.3-0.1 0.4 0.1 2.5 5.6 5.4 10.5 6.9 12.8-4.9 7.9-8.3 16.5-10.4 23.5-0.1 0.2-0.3 0.4-0.5 0.5-7.4 2.8-9.3 5.5-9.3 5.5 1.2 3.9 3.4 7.8 6.3 11.4 0.2 0.3 0.4 0.7 0.4 1.1-0.8 17.4 4.8 28.8 4.8 28.8 1.3-6.1 3.8-12.0 6.9-17.5 0.1-0.2 0.4-0.3 0.6-0.1 7.3 5.8 14.9 10.9 17.9 12.7 1.5 4.0 6.0 14.2 11.9 24.7 0.1 0.2 0.0 0.5-0.2 0.6-7.1 2.6-14.4 3.8-21.1 2.1 0 0 8.1 10.0 32.9 14.3 6.9 8.1 15.3 14.9 25.1 17.2 0 0-2.9-3.2-3.6-14.9-0.0-0.2 0.2-0.4 0.4-0.4 6.1 0.1 14.4 0.2 22.1-0.3 2.7 2.1 8.6 6.8 14.3 9.8 0.3 0.1 0.3 0.6 0.0 0.7-10.1 6.1-16.8 6.6-16.8 6.6 45.7 1.0 73.2-28.8 73.2-28.8-7.5 4.9-16.2 8.0-24.9 9.9-0.3 0.1-0.5-0.2-0.5-0.5 1.6-7.8 1.2-15.3 1.0-17.9 10.8-2.7 20.3-7.5 27.3-12.5 0.1-0.1 0.3-0.1 0.50 2.9 2.0 5.4 4.3 7.9 8.1 0 0 4.7-6.7 6.4-22.2 11.7-15.3 13.5-31.0 13.5-31.0-2.9 4.6-7.4 7.9-12.6 10.3zm-90.5 151.2c-19.6 0-37.4 8.8-48.3 21.7l3.4 4.2c9.9-12.2 26.6-20.7 44.8-20.7 18.2 0 35.0 8.4 44.8 20.7l3.4-4.2c-10.9-12.9-28.6-21.7-48.3-21.7zm-45.9 2.7c-1.3 1.0-2.8 1.6-4.1 1.4-1.7-0.2-2.7-0.9-4.4-2.9l-9.6-11.8-5.2 4.2 10.5 12.9c2.2 2.7 4.8 4.2 7.8 4.5 0.4 0.0 0.7 0.1 1.1 0.1 2.9 0.0 5.6-1.0 8.2-3.1 2.9-2.4 4.5-5.1 4.9-8.4 0.3-3.0-0.6-5.8-2.8-8.5l-10.5-12.9-5.2 4.2 9.6 11.8v0c1.7 2.0 2.1 3.2 2.0 4.9-0.1 1.3-0.9 2.7-2.2 3.7zm35.5-37.2-16.8 3.4c-0.8 0.2-1.4 0.5-1.8 1.1-0.4 0.6-0.5 1.3-0.3 2.0l3.3 16.5c0.5 2.7 1.7 4.6 3.6 5.7 1.2 0.7 2.7 1.1 4.3 1.1 0.90 1.8-0.1 2.7-0.3l10.5-2.1-1.3-6.2-10.2 2.1c-2.1 0.4-2.8 0.2-3.2-2.2l-0.4-1.8 11.8-2.4-1.2-6.1-11.8 2.4-0.9-4.4 12.9-2.6-1.3-6.2zm32.7 9.0 10.1 2.6 1.6-6.1-10.4-2.7c-5.7-1.5-9.6 0.7-10.9 6.0l-4.2 16.3c-0.2 0.8-0.1 1.5 0.2 2.1 0.3 0.6 0.9 1.0 1.7 1.2l3.8 1.0 2.7-10.5 11.7 3.0 1.6-6.1-11.7-3.0 0.5-1.7c0.6-2.3 1.3-2.5 3.4-2.0zm52.2 14.9 3.6-4.4c-1.8-1.8-3.6-3.5-5.5-5.1-19.9-17.1-45.6-26.6-72.5-26.6-26.9 0-52.6 9.4-72.5 26.6-1.9 1.6-3.8 3.4-5.5 5.1l3.6 4.4c1.8-1.8 3.7-3.6 5.6-5.3 18.9-16.3 43.3-25.2 68.9-25.2s50.0 8.9 68.9 25.2c2.0 1.7 3.8 3.4 5.6 5.3zm-27.1 21.7 1.2-4.0-5.0-3.7 4.0-2.9 2.3 1.7 2.6-8.8-15.2 9.8-6.2-3.5 23.9-15.4c0.9-0.6 2.2-1.1 3.8 0.1l1.0 0.8c1.6 1.2 1.4 2.7 1.1 3.6l-7.9 27.3-5.5-5.0zm-112.5 129.1h-17.6v-13.5h10.5l4.3 3.7h0.1v-13.8h-0.1l-4.3 3.7h-10.5v-11.8h17l4.9 5.3h0.1l-0.6-11.7h-36.3v0.1l3.3 4.0v36.3l-3.3 4.0v0.1h37.8l0.9-13.4h-0.1l-6.2 7.0zm6.7-89.8 12.5 31.8h7.0l11.6-32.2 2.0 28.0-4.4 4.0v0.1h19.0v-0.1l-3.7-4.0-2.7-36.3 2.9-4.0v-0.1h-15.8l-10.7 29.8-11.6-29.8h-16.0v0.1l3.2 4.0-1.9 36.3-3.9 4.0v0.1h15.6v-0.1l-3.9-4.0 0.8-27.7zm-52.5 89.7h-15.3v-33.9l4.2-4.0v-0.1h-18.9v0.1l3.3 4.0v36.3l-3.3 3.9v0.2h35.5l1.7-14.0h-0.1l-7.0 7.5zm-34.2-58.1v0.1h18.0v-0.1l-3.3-4.0v-36.3l3.3-4.0v-0.1h-18.0v0.1l3.2 4.0v13.5h-16.0v-13.5l3.2-4.0v-0.1h-18.0v0.1l3.3 4.0v36.3l-3.3 4.0v0.1h18.0v-0.1l-3.2-4.0v-15.7h16.0v15.7l-3.2 4.0zm280.9 58.1h-17.6v-13.5h10.5l4.3 3.7h0.1v-13.8h-0.1l-4.3 3.7h-10.5v-11.8h17.0l4.9 5.3h0.1l-0.6-11.7h-36.3v0.1l3.3 4.0v36.3l-3.3 4.0v0.1h37.8l0.9-13.4h-0.1l-6.2 7.0zm-161.9-11.3-5.3-17.7-6.2 17.7h11.5zm15.8 13.7 3.7 4.0v0.1h-19.1v-0.1l3.7-4.0-2.0-7.0h-15.8l-2.4 7.0 3.5 4.0v0.1h-15.0v-0.1l3.5-4.0 13.8-36.3-2.6-4.0v-0.1h15.2l13.7 40.5zm-183.2-66.2c-9.2 0-15.0-9.3-15.0-17.3 0-9.9 5.4-16.3 13.0-16.3 2.0 0 4.0 0.2 5.8 0.7l6.9 8.5h0.1l-0.5-14.1c-2.0-0.8-6.3-1.8-11.6-1.8-16.4 0-25.7 11.1-25.7 23.9 0 12.7 9.0 23.8 24.5 23.8 4.2 0 10.3-1.4 14.5-4.6l0.6-7.4h-0.1c-3.6 2.8-8.7 4.5-12.6 4.5zm256.9 5.8-3.2-4.0v-36.3l3.2-4.0v-0.1h-18.0v0.1l3.3 4.0v36.3l-3.3 4.0v0.1h18.0v-0.1zm-39.5 43.7 4.4 4.0v8.4c-1.4 1.6-3.9 3.0-7.2 3.0-7.9 0-12.1-9.6-12.1-17.7 0-8.8 4.4-16.2 13.6-16.2 2.5 0 5.2 0.2 7.4 1.0l7.1 7.6h0.1l-0.4-12.2c-4.1-2.1-9.0-3.0-14.0-3.0-15.0 0-25.7 9.2-25.7 24.4 0 12.7 8.2 23.3 20.9 23.3 5.6 0 10.7-1.3 15.4-4.7l5.6 4.7h0.1v-18.4l3.5-4.0v-0.1h-18.8v0.1zm-11.7-65.3c1.4 0.4 3.0 0.6 4.7 0.6 6.2 0 8.9-3.4 8.9-8.4 0-5.9-3.5-8.7-9.9-8.7h-3.7v16.5zm-11.4 17.5v-36.3l-3.3-4.0v-0.1h21.2c12.8 0 18.7 5.8 18.7 14.7 0 9.2-7.0 14.9-16.5 14.9-3.1 0-6.3-0.2-8.6-0.8v11.6l4.7 4.0v0.1h-19.4v-0.1l3.3-4.0zm106.6-14.9c0-7.7-2.9-20.1-12.8-20.1-7.9 0-10.2 7.9-10.2 13.2 0 7.8 3.2 20.4 12.8 20.4 6.8 0 10.2-6.5 10.2-13.6zm-11.9 20.6c-14.0 0-23.0-11.5-23.0-24.5 0-13.4 10.4-23.2 23.3-23.2 14.3 0 23.5 11.2 23.5 24.0 0 14.6-11.1 23.7-23.8 23.7zm-14.9 18.5 3.7 4.0v25.4c0 7.3-3.6 9.1-9.5 9.1-5.9 0-9.5-1.7-9.5-9.1v-25.4l3.7-4.0v-0.1h-18.4v0.1l3.3 4.0v25.4c0 12.2 6.2 16.6 19.5 16.6 12.1 0 18.2-4.2 18.2-16.3v-25.8l3.2-4.0v-0.1h-14.2v0.1zm85.2 5.5c0-3.2-2.4-5.6-5.5-5.6-3.1 0-5.5 2.4-5.5 5.6 0 3.2 2.4 5.6 5.5 5.6 3.0 0 5.5-2.4 5.5-5.6zm1.4 0c0 3.9-3.1 6.7-6.8 6.7-3.7 0-6.8-2.8-6.8-6.7 0-3.8 3.1-6.7 6.8-6.7 3.7 0 6.8 2.8 6.8 6.7zm-6.8-0.5c1.0 0 1.9-0.1 1.9-1.2 0-1.0-0.9-1.1-1.7-1.1h-1.6v2.4h1.4zm1.1 0.9 2.2 3.4h-1.3l-2.0-3.4h-1.4v3.4h-1.2v-7.7h3.0c1.8 0 2.7 0.7 2.7 2.2 0 1.4-0.9 2.0-2.0 2.1zm-2.9-70.4 4.3 4.0v23.6l-18.1-27.8h-16.3v0.1l3.3 4.0v36.3l-3.3 4.0v0.1h14.9v-0.1l-4.4-4.0v-29.6l22.6 33.7h8.5v-40.5l3.3-4.0v-0.1h-14.8v0.1zm45.5 17.0c-8.1-2.3-10.6-3.2-10.6-7.0 0-4.3 5.6-5.1 9.1-5.1 3.0 0 5.7 0.3 8.2 1.1l6.8 7.3h0.1l-0.6-12.6c-4.2-1.6-8.7-2.5-13.8-2.5-10.7 0-20.9 3.7-20.9 14.2 0 6.8 4.7 10.9 15.0 13.7 7.9 2.2 11.8 3.6 11.8 7.6 0 4.6-5.9 5.6-9.9 5.6-3.3 0-6.3-0.5-8.8-1.3l-6.8-8.4h-0.1l0.5 13.4c4.7 2.1 10.3 2.9 15.6 2.9 11.4 0 21.0-4.8 21.0-14.4 0-9.1-6.3-11.7-16.6-14.6zm-309.7 9.6h11.5l-5.3-17.7-6.2 17.7zm-1.3 17.8h-15.0v-0.1l3.5-4.0 13.8-36.3-2.6-4.0v-0.1h15.2l13.7 40.5 3.7 4.0v0.1h-19.1v-0.1l3.7-4.0-2.0-7.0h-15.8l-2.4 7.0 3.5 4.0v0.1z";
export const UCL_LOGO_CHIP = '<svg viewBox="117 0 206 204" aria-hidden="true" focusable="false"><path fill="#3b5fad" d="' + UCL_STARBALL_D + '"/></svg>';
export const UCL_BALL = '<svg viewBox="117 0 206 204" aria-hidden="true" focusable="false"><circle cx="220" cy="102" r="103" fill="#0e2058"/><path fill="#ffffff" d="' + UCL_STARBALL_D + '"/></svg>';
