# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

## Current state (after S37, v13.248-rankchip, 2026-11-09)

The S37 team rank-chip round is **done in code, tested, deployed and
live-verified** — see `docs/history/2026-11-09-s37-rankchip.md` for the full
record:

- Every match card on the public page now carries a small circular
  competition-rank badge beside each team's name (the fixture's OWN
  competition only: PL/PD/SA/BL1/FL1/PGL domestic tables + the CL
  league-phase table; knockout rows, domestic cups, pre-season and stale
  tables never badge; a missing rank is omitted, never a placeholder).
- Server-resolved from the standings caches the payload build already reads
  (zero new subrequests/KV writes); the SEO SSR mirror reads the same
  caches; the client renders through teamRow()/rankBadge()
  (public-13.75.js) with RTL/LTR-agnostic logical placement.
- Assets renamed per ADR-006: public-13.74.js→13.75.js,
  public-13.81.css→13.82.css; `_headers` cap sweep #18; SW cache v121;
  heroes:sync regen; version 13.248.
- NEW offline gate `scripts/check-team-ranks.js` (27 checks) in `npm test`.

## Where things are

- Version: `13.248-rankchip` (package.json / src/config.ts / lockfile in sync).
- `npm test` exit 0 (2937 checks) as of the S37 close.
- Deploy: `npx wrangler deploy` (worker `ucl-notifier`, assets+worker together) — deployed 2026-11-09, healthz ok, live page + payload verified with real ranks.
- The design pack is filed: spec `docs/specs/team-rank-indicator.md`, audit `docs/audits/2026-11-09-team-rank-indicator.md`, reference `docs/assets/team-rank-reference-match-cards-2026-11-09.jpg`, zip `docs/assets/sportsignal-team-rank-design-pack.zip`.

## Standing limits and reminders

- `_headers` is at exactly 100 rules — the NEXT +1 rule needs cap sweep #19 (evict the next expired pin; grep check-stats first — the giant historical-pins check pins most old CSS pins as required).
- The EL/ECL rank limitation is deliberate (no new provider fetches) — see the audit + DECISIONS before "fixing" it.
- The Telegram SVG cards (`src/card.ts`) deliberately carry NO rank chip this round.
- Desktop hero/mobile mcard deliberately carry NO rank badges (hero design language; hero rows are excluded from the lists so no double-presentation).
- The bot paths are untouched; the cron tick runs the new payload code without changes to send logic.

## Next session candidates

- Continue the owner's standing SEO focus (README's WHERE TO CONTINUE note).
- If the owner asks: rank chips on the Telegram SVG cards, or EL/ECL table coverage (see the history record's sketch).
