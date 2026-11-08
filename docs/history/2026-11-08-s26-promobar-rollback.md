# 2026-11-08 — Session 26: the S25 rollback + the approved static top bar (v13.237-promobar)

> **Type: account-level rollback + one website presentation release.**
> The owner's direction, verbatim: «Look, I only wanted to change the
> top bar of the site. Keep only this change in the image I'm sending.
> Revert everything else to how it was before this session. You were
> only supposed to build that top part, not redesign the whole site
> from scratch. Restore everything to the previous version
> immediately.»

## 1) The rollback (account-level, executed FIRST, zero code)

The S25 apex routing change is fully reversed, exactly per the S25
doc's own rollback procedure (`2026-11-08-s25-landing-routing.md` §3):

1. Deleted the four `sportsignal-site` zone routes: `sportsignal.ir/`,
   `/_next/*`, `/img/*`, `/logo.svg`.
2. Deleted the apex `AAAA 100::` DNS record.
3. Re-attached `sportsignal.ir` as a **Custom Domain of
   `ucl-notifier`** (Workers → Domains API; domain id
   `9c1716f23830c8a0f15bcb8941ab06e8f4cd0725`).

Verified live immediately after: `/` 200 serving this repo's
`PUBLIC_PAGE` (v13.236 markup at that moment), `/healthz` 200,
`www.sportsignal.ir` 301 → apex (R-06), `football.sportsignal.ir/webhook`
403 (protected, as designed). The zone route table is back to
`www.sportsignal.ir/*` + `sportsignal.ir/*` → `ucl-notifier` only.

The `sportsignal-site` worker and the `assadigit/SportSignal-Site`
repo are NOT deleted — they are dormant (unrouted, reachable only via
their workers.dev hostname). Deleting them is an owner decision that
can be taken any time; nothing on the zone references them.

## 2) The kept change — the approved static top bar (v13.237-promobar)

The only piece of the landing-page work the owner kept is its top
bar, ported onto THIS repo's `src/pages/public.ts` (replacing the
v13.236-promocalm rotator strip):

- **The message**: `.ps-q` the question («می‌خوای از زمان مهم‌ترین
  بازی‌ها مطلع باشی؟» — 13px/400, muted emerald
  `rgba(209,250,229,.6)`) → `.ps-h` the headline («با عضویت در کانال،
  بازی مهم بعدی رو از دست نده!» — 17px/800, white).
- **The CTAs**: `.ps-ch` «عضو کانالمون شو» → `https://t.me/sportsignalz`
  (the grass-green gradient `#1f9d58→#146c3c`, the inset top light,
  the 5.5s `ps-sweep` light reflection — compositor-only) and
  `.ps-bot` «ربات هوشمند» → `https://t.me/SportSignalAlertsBot`
  (`rgba(8,15,24,.85)` + the icy-blue border, clearly secondary,
  independently clickable).
- **The RTL law**: the page is `dir=rtl`, so the DOM order IS the
  visual order (question rightmost, bot pill leftmost) — no
  `row-reverse`, no double inversion. The question+headline ride one
  `.ps-msg` flex group so a wrap keeps them adjacent above the CTAs.
- **The bar**: `#04140c` near-black green + a 1px
  `rgba(52,211,153,.15)` bottom edge.
- **Retired**: the rotator (`.ps-rot`/`.ps-fr`), the pure-CSS signal
  mark (`.ps-mark`/`.ps-ring`), the dismiss button + the 7-day
  `ps_hide` memory — the approved design (the owner's image) carries
  no close button. The strip is now pure static markup: zero JS, zero
  requests, zero API calls.
- **Unchanged contracts**: strip position (after the skip link,
  before `#topbar`, the −24px/−16px full bleed, z-30), the
  `html[lang]` fa/en law (`.ps-fa`/`.ps-en` ride every text), the
  mobile law (≤600px: the bot pill retires — `#joinSticky` owns the
  mobile bot CTA — and the channel pill grows to the 44px
  touch-target floor), the inline-only round (no bundle edit, no SW
  bump), the `/ui/promo-signal.gif` retirement (file + immutable
  `_headers` pin stay).

## 3) Consequences for future sessions

- The apex homepage is THIS repo's `PUBLIC_PAGE` again — the SEO
  parity baselines for the public page are LIVE once more (the S25
  "do not fix to match the landing" note is void).
- `npx wrangler deploy` from this repo is the only deploy path for
  the homepage (as it always was before S25).
- If the landing direction is ever revived: the S25 doc describes the
  switch procedure; the source lives on in `assadigit/SportSignal-Site`.
