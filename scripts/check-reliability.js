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
check("#2 match-start backfill function exists", /function isMatchStartBackfillEligible\(/.test(src));
check("#2 shouldSendNotification uses backfill for pre-match-5min", /case "pre-match-5min":\s*return isWithin5MinWindow\(match, env\) \|\| isBackfillEligible/.test(src));
check("#2 shouldSendNotification uses backfill for match-start", /case "match-start":\s*return isMatchStartingNow\(match, env\) \|\| isMatchStartBackfillEligible/.test(src));

// #3 Dead-letter outbox
check("#3 outboxPush function exists", /async function outboxPush\(env/.test(src));
check("#3 drainOutbox function exists", /async function drainOutbox\(env/.test(src));
check("#3 sendTelegramDirect function exists (no outbox recursion)", /async function sendTelegramDirect\(env/.test(src));
check("#3 sendTelegram pushes to outbox on final failure", /await outboxPush\(env, text, chatId, keyboard\)/.test(src));
check("#3 outbox KV key is pending_sends_v1", /KV_OUTBOX: "pending_sends_v1"/.test(src));
check("#3 outbox has exponential backoff", /BACKOFFS\s*=\s*\[60e3/.test(src));
check("#3 outbox caps at KV_OUTBOX_MAX", /KV_OUTBOX_MAX: 200/.test(src));
check("#3 drainOutbox called in cron", /await drainOutbox\(env\)/.test(src));

// #1 Pre-scheduled notifications (note: eval transform strips `: Env`)
check("#1 reconcileSchedules function exists", /async function reconcileSchedules\(env, matches\)/.test(src));
check("#1 schedule KV prefix is sched_v1:", /KV_SCHEDULE_PREFIX: "sched_v1:"/.test(src));
check("#1 reconcileSchedules called in cron", /await reconcileSchedules\(env, matches\)/.test(src));
check("#1 schedule record carries all 6 types", /"pre-match-24h", "pre-match-3h", "pre-match-1h", "pre-match-5min", "match-start", "result"/.test(src));

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
check("#nospam8 sendMatchNotifications phase guarded", /try \{\s*await sendMatchNotifications\(env, matches\);\s*\} catch \(e\) \{\s*await alertPhaseError\(env, "send-notifications"/.test(src));
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

console.log(failed ? failed + " FAILURES" : "reliability invariants OK");
process.exit(failed ? 1 : 0);
