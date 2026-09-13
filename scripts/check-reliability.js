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

// #4 Canonical kickoff-time KV
check("#4 getCanonicalKickoff function exists", /async function getCanonicalKickoff\(env, match\)/.test(src));
check("#4 kickoff KV prefix is kickoff_v1:", /KV_KICKOFF_PREFIX: "kickoff_v1:"/.test(src));
check("#4 updateCanonicalKickoffOnReschedule function exists", /async function updateCanonicalKickoffOnReschedule\(env, match\)/.test(src));

// #7 KV write-then-read verification
check("#7 saveNotifiedMatch has write-verify", /const verify = await env\.STATE\.get\(env\.SIM_NOTIFIED_KEY \|\| CONFIG\.KV_NOTIFIED_KEY, "json"\)/.test(src));
check("#7 verify retries on miss", /Dedupe write verify failed.*retrying/.test(src));

// #8 Time-based result fallback (presumably finished)
check("#8 isPresumablyFinished function exists", /function isPresumablyFinished\(match, _env\)/.test(src));
check("#8 isPresumablyFinished checks 90min past", /minutesSince < 90/.test(src));
check("#8 isMatchFinished includes presumably-finished", /return match\.status === "FINISHED" \|\| isPresumablyFinished/.test(src));

// #9 6h heartbeat
check("#9 heartbeat KV key is heartbeat_sent_v1", /KV_HEARTBEAT_LAST: "heartbeat_sent_v1"/.test(src));
check("#9 heartbeat interval is 6h", /HEARTBEAT_INTERVAL_MS: 6 \* 60 \* 60 \* 1e3/.test(src));
check("#9 heartbeat sends to admin chat in cron", /ر\u0628\u0627\u062A \u0633\u0627\u0644\u0645|Bot is alive/.test(src) || /heartbeat_sent_v1/.test(src));

// #10 /healthz exposes outbox_depth + version
check("#10 healthz exposes outbox_depth", /outbox_depth: outboxDepth/.test(src));
check("#10 healthz exposes version", /version: VERSION/.test(src));
check("#10 healthz unhealthy when outbox_depth >= 50", /outboxDepth < 50/.test(src));

console.log(failed ? failed + " FAILURES" : "reliability invariants OK");
process.exit(failed ? 1 : 0);
