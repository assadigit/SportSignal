> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

# Audit — team competition-rank indicator on match cards (2026-11-09)

Task: the uploaded design pack (`docs/assets/sportsignal-team-rank-design-pack.zip`,
spec filed at `docs/specs/team-rank-indicator.md`, visual reference at
`docs/assets/team-rank-reference-match-cards-2026-11-09.jpg`). Scope: a small
circular rank badge beside each team's name on **match cards only**.

## Where match cards live (traced)

The public page renders match cards CLIENT-side from `/api/public-matches`:

| Surface | Builder | File |
|---|---|---|
| Upcoming / finished list cards | `render()` → `.mrow > a.match > .side(logo + .team)` | `assets/public-13.74.js` |
| topSpot / week / UCL-spot / live cards | `spotItemNode()` → `.spotitem > a.match > .side` | `assets/public-13.74.js` |
| SSR no-JS mirror of both | `mrowHtml` / `spotItemHtml` → `sideHome`/`sideAway` | `src/seo/markup.ts` |
| Desktop hero + mobile mcard | `renderHeroSpot` / `renderMCard` | out of scope (hero design language, not list match cards) |
| Cups box | `cupBox` text line | out of scope (knockout — never a rank) |

- Team name element: `.team` div, filled by `nameInto()` (client) / `nameHtml()` (SSR).
- Language: `curLang()` fa/en; `applyLang` flips `<html dir>`; digits via `fmtNum()`/`toFaDigits()`.
- Both card families share the same `.team` CSS (public-13.81.css lines 205–228, mobile line 339).

## Where ranking data already exists (no new fetches needed)

- `fetchStandings(env, code, allowFetch)` (`src/composers.ts`) caches tables in KV
  `standings_cache_<CODE>` (TTL 24h, freshness 6h + jitter; refresh authority =
  cron `stand_refresh_v1`, codes `PL PD SA BL1 FL1 CL PGL`).
- `fetchPublicMatches` (`src/public-matches.ts` L515–521) ALREADY reads all 7
  tables cache-only (`allowFetch=false`) into `stMap` on every payload build —
  the FULL tables (league boxes shown on the page are trimmed to top-8, but
  `stMap` carries every row).
- Standings row shape: `{ name, crest?, pos, points, played?, … }` — team
  identity is the provider NAME string. The established name→row bridge is
  `normalizeTeamName` (`src/teams.ts`), used by `standingsLine` (composers.ts
  L375) for the bot's per-team rank line.
- The match row's competition is `m.competition.code` (the only identifier);
  phase is `m.stage` (+ `round`/`roundRaw` for cups).

## The repository's own "when does a table apply" law

`appendTableOrPhase` (composers.ts L402–412): a table/rank is applicable unless
`isDomesticCup(code) || faStageName(stage) || enStageName(stage)` (knockout
stages: PLAYOFF_ROUND, ROUND_OF_16, QUARTER_FINALS, SEMI_FINALS, FINAL,
THIRD_PLACE). League-phase/regular-season matches get the table. The web
badges will reuse this exact gate — one rule, bot + web.

## Gaps to close

1. No rank field reaches the client: `pubMatch`/`withTop` rows carry no rank.
   Fix: resolve server-side (spec §7: "the UI should receive a validated
   position … not calculate standings in the presentation component") from
   `stMap` in `fetchPublicMatches` → `homeTeam.rank` / `awayTeam.rank` (omitted
   when null). Zero new requests: `stMap` is already read on every build.
2. SEO SSR mirror (`seo/data.ts` shapes rows from the raw pool without
   standings) — read the same 7 `standings_cache_*` KV keys (reads only) to
   mirror the badges in the no-JS HTML, per the repo's mirror-the-client law.
3. Client rendering + CSS: new immutable asset versions (rename-on-edit,
   ADR-006): `public-13.74.js → public-13.75.js`, `public-13.81.css →
   public-13.82.css`, reference bumps in `src/pages/public.ts` +
   `src/seo/page-shell.ts`, `_headers` pins (+100-rule cap sweep #18),
   `sw.js` cache bump, `heroes:sync` regen (bundle name field).

## Placement decision (spec §3 vs this layout)

The cards are 3-column rows (`.side` = logo + name; `.kick` center; `.side.away`
= name + logo). The crest owns the OUTER edge of each side. The badge goes
**immediately beside the name, on the name's outer flank** (between name and
crest): DOM `[badge, name]` on the home `.team`, `[name, badge]` on the away
`.team`, packed with logical `justify-content` (start/home, end/away). This is
direction-agnostic (RTL + LTR both keep the badge on the outer side of the
name, away from the central kickoff column) and centers as a group on mobile
stacked layout via one media override. Non-badged rows render the exact
current DOM (no wrapper span) — zero visual change where no rank exists.

## Pre-season / stale safety

- Pre-season tables carry `started:false` (FD roster-alphabetical, BL1 zeroed
  fallback) — the PGL heuristic `started: some pts > 0` gates the same way.
  Badges resolve ONLY from tables with `started !== false`.
- Stale snapshot fallback tables (`stale:true`) never feed badges (same
  precedent as the top3/top5 clash flags: LIVE tables only).
- Rank validity: positive integer only; missing team → no badge (never 0/-/?).

## Coverage limitation (documented, not silently invented)

EL/ECL league-phase tables are NOT in the cron refresh set nor in the public
payload's `stMap` — adding them would mean new provider fetches, which the
task's Phase 3 forbids ("reuse existing ranking data wherever possible").
EL/ECL fixtures therefore render without badges. Domestic cups, INTL cups,
Hazfi Cup: no official table in the pool → no badge (per spec §4).
