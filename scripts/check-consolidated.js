// check-consolidated.js — v13.109-consolidated: THE TWO-TIER eligibility gate.
//
// The product rule this gate fences (the user's 2026-10-16 report): the bot
// was pushing INDIVIDUAL picture notifications for one-big-club league
// fixtures (استراتسبورگ–پاری سن ژرمن, برنتفورد–لیورپول,
// منچسترسیتی–ایپسویچ) — matches that are not worth watching despite one
// side being desired. Those fixtures must now live ONLY in the consolidated
// week-ahead digest ("بازی‌های هفته آینده") / website lists, while the
// individual tier fires ONLY for:
//   - BOTH clubs desired (big-vs-big), OR
//   - one desired + the opponent a CURRENT UCL participant (champions of
//     their leagues — Liverpool–Porto, PSG–Monaco), OR
//   - a NAMED derby with a desired side (the bot's own derby-promotion
//     product line), OR
//   - the cup tier unchanged: CL + domestic cups + EL/ECL QF+ (an
//     elimination tie with a desired side — FA Cup Liverpool–Ipswich).
//
// Drives the REAL code (full-worker harness): the real shouldNotify /
// shouldReport / setUclParticipants / primeUclParticipants, plus source
// asserts pinning the wiring of both tiers. FAIL-FORM: any one-desired
// league fixture that still pushes, any exception that silently dies, any
// consolidated surface that lost its fixtures fails the suite.
const createHarness = require("./lib/full-worker");
const src = require("./lib/worker-src")();
// src/seo/* is NOT part of the worker-src concat (the SEO subsystem rides
// only in the real bundle) — read the file from disk for its wiring assert.
const fs = require("fs");
const path = require("path");
const seoDataSrc = fs.readFileSync(path.join(__dirname, "..", "src", "seo", "data.ts"), "utf8");

let failed = 0;
const check = (name, cond, detail) => {
  console.log((cond ? "OK   " : "FAIL ") + name + (cond ? "" : (detail ? "  [" + detail + "]" : "")));
  if (!cond) failed++;
};

const m = (home, away, code, stage) => ({
  id: Math.floor(Math.random() * 1e6),
  utcDate: "2026-10-20T19:00:00Z",
  status: "SCHEDULED",
  stage: stage || "REGULAR_SEASON",
  competition: { code },
  homeTeam: { name: home },
  awayTeam: { name: away },
  score: null
});

(async () => {
  const h = createHarness({ startMs: Date.parse("2026-10-16T12:00:00Z") });
  try {
    // Fresh harness = unprimed UCL set (the cold-isolate shape).
    clearUclParticipants();
    check("cold: UCL set unprimed (harness really is cold)", uclPrimed() === false && uclParticipantCount() === 0);

    // ============ 1) THE USER'S REPORTED CASES — digest-only now ============
    check("Strasbourg\u2013PSG (FL1): NO individual push (the user's report)", shouldNotify(m("RC Strasbourg Alsace", "Paris Saint-Germain FC", "FL1")) === false);
    check("Strasbourg\u2013PSG (FL1): still REPORTED (consolidated tier)", shouldReport(m("RC Strasbourg Alsace", "Paris Saint-Germain FC", "FL1")) === true);
    check("Brentford\u2013Liverpool (PL): NO individual push (the user's report)", shouldNotify(m("Brentford FC", "Liverpool FC", "PL")) === false);
    check("Brentford\u2013Liverpool (PL): still REPORTED", shouldReport(m("Brentford FC", "Liverpool FC", "PL")) === true);
    check("ManCity\u2013Ipswich (PL): NO individual push (the user's report)", shouldNotify(m("Manchester City FC", "Ipswich Town FC", "PL")) === false);
    check("ManCity\u2013Ipswich (PL): still REPORTED", shouldReport(m("Manchester City FC", "Ipswich Town FC", "PL")) === true);

    // ============ 2) the strict tier's keep-clauses ============
    // 2a) both desired — big-vs-big still pushes.
    check("Arsenal\u2013Chelsea (PL): BOTH desired \u2192 pushes", shouldNotify(m("Arsenal FC", "Chelsea FC", "PL")) === true);
    check("Real\u2013Bar\u00e7a (PD): BOTH desired \u2192 pushes", shouldNotify(m("Real Madrid CF", "FC Barcelona", "PD")) === true);
    check("Milan\u2013Inter (SA): BOTH desired \u2192 pushes", shouldNotify(m("AC Milan", "Inter Milan", "SA")) === true);
    // 2b) named derbies with a desired side keep their individual fixture
    // (the bot's own v13.51/v13.101 derby-promotion line; without this
    // clause NO Ligue 1 fixture could ever push — PSG is FL1's only entry).
    check("Liverpool\u2013Everton (PL): Merseyside derby + desired side \u2192 pushes", shouldNotify(m("Liverpool FC", "Everton FC", "PL")) === true);
    check("Arsenal\u2013Tottenham (PL): North London derby + desired side \u2192 pushes", shouldNotify(m("Arsenal FC", "Tottenham Hotspur FC", "PL")) === true);
    check("PSG\u2013Marseille (FL1): Le Classique + desired side \u2192 pushes", shouldNotify(m("Paris Saint-Germain", "Olympique de Marseille", "FL1")) === true);
    // parity: neither-side-desired derby stays digest-only (as before).
    check("Roma\u2013Lazio (SA): derby but NEITHER desired \u2192 digest-only (parity)", shouldNotify(m("AS Roma", "SS Lazio", "SA")) === false && shouldReport(m("AS Roma", "SS Lazio", "SA")) === false);
    // 2c) the cup tier, UNCHANGED — the user's elimination-cup example.
    check("Liverpool\u2013Ipswich (FA Cup): elimination cup + desired side \u2192 pushes (the user's example)", shouldNotify(m("Liverpool FC", "Ipswich Town FC", "FA_CUP")) === true);
    check("Liverpool\u2013Porto (CL): either desired in the UCL \u2192 pushes (the user's example)", shouldNotify(m("Liverpool FC", "FC Porto", "CL")) === true);
    check("Bayern\u2013LASK (CL): either desired in the UCL \u2192 pushes (parity)", shouldNotify(m("FC Bayern M\u00fcnchen", "LASK Linz", "CL")) === true);
    // 2d) EL/ECL: league-phase one-desired is digest-only; QF+ keeps the
    // old either-desired verdict (parity by construction).
    check("ManUtd\u2013FCSB (EL league phase): NO individual push", shouldNotify(m("Manchester United FC", "FCSB", "EL")) === false);
    check("ManUtd\u2013FCSB (EL league phase): still REPORTED", shouldReport(m("Manchester United FC", "FCSB", "EL")) === true);
    check("ManUtd\u2013FCSB (EL QUARTER_FINALS): knockout \u2192 pushes (parity)", shouldNotify(m("Manchester United FC", "FCSB", "EL", "QUARTER_FINALS")) === true);
    check("Chelsea\u2013Panathinaikos (ECL league phase): NO individual push", shouldNotify(m("Chelsea FC", "Panathinaikos FC", "ECL")) === false);
    // 2e) non-covered league fixtures: neither tier (parity with before).
    check("Bournemouth\u2013Wolves (PL): neither tier", shouldNotify(m("Bournemouth FC", "Wolves FC", "PL")) === false && shouldReport(m("Bournemouth FC", "Wolves FC", "PL")) === false);
    // 2f) the A-League desired list rides the same two tiers.
    check("Melbourne Victory\u2013Sydney FC (AL): BOTH desired \u2192 pushes", shouldNotify(m("Melbourne Victory", "Sydney FC", "AL")) === true);
    check("Melbourne Victory\u2013Wellington (AL): one desired \u2192 digest-only", shouldNotify(m("Melbourne Victory", "Wellington Phoenix FC", "AL")) === false && shouldReport(m("Melbourne Victory", "Wellington Phoenix FC", "AL")) === true);

    // ============ 3) THE UCL-PARTICIPANT EXCEPTION (lifecycle) ============
    // 3a) unprimed (cold isolate before the prime, or a failed prime):
    // the exception is INERT — fail toward digest-only, never extra pushes.
    check("PSG\u2013Monaco (FL1): unprimed \u2192 digest-only (inert direction)", shouldNotify(m("Paris Saint-Germain", "AS Monaco FC", "FL1")) === false);
    // 3b) primed: the champions-of-their-leagues exception fires.
    setUclParticipants(["AS Monaco FC", "Bayer 04 Leverkusen"]);
    check("PSG\u2013Monaco (FL1): Monaco \u2208 UCL set \u2192 pushes", shouldNotify(m("Paris Saint-Germain", "AS Monaco FC", "FL1")) === true);
    check("Bayern\u2013Leverkusen (BL1): Leverkusen \u2208 UCL set \u2192 pushes", shouldNotify(m("FC Bayern M\u00fcnchen", "Bayer 04 Leverkusen", "BL1")) === true);
    check("Bayern\u2013Bochum (BL1): Bochum \u2209 UCL set \u2192 digest-only", shouldNotify(m("FC Bayern M\u00fcnchen", "VfL Bochum 1848", "BL1")) === false);
    // the away-side direction of the exception (desired AWAY + UCL home).
    check("Leverkusen\u2013Bayern (BL1): desired AWAY + UCL home \u2192 pushes", shouldNotify(m("Bayer 04 Leverkusen", "FC Bayern M\u00fcnchen", "BL1")) === true);
    // 3c) set → clear restores the inert verdict (the simulate wrapper).
    clearUclParticipants();
    check("after clear: PSG\u2013Monaco digest-only again (deterministic sim shape)", shouldNotify(m("Paris Saint-Germain", "AS Monaco FC", "FL1")) === false && uclPrimed() === false);
    // 3d) negative control (FAIL-FORM): an empty set must not fire the
    // exception (a broken impl treating every opponent as UCL fails here).
    setUclParticipants([]);
    check("empty UCL set: the exception never fires (Bochum stays digest-only)", shouldNotify(m("FC Bayern M\u00fcnchen", "VfL Bochum 1848", "BL1")) === false);
    clearUclParticipants();

    // ============ 4) THE PRIME (the real loader, behavioral) ============
    // 4a) standings source: the CL KV cache blob → the 36-team roster.
    const standEnv = {
      STATE: { get: async (k) => (k === "standings_cache_CL" ? { ts: Date.now(), data: { teams: [{ name: "Bayer 04 Leverkusen" }, { name: "SS Lazio" }, { name: "FC Porto" }] } } : null) }
    };
    const n1 = await primeUclParticipants(standEnv, []);
    check("prime: CL standings cache loads the roster (3 teams, >=3 folded keys)", n1 >= 3 && uclParticipantCount() >= 3, "n=" + n1 + " size=" + uclParticipantCount());
    check("prime: isUclParticipant hits (Leverkusen)", isUclParticipant("Bayer 04 Leverkusen") === true);
    // 4b) the dual-fold: a standings "SS Lazio" answers a pool "Lazio" lookup.
    check("prime: alias fold — standings SS Lazio answers lookup Lazio", isUclParticipant("Lazio") === true);
    // 4c) the exception fires end-to-end through the primed set.
    check("prime: Bayern\u2013Leverkusen pushes through the primed standings", shouldNotify(m("FC Bayern M\u00fcnchen", "Bayer 04 Leverkusen", "BL1")) === true);
    // 4d) primed ONCE: a second prime with different sources is a no-op
    // (the once-per-cold-isolate contract; simulate overrides via set, not prime).
    const n2 = await primeUclParticipants({ STATE: { get: async () => null } }, [m("Real Madrid CF", "FC Barcelona", "CL")]);
    check("prime: warm re-prime is a no-op (same count, Leverkusen stays)", n2 === uclParticipantCount() && isUclParticipant("Bayer 04 Leverkusen") === true, "n2=" + n2);
    // 4e) the reverse fold (destructive — LAST among the standEnv-primed
    // checks): a standings "Lazio" answers a pool "SS Lazio" lookup.
    check("prime: reverse fold — lookup SS Lazio hits a standings Lazio", (function () { clearUclParticipants(); setUclParticipants(["Lazio"]); return isUclParticipant("SS Lazio"); })() === true);
    // 4f) pool fallback: no standings cache → the pool's own CL fixtures
    // (the exact spellings the classifier compares — zero aliasing risk).
    clearUclParticipants();
    const poolMatches = [m("Manchester City FC", "FC Porto", "CL"), m("Arsenal FC", "Bayer 04 Leverkusen", "CL"), m("Liverpool FC", "Everton FC", "PL")];
    const n3 = await primeUclParticipants({ STATE: { get: async () => null } }, poolMatches);
    check("prime: pool fallback builds the set from CL fixtures only", n3 === 4 && isUclParticipant("FC Porto") === true && isUclParticipant("Everton FC") === false, "n3=" + n3);
    // 4g) total failure (KV throws, empty pool) → EMPTY set, exception inert.
    clearUclParticipants();
    const boomEnv = { STATE: { get: async () => { throw new Error("kv down"); } } };
    const n4 = await primeUclParticipants(boomEnv, []);
    check("prime: total failure → empty inert set (digest-only direction)", n4 === 0 && uclPrimed() === true && shouldNotify(m("FC Bayern M\u00fcnchen", "Bayer 04 Leverkusen", "BL1")) === false, "n4=" + n4);
    // 4h) union: standings ∪ pool (a warm standings cache with a live pool).
    clearUclParticipants();
    const n5 = await primeUclParticipants(standEnv, [m("Manchester City FC", "Bod\u00f8/Glimt", "CL")]);
    check("prime: standings + pool union (5 raw names)", n5 === 5 && isUclParticipant("Bod\u00f8/Glimt") === true && isUclParticipant("SS Lazio") === true, "n5=" + n5);

    // ============ 5) source wiring asserts (the concat is the deployed truth) ============
    // 5a) the ENGINE (individual pushes) reads the STRICT tier.
    const engineSeg = src.slice(src.indexOf("// ===== src/notify-engine.ts ====="), src.indexOf("// ===== src/notify-status.ts ====="));
    check("source: notify-engine filter uses shouldNotify (strict)", /if \(!shouldNotify\(m\)\) return false;/.test(engineSeg));
    check("source: notify-engine primes the UCL set at entry", /await primeUclParticipants\(env, matches\)/.test(engineSeg));
    // 5b) HT/postponement alerts (individual pushes) read the STRICT tier.
    const statusSeg = src.slice(src.indexOf("// ===== src/notify-status.ts ====="), src.indexOf("// ===== src/notify-audit.ts ====="));
    check("source: notify-status (HT alerts) uses shouldNotify (strict)", /if \(!shouldNotify\(m\)\) continue;/.test(statusSeg));
    // 5c) the AUDIT derives its universe from the SAME strict tier + prime.
    const auditSeg = src.slice(src.indexOf("// ===== src/notify-audit.ts ====="), src.indexOf("// ===== src/user-store.ts ====="));
    check("source: audit universe uses shouldNotify (strict)", /\.filter\(shouldNotify\)/.test(auditSeg));
    check("source: audit primes defensively (/api/audit path)", /primeUclParticipants\(env, matches\)\.catch/.test(auditSeg));
    // 5d) the CONSOLIDATED surfaces read shouldReport (fixtures stay listed).
    const weeklySeg = src.slice(src.indexOf("// ===== src/digest-weekly.ts ====="), src.indexOf("// ===== src/digest-morning.ts ====="));
    check("source: week-ahead digest uses shouldReport (the consolidated home)", /shouldReport\(m\)/.test(weeklySeg) && !/import \{ shouldNotify/.test(weeklySeg));
    const poolSeg = src.slice(src.indexOf("// ===== src/cron-pool.ts ====="), src.indexOf("// ===== src/cron-maintenance.ts ====="));
    check("source: cron-pool retention uses shouldReport (cadence unchanged)", /shouldReport\(m\)/.test(poolSeg) && !/import \{ shouldNotify/.test(poolSeg));
    const pubSeg = src.slice(src.indexOf("// ===== src/public-matches.ts ====="), src.indexOf("// ===== src/bot-ui.ts ====="));
    check("source: website lists use shouldReport || isTopTeamInvolved", /shouldReport\(m\) \|\| isTopTeamInvolved\(m\)/.test(pubSeg) && !/import \{ shouldNotify/.test(pubSeg));
    const botSeg = src.slice(src.indexOf("// ===== src/bot.ts ====="), src.indexOf("// ===== src/cron-preflight.ts ====="));
    check("source: bot /next uses shouldReport && userFollowsMatch", /shouldReport\(m\) && userFollowsMatch/.test(botSeg) && !/import \{ shouldNotify/.test(botSeg));
    const seoSeg = seoDataSrc;
    check("source: SEO isBigForSeo uses shouldReport", /shouldReport\(m\)/.test(seoSeg) && !/import \{ shouldNotify/.test(seoSeg));
    // 5e) the cron notify phase primes BEFORE the first strict-tier consumer.
    const cronNotifySeg = src.slice(src.indexOf("// ===== src/cron-notify.ts ====="), src.indexOf("// ===== src/cron-public.ts ====="));
    const primeIdx = cronNotifySeg.indexOf("await primeUclParticipants(env, matches)");
    const statusCallIdx = cronNotifySeg.indexOf("await detectStatusChanges(env, matches)");
    check("source: runNotifyPhase primes BEFORE detectStatusChanges", primeIdx >= 0 && statusCallIdx > primeIdx, "prime@" + primeIdx + " status@" + statusCallIdx);
    // 5f) the simulate wrapper: clear → set → run → clear (deterministic).
    const simSeg = src.slice(src.indexOf("// ===== src/simulate.ts ====="), src.indexOf("// ===== src/admin-ops.ts ====="));
    const clr1 = simSeg.indexOf("clearUclParticipants()");
    const setIdx = simSeg.indexOf('setUclParticipants(["AS Monaco FC"])');
    const runIdx = simSeg.indexOf("await sendMatchNotifications(simEnv, dummy)");
    const clr2 = simSeg.indexOf("clearUclParticipants()", setIdx + 10);
    check("source: simulate wraps clear-set-run-clear (deterministic UCL set)", clr1 >= 0 && setIdx > clr1 && runIdx > setIdx && clr2 > runIdx, [clr1, setIdx, runIdx, clr2].join(","));
    // 5g) the week-ahead digest actually LISTS a one-desired fixture
    // (behavioral: the consolidated home carries what the strict tier dropped).
    const waEnv = {
      STATE: { get: async (k) => (k === "matches_v13_tracked" ? { matches: [m("Brentford FC", "Liverpool FC", "PL"), m("Arsenal FC", "Chelsea FC", "PL")] } : null) }
    };
    const wa = await buildWeekAheadMessage(waEnv, "fa");
    check("behavioral: week-ahead digest LISTS Brentford\u2013Liverpool (consolidated home)", !!wa && wa.indexOf("\u0628\u0631\u0646\u062A\u0641\u0648\u0631\u062F") >= 0 && wa.indexOf("\u0644\u06CC\u0648\u0631\u067E\u0648\u0644") >= 0, (wa || "null").replace(/\n/g, " | ").slice(0, 160));
    check("behavioral: week-ahead digest LISTS Arsenal\u2013Chelsea too", !!wa && wa.indexOf("\u0622\u0631\u0633\u0646\u0627\u0644") >= 0);
  } finally {
    h.restore();
  }

  console.log(failed ? `\n${failed} FAIL` : "\nAll consolidated checks passed");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("FAIL harness error: " + (e && e.stack || e)); process.exit(1); });
