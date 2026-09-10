// Gate: notification windows + backfill + dedupe TTLs at reliability settings.
const fs = require("fs");
const src = fs.readFileSync("src/worker.ts", "utf8");
const checks = [
  [/hoursUntilMatch <= 24 && hoursUntilMatch >= 20/, "24h window 20-24h"],
  [/hoursUntilMatch <= 3\.5 && hoursUntilMatch >= 2\.5/, "3h window 2.5-3.5h"],
  [/hoursUntilMatch <= 1\.5 && hoursUntilMatch >= 0\.75/, "1h window 0.75-1.5h"],
  [/minutesUntilMatch <= CONFIG\.MATCH_START_WINDOW_MINUTES && minutesUntilMatch >= -5/, "match-start grace -5min"],
  [/case "result":\s*expiresAt = now \+ CONFIG\.ONE_DAY_MS;/, "result dedupe 24h"],
  [/default:\s*expiresAt = matchTime \+ CONFIG\.ONE_HOUR_MS;/, "72h dedupe until kickoff+1h"],
  [/function isBackfillEligible\(match, type, _env\)/, "backfill present"],
  [/hoursSince > CONFIG\.POST_MATCH_NOTIFICATION_HOURS && hoursSince <= 24/, "result backfill <=24h"],
];
let fail = 0;
for (const [re, label] of checks) {
  if (!re.test(src)) { console.error("FAIL: " + label); fail++; }
  else console.log("OK  " + label);
}
process.exit(fail ? 1 : 0);
