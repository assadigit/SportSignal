# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for the whole task.

## Current state (after S44 + the S44.1 hotfix, 2026-11-10 — the rank-badge container round)

The S44 round (v13.254.1-rankbadgefix) is LIVE on sportsignal.ir and
workers.dev: per the owner's approved container (signed off in the sandbox
replica — "I only approve the number container (e.g #5)"), the league
standing left the name's row (the S40 plain number) and rides the CREST as
a small anchored "#N" pill — Persian digits, the leading # isolated in an
inner dir="ltr" text span, a solid dark disc (#0c1524) with a thin steel
border (#46648f), pinned to the crest's bottom corner on the row's OUTER
flank (home = inline-start corner, away = inline-end — one logical rule per
side, mirroring correctly in RTL and LTR), with the #liveCard 28px-crest
(14px) and narrow-screen 37px-crest (16px) step-downs. The name row is the
plain pre-badge .team markup for every team; the S38 tap+hover tooltip rides
the unchanged .rankchip class; the hero carousel stays badge-free (the spec
scope law). Full record: `docs/history/2026-11-10-s44-rankbadge.md`,
evidence `docs/assets/s44-rankbadge/`, spec §13.

- THE S44.1 HOTFIX (ADR-006, ~8 min after the first S44 deploy): the first
  deploy shipped a corner-mirror bug — the outer .rankchip carried
  direction:ltr, so its inset-inline-* corner rules resolved against the
  badge's own ltr instead of the page's rtl (both pills sat on the INNER
  corners). The fix moved the ltr to the inner #N span (the approved
  structure) AND shipped under fresh names per ADR-006 rename-on-edit:
  public-13.79.js -> 13.80.js + public-13.86.css -> 13.87.css, SW v125 ->
  v126 (the ~8-minute-window immutable copies are stranded; the buggy files
  stay on disk riding default headers). LESSON RE-LEARNED: never edit an
  already-published immutable asset in place — not even 8 minutes later.
- Verified live post-deploy (agent-browser, fresh sessions): 76 badges at
  360px (16px step) / 768px / 1280px (18px) in fa/RTL AND en/LTR — home
  pills at the crest's bottom-outer corner, away pills mirrored, zero
  overlap with names/times/menus; the # sits left of the digits (no RTL
  flip); the S38 tooltip opens on tap («رتبه ۶ در جدول لیگ برتر انگلیس»)
  and closes on outside tap; `/healthz` = `13.254.1-rankbadgefix`, ok;
  console clean. `npm test` exit 0 (2954 checks).
- The custom-domain edge served the previous deploy's HTML for ~2-3 min
  after each deploy (expected: `s-maxage=60` + `stale-while-revalidate=300`).

## Where things are (the S41/S40 verification record — the rank numbers)

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
- S41 re-verification (all live): `npm test` exit 0; 76 chips at
  360/768/1280px in fa/RTL AND en/LTR — zero overlaps, zero clipped; flank
  order correct in both directions; real-pixel dark-theme contrast worst
  5.67:1 (PASS); VLM close-up reviews clean; console clean.

## Where things are (the machine state)

- Version: `13.253-alwaysshow` (package.json / src/config.ts / lockfile in
  sync). Live worker runs it (`/healthz` `"version":"13.253-alwaysshow"`,
  ok).
- Deploy: `npx wrangler deploy` (worker `ucl-notifier`) — last deployed by
  S43 (2026-11-10, version ID 0aea7646-efb3-40b1-8af3-9774afd913f2); the
  always-show round changed no assets (an HTML-only release).
- Design pack: rank spec `docs/specs/team-rank-indicator.md` (§12 = the S40
  addendum), audit `docs/audits/2026-11-09-team-rank-indicator.md`,
  screenshots `docs/assets/s40-ranknum/` (S40), `s41-rankverify/` (S41),
  `s42-pillreset/` (S42) and `s43-alwaysshow/` (S43 — the always-show
  evidence).

## Standing limits and reminders

- `_headers` sits at exactly 100 rules — the NEXT +1 pin needs cap sweep #21
  (next-oldest expired candidates: the JS pin 13.41.js, the CSS pin
  13.52.css — grep check-stats first, every flip needs the co-evolution in
  the giant pins check).
- **The pill's "gone bar" report class is CLOSED** (ADR-008): no memory
  exists that can ever hide the sticky channel bar. If the owner reports it
  "gone" again, do NOT assume regression — suspect (in order) a stale SW
  cache serving old HTML, a desktop check (the pill is mobile-only,
  >=601px shows the #tgFab bot FAB), or the 20% scroll gate (a page with
  nothing to scroll never shows it — by design since S31; removing that
  gate would be a one-line `onScroll` change + re-pin, ask first).
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

## Next session candidates

- Continue the owner's standing SEO focus (README's WHERE TO CONTINUE note).
- If the owner asks: rank numbers on the Telegram SVG cards, or EL/ECL table
  coverage (see the S37 record), or the tooltip polish round noted in S38
  (the 16px crest-clearing gap).
- If the owner asks for the sticky bar to ALSO promote the bot (it promotes
  the channel only today): that's a design change, not a repair — treat as
  a new owner round.
- If the owner wants the sticky bar visible even at scroll 0 (removing the
  S31 20% reveal gate): one-line `onScroll` change + live-check re-pin.
