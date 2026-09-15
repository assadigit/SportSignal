// Self-check: bot dependability / reliability invariants (#1–#10 from the
// brainstorm). Regresses if a maintainer drops the backfill extension, the
// outbox, the schedule reconcile, the canary, the subrequest guard, the
// write-verify, the presumably-finished fallback, or the heartbeat.
//
// Reads the real concatenated worker source (single source of truth).
const src = require("./lib/worker-src")();

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) failed++;
};

// #2 Backfill now covers ALL pre-match types (5min + match-start included)
check("#2 isBackfillEligible floors include pre-match-5min", /"pre-match-5min":\s*2\s*\/\s*60/.test(src));
// v13.42-rekindle: match-start backfill lives INSIDE isBackfillEligible
// (the old isMatchStartBackfillEligible hung off shouldSendNotification,
// unreachable — the 2026-09-14 Torino-Roma missed start proved it). The
// wiring below asserts the branch exists AND shouldSendNotification no
// longer carries the dead OR-leg.
check("#2 match-start backfill branch inside isBackfillEligible", /if \(type === "match-start"\) \{/.test(src));
check("#2 match-start backfill gated on live status", /return isLiveStatus\(match\.status\);/.test(src));
check("#2 shouldSendNotification uses backfill for pre-match-5min", /case "pre-match-5min":\s*return isWithin5MinWindow\(match, env\) \|\| isBackfillEligible/.test(src));
check("#2 shouldSendNotification match-start case ORs the new backfill branch", /case "match-start":\s*(?:\/\/[^\n]*\n\s*)*return isMatchStartingNow\(match, env\) \|\| isBackfillEligible\(match, "match-start", env\);/.test(src));
check("#2 sendNotificationIfNeeded gates the send on persisted dedupe save", /if \(!persisted\)/.test(src));
check("#2 sendMatchNotifications returns a breadcrumb summary", /return notifySummary;/.test(src));

// #3 Dead-letter outbox
check("#3 outboxPush function exists", /async function outboxPush\(env/.test(src));
check("#3 drainOutbox function exists", /async function drainOutbox\(env/.test(src));
check("#3 sendTelegramDirect function exists (no outbox recursion)", /async function sendTelegramDirect\(env/.test(src));
check("#3 sendTelegram pushes to outbox on final failure", /await outboxPush\(env, text, chatId, keyboard\)/.test(src));
check("#3 outbox KV key is pending_sends_v1", /KV_OUTBOX: "pending_sends_v1"/.test(src));
check("#3 outbox has exponential backoff", /BACKOFFS\s*=\s*\[60e3/.test(src));
check("#3 outbox caps at KV_OUTBOX_MAX", /KV_OUTBOX_MAX: 200/.test(src));
check("#3 drainOutbox called in cron", /await drainOutbox\(env\)/.test(src));

// #1 Pre-scheduled notifications — RETIRED in v13.43-cpukeeper: the
// sched_v1:* decoy (never-read records, one KV read per worthy match per
// tick ≈ 174 reads/tick) was deleted. Recovery is covered by the
// isBackfillEligible legs (v13.42) + the outbox; these guards now assert
// the decoy can't silently return.
check("#1 sched decoy REMOVED: no reconcileSchedules function", !/async function reconcileSchedules\(env, matches\)/.test(src));
check("#1 sched decoy REMOVED: no sched_v1 writes anywhere", !/KV_SCHEDULE_PREFIX \+ matchKey/.test(src));
check("#1 sched decoy REMOVED: cron no longer calls it", !/await reconcileSchedules\(env, matches\)/.test(src));
check("#1 sched decoy REMOVED: no schedule-record type list in source", !/types: \["pre-match-24h", "pre-match-3h"/.test(src));

// #5 Canary match
check("#5 buildCanaryMatch function exists", /function buildCanaryMatch\(\)/.test(src));
check("#5 canary KV key is canary_match_v1", /KV_CANARY: "canary_match_v1"/.test(src));
check("#5 canary injected in cron", /canary = buildCanaryMatch\(\)/.test(src));
check("#5 canary tagged canary:true", /canary: true/.test(src));

// #6 Subrequest-budget guard (the import line is stripped by the eval
// transform, but the function definition from utils.ts is present)
check("#6 subrequestCount function defined", /function subrequestCount\(\)/.test(src));
check("#6 budget guard defers when >38", /subrequestCount\(\) > 38/.test(src));
check("#6 budgetDeferred counter logged", /Subrequest budget guard: deferred/.test(src));

// v13.35-prewarm: cron pre-warms the public payload from its own pool so the
// first visitor after a quiet gap never pays the ~4.6s provider sweep.
// (regexes run against the TRANSFORMED src — eval-harness annotations are
// stripped, e.g. `opts?: PubOpts` becomes just `opts`)
check("#13.35 fetchPublicMatches opts param exists", /function fetchPublicMatches\(env, req, opts\) \{/.test(src));
check("#13.35 PubOpts interface declared", /interface PubOpts \{ prewarm: boolean; pool: any\[\] \}/.test(src));
check("#13.35 prewarm skips the provider sweep (pool ride-along)", /if \(prePool\) \{\s*\n\s*matches = prePool;/.test(src));
check("#13.35 prewarm payloads stamped for the 9.25-min fresh window", /freshMs = cached && cached\.data && cached\.data\.prewarm && !cachedHasLive \? 555e3 : 18e4/.test(src));
check("#13.35 prewarm KV TTL covers the 10-min tick", /expirationTtl: prewarm \? 720 : 300/.test(src));
check("#13.35 canary stripped from prewarm pool", /opts\.pool\.filter\(\(m\) => !m\.canary\)/.test(src));
check("#13.35 cron pre-warm is budget-guarded", /pubStale && subrequestCount\(\) < 30/.test(src));
check("#13.35 cron passes its pool to the pre-warm", /prewarm: true, pool: matches/.test(src));

// #4 Canonical kickoff-time KV
check("#4 getCanonicalKickoff function exists", /async function getCanonicalKickoff\(env, match\)/.test(src));
check("#4 kickoff KV prefix is kickoff_v1:", /KV_KICKOFF_PREFIX: "kickoff_v1:"/.test(src));
check("#4 updateCanonicalKickoffOnReschedule function exists", /async function updateCanonicalKickoffOnReschedule\(env, match\)/.test(src));

// #7 in-memory dedupe fallback (v13.27: replaced the KV write-verify with
// an in-memory Set that survives KV write failures — quota exhaustion etc.)
check("#7 MEM_DEDUPE in-memory Set exists", /var MEM_DEDUPE = new Set/.test(src));
check("#7 shouldSendNotification checks MEM_DEDUPE first", /MEM_DEDUPE\.has\(key \+ ":"/.test(src));
check("#7 saveNotifiedMatch adds to MEM_DEDUPE", /MEM_DEDUPE\.add\(key \+ ":"/.test(src));

// v13.10-animated: sendDice (built-in animated emoji) for match-start
check("#anim sendDice function exists", /async function sendDice\(env: Env, chatId, emoji\)/.test(src) || /async function sendDice\(env, chatId, emoji\)/.test(src));
check("#anim sendDice calls /sendDice API", /\/sendDice/.test(src));
check("#anim match-start sends ⚽ dice before text", /config\.type === "match-start" && !late/.test(src));
check("#anim sendDice wired in notifications.ts", /sendDice\(scopedEnv, chatId/.test(src));

// #8 Time-based result fallback (presumably finished)
check("#8 isPresumablyFinished function exists", /function isPresumablyFinished\(match, _env\)/.test(src));
check("#8 isPresumablyFinished checks 150min past (v13.20 widened)", /minutesSince < 150/.test(src));
check("#8 isPresumablyFinished excludes IN_PLAY/PAUSED (v13.20)", /return status === "SCHEDULED" \|\| status === "TIMED"/.test(src));
check("#8 isMatchFinished includes presumably-finished", /return match\.status === "FINISHED" \|\| isPresumablyFinished/.test(src));

// #9 6h heartbeat
check("#9 heartbeat KV key is heartbeat_sent_v1", /KV_HEARTBEAT_LAST: "heartbeat_sent_v1"/.test(src));
check("#9 heartbeat interval is 6h", /HEARTBEAT_INTERVAL_MS: 6 \* 60 \* 60 \* 1e3/.test(src));
check("#9 heartbeat sends to admin chat in cron", /ر\u0628\u0627\u062A \u0633\u0627\u0644\u0645|Bot is alive/.test(src) || /heartbeat_sent_v1/.test(src));

// #10 /healthz exposes outbox_depth + version
check("#10 healthz exposes outbox_depth", /outbox_depth: outboxDepth/.test(src));
check("#10 healthz exposes version", /version: VERSION/.test(src));
check("#10 healthz unhealthy when outbox_depth >= 50", /outboxDepth < 50/.test(src));

// ============ v13.36-nospam: exactly-once notifications ============
// The reported bug: the bot spammed 10-20 copies of one notification.
// Root causes (all fixed + regression-guarded here):
//   (1) result-big/match-start-big broadcasts had NO dedupe check;
//   (2) expired dedupe records re-armed mid-window sends;
//   (3) send-then-save ordering let a failed KV write re-send every tick.

// THE LINE: an expired record STILL blocks (expiresAt = KV hygiene only).
// The blocking find must NOT contain `now < n.expiresAt` anymore.
check("#nospam1 never-expire: blocking find has no expiresAt re-arm", /existingNotification = notifiedMatches\[key\]\.find\(\s*\(n\) => n\.notificationType === notificationType\s*\)/.test(src));
check("#nospam1 old re-arm check removed", !/notificationType === notificationType && now < n\.expiresAt/.test(src));

// Broadcast types are real dedupe cases now.
check("#nospam2 shouldSendNotification handles match-start-big", /case "match-start-big":\s*return isMatchStartingNow/.test(src));
check("#nospam2 shouldSendNotification handles result-big", /case "result-big":\s*return isMatchFinished\(match\) && isWithinPostMatchWindow/.test(src));

// Broadcasts: check BEFORE send + write-first save (source order: the
// shouldSendNotification call for the -big type must precede its save, and
// the save must precede the group send loop).
const resultBigSeg = (src.match(/result-big[\s\S]{0,2600}?(?=\/\/ v13\.13-kickoff)/) || [""])[0];
check("#nospam3 result-big: dedupe check exists", /shouldSendNotification\(env, match, "result-big", notifiedMatches\)/.test(resultBigSeg));
check("#nospam3 result-big: check precedes write-first save", resultBigSeg.indexOf('shouldSendNotification(env, match, "result-big"') < resultBigSeg.indexOf('saveNotifiedMatch(env, match, "result-big"'));
const kickoffBigSeg = (src.match(/MISSING DEDUPE CHECK \(same bug[\s\S]{0,2600}?(?=\/\/ v12\.32|\/\/ after this match)/) || [""])[0];
check("#nospam3 kickoff-big: dedupe check exists", /shouldSendNotification\(env, match, "match-start-big", notifiedMatches\)/.test(kickoffBigSeg));
check("#nospam3 kickoff-big: check precedes write-first save", kickoffBigSeg.indexOf('shouldSendNotification(env, match, "match-start-big"') < kickoffBigSeg.indexOf('saveNotifiedMatch(env, match, "match-start-big"'));

// Regular path: write-first — saveNotifiedMatch before the chatGroups loop
// in sendNotificationIfNeeded.
const sniSeg = (src.match(/async function sendNotificationIfNeeded[\s\S]{0,4200}?for \(const g of chatGroups\)/) || [""])[0];
check("#nospam4 regular path: write-first save before sends", /await saveNotifiedMatch\(env, match, config\.type, notifiedMatches\);/.test(sniSeg) && sniSeg.indexOf("saveNotifiedMatch(env, match, config.type") < sniSeg.lastIndexOf("for (const g of chatGroups)"));
check("#nospam4 regular path: save gated on shouldSend", sniSeg.indexOf("shouldSendNotification") < sniSeg.indexOf("saveNotifiedMatch"));

// Past/future horizon: focus on upcoming, hard outer fence on the past.
check("#nospam5 horizon fence in sendMatchNotifications", /MIN_MS = nowMs - 26 \* 36e5/.test(src) && /MAX_MS = nowMs \+ 73 \* 36e5/.test(src));

// Morning digest: write-first dedupe (put before sendTelegram).
const digestSeg = (src.match(/const dedupeKey = "digest_sent_" \+ dateKey[\s\S]{0,900}?buildMorningDigestMessage/) || [""])[0];
check("#nospam6 morning digest: mark-before-send", digestSeg.indexOf('STATE.put(dedupeKey') >= 0 && digestSeg.indexOf("STATE.put(dedupeKey") < digestSeg.indexOf("buildMorningDigestMessage"));

// Migration broadcast: write-first dedupe.
const migSeg = (src.match(/mig_sent_v1[\s\S]{0,3200}?const r = await sendTelegram\(env, msg, chatId\);/) || [""])[0];
check("#nospam7 migration: mark-before-send", migSeg.indexOf('STATE.put(dedupeKey, "1"') >= 0 && migSeg.indexOf('STATE.put(dedupeKey, "1"') < migSeg.indexOf("sendTelegram(env, msg, chatId)"));

// Cron resilience: guarded lock (fail closed), start-heartbeat, phase alerts.
check("#nospam8 lock write guarded (fail closed)", /try \{\s*await env\.STATE\.put\(CONFIG\.KV_EXECUTION_LOCK, lockOwner, \{\s*expirationTtl: Math\.ceil\(CONFIG\.LOCK_TIMEOUT \/ 1e3\)\s*\}\);\s*\} catch \(e\) \{\s*await alertPhaseError\(env, "execution-lock/.test(src));
check("#nospam8 start-heartbeat written after lock", /START heartbeat[\s\S]{0,600}heartbeat: String\(NOW\)/.test(src));
check("#nospam8 alertPhaseError exists + rate-limited", /async function alertPhaseError\(env, phase, err\)/.test(src) && /30 \* 6e4/.test(src));
check("#nospam8 sendMatchNotifications phase guarded", /try \{\s*notifySummary = await sendMatchNotifications\(env, matches\);\s*\} catch \(e\) \{\s*await alertPhaseError\(env, "send-notifications"/.test(src));
check("#nospam8 match pool/fetch phase guarded", /alertPhaseError\(env, "match-pool\/fetch"/.test(src));
check("#nospam8 getRegisteredChats phase guarded", /alertPhaseError\(env, "get-registered-chats"/.test(src));
check("#nospam8 applySettings phase guarded", /alertPhaseError\(env, "apply-settings"/.test(src));

// KV write quota: cleanup_hour KV write removed (isolate-local guard now).
check("#nospam9 cleanup_hour KV write removed", !/STATE\.put\("cleanup_hour"/.test(src));
check("#nospam9 last_full_sweep folded into cron_status_v1", /last_full_sweep: fullSweepThisTick \? String\(NOW\)/.test(src));

// v13.37-nospam2: the four remaining "snapshot-as-dedupe" send paths must
// fail CLOSED — if the dedupe/snapshot state can't be persisted, the send is
// suppressed (a missed alert beats a duplicate storm).
check("#nospam10 status-map put is fail-closed (statusMapSaved gate)", /let statusMapSaved = false;/.test(src) && /if \(alerts\.length && statusMapSaved\) \{/.test(src) && /if \(htAlerts\.length && statusMapSaved\) \{/.test(src));
check("#nospam10 status-map suppression logged", /suppressing status-change alerts this tick/.test(src));
check("#nospam10 table-top snapshot put is fail-closed (snapSaved gate)", /let snapSaved = false;/.test(src) && /if \(!snapSaved\) continue;/.test(src));
check("#nospam10 table-top suppression logged", /skipping coronation check this tick/.test(src));
const weeklySeg = (src.match(/if \(done === week\) return null;[\s\S]{0,2000}?sendLeagueTables\(env, group/) || [""])[0];
check("#nospam10 weekly tables: marker put BEFORE first send (write-first)", weeklySeg.indexOf("await env.STATE.put(CONFIG.KV_WEEKLY_TABLES, week);") >= 0);
check("#nospam10 weekly tables: un-persisted marker skips the digest", /Weekly-tables marker save failed[\s\S]{0,200}return null;/.test(src));
check("#nospam10 weekly tables: old post-send conditional marker removed", !/if \(res\.sent > 0 \|\| weekAheadAgg\.sent > 0\) await env\.STATE\.put/.test(src));
check("#nospam10 audit admin alert rate-limited via KV stamp", /KV_AUDIT_ALERT/.test(src) && /Date\.now\(\) - lastTs > 6 \* CONFIG\.ONE_HOUR_MS/.test(src));
check("#nospam10 KV_AUDIT_ALERT key defined in CONFIG", /KV_AUDIT_ALERT: "audit_alert_v1"/.test(src));

// v13.38-qc: quality-control round — the last at-least-once vector + hygiene.
const drainSeg = (src.match(/const due = \[\];[\s\S]{0,1400}?sendTelegramDirect\(env, item\.text/) || [""])[0];
check("#qc1 outbox drain: keep-list persisted BEFORE sends (write-first)", drainSeg.indexOf("await env.STATE.put(CONFIG.KV_OUTBOX, JSON.stringify(keep)") >= 0 && drainSeg.indexOf("sendTelegramDirect") > drainSeg.indexOf("await env.STATE.put(CONFIG.KV_OUTBOX, JSON.stringify(keep)"));
check("#qc1 outbox drain: un-persistable keep-list aborts the drain", /Outbox keep-list save failed[\s\S]{0,200}return \{ drained: 0, remaining: list\.length, dead: 0 \};/.test(src));
check("#qc1 MEM_DEDUPE has a size cap (no unbounded isolate growth)", /if \(MEM_DEDUPE\.size > 4000\) MEM_DEDUPE\.clear\(\);/.test(src));
check("#qc1 table-top snapshots carry a TTL (no permanent keys)", /expirationTtl: 40 \* 86400/.test(src));
check("#qc1 migration marker put gates the send (migMarked)", /let migMarked = false;/.test(src) && /if \(!migMarked\) continue;/.test(src));
check("#qc1 KV write meter installed in cron", /kvWritesThisTick\+\+/.test(src) && /kv_writes_day: kvWritesDay/.test(src));
check("#qc1 healthz exposes the measured KV write burn", /kv_writes_day: parseInt\(st\.kv_writes_day\)/.test(src));
check("#qc1 write-budget warning threshold 800/1000", /kvWritesDay > 800/.test(src));
check("#qc1 toppers gated to full sweeps (quiet-tick quota burn killed)", /fullSweepThisTick \? await maybeNotifyTableToppers/.test(src));
check("#qc1 status map written only when changed", /curJson === JSON\.stringify\(prev\)/.test(src));
check("#qc1 meter logs per-key top offenders", /kvWriteKeys\[k\] = \(kvWriteKeys\[k\] \|\| 0\) \+ 1/.test(src) && /top: \$\{Object\.entries\(kvWriteKeys\)/.test(src));

// ============ v13.43-cpukeeper: CPU-limit outage killer ============
// Root cause (2026-09-14, both outages): free-plan 10ms rolling CPU average;
// full sweeps burn ~100ms CPU and ran on EVERY active tick (6/hour) → CF
// killed every cron tick at exactly 10ms CPU (status=exceededResources).
// The fix's WIRING (not the functions in isolation — the v13.42 lesson):
// the cron must throttle full sweeps to QUIET_SWEEP_MS and hand active
// in-between ticks to fetchLiveSweep; healthz must gate on tick COMPLETION.

// The throttle branch: sweepFresh-first (NOT !isActiveTime-first) — the old
// shape (!isActiveTime && sweepFresh) let active ticks re-sun the full sweep.
check("#cpu1 throttle: sweepFresh gates BEFORE the active/quiet split", /if \(sweepFresh && cachedPool\.length\) \{/.test(src));
check("#cpu1 throttle: active branch runs the live sweep (wired in cron)", /matches = await fetchLiveSweep\(env, cachedPool\);/.test(src));
check("#cpu1 throttle: quiet branch still reuses the KV pool", /Quiet period \\u2014 reusing KV pool/.test(src));
check("#cpu1 throttle: full sweep only in the else branch (fullSweepThisTick=true adjacency)", /fullSweepThisTick = true;/.test(src) && !/fullSweepThisTick = true;[\s\S]{0,200}fetchLiveSweep/.test(src));

// The live sweep itself: narrow FD range + sportscore yesterday/today +
// canonDedupe merge over the pool. NO env.STATE.put inside fetchLiveSweep
// (the KV pool stays the last full sweep's snapshot — zero writes on live
// ticks protects the 1,000/day quota).
const liveSeg = (src.match(/async function fetchLiveSweep\(env, cachedPool\)[\s\S]{0,2400}?return merged;/) || [""])[0];
check("#cpu2 fetchLiveSweep exists with the cron's exact call shape", liveSeg.length > 200);
check("#cpu2 live FD range is \\u00b12 days", /pastDays: 2, futureDays: 2, live: true/.test(liveSeg));
check("#cpu2 live sportscore window is yesterday+today", /fromDays: 1, toDays: 0/.test(liveSeg));
check("#cpu2 live sweep merges OVER the cached pool", /canonDedupe\(\[\.\.\.pool, \.\.\.fetched\]\)/.test(liveSeg));
check("#cpu2 live sweep performs ZERO KV writes (no STATE.put)", !/STATE\.put/.test(liveSeg));
check("#cpu2 live sweep never throws (provider failures swallowed)", /Live sweep football-data failed/.test(liveSeg) && /Live sweep sportscore failed/.test(liveSeg));
check("#cpu2 live sweep logs found/merged counts (miss visibility)", /Live sweep: pool=/.test(liveSeg));
// The transform strips import lines, so prove the wiring by section: the
// fetchLiveSweep CALL must live inside the cron.ts slice of the bundle (not
// just in providers.ts next to its definition).
const cronSeg = (src.match(/\/\/ ===== src\/cron\.ts =====[\s\S]*?(?=\/\/ ===== src\/|\/\/ ===== src\/pages)/) || [""])[0];
check("#cpu2 fetchLiveSweep wired inside cron.ts (the sweep decision)", /matches = await fetchLiveSweep\(env, cachedPool\);/.test(cronSeg));

// fetchFootballData opts: live mode skips intl calls; defaults unchanged.
check("#cpu3 FD live mode skips intl competitions", /if \(liveMode\) return allMatches;/.test(src));
check("#cpu3 FD defaults stay DAYS_IN_PAST/DAYS_IN_FUTURE", /opts && opts\.pastDays != null \? opts\.pastDays : CONFIG\.DAYS_IN_PAST/.test(src));
check("#cpu3 sportscore defaults stay the full-sweep window", /opts && opts\.fromDays != null \? opts\.fromDays : 1/.test(src));

// healthz: completion-aware ok. The heartbeat alone LIED during both
// outages (start-heartbeat advanced, tick died mid-flight).
check("#cpu4 healthz exposes last_cron_age_min", /last_cron_age_min: lastCronAgeMin/.test(src));
check("#cpu4 healthz ok requires tick completion (fresh && completing)", /const healthy = fresh && completing && outboxDepth < 50;/.test(src));
check("#cpu4 completion threshold derived from EXECUTION_FREQUENCY_MINUTES", /CONFIG\.EXECUTION_FREQUENCY_MINUTES \* 3 \+ 5/.test(src));

// v13.43 prewarm gate: the public-payload rebuild (~100ms CPU, measured live
// 164ms total on a live tick WITH prewarm) must NOT run on every tick —
// only on full sweeps or when the live fingerprint actually changed.
check("#cpu5 prewarm gated to full sweeps OR changed live data", /\(fullSweepThisTick \|\| liveChanged\) && pubStale && subrequestCount\(\) < 30/.test(src));
check("#cpu5 prewarm compares pool vs merged fingerprints", /liveFingerprint\(matches\) !== liveFingerprint\(poolRef\)/.test(src));
check("#cpu5 liveFingerprint helper defined in cron", /function liveFingerprint\(list\)/.test(src));
check("#cpu5 liveFingerprint covers LIVE/IN_PLAY/PAUSED/FINISHED", /st !== "LIVE" && st !== "IN_PLAY" && st !== "PAUSED" && st !== "FINISHED"/.test(src));
check("#cpu5 liveFingerprint carries score + identity (sorted, order-safe)", /parts\.sort\(\);/.test(src) && /parts\.join\(";"\)/.test(src));
check("#cpu5 poolRef captured from the pre-merge KV pool", /poolRef = cachedPool;/.test(src));
// Quiet ticks reuse the pool object → identical fingerprints → no prewarm.
check("#cpu5 quiet path assigns the pool itself (fingerprint-equal by construction)", /matches = cachedPool;/.test(cronSeg || src));

console.log(failed ? failed + " FAILURES" : "reliability invariants OK");
process.exit(failed ? 1 : 0);
