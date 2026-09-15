# NEXT SESSION — SportSignal × X (Twitter) Automated Profile

> **⚠️ HISTORICAL (2026-09-13, pre-v13.0):** this handoff describes the OLD
> single-file architecture (~4,900-line `src/worker.ts`). The codebase is now
> 21 ES modules + extracted client assets (v13.6) — see `README.md` for the
> current module map and `CHANGELOG.md` § 13.x. The X integration itself
> SHIPPED in v12.33 (`src/x.ts`) — the background/ideas below remain useful
> context only.

Handoff date: 2026-09-15 · Handed off from: v12.32-backlog (commit 07c4f57 + wrap commit)
Live: https://football.sportsignal.ir (Cloudflare Worker `ucl-notifier`, version 123dd8b0)

Everything below is context + instructions for the next development session.
The copy-paste prompt for the new session is in the **PROMPT** section at the bottom.

---

## 1. Project identity (unchanged)

- **Product**: SportSignal — Persian/RTL football (soccer) match-tracker site + Telegram bot.
- **Runtime**: Cloudflare Worker named `ucl-notifier`, **single-file** `src/worker.ts`
  (~4,900 lines; ALL HTML/CSS/JS inline; **no build step, no Tailwind, no framework**).
- **Data**: api-sports.io (secret `API_TOKEN` / `FD_API_TOKEN`) — fixtures, standings, events.
- **Delivery**: Telegram Bot API (secrets `BOT_TOKEN`, `CHAT_ID`) — kickoff alerts, full-time
  results, weekly league tables, and since v12.32 the 👑 «صدر جدول» coronation alert
  (KV snapshot diff `table_top_v1:<league>` — fires when a 2nd/3rd/4th-place team wins
  itself to the top; exactly-once via fresh-match attribution).
- **State**: KV namespace binding `STATE` (id in `wrangler.toml`) — payload cache, dedupe
  markers, standings snapshots.
- **Schedule**: cron `*/10 * * * *` — every sweep re-fetches, rebuilds the public payload,
  and runs all notification checks.
- **UI**: RTL Persian, Vazirmatn fonts, Persian numerals (۱۹:۰۰), Jalali dates
  (شهریور ۱۴۰۵), `data-i` i18n attributes (fa/en), admin panel at `/admin/login`
  (secrets `ADMIN_TOKEN`, `ADMIN_PASS`), `WEBHOOK_SECRET` for the bot webhook.
- **Assets**: `assets/` (bg.jpg, Stadium-bg-1.jpeg, Vazirmatn woff2) served by the
  worker's `[assets]` config.

## 2. Repo & environment mechanics for the next session

- Repo: `/home/z/my-project/workspace/SportSignal-extract/SportSignal`
  (git; GitHub remote `https://github.com/assadigit/SportSignal`, **private**, branch `main`).
- **CRITICAL — source of truth**: `src/worker.ts` in this repo was recovered from the LIVE
  deployed bundle (v12.31 → then v12.32 was built on it). Do NOT trust any older copy.
- Tests: `bun run test` → 11 node scripts in `scripts/` (all green; they were repaired to
  match the bundle/minified format). New features MUST get a new `scripts/check-*.js`.
- Syntax gate before deploy: `node --check src/worker.js`-style parse via a bundle export,
  plus the 11-script suite.
- Deploy: `CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=<account id> npx wrangler deploy`
  from the repo root (token + account id live in the sandbox-only `tokens.txt`, which is
  **gitignored** — never commit it). Secrets: `npx wrangler secret put <NAME>`.
  Rollback: `npx wrangler rollback` or `rollback <version-id>` (current: 123dd8b0).
- Live verification habit: `curl https://football.sportsignal.ir/` + marker grep,
  agent-browser desktop+390px, VLM screenshot pass — same loop used for v12.32.
- The sandbox also runs a Next.js "audit dashboard" (`/home/z/my-project`, port 3000)
  tracking every phase — extend it with the new phase card when the X work lands.
- Shared worklog: `/home/z/my-project/worklog.md` — READ the tail first, APPEND a
  `--- / Task ID / Agent / Task / Work Log / Stage Summary` section when done.
- GitHub push from the sandbox failed at hand-off (token redacted by the environment).
  If the user supplies a fresh classic token: `git remote set-url origin
  https://<token>@github.com/assadigit/SportSignal.git && git push origin main`.

## 3. THE AGENDA — connect SportSignal to X, automated X profile

Goal: a dedicated **@SportSignal X account** that posts automatically — an X mirror of the
Telegram brain: big-match kickoffs, full-time results, 👑 table-top coronation alerts, and
(likely as a reply-thread) the weekly league tables.

### 3.1 What the USER must do first (agent cannot)

1. Create the X account (suggest handle `@SportSignal` or `@sportsignal_ir`;
   Persian-first bio + link `https://football.sportsignal.ir`; profile photo = SportSignal
   logo; banner = `assets/Stadium-bg-1.jpeg`). In X settings mark the account as
   **"automated"** (X's automation label) to comply with X's automation rules.
2. Apply for a developer account at `https://developer.x.com` (same login), create a
   **Project → App**, generate:
   - API Key (consumer key) + API Secret
   - Access Token + Access Token Secret — **READ AND WRITE** permission
     ( regenerate them after changing the app permissions if needed)
3. Keep every tier limit in mind: **Free tier = ~500 posts/month, 1 app,
   write-only** (plus very small read quota). That's ~16 posts/day — the posting rules
   below are designed around that budget. Basic ($200/mo) raises it; not needed yet.
4. Hand the four values to the session → they become wrangler SECRETS, never repo files.

### 3.2 Architecture (stays single-file, Workers-native)

- **Auth**: OAuth 1.0a "user context" request signing implemented inline with
  `crypto.subtle` HMAC-SHA-1 (supported in Workers):
  - base string = `POST&urlencode(https://api.x.com/2/tweets)&urlencode(sorted oauth params)`
    (JSON bodies are NOT part of the signature; no query params → only `oauth_*` params).
  - signing key = `urlencode(consumerSecret) & urlencode(tokenSecret)`.
  - header `Authorization: OAuth oauth_consumer_key=…,oauth_nonce=…,
    oauth_signature_method="HMAC-SHA1",oauth_timestamp=…,oauth_token=…,
    oauth_version="1.0",oauth_signature=…` (values percent-encoded).
  - nonce: hex `crypto.getRandomValues`; timestamp: `Math.floor(Date.now()/1000)`.
- **Secrets** (`wrangler secret put`): `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`,
  `X_ACCESS_TOKEN_SECRET`, plus `X_ENABLED` (KV/secret flag, kill-switch) and
  `X_DRY_RUN` (log-only mode for phase A).
- **Post API**: `POST https://api.x.com/2/tweets` with `{"text": "…"}` →
  201 + `{"data":{"id":"…"}}`; capture the id for threading.
- **Threads** (weekly tables): reply with
  `POST /2/tweets {"text":…, "reply":{"in_reply_to_tweet_id":"<root id>"}}`.
- **Media (phase D)**: `https://upload.x.com/1.1/media/upload.json` (multipart, OAuth 1.0a
  on the URL only), then `{"text":…, "media":{"media_ids":["…"]}}`. Free tier allows media
  upload. Use it for club-badge match cards / the hero card.
- **Budget governor (KV)**: `x_budget_v1:<yyyymm>` counter, incremented per post,
  hard cap 450 (safety margin under 500); `x_daily_v1:<yyyymmdd>` cap ~12.
  On cap hit → skip silently (log to admin), never crash the sweep.
- **Dedupe (KV)**: `x_post_v1:<event-key>` (same event keys as the Telegram dedupe)
  so X and Telegram stay independent but each fires exactly once.
- **Content rules (priority order when budget is tight)**:
  1. 👑 coronation alert (highest value),
  2. FT results of *big* matches (selected teams / derbies),
  3. kickoff notes for big matches (~2h before, only if not already posted an FT),
  4. weekly tables thread (Fri night Tehran) — 1 root + ≤5 replies.
- **Text format (Persian, ≤280 chars, Persian numerals, emojis)** — mirror the Telegram
  templates already in `worker.ts` (search `formatTableTopMessage`, `sendWeekAhead`,
  the kickoff/result composers) but stripped of Telegram-only MarkdownV2; append
  `#فوتبال` + short league tag; end with `football.sportsignal.ir`.
- **Admin UX**: `/admin` panel gets an **X section**: status (enabled, budget used,
  last post, last error), a «test post» button hitting a new `/admin/x-test` route
  (admin-token protected), and the dry-run toggle.
- **Failure handling**: 401 → refuse + admin alert (bad keys); 429 → backoff marker in KV
  (skip X for this sweep); 5xx → one retry; every outcome logged to the admin log lines
  the worker already keeps in KV.

### 3.3 Phased rollout (do NOT skip the order)

- **Phase A — plumbing dry-run**: signing util + `maybePostX()` wired into the cron
  sweep AFTER the Telegram checks; `X_DRY_RUN=1` so it only logs the composed text.
  Unit-test the OAuth signature against the official RFC 5849 / X test vector
  (new `scripts/check-x-signature.js`). Verify a composed post via admin log.
- **Phase B — first live posts**: coronation + big-match FT results only
  (≈3–8 posts/week — comfortable inside free tier). Live-verify the first real post.
- **Phase C — kickoff notes + weekly table threads** + budget governor hard caps.
- **Phase D — media posts** (badge match-cards via v1.1 upload) if B/C stay stable.

### 3.4 Definition of done for the next session

- `src/worker.ts` (still single-file) contains the X module; version bumped
  `12.33-xpost`; VERSION strings ×6 + `package.json` + `CHANGELOG.md` entry.
- New `scripts/check-x-signature.js` (+ ideally `check-x-budget.js`) and all 12+ tests
  green; `bun run test` exit 0.
- Deployed with wrangler; live sweep verified; admin X section renders; a real or
  dry-run post visible; rollback path documented.
- Worklog appended; Next.js audit dashboard gets the new phase card.
- (If user provided token) pushed to GitHub; otherwise zip backup refreshed.

---

## 4. PROMPT (copy-paste into the next session)

> **Project**: SportSignal — Persian/RTL football match-tracker on a Cloudflare Worker.
> **Repo**: `/home/z/my-project/workspace/SportSignal-extract/SportSignal` — git, GitHub
> `assadigit/SportSignal` (private). **Read `/home/z/my-project/worklog.md` first** (tail
> first), and this whole file: `NEXT-SESSION-X-INTEGRATION.md`.
>
> **What exists**: single-file `src/worker.ts` (~4,900 lines, all HTML/CSS/JS inline, NO
> build step, NO Tailwind), Worker `ucl-notifier` + KV `STATE` + cron `*/10 * * * *`;
> api-sports.io data; Telegram bot with kickoff/result/weekly-table/👑-coronation alerts
> (KV dedupe + `table_top_v1:<league>` snapshots); RTL Persian UI (Vazirmatn, Persian
> numerals, Jalali dates, `data-i` i18n); admin panel `/admin/login`; live at
> `https://football.sportsignal.ir` = v12.32 (Cloudflare version 123dd8b0). Tests:
> `bun run test` (11 node scripts, all green — bundle-format compatible). `src/worker.ts`
> is the recovered LIVE bundle — treat it as the only source of truth.
>
> **THE TASK — connect SportSignal to X and run an automated X profile:**
> 1. Ask me for the four OAuth 1.0a keys (I created the X account + developer app:
>    API Key, API Secret, Access Token, Access Token Secret — READ+WRITE). If I haven't
>    yet, give me the exact steps (§3.1 above) and continue with dry-run plumbing anyway.
> 2. Implement inline in `src/worker.ts` (keep it single-file, no deps): OAuth 1.0a
>    HMAC-SHA1 signing via `crypto.subtle`, `POST https://api.x.com/2/tweets`,
>    reply-threading for multi-post content, KV budget governor (`x_budget_v1:<yyyymm>`
>    cap 450, daily ~12), KV dedupe `x_post_v1:<key>`, 401/429/5xx handling with admin
>    log lines. Secrets via `wrangler secret put`: `X_API_KEY`, `X_API_SECRET`,
>    `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`, `X_ENABLED`, `X_DRY_RUN`.
> 3. Content = Persian mirrors of the existing Telegram composers (kickoff of big
>    matches, FT results, 👑 coronation, weekly tables as a thread) — ≤280 chars,
>    Persian numerals, `football.sportsignal.ir` + `#فوتبال`; priority order
>    coronation > FT > kickoff > tables so the free tier's 500 posts/month never breaks.
> 4. Wire `maybePostX()` into the cron sweep AFTER the Telegram checks.
> 5. Admin panel: X status card (enabled / budget used / last post / last error),
>    «test post» button → `/admin/x-test` (admin-token protected), dry-run toggle.
> 6. Phases: **A** dry-run (log composed text; verify OAuth signature against the
>    official test vector in a new `scripts/check-x-signature.js`) → **B** live posts for
>    coronation + big-match FT → **C** kickoff notes + weekly thread + hard budget caps →
>    **D** media posts via `upload.x.com/1.1/media/upload.json`.
> 7. Version bump `12.33-xpost` (VERSION strings ×6, package.json, CHANGELOG entry);
>    add the new check script(s); `bun run test` must exit 0; syntax-gate the worker;
>    deploy via `CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… npx wrangler deploy`
>    (token in sandbox-only `tokens.txt`, gitignored); verify live (curl markers,
>    agent-browser 1440px+390px, first real/dry-run post, admin X card).
> 8. Append your Task section to `/home/z/my-project/worklog.md`; add the new phase card
>    to the Next.js audit dashboard (`/home/z/my-project`, port 3000). If I give you a
>    fresh GitHub classic token, also `git push` and refresh the zip backup
>    (`git archive --format=zip -o … HEAD`).
>
> Constraints: never break the Telegram path (X is additive; wrap every X call in
> try/catch so a failing post can never fail the sweep); respect X automation rules
> (the account is labeled automated, no spam, rate-limit safe); free tier = write-only,
> ~500 posts/month; no new npm dependencies; keep RTL/logical-property CSS conventions
> for any new admin UI; do not commit secrets.
