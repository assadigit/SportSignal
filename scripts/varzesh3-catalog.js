// v12.18: builds the varzesh3.com Persian club-name catalog (the user's
// pointer: https://www.varzesh3.com/leagues — the reference Iranian sports
// media). varzesh3 league pages are SERVER-RENDERED, so this script (run
// locally — no Worker subrequest cost, no sports-API budget) scrapes the
// standings tables of the leagues we cover and pushes the catalog into the
// Worker's STATE KV namespace via the Cloudflare API.
//
//   node scripts/varzesh3-catalog.js           # scrape + push to KV
//   node scripts/varzesh3-catalog.js --dry     # scrape only, print summary
//
// The AI learner (runFaAiLearner) reads KV varzesh3_clubs_v1 as GROUNDING:
// candidate names ride in the translation prompt and accepted answers snap
// to varzesh3's exact spelling. Re-run whenever rosters change (windows,
// transfers) — a stale catalog only affects grounding freshness, nothing
// breaks.
"use strict";
const fs = require("fs");

const LEAGUES = [
  { id: 25, slug: "لیگ-قهرمانان-اروپا", code: "CL" },
  { id: 3, slug: "لیگ-برتر-انگلیس", code: "PL" },
  { id: 2, slug: "لالیگا-اسپانیا", code: "PD" },
  { id: 4, slug: "سری-آ-ایتالیا", code: "SA" },
  { id: 1, slug: "بوندسلیگا-آلمان", code: "BL1" },
  { id: 5, slug: "لیگ-یک-فرانسه", code: "FL1" },
  { id: 6, slug: "لیگ-برتر-ایران", code: "PGL" },
  { id: 29, slug: "لیگ-اروپا", code: "EL" },
  { id: 67, slug: "لیگ-کنفرانس-اروپا", code: "ECL" }
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

function extractTeams(html) {
  // Standings rows: <a ... href="/football/team/<id>/<fa-slug>"> ... <span ...>NAME</span>
  const out = [];
  const re = /<a\b[^>]*href="\/football\/team\/(\d+)\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const span = /<span[^>]*>([^<]+)<\/span>/.exec(m[3]);
    const name = span ? span[1].trim() : decodeURIComponent(m[2]).replace(/-/g, " ").trim();
    if (name && /[\u0600-\u06FF]/.test(name) && name.length <= 40) {
      out.push({ id: m[1], n: name });
    }
  }
  return out;
}

async function main() {
  const dry = process.argv.includes("--dry");
  const clubs = [];
  const seen = new Set();
  for (const lg of LEAGUES) {
    const url = "https://www.varzesh3.com/football/league/" + lg.id + "/" + encodeURIComponent(lg.slug);
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "fa-IR,fa;q=0.9" } });
      if (!res.ok) { console.error(`✗ ${lg.code}: HTTP ${res.status}`); continue; }
      const html = await res.text();
      const teams = extractTeams(html);
      let added = 0;
      for (const t of teams) {
        const key = lg.code + "|" + t.id;
        if (seen.has(key)) continue;
        seen.add(key);
        clubs.push({ c: lg.code, n: t.n, v3id: t.id });
        added++;
      }
      console.log(`✓ ${lg.code} (${lg.slug}): ${teams.length} teams, ${added} new`);
    } catch (e) {
      console.error(`✗ ${lg.code}: ${e.message}`);
    }
  }
  const catalog = { v: 1, source: "varzesh3.com/leagues", fetchedAt: new Date().toISOString(), count: clubs.length, clubs };
  console.log(`\nCatalog: ${clubs.length} clubs across ${LEAGUES.length} leagues`);
  const sample = clubs.slice(0, 8).map((c) => c.c + ":" + c.n).join(" · ");
  console.log("Sample:", sample);
  if (dry) { console.log("(dry run — KV not written)"); return; }
  // Push to the Worker's STATE KV namespace via the Cloudflare API.
  const env = {};
  for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
    const mm = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (mm) env[mm[1]] = mm[2];
  }
  const token = env.CLOUDFLARE_API_TOKEN, acct = env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !acct) { console.error("✗ .env missing CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID"); process.exit(1); }
  const ns = "432ecae8fb8c4146b6b01b91eb8f4b2a"; // STATE (ucl-notifier)
  const body = JSON.stringify(catalog);
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/storage/kv/namespaces/${ns}/values/varzesh3_clubs_v1`, {
    method: "PUT",
    headers: { "Authorization": "Bearer " + token, "Content-Type": "text/plain" },
    body
  });
  const j = await res.json().catch(() => ({}));
  if (res.ok && j.success) {
    console.log(`✅ KV varzesh3_clubs_v1 written (${body.length} bytes, ${clubs.length} clubs)`);
  } else {
    console.error("✗ KV write failed: HTTP " + res.status + " " + JSON.stringify(j).slice(0, 200));
    process.exit(1);
  }
}
main().catch((e) => { console.error("FATAL: " + e.message); process.exit(1); });
