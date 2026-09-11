// Gate: BL1 standings have a sportscore fallback, but in pre-season that table
// is the *completed* prior season — so it must be surfaced zeroed and
// started:false (never present stale final points as current). The pts>0
// "started" heuristic now guards the sportscore PGL primary.
const fs = require("fs");
const src = fs.readFileSync("src/worker.ts", "utf8");
const checks = [
  [/if \(!out && code === "BL1"\) \{/, "BL1 sportscore fallback in fetchStandings"],
  [/out = \{ matchday: null, started: false, teams: table\.map\(\(r, i\) => \(\{ name: r\.team, pos: i \+ 1, points: 0 \}\)\) \}/, "BL1 fallback zeroed + started:false (no stale season)"],
  [/started: table\.some\(\(r\) => parseInt\(r\.pts\) > 0\)/, "PGL sportscore pts>0 started heuristic (unique to PGL now)"],
  [ /"BL1": "bundesliga"/, "BL1 sportscore slug"],
];
let fail = 0;
for (const [re, label] of checks) {
  if (!re.test(src)) { console.error("FAIL: " + label); fail++; }
  else console.log("OK  " + label);
}
process.exit(fail ? 1 : 0);
