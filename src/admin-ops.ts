// SportSignal — admin & ops endpoints (split from api.ts in v13.47-seams):
// the admin-scoped API routes (settings, fa-teams + overrides, broadcast,
// migration control, clubs, diagnostics) and the legacy GET
// action endpoints (trigger, clear-locks, debug-notifications, ...).
// Bodies are byte-identical moves; api.ts imports ADMIN_OPS_ROUTES and
// spreads them into POST_GATE_ROUTES (all paths are distinct — the spread
// order is behavior-neutral; the "*" catch-all stays last in api.ts).

import type { Env, RouteCtx, RouteDef } from "./types";
import { CONFIG, VERSION } from "./config";
import { readJson, jsonResponse, escapeMarkdownCharacters, getNowTehran } from "./utils";
import { normTeamKey } from "./teams";
import { translateTeam, translateCompetition, resetFaAiCache, ensureFaAiCache, isValidFaName } from "./translate";
import { maybeRunFaAi, collectUnknownTeamNames } from "./fa-ai";
import { isWithin24HourWindow, isWithin3HourWindow, isWithin1HourWindow, isMatchStartingNow } from "./match-windows";
import { getNotifiedMatches } from "./match-dedupe";
// v13.92-d1userstore: clear-locks wipes the chat registry through the seam.
import { resetChatRegistry } from "./user-store";
import { shouldNotify, shouldReport } from "./match-classify";
// v13.109-consolidated: the diag's WORTHY verdicts read the UCL-participant
// set — prime it (no-op on warm isolates) so the strict tier's exception
// shows truthfully.
import { primeUclParticipants } from "./notify-engine";
import { fetchLongView, fetchMatchesFromAPI } from "./providers";
import { getCachedMatches } from "./match-pool";
import { sendTelegram } from "./telegram";
import { sendLeagueTables, sendWeekAhead } from "./digest-weekly";
import { getRegisteredChats, getBotMembers } from "./users";
import { isAdminAuthed, getSettings, sanitizeSettings, syncUclSelection, canonicalizeTeams, getClubsCatalog, applySettings, clubsSearch } from "./admin";
import { getCronStatus } from "./monitoring";
import { executeScheduledLogic } from "./cron";

export async function legacyGetAction(c: RouteCtx): Promise<Response | null> {
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
          // v13.92-d1userstore: the registry wipe goes through the seam (D1
          // table + legacy key); prefs/profiles survive (historic behavior —
          // "Users need to /start again").
          await resetChatRegistry(env);
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

export const ADMIN_OPS_ROUTES: RouteDef[] = [
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

  { path: "/api/test", method: "POST", handler: async ({ req, env, url }): Promise<Response | null> => {
      const chats = await getRegisteredChats(env);
      const msg = "\u{1F9EA} \u067E\u06CC\u0627\u0645 \u062A\u0633\u062A \u062A\u0646\u0638\u06CC\u0645\u0627\u062A\n\u0631\u0628\u0627\u062A \u0641\u0639\u0627\u0644 \u0627\u0633\u062A \u2713";
      const results = await Promise.allSettled(chats.map((id) => sendTelegram(env, msg, id)));
      const sent = results.filter((r) => r.status === "fulfilled" && r.value === true).length;
      return jsonResponse({ sent, total: chats.length });
    return null;
  } },

    // v13.23-audit: on-demand audit. Compares sportsignal.ir match data (ground
    // truth from the tracked pool) with the bot's notified_matches_v6 KV.
    // Reports which matches are missing expected notifications.
  { path: "/api/audit", method: "GET", handler: async ({ req, env, url }): Promise<Response | null> => {
      try {
        const tracked = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
        const matches = tracked && Array.isArray(tracked.matches) ? tracked.matches : [];
        const { auditNotifications } = await import("./notify-audit");
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
      // v13.109-consolidated: prime before the verdicts (KV-only read).
      await primeUclParticipants(env, live.concat(pool)).catch(() => null);
      const now = Date.now();
      const codeOf = (list) => list.reduce((a, m) => {
        const c = m.competition.code;
        a[c] = (a[c] || 0) + 1;
        return a;
      }, {});
      return jsonResponse({
        live_len: live.length,
        live_worthy: live.filter(shouldNotify).length,
        // v13.109-consolidated: the two tiers side by side — worthy (strict,
        // individual pushes) vs reportable (consolidated tier: digests,
        // website, pool retention).
        live_reportable: live.filter(shouldReport).length,
        live_codes: codeOf(live),
        cache_len: pool.length,
        cache_worthy: pool.filter(shouldNotify).length,
        cache_reportable: pool.filter(shouldReport).length,
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
];
