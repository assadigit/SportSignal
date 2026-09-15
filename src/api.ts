// SportSignal — the HTTP router: webhook, public page + API, admin panel
// + APIs (settings / members / fa-teams / clubs / broadcast / simulate /
// sources / x), healthz / sitemap / robots, legacy GET action endpoints.


import type { Env } from "./types";
import { CONFIG, X_CONFIG, VERSION, PAGE_SEC_HEADERS } from "./config";
import { readJson, jsonResponse, resetSubrequestBudget, hashPassword, getAdminPassHash, timingSafeEqualStr, escapeMarkdownCharacters, getNowTehran, pingHealthcheck } from "./utils";
import { normalizeTeamName, normTeamKey } from "./teams";
import { matchKey } from "./dedupe";
import { translateTeam, translateCompetition, resetFaAiCache, ensureFaAiCache, isValidFaName } from "./translate";
import { maybeRunFaAi, collectUnknownTeamNames } from "./fa-ai";
import { isWithin24HourWindow, isWithin3HourWindow, isWithin1HourWindow, isMatchStartingNow, shouldNotify, getNotifiedMatches } from "./matches";
import { fetchFootballData, fetchSportScore, fetchTheSportsDB, fetchLongView, fetchMatchesFromAPI, getCachedMatches } from "./providers";
import { sendTelegram } from "./telegram";
import { formatResultMessage, fetchStandings } from "./composers";
import { sendLeagueTables, sendWeekAhead } from "./digest";
import { sendMatchNotifications } from "./notifications";
import { getRegisteredChats, getBotMembers } from "./users";
import { validateWebhook, isAdminAuthed, getAdminCookieToken, getSettings, sanitizeSettings, syncUclSelection, canonicalizeTeams, getClubsCatalog, buildDummyMatches, applySettings, clubsSearch } from "./admin";
import { fetchPublicMatches } from "./public-matches";
import { getCronStatus, executeScheduledLogic } from "./cron";
import { getXStatus, xTestPost } from "./x";
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

type RouteCtx = { req: Request; env: Env; url: URL };
type RouteDef = {
  path: string; // exact pathname, or "*" for the legacy catch-all
  method?: string; // undefined = any method
  handler: (c: RouteCtx) => Promise<Response | null> | Response | null;
};

async function legacyGetAction(c: RouteCtx): Promise<Response | null> {
  const { req, env, url } = c;
  // v13.32-router-fix: the old chain wrapped this whole block in
  // `if (req.method === "GET")` — without the guard, an unknown-path POST
  // reached the switch's default (404) instead of falling through to the
  // 405 tail. null = no match → the dispatcher continues.
  if (req.method !== "GET") return null;
      const path = url.pathname.substring(1) || url.searchParams.get("action") || "";
      const adminEndpoints = ["clear-notifications", "clear-locks", "trigger", "simple-test", "send-tables", "next-matches", "debug-notifications", "health", "teams"];
      if (adminEndpoints.includes(path) && !await isAdminAuthed(req, env)) {
        return new Response(JSON.stringify({
          error: "Unauthorized",
          message: "Include 'Authorization: Bearer <token>' header"
        }), {
          status: 401,
          headers: { "content-type": "application/json" }
        });
      }
      switch (path) {
        case "debug-notifications":
          try {
            const notifiedMatches: Record<string, any> = await getNotifiedMatches(env);
            const now2 = Date.now();
            return new Response(JSON.stringify({
              total_matches: Object.keys(notifiedMatches).length,
              matches: Object.entries(notifiedMatches).map(([matchId, notifications]) => ({
                match_id: matchId,
                notifications: notifications.filter((n) => now2 < n.expiresAt).map((n) => ({
                  type: n.notificationType,
                  notified_at: new Date(n.notifiedAt).toISOString(),
                  expires_at: new Date(n.expiresAt).toISOString(),
                  expires_in_hours: ((n.expiresAt - now2) / CONFIG.ONE_HOUR_MS).toFixed(1)
                }))
              }))
            }, null, 2), {
              headers: { "content-type": "application/json" }
            });
          } catch (error) {
            return new Response(JSON.stringify({
              error: error.message
            }, null, 2), {
              headers: { "content-type": "application/json" }
            });
          }
        case "next-matches":
          try {
            const matches = await fetchLongView(env);
            const now2 = new Date();
            const worthyMatches = matches.filter(shouldNotify);
            const upcoming = worthyMatches.filter((m) => new Date(m.utcDate) > now2).sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()).slice(0, 10);
            return new Response(JSON.stringify({
              count: upcoming.length,
              matches: upcoming.map((m) => ({
                id: m.id,
                home: translateTeam(m.homeTeam.name),
                away: translateTeam(m.awayTeam.name),
                home_en: m.homeTeam.name,
                away_en: m.awayTeam.name,
                code: m.competition.code,
                competition: translateCompetition(m.competition.code),
                utc_date: m.utcDate,
                tehran_time: new Date(m.utcDate).toLocaleString("fa-IR", { timeZone: env.TEHRAN_TZ }),
                time_en: new Date(m.utcDate).toLocaleString("en-GB", { timeZone: env.TEHRAN_TZ }),
                hours_until: ((new Date(m.utcDate).getTime() - now2.getTime()) / CONFIG.ONE_HOUR_MS).toFixed(2),
                minutes_until: ((new Date(m.utcDate).getTime() - now2.getTime()) / (60 * 1e3)).toFixed(0),
                notification_windows: {
                  "24h": isWithin24HourWindow(m, env),
                  "3h": isWithin3HourWindow(m, env),
                  "1h": isWithin1HourWindow(m, env),
                  "match_start": isMatchStartingNow(m, env)
                }
              }))
            }, null, 2), {
              headers: { "content-type": "application/json" }
            });
          } catch (error) {
            return new Response(JSON.stringify({
              error: error.message
            }, null, 2), {
              headers: { "content-type": "application/json" }
            });
          }
        case "clear-notifications":
          await env.STATE.delete(CONFIG.KV_NOTIFIED_KEY);
          return new Response("\u2705 Notification tracking cleared. Next run will send all notifications again.");
        case "clear-locks":
          await env.STATE.delete(CONFIG.KV_MATCHES_KEY);
          await env.STATE.delete(CONFIG.KV_USERS_KEY);
          await env.STATE.delete(CONFIG.KV_HEARTBEAT);
          await env.STATE.delete(CONFIG.KV_LAST_CRON);
          await env.STATE.delete("cron_status_v1");
          await env.STATE.delete(CONFIG.KV_NOTIFIED_KEY);
          await env.STATE.delete(CONFIG.KV_EXECUTION_LOCK);
          return new Response("\u2705 All cache cleared. Users need to /start again.");
        case "health":
          const st = await getCronStatus(env);
          const heartbeat = st.heartbeat;
          const users = await getRegisteredChats(env);
          const now = getNowTehran(env);
          return new Response(JSON.stringify({
            status: "healthy",
            timestamp: (new Date()).toISOString(),
            tehran_time: now.toISOString(),
            last_heartbeat: heartbeat && heartbeat !== "0" ? new Date(parseInt(heartbeat)).toISOString() : null,
            user_count: users.length,
            version: VERSION,
            api_source: await env.STATE.get(CONFIG.KV_LAST_SOURCE),
            timezone: env.TEHRAN_TZ,
            config: {
              date_range: `${CONFIG.DATE_RANGE_DAYS} days`,
              monitored_leagues: CONFIG.LEAGUES.length,
              domestic_cups: Object.keys(CONFIG.DOMESTIC_CUP_IDS).length,
              strict_mode: true,
              big_teams: Object.values(CONFIG.BIG_TEAMS_BY_LEAGUE).flat().length,
              notifications: {
                "24_hours_before": `${CONFIG.PRE_MATCH_NOTIFICATION_HOURS} hours`,
                "3_hours_before": `${CONFIG.REMINDER_3_HOURS} hours`,
                "1_hour_before": `${CONFIG.REMINDER_1_HOUR} hour`,
                "match_start_window": "after kickoff (-1..+20 min)",
                "result_after": `${CONFIG.POST_MATCH_NOTIFICATION_HOURS} hours`
              },
              execution_frequency: `${CONFIG.EXECUTION_FREQUENCY_MINUTES} minutes`
            }
          }, null, 2), {
            headers: { "content-type": "application/json" }
          });
        case "":
          return jsonResponse({
            status: "ok",
            version: VERSION,
            health: "/health",
            admin: "/admin"
          });
        case "trigger":
          try {
            const triggerStart = Date.now();
            await executeScheduledLogic(env);
            const elapsed = ((Date.now() - triggerStart) / 1e3).toFixed(1);
            return new Response(JSON.stringify({
              success: true,
              message: "\u2705 Trigger completed successfully",
              elapsed_seconds: elapsed,
              timestamp: (new Date()).toISOString()
            }, null, 2), { headers: { "content-type": "application/json" } });
          } catch (err) {
            return new Response(JSON.stringify({
              success: false,
              error: err.message,
              timestamp: (new Date()).toISOString()
            }, null, 2), {
              status: 500,
              headers: { "content-type": "application/json" }
            });
          }
        case "simple-test":
          const chats = await getRegisteredChats(env);
          const nowTime = getNowTehran(env);
          const msg = `*\u{1F527} \u062A\u0633\u062A \u0633\u06CC\u0633\u062A\u0645 \\- \u0646\u0633\u062E\u0647 ${VERSION}*

\u0628\u0627\u062A \u062F\u0631 \u062D\u0627\u0644 \u06A9\u0627\u0631 \u0627\u0633\u062A\\!
\u0632\u0645\u0627\u0646 \u062A\u0647\u0631\u0627\u0646: ${nowTime.toLocaleTimeString("fa-IR")}

\u2705 \u0631\u0641\u0639 \u0627\u0634\u06A9\u0627\u0644\u0627\u062A:
  \\- \u0645\u0634\u06A9\u0644 \u0630\u062E\u06CC\u0631\u0647\u200C\u0633\u0627\u0632\u06CC KV
  \\- TTL \u0627\u0635\u0644\u0627\u062D \u0634\u062F
  \\- \u067E\u0646\u062C\u0631\u0647\u200C\u0647\u0627\u06CC \u0632\u0645\u0627\u0646\u06CC \u0628\u0647\u0628\u0648\u062F \u06CC\u0627\u0641\u062A\u0647

\u{1F4CA} \u062A\u0646\u0638\u06CC\u0645\u0627\u062A:
  \\- \u0627\u0639\u0644\u0627\u0646 \u06F2\u06F4 \u0633\u0627\u0639\u062A \u0642\u0628\u0644: \u0641\u0639\u0627\u0644
  \\- \u0627\u0639\u0644\u0627\u0646 \u06F3 \u0633\u0627\u0639\u062A \u0642\u0628\u0644: \u0641\u0639\u0627\u0644
  \\- \u0627\u0639\u0644\u0627\u0646 \u06F1 \u0633\u0627\u0639\u062A \u0642\u0628\u0644: \u0641\u0639\u0627\u0644
  \\- \u0627\u0639\u0644\u0627\u0646 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC: \u0641\u0639\u0627\u0644`;
          await Promise.allSettled(chats.map((id) => sendTelegram(env, msg, id)));
          return new Response("\u2705 Simple test sent");
        case "send-tables":
          try {
            await applySettings(env);
            const tchats = await getRegisteredChats(env);
            const tres = await sendLeagueTables(env, tchats, { label: "\u067E\u0627\u06CC\u0627\u0646 \u0647\u0641\u062A\u0647 \u2014 \u0627\u0631\u0633\u0627\u0644 \u062F\u0633\u062A\u06CC" });
            const twa = await sendWeekAhead(env, tchats);
            return new Response(JSON.stringify({
              success: true,
              message: "League tables + week-ahead sent to " + tchats.length + " chat(s)",
              chats: tchats,
              sent: tres.sent,
              failed: tres.failed,
              week_ahead: { sent: twa.sent, failed: twa.failed, skipped: !twa.text },
              leagues: tres.leagues,
              version: VERSION,
              timestamp: (new Date()).toISOString()
            }, null, 2), { headers: { "content-type": "application/json" } });
          } catch (err) {
            return new Response(JSON.stringify({
              success: false,
              error: err.message,
              timestamp: (new Date()).toISOString()
            }, null, 2), {
              status: 500,
              headers: { "content-type": "application/json" }
            });
          }
        case "teams":
          return new Response(JSON.stringify({
            monitored_teams: Object.entries(CONFIG.BIG_TEAMS_BY_LEAGUE).reduce((acc, [league, teams]: any) => {
              acc[translateCompetition(league)] = teams.map((t) => translateTeam(t));
              return acc;
            }, {}),
            total_teams: Object.values(CONFIG.BIG_TEAMS_BY_LEAGUE).flat().length,
            leagues: CONFIG.LEAGUES,
            domestic_cups: Object.keys(CONFIG.DOMESTIC_CUP_IDS)
          }, null, 2), {
            headers: { "content-type": "application/json" }
          });
        default:
          return new Response("404 Not Found", { status: 404 });
      }
  return null;
}

const POST_GATE_ROUTES: RouteDef[] = [
  { path: "/admin", method: undefined, handler: async ({ req, env, url }): Promise<Response | null> => {
      const authed = await isAdminAuthed(req, env);
      return new Response(authed ? ADMIN_PAGE : LOGIN_PAGE, { headers: PAGE_SEC_HEADERS });
    return null;
  } },
  { path: "/api/settings", method: undefined, handler: async ({ req, env, url }): Promise<Response | null> => {
      if (req.method === "GET") {
        return jsonResponse(await getSettings(env));
      }
      if (req.method === "PUT") {
        const body = await readJson(req);
        if (!body) return jsonResponse({ error: "Invalid JSON body" }, 400);
        const saved = sanitizeSettings(body);
        let cat = null;
        try {
          cat = await env.STATE.get(CONFIG.KV_CLUBS_CATALOG, "json");
        } catch (e) {
          cat = null;
        }
        saved.teams = syncUclSelection(canonicalizeTeams(saved.teams, cat));
        await env.STATE.put(CONFIG.KV_SETTINGS_KEY, JSON.stringify(saved));
        await applySettings(env);
        return jsonResponse(saved);
      }
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
  { path: "/api/fa-teams", method: "GET", handler: async ({ req, env, url }): Promise<Response | null> => {
      try {
        const forget = String(url.searchParams.get("forget") || "").trim();
        if (forget) {
          if (forget.length > 60) return jsonResponse({ ok: false, error: "name too long" }, 200);
          const k = normTeamKey(forget);
          const rec2 = await env.STATE.get(CONFIG.KV_FA_TEAMS, "json").catch(() => null) || { learned: {}, failed: {} };
          const had = rec2.learned && rec2.learned[k];
          if (had) {
            delete rec2.learned[k];
            rec2.ts = Date.now();
            await env.STATE.put(CONFIG.KV_FA_TEAMS, JSON.stringify(rec2)).catch(() => {
            });
            resetFaAiCache();
          }
          return jsonResponse({ ok: !!had, forgot: had ? forget : null, learned: Object.keys(rec2.learned || {}).length });
        }
        if (url.searchParams.get("run") === "1") {
          const res = await maybeRunFaAi(env, true);
          return jsonResponse(Object.assign({ ok: true, ai: !!env.AI }, res));
        }
        const rec = await env.STATE.get(CONFIG.KV_FA_TEAMS, "json").catch(() => null) || { learned: {}, failed: {} };
        const pub = await env.STATE.get(CONFIG.KV_PUBLIC_MATCHES, "json").catch(() => null);
        await ensureFaAiCache(env).catch(() => {
        });
        const pending = pub && pub.data ? collectUnknownTeamNames(pub.data).length : 0;
        const lastRun = parseInt(await env.STATE.get(CONFIG.KV_FA_LAST_RUN).catch(() => null)) || 0;
        const v3 = await env.STATE.get(CONFIG.KV_V3_CATALOG, "json").catch(() => null);
        const sample = Object.entries(rec.learned || {}).slice(0, 12).map(([k, v]) => ({ key: k, fa: v, source: "ai" }));
        const overrideSample = Object.entries(rec.overrides || {}).slice(0, 12).map(([k, v]) => ({ key: k, fa: v, source: "admin" }));
        return jsonResponse({ ok: true, ai: !!env.AI, learned: Object.keys(rec.learned || {}).length, overrides: Object.keys(rec.overrides || {}).length, pending, lastRun: lastRun ? new Date(lastRun).toISOString() : null, v3: v3 && Array.isArray(v3.clubs) ? v3.clubs.length : 0, sample: sample.concat(overrideSample) });
      } catch (e) {
        return jsonResponse({ ok: false, error: "fa-teams failed: " + e.message }, 200);
      }
    return null;
  } },
    // v12.x-admin-override: POST /api/fa-teams/override — admin manually sets
    // or corrects a Farsi translation for any team name. Stored in
    // fa_teams_ai.overrides (takes priority over AI-learned + static dict).
  { path: "/api/fa-teams/override", method: "POST", handler: async ({ req, env, url }): Promise<Response | null> => {
      if (!await isAdminAuthed(req, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      const body = await readJson(req);
      const en = body && typeof body.en === "string" ? body.en.trim() : "";
      const fa = body && typeof body.fa === "string" ? body.fa.trim() : "";
      if (!en || !fa) return jsonResponse({ error: "en + fa required" }, 400);
      if (en.length > 60 || fa.length > 60) return jsonResponse({ error: "too long" }, 400);
      // v13.7-security: validate the Farsi name at the storage boundary.
      // The AI learner already gates via isValidFaName (Persian-only charset);
      // admin overrides are admin-controlled (auth-gated) but applying the
      // same charset gate here is defense-in-depth — even a compromised admin
      // token cannot store an arbitrary HTML/script payload in fa_teams_ai.
      // (The client renders team names via textContent, so the XSS surface
      // was already mitigated; this closes the storage door too.)
      if (!isValidFaName(fa)) return jsonResponse({ error: "fa must be Persian letters only (2–42 chars)" }, 400);
      const k = normTeamKey(en);
      if (!k) return jsonResponse({ error: "invalid name" }, 400);
      const rec = await env.STATE.get(CONFIG.KV_FA_TEAMS, "json").catch(() => null) || { learned: {}, failed: {}, overrides: {} };
      if (!rec.overrides) rec.overrides = {};
      rec.overrides[k] = fa;
      rec.ts = Date.now();
      await env.STATE.put(CONFIG.KV_FA_TEAMS, JSON.stringify(rec)).catch(() => {});
      resetFaAiCache();
      // v12.x-override-fix: invalidate the public-matches KV cache so the
      // next request re-fetches with the updated translation. Without this,
      // the cached data (3min TTL) still has the old faName and the override
      // won't appear until the cache expires naturally.
      await env.STATE.delete(CONFIG.KV_PUBLIC_MATCHES).catch(() => {});
      return jsonResponse({ ok: true, en, fa, key: k, overrides: Object.keys(rec.overrides).length });
    return null;
  } },
  { path: "/api/broadcast", method: "POST", handler: async ({ req, env, url }): Promise<Response | null> => {
      const body = await readJson(req);
      const text = body && typeof body.text === "string" && body.text.trim();
      if (!text) return jsonResponse({ error: "text is required" }, 400);
      const chats = await getRegisteredChats(env);
      if (!chats.length) return jsonResponse({ sent: 0, total: 0 });
      const results = await Promise.allSettled(chats.map((c) => sendTelegram(env, escapeMarkdownCharacters(text), c)));
      const okCount = results.filter((r) => r.status === "fulfilled" && r.value === true).length;
      return jsonResponse({ sent: okCount, total: chats.length });
    return null;
  } },
    // v13.11-migration: bot migration control endpoints. The admin starts a
    // 2-week migration broadcast (sends "join the new bot" every 3 days),
    // checks status, or stops it early.
  { path: "/api/migrate/start", method: "POST", handler: async ({ req, env, url }): Promise<Response | null> => {
      const mig = await env.STATE.get(CONFIG.KV_MIGRATION, "json").catch(() => null) || {};
      mig.active = true;
      mig.startedAt = Date.now();
      mig.lastRound = 0;
      mig.totalSent = mig.totalSent || 0;
      mig.newBot = CONFIG.MIGRATION_NEW_BOT_HANDLE;
      await env.STATE.put(CONFIG.KV_MIGRATION, JSON.stringify(mig)).catch(() => {});
      return jsonResponse({ ok: true, active: true, startedAt: new Date(mig.startedAt).toISOString(), intervalDays: CONFIG.MIGRATION_INTERVAL_DAYS, totalDays: CONFIG.MIGRATION_TOTAL_DAYS, newBot: CONFIG.MIGRATION_NEW_BOT_HANDLE });
    return null;
  } },
  { path: "/api/migrate/stop", method: "POST", handler: async ({ req, env, url }): Promise<Response | null> => {
      const mig = await env.STATE.get(CONFIG.KV_MIGRATION, "json").catch(() => null) || {};
      mig.active = false;
      mig.endedAt = Date.now();
      await env.STATE.put(CONFIG.KV_MIGRATION, JSON.stringify(mig)).catch(() => {});
      return jsonResponse({ ok: true, active: false, totalSent: mig.totalSent || 0 });
    return null;
  } },
  { path: "/api/migrate/status", method: "GET", handler: async ({ req, env, url }): Promise<Response | null> => {
      const mig = await env.STATE.get(CONFIG.KV_MIGRATION, "json").catch(() => null) || {};
      const users = await getRegisteredChats(env);
      return jsonResponse({
        active: !!mig.active,
        startedAt: mig.startedAt ? new Date(mig.startedAt).toISOString() : null,
        lastRound: mig.lastRound ? new Date(mig.lastRound).toISOString() : null,
        totalSent: mig.totalSent || 0,
        totalUsers: users.length,
        intervalDays: CONFIG.MIGRATION_INTERVAL_DAYS,
        totalDays: CONFIG.MIGRATION_TOTAL_DAYS,
        newBot: CONFIG.MIGRATION_NEW_BOT_HANDLE
      });
    return null;
  } },
  { path: "/api/standings", method: "GET", handler: async ({ req, env, url }): Promise<Response | null> => {
      const code = String(url.searchParams.get("code") || "").toUpperCase();
      if (!code) return jsonResponse({ error: "code param required (e.g. PL, CL)" }, 400);
      const fresh = await fetchStandings(env, code);
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
  { path: "/api/clubs", method: "GET", handler: async ({ req, env, url }): Promise<Response | null> => {
      try {
        const q = String(url.searchParams.get("q") || "").trim();
        const hint = String(url.searchParams.get("hint") || "").toUpperCase();
        const force = url.searchParams.get("refresh") === "1";
        if (q.length > 40) return jsonResponse({ ok: false, error: "query too long" });
        const cat = await getClubsCatalog(env, force);
        if (!q) return jsonResponse({ ok: true, count: cat.count, fetchedAt: cat.fetchedAt });
        return jsonResponse({
          ok: true,
          count: cat.count,
          fetchedAt: cat.fetchedAt,
          q,
          results: clubsSearch(cat, q, hint)
        });
      } catch (e) {
        return jsonResponse({ ok: false, error: "clubs lookup failed: " + e.message }, 200);
      }
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
  { path: "/api/test", method: "POST", handler: async ({ req, env, url }): Promise<Response | null> => {
      const chats = await getRegisteredChats(env);
      const msg = "\u{1F9EA} \u067E\u06CC\u0627\u0645 \u062A\u0633\u062A \u062A\u0646\u0638\u06CC\u0645\u0627\u062A\n\u0631\u0628\u0627\u062A \u0641\u0639\u0627\u0644 \u0627\u0633\u062A \u2713";
      const results = await Promise.allSettled(chats.map((id) => sendTelegram(env, msg, id)));
      const sent = results.filter((r) => r.status === "fulfilled" && r.value === true).length;
      return jsonResponse({ sent, total: chats.length });
    return null;
  } },
  { path: "/api/simulate", method: "POST", handler: async ({ req, env, url }): Promise<Response | null> => {
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
    // v12.33-xpost: X (Twitter) admin routes. All require admin auth.
    // /admin/x-test sends a manual test post (admin-token protected); the
    // /api/x/* endpoints power the admin panel's X status card.
  { path: "/admin/x-test", method: "POST", handler: async ({ req, env, url }): Promise<Response | null> => {
      if (!await isAdminAuthed(req, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      try {
        const r = await xTestPost(env);
        return jsonResponse(r, r.ok ? 200 : 400);
      } catch (e) {
        return jsonResponse({ ok: false, error: e.message }, 500);
      }
    return null;
  } },
  { path: "/api/x/status", method: "GET", handler: async ({ req, env, url }): Promise<Response | null> => {
      if (!await isAdminAuthed(req, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      try {
        return jsonResponse(await getXStatus(env));
      } catch (e) {
        return jsonResponse({ error: e.message }, 500);
      }
    return null;
  } },
  { path: "/api/x/phase", method: "PUT", handler: async ({ req, env, url }): Promise<Response | null> => {
      if (!await isAdminAuthed(req, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      try {
        const body = await readJson(req);
        const raw = body && typeof body.phase === "string" ? body.phase : "";
        const clean = raw.split(",").map((s) => s.trim().toLowerCase()).filter((s) => ["coronation", "ft", "kickoff", "tables", "media"].indexOf(s) !== -1);
        if (!clean.length) return jsonResponse({ error: "phase must include at least one of: coronation, ft, kickoff, tables, media" }, 400);
        await env.STATE.put(X_CONFIG.KV_PHASE, clean.join(",")).catch(() => {
        });
        return jsonResponse({ ok: true, phase: clean });
      } catch (e) {
        return jsonResponse({ error: e.message }, 500);
      }
    return null;
  } },
  { path: "/api/x/dry-run", method: "PUT", handler: async ({ req, env, url }): Promise<Response | null> => {
      if (!await isAdminAuthed(req, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      try {
        const body = await readJson(req);
        const v = body && body.dryRun ? "1" : "0";
        await env.STATE.put(X_CONFIG.KV_DRY_RUN, v).catch(() => {
        });
        return jsonResponse({ ok: true, dryRun: v === "1" });
      } catch (e) {
        return jsonResponse({ error: e.message }, 500);
      }
    return null;
  } },
  { path: "/api/x/enabled", method: "PUT", handler: async ({ req, env, url }): Promise<Response | null> => {
      if (!await isAdminAuthed(req, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      try {
        const body = await readJson(req);
        const v = body && body.enabled ? "1" : "0";
        await env.STATE.put(X_CONFIG.KV_ENABLED, v).catch(() => {
        });
        return jsonResponse({ ok: true, enabled: v === "1" });
      } catch (e) {
        return jsonResponse({ error: e.message }, 500);
      }
    return null;
  } },
  { path: "/api/x/clear-pause", method: "POST", handler: async ({ req, env, url }): Promise<Response | null> => {
      if (!await isAdminAuthed(req, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      await env.STATE.delete(X_CONFIG.KV_PAUSE).catch(() => {
      });
      return jsonResponse({ ok: true });
    return null;
  } },
    // v13.23-audit: on-demand audit. Compares sportsignal.ir match data (ground
    // truth from the tracked pool) with the bot's notified_matches_v6 KV.
    // Reports which matches are missing expected notifications.
  { path: "/api/audit", method: "GET", handler: async ({ req, env, url }): Promise<Response | null> => {
      try {
        const tracked = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
        const matches = tracked && Array.isArray(tracked.matches) ? tracked.matches : [];
        const { auditNotifications } = await import("./notifications");
        const result = await auditNotifications(env, matches);
        return jsonResponse(result);
      } catch (e) {
        return jsonResponse({ error: "audit failed: " + e.message }, 500);
      }
    return null;
  } },
  { path: "/api/diag-public", method: undefined, handler: async ({ req, env, url }): Promise<Response | null> => {
    if (!(await isAdminAuthed(req, env))) return null; // fall through (was: skipped if, ended at the 404 tail)
      await applySettings(env);
      const live = await fetchMatchesFromAPI(env);
      const pool = await getCachedMatches(env);
      const now = Date.now();
      const codeOf = (list) => list.reduce((a, m) => {
        const c = m.competition.code;
        a[c] = (a[c] || 0) + 1;
        return a;
      }, {});
      return jsonResponse({
        live_len: live.length,
        live_worthy: live.filter(shouldNotify).length,
        live_codes: codeOf(live),
        cache_len: pool.length,
        cache_worthy: pool.filter(shouldNotify).length,
        cache_codes: codeOf(pool),
        live_sample: live.slice(0, 6).map((m) => `${m.competition.code}: ${m.homeTeam.name} vs ${m.awayTeam.name} [${m.status}] ${shouldNotify(m) ? "WORTHY" : "no"}`),
        cache_sample: pool.slice(0, 6).map((m) => `${m.competition.code}: ${m.homeTeam.name} vs ${m.awayTeam.name} [${m.status}] ${shouldNotify(m) ? "WORTHY" : "no"}`)
      });
    return null;
  } },
  { path: "/api/diag-fd", method: undefined, handler: async ({ req, env, url }): Promise<Response | null> => {
    if (!(await isAdminAuthed(req, env))) return null; // fall through (was: skipped if, ended at the 404 tail)
      const days = parseInt(url.searchParams.get("days") || "7");
      const comps = url.searchParams.get("comps") || "PD";
      const dateFrom = new Date(Date.now() - 2 * 864e5).toISOString().split("T")[0];
      const dateTo = new Date(Date.now() + days * 864e5).toISOString().split("T")[0];
      const key = env.API_TOKEN || "";
      const u = `${CONFIG.API_URL}?competitions=${comps}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
      // v13.36-anytight: res is a Response | { err: string } union on
      // purpose — the fetch failure surfaces as a network-error JSON
      // instead of an exception. The `: any` annotation on the
      // declaration keeps `res.err` / `res.text()` legal on the union
      // (load-bearing; the harness already strips this exact shape).
      const res: any = await fetch(u, { headers: { "X-Auth-Token": key } }).catch((e) => ({ err: e.message }));
      if (res.err) return jsonResponse({ comps, error: "network: " + res.err });
      const text = await res.text();
      let count = null;
      try {
        count = (JSON.parse(text).matches || []).length;
      } catch (e) {
      }
      return jsonResponse({ comps, days, status: res.status, count, body: text.substring(0, 200) });
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
    if (url.pathname === "/admin/login" && req.method === "GET") {
      return new Response(null, { status: 302, headers: { "location": "/admin", "cache-control": "no-store" } });
    }
    if (url.pathname === "/admin/login" && req.method === "POST") {
      const body = await readJson(req);
      const ip = req.headers.get("CF-Connecting-IP") || "unknown";
      const username = body && body.username || "";
      const failKey = "login_fail_" + ip + "_" + username;
      const fails = parseInt(await env.STATE.get(failKey).catch(() => null)) || 0;
      if (fails >= 5) {
        console.warn("admin login rate-limited: ip=" + ip + " fails=" + fails);
        return new Response(JSON.stringify({ error: "Too many attempts, try later" }), { status: 429, headers: { "content-type": "application/json", "retry-after": "600" } });
      }
      if (!env.ADMIN_TOKEN) {
        return jsonResponse({ error: "ADMIN_TOKEN secret is not set" }, 500);
      }
      const storedHash = await getAdminPassHash(env);
      let ok = !!(body && username === "admin" && body.password && env.ADMIN_PASS && timingSafeEqualStr(body.password, env.ADMIN_PASS));
      if (!ok && body && username === "admin" && body.password && storedHash) {
        ok = timingSafeEqualStr(await hashPassword(body.password, storedHash.salt), storedHash.hash);
      }
      if (!ok) {
        // v13.11-admin-fix: if neither ADMIN_PASS nor a stored hash is set,
        // tell the user clearly (so they know to run `wrangler secret put
        // ADMIN_PASS`) instead of the generic "Invalid credentials".
        if (!env.ADMIN_PASS && !storedHash) {
          return jsonResponse({ error: "Admin password not configured. Run: wrangler secret put ADMIN_PASS" }, 500);
        }
        await env.STATE.put(failKey, String(fails + 1), { expirationTtl: 600 }).catch(() => {
        });
        return jsonResponse({ error: "Invalid credentials" }, 401);
      }
      await env.STATE.delete(failKey).catch(() => {
      });
      const sid = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      // v13.30-login-fix: the session cookie is now ALWAYS the stateless
      // HMAC-signed token (sid.HMAC(sid, ADMIN_TOKEN)). v13.26 only used the
      // signed token when the KV session WRITE failed — but the equally real
      // failure mode is the KV READ-after-write miss (eventual consistency,
      // up to 60s global propagation): the write succeeded, the immediate
      // /admin read-back saw nothing, isValidAdminSession returned false and
      // the user was bounced straight back to the login page — the reported
      // "I cannot login although I could before" loop. A signed token
      // verifies locally with zero KV reads, so login can never race storage.
      // The KV write is kept (audit/observability + revocation best-effort
      // via /admin/logout), but is no longer on the auth critical path.
      let sessionToken = sid;
      try {
        await env.STATE.put("admin_sess_" + sid, JSON.stringify({ created: Date.now(), ip }), { expirationTtl: 43200 });
      } catch (putErr) {
        console.warn("admin session KV write failed (stateless token unaffected): " + putErr.message);
      }
      try {
        const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.ADMIN_TOKEN), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(sid));
        const sigHex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
        sessionToken = sid + "." + sigHex;
      } catch (e2) {
        // HMAC path failed (should not happen) — the plain sid + the KV
        // record written above remain the fallback.
        console.error("admin session HMAC signing failed, using KV-backed sid: " + e2.message);
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "set-cookie": "admin_auth=" + sessionToken + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200"
        }
      });
    }
    if (url.pathname === "/admin/logout" && req.method === "POST") {
      const sid = getAdminCookieToken(req);
      // v13.30-login-fix: stateless tokens are "sid.signature" — the KV audit
      // record is keyed by sid alone, so strip the signature before deleting.
      const bareSid = sid ? sid.split(".")[0] : null;
      if (bareSid) await env.STATE.delete("admin_sess_" + bareSid).catch(() => {
      });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "set-cookie": "admin_auth=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"
        }
      });
    }
    if (url.pathname === "/admin/change-password" && req.method === "POST") {
      if (!await isAdminAuthed(req, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      const body = await readJson(req);
      const np = body && body.password;
      if (!np || np.length < 8) return jsonResponse({ error: "Password too short (min 8)" }, 400);
      const salt = crypto.randomUUID();
      const hash = await hashPassword(np, salt);
      await env.STATE.put("admin_pass_hash", JSON.stringify({ salt, hash }));
      return jsonResponse({ ok: true });
    }
    if (url.pathname === "/api/public-matches" && req.method === "GET") {
      // v13.7-perf: stale-while-revalidate on the public-matches endpoint.
      // The KV cache (CONFIG.KV_PUBLIC_MATCHES, 3-min TTL inside
      // fetchPublicMatches) is the fast path. When it is FRESH (<3min) we
      // await fetchPublicMatches as before (it returns the cached data
      // without a provider sweep). When it is STALE-but-present (3–10min)
      // we return the cached payload INSTANTLY and kick the refresh to the
      // background via ctx.waitUntil — the first visitor after TTL expiry
      // no longer pays the 2–5s provider-sweep latency; the next visitor
      // sees the refreshed data. Cache older than 10min (or missing) falls
      // through to a synchronous refresh (the original behavior), so a cold
      // cache or a long gap still resolves inline. The 7-day snapshot
      // fallback below is unchanged.
      try {
        // v13.31-kv-budget: FRESH_MS 3min → 5min — now exactly the KV TTL
        // inside fetchPublicMatches (300s). Under continuous traffic the
        // background refresh therefore runs at most ~288×/day instead of
        // ~480×/day (each refresh = provider sweep + KV writes), and the
        // data served is never older than the previous 5-min cadence.
        // STALE_GRACE_MS unchanged: serve-stale + bg-refresh window 5–10min.
        const FRESH_MS = 3e5;         // 5min  — matches fetchPublicMatches' KV TTL
        const STALE_GRACE_MS = 6e5;   // 10min — serve stale + bg-refresh window
        const kv = await env.STATE.get(CONFIG.KV_PUBLIC_MATCHES, "json").catch(() => null);
        const age = kv && kv.ts ? Date.now() - kv.ts : Infinity;
        if (kv && kv.data && age < STALE_GRACE_MS) {
          const stale = age >= FRESH_MS;
          if (stale) {
            // Serve the stale cache now; refresh in the background. The
            // refresh path (fetchPublicMatches) re-checks the KV + refresh
            // lock, so a concurrent request can't double-sweep.
            ctx.waitUntil(fetchPublicMatches(env, req).catch((e) => console.warn("SWR bg refresh failed: " + e.message)));
          }
          if (env.AI) ctx.waitUntil(maybeRunFaAi(env).catch((e) => console.warn("FA-AI bg run failed: " + e.message)));
          return jsonResponse(stale ? Object.assign({}, kv.data, { swr: true, cachedAt: new Date(kv.ts).toISOString() }) : kv.data);
        }
        const data = await fetchPublicMatches(env, req);
        if (env.AI) ctx.waitUntil(maybeRunFaAi(env).catch((e) => console.warn("FA-AI bg run failed: " + e.message)));
        return jsonResponse(data);
      } catch (e) {
        console.error("public-matches route failed: " + e.message);
        // v12.x-resilience: try the long-TTL snapshot before giving up
        // and returning an empty degraded response. If even the snapshot
        // is missing/empty, fall through to the degraded JSON (the page
        // hides the cards in that case).
        try {
          const snap = await env.STATE.get(CONFIG.KV_PUBLIC_SNAPSHOT, "json").catch(() => null);
          if (snap && snap.data && (snap.data.upcoming || snap.data.finished || snap.data.topSpot || snap.data.ucl || snap.data.standings)) {
            const stale = Object.assign({}, snap.data, { cached: true, cachedAt: snap.ts ? new Date(snap.ts).toISOString() : snap.data.fetchedAt });
            return jsonResponse(stale);
          }
        } catch (e2) {
          console.error("public-matches snapshot fallback failed: " + e2.message);
        }
        return jsonResponse({ upcoming: [], finished: [], nextBig: null, standings: null, cups: null, ucl: null, degraded: true });
      }
    }
    if (url.pathname === "/public" || url.pathname === "/") {
      return new Response(PUBLIC_PAGE.replace("__PAGE_TZ__", env.TEHRAN_TZ), { headers: PAGE_SEC_HEADERS });
    }
    // v13.12-cards: match-card SVG route. Generates a visual "team A vs
    // team B" card with the two crests + names + kickoff time + competition.
    // The SVG is self-contained (crests base64-inlined server-side). Used
    // by the bot's sendPhoto (converted to PNG via Cloudflare Image Resizing
    // if available) + available as an OG image for the public page.
    // Public (no auth) — the card carries no sensitive data.
    if (url.pathname.startsWith("/api/card/")) {
      const rawPath = url.pathname.slice("/api/card/".length);
      const isPng = rawPath.endsWith(".png");
      const matchKeyParam = decodeURIComponent(rawPath).replace(/\.svg$/, "").replace(/\.png$/, "");
      const lang = url.searchParams.get("lang") === "en" ? "en" : "fa";
      try {
        // v13.12-cards: look up the match in the tracked pool (KV_MATCHES_KEY,
        // 24h TTL — reliably populated by every cron sweep) first, then the
        // short-TTL public-matches cache as fallback.
        let match = null;
        const tracked = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
        if (tracked && Array.isArray(tracked.matches)) {
          match = tracked.matches.find((m) => {
            if (!m || !m.homeTeam || !m.awayTeam || !m.utcDate) return false;
            return matchKey(m) === matchKeyParam || String(m.id || "") === matchKeyParam;
          });
        }
        if (!match) {
          const cached = await env.STATE.get(CONFIG.KV_PUBLIC_MATCHES, "json").catch(() => null);
          if (cached && cached.data) {
            const pools = [].concat(
              cached.data.upcoming || [],
              cached.data.finished || [],
              cached.data.thisWeek || [],
              cached.data.nextWeek || [],
              cached.data.topSpot && cached.data.topSpot.matches ? cached.data.topSpot.matches : [],
              cached.data.ucl && cached.data.ucl.matches ? cached.data.ucl.matches : [],
              cached.data.nextBig ? [cached.data.nextBig] : [],
              cached.data.cups ? cached.data.cups.map((c) => c.next).filter(Boolean) : []
            );
            match = pools.find((m) => {
              if (!m || !m.homeTeam || !m.awayTeam || !m.utcDate) return false;
              return matchKey(m) === matchKeyParam || String(m.id || "") === matchKeyParam;
            });
          }
        }
        if (!match) return new Response("card: match not found", { status: 404, headers: { "content-type": "text/plain" } });
        if (isPng) {
          // v13.17-cards: render SVG→PNG via resvg-wasm (Workers-compatible).
          // Telegram's sendPhoto can't fetch SVG URLs, so the bot sends the
          // PNG binary directly. This endpoint is also useful for OG images.
          const { renderCardPngCached } = await import("./card");
          const png = await renderCardPngCached(env, match, lang);
          if (!png) return new Response("card: png render failed", { status: 500, headers: { "content-type": "text/plain" } });
          return new Response(png, {
            headers: {
              "content-type": "image/png",
              "cache-control": "public, max-age=300",
              "access-control-allow-origin": "*"
            }
          });
        }
        const { buildMatchCardSvg } = await import("./card");
        const svg = await buildMatchCardSvg(env, match, lang);
        return new Response(svg, {
          headers: {
            "content-type": "image/svg+xml; charset=utf-8",
            "cache-control": "public, max-age=300",
            "access-control-allow-origin": "*"
          }
        });
      } catch (e) {
        return new Response("card: " + e.message, { status: 500, headers: { "content-type": "text/plain" } });
      }
    }
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
