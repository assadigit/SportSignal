# Changelog

All notable changes to the UCL Notifier are documented here, newest first.
Version strings follow the value exposed by the live `/api/status` endpoint
(see `src/worker.ts` `VERSION`).

---

---

## [13.166] — 2026-10-23 — v13.166-mctop (owner): the mobile HUD card's upper margin

**The owner (2026-10-23, follow-up on the live v13.165):** "reduce the upper
margin of the HUD of next upcoming match it's too much".

**Diagnosis (measured on the live site, 390x844):** the phone-zone card's
`margin-top:108px` is measured from the PAGE TOP (the herowrap pulls up
-100px under the transparent topbar), i.e. header-zone 100px + 8px breathing.
Stacked with the artwork's own top glow-fade (the first clearly-visible rim
sits ~33px inside the card box — ~5.5% of the height), the perceived empty
band between the header controls (bottom edge 82px) and the card's visible
rim ran ~95px (VLM-measured on the live screenshot: "the card is visually
pushed significantly downward... a deliberate floating effect" instead of a
hero sitting under the nav).

**Fix — one line:** `.hero-mcard{margin-top:68px}` in the <=899px phone zone.
68 puts the card's INVISIBLE top fade (first ~24px is alpha<=8) exactly
behind the transparent topbar's lower padding — nothing visible can collide
with the header controls (they sit at the screen edges, the card is centered)
— and lands the visible rim ~18px under the controls' bottom edge at every
phone height (390x667 / 390x740 / 390x844 / 430x932 verified live against
the topbar's measured boxes; VLM A/B: 68 = "comfortable, no collision,
significantly better" vs 108 = "too big, bottom-heavy"). The freed 40px flows
to the bottom: more of the next card's title peeks into the first screen
(66px peek even on the 667px small phone, 153px on the 932px tall one) —
compounding the v13.165 scroll-sign win. Desktop (>=900px) byte-untouched.

**Release mechanics:** public-13.64.css -> public-13.65.css (rename-on-edit;
the retired 13.64.css stays served + pinned one SEO TTL per the retention
rule), refs in public.ts + page-shell.ts, _headers gains the 13.65.css
immutable pin, SW v71 -> v72 + history, VERSION 13.166-mctop, package
13.166.0.0, check-stats pins rewritten (homepage/shell refs, the headers
chain, SW v72, the card-CSS feature block re-pinned at margin-top 68px),
admin-parity re-frozen (public page 47102B — the CSS href change only).
JS (13.49) + core (13.15) + the cropped frame webp ride on unchanged.

---

## [13.165] — 2026-10-23 — v13.165-mcfa (owner): the mobile card round — tight fit, scroll sign, FA/Jalali

**The owner's three-item round (2026-10-23):** "1. The margin is too much,
there are a lot of waste margin space around the HUD. 2. due to margin,
it's unclear for first-time viewer that they should scroll to see the
rest, no sign of below containers. 3. in either FA/EN locale, it shows
latin numbers and latin calender, but it must show jalali calender +
farsi numerals and farsi translations in FA mode. the overall graphical
is nice though. Good job."

**1 — the waste margin was BAKED IN THE ARTWORK.** An alpha scan of the
1024×1536 frame found the visible content spans only x 141–883 /
y 97–1453: ~13.8% fully-transparent margin per side + 6.3%/5.3% top/bottom
(invisible alpha ≤8 noise). At 390px that was 53px of dead space on EACH
side of the glowing HUD. The frame re-ships CROPPED as
`/ui/sportsignal-hud-mobile-c.webp` (743×1357, lossless,
composited-pixel-identical, 625KB; the old webp stays served + pinned one
SEO TTL). Every slot was remapped through the crop origin (141,97)/size
(743,1357) — logos 33/67%→26.5/73.4%, VS y 28.3→24.9%, names top 34→31.3%,
MATCH DAY 45.8→44.7%, date left 41.5→38.2%, kickoff 57.2→57.6%, cells
34/50/66→27.9/49.9/72% @74.3/77.1%, venue 47.3/82.8→46.2/86.6% — with the
cqw type scaled ×1024/743 (kickoff 11.3→15.6cqw, countdown 3.7→5.1cqw…).
The card is HEIGHT-driven now: `height:min(72svh,660px)` (+vh fallback) +
`aspect-ratio:743/1357` + `width:auto` — the visible HUD fills the width
it is given at every phone height (390px: 333px wide vs the old 283px =
+18%; 430px: 361 vs 312 = +16%; 360px: 292 vs 261 = +12%) and NEVER
overflows the fold (the old card bottomed at 699-of-844 and clipped past
the fold on ≤667px phones — now the whole card is always visible).

**2 — the scroll sign.** A new `#mcHint` pill sits under the sync caption
(the last hero child): «بازی‌های دیگر» / "More matches" + a down chevron,
bobbing gently (parked under prefers-reduced-motion), ≤899px only. It is
a REAL link (#topspotCard) whose click the public JS intercepts to
smooth-scroll to the first VISIBLE card below the hero (live > topspot >
week > ucl > standings; .page-col the hidden-everything fallback;
reduced-motion → instant). The height cap + the tightened ≤899px wrap
spacing (padding-bottom 48→16, margin-bottom 24→8) put the NEXT card's
title peaking into the first screen at every phone height (844px: 48px of
«دیدارهای جذاب لیگ‌ها» visible; 740px: 19px; 932px: 84px). The hint
shows/hides exactly with the card (no hero → no hint) — renderMCard
manages it client-side, the router unhides it under the same rule as the
card for no-JS.

**3 — FA speaks Persian; EN keeps the artwork's design language.** The
v13.164 card was Latin-by-design in both locales (the artwork's baked VS /
MATCH DAY / DAYS-HOURS-MINUTES language). Now the STATIC labels carry
data-i hooks (core-13.14.js→core-13.15.js: mcVs/mcDay/mcD/mcH/mcM —
«مقابل» / «روز مسابقه» / «روز-ساعت-دقیقه», trText flips them with the
language toggle) and renderMCard renders the FA data: faName team names,
the JALALI date («۳ آبان ۱۴۰۵» — fa-IR-u-ca-persian, day-month-year,
Persian digits, in the user's ss_tz zone), the faNum kickoff («۲۱:۰۰»),
the venueFa string («آلیانتس آرنا»); the countdown cells ride the fmtNum
locale writer (fa pockets read «۰۲/۲۱/۳۷», en keeps the Latin tabular
pair). The mcardHtml SERVER mirror ships the same FA presentation
(jalaliDateStr pure-math — byte-identical to the client's Intl render:
same month names, same digits, plain 0x20 separators — browser-verified;
toFaDigits time; faName; venueFa) so the no-JS first paint matches the
post-JS render, exactly like every other server mirror. Typography per
the v13.133 Persian system: Morabba carries names/date/kickoff/countdown
digits, Peyda carries the labels + venue, letter-spacing 0 (Persian is
never tracked), sizes tuned per face (html[lang="fa"] overrides — the
static `<html lang="fa">` default means the overrides hold for no-JS
too). direction:ltr stays pinned on the card — the Persian strings ride
the Unicode bidi algorithm inside the LTR block (RTL runs + LTR digit
islands render correctly; browser-verified).

**QA (wrangler dev :8787, KV fixture FC Bayern München vs Arsenal FC):**
390 FA — DOM rect audit lands every slot on the remapped spec (logos
26.5/73.4 @23.4 w23.4%, VS 49.9 @24.9, MATCH DAY 49.9 @44.7, date left
38.2 @48.5, kickoff 49.9 @57.6 fs 13.8cqw, cells 27.9 @74.3/77.1 w20.7%,
venue 46.2 @86.6); the full FA text set verified (مقابل / روز مسابقه /
بایرن مونیخ / آرسنال / ۳ آبان ۱۴۰۵ / ۲۱:۰۰ / آلیانتز آرنا /
۰۲-۲۱-۳۷ ticking); VLM crop inspection 6/6 (no clipping, labels inside
the pockets, date after the calendar icon, «مقابل» clear of both crests);
Morabba + Peyda fontLoaded:true. EN toggle — the full Latin presentation
returns (VS / MATCH DAY / DAYS-HOURS-MINUTES / FC BAYERN MÜNCHEN /
ARSENAL FC / OCT 25, 2026 / 21:00 / Allianz Arena / More matches),
Chakra Petch. Responsive: 375×667 (whole card visible + hint — the old
card clipped past the fold there), 360×740 (peek 19px), 430×932 (660px
cap, peek 84px). Desktop 1920 regression — mobile card + hint display:
none, PC card + Kane/Saka + hud-cells grid byte-untouched. Hint click
smooth-scrolls 0→788 (topspot at y=8). No-hero stub — card + hint hide
together; restored on load. 899/900 breakpoint edges exact. tz: the
client UTC-zone paint «۳ آبان ۱۴۰۵ ۲۱:۰۰» and the Tehran server mirror
«۴ آبان ۱۴۰۵ ۰۰:۳۰» are the same instant, date flipping across the
midnight boundary correctly. Zero console messages, zero page errors.

**Release mechanics:** public-13.63.css→13.64.css +
public-13.48.js→13.49.js + core-13.14.js→core-13.15.js (rename-on-edit;
the retired trio + the old frame webp stay served + pinned per the
retention rule), refs in public.ts + page-shell.ts + admin.ts + login.ts,
_headers pins the new quartet, SW v70→v71 + history, VERSION
13.165-mcfa, package 13.165.0.0, check-stats pins rewritten (read paths,
version refs, headers chain, SW v71, an 8-check v13.165 feature block),
hero-coverage regen (bundle ref only, 35 wired), admin-parity re-frozen
(all three page baselines — the core ref + the card markup).

## [13.164] — 2026-10-23 — v13.164-matchcard (owner): the MOBILE hero — the HUD mobile match card

**The owner's ask (spec-driven):** build the mobile match card on the raw
PNG frame (SportSignal-HUD-Mobile.png, 1024×1536, 2:3 — uploaded to the
repo root 2026-10-22) with live data overlaid in measured slots, matching
the «Futuristic Barcelona vs PSG Match Card» reference. The card was
built and QA'd as a standalone demo first (high-fidelity VLM verdict,
360/390/430 renders, long-name + missing-field contracts), then
integrated into the production site in this release.

**The integration:** at ≤899px (the phone zone, where the PC HUD frame
went width:auto and squeezed to ~150px tall) the mobile card takes the
hero — the PC card + player figures are untouched at ≥900px. The card is
a.hero-mcard #heroMCard: ONE real link to the match page (the PC card's
architecture verbatim — static frame + countdown cells + sr region
layers that survive the data rebuild; #mcardSpot is the data zone). 14
absolutely-positioned slots anchored by center point (left/top % +
translate(-50%,-50%)), cqw type via container-type:inline-size,
direction:ltr pinned (anchor + CSS) so the RTL page never mirrors the
layout; the VS and MATCH DAY navy pills interrupt the baked glow lines;
the date line starts after the baked calendar icon (41.5%, never
centred); the countdown's three cells sit in the baked capsule pockets
(34%/50%/66%) with tabular digits; the stadium line ellipsises inside
the baked pill. Chakra Petch self-hosted (500/600/700 latin woff2,
~10KB each, fetched only where the card's rules match text).

**Data wiring:** the SAME nextBig hero selection feeds both cards (one
source of truth). renderMCard (public-13.48.js) renders from both
renderHeroSpot exits — the mobile card follows the hero through
load/language-toggle/poll-refresh/empty; updateBigBar writes mcD/mcH/mcM
every second-tick (the same contract as #hcD, zeros clamp, cells hidden
for live/post) and the #mcSr polite region announces per-minute in the
page language. The date line + kickoff time render in the user's ss_tz
zone (curTz — the sync-line contract); mcardHtml (seo/markup.ts) is the
no-JS server mirror with Tehran stamps (tehranParts, deterministic
«APR 26, 2026» / «22:30» Latin formatting); the router fills
__SEO_MHERO__ + the __SEO_MCD/H/M__ digits from the payload epoch and
unhides the card under the same rule as the PC card. Missing fields
render the spec placeholders («--» + .mc-mut, empty crest slot) — zero
layout shift.

**Asset engineering:** the frame ships LOSSLESS as
/ui/sportsignal-hud-mobile.webp — composited-pixel-identical to the PNG
(verified: alpha channel exact, premultiplied RGBA exact — the raw RGB
deltas of a premultiply roundtrip cancel under alpha weighting), 646KB
vs 1.35MB. A palette PNG (453KB) measured 45.8dB composited PSNR and
lossy webp q95 measured 37.1dB — both rejected; lossless webp is INF.

**Release:** public-13.62.css→13.63.css + public-13.47.js→13.48.js
(rename-on-edit, retired pair stays served + pinned per the retention
rule), SW v69→v70, VERSION 13.164-matchcard, _headers gains the
13.63.css + 13.48.js + frame immutable pins, check-stats pins rewritten
+ new mobile-card pin block, admin-parity re-frozen, page-shell ref.

## [13.163] — 2026-10-22 — v13.163-herohd (owner): the Chelsea + Tottenham hero portraits upgrade to native UEFA 1080px cutoffs — Cole Palmer + Dominic Solanke

**The owner's directive:** «The quality of pictures are too low, find
better quality pictures for tottenham and chelsea (it doesnt matter if
you find one of the best players of either team) not only the MVP.»

**Root cause of the low quality:** the v13.162 wiring had used the
96-club library's premierleague.com headshot cards — 220x280 transparent
PNGs upscaled ×1.65 to the 512 canvas (the documented low-res exception:
the PL platform serves no larger official variant). Every other wired
club uses a native UEFA cutoff; the two PL giants looked visibly softer.

**The probe gap found this round:** the original no_asset sweep probed
the UECL/UEL/NT segment space but never **UCL segment 1 / season 2026**
— the UCL 2025/26 campaign, which is BOTH clubs' most recent UEFA
participation (both won 2024/25 European trophies and played UCL 25/26).
Native UEFA **1080×1080 transparent cutoffs exist there** (the new UEFA
canvas generation — even larger than the 512s). Fetched through the
redeployed `uefa-image-relay` worker (deployed isolated at
uefa-image-relay.sportsignal.workers.dev — the main wrangler.toml's cron
triggers aborted the first attempt at the account's 5-trigger free
limit; production was never touched, healthz verified).

**Selection (the owner allowed any star, not only the MVP):** star
players were enumerated via web-search (UEFA profile URLs carry the
player ids), probed across the segment/season matrix, and
**current-squad-verified against football-data.org /v4/teams/{61,73}**
(the transfer-watch source) + the 2026/27 FPL squads. REJECTED despite
having 1080px cutoffs: Cristian Romero (his UEFA profile now reads
«Cristian Romero | Atleti | UEFA Champions League 2026/27» — DEPARTED,
an Atlético kit would violate the no-kit-mismatch rule), Guglielmo
Vicario and Brennan Johnson (both absent from the current FD squad).
Maddison re-probed at the gap segment (1/2026) — still 404. The winners:
**Chelsea → Cole Palmer** (id 250124282; FPL 38 pts this season; blue
Chelsea kit, lion crest, Nike — kit VLM-verified) and **Tottenham →
Dominic Solanke** (id 250066930; FPL 18 pts; white Spurs kit, cockerel
crest, AIA — kit VLM-verified). João Pedro and Maddison both remain at
their clubs (FD-verified) — the swap is purely the quality/star upgrade
the owner endorsed.

**The assets:** both 1080px cutoffs run through the pipeline's own
normalizePortrait (lanczos3 downscale to the 512 library canvas, 5%
content box, bottom baseline — no upscale exception), then the standard
alpha-trim hero canvases (cole-palmer 345×464, dominic-solanke 298×464)
+ pre-baked casts (make-hero-casts.js: 37 files, the 35 existing casts
byte-identical). Fade-tier scan: bright-to-bottom uniform on both (max
adjacent-row steps 4/16 — far under the custom-tier thresholds) →
default ramp, no fade field. Library bookkeeping: manifest-heroes.json +
hero-clubs.json re-pointed with full UEFA provenance; the clubs DB gains
the two as active hero candidates (the old João Pedro / Maddison
candidates demoted to alternates, active parity maintained);
hero-club-alternates.ts re-synced; hero-coverage.ts regenerated (35
wired, players updated).

Release: public-13.46.js→13.47.js (rename-on-edit; the CSS pair
13.62.css carries over), SW v68→v69, VERSION 13.163-herohd, package
13.163.0.0, _headers gains the 13.47.js immutable pin (13.46.js stays
pinned one SEO TTL), admin-parity re-frozen (the script-ref digit),
check-stats pins rewritten (js20→13.47.js, homepage ref, headers chain,
SW v69, the 482-pin description). The retired joao-pedro/maddison hero
canvases + casts stay served per the retention rule (stale HTML + the
pinned 13.46.js reference them for one cache TTL).

QA (wrangler dev :8787, the Chelsea–Tottenham seed): both lanes .has
with the new srcs + casts, PL logo, names چلسی/تاتنهام; cast A/B pixel
proof + VLM below; mobile retirement; no page errors. Gates: npm test
EXIT 0 (2075 checks).

## [13.162] — 2026-10-22 — v13.162-heropair (owner): Chelsea FC + Tottenham Hotspur FC join HERO_ART — the two Premier League giants get their hero player pictures

**The owner's ask:** «Investigate why chelsea and tottenham doesnt have
hero player pictures. if not available. fetch and scrap them.»

**The investigation (root cause — both portraits already existed,
UNWIRED):** HERO_ART's display scope was the 2026/27 UCL 36-club roster
(33 wired after the documented deferrals/exclusions), and both PL giants
sit OUTSIDE it this season — so their fixtures rendered the crest-only
fallback (by design: the empty-mapping fallback is a tested state, no
broken <img>, no CLS). Their portraits were NOT missing: the 96-club
big-5 hero MVP library (docs §7b, assets/players/uefa/manifest-heroes.json)
had already fetched, normalized and validated both —
João Pedro Junqueira de Jesus (Chelsea FC) and James Maddison
(Tottenham Hotspur FC) — as league-official premierleague.com headshot
cards (transparent PNG, 2026/27 season, spec §8b alt-source route: UEFA
itself publishes NO transparent cutoff for either player — the bounded
404 sweep across UECL/UEL/NT competition segments is recorded in
roster-heroes.json no_asset, re-verified 2026-10-19). Wiring was an
owner-gated display decision (README §4); this release is that decision.

**The wiring (public-13.45.js→13.46.js, rename-on-edit):** two new
HERO_ART entries — "Chelsea FC" and "Tottenham Hotspur FC" (the EXACT
football-data.org provider names; FD team ids 61/73 verified against the
live API this round) — pointing at two NEW alpha-trimmed hero canvases
built by the standard v13.131 rule (alpha-bbox threshold 8 + 2px pad,
lossless webp): joao-pedro-junqueira-de-jesus.webp 365×464 and
james-maddison.webp 366×464, both the standard 464px subject box (460 +
2×2 pad), generated from the manifest-pinned uefa originals. Kit
VLM-verified 2026-10-22 BEFORE wiring (the §3 owner rule "no kit
mismatch allowed"): João Pedro — royal blue Chelsea shirt, lion crest,
yellow Nike swoosh; Maddison — white Spurs shirt, cockerel crest, AIA
sponsor, navy Nike swoosh. Fade tier: the v13.123 bottom-region
luminance scan runs clean on both — bright content extends uniformly to
99.4% of the canvas height with max adjacent-row steps of 6 (João
Pedro) / 15 (Maddison) — far under the custom-tier thresholds (Yamal's
step 106 @ 88% → "hi"; Šimić's bright-ends-69.5% → "deep") — so both
ship the DEFAULT fade ramp, no fade field. Casts:
make-hero-casts.js regenerates ALL 35 — the 33 existing .cast.webp
files are byte-identical under the deterministic bake (md5-verified
before/after), only the 2 new casts land (17.4KB / 18.1KB).

**Coverage bookkeeping:** src/hero-coverage.ts regenerated — 35 wired
(was 33), 76 library-only (was 78); Chelsea + Tottenham carry their
library annotations (player + league) so heroTeamArt()/heroLibraryFor()
resolve and the runtime hero-gap detector stops flagging them.

Release: public-13.45.js→13.46.js only (the CSS pair 13.62.css carries
over unchanged — the figures/casts ride the existing lane rules), SW
v67→v68, VERSION 13.162-heropair, package 13.162.0.0, _headers gains
the 13.46.js immutable pin (13.45.js stays pinned one SEO TTL),
admin-parity re-frozen (the public-page baseline 41387B — the intended
diff is the script-ref digit + its design-history comment), check-stats
pins rewritten (js20 → 13.46.js, the homepage ref pin, the headers
chain, SW v68, HERO_ART count 33→35 with the two new key-presence
assertions, the alt-count 33→35).

QA (wrangler dev :8787, KV fixture reseeded with hero = Chelsea FC vs
Tottenham Hotspur FC): DOM — both lane wrappers .has, figure img
/players/hero/joao-pedro-junqueira-de-jesus.webp (home, physical LEFT
lane x0) + /players/hero/james-maddison.webp (away, RIGHT lane x1420),
both .hero-cast imgs carry the new .cast.webp srcs; league logo
/leagues/premier-league.webp rides the frame rim (the LGL code map
resolves PL automatically); names چلسی/تاتنهام; sync line still stamps
the v13.161 zone+GMT parenthetical. Cast A/B pixel proof (tickers
static, visibility toggled): 188,698 toggle-verified px — left flank
95,005 px luminance 98.7→79.3 (−19.3), right flank 93,693 px
104.5→88.0 (−16.5), the CARD/content zone 0.00 px delta (no overlap);
flank-crop VLM: the left cast reads as "a soft, blurred, darkened
shadow… natural soft shadow rather than a hard rectangle"; the right
flank confirms under the comparative on/off side-by-side test (the
documented reliable method — full-page VLM attention misses 4%-width
bands). Mobile 375px: both figures retire (display:none) with the
≤1019px rule. No page errors; sw.js v68 served. Gates: npm test EXIT 0
(2075 checks).

## [13.161] — 2026-10-21 — v13.161-tzstamp (owner): the sync line carries the zone + GMT in parentheses, and the match day rides a few px closer to the match time

**1. «Show in parenthesis the time zone and GMT»** (owner's literal example:
«تاریخ به‌روزرسانی: چهارشنبه ۱۵:۲۰ ظهر (تهران 3:30 GMT)»). The
«تاریخ به‌روزرسانی» line — hero caption (#lastSyncM) + the below-hero
copy (#lastSync) + every SEO page's answer footer — now appends the
display zone + GMT offset in parentheses. SERVER (src/seo/markup.ts):
lastUpdatedHtml gains the note, always stamping Tehran (DISPLAY_TZ) via
the new displayTzGmtOffset() (Intl shortOffset primary, a parts-diff
fallback, the UTC+3:30 constant as the honest last resort — Tehran has
no DST). CLIENT (public-13.44.js→13.45.js): fmtStamp() appends the new
tzStamp() — the city from the SAME FA_TZ map the tz panel uses (fa name
/ en IANA path), the offset from the new tzOffAt() (the formatToParts
diff computed AT THE STAMPED INSTANT — DST-honest: a Melbourne stamp
reads 11:00 in southern summer and 10:00 in winter, always agreeing
with the clock the line sits under; unlike the tz dropdown labels which
pin the TZ_ANCHOR). Both language paths render the same shape — fa
«…ظهر (تهران 3:30 GMT)», en «…15:20 (Tehran 3:30 GMT)» — so the
server→client handover stays height-neutral (PF-08). Bidi: the plain
string renders as one RTL-ordered group (تهران rightmost → the 3:30
number island → GMT), verified in browser QA. Also fixed here: the
router's __SEO_SYNC__ replace was first-occurrence-only, so #lastSync
served the RAW placeholder to no-JS visitors (#lastSyncM got the
stamp) — now /__SEO_SYNC__/g fills both copies.

**2. «slightly move the match day up like several pixels so it's close
to match time»** (public-13.61.css→13.62.css). The clock pod's match day
(.time-date) rises toward the digits above it:
.hero-time .time-digits + .time-date gains --ss-date-lift:
clamp(-9px,-.8cqi,-3px) as margin-top with an EQUAL padding-bottom —
the flex stack height stays byte-stable, so the digits remain exactly
centered in the artwork's clock pod and ONLY the date text moves (at
the 1000px card: -8px; the visual gap between the digit bottoms and
the date tops drops ~15px → ~7px, absorbed by the digits' line-height-1
descender slack). Scoped to the upcoming digits pairing only — live
and score pods (state pill → score → date) keep their spacing, the
score chip having no descender slack to absorb an overlap.

Release: public-13.61.css→13.62.css + public-13.44.js→13.45.js
(rename-on-edit; retired pair stays served + pinned per the retention
rule), SW v66→v67, VERSION 13.161-tzstamp, package 13.161.0.0, _headers
immutable pins for the new pair, hero-coverage regenerated (bundle ref
only, 33 wired), admin-parity re-frozen, check-stats pins rewritten
(refs, headers chain, SW v67, the tzStamp contract, the time-date lift
contract, the /__SEO_SYNC__/g router pin).

---

## [13.160] — 2026-10-21 — v13.160-casttune (owner): the three-item round — stronger directional cast shadows, the wide-pose viewport-edge guard, and the Melbourne timezone fix

**1. The cast shadows — more visible, more spread, and now explicitly
directional by lane** (owner: "make the shadow more visible and with more
spread, make them relative to player position in right or left — if
player is left, the shadow must cast slightly on right; if player is
right, the shadow must cast slightly on left"). The v13.159 bake pipeline
re-ran with stronger parameters (scripts/make-hero-casts.js: sigma
6.5%→9% of source height — the penumbra grows ~40% wider at the 1920
hero — and master alpha .55→.68; all 33 /players/hero/<slug>.cast.webp
regenerated deterministically, side pads auto-grew via the existing
max(12.5%H, 1.9σ) rule). public-13.61.css follows through: the cast
vector --ss-cast-x grows clamp(48px,4.4vw,88px)→clamp(56px,5vw,100px)
(84px→96px at 1920) and each lane gains skewX(±3.2deg) about the cast
img's bottom (transform-origin 50% 100% — the floor line): the feet stay
planted and the head-shadow LEANS TOWARD THE CARD (home/left lane skews
negative = leans right; away/right lane positive = leans left — CSS
skewX(+θ) leans an origin-anchored image's top LEFT). The lane wrapper
clip-path inward guard widens 160px→320px for the stronger reach (the
dense core still stops short of the wing crest zone; only the sub-5%-alpha
gaussian tail crosses it, exactly like v13.159). NO filter, NO mask, NO
mask-clip re-entered — translate+skewX+opacity are compositor-only and
engine-uniform; the three-round post-mortem contract
(SHADOW-CONSULTATION.md) holds.

**2. The pose-width guard** (owner: "a player of arsenal almost collided
with the edge of the viewport, but player of bayern munich took
significantly less space — for the players with wider pictures, make them
slightly closer to the HUD"). The figure box is inner-edge anchored and
grows OUTWARD with the pose's aspect ratio: wide poses (Saka .89, Haaland
.92) fill the whole lane budget (max-width calc(100% + 32px)) and their
silhouettes land flush at the viewport edge, while narrow poses (Kane .51)
center in the box ~200px in. heroArt() (public-13.44.js) now measures the
laid-out figure width once the img loads (offsetWidth — unrotated,
budget-capped) and sets --ss-pose-shift on the lane WRAPPER: the extra
inward inset that guarantees a minimum OUTER clearance of
clamp(24px,3vw,56px) from the lane's outer edge (= the viewport edge —
the lanes are full-bleed). Narrow poses measure 0 and render
pixel-identically to v13.159; the cast rides the same wrapper so the
shadow shifts WITH its figure; window resize re-measures both lanes
(refitHeroPoses in the resize rAF pass); the shift is capped by the
clearance itself (the max-width budget bounds it), so a wide pose can
never dive fully under the card.

**3. The Melbourne timezone fix** (owner: "I tried to use the gear icon
and change time-zone to melbourne — the site didn't change and that
option didn't work… I want the site to save a cookie of users, so when
they set locale to another city it's always that city for them; set the
default timezone based on the users' default windows and browser locale").
ROOT CAUSE (reproduced on the live site): the tz panel's filter rebuild
ended with `!e.value && e.options.length && (e.value = e.options[0].value)`
— after a search narrowed the list to one city, that city was
AUTO-SELECTED as the select's displayed value, so clicking the very
option the user had just searched for changed NOTHING: no change event,
no store, no re-render, no panel close. "found melbourne, but did
nothing." THE FIX (public-13.44.js): while a filter is active and the
stored zone is not among the matches, a DISABLED PLACEHOLDER ("— انتخاب
کنید —") is inserted and nothing is auto-picked — the user's click now
fires change. The panel also gains an "⏱ Auto (browser)" entry (first in
the list; matched by the filters auto/browser/خودکار) that CLEARS the
stored preference so the OS/browser-locale zone takes over again.
PERSISTENCE: the choice is written to the ss_tz COOKIE (path=/,
max-age=1y, SameSite=Lax — the owner-asked store, survives localStorage
clears and rides the browser profile) AND the legacy localStorage ucl_tz
mirror (existing users' stored zones migrate to the cookie at initTz).
DEFAULT: curTz() resolves ss_tz cookie → legacy localStorage →
Intl.DateTimeFormat().resolvedOptions().timeZone (the browser/OS-locale
zone — the first-visit default the owner asked for; Iranian users still
resolve Asia/Tehran) → PAGE_TZ (server, final fallback). Every candidate
is Intl-validated so a malformed stored value can never break rendering,
and the resolution is cached (TZ_CACHE + tzInvalidate()) because curTz()
sits on the per-second countdown hot path. Server-side PAGE_TZ stays
Asia/Tehran: the homepage HTML is edge-cached (s-maxage=60,
stale-while-revalidate=300) shared across users — varying SSR by cookie
would poison the shared cache, and the client re-renders every section on
load anyway.

Release mechanics: public-13.60.css→13.61.css + public-13.43.js→13.44.js
(immutable under the rename-on-edit rule; retired pair stays pinned in
_headers per the retention rule), SW cache sportsignal-v65→v66, VERSION
13.160-casttune, package 13.160.0.0, hero-coverage regenerated against
the 13.44 bundle, admin parity untouched.

---

## [13.159] — 2026-10-21 — v13.159-bakedcast (owner): the projected player shadow becomes a PRE-BAKED IMAGE — the black-line/rectangle fix, round 3

The owner reported live v13.158 as "The problem persists. there are still
line and hard edges and rectangles" — and the report was verified failing
TWICE OVER on the local mirror (1920×900, KV fixture reseeded, casts
visibility-toggled for reproducibility): (a) in Chromium,
`mask-clip:no-clip` EXTENDS the cast's mask painting area past the img box
and the lane wrapper's `clip-path` does NOT contain the mask-extended
paint — the blurred feet-fringe LEAKS BELOW THE HERO onto the match list
(60,848 toggle-verified changed pixels, a solid black smear under the away
player, ASCII-heatmap-mapped x≈1560-1920 / y≈760-900+; the v13.158 QA had
seen this exact below-fold A/B diff and MISATTRIBUTED it to "the live match
list"); (b) forcing the `border-box` fallback (the owner's likely engine:
no `mask-clip:no-clip` support — Safari/older Chromium) razor-cuts the
blur fringe at the img element box — the v13.155/.156 rectangle again;
(c) the wrapper clip-path's `bottom:0` straight-lines every filtered paint
crossing the wrapper's bottom edge (the floor-line cut, present since
v13.142 for the figure's own drop-shadow tails). ROOT CAUSE, one sentence:
three rounds built the shadow from LIVE filter/mask/clip compositing, and
those primitives diverge per engine at their GEOMETRIC EDGES — every fix
round swapped one fragile primitive for another. THE FIX removes the entire
primitive family from the shadow layer: the cast is BAKED INTO PIXELS —
`scripts/make-hero-casts.js` (committed, deterministic, sharp) generates
`assets/players/hero/<slug>.cast.webp` for all 33 portraits: blackened (RGB
→ 0, alpha preserved — the silhouette IS the shadow), gaussian-blurred
(σ = 6.5% of source height ≈ 36px at the 1920 hero, matching the approved
v13.158 softness), floor-faded (smoothstep 15%→26% of source height — the
figure's mask ramp, so the shadow melts at the floor exactly with its
source), top-feathered across the whole top pad, master alpha ×0.55,
padded (12.5%H sides / 8%H top / 0 bottom — max(12.5%H, 1.9σ); the side
pads are HEIGHT-based so the cast box tracks the figure box uniformly
across poses: width-proportional pads made wide-pose files so much wider
than their figure boxes that the edge-anchored box growth cancelled the
away lane's translate and put the crescent on the WRONG side — caught by
A/B band mapping during the v13.159 QA) so the blur fringe NEVER reaches
the file edge. heroArt() (public-13.43.js) fills
img.hero-cast with `<src>.replace(/\.webp$/,".cast.webp")` from the SAME
heroArtFor entry (one source of truth, one extra day-fresh-cached request
per visible figure); public-13.60.css carries the cast with NO filter, NO
mask (both EXPLICITLY killed — the base `.hero-player img` rule would
otherwise hand it the figure's chain and feet-fade mask: the mask's
border-box clip is the v13.155/.156 rectangle mechanism, and
mask-clip:no-clip is the v13.158 leak) and NO max-width (the lane's +32px
budget must not contain-shrink the padded file) — only `opacity`
(`--ss-cast-alpha` 1 dark / .82 light over the baked .55) and the
lane-split translate, enlarged to `clamp(48px,4.4vw,88px)` to compensate
the baked side pads' silhouette offset and leave the ~30px visible
crescent beside the figure. The lane wrapper clips OPEN to
`inset(-100% -160px -100% -100%)` / `inset(-100% -100% -100% -160px)`:
the `bottom:0` floor cut retires with the live compositing it guarded, the
−160px card-side bound clears the padded cast's translated box (~116px at
1920) while guarding the wing crests; `--ss-cast-blur` retires (baked).
The figure rendering (grade/separation/rim/halo chain, tilt, feet-fade
mask, physical lanes), the HUD, particles and every other hero contract
are untouched. Plain alpha pixels have no failure modes: identical in
every engine, not croppable into a rectangle, unable to paint outside
their own file bounds. Full three-round dossier with reproduction steps:
`SHADOW-CONSULTATION.md`. Release: public-13.59.css→13.60.css +
public-13.42.js→13.43.js (rename-on-edit; the retired pair stays served +
pinned per the retention rule), SW v64→v65, VERSION 13.159-bakedcast,
package 13.159.0.0, _headers gains the new pair's immutable pins,
check-stats pins rewritten (references, headers chain, SW v65, the clip
rules inside the hero-geometry block, the heroArt cast-src derivation,
the FULL cast-CSS contract, a NEW baked-cast-files pin: every HERO_ART src
must have its .cast.webp sibling + the bake script's documented params),
admin-parity re-frozen (public-page baseline 40528B, the comment/href
swap). Gates: npm test EXIT 0 (2069 checks — the new baked-cast-files pin).
---

## [13.158-pngshadow] — 2026-10-21 (the owner's black-line/rectangle fix, round 2 — the shadow becomes the PNG object itself)

- Owner (on live v13.157): "The method didnt work and casted a black
  line and rectangle instead. Can't you just cast shadow on the PNG
  picture object itself?" The v13.157 wrapper drop-shadow had measured
  and VLM-verified as an organic silhouette in Chromium (sandbox AND
  production: 78,557 toggle-verified pixels, contour variation
  13.5–141.7px std, head/shoulder/arm contours at 8/10 softness), so
  the failure is a rendering-engine difference, not a parameter
  mistake: filter() on a CONTAINER wrapping a masked + clip-path'ed
  child is engine-fragile (the ancestor filter re-rasterizes the
  child's mask/clip during offscreen compositing — the classic
  WebKit-class failure mode), and independently the wrapper's own
  clip-path inset(-32px) hard-cut the cast's inward tail at the 32px
  tuck line in EVERY engine (the v13.157 QA's flank cluster ended
  exactly at that clip). An owner browser that mishandles the
  ancestor-filter compositing sees the lane box as a black rectangle,
  with the clip line reading as the black line.
- THE FIX (the owner's own direction, literally): the projected shadow
  is now A SECOND COPY OF THE PLAYER'S OWN PNG — img.hero-cast, the
  FIRST child of each .hero-player lane wrapper (DOM order = behind
  the figure), filled by heroArt() from the SAME heroArtFor entry
  (one source of truth, zero extra network — the URL is already
  fetched for the figure). filter:brightness(0) flattens the copy to
  pure black while preserving the PNG's alpha, so the shadow IS the
  player's silhouette BY CONSTRUCTION; blur(clamp(20px,1.9vw,38px))
  softens it; opacity var(--ss-cast-alpha) (.52 dark / .45 light)
  weights it; the lane-split translate() casts it toward the card
  (+X home / −X away, PHYSICAL lanes, dir-agnostic — the direction
  contract). The copy inherits the figure's exact geometry, anchoring
  and feet-fade mask from the .hero-player img base + lane rules, so
  the silhouette lands exactly under its source and melts at the
  floor with the figure; mask-clip:no-clip (-webkit- prefixed twin
  included) keeps the blur fringe from being cropped to the img
  element's box — the v13.156 rectangle lesson (browsers without
  no-clip degrade to a fringe cut at the img box, which the
  contain-fit side margins hide — the cast img box is wider than the
  silhouette by ~90px per side at 1920). Every primitive involved —
  img filter, img mask, transform translate — is the most
  widely-deployed CSS-filter pattern in existence; nothing composites
  a child's mask from an ancestor anymore, so no engine can regress
  the layer into a rectangle or a line.
- Consequential edits: the v13.157 WRAPPER drop-shadow rules RETIRE
  from the CSS (post-mortem comment block where they lived); the lane
  wrapper clip-path inward bound widens 32px → 120px (home right /
  away left) so the cast copy's blur fringe never meets a hard cut —
  the figure's own geometry is untouched (its img box can never
  exceed 32px past the lane edge: max-width calc(100% + 32px) + the
  inner-edge anchor, so the wider bound changes nothing for the
  approved figure rendering); --ss-cast-color retires in favor of
  --ss-cast-alpha (brightness(0) yields near-black; the light theme
  takes .45); the figure filter chains (grade/separation/rim/halo),
  the hud-depth overlay, the particles and every other hero-depth
  contract are untouched.
- Release mechanics: public-13.58.css→13.59.css +
  public-13.41.js→13.42.js (rename-on-edit; the retired pair stays
  served + pinned per the retention rule), SW v63→v64, VERSION
  13.158-pngshadow, package 13.158.0.0, _headers gains the new pair's
  immutable pins, check-stats pins rewritten (homepage/shell refs,
  the headers chain incl. the new live pair, SW v64, the template
  player-slot pin now expecting the cast+figure img pair per wrapper,
  the heroArt put() pin asserting the img:not(.hero-cast) figure
  query + the .hero-cast copy fill/clear, the NEW cast-copy CSS pin
  asserting the lane-split rules + tokens + mask-clip:no-clip + the
  −120px clip bound + the full retirement of the v13.157 wrapper
  filter), admin-parity re-frozen (public-page baseline: the +2 cast
  imgs), hero-coverage regenerated (bundle ref only, 33 wired).

---

## [13.157-shadowfix] — 2026-10-21 (the owner's rectangle-shadow fix)

- Owner: "There is a shadow but it's a weird … a rectangle shape casted
  shadow, instead of the player's (png-based) silhouette of the same
  person. Moreover, the shadow must be blurred and soft; currently there
  is just a rectangle and ugly shadow." The report was verified twice
  over on the local mirror: the v13.156 plane rendered as a razor-edged
  solid black RECTANGLE (VLM literal inspection of the owner crop:
  "solid filled rectangle/block, softness 1/10"; A/B pixel map: a
  uniform ~77px block with a hard right edge exactly at the img element
  box). Root causes, measured: (1) the .hs-img copies carried the fg
  figure's feet-fade mask, whose default mask-clip:border-box cropped
  the whole filtered paint — blur AND the +67px ECHO drop-shadow — to
  the img element's straight edges, while the echo's offset filled the
  box interior: union(silhouette, echo) ≈ the whole box, clipped to a
  rectangle; (2) the architecture itself could never show a recognizable
  silhouette: the wing's inner-face clip exposes a 22px→~100px window
  (at 1920) of the portrait's INNER edge only — for bbox-cropped poses
  the recognizable features map outside it (Kane's head and arm gap both
  land behind the figure/polygon; the window holds his featureless
  right-torso slab), so no tuning of copy alphas or cast vectors could
  fix the shape.
- THE FIX (architecture change, not a retune): the projected
  player-shadow plane RETIRES — markup (public.ts), putShadow fill
  (heroArt), CSS rules + the 28-vertex inner-face clip polygon — and the
  shadow becomes a --ss-cast-* drop-shadow ON the .hero-player--cinematic
  WRAPPERS themselves: the wrapper carries no mask, so the drop-shadow
  derives its shape from the live masked img alpha (the full silhouette —
  head, shoulders, arms — with the floor melt preserved) and paints
  unclipped in every direction; nothing geometric can ever crop it into a
  rectangle again. Parameters chosen by in-browser A/B + a 3-variant VLM
  panel test (the winner: "perfectly traces the silhouette … premium
  composite"): vector clamp(28px,2.6vw,52px) X + clamp(10px,.9vw,18px) Y
  (at 1920: +49.92/+17.28), blur clamp(20px,1.9vw,38px) (36.5 @1920),
  color rgba(2,12,30,.52) dark / rgba(8,32,63,.45) navy light; direction
  by PHYSICAL lane exactly like the rim tokens (home +X toward the card,
  away −X; dir-agnostic — verified byte-identical filters + unchanged
  lanes under the LTR toggle).
- Measured result @1920 (A/B toggle of the wrapper filters): an organic
  figure-shaped footprint (rounded head blob, shoulder widening, contour
  variation, feathered edges — NO straight block); content zones all
  0.00 delta (Bayern crest, Arsenal crest, central clock pod, sync
  caption); VLM flank crops PASS both sides (silhouette follows
  head/shoulders/arms, softness 8/10, no rectangles) and the comparative
  side-by-side test identifies the shadow half correctly on BOTH flanks
  (85/95 confidence). @1440 the cast scales (37.44/12.96/27.36) with the
  VLM pass; @375 the figures retire and the cast retires with them (it
  rides the wrapper — no figures, no cast); light theme renders + VLM
  PASS; no page errors.
- Release: public-13.57.css -> 13.58.css + public-13.40.js -> 13.41.js
  (rename-on-edit; the retired pair stays served + pinned per the
  retention rule), SW v62 -> v63, VERSION 13.157-shadowfix, package
  13.157.0.0, _headers pins + check-stats pins rewritten (refs, the
  headers chain, SW v63, the 1019px retirement regex, the heroArt
  figures-only signature, a NEW wrapper-cast pin asserting the
  lane-split rules + tokens + the plane's full retirement), admin-parity
  re-frozen (public-page baseline 38908 -> 38781B — the retired plane
  markup), hero-coverage regenerated (bundle ref only, 33 wired
  unchanged).

---

## [13.156-shadowtune] — 2026-10-21 (the owner's shadow-visibility fix)

- Owner: "I don't see any shadow" — the v13.155 projected player-shadow
  plane rendered but was imperceptible: the .13/.055 alphas measured only
  a −2.7 mean-luminance wash on the navy HUD face (VLM agreed at normal
  zoom). CSS-only release: public-13.56.css -> public-13.57.css
  (rename-on-edit, the retired file stays served + pinned),
  public-13.40.js + core-13.14.js carry over (no JS/template changes
  beyond the stylesheet href swap), SW v61 -> v62, VERSION
  13.156-shadowtune, package 13.156.0.0, _headers + check-stats pins
  rewritten, admin-parity re-frozen (the href swap is the intended
  public-page output change).
- The retune: .hs-img--soft blur 16px -> 13px @ opacity .13 -> .5;
  .hs-img--near blur 3px (unchanged) @ opacity .055 -> .22; the ECHO
  drop-shadow color alpha .45 -> .55 (blur + vector unchanged). The cast
  now reads as a readable figure-shaped shadow (head/shoulder/torso
  contour visible on the HUD flanks) while staying feathered — no hard
  edges, no rectangle (brightness(0) still preserves the PNG alpha). Every
  other v13.155 hero-depth contract untouched: physical lanes, the
  inner-face clip polygon, the <=1019px retirement, reduced-motion,
  the rim light, the depth overlay, the particles.

## [13.155-herodepth] — 2026-10-21 (the hero visual depth pass, spec-driven)

- The four spec layers from match-hero-specs.zip, each restrained and
  subordinate to the matchup info: (1) the projected player-shadow plane
  (blackened same-PNG copies cast inward+down onto the HUD's measured
  inner face, physical lanes only — left casts +X, right casts −X);
  (2) the interior-face depth overlay (translucent navy gradient on the
  same polygon) + the frame's alpha-aware drop-shadows (grounding + tight
  blue perimeter glow); (3) the directional rim light (a faint cool-blue
  contour lift on the HUD-facing side, lane-keyed); (4) the ambient
  particle layer (9 fixed 1-3px cool-blue points, CSS-only drift, parked
  under reduced-motion, <=899px caps to 4). CSS+JS release:
  public-13.55.css -> 13.56.css + public-13.39.js -> 13.40.js
  (heroArt() fills the shadow copies from the same art entries), SW
  v60 -> v61, VERSION 13.155-herodepth, package 13.155.0.0, _headers +
  check-stats pins rewritten, admin-parity re-frozen, hero-coverage
  regenerated. The cast alphas shipped here at .13/.055 were later found
  imperceptible — see 13.156-shadowtune.

## [13.154-polish] — 2026-10-21 (the 6 owner adjustments from 545454.png)

- Owner (screenshot 545454.png, six items). CSS-only release:
  public-13.54.css -> public-13.55.css (rename-on-edit, the retired file
  stays served + pinned), public-13.39.js + core-13.14.js carry over
  (NO JS/template logic changes — the one template edit is the stylesheet
  href swap), SW v59 -> v60, VERSION 13.154-polish, package 13.154.0.0,
  _headers + check-stats pins rewritten, admin-parity re-frozen (the
  href swap is an intended public-page output change).
- 1) A REAL page gap between the hero and the main area. The v13.153
  dark-floor extension could never fix the collision: the wide layout's
  "#wideMain,#wideSide>*{margin:0}" strips card margins and the flex gap
  never applies to the FIRST card — measured live, #topspotCard.top ==
  .herowrap.bottom EXACTLY (0.0px at 1869/1920/1440; phones kept 14px via
  .card{margin:14px 0}). Fix: .herowrap + margin-bottom:32px desktop /
  +24px in the <=899px block — real page-background margin the wide
  layout cannot eat; the 72/48px dark floor stays as the players' melt
  zone and the light-theme island boundary stays crisp.
- 2) The match day rides BARELY closer to the kickoff digits:
  .hero-time gap clamp(2px,.5cqi,5px) -> clamp(1px,.3cqi,3.5px)
  (4.6 -> 2.8px at the 920px canvas, 2 -> 1px on phones) + .time-date
  line-height 1.25 -> 1.15.
- 3) The kickoff digits slightly larger: .time-digits
  clamp(18px,3.95cqi,36px) -> clamp(20px,4.4cqi,40px) (+~11%; 40px at
  the 920px canvas, 20px floor on phones).
- 4) تاریخ به‌روزرسانی (the sync caption) at 60% opacity: #lastSyncM +
  opacity:.6 — it is meta data, one step back from the countdown/players
  hierarchy.
- 5) PLAYER LANES FIXED (functional bug, every match): the figures were
  on the WRONG sides on the RTL site — the home player beside the AWAY
  crest and vice versa (Kane beside the Arsenal wing, Saka beside
  Bayern). Root cause: the wings are PHYSICAL (.team-home{left:6.5%} at
  every direction) but the player wrappers + watermarks used LOGICAL
  anchors (inset-inline-start/end), which mirror with dir. Fix: physical
  lanes everywhere — .player-home{left:0}/.player-away{right:0}, the img
  tucks right:-32px/left:auto (home) + left:-32px/right:auto (away), the
  four [dir] clip-path + tilt rules collapse to two physical ones (home
  inset(-100% -32px 0 -100%), away inset(-100% -100% 0 -32px); home img
  -1deg, away img +1deg — each SCREEN SIDE keeps the lean the live RTL
  site already rendered), watermarks .wm-home{left:10px}/.wm-away
  {right:10px} desktop + left/right:-38px mobile. Each figure now stands
  beside his OWN team's crest in fa and en alike.
- 6) The time+date cluster is dead-centre in the clock pod: .hero-time
  left:43%/right:35.5% -> symmetric left:39.25%/right:39.25%. The pill's
  rim was measured from the artwork PNG at y=166 (bright runs x332-335 /
  x347-348 left, x652 / x666-668 right, baked clock icon ends x423):
  the pill spans x332-668, centre x500 = the artwork's exact centre; the
  old zone centred the cluster at x537.5 — 3.75% of card width RIGHT of
  centre, which read as off-centre (owner: "needs to come slightly
  left"). The symmetric band lands on x500; the digits still clear the
  baked clock icon by ~19px at the 920px canvas.
- Sandbox QA (the my-project mirror, 1:1 with the ported values):
  zone offset vs card centre 3.75% -> 0.00% at 1920/1440/375/320;
  digits 40/38/20/20px; gapDD 2.8/2.6/1.1/1px; sync opacity .6; real gap
  below hero 32/32/24/24px; players home cx 1542.8 -> 377.2 @1920 (left,
  beside the home wing 679) and away 266.3 -> 1653.7 (right, beside the
  away wing 1240); watermarks on their lanes; overflow 0 everywhere;
  VLM 6/6 PASS.

---

## [13.153-heronext] — 2026-10-21 (the hero shows the NEXT match + the hero→main safe margin)

- Owner: "Do not show the current result in hero. just show the next good
  match for example next hour or next day. also the distance between hero
  and site main area is low, add some safe margin."
- 1) The hero NEVER shows the rolling ball or a final score — it is always
  the next FUTURE hero-worthy kickoff ("next hour or next day"):
  - pickHeroMatch (the ONE shared expression, ADR-001 website-as-truth —
    the site's nextBig AND the bot's /featured) drops the live-first
    clause: the filter excludes LIVE/IN_PLAY/PAUSED alongside FINISHED and
    requires utcDate > now; the live-first sort term goes with it (nearest
    future kickoff, priorityTier breaks the same-kickoff ties as before).
    The bot's /featured follows by construction (one expression, two
    consumers — no drift).
  - public-13.38.js -> public-13.39.js: barTarget() gains the ok()
    future-only guard applied to EVERY candidate source — nextBig, the
    topSpot pick, and both upcoming fallbacks (big-first, then any). Even a
    STALE payload (KV cache + 60s poll + the live overlay marking the
    cached nextBig IN_PLAY) rolls the hero at kickoff second zero,
    client-side, without waiting for the rebuild. The old bare
    upcoming[0] last-resort (which could serve a live row) is gone —
    nothing future means the hero hides (the existing empty-pool path).
    POSTPONED keeps its pill path (a future-dated postponement still
    renders its notice, as before).
  - seo/router.ts: the server-rendered hero's fallback (nextBig || …)
    also skips live/finished/kicked-off rows — the no-JS/crawler hero and
    the "بازی بزرگ بعدی" meta description never describe the current
    result either.
  - Tests: check-priority's "LIVE leads everything" flips to "LIVE never
    heroes" (+ a PAUSED twin); check-no-miss's shared-expression shape
    regex now asserts NOT-live + the absence of the live-first sort.
- 2) The hero→main-area SAFE MARGIN: the scene floor doubles — .herowrap
  padding-bottom 34 -> 72px desktop, 0 -> 48px phones (the ≤600px block).
  The scene layers are inset:0 on the section's padding box, so the extra
  depth stays scene-colored (the dark island simply extends; the boundary
  stays crisp in the light theme) and the swoosh/watermarks still clip at
  the new edge. With the first card's own margin the hero→content gap
  goes ~48 -> ~86px desktop, ~14 -> ~62px phones.
- Assets: public-13.53.css -> 13.54.css + public-13.38.js -> 13.39.js
  (rename-on-edit; the retired pair stays served + pinned per the
  retention rule), SW v58 -> v59, VERSION 13.153-heronext, package
  13.153.0.0, _headers + check-stats pins rewritten, admin-parity
  re-frozen. The sandbox mirror (data.ts pickHeroMatch + hero.css floors)
  verified first: the hero rolled from the live PSG–Barcelona to Bayern
  München–Arsenal (the next future big match) with a clean 00/22/39
  countdown, VLM 3/3 PASS at 1920/375.

---

## [13.152-spacing] — 2026-10-21 (the 4 follow-up adjustments)

- Owner: "add some padding/margin between sportsignal and header and players
  picture, currently part of the player's head is colliding with header
  items. also increase Logos (club logos) in BG which has low opacity,
  brighter like 20% more opacity. also make the logo of sportsignal 20%
  bigger. make the countdown text sizes (numbers) smaller."
- 1) Player heads clear the header: the figures had grown so tall their
  heads rode up INTO the header band (105.54% of the section put the head
  top ~8% from the section top — under the brand/nav/controls). The height
  gains a HEADROOM CAP — .hero-player img
  height:min(105.54%,calc(113.585% - 122px)) — the box top (100% + 13.585%
  - height) parks ~122px from the section top, clearly below the header
  items; the bottom anchor + the feet-fade mask are untouched (the melt at
  the floor is exactly as before); the cap only binds when the head would
  collide, tall scenes keep the full 105.54% ceiling.
- 2) The SportSignal brand logo grows 20%: .brand img
  height:42px -> calc(42px*1.2) (= 50.4px); --ss-header-h follows
  94 -> 102px so the scene still starts at the page top (the var stays
  >= the rendered header height). Mobile: the card margin-top
  118 -> 134px so the league-logo crown keeps clearing the bigger brand
  at 320-375px (verified 320/375 in the sandbox: crown 15.8-18.3px below
  the brand bottom).
- 3) The bg club-crest watermarks brighten +20 POINTS of opacity:
  .bg-wm .264 -> .464 (desktop), .268 -> .468 (mobile) — the owner read
  the faint crests as too low-contrast against the dark grade.
- 4) The countdown numbers shrink ~20%: .count-num
  clamp(12px,3.9cqi,34px) -> clamp(11px,3.1cqi,27px) (the px fallback
  12 -> 11) — they read oversized in the frame's pockets next to the
  enlarged clock digits.
- CSS-only release: public-13.52.css -> public-13.53.css (rename-on-edit,
  the retired pair stays served + pinned per the retention rule);
  public-13.38.js + core-13.14.js carry over unchanged; SW v57 -> v58;
  VERSION 13.152-spacing; package 13.152.0.0. Sandbox-verified at
  1522/1920/1440(EN)/375/320: head top ~101px page-y on every desktop
  width (35px below the brand bottom), zero horizontal overflow, VLM
  4/4 + 3/3 + 3/3 PASS.

## [13.151-edits] — 2026-10-20 (the 8 requested adjustments — requested-edits.png)

- Owner: "The overall implementation is nice, but needs some adjustments…
  I, on purpose, used yellow, so you can find my notes" — the yellow
  annotations on requested-edits.png (pixel-mapped: the yellow UCL logo
  above the frame, a yellow team-name copy riding higher under the crest,
  the time repainted yellow + a yellow match-day line under it with the
  shelf date erased, a "Fix Alignment of countdown, exactly as center
  middle" note + arrow, a yellow copy of the sync caption centred on the
  card's bottom rim) + the numbered instruction list.
- 1) Wing names +4px and hugging the crest: .hero-name
  clamp(15px,3cqi,27px) -> clamp(19px,3.45cqi,31px); the .hero-team
  crest-name gap halves (clamp(10px,4.2cqi,42px) -> clamp(6px,2.1cqi,21px)).
- 2) The clock-pod time is CONSIDERABLY larger + bolder — .time-digits
  clamp(16px,3.4cqi,30px)/600 -> clamp(18px,3.95cqi,36px)/800 (the Peyda
  group override follows), glow 14px/.35 -> 16px/.4 — and the MATCH DAY
  rides directly below it in the same container: the new .time-date
  (clamp(10px,1.7cqi,15px)/700 at .85) inside .hero-time, which becomes a
  centred flex column over the FULL pod pill interior (top 33.5/54.5 ->
  33.25/51.2 = the artwork's y135–198). The state pills/score share the
  pod with the date under them.
- 3) The date shelf RETIRES as a content zone: .hero-date/.date-main/
  .date-tz + the tz label (tzLabelFa in heroCentreNode; «به وقت تهران»)
  drop — the artwork's thin cyan-lined band stays baked into the frame,
  empty. The hero tz note goes with it (the mockup shows the date only;
  the time already renders in the visitor's selected timezone).
- 4) The countdown content is EXACTLY centred in its pockets: .hud-cells
  becomes a measured 5-track GRID (28.32/6.94/29.48/6.94/28.32fr = the
  artwork's pockets x327–425/x449–551/x575–673 + dividers, on the strip
  x327–673) with the zone on the pocket INTERIORS (top 58.6/24.4 ->
  60.85/24.15 = y247–308) — every label+number stack dead-centre
  horizontally AND vertically (verified: numCx == tileCx, stackCy ==
  tileCy on all three pockets). The hud-round zone opened 8px ABOVE the
  pockets so the label breathed over the chamfer — that pulled every
  stack high; the grid fixes it.
- 5) The «تاریخ به‌روزرسانی» caption moves UPPER — onto the card's
  bottom rim: #lastSyncM margin 4px -> -8px (the caption centres on the
  frame's bottom edge per the mockup) + pointer-events:none so the
  overlap never steals card clicks.
- 6) The league block renders the competition LOGO — the owner's
  European-Leagues-WebP-Transparent-White.zip (400×400 white-transparent
  stacked lockups) extracted to /leagues/ (URL root — the repo's assets/
  dir maps to /; CL/PL/PD/SA/FL1/EL): .hero-league.has-logo +
  .league-logo clamp(64px,15cqi,150px) with margin-bottom:-4.6% — the
  logo's lower third rides ON the frame's top rim (mockup: 137px wide,
  42px overlap at the 920px canvas). Unknown codes keep the icon+title
  text block. Server mirror (markup.ts LEAGUE_LOGOS) + client
  (heroCentreNode LGL map) + 6 new immutable _headers pins.
- 7) Players +15% and NEARER the HUD: .hero-player img height
  91.77% -> 105.54%; the inward anchor tuck doubles (-16px -> -32px),
  the wrapper clip opens the same 32px inward, max-width
  calc(100% + 32px).
- 8) Stadium lights +15% brightness AND +15% opacity: .bg-lights
  opacity .799 -> .919 + filter brightness(1.15).
- Assets: public-13.51.css -> 13.52.css, public-13.37.js -> 13.38.js
  (heroCentreNode: the LGL logo branch + the .time-date under the
  digits; the .hero-date row + tzLabelFa drop), SW v56 -> v57, VERSION
  13.151-edits, package 13.151.0.0; the retired pair stays pinned per
  the retention rule; check-stats pins rewritten (zone map, digits,
  cells grid, players, lights, lastSyncM, mobile, typography group, the
  headers chain + the /leagues/ pack); admin-parity fixture re-frozen.
- Verified locally (wrangler dev --local + a mocked /api/public-matches):
  logo 137×137 at y87–224 riding the rim, digits 36px/800 + the Jalali
  date under them in the pod, all three pockets dead-centre, names 31px,
  caption straddling the card's bottom edge, lights .919/brightness(1.15),
  zero overflow at 1522 — plus the sandbox mirror at 1522/375/320/EN/
  light-theme/soon-state/long-name stress.

## [13.150-hud] — 2026-10-20 (the ONE-frame match HUD — PC-Match-hero-HUD.png)

- Owner: "Remove current HUD and it's PNG (match time, countdown and main
  hud) and replace it with this: PC-Match-hero-HUD.png … for having
  instruction to where things go see this visual reference and create
  according to it: hud-visual-reference.png."
- The previous THREE hero artworks RETIRE (all stay on disk + pinned per
  the retention rule — retired CSS still references them):
  sportsignal-hud-matches-hero.png (the wide card frame),
  sportsignal-match-time-bg.png (the kickoff chip) and
  sportsignal-countdown-bg.png (the 474×204 countdown panel) — plus the
  mobile portrait 9-slice (sportsignal-hud-matches-hero-mobile.png) and
  the whole #bigbar countdown panel markup with its head caption
  «تا بازی بزرگ بعدی» and its seconds tile.
- The whole match HUD is now ONE supplied frame:
  /ui/sportsignal-pc-match-hud.png (1000×406 RGBA — two wing panels + a
  centre column stacking a clock pod, a thin cyan-lined date shelf, THREE
  countdown pockets with baked dividers and a venue tail; the clock +
  stadium icons are BAKED INTO the artwork). The card renders the frame
  at its exact 1000:406 aspect (aspect-ratio + container-type — every
  zone's type scales with the frame via cqi) and the content is a stack
  of absolutely-positioned overlay zones MEASURED from the artwork's
  pixels (pod interiors located by alpha/color row-column profiling):
  wings x60-330/x670-940 y75-310 (crest above name, the reference's
  rhythm — crest high, name low), clock pod x430-645 y136-184 (kickoff
  digits right of the baked clock icon; the state pills + live score
  share the pod), date shelf x345-660 y209-238 (the Jalali date + tz
  note keep their home), countdown pockets x330-670 y238-307 (label
  ABOVE the number per the reference — DAYS over 03; the label rides
  cyan caps, the number big white; the .hud-cells layer is STATIC inside
  the card anchor so renderHeroSpot never rebuilds it), venue tail
  x440-620 y337-382 (the name right of the baked stadium icon — the old
  glass pill + HERO_STADIUM_SVG retire) and the league block centred
  ABOVE the frame (bottom:100% — the reference's UCL logo band).
- Contract preserved: #hcD/#hcH/#hcM keep their ids (they moved into the
  card as the .hud-cells layer), #hcS is gone (three pockets — setNum
  null-guards it), #hcSr + #bigbarTrack/#bigbarFill stay (a11y, sr-only),
  updateBigBar now hides/shows the .hud-cells layer (the retired #bigbar
  element is null-guarded), the router ships the layer hidden for
  non-upcoming heroes, renderHeroSpot/heroCentreNode/heroTeamNode emit
  the new zone structure class-for-class with the heroCardHtml server
  mirror, fitHeroNames (.hero-name) carries over, the تاریخ به‌روزرسانی
  caption still sits 4px below the card (v13.149-syncfix z-index fix
  intact) and the players still flank the card (--ss-card-w drives both).
- EN i18n unit labels d/h/m → Days/Hours/Min (the labels are prominent
  now — the reference spells them out). The .hero-role tags (میزبان/
  مهمان) retire (the reference shows crest + name only).
- Files: assets/ui/sportsignal-pc-match-hud.png (new), public-13.50.css →
  public-13.51.css (hero section rewrite), public-13.36.js →
  public-13.37.js (heroCentreNode/heroTeamNode/updateBigBar), core-13.13.js
  → core-13.14.js (the EN unit labels d/h/m spell out to Days/Hours/Min —
  they ride ABOVE the numbers in the frame's pockets), public.ts
  (template restructure), markup.ts (server mirror), router.ts (the
  non-upcoming hide targets .hud-cells), sw.js v55 → v56, VERSION
  13.150-hud.

## [13.149-syncfix] — 2026-10-20 (the تاریخ به‌روزرسانی caption was INVISIBLE — paint-order fix)

- Owner: "The font got bigger, but still dont see the text of تاریخ
  آخرین به روز رسانی. Please fix it." (the head12 font change confirmed
  live on their side; the date caption still missing)
- Root cause (pixel-verified on production): #lastSyncM is a STATIC
  (non-positioned) element, so it painted UNDERNEATH .hero-bg — the
  absolute, z-index:1 stadium-photo layer that spans the full 618px
  hero. The card, panel and players were carefully z-indexed (2/2/3)
  when the caption moved below the panel in v13.142, but the caption
  itself never got a stacking level — it has been invisible on EVERY
  viewport since. The v13.147 "verified" checks read DOM text/geometry
  (textContent/getBoundingClientRect exist even when painted under a
  photo) and VLM flip-flopped on it; a pixel sample proves it: 0 light
  pixels in the caption band with .hero-bg visible, 161 with it hidden.
- The fix: #lastSyncM gets position:relative + z-index:2 (joins the
  panel/card content layer, above the z-index:1 photo); the color is
  pinned explicitly to #E2E8F0 — the caption previously inherited the
  page body ink, which flips light→dark in light theme while the hero
  island stays dark (that would hide it again); and the size moves
  11px → 12px, matching the owner's at-least-12px floor for this area.
- Verified by pixel sampling, not just DOM: 236 light pixels in the
  caption band after the fix (was 0) at 1522px; sandbox 208 desktop /
  251 mobile; VLM reads the line below the panel on the fixed render.
- Release: public-13.49.css → 13.50.css (CSS-only, core-13.13.js and
  public-13.36.js carry over), SW v54 → v55.

## [13.148-head12] — 2026-10-20 (countdown head caption ≥12px)

- Owner: "also make this text at least 12px : تا بازی بزرگ بعدی" (with an
  annotated screenshot; the screenshot's other two asks — the
  تاریخ به روز رسانی caption in the yellow-marked area below the panel
  and the artwork PNG 20% less opacity — were already live from
  13.147-syncdate, which the pre-release screenshot predated).
- The countdown head caption «تا بازی بزرگ بعدی» moves to a FLAT 12px on
  every viewport: .count-head font-size clamp(6px,2.8cqi,7.8px) → 12px
  (the ×1.2 syncdate scaling capped it at 7.8px — under the owner's
  at-least-12px legibility floor; a flat px needs no cqi fallback split).
  The head icon scales to match — .count-head svg width
  clamp(6.6px,3cqi,9.6px) → 13px (keeps the shipped icon:text ratio
  ~1.07) — and the head gap 3.6 → 5.5px. The EN twin "Until the next
  big match" fits with room (137.5px content vs the 276px desktop
  panel); verified 12px computed at 1522/375/320px with no overflow and
  no tile collision (11.8px desktop / 4.5px mobile clearance).
- Everything else in the panel is untouched: the 276×119 / 194×84
  canvas, the .64 artwork opacity, the digits/units, and the
  تاریخ به‌روزرسانی caption 4px below.
- Release: public-13.48.css → 13.49.css (CSS-only, core-13.13.js and
  public-13.36.js carry over), SW v53 → v54.

## [13.147-syncdate] — 2026-10-20 (countdown +20%, artwork opacity −20% again, caption label تاریخ به‌روزرسانی)

- Owner: "Make it 20% bigger. also write this : تاریخ به روز رسانی ......
  so it shows the latest update of just just below the container of
  countdown. Reduce the opacity of countdown picture png by 20%."
- The countdown grows 20% on top of the compact result: --ss-countdown-w
  clamp(162px,15.5vw,230px) → clamp(194.4px,18.6vw,276px) (desktop
  230×99 → 276×119; 375px phones 162×70 → 194×84) with EVERY fixed-px
  value inside the panel scaling ×1.2 so the composition stays
  proportional — .count-num clamp(7.5px,6.6cqi,15px) →
  clamp(9px,6.6cqi,18px) (9.5px → 11.4px fallback), .count-unit
  clamp(4.25px,2.7cqi,5.75px) → clamp(5.1px,2.7cqi,6.9px) (4.5px → 5.4px),
  .count-head 5/6.5px → 6/7.8px, head icon 5.5/8px → 6.6/9.6px, tiles gap
  3 → 3.6px, tile padding 3px 1px → 3.6px 1.2px, tile gap 1.5 → 1.8px,
  chamfer 2.5 → 3px, lime tick 6×1px → 7.2×1.2px (glow 3 → 3.6px). The
  measured % geometry and the 474/204 aspect are untouched.
- The HUD artwork fades another 20%: .hero-count::before opacity .8 →
  .64 (.8 × .8 across the two rounds) — still its own layer, so only the
  artwork dims; the digits/labels keep full contrast.
- The caption below the countdown relabels to تاریخ به‌روزرسانی: … (was
  آخرین به‌روزرسانی) — the site's latest-update clock, still #lastSyncM,
  4px below the artwork canvas on all viewports. The label lives in the
  i18n lastUpd dict: core-13.12.js → core-13.13.js (rename-on-edit; FA +
  EN "Update date") + the markup.ts server fill (lastUpdatedHtml) — the
  renderSync mirror, the cached-suffix format and the PF-08 zero-height-
  change handover are untouched.
- Release: public-13.47.css → 13.48.css, core-13.12.js → core-13.13.js
  (admin + login pages follow the core rename), SW v52 → v53.

## [13.146-compact] — 2026-10-20 (countdown −50%, artwork opacity −20%)

- Owner: "reduce the size of countdown by 50%. also reduce the opacity of
  it's bg background by 20%."
- The countdown panel halves as one piece: --ss-countdown-w
  clamp(324px,31vw,460px) → clamp(162px,15.5vw,230px) (desktop 460×198 →
  230×99; 375px phones 324×139 → 162×70) and EVERY fixed-px value inside
  the panel halves with the canvas so the composition scales undistorted —
  .count-num clamp(15px,6.6cqi,30px) → clamp(7.5px,6.6cqi,15px) (19px →
  9.5px px-fallback), .count-unit clamp(8.5px,2.7cqi,11.5px) →
  clamp(4.25px,2.7cqi,5.75px) (9px → 4.5px fallback), .count-head
  10/13px → 5/6.5px, head icon 11/16px → 5.5/8px, tiles gap 6 → 3px, tile
  padding 6px 2px → 3px 1px, tile inner gap 3 → 1.5px, chamfer 5 → 2.5px,
  lime tick 12×2px → 6×1px (its glow 6 → 3px). The measured % geometry
  (13.7/15.2/29.9/33.8 glass band) and the 474/204 aspect are untouched —
  the cells stay inside the artwork's glass interior at every width, and
  the cqi values scale on their own.
- The HUD artwork backs off 20%: it moves from the .hero-count element
  background to a dedicated .hero-count::before layer at opacity .8, so
  ONLY the artwork fades — an element-level opacity would dim the digits
  and labels riding above it too (tree order keeps the content rows on
  top; pointer-events:none keeps the layer inert).
- CSS-only release (public-13.46.css → public-13.47.css, SW v51 → v52);
  #bigbar's ids/contract, the sync caption 4px below the box, and every
  other section are untouched.

## [13.145-countdown] — 2026-10-20 (countdown round: the supplied HUD artwork becomes the panel; four cells rebuilt inside it)

- Owner: "Build a Responsive Four-Cell Countdown UI Using the New HUD
  Background (countdown-bg.png, 474×204, uploaded to the repo)." The
  artwork is the visual foundation now — cyan/electric neon edges, lime
  centre notches, teal glass, outer halo preserved exactly as shipped (no
  CSS/SVG/gradient re-creation, no extra card, glow never cropped).
- .hero-count becomes the artwork canvas: aspect 474/204 exact-fit
  background (the .time-chip pattern), container queries scale the cell
  type with the artwork; --ss-countdown-w reopens 200px → clamp(324px,
  31vw, 460px) (the compact box was too small for four legible cells
  inside the artwork's interior; height derives from the aspect).
- The four cells are real UI elements in the MEASURED glass interior
  (x63..404/y60..136 → left 13.7% / right 15.2% / top 29.9% / bottom
  33.8%): deep-navy translucent pockets (skin-inset 1px cyan gradient
  outline + chamfered corners via clip-path — a plain border would lose
  the diagonals), electric-blue top glow, lime 2px top ticks echoing the
  artwork's notches, white tabular numerals clamp(15px,6.6cqi,30px),
  bright-cyan labels clamp(8.5px,2.7cqi,11.5px).
- The head row (timer + تا بازی بزرگ بعدی) floats in the artwork's top
  halo; the sync caption stays 4px below the box (sibling, all viewports).
- Template: .count-inner retires (count-head/count-tiles/hcSr/hc-track
  are direct children of #bigbar — the ids and the updateBigBar contract
  are untouched; dir=ltr keeps the shipped روز→ثانیه order, values never
  mirrored; the 24h track stays sr-only).
- CSS+template release: 13.45.css → 13.46.css, SW v50 → v51, the artwork
  pinned immutable in _headers. Verified at 320/375/430/768/1522
  (agent-browser + VLM: cells inside the glass, no overflow/clipping,
  order correct, premium look).

## [13.144-lights] — 2026-10-20 (lights round: floodlights +10% again + the sync caption "instantly after" the countdown box)

- Owner: "Increase light stadium lights opacity by 10%, it can be
  brighter. Add آخرین به‌روزرسانی instantly after this box." The quoted
  countdown DOM matched a stale tab (the cinematic round had already
  moved the caption below the box) — read as: floodlights +10% again
  (.726 -> .799) + the caption tightening to read as INSTANTLY after
  the chamfered box (gap 6px -> 4px; still a sibling of #bigbar, NOT
  part of the box, per the cinematic-round directive).
- `.hero-bg .bg-lights` opacity `.726 -> .799` (chain .35 -> .5 -> .6
  -> .66 -> .726 -> .799; screen blend, centre-transparent PNG keeps
  the HUD zone readable — VLM-verified no blowout).
- `#lastSyncM` margin `6px 0 0 -> 4px 0 0` (all viewports).
- Release: `public-13.44.css -> public-13.45.css` (rename-on-edit,
  immutable pin, 13.44 retained), `sw.js` cache `v49 -> v50`,
  `VERSION 13.144-lights`, package `13.144.0.0`.
- Rebased on top of `13.143-clubalt` (the pipeline's club-alternates round
  landed mid-flight and had taken 13.143) — re-versioned
  13.143-lights -> 13.144-lights; no clubalt file touched by this round.

## [13.143-clubalt] — 2026-10-21 (the club alternates library + transfer watch)

The owner's ask: *"gather 3-4 pictures per club and folder them in the
github, like LaLiga > Real-Madrid. Players retire, so their picture must
alternate. Players go to other clubs, so their picture must alternate …
track the transfers market and just in case that player retire/move to
another club, remove it (for that club jersey) database and use another
alternative."* Three layers ship:

### The library (assets/players/clubs/)

- **384 portraits — every big-5 club now carries a BENCH**: the published
  hero (byte-copied from uefa/) + 3 star-ranked alternates, foldered
  `<league>/<club-slug>/` (premier-league, laliga, serie-a, bundesliga,
  ligue-1) with `manifest.json` (the club jersey database: rotation order,
  per-candidate provenance + VLM style, FD team ids).
- Candidates fetched through the v2.3 contract (variant tables, studio
  keying, VLM style gate at fill; two-pass verification in the audit);
  ordered jersey_photo before bust_photo, then star score. Bundesliga
  ranking via FD.org squads (bundesliga.com has no enumeration).
- **Club binding is hero-anchored** — the madrid-derby trap (token match
  ranked Atlético's squad for Real Madrid) and FPL's short names ("Man
  Utd", "Spurs") are resolved by "the squad that CONTAINS the hero wins".
- Tools: `npm run clubs:alt` (+ `--fd-ids`, `--publish-only`,
  `--audit-gaps`), state checkpointed per candidate (survives z-ai 429
  storms mid-run; platform squad enumerations cached to disk — Serie A's
  lineup crawl runs once, ever).

### The runtime watch (src/hero-rotation.ts)

- Staggered FD.org squad checks on quiet ticks (≤5 clubs, round-robin,
  84h/club normally — 12h inside transfer windows, ≥25min between sweeps;
  shares the football-data circuit, suspends on 429). A departure opens an
  event in KV `hero_rotation_v1` with the suggested next candidate chosen
  from the club's bench BY THE LIVE SQUAD; events resolve when the player
  returns or a rotation deploy lands.
- `GET /api/hero-rotation` (admin): the departure worklist + watch state.
  `heroClubActive(env, name)`: the event-aware effective hero for
  server-side consumers. KV write discipline: ≤ ~6 writes/day normal,
  ≤ ~48/day in windows.

### The rotation (scripts/rotate-hero.js — `npm run heroes:rotate`)

Promoting a bench candidate is a LOCAL manifest promotion — no network, no
research, no VLM wait: the cached original bridges into the hero pipeline
(`normalize --player` merge-mode), the departed player's uefa/ orphan and
club-folder file are REMOVED (status "departed" + rotation_log keep the
audit), hero-clubs.json + the generated runtime index re-sync, and the
open watch event resolves on the next deploy. Wired clubs additionally
need the `--wire` step (owner-gated display decision, unchanged).

### Docs + gates

INSTRUCTIONS §14 (the library, the watch, the rotation, honest limits —
the 15 wired non-big-5 clubs have no bench yet), AGENTS.md routing rows,
RUNBOOK KV table, scrapping README. `check-hero-clubs.js` in `npm test`:
library integrity (96 clubs, ≥3 live candidates, styles, files, fd ids,
hero parity), the hero-club-alternates.ts drift gate, and unit tests for
every watch primitive (identity matching, window cadence, batch pick,
event merge). Header/_headers freshness row for `/players/clubs/*`.


---

## [13.142-cinematic] — 2026-10-20 (cinematic round: reusable player treatment, brighter floodlights + crests, sync line out of the countdown box)

The owner's asks: "(1) Make the stadium light 10% brighter. (2) Make the
club's logo 10% brighter. (3) Remove the آخرین به‌روزرسانی line from the
countdown box — it must be below, not part of it." Plus a full cinematic
treatment spec for the hero players (grading + subtle blue halo +
controlled shadow).

- **Cinematic player treatment**: both hero figures carry the reusable
  `.hero-player--cinematic` class — `brightness(.97) contrast(1.12)
  saturate(1.08)` + `drop-shadow(0 12px 22px rgba(0,8,25,.38))` (depth)
  + `drop-shadow(0 0 14px rgba(0,155,255,.14))` (a very subtle cool-blue
  halo matching the floodlights). Params centralized as
  `--ss-player-grade/shadow/halo` tokens (light theme swaps the halo for
  navy). The assets are alpha-trimmed lossless webp cutouts, so the
  shadows follow the silhouette — no rectangles; the feet-fade mask
  applies after the filter chain, so the shadows dissolve at the floor.
  Before/after VLM comparison: richer jerseys, natural skin tones,
  subtle halo, clean edges — PASS on all six criteria.
- **Floodlights +10%**: `.bg-lights` `.66 → .726` (× 1.1).
- **Crest watermarks +10% (fifth bump)**: `.bg-wm` `.240 → .264`
  (desktop) and `.244 → .268` (mobile).
- **Sync line below the box**: `#lastSyncM` moved out of `#bigbar` —
  a sibling directly below the chamfered panel on all viewports
  (`margin: 6px 0 0`); renderSync keeps mirroring `#lastSync` into
  it by id.
- Release: `public-13.43.css → public-13.44.css` (rename-on-edit,
  immutable pin, 13.43 retained), `sw.js` cache `v48 → v49`,
  `VERSION 13.142-cinematic`, package `13.142.0.0`.

## [13.141-wm] — 2026-10-20 (wm round: the hero's club-crest watermarks +10% again)

The owner's ask: "Make the hero's club logos on the bg 10% brighter
(more opacity)."

- **Crest watermarks +10% (again)**: `.bg-wm` `.218 → .240` (desktop)
  and `.222 → .244` (mobile) — both × 1.1, the fourth consecutive
  presence bump (0.18/0.16 → .198/.176 → .218/.202* → .218/.222 →
  .240/.244). The crests read clearly against the dark grade while the
  HUD text zone keeps its contrast (VLM-verified at 1522/375).
  (*mobile took an extra ×1.15 step in the hud round.)
- CSS-only release: `public-13.42.css → public-13.43.css` (rename-on-edit,
  immutable pin, 13.42 retained per the retention rule), `sw.js` cache
  `v47 → v48`, `VERSION 13.141-wm`, package `13.141.0.0`.

## [13.140-refine] — 2026-10-20 (refine round: brighter crests + floodlights, dimmer HUD frame, Peyda tournament name, sync line into the countdown panel)

The owner's five refinements: "(1) Increase the opacity of clubs logo by
10%. (2) Increase the stadium layer headlights by 10%. (3) Stick the
'آخرین به‌روزرسانی' line exactly below the count-inner block. (4) Reduce
the big HUD of matches by 10% opacity. (5) Write the match tournament
name such as لیگ قهرمانان اروپا with Peyda font, and a lighter weight."

- **Crest watermarks +10%**: `.bg-wm` `.198 → .218` (desktop) and
  `.202 → .222` (mobile) — both × 1.1, the third consecutive presence
  bump.
- **Floodlights +10%**: `.bg-lights` (screen blend) `.6 → .66` — the
  beams brighten again without washing out the HUD zone (transparent
  centre in the PNG).
- **Big match HUD −10%**: the desktop `.card-hud` frame layer
  `.74 → .666` (× 0.9) — one more step into the stadium scene; the
  mobile 9-slice veil (.5, tuned last round) is untouched.
- **Tournament name → Peyda 500**: `.league-title` (e.g. لیگ قهرمانان
  اروپا) left the Morabba heading group (`h1-h6, .hero-name` keep it) —
  `font-family: var(--font-body)` (Peyda) + `font-weight: 500`, was
  Morabba 800. A visibly lighter typographic voice against the bold
  club names.
- **Sync line into the panel**: `#lastSyncM` moved into `#bigbar`,
  right after `.count-inner` — the "آخرین به‌روزرسانی: …" line now
  sticks exactly below the countdown block inside the chamfered panel
  on ALL viewports (base-layer rule `#lastSyncM{display:block;margin:
  4px 2px 2px;…}`); the `<=899px`-only rule and the `.page-col`
  desktop copy (`#lastSync`, kept in the DOM for renderSync) are both
  retired — `.hero-sync{display:none}` everywhere.
- CSS + template release: `public-13.41.css → public-13.42.css` (JS
  carries over), `_headers` pin + retention re-file, `sw.js` CACHE
  `sportsignal-v46 → v47`.

---

## [13.139-hud] — 2026-10-20 (hud round: mobile HUD −15% opacity, mobile crest watermarks +15%)

The owner's two mobile refinements: "Reduce the opacity of Blue hud in
the mobile by 15%. Make logos more opacity in mobile like 15%."

- **Mobile blue HUD −15%**: the dark veil over the 9-slice mobile HUD
  artwork (`.hero-card::after`, the border-image fill can't take an
  opacity) rises `.40 → .50` — the frame's artwork visibility drops
  `.59 → .50` (× .85 exactly; the veil is 1 − .5015 rounded to the
  step), one step further toward the desktop's dimmed-neon look while
  every text surface stays readable (VLM legibility PASS @375).
- **Mobile crest watermarks +15%**: `.bg-wm` (mobile countdown-flank
  placement) `.176 → .202` (× 1.15) — subtly more present without
  overpowering the countdown strip; the desktop `.198` is untouched
  this round.
- Mobile-only release: desktop computed styles verified unchanged
  @1522 (veil ::after absent, wm .198, HUD layer .74); no horizontal
  overflow @375; VLM A/B/C all PASS.
- CSS-only release: `public-13.40.css → public-13.41.css` (JS carries
  over), `_headers` pin + retention re-file, `sw.js` CACHE
  `sportsignal-v45 → v46`.

---

## [13.138-polish] — 2026-10-20 (polish round: +5% players hugging the HUD, floor-dissolve melt, smoother sky, brighter lights + crests)

The owner's five refinements: "Make the logo behind player 10% more
opacity. Slightly make two players closer to the BLUE HUD. Make the
players 5% larger. Try to fade the upper part of hero better with
background, more smoothly, it's suddenly dark. Make the new stadium
lights more opacity."

- **Crest watermarks +10%**: `.bg-wm` opacity `.18 → .198` (desktop) and
  `.16 → .176` (mobile countdown-flank placement) — the club-crest
  logos behind each player gain a tenth more presence.
- **16px closer to the blue HUD**: the img anchors step 16px PAST the
  lane's inner edge (`inset-inline-end: -16px` / `inset-inline-start:
  -16px`) so both figures lean slightly ONTO the card (players z3 over
  the card z2 — 3D layering, exactly what the layer order was built
  for); the wrapper clip-path opens the same 16px inward on the
  matching physical side per direction. 16px stays inside the card's
  outer padding (~55px free in the team lanes) and the HUD artwork's
  safe-area.
- **+5% larger**: height `87.4% → 91.77%` (× 1.05 exactly). The growth
  SPLITS half up / half down (`bottom: -11.4% → -13.585%`): the head
  lifts only ~12px (measured y125 → y113 sandbox, still 27px+ clear of
  the topbar band) and the floor overhang grows only ~11px.
- **Both players really grow**: `max-width: 100% → calc(100% + 16px)` —
  the overlap allowance doubles as width budget, so a lane-clamped wide
  canvas (e.g. the 317×464 Dembélé build @1522) scales (lane+16)/lane =
  +5.07% with the height-driven builds' +5%. A pure height bump left
  clamped figures at 0% growth.
- **Floor-dissolve melt**: the mask now holds TRANSPARENT to 14.8% of
  the box (= overhang/height = 13.585/91.77 — exactly the section-floor
  line at every breakpoint) and completes at 26%: the figure
  materialises out of the floor with zero opacity at the wrapper's
  clip instead of being chopped through 0.65-0.88-opaque shins (the
  enlarge round's 0→20% ramp; VLM read that as a hard cut-off, and the
  first +5% attempt at 0.88 was worse). Measured: the shin contributes
  ≤ +12 luminance 4px above the floor, 0 at the line.
- **Smoother sky**: the top colour grade now eases from the very top
  (`.85 → .80 → .64 → .44 → .26` across 0–27%) instead of holding .85
  to 12% and dropping straight to .26 by 22% — the "suddenly dark" wall
  is retired; the darkness behind the transparent header band (0–16%)
  is preserved (≥ .62 at the bar's bottom edge, same as before).
- **Floodlights up again**: `.bg-lights` opacity `.5 → .6` (screen
  blend unchanged; .35 → .5 zoom round → .6 now).
- CSS-only release: `public-13.39.css → public-13.40.css` (JS carries
  over), `_headers` pin + retention re-file, `sw.js` CACHE
  `sportsignal-v44 → v45`.

---

## [13.137-enlarge] — 2026-10-20 (enlarge round: players +15%, growth rides downward)

The owner's follow-up on the de-zoom figures: "Enlarge the players
picture by 15%."

- **+15%**: `.hero-player img` height `76% → 87.4%` (76 × 1.15 exactly).
  Measured in the sandbox reference @1522: box height 405px → 470px
  (+15.2%). Everything else from the approved de-zoom round is preserved:
  contain (full figure, unzoomed), inner-edge anchors (0px gap to the
  card), feet-only melt (fade 20%).
- **The growth rides DOWNWARD**: `bottom: 0 → -11.4%` (a small floor
  overhang). This keeps the head at its approved height (~0.24×S from the
  section top — clear of the topbar band by ~57px @1522); a naive
  bottom-0 +15% would have pushed the head 65px higher, into the header.
  The excess below the section bottom is clipped by the wrapper's
  bottom:0 clip, and the 20% fade completes ~35px above that clip line so
  the cut never reads. Side effect: MORE of the figure shows above the
  melt — the visible window gains ~60px of torso/legs at the same head
  height.
- Wide builds still clamp at the lane width (`max-width:100%`) and land
  slightly under +15% — unzoomed (no crop) wins over exact size, same
  trade-off the owner approved in the de-zoom round.
- VLM ship-check (1522fa): A-D all PASS (figures notably larger and
  prominent, full figure visible with readable jersey, hugging the HUD
  card, heads clear of the top bar, no crop lines, no overflow).
- Housekeeping: `public-13.38.css → public-13.39.css` (CSS-only release —
  public-13.36.js carries over); `_headers` pins 13.39.css immutable and
  re-files 13.38.css under the retention rule; `sw.js` CACHE v43 → v44;
  `VERSION 13.137-enlarge`; package 13.137.0.0; check-stats pins updated
  (bottom -11.4% + height 87.4% player rule, SW v44, cssHero reads
  13.39.css); admin-parity baseline re-frozen (--update — the template's
  stylesheet href changed).

## [13.136-dezoom] — 2026-10-20 (de-zoom round: unzoomed ~30% smaller players, hugging the big blue HUD)

The owner's review of the zoom round: "They're too zoomed now, make them
30% smaller and unzoomed. also make them slightly more near the Bigger HUD
blue. the picture must continue at least until their torso."

- **Unzoomed**: `.hero-player img` returns from the full-lane **cover** box
  to natural framing — `object-fit:contain` renders the FULL figure
  head-to-feet at its natural build proportions (the alpha-trimmed canvas
  IS the figure), nothing cropped: the zoom round's heavy side-crop on
  wide builds (up to 44% of the figure's width thrown away) is gone.
- **~30% smaller**: box height `108% → 76%` (108 × 0.7). Slim builds
  render exactly 76% of the section height; wide builds render as tall as
  the lane width allows with the full figure visible (unzoomed wins over
  exact height — the box is `width:auto`, aspect-true, `max-width:100%`).
  Measured in the sandbox reference @1522: box height 575px → 405px
  (= 0.704×, on the nose).
- **Nearer the big blue HUD**: each figure anchors at its wrapper's INNER
  edge (the card's side) — `inset-inline-end:0` home / `inset-inline-start:0`
  away (the zoom round's mid-lane centred crop read as "too far from the
  card"). Measured @1522: gap figure↔card 0px both sides.
- **At least to the torso**: the figure stands ON the section floor
  (`bottom:-24% → 0`, no overhang) and only the feet melt — mask fade
  `26% → 20%` of the box (~80px): the shins dissolve into the dark floor,
  the torso and the club jersey stay fully visible. VLM ship-check
  (1522fa): A-D all PASS (full figure at natural proportions, hugging the
  card, jersey readable, no crop edges / no overlap / no cut-off heads).
- Housekeeping: `public-13.37.css → public-13.38.css` (CSS-only release —
  public-13.36.js carries over); `_headers` pins 13.38.css immutable and
  re-files 13.37.css under the retention rule; `sw.js` CACHE v42 → v43;
  `VERSION 13.136-dezoom`; package 13.136.0.0; check-stats pins updated
  (contain player rule, inner-edge anchors, fade 20%, SW v43, cssHero
  reads 13.38.css); admin-parity baseline re-frozen (--update — the
  template's stylesheet href changed).

## [13.135-zoomlight] — 2026-10-20 (zoom round: zoomed+raised players, brighter floodlights, dimmer mobile HUD)

The owner's three asks: the hero player pictures "more zoomed — 10–20cm
upper and more zoomed"; the new stadium lights' opacity increased; and the
mobile blue HUD's opacity reduced ~20%.

- **Players (the zoom)**: `.hero-player img` switches from a letterboxed
  `contain` box (78% of the section height, anchored `bottom 4%` with a 4px
  inner standoff) to a full-lane **cover** box — `width:100%;
  object-fit:cover; object-position:center top; height:108%;
  bottom:-24%` (production calibration; the sandbox reference uses -22%
  for its shorter header band). Every build now fills the lane edge-to-edge
  with uniform framing: slim builds gain ~+38% height, wide builds that
  used to letterbox at the lane width gain up to ~+75%. The head pops above
  the card top (measured live @1522: box top y89 vs card top y116) while
  staying just below the topbar band (bar bottom y92). The mask fade
  (18% → 26%) completes ~22px above the wrapper's section-bottom clip, so
  the deeper overhang melts on screen and the crop line never reads as a
  hard edge; the jersey stays fully visible. The per-side `inset-inline`
  anchors collapse to `0` — the cover crop keeps the silhouette inside the
  lane on its own, and the box can never overflow the lane (no horizontal
  overflow at any breakpoint).
- **Stadium lights**: the `.bg-lights` overlay rises `.35 → .5` (screen
  blend, cover, pointer-transparent, still inside `.hero-bg` z1 — below the
  card/players/header). The PNG's transparent centre keeps the HUD zone
  readable; the outer floodlight beams read clearly stronger.
- **Mobile blue HUD**: the 9-slice card can't take a layer opacity, so the
  dark veil over the painted frame deepens `rgba(1,9,24,.26) → .4` — the
  mobile HUD artwork's effective visibility drops `.74 → .59` (≈ the
  requested 20% reduction), matching the desktop's dimmed neon one step
  further.
- Housekeeping: `public-13.36.css → public-13.37.css` (CSS-only release —
  `public-13.36.js` carries over unchanged), `_headers` pins the new pair
  and re-files 13.36.css under the retention rule, SW cache `v41 → v42`,
  package `13.135.0.0`, `VERSION 13.135-zoomlight`, check-stats pins
  re-frozen, parity fixtures re-frozen.

## [13.134-typelight] — 2026-10-20 (type round 2: bigger club names + Peyda numerics + the stadium-lights overlay + always-dark)

The owner's six asks (2026-10-20): bigger featured club names (mobile and
especially PC); the kickoff time on Peyda at a slightly lighter weight; the
stadium-lights transparent PNG integrated as a subtle atmospheric hero
overlay (never a second stadium); the stadium name on Peyda lighter; the
countdown on Peyda lighter; and the dark/light toggle hidden temporarily —
the app stays its default dark.

- `.hero-name` (the featured club names): desktop clamp(15px,1.35vw,20px)
  → clamp(19px,2.1vw,29px) (cap +45%, "especially PC"); mobile 15px →
  17.5px. A new client-side `fitHeroNames()` (public-13.36.js) walks a name
  down in 1.5px steps (12px floor) whenever the enlarged size would need a
  third line the 2-line clamp would clip — the long-standing "2 lines max,
  shrink before anything touches" contract now survives any name length;
  it runs after every `renderHeroSpot()`, on resize, and once webfonts are
  ready. Real club names never trigger it.
- The numeric/meta surfaces move OFF the Morabba display list onto a new
  Peyda group in public-13.36.css: `.time-digits` 800→600, `.venue-pill`
  (the stadium name) 600→500, `.count-num` 800→600, `.count-label` 600→500
  — the digits read as quiet UI, not display.
- The stadium-lights overlay: the owner-supplied /stadium-lights-hero.png
  (1400×467, cyan beams near the top/outer edges, transparent centre) rides
  as the LAST child of .hero-bg — `mix-blend-mode:screen`, `opacity:.35`,
  `object-fit:cover`, pointer-transparent. It composites above the whole
  composed scene but the entire .hero-bg stays z1, below the card (z2),
  players (z3) and header (z20): the light lands in the stands at the
  outer edges and the centre behind the HUD stays dark and readable.
- The dark/light toggle is TEMPORARILY RETIRED: no #tbtn in the public
  template, the pre-paint THEME_INIT pins `var t="dark"` (stored ucl_theme
  ignored), and the bundle init calls `setTheme("dark")` (was
  `setTheme(initTheme())`). The login/admin backstage pages keep their
  toggles (operator tools, not the owner-facing app); core JS
  toggleTheme()/setTheme() stay null-guarded. The dead
  `[data-theme=dark] .tb-btns #tbtn svg` rule is removed.
- Assets: public-13.34.css→13.36.css, public-13.35.js→13.36.js (both
  rename-on-edit); /stadium-lights-hero.png pinned immutable; SW
  sportsignal-v40→v41. The retired 13.34.css/13.35.js pair stays served per
  the retention rule.

---

---

## [13.132-styleloop] — 2026-10-20 (the VLM style loop: jersey priority, card-render gate, star fallback)

(Rebased onto 13.131-playerpresence — a sibling session wired the new
player-presence hero layer from a fresh assets/players/hero/ copy set
concurrently; this entry keeps the style loop under 13.132.)

The owner's asks (2026-10-20): *"rename the pictures, using VLM, that have
FULL jersey — they're priority to be shown; a FIFA card must never stand in
for the player"* and *"if a player for any reason can't be found — for
example you couldn't find Dembélé of PSG — find another STAR of that club,
be flexible."* This release makes both rules systematic, and closes the
root cause behind the Yamal FIFA-card sighting.

### What actually happened (the war story)

The v2.2 framing refill for Lamine Yamal had drawn LaLiga's "004" squad
variant — an EA-FC-style CARD RENDER (gold shield, rating 89, badges) —
which shipped to the site ("out of nowhere, instead of Yamal a picture of
a FIFA card is showing"). The 13.129-hudframe sibling session reverted the
9 affected portraits to the initial UEFA cutoffs (owner directive) but
left manifest-heroes provenance pointing at the v2.2 league sources
(9 sha mismatches — caught by `cli.js validate`, invisible to `npm test`,
which gates manifest.json only). This session:

- **Audited all 116 published files with the vision model** (two-pass:
  fast sweep + detailed pixel-level verification of every failing verdict
  — the fast pass produced 4 false-positive "cards" among 12; 8 confirmed).
- **Replaced the 8 confirmed card renders**: 7 LaLiga clubs re-fetched
  from the "_1_" PHOTO series (Aspas/Celta, Guerra/Valencia, Mayoral/
  Getafe, Oyarzabal/Sociedad, R. Fernández/Espanyol, Vargas/Sevilla,
  Camello/Rayo) and Troyes — whose ENTIRE Ligue 1 media set is card art —
  via the new **style-exhaustion star fallback** to Iron Gomis
  (fullBodyPictures, the jersey-priority asset nobody was using).
- **Repaired the 9 stale provenance records** from the pre-v2.2 manifest
  (a75e1d5), sha-verified; `cli.js validate` passes 96/96 again.

### The system (spec v2.3 §8c — the durable rules)

- **Style tiers on every manifest entry**: `jersey_photo` (priority) >
  `bust_photo` (acceptable) > `head_photo`/`card_render` (never publish).
  `hero-clubs.json` carries the tier for the owner's wiring decisions.
- **Fill-time VLM gate** (`lib/vlm.js` in alt-fetch): every candidate
  asset is classified before acceptance — card renders and head-onlys are
  rejected and the next variant/candidate/star is tried. Degrades loudly
  (recorded warning), never blocks (`--no-vlm-gate` to disable).
- **Variant intelligence**: LaLiga photo ("_1_") series before the
  stylized ("_0_") card series; Ligue 1 fullBodyPictures before busts;
  white-studio backgrounds keyed via border-connected flood fill
  (`keyStudioBackground`, 3–92% safety envelope).
- **Star fallback** ("be flexible"): squad ranked by shirt number,
  position, FPL price/points/ownership, recent lineup presence; triggers
  when the requested player matches nothing OR when every asset of the
  matched hero fails the gate. Substitutions documented end-to-end
  (`alt_source.star_fallback` with `of`/`star`/`basis`/`reason`).
- **`npm run heroes:style-audit`**: the batch auditor (resume-aware
  across z-ai 429 storms; `--apply` records styles into both manifests;
  `--wired`/`--only` scoping) — INSTRUCTIONS §13.5 makes it a loop step.
- **`normalize --player` merge-mode**: single-club runs no longer
  truncate the manifest (the pre-v2.3 footgun); orphaned old files are
  flagged loudly. `rebuild-cache-state.js` generalizes sandbox-reset
  recovery from the CURRENT committed manifest.
- **`npm test` now enforces the display rule**: no wired portrait may be
  a card render/head-only (check-uefa-portraits.js style gates).

Published state: 96/96 hero clubs — 22 UEFA cutoffs + 74 league-official
(PL 16 / Serie A 16 / LaLiga 15 / Ligue 1 15 / Bundesliga 12); every file
VLM-classified: 84 jersey photos + 12 busts, **zero card renders**; all
33 wired portraits pass the style gate.

---

## [13.130-herogaploop] — 2026-10-19 (the hero gap loop: detect → log → agentic backfill)

(Rebased onto 13.129-hudframe — a sibling session deployed 13.129-hudframe
concurrently; this entry keeps the loop under 13.130. The registry seeded
live under the first 13.129-herogaploop deploy at 17:00:31Z and survives
in KV `hero_gaps_v1`.)

The owner's ask: whenever the app shows a team without a hero portrait,
it should try to fill it automatically — and where Cloudflare cannot do
that, log the gap so the next agentic development session can. This
release ships the loop's runtime half plus its agentic tooling.

### The two-tier split (why the runtime does not scrape)

The Worker detects, logs, prioritizes and exposes; the dev session
scrapes, processes, wires and deploys. The split is physical: the MVP
choice is curation, the portrait spec (512×512 crop/framing/fade tiers)
needs the local sharp pipeline, and display changes are owner-gated.
Serving unprocessed league busts from the runtime would regress the
v2.2 framing fix — documented in INSTRUCTIONS §13.1.

### Runtime tier

- `src/hero-coverage.ts` (GENERATED, `npm run heroes:sync`): the
  server-side mirror of the two coverage truths — the live bundle's
  `HERO_ART` (what renders) and `hero-clubs.json` (the 96-club library).
  Drift-gated by the new `check-hero-coverage.js` in `npm test`.
- `src/hero-gaps.ts` + a `cron-public.ts` hook (gated `!budgetHard &&
  subrequestCount() < 42`, fail-silent): every tick scans its in-memory
  pool — live/upcoming rows (7-day window) and the featured hero match —
  for teams without wired artwork, and merges into KV `hero_gaps_v1`
  with a strict write discipline: one write per new gap team + one daily
  bump per team (seen_days / hero_picks count distinct UTC days),
  resolution marks when a portrait lands (7-day retention), 30-day
  unseen prunes, a 300-team cap. Typical added burn ~1 write/day.
- `GET /api/hero-gaps` (admin-gated, `?reset=1` to clear): the
  prioritized report — hero-pick frequency first, each gap annotated
  library-ready (portrait exists, needs WIRING not scraping) or
  no-portrait, with a suggested league platform per competition mix.
- Tail visibility: `🖼️ herogap: new team(s) without artwork: …` warns
  on first sight.

### Agentic tooling (the fill side, INSTRUCTIONS §13)

- `npm run heroes:report` (`scripts/hero-gap-report.js`): pulls the live
  worklist, prints it prioritized, caches it for the orchestrator.
- `npm run backfill-heroes` (`scripts/backfill-hero-gaps.js`): `--plan`
  (per-gap §2/§2b execution plans), `--add --club … --player …` (roster
  edit + stale-state purge + the discover→fetch→normalize→validate
  chain), `--alt <key>` (the league-platform path), `--wire <key>`
  (creates the next versioned bundle with the HERO_ART entry + moves the
  public.ts/_headers/SW pins), `--sync` (coverage regen + gate). The
  genuinely agentic gates — MVP curation, kit-timing (§8), framing QA,
  fade-tier scan, the owner's display decision — stay explicit.

### What the loop found at launch

78 published big-5 library portraits are not wired into the site's
HERO_ART map (33 teams render artwork today) — a wiring backlog gated
on the owner's display decision (README §4), now visible as
library-ready gaps the moment those clubs surface in fixtures.


---

## [13.133-persiantype] — 2026-10-20 (the Persian typography design system + the mobile HUD round)

(Rebased onto 13.132-styleloop — a sibling session's VLM style loop took the
13.132 number; this release renumbered 13.132 → 13.133. No file overlap: the
style loop ships portrait pipeline + runtime modules, this release renames
the css/js pair and ships the font pack.)

The owner supplied a font pack ("Fonts for farsi.zip", now extracted and
retired from the repo) and a DEDICATED mobile HUD artwork, plus a mobile
layout round. The site's whole typographic voice moves from Vazirmatn to
the two-family system the owner specified.

### The typography system (Morabba + Peyda)

- **Morabba** — every heading and display text: h1–h6 (all section cards),
  the hero league title, team names, the kickoff digits, the countdown
  digits and its head label. Shipped as ONE variable font —
  `/fonts/MorabbaVF.woff2`, wght 250–900 (fvar-verified), 38 KB — so every
  heading weight rides a single request.
- **Peyda** — every regular text: body, descriptions, forms, inputs,
  buttons, navigation, tables, labels, chips, meta lines. Static weights
  400/500/600/700/800/900 (FaNum editions — Persian digits are the default
  figures; usWeightClass verified per file before converting), ~29 KB each
  after a lossless fonttools TTF→WOFF2 conversion.
- Registration lives in `FONT_FACES_STYLE` (src/pages/styles-shared.ts) —
  inlined by all three page templates (public/login/admin) with
  `font-display:swap`; assignment lives at the tail of public-13.34.css
  (`--font-heading` / `--font-body` tokens; body=Peyda, the display
  selector list=Morabba). The body font stack drops Vazirmatn; the
  Vazirmatn woff2 files stay on disk only so retired stylesheet
  generations keep rendering for stale caches (the retention rule).
- Persian-safe line-heights retuned on the elements that moved to Morabba
  (league-title 1.2→1.35, hero-name 1.35→1.45, count-num 1→1.2,
  time-digits 1→1.15 — no clipped ascenders/descenders).
- Preloads follow the stack: Peyda-Regular + Peyda-ExtraBold + MorabbaVF.
- Total above-fold font weight is LOWER than the Vazirmatn set it replaces
  (209 KB vs 255 KB — the variable Morabba file covers eight weights).

### The mobile HUD + layout round (all <900px)

- **Dedicated mobile HUD artwork**: the card now renders
  `/ui/sportsignal-hud-matches-hero-mobile.png` (portrait-native
  500×719) as a 9-slice (rim bands measured from the artwork: 66/69/59/65
  source px; border widths 33/35/29/33) instead of downscaling the desktop
  PNG's rim.
- **Logo/HUD clearance**: card margin-top 44→100px — the frame used to
  start ABOVE the header logo's bottom edge (collided at 375px: card y36
  vs logo bottom y75); it now clears by ~17px.
- **No dead band before the first section**: herowrap padding-bottom
  64→0 and the "آخرین به‌روزرسانی" line rides INSIDE the hero —
  #lastSyncM, a tiny (11px) flush caption right under the countdown;
  renderSync (public-13.35.js) mirrors #lastSync into it on every path.
  The .page-col copy retires below 900px. Gap from the hero block to the
  دیدارهای جذاب لیگ‌ها heading: 131px → ~25px.
- **Crest watermarks return on mobile**: the two club-crest roundels
  (opacity .16, blur 1.2px) flank the countdown strip at the hero's foot,
  clipped at the section edge exactly like the desktop's bottom:-80px
  crop (the card spans the full phone width, so the desktop side
  placement would hide them).
- The time artwork shrinks with the viewport on narrow phones
  (min(242px, 100vw−118px)) so the chip always fits the new frame.

### Plumbing

- public-13.33.css→13.34.css + public-13.34.js→13.35.js (rename-on-edit);
  _headers pins the new pair + the mobile HUD PNG immutable (retention:
  13.33.css/13.34.js stay served through one 900s edge window); sw.js
  CACHE v39→v40; check-scheduler/check-stats pins updated; parity
  baselines re-frozen; design-system MASTER.md Typography section
  rewritten; the hero-coverage bundle pointer follows the JS rename.
- `Fonts for farsi.zip` deleted from the repo root after extraction and
  verification (the woff2 assets + provenance comments carry forward).

## [13.131-playerpresence] — 2026-10-20 (player presence + HUD dimming + compact countdown)

(Rides on top of 13.130-herogaploop — the sibling session's hero gap loop;
renumbered from 13.130 to avoid the collision. The two releases share no
browser assets: the gap loop ships runtime modules only, this one renames
the css/js pair.)

The owner's seven-point round on the live hero: the top UCL players must
show their UEFA cutoff portraits WITH the jersey clearly visible (e.g.
Yamal), the big blue neon HUD background was too bright, the bell pill
goes, the players double in size, the mobile time artwork was too tight,
the countdown panel compacts by at least 60%, and the mobile card order
becomes [league] [club logos] [time] [date] [stadium].

### The changes

- **Player presence (jersey + size)**: `HERO_ART` now serves
  **alpha-trimmed** canvases from the new `/players/hero/` directory
  (bbox-crops of the manifest-pinned `/players/uefa/` originals — same
  players, same initial-UEFA bytes, no reframing): the 512×512 canvases
  wasted up to half of the narrow player lane on transparent margins, so
  even a "tall" img box rendered a small figure. With the trim + the new
  sizing (height 63% → **78%**, bottom 12% → **4%**, bottom mask fade
  36% → **18%**), the rendered figures are ~2.2–2.5× the previous area,
  the club jersey reads clearly, and the head still clears the
  SportSignal logo band (card margin-top 100 → 118px, section floor
  padding 14 → 34px).
- **HUD dimming**: the `.card-hud` layer renders at **opacity .74** (the
  stadium scene bleeds through the deep-navy interior — the neon frame
  sits IN the scene instead of on top of it); the mobile 9-slice card
  gets an equivalent dark veil (`.hero-card::after`) since border-image
  fill can't take an opacity.
- **Bell pill retired**: the `#heroBell` anchor + CSS + the
  reduced-transparency selector entry are gone; `heroPills()` already
  null-guards (no JS contract change beyond the asset bump).
- **Compact countdown**: `--ss-countdown-w` 480 → **200px**, panel
  chamfer 18 → 12px, padding 12×16 → 7×10, gaps 8/10/4 → 5/6/3, digits
  24 → 19px, units 11 → 9.5px, head label 13 → 11.5px — the panel
  footprint drops ~66% (484×108 → 212×84) with the tick contract
  (`updateBigBar`, `#hcS.tick`) untouched.
- **Mobile time artwork**: `--ss-time-w` 210 → **242px** under 900px
  (the 500:202 aspect derives the height — the digits get their
  breathing room back).
- **Mobile order**: explicit grid rows put the club crests row directly
  under the league title (league → logos → time → date → stadium); the
  desktop -26px team lift is zeroed on mobile so the logos don't ride
  over the league row.

### Plumbing

- `public-13.32.css → public-13.33.css`, `public-13.33.js →
  public-13.34.js` (rename-on-edit rule); `_headers` pins the new pair
  + `/players/hero/*` (retention rule keeps the retired pair served);
  `sw.js` CACHE v38 → v39; `config.ts`/`package.json` → 13.131.0.0;
  `check-stats.js` pins rewritten for the new contracts; parity
  baseline re-frozen.

---

## [13.129-hudframe] — 2026-10-19 (the HUD match card + UEFA portrait revert)

The owner supplied `sportsignal-hud-matches-hero.png` (1000×325 RGBA —
angular beveled neon-blue/cyan frame, deep-navy interior, exterior glow
baked into the canvas' transparent margins) and directed: replace the
central match card's rectangular glass background with this futuristic
HUD artwork, retire the static corner carousel pill, give the player
figures more breathing room under the SportSignal logo (asked twice),
and clip the club-crest watermarks at the container edge. All verified
in the sandbox port first, then ported here.

### The changes

1. **The HUD frame replaces the glass card**: `a.hero-card` keeps its
   position/content contract but drops the radius/border/backdrop/
   shadow (they would fight the PNG's own chrome). The artwork rides as
   an absolute `img.card-hud` layer (pointer-events:none) behind the
   content, placed in the template INSIDE the card anchor BEFORE
   `#heroSpot` so the client-side `renderHeroSpot` rebuild (which only
   rewrites `#heroSpot`'s innerHTML) never removes it. Content sits
   above via z-index; safe-area padding (`--ss-hud-pad-x/y`) keeps every
   text/crest/timer off the frame's rim, bevels and side circuitry.
   Nothing clips the exterior glow.
2. **Aspect floor**: `--ss-card-w: min(58.5%,900px)` →
   `min(900px, max(760px, 58.5%))` — below 760px wide the card's content
   height stretched the 1000:325 artwork past ~25% (a 585px-wide card
   @1000 measured 56% vertical stretch = visibly broken); the floor
   keeps the fill-fit ≤ ~20% at every desktop width.
3. **Mobile 9-slice**: ≤899px the stacked card (aspect ~0.8) switches
   from the full-artwork layer to CSS `border-image` 9-slice rendering
   (slices 85/110/80/100, widths 24/31/22/28 — uniform ~0.28 scale):
   corners stay undistorted, straight edges stretch invisibly, `fill`
   paints the navy interior; `.card-hud` turns off there.
4. **Player/logo breathing room (asked twice)**: `.hero-player img`
   `82%/bottom 11%` → `63%/bottom 12%`; the card drops to `margin-top:
   100px` and gains `box-sizing:border-box` (this site has NO global
   border-box — without it the HUD padding rendered outside the width
   var and the card came out 96px wider than the player lanes, which
   size from the same var). The figures ride fully below the taller
   production header band (94px: body padding 24 + bar 68) — head ≈46px
   clear of the logo bottom @1522 (measured); the head-pop above the
   card is retired in favour of the clearance. ≤1019px the figures
   retire entirely (the 760px card floor leaves <130px flanks —
   thumbnail-sized figures).
5. **Watermarks clip at the container edge**: `.hero-bg` gains
   `overflow:hidden` — the 420px crest watermarks (`bottom:-80px`) and
   the swoosh overhangs end AT the section bounds, never spilling past
   the container (the owner's report). The HUD card's glow lives on a
   sibling layer above and is unaffected.
6. **The static corner carousel pill is RETIRED** (owner directive —
   the hero shows ONE featured match): markup + CSS removed;
   `heroPills()` in public-13.33.js null-guards the missing node (no JS
   bump needed). Only the bell pill remains.
7. **UEFA portraits — the initial cutoffs restored**: v2.2's
   framing-fix had replaced 9 of the 36-roster official UEFA cutoff
   portraits with league-platform photos (owner: "USE official webp uefa
   pictures… you've changed the yamal and dembele picture — use the
   previous ones, the initial uefa scraped one"). Reverted to the
   initial 44e9906 versions: ousmane-dembele, lamine-yamal, antony,
   bruno-fernandes, bukayo-saka, christoph-baumgartner, erling-haaland,
   georges-mikautadze, lautaro-martinez. The other 24 roster portraits
   were never touched.

### Plumbing

- `public-13.32.css` (renamed from 13.31 + the changes above; retired
  pair stays served per the retention rule); JS stays `public-13.33.js`.
- `_headers` pins `/public-13.32.css` + `/ui/sportsignal-hud-matches-hero.png`
  immutable; `sw.js` CACHE v37 → v38; `config.ts`/`package.json` →
  `13.129.0.0` "13.129-hudframe"; check-stats pins rewritten for the new
  contract (HUD card layer, aspect floor, 9-slice mobile, carousel
  retirement, watermark clip, template chain, portrait revert).

---

## [13.128-layoutrefine] — 2026-10-19 (the owner's six reported layout fixes)

The owner reported six problems against the live site (reference mockup
47.png, RTL/fa). All six are fixed in this release; the same fixes were
first verified against the reference in the sandbox port of the homepage.

### The six fixes

1. **Match-time artwork slightly enlarged** (`--ss-time-w`
   `clamp(196px,15.3vw,233px)` → `clamp(210px,16.4vw,250px)`, +7.3%): the
   digits were too tight inside the supplied artwork's borders. The card's
   centre lane widens `minmax(240px,…)` → `minmax(252px,…)` so the wider
   chip keeps its track. The artwork still renders at its exact 500:202
   aspect (undistorted), digits unchanged at 38px.
2. **Player figures clear of the logo**: `.hero-player img` shrinks
   `104.5%` → `82%` of the section and lifts off the bottom
   (`bottom: 0` → `11%`) — the 47.png geometry (figure ends above the
   section bottom, head well clear of the header logo/nav).
3. **Nothing outside the viewport anymore**: the `width:100vw +
   margin-inline:calc(50% - 50vw)` breakout trick is RETIRED. On
   classic-scrollbar browsers 100vw is wider than the visible area, and
   inside the ≥1440px body grid the percentage margins resolved against
   the 1400px track — the live header band rendered 44px shifted with the
   moon/EN/gear pill out of the viewport (measured). `<body>` is now the
   full-width page shell (no max-width, no horizontal padding); the
   content column constraint (760px / 1400px) moved to `.page-col` (the
   new wrapper around everything below the hero) and the footer;
   `html{overflow-x:clip}` + `body{overflow-x:clip}`.
4. **The reference two-column layout**: `[side bar | most important games
   of leagues + the containers below it]`, tables in the side bar. The
   wide layout engine (setWide) now relocates the cards INSIDE `.page-col`
   and the grid is placed EXPLICITLY — `#wideMain` (topspot/uclspot/week/
   finished — the important games + containers) in the wide inline-START
   column (right in fa), `#wideSide` (live/ucl/standings/cups/stats — the
   tables) in the narrow inline-END rail (left in fa). Previously grid
   auto-placement dropped #wideMain into the narrow 440-500px track (the
   owner's "the main container has moved to side bar"). Threshold drops
   1440px → 1080px so laptops get the reference layout; the grid is gated
   by a `.wide` class the JS toggles with the relocation (no-JS clients
   keep the clean single column; the old code put unrelocated cards into
   the body grid).
5. **میزبان / میهمان (hero-role)**: regular text in a softer color —
   `font-weight 700 → 500`, `color var(--ss-aqua) → var(--ss-text-muted)`
   (#9FD8EC soft blue-grey), `13px → 12.5px`.
6. **No player figures on mobile**: ≤899px now hides `.hero-player`
   entirely (the old scaled-down corner players broke the stacked mobile
   layout; the sandbox port verified the stacked composition without
   them).

### Plumbing

- `public-13.30.css → public-13.31.css`, `public-13.32.js →
  public-13.33.js` (the .page-col wrapper + setWide host/threshold; the
  retired pair stays pinned in `_headers` through one 900s edge-HTML
  window per the retention rule).
- `src/pages/public.ts`: `<div class="page-col">` wraps the sync line +
  all nine cards inside `#main`; CSS/JS version refs bumped.
  `src/seo/page-shell.ts`: CSS ref bumped.
- `assets/sw.js`: cache `sportsignal-v36` → `v37` (evicts the old CSS/JS
  on install).
- `scripts/check-stats.js`: the herolook pins rewritten for the new rules
  + new v13.128 pins (page shell, .page-col.wide grid, setWide contract).
- Parity baselines re-frozen (check-admin-parity --update) for the
  intentional public-page HTML change.

---

## [13.127-matchtimeart] — 2026-10-19 (the supplied kickoff-time artwork)

The owner supplied the official kickoff-time panel artwork
(`sportsignal-match-time-bg.png`, 500×202, chamfered octagon with cyan
glowing borders and a transparent halo) and asked for it to replace the
CSS-drawn chip behind the live kickoff time — the artwork preserved exactly
as shipped, no regeneration, no competing CSS glow.

### The chip

- **Artwork**: served at `/ui/sportsignal-match-time-bg.png` (assets/ui/),
  rendered as the chip background at the artwork's exact 500:202 aspect —
  `background-size: 100% 100%` is an undistorted fit by construction. The
  width keeps the herolook measurement (233px @1522, clamped to ≥196px on
  narrow viewports); the height now derives from the artwork itself.
- **Layering preserved**: the clock icon and the kickoff digits stay real
  HTML elements above the artwork (same `time-glow > time-chip >
  time-fill > svg + .time-digits` contract the renderer already emits —
  no JS change). Content is centred in the artwork's usable interior
  (its glowing borders + chamfered corners measure x 53–444 of 500 → 11%
  side padding; the interior's vertical centre sits at 49.5%).
- **Glow hygiene**: the CSS-drawn cyan rim, gradient fill, hexagon
  clip-path, drop-shadow and the 3s `chip-pulse` animation are RETIRED —
  the artwork ships its own glow; nothing competes with it.
- **Scope**: the artwork backs the kickoff time only. LIVE / FINISHED /
  POSTPONED keep their glass state pills; the countdown panel, date row
  and venue pill are untouched. Works in both themes (the hero island is
  dark in both) and both directions (fa/RTL + en/LTR), verified at
  1522/1445 + 375 stacked.

### Plumbing

- `public-13.29.css → public-13.30.css` (rename-on-edit rule; homepage +
  SEO page-shell updated). `_headers` pins 13.30 immutable + the artwork
  immutable; 13.29 stays served through one 900s edge-HTML window.
- `sw.js` cache `sportsignal-v35 → v36` (cache-first assets can't refresh
  in place). `VERSION 13.127-matchtimeart`, package.json `13.127.0.0`,
  check-stats pins rewritten for the new asset/chip contract.

---

## [13.126-herolook] — 2026-10-19 (the desired-look hero)

The owner shipped a reference mockup (`desired-look.jpg`, 1522×463 fa/dark)
and asked for the featured-match hero to match it. The design was built and
verified in a sandbox port first (1522/1445/375 × fa/en × dark/light), then
ported back into the Worker stack class-for-class.

### The hero (visual layer only — every state, string and datum preserved)

- **Scene**: the old video stage is RETIRED. A full-bleed graded night photo
  (the existing `/hero-poster.jpg` + CSS grade/vignette/scrim + swooshes)
  now runs behind the whole section; the transparent header floats over it
  (the header band is part of the dark hero island in BOTH themes — the
  light theme only turns the page below the hero).
- **Card**: a centred glass card (`a.hero-card`, ≈58.5% × ~280px @1522) with
  the 3-lane grid [team | centre stack | team]: league chip + title, the
  chamfered time chip (cyan rim, `#124693→#02266D` fill, 38px tabular
  digits, clock icon), the date line (Jalali, matching the client
  `fmtHeroDate`) + tz label, and the venue pill.
- **Countdown**: moved BELOW the card as a chamfered cyan→aqua panel with
  four tiles; the label lost its lightning glyph (a timer icon rides the
  head row, green). The `#bigbar` contract is intact — `updateBigBar` drives
  the same ids every second; the 24h progress track stays in the DOM as a
  polite sr-only progressbar (no visible bar in the reference).
- **Players**: the UEFA portraits now ride as section-level `.hero-player`
  zones flanking the card — heads pop above the card top, bodies cross its
  side edges (3D, clip-pathed per physical side), figures graded
  (`brightness .88 / contrast 1.08`) and bottom-faded into the scene. One
  CSS rule covers all 34 portraits (they share a uniform 460px alpha band
  in their 512² canvases — measured; `height:104.5%` reproduces the
  reference figure height exactly).
- **Pills**: a static carousel (inline-start, decorative) + the bell
  ("see upcoming matches" → `#topspotCard`, new I18N key `seeUpcoming`).
- **Header**: no Telegram CTA in the header (per the reference) — the join
  link lives on in `#tgFab` / `#joinSticky` / footer. Vector gear/moon/sun
  icons (the dark-mode moon is gold `#F6C513`); `setTheme` renders SVGs now.
  The sync line moved under the hero (P1.3); `#lastSync` wiring unchanged.

### States kept, restyled

LIVE (dot pill + score + minute/est), FINISHED, POSTPONED/CANCEL,
started→"به‌زودی" — all render through the new `heroCentreNode` (client) and
`heroCardHtml` (server mirror, class-for-class; Jalali date so server and
client agree byte-for-byte).

### Dropped (visual layer only, documented)

The video stage, the amber/red urgency ladder (`data-urgent` is still set
by `updateBigBar` — nothing consumes it now), and the visible progress
track. `fitHeroNames`/`heroVideoKick` retired with their layers (the
2-line clamp CSS and the poster image cover them).

### Assets + plumbing

`public-13.29.css` (tokens inlined once + the hero block; the old
Stadium-Pulse hero CSS removed), `public-13.32.js`, `core-13.12.js`
(barNext sans bolt, +seeUpcoming, SVG theme toggle). SW v34→v35;
CORE_URLS drops `/hero-stage.mp4` (~645KB saved per install; the file stays
served for stale-HTML clients). `_headers`: 13.32/13.29/core-13.12 pinned
immutable; the retired trio stays pinned through one 900s edge-HTML window.
`check-stats.js` hero pins rewritten for the new contracts; baselines
re-frozen (`check-admin-parity --update`).

## [13.125-stickeroutbox] — 2026-10-19 (recovered tables arrived without their stickers — the outbox learns to carry a logo)

### The incident (the digest's second life, live evidence from `wrangler tail`)

After v13.124's chunked fan-out was deployed, the owner verified with a
test normal user account: "I've received the briefings and tables … but
app didn't send stickers for each table like [la liga sticker][la liga
weekly table]". The tail log (479 invocations, 22:25→01:30 UTC) holds
the exact sequence:

- 22:00 UTC — the digest bootstrapped under the PRE-v13.124 deployment
  (the fix landed 36 minutes later, at 22:36). The old live loop's
  mid-roster death outboxed the tail chats' table TEXTS.
- **23:10:16 UTC — `📩 Outbox drained: 10 sent, 0 dead, 0 pending`** —
  those texts were delivered to the tail chats as BARE tables. The
  outbox could not carry the logo: `outboxPush` had no sticker field,
  `drainOutbox` is text-only by construction, and `sendSticker`'s
  failures were "decorative" — silently dropped, never queued, never
  retried. That 23:10 drain is exactly what the owner saw on the test
  account (checked between the two deliveries).
- 00:00:30 UTC (quota reset) — the remediation seeded the weekly cursor
  with the 8 unserved chats; the chunked fan-out then delivered the FULL
  digest (7 tables + week-ahead, `stickers=5`, zero failures per tick)
  completing at 01:30 UTC.

Net: every path that recovers a table through the outbox strips its
sticker. The same gap would resurface on ANY future transient failure
(budget wall, 429 pause, KV quota window) — the text recovers, the
flourish never does.

### The fix — the pair travels as ONE unit

1. `outboxPush(env, text, chatId, keyboard?, sticker?)` — entries may
   carry an optional `sticker`. Backwards-compatible: pre-13.125 entries
   have no field and drain text-only, exactly as before. The put's old
   `.catch(() => {})` is gone — a 10048 quota-death now returns `false`
   so the caller can tell a queued pair from a lost one.
2. `drainOutbox` — an entry that still carries a sticker attempts the
   logo FIRST (fresh invocation budget), in the owner's
   `[laliga sticker][laliga table]` order. A sticker that lands is
   CLEARED from the item before any requeue decision — a retry can
   never duplicate the logo. A sticker that fails again never blocks
   the table behind it (the payload rule); two failed attempts across
   two paths (burst + drain) is where the flourish yields.
3. `serveWeeklyBurst` + `sendLeagueTables` (the /tables command path) —
   a transiently failed sticker now defers the WHOLE `[sticker][table]`
   pair to the outbox instead of sending the bare text; if the outbox
   itself is down (quota-death class) the code falls back to the bare
   direct send — the table is the payload, the sticker the flourish.

Verified by the new `scripts/check-sticker-outbox.js` harness (pair
outboxing, drain ordering, sticker-clearing on requeue, dead-chat skip,
legacy text-only entries) alongside the full `npm test` chain.

---
## [13.124-weeklyfanout] — 2026-10-19 (the weekly digest reached only the admin — the chunked fan-out)

### The incident (live, this Monday's 01:30 Tehran digest)

The owner reported: only the admin chat received the weekly briefing +
league tables (with stickers); the other users got nothing. Root cause
confirmed against the live system (KV state + `wrangler tail` during the
following ticks) — THREE compounding failures:

1. **The fan-out cannot fit one invocation.** 10 registered chats × ~12
   sends each (5 stickers + 6-7 tables + week-ahead) ≈ 120 subrequests
   against a cron invocation's ~50-subrequest ceiling (fetches + KV ops
   — the same accounting `fanoutReservation` has used since v13.94). The
   sequential loop died mid-roster after the first ~2 chats; the tail
   chats' sends were pushed to the outbox. This is the EXACT disease the
   notify engine was cured of in v13.94 — but the reservation treatment
   was never applied to the weekly digest.
2. **The outbox recovery storm blew the KV write quota.** ~84 outbox
   pushes are KV puts; the account's 1000/day limit (error 10048 —
   "KV put() limit exceeded for the day", caught live in the tail) died
   MID-LOOP, and every subsequent push was silently swallowed by its
   `.catch(() => {})`. Nothing was queued; nothing retried.
3. **The write-first week marker had already consumed the week** (the
   v13.37 anti-spam doctrine), so the lost users had no retry path.
   Permanent silent loss for 8 of 10 users.

### The fix — the v13.94 discipline, applied to the weekly digest

- **Payload snapshot** (`weekly_tables_payload_v1`, TTL 8d): the digest
  renders ONCE per week — standings fetched a single time, per-language
  table texts + week-ahead + sticker file_ids stored in KV. Continuation
  ticks read the snapshot (zero standings fetches; a per-isolate memo
  bridges KV-write outages without re-fetching).
- **Budget-checked bursts** (`WEEKLY_FANOUT_CAP: 44` true subrequests,
  worst-case burst cost projected per chat): a chat's burst only starts
  when it fits the remaining budget — never a mid-flight death where the
  tail chats lose everything. ~1-2 chats per 10-min tick.
- **The resumable cursor** (`weekly_tables_cursor_v1`: `{week, ts,
  pending: {fa, en}}`): persisted remove-before-send (the marker's
  never-spam precedence — an unrecorded serve is never attempted). The
  digest completes across ticks and may finish past the 06:00 window
  edge (a cursor is valid 12h; the window only gates STARTING).
- **Quota-death self-heal**: when the cursor put fails (the 10048
  window), the burst is restored and the digest pauses for the tick —
  no sends without persisted state, no outbox storm. It resumes when
  writes return.
- **The admin manual send-tables** now ENQUEUES the chunked digest
  (cursor + payload) instead of firing the whole fan-out inside one
  invocation; the response reports queued/served/pending honestly.
- `/tables` (single chat, ~13 sends in a fresh webhook isolate) is
  unchanged — `sendLeagueTables` remains its primitive.
- Remediation for the incident week: the cursor was seeded for the 8
  unserved chats after the quota reset (00:00 UTC), and the cron
  drained the digest to every user.

### Harness

`check-weekly-tables.js` grew the F-section: chunked multi-tick
delivery with exact per-chat send counts, cursor persistence +
completion deletion, the reservation deferral, the quota-death
fail-closed pause + recovery drain, marker-only vs full bootstrap
failures, stale-cursor dropping, out-of-window completion, the manual
enqueue (sync + deferred), English-group rendering, payload
rebuild/memo, and the empty-roster guard. `check-reliability.js` pins
the new write-first shape + the reservation + the fail-closed pause.

---

## [13.123-fadepill] — 2026-10-19 (the jersey crossfade + the compact countdown pill — owner asks on the bb.jpg mockup)

### What changed — three hero refinements from the owner's annotated mockup

The owner's `bb.jpg` reference (annotated with a yellow-rectangle area
estimate) drove three changes: a softer premium bottom fade on the player
figures, a fix for the "stray" read on bright-shorts portraits, and a
compact centered countdown.

- **The bottom crossfade (owner ask 1: "fade the ending of the jersey so
  they crossfade to the card — premium feel")**: the v13.122 linear 16%
  mask ramp read as a hard-cut sticker edge (VLM review: "floating torso
  effect… lazy crop"). The default mask is now a longer EASED ramp
  (`0 → .34@7% → .7@15% → 1@26%` up from the box bottom,
  `public-13.26.css → public-13.27.css`) — bright kit melts through its
  last ~60px into the stage floor instead of popping off.
- **The stray-portrait fix (owner ask 2: "yamal is not correctly
  positioned and seems stray")**: root cause measured, not guessed — an
  alpha/luminance scan of all 34 portraits found the figures' opaque
  pixels uniformly end at 94.7% of the box, but Yamal's bright WHITE
  SHORTS end at ~89% with only dark legs below: under the old ramp his
  last bright pixels rendered at ~70% mask strength and cut off mid-card
  (a 106-lum step), leaving ~50px of empty card under a floating torso.
  Portraits now carry an optional `fade` tier (`public-13.30.js →
  public-13.31.js`: `heroArt()` renders it as `data-fade`, removed again
  on hide so re-renders never leak a stale tier):
  - `fade:"hi"` (Yamal): the shorts fade out over their OWN height
    (`0 → .06@5% → .16@11% → .8@17% → 1@27%` — top of the shorts at
    80% strength, mid at ~48%, their bottom edge at 16%: a ≤20-lum step)
    so the white dims away before the portrait's own edge; the dark legs
    below stay invisible to the floor. (First cut shipped `.18/.38/.72`
    stops; the live VLM + pixel review measured a still-visible ‑64-lum
    edge at the shorts' hem — retuned same-day in `public-13.28.css`.)
  - `fade:"deep"` (Šimić — bright kit ends ~70%, everything below
    near-invisible against the dark stage): the ramp completes by 40% up
    so the visible torso sinks into shadow instead of cropping at the
    shirt hem.
  - Everyone else (31 of 33, incl. Baumgartner's mild 75-lum step at
    93%, already dissolved by the default ramp) ships the default tier.
- **The compact countdown pill (owner ask 3: "compact the countdown to
  the area estimated in the yellow rectangle")**: measured against the
  mockup — the yellow rect is a centered band at 45.1% of the card width
  in the card's bottom band (rel-y .71–.93), exactly where the strip
  already rides. The v13.120 full-width strip (920px at the ≥1440 tier =
  66% of the card) is now a **content-fit centered pill** (~420px, well
  inside the estimate) on ≥901px: `align-self:center; width:auto;
  border-radius:999px`, label + units centered with a tight gap; the 3px
  final-24h progress track keeps riding the pill's bottom edge. ≤640px
  keeps the stacked mobile composition; 641–900px keeps the legacy
  full-width row.

### Release wiring

`public-13.30.js → public-13.31.js`, `public-13.26.css → public-13.27.css
→ public-13.28.css` (same-day hi-tier retune); every retired file stays
pinned one more TTL-window (the v13.121 ops note); SW cache
`v32 → v33 → v34`; `_headers` pins 13.31/13.28; `check-stats` pins flipped and
extended (fade-tier pins: CSS hi/deep ramps, the two keyed HERO_ART
entries, the data-fade render/remove contract, the pill block);
`check-scheduler` cache-bust pin 13.31; baselines re-frozen;
`assets/hero/players/README.md` §2 documents the tier contract + how to
scan a new portrait before assigning one.

---

## [13.122-heroart] — 2026-10-19 (the breakout flanks — per the owner's reference mockup: much larger figures in front of the card, heads slightly above its top edge for a 3D look)

### What changed — the figures break out of the card

The hero artwork geometry was retuned to the owner's reference mockup
(uploaded 2026-10-19, `369.jpg`): the flanks go from small inset images to
**full-height figures riding in front of the card, heads popping slightly
above its top edge** — the 3D breakout look.

- **The layer moved out of the card**: `.hero-art` was a child of
  `.card.bighero`, whose `overflow:hidden` clipped everything to the
  rounded rect — the breakout is impossible from inside. It now rides as
  the LAST child of `.herowrap` (DOM-after the card), painted at
  `z-index:2`: in front of the card shell/fx/hud, still below the `z:3`
  data surface (crest/name/panel text always reads). `public-13.29.js →
  public-13.30.js`: `heroArt()`'s layer query resolves the card scope
  first, then falls back to `.herowrap .hero-art` (the moved layer).
- **Full-height figures** (`public-13.25.css → public-13.26.css`):
  `height:112%` of the card on 901–1439px, `122%` at ≥1440px (was 66%
  with a 340px cap — the figures grow ~86% linearly, ~3.4× in area),
  bottom anchored at the card's bottom edge, 1% inset from the outer
  edges, drop-shadow retuned. The 512-square portraits carry 5% top
  headroom, so each head pops ~16% of the card height above its top edge
  (measured 52px on the 327px card at 1920; the mockup's own pop is
  10–14% — same "slightly out" read).
- **Grid-item margin trap fixed**: at ≥1440px the body grid makes
  `.herowrap` an independent formatting context, so the card's own 14px
  margins were contained INSIDE the wrapper — the artwork layer
  (`inset:0`) spanned the card's MARGIN box and hung 14px below the card.
  `.herowrap>.card.bighero{margin:0}` — the wrapper's box now IS the
  card's box at every breakpoint.
- **Breakout clearance**: `.herowrap` gains `margin-top:46px` on ≥901px —
  the stock 14px gap put the home-side head straight through the sync
  line (RTL: the home figure rises where the stamp text starts); the
  mockup keeps clear air between the stamp and the heads (8px measured).
- **Bottom fade retuned**: mask over the first 16% of the box. The
  portraits' opaque pixels end at 94.5%, so the v13.121 15%-of-214px ramp
  and an initial 8% attempt both landed mostly inside that built-in
  transparent margin, leaving the figure's own waist cutoff floating
  ~22px above the card floor; 16% of the 398px flank puts the visible
  dissolve right at the card's bottom edge (matches the mockup's crisp
  cut at the floor).
- Hidden ≤900px, never mirrored, pointer-transparent, zero CLS
  (absolute; measured 0 on mapped/unmapped/single states) — unchanged.

### Verification

Full suite exit 0 (1950 OK, portraits gate 37/37, tsc clean);
`seo:check --local` 56/0. Browser-verified on the seeded dev fixture
(Barcelona–Bayern, both sides mapped): 1920/1440/1024 dark fa-RTL, light
fa + light en-LTR (logical insets flip the flanks with the language);
heads 52px above the card top at 1920, 39px at 1024 (112% tier);
clearance to the sync line 8px @1920 / 71px @1024; ≤900px hidden
(860px: `display:none`); unmapped = crest-only with no blank slot, no
broken img; single-side renders one figure; CLS 0; no console errors.
VLM design review: strong match to the mockup (bottom treatment
side-by-side: same hard-cut-at-the-floor read; head pop + in-front
layering confirmed on zoomed crops).

### Asset renames (the v13.39 rule) + the 404 window closed

`public-13.29.js → 13.30.js`, `public-13.25.css → 13.26.css`; SW CACHE
`v31 → v32` (one-shot evict). **The old files stay served + immutable-pinned
in `_headers`** — the v13.121 ops note documented the ~10-minute post-deploy
window where `caches.default` (SEO_PAGE_TTL 900s) serves old HTML
referencing renamed-away assets (404); keeping `13.29.js`/`13.25.css` on
disk closes it (old HTML → old assets → old-but-working look; new HTML →
new assets).

## [13.121-portraits] — 2026-10-18 (the hero artwork wired to the official UEFA cutoff portraits — 33 real player photos flank the featured match; the artwork contract reconciled to what actually exists)

### What changed — the hero now shows the players

The hero's artwork layer (`.hero-art`, shipped empty + tested in v13.120-hero)
is wired to the **official UEFA cutoff portrait collection** that landed in
`44e9906`: 34 lossless WebP portraits with alpha, 512×512, one representative
player per club, served from `/players/uefa/` (provenance:
`assets/players/uefa/manifest.json`).

- **`HERO_ART` is filled** in `assets/public-13.29.js`: 33 entries keyed by
  the EXACT football-data.org provider team names (verified live against the
  FD API — the cross-competition legal spellings: `"Paris Saint-Germain FC"`,
  `"Club Atlético de Madrid"`, `"FC Internazionale Milano"`, `"PAE AEK"`,
  `"Racing Club de Lens"`, `"ŠK Slovan Bratislava"`, `"FK Bodø/Glimt"`, …);
  FD is the first-priority pool source, so followed-club rows carry these
  spellings; `faName` stays the `heroArtFor` fallback.
- Entries are `{src, alt}` with `alt:""` (decorative, `aria-hidden`); the
  `poseId` catalog concept is DROPPED (meaningless for real photographs).
- Deferred players' teams are absent by design (owner decision 2026-10-18,
  records in the manifest): Nicolas Jackson (Aston Villa) + Florian Thauvin
  (Lens) — UEFA publishes no transparent cutout for either; re-check
  mid-season (`cli.js fetch --refresh` + normalize + validate).
- **Kit verification (owner rule: no kit mismatch allowed)** — all 34
  portraits visually audited against their club's 2026/27 kit (crest,
  manufacturer, sponsor, colours; kit archives cross-checked). Result:
  **exactly one kit mismatch** — Ueda (`Lille OSC` key) still photographed
  in his Feyenoord kit (30–31 Aug 2026 transfer confirmed) → **excluded**;
  Lille keeps the crest-only fallback until UEFA reshots him. The Šporar
  warning was a **false alarm**: his portrait is a genuine Slovan Bratislava
  kit (royal blue, adidas, `niké je tipovanie`, double-cross crest —
  Olimpija wear green/white Puma) → kept; the manifest + identity-evidence
  records corrected 2026-10-18.
- **Flank sizing retuned for square sources**: the 82%-height rule was tuned
  for the retired 2:3 generated-PNG contract; at 1:1 that width crowded the
  outer zones. Now `height:66%; max-height:340px` plus a soft bottom fade
  (`mask-image`, first 15% of the box — the figure dissolves into the stage
  instead of ending in a hard crop line), public-13.25.css — verified
  visually at 1920/1440/1024. Kept unchanged: hidden ≤900px, never
  mirrored, behind the z:3 data surface, zero CLS (the layer reserves
  nothing — an unmapped team keeps the crest-only look, no blank slots).

### The contract reconciliation (docs)

- `assets/hero/players/README.md` rewritten to the REAL contract (the
  1024×1536 generated-PNG pose-library contract is explicitly retired —
  no such images were ever created): source = the UEFA collection,
  512×512 square webp, manifest provenance, FD-name keying, the empty
  mapping as a designed fallback state.
- `docs/assets/uefa-player-portraits.md` §7 unchanged: redistribution
  permission is NOT established — the owner's go/no-go on the public hero
  display is recorded in the session worklog/handoff.

### The engineering (rename-on-edit rule)

- `assets/public-13.28.js → public-13.29.js` — the `HERO_ART` mapping +
  header comment; `heroArtFor`/`heroArt` untouched (the v13.120-hero
  integration point, as designed).
- `assets/public-13.24.css → public-13.25.css` — the `.hero-art img` square
  retune only.
- `src/pages/public.ts` — asset refs 13.29/13.25 + the two hero comments
  (bighero header, artwork slot) updated off the "FUTURE phase" wording;
  baselines re-frozen via `check-admin-parity.js --update`.
- `src/seo/page-shell.ts` (CSS ref + two comments), `src/seo/router.ts` +
  `src/seo/markup.ts` (comment refs) — same rename choreography.
- `assets/_headers` — 13.29/13.25 immutable pins; NEW `/players/uefa/*`
  policy: `max-age=86400` (not immutable — the pipeline may re-shoot a
  portrait under the same filename mid-season).
- `assets/sw.js` CACHE v30 → v31; `package.json` 13.121.0.0 +
  `src/config.ts` `13.121-portraits`.
- `scripts/check-stats.js` — the `HERO_ART ships EMPTY` pin FLIPPED to the
  real-mapping pin set (every src resolves on disk, 33 entries, FD-name
  keys incl. the non-ASCII legal spellings, `alt:""`, poseId dropped,
  deferred teams absent, the kit-mismatch team excluded + the Šporar
  keep verified); the README pin now asserts
  the real contract; the square-retune CSS pin added.
  `scripts/check-scheduler.js` — pubJs path.
- `package-lock.json` brought back in sync (the portraits session bumped
  `sharp` in package.json without regenerating the lock — fresh clones'
  `npm ci` failed; fixed by `npm install`).

## [13.120-hero] — 2026-10-18 (the Stadium Pulse + Match Protocol homepage hero — a cinematic, responsive, two-theme redesign of the featured-match card, per the approved sportsignal-hero-spec)

### What changed — the user-facing redesign

The homepage hero (the featured-match card at the very top) was rebuilt as
**Stadium Pulse + Match Protocol**: a broadcast-style three-zone card —
home team (crest + name + «میزبان» role) | a strong blue kickoff panel
(large tabular-digit time, localized date, tz label) | away team — over the
cinematic video stage, with a four-unit digital countdown strip
(روز/ساعت/دقیقه/ثانیه) under it and restrained cyan HUD chrome (corner
brackets + top light line).

- **Mobile is a real second composition** (≤640px): teams side-by-side in
  two columns, the kickoff panel full-width beneath, the countdown as a
  compact four-unit grid, watermarks/embers/HUD hidden, everything from
  320px up with zero horizontal overflow.
- **Light mode has its own identity**: icy `#DCEBFA` card base over a
  frosted video overlay, navy ink, an accessible dark green
  (`#0A8F55`) for the countdown digits (the neon `#48EF9B` stays
  dark-theme-only), while the blue kickoff panel stays strong in both.
- **Countdown hygiene** (the spec's rules, enforced): digits-only updates
  each second (no card pulse/reflow — the seconds value alone gets a
  340ms micro-tick), clamped zeros + «به‌زودی» when the local clock passes
  kickoff (never negative, never a fabricated LIVE), the strip hidden for
  live/finished/postponed/cancelled matches, and a polite sr-only
  summary refreshed only when the remaining MINUTE changes.
- **States**: upcoming (time + date + countdown), live (chip + score +
  minute/estimated minute), finished (chip + score), postponed/cancelled
  (chip only, countdown hidden) — all driven by the SAME payload
  (`barTarget()` pick untouched).
- **Player artwork is prepared, not faked**: a `.hero-art` layer + the
  `HERO_ART` name→{src,alt,poseId} lookup ship EMPTY; the layer renders
  only when a mapping resolves (never below 900px, never mirrored), and
  `assets/hero/players/README.md` documents the future 1024×1536
  transparent-PNG contract + pose library. NO images were generated.

### The engineering (rename-on-edit rule, all four assets)

- `assets/public-13.27.js → public-13.28.js` — `renderHeroSpot()` rebuilt
  (heroTeamNode/heroMidNode builders + `heroArt()`), `updateBigBar()`
  rewritten for the four-unit strip (HERO_PRIMED keeps the server-rendered
  hero visible until real payload data arrives — no flash-hide during
  load), `fitHeroNames()` retargeted to `.hero-name`.
- `assets/public-13.23.css → public-13.24.css` — 109 legacy hero rules
  dropped; the new token-driven section (`--hero-*`, dark + light) added.
- `assets/core-13.10.js → core-13.11.js` — five new i18n keys
  (heroHome/heroAway/heroKickoff/stPostp/stCancel, fa + en).
- `src/pages/public.ts` — the hero markup region (artwork slot, HUD layer,
  countdown strip with `__SEO_HC*__` placeholders) + the featured-hero
  inline CSS (blue/green Stadium-Pulse lighting; the LIST
  `.match-featured` green treatment is untouched).
- `src/seo/` — `markup.ts` gains `heroCardHtml()` (the server mirror of
  the client builders, class-for-class), `router.ts` serves it into
  `__SEO_HERO__` and fills the server-side countdown digits from the
  payload epoch (upcoming only; the strip ships hidden otherwise),
  `utils.ts` gains `faHeroDate()` (weekday + day + month — the exact
  client `fmtHeroDate` shape), `page-shell.ts` bumps the CSS ref.
- `assets/_headers` (three immutable pins), `assets/sw.js`
  (CACHE v29 → v30), `package.json` + `src/config.ts` (13.120.0.0 /
  13.120-hero), `check-stats.js`/`check-scheduler.js` pins updated for the
  intended design, page baselines re-frozen via
  `check-admin-parity.js --update` (the documented intended-change path).

## [13.119-hbfix] — 2026-10-18 (the owner's two punctuation asks: the 6h heartbeat sentence rewritten verbatim, and the «نسخه آزمایشی» trial footer now ends with a period — a MarkdownV2 minefield defused at the sender layer)

The owner's report, verbatim:

> ربات سالم است — تمام سیستم های اعلان-رسانی فعال استن.
> نسخه آزمایشی
>
> it must be:
> ربات سالم است. تمام سیستم های اعلان رسانی فعال است.
> نسخه آزمایشی.

### Fix 1 — the heartbeat sentence (three faults in one line)

`src/cron-users.ts` had shipped the 6h admin heartbeat with an em-dash
standing in for a full stop, a hyphen welded into the اعلان‌رسانی compound,
and the استن typo (a stray ن on the verb است). The line is now the owner's
verbatim target — «ربات سالم است. تمام سیستم های اعلان رسانی فعال است.» —
with the bold headline kept and the period moved OUTSIDE the MarkdownV2
entity (`*…*\.`, parse-safe by construction). Five new source-level harness
checks pin the corrected sentence in AND the three old faults OUT
(`#hbfix*` in check-reliability).

### Fix 2 — the trial footer's period (the harder half)

`TRIAL_FOOTER` gains its trailing period — and a period is a **MarkdownV2
reserved character**: appended raw, Telegram rejects the WHOLE message with
`can't parse entities` (the v13.104-admfix lesson — one unescaped character
kills the entire send). The fix lives at the ONE choke point every message
already flows through:

- `withTrialFooter(text, cap?, md?)` — the `md` flag selects the append
  form: the three MarkdownV2 paths (`sendTelegram`, `sendTelegramDirect`,
  `editMessageText` — all hardcoded `parse_mode: "MarkdownV2"`) append
  `escapeMarkdownCharacters(f)` so the period rides as `\.`; the plain-text
  caption paths (`sendAnimation`'s GIF banner, a `parseMode`-less
  `sendPhotoBinary` caption) append the raw display string — no visible
  backslash in banners. `sendPhotoBinary` passes its own `parseMode`
  parameter as the flag.
- The fail-open ceiling is now computed against the APPENDED form
  (`app.length`) — the escaped footer is one backslash longer, and the
  4096/1024 boundaries stay exact rather than off-by-one.
- The idempotency guard now matches the marker **with or without its
  trailing period**: the period-less form is a prefix of the raw footer, of
  the escaped footer (the backslash sits after it), and — the migration
  case — of every outbox entry queued by a pre-13.119 deploy (whose footer
  had no period yet). The drain can never double the footer across the
  deploy boundary.
- The heartbeat's composed payload, exactly as Telegram receives it:
  `✅ *ربات سالم است*\. تمام سیستم های اعلان رسانی فعال است\.` + newline +
  `نسخه آزمایشی\.` — rendering verbatim as the owner's two lines.

The `#trialfoot` harness block grew with the behavior: md-path escaping,
escaped-form idempotency, the pre-13.119 outbox migration case, and the
md-aware 4096 boundary (±1 char) — 10 static + 18 unit checks where there
were 6 + 13. No other surface changed: composers stay footer-free, stickers
and dice still carry no text, the kill switch still works, and every other
bot message simply gains a period on its last line.

### Not touched (deliberately)

The /status card's short verdict («🟢 سالم»), all digest/notification copy,
and the site's Persian strings — the owner's ask was these two lines only.
Version triplet 13.119-hbfix; additive change (one config string +period,
one function signature +param, call sites) — `npx wrangler rollback` is the
whole recovery story.

---

## [13.118-fixsched] — 2026-10-18 (the fixture-aware scheduler: the backend now works when football justifies it, and sleeps when it doesn't — plus the 4 AM stale-live screenshot bug, fixed at four layers)

The owner's report, verbatim: *"in 4 am, it's stale cache, still shows matchs
are being played (which are finished 6-7 hours ago)"* — with a screenshot of
the site showing Barcelona–Betis 4-1 at 67' LIVE, Ajax–Utrecht and
Bayern–Heidenheim in the "matches in progress" panel, hours after they ended.

### The forensics — one root cause, two symptoms

The backend's activity was **decoupled from the actual fixture calendar**:

- **The workload half.** The full 3-provider sweep ran every 2h
  (`QUIET_SWEEP_MS`) around the clock — international breaks included —
  because `sweepFresh` had no notion of "is there even a relevant fixture
  soon?". Worse: `isActiveTime` returned true for ANY pool row with a live
  status, so a provider that never confirmed FT (the sportscore day-window
  rolls at UTC midnight for EL/ECL/cups/PGL; provider outages leave `IN_PLAY`
  behind) kept the live sweep running **24/7** for a match that ended hours
  ago — the stuck row was both the quota burn AND the bug's engine.
- **The display half.** The pool kept the stale `IN_PLAY` row; the live
  overlay (6h TTL, ±6h write window) re-patched it into every served payload
  — including over FRESHER pool data (the overlay always won); and nothing
  (`pubMatch`, the `upcoming` filter, the hero pick, the client's `estLive`)
  ever compared the row's kickoff against the clock. `estLive` capped only
  the *estimated* minute; a row with a server-supplied minute (67') rendered
  as live forever.

### The scheduler (`src/scheduler.ts` NEW — pure, harness-grabbable)

`computeFixtureSignal` + `decideActivity` turn the consolidated tier
(`shouldReport` — the important-match definition, UNCHANGED) into the mode
set the task specified: **IDLE / UPCOMING / PRE_MATCH / LIVE / POST_MATCH /
DEGRADED**, each with a work policy:

| Mode | Trigger (fixture-first) | Full sweep | Live sweep | pollHint |
| :--- | :--- | :--- | :--- | :--- |
| LIVE | plausible live (ko within 195min) **or** kickoff-passed-but-unconfirmed (the Mode-D fixture fallback) | 2h | every tick | 60s |
| POST_MATCH | FINISHED < 195min, or unconfirmed finish within the 45min grace | 2h | every tick | 90s |
| PRE_MATCH | ko within 60min (`ACTIVE_WINDOW_AHEAD_MS`) | 2h | every tick | 60s |
| UPCOMING soon | ko within 6h | 2h | ~20min slots | 120s |
| UPCOMING far | ko within 48h | 2h | none | 300s |
| IDLE | nothing within 48h + trusted feed | **6h discovery** | none | **900s** |
| DEGRADED | feed-fail marker (`feed_fail_v1`, 12h TTL) | 2h in / 4h out of the Baku window | slots in-window | 120s/300s |

**Zombies** (live status, ko > 195+45min past) never re-arm sweeps — the
24/7 runaway killer. **A failed sweep is never an empty schedule**:
`fetchMatchesFromAPI`'s all-sources-empty path writes `feed_fail_v1`
(a successful non-empty sweep deletes it) → DEGRADED rides the Baku fallback
window (13:00–02:00 Asia/Baku — UTC+4 fixed, pure-arithmetic per the
v13.116-tzproof doctrine and the spec pack now in
`docs/spec-pack/european-football-time-coverage-spec-pack/`). Real fixtures
always override the window (a valid 09:00-Baku kickoff processes normally);
European DST shifts the UTC instant, never the arithmetic.

### The stale-live guards — four independent layers

1. `fetchPublicMatches` reconciles the pool (`reconcileStaleLive`) BEFORE
   every consumer shapes it — the `upcoming` filter, hero pick, topSpot,
   cups, UCL card and week lists all see converged statuses.
2. `pubMatch` serves stale-live rows as FINISHED — minute nulled, scorers
   dropped, **last-known score kept** (the state-preservation rule).
3. `applyLiveOverlay` sanitizes every served payload (fresh KV / stale SWR /
   7-day snapshot) AND heals the overlay's own stale rows — the pre-fix blob
   can no longer re-animate a finished match over fresher data.
4. `cacheMatches` persists the downgrade after the confirmation grace
   (span+grace = 240min); the overlay WRITE (`cron-public.ts`) heals rows at
   the source. ET/pens (~150min of football) never trip the 195min span.

### The polling split (backend vs frontend)

The payload now carries `pollHint` + `schedMode`; `assets/public-13.27.js`
(cache-bust from 13.26) swaps the fixed `setInterval(load,6e4)` for a 5s
master tick that fetches at the backend's cadence — a quiet-day tab drops
1440 polls/day → ~96 — plus a client-side twin of the stale-live guard. The
SWR refresh lock + 60s edge cache (the dedup layer) are untouched.

### Observability

`/healthz` gains `sched_mode/reason/live_sweep/poll_hint_sec/live_now/
stale_live/feed_ok/next_ko/next_wake` (zero extra KV reads — the verdict
rides `cron_status_v1.sched`); every mode TRANSITION logs `🔄 Scheduler:
A → B (reason) — next kickoff …`; the reconcile guards log when they act.

### Harness

`scripts/check-scheduler.js` NEW (~110 checks — static wiring + behavioral
with deterministic clocks): the task's 16 required scenarios — IDLE, next-
activation, pre-match arm, live enablement, simultaneous matches (ONE
decision), confirmed-FT stop, ET-no-premature-deactivation, reschedule/
postponement recalculation, failure≠empty, DST (CET vs CEST instants),
Baku year-round, midnight-wrap boundaries, out-of-window fixtures still
processed, restart determinism, request dedup, IDLE-keeps-site-alive — plus
the screenshot bug at every guard layer and the CONFIG-literal pairing
guards. The overlay fixtures in check-no-miss/live-derby moved to
now-relative kickoffs (the old fixed past dates now legitimately trip the
sanitize pass — the tests would otherwise pin the BUG). `check-stats.js` +
the baseline follow the 13.27 asset rename. Suite **1907 green** (was 1796);
tsc clean; local smoke: healthz fields + `pollHint: 900, schedMode: IDLE`
served over HTTP. Version triplet 13.118-fixsched.

## [13.117-kickoff] — 2026-10-17 (the two simultaneous-kickoff reports: «مسابقه شروع شد» + same-minute delivery)

The owner's report, verbatim: *"Two match starting at 20 Pm, one is mentioned
7:57. one 8.03 why the should been notified at 8 both. When match starts the
text must show مسابقه شروع شد with a nice emoji."*

### The forensics (D1 ground truth for the reported evening)

The 2026-10-17 20:00 Tehran pair — Real Betis–Barcelona and Bayern–Leipzig,
both `2026-10-17T16:30Z` kickoffs — produced exactly the reported asymmetry:

- **Betis–Barcelona**: match-start fired at **20:00:36 Tehran** (kickoff
  +36s) with the full treatment — ⚽ dice, card photo, caption. This is the
  "at 8" behavior the owner expects.
- **Bayern–Leipzig**: match-start fired at **20:10:25 Tehran** (kickoff
  **+10.4 minutes**) and landed **lean** — text-only, no dice, no card. The
  20:00 tick's fan-out reservation (v13.94, correct under the free plan's
  ~50-subrequests-per-invocation wall) had consumed the budget on the first
  match's fan-out and deferred the second match's unit cleanly to the NEXT
  10-minute tick, where only lean mode fit. Nothing was lost — but the
  second match's "match started" arrived 10 minutes late and degraded.
- The evening also lost every `pre-match-1h` reminder (the 18:30–19:15
  window ticks deferred under the same pressure and never recovered) —
  the drain below recovers that class too.

### Fix 1 — «⚽️ مسابقه شروع شد» (the explicit ask)

`formatMatchStartMessage` now opens with a bold headline mirroring the FT
message's `🏁 *نتیجه نهایی*` shape: **`⚽️ *مسابقه شروع شد*`** (fa) /
**`⚽️ *The match has started*`** (en), blank line, then the existing
📅/⏰/🚀 body untouched. The ⚽ rides the same theme as the animated ⚽ dice
the engine sends immediately before the text (ball rolls → match started).
`mdBold` builds the span, so the headline is MarkdownV2-safe by
construction. Surfaces that compose through the same formatter (the
per-chat match-start, the big-match kickoff broadcast, the per-chat repair
leg, late backfills) all inherit it.

### Fix 2 — the deferred-fan-out drain chain (same-minute delivery)

Two simultaneous full fan-outs (~20 subrequests each + tick overhead)
mathematically cannot fit one invocation's ~50-subrequest ceiling — so a
deferred unit used to wait for the next cron tick. Now it doesn't:

- **The transport discovery (probed live with a throwaway worker before
  this design shipped):** a plain `fetch()` from a Worker to its OWN
  workers.dev origin is REFUSED by Cloudflare with **error 1042
  ("recursive fetch", 404)** — the naive self-chain is impossible. The
  working mechanism is the **self-referencing SERVICE BINDING**
  (`wrangler.toml [[services]] binding="DRAIN_SELF" service="ucl-notifier"`):
  a direct `env.DRAIN_SELF.fetch()` invocation of this same worker that
  bypasses the public edge. The probe also proved the budget semantics that
  make the whole fix work: an outer invocation that burned **45**
  subrequests chained a bound invocation that completed **12 more** — the
  bound invocation has its OWN fresh ~50-subrequest budget (a shared
  budget would have refused them).
- **`src/kickoff-drain.ts` (NEW)** — `runKickoffDrain` re-runs the deferred
  `(match, type)` units through the REAL `sendNotificationIfNeeded` gates
  (window re-checked → expired units no-op; write-first dedupe → races
  impossible; the reservation against fresh counters) against the KV pool,
  after `applySettings` so the audience is the LIVE desired-team list.
  `handleKickoffDrainRoute` guards `POST /api/kickoff-drain`
  (WEBHOOK_SECRET-token, pre-admin-gate — the caller is the worker itself).
  `chainKickoffDrain` performs the binding invocation (stub URL
  `https://drain.internal/api/kickoff-drain` — the path is what routes;
  the hostname is irrelevant to a binding call).
- **The chain**: `executeScheduledLogic` now returns the tick's deferred
  units (`notifySummary.du` — drainUnitPriority-sorted, capped at
  `KICKOFF_DRAIN_MAX_UNITS=10`); api.ts's scheduled handler hands them to
  `chainKickoffDrain` via `ctx.waitUntil` — ONE binding invocation, a NEW
  request context with a FRESH subrequest budget, so the deferred unit's
  full dice+card+text fan-out lands **~40-60s after kickoff — same-minute
  as the first match**. A drain that defers again (3+ simultaneous
  kickoffs) chains once more, bounded by `KICKOFF_DRAIN_MAX_DEPTH=2`.
- **Fail-open by construction**: any chain failure (binding missing — e.g.
  local dev, non-200, network) logs and returns null — the units keep the
  old next-tick retry path. Dead chats are reported, never pruned (the
  sweep stays the single registry mutator). Quota-neutral on the happy path
  (the drain's writes are D1 — dedupe + delivery ledger; zero new KV
  writes; one extra invocation only on ticks that actually deferred).

### Fix 3 — imminence-first sweep ordering

`sendMatchNotifications` now sorts by `kickoffUrgency` before the legacy
big/competition/kickoff keys: a match inside its match-start window ([-1,
+45min]) processes before everything else, the 5min window next, the
near-hour band after. The 20:00-pair failure mode (a less-urgent unit
burning the budget in front of a just-kicked-off match) is structurally
gone; `drainUnitPriority` applies the same criticality to the drain
payload's ordering.

### Harness

- **`scripts/check-kickoff.js` (NEW, 66 checks)**: static wiring (route
  pre-gate, scheduled chain, cron return, du payload, ordering, caps,
  token guard, fail-open, no-prune contract, config trio, the verbatim
  headline source) + behavioral — the REAL `kickoffUrgency` bucket table,
  `drainUnitPriority` incl. the HH:MM-colon split, `runKickoffDrain`
  (happy/ghost/ordering/noPool/empty/re-deferral), the route (403 paths,
  400, depth clamps, unit cap, non-string drops), `chainKickoffDrain`
  (self-fetch shape, depth bound, empty guard, fail-open shapes), the
  route's re-chain at depth+1 + the stop at MAX_DEPTH, and the headline on
  the real formatter (fa+en).
- check-composers: +6 (the exact first-line headline fa/en, the body
  preserved); check-mdstyle: the match-start surface's date-first
  assertion moved to the date-below-headline form (every other surface
  keeps date-first); worker-src concat order +kickoff-drain.ts.
- Suite ALL green; tsc clean; version triplet 13.117-kickoff.

### Session close — 2026-10-17 (the wrap-up audit, re-run from a clean clone)

The day's close, re-verified from a FRESH CLONE after the development
sandbox was reset (the local tree was lost; every claim below was
re-checked against GitHub `225cd21` + the LIVE worker, not memory):

- **Deploy parity confirmed**: the LIVE worker's script (fetched through
  the Cloudflare API, 3.75MB module bundle) carries
  `VERSION = "13.117-kickoff"` with the kickoff-drain module wired in —
  the deployed code IS the repo HEAD. Worker `modified_on`
  2026-10-17T17:42:57Z, seconds after the push of `225cd21`
  (17:42:50Z). Both public origins answer (`ucl-notifier.
  sportsignal.workers.dev`, `football.sportsignal.ir`); healthz answers
  with the admin-auth challenge (as designed).
- **Suite re-run from the clean clone**: `tsc --noEmit` clean; all 34
  check scripts green — **1796 OK checks**, exactly the number pinned in
  the 13.117-kickoff commit message. Nothing drifted between the last
  session's green run and the pushed tree.
- **The session's two authorized streams — both shipped earlier in the
  day, re-confirmed closed**:
  - *Stream A (quota posture)*: v13.111-quotaslim — the response to the
    two Cloudflare free-tier alert emails (KV daily-write quota at the
    50% warning line; Workers CPU 24h over-limit at 1000+ occurrences):
    pool blob 617KB→~331KB, text-scan healthz/admin, the 60s edge cache
    on `/api/public-matches`, write-only-on-change coronation snapshots,
    and the honest web-side write meter (kv-webmeter → kv_writes_web_v1,
    cron+web combined). The KV daily quota reset at 2026-10-17 00:00
    UTC — the slimmed write path is the posture carrying forward from
    that reset.
  - *Stream B (curation)*: v13.113-nightgate — the A-League left the bot
    (`BOT_SILENT_LEAGUES: ["AL"]`; website lists/standings/SEO
    untouched), خلاصه شب now gates on a UCL night OR ≥1 desired-team
    match that evening (valuable-night gate), and cup eliminations stay
    always-covered.
- Docs-only close (the v13.110-digitfold session-close precedent): no
  code change, version triplet untouched; the accompanying
  `wrangler deploy` re-ships the byte-identical 13.117-kickoff bundle so
  the deployment of record is pinned to the pushed commit.

---

## [13.116-tzproof] — 2026-10-17 (the timezone picker's three bugs: one root cause on Cloudflare's mixed edge fleet)

The owner's report, verbatim: *"There are some bugs, for example منطقه
زمانی it must write منطقه زمانی (ایران) but it's written تهران; also when
clicked it does nothing like confirmed; also the hour is wrong for example
real time is 10 am it shows 11 am."*

### The root cause: some Cloudflare edge colos render time-only Intl formats wrong

Reproduced live with a throwaway probe worker: one colo returned
`Asia/Tehran` hour+minute formats as **raw UTC** (−3:30) and `Asia/Dubai`
as its **pre-1912 LMT-era offset** (+3:49 instead of +4) — while
date-bearing formats (dateStyle/timeStyle, y/m/d fields) and the
`timeZoneName: "shortOffset"` format rendered **correctly on the very same
colo**. The fleet is mixed: requests (webhooks included) land on good or
broken colos at random. Three user-visible symptoms, one cause:

- **The wrong hour** — every wall-clock rendered via a time-only Intl
  format (the picker's button/status/confirm times, match times in the
  morning/weekly digests, the match cards' and /next's
  getJalaliTime/getEnglishTime) was at the mercy of the serving colo.
- **The dead button** — `resolveTimeZone` validated zones with a
  **fields-less** `Intl.DateTimeFormat` constructor — the same broken
  class. On a bad colo it failed, the tap fell into the "unknown
  timezone" branch, the message re-rendered the SAME status (no save, no
  confirm view). Forensics: the owner's D1 `user_prefs.updated_at` never
  moved that morning.
- The label complaint was cosmetic (fixed too).

### The fix: wall clocks by arithmetic, offsets from verified sources

- **`tzOffsetMinutes(tz)`** (utils.ts, NEW): the zone's offset in minutes
  — Layer 1 parses the `shortOffset` zone-name format (verified correct
  even on broken colos), Layer 2 is the v13.96.1 date-bearing fields
  diff; both pass a sanity gate (multiple of 15 min, |off| ≤ 14h — a
  UTC-for-Tehran or LMT-era render is rejected, never displayed). Probed
  at **now**, never the epoch (Nepal was +5:30 until 1986 — the harness's
  Kathmandu pin caught the epoch-probe draft). 10-min per-tz memo.
- **`zonedYmDHm` / `zonedHm`** (utils.ts, NEW): wall-clock parts and
  "HH:mm" by pure arithmetic (`now + offset` → `getUTCHours`). Every
  rewrites site: `tzLocalTime` (picker times), `getJalaliTime` /
  `getEnglishTime` (cards + /next), `getNowTehran` (arithmetic-first,
  contract preserved), the morning digest's 9am gate AND per-line times,
  the week-ahead weekday+time (static weekday tables now), digest-night's
  `tzOffsetMs` (routed through the layered probe) and its date header.
  A row without its time beats a row with a wrong time — fail-open `""`.
- **`resolveTimeZone`** (users.ts): validates through the offset probe;
  the fields-less constructor is demoted to last-resort fallback — **the
  dead-button fix**.
- **The label**: the quick-pick reads **«🇮🇷 منطقه زمانی (ایران)»**
  ("Timezone (Iran)") — the zone is the country, not the city; the reset
  follows («ریست (پیش‌فرض: ایران)» / "Reset (Iran default)").
- The picker's time and its offset label now come from the SAME parsed
  offset — they can never disagree (the broken colo rendered a UTC hour
  next to a "+3:30" label).

### Verification

Suite green (+~25 tzproof checks: the **structural guard** — zero
time-only Intl formats with a timeZone may ever return to the worker
source; the layered helper's shape; the now-probe; the resolveTimeZone
rewiring; the arithmetic delegations; the offset+time consistency law;
the owner's exact label). tsc clean. LIVE: the corrected picker delivered
to the owner's chat through the real senders with the time verified as
UTC+3:30 exactly, and the tap flow (save → confirm view) re-verified
end-to-end in simulation with the real modules.

---

## [13.115-trialfoot] — 2026-10-17 (white-background stickers restored + «نسخه آزمایشی» on every message)

The owner's two corrections, verbatim: *"You tried to remove white
background of those stickers, but those were intentional. keep those png
as they're. just convert to sticker."* and *"also add this in footer of
each message: نسخه آزمایشی"*.

### The stickers: the white background was the point

The v13.114 normalization wrongly treated the logos' white background as
noise (edge flood-fill → transparent). The owner's 1024×1024 PNGs are
intentional white-background recreations. Re-done with exactly ONE
transform: LANCZOS 1024→512 (Telegram's static-sticker side requirement) —
no flood-fill, no crop, no padding; `assets/stickers/*.png` replaced
(127–174KB, RGB, pure-white corners + border ring verified pixel-wise).
The pack was rebuilt via `make-sticker-pack.js --recreate` (delete +
createNewStickerSet + position-mapped file_id re-harvest) and
**KV `stickers_v1` rewritten with the new file_ids** — every send rides
the fresh map. All 5 stickers re-verified ON Telegram's CDN (`getFile` +
corner/border pixel probe: pure white on every side).

### The trial footer: one choke point, five surfaces

**«نسخه آزمایشی»** now ends every text-bearing message the bot delivers.
Implemented at the SENDER layer in `telegram.ts` — `withTrialFooter(text,
cap)` — applied in exactly five places: `sendTelegram` (before payload AND
before every outbox push — the outbox stores the already-footered text),
`sendTelegramDirect` (the drain path; idempotent), `editMessageText`
(menu edits re-compose fresh text — without this the footer would vanish
on the first tap), and the `sendPhotoBinary` / `sendAnimation` captions
(cap 1024 = Telegram's caption ceiling). By construction that covers
notifications, all four digests, /tables, bot menus, admin pages, match
cards and the UCL GIF banner. `sendSticker` / `sendDice` carry no text at
all — the footer is physically impossible there.

Safety properties (all unit-pinned in `check-reliability.js`):
- **MarkdownV2-clean** — the string is Persian letters + space only, zero
  reserved characters, safe to append raw under every parse mode we use
  (the live send proof would 400 otherwise).
- **Idempotent** — an `indexOf` guard means re-sends, outbox drains and
  menu re-edits never stack two footers.
- **Fail-open** — a text already at the 4096/1024 ceiling ships WITHOUT
  the footer rather than crossing the limit and losing the message (the
  sticker philosophy: the payload outranks the flourish).
- **Config-gated** — `CONFIG.TRIAL_FOOTER = ""` disables it everywhere;
  composers stay footer-free (one choke point, not forty).

### Verification

Suite 1702 green (baseline preserved; +19 trialfoot checks: wiring counts,
five-surface coverage, the pure unit table — append / idempotency /
boundary fit at exactly 4096 / one-over skip / caption caps / kill
switch), tsc clean. LIVE end-to-end through the real `sendTelegram` +
real Bot API: the footered message and the idempotent (single-footer)
message both DELIVERED to the owner chat, and the rebuilt white-background
LaLiga sticker delivered via the fresh KV map.

---

## [13.114-stickers] — 2026-10-17 (league-logo stickers: pictures ride Telegram's own infrastructure)

The owner's idea, verbatim: *"lets create a sticker pack for telegram. so
when we need pictures, instead of using worker's ability, use the
infrastructure of the telegram it self. for starter, I uploaded 5 PNG for
the leagues logo. for weekly briefing use those."* — with the example
layout `[laliga logo sticker][laliga table]`.

### The pack

**`t.me/addstickers/sportsignal_leagues_by_SportSignalAlertsBot`** —
"SportSignal League Logos", 5 static stickers (512×512, transparent,
111–197KB each), created ONCE from the owner's uploaded
`football_league_clean_square_pngs` zip. The zip was unpacked into
**`assets/stickers/`** (`pl.png`, `pd.png`, `sa.png`, `bl1.png`, `fl1.png`
— the repo's league codes; normalized: edge flood-fill → transparent
background, 6% margin, pad-to-square, LANCZOS to 512; the raw zip left the
repo root) and is now the source of truth for re-builds. Pack order =
`PL, PD, SA, BL1, FL1` (the `weeklyTableCodes` order); emoji + search
keywords per league (⚽ + 🦁/🇪🇸/🇮🇹/🇩🇪/🇫🇷).

Telegram quirk hit on creation: a bot CANNOT own a sticker set
(`USER_IS_BOT`) — the pack is owned by the human owner (the bot's admin
chat, who had interacted with the bot), which is the only supported shape
for bot-created packs.

### The plumbing (zero worker picture work, by design)

- **KV `stickers_v1`** = `{ PL: "<file_id>", … }` — the per-league file_ids
  harvested from `getStickerSet` at creation time (position-mapped).
  file_ids are stable and bot-scoped; the worker NEVER carries the PNG
  bytes, never renders (no resvg/WASM), never uploads — a send is ONE
  `sendSticker` subrequest carrying a chat_id + file_id: Telegram's CDN
  does everything. The same "telegram-infra" direction as v13.99's
  UCL-GIF file_id cache, now for the weekly briefing.
- **`src/stickers.ts`** (NEW): `getLeagueStickers` (one KV read per burst,
  10-min per-isolate memo, never rejects — a KV hiccup = a sticker-less
  digest, never a missed table) + `parseStickerMap` (pure: whitelist of
  `CONFIG.STICKER_LEAGUE_CODES`, ≥20-char ids; garbage/short/non-league
  codes — including an "AL" someone might hand-add — degrade to `{}`).
- **`sendSticker`** (telegram.ts): the sendAnimation cosmetic class — 2
  attempts, pacing + 429-pause + dead-chat detection shared with every
  sender, NO outbox (a missed logo must never queue a retry that could
  double the flourish; the table behind it is the payload).
- **`sendLeagueTables`** (digest-weekly.ts): per chat, per league —
  `[league logo sticker][league table]`, exactly the owner's layout. A
  league without a sticker (PGL, CL today) just skips the logo —
  fail-open. `out.stickers` counts successes. ONE integration point, so
  the Monday digest, the owner's `/tables` command and the admin panel's
  manual send all got the stickers at once.
- **`scripts/make-sticker-pack.js`** (NEW, operator tool — the
  set-bot-commands.js convention): create-or-refresh the pack from
  `assets/stickers/*.png`, harvest file_ids by position, write KV via the
  CF REST API (or print for a manual `wrangler kv:key put`). `--recreate`
  deletes + rebuilds (file_ids are position-mapped, so ANY pack content
  change needs it). Future leagues = add the PNG + one STICKER_MAP row +
  `--recreate`.

### Quota direction

Strictly POSITIVE-side: the weekly digest gained 5 sticker sends/week/chat
(one subrequest each, already paced) and ONE extra KV read per burst; no
new KV writes anywhere (stickers_v1 was written once, by the script). The
worker's picture path (WASM-rendered match cards, the bundled 943KB GIF)
is untouched — this release is the STARTER of the telegram-infra picture
direction, not the migration of the dynamic cards (those carry real-time
content a static pack cannot; the UCL GIF is a candidate for a later
pack slot).

### Tests

check-weekly-tables: `parseStickerMap` unit table (null/garbage/short-id/
non-league drops) + the behavioral block — sticker-before-table ORDER via
a combined action log (`[PL logo][PL table][PD logo][PD table]`), logo
counting, failed-logo-never-blocks-the-table, empty-map = no sticker field
+ the 6-table regression guards. Suite: 1683 OK / 0 FAIL (baseline
preserved); tsc clean.

---

## [13.113-nightgate] — 2026-10-17 (AL bot-silence + the valuable-night digest gate + always-covered cup eliminations)

The owner's three rules, same message:

1. *"Do not notify Australia league in the robot."*
2. *"Do not always show خلاصه شب — keep it only for the UCL nights leagues,
   or the nights when at least 1 of the desired teams had a match that
   night/day"* (with a pasted example of the noise: a digest whose entire
   body was Frankfurt–Köln / Frosinone–Sassuolo / Le Mans–Toulouse /
   Deportivo–La Coruña — *"none of those worth watching or mentioning"*).
3. *"But always cover elimination cups. for example Club x eliminated
   against…"*

### 1. v13.113-alquiet — the A-League leaves the BOT, keeps the WEBSITE

`CONFIG.BOT_SILENT_LEAGUES: ["AL"]` + one predicate (`isBotSilentLeague`,
match-classify.ts) consulted by every bot push surface:

- `shouldNotify` returns false FIRST for silent leagues — covers the
  engine's individual cards, the HT/postponement alerts (notify-status)
  and the audit universe (no false gap alerts for AL) in one gate.
- Big-match kickoff/FT broadcasts (digest-bigmatch) — a Melbourne
  Victory–Sydney FC both-desired clash is site content, not an
  all-chats broadcast.
- Morning digest, week-ahead digest, night digest — no AL line, ever.
- **Untouched on purpose**: `shouldReport` (pool retention, the website's
  A-League lists/finished rows/standings boxes), `/next`, SEO. The league
  loses its robot life only — the exact scope the owner asked for.

### 2. v13.113-nightgate — the valuable-night gate

`nightIsValuable(nightMatches, eliminations, prefs, chatId)` (digest-night,
pure + exported): a night digest exists ONLY for (a) a UCL night (≥1 CL
match — the digest's founding product), (b) an elimination event, or (c)
THIS chat's desired teams playing that night — the same resolution the
"your teams" section uses (explicit follows → master fallback), so the
gate is per-chat. Quiet nights skip BEFORE the dedupe read+write — a
quiet night now costs ZERO KV ops (the gate is also a quota cut). Bot-silent
leagues leave the night's set entirely (they can't gate, render, or block
the completeness check). New `quiet` counter in the tick log.

### 3. v13.113-cupcover — "Club X eliminated against Y", always covered

New `src/cup-elim.ts` — the elimination detector:

- **stageTok**: canonical round tokens from `roundRaw || stage` (FD enums +
  sportscore free-text), with the round-pattern-before-third/semi/final
  ordering the site's roundLabel already documents ("3rd Round" is a cup
  early round, never the third-place playoff).
- **cupTieShape**: CL/EL/ECL league phase = no elimination semantics;
  their knockout playoff/R16/QF/SF = two-legged, FINAL single; domestic
  cups (FA/EFL/CDR/Coppa/DFB + Hazfi) = single-leg knockout, EXCEPT the
  EFL/CDR/Coppa/Hazfi semis (two-leg) — FA Cup (Wembley semis, no
  replays) and DFB Pokal stay single; WC/EC/COPA/AFCON/AFC knockouts
  single-leg, groups/qualifying never claim.
- **eliminationOf**: single-leg FT loser (draws claim nothing — replay/
  ET-unknown), two-leg ties aggregate over the twin leg found in the pool
  (≥48h apart, same round token + pairing, both FINISHED; a level
  aggregate stays silent — pens are unknown post-v13.111 slim). Failure
  direction is always toward silence: a false "X eliminated" is worse
  than a missed phrasing.
- **The digest renders a new section** between "your teams" and
  "نتایج شب": `حذف‌شدگان جام‌های حذفی` / `Cup eliminations` — grouped by
  competition (🏆 italic labels like the results groups), each line
  "❌ X مقابل Y حذف شد" (+ "در فینال" for finals, "(مجموع ۳ \- ۱)" for
  aggregates; en: "❌ X eliminated by Y (agg. 3-1)"). The eliminated
  pairing leaves the plain-results section — one line per tie. The
  elimination gate is GLOBAL: an elimination night sends to every chat
  even when nobody's desired team played.
- **Documented limit**: the pool retains settled rows 7 days back, so a
  two-leg tie whose first leg is older aggregates nothing — leg 2 reports
  as a plain result (the individual cup tier still pushes it when a
  desired side plays). Extending retention was rejected: the audit's
  unbounded `hoursSince` gap checks treat pool recency as their upper
  fence, and resurrecting 3-week-old rows would re-open false-page risk
  for a phrasing upgrade.

### Tests (1,683 OK / 0 FAIL — the baseline grew by ~60 checks, all green)

- check-consolidated: the AL flip (both-desired AL clash NO LONGER pushes;
  shouldReport keeps it) + wiring asserts for all five bot-silent surfaces
  + the nightIsValuable/eliminations wiring.
- check-nightdigest: the gate behavioral (the owner's exact example night
  is QUIET; UCL/elimination/desired-team nights pass; per-chat
  resolution proven) + the full cup-elim unit table (stageTok traps,
  tie-shape table, single-leg/draw/non-cup/league-phase, two-leg
  aggregate + 48h fence + stage-mismatch, collectEliminations dedupe) +
  the elimination-section rendering (fa/en, aggregate, final flag,
  MarkdownV2-safe, no double line).
- check-mdstyle: the elimination section through the REAL builder with
  ADVERSARIAL team names — parses, loser named, comp label italic,
  aggregate plain-escaped; the raw-paren class caught during development
  (the aggregate suffix's literal parens are now `\( \)` — the v13.90
  parse-400 graveyard rule).
- live-derby-test/check-no-miss: the grabbed `shouldNotify`/broadcast
  slices carry the new `isBotSilentLeague` dependency (grab/stub).

### Quota effect (the free-tier mission continues)

The quiet-night gate REMOVES KV ops (skips the per-chat dedupe read+write
on nights that would have sent noise), AL rows stop generating any
notification fan-out, and the elimination detector is pure CPU on rows
already in memory. No new KV reads/writes anywhere.

## [13.112-estgate] — 2026-10-17 (estimate-gated live polling — the owner's "poll by the schedule" rule)

The owner's read on the quota curve: *"a huge part of resources is consumed
by checking what games are playing now and when it ends — instead of
pinging for it, show the estimate: game starts at 17 → 17 + 90 (+10 extra)
= end of match."* Verified against the live pool + account analytics — the
diagnosis was right about the waste, but the waste is the WINDOW, not the
per-tick check (already one narrow football-data call since v13.43/v13.53):

- `ACTIVE_WINDOW_BEHIND_MS` was **8 hours**: every tracked kickoff kept the
  whole tick engine in live-sweep mode for **9 hours** (1h ahead + 8h
  behind) when a match resolves in ~1h45. Simulated on the actual Oct-16
  pool: **64% of the day's ticks were live-sweeping**, most of it polling
  long-dead fixtures — the evening tail of finished matches.
- Full estimate-only (never checking) would cut features — the HT alert
  carries the real half-time score, the result notification the real final
  score, postponement detection the real status flip. An estimate gives
  WHEN, never WHAT.

### 1. The estimate-gated tail — `config.ts` (one constant, full reasoning inline)

`ACTIVE_WINDOW_BEHIND_MS: 8h → 195min` (3h15). The owner's formula plus the
complete feature margin:

- league FT lands at ko+~105min (90 + 15 HT + stoppage) ✓
- cup extra-time/penalties land at ko+~150min ✓
- the match-start backfill leg needs live statuses to ko+180min ✓
- beyond 195min, self-healing: `isLiveStatus(cached)` keeps the tick active
  once a full sweep catches a genuinely-still-playing row, and the every-2h
  full sweep re-syncs FINISHED + final score regardless — the 6h result
  window is served from the cached pool either way.

Measured effect: **matchday live sweeps −37%** (Oct-16-class day: 75→47
active ticks; ~110 fewer provider fetches + merges), quiet days unchanged.
Features unchanged: HT/result/postponement/pre-match reminders all fire on
the same data they always did — a normal FT (~ko+105) still lands inside
the tail and is caught within 10min.

### 2. The estimate on the live cards — `assets/public-13.26.js`

The display half of the owner's idea, verbatim: when a live card has NO
live minute (no enrichment data), it now shows **`≈67′`** (elapsed,
computed from kickoff — zero requests) with an **"ends ≈ 18:55"** tooltip
(kickoff + 105min, +150min for CL/domestic-cup codes; Farsi: `پایان ≈`).
When a real live minute exists it always wins. Two render sites (the LIVE
section card + the upcoming-row chip) + the `estLive` helper; caps at
100′/130′ elapsed so dead-stale rows render clean. Zero backend/payload
contract change — the estimate is computed client-side from `utcDate`.

## [13.111-quotaslim] — 2026-10-17 (free-tier quota hardening: the two Cloudflare alert emails)

The two alert emails of 2026-10-16/17, investigated with the account's own
GraphQL analytics:

- **Email 1** (KV operations at 50% of the daily free quota) = **WRITES**:
  Oct 14 burned 1,273/1,000 (a hard breach — 13 CI runs + dev-session
  traffic), Oct 15: 704, Oct 16: 869 (87%, the trigger).
- **Email 2** (Workers CPU limit exceeded 1,000+ times in 24h) = Oct 14's
  1,007 `exceededResources` kills — and the kills CONTINUED in steady
  state (64 in the 00:00Z hour and 25 in the 02:00Z hour of Oct 17 alone,
  sweep/digest hours).

Verdict: ~60-70% of the peak-day excess was dev-session + CI artifact
(temporary, per the owner), but FOUR structural defects remained and are
fixed here — no feature cut, only how the quota is spent:

### 1. The pool blob slim (the CPU structural fix) — `match-pool.ts`

`matches_v13_tracked` was **617KB / 707 rows**, and every consumer
(all 144 cron ticks, every serve path, every digest) JSON.parses it. A
field audit of the whole codebase found **~46% of the bytes were fields
NOTHING reads**: football-data's nested `odds` / `referees` / `area` /
`season` / `group` / `lastUpdated`, team `shortName`/`tla`/`id`, score
`winner`/`duration`/`halfTime`, competition `name`/`id`/`type`.
`cacheMatches` now persists a whitelist exactly matching consumption
(`id, utcDate, status, venue, stage, matchday, round, roundRaw, roundFa,
minute, scorers, homeTeam.{name,crest,faName},
awayTeam.{name,crest,faName}, competition.{code,faName,emblem},
score.fullTime`) → **~331KB, −46% parse CPU on every pool read**. The
slim applies to BOTH sides of the change-only comparison, so an
already-fat pool converges on the first stamp-advance (≤90min) and
identical-content skips stay exact. In-memory lists keep whatever the
providers bring — only the persisted blob is slim.

### 2. healthz / admin /status stop parsing the pool — `monitoring.ts`, `api.ts`, `admin-bot.ts`

`/healthz` (and the bot's `/status` card) JSON.parsed the FULL pool per
poll just to read `fetchedAt` + row count — with an uptime monitor
polling every few minutes this was a standing CPU-limit killer.
`getPoolMetaCheap()` answers both by text-scanning the blob (one
`"fetchedAt"`, one `"utcDate"` per row — the blob's live contract) in
~1-3ms instead of a 20-40ms parse.

### 3. The edge-cache layer on `/api/public-matches` — `public-swr.ts`

The public page's JS polls every 60s per open tab; every poll ran the
full serve path (2 KV reads + ~100KB parse + overlay patch). The route
now sits behind `caches.default` with `Cache-Control: public, max-age=60`
(edge + browser): repeated polls within the window are served from the
edge with ZERO worker-side work. Correctness is unchanged in practice —
the live overlay itself only refreshes at cron-tick cadence (~10min), so
a 60s TTL adds at most one poll of staleness to 10-minute-granularity
data. The cron self-prewarm's `?selfprewarm=<ts>` cache-buster keys
separately and always runs the full path; degraded responses are never
stored; the CI crawler's bare-URL reads ride the same edge entry.

### 4. The coronation write diet — `digest-coronation.ts`

`table_top_v1:<code>` snapshots were rewritten on EVERY full sweep for
EVERY league — 6-7 codes × 12 sweeps = **72-84 writes/day** re-writing
byte-identical top-10s. Now write-only-when-changed (the v13.38
status-map pattern): an unchanged table needs no new dedupe state, the
detection semantics are untouched, and the 40d TTL + silent re-seed on
expiry behave exactly as before.

### 5. The honest write meter — `kv-webmeter.ts` (new), `cron-preflight.ts`, `api.ts`, `admin-bot.ts`, `public-matches.ts`

The cron-side meter counted ONLY tick writes — web-invocation writes
(visitor rebuilds, SEO venue caches, Telegram-webhook follow/prefs,
CI-crawl bursts) were invisible: Oct 17 03:22Z had 136 real writes while
the meter said 87 (36% blind), so the SOFT/HARD governor could never see
web-side bursts coming. New `kv-webmeter.ts` wraps `STATE.put/delete` on
every web invocation (sharing cron.ts's `__origPut` pristine pin — one
wrapper, no double-count) and flushes the count into a day-keyed
`kv_writes_web_v1` counter, **throttled** (flush at ≥8 pending or ≥5min
gap) so the metering itself costs ~zero extra writes on quiet days and
~12% on burst days. The governor (preflight), healthz
(`kv_writes_day` is now cron+web; new `kv_writes_web` field), the admin
card and the public rebuild guard all decide on the SUM.

### Steady-state projection after the fix

~288 lock+status floor + ~12 stamp-advances + ~12 prewarm writes + a few
event writes + web share (bounded by the edge cache + refresh locks)
≈ **mid-40s% of the 1,000/day cap on a no-dev day** (was ~60%+), with
the governor now able to see and shed the remaining web-side bursts.
Dev days remain bursty by choice (the owner: development is temporary).

Gates co-evolved: check-reliability livestamp regexes pin the slim
comparison; webGuardSeg window widened for the new comment; check-admin
slices the REAL `getPoolMetaCheap` and its pool mock now carries
`utcDate` rows (the blob contract). Suite **1622 green** (baseline
preserved exactly).

---

## [13.110-digitfold] — 2026-10-16 (the duplicate night-digest line: club-name digits fold)

The owner's report — the Farsi night results digest printed the SAME match
twice:

> 🌙 خلاصه نتایج شب — جمعه ۲۴ مهر ۱۴۰۵
> 🏆 بوندسلیگا
> آینتراخت فرانکفورت ۱ - ۰ کلن
> آینتراشت فرانکفورت ۱ - ۰ کلن

### Root cause — the digit gap in `normalizeTeamName`

The production KV pool carried the fixture as TWO rows with different
identities (rows verbatim from the live `matches_v13_tracked` that night):

- football-data (id `565828`): `"Eintracht Frankfurt" vs "1. FC Köln"` —
  FD's legal name normalizes to `eintrachtfrankfurt|1cologne|…` (the
  leading ordinal `1.` survives the non-alphanumeric strip)
- sportscore (id `spsc-2026-10-16-BL1-36`): `"Eintracht Frankfurt" vs
  "FC Köln"` — normalizes to `eintrachtfrankfurt|cologne|…`

`canonDedupe`'s canon key AND pairing key both run through
`normalizeTeamName`, so the two spellings keyed differently, both rows
survived every merge (`fetchLiveSweep`, `cacheMatches`, the long view),
and the night digest rendered the pairing twice. The same gap silently
broke FOLLOW-matching: a user following "1. FC Köln" never matched
sportscore-sourced "FC Köln" rows (and vice versa), and the pool's
2026-10-11 Köln–Mönchengladbach pair had already survived as duplicates
the same way.

**Fix (`src/teams.ts`)**: the final normalization stage strips digits —
club-name digits are ordinals/founding years ("1." FC, "Bayer **04**",
"TSG **1899**", "Schalke **04**", "Parma Calcio **1913**"), never
identity-bearing. No two distinct clubs in the tracked universe differ
only by digits, so the strip is a pure fold: `1. FC Köln ≡ FC Köln ≡
Köln ≡ Cologne`. Every digit-bearing club folds across providers
(Bayer 04 Leverkusen ≡ Bayer Leverkusen, TSG 1899 Hoffenheim ≡
Hoffenheim, Schalke 04, Mainz 05, Union Berlin, Paderborn 07…), healing
canonDedupe, `matchKey`, follow-matching and the master-set lookups with
one change. Prefix tokens stay conservative (`FSV Mainz` ≠ `Mainz`,
`Parma Calcio` ≠ `Parma`) — only the digit dimension folds.

### Defense — `collapsePairings` in the night digest

`digest-night.ts`'s `buildNightDigestMessage` now collapses the night's
rows by `competition | normalized home | normalized away` BEFORE
rendering, keeping the row that carries a score (later copy wins ties —
canonDedupe's own watch-order rule). A single night can not legitimately
contain the same ordered pairing twice, so even a future provider-variant
gap that normalization misses can never double a line on this surface.
The pool-level fold is the root fix; this is display-level insurance for
the exact reported regression.

### Safety analysis of the key-format change

`matchKey` output changes for digit-bearing club names only
(`…|1cologne|…` → `…|cologne|…`). Old `notified_v1` / delivery-ledger
rows become dead weight (TTL-pruned as before); re-firing is impossible
because every notification window is kickoff/FT-relative — all windows of
matches notified under the old keys have closed. The KV pool self-heals:
the next full sweep's `canonDedupe` merge rewrites the blob with the
duplicates collapsed (change-only write fires because the content
changes).

### Follow-up — the provider-prefix token gaps (same disease, 7 more live pairs)

A whole-pool scan after the digit fold found SEVEN residual same-fixture
pairs — the same duplicate-line disease through PREFIX/SUFFIX word gaps:
FD legal names vs TSP/sportscore short names (`AFC Bournemouth` vs
`Bournemouth`, `Genoa CFC` vs `Genoa`, `1. FSV Mainz 05` vs `Mainz`,
`Cagliari Calcio` vs `Cagliari`, `Frosinone Calcio` vs `Frosinone`,
`US Sassuolo Calcio` vs `Sassuolo`, `Bournemouth AFC` vs `Bournemouth`).
The Frosinone pair's TSP twin was `SCHEDULED` (stale), so it slipped past
every FINISHED-filtered surface that night — but any future surface where
both copies render would print the game twice.

**Fix**: `NORM_BASE_TOKENS` gains `afc|cfc|fsv|us|calcio` — each a
verified provider-variant pair from production pool data; every one is a
generic club suffix (Unione Sportiva, Calcio, the English/Italian prefix
acronyms) that can never distinguish two clubs in the tracked universe.
`normTeamKey` (the FA-dictionary layer) already carried `afc`; the dedupe
layer now matches it.

### Gates

- `check-dedupe.js`: +24 checks — the digitfold + prefixfold equivalence table (incl.
  over-merge negatives: Köln ≠ Union Berlin ≠ Copenhagen ≠ Bologna) and
  the EXACT live-pool regression pairs (FD `565828` + `spsc-…-BL1-36`
  2026-10-16, FD `565814` + `spsc-…-BL1-0` 2026-10-11) collapsing to ONE
  row with score kept and crest/venue adopted.
- `check-nightdigest.js`: +8 — wiring pins (the builder calls
  `collapsePairings`; the key is comp+normHome+normAway) and BEHAVIORAL
  renders of the real builder with the live rows: Frankfurt–Köln renders
  ONCE, the ۱-۰ score line exactly once, the distinct night match
  (Frosinone 4-2) still renders, the collapsed digest still parses under
  the MarkdownV2 validator, and a scoreless twin collapses onto the
  scored copy instead of blanking the line.

### Follow-up 2 — the row-quality ranking in `collapsePairings` (the LIVE Frosinone twin)

The first cut of `collapsePairings` kept "the row that carries a score
(later wins)". The LIVE pool's Frosinone pairing exposed the hole the
same night: the TSP twin was `SCHEDULED` carrying a pre-kickoff default
0-0 — under plain later-wins that twin would have DISPLACED the real
FINISHED 4-2 row, and the FINISHED render filter would then have dropped
the pairing entirely (a MISSING digest line instead of a doubled one —
the same user-visible defect with the sign flipped).

**Fix (`src/digest-night.ts`)**: collapse now ranks row quality —
`rank = FINISHED(2) + scored(1)`; equal rank keeps the later copy
(canonDedupe's own watch-order rule). A stale pre-kickoff twin can never
evict a real result again, whatever its arrival order.

- `scripts/live-nightrender.js` — the live verification harness: the REAL
  builder + REAL FA dict over the LIVE KV pool; tonight's digest renders
  each pairing ONCE with real scores — the user's report, minus the
  duplicate, proven against production data before shipping.
- `src/fa-dict.ts` +فروزینونه (`Frosinone Calcio` / `Frosinone` — the
  Serie A side in tonight's digest, a cold-isolate English leak of the
  v13.108-fasync class; fa-dict VARIANTS gate extended).
- `check-nightdigest.js` behavioral flipped to the verbatim live twin
  shape (`SCHEDULED` + 0-0) and now asserts the REAL 4-2 survives
  (suite 1620).

### Follow-up 3 — the `acf` token (the last fuzzy-scan residual)

Whole-pool scan round three found ONE more live pair: `Genoa CFC` (FD)
vs `Genoa` (TSP), with `A.C. Fiorentina` live the same night (ids
`558588` / `tsd-2482192`). `acf` is a generic Italian club prefix
(Associazione Calcio Fiorentina / Genoa's own legal forms) that never
distinguishes two clubs in the tracked universe — same class as the
other five tokens. `NORM_BASE_TOKENS` is now
`afc|acf|cfc|fsv|us|calcio` — 8 live provider-variant pairs folded.
Gate: +3 prefixfold checks incl. the Genoa pair end-to-end (suite 1622).

---

## [13.109-consolidated] — 2026-10-16 (two-tier eligibility: one-desired fixtures are digest-only)

The owner's report: the bot was sending INDIVIDUAL picture notifications for
استراتسبورگ–پاری سن ژرمن، برنتفورد–لیورپول، منچسترسیتی–ایپسویچ — each as its
own message. The rule, in the owner's words: "this kind of games should only
be reported in a consolidated message like 'Games in this week' ... because
Brentford, Ipswich or Strasbourg aren't big clubs. Our rule is that only send
notification for important games and clubs, which both clubs are in the
desired clubs lists." Plus two exceptions the owner spelled out:
a small club that is a CURRENT UCL participant is worth watching
("Liverpool–Porto if Porto is in UCL — champions of their leagues"), and
ELIMINATION cups are worth it however small the opponent
("FA Cup of England, Liverpool vs Ipswich").

### The split — `shouldNotify` (strict) vs `shouldReport` (consolidated)

`match-classify.ts` now carries TWO tiers where one either-desired function
used to serve everyone:

- **`shouldNotify` — the INDIVIDUAL tier** (notify-engine's per-match picture
  pushes, HT/postponement alerts, the audit universe). Domestic league +
  EL/ECL league-phase fixtures now require BOTH clubs desired, OR one desired
  + the opponent in the UCL-participant set, OR a NAMED derby with a desired
  side. The cup tier is unchanged: CL + domestic cups (FA Cup, Copa del Rey,
  DFB Pokal...) keep either-desired + QF+, and EL/ECL KNOCKOUT rounds (QF+)
  keep either-desired (parity with the pre-v13.109 verdict by construction).
- **`shouldReport` — the CONSOLIDATED tier**, the exact pre-v13.109
  either-desired semantics. Consumers: the week-ahead digest
  ("بازی‌های هفته آینده" — the consolidated home the owner asked for),
  cron-pool's active-window cadence (one-desired fixtures stay live-tracked),
  the website's upcoming/finished/this-week/next-week lists, the bot's
  `/next`, and the SEO pages. One-desired fixtures are listed everywhere,
  pushed nowhere.

Design notes: the derby clause preserves the bot's own v13.51/v13.101
derby-promotion product line (Le Classique is Ligue 1's ONLY possible
individual fixture — PSG is the sole FL1 desired club; the North London and
Merseyside derbies keep their code-named fixtures). Neither-side-desired
derbies (Roma–Lazio) stay digest-only, exactly as before.

### The UCL-participant set (the Liverpool–Porto exception)

`primeUclParticipants` (notify-engine.ts) builds the season's Champions-League
roster once per cold isolate from the CL standings KV cache (a pure KV read —
the 36-team league-phase table) ∪ the pool's own CL fixtures (the exact
spellings the classifier compares — zero aliasing risk). Dual-folded keys
(`normAlias` + `normalizeTeamName`) so a standings "SS Lazio" answers a pool
"Lazio" lookup and vice versa. Primed BEFORE `detectStatusChanges` in
`runNotifyPhase` (the tick's first strict-tier consumer); the engine, the
audit and the admin pool-diag prime defensively (no-op when warm). A total
failure primes an EMPTY set — the exception goes INERT (fixtures fall to
digest-only): the failure direction is fewer notifications, never extra.
`/api/simulate` replaces the set deterministically (clear → set → run →
clear) so its probe matrix can't be polluted by a warm isolate's live prime
— and the live prime re-arms on the next tick after the sim.

### Surfaces (all verified by the new gate + the co-evolved harness)

- `/api/simulate` probe matrix: Arsenal–Brentford (the owner's exact shape)
  flipped to SILENT; ManUtd–FCSB / Chelsea–Panathinaikos / ManUtd–Roma EL/ECL
  league-phase probes flipped to SILENT; NEW probes: PSG–Monaco (UCL
  participant, fires) and Liverpool–Everton (named derby, fires).
- `/api/diag-public` now reports BOTH tiers (`live_worthy`/`cache_worthy`
  strict vs `live_reportable`/`cache_reportable` consolidated).
- Dedupe records from before the deploy simply age out: the shouldNotify gate
  runs BEFORE the window checks, so in-flight one-desired fixtures stop at
  their last already-sent stage (no match-start/result pushes) and the night
  + weekly digests still report their results.

### Gates

- NEW `scripts/check-consolidated.js` (54 checks, full-worker harness): the
  strict/consolidated truth table (the owner's three reported fixtures
  digest-only; both-desired, derby, UCL-exception, FA-Cup, CL, EL-QF+,
  A-League pins), the exception lifecycle (unprimed/primed/cleared/empty),
  the prime's behavioral contract (standings source, pool fallback, union,
  once-per-cold-isolate no-op, KV-failure inertness, dual-fold aliasing),
  source wiring for all 8 consumer surfaces, and the week-ahead digest
  actually LISTING Brentford–Liverpool end-to-end.
- Co-evolved: check-lifecycle (Bayern–Leverkusen now proves the UCL exception
  with a primed set; Bayern–Bochum pins digest-only), live-derby-test (the
  FD-legal-name proofs moved to shouldReport; strict-tier pins added incl.
  the Betis prime flip), check-cups + check-mdstyle (shouldReport stubs in
  the eval'd week-ahead/cups chains).
- Suite: **1591 OK / 0 FAIL** (was 1536).

---

## [13.108-fasync] — 2026-10-16 (one Farsi glossary for bot & website — the cold-isolate English leaks)

The owner's report: "there are still a number of clubs without Farsi
translation or equivalents ... Paris Saint-Germain! which appeared English in
Farsi mode of the bot, or Sporting Lisbon. Please make sure the website is
synced with the Telegram bot and they share the same glossary and dictionary
between them for AI-translated club names."

### Root cause (measured live, not guessed)

A diff of the live `/api/public-matches` payload (108 team names) against the
REAL `translateTeam` run cold (no AI cache) found **17 live-feed names that
translated ONLY through the AI-learned KV glossary** — PSG's full legal form
(`Paris Saint-Germain FC`), `Sporting Clube de Portugal`, `FK Bodø/Glimt`,
`LASK Linz`, `SK Slavia Praha`, `FC Kairat Almaty`, `Viking FK`, `Sabah FK`,
`PAE AEK`, `FC Lorient`, `Le Mans FC`, `RC Deportivo La Coruña`, `Magdeburg`,
`Cuarte`, `SG Sonnenhof Grossaspach`, `FK Shakhtar Donetsk`, `Gol Gohar FC`.
Three stacked defects:

1. **`FA_TEAMS_NORM` was built but never consulted.** `translateTeam` had an
   exact-dict hit → AI-cache → fuzzy-stem pipeline; the normalized-key map
   (which check-fa-dict.js's own `lookup()` always assumed!) was dead code.
   Suffix/punctuation variants (`... FC` vs the dict's bare form) missed the
   exact match and fell to the stem matcher.
2. **Stem ambiguity killed the survivors.** With `Paris FC` in the dict, both
   `paris` and `parissaintgermain` stems match `Paris Saint-Germain FC` →
   ambiguous → English. Same class for every suffixed legal name.
3. **The bot never loaded the AI glossary.** The website payload builder,
   SEO renderer and cron preflight all call `ensureFaAiCache`; the webhook
   bot path did NOT — a cold isolate serving `/featured`, `/next`, `/tables`
   or a digest composed with `FA_AI_CACHE = null`, so every AI-learned name
   leaked English in the bot's Farsi mode while the website showed Persian.
   (Cron notify was already covered via `runPreflight`.)

### The fix — one shared 4-layer glossary, both surfaces

- **`src/translate.ts`**: new precedence **admin override → static dict
  (exact + normalized key) → AI-learned → fuzzy stem**.
  - The normalized-dict lookup (`FA_TEAMS_NORM.get(key)`) now actually runs —
    suffix variants resolve deterministically before any cache.
  - Overrides are split from learned entries (`FA_AI_OVERRIDE_KEYS`) and
    ranked FIRST — the documented v12.x "admin override takes highest
    priority" contract is now real even over exact dict hits (sentinel-proven
    in the gate). Learned entries stay subordinate to the curated dict.
- **`src/bot.ts`**: `handleTelegramUpdate` now calls
  `ensureFaAiCache(env).catch(()=>{})` before composing anything — one
  best-effort KV read per cold isolate, the same record/loader the website
  uses. Bot ≡ website, literally the same glossary.
- **`src/fa-dict.ts`**: 23 live-feed forms + the PSG value update baked into
  the static dict (values match the live AI glossary the website already
  renders): `Sporting Clube de Portugal` → اسپورتینگ لیسبون, `Paris
  Saint-Germain`/`PSG` → پاری سن ژرمن (the owner's override form; the old
  ZWNJ-heavy پاری‌سن‌ژرمن retired), plus Lorient, Le Mans, Racing Club de
  Lens, Sabah FK, PAE AEK, RC Deportivo La Coruña, Real Betis Balompié, SS
  Lazio, ACF Fiorentina, US Sassuolo Calcio, Como, Cremonese, Feyenoord
  Rotterdam, Bodø/Glimt, LASK Linz, SK Slavia Praha, FC Kairat Almaty,
  Viking FK, Magdeburg, Cuarte, SG Sonnenhof Grossaspach, Esteghlal Tehran.
  (FK Shakhtar Donetsk + Gol Gohar FC need no entry — the normalized layer
  already resolves them; two deliberate website renderings upgrade to the
  curated dict values: شاختار → شاختار دونتسک, گل گهر → گل‌گهر سیرجان.)
- **The label sibling of the same gap**: the new UCL format's
  `LEAGUE_STAGE`/`LEAGUE_PHASE` was missing from BOTH label maps — every
  Farsi pre-match card rendered the italic ENGLISH `_LEAGUE STAGE_` and the
  website's `roundFa` chip was null. Both maps now carry مرحله لیگ (same
  Persian value, both surfaces — pinned by the gate): `STAGE_FA`
  (src/tables.ts, bot cards) + `ROUND_FA` (src/public-matches.ts, website
  chips).

### Gate co-evolution

- **`scripts/check-fasync.js` (NEW, 28 checks)**: drives the REAL translate
  stack through the full-worker harness — 34 live-feed names must resolve
  identically COLD (0 leaks, 0 mismatches vs the website glossary) and WARM
  (no drift; override-owned PSG excepted); precedence proofs (override
  sentinel outranks dict; learned never shadows dict; learned fills gaps);
  reset restores cold; source asserts pin the wiring (bot loads the glossary,
  norm layer before learned, override set built + cleared, LEAGUE_STAGE
  label identical on both surfaces, the featured card renders the Persian
  stage). Negative control included (unknown club stays English).
- **`scripts/check-fa-dict.js`**: +26 live-feed legal-name variants (280
  names checked, 0 failures).

### Live verification

Crafted webhook updates (admin chat, updSeen-safe): `/start`, `/featured`,
`/tables`, `/next` — the styled Farsi surfaces render the previously-leaking
names in Persian; zero Telegram send errors / parse-400s under `wrangler
tail`; the live payload re-baked with the new precedence (website faName ≡
bot output for every covered name).

---

## [13.107-plaintimes] — 2026-10-16 (match-day times & dates render as plain regular text)

The owner's ask: "Write the Time and date of Match days in normal and
regular text because of more readability" — v13.106's monospace `` `19:00` ``
kickoff times and *italic* date lines read as technical, not conversational.
Plain text everywhere a match day is announced; the bold match headers and
italic competition labels stay (the readability ask was specifically about
times and dates).

### What changed (and what deliberately didn't)

- **The six pre-match cards** (24h / big-match / 3h / 1h / 5min / kickoff):
  `📅 date` + `⏰ time` lines render PLAIN (`mdEscape`) — was `_italic_` date
  + `` `code` `` time. The BOLD match header and ITALIC competition/stage
  label keep their v13.106 styling.
- **Result card**: the `📅 date` line renders plain (was italic); bold teams,
  bold score, italic competition unchanged.
- **Fixture lists** — morning digest, week-ahead, UCL night preview: the
  kickoff time (and the week-ahead weekday) render plain escaped text, no
  code span. `/next`: plain date + plain time (the date was already plain;
  the time was a code span).
- **Deliberately unchanged**: digest/section TITLES (bold headers that embed
  the night's date), `/help` command code spans, admin panel hints, the tz
  settings clocks (a precision signal, not a match-day time), the SVG photo
  card (image-rendered, not MarkdownV2), the UCL GIF caption (plain by
  design — the v13.96.1 lesson).
- **`src/md.ts`**: doc contract refreshed — `mdCode` is for ids/commands/tz
  clocks, NEVER match-day kickoff times; plain segments go through
  `mdEscape` so the parse-safety discipline stays structural (an unescaped
  reserved char in a date/time string can never reach Telegram).

### Gate co-evolution

- `check-mdstyle.js`: the time/date assertions flipped from
  entity-presence to entity-ABSENCE — every card asserts `⏰ <time>` in
  plain text AND `code.length === 0`, the date line asserts
  plain-first + no italic span; same flip for the result date, the three
  digest builders and `/next` (through the real command chain —
  `globalThis.mdEscape` now installed for the new-Function chain scope).
  The import contract pins `{ mdBold, mdItalic, mdEscape }` in composers.
- `check-uclnight.js`: fa/en kickoff-time assertions flipped from
  backticked to plain (`— ۲۰:۱۵` / `— 20:15`).

Suite: 1509 OK / 0 FAIL. Deployed + live-verified (crafted webhook updates,
zero Telegram parse-400s).

---

## [13.106-mdstyle] — 2026-10-16 (MarkdownV2 rich formatting across every bot message surface — the entity system)

The owner's ask: the bot's messages are parse-safe but visually PLAIN —
"implement proper MarkdownV2 rich formatting so they look polished": bold
match headers, monospace kickoff times, italic competition/round labels,
consistent rhythm. This is the styling session, gated like a reliability
change (the parse-400 graveyard is the constraint that shaped everything).

### The entity system (one home, structural safety)

- **`src/md.ts`** — the MarkdownV2 entity builder, a Layer-0 pure leaf:
  `mdEscape` (escapes ALL 18 reserved chars + the backslash — three more
  than the legacy `escapeMarkdownCharacters`: `*`, `` ` `` and `\`),
  `mdBold`/`mdItalic` (wrap ESCAPED inner text — an adversarial team name
  can never break the span), `mdCode` (content stays RAW — code spans have
  no inner escaping; used for digits/times/ids/commands only). The escape
  regex is built from a string (not a literal): its char class contains a
  backtick, which the eval harness's function slicer would misread as a
  template-literal opener.
- **`scripts/lib/mdv2.js`** — the SHARED entity-aware parse-safety
  validator (a superset of check-admin's v13.104 model): *bold*, _italic_,
  __underline__, ~strike~, ||spoiler||, `code`, ```pre```, [links](url),
  line-start blockquotes, backslash escapes, the trailing-backslash rule.
  FAIL-FORM by construction: unescaped reserved char anywhere outside
  entities, unclosed entity, malformed link = red build. Plus
  `mdv2Entities()` — the entity extractor the behavioral gates assert with.
- **`scripts/check-mdstyle.js`** (+100 checks, wired into `npm test`):
  every styled surface built from the REAL source, parse-gated AND
  entity-asserted — the six pre-match cards + result (fa+en+adversarial
  identities "Ali (X). United 🆚 B-Team_FC"), the four digest builders,
  the HT/postponement alerts, the welcome strings, /help + /next through
  the REAL command chain, and the strategy contracts (parse_mode pinned,
  GIF captions stay plain, harness order). The validator's FAIL-FORM
  proofs replay the v13.71 `>`, v13.90 `(`, v13.90 `.` graveyard shapes.

### The styling (per the design spec)

- **Pre-match cards (24h/72h/3h/1h/5min/match-start)**: `📅 _date_` /
  `⏰ \`۲۱:۰۰\`` / `*home 🆚 away*` / `_comp — stage_` — one bold match
  header, monospace kickoff, italic labels; the venue line stays plain
  (selective emphasis).
- **Result card**: bold team names, italic comp+date, the scoreline BOLD
  (`نتیجه *۲\-۱*`), winner line plain.
- **Night digest**: followed-team verdict carries the BOLD team + BOLD
  score; "نتایج شب" group labels italic; other-result scores bold between
  plain names (the markdown-instructions template).
- **Morning digest / UCL preview / week-ahead**: bold fixture lines,
  monospace times, italic competitions. Week-ahead: the derby/UCL lines
  keep their ⚔️/🔥 emoji anchors instead of the old whole-line bold —
  MarkdownV2 cannot nest entities, and the lines now contain spans.
- **League tables**: the fa title is ONE bold span including «جدول»
  (`*جدول لیگ برتر انگلیس*:`); rows unchanged.
- **HT / postponed / cancelled alerts**: bold teams + bold score, italic
  competition (the parenthesized comp label became an em-dash + italic).
- **Welcome (fa/en)**: the greeting line is a BOLD title; referral links
  unchanged (bare-text auto-links).
- **/help**: every command a monospace code span (both languages);
  **/next**: bold match lines + italic comp + monospace time; **/teams**:
  bold team names; tz picker texts: the live local time renders monospace.
- **Admin surfaces**: the /admin panel hints and the roster search hint
  render `/members` etc. as code spans (join/leave pages, roster, status
  card were already entity-styled in v13.104/105).
- **Late tags** (backfill + repair legs): italic — a meta-note, visually
  secondary. Composition contract between the two legs preserved.

### A LIVE BUG THE GATE CAUGHT (fixed)

- **The en /help body carried RAW parens** — `(region buttons, live local
  times)` unescaped since the line was written: every English /help send
  was a parse-400 dying silently (the v13.71/v13.90 shape; the fa audience
  never exercised it). Fixed with `\(…\)` — and the single-vs-double
  backslash trap that produced it is now fenced by check-mdstyle's /help
  parse gate (a JS string literal drops a lone `\(` — the escape must be
  `\\(` in source).

### Harness co-evolution

- `worker-src.js`: md.ts registered after utils.ts (the concat order).
- check-join-flow + check-bot-edges: the blanket no-markup validators
  became the shared entity-aware one (the welcome/tz texts carry
  intentional entities now).
- check-admin: inline validator → shared superset; new panel code-span
  assertions (C5b).
- check-composers / check-no-miss / check-weekly-tables / check-uclnight:
  the REAL md builders (+ their escape-regex vars) sliced into every eval
  that now calls them; the uclnight behavioral assertions moved to the
  code-span time form; the weekly-tables header assertion to the bold
  title form.
- The three chain harnesses (admin/join-flow/bot-edges) install the real
  md builders as globals — the eval'd builders/chains resolve them through
  the global object.
- Deliberately UNCHANGED: `sendAnimation` GIF captions (plain, no
  parse_mode — the v13.96.1 lesson), `standingsLine` bullets, promo
  footers, all logic/windows/dedupe/keyboards/callbacks.

Suite: 1509 OK / 0 FAIL (was 1409 — +100 mdstyle checks).

---

## [13.105-membersearch] — 2026-10-15 (the roster caps at the last 10 joined + "/members <query>" — the membership lookup)

The owner's ask: "if users were too much, it must show the last 10 joined,
with a search capability, just in case admin wanted to check whether a
certain id is joined or not."

- **The roster caps at the LAST 10 JOINED** when the member base outgrows
  10 (`MEMBERS_LIST_CAP`): header gains "نمایش ۱۰ عضو آخر" + the total,
  footer counts the unlisted ("… و N عضو دیگر"), and every roster render
  ends with the search-syntax hint ("🔍 جستجوی عضو: /members «آیدی یا نام»").
  At ≤ 10 members the roster still lists everyone.
- **`/members <query>` — the membership lookup**: an exact chat-id match
  gets the explicit verdict line ("✅ این آیدی عضو ربات است" / "❌ این آیدی
  عضو ربات نیست" — the digit-query miss answers the "is this id joined?"
  question directly); otherwise id fragments, @usernames, first names and
  group titles are matched case-insensitively (capped at 10 results).
  Persian (۰-۹) and Arabic-Indic (٠-٩) digits fold to ASCII — the fa
  keyboard's ۴۲ finds id 42. The @bot suffix Telegram appends in groups is
  stripped first ("/members@Bot" is still the plain roster); "/membersx"
  remains an unknown command.
- Group chats whose only identity is a `title` are now labeled by that
  title (previously "چت <id>") — the title is searchable, so it must also
  be the display label.
- Routing: the admin branch matches `/^\/members($|[@\s])/` (the same
  word-boundary shape `/broadcast` uses) — the query rides the SAME
  admin gate (a non-owner probing `/members 42` gets the plain denial).
- Every new surface is gated: check-admin D-series (21 behavioral + 4 source checks) — the
  12-member cap render, exact-id verdict, Persian digits, @username,
  name fragment, unknown-id verdict, gate bypass attempt, group form,
  glued command, adversarial query echo parse-safety (mdv2Safe), title
  search, id-fragment search. Suite: 1409 OK / 0 FAIL.

---

## [13.104-admfix] — 2026-10-15 (the /members + /admin Telegram outage — every admin surface parse-safe, live-verified)

The owner's report: "/members does nothing in the bot." Live repro through the
production webhook (wrangler tail): Telegram **parse-400** — and that is the
whole symptom: a deterministic 400 is retried 3×, returns false, and never
outboxes (non-dead 4xx is a permanent failure), so the owner sees NOTHING.
No error surfaces anywhere else.

Three real bugs, one pre-existing typo, and a systematic gate:

- **`/members` (and the adm:members panel button) were dead since v13.90** —
  the default tz label `"تهران (پیش‌فرض)"` in the roster carried RAW parens;
  MarkdownV2 reserves `(` and `)`, so the ENTIRE roster was rejected whenever
  ANY member had no tz set — and 4 of 7 live members had none. Fixed: the
  label is escaped at build (`DEFAULT_TZ_FA`).
- **`/admin` was dead since v13.71** — the panel's usage hint
  `/broadcast <متن>` carried a RAW `>` (reserved — blockquote). Fixed with
  Persian guillemets: `/broadcast «متن»` (reserved-free AND typographically
  correct for Persian). Same fix for the body-less `/broadcast` usage reply
  in bot.ts (`/broadcast «متن پیام»`) — that message was equally broken.
- **`/status` rendered `13\.103\-monthstats`** — escape-inside-code-span is a
  literal backslash; version/budget/api_source now render RAW inside their
  code spans (code spans need no escaping).
- The roster header said "اعضای **ربت**" (missing the alef) since v13.71 —
  now "اعضای **ربات**".
- **check-admin.js grew an entity-aware MarkdownV2 parse-safety gate** (the
  join-flow validator is too strict for markup-carrying messages — it would
  reject the intentional `*bold*`/`` `code` ``): 14 behavioral checks run the
  REAL message builders — the exact live repro (tz-less roster), tz-set
  rosters, adversarial member identities (parens/dots/dashes in names),
  /status (budget + api_source populated), the panel, join/leave pages,
  broadcast ack/body/summary, and the adm: button paths. Suite: 1383 OK,
  0 FAIL (was 1369).

Post-deploy live verification (real webhook POSTs + wrangler tail): /members,
/admin, /status, /broadcast and both adm: panel buttons all delivered — every
send ok, outbox stayed 0.

---

## [13.103-monthstats] — 2026-10-15 (the counter also reports yesterday's visitors + the current month's visitors)

The public stat counter now shows **بازدیدکننده دیروز (yesterday's unique
visitors)** and **بازدیدکننده این ماه (this month's visitors)** everywhere it
renders: the homepage live stats box, the footer on every page (homepage + all
SEO pages), and the admin card gains a this-month pair (views + unique).

- `tehranMonthStart` (stats.ts): first day of the CURRENT Tehran-calendar
  month — a calendar month, not a rolling 30d window (on Nov 1 the sum resets
  to Nov 1 alone). "Visitors" keeps the site-wide semantics: the sum of DAILY
  unique visitors, so a person returning on three days counts three times
  (same as the admin 7d/30d cards and the daily-dedup design in /privacy).
- `readPublicStatsBlock` (the /api/visit beacon JSON) serves
  `yesterday_visitors` + `month_visitors`; every fallback path (no STATS_DB,
  read error) returns them as 0. `collectAdminStats` adds
  `month_views`/`month_visitors` (calendar month) alongside the rolling 30d.
- No new data is collected — both numbers are aggregates of the existing
  daily rows; /privacy updated to list the new labels and say exactly that.
- check-stats.js +25 checks: tehranMonthStart truth table (mid-month, the
  1st, the Sept-30 midnight month flip, cross-year) and a BEHAVIORAL test —
  the real `readPublicStatsBlock` eval'd from source, run against an
  in-memory D1 under a FIXED clock (mid-October with a Sept row that must
  not leak into the month sum; the Nov-1 rollover where yesterday is last
  month; the missing-yesterday-row → 0 shape).

---

## [13.102-perchat] — 2026-10-14 (per-chat delivery ledger + repair; the end-to-end lifecycle harness; the bayern normalization bug)

The reliability agenda, answered with proofs instead of assumptions:
**"never misses a match" is now a 63-check simulated-timeline test that
found a real, live, silent-miss bug on its first run.**

### THE BUG THE HARNESS FOUND (live-impact): Bayern matches never notified
`check-lifecycle.js` replayed a full matchday through the REAL tick code and
its Bayern–LASK fixture came out **unworthy** — `shouldNotify` returned
false. Root cause: the v12.15 `TEAM_ALIASES` entry
`"bayernmunich"→"bayernmunchen"` predates the v13.8 `TRANSLIT_FOLDS`
(`munchen→munich`, applied INSIDE `normalizeTeamName`) and now CONFLICTS
with it: every set (the master normSet, shouldNotify's `c.all`,
isFeaturedMatch, userFollowsMatch) is built with bare `normalizeTeamName`
(→ `bayernmunich`), while every LOOKUP goes through `normAlias` (→
`bayernmunchen`). Result: **both spellings of Bayern failed the master-team
match — Bayern fixtures vs non-master opponents (Leverkusen, LASK,
Hoffenheim…) silently never notified. Verified live: `notified_v1` has ZERO
bayern rows, ever.** Fix: the alias entry is removed (the translit fold
already unifies both spellings inside `normalizeTeamName`); the admin
page's client-side `AC_ALIAS` fold direction flipped to match; the
set-lookup invariant (every master/variant name lands IN the
normalizeTeamName-built sets) is now a permanent regression check.

### The per-chat delivery ledger (D1 `notify_deliveries_v1`)
The v13.94 fan-out reservation closed the quota-death hole, but a CPU kill
MID fan-out still left the tail chats with nothing: the write-first dedupe
record was persisted, their sends never ran (so no outbox entry), and the
audit was per-MATCH — "match X fired" while chat Y silently missed it. Now:
- Every (match, type) fan-out records per-chat verdicts (`sent` / `dead` /
  `failed` — the outbox owns `failed` recovery — one D1 batch per unit).
- `auditNotifications` runs a PER-CHAT completeness pass: every fired stage
  must cover its audience (followers + the -big equivalence groups; chats
  that joined after the stage are not expected; rows of any verdict count
  as covered). No-row gaps page the admin (own 6h rate-limit) and are
  visible via `/api/audit` (`perChatGaps`).
- THE REPAIR LEG: while the stage is still timely (the same window/backfill
  gates a fresh send would pass), the missing chats get the message
  re-sent, late-tagged — write-first marker (`verdict='repair'`): at most
  ONE attempt per (match, type, chat), ever. Out-of-window gaps are
  reported only, never re-sent. Capped at 24 sends/tick, text-only.
- The big-match broadcasts (match-start-big / result-big) record rows too.

### `scripts/check-lifecycle.js` — the end-to-end simulated timeline
The REAL tick code (`executeScheduledLogic` — the whole phase graph) run
every 10 minutes over a 3.25-day mock world (7 heterogeneous chats: the
admin, 4 fa/Tehran, an en/London, an en/Sydney + a Liverpool-only
non-follower; two full match lifecycles) with only the world mocked: a
controllable clock (a Date subclass), in-memory KV/D1 (the exact SQL
surface), and a fetch dispatcher. Four hostilities, each targeting a
documented failure class:
- **DEPLOY WINDOW** (every tick of the 24h pre-match window skipped): the
  stage fires LATE via the backfill leg with the "sent late" tag. (M3's
  match-start, whose window AND backfill leg fall entirely inside the
  outage, is the documented loss — reported by the audit, result still
  delivered.)
- **PROVIDER OUTAGE** (football-data 429 through a full sweep): the breaker
  suspends FD, the pool falls back to cache, the degradation alert pages,
  and no in-window stage is missed.
- **TRANSIENT 500** (one chat's Telegram send during the 3h fan-out):
  3 retries fail → the dead-letter outbox → delivered by the next tick's
  drain. At-least-once, never silent.
- **CPU KILL MID FAN-OUT** (every fetch/KV/D1 op after the first chat's
  card send rejects — the dedupe record already persisted): the NEXT tick's
  per-chat audit detects the no-row chats, pages the admin, and the repair
  leg re-sends the kickoff to exactly those chats (the admin's card+repair
  pair is the one documented duplicate window).
Then it asserts EVERY chat receives EVERY stage it is owed at its own local
time: 72h/24h/3h/1h/5min/match-start/result (+ -big broadcasts), UCL
preview + GIF, night/morning/weekly digests with per-chat dedupe keys
(Sydney's far-tz timing differs by a day — correctly), HT alerts, and the
admin parity — the admin receives the same public surfaces as ordinary
users, and the heartbeat pages ONLY the admin. 63 checks; the normalizer
consistency gate (the bayernfix) closes it.

### The welcome referral push (the user's ask)
The `/start` welcome (fa + en) now also urges new members to recommend the
bot AND the website to their football-loving friends — both links
(`https://t.me/SportSignalAlertsBot`, `football.sportsignal.ir`),
MarkdownV2-safe (every `.` `-` `!` escaped; no entity markup — the join
flow's parse-400 history). The `/start` langSet branches now compose
through `botStr` (ONE source of welcome truth). `check-join-flow.js`
extended (+17 checks): real-string content tests, MarkdownV2
parse-safety validation, the REAL language-tap join block (welcome +
referral + tz onboarding + the admin join page), and the tz-set re-tap
never re-nagging.

### Other
- `scripts/check-sameflow.js` (+21 checks): the static send-site audit —
  every Telegram-send site is either a fan-out/command-reply or on the
  audited admin-only allowlist (heartbeat, budget/stale/cap/audit/per-chat
  pages, phase errors, the admin toolbelt). A public surface can never
  silently become admin-only again.
- `scripts/check-pervchat.js` (+27 checks): the ledger/audit/repair unit
  matrix (marker idempotence, audience scoping, joined-later chats, the
  epoch guard, the -big equivalence groups, the repair windows truth
  table, out-of-window never re-sent).
- `scripts/lib/full-worker.js` + `mock-env.js`: the reusable full-worker
  eval harness (TypeScript-transpiled flat body, controllable clock, the
  exact D1 statement surface, Telegram capture incl. FormData sends).
- check-no-miss/check-bot-edges/check-reliability harness updates for the
  new code paths; check-priority's fixed 2026-10-14 kickoffs made dynamic
  (they were a time bomb — the suite flipped red the moment the real clock
  crossed 19:00Z today with zero code changes).
- The 48h ledger read now carries 1h of slack over the audit window (the
  exactly-48h boundary paged falsely — caught by the lifecycle run).
- db/users-schema.sql: the `notify_deliveries_v1` table (+ indexes).

Suite: 1344 checks green (was 1208).

---

## [13.101-trueduels] — 2026-10-14 (true big duels are curated; derbies promote their code names)

The user's follow-up report from the 2026-10-14 UCL night: **"psg vs
manchester city and real vs rome are both called as big duels of UCL"** —
and the companion ask: **"bot must promote derbies (already in the code)
with their code names such as el classico."**

Root cause (the false "big duel"): `specialBanner` gated the
`دوئل بزرگ لیگ قهرمانان اروپا` line on `isMasterPair` — the SETTINGS-driven
master list. The saved admin settings add AS Roma, so Real–Roma qualified
exactly like City–PSG. The master list is followers' business; the big-duel
banner is a curatorial statement.

The fix — a curated list, plus the code names the user asked for:

- **`TRUE_DUEL_ELITE`** (match-classify.ts) — the hand-tuned European
  aristocracy: Real Madrid, Barcelona, Arsenal, Chelsea, Liverpool, Man
  City, Man United, Bayern, PSG, AC Milan, Inter, Juventus.
  `isTrueBigDuel(match)` = BOTH sides in the list (normAlias-folded,
  memoized; settings-proof — the admin panel can no longer mint big
  duels). City–PSG and Barça–Real keep the banner; **Real–Roma plays as a
  normal UCL match** ("leave the rest as they are"). Derby pairings that are
  not both-elite (Der Klassiker, the Madonnina…) are out on purpose — their
  promotion is their code name, not the big-duel line.
- **Derby code names promote in the Champions League too** — `rivalryName`
  gains an `allowUcl` third parameter; `specialBanner` and the notification
  card opt in, so a Clásico in a UCL shirt is still **El Clásico**. The site's
  default callers keep the v13.51 suppression (in the UCL the site's
  boxing/badges treat a pairing as a UCL match).
- **Every marquee pairing carries a Persian code name now** — ال کلاسیکو
  (as before), کلاسیکر آلمان, دربی میلان, دربی منچستر, دربی شمال لندن,
  دربی شمال غرب انگلیس, لو کلاسیک, دربی رم, دربی تورین — the fa banner,
  fa cards and the site's fa badges promote the native name instead of
  dropping the tag.
- **Three named pairings that never reached the label**: the Madrid derby
  (**El Derbi Madrileño / دربی مادرید**) and the Merseyside derby
  (**دربی مرسی‌ساید**) were in the derby machinery but showed the generic
  tag; the **Derby d'Italia (دربی ایتالیا)** joins both tables.
- Tests: new `scripts/check-trueduels.js` (42 checks — the curated matrix,
  the 2026-10-14 night replayed banner-by-banner, settings-poisoning
  proof, MarkdownV2 lint, wiring pins); `live-derby-test` extended for
  allowUcl + the new names. Suite: **1208 green** (was 1166).

## [13.100-priority] — 2026-10-14 (desired-team priority: the marquee game leads everywhere)

Two live reports from the first full UCL night of the season, one root cause:

- **"The site doesn't at all report Manchester City vs PSG — the most
  important game of the month."** Forensics: the match was present in every
  list (upcoming, /matches/today, the UCL card, its own match page) but the
  site's HERO — `nextBig`, the `بازی بزرگ بعدی` H1 + meta description + OG
  tags + countdown — showed Roma–Real instead. Root cause chain: the saved
  admin settings add **AS Roma** to the master list, so Roma–Real was a
  master pair; City–PSG (a curated `BIG_MATCH_UEFA` clash AND a master pair)
  was equally hero-worthy at the SAME 19:00Z kickoff; `pickHeroMatch`'s sort
  had no importance key, so the stable sort fell to pool order — Roma–Real
  sat ahead of City–PSG and the marquee game never led the site.
- **"First show matches where BOTH sides are desired teams, then one side —
  currently the most important match of tonight is at the last item."** The
  UCL night preview listed the night's fixtures by kickoff alone; inside the
  22:30 slot, pool order again left City–PSG last.

The fix — ONE shared tier, applied to every report surface:

- `priorityTier(match, prefs?, chatId?)` (match-classify.ts): 2 when BOTH
  sides are desired (followed — per-chat for the bot, master/settings level
  for the site), 1 when one side is, 0 otherwise, **+1 when
  `isFeaturedMatch`** (the curated big-vs-big list) — the tie-break INSIDE a
  tier, so two both-followed pairs at the same kickoff resolve to the
  marquee clash first.
- `pickHeroMatch`: same-kickoff ties now break by `priorityTier` — live
  matches still lead, kickoff still dominates (the hero stays the NEXT big
  match, not the biggest one far away); the tier only orders the
  simultaneous. Site + bot `/featured` share it as before (ADR-001).
- UCL night preview: the fixture list is now **per-chat** (each chat's own
  desired teams lead), with the v13.96.1 CPU discipline intact — the
  expensive part (the Intl time string) is built ONCE per match per language
  in the fan-out's `lineFor` memo and joined per chat (`uclPreviewOrder` +
  `uclPreviewLine` + a `lineBuilder` injection on `buildUclPreviewMessage`).
- Night digest: the `بازی‌های شما` section sorts by the same per-chat tier
  before kickoff — City–PSG's result opens the digest, LASK–Liverpool no
  longer does.
- Site UCL card (`مسابقات مهم لیگ قهرمانان اروپا`): live-first, then
  `priorityTier`, then kickoff — City–PSG opens the card, and (via the hero
  fix) the homepage, the meta description and the OG preview.
- Suite: new `scripts/check-priority.js` (28 behavioral + wiring checks —
  the 2026-10-14 slate replayed with production-shaped settings), extended
  `check-uclnight.js` (lineBuilder memoization) and `check-no-miss.js`
  (tie-break pins). 1166 checks green (was 1130).

---

## [13.99-uclgif] — 2026-10-14 (the "/" command menu + the UCL night GIF)

Two user reports, one feature each:

- **Typing "/" in Telegram showed no commands.** The bot never called
  `setMyCommands`, so the command menu was empty. Now registered: fa is the
  DEFAULT scope (start/help/teams/follow/next/featured/tables/timezone/lang/
  stop), `language_code="en"` carries the English set, and the owner's chat
  (env.CHAT_ID) additionally gets the toolbelt (/status /members /admin
  /broadcast) via `BotCommandScope { type: "chat" }` — non-owners never see
  the admin commands. `ensureBotMenu` re-registers once per VERSION
  (KV `bot_menu_v1` flag, per-isolate memo — ~4 Telegram calls once, then
  zero per tick); `scripts/set-bot-commands.js` is the manual operator
  re-run and re-uses the SAME lists from `src/telegram.ts` via the harness
  transform (one source of truth). The live menu was registered the same
  hour via the operator script (no deploy needed). `/help` now lists
  `/featured` too (it was a real handler the help body never mentioned).
- **The UCL night GIF** (user-supplied `UCL.gif`, moved to
  `assets/bot/ucl-night.gif` — a TELEGRAM BOT ASSET, marked in
  `assets/_headers` with its cache policy, served at
  `https://sportsignal.ir/bot/ucl-night.gif` by Workers Static Assets).
  On a UCL day (data-driven: the tz-local date has >=1 `CL` match — not
  weekday guessing) every chat gets the GIF twice:
  - **Preview** (`src/digest-uclnight.ts`): the evening's CL fixture list
    with kickoff times — GIF banner (plain-text caption with the full
    Jalali/Gregorian date), then the MarkdownV2 text (`⚽ آرسنال 🆚 شاختار —
    ۲۰:۱۵`). Fires on the first tick inside [first kickoff − 6h, − 10min];
    once per chat per date (`uclnight_<dateKey>_<chatId>`, write-first,
    TTL 36h); wall-guarded (>= 40 skip, banner < 42); body built once per
    language per tz (the v13.96.1 Intl discipline).
  - **Results** (`digest-night.ts`): UCL nights (>=1 CL match in the
    night's set) open with the same GIF (caption "🏆 لیگ قهرمانان اروپا —
    نتایج شب") right before the night digest text — the user's exact
    layout. A failed/missed banner can never block the digest behind it.
  - Telegram uploads the GIF once, caches it as a `file_id` (KV
    `ucl_gif_fileid_v1`, 90-day TTL — instant sends, independent of the
    site); a 400 clears the cache and re-uploads from the URL. No outbox
    for banners (a missed GIF must never queue a retry that could double
    it).
- House-keeping found on the way: `check-userstore.js`'s mock D1 returned a
  sync object from `.run()` — real D1 returns a Promise — so `updSeen`'s 2%
  random cleanup `.run().catch()` threw ~4% of suite runs and masked the
  dup verdict (the pre-existing "replayed update is a dup" flake,
  1-in-~25). Mock fixed to async `run()` (30/30 green, forced-branch
  verified).
- Harness: `scripts/check-uclnight.js` (48 checks — window semantics
  behavioral, MarkdownV2 lint on the built preview, menu legality +
  handler-existence pins, asset/wiring/order pins); suite 1130 green.
  `digest-uclnight.ts` sits after the digest group in the harness order
  (imports tzOffsetMs/dateKeyOf/matchesOfLocalDate FROM digest-night —
  one-directional, no cycle; the pinned digest-group contiguity holds).

---

## [13.98-jalalinight] — 2026-10-14 (the Gregorian night header + the one-game digest)

Two live reports from the first post-migration night (2026-10-14):

- **fa mode must be fully Hijri-Shamsi (Jalali).** The night digest header
  rendered a GREGORIAN `DD/MM` in Persian digits ("خلاصه نتایج شب — ۱۳/۱۰")
  — every other fa surface (match cards, coronation, the site) already
  renders Jalali; the new digest code was the holdout. The header is now
  the full local date in the user's calendar: "خلاصه نتایج شب — سه‌شنبه ۲۱
  مهر ۱۴۰۵" (fa / Jalali) or "Night results — Tuesday, 13 October 2026"
  (en / long-form Gregorian, no more ambiguous 13/10).
- `utils.ts` gains the pure-math Jalali conversion (`toJalaliParts` +
  `jalaliDateFa` + `englishDateYmd` + Persian month/weekday arrays) — the
  same Borkowski algorithm as seo/utils, duplicated because root src can't
  import from src/seo/* (eval harness; RUNBOOK §11). Zero Intl
  constructions (the v13.96.1 CPU discipline).
- The builder now receives the night's tz-local `{ y, m, d }` from the
  caller (the same numbers that form the dedupe key) — the header date and
  the dedupe date can no longer disagree; the old Intl re-derivation stays
  as a fallback for direct callers.

- **The 4:43 AM digest mentioned one game of a twelve-game night.** Root
  cause: the digest fired on the migration night's very first stable deploy
  (01:11Z — the v13.96.1 hotfix landed at 01:04Z mid-night) from a pool
  whose evening chunk was stale (matches finished ~20:50Z; statuses still
  IN_PLAY in the snapshot the merge started from). The 4h stuck-status
  defense correctly unblocked the night — but it also let a HALF-EMPTY
  night through: every stale-IN_PLAY match counted as "resolved" while
  only the actually-FINISHED ones made the message.
- Fix: `nightIsOver` now reports `defended` (matches resolved ONLY by the
  4h defense). The sender defers the digest when the defense carried half
  or more of the night and the window still has hours left (before local
  23h / 5h) — a fresh sweep then completes the night. At the window's last
  hour it sends anyway, so the 2026-10-13 lesson (a frozen pool must not
  block the digest forever) still holds. A deferred night logs
  "Night digest deferred (stale pool: …)" for the tail.
- Timing note (verified from the window logic): a normal matchday digest
  lands within 10–40 min of the last FT (the first hour<6 tick after the
  games end — ~00:30 Tehran for 21:00 CET kickoffs). The 4:41 AM arrival
  was a one-off: the feature's first working deploy landed mid-night
  mid-hotfix during the account migration.

---

## [13.97.1-release] — 2026-10-14 (session close: dedicated-account deployment verified, tagged, released)

The 2026-10-13→14 migration wrap. No behavior changes — this version is the
live marker that the first tagged GitHub release landed on the dedicated
account and that the release deploy is exactly this commit.

- End-to-end verification on the dedicated account (a796fdfe) is COMPLETE:
  site (sportsignal.ir + www + workers.dev), Telegram production webhook
  (a real message flow observed), cron (*/10 notify + */4h refresh landing
  on schedule), KV STATE (211 keys, expirations preserved), D1 (users +
  stats), all six secrets, admin panels, SEO suite 56/56; 1069 static
  checks green at the release commit.
- The old account holds NO SportSignal worker (deleted during 13.95); only
  an inert "moved" zone record remains there (cosmetic).
- Known residuals (documented in RUNBOOK §7b/§8): HEALTHCHECK_PING_URL is
  not yet re-armed on the new account (operator action, needs the
  healthchecks.io ping URL), and the free plan's first-render-per-colo CPU
  dice on fresh URLs (accepted; self-heals as render holds populate;
  Workers Paid is the structural fix).

## [13.97-seocpu] — 2026-10-14 (the SEO cold-render CPU kills — found live on the fresh zone)

The 2026-10-14 post-migration verification caught `GET /teams/villarreal`
dying to `Exceeded CPU Limit` in a live tail. Empirical probe: every SEO page
was FULLY RE-RENDERED every ~60s per colo (slow 0.9–1.1s responses at
`age:0` every minute, cache hits between) — with zero content change.

- Root cause: `wantCached` accepted a `ttl` param that never reached the
  cache — `caches.default.put` derives its TTL from the RESPONSE headers,
  and every HTML page ships `s-maxage=60` (PF-01). The Cache API copy
  expired with the edge: renders every minute per colo per page; on the
  free plan's 10ms rolling CPU average, fresh isolates + crawlers on the
  fresh zone kept rolling the kill dice.
- `wantCached` (seo/router.ts): the ttl is now REAL — the stored copy is a
  header-rewritten clone (`cache-control: public, s-maxage=<ttl>` + the
  original public policy carried in `x-ss-cc`); on a hit the public header
  is restored before serving. Public edge/browser freshness semantics are
  byte-identical (max-age=0 + s-maxage=60 + SWR=300); only the RENDER
  cadence changes.
- Per-page render holds (`SEO_PAGE_TTL` 900s default): the homepage holds
  300s; `/matches` + `/matches/today` drop to 300s while any pool match is
  live; a match page holds `LIVE_PAGE_TTL` 120s while IN_PLAY/PAUSED, an
  upcoming match's hold lapses just after kickoff (secs+120, ≤900), and
  finished match pages hold the full window (history is immutable).
- The wantCached ttl param also accepts a getter (evaluated AFTER render —
  the page knows its own liveness only then).
- scripts/seo-check.js: the R-13 workers.dev probe pointed at the OLD
  account's subdomain (sedanama-ir) — now the dedicated account's
  (sportsignal.workers.dev).

---

## [13.96-nightdigest] — 2026-10-14 (the end-of-night consolidated results digest — "آرسنال در مقابل برنده شد. رتبه فعلی:")

The user's ask: CL nights have a handful of games — at the end of the night
they want ONE consolidated message with every result, their followed team's
result as a won/lost/draw sentence, and its current table rank.

- New `src/digest-night.ts` (`maybeSendNightDigest`): fires per chat per its
  OWN timezone when the local matchday is over — every match of that local
  date is FINISHED (POSTPONED/CANCELLED/AWARDED/SUSPENDED count as resolved),
  with a 4h-past-kickoff defense so a frozen IN_PLAY pool (the 2026-10-13
  lesson) can't block the digest forever. Early morning (hour < 6) summarizes
  YESTERDAY's evening; hour 20–24 summarizes today; daytime never sends.
  Requires ≥ 1 FINISHED (a no-football night is silent).
- Message: followed-team section (up to 6) — "⚽ آرسنال در مقابل لیل برنده شد — ۳-۰"
  + "📊 رتبه فعلی: ۳ | ۶ امتیاز" (rank via fetchStandings 10-min freshness,
  stale-cache fallback, cups skipped) — then every other result of the night
  grouped by competition (Farsi names + digits, MD-escaped), capped at 20
  lines with "+N بازی دیگر".
- Side-aware perspective: `userFollowsSides` added to users.ts — the verdict
  sentence reads from the followed side (an away-followed Lille-home fixture
  no longer reads backwards; master-list fallback included).
- Discipline: write-first per-chat dedupe `nightdigest_<date>_<chatId>`
  (TTL 36h); per-chat try/catch (one dead chat can't kill the loop); the
  whole digest skips ticks at subrequest ≥ 44 (v13.94 wall-proofing); rides
  the tick's MERGED LIVE pool via ctx so tonight's statuses are final minutes
  before the KV pool persists them.
- Harness: scripts/check-nightdigest.js — 19 checks (write-first order, key
  format, rollover, daytime gate, stuck-defense, wall guard, rank line,
  wiring, + behavioral evals of nightIsOver/dateKeyOf on the real source).
  worker-src.js order updated in the same commit.

---

## [13.95-accountmigration] — 2026-10-13 (dedicated Cloudflare account — the KV-quota divorce from currena)

The whole deployment moved from the shared account (where the account-level
KV write quota collided with currena's RATES namespace — the root cause
behind the daily error-10048 lockouts documented in v13.92) to a dedicated
account. The zone sportsignal.ir moved with it (NS now hera/rob.ns.cloudflare.com).

- KV STATE: 121/121 keys migrated byte-identical (expirations preserved via
  multipart metadata), then re-synced after the last old-worker tick.
- D1 sportsignal-users (6 tables, 46 rows) and sportsignal-stats (5 tables,
  89 rows): schema + rows recreated on the new account, counts verified.
- Secrets: BOT_TOKEN / CHAT_ID carried over; WEBHOOK_SECRET, ADMIN_TOKEN and
  ADMIN_PASS REGENERATED (secret values are write-only by design — the old
  ones are unrecoverable through any API). The Telegram webhook was re-registered
  against the new WEBHOOK_SECRET. API_TOKEN (football-data.org) must be re-set
  by the operator (see RUNBOOK §1).
- Two-phase deploy: worker created WITHOUT cron schedules → secrets set →
  state re-sync → schedules re-armed → OLD worker's schedules deleted — this
  ordering guarantees no tick ever fires without BOT_TOKEN (write-first dedupe
  would otherwise burn dedupe keys without sending) and no double-send window.
- Custom domains re-attached on the new zone: football.sportsignal.ir +
  sportsignal.ir (worker domains), www.sportsignal.ir/* (route).

---

## [13.94-fanoutfix] — 2026-10-13 (the notification fan-out made wall-proof + quota-proof — "I get all 3, other users get 1")

User-reported, live-diagnosed with a retained `wrangler tail` (13:41Z→) + KV/D1 readbacks: the admin receives every notification flawlessly while other registered users receive none or only some ("another user received one of tonight's 3 matches, I received full 3"). All 4 chats probed alive via getChat — not a blocked/dead-chat problem. The live forensics found THREE interlocking root causes:

1. **The mid-flight fan-out death (the admin/others differential).** The runtime's ~50-subrequest ceiling is per-invocation and Cloudflare's accounting is coarser than the worker's fetch-only meter (the 15:30Z tick: meter read "50/48" while sportscore/standings/wikipedia calls were already rejected; the 15:40Z tick ran 30 fetches + 30 KV ops = 60 "true" and survived — per-colo variance we cannot see or rely on). The old notify guard could only stop BETWEEN matches (fetch counter > 38) — a fan-out it let through could die MID-FLIGHT: the roster-order-FIRST chats (the admin is chat #1) got their cards, the tail chats lost card + text fallback + outbox entry in one cascade, all under an already-persisted write-first dedupe record = PERMANENT silent loss for exactly those users.
2. **Whole matchdays lost to the wall.** Busy-tick compositions (full sweep + sportscore day-loop + cup scans + standings) burn 40-50 fetches before the notify phase — every in-window tick defers, the window closes, the type never fires for ANYONE. The audit held the evidence: 2026-10-09/10/10/11 gaps (Dortmund-Werder, Arsenal-Leeds, Chelsea-Bournemouth, Barca-Getafe, ManUtd-Tottenham, Liverpool-ManCity, Como-Roma, Sassuolo-Milan, Cagliari-Juventus — zero records, zero sends).
3. **The KV quota kills the write-first gate every evening.** The account-level daily quota (10048, measured live via REST probe at 17:15Z today) makes saveNotifiedMatch fail from ~14:00 UTC — every send defers; when the failure outlives the windows, whole evenings vanish (the same audit gaps). The cron path's writes passing today (while visitor writes failed) is per-colo enforcement variance, not a guarantee.

The fix (all three):

- **THE FAN-OUT RESERVATION** (`fanoutReservation` in notify-engine.ts): before ANY dedupe write, each (match, type) unit projects its worst-case cost (2 crest fetches/group + 2 sends/chat + the dice for match-start + margin) against the TRUE count (fetch + KV ops) and the new `SUBREQUEST_FANOUT_CAP: 46`. Verdicts: **full** (cards + text), **lean** (match-start only — must-fire semantics degrade to text-only, no cards/dice, when only the full fan-out cannot fit), **defer** (a CLEAN deferral — no dedupe write happened, so the next tick retries inside the same window; every window is ≥45min wide and the backfill legs cover the rest). A mid-flight death is now impossible by construction. The old between-matches guard is REMOVED.
- **Maintenance demoted below the product**: cron's phase order is now pool → **notify** → maintenance → public (was: maintenance before notify — the cup scans' ~12 fetches (429 retries) + standings refresh spent the budget a pending fan-out needed). runPoolMaintenance additionally skips busy ticks entirely (true count > `FANOUT_MAINT_MAX: 30`) — every step inside has its own marker/due-gate, so an idle tick picks the work up.
- **The notified-store on D1** (`notified_v1` table, binding USERS_DB): the write-first dedupe INSERT OR IGNORE against the (match_key, ntype) PRIMARY KEY — atomic check+write (the KV blob needed a whole-key read-modify-write), durable 24/7 on D1's separate 100k-writes/day tier regardless of the account KV quota. changes>0 = persisted → the fan-out proceeds (write-first preserved); changes=0 = already sent → skip; D1 failure → false → the send defers (fail-closed preserved). Legacy paths VERBATIM when USERS_DB is unbound or the sim override is set (notified_matches_v6 blob, SIM keys, byte-identical contracts). One-time KV→D1 import behind the `notified_migrated` marker in userstore_meta (self-healing, empty-after-marker means empty); the probabilistic cleanup (2%) keeps rows 14 days past their window (never-re-arm is absolute while a window could matter — the horizon fence never looks past ±3 days).
- **Per-chat outcome visibility**: the notify breadcrumb now carries `o` (sent/failed/dead per chat across the round) + `dk` (the deferred (match,type) keys, capped 12) — the old "at least one send landed" (anySuccess) blindness is exactly what hid the tail-chat losses from every log and counter.

Harness co-evolved in the same commit: check-reliability's #6 section rewritten for the reservation (the old guard must stay GONE; the verdicts; the true-count read; the lean degradation; the D1 store's INSERT OR IGNORE + fail-closed + sim isolation + marker semantics; the maintenance demotion + phase order); check-no-miss Section VI (behavioral, the REAL sliced functions): fanoutFetchCost math, the full/lean/defer verdicts at controlled budgets, the D1 dedupe round-trip + duplicate + fail-closed + KV-fallback + marker-less self-heal + empty-after-marker + sim isolation + the legacy KV path. Suite 1002 → 1042 green, tsc clean.

---

## [13.94.1-cpukeeper + 13.94.2-foldfix] — 2026-10-13 (the CPU-kill spiral, found and fixed LIVE during the match-start rounds)

Twenty minutes after v13.94 shipped, the 19:00Z match-start round provided the next live lesson: the tick was killed MID-FLIGHT by Cloudflare (`outcome: exceededCpu` — twice in a row; the 19:10 retry died even earlier). Root cause: the match-start fan-out re-rendered cards the 1h round had rendered 90 minutes earlier (the card cache TTL was 1h — lapsed) — 4 fresh resvg renders in one tick pushed the account over the free-plan 10ms rolling CPU average, and every retry re-rendered and died again (the spiral). The match-start windows (-1..+45min) were burning away with zero records.

- **13.94.1-cpukeeper**: the timing-critical types (`match-start`, `pre-match-5min`) now read the card from CACHE ONLY — `cachedCardPng` never falls through to a render; a cache miss degrades to the text fallback (the existing per-chat fallback structure). The card cache TTL went 1h → 4h so the 3h/1h rounds prewarm exactly what the match-start round serves from cache (zero render CPU on the timing-critical path). 
- **13.94.2-foldfix**: the completion blob folds `o` (per-chat outcomes) + `dk` (deferred keys) into the notify breadcrumb at the top level.
- LIVE-VERIFIED (the 19:20Z retry, first tick on the new code): all 3 match-starts + City-PSG's 24h fired, `outcome: {"sent": 16, "failed": 0, "dead": 0}` — all 4 chats × all 4 notifications, zero failures, tick outcome `ok`, and exactly ONE clean in-window deferral (Bodo-Dortmund's 24h, retried next tick) logged with its key. The D1 dedupe records for every unit persisted. Suite 1043 → 1048 green.

---

## [13.93-fullrec] — 2026-10-13 (full-table season chips + windows for every team)

The v13.88 handover item closed: bottom-half league sides (rank 9+) were invisible to the payload's top-8 standings compacts — their match-page season chip silently dropped and their team page had no standings window. Both now read the FULL cached tables (the same source the competition pages render since v13.89).

- `fullByCodeFor` (pages.ts): the shared cache-only loader — fullStandings per competition code, the payload shell's faName/emblem riding along. Match pages load ONE code (the match's comp); team pages ≤ 2 (derived from the team's OWN fixtures — the league always appears there; see the LIVE-QA lesson below). Fail-closed per code: a missing/stale cache → the payload path, exactly v13.88 behavior.
- `teamSeasonRecord`/`teamStandingsWindow` gain the optional `fullByCode` param (searched BEFORE the payload compacts — fresher + complete; the payload stays the fallback). Every league side gets its chip; every ranked team gets its window; the window's next-comp preference and top-3 clamping are unchanged (locked behaviorally).
- The season chip gains the standings-rank badge «ردیف ۲» (fspos) — the context that makes W/D/L counts readable at a glance; absent when pos is null (cup/UCL shells without pos).
- Styling polish: .strow-me gains an inline-start sky accent bar + hover lift; .fdot hover scale (1.14, 120ms); all disarmed under prefers-reduced-motion.
- Harness (same commit): 3 updated locks (the new signatures/wiring), 6+1 new v13.93 locks + 2 behavioral evals of the REAL functions (rank-14 chip from the full table; full-table-beats-stale-payload; both-miss fail-closed null; rank-12 window 10-14 with meIdx 2; cup-next fallback still finds the league; top-3 clamp from the full table; the richest-record regression). Suite 995 → 1002 green, tsc clean.
- TWO LIVE-QA iterations (found on the deployed pages, fixed same version): (1) the fullByCode code source for team pages was initially the payload comps — but a rank-9+ team is invisible in the top-8 compacts BY DEFINITION, so its league chip silently fell back to a 1-game UCL record; the codes now derive from the team's OWN fixtures (the league always appears there). (2) a standings_cache_CL exists (the 36-team UCL table) and recCodes ordered the next-fixture cup FIRST — the 1-game UCL record drowned the 9-game league season; teamSeasonRecord now collects candidates from all three sources and the RICHEST wins (most played; ties keep source order full → payload → ucl). LIVE-VERIFIED after both fixes: /teams/liverpool «ردیف ۹ ۲ب ۳م ۱ش از ۶ بازی لیگ برتر انگلیس» and /teams/manchester-united «ردیف ۱۳ ۱ب ۳م ۲ش از ۶ بازی لیگ برتر انگلیس» — both rank-9+ sides previously invisible. Match pages keep their 1-read budget (the match's comp only — a UCL match honestly shows the UCL record; the side's league record lives on its team page).

---

## [13.92-d1userstore] — 2026-10-13 (user data on D1 — quota-proof user writes)

Root cause measured live (GraphQL KV analytics + REST probes): the Workers free-plan KV write quota is ACCOUNT-level, and this account also hosts the sibling currena workers — by 14:00 UTC the two apps had written 631 (STATE) + 658 (RATES) = 1,289 keys, so every `put` fails with error 10048 until the midnight-UTC reset. That is Tehran prime time: every /timezone, /follow, /lang and /start tap failed (honestly surfaced since v13.91, but still failing). The v13.91 handover's candidate (a) is now shipped, following the v13.56 pageviews precedent.

- NEW `src/user-store.ts` — the user-data seam: user prefs / chat registry / chat profiles / Telegram update dedupe on a dedicated D1 database (`sportsignal-users`, binding USERS_DB; D1 free tier = a SEPARATE 100k writes/day). User actions are writable 24/7 regardless of the account-level KV quota. Per-row atomic upserts also kill the old whole-blob read-modify-write race (two concurrent users editing different rows used to clobber each other's prefs).
- Contract discipline: with USERS_DB unbound (local dev / eval harness / a missing binding) every function serves the EXACT legacy KV paths — byte-identical key contracts (user_prefs_v1 / telegram_users_v6 / user_profiles_v1 / upd_<id> TTL 600). Reads under D1: table first, legacy KV snapshot on D1 error (fail-open). Writes under D1: table only (a KV mirror would re-burn the quota we are escaping); failures return false so the v13.91 honest-failure UX keeps working.
- Migration: one-time KV→D1 backfill (scripts/backfill-userstore.js — parameterized D1 REST inserts, idempotent) + the `userstore_meta.migrated_at` marker. AFTER the marker, an empty `chats` table means EMPTY — a /stop-ed roster is never resurrected from the stale KV copy. A marker-less empty table self-heals once from the legacy snapshot (fresh-DB recovery). Semantics preserved verbatim: /stop prunes the registry only (prefs stay orphaned); /follow all wipes the row (lang+tz go too); admin clear-locks wipes the registry (prefs/profiles survive); upd dedupe stays write-first + availability-first.
- 13 write sites rewired through the seam: bot.ts (lang: registration, tf:all/tf:<n> team toggles, tz:reset/tz:<city> with the v13.91 guards, per-message profile upsert — now a single-row read + upsert, /start join, /stop, /follow all, /follow nums, /timezone reset/city, upd dedupe), users.ts (getRegisteredChats/getUserPrefs/getBotMembers/setUserLang delegate), notify-engine + digest-bigmatch dead-chat prunes, admin-ops clear-locks, admin-bot chatProfile.
- Behavior improvement (documented): a FAILED registration no longer dead-ends the welcome — the user flow continues and INSERT OR IGNORE retries on their next interaction (the old path threw and lost the welcome entirely).
- Harness co-evolution (same commit, RUNBOOK §11): worker-src concat gains user-store.ts before users.ts (module comment documents the position rule); check-join-flow / check-bot-edges / check-admin eval the REAL user-store source now (their stubs masked the [CHAT_ID] registry seed — the real semantics are locked: fresh registry seeds with the admin, /stop leaves the seed member in place); NEW scripts/check-userstore.js (mock D1): D1 round-trips, full-row replace, explicit-null shape parity, register/remove/prune/reset, updSeen new/dup/D1-error-proceeds, empty-after-marker no-resurrection, marker-less self-heal, D1 read-fail fallback, D1 write-fail honest false + NO KV mirror, sim isolation, legacy upd_ write-first. 963 → 965... plus the new file's 29 checks: suite total 994.
- The deferred live E2E (tz write-path, quota-blocked since v13.91) is now quota-free: D1 writes don't touch the KV limit.

---

## [13.91-tzquota] — 2026-10-13 (honest tz saves under KV quota pressure)

Live-E2E finding: the STATE namespace hits the free tier's 1,000-writes/day ceiling late in the day (healthz's kv_writes_day counter tracks only ~28% of real puts — a monitoring blind spot). When the quota is exhausted, every prefs write (timezone, teams, language) failed with a hanging spinner and nothing told the user why.

- tz save paths (the tz: callback AND /timezone <city>) now guard the prefs put: on failure the user gets an honest «⚠️ فعلاً ذخیره نشد — بعداً دوباره امتحان کنید» toast/message, and NO confirm view is ever rendered for a tz that was not persisted (write-first honesty extended to the failure branch).
- Harness: +2 behavioral checks (throwing-put env: the callback answers retry-later + sends no edit; the command warns + never claims success). 961 → 963.
- Known-issue documentation (worklog): the structural fix candidates are (a) migrating user_prefs_v1 to D1 (the v13.56 pageviews precedent — D1 free tier allows 100k writes/day), (b) instrumenting the uncounted put sites into kv_writes_day, or (c) reducing heartbeat cadence. Not addressed in this version.

---

## [13.90-tzonboard] — 2026-10-13 (timezone onboarding + the region picker with live local times)

The big one users asked for: a member in Sydney and a member in New York get their alerts at THEIR local hours. The timing engine was already per-tz (morning digest at 9am local, per-tz render groups) — but nobody was ever ASKED their tz, so everyone silently ran on Tehran time.

- Onboarding: the language tap on /start now follows the welcome with the timezone prompt (region picker) for every user with no tz set. Returning members get it on their next /start (once; a set tz never re-prompts — the lang: tap path and the /start path both check). Users who ignore it keep the Tehran default (fail-closed, zero behavior change for lurkers).
- The region picker: hub (🇮🇷 Tehran one-tap quick-pick with live time · 6 regions · reset) → region pages (43 cities across Europe/Middle East/East Asia/North+South America/Oceania). Every city button carries its LIVE local time (HH:mm, Persian digits for fa) — the self-confirming signal: tap the button whose clock matches yours. The current zone is ✅-marked.
- Select + confirm: tapping a city SAVES the tz immediately (write-first) and edits to the confirm view — zone + your local time + UTC offset, «✅ بله، درست است / Yes, correct» (finalizes, buttons removed) or «🔀 تغییر منطقه» (re-opens). tzok → the done text with the /timezone reminder.
- /timezone (the «زمان» reply-keyboard button) now opens the same hub; /timezone <city> and /timezone reset unchanged (35 new TZ_ALIASES: vienna/athens/riyadh/kuwait/seoul/shanghai/jakarta/chicago/denver/vancouver/mexico-city/sao-paulo/buenos-aires/lima/bogota/santiago/caracas/auckland/wellington + popular European inputs).
- The tz status now reads «منطقهٔ زمانی شما: Europe/London — ساعتِ شما: 14:32 (UTC+1)» — offset + live time always visible.
- Admin: the /members roster shows each member's zone (⏰ tz or «تهران (پیش‌فرض)») — the rollout is observable.
- FIXED two latent MarkdownV2 delivery bugs found by live-API QA: (1) BOT_STRINGS' single-escaped \! and \. produced no backslash at runtime → the post-language-tap welcome 400'd and NEVER DELIVERED (every new member's first welcome was silently lost since v13.72's slim-down); (2) the /timezone status tail carried raw «>» in «/timezone <city>» → 400 (no-arg /timezone never delivered since v13.49). Both double-escaped now; the new harness check locks the FULL reserved set (_*[]()~`>#+-=|{}.!) over every new tz text.
- Harness: +34 checks (69 in bot-edges: onboarding no-nag rules, region rendering, ✅ marks, live-time labels, back/fail-closed navigation, write-first confirm, tzok dismiss, real toFaDigits/escapeMarkdownCharacters slices, TZ_REGIONS 43-slug integrity + Telegram charset safety, offset correctness incl. the quarter-hour Kathmandu zone, MarkdownV2 cleanliness) + 4 reliability locks (tzr/tzok handlers, both prompt sites) + admin B11 updated for the prompt. 927 → 961.

---

## [13.89-stdetail] — 2026-10-13 (W·D·L columns, the honest full table, interaction polish)

- Standings tables gain the compact W·D·L column «ب-م-ش» («۶-۲-۱» per row, each count in its win/draw/loss hue, tabular digits, hover title «برد-مساوی-شکست») — BOTH the team-page window and the competition full table. Desktop-visible, hidden ≤600px (mobile keeps pos/name/pts). Fail-closed cell: rows without stats render «—».
- «جدول کامل» is now honest: competition pages read the FULL cached standings table (`fetchStandings(env, code, false)` — ONE cache-only KV read, allowFetch=false never touches a provider, the seo layer's reads-only-KV contract holds; fail-closed to the payload's top-8 compact when the cache is missing). The team window's «جدول کامل» link used to lead to a top-8 table.
- Full-table rows gain faName via the isolate-cached translateTeam (same mapping the payload uses); emblem/fa shell still rides the payload.
- Season chip clarity: «از ۸ بازی لالیگا» — the competition name rides the chip (mixed-source records like a UCL match with one side's La Liga record and the other's UCL record now read unambiguously).
- Interaction polish (a11y + detail): `:focus-visible` rings on every interactive surface; .hubtile hover lift (-1px); .stmore/.pagination hover states; prefers-reduced-motion disarms the lifts (the live-pulse rule already existed).
- Harness: 6 new checks (stWdlHtml in both tables, header count, full-table cache-only + async wiring, translateTeam mapping, chip comp name, styles + a11y + reduced-motion). 921 → 927.

## [13.88-formagg] — 2026-10-13 (the season-record fallback + form reaches team pages)

Closes the v13.87 handover item "the form strip is fail-closed-dark TODAY": the seo archive is still young, so match pages rendered NO form card at all. The standings snapshots the payload already carries (played/won/draw/lost per team) light the card honestly TODAY — zero new subrequests.

- `teamSeasonRecord(ctx, teamName)` (seo/data.ts): payload-only lookup (5 league compacts + PGL + the full UCL table), returns won/draw/lost/played/pos/points + comp identity, null when the team is in no table (fail-closed). No fetches, no KV — the data rides the payload the page already loaded.
- Match pages «فرم اخیر»: a side with no per-match dots falls back to its season chip («۶ برد · ۲ مساوی · ۱ شکست از ۹ بازی») — visually distinct from dots (flat pill, three count segments in the win/draw/loss hues, no fake per-match granularity). The card title honestly switches to «وضعیت فصل» when neither side has dots. Still fail-closed: no dots AND no record → no card.
- Team pages: the form card reaches them (the v13.87 deferred item) — «فرم اخیر {team}» with dots when ≥3 finished rows exist, else «وضعیت فصل {team}» with the season chip. buildTeamPage is async now (one bounded archive KV read per render, fail-closed — same contract as the match pages).
- Team answer sentences (and meta descriptions) now carry the standings position from the window's own snapshot row: «…با ۱۵ امتیاز در ردهٔ ۲ لیگ برتر انگلیس قرار دارد.» One source of truth (teamStandingsWindow's me-row), no extra reads.
- Shared renderer `formRowHtml` (one row = dots + summary OR season chip) for both pages; dot legend microcopy («ب برد · م مساوی · ش شکست») under any card that shows dots.
- Styling (inline page-shell block — no asset rename, ADR-006 respected): `.fseason` chip family (.fsw/.fsd/.fsl/.fsplayed, tabular digits), `.formlegend` with reduced-footprint dots.
- Harness: 7 new checks in check-stats (wiring, payload-only fail-closed, title switch, async team build + router await, answer position, styles) + a BEHAVIORAL eval of the real teamSeasonRecord (brace-matched extraction, TS stripped by exact-string drift locks): finds a PL row with its numbers, falls through to ucl.teams via normalizeTeamName's club-prefix folding, null for an unknown team.

## [13.87-formtable] — 2026-10-13 (the league-table window + the recent-form strip)

Both cards ride data the pages ALREADY hold (zero subrequests, fail-closed: no data \u2192 no card):

- Team pages (/teams/{slug}): the \u00ab\u062c\u062f\u0648\u0644\u00bb window \u2014 a 5-row standings neighborhood (2 above, the team highlighted via .strow-me, 2 below; clamped at the top when the team is top-3) from the payload's standings snapshots, with a \u00ab\u062c\u062f\u0648\u0644 \u06a9\u0627\u0645\u0644\u00bb link into the competition page (internal-linking + engagement). Picks the NEXT fixture's competition, falling back to any table containing the team (covers cup-next pages).
- Match pages: \u00ab\u0641\u0631\u0645 \u0627\u062e\u06cc\u0631\u00bb \u2014 both sides' last-5 W/D/L as \u0628/\u0645/\u0634 dots (green/gray/red, hover title with opponent + score + date) + a W\u00b7D\u00b7L count summary. From the pool's 30-day FINISHED rows; a side with <3 results drops out, both sides short \u2192 no card.
- Styling: .strow-me sky-accent highlight (the .mcount/.mvenue-map family), .stmore footer link, .formstrip/.formrow/.formdot .fw/.fd/.fl with tabular digits + reduced footprint on mobile.
- New data helpers: teamStandingsWindow + teamForm (seo/data.ts \u2014 content-additive; seo/* is NOT in the eval harness, so no worker-src changes; new static locks in check-stats).

## [13.86-groundsfix] — 2026-10-13 (QA-found name-form bugs: the hero match gains its venue)

**The QA finding that closed itself:** the live hero match page (Club Atlético de Madrid vs Manchester United) rendered with NO venue while the home-ground table held the Metropolitano — FD sends the full club-prefixed name, the v13.85 table keyed the short form, and `normalizeTeamName` never strips club prefixes. Inter home fixtures missed for the same reason (FD: "FC Internazionale Milano" vs key "Inter Milan").

- `grounds.ts`: map keys + lookups now fold through `normTeamKey` (strips club/afc/rcd/rc/deportivo/athletic/racing prefixes on BOTH sides) — the FD full form, the short form and the table key collapse to one key. Harness co-evolved in the same commit (check-venue evals the REAL normalizers now — the folding is the behavior under test; live-derby's grounds slice extends through curatedVenueFa).
- `TEAM_STADIUMS`: provider variant keys added ("Atlético Madrid", "FC Internazionale Milano"); the three followed clubs missing from v13.85 added — Tottenham (Tottenham Hotspur Stadium / ورزشگاه تاتنهام), Juventus (Allianz Stadium / ورزشگاه آلیانز تورین — distinct from Bayern's Arena), AS Roma (Stadio Olimpico / ورزشگاه المپیکو).
- `curatedVenueFa(venueEn)` (grounds.ts): reverse lookup for PROVIDER venues — a live-detail venue arriving as the English ground name ("Anfield") resolves to the curated Persian name, so one ground shows ONE Persian name everywhere. Before: live rows carried the AI-learned transliteration ("انفیلد", "ولد ترافورد") while scheduled rows of the same fixture showed the curated ("ورزشگاه آنفیلد"). Exact case-insensitive match, no suffix stripping — "Allianz Stadium" ≠ "Allianz Arena".
- pubMatch + the seo hydrate FD-detail path prefer `curatedVenueFa` → the dictionary → the raw string.
- Suite: 895 → 905 checks.

## [13.85-stadiumchip] — 2026-10-13 (venue chips everywhere + the sibling loop reaches team pages)

The v13.82 venue architecture had one blind spot: the home-ground table only
lit up the seo MATCH pages — the public payload rows (homepage lists, live
section, this-week) had no venue for scheduled matches, so the already-built
client venue chips stayed dark. This round routes the SAME table + gate into
pubMatch and extends the sibling-fixtures loop to team pages.

- **grounds.ts (new root module)**: the home-ground table lookup + the
  one-off-neutral gate, extracted from seo/data.ts's hydrateMatchVenue
  stage-0 — ONE source of truth consumed by BOTH the seo match pages
  (hydration) and pubMatch (the public payload). Bare-param style on purpose
  (harness module; strict:false — RUNBOOK §11: no new transform rules).
- **pubMatch adoption**: provider venue first (TSP/live-detail), then the
  home-ground table — fills-only, never overwrites. venueFa prefers the
  table's curated Persian name over the venue dictionary. One-off-neutral
  stages (FINAL/THIRD_PLACE; round "Final" but never semi/quarter/qualif)
  skip the table.
- **Client chips go bilingual**: public-13.25.js → public-13.26.js
  (rename-on-edit) — both venue-chip render paths (live rows + this-week)
  now show the curated Persian ground name in fa mode (venueFa || venue
  fallback) instead of English-only.
- **Team pages join the sibling loop**: /teams/{slug} gains the
  "بازی‌های مرتبط" card (similarMatches of the team's NEXT match, cap 6,
  canonical links, same simcard/simcount styles as match pages) — every
  team page now cross-links its matchday siblings (internal-linking loop).
- **Co-evolution**: worker-src order +grounds.ts (before public-matches,
  after config/teams); check-venue retargets (pubMatch fills-only pattern,
  chip fa-mode pattern, REAL-grounds eval with identity normalize stub) +
  3 new behavioral checks (table fills, FINAL skips, provider wins);
  live-derby prepends the grounds block; check-stats: homeGround stub for
  the path evals, gate checks retarget to grounds.ts, team-page simCard
  lock, public-13.26 pins (incl. the escaped-regex trap both 13.25 forms);
  parity fixtures re-baselined (public page script-src only).
- Suite 888 → 895.

---

## [13.84-admi18n] — 2026-10-13 (the orphan data-i keys: hStats/btnStats + core-13.10 rename)

QA finding from the v13.83 session, fixed as its own reviewed version: the
admin visit-stats card heading (`data-i="hStats"`) and its refresh button
(`data-i="btnStats"`) had NO I18N entries in the core asset — the LIVE admin
dashboard rendered the raw key strings "hStats"/"btnStats" in BOTH fa and en.
A template-side sweep proved these were the only orphans (data-i/data-p/T()
vs the dict); the sweep is now a permanent lock in check-stats so a future
key typo can't resurrect silently.

- **core-13.9.js → core-13.10.js** (rename-on-edit rule for immutable
  versioned assets): adds hStats/btnStats fa+en (fa wording matches the
  original template text: «📊 آمار بازدید» / «🔄 به‌روزرسانی آمار»; en:
  "📊 Visit Stats" / "🔄 Refresh stats"), and drops the dead `ver` fa/en
  dict keys — stale v12.33-xpost text, unread since the footer moved to the
  live `${VERSION}` interpolation.
- References updated in the same commit: admin composer, login.ts,
  public.ts, assets/_headers immutable pin; check-stats core pins retargeted
  (including the old "renamed from 13.8" homepage check) + the orphan sweep
  lock added.
- Parity fixtures re-baselined (--update, reviewed): the only diff per page
  is the script-src line core-13.9→core-13.10 (+1 byte); harness diff
  output attached to the worklog entry. Template bodies untouched.

---

## [13.83-admintplsplit] — 2026-10-13 (admin template split + shared styles + the parity harness)

Closes the last item from the hygiene session's "deliberately deferred"
list: the 683-line `pages/admin.ts` monolith and the ~2KB of byte-identical
inline CSS/JS triplicated across admin/login/public. The precondition was a
parity harness — this version ships it FIRST and proves the refactor under
it (RUNBOOK risk discipline: template surgery needs a byte guard).

- **Byte-parity harness** (`scripts/check-admin-parity.js` + frozen baselines
  in `scripts/fixtures/`): renders ADMIN_PAGE / LOGIN_PAGE / PUBLIC_PAGE from
  the pages blob (fixed stubs for VERSION/UCL_LOGO_CHIP so version bumps
  never invalidate the baseline) and byte-compares against the fixtures;
  `--update` is the deliberate, reviewed re-baseline path. Already caught a
  real trap on its first run: alphabetical eval put styles-shared.ts AFTER
  its consumers — template literals evaluate at declaration time, so the
  interpolation read `undefined`. The harness now orders dependency-first
  (ESM semantics), the same principle as the worker-src concat.
- **The split**: `admin.ts` 683 → 28-line composer over `admin-css.ts` (107),
  `admin-html.ts` (96, carries the `${VERSION}` footer), `admin-js.ts` (471)
  — output byte-identical (39942B = baseline 39942B).
- **Source-level dedupe** (`styles-shared.ts`): THEME_INIT_SCRIPT + FONT_FACES_STYLE,
  previously byte-identical inline in admin/login/public (~2KB of source),
  now authored once and interpolated at the same byte positions — output
  unchanged (login 6362B = 6362B, public 30051B = 30051B).
- **Visual parity pass** (agent-browser, wrangler dev seeded from the live KV
  snapshot): admin dashboard fa/dark desktop fingerprint (13 selectors × 10
  computed-style props) IDENTICAL before/after; light theme + mobile 390px
  identical (no overflow, members grid 96px/1fr/70px); homepage fingerprint
  identical; zero console errors on every pass.
- **Co-evolution** (same commit): check-stats.js retargets the stats-wiring
  regexes to admin-html/admin-js + new locks (thin composer ≤40 lines,
  styles-shared consumed by all three, split modules exist, harness in the
  test chain); test chain grows to 883 checks (871+12); worker.ts layer-map
  comment updated; README deferred list closed. worker-src.js concat needed
  no change (pages/*.ts ride readdirSync; harness keeps its own order).

---

## [13.82-matchday] — 2026-10-13 (venue hydration + map links + sibling fixtures)

Feature/fix round (worklog Task 48). QA found the v13.81 `.mvenue` element
was dead code — no provider supplies venue for SCHEDULED matches (FD's list
endpoint returns none; verified live: venue null on every upcoming row incl.
Emirates-hosted fixtures). This round makes the venue real, turns it into a
place (Maps), and adds the sibling-fixtures card.

- **Venue hydration** (`src/seo/data.ts` `hydrateMatchVenue`): the match-page
  render now hydrates the venue from the FD DETAIL endpoint (`/v4/matches/{id}`)
  — the one reliable source — before any venue consumer runs (answer sentence
  G-03, facts table, `.mvenue`, meta description all read `sm.s.venue`).
  Budget discipline: numeric-FD-id gate (tsd-/spsc- rows skip), ONE attempt,
  5s race guard (a slow FD can never hang the render), fail-closed on any
  error (page renders exactly as before), KV-cached 24h positive AND negative
  (`venue_v1_{id}` — a venue-less match re-checks at most once a day), and
  the page HTML cache means repeat views never re-fetch.
- **Venue → Maps link** (`src/seo/pages.ts` `venueMapLink`): the scoreboard
  `.mvenue` and the facts-table venue row are now Google-Maps search links
  (`maps/search/?api=1&query=<venue> stadium`, no API key) — pill styling
  consistent with `.mcount`, ↗ off-site indicator, sr-only label, hover/active
  states. Query uses the Latin venue name (Maps' index), link text stays
  Persian (`venueFa`).
- **Sibling-fixtures card** (`src/seo/data.ts` `similarMatches` + match page):
  "بازی‌های مرتبط" — same competition+stage (matchday number, round-string
  fallback for TSP/sportscore rows) first, then the competition's next
  fixtures, then same-UTC-day matches from other competitions; upcoming-only,
  self-excluded, deduped by pairing, kickoff-ordered, capped at 6; count chip
  in Persian digits. Every row links to its own match page canonically — the
  internal-linking loop the hub pages always had, now on every match
  destination.
- **Live-detail venue adoption** (`src/public-matches.ts`): `enrichLiveMatches`
  extracts `det.venue` from the detail fetch it already makes (zero extra
  subrequests — free data) and `applyLiveDetail` fills (never overwrites)
  `m.venue` → pubMatch maps it → live rows carry the stadium chip.
- `buildMatchPage` is now `async` (the hydration); the seo router awaits it.
- New KV key `venue_v1_{id}` (additive; RUNBOOK table updated).
- **Home-ground table** (`CONFIG.TEAM_STADIUMS`, 18 followed clubs → 16
  grounds, en + fa): FD's endpoints return no venue for regular matches
  (verified live on three CL fixtures — the docs' only venue example is a
  2018 final), so the deterministic source comes first: for league/group
  fixtures the venue IS the home team's stadium. Followed-team match pages
  get their venue instantly with zero subrequests; the FD-detail fetch now
  only covers long-tail home teams. One-off NEUTRAL stages (FINAL /
  THIRD_PLACE; roundRaw "Final" but never semi/quarter — those are
  two-legged) skip the table; a real provider venue always wins regardless.
  Shared grounds mapped per club (San Siro × Inter+Milan, AAMI Park × the
  Melbourne clubs).
- Harness: check-stats §11 — 22 new checks (hydration gates, map-link
  markup, facts-row link, similarMatches structure + async buildMatchPage,
  live-detail venue extraction + behavioral applyLiveDetail adoption eval,
  page-shell styles, stadium-table + neutral-gate + source-order locks).
  Suite 849 → 871 green.

## [13.81-matchpage] — 2026-10-13 (the match destination + growth loop)

Feature/styling round (worklog Task 47) — now that v13.80 made every match
link canonical, the destination they land on gets the "big match" treatment.

- **Match page scoreboard head** (server, `src/seo/pages.ts`): crests facing
  each other (64px, monogram fallback when a club has none), competition
  chip with emblem + round, big tabular-numeral kickoff time (or live score
  with a pulsing dot, or final score), Gregorian + Jalali date, venue, and
  a live Persian-digit countdown ("۳ روز و ۷ ساعت و ۱۲ دقیقه تا شروع")
  ticking every 30s via one tiny inline script — stops at kickoff.
- **Actions row** (growth loop): Google Calendar (kickoff +2h basic-format
  dates), WhatsApp, Telegram, and copy-link — every share carries the
  canonical match URL (`absUrl(path)`).
- **Styles** (page-shell inline block, no asset rename): `.matchhead`
  gradient card, `.mactions` pill buttons with hover/active states, live
  560px mobile stacking (grid-areas), `prefers-reduced-motion` guard on
  the live dot.
- **Homepage hero row is now a link** to the match page (public-13.25.js:
  `noLink` dropped from the hero `spotItemNode` call — share buttons stay
  siblings, so no nested interactives).
- **Shares from the homepage carry the match URL**: `shareUrl(e)` prefers
  the payload `path` (v13.80) — WhatsApp text, copy text and the Telegram
  `url` param all point at the match page; the calendar event title stays
  plain (URL rides in details).
- **EN-mode hero H1 fixed** (QA finding #2): `heroH1Sync()` rewrites the
  sr-only H1 from the live hero payload on every render — "Next big match:
  X – Y" in EN, Persian in FA (runs inside `renderHeroSpot`, so boot,
  language toggle and payload refresh all stay in sync).
- Asset ritual: public-13.24.js → **public-13.25.js** (rename-on-edit),
  `_headers` pin renamed, SW cache v28 → **v29**.
- Checks: 833 → 849 (16 new in check-stats §10: matchhead markup, countdown
  script, actions, calendar format, styles, mobile/reduced-motion guards,
  hero link, heroH1Sync, shareUrl wiring).

---

## [13.80-canonical-hrefs] — 2026-10-13 (one true match URL — fixes 404 links)

QA-driven bugfix (worklog Task 46; found by the agent-browser sweep in Task 45).

**The bug:** the server-rendered homepage linked matches with the canonical
`matchPath` (TEAM_SLUGS included: `chelsea-vs-tottenham-2026-10-24`), but the
client's re-render replaced every row's href with its own slugifier — which
had NO TEAM_SLUGS table — producing `chelsea-vs-tottenham-hotspur-…`,
`bayern-munchen-…`, `milan-vs-…`: dead links (404) on click, and dead hrefs
for any crawler that executes JS.

**The fix — one URL vocabulary, served instead of guessed:**

- `src/slugs.ts` (new root leaf): COMP_SLUGS, TEAM_SLUGS, STRICT_STRIP,
  compSlug, teamSlug, matchPath — MOVED out of `src/seo/config.ts` so the
  payload shaper can import them. seo/{data,files,jsonld,markup,pages}.ts
  now import from `../slugs`; seo/config keeps SEO + absUrl only (no
  re-export shim — ARCHITECTURE rule).
- `pubMatch` stamps `path: matchPath(...)` on every payload row (upcoming,
  finished, hero nextBig, topSpot, thisWeek, nextWeek, UCL, cups): the
  client receives the SAME URL the server pages, sitemap, JSON-LD and
  matches.json build.
- `public-13.24.js` (renamed from 13.23): `matchHref(e)` returns
  `e.path ||` (fallback slugifier kept ONLY for stale pre-13.80 cached
  payloads). SW cache bumped v27 → v28; `_headers` pin renamed.
- Harness co-evolution (same commit — ADR-005): worker-src.js order carries
  `slugs.ts` before `public-matches.ts`; check-venue + live-derby evals
  ride the slug block alongside pubMatch; check-stats gained a
  v13.80 section (16 new checks incl. behavioral: Tottenham/Bayern/AC-Milan
  slugs, matchHref path-preference, pubMatch path output).
- KV/payload contract: `path` is ADDITIVE (old clients ignore it; new
  clients fall back gracefully on old cached rows); payloadSig and the
  skip-rebuild handshake are untouched (id|status|score|utcDate only).

Checks: 817 → 833, all green; tsc clean.

---

## [13.79-docs] — 2026-10-13 (ARCHITECTURE.md + ADR-001..006 + README/RUNBOOK refresh)

Seventh hygiene phase (worklog Task 44 — the documentation deliverable).

- **ARCHITECTURE.md** (new): the full module map in 8 layers (leaves →
  match model → providers → composers → digest/notify products →
  user-facing state → surfaces → the cron shell + phases), the dependency
  rules (acyclic layer-down, no re-export shims, groups move together in
  the harness order, KV keys live in CONFIG), and "where to add things"
  for the five most common change types.
- **docs/adr/ADR-001..006** (new): the six decisions the mission named —
  website-as-truth (001), write-first dedupe (002), fail-closed KV (003),
  no-sweep-on-commands (004), eval-harness co-evolution (005, incl. why
  handleTelegramUpdate stays whole), versioned assets rename-on-edit (006).
- **README.md**: the module map now reflects the v13.74–v13.78 groups; the
  "deliberately deferred" list updated (cron split DONE; admin.ts source
  split + ~2 KB inline-CSS dedupe deferred with measurements — needs a
  visual-parity harness first; public-matches justified-as-is).
- **RUNBOOK.md**: saveNotifiedMatch pointer updated (matches.ts →
  match-dedupe.ts).

No code changes; suite unchanged.

## [13.78-botui] — 2026-10-13 (bot.ts 536 → bot-ui.ts 107 + the whole router)

Sixth hygiene phase (worklog Task 42). The tappable-UI layer
(replyKeyboard, normalizeCommand, the v13.49 grid/picker builders) moved
to `bot-ui.ts`; `handleTelegramUpdate` (the 416-line webhook router with
the command + callback chains) stays WHOLE in `bot.ts` — the
check-bot-edges eval slices span the builders→router boundary by content
markers (`// v13.49-buttons: shared message builders` →
`async function handleTelegramUpdate`), so splitting the chains inside
the handler would break the eval harness' contiguity assumptions. That
boundary is now documented and locked (#botui) instead of ignored.

- Harness co-evolution: bot-ui.ts sits immediately before bot.ts in the
  worker-src order; botBtnSeg re-anchored to span the whole bot group
  (bot-ui → cron-preflight) — the first run without this failed exactly
  the 4 #buttons checks, proving the segment was doing its job. +2 #botui
  locks (UI builders in bot-ui, router whole in bot.ts, order pinned).

Suite: 817 checks green (815 + 2 #botui locks).

## [13.77-digestnotify] — 2026-10-13 (digest.ts 559 + notifications.ts 516 → 7 modules)

Fifth hygiene phase (worklog Task 41). Two more god modules became groups
(byte-identical bodies — moves, not rewrites):

| Module | Lines | Owns |
| :--- | ---: | :--- |
| `digest-weekly.ts` | 153 | Monday league tables + week-ahead fixtures |
| `digest-morning.ts` | 125 | the 9am matchday digest (digest_sent_* dedupe) |
| `digest-bigmatch.ts` | 161 | big-match FT + kickoff broadcasts |
| `digest-coronation.ts` | 159 | table-top coronation alerts |
| `notify-engine.ts` | 318 | NOTIFICATION_CONFIGS + sendNotificationIfNeeded + the fan-out |
| `notify-status.ts` | 148 | detectStatusChanges (kickoff/HT/FT, fail-closed map) |
| `notify-audit.ts` | 81 | the notified-match gap audit |

- All importers rewritten to the specific module (cron, cron-notify, bot,
  admin-ops, simulate) — including the DYNAMIC import in admin-ops
  (/api/audit's `await import("./notifications")` → "./notify-audit").
- Harness co-evolution: worker-src.js order carries both groups where the
  two files sat; every dependency is grab-based (position-independent) or
  a content-span regex (#nospam6 spans within digest-morning.ts), so no
  segment re-anchors were needed. +4 #digestnotify locks on the real files.
- The write-first dedupe chain is untouched: notify-engine's
  saveNotifiedMatch gate, digest-bigmatch's persisted-before-send, and the
  mark-before-send morning digest all byte-identical.

Suite: 815 checks green (811 + 4 #digestnotify locks).

## [13.76-matchsplit] — 2026-10-13 (matches.ts 573 lines → 4 modules + normAlias→teams; the import cycle is dead)

Fourth hygiene phase (worklog Task 40). matches.ts carried four products:
the notified-match dedupe store, the notification time windows, the
classification/league sets, and the provider format helpers. Now a GROUP
(byte-identical bodies — moves, not rewrites):

| Module | Lines | Owns |
| :--- | ---: | :--- |
| `match-model.ts` | 57 | isLiveStatus/isMatchFinished/isPresumablyFinished + mapStageName/parseTSPDate |
| `match-windows.ts` | 108 | 24h/3h/1h/5min/match-start/post-match windows + isBackfillEligible |
| `match-dedupe.ts` | 209 | MEM_DEDUPE, getNotifiedMatches/saveNotifiedMatch, shouldSendNotification, cleanup |
| `match-classify.ts` | 208 | shouldNotify, BIG_MATCH_TEAMS/UEFA, isMasterPair, pickHeroMatch, derbies |
| `teams.ts` (existing) | +30 | TEAM_ALIASES + normAlias (joined normalizeTeamName/normTeamKey) |

- **The users↔matches import cycle — the only cycle in the graph — is
  dead**: users.ts now imports normAlias from teams.ts (a leaf); the match
  group imports users one-directionally (masterTeamList). teams.ts keeps
  its erasable-syntax-only discipline (check-dedupe/fa-dict/composers/
  live-derby require it directly via Node type-stripping).
- All 16 import statements rewritten to the specific module each consumer
  uses (no shim, no re-export layer; matches.ts deleted).
- Harness co-evolution: worker-src.js order array carries the match group
  where matches.ts sat (model → windows → dedupe → classify); every grab
  on these functions is position-independent (grabFn), so no segment
  re-anchors were needed. Added 4 #matchsplit locks reading the REAL
  files (import cycles only exist in real-module space): normAlias lives
  in teams.ts, users imports no match-* module, matches.ts is gone, the
  group is contiguous in the harness order.
- pickHeroMatch (the v13.73 shared hero expression) now lives in
  match-classify.ts — the existing #herotruth checks keep covering it
  (whole-src regexes).

Suite: 811 checks green (807 + 4 #matchsplit locks).

## [13.75-cronsplit] — 2026-10-13 (cron.ts 697 lines → shell + 6 phase modules)

Third hygiene phase (worklog Task 39). `executeScheduledLogic` was ONE
672-line function with ~12 interleaved phases; the sweep decision, the
notify fan-out and the public prewarm lived in the same closure as the
KV-write meter. Now a SHELL + six phase modules (byte-identical bodies —
moves, not rewrites; phase outputs cross the seam via returns + a ctx
object, destructured so every pinned identifier keeps its name):

| Module | Lines | Owns |
| :--- | ---: | :--- |
| `cron-preflight.ts` | 80 | settings, FA caches, status read, budget governor + page, stale alert |
| `cron-users.ts` | 83 | outbox drain, 6h heartbeat, migration, FA-AI learning, cap |
| `cron-pool.ts` | 105 | the sweep decision (quiet reuse / live sweep / full / 92-day recovery) |
| `cron-maintenance.ts` | 96 | cup scans, far probe, pool stamp-advance, standings refresh |
| `cron-notify.ts` | 113 | fan-out, kickoff/FT broadcasts, morning digest, coronation, audit |
| `cron-public.ts` | 137 | liveChanged fingerprint, enrichment, prewarm, live overlay |
| `cron.ts` (shell) | 188 | the meter, the execution lock, phase sequencing, completion blob |

- The meter + completion blob STAY in the shell — the #seams check from
  v13.47 codified that boundary ("cron.ts still owns the meter + blob"),
  and the blob must be the tick's LAST write to fold `kvWritesThisTick`.
  The cron_status_v1 reader staying in monitoring.ts is the same locked
  seam, not a split brain (both sides pinned by checks).
- Phase order = runtime order; the eval-harness concat places the six
  modules BEFORE the shell so the #quota1/#swrsolid order checks (prewarm
  and overlay logs before the blob fold) keep holding on positions.
- Harness co-evolution (same commit): worker-src.js order array carries
  the cron group between bot.ts and monitoring.ts; check-reliability
  `cronSeg`/`cronSeg52` re-anchored to span the whole group
  (cron-preflight → monitoring); the bot-segment boundaries (botSeg13,
  botBtnSeg, the #herotruth bot check in check-no-miss) re-anchored from
  cron.ts to cron-preflight.ts so they stay bot.ts-only. Added 5 new
  #cronsplit structural locks (shell-only meter+blob fold, six-phase
  sequencing, both early-returns, lock-after-meter).
- KV write ordering, the env.STATE monkey-patch metering and every
  fail-closed guard are byte-identical. KV key contracts untouched.

Suite: 807 checks green (802 + 5 #cronsplit locks).

## [13.74-providersplit] — 2026-10-13 (providers.ts 853 lines → 8 cohesive modules)

Second hygiene phase (worklog Task 38). `providers.ts` mixed two provider
clients, normalization, the circuit breaker and the pool merge with the
three sweep orchestrators. It is now a GROUP of single-responsibility
modules (byte-identical function bodies — moves, not rewrites):

| Module | Lines | Owns |
| :--- | ---: | :--- |
| `provider-breaker.ts` | 21 | the prov_down_* suspension circuit |
| `provider-wikipedia.ts` | 56 | the PGL standings fallback |
| `provider-sportscore.ts` | 107 | sportScoreDay + the day sweep (budget-stop, suspension) |
| `provider-tsp.ts` | 70 | the TSP event mapper + league-views sweep |
| `provider-fd.ts` | 73 | football-data range fetch + 429 suspension |
| `match-pool.ts` | 64 | the matches_v13_tracked pool read/write |
| `provider-cups.ts` | 214 | big-team cup scan + far-cup probe |
| `providers.ts` (orchestrators) | 322 | fetchLongView / fetchLiveSweep / fetchMatchesFromAPI |

- Dependency direction is acyclic and obvious: clients → breaker/pool;
  cups → tsp+sportscore+pool; orchestrators (providers.ts) → everything.
  Every importer updated to the specific module it uses (cron, api,
  composers, digest, public-matches, admin-ops, seo/data).
- `sportScoreDay` + `tspEventToMatch` gained exports (real cross-module
  importers now: cups + orchestrators).
- Harness co-evolution (same commit): worker-src.js order array carries
  the provider group contiguously before telegram.ts; check-reliability's
  `provSeg15` segment re-anchored to span the whole group
  (breaker → telegram) so the #cupscan/#poolbreak checks keep covering
  the split code. No signature changes — grabFn signatures untouched.
- KV key contracts untouched (prov_down_*, cup_scan_v1, cup_far_scan_v1,
  matches_v13_tracked, last_api_source, degradation_alert_at all intact).

Suite: 802 checks green on the first post-split run.

## [13.73-herotruth] — 2026-10-13 (the hero pick is ONE expression — v13.68 enforced by construction)

The audit found the v13.68 "website-as-truth" constraint was aspirational:
the bot's /featured re-implemented the site's hero selection and the two
copies had drifted in three ways — the bot picked an UNSORTED `live[0]`
when ≥2 hero matches were live (the site sorts live-first by nearest
kickoff), the bot restricted upcoming picks to SCHEDULED|TIMED (the site
only excludes FINISHED), and the bot inlined its own live status set
instead of `isLiveStatus()`. Two matches live at once = the bot and the
site could disagree about the hero — exactly what v13.68 forbids.

### The fix
- **`pickHeroMatch(matches)`** now lives in `matches.ts` as THE single
  shared hero-selection expression (featured-or-masterPair, not-FINISHED,
  live-first, nearest kickoff — byte-identical semantics to the site's
  v13.68 filter). Both consumers call it and neither may re-implement it:
  - `public-matches.ts` → `const heroMatch = pickHeroMatch(matches)`
    (feeds `nextBig`, the site hero).
  - `bot.ts` `/featured` → `const featured = pickHeroMatch(matches)`.
- Six new `#herotruth` checks in check-no-miss.js lock the contract:
  defined exactly once, both consumers use it, no private re-implementation
  survives, and the semantics regex pins the filter/sort expression.
- live-derby-test.js eval chain extended with the new grab (the harness
  co-evolution rule).

Edge-behavior note: /featured now matches the site in the rare cases
where the old copies disagreed (multiple simultaneous live hero matches;
non-SCHEDULED future hero picks) — that alignment IS the constraint.

Suite: 802 checks green (796 + 6 new).

## [13.72-deadweight] — 2026-10-13 (dead assets, dead code, dead branches — the hygiene sweep)

First phase of the code-hygiene/modularization session (mission brief:
docs/history/2026-10-13-NEXT-SESSION-CODE-HYGIENE.md; audit in the session
worklog Task 35). No behavior changes — every removal is grep-proven dead,
visual output identical.

### Dead assets (~1.1 MB pruned)
- Removed `assets/core-13.8.js` (replaced by core-13.9 at v13.65; three SW
  cache generations since) and every retired `public-13.12…13.22` js/css
  pair — referenced by no served HTML, only by `_headers` pins and comments.
  Precedent: v13.29 already did the same prune once.
- `_headers` rewritten to pin only the LIVE versions (core-13.9.js,
  public-13.23.js/css). Also dropped the dead `/public-13.8.js`,
  `/public-13.8.css` pins — those files didn't even exist.
- `sw.js` CACHE stays v27 (no client-referenced asset changed — removals
  need no bump, per the RUNBOOK §2 rule).

### Dead code in src/
- `users.ts`: `BOT_STRINGS` slimmed from ~108 lines / ~55 keys to the only
  4 keys ever read (`fa_/en_start_welcome`, `fa_/en_lang_set` — the bot's
  welcome path). The v12.x keys (help_body, teams_*, follow_*, tz_*) had
  zero readers since the composers began hardcoding their own strings.
- `api.ts`: the `/public` belt-and-braces fallback branch REMOVED — the SEO
  router 301s /public to / before that line ever runs, and the fallback
  served the raw template with 19 unreplaced `__SEO_*__` placeholders
  (placeholder soup) for non-GET requests. POST /public now gets the honest
  405. `PUBLIC_PAGE` import dropped with it.
- `admin-ops.ts`: three dead imports removed (fetchFootballData /
  fetchSportScore / fetchTheSportsDB — never called in the file).
- `notifications.ts`: dead `nowTehran` parameter removed from
  `sendNotificationIfNeeded` (never read in the body).
- `providers.ts`: dead `export` dropped from internal-only `sportScoreDay`.
- `pages/admin.ts`: dead `var TOKEN` (audit fix 8 leftover), 9 phantom
  selectors in the reduced-transparency rule (homepage-only classes copied
  from public CSS — only `.card,#topbar button` ever matched), 7 unused
  `:root` tokens, the stale X-status-card header mention, the unused
  `.uclsync` class marker.
- **Admin version-line fix (visible)**: the footer version line carried
  `data-i="ver"`, so `applyLang()` clobbered the live server-rendered
  `نسخه 13.71…` with the STALE v12.33 I18N string — the admin panel has
  been displaying "نسخه ۱۲.۳۳-xpost" for months. Hook removed; the line
  now shows the real VERSION.
- `pages/login.ts`: 11 unused `:root`/light tokens removed.
- `pages/public.ts`: duplicate `<meta name="color-scheme">` (emitted
  twice) collapsed to one; stale dotLottie tombstone comment condensed.
- `seo/page-shell.ts`: dead `.updatedline` rules removed (no element uses
  the class); stale comment claiming `/public-13.15.css` fixed.
- `seo/markup.ts`: dead `T.noMatches` / `T.more` dictionary keys removed.
- `cron.ts`: stale "X mirror" comment mentions removed (the X path died
  at 13.48-xtrim; only comments referenced it).

### Test-harness co-evolution (the §11 rule)
- `check-no-miss.js`: grab signature + call updated for the nowTehran
  param removal.
- `check-security.js`: the webhook-block slice boundary was the removed
  `/public` branch — re-anchored on the card-route marker.
- `check-venue.js`: the "render() shows venue chip" check matched the
  UNMINIFIED pattern that by now only existed in the retired asset files —
  it was testing dead files instead of the live artifact. Rewritten
  minification-agnostic (semantic chain: span → className "venue" →
  textContent built from `<match>.venue`, emoji as char or escape).
- Justified-kept: `CONFIG.KV_SCHEDULE_PREFIX` (documented tombstone), the
  10 `typeof X === "function"` guards in digest/notifications (they
  protect eval'd partial slices in check-weekly-tables/check-admin from
  ReferenceError — load-bearing for the harness, not noise), `.visitcount`
  inline CSS delta between public.ts and page-shell.ts (deliberate).

Suite: 796 checks green (tsc + 19 scripts) — count unchanged.

## [13.71-admintools] — 2026-10-13 (owner toolbelt inside Telegram)

The bot's owner (Alitagram, `env.CHAT_ID` — the identity 13.70-adminpulse
armed for the heartbeat/pages) previously had zero Telegram-side control:
member visibility lived only in the web admin card, and join/leave events
were invisible. The owner now gets:

### Owner-only commands (gated to `parseInt(env.CHAT_ID)`)
- **`/admin`** — the admin panel: command card + quick-tap inline buttons
  (`adm:members` / `adm:status` callbacks, same gating).
- **`/members`** — the member roster: names, @usernames, chat ids, Jalali
  join dates, language, team-follows — the same `getBotMembers()` data the
  web admin shows (KV profiles + the budget-gated getChat backfill),
  newest member first, truncated at 3600 chars so any roster size fits one
  message.
- **`/status`** — the live health card: the exact `/healthz` numbers
  (heartbeat age, last-completed-cron age, pool age + match count, outbox
  depth, KV write burn, admin-alerts layer) with a 🟢/🟡/🔴 verdict.
- **`/broadcast <text>`** — send a message to every registered chat. The
  body is MarkdownV2-escaped (renders verbatim — the admin's punctuation
  can't break the parse), capped at 3500 raw chars, and fanned out
  SEQUENTIALLY through the v13.69 paced/retried/outbox-backed sender. The
  owner gets a sent/queued/dead summary.

### Membership signals
- **Join pages**: the owner is paged the moment a NEW member joins — via
  `/start` or the language-picker registration path — with the member's
  name/@username (from the just-written KV profile), chat id, and the new
  total. Re-starts don't re-page; the owner joining himself doesn't page.
- **Leave pages**: a member's `/stop` pages the owner (a stranger's /stop
  is not a leave).

### Safety
- Gate-first: every admin branch checks `isAdminChat` before any send; a
  non-owner probe gets a plain denial and a console.warn (visibility into
  probing).
- Fail-closed: an unparseable `CHAT_ID` (the 13.70 dead-paging shape)
  disables every tool and every page — the same rule the alert paths
  follow; `/healthz admin_alerts_ok:false` already surfaces it.
- New gate `scripts/check-admin.js` (source + behavioral: the REAL
  admin-bot module and command/callback chains eval'd against a fake KV —
  denial, roster, status, broadcast fan-out/escape/accounting, join/leave
  pages, fail-closed). `check-join-flow.js` extended with join/leave-page
  assertions; both harnesses updated for the new chain calls.

## [13.70-adminpulse] — 2026-10-13 (the dead admin-paging layer: every admin alert silently disabled)

During the v13.69 verification, the `heartbeat_sent_v1` KV stamp turned out
to have **never existed** — nor `audit_alert_v1`. Those are the only two
stamps written INSIDE the `if (!isNaN(parseInt(env.CHAT_ID)))` guard; every
stamp written OUTSIDE the guard (`stale_alert_at`, `degradation_alert_at`,
the cron status blob) existed. The fingerprint: **the deployed `CHAT_ID`
secret does not parse as a number**, so every admin-facing alert path —
the 6h "ربات سالم است" heartbeat, `alertPhaseError` pages, KV-budget pages,
audit gap reports, user-cap warnings — has been silently disabled, with
healthz green throughout.

### The fix
1. **`/healthz` exposes `admin_alerts_ok`** (true iff `parseInt(env.CHAT_ID)`
   is a number) and flips the `degraded` band when false — a dead paging
   layer is now visible to external monitors.
2. **The heartbeat block logs LOUDLY** when CHAT_ID is unparseable (was
   silent — the exact "silently-swallowed failure" class from 13.55).
3. The `CHAT_ID` secret was re-set to the owner's numeric chat id
   (92788333 — the sole surviving member of the original single-chat
   registry `REGISTERED_CHATS_LIST`, first-joined user, only tz-customized
   prefs). Verification: the next tick wrote `heartbeat_sent_v1` for the
   first time and delivered the first real heartbeat message.

## [13.69-pacenotify] — 2026-10-13 (the burst-429 silent drop + the per-chat card fallback)

A reliability audit against the delivery guarantees found three concrete
missed-alert vectors in the send path, all sharing one shape: **the write-first
dedupe record persists BEFORE the send, so any send that dies outside the
retry/outbox machinery is lost forever.**

### The gaps
1. **429-pause silent drop** — `sendTelegram`/`sendTelegramDirect` opened the
   attempt loop with `if (Date.now() < TELEGRAM_PAUSE_UNTIL) return false;`
   That return bypassed the outbox push entirely. Trigger shape: the broadcast
   fan-out (`Promise.allSettled` over every chat) fires all sends in parallel;
   at ≥30 chats that's a guaranteed hit on Telegram's ~30 msg/s global limit →
   the first 429 sets the pause (1-10s) → every other in-flight send returns
   false on its next attempt with NO outbox entry → dedupe already recorded →
   those chats never get the alert.
2. **Partial card failure dropped users** — the card path marked the whole
   tz-group served when ONE chat's photo landed (`cardSent = some(true)`);
   chats whose photo failed got no text fallback and no retry. Compounded by
   `sendPhotoBinary` having ZERO retries (single attempt, no 429 handling).
3. **Outbox read-modify-write race** — several fan-out sends failing at once
   each ran `outboxPush` concurrently (read list → push → write list); the
   concurrent writes silently dropped each other's entries.

### The fix (v13.69-pacenotify)
1. **Bounded pause wait** (`waitTelegramPause`) — a live 429 pause is waited
   out (≤8s, Telegram's global-limit retry_after is 1-5s; pure wall-clock
   sleep, zero CPU). Only a pause that outlives the bound defers via the
   outbox — never a silent `return false` again. `sendTelegramDirect` returns
   false for the drain to re-queue (no outbox recursion). Subrequest-budget
   exhaustion now defers via the outbox too.
2. **Proactive pacing** (`paceTelegram`) — a 40ms floor between Telegram API
   calls (~25/s) in `sendTelegram`, `sendTelegramDirect`, `sendPhotoBinary`
   and `sendDice`, keeping every fan-out under the 30 msg/s global limit
   instead of tripping it reactively.
3. **Per-chat card fallback** — `cardResults` is judged per chat; every chat
   that did not CONFIRMEDLY receive the card (or is dead) gets its own text
   fallback send. A confirmed card delivery now also counts into the
   breadcrumb `notify.s` counts (card-only notifications were invisible).
4. **`sendPhotoBinary` retries** — 2 attempts with the same 429-pause/pacing
   semantics as the text senders.
5. **Serialized outbox pushes** — a per-isolate promise chain serializes
   `outboxPush` read-modify-write cycles (cross-isolate races stay bounded by
   KV last-write-wins, as before).
6. **`/healthz` pool freshness** — new `pool_age_min` + `pool_matches`
   fields; a missing pool or >180min age flips the `degraded` band (the
   13.55-epochflow "healthy pipeline, frozen data" class is now visible to
   external monitors).

## [13.55-epochflow] — 2026-09-30 (the frozen epoch: KV write quota exhausted + silently-swallowed put failures)

The user's report: *"آخرین به‌روزرسانی: چهارشنبه ۰۹:۱۱ صبح · ذخیره‌شده
(۷۴۸ دقیقه پیش)"* — last updated Wednesday 09:11, cached 748 minutes ago.
The pipeline LOOKED healthy (healthz ok, 2h sweeps clean, pool stamp fresh
at 18:01) but the served epoch (payload/snapshot `fetchedAt`) was frozen
at 05:41 for 12.5h.

### The root chain (exposed by the new put-failure logging)
1. **The KV namespace exhausted its 1,000 writes/day free-tier quota**
   (midday UTC, after a morning of browser-poll rebuild churn — the
   empty-view payload's 60s TTL meant every >60s-gap poll ran a full
   rebuild: lock + rate-limit + payload puts ≈ 3-4 writes per poll).
2. **Every put started failing with "KV put() limit exceeded for the day" —
   and every single one was swallowed by `.catch(() => {})`.** No payload
   writes, no snapshot writes, no standings-cache writes, no pool stamp
   writes. The cron status blob's single trickle-write still slipped
   through the best-effort enforcement, so healthz kept reporting
   `ok:true` — the perfect masquerade of a healthy pipeline.
3. The serve path then cycled: payload (60s TTL) expired → snapshot serve
   (frozen epoch 05:41) + a background rebuild that burned ~20-30 real
   subrequests on guaranteed-failing provider fetches (FD standings
   silently non-ok — a raw fetch with `res.ok=false` left no log; PGL's
   3-provider fallback chain with 800/1600ms retry sleeps — the 6.8s
   "healthy" rebuild wall time) before its writes died at the quota wall.
4. Header semantics did the rest: the badge is data-age-gated (13.54), so
   a >3h-old epoch shows "cached (Nm ago)" — with N growing all day.

### The fix
1. **Serve-path rebuilds are pure-KV now**: `fetchStandings(env, c, false)`
   (cache + per-code snapshot fallback only — zero provider fetches on any
   visitor-driven rebuild), and background refreshes pass `skipLongView`
   (the 92-day view can't finish in `ctx.waitUntil`'s ~30s and only burned
   budget). The 10-min cron tick owns ALL provider refreshes.
2. **One payload TTL (720s) for every write** — the empty-view 60s retry
   loop (the poll churn that burned the quota) is dead: a poll 61s after
   the last one now serves the payload inline with ZERO writes; only
   >10min gaps trigger one bounded rebuild.
3. **Put failures are LOGGED, never swallowed** (`public payload write
   failed: …`, `public snapshot write failed: …`, `degraded payload
   re-cache write failed: …`) — this entire bug class was invisible for
   12.5h because of the silence.
4. **The cron prewarm now SELF-FETCHES** (`SELF_PREWARM_URL`): the tick
   fires one fetch at its own public API — a fresh invocation with a full
   50-subrequest budget of its own, whose waitUntil rebuild lands the
   payload + snapshot writes reliably (the in-tick prewarm ran after the
   3-provider sweep, at ~40-50 real subrequests, so its writes died at
   CF's real ceiling). Meter-gated in-tick fallback preserved.
5. **Quiet-tick pool stamp-advance**: a tick that reuses the pool re-caches
   it with a fresh stamp whenever `fetchedAt` is >90min old (≤16
   writes/day) — the header clock stays fresh on the deepest break weeks
   and the pool TTL can never run out again (13.54.1's deadlock cannot
   reform even when sweeps legitimately return 0 matches).
6. **Quiet-tick standings-refresh phase** (2h marker-gated, 6h per-code
   freshness gates + jitter preserved): standings fetch authority moved off
   the serve path entirely.
7. **FD standings non-ok responses are VISIBLE now** (`Standings PL: FD
   HTTP 429`) and a 429 suspends the football-data circuit for 45min
   (mirror of fetchWithRetry F5) — no more silent quota-minute burn.
8. Live scorer enrichment moved into the tick (`enrichLiveMatches` on
   `liveChanged`, meter-gated) — self-fetch rebuilds never fetch.

### Expected daily KV-write budget (matchday): ~350-550 vs the 1,000 cap
(was ~1,000-1,400 on poll-days — the quota killer).

### Post-reset verification — 2026-10-01, browser-verified (the bug is closed)
- **The quota reset on schedule** (cron_status flipped to kv_day=2026-10-01
  at the 00:00Z tick; writes landing again).
- **The first visitor request after the reset (00:05:49Z) instantly wrote
  BOTH KV keys**: `public_matches_v1` (fetchedAt = the 22:50:33Z pool
  stamp) and `cache:snapshot:v1` — the first successful snapshot write in
  18.4h (frozen since 05:43). The second request served the fresh payload
  from KV: sub-second, no badge.
- **Self-healing confirmed across the evening**: stamp-advances landed at
  19:40, 21:20, and 22:50 (every ~90-100min as designed); the 19:00
  standings phase wrote all 7 league codes fresh (PL/PD/SA/BL1/FL1/CL
  36 teams/PGL 18 teams — FD fetches were always fine; only the writes
  had died).
- **Browser end-to-end (agent-browser, https://sportsignal.ir/)**: the
  header reads "آخرین به‌روزرسانی: پنجشنبه ۰۲:۲۰ شب" (Friday 02:20
  Tehran = the 22:50:33Z pool stamp) with **NO cached badge** (was:
  چهارشنبه ۰۹:۱۱ · ذخیره‌شده ۷۴۸ دقیقه پیش). All sections render —
  live/big-upcoming/UCL/next-week/جدول لیگ‌ها (7 leagues incl.
  پرسپولیس/استقلال)/cups/recent-results; zero page/console errors; mobile
  390px clean. Screenshots: `download/sportsignal-13.55-verified-healed.png`
  and `-mobile.png`.
- **Direct simulation of the self-fetch prewarm** confirmed the mechanism:
  serve 0.87s → the bg rebuild reads the fresh pool stamp → the only
  failure mode remaining was the exhausted quota itself (now reset).

### Watch items (carried to the next session)
1. First matchday (~Oct 9-10) under real load: self-fetch prewarm +
   standings phase + live overlay at matchday write volume.
2. `kv_writes_day` on a busy matchday (expect 350-550; soft-governor 700;
   hard cap 1,000).
3. TSP `eventsnextleague` non-iterable regression (harmless, caught by
   the tail; unfixed).

### Session close — 2026-10-10
v13.55-epochflow is the final build of this session: committed (f0a2385),
pushed to `assadigit/SportSignal`, deployed (worker version `a1a7a1fb`),
and live-verified. The user's next session continues with **SEO work** on
the public page.

---

## [13.54.1-poolbreak] — 2026-09-30 (the dead-pool deadlock: the site really WAS frozen)

Found live via `wrangler tail` while verifying 13.54 — the frozen stamp was
the symptom; underneath it the whole data pipeline had been dead since
2026-09-29 12:09Z (17h): **the pool KV key expired at its 24h TTL** and
nothing could repopulate it.

### The deadlock (every link confirmed in the live tail)
1. **The pool expired.** `cacheMatches` is change-only + the pool KV TTL is
   24h — during the international break nothing changed, no sweep wrote the
   pool, and the TTL ran out. (13.54's stamp-advance prevents this going
   forward, but it only fires on a sweep that returns ≥1 match.)
2. **Every tick full-swept.** The quiet-reuse gate requires a non-empty
   pool — with it empty, every 10-min tick ran the full 3-provider sweep.
3. **The sweep could not finish.** The concurrent fan-out (FD ~17 fetches +
   sportscore 27 day-calls + TSP ~10) crossed Cloudflare's real
   ~50-subrequest ceiling mid-flight — CF rejected the rest with "Too many
   subrequests" while the local meter still read 37/48 (fetchJSON bumped
   once per call but retried twice internally). TSP — the only source with
   FUTURE fixtures when FD's 10-day window legitimately sees nothing during
   a break — starved.
4. **0 matches → no pool write → repeat.** The tick's own log: FD 0
   (correct), sportscore/TSP budget-dead, "All API sources empty, falling
   back to cache" → cache EMPTY → 0 matches → `cacheMatches` skipped.
5. **The visitor long view can't rescue it.** Since v13.52 the 92-day long
   view runs only in `ctx.waitUntil`, which dies at ~30s — the multi-minute
   view never completes there. The 595-row pool from 2026-09-28 12:09Z was
   written by the LAST synchronous (pre-13.52) visitor long view. The site
   has been serving that pool's frozen snapshot ever since.

### The fix — budget-fit, prioritized, cron-owned recovery
- **Accurate meter**: `fetchJSON` bumps per ATTEMPT (like `fetchWithRetry`
  always did). The meter that every budget gate trusts no longer
  undercounts by up to 2×.
- **Budget-stopped fan-outs**: the sportscore full-sweep day-loop and the
  long view's cup/EL/ECL/BL1 sections stop hard at 44 metered — a partial
  sportscore sweep beats a dead tick (and the suspension check can't
  misfire on budget stops).
- **Sequential prioritized sweep**: `fetchMatchesFromAPI` runs
  FD → thesportsdb → sportscore with per-source meter gates (46/42/34)
  instead of `Promise.all` — FD and TSP ALWAYS complete, so the sweep
  always has something to cache; sportscore rides the leftover budget
  (the 10-min live sweep owns live detail on matchdays anyway).
- **Long view reordered futures-first**: FD's 92-day chunks → TSP
  next-event views → intl calls (~23 metered, always complete) BEFORE any
  sportscore day-calls.
- **Cron owns pool recovery**: an empty-pool or horizon-starved (<5 days of
  known fixtures — the nextWeek card's fuel) sweep runs the 92-day long
  view IN THE TICK, where it has the wall time to complete. This also
  re-enriches the horizon on long breaks (nextWeek no longer starves).
- With 13.54's stamp-advance the recovered pool's TTL is refreshed on
  every sweep — the deadlock cannot reform.

### Verified
- Suite: 576 OK checks (+7 #poolbreak wiring asserts), `npm test` exit 0;
  `tsc` clean. Local smoke: 13.54.1-poolbreak, routes real.
- Live: worker `91305a04`; the 05:40Z tick ran the pool-recovery long
  view end-to-end (FD chunks → TSP → intl → budget-stopped sportscore),
  the pool was rewritten, and the public API immediately served fresh
  fixtures with a current stamp and NO cached badge.


## [13.54-livestamp] — 2026-09-30 (the frozen "Last updated" stamp: healthy pipeline, lying header)

### The user's report
> "Investigate why the app and sportsignal.ir doesn't update:
> this is on header: **Last updated: Monday 15:39 · cached (1407m ago)**"

The header was telling the truth about one thing: that payload was old. It
was lying about the cause — healthz showed heartbeats every 10min and
sweep-sized ticks at the normal 38-fetch band, so it READ as healthy. (The
deeper truth found an hour later: those sweeps were completing but returning
0 matches with the pool already dead — see **13.54.1-poolbreak** above, which
found the actual data outage underneath this stamp fix.) Two change-only KV
gates froze every timestamp the site shows, so the break week read as a dead
system on top of a real one.

### Root chain (all links confirmed in source + live)
1. **The pool stamp froze.** `cacheMatches` is change-only (v13.31 KV
   budget) — during the international break fixtures sit `TIMED` for days,
   so every 2h full sweep merged a byte-identical pool and skipped the
   write. The pool's `fetchedAt` — which every public payload inherits as
   its `fetchedAt` (the header's "Last updated" clock) — stayed at
   2026-09-28T12:09Z = **دوشنبه ۱۵:۳۹ Tehran, to the minute**.
2. **The snapshot stamp froze the same way.** The 7-day snapshot's write
   is change-only too, so its `ts` sat at 2026-09-29T05:26Z while its
   content (and its `fetchedAt`) were equally frozen.
3. **Every quiet-gap visitor was badge-stamped degraded.** With sparse
   traffic the 12-min payload TTL expires between visits, so the
   snapshot-serve path — which unconditionally set `cached: true,
   cachedAt = <snapshot write time>` — ran on essentially EVERY request.
   The user watched "cached (1407m ago)" grow for a day and a half.

### The fix — stamps mean "last verified", badges mean "actually stale"
- **Pool stamp-advance** (`POOL_STAMP_REFRESH_MS` = 90min): a successful
  re-cache with unchanged content still rewrites the pool when its stamp
  is >90min old. The 2h sweep cadence makes every full sweep advance it
  (≤12 writes/day of the 1,000/day quota; real content changes keep their
  instant write; the HARD budget hold still gates everything). The stamp
  now means "the last sweep that verified this data" — exactly what the
  header claims to print.
- **The cached badge is DATA-age-gated** (`CACHED_BADGE_MS` = 3h):
  the snapshot-serve path (and the last-resort catch fallback) compute
  the badge from the **data epoch** (`fetchedAt` riding in the payload),
  not the KV write time. Healthy quiet days render **no badge**; only a
  real >3h data outage (dead/failing sweeps) shows it — with the DATA's
  age instead of a frozen write-time age.
- **Degraded serves stay honest**: the `liveSweepFailed || poolEmpty`
  path keeps its badge (that serve IS degraded) but ages it by the data
  epoch too.
- **Client untouched** (`public-13.12.js`): it already renders
  `fetchedAt` + the conditional badge — the semantics were fixed entirely
  server-side.

### Verified
- Suite: 569 OK checks (behavioral: fresh stamp + identical content → no
  rewrite; stale stamp + identical content → the stamp-advance fires;
  wiring: gate shape, badge threshold, epoch-based cachedAt, the removed
  unconditional badge). `npm test` exit 0.
- Local `wrangler dev` smoke: 13.54-livestamp, all routes real, fresh
  build stamps `fetchedAt: now` with no badge on healthy data.
- Live: worker `b37ccd66`; the first post-deploy requests served the old
  snapshot with the badge now showing the truthful DATA age (2468min);
  the stamp heals at the next full sweep (2h cadence) via the stamp
  advance → snapshot rewrite. Subrequest budget unchanged.


## [13.53-standsteady] — 2026-09-28 (the missing-tables bug + the API-call diet)

### The user's report
> "Sometimes a league table or something doesn't load — if there are 5 league
> tables, 2 of them might not load, but the others are fully loaded
> [«جدول هنوز در دسترس نیست»]. I have a hunch this is because API call
> overload, so the system gets limited. I think our system sends too much
> update request, while it's not needed. We need to reduce the update times,
> to avoid API call per day."

Both halves were real, and the second half was the first half's cause.

### Why tables went missing (root chain, all links severed)
1. **The FD standings rotation aligned with itself.** Prewarm sweeps run
   exactly every 2h = 12 × 10-min slots, and `12 % 3 = 0` — every cron
   prewarm landed in the SAME rotation slot, so the same 2 codes refreshed
   every time while the other 4 (of PL/PD/SA/BL1/FL1/CL) only got fetch
   opportunities from random visitor rebuilds. On quiet days a code could
   go 8h+ without one.
2. **KV TTL was 8h** (`standings_cache_*`): once the rotation starvation
   crossed 8h, the cache EXPIRED — and the next FD 429/timeout hit the
   null path: the box rendered «جدول هنوز در دسترس نیست».
3. **The snapshot fallback was PGL-only** (v13.34): every other code had
   no last-resort — which is exactly why the user saw PGL render while
   2 of the 5 league tables sat empty.
4. **The 10-min freshness gate churned hundreds of calls/day**: every
   payload rebuild re-hit FD for its rotation pair (~240+ standings
   calls/day under traffic) — the "too much update request" that gets
   the free tier rate-limited in the first place.

### The fix — tables stay, the call volume collapses
- **All-codes snapshot fallback** (the v13.34 PGL path, generalized):
  when ANY standings code (or the UCL card) has no live table, the 7-day
  snapshot's copy fills the box — tagged `stale`/`staleAsOf`. Read only
  on the miss path; zero KV cost on the happy path. `top3`/`top5` clash
  marking deliberately still uses live tables only.
- **Default freshness gate 10min → 6h** (`STANDINGS_FRESH_MS`), with a
  **per-code jitter** (`STAND_CODE_ORDER` × `STANDINGS_FRESH_JITTER_MS`
  = 17min) so the 6h expiries NEVER coincide — a rebuild fetches at most
  ~1 code. Callers that need post-FT freshness (result lines, weekly
  digest, coronation, `/api/standings`) pass `opts.freshMs = 6e5`
  (honored exactly, no jitter). Coronation now fetches fresh ONLY for
  leagues with a just-finished match (~80% fewer calls; identical
  detection semantics — a leader can only change via that league's FT).
- **FD rotation REMOVED, fetches SEQUENTIAL**: the alignment bug is gone
  by construction, and no rebuild can burst FD's 10 req/min window.
- **Standings KV TTL 8h → 24h** (`STANDINGS_CACHE_TTL`): the
  fetch-failed → cached fallback survives a full day of upstream
  429s/suspension. A day-old table beats an empty box.
- **FD standings respect the 429 penalty box** (`providerSuspended`) —
  calls into an exhausted quota-minute are wasted calls; skip to cache.
- **Live-detail enrichment (scorers) is PREWARM-only**: the serve-time
  overlay patches status/score/minute on every payload, and a goal fires
  `liveChanged` → the tick's prewarm re-enriches scorers within ~10min.
  Visitor rebuilds skip up to 4 FD calls + 5.6s of sleeps EACH (both API
  burn and latency during live windows).
- **R6 SHIPPED — sportscore live-sweep fan-out**: the live sweep now
  fetches only eligible leagues with a live/imminent ([-6h,+3h])/just-
  finished pool match (`fetchSportScore` gained `opts.slugs`). A league
  evening with no cup/EL/PGL match in flight: **0 sportscore calls**
  (was 18/tick ≈ 540-720/day); an EL Thursday: 4. Discovery stays the
  full sweep's job (every 2h, all slugs). BL1 stays eligible — when FD
  is suspended, sportscore is its only live source.
- **Snapshot un-frozen on break weeks**: the 7-day snapshot's refresh
  was gated on non-empty match lists — during international breaks a
  SUCCESSFUL sweep legitimately produces empty lists, so the snapshot
  froze at the last matchday's build and break-week visitors cycled an
  aging snapshot forever. Live evidence: the 2026-09-28 break still
  served the Sunday copy carrying the pre-13.53 missing-tables damage.
  The refresh is now gated on SWEEP SUCCESS (`!liveSweepFailed &&
  !poolEmpty`) — failure semantics preserved (a total-provider-failure
  build never overwrites the fallback), change-only writes, one healing
  write per break day.

### Expected daily API budget (matchday, vs before)
- sportscore: ~800 → ~280 (live sweeps 540-720 → 60-160; full sweeps
  unchanged at 216 — the correctness backbone)
- football-data: ~350 → ~80 (standings ~300 → ~40-60; sweeps unchanged)
- scorers enrichment: ~4/tick × visitor refreshes → ~4 per goal-window
  prewarm only

### Tests
- check-reliability +14 `#standsteady` wiring asserts (gate/jitter/TTL/
  rotation-gone/snapshot-fallback/UCL-card/suspension/prewarm-enrich/
  R6/coronation/fresh-callers).
- check-no-miss section S reworked: R6 behavioral (skip-with-no-eligible,
  EL narrows to [EL], far-future fixture → no call, imminent cup arms its
  slug) — the old "yesterday+today window" assert upgraded to assert the
  slugs filter rides it.
- check-cups: `snapUcl` stub for the UCL-card slice (pre-13.53 semantics
  under stCL=null preserved).
- `liveSeg` window 2400 → 4600 chars (fetchLiveSweep grew with R6).
- Full suite: tsc + 17 scripts, 558 OK checks, exit 0.

## [13.52-swrsolid] — 2026-09-16 (the "few minutes to load" bug: the visitor never waits, the live game never lies)

### The user's report
> "When you open sportsignal.ir after a while, it's like the APIs are just
> fetching at that time, which takes a few minutes to load — it seems there
> is no caching. Fixtures can easily be cached, but you can't cache a live
> game: if the game is over and the cache is not purged, it will still
> show as playing."

Both halves were real. Root cause chain (three links, all severed):

1. **Visitor-written payload TTL was 300s** — with sparse traffic (gaps
   between visitors > 5 min, i.e. almost every visit on this site) the KV
   key **expired before the next visitor arrived**, so the 10-min SWR
   grace window never operated and every visitor ran the *synchronous*
   rebuild. (Prewarm-written payloads had 720s — the grace worked only
   for them.)
2. **That synchronous rebuild called `fetchLongView`** — the 92-day view:
   10 football-data chunks each followed by a hard 2s sleep (FD free tier
   = 10 req/min → 429s → Retry-After waits), up to ~70 sportscore calls,
   TSP fan-out with 1.2s pacing. **Tens of seconds to minutes**, on the
   visitor's request. Its pool-reuse gate (`horizon > now+60d`) almost
   never passed mid-season, so this ran again and again.
3. **The 7-day snapshot** (built for exactly this) was reachable only
   via the `catch()` on total failure — and on live evenings the SWR
   window could serve a finished game as playing.

### The fix — fixtures cache, live never lies
- **Pool-first visitor rebuilds** (`fetchPublicMatches`): the visitor
  path reads the KV pool (refreshed by the cron full sweep every 2h —
  fixtures are slow-moving) and only falls back to `fetchLongView` when
  the pool itself is gone (cron dead >24h — the recovery path). The
  92-day long view no longer runs on any visitor's critical path.
- **One payload TTL: 720s** (was 720 prewarm / 300 visitor). The SWR
  stale-serve window (5–10 min) now actually functions for every write.
- **Snapshot promoted to the primary stale source** (`public-swr.ts`):
  payload expired/missing → serve the 7-day snapshot **instantly**
  (tagged `cached`/`cachedAt` — the page's existing indicator) and
  rebuild in the background. The synchronous rebuild now only happens on
  a true cold cache (no payload AND no snapshot: first deploy / KV wipe).
- **The live overlay** (`live_overlay_v1`, TTL 6h): the cron tick writes
  a tiny {id, teams, day, status, minute, score} row per live-or-recent
  match — the moment live data changes (goal / kickoff / HT / FT — the
  same `liveFingerprint` signal the prewarm gate uses), on full sweeps,
  and at least every 10 min while anything is live (minute freshness).
  The serve path reads it (one KV read) and **patches every payload it
  serves** — fresh, stale, or snapshot:
  - SCHEDULED → IN_PLAY/LIVE/PAUSED: status, score and minute patched in;
  - a FINISHED match is **purged from `upcoming`** and prepended to
    `finished` with its final score — the user's rule, verbatim;
  - `nextBig`, `topSpot`, weeks and `cups[].next` rows are patched too;
  - lookup is by match id first, then normalized team-pair + day
    (providers carry different ids for the same fixture between
    rebuilds).
- **Cost model** (the free-tier discipline): overlay writes ≤ ~12/day on
  sweep cadence + live-change events + ≤6/hour minute top-ups ≈ 40–60 on
  the busiest matchday, zero on quiet days; 2 KV ops per write; gated
  `subrequestCount() < 40` (the 21:40Z incident lesson) and held under
  the HARD budget governor (`budgetHard`); NOT gated on SOFT (correctness
  beats cosmetics; documented in-source). Serve path adds exactly one KV
  read per request.

### Accepted narrowing (documented)
The public payload's fixture horizon now follows the pool (~1–6 weeks
via FD +8d + TSP next-events) instead of the 92-day long view. The page's
own windows (thisWeek/nextWeek = 7+7 days, cups' next match) are fully
covered; the 90-day `topSpot` window simply shows fewer far-out rows.
Not worth the minutes-long visitor stalls it existed to prevent.

### Tests
- `check-no-miss.js` +9 behavioral (real `applyLiveOverlay` via the
  eval harness): FT purge from upcoming → finished head with final score
  + nulled minute; kickoff patch; by-pair fallback; nextBig/topSpot/
  cups/weeks patching; no-blob and unknown-row no-ops.
- `check-reliability.js` +11 `#swrsolid` wiring asserts (key + TTL
  declared; pool-first rebuild; overlay read + apply on the serve path;
  snapshot-before-sync ordering; cron write gate changed/full-sweep/
  10-min; `budgetHard` + subrequest gates; liveChanged hoist shared by
  prewarm and overlay; overlay writes fold before the completion blob).
  The 13.35 TTL assert co-evolved to the single-720 shape.
- `npm test` exit 0 (143 behavioral checks; also fixed a pre-existing date-drift failure in `live-derby-test.js` — the EOM-gated upcoming list dropped +3d fixtures in the last days of a month; found live 2026-09-28 on pristine 13.51 code, fixed with a month-aware `relOff` helper).
- Pool retention 2d → 7d (`cacheMatches`): under pool-first, the pool is
  the finished card's only source — a week of settled rows keeps the v12.5
  "7 days of results" intent. No extra fetches; the rows were already in
  KV. (Found while investigating: the current international break —
  leagues last played Sept 19-20, UCL MD2 is Oct 13-14 — made the empty
  `finished` card look like a bug; it was simply the truth, plus this
  retention gap. FD verified healthy by taping the 13:30Z full sweep:
  0 matches for Sept 26-Oct 6 is the correct answer for that window.)

### Live verification (2026-09-28, deployed Version 2d79f5cc)
- Local smoke first: the true-cold path (empty local KV + dead local FD
  token) reproduced the user's bug exactly — the synchronous long view
  burned >60s; with any cached state present: 0.83s → 0.004s.
- Live: first request after deploy paid a one-time 5.7s pool-first rebuild
  (the 7-day snapshot had expired in the quiet week); every request since
  = **0.3-0.7s**. Payload-expired requests now serve the snapshot
  instantly (tagged `cachedAt`, the page's existing cached indicator) with
  the rebuild in the background — verified in KV: snapshot preserved on
  empty-result days, empty payloads keep their 60s retry TTL.
- Ticks: 13:30Z full sweep completed 13:31:51 (5 writes, sweep-band
  subrequests); quiet ticks clean; healthz `ok:true` throughout;
  `live_overlay_v1` correctly absent on a no-live-matches day (the overlay
  write gate only fires when live rows exist within ±6h).

---

## [13.51.1-banner] — 2026-09-15 (docs & banner — same worker build as 13.51)

No worker-code change: `src/config.ts` stays `13.51-rivalries`, `package.json`
stays 13.51.0. This entry records the banner, the docs catch-up, and — most
important — the continuation note.

### The continuation note (the user's own words, kept verbatim)
> "I AM NOT SURE HOW RELIABLE TELEGRAM BOT IS. IF you want to work, work
> from here."

Recorded in the README (top-of-file callout + status section) so any future
session knows where to pick up: the next focus is **Telegram bot
reliability** — the delivery path (`src/bot.ts`, `src/telegram.ts`,
`src/notifications.ts`, outbox recovery in `src/cron.ts`). Baseline
measured at flag time: webhook `football.sportsignal.ir/webhook` healthy
(0 pending updates, no last error), outbox draining clean, same-day alert
deliveries. Related backlog: R6 (live-sweep sportscore fan-out — 18 fetches
per evening tick at the real subrequest cap's edge) and R7 (TSP `eventspast`
cup-result sweeps bounded to in-flight rows).

### The banner
- `docs/banner.png` — user-provided art (ChatGPT, 2026-09-15): dark stadium
  night, glowing wordmark, match-card + Telegram-notification mockups.
  Verified before shipping (vision-model review): wordmark spelled exactly
  "SportSignal", Persian glyphs well-formed, no visual defects. Optimized
  1774×887 → 1280×640 (~0.98 MB).
- The README renders it full-width above the title; the regeneration prompt
  that used to live in the banner slot is preserved in git history
  (`git show 759cec0:README.md`).

### README catch-up
- "Current build" line: 13.48-xtrim → 13.51-rivalries (had drifted three
  releases behind the shipped reality).
- Status section lists 13.49-buttons / 13.50-cupscan(+.1) / 13.51-rivalries
  with the 21:40Z real-cap incident note; next-up section = the
  continuation note + R6/R7.
- The bot table row links @SportSignalAlertsBot directly; the repo layout
  lists `docs/`.

### Deploy record (13.51-rivalries — the code this addendum ships beside)
13.51-rivalries was committed in the previous session but could not deploy
(no Cloudflare token available then). This session: `npm test` 135/135 →
local smoke (`wrangler dev`: healthz shape + version, `/` 200, 404s
correct, `/admin` 200) → `wrangler deploy` (Version
`5bc68c8f-eb6a-41ff-9557-0ee5a9a91d93`, bindings STATE/AI/TEHRAN_TZ
unchanged, cron `*/10` intact) → live-verified: healthz flipped to
13.51-rivalries `ok:true`; the first two post-deploy ticks completed clean
(23:10Z: +4 writes, 53 subrequests; 23:20Z: +4 writes, 69 subrequests;
outbox 0 both, budget null); Telegram webhook 0 pending, no errors.

---

## [13.51-rivalries] — 2026-09-15 (named rivalries: El Clásico, not "Derby")

### The user's ask
The system labelled Real Madrid–Barcelona as a generic "Derby". It isn't —
in La Liga (or the Copa del Rey) it's **El Clásico**; in the Champions
League it's *just a UCL match*. Same treatment for the other marquee
pairings, with names shown **in English only** — Persian keeps exactly one
translated name: ال کلاسیکو.

### The rivalry table (src/matches.ts)
`RIVALRY_PAIRS` + `rivalryName(match, lang)` — the named tag for the
match in that language, or null:
- Real Madrid–Barcelona → **El Clásico** (fa: ال کلاسیکو)
- Bayern–Dortmund → Der Klassiker
- Milan–Inter → Derby della Madonnina
- Liverpool–Man United → North West Derby
- Man United–Man City → Manchester Derby
- Arsenal–Tottenham → North London Derby
- PSG–Marseille → Le Classique
- Roma–Lazio → Derby della Capitale
- Juventus–Torino → Derby della Mole

Three rules encoded in the one function:
1. **Never in the UCL** (`competition.code === "CL"` → null). Applied to
   `isDerby()` too: a derby pairing in the Champions League is just a UCL
   match (it flows to the week-ahead "UCL duels" bucket instead of the
   derbies bucket, and the CL-blockbuster banner still applies on its own).
2. **fa gets only ال کلاسیکو** — every other name is English-only; fa
   consumers (specialBanner, the card, the site badge) drop the tag
   entirely for those pairs rather than show English text.
3. The pairs also stay in `DERBY_PAIRS`, so derby sorting/boxing keeps
   seeing them (Merseyside + the Madrid derby keep the generic tag).

### Latent bug fixed along the way: Der Klassiker never matched
`DERBY_NORM` normalized pair names with bare `normalizeTeamName`
(→ `bayernmunich`) while match names go through `normAlias` (→
`bayernmunchen` via the alias table) — Bayern–Dortmund could never be
detected as a derby. `DERBY_NORM` now goes through `normAlias` as well.
Also added the `sslazio → lazio` alias fold (FD's legal "SS Lazio" vs
the short "Lazio" the rivalry table carries).

### Surfaces updated
- `specialBanner` (all Telegram notifications: 24h/big/3h/1h/5min/start/
  result + the featured match + the X mirror): named banner replaces the
  generic "⚔️ Derby" line; fa shows only ال کلاسیکو.
- `pubMatch` (public-matches JSON): new `rivalry` (English name) and
  `rivalryFa` fields; `derby` stays for row styling/boxing.
- The match card (`src/card.ts`): the tag is now computed server-side
  from the match itself — the card also renders for the raw tracked pool
  (bot notification cards), which carries no `.derby` field, so the
  "⚔️ DERBY" text never appeared there at all. Named rivalries show the
  name (⚔️ El Clásico); fa cards show ال کلاسیکو only; UCL never tags.
- The public site (`assets/public-13.12.js`): `derbyLabel()` drives both
  badge spots — named badges replace the generic one (🔥 El Clásico), fa
  drops badges for English-only names (row keeps `.derby` styling).
- SW cache bumped v11 → v12 (the v13.39 rule: every asset-editing
  release bumps).

### Tests
`scripts/live-derby-test.js` — A2 section: every pair name (FD and TSP
spellings), the UCL exclusion (both `rivalryName` and `isDerby`), the
fa-only-Clásico rule, the SS Lazio fold, and the DERBY_NORM fix.
`check-venue` / `check-composers` got `rivalryName` stubs.

---

## [13.50-cupscan] — 2026-09-15 (the EFL Cup hole: coverage via the team view)

### The incident
The user missed Liverpool–Tottenham, EFL Cup R32 (2026-09-15 19:00Z).
Forensics: the fixture existed NOWHERE in the pool. Root cause chain
(all three providers checked live):
- **football-data.org**: EFL Cup is not on the free tier (by design).
- **sportscore**: the `efl-cup` competition feed returns zero matches on
  every date probed (every slug variant tried) — their EFL Cup data is
  simply absent in this window. (Coppa Italia, CDR etc. still flow.)
- **TheSportsDB**: the correct league (id 4570, verified via lookupleague)
  — but TSP's LEAGUE views silently regressed: `eventsnextleague` /
  `eventspastleague` now return exactly ONE event per league (the Premier
  League control returned 1 too), and `eventsseason`/`eventsround` are
  partial. Meanwhile the TEAM view (`eventsnext.php?id=<teamId>`) is
  complete: fixtures + live scores + strStatus. The Liverpool–Tottenham
  tie existed ONLY there.

### The fix
A bounded, marker-gated **team scan** on non-sweep ticks:
- `CUP_TEAM_TSP_IDS` (tables.ts): the 6 English big teams' TSP ids,
  verified live (Arsenal 133604, Chelsea 133610, Liverpool 133602,
  Man City 133613, Man United 133612, Tottenham 133616). These are the
  teams that make cup matches notify-worthy (`shouldNotify`:
  big-team-involvement for domestic cups) — so the scan covers exactly
  the alertable surface of EFL Cup + FA Cup R3.
- **maybeScanCupFixtures** (providers.ts): fetches each team's next
  events (paced 1.2s), filters to EFL_CUP/FA_CUP (idLeague 4570 + name
  map), dedupes against the pool by matchKey. ADDs append to the pool +
  the tick's in-memory view (pre-match windows fire). UPDATEs refresh
  status/score of existing rows (status-change detection → result alerts).
- **Marker `cup_scan_v1`**: ok = skip 5h; fail = back off 30 min; HOT
  window (a tracked cup match within [-1h, +4h]) = re-scan at most every
  30 min so live scores/FT flow at near-tick cadence. Never runs on
  full-sweep ticks (~42/48 fetch budget already spent); never runs under
  the SOFT governor; never on an empty pool.
- **cupEventToMatch**: the team-view mapper — tspEventToMatch plus the
  LIVE status vocabulary (NS/1H/HT/2H/ET/FT/AET/PEN → our SCHEDULED/
  LIVE/PAUSED/FINISHED) and score-stored-only-when-in-play (TSP shows
  0-0 pre-kickoff — same rule as the sportscore path).
- Cost: ~6 fetches + ~2 KV writes per scan (≤5 scans/day quiet, up to
  hourly during a cup evening) — well inside every measured budget.

### Known limits (documented, not hidden)
- Coverage = the 6 English big teams (the alertable surface). A
  Peterborough–Barnsley EFL Cup tie between two untracked teams is
  invisible (it is also not alertable — by design).
- Live scores/FT for cup matches flow through the TSP team view, which
  updates with a few minutes of lag. If sportscore's efl-cup feed ever
  returns, the existing near-sweep takes over with fresher data.
- The TSP team ids are hardcoded contracts (verified live 2026-09-15) —
  same house pattern as CUP_TSP_IDS.

### Tests
- check-cups.js: +7 behavioral checks on the real cupEventToMatch
  (NS/2H/HT/FT/AET/empty → status vocabulary + score gating + roundRaw).
- check-reliability.js: +11 #cupscan structural asserts (team table,
  team-view URL, EFL/FA filter, marker TTLs, fail backoff, hot window,
  empty-pool skip, cacheMatches persistence, cron gating, in-memory
  patches, row overlays).
- check-venue.js: TSP shared-mapper call-site count 3 → 4 (co-evolved).
- npm test exit 0 (519 OK lines, was 508).

---

## [13.49-buttons] — 2026-09-15 (the bot is tappable, not slash-only)

### The user report
"Telegram bot doesn't have buttons and works with slash commands."
Investigation: PARTIALLY TRUE — a persistent reply keyboard has existed
since v13.23-buttons, but it was attached only to /start, /featured and the
language callback. Every other reply sent a bare message, so the keyboard
was easy to lose (collapse it once, or join pre-v13.23 and never re-/start
— you never saw buttons again) and the per-user options (/teams selection,
/timezone) were number/city-typing flows.

### What changed
- **Every bot command reply now re-attaches the persistent reply keyboard**
  (a fresh keyboard message re-expands it if collapsed) — /stop, /help,
  /follow ×3, /timezone ×3, /next ×2, /tables fallback, unknown-command.
- **New keyboard button: Timezone** (fa "زمان" / en) alongside Teams,
  Language, Help, Stop; normalizeCommand maps the label to /timezone.
- **/teams is now a tappable inline grid**: every followable team is a
  button (✅ when followed; 2 per row; "همه تیم‌ها" resets to all). Tap →
  toggle → the message re-renders IN PLACE (editMessageText) so the marks
  never go stale. The numbered text list stays for /follow 1,3,7.
  Toggle semantics: in follow-all mode the FIRST tap starts a fresh
  selection with that team (never all-minus-one — that would silently
  REMOVE alerts); removing the last selected team is refused (min-one
  guard); tf:all preserves lang+tz.
- **/timezone is now tappable**: a quick-pick grid of 9 cities (Tehran,
  London, Paris, Berlin, New York, Los Angeles, Dubai, Sydney, Tokyo) +
  reset — resolved via the same TZ_ALIASES as the typed command; the
  message re-renders in place after each pick.
- **/help** gained the tap hint; telegram.ts gained `editMessageText`
  (single attempt, benign-error tolerant — a failed edit is cosmetic).

### Tests
- check-bot-edges.js: +13 behavioral tests (grid shape, tf:2 all-mode
  first-tap, in-place re-render, min-one guard, multi-select accumulate,
  tf:all lang+tz preservation, tz:london/reset/invalid, /timezone picker,
  real replyKeyboard/normalizeCommand extraction) — now 34 checks; the
  REAL grid builders are sliced into the eval (not stubs).
- check-join-flow.js: builders injected + stubs (toFaDigits,
  replyKeyboard); the numbered-list contract still asserted.
- check-reliability.js: +8 #buttons asserts (Timezone button + mapping,
  builders exist, tf:/tz: handlers, editMessageText sender, ≥10 keyboard
  attach sites, min-one guard).
- npm test exit 0 (508 OK lines, was 482).

---

## [13.48-xtrim] — 2026-09-15 (the X path is removed, not dormant)

### The decision (R4 of the reliability roadmap)
The X (Twitter) mirror was dead-in-practice: no X_* secrets were ever
set, `x_enabled_v1` was never written, and every tick since v12.33 has
taken the "X disabled" early return. Three options were weighed:

1. **Compile-time gating** (keep src/x.ts on disk, exclude it from the
   eval-concat bundle) — REJECTED. It breaks the no-drift test
   discipline: check-x-* would test code that never ships, the exact
   rot class the eval-extract harness exists to prevent. The call sites
   (cron X phase, six admin routes, admin UI card) would still have to
   be removed anyway.
2. **Documented deferral** (keep shipping it disabled) — REJECTED. The
   cost is not zero: six admin-reachable routes, OAuth 1.0a signing
   code, and 586 lines ship in every bundle, and every future release
   carries the coupling.
3. **Full removal** — CHOSEN. It is the house pattern (13.46-trim
   proved the guard-flip flow), git preserves the full history
   (docs/history/2026-09-13-NEXT-SESSION-X-INTEGRATION.md tells the
   story), and the restore path is documented in wrangler.toml +
   src/config.ts: revert this commit, set the X_* secrets via
   `wrangler secret put`, write `x_enabled_v1=1`.

### Removed
- `src/x.ts` (586 lines): OAuth 1.0a signing, budget/dedupe/pause
  governors, the Persian post composers, maybePostX/maybePostXWeekly.
- `scripts/check-x-signature.js` (192) + `scripts/check-x-budget.js`
  (315): their eval subjects no longer exist; dropped from the npm test
  chain (still 19 → 17 suites + tsc; 135 behavioral checks still pass —
  none of them tested X, they test the notification invariants).
- `scripts/verify-x-connection.js` (172): the standalone live-creds
  probe, orphaned with the path.
- The cron X phase (try/catch block after the Telegram coronation
  alerts) and the `tableToppersEvents` capture that existed only to
  feed it. `maybeNotifyTableToppers` (the TELEGRAM coronation feature)
  is untouched — #qc1 still locks its full-sweep gating.
- Six admin routes (`/admin/x-test`, `/api/x/status|phase|dry-run|
  enabled|clear-pause`) from admin-ops.ts, plus the admin panel's X
  status card (HTML + 7 JS handlers + boot call).
- `X_CONFIG` from config.ts (the KV-key contract keeps every live key;
  the x_* rows in RUNBOOK §5 now read "REMOVED at 13.48-xtrim") and the
  X_* fields from the Env type.
- Two dead imports api.ts had carried since 13.47 (X_CONFIG,
  getXStatus/xTestPost — leftovers of the split, never used there).

### Known dormant (deliberately untouched)
`assets/core-13.8.js` still carries 18 i18n keys (9 fa + 9 en) and the
stale `ver` footer string for the removed card. They are inert dict
entries in a LIVE public minified asset — not worth the blast radius of
editing the public bundle for zero functional gain. Same call as R2's
sw.js CACHE: leave the public asset alone, note it here.

### Tests
- New #xtrim suite in check-reliability.js (7 asserts): the concat has
  no x.ts segment, no X functions, no X_CONFIG, admin-ops has no X
  routes, the admin page has no card, cron has no X phase, and the
  harness order no longer ships x.ts.
- #seams X_CONFIG presence assert flipped to absence; #f10f re-scoped
  from xPostTweet's bump shape to the surviving telegram send-path
  bump (`if (bumpSubrequest()) return false;`) — the R1 fetch-only
  counter discipline is unchanged, minus the deleted site.
- worker-src.js order co-evolved in the SAME commit (x.ts out at
  position 15). npm test: exit 0, all suites green.

---

## [13.47-seams] — 2026-09-15 (modularization: the monolith gets seams)

### The theme
R3 of the reliability roadmap. Pure code movement — bodies moved
byte-identical, every export signature unchanged, zero behavior changes,
zero KV changes, zero asset changes (sw.js CACHE stays sportsignal-v11).
The eval harness (scripts/lib/worker-src.js) file list co-evolved in the
SAME commit (the harness silently skips missing files — a forgotten file
would pass every regex while a whole module went dark; the new #seams
asserts lock the order list itself).

### The splits
- `src/config.ts` (512→349) → + `src/tables.ts`: the static dictionaries
  (STAGE_EN/FA, COMP_EN, LEAGUE_LOGOS, provider id maps, CSP headers, the
  UCL starball) left the config module. config.ts keeps the KV-key
  contract (CONFIG), X_CONFIG tunables and VERSION — one file owns every
  live-state key.
- `src/cron.ts` (603→507) → + `src/monitoring.ts` (getCronStatus,
  alertPhaseError, liveFingerprint) + `src/migration.ts`
  (maybeBroadcastMigration — the mig_sent_v1 round broadcast, body moved
  verbatim). The tick keeps the meter/governor/lock/pool/completion blob:
  the #quota1 truemeter invariants are order-locked text, and phase
  extraction would be a rewrite of the quota guarantee (anti-goal —
  revisit only with failure-injection tests).
- `src/api.ts` (1101→312) → + `src/auth.ts` (admin login/logout/
  change-password — the stateless HMAC cookie block), `src/public-swr.ts`
  (the /api/public-matches SWR endpoint), `src/card-route.ts`
  (/api/card/:matchKey), `src/simulate.ts` (the SIMULATE_ROUTE entry +
  body, moved together), `src/admin-ops.ts` (ADMIN_OPS_ROUTES — 18
  admin/ops route entries + legacyGetAction, moved WITH their bodies so
  check-security's slice-based override guard keeps its adjacency).
  api.ts is now the router proper: dispatch + table spread + healthz +
  the dead man's switch scheduled handler.
- `src/types.ts` gains RouteCtx/RouteDef (shared by api/admin-ops/simulate
  — type-only, no runtime cycle).

### Why entries moved WITH bodies
check-security extracts the concat slice from the "/api/fa-teams/override"
string forward and asserts isValidFaName/isAdminAuthed within it — a thin
route entry in api.ts with the body in an earlier concat file would
silently break that guard. Moving whole entries keeps every slice-based
assertion self-contained.

### The 1101 (found live, fixed pre-release-window-close)
The first deploy of 13.47 threw `error 1101` on every request for ~90s
(17:51:30–17:53:00Z) — rolled back immediately; no tick was lost (the
17:50 tick completed pre-deploy; the 18:00 tick ran on the fixed build).
Root cause: the ADMIN_OPS_ROUTES entries were joined with an extra comma
on top of each entry's own trailing comma — 18 array ELISIONS
(`} },,`), i.e. 18 `undefined` elements; the dispatch loop read
`undefined.path` → TypeError on every request. Every gate missed it:
elisions are legal TypeScript (tsc green), the test harness only
regexes/evals-extracts text (holes invisible), esbuild parses elisions
fine. Two new gates: #seams zero-elision assert + entry/terminator count
lock in check-reliability.js, and a LOCAL SMOKE TEST step in RUNBOOK §2
(wrangler dev + curl /healthz before every deploy) — the gate that
would have caught it.

### Tests
+22 #seams asserts in check-reliability.js (harness order list contains
every new file; bot.ts→cron.ts marker adjacency for botSeg13; the
spreads; per-file slice ownership for tables/monitoring/migration/auth/
swr/card-route/admin-ops/simulate; cron.ts keeps the meter + completion
blob; api.ts keeps scheduled() + healthz). npm test exit 0 — 135
behavioral checks.

## [13.46-trim] — 2026-09-15 (tidy-up: dead code, landmines, and docs telling the truth)

### The theme
R2 of the reliability roadmap — a hygiene release. Zero behavior changes,
zero KV changes, zero asset-reference changes (sw.js CACHE stays
sportsignal-v11). Every deletion below was reference-verified (grep across
src/scripts/docs/assets) before the axe; every test guard that protected
dead code was flipped to an absence assert in the same commit, per the
house style (#1 sched decoy / #5 canary).

### Landmines removed
- `npm run refactor:verify` — DESTRUCTIVE and broken: the `--check` flag
  was never implemented, so the command re-ran the v12.33 extraction and
  OVERWROTE src/ from the stale bundle (verified live once, restored via
  git); its `||`/`&&` precedence was also broken. The whole extraction
  pipeline is retired: `scripts/refactor-extract.mjs`,
  `scripts/worker.bundle-v12.33.ts` (711KB — 2/3 of scripts/),
  `refactor-{fix-imports,prune-imports,client-core}.mjs`,
  `refactor-router-table.py`, and `extract-page-assets.mjs` (one-offs).
  History lives in git and this changelog.
- `bun.lock` — stale since v12.10 AND broken (missing @resvg/resvg-wasm, so
  a `bun install` produces a tree that can't render cards). npm is the
  repo's toolchain; `package-lock.json` is the canonical lockfile.
- Dead assets: `assets/Stadium-bg-1.jpeg` (2.0MB, referenced only by an
  X-banner intent note), `assets/Live.lottie` + `assets/loading.lottie`
  (dotLottie was removed in v13.4; the current live-dot is pure CSS).

### Dead code removed (all zero-caller, verified)
- `getCanonicalKickoff` / `updateCanonicalKickoffOnReschedule` (admin.ts)
  + `KV_KICKOFF_PREFIX` (config.ts) + admin.ts's now-orphaned `matchKey`
  import — the kickoff_v1: feature never wired (detectStatusChanges never
  called the helpers; windows always used the pool's utcDate). check-reliability
  #4 flipped to absence.
- `sendPhoto` (URL-based, telegram.ts — superseded by `sendPhotoBinary`
  v13.17) and the `sendTelegramWithKeyboard` alias (v13.2 merged it into
  sendTelegram's optional keyboard param).
- `getUserLang` (users.ts — the fa default made it dead).
- `UCL_BALL` (config.ts — 4KB starball variant with zero references;
  `UCL_LOGO_CHIP`/`UCL_STARBALL_D` stay, they're live in public.ts).
- x.ts's duplicate `NOTIFICATION_CONFIGS` table (a byte-duplicate of
  notifications.ts's live config; the eval concat had the var declared
  twice) + the 5 window fns and 7 formatters its imports dragged in.
  The LIVE x.ts imports stay: `isMatchFinished`, `isWithinPostMatchWindow`,
  `isMatchStartingNow`, `fetchStandings`, `isoWeekKey`, `weeklyTableCodes`.
- types.ts: the 14 extraction-era domain interfaces nobody imported
  (Match/TeamRef/StandingsTable/…). Env (+ LooseKV/WorkersAI) is the only
  contract the modules share — and it now documents `HEALTHCHECK_PING_URL`,
  which 13.45 reads but never declared.
- worker.ts's unused `CONFIG/VERSION/X_CONFIG` import.

### Docs now tell the truth
- **README.md** rewritten from v11.52-era claims (wrong alert model, wrong
  KV keys, `teams.js`/`dedupe.js` file refs, missing /healthz + governor +
  dead-man's-switch semantics) to the v13.46 architecture.
- **RUNBOOK.md** (new): operations — deploy/verify/rollback procedures,
  monitor + alert semantics (healthchecks.io cron-watch + UptimeRobot
  healthz poll + the degraded band), the healthz coverage matrix, missed/
  duplicate notification investigation playbooks, KV key table, measured
  profiles & budgets, and the safety invariants (write-first dedupe, no KV
  renames, eval-harness co-evolution rule).
- `NEXT-SESSION-X-INTEGRATION.md` (self-contradictory dates, pre-v13.0
  architecture) → `docs/history/`. `NEXT-SESSION-CONTINUATION.md` replaced
  by a thin pointer doc (CHANGELOG + RUNBOOK + worklog are the record now).
- `design-system/ucl-notifier/MASTER.md` header fixed: the UI lives in
  `src/pages/*.ts` + versioned assets, not in a monolithic worker.ts.

### Kept on purpose
- `KV_SCHEDULE_PREFIX` (config.ts) — documentation-only tripwire for the
  sched_v1:* TTL cleanup (~Sep-22).
- `scripts/verify-x-connection.js` (live X ops tool, standalone signing
  impl) and `scripts/fa-names-from-wikipedia.js` (data provenance for
  fa-dict.ts).

Tests: check-reliability #4 flipped to absence (3 asserts); npm test exit 0
(tsc clean, 135 behavioral checks, 19 scripts). No src signatures changed,
so worker-src.js order/transforms needed no edits.

---

## [13.45.1-sightlines] — 2026-09-15 (log-line truemeter: stored and logged must agree exactly)

- The 13.45 closing log line printed `KV ops this tick: ${kvOpsCount() + 1}`
  — but by the time the log runs, the completion blob's own put has ALREADY
  been counted by the wrapper, so the +1 double-counted it (live first tick:
  stored subreq_last_tick=27, logged 28). Same discipline 13.44.1 applied to
  the write meter: the log now prints the as-run count (blob put included,
  no +1) and agrees exactly with the stored blob fields. The healthcheck
  ping (post-completion, one more fetch) remains deliberately excluded, as
  documented in 13.45.

---

## [13.45-sightlines] — 2026-09-15 (see everything: true subrequest totals, dead man's switch, degraded band)

### The theme
Six observability/guard fixes, zero behavior changes on the notification
path. Everything previously invisible now has a number attached, and the
free external monitoring stack (healthchecks.io dead man's switch +
UptimeRobot healthz poll) goes live on the worker side.

### F10 — the subrequest counter was blind to KV ops + 5 fetch sites
- The counter only ever saw fetchJSON/fetchWithRetry/telegram/admin. Every
  STATE.get/delete and five raw fetch sites (x.ts xPostTweet, card.ts crest
  fetch, composers.ts standings + teams, users.ts getChat backfill) ran
  invisible — the notify-defer guard (>38) and the prewarm gate (<30) were
  deciding on fiction, and a busy sweep could sail past the real 50 ceiling.
- Fix: KV ops counted via a SECOND counter (bumpKvOp/kvOpsCount), wrapped
  with the same __orig pinning as the write meter; the five raw sites now
  bump with graceful fallbacks (placeholder crest / no standings this tick /
  backfill stops / X post returns budget-exhausted). The GATES keep their
  fetch-only semantics BY DESIGN — they were tuned on that number; the true
  total (fetches + KV ops) is the new sightline: completion-blob fields
  subreq_last_tick / kv_ops_last_tick, the closing log line, and healthz.
- Net effect: standings/crests/X-posts/getChats now contend for the budget
  honestly instead of hiding outside the meter.

### Dead man's switch (healthchecks.io)
- CF has no "cron didn't fire" alerting, and URL monitors can't see hung or
  CPU-killed ticks (the worker keeps serving 200s — the exact 2026-09-14
  shape: 49 dead ticks while healthz said ok). pingHealthcheck: success
  ping after every resolved tick (early returns are handled outcomes →
  success; a HUNG tick is instead caught by healthz's last_cron staleness
  → 503 → UptimeRobot — every failure class has exactly one watcher);
  /fail ping from the scheduled handler's catch with the error name in the
  POST body (verified live: path-suffix messages 400, the body form is
  accepted and surfaces in the alert + log). Fire-and-forget via
  ctx.waitUntil, counted against the subrequest budget (at cap it is
  skipped — the missed success ping covers that class), and a no-op
  without the HEALTHCHECK_PING_URL secret.

### healthz degraded band (additive)
- `degraded: true` while still HTTP 200: ages past 2 periods, outbox > 10,
  or the KV governor engaged. The 200/503 decision is byte-identical; new
  fields subreq_last_tick + kv_ops_last_tick join the payload.

### The NaN (W6)
- notificationCounts was missing "pre-match-5min": 0 — the config type
  exists, so every 5-min send incremented a missing key → NaN → JSON null
  in the tick blob's notify.s counters. One line.

### fa-ai marker gating (W7)
- KV_FA_LAST_RUN was written every 15-min cooldown even when there was
  nothing to learn (~96 writes/day = 9.6% of the 1,000/day free quota for
  a signal worth zero). The marker moved BELOW the emptiness check
  (write-first fail-backoff semantics preserved for real work), and an
  isolate-level empty-verdict cache keyed on the public payload ts keeps
  the empty path at one KV read per tick.

### Bot sweep guard (W8)
- /featured and /next used to re-run the FULL provider sweep when the pool
  was >10 min old — a user-typed command could burn ~100ms of CPU on a
  FETCH invocation (the exact poison behind the 2026-09-14 CPU kills,
  which 13.43 fixed for cron) plus unmetered KV pool writes. Bot commands
  now serve the KV pool (at most one full sweep / 2h old — the same
  semantics as cron's quiet period) and never sweep. fetchMatchesFromAPI
  is gone from bot.ts entirely (test-locked to stay gone).

### Tests
- check-reliability.js: +13 asserts (#f10a-#f10g, #hc1-#hc3, #n1,
  #fai1-#fai2, #w8) — including the file-level absence assert that bot.ts
  can never call fetchMatchesFromAPI again.

---

## [13.44.1-truemeter] — 2026-09-15 (the meter tells the truth: fold the completion blob + prewarm writes)

### The bug the live deploy exposed
- Deployed 13.44-quotaguard at 03:05Z and watched the first ticks live:
  the tail logged `KV writes this tick: 4` while the stored accumulator
  advanced by only 3; the next tick logged 2 and the meter advanced by 1.
  **The fold was structurally off by exactly one write per tick** — the
  completion blob computes the `kv_writes_day` value it persists BEFORE its
  own put executes (the wrapper counts the put as it runs, but the number
  was already frozen). The prewarm block ran AFTER the blob too, so its
  writes (~2–4 per full sweep) were counted in the log line but never folded
  either. Net effect: the stored meter undercounted ~144–165 writes/day
  (14–16% of quota), which silently ate the governor's safety buffer —
  HARD@850 would only have engaged at a true ~994, six writes from the line,
  and healthz would have reported 856/1000 at a true 1000.

### Fixed
- The completion blob is now the tick's FINAL KV write: the prewarm block
  runs BEFORE it (so its writes fold), and the fold adds `+ 1` for the
  blob's own put — the stored accumulator, `kv_writes_last_tick` and the
  closing `💾 KV writes this tick` log line now agree EXACTLY, verified live
  (log 2 = healthz +2). Anti-spam semantics untouched: the blob is still
  one write, never gated; the prewarm move only changes WHERE in the tick
  its writes happen (its own budget gate and failure handling unchanged;
  a mid-prewarm hard death now honestly leaves `last_cron` stale — the tick
  really didn't finish — instead of lying "completed").

---

## [13.44-quotaguard] — 2026-09-15 (the free-tier budget guarantee — never exceed the KV-write quota)

### The user's ask, answered with a measured budget model
- "Make sure this system NEVER exceeds the free tiers — we're just a Telegram
  bot that shows a few messages a day." Audited every free-tier dimension
  against the real code + live telemetry: **KV writes (1,000/day) is the ONLY
  binding constraint** — requests (~1.5–3k/day incl. cron 144 + prober noise,
  limit 100k; static assets are free and don't count), KV reads (~1.5–8k/day,
  limit 100k), deletes/lists (~0, limit 1k each), storage (MBs, limit 1GB),
  cron triggers (1 of 5), subrequests (0–23 of 50, hard-capped at 48 in code),
  CPU (fixed structurally by 13.43's throttle; the remaining thin margin is
  documented — the paid plan is the permanent ceiling-lift). The scandal the
  audit found: on a COMPLETELY QUIET day the worker still burned **~690 real
  writes/day (69%)** while its own meter reported only ~450 — the v13.38 meter
  started counting AFTER the lock put and the start-heartbeat put, blind to
  ~288 writes/day (29% of the quota). A busy matchday could have pushed the
  true total past 1,000 with healthz still showing green numbers.

### Fixed — the quiet-day floor cut ~45% (690 → ~380 true writes/day)
- **Canary injection REMOVED (audit F9)**: `cacheMatches` ran BEFORE the
  injection, so the canary never persisted — every tick minted a fresh +25h
  kickoff whose 24h/3h/1h windows NEVER opened, while burning a
  `canary_match_v1` write every tick (~144/day) plus notify-path reads for a
  phantom match. Dead feature, live cost. `buildCanaryMatch` deleted; old
  `canary_match_v1` keys expire via their own 7-day TTL.
- **The START-heartbeat put is RETIRED (~−144/day)**: its two jobs are
  covered for free — "the cron fired" is proven by the execution-lock put
  (`own:<now>:<uuid>`, TTL'd) and "the tick completed" by `last_cron` in the
  completion blob; healthz (13.43) requires BOTH, so a mid-tick death still
  flips `ok:false` within ~35min. Side benefit: the kv_writes_day accumulator
  now folds at exactly one point (the completion blob), removing the old
  mid-tick clobber window.
- **The KV-write meter now wraps the VERY FIRST action of the tick** — the
  lock put and every phase write are counted, so `kv_writes_day` /
  `kv_writes_last_tick` / healthz reflect the TRUE burn. Also fixed a latent
  v13.38 chaining bug: a warm isolate re-wrapped `env.STATE.put` every 10
  minutes, layering wrapper-on-wrapper forever; the meter now pins the
  pristine binding via `__origPut` (depth stays 1, degrades gracefully if the
  runtime hands out fresh binding objects).

### Fixed — the hard guarantee: a write-budget GOVERNOR (the meter now ACTS)
- Thresholds in CONFIG: **SOFT at 700** — the tick skips cosmetic writes
  (public-payload prewarm, FA-AI learning); **HARD at 850** — additionally
  holds the pool-cache write for that tick (env-scoped `KV_BUDGET_HOLD` flag;
  the existing pool keeps serving — fixtures are static, a slightly stale
  live score for a few ticks is worth ~150 writes of headroom) and pages the
  admin once/12h via a write-first, KV-mark-deduped Telegram alert.
- **NEVER gated: the anti-spam + monitoring set** — execution lock, completion
  status blob, dedupe records, outbox, match-status telemetry. A dedupe write
  that fails under REAL quota exhaustion already defers its send fail-closed
  (v13.42), so the worst case at the 1,000 line is deferred notifications +
  a paged admin — never spam, never a dead-looking bot.
- **Web-side guard**: past the HARD threshold, visitor-driven public-payload
  rebuilds (refresh-lock + rate-limit + payload + live-detail writes, ~3–7
  per refresh) are held and the cached payload served — bounds adversarial
  write amplification (a rotating-IP scraper could otherwise mint a few writes
  per lock expiry, thousands/day). The cron prewarm path is exempt (governed
  by the cron-side governor); a cold cache still rebuilds — the public page
  must never brick.
- The completion blob records which level was engaged (`budget:
  "soft"|"hard"|null`) and `/healthz` exposes `kv_budget` — one KV read (or
  one healthz poll) answers "why did the cosmetic writes stop today".

### Fixed — two audit findings that the governor made mandatory
- **F3 (dupe vector, closed)**: `broadcastBigMatchKickoff` /
  `broadcastBigMatchResults` called `saveNotifiedMatch` but did NOT gate the
  send on its return — the v13.42 fail-closed fix covered only the regular
  path. A KV-write failure (or a governor hold) during a big-match window
  would send unrecorded → duplicate broadcast next tick. Both now gate on
  the persisted save exactly like `sendNotificationIfNeeded`.
- **F5 (football-data 429)**: `fetchWithRetry` waited a fixed 1–2s and
  retried straight back into the same exhausted quota minute (FD free tier =
  10 req/min). It now honors the `Retry-After` header (capped at 15s so a
  long hint can't stall the tick), and football-data gains the missing
  provider-suspension circuit (mirror of sportscore's): a rate-limited main
  call suspends FD for PROVIDER_SUSPEND_MS and skips the intl calls this
  sweep — the pool + other providers cover.

### Kept exactly as-is
- Anti-spam framework untouched (dedupe/write-first/at-most-once paths only
  gained gates, never lost any); no KV keys renamed (only additive:
  `kv_budget_alert_v1`); no assets changed (SW cache stays
  `sportsignal-v11`); zero runtime dependencies; Favorites gate untouched.

### Tests
- check-reliability.js: #5 canary section flipped to REMOVAL asserts; the
  #nospam8 start-heartbeat assert flipped to RETIRED; new #quota1–#quota4
  wiring section (single cron_status_v1 put, meter-before-lock ordering,
  governor thresholds + soft/hard branches, web-side guard, F3 gating, F5
  Retry-After + FD circuit).
- check-no-miss.js: canary assert flipped; new behavioral section (QUOTA) —
  broadcast fail-closed under a failing KV (F3), pool-cache hold honored
  under the HARD flag, prewarm skipped under SOFT, Retry-After wait honored
  and capped, FD suspension set on 429 exhaustion.

---

---

## [13.43-cpukeeper] — 2026-09-14/15 (the CPU-limit outage killer + a healthz that can see it)

### Root cause of BOTH Sep-14 outages — identified with hard evidence
- Cloudflare GraphQL analytics + live `wrangler tail`: the account runs on the
  Workers **FREE plan (10ms CPU, rolling-average enforcement)**, while a full
  3-provider cron sweep burns **~93–124ms CPU**. During ACTIVE windows (any
  worthy FT keeps `isActiveTime` true for 8h) the cron re-swept on EVERY
  10-min tick — ~600ms CPU/hour dragged the rolling average over the limit and
  CF killed every tick at exactly 10ms CPU (`status=exceededResources`,
  `err=1`, cpu pinned at 10000μs): the **00:20→10:10Z outage (57 consecutive
  kills; result backfill only recovered 10:50Z)** and the **22:00Z+ outage
  (still active when 13.43 was cut — no notification since 20:11Z)**. The
  start-heartbeat kept advancing, so `/healthz` reported `ok:true` throughout.

### Fixed — sweep throttling with a live-freshness layer (the outage killer)
- Full sweeps now run **at most once per QUIET_SWEEP_MS (2h) — always**
  (previously: every tick during active windows, the CPU poison).
- Between full sweeps, an active tick runs the NEW **live sweep**
  (`fetchLiveSweep`): one narrow football-data call (±2 days — statuses +
  scores for everything near kickoff) + the sportscore yesterday/today sweep
  (BL1/EL/ECL/cup live data), merged OVER the cached KV pool **in memory** —
  no KV pool writes (the pool stays the last full sweep's snapshot). HT /
  POSTPONED / FT / match-start-backfill / 5-min windows all still evaluate at
  full 10-minute cadence from the merged pool. The live sweep never throws —
  a total provider failure returns the cached pool unchanged (identical to
  the quiet path's data source). Logs `pool=X fetched=Y (fd=A spsc=B)
  merged=Z live=N` for provider-pool miss visibility. `fetchFootballData` /
  `fetchSportScore` gained optional range opts (defaults unchanged).
- **The public-payload prewarm is gated** (measured live: a live tick WITH
  the ~100ms payload rebuild = 164ms CPU): it now runs only on full sweeps
  (2h) or when the live fingerprint (identity+status+score of every live-ish
  row) actually changed — a goal / HT / FT / newly-discovered fixture. Quiet
  and unchanged live ticks skip it entirely; visitors between rebuilds
  trigger the on-demand refresh (the pre-v13.35 path).
- **`reconcileSchedules` / the `sched_v1:` decoy is DELETED**: those records
  were never read back (the fire-leg was never built — the v13.42 lesson),
  and the decoy cost one KV read per worthy match per tick (174 reads/tick
  at removal ≈ 35–90ms CPU the free-plan budget couldn't afford). Recovery
  is covered for real by the `isBackfillEligible` legs + the outbox; old
  `sched_v1:` keys expire via their own 7-day TTL. No KV schema change.

### Fixed — healthz now requires tick COMPLETION (the monitoring hole)
- `ok` previously = heartbeat-fresh only. During both CPU-limit outages every
  tick wrote its start-heartbeat and died before completing — `ok:true` for
  hours while nothing was sent. Now `ok` requires BOTH the heartbeat ≤30min
  AND `last_cron` (written only at tick completion) ≤35min; response gains
  `last_cron_age_min`. A half-dead bot now pages external monitors.

### Kept exactly as-is (anti-spam framework untouched)
- Dedupe/write-first/at-most-once paths unchanged — the live sweep only
  changes WHERE match data comes from, feeding the same gated pipeline.
- `sched_v1` decoy writes, the broadcast dedupe gating gap and the
  football-data 429/Retry-After behavior are documented in the worklog for
  13.44; no KV keys renamed; no assets changed (SW cache stays
  `sportsignal-v11`); zero runtime dependencies.

### Tests
- check-reliability.js: new wiring asserts for the throttle branch, the live
  sweep (narrow FD range + sportscore window + no-KV-write merge), the
  prewarm gate (full sweeps OR changed live fingerprint) and the healthz
  completion gate; the old #1 section now asserts the sched_v1 decoy is GONE.
- check-no-miss.js: new behavioral section (CPUKEEPER) — the live merge
  updates a pool match SCHEDULED→IN_PLAY/PAUSED/FINISHED (HT/result/backfill
  windows still detect it), the 5-min window still evaluates on a live tick,
  a pool-missed live match is discovered (the Torino–Roma shape), the live
  sweep performs ZERO `STATE.put` calls, and the prewarm fingerprint is
  order-safe + reacts only to goals/status changes/new fixtures.

---

## [13.42-rekindle] — 2026-09-14 (match-start reminder guarantee — the Torino-Roma missed-start fix)

### Fixed — the missed "match started" reminder (user bug report)
- **Report**: the user received the pre-match reminder for Torino vs Roma
  (Serie A, 20:00 Tehran) but NO reminder when the game actually kicked
  off. Forensics (KV + CF analytics + cron status): every in-window cron
  tick ran errors=0, yet NO match-start dedupe record was ever persisted
  and no message was sent — the sweep missed the match silently (provider
  pool without the SA fixture for the in-window ticks), the window closed,
  and every backstop was hollow. (The result notification at FT DID fire
  once the pool recovered — the pipeline itself was healthy.)

### Root cause — the match-start backstop was dead code on BOTH layers
- `isBackfillEligible()` had **no `"match-start"` entry** in its floors/
  maxes tables → `floor === undefined → return false` — so once the live
  window `[-1..+45min]` closed, `sendNotificationIfNeeded`'s gate rejected
  the type before anything else could run.
- The v13.9 rescue (`isMatchStartBackfillEligible`, [20-30min]) was wired
  into `shouldSendNotification` — a layer that never executes once the
  gate already returned. Unreachable since v13.9; its behavioral test
  (check-no-miss) tested the function in isolation and never caught the
  wiring, and check-reliability even asserted the dead OR-leg as correct.
- `reconcileSchedules()` (v13.9 #1) writes per-match schedule records with
  a `sent` map — **the fire-leg was never built** (nothing reads or
  updates them). `sched_v1:torino|roma|...` shows `"sent":{}`.

### Changed — the guarantee, now structural
- **Real match-start backfill**: `isBackfillEligible("match-start")` — if
  the live window was missed entirely, the start reminder fires LATE (with
  the «این یادآوری با تاخیر ارسال شد» tag) while the match is still LIVE
  (IN_PLAY/PAUSED/LIVE), up to 3h after kickoff. A FINISHED match never
  fires a "match started" (the result notification covers it, 6h window +
  24h backfill). `shouldSendNotification`'s match-start case now ORs the
  same branch (the house pattern every other type uses).
- **Fail-closed dedupe, made real**: `saveNotifiedMatch` returns whether
  the record PERSISTED; the send is gated on it. v13.36's comment claimed
  "a KV failure defers the notification (fail closed)" but the code sent
  anyway — observed live: the Torino-Roma pre-match DELIVERED with no
  record. Now: no record → no send → retry next tick; duplicates remain
  impossible AND unrecorded deliveries are impossible. MEM_DEDUPE is only
  seeded on success (the old MEM-on-failure add blocked retries for the
  isolate's lifetime = the permanent-loss side of the same bug).
- **Formatter guard**: the per-group `messageFormatter` call had zero
  try/catch — one exception aborted the whole match loop (every later
  match silently skipped that tick, invocation still errors=0). Wrapped:
  one group's failure skips only that group.
- **Breadcrumb diagnostics**: `sendMatchNotifications` returns
  `{found, noChats, budgetDeferred, sent, last}` and the cron folds it
  into `cron_status_v1` as `notify:{f,n,d,s,l}` — a missed-notification
  investigation is now a single KV read instead of an hour of forensics.
- Dead `isMatchStartBackfillEligible` removed; tests rewritten to the real
  wiring: check-no-miss behavioral matrix (50min/2h/44min/30min/finished/
  stale/postponed + end-to-end `shouldSendNotification` wiring incl. the
  exact Torino-Roma case), check-reliability asserts the branch + the
  persisted-gate + the summary return. 105 checks (was 96).

### Verification
- npm test exit 0 (tsc + version-sync + 105 checks).
- Live forensics that motivated it: notified_matches_v6 had no torino
  records pre-fix; cron ticks 16:30-17:10 UTC all errors=0; sched record
  `sent:{}`; result fired 18:41 UTC after the pool recovered.

## [13.41-uclplain] — 2026-09-14 (UCL next-matchday line: blue pill → plain text)

### Changed — the «هفته بعدی مسابقات» line de-pilled (user feedback)
- **Feedback**: "Remove blue background behind it, a simple text and emoji
  is enough" — the v13.40 date line shipped as an accent-blue pill
  (`--pill-primary` tokens); too loud for a quiet informational line.
- **Now**: `.ucl-next` is plain text — NO background, NO border, NO pill
  radius/padding, NO light-mode shadow. Muted label («هفته بعدی مسابقات:») +
  bold date in the normal text color; the 📅 emoji is the only accent. The
  date value (`b`) moved from `--pill-primary-ink` (white-on-blue) to
  `var(--text)` so it reads correctly on the bare card in BOTH themes.
- Wrap behavior, width fit, line-height and the render logic (emoji +
  label + bold value) are unchanged; JS untouched — CSS-only restyle.
- sw.js cache v10→v11: routine evict so returning clients get the new CSS
  (cache-first assets cannot refresh without a bump — the v13.39 rule).

### Verification
- npm test exit 0 (tsc + version-sync + all behavioral checks).
- Live (agent-browser, fresh session): the date line renders as plain text
  (transparent background, no border) in dark + light mode, both languages;
  date value legible in both themes; no layout shift of the table below;
  no h-scroll at 390px; console clean.

## [13.40-uclnext] — 2026-09-14 (UCL next-matchday date line in the standings card)

### Added — «هفته بعدی مسابقات: …» at the top of the UCL card (the user's ask)
- **Why**: UCL matchdays are NOT weekly — sometimes weeks or even months
  apart — so the standings card now answers "WHEN is the next round" at a
  glance: a special date line between the card header and the league table,
  e.g. «📅 هفته بعدی مسابقات: ۲۸ شهریور ۱۴۰۵، ساعت ۲۳:۳۰» (fa) /
  "📅 Next matchday: 28 Sep 2026, 23:30" (en).
- **Anchor**: the EARLIEST strictly-future kickoff in the UCL fixtures
  payload (`d.matches` — the same list the «🔥 مسابقات مهم» box renders),
  falling back to the server's projected `d.firstStart` while the season
  hasn't started. The strictly-future scan means a LIVE match or a played
  game never anchors the line; when nothing is ahead (season over / stale
  payload) the line simply does not render — never a past date.
- **Locale + timezone honest**: the date renders Jalali via the page's
  shared fa-IR Intl formatter (day month-name year — «۲۸ شهریور ۱۴۰۵»,
  Persian digits), the time via the user's SELECTED timezone (`curTz()` —
  the tz popover's choice, falling back to Asia/Tehran). Language switch and
  timezone switch both re-render it (renderUcl runs in onLang +
  rerenderAll).
- **Styling**: `.ucl-next` — an accent-tinted pill using the same
  `--pill-primary-*` tokens as the countdown chip (one visual system),
  `width:fit-content; flex-wrap` so long lines wrap on narrow phones instead
  of clipping; light mode gets a soft shadow lift. Client-only change — the
  worker payload is untouched.
- **sw.js cache bumped v9 → v10** (the v13.39 rule: every asset-editing
  release bumps — cache-first assets can't refresh without it).

---

## [13.39-favpark] — 2026-09-14 (favorites UI parked (kept in codebase) + club-name truncation fix + SW cache evict)

### Changed — the star/favorites feature is OFF the page (code kept, per the user)
- **Every favorites surface is parked behind one flag** (`FAVS_UI_ENABLED = false`
  in `public-13.12.js`) — the user pulled the feature from the UI but wants it
  kept in the codebase for possible future development:
  - the «☆ برای دنبال‌کردن تیم موردعلاقه…» **favhint** (and the whole
    `#favbar` — segmented «⭐ منتخب‌ها / همه بازی‌ها» filter + ✎ manager
    popover) no longer renders; `renderFavbar` removes any stale bar from the
    DOM instead.
  - **`favStarBtn` returns null** — the 26px star leaves every row it used to
    sit in: match rows (`.mrow`), spotitems (hero / big-matches / UCL / week /
    live), the standings mini-boxes, the full UCL table and the cup boxes.
    All 8 call sites guard the null.
  - the **`.hasfav` gold rails** and the **`.sthead-star` header spacers**
    render only when the feature is enabled (no phantom empty column).
  - **`favFilter` passes lists through unfiltered** when parked — a returning
    user whose localStorage still carries `ss_favmode="1"` would otherwise
    see every list silently filtered with no toggle left to undo it.
  - **`ss_favs` / `ss_favmode` localStorage keys are NOT wiped** — flipping
    the flag back to `true` restores the feature with everyone's old stars
    intact.

### Fixed — long club names truncated («اینتر……» → «اینتر میلان»)
- Diagnosis: on the ≥1440px layout the live/UCL/standings cards live in a
  400–460px rail; the UCL table row burned ~26px on the star column alone and
  ~318px on fixed numeric columns, squeezing the name cell to ~60px — «اینتر
  میلان» ellipsized to «اینتر……» (exactly the user's screenshot).
- The user's own prescription, applied: **widen the containers so the logos
  sit a little toward the outer edges and the names get the room** —
  - reference rail `minmax(400px,460px)` → `minmax(440px,500px)` (the main
    match column keeps 830+px);
  - `.side` gap 12→10px, `.side .team` padding-inline 4→2px (both crests move
    ~4px outward, both names gain ~8px — every match row, all breakpoints);
  - UCL table density: `.stnum` 26→24px, row/header gaps 6→5px,
    `.ucl-stand` side padding 10→8px (header labels stay exactly over their
    number columns — both rows share the same gap).
- Net effect: ~+30px per name in the live card, ~+90px per row in the UCL
  table, on top of the parked star's +26–28px.

### Fixed — featured-section (hero) club names truncated («اینتر……» in the face-off row)
- The user's follow-up screenshot: in the HERO the crests sat well inboard
  of the card edges and «اینتر میلان» clipped to «اینتر…». Measured live:
  the hero name cell was 137px while real FA names run to 140px+
  («باشگاه فوتبال بارسلونا» measured 140px at the 16px hero size) — any
  longer name (or any zoom) truncated.
- **Logos moved outward, the user's prescription again**: `.hero-data`
  horizontal padding 18→10px (the whole face-off row shifts 8px toward each
  card edge), hero crest 102→96px (still ~1.9× the topspot's 51px — the
  hierarchy holds; monogram fallback 44→42), hero-only crest→name gap
  10→6px (`.bighero .side`; every other card keeps the global 10px).
  Net: each hero name cell ~+18px (137 → ~155px) at the same card width.
- **`fitHeroNames()` — the never-truncate guarantee (public-13.12.js)**:
  after every hero render (data ticks, language switches) and on a debounced
  (150ms) window resize, each hero name is measured with clipping disabled
  and its font steps down from the clamp() base (floor 11px) until the FULL
  name fits its cell — one line, no ellipsis, any name, any language, any
  viewport/zoom. The cell's ellipsis stays as a true last resort below the
  11px readability floor. Re-running resets the inline size first, so
  growing the viewport restores the 16px hero size.

### Fixed — returning visitors were still served v13.36 page JS
- **`sw.js` cache bumped `sportsignal-v8` → `sportsignal-v9`.** The service
  worker's asset rule is cache-first-forever for `.js`/`.css`, and v13.37 /
  v13.38 edited `public-13.12.js` in place without a rename or a bump —
  SW clients kept executing v13.36 page code regardless of deploys. The
  activate handler evicts every non-current cache, so this one-time bump
  delivers the parked-favorites page (and the missed 13.37/13.38 fixes) to
  every returning client on their next visit.

### Verification
- `node --check` on the edited page script; full `npm test` gate before
  deploy; live checks: `/healthz` version fresh, no `#favbar`/`.favstar`
  nodes in the DOM, long FA names (e.g. «باشگاه فوتبال بارسلونا», 140px)
  render un-truncated in the hero + live card + UCL table, hero crests sit
  16px closer to the card edges, layout sane at 390px / 1056px / 1440px.

---

## [13.38-qc] — 2026-09-14 (quality-control round: the last at-least-once vector + measured write budget)

### Fixed — outbox drain could re-deliver already-sent messages
- **`drainOutbox` is now WRITE-FIRST** (the last at-least-once duplicate
  vector in the codebase). The old order (send → persist the keep-list,
  `.catch(()=>{})`) meant a failed keep-list write re-delivered
  ALREADY-DELIVERED messages on the next tick. Narrow window (KV writes
  failing while Telegram works) but exactly the quota-exhaustion shape this
  bot has lived through. Now: pop due items → persist the remaining list
  FIRST (abort the whole drain if that put fails — nothing sent, nothing
  lost, retry next tick) → send → failed sends re-queued best-effort.
- **Migration notice dedupe hardened**: the marker put's success now GATES
  the send (`migMarked`) — the swallowed `.catch` left v13.36's write-first
  promise hollow for this path (put fails → not marked → re-send next tick).
- **`MEM_DEDUPE` size cap** (4000, clear-on-overflow): the in-memory dedupe
  Set lived for the isolate's lifetime with no removal path — unbounded
  growth on a long-lived isolate. Safe: the KV record is the real
  never-expire line; the Set is only the write-outage fallback.
- **`table_top_v1:<code>` snapshots got a 40-day TTL** — the 7 league keys
  previously lived forever.

### Added — measured KV write budget (was pencil-only)
- **KV write meter in cron**: every `env.STATE.put` from tick start to end is
  counted; the running day-total folds into `cron_status_v1`
  (`kv_day`/`kv_writes_day`/`kv_writes_last_tick`, UTC-date-reset) and each
  tick logs its burn. Warn at >800/1000.
- **`/healthz` now exposes `kv_writes_day`** — any external monitor can
  watch the free-tier quota. Quota exhaustion was the original spam trigger;
  this turns the budget from an estimate into a live number.

### Tests
- check-no-miss.js: behavioral section R — the REAL `drainOutbox` against a
  KV mock: due items drain exactly once; a KV write failure mid-drain sends
  NOTHING and loses NOTHING (abort + retry next tick); failed sends
  re-queue with attempts+1; entries at 6 attempts drop.
- check-reliability.js: +9 `#qc1` checks (drain write-first order, abort
  path, MEM cap, snapshot TTL, migration gate, meter wiring, healthz burn,
  800 warning).

---

## [13.37-nospam2] — 2026-09-14 (anti-spam hardening round 2: every remaining send path fail-closed)

### Fixed — 4 residual spam vectors found by the post-v13.36 full-path audit
Every Telegram send path was re-audited for the "same notification more than
once" failure mode. v13.36 fixed the 4 scheduling-layer paths (regular,
result-big, match-start-big, morning digest, migration) with write-first
dedupe — but 4 MORE paths used "snapshot state" as their dedupe mechanism and
**swallowed the snapshot write failure** (`.catch(() => {})`), which re-arms
the send on every tick for as long as KV writes keep failing:

- **`detectStatusChanges` (POSTPONED / CANCELLED / HT alerts)** — the
  `match_status_v1` map IS this detector's dedupe state. A failed map write
  left `prev` stale → the same transition re-fired on EVERY tick. Now:
  persist-first, and if the persist fails, send NOTHING this tick
  (`statusMapSaved` gate) — a missed postponement/HT alert is far better
  than a duplicate storm.
- **`maybeNotifyTableToppers` (👑 coronation alerts)** — the
  `table_top_v1:<code>` snapshot is the coronation dedupe state. A failed
  snapshot write re-alerted the same coronation on every tick of the 6h
  post-match window (up to 36 copies). Now fail-closed (`snapSaved` gate).
- **`maybeSendWeeklyTables` (weekly tables digest)** — the week marker was
  written only AFTER the sends (`res.sent > 0`); a failed marker write
  re-broadcast the full digest on every tick of the 4.5h Monday window
  (up to ~27 copies), and partial-failure runs re-sent to chats that already
  got it. Now WRITE-FIRST: the marker is persisted before any send, and an
  un-persistable marker skips the digest entirely. Trade-off (accepted):
  a total Telegram outage at digest time loses that week's digest — never-
  spam outranks never-miss for one-shot digests. Per-event notifications
  keep outbox recovery.
- **`auditNotifications` (admin gap report)** — gaps can legitimately
  persist for hours (provider drops a finished match; an expected type the
  audit wants but reality never sends), so the old code alerted the admin on
  EVERY tick while gaps > 2 (up to 144 alerts/day — the bot spammed its own
  admin). Now rate-limited to one alert / 6h via the new
  `audit_alert_v1` KV stamp (new key; no existing key renamed).

### Tests
- check-no-miss.js: new **behavioral section Q** — evals the REAL
  `detectStatusChanges` against a KV mock whose put can fail: POSTPONED and
  HT transitions are suppressed while the map is un-persisted (2 consecutive
  failing ticks), fire EXACTLY ONCE when KV recovers, and never duplicate
  again afterwards.
- check-reliability.js: +9 `#nospam10` source-order/gating checks (fail-closed
  gates on all three snapshot paths, weekly write-first marker before the
  first send, old post-send marker removed, audit stamp + 6h window, new KV
  key defined).
- check-weekly-tables.js: outage semantics updated to the write-first
  contract — an outage run CONSUMES the week slot (anti-spam), there is NO
  retry next tick, and a not-started week consumes the slot.

---

## [13.36-nospam] — 2026-09-14 (exactly-once notifications: kills the 10-20× spam + cron-outage hardening)

### Fixed — the "bot spamming 10-20 times" bug (user-reported)
- **THE LINE: one event → one reminder, never re-armed.**
  `shouldSendNotification` now treats ANY prior record of
  (matchKey, notificationType) as blocking — the record's `expiresAt` is
  demoted to pure KV-size hygiene. Previously a record that expired
  mid-window silently re-armed the send (the old default expiry was
  kickoff+1h while "result-big" stays eligible for the whole 6h post-match
  window). Every type's expiry is ≥ its window's end, so cleanup can never
  purge a record whose window is still open.
- **The missing broadcast dedupe checks (primary spam engine).**
  `broadcastBigMatchResults` + `broadcastBigMatchKickoff` (digest.ts) loaded
  the dedupe state but NEVER consulted it — the comments claimed "deduped
  via result-big / match-start-big" while the code sent first and saved
  after. A finished master big-match therefore re-sent its FT to all
  non-followers on EVERY 10-min tick of the 6h post window (up to 36
  copies) and the kickoff broadcast re-sent across its whole -1..+45min
  window. Both now check → save → send like every other path; both types
  got real cases in `shouldSendNotification`.
- **Write-first dedupe everywhere.** All send paths now persist the
  "already sent" record BEFORE the Telegram send: the regular notification
  path (`sendNotificationIfNeeded`), both big-match broadcasts, the
  morning digest, and the migration broadcast. The old send-then-save
  ordering meant a failed KV write (free-tier quota exhaustion) left the
  notification unrecorded — the next tick's fresh isolate re-sent it
  (v13.27's in-memory fallback only lives within ONE isolate; cron ticks
  run in fresh isolates). With write-first, a KV failure defers the
  notification to the next tick (fail closed) — duplicates are now
  structurally impossible. Hard send failures are still recovered by the
  outbox (delivery retries live at the Telegram layer, not the dedupe
  layer).
- **Proper expiries for the broadcast types**: "result-big" now records
  now+24h (was the kickoff+1h default) and "match-start-big" gets
  matchTime+2h.

### Fixed — "focus on upcoming events, not past"
- **Notification horizon fence**: `sendMatchNotifications` only considers
  matches inside [-26h, +73h] of kickoff (+73h covers the 72h big-match
  pre-window; -26h covers the widest legal look-back, the result backfill
  at +24h). Anything older is dead weight — past events can remind at
  most once and the sweep stops wasting iterations on them.

### Reliability — the invisible 10-hour cron outage (Sep 14 00:20→10:10 UTC)
- Evidence: Cloudflare analytics showed err=1 on EVERY cron tick for ~10h
  (dying mid-sweep first, then pinned at subreq=0), self-healed at 10:10.
  HTTP stayed healthy; only the heartbeat went stale (healthz ok:false,
  599min) with zero diagnostics.
- **START heartbeat**: cron_status_v1.heartbeat is written right after the
  lock acquisition — a mid-tick crash no longer freezes the liveness
  signal; `last_cron` still proves a tick COMPLETED.
- **Fail-closed lock write**: the execution-lock put (previously the only
  unguarded KV write in the pre-flight path) is now guarded — on failure
  the tick aborts with an admin alert instead of dying silently or, worse,
  running without a lock.
- **Per-phase guards + admin alerts**: applySettings, user-list read,
  match-pool/fetch, and sendMatchNotifications no longer re-throw through
  the big try/catch. Failures alert the admin chat (rate-limited 1/30min
  per isolate) with the phase name + error — the next outage is
  diagnosable from Telegram within minutes.
- **KV write quota cut ~288/day**: `cleanup_hour` guard is isolate-local
  (was a KV write every tick); `last_full_sweep` folded into the
  cron_status_v1 blob (one status write/tick instead of two). New floor
  ≈500-650 writes/day against the 1,000/day free quota.

### Debt (carried from the interrupted v13.36-anytight session)
- 8 admin-route `req.json().catch(()=>null) as any` copies → `readJson()`
  helper; ~10 `: any` annotations tightened in api.ts (load-bearing union
  annotated with rationale); assets public-13.11→13.12, SW cache v7→v8.

### Verification
- npm test exit 0 — 387 assertions (35 new: never-expire line behavioral
  evals incl. expired-record blocking for both regular + broadcast types,
  write-first source-order checks for all 4 send paths, horizon fence,
  guarded lock, start-heartbeat, phase guards, quota cuts). wrangler
  --dry-run bundles clean.

---

## [13.35-prewarm] — 2026-09-14 (cron pre-warm kills the cold sweep + cup round chips + team favorites)

### Performance / reliability
- **Cron pre-warm of the public payload** (the last latency gap from the
  v13.34 QA): the first visitor after a quiet gap paid the full provider
  sweep (~4.6s cold `/api/public-matches`). The cron tick now rebuilds the
  payload at the END of every sweep via `fetchPublicMatches(env, null,
  { prewarm: true, pool: matches })`:
  - **Pool ride-along** — the sweep is the expensive part; cron hands over
    the pool it ALREADY fetched this tick, so the pre-warm costs ZERO extra
    provider subrequests. Budget-guarded: only runs with `< 30` subrequests
    used (standings need ≤6; the pool is free).
  - **Prewarm freshness window** — prewarm-stamped payloads stay fresh for
    9.25 min (a full 10-min tick gap → the KV payload NEVER goes cold
    between ticks); everything else keeps the 3-min SWR window. Live
    payloads always keep 3 min (fresh minutes/scorers matter).
  - **KV TTL 720s** for prewarm writes (≥ the tick gap; visitor writes stay
    300s). Write math (worst case: zero visitors, all quiet): +1 payload
    write/tick = ≤144/day; snapshot stays change-only; grand total well
    under the 1,000/day quota.
  - **Canary leak closed**: the canary match lives only in cron's in-memory
    pool — comments CLAIMED the public page filters it, but nothing did
    (protection was pure indirection: the KV pool never contains it). The
    pre-warm path passes the in-memory pool directly, so `opts.pool` now
    strips `m.canary` explicitly (belt-and-braces, verified by test).

### Features (backlog §F: FA Cup tier/round filtering + EL/ECL qualifying relabel)
- **Cup round chips**: cup fixtures now carry `round` (raw provider label)
  + `roundFa` (Persian twin) on EVERY public payload row via
  `roundLabel()` — FD stage enums (SEMI_FINALS→نیمه‌نهایی) AND sportscore
  free text ("Round of 16"→یک‌هشتم نهایی, "Quarter-finals"→یک‌چهارم
  نهایی, "Round 3"→دور سوم, qualifying/preliminary→مقدماتی). The UI
  renders the chip in the cup boxes (between pairing and date), in
  spotitem info lines, and on finished rows — league rows carry null →
  no chip. FA mode requires a translated label (untranslated Latin stays
  hidden in FA); EN shows any raw label.
- **Team favorites (star your teams)** — pure client feature, ZERO KV cost:
  tap the ☆ beside any team name to pin it (localStorage `ss_favs`, keys =
  English provider names → stable across FA/EN switches). Starred teams'
  matches get a gold rail + warm wash (.hasfav) and a segmented
  «⭐ منتخب‌ها / همه بازی‌ها» filter bar (localStorage `ss_favmode`)
  appears above the first card, filtering the big-matches, live, week and
  results lists at once. Empty state teaches the gesture instead of
  nagging. RTL+LTR mirrored via logical properties; focus-visible rings;
  reduced-motion honored (global rule).

### Styling details
- Round chip: quiet amber-tinged pill (distinct from derby/top badges).
- Favorites: gold gradient segmented control, star pop on toggle, cup-box
  hover lift (mirrors the match-row hover language), light-theme variants
  for all new elements.

### Test harness (debt #2 paid down further)
- worker-src.js transform: optional-marker-before-colon (`opts?:`), generic
  `Record<...>` annotations, interface-typed params (PubOpts) — new TS
  shapes stay eval-safe without per-case rules.
- live-derby-test: NEW scenario 5 — prewarm ride-along end-to-end (canary
  never reaches the payload, prewarm stamp on payload + KV write, cup
  round labels Round of 16 / Quarter-finals, league rows chipless).
- check-venue: round fields asserted (league null, "Round 3"→دور سوم,
  SEMI_FINALS→نیمه‌نهایی).
- check-reliability: 7 new v13.35 wiring checks (prewarm opts, pool
  ride-along, 9.25-min window, 720s TTL, canary strip, budget guard,
  pool pass-through).

---

## [13.34-ux] — 2026-09-14 (skeleton loaders + back-to-top + render-skip + PGL snapshot fallback)

### Client UX (backlog §3A items: skeleton loaders, render perf, motion)
- **Skeleton loaders replace the spinner**: every content section now shows a
  SHAPE-MATCHED skeleton while data loads — ghost match rows (upcoming /
  finished / live / week), ghost table lines (standings / UCL), ghost cards
  (cups), ghost hero blocks (top-spot / UCL spot). Static skeletons are
  server-rendered in the HTML (visible even before JS boots); the JS
  injection stays for the auto-refresh path. Function names
  (addLoadingLottie/removeLoadingLottie) + the .card-loading contract are
  preserved — callers unchanged. Shimmer auto-disables under
  prefers-reduced-motion (global rule) → static placeholder blocks.
- **Back-to-top FAB**: glass-chrome circular button, bottom-LEFT (mirror of
  the Telegram FAB), fades/slides in past 600px, smooth-scrolls (instant
  under prefers-reduced-motion), real <button> with bilingual aria-label.
- **Render-skip for long lists**: `.mrow{content-visibility:auto;
  contain-intrinsic-size:auto 96px}` — with 38+ match rows the browser now
  skips layout/paint for offscreen rows.
- Existing coverage verified (no duplicates added): «آخرین به‌روزرسانی»
  freshness stamp (v12.26) + cached-badge, focus-visible outlines,
  prefers-reduced-motion global rule.

### Server reliability (backlog §F: PGL reliability)
- **PGL snapshot fallback**: when ALL three PGL sources fail (sportscore →
  Wikipedia → thesportsdb), the Iran league card now falls back to the
  7-day snapshot's PGL copy (tagged `stale` + `staleAsOf`) instead of an
  empty «جدول هنوز در دسترس نیست» box. Zero KV cost on the happy path —
  the snapshot is read only when PGL has no teams.

### Cache/versioning
- Assets renamed public-13.9 → public-13.10 (CSS + JS); SW cache v4→v5
  (one-shot client cache clean sweep).

---
## [13.33-tsdebt] — 2026-09-13 (debt #4: dedupe.js + teams.js are TypeScript)

### Migration (types only — logic byte-identical)
- `src/teams.ts` + `src/dedupe.ts` replace the plain-JS modules. Typed with
  erasable syntax only (no enums/namespaces) so **Node ≥23 `require()`s the
  .ts directly** (type stripping) — the four CJS test consumers
  (check-dedupe, check-fa-dict, check-composers, live-derby-test) now
  `require("../src/teams.ts")` with no build step.
- `MatchLike` interface documents the fields the dedupe module actually
  touches (incl. `status`, which downstream consumers read off the same
  pass-through rows).
- Worker imports switch to extensionless `./teams` / `./dedupe` (esbuild +
  tsc resolve to .ts); the modules' own relative import uses the explicit
  `./teams.ts` form (required by Node ESM type-stripping require).
- tsconfig: +`allowImportingTsExtensions` (noEmit already set).
- Eval harness (`scripts/lib/worker-src.js`): teams/dedupe join the
  concatenation order; `export interface/type` now stripped like other
  exports. check-venue's dedupe regex tolerates parameter type annotations
  (the exact harness brittleness debt #2 describes — the `(m)` vs
  `(m: MatchLike)` shape).
- Gates: tsc 0 errors + 352 assertions green; wrangler --dry-run bundles.

---
## [13.32-router] — 2026-09-13 (debt #1: the ~45-branch fetch if-chain is a declarative route table)

### Refactor (behavior-preserving, mechanically verified)
- The post-auth request flow in `src/api.ts` is now an ordered
  `POST_GATE_ROUTES: RouteDef[]` table (30 routes + the legacy GET
  catch-all) dispatched by a 8-line matcher. The pre-auth flow
  (webhook, login GET/POST, logout, change-password, public-matches,
  pages, card prefix, auth gate) is unchanged — it is deliberately
  order-sensitive and documented.
- **Mechanical transformation**: `scripts/refactor-router-table.py`
  split the old chain by brace depth and moved every branch body
  BYTE-IDENTICAL into its handler (no re-indent — the Persian template
  literals in `/simple-test` are provably untouched). A post-transform
  assertion diffs every body line against the original source and
  verifies the exact route order. The script is kept for provenance.
- **Semantics contract** (documented at the RouteDef type): first-match-
  wins in registration order; `method: undefined` = any method; a
  handler may `return null` to fall through (this encodes the old
  chain's slip-through: `/api/settings` with an unmapped method reached
  the legacy switch + 405 tail, and unauthed `/api/diag-*` requests
  skipped their own branch and ended at the 404 tail).
- `Request.json()` results in handlers are now explicitly `as any`
  (previously implicit-any through the untyped `fetch(req, ...)`
  signature — the RouteCtx typing surfaced it; tightened typing of the
  router is follow-up debt, done WITHOUT behavior changes).
- Gates: tsc 0 errors + all 18 behavior checks green (352 assertions).

---
## [13.31-perfbudget] — 2026-09-13 (KV write quota + card latency + SWR cadence)

### KV write budget (the 1,000/day free-tier ceiling hit in session 2)
- **7-day snapshot now writes only on payload change** (`fetchPublicMatches`):
  it previously rode along on EVERY successful refresh (≤288 writes/day under
  continuous traffic — the single biggest avoidable consumer). One extra KV
  read per refresh (reads are 100k/day) buys the skip; on a quiet day snapshot
  writes drop to ~0. Fallback semantics unchanged (empty/failed sweeps never
  overwrite the snapshot — that path still writes the short cache only).
- **SWR FRESH window 3min → 5min** on `/api/public-matches` — now exactly the
  KV TTL inside fetchPublicMatches, so the background refresh (provider sweep
  + KV writes) runs at most ~288×/day instead of ~480×/day.
- Documented daily budget math (worklog): cron liveness floor
  (execution-lock + cron_status) = ~288 writes/day; snapshot skip removes the
  other large block; total now sits well under ~600/day even on match days.
- Card PNG cache uses the Cache API (`caches.default`) — deliberately NOT KV,
  zero quota impact.

### Card render latency (1–2s → cached)
- **Vazirmatn TTFs decoded once per isolate** (previously `atob` of two large
  fonts on EVERY render — hundreds of KB of string churn per card).
- **`renderCardPngCached()`**: rendered PNGs cached per (matchKey, lang) in
  the per-colo Cache API for 1h. The same card was re-rendered per language
  bucket per sweep, on backfill retries, on the bot's featured button, and on
  every `/api/card/<key>.png` request. All three call sites now share the
  cache; first render per colo pays once, everyone else gets a byte-identical
  hit.

---
## [13.30-loginfix] — 2026-09-13 (admin panel login fixed: stateless session + rate-limit hardening)

### The reported lockout ("cannot login to the management backend")
- **Root cause (KV read-after-write race):** login wrote `admin_sess_<sid>`
  to KV, the client reloaded after 400ms, and the `/admin` read-back hit KV
  before the write had propagated (eventual consistency, up to ~60s cross-colo)
  → `isValidAdminSession` false → the login page rendered again. The v13.26
  HMAC fallback only covered the KV WRITE failing, not the READ missing.
- **Fix: the session cookie is now ALWAYS the stateless HMAC-signed token**
  (`sid.HMAC(sid, ADMIN_TOKEN)`, HttpOnly/Secure/SameSite=Strict, 12h
  Max-Age). Verification is pure CPU — zero KV reads on the auth path, so
  login can never race storage again. The KV write remains for
  audit/observability only (and `/admin/logout` now strips the signature
  before deleting the audit record — it previously passed the full
  `sid.signature` string as the key).
- Legacy plain-sid cookies still verify via the KV path (no forced re-login
  storms for already-authed tabs).
- **Hardening:** `429 Too many attempts` now sends `Retry-After: 600` +
  logs the throttled IP; GET /admin/login (bookmarked) 302-redirects to
  /admin instead of a bare 401 JSON.
- The login page reload waits 150ms (UX beat) — correctness no longer
  depends on any delay.

---

## [13.29-clientfixes] — 2026-09-13 (standings played column in league boxes + hero overflow fix + SW cache v4)

### Bug fixes (user-reported, persisted past v13.28)
- **«بازی» (games played) column now shows in the LEAGUE standings boxes**
  (PL/PD/SA/FL1/BL1/PGL grid). Root cause: the v13.28 fix only touched the
  bot's standings line + the UCL full table already had it — the league
  stboxes never rendered a played cell at all (data was in the payload all
  along: `played` rides along since v12.16). Now each box shows
  `# | team | بازی | امتیاز` on desktop; the column folds away ≤600px
  (existing `.ucl-hidem` behavior) so the compact mobile grid is unchanged.
- **Hero card team-name/crest collision fixed for real.** Root cause found:
  `.bighero .match .side .team{white-space:nowrap;overflow:visible;
  text-overflow:clip}` (specificity 0,4,0) was overriding BOTH the v13.28
  base `.side .team{overflow:hidden;text-overflow:ellipsis}` fix AND the
  mobile wrap rule — hero names never clipped and PAINTED OVER the crest
  and score. Now: desktop truncates with ellipsis; mobile (column layout,
  logo stacked above the name) re-allows wrapping via a later-in-file
  rule of the same specificity.
- **SW cache v3→v4** (`assets/sw.js`) + asset rename `public-13.8.*→
  public-13.9.*`: browsers holding any stale asset entry get a one-shot
  clean sweep (the SW static-asset branch is cache-first-forever, so
  unchanged URLs never refresh on affected clients). Retired the dead
  `public-13.6.*`/`core-13.6.js` (two generations old).

## [13.25-nomiss] — 2026-09-13 (comprehensive "never miss a match" test suite)

### Session wrap-up (v13.12 → v13.25)
This session shipped 14 versions covering match cards, reliability, bot UX,
emoji design, venue translation, and a comprehensive test suite. All
deployed live + verified. npm test exit 0 (351 assertions).

### v13.25-nomiss — "never miss a match" test suite
- New gate `scripts/check-no-miss.js` (78 checks): exercises every
  notification path against synthetic matches at chosen time offsets.
  Tests window hit/miss, backfill, dedupe, skipped-cron resilience,
  extra-time safety, provider-down fallback, budget-guard exemption,
  result dedupe, card+caption on all types, promo footer, bot buttons,
  featured match, migration, audit. Added to `npm test` (351 assertions).

### v13.24-featured — ⭐ featured match button
- New "⭐ بازی برتر" button (full-width, first row) on the reply keyboard.
  When tapped, fetches the featured match (live first, then closest upcoming
  worthy — the same match the website's hero card shows) + sends it as a
  card image with the match text + promo footer.

### v13.23-buttons — reply keyboard + onboarding + audit
- Persistent reply keyboard (6 buttons: featured, upcoming, tables, teams,
  language, help, stop). `normalizeCommand()` maps Persian/English labels
  to slash commands. Onboarding: welcome message instructs users to use the
  buttons. Audit mechanism: `auditNotifications()` compares the match pool
  (ground truth) with `notified_matches_v6` KV, reports gaps, alerts admin
  if >2 gaps. New `/api/audit` admin endpoint. Wired into cron.

### v13.22-promo — website promotion footer
- Every notification ends with a promo footer:
  `------` / `مشاهده جدول لیگ‌ها و مهمترین بازی‌های پیش رو:` / `https://sportsignal.ir`

### v13.21-emoji — new emoji design per user spec
- Banner: `⚔️ دربی حساس` (no diacritics). Result header: `🚩 نتیجه نهایی`.
  Match line: `team 🆚 team` (no ⚽/bold). Competition: plain text (no 🎯).
  Stadium: `استادیوم <venue>`. Score: `نتیجه h-a`. Winner: `✴️`. Draw: `✴️`.
  Standings: `جدول <league>:` (no 📊).

### v13.20-fix — don't fire result during extra time
- `isPresumablyFinished` now excludes IN_PLAY + PAUSED (match actively being
  played — extra time, stoppage time). Only SCHEDULED/TIMED trigger the
  fallback (provider genuinely down). Threshold widened 90→150min.

### v13.19-every-card — card for EVERY notification type
- The match card fires for all types (72h, 24h, 3h, 1h, 5min, match-start,
  result) + late backfills. Caption truncated to 1024 chars.

### v13.18-caption — real match text as card caption
- Card caption is the full match text (date, time, teams, competition,
  stadium). When the card sends, the separate text message is skipped.
  Fallback to text if card fails.

### v13.17-cards — inline match cards via resvg-wasm + Vazirmatn
- `renderCardPng()` renders SVG→PNG via `@resvg/resvg-wasm` (pure-WASM,
  Workers-compatible). Vazirmatn TTF fonts base64-inlined. `sendPhotoBinary()`
  uploads the PNG via multipart. New `/api/card/<id>.png` endpoint.

### v13.15-reliable-kickoff — match-start reliability fix (3 root causes)
- Budget-guard exemption for match-start (always processes even at >38
  subrequests). Fire-and-forget sendDice + sendPhoto (never blocks text).
  Window widened -1..+20min → -1..+45min (5 cron ticks, not 2).

### v13.14-progressbar — mobile progress bar fix
- `.hero-data` top padding 80→70px on mobile so the progress bar is visible.

### v13.13-venues — always notify big-match kickoff + stadium AI translation
- `broadcastBigMatchKickoff()`: fires to ALL chats when a master big-match
  kicks off. Venue names fetched from providers (thesportsdb strVenue, FD
  venue). AI-translated via `runFaVenueLearner` (Workers AI, `fa_venues_ai`
  KV). `translateVenue()` + `venueFa` field in public API.

### v13.12-cards — match-card SVG route
- `/api/card/<matchKey>` generates an SVG match card (real provider crests,
  base64-inlined, 800×420). RTL-aware. Derby accent (purple), big-match (blue).

---

## [13.28-fixes] — 2026-09-13 (session 2 wrap: admin panel fix, dedupe spam fix, standings + CSS fixes, cache-bust)

### Session 2 summary (v13.25 → v13.28, 5 versions)
This session shipped 5 versions fixing admin panel access, bot spamming,
standings display, CSS overlap, and cache-busting. All deployed live + verified.

### v13.28-fixes — standings games played + CSS overlap fix + cache-bust
- **Standings show games played**: the bot's standingsLine format was
  `#1 — 9 امتیاز` (only points). Now: `#1 — 4 بازی — 9 امتیاز` (played + points).
- **Club name never overlaps logos**: .side gap 8→12px, .team padding-inline:4px
  + overflow:hidden + text-overflow:ellipsis (desktop); .team padding:4px 6px
  (mobile). Long names get ellipsis instead of running behind the logo.
- **Cache-bust**: renamed all client assets (public-13.6.css→public-13.8.css,
  public-13.6.js→public-13.8.js, core-13.6.js→core-13.8.js). SW cache
  v2→v3. HTML cache-control: no-store (browser always fetches fresh HTML).

### v13.27-dedupe-fix — stop bot spam (in-memory dedupe fallback)
- Root cause: Cloudflare KV free-tier daily write quota exhausted. The
  saveNotifiedMatch KV write failed silently → dedupe record never persisted →
  shouldSendNotification returned true every sweep → same notification re-sent
  every 10 min.
- Fix: added MEM_DEDUPE (in-memory Set) as fallback. saveNotifiedMatch always
  adds to it; shouldSendNotification checks it first. Survives for the
  isolate's lifetime (execution lock prevents concurrent sweeps).

### v13.26-session-fix — stateless HMAC session (admin panel KV fix)
- Root cause: KV write quota exhausted → session KV write failed → admin
  couldn't log in (bounced back to login page).
- Fix: if KV write fails, fall back to stateless HMAC-signed token
  (sid.HMAC(sid, ADMIN_TOKEN)). isValidAdminSession verifies the HMAC
  without a KV lookup.

### Login page credentials fix
- The login page's doLogin() fetch was missing credentials:"same-origin"
  → the set-cookie wasn't persisted → admin page bounced to login form.

---

## [13.12-cards] — 2026-09-13 (match-card images in bot notifications — SVG card with real team crests)

The bot now sends a visual match card (team crests + names + kickoff time)
before the text notification for match-start + result. Uses the REAL provider
crest URLs (football-data.org / sportscore / thesportsdb PNGs), not AI-generated
images — the crests are accurate, not hallucinated.

### How it works
1. `/api/card/<matchKey>` route — generates an SVG match card server-side:
   - Fetches both team crests, base64-inlines them (self-contained SVG).
   - 800x420 card: dark gradient bg, two crest circles, team names, VS,
     competition, date, time. RTL-aware (home on right for fa).
   - Derby accent (purple), big-match accent (blue).
2. `sendPhoto` helper in `telegram.ts` — sends the card URL via Telegram's
   `sendPhoto` API. Telegram fetches the URL server-side.
3. Wired into match-start + result notifications: the card is sent BEFORE
   the text notification (and after the football dice for match-start).

### Why not AI image generation?
- Workers AI (@cf/stabilityai/stable-diffusion-xl-base-1.0) can generate
  generic football images, but cannot render specific team logos or accurate
  text. The template-composition approach uses the real provider crests
  (already in the match data) for accuracy.

### Card data source
- The card route looks up the match in the tracked pool (matches_v13_tracked,
  24h TTL) first, then the short-TTL public_matches_v1 cache as fallback.

### Gate
- npm test exit 0 (272 assertions, unchanged).

---

## [13.11-migration] — 2026-09-13 (admin panel KV-propagation fix + bot migration broadcast)

### Admin panel fix ("doesn't go inside")
- **Root cause**: Cloudflare KV is eventually consistent — the login handler writes
  the session to KV, then `location.reload()` immediately reads it back on the
  next `/admin` request. If the KV write hasn't propagated yet, `isAdminAuthed`
  returns false → serves LOGIN_PAGE again (bounces back to login).
- **Server-side fix**: read-after-write verification in `/admin/login` — after
  `env.STATE.put("admin_sess_" + sid, ...)`, retry the read up to 3× (200ms
  apart) until the session is visible. Only then return the success response.
- **Client-side fix**: 400ms delay before `location.reload()` in both the login
  page and the admin page's re-login function — belt-and-suspenders so the
  reload doesn't race the KV propagation.
- **Clearer error**: if neither ADMIN_PASS nor a stored hash is set, return
  "Admin password not configured. Run: wrangler secret put ADMIN_PASS" instead
  of the generic "Invalid credentials".

### Bot migration broadcast (old bot → new @SportSignalAlertsBot)
- **Polished Persian migration message**:
  ```
  🚨 *این ربات منسوخ شده!*

  ربات جدید ما با امکانات بهتر و سرعت بالاتر راه‌اندازی شده است.
  برای دریافت اعلان‌ها، به ربات جدید بپیوندید.

  ✨ *ربات جدید:* @SportSignalAlertsBot
  🔗 https://t.me/SportSignalAlertsBot

  _از همراهی‌تان متشکریم - منتظر شما در ربات جدید هستیم_
  ```
- **Scheduled broadcast over 2 weeks**: sends every 3 days (5 rounds: day 0,
  3, 6, 9, 12). Per-chat per-round KV dedupe (`mig_sent_v1:<round>:<chatId>`)
  so each user gets it exactly once per round. Auto-deactivates after 14 days.
- **Admin API endpoints**:
  - `POST /api/migrate/start` — start the 2-week migration broadcast
  - `POST /api/migrate/stop` — stop early
  - `GET /api/migrate/status` — check progress (active, lastRound, totalSent, totalUsers)
- **Bilingual**: the migration message is sent in the user's chosen language
  (fa/en) based on their prefs.
- **Bot statistics**: the `/api/migrate/status` endpoint reports `totalUsers`
  based on the current bot's `telegram_users_v6` KV (the source of truth).
  The admin panel's user count already reads from this KV — stats are based
  on the new bot.

### Gate
- `npm test` exit 0 (272 assertions, unchanged — the migration + admin fixes
  are additive logic, no existing invariants changed).

---

## [13.10-clean] — 2026-09-13 (clean date-first reminder format + animated ⚽ emoji on kickoff)

Two asks: (1) restructure the reminder format to date-first (replace the
"یادآوری" header with the date, remove the countdown), and (2) animated
emojis in the bot.

### Clean date-first reminder format
- ALL 6 pre-match formatters restructured to the user's exact layout:
  ```
  📅 <date>
  ⏰ <time>
  ⚽️ <home> 🆚 <away>
  🎯 <competition>
  ```
- No "⏳ یادآوری N ساعته" header (replaced by the date at the top).
- No "⏱ N ساعت و M دقیقه دیگر" countdown (removed per the user's ask —
  the kickoff time is enough; the user can compare to now).
- Big-match keeps 🔥 on the match line; match-start keeps 🚀.
- The 1h reminder now reads exactly as the user specified:
  ```
  📅 یکشنبه ۲۲ شهریور ۱۴۰۵
  ⏰ ۱۷:۴۵
  ⚽️ *لوانته 🆚 بارسلونا*
  🎯 لالیگا
  ```

### Animated emoji (sendDice ⚽ on match-start)
- New `sendDice(env, chatId, emoji)` helper in `telegram.ts` — Telegram's
  built-in ANIMATED emoji via the `sendDice` Bot API. The ⚽ appears
  full-screen and animates (a football spins, a player kicks it), then
  settles on a random value. Zero asset hosting, zero deps.
- Wired into match-start: the ⚽ dice is sent BEFORE the text notification
  for an eye-catching "ball is rolling" kickoff animation. Only for
  on-time match-start (not late backfills, to avoid noise).
- Available animated emoji: 🎲 🎯 🏀 ⚽ 🎰 🎳 💎.

### Other animated-emoji options (documented, not all implemented)
- **sendDice** (implemented): built-in animated emoji, separate message.
  The ⚽ on match-start is live now.
- **Custom animated emoji (Telegram Premium)**: inline animated emoji in
  message text via `custom_emoji` entities. Requires creating a custom
  emoji sticker set via @Stickers (animated .tgs/.webm). Only Premium
  users see the animation; non-premium see the static fallback. Future
  enhancement if the bot owner has Premium.
- **GIF via sendAnimation**: a looping GIF (e.g., red beeping signal for
  live matches) sent as media. Needs asset hosting (Cloudflare R2 or a
  Telegram file_id after first upload). Separate media message. Good for
  a "LIVE" indicator — a future enhancement.
- **Animated stickers (.webm)**: sent via `sendSticker`, play inline.
  Could send a "GOAL!" sticker on live goals. Future enhancement.

### Gate updates
- `check-composers.js` updated: now asserts the clean format (date-first,
  no countdown, no reminder-header) + the emoji floor. 33 assertions.
- `check-reliability.js` updated: 4 new sendDice assertions. 37 assertions.
- `npm test` exit 0 (272 assertions, was 260).

---

## [13.9-reliability] — 2026-09-13 (bot dependability: 10 reliability layers — backfill for all types, dead-letter outbox, pre-scheduled notifications, canary, subrequest guard, kickoff KV, write-verify, result fallback, heartbeat, healthz depth)

Implemented all 10 approaches from the dependability brainstorm. The bot
now shrinks the miss probability to near-zero by layering defenses — every
miss becomes either a late delivery (backfill) or a retried send (outbox).

### #2 Backfill for ALL notification types (incl 5min + match-start)
- `isBackfillEligible` now covers `pre-match-5min` (floor 2min, max 10min).
- New `isMatchStartBackfillEligible` fires a late match-start at kickoff+20-30min.
- `shouldSendNotification` uses backfill for 5min + match-start (was NO backfill).
- A skipped cron no longer loses the 5min/match-start reminder — it fires late.

### #3 Dead-letter outbox for Telegram sends
- `sendTelegram` on final failure (3 retries exhausted) pushes to `pending_sends_v1` KV.
- `drainOutbox` retries each with exponential backoff (1m→2m→5m→15m→30m→60m),
  6 attempts max, drops dead chats. Called at the start of every cron sweep.
- A Telegram 5xx for 30min no longer loses messages — they're retried until success.

### #1 Pre-scheduled notifications
- `reconcileSchedules` writes a `sched_v1:<matchKey>` record per worthy match
  at discovery, listing all 6 notification types + sent-state. Every sweep
  reconciles — a missed cron fires the notification late on the next run.
- The dedupe KV (notified_matches_v6) is still the primary exactly-once guard;
  the schedule is the catch-all backstop.

### #5 Canary match for end-to-end monitoring
- `buildCanaryMatch` creates a synthetic PL big-match (Arsenal vs Chelsea,
  kickoff ~25h ahead, refreshed every 6h). Injected into the pool in cron.
- The full pipeline (discovery → window → dedupe → send) exercises it every
  sweep. If the canary's reminders stop arriving, the pipeline is broken.
- Tagged `canary: true` so the public page can filter it out.

### #6 Subrequest-budget guard
- `sendMatchNotifications` checks `subrequestCount() > 38` before each match.
  If the budget is low (<10 remaining under the 48 cap), it defers the rest
  to the next sweep instead of silently skipping them.
- Prevents budget-exhaustion skips on busy matchdays (40 matches × 7 configs).

### #4 Canonical kickoff-time KV
- `getCanonicalKickoff` writes `kickoff_v1:<matchKey>` at first discovery,
  never overwritten unless POSTPONED. Prevents provider time-shift (FD day-N
  19:00 vs sportscore day-N+1 15:00) from moving the notification windows.
- `updateCanonicalKickoffOnReschedule` overwrites on official reschedule.

### #7 KV write-then-read verification
- `saveNotifiedMatch` reads back the KV after writing the dedupe marker; if
  the record didn't land (network blip, quota), retries once. Defense-in-depth
  against silent KV failures that would cause duplicates.

### #8 Time-based result fallback (presumably finished)
- `isPresumablyFinished`: if utcDate is >90min past AND status is still
  SCHEDULED/TIMED/IN_PLAY/PAUSED (provider down or slow), treat as finished.
- `isMatchFinished` now includes presumably-finished → the result notification
  fires (with score pending) instead of waiting for a provider that may not recover.

### #9 6h heartbeat to admin chat
- Cron sends "✅ ربات سالم است" to the admin chat every 6h. If the admin
  doesn't see it, something broke (cron, worker, KV, Telegram).

### #10 /healthz exposes outbox depth + version
- `/healthz` now returns `outbox_depth` + `version` alongside `ok` + `heartbeat_age_min`.
- An external uptime monitor (Uptime Robot / BetterStack / CF Healthcheck)
  points at `/healthz`; `ok=false` (heartbeat stale >30min OR outbox_depth ≥50)
  should page the admin. Setup is zero-code (configure the monitor externally).

### New gate
- **`scripts/check-reliability.js`** (33 assertions): all 10 reliability invariants
  (backfill coverage, outbox, schedule, canary, subrequest guard, kickoff KV,
  write-verify, presumably-finished, heartbeat, healthz depth). Added to `npm test`.
- `npm test` exit 0 (260 assertions, was 223).

---

## [13.8-botnotify] — 2026-09-13 (bot notifications: date in every reminder, more emojis, dedupe fix for provider-transliteration variants)

The user reported a 3-hour reminder that was missing the date (only time +
relative time) — ambiguous which matchday. Plus a duplicate Elversberg vs
Bayern notification (two identical messages). Both fixed.

### Date in every notification formatter
- **`format3HourMessage`** (the reported one), **`format1HourMessage`**,
  **`format5MinMessage`**, **`formatMatchStartMessage`** now include the full
  date (Jalali weekday + day + month in fa; Gregorian in en) via
  `getJalaliDate`/`getEnglishDate`. Previously only `format24HourMessage` +
  `formatBigMatchMessage` + `formatResultMessage` had the date. A 3h/1h/5min
  reminder with only the time is now disambiguated to a specific matchday.
- Verified by the new `check-composers.js` gate (29 assertions): every
  formatter carries a 📅 date line + the weekday + a minimum emoji set.

### More emojis across all formatters
- 🎯 competition tag, 📅 date, ⏰ time, ⏱ countdown, ⏳ reminder head, 🚀 kickoff,
  🏆 winner trophy, 🤝 draw, 🏁 full-time, 🔥 big-match fire, ⚽ match ball.
- The emoji floor is gated: `check-composers.js` asserts each formatter carries
  its emoji set, so a maintainer stripping them fails `npm test`.

### Duplicate-notification fix (provider transliteration fold)
- **Root cause**: `normalizeTeamName("FC Bayern München")` → `bayernmunchen`
  (accent ü stripped to u) ≠ `normalizeTeamName("Bayern Munich")` →
  `bayernmunich` (English exonym). Different keys → `canonDedupe` + `matchKey`
  both treat them as distinct matches → the SAME fixture notified twice.
- **Fix**: added a `TRANSLIT_FOLDS` table to `src/teams.js` (applied after the
  accent strip, before token removal): `munchen`→`munich`, `koln`→`cologne`,
  `sanktpauli`→`stpauli`, `zenit...`→`zenit`, `sporting...`→`sportingcp`,
  `shakhtar...`→`shakhtar`, `dinamo...`→`dynamokyiv`, `crvenazvezda`→`redstar`.
  Each entry is a verified provider-variant pair (short + specific — over-folding
  would merge distinct teams). Verified: `canonDedupe([Bayern-München,
  Bayern-Munich])` now collapses to 1 (was 2).

### New gate
- **`scripts/check-composers.js`** (29 assertions): every formatter includes a
  date line + the emoji floor + the transliteration fold. Added to `npm test`.
- `npm test` exit 0 (223 assertions, was 195).

---

## [13.7-continuation] — 2026-09-13 (continuation pass: bot flawless, perf/caching, security hardening, 3 new test gates)

A continuation pass across the six focus areas from `NEXT-SESSION-CONTINUATION.md`.
Every change deployed live + verified (curl `/healthz` + `/api/public-matches` +
page markers; agent-browser at 1440px + 390px; zero console errors). `npm test`
exit 0 (195 assertions, was 147 — 3 new behavior gates added).

### v13.7-bot — Telegram bot flawless pass
- **Persian welcome typo fixed** (caught by the new check-bot-edges gate): the
  welcome "خوش آمدید" was misspelled in THREE places — `BOT_STRINGS.fa_start_welcome`
  + `fa_start_pick_lang` ended with "خوش آمدیح" (ح instead of د), and the
  `/start` hardcoded fa welcome ended with "خوش آمدیا" (ا instead of د). Visible
  to every fa user on join + language change. All three → "خوش آمدید".
- **New gate** `scripts/check-bot-edges.js` (22 assertions): callback_query
  language picker (fa/en/malformed), `/timezone` sub-commands (show/reset/
  invalid/valid), `/lang` picker keyboard, `/help` body, `/stop`→`/start`
  re-join round-trip, + the Persian welcome spelling. Extracts the real
  `BOT_STRINGS` + `botStr` + the callback + message chains from the
  concatenated worker source (single source of truth).

### v13.7-perf — performance + caching
- **sw.js CACHE bumped** `sportsignal-v1` → `sportsignal-v2`: the activate
  handler wipes every non-v2 cache, evicting orphaned pre-13.6 asset entries
  (public-13.5.js/css, old inline-payload HTML) stranded in clients' SW caches
  since the v13.6 asset split.
- **ExtraBold font preload added**: the `<h2>` section headings (font-weight:800,
  above-the-fold) used Vazirmatn-ExtraBold which was NOT preloaded → FOUT on
  headings. Now 3 preloads (Regular, Bold, ExtraBold). Verified: h2 computed
  font-weight 800.
- **Stale-while-revalidate on `/api/public-matches`**: when the KV cache is
  stale (3–10min), return cached data INSTANTLY + refresh via
  `ctx.waitUntil`; the first visitor after TTL expiry no longer pays the 2–5s
  provider-sweep latency. Cache >10min or missing → synchronous refresh
  (cold-cache safe). The 7-day snapshot fallback unchanged.
- **Cron subrequest headroom logging**: `subrequestCount()` accessor +
  `📊 Subrequest budget: N/48 used (headroom under the 50-ceiling)` at sweep
  completion (visible in `wrangler tail`).

### v13.7-security — security hardening
- **CSP tightened**: removed dead `https://cdn.jsdelivr.net` from style-src +
  font-src (leftover from the v12.x Lottie CDN player, removed in v13.4; fonts
  self-hosted since v13.6). New CSP: `default-src 'self'; script-src 'self'
  'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:
  https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'`.
- **fa-teams override XSS gate**: `/api/fa-teams/override` now validates the
  Farsi name via `isValidFaName` (Persian-only charset, 2–42 chars) at the
  storage boundary — defense-in-depth so even a compromised admin token cannot
  store an arbitrary HTML payload. (The client already renders via textContent;
  this closes the storage door.)
- **New gate** `scripts/check-security.js` (24 assertions): CSP strictness,
  admin cookie flags (HttpOnly/Secure/SameSite=Strict), timing-safe token
  compare, fa-teams override validation, webhook secret enforcement (403
  without/wrong), `isValidFaName` charset gate, login rate-limit (5/10min).
- **Verified solid (no change needed)**: admin auth (PBKDF2 + timing-safe
  compare), webhook secret (live-verified 403), rate-limit coverage on
  /api/public-matches (per-IP + refresh lock), XSS client rendering
  (textContent/createTextNode), wrangler secret list (13 secrets, none in vars).

### Debt assessment (documented, not refactored this session)
- **api.ts router → route table** (#1): safe to refactor (eval gate doesn't
  cover it) but needs an E2E router test script first (curl every endpoint,
  assert status codes) — ~20 admin endpoints can't be verified live without
  ADMIN_TOKEN.
- **`:any` tightening** (#3) + **dedupe.js/teams.js → TS** (#4): both blocked
  by the eval-harness transform (debt #2) which only strips `: Env`/`: any`
  patterns, not `: string`/`: number`/`: Match`. Recommended unblock: switch
  test scripts to esbuild (already a wrangler transitive dep) for TS→JS.
- **Cosmetic**: removed stray `// p: any;` comment from utils.ts:61 (a
  truncated `as any` cast leftover from the v13.3 types pass).

---

## [13.6-wrap] — 2026-09-13 (session close: modularization complete, changelog restructured, deploy re-verified, zip backup, next-session prompt)

Repository maintenance — no worker behavior change; `VERSION` stays 13.6-assets.

- **Session result (v12.33 → v13.6)**: the recovered 10,002-line rollup bundle
  was replaced by **21 real ES modules** (`src/worker.ts` is now a thin entry),
  with zero-behavior-change gates at every stage (15 self-check scripts, live
  verification after each deploy). Then: ONE shared client core (×3 I18N dicts
  unified, 191 keys), senders/mappers deduped, dead code removed, domain types
  added (**tsc noise 385 → 0**, `npm test` now gates on `tsc --noEmit` +
  version-sync), shared-env mutations eliminated, and the client payload
  extracted to immutable versioned assets — **public HTML 241KB → ~37KB (−85%)**,
  CSS/JS at `max-age=31536000, immutable`.
- **Changelog restructured**: the v13.0–v13.6 entries (previously appended at
  the bottom of this file) moved to the top, restoring the documented
  newest-first order.
- **Deploy re-verified**: final HEAD re-deployed so GitHub ↔ Cloudflare stay in
  lockstep; `npm test` exit 0 (147 assertions OK) before the wrap deploy.
- **Backup**: `git archive` zip of the wrapped HEAD shipped for offline backup
  (tracked files only — secrets live in wrangler, not in the repo).
- **Next session**: handoff prompt covering (1) UI/UX tweaks, (2) Telegram-bot
  flawless pass, (3) performance/caching, (4) fresh SWOT, (5) security review,
  (6) remaining technical debt (documented candidates: api.ts if-chain router →
  route table, eval-based test harness, sw.js CACHE-name bump for orphaned
  pre-13.6 asset entries).

## 13.6-assets — the payload split (2026-09-13)

### v13.5-debtzero — reliability + type-safety zero pass
- **`/api/simulate` no longer mutates shared CONFIG at runtime** (was swapping
  `CONFIG.KV_NOTIFIED_KEY`/`KV_USER_PREFS` to test keys — a concurrent cron
  sweep could read/write the TEST keys). The handler now passes a cloned env
  (`SIM_NOTIFIED_KEY`/`SIM_PREFS_KEY`); `matches.ts`/`users.ts` resolve keys
  per-request. Real notification state is isolated by construction.
- **All `env.TEHRAN_TZ` shared-env mutations eliminated** (notifications.ts ×1,
  digest.ts ×2 — the per-chat-group timezone now flows through scoped env
  clones, same fix the `/next` handler got in v13.2). `admin.ts applySettings`
  mutation kept — it is the deliberate KV→CONFIG settings refresh.
- **8 silent duplicate object keys removed** (kept last-wins → zero behavior
  change): `LEAGUE_LOGOS.PGL` ×2 (139.png dead entry), fa-dict ×5
  (Espanyol, RCD Espanyol de Barcelona, Fajr Sepasi, Paykan, Shams Azar
  Qazvin — space vs ZWNJ spelling), `FA_COMPS` PGL/HAZFI_CUP ×2.
- **tsc errors 29 → 0** (types-only edits; eval-gate verified byte-identical).
  `npm test` now gates on **`tsc --noEmit` + version-sync check** (package.json
  ↔ `VERSION` core compare) before the 13 behavior checks.

### v13.6-assets — client payload extracted to immutable versioned assets
- **HTML 241KB → 36KB (−85%)**: the big `<style>` (92KB) and app `<script>`
  (98KB + 16KB core) moved out of the template into
  `assets/public-13.6.css`, `assets/public-13.6.js`, `assets/core-13.6.js`
  (shared by /, /admin/login, /admin).
- Assets served via Workers Static Assets with
  `Cache-Control: public, max-age=31536000, immutable`; cache-bust by
  renaming (version suffix in filename). `assets/_headers` updated.
- Kept inline (first-paint critical): theme-init script, `@font-face` block,
  `PAGE_TZ` line (serve-time `__PAGE_TZ__` substitution still works),
  JSON-LD, and the full HTML body.
- `src/pages/client-core.ts` retired — `assets/core-13.6.js` is the source of
  truth for the shared I18N + theme/lang helpers now.
- Admin footer version now interpolates `VERSION` (was hardcoded ۱۲.۳۱ —
  three majors stale).
- `check-venue.js` reads the extracted app JS from `assets/public-*.js`.
- Extraction was generated from the EVALUATED page string (byte-exact served
  bytes) by `scripts/extract-page-assets.mjs` (one-shot, kept for provenance).

## 13.4-modular — the great modularization (2026-09-13)

### v13.0-modular — 21 real ES modules replace the 10k-line bundle
- `src/worker.ts` (10,002 lines, rollup-bundled artifact) split into 21 modules;
  worker.ts is now a thin entry re-exporting `api.ts`.
- Rollup noise stripped (`__name`/`__name2` decorators, CJS interop wrappers);
  `src/teams.js` + `src/dedupe.js` imported directly again.
- SUBREQUEST counter behind `bumpSubrequest()` (ES import bindings are read-only);
  identical budget semantics.
- Test infra: `scripts/lib/worker-src.js` (multi-file source loader, transformed
  to runnable JS); all 13 self-check gates green. Zero behavior change.

### v13.1-client-core — ONE shared client core
- The ×3 I18N dictionaries (public/login/admin, ~60KB source, 2 diverged keys)
  unified into `src/pages/client-core.ts` (191 fa/en keys) + the ×10 theme/lang
  helpers. Template-literal form keeps the wire format byte-identical
  (literal 2-byte Persian chars).
- Favicon/manifest head block deduped ×3 → ×1.

### v13.2-dedupe — duplication + dead code
- `sendTelegram`/`sendTelegramWithKeyboard` merged (optional keyboard param).
- thesportsdb event→match mapper extracted (`tspEventToMatch`, was ×3).
- Dead `return new Response("OK")` + always-true `hasKeyboard` guards removed.
- `/next` isolate-level `env.TEHRAN_TZ` mutation → scoped env clone.

### v13.3-types — core domain types
- `src/types.ts`: Env (LooseKV/WorkersAI/secrets), Match/TeamRef/Competition/
  Standings/PublicCup/XPostResult interfaces; ~100 functions typed `env: Env`.
- tsc noise 385 → 45 (37 scattered verbatim unknowns + 8 pre-existing dup keys).
- **fix**: reverted reassociated `await …get().catch()` casts — a real
  error-handling regression the eval-based test gate caught in CI-style.

### v13.4-live-css — live badges actually visible + perf
- **Pre-existing bug fixed**: the dotLottie CDN player was CSP-blocked
  (`script-src 'self'`) AND was the wrong package (never registered
  `<dotlottie-player>`) — live chips rendered EMPTY, loading states invisible.
- Removed the render-blocking unpkg script (4 failed requests/visit gone);
  live chips now use the CSS `live-beep` dot + text, liveCard h2 the
  `live-breath` dot, loading states a pure-CSS spinner.
- `assets/_headers`: 7-day cache for fonts/favicons (was `max-age=0`).
- Page wire size: ~80KB (brotli); bundle 696KB → 628KB raw.

## [12.x-maintenance] — 2026-09-13 (comprehensive maintenance, SEO, PWA, bilingual bot, AI translation, UI polish)

A massive maintenance + feature batch covering 30+ individual changes across the
SportSignal worker, bot, and site. All deployed live at `football.sportsignal.ir`.

### Bot
- **Switched to new bot** `@SportSignalAlertsBot` (8988731008) — new BOT_TOKEN +
  WEBHOOK_SECRET set in Cloudflare, webhook registered with
  `allowed_updates: ["message", "callback_query"]`
- **Bilingual bot** (Farsi + English) — language picker inline keyboard at
  `/start` (🇮🇷 فارسی / 🇬🇧 English), `/lang` command for switching, all command
  responses rendered in the user's chosen lang, cron notifications (24h/3h/1h/
  kickoff/final/coronation/weekly-tables) all lang-aware. Leaner text + fewer
  emojis.
- **Cron gaps filled** — 5-min "kickoff now" reminder for big matches,
  half-time (PAUSED) detection + HT notification, matchday morning digest at
  9am local tz (per-chat dedupe), big-match FT broadcast to all users (not just
  followers).
- **CHAT_ID cleared** — the old bot's chat ID was causing 403 errors on every
  cron sweep. Now relies purely on the KV users list (populated by `/start`).

### AI Translation
- **Workers AI binding enabled** — `[ai] binding = "AI"` added to wrangler.toml.
  The `maybeRunFaAi` function now runs on each `/api/public-matches` request
  (15min cooldown) to incrementally translate unknown Latin team names.
- **Complete data stream audit** — `collectUnknownTeamNames` now scans ALL 11
  data streams: upcoming, finished, thisWeek, nextWeek, topSpot.matches,
  topSpot.next, nextBig, standings, cups.next, ucl.teams, ucl.matches.
- **Admin name correction** — `POST /api/fa-teams/override` endpoint lets the
  admin manually set/correct the Farsi name for any team. Overrides take
  priority over AI-learned + static dictionary. Cache invalidated on override.
- **Admin panel UI** — two input fields (English + Farsi) + "ثبت / اصلاح"
  button in the Smart Farsi section.

### SEO + PWA
- **Meta description** + **Open Graph** tags + **Twitter Card** tags +
  **JSON-LD** structured data + **canonical URL** added to the main page head.
- **sitemap.xml** route added (`/sitemap.xml` returns a minimal urlset).
- **robots.txt** updated with Sitemap directive.
- **Service worker** (`assets/sw.js`) — network-first for navigations,
  cache-first for static assets, stale-while-revalidate for HTML pages.
  Registered in the main page HTML.
- **Font preload** for Vazirmatn Regular + Bold. Vazirmatn-Medium (500)
  removed (never used by any element).

### UI/UX Polish
- **Floating Telegram FAB** — 56px circular blue button fixed to the
  bottom-right on PC. Self-promoting white bubble every 60s. Hidden on
  scroll (PC). Retired on mobile (joinSticky covers it). Retired the
  header CTA pill on PC.
- **Hero card** — dark navy blue border (#1e3a8a, 2px) with 40%-reduced
  opacity, soft drop-shadow (filter:drop-shadow), team names always full
  (no truncation, fluid clamp font-size), time box centered, time moved
  20px+5px down, spacing expanded, kickdate enlarged (18px desktop).
- **Hero logos** — bigger than topspot at all viewports (hero 102/64 >
  topspot 51/43 > regular 41/37). All logo shadows removed.
- **Topspot logos** — 20% smaller (was 64/54, now 51/43).
- **Countdown** — full-word format ("۱۴ ساعت و ۱۵ دقیقه و ۴۸ ثانیه")
  instead of HH:MM:SS. Progress bar 25% thicker (4px → 5px). Clock green
  (matches progress bar) in normal state, blue in "soon" state.
- **UCL header** — lighter blue in light mode (not navy CTA). Title moved
  next to the starball logo (right-aligned). Matchday chip flush to the
  far left. Trophy emoji removed.
- **Standings** — league leader (position 1) bolded + 2pt larger font.
  UCL standings leader also bolded.
- **Cups grid** — all domestic cups merged into one 2-column grid (no
  more single-box rows). DFB Pokal (جام حذفی آلمان) added.
- **Live indicator** — Live.lottie animation replaces CSS dot in the
  livechip + #liveCard h2 heading. loading.lottie replaces CSS spinner
  + "در حال بارگذاری..." text in all loading states.
- **3-dot share toggle** — silver in light mode, light blue in dark mode.
- **Dark mode** forced as default (regardless of system preference) via
  `<meta name="color-scheme" content="dark light">`.
- **Admin panel buttons** — font-family:inherit (Vazirmatn, not Arial).
- **About + Contact footer** — full bilingual origin-story text + email
  contact box. Contact nav link anchors to #contact (not the bot URL).
- **Favicon** — custom favicon set (favicon.ico + 16/32/180/192/512 +
  site.webmanifest) deployed.
- **Spotitem boxes** — content vertically centered (flex + justify-
  content:center). Team name tooltips for truncated names.
- **Vazirmatn font** on all admin panel + login page buttons.

### Data Resilience
- **Cached snapshot fallback** — on API failure, the worker serves the
  last successful data snapshot from KV (7-day TTL) with a "cached" badge.
- **Snapshot written on every successful fetch** — never overwrites with
  empty data.

### Audit Dashboard
- **Retired** — the Next.js audit dashboard at `/` replaced with a
  redirect to `football.sportsignal.ir`.

---

## [12.33-xpost] — 2026-09-15 (X / Twitter automated profile — OAuth 1.0a HMAC-SHA1 signing inline, KV budget governor, dry-run, admin X card)

The SportSignal brain now mirrors to a dedicated **@SportSignal X account**
alongside the Telegram bot — Persian mirrors of the coronation / FT / kickoff /
weekly-tables composers, ≤280 chars, Persian numerals, `#فوتبال` + league tag,
ending with `football.sportsignal.ir`. Single-file, no new npm dependencies.

- **OAuth 1.0a "user context" signing** implemented inline with
  `crypto.subtle` HMAC-SHA1 — `xPercentEncode` (RFC 3986 + the `!'()*` set),
  `xBuildBaseString` (RFC 5849 §3.4.1.1), `xBuildAuthHeader`. JSON request
  bodies are NOT part of the signature (only `oauth_*` params are). Verified
  against the canonical RFC 5849 base string + Node-crypto HMAC-SHA1 reference
  in the new `scripts/check-x-signature.js`.
- **`POST https://api.x.com/2/tweets`** with reply-threading
  (`reply.in_reply_to_tweet_id`) for the weekly-tables digest (1 root + N
  replies, one per league). 401 → admin log "bad keys"; 429 → KV pause 15min
  (`x_pause_v1`); 5xx → one retry; every outcome written to `x_last_error_v1`.
- **KV budget governor** (`x_budget_v1:<yyyymm>` cap 450, `x_daily_v1:<yyyymmdd>`
  cap 12, TTLs on writes) — the free tier's ~500 posts/month cap can never be
  broken. Hard caps are checked before EVERY post (not just at sweep start),
  so a multi-post sweep aborts mid-way when the budget runs out. Test-post
  daily cap 5 (`x_test_v1:<yyyymmdd>`) keeps manual admin testing inside the
  free tier.
- **KV dedupe** (`x_post_v1:<type>:<key>`, 7d TTL) — separate from the Telegram
  dedupe so X and Telegram each fire exactly once. Same-event keys
  (`coronation:<league>`, `ft:<matchId>`, `kickoff:<matchId>`,
  `weekly:<isoWeek>`). Kickoff is skipped if the FT marker already exists.
- **Phase config** (`x_phase_v1`, comma-separated):
  `coronation,ft,kickoff,tables,media` — defaults to `coronation,ft` (phase B
  live). The admin panel toggles phases at runtime without re-deploying.
- **Master switches** — `X_ENABLED` (secret) + `x_enabled_v1` (KV override);
  `X_DRY_RUN` (secret) + `x_dry_run_v1` (KV override). KV wins over secret so
  the admin panel can toggle without `wrangler secret put`. Dry-run logs the
  composed text to the console + writes `x_last_post_v1` (kind suffix
  `:dry-run`) WITHOUT consuming budget or marking dedupe — so the next live
  sweep still fires.
- **maybePostX() wired into the cron sweep AFTER the Telegram checks**
  (after `sendMatchNotifications` + `maybeNotifyTableToppers`). X is additive:
  wrapped in its own try/catch so a failing post can NEVER fail the sweep or
  break the Telegram path. The coronation events list is captured from
  `maybeNotifyTableToppers` and passed to `maybePostX` as `opts.topperEvents`.
- **Persian composers** — `composeXCoronation`, `composeXResult`,
  `composeXKickoff`, `composeXTableForLeague`. All ≤280 chars, Persian
  numerals via `toFaDigits`, league hashtag (`#لیگ_برتر_انگلیس`, `#لالیگا`,
  `#سری_آ`, `#لیگ_۱_فرانسه`, `#بوندسلیگا`, `#لیگ_قهرمانان_اروپا`, …),
  `#فوتبال`, ending with `football.sportsignal.ir`. Truncation uses the
  ellipsis char `…` so the URL + tags survive.
- **Admin panel X card** at `/admin` — status line (enabled / dry-run /
  paused / phase / monthly+daily budget counters / last post + last error),
  «پست تست» button → `POST /admin/x-test` (admin-token protected), dry-run
  toggle, enable toggle, phase config (comma-separated input), clear-429-pause
  button (shown only when paused). Backed by `/api/x/status` (GET),
  `/api/x/phase` (PUT), `/api/x/dry-run` (PUT), `/api/x/enabled` (PUT),
  `/api/x/clear-pause` (POST), all admin-auth-checked. RTL/logical-property
  CSS conventions preserved.
- **New tests**: `scripts/check-x-signature.js` (RFC 5849 base string +
  Node-crypto HMAC-SHA1 reference + percent-encoding of the `!'()*` set +
  tweet-only-oauth_* params + secrets with reserved chars) and
  `scripts/check-x-budget.js` (month/day key format, budget cap math, dedupe
  exactly-once + TTL, KV overrides secret, phase default `coronation,ft`,
  Persian league tags, all composers ≤280 chars + Persian numerals + #فوتبال
  + URL). The `grabFn` helper in `check-x-budget.js` was rewritten as a
  string-aware brace scanner with a state stack — the worker's composers use
  `\u{1F451}` curly-brace unicode escapes inside template literals which
  broke the old brace counter. `bun run test` now runs 13 scripts (was 11);
  all green, exit 0.
- **Secrets** (`wrangler secret put`): `X_API_KEY`, `X_API_SECRET`,
  `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`, `X_ENABLED`, `X_DRY_RUN`. Never
  in repo files. The admin panel can override `X_ENABLED`/`X_DRY_RUN` at
  runtime via KV without re-deploying.
- **Phased rollout** (per the handoff doc): **A** dry-run (log composed text
  via `X_DRY_RUN=1`; verify OAuth signature against the canonical vector in
  `check-x-signature.js`) → **B** live posts (coronation + big-match FT —
  default phase) → **C** kickoff notes + weekly thread + hard budget caps
  (toggle phases via admin) → **D** media posts via
  `upload.x.com/1.1/media/upload.json` (deferred — phase config already
  reserves the `media` slot).
- **`VERSION`** bumped `12.32-backlog` → `12.33-xpost`; admin-page i18n
  `ver` strings (fa + en × 2 admin pages) refreshed to describe the X
  integration. `package.json` 12.32.0 → 12.33.0.

---

## [12.32-wrap] — 2026-09-15 (session close: repo sync, changelog, deploy re-verified, zip backup, X-integration handoff)

Repository maintenance — no worker behavior change; `VERSION` stays 12.32.

- **Deploy re-verified**: live page markers (kickdate ×13, FIN_EXPANDED ×5,
  fmtHeroDate ×3, 72px watermarks, «بیشتر»/«کمتر») match `src/worker.ts` at HEAD;
  the 11-script suite re-run green (exit 0) before the wrap deploy; worker
  re-deployed from the final wrapped HEAD so GitHub ↔ Cloudflare stay in lockstep.
- **Handoff doc added**: `NEXT-SESSION-X-INTEGRATION.md` — full brief + copy-paste
  prompt for the next session: connect SportSignal to X (Twitter) and run an
  automated X profile (OAuth 1.0a HMAC-SHA1 signing inline via crypto.subtle,
  POST /2/tweets, reply threads, KV budget/dedupe governors, admin X card,
  phased rollout A dry-run → B live → C threads → D media).
- **Backup**: `git archive` zip of the wrapped HEAD shipped to the user
  (tracked files only — `tokens.txt` and `.dev.vars` stay gitignored, secrets
  live in wrangler).
- **GitHub**: remote restored to `assadigit/SportSignal`; the sandbox's stored
  classic token was redacted by the environment, so the push of the 15
  post-v12.0 commits is queued for a user-supplied token
  (`git remote set-url origin https://<token>@github.com/assadigit/SportSignal.git && git push origin main`).

## [12.32-backlog] — 2026-09-15 (7-item backlog: hero date under the time chip, mobile time between crests, 5+«بیشتر» results, new-leader Telegram alerts, corner watermark crescents, smaller bar clock, bigger logo)

User ask (backlog of 7):
1. move the date line below the countdown chip ("time / weekday day month",
   smaller font) — out of the navy bar;
2. on mobile, move the match time between the clubs' logos, aligned;
3. recent results: last 5 + a «بیشتر» button that shows the latest 20 (PC too);
4. a Telegram special alert when a NON-first team (2nd/3rd/4th…) tops the
   table after a match, with the match details;
5. the two hero background badge watermarks repositioned to the container's
   bottom corners, centers offset ~27.5% of the badge diameter inward, the
   rest clipped by overflow:hidden (partial crescents);
6. decrease the ⚡ bar countdown numbers (PC + mobile);
7. increase the SportSignal logo by 15% in PC mode.

- **Hero time/date stack**: #bigbarDate (v12.31's in-bar date run) is
  RETIRED; spotItemNode (hero = opts.noDate) renders the center slot as a
  COLUMN — the 24px time chip with the new .kickdate (weekday + day +
  month, fmtHeroDate, 12.5px PC / 10px phones) under it, one centered stack
  between the two clubs. Live-score heroes get the same stack.
- **Mobile face-off**: the time/score slot rides BETWEEN the two crest
  columns on the crest line (order:1 + align-self:flex-start +
  height:46px — the chip centers exactly on the 46px crest's vertical
  center; the hero column uses height:auto + 3px top offset). Names stay
  under their crests. Direct-child selectors so the hero's nested score
  never re-flows.
- **Results expander**: server finished cap 12 → 20; the card renders the
  latest FIVE with a «بیشتر»/«کمتر» pill (FIN_EXPANDED) — one tap shows
  the latest 20; language switch rebuilds the rows + pill (renderFinished
  with force + onLang now re-renders hero/topspot/finished too).
- **👑 Table-top alerts (bot)**: maybeNotifyTableToppers runs after every
  cron sweep — per domestic league (weeklyTableCodes minus CL), the
  current #1 is compared with the last run's KV snapshot
  (table_top_v1:<code>, top-10). Fires only when the new #1's previous
  position was 2+ AND a just-finished (6h window) match involving the new
  or old leader is in the pool — the message carries the new leader +
  points + previous rank + the triggering match (teams, score, winner,
  league, Jalali date) in the bot's MarkdownV2 style. Snapshot updates
  every run → each coronation notifies exactly once.
- **Corner crescents**: .hero-wm imgs anchor to the card's bottom corners
  (first/home badge bottom-LEFT, second/away bottom-RIGHT — PHYSICAL
  left/right, the wireframe's corners are screen corners, not logical),
  centers 88px inward on both axes (27.5% of the 320px diameter), the
  72px overhangs clipped by the layer's overflow:hidden. Phones keep the
  layer hidden (v12.30 ask stands).
- **Smaller bar clock**: .bighero .bigbar-clock 18px → 14px PC / 12.5px
  phones (the hero's 24px time chip stays the headline number).
- **Logo +15% PC**: .brand img 50px → 57.5px at ≥601px (phones keep 50px).

---

## [12.13-ordergrid] — 2026-09-15 (league tables 3-per-row on PC / 2 on mobile; big-matches box above the UCL box)

User ask: league tables on PC must show THREE columns per row (like
[A][B][C] / [E][F][G]) and two on mobile — the auto-fit grid packed four
leagues per row; and the UCL games box must sit BELOW the other big matches
(reading order: [next big match countdown and teams] → [big upcoming
matches] → [big upcoming UCL matches]).

- **Standings grid fixed**: `.grid4` is now explicit —
  `grid-template-columns:repeat(2,1fr)` base (mobile) and
  `@media (min-width:601px){...repeat(3,1fr)}` (PC). The page caps at 760px,
  so desktop renders the 6 leagues as two tidy rows of three ~233px boxes;
  phones keep two per row. The old `repeat(auto-fit,minmax(150px,1fr))`
  (which packed 4 per row on desktop) is retired.
- **Section reorder**: `#topspotCard` («🔥 مسابقات بزرگ پیش‌رو» — big upcoming
  matches) now sits between the hero card and `#uclSpotCard` («🔥 مسابقات مهم
  لیگ قهرمانان اروپا» — big upcoming UCL matches): hero (countdown + its
  match) → big domestic/overall big matches → UCL matches → UCL standings →
  league tables → tournaments → recent results. Pure HTML template move; the
  JS renderers are id-based and order-independent, so behavior (hero = box
  slot 1, caps, dedup, wait states) is unchanged.
- Version labels bumped to ۱۲.۱۳ / v12.13 across the public/login/admin
  i18n dicts.

## [12.12-bigfocus] — 2026-09-15 (big-only page: view toggle & upcoming list retired, 10-match box, 8-match UCL box with selected-only filter, no A-League, dark scrollbars)

User ask: remove the «فقط بازی‌های بزرگ / همه بازی‌ها» toggle (big-only must be
the default and only mode), remove the now-redundant «📅 مسابقات پیش‌رو» card,
«مسابقات بزرگ پیش‌رو» shows up to 10 next matches, the UCL box shows up to 8
matches ("two important today, two important tomorrow") and only games where
at least one side is a selected club (Sabah FK vs SK Slavia Praha is noise),
remove the Australia league from the league tables, and fix the scrollbar
rendering light in dark mode.

- **View toggle retired**: the `.viewtoggle` HTML/CSS, `setView()`, the `VIEW`
  variable and the `ucl_view` localStorage preference are all gone — the page
  is permanently big-only. `applyView()` shrinks to rendering the finished
  card (the week's selected-team results).
- **«📅 مسابقات پیش‌رو» card retired**: with the toggle gone it only ever held
  the redundant "همه در جعبه بالا هستند" note. `renderSections`/`catOf`/
  `CAT_CUPS` and the `.msec`/`.ucl-matches` CSS are removed with it; the hero
  card + the topspot box + the UCL box ARE the upcoming presentation.
- **Big-matches box × 10**: the server picks up to ELEVEN true big matches
  (A/B/C + selected-vs-top-5 fallback, strict kickoff order); slot 1 goes to
  the hero card (the countdown's match) and «🔥 مسابقات بزرگ پیش‌رو» shows the
  remaining up to TEN.
- **Generalized UCL box × 8**: `ucl.matches` now carries up to EIGHT upcoming
  CL fixtures in kickoff order (live first) where ≥1 side is a SELECTED club —
  the both-unselected noise (Sabah FK 🆚 SK Slavia Praha) never boxes. The old
  single-headline `nbig` pick chain is retired; `renderUclSpot()` renders the
  box with the same `spotItemNode` rows as the topspot box + hero (uniform),
  hides the card when empty, and keeps the pre-draw wait state. The «🏆 لیگ
  قهرمانان اروپا» card drops its all-fixtures list (the noise source) and is
  standings-only now.
- **A-League out of the league tables**: `standCodes` loses `AL` (5 European
  leagues + PGL remain, 6 boxes); the client grid list and `FLAGS` follow. AL
  stays in the notify config and the settings-driven weekly Telegram digest.
- **Dark-mode scrollbars**: `color-scheme:dark` on `:root` and
  `color-scheme:light` on `[data-theme="light"]` (all three pages) — native
  scrollbars and form controls now match the active theme instead of always
  rendering light.

## [12.11-uniform] — 2026-09-15 (streamlined: no special boxes around matches — uniform rows everywhere)

User ask: "The UI is inconsistent, some matches have a different border
around them, such as manchester united vs city, but there isn't any border
around liverpool, manchester city that is somehow equally important. Remove
this box around them, and make all streamlined."

- **`.match.derby` chrome retired**: derby rows (Man Utd–City, Atlético–Real,
  Marseille–PSG …) used to carry an amber border + amber→violet gradient +
  glow while equally big non-derbies (Liverpool–Man City, Roma–Inter) stayed
  plain. Every match row now renders IDENTICALLY — same padding, same thin
  separator, same hover. The `derby` class stays in the DOM (inert) and the
  «دربی» badge pill in the info row still carries the label, now calm
  (glow animation dropped, margin made RTL-safe like `topbadge`).
- **Golden `.topspot` box chrome retired**: the hero card (countdown + its
  match) and the «🔥 مسابقات بزرگ پیش‌رو» box are plain standard `.card`
  sections now, visually identical to every other card on the page — no
  golden borders, no gradient wash, no pulsing glow. The 🔥 headings and the
  countdown bar still carry the "big match" signal.
- **UCL gold chrome retired too**: `.uclspot` (next big UCL match card) and
  `.uclcard` (UCL list card) drop their golden borders, yellow-tint
  backgrounds and the `uclspot-glow` pulse — they were the last boxes that
  set certain matches apart visually. The container classes stay in the HTML
  as inert hooks (reduced-transparency selector unchanged); the
  `.uclspot-logo/info/wait` layout rules are untouched.
- **Hero card structure unchanged (v12.10)**: the countdown bar and its match
  remain ONE stuck unit at the very top; `barTarget()` logic, view dedupe,
  legacy `{next}` handling and the idle state are untouched — this is purely
  a presentation unification. `renderHeroSpot()` now always sets
  `card bighero` (no conditional `topspot` class).

## [12.10-herobox] — 2026-09-15 (hero card: the countdown bar and its match are ONE box at the top)

User ask: the page's countdown bar (⚡ تا بازی بزرگ بعدی) counts to the next
big match, but that match rendered in the big-matches box further down —
"the next bigmatch is not stick to it (but it must …) the next and closest
upcoming match, which happens to have a countdown, [should be] separated in
a box (on top) from other matches".

- **Hero card**: the countdown bar now lives INSIDE a new card at the very
  top (right below the view toggle), with its own match stuck directly
  under it — the closest upcoming big match (the big-matches box's slot 1,
  live entries leading). The bar keeps driving label/clock/fill every
  second; the match below it is rendered by the new `renderHeroSpot()`.
- **One pick, two views**: new `barTarget()` is the single source of truth
  both the countdown bar and the hero card agree on — box top → far
  `nextBig` fallback → nearest big upcoming → plain `upcoming[0]`. The card
  under the countdown is always EXACTLY the match being counted down to,
  so the bar can never point at a card rendered elsewhere on the page.
  When no big match exists at all, the hero gracefully degrades to the
  plain next match with the "⏳ تا مسابقه بعدی" fallback label.
- **Box separation**: the «🔥 مسابقات بزرگ پیش‌رو» box now presents the
  REMAINING big matches (slots 2–6) — the headline is visually separated
  from the other matches, exactly as requested. Total big-match capacity
  is unchanged (1 hero + 5 box = 6). `spotItemNode()` extracted so hero
  and box entries share one rendering path (badges, live chip, venue,
  share row included).
- **No duplication**: `applyView()` filters the hero's match out of the
  upcoming list (the far `nextBig` fallback card formerly rendered at the
  head of the upcoming list — `renderSpecial` — is retired; the hero IS
  its presentation now, stuck to the countdown).
- **Styling**: `.bighero .bigbar` renders flush inside the card (no own
  chrome — the card provides it) with a soft divider to the match; the
  hero takes the amber `topspot` glow when the target really is a big
  match, neutral glass otherwise. Bonus fix: `updateBigBar`'s idle gate no
  longer ignores a box top when `upcoming` happens to be empty.

---

## [12.9-weeklytables] — 2026-09-14 (end-of-week league tables in Telegram + /tables + admin force-send)

User ask: "I want telegram bot to show the table fixtures of selected leagues
at the end of the week; to test this, send league tables to bot now."

- **Weekly digest**: every Monday 01:30–06:00 Tehran (after the last European
  Sunday kickoff — La Liga's late slot ends ~01:20 Tehran), the cron delivers
  one Telegram message per selected league with its full table. Once per ISO
  week (`weekly_tables_v1` KV flag); the flag is set only when something was
  delivered, so an API outage / subrequest-capped run retries on the next
  10-min tick (standings are KV-cached by then) — the digest is never lost.
- **Selected leagues** = admin-settings leagues (`CONFIG.LEAGUES` after
  applySettings — currently CL, PL, PD, SA, FL1) + PGL (the Iranian league the
  user curated onto the site's standings grid). Adding BL1/AL in settings
  automatically joins them to the digest. Not-started tables (A-League
  pre-season) are skipped; CL's 36-team Swiss table is capped to the top 10.
- **Message format**: MarkdownV2, Persian digits, sequential rank renumbering
  (providers return tied positions — two teams on pos 6 — which reads like a
  data bug in chat), leader bolded, ⭐ marks the user's selected teams
  (normAlias-matched), footer points at football.sportsignal.ir.
- **On demand**: new `/tables` (also `/جدول`) bot command sends the same
  digest immediately to the requesting chat; new admin action
  `GET /send-tables` (Bearer ADMIN_TOKEN or admin session cookie) force-sends
  to every registered chat for testing — it does NOT consume the weekly slot.
- `/help` and the `/start` welcome now document `/tables`.
- **Data check (user: "check the showing leagues results")**: pulled every
  `standings_cache_*` from live KV — Hull City in the PL top 3 is NOT
  corruption: Hull appears in the 2026-27 PL fixtures (Chelsea–Hull 12 Sep,
  Newcastle–Hull 19 Sep), i.e. a promoted side in form. Duplicate `pos` values
  are the provider's tie convention (fixed for chat by renumbering; the site
  grid keeps provider positions).
- Version 12.9-weeklytables; ver strings fa/en × 3 page dicts; package 12.9.0.

---

## [12.8-bigmatch] — 2026-09-14 (big-match LOGIC — true big matches only, closest on top, countdown follows slot 1)

User ask, paraphrased: "in مسابقات بزرگ پیش‌رو I see Liverpool vs Fulham which is
not a big match — what's the logic?" The user's definition of a big match:
A: two selected teams play each other; B: the match that changes the 1st
position in the table; C: derbies; and only when none of those is around, a
selected team against a TOP-5 side of that league ("if Tottenham is not
selected but in the top 5 and Chelsea plays it, I want to know"). Always the
closest upcoming match on top, and the countdown belongs to it.

- **Qualification tightened (the Liverpool–Fulham rule)**: the box's fallback
  tier is no longer "any fixture with ≥1 selected team, then featured
  pairings". It is now a selected team vs a TOP-5 side of that league
  (isSelVsTop5, per current standings) — and nothing else. A/B/C
  (selected-vs-selected, both-top-3 summit clashes, derbies) fill the six
  slots first, the fallback tops up whatever is left; featured-only pairings
  no longer box.
- **Strict kickoff order**: the v12.7 band/tier ranking (live > ≤7-day
  matchweek > far; clash > derby > selected > featured within a band) is
  replaced by a single comparator — kickoff ascending. Live matches lead
  (their kickoff is in the past), then the closest upcoming match is ALWAYS
  on top. The derbies follow in kickoff order instead of jumping the queue.
- **The countdown belongs to the top match**: updateBigBar now targets the
  TOP BOX's slot 1 (topSpot.matches[0], legacy topSpot.next tolerated for
  ≤3-min stale KV) before nextBig — the page's one live countdown counts
  down to the closest big match the box leads with. Box empty → the old
  nextBig → first-big-upcoming → upcoming[0] chain applies.
- **Paris FC name fix** (audit backlog): the fa-dict stem fallback folded
  "Paris FC" (normKey "paris") onto "parissaintgermain" — the promoted
  Ligue 1 club rendered as پاری‌سن‌ژرمن (PSG) in Persian. Exact dict entry
  "Paris FC" → «پاری‌اف‌سی» wins before any fallback; "SC Paderborn 07" →
  «پادربورن» joins too (both clubs are visible on the current page).
- **Tests**: live-derby-test.js scenarios rewritten to the v12.8 contract —
  single-selected vs non-top-5 never boxes and stays in the upcoming list;
  new scenario 3b stubs PL standings and proves the fallback tier (selected
  vs top-5 boxes) AND the strict kickoff order (the closest fallback leads
  even over a core derby, topSpot.next = box top = countdown target).
- **Big-view empty state**: with every big match now boxed, the default
  "فقط بازی‌های بزرگ" view can legitimately have an empty upcoming list —
  instead of the stark "مسابقه‌ای در راه نیست" right below a 6-entry card it
  now says «بازی بزرگ دیگری در راه نیست — همه در جعبه بالا هستند» /
  "No other big match ahead — they're all in the box above" (new boxAll key,
  public-page fa/en dicts; T() key-fallback keeps other pages safe).
- Version 12.8-bigmatch; ver strings fa/en × 3 page dicts; package 12.8.0.

---

## [12.7-bigbox] — 2026-09-14 (🔥 مسابقات بزرگ پیش‌رو — the TOP BOX becomes a six-match card)

User ask, paraphrased: the "🔥 مسابقه بزرگ بعدی لیگ‌های داخلی" single-match card
becomes "🔥 مسابقات بزرگ پیش‌رو" — a box holding the closest big upcoming
matches (up to 6), so the Madrid derby (Atlético–Real Madrid) and the
Manchester derby can sit in the SAME box; a match that is both a derby and a
رقابت برای صدر جدول must show BOTH tags.

- **Up to SIX consolidated entries**: the TOP BOX pick pipeline (lgPool →
  single `topSpotNext`) is replaced by a ranked selection — big matches
  (selected-vs-selected clashes, derbies, genuine both-top-3 table clashes)
  get a 4-slot guarantee, the remaining slots fill with the nearest
  ≥1-selected fixtures, then featured (both-big) pairings. Display order:
  live > inside the ≤7-day matchweek > farther out; within a band
  clash > derby/top > selected > featured, then kickoff — so an imminent
  selected match still leads the card (the v12.4 headline semantics are
  preserved for slot 1) while the derbies are consolidated behind it.
- **Both tags, independently**: every box entry renders the 🔥 دربی badge AND
  the 🔥 صدر جدول badge independently — a fixture that is a derby and a
  top-of-the-table clash (e.g. a 1st-vs-2nd Clásico) shows both, never
  either/or. Each entry mirrors the uclspot row (live score, LIVE chip,
  minute, venue, per-entry share row) wrapped in a new `.spotitem` entry with
  soft dividers; share/calendar icons reveal per entry on hover/focus.
- **Payload**: `topSpot.matches` (array, ≤6) joins the legacy `topSpot.next`
  (kept for ≤5-min stale-KV compatibility — the client accepts both shapes).
  All box fixtures are excluded from the upcoming list (the box IS their
  presentation, v12.3 rule), and upcoming's "nearest big match" fallback card
  now skips a nextBig the box already presents (no duplicate presentation).
- **i18n**: hLgNext fa/en retitled («🔥 مسابقات بزرگ پیش‌رو» / "🔥 Big Upcoming
  Matches"); ver strings → 12.7 across the 3 page dicts.
- Version 12.7-bigbox; ver strings fa/en × 3 page dicts.

---

## [12.6-hazfi] — 2026-09-10 (جام حذفی ایران joins the cups card)

User ask, verbatim: "add جام حذفی ایران to this box [the 🏆 جام‌های حذفی card]".

- **Hazfi box lives in the cups grid now** (an 🇮🇷 ایران country group after
  انگلستان/اسپانیا/ایتالیا, same pattern as the other domestic cups):
  HAZFI_CUP joins cupOrder + countryOf("IR"), the client renders a 4th country
  group, and the fa/en dicts gain cIR. Emblem (leagues/719.png) and the Persian
  name (جام حذفی ایران) reuse the existing assets the retired Iran card used.
- **Real fixture source wired — sportscore `iran-cup`**: slug verified live
  against the fixtures API (2026-01-13: Foolad Hormozgan 0-2 Esteghlal Tehran,
  Shams Azar Qazvin 3-0 Tractor S.C. — genuine Hazfi 1404 results). The long-view
  cup day-sweep (10-day lookahead, stops at each cup's first fixture) now
  includes it, so the box fills itself the moment the 1405 R1 draw publishes;
  until then it shows the same honest "برنامه‌ای هنوز اعلام نشده" as the FA Cup
  and Copa del Rey boxes (the new season genuinely hasn't been drawn).
- **Display-only by design**: HAZFI_CUP is NOT added to DOMESTIC_CUP_IDS nor the
  near-scan slug filter — Hazfi matches never notify, never join the
  upcoming/finished lists, and the cron subrequest budget stays flat; the only
  extra cost is the long-view cup sweep (4 → 5 cups, worst case +10 day-calls
  while the cup is empty, mirroring the existing FA/CDR pattern).
- Version 12.6-hazfi; ver strings fa/en × 3 page dicts.

## [12.5-iranres] — 2026-09-10 (Iran table joins the league grid + Recent Results carries the week)

Two user asks, verbatim: "move iranian league to other leagues [the standings grid] ...
add iranian league table to it. and remove this [the Iran card]" and "نتایج اخیر shows
empty but it must show the recent results for example this weeks CL matches (which
their results were notified in telegram)".

- **Iran card retired; PGL table moved into the league-standings grid**: the
  #standings grid4 now renders 7 boxes (PL, PD, SA, FL1, BL1, AL, PGL) from one
  d.standings payload — standings.PGL is built server-side from the same
  KV-backed sportscore table the old card used (compact top-8, same
  emblem/flag). The dedicated card (iranHead, collapse button, Hazfi box) is
  fully removed: HTML, CSS (.iranHead/.collapsebtn),
  renderIran/initIran/toggleIran/iranHidden, the 'iran' payload key, the fa/en
  dict keys and the boot/rerender calls. PGL stays out of standCodes, so top-3
  badge semantics (domestic leagues only) are untouched. The Hazfi cup box was
  retired with the card (no fixtures announced — nothing to show).
- **Recent Results fixed (was always empty)**: the finished-results window was
  12 HOURS — every morning after a matchday the card emptied, so this week's CL
  results (the exact ones the bot notified on Telegram) never showed. Now:
  - fetchLongView sweeps 7 days of past matches (was the bot's 2-day near
    window). Still 10 ten-day FD chunks — the first chunk simply starts
    earlier — so the subrequest count is unchanged.
  - the finished filter keeps its notification semantics (shouldNotify ||
    top-3 involved) but extends 12h → 7 days and 5 → 12 rows, newest first.
  - withTop now stamps p.sel (≥1 selected team — "big for THIS user", the
    v12.4 box rule); the finished card's big-only-view filter accepts it, so a
    notified single-selected CL result (e.g. Real Madrid vs Leipzig) can never
    vanish behind the big view. Upcoming big-view semantics unchanged.
- Version 12.5-iranres; ver strings fa/en × 3 page dicts.

## [12.4-clprox] — 2026-09-10 (CL BOX proximity rule — far pairings yield to near selected-team matches)

The user's rule, verbatim: "when a selected-vs-selected CL pairing is far away
(even weeks or months) the CL box should prioritize matches that AT LEAST one
party of match is one of selected teams — FOR EXAMPLE: REAL MADRID VS LEIPZIG."
Live case that triggered it: through the Sep 10 → Oct 13 CL calendar gap the
CL BOX counted down 33 days to the selected-vs-selected Atlético–ManUtd
pairing while ManUtd–Sabah kicked off in minutes — an imminent single-selected
fixture was crowded out by a distant two-selected derby.

- **CL BOX (`ucl.nbig`) pick order rewritten**: live selected-vs-selected >
  live ≥1-selected > live both-big > selected-vs-selected within 7 days (its
  matchweek — the v12.3 "TOP CL GAME" rule, preserved) > earliest ≥1-selected
  match (kickoff order; the two-selected game still wins equal kickoffs) >
  earliest both-big pairing > plain next fixture with the neutral label. So
  "Real Madrid vs Leipzig" (only Real Madrid selected) headlines while the
  two-selected derby is weeks/months out, the derby takes the box back inside
  its matchweek, and a distant derby still headlines when it is the only
  remaining match involving a selected team.
- **TOP BOX mirrors the rule** ("repurposed for matches/teams"): while the
  domestic selected-vs-selected clash is far away, the box headlines the
  earliest domestic fixture with ≥1 selected team; the far clash stays in the
  upcoming list leading its league section (m.clash sort) whenever it is
  inside the end-of-month window. Near/live clashes keep the box exactly as
  in v12.3, and the headline fixture is still excluded from the list (the box
  IS its presentation).
- **`nbig.big` label widened**: a headline involving a selected team is "big"
  for this user (drives the 🔥 "مسابقه بزرگ بعدی" label); only the plain
  both-unselected fallback keeps the neutral "next UCL match" wording.
- **CL BOX live rendering parity** (`renderUclSpot`): a live headline now
  shows the score + LIVE chip instead of a countdown (mirrors `renderTopSpot`)
  plus the 🔥 derby badge — the proximity rule can legitimately put a followed
  team's live game in the box.
- Verified with a 21-scenario harness that evals the real extracted selection
  code (far/near/boundary/tie/live/empty cases for both boxes).

---

## [12.3-topbox] — 2026-09-10 (TOP BOX — selected-vs-selected headline rule)

The user's rule, verbatim: "TOP CL GAME: when two selected teams play together
→ in the CL BOX. TOP LEAGUE (internal leagues): when two selected teams play
together → in the TOP BOX." A domestic-league fixture where BOTH sides are
selected teams (e.g. the Manchester derby) is a headline match — it must
present at the TOP of the upcoming matches, not 3rd/4th in kickoff order.

- **TOP BOX added**: a new `card topspot` ("🔥 مسابقه بزرگ بعدی لیگ‌های
  داخلی") renders directly above the games list (below the UCL spot = CL
  BOX). Its headline fixture is the nearest selected-vs-selected domestic
  league clash (live first, then kickoff, 90-day horizon). The headline
  fixture is excluded from the upcoming list — the box IS its presentation —
  so the derby can never appear "buried at 3rd/4th priority" again.
- **CL BOX rule tightened** (`ucl.nbig`): the UCL spot headline now prefers a
  selected-vs-selected CL pairing, then any featured (big-pool) pairing, then
  the next UCL fixture with the neutral label. `nextBig`/bigbar likewise count
  a selected-vs-selected pairing as featured.
- **Remaining clashes stay visible**: further selected-vs-selected fixtures
  keep their list slots, carry a new `m.clash` flag, lead their section
  (stable sort), and are never filtered out of the big-only view.
- **Provider legal-name aliases** (root cause found while wiring the rule):
  football-data returns "Club Atlético de Madrid" and "FC Internazionale
  Milano", which never normalized to the selected lists' short forms
  ("Atlético Madrid", "Inter Milan") — Atlético/Inter matches, big/derby
  flags and notifications silently missed those clubs (the Madrid & Milan
  derbies were even un-badged in the live API). A small match-side alias map
  (`TEAM_ALIASES`/`normAlias`) now folds provider variants onto the
  selected-list keys in `shouldNotify`, `isFeaturedMatch`, `isDerby`,
  `isMasterBigMatch` and `userFollowsMatch`; the FA dictionary gains exact
  entries so the Persian names render (اتلتیکو مادرید / اینتر میلان).
- **Gates**: live-derby-test now evals the alias/master helpers, asserts
  FD-legal-name derby/notification/featured detection, and runs a new
  scenario 3 covering the TOP BOX pick, list exclusion, clash flags and
  nextBig preference; check-cups stubs `isMasterPair`. 10/10 gates green.

---

## [12.2-topclash] — 2026-09-10 (v12.1 regression hotfix)

Two user-reported regressions of the 12.1 future-plan release, fixed live.

- **"Virtually every match badged 🔥 صدر جدول" fixed**: 12.1 flagged ANY
  fixture involving a top-3 side — with 6 leagues × 3 sides that stamped the
  badge on 41 of 50 upcoming cards (live evidence) and flooded the default
  big-only view. The concepts are now split: a top-3 side's fixtures still
  JOIN the schedule (the original inclusion ask, e.g. an unselected
  Newcastle), but the badge, the "🔥 رقابت‌های صدر جدول" section and the
  big-view filter are reserved for genuine top-of-the-table clashes — BOTH
  sides inside the top 3 (e.g. Roma 1st vs Inter 2nd). Single-top fixtures
  render as regular league games.
- **Next-big-match box back on top**: the UCL spot card ("🔥 مسابقه بزرگ
  بعدی لیگ قهرمانان اروپا") sat BELOW the games list; the badge flood
  buried it between the upcoming sections and the UCL card. The card now
  renders above the games list (static HTML reorder) — it is the headline
  fixture of the page, games follow it. The renderSpecial fallback (no big
  match inside the month window) still pins the nearest big match on top of
  the list.
- **Duplicate match cards fixed** (amplified the flood — 10 pairings showed
  twice): providers report the same fixture with kickoffs ~a day apart (FD
  day-N evening vs TSP day-N+1 default slot, 19–31h observed). The dedupe
  key carried the UTC date, so both copies survived. `canonDedupe`
  (`src/dedupe.js`) gains a pairing-proximity pass: same competition +
  same ordered pairing within 48h collapses to one row, keeping the earlier
  kickoff (the authoritative slot in every observed pair) and adopting
  venue/crests from the dropped copy; identical non-empty ids (the same
  provider fixture drifted/rescheduled — observed 53h apart) merge
  regardless of distance with the fresher copy winning. The near-scan pool
  (`fetchMatchesFromAPI`) is deduped before notifications too, killing the
  double "match started" risk. Real distinct meetings of the same ordered
  pairing are weeks apart, so the window cannot over-merge.
  `scripts/check-dedupe.js` gains 9 assertions covering the new passes.
- Live result: KV pool 811 → 710 matches, 101 → 0 duplicate pairings; the
  public page serves 42 unique cards with exactly 2 صدر جدول badges
  (Paris FC–Lyon, Roma–Inter) and a 3-card big view.
- `src/dedupe.js` normalized CRLF→LF (worker.ts was already LF; mixed
  endings broke exact-match edits).

---

## [12.1-futureplan] — 2026-09-10 (برنامه آتی — future-plan fixes)

User-reported product fixes, tagged `Future-plan fix` / `Future-plan ask` in source.

- **False "match started" alerts fixed**: the match-start window opened 45
  minutes BEFORE kickoff (`MATCH_START_WINDOW_MINUTES: 45`), so a 22:30
  kickoff was announced "🚨 بازی شروع شد!" at 21:45. `isMatchStartingNow`
  now fires only after the real kickoff (−1 min clock-skew grace … +20 min
  catch-up so the 10-minute cron always lands inside the window) and never
  for finished/postponed/suspended/cancelled fixtures. KV dedupe still keeps
  it to one message per match.
- **"All Champions League games marked big" fixed**: the UCL spot headline
  ("🔥 مسابقه بزرگ بعدی لیگ قهرمانان اروپا") featured ANY next CL fixture —
  live evidence: Fenerbahçe–Roma (`big: false`) was presented as a big match.
  The spot now features the next CL pairing of two big clubs
  (`isFeaturedMatch`); when none is on the horizon it falls back to the next
  fixture and the client shows the neutral "مسابقه بعدی" headline (driven by
  `nbig.big`).
- **Top-of-the-table competition (رقابت‌های صدر جدول)**: the top 3 of each
  country's current league (PL, PD, SA, FL1, BL1, AL) now join the schedule
  even when neither club is a selected team — e.g. a top-3 Newcastle side
  outside the English selection. The page gains a dedicated "🔥 رقابت‌های
  صدر جدول" section plus a per-card 🔥 badge; top-of-the-table fixtures also
  surface in the "big matches" view and in recent results. Pre-season
  (unstarted) tables are ignored; team-name normalization is memoized per
  sweep so CPU cost stays flat.
- **League tables hardening**: standings no longer blank out when
  football-data 429s (the fixture sweep spends most of the 10 req/min free
  budget). Failed refreshes now serve the last good table, and at most 2 FD
  tables refresh per sweep via a clock-derived time-sliced rotation (no
  extra KV writes). Ligue 1 (FL1) joins the site's league tables.
- **Club badges**: crest images now load with `referrerpolicy=no-referrer`;
  a failed or missing crest renders a clean two-letter club monogram
  instead of a bare ⚽.
- **Share/calendar icons**: shown only while hovering (or keyboard-focusing)
  a match card on precision pointers; touch devices keep them always
  visible (`@media (hover:hover) and (pointer:fine)`).
- Test gates updated: check-notify-windows asserts the post-kickoff window;
  check-cups stubs `isFeaturedMatch` and now generates fixture dates
  relative to "now" (its 3 old failures were stale hardcoded 2026-09 dates,
  not code bugs).
- Version 12.1-futureplan; page i18n gains `hUclNextAny` / `boxTop` /
  `topBadge`; subtitle updated to mention the new section.

---

## [12.0-hardened] — 2026-09-10 (audit remediation)

Full-stack audit remediation — all 17 findings from the Phase 1–5 audit
(repo: assadigit/SportSignal). Every change is tagged `Audit fix N` in source.

**Critical reliability (the live error-1101 outage):**
- Webhook responds **200 OK immediately**; all command processing moved to
  `ctx.waitUntil` background (`handleTelegramUpdate`). Telegram can no longer
  drop/timeout slow webhooks.
- **`update_id` dedupe** (KV, 10-min TTL) — Telegram re-deliveries are no-ops;
  handler errors are swallowed (no 500 → no infinite re-delivery loop);
  non-message updates are tolerated.
- **Subrequest budget**: soft counter (cap 48, reset per invocation) in
  `fetchJSON`/`fetchWithRetry`/`sendTelegram`; Cache API (5-min TTL) on
  sportscore/TheSportsDB day feeds (cache hits cost 0 subrequests); sportscore
  cron range 4→3 dates; fetchLongView EL/ECL/BL1 sweep 10→7 days and fully
  failure-tolerant; TSP day-sweep only when per-league calls came up empty;
  `/next` reuses the cron's ≤10-min KV pool instead of a live sweep.
- **Public API outage fixed**: `/api/public-matches` single-flight refresh lock
  (45s) + per-IP courtesy limit (60s) + stale-serve + route try/catch with a
  degraded empty shape — never a raw 500 again.
- **KV writes ≤ ~500/day** (was 1,008–1,152 vs 1,000 free cap): heartbeat +
  last_cron consolidated into `cron_status_v1` (legacy fallback readers), no
  lock delete (TTL expiry), `last_api_source` written only on change, match
  cache skipped when the merged pool is unchanged, notification cleanup once
  per hour.

**High:**
- CPU: `shouldNotify`/`isFeaturedMatch`/`masterTeamList`/`userFollowsMatch` now
  use identity-invalidated normalized Set caches; `translateTeam` builds its
  ~600-entry dict once with Map indexes (was: rebuilt per call).
- `saveNotifiedMatch` KV put is failure-tolerant (one write can no longer abort
  a run's remaining notifications).
- Admin sessions: cookie now carries a random session id (`admin_sess_<id>`,
  12h TTL) — **ADMIN_TOKEN never leaves the server** (was: cookie value AND
  localStorage). Client authenticates via HttpOnly cookie; re-login takes the
  admin password.
- Execution lock is ownership-verified (`own:<ts>:<uuid>` write + read-back).

**Medium/Low:** timing-safe compares (webhook secret, Bearer, password, PBKDF2);
429s pause all sends ≤10s instead of blocking sleeps; `/timezone` replies escape
underscores (MarkdownV2 fix); `/api/status` masks chat ids; `/api/diag-fd` no
longer leaks the API key tail; `getNowTehran` reimplemented deterministically
(formatToParts; wall-clock-as-UTC convention preserved); verbose per-item logs
gated behind `LOG_VERBOSE`.

Gates: all 10 scripts pass (check-cups' 3 failures are pre-existing, unchanged);
`live-derby-test` extraction updated for the `fetchPublicMatches(env, req)`
signature. fd retry attempts 3→2; TSP fallback window -2/+4 → -1/+2 days.

## [11.52] — 2026-08-19

- **Bundesliga (BL1) data actually flows** — sportscore now fetches BL1 in the
  near scan and long view (football-data returns 0 BL1 fixtures; TheSportsDB is
  429-blocked on worker egress).
- Bayern gets an English alias (providers report "Bayern Munich", not
  "FC Bayern München").
- Gate: `scripts/check-bl1.js`.

## [11.51b] — 2026-08-19

- `getSettings` now merges default leagues with saved settings
  (BL1/Bundesliga survives old settings — fixes Bayern/Dortmund silently
  dropping out of fetch + notify).
- Gate: `scripts/check-league-union.js`.

## [11.51] — 2026-08-19

- UI/UX audit fixes: WCAG AA light-mode contrast for section headers / live
  chip / derby badge, reduced-transparency solid fallback across all glass
  surfaces, UCL spotlight shows a live countdown when fixtures are pending,
  lazy-loaded crest images, mobile topbar wraps instead of clipping, lighter
  UCL table track.

## [11.50] — 2026-08-19

- Desaturate the next-big-match card green (dark: muted gray-green gradient,
  light: soft mint) with softened borders.

## [11.49] — 2026-08-19

- Cap the UCL next-match query at the next 90 days (live matches kept) — the
  spotlight and UCL match list can no longer surface fixtures beyond the horizon.

## [11.48] — 2026-08-19

- UCL not-started blur overlay with live countdown over the league table.

## [11.47] — 2026-08-19

- Remove the breathing glow from the next-big-match card; replace with a solid,
  high-contrast green gradient + readable inner text (both themes, incl.
  reduced-motion fallback).

## [11.46] — 2026-08-19

- Strip Eastern-European / German / Turkish club prefixes in both name
  normalizers (FK NK GNK SK SL RSC BSC JK TC PFC MSK SV TSG) so provider
  variants resolve to Farsi; add ~35 alias keys for UCL clubs; `check-fa-dict`
  now covers 254 names (168 roster + 86 provider variants), 0 failures.

## [11.45] — 2026-08-19

- `FA_TEAMS` +99 entries for every UCL group / league-phase participant from
  2005–06 to 2024–25 (32 clubs) with provider aliases; `check-fa-dict` covers
  168 names.

## [11.44] — 2026-08-19

- Next-UCL-match spotlight card — separate gold container above the UCL table
  with a big Champions League emblem, team crests, countdown, venue and share
  row; server exposes `ucl.nbig` (live-first next CL fixture); `check-cups`
  asserts `nbig`.

## [11.43] — 2026-08-19

- Remove the duplicated internal UCL title inside the dedicated UCL card.

## [11.42] — 2026-08-19

- Smaller glow radius on the next-big-match card with breathing / pulsing
  animation; reduced-motion fallback matches.

## [11.41] — 2026-08-19

- Dedicated UCL card + full 36-team UCL table on the public page; CL pulled out
  of the generic cup order into its own payload (emblem, matchday, started flag,
  up to 10 upcoming CL fixtures, live-first); `check-cups.js` updated for the
  new `ucl` payload.

## [11.40] — 2026-08-19

- Kill duplicate rows at the source — shared `canonDedupe()` collapses
  same-match copies (football-data vs TheSportsDB ids) in both the KV write and
  the list returned to the public page; `check-dedupe.js` regression test.

## [11.39] — 2026-08-19

- Club logo + name stay one unit (`flex-wrap: nowrap`); next-big-match card glow
  is grass green across dark/light/reduced-motion; countdown bar fill green too.

## [11.38] — 2026-08-19

- Fix duplicate matches in the pool — `cacheMatches` dedupes on a canonical match
  key so football-data + TheSportsDB copies collapse to one (richest copy keeps
  venue/crests); glow pulse on the next-big-match card + stadium venue display
  (TheSportsDB `strVenue` threaded through all three builders, cross-source
  merge fills missing venues).

## [11.37] — 2026-08-19

- Fix missing cup / EL / ECL data — sportscore cron now fetches only
  fd-missing comps (EL/ECL + 4 cups, 24 calls) so cup fixtures survive the
  Cloudflare 50-subrequest/invocation cap; `fetchLongView` cup sweep stops at the
  first found fixture; diag endpoint reports the competition breakdown.

## [11.36] — 2026-08-19

- Full IANA timezone picker with search + live ticking countdown bar; wire cup
  fixtures via sportscore (EFL/CDR slugs); remove tier badge; classify
  UCL/EL/ECL as European leagues; logo sticks to club name in match rows.

---

## Unreleased / queued for next session

- **Onboarding regression gate** — `scripts/check-join-flow.js` (wired into
  `npm test`): verifies `/start`, idempotency, `/teams`, `/follow all`,
  `/follow 1,3`, invalid `/follow`, `/stop`, and unknown commands against the
  real webhook handler extracted from `src/worker.ts`. Live-verified against the
  deployed worker (simulated `/start` → registered a user in KV, `/stop` cleaned
  up).
- **Free-tier note** — fan-out to Telegram is one subrequest per recipient; the
  ceiling is Cloudflare's 50 subrequests/invocation, not per-user storage. Not an
  issue at current scale; `checkUserCap` is warn-only.
- **Candidate follow-ups** (from earlier audit/asks, not yet acted on unless
  stated): PGL reliability (sportscore primary + KV-snapshot fallback), FA Cup
  tier/round filtering, EL/ECL qualifying relabel, scheduled-score hygiene
  (null `score` unless FINISHED/LIVE/PAUSED), BL1 season-freshness guard.

