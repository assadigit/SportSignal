// SportSignal — the public /api/public-matches pipeline: KV cache with
// refresh lock + per-IP rate limit, live enrichment (minute/scorers/venue),
// standings/cups/UCL/topSpot/week shaping and the 7-day snapshot fallback.


import { CONFIG } from "./config";
import { LEAGUE_LOGOS, COMP_EN } from "./tables";
import type { Env } from "./types";
import { fetchJSON, getNowTehran } from "./utils";
import { normalizeTeamName, normTeamKey } from "./teams";
import { homeGround, curatedVenueFa } from "./grounds";
import { translateTeam, translateCompetition, translateVenue, ensureFaAiCache, ensureFaVenueCache } from "./translate";
import { normAlias } from "./teams";
import { isLiveStatus } from "./match-model";
import { computeFixtureSignal, decideActivity, reconcileStaleLive } from "./scheduler";
import { matchPath } from "./slugs"; // v13.80-canonical-hrefs: payload rows carry the server-canonical URL
import { shouldReport, isFeaturedMatch, isDomesticLeagueCode, isMasterPair, hasSelectedTeam, isMasterClash, isDerby, rivalryName, pickHeroMatch, priorityTier } from "./match-classify";
import { fetchLongView } from "./providers";
import { getCachedMatches } from "./match-pool";
import { applySettings } from "./admin";
import { fetchStandings } from "./composers";
import { masterTeamList, masterMemo } from "./users";

// v13.35-rounds (backlog §F "FA Cup tier/round filtering" + "EL/ECL
// qualifying relabel"): cup fixtures now carry their ROUND to the client —
// `round` is the raw provider label ("Round of 16", "Final", "Round 1"…),
// `roundFa` its Persian twin (یک‌هشتم نهایی، فینال، دور ۱…). League matches
// (REGULAR_SEASON / no round info) carry null so the UI renders no chip.
// The map covers FD stage enums AND the free-text labels sportscore uses —
// unknown labels pass through untranslated (better a Latin chip than none).
export const ROUND_FA: Record<string, string> = {
  // v13.108-fasync: the new UCL format's league stage — same Persian value as
  // the bot's STAGE_FA (tables.ts): one label, both surfaces (the website's
  // roundFa chip was null for every LEAGUE_STAGE match and the bot card
  // showed the English "LEAGUE STAGE" label before this). Keep comments in
  // grabbed var blocks free of semicolons (grabVar slices at the first one)
  "LEAGUE_STAGE": "مرحله لیگ",
  "LEAGUE_PHASE": "مرحله لیگ",
  "FINAL": "فینال",
  "SEMI_FINALS": "نیمه‌نهایی",
  "SEMI_FINAL": "نیمه‌نهایی",
  "QUARTER_FINALS": "یک‌چهارم نهایی",
  "QUARTER_FINAL": "یک‌چهارم نهایی",
  "ROUND_OF_16": "یک‌هشتم نهایی",
  "ROUND_OF_32": "یک‌شانزدهم نهایی",
  "PLAYOFF_ROUND": "پلی‌آف",
  "GROUP_STAGE": "مرحله گروهی",
  "THIRD_PLACE": "رده‌بندی",
  "FINAL_THIRD": "رده‌بندی",
  "1ST_ROUND": "دور اول",
  "2ND_ROUND": "دور دوم",
  "3RD_ROUND": "دور سوم",
  "4TH_ROUND": "دور چهارم",
  "5TH_ROUND": "دور پنجم",
  "6TH_ROUND": "دور ششم"
};
export const FA_ORDINALS = ["", "اول", "دوم", "سوم", "چهارم", "پنجم", "ششم", "هفتم", "هشتم", "نهم", "دهم"];
export function roundLabel(m) {
  const raw = m.roundRaw != null && String(m.roundRaw).trim() ? String(m.roundRaw).trim() : null;
  const stage = m.stage && m.stage !== "REGULAR_SEASON" ? String(m.stage) : null;
  const src = raw || stage;
  if (!src) return { round: null, roundFa: null };
  const s = src.toLowerCase();
  // FD stage enums translate directly.
  if (ROUND_FA[src.toUpperCase()]) return { round: src, roundFa: ROUND_FA[src.toUpperCase()] };
  // sportscore free-text: "Round of 16", "Quarter-finals", "Semi Final",
  // "Final", "3rd place", "Round 3", "First Round"…
  // ORDER MATTERS: the explicit ROUND patterns ("round of N", "round N",
  // "Nth round", "<word> round") must run BEFORE the loose quarter/semi/
  // third scans — mapStageName-style collapse would turn a cup's "3rd
  // Round" into the رده‌بندی (third-place) playoff, and "Round of 16"
  // contains no trap but "Semi-final 2" style labels do. After the round
  // patterns, a remaining "third"/"3rd" can only mean the place playoff.
  const num = s.match(/round\s*of\s*(\d+)/);
  if (num) {
    const n = parseInt(num[1]);
    const map: Record<number, string> = { 64: "یک‌شصت‌وچهارم نهایی", 32: "یک‌شانزدهم نهایی", 16: "یک‌هشتم نهایی" };
    if (map[n]) return { round: src, roundFa: map[n] };
  }
  const rd = s.match(/round\s*(\d+)/);
  if (rd) {
    const n = parseInt(rd[1]);
    if (n >= 1 && n <= 10) return { round: src, roundFa: "دور " + FA_ORDINALS[n] };
  }
  const ord2 = s.match(/^(\d+)\s*(?:st|nd|rd|th)\s*round/);
  if (ord2) {
    const n = parseInt(ord2[1]);
    if (n >= 1 && n <= 10) return { round: src, roundFa: "دور " + FA_ORDINALS[n] };
  }
  const ord = s.match(/(first|second|third|fourth|fifth|sixth)\s+round/);
  if (ord) {
    const idx = ["first", "second", "third", "fourth", "fifth", "sixth"].indexOf(ord[1]) + 1;
    return { round: src, roundFa: "دور " + FA_ORDINALS[idx] };
  }
  if (s.indexOf("quarter") !== -1) return { round: src, roundFa: "یک‌چهارم نهایی" };
  if (s.indexOf("semi") !== -1) return { round: src, roundFa: "نیمه‌نهایی" };
  if (s.indexOf("third") !== -1 || s.indexOf("3rd") !== -1) return { round: src, roundFa: "رده‌بندی" };
  if (s === "final" || (s.indexOf("final") !== -1 && s.indexOf("qualif") === -1)) return { round: src, roundFa: "فینال" };
  if (s.indexOf("qualif") !== -1 || s.indexOf("prelim") !== -1) return { round: src, roundFa: "مقدماتی" };
  return { round: src, roundFa: null };
}
export function pubMatch(m) {
  const rl = roundLabel(m);
  // v13.118-fixsched: the STALE-LIVE GUARD (the 4 AM screenshot bug —
  // matches rendered as "playing" 6-7h after they finished). A live
  // status whose kickoff is older than CONFIG.SCHED_MAX_LIVE_SPAN_MS
  // (195min — kickoff+90+HT+stoppage+ET/pens margin, the same estimate
  // ACTIVE_WINDOW_BEHIND_MS pins) is not plausible: serve FINISHED with
  // the last-known score (the "preserve the last known score and match
  // state" rule). Self-contained on purpose (literal span, isLiveStatus
  // only) so the narrow harness evals keep working; check-scheduler pins
  // the literal against CONFIG.
  const koMs = m.utcDate ? Date.parse(String(m.utcDate)) : NaN;
  const staleLive = isLiveStatus(m.status) && !isNaN(koMs) && Date.now() - koMs > 195 * 6e4;
  const statusOut = staleLive ? "FINISHED" : m.status;
  // v13.85-stadiumchip: provider venue first (TSP/live-detail), then the
  // home-ground table — the SAME table + one-off-neutral gate the match
  // pages hydrate with (one source of truth: grounds.ts). Fills only; a
  // provider venue always wins. venueFa prefers the CURATED table name
  // (v13.86-groundsfix: one Persian name per ground — live rows and
  // scheduled rows agree), then the AI-learned dictionary, then the string.
  const ground = !m.venue ? homeGround(m.homeTeam && m.homeTeam.name, m.stage, m.round) : null;
  const venue = m.venue || (ground ? ground.en : null);
  const venueFa = m.venue ? (curatedVenueFa(m.venue) || translateVenue(m.venue) || m.venue) : (ground ? ground.fa : null);
  return {
    id: m.id || null,
    homeTeam: { name: m.homeTeam.name, faName: translateTeam(m.homeTeam.name), crest: m.homeTeam.crest || null },
    awayTeam: { name: m.awayTeam.name, faName: translateTeam(m.awayTeam.name), crest: m.awayTeam.crest || null },
    utcDate: m.utcDate,
    // v13.80-canonical-hrefs: the ONE true URL for this match, built by the
    // same matchPath/TEAM_SLUGS the server pages, sitemap, JSON-LD and
    // matches.json use. The client's matchHref() prefers this field; its
    // private slugifier stays only as a fallback for cached stale payloads
    // (pre-13.80 SWR rows without `path`) — never the primary.
    path: matchPath(m.homeTeam.name, m.awayTeam.name, m.utcDate),
    competition: { code: m.competition.code, faName: translateCompetition(m.competition.code), emblem: m.competition.emblem || LEAGUE_LOGOS[m.competition.code] || null },
    status: statusOut,
    round: rl.round,
    roundFa: rl.roundFa,
    minute: !staleLive && isLiveStatus(m.status) && m.minute != null ? m.minute : null,
    scorers: !staleLive && isLiveStatus(m.status) ? (m.scorers || []).map((s) => ({ minute: s.minute, type: s.type, scorer: s.scorer, team: s.team })) : [],
    big: isFeaturedMatch(m),
    derby: isDerby(m),
    // v13.51-rivalries: named-rivalry tags (El Clásico, Der Klassiker, …).
    // rivalry = the English name (null when none — including UCL meetings,
    // which are just UCL matches on the site); rivalryFa = the Persian name
    // — v13.101-trueduels: every marquee pairing carries one now (ال
    // کلاسیکو، دربی میلان، کلاسیکر آلمان…), so fa consumers promote the
    // native code name instead of dropping the tag. The row keeps its derby
    // styling either way.
    rivalry: rivalryName(m, "en") || null,
    rivalryFa: rivalryName(m, "fa") || null,
    venue,
    venueFa,
    score: (isLiveStatus(m.status) || m.status === "FINISHED") && m.score && m.score.fullTime ? m.score.fullTime : null
  };
}
export async function enrichLiveMatches(env: Env, matches) {
  const live = matches.filter((m) => isLiveStatus(m.status) && /^\d+$/.test(String(m.id)));
  for (const m of live.slice(0, 4)) {
    try {
      const key = CONFIG.KV_LIVE_DETAIL + m.id;
      const cached = await env.STATE.get(key, "json").catch(() => null);
      if (cached) {
        applyLiveDetail(m, cached);
        continue;
      }
      const d = await fetchJSON("https://api.football-data.org/v4/matches/" + m.id, 2, { "X-Auth-Token": env.API_TOKEN });
      const det = d && d.match ? d.match : d;
      if (!det) continue;
      const detail: any = {
        minute: det.minute != null ? det.minute : null,
        // v13.82-matchday: the detail fetch is ALREADY paid for — adopt the
        // venue when the endpoint carries one (pubMatch maps it; the live
        // rows on home/lists then show the stadium chip for free).
        venue: typeof det.venue === "string" && det.venue.trim() ? det.venue.trim() : null,
        scorers: (det.scorers || []).map((s) => ({
          minute: s.minute != null ? s.minute : null,
          type: s.type || "GOAL",
          scorer: s.scorer && s.scorer.name ? s.scorer.name : null,
          team: s.team && s.team.name ? s.team.name : null
        }))
      };
      if (det.score && det.score.fullTime) {
        detail.scoreFullTime = { home: det.score.fullTime.home, away: det.score.fullTime.away };
      }
      await env.STATE.put(key, JSON.stringify(detail), { expirationTtl: 90 }).catch(() => {
      });
      applyLiveDetail(m, detail);
    } catch (e) {
      console.error("Live detail fail for " + m.id + ": " + e.message);
    }
    await new Promise((r) => setTimeout(r, 1400));
  }
  return matches;
}
export function applyLiveDetail(m, detail) {
  if (detail.minute != null) m.minute = detail.minute;
  if (detail.scorers) m.scorers = detail.scorers;
  // v13.82-matchday: venue adoption (only fills — never overwrites an
  // existing provider venue).
  if (detail.venue != null && !m.venue) m.venue = detail.venue;
  if (detail.scoreFullTime) m.score = { fullTime: detail.scoreFullTime };
}
// v13.52-swrsolid: the serve-time LIVE OVERLAY. The cron tick persists a
// tiny {id,h,a,d,st,min,s} row per live-or-just-finished match (written the
// moment the tick SEES a change — goal/kickoff/HT/FT — plus a 10-min top-up
// while anything is live). This function patches those rows into ANY payload
// being served (fresh KV cache, stale SWR serve, or the 7-day snapshot), so:
//   - a SCHEDULED row the tick now sees IN_PLAY goes live instantly (score
//     + minute patched in);
//   - a LIVE row that has FINISHED is purged from `upcoming` and prepended
//     to `finished` with its final score — the exact rule the user stated:
//     fixtures cache, live games never go stale on the page.
// Lookup is by match id first, then by normalized team-pair + day (providers
// occasionally carry different ids for the same fixture between rebuilds).
export function applyLiveOverlay(data, ov) {
  if (!data) return data;
  // v13.118-fixsched: the STALE-LIVE SANITIZE pass (the 4 AM screenshot
  // bug). Every serve path (fresh KV cache, stale SWR serve, 7-day
  // snapshot) walks its rows: a live status whose kickoff is older than
  // CONFIG.SCHED_MAX_LIVE_SPAN_MS (195min — the same estimate
  // ACTIVE_WINDOW_BEHIND_MS pins; literal here so narrow harness evals of
  // this function stay self-contained, check-scheduler pins the pairing)
  // is downgraded to FINISHED with the last-known score, then flows
  // through the existing justFinished purge (out of upcoming, head of
  // finished). A match that genuinely runs long (ET/pens ≤ ~150min) never
  // trips this; a provider row stuck IN_PLAY for hours can never render
  // as "playing" again. Self-contained: isLiveSt + Date only.
  const nowMs = Date.now();
  const staleSpanMs = 195 * 6e4;
  const isLiveSt = (s) => s === "LIVE" || s === "IN_PLAY" || s === "PAUSED";
  const rowKickMs = (m) => (m && m.utcDate ? Date.parse(String(m.utcDate)) : NaN);
  const staleLiveRow = (m) => isLiveSt(String((m && m.status) || "").toUpperCase()) && !isNaN(rowKickMs(m)) && nowMs - rowKickMs(m) > staleSpanMs;
  // Overlay rows get the same healing: a blob written before this fix (or
  // in a window the tick never corrected) may carry a stale IN_PLAY — it
  // is converted to a FINISHED row so the patch PURGES the stale-live
  // payload row instead of re-marking it live (the overlay used to win
  // over fresher pool data and re-animate finished matches all night).
  const rows = [];
  if (ov && Array.isArray(ov.rows)) {
    for (const r of ov.rows) {
      if (!r || !r.st) continue;
      const rk = r.d ? Date.parse(String(r.d)) : NaN;
      if (isLiveSt(String(r.st).toUpperCase()) && !isNaN(rk) && nowMs - rk > staleSpanMs) {
        rows.push({ id: r.id != null ? String(r.id) : null, h: r.h, a: r.a, d: r.d, st: "FINISHED", min: null, s: r.s || null });
      } else {
        rows.push(r);
      }
    }
  }
  const byId = new Map();
  const byPair = new Map();
  for (const r of rows) {
    if (!r || !r.st) continue;
    if (r.id != null) byId.set(String(r.id), r);
    if (r.h && r.a && r.d) byPair.set(r.h + "|" + r.a + "|" + String(r.d).slice(0, 10), r);
  }
  const find = (m) => {
    const r = m.id != null ? byId.get(String(m.id)) : null;
    if (r) return r;
    const h = m.homeTeam && m.homeTeam.name, a = m.awayTeam && m.awayTeam.name;
    if (!h || !a) return null;
    return byPair.get(normalizeTeamName(h) + "|" + normalizeTeamName(a) + "|" + String(m.utcDate || "").slice(0, 10)) || null;
  };
  // v14.0.6-livescore: overlay rows r.s are FLAT {home,away}, and the PUBLIC
  // payload's score contract is FLAT too (pubMatch flattens m.score.fullTime
  // → {home,away}; the client's scoreNode/keyOf and the server's scoreHtml /
  // seo pages.ts all read score.home directly). The old unconditional
  // {fullTime:{...}} write here was the INTERNAL raw-football-data shape —
  // public rows patched with it carried score.home === undefined, which the
  // client printed as "undefined - undefined" on live cards (and keyOf's
  // change detection went blind to goals), while the no-JS HTML rendered an
  // empty .kick. Only the RAW POOL rows keep the nested shape — seo/data.ts
  // re-shapes them through pubMatch, which reads m.score.fullTime.
  const patch = (m, internal?) => {
    if (!m) return;
    const r = find(m);
    if (r) {
      m.status = r.st;
      m.minute = isLiveSt(r.st) && r.min != null ? r.min : null;
      if (r.s && r.s.home != null && r.s.away != null) m.score = internal ? { fullTime: { home: r.s.home, away: r.s.away } } : { home: r.s.home, away: r.s.away };
    }
    // v13.118-fixsched: post-patch stale-live downgrade — the payload row
    // itself may carry a stuck live status (pool/snapshot built before the
    // guard, or an overlay row that just healed it to FINISHED above). A
    // row that is STILL live after patching and whose kickoff is beyond
    // the span can never be plausible: finish it (last-known score kept).
    if (staleLiveRow(m)) {
      m.status = "FINISHED";
      if (m.minute != null) m.minute = null;
    }
  };
  if (Array.isArray(data.upcoming)) {
    const justFinished = [];
    data.upcoming.forEach((m) => {
      patch(m);
      if (m.status === "FINISHED") justFinished.push(m);
    });
    if (justFinished.length) {
      data.upcoming = data.upcoming.filter((m) => m.status !== "FINISHED");
      data.finished = justFinished.concat(Array.isArray(data.finished) ? data.finished : []).slice(0, 20);
    }
  }
  if (data.nextBig) patch(data.nextBig);
  if (data.topSpot) {
    if (data.topSpot.next) patch(data.topSpot.next);
    if (Array.isArray(data.topSpot.matches)) data.topSpot.matches.forEach((m) => patch(m));
  }
  // (arrow wrappers: bare forEach(patch) would pass the array INDEX as the
  // second arg — a truthy index on the nested flag would re-break the shape.)
  if (Array.isArray(data.thisWeek)) data.thisWeek.forEach((m) => patch(m));
  if (Array.isArray(data.nextWeek)) data.nextWeek.forEach((m) => patch(m));
  if (Array.isArray(data.cups)) for (const c of data.cups) if (c && c.next) patch(c.next);
  // SEO layer (Phase 1): the raw pool rides in `pool` when the SEO pages
  // read it — the same live-status/score truth must patch those rows too
  // (same find/patch, no behavior change for the existing containers).
  // Pool rows are INTERNAL-shape → patch(m, true) keeps {fullTime:{home,away}}.
  if (Array.isArray(data.pool)) data.pool.forEach((m) => patch(m, true));
  return data;
}
export function projectedUclStart() {
  const now = new Date();
  const y = now.getUTCMonth() >= 9 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  return new Date(Date.UTC(y, 8, 15, 19, 0, 0));
}
// v13.35-prewarm: the 4.6s cold-sweep killer. When the first visitor after a
// quiet gap opens the site, KV_PUBLIC_MATCHES is expired and THAT visitor
// pays the full provider sweep (~4.6s). The cron tick now pre-warms the
// payload at the end of every sweep: opts.prewarm marks cron-context
// (no lock/rate-limit writes — last-write-wins is harmless), opts.pool
// reuses the pool cron ALREADY fetched (zero extra provider subrequests —
// the sweep was the expensive part), and the payload is stamped `prewarm`
// so it stays FRESH for ~9.25 min (a full tick gap) instead of the normal
// 3-min SWR window — but only when NOTHING in it is live (live score data
// still deserves the short window). KV write math (worst case, zero
// visitors, all quiet): +1 payload write per tick (TTL 720s) = ≤144/day;
// snapshot writes remain change-only; grand total ≪ the 1,000/day quota.
// The canary match is stripped here — it lives ONLY in cron's in-memory
// pool and must never leak into the public payload (the comments claimed
// a public-side filter existed; it never did — belt-and-braces now).
export interface PubOpts { prewarm?: boolean; pool?: any[]; skipLongView?: boolean }
export async function fetchPublicMatches(env: Env, req, opts?: PubOpts) {
  const prewarm = !!(opts && opts.prewarm);
  const prePool = opts && Array.isArray(opts.pool) ? opts.pool.filter((m) => !m.canary) : null;
  const cached = await env.STATE.get(CONFIG.KV_PUBLIC_MATCHES, "json").catch(() => null);
  const cachedHasLive = !!(cached && cached.data && Array.isArray(cached.data.upcoming) && cached.data.upcoming.some((m) => isLiveStatus(m.status)));
  // Prewarm-written payloads stretch to ~9.25min fresh (cron ticks every
  // 10min — the payload NEVER goes cold between ticks). Everything else
  // keeps the 3-min SWR window. Live payloads always keep 3 min.
  const freshMs = cached && cached.data && cached.data.prewarm && !cachedHasLive ? 555e3 : 18e4;
  if (cached && cached.ts && Date.now() - cached.ts < freshMs) return cached.data;
  // v13.44-quotaguard: web-side KV-write budget guard. The cron-side meter
  // folds the day's TRUE burn into cron_status_v1; past the HARD threshold,
  // visitor-driven rebuilds (refresh-lock + rate-limit + payload + live-
  // detail writes, ~3-7 per refresh) are held and the cached payload is
  // served instead — bounds adversarial write amplification (a rotating-IP
  // scraper could otherwise mint a few writes every lock-expiry ~ thousands
  // per day). The cron prewarm path is exempt (governed by the cron-side
  // governor); a cold cache (no cached data at all) still rebuilds — the
  // public page must never brick.
  if (!prewarm) {
    try {
      // v13.111-quotaslim: the guard now sums BOTH meters — the cron
      // accumulator + the web counter (kv-webmeter.ts). A CI/dev burst
      // burning the quota through web invocations used to be invisible
      // here (cron-only check), so visitor rebuilds kept minting writes
      // past the HARD line.
      const st = await env.STATE.get("cron_status_v1", "json").catch(() => null);
      const day = new Date().toISOString().slice(0, 10);
      const cronN = st && st.kv_day === day ? (parseInt(st.kv_writes_day) || 0) : 0;
      let webN = 0;
      const w = await env.STATE.get("kv_writes_web_v1", "json").catch(() => null);
      if (w && w.d === day) webN = parseInt(w.n) || 0;
      if (cronN + webN >= CONFIG.KV_WRITES_HARD) {
        if (cached && cached.data) {
          console.warn("\u{1F4B0} KV write budget hold \u2014 serving the cached public payload (visitor refresh deferred)");
          return cached.data;
        }
      }
    } catch (e) { }
  }
  await applySettings(env);
  await ensureFaAiCache(env).catch(() => {
  });
  await ensureFaVenueCache(env).catch(() => {
  });
  const lockVal = parseInt(await env.STATE.get("pub_refresh_lock").catch(() => null)) || 0;
  const lockFresh = !!(lockVal && Date.now() - lockVal < 45e3);
  if (lockFresh && cached && cached.data) return cached.data;
  if (prewarm && lockFresh) return cached && cached.data ? cached.data : null; // a visitor refresh is already running — let it finish
  const ip = req && req.headers && req.headers.get("CF-Connecting-IP") || "";
  const rlKey = ip ? "pub_rl_" + ip.replace(/[^0-9a-fA-F:.]/g, "") : null;
  if (rlKey) {
    const rl = await env.STATE.get(rlKey).catch(() => null);
    if (rl && cached && cached.data) return cached.data;
  }
  let matches = null;
  let liveSweepFailed = false;
  try {
    if (!lockFresh && !prewarm) {
      await env.STATE.put("pub_refresh_lock", String(Date.now()), { expirationTtl: 45 }).catch(() => {
      });
    }
    if (rlKey) {
      await env.STATE.put(rlKey, String(Date.now()), { expirationTtl: 60 }).catch(() => {
      });
    }
    // v13.35-prewarm: cron hands over the pool it already fetched this tick —
    // the provider sweep (the expensive part) is skipped entirely.
    if (prePool) {
      matches = prePool;
    } else {
      // v13.52-swrsolid: visitor-driven rebuilds go POOL-FIRST. The pool is
      // refreshed by the cron full sweep every 2h (fixtures are slow-moving —
      // a ≤2h-old list is exactly what the page wants) and the serve path
      // patches live rows from the overlay. The 92-DAY long view (10 FD
      // chunks with 2s sleeps + ~70 sportscore calls + TSP fan-out — tens of
      // seconds to MINUTES with FD 429 retries) was the "site takes a few
      // minutes to load" bug: it ran synchronously on the visitor's request
      // whenever the payload cache expired, which with sparse traffic was
      // nearly EVERY visit. It now runs only when the pool itself is gone
      // (cron dead >24h) — the recovery path, in the background.
      matches = await getCachedMatches(env);
      // v13.55-epochflow: the 92-day long view is CRON-ONLY. A background
      // rebuild (this path) runs inside ctx.waitUntil, which dies at ~30s —
      // the long view needs 10 FD chunks × 2s sleeps and can NEVER complete
      // there; it just burned ~25 subrequests in a dying invocation while
      // pushing the final payload/snapshot writes past CF's real ~50 ceiling
      // (they failed silently under .catch(() => {})). Pool recovery is the
      // tick's job (v13.54.1); the sync TRUE-COLD call from public-swr keeps
      // the long view (first-deploy / KV-wipe case — a fresh visitor must
      // still see data).
      if (!matches.length && !(opts && opts.skipLongView)) matches = await fetchLongView(env);
    }
    // v13.53-standsteady: FD live-detail enrichment (scorers) runs on PREWARM
    // (cron) builds ONLY. The serve-time live overlay patches status/score/
    // minute into EVERY payload served — live truth never depends on this
    // call — and a goal fires liveChanged → the tick's prewarm re-enriches
    // scorers within ~10min. Visitor rebuilds skip it entirely: up to 4 FD
    // calls + 5.6s of sleeps saved on EVERY refresh during live windows
    // (both the API burn and the rebuild latency the user reported).
    if (prewarm) await enrichLiveMatches(env, matches);
  } catch (e) {
    console.error("Public provider sweep failed (serving stale): " + e.message);
    liveSweepFailed = true;
    if (cached && cached.data) return cached.data;
    matches = await getCachedMatches(env);
  }
  const now = Date.now();
  // v13.118-fixsched: the pool-level stale-live reconcile — the same
  // doctrine as pubMatch/applyLiveOverlay but applied to the RAW rows
  // BEFORE every consumer shapes them (upcoming/finished filters, hero
  // pick, topSpot, cups, UCL card, week lists all see converged statuses;
  // a stuck IN_PLAY row can no longer ride the upcoming list with a frozen
  // 67th minute). Span only (the 195min plausibility estimate); the pool
  // WRITE (cacheMatches) additionally waits out the confirmation grace
  // before persisting the downgrade.
  try {
    const staleFixed = reconcileStaleLive(matches, now);
    if (staleFixed) console.log("\u{1F9F9} Stale-live reconcile: " + staleFixed + " implausible live row(s) served as FINISHED (last-known score kept)");
  } catch (e) { }
  const standCodes = ["PL", "PD", "SA", "BL1", "FL1"];
  const compact = (st) => st && st.teams.length ? {
    started: st.started !== false,
    // v12.16: full per-team stats ride along (played/won/draw/lost/gf/ga/gd —
    // fd and the PGL Wikipedia fallback serve them; sources without stats
    // simply carry undefined and the UI renders "—").
    teams: st.teams.slice(0, 8).map((t) => ({ pos: t.pos, name: t.name, faName: translateTeam(t.name), points: t.points, played: t.played, won: t.won, draw: t.draw, lost: t.lost, gf: t.gf, ga: t.ga, gd: t.gd != null ? t.gd : t.gf != null && t.ga != null ? t.gf - t.ga : null }))
  } : null;
  const stMap: Record<string, any> = {};
  // v13.55-epochflow: standings are now read CACHE-ONLY on every serve-path
  // rebuild (allowFetch=false, unconditionally). The 2026-09-30 frozen-epoch
  // bug: once the 6h freshness gates expired, EVERY rebuild (visitor +
  // prewarm) re-attempted the provider chain — FD standings silently 429ing
  // (raw fetch, non-ok = no log, no retry) + PGL's 3-provider fallback with
  // 800/1600ms retry sleeps — ~20-30 real subrequests of guaranteed-failing
  // fetches per rebuild, pushing the payload + snapshot puts past CF's real
  // ~50-subrequest ceiling where they died SILENTLY (.catch(() => {})). The
  // data epoch then froze at the last successful write ("Last updated
  // Wednesday 09:11 · cached 748m ago" for 12.5h while the pool stamp kept
  // advancing). Standings refresh authority now lives in the CRON tick's
  // stand_refresh phase (cron.ts) where the 6h gates + the suspension circuit
  // + the sequential fetches live under the meter; this path serves the KV
  // cache (24h TTL) + the per-code snapshot fallback (v13.53) only.
  for (const c of standCodes.concat(["CL", "PGL"])) {
    try {
      stMap[c] = await fetchStandings(env, c, false) || null;
    } catch (e) {
      stMap[c] = null;
    }
  }
  const stPL = stMap.PL, stPD = stMap.PD, stSA = stMap.SA, stBL = stMap.BL1, stFL = stMap.FL1, stCL = stMap.CL, stPGL = stMap.PGL;
  const normCache = new Map();
  const norm = (name) => {
    let v = normCache.get(name);
    if (v === void 0) {
      v = normalizeTeamName(name);
      normCache.set(name, v);
    }
    return v;
  };
  const top3 = {};
  for (const c of standCodes) {
    const st = stMap[c];
    if (st && st.started !== false && Array.isArray(st.teams)) {
      top3[c] = new Set(st.teams.slice(0, 3).map((t) => norm(t.name)));
    }
  }
  const isTopTeamInvolved = (m) => {
    const set = top3[m.competition.code];
    if (!set) return false;
    return set.has(norm(m.homeTeam.name)) || set.has(norm(m.awayTeam.name));
  };
  const isTopTable = (m) => {
    const set = top3[m.competition.code];
    if (!set) return false;
    return set.has(norm(m.homeTeam.name)) && set.has(norm(m.awayTeam.name));
  };
  const top5 = {};
  for (const c of standCodes) {
    const st = stMap[c];
    if (st && st.started !== false && Array.isArray(st.teams)) {
      top5[c] = new Set(st.teams.slice(0, 5).map((t) => norm(t.name)));
    }
  }
  const isSelName = (name) => {
    masterTeamList();
    return masterMemo.normSet.has(normAlias(name));
  };
  const isSelVsTop5 = (m) => {
    const set = top5[m.competition.code];
    if (!set) return false;
    const selHome = isSelName(m.homeTeam.name);
    const selAway = isSelName(m.awayTeam.name);
    if (!selHome && !selAway) return false;
    return selHome && set.has(norm(m.awayTeam.name)) || selAway && set.has(norm(m.homeTeam.name));
  };
  const withTop = (m) => {
    const p: any = pubMatch(m);
    p.top = isTopTable(m);
    p.clash = isMasterClash(m);
    p.sel = hasSelectedTeam(m);
    return p;
  };
  // v13.118-fixsched: the fixture-aware POLL HINT (section 7) — the payload
  // tells the client how fast to poll: live/pre-match keep the legacy 60s
  // cadence, idle slows to 15min. Computed from the same scheduler decision
  // the cron tick uses (fixture-first, never a fixed clock window), over the
  // public display tier (shouldReport OR top-table involvement) — defined
  // AFTER isTopTeamInvolved on purpose (no TDZ).
  let pollHintSec = 60;
  let schedMode = "LIVE";
  try {
    const pubTier = matches.filter((m) => shouldReport(m) || isTopTeamInvolved(m));
    const sigPub = computeFixtureSignal(pubTier, now);
    const actPub = decideActivity(sigPub, { nowMs: now, feedOk: true });
    pollHintSec = actPub.pollHintSec;
    schedMode = actPub.mode;
  } catch (e) { }
  const eom = new Date(now);
  eom.setMonth(eom.getMonth() + 1, 0);
  eom.setHours(23, 59, 59, 999);
  const liveRank = (m) => isLiveStatus(m.status) ? 0 : 1;
  const select = (pool) => ({
    // v13.109-consolidated: the CONSOLIDATED tier — the website IS the
    // consolidated surface ("games this week" lists): one-desired fixtures
    // stay listed exactly as before; only the bot's individual pushes went
    // strict. (Was shouldNotify pre-v13.109 — same semantics as shouldReport.)
    upcoming: pool.filter((m) => (shouldReport(m) || isTopTeamInvolved(m)) && m.status !== "FINISHED" && (isLiveStatus(m.status) || new Date(m.utcDate).getTime() > now) && new Date(m.utcDate).getTime() <= eom.getTime()).sort((a, b) => liveRank(a) - liveRank(b) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()).slice(0, 50),
    // v12.5: "نتایج اخیر" must carry the whole week — the old 12-hour window
    // emptied the card every morning after a matchday, so this week's CL
    // results (the exact ones the bot notified on Telegram) never showed.
    // 7 days covers the weekend league round + midweek continental rounds;
    // newest first. v12.32: cap raised 12 \u2192 20 \u2014 the client's \xAB\u0628\u06CC\u0634\u062A\u0631\xBB
    // expander shows the latest 20 (5 by default; PC and phones alike).
    finished: pool.filter((m) => (shouldReport(m) || isTopTeamInvolved(m)) && m.status === "FINISHED" && now - new Date(m.utcDate).getTime() < 7 * 864e5).sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime()).slice(0, 20)
  });
  let { upcoming, finished } = select(matches);
  const BOX_NEAR_MS = 7 * 864e5;
  const lgPool = matches.filter((m) => m.status !== "FINISHED" && isDomesticLeagueCode(m.competition.code) && (isLiveStatus(m.status) || new Date(m.utcDate).getTime() > now && new Date(m.utcDate).getTime() <= now + 90 * 864e5)).sort((a, b) => liveRank(a) - liveRank(b) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  const bigLgOf = (m) => isMasterClash(m) || isDerby(m) || isTopTable(m);
  const byKick = (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
  const lgBig = lgPool.filter((m) => bigLgOf(m)).sort(byKick);
  const lgRest = lgPool.filter((m) => !bigLgOf(m) && isSelVsTop5(m)).sort(byKick);
  const topSpotPicked = [];
  const topSpotKeys = new Set();
  const addBox = (m) => {
    const k = String(m.id || "") + "|" + m.utcDate;
    if (topSpotKeys.has(k) || topSpotPicked.length >= 11) return;
    topSpotKeys.add(k);
    topSpotPicked.push(m);
  };
  lgBig.slice(0, 11).forEach(addBox);
  lgRest.forEach(addBox);
  const topSpotList = topSpotPicked.sort(byKick);
  const topSpotNext = topSpotList[0] || null;
  // v13.73-herotruth: the hero pick is the SHARED pickHeroMatch expression
  // (matches.ts) — the same one the bot's /featured uses. Website-as-truth
  // (v13.68) now holds by construction, not by coincidence.
  const heroMatch = pickHeroMatch(matches);
  const nextBig = heroMatch ? pubMatch(heroMatch) : null;
  const standings: Record<string, any> = {};
  standCodes.forEach((c) => {
    standings[c] = Object.assign({ code: c, name: COMP_EN[c] || c, faName: translateCompetition(c), emblem: LEAGUE_LOGOS[c] || null }, compact(stMap[c]));
  });
  standings.PGL = Object.assign({ code: "PGL", name: COMP_EN.PGL || "Persian Gulf Pro League", faName: translateCompetition("PGL"), emblem: LEAGUE_LOGOS.PGL || null }, compact(stPGL));
  // v13.53-standsteady: the v13.34-pgl-fallback, generalized from PGL-only
  // to EVERY standings code + the UCL card — the user's report: "if there
  // are 5 league tables, 2 of them might not load / جدول هنوز در دسترس
  // نیست". Root chain: the FD rotation starved some codes of fetch
  // opportunities, their 8h KV cache expired, and the next 429/timeout left
  // the box empty. A days-old table beats an empty box. Zero cost on the
  // happy path: the snapshot is read ONLY when a code has no live table.
  // Stale copies carry `stale`/`staleAsOf` (the contract the PGL path
  // established) so the client and admins can tell them apart.
  // (top3/top5 marking above intentionally uses only LIVE tables — a stale
  // table must not drive the top-team clash flags.)
  let snapStand = null, snapUcl = null, snapAsOf = null;
  const stHasTeams = (st) => !!(st && Array.isArray(st.teams) && st.teams.length);
  const standMissing = standCodes.concat(["PGL"]).filter((c) => !stHasTeams(stMap[c]));
  const clTableMissing = !stHasTeams(stCL);
  if ((standMissing.length || clTableMissing) && CONFIG.KV_PUBLIC_SNAPSHOT) {
    try {
      const snap = await env.STATE.get(CONFIG.KV_PUBLIC_SNAPSHOT, "json").catch(() => null);
      if (snap && snap.data) {
        if (snap.data.standings) snapStand = snap.data.standings;
        if (snap.data.ucl) snapUcl = snap.data.ucl;
        snapAsOf = snap.ts ? new Date(snap.ts).toISOString() : snap.data.fetchedAt || null;
      }
    } catch (e) {
      // snapshot unavailable — keep the empty box (previous behavior)
    }
  }
  for (const c of standMissing) {
    const st = snapStand && snapStand[c];
    if (stHasTeams(st)) {
      standings[c] = Object.assign({}, st, { code: c, stale: true, staleAsOf: snapAsOf });
    }
  }
  const tierOf = (code) => CONFIG.INTL_COMPETITIONS[code] ? "gold" : code === "CL" ? "gold" : code === "EL" ? "silver" : code === "ECL" ? "bronze" : "domestic";
  const countryOf = (code) => ({ "FA_CUP": "EN", "EFL_CUP": "EN", "CDR": "ES", "COPPA_ITALIA": "IT", "DFB_POKAL": "DE", "HAZFI_CUP": "IR" })[code] || null;
  const cupOrder = ["EL", "ECL", ...Object.keys(CONFIG.INTL_COMPETITIONS), "FA_CUP", "EFL_CUP", "CDR", "COPPA_ITALIA", "DFB_POKAL", "HAZFI_CUP"];
  const EURO_LL_START = +new Date(CONFIG.CUP_PHASE_WINDOWS.EURO_LL_START);
  const FA_ROUND1 = +new Date(CONFIG.CUP_PHASE_WINDOWS.FA_ROUND1);
  const cupsRaw = cupOrder.map((code) => {
    const next = matches.filter((m) => {
      if (m.competition.code !== code) return false;
      if (m.status === "FINISHED") return false;
      if (!(isLiveStatus(m.status) || new Date(m.utcDate).getTime() > Date.now())) return false;
      if (code === "FA_CUP" && new Date(m.utcDate).getTime() < FA_ROUND1) return false;
      return true;
    }).sort((a, b) => (isLiveStatus(a.status) ? 0 : 1) - (isLiveStatus(b.status) ? 0 : 1) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())[0];
    const qualifying = !!(next && (code === "EL" || code === "ECL") && new Date(next.utcDate).getTime() < EURO_LL_START);
    return {
      code,
      name: COMP_EN[code] || code,
      faName: translateCompetition(code),
      emblem: LEAGUE_LOGOS[code] || null,
      tier: tierOf(code),
      country: countryOf(code),
      next: next ? pubMatch(next) : null,
      qualifying
    };
  });
  const cups = cupsRaw.filter((c) => !(CONFIG.INTL_COMPETITIONS[c.code] && !c.next));
  const clMatches = matches.filter((m) => m.competition.code === "CL" && m.status !== "FINISHED" && (isLiveStatus(m.status) || new Date(m.utcDate).getTime() > Date.now() && new Date(m.utcDate).getTime() <= Date.now() + 90 * 864e5)).sort((a, b) => (isLiveStatus(a.status) ? 0 : 1) - (isLiveStatus(b.status) ? 0 : 1) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()).slice(0, 16);
  // v13.100-priority: the site's UCL card follows the user's rule too —
  // both-sides followed (+featured bonus) lead «مسابقات مهم لیگ قهرمانان
  // اروپا», one-side follow next, kickoff inside each tier; LIVE matches
  // still lead everything (a rolling ball outranks any fixture). The
  // 2026-10-14 case: the card read LASK–Liverpool → Roma–Real → Bodø–Dortmund
  // → City–PSG (chronological); now City–PSG opens the card.
  const clBox = clMatches.filter((m) => hasSelectedTeam(m)).sort((a, b) => (isLiveStatus(a.status) ? 0 : 1) - (isLiveStatus(b.status) ? 0 : 1) || priorityTier(b) - priorityTier(a) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()).slice(0, 8);
  // v13.53-standsteady: when the live CL table is missing, the snapshot's
  // ucl card fills in (same stale-fallback as the league tables — the card
  // used to render its own «جدول هنوز در دسترس نیست» twin whenever the CL
  // standings fetch failed with an expired cache).
  const uclStarted = stCL ? stCL.started !== false : snapUcl ? snapUcl.started !== false : true;
  const clubsCat = await env.STATE.get(CONFIG.KV_CLUBS_CATALOG, "json").catch(() => null);
  const crestMap = new Map();
  if (clubsCat && Array.isArray(clubsCat.clubs)) {
    for (const c of clubsCat.clubs) {
      if (c && c.n && c.c) crestMap.set(normTeamKey(c.n), c.c);
    }
  }
  const crestOf = (n) => n ? crestMap.get(normTeamKey(n)) || null : null;
  const ucl = {
    emblem: LEAGUE_LOGOS.CL || null,
    matchday: stCL ? stCL.matchday : snapUcl ? snapUcl.matchday : null,
    started: uclStarted,
    // Pre-draw: count down to the projected league-phase kickoff instead of
    // showing nothing; real first fixture wins the moment it exists.
    firstStart: !uclStarted && !clMatches.length ? projectedUclStart().toISOString() : null,
    // v12.16: FULL detail per team — the UCL card is a complete league table
    // now (MP / W / D / L / GD / Pts columns), not just points.
    // v12.18: + crest (the round club logo the user asked for).
    // v13.53-standsteady: snapshot's teams fill the card when stCL is empty.
    teams: stCL ? stCL.teams.map((t) => ({ pos: t.pos, name: t.name, faName: translateTeam(t.name), crest: crestOf(t.name), points: t.points, played: t.played, won: t.won, draw: t.draw, lost: t.lost, gf: t.gf, ga: t.ga, gd: t.gd != null ? t.gd : t.gf != null && t.ga != null ? t.gf - t.ga : null })) : snapUcl && Array.isArray(snapUcl.teams) && snapUcl.teams.length ? snapUcl.teams : null,
    matches: clBox.map(pubMatch)
  };
  const tNow = getNowTehran(env);
  const daysSinceSat = (tNow.getUTCDay() + 1) % 7;
  const tehranWallMs = Date.UTC(tNow.getUTCFullYear(), tNow.getUTCMonth(), tNow.getUTCDate(), tNow.getUTCHours(), tNow.getUTCMinutes());
  const offsetMs = tehranWallMs - Date.now();
  // v12.51: thisWeek is now a 7-day window from NOW (not from Saturday).
  // Was Saturday-based which meant mid-week users only saw the remaining
  // days of the Persian week, not a full 7-day lookahead.
  const weekStart = Date.now();
  const weekEnd = weekStart + 7 * 864e5;
  const thisWeek = matches.filter((m) => (shouldReport(m) || isTopTeamInvolved(m)) && new Date(m.utcDate).getTime() >= weekStart && new Date(m.utcDate).getTime() < weekEnd).sort((a, b) => liveRank(a) - liveRank(b) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()).slice(0, 16);
  const nextWeek = matches.filter((m) => (shouldReport(m) || isTopTeamInvolved(m)) && new Date(m.utcDate).getTime() >= weekEnd && new Date(m.utcDate).getTime() < weekEnd + 7 * 864e5).sort((a, b) => liveRank(a) - liveRank(b) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()).slice(0, 16);
  const data: any = { upcoming: upcoming.filter((m) => !topSpotKeys.has(String(m.id || "") + "|" + m.utcDate)).map(withTop), finished: finished.map(withTop), nextBig, topSpot: { next: topSpotNext ? withTop(topSpotNext) : null, matches: topSpotList.map(withTop) }, thisWeek: thisWeek.map(withTop), nextWeek: nextWeek.map(withTop), standings, cups, ucl, fetchedAt: null, pollHint: pollHintSec, schedMode };
  if (prewarm) data.prewarm = true;
  const poolMeta = matches ? await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null) : null;
  data.fetchedAt = poolMeta && poolMeta.fetchedAt || (new Date()).toISOString();
  // v12.x-resilience: snapshot fallback. If the live sweep failed OR the
  // pool came back empty (no matches at all from the API), try the long-TTL
  // snapshot in KV \u2014 a stale week of fixtures is still better than empty
  // cards. The data is tagged with `cached: true` + `cachedAt` so the page
  // can show a subtle "cached data" indicator to the user. The 5-min KV
  // cache (above) is still the fast path; this is the last-resort fallback.
  // NOTE: we do NOT fall back when the live sweep succeeded but the upcoming
  // list is empty (e.g. matches exist but all are far-out or unfollowed) \u2014
  // that case still has standings/UCL/cups to render and should NOT use the
  // stale snapshot.
  const poolEmpty = !matches || (Array.isArray(matches) && matches.length === 0);
  if ((liveSweepFailed || poolEmpty) && CONFIG.KV_PUBLIC_SNAPSHOT) {
    const snap = await env.STATE.get(CONFIG.KV_PUBLIC_SNAPSHOT, "json").catch(() => null);
    if (snap && snap.data && (snap.data.upcoming || snap.data.finished || snap.data.topSpot || snap.data.ucl || snap.data.standings)) {
      // v13.54-livestamp: this serve IS degraded (the sweep failed / the
      // pool is empty) so the cached badge stays ON here — but its age is
      // the DATA epoch (the pool stamp riding in fetchedAt), not the KV
      // write time (the old age froze at the last content change and read
      // "1407m ago" during healthy break weeks).
      const epochMs = Date.parse(snap.data.fetchedAt || "") || snap.ts || Date.now();
      const stale = Object.assign({}, snap.data, { cached: true, cachedAt: new Date(epochMs).toISOString() });
      // Re-write the short-TTL cache too so the next visitor in the next 5
      // min doesn't all hammer the failing API again \u2014 they all get the
      // stale snapshot from the short cache.
      // v13.55-epochflow: put failures are LOGGED now \u2014 the silent .catch
      // here is what hid the frozen-epoch bug for 12.5h (writes dying at
      // the subrequest ceiling were invisible in every tail). TTL 60\u2192720:
      // one uniform payload TTL (see the write below).
      await env.STATE.put(CONFIG.KV_PUBLIC_MATCHES, JSON.stringify({ ts: Date.now(), data: stale }), { expirationTtl: 720 }).catch((e) => console.warn("degraded payload re-cache write failed: " + e.message));
      return stale;
    }
  }
  // v13.55-epochflow: ONE TTL for every payload write \u2014 720s, empty view
  // included (was 60s for visitor-written empty payloads). The 60s retry
  // TTL meant every >60s-gap poll hit the snapshot serve + a full rebuild
  // (with the old fetching standings ≈ 25+ subrequests each) \u2014 the
  // break-week churn that also burned FD's quota minute. With the rebuild
  // now pure-KV (~15 ops) the retry is cheap, but there is no reason to
  // cycle it 12× more often than a data-bearing payload. Put failures are
  // LOGGED (see the frozen-epoch lesson above).
  await env.STATE.put(CONFIG.KV_PUBLIC_MATCHES, JSON.stringify({ ts: Date.now(), data }), { expirationTtl: 720 }).catch((e) => console.warn("public payload write failed: " + e.message));
  // v12.x-resilience: refresh the 7-day snapshot ONLY when the live sweep
  // succeeded with real data — otherwise we'd overwrite the snapshot
  // with empty arrays and lose the fallback.
  // v13.31-kv-budget: write the 7-day snapshot ONLY when the payload
  // actually changed. It previously rode along on EVERY successful
  // refresh (up to ~288 writes/day under continuous traffic) — a
  // large share of the 1,000/day free-tier KV write quota that was
  // exhausted in session 2. Standings/fixtures/cups change only around
  // live windows, so on a quiet day this removes nearly all snapshot
  // writes. One extra KV READ per refresh (reads: 100k/day) buys it.
  // v13.53-standsteady: the refresh is NO LONGER gated on non-empty match
  // lists. During international breaks a SUCCESSFUL sweep legitimately
  // produces empty upcoming/finished — but the old gate froze the snapshot
  // at the last matchday's build, so break-week visitors cycled an aging
  // snapshot forever (the 2026-09-28 break: the Sunday copy still carried
  // the pre-13.53 missing-tables damage — snapshot-served pages showed
  // «جدول هنوز در دسترس نیست» even though every rebuild had all 6 tables).
  // Now the snapshot refreshes whenever the sweep SUCCEEDED with a real
  // pool (not liveSweepFailed, not poolEmpty — the v12.x failure semantics
  // are preserved: a total-provider-failure build still never overwrites
  // the fallback). Change-only, so a quiet break day costs one healing
  // write and nothing after.
  if (!(liveSweepFailed || poolEmpty) && CONFIG.KV_PUBLIC_SNAPSHOT) {
    const prevSnap = await env.STATE.get(CONFIG.KV_PUBLIC_SNAPSHOT, "json").catch(() => null);
    const changed = !prevSnap || !prevSnap.data || JSON.stringify(prevSnap.data) !== JSON.stringify(data);
    if (changed) {
      // v13.55-epochflow: logged, not swallowed — a silently-failing
      // snapshot write is what froze the served epoch at 05:41 for 12.5h.
      await env.STATE.put(CONFIG.KV_PUBLIC_SNAPSHOT, JSON.stringify({ ts: Date.now(), data }), { expirationTtl: CONFIG.KV_PUBLIC_SNAPSHOT_TTL || (7 * 24 * 60 * 60) }).catch((e) => console.warn("public snapshot write failed: " + e.message));
    }
  }
  return data;
}
