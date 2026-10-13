// SportSignal — the match model rules: notification eligibility
// (shouldNotify), big-match/derby/master-pair classification, notification
// time windows, KV notified-match tracking, stage mapping, provider date parse.


import { CONFIG } from "./config";
import type { Env } from "./types";
import { normalizeTeamName } from "./teams";
import { matchKey } from "./dedupe";
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
    const data = await env.STATE.get(env.SIM_NOTIFIED_KEY || CONFIG.KV_NOTIFIED_KEY, "json");
    return data || {};
  } catch (error) {
    console.log("No notified matches found, starting fresh");
    return {};
  }
}
// v13.42-rekindle: returns true iff the dedupe record PERSISTED. The caller
// gates the send on this — a failed KV save defers the send to the next tick
// (fail-closed) instead of sending unrecorded. MEM_DEDUPE is only seeded on
// success: a failed save must leave the notification retryable, and with the
// send now gated on the save there is nothing to double-send within the
// isolate anyway (the old MEM-on-failure add would have blocked the retry
// for the isolate's whole lifetime = permanent silent loss).
export async function saveNotifiedMatch(env: Env, match, notificationType, notifiedMatches) {
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
    case "match-start-big":
      expiresAt = matchTime + CONFIG.TWO_HOURS_MS;
      break;
    case "result":
    case "result-big":
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
  // v13.38-qc: size cap — MEM_DEDUPE lives for the isolate's lifetime and
  // nothing removed entries; a long-lived isolate on a busy season grows it
  // without bound. 4000 entries ≈ months of matchdays; past that, clear
  // (safe: the KV record is the real never-expire line, this is the
  // write-outage fallback).
  if (MEM_DEDUPE.size > 4000) MEM_DEDUPE.clear();
  try {
    await env.STATE.put(
      env.SIM_NOTIFIED_KEY || CONFIG.KV_NOTIFIED_KEY,
      JSON.stringify(notifiedMatches),
      { expirationTtl: ttlSeconds > 0 ? ttlSeconds : 3600 }
    );
    MEM_DEDUPE.add(key + ":" + notificationType);
    return true;
  } catch (e) {
    // KV write failed (quota exhausted, network) — the caller defers the
    // send to the next tick (fail-closed): nothing sent, nothing lost, and
    // the retry sees no record. Log so the admin knows KV is failing.
    console.error("Notification state KV save failed — send deferred to next tick (fail-closed anti-spam): " + e.message);
    return false;
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
  // v13.36-nospam THE LINE: once an event has fired, it never fires again —
  // regardless of the record's expiresAt. Previously a record that expired
  // mid-window (e.g. the old kickoff+1h default for "result-big" inside the
  // 6h post-match window) silently RE-ARMED the send and the notification
  // spammed every sweep. expiresAt is now purely KV-size hygiene: every
  // type's expiry is >= its window's end, so cleanup can never purge a
  // record whose window is still open.
  if (notifiedMatches[key]) {
    const existingNotification = notifiedMatches[key].find(
      (n) => n.notificationType === notificationType
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
      // v13.42-rekindle: agree with the gate above — window OR the new
      // isBackfillEligible("match-start") branch. (The v13.9
      // `|| isMatchStartBackfillEligible` OR-leg sat here all along but
      // was UNREACHABLE: the sendNotificationIfNeeded gate had no
      // match-start entry and always returned false first.)
      return isMatchStartingNow(match, env) || isBackfillEligible(match, "match-start", env);
    case "result":
      return isMatchFinished(match) && isWithinPostMatchWindow(match, env) || isBackfillEligible(match, "result", env);
    // v13.36-nospam: the big-match broadcast types were NEVER checked here
    // (the broadcast code sent first and only saved after) — a finished
    // master big-match re-sent its FT to all non-followers on EVERY tick of
    // the 6h post window (up to 36 copies) and the kickoff broadcast did the
    // same across its whole -1..+45min window. Both now dedupe like every
    // other type.
    case "match-start-big":
      return isMatchStartingNow(match, env);
    case "result-big":
      return isMatchFinished(match) && isWithinPostMatchWindow(match, env);
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
  // v13.42-rekindle: the REAL match-start backfill. The v13.9 rescue
  // (isMatchStartBackfillEligible, [20-30min]) was wired into
  // shouldSendNotification — a layer sendNotificationIfNeeded can never
  // reach once its own window/backfill gate returned false, and this
  // function had NO match-start entry (floor === undefined → always
  // false) — dead code on BOTH layers. Observed live 2026-09-14:
  // Torino-Roma kicked off while the SA pool missed it for every
  // in-window tick; the [-1..+45min] window closed with zero record and
  // every backstop hollow. Now: if the live window was missed entirely,
  // fire the start reminder LATE while the match is still live
  // (IN_PLAY/PAUSED/LIVE) up to 3h after kickoff; once FINISHED the
  // result notification covers it — never a "match started" for a
  // finished match.
  if (type === "match-start") {
    const minutesSince = (now.getTime() - matchTime.getTime()) / (60 * 1e3);
    if (minutesSince < 45 || minutesSince > 180) return false;
    return isLiveStatus(match.status);
  }
  if (type === "result") {
    if (!isMatchFinished(match)) return false;
    const hoursSince = (now.getTime() - matchTime.getTime()) / CONFIG.ONE_HOUR_MS;
    return hoursSince > CONFIG.POST_MATCH_NOTIFICATION_HOURS && hoursSince <= 24;
  }
  if (matchTime <= now) return false;
  const hoursUntil = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
  // v13.9-reliability, amended v13.42: backfill covers ALL pre-match types.
  // (match-start moved to its own branch above — it is past-kickoff and
  // live-status-gated, so the hoursUntil table below never applied to it
  // correctly.) The floor keeps a small guard so we don't fire 5min at
  // 0.5min (already kickoff).
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
// (v13.9 #2 match-start backfill retired in v13.42-rekindle — its logic lives
// in the isBackfillEligible "match-start" branch, where it can actually run.)
export function isMatchFinished(match) {
  return match.status === "FINISHED" || isPresumablyFinished(match, null);
}
export async function cleanupExpiredNotifications(env: Env) {
  // v13.36-nospam: the once-per-hour guard is now isolate-local. The old
  // cleanup_hour KV write cost 144 writes/day (a big chunk of the 1,000/day
  // free quota) just to remember an optimization. Cleanup is idempotent and
  // only WRITES when it actually removed something, so running it a few
  // extra times across isolates costs a couple of KV reads per tick — reads
  // are 100k/day, effectively free.
  const hourStamp = Math.floor(Date.now() / 36e5);
  if (CLEANUP_HOUR === hourStamp) return;
  CLEANUP_HOUR = hourStamp;
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
}
// v13.36-nospam: isolate-local cleanup guard (replaced the cleanup_hour KV
// key — see cleanupExpiredNotifications above).
var CLEANUP_HOUR = -1;
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
  "bayernmunich": "bayernmunchen",
  // v13.51-rivalries: FD's legal name "SS Lazio" folds to the short form the
  // rivalry table carries — without this fold the two spellings ("SS Lazio"
  // vs "Lazio") never meet in derby/rivalry matching.
  "sslazio": "lazio"
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
// v13.73-herotruth: THE single hero-selection expression (ADR-001,
// website-as-truth). The site's hero (public-matches.ts nextBig) and the
// bot's /featured MUST both call this — neither may re-implement the
// filter/sort. Semantics (unchanged from the site's v13.68 filter):
//   - hero-worthy = isFeaturedMatch(m) || isMasterPair(m) (BOTH teams big)
//   - exclude FINISHED
//   - live matches first (isLiveStatus), then by nearest kickoff
//     (live matches sort by their original kickoff time)
// The bot's pre-13.73 copy diverged in 3 ways (unsorted live[0] pick,
// SCHEDULED|TIMED-only upcoming, inline live status set); this function
// ends that — one expression, two consumers, zero drift.
export function pickHeroMatch(matches) {
  const hero = (matches || [])
    .filter((m) => m.status !== "FINISHED" && (isFeaturedMatch(m) || isMasterPair(m)) && (isLiveStatus(m.status) || new Date(m.utcDate).getTime() > Date.now()))
    .sort((a, b) => (isLiveStatus(a.status) ? 0 : 1) - (isLiveStatus(b.status) ? 0 : 1) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  return hero.length ? hero[0] : null;
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
  ["Paris Saint-Germain", "Olympique de Marseille"],
  // v13.51-rivalries: the new named pairings join the derby machinery
  // too (top-box selection, week-ahead ⚔ marks) — they are derbies with
  // names, not a separate class.
  // North West Derby
  ["Liverpool FC", "Manchester United FC"],
  // Derby della Capitale
  ["AS Roma", "Lazio"],
  // Derby della Mole
  ["Juventus", "Torino FC"]
];
var DERBY_NORM = DERBY_PAIRS.map(function(p) {
  // v13.51: normAlias, not bare normalizeTeamName — the alias table folds
  // "Bayern Munich"/"FC Bayern München" onto ONE key, but the bare normalize
  // left DERBY_NORM on the other spelling (bayernmunich vs bayernmunchen),
  // so Der Klassiker silently never matched. Both sides now go through the
  // same folding.
  return [normAlias(p[0]), normAlias(p[1])];
});
export function isDerby(match) {
  // v13.51-rivalries: a derby pairing inside the Champions League is NOT a
  // derby — Real–Barça in the UCL is just a UCL match (the user's El Clásico
  // rule, applied to every pairing). Callers without a competition field
  // (tests) keep the pure pair-membership answer.
  if (match.competition && match.competition.code === "CL") return false;
  const h = normAlias(match.homeTeam.name);
  const a = normAlias(match.awayTeam.name);
  return DERBY_NORM.some((p) => h === p[0] && a === p[1] || h === p[1] && a === p[0]);
}
// v13.51-rivalries: the marquee pairings carry their OWN names — shown
// instead of the generic "Derby" tag wherever a derby is labelled. The pairs
// also stay in DERBY_PAIRS so the derby machinery (the top box, the week-ahead
// ⚔ marks) still sees them. Rules, per the product owner:
//   - NEVER in the Champions League — a Clásico/Klassiker in the UCL is just
//     a UCL match (any other competition — league or domestic cup — counts).
//   - Persian carries a name only where one is natively used: ال کلاسیکو for
//     Real–Barça. Every other rivalry name is English-only — fa consumers
//     drop the tag entirely rather than show English text.
var RIVALRY_PAIRS = [
  // [team A, team B, English name, Persian name ("" = English-only)]
  ["Real Madrid CF", "FC Barcelona", "El Clásico", "\u0627\u0644 \u06A9\u0644\u0627\u0633\u06CC\u06A9\u0648"],
  ["FC Bayern M\xFCnchen", "Borussia Dortmund", "Der Klassiker", ""],
  ["AC Milan", "Inter Milan", "Derby della Madonnina", ""],
  ["Liverpool FC", "Manchester United FC", "North West Derby", ""],
  ["Manchester City FC", "Manchester United FC", "Manchester Derby", ""],
  ["Arsenal FC", "Tottenham Hotspur FC", "North London Derby", ""],
  ["Paris Saint-Germain", "Olympique de Marseille", "Le Classique", ""],
  ["AS Roma", "Lazio", "Derby della Capitale", ""],
  ["Juventus", "Torino FC", "Derby della Mole", ""]
];
var RIVALRY_NORM = RIVALRY_PAIRS.map(function(p) {
  return [normAlias(p[0]), normAlias(p[1])];
});
// The rivalry name for this match in this language, or null (no named
// rivalry / a UCL meeting / an English-only name requested in fa).
export function rivalryName(match, lang) {
  if (match.competition && match.competition.code === "CL") return null;
  const h = normAlias(match.homeTeam.name);
  const a = normAlias(match.awayTeam.name);
  for (let i = 0; i < RIVALRY_NORM.length; i++) {
    const p = RIVALRY_NORM[i];
    if (h === p[0] && a === p[1] || h === p[1] && a === p[0]) {
      if (lang !== "fa") return RIVALRY_PAIRS[i][2];
      return RIVALRY_PAIRS[i][3] || null;
    }
  }
  return null;
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
