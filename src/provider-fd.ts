// SportSignal — the football-data.org provider: the leagues+CL range fetch
// (fetchFootballData) with 429 detection → provider suspension. Extracted
// from providers.ts in v13.74-providersplit.
import { CONFIG } from "./config";
import type { Env } from "./types";
import { fetchWithRetry, fdRateLimited } from "./utils";
import { providerSuspended, suspendProvider } from "./provider-breaker";

export async function fetchFootballData(env: Env, opts?) {
  // v13.43-cpukeeper: opts narrows the date range (and skips the intl
  // calls) for the cheap LIVE sweep — ±2 days covers every live/just-
  // finished/just-starting worthy match at a fraction of the parse CPU of
  // the default 10-day range. Default (no opts) = the full-sweep behavior.
  // v13.44-quotaguard (F5): mirror of the sportscore circuit — a 429-
  // exhausted sweep suspends FD for PROVIDER_SUSPEND_MS so the rest of this
  // sweep and the next ticks skip straight to the other providers + the KV
  // pool instead of burning subrequests into the same exhausted quota
  // minute (football-data free tier: 10 req/min).
  if (await providerSuspended(env, "football-data")) {
    console.log("\u23F8\uFE0F football-data suspended \u2014 skipping FD calls this sweep");
    return [];
  }
  const pastDays = opts && opts.pastDays != null ? opts.pastDays : CONFIG.DAYS_IN_PAST;
  const futureDays = opts && opts.futureDays != null ? opts.futureDays : CONFIG.DAYS_IN_FUTURE;
  const liveMode = !!(opts && opts.live);
  const dateFrom = new Date(Date.now() - pastDays * 864e5).toISOString().split("T")[0];
  const dateTo = new Date(Date.now() + futureDays * 864e5).toISOString().split("T")[0];
  const fdLeagues = CONFIG.LEAGUES.filter((c) => !["EL", "ECL"].includes(c));
  // v13.43-cpukeeper: print the ACTUAL range length (live sweeps are ±2d, not
  // the config's 10-day total).
  console.log(`\u{1F4C5} Date range: ${dateFrom} to ${dateTo} (${pastDays + futureDays} days${liveMode ? ", live sweep" : `, ${CONFIG.DATE_RANGE_DAYS} total`})`);
  const allMatches = [];
  const seen = new Set();
  const pushUnique = (list) => {
    for (const m of list) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        allMatches.push(m);
      }
    }
  };
  try {
    const u = `${CONFIG.API_URL}?competitions=${fdLeagues.join(",")}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
    const m = await fetchWithRetry(u, env.API_TOKEN, liveMode ? "Leagues+CL (live)" : "Leagues+CL");
    console.log(`\u2705 Leagues+CL${liveMode ? " (live)" : ""}: ${m.length} matches`);
    pushUnique(m);
  } catch (error) {
    console.error(`\u274C Failed to fetch league matches:`, error.message);
  }
  // v13.44-quotaguard (F5): a rate-limited main call means the quota window
  // is exhausted — suspending beats retrying the intl calls into the same
  // window (each would 429, wait, and fail too).
  if (fdRateLimited()) {
    await suspendProvider(env, "football-data");
    console.warn(`\u23F8\uFE0F football-data rate-limited \u2014 suspended ${Math.round(CONFIG.PROVIDER_SUSPEND_MS / 6e4)}min (Retry-After honored; intl calls skipped this sweep; pool + other providers cover)`);
    return allMatches;
  }
  // Intl competitions: full sweeps only — live-worthy intl fixtures are rare
  // and each competition costs a subrequest + parse (v13.43-cpukeeper).
  if (liveMode) return allMatches;
  for (const [code, id] of Object.entries(CONFIG.INTL_COMPETITIONS)) {
    try {
      const u = `${CONFIG.API_URL}?competitions=${id}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
      const m = await fetchWithRetry(u, env.API_TOKEN, "Intl " + code);
      pushUnique(m.map((match) => match.competition ? { ...match, competition: { ...match.competition, code } } : match));
      console.log(`\u2705 Intl ${code}: ${m.length} matches`);
    } catch (e) {
      console.error(`\u274C Intl ${code} fetch failed: ${e.message}`);
    }
  }
  console.log(`\u2705 Found ${allMatches.length} matches total`);
  return allMatches;
}
