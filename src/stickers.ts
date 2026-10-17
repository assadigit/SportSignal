// SportSignal — v13.114-stickers: the league-logo sticker pack
// (v13.115: rebuilt from the owner's ORIGINAL white-background PNGs —
// the backgrounds were intentional, the first pass wrongly stripped them).
//
// The owner's rule: pictures ride TELEGRAM's own infrastructure, not the
// worker's. The pack (t.me/addstickers/sportsignal_leagues_by_...)
// lives on Telegram's CDN — created ONCE by scripts/make-sticker-pack.js
// from assets/stickers/*.png (512×512, WHITE background — v13.115: the
// owner's logos are intentional white-background recreations, kept as
// uploaded; ≤512KB each). The worker NEVER carries the PNG bytes, never
// renders, never uploads: sending is one sendSticker call with a cached
// file_id — a single subrequest, zero bytes of ours, zero CPU.
//
// KV stickers_v1 = { "PL": "<file_id>", "PD": … } — the file_id map
// harvested from getStickerSet at pack-creation time (set position order =
// STICKER_LEAGUE_CODES). Leagues without a sticker (PGL, CL, …) simply
// skip the logo — fail-open by design: the table message behind it is the
// real payload, the sticker is the flourish.

import { CONFIG } from "./config";
import type { Env } from "./types";

// Per-isolate memo (the KV-webmeter pattern, read-side): the digest is a
// single burst, and /tables re-invocations inside 10 minutes reuse the map.
var STICKER_MEMO: { at: number; map: any } | null = null;

// Pure parse (exported for the harness): accepts the raw KV string and
// returns only well-formed code→file_id pairs for codes we can draw.
// Anything else — garbage JSON, stale shapes, non-league codes (an "AL"
// someone might add by hand) — degrades to {} (no stickers, tables only).
export function parseStickerMap(raw) {
  try {
    const o = raw ? JSON.parse(raw) : null;
    const out: any = {};
    for (const code of CONFIG.STICKER_LEAGUE_CODES) {
      const fid = o && typeof o[code] === "string" && o[code].length >= 20 ? o[code] : null;
      if (fid) out[code] = fid;
    }
    return out;
  } catch (e) {
    return {};
  }
}

// The code→file_id map for the senders. One KV read per burst, memoized
// 10 minutes. Never rejects (a KV hiccup = a sticker-less digest, never a
// missed table).
export async function getLeagueStickers(env: Env) {
  if (STICKER_MEMO && Date.now() - STICKER_MEMO.at < 6e5) return STICKER_MEMO.map;
  let raw: any = null;
  try {
    raw = await env.STATE.get(CONFIG.KV_STICKERS);
  } catch (e) {
    raw = null;
  }
  const map = parseStickerMap(typeof raw === "string" ? raw : null);
  STICKER_MEMO = { at: Date.now(), map };
  return map;
}
