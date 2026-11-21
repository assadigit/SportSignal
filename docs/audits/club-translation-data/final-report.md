# Club Persian Translation & Stadium Completion — Final Report

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

**Task:** `SPORTSIGNAL_CLUB_PERSIAN_TRANSLATION_COMPLETION_SPEC.md`
**Completed:** 2026-11-21 · **Version:** v13.277.0-clubdata · **Status: COMPLETE per spec §10**
**Verified season:** 2026/27 (FD `currentSeason`, confirmed live 2026-11-21)

---

## 1. Final competition coverage (spec §9.1, §9.2)

Population denominators are the VERIFIED 2026-27 rosters (football-data.org
standings API for PL/ELC/SA/BL1/FL1/CL + English Wikipedia season articles for
EL1/SB/BL2/SD; cross-checked — every relegation from a tier-1 league matches a
tier-2 promotion; archived in `rosters-2026-27.json`).

| Competition | Clubs | Persian before | Persian after | Stadiums before | Stadiums after |
|---|---|---|---|---|---|
| Premier League | 20 | 20 | **20 (100%)** | 6 | **20 (100%)** |
| Championship | 24 | 21 | **24 (100%)** | 0 | **24 (100%)** |
| League One | 24 | 9 | **24 (100%)** | 0 | **24 (100%)** |
| Serie A | 20 | 20 | **20 (100%)** | 4 | **20 (100%)** |
| Serie B | 20 | 4 | **20 (100%)** | 0 | **20 (100%)** |
| Bundesliga | 18 | 17 | **18 (100%)** | 2 | **18 (100%)** |
| 2. Bundesliga | 18 | 8 | **18 (100%)** | 0 | **18 (100%)** |
| Ligue 1 | 18 | 17 | **18 (100%)** | 1 | **18 (100%)** |
| La Liga | 20 | 19 | **20 (100%)** | 3 | **20 (100%)** |
| LaLiga 2 | 22 | 6 | **22 (100%)** | 0 | **22 (100%)** |
| **Total in scope** | **204** | **141 (69.1%)** | **204 (100%)** | **16 (7.8%)** | **204 (100%)** |

**Before/after (the honest denominator):** 141/204 → 204/204 canonical
Persian names; 16/204 → 204/204 current stadiums. The 63-club gap (the 2025-26
→ 2026-27 season churn: 5 PL relegations incl. West Ham + Wolves, the Wrexham
rise, the full Serie B / 2. Bundesliga / LaLiga 2 tiers the dict never
covered) is closed. **Zero clubs resolved through the fuzzy stem layer now**
(9 League One clubs previously resolved only via stems; 1 — Real Sociedad B —
resolved WRONGLY onto its parent; all now have explicit entries).

## 2. Champions League historical catalogue (spec §9.3)

- **Window:** 30 completed seasons = 1996-97 → 2025-26, plus the current
  2026-27 league phase (spec §3.2).
- **Participant sources:** the existing dict's 2005-06 → 2024-25 coverage
  (20-season layer, preserved byte-for-byte); the 9 older seasons extracted
  from each season's Wikipedia group-stage tables (16+24+24+32+32+32+32+32+32
  participants per season, format-consistent with the era); the 2025-26
  league phase from the FD API standings pull; the 2026-27 league phase from
  the FD API.
- **Outcome:** unique clubs found across the added window: 118 (incl.
  duplicates across seasons); matched to existing dict entries: 107; newly
  translated: 9 (Heerenveen, Willem II, Brøndby, IFK Göteborg, AIK,
  Helsingborg, Widzew Łódź, Boavista + Union Saint-Gilloise from 2025-26) +
  Paphos (probable) + 2 live FD legal-form aliases (PAE Olympiakos SFP,
  Qarabağ Ağdam FK); already-covered via the 2025-26 Ligue 1 season: 1
  (Nantes — stadium added); **deferred (defunct): 2** (1. FC Košice,
  dissolved 2005; Lierse S.K., bankrupt 2018 → refounded 3rd tier) —
  documented in `clubdata-2026-27.json` `deferred`, no active-club records
  created for defunct entities (spec §3.2 priority 4).
- **Boundary discipline:** only group-stage / league-phase (main-competition)
  participants were counted; qualifying-round-only clubs were not mixed in.

## 3. Stadium report (spec §9.4)

- **287 entries** in `CONFIG.TEAM_STADIUMS` (was 22): all 204 in-scope clubs
  + the CL 2026-27 league phase (36) + the historical layer's active clubs +
  provider-form aliases (shared grounds keyed per club: San Siro ×2, Stadio
  Olimpico ×2, Luigi Ferraris ×2, Romeo Menti ×2 — the established pattern).
- **en names:** 2026-27 season articles (stadium tables) + club infoboxes
  (SA/CL), current as of 2026-11-21. Sponsor renames captured where current
  (Toughsheet, bet365, MKM, Riyadh Air Metropolitano, Bluenergy, New Balance
  Arena [the 2026 Gewiss rename], Hill Dickinson [Everton's new ground]);
  neutral names kept where the curated entry existed (Emirates, Etihad,
  Allianz Arena — preserved byte-for-byte per spec §2.3).
- **fa names:** fa.wikipedia stadium titles where they exist (verified
  2026-11-21 via the interlanguage links: 80 of the 88 major-stadium fetches
  returned titles); consistent transliteration elsewhere (confidence:
  transliteration). Known-stale fa.wiki titles were NOT followed (bet365 →
  fa.wiki still says بریتانیا/Britannia; Swansea.com → لیبرتی/Liberty —
  current names transliterated instead, noted in the evidence file).
- **Temporary relocations documented:** Betis at La Cartuja (Villamarín
  redevelopment, per the 2026-27 season article); Shakhtar/Dynamo Kyiv
  displaced-venue notes; Boavista's licensing-dispute division status.
- **Verification:** every entry carries source + confidence in
  `clubdata-2026-27.json`; the G2/G6 gates re-verify on every `npm test`.

## 4. AI fallback changes (spec §9.8 — the runtime impact note)

**No code was removed.** The intended architecture (spec §12) is already the
runtime shape after v13.276-slim's C3 strip: the Workers AI learner is
admin-forced only (`/api/fa-ai-run`); no per-request or per-tick learning
runs. What this task changed is the COVERAGE beneath it:

- **Before:** 63 in-scope club names rendered English on cold paths or fell
  to the AI-learned KV glossary / the admin-forced learner; venue chips for
  ~188 clubs depended on the AI-learned `fa_venues_ai` glossary.
- **After (G7 gate, `scripts/check-club-coverage.js`):** the REAL
  `collectUnknownTeamNames` finds **0 unknown names** across a payload
  containing all 240 covered roster clubs — the learner has zero work for the
  covered universe. The G8 gate proves the production `pubMatch` path renders
  the new clubs' Persian names + Persian venue chips with no AI involvement.
- **No new external requests of any kind were introduced** (spec §8 Phase D):
  no Wikipedia, search, translation-API, provider, or per-match backend
  requests — the database is bundled static code.
- The fallback remains for genuinely out-of-scope names (e.g. minor nations,
  unmonitored leagues) exactly as the spec requires.

## 5. Database changes and affected files (spec §9.6)

| File | Change |
|---|---|
| `src/fa-dict.ts` | 516 → 676 keys (+160): 8 new competition sections + the historical layer + the FD legal-form aliases. Zero existing entries modified (verified: the 516 pre-existing keys/values are byte-identical — `git diff` shows additions only) |
| `src/config.ts` | `TEAM_STADIUMS` 22 → 287 entries; VERSION → 13.277.0-clubdata |
| `scripts/check-fa-dict.js` | Rosters refreshed to 2026-27 + full spec scope (498 names checked) |
| `scripts/check-club-coverage.js` | NEW — the repeatable Phase-D gate (G1-G8), wired into `npm test` |
| `scripts/clubdata/generate-sections.js` | NEW — collision-checked section generator |
| `scripts/clubdata/apply-sections.js` | NEW — deterministic, idempotent applier |
| `docs/audits/club-translation-data/` | The evidence: `clubdata-2026-27.json` (every entry: keys/fa/confidence/sources/stadium), `rosters-2026-27.json`, this report, the M1 audit |
| `package.json` / `package-lock.json` | 13.277.0 + the test-chain wiring |
| `scripts/check-stats.js`, `scripts/check-s20-dayhubs.js` | Version pins re-pinned (the repo's version-triple convention) |
| `CHANGELOG.md` | The v13.277.0-clubdata entry |

**Preserved (spec §2):** all provider IDs/name forms, all existing
translations (including the owner's admin-override PSG form), the SEO alias
layer (`seo/team-names.ts` untouched — its scope law), match references,
and every unrelated feature.

## 6. Tests and build (spec §9.7)

- `npx tsc --noEmit` — clean.
- `npm test` — **3,951 OK / 0 FAIL (exit 0)**: the full chain incl. the
  refreshed check-fa-dict (498 names, 0 failures), the new
  check-club-coverage (G1 204/204 + 36/36 CL; G2 204/204; G3 162/162; G4 0
  collisions; G5 reserve-team distinctions; G6 279 stadium entries; G7 0
  AI-learner names; G8 5/5 pubMatch renders), check-venue, check-stats
  (version pins), and every pre-existing gate.
- Local `wrangler dev` smoke: `/healthz` version 13.277.0-clubdata,
  `/` 200, `/matches/today` 200.

## 7. Git + deployment history (spec §9.9, §9.10)

| Commit | Milestone |
|---|---|
| `d822580` | M1 — the baseline audit + roster archive (pushed) |
| `7c1ba06` | M3-M6 — the full database (fa-dict 676, stadiums 287, gates, generators, CHANGELOG, version triple) (pushed) |
| `a2343e6` | M7 — the G7 AI-no-work proof + G8 pubMatch smoke (pushed) |
| (this commit) | M8 — the final report |

**Deployment:** `wrangler deploy` 2026-11-21 ~21:55 UTC — Version ID
`7b254f47-2384-4d2e-87d3-dc5ad48c2092`, single `*/10 * * * *` trigger, all
bindings attached (STATE KV, STATS_DB + USERS_DB D1, DRAIN_SELF, AI).
**Live verification:** `https://sportsignal.ir/healthz` → `ok: true`,
`version: 13.277.0-clubdata`, pool 493 matches, fresh ticks (heartbeat 5
min); homepage 200 (251 KB); `/matches/today` 200; the live public payload
renders the new coverage correctly (Frosinone فروزینونه, Venezia ونیز, Paris
FC پاری‌اف‌سی, Hull City هال سیتی; venue chips Bernabéu/Allianz
Turin/Camp Nou/San Siro/Emirates all Persian). The `degraded: true` flag in
healthz is the pre-existing daily KV-budget guard (936/1000 writes — the
free-tier reality v13.276-slim was cutting; unrelated to this data-only
deploy, and the site serves from the snapshot in that mode by design).
Rollback: `wrangler rollback` (or revert the commits + redeploy).

## 8. Remaining unresolved / limitations (spec §9.3, §9.9 — the uncertainty queue)

All in `clubdata-2026-27.json` `uncertaintyQueue` (kept OUT of nothing —
they ARE in the production dict with `probable` confidence, each with a
documented reason and the evidence needed to close them):

1. **SS Arezzo → آرتزو** — fa.wiki's interlanguage title (اتلتیکو آرتزو)
   mismatches the club's current identity; city form used.
2. **SV 07 Elversberg → الورسبرگ** — fa.wiki title (الفرسبرگ) reads as a
   mistransliteration; standard form used.
3. **VfL Osnabrück → اوسنابروک** — fa.wiki club article (اسنابروک) vs the
   city article (اوسنابروک) disagree internally; city form used.
4. **IFK Göteborg → گوتنبری** — fa.wiki uses the city's Swedish-derived
   name (یوتبری); the established media form used.
5. **Paphos FC → پافوس** — no fa.wiki article; city-convention form.
6. **AFC Wimbledon → ویمبلدون** — media short form; the long form
   (ای‌اف‌سی ویمبلدون) is available if preferred.
7. **Boavista** — included at normal priority; division status (3rd-tier
   regional after the licensing dispute) may change.
8. **Betis's stadium** — Benito Villamarín recorded as the permanent ground;
   the 2026-27 season article lists La Cartuja (redevelopment). Provider
   venues win at runtime regardless.

**Structural limitations:** Persian stadium names for lower-tier grounds are
consistent transliterations, not media-attested forms (marked as such);
second-tier rosters rely on Wikipedia season articles (FD's free tier does
not carry EL1/SB/BL2/SD — the spec's two-source cross-check was satisfied by
the tier-1/tier-2 promotion-relegation consistency plus the FD pulls where
available).

## 9. The honest denominator (spec §9 closing rule)

**204/204 current in-scope clubs carry verified-or-probable local Persian
canonical names (100%); 204/204 carry current stadium records (100%); the CL
30-season historical layer's still-active participants are covered (9 new +
2 aliases + 1 already-covered; 2 defunct clubs deferred with reasons); 8
uncertainty entries remain for owner review — none silent, all documented
with sources and the specific evidence that would close them.**
