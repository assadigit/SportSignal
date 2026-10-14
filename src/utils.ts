// SportSignal — shared utilities: Persian digits, Jalali/English date-time
// localization, admin password hashing, subrequest budget, HTTP fetch helpers,
// JSON responses. Pure helpers only — no domain imports.

// Subrequest counter lives HERE (the owning module) — imported bindings are
// read-only, so consumers call bumpSubrequest() instead of ++SUBREQUEST_COUNT.

import { CONFIG } from "./config";
import { STAGE_EN } from "./tables";
import type { Env } from "./types";

export function bumpSubrequest() {
  return ++SUBREQUEST_COUNT > SUBREQUEST_CAP;
}

export function toFaDigits(str) {
  const FA_DIGIT_MAP = { "0": "\u06F0", "1": "\u06F1", "2": "\u06F2", "3": "\u06F3", "4": "\u06F4", "5": "\u06F5", "6": "\u06F6", "7": "\u06F7", "8": "\u06F8", "9": "\u06F9" };
  return str.replace(/[0-9]/g, (w) => FA_DIGIT_MAP[w] || w);
}
export function escapeMarkdownCharacters(text) {
  return text.replace(/([\[\]\(\)~`>#\+\-=|{}\.!_])/g, "\\$1");
}
// v13.98-jalalinight: pure-math Jalali (Hijri-Shamsi) conversion — the same
// Borkowski algorithm as seo/utils.toJalali, duplicated here because ROOT
// src cannot import from src/seo/* (the eval harness concatenates root
// files only; see RUNBOOK §11). fa bot surfaces format calendar dates in
// Jalali (the night digest header was the last Gregorian holdout).
// NOTE: no TS param annotations here (or anywhere in this span) —
// check-admin.js slices `function toFaDigits` … `var LOG_VERBOSE` out of the
// harness concatenation and evals it as plain JS.
export function toJalaliParts(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}
export const JALALI_MONTHS_FA = [
  "\u0641\u0631\u0648\u0631\u062F\u06CC\u0646", "\u0627\u0631\u062F\u06CC\u0628\u0647\u0634\u062A", "\u062E\u0631\u062F\u0627\u062F", "\u062A\u06CC\u0631", "\u0645\u0631\u062F\u0627\u062F", "\u0634\u0647\u0631\u06CC\u0648\u0631",
  "\u0645\u0647\u0631", "\u0622\u0628\u0627\u0646", "\u0622\u0630\u0631", "\u062F\u06CC", "\u0628\u0647\u0645\u0646", "\u0627\u0633\u0641\u0646\u062F"
];
export const WEEKDAYS_FA = ["\u06CC\u06A9\u0634\u0646\u0628\u0647", "\u062F\u0648\u0634\u0646\u0628\u0647", "\u0633\u0647\u200C\u0634\u0646\u0628\u0647", "\u0686\u0647\u0627\u0631\u0634\u0646\u0628\u0647", "\u067E\u0646\u062C\u0634\u0646\u0628\u0647", "\u062C\u0645\u0639\u0647", "\u0634\u0646\u0628\u0647"];
export const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// The LOCAL calendar date (y, m, d) as a full Jalali string:
// "سه‌شنبه ۲۱ مهر ۱۴۰۵". Pure math + arrays — zero Intl formatters (the
// v13.96.1 CPU discipline: no formatter construction in digest paths).
export function jalaliDateFa(y, m, d) {
  const j = toJalaliParts(y, m, d);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return WEEKDAYS_FA[wd] + " " + toFaDigits(String(j.jd)) + " " + JALALI_MONTHS_FA[j.jm - 1] + " " + toFaDigits(String(j.jy));
}
// The same local date as a full Gregorian string: "Tuesday, 13 October 2026".
export function englishDateYmd(y, m, d) {
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return WEEKDAYS_EN[wd] + ", " + d + " " + MONTHS_EN[m - 1] + " " + y;
}
var LOG_VERBOSE = false;
export function vlog(...args) {
  if (LOG_VERBOSE) console.log(...args);
}
export async function hashPassword(pass, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode(salt), iterations: 1e5, hash: "SHA-256" }, key, 256);
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function getAdminPassHash(env: Env) {
  return await env.STATE.get("admin_pass_hash", "json").catch(() => null);
}
export function timingSafeEqualStr(a, b) {
  const enc = new TextEncoder();
  const ab = enc.encode(String(a == null ? "" : a));
  const bb = enc.encode(String(b == null ? "" : b));
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length === bb.length ? 0 : 1;
  for (let i = 0; i < len; i++) diff |= (ab[i] || 0) ^ (bb[i] || 0);
  return diff === 0;
}
export function getNowUTC() {
  return new Date();
}
export function getNowTehran(env: Env) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: env.TEHRAN_TZ || "Asia/Tehran",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(new Date());
  const p: any = {};
  for (const x of parts) p[x.type] = x.value;
  const hh = p.hour === "24" ? "00" : p.hour;
  return new Date(`${p.year}-${p.month}-${p.day}T${hh}:${p.minute}:${p.second}Z`);
}
export function getJalaliDate(utcDateStr, env) {
  const date = new Date(utcDateStr);
  const dateOpt: any = { timeZone: env.TEHRAN_TZ, day: "numeric", month: "long", year: "numeric", weekday: "long" };
  const parts = new Intl.DateTimeFormat("fa-IR", dateOpt).formatToParts(date);
  const get = (t) => {
    const p = parts.find((x) => x.type === t);
    return p ? p.value : "";
  };
  return `${get("weekday")} ${get("day")} ${get("month")} ${get("year")}`;
}
export function getJalaliTime(utcDateStr, env) {
  const date = new Date(utcDateStr);
  const timeOpt: any = {
    timeZone: env.TEHRAN_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  };
  const time = new Intl.DateTimeFormat("fa-IR", timeOpt).format(date);
  return toFaDigits(time);
}
export function getRelativeTimeUntilMatch(matchUtcDate, _env) {
  const now = getNowUTC();
  const matchDate = new Date(matchUtcDate);
  const diffMs = matchDate.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1e3 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const diffMinutes = Math.floor(diffMs / (1e3 * 60));
  if (diffDays > 0) {
    return `${toFaDigits(diffDays.toString())} \u0631\u0648\u0632 \u0648 ${toFaDigits((diffHours % 24).toString())} \u0633\u0627\u0639\u062A \u062F\u06CC\u06AF\u0631`;
  } else if (diffHours > 0) {
    return `${toFaDigits(diffHours.toString())} \u0633\u0627\u0639\u062A \u0648 ${toFaDigits((diffMinutes % 60).toString())} \u062F\u0642\u06CC\u0642\u0647 \u062F\u06CC\u06AF\u0631`;
  } else if (diffMinutes > 0) {
    return `${toFaDigits(diffMinutes.toString())} \u062F\u0642\u06CC\u0642\u0647 \u062F\u06CC\u06AF\u0631`;
  } else {
    return "\u0628\u0647 \u0632\u0648\u062F\u06CC";
  }
}
// v12.x-bilingual-bot: English Gregorian date / time / relative-time helpers
// (mirror of getJalaliDate / getJalaliTime / getRelativeTimeUntilMatch for
// English users). Used by the cron composers when lang === "en".
export function getEnglishDate(utcDateStr, env) {
  const date = new Date(utcDateStr);
  const opts: any = { timeZone: env.TEHRAN_TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" };
  return new Intl.DateTimeFormat("en-GB", opts).format(date);
}
export function getEnglishTime(utcDateStr, env) {
  const date = new Date(utcDateStr);
  const opts: any = { timeZone: env.TEHRAN_TZ, hour: "2-digit", minute: "2-digit", hour12: false };
  return new Intl.DateTimeFormat("en-GB", opts).format(date);
}
export function getEnglishRelative(matchUtcDate) {
  const now = getNowUTC();
  const matchDate = new Date(matchUtcDate);
  const diffMs = matchDate.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1e3 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const diffMinutes = Math.floor(diffMs / (1e3 * 60));
  if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h to go`;
  if (diffHours > 0) return `${diffHours}h ${diffMinutes % 60}m to go`;
  if (diffMinutes > 0) return `${diffMinutes}m to go`;
  return "soon";
}
// v12.x-bilingual-bot: English stage names for cup competitions
// (mirror of STAGE_FA for lang === "en").
export function enStageName(stage) {
  return STAGE_EN[String(stage || "").toUpperCase()] || null;
}
var SUBREQUEST_COUNT = 0;
var SUBREQUEST_CAP = 48;
// v13.45-sightlines (F10): KV operations on the STATE binding are real
// subrequests the fetch-only counter above never saw (only fetchJSON /
// fetchWithRetry / the telegram senders / admin's clubs fetch ever bumped).
// Counted SEPARATELY so the existing gates (prewarm <30, notify-defer >38)
// keep their tuned fetch-only semantics — the sum of both counters is the
// tick's true total (closing log line + the completion blob's subreq_last_tick).
var KV_OPS_COUNT = 0;
export function bumpKvOp() {
  KV_OPS_COUNT++;
}
export function resetSubrequestBudget() {
  SUBREQUEST_COUNT = 0;
  KV_OPS_COUNT = 0;
}
// v13.7-perf: read-only accessor for the live subrequest counter, so the
// cron sweep can log its headroom against the 50-subrequest ceiling without
// exposing the mutable binding (imported bindings are read-only).
export function subrequestCount() {
  return SUBREQUEST_COUNT;
}
// v13.45-sightlines (F10): read-only accessor for the KV-ops counter (same
// imported-bindings-are-readonly reason as subrequestCount above).
export function kvOpsCount() {
  return KV_OPS_COUNT;
}
export async function fetchJSON(url, attempts?, headers?) {
  attempts = attempts || 2;
  // v13.54.1-poolbreak: the bump now sits INSIDE the retry loop — every
  // fetch ATTEMPT is metered (fetchWithRetry always did this). The old
  // once-per-call bump undercounted real subrequests by up to 2× on
  // retried calls: the 2026-09-30 tick's meter read 37/48 while Cloudflare
  // was already rejecting calls at its real ~50 ceiling — every budget gate
  // downstream (the cron sweep's source gates, the sportscore day-loop
  // stops, the prewarm <30 gate) trusted a meter that lied. Identical
  // bump count on the happy path (1 call = 1 bump).
  const canCache = !headers && typeof caches !== "undefined" && caches.default;
  const cacheKey = canCache ? new Request(url, { method: "GET" }) : null;
  if (cacheKey) {
    try {
      const hit = await caches.default.match(cacheKey);
      if (hit) return await hit.json();
    } catch (e) {
    }
  }
  for (let i = 1; i <= attempts; i++) {
    if (bumpSubrequest()) throw new Error("Subrequest budget exhausted");
    try {
      const res = await fetch(url, { headers: headers || {} });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json() as any;
      if (cacheKey) {
        try {
          await caches.default.put(cacheKey, new Response(JSON.stringify(data), { headers: { "content-type": "application/json", "cache-control": "max-age=300" } }));
        } catch (e) {
        }
      }
      return data;
    } catch (e) {
      if (i < attempts) await new Promise((r) => setTimeout(r, 800 * i));
      else throw e;
    }
  }
  return null;
}
// v13.44-quotaguard (F5): timestamp of the last 429 seen by fetchWithRetry.
// football-data's free tier is 10 req/min; the old fixed 1-2s backoff
// retried straight back into the SAME exhausted quota minute and burned
// both attempts for nothing. fetchFootballData reads this to suspend the
// football-data circuit (mirror of sportscore's) instead of hammering.
var RATE_LIMITED_AT = 0;
export function fdRateLimited() {
  return Date.now() - RATE_LIMITED_AT < 6e4;
}
export async function fetchWithRetry(url, apiToken, label) {
  for (let attempt = 1; attempt <= CONFIG.API_RETRY_ATTEMPTS; attempt++) {
    if (bumpSubrequest()) throw new Error("Subrequest budget exhausted");
    try {
      vlog(`${label} - Attempt ${attempt}/${CONFIG.API_RETRY_ATTEMPTS}`);
      const res = await fetch(url, {
        headers: { "X-Auth-Token": apiToken }
      });
      vlog(`${label} Status: ${res.status} ${res.statusText}`);
      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 429) {
          // v13.44-quotaguard (F5): honor the server's Retry-After (seconds).
          // Cap the wait at 15s so a long Retry-After can't stall the tick —
          // when the cap truncates a longer hint, the FD circuit suspends the
          // provider for the rest of the sweep instead of hammering.
          const raSec = parseInt(res.headers && res.headers.get ? res.headers.get("retry-after") : "") || 0;
          const waitTime = Math.min(Math.max(raSec * 1e3, CONFIG.API_RETRY_DELAY * attempt), 15e3);
          RATE_LIMITED_AT = Date.now();
          console.log(`Rate limited, waiting ${waitTime}ms (Retry-After: ${raSec || "none"})...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        if (res.status === 400) {
          console.log(`\u274C Bad request for ${label}: ${errorText.substring(0, 200)}`);
          return [];
        }
        throw new Error(`HTTP ${res.status}: ${errorText.substring(0, 100)}`);
      }
      const data = await res.json() as any;
      return data.matches || [];
    } catch (error) {
      console.error(`${label} Attempt ${attempt} failed:`, error.message);
      if (attempt < CONFIG.API_RETRY_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, CONFIG.API_RETRY_DELAY * Math.pow(2, attempt)));
      } else {
        throw error;
      }
    }
  }
  return [];
}
export function jsonResponse(data, status?) {
  return new Response(JSON.stringify(data, null, 2), {
    status: status || 200,
    headers: {
      "content-type": "application/json",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer"
    }
  });
}
// v13.36-anytight: every admin API route used to inline the same
// json-parse-with-null-catch cast (8 copies). One helper kills all of them
// (the promise rejections become null, the inferred type is any, callers
// keep their existing null-check). NOTE: the request body must only be
// parsed AFTER validateWebhook passes — the security check enforces that
// source order, so keep the first raw parse inside that webhook block.
export async function readJson(req) {
  return req.json().catch(() => null);
}
// v13.45-sightlines: dead man's switch for the */10 cron. Cloudflare has no
// built-in "cron didn't fire" alerting, and URL monitors cannot see a hung or
// CPU-killed tick (the worker keeps serving 200s — the exact failure shape of
// the 2026-09-14 outages, where 49 ticks died silently while healthz said
// ok). healthchecks.io semantics: SUCCESS ping after a tick resolves (every
// early return is a handled outcome — lock-skip, no-users, no-pool — so only
// a cron that stops firing, a hard-down worker, or a thrown tick leaves the
// check late → Telegram DOWN after the grace window). A hung tick is instead
// caught by healthz's last_cron staleness (503 → UptimeRobot). /fail ping
// from the scheduled handler's catch when the tick throws (immediate alert,
// no grace) with the error name in the POST body (verified live: path-suffix
// messages 400; the body form is accepted and surfaces in the alert + log).
// Fire-and-forget via ctx.waitUntil, counted against the subrequest budget,
// never blocks the tick. At budget cap it is skipped by design — that class
// is caught by the switch itself (missed success pings). HEALTHCHECK_PING_URL
// is a wrangler secret; absent = no-op (deploy-safe before the check exists).
export function pingHealthcheck(env, ctx, ok, err?) {
  try {
    const base = env && env.HEALTHCHECK_PING_URL;
    if (!base) return;
    if (bumpSubrequest()) {
      console.warn("Healthcheck ping skipped: subrequest budget exhausted (the missed success ping covers this class)");
      return;
    }
    const url = String(base).replace(/\/+$/, "");
    const p = ok
      ? fetch(url, { method: "GET" })
      : fetch(url + "/fail", { method: "POST", headers: { "content-type": "text/plain" }, body: String(err && err.name || "error").slice(0, 200) });
    const done = p.catch((e) => console.warn("Healthcheck ping failed: " + e.message));
    if (ctx && ctx.waitUntil) ctx.waitUntil(done);
  } catch (e) {
    console.warn("Healthcheck ping wiring failed: " + e.message);
  }
}
