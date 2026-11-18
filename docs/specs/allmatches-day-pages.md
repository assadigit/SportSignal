# Spec — the all-matches day pages (S20: the day-hub universe extension)

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

Status: planned 2026-11-18 (audit: `docs/audits/2026-11-18-allmatches-day-pages.md`
— read it first; every claim below is grounded there). Implementation: one
session (S20). This spec supersedes the S19 next-session preview's ordering:
the per-match subscriptions / quiet-hours / channel-posts backlog moves to
S21+ (the owner redirected S20 to this feature on 2026-11-18).

## Goal

`/matches/today` («بازی‌های امروز») and `/matches/tomorrow`
(«بازی‌های فردا») must list **ALL** of the day's matches from a sensibly
wide competition universe — never an empty page just because no marquee
team plays — with the existing ranking (big/desired-team matches first,
then chronological). This serves the searches بازی‌های امروز /
بازی‌های فردا every day of the year, including FIFA windows.

## The two-line summary of the design

1. **Widen the data universe, not the page builders**: +4 FD free-tier
   competitions (Eredivisie, Primeira Liga, Championship, Brasileirão) in
   the existing single batched FD call, and a hygiene-filtered
   senior-international fill from sportscore that only scans when the
   club calendar is idle. The hub builders keep their current behavior
   (they already list every pool match, big-first + chronological).
2. **Everything else stays gated off**: the bot, the homepage lists, the
   `/matches` hub, sitemaps, teams index, the archive, and goal-alert
   claims all filter by importance/follows today and keep doing so
   (verified in the audit's side-effect map).

## Scope

**In:**
- `CONFIG.FD_DAYVIEW_COMPS = ["DED", "PPL", "ELC", "BSA"]` (new constant;
  `CONFIG.LEAGUES` UNTOUCHED — it is live-mutable admin state) appended
  to the FD competition list in BOTH `provider-fd.ts` (full sweep) and
  `providers.ts fetchLongView` — same single subrequest.
- A new `INTL` day-fill: sportscore slugs `international-friendly`,
  `caf-africa-cup-of-nations`, `concacaf-nations-league`,
  `uefa-nations-league` (new comp codes `INTL_FR`, `AFCON_Q`, `CONCACAF_NL`,
  `UEFA_NL`; extend `SPORTSCORE_SLUGS`), scanned [today−1d, tomorrow]
  ONLY when no CLUB match (big-5+CL+EL/ECL+cups+PGL codes) kicks off in
  [now−1d, now+1d] (the emptiness gate; the gate tests club rows only).
- The hygiene pass for intl rows: senior-men team-name filter
  (`/\bU1[6-9]\b|\bU2[0-3]\b/i` + women markers `Women|Frauen|Femenino|Femenil/i`)
  and unordered-pair+date collapse keeping the most-progressed status
  (FINISHED > LIVE > SCHEDULED) — kills the verified reversed-duplicate
  and ghost-row classes BEFORE they reach the pool.
- Cadence: extend the cron-pool relevance filter so senior-intl rows arm
  the active-window cadence (window days sweep like matchdays); add the
  intl codes to `SS_LIVE_ELIGIBLE` so in-flight internationals get live
  score updates.
- Persian names: `FA_COMPS` entries for the 8 new codes
  («اردیویزه هلند»، «لیگ برتر پرتغال»، «چمپیونشیپ انگلیس»، «سری آ برزیل»،
  «بازی دوستانه ملی»، «جام ملت‌های آفریقا»، «لیگ ملت‌های کونکاکاف»،
  «لیگ ملت‌های اروپا») + `COMP_EN` twins + a curated fa-dict seed of
  ~40 common national teams using the PROVIDER name forms
  («IR Iran»→ایران، «Turkiye»→ترکیه، «Czechia Republic»→چک، …).
- The hub empty-state text stays honest for genuinely dead days (no
  fabricated matches — MISSING-IS-NOT-ZERO).
- Gates + harness + version triple + CHANGELOG + session report
  (conventions per S17/S18/S19).

**Out of scope (v1):**
- Notable non-free leagues via sportscore (Saudi Pro League, MLS,
  Argentina LPF, …) — a future owner decision (each adds steady daily
  subrequests).
- Women's or youth football (the hygiene filter excludes them; reversible
  later).
- Pagination on the day hubs (a curated-set day rarely exceeds ~150
  senior rows; revisit only if real days prove otherwise).
- Competition pages / teams pages / sitemap entries for the new
  competitions (they stay match-row-only surfaces).
- Bot notifications or digests for the new competitions (silent by the
  existing gates; changing that is a separate product decision).
- Any change to `CONFIG.LEAGUES`, the admin league editor, standings
  fetches, or TSP league ids.

## Decisions (record in docs/DECISIONS.md as S20-1…S20-6)

- **S20-1 — the universe**: FD free-4 + senior internationals; senior
  men only. (Audit §8.1–8.2.)
- **S20-2 — the admin-state protection**: a separate
  `FD_DAYVIEW_COMPS` constant; `CONFIG.LEAGUES` untouched; a check gate
  FAILS if the 4 codes appear in `CONFIG.LEAGUES`.
- **S20-3 — the emptiness gate**: intl slugs scan only on idle club
  calendars (club rows only in the test); zero extra sportscore calls on
  club days; the 44-metered budget-stop stays the backstop.
- **S20-4 — the ranking is already right**: keep `upcomingFollowed`'s
  big-first → live-first → chronological sort; no builder sort changes.
- **S20-5 — cadence parity for window days**: senior-intl rows count as
  cadence-relevant (cron-pool relevance) + live-sweep eligibility, so
  break-day internationals refresh like matchdays.
- **S20-6 — the data hygiene law**: no intl row enters the pool without
  the senior-men filter + the unordered-pair collapse (the verified
  reversed-dupe/ghost classes never render).

## Step-by-step plan

**M1 — the FD four (universe + names).**
Add `FD_DAYVIEW_COMPS`, append in `provider-fd.ts` + `fetchLongView`,
add `FA_COMPS`/`COMP_EN` entries, extend the fa-dict national-team seed.
Verify locally: the FD URL includes all 10 comps; `npm test` green.

**M2 — the international fill (scan + hygiene + cadence).**
`SPORTSCORE_SLUGS` + the four intl codes; the emptiness-gated scan in the
full sweep (`fetchSportScore` opts or a sibling call riding
`sportScoreDay`); `sanitizeIntlRows` (senior filter + unordered-pair
collapse); the cron-pool relevance extension; `SS_LIVE_ELIGIBLE` +
the full-sweep slug list extension. Zero page-builder changes.

**M3 — the gates + the harness (the S17/S18/S19 pattern).**
- `scripts/check-s20-dayhubs.js` (wired into the `npm test` chain):
  the FD-URL includes the 4 codes in BOTH fetch sites;
  `CONFIG.LEAGUES` unchanged; the intl slug set + hygiene filters +
  collapse exist; the emptiness gate wiring; `SS_LIVE_ELIGIBLE` +
  cadence extension; `FA_COMPS` carries the 8 codes; the goal-alert
  no-audience skip still present (source gate); the version triple.
- `scripts/s20-dayhub-smoke.ts` (manual, the s17/s18 harness precedent):
  (a) a normal club day — the hub lists big + non-big rows in the pinned
  order (big first, then chronological); (b) a break day — intl rows pass
  hygiene (a reversed dupe collapses to the finished row, a youth row and
  a women's row drop) and the hub lists the seniors; (c) a dead day —
  the honest empty state; (d) the homepage/`/matches`/sitemap lists stay
  free of new-comp rows (the side-effect map holds); (e) the goal-alert
  path skips a zero-audience intl match (no claim, baseline advances).

**M4 — version + deploy + live verify.**
Version `13.272.0-goalert` → **`13.273.0-dayhub`** (the triple +
`check-stats.js` LIVE pins + CHANGELOG). `npm test` exit 0 + `npx tsc
--noEmit` clean. Local `wrangler dev` smoke with a seeded break-day pool.
Versioned deploy per RUNBOOK §2 — **outside the Nov 20 Bayern–Köln
windows (M1 ~19:35 UTC, M2 ~21:35–45 UTC)** and before the Dec 4–8
freeze. Live verify on the CURRENT break: `/matches/today` lists the
Brasileirão matches + the internationals (the Nov 18–19 window is this
feature's showcase scenario); `/matches/tomorrow` same;
`/healthz` reports the new version; the homepage and `/matches` show NO
new-comp rows; `pool_matches` grows moderately (~380–460).

## Done criteria (check one by one)

- [ ] `/matches/today` + `/matches/tomorrow` live-list matches on
      2026-11-18/19 (the break) — BSA + senior internationals, HTTP 200,
      big-first + chronological order, byte-frozen surfaces untouched.
- [ ] The ranking law verified: a desired-team match sorts above
      non-desired same-day matches (harness + live).
- [ ] The hygiene law verified: no reversed duplicates, no ghost
      "upcoming" rows for finished games, no youth/women rows (harness).
- [ ] The side-effect map holds (harness + live): homepage lists,
      `/matches`, sitemap-upcoming, teams index, bot messages unchanged.
- [ ] Club-day budget unchanged: the intl scan does not run when club
      matches exist (source gate + a logged quiet skip).
- [ ] `CONFIG.LEAGUES` untouched; admin league settings unaffected.
- [ ] Goal-alert: zero-audience matches claim nothing (harness).
- [ ] `npm test` exit 0 (new check wired in) + `npx tsc --noEmit` clean.
- [ ] Deployed @100% outside the forbidden windows; `/healthz` shows
      `13.273.0-dayhub`; the day pages verified live (screenshot-level
      evidence in the session report).
- [ ] Docs: session report (`docs/history/2026-11-18-s20-dayhubs.md` or
      the run date), HANDOFF rewrite, CHANGELOG, DECISIONS S20-1…S20-6.
- [ ] No credentials in any file, commit, or log.
