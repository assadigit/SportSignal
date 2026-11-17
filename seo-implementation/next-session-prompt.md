# SportSignal SEO Follow-up Track — Next-Session Prompt (the track is COMPLETE for the data-independent gaps; the next phase is the owner's data-dependent decisions)

Read AGENTS.md in the repo root first and follow it for the whole session.

The data-independent, freeze-safe follow-up track (Sessions 16-18) is COMPLETE:
S16 (entity-grounding parity + the image sitemap), S17 (the FAQPage + the
visible Q&A on the detail pages), S18 (the editorial body content on the team
+ competition pages — 13.271.0-content, deployment 0fad7482 @100%). Session 18
also reconciled the prompt numbering against the repo audit (DECISIONS S18-4).

## The first task of the next session: the S17+S18 page-level live verification

The scheduled 2026-11-18T00:20 UTC job verifies the live pages after the
KV-quota reset (check `seo-implementation/session-reports/SESSION-17.md` §7 +
SESSION-18.md §6): `/healthz ok:true` + `pool_matches > 0` + the FAQPage node
+ the editorial card on `/teams/<selected>` + `/competitions/<slug>` + a
with-venue match page. If anything failed, fix THAT first.

## Then: the owner's data-dependent phase (the follow-up track spec's tail)

- P0-1 (the CWV measurement — needs the CrUX/PSI key), P0-2 (the before/after
  GSC — needs the fresh export), P0-3 (the 10ms CPU cliff — needs the Workers
  Paid plan), P1-5 (the pagination decision — needs the fresh GSC), P2-3 (the
  allowlist re-eval — needs both), the post-Dec-8 freeze-lift byte decisions.
- The audit doc amendment (the 6 corrected gaps) remains a docs-only follow-up.

## Standing constraints (unchanged)

npm only; `npm test` exit 0 before every push; versioned deploys only; the
free-tier budget; the Dec 4-8 freeze holds; no deploys in the Nov 20
Bayern–Köln windows (M1 ~19:35 UTC, M2 ~21:35-45 UTC); the commit
convention `seo(s19): …`; no secrets in commits. Rotate the tokens if the
owner supplies fresh ones (the S14-S18 tokens were used across five
sessions).

## Credentials

Credentials used across S14-S18, not stored.
