# 2026-11-10 — Session 43: the always-show round (v13.253-alwaysshow)

> **Type: one-law retirement + the release ritual.**
> **Owner's directive, verbatim:** "Do not add the quiet down option if
> user has tapped already. always show it."

## 1) The reading of the directive

The sticky channel bar (the grass #tgPillBox, mobile <=600px) has carried
a no-nag memory since v13.241: ANY tap on the bar body or the blue mark
saved `sp_pill_joined<N>` and silenced the bar for 30 days. That memory
was the root cause of BOTH earlier "gone bar" reports (S32, S42) — each
time the fix was a one-shot re-key that reset the clock and re-armed the
same silence. The owner's directive retires the mechanism itself: the
bar must always show; a tap may never quiet it down. (ADR-008; DECISIONS
2026-11-10 — this supersedes S42's option-(b) rejection, which had kept
the law as then-owner-approved design. The owner has now decided
otherwise, and the current session's explicit instruction wins.)

## 2) The change — one controller, HTML-only

`src/pages/public.ts`, the inline controller:

- the load-time verdict read (`joinedAt` + the 30-day early `return`) is
  DELETED — the controller always wires, for every visitor state;
- the `lsGet`/`lsSet` helpers and the `DAY` constant are DELETED (no
  storage access remains anywhere in the template);
- the `joined()` tap handler and its two click listeners are DELETED — a
  tap (bar body OR blue mark) now does exactly ONE thing: opens the
  channel in a new tab (`target="_blank"`), and the bar stays on screen.

Every key the earlier rounds left in visitors' localStorage is now
permanently inert (never read again — the same one-shot semantics as
every re-key, but final; no migration needed, nothing to clean up). The
standing reveal gates ride unchanged: the 20% scroll rule (S31) and the
<=600px mobile-only law (>=601px keeps the #tgFab bot FAB). No bundle
edit, no CSS rename, no SW bump; the grass surface / cyan glow / 58px
blue mark / five-line rotator / no-dismiss law (ADR-007) ride
byte-identical.

## 3) The verification battery (all live, post-deploy)

| Test | Method | Result |
|---|---|---|
| BEFORE (pre-deploy, live v13.252): joined7 = 1h ago, reload, scroll 20% | agent-browser, 360px | **bar HIDDEN** (pillShow:false, visibility:hidden) — the owner's exact browser state; screenshot `before-live-360w-joined7-set.png` |
| BEFORE (pre-deploy): fresh visitor, scroll 20% | same | bar shows — the bar itself healthy pre-fix (screenshot `before-live-360w-fresh.png`) |
| Deploy | `npx wrangler deploy` | version ID `0aea7646-efb3-40b1-8af3-9774afd913f2` |
| healthz | curl | `"version":"13.253-alwaysshow"`, ok:true, outbox 0 |
| Served HTML (the custom domain edge) | curl + grep | 0 `sp_pill_joined` occurrences, 0 `function joined`, the ALWAYS-SHOW LAW present — after the expected ~3.5-min edge window (`s-maxage=60` + `stale-while-revalidate=300`; workers.dev served the new bytes immediately) |
| OWNER-SIM: joined7 = 1h ago, reload, scroll 20% | agent-browser, 360px | **bar SHOWS** (pillShow:true, rect bottom = viewport height, body.tg-pill-on) — the exact state that hid it on v13.252; screenshot `after-live-360w-joined7-set.png` |
| TAP: click the blue mark #tgPillGo | same | t.me/sportsignalz opens in a NEW TAB; the bar STAYS visible on the site tab (pillShowStill:true); the stored joined7 key is UNTOUCHED (still the seeded 1h-old value — no write happened) |
| RELOAD after the tap (old key still in storage) | same | bar shows — old verdicts are permanently inert |
| Fresh visitor (storage cleared), fa, 360px | same | bar shows; Persian heading + rotating sub-headline (screenshot `after-live-360w-fresh-fa.png`) |
| EN variant (lang=en, one 3.2s tick) | same | sub-headline rotated to English ("Get notified!", dir=ltr); bar shows (screenshot `after-live-360w-fresh-en.png`) |
| Desktop width 768px | same | pill `display:none`, #tgFab `display:flex` — the mobile-only law unchanged; back at 360px the pill shows again |
| Console + page errors | agent-browser | clean — zero entries |
| Cron ticks (≥2 full ticks, RUNBOOK §3.2) | healthz polling | the 01:10 UTC tick completed (last_cron_age 10 → 1) AND the 01:20 UTC tick completed (age 3 at 01:22:46) — twice in a row under v13.253; ok:true, outbox 0, degraded:false, kv_writes_day 45 → 69 |
| `npm test` | full suite | exit 0 (2950 checks) |

Evidence: `docs/assets/s43-alwaysshow/` — the five screenshots above.

## 4) The release plumbing

- Version **13.253** (`package.json` / `src/config.ts` / lockfile in
  sync; `/healthz` reports `13.253-alwaysshow`).
- `scripts/check-stats.js`: the v13.252 live check demoted to HISTORICAL
  (its joined7 read/write pins describe a law that no longer exists);
  the new **v13.253 live check** carries all the S40/S42 survivors
  verbatim plus the always-show law — no `sp_pill_*` key anywhere in the
  served source, no `lsGet`/`lsSet`/`joinedAt`/`apply(false)`/`var DAY=`,
  both channel links still wired `target="_blank"`, the 20% scroll gate
  + the rotator + the goBtn wiring intact.
- The page baseline re-frozen via `--update` (an INTENDED output change:
  the controller lost its memory lines); admin/login baselines
  byte-identical after the re-freeze.
- Deployed with `npx wrangler deploy` (version ID above), pushed to
  `main`, remote verified via `ls-remote` at every gate.

## 5) Known notes for the next session

- The pill's "gone" report class is CLOSED: no memory exists that can
  ever hide the bar. If the owner reports it gone again, suspect (in
  order): a stale SW cache serving old HTML, a desktop check (the pill
  is mobile-only; >=601px shows the #tgFab FAB), or the 20% scroll gate
  (a page with nothing to scroll never shows it — by design since S31).
- The bar still promotes the CHANNEL only (both taps → TG_CHANNEL_URL);
  the bot CTA on mobile is the header Telegram icon and the hero CTA
  (unchanged from S42's note).
- The 20% scroll reveal is NOT a tap memory — left untouched (out of the
  directive's scope, an S31 owner-designed behavior). If the owner wants
  the bar visible even at scroll 0, that's a one-line `onScroll` change
  + a re-pin.
