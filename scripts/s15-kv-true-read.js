// S15 gift to the watch: the TRUE KV burn read (CF GraphQL
// kvOperationsAdaptiveGroups — account analytics, NOT the app meters).
// Why this exists (S15, 2026-11-06 ~17:1x-17:4x UTC): the S14 KV-meter
// regression finding under-counted confidence — the app's folded counters
// (cron_status_v1.kv_writes_day + kv_writes_web_v1 + healthz) had drifted
// ~120 below the account-level truth, and every burn statement since S9
// ("the 820 Europa-Thursday record", "the 1,000/day free-tier wall") rode
// those meters. This script reads the REAL operation counts from account
// analytics: writes/reads/deletes/lists per day, today's writes by hour
// (the regression window is visible here), and the status-code breakdown
// (the wall question: 10-31 wrote 1,261 × 200 — the 1,000/day write wall
// was NOT enforced; 11-05 read 108,639 × 200/404 — the 100k/day read wall
// was NOT enforced either; the only non-200 write class is a persistent
// ~50-60/day × 400 clustering 09:00-12:00Z, pre-existing, unexplained —
// a request-format failure, NOT a quota rejection).
// Method: POST https://api.cloudflare.com/client/v4/graphql, dataset
// kvOperationsAdaptiveGroups, dimensions {date, datetimeHour, actionType,
// responseStatusCode}, account tag a796fdfe71819812119b8a494d3d39c1, the
// one namespace c63588df02ae4bf1bfdc18d19c5b3631 (dimensions carry it
// when grouped; the account has only this namespace).
// Run: CF_API_TOKEN=<token> node scripts/s15-kv-true-read.js [YYYY-MM-DD]
//   (default day = today UTC; the 7-day history always prints)
// Writes docs/history/<date>-s15-kv-true-raw.json + prints the digest.
// Token comes from the CF_API_TOKEN env var (never committed).
"use strict";
const fs = require("fs");

const TOKEN = process.env.CF_API_TOKEN;
if (!TOKEN) { console.error("CF_API_TOKEN env required"); process.exit(1); }
const ACCOUNT_TAG = "a796fdfe71819812119b8a494d3d39c1";
const day = process.argv[2] || new Date().toISOString().slice(0, 10);
const OUT = "docs/history/" + day + "-s15-kv-true-raw.json";

const q = (dims, filter) => `
query {
  viewer {
    accounts(filter: { accountTag: "${ACCOUNT_TAG}" }) {
      kvOperationsAdaptiveGroups(limit: 200, filter: {
        date_geq: "${filter.since}" date_leq: "${filter.until}"
        ${filter.action ? 'actionType: "' + filter.action + '"' : ""}
        ${filter.status ? "responseStatusCode: " + filter.status : ""}
      }, orderBy: [${filter.orderBy || "date_ASC"}]) {
        dimensions { ${dims.join(" ")} }
        count
      }
    }
  }
}`;

async function pull(name, dims, filter) {
  const r = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + TOKEN },
    body: JSON.stringify({ query: q(dims, filter) }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(name + ": " + JSON.stringify(j.errors).slice(0, 300));
  const acc = j.data.viewer.accounts[0];
  return acc ? acc.kvOperationsAdaptiveGroups : [];
}

(async () => {
  const pulledUtc = new Date().toISOString();
  // 7-day window ending on the focus day
  const since = new Date(Date.parse(day) - 6 * 864e5).toISOString().slice(0, 10);
  const win = { since, until: day };

  const byDayAction = await pull("byDayAction", ["date", "actionType"], { ...win, orderBy: "date_ASC" });
  const byDayStatusW = await pull("byDayStatusW", ["date", "responseStatusCode"], { ...win, action: "write", orderBy: "date_ASC" });
  const byDayStatusR = await pull("byDayStatusR", ["date", "responseStatusCode"], { ...win, action: "read", orderBy: "date_ASC" });
  const dayHourW = await pull("dayHourW", ["datetimeHour"], { since: day, until: day, action: "write", orderBy: "datetimeHour_ASC" });
  const dayHourR = await pull("dayHourR", ["datetimeHour"], { since: day, until: day, action: "read", orderBy: "datetimeHour_ASC" });
  const dayAction = await pull("dayAction", ["actionType"], { since: day, until: day, orderBy: "actionType_ASC" });

  const raw = {
    _s15_kv_true_pull: {
      session: "S15 (docs/history/2026-11-06-s15-audit.md)",
      pulled_utc: pulledUtc,
      method: "CF GraphQL kvOperationsAdaptiveGroups, account " + ACCOUNT_TAG + ", namespace c63588df02ae4bf1bfdc18d19c5b3631, window " + since + ".." + day,
      purpose: "the TRUE KV burn (account analytics) — the app meters under-count (S14 regression + bot-path writes they never counted); compare dayAction totals vs healthz combined at the same minute for the gap",
      note: "the wall question: no 429/rejection class has EVER appeared in this dataset — writes 679-1,315/day over the 10-31..11-06 week all 200/400; the ~50-60/day 400-write class (09-12Z cluster) is a format failure, not quota",
    },
    byDayAction, byDayStatusW, byDayStatusR, dayHourW, dayHourR, dayAction,
  };
  fs.writeFileSync(OUT, JSON.stringify(raw, null, 2));

  console.log("== per-day operations by action (7d) ==");
  const byDay = {};
  for (const r of byDayAction) {
    byDay[r.dimensions.date] = byDay[r.dimensions.date] || {};
    byDay[r.dimensions.date][r.dimensions.actionType] = r.count;
  }
  for (const d of Object.keys(byDay).sort()) {
    const a = byDay[d];
    console.log(d, "writes=" + (a.write || 0), "reads=" + (a.read || 0), "deletes=" + (a.delete || 0), "lists=" + (a.list || 0));
  }
  console.log("== write status codes (7d) ==");
  const wStat = {};
  for (const r of byDayStatusW) wStat[r.dimensions.date + " " + r.dimensions.responseStatusCode] = r.count;
  for (const k of Object.keys(wStat).sort()) console.log(" ", k, wStat[k]);
  console.log("== read status codes (7d) ==");
  const rStat = {};
  for (const r of byDayStatusR) rStat[r.dimensions.date + " " + r.dimensions.responseStatusCode] = r.count;
  for (const k of Object.keys(rStat).sort()) console.log(" ", k, rStat[k]);
  console.log("== " + day + " writes by hour ==");
  for (const r of dayHourW) console.log(" ", r.dimensions.datetimeHour.slice(11, 13) + "h", r.count);
  console.log("== " + day + " reads by hour ==");
  for (const r of dayHourR) console.log(" ", r.dimensions.datetimeHour.slice(11, 13) + "h", r.count);
  console.log("== " + day + " totals ==");
  for (const r of dayAction) console.log(" ", r.dimensions.actionType, r.count);
  console.log("raw -> " + OUT);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
