// SportSignal — Telegram Bot API senders with retry / 429 pause /
// dead-chat detection, plus callback_query answering.
//
// v13.2: sendTelegram and the old keyboard variant were ~95% duplicated
// (identical retry/429-pause/dead-chat logic) — merged into ONE sender with
// an optional keyboard parameter. The v12.x sendTelegramWithKeyboard alias
// and the URL-based sendPhoto (superseded by sendPhotoBinary, v13.17) were
// removed in v13.46-trim — zero call sites.
import { CONFIG, VERSION } from "./config";
import type { Env } from "./types";
import { vlog, bumpSubrequest, escapeMarkdownCharacters } from "./utils";

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

// v13.115-trialfoot: the owner's trial marker — every text-bearing
// message the bot delivers ends with the «نسخه آزمایشی.» footer line.
// ONE choke point at the SENDER layer: sendTelegram (whose outbox entries
// store the ALREADY-FOOTERED text), sendTelegramDirect (the drain path —
// idempotent, so an outboxed footer never doubles), editMessageText (menu
// edits re-compose fresh text, so the footer survives every tap) and the
// photo/animation captions (cap 1024 — Telegram's caption limit).
// Fail-open by design (the sticker philosophy): a text at the 4096/1024
// ceiling ships WITHOUT the footer rather than crossing the limit and
// losing the message itself; idempotent (includes-guard) so re-sends,
// drains and edits never stack two footers.
// v13.119-hbfix: the footer now ends with a PERIOD (the owner's ask) — a
// MarkdownV2 reserved character. The md flag therefore selects the append
// form: MarkdownV2 paths get the escaped footer (the period rides as «\.»
// — parse-safe), plain-text caption paths (sendAnimation's banner, a
// parseMode-less sendPhotoBinary) get the raw display string (no visible
// backslash). The idempotency guard matches the marker WITHOUT its
// trailing period too — a prefix of every historical form (raw, escaped,
// and the pre-13.119 outbox entries whose footer had no period yet), so
// the drain can never double it. Stickers and dice carry no text: the
// footer is physically impossible there, by design.
export function withTrialFooter(text, cap?, md?) {
  const f = CONFIG.TRIAL_FOOTER;
  if (!f || typeof text !== "string" || !text) return text;
  // Idempotency: the marker with OR without its trailing period — the
  // period-less form is a PREFIX of the raw footer, of the escaped footer
  // (the backslash sits after it), and of the pre-13.119 outbox entries.
  if (text.indexOf(f.replace(/[.!]$/, "")) >= 0) return text;
  const limit = cap || 4096;
  // The appended form's length governs the ceiling (the escaped footer is
  // one backslash longer — the fail-open boundary must stay exact).
  const app = md ? escapeMarkdownCharacters(f) : f;
  if (text.length + 1 + app.length > limit) return text;
  return text + "\n" + app;
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
  // v13.115-trialfoot: footer BEFORE the payload AND before every outbox
  // push below — the outbox stores the footered text, so the drain's
  // sendTelegramDirect re-append is a no-op (idempotent guard).
  // v13.119-hbfix: md=true — sendMessage rides MarkdownV2, so the footer's
  // period is appended in its escaped form.
  text = withTrialFooter(text, 4096, true);
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
// v13.125-stickeroutbox: entries may carry an optional `sticker` — a
// [sticker][text] PAIR queued as ONE unit. Born from the 2026-10-19 01:30
// Tehran digest's second life: the 23:10 UTC outbox drain delivered the
// tail chats' league tables as BARE texts (the outbox could not carry the
// logo, so the recovered tables arrived without their [laliga sticker]
// prefix — the owner's report). The pair travels together now; the drain
// re-attempts the layout in one go. Returns TRUE when the entry actually
// persisted — the old `.catch(() => {})` on the put SWALLOWED the 10048
// quota-death, so a caller could never tell a queued pair from a lost one
// (the digest senders fall back to the bare direct send on a failed push —
// the payload rule: a table must not die with its flourish).
// `sticker` is backwards-compatible: entries written before v13.125 have
// no field and drain text-only, exactly as before.
export async function outboxPush(env: Env, text, chatId, keyboard?, sticker?): Promise<boolean> {
  let ok = false;
  const run = OUTBOX_CHAIN.then(async () => {
    try {
      const list = await env.STATE.get(CONFIG.KV_OUTBOX, "json").catch(() => null) || [];
      list.push({ text, chatId, keyboard: keyboard || null, sticker: sticker || null, ts: Date.now(), attempts: 0 });
      // Cap: drop oldest entries beyond the max.
      while (list.length > (CONFIG.KV_OUTBOX_MAX || 200)) list.shift();
      await env.STATE.put(CONFIG.KV_OUTBOX, JSON.stringify(list), { expirationTtl: 7 * 86400 });
      ok = true;
    } catch (e) {
      console.warn("Outbox push failed: " + e.message);
    }
  });
  OUTBOX_CHAIN = run.then(() => undefined, () => undefined);
  await run;
  return ok;
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
    // v13.125-stickeroutbox: an entry that still carries a sticker is an
    // unfinished [sticker][text] pair — the logo goes FIRST (the owner's
    // [laliga sticker][laliga table] layout), in THIS invocation's fresh
    // budget. A sticker that lands is CLEARED from the item BEFORE any
    // requeue decision, so a text retry can never duplicate the logo. A
    // sticker that fails again NEVER blocks the table behind it (the
    // payload rule) — the text still goes out bare; two failed sticker
    // attempts (burst + drain, each with its own 429 retry) is where the
    // flourish yields to the payload.
    if (item.sticker) {
      const sr = await sendSticker(env, item.chatId, item.sticker);
      if (sr === "dead") { dead++; continue; }
      if (sr === true) item.sticker = null;
    }
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
  // v13.115-trialfoot: the drain path — outbox entries written by THIS
  // version already carry the footer (idempotent no-op); entries queued
  // by an older deploy get their footer here, at delivery time.
  // v13.119-hbfix: md=true — MarkdownV2 path; the pre-13.119 outbox
  // entries (period-less footer) are still recognized by the guard.
  text = withTrialFooter(text, 4096, true);
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
  // v13.115-trialfoot: the match-card caption is a message footer too
  // (1024 = Telegram's caption ceiling). v13.119-hbfix: parseMode is the
  // md flag — MarkdownV2 captions get the escaped footer, plain-text
  // captions the raw one.
  if (caption) caption = withTrialFooter(caption, 1024, parseMode);
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

// v13.99-uclgif: sendAnimation — the UCL night GIF (assets/bot/ucl-night.gif).
// `animation` is either a Telegram file_id (the cached fast path) or a public
// URL (Telegram fetches it server-side). The caption is PLAIN TEXT (no
// parse_mode) — banner captions are emoji + words, never markdown, so no
// MarkdownV2 escaping belongs here (the v13.96.1 "can't parse entities"
// lesson). Same pacing / 429-pause / dead-chat semantics as the other
// senders, 2 attempts (the GIF is a cosmetic banner — the text message
// behind it is the real payload; NO outbox: a missed GIF must never queue a
// retry that could double the banner).
// Returns the animation object (with file_id) on success, "dead" for dead
// chats, false otherwise.
export async function sendAnimation(env: Env, chatId, animation, caption?) {
  // v13.115-trialfoot: the GIF banner caption is a message footer too
  // (1024 = Telegram's caption ceiling). v13.119-hbfix: this path sends
  // with NO parse-mode — the caption is plain text, so the footer rides
  // RAW (its period renders as-is; no MarkdownV2 escaping belongs on a
  // plain-text caption, the v13.96.1 lesson).
  if (caption) caption = withTrialFooter(caption, 1024);
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (Date.now() < TELEGRAM_PAUSE_UNTIL && !(await waitTelegramPause())) return false;
    await paceTelegram();
    if (bumpSubrequest()) return false;
    try {
      const payload: any = { chat_id: chatId, animation };
      if (caption) payload.caption = caption;
      const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendAnimation`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json() as any;
        vlog(`\u{1F39E} Animation sent to ${chatId}`);
        return (data && data.result && (data.result.animation || data.result.document)) || true;
      }
      const error = await res.text();
      console.error(`sendAnimation error (attempt ${attempt}/2): ${error}`);
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
      console.error(`sendAnimation network error (attempt ${attempt}/2): ` + e.message);
    }
    if (attempt < 2) await new Promise((r) => setTimeout(r, 1e3 * attempt));
  }
  return false;
}

// v13.99-uclgif: the UCL night banner — file_id-first. The first send (or the
// first after the 90-day TTL lapses / a 400 cleared a stale file_id) goes by
// URL (Telegram uploads from https://sportsignal.ir/bot/ucl-night.gif) and
// re-stores the returned file_id; every later send is a cached file_id —
// instant and independent of our site. Returns sendAnimation's verdict.
export async function sendUclGifBanner(env: Env, chatId, caption?) {
  const fileId = await env.STATE.get(CONFIG.KV_UCL_GIF_FILEID).catch(() => null);
  if (fileId) {
    const r = await sendAnimation(env, chatId, fileId, caption);
    if (r && r !== "dead" && r !== false) return r;
    if (r === "dead") return "dead";
    // false — most likely "wrong file_id" (Telegram purged it / a token
    // regeneration): clear the cache and fall through to the URL upload.
    await env.STATE.delete(CONFIG.KV_UCL_GIF_FILEID).catch(() => {});
  }
  const r2 = await sendAnimation(env, chatId, CONFIG.UCL_GIF_URL, caption);
  if (r2 && r2 !== "dead" && r2 !== false && r2.file_id) {
    await env.STATE.put(CONFIG.KV_UCL_GIF_FILEID, r2.file_id, { expirationTtl: 90 * 86400 }).catch(() => {});
  }
  return r2;
}

// v13.114-stickers: send a league-logo STICKER by cached file_id — pure
// Telegram-side picture infrastructure. The pack lives on Telegram's CDN
// (created once by scripts/make-sticker-pack.js from assets/stickers/*.png);
// this call carries only a chat_id + file_id: no bytes of ours, no WASM
// render, no bundled asset. Cosmetic semantics like sendAnimation (the GIF
// banner's class): 2 attempts, NO outbox — a missed sticker must never
// queue a retry that could double the flourish; the table message behind
// it is the real payload. Returns true / "dead" / false like the others.
export async function sendSticker(env: Env, chatId, sticker) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (Date.now() < TELEGRAM_PAUSE_UNTIL && !(await waitTelegramPause())) return false;
    await paceTelegram();
    if (bumpSubrequest()) return false;
    try {
      const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendSticker`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, sticker })
      });
      if (res.ok) {
        vlog(`🏷 Sticker sent to ${chatId}`);
        return true;
      }
      const error = await res.text();
      console.error(`sendSticker error (attempt ${attempt}/2): ${error}`);
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
      console.error(`sendSticker network error (attempt ${attempt}/2): ` + e.message);
    }
    if (attempt < 2) await new Promise((r) => setTimeout(r, 1e3 * attempt));
  }
  return false;
}

// v13.99-botmenu: the "/" command menu — the user's report: typing "/" in
// Telegram showed NO commands because setMyCommands was never called. These
// lists are the SOURCE OF TRUTH (scripts/set-bot-commands.js re-uses them
// for operator re-runs via the harness transform). fa is the DEFAULT scope
// (the bot's audience is Persian-first); en rides language_code="en". The
// owner's chat additionally gets the admin toolbelt (BotCommandScope chat).
// /featured is a real handler (bot.ts) that /help never listed — the menu
// now surfaces it.
export const BOT_MENU_FA = [
  { command: "start", description: "\u0634\u0631\u0648\u0639 \u0631\u0628\u0627\u062A \u0648 \u0639\u0636\u0648\u06CC\u062A" },
  { command: "help", description: "\u0631\u0627\u0647\u0646\u0645\u0627\u06CC \u062F\u0633\u062A\u0648\u0631\u0647\u0627" },
  { command: "teams", description: "\u0641\u0647\u0631\u0633\u062A \u062A\u06CC\u0645\u200C\u0647\u0627 \u0628\u0631\u0627\u06CC \u0627\u0646\u062A\u062E\u0627\u0628" },
  { command: "follow", description: "\u0627\u0646\u062A\u062E\u0627\u0628 \u062A\u06CC\u0645\u200C\u0647\u0627: /follow 1,3,7" },
  { command: "next", description: "\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648\u06CC \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0634\u0645\u0627" },
  { command: "featured", description: "\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0634\u0627\u062E\u0635" },
  { command: "tables", description: "\u062C\u062F\u0648\u0644\u200C\u0647\u0627\u06CC \u0644\u06CC\u06AF \u0648 \u0647\u0641\u062A\u0647 \u067E\u06CC\u0634\u200C\u0631\u0648" },
  { command: "timezone", description: "\u062A\u0646\u0638\u06CC\u0645 \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC" },
  { command: "lang", description: "\u062A\u063A\u06CC\u06CC\u0631 \u0632\u0628\u0627\u0646 \u0641\u0627\u0631\u0633\u06CC/English" },
  { command: "stop", description: "\u0644\u063A\u0648 \u0639\u0636\u0648\u06CC\u062A" }
];
export const BOT_MENU_EN = [
  { command: "start", description: "join & set up the bot" },
  { command: "help", description: "command guide" },
  { command: "teams", description: "list teams to follow" },
  { command: "follow", description: "pick teams: /follow 1,3,7" },
  { command: "next", description: "your teams' upcoming matches" },
  { command: "featured", description: "featured matches" },
  { command: "tables", description: "league tables + week ahead" },
  { command: "timezone", description: "set your timezone" },
  { command: "lang", description: "switch language \u0641\u0627\u0631\u0633\u06CC/English" },
  { command: "stop", description: "unsubscribe" }
];
// The owner's chat ALSO sees the toolbelt (scope "chat" = env.CHAT_ID).
export const BOT_MENU_ADMIN_FA = BOT_MENU_FA.concat([
  { command: "status", description: "\u0648\u0636\u0639\u06CC\u062A \u0631\u0628\u0627\u062A \u0648 \u062A\u06CC\u06A9\u200C\u0647\u0627" },
  { command: "members", description: "\u0627\u0639\u0636\u0627\u06CC \u0631\u0628\u0627\u062A" },
  { command: "admin", description: "\u067E\u0646\u0644 \u0645\u062F\u06CC\u0631\u06CC\u062A" },
  { command: "broadcast", description: "\u067E\u06CC\u0627\u0645 \u0647\u0645\u06AF\u0627\u0646\u06CC: /broadcast \u0645\u062A\u0646" }
]);
export const BOT_MENU_ADMIN_EN = BOT_MENU_EN.concat([
  { command: "status", description: "bot status & ticks" },
  { command: "members", description: "bot members" },
  { command: "admin", description: "admin panel" },
  { command: "broadcast", description: "broadcast: /broadcast text" }
]);

// v13.99-botmenu: setMyCommands — register (a slice of) the "/" menu.
// `scope` is a Telegram BotCommandScope (default / chat); `languageCode`
// selects the per-language command set. Idempotent by design.
export async function setMyCommands(env: Env, commands, scope?, languageCode?) {
  try {
    await paceTelegram();
    if (bumpSubrequest()) return false;
    const payload: any = { commands };
    if (scope) payload.scope = scope;
    if (languageCode) payload.language_code = languageCode;
    const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setMyCommands`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      console.error("setMyCommands failed: " + (await res.text()));
      return false;
    }
    return true;
  } catch (e) {
    console.error("setMyCommands network error: " + e.message);
    return false;
  }
}

// v13.99-botmenu: register the menu once per VERSION (KV-flagged, per-isolate
// memoized — a read per cold isolate, then nothing). Called at the top of
// the notify phase; a failure logs and moves on (the menu is cosmetic, the
// notifications are not). scripts/set-bot-commands.js is the manual re-run.
var MENU_ENSURED: any = null;
export async function ensureBotMenu(env: Env) {
  if (MENU_ENSURED === VERSION) return;
  const flag = await env.STATE.get(CONFIG.KV_BOT_MENU_FLAG).catch(() => null);
  if (flag === VERSION) {
    MENU_ENSURED = flag;
    return;
  }
  const ok1 = await setMyCommands(env, BOT_MENU_FA);
  const ok2 = await setMyCommands(env, BOT_MENU_EN, { type: "default" }, "en");
  const adminChat = env.CHAT_ID ? Number(env.CHAT_ID) : null;
  let ok3 = true, ok4 = true;
  if (adminChat) {
    ok3 = await setMyCommands(env, BOT_MENU_ADMIN_FA, { type: "chat", chat_id: adminChat });
    ok4 = await setMyCommands(env, BOT_MENU_ADMIN_EN, { type: "chat", chat_id: adminChat }, "en");
  }
  if (ok1 && ok2 && ok3 && ok4) {
    await env.STATE.put(CONFIG.KV_BOT_MENU_FLAG, VERSION).catch(() => {});
    MENU_ENSURED = VERSION;
    console.log(`\u{1F916} Bot menu registered (setMyCommands, ${BOT_MENU_FA.length} user + ${BOT_MENU_ADMIN_FA.length} admin commands)`);
  }
}

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
    // v13.115-trialfoot: menu edits re-compose FRESH text on every tap, so
    // the footer is (re)applied here too — without this, the first send
    // would carry «نسخه آزمایشی.» and every subsequent tap would drop it.
    // Idempotent: an edit that echoes already-footered text never doubles.
    // v13.119-hbfix: md=true — editMessageText rides MarkdownV2.
    text = withTrialFooter(text, 4096, true);
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
