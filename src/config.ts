// SportSignal — central configuration & static data tables.
// KV keys and semantics are LIVE-STATE contracts — never rename casually.

export const VERSION = "13.75-cronsplit";

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
  // v13.54-livestamp: the pool's fetchedAt stamp is the "Last updated"
  // clock the site header prints. cacheMatches is change-only (v13.31 KV
  // budget), and on break weeks NOTHING changes — fixtures sit TIMED for
  // days — so the stamp froze at the last content change (2026-09-28: the
  // header said "دوشنبه ۱۵:۳۹ · cached (1407m ago)" for 41h while sweeps
  // ran clean every 2h). Now a successful re-cache whose content is
  // unchanged STILL rewrites the pool when the stamp is >90min old — the
  // full sweep's 2h cadence makes every sweep advance it (≤12 writes/day
  // of the 1,000/day quota; live content changes keep their instant
  // write). The stamp means "last sweep that verified this data", which
  // is exactly what the header claims to print.
  POOL_STAMP_REFRESH_MS: 90 * 60 * 1e3,
  // v13.54-livestamp: the "cached (Nm ago)" badge shows ONLY when the data
  // epoch (the pool stamp riding in the served payload) is older than
  // this. Steady state: sweep advances ≤2h + rebuild propagation ≤~10min
  // → no badge on healthy days (it used to show on EVERY snapshot-serve,
  // i.e. every >10-min-gap visitor, with a frozen write-time age that
  // grew for days). A dead-sweep outage (>3h) still gets the truthful
  // badge with the age of the DATA, not of the KV write.
  CACHED_BADGE_MS: 3 * 60 * 60 * 1e3,
  TELEGRAM_RETRY_ATTEMPTS: 3,
  // v13.69-pacenotify: proactive Telegram pacing + bounded 429-pause waits.
  // Telegram's global bot limit is ~30 messages/sec; broadcast fan-outs fire
  // every send in parallel, so ≥30 chats = a guaranteed 429 cascade. A 40ms
  // floor between Telegram API calls (~25/sec) paces the fan-out under the
  // limit (a wall-clock sleep — zero CPU against the free plan's 10ms
  // rolling average; a cron tick has minutes of wall-time headroom). When a
  // 429 pause IS active, senders wait it out (bounded below) instead of
  // dropping the send — Telegram's global-limit retry_after is 1-5s.
  TELEGRAM_MIN_SEND_GAP_MS: 40,
  TELEGRAM_PAUSE_WAIT_MAX_MS: 8000,
  KV_USERS_KEY: "telegram_users_v6",
  KV_MATCHES_KEY: "matches_v13_tracked",
  KV_NOTIFIED_KEY: "notified_matches_v6",
  KV_SETTINGS_KEY: "bot_settings_v1",
  KV_LAST_SOURCE: "last_api_source",
  KV_STANDINGS_SNAP: "standings_snap_",
  KV_STANDINGS_CACHE: "standings_cache_",
  // v13.53-standsteady: standings freshness + cache tunables. The old values
  // (10-min freshness gate / 8h KV TTL) were the "2 of 5 league tables
  // don't load" bug's fuel: every payload rebuild re-hit football-data for
  // the rotation pair, FD 429s left nothing cached for the other codes, and
  // the 8h TTL expired the box to «جدول هنوز در دسترس نیست». Standings only
  // change around finished matches, so:
  //   STANDINGS_FRESH_MS       — default re-fetch gate (6h; callers that need
  //                              post-FT freshness pass opts.freshMs = 6e5);
  //   STANDINGS_FRESH_JITTER_MS— per-code stagger (see STAND_CODE_ORDER) so
  //                              the 6h expiries NEVER coincide: no rebuild
  //                              fetches the whole set at once (FD free tier
  //                              is 10 req/min); worst case ~1 code/rebuild;
  //   STANDINGS_CACHE_TTL      — KV TTL of a successful fetch (24h; a
  //                              day-old table beats an empty box when the
  //                              upstream is down/suspended).
  STANDINGS_FRESH_MS: 6 * 60 * 60 * 1e3,
  STANDINGS_FRESH_JITTER_MS: 17 * 60 * 1e3,
  STANDINGS_CACHE_TTL: 24 * 60 * 60,
  KV_PUBLIC_MATCHES: "public_matches_v1",
  // v13.55-epochflow: the cron tick's SELF-FETCH prewarm target. The in-tick
  // prewarm rebuilt the public payload INSIDE the sweep invocation — after
  // the 3-provider sequential sweep the tick already sits at ~40-50 real
  // subrequests, so the rebuild's final payload + snapshot puts crossed CF's
  // real ~50 ceiling and died silently (.catch(() => {})) on every sweep
  // (the 2026-09-30 frozen-epoch bug: the snapshot last wrote 05:43 while
  // sweeps ran clean every 2h). The tick now fires ONE fetch at this URL —
  // a fresh invocation with a full 50-subrequest budget of its own, whose
  // serve path + waitUntil rebuild land the writes reliably. The query
  // string is cache-busting only; the route treats it like any visitor.
  SELF_PREWARM_URL: "https://sportsignal.ir/api/public-matches",
  // v13.55-epochflow: the cron standings-refresh phase marker (see cron.ts).
  // Standings fetch authority moved OFF the serve path (visitor rebuilds are
  // cache-only) into a dedicated quiet-tick phase gated by this 2h marker —
  // the 6h per-code freshness gates + jitter inside fetchStandings stay the
  // real throttle; the marker just keeps the phase off every single tick.
  KV_STAND_REFRESH: "stand_refresh_v1",
  STAND_REFRESH_MS: 2 * 60 * 60 * 1e3,
  // v12.x-resilience: long-TTL (7 day) snapshot of the last successful
  // public-matches build. Read ONLY when the live fetch fails (or returns
  // an empty pool) so the page can still render last week's fixtures with
  // a subtle "cached data" indicator instead of empty cards.
  KV_PUBLIC_SNAPSHOT: "cache:snapshot:v1",
  KV_PUBLIC_SNAPSHOT_TTL: 7 * 24 * 60 * 60,
  // v13.52-swrsolid: the LIVE OVERLAY — a tiny blob the cron tick writes
  // whenever live data changes (goal / kickoff / HT / FT) and at least every
  // 10 min while live rows exist. The public serve path reads it (one KV
  // read) and patches live rows into EVERY payload it serves — fixtures can
  // cache for hours, but a LIVE match is never served stale and a FINISHED
  // one is purged from the live lists immediately (the user's rule: "you
  // can't cache a live game — it would still show as playing").
  KV_LIVE_OVERLAY: "live_overlay_v1",
  KV_LIVE_OVERLAY_TTL: 6 * 60 * 60,
  KV_USER_PREFS: "user_prefs_v1",
  // v12.16: bot-member profiles (telegram username/"slug" + first name + join
  // date), captured from every incoming message and backfilled via getChat
  // when the admin opens the members card. Keyed by chat id.
  KV_USER_PROFILES: "user_profiles_v1",
  KV_MATCH_STATUS: "match_status_v1",
  // v13.37-nospam2: audit admin-alert rate-limit stamp (one gap alert / 6h).
  KV_AUDIT_ALERT: "audit_alert_v1",
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
  // #1 Pre-scheduled notifications: RETIRED in v13.43-cpukeeper — the
  // sched_v1:* records were never read back (the fire-leg was never built);
  // the v13.42 isBackfillEligible legs + the outbox cover recovery for real.
  // Old sched_v1:* keys expire via their 7-day TTL; the prefix constant is
  // kept ONLY as documentation (no writer, no reader).
  KV_SCHEDULE_PREFIX: "sched_v1:",
  // v13.9-reliability #4: canonical kickoff-time KV — REMOVED in v13.46-trim:
  // kickoff_v1: had zero writers and zero readers in practice (the helpers in
  // admin.ts were never called by detectStatusChanges or anyone else), so the
  // prefix constant went with them. Guard flipped to absence (check-reliability
  // #4). Notification windows have always used the pool's own utcDate.
  // #5 Canary match: RETIRED in v13.44-quotaguard (audit F9). The injection
  // could never persist — cacheMatches runs BEFORE the injection, so every
  // tick minted a fresh +25h kickoff whose windows never opened — while
  // burning a canary_match_v1 write EVERY tick (~144/day of the 1,000/day
  // free quota for zero value, plus notify-path reads for a phantom match).
  // Pipeline liveness is proven by real matches + the 6h admin heartbeat +
  // the last_cron-completion healthz + the v13.42 notify breadcrumb. Old
  // canary_match_v1 keys expire via their own 7-day TTL.
  // v13.44-quotaguard: the KV-write budget governor thresholds (free tier =
  // 1,000 writes/day). SOFT (700): shed cosmetic writes (public prewarm,
  // FA-AI learning). HARD (850): also hold the pool-cache write + page the
  // admin once/12h. The anti-spam set (dedupe records, outbox, execution
  // lock, status blob) is NEVER gated — spam prevention beats budget
  // pressure, and a send whose dedupe write fails is deferred fail-closed.
  KV_WRITES_SOFT: 700,
  KV_WRITES_HARD: 850,
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
  // v13.43-cpukeeper: QUIET_SWEEP_MS is now ALSO the cap on full sweeps
  // during ACTIVE windows (previously every active tick re-swept — ~100ms
  // CPU × 6/hour over the free-plan 10ms rolling average = the Sep-14
  // CPU-limit outages). Between full sweeps, active ticks run the cheap
  // live sweep (fetchLiveSweep) instead.
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
  // v13.50-cupscan: the EFL/FA Cup team-scan cadence (marker cup_scan_v1
  // TTL). A scan runs on the first NON-sweep tick after the marker ages
  // out; during a cup match window [-1h, +4h] it re-runs at most every
  // CUP_SCAN_HOT_TTL_MS so live scores/FT flow at near-tick cadence.
  KV_CUP_SCAN_KEY: "cup_scan_v1",
  CUP_SCAN_TTL_MS: 5 * 3600 * 1e3,
  CUP_SCAN_HOT_TTL_MS: 30 * 60 * 1e3,
  // v14.0.5-cupgap: the far-cup probe cadence (ECL Thursdays + the Hazfi
  // grid — see probeCupFarFixtures in providers.ts). 4h: 6 runs/day max,
  // 7 fetches each, always on quiet ticks or its own lean cron invocation.
  KV_CUP_FAR_SCAN: "cup_far_scan_v1",
  CUP_FAR_SCAN_MS: 4 * 3600 * 1e3,
  ONE_DAY_MS: 24 * 60 * 60 * 1e3,
  // A-League Men season start (review each year): sportscore serves the prior
  // season's final table in pre-season, so before this date AL standings are
  // zeroed and shown as not-started rather than presenting a stale table.
  SEASON_STARTS: { AL: "2026-10-17T00:00:00Z" }
};

// v13.48-xtrim: the X (Twitter) path is REMOVED (X_CONFIG retired with it).
// X never ran in production — no X_* secrets were ever set and x_enabled_v1
// was never written. To restore: revert the 13.48-xtrim commit, re-add the
// X_* secrets via `wrangler secret put`, then set x_enabled_v1=1 in KV.
