# 2026-11-10 — Session S1: the SEO growth plan's quick-wins round (v13.255.1-s1m3)

> **Type: execute a spec'd SEO session (M1/M2/M3) + a read-only infra investigation.**
> **Spec:** `docs/specs/seo-growth-plan-v2.md` §8 "S1 — Quick wins".
> **Audit:** `docs/audits/2026-11-10-gsc-audit.md` (GSC, Oct 10 – Nov 7).

## 0) What this session was

The first agent session of the SEO growth plan v2. Three milestones, done in
order, each committed and pushed (and deployed where it touched `src/`):

- **M1** — file the GSC audit + the plan, start `docs/SEO_GSC_LOG.md` with the
  baseline, rewrite HANDOFF. (Done by the session's first run; verified.)
- **M2** — the F3 spelling fix on the SEO surface only (Leipzig, Nordsjælland,
  Roma), via a new SEO-only override map; the fa-dict display names the
  bot/cards/digests use stay untouched. (Done by the session's first run;
  verified live.)
- **M3** — the F7 internal-link coverage check + the F6 broadcast/lineup
  investigation (report only). (Done this run.)

Plus a read-only investigation of the owner's end-of-prompt worker-rename
instruction (see §4).

## 1) M1 + M2 were already committed by the session's first run — verified, not redone

`git log` showed M1 (`3583d33`) and M2 (`3291e3c`) already on `main`. Per
AGENTS.md ("pick up where the last session stopped"), I verified them rather
than redoing them:

- **M1:** the audit lives at `docs/audits/2026-11-10-gsc-audit.md`, the plan
  at `docs/specs/seo-growth-plan-v2.md`, `docs/SEO_GSC_LOG.md` carries the
  baseline (Nov 1–7 KPIs: 8.1 clicks/day, 423 impressions/day, 33.7% of
  visible impressions at positions 1–10) + the M2 change row, HANDOFF is
  rewritten for S1. ✅
- **M2:** `src/seo/team-names.ts` is the SEO-only override map (Leipzig
  «لایپزیگ»/«لایپزیش», Nordsjælland «نورشلان»/«نوردشیلند», Roma «رم»/«آ س رم»).
  `git show 3291e3c -- src/fa-dict.ts` is empty → the dictionary file was NOT
  touched. No non-SEO code imports `seo/team-names` (grep-confirmed). `npm
  test` passes (the new `check-seo-teamnames.js` gates behavior + scope).
  **Live:** `https://sportsignal.ir/healthz` → 200; `https://sportsignal.ir/
  teams/rb-leipzig` renders both «لایپزیگ» (the SEO name, 27 occurrences) and
  «لایپزیش» (the alt). Version 13.255.0.0 matches the commit. ✅

## 2) M3a — the F7 internal-link coverage check (T-25 in seo-check.js)

The audit's F7: internal links decide which upcoming games get page-1
treatment; 184 of 225 match pages had under 20 impressions. The plan's M3:
every match in the next 14 days must have ≥3 internal links (home, a hub,
both team pages, sibling card), and a count check must keep that true.

**What I built:** a new T-25 section in `scripts/seo-check.js` (the live
crawler — NOT in the offline `npm test` chain). It fetches the
`matches-upcoming` sitemap, filters to the next 14 days by parsing the date
from each match URL (`/matches/…-YYYY-MM-DD`), then for each match fetches
the match page (to discover its team + competition links), caches every
source page (home, `/matches`, the four day hubs, both team pages, the
competition page), and counts `href` occurrences of the match URL across
them. Config: `UPCOMING_LINK_MIN=3`, `UPCOMING_LINK_WINDOW_DAYS=14`,
`UPCOMING_LINK_MAX_MATCHES=60`.

**No rendering code changed** — the invariant already held. Verified live on
2026-11-10 (a standalone T-25 runner mirroring the exact check logic):
**21/21** upcoming 14-day matches have ≥3 internal links. The 18 league
matches (Nov 20–22) each have 4 (`/matches` + both team pages + the
competition page); the 3 UCL matches (Nov 24) have 5 (also linked from the
homepage). `npm test` passes. No `src/` change → no worker deploy.

## 3) M3b — the F6 broadcast/lineup investigation (report only)

The audit's F6: "where to watch" is the only unserved pattern with a real
click rate (3.0%); lineups have impressions but no clicks. The plan's M3:
find out whether the existing providers can supply the data, report only.

I probed every provider's live API on 2026-11-10 (FD with the repo's token;
TSP and SportScore via their public endpoints). Full evidence in
`docs/audits/2026-11-10-broadcast-lineup-data.md`. Plain answer:

| Data | Source | Practical for this site? |
|---|---|---|
| Broadcaster | TheSportsDB free `lookuptv.php` (returns channel + country + logo) | **No** — covers India, Brazil, US, Iceland; **zero Iran/Afghanistan entries** (the site is 91% Iran / 6% Afghanistan). FD + SportScore have none. |
| Lineups | FD paid tier (~49 €/mo, reliable) / TSP free `lookuplineup.php` (sparse, near-kickoff only) / SportScore via paid RapidAPI | Only with a paid provider, or accepting TSP's sparse free coverage. |

**Verdict:** S3 "where to watch" is **closed** (no audience-fit source —
showing off-audience channels is worse than showing nothing). S3 lineups =
**owner decision** (plan Q2 — paid spend or sparse free). Both recorded in
`docs/DECISIONS.md`.

**Side finding (flagged, not fixed):** the repo's TheSportsDB key `3` is
permanently disabled — `src/provider-tsp.ts` calls `…/json/3/…` and every
request returns a "key disabled" plain-text message (not JSON), so TSP
silently contributes zero rows. The site still works (FD + SportScore cover).
New free key is `123`. One-line fix, deferred (touches a runtime provider).

## 4) The worker-rename instruction — read-only investigation, deferred

The owner's end-of-prompt instruction: "ucl-notifier worker. change it to
sportsignal, remove the duplicated worker which doesnt belong to
sportsignal.ir". This is outside S1's scope (the plan's S1 is M1/M2/M3) and
high-risk (changes the live deploy target + custom-domain routing). Per
AGENTS.md §5 (stop-and-ask before DNS/domain changes) I did read-only
investigation only:

| Worker | Modified | Serves | Role |
|---|---|---|---|
| `ucl-notifier` | 2026-11-10 | `sportsignal.ir`, `www.sportsignal.ir`, `football.sportsignal.ir` (2 zone routes + 2 custom domains) | **THE live worker** — the one to rename to `sportsignal`. |
| `sportsignal-site` | 2026-11-08 | nothing (no routes, no custom domain; only `sportsignal-site.sportsignal.workers.dev`) | **The orphan duplicate** — a Next.js landing worker from the rolled-back S25 experiment (`docs/history/2026-11-08-s26-promobar-rollback.md` deleted its 4 zone routes). Safe to delete. |
| `uefa-image-relay` | 2026-10-26 | `uefa-image-relay.sportsignal.workers.dev` (image proxy, `?url=`) | **NOT a duplicate** — a legitimate portrait-pipeline utility (`scripts/uefa-player-portraits/relay-worker.js`). Keep. |

The rename itself touches: `wrangler.toml` + `wrangler.dev.toml` (`name`),
the `DRAIN_SELF` service binding (`src/types.ts` + `check-kickoff.js`), the
custom-domain + zone-route attachments (moved via the Cloudflare API),
`scripts/seo-check.js` (`workersDev` URL), `AGENTS.md` §11, and the HANDOFF.
A botched rename takes the live site down. **Deferred to a dedicated
session** with the owner's explicit go-ahead — see the S1 final report's
needs-attention question and the DECISIONS entry.

## 5) Commits this session

- `3583d33` — S1 M1 (file the audit + plan + baseline log + HANDOFF).
- `3291e3c` — S1 M2 (the F3 spelling fix, v13.255-seospell).
- `ffd0165` — S1 M3 (T-25 internal-link check + broadcast/lineup report;
  v13.255.1-s1m3; scripts + docs only, no deploy).

All three pushed to `main` and verified via `git ls-remote`.

## 6) The S2 gate

S2 (the «X مقابل Y» title test on half the match pages, control = other half,
behind an off-by-default switch in `src/seo/config.ts`) needs a **fresh
Search Console export on or after Dec 4, 2026** — 4 clean weeks on the Nov 6
title change (the ⚽ + Farsi brand). The S2 start prompt is in the S1 final
report.
