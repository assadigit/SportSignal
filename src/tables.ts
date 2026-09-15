// SportSignal — static data tables (split from config.ts in v13.47-seams).
// Pure data, zero logic: translation/stage dictionaries, league logos,
// provider id maps, the CSP header set, and the UCL starball path.
// The KV-key contract and tunables stay in config.ts (ONE file).

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
// v13.50-cupscan: the English big teams' TheSportsDB team ids (verified
// live 2026-09-15 via searchteams + league check). The hole this closes:
// TSP's LEAGUE views regressed (eventsnextleague/eventspastleague now
// return exactly ONE event each — verified: even the Premier League
// control returned just 1) and sportscore's efl-cup feed is empty, so
// big-team cup ties were invisible to the pool (the missed
// Liverpool-Tottenham EFL Cup R32). The TEAM view is the reliable
// surface: fixtures + live scores + strStatus. FA Cup R3 (January) rides
// the same 6 teams.
export const CUP_TEAM_TSP_IDS = {
  "Arsenal FC": 133604,
  "Chelsea FC": 133610,
  "Liverpool FC": 133602,
  "Manchester City FC": 133613,
  "Manchester United FC": 133612,
  "Tottenham Hotspur FC": 133616
};

export const UCL_STARBALL_D = "m293.4 123.4c-0.2 0.5-0.7 0.8-1.3 0.9-12.6 1.5-26.0-0.3-31.2-1.1-8.6-8.6-18.0-18.2-24.9-26.6-0.7-0.9-0.7-2.1-0.1-3.0 9.8-13.7 18.8-24.6 22.6-28.9 10.9-2.4 21.7-4.5 29.0-4.8 0.6-0.0 1.1 0.2 1.4 0.7 9.4 13.1 16.2 25.7 18.4 30.3-4.3 11.6-9.5 23.4-14.0 32.5zm-12.0 22.2c-7.0 11.7-12.2 18.7-13.9 20.8-2.3 3.2-8.2 11.7-17.3 20.3-0.6 0.5-1.3 0.9-2.1 0.9-11.4 0.5-22.0-0.3-26.1-1.2-3.5-1.4-11.6-5.1-21.3-10.4-0.8-0.5-1.3-1.4-1.3-2.3 0.5-7.5 2.9-18.1 5.0-29.3 5.2-9.1 10.5-19.5 16.1-28.0 0.6-0.9 1.7-1.3 2.7-1.0 16.7 4.5 31.1 8 37.0 9.3 8.0 9.3 15.8 15.9 21.1 19.9 0.3 0.3 0.4 0.7 0.2 1.1zm-100.8 16.2c-0.8 0.5-1.9 0.5-2.7-0.1-7.3-5.1-15.9-11.7-23.1-18.4-4.3-7.3-7.5-16.6-9.8-24.5-0.1-0.5-0.0-1.1 0.3-1.5 8.1-9.9 17.8-17.8 21.9-20.8 9.2 3.9 19.7 7.4 28.9 10.5 0.9 0.3 1.6 1.2 1.7 2.1 1.3 16.4 4.3 29.6 5.1 34.6-3.4 3.7-12.4 12.0-22.1 18.0zm-40.3-64.3c-1.2-7.7-2.0-15.8-2.1-19.5-0.2-8.6 1.2-16.2 2.7-23.2 0.3-1.2 0.9-2.2 1.7-3.0 4.6-4.2 12.9-11.6 18.1-15.0 4.9-3.2 18.7-7.6 24.3-9.2 1.1-0.3 2.3 0.2 2.8 1.2 0.7 1.2 1.4 2.4 2.1 3.6 4.5 6.9 9.4 12.9 11.4 15.5-2.7 10.9-3.9 23.1-4.4 33.4-0.1 1.0-0.7 1.8-1.6 2.2-14.3 5.6-25.2 10.0-28.8 11.6-9.8 0.4-19.2 2.1-25.6 3.2-0.4 0.1-0.9-0.2-0.9-0.7zm72.3-74.8c0.4-0.6 1.0-1.0 1.8-1.1 14.7-1.9 28.2-2.2 33.4-2.1 9.4 6.3 18.6 14.5 26.0 22.4 0.5 0.6 0.6 1.4 0.2 2.0-5.2 8.2-12.9 16.1-16.2 19.5-12.4 2.9-25.6 7.2-36.3 10.7-1.0 0.3-2.2-0.0-2.8-0.9-8.1-11.8-13.3-21.9-15.3-25.7 2.2-9.8 5.3-18.6 9.3-24.9zm98.5 96.8c-0.3 0.1-0.6-0.1-0.6-0.4-0.6-12.1-1.7-23.9-2.3-28.2 0.0-10.5-1.7-21.3-3.4-29.3-0.1-0.3 0.2-0.5 0.5-0.5 9.9 2.0 13.1 5.7 13.1 5.7-5.2-11.7-12.8-20.6-21.0-27.3-7.0-14.7-15.1-21.5-15.1-21.5 0.7 3.2 0.2 6.9-1.0 10.7-0.1 0.2-0.3 0.4-0.6 0.2-13.4-6.6-27.3-9.6-32.7-10.3-8.0-3.9-16.8-6.5-23.9-8.4-0.2-0.1-0.2-0.3-0.1-0.4 9.5-7.8 18.2-9.8 18.2-9.8-15.4-0.6-28.7 2.2-39.7 6.4-16.6-1.3-27.1 1.6-27.1 1.6s4.6 5.5 6.4 8.5c0.2 0.4 0.1 0.8-0.2 1.1-10.4 7.2-17.9 15.1-20.8 18.4-3.3 0.4-9.0 1.2-13.9 2.5-0.2 0.0-0.4-0.1-0.3-0.3 5.0-11.8 10.4-18.4 10.4-18.4s-32.0 22.7-38.0 63.4c0 0 2.6-7.2 11.5-18.2 0.1-0.1 0.3-0.1 0.4 0.1 2.5 5.6 5.4 10.5 6.9 12.8-4.9 7.9-8.3 16.5-10.4 23.5-0.1 0.2-0.3 0.4-0.5 0.5-7.4 2.8-9.3 5.5-9.3 5.5 1.2 3.9 3.4 7.8 6.3 11.4 0.2 0.3 0.4 0.7 0.4 1.1-0.8 17.4 4.8 28.8 4.8 28.8 1.3-6.1 3.8-12.0 6.9-17.5 0.1-0.2 0.4-0.3 0.6-0.1 7.3 5.8 14.9 10.9 17.9 12.7 1.5 4.0 6.0 14.2 11.9 24.7 0.1 0.2 0.0 0.5-0.2 0.6-7.1 2.6-14.4 3.8-21.1 2.1 0 0 8.1 10.0 32.9 14.3 6.9 8.1 15.3 14.9 25.1 17.2 0 0-2.9-3.2-3.6-14.9-0.0-0.2 0.2-0.4 0.4-0.4 6.1 0.1 14.4 0.2 22.1-0.3 2.7 2.1 8.6 6.8 14.3 9.8 0.3 0.1 0.3 0.6 0.0 0.7-10.1 6.1-16.8 6.6-16.8 6.6 45.7 1.0 73.2-28.8 73.2-28.8-7.5 4.9-16.2 8.0-24.9 9.9-0.3 0.1-0.5-0.2-0.5-0.5 1.6-7.8 1.2-15.3 1.0-17.9 10.8-2.7 20.3-7.5 27.3-12.5 0.1-0.1 0.3-0.1 0.50 2.9 2.0 5.4 4.3 7.9 8.1 0 0 4.7-6.7 6.4-22.2 11.7-15.3 13.5-31.0 13.5-31.0-2.9 4.6-7.4 7.9-12.6 10.3zm-90.5 151.2c-19.6 0-37.4 8.8-48.3 21.7l3.4 4.2c9.9-12.2 26.6-20.7 44.8-20.7 18.2 0 35.0 8.4 44.8 20.7l3.4-4.2c-10.9-12.9-28.6-21.7-48.3-21.7zm-45.9 2.7c-1.3 1.0-2.8 1.6-4.1 1.4-1.7-0.2-2.7-0.9-4.4-2.9l-9.6-11.8-5.2 4.2 10.5 12.9c2.2 2.7 4.8 4.2 7.8 4.5 0.4 0.0 0.7 0.1 1.1 0.1 2.9 0.0 5.6-1.0 8.2-3.1 2.9-2.4 4.5-5.1 4.9-8.4 0.3-3.0-0.6-5.8-2.8-8.5l-10.5-12.9-5.2 4.2 9.6 11.8v0c1.7 2.0 2.1 3.2 2.0 4.9-0.1 1.3-0.9 2.7-2.2 3.7zm35.5-37.2-16.8 3.4c-0.8 0.2-1.4 0.5-1.8 1.1-0.4 0.6-0.5 1.3-0.3 2.0l3.3 16.5c0.5 2.7 1.7 4.6 3.6 5.7 1.2 0.7 2.7 1.1 4.3 1.1 0.90 1.8-0.1 2.7-0.3l10.5-2.1-1.3-6.2-10.2 2.1c-2.1 0.4-2.8 0.2-3.2-2.2l-0.4-1.8 11.8-2.4-1.2-6.1-11.8 2.4-0.9-4.4 12.9-2.6-1.3-6.2zm32.7 9.0 10.1 2.6 1.6-6.1-10.4-2.7c-5.7-1.5-9.6 0.7-10.9 6.0l-4.2 16.3c-0.2 0.8-0.1 1.5 0.2 2.1 0.3 0.6 0.9 1.0 1.7 1.2l3.8 1.0 2.7-10.5 11.7 3.0 1.6-6.1-11.7-3.0 0.5-1.7c0.6-2.3 1.3-2.5 3.4-2.0zm52.2 14.9 3.6-4.4c-1.8-1.8-3.6-3.5-5.5-5.1-19.9-17.1-45.6-26.6-72.5-26.6-26.9 0-52.6 9.4-72.5 26.6-1.9 1.6-3.8 3.4-5.5 5.1l3.6 4.4c1.8-1.8 3.7-3.6 5.6-5.3 18.9-16.3 43.3-25.2 68.9-25.2s50.0 8.9 68.9 25.2c2.0 1.7 3.8 3.4 5.6 5.3zm-27.1 21.7 1.2-4.0-5.0-3.7 4.0-2.9 2.3 1.7 2.6-8.8-15.2 9.8-6.2-3.5 23.9-15.4c0.9-0.6 2.2-1.1 3.8 0.1l1.0 0.8c1.6 1.2 1.4 2.7 1.1 3.6l-7.9 27.3-5.5-5.0zm-112.5 129.1h-17.6v-13.5h10.5l4.3 3.7h0.1v-13.8h-0.1l-4.3 3.7h-10.5v-11.8h17l4.9 5.3h0.1l-0.6-11.7h-36.3v0.1l3.3 4.0v36.3l-3.3 4.0v0.1h37.8l0.9-13.4h-0.1l-6.2 7.0zm6.7-89.8 12.5 31.8h7.0l11.6-32.2 2.0 28.0-4.4 4.0v0.1h19.0v-0.1l-3.7-4.0-2.7-36.3 2.9-4.0v-0.1h-15.8l-10.7 29.8-11.6-29.8h-16.0v0.1l3.2 4.0-1.9 36.3-3.9 4.0v0.1h15.6v-0.1l-3.9-4.0 0.8-27.7zm-52.5 89.7h-15.3v-33.9l4.2-4.0v-0.1h-18.9v0.1l3.3 4.0v36.3l-3.3 3.9v0.2h35.5l1.7-14.0h-0.1l-7.0 7.5zm-34.2-58.1v0.1h18.0v-0.1l-3.3-4.0v-36.3l3.3-4.0v-0.1h-18.0v0.1l3.2 4.0v13.5h-16.0v-13.5l3.2-4.0v-0.1h-18.0v0.1l3.3 4.0v36.3l-3.3 4.0v0.1h18.0v-0.1l-3.2-4.0v-15.7h16.0v15.7l-3.2 4.0zm280.9 58.1h-17.6v-13.5h10.5l4.3 3.7h0.1v-13.8h-0.1l-4.3 3.7h-10.5v-11.8h17.0l4.9 5.3h0.1l-0.6-11.7h-36.3v0.1l3.3 4.0v36.3l-3.3 4.0v0.1h37.8l0.9-13.4h-0.1l-6.2 7.0zm-161.9-11.3-5.3-17.7-6.2 17.7h11.5zm15.8 13.7 3.7 4.0v0.1h-19.1v-0.1l3.7-4.0-2.0-7.0h-15.8l-2.4 7.0 3.5 4.0v0.1h-15.0v-0.1l3.5-4.0 13.8-36.3-2.6-4.0v-0.1h15.2l13.7 40.5zm-183.2-66.2c-9.2 0-15.0-9.3-15.0-17.3 0-9.9 5.4-16.3 13.0-16.3 2.0 0 4.0 0.2 5.8 0.7l6.9 8.5h0.1l-0.5-14.1c-2.0-0.8-6.3-1.8-11.6-1.8-16.4 0-25.7 11.1-25.7 23.9 0 12.7 9.0 23.8 24.5 23.8 4.2 0 10.3-1.4 14.5-4.6l0.6-7.4h-0.1c-3.6 2.8-8.7 4.5-12.6 4.5zm256.9 5.8-3.2-4.0v-36.3l3.2-4.0v-0.1h-18.0v0.1l3.3 4.0v36.3l-3.3 4.0v0.1h18.0v-0.1zm-39.5 43.7 4.4 4.0v8.4c-1.4 1.6-3.9 3.0-7.2 3.0-7.9 0-12.1-9.6-12.1-17.7 0-8.8 4.4-16.2 13.6-16.2 2.5 0 5.2 0.2 7.4 1.0l7.1 7.6h0.1l-0.4-12.2c-4.1-2.1-9.0-3.0-14.0-3.0-15.0 0-25.7 9.2-25.7 24.4 0 12.7 8.2 23.3 20.9 23.3 5.6 0 10.7-1.3 15.4-4.7l5.6 4.7h0.1v-18.4l3.5-4.0v-0.1h-18.8v0.1zm-11.7-65.3c1.4 0.4 3.0 0.6 4.7 0.6 6.2 0 8.9-3.4 8.9-8.4 0-5.9-3.5-8.7-9.9-8.7h-3.7v16.5zm-11.4 17.5v-36.3l-3.3-4.0v-0.1h21.2c12.8 0 18.7 5.8 18.7 14.7 0 9.2-7.0 14.9-16.5 14.9-3.1 0-6.3-0.2-8.6-0.8v11.6l4.7 4.0v0.1h-19.4v-0.1l3.3-4.0zm106.6-14.9c0-7.7-2.9-20.1-12.8-20.1-7.9 0-10.2 7.9-10.2 13.2 0 7.8 3.2 20.4 12.8 20.4 6.8 0 10.2-6.5 10.2-13.6zm-11.9 20.6c-14.0 0-23.0-11.5-23.0-24.5 0-13.4 10.4-23.2 23.3-23.2 14.3 0 23.5 11.2 23.5 24.0 0 14.6-11.1 23.7-23.8 23.7zm-14.9 18.5 3.7 4.0v25.4c0 7.3-3.6 9.1-9.5 9.1-5.9 0-9.5-1.7-9.5-9.1v-25.4l3.7-4.0v-0.1h-18.4v0.1l3.3 4.0v25.4c0 12.2 6.2 16.6 19.5 16.6 12.1 0 18.2-4.2 18.2-16.3v-25.8l3.2-4.0v-0.1h-14.2v0.1zm85.2 5.5c0-3.2-2.4-5.6-5.5-5.6-3.1 0-5.5 2.4-5.5 5.6 0 3.2 2.4 5.6 5.5 5.6 3.0 0 5.5-2.4 5.5-5.6zm1.4 0c0 3.9-3.1 6.7-6.8 6.7-3.7 0-6.8-2.8-6.8-6.7 0-3.8 3.1-6.7 6.8-6.7 3.7 0 6.8 2.8 6.8 6.7zm-6.8-0.5c1.0 0 1.9-0.1 1.9-1.2 0-1.0-0.9-1.1-1.7-1.1h-1.6v2.4h1.4zm1.1 0.9 2.2 3.4h-1.3l-2.0-3.4h-1.4v3.4h-1.2v-7.7h3.0c1.8 0 2.7 0.7 2.7 2.2 0 1.4-0.9 2.0-2.0 2.1zm-2.9-70.4 4.3 4.0v23.6l-18.1-27.8h-16.3v0.1l3.3 4.0v36.3l-3.3 4.0v0.1h14.9v-0.1l-4.4-4.0v-29.6l22.6 33.7h8.5v-40.5l3.3-4.0v-0.1h-14.8v0.1zm45.5 17.0c-8.1-2.3-10.6-3.2-10.6-7.0 0-4.3 5.6-5.1 9.1-5.1 3.0 0 5.7 0.3 8.2 1.1l6.8 7.3h0.1l-0.6-12.6c-4.2-1.6-8.7-2.5-13.8-2.5-10.7 0-20.9 3.7-20.9 14.2 0 6.8 4.7 10.9 15.0 13.7 7.9 2.2 11.8 3.6 11.8 7.6 0 4.6-5.9 5.6-9.9 5.6-3.3 0-6.3-0.5-8.8-1.3l-6.8-8.4h-0.1l0.5 13.4c4.7 2.1 10.3 2.9 15.6 2.9 11.4 0 21.0-4.8 21.0-14.4 0-9.1-6.3-11.7-16.6-14.6zm-309.7 9.6h11.5l-5.3-17.7-6.2 17.7zm-1.3 17.8h-15.0v-0.1l3.5-4.0 13.8-36.3-2.6-4.0v-0.1h15.2l13.7 40.5 3.7 4.0v0.1h-19.1v-0.1l3.7-4.0-2.0-7.0h-15.8l-2.4 7.0 3.5 4.0v0.1z";
export const UCL_LOGO_CHIP = '<svg viewBox="117 0 206 204" aria-hidden="true" focusable="false"><path fill="#3b5fad" d="' + UCL_STARBALL_D + '"/></svg>';
// v13.12 UCL_BALL (white-on-navy starball variant) — REMOVED in v13.46-trim:
// zero references anywhere (public.ts uses UCL_LOGO_CHIP); it dragged a 4KB
// path string through every deploy. UCL_STARBALL_D stays — it feeds the live chip.
