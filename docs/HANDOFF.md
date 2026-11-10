# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

## Current state (after S43, 2026-11-10 — the always-show round)

The S43 round (v13.253-alwaysshow) is LIVE: per the owner's directive
("Do not add the quiet down option if user has tapped already. always
show it."), the sticky channel bar's 30-day tap-silence memory — the
mechanism behind BOTH earlier "gone bar" reports (S32, S42) — is
RETIRED outright. The inline controller (`src/pages/public.ts`) reads
and writes NO localStorage verdict at all: every `sp_pill_*` key the
earlier rounds left in visitors' browsers is permanently inert (a
browser holding an old tap verdict — the owner's included — sees the
bar on the very next load, no migration). A tap (bar body OR the blue
mark) now does exactly ONE thing: opens the channel in a new tab; the
bar stays on screen and returns on every future visit. The standing
reveal gates ride unchanged: the 20% scroll rule + the <=600px
mobile-only law (>=601px keeps the #tgFab bot FAB). Full record:
`docs/history/2026-11-10-s43-alwaysshow.md`, evidence
`docs/assets/s43-alwaysshow/`, decision in DECISIONS (2026-11-10) +
ADR-008-pill-always-show.md.

- Verified live post-deploy (agent-browser, 360px): the owner-sim
  (joined7 = 1h ago — the exact state that HID the bar on v13.252) now
  SHOWS the bar; a real tap on the blue mark opened t.me in a new tab
  while the bar stayed visible, with NO key written; reload-after-tap
  still shows; fresh visitors show in fa + en; 768px hides the pill and
  shows the #tgFab (mobile-only law intact); console + page errors
  clean; `/healthz` = `13.253-alwaysshow`.
- An HTML-only round: no bundle edit, no CSS rename, no SW bump; the
  v13.252 live check demoted with its survivors re-pinned in the new
  v13.253 live check (the all-pill-memory-keys-gone law); the page
  baseline re-frozen via `--update` (admin/login byte-identical after).
  `npm test` exit 0 (2950 checks).
- The custom-domain edge served the cached v13.252 HTML for ~3.5 min
  after deploy (expected: `s-maxage=60` + `stale-while-revalidate=300`);
  workers.dev had the new bytes immediately.

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
