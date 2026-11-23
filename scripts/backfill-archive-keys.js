#!/usr/bin/env node
// scripts/backfill-archive-keys.js
// v13.279-gsc404 (P2-B/P6 bootstrap): one-time seed of the per-match KV
// keys (seo_archive_v1/m/{slug}) for the rows ALREADY in the seo_archive_v1
// blob. The runtime writes keys for rows it ADDS from now on; the pre-existing
// 180 rows predate the mechanism, and without their keys the pool-miss lite
// path would keep parsing the whole multi-MB blob (the 10ms CPU cliff the
// per-match keys exist to avoid). Earliest-kickoff row wins each slug
// (findArchivedMatchBySlug parity — the runtime's own earliestRecBySlug rule).
//
// Usage:
//   node scripts/backfill-archive-keys.js            # dry-run
//   node scripts/backfill-archive-keys.js --write    # WRITE to production KV
// Credentials: CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID in the env
// (never committed, never logged). Idempotent (key-list diff).
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

const KV_BLOB_KEY = "seo_archive_v1";
const KEY_PREFIX = "seo_archive_v1/m/";
const API = "https://api.cloudflare.com/client/v4";
const TTL_DAYS = 370;

function die(msg, code) { console.error("ERROR: " + msg); process.exit(code || 2); }

function namespaceId() {
  const toml = fs.readFileSync(path.join(ROOT, "wrangler.toml"), "utf8");
  const m = /binding\s*=\s*"STATE"[\s\S]*?id\s*=\s*"([0-9a-f]{32})"/.exec(toml) ||
            /id\s*=\s*"([0-9a-f]{32})"[\s\S]*?binding\s*=\s*"STATE"/.exec(toml);
  if (!m) die("could not parse the STATE namespace id from wrangler.toml");
  return m[1];
}

function auth() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !account) die("CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID must be set in the environment");
  return { token, account };
}

async function kvGetText(ns, key) {
  const { token, account } = auth();
  const res = await fetch(`${API}/accounts/${account}/storage/kv/namespaces/${ns}/values/${encodeURIComponent(key)}`, {
    headers: { "Authorization": "Bearer " + token }
  });
  if (res.status === 404) return null;
  if (!res.ok) die("KV read failed (" + key + "): HTTP " + res.status);
  return await res.text();
}

async function kvListPrefix(ns, prefix) {
  const { token, account } = auth();
  const out = [];
  let cursor = "";
  do {
    const url = `${API}/accounts/${account}/storage/kv/namespaces/${ns}/keys?limit=1000&prefix=${encodeURIComponent(prefix)}` + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");
    const res = await fetch(url, { headers: { "Authorization": "Bearer " + token } });
    if (!res.ok) die("KV key list failed: HTTP " + res.status + " " + (await res.text()).slice(0, 200));
    const j = await res.json();
    for (const k of j.result || []) out.push(k.name);
    cursor = j.result_info && j.result_info.cursor || "";
  } while (cursor);
  return out;
}

async function kvPut(ns, key, value) {
  const { token, account } = auth();
  const exp = Math.floor(Date.now() / 1000) + TTL_DAYS * 86400;
  const res = await fetch(`${API}/accounts/${account}/storage/kv/namespaces/${ns}/values/${encodeURIComponent(key)}?expiration=${exp}`, {
    method: "PUT",
    headers: { "Authorization": "Bearer " + token, "Content-Type": "text/plain" },
    body: value
  });
  if (!res.ok) die("KV write failed (" + key + "): HTTP " + res.status + " " + (await res.text()).slice(0, 200));
}

async function main() {
  const write = process.argv.includes("--write");
  const ns = namespaceId();
  const { matchPath } = require(path.join(ROOT, "src", "slugs.ts"));

  const raw = await kvGetText(ns, KV_BLOB_KEY);
  if (!raw) die("seo_archive_v1 is unreadable/empty — refusing to run against a dead archive");
  const blob = JSON.parse(raw);
  const recs = blob.matches || [];
  console.log("== backfill-archive-keys == mode: " + (write ? "WRITE" : "DRY-RUN") + " | blob rows: " + recs.length);

  // earliest-kickoff row per slug (the runtime's earliestRecBySlug rule)
  const bySlug = new Map();
  for (const r of recs) {
    const m = r && r.m;
    if (!m || !m.utcDate || !m.homeTeam || !m.awayTeam) continue;
    const slug = matchPath(m.homeTeam.name, m.awayTeam.name, m.utcDate).replace(/^\/matches\//, "");
    const prev = bySlug.get(slug);
    if (!prev || new Date(m.utcDate).getTime() < new Date(prev.m.utcDate).getTime()) bySlug.set(slug, r);
  }
  console.log("distinct slugs in blob: " + bySlug.size);

  const existing = new Set(await kvListPrefix(ns, KEY_PREFIX));
  const missing = [];
  for (const [slug, rec] of bySlug) {
    if (!existing.has(KEY_PREFIX + slug)) missing.push([slug, rec]);
  }
  console.log("per-match keys present: " + existing.size + " | missing: " + missing.length);
  if (!missing.length) { console.log("Nothing to do (idempotent)."); return; }
  for (const [slug] of missing.slice(0, 8)) console.log("  e.g. " + KEY_PREFIX + slug);
  if (missing.length > 8) console.log("  … +" + (missing.length - 8) + " more");

  if (!write) {
    console.log("DRY-RUN complete — re-run with --write to apply.");
    return;
  }
  let n = 0;
  for (const [slug, rec] of missing) {
    await kvPut(ns, KEY_PREFIX + slug, JSON.stringify(rec));
    n++;
    if (n % 25 === 0) console.log("  " + n + "/" + missing.length + " keys written…");
  }
  console.log("DONE: " + n + " per-match keys written (TTL " + TTL_DAYS + "d). The lite pool-miss path now reads ~1 KB keys for every archived URL.");
}

main().catch((e) => die(e && e.message ? e.message : String(e)));
