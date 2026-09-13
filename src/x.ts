// SportSignal — X (Twitter) automated profile: OAuth 1.0a HMAC-SHA1
// signing (crypto.subtle, no deps), budget governor, KV dedupe, 401/429/5xx
// handling, Persian post composers and the sweep orchestrator.


import { CONFIG, X_CONFIG } from "./config";
import type { Env } from "./types";
import { toFaDigits, getNowTehran, getJalaliDate, getJalaliTime } from "./utils";
import { translateTeam, translateCompetition, getCompetitionPriority } from "./translate";
import { isMatchFinished, isWithinPostMatchWindow, isWithin24HourWindow, isWithinBigMatchWindow, isWithin3HourWindow, isWithin1HourWindow, isWithin5MinWindow, isMatchStartingNow } from "./matches";
import { fetchStandings, format24HourMessage, formatBigMatchMessage, format3HourMessage, format1HourMessage, format5MinMessage, formatMatchStartMessage, formatResultMessage, isoWeekKey, weeklyTableCodes } from "./composers";
import { isMasterBigMatch } from "./users";

export function xPercentEncode(s) {
  return encodeURIComponent(String(s)).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}
export async function xHmacSha1Base64(keyStr, baseStr) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(keyStr),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(baseStr));
  const bytes = new Uint8Array(sig);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
export function xRandomNonce() {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  let hex = "";
  for (let i = 0; i < buf.length; i++) hex += buf[i].toString(16).padStart(2, "0");
  return hex;
}
// Build the OAuth 1.0a base string for tests + signing. `opts` allows the
// RFC 5849 test vector to pin nonce/timestamp + supply extra (non-oauth)
// query/form params; production passes {}.
export async function xBuildBaseString(method, url, allParams) {
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys.map((k) => xPercentEncode(k) + "=" + xPercentEncode(allParams[k])).join("&");
  return method.toUpperCase() + "&" + xPercentEncode(url) + "&" + xPercentEncode(paramString);
}
// Build the OAuth 1.0a Authorization header. env carries the 4 keys; opts
// may pin nonce/timestamp + carry extraParams for tests.
export async function xBuildAuthHeader(method, url, env, opts) {
  opts = opts || {};
  const consumerKey = env.X_API_KEY;
  const consumerSecret = env.X_API_SECRET || "";
  const token = env.X_ACCESS_TOKEN;
  const tokenSecret = env.X_ACCESS_TOKEN_SECRET || "";
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: opts.nonce || xRandomNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(opts.timestamp != null ? opts.timestamp : Math.floor(Date.now() / 1e3)),
    oauth_token: token,
    oauth_version: "1.0"
  };
  const allParams = Object.assign({}, oauthParams, opts.extraParams || {});
  const baseString = await xBuildBaseString(method, url, allParams);
  const signingKey = xPercentEncode(consumerSecret) + "&" + xPercentEncode(tokenSecret);
  const signature = await xHmacSha1Base64(signingKey, baseString);
  oauthParams.oauth_signature = signature;
  return "OAuth " + Object.keys(oauthParams).map((k) => xPercentEncode(k) + '="' + xPercentEncode(oauthParams[k]) + '"').join(", ");
}
export async function xIsEnabled(env: Env) {
  const kvVal = await env.STATE.get(X_CONFIG.KV_ENABLED).catch(() => null);
  if (kvVal === "1") return true;
  if (kvVal === "0") return false;
  return env.X_ENABLED === "1" || env.X_ENABLED === "true";
}
export async function xIsDryRun(env: Env) {
  const kvVal = await env.STATE.get(X_CONFIG.KV_DRY_RUN).catch(() => null);
  if (kvVal === "1") return true;
  if (kvVal === "0") return false;
  return env.X_DRY_RUN === "1" || env.X_DRY_RUN === "true";
}
export async function xGetPhase(env: Env) {
  const v = await env.STATE.get(X_CONFIG.KV_PHASE).catch(() => null);
  if (v && typeof v === "string" && v.trim()) {
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return X_CONFIG.DEFAULT_PHASE.split(",").map((s) => s.trim()).filter(Boolean);
}
export function xHasPhase(phase, list) {
  return Array.isArray(list) && list.indexOf(phase) !== -1;
}
export function xMonthKey() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}
export function xDayKey() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}
export async function xBudgetCheck(env: Env) {
  const mk = X_CONFIG.KV_BUDGET_PREFIX + xMonthKey();
  const dk = X_CONFIG.KV_DAILY_PREFIX + xDayKey();
  const monthly = parseInt(await env.STATE.get(mk).catch(() => null)) || 0;
  const daily = parseInt(await env.STATE.get(dk).catch(() => null)) || 0;
  if (monthly >= X_CONFIG.MONTHLY_CAP) return { ok: false, reason: "monthly-cap", monthlyUsed: monthly, dailyUsed: daily };
  if (daily >= X_CONFIG.DAILY_CAP) return { ok: false, reason: "daily-cap", monthlyUsed: monthly, dailyUsed: daily };
  return { ok: true, monthlyUsed: monthly, dailyUsed: daily };
}
export async function xBudgetIncr(env: Env) {
  const mk = X_CONFIG.KV_BUDGET_PREFIX + xMonthKey();
  const dk = X_CONFIG.KV_DAILY_PREFIX + xDayKey();
  const monthly = (parseInt(await env.STATE.get(mk).catch(() => null)) || 0) + 1;
  const daily = (parseInt(await env.STATE.get(dk).catch(() => null)) || 0) + 1;
  await env.STATE.put(mk, String(monthly), { expirationTtl: 35 * 86400 }).catch(() => {
  });
  await env.STATE.put(dk, String(daily), { expirationTtl: X_CONFIG.DAILY_TTL_SEC }).catch(() => {
  });
  return { monthly, daily };
}
export async function xPauseUntil(env: Env, seconds) {
  const until = new Date(Date.now() + seconds * 1e3).toISOString();
  await env.STATE.put(X_CONFIG.KV_PAUSE, until, { expirationTtl: Math.max(seconds, 60) }).catch(() => {
  });
}
export async function xIsPaused(env: Env) {
  const until = await env.STATE.get(X_CONFIG.KV_PAUSE).catch(() => null);
  if (!until) return false;
  const t = new Date(until).getTime();
  return t > Date.now();
}
export async function xSetLastPost(env: Env, info) {
  await env.STATE.put(X_CONFIG.KV_LAST_POST, JSON.stringify(Object.assign({ ts: Date.now() }, info))).catch(() => {
  });
}
export async function xSetLastError(env: Env, status, error) {
  await env.STATE.put(X_CONFIG.KV_LAST_ERROR, JSON.stringify({ ts: Date.now(), status, error: String(error || "").slice(0, 280) })).catch(() => {
  });
}
export async function xDedupeCheck(env: Env, key) {
  const k = X_CONFIG.KV_DEDUPE_PREFIX + key;
  const v = await env.STATE.get(k).catch(() => null);
  return !v;
}
export async function xDedupeMark(env: Env, key) {
  const k = X_CONFIG.KV_DEDUPE_PREFIX + key;
  await env.STATE.put(k, String(Date.now()), { expirationTtl: X_CONFIG.DEDUPE_TTL_SEC }).catch(() => {
  });
}
// POST /2/tweets. Returns {ok, id, status, error}. Handles 401/403/429/5xx
// per spec. 401/403 → log admin alert + refuse; 429 → KV pause 15min; 5xx → 1
// retry; every outcome written to x_last_error_v1.
export async function xPostTweet(env: Env, text, inReplyTo): Promise<any> {
  const url = X_CONFIG.API_BASE + X_CONFIG.TWEET_PATH;
  const bodyObj = inReplyTo ? { text, reply: { in_reply_to_tweet_id: String(inReplyTo) } } : { text };
  const body = JSON.stringify(bodyObj);
  let attempt = 0;
  while (attempt <= X_CONFIG.RETRY_5XX) {
    attempt++;
    let auth, res;
    try {
      auth = await xBuildAuthHeader("POST", url, env, {});
      res = await fetch(url, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body
      });
    } catch (e) {
      if (attempt > X_CONFIG.RETRY_5XX) {
        await xSetLastError(env, 0, "network:" + e.message);
        return { ok: false, status: 0, error: "network:" + e.message };
      }
      continue;
    }
    if (res.ok) {
      let data = null;
      try {
        data = await res.json() as any;
      } catch (e) {
      }
      const id = data && data.data && data.data.id ? String(data.data.id) : null;
      return { ok: true, status: 201, id };
    }
    const status = res.status;
    const errText = await res.text().catch(() => "");
    if (status === 401) {
      await xSetLastError(env, 401, "unauthorized — bad X OAuth keys: " + errText.slice(0, 200));
      return { ok: false, status: 401, error: "unauthorized" };
    }
    if (status === 403) {
      await xSetLastError(env, 403, "forbidden — check app permissions: " + errText.slice(0, 200));
      return { ok: false, status: 403, error: "forbidden" };
    }
    if (status === 429) {
      const retryAfter = parseInt(res.headers.get("retry-after") || "900") || 900;
      await xPauseUntil(env, Math.min(retryAfter, X_CONFIG.PAUSE_TTL_SEC * 4));
      await xSetLastError(env, 429, "rate-limited — paused for " + retryAfter + "s");
      return { ok: false, status: 429, error: "rate-limited" };
    }
    if (status >= 500 && attempt <= X_CONFIG.RETRY_5XX) {
      await xSetLastError(env, status, "5xx retry: " + errText.slice(0, 200));
      continue;
    }
    await xSetLastError(env, status, "x-error: " + errText.slice(0, 200));
    return { ok: false, status, error: "http-" + status };
  }
  return { ok: false, status: 0, error: "retry-exhausted" };
}
// Composed Persian posts — mirror the Telegram composers but stripped of
// MarkdownV2 escapes (X has no markdown), ≤280 chars, with `#فوتبال` + a
// league tag, ending with `football.sportsignal.ir`.
export function xLeagueTag(code) {
  const tags = {
    PL: "\u0644\u06CC\u06AF_\u0628\u0631\u062A\u0631_\u0627\u0646\u06AF\u0644\u06CC\u0633",
    PD: "\u0644\u0627\u0644\u06CC\u06AF\u0627",
    SA: "\u0633\u0631\u06CC_\u0622",
    FL1: "\u0644\u06CC\u06AF_\u06F1_\u0641\u0631\u0627\u0646\u0633\u0647",
    BL1: "\u0628\u0648\u0646\u062F\u0633\u0644\u06CC\u06AF\u0627",
    CL: "\u0644\u06CC\u06AF_\u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646_\u0627\u0631\u0648\u067E\u0627",
    EL: "\u0644\u06CC\u06AF_\u0627\u0631\u0648\u067E\u0627",
    ECL: "\u0644\u06CC\u06AF_\u06A9\u0646\u0641\u0631\u0627\u0646\u0633",
    FA_CUP: "\u062C\u0627\u0645_\u062D\u0630\u0641\u06CC_\u0627\u0646\u06AF\u0644\u06CC\u0633",
    EFL_CUP: "\u062C\u0627\u0645_\u0627\u06CC_\u0627\u0641_\u0627\u0644",
    CDR: "\u06A9\u0648\u067E\u0627_\u062F\u0644_\u0631\u06CC",
    COPPA_ITALIA: "\u06A9\u0648\u067E\u0627_\u0627\u06CC\u062A\u0627\u0644\u06CC\u0627"
  };
  return tags[code] ? "#" + tags[code] : "";
}
export function xUrl() {
  return "football.sportsignal.ir";
}
export function xTruncate(s, max) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "\u2026";
}
export function composeXCoronation(env: Env, code, newLeader, prevRow, trigger) {
  const league = translateCompetition(code);
  const team = translateTeam(newLeader.name);
  const home = trigger && trigger.homeTeam ? translateTeam(trigger.homeTeam.name) : "";
  const away = trigger && trigger.awayTeam ? translateTeam(trigger.awayTeam.name) : "";
  const date = trigger && trigger.utcDate ? getJalaliDate(trigger.utcDate, env) : "";
  const pts = newLeader.points == null ? 0 : newLeader.points;
  const prevPos = prevRow && prevRow.pos != null ? prevRow.pos : 2;
  const tag = xLeagueTag(code);
  let score = "";
  const h = trigger && trigger.score && trigger.score.fullTime && trigger.score.fullTime.home;
  const a = trigger && trigger.score && trigger.score.fullTime && trigger.score.fullTime.away;
  if (h != null && a != null) score = " | " + toFaDigits(String(h)) + "-" + toFaDigits(String(a));
  let text = `\u{1F451} \u0635\u062F\u0631 \u062C\u062F\u0648\u0644 ${league} \u0639\u0648\u0636 \u0634\u062F
${team} \u0628\u0627 ${toFaDigits(String(pts))} \u0627\u0645\u062A\u06CC\u0627\u0632 \u0628\u0647 \u0635\u062F\u0631 \u0631\u0633\u06CC\u062F (\u0631\u062A\u0628\u0647 \u0642\u0628\u0644\u06CC: ${toFaDigits(String(prevPos))})
\u26BD ${home} \u2694\uFE0F ${away}${score}
\u{1F3C6} ${league}${date ? " | " + date : ""}
${xUrl()} #\u0641\u0648\u062A\u0628\u0627\u0644${tag ? " " + tag : ""}`;
  return xTruncate(text, X_CONFIG.POST_CHAR_LIMIT);
}
export function composeXResult(env: Env, match) {
  const home = translateTeam(match.homeTeam.name);
  const away = translateTeam(match.awayTeam.name);
  const league = translateCompetition(match.competition.code);
  const date = getJalaliDate(match.utcDate, env);
  const tag = xLeagueTag(match.competition.code);
  const h = match.score && match.score.fullTime && match.score.fullTime.home;
  const a = match.score && match.score.fullTime && match.score.fullTime.away;
  let verdict = "";
  if (h != null && a != null) {
    if (h > a) verdict = "\n\u2705 " + home + " \u0628\u0631\u0646\u062F\u0647 \u0634\u062F";
    else if (h < a) verdict = "\n\u2705 " + away + " \u0628\u0631\u0646\u062F\u0647 \u0634\u062F";
    else verdict = "\n\u{1F91D} \u0645\u0633\u0627\u0648\u06CC";
  }
  const score = h != null && a != null ? toFaDigits(String(h)) + "-" + toFaDigits(String(a)) : "?";
  let text = `\u{1F3C1} \u0646\u062A\u06CC\u062C\u0647 \u0646\u0647\u0627\u06CC\u06CC
\u26BD ${home} \u2694\uFE0F ${away}
\u{1F4CA} ${score}${verdict}
\u{1F3C6} ${league} | ${date}
${xUrl()} #\u0641\u0648\u062A\u0628\u0627\u0644${tag ? " " + tag : ""}`;
  return xTruncate(text, X_CONFIG.POST_CHAR_LIMIT);
}
export function composeXKickoff(env: Env, match) {
  const home = translateTeam(match.homeTeam.name);
  const away = translateTeam(match.awayTeam.name);
  const league = translateCompetition(match.competition.code);
  const time = getJalaliTime(match.utcDate, env);
  const date = getJalaliDate(match.utcDate, env);
  const tag = xLeagueTag(match.competition.code);
  let text = `\u26BD \u0628\u0627\u0632\u06CC \u0628\u0632\u0631\u06AF
${home} \u2694\uFE0F ${away}
\u{1F3C6} ${league}
\u{1F5D0} ${date} | ${time}
${xUrl()} #\u0641\u0648\u062A\u0628\u0627\u0644${tag ? " " + tag : ""}`;
  return xTruncate(text, X_CONFIG.POST_CHAR_LIMIT);
}
export function composeXTableForLeague(env: Env, code, st) {
  const league = translateCompetition(code);
  const teams = (st.teams || []).slice().sort((a, b) => (a.pos || 0) - (b.pos || 0) || (b.points || 0) - (a.points || 0));
  const shown = code === "CL" ? teams.slice(0, 8) : teams.slice(0, 5);
  const tag = xLeagueTag(code);
  const rows = shown.map((t, i) => `${toFaDigits(String(i + 1))}. ${translateTeam(t.name)} \u2014 ${toFaDigits(String(t.points == null ? 0 : t.points))} \u0627\u0645\u062A\u06CC\u0627\u0632`);
  let head = `\u{1F4CA} \u062C\u062F\u0648\u0644 ${league}`;
  if (st.matchday) head += " (\u0647\u0641\u062A\u0647 " + toFaDigits(String(st.matchday)) + ")";
  let text = head + "\n" + rows.join("\n") + "\n" + xUrl() + " #\u0641\u0648\u062A\u0628\u0627\u0644" + (tag ? " " + tag : "");
  return xTruncate(text, X_CONFIG.POST_CHAR_LIMIT);
}
// Central post-or-dry-run. Bumps the budget + dedupe marker ONLY on a real
// success; dry-run still records lastPost for the admin card but does NOT
// consume budget or dedupe (so the next live sweep will still fire).
export async function xSendOrDryRun(env: Env, text, inReplyTo, kind, dedupeKey): Promise<any> {
  const dry = await xIsDryRun(env);
  if (dry) {
    console.log(`\u{1F426} X DRY-RUN [${kind}]${inReplyTo ? " reply\u2192" + inReplyTo : ""}: ${text}`);
    await xSetLastPost(env, { text, kind: kind + ":dry-run", id: null });
    return { ok: true, dryRun: true, id: null };
  }
  const r = await xPostTweet(env, text, inReplyTo);
  if (r.ok) {
    await xBudgetIncr(env);
    await xSetLastPost(env, { text, kind, id: r.id });
    if (dedupeKey) await xDedupeMark(env, dedupeKey);
    console.log(`\u{1F426} X posted [${kind}] id=${r.id}: ${text}`);
    return r;
  }
  console.log(`\u{1F426} X post FAILED [${kind}] status=${r.status} err=${r.error}`);
  return r;
}
// Orchestrator. Called from executeScheduledLogic AFTER the Telegram checks.
// opts.topperEvents = the events list returned by maybeNotifyTableToppers.
export async function maybePostX(env: Env, matches, opts) {
  opts = opts || {};
  const out = { sent: 0, dryRun: 0, skipped: 0, errors: [] };
  if (!(await xIsEnabled(env))) {
    console.log("\u{1F426} X disabled \u2014 skipping");
    return out;
  }
  if (await xIsPaused(env)) {
    console.log("\u{1F426} X paused (429 backoff) \u2014 skipping");
    return out;
  }
  const phase = await xGetPhase(env);
  const dry = await xIsDryRun(env);
  const budget = await xBudgetCheck(env);
  if (!budget.ok) {
    console.log(`\u{1F426} X budget hit (${budget.reason}) \u2014 skipping; monthly=${budget.monthlyUsed} daily=${budget.dailyUsed}`);
    if (!dry) await xSetLastError(env, 0, "budget-cap:" + budget.reason + " monthly=" + budget.monthlyUsed + " daily=" + budget.dailyUsed);
    return out;
  }
  console.log(`\u{1F426} X sweep start: phase=[${phase.join(",")}] dryRun=${dry ? 1 : 0} monthly=${budget.monthlyUsed}/${X_CONFIG.MONTHLY_CAP} daily=${budget.dailyUsed}/${X_CONFIG.DAILY_CAP}`);
  const matchKey = (m) => String(m.id || (m.homeTeam && m.homeTeam.name) + "|" + (m.awayTeam && m.awayTeam.name) + "|" + m.utcDate);
  if (xHasPhase("coronation", phase) && Array.isArray(opts.topperEvents) && opts.topperEvents.length) {
    for (const ev of opts.topperEvents) {
      const dedupeKey = "coronation:" + ev.code;
      if (!(await xDedupeCheck(env, dedupeKey))) {
        out.skipped++;
        continue;
      }
      let st = null;
      try {
        st = await fetchStandings(env, ev.code, false);
      } catch (e) {
        st = null;
      }
      if (!st || !Array.isArray(st.teams) || !st.teams.length) {
        out.skipped++;
        continue;
      }
      const sorted = st.teams.slice().sort((a, b) => (a.pos || 999) - (b.pos || 999));
      const newLeader = sorted[0];
      if (!newLeader) continue;
      const trigger = (matches || []).find((m) => m && ev.match != null && m.id === ev.match) || null;
      const fallbackTrigger = trigger || {
        homeTeam: { name: ev.leader || "" },
        awayTeam: { name: "" },
        competition: { code: ev.code },
        utcDate: (new Date()).toISOString(),
        score: { fullTime: { home: null, away: null } }
      };
      const prevRow = { name: newLeader.name, pos: ev.prevPos != null ? ev.prevPos : 2, points: null };
      const text = composeXCoronation(env, ev.code, newLeader, prevRow, fallbackTrigger);
      const b2 = await xBudgetCheck(env);
      if (!b2.ok) {
        out.skipped++;
        break;
      }
      const r = await xSendOrDryRun(env, text, null, "coronation:" + ev.code, dedupeKey);
      if (r.ok) {
        out.sent++;
        if (r.dryRun) out.dryRun++;
      } else {
        out.errors.push({ kind: "coronation", status: r.status, error: r.error });
      }
      break;
    }
  }
  if (xHasPhase("ft", phase) && Array.isArray(matches) && matches.length) {
    const ftMatches = matches.filter((m) => isMatchFinished(m) && isWithinPostMatchWindow(m, env) && isMasterBigMatch(m));
    ftMatches.sort((a, b) => getCompetitionPriority(a.competition.code) - getCompetitionPriority(b.competition.code) || new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());
    let ftPosted = 0;
    for (const m of ftMatches) {
      const dedupeKey = "ft:" + matchKey(m);
      if (!(await xDedupeCheck(env, dedupeKey))) {
        out.skipped++;
        continue;
      }
      const b = await xBudgetCheck(env);
      if (!b.ok) {
        out.skipped++;
        break;
      }
      const text = composeXResult(env, m);
      const r = await xSendOrDryRun(env, text, null, "ft:" + matchKey(m), dedupeKey);
      if (r.ok) {
        out.sent++;
        if (r.dryRun) out.dryRun++;
        ftPosted++;
      } else {
        out.errors.push({ kind: "ft", status: r.status, error: r.error });
        break;
      }
      if (ftPosted >= 3) break;
    }
  }
  if (xHasPhase("kickoff", phase) && Array.isArray(matches) && matches.length) {
    const koMatches = matches.filter((m) => isMatchStartingNow(m, env) && isMasterBigMatch(m));
    let koPosted = 0;
    for (const m of koMatches) {
      const dedupeKey = "kickoff:" + matchKey(m);
      if (!(await xDedupeCheck(env, dedupeKey))) {
        out.skipped++;
        continue;
      }
      const ftKey = "ft:" + matchKey(m);
      if (!(await xDedupeCheck(env, ftKey))) {
        out.skipped++;
        continue;
      }
      const b = await xBudgetCheck(env);
      if (!b.ok) {
        out.skipped++;
        break;
      }
      const text = composeXKickoff(env, m);
      const r = await xSendOrDryRun(env, text, null, "kickoff:" + matchKey(m), dedupeKey);
      if (r.ok) {
        out.sent++;
        if (r.dryRun) out.dryRun++;
        koPosted++;
      } else {
        out.errors.push({ kind: "kickoff", status: r.status, error: r.error });
        break;
      }
      if (koPosted >= 2) break;
    }
  }
  if (xHasPhase("tables", phase)) {
    try {
      const r = await maybePostXWeekly(env);
      out.sent += r.sent;
      out.dryRun += r.dryRun;
      out.skipped += r.skipped;
      if (r.error) out.errors.push({ kind: "tables", error: r.error });
    } catch (e) {
      out.errors.push({ kind: "tables", error: e.message });
    }
  }
  console.log(`\u{1F426} X sweep done: sent=${out.sent} dryRun=${out.dryRun} skipped=${out.skipped} errors=${out.errors.length}`);
  return out;
}
export async function maybePostXWeekly(env: Env) {
  const out = { sent: 0, dryRun: 0, skipped: 0, error: null };
  const t = getNowTehran(env);
  if (t.getUTCDay() !== CONFIG.WEEKLY_TABLES.day) return out;
  const mins = t.getUTCHours() * 60 + t.getUTCMinutes();
  if (mins < CONFIG.WEEKLY_TABLES.fromMin || mins >= CONFIG.WEEKLY_TABLES.toMin) return out;
  const week = isoWeekKey(t);
  const dedupeKey = "weekly:" + week;
  if (!(await xDedupeCheck(env, dedupeKey))) {
    out.skipped++;
    return out;
  }
  const codes = weeklyTableCodes();
  const texts = [];
  for (const code of codes) {
    let st = null;
    try {
      st = await fetchStandings(env, code, true);
    } catch (e) {
      st = null;
    }
    if (!st || !Array.isArray(st.teams) || !st.teams.length) continue;
    if (st.started === false) continue;
    texts.push({ code, text: composeXTableForLeague(env, code, st) });
  }
  if (!texts.length) {
    out.error = "no-tables";
    return out;
  }
  const root = texts[0];
  const r0 = await xSendOrDryRun(env, root.text, null, "tables:" + root.code + ":root", null);
  if (!r0.ok) {
    out.error = r0.error || "root-failed";
    return out;
  }
  out.sent++;
  if (r0.dryRun) out.dryRun++;
  let rootId = r0.id;
  for (let i = 1; i < texts.length; i++) {
    const b = await xBudgetCheck(env);
    if (!b.ok) {
      out.skipped += texts.length - i;
      break;
    }
    const r = await xSendOrDryRun(env, texts[i].text, rootId, "tables:" + texts[i].code, null);
    if (r.ok) {
      out.sent++;
      if (r.dryRun) out.dryRun++;
      if (r.id) rootId = r.id;
    } else {
      out.error = r.error || "reply-failed";
      break;
    }
  }
  await xDedupeMark(env, dedupeKey);
  return out;
}
export async function getXStatus(env: Env) {
  const enabled = await xIsEnabled(env);
  const dryRun = await xIsDryRun(env);
  const paused = await xIsPaused(env);
  const phase = await xGetPhase(env);
  const mk = X_CONFIG.KV_BUDGET_PREFIX + xMonthKey();
  const dk = X_CONFIG.KV_DAILY_PREFIX + xDayKey();
  const monthly = parseInt(await env.STATE.get(mk).catch(() => null)) || 0;
  const daily = parseInt(await env.STATE.get(dk).catch(() => null)) || 0;
  const lastPost = await env.STATE.get(X_CONFIG.KV_LAST_POST, "json").catch(() => null);
  const lastError = await env.STATE.get(X_CONFIG.KV_LAST_ERROR, "json").catch(() => null);
  return {
    enabled,
    dryRun,
    paused,
    phase,
    monthlyCap: X_CONFIG.MONTHLY_CAP,
    dailyCap: X_CONFIG.DAILY_CAP,
    monthlyUsed: monthly,
    dailyUsed: daily,
    lastPost: lastPost || null,
    lastError: lastError || null
  };
}
export async function xTestPost(env: Env) {
  if (!(await xIsEnabled(env))) return { ok: false, error: "X is disabled (X_ENABLED=0 or x_enabled_v1=0)" };
  const dk = X_CONFIG.KV_TEST_PREFIX + xDayKey();
  const testCount = parseInt(await env.STATE.get(dk).catch(() => null)) || 0;
  if (testCount >= X_CONFIG.TEST_DAILY_CAP) return { ok: false, error: "test daily cap reached (" + X_CONFIG.TEST_DAILY_CAP + ")" };
  const text = `\u{1F9EA} \u067E\u0633\u062A \u062A\u0633\u062A SportSignal \u2014 \u0641\u0648\u062A\u0628\u0627\u0644 \u0627\u0631\u0648\u067E\u0627 \u0631\u0627 \u062F\u0646\u0628\u0627\u0644 \u06A9\u0646\u06CC\u062F
${xUrl()} #\u0641\u0648\u062A\u0628\u0627\u0644`;
  const dry = await xIsDryRun(env);
  if (dry) {
    console.log(`\u{1F426} X TEST DRY-RUN: ${text}`);
    await xSetLastPost(env, { text, kind: "test:dry-run", id: null });
    await env.STATE.put(dk, String(testCount + 1), { expirationTtl: X_CONFIG.DAILY_TTL_SEC }).catch(() => {
    });
    return { ok: true, dryRun: true, text };
  }
  const r = await xPostTweet(env, text, null);
  if (r.ok) {
    await env.STATE.put(dk, String(testCount + 1), { expirationTtl: X_CONFIG.DAILY_TTL_SEC }).catch(() => {
    });
    await xSetLastPost(env, { text, kind: "test", id: r.id });
    return { ok: true, id: r.id, text };
  }
  return { ok: false, status: r.status, error: r.error };
}
var NOTIFICATION_CONFIGS = [
  {
    // Mode B (priority): only fires for users following BOTH teams
    type: "pre-match-72h",
    windowCheck: isWithinBigMatchWindow,
    messageFormatter: formatBigMatchMessage,
    requiresFuture: true,
    bigMatchOnly: true
  },
  {
    type: "pre-match-24h",
    windowCheck: isWithin24HourWindow,
    messageFormatter: format24HourMessage,
    requiresFuture: true
  },
  {
    type: "pre-match-3h",
    windowCheck: isWithin3HourWindow,
    messageFormatter: format3HourMessage,
    requiresFuture: true
  },
  {
    type: "pre-match-1h",
    windowCheck: isWithin1HourWindow,
    messageFormatter: format1HourMessage,
    requiresFuture: true
  },
  {
    // v12.x-cron-gaps: 5-minute "kickoff now" reminder. BIG matches only
    // (both teams in master team list). Lean text per the user's "reduce
    // noise" ask.
    type: "pre-match-5min",
    windowCheck: isWithin5MinWindow,
    messageFormatter: format5MinMessage,
    requiresFuture: true,
    bigMatchOnly: true
  },
  {
    type: "match-start",
    windowCheck: isMatchStartingNow,
    messageFormatter: formatMatchStartMessage,
    // ✅ FIX Bug #2: must be false — isMatchStartingNow allows up to 5 min AFTER
    // kick-off as a grace window. requiresFuture:true was short-circuiting the
    // entire notification the moment the clock ticked past the scheduled start time.
    requiresFuture: false
  },
  {
    type: "result",
    windowCheck: (match, env) => isWithinPostMatchWindow(match, env),
    messageFormatter: formatResultMessage,
    requiresFuture: false
  }
];
