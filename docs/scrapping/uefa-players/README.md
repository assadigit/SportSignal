# UEFA Player Portrait Scraping

Everything SportSignal knows about scraping official UEFA player cutout
portraits — spec, runbook, and the recorded experience of two full
production runs (2026-10-18).

| Read this | For |
|---|---|
| [SPEC.md](SPEC.md) | The rules: sources, identity verification, MVP selection, transport, manifests, acceptance criteria (v2 — supersedes the original `uefa-player-portraits.spec.md` at the repository root, which is preserved as the v1 historical task spec) |
| [INSTRUCTIONS.md](INSTRUCTIONS.md) | The practice: exact commands, the on-demand "new club appears in the hero" flow, the relay deploy runbook, the failure catalogue (what didn't work and why), the post-run checklist |
| [INSTRUCTIONS.md](INSTRUCTIONS.md) §2c–§2d | Updating players: transfers, kit changes, better picks, and the season-turnover refresh |
| [INSTRUCTIONS.md](INSTRUCTIONS.md) §8–§12 | Kit-timing verification (method + precedent cases), the 2026-10-19 audit + alt-source run, disaster recovery, the sandbox survival guide, tooling reference |
| `scripts/uefa-player-portraits/` | The pipeline itself (`cli.js`, rosters, relay worker, fixtures) |
| `docs/assets/uefa-player-portraits.md` | The original 36-player collection's detailed method + review findings |
| `assets/players/uefa/` | The published library: portraits, per-collection manifests, `hero-clubs.json` (club → MVP portrait map) |

## The system in one paragraph

When a club appears in the hero section and has no portrait, its star
player (superstar; or a researched top-3 pick when in doubt) is scraped
**once** from official UEFA sources — identity-verified, kit-checked,
normalized to the shared 512×512 transparent WebP spec — and published to
the project assets. Every later appearance serves the stored asset; UEFA is
never hit twice for the same club. Clubs UEFA has no honest asset for are
marked in the map and the hero layer renders without artwork. Coverage is
not limited to any fixed club set: the big-5 leagues (96 clubs) are
pre-seeded; everything else is one runbook execution away
([INSTRUCTIONS.md](INSTRUCTIONS.md) §2).

## Status

- **36-player fixed roster** — 34 complete, 2 deferred (owner decision:
  no UEFA cutoff exists for Jackson/Thauvin).
- **Hero MVP library, big-5 leagues 2026/27 (96 clubs)** — **96/96 complete
  (2026-10-19, v2.2 framing fix)**: 13 UEFA official cutoffs + 83
  league-official portraits (spec §8b: PL/LaLiga/Serie A/Bundesliga/Ligue 1
  official media, full provenance per entry, body visible to at least the
  jersey — the §9b framing audit). The preceding UEFA coverage audit re-verified all
  70 unresolved clubs (probe sets, fallback locations, right-kit targets,
  the EURO-2024 national-team family, kit-timing withdrawals) — evidence
  recorded per club in the roster. See
  `assets/players/uefa/manifest-heroes.json` and `hero-clubs.json`.

## Rights

All portraits are © UEFA, collected from official uefa.com sources with
full provenance (profile URL, image URL, retrieval date, sha256 per
entry) — or, for the 65 league-filled clubs, © their league's official
media with per-entry `alt_source` provenance. Public availability does
not establish redistribution permission; see SPEC.md §13 before any
public use.
