// Operator tool: register the bot's "/" command menu (setMyCommands) NOW —
// outside the worker. The command lists are the SOURCE OF TRUTH in
// src/telegram.ts (BOT_MENU_* constants); this script re-uses them via the
// harness transform (scripts/lib/worker-src.js) so there is exactly one
// place to edit the menu. The worker itself re-registers on every version
// bump (ensureBotMenu, KV bot_menu_v1) — this script is for manual runs:
//
//   BOT_TOKEN=<token> [CHAT_ID=<admin chat id>] node scripts/set-bot-commands.js
//
// Registers: fa default scope, en (language_code) default scope, and (when
// CHAT_ID is given) the admin toolbelt for that chat in both languages.
"use strict";
const path = require("path");
const workerSrc = require("./lib/worker-src");

async function main() {
  const TOKEN = process.env.BOT_TOKEN || process.argv[2];
  const ADMIN = process.env.CHAT_ID || process.argv[3] || null;
  if (!TOKEN) {
    console.error("usage: BOT_TOKEN=<token> [CHAT_ID=<admin chat id>] node scripts/set-bot-commands.js");
    process.exit(1);
  }
  const src = workerSrc();
  const grab = (re) => { const m = src.match(re); return m ? m[0] : null; };
  const pieces = [
    grab(/var BOT_MENU_FA = \[[\s\S]*?\];/),
    grab(/var BOT_MENU_EN = \[[\s\S]*?\];/),
    grab(/var BOT_MENU_ADMIN_FA = BOT_MENU_FA\.concat\(\[[\s\S]*?\]\);/),
    grab(/var BOT_MENU_ADMIN_EN = BOT_MENU_EN\.concat\(\[[\s\S]*?\]\);/)
  ];
  if (pieces.some((p) => !p)) {
    console.error("FAIL: could not find the BOT_MENU_* constants in the harness source (src/telegram.ts)");
    process.exit(1);
  }
  const menus = eval("(() => { " + pieces.join("\n") + "\n; return { BOT_MENU_FA, BOT_MENU_EN, BOT_MENU_ADMIN_FA, BOT_MENU_ADMIN_EN }; })()");
  const api = (method, body) => fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  }).then((r) => r.json());
  const jobs = [
    ["setMyCommands", { commands: menus.BOT_MENU_FA }],
    ["setMyCommands", { commands: menus.BOT_MENU_EN, language_code: "en" }]
  ];
  if (ADMIN) {
    jobs.push(["setMyCommands", { commands: menus.BOT_MENU_ADMIN_FA, scope: { type: "chat", chat_id: Number(ADMIN) } }]);
    jobs.push(["setMyCommands", { commands: menus.BOT_MENU_ADMIN_EN, scope: { type: "chat", chat_id: Number(ADMIN) }, language_code: "en" }]);
  }
  for (const [method, body] of jobs) {
    const r = await api(method, body);
    const label = method + (body.language_code ? " (" + body.language_code + ")" : "") + (body.scope ? " [chat " + body.scope.chat_id + "]" : "");
    console.log((r && r.ok ? "OK   " : "FAIL ") + label + " — " + (body.commands ? body.commands.length : "?") + " commands");
    if (!r || !r.ok) { console.error(JSON.stringify(r)); process.exit(1); }
  }
  // Verify what the default scope now holds.
  const got = await api("getMyCommands", {});
  console.log("getMyCommands (default): " + (got && got.ok ? got.result.map((c) => "/" + c.command).join(" ") : JSON.stringify(got)));
  if (ADMIN) {
    const gotA = await api("getMyCommands", { scope: { type: "chat", chat_id: Number(ADMIN) } });
    console.log("getMyCommands (admin chat): " + (gotA && gotA.ok ? gotA.result.map((c) => "/" + c.command).join(" ") : JSON.stringify(gotA)));
  }
}

main().catch((e) => { console.error("Script error: " + e.message); process.exit(1); });
