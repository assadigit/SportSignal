# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

## Current state (after S42, 2026-11-10 — the pill restore round)

The S42 round (v13.252-pillreset) is live: the owner's "the sticky
bottom bar is gone" report was diagnosed LIVE first — the grass channel
bar (#tgPillBox) was serving and rendering perfectly for fresh visitors
(browser + VLM verified, fa and en); what hid it on the owner's own
browser was the pill's 30-day tap-silence memory (`sp_pill_joined6`,
seeded by a channel tap after v13.247 — the S32 "invisible pill"
report class). The fix is the established one-shot re-key
(`sp_pill_joined6 -> sp_pill_joined7`): every visitor who had tapped
since v13.247 sees the bar again immediately, fresh taps re-seed the
30-day window under the new name. Full record:
`docs/history/2026-11-10-s42-pillreset.md`, evidence
`docs/assets/s42-pillreset/`, decision in DECISIONS (2026-11-10).

- Verified live post-deploy: joined6-set browser (the owner's exact
  state) SHOWS the bar; joined7-set browser hides it (the no-nag law
  works under the new key); fresh visitors show in fa + en at 360px;
  no heading clipping (head 42/42, sub 18/18); console clean;
  `/healthz` = `13.252-pillreset`.
- An HTML-only round: no bundle edit, no CSS rename, no SW bump; the
  v13.251 live check demoted with its survivors re-pinned in the new
  v13.252 live check; the page baseline re-frozen via `--update`.
  `npm test` exit 0 (2949 checks).

## Where things are (the S41 verification record — the rank numbers)

The S40 quiet-plain-number round (v13.251-ranknum) remains the live truth
for the rank numbers, and S41 re-verified it end to end against the live site
with independent tooling — **zero code changes were needed**; see
`docs/history/2026-11-09-s41-rankverify.md` for the full record:

- The league-standing number is a quiet PLAIN NUMBER in the name's own row on
  the center-facing flank (home [name,num] / away [num,name], logical order),
  11px regular tabular Persian digits, `flex-shrink:0`; the NAME truncates
  with an ellipsis first; muted blue-gray ink (dark `#94a3b8` / light
  `#5b6b82`, the contrast gate is permanent in `check-team-ranks.js`); the
  label names the table («رتبه ۳ در جدول لیگ قهرمانان اروپا», fallback
  «رتبه ۳ در جدول»); no rank renders nothing. The S38 tap+hover tooltip
  rides along unchanged.
- S41 re-verification (all live): `npm test` exit 0 (2948 checks); 76 chips
  at 360/768/1280px in fa/RTL AND en/LTR — zero overlaps (name, logo, kick
  block, three-dot menu), zero clipped; flank order correct in both
  directions; the three longest names truncate cleanly at 360px with intact
  two-digit numbers; real-pixel dark-theme contrast worst 5.67:1 (PASS);
  VLM close-up reviews clean; console clean.

## Where things are (the machine state)

- Version: `13.252-pillreset` (package.json / src/config.ts / lockfile in sync).
  Live worker runs it (`/healthz` `"version":"13.252-pillreset"`, ok).
- Deploy: `npx wrangler deploy` (worker `ucl-notifier`) — last deployed by S42
  (2026-11-10, version ID 980251f4-831e-49f7-a0a5-3cd8b24c325b); the pill
  restore round changed no assets (an HTML-only release).
- Design pack: spec `docs/specs/team-rank-indicator.md` (§12 = the S40
  addendum), audit `docs/audits/2026-11-09-team-rank-indicator.md`,
  screenshots `docs/assets/s40-ranknum/` (S40 before/after) and
  `docs/assets/s41-rankverify/` (S41 live re-verification set) +
  `docs/assets/s42-pillreset/` (the S42 restore evidence).

## Standing limits and reminders

- `_headers` sits at exactly 100 rules — the NEXT +1 pin needs cap sweep #21
  (next-oldest expired candidates: the JS pin 13.41.js, the CSS pin
  13.52.css — grep check-stats first, every flip needs the co-evolution in
  the giant pins check).
- **Light theme is unreachable code** (boot script forces `data-theme=dark`;
  no `#tbtn` in the DOM, `toggleTheme()` never bound). Its rank ink
  `#5b6b82` measures 4.45:1 real-pixel worst on the bluest glow spots —
  below the 4.5:1 bar but user-invisible; fix it only if the light theme
  ever ships (DECISIONS 2026-11-09, S41).
- **The featured-card green shimmer** (v13.66) transiently dips the number to
  ~3.4–3.8:1 while the band sweeps over it (it washes every element on those
  cards; the white names stay >7:1). Pre-existing card decoration, out of
  the rank-number's scope — left as is (DECISIONS 2026-11-09, S41).
- The EL/ECL rank limitation is deliberate (no new provider fetches) — see
  the S37 audit + DECISIONS before "fixing" it.
- The Telegram SVG cards (`src/card.ts`) deliberately carry NO rank number;
  the hero/mcard surfaces stay number-free by design.
- The recovered S39 assets (`public-13.77.js`/`13.84.css`) stay in `assets/`
  forever (retention); they ride default cache headers.
- **The pill's tap-silence law is BY DESIGN** (ADR-007 no-dismiss + the
  30-day joined7 silence): if the owner reports the sticky bar "gone"
  again within days of a genuine fresh visit, do NOT assume regression —
  diagnose live first (see the S42 record §1); suspect a stale SW cache
  or a desktop check (the pill is mobile-only, ≥601px shows the #tgFab
  bot FAB instead — verified live in S42).

## Next session candidates

- Continue the owner's standing SEO focus (README's WHERE TO CONTINUE note).
- If the owner asks: rank numbers on the Telegram SVG cards, or EL/ECL table
  coverage (see the S37 record), or the tooltip polish round noted in S38
  (the 16px crest-clearing gap).
- If the owner asks for the sticky bar to ALSO promote the bot (it promotes
  the channel only today): that's a design change, not a repair — treat as
  a new owner round.
