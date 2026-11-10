#!/usr/bin/env node
// scripts/check-seo-teamnames.js
// S1 M2 (the F3 spelling fix, docs/specs/seo-growth-plan-v2.md §8): gates the
// SEO-only team-name override layer in src/seo/team-names.ts.
//   1. BEHAVIOR — the three overrides (Leipzig «لایپزیگ» alt «لایپزیش»,
//      Nordsjaelland «نورشلان» alt «نوردشیلند», Roma keeps «رم» alt
//      «آ س رم») resolve through the REAL normTeamKey on the provider name
//      variants (FD "RB Leipzig"/"FC Nordsjælland", sportscore "Nordsjaelland",
//      bare "Leipzig"/"Roma"), and control teams pass through byte-identical.
//   2. WIRING — the real src/seo/pages.ts + jsonld.ts consult the override
//      (the faName funnel, the «نام‌های دیگر» facts row, the team-page
//      altnote, the alternateName arrays).
//   3. THE SCOPE LAW — the override must be UNREACHABLE from the bot, the
//      Telegram SVG cards and the digests: no module outside src/seo/
//      imports it, and src/fa-dict.ts still carries the dictionary
//      spellings only (the display surfaces stay byte-identical).
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

let failures = 0;
function ok(msg) { console.log("OK   check-seo-teamnames: " + msg); }
function bad(msg) { console.error("FAIL check-seo-teamnames: " + msg); failures++; }

// ---- 1. eval the REAL team-names.ts (the repo's stripTypes pattern) ----
const { normTeamKey } = require(path.join(root, "src", "teams.ts"));
const tnSrc = fs.readFileSync(path.join(root, "src", "seo", "team-names.ts"), "utf8");
const stripped = tnSrc
  .replace(/^import\s+\{[^}]+\}\s+from\s+"[^"]+";\n/m, "")              // the normTeamKey import (injected below)
  .replace(/^export interface[\s\S]*?\n\}\n/m, "")                       // the erasable interface block
  .replace(/: Record<string, SeoTeamNameOverride> =/, " =")
  .replace(/\(t: any\): string \| null \{/g, "(t) {")
  .replace(/\(t: any\): string\[\] \{/g, "(t) {")
  .replace(/\(t: any\): string \{/g, "(t) {")
  .replace(/const out: string\[\] = \[\];/, "const out = [];")
  .replace(/^export (function|const)/gm, "$1");
const factory = new Function("normTeamKey", stripped +
  "\nreturn { seoTeamFaName, seoTeamAltName, seoTeamAltNames, SEO_TEAM_NAME_OVERRIDES };");
const { seoTeamFaName, seoTeamAltName, seoTeamAltNames } = factory(normTeamKey);

// behavior: the three overrides, provider name variants included
const cases = [
  [{ name: "RB Leipzig", faName: "لایپزیش" }, "لایپزیگ", "لایپزیش"],
  [{ name: "Leipzig", faName: "لایپزیش" }, "لایپزیگ", "لایپزیش"],
  [{ name: "FC Nordsjælland", faName: "نوردشیلند" }, "نورشلان", "نوردشیلند"],
  [{ name: "Nordsjælland", faName: "نوردشیلند" }, "نورشلان", "نوردشیلند"],
  [{ name: "Nordsjaelland", faName: "Nordsjaelland" }, "نورشلان", "نوردشیلند"],
  [{ name: "AS Roma", faName: "رم" }, "رم", "آ س رم"],
  [{ name: "Roma", faName: "رم" }, "رم", "آ س رم"]
];
let behaviorOk = true;
for (const [t, fa, alt] of cases) {
  const gotFa = seoTeamFaName(t);
  const gotAlt = seoTeamAltName(t);
  if (gotFa !== fa || gotAlt !== alt) {
    bad(`override mismatch for ${t.name}: fa «${gotFa}» (want «${fa}»), alt «${gotAlt}» (want «${alt}»)`);
    behaviorOk = false;
  }
}
if (behaviorOk) ok("all " + cases.length + " override cases resolve (SEO name + alternate, provider variants included)");

// behavior: alternateName arrays (SEO name first, then the dictionary spelling)
const altCases = [
  [{ name: "RB Leipzig", faName: "لایپزیش" }, ["لایپزیگ", "لایپزیش"]],
  [{ name: "AS Roma", faName: "رم" }, ["رم", "آ س رم"]],
  [{ name: "Nordsjaelland", faName: "Nordsjaelland" }, ["نورشلان", "نوردشیلند", "Nordsjaelland"]]
];
let altOk = true;
for (const [t, want] of altCases) {
  const got = seoTeamAltNames(t);
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    bad(`altNames mismatch for ${t.name}: ${JSON.stringify(got)} (want ${JSON.stringify(want)})`);
    altOk = false;
  }
}
if (altOk) ok("alternateName arrays carry both spellings (SEO first, dictionary after, row faName last)");

// behavior: control teams pass through untouched (byte-identity class)
const controls = [
  { name: "Chelsea FC", faName: "چلسی" },
  { name: "Real Madrid CF", faName: "رئال مادرید" },
  { name: "SC Freiburg", faName: "فرایبورگ" },
  { name: "Paris Saint-Germain FC", faName: "پاری سن ژرمن" }
];
let ctrlOk = true;
for (const t of controls) {
  if (seoTeamFaName(t) !== t.faName) { bad(`control team ${t.name} changed: «${seoTeamFaName(t)}»`); ctrlOk = false; }
  if (seoTeamAltName(t) !== null) { bad(`control team ${t.name} gained an alt: «${seoTeamAltName(t)}»`); ctrlOk = false; }
  if (JSON.stringify(seoTeamAltNames(t)) !== JSON.stringify([t.faName])) { bad(`control team ${t.name} altNames changed: ${JSON.stringify(seoTeamAltNames(t))}`); ctrlOk = false; }
}
if (ctrlOk) ok("control teams pass through byte-identical (faName unchanged, no alt, single-name altNames)");

// ---- 2. wiring: the real pages.ts + jsonld.ts consult the layer ----
const pagesSrc = fs.readFileSync(path.join(root, "src", "seo", "pages.ts"), "utf8");
const jsonldSrc = fs.readFileSync(path.join(root, "src", "seo", "jsonld.ts"), "utf8");
let wiringOk = true;
if (!/import \{ seoTeamFaName, seoTeamAltName \} from "\.\/team-names";/.test(pagesSrc)) { bad("pages.ts lost the team-names import"); wiringOk = false; }
if (!/return seoTeamFaName\(t\);/.test(pagesSrc)) { bad("pages.ts faName() no longer funnels through seoTeamFaName"); wiringOk = false; }
if (!pagesSrc.includes("نام‌های دیگر")) { bad("match pages lost the «نام‌های دیگر» facts row"); wiringOk = false; }
if (!/altnote/.test(pagesSrc)) { bad("team pages lost the .altnote alternate-spelling note"); wiringOk = false; }
if (!/seoTeamAltNames\(m\.homeTeam\)/.test(jsonldSrc) || !/seoTeamAltNames\(m\.awayTeam\)/.test(jsonldSrc)) { bad("jsonld.ts sportsEventNode lost the override-aware alternateName"); wiringOk = false; }
if (!/seoTeamAltNames\(entry\)/.test(jsonldSrc)) { bad("jsonld.ts sportsTeamNode lost the override-aware alternateName"); wiringOk = false; }
if (wiringOk) ok("pages.ts + jsonld.ts wired (faName funnel, facts row, altnote, both alternateName nodes)");

// ---- 3. the scope law: unreachable from the bot / cards / digests ----
let scopeOk = true;
const walk = (dir) => {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) { if (f.name !== "node_modules" && f.name !== ".git") walk(p); continue; }
    if (!/\.(ts|js)$/.test(f.name)) continue;
    const rel = path.relative(path.join(root, "src"), p).replace(/\\/g, "/");
    if (rel.startsWith("seo/")) continue; // the SEO layer itself
    const c = fs.readFileSync(p, "utf8");
    if (/team-names|seoTeamFaName|seoTeamAltName|SEO_TEAM_NAME_OVERRIDES/.test(c)) {
      bad("scope violation: " + rel + " references the SEO-only override layer");
      scopeOk = false;
    }
  }
};
walk(path.join(root, "src"));
if (scopeOk) ok("scope law holds: nothing outside src/seo/ references the override layer (bot/cards/digests untouched)");

// fa-dict still carries the DICTIONARY spellings (the display surfaces render
// from it — evaluate the real dict, the source stores \uXXXX escapes)
const { buildFaTeamDict } = require(path.join(root, "src", "fa-dict.ts"));
const FA_TEAMS = buildFaTeamDict();
let dictOk = true;
if (FA_TEAMS["RB Leipzig"] !== "لایپزیش") { bad("fa-dict.ts RB Leipzig is no longer «لایپزیش» (display surfaces must not change)"); dictOk = false; }
if (FA_TEAMS["AS Roma"] !== "رم") { bad("fa-dict.ts AS Roma is no longer «رم»"); dictOk = false; }
if (FA_TEAMS["FC Nordsjælland"] !== "نوردشیلند") { bad("fa-dict.ts FC Nordsjælland is no longer «نوردشیلند»"); dictOk = false; }
const seoLeak = Object.values(FA_TEAMS).filter((v) => v === "لایپزیگ" || v === "نورشلان" || v === "آ س رم");
if (seoLeak.length) { bad("fa-dict.ts carries SEO spellings (" + JSON.stringify(seoLeak) + ") — the override must stay in src/seo/"); dictOk = false; }
if (dictOk) ok("fa-dict.ts unchanged (dictionary spellings only — the bot/cards/digests render from it)");

if (failures) { console.error("\ncheck-seo-teamnames: " + failures + " failure(s)"); process.exit(1); }
console.log("check-seo-teamnames: all checks passed");
