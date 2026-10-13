#!/usr/bin/env node
// v13.92-d1userstore — ONE-TIME KV→D1 backfill (reproducible tooling).
// Reads user_prefs_v1 / telegram_users_v6 / user_profiles_v1 from the STATE
// KV namespace (reads survive the write-quota exhaustion) and inserts rows
// into the sportsignal-users D1 database via the REST query endpoint
// (parameterized — no SQL escaping hazards, Persian names included).
// Idempotent: INSERT OR IGNORE for chats/chat_profiles, INSERT OR REPLACE
// for user_prefs (the KV blob is the authoritative source at cutover time),
// and the userstore_meta 'migrated_at' marker is set LAST (empty-D1-means-
// empty logic depends on it). Run once at deploy:
//   CF_API_TOKEN=... CF_ACCOUNT_ID=... node scripts/backfill-userstore.js
"use strict";
const https = require("https");

const CF_API_TOKEN = process.env.CF_API_TOKEN;
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const STATE_NS = process.env.STATE_NS || "432ecae8fb8c4146b6b01b91eb8f4b2a";
const USERS_DB = process.env.USERS_DB_ID || "0b52a5d0-6068-4d58-b656-d6f768415a9c";
if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
  console.error("CF_API_TOKEN / CF_ACCOUNT_ID required");
  process.exit(1);
}

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: "api.cloudflare.com",
      path,
      method,
      headers: Object.assign(
        { Authorization: "Bearer " + CF_API_TOKEN },
        data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}
      )
    }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(d) }); }
        catch (e) { resolve({ status: res.statusCode, json: null, raw: d }); }
      });
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

async function kvGet(key) {
  const r = await req("GET", `/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${STATE_NS}/values/${key}`);
  if (r.status !== 200) throw new Error("KV get " + key + " -> " + r.status + " " + (r.raw || "").slice(0, 200));
  // The values endpoint returns the RAW value (JSON.parse in req() may already
  // have consumed it into r.json); use whichever carry it.
  return r.json !== null && r.json !== undefined ? r.json : JSON.parse(r.raw);
}

async function d1(sql, params) {
  const r = await req("POST", `/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${USERS_DB}/query`, { sql, params });
  if (!r.json || !r.json.success) throw new Error("D1 query failed: " + JSON.stringify((r.json && r.json.errors) || r.raw || "").slice(0, 300) + " SQL: " + sql.slice(0, 80));
  return r.json.result;
}

(async () => {
  const prefs = await kvGet("user_prefs_v1");
  const users = await kvGet("telegram_users_v6");
  const profiles = await kvGet("user_profiles_v1");
  console.log(`KV snapshot: ${Object.keys(prefs).length} prefs, ${users.length} registered chats, ${Object.keys(profiles).length} profiles`);

  const now = new Date().toISOString();
  let n = 0;
  for (const [id, p] of Object.entries(prefs)) {
    await d1(
      "INSERT INTO user_prefs (chat_id, teams, tz, lang, updated_at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(chat_id) DO UPDATE SET teams=excluded.teams, tz=excluded.tz, lang=excluded.lang, updated_at=excluded.updated_at",
      [Number(id), Array.isArray(p.teams) ? JSON.stringify(p.teams) : null, p.tz || null, p.lang || null, now]
    );
    n++;
  }
  console.log(`user_prefs: ${n} rows`);
  n = 0;
  for (const id of users) {
    await d1("INSERT OR IGNORE INTO chats (chat_id, joined_at) VALUES (?1, ?2)", [Number(id), (profiles[String(id)] && profiles[String(id)].joined) || now]);
    n++;
  }
  console.log(`chats: ${n} rows`);
  n = 0;
  for (const [id, p] of Object.entries(profiles)) {
    await d1(
      "INSERT INTO chat_profiles (chat_id, username, first_name, title, joined, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT(chat_id) DO UPDATE SET username=excluded.username, first_name=excluded.first_name, title=excluded.title, joined=excluded.joined, updated_at=excluded.updated_at",
      [Number(id), p.username || null, p.first_name || null, p.title || null, p.joined || null, now]
    );
    n++;
  }
  console.log(`chat_profiles: ${n} rows`);
  await d1("INSERT INTO userstore_meta (k, v) VALUES ('migrated_at', ?1) ON CONFLICT(k) DO UPDATE SET v=excluded.v", [now]);
  console.log("userstore_meta: migrated_at set — empty D1 now means empty (no stale-KV resurrection)");
  console.log("✅ backfill complete");
})().catch((e) => { console.error("❌ " + e.message); process.exit(1); });
