// SportSignal — the match model rules: notification eligibility
// (shouldNotify), big-match/derby/master-pair classification, notification
// time windows, KV notified-match tracking, stage mapping, provider date parse.


import { CONFIG } from "./config";
import type { Env } from "./types";
import { normalizeTeamName } from "./teams.js";
import { matchKey } from "./dedupe.js";
import { vlog, getNowUTC } from "./utils";
import { isDomesticCup, isQuarterFinalOrLater } from "./translate";
import { masterTeamList, masterMemo } from "./users";

// v13.27-dedupe-fix: in-memory dedupe fallback. When KV writes fail (quota
// exhausted — the free tier has a 1,000 writes/day limit), saveNotifiedMatch
// can't persist the dedupe record. Without it, shouldSendNotification returns
// true every sweep → the same notification re-sends forever (the "bot is
// spamming" bug). This Set is the fallback: it lives for the isolate's
// lifetime (survives across requests within the same Worker isolate), so
// within a single cron sweep the dedupe works even when KV is down. Across
// isolates (different cron invocations) it resets, but the execution lock
// (24h TTL) prevents concurrent sweeps, so the same isolate handles both.
var MEM_DEDUPE = new Set<string>();

export async function getNotifiedMatches(env: Env) {
  try {
    // v13.5-sim-scope: request-scoped override (set only by /api/simulate's
    // cloned env) — the shared CONFIG is never mutated at runtime.
    const data: any = await env.STATE.get(env.SIM_NOTIFIED_KEY || CONFIG.KV_NOTIFIED_KEY, "json");
    return data || {};
  } catch (error) {
    console.log("No notified matches found, starting fresh");
    return {};
  }
}
export async function saveNotifiedMatch(env: Env, match, notificationType, notifiedMatches: any) {
  const now = Date.now();
  const matchTime = new Date(match.utcDate).getTime();
  const key = matchKey(match);
  let expiresAt;
  switch (notificationType) {
    case "pre-match-24h":
    case "pre-match-3h":
    case "pre-match-1h":
      expiresAt = matchTime + CONFIG.ONE_HOUR_MS;
      break;
    case "match-start":
      expiresAt = matchTime + CONFIG.TWO_HOURS_MS;
      break;
    case "result":
      expiresAt = now + CONFIG.ONE_DAY_MS;
      break;
    default:
      expiresAt = matchTime + CONFIG.ONE_HOUR_MS;
  }
  if (!notifiedMatches[key]) {
    notifiedMatches[key] = [];
  }
  notifiedMatches[key] = notifiedMatches[key].filter((n) => now < n.expiresAt);
  notifiedMatches[key].push({
    matchId: key,
    notifiedAt: now,
    expiresAt,
    matchDate: match.utcDate,
    notificationType
  });
  const allNotifications: any[] = Object.values(notifiedMatches || {}).flat();
  const overallExpiresAt = allNotifications.length > 0 ? Math.max(...allNotifications.map((n) => n.expiresAt)) : now + CONFIG.ONE_DAY_MS;
  const ttlSeconds = Math.ceil((overallExpiresAt - now) / 1e3);
  vlog(`\u{1F4BE} Saving notification: match=${key}, type=${notificationType}, total_tracked=${Object.keys(notifiedMatches).length}, ttl=${ttlSeconds}s`);
  // v13.27-dedupe-fix: ALWAYS record in the in-memory Set first (even if KV
  // fails). This prevents re-sending within the same isolate (the same cron
  // sweep processes multiple matches — if the KV write fails for one, the
  // next sweep would re-send it). The key is matchKey + ":" + notificationType.
  MEM_DEDUPE.add(key + ":" + notificationType);
  try {
    await env.STATE.put(
      env.SIM_NOTIFIED_KEY || CONFIG.KV_NOTIFIED_KEY,
      JSON.stringify(notifiedMatches),
      { expirationTtl: ttlSeconds > 0 ? ttlSeconds : 3600 }
    );
  } catch (e) {
    // KV write failed (quota exhausted, network) — the in-memory Set is the
    // fallback. Log so the admin knows KV is failing.
    console.error("Notification state KV save failed (in-memory dedupe active): " + e.message);
  }
}
export async function shouldSendNotification(env: Env, match, notificationType, notifiedMatches) {
  const now = Date.now();
  const key = matchKey(match);
  // v13.27-dedupe-fix: check the in-memory Set FIRST (covers the case where
  // KV writes are failing — without this, every sweep re-sends because the
  // KV dedupe record was never persisted).
  if (MEM_DEDUPE.has(key + ":" + notificationType)) {
    return false;
  }
  if (notifiedMatches[key]) {
    const existingNotification = notifiedMatches[key].find(
      (n) => n.notificationType === notificationType && now < n.expiresAt
    );
    if (existingNotification) {
      const timeAgo = ((now - existingNotification.notifiedAt) / CONFIG.ONE_HOUR_MS).toFixed(1);
      console.log(`\u23ED\uFE0F Skipping ${notificationType} for match ${key}: Already sent ${timeAgo}h ago`);
      return false;
    }
  }
  switch (notificationType) {
    case "pre-match-72h":
      return isWithinBigMatchWindow(match, env) || isBackfillEligible(match, "pre-match-72h", env);
    case "pre-match-24h":
      return isWithin24HourWindow(match, env) || isBackfillEligible(match, "pre-match-24h", env);
    case "pre-match-3h":
      return isWithin3HourWindow(match, env) || isBackfillEligible(match, "pre-match-3h", env);
    case "pre-match-1h":
      return isWithin1HourWindow(match, env) || isBackfillEligible(match, "pre-match-1h", env);
    case "pre-match-5min":
      return isWithin5MinWindow(match, env) || isBackfillEligible(match, "pre-match-5min", env);
    case "match-start":
      return isMatchStartingNow(match, env) || isMatchStartBackfillEligible(match, env);
    case "result":
      return isMatchFinished(match) && isWithinPostMatchWindow(match, env) || isBackfillEligible(match, "result", env);
    default:
      return false;
  }
}
export function isWithin24HourWindow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  if (matchTime <= now) return false;
  const hoursUntilMatch = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
  return hoursUntilMatch <= 24 && hoursUntilMatch >= 20;
}
export function isWithinBigMatchWindow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  if (matchTime <= now) return false;
  const hoursUntilMatch = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
  return hoursUntilMatch <= CONFIG.BIG_MATCH_NOTIFICATION_HOURS && hoursUntilMatch >= CONFIG.BIG_MATCH_NOTIFICATION_HOURS - 4;
}
export function isWithin3HourWindow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  if (matchTime <= now) return false;
  const hoursUntilMatch = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
  return hoursUntilMatch <= 3.5 && hoursUntilMatch >= 2.5;
}
export function isWithin1HourWindow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  if (matchTime <= now) return false;
  const hoursUntilMatch = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
  return hoursUntilMatch <= 1.5 && hoursUntilMatch >= 0.75;
}
// v12.x-cron-gaps: 5-minute "kickoff now" reminder window. Fires for BIG
// matches only (both teams big), 1-10 minutes before kickoff. The 10-min
// width matches the cron tick cadence so the sweep catches the window at
// least once (worst case the reminder lands ~1 min before kickoff).
export function isWithin5MinWindow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  if (matchTime <= now) return false;
  const minutesUntilMatch = (matchTime.getTime() - now.getTime()) / (60 * 1e3);
  return minutesUntilMatch > 0 && minutesUntilMatch <= 10;
}
export function isMatchStartingNow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  const minutesSinceKickoff = (now.getTime() - matchTime.getTime()) / (60 * 1e3);
  // v13.15-reliability: widened from -1..+20min to -1..+45min. The cron
  // ticks every 10min, so the old 21-min window only covered 2 ticks — if
  // one tick was skipped (or busy), the match-start never fired. 46min
  // covers ~5 ticks, so even with 2 skipped ticks the match-start lands.
  // (Also matches the budget-guard exemption in sendMatchNotifications.)
  if (minutesSinceKickoff < -1 || minutesSinceKickoff > 45) return false;
  const status = String(match.status || "").toUpperCase();
  return status !== "FINISHED" && status !== "POSTPONED" && status !== "SUSPENDED" && status !== "CANCELLED" && status !== "CANCEL";
}
export function isWithinPostMatchWindow(match, _env) {
  if (!isMatchFinished(match)) return false;
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  const hoursSinceMatch = (now.getTime() - matchTime.getTime()) / CONFIG.ONE_HOUR_MS;
  return hoursSinceMatch <= CONFIG.POST_MATCH_NOTIFICATION_HOURS;
}
export function isBackfillEligible(match, type, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  if (type === "result") {
    if (!isMatchFinished(match)) return false;
    const hoursSince = (now.getTime() - matchTime.getTime()) / CONFIG.ONE_HOUR_MS;
    return hoursSince > CONFIG.POST_MATCH_NOTIFICATION_HOURS && hoursSince <= 24;
  }
  if (matchTime <= now) return false;
  const hoursUntil = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
  // v13.9-reliability: backfill now covers ALL pre-match types, including
  // 5min + match-start. Previously these two returned undefined floors → no
  // backfill → a single skipped cron run lost the reminder forever. Now a
  // missed 5min/match-start fires late on the next sweep (with the "late"
  // tag) instead of vanishing. The floor keeps a small guard so we don't
  // fire 5min at 0.5min (already kickoff) or match-start at kickoff+19min
  // (near the window edge — would be a noisy late duplicate).
  const floors = { "pre-match-24h": 3.5, "pre-match-3h": 1.5, "pre-match-1h": 10 / 60, "pre-match-72h": CONFIG.BIG_MATCH_NOTIFICATION_HOURS - 24, "pre-match-5min": 2 / 60 };
  const maxes = { "pre-match-24h": 24, "pre-match-3h": 3.5, "pre-match-1h": 1.5, "pre-match-72h": CONFIG.BIG_MATCH_NOTIFICATION_HOURS, "pre-match-5min": 10 / 60 };
  const floor = floors[type];
  const max = maxes[type];
  if (floor === void 0) return false;
  return hoursUntil <= max && hoursUntil > floor;
}
// v13.9-reliability #8: time-based result fallback. If a match's utcDate is
// >90min past AND the status is still SCHEDULED/TIMED (provider hasn't
// reported FINISHED yet — all providers down or slow), treat it as
// "presumably finished" so the result notification fires (with score
// pending) instead of waiting for a provider that may not recover. When
// the provider recovers, the real score updates the snapshot.
// v13.20-fix: IN_PLAY + PAUSED are EXCLUDED — those mean the match is
// actively being played (extra time, stoppage time, half-time). The
// fallback should ONLY fire when the provider hasn't even started
// reporting the match as live (SCHEDULED/TIMED at 90+min = provider is
// genuinely down, not "the match is in extra time").
export function isPresumablyFinished(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  const minutesSince = (now.getTime() - matchTime.getTime()) / (60 * 1e3);
  // v13.20: widened to 150min (football matches with extra time can run
  // to ~120min; stoppage time + delays can push to ~130min). 150min gives
  // a safe margin so we don't fire during a legitimately long match.
  if (minutesSince < 150) return false;
  const status = String(match.status || "").toUpperCase();
  // ONLY SCHEDULED/TIMED — the provider hasn't started reporting live at all.
  // IN_PLAY/PAUSED mean the match is actively being played (NOT finished).
  return status === "SCHEDULED" || status === "TIMED";
}
// v13.9-reliability #2: match-start backfill. The match-start window
// (isMatchStartingNow) only fires within -1..+20min of kickoff. If the cron
// missed that window, the start notification was lost. This backfill lets
// a late sweep fire a match-start reminder up to 30min after kickoff
// (with the "late" tag) so the user at least knows the match started.
export function isMatchStartBackfillEligible(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  const minutesSince = (now.getTime() - matchTime.getTime()) / (60 * 1e3);
  if (minutesSince < 20 || minutesSince > 30) return false;
  const status = String(match.status || "").toUpperCase();
  return status !== "FINISHED" && status !== "POSTPONED" && status !== "CANCELLED" && status !== "SUSPENDED";
}
export function isMatchFinished(match) {
  return match.status === "FINISHED" || isPresumablyFinished(match, null);
}
export async function cleanupExpiredNotifications(env: Env) {
  const hourStamp = Math.floor(Date.now() / 36e5);
  const lastCleanup = parseInt(await env.STATE.get("cleanup_hour").catch(() => null)) || 0;
  if (lastCleanup === hourStamp) return;
  const notifiedMatches: Record<string, any> = await getNotifiedMatches(env);
  const now = Date.now();
  let cleanedCount = 0;
  for (const [matchId, notifications] of Object.entries(notifiedMatches)) {
    const validNotifications = notifications.filter((n) => now < n.expiresAt);
    if (validNotifications.length !== notifications.length) {
      cleanedCount += notifications.length - validNotifications.length;
      if (validNotifications.length > 0) {
        notifiedMatches[matchId] = validNotifications;
      } else {
        delete notifiedMatches[matchId];
      }
    }
  }
  if (cleanedCount > 0) {
    const allNotifications: any[] = Object.values(notifiedMatches || {}).flat();
    const maxExpiry = allNotifications.length > 0 ? Math.max(...allNotifications.map((n) => n.expiresAt)) : now + 36e5;
    const ttl = Math.max(3600, Math.ceil((maxExpiry - now) / 1e3));
    try {
      await env.STATE.put(
        env.SIM_NOTIFIED_KEY || CONFIG.KV_NOTIFIED_KEY,
        JSON.stringify(notifiedMatches),
        // ✅ Must be string for KV
        { expirationTtl: ttl }
      );
    } catch (e) {
      console.error("Notification cleanup write failed: " + e.message);
    }
    console.log(`\u{1F9F9} Cleaned up ${cleanedCount} expired notifications`);
  }
  await env.STATE.put("cleanup_hour", String(hourStamp), { expirationTtl: 2 * 36e5 }).catch(() => {
  });
}
export function shouldNotify(match) {
  const compCode = match.competition.code;
  const normHome = normAlias(match.homeTeam.name);
  const normAway = normAlias(match.awayTeam.name);
  let c = CONFIG.__teamNorm;
  if (!c || c.sig !== CONFIG.BIG_TEAMS_BY_LEAGUE) {
    const all = new Set();
    const byLeague = {};
    for (const [lg, list] of Object.entries(CONFIG.BIG_TEAMS_BY_LEAGUE) as any) {
      const normList = new Set();
      for (const t of list) {
        const n = normalizeTeamName(t);
        normList.add(n);
        all.add(n);
      }
      byLeague[lg] = normList;
    }
    c = { sig: CONFIG.BIG_TEAMS_BY_LEAGUE, all, byLeague };
    CONFIG.__teamNorm = c;
  }
  if (compCode === "CL" || isDomesticCup(compCode)) {
    if (c.all.has(normHome) || c.all.has(normAway)) {
      return true;
    }
    if (isQuarterFinalOrLater(match.stage)) {
      return true;
    }
    return false;
  }
  const leagueTeams = c.byLeague[compCode];
  return !!(leagueTeams && (leagueTeams.has(normHome) || leagueTeams.has(normAway)));
}
var BIG_MATCH_TEAMS = [
  // England
  "Arsenal FC",
  "Chelsea FC",
  "Chelsea",
  "Manchester City FC",
  "Manchester United FC",
  "Liverpool FC",
  "Manchester City",
  "Manchester United",
  // Italy
  "AC Milan",
  "Inter Milan",
  "Milan",
  "Inter",
  // Spain
  "FC Barcelona",
  "Real Madrid CF",
  "Atl\xE9tico Madrid",
  "Barcelona",
  "Real Madrid",
  "Atletico Madrid",
  "Atleti",
  // Germany (BL1 now monitored + UEFA cups)
  "FC Bayern M\xFCnchen",
  "Bayern Munich",
  "Bayern M\xFCnchen",
  "Borussia Dortmund",
  "Dortmund",
  // Australia (A-League)
  "Melbourne Victory",
  "Melbourne City",
  "Sydney FC",
  "Western Sydney Wanderers",
  "Adelaide United"
];
var BIG_MATCH_UEFA = BIG_MATCH_TEAMS.concat(["Paris Saint-Germain", "PSG"]);
export function isFeaturedMatch(match) {
  const code = match.competition.code;
  const isUefa = code === "CL" || code === "EL" || code === "ECL" || isDomesticCup(code);
  const pool: any = isUefa ? BIG_MATCH_UEFA : BIG_MATCH_TEAMS;
  if (!pool.__normSet) pool.__normSet = new Set(pool.map(normalizeTeamName));
  const nset = pool.__normSet;
  return nset.has(normAlias(match.homeTeam.name)) && nset.has(normAlias(match.awayTeam.name));
}
var TEAM_ALIASES = {
  "clubatleticodemadrid": "atleticomadrid",
  "atleticodemadrid": "atleticomadrid",
  "internazionale": "intermilan",
  "internazionalemilano": "intermilan",
  // v12.15: the English exonym "Bayern Munich" folds to the German legal
  // name — NFD diacritics-folding turns München into "Munchen", not
  // "Munich", so without this alias the SAME club could sit twice in a
  // selected-teams list (the reported duplicate) and never match the other
  // spelling's fixtures.
  "bayernmunich": "bayernmunchen"
};
export function normAlias(name) {
  const n = normalizeTeamName(name);
  return TEAM_ALIASES[n] || n;
}
export function isDomesticLeagueCode(code) {
  const by = CONFIG.BIG_TEAMS_BY_LEAGUE || {};
  return !!by[code] && code !== "CL" && code !== "EL" && code !== "ECL";
}
export function isMasterPair(match) {
  masterTeamList();
  const nset = masterMemo.normSet;
  return nset.has(normAlias(match.homeTeam.name)) && nset.has(normAlias(match.awayTeam.name));
}
export function hasSelectedTeam(match) {
  masterTeamList();
  const nset = masterMemo.normSet;
  return nset.has(normAlias(match.homeTeam.name)) || nset.has(normAlias(match.awayTeam.name));
}
export function isMasterClash(match) {
  return isDomesticLeagueCode(match.competition.code) && isMasterPair(match);
}
var DERBY_PAIRS = [
  // El Clásico
  ["Real Madrid CF", "FC Barcelona"],
  // Manchester derby
  ["Manchester City FC", "Manchester United FC"],
  // North London derby
  ["Arsenal FC", "Tottenham Hotspur FC"],
  // Merseyside derby
  ["Liverpool FC", "Everton FC"],
  // Derby della Madonnina
  ["AC Milan", "Inter Milan"],
  // Der Klassiker
  ["FC Bayern M\xFCnchen", "Borussia Dortmund"],
  // Madrid derby
  ["Atl\xE9tico Madrid", "Real Madrid CF"],
  // Le Classique
  ["Paris Saint-Germain", "Olympique de Marseille"]
];
var DERBY_NORM = DERBY_PAIRS.map(function(p) {
  return [normalizeTeamName(p[0]), normalizeTeamName(p[1])];
});
export function isDerby(match) {
  const h = normAlias(match.homeTeam.name);
  const a = normAlias(match.awayTeam.name);
  return DERBY_NORM.some((p) => h === p[0] && a === p[1] || h === p[1] && a === p[0]);
}
export function mapStageName(stage) {
  const s = String(stage || "").toLowerCase();
  if (s.includes("quarter")) return "QUARTER_FINALS";
  if (s.includes("semi")) return "SEMI_FINALS";
  if (s.includes("final")) return "FINAL";
  if (s.includes("third") || s.includes("3rd")) return "THIRD_PLACE";
  return "REGULAR_SEASON";
}
export function parseTSPDate(dateStr, timeStr, tsStr) {
  if (tsStr) {
    const d2 = new Date(tsStr);
    if (!isNaN(d2.getTime())) return d2.toISOString();
  }
  if (!dateStr) return null;
  const d = new Date(dateStr + "T" + (timeStr || "12:00:00") + "Z");
  return isNaN(d.getTime()) ? null : d.toISOString();
}
export function isLiveStatus(status) {
  const s = String(status || "").toUpperCase();
  return s === "LIVE" || s === "IN_PLAY" || s === "PAUSED";
}
