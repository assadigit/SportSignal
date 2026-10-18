// SportSignal — the WEEKLY digest: the Monday-morning league tables
// (sendLeagueTables + maybeSendWeeklyTables, per-chat KV dedupe) and the
// week-ahead fixtures message (buildWeekAheadMessage + sendWeekAhead).
// Extracted from digest.ts in v13.77-digestnotify.
//
// v13.124-weeklyfanout: THE CHUNKED FAN-OUT. The 2026-10-19 01:30 Tehran
// digest (10 registered chats) reached only the first TWO chats in roster
// order — the owner's report, confirmed live: the digest needs 10 × ~12
// Telegram sends (5 stickers + 6 tables + week-ahead) ≈ 120 subrequests
// against one cron invocation's ~50 ceiling (fetches + KV ops — the same
// accounting fanoutReservation has used since v13.94). The tail chats'
// deferred sends went to the outbox — whose pushes are KV puts — and the
// push storm blew the account's 1000/day KV write quota MID-LOOP (error
// 10048, caught live in the tail: "KV put() limit exceeded for the day"),
// so the outbox swallowed every loss while the write-first week marker
// had already consumed the week. Permanent silent loss for 8 of 10 users
// — the exact v13.94 notify-engine disease, never applied to this path.
// THE CURE mirrors v13.94: the digest now (1) renders ONCE per week into
// a KV payload snapshot (standings fetched a single time, no per-tick
// re-fetch), (2) serves users in budget-checked BURSTS — a burst only
// starts when its worst-case cost fits the remaining true-subrequest
// budget (WEEKLY_FANOUT_CAP), and (3) resumes across the 10-minute ticks
// via a KV cursor of still-pending chats, persisted BEFORE each burst
// (remove-before-send: the never-spam precedence of the v13.37 marker).
// Completion is allowed past the 06:00 window edge while the cursor is
// fresh (finishing beats the window; the window only gates STARTING).
// Under a KV-write outage the cursor put fails BEFORE any send → the
// burst is restored and the digest retries next tick (fail-closed, the
// quota-death self-heal the old outbox storm could never do).
import { CONFIG } from "./config";
import { COMP_EN } from "./tables";
import type { Env } from "./types";
import { toFaDigits, escapeMarkdownCharacters, getNowTehran, zonedHm, zonedYmDHm, subrequestCount, kvOpsCount } from "./utils";
// v13.106-mdstyle: entity builders (bold teams, italic competition). No
// entity NESTING: the derby/UCL lines keep their emoji anchors instead of
// the old whole-line bold (a bold wrapper around a line that now contains
// bold/italic spans would nest entities — MarkdownV2 cannot).
// v13.107-plaintimes: the fixture TIME (and the weekday) render PLAIN
// (mdEscape) — the user's readability ask (was a monospace code span).
import { mdBold, mdItalic, mdEscape } from "./md";
import { translateTeam, translateCompetition } from "./translate";
import { shouldReport, isMasterPair, isDerby, isBotSilentLeague } from "./match-classify";
import { fetchStandings, buildLeagueTableMessage, isoWeekKey, weeklyTableCodes } from "./composers";
import { sendTelegram, sendSticker } from "./telegram";
import { getLeagueStickers } from "./stickers";
import { getUserPrefs } from "./users";
import { getCachedMatches } from "./match-pool";

export async function sendLeagueTables(env: Env, chatIds, opts, lang?) {
  const lng = lang === "en" ? "en" : "fa";
  const out: any = { leagues: [], sent: 0, failed: 0 };
  if (!Array.isArray(chatIds) || !chatIds.length) {
    out.error = "no chats";
    return out;
  }
  // v13.114-stickers: the league logo ahead of its table — the owner's
  // [laliga sticker][laliga table] layout. One KV read per burst (memoized
  // in stickers.ts); file_ids were harvested at pack-creation time. A
  // league without a sticker (PGL, CL) just skips the logo — fail-open.
  const stickers = await getLeagueStickers(env);
  const messages = [];
  for (const code of weeklyTableCodes()) {
    let st = null;
    try {
      // v13.53-standsteady: the weekly digest keeps the 10-min freshness —
      // it renders the table once a week, so the freshest data wins (7
      // fetches/week is nothing against the volume we just cut).
      st = await fetchStandings(env, code, true, { freshMs: 6e5 });
    } catch (e) {
      st = null;
    }
    if (!st || !Array.isArray(st.teams) || !st.teams.length) {
      out.leagues.push({ code, ok: false, reason: "unavailable" });
      continue;
    }
    if (st.started === false) {
      out.leagues.push({ code, ok: false, reason: "not-started" });
      continue;
    }
    messages.push({ code, text: buildLeagueTableMessage(code, st, opts, lng) });
    out.leagues.push({ code, ok: true, rows: code === "CL" ? Math.min(10, st.teams.length) : st.teams.length, matchday: st.matchday || null });
  }
  for (const chatId of chatIds) {
    for (const m of messages) {
      const fid = stickers ? stickers[m.code] : null;
      if (fid) {
        // Decorative: a failed/"dead" sticker NEVER blocks the table
        // behind it (no outbox either — a retry could double the logo).
        const r = await sendSticker(env, chatId, fid);
        if (r === true) out.stickers = (out.stickers || 0) + 1;
      }
      if (await sendTelegram(env, m.text, chatId)) out.sent++;
      else out.failed++;
    }
  }
  return out;
}
export async function buildWeekAheadMessage(env: Env, lang) {
  const en = lang === "en";
  let pool = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
  let matches = pool && Array.isArray(pool.matches) ? pool.matches : [];
  if (!matches.length) matches = await getCachedMatches(env);
  const now = Date.now();
  const to = now + CONFIG.WEEK_AHEAD_DAYS * 864e5;
  // v13.109-consolidated: the CONSOLIDATED tier — one-desired fixtures
  // (Brentford–Liverpool, Strasbourg–PSG) live HERE, exactly what the
  // user's rule asks: listed in the weekly message, never pushed one-by-one.
  // v13.113-alquiet: the bot-silent leagues are exempt even here — the
  // week-ahead is still a robot message (the owner's rule: "Do not notify
  // Australia league in the robot").
  const worthy = matches.filter((m) => shouldReport(m) && !isBotSilentLeague(m.competition && m.competition.code) && new Date(m.utcDate).getTime() >= now - 36e5 && new Date(m.utcDate).getTime() < to);
  if (!worthy.length) return null;
  const byKick = (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
  const derbies = worthy.filter((m) => isDerby(m)).sort(byKick);
  const uclDuels = worthy.filter((m) => !isDerby(m) && m.competition && m.competition.code === "CL" && isMasterPair(m)).sort(byKick);
  const rest = worthy.filter((m) => !derbies.includes(m) && !uclDuels.includes(m)).sort(byKick).slice(0, 10);
  const fmtLine = (m, mark) => {
    // v13.116-tzproof: the weekday label came from a weekday-ONLY Intl
    // format and the time from a TIME-ONLY one — both in the broken-colo
    // class (some Cloudflare edge colos render them UTC / wrong-era).
    // Arithmetic now: wall-clock parts once, static weekday names, fa
    // digits for the time. Fallback keeps the old Intl shapes for the
    // exotic case where the offset probe fails entirely.
    const wall = zonedYmDHm(env.TEHRAN_TZ || "Asia/Tehran", new Date(m.utcDate));
    let weekday, time;
    if (wall) {
      const WD_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const WD_FA = ["\u06CC\u06A9\u0634\u0646\u0628\u0647", "\u062F\u0648\u0634\u0646\u0628\u0647", "\u0633\u0647\u200C\u0634\u0646\u0628\u0647", "\u0686\u0647\u0627\u0631\u0634\u0646\u0628\u0647", "\u067E\u0646\u062C\u200C\u0634\u0646\u0628\u0647", "\u062C\u0645\u0639\u0647", "\u0634\u0646\u0628\u0647"];
      weekday = en ? WD_EN[wall.dow] : WD_FA[wall.dow];
      time = wall.hm;
    } else {
      // Fail-open (the tzLocalTime "" contract): NO time-only Intl fallback
      // — that is exactly the broken-colo class this fix removes. A row
      // without its time beats a row with a WRONG time.
      weekday = "";
      time = "";
    }
    const timeStr = en ? time : toFaDigits(time);
    const home = en ? m.homeTeam.name : translateTeam(m.homeTeam.name);
    const away = en ? m.awayTeam.name : translateTeam(m.awayTeam.name);
    const comp = en ? (COMP_EN[m.competition.code] || m.competition.code) : translateCompetition(m.competition.code);
    const vs = en ? " vs " : " \u{1F19A} ";
    return mark + mdBold(home) + vs + mdBold(away) + " \u2014 " + mdEscape(weekday) + " " + mdEscape(timeStr) + " \u2014 " + mdItalic(comp);
  };
  const lines = [];
  for (const m of derbies) lines.push(fmtLine(m, "\u2694\uFE0F "));
  for (const m of uclDuels) lines.push(fmtLine(m, "\u{1F525} "));
  for (const m of rest) lines.push(fmtLine(m, ""));
  const extraCount = worthy.length - derbies.length - uclDuels.length - rest.length;
  const head = en ? "*Matches this week*\n\n" : "*\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0647\u0641\u062A\u0647 \u0622\u06CC\u0646\u062F\u0647*\n\n";
  let msg = head + lines.join("\n");
  if (extraCount > 0) {
    const extraStr = en ? "\n+ " + String(extraCount) + " more matches" : "\n\u2026 \u0648 " + toFaDigits(String(extraCount)) + " \u0628\u0627\u0632\u06CC \u062F\u06CC\u06AF\u0631";
    msg += extraStr;
  }
  return msg;
}
export async function sendWeekAhead(env: Env, chatIds, lang?) {
  const out = { sent: 0, failed: 0, text: null };
  if (!Array.isArray(chatIds) || !chatIds.length) return out;
  let text = null;
  try {
    text = await buildWeekAheadMessage(env, lang);
  } catch (e) {
    console.error("week-ahead build failed: " + e.message);
  }
  if (!text) return out;
  out.text = text;
  for (const chatId of chatIds) {
    if (await sendTelegram(env, text, chatId)) out.sent++;
    else out.failed++;
  }
  return out;
}

// ============================================================================
// v13.124-weeklyfanout — the chunked digest machinery.
// ============================================================================

// The per-isolate payload memo: a warm isolate reuses the week's rendered
// snapshot when the KV payload write failed (the quota-death window) so a
// live cursor doesn't re-fetch all standings on every tick. 10-min bound —
// same freshness discipline as the stickers memo.
var WEEKLY_PAYLOAD_MEMO = { week: null, at: 0, payload: null };

function weeklyBurstCost(group) {
  if (!group) return 1;
  let sends = ((group.tables && group.tables.length) || 0) + (group.weekAhead ? 1 : 0);
  for (const t of group.tables || []) if (t && t.sticker) sends++;
  // +2: retry margin (a 429 re-attempt) + the cursor put itself.
  return sends + 2;
}

// Render the whole week's digest ONCE: standings fetched a single time,
// table texts + week-ahead built per language, sticker file_ids embedded
// (the snapshot is self-contained — continuation ticks need zero fetches).
// Shape: { week, leagues, groups: { fa: {tables:[{code,text,sticker}],
// weekAhead}, en: {...} }, pending: { fa: [chatIds], en: [chatIds] } }
export async function buildWeeklyPayload(env: Env, chatIds) {
  if (!Array.isArray(chatIds) || !chatIds.length) return null;
  const prefs = typeof getUserPrefs === "function" ? await getUserPrefs(env) : {};
  const byLang: any = { fa: [], en: [] };
  for (const c of chatIds) {
    const p = prefs[String(c)] || {};
    byLang[p.lang === "en" ? "en" : "fa"].push(c);
  }
  const stickers = (await getLeagueStickers(env)) || {};
  const codes = weeklyTableCodes();
  const standingsByCode: any = {};
  const leagues: any[] = [];
  for (const code of codes) {
    let st = null;
    try {
      st = await fetchStandings(env, code, true, { freshMs: 6e5 });
    } catch (e) {
      st = null;
    }
    if (!st || !Array.isArray(st.teams) || !st.teams.length) {
      leagues.push({ code, ok: false, reason: "unavailable" });
      continue;
    }
    if (st.started === false) {
      leagues.push({ code, ok: false, reason: "not-started" });
      continue;
    }
    standingsByCode[code] = st;
    leagues.push({ code, ok: true, rows: code === "CL" ? Math.min(10, st.teams.length) : st.teams.length, matchday: st.matchday || null });
  }
  const payload: any = { week: isoWeekKey(getNowTehran(env)), leagues, groups: {}, pending: byLang };
  for (const lng of ["fa", "en"]) {
    if (!byLang[lng].length) continue;
    const label = lng === "en" ? "End of week" : "\u067E\u0627\u06CC\u0627\u0646 \u0647\u0641\u062A\u0647";
    const tables = [];
    for (const code of codes) {
      const st = standingsByCode[code];
      if (!st) continue;
      tables.push({ code, text: buildLeagueTableMessage(code, st, { label }, lng), sticker: stickers[code] || null });
    }
    let weekAhead = null;
    try {
      weekAhead = await buildWeekAheadMessage(env, lng);
    } catch (e) {
      console.error("week-ahead build failed: " + e.message);
    }
    payload.groups[lng] = { tables, weekAhead };
  }
  return payload;
}

// One chat's digest burst: [logo sticker][league table] per league, then
// the week-ahead — the exact per-chat sequence the old loop produced.
async function serveWeeklyBurst(env: Env, chatId, group) {
  const out = { sent: 0, failed: 0, stickers: 0 };
  if (!group) return out;
  for (const m of group.tables || []) {
    if (m && m.sticker) {
      // Decorative: a failed sticker NEVER blocks the table behind it.
      const r = await sendSticker(env, chatId, m.sticker);
      if (r === true) out.stickers++;
    }
    if (await sendTelegram(env, m.text, chatId)) out.sent++;
    else out.failed++;
  }
  if (group.weekAhead) {
    if (await sendTelegram(env, group.weekAhead, chatId)) out.sent++;
    else out.failed++;
  }
  return out;
}

// Drain the cursor under the subrequest reservation. Returns the tick's
// summary; the cursor on KV always reflects the still-pending chats.
async function continueWeeklyDigest(env: Env, cursor, payload) {
  const out: any = { leagues: payload && payload.leagues || [], sent: 0, failed: 0, stickers: 0, served: 0, pending: 0, deferred: 0 };
  for (const lng of ["fa", "en"]) {
    const pending = Array.isArray(cursor.pending[lng]) ? cursor.pending[lng].slice() : [];
    while (pending.length) {
      const chatId = pending[0];
      const group = payload && payload.groups ? payload.groups[lng] : null;
      // THE RESERVATION (the v13.94 discipline): a user's burst only
      // starts when its worst-case cost fits the remaining TRUE budget
      // (fetches + KV ops). No headroom → defer cleanly to the next tick
      // — never a mid-flight death where the tail chats lose everything.
      if (subrequestCount() + kvOpsCount() + weeklyBurstCost(group) > (CONFIG.WEEKLY_FANOUT_CAP || 44)) {
        out.deferred += pending.length;
        break;
      }
      // remove-before-send (the v13.37 marker's never-spam precedence) +
      // persist: an unpersistable removal means an unrecorded serve — the
      // next tick would re-send. On put failure the chat goes BACK and
      // the digest stops for this tick (fail-closed; the KV-write-outage
      // self-heal — the 2026-10-19 quota-death could never do this).
      pending.shift();
      cursor.pending[lng] = pending;
      cursor.ts = Date.now();
      try {
        await env.STATE.put(CONFIG.KV_WEEKLY_CURSOR, JSON.stringify(cursor), { expirationTtl: 8 * 86400 });
      } catch (e) {
        pending.unshift(chatId);
        cursor.pending[lng] = pending;
        console.error("Weekly-digest cursor save failed — digest paused, retrying next tick (fail-closed anti-spam): " + e.message);
        out.deferred += pending.length;
        break;
      }
      const r = await serveWeeklyBurst(env, chatId, group);
      out.sent += r.sent;
      out.failed += r.failed;
      out.stickers += r.stickers;
      out.served++;
    }
    cursor.pending[lng] = cursor.pending[lng] || [];
  }
  const left = (cursor.pending.fa || []).length + (cursor.pending.en || []).length;
  out.pending = left;
  if (left === 0) {
    // Complete: the week's digest reached every registered chat.
    try {
      await env.STATE.delete(CONFIG.KV_WEEKLY_CURSOR);
    } catch (e) { /* TTL 8d self-expires; the fresh-check below skips it */ }
    console.log("\uD83D\uDCCA Weekly digest COMPLETE — every chat served (" + out.sent + " messages this tick)");
  }
  return out;
}

// Load (or rebuild once) the week's payload snapshot. KV first; on a miss
// (TTL lapse / the write failed during a quota outage) the per-isolate
// memo, then a live rebuild whose put failure is non-fatal (the memo
// carries this isolate through the outage).
async function loadWeeklyPayload(env: Env, cursor) {
  let payload = null;
  try {
    payload = await env.STATE.get(CONFIG.KV_WEEKLY_PAYLOAD, "json");
  } catch (e) {
    payload = null;
  }
  if (payload && payload.week === cursor.week) return payload;
  if (WEEKLY_PAYLOAD_MEMO.payload && WEEKLY_PAYLOAD_MEMO.week === cursor.week && Date.now() - WEEKLY_PAYLOAD_MEMO.at < 6e5) {
    return WEEKLY_PAYLOAD_MEMO.payload;
  }
  const chats = [].concat(cursor.pending.fa || [], cursor.pending.en || []);
  payload = await buildWeeklyPayload(env, chats);
  if (!payload) return null;
  payload.week = cursor.week;
  WEEKLY_PAYLOAD_MEMO = { week: cursor.week, at: Date.now(), payload };
  try {
    await env.STATE.put(CONFIG.KV_WEEKLY_PAYLOAD, JSON.stringify(payload), { expirationTtl: 8 * 86400 });
  } catch (e) {
    console.warn("Weekly-digest payload save failed (memo carries this isolate): " + e.message);
  }
  return payload;
}

export async function maybeSendWeeklyTables(env: Env, chatIds) {
  const t = getNowTehran(env);
  const week = isoWeekKey(t);
  // CONTINUATION FIRST: a live cursor outranks the window — finish what a
  // previous tick (or the admin's manual send) began, even past 06:00.
  // Freshness bound 12h: a stale cursor (abandoned mid-outage) is deleted,
  // never resumed into a wrong week.
  let cursor = null;
  try {
    cursor = await env.STATE.get(CONFIG.KV_WEEKLY_CURSOR, "json").catch(() => null);
  } catch (e) {
    cursor = null;
  }
  if (cursor && cursor.pending && Array.isArray(cursor.pending.fa) && Date.now() - (cursor.ts || 0) < 12 * 36e5) {
    const payload = await loadWeeklyPayload(env, cursor);
    return await continueWeeklyDigest(env, cursor, payload);
  }
  if (cursor) {
    try {
      await env.STATE.delete(CONFIG.KV_WEEKLY_CURSOR);
    } catch (e) { }
  }
  // START: the window + once-per-week gates (unchanged semantics).
  if (t.getUTCDay() !== CONFIG.WEEKLY_TABLES.day) return null;
  const mins = t.getUTCHours() * 60 + t.getUTCMinutes();
  if (mins < CONFIG.WEEKLY_TABLES.fromMin || mins >= CONFIG.WEEKLY_TABLES.toMin) return null;
  const done = await env.STATE.get(CONFIG.KV_WEEKLY_TABLES).catch(() => null);
  if (done === week) return null;
  if (!Array.isArray(chatIds) || !chatIds.length) return null;
  // Render the week's snapshot (standings fetched ONCE — the payload is
  // the single source for every subsequent tick's bursts).
  const payload = await buildWeeklyPayload(env, chatIds);
  if (!payload) return null;
  // v13.37-nospam2 discipline, EXTENDED: payload + cursor + marker are all
  // persisted BEFORE any send. The old send-then-mark order re-broadcast
  // the full tables digest on every tick of the window (up to ~27 copies)
  // when the marker write failed; the same holds for the cursor now. Any
  // write failure → skip this tick (nothing sent → no spam, retry next
  // tick). Fail closed: one missed weekly digest beats a duplicate storm.
  // (A total Telegram outage at digest time still loses that week's
  // digest — accepted: never-spam outranks never-miss for one-shot
  // digests. Per-event notifications keep outbox recovery.)
  try {
    await env.STATE.put(CONFIG.KV_WEEKLY_PAYLOAD, JSON.stringify(payload), { expirationTtl: 8 * 86400 });
    await env.STATE.put(CONFIG.KV_WEEKLY_CURSOR, JSON.stringify({ week, ts: Date.now(), pending: payload.pending }), { expirationTtl: 8 * 86400 });
    await env.STATE.put(CONFIG.KV_WEEKLY_TABLES, week);
  } catch (e) {
    console.error("Weekly-tables digest bootstrap failed — retrying next tick (fail-closed anti-spam): " + e.message);
    return null;
  }
  WEEKLY_PAYLOAD_MEMO = { week, at: Date.now(), payload };
  return await continueWeeklyDigest(env, { week, ts: Date.now(), pending: payload.pending }, payload);
}

// The admin panel's manual "send tables" — the operator's explicit re-send
// (window + marker ignored BY DESIGN: pressing the button means send NOW).
// Seeds the cursor with EVERY registered chat and serves what fits this
// invocation's own budget; the cron's continuation drains the rest.
export async function startManualWeeklyDigest(env: Env, chatIds) {
  if (!Array.isArray(chatIds) || !chatIds.length) return { queued: 0, served: 0, pending: 0, leagues: [] };
  const week = isoWeekKey(getNowTehran(env));
  const payload = await buildWeeklyPayload(env, chatIds);
  if (!payload) return { queued: 0, served: 0, pending: 0, leagues: [] };
  try {
    await env.STATE.put(CONFIG.KV_WEEKLY_PAYLOAD, JSON.stringify(payload), { expirationTtl: 8 * 86400 });
    await env.STATE.put(CONFIG.KV_WEEKLY_CURSOR, JSON.stringify({ week, ts: Date.now(), pending: payload.pending }), { expirationTtl: 8 * 86400 });
  } catch (e) {
    return { queued: 0, served: 0, pending: 0, leagues: payload.leagues || [], error: "cursor save failed: " + e.message };
  }
  WEEKLY_PAYLOAD_MEMO = { week, at: Date.now(), payload };
  const r = await continueWeeklyDigest(env, { week, ts: Date.now(), pending: payload.pending }, payload);
  return { queued: chatIds.length, served: r.served, pending: r.pending, leagues: payload.leagues || [], sent: r.sent, failed: r.failed };
}
