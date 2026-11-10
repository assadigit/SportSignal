> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

# sportsignal.ir — broadcaster & lineup data investigation (S1 M3, report only)

- **Date:** 2026-11-10
- **Prompted by:** `docs/specs/seo-growth-plan-v2.md` §8, M3 (and GSC audit F6:
  match pages answer "when", but people also search "where to watch" and
  "lineups"). This is a **report only** — no code was built, no data was fetched
  into production. It answers one question plainly: can the repo's existing
  data providers supply broadcaster or lineup data?
- **Method:** empirical. Each provider's live API was probed with real requests
  on 2026-11-10; the fields actually returned are the evidence. Provider docs
  were read only to confirm which tier a field belongs to. No guesses.

---

## 1. Plain answer (the one-line version)

| Data | Can the existing providers supply it? | Source | Practical for this site? |
|---|---|---|---|
| **Broadcaster / "where to watch"** | **Yes, but not for our audience.** | TheSportsDB free tier (`lookuptv.php`) | **No** — the data covers India, Brazil, US, Iceland… **not Iran or Afghanistan** (91% / 6% of our audience). The repo's TSP key is also currently disabled (see §4). |
| **Lineups** | **Yes, weakly.** | TheSportsDB free (`lookuplineup.php`, sparse, near-kickoff only) **or** football-data.org **paid** tier (~49 €/month, reliable). SportScore's lineups are behind a paid RapidAPI key. | **Only with a paid provider**, or by accepting TSP's sparse free coverage. |

**Bottom line for S3 (plan §8):**
- **"Where to watch" block: do NOT build it from the current providers.** The
  only source (TSP) carries no Iran/Afghanistan broadcaster data, so it would
  show channels that are useless to 97% of the audience. S3 "where to watch"
  is **closed** unless a new Iran-specific broadcast source is found.
- **Lineup block: feasible only with a paid provider** (FD ~49 €/month, or a
  RapidAPI key for SportScore) **or** by accepting TSP's sparse free coverage
  (near-kickoff, top leagues only). This is an owner decision (plan Q2).

---

## 2. The three providers in the repo today

The pool is built by `src/providers.ts` from three provider clients:

| Provider | File | Endpoint (as wired today) | Auth | Tier in use |
|---|---|---|---|---|
| football-data.org (FD) | `src/provider-fd.ts` | `https://api.football-data.org/v4/matches?competitions=…&dateFrom=…&dateTo=…` | `X-Auth-Token` header (`env.API_TOKEN`) | **Free** (10 req/min) |
| TheSportsDB (TSP) | `src/provider-tsp.ts` | `https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=…` and `…/eventsday.php?d=…` | path key `3` | **Free** (was; see §4) |
| SportScore | `src/provider-sportscore.ts` | `https://sportscore.com/api/v1/fixtures/?sport=football&date=…&competition=…&limit=200` | none (public) | **Free public** |

The repo fetches **only fixtures, scores, status, team names/crests, round and
venue** from these. It fetches **no broadcaster and no lineup data** today
(confirmed by grepping every `provider-*.ts` for `lineup`, `formation`, `tv`,
`broadcast`, `channel`, `stream`, `coverage` — zero matches).

---

## 3. What each API actually returns (probed 2026-11-10)

### 3.1 Broadcaster / TV / "where to watch"

#### football-data.org — NO
- Probed `GET /v4/matches?competitions=PL&dateFrom=2026-11-20&dateTo=2026-11-22`
  and `GET /v4/matches/{id}` (match 560643) with the repo's token.
- Match object keys (list): `area, awayTeam, competition, group, homeTeam, id,
  lastUpdated, matchday, odds, referees, score, season, stage, status, utcDate`.
- Match object keys (detail): same list + `venue`. No `head2head` (paid only).
- **No field on either endpoint contains TV, channel, stream or broadcaster
  data.** Confirmed against the FD API docs (the Match resource documents
  `lineup`/`bench` but no broadcaster field on any tier). FD is a
  fixtures/results/standings/squads/odds service; it does not carry broadcast
  listings.

#### TheSportsDB — YES on the free tier, but the audience fit is bad
- The free tier exposes two TV endpoints (confirmed in the TSP API guide):
  - `lookuptv.php?id={idEvent}` — the broadcaster list for one event (free, 2 req/min)
  - `eventstv.php?d={date}&s={sport}&a={country}` — the TV schedule for a day (free, 1 req/min)
- **Empirical proof it returns real data:** probed `lookuptv.php?id=2494105`
  (Manchester City vs Fulham, 2026-11-21). It returned 2 entries, each with:
  `strChannel`, `strCountry`, `strLogo` (channel logo URL), `idChannel`, plus
  event metadata. The two entries were:
  - `Disney+ Hotstar` (country: **India**)
  - `Stöð 2 Sport IS` (country: **Iceland**)
- Probed a second match (a Champions League fixture): returned
  `HBO Max` (Brazil) and `Paramount+` (United States).
- **The audience problem:** the site's audience is 91% Iran, 6% Afghanistan
  (GSC audit F10). Across every event probed, **zero entries carried an Iran or
  Afghanistan broadcaster.** TSP's TV data is crowd-sourced and skews to the
  countries whose editors populate it (India, Brazil, US, Iceland, etc.). For
  an Iranian user, "Disney+ Hotstar (India)" is not a usable answer to "where
  can I watch this".
- **The schedule endpoint is sparser:** `eventstv.php?d=2026-11-22&s=Soccer&a=England`
  returned `{"tvevents":null}`. Day-schedule coverage is patchy.
- **The repo's key is broken** — see §4.

#### SportScore — NO in the public API the repo uses
- Probed `GET /api/v1/fixtures/?sport=football&date=2026-11-08&competition=english-premier-league&limit=2`.
- Fixture object keys: `home, away, home_logo, away_logo, home_score,
  away_score, competition, competition_logo, status, status_text, time, url`.
  **No TV/broadcaster/channel field.**
- The `url` field is a website page path (`/football/match/…/23xmvkh6zj09qg8/`),
  not a JSON detail endpoint. Probed `/api/v1/fixtures/{id}`, `/api/v1/matches/{id}`,
  `/api/v1/match/{id}`, `/api/v1/fixtures/{id}/lineups` — **all returned HTML**
  (the website's SPA shell), not JSON. The public free API exposes only the
  list endpoint; a richer detail/lineup/TV API exists on SportScore's RapidAPI
  listing (paid, requires a RapidAPI key), not on the public mirror the repo
  uses.

### 3.2 Lineups (starting XI, bench, formations)

#### football-data.org — YES, but PAID tier only
- The FD API docs say the Match resource carries `lineup` and `bench` arrays
  (home + away) with player ID, name, position and shirt number.
- **Empirical:** the FREE-tier `/v4/matches/{id}` response (probed with the
  repo's token) contains **no `lineup` or `bench` field**. The existing repo
  audit (`SPORTSIGNAL-API-DATA-AUDIT.md` row "Lineups / cards / substitutions
  timeline") already classifies this as "not available on FD v4 free; would
  need a new provider or paid tier". FD's paid tiers start at 49 €/month
  (Tier 2, per the coverage page) and rise to 199 €/month.
- FD has **no broadcaster data on any tier** (see §3.1).

#### TheSportsDB — YES on the free tier, but sparse and near-kickoff only
- The free tier exposes `lookuplineup.php?id={idEvent}` (free, 5 req/min); the
  V2 lineup endpoint is premium-only.
- **Empirical:** probed `lookuplineup.php?id=2494105` (upcoming Manchester City
  vs Fulham) → `{"lineup":null}`. Probed `lookuplineup.php?id=153456` (a past
  event) → also `null`. Lineups populate **only close to kickoff** (the
  community enters them as the match approaches), and coverage is uneven — many
  events never get a lineup entered at all. The data is real when present, but
  you cannot rely on it for every match.
- **The repo's key is broken** — see §4.

#### SportScore — YES per the API description, NO in the public free API
- SportScore's developer page and RapidAPI listing advertise "lineups" and
  "match details" as features. But the **public free API the repo uses** (the
  `/api/v1/fixtures/` list) carries no lineup field, and every detail/lineup
  URL returned HTML, not JSON (see §3.1). The lineup data is behind the
  RapidAPI paid endpoint, which the repo does not have a key for.

---

## 4. Side finding (not M3 scope, but blocks S3): the repo's TSP key is dead

`src/provider-tsp.ts` calls `https://www.thesportsdb.com/api/v1/json/3/…`. The
free key **`3` is permanently disabled** — every TSP request now returns the
plain-text message:

> "The old '3' Free Sports API key is permanently disabled, Please use the new
> test key "123" or sign up to premium here https://www.thesportsdb.com/pricing"

This is not JSON, so `fetchJSON` throws, the per-call try/catch in
`fetchTheSportsDB` logs the failure, and the pool falls back to FD + SportScore
(the site still works — verified: `/healthz` 200, match pages render). TSP is
silently contributing zero rows. The new free test key is **`123`** (confirmed:
`eventsnextleague.php?id=4328` with key `123` returns real Premier League
events). Migrating is a one-line change in `provider-tsp.ts` (and would also be
the prerequisite for any future TSP-based broadcaster or lineup block).

This is reported, not fixed, because it is outside S1 M3's scope (M3 is
report-only for broadcaster/lineup; the key fix touches a runtime provider and
belongs in its own small session).

---

## 5. What this means for the plan

| Plan item | Verdict from this investigation |
|---|---|
| S3 "where to watch" block (plan §8, F6) | **Closed** (no Iran/Afghanistan broadcaster source exists in the current providers; TSP's data serves other countries). Reopen only if an Iran-specific broadcast source is found. |
| S3 lineup block (plan §8, F6) | **Owner decision (plan Q2).** Feasible routes: (a) FD paid tier ~49 €/month — reliable, covers the repo's competitions; (b) TSP free `lookuplineup.php` after the key fix — free but sparse and near-kickoff only; (c) SportScore via a paid RapidAPI key. None is free AND reliable AND complete. |
| F6 "where to watch" click signal (3.0% CTR, the audit's only converting unserved pattern) | The signal is real, but the data to serve it for *our audience* is not. Do not chase it with off-audience channel data. |

---

## 6. What I could not check

| Gap | Why it matters | How to close it |
|---|---|---|
| Iran/Afghanistan broadcaster availability from a non-TSP source | If an Iran-specific sports-broadcast API or licensed data feed exists, "where to watch" becomes viable for our audience | Owner research or a paid Persian sports-data provider; outside the repo's current providers |
| FD paid-tier lineup coverage breadth | The docs say lineups exist on paid tiers, but not which competitions/rounds are covered how reliably | A paid FD key trial (the owner decides if the spend is worth it for S3) |
| TSP lineup coverage once key `123` is wired | The free test key returned `null` for the two events probed, but coverage may be better for top leagues near kickoff | After the key fix, a focused probe across a match week of top-league events |

---

## 7. Recommendation to the owner

1. **Do not build "where to watch" from the current data.** The only source
   (TSP) carries no Iran broadcaster data; showing India/Brazil/US channels to
   an Iranian audience is worse than showing nothing.
2. **If you want lineups, the cheapest reliable route is FD paid (~49 €/month).**
   TSP's free lineups are too sparse to be a product feature. SportScore's
   lineups need a RapidAPI key (another subscription).
3. **Fix the dead TSP key (`3` → `123`) in a small separate session** — it is
   not blocking the site today (FD + SportScore cover), but TSP is currently
   contributing nothing, and the fix is a prerequisite if you ever adopt TSP
   for broadcaster/lineup data.
4. **Close S3 "where to watch"** in `docs/DECISIONS.md` with the reason above.
   Leave S3 "lineups" open as an owner decision (plan Q2) pending the spend call.

---

*Evidence: all API responses were captured live on 2026-11-10 using the repo's
FD token (credentials used, not stored) and the public TSP/SportScore
endpoints. Provider docs were read at football-data.org/documentation/api and
thesportsdb.com/docs_api_guide.*
