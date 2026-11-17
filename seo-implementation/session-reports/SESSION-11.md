# SEO Program Session 11 — Persian Entity Naming + Metadata Polish

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

- **Date:** 2026-11-17
- **Version shipped:** `13.267.0-persian-entities` (`package.json` `13.267.0.0`)
- **Live before:** `13.266.0-internallinks` (Session 10, deployment `12793863-ff39-49af-a5f7-e1cf0b5ccc28` @100%)
- **Status:** Completed / deployed (versioned). The KV quota was healthy at deploy (it had reset at UTC midnight — `ok:true` + `pool_matches:324` + `kv_writes_day:153` + `degraded:false`).

## 1. Objective and scope

The Persian entity-naming/metadata-polish session of the 15-session SEO
program: spelling-freeze-aware — the alternateName JSON-LD aliases + the
non-title metadata (og:type, og:locale) + the TEAM_SLUGS no-op tidiness
fix are NOT GSC-measured surfaces (machine-readable JSON-LD / non-title
metadata) — safe under the Dec 4-8 freeze IF they do not touch the
byte-frozen title/H1/description/answer-sentence bytes. The C1/C6/C8
foundation + the team-page WebPage node + the competition-page
CollectionPage node + the /teams index selected-clubs-first tile
ordering are live; Session 11 owns the Persian entity naming/metadata
polish (the route plan §10).

The Dec 4-8 measurement freeze applies to the GSC-measured surfaces (all
title/H1 bytes + the team-name spellings + the date-hub empty-state copy
on /matches/tomorrow). The S11 changes do NOT touch any byte-frozen
surface (verified by the new `check-seo-persian-entities.js` gate §11).

## 2. Findings (the Persian entity-naming surfaces traced — Task 1-audit)

The audit (read-first, no code) traced every faName/translateCompetition
call site — the team-page title/H1/answer (byte-frozen), the match-page
title/H1/answer (byte-frozen), the competition-page title/H1/answer
(byte-frozen), the homepage hero H1 (byte-frozen), the breadcrumbs, the
footer-hook «تیم‌ها» line, the /teams + /competitions tile grids, the
JSON-LD alternateName arrays (sportsTeamNode + sportsOrganizationNode),
the fa-dict.ts dictionary, the team-names.ts SEO override layer, the
page-shell.ts og:type/og:locale meta tags, and the TEAM_SLUGS slug-override
table. The audit identified THREE freeze-safe changes (none touch the
byte-frozen title/H1/description/answer-sentence bytes):

1. **og:type=article on the 3 detail page types (the S07-H4 follow-up).**
   Every page defaulted to `og:type=website` (the page-shell.ts default).
   Spec §8 + the keyword map §2.7/2.8-2.13/2.15 distinguish the detail
   pages (article) from the hubs/index pages (website). og:type is a
   `<meta>` tag in `<head>` — NOT in the SERP snippet, NOT a GSC-measured
   surface (machine-readable metadata). Freeze-safe.

2. **The SEO_EXTRA_ALIASES map — the GSC-observed Persian short-form
   aliases.** The GSC-AUDIT-BASELINE surfaces 179 impressions for
   «بازی بعدی بارسا» — the short form «بارسا» is a real GSC-observed
   Persian query variant for FC Barcelona that is NOT already in the S1
   M2 override layer (which covers Leipzig/Nordsjaelland/Roma only). The
   alternateName JSON-LD array is the schema.org mechanism for alias
   grounding — the alias rides the machine-readable array ONLY (invisible
   to the SERP snippet). The visible faName/SEO name bytes stay
   byte-frozen — only the JSON-LD alternateName gains the alias. The
   S-05 no-invented-data rule holds: every alias cites its GSC evidence.

3. **The TEAM_SLUGS no-op tidiness fix (route plan §7).** The live
   canonical URLs for Inter + Atlético (`/teams/internazionale-milano`
   + `/teams/club-atletico-de-madrid`) are provider-derived — the
   pinned `inter-milan` / `atletico-madrid` entries are dead (the
   provider names miss the pinned keys + fall through to the
   derivation). The route plan §7 audit recommended "optionally Session
   8 aligns the pinned table to reality (adding the provider-name keys)
   as a no-op tidiness fix with zero URL effect" — Session 11 (the
   Persian entity-naming/metadata polish session) is the right place
   to do it. The explicit pins match the derivation output EXACTLY
   (verified: `teamSlug("FC Internazionale Milano") ===
   "internazionale-milano"`; `teamSlug("Club Atlético de Madrid") ===
   "club-atletico-de-madrid"`).

The audit confirmed the OTHER Persian entity-naming surfaces are already
correct (no change needed):

- **The faName funnel (src/seo/markup.ts faName() + the fa-dict.ts
  dictionary + the team-names.ts SEO override layer)** — verified
  byte-frozen for the S1 M2 F3 spelling fix (Leipzig «لایپزیگ»/«لایپزیش»,
  Nordsjaelland «نورشلان»/«نوردشیلند», Roma «رم»/«آ س رم»). The 7 override
  cases + the 4 control teams pass byte-identical (the existing
  `check-seo-teamnames.js` gate stays green after the S11 type-strip
  regex extension).
- **The translateCompetition map (the Persian competition-name aliases)** —
  the SportsOrganization.alternateName carries the Persian name (e.g.
  «لیگ قهرمانان اروپا» for CL); the body copy uses cNameFa from the data.
  Verified live: `/competitions/la-liga` SportsOrganization.alternateName =
  «لالیگا» ✓.
- **The breadcrumbs' Persian wording (spec §5 + P-17)** — the crumb names
  («خانه», «بازی‌ها», «تیم‌ها», «رقابت‌ها») are consistent + accurate + agree
  with the page's H1. The team/competition/match page crumbs carry the
  team/competition/match name (byte-frozen). No change needed.
- **The og:locale=fa_IR metadata (spec §7 Persian-first)** — already
  pinned in page-shell.ts (every page carries the Persian locale). No
  change needed (re-verified by the new gate).

## 3. Files changed

### Modified (runtime)
- `src/seo/pages.ts` — `buildMatchPage` + `buildTeamPage` +
  `buildCompetitionPage` gain `ogType: "article"` in their `buildHead`
  calls (the S07-H4 follow-up — spec §8 + keyword map §2.7/2.8-2.13/2.15).
  The byte-frozen title/H1/description/answer-sentence bytes are
  untouched.
- `src/seo/team-names.ts` — gains the `SEO_EXTRA_ALIASES` map (the
  GSC-observed Persian short-form aliases) + the `seoTeamAltNames`
  function consults it (the alias rides the JSON-LD alternateName array
  ONLY). The first entry is the Barcelona «بارسا» alias (GSC evidence:
  179 impressions for «بازی بعدی بارسا» in GSC-AUDIT-BASELINE.md).
- `src/slugs.ts` — `TEAM_SLUGS` gains the explicit pins for
  `"Club Atlético de Madrid": "club-atletico-de-madrid"` +
  `"FC Internazionale Milano": "internazionale-milano"` (the route plan
  §7 no-op tidiness fix — the live provider-derived slugs are now
  EXPLICIT pins; zero URL change).

### Modified (tests)
- `scripts/check-seo-teamnames.js` — the type-strip regex chain gains a
  new `.replace(/: Record<string, string\[\]> =/, " =")` line (the S11
  SEO_EXTRA_ALIASES annotation). The existing 7 override cases + the 4
  control teams pass byte-identical.
- `scripts/check-seo-persian-entities.js` — NEW. 15 offline gates pinning
  the S11 changes (see §4 below). Wired into the `npm test` chain after
  `check-seo-internallinks.js`.
- `scripts/s11-persian-entities-smoke.ts` — NEW. A seeded tsx render
  harness: a SeoCtx with 4 upcoming matches (Barcelona/Leipzig, Real
  Madrid/Inter, Arsenal/Bayern, Chelsea/AC Milan) renders the match page
  (Barcelona vs RB Leipzig — exercises BOTH the Barcelona «بارسا» alias
  AND the Leipzig override) + the team page (Barcelona — exercises the
  SportsTeam.alternateName) + the competition page (La Liga — exercises
  the og:type=article + the SportsOrganization.alternateName) + the
  homepage (exercises the og:type=website default) + the /teams index
  (exercises the og:type=website hub pattern) + the TEAM_SLUGS no-op
  tidiness fix. **34/34 assertions pass.**
- `scripts/check-stats.js` — the version-sync pins ride forward to
  `13.267.0-persian-entities` + the new `check-seo-persian-entities.js`
  existence + the test-chain regex; the v13.258-mca11y block (the
  consolidated live version pin) bumps to `13.267.0.0` + adds the new
  gate existence + the test-chain regex with `check-seo-persian-entities.js`.

### Modified (docs + version)
- `src/config.ts` — `VERSION` `13.266.0-internallinks` →
  `13.267.0-persian-entities`.
- `package.json` — `version` `13.266.0.0` → `13.267.0.0`; the `test`
  script chain gains `&& node scripts/check-seo-persian-entities.js`.
- `package-lock.json` — resynced via `npm install`.
- `CHANGELOG.md` — the `# v13.267.0-persian-entities` entry.
- `docs/HANDOFF.md` — rewritten for Session 11.
- `docs/DECISIONS.md` — S11-1 (the og:type=article on the 3 detail page
  types — the S07-H4 follow-up), S11-2 (the SEO_EXTRA_ALIASES map +
  Barcelona «بارسا» alias), S11-3 (the TEAM_SLUGS no-op tidiness fix —
  route plan §7), S11-4 (the freeze-coordination), S11-5 (the KV quota
  healthy at deploy).
- `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` — the
  Session 11 row (Completed / deployed).
- `seo-implementation/session-reports/SESSION-11.md` — this file.
- `seo-implementation/next-session-prompt.md` — the Session 12 start
  prompt (EN architecture + hreflang decision).

### No client asset changed
SW stays `sportsignal-v126`; the client bundle stays `public-13.80.js`; the
stylesheet stays `public-13.87.css`. The change is server-side-only (the
RUNBOOK §2 rule) — the og:type=article pin + the SEO_EXTRA_ALIASES
extension + the TEAM_SLUGS no-op tidiness fix all render server-side in
the HTML `<head>` / the JSON-LD `<script>` block / the in-memory slug
table; no client asset renamed.

## 4. The new check gate (15 offline gates)

`scripts/check-seo-persian-entities.js` pins:

1. og:type=article on the 3 detail page types (buildMatchPage +
   buildTeamPage + buildCompetitionPage).
2. og:type=website default on the hubs/index pages (buildMatchesPage +
   buildTeamsIndexPage + buildCompetitionsIndexPage).
3. og:type=website on the time hubs (buildHub passes NO ogType — the
   default stands for /matches/today + /tomorrow + /this-week + /this-weekend).
4. og:type=website on the homepage (buildHomePage in router.ts passes
   NO ogType — the default stands).
5. og:locale=fa_IR pinned in page-shell.ts.
6. The SEO_EXTRA_ALIASES map exists in team-names.ts.
7. The Barcelona «بارسا» alias (with the GSC evidence comment).
8. seoTeamAltNames consults SEO_EXTRA_ALIASES (the runtime wiring).
9. Barcelona behavior — faName=«بارسلونا» byte-frozen, altName=null,
   altNames=[«بارسلونا», «بارسا»].
10. Barcelona short-form provider name resolves the same alias
    (normTeamKey folds).
11. Leipzig (the S1 M2 / F3 override case) unchanged.
12. Chelsea (a non-overridden selected club with NO GSC-evidenced short
    form) — altNames=[«چلسی»].
13. jsonld.ts wired (sportsEventNode + sportsTeamNode consult
    seoTeamAltNames).
14. The byte-frozen title/H1 ladders (match S7 + team S8 + competition S9)
    are byte-identical.
15. TEAM_SLUGS carries the explicit pins for the live provider-derived
    slugs + the no-op proof (the explicit pins match the derivation
    output).
16. fa-dict.ts unchanged (the dictionary spellings stay — the
    SEO_EXTRA_ALIASES extension lives in src/seo/team-names.ts only; the
    scope law from S1 M2 holds).

## 5. Tests

- `npm test` exit 0. **Baseline 3,704 OK → 3,720 OK** (the +16 = the new
  `check-seo-persian-entities.js` 15 gates + 1 summary line; `npx tsc
  --noEmit` clean).
- The new `check-seo-persian-entities.js` standalone: 15/15 gates pass.
- The existing `check-seo-teamnames.js` (still passes — the 7 override
  cases + the 4 control teams byte-identical after the S11
  SEO_EXTRA_ALIASES extension; the type-strip regex extended to handle
  the new `: Record<string, string[]> =` annotation).
- The seeded tsx render harness (`scripts/s11-persian-entities-smoke.ts`
  — 34/34 assertions pass: the match/team/competition detail pages +
  the homepage + the /teams index + the TEAM_SLUGS pins).
- Local `wrangler dev` smoke (miniflare local mode): worker boots
  cleanly (no errors in the dev log); `/healthz` 503 + `pool_matches:0`
  on the empty local KV (expected — same as Session 8/9/10 local
  smoke); the homepage renders `og:type=website` + the byte-frozen
  title; `/teams/barcelona` + `/competitions/la-liga` return 404 on the
  empty local KV (correct — the data-path).

## 6. Deploy

Versioned deploy via the repo's established ritual (RUNBOOK §2): `npm test`
(exit 0) → local `wrangler dev` smoke (worker boots) → `npx wrangler versions
upload` (Version ID `21efcee2-269a-4ad1-819c-b6027822607a`) → `npx wrangler
versions deploy --version-id 21efcee2-269a-4ad1-819c-b6027822607a
--percentage 100 --yes` → live verify. **Deployed:
`21efcee2-269a-4ad1-819c-b6027822607a` (`13.267.0-persian-entities`) @ 100%.**
Live `/healthz` confirms version `13.267.0-persian-entities`. The
deployment ID is recorded in `docs/HANDOFF.md` + the tracker.

**Cloudflare budget of this change:** zero new KV reads (the og:type=article
pin + the SEO_EXTRA_ALIASES lookup + the TEAM_SLUGS pin are all in-memory
operations on data already in scope); zero new KV writes (`kv_writes_day:153`
at deploy — unchanged by the S11 change); zero new subrequests; zero new
fetches; zero render-cost additions (a small `ogType: "article"` string in
the buildHead call + a small SEO_EXTRA_ALIASES map lookup in seoTeamAltNames
+ a constant-time TEAM_SLUGS lookup). Well within the free-tier budget.

**Deploy-window check:** today is 2026-11-17 (the deploy landed at 02:35 UTC
2026-11-17) — NOT Nov 20 (the Bayern–Köln S27 auto-verify windows: kickoff
19:30 UTC, M1 ~19:35, M2 ~21:35-45 UTC; `sched_next_ko:
2026-11-20T19:30:00.000Z`). Safe to deploy.

**Live verify (2026-11-17 02:40 UTC):** `/healthz` version =
`13.267.0-persian-entities` ✓; `ok:true` + `pool_matches:324` + `pool_age_min:55`
+ `kv_writes_day:153` + `degraded:false` (the KV quota had reset at UTC midnight
— healthy at deploy). The match page `/matches/barcelona-vs-villarreal-2026-11-22`
renders `og:type=article` + `og:locale=fa_IR` + the byte-frozen title `⚽
بارسلونا – ویارئال | لالیگا، ۱ آذر (۲۲ نوامبر) | اسپرت سیگنال` unchanged ✓ +
the `SportsEvent.homeTeam.alternateName = ["بارسلونا", "بارسا"]` (the
GSC-evidenced short form rides the JSON-LD array) ✓; the team page
`/teams/barcelona` renders `og:type=article` + `og:locale=fa_IR` + the
byte-frozen title `بارسلونا — برنامه بازی بعدی و ساعت شروع | اسپرت سیگنال`
unchanged ✓ + the `SportsTeam.alternateName = ["بارسلونا", "بارسا"]` ✓; the
competition page `/competitions/la-liga` renders `og:type=article` +
`og:locale=fa_IR` + the byte-frozen title `لالیگا — برنامه بازی‌های بزرگ
پیش‌رو | اسپرت سیگنال` unchanged ✓; the homepage `/` renders `og:type=website`
(the default) + `og:locale=fa_IR` + the byte-frozen title `برنامه بازی‌های مهم
فوتبال | تاریخ و ساعت شروع | اسپرت سیگنال` unchanged ✓. **The S11
data-surface self-verify is COMPLETE.**

## 7. The KV read quota (healthy at deploy; the daily-exceedance issue continues)

The account's 100,000 KV reads/day free-plan limit was exceeded at Session 5
close and was STILL exceeded at Session 6/7/8/9/10 close. At Session 11
deploy (2026-11-17 02:35 UTC), the quota had reset: `ok:true` +
`pool_matches:324` + `pool_age_min:55` + `kv_writes_day:153` + `degraded:false`.
The S11 data-surface self-verify is COMPLETE (the live pages confirm the
og:type=article + the alternateName «بارسا» alias + the byte-frozen titles).
The S11 change has zero new KV reads (the og:type=article pin + the
SEO_EXTRA_ALIASES lookup + the TEAM_SLUGS pin are all in-memory), so it
cannot worsen the quota issue. The owner should continue to investigate the
read-source (the 10-min cron + public traffic + the bot may collectively
exceed 100K reads/day); the durable fix is a Workers Paid plan ($5/mo → 1M
reads/day).

## 8. Commit SHAs

- The code checkpoint: `037ef33` — `seo(s11): the Persian entity-naming/metadata
  polish — spelling-freeze-aware (the og:type=article on the 3 detail page
  types [the S07-H4 follow-up] + the SEO_EXTRA_ALIASES map carrying the
  GSC-evidenced Persian short-form aliases [the Barcelona «بارسا» alias] +
  the TEAM_SLUGS no-op tidiness fix [route plan §7]) + the new
  check-seo-persian-entities.js gate + the seeded render harness + version
  bump` (the og:type=article pins, the SEO_EXTRA_ALIASES extension, the
  TEAM_SLUGS no-op tidiness fix, the new check script, the seeded render
  harness, the version bump, the check-stats pins, the CHANGELOG entry,
  the report/tracker/handoff/decisions, the Session 12 prompt — one commit;
  ls-remote verified).

Recorded in `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`
Session 11 row after the push.

## 9. Unresolved risks / open follow-ups

- **The Dec 4-8 freeze:** the competition/team/match/homepage title/H1 bytes
  + the team-name spellings + the date-hub empty-state copy are byte-frozen.
  After Dec 4, with a fresh 16-month GSC export, apply the parked S2
  title-test winning pattern + decide the frozen-surface byte decisions
  (S09-3, S08, S07-H2, S06-H2, S06-H3). The S11 freeze-safe changes (og:type=
  article + SEO_EXTRA_ALIASES + TEAM_SLUGS no-op) are NOT reverted — they are
  durable.
- **The KV read quota:** healthy at S11 deploy (the quota had reset at UTC
  midnight 2026-11-17). Re-check at every session close until the owner
  resolves it (investigate the read-source or upgrade to Workers Paid).
- **The S10-2 follow-up (the homepage → team/competition spec §9 gap):**
  the homepage does NOT link directly to `/teams/<slug>` or
  `/competitions/<slug>` (spec §9 lists "Homepage → ... selected competition
  sections and selected team pages"). Closing it is a "link placement"
  change (in-scope per route plan §10) but touches the shared homepage
  standings/cups renderers (`markup.ts`) with visual side-effects — a
  Session 12+ follow-up (the EN/hreflang session or a dedicated internal-
  link pass).
- **The S11 SEO_EXTRA_ALIASES extension — future additions:** after Dec 4-8,
  with a fresh 16-month GSC export (the program's top evidence request),
  validate the alias coverage — add NEW GSC-observed Persian variants as
  further `SEO_EXTRA_ALIASES` entries (every alias cites its GSC evidence
  per the S-05 rule). If a GSC report surfaces a NEW GSC-observed short
  form for another selected club (e.g. «رئال» for Real Madrid, «بایرن» for
  Bayern), add it then.

## 10. Session 11 acceptance criteria (from the start prompt)

- ✅ **Audit the Persian entity-naming surfaces (read-first, no code)** —
  the audit traced every faName/translateCompetition call site (the
  team/match/competition/homepage title/H1/answer byte-frozen surfaces,
  the breadcrumbs, the footer-hook «تیم‌ها» line, the /teams + /competitions
  tile grids, the JSON-LD alternateName arrays, the fa-dict.ts dictionary,
  the team-names.ts SEO override layer, the page-shell.ts og:type/og:locale
  meta tags, the TEAM_SLUGS slug-override table). The audit identified
  THREE freeze-safe changes (og:type=article + SEO_EXTRA_ALIASES + TEAM_SLUGS
  no-op tidiness fix) + confirmed the OTHER surfaces are already correct.
- ✅ **The alternateName JSON-LD discipline (spec §6 + the team-names.ts
  scope law)** — the SEO_EXTRA_ALIASES map carries the GSC-observed Persian
  short-form aliases; the Barcelona «بارسا» alias rides the JSON-LD
  alternateName array ONLY (machine-readable, invisible to the SERP
  snippet). The S1 M2 / F3 override layer stays byte-frozen through Dec 4-8
  (verified by the existing `check-seo-teamnames.js` gate). The S-05 no-
  invented-data rule holds (every alias cites its GSC evidence).
- ✅ **The team-slug URL identity (route plan §7)** — the TEAM_SLUGS no-op
  tidiness fix aligns the table with reality (the live provider-derived
  slugs for Inter + Atlético are now EXPLICIT pins; the dead `inter-milan`
  / `atletico-madrid` entries stay for the sportscore/TSP short forms).
  Zero URL change, zero byte-frozen surface change. Verified by the new
  `check-seo-persian-entities.js` gate (the explicit pins + the no-op proof).
- ✅ **The og:type + og:locale metadata (spec §8)** — og:type=article on
  the 3 detail page types (the S07-H4 follow-up — decided YES, not deferred);
  og:type=website (default) on hubs/index pages; og:locale=fa_IR pinned in
  page-shell.ts. Verified by the new `check-seo-persian-entities.js` gate.
- ✅ **The breadcrumbs' Persian wording (spec §5 + P-17)** — verified
  consistent + accurate + agree with the page's H1. No change needed.
- ✅ **The faName funnel for NON-selected teams (the match-page footer-hook
  + the /teams index tiles)** — verified the faName is accurate + the S7
  gating (selected → `<a href>`; non-selected → plain text) holds. No
  change needed (the fa-dict.ts dictionary entries are byte-frozen through
  Dec 4-8 per the S11 prompt's standing constraint).
- ✅ **The spelling-freeze-aware discipline** — the S11 changes (og:type=
  article + SEO_EXTRA_ALIASES + TEAM_SLUGS no-op tidiness fix) do NOT touch
  any byte-frozen surface (verified by the new `check-seo-persian-entities.js`
  freeze-coordination gate). The fa-dict.ts entries for SELECTED clubs are
  byte-frozen (the S1 M2 F3 spelling fix is LIVE and mid-measurement —
  judge ~Dec 8).
- ✅ **Representative Persian entity-naming verification** — the seeded
  tsx render harness renders the match page (Barcelona vs RB Leipzig —
  exercises BOTH the Barcelona «بارسا» alias AND the Leipzig override) +
  the team page (Barcelona) + the competition page (La Liga) + the homepage
  + the /teams index + verifies the Persian naming is consistent + accurate
  + the alternateName aliases cover the GSC-observed variants (34/34
  assertions pass); the live verification confirms the og:type=article on
  all 3 detail page types + the SportsEvent.homeTeam.alternateName carries
  BOTH «بارسلونا» + «بارسا» + the byte-frozen titles unchanged on all 4
  page types.

## 11. Handoff to Session 12

Session 12 owns the EN architecture + hreflang decision (the route plan §8).
The next-session prompt is in `seo-implementation/next-session-prompt.md`. The
standing constraints carry: the Dec 4-8 freeze; the Cloudflare free-tier
budget; the KV read quota (re-check at S12 close); the S10-2 homepage →
team/competition gap follow-up; the S11 SEO_EXTRA_ALIASES extension (future
additions after Dec 4-8 with a fresh GSC export); do not start Session 13+
work in Session 12.
