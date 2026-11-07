# 2026-11-07 — Session 22: the channel STYLE round (badges + the labeled link block; v13.234-channelstyle)

Wall-clock note (the repo's convention): this session ran 2026-11-07 Tehran
late night (~22:45–), hours after the S21 activation whose first post the
owner had just seen. The trigger, verbatim: *"I saw the first message, can
you tidy up the channel messages and make them look better, for example
website have it's own emoji. it's okay but can be more tidy and organized
and good looking. also audit and brainstorm how we can make the channel
better and more rich information without overwhelming our backend."*

## 1) Boot gates

- Working tree at `main`@`3a52839` (the S21 activation close). The 1,222
  "modified" files in the initial `git status` were pure file-mode noise
  (100644→100755 from the sandbox restore — zero insertions/deletions);
  `git config core.fileMode false` restored a clean tree. **The S21
  session's push HAD landed** (fetch showed remote main == 3a52839 — the
  stale local origin/main ref was the only artifact; updated).
- Mandatory reading: the S21 note (the activation + first-event evidence),
  `TELEGRAM_CHANNEL_MIRROR_SPEC.md` PART II §4 (the footer law),
  `DISCOVERY.md` §7.4/§7.5 (the composition law) + §8 (budgets) + §12
  (open confirmations), `src/channel-mirror.ts` + `src/notify-engine.ts`
  (the hook) + `src/composers.ts` (the formatters) + `src/telegram.ts`
  (withTrialFooter), the harness (`check-channel-mirror.js`,
  `check-stats.js` pins), AGENTS.md.
- Production sighted before any change: healthz green at
  `13.233-channelactivate`, outbox 0; the channel preview page
  (t.me/s/SportSignalz) showing exactly ONE content post — the Man
  Utd–Aston Villa pre-match-24h from 16:30Z — plus the three service
  messages. The Atléti–Barça 24h window opens 20:00Z: a natural deadline
  (deploy the new format before it, or it posts in the old format).

## 2) The design (what "tidy" means, concretely)

The audit of the first post's shape found three flaws, all presentation:
1. **No stage identity** — a channel is a FEED, and the v13.10-clean
   private layout (date-first, no stage headers) made a 24h countdown post
   byte-similar to a 3h one. A feed reader could not tell them apart.
2. **The wordy private promo CTA** («مشاهده جدول لیگ‌ها و مهمترین
   بازی‌های پیش رو:» + a bare, un-emojied URL) was pasted onto channel
   copies by the engine hook — the site link had NO emoji label while the
   bot link had «🤖 ربات:». Exactly the owner's observation.
3. **The thin `------` separator** — functional, but nothing like a
   structured block.

The fix (a pure presentation layer, respecting the existing-formatters
law — the body still composes through `config.messageFormatter` with the
channel env):

- **`channelStageHead(type)`** (channel-mirror.ts): the bold Persian badge
  «⏳ ۳ روز / ۲۴ ساعت / ۳ ساعت / ۱ ساعت / ۵ دقیقه تا شروع بازی» opening
  every countdown post; `""` for match-start/result (their formatters
  carry their own headlines). The ⏳ rides OUTSIDE the bold span (the
  formatMatchStartMessage precedent); the text composes through `mdBold`
  (the md.ts entity-builder law).
- **The labeled link block**: the engine hook DROPS the private promo
  footer append; `appendChannelFooter` (dedup law unchanged) then renders
  the full block — the heavy `━━━━━━━━━━━━` rule (12 × U+2501) + «🌐 سایت:
  https://sportsignal.ir» + «🤖 ربات: https://t.me/SportSignalAlertsBot».
  Families whose bodies already carry a sportsignal.ir link (the tables'
  football.sportsignal.ir footer) still get only the bot line — no
  duplicate elements, ever.
- **The parity law holds**: the private path keeps its v13.22 promo footer
  + CTA seam byte-identical; only the channel hook's composition changed.

## 3) The release (v13.234-channelstyle)

- `src/channel-mirror.ts`: +`mdBold` import, +`CHANNEL_STAGE_BADGES` /
  `channelStageHead`, `CHANNEL_FOOTER_SEP` → the heavy rule.
- `src/notify-engine.ts`: the channel hook composes
  `channelStageHead(config.type) + specialBanner + formatter`, drops the
  promo append, keeps `appendChannelFooter`.
- Version three-way: config `13.234-channelstyle` ↔ package.json
  `13.234.0.0` (lock refreshed) ↔ the CHANGELOG head entry.
- Harness co-evolution (same commit): check-channel-mirror g-section +6
  badge checks (5 countdown types + the empty-string cases) and the
  separator re-pins (f1/f3, h1/h2/h8 composition pins flipped); the
  CHANNEL_SEAM exclusion regex learns `channelStageHead` (the j/i matrix
  covers the new seam); the `mdBold` global stub joins
  `escapeMarkdownCharacters` (module-slice evals); check-stats demotes the
  v13.233 pin to HISTORICAL and adds the v13.234 LIVE pin. SW stays v119.

**Gate battery:** `npm test` — **EXIT 0, 2,896 OK / 0 FAIL** (2,889
canonical + 6 badge checks + the new pin); `check-channel-mirror`
standalone **276/276**; `tsc --noEmit` clean; BOTH local smokes green —
unconfigured (routes 200, healthz `13.234-channelstyle` with the
documented local ok:false, zero telegram fetches) AND configured with the
REAL id (routes real, zero api.telegram.org fetches without an eligible
event — the disabled-contract proof with a live destination).

## 4) Deployment + verification

Fetch-first (remote unmoved at 3a52839) → `npx wrangler deploy` →
**Version ID `58970112-f4c6-4469-b28a-dca64f93f72e`**, both channel vars
live in the banner, both cron triggers intact.

| Check | Result |
|---|---|
| `GET /healthz` (production, minutes after) | `version 13.234-channelstyle`, `ok:true`, outbox 0, `degraded:false`, `sched_mode LIVE`, pool 482, feed ok |
| Timing | deployed ~19:40Z — ahead of the Atléti–Barça pre-match-24h window (20:00Z), so the SECOND channel post will be the first natural event under the new format |
| The first natural event under v13.234 | the Atléti–Barça 24h (~20:00Z): expected claim row #2 + the badge + labeled-block post on t.me/SportSignalz — see §6 |

## 5) The second deliverable: the enrichment audit + brainstorm

`docs/telegram-channel-mirror/ENRICHMENT.md` — the full audit (what fires,
what each post carries, the eligibility boundary, the MEASURED budget
reality: subrequests are the binding wall, then KV writes; D1 and Workers
AI have huge headroom) + the cost-ranked menu:

- **Tier 0 (zero backend cost)**: venue line on the 24h post (match.venue
  already in the pool), the round/matchday line (rides the existing
  /matches response, currently unmapped), standings-context line
  (KV-cache read only — «رئال دوم (۲۱ امتیاز)…»), hashtags for channel
  searchability.
- **Tier 1 (one bounded fetch, cached)**: H2H for big duels only; scorers
  on result posts — recommended ONLY inside the kickoff-drain invocation
  (its own subrequest budget), not on the result tick.
- **Tier 2 (Workers AI)**: a one-line grounded Persian prematch preview on
  the 24h post (the fa-ai.ts chat pattern already exists; 3s timeout,
  fail-open, no invented numbers); a weekly editorial line.
- **Tier 3 (Telegram-native)**: sendPoll on the 24h post (Telegram hosts
  the results; one send); a discussion group (owner-side).
- **Tier 4 (cadence/scope, taste)**: trim the channel to 24h + kickoff +
  result (3 posts/match — negative cost); the R9 follower-gate boundary
  documented as an owner decision, not a bug.
- **The no-list**: no live-event posts, no referee/broadcast data, no
  odds, no every-match coverage.

Recommended order: Tier 0's venue+round+standings as the next session,
then the poll, then the AI line behind a flag.

## 6) The 20:00Z event (filled after the window — see the verification below)

**VERIFIED**: the Atléti–Barça pre-match-24h fired at 20:00:35Z under
v13.234 (D1 claim row #2
`match:clubatleticodemadrid|barcelona|2026-11-08T20:00:pre-match-24h`,
state `sent`, attempts 1, zero errors) and is live on t.me/SportSignalz in
the NEW format, verbatim:

> ⏳ **۲۴ ساعت تا شروع بازی**
>
> 📅 یکشنبه ۱۷ آبان ۱۴۰۵
> ⏰ ۲۳:۳۰
> **اتلتیکو مادرید 🆚 بارسلونا**
> *لالیگا*
>
> ━━━━━━━━━━━━
> 🌐 سایت: https://sportsignal.ir
> 🤖 ربات: https://t.me/SportSignalAlertsBot
> نسخه آزمایشی.

The Tehran time (۲۳:۳۰ = 20:00Z + 3:30) and the Jalali date render
correctly; no rivalry banner (Atléti–Barça carries no code name in the
catalog — `specialBanner` correctly empty; a Real–Barça Clásico would add
«⚔️ ال کلاسیکو»). The owner-visible proof: the channel's second content
post, self-explanatory for the first time — the badge answers "how long
until kickoff" before the reader even sees the teams.

## 7) End-of-session report (spec PART VII §17)

```text
SESSION: 22 — the channel STYLE round (the owner's tidy-up ask + the enrichment audit)
STATUS: complete — v13.234-channelstyle deployed, verified live on the first natural event after deploy
SCOPE COMPLETED:
- The audit of the live channel (one content post at session start; the format flaws: no stage identity, the wordy promo CTA, the dull separator)
- channelStageHead (5 Persian countdown badges) + the labeled link block (heavy ━ rule + 🌐 سایت + 🤖 ربات), the engine hook recomposed, the dedup law + parity law untouched
- Harness co-evolution same-commit: 6 new badge checks (channel-mirror 270→276), separator/composition re-pins, CHANNEL_SEAM + channelStageHead, the mdBold stub, the check-stats v13.234 LIVE pin + the v13.233 demotion
- The gates: npm test 2,896 EXIT 0; channel-mirror 276/276; tsc clean; both local smokes (unconfigured + REAL id — zero telegram fetches)
- Deploy 58970112 (fetch-first); production healthz ok:true at 13.234-channelstyle
- The SECOND deliverable: docs/telegram-channel-mirror/ENRICHMENT.md (the audit + the cost-ranked menu, Tiers 0-4 + the no-list + the recommended order)
- The 20:00Z Atléti–Barça 24h verified live in the new format (§6)
FILES CHANGED:
- src/channel-mirror.ts (badges + separator), src/notify-engine.ts (the channel hook), src/config.ts + package.json + package-lock.json + CHANGELOG.md (the version three-way)
- scripts/check-channel-mirror.js (+6 checks, re-pins, seam, stub), scripts/check-stats.js (the v13.234 LIVE pin, v13.233 → HISTORICAL)
- docs/telegram-channel-mirror/ENRICHMENT.md (new), OWNER_TODO.md (the S22 bullet), this note
TESTS:
- npm test — EXIT 0, 2,896 OK / 0 FAIL
- node scripts/check-channel-mirror.js — 276/276
- npx tsc --noEmit — clean
- wrangler dev smokes — unconfigured + configured(REAL id): both green, zero telegram fetches
COMMIT:
- <SHA-in-the-final-reply> "feat: the channel presentation layer — stage badges + the labeled link block (v13.234-channelstyle) + the enrichment menu"
PUSH:
- origin main — one-shot token push, ls-remote verified
DEPLOYMENT:
- npx wrangler deploy → ucl-notifier Version ID 58970112-f4c6-4469-b28a-dca64f93f72e; both channel vars live; both cron triggers intact
POST-DEPLOY VERIFICATION:
- healthz: version 13.234-channelstyle, ok:true, outbox 0, degraded:false, sched_mode LIVE
- The Atléti–Barça 24h at 20:00Z: the badge + labeled-block post live on t.me/SportSignalz (the owner-visible proof), claim row state 'sent'
CHANNEL STATE:
- ACTIVE, styling live; the feed is now stage-self-explanatory with one consistent link block
OWNER ACTION REQUIRED:
- none required. Optional: pick items from the ENRICHMENT menu (recommended next: venue + round + standings-context lines on the 24h post — all Tier 0); the three S16 cosmetic confirmations remain open
RISKS / FOLLOW-UPS:
- The badge map is static — a future engine stage type needs its badge added or it posts badgeless (fail-open, not broken)
- ENRICHMENT Tier 1/2 items are DESIGNED but NOT wired; each needs its own session + harness
- Tomorrow's match night (Man Utd–Villa 16:30Z, Atléti–Barça 20:00Z) exercises 3h/1h/5min/kickoff/result under the new format — the monitor-only S22b watch
NEXT SESSION:
- S23 (owner's pick): the Tier-0 enrichment round (venue + matchday + standings-context) or the cadence-trim decision; monitor-only otherwise
```

## 8) The three-state verdict (PART V §15)

- **code-complete: YES** — the presentation layer shipped with 2,896
  checks green.
- **deployed-ENABLED: YES** — `58970112` (13.234-channelstyle, 100%), both
  vars live.
- **live-channel-verified: YES** — the Atléti–Barça pre-match-24h (the
  first natural event after the deploy) is live on t.me/SportSignalz in
  the new format (§6): the badge, the labeled block, the claim row `sent`.
  No test post was sent — the verification rides a real production event.
