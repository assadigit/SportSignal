# 2026-11-06 — Session 11: the post-wiring verification (KV morning read + Saturday-slate hero + RUM) — and the silent RUM outage it caught (v13.227-rumzone)

Wall-clock note (the repo's convention): this session ran 2026-11-06
00:13–01:0x UTC (Tehran 03:43–04:4x on 11-06), directly after the S10
end-checkpoint (b7271e8 / v13.226.1-herowirefix, deploy 20110795). The
session label stays 2026-11-06, monotonic with S5–S10.

Everything the S11 prompt asked for landed, plus one thing nobody asked
for: **the SS-25 RUM pipeline turned out to have been silently dead since
2026-11-05 00:00 UTC — diagnosed to root cause, fixed as v13.227-rumzone
(deploy 74b4218b), and verified end-to-end live this session** (§3).

## 1) Boot gates (all green, zero drift)

- `git fetch`: origin `main` == the S10 close (`b7271e8`) — no web-UI
  push, no rebase needed; tree clean.
- `npm test` → **EXIT 0, 2,611 OK** — exactly the v13.226.1 baseline.
- `npm run seo:check` vs production → **PASS 254 / FAIL 0 / REPORTS 0**,
  EXIT 0 — the clean 254/0/0 shape (no T-24 map-miss this time; the S9
  addendum's zero-report read has now reproduced twice).
- **Epoch guard**: `check-hero-carousel.js` NOW =
  `2026-11-30T12:00:00Z` — UNEXPIRED (session ran 2026-11-06, 24 days
  clear of the 2026-11-30 15:00Z horizon). No bump; the guard carries to
  S12 unchanged — bump FIRST if a session runs on/after ~2026-11-25.

## 2) The KV morning read — the HARD band cleared, exactly as predicted

The 00:00 UTC reset did its job. Reads (CF API, the STATE namespace):

| meter | value | note |
|---|---|---|
| `cron_status_v1.kv_writes_day` | **19** | fresh `kv_day: 2026-11-06` |
| `kv_writes_web_v1` | **2** (`{"d":"2026-11-06","n":2}`) | fresh-day key |
| **combined** | **21** | vs the Europa-Thursday close ~855/HARD |

Well under the 700 reference and the 820 SOFT / 850 HARD lines — the
predicted "fresh UTC day after a match-night burn" shape (S10 §6: the
reset clears both meters; no §7 investigation, none warranted). Tick
health: heartbeat ~1 min old at read time, `subreq_last_tick` 38 (< 42),
`budget: null` (no governor engaged), outbox 0. The owner's possible
one-time KV-budget Telegram page from Thursday night did NOT require
action (as foretold).

## 3) SS-25 RUM re-read → the silent outage → the fix (the session's find)

**The re-read** (`scripts/s11-rum-read.js` — the S10 method + two new
day-probes; raw: `docs/history/2026-11-06-s11-rum-raw.json`, pulled
00:25–00:26 UTC): both datasets **still end at 2026-11-04** (same 15 + 14
group keys as S8/S9/S10), and the probes returned **zero groups for BOTH
2026-11-05 and 2026-11-06** — ~25h into the 11-05 UTC day. The prompt's
expectation ("the 2026-11-05/06 events should land this window") was
wrong in a way that demanded investigation: the CI lighthouse bot traffic
(~68 bot pageloads/day through 11-04) had ALSO vanished, which no
ingestion-lag hypothesis explains.

**The diagnosis chain** (every step live-verified):
1. The beacon is PRESENT and fires: `beacon.min.js` 200, the CORS
   preflight (OPTIONS) 200 with correct `access-control-allow-origin:
   https://sportsignal.ir`, and the POST is sent with the correct
   `siteToken` in the payload body.
2. The POST goes to the **legacy absolute**
   `https://cloudflareinsights.com/cdn-cgi/rum` — where a token-only
   snippet sends, per beacon 2026.10.1's `version === undefined →
   absolute` endpoint rule — and that endpoint **404s**. A verbatim
   replay of the browser's own captured 801-byte payload reproduces the
   404 (so it is not payload/UA/CORS shaped).
3. `rum/site_info/list` shows the site/token mapping **INTACT**: ONE
   site, `site_tag 08a51fd8…` / `site_token fb7e7f1d…` (the tracked
   pair), created 2026-10-13, `auto_install: true`, zone ruleset enabled.
   Nothing was deleted, rotated or renamed on our side.
4. The **zone-relative** `https://sportsignal.ir/cdn-cgi/rum` answers
   **204** (the beacon's own XHR success status) and **ingests**: the
   replayed pageload event appeared in the CF GraphQL ~7 minutes later —
   the only 11-06 group at that moment (bot/desktop), unmistakably this
   session's replay.

**Conclusion**: CF cut this site's beacon ingestion over to the
zone-relative route (the one the zone ruleset serves for auto-install) at
2026-11-05 00:00 UTC, and the legacy absolute endpoint is dead for this
site. Our manual beacon (v13.208, token-only attr) kept posting to the
dead endpoint — every event since silently discarded, SSR pages and all
offline gates unaffected (the beacon is fire-and-forget; no console error
surfaces on 404).

**The fix — v13.227-rumzone** (commit 07dbcc9, tag `v13.227-rumzone`,
deploy `74b4218b`): the `data-cf-beacon` attr gains
`"send": {"to": "/cdn-cgi/rum"}` on BOTH HTML templates
(`src/pages/public.ts` + `src/seo/page-shell.ts`) — the beacon's own
endpoint config hook (`send.to` takes precedence in its endpoint const),
posting same-origin, CSP-covered by the existing `connect-src 'self'`,
the same route the zone ruleset serves. No asset renamed (the v13.39
rename rule does not fire — the attr rides served HTML); no
CONTENT_VERSION bump (the spec rule: only hand-written page text); SW
v116 → **v117** (the routine served-HTML evict — stale SWR/
offline-fallback page copies still carried the dead-endpoint beacon).
Gates: **check-seo-lastmod #9 now REQUIRES the override on both
templates** (a future edit dropping it — silently re-routing every
beacon to the dead endpoint — fails the suite); the check-stats SW pin +
the v13.227 release wiring gate (the v13.226 gate retired to a historical
stub, the house pattern); check-mc-heroes retirement pin follows; the
public-page parity baseline re-frozen (the beacon block only, diff
reviewed). `npm test` **EXIT 0, 2,612 OK / 0 FAIL** (2,611 + the new
release gate). Local smoke: wrangler dev healthz JSON + homepage 200 +
the override in the served HTML + **the beacon POST observed same-origin
in the browser network log** (`http://127.0.0.1:8787/cdn-cgi/rum` — the
405 there is the local dev server having no edge handler; production's
edge serves the route pre-worker).

**Post-deploy live verification** (the acceptance):
- `healthz`: `ok:true`, **version 13.227-rumzone**, outbox 0.
- The served homepage carries the new attr.
- Browser (fresh session): **`POST https://sportsignal.ir/cdn-cgi/rum`
  → 204** — the beacon now posts the live zone route.
- **The GraphQL proof** (~6 min after deploy): fresh 11-06 groups landed
  on BOTH datasets — WebVitals bot/desktop n=3 (LCP p75 0.78 s, INP -1)
  + Pageloads human/mobile n=3 + bot/desktop n=2. **The pipeline is
  confirmed healed end-to-end** (transport → 204 → ingestion → GraphQL).
- The hero paint re-verified on the same load (the templates changed):
  6 hero imgs, 4 painted lane figures (alvarez + yamal, each with cast),
  2 mobile ports, car ۱/۱, `heroArtFor` a function, zero console/page
  errors.

**Data impact (honest)**: the 2026-11-05 UTC day is permanently
unwitnessed (zero events). At the documented 1–17 human events/day
scale, the loss is a handful of samples; the GSC CWV acceptance gate
(OWNER_TODO §3 step 6) is untouched. The 10-31→11-04 series (human LCP
p75 2.36/2.53 s on 11-04) remains the last full window; the
new-portrait-weight LCP question the prompt carried can only be answered
once fresh post-fix windows accrue (days, not hours — the n per day is
single-digit).

## 4) The Saturday-slate hero spot-check — the S10 prediction, corrected

The S10 note predicted Saturday's fixture wave (Arsenal–Hull,
Mainz–Bayern, Leeds–Spurs, Dortmund–Elversberg…) would "put newly-wired
clubs on the slate". **It will not — the prediction overlooked the
AND-rule.** Verified against the live pool + the live saved settings
(KV `bot_settings_v1`): the hero slate requires `isFeaturedMatch ||
isMasterPair` — BOTH teams big — and EVERY weekend fixture is a
marquee-vs-minnow pairing (the owner's v13.179 both-teams rule working
as designed): Leeds–Spurs (Leeds ✗), Mainz–Bayern (Mainz ✗),
Dortmund–Elversberg (Elversberg ✗), Arsenal–Hull (Hull ✗), Forest–City
(Forest ✗), Roma–Sassuolo (Sassuolo ✗), Valencia–Real (Valencia ✗ —
not in the live master list), PSG–Troyes (Troyes ✗), Napoli–Lazio,
Inter–Como, Fiorentina–Juve, Genoa–Milan, Palace–Liverpool,
ManU–Villa, Sunderland–Chelsea (all one-big ✗). The only `pair:true`
fixtures in the entire pool are the two UCL MD5 games: **Arsenal–Dortmund
(11-24)** and **PSG–Roma (11-25)**. The featured slate stays the single
Atlético–Barcelona slide (Sun 11-08 20:00Z, both master ✓) through the
weekend; the carousel never rotates below 2 slides. **The first genuine
newly-wired hero ride is AS Roma → Dybala on PSG–Roma, Nov 25** (Roma
was among the 76). Future prompts should not re-predict the
single-big-club wave riding the hero.

What WAS verified this session (the prompt's executable core, the S10
§4 method):
- **Browser (fresh session, agent-browser)**: `heroArtFor` = function;
  the featured clásico paints BOTH desktop lanes (julian-alvarez.webp +
  .cast.webp, lamine-yamal.webp + .cast.webp — 4 figures, visible,
  581px-tall lane zone) + BOTH mobile ports filled and visible at
  390×844; the countdown ticks («روز۰۲ ساعت۱۹ دقیقه۳۶»); car ۱/۱ with
  chevrons off (single slide — correct); SW controlled; **zero console
  and page errors**; pixel-sanity on the desktop screenshot: lane-region
  stdev 38.1 / 33.1 (figure-level variance, not blank). Screenshots:
  `docs/history/2026-11-06-s11-desktop-live.png` (1440×900) +
  `2026-11-06-s11-mobile-live.png` (390×844).
- **Newly-wired clubs resolve in the LIVE runtime**: `heroArtFor`
  lookups — 1. FSV Mainz 05 → nadiem-amiri, Leeds United → harry-wilson,
  Hull City → mohamed-belloumi, SV 07 Elversberg → lukas-petkov, AS Roma
  → paulo-dybala (plus the wired clásico pair) — all return entries.
- **Assets**: the five newly-wired canvases + casts serve 200
  image/webp from the edge (amiri 117KB/wilson 138KB/belloumi 139KB/
  petkov 106KB/dybala 118KB + casts 17–19KB).
- **The /api/hero-gaps report** (the endpoint is admin-gated and no
  SS_ADMIN_TOKEN was supplied this session — the registry was read
  KV-direct, the same data the report serves): **92 resolved entries,
  every one stamped `resolved_at: 2026-11-05T22:50:21.749Z`** — the
  exact v13.226 deploy tick; the resolved big-5 entries DO show
  `resolved_at`, exactly as the prompt expected. All four Saturday-wave
  clubs present (1-fsv-mainz-05, sv-07-elversberg, hull-city-afc,
  leeds-united-fc). The open class is only no-library clubs (183 —
  European non-big-5 + A-League; the only hero_picks>0 open gaps are 4
  A-League sides, the followed-but-library-less class). Resolved
  entries prune after 7 days (2026-11-12) per the retention rule.

## 5) G-14 + the owner-side reads

- **G-14**: NOT due — the session ran 2026-11-06, before 2026-12-01.
  `docs/ai-visibility-prompts.md` stands as S7 left it (the 2026-11 row,
  zero citations). The first session on/after 2026-12-01 fills the
  2026-12 row.
- **GSC Pages read**: due ≈ 2026-11-09+ — still future at session close;
  not readable yet. Performance ≈ 2026-11-20+. Both carried in
  OWNER_TODO §3.
- **The 4-club MVP alignment question** (Liverpool Barcola/Wirtz,
  Stuttgart Undav/El Khannouss, Napoli McTominay/De Bruyne, Como Nico
  Paz/Kean): **no owner answer arrived** — stays parked as the owner's
  display/rotation decision (§2c/§14; a `heroes:rotate` round only if
  the owner asks).

## 6) Checkpoints + evidence

- **Release**: `07dbcc9` (v13.227-rumzone, tag `v13.227-rumzone`) —
  pushed one-shot, verified `git ls-remote` (07dbcc9 on main + tag).
- **Deploy**: ONE (the session's single deploy) — version ID
  `74b4218b-a87b-4ce2-9700-cbb16d5b75ee`, 2026-11-06 ~00:5x UTC.
- Gates at the release commit: npm test **EXIT 0, 2,612 OK / 0 FAIL**
  (raw log `/tmp/test-s11b.log`, session-scope); wrangler dev smoke
  green; post-deploy healthz `ok:true` @ 13.227-rumzone.
- Evidence: `docs/history/2026-11-06-s11-rum-raw.json` (the pre-fix RUM
  pull, day-probes included), the two live hero screenshots, the
  replayed-beacon payload/response transcript in §3, the post-deploy
  GraphQL groups quoted inline.
- Docs refreshed this commit: CHANGELOG.md (v13.227-rumzone), the SS-25
  tracker row (spec Phase-2 doc), OWNER_TODO (the S11 status block,
  Persian), RUNBOOK §3 (new step 5 — the RUM beacon-route check: the
  route validates tokens, valid → 204 / junk → 404, both live-verified;
  the outage signature is the VALID-token POST 404ing; the S11 §3
  replay-both-routes method documented), this note. INSTRUCTIONS.md
  untouched (the hero-gap loop docs stand; the beacon fix is a
  CHANGELOG/RUNBOOK-scale event, and the RUNBOOK's 2026-09-15 lesson
  class — "regex cannot see runtime-only failure" — is exactly what §3
  re-proved: the beacon's 404 was invisible to every offline gate; only a
  live end-to-end check caught it).

## 7) Next-session prompt (S12)

Handed to the owner in chat at session close. Shape: boot gates (fetch/
rebase → npm test 2,612 → seo:check vs production → epoch guard — bump
the NOW constant FIRST if on/after ~2026-11-25) + **the RUM
post-fix-window read** (confirm 11-06+ days accruing on both datasets —
the send.to fix's first multi-day window; re-quote human LCP once n
allows) + the KV band read + the **PSG–Roma (Nov 25) newly-wired hero
ride** if the session lands on/after that fixture (Dybala's portrait on
the featured carousel — the S10 §4 method) + G-14 if the month turned
(first session on/after 2026-12-01) + the GSC Pages read (due ≈
2026-11-09+) + the 4-club MVP alignment question (owner decision,
parked).
