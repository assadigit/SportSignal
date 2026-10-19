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
| [INSTRUCTIONS.md](INSTRUCTIONS.md) §13 | The hero gap loop: what the runtime logs when a team renders without artwork, and the agentic backfill procedure (`npm run heroes:report` → `backfill-hero-gaps.js`) |
| [INSTRUCTIONS.md](INSTRUCTIONS.md) §13.5 + [SPEC.md](SPEC.md) §8c | The v2.3 style system: VLM jersey-priority audit (`npm run heroes:style-audit`), the fill-time card-render gate, and the star fallback ("find another STAR of that club — be flexible") |
| [INSTRUCTIONS.md](INSTRUCTIONS.md) §14 | The club alternates library (3-4 pictures per club, `LaLiga > Real-Madrid` foldering), the runtime transfer watch (`/api/hero-rotation`), and the rotation procedure (`npm run heroes:rotate`) |
| `scripts/uefa-player-portraits/` | The pipeline itself (`cli.js`, rosters, relay worker, fixtures) |
| `docs/assets/uefa-player-portraits.md` | The original 36-player collection's detailed method + review findings |
| `assets/players/uefa/` | The published library: portraits, per-collection manifests, `hero-clubs.json` (club → MVP portrait map) |
| `assets/players/clubs/` | The club alternates library: league > club folders, 3-4 VLM-style-gated candidates per big-5 club, `manifest.json` (the club jersey database — rotation order + FD team ids) |

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
  and style-clean (2026-10-20, v2.3 style audit)**: 22 UEFA official cutoffs
  + 74 league-official portraits, every file VLM-classified — 84
  `jersey_photo` + 12 `bust_photo`, **zero card renders** (spec §8c). The
  2026-10-20 audit replaced the 8 confirmed platform card renders (7 ×
  LaLiga "004" stylized series + Troyes' Ligue 1 media set — Troyes' hero
  is Iron Gomis via the style-exhaustion star fallback) and repaired the 9
  provenance records the 13.129-hudframe revert had left stale. The
  preceding v2.2 framing audit re-verified
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
