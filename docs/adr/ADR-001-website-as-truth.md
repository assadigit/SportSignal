# ADR-001: The website is the truth; the bot follows

- **Status:** Accepted (v13.68, enforced by construction v13.73-herotruth)
- **Context:** The site's hero card and the bot's `/featured` command both
  pick "the big match". Pre-13.73 they used SEPARATE implementations that
  diverged in 3 ways (unsorted live[0] pick, different status sets,
  different exclusions). Users saw one match on the site and another in
  Telegram — the worst kind of split-brain: both looked authoritative.
- **Decision:** ONE expression, `pickHeroMatch(matches)` in
  `match-classify.ts`: filter (not-FINISHED && (isFeaturedMatch ||
  isMasterPair) && (live || future)) + sort (live-first, then nearest
  kickoff). The site's `nextBig` and the bot's `/featured` both CALL it;
  neither may re-implement the logic.
- **Consequences:** Any hero change is one edit, both surfaces move
  together. Locked by the `#herotruth` checks (defined once, both
  consumers call it, no `isHeroWorthy` re-implementation, semantics
  pinned by regex, bot stays pool-only — no sweeps from commands).
