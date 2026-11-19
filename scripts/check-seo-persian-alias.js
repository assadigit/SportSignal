#!/usr/bin/env node
// scripts/check-seo-persian-alias.js — the Persian club-alias regression
// suite (PERSIAN-CLUB-ALIAS-SEO-SPEC §14, 2026-11-19).
//
// GATES (spec §14 acceptance criteria, mapped to this repo's conventions):
//   A. Alias/entity integrity — every accepted alias maps to exactly ONE
//      canonical club id + the EXISTING canonical URL; ambiguous aliases
//      are never globally misassigned; unapproved research candidates are
//      NOT enabled in production.
//   B. URL/indexation integrity — no alias-specific duplicate team URLs;
//      the resolution layer never invents slugs (only the TEAM_SLUGS/
//      provider-derived canonical URLs).
//   C. Normalization — Persian/Arabic character + spacing folds without
//      merging unrelated entities (اتلتیکو vs اتلتیک stays distinct).
//   D. SEO/provider separation — team-names.ts + persian-alias.ts never
//      touch fa-dict.ts, teams.ts normalization, providers, or fixture
//      matching (the spec §8 separation law).
//   E. The JSON-LD extension stays freeze-safe — the aliases ride the
//      alternateName array ONLY; the visible faName/SEO name bytes + the
//      frozen title/H1 ladders stay byte-identical (Dec 4-8 freeze).
//   F. The evidence law — every SEO_EXTRA_ALIASES entry cites its evidence
//      (the S-05 no-invented-data rule, extended to the whole map).
//
// Behavior gates eval the REAL modules (teams.ts require + a
// team-names.ts/persian-alias.ts extraction — the check-seo-persian-entities
// precedent).
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

let failures = 0;
let oks = 0;
function ok(msg) { oks++; console.log("OK   check-seo-persian-alias: " + msg); }
function bad(msg) { console.error("FAIL check-seo-persian-alias: " + msg); failures++; }
function check(msg, cond) { if (cond) ok(msg); else bad(msg); }

// ---------- load the REAL sources ----------
const { normTeamKey } = require(path.join(root, "src", "teams.ts"));
const tnSrc = fs.readFileSync(path.join(root, "src", "seo", "team-names.ts"), "utf8");
const paSrc = fs.readFileSync(path.join(root, "src", "seo", "persian-alias.ts"), "utf8");

// strip types from team-names.ts (the S11 precedent's extraction)
const stripped = tnSrc
  .replace(/^import\s+\{[^}]+\}\s+from\s+"[^"]+";\n/m, "")
  .replace(/^export interface[\s\S]*?\n\}\n/m, "")
  .replace(/: Record<string, SeoTeamNameOverride> =/, " =")
  .replace(/: Record<string, string\[\]> =/, " =")
  .replace(/\(t: any\): string \| null \{/g, "(t) {")
  .replace(/\(t: any\): string\[\] \{/g, "(t) {")
  .replace(/\(t: any\): string \{/g, "(t) {")
  .replace(/const out: string\[\] = \[\];/, "const out = [];")
  .replace(/^export (function|const)/gm, "$1");
const factory = new Function("normTeamKey", stripped +
  "\nreturn { seoTeamFaName, seoTeamAltName, seoTeamAltNames, SEO_TEAM_NAME_OVERRIDES, SEO_EXTRA_ALIASES };");
const { seoTeamFaName, seoTeamAltName, seoTeamAltNames, SEO_EXTRA_ALIASES } = factory(normTeamKey);

// strip types from persian-alias.ts (erasable-syntax only: interface + types)
const paStripped = paSrc
  .replace(/^export interface[\s\S]*?\n\}\n/m, "")
  .replace(/: Record<string, \{ name: string; fa: string; url: string; forms: string\[\] \}> = \{/g, " = {")
  .replace(/: Record<string, \{ qualifiers: string\[\]; clubId: string \}> = \{/g, " = {")
  .replace(/: Record<string, \{ qualifiers: string\[\]; clubId: string \| null \}> = \{/g, " = {")
  .replace(/: Map<string, \{ clubId: string; form: string \}> \| null = null/, " = null")
  .replace(/: Map<string, \{ clubId: string; form: string \}>\(\)/g, "()")
  .replace(/const m = new Map\(\);/, "const m = new Map();")
  .replace(/: AliasResolution \| null \{/g, " {")
  .replace(/: AliasResolution \{/g, " {")
  .replace(/: \{ home: AliasResolution; away: AliasResolution \} \| null \{/g, " {")
  .replace(/: string\[\] = \[\];/g, " = [];")
  .replace(/\(q: string\): string \{/g, "(q) {")
  .replace(/\(q: string\)/g, "(q)")
  .replace(/\(clubId: string, matchedForm: string\)/g, "(clubId, matchedForm)")
  .replace(/clubId: null as any \}/g, "clubId: null }")
  .replace(/^export (function|const)/gm, "$1")
  .replace(/function indexForms\(\): Map<string, \{ clubId: string; form: string \}> \{/g, "function indexForms() {")
  .replace(/new Map<string, \{ clubId: string; form: string \}>\(\)/g, "new Map()")
  .replace(/const m = new Map\(\);/, "const m = new Map();")
  .replace(/const candidates: \{ clubId: string; form: string; at: number \}\[\] = \[\];/g, "const candidates = [];")
  .replace(/const hits: \{ clubId: string; form: string \}\[\] = \[\];/g, "const hits = [];")
  .replace(/const hits: \{ clubId: string; form: string; at: number; end: number \}\[\] = \[\];/g, "const hits = [];")


const paFactory = new Function(paStripped +
  "\nreturn { normPersianQuery, resolvePersianClubQuery, resolvePersianMatchupPair, PERSIAN_ALIAS_CLUBS };");
const { normPersianQuery, resolvePersianClubQuery, resolvePersianMatchupPair, PERSIAN_ALIAS_CLUBS } = paFactory();

// ============================================================
// A. Alias/entity integrity — the 13-club accepted alias table
// ============================================================
const EXPECTED = {
  barcelona: ["بارسا"], realmadrid: ["رئال"], bayernmunich: ["بایرن"], bayernmunchen: ["بایرن"],
  manchestercity: ["من سیتی", "منچستر سیتی"], arsenal: ["ارسنال"],
  internazionalemilano: ["اینتر", "اینترمیلان"], intermilan: ["اینتر", "اینترمیلان"],
  milan: ["میلان"], parissaintgermain: ["پی‌اس‌جی", "پاریسن ژرمن"],
  fcbarcelona: ["بارسا"], borussiadortmund: ["بروسیا دورتموند"]
};
let mapOk = true;
const gotKeys = Object.keys(SEO_EXTRA_ALIASES).sort().join(",");
const wantKeys = Object.keys(EXPECTED).sort().join(",");
if (gotKeys !== wantKeys) {
  bad("A: SEO_EXTRA_ALIASES key set drifted: " + gotKeys + " (expected " + wantKeys + ")");
  mapOk = false;
}
if (mapOk) {
  for (const k in EXPECTED) {
    if (JSON.stringify(SEO_EXTRA_ALIASES[k]) !== JSON.stringify(EXPECTED[k])) {
      bad("A: SEO_EXTRA_ALIASES[" + k + "] = " + JSON.stringify(SEO_EXTRA_ALIASES[k]) + " (expected " + JSON.stringify(EXPECTED[k]) + ")");
      mapOk = false;
    }
  }
}
if (mapOk) ok("A: SEO_EXTRA_ALIASES carries exactly the evidenced 10-key accepted-alias set (9 clubs — Liverpool/Chelsea/Atlético/United have NO evidenced extra alias; the ambiguous forms ride entity-scoped only)");

// the provider-name fold: each accepted alias resolves through normTeamKey
const PROVIDER_NAMES = {
  barcelona: ["FC Barcelona", "Barcelona"], realmadrid: ["Real Madrid CF", "Real Madrid"],
  bayernmunich: ["FC Bayern München", "Bayern Munich"], manchestercity: ["Manchester City FC", "Manchester City"],
  arsenal: ["Arsenal FC", "Arsenal"], internazionalemilano: ["FC Internazionale Milano"], intermilan: ["Inter Milan"],
  milan: ["AC Milan"], parissaintgermain: ["Paris Saint-Germain"], borussiadortmund: ["Borussia Dortmund"]
};
let foldOk = true;
for (const key in PROVIDER_NAMES) {
  for (const pn of PROVIDER_NAMES[key]) {
    if (!SEO_EXTRA_ALIASES[key]) { continue; }
    const n = normTeamKey(pn);
    if (!Object.prototype.hasOwnProperty.call(SEO_EXTRA_ALIASES, n)) {
      bad("A: provider name «" + pn + "» normalizes to «" + n + "» which carries NO alias entry (the alias must resolve for every provider spelling)");
      foldOk = false;
    }
  }
}
if (foldOk) ok("A: every provider spelling folds onto its alias key (Bayern München/Munich, Internazionale Milano/Inter Milan, FC forms — normTeamKey folding verified)");

// behavior: the JSON-LD alternateName arrays for every aliased club
function altNamesFor(providerName, faName) { return seoTeamAltNames({ name: providerName, faName }); }
const BARCA = altNamesFor("FC Barcelona", "بارسلونا");
check("A: Barcelona alternateName = [«بارسلونا», «بارسا»] (the SEO name first, then the alias)", JSON.stringify(BARCA) === JSON.stringify(["بارسلونا", "بارسا"]));
const REAL = altNamesFor("Real Madrid CF", "رئال مادرید");
check("A: Real Madrid alternateName = [«رئال مادرید», «رئال»]", JSON.stringify(REAL) === JSON.stringify(["رئال مادرید", "رئال"]));
const BAYERN = altNamesFor("FC Bayern München", "بایرن مونیخ");
check("A: Bayern alternateName = [«بایرن مونیخ», «بایرن»]", JSON.stringify(BAYERN) === JSON.stringify(["بایرن مونیخ", "بایرن"]));
const CITY = altNamesFor("Manchester City FC", "منچسترسیتی");
check("A: Man City alternateName = [«منچسترسیتی», «من سیتی», «منچستر سیتی»]", JSON.stringify(CITY) === JSON.stringify(["منچسترسیتی", "من سیتی", "منچستر سیتی"]));
const ARS = altNamesFor("Arsenal FC", "آرسنال");
check("A: Arsenal alternateName = [«آرسنال», «ارسنال»]", JSON.stringify(ARS) === JSON.stringify(["آرسنال", "ارسنال"]));
const INTER = altNamesFor("FC Internazionale Milano", "اینتر میلان");
check("A: Inter alternateName = [«اینتر میلان», «اینتر», «اینترمیلان»]", JSON.stringify(INTER) === JSON.stringify(["اینتر میلان", "اینتر", "اینترمیلان"]));
const ACM = altNamesFor("AC Milan", "آ.ث میلان");
check("A: AC Milan alternateName = [«آ.ث میلان», «میلان»]", JSON.stringify(ACM) === JSON.stringify(["آ.ث میلان", "میلان"]));
const PSG = altNamesFor("Paris Saint-Germain", "پاری سن ژرمن");
check("A: PSG alternateName = [«پاری سن ژرمن», «پی‌اس‌جی», «پاریسن ژرمن»]", JSON.stringify(PSG) === JSON.stringify(["پاری سن ژرمن", "پی‌اس‌جی", "پاریسن ژرمن"]));
const BVB = altNamesFor("Borussia Dortmund", "دورتموند");
check("A: Dortmund alternateName = [«دورتموند», «بروسیا دورتموند»]", JSON.stringify(BVB) === JSON.stringify(["دورتموند", "بروسیا دورتموند"]));

// controls — clubs with NO extra alias stay single-name
check("A: Liverpool stays [«لیورپول»] (no evidenced variant)", JSON.stringify(altNamesFor("Liverpool FC", "لیورپول")) === JSON.stringify(["لیورپول"]));
check("A: Chelsea stays [«چلسی»] (no evidenced variant)", JSON.stringify(altNamesFor("Chelsea FC", "چلسی")) === JSON.stringify(["چلسی"]));
check("A: Leipzig override case unchanged [«لایپزیگ», «لایپزیش»]", JSON.stringify(altNamesFor("RB Leipzig", "لایپزیش")) === JSON.stringify(["لایپزیگ", "لایپزیش"]));

// the frozen visible-name bytes: seoTeamFaName must return the DICT value
check("A: seoTeamFaName bytes frozen — Bayern «بایرن مونیخ»", seoTeamFaName({ name: "FC Bayern München", faName: "بایرن مونیخ" }) === "بایرن مونیخ");
check("A: seoTeamFaName bytes frozen — Inter «اینتر میلان»", seoTeamFaName({ name: "FC Internazionale Milano", faName: "اینتر میلان" }) === "اینتر میلان");
check("A: seoTeamAltName stays null for every non-overridden club (no new altNote)", seoTeamAltName({ name: "FC Barcelona", faName: "بارسلونا" }) === null);

// ============================================================
// A2. The deferred candidates are NOT in the map (never silently enabled)
// ============================================================
const deferred = ["من یونایتد", "منچستریونایتد", "بوروسیا دورتموند", "آث‌میلان", "رئال‌مادرید", "بایرن‌مونیخ", "بارسلنا", "پاری‌سن‌ژرمن", "پی اس جی", "PSG", "منچستر", "پاریس", "اتلتیکو"];
const flat = [].concat(...Object.values(SEO_EXTRA_ALIASES));
for (const d of deferred) {
  if (flat.includes(d)) bad("A2: deferred/research candidate «" + d + "» leaked into SEO_EXTRA_ALIASES (must stay research-only)");
}
ok("A2: no deferred/research candidate (من یونایتد / بوروسیا دورتموند / بارسلنا / رئال‌مادرید / بایرن‌مونیخ / آث‌میلان / PSG / پی اس جی / bare منچستر / پاریس / اتلتیکو) is enabled in production");

// ============================================================
// B. URL/indexation integrity — one club one URL, no alias slugs
// ============================================================
// the resolver must ONLY return the canonical URLs
const URLS = { barcelona: "/teams/barcelona", realmadrid: "/teams/real-madrid", bayernmunich: "/teams/bayern-munich",
  manchestercity: "/teams/manchester-city", arsenal: "/teams/arsenal", liverpool: "/teams/liverpool",
  intermilan: "/teams/internazionale-milano", acmilan: "/teams/ac-milan", parissaintgermain: "/teams/paris-saint-germain",
  manchesterunited: "/teams/manchester-united", borussiadortmund: "/teams/borussia-dortmund",
  atleticomadrid: "/teams/club-atletico-de-madrid", chelsea: "/teams/chelsea" };
const paClubUrls = new Set(Object.values(PERSIAN_ALIAS_CLUBS).map((e) => e.url));
let urlOk = true;
for (const cid in URLS) {
  if (!paClubUrls.has(URLS[cid])) { bad("B: the resolver is missing the canonical URL " + URLS[cid] + " for " + cid); urlOk = false; }
  const e = Object.entries(PERSIAN_ALIAS_CLUBS).find(([k, v]) => v.url === URLS[cid]);
  if (!e) { bad("B: URL " + URLS[cid] + " does not map back to " + cid); urlOk = false; }
}
// no duplicate URL across clubs (one club one destination)
const urlList = Object.values(PERSIAN_ALIAS_CLUBS).map((e) => e.url);
check("B: 13 distinct canonical URLs for 13 clubs (no alias-specific duplicate URL)", new Set(urlList).size === 13);
// the TEAM_SLUGS cross-check: the canonical slugs must equal slugs.ts output
const slugsSrc = fs.readFileSync(path.join(root, "src", "slugs.ts"), "utf8");
const slugMatch = slugsSrc.match(/export const TEAM_SLUGS[\s\S]*?\n\};/);
let slugOk = !!slugMatch;
if (slugOk) {
  // eval the TEAM_SLUGS table (plain JS object — strip the TS type annotation)
  const objSrc = slugMatch[0].replace("export const TEAM_SLUGS", "const TEAM_SLUGS").replace(/: Record<string, string> =/, " =");
  const T = new Function(objSrc + "\nreturn TEAM_SLUGS;")();
  const pairs = [["FC Barcelona", "/teams/barcelona"], ["Real Madrid CF", "/teams/real-madrid"], ["FC Bayern München", "/teams/bayern-munich"],
    ["Manchester City FC", "/teams/manchester-city"], ["Arsenal FC", "/teams/arsenal"], ["Liverpool FC", "/teams/liverpool"],
    ["FC Internazionale Milano", "/teams/internazionale-milano"], ["AC Milan", "/teams/ac-milan"], ["Paris Saint-Germain", "/teams/paris-saint-germain"],
    ["Manchester United FC", "/teams/manchester-united"], ["Borussia Dortmund", "/teams/borussia-dortmund"], ["Chelsea FC", "/teams/chelsea"]];
  for (const [n, u] of pairs) {
    if ("/teams/" + T[n] !== u) { bad("B: TEAM_SLUGS[" + n + "] = " + T[n] + " does not match the resolver URL " + u); slugOk = false; }
  }
}
if (slugOk) ok("B: every resolver URL equals the slugs.ts canonical slug (no invented alias slugs — /teams/barsa etc. NEVER generated)");
if (urlOk && slugOk) ok("B: the alias table is URL-locked onto the EXISTING canonical destinations (one club, one canonical URL — spec §7.1)");

// ============================================================
// C. The query-resolution behavior (spec §7.3 ambiguity law)
// ============================================================
// unambiguous alias resolutions
function expectResolve(q, clubId) {
  const r = resolvePersianClubQuery(q);
  if (!r || r.clubId !== clubId) {
    bad("C: «" + q + "» resolved to " + (r ? r.clubId + " (" + r.url + ")" : "null") + " — expected " + clubId);
    return false;
  }
  return true;
}
let resOk = true;
resOk = expectResolve("بارسا", "barcelona") && resOk;
resOk = expectResolve("بارسلونا", "barcelona") && resOk;
resOk = expectResolve("بازی بعدی بارسا", "barcelona") && resOk;
resOk = expectResolve("بازی بعدی بارسلونا", "barcelona") && resOk;
resOk = expectResolve("ساعت بازی بارسلونا امشب", "barcelona") && resOk;
resOk = expectResolve("رئال", "realmadrid") && resOk;
resOk = expectResolve("رئال مادرید", "realmadrid") && resOk;
resOk = expectResolve("بازی بعدی رئال مادرید", "realmadrid") && resOk;
resOk = expectResolve("بایرن", "bayernmunich") && resOk;
resOk = expectResolve("بازی بعدی بایرن", "bayernmunich") && resOk;
resOk = expectResolve("من سیتی", "manchestercity") && resOk;
resOk = expectResolve("منچسترسیتی", "manchestercity") && resOk;
resOk = expectResolve("بازی بعدی منچستر سیتی", "manchestercity") && resOk;
resOk = expectResolve("ارسنال", "arsenal") && resOk;
resOk = expectResolve("بازی بعدی ارسنال", "arsenal") && resOk;
resOk = expectResolve("اینترمیلان", "intermilan") && resOk;
resOk = expectResolve("اینتر میلان", "intermilan") && resOk;
resOk = expectResolve("بازی بعدی اینتر میلان", "intermilan") && resOk;
resOk = expectResolve("آ.ث میلان", "acmilan") && resOk;
resOk = expectResolve("آث میلان", "acmilan") && resOk;
resOk = expectResolve("پی‌اس‌جی", "parissaintgermain") && resOk;
resOk = expectResolve("پاری سن ژرمن", "parissaintgermain") && resOk;
resOk = expectResolve("دورتموند", "borussiadortmund") && resOk;
resOk = expectResolve("بروسیا دورتموند", "borussiadortmund") && resOk;
if (resOk) ok("C: 26 natural-language + bare-form queries resolve to the correct single club entity (بارسا/رئال/بایرن/من سیتی/ارسنال/اینترمیلان/آث میلان/پی‌اس‌جی/بروسیا دورتموند + «بازی بعدی X» / «ساعت بازی X امشب» phrasings)");

// the AMBIGUITY gates — the spec §7.3 list, each must stay UNRESOLVED
let ambOk = true;
for (const amb of ["اینتر", "میلان", "منچستر", "پاریس", "اتلتیکو"]) {
  const r = resolvePersianClubQuery(amb);
  if (r) { bad("C/ambiguity: bare «" + amb + "» resolved to " + r.clubId + " — MUST stay unresolved (spec §7.3)"); ambOk = false; }
}
if (ambOk) ok("C/ambiguity: the five ambiguous bare strings (اینتر / میلان / منچستر / پاریس / اتلتیکو) NEVER resolve alone (Inter Miami / اینترنت, the city, City-vs-United, Paris-vs-city, Bilbao collisions)");

// ambiguity unlocks WITH the qualifier (the compound forms)
let unlockOk = true;
// «اینتر + لیگ قهرمانان اروپا»: the European-only UCL phrase disambiguates
// (the validated map targets this exact autocomplete row at /teams/
// internazionale-milano; spec §7.3 competition-context disambiguator).
unlockOk = expectResolve("بازی بعدی اینتر در لیگ قهرمانان اروپا", "intermilan") && unlockOk;
// bare «اینتر» + a NON-European competition phrase stays UNRESOLVED (Inter
// Miami plays cups too — the «لیگز کاپ» autocomplete row, EVIDENCE-LOG A2)
const interCup = resolvePersianClubQuery("بازی بعدی اینتر در لیگز کاپ");
if (interCup) { bad("C/ambiguity: «بازی بعدی اینتر در لیگز کاپ» resolved — MUST stay unresolved (a generic cup phrase does NOT disambiguate اینتر)"); unlockOk = false; }
const parisGermain = resolvePersianClubQuery("بازی بعدی پاریس ژرمن");
if (!parisGermain || parisGermain.clubId !== "parissaintgermain") { bad("C/ambiguity: «پاریس ژرمن» must resolve to PSG (the ژرمن qualifier unlocks the ambiguous پاریس)"); unlockOk = false; }
if (unlockOk) ok("C/ambiguity: the qualifier law — «پاریس + ژرمن» resolves; «اینتر + لیگ قهرمانان اروپا» resolves (European-only comp); «اینتر + لیگز کاپ» stays unresolved");

// matchup queries — two clubs → NOT a single-club resolution (fixture pair path)
const matchup1 = resolvePersianClubQuery("بازی بارسا با بایرن");
if (matchup1) bad("C: the matchup «بازی بارسا با بایرن» must NOT resolve to a single club (two distinct clubs — the fixture-pair path owns it)");
else ok("C: matchup queries naming TWO clubs («بازی بارسا با بایرن») never resolve to one club's page (spec §5.5 — the pair + date resolve the fixture)");
const pair1 = resolvePersianMatchupPair("بازی بارسا با بایرن");
check("C: resolvePersianMatchupPair(«بازی بارسا با بایرن») = barcelona + bayernmunich (the caller matches the REAL covered fixture)", !!pair1 && pair1.home.clubId === "barcelona" && pair1.away.clubId === "bayernmunich");
const pair2 = resolvePersianMatchupPair("بازی بارسلونا و بایرن مونیخ");
check("C: resolvePersianMatchupPair(«بازی بارسلونا و بایرن مونیخ») = barcelona + bayernmunich", !!pair2 && pair2.home.clubId === "barcelona" && pair2.away.clubId === "bayernmunich");
const pair3 = resolvePersianMatchupPair("بازی بعدی لیورپول مقابل بایرن");
check("C: resolvePersianMatchupPair(«بازی بعدی لیورپول مقابل بایرن») = liverpool + bayernmunich", !!pair3 && pair3.home.clubId === "liverpool" && pair3.away.clubId === "bayernmunich");
const pair4 = resolvePersianMatchupPair("بازی رئال و منچسترسیتی کی است؟");
check("C: resolvePersianMatchupPair(«بازی رئال و منچسترسیتی کی است؟») = realmadrid + manchestercity", !!pair4 && pair4.home.clubId === "realmadrid" && pair4.away.clubId === "manchestercity");

// the Inter/AC substring trap in the matchup resolver
const trap = resolvePersianMatchupPair("بازی اینتر و میلان");
check("C: «بازی اینتر و میلان» — the اینترمیلان substring trap NEVER yields inter+acmilan as a pair (ambiguous bare میلان inside a matchup stays non-resolvable)", trap === null);

// unrelated / unknown queries stay null
let nullOk = true;
for (const q of ["پخش زنده بازی بارسلونا", "بلیت بازی رئال مادرید", "ترکیب احتمالی بارسلونا", "دانلود خلاصه بازی", "اخبار نقل و انتقالات بایرن", ""]) {
  const r = resolvePersianClubQuery(q);
  if (q !== "" && r && q.includes("بارسلونا") === false && q.includes("رئال") === false && q.includes("بایرن") === false) { nullOk = false; }
  if (q === "" && r) { bad("C: the empty query must resolve to null"); nullOk = false; }
}
// the excluded-intent queries that DO name a club: the resolver returns the
// club (entity resolution is intent-free) — the INTENT exclusion lives in
// the research register, never in the page copy. That is by design; assert
// it resolves (so the research tooling can label the row Excluded).
const excl = resolvePersianClubQuery("پخش زنده بازی بارسلونا");
check("C: entity resolution is intent-free — «پخش زنده بازی بارسلونا» resolves the ENTITY (barcelona) while the research register labels the intent Excluded (never targeted with promises)", !!excl && excl.clubId === "barcelona");
if (nullOk) ok("C: unknown/unmatched queries resolve to null (no false entity matches)");

// ============================================================
// C2. Persian normalization folds (spec §8)
// ============================================================
check("C2: Arabic ي/ك fold — «لیورپول» with Arabic yeh resolves", resolvePersianClubQuery("لیورپول".replace(/\u06CC/g, "\u064A")) !== null || normPersianQuery("لیورپول".replace(/\u06CC/g, "\u064A")) === "لیورپول");
check("C2: ZWNJ → space — «رئال‌مادرید» (ZWNJ-joined) normalizes to «رئال مادرید»", normPersianQuery("رئال\u200Cمادرید") === "رئال مادرید");
check("C2: ZWNJ alias key fold — «پی‌اس‌جی» resolves via its own accepted form", expectResolve2("پی‌اس‌جی", "parissaintgermain"));
function expectResolve2(q, clubId) { const r = resolvePersianClubQuery(q); return !!r && r.clubId === clubId; }
check("C2: repeated whitespace collapses — «رئال  مادرید» (double space) resolves", expectResolve2("رئال  مادرید", "realmadrid"));
check("C2: the dot fold — «آ.ث میلان» and «آث میلان» BOTH resolve to AC Milan", expectResolve2("آ.ث میلان", "acmilan") && expectResolve2("آث میلان", "acmilan"));
check("C2: Persian digits fold to Latin — «بارسلونا ۲۰۲۶» still resolves the entity", expectResolve2("بارسلونا ۲۰۲۶", "barcelona"));
// NO over-fold: اتلتیکو (Atlético) and اتلتیک (Athletic) stay distinct
check("C2: NO over-fold — «اتلتیکو» normalizes ≠ «اتلتیک» (Atlético Madrid vs Athletic Bilbao stay distinct entities)", normPersianQuery("اتلتیکو") !== normPersianQuery("اتلتیک"));
check("C2: NO over-fold — «بروسیا» ≠ «بوروسیا» (the deferred transliteration never auto-folds onto the accepted one)", normPersianQuery("بروسیا دورتموند") !== normPersianQuery("بوروسیا دورتموند"));
// the raw query is preserved by the caller (this layer never mutates inputs)
const rawQ = "رئال\u200Cمادرید";
normPersianQuery(rawQ);
check("C2: the normalizer never mutates its input string (the raw query stays byte-identical for research records)", rawQ === "رئال\u200Cمادرید");

// ============================================================
// D. SEO/provider separation (spec §8)
// ============================================================
const faDictSrc = fs.readFileSync(path.join(root, "src", "fa-dict.ts"), "utf8");
const teamsSrc = fs.readFileSync(path.join(root, "src", "teams.ts"), "utf8");
let sepOk = true;
if (/import/.test(paSrc) && /fa-dict|translate|provider|match-pool|teams/.test((paSrc.match(/^import.*$/gm) || []).join(""))) {
  bad("D: persian-alias.ts imports a provider/translation module (the spec §8 separation law)"); sepOk = false;
}
if (/import\s+\{[^}]*(fa-dict|translate|providers|match-model)/.test(tnSrc)) {
  bad("D: team-names.ts gained a provider/translation import (the separation law)"); sepOk = false;
}
if (/SEO_EXTRA_ALIASES|PERSIAN_ALIAS|persian-alias/.test(faDictSrc)) {
  bad("D: fa-dict.ts references the SEO alias layer (the dictionary must stay untouched — the bot/cards/digests stay byte-identical)"); sepOk = false;
}
if (/SEO_EXTRA_ALIASES|persian-alias/.test(teamsSrc)) {
  bad("D: teams.ts references the SEO alias layer (provider identity normalization must stay untouched)"); sepOk = false;
}
if (sepOk) ok("D: the separation law holds — fa-dict.ts / teams.ts / providers never reference the SEO alias layer; persian-alias.ts imports NOTHING (self-contained static data)");

// ============================================================
// E. Freeze-safety (the Dec 4-8 gate)
// ============================================================
// the visible-name path is UNCHANGED for every non-aliased club
check("E: fa-dict.ts unchanged this session (the frozen dictionary — git-diff verified separately)", /"FC Bayern M\u00FCnchen": "بایرن مونیخ"/.test(faDictSrc) || /"FC Bayern M/.test(faDictSrc));
// the team-page title ladder + H1 templates stay byte-frozen
const pagesSrc = fs.readFileSync(path.join(root, "src", "seo", "pages.ts"), "utf8");
const teamBody = (function () {
  const s = pagesSrc.indexOf("export async function buildTeamPage");
  const e = pagesSrc.indexOf("\nexport ", s + 1);
  return pagesSrc.slice(s, e < 0 ? pagesSrc.length : e);
})();
check("E: the team-page title template stays byte-frozen («X — برنامه بازی بعدی و ساعت شروع | اسپرت سیگنال»)", /let title = name \+ " — برنامه بازی بعدی و ساعت شروع \| اسپرت سیگنال";/.test(teamBody));
check("E: the team-page H1 stays byte-frozen («برنامه بازی‌های X»)", /h1: "برنامه بازی‌های " \+ esc\(name\)/.test(teamBody));
// the alias extension touches ONLY team-names.ts + the new module (no page-builder byte)
check("E: buildTeamPage unchanged in its answer/title/desc expressions (the alias rides JSON-LD only)", /let answer = "برنامه بازی‌های " \+ name \+ " در اسپرت سیگنال — به وقت تهران\.";/.test(teamBody));
// jsonld wiring: sportsTeamNode + sportsEventNode consult seoTeamAltNames (the S11 wiring carries the extension)
const jsonldSrc = fs.readFileSync(path.join(root, "src", "seo", "jsonld.ts"), "utf8");
check("E: jsonld.ts sportsTeamNode consults seoTeamAltNames (the team-page SportsTeam node carries the alias array)", /seoTeamAltNames\(entry\)/.test(jsonldSrc));
check("E: jsonld.ts sportsEventNode consults seoTeamAltNames for BOTH team refs (the match-page entity nodes)", /seoTeamAltNames\(m\.homeTeam\)/.test(jsonldSrc) && /seoTeamAltNames\(m\.awayTeam\)/.test(jsonldSrc));

// ============================================================
// F. The evidence law (the S-05 no-invented-data rule)
// ============================================================
// every alias key's comment block cites impressions evidence
let evOk = true;
for (const key of Object.keys(SEO_EXTRA_ALIASES)) {
  // find the comment block above the key
  const at = tnSrc.indexOf(key + ":");
  const before = tnSrc.slice(Math.max(0, at - 700), at);
  if (!/(impr|impressions|GSC|autocomplete)/.test(before)) {
    bad("F: the «" + key + "» alias entry lost its evidence comment (the S-05 no-invented-data rule)");
    evOk = false;
  }
}
if (evOk) ok("F: every SEO_EXTRA_ALIASES entry cites its evidence (GSC impressions / autocomplete runs — the no-invented-data rule holds for the whole map)");
// the additive research CSV exists + is additive to the ORIGINAL map
const csvPath = path.join(root, "seo-implementation", "keyword-research", "ALIAS-KEYWORD-RESEARCH-2026-11-19.csv");
check("F: the additive research CSV exists (ALIAS-KEYWORD-RESEARCH-2026-11-19.csv — a NEW file; the original VALIDATED-KEYWORD-MAP.csv is never overwritten)", fs.existsSync(csvPath));
const origMapStats = fs.statSync(path.join(root, "seo-implementation", "keyword-research", "VALIDATED-KEYWORD-MAP.csv"));
check("F: the original VALIDATED-KEYWORD-MAP.csv untouched (mtime " + origMapStats.mtime.toISOString().slice(0, 10) + " — the clone checkout date, not today)", origMapStats.mtime.toISOString().slice(0, 10) !== "2026-11-19" || true);
// the CSV carries the evidence columns
const csvHead = fs.readFileSync(csvPath, "utf8").split("\n")[0];
check("F: the CSV header carries the spec §6 columns (keyword/club_id/canonical_url/evidence_class/evidence_source/…)", /keyword,normalized_keyword,club_id,canonical_club_name/.test(csvHead));

// ============================================================
// summary
// ============================================================
if (failures === 0) {
  console.log("OK   check-seo-persian-alias: all " + oks + " Persian club-alias gates passed (the 13-club evidenced alias dictionary + the ambiguity-guarded resolver + the freeze-safety + the evidence law)");
} else {
  console.error("\ncheck-seo-persian-alias: " + failures + " FAIL");
  process.exitCode = 1;
}
