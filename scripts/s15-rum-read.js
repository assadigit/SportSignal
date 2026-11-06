// S15 one-off: the RUM multi-day read (CF GraphQL). Same method as
// S7–S14 (scripts/s14-rum-read.js): rumWebVitalsEventsAdaptiveGroups +
// rumPageloadEventsAdaptiveGroups, site tag 08a51fd889514c818e0161066160e5b3,
// grouped by date x bot x deviceType, window 2026-10-31..open + the recency
// probe. S15 ran ~17:0x–17:3x UTC on 2026-11-06 (the audit session, before
// the 00:00Z day roll): its question is the 11-06 ACCRUAL CONTINUES vs the
// S14 15:42 read (WV bot/desktop n=41 LCPp75 692ms + human/mobile n=1
// LCPp75 1,964ms — the first post-fix human sample; PL human/mobile n=39 +
// human/desktop n=1 + bot/desktop n=4 = 44 visits), with the 11-07 TRUE
// multi-day confirm EXPLICITLY NOT claimable this session (the UTC day had
// not rolled — S16's read confirms it; empty-until-00:00Z is expected, not
// a stall).
// Day-probes: 2026-11-06 (accrual-continues vs the S14 15:42 read) +
// 2026-11-07 (the first true multi-day accrual day — expected 0/0 this
// side of the 00:00Z roll; the S16 confirm marker).
// Writes docs/history/2026-11-06-s15-rum-raw.json + prints the human table.
// Token comes from the CF_API_TOKEN env var (never committed).
"use strict";
const fs = require("fs");

const TOKEN = process.env.CF_API_TOKEN;
if (!TOKEN) { console.error("CF_API_TOKEN env required"); process.exit(1); }
const SITE_TAG = "08a51fd889514c818e0161066160e5b3";
const ACCOUNT_TAG = "a796fdfe71819812119b8a494d3d39c1";
const OUT = "docs/history/2026-11-06-s15-rum-raw.json";

const q = (dataset, extraFilter, dayBounds) => `
query {
  viewer {
    accounts(filter: { accountTag: "${ACCOUNT_TAG}" }) {
      ${dataset}(limit: 100, filter: {
        siteTag: "${SITE_TAG}"
        date_geq: "${dayBounds ? dayBounds[0] : "2026-10-31"}"
        date_leq: "${dayBounds ? dayBounds[1] : "2026-11-12"}"
        ${extraFilter || ""}
      }, orderBy: [date_ASC]) {
        dimensions { date bot deviceType }
        count
        ${dataset === "rumWebVitalsEventsAdaptiveGroups"
          ? "quantiles { largestContentfulPaintP50 largestContentfulPaintP75 interactionToNextPaintP75 cumulativeLayoutShiftP75 timeToFirstByteP50 }"
          : "sum { visits }"}
      }
    }
  }
}`;

async function pull(name, extraFilter, dayBounds) {
  const r = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + TOKEN },
    body: JSON.stringify({ query: q(name, extraFilter, dayBounds) }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(name + ": " + JSON.stringify(j.errors).slice(0, 300));
  const acc = j.data.viewer.accounts[0];
  return acc ? acc[name] : [];
}

(async () => {
  const pulledUtc = new Date().toISOString();
  const day = pulledUtc.slice(0, 10);
  const webVitals = await pull("rumWebVitalsEventsAdaptiveGroups");
  const pageloads = await pull("rumPageloadEventsAdaptiveGroups");
  const recencyFilter = 'datetimeHour_geq: "' + day + 'T00:00:00Z"';
  const wvRecency = await pull("rumWebVitalsEventsAdaptiveGroups", recencyFilter);
  const plRecency = await pull("rumPageloadEventsAdaptiveGroups", recencyFilter);
  // S15 day-probes — 2026-11-06 (accrual-continues vs the S14 15:42 UTC
  // read: WV bot/desktop n=41 LCPp75 692ms + human/mobile n=1 LCPp75
  // 1,964ms; PL human/mobile n=39 + human/desktop n=1 + bot/desktop n=4 =
  // 44 visits) and 2026-11-07 (expected 0/0 this side of the 00:00Z roll —
  // the S16 confirm marker, NOT a stall).
  const wvD06 = await pull("rumWebVitalsEventsAdaptiveGroups", null, ["2026-11-06", "2026-11-06"]);
  const plD06 = await pull("rumPageloadEventsAdaptiveGroups", null, ["2026-11-06", "2026-11-06"]);
  const wvD07 = await pull("rumWebVitalsEventsAdaptiveGroups", null, ["2026-11-07", "2026-11-07"]);
  const plD07 = await pull("rumPageloadEventsAdaptiveGroups", null, ["2026-11-07", "2026-11-07"]);

  const raw = {
    _s15_rum_pull: {
      session: "S15 (docs/history/2026-11-06-s15-*.md)",
      pulled_utc: pulledUtc,
      method: "CF GraphQL rumWebVitalsEventsAdaptiveGroups + rumPageloadEventsAdaptiveGroups, site tag " + SITE_TAG + ", grouped by date x bot x deviceType, window 2026-10-31..2026-11-12",
      purpose: "the send.to fix's accrual read BEFORE the 00:00Z roll — confirm 11-06 keeps accruing on BOTH datasets vs the S14 15:42 read; the 11-07 TRUE multi-day confirm is S16's (this session cannot honestly claim it — the UTC day had not rolled)",
      recency_check: "separate datetimeHour_geq=" + day + "T00:00:00Z pull on BOTH datasets returned " + wvRecency.length + " + " + plRecency.length + " groups",
      day_probe_2026_11_06: "WV " + wvD06.length + " / PL " + plD06.length + " groups (S14 read the same day at 15:42 UTC: WV bot/desktop n=41 LCPp75 692ms + human/mobile n=1 LCPp75 1,964ms; PL human/mobile n=39 + human/desktop n=1 + bot/desktop n=4 = 44 visits)",
      day_probe_2026_11_07: "WV " + wvD07.length + " / PL " + plD07.length + " groups (expected 0/0 before the 00:00Z roll — the S16 confirm marker, not a stall)",
    },
    webVitals, pageloads, wvRecency, plRecency,
    dayProbes: { "2026-11-06": { webVitals: wvD06, pageloads: plD06 }, "2026-11-07": { webVitals: wvD07, pageloads: plD07 } },
  };
  fs.writeFileSync(OUT, JSON.stringify(raw, null, 2));

  // the human table (bot == false) — the LCP p75 re-quote rides this
  console.log("== human web-vitals by day (LCP p75 µs / INP p75 µs) ==");
  const rows = webVitals.filter((g) => !g.dimensions.bot);
  for (const g of rows) {
    const qd = g.quantiles || {};
    console.log(g.dimensions.date, g.dimensions.deviceType, "n=" + g.count,
      "LCPp75=" + qd.largestContentfulPaintP75, "INPp75=" + qd.interactionToNextPaintP75,
      "CLSp75=" + qd.cumulativeLayoutShiftP75, "TTFBp50=" + qd.timeToFirstByteP50);
  }
  console.log("== latest windows ==");
  console.log("webVitals groups:", webVitals.length, "| pageloads groups:", pageloads.length,
    "| recency (day " + day + "): WV " + wvRecency.length + " / PL " + plRecency.length);
  // the per-day accrual summary — BOTH datasets, every day in the window
  console.log("== per-day accrual (both datasets, all groups) ==");
  const byDay = {};
  for (const g of [...webVitals, ...pageloads]) {
    const d = g.dimensions.date;
    byDay[d] = byDay[d] || { wv: 0, pl: 0, wvN: 0, plN: 0 };
    if ("quantiles" in g) { byDay[d].wv++; byDay[d].wvN += g.count; }
    else { byDay[d].pl++; byDay[d].plN += (g.sum && g.sum.visits) || 0; }
  }
  for (const d of Object.keys(byDay).sort()) {
    console.log(d, "WV groups=" + byDay[d].wv + " (n=" + byDay[d].wvN + ") | PL groups=" + byDay[d].pl + " (visits=" + byDay[d].plN + ")");
  }
  console.log("== day probes ==");
  for (const [d, pr] of Object.entries(raw.dayProbes)) {
    const hum = (pr.webVitals || []).filter((g) => !g.dimensions.bot);
    for (const g of hum) {
      const qd = g.quantiles || {};
      console.log(d, "human", g.dimensions.deviceType, "n=" + g.count, "LCPp75=" + qd.largestContentfulPaintP75, "INPp75=" + qd.interactionToNextPaintP75);
    }
    const bots = (pr.webVitals || []).filter((g) => g.dimensions.bot);
    for (const g of bots) {
      const qd = g.quantiles || {};
      console.log(d, "bot", g.dimensions.deviceType, "n=" + g.count, "LCPp75=" + qd.largestContentfulPaintP75);
    }
    for (const g of pr.pageloads || []) {
      console.log(d, "PL", g.dimensions.bot ? "bot" : "human", g.dimensions.deviceType, "visits=" + ((g.sum && g.sum.visits) || g.count));
    }
    console.log(d, "groups: WV " + (pr.webVitals || []).length + " / PL " + (pr.pageloads || []).length);
  }
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
