# @SportSignalz — the channel audit + enrichment brainstorm (the S22 companion)

**2026-11-07, session 22.** Written alongside `v13.234-channelstyle` as the
answer to the owner's ask: *"audit and brainstorm how we can make the
channel better and more rich information without overwhelming our
backend."* This document is the menu; every item carries its true backend
cost so the owner can pick by taste. Nothing here is wired yet unless
marked SHIPPED.

---

## 1. The audit — what the channel is today

### 1.1 What fires (the event inventory, all mirrored since S18–S21)

| Family | Events per match/day | Post shape today (post-v13.234) |
|---|---|---|
| Engine countdowns | up to 6: 72h / 24h / 3h / 1h / 5min / kickoff | badge → (rivalry banner) → 📅 date, ⏰ time, **teams 🆚**, *competition* — kickoff adds 🏟 venue |
| Engine result | 1 | «🏁 نتیجه نهایی» headline → teams → venue → date → score → winner → (league table snapshot when cached) |
| `-big` broadcasts | collapse into the same kickoff/result posts (the §7.3 stage collapse — never a duplicate) | same as above |
| Status alerts | postponed / cancelled / half-time, per match | short alert posts |
| Morning digest | 1/day (Tehran morning, if big matches exist) | «بازی‌های بزرگ امروز» + fixture list |
| UCL night preview | 1/CL-night (≥6h before first kickoff) | fixture list + the UCL GIF banner |
| Night digest | 1/valuable night (UCL ∨ elimination) | results + eliminations of the night |
| Weekly tables | 1/ISO week (Monday) | stickers + league tables + week-ahead |
| Coronation | per league leadership change | the new-leader post |

Media already riding: match cards (crests) on engine paths, the ⚽ dice on
kickoff, the UCL GIF on CL nights, league stickers in the weekly burst.

### 1.2 The eligibility boundary (what the channel will NEVER show)

The channel mirrors the bot's strict tier (`shouldNotify` + the
follower-audience gate, DISCOVERY R9): desired-team big matches, true big
duels, UCL-participant exceptions. No league-wide coverage, no mid-table
fixtures. This is a feature — scarcity is the feed's quality moat — but it
means channel content tracks today's subscriber base (§3m).

### 1.3 The backend budget reality (measured, not guessed — DISCOVERY §8 + the S19 re-measure)

- **Subrequests**: 46–48 per 10-min tick ceiling; a channel event costs
  +1–2 (send ± fallback), the fan-out reservation accounts for it
  (`fanoutFetchCost` +2). UCL nights brush the cap — that is the wall that
  matters.
- **KV**: ~600 writes/day today against the 1,000/day discipline. The
  channel steady-state adds **0** (claims are D1; KV only on transient
  outbox pushes + one-time pause markers).
- **D1**: a handful of rows/day (claim + state per event) against 100k/day.
  Effectively free.
- **Workers AI**: already used for fa translations (`fa-ai.ts`, KV-cached
  results — the calls are one-time per name, not per post).

**Conclusion: the binding constraint is SUBREQUESTS on event-dense nights,
then KV writes. D1 and Workers AI have enormous headroom.** Every idea
below is scored against that.

---

## 2. Shipped this round (v13.234-channelstyle) — for the record

1. **Stage badges**: every countdown post opens with «⏳ ۲۴ ساعت تا شروع
   بازی» (bold) — a feed reader can finally tell the stages apart.
2. **The labeled link block**: `━━━━━━━━━━━━` + «🌐 سایت: …» + «🤖 ربات: …»
   — every link with its own emoji, one consistent block across every
   family, replacing the wordy private promo CTA on channel copies.
3. Zero new state/fetches/writes; private messages byte-identical.

---

## 3. The enrichment menu (cost-ranked)

### Tier 0 — zero backend cost (data already in the pool or a cache read)

**a. Venue on the 24h post** 🏟 — `match.venue` already rides the pool
(kickoff/result posts show it; `translateVenue` has an AI-learned cache).
Add the venue line to the countdown channel copy. *Cost: literally zero —
a composition change.* Highest value-per-byte on the list.

**b. The round/matchday line** — football-data's `/v4/matches` response
carries `matchday`; the pool mapping currently drops it. Map it through
(marking the raw response, no new fetch) and render «هفته ۱۱ لیگ برتر»
under the competition line. *Cost: zero fetches; a one-line provider
mapping + composer branch.* Also improves the website card surface.

**c. Hashtags for channel searchability** — «#لیگ_قهرمانان_اروپا
#الکلاسیکو» under the match line. Telegram channels are searched by
hashtag; this turns the feed into a browsable archive. *Cost: zero — pure
formatting, static per competition + rivalry.*

**d. Standings context line on the 24h post** — «رئال دوم (۲۱ امتیاز) 🆚
بارسا چهارم (۱۷ امتیاز)». `fetchStandings(env, code, allowFetch=false)`
is a pure KV read of the 6h-fresh standings cache the result path already
maintains. *Cost: +1 KV read per 24h post; ZERO fetches in the common
case. Fail-open: cold cache → line simply omitted.* This single line is
the biggest "rich information" win per unit of risk.

### Tier 1 — one bounded fetch, KV-cached (still cheap, needs care)

**e. Head-to-head / recent form line** — football-data has an H2H endpoint;
we have no H2H code today. One fetch per big match (on the 24h post only —
once per match), cached in KV with a long TTL (H2H barely changes
intra-week). *Cost: +1 fetch + 1 KV write per ELIGIBLE match (a few/day),
only on the 24h stage.* Must ride the provider-breaker + fail-open
discipline. Worth it only for derbies/big duels — gate it on
`isTrueBigDuel || rivalryName`.

**f. Result posts with goalscorers** — the scorers are NOT in the `/matches`
list response; they need a per-match fetch at result time, ON THE RESULT
NIGHT when the subrequest wall is closest. *Cost: +1 fetch per result,
at the worst possible moment.* Recommendation: defer unless we move it
into the kickoff-drain invocation (its own fresh budget) — then it
becomes safe. Good candidate but NOT first.

### Tier 2 — Workers AI (separate budget, the largest headroom)

**g. One-line AI prematch preview** — «⚔️ پیش‌بازی: چلسی با سه برد پیاپی
به خانه‌ی تاتنهام می‌رود…» on the 24h post, generated by the SAME
`env.AI.run` chat pattern fa-ai.ts already uses, **grounded** in pool data
(form from standings, the rivalry name, venue) with a strict one-sentence
format prompt and a Persian quality gate (reject non-Farsi output).
*Cost: 1 AI call per 24h post — single digits/day on the strict tier,
zero subrequests (Workers AI binding ≠ external fetch), KV-cacheable per
match.* Risks: latency (bound it — compose with a 3s timeout, fail-open to
no line) and hallucination (mitigate by grounding; never let the AI
invent numbers — feed it the numbers and ask for prose only).

**h. AI match-of-the-week editorial** in the weekly digest — same pattern,
1 call/week. Gives the Monday burst a human voice.

### Tier 3 — Telegram-native engagement (near-zero backend)

**i. Polls on the 24h post** — `sendPoll` («چه تیمی برنده می‌شود؟ 🔵 🔴»).
Telegram hosts the results; the bot only sends. *Cost: +1 subrequest per
poll (same as one message).* The single cheapest engagement feature that
exists; makes followers return to the post. Channel-only (never private).

**j. Discussion group** — link a group to the channel (owner-side Telegram
setting, zero code) for match-night chatter.

**k. The trial footer** («نسخه آزمایشی.») — still riding every message
(DISCOVERY §12 open confirmation). When the owner is ready to drop it,
it is one CONFIG change.

### Tier 4 — cadence and scope (owner taste, zero cost, changes what the feed IS)

**l. Channel-specific cadence trim** — today a followed big match can post
up to 7 times (72h→result). The bot needs 1h/5min (people set alarms by
them); a CHANNEL arguably doesn't. Trimming the channel to
24h + kickoff + result (3 posts/match) makes each post feel like an event,
not a drip. *Cost: negative — removes sends.* Implementation: a channel
hook gate on config.type (a few lines in the engine hook).

**m. The follower-gate (R9) boundary** — channel eligibility = bot
audience. If the owner wants BL1/Ligue 1 fixtures on the channel even with
zero bot followers there, that is a channel-tier eligibility list (a small
config list + the same strict-tier filter). Owner decision, documented
here; not a bug.

---

## 4. What NOT to add (the overload traps)

- **Live event posts** (per-goal, red cards): needs a live-score provider
  (new dependency, new budget class) and would spam the feed — the night
  digest + result posts already cover resolution.
- **Referee / broadcast info**: not in football-data's match resource; a
  scraping surface for volatile data. No.
- **Odds**: no provider, regulatory gray zone for a Persian channel. No.
- **Every-match coverage**: the strict tier is the moat (§1.2). Rich ≠
  frequent.

---

## 5. Recommended order (the owner can reorder by taste)

1. ✅ badges + the labeled link block (SHIPPED, v13.234)
2. **a + b + d** — venue, round, standings-context lines on the 24h post
   (one small session, all Tier 0, transforms the flagship post)
3. **i** — the 24h poll (one sendPoll call + a taste check)
4. **c** — hashtags (with 2, or any time — trivial)
5. **l** — the cadence trim decision (taste call; reversible config)
6. **g** — the AI one-liner, behind a config flag, fail-open, capped
7. **e/f/h** — H2H, scorers-in-drain, weekly editorial (only if 2–6 land
   well and the owner wants more)
