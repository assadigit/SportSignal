# v13.281.0-teamstrict — deploy + verification record (2026-11-25)

> Agents: read AGENTS.md in the repo root first, and follow it for this whole session.

The implementation session for the owner-approved strict entity gating (the
GSC "Excluded by 'noindex' tag" remediation). Full law: CHANGELOG v13.281.0,
decision record: docs/DECISIONS.md 2026-11-25 (the C1 reversal), the guard
constitution: scripts/check-seo-teamstrict.js (35 gates).

## Deploys

1. **8370b7c → Version 622f5e5e (~04:33 UTC)** — the release deploy
   (clean no-live window: 0 live rows, next kickoff 13h out).
2. **f1f0f7b → Version be62fd5e (~05:07 UTC)** — v13.281.1, the
   frozen-source hotfix (the 04:48 incident, below).
3. **986257e** — the docs commit (the deploy records).

## The 04:48 incident (found by the live matrix, fixed within ~35 min)

The first post-deploy teams.xml re-render (04:48) listed Juventus/Roma/
Tottenham rows whose pages the new router gate 410'd — a sitemap listing
410 URLs. Root cause: `bot_settings_v1` (the bot's admin overlay — the
owner's followed clubs, saved in provider-form spellings) REPLACES
`CONFIG.BIG_TEAMS_BY_LEAGUE` via applySettings in any isolate that served
a public-matches/cron path; that isolate's `isSelectedTeam` consumed the
overlay set (and the overlay's provider forms miss the TEAM_ALIASES
folds, so FC Internazionale Milano and Club Atlético de Madrid silently
DROPPED from the set — their pages went noindex). The fix (v13.281.1):
`isSelectedTeam` reads the FROZEN module-init capture in strict mode —
the selected set is deterministic across isolates; legacy keeps the
live-field read (the C1 dynamic law — the rollback contract). Guard
co-evolution: check-seo-teamstrict 35 gates + check-seo-crawlindex's
overlay test flipped to the frozen law.

## The live verification matrix (all checks 2026-11-25, sequential gentle curls)

- **/healthz**: ok:true, version 13.281.0-teamstrict, heartbeat age 1 min,
  outbox 0, degraded false, pool 476.
- **The 13 selected team pages**: all 200 (12 index; club-atletico-de-madrid
  self-heals from a stale overlay-era edge copy — re-verified after the
  frozen fix: the /teams HTML tile set = exactly the 13 with
  club-atletico-de-madrid + internazionale-milano present).
- **The Iranian four** (persepolis, esteghlal-tehran, sepahan,
  tractor-s-c): all 200 + noindex — honest: the live pool carries NO
  future-dated PGL rows today (verified against matches_v13_tracked);
  they flip to index + tiles + teams.xml rows on the next PGL matchday
  (the s281 local smoke proved that path end-to-end).
- **Non-selected team 410s** (15 samples): benfica, chadormalu, malavan,
  gol-gohar, aluminium-arak, argentina, bonaire, sydney-fc,
  melbourne-city, ajax, porto, psv, viking, lyon, dinamo-zagreb — ALL 410.
- **/teams index**: exactly the selected tiles (13; numberOfItems 13 ==
  tiles 13; no non-selected hrefs).
- **/competitions index**: 10 tiles; **/competitions/persian-gulf-pro-league,
  /europa-league, /copa-del-rey → 200 + index**; **/competitions/a-league
  → 410**; raw codes (/competitions/ded) → 404.
- **Match pages**: (a) club-atletico-de-madrid-vs-viking (UCL): index +
  JSON-LD team url ONLY for club-atletico-de-madrid (Viking gets none) +
  organizer.url /competitions/champions-league; (b) sabah-vs-barcelona
  (UCL): index + only barcelona's url; (c) persepolis-vs-paykan (PGL
  big-four archived): index + only persepolis's url + organizer.url
  /competitions/persian-gulf-pro-league; (d) malavan-vs-gol-gohar
  (off-policy in-pool PGL): **200 + noindex,follow + NO team urls**;
  (e) hull-city-vs-brighton (PL top3-involvement — Brighton top3):
  still index (the top3 arm retains it — the verification matrix's
  spot-check); (f) sydney-fc-vs-western-sydney-wanderers-2026-10-16
  (the archived A-League leak): **410**; (g) psv-vs-heerenveen (archived
  DED): a pre-deploy edge copy (ARCHIVE_PAGE_TTL 6h) still served the old
  index bytes at verify time — self-heals by ~08:00 UTC (the soft-delisted
  class; the 6h render hold is the v13.259.1 design).
- **Sitemaps**: sitemap.xml index OK (5 children); teams.xml = exactly the
  13 frozen selected (was 13 → 14-broken → 13-frozen); competitions.xml =
  exactly 10; matches-upcoming = 106 rows (was 104; +2 = the MARQUEE-set
  GSC-clicked ties shakhtar-donetsk-vs-fenerbahce + villarreal-vs-sabah —
  the retains-MORE widening, no A-League, no raw-code comps, no dupes);
  matches-archive = **172 rows (was 665 — the off-policy soft delist)**,
  0 A-League rows, 0 duplicate locs, XML well-formed.
- **Load spot-check**: 8 sequential rapid requests to / → all 200; 3
  parallel → all 200 (no 503s).
- **Bot health**: getMe ok; getWebhookInfo → url
  https://football.sportsignal.ir/webhook, pending_update_count 0; cron
  ticking (cron_status_v1 heartbeat fresh, kv_writes_day 93 « the 1000
  quota; digest_sent_* keys present).

## The owner's GSC manual steps (delivered in chat)

1. GSC → Sitemaps → resubmit https://sportsignal.ir/sitemap.xml.
2. GSC → Pages → "Excluded by 'noindex' tag": the 36 URLs migrate to
   "Not found (410)" and decay; spot-check 3-4 via URL Inspection
   (LIVE test must show 410).
3. Monitor 1-2 weeks: Coverage flattening; Crawl Stats (server errors /
   503 trend, total fetches dropping); teams.xml stable at ≤17.
4. Expect zero NEW noindex team URLs after the next matchday of any
   competition.

## Watch items

- The stale 6h-held archived copies self-heal by ~08:00 UTC (psv-vs-heerenveen class).
- The Iranian four join teams.xml/tiles when the next PGL matchday enters the pool.
- Upcoming-child count legitimately includes the PGL big-four fixtures from the next matchday (D1).
- GSC: the 36 noindex URLs → "Not found (410)"; expect decay over 1-2 weeks.

Credentials used, not stored (session-local env file outside the repo);
the owner should rotate every token shared in chat after the session.
