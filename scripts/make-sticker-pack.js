// Operator tool: (re)build the league-logo sticker pack — the owner's
// "pictures ride Telegram's own infrastructure" rule. Reads the 512×512
// PNGs from assets/stickers/ (THE source of truth in the repo — WHITE
// background kept as the owner uploaded it, v13.115: the first pass
// wrongly flood-filled it away; only the LANCZOS 512 resize is applied),
// creates the pack once via createNewStickerSet, harvests the per-league
// file_ids from getStickerSet (set position order = STICKER_MAP below) and
// writes them to KV stickers_v1 (the key the worker's getLeagueStickers
// reads). After the one-time creation the worker NEVER needs the PNGs
// again — every send is a sendSticker with a cached file_id.
//
//   BOT_TOKEN=<token> OWNER_ID=<owner user id> \
//   CF_API_TOKEN=<kv-write token> CF_ACCOUNT_ID=<acc> KV_NAMESPACE_ID=<ns> \
//   node scripts/make-sticker-pack.js [--recreate]
//
// --recreate: delete the pack first (deleteStickerSet) and rebuild it from
// the assets — the way to change a logo or the sticker order (file_ids are
// position-mapped, so ANY pack content change needs a rebuild).
//
// OWNER_ID must be a HUMAN user who has interacted with the bot (the pack's
// owner — Telegram rejects bots as owners with USER_IS_BOT). KV write args
// are optional: without them the script still prints the file_id JSON for a
// manual `wrangler kv:key put`.
"use strict";
const fs = require("fs");
const path = require("path");

// The pack identity (must match src/config.ts STICKER_SET_URL / KV_STICKERS).
const SET_NAME = "sportsignal_leagues_by_SportSignalAlertsBot";
const SET_TITLE = "SportSignal League Logos";
const KV_KEY = "stickers_v1";

// code → asset file. ARRAY ORDER = PACK POSITION ORDER = the harvest order.
// Add a league here (+ the PNG in assets/stickers/) and re-run --recreate.
const STICKER_MAP = [
  { code: "PL", file: "pl.png", emoji: ["⚽", "🦁"], keywords: ["Premier League", "England"] },
  { code: "PD", file: "pd.png", emoji: ["⚽", "🇪🇸"], keywords: ["LaLiga", "Spain"] },
  { code: "SA", file: "sa.png", emoji: ["⚽", "🇮🇹"], keywords: ["Serie A", "Italy"] },
  { code: "BL1", file: "bl1.png", emoji: ["⚽", "🇩🇪"], keywords: ["Bundesliga", "Germany"] },
  { code: "FL1", file: "fl1.png", emoji: ["⚽", "🇫🇷"], keywords: ["Ligue 1", "France"] }
];

async function main() {
  const TOKEN = process.env.BOT_TOKEN;
  const OWNER = process.env.OWNER_ID;
  const recreate = process.argv.includes("--recreate");
  if (!TOKEN) {
    console.error("usage: BOT_TOKEN=<token> OWNER_ID=<owner user id> [CF_API_TOKEN=… CF_ACCOUNT_ID=… KV_NAMESPACE_ID=…] node scripts/make-sticker-pack.js [--recreate]");
    process.exit(1);
  }
  const api = (method, body) => fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body || {})
  }).then((r) => r.json());

  const dir = path.join(__dirname, "..", "assets", "stickers");
  for (const s of STICKER_MAP) {
    const p = path.join(dir, s.file);
    if (!fs.existsSync(p)) { console.error(`FAIL: missing asset ${p}`); process.exit(1); }
    const sz = fs.statSync(p).size;
    if (sz > 512 * 1024) { console.error(`FAIL: ${s.file} is ${Math.round(sz / 1024)}KB (>512KB Telegram cap)`); process.exit(1); }
  }

  // 1) exists?
  let cur = await api("getStickerSet", { name: SET_NAME });
  if (cur.ok && recreate) {
    console.log("deleting existing pack (--recreate)…");
    const del = await api("deleteStickerSet", { name: SET_NAME });
    if (!del.ok) { console.error("deleteStickerSet failed:", del.description); process.exit(1); }
    cur = { ok: false };
  }
  if (cur.ok) {
    const n = cur.result.stickers.length;
    if (n !== STICKER_MAP.length) {
      console.error(`FAIL: pack has ${n} stickers, STICKER_MAP has ${STICKER_MAP.length}. file_ids are position-mapped, so any content/order change needs --recreate.`);
      process.exit(1);
    }
    console.log(`pack exists with ${n} stickers — harvesting file_ids by position.`);
  } else {
    // 2) create (multipart: stickers JSON with attach:// refs + file parts)
    if (!OWNER) { console.error("FAIL: pack not found and OWNER_ID not given (creation needs a human owner)"); process.exit(1); }
    console.log("creating pack…");
    const fd = new FormData();
    fd.append("user_id", String(OWNER));
    fd.append("name", SET_NAME);
    fd.append("title", SET_TITLE);
    fd.append("stickers", JSON.stringify(STICKER_MAP.map((s) => ({
      sticker: "attach://" + s.code, emoji_list: s.emoji, format: "static", keywords: s.keywords
    }))));
    for (const s of STICKER_MAP) fd.append(s.code, new Blob([fs.readFileSync(path.join(dir, s.file))], { type: "image/png" }), s.file);
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/createNewStickerSet`, { method: "POST", body: fd }).then((r) => r.json());
    if (!res.ok) { console.error("createNewStickerSet failed:", res.description); process.exit(1); }
    console.log("pack created:", `https://t.me/addstickers/${SET_NAME}`);
  }

  // 3) harvest file_ids by position order
  const set = await api("getStickerSet", { name: SET_NAME });
  if (!set.ok) { console.error("getStickerSet failed:", set.description); process.exit(1); }
  const map = {};
  STICKER_MAP.forEach((s, i) => {
    const st = set.result.stickers[i];
    if (!st) { console.error(`FAIL: pack position ${i} (${s.code}) missing`); process.exit(1); }
    map[s.code] = st.file_id;
  });
  const json = JSON.stringify(map);
  console.log("file_id map:", json);

  // 4) KV write (optional creds; otherwise print for manual wrangler put)
  if (process.env.CF_API_TOKEN && process.env.CF_ACCOUNT_ID && process.env.KV_NAMESPACE_ID) {
    const r = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/storage/kv/namespaces/${process.env.KV_NAMESPACE_ID}/values/${KV_KEY}`,
      { method: "PUT", headers: { Authorization: "Bearer " + process.env.CF_API_TOKEN, "Content-Type": "text/plain" }, body: json }
    ).then((r) => r.json());
    if (!r.success) { console.error("KV write failed:", JSON.stringify(r.errors)); process.exit(1); }
    console.log(`KV ${KV_KEY} written.`);
  } else {
    console.log(`KV creds absent — write manually:\n  wrangler kv:key put --namespace-id <ns> ${KV_KEY} '${json}'`);
  }
  console.log("done.");
}

main().catch((e) => { console.error("ERROR", e); process.exit(1); });
