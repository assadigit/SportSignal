// SportSignal — the sportscore.com provider: the per-day/per-competition
// fixture fetch (sportScoreDay) + the day-window sweep (fetchSportScore)
// with the 44-metered-subrequest budget-stop and the provider-suspension
// circuit. sportScoreDay is exported for provider-cups (the far probe
// rides it). Extracted from providers.ts in v13.74-providersplit.
import { CONFIG } from "./config";
import { SPORTSCORE_SLUGS } from "./tables";
import type { Env } from "./types";
import { fetchJSON, subrequestCount } from "./utils";
import { mapStageName } from "./match-model";
import { providerSuspended, suspendProvider } from "./provider-breaker";

// v13.74-providersplit: exported again — provider-cups (the far probe) and
// the long view (providers.ts) call it. Internal in spirit: only provider
// modules import it.
export async function sportScoreDay(code, slug, dateStr, acc) {
  const data = await fetchJSON("https://sportscore.com/api/v1/fixtures/?sport=football&date=" + dateStr + "&competition=" + slug + "&limit=200");
  let added = 0;
  for (const e of data && data.matches || []) {
    const utcDate = e.time ? new Date(e.time).toISOString() : null;
    if (!utcDate) continue;
    const dedupeKey = code + "|" + e.home + "|" + e.away + "|" + utcDate.slice(0, 16);
    if (acc.seen.has(dedupeKey)) continue;
    acc.seen.add(dedupeKey);
    added++;
    const status = e.status === "finished" ? "FINISHED" : e.status === "live" ? "LIVE" : "SCHEDULED";
    const inPlay = status !== "SCHEDULED";
    acc.list.push({
      id: "spsc-" + dateStr + "-" + code + "-" + acc.list.length,
      utcDate,
      status,
      stage: mapStageName(""),
      roundRaw: e.round_name || e.round || e.stage || "",
      competition: { code },
      homeTeam: { name: e.home, crest: e.home_logo || null },
      awayTeam: { name: e.away, crest: e.away_logo || null },
      // sportscore supplies a 0-0 default score for scheduled matches — never
      // store a pre-kickoff score in the shared pool (it would leak into UI/bot).
      score: inPlay ? { fullTime: { home: parseInt(e.home_score) || 0, away: parseInt(e.away_score) || 0 } } : null
    });
  }
  return added;
}
export async function fetchSportScore(env: Env, opts?) {
  // v13.43-cpukeeper: opts narrows the day window for the cheap LIVE sweep
  // (yesterday + today). Default (no opts) keeps the full-sweep window
  // [now-24h, now+24h] exactly as before.
  // v13.53-standsteady (backlog R6): opts.slugs narrows the COMPETITION set
  // too — the live sweep passes only the leagues that actually have a
  // live/imminent/just-finished pool match (see fetchLiveSweep). The full
  // sweep (no slugs) keeps fetching every eligible slug — fixture discovery
  // stays its job.
  const fromDays = opts && opts.fromDays != null ? opts.fromDays : 1;
  const toDays = opts && opts.toDays != null ? opts.toDays : 1;
  const onlySlugs = opts && Array.isArray(opts.slugs) && opts.slugs.length ? new Set(opts.slugs) : null;
  const matches = [];
  const seen = new Set();
  if (await providerSuspended(env, "sportscore")) {
    console.log("\u23ED\uFE0F sportscore suspended (recent sweep failed) \u2014 skipping day sweep");
    return matches;
  }
  const inSeason = (code) => {
    const s = CONFIG.SEASON_STARTS && CONFIG.SEASON_STARTS[code];
    return !s || new Date() >= new Date(s);
  };
  const slugs = Object.fromEntries(
    Object.entries(SPORTSCORE_SLUGS).filter(
      ([code]) => onlySlugs ? onlySlugs.has(code) && (code !== "AL" || inSeason(code)) : code === "EL" || code === "ECL" || code === "BL1" || code === "FA_CUP" || code === "EFL_CUP" || code === "CDR" || code === "COPPA_ITALIA" || code === "PGL" || code === "AL" && inSeason(code)
    )
  );
  if (!Object.keys(slugs).length) return matches;
  const from = new Date(Date.now() - fromDays * 864e5);
  const to = new Date(Date.now() + toDays * 864e5);
  const acc = { list: matches, seen };
  let calls = 0, failures = 0;
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    for (const [code, slug] of Object.entries(slugs)) {
      // v13.54.1-poolbreak: hard budget-stop inside the day-loop. The
      // full-sweep fan-out (9 codes × 3 days = 27 calls on top of FD+TSP)
      // crossed Cloudflare's real ~50-subrequest ceiling mid-loop on
      // 2026-09-30 — the remaining calls failed with CF's "Too many
      // subrequests" (not our local throw), TSP never got budget, the
      // sweep returned 0 matches, and the pool stayed dead. Stopping at
      // 44 metered (now accurate — fetchJSON bumps per attempt) leaves
      // the loop's failures < calls so the provider-suspension check
      // below can't misfire on budget stops.
      if (subrequestCount() >= 44) {
        console.log(`\u23ED\uFE0F sportscore day sweep budget-stopped at ${calls}/${calls + 1} calls (${subrequestCount()}/48 metered)`);
        calls = calls || 1; // never 0: report the stop as a partial sweep
        return matches;
      }
      calls++;
      try {
        await sportScoreDay(code, slug, dateStr, acc);
      } catch (e) {
        failures++;
        console.error(`\u274C sportscore day ${code} ${dateStr} failed: ${e.message}`);
      }
    }
  }
  if (calls > 0 && failures === calls) {
    console.error("\u26A0\uFE0F sportscore: all " + calls + " day-calls failed \u2014 suspending provider");
    await suspendProvider(env, "sportscore");
  }
  return matches;
}
