// check-sameflow.js — v13.102: the SAME-FLOW audit (agenda: "admin must
// receive the same timing + content as ordinary users on every public
// surface"). Two layers:
//
//   1. STATIC: every Telegram-send call site in src/*.ts is classified.
//      A send site is either
//        (a) a FAN-OUT site — its target is derived from the chat registry /
//            follower sets / the commanding user's own chat id, or
//        (b) an ADMIN-ONLY site — allowed ONLY from the audited allowlist
//            (the heartbeat, budget/stale/cap/audit/per-chat pages, phase
//            error pages, the admin toolbelt: join/leave pages, /admin
//            /members /status /broadcast).
//      Any NEW site that sends only to env.CHAT_ID (or an adminChat-derived
//      id) WITHOUT being allowlisted fails this gate — a public surface can
//      never silently become admin-only again.
//
//   2. BEHAVIORAL: the dynamic proof lives in check-lifecycle.js section F
//      (the admin chat receives every public surface an ordinary follower
//      chat receives, at the same ticks, and the heartbeat pages ONLY the
//      admin). This file pins the static structure that keeps it true.
const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "src");
const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith(".ts") && !f.startsWith("pages/")).sort();

// The admin-only surfaces (file → purposes). Anything that pages
// parseInt(env.CHAT_ID)/adminChat belongs here — BY DESIGN, documented:
const ADMIN_ONLY_ALLOWLIST = {
  "cron-preflight.ts": ["the HARD KV-budget page (once/12h)", "the stale-bot page (cron gap > 30min)"],
  "cron-users.ts": ["the 6h heartbeat page (the operator's dead-man switch)"],
  "monitoring.ts": ["alertPhaseError — guarded-phase failure pages (rate-limited)"],
  "notify-audit.ts": ["the per-match gap report (6h rate-limit)", "the per-chat delivery gap report (6h rate-limit)"],
  "users.ts": ["checkUserCap — the free-tier capacity warning"],
  "admin-bot.ts": ["notifyAdminUserJoined/Left pages", "the /admin /members /status /broadcast toolbelt replies"],
  "providers.ts": ["the all-sources-down degradation alert is FAN-OUT (all chats) — but its KV stamp write is admin-free; listed here for the alert's KV write only"]
};

// Fan-out target patterns: a send whose chat argument is one of these is a
// registry/follower/command-derived fan-out (or a 1:1 command reply).
const FANOUT_TARGET = /^(c|chat|chatId|id|cid|g\.chats\[i\]|bucket\.map|chats\.map|cbChatId2|chatId2?|member|m\.id)$/;

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) failed++;
};

// --- collect every send call site with its enclosing function ---
function enclosingFn(src, idx) {
  const upto = src.slice(0, idx);
  const lines = upto.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(/(?:export )?(?:async )?function (\w+)/);
    if (m) return m[1];
    const m2 = lines[i].match(/^\s*(\w+):\s*async/); // route handler object member
    if (m2) return m2[1] + " (route)";
  }
  return "<top-level>";
}

const sendRe = /\b(sendTelegram|sendDice|sendPhotoBinary|sendUclGifBanner|sendAnimation)\s*\(/g;
const sites = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(SRC_DIR, f), "utf8");
  let m;
  while ((m = sendRe.exec(src))) {
    const idx = m.index;
    // skip matches inside line comments (changelog mentions of the APIs)
    const lineStart = src.lastIndexOf("\n", idx) + 1;
    const before = src.slice(lineStart, idx);
    if (before.includes("//")) continue;
    // extract the call's argument list (balanced parens, string-aware)
    let depth = 0, j = src.indexOf("(", idx), started = false, inStr = null;
    for (; j < src.length; j++) {
      const ch = src[j];
      if (inStr) { if (ch === inStr && src[j - 1] !== "\\") inStr = null; continue; }
      if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; continue; }
      if (ch === "(") { depth++; started = true; }
      else if (ch === ")") { depth--;
        if (started && depth === 0) break;
      }
    }
    const args = src.slice(src.indexOf("(", idx) + 1, j);
    const parts = [];
    let d2 = 0, cur = "", str = null;
    for (const ch of args) {
      if (str) { cur += ch; if (ch === str && !cur.endsWith("\\" + str)) str = null; continue; }
      if (ch === '"' || ch === "'") { str = ch; cur += ch; continue; }
      if (ch === "(" || ch === "[" || ch === "{") d2++;
      if (ch === ")" || ch === "]" || ch === "}") d2--;
      if (ch === "," && d2 === 0) { parts.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    parts.push(cur.trim());
    // the chat-target argument index per API:
    //   sendTelegram(env, TEXT, chatId, kb?)      → parts[2]
    //   sendDice(env, chatId, emoji)              → parts[1]
    //   sendPhotoBinary(env, chatId, buf, ...)    → parts[1]
    //   sendUclGifBanner(env, chatId, caption)    → parts[1]
    //   sendAnimation(env, chatId, anim, caption) → parts[1]
    const chatArgIdx = m[1] === "sendTelegram" ? 2 : 1;
    const target = parts[chatArgIdx] || "";
    sites.push({ file: f, fn: enclosingFn(src, idx), api: m[1], target, raw: args.slice(0, 90) });
  }
}

check("the send-site scan found the full surface (>= 60 sites)", sites.length >= 60);

// --- classify ---
const adminish = (s) => /CHAT_ID|adminChat\b|adminChatId|admin\b/i.test(s.target) && !/chatId/i.test(s.target.split(".")[0] || "");
const fanout = (s) => FANOUT_TARGET.test(s.target.trim()) || /\bchatIds?\b|\bchats\b|\bcid\b|\.chats\b|bucket|members?\b|update\.message\.chat\.id|\bcbChatId/i.test(s.target);
const cmdReply = (s) => s.target === "chatId" || s.target === "chatId2" || s.target === "cbChatId2";

let unclassified = [];
let adminOnlyOk = 0;
let fanOutCount = 0;
for (const s of sites) {
  if (fanout(s) || cmdReply(s)) { fanOutCount++; continue; }
  if (adminish(s) || (ADMIN_ONLY_ALLOWLIST[s.file] && !fanout(s) && /admin/.test(s.target))) {
    if (ADMIN_ONLY_ALLOWLIST[s.file]) { adminOnlyOk++; continue; }
    unclassified.push(s);
    continue;
  }
  // anything else: inspect manually — report as suspicious
  unclassified.push(s);
}

check("every send site is classified: fan-out/command-reply or allowlisted admin-only", unclassified.length === 0);
for (const s of unclassified.slice(0, 8)) {
  console.log("     UNCLASSIFIED: " + s.file + " :: " + s.fn + " :: " + s.api + "(" + s.raw + "...)");
}
check("the admin-only allowlist covers every admin-paging site (9 surfaces today)", adminOnlyOk >= 9);
check("fan-out/command-reply sites dominate the surface (the bot is user-first)", fanOutCount >= 45);

// --- the allowlist itself must match reality (no stale entries) ---
for (const f of Object.keys(ADMIN_ONLY_ALLOWLIST)) {
  check("allowlist entry has a real file: " + f, fs.existsSync(path.join(SRC_DIR, f)));
}
const adminBotSrc = fs.readFileSync(path.join(SRC_DIR, "admin-bot.ts"), "utf8");
check("admin-bot: the /broadcast fan-out targets the REGISTRY (not env.CHAT_ID)", /const r = await sendTelegram\(env, safe, c\)/.test(adminBotSrc));
check("admin-bot: join/leave pages go to the admin only (by design)", /sendTelegram\(env, msg, admin\)/.test(adminBotSrc));

// --- the engine: followers + the per-chat ledger record every audience ---
const engineSrc = fs.readFileSync(path.join(SRC_DIR, "notify-engine.ts"), "utf8");
check("engine: the fan-out sends per chat-group member (never a single CHAT_ID)", /g\.chats\.map\(\(chatId\) => sendTelegram\(scopedEnv, message, chatId\)\)/.test(engineSrc) || /needText\.map\(\(chatId\) => sendTelegram\(scopedEnv, message, chatId\)\)/.test(engineSrc));
check("engine: the per-chat delivery ledger records every fan-out verdict", /await recordDeliveries\(env, match, config\.type, deliveries\)/.test(engineSrc));
check("engine: the repair leg re-sends to the MISSING chats only (late-tagged)", /repairPerChatGaps/.test(engineSrc) && /markDeliveryRepair\(env, match, ledgerType, chatId\)/.test(engineSrc));

// --- the digests: per-chat dedupe keys (one chat's success proves nothing
// about another's — the agenda-2 invariant) ---
const nightSrc = fs.readFileSync(path.join(SRC_DIR, "digest-night.ts"), "utf8");
const uclSrc = fs.readFileSync(path.join(SRC_DIR, "digest-uclnight.ts"), "utf8");
const morningSrc = fs.readFileSync(path.join(SRC_DIR, "digest-morning.ts"), "utf8");
check("night digest: per-chat dedupe key nightdigest_<date>_<chatId>", /"nightdigest_" \+ dateKey \+ "_" \+ c/.test(nightSrc));
check("UCL preview: per-chat dedupe key uclnight_<date>_<chatId>", /"uclnight_" \+ dateKey \+ "_" \+ c/.test(uclSrc));
check("morning digest: per-chat dedupe key digest_sent_<date>_<chatId>", /"digest_sent_" \+ dateKey \+ "_" \+ c/.test(morningSrc));
check("night digest: per-chat send inside the tz loop (no group-level gate)", /for \(const c of tzChats\) \{/.test(nightSrc) && /sendTelegram\(\{ \.\.\.env, TEHRAN_TZ: tz \}, msg, c\)/.test(nightSrc));

console.log(failed ? failed + " FAILURES" : "same-flow audit OK");
process.exit(failed ? 1 : 0);
