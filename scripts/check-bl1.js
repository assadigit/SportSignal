// Gate: BL1 must be covered by sportscore (fd returns 0 BL1 fixtures; TSP is
// 429-rate-limited on the worker egress) and Bayern must have an English alias
// (sportscore/TSP report "Bayern Munich", not "FC Bayern München").
const fs = require("fs");
const src = require("./lib/worker-src")();
const checks = [
  [/code === "EL" \|\| code === "ECL" \|\| code === "BL1"/, "BL1 in fetchSportScore slug filter"],
  [/await sportScoreDay\("BL1", SPORTSCORE_SLUGS\.BL1, dateStr, uefaAcc\);/, "BL1 in fetchLongView sweep"],
  [/"Bayern Munich",/, "Bayern English alias in BL1 teams"]
];
let fail = 0;
for (const [re, label] of checks) {
  if (!re.test(src)) { console.error("FAIL: " + label); fail++; }
  else console.log("OK  " + label);
}
process.exit(fail ? 1 : 0);