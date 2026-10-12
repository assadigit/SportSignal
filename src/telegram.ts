// SportSignal — Telegram Bot API senders with retry / 429 pause /
// dead-chat detection, plus callback_query answering.
//
// v13.2: sendTelegram and the old keyboard variant were ~95% duplicated
// (identical retry/429-pause/dead-chat logic) — merged into ONE sender with
// an optional keyboard parameter. The v12.x sendTelegramWithKeyboard alias
// and the URL-based sendPhoto (superseded by sendPhotoBinary, v13.17) were
// removed in v13.46-trim — zero call sites.
import { CONFIG } from "./config";
import type { Env } from "./types";
import { vlog, bumpSubrequest } from "./utils";

var TELEGRAM_PAUSE_UNTIL = 0;

// v13.69-pacenotify: proactive global pacing. Telegram's bot-level limit is
// ~30 messages/sec; the broadcast fan-outs (Promise.allSettled over every
// chat) fire all sends in parallel, so ≥30 chats is a guaranteed 429
// cascade. A 40ms floor between Telegram API calls (~25/sec) keeps every
// fan-out under the limit. The wait is pure wall-clock sleep (zero CPU
// against the free plan's 10ms rolling average; a cron tick has minutes of
// wall-time headroom). Per-isolate like TELEGRAM_PAUSE_UNTIL — the cron's
// broadcast fan-out lives in ONE invocation, which is exactly the burst
// that needs pacing; webhook isolates send 1-2 messages each.
var TG_LAST_API_AT = 0;
async function paceTelegram() {
  const gap = CONFIG.TELEGRAM_MIN_SEND_GAP_MS || 40;
  const waitMs = TG_LAST_API_AT + gap - Date.now();
  if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
  TG_LAST_API_AT = Date.now();
}

// v13.69-pacenotify: wait OUT a live 429 pause instead of dropping the
// send. Returns true once the pause has lifted (the caller proceeds with
// the send), false when the pause outlives the bound (the caller defers
// via the outbox / re-queue — never a silent drop). Telegram's
// global-limit retry_after is 1-5s; the bound is 8s so a normal pause
// always clears.
async function waitTelegramPause() {
  const start = Date.now();
  while (Date.now() < TELEGRAM_PAUSE_UNTIL) {
    if (Date.now() - start >= (CONFIG.TELEGRAM_PAUSE_WAIT_MAX_MS || 8000)) return false;
    await new Promise((r) => setTimeout(r, Math.min(TELEGRAM_PAUSE_UNTIL - Date.now(), 250)));
  }
  return true;
}

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
    // v13.69-pacenotify: a live 429 pause no longer kills the send on
    // arrival. The old `if (paused) return false;` was the silent-loss
    // hole: callers persist the write-first dedupe record BEFORE sending,
    // so a paused send was never retried — the exact shape of a burst-429
    // broadcast casualty (30+ parallel sends, the first 429 sets the pause,
    // every other send drops dead with no outbox entry). Now the sender
    // WAITS OUT the pause (bounded); only a pause that outlives the bound
    // defers via the outbox.
    if (Date.now() < TELEGRAM_PAUSE_UNTIL && !(await waitTelegramPause())) {
      await outboxPush(env, text, chatId, keyboard).catch((e) => console.warn("Outbox push failed: " + e.message));
      return false;
    }
    await paceTelegram();
    if (bumpSubrequest()) {
      // v13.69: subrequest-budget exhaustion defers via the outbox too
      // (was another silent `return false` — a message the next tick's
      // drain can and should recover).
      await outboxPush(env, text, chatId, keyboard).catch((e) => console.warn("Outbox push failed: " + e.message));
      return false;
    }
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
// v13.69-pacenotify: serialized per isolate. The pause/budget deferral
// paths in sendTelegram can now reach the outbox from several concurrent
// fan-out promises — concurrent read-modify-write cycles on the same KV key
// silently DROP entries (each push read the list before the other's write
// landed). A promise chain serializes the pushes; cross-isolate races stay
// bounded by KV last-write-wins (pre-existing, the same window drainOutbox
// documents — never-spam outranks never-miss).
var OUTBOX_CHAIN: Promise<void> = Promise.resolve();
export async function outboxPush(env: Env, text, chatId, keyboard?) {
  const run = OUTBOX_CHAIN.then(async () => {
    try {
      const list = await env.STATE.get(CONFIG.KV_OUTBOX, "json").catch(() => null) || [];
      list.push({ text, chatId, keyboard: keyboard || null, ts: Date.now(), attempts: 0 });
      // Cap: drop oldest entries beyond the max.
      while (list.length > (CONFIG.KV_OUTBOX_MAX || 200)) list.shift();
      await env.STATE.put(CONFIG.KV_OUTBOX, JSON.stringify(list), { expirationTtl: 7 * 86400 }).catch(() => {});
    } catch (e) {
      console.warn("Outbox push failed: " + e.message);
    }
  });
  OUTBOX_CHAIN = run.then(() => undefined, () => undefined);
  await run;
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
    // v13.69-pacenotify: same pause semantics as sendTelegram, except a
    // pause that outlives the bound returns false WITHOUT an outbox push —
    // the caller here is drainOutbox, which re-queues failures itself
    // (outboxing from the drain would recurse).
    if (Date.now() < TELEGRAM_PAUSE_UNTIL && !(await waitTelegramPause())) return false;
    await paceTelegram();
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
    await paceTelegram();
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

// v13.12-cards: URL-based sendPhoto — REMOVED in v13.46-trim. Telegram
// fetched the image server-side via URL (Cloudflare Image Resizing era);
// superseded by sendPhotoBinary (v13.17), which uploads the resvg-wasm PNG
// buffer directly. Zero call sites remained.

// v13.17-cards: sendPhotoBinary — send a PNG image as a binary upload
// (multipart/form-data). This is how the bot sends match-card images:
// the Worker renders the SVG→PNG via resvg-wasm, then uploads the PNG
// buffer directly to Telegram (no URL fetch — Telegram can't fetch SVG).
// v13.18: if `parseMode` is true, the caption is sent as MarkdownV2
// (so bold/team names render in the caption).
// Returns true on success, "dead" for dead chats, false otherwise.
// v13.69-pacenotify: the photo path had ZERO retries — a single 429/5xx
// silently lost the card (the per-chat text fallback in notifications.ts
// catches the residue, but a retry keeps the rich card on transient
// blips). Same pause/pacing semantics as the text senders; 2 attempts —
// the photo upload is the heaviest call, and the text fallback is the
// safety net behind it.
export async function sendPhotoBinary(env: Env, chatId, pngBuffer: ArrayBuffer, caption?, parseMode?: boolean) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (Date.now() < TELEGRAM_PAUSE_UNTIL && !(await waitTelegramPause())) return false;
    await paceTelegram();
    if (bumpSubrequest()) return false;
    try {
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
      console.error(`sendPhotoBinary error (attempt ${attempt}/2): ${error}`);
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("retry-after") || "2");
        TELEGRAM_PAUSE_UNTIL = Math.max(TELEGRAM_PAUSE_UNTIL, Date.now() + Math.min(Math.max(retryAfter, 1), 10) * 1e3);
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      if (res.status >= 400 && res.status < 500) {
        return /chat not found|blocked by the user|bot was kicked|deactivated/i.test(error) ? "dead" : false;
      }
    } catch (e) {
      console.error(`sendPhotoBinary network error (attempt ${attempt}/2): ` + e.message);
    }
    if (attempt < 2) await new Promise((r) => setTimeout(r, 1e3 * attempt));
  }
  return false;
}

// v12.x compatibility alias sendTelegramWithKeyboard — REMOVED in v13.46-trim
// (delegates to sendTelegram; zero call sites since v13.2 merged the logic).

// v12.x-bilingual-bot: answer a callback_query (dismisses the loading
// spinner on the inline button the user just tapped). Optional text shows
// a small toast to the user.
// v13.49-buttons: edit an inline-keyboard message in place (the /teams grid
// and the timezone picker re-render on tap so the \u2705 marks never go
// stale). Single attempt, never throws \u2014 a failed edit is cosmetic (the
// answerCallbackQuery toast already confirmed the action to the user).
export async function editMessageText(env: Env, chatId, messageId, text, keyboard?) {
  try {
    if (bumpSubrequest()) return false;
    const payload: any = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "MarkdownV2"
    };
    if (keyboard) payload.reply_markup = keyboard;
    const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/editMessageText`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.text();
      // "message is not modified" is benign (double-tap race) — log others only
      if (!/message is not modified/.test(err)) console.error("editMessageText failed:", err);
    }
    return res.ok;
  } catch (e) {
    console.error("editMessageText network error:", e.message);
    return false;
  }
}

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
