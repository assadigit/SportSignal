# Club Persian Translation & Stadium Data Completion — Baseline Audit (Milestone 1)

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

**Task spec:** `SPORTSIGNAL_CLUB_PERSIAN_TRANSLATION_COMPLETION_SPEC.md` (repo root)
**Audit date:** 2026-11-21 · **Baseline commit:** `79c8136` (v13.276.0-slim)
**Scope verified season:** **2026/27** (FD `currentSeason` for PL: 2026-08-21 → 2027-05-30, matchday 11 — confirmed live from the football-data.org API on 2026-11-21).

This is the Phase-A audit required by spec §8. **No production data was changed for this report.**

---

## 1. Where club identity and translation live (the real data path)

SportSignal is a single Cloudflare Worker (`src/worker.ts`, zero framework). There is **no club table with numeric IDs** — the "stable club identity" is the **provider English name folded through `normTeamKey()`** (`src/teams.ts`: lowercase → NFD accent-strip → TRANSLIT_FOLDS → club-prefix token strip → digit strip). All joins (dedupe keys, follow matching, grounds lookup, alias maps) key on this normalized form.

Provider → Persian display path (traced, not assumed):

```
provider name (FD / TheSportsDB / sportscore)
  → translateTeam(name)                      [src/translate.ts]
      1. admin override  (KV fa_teams_ai.overrides — highest)
      2. static dict exact  (src/fa-dict.ts → buildFaTeamDict())
      3. static dict normalized  (normTeamKey fold)
      4. AI-learned KV     (fa_teams_ai.learned)
      5. fuzzy stem        (≥4-char containment, unique hit only)
      6. else English passthrough
  → faName rendered on web pages, bot messages, digests, SVG cards
```

Key files:

| Concern | File | Notes |
|---|---|---|
| Static Persian dictionary (516 entries) | `src/fa-dict.ts` | Layer 1; keys are provider English name forms (FD legal names + TSP/sportscore short forms + national teams) |
| Translation stack + venue translate | `src/translate.ts` | `translateTeam`, `translateVenue` (AI-learned venues only), `isValidFaName` |
| Workers AI learner | `src/fa-ai.ts` | `maybeRunFaAi` — **auto-run unwired in v13.276-slim (C3)**; admin force-run `/api/fa-ai-run` remains (`src/admin-ops.ts:309`) |
| Team-name normalization | `src/teams.ts` | `normTeamKey`, `TEAM_ALIASES`, `TRANSLIT_FOLDS` |
| Stadium table | `src/config.ts` `CONFIG.TEAM_STADIUMS` | 22 entries ({en, fa} objects); consumed by `src/grounds.ts` (`homeGround` fills-only, `curatedVenueFa` reverse lookup) |
| SEO alias layer (separate) | `src/seo/team-names.ts`, `src/seo/persian-alias.ts` | `SEO_TEAM_NAME_OVERRIDES` (4 clubs) + `SEO_EXTRA_ALIASES` (13 clubs, GSC-evidenced) + query resolver. **Deliberately separate from fa-dict (scope law in team-names.ts header)** |
| Validation gates | `scripts/check-fa-dict.js`, `scripts/check-venue.js` | check-fa-dict ROSTERS are **pinned to 2025-26** — will need the 2026-27 refresh |
| AI validation catalog | KV `v3_catalog` (varzesh3 names) | Used by the AI learner to snap learned names; not part of static path |

**Provider name forms actually observed** (live FD API pull 2026-11-21): PL/ELC/SA/PD/BL1/FL1/CL arrive with FD legal names (`Coventry City FC`, `PAE Olympiakos SFP`, `Club Atlético de Madrid`). TheSportsDB sends short names (`Atlético Madrid`), sportscore sends short names too. The dict carries both forms as separate keys folding to one Persian value — that is the established alias mechanism (95 Persian values are shared by ≥2 keys today; spot-checked, all are legitimate same-club folds, no cross-club collisions found).

## 2. Current coverage (measured, 2026-27 rosters)

Roster sources: football-data.org standings API (PL, ELC, SA, PD, BL1, FL1, CL 2026-27 + CL 2025-26) cross-checked against English Wikipedia season articles (League One, Serie B, 2. Bundesliga, Segunda División + relegation/promotion consistency across tiers). Full rosters archived in `docs/audits/club-translation-data/rosters-2026-27.json`.

| Competition | Clubs | Persian dict coverage | Stadium entries |
|---|---|---|---|
| England PL | 20 | 20 (100%) | 6 |
| England Championship | 24 | 21 | 0 |
| England League One | 24 | 9 (+9 stem-only) | 0 |
| Italy Serie A | 20 | 20 (100%) | 4 |
| Italy Serie B | 20 | 4 | 0 |
| Germany Bundesliga | 18 | 17 | 2 |
| Germany 2. Bundesliga | 18 | 8 | 0 |
| France Ligue 1 | 18 | 17 | 1 |
| Spain La Liga | 20 | 19 | 3 |
| Spain LaLiga 2 | 22 | 6 | 0 |
| **Total in-scope** | **204** | **141 exact/norm (69.1%)** | **16 (7.8%)** |
| CL 2026-27 league phase | 36 | 36 (100%) | 12 |

**63 clubs have no exact/normalized dict entry.** Of those, 9 resolve today only through the fragile fuzzy-stem layer (Bradford City, Leicester City, Luton Town, Mansfield Town, Oxford United, Peterborough United, Reading, Sheffield Wednesday, Wigan Athletic — all League One) — spec §7 explicitly forbids fuzzy matching as the only mechanism, so these still count as gaps to close with explicit entries.

**One wrong resolution found (pre-existing bug):** `Real Sociedad B` (LaLiga 2 2026-27) folds via the stem layer onto «رئال سوسیداد» — the parent club. The reserve team must get a distinct name (spec §5.2: preserve distinctions between clubs and reserve teams).

The 2025-26 season churn that outdates the dict sections (all confirmed by both FD and Wikipedia):

- PL: OUT Wolves, West Ham, Sheffield Utd, Burnley → Championship; IN Coventry, Hull, Ipswich, Sunderland
- Championship: OUT + relegated to League One: Oxford United, Sheffield Wednesday, Luton Town; promoted in: Wrexham, Bolton Wanderers, Lincoln City (from League One)
- Serie A: OUT Verona, Pisa, Empoli → Serie B; IN Frosinone, Monza, Venezia
- Bundesliga: OUT Wolfsburg, Heidenheim, Kiel, Bochum, St. Pauli → 2. Bundesliga; IN Elversberg, Hoffenheim, Köln, Paderborn, Schalke 04
- Ligue 1: OUT Montpellier, Nantes, Reims, Metz; IN Paris FC, Lorient, Troyes, Le Mans
- La Liga: OUT Girona, Mallorca, Valladolid, Leganés, Las Palmas → LaLiga 2; IN Deportivo La Coruña, Racing Santander, Levante, Elche, Málaga

## 3. Champions League historical layer (baseline)

- Existing: dict section «UCL participants 2005-06 → 2024-25 (20-season history coverage)» — 97 entries incl. name variants.
- Spec window: **30 completed seasons = 1996-97 → 2025-26**, plus the current 2026-27 league phase (already 100% covered).
- CL 2025-26 (most recently completed, from FD standings): 36 league-phase clubs; **2 are missing from the dict: Paphos FC, Royale Union Saint-Gilloise** (all other 34 covered).
- The 1996-97 → 2004-05 group stages add roughly 25-40 unique still-active clubs not yet in the dict (Nantes, Metz, Heerenveen, Willem II, Dnipro, Dinamo Bucharest, Rapid Bucharest, Hapoel Tel Aviv, Beitar Jerusalem, Hajduk Split, Wisła Kraków, Widzew Łódź, 1860 Munich, IFK Göteborg, AIK, Helsingborg, Brøndby, Boavista, …) — to be filtered by the spec §3.2 priority rules (active + top-two-tier first; defunct/very-low-tier deferred with reasons).

## 4. The runtime AI translation fallback (spec §4.2 findings)

- **Auto-learning is already unwired**: v13.276-slim (C3) removed the cron hook and the three per-request `public-swr` hooks. The learner runs ONLY via admin force (`/api/fa-ai-run`, `maybeRunFaAi(env, true)`).
- **The AI-learned KV glossary is still loaded** at runtime (`ensureFaAiCache` in translate.ts, called by the bot webhook path + public payload build) and still fills gaps for out-of-dict names (layer 4).
- **Venue translation has no static layer at all**: `translateVenue` reads only the AI-learned `fa_venues_ai` KV — the curated path for venues is exclusively `CONFIG.TEAM_STADIUMS` + `curatedVenueFa` (grounds.ts), which covers just 22 clubs (12 of the current CL 36).
- **What the spec's end-state requires**: in-scope clubs resolve from the static dict layers 1-3; the AI learner remains available only as the admin-forced fallback for genuinely unknown out-of-scope names (already the current wiring — no removal is needed, only *coverage*, so the learner's pending list reaches zero for everything in scope). No code deletion is planned; this satisfies spec §8 Phase C "do not remove the generic AI fallback".

## 5. Stadium data model (spec §3.3)

- Schema: `CONFIG.TEAM_STADIUMS: Record<providerName, { en: string; fa: string }>` — keyed by English team name, folded through `normTeamKey` at lookup; `curatedVenueFa` reverse-maps English stadium name → Persian. Additive, no migration needed — exactly the "smallest compatible option keyed by the existing stable club ID" the spec asks for.
- Consumers: `homeGround` (fills-only fallback; a provider venue always wins), `curatedVenueFa` (unifies Persian venue naming across live/scheduled rows), `pubMatch` (venue chip on site + SEO pages), `check-venue.js` (gate).
- Current coverage measured above (16/204 in-scope). The Wikipedia season articles already fetched carry the per-club stadium tables (English names) — Persian renderings need per-club verification (fa.wikipedia / Persian media; transliteration following the existing «ورزشگاه …» convention, confidence-flagged).

## 6. Technical risks and data-integrity issues

1. **Stem-layer wrong folds** (Real Sociedad B → parent) — any new reserve/B-team or similarly-named club can silently mistranslate. Fix by explicit dict entries; add a gate for the known pair.
2. **check-fa-dict.js ROSTERS pinned to 2025-26** — the gate passes today but tests the wrong season; must be refreshed to the 2026-27 rosters (and extended to the full spec scope) or it gives false confidence.
3. **Persian-value collisions**: 95 values shared across keys (all currently legitimate same-club folds). Import tooling must assert no *new* cross-club value collisions (spec §7: detect alias collisions before importing).
4. **ZWNJ / code-point discipline**: dict mixes «ساوت‌همپتون» (ZWNJ) and joined forms; translate.js has no Persian normalizer (that lives only in the SEO query layer `normPersianQuery`). New entries must follow the existing dict spellings byte-for-byte where they extend an existing club's forms.
5. **Free-tier API budget**: FD free tier = 10 req/min; research pulls must be spaced (already respected in this audit).
6. **No provider IDs are being changed**: all new dict keys are additional provider-name strings; no existing key/value/mapping is removed. Grounds table additions are additive only.
7. **Deployment discipline**: repo convention (AGENTS.md §5, RUNBOOK) — `npm test` green + `npx tsc --noEmit` clean before every `wrangler deploy`; version triple bump (src/config.ts VERSION + package.json + check-stats LIVE pins) per deploy. The Dec 4-8 SEO freeze and Nov 20 no-deploy windows from HANDOFF.md are noted and respected.

## 7. Baseline test results (before any change)

- `npx tsc --noEmit` — clean (exit 0).
- `npm test` — full chain green (exit 0), incl. check-fa-dict (282 names, 0 failures — against the stale 2025-26 rosters), check-venue, check-s20-dayhubs, check-phase2-freeze-lift.
- Live FD API verified 2026-11-21: PL currentSeason = 2026-27.

## 8. Implementation plan (Phase B→D)

1. **M2 — Coverage inventory** (this audit + `rosters-2026-27.json`): done; per-club gap list frozen.
2. **M3 — Persian research**: 63 missing in-scope clubs + ~25-40 historical CL clubs + reserve-team distinctions. Sources: Persian Wikipedia, varzesh3 naming (via the existing v3 catalog conventions), established Persian football media usage; each entry confidence-flagged (`verified`/`probable`/`uncertain`) in the evidence file; only verified/probable-with-clear-usage promoted to `fa-dict.ts`.
3. **M4 — Stadiums**: extend `CONFIG.TEAM_STADIUMS` to all 204 in-scope clubs + prominent CL historical clubs (en from the season articles / club pages; fa from fa.wikipedia + consistent transliteration), each with source URL + access date in the stadium report.
4. **M5 — CL historical layer**: extend the dict's UCL-history section to the 30-season window (1996-97 → 2025-26) + 2026-27 league phase, applying the §3.2 priority classes; defunct clubs deferred with documented reasons.
5. **M6 — Integration**: one additive edit to `src/fa-dict.ts` (new sections), one additive edit to `src/config.ts` (TEAM_STADIUMS), refresh `check-fa-dict.js` rosters to 2026-27 + full scope, extend `check-venue.js` coverage assertions, add a **repeatable coverage gate** (`scripts/check-club-coverage.js`) that reports missing translations/stadiums per competition instead of silently passing.
6. **M7 — Runtime impact verification**: confirm the 63 (and historical) clubs now resolve via layers 1-3 with zero AI learner work; the admin force-run output's pending list for in-scope names reaches 0.
7. **M8 — Validation + deploy**: `npm test` green, version bump, `wrangler deploy`, live `/healthz` + rendered-page verification, runtime-impact note in the final report.

All changes are additive data edits + gate refreshes; no schema, service, dependency, or architecture change.
