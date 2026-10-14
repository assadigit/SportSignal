// Self-check: v13.92-d1userstore — the D1 user-data seam (src/user-store.ts,
// the REAL module sliced from the concat) against a mock D1 + mock KV.
// The legacy-KV paths are already covered by check-join-flow /
// check-bot-edges / check-admin (their mock envs carry no USERS_DB binding);
// THIS file locks the D1 paths + the fallback/self-heal/honest-failure
// matrix:
//   D1 prefs round-trip (teams JSON array, exact entry shape)
//   explicit-null row → {} entry (shape parity with the blob era)
//   deleteUserPref / registerChat / removeChat / pruneChats / resetChatRegistry
//   updSeen: new vs dup vs D1-error-proceeds (availability-first)
//   empty-after-marker: a /stop-ed roster is NOT resurrected from stale KV
//   marker-less empty D1: self-heal backfill from the legacy KV snapshot
//   D1 read error → legacy KV fallback (fail-open)
//   D1 write error → boolean false (the v13.91 honest-failure contract) and
//     NO legacy mirror write (a mirror would re-burn the quota — by design)
//   sim isolation: SIM_PREFS_KEY reads/writes never touch D1
const fs = require("fs");
const src = require("./lib/worker-src")();

// --- slice the REAL user-store module ---
const usStart = src.indexOf("// ===== src/user-store.ts =====");
const usEnd = src.indexOf("// ===== src/users.ts =====");
if (usStart < 0 || usEnd < 0 || usEnd < usStart) {
  console.error("FAIL: user-store module not found in worker source");
  process.exit(1);
}
const userStoreSrc = src.slice(usStart, usEnd);

// --- mock KV ---
function makeStore() {
  const m = new Map();
  return {
    async get(k, arg) {
      const v = m.get(k);
      if (arg === "json") return v ? JSON.parse(v) : null;
      return v === undefined ? null : v;
    },
    async put(k, v) { m.set(k, v); },
    async delete(k) { m.delete(k); },
    _map: m
  };
}

// --- mock D1 (recognizes the exact statements user-store issues) ---
function makeD1(opts) {
  const t = {
    user_prefs: new Map(),     // chat_id -> {teams, tz, lang, updated_at}
    chats: new Map(),          // chat_id -> {joined_at}
    chat_profiles: new Map(),  // chat_id -> {username, first_name, title, joined, updated_at}
    upd_dedupe: new Map(),     // upd_id -> ts
    userstore_meta: new Map()  // k -> v
  };
  const d1 = {
    _tables: t,
    prepare(sql) {
      return {
        _sql: sql,
        bind(...params) {
          // run() returns a Promise (real-D1 semantics) — updSeen's 2%
          // cleanup calls .run().catch(); a sync mock object made that
          // throw ~4% of runs (the pre-existing "replayed update is a dup"
          // flake, found while re-running the suite for v13.99-uclgif).
          const run = async () => exec(sql, params);
          return {
            run,
            first: async () => exec(sql, params).results[0] || null,
            all: async () => ({ results: exec(sql, params).results })
          };
        },
        run: async () => exec(sql, []),
        first: async () => exec(sql, []).results[0] || null,
        all: async () => ({ results: exec(sql, []).results })
      };
    },
    async batch(stmts) {
      let last = null;
      for (const s of stmts) last = await s._run ? s._run() : null; // placeholder, unused
      return last;
    }
  };
  // batch executes the already-bound statements: user-store builds them via
  // prepare().bind() — the bound object carries .run
  d1.batch = async (boundStmts) => {
    for (const s of boundStmts) await s.run();
    return [];
  };
  function exec(sql, p) {
    if (opts && opts.failWrites && /^(INSERT|DELETE|UPDATE)/i.test(sql.trim())) {
      throw new Error("D1 is overloaded");
    }
    if (opts && opts.failReads && /^SELECT/i.test(sql.trim())) {
      throw new Error("D1 is unreachable");
    }
    const s = sql.trim();
    const rowsOf = (map) => [...map.entries()].map(([k, v]) => Object.assign({ __k: k }, v));
    if (s.startsWith("SELECT chat_id, teams, tz, lang FROM user_prefs")) {
      return { results: rowsOf(t.user_prefs).map((r) => ({ chat_id: Number(r.__k), teams: r.teams, tz: r.tz, lang: r.lang })) };
    }
    if (s.startsWith("INSERT INTO user_prefs")) {
      const id = Number(p[0]);
      t.user_prefs.set(id, { teams: p[1], tz: p[2], lang: p[3], updated_at: p[4] });
      return { meta: { changes: 1 } };
    }
    if (s.startsWith("DELETE FROM user_prefs")) {
      const id = Number(p[0]);
      const had = t.user_prefs.delete(id);
      return { meta: { changes: had ? 1 : 0 } };
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
    if (s.startsWith("SELECT COUNT(*) AS n FROM chats")) {
      return { results: [{ n: t.chats.size }] };
    }
    if (s.startsWith("SELECT v FROM userstore_meta")) {
      const v = t.userstore_meta.get("migrated_at");
      return { results: v ? [{ v }] : [] };
    }
    if (s.startsWith("INSERT INTO userstore_meta")) {
      t.userstore_meta.set("migrated_at", p[0]);
      return { meta: { changes: 1 } };
    }
    if (s.startsWith("DELETE FROM chats WHERE chat_id NOT IN")) {
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
    if (s.startsWith("INSERT OR IGNORE INTO upd_dedupe")) {
      if (t.upd_dedupe.has(p[0])) return { meta: { changes: 0 } };
      t.upd_dedupe.set(p[0], p[1]);
      return { meta: { changes: 1 } };
    }
    if (s.startsWith("DELETE FROM upd_dedupe")) {
      return { meta: { changes: 0 } };
    }
    throw new Error("mock D1: unrecognized statement: " + s.slice(0, 60));
  }
  return d1;
}

globalThis.CONFIG = { KV_USERS_KEY: "telegram_users_v6", KV_USER_PREFS: "user_prefs_v1", KV_USER_PROFILES: "user_profiles_v1" };

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) failed++;
};

(async () => {
  // eval the real module once in this scope
  eval(userStoreSrc);

  // ===== 1) D1 prefs round-trip (exact entry shape) =====
  const env = { STATE: makeStore(), USERS_DB: makeD1(), CHAT_ID: "9" };
  check("saveUserPref (D1) returns true", await saveUserPref(env, 42, { teams: ["Alpha FC", "Persepolis"], tz: "Australia/Sydney", lang: "en" }));
  const prefs = await userPrefsAll(env);
  check("userPrefsAll (D1) round-trips teams JSON + tz + lang", JSON.stringify(prefs["42"]) === JSON.stringify({ teams: ["Alpha FC", "Persepolis"], tz: "Australia/Sydney", lang: "en" }));

  // explicit-null row → {} entry (blob-era shape parity: key exists, no fields)
  await saveUserPref(env, 7, { teams: null, tz: null, lang: null });
  const prefs2 = await userPrefsAll(env);
  check("explicit-null row → {} entry (shape parity)", prefs2["7"] && Object.keys(prefs2["7"]).length === 0);

  // full-row replace semantics (second save replaces, not merges)
  await saveUserPref(env, 42, { teams: ["Beta SC"], tz: null, lang: "fa" });
  const prefs3 = await userPrefsAll(env);
  check("saveUserPref is a FULL row replace", JSON.stringify(prefs3["42"]) === JSON.stringify({ teams: ["Beta SC"], lang: "fa" }));

  // deleteUserPref
  check("deleteUserPref (D1) true", await deleteUserPref(env, 42));
  check("row gone after delete", !(await userPrefsAll(env))["42"]);

  // ===== 2) registry: register / remove / prune / reset =====
  const reg1 = await registerChat(env, 42);
  const reg2 = await registerChat(env, 42);
  check("registerChat: added=true then idempotent false", reg1.ok && reg1.added && reg1.count === 1 && reg2.ok && !reg2.added && reg2.count === 1);
  await registerChat(env, 99);
  const rem = await removeChat(env, 42);
  const remStranger = await removeChat(env, 555);
  check("removeChat: wasMember + count; stranger neither", rem.wasMember && rem.count === 1 && !remStranger.wasMember);
  check("registeredChats (D1) reads the table", JSON.stringify(await registeredChats(env)) === "[99]");

  // prune keeps only the keep-list (notify-engine dead-chat semantics)
  await registerChat(env, 10);
  await registerChat(env, 20);
  await pruneChats(env, [99, 20]);
  check("pruneChats: NOT IN removes dead, keeps survivors", JSON.stringify(await registeredChats(env)) === "[99,20]");
  // empty keep wipes the roster; a stored empty legacy blob "[]" keeps the
  // answer [] (an ABSENT legacy + marker-less D1 correctly yields null →
  // the users.getRegisteredChats [CHAT_ID] seed — historic behavior).
  env.STATE.put("telegram_users_v6", "[]");
  await pruneChats(env, []);
  check("pruneChats: empty keep wipes the roster", JSON.stringify(await registeredChats(env)) === "[]");
  env.STATE._map.delete("telegram_users_v6");

  // resetChatRegistry: D1 + legacy key both wiped (an empty marker-less D1
  // then yields null → the caller's [CHAT_ID] seed — historic behavior)
  await registerChat(env, 42);
  env.STATE.put("telegram_users_v6", "[42]");
  await resetChatRegistry(env);
  check("resetChatRegistry wipes D1 + the legacy KV key", env.USERS_DB._tables.chats.size === 0 && env.STATE._map.get("telegram_users_v6") === undefined);

  // ===== 3) empty-after-marker: no stale-KV resurrection =====
  const envM = { STATE: makeStore(), USERS_DB: makeD1(), CHAT_ID: "9" };
  envM.USERS_DB._tables.userstore_meta.set("migrated_at", "2026-10-13T00:00:00Z");
  envM.STATE.put("telegram_users_v6", "[92788333,42]"); // stale KV copy
  check("marker + empty D1 → [] (a /stop-ed roster never resurrects)", JSON.stringify(await registeredChats(envM)) === "[]");

  // ===== 4) marker-less empty D1: self-heal backfill from KV =====
  const envH = { STATE: makeStore(), USERS_DB: makeD1(), CHAT_ID: "9" };
  envH.STATE.put("telegram_users_v6", "[92788333,42]");
  const healed = await registeredChats(envH);
  check("self-heal: marker-less empty D1 backfills from KV", JSON.stringify(healed) === "[92788333,42]");
  check("self-heal: the marker is stamped (second read is D1-only)", envH.USERS_DB._tables.userstore_meta.get("migrated_at") != null && envH.USERS_DB._tables.chats.size === 2);

  // ===== 5) D1 read error → legacy KV fallback (fail-open) =====
  const envF = { STATE: makeStore(), USERS_DB: makeD1({ failReads: true }), CHAT_ID: "9" };
  envF.STATE.put("user_prefs_v1", JSON.stringify({ "42": { tz: "Europe/London" } }));
  envF.STATE.put("telegram_users_v6", "[42]");
  const fbPrefs = await userPrefsAll(envF);
  const fbChats = await registeredChats(envF);
  check("D1 read failure → prefs fall back to the KV snapshot", fbPrefs["42"] && fbPrefs["42"].tz === "Europe/London");
  check("D1 read failure → chats fall back to the KV list", JSON.stringify(fbChats) === "[42]");

  // ===== 6) D1 write error → honest false + NO KV mirror (quota by design) =====
  const envW = { STATE: makeStore(), USERS_DB: makeD1({ failWrites: true }), CHAT_ID: "9" };
  const w1 = await saveUserPref(envW, 42, { teams: ["A"], tz: null, lang: "fa" });
  const w2 = await registerChat(envW, 42);
  const w3 = await deleteUserPref(envW, 42);
  const w4 = await updSeen(envW, "u9");
  check("D1 write failure → saveUserPref/registerChat/deleteUserPref false", w1 === false && w2.ok === false && w3 === false);
  check("D1 write failure → updSeen proceeds (availability-first)", w4 === false);
  check("no legacy KV mirror on D1 failure (quota preservation)", envW.STATE._map.get("user_prefs_v1") === undefined && envW.STATE._map.get("telegram_users_v6") === undefined);

  // ===== 7) updSeen: new vs dup =====
  const envU = { STATE: makeStore(), USERS_DB: makeD1(), CHAT_ID: "9" };
  check("updSeen: first sighting is new", (await updSeen(envU, "u1")) === false);
  check("updSeen: replayed update is a dup", (await updSeen(envU, "u1")) === true);
  check("upd_dedupe row exists with ts", envU.USERS_DB._tables.upd_dedupe.get("u1") != null);

  // ===== 8) profiles: single + bulk =====
  await saveChatProfile(env, 42, { username: "alix", first_name: "علی", title: null, joined: "2026-10-01T00:00:00Z" });
  const pget = await chatProfileGet(env, 42);
  check("chatProfileGet round-trips (Persian name intact)", pget.username === "alix" && pget.first_name === "علی" && pget.joined === "2026-10-01T00:00:00Z");
  const all = await chatProfilesAll(env);
  check("chatProfilesAll returns the map shape", all["42"] && all["42"].username === "alix");
  await saveChatProfilesBulk(env, { "50": { username: "b", first_name: "B", title: null, joined: "2026-01-01" } });
  check("saveChatProfilesBulk upserts", (await chatProfilesAll(env))["50"] != null);

  // ===== 9) sim isolation: SIM_PREFS_KEY never touches D1 =====
  const envS = { STATE: makeStore(), USERS_DB: makeD1(), CHAT_ID: "9", SIM_PREFS_KEY: "test_sim_v1_prefs" };
  await saveUserPref(envS, 42, { teams: ["A"], tz: "Europe/London", lang: "en" });
  const simPrefs = await userPrefsAll(envS);
  check("sim save/read stay on the SIM KV key", simPrefs["42"] && simPrefs["42"].tz === "Europe/London" && envS.STATE._map.get("test_sim_v1_prefs") != null);
  check("sim isolation: D1 user_prefs untouched", envS.USERS_DB._tables.user_prefs.size === 0);

  // ===== 10) legacy KV mode (no binding): upd_ write-first =====
  const envL = { STATE: makeStore(), CHAT_ID: "9" };
  check("legacy updSeen first is new + writes the key", (await updSeen(envL, "u1")) === false && envL.STATE._map.get("upd_u1") === "1");
  check("legacy updSeen replay is a dup", (await updSeen(envL, "u1")) === true);

  console.log(failed ? failed + " FAILURES" : "user-store OK");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("FAIL harness error: " + e.message); process.exit(1); });
