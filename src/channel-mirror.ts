// SportSignal — the Telegram Channel Mirror FOUNDATION (v13.230-channelbase,
// Session 1 of the TELEGRAM_CHANNEL_MIRROR_SPEC.md program; the audited
// design is docs/telegram-channel-mirror/DISCOVERY.md §7 — that document is
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
var CHANNEL_PAUSE_MEM = { kv: null, at: 0, value: null };
const CHANNEL_PAUSE_MEMO_MS = 60 * 1000;

// Returns the pause marker object ({paused:true, reason, at}) when the
// channel is paused, else null. A KV read failure fails OPEN here on
// purpose: the at-most-once guarantee lives in the D1 claim, not this
// marker — a pause marker we momentarily cannot read must not silently
// disable the channel forever — and the failure is NOT memoized, so the
// next call retries.
export async function pausedChannel(env: Env) {
  if (!env || !env.STATE) return null;
  const now = Date.now();
  if (CHANNEL_PAUSE_MEM.kv === env.STATE && now - CHANNEL_PAUSE_MEM.at < CHANNEL_PAUSE_MEMO_MS) {
    const v = CHANNEL_PAUSE_MEM.value;
    return v && v.paused ? v : null;
  }
  let value = null;
  try {
    value = await env.STATE.get(CONFIG.KV_CHANNEL_MIRROR, "json");
  } catch (e) {
    return null;
  }
  CHANNEL_PAUSE_MEM = { kv: env.STATE, at: now, value: value || null };
  return value && value.paused ? value : null;
}

// Un-memoized read used by the transition writers (they must see the
// marker's true current state before deciding whether this IS a
// transition). A failed read returns null — markChannelPaused then writes
// (pause wins; a redundant pause write is harmless), markChannelResumed
// then no-ops (never clears a pause we cannot see).
async function rawPauseRead(env: Env) {
  try {
    const v = await env.STATE.get(CONFIG.KV_CHANNEL_MIRROR, "json");
    CHANNEL_PAUSE_MEM = { kv: env.STATE, at: Date.now(), value: v || null };
    return v || null;
  } catch (e) {
    return null;
  }
}

function pauseReasonClass(reason) {
  return String(reason == null ? "" : reason).replace(/[^A-Za-z0-9-]/g, "").slice(0, 40) || "unspecified";
}

// Transition write INTO paused (a permanent channel error class — the
// Session-2/3 send path calls this after classifying a 400/403-class
// failure). Idempotent: re-marking the SAME reason does not rewrite (the
// marker is written only on transitions, never per tick). Returns true
// when a transition write actually happened.
export async function markChannelPaused(env: Env, reason) {
  if (!env || !env.STATE || (env as any).SIM_NOTIFIED_KEY) return false;
  const cls = pauseReasonClass(reason);
  const cur = await rawPauseRead(env);
  if (cur && cur.paused && cur.reason === cls) return false;
  const marker = { paused: true, reason: cls, at: Date.now() };
  try {
    await env.STATE.put(CONFIG.KV_CHANNEL_MIRROR, JSON.stringify(marker));
    CHANNEL_PAUSE_MEM = { kv: env.STATE, at: Date.now(), value: marker };
    console.warn("channel-mirror: destination paused (" + cls + ") — channel sends suppressed until config change / owner action");
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
  const marker = { paused: false, reason: cur.reason || null, at: cur.at || null, resumed_at: Date.now() };
  try {
    await env.STATE.put(CONFIG.KV_CHANNEL_MIRROR, JSON.stringify(marker));
    CHANNEL_PAUSE_MEM = { kv: env.STATE, at: Date.now(), value: marker };
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
