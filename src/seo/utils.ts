// SportSignal — SEO shared helpers: escaping, dates (Gregorian + Jalali +
// Tehran time), text hygiene. Pure functions, no KV, no side effects.

import { SEO } from "./config";
import { toFaDigits } from "../utils";
import type { Env } from "../types";

export function esc(s: any): string {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Content hash for ETags (FNV-1a 32-bit, hex) — cheap on Workers CPU.
export async function fnv1a(str: string): Promise<string> {
  const enc = new TextEncoder().encode(str);
  let h = 0x811c9dc5;
  for (let i = 0; i < enc.length; i++) {
    h ^= enc[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return ("0000000" + h.toString(16)).slice(-8) + enc.length.toString(16);
}

const FA_MONTHS = [
  "ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن",
  "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر"
];
const FA_WEEKDAYS = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
const FA_WEEKDAYS_SHORT = ["ی", "د", "س", "چ", "پ", "ج", "ش"];

// Tehran-wall-clock parts for a UTC instant (Tehran has had no DST since
// 2022 — fixed +03:30 — but we still go through Intl for correctness).
export function tehranParts(iso: string): { y: number; m: number; d: number; hh: number; mm: number; wd: number } {
  const dt = new Date(iso);
  const p: any = {};
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SEO.DISPLAY_TZ, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short"
  }).formatToParts(dt);
  for (const x of parts) p[x.type] = x.value;
  const hh = p.hour === "24" ? "00" : p.hour;
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    y: parseInt(p.year), m: parseInt(p.month), d: parseInt(p.day),
    hh: parseInt(hh), mm: parseInt(p.minute), wd: wdMap[p.weekday] ?? 0
  };
}

// Jalali (Shamsi) conversion — pure math (Borkowski algorithm), no Intl
// locale needed. Spec CALENDAR_DISPLAY: fa pages show Jalali NEXT to the
// Gregorian date; machine markup stays Gregorian ISO 8601.
export function toJalali(gy: number, gm: number, gd: number): { jy: number; jm: number; jd: number } {
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

const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];

// v13.169-mcv2: the V2 mobile card's banner date — Jalali WEEKDAY + day +
// month (no year), the exact shape of the client's fa-IR-u-ca-persian
// {weekday, day, month} Intl render so the no-JS mirror and the client
// re-render agree byte-for-byte (same weekday/month names as FA_WEEKDAYS/
// JALALI_MONTHS — both browser-verified against Intl in v13.120/v13.165).
export function jalaliWeekdayStr(iso: string): string {
  const t = tehranParts(iso);
  const j = toJalali(t.y, t.m, t.d);
  return FA_WEEKDAYS[t.wd] + " " + toFaDigits(String(j.jd)) + " " + JALALI_MONTHS[j.jm - 1];
}

// v13.170-mcref: the LATIN-digit twin of jalaliWeekdayStr — the V3 mobile
// card's digit rule (instr 8: Latin 0-9 on the date/time/countdown). The
// client renders faLat(Intl("fa-IR-u-ca-persian", {weekday, day, month}))
// — the same weekday/month words with the day digits mapped ۰-۹→0-9, so
// the no-JS mirror and the post-JS render agree byte-for-byte.
export function jalaliWeekdayStrLatin(iso: string): string {
  const t = tehranParts(iso);
  const j = toJalali(t.y, t.m, t.d);
  return FA_WEEKDAYS[t.wd] + " " + String(j.jd) + " " + JALALI_MONTHS[j.jm - 1];
}

export function jalaliDateStr(iso: string): string {
  const t = tehranParts(iso);
  const j = toJalali(t.y, t.m, t.d);
  return toFaDigits(String(j.jd)) + " " + JALALI_MONTHS[j.jm - 1] + " " + toFaDigits(String(j.jy));
}

// Human-friendly Gregorian date in Persian, Tehran calendar day.
export function faGregorianDate(iso: string): string {
  const t = tehranParts(iso);
  return FA_WEEKDAYS[t.wd] + " " + toFaDigits(String(t.d)) + " " + FA_MONTHS[t.m - 1] + " " + toFaDigits(String(t.y));
}

// v13.120-hero: the HERO date line — weekday + day + month (no year),
// the exact shape of the client's fmtHeroDate() so the server-rendered
// kickoff panel and the client re-render agree byte-for-byte.
export function faHeroDate(iso: string): string {
  const t = tehranParts(iso);
  return FA_WEEKDAYS[t.wd] + " " + toFaDigits(String(t.d)) + " " + FA_MONTHS[t.m - 1];
}

export function faGregorianDateShort(iso: string): string {
  const t = tehranParts(iso);
  return toFaDigits(String(t.d)) + " " + FA_MONTHS[t.m - 1] + " " + toFaDigits(String(t.y));
}

export function faWeekdayShort(iso: string): string {
  return FA_WEEKDAYS_SHORT[tehranParts(iso).wd];
}

// Kickoff time, Tehran wall clock, Persian digits: «۲۱:۳۰».
export function faTime(iso: string): string {
  const t = tehranParts(iso);
  const z = (n: number) => (n < 10 ? "0" + n : "" + n);
  return toFaDigits(z(t.hh) + ":" + z(t.mm));
}

// UTC time, Latin digits (for the secondary, unambiguous time line).
export function utcTime(iso: string): string {
  const dt = new Date(iso);
  const z = (n: number) => (n < 10 ? "0" + n : "" + n);
  return z(dt.getUTCHours()) + ":" + z(dt.getUTCMinutes()) + " UTC";
}

// Tehran calendar day key (YYYY-MM-DD of the Tehran wall clock).
export function tehranDayKey(iso: string): string {
  const t = tehranParts(iso);
  const z = (n: number) => (n < 10 ? "0" + n : "" + n);
  return t.y + "-" + z(t.m) + "-" + z(t.d);
}

export function todayTehranKey(env?: Env): string {
  return tehranDayKey(new Date().toISOString());
}

// Weekend (Iranian week: Saturday+Friday are the sport weekend; European
// football weekend = Saturday/Sunday Tehran evenings). this-weekend hub =
// the upcoming Saturday 00:00 → Sunday 23:59 Tehran window.
export function weekendWindowTehran(nowIso: string): { start: string; end: string } {
  const nowT = tehranParts(nowIso);
  // weekday index: 0=Sunday … 5=Friday, 6=Saturday (JS getDay-style)
  let daysToSat = (6 - nowT.wd + 7) % 7;
  const start = new Date(nowIso);
  // Build from Tehran midnight: convert via ms math (Tehran = UTC+3:30).
  const startUtcMs = Date.UTC(nowT.y, nowT.m - 1, nowT.d + daysToSat, -3, -30);
  start.setTime(startUtcMs);
  const end = new Date(startUtcMs + 2 * 864e5 - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

// Full English date (for <time> title attrs / EN hints).
export function enDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: SEO.DISPLAY_TZ, weekday: "long", day: "numeric", month: "long", year: "numeric"
  }).format(new Date(iso));
}

export function statusLabelFa(status: string): string {
  switch (String(status || "").toUpperCase()) {
    case "TIMED":
    case "SCHEDULED":
      return "برنامه‌ریزی‌شده";
    case "IN_PLAY":
    case "LIVE":
      return "در جریان";
    case "PAUSED":
      return "بین دو نیمه";
    case "FINISHED":
      return "پایان‌یافته";
    case "POSTPONED":
      return "معلق";
    case "SUSPENDED":
      return "متوقف‌شده";
    case "CANCELLED":
    case "CANCELED":
    case "CANCEL":
      return "لغوشده";
    default:
      return String(status || "");
  }
}

// Is this match still worth an "upcoming" treatment? (raw pool statuses)
export function isUpcomingStatus(status: string): boolean {
  const s = String(status || "").toUpperCase();
  return s === "TIMED" || s === "SCHEDULED";
}
export function isLiveSt(status: string): boolean {
  const s = String(status || "").toUpperCase();
  return s === "LIVE" || s === "IN_PLAY" || s === "PAUSED";
}
