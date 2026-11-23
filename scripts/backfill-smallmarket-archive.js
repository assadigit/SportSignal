#!/usr/bin/env node
// scripts/backfill-smallmarket-archive.js
// v13.279-gsc404 (OPTIONAL owner decision — the one-time backfill): restores
// the already-pruned small-market FINISHED matches from football-data.org
// historical results into the 365-day seo_archive_v1 (blob + per-match keys),
// so those URLs serve 200 immediately instead of draining as 404/410 over
// ~45 days. The GSC 2026-11-23 export's small-market 404 class (~138 URLs,
// ~1,400 impressions across ~146 pages in Oct 12–Nov 13) is exactly the
// matches the big-gate never archived.
//
// SCOPE (honest, bounded — one-time maintenance fetch, ~13 API calls):
//   - FD free-tier competitions the site ever tracked: PL, PD, SA, FL1, BL1,
//     CL, ELC, DED, PPL (+ EL/ECL/CDR/DFB_POKAL probed; restricted comps are
//     reported, never guessed).
//   - ALL FINISHED matches in 2026-10-05 → 2026-11-16 (the GSC growth
//     window). The pool's tracked universe is BROADER than the followed
//     clubs — the sportscore/TSP day sweeps bring whole competition matchdays
//     (verified from the live pool: PL 80 rows of which 45 non-followed;
//     CL 36/23; ELC/DED/PGL/CDR/DFB_POKAL all non-followed), and every pool
//     row served a 200 indexable match page — THAT is the small-market 404
//     class the big-gate never archived.
//   - NOT covered (documented residual, drains as 410 under Option B):
//     PGL rows (sportscore-sourced — a follow-up script could backfill via
//     the sportscore day API), national-team comps (AFCON_Q/UEFA_NL/
//     CONCACAF_NL/INTL_FR/BSA) and any FD-restricted competition.
//   - Name-variance caveat: GSC URLs minted from a provider name whose FD
//     form slugs differently will not match the backfilled row (residual
//     410) — the P1 map + P4 fold address the known cases.
//   - Idempotent: rows keyed by FD id|utcDate and by slug; re-runs no-op.
//
// Usage:
//   node scripts/backfill-smallmarket-archive.js             # dry-run
//   node scripts/backfill-smallmarket-archive.js --write     # WRITE to KV
// Credentials (env, never committed/logged): FOOTBALL_DATA_TOKEN,
// CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID.
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

const KV_BLOB_KEY = "seo_archive_v1";
const KEY_PREFIX = "seo_archive_v1/m/";
const API = "https://api.cloudflare.com/client/v4";
const FD = "https://api.football-data.org/v4";
const DATE_FROM = "2026-10-05";
const DATE_TO = "2026-11-16";
const CODES = ["PL", "PD", "SA", "FL1", "BL1", "CL", "ELC", "DED", "PPL", "EL", "ECL", "CDR", "DFB_POKAL"];

function die(msg, code) { console.error("ERROR: " + msg); process.exit(code || 2); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function namespaceId() {
  const toml = fs.readFileSync(path.join(ROOT, "wrangler.toml"), "utf8");
  const m = /binding\s*=\s*"STATE"[\s\S]*?id\s*=\s*"([0-9a-f]{32})"/.exec(toml) ||
            /id\s*=\s*"([0-9a-f]{32})"[\s\S]*?binding\s*=\s*"STATE"/.exec(toml);
  if (!m) die("could not parse the STATE namespace id from wrangler.toml");
  return m[1];
}
function auth() {
  const t = process.env.CLOUDFLARE_API_TOKEN, a = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!t || !a) die("CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID must be set in the environment");
  return { token: t, account: a };
}
async function kvGetText(ns, key) {
  const { token, account } = auth();
  const res = await fetch(`${API}/accounts/${account}/storage/kv/namespaces/${ns}/values/${encodeURIComponent(key)}`, { headers: { "Authorization": "Bearer " + token } });
  if (res.status === 404) return null;
  if (!res.ok) die("KV read failed (" + key + "): HTTP " + res.status);
  return await res.text();
}
async function kvPut(ns, key, value, ttlDays) {
  const { token, account } = auth();
  const exp = Math.floor(Date.now() / 1000) + Math.floor(ttlDays * 86400);
  const res = await fetch(`${API}/accounts/${account}/storage/kv/namespaces/${ns}/values/${encodeURIComponent(key)}?expiration=${exp}`, {
    method: "PUT", headers: { "Authorization": "Bearer " + token, "Content-Type": "text/plain" }, body: value
  });
  if (!res.ok) die("KV write failed (" + key + "): HTTP " + res.status + " " + (await res.text()).slice(0, 200));
}

async function fdMatches(code, fdToken) {
  const url = `${FD}/competitions/${code}/matches?dateFrom=${DATE_FROM}&dateTo=${DATE_TO}`;
  const res = await fetch(url, { headers: { "X-Auth-Token": fdToken } });
  const body = await res.text();
  if (!res.ok) { console.log("  " + code + ": not accessible on this FD tier (HTTP " + res.status + ") — documented residual"); return null; }
  const j = JSON.parse(body);
  return (j && j.matches) || [];
}

// The name→faName + code→faName dictionaries built from the site's OWN data
// (the live archive blob + the live pool backup-rows carry the served
// faNames). Unmatched names fall back to null → the page shows the Latin
// name (the honest faName(m) fallback — never an invented name).
function buildFaDictionaries(blobRows) {
  const teams = new Map(), comps = new Map();
  const eat = (m) => {
    if (!m) return;
    for (const side of ["homeTeam", "awayTeam"]) {
      const t = m[side];
      if (t && t.name && t.faName && !teams.has(t.name)) teams.set(t.name, t.faName);
    }
    if (m.competition && m.competition.code && m.competition.faName && !comps.has(m.competition.code)) {
      comps.set(m.competition.code, m.competition.faName);
    }
  };
  for (const r of blobRows) eat(r && r.m);
  const pool = path.join(ROOT, "..", "backups", "pool-fa.json");
  void pool; // (pool faNames come from the live pool read below)
  return { teams, comps };
}

async function main() {
  const write = process.argv.includes("--write");
  const fdToken = process.env.FOOTBALL_DATA_TOKEN;
  if (!fdToken && write) die("FOOTBALL_DATA_TOKEN must be set in the environment");
  const ns = namespaceId();
  const { teamSlug, matchPath } = require(path.join(ROOT, "src", "slugs.ts"));
  const { CONFIG } = require(path.join(ROOT, "src", "config.ts"));

  // the followed universe (the site's own tracking config)
  const followed = new Set();
  for (const lg of Object.keys(CONFIG.BIG_TEAMS_BY_LEAGUE || {})) {
    for (const t of (CONFIG.BIG_TEAMS_BY_LEAGUE[lg] || [])) followed.add(t);
  }
  console.log("followed clubs: " + followed.size);

  // read the live blob (+ the live pool rows for faNames — one bounded read)
  const raw = await kvGetText(ns, KV_BLOB_KEY);
  if (!raw) die("seo_archive_v1 unreadable — refusing to run");
  const blob = JSON.parse(raw);
  const poolRaw = await kvGetText(ns, "matches_v13_tracked");
  const poolRows = poolRaw ? (JSON.parse(poolRaw).matches || []) : [];
  const { teams: faTeams, comps: faComps } = buildFaDictionaries(blob.matches.concat(poolRows.map((m) => ({ homeTeam: m.homeTeam, awayTeam: m.awayTeam, competition: m.competition }))));

  const existingRowKeys = new Set(blob.matches.map((r) => String((r && r.m && r.m.id) || "") + "|" + (r && r.m && r.m.utcDate)));
  const existingSlugs = new Set(blob.matches.map((r) => {
    const m = r && r.m;
    return m && m.homeTeam ? matchPath(m.homeTeam.name, m.awayTeam.name, m.utcDate).replace(/^\/matches\//, "") : "";
  }).filter(Boolean));

  const candidates = [];
  for (const code of CODES) {
    if (!fdToken) { console.log("  " + code + ": skipped (no FOOTBALL_DATA_TOKEN — dry-run without FD)"); continue; }
    const matches = await fdMatches(code, fdToken);
    if (!matches) continue;
    let kept = 0;
    for (const m of matches) {
      if (m.status !== "FINISHED") continue;
      const h = m.homeTeam && m.homeTeam.name, a = m.awayTeam && m.awayTeam.name;
      if (!h || !a) continue;
      // ALL finished matches in the tracked competition's window — the
      // pool's day sweeps carried these same matchdays (the site's own
      // tracked universe), and each served a 200 indexable page while
      // in-pool; the archive restores exactly what Google saw.
      const ft = m.score && m.score.fullTime || {};
      const row = {
        id: m.id,
        homeTeam: { name: h, faName: faTeams.get(h) || null, crest: (m.homeTeam && m.homeTeam.crest) || null },
        awayTeam: { name: a, faName: faTeams.get(a) || null, crest: (m.awayTeam && m.awayTeam.crest) || null },
        utcDate: m.utcDate,
        competition: { code, faName: faComps.get(code) || null, emblem: "https://crests.football-data.org/" + code + ".png" },
        status: "FINISHED",
        round: null, roundFa: null,
        minute: null, scorers: [],
        big: false, derby: false, rivalry: null, rivalryFa: null,
        venue: null, venueFa: null,
        score: { home: ft.home != null ? ft.home : null, away: ft.away != null ? ft.away : null }
      };
      if (row.score.home == null) row.score = null;
      const slug = matchPath(h, a, m.utcDate).replace(/^\/matches\//, "");
      if (existingRowKeys.has(String(m.id) + "|" + m.utcDate) || existingSlugs.has(slug)) continue;
      existingSlugs.add(slug);
      candidates.push({ slug, row });
      kept++;
    }
    console.log("  " + code + ": " + matches.length + " matches in window, " + kept + " new tracked-club rows");
    await sleep(8000); // the FD free-tier pace (10 req/min)
  }

  console.log("== backfill-smallmarket-archive == mode: " + (write ? "WRITE" : "DRY-RUN"));
  console.log("blob rows: " + blob.matches.length + " | backfill candidates: " + candidates.length);
  for (const c of candidates.slice(0, 10)) console.log("  e.g. " + c.slug);
  if (candidates.length > 10) console.log("  … +" + (candidates.length - 10) + " more");
  if (!candidates.length) { console.log("Nothing to do (idempotent)."); return; }

  if (!write) { console.log("DRY-RUN complete — re-run with --write to apply."); return; }
  const fin = new Date().toISOString();
  const nextBlob = JSON.stringify({ matches: blob.matches.concat(candidates.map((c) => ({ m: c.row, fin }))) });
  await kvPut(ns, KV_BLOB_KEY, nextBlob, 400);
  console.log("wrote blob: " + blob.matches.length + " → " + (blob.matches.length + candidates.length) + " rows (" + nextBlob.length + " bytes, 400d ttl)");
  let n = 0;
  for (const c of candidates) {
    await sleep(1100); // KV free-tier write pace (~1/s) — one-time, bounded
    await kvPut(ns, KEY_PREFIX + c.slug, JSON.stringify({ m: c.row, fin }), 370);
    n++;
    if (n % 25 === 0) console.log("  " + n + "/" + candidates.length + " keys written…");
  }
  console.log("DONE: " + candidates.length + " rows + keys. PGL/EL/ECL/cups/national-team residuals remain (documented) — they serve 410 under Option B.");
}

main().catch((e) => die(e && e.message ? e.message : String(e)));
