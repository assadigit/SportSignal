# SportSignal — Next-Session Prompt (Persian-alias SEO phase 2: WAIT for the Dec 4-8 freeze lift, then finish the remaining work)

Read AGENTS.md in the repo root first and follow it for the whole session.

## ⚠️ THE STANDING RULE: phase 2 is DATE-GATED — do not start it early

The Persian-alias SEO phase 2 (the post-freeze follow-up to commit `6fd2f1d`,
`v13.274.0-persianalias`) is **blocked until the Dec 4-8 2026 GSC measurement
freeze lifts (earliest Dec 9, 2026) AND the owner supplies the fresh Dec 4-8
GSC export.** If a session lands before that: read this file, confirm the
block below, and work on something else (the S21+ alerts backlog, or whatever
the owner asks) — the phase-2 work order itself is frozen until the gate
opens. A session asked to "finish remaining work" before Dec 9 finds this
prompt first and does NOT touch the alias surfaces.

**The THREE unblocks (all required, in order):**

1. **The date:** it must be Dec 9, 2026 or later. A date passing alone is
   NOT proof — continue to 2.
2. **The owner's freeze-lift decision:** the owner confirms in the session
   (or a `docs/DECISIONS.md` entry exists) that the freeze is lifted and the
   final measurement record is in. Read `docs/HANDOFF.md` +
   `docs/DECISIONS.md` for it.
3. **The fresh Dec 4-8 GSC export:** the owner uploads it into the session.
   **If absent: stop and report — NEVER fabricate metrics.** The alias
   evidence re-derivation (scripts/extract-alias-evidence.js) runs against
   the REAL export file only.

## State at the phase-1 close (2026-11-19)

- Phase 1 shipped as commit `6fd2f1d`, deployed `v13.274.0-persianalias`
  (Version ID `5c87d8bd-2417-4b02-bbe5-db7de3328e10`, 2026-11-19 ~18:55 UTC,
  live-verified: `/healthz ok:true`, all 8 aliased team pages 200 with the
  alternateName arrays, the byte-frozen surfaces byte-identical). The full
  close-out: `docs/HANDOFF.md` (the Persian Club-Alias SEO session block) +
  `docs/DECISIONS.md` PCA-1.
- `scripts/check-seo-persian-alias.js` (52 gates) rides `npm test`;
  `scripts/persian-alias-smoke.ts` (27/27) is the manual harness.
- `src/seo/persian-alias.ts` stays inert at runtime (imported by nothing —
  the spec §8 separation law); wiring it is a product decision, not an SEO
  tweak (only if the owner asks).
- The research layer is ADDITIVE: `seo-implementation/keyword-research/
  ALIAS-KEYWORD-RESEARCH-2026-11-19.csv` + `ALIAS-RESEARCH-REPORT-2026-11-19.md`;
  the original `VALIDATED-KEYWORD-MAP.csv` is READ-ONLY (never overwritten).

## Phase 2 — the work order (start ONLY after the three unblocks)

a. **Re-derive the alias evidence.** Read the Dec 4-8 GSC export (the owner
   uploads it — if absent, stop and report; never fabricate metrics). Run
   scripts/extract-alias-evidence.js pointed at the new export; update the
   ADDITIVE CSV (never overwrite the original map).
b. **Visible copy — owner-gated.** Only if the owner approves visible-copy
   changes: extend the S18 editorial body (src/seo/editorial.ts) with ONE
   natural alias mention per club page (e.g. «بارسلونا (بارسا)») — no keyword
   stuffing, no new FAQs, titles/H1s/descriptions change ONLY as the owner
   directs.
c. **The deferred candidates.** Re-evaluate من یونایتد، بوروسیا دورتموند،
   Latin PSG, and the ZWNJ joins against the new evidence; enable only what
   gained evidence, each with its evidence comment.
d. **Optional (only if the owner asks):** wire persian-alias.ts into an
   internal search/redirect helper — it is still inert; wiring it is a
   product decision, not an SEO tweak.
e. **Gates.** Add/extend gates for everything changed; `npm test` must stay
   exit 0.

## Non-negotiables (unchanged from phase 1)

one canonical URL per club, no doorway pages, no unsupported intents
(streaming/lineups/tickets/betting), the selected-team allowlist
(`CONFIG.BIG_TEAMS_BY_LEAGUE`) untouched, no provider/KV/cron changes, never
deploy during live-match windows (see HANDOFF standing limits), verify the
remote before push AND before deploy (the S18b lesson), deploy via the
RUNBOOK §2 ritual when authorized.

## The reminder layer (this prompt is one surface of it)

- The standing GitHub issue **assadigit/SportSignal#4**
  (`[PERSIAN-ALIAS-PHASE-2]`, labeled `phase-2-reminder`) carries this full
  prompt in its body — visible on GitHub even without the repo docs.
- The scheduled workflow `.github/workflows/phase2-freeze-lift-reminder.yml`
  (Dec 9 + Dec 16, 2026 UTC, year-guarded, read-only) pings issue #4 with a
  comment (+ reopens it if closed early) so the owner gets notified even if
  they forget; it no-ops once phase 2 ships (its completion guard: the gate
  file below retired from `main`).
- `scripts/check-phase2-freeze-lift.js` (in `npm test`) pins all the reminder
  surfaces so they cannot silently rot. After phase 2 ships: close issue #4,
  disable the workflow, and retire this prompt's reminder section + the gate
  (the check is co-evolved the same session).
- If the owner just says "finish remaining work": find this prompt (or issue
  #4), check the three unblocks, and either start phase 2 (unblocked) or
  report the block honestly.

## Credentials

Credentials are re-supplied by the owner per session; never stored, never
committed. Say "credentials used, not stored" in the report.
