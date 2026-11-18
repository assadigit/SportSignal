# Audit — the "all matches" today/tomorrow day pages (the day-hub density gap)

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

Date: 2026-11-18. Session context: the owner asked for
`/matches/today` («بازی‌های امروز») and `/matches/tomorrow` («بازی‌های فردا»)
to show **ALL** of the day's matches — not only important ones — sorted
chronologically with the important clubs ranked higher, so the pages never
render an empty list on days with no marquee fixtures. This audit establishes
what exists, what the real gap is, and what the providers can actually
deliver. Everything below was verified against the live site, the live KV
pool, the provider APIs, and the source code on 2026-11-18 (repo at
`04e93ea`, the `seo(s17-verify)` close).

## 1. What the owner asked for vs what already exists

**Surprise finding: the ranking and the "list everything in the pool"
behavior ALREADY EXIST.** The gap is narrower than the request implies —
it is a DATA UNIVERSE problem, not a page-builder problem.

- The time hubs `/matches/today`, `/matches/tomorrow`, `/matches/this-week`,
  `/matches/this-weekend` are built by `buildHub()`
  (`src/seo/pages.ts:1544`) on `upcomingFollowed(ctx)` — which lists
  **every pool match** in the window (`PLAYABLE_FUTURE` only; NO
  importance filter — `src/seo/data.ts:207`, the SS-01 rule).
- The sort is exactly what the owner asked for: big matches first
  (`isBigForSeo || s.big`), live matches first, then chronological
  (`src/seo/data.ts:217-222`). An Arsenal match already ranks above a
  Bournemouth one; the rest run in kickoff order.
- The pool already contains ALL fixtures of the competitions it sweeps —
  including matches with zero desired teams. Verified from the live pool
  KV (`matches_v13_tracked`, fetched 2026-11-18T11:30Z, 342 rows): on
  Nov 21–22 the pool holds 42 matches of which **34 involve no desired
  team** (Bournemouth–Nottingham Forest, Como–Cagliari, …) — and those
  DO appear on the hub pages on normal days.

## 2. The real gap — the narrow universe (verified live)

The pool's competition universe is: FD big-5 + CL (`CONFIG.LEAGUES`),
sportscore EL/ECL/cups/PGL, TSP next-event views, FD intl FINALS
tournaments only (WC/EC/COPA/AFCON/AFC ids = the finals, which have no
matches in Nov 2026). **During FIFA international windows this universe is
completely empty:**

- Live pool KV: date range of all 342 rows = **2026-11-20 → 2026-12-30**.
  Zero rows on Nov 18–19 (the break).
- Live `/matches/today` (fetched 2026-11-18 ~11:40 UTC): HTTP 200, H1
  «بازی‌های فوتبال امروز — چهارشنبه ۲۷ آبان ۱۴۰۵ (۱۸ نوامبر ۲۰۲۶)»,
  answer card «برنامه بازی‌های امروز.», **0 match rows** (the honest
  empty state «مسابقه‌ای در راه نیست»).
- Meanwhile REAL senior football existed on Nov 17–18: sportscore shows
  **44 senior+age international friendlies on Nov 17 (including
  Iraq–IR Iran 16:15Z)**, 18 CAF AFCON qualifiers, 9 CONCACAF Nations
  League, 8 UEFA Nations League; FD shows 4 Brasileirão matches on
  Nov 18. None of it is visible on the site.

So the feature = **widen the day-view data universe** so the day pages
have content on break days and denser content on thin club days. The page
builders need (almost) no changes.

## 3. Provider capabilities (probed live 2026-11-18)

### football-data.org free tier — 4 extra competitions at ZERO extra cost

The FD fixtures call already batches 6 competitions in ONE request
(`?competitions=CL,PL,PD,SA,FL1,BL1&dateFrom&dateTo`). Probed live:
`?competitions=CL,PL,PD,SA,FL1,BL1,DED,PPL,ELC,BSA&…` returns
`errorCode` none — the free-tier 12 include **Eredivisie (DED), Primeira
Liga (PPL), EFL Championship (ELC), Brasileirão (BSA)**. One subrequest,
same rate-limit footprint, bigger response.

- BSA plays THROUGH FIFA windows (4 matches Nov 18 — the break-day filler).
- ELC fills midweek club days (8 matches on Wed Nov 25; the big-5 often
  idle Tue–Wed).
- FD has NO senior international friendlies/qualifiers in the free tier —
  break-day international content can only come from sportscore.

### sportscore — the break-day international source

`sportScoreDay(code, slug, date)` fetches one competition-day. Probed for
2026-11-17: `international-friendly` → 44 rows (incl. Iraq–IR Iran),
`caf-africa-cup-of-nations` → 18, `concacaf-nations-league` → 9,
`uefa-nations-league` → 8. Off-window days return 0 rows (harmless but
wasted subrequests — see §6 gating).

**Data-quality landmines in the international feed (verified):**
- **Reversed duplicates**: `Qatar vs South Korea` (upcoming) AND
  `South Korea vs Qatar` (finished) at the same kickoff —
  `canonDedupe` keys are ORDERED (`code|home|away|date`,
  `src/dedupe.ts:53`), so both survive and the ghost "upcoming" row
  would sit in the day list forever.
- **Ghost rows**: the same pairing twice with different statuses
  (`Tahiti vs Cook Islands` upcoming + finished).
- **Youth/women mixed in**: U16–U23 and women's matches ride the same
  `international-friendly` slug (South Korea U21–Mexico U23, Portugal
  U18–USA U18, …).

Any international fill therefore needs a hygiene pass: a senior-men team
name filter (age markers `U1[6-9]|U2[0-3]`, women markers) + an
unordered-pair+date collapse keeping the most-progressed row
(FINISHED > LIVE > SCHEDULED).

## 4. The side-effect map (what the new rows may and may not touch)

Verified gating for rows from new competitions (no `BIG_TEAMS_BY_LEAGUE`
entry, no standings):

| Surface | Gate | New comps appear? |
|---|---|---|
| Time hubs (today/tomorrow/week/weekend) | `upcomingFollowed` — no filter | **YES (the goal)** |
| Homepage payload lists (upcoming/finished/thisWeek/nextWeek) | `shouldReport \|\| isTopTeamInvolved` (`public-matches.ts:685+`) | No |
| `/matches` hub | `upcomingBig` | No |
| Sitemap-upcoming / feed.xml / matches.json | `upcomingBig` | No |
| `/teams` index + team pages | `teamsIndex` big-gated | No |
| 365d archive | `syncArchive` big-gated | No |
| Bot notifications / digest / `/next` | `shouldNotify` / `shouldReport` | No (silent) |
| Bot weekly tables digest | `weeklyTableCodes` hardcoded order | No |
| Match pages | pool-backed router | YES — pool-backed pages, standard lifecycle (non-marquee → noindex after finish) |
| Goal alerts (S19) | `userFollowsMatch` audience check BEFORE the D1 claim (`goal-alert.ts:267-268` — `!matchChats.length → skip`) | No claims, no sends for zero-audience matches (verified in source) |

**The `CONFIG.LEAGUES` trap:** `CONFIG.LEAGUES` is live-mutable ADMIN
STATE — `applySettings()` overwrites it from the KV settings blob
(`src/admin.ts:84`) and the admin panel can edit the monitored-league
list. Adding the 4 FD comps there would silently change admin semantics
(monitored = the bot universe). The extra comps must ride a **separate
constant** appended only to the FD fetch URLs
(`provider-fd.ts:28`, `providers.ts:27`), leaving `CONFIG.LEAGUES`
untouched. (`fetchTheSportsDB` iterates `TSP_LEAGUE_IDS` ∩ monitored —
new codes add zero TSP calls; `weeklyTableCodes` order is hardcoded —
zero bot-visible change.)

## 5. Freshness during breaks (the cadence problem)

During windows the pool has no `shouldReport` rows, so the scheduler goes
IDLE (`beyond-horizon` — the live healthz confirms `sched_mode:"IDLE"`,
next wake Nov 20) and the pool reuses KV for ~hours. Without a cadence
change, break-day international rows would be fetched once and their
statuses/scores would go stale for ~4–6h (a live friendly showing
«SCHEDULED»). The cron-pool cadence filter (`cron-pool.ts:51`,
`relevantPool = cachedPool.filter(shouldReport)`) is the single place to
extend: count senior-intl rows as cadence-relevant so window days behave
like matchdays (2h full sweeps + slotted live sweeps). The live sweep's
sportscore narrowing (`providers.ts:212` `SS_LIVE_ELIGIBLE`) must then
include the new intl codes so in-flight internationals get 10-min score
updates.

## 6. Budget math (all verified against current numbers)

- **Subrequests**: FD +4 comps = same 1 call. sportscore intl fill: gated
  scan (below), +4 slugs × ~2 days only when the club universe is idle.
  Club days pay **zero** extra sportscore calls if the intl slugs are
  scanned only when no club match exists in [now−1d, now+1d] (the
  emptiness gate — self-correcting: the first sweep of a window sees the
  empty club calendar and opens the gate; the gate must test CLUB rows
  only, not the intl rows it just fetched, or it closes itself).
  The existing 44-metered budget-stop stays the hard backstop.
- **KV**: reads unchanged (the pool is already read per render; hub pages
  render through the 15-min edge cache `wantCached`, 5-min when live).
  Writes unchanged (the change-guarded single pool put, just bigger).
- **Pool size**: 342 rows / 139KB today. Steady state with DED+PPL+ELC+BSA
  over the ±10d FD window ≈ +100–150 rows; break-day internationals ≈
  +40–80 rows that exist only ±1–2d and age out via the 7d retention.
  Worst case ~550 rows ≈ 230KB — well under the 331KB post-slim norm and
  far under the 617KB that killed CPU in the v13.111 era.
- **Persian names**: `translateTeam` = fa-dict + the bounded AI learner
  (batch 16 / 15-min cooldown / KV-cached / fail-cooldown). A curated
  fa-dict seed for common national teams is safer than AI-translating
  flagship names; `translateCompetition` (hardcoded `FA_COMPS` map in
  `translate.ts:149`) needs entries for the 4 new league codes + the
  international codes or the rows show raw codes.

## 7. Verified non-issues / already handled

- Hub FAQ, answer card, ItemList JSON-LD all scale (FAQ names 8 +
  «و N بازی دیگر…»; ItemList caps at 50 — fine).
- `dateGroupedRows` renders unpaginated day lists; ~100–150 rows/day is
  within the page budget (matches the `/matches` PER_PAGE scale).
- Tehran-day bucketing already correct for late-evening UTC kickoffs.
- SEO freeze: hub titles/H1 carry a dynamic date (not byte-frozen); the
  byte-frozen team/competition/match surfaces are untouched by hub
  content; the Dec 4–8 freeze and the Nov 20 Bayern–Köln no-deploy
  windows (M1 ~19:35 UTC, M2 ~21:35–45 UTC) constrain only the deploy
  step.
- `_headers` at the 100-rule cap: no new pins needed (no new assets).
- The `AL` site-hidden league stays hidden; PGL already rides the full
  sweep and will appear on hub days when it plays.

## 8. Open choices for the spec (decided there, recorded in DECISIONS)

1. Senior men's football only for v1 (youth/women filtered) — reversible.
2. The curated international slug set (friendlies + AFCON + CONCACAF NL +
   UEFA NL to start; WC-qualifier slugs get discovered/added when those
   windows exist).
3. Notable non-free leagues via sportscore (Saudi Pro League, MLS,
   Argentina…) — **out of scope v1** (steady daily subrequest cost for
   marginal day-page value); a follow-up decision for the owner.
4. `this-week`/`this-weekend` gain the same density (shared code path) —
   consistent and desirable, recorded as a decision.
