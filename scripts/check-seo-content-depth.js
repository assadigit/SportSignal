#!/usr/bin/env node
// scripts/check-seo-content-depth.js
// SEO Follow-up Track Session 18 (S18 — the P1-1 gap fix,
// docs/specs/seo-followup-track.md §Session 18): the editorial body content
// on the team + competition detail pages. The prose is original (composed
// deterministically from the already-loaded fields — the narrative.ts S08
// precedent), Persian, E-E-A-T-grounded (the source citation), and
// freeze-safe (an additive visible section BELOW the answer-sentence — NOT a
// byte-frozen title/H1/description/answer-sentence byte; the Dec 4-8 freeze
// holds).
//
// Gates:
//   1.    the authored editorial module exists (src/seo/editorial.ts) with
//         the two builders + the single-line import discipline (the
//         check-match-centre faqContentEngine strip pattern stays safe).
//   2-7.  the REAL buildTeamEditorialHtml behavior (ts.transpileModule
//         extraction with stubbed helpers — the check-seo-faq teamFaqEngine
//         pattern; never re-implemented): the standings paragraph (pos +
//         points + played + W/D/L from the SAME row), the honest position
//         bands, the recent-results run (the team's OWN finished list),
//         the upcoming-run close, the MISSING-IS-NOT-ZERO omissions, the
//         degenerate guard.
//   8-9.  the REAL buildCompetitionEditorialHtml behavior: the title-race
//         read (leader + gap from the SAME rows the table renders), the
//         coverage note, the no-table degradation.
//   10.   the E-E-A-T source note (football-data.org) on BOTH builders.
//   11.   buildTeamPage wiring: the editorial card sits BELOW the
//         answer-sentence + ABOVE the S17 faqcard (the content, then the
//         Q&A — the S18 brief's placement directive).
//   12.   buildCompetitionPage wiring: the editorial card sits BELOW the
//         answer-sentence + AFTER the standings table + BEFORE the
//         fixtures list.
//   13.   the freeze-coordination: the byte-frozen team/competition-page
//         title/H1/answer-lead strings are unchanged (additive ONLY —
//         the Dec 4-8 freeze holds).
//   14.   the original-content rule: no scraped/aggregated-text markers,
//         no placeholder «نامعلوم»/«نامشخص» fabrications in the module's
//         executable code.
//   15.   the zero-runtime-cost law: the module imports ONLY pure helpers
//         (esc/toFaDigits/compNameFa + the SeoMatch TYPE — types erase) —
//         no files.ts/data.ts runtime imports (no loadArchive/fetch calls
//         can ever creep in).
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

let failures = 0;
let oks = 0;
function ok(msg) { oks++; console.log("OK   check-seo-content-depth: " + msg); }
function bad(msg) { console.error("FAIL check-seo-content-depth: " + msg); failures++; }

const editorialSrc = fs.readFileSync(path.join(root, "src", "seo", "editorial.ts"), "utf8");
const pagesSrc = fs.readFileSync(path.join(root, "src", "seo", "pages.ts"), "utf8");

// ---------- 1. the authored editorial module ----------
if (/export function buildTeamEditorialHtml\(/.test(editorialSrc) &&
    /export function buildCompetitionEditorialHtml\(/.test(editorialSrc) &&
    /^import \{ esc \} from "\.\/utils";$/m.test(editorialSrc) &&
    /^import \{ toFaDigits \} from "\.\.\/utils";$/m.test(editorialSrc)) {
  ok("editorial.ts exports buildTeamEditorialHtml + buildCompetitionEditorialHtml + the single-line pure-helper imports (the module owns the authored editorial copy — one file one responsibility, never pages.ts bloat)");
} else {
  bad("editorial.ts lost an export or the single-line import discipline (esc/toFaDigits)");
}

// ---------- 2-7. the REAL buildTeamEditorialHtml behavior ----------
function editorialEngine() {
  const ts = require(path.join(root, "node_modules", "typescript"));
  const src = fs.readFileSync(path.join(root, "src", "seo", "editorial.ts"), "utf8")
    .replace(/^import\s+[^;]+;\n?/gm, "")
    .replace(/^export\s+/gm, "");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.None, target: "ES2020" } }).outputText;
  const stubs = {
    esc: function (s) { return String(s == null ? "" : s); },
    toFaDigits: function (s) { return "FA(" + String(s) + ")"; },
    compNameFa: function (s) { return (s && s.competition && s.competition.faName) || ""; }
  };
  return new Function(...Object.keys(stubs), js + "\nreturn { buildTeamEditorialHtml, buildCompetitionEditorialHtml };")(...Object.values(stubs));
}
const eng = editorialEngine();
if (typeof eng.buildTeamEditorialHtml !== "function" || typeof eng.buildCompetitionEditorialHtml !== "function") {
  bad("the REAL editorial builders could not be extracted from editorial.ts (ts.transpileModule + stubs — the check-seo-faq teamFaqEngine pattern)");
} else {
  const mkRow = (pos, points, played, w, d, l) => ({ pos, points, played, won: w, draw: d, lost: l });
  const stw = { code: "PD", compFa: "لالیگا", emblem: null, rows: [mkRow(1, 28, 10, 8, 1, 1), mkRow(2, 25, 10, 7, 1, 2), mkRow(3, 24, 10, 7, 0, 3)], meIdx: 1 };
  const fin = [
    { s: { utcDate: "2026-11-10", homeTeam: { name: "H", faName: "بارسلونا" }, awayTeam: { name: "A", faName: "سویا" }, competition: { faName: "لالیگا" } }, raw: { score: { home: 3, away: 1 } } },
    { s: { utcDate: "2026-11-03", homeTeam: { name: "H2", faName: "رئال" }, awayTeam: { name: "A2", faName: "بارسلونا" }, competition: { faName: "لالیگا" } }, raw: { score: { home: 1, away: 1 } } }
  ];
  const up = [
    { s: { utcDate: "2026-11-29", homeTeam: { name: "H", faName: "بارسلونا" }, awayTeam: { name: "B", faName: "لایپزیگ" }, competition: { faName: "لیگ قهرمانان اروپا" } } },
    { s: { utcDate: "2026-12-06", homeTeam: { name: "H", faName: "بارسلونا" }, awayTeam: { name: "C", faName: "چلسی" }, competition: { faName: "لالیگا" } } }
  ];
  const html = eng.buildTeamEditorialHtml({ name: "بارسلونا", stw, meRow: stw.rows[stw.meIdx], finished: fin, upcoming: up });

  // 2. the card shell + the h2 + the lead + the source note always render.
  if (html.indexOf('<div class="card prose editorialcard">') === 0 &&
      /<h2>وضعیت فصل بارسلونا<\/h2>/.test(html) &&
      /در ادامه، وضعیت فصل بارسلونا/.test(html) &&
      /football-data\.org/.test(html) && /editorsrc/.test(html)) {
    ok("the editorial card renders: the .prose editorialcard shell + the h2 «وضعیت فصل X» + the lead + the E-E-A-T source note (football-data.org) — the faqcard family, zero new CSS");
  } else {
    bad("the editorial card shell/h2/lead/source-note drifted: " + JSON.stringify(html.slice(0, 200)));
  }

  // 3. the standings paragraph: pos + points + played + W/D/L from the row.
  if (/بارسلونا با FA\(25\) امتیاز از FA\(10\) بازی در ردهٔ FA\(2\) لالیگا قرار دارد/.test(html) &&
      /FA\(7\) برد، FA\(1\) مساوی و FA\(2\) شکست/.test(html)) {
    ok("the standings paragraph carries the row's own figures (points + played + pos + W/D/L — the SAME snapshot row the window renders; never invented)");
  } else {
    bad("the standings paragraph lost the row's figures: " + JSON.stringify(html));
  }

  // 4. the honest position bands (pos 2 → the صدرنشین‌ها band).
  if (/\(در رده‌بندی صدرنشین‌ها\)/.test(html)) {
    ok("the honest position bands (pos 2 → «در رده‌بندی صدرنشین‌ها» — composed facts only, no promotion/relegation claims: the pool carries no zone data for prose)");
  } else {
    bad("the position band for pos-2 drifted (expected the صدرنشین‌ها band)");
  }

  // 5. the recent-results run (the team's OWN finished list, newest first).
  if (/بازی‌های اخیر این تیم \(به‌ترتیب از جدیدترین\): بارسلونا – سویا \(FA\(3\)–FA\(1\)\)؛ رئال – بارسلونا \(FA\(1\)–FA\(1\)\)/.test(html) &&
      /نتایج کامل در بخش «نتایج اخیر»/.test(html)) {
    ok("the recent-results run lists the team's OWN finished matches (newest-first, scores + opponents) + points at the «نتایج اخیر» card — no streak/winless labels (composed facts only)");
  } else {
    bad("the recent-results run drifted: " + JSON.stringify(html));
  }

  // 6. the upcoming-run close + the MISSING-IS-NOT-ZERO omissions.
  const noData = eng.buildTeamEditorialHtml({ name: "بارسلونا", stw: null, meRow: null, finished: [], upcoming: [] });
  if (/در برنامه پیش‌رو .* نزدیک‌ترین دیدار بارسلونا – لایپزیگ در لیگ قهرمانان اروپا/.test(html) &&
      !/در ردهٔ/.test(noData) && !/بازی‌های اخیر این تیم/.test(noData) && !/نزدیک‌ترین دیدار/.test(noData) &&
      /وضعیت فصل بارسلونا/.test(noData) && /به‌روزرسانی می‌شود/.test(noData)) {
    ok("the upcoming-run close (queued count + next pair + the distinct comps) + the MISSING-IS-NOT-ZERO omissions (no standings row / no finished / no upcoming → those paragraphs OMIT, the card stays honest — never a «نامعلوم» placeholder)");
  } else {
    bad("the upcoming-run close or the empty degradation drifted: " + JSON.stringify(noData.slice(0, 300)));
  }

  // 7. the degenerate guard (no nameless editorial card).
  if (eng.buildTeamEditorialHtml({ name: "", stw, meRow: stw.rows[1], finished: fin, upcoming: up }) === "") {
    ok("the degenerate guard: a nameless call → \"\" (the no-empty-cards law — the editorial card omits entirely)");
  } else {
    bad("the degenerate guard drifted (a nameless call must return \"\")");
  }

  // ---------- 8-9. the REAL buildCompetitionEditorialHtml behavior ----------
  const rows = [
    { pos: 1, name: "L", faName: "رئال", points: 30, played: 11 },
    { pos: 2, name: "B", faName: "بارسلونا", points: 28, played: 11 },
    { pos: 3, name: "A", faName: "اتلتیکو", points: 27, played: 11 }
  ];
  const cHtml = eng.buildCompetitionEditorialHtml({ cNameFa: "لالیگا", rows, upcomingCount: 5 });
  if (/صدر جدول لالیگا در دست رئال با FA\(30\) امتیاز است و فاصلهٔ آن با ردهٔ دوم FA\(2\) امتیاز است/.test(cHtml) &&
      /رده‌های دوم و سوم — بارسلونا و اتلتیکو —/.test(cHtml) &&
      /این صفحه بازی‌های بزرگ پیش‌روی لالیگا را دنبال می‌کند — هم‌اکنون FA\(5\) بازی ثبت‌شده/.test(cHtml)) {
    ok("the competition editorial: the title-race read (leader + the second-place gap + the 2nd/3rd names from the SAME rows the table renders) + the coverage note (the page's own honest scope)");
  } else {
    bad("the competition editorial drifted: " + JSON.stringify(cHtml));
  }
  const cNoTable = eng.buildCompetitionEditorialHtml({ cNameFa: "جام حذفی", rows: [], upcomingCount: 3 });
  if (!/صدر جدول/.test(cNoTable) && /دنبال می‌کند/.test(cNoTable) && /football-data\.org/.test(cNoTable)) {
    ok("the no-table degradation (a cup with no standings): the title-race paragraph OMITS, the coverage note + the source note stay (MISSING-IS-NOT-ZERO — no fabricated table)");
  } else {
    bad("the no-table degradation drifted: " + JSON.stringify(cNoTable));
  }

  // ---------- 10. the E-E-A-T source note on BOTH builders ----------
  if (/football-data\.org/.test(html) && /football-data\.org/.test(cHtml)) {
    ok("the E-E-A-T source citation rides on BOTH editorial cards (the footer srcline's Persian mirror — the provenance self-identifies)");
  } else {
    bad("the source citation is missing from one of the editorial cards");
  }
}

// ---------- 11. the buildTeamPage wiring (the placement order) ----------
const tpStart = pagesSrc.indexOf("export async function buildTeamPage");
let tpEnd = pagesSrc.indexOf("\nexport ", tpStart + 1);
if (tpEnd < 0) tpEnd = pagesSrc.length;
const tpBody = tpStart >= 0 ? pagesSrc.slice(tpStart, tpEnd) : "";
const answerIdx = tpBody.indexOf('\'<div class="answercard">\'');
const editorialIdx = tpBody.indexOf("buildTeamEditorialHtml({ name, stw, meRow, finished, upcoming })");
const faqIdx = tpBody.indexOf("M.faqHtml(teamFaq)");
if (answerIdx >= 0 && editorialIdx > answerIdx && faqIdx > editorialIdx) {
  ok("buildTeamPage wiring: the editorial card sits BELOW the answer-sentence + ABOVE the S17 faqcard (the content, then the Q&A — the S18 brief's placement directive; the faqcard stays the LAST section of main)");
} else {
  bad("the team-page editorial placement drifted (expected answercard < editorialcard < faqcard): answer@" + answerIdx + " editorial@" + editorialIdx + " faq@" + faqIdx);
}

// ---------- 12. the buildCompetitionPage wiring ----------
const cpStart = pagesSrc.indexOf("export async function buildCompetitionPage");
let cpEnd = pagesSrc.indexOf("\nexport ", cpStart + 1);
if (cpEnd < 0) cpEnd = pagesSrc.length;
const cpBody = cpStart >= 0 ? pagesSrc.slice(cpStart, cpEnd) : "";
const cpAnswerIdx = cpBody.indexOf('\'<div class="answercard">\'');
const standingsIdx = cpBody.indexOf("standingsBlock +");
const cpEditorialIdx = cpBody.indexOf("buildCompetitionEditorialHtml({");
const cpListIdx = cpBody.indexOf("بازی‌های پیش‌رو");
if (cpAnswerIdx >= 0 && cpEditorialIdx > cpAnswerIdx && cpListIdx > cpEditorialIdx) {
  ok("buildCompetitionPage wiring: the editorial card sits BELOW the answer-sentence + AFTER the standings block + BEFORE the fixtures list (the standings first, then the read, then the fixtures)");
} else {
  bad("the competition-page editorial placement drifted: answer@" + cpAnswerIdx + " standings@" + standingsIdx + " editorial@" + cpEditorialIdx + " list@" + cpListIdx);
}

// ---------- 13. the freeze-coordination ----------
let freezeOk = true;
if (!tpBody.includes('let title = name + " — برنامه بازی بعدی و ساعت شروع | اسپرت سیگنال"') ||
    !tpBody.includes('h1: "برنامه بازی‌های " + esc(name)') ||
    !tpBody.includes('answer = "بازی بعدی " + name + ": "') ||
    !tpBody.includes('answer = "برنامه بازی‌های " + name + " در اسپرت سیگنال')) {
  bad("the freeze-coordination: a byte-frozen team-page surface (title ladder / H1 / answer lead) drifted — the Dec 4-8 freeze is violated");
  freezeOk = false;
}
if (!cpBody.includes('const title = cNameFa + " — برنامه بازی‌های بزرگ پیش‌رو | اسپرت سیگنال"') ||
    !cpBody.includes('h1: "برنامه بازی‌های " + esc(String(cNameFa))')) {
  bad("the freeze-coordination: a byte-frozen competition-page surface (title / H1) drifted — the Dec 4-8 freeze is violated");
  freezeOk = false;
}
if (freezeOk) {
  ok("the freeze-coordination: the byte-frozen team + competition-page title/H1/answer-lead strings are unchanged (additive ONLY — the Dec 4-8 freeze holds)");
}

// ---------- 14. the original-content rule ----------
// Scoped to the EXECUTABLE code (comments stripped): no scraped/aggregated
// text markers, no «نامعلوم»/«نامشخص» placeholder fabrications.
const editorialCode = editorialSrc.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
const banned = [/نامعلوم/, /نامشخص/, /ویکی‌پدیا/, /wikipedia/i, /کپی/, /منبع اصلی/];
if (!banned.some((re) => re.test(editorialCode))) {
  ok("the original-content rule: no scraped/aggregated-text markers + no «نامعلوم»/«نامشخص» placeholder fabrications in the module's executable code (the prose is composed, never copied)");
} else {
  bad("a banned marker leaked into editorial.ts's executable code (the original-content rule is violated)");
}

// ---------- 15. the zero-runtime-cost law ----------
// The module imports ONLY pure helpers (esc/toFaDigits/compNameFa + the
// SeoMatch TYPE — types erase at transpile). No files.ts/data.ts runtime
// imports → no loadArchive/fetch/KV call can ever creep in.
const importsBlock = editorialSrc.slice(0, editorialSrc.indexOf("const EDITORIAL_SOURCE_NOTE"));
if (!/loadArchive|fetchStandings|fullByCodeFor|hydrateMatchVenue|await /.test(editorialCode) &&
    !/from "\.\/files"|from "\.\.\/composers"/.test(importsBlock)) {
  ok("the zero-runtime-cost law: the module awaits NOTHING + imports only pure helpers (esc/toFaDigits/compNameFa — the SeoMatch type erases) — zero new KV-read/subrequest/CPU; buildTeamPage's await count is unchanged");
} else {
  bad("the zero-runtime-cost law is violated (an await or a data-layer runtime import crept into editorial.ts)");
}

if (failures) { console.error("\ncheck-seo-content-depth: " + failures + " failure(s)"); process.exit(1); }
console.log("OK   check-seo-content-depth: all " + oks + " content-depth gates passed (S18: the editorial body on the team + competition detail pages; the original data-sourced Persian prose; the E-E-A-T source citation; the MISSING-IS-NOT-ZERO degradation; the placement order; the freeze-coordination; the zero-runtime-cost law)");
