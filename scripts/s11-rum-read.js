// S11 one-off: the SS-25 RUM re-read (CF GraphQL). Same method as
// S7–S10 (scripts/s10-rum-read.js): rumWebVitalsEventsAdaptiveGroups +
// rumPageloadEventsAdaptiveGroups, site tag 08a51fd889514c818e0161066160e5b3,
// grouped by date x bot x deviceType, window 2026-10-31..open + the recency
// probe. S11 adds TWO day-probes (2026-11-05 and the pull's own UTC day) —
// the S10 pull (22:46 UTC on 11-05) found ZERO 11-05 groups and the S11
// prompt expects the 11-05/06 events to land this window (ingestion lag
// hypothesis). Writes docs/history/2026-11-06-s11-rum-raw.json + prints the
// human table. Token comes from the CF_API_TOKEN env var (never committed).
"use strict";
const fs = require("fs");

const TOKEN = process.env.CF_API_TOKEN;
if (!TOKEN) { console.error("CF_API_TOKEN env required"); process.exit(1); }
const SITE_TAG = "08a51fd889514c818e0161066160e5b3";
const ACCOUNT_TAG = "a796fdfe71819812119b8a494d3d39c1";
const OUT = "docs/history/2026-11-06-s11-rum-raw.json";

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
  // S11: the explicit day-probes — 2026-11-05 (zero groups at the S10 pull)
  // and the pull's own day, so the note can quote the per-day landing.
  // (dayBounds replaces the base date bounds — never duplicates them.)
  const wvD05 = await pull("rumWebVitalsEventsAdaptiveGroups", null, ["2026-11-05", "2026-11-05"]);
  const plD05 = await pull("rumPageloadEventsAdaptiveGroups", null, ["2026-11-05", "2026-11-05"]);
  const wvD06 = await pull("rumWebVitalsEventsAdaptiveGroups", null, ["2026-11-06", "2026-11-06"]);
  const plD06 = await pull("rumPageloadEventsAdaptiveGroups", null, ["2026-11-06", "2026-11-06"]);

  const raw = {
    _s11_rum_pull: {
      session: "S11 (docs/history/2026-11-06-s11-postwire-verify.md)",
      pulled_utc: pulledUtc,
      method: "CF GraphQL rumWebVitalsEventsAdaptiveGroups + rumPageloadEventsAdaptiveGroups, site tag " + SITE_TAG + ", grouped by date x bot x deviceType, window 2026-10-31..2026-11-12",
      recency_check: "separate datetimeHour_geq=" + day + "T00:00:00Z pull on BOTH datasets returned " + wvRecency.length + " + " + plRecency.length + " groups",
      day_probe_2026_11_05: "WV " + wvD05.length + " / PL " + plD05.length + " groups (S10's 22:46Z pull saw 0/0)",
      day_probe_2026_11_06: "WV " + wvD06.length + " / PL " + plD06.length + " groups",
    },
    webVitals, pageloads, wvRecency, plRecency,
    dayProbes: { "2026-11-05": { webVitals: wvD05, pageloads: plD05 }, "2026-11-06": { webVitals: wvD06, pageloads: plD06 } },
  };
  fs.writeFileSync(OUT, JSON.stringify(raw, null, 2));

  // the human table (bot == false)
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
  console.log("== day probes ==");
  for (const [d, pr] of Object.entries(raw.dayProbes)) {
    const hum = (pr.webVitals || []).filter((g) => !g.dimensions.bot);
    for (const g of hum) {
      const qd = g.quantiles || {};
      console.log(d, "human", g.dimensions.deviceType, "n=" + g.count, "LCPp75=" + qd.largestContentfulPaintP75, "INPp75=" + qd.interactionToNextPaintP75);
    }
    console.log(d, "groups: WV " + (pr.webVitals || []).length + " / PL " + (pr.pageloads || []).length);
  }
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
