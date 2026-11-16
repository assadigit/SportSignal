# SportSignal SEO Implementation Pack

**Brand (Persian):** اسپرت سیگنال  
**Repository target:** `https://github.com/assadigit/sportsignal` (verify remote before use)  
**Prepared:** 16 November 2026  
**Pack version:** 1.0

## Purpose

This package is an audit-first, phased SEO improvement specification for اسپرت سیگنال. It is built around the product's actual editorial model: the site manually curates important European football fixtures; it does **not** attempt to publish every football match or provide live match status.

## Start here

1. Read `PRODUCT-AND-SEO-STRATEGY.md`.
2. Read `GSC-AUDIT-BASELINE.md` and inspect the included original GSC export under `reference/`.
3. Read `MASTER-SEO-SPEC.md`.
4. Start Session 1 from `phases/SESSION-01-REPOSITORY-AND-LIVE-AUDIT.md`.
5. Use `AGENT-INSTRUCTIONS.md` as the master execution contract.
6. Use `templates/SESSION-HANDOFF-TEMPLATE.md` after every session.
7. Use `IMPLEMENTATION-TRACKER.md` as the single source of truth for progress.

## Keyword research

`keyword-bank-200.csv` contains exactly 200 curated target phrases. **70 are exact query strings found in the supplied GSC Queries.csv export**; the remaining phrases are semantic expansions or English-language candidates. No global search volume has been fabricated. See `KEYWORD-RESEARCH.md` for evidence labels, intent, prioritization and the mandatory validation workflow in Session 2.

## Important safety rules

- Do not implement based on assumptions before repository and live-site inspection.
- Preserve unrelated functionality and current design direction.
- Do not create a page for every team or every possible fixture.
- Only selected clubs get indexable team pages. Match-detail pages are created only for selected or independently important matches.
- Keep the free Cloudflare Workers resource limits in scope. No per-match upstream fetches, no extra polling, no unbounded cron jobs, no new provider requests without a proven need.
- Match page indexing lifecycle is separate from data deletion and Worker resource consumption. Never mass-delete records merely to reduce Google's indexed URL count.
- Commit and push only the agent's scoped changes. Do not stage unrelated work or overwrite concurrent work from another agent.
- Deploy and verify after each session only through the repository's existing deployment mechanism. Do not expose secrets.

## Session count

The suggested plan is **15 sequential sessions**. Session 2 is dedicated to keyword research and validation. If the audit shows a materially different architecture or risk, the agent may propose a revised phase sequence in Session 1, but must preserve the requirement that keyword research happens before implementation decisions.
