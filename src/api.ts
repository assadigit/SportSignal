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
import { shouldNotify } from "./matches";
import { fetchFootballData, fetchSportScore, fetchTheSportsDB } from "./providers";
import { getRegisteredChats, getBotMembers } from "./users";
import { validateWebhook, isAdminAuthed, getAdminCookieToken, getClubsCatalog, applySettings, clubsSearch } from "./admin";
import { handleAdminLoginGet, handleAdminLoginPost, handleAdminLogout, handleAdminChangePassword } from "./auth";
import { handlePublicMatchesApi } from "./public-swr";
import { handleCardRoute } from "./card-route";
import { ADMIN_OPS_ROUTES, legacyGetAction } from "./admin-ops";
import { SIMULATE_ROUTE } from "./simulate";
import { executeScheduledLogic } from "./cron";
import { getCronStatus } from "./monitoring";
import { handleTelegramUpdate } from "./bot";
import { PUBLIC_PAGE } from "./pages/public";
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
      const healthy = fresh && completing && outboxDepth < 50;
      // v13.45-sightlines: degraded band — still ok:true (200) but trending
      // toward a 503 line: ages past 2 periods (a normal day never exceeds
      // ~1 period + one long match-night tick), a growing-but-small outbox,
      // or the KV governor engaged. Additive field for dashboards/alert
      // tuning; the 200/503 decision above is untouched.
      const degraded = healthy && (ageMin > CONFIG.EXECUTION_FREQUENCY_MINUTES * 2 || lastCronAgeMin > CONFIG.EXECUTION_FREQUENCY_MINUTES * 2 + 5 || outboxDepth > 10 || (parseInt(st.kv_writes_day) || 0) >= CONFIG.KV_WRITES_SOFT);
      // v13.38-qc: surface the KV write budget burn (measured, not pencil
      // math) so any monitor can watch the 1,000/day free-tier quota —
      // quota exhaustion was the original spam trigger.
      return new Response(JSON.stringify({
        ok: healthy,
        heartbeat_age_min: ageMin,
        last_cron_age_min: lastCronAgeMin,
        outbox_depth: outboxDepth,
        kv_writes_day: parseInt(st.kv_writes_day) || 0,
        kv_budget: st.budget || null,
        degraded: degraded,
        subreq_last_tick: parseInt(st.subreq_last_tick) || 0,
        kv_ops_last_tick: parseInt(st.kv_ops_last_tick) || 0,
        version: VERSION
      }), {
        status: healthy ? 200 : 503,
        headers: corsHeaders
      });
    return null;
  } },
    // v12.x-seo: sitemap.xml + robots.txt for crawlers. Minimal: one URL for
    // the SPA root; robots allows all + points at the sitemap. Both served
    // with the right content-type so Google Search Console accepts them.
  { path: "/sitemap.xml", method: undefined, handler: async ({ req, env, url }): Promise<Response | null> => {
      const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://football.sportsignal.ir/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n</urlset>\n';
      return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
    return null;
  } },
  { path: "/robots.txt", method: undefined, handler: async ({ req, env, url }): Promise<Response | null> => {
      const body = "User-agent: *\nAllow: /\n\nSitemap: https://football.sportsignal.ir/sitemap.xml\n";
      return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
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

const worker_default = {
  async fetch(req, env, ctx) {
    resetSubrequestBudget();
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
        ctx.waitUntil(handleTelegramUpdate(env, update).catch((e) => console.error("Webhook background error:", e)));
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
    if (url.pathname === "/public" || url.pathname === "/") {
      return new Response(PUBLIC_PAGE.replace("__PAGE_TZ__", env.TEHRAN_TZ), { headers: PAGE_SEC_HEADERS });
    }
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
  },
  async scheduled(event, env, ctx) {
    console.log("\u23F0 Scheduled event triggered");
    try {
      await executeScheduledLogic(env);
      // v13.45-sightlines: dead man's switch — success ping AFTER the tick
      // resolves (every early return is a handled outcome: lock-skip,
      // no-users, no-pool; only a cron that stops firing, a hard-down
      // worker, or a throw leaves the check late → Telegram DOWN after the
      // grace window).
      pingHealthcheck(env, ctx, true);
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
