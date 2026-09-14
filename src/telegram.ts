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
// v13.38-qc: WRITE-FIRST drain. The old order (send → put the keep-list)
// meant a failed keep-list write re-sent ALREADY-DELIVERED messages on the
// next tick — the last at-least-once duplicate vector left in the codebase
// (narrow: KV writes failing while Telegram works, but exactly the quota-
// exhaustion shape this bot has lived through). Now: pop the due items,
// persist the remaining list FIRST (abort the drain if that put fails —
// nothing sent, nothing lost, retry next tick), then send the popped items.
// A popped item whose send fails is re-queued with a best-effort append —
// the only loss case is a Telegram failure DURING a KV-write outage, the
// same window where outboxPush already loses entries today. Never-spam
// outranks never-miss, consistently.
export async function drainOutbox(env: Env) {
  const list = await env.STATE.get(CONFIG.KV_OUTBOX, "json").catch(() => null) || [];
  if (!list.length) return { drained: 0, remaining: 0, dead: 0 };
  const now = Date.now();
  const BACKOFFS = [60e3, 12e4, 3e5, 9e5, 18e5, 36e5]; // 1m,2m,5m,15m,30m,60m
  const keep = [];
  const due = [];
  for (const item of list) {
    const dueAt = item.ts + (BACKOFFS[Math.min(item.attempts, BACKOFFS.length - 1)] || 36e5);
    if (now < dueAt) keep.push(item);
    else due.push(item);
  }
  if (!due.length) return { drained: 0, remaining: keep.length, dead: 0 };
  // Persist the post-pop list BEFORE any send (write-first). Abort the whole
  // drain if this fails — the due items stay queued and nothing re-sends.
  try {
    await env.STATE.put(CONFIG.KV_OUTBOX, JSON.stringify(keep), { expirationTtl: 7 * 86400 });
  } catch (e) {
    console.error("Outbox keep-list save failed — aborting drain this tick (fail-closed anti-spam)");
    return { drained: 0, remaining: list.length, dead: 0 };
  }
  let drained = 0, dead = 0;
  const requeue = [];
  for (const item of due) {
    const r = await sendTelegramDirect(env, item.text, item.chatId, item.keyboard);
    if (r === true) {
      drained++;
    } else if (r === "dead") {
      dead++;
    } else {
      // Still failing — re-queue with incremented attempt count (unless
      // we've hit the max 6 attempts, then drop to avoid infinite retry).
      item.attempts = (item.attempts || 0) + 1;
      item.ts = Date.now();
      if (item.attempts <= 6) requeue.push(item);
    }
  }
  if (requeue.length) {
    await env.STATE.put(CONFIG.KV_OUTBOX, JSON.stringify(keep.concat(requeue)), { expirationTtl: 7 * 86400 }).catch(() => {
      console.warn("Outbox re-queue save failed — " + requeue.length + " message(s) dropped (KV write outage)");
    });
  }
  return { drained, remaining: keep.length + requeue.length, dead };
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

// v13.10-animated: sendDice — Telegram's built-in ANIMATED emoji. The emoji
// appears full-screen and animates (a football spins, a player kicks it),
// then settles on a random value. This is the simplest "animated emoji" —
// zero asset hosting, zero deps, one API call. Available emoji:
//   🎲 🎯 🏀 ⚽ 🎰 🎳 💎
// For a football bot, ⚽ on match-start is perfect — a spinning ball that
// signals "kickoff!". Returns the dice value (1-5 for ⚽) on success, null
// on failure. Sent as a SEPARATE message (can't be inline with text).
export async function sendDice(env: Env, chatId, emoji) {
  try {
    if (bumpSubrequest()) return null;
    const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendDice`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, emoji: emoji || "\u26BD" })
    });
    if (!res.ok) {
      console.error("sendDice failed:", await res.text());
      return null;
    }
    const data = await res.json() as any;
    return data && data.result && data.result.dice ? data.result.dice.value : null;
  } catch (e) {
    console.error("sendDice network error:", e.message);
    return null;
  }
}

// v13.12-cards: sendPhoto — send an image by URL. Telegram fetches the URL
// server-side. Used for match-card images: the Worker serves an SVG card at
// /api/card/<matchKey>, and Cloudflare Image Resizing converts it to PNG on
// the fly (if enabled on the zone). If Image Resizing isn't available, the
// SVG URL still works as a document fallback (sendDocument). Returns true
// on success, "dead" for dead chats, false otherwise.
export async function sendPhoto(env: Env, chatId, photoUrl, caption?) {
  const payload: any = { chat_id: chatId, photo: photoUrl };
  if (caption) payload.caption = caption;
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (Date.now() < TELEGRAM_PAUSE_UNTIL) return false;
    if (bumpSubrequest()) return false;
    try {
      const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendPhoto`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        vlog(`\u{1F4F7} Photo sent to ${chatId}`);
        return true;
      }
      const error = await res.text();
      console.error(`sendPhoto error (attempt ${attempt}):`, error);
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("retry-after") || "2");
        TELEGRAM_PAUSE_UNTIL = Math.max(TELEGRAM_PAUSE_UNTIL, Date.now() + Math.min(Math.max(retryAfter, 1), 10) * 1e3);
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      if (res.status >= 400 && res.status < 500) {
        return /chat not found|blocked by the user|bot was kicked|deactivated/i.test(error) ? "dead" : false;
      }
    } catch (error) {
      console.error(`sendPhoto network error (attempt ${attempt}):`, error.message);
    }
    if (attempt < 2) await new Promise((r) => setTimeout(r, 1e3 * attempt));
  }
  return false;
}

// v13.17-cards: sendPhotoBinary — send a PNG image as a binary upload
// (multipart/form-data). This is how the bot sends match-card images:
// the Worker renders the SVG→PNG via resvg-wasm, then uploads the PNG
// buffer directly to Telegram (no URL fetch — Telegram can't fetch SVG).
// v13.18: if `parseMode` is true, the caption is sent as MarkdownV2
// (so bold/team names render in the caption).
// Returns true on success, "dead" for dead chats, false otherwise.
export async function sendPhotoBinary(env: Env, chatId, pngBuffer: ArrayBuffer, caption?, parseMode?: boolean) {
  try {
    if (bumpSubrequest()) return false;
    const formData = new FormData();
    formData.append("chat_id", String(chatId));
    formData.append("photo", new Blob([pngBuffer], { type: "image/png" }), "match-card.png");
    if (caption) {
      formData.append("caption", caption);
      if (parseMode) formData.append("parse_mode", "MarkdownV2");
    }
    const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendPhoto`, {
      method: "POST",
      body: formData
    });
    if (res.ok) {
      vlog(`\u{1F4F7} Photo (binary) sent to ${chatId}`);
      return true;
    }
    const error = await res.text();
    console.error(`sendPhotoBinary error: ${error}`);
    if (res.status >= 400 && res.status < 500) {
      return /chat not found|blocked by the user|bot was kicked|deactivated/i.test(error) ? "dead" : false;
    }
    return false;
  } catch (e) {
    console.error("sendPhotoBinary network error: " + e.message);
    return false;
  }
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
