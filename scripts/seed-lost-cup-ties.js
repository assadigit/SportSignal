#!/usr/bin/env node
// scripts/seed-lost-cup-ties.js
// v13.279-gsc404 (P3 — the lost cup ties): one-time seed of the TWO
// canonical DFB-Pokal 2026-27 Round-2 fixtures into the 365-day
// seo_archive_v1 (blob + per-match keys). The audit's data-loss class:
// bayern-munich-vs-magdeburg-2026-10-27 / bayern-munich-vs-1-magdeburg-
// 2026-10-28 / borussia-dortmund-vs-sv-werder-bremen-2026-10-27 have NO
// pool row, NO archive row, NO twin — the TSP-sourced rows never settled
// FINISHED before the 7-day prune, so under the site's own rules
// (allowlist club in a domestic cup) these pages should exist and don't.
//
// VERIFIED SOURCES (2026-11-23, this session):
//   - Wikipedia "2026–27 DFB-Pokal" (en.wikipedia.org, wikitext football
//     boxes; the DFB datencenter report links are in each box):
//       * Borussia Dortmund 3–2 SV Werder Bremen — 2026-10-27, 20:45 CET
//         (= 19:45 UTC), Signal Iduna Park, Dortmund. Round 2.
//       * Bayern Munich 6–1 1. FC Magdeburg — 2026-10-28, 20:45 CET
//         (= 19:45 UTC), Allianz Arena, Munich. Round 2.
//   - football-data.org free tier carries NO DFB-Pokal (code "DFB" → 403
//     restricted) — Wikipedia + the repo's own archived-row conventions
//     (crests/faNames/venues copied from existing live archive rows) are
//     the sources. Farsi names from src/fa-dict.ts (verified lines 169,
//     171, 193, 245); the Dortmund–Werder LEAGUE fixture 2026-10-09 is
//     already archived — this seed's 2026-10-27 CUP tie must not be
//     confused with it (the slug date differs; asserted below).
//
// Usage:
//   node scripts/seed-lost-cup-ties.js            # dry-run: the plan + checks
//   node scripts/seed-lost-cup-ties.js --write    # WRITE to production KV
//
// Credentials (env, never committed, never logged):
//   CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID — the STATE KV namespace
//   id is parsed from wrangler.toml.
// Idempotent: re-running adds nothing (row keyed by id|utcDate; per-match
// keys only written when missing).
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

const NAMESPACE_SOURCE = path.join(ROOT, "wrangler.toml");
const KV_BLOB_KEY = "seo_archive_v1";
const ARCHIVE_KEY_PREFIX = "seo_archive_v1/m/";
const API = "https://api.cloudflare.com/client/v4";

function die(msg, code) { console.error("ERROR: " + msg); process.exit(code || 2); }

function namespaceId() {
  const toml = fs.readFileSync(NAMESPACE_SOURCE, "utf8");
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

async function kvGet(ns, key) {
  const { token, account } = auth();
  const res = await fetch(`${API}/accounts/${account}/storage/kv/namespaces/${ns}/values/${encodeURIComponent(key)}`, {
    headers: { "Authorization": "Bearer " + token }
  });
  if (res.status === 404) return null;
  if (!res.ok) die("KV read failed (" + key + "): HTTP " + res.status + " " + (await res.text()).slice(0, 200));
  return await res.text();
}

async function kvPut(ns, key, value, ttlDays) {
  const { token, account } = auth();
  let url = `${API}/accounts/${account}/storage/kv/namespaces/${ns}/values/${encodeURIComponent(key)}`;
  if (ttlDays) {
    // absolute epoch-seconds expiration (the KV REST values-put contract)
    const exp = Math.floor(Date.now() / 1000) + Math.floor(ttlDays * 86400);
    url += "?expiration=" + exp;
  }
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Authorization": "Bearer " + token, "Content-Type": "text/plain" },
    body: value
  });
  const body = await res.text();
  if (!res.ok) die("KV write failed (" + key + "): HTTP " + res.status + " " + body.slice(0, 200));
  return true;
}

// The TWO canonical fixtures — pubMatch-shaped rows (the exact field set the
// live archive rows carry; crests/faNames/venues copied from the site's own
// archived rows for the same clubs/stadiums — no invented data).
const SEEDS = [
  {
    m: {
      id: "seed-dfbpokal-2026-10-28-bayern-1-fc-magdeburg",
      homeTeam: { name: "FC Bayern München", faName: "بایرن مونیخ", crest: "https://crests.football-data.org/5.png" },
      awayTeam: { name: "1. FC Magdeburg", faName: "ماگدبورگ", crest: null },
      utcDate: "2026-10-28T19:45:00Z",
      competition: { code: "DFB_POKAL", faName: "جام حذفی آلمان", emblem: "/emblems/dfb_pokal.webp" },
      status: "FINISHED",
      round: "2. Round", roundFa: null,
      minute: null, scorers: [],
      big: false, derby: false, rivalry: null, rivalryFa: null,
      venue: "Allianz Arena", venueFa: "ورزشگاه آلیانز آرنا",
      score: { home: 6, away: 1 }
    },
    expectSlug: "bayern-munich-vs-1-magdeburg-2026-10-28",
    gscForms: ["bayern-munich-vs-magdeburg-2026-10-27", "bayern-munich-vs-1-magdeburg-2026-10-28"]
  },
  {
    m: {
      id: "seed-dfbpokal-2026-10-27-dortmund-sv-werder-bremen",
      homeTeam: { name: "Borussia Dortmund", faName: "دورتموند", crest: "https://crests.football-data.org/4.png" },
      awayTeam: { name: "SV Werder Bremen", faName: "وردر برمن", crest: "https://crests.football-data.org/12.png" },
      utcDate: "2026-10-27T19:45:00Z",
      competition: { code: "DFB_POKAL", faName: "جام حذفی آلمان", emblem: "/emblems/dfb_pokal.webp" },
      status: "FINISHED",
      round: "2. Round", roundFa: null,
      minute: null, scorers: [],
      big: false, derby: false, rivalry: null, rivalryFa: null,
      venue: "Signal Iduna Park", venueFa: "سیگنال ایدونا پارک",
      score: { home: 3, away: 2 }
    },
    expectSlug: "borussia-dortmund-vs-sv-werder-bremen-2026-10-27",
    gscForms: ["borussia-dortmund-vs-sv-werder-bremen-2026-10-27"]
  }
];

async function main() {
  const write = process.argv.includes("--write");
  const ns = namespaceId();
  const { teamSlug, matchPath, LEGACY_URL_REDIRECTS } = require(path.join(ROOT, "src", "slugs.ts"));

  // ---- pre-flight checks (always, even in dry-run) ----
  for (const s of SEEDS) {
    const slug = matchPath(s.m.homeTeam.name, s.m.awayTeam.name, s.m.utcDate).replace(/^\/matches\//, "");
    if (slug !== s.expectSlug) die("canonical slug drifted: computed " + slug + " but expected " + s.expectSlug + " (P1 map/slug fold regression?)");
    const other = matchPath(s.m.awayTeam.name, s.m.homeTeam.name, s.m.utcDate).replace(/^\/matches\//, "");
    if (other === slug) die("degenerate pairing: home/away slugs equal");
    const nonCanonical = s.gscForms.filter((f) => f !== slug && !LEGACY_URL_REDIRECTS["/matches/" + f]);
    if (nonCanonical.length) die("GSC form(s) not covered by the P1 redirect map: " + nonCanonical.join(", "));
    if (s.m.status !== "FINISHED" || s.m.score.home == null) die("seed row must be FINISHED with a final score");
  }
  // the Dortmund–Werder CUP tie must not collide with the archived LEAGUE fixture (2026-10-09)
  const leagueSlug = matchPath("Borussia Dortmund", "SV Werder Bremen", "2026-10-09T18:30:00Z").replace(/^\/matches\//, "");
  if (leagueSlug === SEEDS[1].expectSlug) die("cup tie collides with the archived league fixture slug");

  console.log("== P3 seed: the 2 lost DFB-Pokal Round-2 cup ties ==");
  console.log("namespace: " + ns + " | blob key: " + KV_BLOB_KEY + " | mode: " + (write ? "WRITE" : "DRY-RUN"));

  // ---- read the current blob ----
  const raw = await kvGet(ns, KV_BLOB_KEY);
  if (!raw) die("seo_archive_v1 is unreadable/empty — refusing to seed onto a dead archive (restore from backup first)");
  const blob = JSON.parse(raw);
  if (!blob || !Array.isArray(blob.matches)) die("seo_archive_v1 does not carry a matches[] array — unexpected shape");
  const existingKeys = new Set(blob.matches.map((r) => String((r && r.m && r.m.id) || "") + "|" + (r && r.m && r.m.utcDate)));

  const plan = [];
  for (const s of SEEDS) {
    const rowKey = s.m.id + "|" + s.m.utcDate;
    const exists = existingKeys.has(rowKey);
    const slug = s.expectSlug;
    const key = ARCHIVE_KEY_PREFIX + slug;
    plan.push({ slug, key, exists, row: s.m });
    console.log("- " + slug + (exists ? "  [ALREADY SEEDED — no-op]" : "  [SEED]"));
  }

  const adds = plan.filter((p) => !p.exists);
  if (!adds.length) {
    console.log("Nothing to do: both rows already present (idempotent).");
    return;
  }

  // ---- write ----
  const fin = new Date().toISOString();
  const nextBlob = JSON.stringify({ matches: blob.matches.concat(adds.map((p) => ({ m: p.row, fin }))) });
  console.log("blob: " + blob.matches.length + " → " + (blob.matches.length + adds.length) + " rows (" + nextBlob.length + " bytes)");
  if (!write) {
    console.log("DRY-RUN complete — re-run with --write to apply (requires CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID).");
    return;
  }
  await kvPut(ns, KV_BLOB_KEY, nextBlob, 400);
  console.log("wrote blob (" + nextBlob.length + " bytes, 400d ttl — the runtime's next sweep re-stamps it as usual)");
  for (const p of adds) {
    await kvPut(ns, p.key, JSON.stringify({ m: p.row, fin }), 370);
    console.log("wrote per-match key " + p.key + " (370d ttl, matching the runtime's key writes)");
  }
  console.log("DONE: " + adds.length + " fixture(s) seeded. Verify live: https://sportsignal.ir/matches/" + adds.map((p) => p.slug).join(" , https://sportsignal.ir/matches/"));
}

main().catch((e) => die(e && e.message ? e.message : String(e)));
