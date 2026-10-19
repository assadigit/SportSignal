// vlm-ping.js — ONE VLM call, NO retry ladder (the lib/vlm.js ladder waits
// out 429 storms for up to 8.5 minutes — exactly wrong for a bucket probe).
// Exit 0 = bucket open (prints the style), exit 3 = throttled/closed.
// Usage: node scripts/uefa-player-portraits/vlm-ping.js [file.webp]
"use strict";
const path = require("path");
const { zai } = require("./lib/vlm");

async function main() {
  const file = process.argv[2] || path.join(__dirname, "..", "..", "assets", "players", "uefa", "harry-kane.webp");
  const client = await zai();
  if (!client) { console.log("NO_SDK"); process.exit(3); }
  const fs = require("fs");
  const buf = fs.readFileSync(file);
  const dataUrl = `data:image/webp;base64,${buf.toString("base64")}`;
  try {
    const res = await client.chat.completions.createVision({
      messages: [{
        role: "user",
        content: [
          { type: "text", text: 'Classify this footballer portrait. Strict JSON: {"style":"jersey_photo|bust_photo|head_photo|card_render"}' },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      }],
      thinking: { type: "disabled" },
    });
    const content = res && res.choices && res.choices[0] && res.choices[0].message && res.choices[0].message.content;
    console.log("OPEN:", String(content || "").slice(0, 120));
    process.exit(0);
  } catch (e) {
    const msg = String(e && e.message || e);
    console.log(/429/.test(msg) ? "THROTTLED" : "ERROR: " + msg.slice(0, 120));
    process.exit(/429/.test(msg) ? 3 : 3);
  }
}
main();
