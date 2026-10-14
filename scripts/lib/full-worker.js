// scripts/lib/full-worker.js — the FULL-WORKER eval harness (v13.102).
//
// Loads the worker-src concatenation MINUS worker.ts (a pure re-export),
// admin-ops.ts/api.ts (HTTP-route tables — not part of the cron tick) and
// the pages/ templates, strips the remaining TypeScript (the worker-src
// transform already removed imports/exports; the REAL typescript compiler
// transpiles the rest — annotations, generics, `as` casts — so the flat
// body stays in lockstep with the source by construction), converts the
// module-level const/let declarations to var (a flat multi-file scope is
// not a real ES module — redeclaration rules differ; nothing assigns to
// these bindings), installs a CONTROLLABLE CLOCK (a Date subclass whose
// `new Date()` / `Date.now()` read a mutable mock instant) plus instant
// timers and a no-op Cache API, and evals the whole body into the global
// scope — exactly like a warm Worker isolate. Every function the tick
// calls (executeScheduledLogic and its whole phase graph) then runs
// against the caller's mock env: STATE KV, USERS_DB D1 and `fetch` are
// supplied by the scenario (globalThis.fetch is replaced by the caller).
//
// The clock: `setClock(ms)` / `advance(ms)` move the mock instant BETWEEN
// ticks (inside a tick the clock is frozen — same semantics as the real
// runtime, where Date.now() only advances across I/O).
//
// Usage:
//   const h = require("./full-worker")({ startMs: Date.parse("...") });
//   globalThis.fetch = myMockFetch;
//   await executeScheduledLogic(myMockEnv);        // the REAL tick
//   h.setClock(nextTickMs);
//   h.restore();                                   // when the scenario ends
"use strict";
const path = require("path");
const ts = require(path.join(__dirname, "..", "..", "node_modules", "typescript"));
const src = require("./worker-src")();

const BODY_START = src.indexOf("// ===== src/config.ts =====");
const BODY_END = src.indexOf("// ===== src/admin-ops.ts =====");
if (BODY_START < 0 || BODY_END < 0 || BODY_END < BODY_START) {
  throw new Error("full-worker: concat markers not found (worker-src order changed?)");
}
const RAW_BODY = src.slice(BODY_START, BODY_END)
  // Pure re-export / type-only re-export lines survive the worker-src
  // transform (`export { matchKey, canonDedupe };` verbatim, and
  // `export type { MatchLike };` mangled to `type { MatchLike };`) — both
  // are SyntaxErrors in a flat non-module eval and carry zero runtime
  // semantics. Strip the whole line.
  .replace(/^export \{[^}]*\};\n?/gm, "")
  .replace(/^type \{[^}]*\};\n?/gm, "");

// TypeScript-transpile the flat body (annotations out, no imports left).
const TRANSPILED = ts.transpileModule(RAW_BODY, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.None,
    removeComments: false
  },
  reportDiagnostics: true
});
if (TRANSPILED.diagnostics && TRANSPILED.diagnostics.length) {
  const d = TRANSPILED.diagnostics[0];
  throw new Error("full-worker transpile failed: " + ts.flattenDiagnosticMessageText(d.messageText, " ") +
    " (at " + (d.start != null ? "offset " + d.start : "?") + ")");
}
// Module-level const/let → var (flat-scope redeclaration safety; these are
// all single-assignment module bindings in the real build).
const BODY = TRANSPILED.outputText
  .replace(/^const /gm, "var ")
  .replace(/^let /gm, "var ");

function createHarness(opts) {
  const o = opts || {};
  const RealDate = Date;
  const RealSetTimeout = globalThis.setTimeout;
  let clock = o.startMs != null ? o.startMs : RealDate.now();

  // A Date subclass with a controllable "now": `new Date()` (no args) and
  // Date.now() read the mock instant; every other constructor form parses
  // like the real Date. All static helpers (parse/UTC) and the whole
  // prototype are inherited, so Intl/JSON/instanceof behave identically.
  class MockDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(clock);
      else super(...args);
    }
    static now() { return clock; }
  }

  const prevDate = globalThis.Date;
  const prevSetTimeout = globalThis.setTimeout;
  const prevCaches = globalThis.caches;
  globalThis.Date = MockDate;
  // Instant timers: the simulation never waits real milliseconds (retry
  // backoffs, 429 pauses and send pacing collapse to microtask order —
  // exactly what the runtime's I/O-only clock advance would do).
  globalThis.setTimeout = (fn, _ms) => RealSetTimeout(fn, 0);
  globalThis.caches = o.caches || { default: { match: async () => undefined, put: async () => { } } };

  // The eval: the whole worker body, one scope, function declarations
  // hoisted — the flat equivalent of the bundled module graph.
  (0, eval)(BODY);

  return {
    setClock: (ms) => { clock = ms; },
    advance: (ms) => { clock += ms; },
    clockMs: () => clock,
    restore: () => {
      globalThis.Date = prevDate;
      globalThis.setTimeout = prevSetTimeout;
      if (prevCaches === undefined) delete globalThis.caches;
      else globalThis.caches = prevCaches;
    }
  };
}

module.exports = createHarness;
module.exports.createHarness = createHarness;
module.exports.BODY = BODY;
