# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole session.

## This session (v13.281.0-teamstrict — the strict entity gating, the GSC "Excluded by 'noindex'" remediation; 2026-11-25)

**The task:** the owner-approved implementation of the 2026-11-25 audit's remediation plan (the GSC noindex report: 36+ /teams/{slug} URLs growing every matchday; root cause — a 200+noindex page for every club in any tracked match, discovered via JSON-LD teamRef urls + the 79-tile /teams index). **Status: see the TLDR below.** The law flipped: the 17-slug team allowlist (13 + the Iranian big four — D1) with a pure-static router **410** for non-selected slugs; the 10-slug competition allowlist (PGL + europa-league + copa-del-rey indexable — D2/D3); the no-leak JSON-LD law (teamRef/organizer urls only for the allowed sets — the raw-code /competitions/ded-class 404 leak dead); D4's soft delist (off-policy match pages 200 + noindex,follow, out of sitemaps + archive; existing KV rows expire naturally) with the A-League hard exception (archived rows 410); `isSeoEligibleMatch` (shouldReport OR selected-club OR top3 OR marquee) gating both match children + the restored `syncArchive` gate + a same-slug dedupe; the `SEO.TEAM_PAGE_POLICY` rollback switch behind EVERY behavioral edit; the stability raises (selected team pages 30m render hold, text pages 1h — the error-1102 CPU relief). Bot semantics untouched (`CONFIG.BIG_TEAMS_BY_LEAGUE` + match-classify unchanged — the Telegram bot shares this Worker).

- **DEPLOYED + LIVE-VERIFIED (2026-11-25):** commit 8370b7c deployed ~04:33 UTC (Version 622f5e5e) inside a clean no-live window (0 live, next kickoff 13h out). The live matrix immediately exposed ONE incident — the **frozen-source hazard**: `bot_settings_v1` (the admin overlay — the owner's followed clubs: Tottenham/Juventus/AS Roma in provider forms) REPLACES `CONFIG.BIG_TEAMS_BY_LEAGUE` in any isolate that ran a public-matches/cron path, and that isolate's teams.xml render (04:48) listed the overlay clubs while the router 410-gated them (a sitemap listing 410 URLs; the overlay's provider-form spellings also miss the TEAM_ALIASES folds, so Inter/Atleti dropped). **v13.281.1 (commit f1f0f7b, Version be62fd5e ~05:07 UTC): the frozen-source law** — `isSelectedTeam` reads the FROZEN module-init capture in strict mode (the set never flaps with isolate history; legacy keeps the live-field read — the C1 dynamic law preserved for rollback). Live post-fix: teams.xml = exactly the 13 frozen selected, /teams = the same 13, Inter indexable again; the guard scripts co-evolved (teamstrict 35 gates, crawlindex frozen law; npm test 4,005 OK / 0 FAIL).
- **Gates:** `npm test` **4,002 OK / 0 FAIL** (the NEW 33-gate `scripts/check-seo-teamstrict.js` wired in before check-seo-crawlindex; the superseded C1-era pins co-evolved: crawlindex/internallinks/competitionpages/entityfallback/match-lifecycle/archivescope/s20-dayhubs/check-stats — see the CHANGELOG entry). `wrangler dev --local` smoke with `scripts/s281-seed-local-kv.js` verified BOTH modes: strict (arsenal/persepolis/tractor-s-c 200+index; fulham/benfica 410; the ELC tie 200+noindex,follow with NO team urls in JSON-LD; the UCL tie: only barcelona's url; the PGL tie: persepolis url + organizer persian-gulf-pro-league; the archived A-League row 410; teams.xml = the 6 with-upcoming; competitions.xml = the 10; upcoming child = 6 rows, archive child = 1) and legacy (fulham 200+noindex, both-sides tiles, the old sources — the rollback contract).
- **Watch items:** GSC (expect the 36 noindex URLs → "Not found (410)" within 1-2 weeks; teams.xml stable ≤17; Crawl Stats fetch count dropping); the archive-child pagination trigger (unchanged, ~5,000); the P6-style lite render for pool-HIT finished rows (carried from S22); upcoming-child count now INCLUDES the PGL big-four fixtures (the D1 widening — expected, not a regression).
- **Rollback:** flip `SEO.TEAM_PAGE_POLICY` to "legacy" + redeploy (every edit sits behind the flag — rg-verifiable), or `wrangler rollback` + git revert of this session's commit.
- **Credentials used, not stored** (session-local env file outside the repo); the owner should rotate every token shared in chat after the session.

# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole session.

## This session (v13.280.0-teamtilecrests — the /teams index tile crests; 2026-11-24 — DEPLOYED + LIVE-VERIFIED)

**The task (the owner's ask, verbatim):** "Add club's logo/sigil (from API) in this page: https://sportsignal.ir/teams". **Status: DEPLOYED + LIVE-VERIFIED.** Each /teams tile now leads with the club's own crest (24px, inline-start of the title row). The mechanism (3 server-side pieces, zero KV/subrequest/CPU cost — the crest field already rides every pool row): `TeamEntry.crest` in `src/seo/data.ts` (entry creation + the adoption-across-rows guard), the tile renderer in `src/seo/pages.ts` (the `.t.tlogo` flex row + the lazy/no-referrer/fail-soft `<img class="tc">` inside the byte-exact crawlable hubtile anchor), the CSS in `src/seo/page-shell.ts` (the `.tlogo` GATE — every plain `.t` tile on the competitions hub + static pages stays byte-identical; zero CLS: fixed 24px slot). No client asset moved (bundle public-13.80.js, stylesheet public-13.87.css, SW cache stays sportsignal-v128 — the RUNBOOK §2 server-side rule). Gates: `npm test` **3,964 OK / 0 FAIL** (the v13.280 live wiring pin added, the v13.279 pin demoted HISTORICAL with its four behavioral gates still LIVE, the s20 version-triple pin evolved); `wrangler dev --local` seeded smoke: 6 tiles — 4 crest renders (byte-exact FD crest URLs) + 2 plain-tile fallbacks (crest-null teams), ItemList 6 == 6 tiles (SS-13), the competitions hub + /matches/today + / + /about 200 and untouched. Deployed + live-verified: the /teams HTML now carries `class="t tlogo"` + `.tc` crest imgs on every crest-bearing tile, all FD crest URLs answer 200, the count == the live tile universe, and /healthz reads 13.280.0-teamtilecrests. Rollback: `wrangler rollback` (previous 13.279.0-gsc404remediation, Version ID 2803a28f) + git revert of this session's commit. Full record: `docs/history/2026-11-24-s23-teamtilecrests-deploy.md`.

- **Watch items (carried + new):** the P6-style lite render for pool-HIT *finished* rows (the 503-transient class, carried from S22); the archive-child pagination trigger if the archive exceeds ~5,000 entries (currently ~650 rows); **new** — if the owner wants bigger crests or the crest on the competitions tiles too, the .tlogo pattern generalizes (one renderer line + the img; DECISIONS S23).
- **Credentials used, not stored** (session-local env file outside the repo); the owner should rotate every token shared in chat after the session.

## This session (v13.279.0-gsc404remediation — the GSC 404 remediation, deploy phase; 2026-11-23/24 — DEPLOYED + LIVE-VERIFIED, the owner-approved checkpoint)

**The task:** execute the owner-approved deploy of the GSC 404 remediation (the owner's approval, verbatim: "I approve, Push commit merge deploy."). **Status: DEPLOYED + LIVE-VERIFIED.** Merged fix/gsc-404-remediation → main (fast-forward ba90b8a → c58a814, pushed, ls-remote verified) after a fresh `npm test` (3,963 OK / 0 FAIL). Deployed inside a clean no-live window (sched_live_now 0, next kickoff ~21h out): `wrangler deploy` 2026-11-23 ~22:33 UTC — **Version ID `2803a28f-9f23-4896-9fa9-05e49a779e65`**, `/healthz` flipped to 13.279.0-gsc404remediation, bot healthy (outbox 0, degraded false, cron ticking). The three one-time KV writes ran against a fresh pre-write backup (seo_archive_v1 + matches_v13_tracked @ 22:40 UTC): the 2 lost DFB-Pokal cup ties seeded (blob 180 → 182), 171 per-match keys backfilled, 340 small-market rows written (blob → 522). One interrupt: the session tool's 10-min window killed the smallmarket script during its key phase (~319/340 keys; the blob write completed first — no partial state); the key completion ran ~00:03 UTC 2026-11-24 (post-midnight quota-safe window; it wrote 103 keys — the interrupt leftovers + the rows the runtime's all-FINISHED scope had meanwhile merged into the blob; final live-verified invariant: blob 650 rows → 641 unique slugs = 641 per-match keys = the 641-URL archive child; blob fallback covered interim correctness). The full live re-probe: all 14 redirect-map entries → 301, both cup ties → 200, a-league → 410 + noindex, strangers → 410, malformed → 404, the /teams/1-magdeburg fallback shell → 200 + noindex,follow, upcoming match page → 200 indexable, workers.dev guard intact, and the paced archive-child sweep **641/641 URLs render 200**. A documented transient: 107 still-in-pool recently-finished renders intermittently 503'd under the sweep's artificial sustained load (the pre-existing free-tier CPU cliff on the unchanged pool-HIT path — not a regression; all recovered to 200). Full record: docs/audits/2026-11-23-gsc404-remediation.md + docs/history/2026-11-23-s22-gsc404remediation-deploy.md + the CHANGELOG deploy note.

- **Watch items (carried + new):** the archived pages form-strip/related body sections render leaner under P6 (title/H1/description/answer stay byte-identical — verified by the freeze gates); if the archive ever exceeds ~5,000 entries the matches-archive sitemap child needs pagination (currently 650 rows / 641 URLs); the PGL/EL/ECL/cup backfill residuals drain as 410; **new** — a P6-style lite render for pool-HIT *finished* rows is the recorded follow-up candidate for the 503-transient class (§3 of the audit doc).
- **Rollback:** `wrangler rollback` (previous 13.278.0-farsisitename, Version ID 0f3fc73d-5fc0-4dc1-a326-c4edb6606db6); KV restore from /home/z/work/backups-2026-11-23/ (the 22:40 UTC legs); git revert = the 7-commit reversal of c58a814.
- **Credentials used, not stored** (session-local env file outside the repo); the owner should rotate every token shared in chat after the session.

## (superseded banner — the fix phase, same day, pre-deploy)

<details><summary>v13.279.0 fix-phase banner (BUILT+GATED) — executed above</summary>

**The task:** the audit-approved fix phase for the 2026-11-23 GSC 220-404 finding (P1 the frozen 301 map; P2-B the all-FINISHED archive scope + per-match keys; P3 the cup-tie seed script; P4 the teamSlug alias fold; P5 the entity fallback shells + a-league 410; P6 the lite pool-miss render path). **Status: the code is complete, npm test green (3,963 checks), wrangler-dev smoke-verified locally (the 301 map, the 410s, the fallback shells, the stranger gate), committed on the branch fix/gsc-404-remediation.** The deploy + the three one-time KV writes (seed-lost-cup-ties --write, backfill-archive-keys --write, backfill-smallmarket-archive --write) wait for the owner explicit approval per the brief Step-4 checkpoint. Pre-write KV backups exist: /home/z/work/backups-2026-11-23/ (seo_archive_v1 + matches_v13_tracked, fetched 2026-11-23 ~21:24 UTC — AGENTS.md §6 fresh-backup rule).

- **Deploy plan (post-approval):** merge fix/gsc-404-remediation → main, push (one-shot token), then npm test → npx wrangler dev smoke → npx wrangler deploy inside a no-live-match window (check live fixtures first), then live-verify /healthz + the homepage + one live match page. Then run the three scripts --write legs (paced ~1 write/s), then the full 220-URL re-probe + paced sitemap sweep (the remediation report Step 5) and write docs/audits/2026-11-23-gsc404-remediation.md.
- **Watch items:** the archived pages form-strip/related body sections render leaner under P6 (title/H1/description/answer stay byte-identical — verified by the freeze gates); if the archive ever exceeds ~5,000 entries the matches-archive sitemap child needs pagination; the PGL/EL/ECL/cup backfill residuals drain as 410.
- **Credentials used, not stored** (session-local env file outside the repo); the owner should rotate every token shared in chat after the session.
</details>

## This session (v13.278.0-farsisitename — the Farsi site-name swap; 2026-11-22 — DEPLOYED + LIVE-VERIFIED, the owner-forced deploy)

**The task (the owner's ask, verbatim):** "I want the english version of
name becomes farsi in search and 'sportsignal' becomes ' اسپرت سیگنال ' …
in latin version : SportSignal / in farsi searches: اسپرت سیگنال."
**Status: DEPLOYED + LIVE-VERIFIED.** The S21 close left the deploy
scheduled for the first quiet gap; the owner then explicitly ordered the
force deploy ("Do it, Deploy Push commit. Force deploy it." — the owner's
explicit instruction outranks the no-live-window discipline per AGENTS.md
§0 rule order), so `wrangler deploy` ran 2026-11-22 ~14:05 UTC (17:35
Tehran): Version ID `0f3fc73d-5fc0-4dc1-a326-c4edb6606db6`, commit `cec49e9`.
Live evidence (all verified post-deploy): `/healthz` ok:true +
"13.278.0-farsisitename" + pool 508 + outbox 0; og:site_name «اسپرت سیگنال»
on /, /teams, /matches/today + the marquee match page; WebSite +
Organization JSON-LD `name`=«اسپرت سیگنال» / `alternateName`="SportSignal";
the Atom `<title>` + ICS `X-WR-CALNAME` «بازی‌های بزرگ فوتبال — اسپرت
سیگنال»; the Farsi link-alternate titles + og:image:alt; the PWA manifest
names + ICS PRODID + twitter:site correctly still Latin; sw.js serves
v128; workers.dev stays noindex. Two started-unconfirmed matches were in
flight at deploy time (live:0, started-unconfirmed:2 — the owner-forced
window): no notification failures observed (outbox_depth 0,
admin_alerts_ok true, degraded false, both pre- and post-deploy healthz).
Rollback reference: redeploy the 13.277.0-clubdata upload
(`7b254f47-2384-4d2e-87d3-dc5ad48c2092`) or `wrangler rollback`. Full
record: `docs/history/2026-11-22-s21-farsisitename.md` + the CHANGELOG
v13.278.0-farsisitename entry.

- **The diagnosis:** Google's site-name append (the " - SportSignal" in the
  owner's SERP example) read the LATINE WebSite JSON-LD `name` +
  `og:site_name`; the match title itself is brandless at 53 chars (the
  SS-10 ladder drops the brand rung on long titles — correct, unchanged).
- **The swap:** WebSite + Organization JSON-LD `name`=«اسپرت سیگنال» with
  `alternateName`="SportSignal"; og:site_name (page-shell + homepage) +
  the Farsi head phrases (feed titles, link-alternate titles, image alts,
  ICS CALNAME) carry the Farsi brand; the Latin form keeps the domain/PWA/
  PRODID/llms.txt/twitter:site/body-copy contexts (DECISIONS S21-1).
- **The wiring:** SW v127 -> v128 (the served-HTML evict), version triple
  13.278.0, the check-stats LIVE pins + the NEW v13.278 wiring check, the
  s20/mc-heroes ride-forward pins, the public-page baseline re-frozen.
- **Freeze-safe:** zero byte-frozen title/H1/description/answer bytes; the
  Dec 4-8 GSC measurement window is untouched by this round.
- **The SERP flip itself takes days** (Google re-crawls on its own
  cadence); the live HTML/JSON-LD swap verified immediately post-deploy.
- **Optional follow-up (NOT shipped, owner's call):** the visible body-copy
  brand mentions — the narrative big-club variants
  («دیدار دو تیم منتخب SportSignal …», pinned by check-match-centre S09)
  + the footer «© SportSignal» line — could also render the Farsi brand;
  out of scope for this search-signal round.

## This session (v13.277.0-clubdata — the club Persian-translation + stadium database completion; 2026-11-21 — DEPLOYED + LIVE-VERIFIED)

**The task:** `SPORTSIGNAL_CLUB_PERSIAN_TRANSLATION_COMPLETION_SPEC.md` (repo
root). The complete local club database so match rendering needs NO AI
translation for any in-scope club. **Status: DONE per the spec's §10
definition of done.** Full evidence: `docs/audits/club-translation-data/`
(the M1 audit, the master dataset with per-entry sources + confidence, the
roster archive, the final report with every count).

- **M1 audit** (`d822580`): the traced provider→dict→render path, the
  measured 2026-27 baseline (141/204 Persian, 16/204 stadiums, 63 gaps, the
  Real Sociedad B parent-fold bug, the AI-learner status post-v13.276-slim).
- **M2-M6** (`7c1ba06`): season 2026/27 verified live (FD currentSeason +
  Wikipedia season articles; FD free tier carries no EL1/SB/BL2/SD — those
  rosters came from the season articles, cross-checked via the
  promotion/relegation consistency). `src/fa-dict.ts` 516 → 676 keys;
  `TEAM_STADIUMS` 22 → 287; the UCL 30-season historical window extension
  (1996-97 → 2004-05 extraction + the 2025-26 FD pull); the reserve-team
  fix; new gates `check-club-coverage.js` (G1-G8, in `npm test`) +
  deterministic idempotent generators under `scripts/clubdata/`.
- **M7** (`a2343e6`): the G7 AI-no-work proof (the REAL
  collectUnknownTeamNames finds 0 unknowns across all 240 covered roster
  clubs) + the G8 pubMatch render smoke (Persian names + Persian venue chips
  through the production path, incl. the reserve-team distinction).
- **M8**: `npm test` 3,951 OK / 0 FAIL; `wrangler deploy` Version ID
  `7b254f47-2384-4d2e-87d3-dc5ad48c2092` (2026-11-21 ~21:55 UTC); live
  `/healthz` ok:true + 13.277.0-clubdata + pool 493; the live payload renders
  the new coverage (Frosinone فروزینونه, Venezia ونیز, Paris FC پاری‌اف‌سی,
  Hull هال سیتی; Persian venue chips live).
- **Open for owner review (the uncertainty queue, all documented):** Arezzo,
  Elversberg, Osnabrück, IFK Göteborg, Paphos, Wimbledon short-form,
  Boavista's division status, Betis's temporary La Cartuja relocation. The
  daily KV-budget `degraded` flag is the pre-existing free-tier reality
  (936/1000 writes that day) — unrelated to this data-only deploy.
- **Next season refresh procedure:** update the roster snapshot + clubdata
  JSON in `docs/audits/club-translation-data/`, run
  `node scripts/clubdata/generate-sections.js` (collision check) →
  `apply-sections.js` (idempotent insert) → `npm test` — the
  check-club-coverage gate reports exactly what is missing.

## ⚠️ PERSIAN-ALIAS PHASE 2 — BLOCKED UNTIL THE FREEZE LIFTS (earliest Dec 9, 2026)

Phase 2 of the Persian-alias SEO work (the post-freeze follow-up to commit
`6fd2f1d` / `v13.274.0-persianalias`) is **date-gated: do NOT start it before
Dec 9, 2026, and do not start it on the date alone.** The THREE unblocks, in
order: (1) it is Dec 9, 2026 or later; (2) the owner's freeze-lift decision
and the final measurement record are in (read this file's session blocks +
`docs/DECISIONS.md` — **a date passing alone is NOT proof**); (3) the owner
supplies the fresh **Dec 4-8 GSC export** — if absent, stop and report; never
fabricate metrics. The full work order (evidence re-derivation via
`scripts/extract-alias-evidence.js`, the owner-gated S18 editorial alias
mentions, the deferred candidates, the gates) lives in
`seo-implementation/next-session-prompt.md`. **If the owner says "finish
remaining work":** find that prompt, check the three unblocks, and either
start phase 2 or report the block honestly.

**The reminder layer (2026-11-19, the owner's ask):** the standing GitHub
issue **assadigit/SportSignal#4** (`[PERSIAN-ALIAS-PHASE-2]`, labeled
`phase-2-reminder`) carries the full phase-2 prompt; the scheduled read-only
workflow `.github/workflows/phase2-freeze-lift-reminder.yml` (Dec 9 + Dec 16
UTC, year-guarded to Dec 2026) pings it — a comment + reopen, which notifies
the owner (the issue creator + the repo watcher) even if they forget — and
no-ops once phase 2 ships (its completion guard: this layer's own gate file
retired from `main`). `scripts/check-phase2-freeze-lift.js` (in `npm test`)
pins all the reminder surfaces so they cannot silently rot. **After phase 2
ships:** close issue #4, disable the workflow, retire the banner + the check
the same session (the check is co-evolved with the retirement).

## This session (v13.276.0-slim — the live strip: 7 non-core features REMOVED; 2026-11-21 — the owner-approved removal deploy)

**The objective (the owner's approved removal spec):** take out seven
non-core features in one commit to reclaim Cloudflare FREE-plan budget
headroom (KV 1,000 writes/day, ~50 subrequests/invocation), leaving every
core surface — pre-match reminders (72h/24h/3h/1h/5min), kickoff pushes +
DRAIN_SELF, FT pushes (6h window + 24h backfill), big-match broadcasts,
POSTPONED/CANCELLED alerts, bot commands, the channel mirror
@SportSignalz, the website + SEO, the live-overlay correctness law, the
notification audit + per-chat repair, kv-webmeter/SOFT-HARD governors,
/healthz and ALL Tier B features — untouched.

- **A1 goal alerts — REMOVED.** `src/goal-alert.ts` git-rm'd; the
  cron-notify hook + try/catch, `KV_GOAL_SNAPSHOTS`/`GOAL_ALERT_MAX_UNITS`
  and the two s19 harnesses went with it. Rollback = revert the commit
  (the layer was self-contained).
- **A2 HT alerts — REMOVED** (notify-status: the HT array, PAUSED
  detection, the HT fan-out + :ht channel post). The status map still
  records PAUSED; POSTPONED/CANCELLED untouched; the :ht key mapping stays
  in channel-mirror.ts.
- **A3 sweep retiming (option a).** LIVE + POST_MATCH liveSweep
  "tick"→"slot" (:00/:20/:40), pollHint 60/90→120; PRE_MATCH keeps "tick".
  The live-overlay write drops the ≥10-min age top-up (now
  fullSweep || liveChanged; HEAL semantics intact). cron-pool unchanged.
- **A4 scorer enrichment — REMOVED** (enrichLiveMatches + the cron-public
  prewarm hook + `KV_LIVE_DETAIL`). `applyLiveDetail` stays (tested,
  tree-shaken); the live overlay never depended on the enrichment.
- **C1 hero transfer watch — UNWIRED** (watchHeroTransfers + pacing
  constants out of the tick). KV `hero_rotation_v1`, the
  /api/hero-rotation report, heroClubActive, the pure primitives and the
  manual heroes:rotate / clubs:alt commands all stay.
- **C3 FA-AI auto-learner — UNWIRED** (the cron-users block + the three
  public-swr per-request hooks). fa-ai.ts, the [ai] binding, the
  dictionaries and the ADMIN force-run (/api/fa-ai-run) stay.
- **C4 far-cup cron — REMOVED** (the "27 */4" trigger + the api.ts
  scheduled branch). The probe keeps running from the quiet ticks
  (cron-maintenance, the same cup_far_scan_v1 4h due-gate); wrangler.toml
  is back to the SINGLE `*/10 * * * *` trigger — verify ONE schedule in
  the dashboard post-deploy.

**Test-suite co-evolution (all green: `npx tsc --noEmit` zero errors +
`npm test` full chain, 3887 checks):** check-s19-goalalert/s19-goal-smoke
git-rm'd + unwired; s20-dayhub-smoke stripped of its goal section;
check-s20-dayhubs asserts the removal + re-pins the version triple;
check-scheduler 4b/4c → slot/120 + a POST_MATCH follows-check + the pollA
ladder 120/120/60/120/300/900 (3b/13b stay "tick"); check-hero-clubs
inverts the watch wiring; check-reliability #quota2 pins the admin-only
learner, #nospam10/#standsteady/#epochflow/#swrsolid assert the removals;
check-channel-mirror k-cron → single trigger, h3 + the m3 envelope
re-pinned without the HT event; check-lifecycle/check-mdstyle/
check-no-miss assert HT retirement (the status map still records PAUSED);
check-stats re-pins the enrichment removal + the version triple (the
version follows the repo convention `13.276.0-slim`); live-derby drops the
enrichment grab/stubs. RUNBOOK §7/§8 rows updated (governor list,
live_detail retirement, overlay cadence, hero_rotation_v1 writer, FA-AI
admin-forced, goal_snapshots orphan note).

**Rollback:** `npx wrangler rollback` (restores code + triggers — verify
the 4-hourly trigger reappears; if not, revert wrangler.toml + redeploy
the old commit). No data rollback needed (all orphaned keys TTL-bound or
harmless). **Monitoring:** first live matchday — sweeps at :00/:20/:40
only, NO "Goal alerts"/"HT alerts" log lines, FT pushes ≤20 min; 48h of
/healthz. Expected busiest-day KV writes: ~700-810 of 1,000.

## This session (Persian Club-Alias SEO — 2026-11-19 — BUILT + DEPLOYED + LIVE-VERIFIED (the owner authorized the deploy later the same day; commit `6fd2f1d`, Version ID `5c87d8bd-2417-4b02-bbe5-db7de3328e10`))

**The objective (the owner's PERSIAN-CLUB-ALIAS-SEO-SPEC.md, repo root):**
improve Persian SEO coverage for canonical club names, colloquial aliases
and natural-language match searches (بارسا / رئال / من سیتی / بازی بعدی
بارسا / ساعت بازی بارسلونا امشب / بازی بارسا با بایرن / نتیجه بازی رئال
مادرید) — WITHOUT doorway pages, duplicate URLs, provider changes, or
touching the frozen measured surfaces. **DONE — `v13.274.0-persianalias`
on `main` + DEPLOYED 2026-11-19 ~18:55 UTC + live-verified (below).**

- **M1 — the audit + the evidence extraction ✅.** The repo-first workflow
  (spec §3): AGENTS.md → the spec → the git state (clean, `main`, the S20
  close-out at HEAD) → the SEO research inventory re-verified (369-row
  VALIDATED-KEYWORD-MAP.csv: 198 GSC-observed / 38 autocomplete-validated /
  133 research-candidates; EVIDENCE-LOG A2 ambiguity evidence; the S11
  SEO_EXTRA_ALIASES 1-club precedent; the 13-club selected-team allowlist
  `CONFIG.BIG_TEAMS_BY_LEAGUE`; the canonical slugs incl. the
  provider-derived `internazionale-milano`/`club-atletico-de-madrid`).
  `scripts/extract-alias-evidence.js` machine-derived the per-alias GSC
  evidence (`scripts/alias-evidence.json`) — every figure traceable.
- **M2 — the additive research deliverables ✅.**
  `seo-implementation/keyword-research/ALIAS-KEYWORD-RESEARCH-2026-11-19.csv`
  (34 evidence-labelled rows: 13 accepted, 4 deferred, 5 ambiguous, 5 intent,
  7 excluded-intent) + `ALIAS-RESEARCH-REPORT-2026-11-19.md`. The original
  map/evidence files are READ-ONLY inputs — never overwritten (gated).
- **M3 — the implementation ✅ (freeze-safe).** `SEO_EXTRA_ALIASES`
  extended to the evidenced 9-club dictionary (رئال / بایرن / من سیتی +
  منچستر سیتی / ارسنال / اینتر + اینترمیلان / میلان / پی‌اس‌جی +
  پاریسن ژرمن / بروسیا دورتموند — every entry citing its GSC evidence
  inline) + the NEW `src/seo/persian-alias.ts` (the ambiguity-guarded
  query resolver — اینتر/میلان/منچستر/پاریس/اتلتیکو NEVER resolve alone;
  the UCL-phrase unlock; the normalization folds without over-folding;
  the matchup-pair resolver with the substring trap; zero imports, zero
  KV/fetch/CPU, wired into NO request path). The aliases ride the JSON-LD
  alternateName arrays ONLY — the byte-frozen titles/H1s/descriptions/
  answers + `fa-dict.ts` are byte-identical (gated).
- **M4 — the gates + the smoke ✅.** NEW `scripts/check-seo-persian-alias.js`
  (52 gates: alias/entity integrity, URL/indexation integrity (13 canonical
  URLs, zero alias slugs), the normalization folds, the ambiguity gates,
  the separation law, the freeze-safety gates, the evidence law) wired
  into `npm test` (**3,887 → 3,940 OK / 0 FAIL, exit 0**; tsc clean).
  `scripts/persian-alias-smoke.ts` **27/27** (the REAL module through tsx —
  every spec example query + the ambiguity + the matchup pairs). The
  check-seo-teamnames.js control roster swaps Real Madrid/PSG (now
  aliased, gated in the new check) for Villarreal/Valencia — the
  byte-identity law itself unchanged.
- **M5 — the deploy (the owner's same-day authorization, 2026-11-19) ✅.**
  The RUNBOOK §2 ritual held: `npm test` exit 0 re-run on the exact deploy
  tree → the local `wrangler dev` smoke (the seed-local-alias-smoke.js
  pool: `/healthz` `13.274.0-persianalias` + `/` 200 + the team/match pages
  rendering the aliases through REAL workerd) → remote fetched immediately
  before deploy (0 ahead) → `npx wrangler deploy` ~18:55 UTC
  (**Version ID `5c87d8bd-2417-4b02-bbe5-db7de3328e10`**) — safely BEFORE
  the Nov 20 Bayern–Köln no-deploy windows (M1 ~19:35 UTC Nov 20) and
  before the Dec 4-8 freeze window. Rollback = `npx wrangler rollback`
  (the previous deployment; KV additive — safe).
- **M6 — the live verification (all read from sportsignal.ir) ✅.**
  `/healthz`: `ok:true` + `version:13.274.0-persianalias` + 3 full ticks
  (last_cron 0→1 min, `degraded:false`, writes 673→676 normal band,
  subreq 31-35, `sched_mode:UPCOMING`). All 8 aliased team pages 200 with
  the LIVE alternateName arrays (بارسلونا/بارسا، رئال مادرید/رئال، بایرن
  مونیخ/بایرن، منچسترسیتی/من سیتی/منچستر سیتی، آرسنال/ارسنال، اینتر
  میلان/اینتر/اینترمیلان، آث میلان/میلان، پاری سن ژرمن/پی‌اس‌جی/پاریسن
  ژرمن، دورتموند/بروسیا دورتموند). The byte-frozen surfaces verified
  LIVE unchanged: the Barcelona team title/H1 + the homepage title byte-
  identical. The side-effect map all 200: `/` + `/matches` +
  `/matches/today` (85KB content) + `/matches/tomorrow` + `/teams` +
  `/competitions` + `/sitemap.xml` + the archived match page sample.

- **M1 — the audit + the evidence extraction ✅.** The repo-first workflow
  (spec §3): AGENTS.md → the spec → the git state (clean, `main`, the S20
  close-out at HEAD) → the SEO research inventory re-verified (369-row
  VALIDATED-KEYWORD-MAP.csv: 198 GSC-observed / 38 autocomplete-validated /
  133 research-candidates; EVIDENCE-LOG A2 ambiguity evidence; the S11
  SEO_EXTRA_ALIASES 1-club precedent; the 13-club selected-team allowlist
  `CONFIG.BIG_TEAMS_BY_LEAGUE`; the canonical slugs incl. the
  provider-derived `internazionale-milano`/`club-atletico-de-madrid`).
  `scripts/extract-alias-evidence.js` machine-derived the per-alias GSC
  evidence (`scripts/alias-evidence.json`) — every figure traceable.
- **M2 — the additive research deliverables ✅.**
  `seo-implementation/keyword-research/ALIAS-KEYWORD-RESEARCH-2026-11-19.csv`
  (34 evidence-labelled rows: 13 accepted, 4 deferred, 5 ambiguous, 5 intent,
  7 excluded-intent) + `ALIAS-RESEARCH-REPORT-2026-11-19.md`. The original
  map/evidence files are READ-ONLY inputs — never overwritten (gated).
- **M3 — the implementation ✅ (freeze-safe).** `SEO_EXTRA_ALIASES`
  extended to the evidenced 9-club dictionary (رئال / بایرن / من سیتی +
  منچستر سیتی / ارسنال / اینتر + اینترمیلان / میلان / پی‌اس‌جی +
  پاریسن ژرمن / بروسیا دورتموند — every entry citing its GSC evidence
  inline) + the NEW `src/seo/persian-alias.ts` (the ambiguity-guarded
  query resolver — اینتر/میلان/منچستر/پاریس/اتلتیکو NEVER resolve alone;
  the UCL-phrase unlock; the normalization folds without over-folding;
  the matchup-pair resolver with the substring trap; zero imports, zero
  KV/fetch/CPU, wired into NO request path). The aliases ride the JSON-LD
  alternateName arrays ONLY — the byte-frozen titles/H1s/descriptions/
  answers + `fa-dict.ts` are byte-identical (gated).
- **M4 — the gates + the smoke ✅.** NEW `scripts/check-seo-persian-alias.js`
  (52 gates: alias/entity integrity, URL/indexation integrity (13 canonical
  URLs, zero alias slugs), the normalization folds, the ambiguity gates,
  the separation law, the freeze-safety gates, the evidence law) wired
  into `npm test` (**3,887 → 3,940 OK / 0 FAIL, exit 0**; tsc clean).
  `scripts/persian-alias-smoke.ts` **27/27** (the REAL module through tsx —
  every spec example query + the ambiguity + the matchup pairs). The
  check-seo-teamnames.js control roster swaps Real Madrid/PSG (now
  aliased, gated in the new check) for Villarreal/Valencia — the
  byte-identity law itself unchanged.
- **M5 — the first commit ✅.** CHANGELOG (`v13.274.0-persianalias`), DECISIONS
  (PCA-1), the version triple
  (13.273.1-dayhub → 13.274.0-persianalias) + the check-stats LIVE pins +
  the S19/S20 ride-forwards re-pinned. Pushed to `main` (one-shot token
  push, no token persisted) — commit `6fd2f1d`. The M5/M6 deploy + live
  verification above were the owner's same-day follow-up authorization;
  the second commit records the deploy outcome in this HANDOFF (+ the
  seed-local-alias-smoke.js local-dev seeder, never run against prod).

**Deployed + freeze intact:** the owner authorized the deploy later the
same day (2026-11-19). The Dec 4-8 freeze still HOLDS — zero byte-frozen
bytes touched (gated + live-verified: the Barcelona team title/H1 + the
homepage title byte-identical); the deploy landed ~18:55 UTC, safely
BEFORE the Nov 20 Bayern–Köln no-deploy windows (M1 ~19:35 UTC Nov 20).
`persian-alias.ts` stays inert at runtime (imported by nothing); the
extended alternateName arrays ride the existing JSON-LD builders. The
post-Dec-8 follow-ups (visible-copy alias mentions in the S18 editorial
body, the deferred candidates, the fresh-export re-derivation) remain
the owner's next phase — see the DECISIONS PCA-1 revisit clause.


## This session (S20 — the all-matches day pages; 2026-11-18/19 — BUILT + GATED + DEPLOYED @100% + the mid-session dayhub fix `13.273.1-dayhub` + the post-fill live verification MEASURED (§2a): the today hub lists 7 rows on the FIFA-window break day — DONE)

**The objective (the owner's 2026-11-18 brief):** «بازی‌های امروز»
(`/matches/today`) and «بازی‌های فردا» (`/matches/tomorrow`) must show
ALL of the day's matches — never an empty page on days without marquee
fixtures — chronological, desired teams ranked higher. **DONE — deployed
2026-11-18 ~13:21 UTC (versioned `0346be4d…` @100%, version
`13.273.0-dayhub`), then REDEPLOYED same day as `13.273.1-dayhub` after
the ~14:10 UTC first full sweep live-proved the fill's original slot dead
(0 intl rows, meter ≥44 — see M4.5 below)**, outside the Nov 20 Bayern–Köln
no-deploy windows. The ranking law was already shipped (the hubs list
every pool match big-first + chronological — the audit's §1 finding); S20
widened the DATA UNIVERSE, not the page builders.

- **M1 — the FD four + the Persian names ✅** (commit `f10ba4f`):
  `CONFIG.FD_DAYVIEW_COMPS = [DED,PPL,ELC,BSA]` appended ONLY to the FD
  fetch URLs (`provider-fd.ts` — the ONE URL site for the full sweep AND
  the live sweep, so in-flight Brasileirão statuses ride the same call —
  and `providers.ts fetchLongView`). Same single batched FD call — +0
  subrequests (re-verified live this session: 10 comps, errorCode none).
  `CONFIG.LEAGUES` UNTOUCHED (the admin-state trap — check-gated).
  FA_COMPS + the 8 new codes + COMP_EN twins + the curated fa-dict
  national-team seed (~110 entries, every key a live-verified PROVIDER
  name form: «IR Iran»→ایران, «Turkiye»→ترکیه, «Czechia Republic»→چک …).
- **M2 — the international fill ✅** (commit `4cbe6f3`): new
  `src/provider-intl.ts` — the emptiness-gated scan ([today−1d, tomorrow]
  × 4 intl slugs, ONLY when no CLUB match kicks off in [now−1d, now+1d];
  the FD-4 codes deliberately don't count — BSA plays THROUGH windows;
  club days pay ZERO extra calls; the 44-metered stop is the backstop) +
  the HYGIENE LAW (`sanitizeIntlRows`: the senior-men filter incl. the
  provider's live-verified "(w)" women's form + the unordered-pair+date
  collapse keeping the most-progressed status — the reversed-dupe/ghost/
  youth classes die BEFORE the pool). Wired: the fill in
  `fetchMatchesFromAPI`, the live-sweep sanitize, `SS_LIVE_ELIGIBLE` + 4,
  the cron-pool cadence relevance (window days sweep like matchdays), the
  reuse-guard extension. Zero page-builder changes.
- **M3 — the gates + the harness ✅** (commit `60c0fed`):
  `check-s20-dayhubs.js` (46 gates, static + behavioral — the REAL
  translateCompetition + the REAL provider-intl module eval'd whole)
  wired into `npm test` (3,841 → **3,887 OK / 0 FAIL, exit 0**; tsc
  clean). `s20-dayhub-smoke.ts` **34/34** (club-day ordering, break-day
  hygiene incl. the reversed-dupe collapse + the ghost's finished row not
  rendering as upcoming, dead-day honesty, the side-effect map, the
  goal-alert zero-audience skip — no claim, baseline advances).
  `s20-seed-local-kv.js` the local break-day seeder.
- **M4 — version + deploy + verify ✅ (partial — see below):** the
  version triple + the check-stats LIVE pins + the check-s19 pin
  ride-forward + the CHANGELOG entry (commit `60c0fed`). LOCAL
  wrangler-dev smoke with the seeded break-day pool: `/healthz
  13.273.0-dayhub + ok:true + pool_matches:5`; `/matches/today` 200 with
  **5 rows** (Cruzeiro–Palmeiras + Flamengo–Paranaense with «سری آ برزیل»،
  عراق–ایران «بازی دوستانه ملی»، دانمارک–نروژ «لیگ ملت‌های اروپا»،
  آمریکا–مکزیک «لیگ ملت‌های کونکاکاف» — the answer card «۵ بازی امروز در
  برنامه است. نزدیک‌ترین: عراق – ایران …»); `/matches/tomorrow` 200
  honest-empty; the homepage 200. DEPLOYED `0346be4d-a641-4775-b4ee-f1bad29e36d0`
  @100% (2026-11-18 ~13:21 UTC — before Nov 20 by 2 days). LIVE verified
  immediately: `/healthz ok:true + version 13.273.0-dayhub` + healthy
  ticks (subreq_last_tick 31, degraded false); homepage + `/matches` +
  `/sitemap.xml` unchanged (no new-comp rows); the pre-fill day pages
  still the honest empty state (the pool was last swept at ~14:10 UTC by
  the ORIGINAL code — the gated fill runs only inside a FULL sweep, and
  that first sweep live-proved the fill's post-fan-out slot DEAD: FD 6 +
  TSP 8 + the club day fan-out 27 + a standings refresh left the meter
  ≥44, so the fill's own 44-stop fired at 0 calls — +53 FD-4 rows landed,
  ZERO intl rows on a provably-open gate day).
- **M4.5 — the dayhub fix (`13.273.1-dayhub`, this session) ✅:** the fill
  moves BETWEEN TSP and the sportscore CLUB fan-out (the only budget slot
  with headroom — when the gate is open, the fan-out's own [now−1d,
  now+1d] window is provably empty of club matches; its ~27 calls still
  run after the fill, bounded by the same 44-stop) + the gate feeds on
  `opts.clubContext` (the tick's cached pool rows, already in memory at
  cron-pool — ZERO new KV reads) so sportscore-only club rows (PGL) close
  it exactly like FD/TSP rows. Gates re-pinned (check-s20 wiring gate +
  check-reliability's sequential-sources gate carry the fill hook; the
  version pins 13.273.0 → 13.273.1 across the triple + the check-stats
  LIVE pins + the S19 ride-forward), `npm test` **3,887 OK / 0 FAIL,
  exit 0**, tsc clean, harness **34/34** against the REAL re-wired code.
  Redeployed versioned `13.273.1-dayhub` during the IDLE window — the
  fill's first real production run = the next full sweep, **~20:10 UTC**
  (the 6h IDLE discovery cadence from the ~14:10 UTC sweep).
  **The post-fill live verification (MEASURED 2026-11-19 00:48 UTC —
  done, in §2a):** the fill ran in production on BOTH post-fix sweeps
  (the ~20:1x UTC window [Nov 17–19] — proven by the pool-backed
  `/matches/iraq-vs-ir-iran-2026-11-17` 200 with real content — and the
  ~23:41 UTC window [Nov 18–20]); `/matches/today` (Tehran Nov 19)
  lists **7 rows** (the six Brasileirão fixtures «سری آ برزیل» + the
  fill's «بازی دوستانه ملی» row Western Springs–Tonga) with the answer
  card «امروز ۷ بازی …» — NOT the empty state, on a FIFA-window break
  day; pool 342 → 395 → **451**; `/matches/tomorrow` 6 rows (3 BSA +
  Bayern–Köln + 2 more); `/matches/usa-vs-haiti-2026-11-18` 200
  (FINISHED — kept its page, never lists as upcoming);
  homepage//matches/sitemap re-checked with ZERO new-comp rows (the
  side-effect map held); hygiene live-clean (no youth/women/ghost
  rows render);

## Current state (machine)

- **Version:** `13.273.1-dayhub` (`src/config.ts` / `package.json`
  `13.273.1.0`). npm test baseline **3,887 OK / 0 FAIL, exit 0**
  (`npx tsc --noEmit` clean + 59 check scripts — the S19 baseline 3,841 +
  the 46-gate `check-s20-dayhubs.js`). The S20 harness: `npx tsx
  scripts/s20-dayhub-smoke.ts` (34/34 — manual, not in the test chain,
  the s17/s18/s19 precedent). The local seeder: `node
  scripts/s20-seed-local-kv.js`.
- **Deploy:** Worker `ucl-notifier`, versioned deploys only. Current
  deployment `81b1d4f0-e5b6-4293-909c-cf5d93690131`
  (`13.273.1-dayhub`; 2026-11-18 ~14:47 UTC, @100%; post-deploy `/healthz`
  `ok:true` + the new version + healthy ticks, all surfaces 200). Rollback
  chain: `0346be4d` (13.273.0-dayhub, S20 M4) → `7c54e223`
  (13.272.0-goalert, S19) → `0fad7482` (13.271.0-content, S18)
  → `62c3b14d` (13.270.0-faq, S17) → earlier (see the RUNBOOK). Rollback =
  `npx wrangler rollback`.
- **Production hostnames:** `sportsignal.ir` (apex Custom Domain),
  `football.sportsignal.ir` (301→apex except `/webhook`,`/api/`,`/admin`),
  `ucl-notifier.sportsignal.workers.dev` (noindex-guarded alias).
- **Branch:** `main`. Session 20 commits: `s20-m1` (`f10ba4f`) +
  `s20-m2` (`4cbe6f3`) + `v13.273-dayhub` (`60c0fed`, the gates + the
  harness + the version triple) + the docs close-out commit (`5f5f2b4`) +
  the dayhubfix commit (`14f6e9d`, `13.273.1`) + the §2a post-fill
  evidence commit (the session report's measured close-out). The session
  report: `docs/history/2026-11-18-s20-dayhubs.md` (§2a = the measured
  post-fill evidence).
- **Commands:** `npm test` (must exit 0 before every push). **npm only,
  never `bun install`**. Local dev: `npx wrangler dev --config
  wrangler.dev.toml --port 8787 --local` (the local D1 needs `npx wrangler
  d1 execute sportsignal-users --config wrangler.dev.toml --local
  --file=db/users-schema.sql` once after a state wipe). The miniflare
  cron-test endpoint (—test-scheduled) is broken in this sandbox
  (wrangler 4.50 DataCloneError) — use the harness for tick logic.
  Deploy needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in the
  env. Versioned deploy: `npx wrangler versions upload` → `npx wrangler
  versions deploy --version-id <id> --percentage 100 --yes`.
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (unchanged — S20 adds
  ZERO new schedulers).
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js`
  carries the bundle ORDER — `provider-intl.ts` sits after
  `provider-sportscore.ts`), `assets/` (immutable versioned client
  payload; SW `sportsignal-v126`, bundle `public-13.80.js`, stylesheet
  `public-13.87.css` — untouched by S20), `docs/` (RUNBOOK, HANDOFF,
  specs, audits, history).
- **Standing limits:** the Dec 4-8 freeze HOLDS (S20 changed zero
  byte-frozen SEO/GEO surfaces, zero client assets — check-gated); `_headers`
  at the 100-rule cap (no new pins — no new assets); **no deploys during
  the Nov 20 Bayern–Köln windows (M1 ~19:35 UTC, M2 ~21:35-45 UTC — the
  first natural goal-alert windows: watch, don't deploy)**; the KV read
  quota + the 10ms CPU cliff remain the owner's Workers Paid plan
  decision. The fill's budget: +0 FD subrequests, ≤12 gated sportscore
  calls only on window days, pool worst case ~230KB (under the 331KB
  slim norm).

## The alerts track state

Session 19 ✅ Completed + deployed + version-verified live (2026-11-17).
Session 20 ✅ **Completed + deployed @100% (2026-11-18) + post-fill verified
live (2026-11-19) — the all-matches day pages** (the audit + the spec +
the four milestones + the gates + the harness + the deploy + the
mid-session dayhubfix `13.273.1` + the MEASURED §2a: the today hub
listing 7 rows on the FIFA-window break day, pool 451, both fill runs
proven via pool-backed intl pages; the first natural goal window Nov 20
will also be the first goal-alert run over the widened universe — BSA
Friday matches now ride the same FD live sweep).
Session 21+ ⬜ — the OLD S20 preview moves here: the per-match
subscription UX (deep-links, `/follow match`), red-card alerts IF a real
source materializes, alert pacing/quiet-hours, the channel goal posts +
the scorer enrichment, the Workers AI enrichment ideas parked in
`docs/telegram-channel-mirror/ENRICHMENT.md`.

(The SEO follow-up track Sessions 16-18 are COMPLETE — see
`seo-implementation/session-reports/` + the FINAL-SEO-IMPLEMENTATION-REPORT;
the data-dependent gaps are the owner's next phase.)

## Open follow-ups

- ~~The S20 post-fill live verification~~ **DONE** (measured 2026-11-19
  00:48 UTC, §2a of the session report: both fill runs proven, 7 rows on
  the break-day today hub, pool 451, three intl match pages 200, the
  side-effect map re-checked clean; both verifier cron jobs deleted).
- **The Nov 20+ first-natural-goal watch:** Bayern–Köln Friday 19:30 UTC —
  the first live goal alert under the S19 layer (with followed teams);
  now ALSO the first goal window over the widened universe. Check the D1
  `notified_v1` `goal:*` rows + the delivery ledger after the match. No
  deploys in the M1/M2 windows.
- **The KV read-quota exhaustion (the owner decision)** — unchanged (the
  Workers Paid plan is the durable fix).
- **The wrangler-4.50 sandbox DataCloneError** on the miniflare
  scheduled-test endpoint (tooling; the harness covers tick logic).
- The S21+ alerts backlog (per-match subscriptions, red cards IF a real
  source, quiet hours, channel goal posts, scorer enrichment).
- **The Persian-alias phase-2 reminder layer (Dec 9, 2026):** the scheduled
  workflow pings the standing `[PERSIAN-ALIAS-PHASE-2]` issue
  (assadigit/SportSignal#4) on Dec 9 (+ the Dec 16 backup nudge) — then
  phase 2 starts ONLY after the three unblocks (the date, the owner's
  freeze-lift decision + final measurement record, the uploaded Dec 4-8 GSC
  export — see the banner at the top of this file). After phase 2 ships:
  close issue #4, disable the workflow, retire the banner + the
  check-phase2-freeze-lift gate the same session.
- The post-Dec-8 freeze-lift decisions + the remaining S15-close backlog
  (unchanged, owner-driven).

**Credentials used, not stored.** The GitHub + Cloudflare + Telegram +
football-data tokens were used across the S19/S20 sessions (the clone,
the push, the deploy, the API probes, the live verification) — the owner
should rotate them when development pauses.



## This session (Telegram Alerts Track Session 19 — the live goal alerts; 2026-11-17 — DONE in code + deployed + version-verified live; the first natural goal alert lands Nov 20+ with the post-break fixture resumption)

**The objective (the owner's S19 brief):** per-user live goal alerts — goal
events detected from REAL score deltas in the existing LIVE sweep, fanned
out to team-following chats through the existing engine/transport, with the
subscription/persistence/distribution machinery behind them. **DONE.**

- **S19-M1 — the detection layer ✅.** `src/goal-alert.ts` (the
  `notify-status.ts` structural twin; one hook in `runNotifyPhase` after
  `detectStatusChanges`, own try/catch): the KV snapshot map
  `goal_snapshots_v1` (last-known scores of in-window LIVE matches,
  kickoff [−6h, +4h], a REAL score required — MISSING-IS-NOT-ZERO;
  write-only-when-changed, TTL 2d) + the delta law (score-side
  attribution; FIRST SIGHTING SEEDS NEVER FIRES; backward movement =
  correction, silent; a provider gap RETAINS the baseline — the next good
  sweep fires the missed goal(s) once, late, never a burst).
- **S19-M2 — the claim + the audience ✅.** The per-goal dedupe rides
  `notified_v1` verbatim (D1 write-first `INSERT OR IGNORE`; `ntype`
  `goal:<h>-<a>` — the score tuple AFTER the goal; at most one alert per
  tuple per match ever). The audience is the EXISTING team follows
  (`userFollowsMatch` one/both — EITHER side fans out; zero new
  subscription surface).
- **S19-M3 — the send path ✅.** The existing transport (retries/429/
  outbox/dead-chat + the per-chat delivery ledger) + cache-only cards
  (`cachedCardPng` — the v13.94.1 CPU-keeper law; text fallback per chat)
  + the compact Persian-first alert («گُل!» + teams + competition +
  «نتیجه: *۲-۰*» + «گلِ X», the «۲ گل برای X» variant, the en twin — never
  scorer names/minutes the sweep does not carry) + the TWO-LAYER
  WRITE-FIRST (reservation BEFORE any write; the D1 claim BEFORE any
  send; the snapshot advances only processed rows) + `GOAL_ALERT_MAX_UNITS`
  = 6/tick.
- **The honesty gate ✅.** Red-card alerts SCOPED OUT (DECISIONS S19-3 —
  no incident source on the wired providers; never fabricated). Channel
  goal posts + the scorer enrichment = S20 backlog (S19-5).
- **The gates ✅.** `check-s19-goalalert.js` (52 gates) wired into the
  `npm test` chain — **3,841 OK / 0 FAIL, exit 0**; `npx tsc --noEmit`
  clean; the harness `s19-goal-smoke.ts` **22/22** (the 0-0 → 1-0 → 2-0
  timeline, the re-sweep zero, the provider-gap no-burst recovery, the
  fail-closed D1 outage, EITHER-side fan-out, the engine composition
  regression) through the REAL `detectGoalEvents` + mock KV/D1 + a
  captured transport.
- **The deploy ✅ (version-verified live).** Deployment
  `7c54e223-b39f-4c9f-9bde-ea7d06047610` @100%; the live `/healthz`
  reports `version: 13.272.0-goalert`. Local boot smoke clean (workerd);
  the miniflare cron-test endpoint is blocked by a wrangler-4.50 sandbox
  bug (ScheduledController DataCloneError — tooling, documented in the
  session report §4). Bot surface read-verified (`getMe` + the webhook,
  0 pending). **Honest limit:** the Nov 14–19 international break means no
  live match exists until Fri Nov 20 19:30 UTC — the goal path is
  harness/gate/boot proven; the first natural production alert lands
  Nov 20+.

