#!/usr/bin/env node
// check-phase2-freeze-lift.js — the standing Persian-alias PHASE-2 reminder gate
// (docs-only, wired into `npm test`).
//
// WHY THIS EXISTS (the owner's 2026-11-19 ask): phase 2 of the Persian-alias
// SEO work is BLOCKED until the Dec 4-8 2026 GSC measurement freeze lifts
// (earliest Dec 9, 2026) AND the owner supplies the fresh Dec 4-8 GSC export
// (scripts/extract-alias-evidence.js re-derives the alias evidence from it —
// no export, no evidence, NEVER fabricate). The owner asked for a reminder
// "to remind yourself, even if i forgot. like i say finish remaining work,
// you find it and do it on time."
//
// This gate pins EVERY reminder surface so none can silently rot:
//   1. seo-implementation/next-session-prompt.md — the agent-side prompt (the
//      FIRST thing every future session reads after AGENTS.md/HANDOFF).
//   2. docs/HANDOFF.md — the phase-2 banner + the Open follow-ups row.
//   3. The GitHub workflow .github/workflows/phase2-freeze-lift-reminder.yml
//      (Dec 9 + Dec 16 UTC, year-guarded 202612, read-only) that PINGS the
//      standing [PERSIAN-ALIAS-PHASE-2] GitHub issue (assadigit/SportSignal#4,
//      opened 2026-11-19 carrying the full phase-2 prompt; a comment notifies
//      the owner — the issue creator + the repo watcher) so the owner gets
//      pinged even if they forget.
//   4. The CHANGELOG entry recording the layer.
//
// COMPLETION SIGNAL: when phase 2 ships, the retirement clause (DECISIONS
// PCA-2) deletes THIS file — its absence from main is the workflow's
// completion guard (the workflow then no-ops).
//
// GATE DESIGN: everything here is a docs/workflow existence+content pin.
// Assertions test CONTENT ANCHORS over whitespace-normalized text (markdown
// reflows must not false-FAIL the gate — the first draft learned this the
// hard way: "verify the\nremote" broke a raw regex). ZERO runtime code
// changes, ZERO SEO surfaces, ZERO byte-frozen bytes. The gate FAILS if any
// reminder surface is deleted or drifts from the plan.
//
// Run: node scripts/check-phase2-freeze-lift.js  (also in `npm test`)

const fs = require("fs");
const path = require("path");

const R = path.join(__dirname, "..");
let fails = 0;
let passes = 0;
function check(desc, ok) {
  if (ok) {
    passes++;
    console.log("  ok " + passes + " — " + desc);
  } else {
    fails++;
    console.log("FAIL " + fails + " — " + desc);
  }
}
function read(p) {
  return fs.readFileSync(path.join(R, p), "utf8");
}
function exists(p) {
  return fs.existsSync(path.join(R, p));
}
// Collapse ALL whitespace (incl. newlines) to single spaces, so line-wrapping
// in markdown never breaks a content assertion.
function norm(s) {
  return s.replace(/\s+/g, " ");
}

console.log("check-phase2-freeze-lift — the standing phase-2 reminder surfaces");

// ---------------------------------------------------------------------------
// 1. The next-session prompt carries the phase-2 objective + gates
// ---------------------------------------------------------------------------
const nspRaw = read("seo-implementation/next-session-prompt.md");
const nsp = norm(nspRaw);
check(
  "next-session-prompt.md exists and opens with the AGENTS.md-first line",
  nspRaw.startsWith("# SportSignal — Next-Session Prompt") &&
    /Read AGENTS\.md in the repo root first and follow it for the whole session\./.test(nsp)
);
check(
  "the prompt names the phase-2 objective (Persian-alias SEO phase 2, post-freeze, Dec 4-8)",
  /Persian-alias SEO phase 2/.test(nsp) &&
    /post-freeze/.test(nsp) &&
    /Dec 4-8/.test(nsp)
);
check(
  "the prompt carries the THREE unblocks: the date + the owner lift decision + the fresh Dec 4-8 GSC export",
  /Dec 9, 2026/.test(nsp) &&
    /freeze is lifted/i.test(nsp) &&
    /GSC export/.test(nsp) &&
    /extract-alias-evidence\.js/.test(nsp)
);
check(
  "the prompt carries the work order: export re-derivation + S18 editorial (owner-gated) + deferred candidates + gates",
  /Re-derive the alias evidence/.test(nsp) &&
    /S18 editorial/.test(nsp) &&
    /deferred candidates/i.test(nsp) &&
    /من یونایتد/.test(nsp) &&
    /npm test/.test(nsp)
);
check(
  "the prompt carries the non-negotiables (one canonical URL per club, no doorway pages, no unsupported intents, allowlist untouched, no provider/KV/cron changes)",
  /one canonical URL/.test(nsp) &&
    /doorway/.test(nsp) &&
    /streaming\/lineups\/tickets\/betting/.test(nsp) &&
    /BIG_TEAMS_BY_LEAGUE/.test(nsp) &&
    /provider\/KV\/cron/.test(nsp)
);
check(
  "the prompt carries the deploy disciplines (no live-match-window deploys, verify remote before push AND deploy, RUNBOOK §2)",
  /live-match/.test(nsp) &&
    /verify the remote/.test(nsp) &&
    /RUNBOOK §2/.test(nsp)
);
check(
  "the prompt says the export re-derivation NEVER fabricates (absent export ⇒ stop and report)",
  /never fabricate/i.test(nsp) && /stop and report/i.test(nsp)
);

// ---------------------------------------------------------------------------
// 2. HANDOFF carries the phase-2 banner + the Open follow-ups row
// ---------------------------------------------------------------------------
const ho = norm(read("docs/HANDOFF.md"));
check(
  "HANDOFF has the phase-2 banner (the date-gated block near the top)",
  /PERSIAN-ALIAS PHASE 2 — BLOCKED UNTIL THE FREEZE LIFTS/.test(ho) &&
    /Dec 9, 2026/.test(ho)
);
check(
  "the banner names the three unblocks (date + owner lift decision + the export) and forbids shortcutting",
  /owner'?s freeze-lift decision/i.test(ho) &&
    /Dec 4-8 GSC export/.test(ho) &&
    /a date passing alone is NOT proof/i.test(ho)
);
check(
  "HANDOFF Open follow-ups lists the phase-2 row (the dec-9 reminder layer)",
  /The Persian-alias phase-2 reminder layer/.test(ho)
);

// ---------------------------------------------------------------------------
// 3. The GitHub workflow exists with the exact schedule + guards
// ---------------------------------------------------------------------------
const wfPath = ".github/workflows/phase2-freeze-lift-reminder.yml";
check("the reminder workflow file exists", exists(wfPath));
if (exists(wfPath)) {
  const wf = read(wfPath);
  check(
    "the workflow is scheduled Dec 9 + Dec 16 UTC (the year-guard 202612)",
    /cron: "10 8 9 12 \*"/.test(wf) &&
      /cron: "10 8 16 12 \*"/.test(wf) &&
      /202612/.test(wf)
  );
  check(
    "the workflow is read-only (issues: write; NO wrangler, NO deploy command in any run step)",
    /issues: write/.test(wf) &&
      !/wrangler/.test(wf) &&
      !/run:.*\b(deploy|npm publish)\b/.test(wf)
  );
  check(
    "the workflow pings the standing issue (comment = notification) with the three unblocks + the never-fabricate law + the self-retirement note",
    /Read AGENTS\.md in the repo root first/.test(wf) === false && // the prompt lives in the ISSUE, the workflow only points at it
      /PERSIAN-ALIAS-PHASE-2/.test(wf) &&
      /createComment/.test(wf) &&
      /never fabricate/i.test(wf) &&
      /Dec 4-8/.test(wf) &&
      /finish remaining work/i.test(wf)
  );
  check(
    "the workflow is completion-guarded (skips when the gate file is retired = phase 2 shipped)",
    /check-phase2-freeze-lift\.js/.test(wf) &&
      /404/.test(wf) &&
      /shipped/.test(wf)
  );
  check(
    "the workflow instructs closing itself after phase 2 ships (the reminder must not outlive its purpose)",
    /close.*issue|issue.*close/i.test(wf) &&
      /disable.*workflow|workflow.*disable/i.test(wf)
  );
}

// ---------------------------------------------------------------------------
// 4. The CHANGELOG carries the docs-only reminder-layer entry
// ---------------------------------------------------------------------------
const cl = norm(read("CHANGELOG.md"));
check(
  "CHANGELOG has the reminder-layer entry (docs-only, newest-first head area)",
  /phase-2 freeze-lift reminder layer/.test(cl) &&
    /check-phase2-freeze-lift\.js/.test(cl)
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(
  "\n[check-phase2-freeze-lift] " +
    passes +
    " ok / " +
    fails +
    " FAIL — the phase-2 reminder surfaces (prompt + HANDOFF + workflow + CHANGELOG)."
);
if (fails > 0) {
  console.error(
    "The reminder layer drifted — see the FAIL lines. Fix the surface, not the gate (AGENTS.md §4: never weaken a check)."
  );
  process.exit(1);
}
