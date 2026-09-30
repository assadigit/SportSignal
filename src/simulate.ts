// SportSignal — the notification-path simulation harness (split from api.ts
// in v13.47-seams): POST /api/simulate runs buildDummyMatches through the
// REAL sendMatchNotifications against a CLONED env (sim keys — real
// notification state untouched by construction) and reports per-probe
// results. The route entry moves WITH its body (v13.47-seams).

import type { Env, RouteDef } from "./types";
import { jsonResponse } from "./utils";
import { formatResultMessage } from "./composers";
import { sendMatchNotifications } from "./notifications";
import { getRegisteredChats } from "./users";
import { buildDummyMatches } from "./admin";
import { matchKey } from "./dedupe";

export const SIMULATE_ROUTE: RouteDef = { path: "/api/simulate", method: "POST", handler: async ({ req, env, url }): Promise<Response | null> => {
      const dummy = buildDummyMatches();
      // v13.5-sim-scope: a CLONED env carries the simulation KV keys. The shared
      // CONFIG is never mutated at runtime, so a concurrent cron sweep can
      // never observe (or write to) the test keys — real notification state is
      // untouched by construction, not by save/restore.
      const simEnv: Env = { ...env, SIM_NOTIFIED_KEY: "test_sim_v1", SIM_PREFS_KEY: "test_sim_v1_prefs" };
      const chats = await getRegisteredChats(simEnv);
      if (!chats.length) {
        return jsonResponse({ passed: false, failures: ["no registered users \u2014 sign in to the bot via /start first"], sent: {}, probes: [] });
      }
      await simEnv.STATE.delete(simEnv.SIM_NOTIFIED_KEY);
      await sendMatchNotifications(simEnv, dummy);
      const tracked = await simEnv.STATE.get(simEnv.SIM_NOTIFIED_KEY, "json").catch(() => null);
        const counts = {};
        for (const arr of Object.values(tracked || {}) as any) {
          for (const n of arr) counts[n.notificationType] = (counts[n.notificationType] || 0) + 1;
        }
        const expected = [
          ["sim-pre-match-24h", "pre-match-24h"],
          ["sim-pre-match-3h", "pre-match-3h"],
          ["sim-pre-match-1h", "pre-match-1h"],
          ["sim-match-start", "match-start"],
          ["sim-result", "result"],
          ["sim-probe-mixed", "pre-match-1h"],
          ["sim-probe-none", null],
          ["sim-probe-el", "pre-match-1h"],
          ["sim-probe-ecl", "pre-match-1h"],
          ["sim-probe-el-24h", "pre-match-24h"],
          ["sim-probe-knockout", "result"],
          ["sim-probe-cup", "pre-match-1h"],
          ["sim-probe-backfill-24h", "pre-match-24h"],
          ["sim-probe-backfill-3h", "pre-match-3h"],
          ["sim-probe-bigmatch", "pre-match-72h"],
          ["sim-probe-bigmatch-none", null]
        ];
        const probes = [];
        const failures = [];
        for (const [id, wantType] of expected) {
          const m = dummy.find((x) => x.id === id);
          if (!m) {
            failures.push(id + ": probe missing");
            continue;
          }
          const row = tracked ? tracked[matchKey(m)] : null;
          const got = row && row.some((n) => n.notificationType === wantType);
          const silent = !row || !row.length;
          const ok = wantType === null ? silent : got;
          probes.push({ id, expected: wantType || "silent", notified: row ? row.map((n) => n.notificationType) : [] });
          if (!ok) failures.push(id + ": expected " + (wantType || "silent") + ", got " + JSON.stringify(row ? row.map((n) => n.notificationType) : []));
        }
        const resultDummy = dummy.find((m) => m.id === "sim-result");
        const knockoutDummy = dummy.find((m) => m.id === "sim-probe-knockout");
        const preview = resultDummy ? await formatResultMessage(resultDummy, simEnv) : null;
        const previewKnockout = knockoutDummy ? await formatResultMessage(knockoutDummy, simEnv) : null;
        return jsonResponse({
          sent: counts,
          probes,
          passed: failures.length === 0,
          failures,
          preview,
          previewKnockout,
          note: "Test messages sent to registered chats; real notification state untouched"
        });
    return null;
  } };
