// SportSignal — the HTTP router (v13.47-seams, slimmed): webhook entry, admin
// login dispatch (auth.ts), public page + SWR API (public-swr.ts), card
// route (card-route.ts), healthz / sitemap / robots + the public API
// surface, and the POST_GATE_ROUTES table — admin/ops endpoints live in
// admin-ops.ts, the simulate harness in simulate.ts.


import type { Env, RouteCtx, RouteDef } from "./types";
import { CONFIG, VERSION } from "./config";
import { PAGE_SEC_HEADERS } from "./tables";
import { jsonResponse, resetSubrequestBudget, pingHealthcheck } from "./utils";
import { normalizeTeamName } from "./teams";
import { fetchStandings } from "./composers";
import { shouldNotify } from "./match-classify";
import { fetchFootballData } from "./provider-fd";
import { fetchSportScore } from "./provider-sportscore";
import { fetchTheSportsDB } from "./provider-tsp";
import { probeCupFarFixtures } from "./provider-cups";
import { getRegisteredChats, getBotMembers } from "./users";
import { validateWebhook, isAdminAuthed, getAdminCookieToken, getClubsCatalog, applySettings, clubsSearch } from "./admin";
import { handleAdminLoginGet, handleAdminLoginPost, handleAdminLogout, handleAdminChangePassword } from "./auth";
import { handlePublicMatchesApi } from "./public-swr";
import { handleCardRoute } from "./card-route";
import { handleVisitBeacon, collectAdminStats } from "./stats";
import { ADMIN_OPS_ROUTES, legacyGetAction } from "./admin-ops";
import { SIMULATE_ROUTE } from "./simulate";
import { handleKickoffDrainRoute, chainKickoffDrain } from "./kickoff-drain";
import { executeScheduledLogic } from "./cron";
import { getCronStatus, getPoolMetaCheap } from "./monitoring";
import { installWebKvMeter, maybeFlushWebKvWrites } from "./kv-webmeter";
import { handleTelegramUpdate } from "./bot";
import { handleSeoRequest } from "./seo/router";
import { LOGIN_PAGE } from "./pages/login";
import { ADMIN_PAGE } from "./pages/admin";

// v13.32-router: the post-auth request flow is a declarative, ordered route
// table (debt #1). Semantics preserved exactly:
//   - first-match-wins in registration order (identical to the old chain);
//   - method: undefined = any method (the old if had no method guard);
//   - a handler returning null falls through to the next route — this
//     encodes the old chain's fallthrough (e.g. /api/settings with an
//     unmapped method used to slip past every if and hit the legacy GET
//     switch / the 405 tail; /api/diag-* used to skip themselves when the
//     inline auth check failed and fall through to the 404 tail);
//   - "*" = the legacy GET action endpoints (catch-all, always last);
//   - unmatched non-GET requests end at the 405 tail (unchanged).
// Route bodies are byte-identical to the previous if-chain (moved, not
// rewritten) — indentation intentionally untouched so template literals
// and long strings are provably unchanged.



const POST_GATE_ROUTES: RouteDef[] = [
  ...ADMIN_OPS_ROUTES,
  { path: "/admin", method: undefined, handler: async ({ req, env, url }): Promise<Response | null> => {
      const authed = await isAdminAuthed(req, env);
      return new Response(authed ? ADMIN_PAGE : LOGIN_PAGE, { headers: PAGE_SEC_HEADERS });
    return null;
  } },
    // v12.34-pastel: /healthz is now CORS-open (Access-Control-Allow-Origin: *)
    // so the Next.js audit dashboard (and any other monitor) can fetch the
    // heartbeat JSON cross-origin. OPTIONS preflight returns 204 with the
    // CORS headers; the GET returns the same body as before.
  { path: "/healthz", method: undefined, handler: async ({ req, env, url }): Promise<Response | null> => {
      const corsHeaders = {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "300",
        "cache-control": "no-store"
      };
      if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
      }
      const st = await getCronStatus(env);
      const heartbeat = parseInt(st.heartbeat) || 0;
      const ageMin = heartbeat ? Math.round((Date.now() - heartbeat) / 6e4) : -1;
      const fresh = ageMin >= 0 && ageMin <= CONFIG.EXECUTION_FREQUENCY_MINUTES * 3;
      // v13.43-cpukeeper: the heartbeat only proves a tick STARTED. During
      // the 2026-09-14 CPU-limit outages every tick wrote its start-heartbeat
      // and was then killed (exceededResources) before completing — /healthz
      // kept returning ok:true for hours while nothing was being sent.
      // last_cron is only written at tick COMPLETION; requiring BOTH makes a
      // half-dead bot page external monitors.
      const lastCron = parseInt(st.last_cron) || 0;
      const lastCronAgeMin = lastCron ? Math.round((Date.now() - lastCron) / 6e4) : -1;
      const completing = lastCronAgeMin >= 0 && lastCronAgeMin <= CONFIG.EXECUTION_FREQUENCY_MINUTES * 3 + 5;
      // v13.9-reliability #10: expose the outbox depth so an external uptime
      // monitor (Uptime Robot / BetterStack / CF Healthcheck) can alert on
      // a growing backlog = sustained Telegram outage. The monitor points at
      // /healthz; ok=false (heartbeat stale >30min) OR outbox_depth >50
      // should page the admin.
      let outboxDepth = 0;
      try {
        const ob = await env.STATE.get(CONFIG.KV_OUTBOX, "json").catch(() => null);
        outboxDepth = Array.isArray(ob) ? ob.length : 0;
      } catch (e) { }
      // v13.69-poolage: the pool's OWN freshness — the one signal the
      // 13.55-epochflow outage class hides (ticks healthy, heartbeat fresh,
      // while the served data froze for 12.5h). Quiet-tick stamp-advances
      // keep a healthy pool ≤~100min old; the 2h full-sweep cadence bounds
      // the normal worst case. A missing pool (-1) or >180min flips the
      // degraded band so monitors can trend it BEFORE reminders go stale.
      // v13.111-quotaslim: a TEXT SCAN, not a JSON.parse — healthz used to
      // parse the whole 617KB pool per poll (the single heaviest CPU sink
      // on this route; uptime monitors polling every few minutes made it a
      // standing free-plan CPU-limit killer). The blob shape is a contract
      // (one "utcDate" per row, one "fetchedAt") — see monitoring.ts.
      let poolAgeMin = -1;
      let poolMatches = 0;
      try {
        const meta = await getPoolMetaCheap(env);
        poolAgeMin = meta.ageMin;
        poolMatches = meta.matches;
      } catch (e) { }
      // v13.111-quotaslim: the web-side share of the day's write burn
      // (visitor rebuilds, venue caches, webhook writes, CI-crawl bursts —
      // counted by kv-webmeter.ts). healthz's kv_writes_day is now the
      // HONEST total: cron + web.
      let webWrites = 0;
      try {
        const w = await env.STATE.get("kv_writes_web_v1", "json").catch(() => null);
        const day = new Date().toISOString().slice(0, 10);
        if (w && w.d === day) webWrites = parseInt(w.n) || 0;
      } catch (e) { }
      // v13.70-adminpulse: is the admin-paging layer ARMED? Every admin
      // alert path (6h heartbeat, alertPhaseError pages, budget pages,
      // audit gap reports, cap warnings) is gated on parseInt(env.CHAT_ID)
      // — an unparseable secret silently kills ALL of them. Observed live:
      // the heartbeat_sent_v1 / audit_alert_v1 stamps (both written INSIDE
      // the guard) never existed, while every stamp written OUTSIDE the
      // guard did — the entire observability layer was dead with healthz
      // green. Surfaced here so a monitor sees a dead paging layer.
      const adminAlertsOk = !isNaN(parseInt(env.CHAT_ID));
      const healthy = fresh && completing && outboxDepth < 50;
      // v13.45-sightlines: degraded band — still ok:true (200) but trending
      // toward a 503 line: ages past 2 periods (a normal day never exceeds
      // ~1 period + one long match-night tick), a growing-but-small outbox,
      // or the KV governor engaged. Additive field for dashboards/alert
      // tuning; the 200/503 decision above is untouched.
      const degraded = healthy && (ageMin > CONFIG.EXECUTION_FREQUENCY_MINUTES * 2 || lastCronAgeMin > CONFIG.EXECUTION_FREQUENCY_MINUTES * 2 + 5 || outboxDepth > 10 || (parseInt(st.kv_writes_day) || 0) + webWrites >= CONFIG.KV_WRITES_SOFT || poolAgeMin < 0 || poolAgeMin > 180 || !adminAlertsOk);
      // v13.38-qc: surface the KV write budget burn (measured, not pencil
      // math) so any monitor can watch the 1,000/day free-tier quota —
      // quota exhaustion was the original spam trigger.
      // v13.111-quotaslim: the number is now the HONEST total (cron + web);
      // kv_writes_web carries the web share alone (the `|| kvWritesTotal`
      // tail only fires in the legacy no-status-blob fallback, where NaN
      // would otherwise print as null).
      const kvWritesTotal = (parseInt(st.kv_writes_day) || 0) + webWrites;
      return new Response(JSON.stringify({
        ok: healthy,
        heartbeat_age_min: ageMin,
        last_cron_age_min: lastCronAgeMin,
        outbox_depth: outboxDepth,
        pool_age_min: poolAgeMin,
        pool_matches: poolMatches,
        admin_alerts_ok: adminAlertsOk,
        kv_writes_day: parseInt(st.kv_writes_day) + webWrites || kvWritesTotal,
        kv_writes_web: webWrites,
        kv_budget: st.budget || null,
        degraded: degraded,
        subreq_last_tick: parseInt(st.subreq_last_tick) || 0,
        kv_ops_last_tick: parseInt(st.kv_ops_last_tick) || 0,
        // v13.118-fixsched: the scheduler verdict (from cron_status_v1's
        // sched blob — zero extra KV reads, st is already read): what mode
        // the backend is in, why, the next relevant kickoff and the next
        // scheduled wake. The operator contract lives in docs/SCHEDULER.md.
        sched_mode: st.sched && st.sched.m || null,
        sched_reason: st.sched && st.sched.r || null,
        sched_live_sweep: st.sched && st.sched.ls || null,
        sched_poll_hint_sec: st.sched && st.sched.ph || null,
        sched_live_now: st.sched && st.sched.lv || 0,
        sched_stale_live: st.sched && st.sched.sn || 0,
        sched_feed_ok: st.sched ? st.sched.fo !== 0 : null,
        sched_next_ko: st.sched && st.sched.nk ? new Date(parseInt(st.sched.nk)).toISOString() : null,
        sched_next_wake: st.sched && st.sched.wa ? new Date(parseInt(st.sched.wa)).toISOString() : null,
        version: VERSION
      }), {
        status: healthy ? 200 : 503,
        headers: corsHeaders
      });
    return null;
  } },
  { path: "/api/members", method: "GET", handler: async ({ req, env, url }): Promise<Response | null> => {
      try {
        return jsonResponse(await getBotMembers(env));
      } catch (e) {
        return jsonResponse({ error: "members lookup failed: " + e.message, count: 0, members: [] }, 200);
      }
    return null;
  } },
  { path: "/api/standings", method: "GET", handler: async ({ req, env, url }): Promise<Response | null> => {
      const code = String(url.searchParams.get("code") || "").toUpperCase();
      if (!code) return jsonResponse({ error: "code param required (e.g. PL, CL)" }, 400);
      // v13.53-standsteady: the admin endpoint keeps the 10-min freshness —
      // it's manual, rare use, and the deltas it renders are point-in-time.
      const fresh = await fetchStandings(env, code, true, { freshMs: 6e5 });
      if (!fresh) return jsonResponse({ ok: false, error: "Standings not yet available for " + code + " (source unavailable or season not started)" }, 200);
      const snapKey = CONFIG.KV_STANDINGS_SNAP + code;
      const old = await env.STATE.get(snapKey, "json").catch(() => null);
      await env.STATE.put(snapKey, JSON.stringify(fresh)).catch(() => {
      });
      const teams = fresh.teams.map((t) => {
        const prev = old && old.teams && old.teams.find((x) => normalizeTeamName(x.name) === normalizeTeamName(t.name));
        return { name: t.name, pos: t.pos, points: t.points, delta: prev ? prev.pos - t.pos : null };
      });
      return jsonResponse({ code, matchday: fresh.matchday, teams });
    return null;
  } },
  { path: "/api/status", method: undefined, handler: async ({ req, env, url }): Promise<Response | null> => {
      const st = await getCronStatus(env);
      const users = await getRegisteredChats(env);
      return jsonResponse({
        version: VERSION,
        heartbeat: st.heartbeat && st.heartbeat !== "0" ? new Date(parseInt(st.heartbeat)).toISOString() : null,
        last_cron: st.last_cron && st.last_cron !== "0" ? new Date(parseInt(st.last_cron)).toISOString() : null,
        api_source: st.api_source,
        users: users.length,
        // Audit fix 15: raw chat ids masked — the admin panel only needs the
        // count and a recognizable prefix/suffix, not full Telegram ids.
        chat_ids: users.map((id) => {
          const s = String(id);
          return s.length > 6 ? s.slice(0, 3) + "\u2022\u2022\u2022" + s.slice(-2) : "\u2022\u2022\u2022";
        }),
        timezone: env.TEHRAN_TZ,
        monitored_leagues: CONFIG.LEAGUES,
        teams_count: Object.values(CONFIG.BIG_TEAMS_BY_LEAGUE).flat().length
      });
    return null;
  } },
    // v13.56-visitcount: admin visitor-stats endpoint. Lives inside
    // POST_GATE_ROUTES so it inherits the existing admin auth (session cookie
    // / ADMIN_TOKEN) — no separate key. Returns today/yesterday/7d/30d/
    // all-time pageviews + a 90-day per-day breakdown for the /admin card.
  { path: "/api/stats", method: "GET", handler: async ({ req, env, url }): Promise<Response | null> => {
      return jsonResponse(await collectAdminStats(env));
    return null;
  } },
  { path: "/api/sources", method: undefined, handler: async ({ req, env, url }): Promise<Response | null> => {
      const report = {};
      const sources = [
        { name: "football-data", fn: fetchFootballData },
        { name: "sportscore", fn: fetchSportScore },
        { name: "thesportsdb", fn: fetchTheSportsDB }
      ];
      for (const s of sources) {
        try {
          const m = await s.fn(env);
          report[s.name] = {
            ok: true,
            matches: m.length,
            worthy: m.filter(shouldNotify).length,
            sample: m.slice(0, 3).map((x) => x.homeTeam.name + " vs " + x.awayTeam.name + " (" + x.competition.code + ")")
          };
        } catch (e) {
          report[s.name] = { ok: false, error: e.message };
        }
      }
      return jsonResponse(report);
    return null;
  } },
  SIMULATE_ROUTE,
  { path: "/api/webhook/info", method: undefined, handler: async ({ req, env, url }): Promise<Response | null> => {
      const res = await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/getWebhookInfo").catch(() => null);
      return jsonResponse(res ? await res.json() : { ok: false, error: "Telegram unreachable from worker" });
    return null;
  } },
  { path: "/api/bot/info", method: undefined, handler: async ({ req, env, url }): Promise<Response | null> => {
      const res = await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/getMe").catch(() => null);
      return jsonResponse(res ? await res.json() : { ok: false, error: "Telegram unreachable from worker" });
    return null;
  } },
  { path: "/api/webhook/setup", method: "POST", handler: async ({ req, env, url }): Promise<Response | null> => {
      const secret = env.WEBHOOK_SECRET;
      if (!secret) return jsonResponse({ ok: false, error: "WEBHOOK_SECRET secret is not set" }, 400);
      const webhookUrl = "https://" + url.host + "/webhook";
      const res = await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/setWebhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: webhookUrl, secret_token: secret, allowed_updates: ["message", "callback_query"] })
      }).catch(() => null);
      const body = res ? await res.json() : { ok: false, error: "Telegram unreachable from worker" };
      return jsonResponse({ ...body, webhook_url: webhookUrl });
    return null;
  } },
  { path: "*", handler: legacyGetAction },
];
// v14.0-seo: the old single-URL sitemap/robots routes are superseded by the
// SEO router (sitemap index + children with honest lastmod, toggle-driven
// robots.txt). They were removed from POST_GATE_ROUTES — the router serves
// them before this table is reached.

// v13.111-quotaslim: the fetch body (route semantics unchanged) extracted
// from the worker object so the KV meter wrapper below can install before
// and flush after EVERY return path without touching a single route.
async function handleFetchRequest(req, env, ctx) {
  const url = new URL(req.url);
  if (url.pathname === "/webhook") {
    if (!validateWebhook(req, env)) {
        console.warn("\u26A0\uFE0F Invalid webhook secret");
        return new Response("Unauthorized", { status: 403 });
      }
      let update = null;
      try {
        update = await req.json();
      } catch (e) {
        update = null;
      }
      if (update) {
        // v13.111-quotaslim: the .finally chains the meter flush AFTER the
        // update's writes land (the webhook runs in waitUntil, past the
        // fetch wrapper's own finally) — follow/prefs/profile writes count.
        ctx.waitUntil(handleTelegramUpdate(env, update).catch((e) => console.error("Webhook background error:", e)).finally(() => maybeFlushWebKvWrites(env, ctx)));
      }
      return new Response("OK");
    }
    const isAdminPath = url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/");
    // v13.30-login-fix: GET /admin/login used to fall into the admin auth gate
    // and return a bare 401 JSON — humans who bookmark /admin/login got a raw
    // error instead of the login page. The login form lives at /admin.
    if (url.pathname === "/admin/login" && req.method === "GET") return handleAdminLoginGet();
    if (url.pathname === "/admin/login" && req.method === "POST") return await handleAdminLoginPost(req, env);
    if (url.pathname === "/admin/logout" && req.method === "POST") return await handleAdminLogout(req, env);
    if (url.pathname === "/admin/change-password" && req.method === "POST") return await handleAdminChangePassword(req, env);
    if (url.pathname === "/api/public-matches" && req.method === "GET") return await handlePublicMatchesApi(req, env, ctx);
    // v13.56-visitcount: the public page-view beacon. MUST sit before the
    // admin auth gate (it's a public, cookieless, bot-filtered counter — see
    // src/stats.ts). Counting runs in ctx.waitUntil so it never slows the
    // response; the JSON body carries today+total for the footer counter.
    if (url.pathname === "/api/visit" && req.method === "GET") return await handleVisitBeacon(req, env, ctx);
    // v13.117-kickoff: the deferred-fan-out drain — the tick chains THIS
    // endpoint through the self-referencing service binding (env.DRAIN_SELF)
    // when the fan-out reservation deferred in-window units (two simultaneous
    // kickoffs: the second's full fan-out cannot fit one invocation's
    // ~50-subrequest ceiling, so it used to wait for the NEXT 10-min tick and
    // land lean text-only). The bound request is a fresh invocation of this
    // same worker with a fresh budget, so the deferred unit's dice + card +
    // text land ~40-60s after kickoff — same-minute as the first match.
    // Pre-gate + WEBHOOK_SECRET-guarded (the caller is the worker itself,
    // not an admin session); depth/unit-capped, and every failure mode
    // falls back to the old next-tick retry path.
    if (url.pathname === "/api/kickoff-drain" && req.method === "POST") return await handleKickoffDrainRoute(req, env);
    // v14.0-seo: every public page + machine file is served by the SEO
    // router (server-rendered HTML from KV data — R-01). It also handles
    // host/path normalization (R-06/R-08), the custom 404 (R-10/R-11) and
    // environment safety (R-13). Returns null for non-SEO paths so the
    // bot/admin/card routes below are untouched.
    const seoRes = await handleSeoRequest(req, env, ctx, url);
    if (seoRes) return seoRes;
    // v13.72-deadweight: the /public belt-and-braces fallback branch is
    // REMOVED — the SEO router owns /public entirely and 301s it to /
    // (U-03, verified for GET and POST in the local smoke). The fallback
    // could only fire if the router ever declined, and it served the raw
    // template with 19 unreplaced __SEO_*__ placeholders (placeholder soup).
    // v13.12-cards: match-card SVG route. Generates a visual "team A vs
    // team B" card with the two crests + names + kickoff time + competition.
    // The SVG is self-contained (crests base64-inlined server-side). Used
    // by the bot's sendPhoto (converted to PNG via Cloudflare Image Resizing
    // if available) + available as an OG image for the public page.
    // Public (no auth) — the card carries no sensitive data.
    if (url.pathname.startsWith("/api/card/")) return await handleCardRoute(req, env, url);
    if (isAdminPath && url.pathname !== "/admin" && !await isAdminAuthed(req, env)) {
      return jsonResponse({
        error: "Unauthorized",
        message: "Login via /admin/login or include 'Authorization: Bearer <ADMIN_TOKEN>' header"
      }, 401);
    }
    await applySettings(env);
    // v13.32-router: dispatch via the ordered table below (was a ~30-branch
    // post-auth if-chain). See the RouteDef block for the semantics contract.
    for (const route of POST_GATE_ROUTES) {
      if (route.path !== "*" && url.pathname !== route.path) continue;
      if (route.method && req.method !== route.method) continue;
      const res: Response | null = await route.handler({ req, env, url });
      if (res === null) continue;
      return res;
    }
    return new Response("Method not allowed", { status: 405 });
}

const worker_default = {
  async fetch(req, env, ctx) {
    resetSubrequestBudget();
    // v13.111-quotaslim: the WEB-SIDE KV meter — every STATE.put/delete this
    // invocation makes is counted and (throttled) flushed into the day's
    // web counter kv_writes_web_v1, so the budget governor + healthz see
    // the TRUE burn, not just the cron share (see kv-webmeter.ts). The
    // flush rides ctx.waitUntil and is a no-op on read-only invocations.
    installWebKvMeter(env);
    try {
      return await handleFetchRequest(req, env, ctx);
    } finally {
      maybeFlushWebKvWrites(env, ctx);
    }
  },
  async scheduled(event, env, ctx) {
    console.log("\u23F0 Scheduled event triggered");
    // v14.0.5-cupgap: the lean far-cup probe trigger ("27 */4 * * *" — see
    // wrangler.toml). Runs probeCupFarFixtures INSTEAD of the full tick:
    // ~10 subrequests total (pool read + 7 sportscore probe calls + pool
    // write), never touching the notify/standings machinery that already
    // rides the invocation subrequest ceiling (the 04:31Z incident). The
    // match is "any trigger that is NOT the 10-min tick" so temporary probe
    // schedules (verification runs) route here automatically.
    if (event && event.cron && event.cron !== "*/10 * * * *") {
      try {
        const r = await probeCupFarFixtures(env);
        console.log(`\u{1F3AF} far-cup cron done: added ${r.added}, scanned ${r.scanned}`);
        pingHealthcheck(env, ctx, true);
      } catch (error) {
        console.error("Far-cup probe failed:", error);
        pingHealthcheck(env, ctx, false, error);
      }
      return;
    }
    try {
      const tick = await executeScheduledLogic(env);
      // v13.45-sightlines: dead man's switch — success ping AFTER the tick
      // resolves (every early return is a handled outcome: lock-skip,
      // no-users, no-pool; only a cron that stops firing, a hard-down
      // worker, or a throw leaves the check late → Telegram DOWN after the
      // grace window).
      pingHealthcheck(env, ctx, true);
      // v13.117-kickoff: THE DRAIN CHAIN. The tick ended with in-window
      // notification units the fan-out reservation had to defer (budget
      // pressure — the classic shape: two simultaneous kickoffs, the second
      // one's full fan-out cannot fit the invocation's ~50-subrequest
      // ceiling). Instead of waiting for the NEXT 10-minute tick, hand the
      // deferred keys to a fresh invocation of THIS SAME WORKER through the
      // self-referencing service binding (env.DRAIN_SELF → POST
      // /api/kickoff-drain) — the bound invocation's own subrequest budget
      // delivers the FULL fan-out (dice + card + text) within ~40-60s of
      // kickoff, same-minute as the first match. waitUntil: the tick has
      // already written its completion blob; the chain is strictly additive
      // latency recovery, and any failure inside it degrades to the old
      // next-tick retry path (kickoff-drain.ts fail-open contract).
      const deferredUnits = tick && Array.isArray((tick as any).deferredUnits) ? (tick as any).deferredUnits : [];
      if (deferredUnits.length) {
        console.log(`\u26A1 Chaining the kickoff drain for ${deferredUnits.length} deferred unit(s): ${deferredUnits.slice(0, 4).join(", ")}`);
        ctx.waitUntil(chainKickoffDrain(env, deferredUnits, 0).catch((e) => console.warn("kickoff drain chain failed (units ride the next-tick path): " + e.message)));
      }
    } catch (error) {
      console.error("Scheduled execution failed:", error);
      // v13.45-sightlines: the tick threw — /fail pings immediately (no
      // grace) with the error name in the POST body; the next successful
      // tick recovers the check.
      pingHealthcheck(env, ctx, false, error);
    }
  }
};

export default worker_default;
