# SportSignal SEO Follow-up Track — Next-Session Prompt (Session 17: the FAQ on the detail pages)

Read AGENTS.md in the repo root first and follow it for the whole session.

You are the implementation agent for the SportSignal SEO follow-up track, Session 17: the FAQ structured data + the visible Q&A on the team + match detail pages (the P1-6 gap from the `docs/audits/2026-11-17-seo-gap-and-swot-audit.md`). The spec plan is `docs/specs/seo-followup-track.md`. Session 16 (the entity-grounding parity + the image sitemap) is DONE — deployed `13.269.0-entity-image` (deployment `2481f840-b7da-4093-a4b7-db4c7888f90e` @100%), commit `142377f`, npm test 3,757 OK.

## The context (read in this order)

1. `AGENTS.md` (the repo root — the operating contract).
2. `docs/specs/seo-followup-track.md` (the multi-session spec — Session 17 = the FAQ).
3. `docs/audits/2026-11-17-seo-gap-and-swot-audit.md` (the gap audit — P1-6 is the FAQ gap; note 5 of 18 audit gaps were verification errors, corrected in S16 + the S17 investigation).
4. `seo-implementation/session-reports/SESSION-16.md` (the S16 report — the entity parity + the image sitemap + the gap-audit corrections).
5. `docs/HANDOFF.md` + `docs/DECISIONS.md` (the current state — S16 deployed).
6. The source: `src/seo/jsonld.ts` (the JSON-LD builders — the `faqNode` function exists for the date hubs; reuse it), `src/seo/pages.ts` (the team-page + match-page builders — where the FAQ node + the visible Q&A are added), `src/seo/page-shell.ts` (the head + the body shell).

## The objective

Add the `FAQPage` + `Question` + `Answer` structured data + a visible Q&A section to the team + match detail pages. The Q&A is real (sourced from the fixture data) + Persian. NEVER a "where to watch" Q (the no-broadcast-claims law — S-04/S-05). Freeze-safe (an additive JSON-LD node + the visible Q&A BELOW the answer-sentence — NOT a byte-frozen title/H1/description/answer-sentence byte; the Dec 4-8 freeze holds).

## The milestones

- **S17-M1 — the FAQPage on the team page.** Add the `FAQPage` JSON-LD node + a visible Q&A section BELOW the answer-sentence. The Q&A (real, data-sourced, Persian):
  - "بازی بعدی [team] کی است؟" → the next fixture (the date + the competition + the Tehran time).
  - "بازی‌های [team] در کدام لیگ است؟" → the competition name.
  - "ساعت بازی به وقت تهران؟" → the kickoff time in Tehran.
  Reuse the existing `faqNode` builder (jsonld.ts — it already builds the FAQPage for the date hubs) + the existing date/time formatters (`tehranParts`, the Jalali calendar). NEVER a "where to watch" / "پخش زنده" Q.
- **S17-M2 — the FAQPage on the match page.** The same for the match page:
  - "بازی [home] – [away] چه ساعتی شروع می‌شود؟" → the kickoff time in Tehran.
  - "این بازی در کدام ورزشگاه است؟" → the venue (if present — the MISSING-IS-NOT-ZERO law: omit the Q if no venue).
  - "این بازی در کامل لیگ است؟" → the competition name.
- **New check gate:** `check-seo-faq.js` (the FAQPage on the team + match pages; the real Q&A; the no-broadcast-claim rule — no "پخش زنده"/"watch live"/"where to watch" Q; the freeze-coordination — the Q&A is BELOW the answer-sentence; the MISSING-IS-NOT-ZERO law for the venue Q).
- **Version bump:** 13.269.0-entity-image → 13.270.0-faq (per the repo convention). Update `src/config.ts` + `package.json` + the `check-stats.js` LIVE version pin (both the v13.258-mca11y pin + the v13.254-rankbadge pin) + the `check-seo-performance.js` version gate (already accepts >= 13.268.0).
- **Deploy + verify live:** `npm test` exit 0 → the local wrangler dev smoke → the versioned deploy (`npx wrangler versions upload` → `npx wrangler versions deploy --version-id <id> --percentage 100 --yes`) → verify the FAQPage on the live team + match pages.

## The standing constraints (carry into the session)

- npm only (never `bun install`); `npm test` exit 0 before every push; versioned deploys only; the Cloudflare free-tier budget (KV writes ≤ 1,000/day; ~50 subrequests/tick; the 10ms CPU cliff — every change states its budget; the FAQ is pure string concatenation on already-loaded data → zero new KV-read/subrequest/CPU).
- The freeze-safety rule: the byte-frozen surfaces (the title/H1/description/answer-sentence) are NOT touched. The FAQ is ADDITIVE (a JSON-LD node + the visible Q&A BELOW the answer-sentence).
- No deploys in the Nov 20 Bayern–Köln S27 auto-verify windows (M1 ~19:35 UTC, M2 ~21:35-45 UTC — check the date before the deploy).
- The commit-message convention: `seo(s17): …`. The one-shot token push; the ls-remote verify. No secrets in the commits. Rotate the GitHub + Cloudflare tokens before starting (they were used across S14-S16).

## The deliverables

- The `check-seo-faq.js` gate (wired into the `npm test` chain).
- The version bump (13.269.0 → 13.270.0) + the `check-stats.js` LIVE pin update.
- The SESSION-17 report (`seo-implementation/session-reports/SESSION-17.md`).
- The HANDOFF/CHANGELOG/DECISIONS/tracker updates.
- The commit + the one-shot token push (ls-remote verified) + the live verification.

## After S17

Session 18 = the content depth on the detail pages (the P1-1 gap — the biggest ranking lever: the editorial body content BELOW the answer-sentence). See `docs/specs/seo-followup-track.md` §Session 18. The data-dependent gaps (P0-1 CWV, P0-2 before/after GSC, P0-3 CPU cliff, P1-5 pagination, P2-3 allowlist) are the owner's next phase (need the fresh GSC data + the Workers Paid plan + the post-Dec-8 freeze-lift) — see `docs/specs/seo-followup-track.md` §"The data-dependent gaps".

## Credentials

Credentials used across S14-S16, not stored. The owner should rotate the GitHub + Cloudflare tokens before starting S17.
