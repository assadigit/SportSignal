// SportSignal — IndexNow (F-16). Pings api.indexnow.org when URLs change
// (Bing, Yandex and other participants pick them up fast; Google does not
// use IndexNow). Batching: max 10,000 URLs per POST; we cap far lower and
// rate-limit to one ping per 15 minutes via a KV stamp so sitemap rebuilds
// can never spam the endpoint.

import { SEO } from "./config";
import type { Env } from "../types";

const PING_MIN_GAP_MS = 15 * 60 * 1000;

export async function pingIndexNowIfChanged(env: Env, urls: string[]): Promise<{ ok: boolean; sent: number; reason?: string }> {
  if (!SEO.INDEXNOW_ENABLED || !Array.isArray(urls) || !urls.length) return { ok: false, sent: 0, reason: "disabled or empty" };
  const list = urls.slice(0, 1000).filter((u) => typeof u === "string" && /^https:\/\/sportsignal\.ir\//.test(u));
  if (!list.length) return { ok: false, sent: 0, reason: "no canonical urls" };
  try {
    const last = await env.STATE.get(SEO.KV_SEO_INDEXNOW).catch(() => null);
    if (last && Date.now() - parseInt(last) < PING_MIN_GAP_MS) {
      // Rate-limited: park the URLs for the next window (bounded list).
      const parked = await env.STATE.get(SEO.KV_SEO_INDEXNOW + ":park", "json").catch(() => null);
      const merged = Array.from(new Set(((parked && parked.urls) || []).concat(list))).slice(0, 1000);
      await env.STATE.put(SEO.KV_SEO_INDEXNOW + ":park", JSON.stringify({ urls: merged }), { expirationTtl: 3600 }).catch(() => { });
      return { ok: false, sent: 0, reason: "rate-limited (parked " + merged.length + ")" };
    }
    const body = JSON.stringify({ host: SEO.CANONICAL_HOST, key: SEO.INDEXNOW_KEY, keyLocation: SEO.SITE_URL + "/" + SEO.INDEXNOW_KEY + ".txt", urlList: list });
    const res = await fetch(SEO.INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body
    });
    await env.STATE.put(SEO.KV_SEO_INDEXNOW, String(Date.now()), { expirationTtl: 86400 }).catch(() => { });
    return { ok: res.ok, sent: list.length, reason: "HTTP " + res.status };
  } catch (e: any) {
    return { ok: false, sent: 0, reason: e.message };
  }
}
