// build-alias-keyword-csv.js — generate the ADDITIVE Persian club-alias
// keyword CSV (PERSIAN-CLUB-ALIAS-SEO-SPEC deliverable B).
//
// ADDITIVE LAW: this script READS the validated keyword map + the evidence
// log; it never writes either. Output is a NEW file:
//   seo-implementation/keyword-research/ALIAS-KEYWORD-RESEARCH-2026-11-19.csv
// Every row carries its evidence class + source reference (spec §6 rules).
// No search volume is ever fabricated — the volume column is always
// "not available" (no volume tool exists in this program).
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const ev = require("./alias-evidence.json");

function csv(v) {
  v = String(v == null ? "" : v);
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

// Evidence labelling per alias (from the extraction + the evidence-log
// checks run this session; ambiguity decisions follow spec §7.3):
//   accepted      — GSC-observed with >=1 site impression in an
//                   unambiguous club context, or autocomplete-validated for
//                   that club's page; becomes a JSON-LD alternateName alias.
//   deferred      — plausible but zero direct evidence in the current
//                   exports (never enabled in production normalization).
//   ambiguous     — collides across clubs/other entities; NEVER globally
//                   assigned; may appear ONLY inside matchup phrasings that
//                   carry the full second-club name.
//   excluded      — unsupported intent (broadcast/lineup/ticket) or a
//                   spelling not supported by any evidence.
const ALIAS_ROWS = [
  // ---- FC Barcelona (A++) — canonical «بارسلونا», URL /teams/barcelona ----
  { club_id: "barcelona", club: "FC Barcelona", alias: "بارسا", status: "accepted",
    evidence: "GSC-observed", src: "VALIDATED-KEYWORD-MAP.csv rows 42/44/205-216/228-229 (2026-11-15 export)", impr: 245,
    note: "21 GSC-observed rows; «بازی بعدی بارسا» 179 impr avg pos 9.97 — the S11 alias already live; kept + re-cited." },
  { club_id: "barcelona", club: "FC Barcelona", alias: "بارسلنا", status: "deferred",
    evidence: "GSC-observed", src: "VALIDATED-KEYWORD-MAP.csv (1 row, 1 impr)", impr: 1,
    note: "Single 1-impression misspelling row; NOT published as preferred copy — research record only (spec §4.1 misspelling class)." },
  // ---- Real Madrid (A++) — canonical «رئال مادرید», URL /teams/real-madrid ----
  { club_id: "realmadrid", club: "Real Madrid CF", alias: "رئال", status: "accepted",
    evidence: "GSC-observed", src: "VALIDATED-KEYWORD-MAP.csv — «بازی رئال بعدی» + «تاریخ بازی ارسنال و رئال» + «بازی رئال و آرسنال کی است» (2026-11-15 export)", impr: 5,
    note: "Short form observed in club-context queries («رئال بعدی») and in matchup phrasings where the other club is fully named. The map already targets /teams/real-madrid for these." },
  { club_id: "realmadrid", club: "Real Madrid CF", alias: "رئال‌مادرید", status: "deferred",
    evidence: "Research-candidate", src: "spec §4.1 seed (unvalidated)", impr: 0,
    note: "ZWNJ-joined form: 0 GSC rows in the export; captured as a normalization INPUT (ZWNJ/space fold), not a published alias." },
  // ---- Bayern (A+) — canonical «بایرن مونیخ», URL /teams/bayern-munich ----
  { club_id: "bayernmunich", club: "FC Bayern München", alias: "بایرن", status: "accepted",
    evidence: "GSC-observed", src: "VALIDATED-KEYWORD-MAP.csv — «بازی بعدی بایرن» 16 impr avg pos 7.94 + «برنامه بازی بایرن» 4 impr (2026-11-15 export)", impr: 20,
    note: "The strongest non-Barcelona short form in the team-page cluster (بایرن مونیخ total 59 impr)." },
  // ---- Manchester City (A+) — canonical «منچسترسیتی», URL /teams/manchester-city ----
  { club_id: "manchestercity", club: "Manchester City FC", alias: "من سیتی", status: "accepted",
    evidence: "GSC-observed", src: "VALIDATED-KEYWORD-MAP.csv — «بازی بعدی من سیتی» 2 impr avg pos 6 (2026-11-15 export)", impr: 2,
    note: "Low-impression but observed; the map already targets /teams/manchester-city." },
  { club_id: "manchestercity", club: "Manchester City FC", alias: "منچستر سیتی", status: "accepted",
    evidence: "GSC-observed", src: "VALIDATED-KEYWORD-MAP.csv — 7 rows incl. «بازی بعدی منچستر سیتی» 17 impr + «بارسلونا مقابل منچستر سیتی 2026» 103 impr (2026-11-15 export)", impr: 286,
    note: "Separated spelling, heavily observed (286 impr across rows). Normalizes onto the canonical joined form." },
  // ---- Arsenal (A+) — canonical «آرسنال», URL /teams/arsenal ----
  { club_id: "arsenal", club: "Arsenal FC", alias: "ارسنال", status: "accepted",
    evidence: "GSC-observed", src: "VALIDATED-KEYWORD-MAP.csv — «بازی بعدی ارسنال» 10 impr + «تاریخ بازی ارسنال و رئال» 3 impr (2026-11-15 export)", impr: 13,
    note: "The alef-without-madda spelling searchers type; folds onto the canonical «آرسنال»." },
  // ---- Liverpool (A+) — canonical «لیورپول», URL /teams/liverpool ----
  { club_id: "liverpool", club: "Liverpool FC", alias: "لیورپول", status: "accepted",
    evidence: "GSC-observed", src: "VALIDATED-KEYWORD-MAP.csv — 4 rows / 36 impr (2026-11-15 export)", impr: 36,
    note: "Identical to the canonical name — listed for completeness; no separate alias to add." },
  // ---- Inter Milan (A+) — canonical «اینتر میلان», URL /teams/internazionale-milano ----
  { club_id: "intermilan", club: "FC Internazionale Milano", alias: "اینتر", status: "ambiguous",
    evidence: "GSC-observed", src: "VALIDATED-KEYWORD-MAP.csv — «بازی بعدی اینتر» 22 impr (targeted /teams/internazionale-milano); EVIDENCE-LOG A2: «بازی بعدی اینتر» completes to اینتر میامی/اینترنت before اینترمیلان", impr: 22,
    note: "AMBIGUOUS: autocomplete collides to Inter Miami + اینترنت. NOT globally assigned; rides ONLY as a JSON-LD alternateName of the Inter Milan entity (entity-scoped, never a global normalization key). «بازی بعدی اینتر در لیگ قهرمانان اروپا» (autocomplete-validated) disambiguates by competition context." },
  { club_id: "intermilan", club: "FC Internazionale Milano", alias: "اینترمیلان", status: "accepted",
    evidence: "GSC-observed", src: "VALIDATED-KEYWORD-MAP.csv — «بازی بعدی اینترمیلان» 22 impr avg pos 8.82 (2026-11-15 export)", impr: 22,
    note: "Joined spelling, observed; normalizes onto the canonical separated form «اینتر میلان»." },
  // ---- AC Milan (A+) — canonical «آ.ث میلان»/«آث میلان», URL /teams/ac-milan ----
  { club_id: "acmilan", club: "AC Milan", alias: "میلان", status: "ambiguous",
    evidence: "GSC-observed", src: "VALIDATED-KEYWORD-MAP.csv — «بازی بعدی میلان» 6 impr + «بازی میلان» 1 impr (targeted /teams/ac-milan) BUT «بازی بعدی اینترمیلان»/«بازی بعدی اینتر» (44 impr) CONTAIN میلان as a substring of Inter Milan", impr: 7,
    note: "AMBIGUOUS: collides with the CITY + with the Inter-Milan compound. NOT globally assigned; rides ONLY as an entity-scoped JSON-LD alternateName for AC Milan. A bare «میلان» query resolves to AC Milan only in AC-Milan page context." },
  { club_id: "acmilan", club: "AC Milan", alias: "آث‌میلان", status: "deferred",
    evidence: "Research-candidate", src: "spec §4.1 seed (unvalidated)", impr: 0,
    note: "0 direct GSC rows; captured as a normalization INPUT (ZWNJ/dot fold onto «آ.ث میلان»), not a published alias." },
  // ---- PSG (A) — canonical «پاری سن ژرمن», URL /teams/paris-saint-germain ----
  { club_id: "parissaintgermain", club: "Paris Saint-Germain", alias: "پی‌اس‌جی", status: "accepted",
    evidence: "GSC-observed", src: "VALIDATED-KEYWORD-MAP.csv — «لو آور مقابل پی‌اس‌جی» 16 impr (2026-11-15 export)", impr: 16,
    note: "Persian-acronym form observed; normalizes with the ZWNJ/space fold. The fa-dict already keys the Latin «PSG» provider name to «پاری سن ژرمن»." },
  { club_id: "parissaintgermain", club: "Paris Saint-Germain", alias: "پاریس", status: "ambiguous",
    evidence: "GSC-observed", src: "VALIDATED-KEYWORD-MAP.csv — «بازی بعدی پاریس ژرمن» 6 impr + «ساعت بازی بارسلونا پاریس» 1 impr; EVIDENCE-LOG A2: «بازی بعدی بایرن مونیخ و پاریس» (autocomplete)", impr: 7,
    note: "AMBIGUOUS (city vs club). NOT globally assigned; NEVER a JSON-LD alias by itself — matchup phrasings («بارسا و پاریس») resolve to the real covered fixture by participant pair + date, not by a bare «پاریس» key." },
  { club_id: "parissaintgermain", club: "Paris Saint-Germain", alias: "پاریسن ژرمن", status: "accepted",
    evidence: "Autocomplete-validated", src: "EVIDENCE-LOG.md A2 — «ساعت بازی بارسلونا و پاریسن ژرمن» (Google Suggest fa/IR 2026-11-16)", impr: 0,
    note: "Joined misspelling returned by real Google autocomplete; a normalization INPUT (fold onto «پاری سن ژرمن»), never published copy." },
  // ---- Manchester United (A) — canonical «منچستر یونایتد», URL /teams/manchester-united ----
  { club_id: "manchesterunited", club: "Manchester United FC", alias: "من یونایتد", status: "deferred",
    evidence: "Research-candidate", src: "spec §4.1 seed (unvalidated)", impr: 0,
    note: "0 direct rows in the current exports; deferred (spec §4.1 note: validate before publishing)." },
  { club_id: "manchesterunited", club: "Manchester United FC", alias: "منچستر", status: "ambiguous",
    evidence: "GSC-observed", src: "VALIDATED-KEYWORD-MAP.csv — 12 rows split between منچستر سیتی (targets /teams/manchester-city + match pages) and منچستر یونایتد (targets /teams/manchester-united)", impr: 303,
    note: "AMBIGUOUS (City vs United): every «منچستر…» GSC row carries the FULL club word after the city name. The bare «منچستر» is NEVER assigned to either club; the fold happens only with the club qualifier (سیتی/یونایتد)." },
  // ---- Dortmund (A) — canonical «دورتموند», URL /teams/borussia-dortmund ----
  { club_id: "borussiadortmund", club: "Borussia Dortmund", alias: "دورتموند", status: "accepted",
    evidence: "GSC-observed", src: "VALIDATED-KEYWORD-MAP.csv — «بازی بعدی دورتموند» + 2 rows / 19 impr; EVIDENCE-LOG A2: «بازی بعدی دورتموند در لیگ قهرمانان اروپا» (autocomplete)", impr: 19,
    note: "The canonical display name itself; the map's rows target /teams/borussia-dortmund." },
  { club_id: "borussiadortmund", club: "Borussia Dortmund", alias: "بروسیا دورتموند", status: "accepted",
    evidence: "GSC-observed", src: "VALIDATED-KEYWORD-MAP.csv — «بروسیا دورتموند مقابل رئال بتیس» 11 impr (2026-11-15 export)", impr: 11,
    note: "Full transliteration observed in a matchup query; normalizes onto the canonical «دورتموند»." },
  // ---- Atlético Madrid (A) — canonical «اتلتیکو مادرید», URL /teams/club-atletico-de-madrid ----
  { club_id: "atleticomadrid", club: "Club Atlético de Madrid", alias: "اتلتیکو", status: "ambiguous",
    evidence: "GSC-observed", src: "VALIDATED-KEYWORD-MAP.csv — «بازی بعدی اتلتیکو مادرید» 4 impr; EVIDENCE-LOG A2: theautocomplete list has no bare «اتلتیکو» head; the GSC row carries the full «اتلتیکو مادرید»", impr: 4,
    note: "AMBIGUOUS across clubs (Atlético Madrid vs Athletic Bilbao «اتلتیک بیلبائو» in the same dict); rides ONLY entity-scoped — the bare «اتلتیکو» is never a global key." },
  // ---- Chelsea (A) — canonical «چلسی», URL /teams/chelsea ----
  { club_id: "chelsea", club: "Chelsea FC", alias: "چلسی", status: "accepted",
    evidence: "GSC-observed", src: "VALIDATED-KEYWORD-MAP.csv — «بازی بعدی چلسی» 1 impr (2026-11-15 export)", impr: 1,
    note: "Identical to the canonical name — no separate alias; spec §4.1 said verify variants first (none evidenced)." }
];

// The excluded-intent register (spec §5.9) — observed in the GSC export,
// recorded with the exclusion reason; never targeted.
const EXCLUDED = [
  { kw: "ساعت پخش زنده فوتبال", reason: "broadcast/streaming intent — no streaming product (spec §2 out-of-scope)", src: "GSC export 2026-11-15" },
  { kw: "ساعت بازی بارسلونا امشب پخش زنده", reason: "broadcast intent inside a club query — never promise پخش زنده", src: "EVIDENCE-LOG.md A2 autocomplete (fa/IR 2026-11-16)" },
  { kw: "ترکیب رئال مادرید درمقابل آربی لایپزیگ", reason: "lineup intent — no lineup product", src: "GSC export 2026-11-15 (47 impr)" },
  { kw: "ترکیب اسپرتینگ درمقابل منچستر یونایتد", reason: "lineup intent — no lineup product", src: "GSC export 2026-11-15" },
  { kw: "بلیت رئال مادرید درمقابل آربی لایپزیگ", reason: "ticketing intent — no ticket product", src: "GSC export 2026-11-15" },
  { kw: "مکان تماشای منچستر سیتی درمقابل باشگاه فوتبال برایتون اند هوو آلبیون", reason: "watch-where intent — no broadcast/streaming product (101 impr — deliberately not targeted)", src: "GSC export 2026-11-15" },
  { kw: "مکان تماشای باشگاه فوتبال راسینگ سانتاندر درمقابل رئال مادرید", reason: "watch-where intent — no broadcast product (72 impr — deliberately not targeted)", src: "GSC export 2026-11-15" }
];

const URLS = {
  barcelona: "/teams/barcelona", realmadrid: "/teams/real-madrid",
  bayernmunich: "/teams/bayern-munich", manchestercity: "/teams/manchester-city",
  arsenal: "/teams/arsenal", liverpool: "/teams/liverpool",
  intermilan: "/teams/internazionale-milano", acmilan: "/teams/ac-milan",
  parissaintgermain: "/teams/paris-saint-germain", manchesterunited: "/teams/manchester-united",
  borussiadortmund: "/teams/borussia-dortmund", atleticomadrid: "/teams/club-atletico-de-madrid",
  chelsea: "/teams/chelsea"
};
const CANON = {
  barcelona: "بارسلونا", realmadrid: "رئال مادرید", bayernmunich: "بایرن مونیخ",
  manchestercity: "منچسترسیتی", arsenal: "آرسنال", liverpool: "لیورپول",
  intermilan: "اینتر میلان", acmilan: "آ.ث میلان", parissaintgermain: "پاری سن ژرمن",
  manchesterunited: "منچستر یونایتد", borussiadortmund: "دورتموند",
  atleticomadrid: "اتلتیکو مادرید", chelsea: "چلسی"
};
const INTENT = {
  barcelona: "club-identity / next-match / kickoff / matchup / result",
  realmadrid: "club-identity / next-match / kickoff / matchup / result",
  bayernmunich: "club-identity / next-match / kickoff / matchup",
  manchestercity: "club-identity / next-match / kickoff / matchup",
  arsenal: "club-identity / next-match / kickoff / matchup",
  liverpool: "club-identity / next-match / kickoff / matchup",
  intermilan: "club-identity / next-match (competition-qualified)",
  acmilan: "club-identity / next-match",
  parissaintgermain: "club-identity / next-match / matchup",
  manchesterunited: "club-identity / next-match / matchup",
  borussiadortmund: "club-identity / next-match (competition-qualified)",
  atleticomadrid: "club-identity / next-match",
  chelsea: "club-identity / next-match"
};

const HEAD = "keyword,normalized_keyword,club_id,canonical_club_name,matched_alias,canonical_url,intent,evidence_class,evidence_source,evidence_date,locale,gsc_clicks,gsc_impressions,search_volume,volume_source,priority,ambiguity_status,implementation_status,exclusion_reason,notes";
const L = [];
L.push(HEAD);

// One row per ALIAS record (the alias dictionary — deliverable B part 1).
for (const r of ALIAS_ROWS) {
  const amb = r.status === "ambiguous" ? "ambiguous" : "unambiguous";
  const impl =
    r.status === "accepted" ? "accepted→JSON-LD alternateName (freeze-safe)" :
    r.status === "deferred" ? "deferred (research only — not in production)" :
    r.status === "ambiguous" ? "entity-scoped only (never a global key)" :
    "excluded";
  L.push([
    r.alias, CANON[r.club_id], r.club_id, r.club, r.alias, URLS[r.club_id],
    INTENT[r.club_id], r.evidence, r.src, "2026-11-15/2026-11-16", "fa-IR",
    "", String(r.impr || ""), "not available (no volume tool — never invented)", "",
    r.club_id === "barcelona" || r.club_id === "realmadrid" ? "A++" :
      ["bayernmunich", "manchestercity", "arsenal", "liverpool", "intermilan", "acmilan"].includes(r.club_id) ? "A+" : "A",
    amb, impl, "", r.note
  ].map(csv).join(","));
}

// Representative natural-language match-intent rows (deliverable B part 2) —
// every GSC-observed phrasing already validated in the source map; the
// alias-substituted variants are labelled Research-candidate (spec §5 seeds).
const INTENT_ROWS = [
  { kw: "بازی بعدی بارسا", club_id: "barcelona", cls: "GSC-observed", impr: 179, url: "/teams/barcelona", note: "The S11 anchor row (avg pos 9.97)." },
  { kw: "ساعت بازی بارسلونا امشب", club_id: "barcelona", cls: "Research-candidate", impr: 0, url: "/teams/barcelona", note: "Spec §5.3 seed — autocomplete shows «ساعت بازی بارسلونا امشب …» head; the exact joined form unvalidated." },
  { kw: "بازی بارسا با بایرن", club_id: "barcelona", cls: "Research-candidate", impr: 0, url: "/matches/{home}-vs-{away}-{YYYY-MM-DD}", note: "Spec §5.5 seed — resolves to the real covered fixture only when the pair + date match a pool fixture (eligibility law §7.2)." },
  { kw: "نتیجه بازی رئال مادرید", club_id: "realmadrid", cls: "Research-candidate", impr: 0, url: "/matches/{home}-vs-{away}-{YYYY-MM-DD}", note: "Spec §5.7 seed — answerable only from a verified FINISHED fixture (MISSING-IS-NOT-ZERO)." },
  { kw: "بازی بعدی اینتر در لیگ قهرمانان اروپا", club_id: "intermilan", cls: "Autocomplete-validated", impr: 0, url: "/teams/internazionale-milano", note: "Competition-qualified disambiguator (EVIDENCE-LOG A2) — «اینتر» + UCL context resolves to Inter Milan." }
];
for (const r of INTENT_ROWS) {
  L.push([
    r.kw, CANON[r.club_id], r.club_id, "", "", r.url, INTENT[r.club_id],
    r.cls, "VALIDATED-KEYWORD-MAP.csv / EVIDENCE-LOG.md A2 (additive 2026-11-19 extraction)",
    "2026-11-15/2026-11-16", "fa-IR", "", String(r.impr || ""),
    "not available (no volume tool — never invented)", "",
    r.club_id === "barcelona" || r.club_id === "realmadrid" ? "A++" :
      ["bayernmunich", "manchestercity", "arsenal", "liverpool", "intermilan", "acmilan"].includes(r.club_id) ? "A+" : "A",
    r.cls === "GSC-observed" ? "unambiguous" : "unambiguous",
    "research row", "", r.note
  ].map(csv).join(","));
}

// The excluded register (spec §5.9).
for (const r of EXCLUDED) {
  L.push([
    r.kw, "", "", "", "", "", "excluded-intent", "GSC-observed/SERP-observed", r.src,
    "2026-11-15", "fa-IR", "", "", "not available", "", "", "excluded",
    r.reason, "Recorded per spec §5.9 — never targeted with misleading copy."
  ].map(csv).join(","));
}

const OUT = path.join(root, "seo-implementation", "keyword-research", "ALIAS-KEYWORD-RESEARCH-2026-11-19.csv");
fs.writeFileSync(OUT, "\uFEFF" + L.join("\n") + "\n");
console.log("wrote " + OUT + " — " + (L.length - 1) + " data rows");
console.log("alias rows: " + ALIAS_ROWS.length + " (accepted " + ALIAS_ROWS.filter(r => r.status === "accepted").length +
  ", deferred " + ALIAS_ROWS.filter(r => r.status === "deferred").length +
  ", ambiguous " + ALIAS_ROWS.filter(r => r.status === "ambiguous").length + ")");
console.log("excluded rows: " + EXCLUDED.length);
