// SportSignal — Telegram Bot API senders with retry / 429 pause /
// dead-chat detection, plus callback_query answering.
//
// v13.2: sendTelegram and sendTelegramWithKeyboard were ~95% duplicated
// (identical retry/429-pause/dead-chat logic) — merged into ONE sender with
// an optional keyboard. sendTelegramWithKeyboard stays exported as an alias
// so existing call sites keep working.
import { CONFIG } from "./config";
import type { Env } from "./types";
import { vlog, bumpSubrequest } from "./utils";

var TELEGRAM_PAUSE_UNTIL = 0;

// Send a MarkdownV2 message. Returns true on success, "dead" when the chat
// is gone (not found / blocked / kicked / deactivated), false otherwise.
// `keyboard` (optional) is a Telegram InlineKeyboardMarkup object:
// {inline_keyboard: [[{text, callback_data}]]}.
// v13.9-reliability #3: on final failure (3 retries exhausted), the message
// is written to the dead-letter outbox (KV pending_sends_v1) so the next
// cron sweep can retry it with exponential backoff. A message is NEVER
// silently lost — only dropped when the chat is confirmed dead.
export async function sendTelegram(env: Env, text, chatId, keyboard?) {
  const payload: any = {
    chat_id: chatId,
    text,
    parse_mode: "MarkdownV2"
  };
  if (keyboard) payload.reply_markup = keyboard;
  for (let attempt = 1; attempt <= CONFIG.TELEGRAM_RETRY_ATTEMPTS; attempt++) {
    if (Date.now() < TELEGRAM_PAUSE_UNTIL) return false;
    if (bumpSubrequest()) return false;
    try {
      const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        vlog(`\u2705 Telegram${keyboard ? " (keyboard)" : ""} sent to ${chatId}`);
        return true;
      }
      const error = await res.text();
      console.error(`Telegram${keyboard ? " keyboard" : ""} error (attempt ${attempt}/${CONFIG.TELEGRAM_RETRY_ATTEMPTS}):`, error);
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("retry-after") || "2");
        TELEGRAM_PAUSE_UNTIL = Math.max(TELEGRAM_PAUSE_UNTIL, Date.now() + Math.min(Math.max(retryAfter, 1), 10) * 1e3);
        if (attempt < CONFIG.TELEGRAM_RETRY_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1500));
        }
        continue;
      }
      if (res.status >= 400 && res.status < 500) {
        const dead = /chat not found|blocked by the user|bot was kicked|deactivated/i.test(error);
        if (dead) return "dead";
        // Non-dead 4xx (e.g. message too long, bad markdown) — don't outbox
        // (retrying won't help), just fail. Outbox is for transient failures.
        return false;
      }
    } catch (error) {
      console.error(`Telegram network error (attempt ${attempt}/${CONFIG.TELEGRAM_RETRY_ATTEMPTS}):`, error.message);
    }
    if (attempt < CONFIG.TELEGRAM_RETRY_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, 1e3 * attempt));
    }
  }
  // v13.9-reliability #3: all 3 retries exhausted → dead-letter outbox.
  // The message will be retried by the next cron sweep's drainOutbox step.
  await outboxPush(env, text, chatId, keyboard).catch((e) => console.warn("Outbox push failed: " + e.message));
  return false;
}

// v13.9-reliability #3: push a failed send to the outbox KV list. Capped at
// KV_OUTBOX_MAX entries (oldest dropped) so a sustained outage doesn't
// bloat KV. Each entry carries an attempt count for exponential backoff.
export async function outboxPush(env: Env, text, chatId, keyboard?) {
  try {
    const list = await env.STATE.get(CONFIG.KV_OUTBOX, "json").catch(() => null) || [];
    list.push({ text, chatId, keyboard: keyboard || null, ts: Date.now(), attempts: 0 });
    // Cap: drop oldest entries beyond the max.
    while (list.length > (CONFIG.KV_OUTBOX_MAX || 200)) list.shift();
    await env.STATE.put(CONFIG.KV_OUTBOX, JSON.stringify(list), { expirationTtl: 7 * 86400 }).catch(() => {});
  } catch (e) {
    console.warn("Outbox push failed: " + e.message);
  }
}

// v13.9-reliability #3: drain the outbox. Retries each pending send with
// exponential backoff (1min → 2min → 5min → 15min → 30min). Drops entries
// after 6 attempts (sustained failure) or when the chat is confirmed dead.
// Called at the start of every cron sweep.
export async function drainOutbox(env: Env) {
  const list = await env.STATE.get(CONFIG.KV_OUTBOX, "json").catch(() => null) || [];
  if (!list.length) return { drained: 0, remaining: 0, dead: 0 };
  const now = Date.now();
  const BACKOFFS = [60e3, 12e4, 3e5, 9e5, 18e5, 36e5]; // 1m,2m,5m,15m,30m,60m
  const keep = [];
  let drained = 0, dead = 0;
  for (const item of list) {
    const dueAt = item.ts + (BACKOFFS[Math.min(item.attempts, BACKOFFS.length - 1)] || 36e5);
    if (now < dueAt) { keep.push(item); continue; }
    const r = await sendTelegramDirect(env, item.text, item.chatId, item.keyboard);
    if (r === true) {
      drained++;
    } else if (r === "dead") {
      dead++;
    } else {
      // Still failing — re-queue with incremented attempt count (unless
      // we've hit the max 6 attempts, then drop to avoid infinite retry).
      item.attempts = (item.attempts || 0) + 1;
      item.ts = now;
      if (item.attempts <= 6) keep.push(item);
    }
  }
  await env.STATE.put(CONFIG.KV_OUTBOX, JSON.stringify(keep), { expirationTtl: 7 * 86400 }).catch(() => {});
  return { drained, remaining: keep.length, dead };
}

// Direct send without outbox recursion (so the drain loop can't re-outbox).
// Same retry/429/dead-chat logic as sendTelegram but no outbox push on fail.
export async function sendTelegramDirect(env: Env, text, chatId, keyboard?) {
  const payload: any = { chat_id: chatId, text, parse_mode: "MarkdownV2" };
  if (keyboard) payload.reply_markup = keyboard;
  for (let attempt = 1; attempt <= CONFIG.TELEGRAM_RETRY_ATTEMPTS; attempt++) {
    if (Date.now() < TELEGRAM_PAUSE_UNTIL) return false;
    if (bumpSubrequest()) return false;
    try {
      const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) return true;
      const error = await res.text();
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("retry-after") || "2");
        TELEGRAM_PAUSE_UNTIL = Math.max(TELEGRAM_PAUSE_UNTIL, Date.now() + Math.min(Math.max(retryAfter, 1), 10) * 1e3);
        if (attempt < CONFIG.TELEGRAM_RETRY_ATTEMPTS) await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      if (res.status >= 400 && res.status < 500) {
        return /chat not found|blocked by the user|bot was kicked|deactivated/i.test(error) ? "dead" : false;
      }
    } catch (error) {
      console.error(`Telegram direct (attempt ${attempt}) error:`, error.message);
    }
    if (attempt < CONFIG.TELEGRAM_RETRY_ATTEMPTS) await new Promise((r) => setTimeout(r, 1e3 * attempt));
  }
  return false;
}

// Compatibility alias (v12.x call sites) — delegates to the merged sender.
export async function sendTelegramWithKeyboard(env: Env, text, chatId, keyboard) {
  return sendTelegram(env, text, chatId, keyboard);
}

// v12.x-bilingual-bot: answer a callback_query (dismisses the loading
// spinner on the inline button the user just tapped). Optional text shows
// a small toast to the user.
export async function answerCallbackQuery(env: Env, callbackQueryId, text) {
  try {
    if (bumpSubrequest()) return false;
    const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: text || "", show_alert: false })
    });
    if (!res.ok) console.error("answerCallbackQuery failed:", await res.text());
    return res.ok;
  } catch (e) {
    console.error("answerCallbackQuery network error:", e.message);
    return false;
  }
}
