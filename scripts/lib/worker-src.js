// Concatenates every server module (src/*.ts + src/pages/*.ts) into one
// source string for the self-check scripts, transformed to runnable JS:
//   - `export const/var/function X` → plain declarations (grabVar finds `var X =`)
//   - TS optional-param markers (`lang?`) stripped (eval-safe)
// Stable file order; cached.
"use strict";
const fs = require("fs");
const path = require("path");

let cache = null;

function transform(ts) {
  let c = ts;
  // strip import lines (grabbed eval blocks never include them, but keep the
  // concatenated text uniform)
  c = c.replace(/^import\s+[^;]+;\n?/gm, "");
  // export const X = ... → var X = ...  (grabVar compatibility)
  c = c.replace(/^export const\s+/gm, "var ");
  c = c.replace(/^export let\s+/gm, "var ");
  c = c.replace(/^export var\s+/gm, "var ");
  // v13.33: teams/dedupe are TS now — strip export from interface/type so
  // eval'd concatenations stay parseable (types are erased, not executed).
  c = c.replace(/^export (interface|type)\s+/gm, "$1 ");
  // export function / export async function → plain
  c = c.replace(/^export (async )?function\s+/gm, "$1function ");
  c = c.replace(/^export default\s+/gm, "");
  // TS optional params: `name?` before `,` or `)` (never valid otherwise)
  c = c.replace(/(\w)\?([,)])/g, "$1$2");
  // v13.35: optional marker before a colon (`opts?:`) — the other optional
  // position. Kept as a separate rule so the param NAME survives (the eval'd
  // signature keeps the param; callers without it just pass undefined).
  c = c.replace(/(\w)\?:/g, "$1:");
  // v13.35: interface-typed param annotation (PubOpts on fetchPublicMatches).
  c = c.replace(/: PubOpts/g, "");
  // v13.35: Record<...> annotations (ROUND_FA map, local maps) — generic over
  // key/value types so new Record locals stay eval-safe without new rules.
  c = c.replace(/: Record<[^>]+> =/g, " =");
  // TS type annotations added by v13.3 (eval-safety): env: Env, : any,
  // Promise<any>, as-any casts, index-signature types.
  c = c.replace(/env: Env/g, "env");
  // v13.44-quotaguard: eval-safety for newly-grabbed functions — local
  // `scopedEnv: Env =` declarations (digest.ts broadcasts, first eval'd by
  // check-no-miss section T) and `: any[] =` array annotations (matches.ts
  // saveNotifiedMatch). Types-only strippers like the rules above; the real
  // source keeps its annotations (tsc remains the type gate).
  c = c.replace(/(\w): Env =/g, "$1 =");
  c = c.replace(/: any\[\] =/g, " =");
  c = c.replace(/\): Promise<any> \{/g, ") {");
  c = c.replace(/: any\]([)\s,;])/g, "$1");
  c = c.replace(/ as any\]/g, "");
  c = c.replace(/ as any\)/g, ")");
  // v13.34: statement-ending cast (`... as any;`) — public-matches snapshot read
  c = c.replace(/ as any;/g, ";");
  c = c.replace(/: any\)/g, ")");
  c = c.replace(/: any =/g, " =");
  c = c.replace(/: any\]/g, "");
  c = c.replace(/: Record<string, any> =/g, " =");
  c = c.replace(/\(n: any\)/g, "(n)");
  return c;
}

function workerSrc() {
  if (cache) return cache;
  const order = [
    "worker.ts", "config.ts", "tables.ts", "utils.ts", "teams.ts",
    // v13.85-stadiumchip: home-ground table+gate (needs config + teams;
    // consumed by public-matches.ts pubMatch — sits before it like slugs.ts).
    "grounds.ts",
    "dedupe.ts", "fa-dict.ts", "translate.ts", "fa-ai.ts",
    // v13.80-canonical-hrefs: slugs.ts is a ROOT leaf (moved out of
    // seo/config.ts so the payload shaper can import it). pubMatch stamps
    // `path` through matchPath — the checks that eval pubMatch (check-venue,
    // live-derby) grab the slug block alongside it; here it just needs to
    // sit before public-matches.ts in the concat.
    "slugs.ts",
    // v13.76-matchsplit: matches.ts became a GROUP — match-model (status
    // vocabulary + format helpers) → match-windows (time windows + backfill)
    // → match-dedupe (notified-match store + send gate) → match-classify
    // (eligibility + big-match/derby sets + pickHeroMatch). normAlias +
    // TEAM_ALIASES moved into teams.ts (kills the users↔matches cycle).
    // All harness grabs on these are position-independent (grabFn).
    "match-model.ts", "match-windows.ts", "match-dedupe.ts", "match-classify.ts",
    // v13.74-providersplit: the provider group — breaker/wikipedia/sportscore/
    // tsp/fd/match-pool/cups are the clients+pool; providers.ts (LAST) is the
    // orchestrator layer that imports them all. Order within the group keeps
    // the flat-eval dependency direction acyclic (function decls hoist, but
    // keep it obvious). provSeg15 in check-reliability spans breaker→telegram.
    "provider-breaker.ts", "provider-wikipedia.ts", "provider-sportscore.ts", "provider-tsp.ts", "provider-fd.ts", "match-pool.ts", "provider-cups.ts", "providers.ts",
    "telegram.ts", "composers.ts",
    // v13.77-digestnotify: digest.ts + notifications.ts became GROUPS —
    // weekly/morning/bigmatch/coronation digests + engine/status/audit
    // notify modules. All harness deps are grab-based (position-independent)
    // or content-span regexes (#nospam6 spans within digest-morning).
    "digest-weekly.ts", "digest-morning.ts", "digest-bigmatch.ts", "digest-coronation.ts",
    "notify-engine.ts", "notify-status.ts", "notify-audit.ts",
    // v13.92-d1userstore: the user-data seam (D1 primary / legacy KV
    // fallback) — sits before users.ts (its top-level delegate) and every
    // consumer below (bot/admin-bot/notify prunes). All harness grabs on
    // it are position-independent (grabFn).
    "user-store.ts",
    "users.ts", "admin.ts", "admin-bot.ts", "public-matches.ts", "bot-ui.ts", "bot.ts",
    // v13.75-cronsplit: the cron group — the six phase modules run BEFORE the
    // shell (cron.ts LAST) so the flat concat mirrors runtime order: the
    // prewarm/overlay logs land before the shell's completion-blob meter fold
    // (the #quota1/#swrsolid order checks in check-reliability compare
    // positions in this concat). cronSeg/cronSeg52 span the whole group
    // (cron-preflight → monitoring); the bot segment boundaries are anchored
    // at cron-preflight.ts so botSeg stays bot.ts-only.
    "cron-preflight.ts", "cron-users.ts", "cron-pool.ts", "cron-maintenance.ts", "cron-notify.ts", "cron-public.ts", "cron.ts",
    "monitoring.ts", "migration.ts",
    "auth.ts", "public-swr.ts", "card-route.ts",
    "simulate.ts", "admin-ops.ts",
    "api.ts",
  ];
  const parts = [];
  for (const f of order) {
    const p = path.join(__dirname, "..", "..", "src", f);
    if (fs.existsSync(p)) parts.push(`// ===== src/${f} =====\n` + transform(fs.readFileSync(p, "utf8")));
  }
  const pagesDir = path.join(__dirname, "..", "..", "src", "pages");
  if (fs.existsSync(pagesDir)) {
    for (const f of fs.readdirSync(pagesDir).filter((x) => x.endsWith(".ts")).sort()) {
      parts.push(`// ===== src/pages/${f} =====\n` + fs.readFileSync(path.join(pagesDir, f), "utf8"));
    }
  }
  cache = parts.join("\n");
  return cache;
}

module.exports = workerSrc;
module.exports.workerSrc = workerSrc;
