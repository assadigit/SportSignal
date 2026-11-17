#!/usr/bin/env node
// scripts/check-seo-faq.js
// SEO Follow-up Track Session 17 (S17 — the P1-6 gap fix,
// docs/specs/seo-followup-track.md §Session 17): the FAQPage + Question +
// Answer structured data + the visible Q&A on the team + match detail pages.
// The Q&A is real (sourced from the fixture data) + Persian; NEVER a "where
// to watch" Q (the no-broadcast-claims law — S-04/S-05). Freeze-safe: an
// additive JSON-LD node + an additive visible section BELOW the
// answer-sentence — NOT a byte-frozen title/H1/description/answer-sentence
// byte (the Dec 4-8 freeze holds).
//
// Gates:
//   1-2.  the reused faqNode helper (jsonld.ts — the hub SS-06 builder,
//         byte-frozen since v13.219-faq) + the authored team content module.
//   3-8.  the REAL buildTeamFaqItems behavior (ts.transpileModule extraction
//         with stubbed date/comp/name helpers — the check-match-centre
//         faqContentEngine pattern; never re-implemented): the 3 spec Qs, the
//         fixture-facts answer, the multi-competition join, the honest empty
//         answer, the Q2/Q3 omission (MISSING-IS-NOT-ZERO).
//   9.    buildTeamPage wiring: the ONE teamFaq array feeds BOTH the visible
//         section (M.faqHtml) AND the FAQPage node (JL.faqNode) — the T-20
//         byte-identical contract.
//   10.   the freeze-coordination: the visible Q&A sits BELOW the
//         answer-sentence (source order in the main assembly) + the
//         byte-frozen team-page title/H1/answer-lead strings unchanged.
//   11.   buildMatchPage wiring: the FAQPage node fed from the SAME
//         buildMatchFaqItems source as the visible accordion (the
//         owner-authorized GEO emit path — S17 supersedes the Match Centre
//         S16-Schema omit decision).
//   12.   the no-broadcast-claim rule: NO «پخش زنده» / "where to watch" /
//         "watch live" / broadcast / stream strings in the FAQ content.
//   13.   the MISSING-IS-NOT-ZERO law (match): the venue Q omits when no
//         venue — never a «نامشخص» placeholder.
//   14.   the team-page @graph gains NO SportsEvent (the S8 law — the team
//         page is a schedule hub, not an event).
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

let failures = 0;
let oks = 0;
function ok(msg) { oks++; console.log("OK   check-seo-faq: " + msg); }
function bad(msg) { console.error("FAIL check-seo-faq: " + msg); failures++; }

const jsonldSrc = fs.readFileSync(path.join(root, "src", "seo", "jsonld.ts"), "utf8");
const faqSrc = fs.readFileSync(path.join(root, "src", "seo", "faq-content.ts"), "utf8");
const pagesSrc = fs.readFileSync(path.join(root, "src", "seo", "pages.ts"), "utf8");

// ---------- 1. the reused faqNode helper (jsonld.ts — unmodified) ----------
if (/export function faqNode\(qas: \{ q: string; a: string \}\[\]\): any \{/.test(jsonldSrc) &&
    /"@type": "FAQPage",/.test(jsonldSrc) && /"@type": "Question",/.test(jsonldSrc) && /"@type": "Answer",/.test(jsonldSrc)) {
  ok("the faqNode helper is the reused hub builder (jsonld.ts — FAQPage + Question + Answer; byte-frozen since v13.219-faq, NOT modified by S17)");
} else {
  bad("the faqNode helper drifted in jsonld.ts (the hub SS-06 builder — S17 must REUSE it, never rewrite it)");
}

// ---------- 2. the authored team content module ----------
if (/export function buildTeamFaqItems\(/.test(faqSrc) && /import \{ seoTeamFaName \} from "\.\/team-names";/.test(faqSrc)) {
  ok("faq-content.ts exports buildTeamFaqItems + imports seoTeamFaName (the module owns the authored FAQ copy — extended from the match Q&A to the team Q&A; single-line imports only — the check-match-centre faqContentEngine strip pattern stays safe)");
} else {
  bad("faq-content.ts lost the buildTeamFaqItems export or its seoTeamFaName import (single-line discipline)");
}

// ---------- 3-8. the REAL buildTeamFaqItems behavior ----------
function teamFaqEngine() {
  const ts = require(path.join(root, "node_modules", "typescript"));
  const src = fs.readFileSync(path.join(root, "src", "seo", "faq-content.ts"), "utf8")
    .replace(/^import\s+[^;]+;\n?/gm, "")
    .replace(/^export\s+/gm, "");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.None, target: "ES2020" } }).outputText;
  const stubs = {
    faDateD1: function (iso) { return "D1(" + iso + ")"; },
    faTime: function (iso) { return "T(" + iso + ")"; },
    compNameFa: function (s) { return (s && s.competition && s.competition.faName) || ""; },
    seoTeamFaName: function (t) { return String((t && (t.faName || t.name)) || ""); }
  };
  return new Function(...Object.keys(stubs), js + "\nreturn { buildTeamFaqItems };")(...Object.values(stubs));
}
const tf = teamFaqEngine();
if (typeof tf.buildTeamFaqItems !== "function") {
  bad("the REAL buildTeamFaqItems could not be extracted from faq-content.ts (ts.transpileModule + stubs — the check-match-centre faqContentEngine pattern)");
} else {
  const mkSm = (date, compFa, code, hFa, aFa) => ({
    s: { utcDate: date, homeTeam: { name: "H" + code, faName: hFa }, awayTeam: { name: "A" + code, faName: aFa }, competition: { faName: compFa, code: code } },
    raw: { status: "SCHEDULED" }
  });
  const pl = mkSm("2026-11-29T15:00:00Z", "لیگ برتر انگلیس", "PL", "لیورپول", "اورتون");
  const fac = mkSm("2026-12-03T20:00:00Z", "جام حذفی انگلیس", "FAC", "لیورپول", "چلسی");

  // 3. the full case: a next fixture + one competition → the 3 spec Qs.
  const full = tf.buildTeamFaqItems("بارسلونا", [pl]);
  if (full.length === 3 &&
      full[0].q === "بازی بعدی بارسلونا کی است؟" &&
      full[1].q.indexOf("بازی") === 0 && full[1].q.indexOf("در کدام لیگ است؟") >= 0 &&
      full[2].q.indexOf("ساعت بازی بعدی بارسلونا") === 0 && full[2].q.indexOf("به وقت تهران چند است؟") >= 0) {
    ok("the 3 spec Qs (S17-M1): «بازی بعدی X کی است؟» / «بازی‌های X در کدام لیگ است؟» / «ساعت بازی بعدی X به وقت تهران چند است؟» — the GSC query heads, authored once, real + Persian");
  } else {
    bad("the team Q set drifted from the S17-M1 spec (expected the 3 spec Qs; got " + JSON.stringify(full.map((x) => x.q)) + ")");
  }

  // 4. Q1's answer carries the fixture facts (date + competition + Tehran time).
  if (full[0].a.indexOf("لیورپول – اورتون") >= 0 && full[0].a.indexOf("لیگ برتر انگلیس") >= 0 &&
      full[0].a.indexOf("D1(2026-11-29T15:00:00Z)") >= 0 && full[0].a.indexOf("T(2026-11-29T15:00:00Z)") >= 0 &&
      full[0].a.indexOf("به وقت تهران") >= 0) {
    ok("Q1's answer carries the real next-fixture facts (the fixture + the competition + faDateD1 + faTime + «به وقت تهران») — sourced from the team's OWN upcoming list, never invented");
  } else {
    bad("Q1's answer lost the fixture facts (date/competition/Tehran time): " + JSON.stringify(full[0] && full[0].a));
  }

  // 5. the multi-competition join: league + cup → both named honestly.
  const multi = tf.buildTeamFaqItems("بارسلونا", [pl, fac]);
  if (multi.length === 3 && multi[1].a.indexOf("لیگ برتر انگلیس و جام حذفی انگلیس") >= 0 && multi[1].a.indexOf("برگزار می‌شود") >= 0) {
    ok("Q2 names ALL the distinct competitions the upcoming fixtures name (league + cup joined with «و» — the honest multi-comp answer, no invented single-league simplification)");
  } else {
    bad("Q2's multi-competition join drifted: " + JSON.stringify(multi[1] && multi[1].a));
  }

  // 6. the empty window: the honest empty answer + the Q2/Q3 omission.
  const empty = tf.buildTeamFaqItems("بارسلونا", []);
  if (empty.length === 1 && empty[0].q === "بازی بعدی بارسلونا کی است؟" &&
      empty[0].a.indexOf("ثبت نشده است") >= 0 && empty[0].a.indexOf("به‌روزرسانی") >= 0 &&
      !empty.some((it) => it.q.indexOf("کدام لیگ") >= 0) && !empty.some((it) => it.q.indexOf("چند است") >= 0)) {
    ok("the empty window (MISSING-IS-NOT-ZERO): Q1 answers honestly («ثبت نشده است… به‌روزرسانی می‌شود» — the hub empty-state precedent) + Q2/Q3 OMIT (no fabricated league/kickoff)");
  } else {
    bad("the empty-window behavior drifted (expected 1 honest Q, Q2/Q3 omitted): " + JSON.stringify(empty.map((x) => x.q)));
  }

  // 7. Q3's answer: the Tehran kickoff + the TRUE UTC pointer.
  if (full[2].a.indexOf("T(2026-11-29T15:00:00Z)") >= 0 && full[2].a.indexOf("به وقت تهران شروع") >= 0 &&
      full[2].a.indexOf("زمان جهانی") >= 0 && full[2].a.indexOf("صفحه اختصاصی") >= 0) {
    ok("Q3's answer carries the Tehran kickoff time + the UTC pointer (the match page's answer sentence carries «زمان جهانی» — the pointer is true)");
  } else {
    bad("Q3's answer drifted: " + JSON.stringify(full[2] && full[2].a));
  }

  // 8. the degenerate guard.
  if ((tf.buildTeamFaqItems("", [pl]) || []).length === 0 && (tf.buildTeamFaqItems(null, null) || []).length === 0) {
    ok("the degenerate guard: a nameless/null call → [] (the no-empty-cards law — the visible section + the node both omit)");
  } else {
    bad("the degenerate guard drifted (a nameless/null call must return [])");
  }
}

// ---------- 9. the buildTeamPage wiring (the T-20 one-source contract) ----------
const tpStart = pagesSrc.indexOf("export async function buildTeamPage");
let tpEnd = pagesSrc.indexOf("\nexport ", tpStart + 1);
if (tpEnd < 0) tpEnd = pagesSrc.length;
const tpBody = tpStart >= 0 ? pagesSrc.slice(tpStart, tpEnd) : "";
let wiringOk = true;
if (!/const teamFaq = buildTeamFaqItems\(name, upcoming\);/.test(tpBody)) {
  bad("buildTeamPage lost `const teamFaq = buildTeamFaqItems(name, upcoming)` (the authored source array)");
  wiringOk = false;
}
if (!/\(teamFaq\.length \? M\.faqHtml\(teamFaq\) : ""\)/.test(tpBody)) {
  bad("buildTeamPage's visible section lost `M.faqHtml(teamFaq)` (the hub faqcard pattern — the visible Q&A)");
  wiringOk = false;
}
const tpArrayStart = tpBody.indexOf("jsonldNodes:");
const tpArrayEnd = tpBody.indexOf("].filter(Boolean)", tpArrayStart);
if (tpArrayStart < 0 || tpArrayEnd < 0 || !tpBody.slice(tpArrayStart, tpArrayEnd).includes("teamFaq.length ? JL.faqNode(teamFaq) : null")) {
  bad("buildTeamPage's jsonldNodes lost `teamFaq.length ? JL.faqNode(teamFaq) : null` (the FAQPage node inside the @graph)");
  wiringOk = false;
}
if (wiringOk) {
  ok("the T-20 byte-identical contract (team): ONE teamFaq array feeds BOTH M.faqHtml (visible) AND JL.faqNode (JSON-LD) inside buildTeamPage — the visible text and the FAQPage node agree byte-for-byte (the hub faqHtml/faqNode precedent)");
}

// ---------- 10. the freeze-coordination (team page) ----------
let freezeOk = true;
const answerIdx = tpBody.indexOf('\'<div class="answercard">\'');
const faqIdx = tpBody.indexOf("M.faqHtml(teamFaq)");
if (answerIdx < 0 || faqIdx < 0 || faqIdx < answerIdx) {
  bad("the freeze-coordination: the visible Q&A must sit BELOW the answer-sentence (the M.faqHtml(teamFaq) call must come after the answercard in the main assembly)");
  freezeOk = false;
}
// the byte-frozen team-page surfaces are untouched (light re-pin; the deep
// pins live in check-seo-teampages.js gates 3-5).
if (!tpBody.includes('let title = name + " — برنامه بازی بعدی و ساعت شروع | اسپرت سیگنال"') ||
    !tpBody.includes('h1: "برنامه بازی‌های " + esc(name)') ||
    !tpBody.includes('answer = "بازی بعدی " + name + ": "') ||
    !tpBody.includes('answer = "برنامه بازی‌های " + name + " در اسپرت سیگنال')) {
  bad("the freeze-coordination: a byte-frozen team-page surface (title ladder / H1 / answer lead) drifted — the Dec 4-8 freeze is violated");
  freezeOk = false;
}
if (freezeOk) {
  ok("the freeze-coordination: the visible Q&A sits BELOW the answer-sentence + the byte-frozen team-page title/H1/answer-lead strings are unchanged (additive ONLY — the Dec 4-8 freeze holds)");
}

// ---------- 11. the buildMatchPage wiring (the GEO emit path) ----------
// bracket-depth extract the jsonldNodes array (it contains the /<[^>]+>/ regex
// whose ] would fool a naive indexOf — the check-match-centre S20(a1) pattern).
const bmpStart = pagesSrc.indexOf("export async function buildMatchPage");
const headIdx = bmpStart > -1 ? pagesSrc.indexOf("jsonldNodes: [", bmpStart) : -1;
let arrEnd = -1;
if (headIdx > -1) {
  let depth = 0;
  for (let i = headIdx + 13; i < pagesSrc.length; i++) {
    if (pagesSrc[i] === "[") depth++;
    else if (pagesSrc[i] === "]") { depth--; if (depth === 0) { arrEnd = i; break; } }
  }
}
const mpArr = headIdx > -1 && arrEnd > -1 ? pagesSrc.slice(headIdx, arrEnd) : "";
if (mpArr.includes("faqHtml ? JL.faqNode(buildMatchFaqItems(sm)) : null") &&
    mpArr.indexOf("JL.sportsEventNode(") > -1 && mpArr.indexOf("JL.breadcrumbNode(") > -1 &&
    mpArr.indexOf("JL.faqNode") > mpArr.indexOf("JL.sportsEventNode(")) {
  ok("the match-page FAQPage (S17-M2): buildMatchPage's jsonldNodes carries `faqHtml ? JL.faqNode(buildMatchFaqItems(sm)) : null` — the owner-authorized GEO emit path (the S17 spec supersedes the Match Centre S16-Schema omit decision), fed from the SAME buildMatchFaqItems source as the visible accordion (the T-20 byte-identical contract), placed after the SportsEvent node + before the BreadcrumbList (the hub @graph order)");
} else {
  bad("the match-page FAQPage node is missing or misplaced in buildMatchPage's jsonldNodes (the S17-M2 GEO emit path)");
}
// the visible accordion wiring is unchanged (the S16 contract S17 builds on).
if (/faq: faqHtml \? faqHtml \+ matchFaqScript\(\) : "",/.test(pagesSrc) &&
    /const faqHtml = matchFaqHtml\(matchFaqInput\(sm\)\);/.test(pagesSrc) &&
    /buildMatchFaqItems\(sm\)/.test(pagesSrc.slice(pagesSrc.indexOf("function matchFaqInput"), pagesSrc.indexOf("function matchFaqInput") + 400))) {
  ok("the visible accordion wiring is unchanged (matchFaqInput → buildMatchFaqItems → matchFaqHtml + the matchFaqScript ternary — the Match Centre S16 contract S17 builds on; the JSON-LD node reads the SAME buildMatchFaqItems(sm) call)");
} else {
  bad("the visible accordion wiring drifted (matchFaqInput / the faq ternary) — S17 must be additive on top of the S16 accordion");
}

// ---------- 12. the no-broadcast-claim rule ----------
// Scoped to the EXECUTABLE code (comments stripped): the module's header
// QUOTES the law itself ("Never invent broadcast availability…") — the
// comment is the law's record, not a claim.
const faqCode = faqSrc.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
const broadcastPatterns = [/پخش\s*زنده/, /پخش\s*مستقیم/, /where\s+to\s+watch/i, /watch\s+live/i, /broadcast/i, /televis/i, /استریم/, /تماشای\s+زنده/];
if (!broadcastPatterns.some((re) => re.test(faqCode))) {
  ok("the no-broadcast-claim rule: faq-content.ts carries NO «پخش زنده» / «where to watch» / «watch live» / broadcast / stream strings in the executable Q&A code — the S-04/S-05 no-broadcast-claims law holds (the FAQ answers time/venue/league facts ONLY)");
} else {
  bad("a broadcast/watch claim leaked into faq-content.ts (the no-broadcast-claims law — S-04/S-05 — is violated)");
}

// ---------- 13. the MISSING-IS-NOT-ZERO law (match: the venue Q) ----------
// Scoped to the EXECUTABLE code: the venue Q rides the `if (venue)` block; a
// missing venue OMITS the Q (the comment record mentions «نامشخص» as the
// anti-pattern — the code must not).
if (/const venue = s\.venueFa \|\| s\.venue;[\s\S]{0,80}?if \(venue\) \{[\s\S]{0,220}?FAQ_VENUE_Q/.test(faqCode) && !/نامشخص/.test(faqCode)) {
  ok("the MISSING-IS-NOT-ZERO law (match): the venue Q rides `const venue = s.venueFa || s.venue; if (venue) { … FAQ_VENUE_Q … }` — a match with NO venue OMITS the Q (never a «نامشخص» placeholder — the no-fabrication discipline)");
} else {
  bad("the venue Q's conditional omission drifted (a missing venue must OMIT the Q, never a placeholder)");
}

// ---------- 14. the team-page @graph gains NO SportsEvent (the S8 law) ----------
if (!tpBody.includes("JL.sportsEventNode(") && !tpBody.includes('"@type": "SportsEvent"')) {
  ok("the team-page @graph still carries NO SportsEvent (the S8 law — the FAQ addition does not fabricate an event on the schedule page)");
} else {
  bad("a SportsEvent leaked into buildTeamPage (the S8 law — the team page is a schedule hub, not an event)");
}

if (failures) { console.error("\ncheck-seo-faq: " + failures + " failure(s)"); process.exit(1); }
console.log("OK   check-seo-faq: all " + oks + " FAQ gates passed (S17: the FAQPage + the visible Q&A on the team + match detail pages; the real data-sourced Persian Q&A; the no-broadcast-claim rule; the freeze-coordination; the MISSING-IS-NOT-ZERO law; the T-20 byte-identical contract)");
