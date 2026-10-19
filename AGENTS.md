# AGENTS.md — read this before working in this repository

SportSignal is a Persian/English football match notifier: a Telegram bot
(`@SportSignalAlertsBot`) plus a public match page, running entirely on
Cloudflare Workers (worker name `ucl-notifier`, deployed from this repo).
This file routes you to the right documentation BEFORE you touch anything —
the repo's docs are the accumulated experience of multiple production runs;
reading them first saves time, tokens and mistakes.

## Player portraits / hero artwork — READ FIRST

All portrait-scraping knowledge lives under `docs/scrapping/uefa-players/`.
Route by task:

| Task | Read |
|---|---|
| The rules (sources, identity verification, manifests, acceptance) | `docs/scrapping/uefa-players/SPEC.md` |
| The practice: exact commands, flows, failure catalogue, lessons | `docs/scrapping/uefa-players/INSTRUCTIONS.md` |
| Add a new club's hero (on-demand flow) | INSTRUCTIONS.md §2 |
| Fill a club UEFA verifiably doesn't cover (league-official art) | INSTRUCTIONS.md §2b + SPEC.md §8b |
| Update a player (transfer, kit change, better pick) | INSTRUCTIONS.md §2c |
| Season-turnover refresh (annual) | INSTRUCTIONS.md §2d |
| A team renders crest-only / fill hero gaps (the loop) | INSTRUCTIONS.md §13 — `npm run heroes:report` first |
| Kit & club verification (kit-timing method + precedent cases) | INSTRUCTIONS.md §8 |
| What is already covered — do NOT re-probe | `assets/players/uefa/manifest-heroes.json`, `hero-clubs.json`, INSTRUCTIONS.md header |
| What failed and why (transport, rate limits, traps) | INSTRUCTIONS.md §3–§6, §9, §11 |
| Workspace lost / fresh clone rules | INSTRUCTIONS.md §10 |
| Every pipeline script and when to run it | INSTRUCTIONS.md §12 |

Current state (2026-10-19, v2.2 framing fix): **96/96 hero clubs complete —
13 UEFA official cutoffs + 83 league-official portraits** (PL 19 / LaLiga 18 /
Serie A 17 / Bundesliga 13 / Ligue 1 16), every entry with full provenance,
every portrait showing the body to at least the jersey (owner directive;
INSTRUCTIONS §9b). The UEFA coverage ceiling is conclusively documented with
per-URL probe evidence; re-probing UEFA for the no_asset clubs wastes a
session — extend via league platforms instead.

Since v13.129-herogaploop the runtime closes the visibility gap: the cron
tick logs every fixture team without wired HERO_ART artwork into KV
`hero_gaps_v1` (write-disciplined, ~1 write/day) and `GET /api/hero-gaps`
(+ `npm run heroes:report`) returns the prioritized worklist — see
INSTRUCTIONS §13. Notable backlog it surfaced at launch: 78 published
big-5 portraits are NOT yet wired into the site's HERO_ART map (a wiring
backlog gated on the owner's display decision, not a scraping gap).

## The portrait invariants (30 seconds)

- 512×512 **lossless WebP with alpha**, transparent background, shared
  baseline; filenames derive from player names, never club names.
- **Official sources only**: UEFA cutoffs first; otherwise the five
  league-official platforms (SPEC §8b). Never fansites, wikis or
  aggregators.
- The kit must match the player's **current** club (kit-timing,
  INSTRUCTIONS §8). A wrong-club or national-team kit is never published.
- Honest manifests including failures; every alt-source file carries an
  `alt_source` provenance block.
- Assets serve at `/players/uefa/` from the wrangler `[assets]` directory —
  changes go live only on `npx wrangler deploy`.
- `.cache/` is gitignored: never run `normalize` on a fresh clone before
  rebuilding cache state (INSTRUCTIONS §10).

## Everything else

| Task | Read |
|---|---|
| Deploy / operate / rollback / monitoring / incidents | `RUNBOOK.md` |
| System architecture | `ARCHITECTURE.md`, `docs/adr/` |
| Session hand-offs (dated next-session prompts) | `docs/history/` |
| The original 36-player portrait collection | `docs/assets/uefa-player-portraits.md` |
| Legacy task specs (historical, superseded) | `uefa-player-portraits.spec.md` (v1), `markdown-instructions.md` |

## Commands you will actually use

```bash
npm run portraits:heroes        # discover → fetch → normalize → validate → contact sheet
npm run portraits:alt           # league-official fill for UEFA-uncovered clubs
node scripts/uefa-player-portraits/cli.js validate --roster roster-heroes.json
npm test                        # offline gates, incl. the portrait check
npx wrangler deploy             # assets + worker go live
```

## Hard rules

- **No credential, cookie or token ever enters the repository, logs or
  commit messages.** Credentials are re-supplied by the owner per session;
  push one-shot (`git push https://x-access-token:<token>@… main`), never
  persist tokens in git config. A live bot token was once found in this
  public repo — rotate and purge history if it ever happens again.
- No fabricated assets, no placeholders, no player substitution without
  documentation. A 403 is throttling, not "asset missing".
- Run `npm test` before every push. Fetch the remote first (`git fetch
  <url> main`, rebase if it moved — the owner sometimes uploads via the
  web UI) and verify the push with `git ls-remote <url> main`, never the
  stale local tracking ref.
