// SportSignal — Telegram-side admin toolbelt (v13.71-admintools).
//
// The bot's owner (env.CHAT_ID — Alitagram, the identity v13.70-adminpulse
// armed for the heartbeat/pages) gets owner-only tools INSIDE Telegram:
//
//   /admin              → the admin panel (quick buttons)
//   /members            → the member roster — the same getBotMembers() data
//                         the web admin card shows (KV profiles + getChat
//                         backfill), newest member first, capped at the
//                         LAST 10 JOINED once the base outgrows 10
//   /members <query>    → the membership lookup — "is THIS id joined?"
//                         (exact chat-id, @username, or a name/title
//                         fragment; Persian digits fold to ASCII; exact-id
//                         hits get an explicit verdict line)
//   /status             → the bot's live health (the /healthz numbers as a
//                         Telegram message: heartbeat, cron, pool age,
//                         outbox, KV budget, admin-alerts layer)
//   /broadcast <text>   → send a message to every registered chat (paced,
//                         retried, outbox-backed — the v13.69 send path)
//
// Plus real-time membership signals: the admin chat is paged the moment a
// user joins (/start or the language-picker callback) or leaves (/stop).
// All admin traffic is Persian (the owner's language — the same convention
// as the heartbeat, cap warnings and phase-error pages).
//
// Gating: a command is admin-only iff its chat id === parseInt(env.CHAT_ID).
// An unparseable CHAT_ID (the v13.70 dead-paging shape) disables every
// tool here — same fail-closed rule the alert paths follow; healthz flags
// it via admin_alerts_ok:false.

import { CONFIG, VERSION } from "./config";
import type { Env } from "./types";
import { toFaDigits, escapeMarkdownCharacters, getJalaliDate } from "./utils";
import { getBotMembers, getRegisteredChats, getUserPrefs } from "./users";
// v13.92-d1userstore: single-row profile read (D1 primary / legacy blob).
import { chatProfileGet } from "./user-store";
import { getCronStatus } from "./monitoring";
import { sendTelegram } from "./telegram";

// The owner chat id (NaN when CHAT_ID is unset/unparseable — then nothing
// is admin-gated open and no pages are sent).
// (No TS return annotations on the admin-bot functions: the self-check
// scripts eval this module verbatim — the worker-src transform strips param
// annotations but not return types.)
export function adminChatId(env: Env) {
  return parseInt(env.CHAT_ID);
}

export function isAdminChat(env: Env, chatId) {
  const admin = adminChatId(env);
  return !isNaN(admin) && Number(chatId) === admin;
}

// The freshest profile for a chat (written by the bot.ts per-message upsert
// BEFORE any command branch runs, so a joining user's name/username is
// already stored when the join page fires).
async function chatProfile(env: Env, chatId) {
  try {
    // v13.92-d1userstore: single-row read through the seam.
    return (await chatProfileGet(env, chatId)) || {};
  } catch (e) {
    return {};
  }
}

// "علی (@alitagram)" / "علی" / "@alitagram" / "Tehran United" (a group
// chat's title — v13.105-membersearch: the title is searchable now, so it
// is also the label when a chat has no name/username) / "چت ۱۲۳" — the
// best display label for a member from their profile, MarkdownV2-escaped.
function memberLabel(p, chatId) {
  const name = p && p.first_name ? String(p.first_name) : "";
  const uname = p && p.username ? "@" + String(p.username) : "";
  const title = p && p.title ? String(p.title) : "";
  const label = [name, uname].filter(Boolean).join(" ") || title;
  return escapeMarkdownCharacters(label || ("چت " + chatId));
}

// v13.71: page the admin when a NEW member joins. Called from the /start
// branch on first registration and from the language-picker callback's
// registration path. Never pages when the joiner IS the admin (himself)
// and never throws (a failed page must not break onboarding).
export async function notifyAdminUserJoined(env: Env, chatId, totalMembers) {
  try {
    const admin = adminChatId(env);
    if (isNaN(admin) || Number(chatId) === admin) return;
    const p = await chatProfile(env, chatId);
    const msg = "\u{1F195} *\u0639\u0636\u0648 \u062C\u062F\u06CC\u062F:* " + memberLabel(p, chatId)
      + "\n\u{1F194} `" + String(chatId) + "`"
      + "\n\u{1F465} \u0645\u062C\u0645\u0648\u0639 \u0627\u0639\u0636\u0627: " + toFaDigits(String(totalMembers));
    await sendTelegram(env, msg, admin);
  } catch (e) {
    console.warn("notifyAdminUserJoined failed: " + e.message);
  }
}

// v13.71: page the admin when a member leaves (/stop). Only called when
// the chat WAS registered (a /stop from a stranger is not a leave).
export async function notifyAdminUserLeft(env: Env, chatId, totalMembers) {
  try {
    const admin = adminChatId(env);
    if (isNaN(admin) || Number(chatId) === admin) return;
    const p = await chatProfile(env, chatId);
    const msg = "\u{1F44B} *\u062E\u0631\u0648\u062C \u0639\u0636\u0648:* " + memberLabel(p, chatId)
      + "\n\u{1F194} `" + String(chatId) + "`"
      + "\n\u{1F465} \u0645\u062C\u0645\u0648\u0639 \u0627\u0639\u0636\u0627: " + toFaDigits(String(totalMembers));
    await sendTelegram(env, msg, admin);
  } catch (e) {
    console.warn("notifyAdminUserLeft failed: " + e.message);
  }
}

// The /admin panel: a short command card + quick-tap buttons (the same
// adm:* callbacks the callback_query handler serves).
export function adminPanelText() {
  // v13.104-admfix: the usage hint uses Persian guillemets «متن» — the old
  // "/broadcast <متن>" carried a RAW ">" (MarkdownV2 reserves it for
  // blockquotes) and Telegram rejected the WHOLE panel with parse-400 —
  // the owner's /admin did nothing. Guillemets are reserved-free AND
  // typographically correct for Persian copy.
  return "\u{1F6E0} *\u067E\u0646\u0644 \u0645\u062F\u06CC\u0631\u06CC\u062A SportSignal*\n\n"
    + "/members \u2014 \u0644\u06CC\u0633\u062A \u06F1\u06F0 \u0639\u0636\u0648 \u0622\u062E\u0631\n"
    + "/members \u00AB\u0622\u06CC\u062F\u06CC \u06CC\u0627 \u0646\u0627\u0645\u00BB \u2014 \u062C\u0633\u062A\u062C\u0648\u06CC \u0639\u0636\u0648 \u062E\u0627\u0635\n"
    + "/status \u2014 \u0648\u0636\u0639\u06CC\u062A \u0632\u0646\u062F\u0647 \u0631\u0628\u0627\u062A\n"
    + "/broadcast \u00AB\u0645\u062A\u0646\u00BB \u2014 \u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645 \u0628\u0647 \u0647\u0645\u0647 \u0627\u0639\u0636\u0627\n\n"
    + "\u0627\u0632 \u062F\u06A9\u0645\u0647\u200C\u0647\u0627\u06CC \u0632\u06CC\u0631 \u0647\u0645 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC\u062F \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646\u06CC\u062F:";
}

export function adminPanelKeyboard() {
  return { inline_keyboard: [[
    { text: "\u{1F465} \u0627\u0639\u0636\u0627", callback_data: "adm:members" },
    { text: "\u{1F4CA} \u0648\u0636\u0639\u06CC\u062A", callback_data: "adm:status" }
  ]] };
}

// v13.104-admfix: the default tz label "تهران (پیش‌فرض)" carries PARENS —
// MarkdownV2 reserves them, and the unescaped "(" made Telegram reject
// the ENTIRE /members roster with parse-400 (3 retries on a deterministic
// error → false, no outbox entry — the owner saw NOTHING while any member
// had no tz set; 4 of 7 live members were tz-less). Escaped at build
// time; check-admin's mdv2Safe gate keeps every admin message parse-safe.
const DEFAULT_TZ_FA = escapeMarkdownCharacters("\u062A\u0647\u0631\u0627\u0646 (\u067E\u06CC\u0634\u0654\u0641\u0631\u0636)");

// v13.105-membersearch: when the member base outgrows a readable list the
// roster shows only the LAST 10 JOINED (join-date desc; members with no
// known join date sink to the bottom), and "/members <query>" answers the
// owner's "is THIS id joined?" question.
const MEMBERS_LIST_CAP = 10;
const MEMBERS_SEARCH_CAP = 10;

// Fold Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII — a fa-keyboard
// admin pastes ids as ۴۲ just as naturally as 42. Backslashes are stripped
// (they can never be meaningful search input, and a stray one would break
// the MarkdownV2 echo).
function foldQueryDigits(s) {
  const FA = "\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9";
  const AR = "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669";
  let out = "";
  for (const ch of String(s)) {
    const fd = FA.indexOf(ch);
    const ad = AR.indexOf(ch);
    if (fd >= 0) out += String(fd);
    else if (ad >= 0) out += String(ad);
    else if (ch !== "\\") out += ch;
  }
  return out;
}

// The /members roster — getBotMembers() (registry + KV profiles + the
// budget-gated getChat backfill), newest join first, with lang + team
// follows from the prefs blob. ROSTER MODE (no query): everyone, capped at
// the LAST 10 JOINED when the base is larger, plus the search-syntax hint.
// SEARCH MODE ("/members <id | @username | name fragment>"): an exact
// chat-id match gets an explicit membership verdict; otherwise id
// fragments, usernames, names and group titles are matched
// (case-insensitive). Every render is still guarded by the ~3600-char
// ceiling (4096 Telegram max, escape-safe margin).
export async function adminMembersMessage(env: Env, query) {
  const { count, members } = await getBotMembers(env);
  const prefs = await getUserPrefs(env);
  const list = [...members].sort((a, b) => {
    const ja = a.joined ? new Date(a.joined).getTime() : 0;
    const jb = b.joined ? new Date(b.joined).getTime() : 0;
    return jb - ja;
  });
  // one member card — the v13.104 parse-safety rules preserved: joined date
  // + tz escaped, id RAW inside a code span (escape-inside-code is a
  // literal-backslash double-escape), DEFAULT_TZ_FA pre-escaped.
  const renderLine = (m, i) => {
    const p = prefs[String(m.id)] || {};
    const label = memberLabel(m, m.id);
    const joined = m.joined ? getJalaliDate(m.joined, env) : "\u0646\u0627\u0645\u0634\u062E\u0635";
    const teams = Array.isArray(p.teams) && p.teams.length
      ? toFaDigits(String(p.teams.length)) + " \u062A\u06CC\u0645"
      : "\u0647\u0645\u0647";
    return toFaDigits(String(i + 1)) + "\\. " + label
      + "\n\u{1F194} `" + String(m.id) + "` \u00B7 \u0639\u0636\u0648\u06CC\u062A: " + escapeMarkdownCharacters(joined)
      + " \u00B7 " + (p.lang === "en" ? "EN" : "FA") + " \u00B7 \u062A\u06CC\u0645\u200C\u0647\u0627: " + teams
      // v13.90-tzonboard: the owner sees each member's timezone (or the
      // Tehran default) — makes the tz onboarding rollout observable.
      + " \u00B7 \u23F0 " + (p.tz ? escapeMarkdownCharacters(p.tz) : DEFAULT_TZ_FA);
  };
  // the shared renderer: numbered cards until the 3600-char ceiling
  const renderLines = (items) => {
    const out = [];
    for (let i = 0; i < items.length; i++) {
      const line = renderLine(items[i], i);
      if (out.join("\n\n").length + line.length > 3600) break;
      out.push(line);
    }
    return out;
  };
  // ---- search mode: the membership lookup ----
  const rawQuery = String(query || "").trim().slice(0, 64).replace(/\\/g, "");
  const q = foldQueryDigits(rawQuery).toLowerCase();
  if (q) {
    const exact = list.filter((m) => String(m.id) === q);
    const uq = q.startsWith("@") ? q.slice(1) : q;
    const hits = exact.length ? exact : list.filter((m) =>
      String(m.id).includes(q)
      || (m.username && String(m.username).toLowerCase().includes(uq))
      || (m.first_name && String(m.first_name).toLowerCase().includes(uq))
      || (m.title && String(m.title).toLowerCase().includes(uq)));
    if (!hits.length) {
      // a digit query IS the "is this id joined?" question — answer it
      // explicitly instead of a generic no-match line.
      return "\uD83D\uDD0D *\u062C\u0633\u062A\u062C\u0648\u06CC \u0627\u0639\u0636\u0627* \u2014 \u00AB" + escapeMarkdownCharacters(rawQuery) + "\u00BB\n\n"
        + (/^\d+$/.test(q)
          ? "\u274C \u0627\u06CC\u0646 \u0622\u06CC\u062F\u06CC \u0639\u0636\u0648 \u0631\u0628\u0627\u062A \u0646\u06CC\u0633\u062A\\."
          : "\u274C \u0647\u06CC\u0686 \u0639\u0636\u0648\u06CC\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u0645\u0634\u062E\u0635\u0627\u062A \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F\\.");
    }
    const shown = renderLines(hits.slice(0, MEMBERS_SEARCH_CAP));
    const rest = hits.length - shown.length;
    let msg = "\uD83D\uDD0D *\u062C\u0633\u062A\u062C\u0648\u06CC \u0627\u0639\u0636\u0627* \u2014 \u00AB" + escapeMarkdownCharacters(rawQuery) + "\u00BB\n"
      + (exact.length
        ? "\u2705 \u0627\u06CC\u0646 \u0622\u06CC\u062F\u06CC \u0639\u0636\u0648 \u0631\u0628\u0627\u062A \u0627\u0633\u062A:"
        : toFaDigits(String(hits.length)) + " \u0646\u062A\u06CC\u062C\u0647:")
      + "\n\n" + shown.join("\n\n");
    if (rest > 0) msg += "\n\n\u2026 \u0648 " + toFaDigits(String(rest)) + " \u0646\u062A\u06CC\u062C\u0647 \u062F\u06CC\u06AF\u0631";
    return msg;
  }
  // ---- roster mode: everyone, or the last 10 joined when too many ----
  const cappedList = count > MEMBERS_LIST_CAP ? list.slice(0, MEMBERS_LIST_CAP) : list;
  const lines = renderLines(cappedList);
  const rest = count - lines.length;
  // v13.104-admfix: ربات was typo'd ربت (missing the alef) — one header,
  // every /members render since v13.71.
  let msg = "\u{1F465} *\u0627\u0639\u0636\u0627\u06CC \u0631\u0628\u0627\u062A* \u2014 " + toFaDigits(String(count)) + " \u0646\u0641\u0631"
    + (count > MEMBERS_LIST_CAP ? " \u00B7 \u0646\u0645\u0627\u06CC\u0634 " + toFaDigits(String(lines.length)) + " \u0639\u0636\u0648 \u0622\u062E\u0631" : "")
    + "\n\n" + (lines.length ? lines.join("\n\n") : "\u0647\u06CC\u0686 \u0639\u0636\u0648\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A\u064E");
  if (rest > 0) msg += "\n\n\u2026 \u0648 " + toFaDigits(String(rest)) + " \u0639\u0636\u0648 \u062F\u06CC\u06AF\u0631";
  // the discovery line for the search capability — on every roster render.
  msg += "\n\n\uD83D\uDD0D \u062C\u0633\u062A\u062C\u0648\u06CC \u0639\u0636\u0648: /members \u00AB\u0622\u06CC\u062F\u06CC \u06CC\u0627 \u0646\u0627\u0645\u00BB";
  return msg;
}

// The /status card — the same numbers /healthz exposes (heartbeat age,
// last-completed-cron age, pool freshness, outbox depth, KV write burn,
// admin-alerts layer), as a Persian Telegram message with a verdict.
export async function adminStatusMessage(env: Env) {
  const st = await getCronStatus(env);
  const heartbeat = parseInt(st.heartbeat) || 0;
  const hbAge = heartbeat ? Math.round((Date.now() - heartbeat) / 6e4) : -1;
  const lastCron = parseInt(st.last_cron) || 0;
  const cronAge = lastCron ? Math.round((Date.now() - lastCron) / 6e4) : -1;
  let outboxDepth = 0;
  try {
    const ob = await env.STATE.get(CONFIG.KV_OUTBOX, "json").catch(() => null);
    outboxDepth = Array.isArray(ob) ? ob.length : 0;
  } catch (e) { }
  let poolAgeMin = -1, poolMatches = 0;
  try {
    const pool = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
    if (pool && pool.fetchedAt) {
      const t = new Date(pool.fetchedAt).getTime();
      if (!isNaN(t)) poolAgeMin = Math.round((Date.now() - t) / 6e4);
      poolMatches = Array.isArray(pool.matches) ? pool.matches.length : 0;
    }
  } catch (e) { }
  const adminOk = !isNaN(adminChatId(env));
  const kvWrites = parseInt(st.kv_writes_day) || 0;
  const healthy = hbAge >= 0 && hbAge <= 30 && cronAge >= 0 && cronAge <= 35 && outboxDepth < 50 && poolAgeMin >= 0 && poolAgeMin <= 180 && adminOk;
  const verdict = healthy
    ? "\u{1F7E2} \u0633\u0627\u0644\u0645"
    : (hbAge >= 0 && hbAge <= 90 ? "\u{1F7E1} \u0646\u06CC\u0627\u0632\u0645\u0646\u062F \u0628\u0631\u0631\u0633\u06CC" : "\u{1F534} \u0645\u0634\u06A9\u0644");
  const age = (v) => v < 0 ? "\u0646\u0627\u0645\u0639\u0644\u0648\u0645" : toFaDigits(String(v)) + " \u062F\u0642\u06CC\u0642\u0647 \u067E\u06CC\u0634";
  // v13.104-admfix: version / budget / api_source are rendered RAW inside
  // code spans — code-span content needs no escaping (only the backtick
  // is special), so the old escapeMarkdownCharacters here was a DOUBLE
  // escape that rendered literal backslashes (`13\.103\-…`) in the card.
  return "\u{1F4CA} *\u0648\u0636\u0639\u06CC\u062A SportSignal* \u2014 \u0646\u0633\u062E\u0647 `" + VERSION + "`\n\n"
    + "\u062D\u0627\u0644 \u06A9\u0644\u06CC: " + verdict + "\n"
    + "\u23F1 \u0622\u062E\u0631\u06CC\u0646 \u062A\u06CC\u06A9 \u06A9\u0627\u0645\u0644: " + age(cronAge) + "\n"
    + "\u2764\uFE0F \u0636\u0631\u0628\u0627\u0646: " + age(hbAge) + "\n"
    + "\u26BD \u0627\u0633\u062A\u062E\u0631 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627: " + toFaDigits(String(poolMatches)) + " \u0645\u0633\u0627\u0628\u0642\u0647 \u00B7 " + age(poolAgeMin) + "\n"
    + "\u{1F4EE} \u0635\u0641 \u0627\u0631\u0633\u0627\u0644 \u0645\u0646\u062A\u0638\u0631: " + toFaDigits(String(outboxDepth)) + "\n"
    + "\u{1F4BE} \u0646\u0648\u0634\u062A\u0627\u0631 KV \u0627\u0645\u0631\u0648\u0632: " + toFaDigits(String(kvWrites))
    + (st.budget ? " \u00B7 \u0628\u0648\u062F\u062C\u0647: `" + String(st.budget) + "`" : "") + "\n"
    + "\u{1F6A8} \u0644\u0627\u06CC\u0647 \u0647\u0634\u062F\u0627\u0631 \u0645\u062F\u06CC\u0631: " + (adminOk ? "\u2713 \u0641\u0639\u0627\u0644" : "\u2717 \u063A\u06CC\u0631\u0641\u0639\u0627\u0644")
    + (st.api_source ? "\n\U0001F4E1 \u0645\u0646\u0628\u0639 \u062F\u0627\u062F\u0647: `" + String(st.api_source) + "`" : "");
}

// /broadcast <text> — send a message to every registered chat. The body is
// escaped (renders verbatim — the admin's punctuation can't break
// MarkdownV2), capped at 3500 raw chars, sent SEQUENTIALLY through the
// v13.69 paced/retried/outbox-backed sender. Returns a Persian summary;
// false results are "queued" (the outbox will retry them on the next
// cron tick), "dead" chats are reported for pruning awareness.
export async function adminBroadcast(env: Env, body) {
  const chats = await getRegisteredChats(env);
  if (!chats.length) return "\u{1F4E2} \u0647\u06CC\u0686 \u0639\u0636\u0648\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A.";
  const safe = escapeMarkdownCharacters(String(body).slice(0, 3500));
  let sentCount = 0, queued = 0, dead = 0;
  for (const c of chats) {
    const r = await sendTelegram(env, safe, c);
    if (r === true) sentCount++;
    else if (r === "dead") dead++;
    else queued++;
  }
  return "\u{1F4E2} *\u0627\u0631\u0633\u0627\u0644 \u06AF\u0631\u0648\u0647\u06CC \u062A\u0645\u0627\u0645 \u0634\u062F*\n\n"
    + "\u2705 \u0627\u0631\u0633\u0627\u0644\u200C\u0634\u062F\u0647: " + toFaDigits(String(sentCount)) + "\n"
    + "\u{1F4EE} \u062F\u0631 \u0635\u0641 \u062A\u0644\u0627\u0634 \u0645\u062C\u062F\u062F: " + toFaDigits(String(queued)) + "\n"
    + "\u{1F5D1} \u0686\u062A\u200C\u0647\u0627\u06CC \u0645\u0631\u062F\u0647: " + toFaDigits(String(dead));
}
