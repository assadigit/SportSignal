# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for the whole session.

## This session (S1 — SEO quick wins, started 2026-11-10)

**Goal:** execute section 8 "S1 — Quick wins" of
`docs/specs/seo-growth-plan-v2.md` exactly as written.

- **M1 — Save and baseline:** ✅ done. Audit → `docs/audits/2026-11-10-gsc-audit.md`,
  plan → `docs/specs/seo-growth-plan-v2.md`, `docs/SEO_GSC_LOG.md` with the
  baseline, this file updated. Committed + pushed.
- **M2 — Spelling on the SEO surface only:** ✅ done and verified live.
  Leipzig «لایپزیگ» (alt «لایپزیش»), Nordsjælland «نورشلان» (alt «نوردشیلند»),
  Roma keeps «رم» + alt «آ س رم» — via `src/seo/team-names.ts` (SEO-only
  override map); `src/fa-dict.ts` untouched (bot/cards/digests byte-identical).
  v13.255-seospell, deployed, live: `/teams/rb-leipzig` shows both spellings.
- **M3 — Internal-link coverage + broadcast/lineup investigation:** ✅ done.
  T-25 check added to `scripts/seo-check.js` (every match in the next 14 days
  must have ≥3 internal links from home/hub/team/comp/matches surfaces).
  Verified live on 2026-11-10: 21/21 upcoming 14-day matches have ≥3 links
  (no rendering code changed — the invariant already held). Investigation →
  `docs/audits/2026-11-10-broadcast-lineup-data.md` (report only): broadcaster
  data exists on TSP free tier but **does not cover Iran/Afghanistan** (the
  site's audience) and the repo's TSP key `3` is dead; lineups need a paid
  provider (FD ~49€/mo) or TSP's sparse free coverage. **S3 "where to watch"
  closed** (no audience-fit source); S3 lineups = owner decision (plan Q2).
  No worker deploy (scripts + docs only); `npm test` passes.
- **Infra (owner instruction, NOT done this session):** rename the Cloudflare
  worker `ucl-notifier` → `sportsignal`, delete the duplicate worker. This is a
  risky, out-of-S1-scope operation (touches the live deploy target + custom
  domain routing). Read-only investigation done; **deferred to a dedicated
  session** with the owner's explicit go-ahead — see the S1 final report and
  DECISIONS.

**Out of scope (hands off):** the title template, the today/tomorrow/
this-weekend hubs, the sitemap. Everything SEO-facing is logged in
`docs/SEO_GSC_LOG.md`.

**Next sessions (the plan's schedule):**
- **S2 — title test** («X مقابل Y» on half the match pages, control = other
  half, behind an off-by-default switch in `src/seo/config.ts`). **Gate:**
  needs a fresh Search Console export on or after **Dec 4, 2026** (4 clean
  weeks on the Nov 6 title change). The S1 agent wrote the S2 start prompt
  (end of the S1 session record / see the owner's saved prompt).
- **S3 — where-to-watch / lineups block** — only if the M3 investigation
  found verified data; otherwise the item is closed in DECISIONS.

## Current state (machine)

- Version: see `src/config.ts` `VERSION` / `package.json` (kept in sync by
  `scripts/check-version-sync.js`; codename suffix is house style).
- Deploy: `npx wrangler deploy` — worker **`ucl-notifier`**, custom domain
  `sportsignal.ir`, cron `*/10 * * * *` UTC. **If the worker was renamed to
  `sportsignal` (the S1 infra task), `wrangler.toml` `name` is the source of
  truth** — check `wrangler.toml` before deploying, and check `/healthz`
  after (RUNBOOK §3 for the full post-deploy ritual).
- Deploy ritual (RUNBOOK §2): `npm test` → `npx wrangler dev --port 8787`
  smoke (`/healthz` + `/` → 200) → fetch remote + rebase → `npx wrangler
  deploy` → live verification. `npm` only, never `bun install`.
- Git discipline: fetch `https://github.com/assadigit/SportSignal` main
  before push AND before deploy; push one-shot with the owner-supplied token
  (never persist tokens in git config); verify with `git ls-remote`.
- KV `STATE` id `c63588df02ae4bf1bfdc18d19c5b3631`; D1 stats
  `b371048b-4ae0-4ea5-9519-1d308390b700`; D1 users
  `c64064ff-aa78-4c73-80cd-e2805d550a5b`; account
  `a796fdfe71819812119b8a494d3d39c1`; workers.dev subdomain `sportsignal`.
  `wrangler kv key get` CLI lies — use the REST API (RUNBOOK §8).

## Standing limits and reminders (still in force)

- `_headers` sits at exactly 100 rules — every new pin needs a cap sweep
  first (grep check-stats before evicting; next-oldest candidates: the JS
  pin 13.41.js, the CSS pin 13.52.css).
- **ADR-006 rename-on-edit is law:** never edit a published immutable asset
  in place — new bytes ship under a fresh `public-*.x.js/css` name + SW
  cache bump + `_headers` pin swap. Server-only `src/` changes need no bump.
- The SEO layer is server-side only (`src/seo/`): it reads KV only, never
  triggers provider sweeps. New `src/*.ts` files must be added to
  `scripts/lib/worker-src.js`'s order list in the SAME commit (the eval
  harness); `src/seo/*` files are NOT in that list (checked directly by the
  seo scripts instead).
- The pill's "gone bar" report class is CLOSED (ADR-008): no memory can
  ever hide the sticky channel bar; suspect stale SW cache / desktop check /
  the 20% scroll gate before assuming regression.
- Light theme is unreachable code (boot script pins dark); fix its contrast
  only if the light theme ever ships.
- The Telegram SVG cards (`src/card.ts`) deliberately carry NO rank number;
  hero/mcard surfaces stay number-free by design.
- The EL/ECL rank limitation is deliberate (no new provider fetches) — see
  the S37 audit + DECISIONS before "fixing" it.
- KV keys are never renamed (RUNBOOK §5 contracts); rollbacks are safe
  because the KV schema is additive.

## Where the recent work is recorded

- SEO growth plan (this session's spec): `docs/specs/seo-growth-plan-v2.md`
  · GSC audit: `docs/audits/2026-11-10-gsc-audit.md` · change log:
  `docs/SEO_GSC_LOG.md`.
- Rank-badge design pack: spec `docs/specs/team-rank-indicator.md` (§12 =
  S40 addendum), audit `docs/audits/2026-11-09-team-rank-indicator.md`,
  screenshots `docs/assets/s40-ranknum/` … `s43-alwaysshow/`.
- Full session history: `docs/history/` (newest entries at the top of that
  folder's index); decisions: `docs/DECISIONS.md`; changelog: root
  `CHANGELOG.md` (newest first).
