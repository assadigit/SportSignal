// SportSignal — Telegram message composers (24h / big-match / 3h / 1h /
// 5min / kickoff / FT result + special banners) and the standings pipeline
// (fetch + KV cache + league-table text).


import { CONFIG, STAGE_FA, COMP_EN, SPORTSCORE_SLUGS } from "./config";
import type { Env } from "./types";
import { toFaDigits, escapeMarkdownCharacters, getJalaliDate, getJalaliTime, getRelativeTimeUntilMatch, getEnglishDate, getEnglishTime, getEnglishRelative, fetchJSON, enStageName } from "./utils";
import { normalizeTeamName } from "./teams.js";
import { translateTeam, translateCompetition, faStageName, isDomesticCup } from "./translate";
import { normAlias, isMasterPair, isDerby } from "./matches";
import { providerSuspended, clearProviderSuspension, fetchPglTableFromWikipedia } from "./providers";

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
  const timeUntil = en ? getEnglishRelative(match.utcDate) : getRelativeTimeUntilMatch(match.utcDate, env);
  let message = `*${escapeMarkdownCharacters(competition)}*`;
  if (match.competition.code === "CL" || isDomesticCup(match.competition.code) || match.stage !== "REGULAR_SEASON") {
    message += ` \\- ${escapeMarkdownCharacters(stage)}`;
  }
  message += `\n${escapeMarkdownCharacters(dateStr)}\n\n`;
  const vs = en ? " vs " : " \u{1F19A} ";
  message += `\u26BD *${escapeMarkdownCharacters(homeTeam)}${vs}${escapeMarkdownCharacters(awayTeam)}*\n`;
  message += `${escapeMarkdownCharacters(timeStr)}\n`;
  message += `${escapeMarkdownCharacters(timeUntil)}`;
  return message;
}
export function formatBigMatchMessage(match, env, lang) {
  const en = lang === "en";
  const homeTeam = en ? match.homeTeam.name : translateTeam(match.homeTeam.name);
  const awayTeam = en ? match.awayTeam.name : translateTeam(match.awayTeam.name);
  const competition = en ? (COMP_EN[match.competition.code] || match.competition.code) : translateCompetition(match.competition.code);
  const dateStr = en ? getEnglishDate(match.utcDate, env) : getJalaliDate(match.utcDate, env);
  const timeStr = en ? getEnglishTime(match.utcDate, env) : getJalaliTime(match.utcDate, env);
  const timeUntil = en ? getEnglishRelative(match.utcDate) : getRelativeTimeUntilMatch(match.utcDate, env);
  const stage = en
    ? (enStageName(match.stage) || (match.stage ? match.stage.replace(/_/g, " ") : ""))
    : (STAGE_FA[String(match.stage || "").toUpperCase()] || (match.stage ? match.stage.replace(/_/g, " ") : ""));
  const bigLabel = en ? "*Big match:* " : "*\u0628\u0627\u0632\u06CC \u0628\u0632\u0631\u06AF:* ";
  const vs = en ? " vs " : " \u{1F19A} ";
  let message = `${bigLabel}${escapeMarkdownCharacters(homeTeam)}${vs}${escapeMarkdownCharacters(awayTeam)}`;
  message += `\n*${escapeMarkdownCharacters(competition)}*`;
  if (match.competition.code === "CL" || isDomesticCup(match.competition.code) || match.stage !== "REGULAR_SEASON") {
    message += ` \\- ${escapeMarkdownCharacters(stage)}`;
  }
  message += `\n${escapeMarkdownCharacters(dateStr)}\n${escapeMarkdownCharacters(timeStr)}\n${escapeMarkdownCharacters(timeUntil)}`;
  return message;
}
export function format3HourMessage(match, env, lang) {
  const en = lang === "en";
  const homeTeam = en ? match.homeTeam.name : translateTeam(match.homeTeam.name);
  const awayTeam = en ? match.awayTeam.name : translateTeam(match.awayTeam.name);
  const competition = en ? (COMP_EN[match.competition.code] || match.competition.code) : translateCompetition(match.competition.code);
  const timeStr = en ? getEnglishTime(match.utcDate, env) : getJalaliTime(match.utcDate, env);
  const timeUntil = en ? getEnglishRelative(match.utcDate) : getRelativeTimeUntilMatch(match.utcDate, env);
  const head = en ? "*3 hours to kickoff*" : "*\u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u06F3 \u0633\u0627\u0639\u062A\u0647*";
  const vs = en ? " vs " : " \u{1F19A} ";
  let message = `${head}\n\n`;
  message += `\u26BD *${escapeMarkdownCharacters(homeTeam)}${vs}${escapeMarkdownCharacters(awayTeam)}*\n`;
  message += `${escapeMarkdownCharacters(competition)}\n`;
  message += `${escapeMarkdownCharacters(timeStr)}\n`;
  message += `${escapeMarkdownCharacters(timeUntil)}`;
  return message;
}
export function format1HourMessage(match, env, lang) {
  const en = lang === "en";
  const homeTeam = en ? match.homeTeam.name : translateTeam(match.homeTeam.name);
  const awayTeam = en ? match.awayTeam.name : translateTeam(match.awayTeam.name);
  const competition = en ? (COMP_EN[match.competition.code] || match.competition.code) : translateCompetition(match.competition.code);
  const timeStr = en ? getEnglishTime(match.utcDate, env) : getJalaliTime(match.utcDate, env);
  const timeUntil = en ? getEnglishRelative(match.utcDate) : getRelativeTimeUntilMatch(match.utcDate, env);
  const head = en ? "*1 hour to kickoff*" : "*\u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u06F1 \u0633\u0627\u0639\u062A\u0647*";
  const vs = en ? " vs " : " \u{1F19A} ";
  let message = `${head}\n\n`;
  message += `\u26BD *${escapeMarkdownCharacters(homeTeam)}${vs}${escapeMarkdownCharacters(awayTeam)}*\n`;
  message += `${escapeMarkdownCharacters(competition)}\n`;
  message += `${escapeMarkdownCharacters(timeStr)}\n`;
  message += `${escapeMarkdownCharacters(timeUntil)}`;
  return message;
}
// v12.x-cron-gaps: lean 5-minute reminder for BIG matches only. Lean
// text per the user's "reduce noise" ask: one ⚽ on the match line, no
// per-line emojis.
export function format5MinMessage(match, env, lang) {
  const en = lang === "en";
  const homeTeam = en ? match.homeTeam.name : translateTeam(match.homeTeam.name);
  const awayTeam = en ? match.awayTeam.name : translateTeam(match.awayTeam.name);
  const competition = en ? (COMP_EN[match.competition.code] || match.competition.code) : translateCompetition(match.competition.code);
  const timeStr = en ? getEnglishTime(match.utcDate, env) : getJalaliTime(match.utcDate, env);
  const head = en ? "*Kickoff in 5 min*" : "*\u06F5 \u062F\u0642\u06CC\u0642\u0647 \u062A\u0627 \u0634\u0631\u0648\u0639*";
  const vs = en ? " vs " : " \u{1F19A} ";
  let message = `${head}\n\n`;
  message += `\u26BD *${escapeMarkdownCharacters(homeTeam)}${vs}${escapeMarkdownCharacters(awayTeam)}*\n`;
  message += `${escapeMarkdownCharacters(competition)}\n`;
  message += `${escapeMarkdownCharacters(timeStr)}`;
  return message;
}
export function formatMatchStartMessage(match, env, lang) {
  const en = lang === "en";
  const homeTeam = en ? match.homeTeam.name : translateTeam(match.homeTeam.name);
  const awayTeam = en ? match.awayTeam.name : translateTeam(match.awayTeam.name);
  const competition = en ? (COMP_EN[match.competition.code] || match.competition.code) : translateCompetition(match.competition.code);
  const timeStr = en ? getEnglishTime(match.utcDate, env) : getJalaliTime(match.utcDate, env);
  const head = en ? "*Kickoff*" : "*\u0628\u0627\u0632\u06CC \u0634\u0631\u0648\u0639 \u0634\u062F\\!*";
  const vs = en ? " vs " : " \u{1F19A} ";
  let message = `${head}\n\n`;
  message += `\u26BD *${escapeMarkdownCharacters(homeTeam)}${vs}${escapeMarkdownCharacters(awayTeam)}*\n`;
  message += `${escapeMarkdownCharacters(competition)}\n`;
  message += `${escapeMarkdownCharacters(timeStr)}`;
  return message;
}
export async function formatResultMessage(match, env, lang?) {
  const en = lang === "en";
  const homeTeam = en ? match.homeTeam.name : translateTeam(match.homeTeam.name);
  const awayTeam = en ? match.awayTeam.name : translateTeam(match.awayTeam.name);
  const competition = en ? (COMP_EN[match.competition.code] || match.competition.code) : translateCompetition(match.competition.code);
  const dateStr = en ? getEnglishDate(match.utcDate, env) : getJalaliDate(match.utcDate, env);
  const head = en ? "*Full time*" : "*\u0646\u062A\u06CC\u062C\u0647 \u0646\u0647\u0627\u06CC\u06CC*";
  const vs = en ? " vs " : " \u{1F19A} ";
  let message = `${head}\n\n`;
  message += `\u26BD *${escapeMarkdownCharacters(homeTeam)}${vs}${escapeMarkdownCharacters(awayTeam)}*\n`;
  message += `${escapeMarkdownCharacters(competition)}\n`;
  message += `${escapeMarkdownCharacters(dateStr)}\n\n`;
  if (match.score.fullTime.home !== null && match.score.fullTime.away !== null) {
    const h = en ? match.score.fullTime.home.toString() : toFaDigits(match.score.fullTime.home.toString());
    const a = en ? match.score.fullTime.away.toString() : toFaDigits(match.score.fullTime.away.toString());
    message += `*${h}\\-${a}*`;
    if (match.score.fullTime.home > match.score.fullTime.away) {
      const won = en ? `${escapeMarkdownCharacters(homeTeam)} won` : `\u2705 ${escapeMarkdownCharacters(homeTeam)} \u0628\u0631\u0646\u062F\u0647 \u0634\u062F`;
      message += `\n${won}`;
    } else if (match.score.fullTime.home < match.score.fullTime.away) {
      const won = en ? `${escapeMarkdownCharacters(awayTeam)} won` : `\u2705 ${escapeMarkdownCharacters(awayTeam)} \u0628\u0631\u0646\u062F\u0647 \u0634\u062F`;
      message += `\n${won}`;
    } else {
      const draw = en ? "Draw" : "\u0645\u0633\u0627\u0648\u06CC";
      message += `\n${draw}`;
    }
  } else {
    const noScore = en ? "Score not available" : "\u0646\u062A\u06CC\u062C\u0647 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A";
    message += `${noScore}`;
  }
  return await appendTableOrPhase(env, match, message, lang);
}
export async function fetchStandings(env: Env, code, allowFetch = true) {
  const cacheKey = CONFIG.KV_STANDINGS_CACHE + code;
  const cached: any = await env.STATE.get(cacheKey, "json").catch(() => null);
  if (cached && cached.ts && Date.now() - cached.ts < 6e5) return cached.data;
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
      const headers = { "X-Auth-Token": env.API_TOKEN };
      const res = await fetch("https://api.football-data.org/v4/competitions/" + code + "/standings", { headers });
      if (res.ok) {
        const data = await res.json() as any;
        const season = data.season;
        const table = data.standings && data.standings[0] && data.standings[0].table || [];
        const seasonEnded = season && season.endDate && new Date(season.endDate) < new Date();
        const notStarted = seasonEnded || season && season.startDate && new Date(season.startDate) > new Date();
        if (notStarted) {
          const tRes = await fetch("https://api.football-data.org/v4/competitions/" + code + "/teams", { headers });
          let zeroRows = null;
          if (tRes.ok) {
            const tData: any = await tRes.json();
            const roster = (tData.teams || []).slice().sort((a, b) => a.name.localeCompare(b.name));
            zeroRows = roster.map((t, i) => ({ name: t.name, pos: i + 1, points: 0 }));
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
  } catch (e) {
    console.error("Standings fetch failed for " + code + ": " + e.message);
  }
  if (out && out.teams.length) {
    await env.STATE.put(cacheKey, JSON.stringify({ ts: Date.now(), data: out }), { expirationTtl: 28800 }).catch(() => {
    });
    return out;
  }
  if (cached && cached.data && Array.isArray(cached.data.teams) && cached.data.teams.length) return cached.data;
  return null;
}
export async function standingsLine(env: Env, match, lang) {
  const en = lang === "en";
  const code = match.competition.code;
  const fresh = await fetchStandings(env, code);
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
    const rankWord = en ? "#" : "\u0631\u062A\u0628\u0647 ";
    const ptsWord = en ? " pts" : " \u0627\u0645\u062A\u06CC\u0627\u0632";
    lines.push("\u2022 " + escapeMarkdownCharacters(teamName) + ": " + rankWord + posStr + " \u2014 " + ptsStr + ptsWord + delta);
  }
  if (!lines.length) return null;
  const compName = en ? (COMP_EN[code] || code) : translateCompetition(code);
  const tblWord = en ? "Table " : "\u{1F4CA} \u062C\u062F\u0648\u0644 ";
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
  let head = (en ? "\u{1F4CA} *" : "\u{1F4CA} *\u062C\u062F\u0648\u0644 ") + escapeMarkdownCharacters(compName) + "*";
  if (st.matchday) head += en ? " \u2014 Matchday " + String(st.matchday) : " \u2014 \u0647\u0641\u062A\u0647 " + toFaDigits(String(st.matchday));
  if (opts && opts.label) head += " \u2014 " + opts.label;
  let msg = head + "\n\n" + lines.join("\n");
  if (isCL && teams.length > shown.length) {
    const moreStr = en ? "+ " + String(teams.length - shown.length) + " more" : "\n\u2026 " + toFaDigits(String(teams.length - shown.length)) + " \u062A\u06CC\u0645 \u0628\u0639\u062F\u06CC";
    msg += "\n" + moreStr;
  }
  const footer = en ? "\n\nFull table: football\\.sportsignal\\.ir" : "\n\n\u{1F4CA} \u062C\u062F\u0648\u0644 \u06A9\u0627\u0645\u0644: football\\.sportsignal\\.ir";
  msg += footer;
  return msg;
}
export function specialBanner(match, lang) {
  const en = lang === "en";
  const parts = [];
  if (isDerby(match)) parts.push(en ? "\u2694\uFE0F *Derby*" : "\u2694\uFE0F *\u062F\u0631\u0628\u06CC\u0654 \u062D\u0633\u0627\u0633\u0654*");
  if (match.competition && match.competition.code === "CL" && isMasterPair(match)) parts.push(en ? "*Champions League blockbuster*" : "*\u062F\u0648\u0626\u0644 \u0628\u0632\u0631\u06AF \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627\u0654*");
  return parts.length ? parts.join("\n") + "\n\n" : "";
}
