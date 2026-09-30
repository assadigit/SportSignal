// SportSignal — Telegram message composers (24h / big-match / 3h / 1h /
// 5min / kickoff / FT result + special banners) and the standings pipeline
// (fetch + KV cache + league-table text).


import { CONFIG } from "./config";
import { STAGE_FA, COMP_EN, SPORTSCORE_SLUGS, STAND_CODE_ORDER } from "./tables";
import type { Env } from "./types";
import { toFaDigits, escapeMarkdownCharacters, getJalaliDate, getJalaliTime, getRelativeTimeUntilMatch, getEnglishDate, getEnglishTime, getEnglishRelative, fetchJSON, enStageName, bumpSubrequest } from "./utils";
import { normalizeTeamName } from "./teams";
import { translateTeam, translateCompetition, translateVenue, faStageName, isDomesticCup } from "./translate";
import { normAlias, isMasterPair, isDerby, rivalryName } from "./matches";
import { providerSuspended, suspendProvider, clearProviderSuspension, fetchPglTableFromWikipedia } from "./providers";

export function format24HourMessage(match, env, lang) {
  const en = lang === "en";
  const homeTeam = en ? match.homeTeam.name : translateTeam(match.homeTeam.name);
  const awayTeam = en ? match.awayTeam.name : translateTeam(match.awayTeam.name);
  const competition = en ? (COMP_EN[match.competition.code] || match.competition.code) : translateCompetition(match.competition.code);
  const dateStr = en ? getEnglishDate(match.utcDate, env) : getJalaliDate(match.utcDate, env);
  const timeStr = en ? getEnglishTime(match.utcDate, env) : getJalaliTime(match.utcDate, env);
  const stage = en
    ? (enStageName(match.stage) || (match.stage ? match.stage.replace(/_/g, " ") : "Group stage"))
    : (STAGE_FA[String(match.stage || "").toUpperCase()] || (match.stage ? match.stage.replace(/_/g, " ") : "\u0645\u0631\u062D\u0644\u0647 \u06AF\u0631\u0648\u0647\u06CC"));
  // v13.10-clean: date-first layout per the user's ask. No header, no countdown.
  let message = `\u{1F4C5} ${escapeMarkdownCharacters(dateStr)}\n`;
  message += `\u23F0 ${escapeMarkdownCharacters(timeStr)}\n`;
  message += `${escapeMarkdownCharacters(homeTeam)} \u{1F19A} ${escapeMarkdownCharacters(awayTeam)}\n`;
  message += `${escapeMarkdownCharacters(competition)}`;
  if (match.competition.code === "CL" || isDomesticCup(match.competition.code) || match.stage !== "REGULAR_SEASON") {
    message += ` \u2014 ${escapeMarkdownCharacters(stage)}`;
  }
  return message;
}
export function formatBigMatchMessage(match, env, lang) {
  const en = lang === "en";
  const homeTeam = en ? match.homeTeam.name : translateTeam(match.homeTeam.name);
  const awayTeam = en ? match.awayTeam.name : translateTeam(match.awayTeam.name);
  const competition = en ? (COMP_EN[match.competition.code] || match.competition.code) : translateCompetition(match.competition.code);
  const dateStr = en ? getEnglishDate(match.utcDate, env) : getJalaliDate(match.utcDate, env);
  const timeStr = en ? getEnglishTime(match.utcDate, env) : getJalaliTime(match.utcDate, env);
  const stage = en
    ? (enStageName(match.stage) || (match.stage ? match.stage.replace(/_/g, " ") : ""))
    : (STAGE_FA[String(match.stage || "").toUpperCase()] || (match.stage ? match.stage.replace(/_/g, " ") : ""));
  // v13.10-clean: date-first, 🔥 on the match line. No header, no countdown.
  let message = `\u{1F4C5} ${escapeMarkdownCharacters(dateStr)}\n`;
  message += `\u23F0 ${escapeMarkdownCharacters(timeStr)}\n`;
  message += `\u{1F525} ${escapeMarkdownCharacters(homeTeam)} \u{1F19A} ${escapeMarkdownCharacters(awayTeam)}\n`;
  message += `${escapeMarkdownCharacters(competition)}`;
  if (match.competition.code === "CL" || isDomesticCup(match.competition.code) || match.stage !== "REGULAR_SEASON") {
    message += ` \u2014 ${escapeMarkdownCharacters(stage)}`;
  }
  return message;
}
export function format3HourMessage(match, env, lang) {
  const en = lang === "en";
  const homeTeam = en ? match.homeTeam.name : translateTeam(match.homeTeam.name);
  const awayTeam = en ? match.awayTeam.name : translateTeam(match.awayTeam.name);
  const competition = en ? (COMP_EN[match.competition.code] || match.competition.code) : translateCompetition(match.competition.code);
  const dateStr = en ? getEnglishDate(match.utcDate, env) : getJalaliDate(match.utcDate, env);
  const timeStr = en ? getEnglishTime(match.utcDate, env) : getJalaliTime(match.utcDate, env);
  // v13.10-clean: date-first layout per the user's ask. No header, no countdown.
  let message = `\u{1F4C5} ${escapeMarkdownCharacters(dateStr)}\n`;
  message += `\u23F0 ${escapeMarkdownCharacters(timeStr)}\n`;
  message += `${escapeMarkdownCharacters(homeTeam)} \u{1F19A} ${escapeMarkdownCharacters(awayTeam)}\n`;
  message += `${escapeMarkdownCharacters(competition)}`;
  return message;
}
export function format1HourMessage(match, env, lang) {
  const en = lang === "en";
  const homeTeam = en ? match.homeTeam.name : translateTeam(match.homeTeam.name);
  const awayTeam = en ? match.awayTeam.name : translateTeam(match.awayTeam.name);
  const competition = en ? (COMP_EN[match.competition.code] || match.competition.code) : translateCompetition(match.competition.code);
  const dateStr = en ? getEnglishDate(match.utcDate, env) : getJalaliDate(match.utcDate, env);
  const timeStr = en ? getEnglishTime(match.utcDate, env) : getJalaliTime(match.utcDate, env);
  // v13.10-clean: date-first layout per the user's exact example. No header,
  // no countdown. The user asked: "Change the placement of یادآوری ۱ ساعته
  // with match day" + "do not need to add ⏱️ ... دیگر".
  let message = `\u{1F4C5} ${escapeMarkdownCharacters(dateStr)}\n`;
  message += `\u23F0 ${escapeMarkdownCharacters(timeStr)}\n`;
  message += `${escapeMarkdownCharacters(homeTeam)} \u{1F19A} ${escapeMarkdownCharacters(awayTeam)}\n`;
  message += `${escapeMarkdownCharacters(competition)}`;
  return message;
}
// v12.x-cron-gaps: 5-minute "kickoff now" reminder for BIG matches only.
// v13.10-clean: date-first layout (consistent with the other reminders).
export function format5MinMessage(match, env, lang) {
  const en = lang === "en";
  const homeTeam = en ? match.homeTeam.name : translateTeam(match.homeTeam.name);
  const awayTeam = en ? match.awayTeam.name : translateTeam(match.awayTeam.name);
  const competition = en ? (COMP_EN[match.competition.code] || match.competition.code) : translateCompetition(match.competition.code);
  const dateStr = en ? getEnglishDate(match.utcDate, env) : getJalaliDate(match.utcDate, env);
  const timeStr = en ? getEnglishTime(match.utcDate, env) : getJalaliTime(match.utcDate, env);
  let message = `\u{1F4C5} ${escapeMarkdownCharacters(dateStr)}\n`;
  message += `\u23F0 ${escapeMarkdownCharacters(timeStr)}\n`;
  message += `${escapeMarkdownCharacters(homeTeam)} \u{1F19A} ${escapeMarkdownCharacters(awayTeam)}\n`;
  message += `${escapeMarkdownCharacters(competition)}`;
  return message;
}
export function formatMatchStartMessage(match, env, lang) {
  const en = lang === "en";
  const homeTeam = en ? match.homeTeam.name : translateTeam(match.homeTeam.name);
  const awayTeam = en ? match.awayTeam.name : translateTeam(match.awayTeam.name);
  const competition = en ? (COMP_EN[match.competition.code] || match.competition.code) : translateCompetition(match.competition.code);
  const dateStr = en ? getEnglishDate(match.utcDate, env) : getJalaliDate(match.utcDate, env);
  const timeStr = en ? getEnglishTime(match.utcDate, env) : getJalaliTime(match.utcDate, env);
  // v13.10-clean: date-first, 🚀 on the match line. The animated ⚽ dice
  // (sendDice) is sent BEFORE this text by the notification engine for an
  // eye-catching "ball is rolling" kickoff animation.
  let message = `\u{1F4C5} ${escapeMarkdownCharacters(dateStr)}\n`;
  message += `\u23F0 ${escapeMarkdownCharacters(timeStr)}\n`;
  message += `\u{1F680} ${escapeMarkdownCharacters(homeTeam)} \u{1F19A} ${escapeMarkdownCharacters(awayTeam)}\n`;
  message += `${escapeMarkdownCharacters(competition)}`;
  // v13.13-venues: show the stadium (AI-translated) on kickoff.
  if (match.venue) {
    const venue = en ? match.venue : (translateVenue(match.venue) || match.venue);
    message += `\n\u0627\u0633\u062A\u0627\u062F\u06CC\u0645 ${escapeMarkdownCharacters(venue)}`;
  }
  return message;
}
export async function formatResultMessage(match, env, lang?) {
  const en = lang === "en";
  const homeTeam = en ? match.homeTeam.name : translateTeam(match.homeTeam.name);
  const awayTeam = en ? match.awayTeam.name : translateTeam(match.awayTeam.name);
  const competition = en ? (COMP_EN[match.competition.code] || match.competition.code) : translateCompetition(match.competition.code);
  const dateStr = en ? getEnglishDate(match.utcDate, env) : getJalaliDate(match.utcDate, env);
  const head = en ? "\u{1F6A9} *Full time*" : "\u{1F6A9} *\u0646\u062A\u06CC\u062C\u0647 \u0646\u0647\u0627\u06CC\u06CC*";
  const vs = en ? " vs " : " \u{1F19A} ";
  let message = `${head}\n\n`;
  message += `${escapeMarkdownCharacters(homeTeam)}${vs}${escapeMarkdownCharacters(awayTeam)}\n`;
  message += `${escapeMarkdownCharacters(competition)}\n`;
  // v13.13-venues: show the stadium name (AI-translated) if available.
  if (match.venue) {
    const venue = en ? match.venue : (translateVenue(match.venue) || match.venue);
    message += `\u{1F4CD} ${escapeMarkdownCharacters(venue)}\n`;
  }
  message += `\u{1F4C5} ${escapeMarkdownCharacters(dateStr)}\n\n`;
  if (match.score.fullTime.home !== null && match.score.fullTime.away !== null) {
    const h = en ? match.score.fullTime.home.toString() : toFaDigits(match.score.fullTime.home.toString());
    const a = en ? match.score.fullTime.away.toString() : toFaDigits(match.score.fullTime.away.toString());
    message += `\u0646\u062A\u06CC\u062C\u0647 ${h}\\-${a}`;
    if (match.score.fullTime.home > match.score.fullTime.away) {
      const won = en ? `\u2734\uFE0F ${escapeMarkdownCharacters(homeTeam)} won` : `\u2734\uFE0F ${escapeMarkdownCharacters(homeTeam)} \u0628\u0631\u0646\u062F\u0647 \u0634\u062F`;
      message += `\n${won}`;
    } else if (match.score.fullTime.home < match.score.fullTime.away) {
      const won = en ? `\u2734\uFE0F ${escapeMarkdownCharacters(awayTeam)} won` : `\u2734\uFE0F ${escapeMarkdownCharacters(awayTeam)} \u0628\u0631\u0646\u062F\u0647 \u0634\u062F`;
      message += `\n${won}`;
    } else {
      const draw = en ? "\u2734\uFE0F Draw" : "\u2734\uFE0F \u0645\u0633\u0627\u0648\u06CC";
      message += `\n${draw}`;
    }
  } else {
    const noScore = en ? "\u2754 Score not available" : "\u2754 \u0646\u062A\u06CC\u062C\u0647 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A";
    message += `${noScore}`;
  }
  return await appendTableOrPhase(env, match, message, lang);
}
export async function fetchStandings(env: Env, code, allowFetch = true, opts?) {
  const cacheKey = CONFIG.KV_STANDINGS_CACHE + code;
  const cached: any = await env.STATE.get(cacheKey, "json").catch(() => null);
  // v13.53-standsteady: the default freshness gate is 6h (was 10min).
  // Standings only change around finished matches, but the 10-min gate made
  // every payload rebuild re-hit football-data/sportscore for its rotation
  // pair — hundreds of standings calls/day (the user's report: "our system
  // sends too much update request while it's not needed"). Callers that NEED
  // post-FT freshness (result lines, weekly digest, coronation, the admin
  // endpoint) pass opts.freshMs = 6e5. The per-code jitter (STAND_CODE_ORDER
  // index × STANDINGS_FRESH_JITTER_MS) staggers the default expiries so a
  // single rebuild never fetches the whole set at once (FD: 10 req/min);
  // explicit freshMs overrides are honored EXACTLY (no jitter — a result
  // line for FL1 must not wait 68 extra minutes).
  const freshMs = opts && opts.freshMs != null ? opts.freshMs : CONFIG.STANDINGS_FRESH_MS + Math.max(0, STAND_CODE_ORDER.indexOf(code)) * CONFIG.STANDINGS_FRESH_JITTER_MS;
  if (cached && cached.ts && Date.now() - cached.ts < freshMs) return cached.data;
  if (!allowFetch) return cached && cached.data && Array.isArray(cached.data.teams) && cached.data.teams.length ? cached.data : null;
  let out = null;
  try {
    if (code === "EL" || code === "ECL") {
      const slug = SPORTSCORE_SLUGS[code];
      if (slug && !await providerSuspended(env, "sportscore")) {
        try {
          const data = await fetchJSON("https://sportscore.com/api/v1/standings/?sport=football&competition=" + slug);
          const table = data && data.tables && data.tables[0] && data.tables[0].rows || [];
          if (table.length) {
            out = { matchday: null, teams: table.map((r) => ({ name: r.team, pos: r.pos, points: r.pts, played: r.pld != null ? r.pld : r.played, won: r.w != null ? r.w : r.won, draw: r.d != null ? r.d : r.drawn, lost: r.l != null ? r.l : r.lost, gf: r.gf, ga: r.ga })) };
            await clearProviderSuspension(env, "sportscore");
          }
        } catch (e) {
        }
      }
    } else if (code === "PGL") {
      const ps = SPORTSCORE_SLUGS.PGL;
      if (ps && !await providerSuspended(env, "sportscore")) {
        try {
          const data = await fetchJSON("https://sportscore.com/api/v1/standings/?sport=football&competition=" + ps);
          const table = data && data.tables && data.tables[0] && data.tables[0].rows || [];
          if (table.length >= 8) {
            out = { matchday: null, started: table.some((r) => parseInt(r.pts) > 0), teams: table.map((r) => ({ name: r.team, pos: r.pos, points: r.pts, played: r.pld != null ? r.pld : r.played, won: r.w != null ? r.w : r.won, draw: r.d != null ? r.d : r.drawn, lost: r.l != null ? r.l : r.lost, gf: r.gf, ga: r.ga })) };
            await clearProviderSuspension(env, "sportscore");
          }
        } catch (e) {
        }
      }
      if (!out) out = await fetchPglTableFromWikipedia(env);
      if (!out) {
        for (const season of ["2026-2027", "2025-2026"]) {
          try {
            const data = await fetchJSON("https://www.thesportsdb.com/api/v1/json/3/lookuptable.php?l=4742&s=" + season);
            const rows = data && data.table || [];
            if (rows.length >= 8) {
              out = { matchday: 0, started: rows.some((r) => parseInt(r.intPlayed) > 0), teams: rows.map((r) => ({ name: r.strTeam, pos: parseInt(r.intRank) || 0, points: parseInt(r.intPoints) || 0, played: parseInt(r.intPlayed) || 0, won: parseInt(r.intWin) || 0, draw: parseInt(r.intDraw) || 0, lost: parseInt(r.intLoss) || 0, gf: parseInt(r.intGoalsFor) || 0, ga: parseInt(r.intGoalsAgainst) || 0 })) };
              break;
            }
          } catch (e) {
          }
        }
      }
    } else if (code === "AL") {
      const slug = SPORTSCORE_SLUGS.AL;
      if (slug && !await providerSuspended(env, "sportscore")) {
        try {
          const data = await fetchJSON("https://sportscore.com/api/v1/standings/?sport=football&competition=" + slug);
          const table = data && data.tables && data.tables[0] && data.tables[0].rows || [];
          if (table.length) {
            const sStart = CONFIG.SEASON_STARTS && CONFIG.SEASON_STARTS.AL;
            const notStarted = sStart && new Date() < new Date(sStart);
            out = notStarted ? { matchday: null, started: false, teams: table.map((r, i) => ({ name: r.team, pos: i + 1, points: 0 })) } : { matchday: null, started: table.some((r) => parseInt(r.pts) > 0), teams: table.map((r) => ({ name: r.team, pos: r.pos, points: r.pts, played: r.pld != null ? r.pld : r.played, won: r.w != null ? r.w : r.won, draw: r.d != null ? r.d : r.drawn, lost: r.l != null ? r.l : r.lost, gf: r.gf, ga: r.ga })) };
          }
        } catch (e) {
        }
      }
    } else {
      // v13.53-standsteady: respect the FD penalty box — a 429-exhausted sweep
      // suspended football-data for PROVIDER_SUSPEND_MS; standings calls into
      // the same exhausted quota just fail and burn rate-limit budget. Skip to
      // the cached copy below (the 24h KV TTL + the snapshot fallback on the
      // public side keep the table rendered).
      const fdSuspended = await providerSuspended(env, "football-data").catch(() => false);
      if (!fdSuspended) {
      const headers = { "X-Auth-Token": env.API_TOKEN };
      // v13.45-sightlines (F10): this raw fetch was invisible to the
      // subrequest counter — the notify-defer guard (>38) couldn't see
      // standings burn and could over-send past the real 50 ceiling.
      // Budget-out returns null (no standings this tick; the weekly digest
      // retries next tick, same as a failed fetch today).
      if (bumpSubrequest()) return out;
      const res = await fetch("https://api.football-data.org/v4/competitions/" + code + "/standings", { headers });
      // v13.55-epochflow: non-ok FD standings responses were SILENT — a
      // raw fetch with res.ok=false leaves out=null with no log, no retry
      // and no circuit trip, while the 6h gate re-attempted the same call
      // on every rebuild. That silence is what let the 2026-09-30 frozen-
      // epoch bug hide for 12.5h (standings_cache_* stuck at 05:43 while
      // every tail looked clean). Now: every non-ok is visible, and a 429
      // (quota minute exhausted) suspends the football-data circuit for
      // PROVIDER_SUSPEND_MS so subsequent codes + sweeps skip instead of
      // burning the same exhausted minute (mirror of fetchWithRetry F5).
      if (!res.ok) {
        console.warn("Standings " + code + ": FD HTTP " + res.status + (res.status === 429 ? " (rate-limited)" : ""));
        if (res.status === 429) {
          await suspendProvider(env, "football-data").catch(() => {});
          console.warn("⏸️ football-data suspended " + Math.round(CONFIG.PROVIDER_SUSPEND_MS / 6e4) + "min (standings 429)");
        }
      }
      if (res.ok) {
        const data = await res.json() as any;
        const season = data.season;
        const table = data.standings && data.standings[0] && data.standings[0].table || [];
        const seasonEnded = season && season.endDate && new Date(season.endDate) < new Date();
        const notStarted = seasonEnded || season && season.startDate && new Date(season.startDate) > new Date();
        if (notStarted) {
          // v13.45-sightlines (F10): the roster fetch bumps too; budget-out
          // skips it (zeroRows stays null — the standings fallback fills in).
          let zeroRows = null;
          if (!bumpSubrequest()) {
            const tRes = await fetch("https://api.football-data.org/v4/competitions/" + code + "/teams", { headers });
            if (tRes.ok) {
              const tData: any = await tRes.json();
              const roster = (tData.teams || []).slice().sort((a, b) => a.name.localeCompare(b.name));
              zeroRows = roster.map((t, i) => ({ name: t.name, pos: i + 1, points: 0 }));
            }
          }
          out = {
            matchday: 0,
            started: false,
            teams: zeroRows || table.map((r) => ({ name: r.team.name, pos: r.position, points: 0 }))
          };
        } else {
          out = {
            matchday: season ? season.currentMatchday : null,
            started: true,
            // v12.16: full detail per team (the UCL card now renders MP/W/D/L/
            // GF/GA/GD columns); football-data serves all of it.
            teams: table.map((r) => ({
              name: r.team.name,
              pos: r.position,
              points: r.points,
              played: r.playedGames != null ? r.playedGames : r.played,
              won: r.won,
              draw: r.draw,
              lost: r.lost,
              gf: r.goalsFor,
              ga: r.goalsAgainst,
              gd: r.goalDifference
            }))
          };
        }
      }
      if (!out && code === "BL1") {
        const slug = SPORTSCORE_SLUGS.BL1;
        if (slug) {
          const data = await fetchJSON("https://sportscore.com/api/v1/standings/?sport=football&competition=" + slug);
          const table = data && data.tables && data.tables[0] && data.tables[0].rows || [];
          out = { matchday: null, started: false, teams: table.map((r, i) => ({ name: r.team, pos: i + 1, points: 0 })) };
        }
      }
      }
    }
  } catch (e) {
    console.error("Standings fetch failed for " + code + ": " + e.message);
  }
  if (out && out.teams.length) {
    // v13.53-standsteady: TTL 8h → 24h (STANDINGS_CACHE_TTL) — the
    // serve-fresh-failure fallback below now survives a full day of upstream
    // 429s/suspension instead of expiring the table to the empty box.
    await env.STATE.put(cacheKey, JSON.stringify({ ts: Date.now(), data: out }), { expirationTtl: CONFIG.STANDINGS_CACHE_TTL }).catch(() => {
    });
    return out;
  }
  if (cached && cached.data && Array.isArray(cached.data.teams) && cached.data.teams.length) return cached.data;
  return null;
}
export async function standingsLine(env: Env, match, lang) {
  const en = lang === "en";
  const code = match.competition.code;
  // v13.53-standsteady: the result line keeps the 10-min freshness — it
  // renders rank/points right after an FT, so it must see the post-match
  // table (the 6h default would show pre-match points).
  const fresh = await fetchStandings(env, code, true, { freshMs: 6e5 });
  if (!fresh || !fresh.teams.length) return null;
  const snapKey = CONFIG.KV_STANDINGS_SNAP + code;
  const old = await env.STATE.get(snapKey, "json").catch(() => null);
  await env.STATE.put(snapKey, JSON.stringify(fresh)).catch(() => {
  });
  const lines = [];
  for (const team of [match.homeTeam, match.awayTeam]) {
    const row = fresh.teams.find((x) => normalizeTeamName(x.name) === normalizeTeamName(team.name));
    if (!row) continue;
    const prev = old && old.teams && old.teams.find((x) => normalizeTeamName(x.name) === normalizeTeamName(team.name));
    let delta = "";
    if (prev) {
      const d = prev.pos - row.pos;
      const dStr = en ? Math.abs(d).toString() : toFaDigits(Math.abs(d).toString());
      const upArrow = "\u2191";
      const downArrow = "\u2193";
      const emDash = "\u2014";
      delta = d > 0 ? " \\(" + upArrow + dStr + "\\)" : d < 0 ? " \\(" + downArrow + dStr + "\\)" : " \\(" + emDash + "\\)";
    }
    const teamName = en ? row.name : translateTeam(row.name);
    const posStr = en ? row.pos.toString() : toFaDigits(row.pos.toString());
    const ptsStr = en ? row.points.toString() : toFaDigits(row.points.toString());
    const playedStr = row.played != null ? (en ? row.played.toString() : toFaDigits(row.played.toString())) : "\u2014";
    const rankWord = en ? "#" : "\u0631\u062A\u0628\u0647 ";
    const ptsWord = en ? " pts" : " \u0627\u0645\u062A\u06CC\u0627\u0632";
    const playedWord = en ? " P" : " \u0628\u0627\u0632\u06CC";
    // v13.28: show games played alongside points (user's ask: "match played is as important")
    lines.push("\u2022 " + escapeMarkdownCharacters(teamName) + ": " + rankWord + posStr + " \u2014 " + playedStr + playedWord + " \u2014 " + ptsStr + ptsWord + delta);
  }
  if (!lines.length) return null;
  const compName = en ? (COMP_EN[code] || code) : translateCompetition(code);
  const tblWord = en ? "Table " : "\u062C\u062F\u0648\u0644 ";
  return "\n\n" + tblWord + escapeMarkdownCharacters(compName) + ":\n" + lines.join("\n");
}
export async function appendTableOrPhase(env: Env, match, message, lang) {
  const en = lang === "en";
  const faStage = faStageName(match.stage);
  const enStage = enStageName(match.stage);
  if (isDomesticCup(match.competition.code) || faStage || enStage) {
    const phaseWord = en ? "This was a knockout match" : "\u2694\uFE0F \u0627\u06CC\u0646 \u0645\u0633\u0627\u0628\u0642\u0647 \u062F\u0631 \u0645\u0631\u062D\u0644\u0647 \u062D\u0630\u0641\u06CC \u0628\u0648\u062F";
    const stageName = en ? enStage : faStage;
    return message + "\n\n" + phaseWord + (stageName ? ": " + stageName : "");
  }
  return message + (await standingsLine(env, match, lang) || "");
}
export function isoWeekKey(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - dayNum + 3);
  const isoYear = t.getUTCFullYear();
  const firstThu = new Date(Date.UTC(isoYear, 0, 4));
  const fDayNum = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - fDayNum + 3);
  const week = 1 + Math.round((t.getTime() - firstThu.getTime()) / 6048e5);
  return isoYear + "-W" + String(week).padStart(2, "0");
}
export function weeklyTableCodes() {
  const order = ["PL", "PD", "SA", "BL1", "FL1", "PGL", "AL", "CL"];
  const picked = new Set([].concat(CONFIG.LEAGUES || [], ["PGL"]));
  return order.filter((c) => picked.has(c));
}
export function buildLeagueTableMessage(code, st, opts, lang) {
  const en = lang === "en";
  const isCL = code === "CL";
  const teams = (st.teams || []).slice().sort((a, b) => (a.pos || 0) - (b.pos || 0) || (b.points || 0) - (a.points || 0));
  const shown = isCL ? teams.slice(0, 10) : teams;
  const sel = new Set((CONFIG.BIG_TEAMS_BY_LEAGUE[code] || []).map((t) => normAlias(t)));
  const compName = en ? (COMP_EN[code] || code) : translateCompetition(code);
  const lines = shown.map((t, i) => {
    const numStr = en ? String(i + 1) : toFaDigits(String(i + 1));
    const ptsStr = en ? String(t.points == null ? 0 : t.points) : toFaDigits(String(t.points == null ? 0 : t.points));
    const ptsWord = en ? " pts" : " \u0627\u0645\u062A\u06CC\u0627\u0632";
    const teamName = en ? t.name : translateTeam(t.name);
    const row = numStr + "\\. " + escapeMarkdownCharacters(teamName) + (sel.has(normAlias(t.name)) ? " \u2B50" : "") + " \u2014 " + ptsStr + ptsWord;
    return i === 0 ? "*" + row + "*" : row;
  });
  let head = (en ? "" : "\u062C\u062F\u0648\u0644 ") + escapeMarkdownCharacters(compName) + (en ? ":" : ":");
  if (st.matchday) head += en ? " \u2014 Matchday " + String(st.matchday) : " \u2014 \u0647\u0641\u062A\u0647 " + toFaDigits(String(st.matchday));
  if (opts && opts.label) head += " \u2014 " + opts.label;
  let msg = head + "\n\n" + lines.join("\n");
  if (isCL && teams.length > shown.length) {
    const moreStr = en ? "+ " + String(teams.length - shown.length) + " more" : "\n\u2026 " + toFaDigits(String(teams.length - shown.length)) + " \u062A\u06CC\u0645 \u0628\u0639\u062F\u06CC";
    msg += "\n" + moreStr;
  }
  const footer = en ? "\n\nFull table: football\\.sportsignal\\.ir" : "\n\n\u062C\u062F\u0648\u0644 \u06A9\u0627\u0645\u0644: football\\.sportsignal\\.ir";
  msg += footer;
  return msg;
}
export function specialBanner(match, lang) {
  const en = lang === "en";
  const parts = [];
  // v13.51-rivalries: named rivalries replace the generic "Derby" tag —
  // El Clásico, Der Klassiker, the Madonnina… never in the UCL (there the
  // match is just a UCL match). fa carries a name only for ال کلاسیکو; the
  // other names are English-only, so the fa banner drops for them (the
  // match is still a derby for sorting/boxing — just unnamed in fa).
  const label = rivalryName(match, en ? "en" : "fa");
  const named = rivalryName(match, "en");
  if (label) parts.push("\u2694\uFE0F *" + label + "*");
  else if (!named && isDerby(match)) parts.push(en ? "\u2694\uFE0F *Derby*" : "\u2694\uFE0F *\u062F\u0631\u0628\u06CC \u062D\u0633\u0627\u0633*");
  if (match.competition && match.competition.code === "CL" && isMasterPair(match)) parts.push(en ? "*Champions League blockbuster*" : "*\u062F\u0648\u0626\u0644 \u0628\u0632\u0631\u06AF \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627\u0654*");
  return parts.length ? parts.join("\n") + "\n\n" : "";
}
