// Self-check: bot dependability / reliability invariants (#1–#10 from the
// brainstorm). Regresses if a maintainer drops the backfill extension, the
// outbox, the schedule reconcile, the canary's REMOVAL, the subrequest
// guard, the write-verify, the presumably-finished fallback, or the
// heartbeat.
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

// #5 Canary match — RETIRED in v13.44-quotaguard (audit F9): the injection
// ran AFTER cacheMatches, so the canary never persisted — every tick minted
// a fresh +25h kickoff whose windows never opened, while burning a
// canary_match_v1 write per tick (~144/day of the 1,000/day free KV-write
// quota) plus notify-path reads for a phantom match. These guards keep it
// gone (the F9 decoy pattern must not silently return).
check("#5 buildCanaryMatch function REMOVED", !/function buildCanaryMatch\(\)/.test(src));
check("#5 canary injection REMOVED from cron", !/canary = buildCanaryMatch\(\)/.test(src));
check("#5 KV_CANARY config entry gone (no writer anywhere)", !/KV_CANARY/.test(src));
check("#5 canary:true synthetic payload tag gone", !/canary: true/.test(src));
check("#5 prewarm pool still strips canary-shaped rows (belt-and-braces kept)", /opts\.pool\.filter\(\(m\) => !m\.canary\)/.test(src));

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

// #4 Canonical kickoff-time KV — RETIRED in v13.46-trim: the helpers
// (getCanonicalKickoff/updateCanonicalKickoffOnReschedule in admin.ts) had
// ZERO callers — detectStatusChanges never invoked them, so kickoff_v1: was
// never written or read. The notification windows have always used the
// pool's own utcDate. These guards keep the dead feature from returning.
check("#4 getCanonicalKickoff function REMOVED", !/async function getCanonicalKickoff\(env, match\)/.test(src));
check("#4 kickoff KV prefix REMOVED", !/KV_KICKOFF_PREFIX/.test(src));
check("#4 updateCanonicalKickoffOnReschedule function REMOVED", !/async function updateCanonicalKickoffOnReschedule\(env, match\)/.test(src));

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
// v13.44-quotaguard: window widened 2600->3600 — the F3 fail-closed gate
// added ~430 chars between the dedupe check and the save inside the segment.
const resultBigSeg = (src.match(/result-big[\s\S]{0,3600}?(?=\/\/ v13\.13-kickoff)/) || [""])[0];
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
check("#nospam8 start-heartbeat put RETIRED (v13.44: redundant write — the lock proves firing, last_cron proves completion)", !/START heartbeat/.test(src));
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

// ============ v13.44-quotaguard: free-tier quota guarantee ============
// The user's ask: "never exceed the Cloudflare free tiers." KV writes
// (1,000/day) are the binding constraint (requests/reads/deletes/storage/
// cron-triggers/subrequests all have 10-100x headroom; CPU was fixed
// structurally by 13.43). The wiring that must hold: exactly ONE
// cron_status_v1 put per tick, the canary gone, the meter counting from
// the tick's FIRST action, a soft/hard governor that sheds only cosmetic
// writes, a web-side rebuild guard, both -big broadcasts fail-closed on
// the dedupe save (F3), and fetchWithRetry honoring Retry-After + the FD
// suspension circuit (F5).

check("#quota1 single cron_status_v1 put per tick (start-heartbeat retired)", (src.match(/STATE\.put\("cron_status_v1"/g) || []).length === 1);
check("#quota1 canary fully gone (no buildCanaryMatch call sites)", !/buildCanaryMatch\(\)/.test(src));
check("#quota1 meter wraps BEFORE the lock put (true burn counted)", src.indexOf("kvWritesThisTick++") < src.indexOf("STATE.put(CONFIG.KV_EXECUTION_LOCK"));
check("#quota1 meter pins the pristine put (no isolate wrapper chaining)", /__origPut/.test(src));
// v13.44.1-truemeter: the fold must count the completion blob's own put
// (v13.44 undercounted 1 write/tick = 144/day — the stored meter, the log
// line and the governor's engagement point now agree exactly), and the
// prewarm must run BEFORE the blob so its writes fold too.
check("#quota1 truemeter: fold includes the completion blob's own put (+1)", /kvWritesDay = kvWritesThisTick \+ 1 \+ \(\(prevBlob\.kv_day === kvDay \? parseInt\(prevBlob\.kv_writes_day\) : 0\) \|\| 0\)/.test(src));
check("#quota1 truemeter: kv_writes_last_tick carries the blob's +1", /kv_writes_last_tick: kvWritesThisTick \+ 1/.test(src));
check("#quota1 truemeter: prewarm runs BEFORE the completion-blob fold (its writes fold)", src.indexOf("Public payload pre-warmed") >= 0 && src.indexOf("Public payload pre-warmed") < src.indexOf("kvWritesDay = kvWritesThisTick + 1"));
check("#quota1 truemeter: no leftover prewarm code after the blob", src.lastIndexOf("Public pre-warm failed") < src.indexOf("kvWritesDay = kvWritesThisTick + 1"));

check("#quota2 governor thresholds in CONFIG (700 soft / 850 hard)", /KV_WRITES_SOFT: 700/.test(src) && /KV_WRITES_HARD: 850/.test(src));
check("#quota2 governor reads the day accumulator from prevStatus", /prevStatus\.kv_day === kvDay/.test(src));
check("#quota2 soft/hard levels computed from writesSoFarToday", /const budgetSoft = writesSoFarToday >= CONFIG\.KV_WRITES_SOFT;/.test(src) && /const budgetHard = writesSoFarToday >= CONFIG\.KV_WRITES_HARD;/.test(src));
check("#quota2 FA-AI learning gated on soft", /if \(!budgetSoft\) \{[\s\S]{0,260}maybeRunFaAi/.test(src));
check("#quota2 prewarm gated on soft", /\(fullSweepThisTick \|\| liveChanged\) && pubStale && subrequestCount\(\) < 30 && !budgetSoft/.test(src));
check("#quota2 hard hold plumbs the pool-cache skip (scoped env flag)", /budgetHard \? \{ \.\.\.env, KV_BUDGET_HOLD: true \} : env/.test(src));
check("#quota2 cacheMatches honors the hold", /env && env\.KV_BUDGET_HOLD\)[\s\S]{0,220}return;/.test(src));
check("#quota2 hard budget pages the admin once/12h (write-first mark)", /kv_budget_alert_v1/.test(src) && /12 \* 36e5/.test(src));
check("#quota2 budget level lands in the status blob", /budget: budgetHard \? "hard" : budgetSoft \? "soft" : null/.test(src));
check("#quota2 healthz exposes the governor level", /kv_budget: st\.budget \|\| null/.test(src));
const webGuardSeg = (src.match(/web-side KV-write budget guard[\s\S]{0,1100}/) || [""])[0];
check("#quota2 web-side rebuild guard honors the hard threshold", /KV_WRITES_HARD/.test(webGuardSeg) && /serving the cached public payload/.test(webGuardSeg));
check("#quota2 web guard exempts the cron prewarm path", /if \(!prewarm\) \{/.test(webGuardSeg));

check("#quota3 result-big broadcast gates the send on the persisted save (F3)", /const persistedBig = await saveNotifiedMatch\(env, match, "result-big", notifiedMatches\);[\s\n ]*if \(!persistedBig\) continue;/.test(src));
check("#quota3 kickoff-big broadcast gates the send on the persisted save (F3)", /const persistedBig = await saveNotifiedMatch\(env, match, "match-start-big", notifiedMatches\);[\s\n ]*if \(!persistedBig\) continue;/.test(src));

check("#quota4 fetchWithRetry honors Retry-After", /res\.headers\.get\("retry-after"\)/.test(src));
check("#quota4 Retry-After wait capped at 15s (tick can't stall)", /Math\.min\(Math\.max\(raSec \* 1e3, CONFIG\.API_RETRY_DELAY \* attempt\), 15e3\)/.test(src));
check("#quota4 FD suspension check wired at sweep entry", /providerSuspended\(env, "football-data"\)/.test(src));
check("#quota4 FD suspends on rate-limit exhaustion", /suspendProvider\(env, "football-data"\)/.test(src));
check("#quota4 fdRateLimited window helper exists", /function fdRateLimited\(\)/.test(src));

// v13.45-sightlines (R1): true subrequest totals, dead man's switch, guards.
// F10: KV ops now counted (gates keep fetch-only semantics BY DESIGN — they
// were tuned on that counter; the sum is the sightline, not a new gate input).
check("#f10a kvOpsCount accessor defined", /function kvOpsCount\(\)/.test(src));
check("#f10b KV get/delete wrapped with __orig pinning", /__origGet/.test(src) && /__origDelete/.test(src));
check("#f10c the put meter's wrapper also bumps the KV-op counter", /kvWritesThisTick\+\+;\s*\n\s*bumpKvOp\(\);/.test(src));
check("#f10d completion blob exposes the true subrequest total", /subreq_last_tick: subrequestCount\(\) \+ kvOpsCount\(\) \+ 1/.test(src) && /kv_ops_last_tick: kvOpsCount\(\) \+ 1/.test(src));
check("#f10e healthz exposes degraded + both sightlines", /degraded: degraded/.test(src) && /subreq_last_tick: parseInt\(st\.subreq_last_tick\)/.test(src) && /kv_ops_last_tick: parseInt\(st\.kv_ops_last_tick\)/.test(src));
check("#f10f telegram send path still bumps before its fetch (x.ts site retired at 13.48-xtrim)", /if \(bumpSubrequest\(\)\) return false;/.test(src));
// card.ts is not part of the eval concat (workerSrc order) — read it directly
// so the crest-fetch bump is locked too.
const fs13 = require("fs");
const path13 = require("path");
const cardSrc13 = fs13.readFileSync(path13.join(__dirname, "..", "src", "card.ts"), "utf8");
check("#f10g crest + standings + getChat fetches all bump", /if \(bumpSubrequest\(\)\) return "";/.test(cardSrc13) && /if \(bumpSubrequest\(\)\) return out;/.test(src) && /if \(bumpSubrequest\(\)\) break;/.test(src));
// The dead man's switch: success ping after a resolved tick (every early
// return is a handled outcome), /fail from the catch with the error name in
// the POST body (verified live: path-suffix messages 400, body form works).
check("#hc1 pingHealthcheck defined (fire-and-forget, budget-guarded, secret-gated)", /function pingHealthcheck\(env, ctx, ok, err\)/.test(src) && /HEALTHCHECK_PING_URL/.test(src) && /ctx\.waitUntil\(done\)/.test(src));
check("#hc2 success ping after executeScheduledLogic; fail ping in the catch", /await executeScheduledLogic\(env\);\s*\/\/ v13\.45-sightlines[\s\S]{0,400}pingHealthcheck\(env, ctx, true\);/.test(src) && /pingHealthcheck\(env, ctx, false, error\);/.test(src));
check("#hc3 fail ping posts the error name in the body", /fetch\(url \+ "\/fail", \{ method: "POST", headers: \{ "content-type": "text\/plain" \}, body: String\(err && err\.name \|\| "error"\)/.test(src));
// W6: the 5-min counter key existed in the config type but not the init.
check("#n1 notificationCounts initializes pre-match-5min (NaN fix)", /"pre-match-1h": 0,\s*\n\s*"pre-match-5min": 0,/.test(src));
// W7: the fa-ai cooldown marker is written only when there is work.
check("#fai1 fa-ai cooldown marker (the PUT) sits below the emptiness check", (() => { const seg = (src.match(/async function maybeRunFaAi[\s\S]{0,2600}/) || [""])[0]; const empty = seg.indexOf("!names.length && !venues.length"); const mark = seg.indexOf("STATE.put(CONFIG.KV_FA_LAST_RUN"); return empty > -1 && mark > -1 && mark > empty; })());
check("#fai2 empty-verdict isolate cache keyed on the payload ts", /FA_EMPTY_PAYLOAD_TS/.test(src));
// W8: bot commands must never trigger the provider sweep.
const botSeg13 = (src.split("// ===== src/bot.ts =====")[1] || "").split("// ===== src/cron.ts =====")[0];
check("#w8 bot.ts never calls fetchMatchesFromAPI (no provider sweeps from user-typed commands)", botSeg13.length > 0 && !/fetchMatchesFromAPI/.test(botSeg13));

// #cupscan (v13.50-cupscan): EFL/FA Cup coverage via the TSP team view —
// the league views regressed (1 event per league) and sportscore's efl-cup
// feed is empty; without this, big-team cup ties were invisible to the pool.
const tablesSeg15 = (src.match(/\/\/ ===== src\/tables\.ts =====[\s\S]*?(?=\/\/ ===== src\/)/) || [""])[0];
const provSeg15 = (src.match(/\/\/ ===== src\/providers\.ts =====[\s\S]*?(?=\/\/ ===== src\/)/) || [""])[0];
const cfgSeg15 = (src.match(/\/\/ ===== src\/config\.ts =====[\s\S]*?(?=\/\/ ===== src\/)/) || [""])[0];
check("#cupscan CUP_TEAM_TSP_IDS: the 6 English big teams (verified ids)", /Liverpool FC\": 133602/.test(tablesSeg15) && /Tottenham Hotspur FC\": 133616/.test(tablesSeg15) && /Arsenal FC\": 133604/.test(tablesSeg15) && /Chelsea FC\": 133610/.test(tablesSeg15) && /Manchester City FC\": 133613/.test(tablesSeg15) && /Manchester United FC\": 133612/.test(tablesSeg15));
check("#cupscan scan uses the TSP TEAM view (eventsnext.php?id=)", /eventsnext\.php\?id=\/ \+ tspId/.test(provSeg15) || /eventsnext\.php\?id=" \+ tspId/.test(provSeg15));
check("#cupscan accepts only EFL_CUP/FA_CUP rows (idLeague 4570 + name map)", /=== "4570" \? "EFL_CUP" : PROVIDER_LEAGUE_MAP\[e\.strLeague\]/.test(provSeg15) && /code !== "EFL_CUP" && code !== "FA_CUP"/.test(provSeg15));
check("#cupscan marker key + TTLs in CONFIG", /KV_CUP_SCAN_KEY: "cup_scan_v1"/.test(cfgSeg15) && /CUP_SCAN_TTL_MS: 5 \* 3600 \* 1e3/.test(cfgSeg15) && /CUP_SCAN_HOT_TTL_MS: 30 \* 60 \* 1e3/.test(cfgSeg15));
check("#cupscan fail-marker backs off 30 min", /fail" && now - ts < 30 \* 60e3/.test(provSeg15));
check("#cupscan hot window: [-1h, +4h] re-scan gate", /ko - now < 3600e3 && now - ko < 4 \* 3600e3/.test(provSeg15));
check("#cupscan empty pool = skip (never a cup-only pool)", /if \(!pool\.length\) return \{ added: 0, updated: 0 \};/.test(provSeg15));
check("#cupscan persist goes through cacheMatches (budget-hold honored)", /cacheMatches\(env, poolOut, "cupscan"\)/.test(provSeg15));
check("#cupscan cron hook gated on QUIET ticks only (non-sweep + non-SOFT + pool-reuse — the 21:40Z incident)", /if \(!fullSweepThisTick && !budgetSoft && matches === poolRef\) \{[\s\S]{0,500}?maybeScanCupFixtures\(env, matches, poolRef\)/.test(src));
check("#cupscan adds+updates also patch this tick's in-memory view", /for \(const a of added\) matches\.push\(a\);/.test(provSeg15));
check("#cupscan status/score updates preserved as row overlays", /Object\.assign\(\{\}, m, \{ status: u\.status, score: u\.score \}\)/.test(provSeg15));

// #buttons (v13.49-buttons): the bot is tappable, not slash-only — every
// command reply re-attaches the persistent keyboard (it re-expands if the
// user collapsed it), /teams carries an inline toggle grid, /timezone a
// quick-pick grid, and the callback handlers cover tf:/tz: callbacks.
const botBtnSeg = (src.split("// ===== src/bot.ts =====")[1] || "").split("// ===== src/cron.ts =====")[0];
check("#buttons replyKeyboard has a Timezone button (fa+en)", /"\\u0632\\u0645\\u0627\\u0646"/.test(botBtnSeg) && /Timezone/.test(botBtnSeg));
check("#buttons normalizeCommand maps the Timezone labels", /"\\u0632\\u0645\\u0627\\u0646": "\/timezone"/.test(botBtnSeg) && /Timezone": "\/timezone"/.test(botBtnSeg));
check("#buttons /teams grid builders exist (text + keyboard)", /function teamsMessageText\(/.test(botBtnSeg) && /function teamsGridKeyboard\(/.test(botBtnSeg));
check("#buttons tz picker builders exist (text + keyboard)", /function tzStatusText\(/.test(botBtnSeg) && /function tzPickerKeyboard\(/.test(botBtnSeg));
check("#buttons callback handlers cover tf: and tz: callbacks", /tft = data\.match\(\/\^tf:\(\\d\+\|all\)\$\/\)/.test(botBtnSeg) && /tzt = data\.match\(\/\^tz:\(\[a-z0-9\\-\]\+\)\$\/\)/.test(botBtnSeg));
check("#buttons editMessageText sender exists in telegram.ts", (src.match(/\/\/ ===== src\/telegram\.ts =====[\s\S]*?(?=\/\/ ===== src\/)/) || [""])[0].includes("editMessageText"));
const kbAttaches = (botBtnSeg.match(/chatId, replyKeyboard\(lang\)/g) || []).length;
check("#buttons every bot reply re-attaches the keyboard (>= 10 sites)", kbAttaches >= 10);
check("#buttons min-one guard on team toggles", /Keep at least one team/.test(botBtnSeg) && /\\u062D\\u062F\\u0627\\u0642\\u0644/.test(botBtnSeg));

// #seams (v13.47-seams): the modularization must not silently lose concat
// coverage — worker-src.js silently skips missing files (fs.existsSync), so
// a forgotten file = regexes still pass while a whole module went dark.
// Lock the order list itself + the key structural moves.
const fs14 = require("fs");
const path14 = require("path");
const harness14 = fs14.readFileSync(path14.join(__dirname, "lib", "worker-src.js"), "utf8");
for (const f of ["tables.ts", "monitoring.ts", "migration.ts", "auth.ts", "public-swr.ts", "card-route.ts", "simulate.ts", "admin-ops.ts"]) {
  check("#seams harness order includes " + f, new RegExp('"' + f.replace(".", "\\.") + '"').test(harness14));
}
check("#seams bot.ts stays immediately before cron.ts (botSeg boundary)", harness14.indexOf('"bot.ts"') < harness14.indexOf('"cron.ts"') && harness14.indexOf('"bot.ts"') > harness14.indexOf('"public-matches.ts"'));
check("#seams POST_GATE_ROUTES spreads ADMIN_OPS_ROUTES (\u2026first)", /\.\.\.ADMIN_OPS_ROUTES,/.test(src));
check("#seams POST_GATE_ROUTES includes SIMULATE_ROUTE", /SIMULATE_ROUTE,/.test(src));
check("#seams the * catch-all stays in api.ts's own table", /\{ path: "\*", handler: legacyGetAction \},/.test(src));
// slices: config keeps the contract; tables owns the moved dictionaries.
const cfgSeg14 = (src.match(/\/\/ ===== src\/config\.ts =====[\s\S]*?(?=\/\/ ===== src\/)/) || [""])[0];
const tablesSeg14 = (src.match(/\/\/ ===== src\/tables\.ts =====[\s\S]*?(?=\/\/ ===== src\/)/) || [""])[0];
check("#seams config.ts keeps VERSION + CONFIG (X_CONFIG retired at 13.48-xtrim)", /var VERSION =/.test(cfgSeg14) && /var CONFIG =/.test(cfgSeg14) && !/var X_CONFIG =/.test(cfgSeg14));
check("#seams config.ts no longer owns COMP_EN/PAGE_SEC_HEADERS", !/var COMP_EN =/.test(cfgSeg14) && !/var PAGE_SEC_HEADERS =/.test(cfgSeg14));
check("#seams tables.ts owns COMP_EN + PAGE_SEC_HEADERS + UCL_LOGO_CHIP", /var COMP_EN =/.test(tablesSeg14) && /var PAGE_SEC_HEADERS =/.test(tablesSeg14) && /var UCL_LOGO_CHIP =/.test(tablesSeg14));
// monitoring + migration slices
const monSeg14 = (src.match(/\/\/ ===== src\/monitoring\.ts =====[\s\S]*?(?=\/\/ ===== src\/)/) || [""])[0];
check("#seams monitoring.ts owns getCronStatus + alertPhaseError + liveFingerprint", /async function getCronStatus\(env\)/.test(monSeg14) && /async function alertPhaseError\(env, phase, err\)/.test(monSeg14) && /function liveFingerprint\(list\)/.test(monSeg14));
const migSlice14 = (src.match(/\/\/ ===== src\/migration\.ts =====[\s\S]*?(?=\/\/ ===== src\/)/) || [""])[0];
check("#seams migration.ts owns maybeBroadcastMigration (the mig_sent_v1 dedupe)", /async function maybeBroadcastMigration\(env\)/.test(migSlice14) && /mig_sent_v1/.test(migSlice14));
check("#seams cronSeg no longer contains the migration broadcast", !/mig_sent_v1/.test(cronSeg));
check("#seams cron.ts still owns the meter + completion blob (kvWritesThisTick)", /kvWritesThisTick\+\+/.test(cronSeg) && /kv_writes_last_tick: kvWritesThisTick \+ 1/.test(cronSeg));
// auth + swr + card-route slices
const authSeg14 = (src.match(/\/\/ ===== src\/auth\.ts =====[\s\S]*?(?=\/\/ ===== src\/)/) || [""])[0];
check("#seams auth.ts owns the admin_auth cookie writes", /admin_auth=/.test(authSeg14) && /login_fail_/.test(authSeg14));
const swrSeg14 = (src.match(/\/\/ ===== src\/public-swr\.ts =====[\s\S]*?(?=\/\/ ===== src\/)/) || [""])[0];
check("#seams public-swr.ts owns the SWR windows (FRESH_MS/STALE_GRACE_MS)", /FRESH_MS = 3e5/.test(swrSeg14) && /STALE_GRACE_MS = 6e5/.test(swrSeg14));
const cardSeg14 = (src.match(/\/\/ ===== src\/card-route\.ts =====[\s\S]*?(?=\/\/ ===== src\/)/) || [""])[0];
check("#seams card-route.ts owns the card lookup pools", /\/api\/card\//.test(cardSeg14) && /renderCardPngCached/.test(cardSeg14));
const adminOpsSeg14 = (src.match(/\/\/ ===== src\/admin-ops\.ts =====[\s\S]*?(?=\/\/ ===== src\/)/) || [""])[0];
check("#seams admin-ops.ts owns the override route TOGETHER with its guards", adminOpsSeg14.indexOf('"/api/fa-teams/override"') > -1 && /isValidFaName\(fa\)/.test(adminOpsSeg14) && /isAdminAuthed\(req,\s*env\)/.test(adminOpsSeg14));
check("#seams admin-ops.ts owns legacyGetAction", /async function legacyGetAction\(c/.test(adminOpsSeg14));
const simSeg14 = (src.match(/\/\/ ===== src\/simulate\.ts =====[\s\S]*?(?=\/\/ ===== src\/)/) || [""])[0];
check("#seams simulate.ts owns the SIMULATE_ROUTE entry + buildDummyMatches call", /SIMULATE_ROUTE: RouteDef = \{/.test(simSeg14) && /buildDummyMatches\(\)/.test(simSeg14));
// api.ts keeps its invariants through the split
check("#seams scheduled() handler stays in api.ts (dead man's switch)", /await executeScheduledLogic\(env\);[\s\S]{0,500}pingHealthcheck\(env, ctx, true\);/.test(src));
check("#seams healthz route stays in api.ts's table", (src.match(/\/\/ ===== src\/api\.ts =====[\s\S]*?(?=\/\/ ===== src\/pages)/) || [""])[0].includes('"/healthz"'));
// #seams-hole (found live 2026-09-17T17:52Z, the 1101 incident): array
// elisions (`,,`) from entry joins are LEGAL TypeScript and invisible to
// every concat regex — they only explode at runtime (route === undefined
// -> TypeError -> 1101 on every request). Ban them across the concat and
// pin the entry/terminator counts so a join bug can never ship silently.
check("#seams zero array elisions (,,) in the concat", !/,(\s|\n)*,/.test(src));
const aoEntries14 = (adminOpsSeg14.match(/\{ path: "/g) || []).length;
const aoTerms14 = (adminOpsSeg14.match(/^  \} \},$/gm) || []).length;
check("#seams ADMIN_OPS_ROUTES: every entry has exactly one terminator (no holes)", aoEntries14 > 0 && aoTerms14 === aoEntries14);


// #xtrim (v13.48-xtrim): the X (Twitter) path is REMOVED, not dormant —
// no x.ts in the bundle, no X routes, no X UI, no X harness entry. X never
// ran in production (no X_* secrets were set, x_enabled_v1 never written);
// the restore path is documented in src/config.ts.
check("#xtrim concat has no src/x.ts segment", !/\/\/ ===== src\/x\.ts =====/.test(src));
check("#xtrim no X functions anywhere (maybePostX/getXStatus/xTestPost)", !/maybePostX|maybePostXWeekly|getXStatus|xTestPost|xSendOrDryRun|xPostTweet/.test(src));
check("#xtrim no X_CONFIG anywhere", !/var X_CONFIG =|X_CONFIG\./.test(src));
check("#xtrim admin-ops has no /api/x/ or /admin/x-test routes", !/path: "\/api\/x\//.test(adminOpsSeg14) && !/path: "\/admin\/x-test/.test(adminOpsSeg14));
check("#xtrim admin page has no X card (loadXStatus/btnX)", !/loadXStatus|btnXTest|btnXClearPause/.test(src));
check("#xtrim cron has no X sweep phase", !/maybePostX|X sweep:|X post step/.test(cronSeg));
check("#xtrim harness order no longer ships x.ts", !/"x\.ts"/.test(harness14));


console.log(failed ? failed + " FAILURES" : "reliability invariants OK");
process.exit(failed ? 1 : 0);
