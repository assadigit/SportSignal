// SportSignal — core domain types.
//
// The extracted v12.33 bundle is untyped JS-in-TS; these interfaces type the
// domain model and the Worker environment WITHOUT changing any runtime
// behavior. KV reads return `any` deliberately (the payloads are heterogeneous
// and validated at their consumption sites, as in the original).

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

// ---------- football domain ----------
export interface TeamRef {
  name: string;
  crest?: string | null;
  faName?: string | null;
}

export interface CompetitionRef {
  code: string;
  name?: string;
  emblem?: string | null;
  faName?: string | null;
}

/** Home/away/draw score — null until played (or while fixture-only). */
export interface MatchScore {
  home: number | null;
  away: number | null;
  fullTime?: { home: number | null; away: number | null };
  halfTime?: { home: number | null; away: number | null };
}

export type MatchStatus =
  | "SCHEDULED" | "TIMED" | "LIVE" | "IN_PLAY" | "PAUSED"
  | "FINISHED" | "POSTPONED" | "SUSPENDED" | "CANCELLED" | string;

export interface ScorerEvent {
  minute?: number;
  scorer?: string;
  team?: "home" | "away";
  type?: "GOAL" | "PENALTY" | "OWN_GOAL" | string;
}

export interface Match {
  id: number | string | null;
  utcDate: string;
  status: MatchStatus;
  stage?: string | null;
  minute?: number | null;
  competition: CompetitionRef;
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  score?: MatchScore | null;
  venue?: string | null;
  scorers?: ScorerEvent[];
  derby?: boolean;
  top?: boolean;
}

// ---------- users / prefs ----------
export interface UserPrefs {
  teams?: string[];
  tz?: string | null;
  lang?: "fa" | "en";
}

export interface MemberProfile {
  username?: string | null;
  first_name?: string | null;
  title?: string | null;
  joined?: string;
}

// ---------- standings ----------
export interface StandingTeam {
  pos: number;
  name: string;
  faName?: string | null;
  points: number;
  played?: number | null;
  won?: number | null;
  draw?: number | null;
  lost?: number | null;
  gf?: number | null;
  ga?: number | null;
  gd?: number | null;
}

export interface StandingsTable {
  started?: boolean;
  matchday?: number | null;
  emblem?: string | null;
  name?: string;
  faName?: string | null;
  teams: StandingTeam[];
  firstStart?: string | null;
  matches?: Match[];
}

// ---------- public payload ----------
export interface PublicCup {
  code: string;
  country?: string;
  tier?: "gold" | "silver" | "bronze";
  qualifying?: boolean;
  emblem?: string | null;
  name?: string;
  faName?: string | null;
  next?: Match | null;
}

export interface PublicMatch extends Match {
  fetchedAt?: string;
}

// ---------- X (Twitter) ----------
export interface XPostResult {
  ok: boolean;
  id?: string;
  status?: number;
  error?: string;
}

export interface XStatus {
  enabled: boolean;
  dryRun: boolean;
  phase: string[];
  month: { used: number; cap: number };
  day: { used: number; cap: number };
  pausedUntil?: string | null;
  lastPost?: any;
  lastError?: any;
  budget: boolean;
}
