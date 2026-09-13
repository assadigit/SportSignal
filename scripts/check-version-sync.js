// scripts/check-version-sync.js
// v13.5: gates that package.json and src/config.ts VERSION stay in sync.
// package.json uses semver ("13.5.0"); config.ts carries the human suffix
// ("13.5-modular"). We compare the major.minor core so a bump in one file
// without the other fails `npm test` instead of drifting silently.
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const cfg = fs.readFileSync(path.join(root, "src/config.ts"), "utf8");

const m = cfg.match(/export const VERSION = "([^"]+)"/);
if (!m) {
  console.error("FAIL check-version-sync: VERSION export not found in src/config.ts");
  process.exit(1);
}
const pkgCore = String(pkg.version).split(/[.-]/).slice(0, 2).join(".");
const cfgCore = m[1].split(/[.-]/).slice(0, 2).join(".");

if (pkgCore !== cfgCore) {
  console.error(`FAIL check-version-sync: package.json=${pkg.version} vs config.ts=${m[1]} — bump both together`);
  process.exit(1);
}
console.log(`OK   check-version-sync: package.json=${pkg.version} ~ config.ts=${m[1]}`);
