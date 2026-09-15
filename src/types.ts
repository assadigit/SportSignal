// SportSignal — the Worker environment contract.
//
// KV reads return `any` deliberately (the payloads are heterogeneous and
// validated at their consumption sites). The v13.0 extraction-era domain
// interfaces (Match/TeamRef/StandingsTable/…) were removed in v13.46-trim —
// nothing imported them; Env is the only contract the modules share.
// types.ts is NOT part of the eval-harness concat (scripts/lib/worker-src.js)
// — it exists for tsc only.

// ---------- Worker environment ----------
export interface LooseKV {
  get(key: string): Promise<string | null>;
  get(key: string, type: "json"): Promise<any>;
  get(key: string, type: "text"): Promise<string | null>;
  get(key: string, type: "arrayBuffer"): Promise<ArrayBuffer | null>;
  get(key: string, type: "stream"): Promise<ReadableStream | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number; metadata?: any }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface WorkersAI {
  run(model: string, inputs: any, opts?: any): Promise<any>;
}

export interface Env {
  STATE: LooseKV;
  AI?: WorkersAI;
  // secrets (wrangler secret put …)
  BOT_TOKEN?: string;
  CHAT_ID?: string;
  API_TOKEN?: string;
  ADMIN_TOKEN?: string;
  ADMIN_PASS?: string;
  WEBHOOK_SECRET?: string;
  HEALTHCHECK_PING_URL?: string;
  // X (Twitter) OAuth 1.0a keys
  X_API_KEY?: string;
  X_API_SECRET?: string;
  X_ACCESS_TOKEN?: string;
  X_ACCESS_TOKEN_SECRET?: string;
  X_ENABLED?: string;
  X_DRY_RUN?: string;
  // vars
  TEHRAN_TZ?: string;
  // v13.5-sim-scope: request-scoped KV-key overrides. /api/simulate passes a
  // CLONED env carrying these, so notification/prefs state is isolated to the
  // simulation without mutating the shared CONFIG at runtime (isolate-safety:
  // a concurrent cron sweep must never observe the test keys).
  SIM_NOTIFIED_KEY?: string;
  SIM_PREFS_KEY?: string;
  // v13.44-quotaguard: cron-scoped flag — the tick governor sets it (on a
  // CLONED env) when the day's KV-write burn crosses KV_WRITES_HARD, so
  // cacheMatches defers the pool-cache write. Cosmetic-write shedding only;
  // the anti-spam paths never read it.
  KV_BUDGET_HOLD?: boolean;
}

// v13.47-seams: router context/route types (moved from api.ts — shared by
// api.ts, admin-ops.ts and simulate.ts).
export type RouteCtx = { req: Request; env: Env; url: URL };
export type RouteDef = {
  path: string; // exact pathname, or "*" for the legacy catch-all
  method?: string; // undefined = any method
  handler: (c: RouteCtx) => Promise<Response | null> | Response | null;
};
