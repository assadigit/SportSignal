# SportSignal — Telegram Channel Mirror

**Document type:** Implementation specification + agent execution prompt  
**Project:** `https://github.com/assadigit/sportsignal`  
**Initial channel:** One public, Persian-language Telegram channel  
**Current scope:** Mirror the bot's existing public, automatic subscriber notifications. Do not turn the channel into a separate editorial product yet.  
**Execution model:** Multi-session, inspect → implement → verify → commit/push → deploy when applicable → hand off the next session.

---

# PART I — START HERE: AGENT KICKOFF PROMPT

You are the lead engineer responsible for implementing the Telegram Channel Mirror feature in the existing SportSignal repository.

Read this entire document before changing code. Then read the repository's own operating instructions, especially:

1. `AGENTS.md`
2. `README.md`
3. `ARCHITECTURE.md`
4. `RUNBOOK.md`
5. Relevant ADRs under `docs/adr/`
6. Relevant session handoffs under `docs/history/`
7. `package.json`, `wrangler.toml`, `wrangler.dev.toml`, and the current source files involved in Telegram delivery and notification scheduling

**Start with Session 0 (repository audit and implementation design) only.** Do not jump into implementation before documenting how the current bot actually decides, composes, deduplicates, and sends each notification family.

Work autonomously within the boundaries of this specification. Make evidence-based decisions from the current repository. Do not ask the owner to decide ordinary technical details that can be discovered from the code. Do not invent notification types, schedules, message formats, or data sources. Where the current implementation is ambiguous in a way that materially changes product behavior, document the ambiguity and your safest recommendation before proceeding.

Do not implement a second notification engine, a second match-data polling process, or an independent schedule for the channel. The channel must be an additional destination for the existing notification pipeline.

The owner wants this delivered over multiple manageable sessions. At the end of **every session**:

- Review the complete diff and check for unrelated changes.
- Run the appropriate repository checks. For source changes, follow the full local validation and deployment procedure in `RUNBOOK.md`.
- Commit and push completed work to the repository's intended branch, following `AGENTS.md` and `RUNBOOK.md`. Fetch the remote first; preserve any owner changes; never force-push or overwrite uncommitted work.
- Deploy after a session that changes runtime code, but only after every required check passes. A documentation-only session does not need a needless Worker deployment; explicitly record why no deployment was needed.
- Verify the push against the remote, not merely the local tracking ref.
- If runtime code was deployed, perform the required post-deployment checks and monitoring described in `RUNBOOK.md`.
- Write a concise session report and a complete, copy-paste-ready prompt for the next session. Save the handoff in `docs/history/` using the repository's existing naming convention. Also print the next-session prompt in your final response to the owner.
- State the commit SHA, deployed version/URL (when applicable), tests run, outcomes, known risks, and any owner action still required.

Never claim that a deployment, Telegram send, or verification succeeded unless you have evidence that it did.

---

# PART II — PRODUCT REQUIREMENTS

## 1. Owner intent

The first version of the channel is a **one-way public mirror of SportSignal's existing bot notifications**.

The expected behavior is:

- The bot continues to work as it does today for private subscribers.
- Whenever the existing notification system produces a public, automatic football notification for subscribers, the channel receives one corresponding copy.
- The channel is not a user, does not issue commands, does not maintain team-follow preferences, and does not receive private command replies.
- A notification delivered to 1 subscriber or 1,000 subscribers must still produce at most one corresponding channel post for that logical notification occurrence.
- The channel must not receive one copy per subscriber.
- The channel language is Persian (`fa`).
- Channel posts must include links to the SportSignal website and the SportSignal Telegram bot.
- Relevant public notification messages sent by the bot to private subscribers must also include a link to the channel, once the channel's public URL has been configured.
- If Telegram is temporarily unavailable, the channel delivery must be retained and retried safely. Channel delivery failures must not break or delay ordinary private bot notifications.
- Duplicate prevention is critical. Different legitimate notification stages for the same match must remain publishable; for example, a pre-match reminder, kickoff notification, and final result are distinct events.
- The initial implementation must be capable of evolving to more than one destination in the future (for example, an English channel or a channel for another sport), but only one Persian football channel is in scope now.

## 2. Public versus private messages

The channel is for public football information, not a transcript of private conversations.

### Include

Mirror automatic, match-related notification occurrences that the existing product notification pipeline produces for ordinary subscribers, provided the content is public football information and does not contain user-specific/private data.

This includes eligible notification families discovered in the source, such as match reminders, kickoff/result alerts, public digests, major-match broadcasts, table/standing alerts, and match-night content. The list below is only a starting inventory; the source code is authoritative.

A per-user notification may be eligible for mirroring when its actual content is generic public match information. If the same logical occurrence is sent to multiple users, publish only one channel copy. Do not expose which users follow which teams.

### Exclude

Do not mirror:

- Replies to `/start`, `/help`, `/next`, `/featured`, `/teams`, `/timezone`, `/lang`, `/stop`, or other user commands.
- User-specific team lists, preference summaries, timezone/language confirmations, account/member details, or other personalized responses.
- Admin-only commands, `/status`, `/members`, operational heartbeats, diagnostics, internal alerts, or private owner messages.
- Delivery-error messages, retry diagnostics, stack traces, or internal monitoring details.
- Messages that contain a user's name, chat ID, personal settings, private state, or a private conversation excerpt.
- Any content that is not intended for ordinary subscribers or is not public football information.

Do not create new channel-only content or expand match eligibility in this phase. Mirror the notification occurrences that the existing product logic already produces. In particular, do not invent new leagues, matches, reminder milestones, or digests for the channel.

## 3. Known repository baseline — verify against live source

The public repository documentation currently describes this broad architecture:

- One Cloudflare Worker (`ucl-notifier`) serves the website and Telegram webhook and runs scheduled notification work.
- The cron pipeline runs every ten minutes (`*/10 * * * *` UTC); it already drains a Telegram outbox, refreshes/reuses the match pool, detects changes, fans out notifications, runs auxiliary digest tasks, and records monitoring state.
- The match pool in KV is the common source for notification and public-site data.
- The notification and Telegram layers already have message composers, retry handling, rate-limit handling, dead-chat handling, an outbox, and write-first deduplication.
- The repository's product rule is that avoiding spam is more important than forcing a notification through.

The architecture document identifies (among others) these relevant modules. Confirm the current paths and exports before using them; names and boundaries can evolve:

- `src/telegram.ts` — Telegram Bot API senders, retry/rate-limit handling, dead-chat handling, outbox.
- `src/composers.ts` — message composers and standings pipeline.
- `src/notify-engine.ts` — notification configuration, notification eligibility/send orchestration/fan-out.
- `src/notify-status.ts` — match status transition detection.
- `src/digest-weekly.ts`, `src/digest-morning.ts`, `src/digest-bigmatch.ts`, `src/digest-coronation.ts` — documented digest/broadcast families; inspect for further digest modules too.
- `src/users.ts` — registered chats, profiles, preferences and team-follow state.
- `src/admin-bot.ts` — owner/admin tools; keep these out of the public channel unless an existing public-content broadcast path is explicitly identified.
- `src/cron*.ts` — current scheduled pipeline and its phases.
- `src/match-dedupe.ts` / related match-dedupe modules — current notification dedupe behavior.
- `src/config.ts`, `src/types.ts`, `src/monitoring.ts`, `src/api.ts` — configuration, Env contract, telemetry and health/status surfaces.
- `scripts/lib/worker-src.js` and relevant `scripts/check-*.js` — the repository's source-evaluating test harness and checks.

The README has documented these initial notification families. Treat them as a discovery checklist, not as a complete or guaranteed current inventory:

1. `pre-match-72h` — big-match-only; documented as requiring both teams to be followed.
2. `pre-match-24h`.
3. `pre-match-3h`.
4. `pre-match-1h`.
5. `pre-match-5min` — documented as big-match-only.
6. `match-start` — documented with a post-kickoff grace window.
7. `result` — post-match notification window.
8. `match-start-big` — big-match broadcast.
9. `result-big` — big-match result broadcast.
10. Table-top/coronation alerts.
11. The weekly league-table and week-ahead digest.
12. The morning matchday digest.
13. Champions League night preview/results content, including the documented GIF asset.
14. Any additional notification, migration, broadcast, or digest path found in current code.

The README also documents that the bot has Persian-first and English user preferences, individual team follows and timezone settings. The channel must remain Persian and must not derive its language/timezone from whichever subscriber happens to be processed first.

**Important:** repository documentation has different revision dates. Do not rely on a stale README or architecture snapshot as proof of current implementation. Check the actual current source, current `package.json` scripts/version, `src/worker.ts` header, `CHANGELOG.md`, and latest commit before deciding where to integrate.

## 4. Message content and presentation

The channel should receive the same logical message content the bot currently sends, not a rewritten editorial version.

Preserve, wherever supported and appropriate for a channel:

- Persian text and the existing Farsi team/competition naming conventions.
- Scores, status, kickoff times, dates, event descriptions and ordering.
- Existing emoji, formatting, parse mode/entities, links and captions.
- Relevant images, match-card media, animations/GIFs and captions, when the source notification uses them.
- Existing public navigation links or inline buttons when they make sense in a channel.

Do not copy private-chat-only reply keyboards or controls that cannot work in a channel. Do not add buttons that imply the channel can accept commands.

### Canonical channel locale and time

The channel is Persian-only. Compose the channel variant deterministically using the existing Persian message composer/translation path, rather than copying the first recipient's rendered message. Never let the channel randomly switch between Persian and English based on subscriber iteration order.

Audit the existing global/site timezone convention. Use that established public-facing timezone for channel timestamps. If time formatting is currently only per-user, introduce one explicit, documented channel/public timezone using the safest existing product convention. Do not choose a subscriber's personal timezone. Do not silently change the timezone or formatting of current private messages.

### Required links

Every channel post must end with clear links to:

- Website: `https://sportsignal.ir`
- Bot: `https://t.me/SportSignalAlertsBot` (verify the live bot URL and current username before hard-coding; use an existing constant/config if one exists).

Relevant public notification messages sent to private subscribers must include the channel link once configured. Do not invent the channel username. Store the channel's public URL as configuration and omit the channel CTA until the real URL is supplied. Avoid duplicate footer links if a message already contains them.

Keep footer wording concise, Persian, and consistent with the current bot voice. Do not otherwise redesign existing messages in this phase.

---

# PART III — DISCOVERY REQUIREMENTS (SESSION 0 IS MANDATORY)

## 5. Build a complete notification inventory

Before implementation, trace all outgoing Telegram messages from their origin to the actual Telegram API call. Search the entire source tree for send functions and Bot API methods (for example `sendMessage`, `sendPhoto`, `sendAnimation`, `sendDocument`, `sendMediaGroup`, `sendTelegram`, and wrapper/helper names). Do not rely only on filenames.

For every outgoing message family, record:

| Field | Required evidence |
|---|---|
| Notification family/type | Exact current type/key/name used by source |
| Origin | File and function that creates/triggers it |
| Eligibility | Exact conditions and time windows |
| Audience | All subscribers, followed-team subset, one user, admin only, or other |
| Personalization | Whether language/timezone/team preferences alter the content |
| Composer | Exact function that builds text/media/keyboard |
| Transport | Telegram method and payload shape |
| Dedupe | Current key/ledger and intended repeat behavior |
| Retry/outbox | Current retry path and what happens after failure |
| Schedule | Cron/trigger/auxiliary path; exact current time/window |
| Channel decision | Include, exclude, or needs owner decision, with reason |

The audit must include automatic notifications, digests, broadcasts, media posts, migration notices, and admin/operational messages, even when the final decision is to exclude them.

Do not use the number of recipients as the definition of a public notification. Classify based on the content and the current product's notification intent. A generic match alert sent to many eligible users should not become many channel posts. A private response must not become public merely because it uses the same low-level Telegram sender.

## 6. Session 0 deliverables

Create a discovery document under a suitable folder such as `docs/telegram-channel-mirror/` (follow existing repo conventions) containing:

1. Complete notification inventory table.
2. Sequence diagrams or concise flow descriptions for the main notification routes.
3. Exact current message composers and Telegram send functions to reuse.
4. Current dedupe and outbox behavior, including failure/retry semantics.
5. Which message families will be mirrored and which will not, with reasons.
6. How the Persian channel variant will be composed independently of subscriber preferences.
7. A recommended channel delivery architecture that fits the current Worker/KV model.
8. Estimated additional KV reads/writes per normal tick and a match-heavy tick, based on actual code paths.
9. Risks, migration/versioning decisions and test-harness changes required.
10. Session-by-session implementation plan refined to the actual repository.

Do not begin implementation until the inventory is complete enough to identify every public notification path. If the audit finds a material ambiguity in the owner's public/private intent, describe the exact example and recommend the least surprising behavior; do not silently broaden the channel's scope.

---

# PART IV — IMPLEMENTATION AND ARCHITECTURE RULES

## 7. Integration principle: one notification event, multiple destinations

Integrate channel publication at the shared notification-event/composition boundary, not inside the loop that sends notifications to individual subscriber chat IDs.

The logical flow should be conceptually similar to:

```text
Existing match/digest detection and eligibility
                 │
                 ▼
       One logical notification event
                 │
        ┌────────┴─────────┐
        ▼                  ▼
Existing subscriber    Channel mirror
fan-out (unchanged)    (one Persian copy)
        │                  │
  Existing delivery     Channel delivery
  and outbox            and outbox
```

This is a conceptual diagram, not an instruction to create these exact functions or modules. Follow the current dependency graph and keep it acyclic.

Rules:

- Do not put channel delivery inside a per-recipient loop.
- Do not enumerate users to discover whether a channel message should be sent.
- Do not multiply channel posts by subscriber count.
- Do not require a positive subscriber count to deliver a notification that the existing notification engine has already selected as an eligible public notification event.
- Do not make channel delivery a prerequisite for private sends, or vice versa.
- Do not fetch match data again for the channel.
- Do not add a second cron, polling worker, provider call, or new notification scheduler.
- Keep the existing subscriber delivery behavior, timing, preferences, and dedupe semantics unchanged except for the requested channel-link footer on eligible public notification messages.

## 8. Channel destination model and future extensibility

Only one destination is enabled for this phase, but avoid scattering a single channel ID and locale as hard-coded assumptions throughout notification code.

Use a small destination/config abstraction consistent with the current project, with enough fields to support future destinations, such as:

- stable destination key/id;
- Telegram chat ID;
- public URL;
- locale (`fa` for this destination);
- sport/category (`football` for this destination);
- enabled/disabled state.

This is an extensibility seam, not a request to build a multi-channel management platform. Do not add admin UI, channel selection commands, per-league rules UI, English content, or other-sport support now.

The first destination must be the only active destination and must represent the owner's public Persian football channel.

## 9. Configuration and safe activation

The owner has not selected the channel username or created/configured the channel yet. Therefore:

- Do not invent a channel name, username, numeric chat ID, or public URL.
- Do not put a placeholder `t.me` URL into live messages.
- Introduce configuration using repository naming conventions. Suggested conceptual settings are `TELEGRAM_CHANNEL_CHAT_ID` and `TELEGRAM_CHANNEL_PUBLIC_URL`; adapt names to the existing `Env`/Wrangler conventions after inspection.
- Keep channel delivery disabled safely when the chat ID is missing or the channel is not configured. Missing channel configuration must not affect current bot behavior.
- Keep the existing bot token in the existing secret mechanism. Never put tokens or credentials in source, docs, logs, commits, screenshots or command history.
- Do not hard-code the live channel ID in TypeScript or commit it into the repository.
- Add a clear operator setup note explaining that the owner must create a **public** Telegram channel, add the existing bot as an administrator with permission to post messages, obtain the channel ID/public URL, and configure the Worker.
- If configuration exists, validate channel reachability and posting permissions using non-posting Bot API checks where possible. Do not send a fake test post to the real public channel without explicit owner approval.

The implementation may be deployed while disabled. Do not claim end-to-end channel delivery is verified until a real channel is configured and permission checks pass.

## 10. Dedupe: one copy per logical occurrence, not one per match

Dedupe is a critical product invariant.

The current repository documents write-first, fail-closed notification dedupe using a per-match/per-type key in `notified_matches_v6`, plus an outbox. Inspect the exact current implementation before deciding how to extend it.

The channel needs its own destination-aware idempotency identity/ledger, or a carefully justified extension of the existing one. It must not accidentally share a marker that suppresses the existing per-user delivery.

The channel dedupe identity must distinguish legitimate notification stages for the same match. At minimum, evaluate a composite identity based on:

- stable destination key;
- canonical match identity;
- notification type/stage;
- canonical match date/kickoff identity;
- an occurrence/edition key where the current behavior intentionally permits multiple occurrences of the same type.

For digests and non-match notifications, use the logical digest/edition identity (for example type + relevant local calendar date/window + destination), derived from actual current semantics.

Do **not** use only `matchKey` as the channel key: that would suppress later legitimate messages about the same fixture. Do not use raw message text as the sole idempotency key: formatting/data changes can make duplicates look new.

Expected behavior:

- One notification type/stage for one logical match occurrence → one channel post.
- Different legitimate stages for the same match → separate posts, as in the bot.
- Same notification accidentally encountered again on a later cron tick → no second channel post.
- Same event fanned out to many subscribers → one channel post.
- A new edition/date window that is intentionally allowed by current product behavior → one post for that edition.
- Duplicate detection must survive Worker restarts and isolate changes; in-memory sets alone are insufficient.

Preserve write-first/fail-closed semantics: persist the channel's dedupe/claim state before attempting a send, following a design that prevents concurrent cron invocations or retries from sending duplicate copies. Do not weaken the existing `notified_matches_v6` contract.

### Exactly-once reality and failure policy

Telegram Bot API sends do not provide a general idempotency key for `sendMessage`/media methods. A network timeout can occur after Telegram accepted a message but before the Worker received/stored the response. The implementation must explicitly handle this unavoidable ambiguity rather than promising mathematically perfect exactly-once delivery.

Because the owner's priority is preventing duplicates:

- Prefer the repository's existing write-first, fail-closed pattern.
- Use stable persisted event IDs and durable delivery state.
- Retry failures only when the response proves that Telegram did not accept the message or when the existing outbox policy safely classifies the failure as retryable.
- Treat ambiguous post-send timeouts/crashes carefully; do not blindly resend a possibly accepted message just to maximize delivery.
- Document the selected at-most-once/effectively-once trade-off and the narrow residual failure window in the discovery/design note and runbook.
- Ensure that a permanent channel configuration/permission error does not poison the queue or block private subscriber delivery.

## 11. Outbox and retry behavior

Reuse the existing Telegram transport and outbox infrastructure where its current contracts permit. Do not create a parallel retry framework without evidence that the existing one cannot safely represent a channel destination.

The channel delivery record must be distinguishable from a private chat send and must carry enough information to retry the correct Telegram method and payload (text, caption, media reference/file ID, formatting/entities, and safe inline keyboard where applicable).

Inspect the current `pending_sends_v1` schema and behavior before modifying it. Preserve compatibility with older records and rollback. If a schema change is necessary:

- use a versioned/additive migration consistent with the repo's KV key rules;
- handle old and new records safely during deployment/rollback;
- update the monitoring, tests and operational documentation in the same change;
- do not rename/delete existing KV keys without a documented migration plan.

Handle at least:

- Telegram `429` responses and `retry_after` according to the existing transport policy;
- transient Telegram 5xx/network failures;
- permanent errors such as invalid chat ID, missing administrator rights or invalid payload;
- channel disabled/unconfigured state;
- queue age, maximum attempts and terminal/dead-letter behavior;
- recovery after Worker restart or missed cron tick.

The channel queue must not block the existing private-user queue. Bound the amount of channel work per tick to protect Worker CPU, execution time and Telegram limits. Use the existing cron/outbox lifecycle unless the audit proves that a small adjustment is necessary.

## 12. Cloudflare KV, CPU and subrequest budgets

This project has deliberately tight Cloudflare resource budgets. The current RUNBOOK documents KV write soft/hard thresholds and says anti-spam dedupe/outbox writes must never be bypassed by the quota governor.

Therefore:

- Reuse the current match pool, notification event and Telegram transport; no extra provider fetches or polling.
- Do not add more cron triggers or increase cron frequency.
- Count and document the incremental KV reads/writes for each channel event and each retry.
- Avoid unnecessary KV writes on ticks with no channel events.
- Ensure the channel dedupe/outbox writes are included in the existing meters/governor/health monitoring.
- Never bypass write-first anti-spam writes under budget pressure.
- If the audit shows the existing free-tier budget cannot safely support this addition, stop and report the measured evidence and a minimal alternative rather than quietly weakening protections.
- Do not add runtime dependencies unless absolutely necessary; the repository explicitly keeps its runtime dependency footprint minimal.

## 13. Monitoring and operational visibility

Add enough visibility to distinguish channel delivery health from private-bot delivery health.

At minimum, operators should be able to determine:

- whether channel delivery is configured/enabled;
- pending channel outbox depth and oldest pending age;
- last successful channel delivery time;
- recent retry/permanent failure counts;
- last error category (sanitized);
- whether delivery is paused due to invalid channel configuration/permissions.

Use existing monitoring/admin surfaces where appropriate. Do not expose the channel's internal configuration, message bodies, chat ID, tokens, or private subscriber data in public `/healthz` output. If public health output must change, expose only safe aggregate fields and preserve the existing health semantics. Prefer admin-only diagnostics for detailed state.

Logs should include a stable event identifier, notification type, destination key, attempt number and result. Never log bot tokens, credentials, full private user payloads or unnecessary personal data.

Channel-specific failures must be visible but must not cause a healthy private bot to appear completely down unless the existing product's health contract explicitly requires it.

---

# PART V — TESTING AND ACCEPTANCE

## 14. Required test coverage

Extend the existing source-evaluating test harness. The repository's `RUNBOOK.md` warns that edits to source signatures/module boundaries must be reflected in `scripts/lib/worker-src.js` and related extraction/assertion checks in the same commit. Follow that rule exactly.

Add focused tests for at least the following:

### Eligibility and privacy

- Every currently eligible public notification family is mirrored.
- Every excluded private/admin/command/operational message is not mirrored.
- User-specific values, team-follow lists, chat IDs, account state and private replies never leak into channel payloads.
- Persian channel output is deterministic regardless of subscriber order or subscriber language/timezone.
- Existing private subscriber messages retain their current language/timezone/personalization behavior.

### One-post behavior

- 1 subscriber → 1 eligible logical event produces one channel post.
- Many subscribers receiving the same event → still one channel post.
- Zero recipients because the existing event is not selected → no invented channel-only notification.
- The same cron event is processed repeatedly → no duplicate channel post.
- A Worker/isolate restart does not reset dedupe.
- Two eligible notification types for the same match remain separate.
- Legitimate repeated editions/occurrences remain possible when current bot semantics allow them.
- A digest is not repeated on every cron tick.

### Transport, outbox and failures

- Successful text send.
- Successful photo/animation/media send when used by current notification families.
- Existing formatting, captions, links and channel-compatible inline keyboard are preserved.
- `429` plus `retry_after`.
- Transient 5xx and confirmed transient network failures.
- Permanent 400/403/configuration errors.
- Missing channel configuration keeps the channel disabled without changing private delivery.
- Channel failure does not stop private subscriber sends.
- Retry after restart and bounded retry/dead-letter behavior.
- Ambiguous timeout follows the documented duplicate-avoidance policy.
- Duplicate/out-of-order cron invocations do not create duplicate posts.

### Resource and regression checks

- No extra provider fetches or polling.
- No new cron schedule.
- KV writes are metered and remain within documented budget in realistic fixtures.
- Existing bot behavior, website behavior, webhook command handling, match cards, digests and monitoring remain intact.
- All existing tests pass.

Use deterministic mocks/failure injection. Do not post test messages to the real public channel as part of automated tests.

## 15. Definition of done

The feature is implementation-complete only when all of the following are true:

1. The complete current notification inventory has been audited from source.
2. Every eligible public notification family is mirrored once per logical occurrence.
3. No per-user command reply, personal data, admin message or operational heartbeat is mirrored.
4. The channel message is Persian and follows the existing bot content/composition conventions.
5. Channel posts have the website and bot links; eligible private notification messages include the channel link when configured.
6. One event delivered to multiple users creates exactly one logical channel delivery.
7. Different legitimate stages for the same match can each be posted.
8. Duplicate protection persists across cron ticks, restarts and isolate changes.
9. Channel failures are retried safely, observable and isolated from private delivery.
10. Cloudflare budgets and current anti-spam guarantees remain intact.
11. Existing tests plus new tests pass; local Worker smoke tests pass.
12. Runtime changes are deployed and post-deploy checks are complete, unless deployment is blocked by missing owner-controlled channel configuration/permissions.
13. Documentation/runbook and session handoff are updated.
14. The final report distinguishes code-complete, deployed-disabled and live-channel-verified states. Never conflate them.

---

# PART VI — MULTI-SESSION EXECUTION PLAN

Refine the following plan after Session 0 based on actual code. Keep sessions small enough to review and deploy safely.

## Session 0 — Repository audit and architecture decision (documentation only)

Scope:

- Read repository instructions and current docs.
- Trace every outgoing Telegram message family from origin to Bot API transport.
- Build the complete inventory and public/private classification.
- Inspect the current dedupe ledger, outbox, KV metering, cron execution lock, monitoring and source-evaluating test harness.
- Design the smallest safe channel-mirror integration.

Deliverables:

- `docs/telegram-channel-mirror/DISCOVERY.md` (or a better repo-conventional location).
- An implementation plan broken into the next sessions.
- A documented decision on event identity, repeated notification stages, channel language/timezone, outbox strategy and failure ambiguity.

No runtime code changes in this session. Run relevant documentation/style checks if available, commit and push the audit. Do not deploy a docs-only change just to create a deployment.

## Session 1 — Destination configuration, delivery foundation and durable idempotency

Scope:

- Add the minimum destination/config abstraction for one Persian football channel.
- Add safe disabled-by-default configuration for chat ID/public URL.
- Implement or extend destination-aware event dedupe and channel delivery/outbox records using the existing Telegram transport.
- Preserve compatibility with existing KV contracts and rollback.
- Add focused unit/source-extraction tests for dedupe, disabled state, serialization and transport routing.
- Do not yet connect every notification family unless the foundation is proven stable and the session scope allows it.

Acceptance:

- Missing channel config has zero effect on existing bot behavior.
- One event identity cannot enqueue multiple channel deliveries.
- Existing private delivery continues to pass all regression tests.

## Session 2 — Mirror all eligible notification families

Scope:

- Integrate the channel destination at the shared notification-event boundary.
- Connect every eligible public message family from the Session 0 inventory: per-match milestones/status, big-match broadcasts, digests, table/coronation alerts, media/GIF posts and any other included path.
- Exclude private/admin/command/operational messages.
- Compose a deterministic Persian channel variant.
- Add the channel footer (website + bot) to channel posts.
- Add the configured channel link to eligible public notification messages sent to private subscribers.
- Avoid duplicate footer elements and preserve channel-compatible formatting/media/buttons.

Acceptance:

- A fan-out to many subscribers yields only one channel delivery per event.
- Every inventoried family is covered or has a documented reason for exclusion.
- Private bot output is not otherwise changed.

## Session 3 — Reliability, observability, resource hardening and full regression

Scope:

- Complete retry classification, backoff, queue limits, restart recovery and terminal error handling.
- Add channel-specific operational telemetry/diagnostics without exposing sensitive state publicly.
- Verify channel failures do not block private sends.
- Measure additional KV operations and CPU/subrequest overhead under quiet, normal and match-heavy test scenarios.
- Complete failure-injection, duplicate, concurrency and outbox tests.
- Update `RUNBOOK.md`, architecture/ADR docs and version/change records as appropriate.

Acceptance:

- All new and existing tests pass.
- All required local smoke tests and budget checks pass.
- No unbounded queue, retry loop or extra provider polling is introduced.

## Session 4 — Production readiness and activation

This session depends on owner-controlled Telegram setup.

Owner action required before live channel activation:

1. Create the public Telegram channel.
2. Choose its public username/link.
3. Add the existing SportSignal bot as an administrator with permission to post messages.
4. Supply/configure the channel chat ID and public URL through the approved Cloudflare Worker configuration mechanism.

Agent tasks:

- Verify configuration is present without exposing it.
- Validate that the bot can access the channel and has post permission using safe non-posting checks where possible.
- Confirm the deployed Worker is healthy and channel outbox is clear.
- Enable delivery only after permission/config validation.
- Do not post a fake test message. If a real end-to-end send is required, use a clearly labelled, owner-approved first public post; otherwise verify through the first naturally occurring eligible notification.
- Observe at least the required cron cycles and inspect logs/health metrics.
- Record the live verification evidence and any remaining operational caveat.

If the owner has not created the channel or supplied its ID/URL, deploy the code in its safe disabled state, explain exactly what remains, and do not claim live channel delivery works.

---

# PART VII — SESSION OPERATING RULES AND HANDOFF TEMPLATE

## 16. Rules for every session

Before editing:

- Confirm the repository root and current branch.
- Read `git status`; never discard or overwrite uncommitted owner work.
- Fetch the remote `main` using the repository's documented procedure. Rebase/merge carefully if the remote moved; do not force-push.
- Confirm no other agent/session is concurrently editing or deploying this repository. Do not run parallel deployment/push workflows.
- Re-read the latest relevant session handoff so work continues from the actual current state.
- State the exact session objective and files/modules expected to change.

During work:

- Keep the diff scoped to channel mirroring and required tests/docs.
- Preserve existing website, bot commands, private notification rules, match data sources and visual behavior.
- Do not perform unrelated refactors or broad repository cleanup.
- Do not add a second notification scheduler or duplicate data fetching.
- Follow current TypeScript style, module layering and KV key/version rules.
- Update `scripts/lib/worker-src.js` and extraction/assertion tests in the same commit whenever source module ordering/signatures require it.
- Never add credentials to the repository. Use owner-provided credentials only through the approved environment/secret mechanism. Never persist one-shot tokens in Git configuration.

Before commit/push:

- Inspect `git diff --check`, full diff and `git status`.
- Run `npm test` (the exact current script in `package.json`) for source changes. Do not assume a historical test count; use the current script.
- Run the local Worker smoke checks from `RUNBOOK.md` for runtime changes.
- Do not deploy or push a red test suite.
- Confirm generated files, build outputs and secrets are not accidentally included.
- Commit with a clear, scoped message.
- Push to the intended branch and verify the remote SHA using the method in `AGENTS.md` (the runbook currently calls for verifying with `git ls-remote`; use the current documented URL/branch syntax).

After runtime deployment:

- Follow the current `RUNBOOK.md` deployment and rollback process exactly.
- Verify `https://sportsignal.ir/healthz` and the deployed version.
- Verify the public site still responds normally.
- Observe at least two full cron ticks as required by the runbook; interpret health/outbox/KV fields using their documented semantics.
- Check Worker logs for unexpected channel retries/errors and confirm normal private delivery remains healthy.
- Never run rollback or change production secrets casually. If a deployment causes a regression, follow the runbook's rollback procedure and report it.

## 17. Required end-of-session report

Every session must end with this report:

```text
SESSION: [number + title]
STATUS: [complete / partially complete / blocked]
SCOPE COMPLETED:
- ...
FILES CHANGED:
- ...
TESTS:
- command — result
COMMIT:
- hash + message
PUSH:
- remote branch + verified SHA
DEPLOYMENT:
- deployed version / URL, or “not applicable — documentation-only”, or exact blocker
POST-DEPLOY VERIFICATION:
- healthz / public site / cron cycles / logs
CHANNEL STATE:
- disabled / configured but not activated / active and verified
OWNER ACTION REQUIRED:
- none, or exact non-technical action
RISKS / FOLLOW-UPS:
- ...
NEXT SESSION:
- objective
- exact files/modules to inspect
- acceptance criteria
```

Then provide a complete copy-paste-ready prompt for the next session. Save it under `docs/history/` in the repository's established style and include the relevant commit SHA, completed work, current branch/remote state, deployment version, exact remaining tasks, test commands, known risks and explicit out-of-scope items. The next prompt must instruct the next session to read this spec and the latest handoff before doing anything.

If a session is blocked by a failing test, unavailable credential, missing owner-controlled channel setup or production safety issue, do not pretend it is complete. Do not deploy unsafe code. Commit/push only safe, reviewable work when appropriate, report the blocker, and still provide a precise next-session prompt.

---

# PART VIII — OWNER-PROVIDED VALUES (DO NOT GUESS)

These values are intentionally blank until the owner creates/configures the channel:

| Setting | Value |
|---|---|
| Public channel name | Not selected yet |
| Public channel URL / username | Not selected yet |
| Telegram channel chat ID | Not available yet |
| Bot administrator permission | Must be granted by owner |
| Channel locale | Persian (`fa`) |
| Channel sport/category | Football |
| Website URL | `https://sportsignal.ir` |
| Bot URL | `https://t.me/SportSignalAlertsBot` — verify current live username before use |

**Final instruction:** Build the reliable mirror first. Do not add a new editorial strategy, user-facing channel controls, multi-channel admin UI, English channel, or other sports in this phase. Keep the architecture extensible, but keep the shipped feature deliberately narrow.
