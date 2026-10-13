// SportSignal — the provider circuit breaker: per-provider suspension
// markers (prov_down_<key>, KV TTL) that gate sweeps when a provider is
// 429-exhausted or hard-down. Fail-closed on read errors (a broken marker
// read = not suspended = the provider gets retried). Extracted from
// providers.ts in v13.74-providersplit.
import { CONFIG } from "./config";
import type { Env } from "./types";

export async function providerSuspended(env: Env, key) {
  const until = parseInt(await env.STATE.get("prov_down_" + key).catch(() => null)) || 0;
  return Date.now() < until;
}
export async function suspendProvider(env: Env, key, ms?) {
  const ttl = Math.ceil((ms || CONFIG.PROVIDER_SUSPEND_MS) / 1e3) + 60;
  await env.STATE.put("prov_down_" + key, String(Date.now() + (ms || CONFIG.PROVIDER_SUSPEND_MS)), { expirationTtl: ttl }).catch(() => {
  });
}
export async function clearProviderSuspension(env: Env, key) {
  await env.STATE.delete("prov_down_" + key).catch(() => {
  });
}
