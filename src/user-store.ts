// SportSignal — v13.92-d1userstore: the user-data seam (prefs / chat
// registry / profiles / update dedupe) on D1 with the legacy KV paths kept
// verbatim as the fallback.
//
// WHY (measured 2026-10-13, live): the Workers free-plan KV write quota is
// ACCOUNT-level — the account also hosts the sibling currena workers, and
// by 14:00 UTC the two apps had written 631 (STATE) + 658 (RATES) = 1289
// keys → error 10048 on every put until the midnight-UTC reset. That is
// Tehran prime time: every /timezone, /follow, /lang and /start tap failed
// (honestly surfaced since v13.91, but still failing). D1's free tier is a
// SEPARATE 100k-writes/day quota — user actions become writable 24/7, and
// the per-row upsert kills the old whole-blob read-modify-write race (two
// concurrent users editing different rows used to clobber each other).
//
// CONTRACT (byte-identical when USERS_DB is unbound — local dev, the eval
// harness, a missing binding): every function below falls back to the exact
// pre-v13.92 KV paths (user_prefs_v1 / telegram_users_v6 /
// user_profiles_v1 / upd_<id>, TTL 600). Reads under a bound USERS_DB:
// D1 primary, legacy KV snapshot on D1 error (fail-open, data as of
// cutover). Writes under a bound USERS_DB: D1 only (a KV mirror would
// re-burn the quota we are escaping); failures return false so the v13.91
// honest-failure UX keeps working. The one-time KV→D1 backfill (scripts/
// backfill-userstore.js) stamps userstore_meta.migrated_at — AFTER the
// marker, an empty `chats` table means EMPTY (a /stop-ed roster must never
// resurrect from the stale KV copy); a marker-less empty table self-heals
// from KV once (fresh-DB recovery).
//
// SEMANTICS PRESERVED (do not "fix" these in passing):
//   - /stop prunes the REGISTRY only; the prefs row stays orphaned (as the
//     KV blob always did).
//   - /follow all deletes the row entirely (lang+tz wiped — the historic
//     behavior; a returning /start re-prompts the language).
//   - admin clear-locks wipes the registry (users re-/start); prefs survive.
//   - the Telegram update dedupe is WRITE-FIRST and availability-first on
//     storage failure (a failed mark proceeds — same as the old KV catch).

import { CONFIG } from "./config";
import type { Env } from "./types";

function userStoreActive(env) {
  return !!(env && (env as any).USERS_DB);
}

// ---------- legacy KV readers (verbatim pre-v13.92 shapes) ----------

async function legacyPrefsRead(env: Env) {
  try { return (await env.STATE.get(env.SIM_PREFS_KEY || CONFIG.KV_USER_PREFS, "json")) || {}; } catch (e) { return {}; }
}

// null = key absent/unreadable (the caller — users.getRegisteredChats —
// owns the [CHAT_ID] seed fallback); [] = a stored empty roster.
async function legacyChatsRead(env: Env) {
  try {
    const chats = await env.STATE.get(CONFIG.KV_USERS_KEY);
    if (chats) {
      const parsed = JSON.parse(chats);
      if (Array.isArray(parsed)) return parsed.map(Number).filter((n) => !isNaN(n));
    }
    return null;
  } catch (e) { return null; }
}

async function legacyProfilesRead(env: Env) {
  try { return (await env.STATE.get(CONFIG.KV_USER_PROFILES, "json")) || {}; } catch (e) { return {}; }
}

async function legacyPrefsBlobWrite(env: Env, prefs) {
  await env.STATE.put(env.SIM_PREFS_KEY || CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
}

// ---------- prefs (map shape: {chatId: {teams?, tz?, lang?}}) ----------

export async function userPrefsAll(env: Env) {
  // v13.5-sim-scope: a simulation's cloned env carries SIM_PREFS_KEY — its
  // reads/writes stay on that KV key and NEVER touch the real store.
  if (env && env.SIM_PREFS_KEY) return await legacyPrefsRead(env);
  if (userStoreActive(env)) {
    try {
      const rows = await (env as any).USERS_DB.prepare("SELECT chat_id, teams, tz, lang FROM user_prefs").all();
      const out: Record<string, any> = {};
      for (const r of (rows && rows.results) || []) {
        const e: Record<string, any> = {};
        if (r.teams != null) {
          try { e.teams = JSON.parse(r.teams); } catch (err) { /* corrupt JSON → treat as absent */ }
        }
        if (r.tz) e.tz = r.tz;
        if (r.lang) e.lang = r.lang;
        out[String(r.chat_id)] = e;
      }
      return out;
    } catch (e: any) {
      console.warn("user-store: D1 prefs read failed (legacy KV fallback): " + e.message);
      return await legacyPrefsRead(env);
    }
  }
  return await legacyPrefsRead(env);
}

// Full-row replace (every call site constructs the complete entry — same
// semantics as the old whole-blob put). entry: {teams?: any[]|null,
// tz?: string|null, lang?: string|null}. Returns true when persisted.
export async function saveUserPref(env: Env, chatId, entry) {
  if (env && env.SIM_PREFS_KEY) {
    // sim isolation: RMW the sim key exactly like the pre-v13.92 path.
    try {
      const prefs = await legacyPrefsRead(env);
      prefs[String(chatId)] = entry;
      await legacyPrefsBlobWrite(env, prefs);
      return true;
    } catch (e: any) { return false; }
  }
  if (userStoreActive(env)) {
    try {
      const teams = entry && Array.isArray(entry.teams) ? JSON.stringify(entry.teams) : null;
      const tz = entry && entry.tz ? String(entry.tz) : null;
      const lang = entry && entry.lang ? String(entry.lang) : null;
      await (env as any).USERS_DB.prepare(
        "INSERT INTO user_prefs (chat_id, teams, tz, lang, updated_at) VALUES (?1, ?2, ?3, ?4, ?5) " +
        "ON CONFLICT(chat_id) DO UPDATE SET teams=excluded.teams, tz=excluded.tz, lang=excluded.lang, updated_at=excluded.updated_at"
      ).bind(Number(chatId), teams, tz, lang, new Date().toISOString()).run();
      return true;
    } catch (e: any) {
      console.error("saveUserPref: D1 write failed: " + e.message);
      return false;
    }
  }
  // legacy KV blob RMW (byte-identical to the pre-v13.92 write sites)
  try {
    const prefs = await env.STATE.get(CONFIG.KV_USER_PREFS, "json").catch(() => null) || {};
    if (entry && (entry.teams !== undefined || entry.tz !== undefined || entry.lang !== undefined)) {
      prefs[String(chatId)] = entry;
    } else {
      delete prefs[String(chatId)];
    }
    await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
    return true;
  } catch (e: any) {
    console.error("saveUserPref: KV write failed: " + e.message);
    return false;
  }
}

// /follow all wipes the row entirely (historic semantics: lang+tz go too).
export async function deleteUserPref(env: Env, chatId) {
  if (env && env.SIM_PREFS_KEY) {
    try {
      const prefs = await legacyPrefsRead(env);
      delete prefs[String(chatId)];
      await legacyPrefsBlobWrite(env, prefs);
      return true;
    } catch (e: any) { return false; }
  }
  if (userStoreActive(env)) {
    try {
      await (env as any).USERS_DB.prepare("DELETE FROM user_prefs WHERE chat_id = ?1").bind(Number(chatId)).run();
      return true;
    } catch (e: any) {
      console.error("deleteUserPref: D1 write failed: " + e.message);
      return false;
    }
  }
  try {
    const prefs = await env.STATE.get(CONFIG.KV_USER_PREFS, "json").catch(() => null) || {};
    delete prefs[String(chatId)];
    await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
    return true;
  } catch (e: any) { return false; }
}

// ---------- chat registry ----------

// number[] = roster (EMPTY [] is a real answer once the migration marker
// exists); null = storage absent/unreadable → the caller's [CHAT_ID] seed.
export async function registeredChats(env: Env) {
  if (userStoreActive(env)) {
    try {
      const rows = await (env as any).USERS_DB.prepare("SELECT chat_id FROM chats").all();
      const ids = ((rows && rows.results) || []).map((r: any) => Number(r.chat_id)).filter((n) => !isNaN(n));
      if (ids.length) return ids;
      const meta = await (env as any).USERS_DB.prepare("SELECT v FROM userstore_meta WHERE k = 'migrated_at'").first();
      if (meta && meta.v) return []; // migrated → empty means empty
      // marker-less empty D1: self-heal ONCE from the legacy KV snapshot
      // (fresh-DB recovery; idempotent INSERT OR IGNORE).
      const legacy = await legacyChatsRead(env);
      if (legacy && legacy.length) {
        try {
          const now = new Date().toISOString();
          const stmts = legacy.map((id) => (env as any).USERS_DB.prepare("INSERT OR IGNORE INTO chats (chat_id, joined_at) VALUES (?1, ?2)").bind(id, now));
          await (env as any).USERS_DB.batch(stmts);
          await (env as any).USERS_DB.prepare("INSERT INTO userstore_meta (k, v) VALUES ('migrated_at', ?1) ON CONFLICT(k) DO UPDATE SET v=excluded.v").bind(now).run();
        } catch (e: any) { /* best-effort: serve the legacy list anyway */ }
      }
      return legacy;
    } catch (e: any) {
      console.warn("user-store: D1 chats read failed (legacy KV fallback): " + e.message);
      return await legacyChatsRead(env);
    }
  }
  return await legacyChatsRead(env);
}

// {ok, added, count}: ok=false = write FAILED (the caller keeps serving the
// user — INSERT OR IGNORE retries on their next interaction); added=false =
// already registered (a /start re-tap).
export async function registerChat(env: Env, chatId, joinedAt?) {
  const id = Number(chatId);
  const joined = joinedAt || new Date().toISOString();
  if (userStoreActive(env)) {
    try {
      const r = await (env as any).USERS_DB.prepare("INSERT OR IGNORE INTO chats (chat_id, joined_at) VALUES (?1, ?2)").bind(id, joined).run();
      const cnt = await (env as any).USERS_DB.prepare("SELECT COUNT(*) AS n FROM chats").first();
      return { ok: true, added: !!(r && r.meta && r.meta.changes > 0), count: (cnt && Number(cnt.n)) || 0 };
    } catch (e: any) {
      console.error("registerChat: D1 write failed: " + e.message);
      return { ok: false, added: false, count: 0 };
    }
  }
  try {
    const cur = await legacyChatsRead(env);
    // absent registry seeds with the admin (exactly what the pre-v13.92
    // getRegisteredChats fallback + push produced on a fresh install).
    const list = cur || (isNaN(parseInt(env.CHAT_ID)) ? [] : [parseInt(env.CHAT_ID)]);
    const added = !list.includes(id);
    if (added) list.push(id);
    await env.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify(list));
    return { ok: true, added, count: list.length };
  } catch (e: any) {
    console.error("registerChat: KV write failed: " + e.message);
    return { ok: false, added: false, count: 0 };
  }
}

// /stop — registry only (the prefs row stays orphaned, as the blob always did).
export async function removeChat(env: Env, chatId) {
  const id = Number(chatId);
  if (userStoreActive(env)) {
    try {
      const cnt = await (env as any).USERS_DB.prepare("DELETE FROM chats WHERE chat_id = ?1").bind(id).run();
      const after = await (env as any).USERS_DB.prepare("SELECT COUNT(*) AS n FROM chats").first();
      return { ok: true, wasMember: !!(cnt && cnt.meta && cnt.meta.changes > 0), count: (after && Number(after.n)) || 0 };
    } catch (e: any) {
      console.error("removeChat: D1 write failed: " + e.message);
      return { ok: false, wasMember: false, count: 0 };
    }
  }
  try {
    const cur = await legacyChatsRead(env);
    const list = (cur || []).filter((c: any) => Number(c) !== id);
    await env.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify(list));
    return { ok: true, wasMember: !!(cur && cur.some((c: any) => Number(c) === id)), count: list.length };
  } catch (e: any) {
    return { ok: false, wasMember: false, count: 0 };
  }
}

// notify-engine / digest-bigmatch dead-chat prunes (write the keep-list).
export async function pruneChats(env: Env, keep) {
  const keepNums = (keep || []).map(Number).filter((n) => !isNaN(n));
  if (userStoreActive(env)) {
    try {
      if (!keepNums.length) {
        await (env as any).USERS_DB.prepare("DELETE FROM chats").run();
      } else {
        const ph = keepNums.map((_, i) => "?" + (i + 1)).join(",");
        await (env as any).USERS_DB.prepare("DELETE FROM chats WHERE chat_id NOT IN (" + ph + ")").bind(...keepNums).run();
      }
      return true;
    } catch (e: any) {
      console.error("pruneChats: D1 write failed: " + e.message);
      return false;
    }
  }
  try {
    await env.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify(keepNums));
    return true;
  } catch (e: any) { return false; }
}

// admin clear-locks ("Users need to /start again") — registry only; prefs
// and profiles survive (historic behavior).
export async function resetChatRegistry(env: Env) {
  let d1 = false;
  if (userStoreActive(env)) {
    try { await (env as any).USERS_DB.prepare("DELETE FROM chats").run(); d1 = true; } catch (e: any) { console.error("resetChatRegistry: D1 failed: " + e.message); }
  }
  await env.STATE.delete(CONFIG.KV_USERS_KEY).catch(() => {});
  return d1;
}

// ---------- chat profiles ({chatId: {username, first_name, title, joined}}) ----------

export async function chatProfilesAll(env: Env) {
  if (userStoreActive(env)) {
    try {
      const rows = await (env as any).USERS_DB.prepare("SELECT chat_id, username, first_name, title, joined FROM chat_profiles").all();
      const out: Record<string, any> = {};
      for (const r of (rows && rows.results) || []) {
        out[String(r.chat_id)] = { username: r.username || null, first_name: r.first_name || null, title: r.title || null, joined: r.joined || null };
      }
      return out;
    } catch (e: any) {
      console.warn("user-store: D1 profiles read failed (legacy KV fallback): " + e.message);
      return await legacyProfilesRead(env);
    }
  }
  return await legacyProfilesRead(env);
}

// Single-profile read (bot.ts per-message upsert + admin-bot chatProfile) —
// one indexed D1 row instead of the whole-profiles blob scan.
export async function chatProfileGet(env: Env, chatId) {
  if (userStoreActive(env)) {
    try {
      const r = await (env as any).USERS_DB.prepare("SELECT chat_id, username, first_name, title, joined FROM chat_profiles WHERE chat_id = ?1").bind(Number(chatId)).first();
      if (!r) return {};
      return { username: r.username || null, first_name: r.first_name || null, title: r.title || null, joined: r.joined || null };
    } catch (e: any) {
      const all = await legacyProfilesRead(env);
      return all[String(chatId)] || {};
    }
  }
  const all = await legacyProfilesRead(env);
  return all[String(chatId)] || {};
}

export async function saveChatProfile(env: Env, chatId, profile) {
  const id = Number(chatId);
  if (userStoreActive(env)) {
    try {
      await (env as any).USERS_DB.prepare(
        "INSERT INTO chat_profiles (chat_id, username, first_name, title, joined, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6) " +
        "ON CONFLICT(chat_id) DO UPDATE SET username=excluded.username, first_name=excluded.first_name, title=excluded.title, joined=excluded.joined, updated_at=excluded.updated_at"
      ).bind(id, profile && profile.username ? String(profile.username) : null, profile && profile.first_name ? String(profile.first_name) : null, profile && profile.title ? String(profile.title) : null, profile && profile.joined ? String(profile.joined) : null, new Date().toISOString()).run();
      return true;
    } catch (e: any) {
      console.error("saveChatProfile: D1 write failed: " + e.message);
      return false;
    }
  }
  try {
    const profiles = await env.STATE.get(CONFIG.KV_USER_PROFILES, "json").catch(() => null) || {};
    if (profile) profiles[String(chatId)] = profile; else delete profiles[String(chatId)];
    await env.STATE.put(CONFIG.KV_USER_PROFILES, JSON.stringify(profiles));
    return true;
  } catch (e: any) { return false; }
}

// users.getBotMembers backfill path (the whole-profiles-map write).
export async function saveChatProfilesBulk(env: Env, profiles) {
  if (userStoreActive(env)) {
    try {
      const now = new Date().toISOString();
      const stmts = Object.entries(profiles || {}).map(([k, p]: any) => (env as any).USERS_DB.prepare(
        "INSERT INTO chat_profiles (chat_id, username, first_name, title, joined, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6) " +
        "ON CONFLICT(chat_id) DO UPDATE SET username=excluded.username, first_name=excluded.first_name, title=excluded.title, joined=excluded.joined, updated_at=excluded.updated_at"
      ).bind(Number(k), p && p.username ? String(p.username) : null, p && p.first_name ? String(p.first_name) : null, p && p.title ? String(p.title) : null, p && p.joined ? String(p.joined) : null, now));
      if (stmts.length) await (env as any).USERS_DB.batch(stmts);
      return true;
    } catch (e: any) {
      console.error("saveChatProfilesBulk: D1 write failed: " + e.message);
      return false;
    }
  }
  try {
    await env.STATE.put(CONFIG.KV_USER_PROFILES, JSON.stringify(profiles || {}));
    return true;
  } catch (e: any) { return false; }
}

// ---------- Telegram update dedupe (write-first) ----------

// true = ALREADY seen (skip). Storage failure → false (proceed) — the
// availability-first choice of the old KV catch. D1 rows are pruned
// probabilistically (2% of inserts, 2h cut — the stats.ts tidy pattern);
// the KV path keeps its 600s TTL.
export async function updSeen(env: Env, updId) {
  if (userStoreActive(env)) {
    try {
      const now = Date.now();
      const r = await (env as any).USERS_DB.prepare("INSERT OR IGNORE INTO upd_dedupe (upd_id, ts) VALUES (?1, ?2)").bind(String(updId), now).run();
      if (Math.random() < 0.02) {
        await (env as any).USERS_DB.prepare("DELETE FROM upd_dedupe WHERE ts < ?1").bind(now - 7200000).run().catch(() => {});
      }
      return !(r && r.meta && r.meta.changes > 0);
    } catch (e: any) {
      console.warn("updSeen: D1 failed (proceeding, availability-first): " + e.message);
      return false;
    }
  }
  try {
    const seen = await env.STATE.get("upd_" + updId).catch(() => null);
    if (seen) return true;
    await env.STATE.put("upd_" + updId, "1", { expirationTtl: 600 }).catch(() => {});
    return false;
  } catch (e: any) { return false; }
}
