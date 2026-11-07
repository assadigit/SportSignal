// SportSignal — the Telegram Channel Mirror (v13.230-channelbase foundation,
// v13.231-channelmirror hooks; Session 1+2 of the
// TELEGRAM_CHANNEL_MIRROR_SPEC.md program; the audited design is
// docs/telegram-channel-mirror/DISCOVERY.md §7 — that document is
// authoritative for the inventory, the identity table and the architecture).
//
// WHAT THIS IS: the destination model + the durable, destination-scoped
// idempotency claim for the future public Persian channel — the
// channel-side twin of match-dedupe.ts's write-first, fail-closed
// saveNotifiedMatch law (v13.94). One logical notification occurrence →
// at most ONE channel post per destination, ever, across ticks, restarts
// and isolate changes (the claim is D1, not memory).
//
// WHAT THIS IS NOT (Session 1): NOTHING in this module is called by any
// notification family yet. Session 2 wires the six hook points
// (DISCOVERY §7.4: sendNotificationIfNeeded, the big-match broadcasts,
// detectStatusChanges, the morning/UCL/night digests, coronation, weekly).
// Until then this module is dead code BY DESIGN — zero behavioral surface,
// zero KV/D1/subrequest spend, healthz unchanged. With
// TELEGRAM_CHANNEL_CHAT_ID unset or empty (the shipped default) every entry
// point below no-ops BEFORE any KV/D1/subrequest operation; with the var
// set but no hook wired, the only new spend is the claim/state writes the
// hooks themselves would make — and no hooks exist.
//
// STATE (all additive; rollback-safe per the RUNBOOK §4 doctrine):
//   D1 USERS_DB.channel_posts_v1 — THE CLAIM LEDGER. INSERT OR IGNORE
//     against PK (dest_key, event_key) is the atomic check+write;
//     changes>0 ⟺ newly claimed (the send may proceed); changes=0
//     (already claimed: a race, a re-fire, or a stuck row) OR a D1 error
//     ⟺ false → NO send. Fail-closed anti-spam, exactly the
//     saveNotifiedMatch law. D1 — never KV — for the v13.94 reason: the
//     anti-spam claim is the one write that must never be KV-quota-
//     starved, and D1's separate 100k/day tier makes it durable 24/7.
//   KV channel_mirror_v1 — the PAUSE marker, written ONLY on state
//     transitions (never per tick): {paused, reason, at, resumed_at?}.
//     Permanent channel error classes (400 chat-not-found, 403 need-admin)
//     mark the destination paused so hooks stop spending doomed sends;
//     un-pause is a transition write too (config-change detection / owner
//     action). Read via pausedChannel() — isolate-memoized (60s TTL, keyed
//     by the STATE binding so cloned envs share the memo).
//
// EVENT IDENTITY (DISCOVERY §7.2 — never bare matchKey, which would
// suppress later legitimate stages; never raw message text, which
// formatting/data changes would re-fire):
//   engine types           match:<matchKey>:<type>
//   match-start-big        match:<matchKey>:match-start   (§7.3 stage collapse)
//   result-big             match:<matchKey>:result        (§7.3 stage collapse)
//   postponed/cancelled    match:<matchKey>:postponed | :cancelled
//   half-time              match:<matchKey>:ht
//   morning/uclnight/night digest:morning|uclnight|night:<tehran-dateKey>
//   weekly tables          digest:weekly:<isoWeekKey>
//   coronation             coronation:<code>:<triggerMatchKey>
// The private notified_v1 ledger is UNTOUCHED — disjoint by table AND by
// key shape, so a channel claim can never suppress a private send or
// vice-versa.
//
// THE SESSION-2 HOOK SHAPE (not wired yet; the contract this foundation
// serves): one single call at the event boundary, AFTER the private
// write-first gate succeeded, OUTSIDE any per-recipient loop —
//   const gate = await channelGate(env);            // sim/unconfigured/paused → off
//   for (const dest of gate.dests) {
//     if (!(await claimChannelEvent(env, dest, eventKey))) continue;  // write-first
//     …compose the Persian/Asia-Tehran variant… …send… …recordChannelState…
//   }
// The hook must never be called from bot.ts / admin-bot.ts / admin-ops.ts
// paths, and must hard-no-op under env.SIM_NOTIFIED_KEY (the simulate
// harness must never touch the channel — DISCOVERY §7.4).
import { CONFIG } from "./config";
import type { Env } from "./types";
import { escapeMarkdownCharacters, toFaDigits } from "./utils";
// v13.234-channelstyle: the stage badge composes through the entity
// builder (the v13.106 mdstyle law — every styled span goes through md.ts,
// never hand-rolled delimiters).
import { mdBold } from "./md";
// v13.232-channelhardening: the transport seam this module now consumes —
// sendTelegram for the rate-limited admin pause page (the alertPhaseError
// pattern), setChannelDrainHook to REGISTER the drain-side outcome handler
// (a dependency inversion: telegram.ts never imports this module, keeping
// the concat's one-way layering — this file sits below telegram.ts).
import { sendTelegram, setChannelDrainHook } from "./telegram";

// ---------- destination configuration (spec PART IV §8–§9; DISCOVERY §7.1) ----------

// A chat id parses when it is a possibly-negative integer (the numeric
// -100… channel form — the stable preference) or a @username (Telegram's
// sendMessage accepts it; an acceptable interim value). Anything else
// fails CLOSED: no destination, no channel behavior — a typo must never
// become a post to a wrong chat.
function channelChatIdParses(raw) {
  const s = String(raw == null ? "" : raw).trim();
  if (!s) return null;
  if (/^-?\d+$/.test(s)) return s;
  if (/^@[A-Za-z0-9_]{4,}$/.test(s)) return s;
  return null;
}

// The public URL parses when it is an https://t.me/<name> link (trailing
// slashes tolerated). Malformed values fail CLOSED to "unset" — the
// spec's rule: never a placeholder or wrong t.me URL in a live message;
// unset simply means no channel CTA anywhere.
function channelPublicUrlParses(raw) {
  const s = String(raw == null ? "" : raw).trim().replace(/\/+$/, "");
  if (!s) return null;
  if (/^https:\/\/t\.me\/[A-Za-z0-9_]+$/i.test(s)) return s;
  return null;
}

// The destination list — THE disabled-by-default seam. [] unless
// TELEGRAM_CHANNEL_CHAT_ID parses, and ALWAYS [] under the simulate
// harness (SIM_NOTIFIED_KEY: the sim must never touch the channel), so
// every consumer no-ops before any KV/D1/subrequest is spent.
//
// One destination this phase: the owner's public Persian football channel
// — the extensibility shape (key/chatId/publicUrl/locale/sport/enabled)
// is a seam for future destinations (spec PART IV §8), NOT a multi-channel
// platform: no admin UI, no channel commands, no per-league rules.
export function channelDestinations(env: Env) {
  if (!env || (env as any).SIM_NOTIFIED_KEY) return [];
  const chatId = channelChatIdParses(env.TELEGRAM_CHANNEL_CHAT_ID);
  if (!chatId) return [];
  const publicUrl = channelPublicUrlParses(env.TELEGRAM_CHANNEL_PUBLIC_URL);
  return [
    {
      key: "fa-football",           // stable destination key (the claim PK's dest_key)
      chatId,                       // numeric -100… preferred; @username accepted interim
      publicUrl: publicUrl || undefined, // https://t.me/… — unset ⇒ no channel CTA anywhere
      locale: "fa",                 // Persian-only (spec PART II §1)
      sport: "football",            // this phase (spec PART VIII)
      enabled: true,                // true when the chat id parses (the only config there is)
    },
  ];
}

// ---------- the claim ledger (spec PART IV §10; DISCOVERY §7.2) ----------

// D1-only by design. No USERS_DB binding (local dev / the eval harness) or
// the sim override ⇒ every state function below no-ops. The channel NEVER
// falls back to KV for its anti-spam claim — that is the whole v13.94
// lesson: this is the one write that must never ride (or burn) the KV
// quota. A missing binding therefore means fail-closed (no claim, no
// send), same class as a D1 failure.
function channelStoreActive(env: Env) {
  return !!(env && (env as any).USERS_DB && !env.SIM_NOTIFIED_KEY);
}

// Misuse-proofing the ledger: the dest argument must BE a currently-
// configured destination (key AND chatId match channelDestinations(env)).
// An unconfigured env (the shipped default) can then never claim or record
// — even if a future caller passes a stale or hand-built dest — and the
// check is a pure env computation: zero KV/D1/subrequests spent before the
// no-op answer (the disabled-state contract, test a).
function liveDestination(env: Env, dest) {
  if (!dest || !dest.key || !dest.chatId) return null;
  const dests = channelDestinations(env);
  for (const d of dests) {
    if (d.key === dest.key && d.chatId === dest.chatId) return d;
  }
  return null;
}

// THE WRITE-FIRST GATE. Returns true iff the (dest_key, event_key) claim
// was NEWLY persisted — the caller may send. False on an existing row
// (already claimed: a concurrent tick/drain race, a re-fire on a later
// tick, or a stuck claim — at-most-once, never a blind re-send) or a D1
// failure (fail-closed: no claim, no send; the next tick retries). The
// twin of saveNotifiedMatch's "changes>0 ⟺ newly persisted" contract.
export async function claimChannelEvent(env: Env, dest, eventKey) {
  if (!channelStoreActive(env)) return false;
  const live = liveDestination(env, dest);
  if (!live) return false;
  if (!eventKey || typeof eventKey !== "string") return false;
  try {
    const r = await (env as any).USERS_DB.prepare(
      "INSERT OR IGNORE INTO channel_posts_v1 (dest_key, event_key, claimed_at, sent_at, state, attempts, last_error) VALUES (?1, ?2, ?3, NULL, 'claimed', 0, NULL)"
    ).bind(live.key, eventKey, Date.now()).run();
    return !!(r && r.meta && r.meta.changes > 0);
  } catch (e) {
    console.error("channel-mirror: claim D1 write failed — channel send suppressed (fail-closed anti-spam): " + (e && e.message));
    return false;
  }
}

// Post-send telemetry: sent_at / state / attempts / last_error. NEVER
// breaks a send path — a failed update is logged and swallowed (the claim
// row already guarantees at-most-once; this only describes the outcome).
// errorClass must be a short sanitized CLASS ('transient', 'permanent-403')
// — never a raw error string, payload, chat id or token.
export async function recordChannelState(env: Env, dest, eventKey, state, errorClass) {
  if (!channelStoreActive(env)) return false;
  const live = liveDestination(env, dest);
  if (!live) return false;
  if (!eventKey || typeof eventKey !== "string") return false;
  const st = String(state || "");
  if (st !== "sent" && st !== "failed" && st !== "unreachable") return false;
  const err = errorClass ? String(errorClass).replace(/[^A-Za-z0-9-]/g, "").slice(0, 40) : null;
  try {
    await (env as any).USERS_DB.prepare(
      "UPDATE channel_posts_v1 SET state = ?1, attempts = attempts + 1, sent_at = CASE WHEN ?1 = 'sent' THEN ?2 ELSE sent_at END, last_error = ?3 WHERE dest_key = ?4 AND event_key = ?5"
    ).bind(st, Date.now(), err, live.key, eventKey).run();
    return true;
  } catch (e) {
    console.warn("channel-mirror: state update failed (telemetry only): " + (e && e.message));
    return false;
  }
}

// ---------- the pause marker (KV channel_mirror_v1; DISCOVERY §7.6) ----------

// Isolate-memoized pause read, keyed by the STATE binding (cloned envs —
// the notify engine's per-tz scopedEnv — share one KV binding, so they
// share the memo; a test's fresh mock store gets a fresh memo). 60s TTL:
// the marker is written only on transitions, so the steady-state cost is
// ≤1 read/min while the channel is active, 0 while unconfigured, and an
// owner-side KV delete propagates within a minute.
// v13.232-channelhardening: the memo is ALSO keyed by the configured chat
// id, and a marker pinned to a DIFFERENT chat id than the currently-
// configured one (pauseAppliesTo below) is a STALE pause — the config
// changed since the pause was written, which is the documented un-pause
// path (an operator fixing a wrong channel id must not stay paused).
var CHANNEL_PAUSE_MEM = { kv: null, chat: null, at: 0, value: null };
const CHANNEL_PAUSE_MEMO_MS = 60 * 1000;

// Does this pause marker still govern the CURRENTLY-configured destination?
// An old-shape marker (no chatId — written before v13.232) keeps pausing
// (conservative: never blind-open an unknown pause). A marker whose chatId
// differs from the configured one is stale: the config changed, the gate
// opens, and the next real transition rewrites the marker.
function pauseAppliesTo(marker, chatId) {
  if (!marker || marker.chatId == null) return true;
  if (chatId == null) return true; // an unconfigured reader (the drain) sees the pause as-is
  return String(marker.chatId) === String(chatId);
}

// Returns the pause marker object ({paused:true, reason, at}) when the
// channel is paused, else null. A KV read failure fails OPEN here on
// purpose: the at-most-once guarantee lives in the D1 claim, not this
// marker — a pause marker we momentarily cannot read must not silently
// disable the channel forever — and the failure is NOT memoized, so the
// next call retries.
export async function pausedChannel(env: Env) {
  if (!env || !env.STATE) return null;
  const dests = channelDestinations(env);
  const chatId = dests.length ? dests[0].chatId : null;
  const now = Date.now();
  if (CHANNEL_PAUSE_MEM.kv === env.STATE && CHANNEL_PAUSE_MEM.chat === chatId && now - CHANNEL_PAUSE_MEM.at < CHANNEL_PAUSE_MEMO_MS) {
    const v = CHANNEL_PAUSE_MEM.value;
    return v && v.paused && pauseAppliesTo(v, chatId) ? v : null;
  }
  let value = null;
  try {
    value = await env.STATE.get(CONFIG.KV_CHANNEL_MIRROR, "json");
  } catch (e) {
    return null;
  }
  CHANNEL_PAUSE_MEM = { kv: env.STATE, chat: chatId, at: now, value: value || null };
  return value && value.paused && pauseAppliesTo(value, chatId) ? value : null;
}

// Un-memoized read used by the transition writers (they must see the
// marker's true current state before deciding whether this IS a
// transition). A failed read returns null — markChannelPaused then writes
// (pause wins; a redundant pause write is harmless), markChannelResumed
// then no-ops (never clears a pause we cannot see).
async function rawPauseRead(env: Env) {
  try {
    const v = await env.STATE.get(CONFIG.KV_CHANNEL_MIRROR, "json");
    const dests = channelDestinations(env);
    CHANNEL_PAUSE_MEM = { kv: env.STATE, chat: dests.length ? dests[0].chatId : null, at: Date.now(), value: v || null };
    return v || null;
  } catch (e) {
    return null;
  }
}

function pauseReasonClass(reason) {
  return String(reason == null ? "" : reason).replace(/[^A-Za-z0-9-]/g, "").slice(0, 40) || "unspecified";
}

// v13.232-channelhardening: the rate-limited admin page on a real pause
// transition — the alertPhaseError pattern (max 1 page / 30 min per
// isolate, sent to the admin chat through the existing sender). The body
// carries the sanitized CLASS only: no chat id, no response body, no
// token — the spec's sanitized-observability law.
var CHANNEL_PAGE_AT = 0;
async function pageChannelPaused(env: Env, reason) {
  try {
    const now = Date.now();
    if (now - CHANNEL_PAGE_AT < 30 * 60 * 1000) return;
    CHANNEL_PAGE_AT = now;
    const adminChat = parseInt(env.CHAT_ID);
    if (isNaN(adminChat)) return;
    await sendTelegram(env, "\u26A0\uFE0F *\u0645\u06CC\u0631\u0648\u0631 \u06A9\u0627\u0646\u0627\u0644 \u062A\u0644\u06AF\u0631\u0627\u0645 \u0645\u062A\u0648\u0642\u0641 \u0634\u062F*\n\u062F\u0644\u06CC\u0644: `" + reason + "`\n\u0627\u0631\u0633\u0627\u0644 \u0628\u0647 \u06A9\u0627\u0646\u0627\u0644 \u062A\u0627 \u0631\u0641\u0639 \u0645\u0634\u06A9\u0644 \u06CC\u0627 \u062A\u063A\u06CC\u06CC\u0631 \u067E\u06CC\u06A9\u0631\u0628\u0646\u062F\u06CC \u0645\u062A\u0648\u0642\u0641 \u0627\u0633\u062A\\.", adminChat).catch(() => {});
  } catch (e) {
    // the page is best-effort telemetry — never breaks the transition write
  }
}

// Transition write INTO paused (a permanent channel error class — the
// send path calls this after classifying a 400/403-class failure, and the
// drain-side hook after a queued entry's permanent/dead outcome). The
// marker now carries the chatId it paused under (internal state — never
// surfaced), so a LATER config change to a different id is detectable as a
// stale pause (pauseAppliesTo). `chatIdHint` (the drain passes the queued
// entry's own chat id) is used when the env itself is unconfigured — a
// rollback emptied the vars while entries were still queued: the pause
// still records WHICH destination was bad, so re-configuring the same id
// does not blind-open a known-bad destination.
// Idempotent: re-marking the SAME reason does not rewrite (the marker is
// written only on transitions, never per tick); a real transition also
// pages the admin (rate-limited above). Returns true when a transition
// write actually happened.
export async function markChannelPaused(env: Env, reason, chatIdHint?) {
  if (!env || !env.STATE || (env as any).SIM_NOTIFIED_KEY) return false;
  const cls = pauseReasonClass(reason);
  const dests = channelDestinations(env);
  const chatId = dests.length ? dests[0].chatId : (chatIdHint != null ? String(chatIdHint) : null);
  const cur = await rawPauseRead(env);
  if (cur && cur.paused && cur.reason === cls) return false;
  const marker = { paused: true, reason: cls, at: Date.now(), chatId: chatId };
  try {
    await env.STATE.put(CONFIG.KV_CHANNEL_MIRROR, JSON.stringify(marker));
    CHANNEL_PAUSE_MEM = { kv: env.STATE, chat: dests.length ? dests[0].chatId : null, at: Date.now(), value: marker };
    console.warn("channel-mirror: destination paused (" + cls + ") — channel sends suppressed until config change / owner action");
    await pageChannelPaused(env, cls);
    return true;
  } catch (e) {
    console.warn("channel-mirror: pause-marker write failed: " + (e && e.message));
    return false;
  }
}

// Transition write OUT of paused (config-change detection / owner action /
// the Session-3 un-pause flow). Keeps a resumed_at breadcrumb for admin
// visibility. Absent or already-resumed marker ⇒ false, no write.
export async function markChannelResumed(env: Env) {
  if (!env || !env.STATE || (env as any).SIM_NOTIFIED_KEY) return false;
  const cur = await rawPauseRead(env);
  if (!cur || !cur.paused) return false;
  const marker = { paused: false, reason: cur.reason || null, at: cur.at || null, chatId: cur.chatId || null, resumed_at: Date.now() };
  try {
    await env.STATE.put(CONFIG.KV_CHANNEL_MIRROR, JSON.stringify(marker));
    const dests = channelDestinations(env);
    CHANNEL_PAUSE_MEM = { kv: env.STATE, chat: dests.length ? dests[0].chatId : null, at: Date.now(), value: marker };
    console.log("channel-mirror: destination resumed (was paused: " + (cur.reason || "unspecified") + ")");
    return true;
  } catch (e) {
    console.warn("channel-mirror: resume-marker write failed: " + (e && e.message));
    return false;
  }
}

// ---------- the shared entry-point gate (every Session-2 hook starts here) ----------
//
// The order is LOAD-BEARING (the disabled-state contract): the sim check
// and the destination parse are pure env reads — zero KV/D1/subrequests —
// and the pause read happens ONLY when a destination actually exists.
// reason: "sim" | "unconfigured" | "paused" | null.
export async function channelGate(env: Env) {
  if (!env || (env as any).SIM_NOTIFIED_KEY) return { ok: false, reason: "sim", dests: [] };
  const dests = channelDestinations(env);
  if (!dests.length) return { ok: false, reason: "unconfigured", dests: [] };
  if (await pausedChannel(env)) return { ok: false, reason: "paused", dests: dests };
  return { ok: true, reason: null, dests: dests };
}

// ---------- event identity builders (DISCOVERY §7.2; spec PART IV §10) ----------
//
// PURE functions — the Session-2 hooks pass the same identity ingredients
// the private path already computes (matchKey from dedupe.ts, the Tehran
// dateKey, the ISO week key). All builders return null on malformed input
// so the caller fails closed: no key, no claim, no post.

// The v13.230 stage-collapse table (DISCOVERY §7.3): the engine's
// match-start and the broadcast's match-start-big are ONE logical kickoff
// occurrence — whichever path fires first claims the stage, the second
// path's claim finds the row and no-ops. Same for result/result-big.
// Dropping the collapse later (mirror every physical send) is a one-line
// change here — documented, reversible, not default.
const CHANNEL_STAGE_COLLAPSE: Record<string, string> = {
  "match-start-big": "match-start",
  "result-big": "result",
};

// The per-match vocabulary this builder accepts (fail-closed on anything
// else — a new notification type needs a deliberate identity decision).
const CHANNEL_MATCH_NTYPES = [
  "pre-match-72h", "pre-match-24h", "pre-match-3h", "pre-match-1h", "pre-match-5min",
  "match-start", "result", "match-start-big", "result-big",
];

// The 7 engine types + the 2 broadcast types → one key per (match, stage).
export function channelEventKeyMatch(matchKey, ntype) {
  if (!matchKey || !ntype || typeof matchKey !== "string" || typeof ntype !== "string") return null;
  const stage = CHANNEL_STAGE_COLLAPSE[ntype] || ntype;
  if (CHANNEL_MATCH_NTYPES.indexOf(ntype) < 0) return null;
  return "match:" + matchKey + ":" + stage;
}

// Status transitions (the notify-status.ts vocabulary): POSTPONED /
// CANCELLED map to their alert keys; PAUSED (half-time, master big matches
// only at the private layer) maps to "ht". The transition itself is the
// edition — one channel post per (match, new status), ever.
export function channelEventKeyStatus(matchKey, newStatus) {
  if (!matchKey || !newStatus || typeof matchKey !== "string") return null;
  const st = String(newStatus).toUpperCase();
  if (st === "POSTPONED") return "match:" + matchKey + ":postponed";
  if (st === "CANCELLED") return "match:" + matchKey + ":cancelled";
  if (st === "PAUSED") return "match:" + matchKey + ":ht";
  return null;
}

// Digest editions: name ∈ morning | uclnight | night. The edition key is
// the Tehran-local calendar date (YYYY-MM-DD) the private per-chat digest
// marks already dedupe on — one channel edition per Tehran date.
export function channelEventKeyDigest(name, tehranDateKey) {
  if (!name || !tehranDateKey || typeof name !== "string" || typeof tehranDateKey !== "string") return null;
  if (name !== "morning" && name !== "uclnight" && name !== "night") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tehranDateKey)) return null;
  return "digest:" + name + ":" + tehranDateKey;
}

// Weekly tables edition: the ISO week key (YYYY-Www) the private week
// marker itself uses.
export function channelEventKeyWeekly(isoWeekKey) {
  if (!isoWeekKey || typeof isoWeekKey !== "string") return null;
  if (!/^\d{4}-W\d{2}$/.test(isoWeekKey)) return null;
  return "digest:weekly:" + isoWeekKey;
}

// Coronation: league code + the trigger fixture's matchKey (the just-
// finished match involving the new/old leader — DISCOVERY §2.4 row 16).
export function channelEventKeyCoronation(code, triggerMatchKey) {
  if (!code || !triggerMatchKey || typeof code !== "string" || typeof triggerMatchKey !== "string") return null;
  return "coronation:" + code + ":" + triggerMatchKey;
}

// ============================================================================
// v13.231-channelmirror — SESSION 2: the hook runner, the footer/CTA and
// the compact per-tick breadcrumb (DISCOVERY §7.4/§7.5/§7.7). The six hook
// points (engine / -big broadcasts / status / the three edition digests /
// coronation / weekly) all consume EXACTLY the primitives below — nothing
// channel-side lives inside a per-recipient loop, and every hook call is
// wrapped so a channel failure can NEVER throw into the private path.
// ============================================================================

// Cheap PURE "is a destination configured?" — the fan-out reservation's
// +2 gate and the digest hooks' pre-claim edition gates read this BEFORE
// spending any KV/D1/subrequest op (the disabled-state contract).
export function channelActive(env: Env) {
  return channelDestinations(env).length > 0;
}

// The channel locale/timezone discipline (DISCOVERY §7.5): the Persian
// variant composes through the EXISTING formatters with a CLONED env whose
// TEHRAN_TZ is pinned to Asia/Tehran — never a subscriber's personal tz,
// never a copy of a rendered per-subscriber message.
export function channelEnvFor(env: Env) {
  return { ...env, TEHRAN_TZ: "Asia/Tehran" };
}

// ---------- the channel stage badge (v13.234-channelstyle) ----------
//
// The channel is a FEED, not a reminder: a reader scrolling @SportSignalz
// could not tell a 24h countdown post from a 3h one — the private
// v13.10-clean layout rightly dropped the stage headers for a personal
// reminder, but a public feed needs each post self-explanatory. Every
// countdown post therefore opens with a bold Persian badge naming its
// stage. match-start and result keep their formatters' own headlines
// («⚽️ مسابقه شروع شد» / «🏁 نتیجه نهایی») — a badge would duplicate them.
// Pure static map: zero fetches, zero writes, MarkdownV2-safe via mdBold
// (the ⏳ rides OUTSIDE the bold span, the formatMatchStartMessage
// precedent for emoji-outside-entity).
var CHANNEL_STAGE_BADGES = {
  "pre-match-72h": "\u06F3 \u0631\u0648\u0632 \u062A\u0627 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC",
  "pre-match-24h": "\u06F2\u06F4 \u0633\u0627\u0639\u062A \u062A\u0627 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC",
  "pre-match-3h": "\u06F3 \u0633\u0627\u0639\u062A \u062A\u0627 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC",
  "pre-match-1h": "\u06F1 \u0633\u0627\u0639\u062A \u062A\u0627 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC",
  "pre-match-5min": "\u06F5 \u062F\u0642\u06CC\u0642\u0647 \u062A\u0627 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC"
};
export function channelStageHead(type) {
  const b = type && CHANNEL_STAGE_BADGES[type];
  return b ? "\u23F3 " + mdBold(b) + "\n\n" : "";
}

// ---------- the channel footer (spec PART II §4 — every channel post ends
// with the website + bot links) ----------
//
// v13.234-channelstyle (the owner's tidy-up ask, 2026-11-07: "tidy up the
// channel messages — the website should have its own emoji; more tidy,
// organized and good looking"): the link block is a LABELED two-line unit
// under a heavy box-drawing rule — «🌐 سایت» + «🤖 ربات», one voice, one
// separator — replacing the v13.22 private promo CTA (the wordy «مشاهده
// جدول لیگ‌ها…» line + the bare un-emojied URL) that the engine hook used
// to paste onto channel copies. The DUPLICATE-AVOIDANCE law is unchanged:
// a message that already carries a sportsignal.ir link (the tables'
// football.sportsignal.ir footer) gets ONLY the missing bot line, riding as
// a plain continuation line — never a second separator or a duplicate
// footer element (spec §4). The dot-escaped and raw URL forms are both
// matched (flat = backslashes stripped) so an escaped promo link counts.
// Fail-open at the ceiling like withTrialFooter: a message already at the
// limit ships WITHOUT the footer rather than crossing it and losing itself.
var CHANNEL_FOOTER_SEP = "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501";
var CHANNEL_FOOTER_SITE = "\uD83C\uDF10 \u0633\u0627\u06CC\u062A: " + escapeMarkdownCharacters(CONFIG.CHANNEL_SITE_URL || "https://sportsignal.ir");
var CHANNEL_FOOTER_BOT = "\uD83E\uDD16 \u0631\u0628\u0627\u062A: " + escapeMarkdownCharacters(CONFIG.CHANNEL_BOT_URL || "https://t.me/SportSignalAlertsBot");

export function appendChannelFooter(text, cap?) {
  if (typeof text !== "string" || !text) return text;
  const flat = text.replace(/\\/g, "");
  const hasSite = flat.indexOf("sportsignal.ir") >= 0;
  const hasBot = flat.indexOf("t.me/SportSignalAlertsBot") >= 0;
  if (hasSite && hasBot) return text;
  const lines = [];
  if (!hasSite) lines.push(CHANNEL_FOOTER_SITE);
  if (!hasBot) lines.push(CHANNEL_FOOTER_BOT);
  const block = (hasSite ? "\n" : "\n\n" + CHANNEL_FOOTER_SEP + "\n") + lines.join("\n");
  if (text.length + block.length > (cap || 4096)) return text;
  return text + block;
}

// ---------- the PRIVATE channel CTA (spec PART II §4) ----------
//
// Eligible public notification messages sent to private subscribers gain
// the channel link ONLY when TELEGRAM_CHANNEL_PUBLIC_URL is set (the
// dest.publicUrl seam). UNSET OR MALFORMED ⇒ the identity function —
// byte-identical private output (the parity law). Applied at composition
// time in the cron notification paths only (never bot.ts command replies,
// never admin surfaces). Fail-open at the 4096 ceiling; never duplicated.
export function withChannelCta(text, env, lang) {
  if (typeof text !== "string" || !text) return text;
  const dests = channelDestinations(env);
  const url = dests.length ? dests[0].publicUrl : null;
  if (!url) return text;
  const flat = text.replace(/\\/g, "");
  if (flat.indexOf(url) >= 0) return text;
  const line = (lang === "en" ? "\uD83D\uDCE2 Our channel: " : "\uD83D\uDCE2 \u06A9\u0627\u0646\u0627\u0644 \u0645\u0627: ") + escapeMarkdownCharacters(url);
  if (text.length + 1 + line.length > 4096) return text;
  return text + "\n" + line;
}

// ---------- the compact per-tick breadcrumb (DISCOVERY §7.7) ----------
//
// notify.ch = {s: sent, d: deferred (claimed, not confirmed — transient
// failures riding the outbox + unreachable), k: skipped (claim no-op:
// race / re-fire / stuck), p: paused (the gate said so)}. Rides the
// completion blob's EXISTING put — zero extra KV writes; takeChannelTickStats
// reads AND resets (per-tick semantics across isolate reuse).
var CHANNEL_TICK_STATS = { sent: 0, deferred: 0, skipped: 0, paused: 0 };

export function takeChannelTickStats() {
  const out = { s: CHANNEL_TICK_STATS.sent, d: CHANNEL_TICK_STATS.deferred, k: CHANNEL_TICK_STATS.skipped, p: CHANNEL_TICK_STATS.paused };
  CHANNEL_TICK_STATS = { sent: 0, deferred: 0, skipped: 0, paused: 0 };
  return out;
}

// ---------- the two-phase hook runner (DISCOVERY §7.4) ----------
//
// CLAIM phase — one single call at the event boundary, AFTER the private
// write-first gate succeeded, BEFORE the private fan-out (the engine
// pattern: a CPU kill mid-fan-out leaves a detectable pending claim, not a
// silent loss). Returns the claim token {dest, eventKey} or null (never
// throws; unconfigured/sim/paused/already-claimed/D1-failure all ⇒ null).
export async function claimChannelPost(env: Env, eventKey) {
  try {
    if (!eventKey || typeof eventKey !== "string") return null;
    const gate = await channelGate(env);
    if (!gate.ok) {
      if (gate.reason === "paused") CHANNEL_TICK_STATS.paused++;
      return null;
    }
    for (const dest of gate.dests) {
      if (await claimChannelEvent(env, dest, eventKey)) return { dest: dest, eventKey: eventKey };
      CHANNEL_TICK_STATS.skipped++; // already claimed (race / re-fire / stuck) or D1 fail — no send
    }
  } catch (e) {
    console.warn("channel-mirror: claim hook isolated (the private path is untouched): " + (e && e.message));
  }
  return null;
}

// SEND phase — after the private group loop. `sender(chEnv, dest, chan)`
// composes the Persian/Asia-Tehran variant and sends via the EXISTING
// telegram.ts senders, returning the sender's verdict (true | "dead" |
// false) and passing `chan` (the channel ctx {k, e, cls}) through to the
// TEXT senders so (a) every transient retry the transport queues is a
// dest-bearing outbox entry the drain can reconcile with this claim, and
// (b) the 400/403 body the verdict flattens to false is fingerprinted for
// the pause decision below.
//
// v13.232-channelhardening — the COMPLETE outcome classification (the S18
// residual note 1 closed; DISCOVERY §7.6):
//   true  ⇒ sent.
//   "dead"⇒ the transport's dead-chat regex matched, or a sticker/card
//           sender returned "dead" — an unreachable channel ⇒ PAUSE the
//           destination (transition write + rate-limited admin page) +
//           record unreachable. The channel is never dead-chat-pruned.
//   false ⇒ read chan.cls: a PERMANENT class (chat-not-found /
//           need-administrator-rights / bot-not-a-member / dead-chat /
//           bad-request-markdown — retrying cannot help) ⇒ unreachable +
//           PAUSE, same as dead; a TRANSIENT/unknown class (rate-limited,
//           server-error, network, bad-request) ⇒ record failed with the
//           class and leave the recovery to the outbox (if the transport
//           queued one) and the stuck-claim reconciliation (if not) —
//           at-most-once, never a blind re-send.
// NEVER throws into the caller.
export async function sendChannelPost(env: Env, claim, sender) {
  if (!claim || !claim.dest || !claim.eventKey) return { ok: false, verdict: null };
  const chan = { k: claim.dest.key, e: claim.eventKey, cls: null };
  let verdict: any = false;
  try {
    verdict = await sender(channelEnvFor(env), claim.dest, chan);
  } catch (e) {
    console.warn("channel-mirror: send hook isolated (the private path is untouched): " + (e && e.message));
    verdict = false;
  }
  if (verdict === true) {
    CHANNEL_TICK_STATS.sent++;
    await recordChannelState(env, claim.dest, claim.eventKey, "sent", null);
    return { ok: true, verdict: verdict };
  }
  if (verdict === "dead") {
    CHANNEL_TICK_STATS.deferred++;
    await channelDeliveryFailure(env, claim, chan.cls && isPermanentChannelClass(chan.cls) ? chan.cls : "dead-chat");
    return { ok: false, verdict: verdict };
  }
  CHANNEL_TICK_STATS.deferred++;
  const cls = chan.cls || "transient";
  if (isPermanentChannelClass(cls)) {
    await channelDeliveryFailure(env, claim, cls);
  } else {
    await recordChannelState(env, claim.dest, claim.eventKey, "failed", cls);
  }
  return { ok: false, verdict: verdict };
}

// The one-shot variant for hooks without the claim/send split (the digest
// editions, coronation, weekly): claim → send → record in one call.
export async function mirrorChannelPost(env: Env, eventKey, sender) {
  const claim = await claimChannelPost(env, eventKey);
  if (!claim) return { ok: false, claimed: false, verdict: null };
  const r = await sendChannelPost(env, claim, sender);
  return { ok: r.ok, claimed: true, verdict: r.verdict };
}

// ============================================================================
// v13.232-channelhardening — SESSION 3: the permanent-class vocabulary, the
// drain-side outcome hook, the stuck-claim reconciliation and the admin-only
// health surface (DISCOVERY §7.6/§7.7 + spec PART IV §11/§13).
// ============================================================================

// The classes retrying cannot fix — each of these means the DESTINATION (or
// the payload's parseability) is broken, so every further send is doomed:
// pause the destination (rate-limited admin page) + mark the claim
// unreachable. Everything else (rate-limited, server-error, network,
// unknown bad-request) stays failed/outboxed — the bounded retries own it.
const CHANNEL_PERMANENT_CLASSES = [
  "chat-not-found",            // 400: the id is wrong or the channel is gone
  "need-administrator-rights", // 400: the bot is in the channel but cannot post
  "bot-not-a-member",          // 403: the bot was kicked / was never a member
  "dead-chat",                 // the transport's dead-chat regex (private vocabulary)
  "bad-request-markdown",      // 400 can't parse entities: the payload itself is undeliverable
];

export function isPermanentChannelClass(cls) {
  return typeof cls === "string" && CHANNEL_PERMANENT_CLASSES.indexOf(cls) >= 0;
}

// The permanent-class settlement shared by the send path and the drain hook:
// pause the destination (transition write + the rate-limited admin page)
// and mark the claim unreachable. Never throws.
async function channelDeliveryFailure(env: Env, claim, errorClass) {
  await markChannelPaused(env, errorClass, claim && claim.dest ? claim.dest.chatId : null);
  if (claim && claim.dest && claim.eventKey) {
    await recordChannelState(env, claim.dest, claim.eventKey, "unreachable", errorClass);
  }
}

// ---------- the drain-side outcome hook (registered into telegram.ts) ----------
//
// drainOutbox reports every dest-bearing outbox entry's outcome here (the
// setChannelDrainHook registration at module scope wires it; the transport
// stays channel-agnostic). Outcomes:
//   "sent"    → recordChannelState 'sent' — the queued retry landed.
//   "dead"    → unreachable + pause (the destination is gone for the
//               dead-class reason; the entry is dropped by the drain).
//   "fail"    → a non-dead false: return "permanent" when the fingerprinted
//               class is a permanent channel class (the pause + unreachable
//               happen HERE; the drain then drops the entry instead of
//               riding 6 doomed attempts), else "transient" (the drain
//               re-queues with the normal bounded backoff — the claim row
//               already says failed and the reconciliation owns the tail).
//   "dropped" → the entry exhausted its 6 attempts: record failed with the
//               'outbox-exhausted' class — report-only; at-most-once
//               forbids any automatic re-send.
// Unconfigured env (a rollback emptied the vars while entries were queued):
// no claim updates (the ledger is ignorable by design), "transient"
// verdicts so the entries still ride the normal bounded retries, and the
// pause marker still records the bad destination (chatIdHint = the entry's
// own chat id) so re-configuring the SAME id does not blind-open it.
export async function channelDrainOutcome(env: Env, destRef, outcome, cls, chatIdHint?) {
  try {
    if (!env || !destRef || !destRef.k || !destRef.e) return null;
    let dest = null;
    for (const d of channelDestinations(env)) {
      if (d.key === destRef.k) { dest = d; break; }
    }
    const errClass = cls ? String(cls).replace(/[^A-Za-z0-9-]/g, "").slice(0, 40) : null;
    if (outcome === "sent") {
      if (dest) await recordChannelState(env, dest, destRef.e, "sent", null);
      return null;
    }
    if (outcome === "dead") {
      const reason = errClass && isPermanentChannelClass(errClass) ? errClass : "dead-chat";
      await markChannelPaused(env, reason, dest ? dest.chatId : chatIdHint);
      if (dest) await recordChannelState(env, dest, destRef.e, "unreachable", reason);
      return null;
    }
    if (outcome === "fail") {
      if (errClass && isPermanentChannelClass(errClass)) {
        await markChannelPaused(env, errClass, dest ? dest.chatId : chatIdHint);
        if (dest) await recordChannelState(env, dest, destRef.e, "unreachable", errClass);
        return "permanent";
      }
      return "transient";
    }
    if (outcome === "dropped") {
      if (dest) await recordChannelState(env, dest, destRef.e, "failed", errClass || "outbox-exhausted");
      return null;
    }
    return null;
  } catch (e) {
    console.warn("channel-mirror: drain outcome hook isolated: " + (e && e.message));
    return null;
  }
}

// The registration — one statement at module scope. In the real bundle this
// runs at module init (before any cron tick); in the flat eval harness the
// module span carries it, so any eval that includes BOTH telegram.ts and
// this module gets the hook wired in the same scope.
setChannelDrainHook(channelDrainOutcome);

// ---------- the stuck-claim reconciliation + the admin health surface ----------
//
// (spec PART IV §13 + DISCOVERY §7.6.) A claim row stuck 'claimed'/'failed'
// with no sent_at, no in-flight outbox entry and an age past the grace
// window is the residue of: an isolate death between claim and record, a
// transient failure whose outbox push itself failed, or an entry that
// exhausted its bounded retries. The owner's stated priority is at-most-
// once, so these are NEVER blindly re-sent; this surface REPORTS them
// (count + oldest age + last error class per destination), admin-only.
//
// THE REPAIR DECISION (documented, Session 3): a write-first repair lane
// (re-queue exactly the reconciled events) was evaluated and DECLINED —
// unlike repairPerChatGaps (which re-sends within open time windows against
// a per-chat delivery ledger that proves non-delivery), a channel claim
// cannot PROVE the post never landed: the residual timeout-after-accept
// window means a re-queue can duplicate. The reconciliation is therefore
// report-only; a human reading /api/audit decides whether a specific stuck
// event is worth a manual, owner-approved re-queue (Session 4 tooling).
const CHANNEL_STUCK_GRACE_MS = 30 * 60 * 1000;

// The bounded, sanitized, admin-only snapshot. TWO aggregate D1 reads (plus
// one LAZY stuck-candidate read that only runs when the aggregates say a
// candidate exists), one outbox read, one pause-marker read — zero writes.
// Unconfigured ⇒ {configured:false} with ZERO ops (the disabled-state
// contract). No chat ids, no bodies, no tokens — counts, ages and CLASSES
// only. Consumed by the admin /status card section and /api/audit's
// channel block; the PUBLIC /healthz is unchanged by contract.
export async function channelHealthSnapshot(env: Env) {
  if (!env || (env as any).SIM_NOTIFIED_KEY || !(env as any).USERS_DB) {
    return { configured: false, enabled: false };
  }
  const dests = channelDestinations(env);
  if (!dests.length) return { configured: false, enabled: false };
  const dest = dests[0];
  const now = Date.now();
  const out: any = {
    configured: true,
    enabled: dest.enabled !== false,
    publicUrlSet: !!dest.publicUrl,
    paused: null,
    claims: null,
    oldestPendingAgeMin: null,
    lastSentAgeMin: null,
    lastErrorClass: null,
    stuck: null,
  };
  // 1) the claim aggregates (one grouped SELECT)
  let rows: any[] = [];
  try {
    const r = await (env as any).USERS_DB.prepare(
      "SELECT dest_key, state, COUNT(*) AS n, SUM(attempts) AS attempts, MIN(claimed_at) AS oldest, MAX(sent_at) AS last_sent FROM channel_posts_v1 GROUP BY dest_key, state"
    ).all();
    rows = (r && r.results) || [];
  } catch (e) {
    return out; // D1 unreachable — the counts stay null (honest, not zeros)
  }
  const claims = { sent: 0, failed: 0, unreachable: 0, claimed: 0, attempts: 0 };
  let oldestPending = null, lastSent = null;
  for (const row of rows) {
    if (!row || row.dest_key !== dest.key) continue;
    const n = Number(row.n) || 0;
    if (row.state === "sent") claims.sent += n;
    else if (row.state === "failed") claims.failed += n;
    else if (row.state === "unreachable") claims.unreachable += n;
    else if (row.state === "claimed") claims.claimed += n;
    claims.attempts += Number(row.attempts) || 0;
    const oldest = Number(row.oldest) || 0;
    if ((row.state === "claimed" || row.state === "failed") && oldest && (oldestPending == null || oldest < oldestPending)) oldestPending = oldest;
    const ls = Number(row.last_sent) || 0;
    if (ls && (lastSent == null || ls > lastSent)) lastSent = ls;
  }
  out.claims = claims;
  out.oldestPendingAgeMin = oldestPending != null ? Math.max(0, Math.round((now - oldestPending) / 60000)) : null;
  out.lastSentAgeMin = lastSent != null ? Math.max(0, Math.round((now - lastSent) / 60000)) : null;
  // 2) the newest last_error CLASS (one small SELECT)
  try {
    const r2 = await (env as any).USERS_DB.prepare(
      "SELECT dest_key, last_error, claimed_at FROM channel_posts_v1 WHERE last_error IS NOT NULL ORDER BY claimed_at DESC"
    ).all();
    for (const row of (r2 && r2.results) || []) {
      if (row && row.dest_key === dest.key) { out.lastErrorClass = row.last_error || null; break; }
    }
  } catch (e) { /* best-effort */ }
  // 3) the pause marker (raw read — the admin surface sees the truth, not a memo)
  try {
    const m = await env.STATE.get(CONFIG.KV_CHANNEL_MIRROR, "json").catch(() => null);
    if (m && m.paused && pauseAppliesTo(m, dest.chatId)) {
      out.paused = { reason: m.reason || "unspecified", at: m.at || null };
    }
  } catch (e) { }
  // 4) the stuck-claim reconciliation (report-only): candidates exist only
  // when the oldest pending claim predates the grace window — the lazy
  // second SELECT runs only then (the common healthy path issues NONE).
  out.stuck = { count: 0, oldestAgeMin: null, lastErrorClass: null };
  if (oldestPending != null && now - oldestPending > CHANNEL_STUCK_GRACE_MS) {
    let candidates: any[] = [];
    try {
      const r3 = await (env as any).USERS_DB.prepare(
        "SELECT dest_key, event_key, state, claimed_at, last_error FROM channel_posts_v1 WHERE state IN ('claimed','failed') AND sent_at IS NULL AND claimed_at < ?1"
      ).bind(now - CHANNEL_STUCK_GRACE_MS).all();
      candidates = ((r3 && r3.results) || []).filter((row) => row && row.dest_key === dest.key);
    } catch (e) {
      candidates = [];
    }
    // the in-flight channel outbox entries — the claims they cover are NOT
    // stuck, they are riding the bounded retries
    const inFlight = new Set();
    try {
      const ob = await env.STATE.get(CONFIG.KV_OUTBOX, "json").catch(() => null);
      for (const item of (Array.isArray(ob) ? ob : [])) {
        if (item && item.dest && item.dest.k === dest.key && item.dest.e) inFlight.add(item.dest.e);
      }
    } catch (e) { }
    let stuckOldest = null;
    for (const row of candidates) {
      if (inFlight.has(row.event_key)) continue;
      out.stuck.count++;
      const at = Number(row.claimed_at) || 0;
      if (at && (stuckOldest == null || at < stuckOldest)) stuckOldest = at;
      if (row.last_error) out.stuck.lastErrorClass = row.last_error;
    }
    out.stuck.oldestAgeMin = stuckOldest != null ? Math.max(0, Math.round((now - stuckOldest) / 60000)) : null;
  }
  return out;
}

// The admin /status card section (spec PART IV §13) — a compact Persian
// block the admin-bot card appends. Unconfigured ⇒ the single honest
// "not configured" line with ZERO ops. Sanitized: classes and counts only.
export async function channelStatusSection(env: Env) {
  const health = await channelHealthSnapshot(env);
  if (!health.configured) {
    return { text: "\U0001F4E1 \u0645\u06CC\u0631\u0648\u0631 \u06A9\u0627\u0646\u0627\u0644 \u062A\u0644\u06AF\u0631\u0627\u0645: \u067E\u06CC\u06A9\u0631\u0628\u0646\u062F\u06CC\u200C\u0646\u0634\u062F\u0647", health: health };
  }
  const ageFa = (v) => v == null ? "\u0646\u0627\u0645\u0639\u0644\u0648\u0645" : toFaDigits(String(v)) + " \u062F\u0642\u06CC\u0642\u0647 \u067E\u06CC\u0634";
  let text = "";
  if (health.paused) {
    text = "\U0001F6A8 \u0645\u06CC\u0631\u0648\u0631 \u06A9\u0627\u0646\u0627\u0644 \u062A\u0644\u06AF\u0631\u0627\u0645: \u0645\u062A\u0648\u0642\u0641 \\(`" + String(health.paused.reason) + "`\\) \u2014 \u0627\u0631\u0633\u0627\u0644 \u062A\u0627 \u0631\u0641\u0639 \u0645\u0634\u06A9\u0644 \u06CC\u0627 \u062A\u063A\u06CC\u06CC\u0631 \u067E\u06CC\u06A9\u0631\u0628\u0646\u062F\u06CC \u0645\u062A\u0648\u0642\u0641 \u0627\u0633\u062A";
  } else {
    const c = health.claims || { sent: 0, failed: 0, unreachable: 0, claimed: 0, attempts: 0 };
    const pending = c.claimed + c.failed;
    text = "\U0001F4E1 \u0645\u06CC\u0631\u0648\u0631 \u06A9\u0627\u0646\u0627\u0644 \u062A\u0644\u06AF\u0631\u0627\u0645: \u0641\u0639\u0627\u0644"
      + " \u00B7 \u0622\u062E\u0631\u06CC\u0646 \u0627\u0631\u0633\u0627\u0644: " + ageFa(health.lastSentAgeMin)
      + " \u00B7 \u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631: " + toFaDigits(String(pending));
    if (health.oldestPendingAgeMin != null) text += " \\(\u0642\u062F\u06CC\u0645\u06CC\u200C\u062A\u0631\u06CC\u0646 " + ageFa(health.oldestPendingAgeMin) + "\\)";
    if (health.lastErrorClass) text += " \u00B7 \u0622\u062E\u0631\u06CC\u0646 \u062E\u0637\u0627: `" + String(health.lastErrorClass) + "`";
    if (health.stuck && health.stuck.count > 0) {
      text += "\n\u26A0\uFE0F \u0627\u062D\u062A\u0645\u0627\u0644 \u0627\u0646\u06AF\u0627\u0631\u06CC \u0645\u0627\u0646\u062F\u0647: " + toFaDigits(String(health.stuck.count)) + " \u0631\u0648\u06CC\u062F\u0627\u062F \u2014 \u06AF\u0632\u0627\u0631\u0634 \u06A9\u0627\u0645\u0644: `/api/audit`";
    }
  }
  return { text: text, health: health };
}
