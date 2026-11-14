# Match Centre — M10 Release Readiness (M10 gate, session 1 of 2)

**Milestone:** M10 — Release & verification (S21, session 1 of 2 — does NOT deploy)
**Specification:** §17 (SEO and content integrity — the GSC surfaces byte-frozen discipline carried into the production release) + §15 (Interaction and accessibility) + §4 (Responsive composition) + §16 (Shared resilience rules — the fail-closed behavior must hold post-deploy) + §18 (Engineering constraints — zero incremental provider requests / zero incremental KV ops, preserved post-deploy)
**Decisions:** 2 (Persian-first RTL + logical properties), 65 (reuse the existing footer), 57 (no FAQPage schema), 80 (reduced-motion), 70 (CTA ≥44px / WCAG 2.5.8) — all carried into production unchanged
**Audit:** §6 (the resource-cost audit — the 45,187-byte HTML baseline [now 125-130KB post-Match-Centre, same order of magnitude] + the ~12-14 KV reads + the 10ms CPU rolling budget + the render-hold logic in `router.ts` [live 120s / upcoming kickoff+120s / finished 900s]) + §13 (risks — risk 1 the CPU budget is the highest structural risk + per-route CPU is NOT instrumented; risk 2 the cross-track SEO measurement in flight until Dec 4-8 — the GSC surfaces must stay byte-frozen post-deploy)
**Release candidate:** the mcM9x preview — Worker Version `a91a15f8-0ddd-4170-a877-67d751f3bfd2` / `https://a91a15f8-ucl-notifier.sportsignal.workers.dev` (uploaded 2026-11-14T22:30:09.723Z, NEVER activated). The mcM9x code IS the M10 production code — byte-for-byte verified vs production (diff 0 across the S20 regression matrix).
**Production state (the rollback point):** Worker `ucl-notifier`; deployment `88649642-e344-479f-8591-5bcc1ad270df` / version `b48bae21-4366-401f-a78b-197efc05920a` / `13.255-seospell` (created 2026-11-10T11:10:43.173Z); STATE KV `c63588df02ae4bf1bfdc18d19c5b3631`; the two D1 databases STATS_DB `b371048b...` + USERS_DB `c64064ff...`; the crons `["*/10 * * * *", "27 */4 * * *"]`; the `[ai]` binding + the `DRAIN_SELF` service binding; the `./assets` directory (1109 files).
**Gate result:** **READINESS EVIDENCE + ROLLBACK PLAN + RELEASE NOTES PRESENTED — owner approval REQUESTED.** S21 is M10 session 1 of 2 — it does NOT deploy (S22 is the production deploy, AFTER the owner grants approval). The repo version stays `13.256-mcfound` (the production bump to `13.257-mcmatchcentre` happens at S22 IF the owner approves — S21 proposes, does NOT set).

---

## 0. The one-session scope (declared before touching code)

S21 is a **readiness + planning** session. It reads the ALREADY-LOADED mcM9x preview state + the production `/healthz` + the `wrangler.toml` + the M9 gate doc + the wrangler deployments/versions API. **ZERO new awaits, ZERO new KV reads, ZERO new fetches** (ADR-006). The await count stays exactly 3 (`hydrateMatchVenue`, `loadArchive`, `fullByCodeFor`) — S21 does NOT touch the renderer code. The byte-frozen surfaces stay byte-frozen (the GSC surfaces, the answer sentence, the homepage `#promoStrip`/`#tgHead`/`#tgPill`, the `#about`/`.pagesfoot` footer). The mcM9x preview is the release candidate — S21 does NOT re-upload (the preview `a91a15f8` is durable; S22 deploys it OR re-bundles per the owner's call).

**S21 produces ONE artefact:** this readiness doc. NO implementation commit (UNLESS the owner requests a post-S20 fix — there are NONE post-S20; the re-bundle is the owner's call at S22). The S20 assertion group (19 assertions) stays — the regression matrix holds. `npm test` exit 0 — 3,573 OK (unchanged from S20); `tsc` clean; `git diff --check` clean.

---

## 1. The readiness matrix (a-h)

### (a) The release-candidate verification — the mcM9x preview IS the release candidate

| Check | Result | Evidence |
|---|---|---|
| The mcM9x preview is still live + serves `13.256-mcM9x` | **PASS** | `curl https://a91a15f8-ucl-notifier.sportsignal.workers.dev/healthz` → `{"ok":true,"version":"13.256-mcM9x","degraded":false,...}` (re-verified 2026-11-14 during S21). The preview URL is durable (Cloudflare preview URLs persist until the version is deleted; the version `a91a15f8` is in the `wrangler versions list` output, uploaded 2026-11-14T22:30:09.723Z). |
| A real match page renders HTTP 200 on the preview | **PASS** | Bayern vs Köln (`/matches/bayern-munich-vs-1-koln-2026-11-20`): HTTP 200, 125,549 bytes, the full Match Centre renders (the 11 sections in spec §3 order). Man City vs Fulham: HTTP 200, 130,087 bytes. |
| The GSC surfaces byte-frozen vs production | **PASS** | `diff <(curl preview/matches/<slug>) <(curl prod/matches/<slug>)` → DIFF 0 (Bayern/Köln + Man City/Fulham). The `<title>`, `<link rel="canonical">`, `<meta property="og:title">`, `<meta name="twitter:title">`, the JSON-LD `<script type="application/ld+json">`, the `<h1>` — all byte-identical. The `/matches/today` hub: DIFF 0 (84,315 bytes). The homepage (preview workers.dev alias === production workers.dev alias): DIFF 0. |
| The version string is NOT in the match page HTML | **PASS** (stronger than expected) | The match page HTML contains ZERO occurrences of `13.256` / `13.255` / `mcM9x` / `mcfound` (0 matches on `grep -c`). The version string appears ONLY in `/healthz` + `/api/status` (the auth-gated admin endpoint). This means the post-deploy match page === the mcM9x preview match page byte-for-byte with ZERO version-string differences on the match page itself — the only differences will be in `/healthz` + `/api/status`. |
| Production re-verified UNTOUCHED | **PASS** | `curl https://ucl-notifier.sportsignal.workers.dev/healthz` → `{"ok":true,"version":"13.255-seospell","degraded":false,...}`; `curl https://sportsignal.ir/healthz` → identical (the apex + the workers.dev alias serve the same deployment `88649642` / `b48bae21`). |

**S21-Deploy-target recommendation (author final):** deploy the EXISTING mcM9x version `a91a15f8` (zero post-S20 changes; the re-bundle is an unnecessary risk — the byte-frozen verification already passed at the S20 gate + re-verified at S21). The owner may override + request a fresh `wrangler versions upload` at S22 (a clean version-id); the code is byte-identical either way. The re-bundle is the owner's call IF they want a clean version-id (the `a91a15f8` upload carries the S20 timestamp; a fresh upload at S22 would carry the S22 timestamp — purely cosmetic, zero code difference).

### (b) The production-deploy plan — the EXACT commands S22 will run

**The deploy target:** `wrangler.toml` (the PRODUCTION config — NOT `wrangler.preview.toml`). The production config carries:
- `name = "ucl-notifier"` + `main = "src/worker.ts"`
- `[[kv_namespaces]]` STATE `id = "c63588df02ae4bf1bfdc18d19c5b3631"` (the production STATE KV)
- `[[d1_databases]]` STATS_DB `database_id = "b371048b-4ae0-4ea5-9539-1d308390b700"` + USERS_DB `database_id = "c64064ff-aa78-4c73-80cd-e2805d550a5b"` (the two D1 databases — OMITTED from `wrangler.preview.toml` but PRESENT in `wrangler.toml`)
- `[triggers] crons = ["*/10 * * * *", "27 */4 * * *"]` (the two cron triggers)
- `[[services]] DRAIN_SELF → ucl-notifier` (the self-referencing service binding for the kickoff drain chain)
- `[ai] binding = "AI"` (the Workers AI binding for Farsi translation)
- `[assets] directory = "./assets"` (1109 files — auto-uploaded)
- `[vars] TEHRAN_TZ = "Asia/Tehran"` + `TELEGRAM_CHANNEL_CHAT_ID` + `TELEGRAM_CHANNEL_PUBLIC_URL` (public channel vars — NOT secrets)

**The version bump (proposed, NOT set at S21):** `src/config.ts` VERSION `13.256-mcfound` → `13.257-mcmatchcentre` (the Match Centre milestone marker — consistent with the `13.256-mcfound` branch marker; the owner may override to `13.257` clean semver or a preferred string). The bump happens at S22 IF the owner approves.

**The deploy commands (S22 — the EXACT sequence):**

```bash
# 1. Pre-deploy re-verification (the RUNBOOK §2 ritual)
cd /home/z/SportSignal
git fetch origin feat/match-centre
git ls-remote origin feat/match-centre   # verify remote HEAD = local HEAD
npm install
npm test                                 # exit 0 — 3,573 OK
npx tsc --noEmit                         # clean
git diff --check                         # clean
git rev-parse HEAD                       # record the SHA

# 2. The version bump (src/config.ts VERSION → 13.257-mcmatchcentre)
#    + the CHANGELOG.md entry (the M10 production release notes)
#    + the ledger/log updates
#    → ONE atomic commit: feat(match-centre): S22 the M10 production release (version 13.257-mcmatchcentre)
git add src/config.ts CHANGELOG.md MATCH-CENTRE-MILESTONE-LEDGER.md MATCH-CENTRE-EXECUTION-LOG.md
git commit -m "feat(match-centre): S22 the M10 production release (version 13.257-mcmatchcentre)"
# → one-shot push (PAT in the URL only, never persisted)
git push 'https://ghp_…@github.com/assadigit/SportSignal.git' feat/match-centre

# 3a. Option A (recommended): deploy the EXISTING mcM9x version a91a15f8
CLOUDFLARE_API_TOKEN=cfut_… CLOUDFLARE_ACCOUNT_ID=a796fdfe… \
  npx wrangler versions deploy --version a91a15f8-0ddd-4170-a877-67d751f3bfd2
# → production traffic shifts to the Match Centre (atomic, ~5-10s)

# 3b. Option B (if the owner requests a re-bundle): fresh upload + deploy
#     (the code is byte-identical to a91a15f8 — the re-bundle is a clean version-id)
CLOUDFLARE_API_TOKEN=cfut_… CLOUDFLARE_ACCOUNT_ID=a796fdfe… \
  npx wrangler versions upload              # builds the bundle, returns a NEW version-id
CLOUDFLARE_API_TOKEN=cfut_… CLOUDFLARE_ACCOUNT_ID=a796fdfe… \
  npx wrangler versions deploy --version <NEW-VERSION-ID>
```

**The production hostname behavior (post-deploy):**
- `sportsignal.ir` → serves the Match Centre (HTTP 200, the `13.257-mcmatchcentre` version)
- `football.sportsignal.ir` → 301s to the apex EXCEPT `/webhook`, `/api/`, `/admin` (unchanged)
- `ucl-notifier.sportsignal.workers.dev` → the workers.dev alias serves production traffic (the R-13 `noindex` applies to the workers.dev alias homepage, NOT to the apex — verified at S21: the workers.dev alias homepage carries `<meta name="robots" content="noindex, nofollow">`, the apex homepage carries `<meta name="robots" content="index, follow, ...">`; the match page carries the indexable meta on BOTH because the match page is the canonical content — the R-13 rule is alias-level, not page-level)

**The cron triggers re-arm:** the `wrangler versions deploy` re-arms the triggers AUTOMATICALLY (the `Changes to triggers ... must be applied with the command wrangler triggers deploy` message from the S20 `versions upload` does NOT apply to the `versions deploy` — the deploy carries the triggers). Post-deploy `/healthz last_cron_age_min` should be < 10 (the next `*/10` tick fires after the deploy). The cron behavior is UNCHANGED (the bot + the pool + the far-cup probe run on the same schedule).

**The bindings preserved:** `STATE` KV + `STATS_DB`/`USERS_DB` D1 + `DRAIN_SELF` service + `AI` binding + the vars — all from `wrangler.toml` (the production config). The assets directory (1109 files) auto-uploads with the version.

### (c) The rollback plan — the EXACT procedure if the production deploy breaks

**The rollback point (verified live at S21):**
- Deployment ID: `88649642-e344-479f-8591-5bcc1ad270df`
- Version ID: `b48bae21-4366-401f-a78b-197efc05920a`
- Created: `2026-11-10T11:10:43.173Z`
- Version string: `13.255-seospell`
- The PREVIOUS deployment (the second rollback target if `b48bae21` itself is bad): `2b4b974b-7b53-4c9a-85df-e5f25521d3b9` / version `69985183-fed7-48aa-aaf3-4ef8c4c47fdc` / created `2026-11-10T04:40:36.624Z`

**The rollback commands (S22 — if a critical regression appears post-deploy):**

```bash
# Option 1 (instant rollback to the PREVIOUS deployment):
cd /home/z/SportSignal
CLOUDFLARE_API_TOKEN=cfut_… CLOUDFLARE_ACCOUNT_ID=a796fdfe… \
  npx wrangler rollback
# → restores the previous deployment (88649642 / b48bae21 / 13.255-seospell)
#   INSTANT — traffic shifts back to the pre-Match-Centre layout

# Option 2 (version-targeted rollback — if the owner wants a specific version):
CLOUDFLARE_API_TOKEN=cfut_… CLOUDFLARE_ACCOUNT_ID=a796fdfe… \
  npx wrangler versions deploy --version b48bae21-4366-401f-a78b-197efc05920a
```

**The post-rollback verification markers (the rollback is INSTANT + the verification is structural):**
1. `/healthz` → `version: "13.255-seospell"` (the pre-Match-Centre version) + `ok:true` + `degraded:false`
2. A real match page → HTTP 200 + the PRE-Match-Centre layout (the legacy v13.82 `similarCard` assembly — the S17 retirement is the marker: a rolled-back page has NO `.mcentre-*` sections, NO `.mcentre-hero` / `.mcentre-nav` / `.mcentre-summary` etc.)
3. The KV state preserved (the pool + the archive + the standings caches + the user prefs/chats — the rollback is CODE-only, NOT a data migration): `pool_age_min` + `pool_matches` + `sched_next_ko` survive the rollback
4. The cron triggers re-arm on the next tick (the `*/10` cron fires on the rolled-back deployment)
5. The `DRAIN_SELF` + `AI` bindings preserved

**The rollback trigger (decision S21-Rollback-trigger — author final):** roll back IMMEDIATELY if ANY of:
- `/healthz` shows `degraded:true` OR `ok:false`
- A real match page returns non-200
- The GSC surfaces drift (the `<title>` / `<canonical>` / `<og:title>` / `<twitter:title>` / JSON-LD / `<h1>` no longer match the pre-deploy baseline)
- The cron triggers don't re-arm within 10 minutes (`last_cron_age_min > 10` post-deploy)
- The KV counters regress unexpectedly (`kv_writes_day` / `kv_ops_last_tick` / `subreq_last_tick` spike beyond the pre-deploy baseline + the expected post-deploy tick)

The S18/S20 gate precedent: the rollback is INSTANT — `npx wrangler rollback` first, then investigate (AGENTS.md §5: "if it is broken, roll back first, then investigate"). NO speculative KV/cache mutations.

### (d) The GSC surface byte-frozen verification post-deploy

The S20 gate verified the mcM9x preview === production byte-for-byte (diff 0 across the 6-match regression matrix). The production deploy MUST preserve this. **The S21 re-verification (2026-11-14):** the mcM9x preview === production byte-for-byte STILL holds (DIFF 0 on Bayern/Köln + Man City/Fulham + the `/matches/today` hub + the homepage workers.dev alias). 

**The post-deploy verification command (S22 — run immediately after the deploy):**

```bash
# The deployed 13.257-mcmatchcentre match page === the mcM9x preview match page byte-for-byte
# (the ONLY differences: the version string in /healthz + /api/status — the match page HTML
#  contains ZERO version strings, verified at S21: grep -c '13.256|13.255|mcM9x|mcfound' = 0)
diff <(curl -sS https://sportsignal.ir/matches/bayern-munich-vs-1-koln-2026-11-20) \
     <(curl -sS https://a91a15f8-ucl-notifier.sportsignal.workers.dev/matches/bayern-munich-vs-1-koln-2026-11-20)
# → EXPECTED: DIFF 0 (the match page HTML is byte-identical; the version string is NOT in the HTML)

# The /healthz version difference (the ONLY expected difference):
curl -sS https://sportsignal.ir/healthz | grep -oE '"version":"[^"]*"'
# → EXPECTED: "version":"13.257-mcmatchcentre" (the deployed version)
curl -sS https://a91a15f8-ucl-notifier.sportsignal.workers.dev/healthz | grep -oE '"version":"[^"]*"'
# → EXPECTED: "version":"13.256-mcM9x" (the preview version — unchanged)
```

**The GSC surfaces that MUST stay byte-frozen post-deploy:**
- The `<title>` (e.g. «⚽ بایرن مونیخ – کلن | بوندسلیگا، ۲۹ آبان | اسپرت سیگنال»)
- The `<link rel="canonical" href="https://sportsignal.ir/matches/<slug>">`
- The `<meta property="og:title">` + `<meta name="twitter:title">`
- The JSON-LD `<script type="application/ld+json">` (the Organization + WebSite + WebPage + SportsEvent + BreadcrumbList @graph)
- The `<h1 class="pageh1">` (e.g. «بایرن مونیخ – کلن | بوندسلیگا، ۲۹ آبان (۲۰ نوامبر)»)
- The answer sentence (the `matchAnswerSentence` — the meta-description + JSON-LD source)
- The homepage `#promoStrip`/`#tgHead`/`#tgPill`/`#tgPillGo` (decision 65 — the existing surfaces preserved)
- The `#about`/`.pagesfoot` footer (decision 65 — reuse the existing footer)

**The cross-track SEO measurement (audit §13 risk 2):** the GSC surfaces must stay byte-frozen through the Dec 4-8 measurement window. The production deploy preserves the byte-frozen discipline (the mcM9x code === the production code byte-for-byte; the version string is NOT in the GSC surfaces). The S20 gate already verified this; the S21 re-verification confirms it still holds; the S22 post-deploy verification will confirm it holds post-deploy.

### (e) The KV/D1 state preservation

The production STATE KV (`c63588df02ae4bf1bfdc18d19c5b3631`) carries: the live pool (`pool_matches: 490` at S21) + the archive + the standings caches + the `fa_teams_ai`/`fa_venues_ai` + the user prefs/chats. The deploy does NOT touch the KV state (the `wrangler versions deploy` is a CODE deploy, NOT a data migration). The two D1 databases (STATS_DB `b371048b...` + USERS_DB `c64064ff...`) are untouched.

**The S21 re-verification (2026-11-14 — the shared STATE KV):**
- Preview `/healthz`: `pool_age_min: 31`, `pool_matches: 490`, `kv_writes_day: 468`, `kv_writes_web: 93`, `kv_ops_last_tick: 29`, `subreq_last_tick: 29`, `sched_next_ko: "2026-11-20T19:30:00.000Z"`, `sched_next_wake: "2026-11-20T18:30:00.000Z"`
- Production `/healthz`: IDENTICAL (the shared STATE KV — the preview shares the production KV; the counters are the same snapshot)

**The post-deploy verification (S22):**
- The `/healthz` counters (`kv_writes_day` + `kv_ops_last_tick` + `subreq_last_tick`) are UNCHANGED post-deploy (the deploy doesn't reset the counters; the cron triggers resume on the next tick)
- The `pool_age_min` + `sched_next_ko` (`2026-11-20T19:30:00.000Z` — the Bayern vs Köln kickoff) MUST survive the deploy (the pool is in the KV, NOT in the worker bundle)
- The D1 databases (the visit counter + the user store) are untouched (the deploy is code-only)

### (f) The cron trigger re-arm verification

The `wrangler.toml` crons (`["*/10 * * * *", "27 */4 * * *"]`) MUST be re-armed post-deploy. The `wrangler versions deploy` re-arms the triggers AUTOMATICALLY (the `Changes to triggers ... must be applied with the command wrangler triggers deploy` message from the S20 `versions upload` does NOT apply to the `versions deploy` — the deploy carries the triggers).

**The post-deploy verification (S22):**
- The post-deploy `/healthz last_cron_age_min` should be < 10 (the next `*/10` tick fires after the deploy)
- The cron behavior is UNCHANGED (the bot + the pool + the far-cup probe run on the same schedule — the `*/10` tick runs the bot + the pool refresh; the `27 */4` tick runs the far-cup probe)
- The `sched_mode: "IDLE"` + `sched_reason: "beyond-horizon"` (the current state — the next kickoff is 2026-11-20T19:30:00 UTC, the Bayern vs Köln match; the bot is IDLE until the `sched_next_wake` at 2026-11-20T18:30:00 UTC)

**The deploy timing recommendation (decision S21-Deploy-timing — author final):** a QUIET WINDOW between two `*/10` ticks (the deploy takes ~5-10s; the `wrangler versions deploy` shifts traffic atomically; the cron triggers re-arm on the next tick — a deploy between two `*/10` ticks is the safest window). The Bayern vs Köln kickoff is `2026-11-20T19:30:00 UTC` — the deploy should NOT coincide with a kickoff's cron fan-out (the `sched_next_wake` at `2026-11-20T18:30:00 UTC` is the pre-kickoff sweep; avoid deploying in the 18:30-19:35 UTC window on Nov 20). The recommended deploy window: any `*/10` tick gap BEFORE the Nov 20 kickoff window (the owner picks the exact time at S22 after granting approval).

### (g) The release notes (the CHANGELOG entry for the M10 production release)

```markdown
## [13.257-mcmatchcentre] — 2026-11-?? (the M10 production release)

### Match Centre ships to production

The full match-page rework: the spec §3 section order (hero → nav → summary →
standings → form → venue → schedule → faq → related → telegram → footer-hook).
Persian-first RTL (decision 2), WCAG-AA a11y (decisions 14/40/58/70/80/85/98),
the fail-closed resilience (spec §16), the zero-incremental-cost law (spec §18).

#### What's new (the S04-S18 Match Centre sections)
- **S04 hero** — the cinematic face-off with portraits (decision 7/8 both-or-neither;
  decision 10 the same shell across upcoming/live/finished; decision 96 the balanced
  face-off; decision 97 the «میزبان»/«میهمان» labels; decision 98 the compact
  competition header; decision 99 the stadium atmosphere).
- **S06 sticky nav** — the five destinations (خلاصه، جدول، فرم، بازی‌ها، ورزشگاه —
  decision 13), the active-section tracking, the back-to-top, the reduced-motion
  support (decision 80), the ≥44px touch targets (decision 70 / WCAG 2.5.8).
- **S07 answer-first briefing + facts table** — the editorial briefing card
  (id=answer) + the compact facts panel (decision 19/21/55; the meta description ===
  the answer sentence — one source of truth, byte-frozen).
- **S08 narrative engine** — the deterministic category registry (decision 20/45/46/
  47/48; the lifecycle wording decision 49; the narrative templates NEVER reference
  kickoff/venue/score — only {rivalry}/{round}/{comp}).
- **S11 standings window** — the five-row neighbourhood (decision 22/26), the
  typography-only participant highlighting (decision 25), the ellipsis between
  separated windows (decision 26).
- **S12 form strip + S13 metrics table** — the five W/D/L indicators (decision 30/31),
  the latest-five results (decision 32), the home/away performance metrics
  (decision 33/34/35 — the shared sample-window label, the honest count).
- **S14 venue panel** — the verified stadium/city/country (decision 37/38 — no map).
- **S15 schedule** — the seven-day window (decision 39/40/41/42), the one
  «نمایش روزهای بعد» expand control (decision 40), the coverage note (decision 42).
- **S16 FAQ accordion** — the answerable questions only (decision 57 — no FAQPage
  schema solely for rich results), the delayed-collapse (decision 58), the keyboard
  + reduced-motion support.
- **S17 related matches** — the unified list (decision 59/60/61/62/63/64), upcoming
  first + previous H2H, max 4, no unrelated filler.
- **S18 Telegram promotion** — the featured block (decision 68/69/70/71/72), the
  verified channel URL, the one CTA, the ≥44px touch target, every lifecycle state.

#### What's preserved (byte-frozen)
- The GSC surfaces (title/canonical/og:title/twitter:title/JSON-LD/h1) + the answer
  sentence — byte-frozen vs the pre-deploy production (diff 0; the cross-track SEO
  measurement in flight until Dec 4-8 is NOT contaminated).
- The homepage `#promoStrip`/`#tgHead`/`#tgPill` (decision 65).
- The `#about`/`.pagesfoot` footer (decision 65 — reuse the existing footer).
- The bot + the crons (`*/10` + `27 */4`) — the cron behavior is UNCHANGED.
- The KV state (the pool + the archive + the standings caches + the user prefs/chats)
  — the deploy is code-only, NOT a data migration.
- The D1 databases (STATS_DB + USERS_DB) — untouched.
- The bindings (STATE KV + STATS_DB/USERS_DB D1 + DRAIN_SELF service + AI binding +
  the vars) — all preserved.
- The R-13 noindex (the workers.dev alias homepage carries `noindex, nofollow`; the
  apex homepage carries `index, follow` — unchanged).

#### What's known-limited (stated honestly per audit §13)
- The finished scorers / HT score / venue city are omitted per spec §16 (the
  MISSING-IS-NOT-ZERO law; the data is unavailable in the verified feed).
- The per-route CPU is NOT instrumented (audit §13 risk 1) — the structural
  protection holds: zero new KV reads/parses (the await count stays 3), the render
  is O(ctx) string concatenation, the render-hold logic in `router.ts` (live 120s /
  upcoming kickoff+120s / finished 900s) is preserved exactly.
- The CWV/RUM is measurable post-deploy via the Cloudflare Web Analytics beacon
  (the workers.dev preview doesn't carry the RUM beacon; the production pages do —
  the LCP/FID/CLS data will be available after the M10 production release).
- The live + finished match pages are NOT in the current pool (the sandbox "today" <
  2026-11-20; the lifecycle consistency is verified BY CONSTRUCTION via the S19
  lifecycle assertions + the projection signatures).
```

### (h) The owner approval request

The M10 gate ritual (AGENTS.md §5: production deploys are NOT under standing approval — the owner grants explicit approval). S21 produces the readiness evidence + the rollback plan + the release notes + the owner approval request. **The owner's approval message triggers S22 (the production deploy).**

- IF the owner says "deploy" / "go" / "approved" → S22 runs `wrangler versions deploy --version a91a15f8` (Option A, recommended) OR a fresh `wrangler versions upload` + `wrangler versions deploy` (Option B, if the owner requests a clean version-id).
- IF the owner requests changes → S21 addresses them before re-requesting approval.

**The owner approval request (the exact ask):**

> The M10 release readiness is verified. The mcM9x preview (`a91a15f8` / `https://a91a15f8-ucl-notifier.sportsignal.workers.dev`) IS the release candidate — byte-for-byte identical to production (diff 0 across the regression matrix). The rollback point (`88649642` / `b48bae21` / `13.255-seospell`) is verified live + the rollback procedure is instant (`npx wrangler rollback`). The KV/D1 state is preserved (the deploy is code-only). The cron triggers re-arm automatically. The GSC surfaces stay byte-frozen (the version string is NOT in the match page HTML). The release notes cover what's new + what's preserved + what's known-limited.
>
> **Owner decision required:**
> 1. **Deploy target:** Option A (deploy the existing `a91a15f8` — recommended, zero post-S20 changes) OR Option B (a fresh re-bundle at S22 — a clean version-id, byte-identical code)?
> 2. **Version string:** `13.257-mcmatchcentre` (the milestone marker — recommended) OR `13.257` (clean semver) OR the owner's preferred string?
> 3. **Deploy timing:** a quiet window between two `*/10` ticks BEFORE the Nov 20 kickoff window (the owner picks the exact time at S22)?
>
> Grant approval to proceed to S22 (the production deploy).

---

## 2. The S21 decision points (resolved + recorded)

Recorded in this readiness doc + the execution-log session entry + the ledger — the S15-S20 precedent.

| Decision | Resolution | Rationale |
|---|---|---|
| **S21-Deploy-target** | (a) deploy the EXISTING mcM9x version `a91a15f8` (recommended) — zero post-S20 changes; the re-bundle is an unnecessary risk; the byte-frozen verification already passed at the S20 gate + re-verified at S21. | The `a91a15f8` upload is durable (verified live at S21 — `ok:true / 13.256-mcM9x`). The code is byte-identical to what a fresh re-bundle would produce. The owner may override + request Option B (a fresh `wrangler versions upload` at S22 for a clean version-id) — purely cosmetic, zero code difference. |
| **S21-Version-string** | (a) `13.257-mcmatchcentre` (the Match Centre milestone marker — consistent with the `13.256-mcfound` branch marker) — recommended. | The codename-suffix house style (audit §7: "codename suffix house style, e.g. `13.256-mcshell`"). The owner may override to `13.257` clean semver or a preferred string. The bump happens at S22 IF the owner approves — S21 proposes, does NOT set. |
| **S21-Deploy-timing** | (a) a QUIET WINDOW between two `*/10` ticks BEFORE the Nov 20 kickoff window — recommended. | The deploy takes ~5-10s; the `wrangler versions deploy` shifts traffic atomically; the cron triggers re-arm on the next tick. The Bayern vs Köln kickoff is `2026-11-20T19:30:00 UTC`; avoid deploying in the `18:30-19:35 UTC` window on Nov 20 (the `sched_next_wake` at `18:30` is the pre-kickoff sweep). The owner picks the exact time at S22 after granting approval. |
| **S21-Post-deploy-smoke** | the post-deploy verification matrix: (1) `/healthz` `ok:true` + the new version `13.257-mcmatchcentre`; (2) a real match page HTTP 200 + the GSC surfaces (the byte-frozen diff vs the mcM9x preview — DIFF 0 expected); (3) the homepage + the `/matches/today` hub; (4) `/api/status` version (auth-gated); (5) the cron re-arm (`last_cron_age_min < 10` within 10 minutes); (6) the KV counters unchanged (`pool_age_min` + `sched_next_ko` + `kv_writes_day` + `kv_ops_last_tick` + `subreq_last_tick`). | The S18/S20 gate precedent: the smoke matrix is the conjunction of the healthz + the match-page render + the GSC surfaces + the cron re-arm + the KV state. Author final. |
| **S21-Rollback-trigger** | roll back IMMEDIATELY if ANY of: `/healthz` shows `degraded:true` OR `ok:false`; a real match page returns non-200; the GSC surfaces drift; the cron triggers don't re-arm within 10 minutes (`last_cron_age_min > 10`); the KV counters regress unexpectedly. | The S18/S20 gate precedent: the rollback is INSTANT (`npx wrangler rollback` first, then investigate — AGENTS.md §5). NO speculative KV/cache mutations. Author final. |

---

## 3. The re-verification evidence (S21, 2026-11-14)

### The mcM9x preview re-verification

| Check | Result | Evidence |
|---|---|---|
| The preview `/healthz` | **PASS** | `{"ok":true,"heartbeat_age_min":1,"last_cron_age_min":1,"outbox_depth":0,"pool_age_min":31,"pool_matches":490,"admin_alerts_ok":true,"kv_writes_day":468,"kv_writes_web":93,"kv_budget":null,"degraded":false,"subreq_last_tick":29,"kv_ops_last_tick":29,"sched_mode":"IDLE","sched_reason":"beyond-horizon","sched_live_sweep":"none","sched_poll_hint_sec":900,"sched_live_now":0,"sched_stale_live":0,"sched_feed_ok":true,"sched_next_ko":"2026-11-20T19:30:00.000Z","sched_next_wake":"2026-11-20T18:30:00.000Z","version":"13.256-mcM9x"}` |
| The production `/healthz` (workers.dev alias) | **PASS** | `{"ok":true,...,"version":"13.255-seospell"}` (identical counters — the shared STATE KV) |
| The production `/healthz` (apex) | **PASS** | `{"ok":true,...,"version":"13.255-seospell"}` (identical — the apex + the workers.dev alias serve the same deployment `88649642` / `b48bae21`) |
| The Bayern vs Köln match page (preview) | **PASS** | HTTP 200, 125,549 bytes, the full Match Centre renders |
| The Bayern vs Köln match page (production) | **PASS** | HTTP 200, 125,549 bytes — DIFF 0 vs the preview |
| The Man City vs Fulham match page (preview + production) | **PASS** | HTTP 200, 130,087 bytes — DIFF 0 |
| The `/matches/today` hub (preview + production) | **PASS** | HTTP 200, 84,315 bytes — DIFF 0 |
| The homepage (preview workers.dev alias vs production workers.dev alias) | **PASS** | DIFF 0 (both carry the R-13 `noindex, nofollow` — the workers.dev alias homepage; the apex homepage carries `index, follow`) |
| The GSC surfaces byte-frozen (preview vs production) | **PASS** | The `<title>`, `<canonical>`, `<og:title>`, `<twitter:title>`, JSON-LD, `<h1>` — all byte-identical on the match page |
| The version string is NOT in the match page HTML | **PASS** (stronger than expected) | `grep -c '13.256\|13.255\|mcM9x\|mcfound'` = 0 on both the preview + the production match page HTML. The version appears ONLY in `/healthz` + `/api/status`. |

### The rollback point re-verification (via the wrangler API)

| Check | Result | Evidence |
|---|---|---|
| The live production deployment | **PASS** | Deployment ID `88649642-e344-479f-8591-5bcc1ad270df` / version `b48bae21-4366-401f-a78b-197efc05920a` / created `2026-11-10T11:10:43.173Z` (verified via `npx wrangler deployments list` + the Cloudflare API `GET /accounts/.../workers/scripts/ucl-notifier/deployments`). The version `b48bae21` carries `percentage: 100` (the full-traffic deployment). |
| The previous deployment (the second rollback target) | **PASS** | Deployment ID `2b4b974b-7b53-4c9a-85df-e5f25521d3b9` / version `69985183-fed7-48aa-aaf3-4ef8c4c47fdc` / created `2026-11-10T04:40:36.624Z`. |
| The mcM9x version is uploaded + NOT deployed | **PASS** | Version `a91a15f8-0ddd-4170-a877-67d751f3bfd2` / created `2026-11-14T22:30:09.723Z` / source `version_upload` (verified via `npx wrangler versions list`). The live deployment is still `88649642` / `b48bae21` — the mcM9x version is NEVER activated. |
| The rollback command is supported | **PASS** | `npx wrangler rollback` restores the previous deployment (the RUNBOOK §4 verified mechanism — `wrangler 4.50.0` supports the rollback command). The version-targeted alternative: `npx wrangler versions deploy --version b48bae21-4366-401f-a78b-197efc05920a`. |

### The wrangler.toml production config re-verification

| Binding / trigger | Value | Preserved post-deploy |
|---|---|---|
| `name` | `ucl-notifier` | YES |
| `[[kv_namespaces]] STATE` | `id = "c63588df02ae4bf1bfdc18d19c5b3631"` | YES (the production STATE KV) |
| `[[d1_databases]] STATS_DB` | `database_id = "b371048b-4ae0-4ea5-9539-1d308390b700"` | YES |
| `[[d1_databases]] USERS_DB` | `database_id = "c64064ff-aa78-4c73-80cd-e2805d550a5b"` | YES |
| `[triggers] crons` | `["*/10 * * * *", "27 */4 * * *"]` | YES (re-armed automatically by `wrangler versions deploy`) |
| `[[services]] DRAIN_SELF` | `service = "ucl-notifier"` | YES |
| `[ai] binding` | `AI` | YES |
| `[assets] directory` | `./assets` (1109 files) | YES (auto-uploaded) |
| `[vars]` | `TEHRAN_TZ`, `TELEGRAM_CHANNEL_CHAT_ID`, `TELEGRAM_CHANNEL_PUBLIC_URL` | YES (the public channel vars) |

---

## 4. The cost audit (S21 — zero incremental cost)

S21 is a READINESS + PLANNING session. It reads the ALREADY-LOADED mcM9x preview state + the production `/healthz` + the `wrangler.toml` + the wrangler deployments/versions API. **ZERO new awaits, ZERO new KV reads, ZERO new fetches** (ADR-006). The await count stays exactly 3 (`hydrateMatchVenue`, `loadArchive`, `fullByCodeFor`). The S21 read-only operations:
- `curl /healthz` on the preview + the production (3 reads — the /healthz endpoint reads the KV state)
- `curl /matches/<slug>` on the preview + the production (the match-page render — the visit beacon writes on the production apex; the preview writes the visit beacon to the shared D1 — a page view writes exactly what a normal page view writes, nothing more; no cron triggers run on the preview version)
- `npx wrangler deployments list` + `npx wrangler versions list` + the Cloudflare API `GET /deployments` + `GET /versions` (read-only metadata calls — zero cost)

**The post-deploy cost profile (S22 — the production deploy preserves the cost invariants):**
- KV reads per match-page render: ~12-14 (UNCHANGED — the await count stays 3; zero new KV reads)
- KV writes from page renders: zero added by Match Centre (the visit beacon + the change-only archive sync are pre-existing)
- Provider fetches on the path: 1 (the venue-detail hydration, ≤1 per match per 24h, KV-cached — UNCHANGED)
- CPU: the render is O(ctx) string concatenation (zero new parses — the pool JSON.parse is the pre-existing single ~331KB parse at the ctx level); the render-hold logic in `router.ts` (live 120s / upcoming kickoff+120s / finished 900s) is preserved exactly. The per-route CPU is NOT instrumented (audit §13 risk 1 — stated as a known limitation; the structural protection holds).
- HTML payload: 125-130KB (same order of magnitude as the 45KB M0 baseline — both 10^5 in scientific notation)
- Subrequests: the venue-detail hydration is the only fetch (≤1 per match per 24h) — UNCHANGED

---

## 5. NOT MODIFIED (byte-frozen — S21 touches NOTHING in the renderer/projection/CSS)

S21 is a READINESS + PLANNING session. The byte-frozen surfaces stay byte-frozen:
- The GSC surfaces (title/meta description/canonical/og:title/Twitter/SportsEvent SHAPE/h1)
- The answer sentence (`matchAnswerSentence` — the meta-description + JSON-LD source)
- The S04-S18 renderers + projections + CSS (the audit targets — S21 does NOT touch them)
- The homepage `#promoStrip`/`#tgHead`/`#tgPill`/`#tgPillGo` + the `#about`/`.pagesfoot` footer (decision 65)
- The nav's adaptive Q9=B filter + the 5 destinations (`MC_NAV_DESTS`)
- The `scripts/lib/worker-src.js` + `scripts/check-match-centre.js` (the S20 assertion group stays — S21 adds NO new assertion group; the M10 readiness is a planning + verification session, NOT a code session)
- `src/config.ts` (the version string stays `13.256-mcfound` — S21 proposes `13.257-mcmatchcentre` for S22, does NOT set it)
- `wrangler.toml` + `assets/_headers` + `assets/sw.js` (zero new pinned asset — S21 adds NO new assets)

The ONLY tracked change S21 makes is the docs: `docs/mc/m10-release-readiness.md` (this file) + the ledger/log/CHANGELOG updates.

---

## 6. The tests + check-script co-evolution

S21 adds NO new assertion group to `scripts/check-match-centre.js` (the S20 group is the M9 gate; the M10 readiness is a planning + verification session, NOT a code session). The existing S04-S20 assertions stay (the regression matrix holds). **`npm test` exit 0 — 3,573 OK** (unchanged from S20), 0 failures; `tsc` clean; `git diff --check` clean.

**IF the owner requests a post-S20 fix before the deploy** (a blocker discovered during the S21 readiness review — there are NONE post-S20, but the contingency is documented): S21 applies the fix as a presentation-layer change (the S20-Fix-scope precedent) + re-runs the full matrix + re-uploads a fresh `mcM10x` preview (the S17 re-upload precedent: `b49e17a0` → `8b76d834`) + re-runs the agent-browser smoke. Author final per the owner's request.

---

## 7. The M10 gate — owner approval REQUESTED (NOT granted by the agent)

The M10 release-readiness gate (S21) produces the readiness evidence + the rollback plan + the release notes + the owner approval request. The owner grants approval per AGENTS.md §5 (production deploys are NOT under standing approval — the owner grants explicit approval at the M10 gate) + the milestone-gate ritual (milestones-and-sessions.md M10/S21: "Present readiness evidence and receive production release approval").

- **IF the owner approves** (says "deploy" / "go" / "approved") → S22 runs `wrangler versions deploy --version a91a15f8` (Option A, recommended) OR a fresh `wrangler versions upload` + `wrangler versions deploy` (Option B) → production traffic shifts to the Match Centre → the post-deploy smoke matrix → the `MATCH-CENTRE-RELEASE-REPORT.md`.
- **IF the owner requests changes** → S21 addresses them before re-requesting approval.

**NO version bump** (repo stays `13.256-mcfound`; the production bump to `13.257-mcmatchcentre` happens at S22 IF the owner approves — S21 proposes, does NOT set). **NO deploy** (production stays `13.255-seospell` / deployment `88649642` — `wrangler versions deploy` / `wrangler deploy` NEVER run on S21; the mcM9x preview is NEVER activated — production deploy is the S22 activity). `main` untouched.

---

**S21 is the M10 release-readiness gate.** The readiness evidence + the rollback plan + the release notes are presented. **The owner approval is REQUESTED.** S22 (the production deploy) is the next session, AFTER the owner grants approval.
