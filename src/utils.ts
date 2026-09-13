// SportSignal — shared utilities: Persian digits, Jalali/English date-time
// localization, admin password hashing, subrequest budget, HTTP fetch helpers,
// JSON responses. Pure helpers only — no domain imports.

// Subrequest counter lives HERE (the owning module) — imported bindings are
// read-only, so consumers call bumpSubrequest() instead of ++SUBREQUEST_COUNT.

import { CONFIG, STAGE_EN } from "./config";
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
  return new Date(`${p.year}-${p.month}-${p.day}T${hh}:${p.minute}:${p.second}Z`) // p: any;
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
  const timeOpt = {
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
export function resetSubrequestBudget() {
  SUBREQUEST_COUNT = 0;
}
export async function fetchJSON(url, attempts?, headers?) {
  attempts = attempts || 2;
  if (bumpSubrequest()) throw new Error("Subrequest budget exhausted");
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
          const waitTime = CONFIG.API_RETRY_DELAY * attempt;
          console.log(`Rate limited, waiting ${waitTime}ms...`);
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
