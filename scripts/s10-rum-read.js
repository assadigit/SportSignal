// S10 one-off: the SS-25 RUM re-read (CF GraphQL). Same method as S7/S8/S9:
// rumWebVitalsEventsAdaptiveGroups + rumPageloadEventsAdaptiveGroups, site
// tag 08a51fd889514c818e0161066160e5b3, grouped by date x bot x deviceType,
// window 2026-10-31..open + a recency probe (datetimeHour_geq = the UTC day
// of the pull). Writes docs/history/2026-11-06-s10-rum-raw.json + prints the
// human table. Token comes from the CF_API_TOKEN env var (never committed).
"use strict";
const fs = require("fs");

const TOKEN = process.env.CF_API_TOKEN;
if (!TOKEN) { console.error("CF_API_TOKEN env required"); process.exit(1); }
const SITE_TAG = "08a51fd889514c818e0161066160e5b3";
const ACCOUNT_TAG = "a796fdfe71819812119b8a494d3d39c1";
const OUT = "docs/history/2026-11-06-s10-rum-raw.json";

const q = (dataset, extraFilter) => `
query {
  viewer {
    accounts(filter: { accountTag: "${ACCOUNT_TAG}" }) {
      ${dataset}(limit: 100, filter: {
        siteTag: "${SITE_TAG}"
        date_geq: "2026-10-31"
        date_leq: "2026-11-09"
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

async function pull(name, extraFilter) {
  const r = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + TOKEN },
    body: JSON.stringify({ query: q(name, extraFilter) }),
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

  const raw = {
    _s10_rum_pull: {
      session: "S10 (docs/history/2026-11-06-s10-herowire.md)",
      pulled_utc: pulledUtc,
      method: "CF GraphQL rumWebVitalsEventsAdaptiveGroups + rumPageloadEventsAdaptiveGroups, site tag " + SITE_TAG + ", grouped by date x bot x deviceType, window 2026-10-31..2026-11-09",
      recency_check: "separate datetimeHour_geq=" + day + "T00:00:00Z pull on BOTH datasets returned " + wvRecency.length + " + " + plRecency.length + " groups",
    },
    webVitals, pageloads, wvRecency, plRecency,
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
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
