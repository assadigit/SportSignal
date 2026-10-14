// scripts/lib/mock-env.js — the shared MOCK ENVIRONMENT for the full-worker
// harness (v13.102): an in-memory KV with TTL semantics against the mock
// clock, an in-memory D1 recognizing every USERS_DB statement the worker
// issues (user-store seam + notified_v1 + notify_deliveries_v1), and a fetch
// dispatcher the scenario programs per-URL.
//
// The D1 mock implements the exact statement surface (see check-userstore
// for the precedent); anything unrecognized throws — a new SQL statement in
// src is a harness change by contract, never silently ignored.
"use strict";

// --- mock KV (with expirationTtl honored against Date.now — the mock clock
// when the harness is installed) ---
function makeKV() {
  const m = new Map();
  const kv = {
    async get(k, arg) {
      const e = m.get(k);
      if (!e) return null;
      if (e.exp && Date.now() > e.exp) { m.delete(k); return null; }
      if (arg === "json") { try { return JSON.parse(e.v); } catch (err) { return null; } }
      return e.v;
    },
    async put(k, v, opts) {
      const ttl = opts && opts.expirationTtl;
      m.set(k, { v: String(v), exp: ttl ? Date.now() + ttl * 1e3 : null });
    },
    async delete(k) { m.delete(k); },
    _map: m
  };
  return kv;
}

// --- mock D1 (the USERS_DB statement surface, verbatim) ---
function makeD1(opts) {
  const o = opts || {};
  const t = {
    user_prefs: new Map(),      // chat_id -> {teams, tz, lang, updated_at}
    chats: new Map(),           // chat_id -> {joined_at}
    chat_profiles: new Map(),   // chat_id -> {username, first_name, title, joined, updated_at}
    upd_dedupe: new Map(),      // upd_id -> ts
    userstore_meta: new Map(),  // k -> v
    notified_v1: new Map(),     // "<match_key>\u0000<ntype>" -> {notified_at, expires_at, match_date}
    notify_deliveries_v1: new Map() // "<match_key>\u0000<ntype>\u0000<chat_id>" -> {verdict, sent_at}
  };
  const nk = (k, nt) => k + "\u0000" + nt;
  const dk = (k, nt, c) => k + "\u0000" + nt + "\u0000" + c;
  function exec(sql, p) {
    const s = String(sql).trim();
    if (o.failWrites && /^(INSERT|DELETE|UPDATE)/i.test(s)) throw new Error("D1 is overloaded");
    if (o.failReads && /^SELECT/i.test(s)) throw new Error("D1 is unreachable");
    const rowsOf = (map) => [...map.entries()].map(([k, v]) => Object.assign({ __k: k }, v));
    // --- user_prefs ---
    if (s.startsWith("SELECT chat_id, teams, tz, lang FROM user_prefs")) {
      return { results: rowsOf(t.user_prefs).map((r) => ({ chat_id: Number(r.__k), teams: r.teams, tz: r.tz, lang: r.lang })) };
    }
    if (s.startsWith("INSERT INTO user_prefs")) {
      t.user_prefs.set(Number(p[0]), { teams: p[1], tz: p[2], lang: p[3], updated_at: p[4] });
      return { meta: { changes: 1 } };
    }
    if (s.startsWith("DELETE FROM user_prefs")) {
      const had = t.user_prefs.delete(Number(p[0]));
      return { meta: { changes: had ? 1 : 0 } };
    }
    // --- chats registry ---
    if (s.startsWith("SELECT COUNT(*) AS n FROM chats")) {
      return { results: [{ n: t.chats.size }] };
    }
    if (s.startsWith("SELECT chat_id FROM chats")) {
      return { results: [...t.chats.keys()].map((k) => ({ chat_id: Number(k) })) };
    }
    if (s.startsWith("INSERT OR IGNORE INTO chats")) {
      const id = Number(p[0]);
      if (t.chats.has(id)) return { meta: { changes: 0 } };
      t.chats.set(id, { joined_at: p[1] });
      return { meta: { changes: 1 } };
    }
    if (s.startsWith("DELETE FROM chats WHERE chat_id NOT IN")) {
      // params are the keep-list (?1, ?2, ...)
      const keep = p.map(Number);
      let changes = 0;
      for (const k of [...t.chats.keys()]) if (!keep.includes(Number(k))) { t.chats.delete(k); changes++; }
      return { meta: { changes } };
    }
    if (s.startsWith("DELETE FROM chats WHERE chat_id = ?1")) {
      const had = t.chats.delete(Number(p[0]));
      return { meta: { changes: had ? 1 : 0 } };
    }
    if (s.startsWith("DELETE FROM chats")) {
      const n = t.chats.size;
      t.chats.clear();
      return { meta: { changes: n } };
    }
    // --- chat_profiles ---
    if (s.startsWith("SELECT chat_id, username, first_name, title, joined FROM chat_profiles WHERE")) {
      const r = t.chat_profiles.get(Number(p[0]));
      return { results: r ? [Object.assign({ chat_id: Number(p[0]) }, r)] : [] };
    }
    if (s.startsWith("SELECT chat_id, username, first_name, title, joined FROM chat_profiles")) {
      return { results: [...t.chat_profiles.entries()].map(([k, v]) => Object.assign({ chat_id: Number(k) }, v)) };
    }
    if (s.startsWith("INSERT INTO chat_profiles")) {
      t.chat_profiles.set(Number(p[0]), { username: p[1], first_name: p[2], title: p[3], joined: p[4], updated_at: p[5] });
      return { meta: { changes: 1 } };
    }
    // --- upd_dedupe ---
    if (s.startsWith("INSERT OR IGNORE INTO upd_dedupe")) {
      if (t.upd_dedupe.has(p[0])) return { meta: { changes: 0 } };
      t.upd_dedupe.set(p[0], p[1]);
      return { meta: { changes: 1 } };
    }
    if (s.startsWith("DELETE FROM upd_dedupe")) {
      return { meta: { changes: 0 } };
    }
    // --- userstore_meta ---
    if (s.startsWith("SELECT v FROM userstore_meta")) {
      const mk = (s.match(/k = '([^']+)'/) || [])[1] || "migrated_at";
      const v = t.userstore_meta.get(mk);
      return { results: v ? [{ v }] : [] };
    }
    if (s.startsWith("INSERT INTO userstore_meta")) {
      const mk = (s.match(/VALUES \('([^']+)'/) || [])[1] || "migrated_at";
      t.userstore_meta.set(mk, p[0]);
      return { meta: { changes: 1 } };
    }
    // --- notified_v1 (the write-first dedupe store) ---
    if (s.startsWith("SELECT match_key, ntype, notified_at, expires_at, match_date FROM notified_v1")) {
      return { results: [...t.notified_v1.entries()].map(([k, v]) => {
        const [mk, nt] = k.split("\u0000");
        return { match_key: mk, ntype: nt, notified_at: v.notified_at, expires_at: v.expires_at, match_date: v.match_date };
      }) };
    }
    if (s.startsWith("INSERT OR IGNORE INTO notified_v1")) {
      const key = nk(p[0], p[1]);
      if (t.notified_v1.has(key)) return { meta: { changes: 0 } };
      t.notified_v1.set(key, { notified_at: p[2], expires_at: p[3], match_date: p[4] });
      return { meta: { changes: 1 } };
    }
    if (s.startsWith("DELETE FROM notified_v1")) {
      let changes = 0;
      for (const [k, v] of [...t.notified_v1.entries()]) if (v.expires_at < p[0]) { t.notified_v1.delete(k); changes++; }
      return { meta: { changes } };
    }
    // --- notify_deliveries_v1 (the v13.102 per-chat ledger) ---
    if (s.startsWith("INSERT OR REPLACE INTO notify_deliveries_v1")) {
      t.notify_deliveries_v1.set(dk(p[0], p[1], p[2]), { verdict: p[3], sent_at: p[4] });
      return { meta: { changes: 1 } };
    }
    if (s.startsWith("INSERT INTO notify_deliveries_v1")) {
      // the repair marker: ON CONFLICT DO NOTHING
      const key = dk(p[0], p[1], p[2]);
      if (t.notify_deliveries_v1.has(key)) return { meta: { changes: 0 } };
      t.notify_deliveries_v1.set(key, { verdict: "repair", sent_at: p[3] });
      return { meta: { changes: 1 } };
    }
    if (s.startsWith("SELECT match_key, ntype, chat_id, verdict FROM notify_deliveries_v1 WHERE sent_at >")) {
      return { results: [...t.notify_deliveries_v1.entries()].filter(([k, v]) => v.sent_at > p[0]).map(([k, v]) => {
        const [mk, nt, cid] = k.split("\u0000");
        return { match_key: mk, ntype: nt, chat_id: Number(cid), verdict: v.verdict };
      }) };
    }
    if (s.startsWith("DELETE FROM notify_deliveries_v1")) {
      let changes = 0;
      for (const [k, v] of [...t.notify_deliveries_v1.entries()]) if (v.sent_at < p[0]) { t.notify_deliveries_v1.delete(k); changes++; }
      return { meta: { changes } };
    }
    throw new Error("mock D1: unrecognized statement: " + s.slice(0, 80));
  }
  const d1 = {
    _tables: t,
    prepare(sql) {
      const stmt = {
        _sql: sql,
        bind(...params) {
          return {
            run: async () => exec(sql, params),
            first: async () => exec(sql, params).results[0] || null,
            all: async () => ({ results: exec(sql, params).results })
          };
        },
        run: async () => exec(sql, []),
        first: async () => exec(sql, []).results[0] || null,
        all: async () => ({ results: exec(sql, []).results })
      };
      return stmt;
    },
    async batch(boundStmts) {
      const out = [];
      for (const s of boundStmts) out.push(await s.run());
      return out;
    }
  };
  return d1;
}

// --- the fetch dispatcher: (url, init) → Response-like; scenarios program
// handlers BEFORE the ticks. Telegram sends are captured with chat ids. ---
function makeFetchDispatcher() {
  const state = {
    handlers: [],   // { match: (url, init) => boolean, handle: async (url, init) => any }
    calls: [],      // every fetch call: { url, init, method, chatId?, method_ }
    telegramSends: [] // { method ("sendMessage"...), chatId, text, parse_mode }
  };
  const json = (obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers: { "content-type": "application/json" } });
  const dispatcher = async (url, init) => {
    const u = String(url);
    init = init || {};
    state.calls.push({ url: u, init, method: (init && init.method) || "GET" });
    // Telegram Bot API capture
    const tg = u.match(/api\.telegram\.org\/bot[^/]+\/([a-zA-Z]+)$/);
    if (tg) {
      let body = {};
      try {
        if (typeof init.body === "string") body = JSON.parse(init.body);
        else if (init.body && typeof init.body.get === "function") {
          // FormData (sendPhoto): flatten to a plain object so chat_id and
          // caption are addressable exactly like the JSON bodies.
          const fd = {};
          for (const pair of init.body.entries()) fd[pair[0]] = String(pair[1]);
          body = fd;
        }
      } catch (e) { }
      const entry = {
        method: tg[1],
        chatId: body.chat_id != null ? Number(body.chat_id) : null,
        text: String(body.text != null ? body.text : (body.caption != null ? body.caption : "")),
        payload: body,
        t: typeof state.clock === "function" ? state.clock() : null
      };
      state.telegramSends.push(entry);
      const verdict = await state.onTelegram(entry, u, init);
      entry.ok = verdict !== "dead" && verdict !== "fail";
      if (verdict === "dead") return json({ ok: false, error_code: 403, description: "Forbidden: bot was blocked by the user" }, 403);
      if (verdict === "fail") return json({ ok: false, error_code: 500, description: "internal" }, 500);
      return json({ ok: true, result: { message_id: Math.floor(Math.random() * 1e6) } });
    }
    for (const h of state.handlers) {
      if (h.match(u, init)) return await h.handle(u, init);
    }
    return json({});
  };
  state.dispatch = dispatcher;
  state.json = json;
  // default: every Telegram send succeeds; scenarios override for failure cases
  state.onTelegram = async () => true;
  return state;
}

module.exports = { makeKV, makeD1, makeFetchDispatcher };
