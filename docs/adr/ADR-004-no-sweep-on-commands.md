# ADR-004: Commands never trigger sweeps (v13.45)

- **Status:** Accepted (v13.45, locked by `#w8`)
- **Context:** A user-typed `/next` or `/featured` used to run the full
  3-provider sweep on the request path — crossing subrequest ceilings,
  burning CPU quota (the free-plan 10ms average), and making bot latency
  depend on three upstream APIs.
- **Decision:** Bot commands read the KV pool ONLY. The pool is refreshed
  by the cron tick (at most every 2h full / 10min live). `/featured`
  calls the same `pickHeroMatch` the site does, over the pool.
- **Consequences:** Bot responses are fast, cheap and bounded; data may be
  ≤10min stale, which is the correct trade for a notification bot.
  Locked by `#w8` (bot segment never calls `fetchMatchesFromAPI`) — the
  segment boundary is anchored at the first cron file (v13.75) so the
  check stays tight as the cron group grows.
