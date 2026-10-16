// check-fasync.js — v13.108-fasync: the BOT ≡ WEBSITE Farsi-glossary gate.
//
// The bug this gate fences: the live UCL feed sends full legal names
// ("Paris Saint-Germain FC", "Sporting Clube de Portugal", "FK Bodø/Glimt")
// that missed the static dict's EXACT keys, then died in the ambiguous stem
// fallback (both "paris" and "parissaintgermain" stems match) — they only
// translated via the AI-learned KV glossary, which the WEBSITE payload
// builder loads (ensureFaAiCache) but the BOT webhook path did NOT → cold
// isolates rendered ENGLISH in the bot's Farsi mode while the website showed
// Persian. Fixed by three coordinated changes:
//   1) translateTeam consults FA_TEAMS_NORM (the normalized-dict lookup)
//   2) admin overrides are split from AI-learned entries and ranked FIRST
//   3) handleTelegramUpdate loads the same KV glossary before composing.
//
// This gate drives the REAL code (full-worker harness): the real
// translateTeam/ensureFaAiCache/resetFaAiCache, cold AND warm, plus source
// asserts pinning the wiring. FAIL-FORM: any English leak, any precedence
// violation, any missing wiring line fails the suite.
const createHarness = require("./lib/full-worker");
const src = require("./lib/worker-src")();

let failed = 0;
const check = (name, cond, detail) => {
  console.log((cond ? "OK   " : "FAIL ") + name + (cond ? "" : (detail ? "  [" + detail + "]" : "")));
  if (!cond) failed++;
};

// The live-feed name set (observed in the production match pool + public
// payload, 2026-10-16) with the glossary values the website renders — every
// entry MUST resolve identically in a COLD bot isolate (dict only, no KV
// cache): the exact-equivalence contract between the two surfaces.
const LIVE_SET = [
  ["Paris Saint-Germain FC", "\u067E\u0627\u0631\u06CC \u0633\u0646 \u0698\u0631\u0645\u0646"],           // پاری سن ژرمن
  ["Paris Saint-Germain", "\u067E\u0627\u0631\u06CC \u0633\u0646 \u0698\u0631\u0645\u0646"],
  ["PSG", "\u067E\u0627\u0631\u06CC \u0633\u0646 \u0698\u0631\u0645\u0646"],
  ["Sporting Clube de Portugal", "\u0627\u0633\u067E\u0648\u0631\u062A\u06CC\u0646\u06AF \u0644\u06CC\u0633\u0628\u0648\u0646"], // اسپورتینگ لیسبون
  ["Sporting CP", "\u0627\u0633\u067E\u0648\u0631\u062A\u06CC\u0646\u06AF"],
  ["Sporting Lisbon", "\u0627\u0633\u067E\u0648\u0631\u062A\u06CC\u0646\u06AF"],
  ["FK Bod\u00F8/Glimt", "\u0628\u0648\u062F\u0648/\u06AF\u0644\u06CC\u0645\u062A"],                     // بودو/گلیمت
  ["LASK Linz", "\u0644\u0627\u0633\u06A9 \u0644\u06CC\u0646\u062A\u0633"],                             // لاسک لینتس
  ["SK Slavia Praha", "\u0627\u0633\u0644\u0627\u0648\u06CC\u0627 \u067E\u0631\u0627\u06AF"],           // اسلاویا پراگ
  ["FC Kairat Almaty", "\u06A9\u0627\u06CC\u0631\u0627\u062A \u0622\u0644\u0645\u0627\u062A\u06CC"],   // کایرات آلماتی
  ["Viking FK", "\u0648\u06CC\u06A9\u06CC\u0646\u06AF"],                                                 // ویکینگ
  ["Sabah FK", "\u0635\u0628\u0627\u062D"],                                                             // صباح
  ["PAE AEK", "\u0622\u06CC\u06A9 \u0622\u062A\u0646"],                                                 // آیک آتن
  ["AEK Athens", "\u0622\u0626\u06A9 \u0622\u062A\u0646"],
  ["FC Lorient", "\u0644\u0648\u0631\u06CC\u0646\u062A"],                                               // لورینت
  ["Le Mans FC", "\u0644\u0648\u0645\u0627\u0646"],                                                     // لومان
  ["RC Deportivo La Coru\u00F1a", "\u062F\u067E\u0648\u0631\u062A\u06CC\u0648\u0648 \u0644\u0627\u06A9\u0631\u0648\u0646\u06CC\u0627"], // دپورتیوو لاکرونیا
  ["Magdeburg", "\u0645\u0627\u06AF\u062F\u0628\u0648\u0631\u06AF"],                                   // ماگدبورگ
  ["Cuarte", "\u06A9\u0648\u0622\u0631\u062A\u0647"],                                                   // کوآرته
  ["SG Sonnenhof Grossaspach", "\u0627\u0633 \u062C\u06CC \u0632\u0648\u0646\u0646\u0647\u0648\u0641 \u06AF\u0631\u0648\u0633\u0622\u0633\u067E\u0627\u062E"], // اس جی زوننهوف گروسآسپاخ
  ["SS Lazio", "\u0644\u0627\u062A\u0632\u06CC\u0648"],                                                 // لاتزیو
  ["ACF Fiorentina", "\u0641\u06CC\u0648\u0631\u0646\u062A\u06CC\u0646\u0627"],                         // فیورنتینا
  ["Real Betis Balompi\u00E9", "\u0631\u0626\u0627\u0644 \u0628\u062A\u06CC\u0633"],                     // رئال بتیس
  ["US Sassuolo Calcio", "\u0633\u0627\u0633\u0648\u0644\u0648"],                                       // ساسولو
  ["Racing Club de Lens", "\u0644\u0627\u0646\u0633"],                                                   // لانس
  ["Feyenoord Rotterdam", "\u0641\u0627\u06CC\u0646\u0648\u0631\u062F"],                                 // فاینورد
  ["Como", "\u06A9\u0648\u0645\u0648"],                                                                 // کومو
  ["Cremonese", "\u06A9\u0631\u0645\u0648\u0646\u0632\u0647"],                                           // کرمونزه
  ["FK Shakhtar Donetsk", "\u0634\u0627\u062E\u062A\u0627\u0631 \u062F\u0648\u0646\u062A\u0633\u06A9"], // شاختار دونتسک
  ["Gol Gohar FC", "\u06AF\u0644\u200C\u06AF\u0647\u0631 \u0633\u06CC\u0631\u062C\u0627\u0646"],         // گل‌گهر سیرجان (norm layer → dict value)
  ["Esteghlal Tehran", "\u0627\u0633\u062A\u0642\u0644\u0627\u0644"],                                   // استقلال
  ["Tractor S.C.", "\u062A\u0631\u0627\u06A9\u062A\u0648\u0631"],                                       // تراکتور (norm layer)
  ["Manchester City FC", "\u0645\u0646\u0686\u0633\u062A\u0631\u0633\u06CC\u062A\u06CC"],               // منچسترسیتی
  ["Real Madrid CF", "\u0631\u0626\u0627\u0644 \u0645\u0627\u062F\u0631\u06CC\u062F"],                   // رئال مادرید
];

(async () => {
  const h = createHarness({ startMs: Date.parse("2026-10-16T12:00:00Z") });
  try {
    // ============ 1) COLD ISOLATE (the bot webhook landing on a fresh worker) ============
    // No ensureFaAiCache yet — FA_AI_CACHE is null. Every live-feed name
    // must resolve via the static dict (exact + normalized key): this is
    // the exact-equivalence contract with the cache-loaded website builder.
    let coldLeaks = 0, coldMismatch = 0;
    for (const [en, wantFa] of LIVE_SET) {
      const got = translateTeam(en);
      if (got === en) { coldLeaks++; console.log("  cold LEAK: " + JSON.stringify(en)); }
      else if (got !== wantFa) { coldMismatch++; console.log("  cold MISMATCH: " + JSON.stringify(en) + " -> " + got + " (want " + wantFa + ")"); }
    }
    check("cold isolate: 0 English leaks across the " + LIVE_SET.length + " live-feed names", coldLeaks === 0, coldLeaks + " leaks");
    check("cold isolate: 0 value mismatches vs the website glossary", coldMismatch === 0, coldMismatch + " mismatches");
    check("cold isolate: FA_AI_CACHE still null (harness really is cold)", faAiCacheSize() === 0);

    // Negative control (FAIL-FORM): an unknown name MUST stay English —
    // proves the checks above can actually fail.
    check("negative control: unknown club stays English", translateTeam("Not A Real Club FC") === "Not A Real Club FC");

    // ============ 2) WARM ISOLATE (glossary loaded from KV fa_teams_ai) ============
    // The production record shape: overrides + learned + failed.
    const KV_REC = {
      v: 1,
      learned: {
        // real production entries (subset) — gap-fillers the dict does NOT cover
        omonianicosia: "\u0627\u0648\u0645\u0648\u0646\u06CC\u0627",             // اومونیا
        spartapraha: "\u0627\u0633\u067E\u0627\u0631\u062A\u0627 \u067E\u0631\u0627\u06AF", // اسپارتا پراگ
        // a learned entry that SHADOWS dict coverage — must NOT win over the
        // curated static dictionary (website + bot must show the dict value)
        shakhtardonetsk: "\u0634\u0627\u062E\u062A\u0627\u0631",                   // شاختار (short form)
        golgohar: "\u06AF\u0644 \u06AF\u0647\u0631"                                 // گل گهر (short form)
      },
      failed: {},
      overrides: {
        // the real production override (owner-set): PSG's preferred spelling
        parissaintgermain: "\u067E\u0627\u0631\u06CC \u0633\u0646 \u0698\u0631\u0645\u0646" // پاری سن ژرمن
      }
    };
    const mkEnv = (rec) => ({
      STATE: { get: async (k, t) => (k === "fa_teams_ai" ? (t === "json" ? rec : JSON.stringify(rec)) : null) }
    });

    await ensureFaAiCache(mkEnv(KV_REC));
    check("warm isolate: glossary loaded (5 override+learned keys)", faAiCacheSize() === 5, "size=" + faAiCacheSize());

    // 2a) override > exact dict (the v12.x contract, now real): the owner's
    // override wins for the exact form AND every provider variant.
    check("warm: override beats exact dict hit (Paris Saint-Germain)", translateTeam("Paris Saint-Germain") === KV_REC.overrides.parissaintgermain);
    check("warm: override beats norm variant (Paris Saint-Germain FC)", translateTeam("Paris Saint-Germain FC") === KV_REC.overrides.parissaintgermain);

    // 2b) override wins even when it CONTRADICTS the dict — sentinel proof
    // of precedence (fail-form: if the dict were checked first, the sentinel
    // would never surface).
    await resetFaAiCache();
    await ensureFaAiCache(mkEnv({ v: 1, learned: {}, failed: {}, overrides: { parissaintgermain: "SENTINEL" } }));
    check("warm: override sentinel outranks dict value", translateTeam("Paris Saint-Germain") === "SENTINEL", translateTeam("Paris Saint-Germain"));
    check("warm: override sentinel applies to FC variant too", translateTeam("Paris Saint-Germain FC") === "SENTINEL");

    // 2c) dict (norm layer) > AI-learned: the curated dictionary stays the
    // shared source of truth; learned entries only fill real gaps.
    await resetFaAiCache();
    await ensureFaAiCache(mkEnv(KV_REC));
    check("warm: learned does NOT shadow dict (FK Shakhtar Donetsk -> dict value)", translateTeam("FK Shakhtar Donetsk") === "\u0634\u0627\u062E\u062A\u0627\u0631 \u062F\u0648\u0646\u062A\u0633\u06A9", translateTeam("FK Shakhtar Donetsk"));
    check("warm: learned does NOT shadow dict (Gol Gohar FC -> dict value)", translateTeam("Gol Gohar FC") === "\u06AF\u0644\u200C\u06AF\u0647\u0631 \u0633\u06CC\u0631\u062C\u0627\u0646", translateTeam("Gol Gohar FC"));

    // 2d) learned fills the gaps the dict does not cover (same glossary the
    // website payload builder bakes into faName fields).
    check("warm: learned fills gaps (Omonia Nicosia)", translateTeam("Omonia Nicosia") === "\u0627\u0648\u0645\u0648\u0646\u06CC\u0627", translateTeam("Omonia Nicosia"));
    check("warm: learned fills gaps (Sparta Praha)", translateTeam("Sparta Praha") === "\u0627\u0633\u067E\u0627\u0631\u062A\u0627 \u067E\u0631\u0627\u06AF", translateTeam("Sparta Praha"));

    // 2e) the live set stays STABLE warm (no cold/warm drift on covered names)
    let warmDrift = 0;
    for (const [en, wantFa] of LIVE_SET) {
      if (en === "Paris Saint-Germain" || en === "Paris Saint-Germain FC" || en === "PSG") continue; // override-owned
      if (translateTeam(en) !== wantFa) { warmDrift++; console.log("  warm DRIFT: " + JSON.stringify(en)); }
    }
    check("warm: no cold/warm drift on the live set (override-owned PSG excepted)", warmDrift === 0, warmDrift + " drifted");

    // ============ 3) reset returns to cold behavior ============
    await resetFaAiCache();
    check("reset: cache empty again", faAiCacheSize() === 0);
    check("reset: cold translation restored (Paris Saint-Germain FC -> dict)", translateTeam("Paris Saint-Germain FC") === "\u067E\u0627\u0631\u06CC \u0633\u0646 \u0698\u0631\u0645\u0646", translateTeam("Paris Saint-Germain FC"));

    // ============ 4) source wiring asserts (the concat is the deployed truth) ============
    // 4a) the bot webhook path loads the shared glossary BEFORE composing.
    const botSeg = src.slice(src.indexOf("// ===== src/bot.ts ====="), src.indexOf("// ===== src/cron-preflight.ts ====="));
    check("source: handleTelegramUpdate calls ensureFaAiCache (the v13.108 sync load)", /ensureFaAiCache\(env\)\.catch/.test(botSeg) && botSeg.indexOf("handleTelegramUpdate") >= 0);
    // 4b) translateTeam consults the normalized-dict map.
    const translateSeg = src.slice(src.indexOf("// ===== src/translate.ts ====="), src.indexOf("// ===== src/fa-ai.ts ====="));
    check("source: translateTeam consults FA_TEAMS_NORM.get (normalized dict layer)", /FA_TEAMS_NORM\.get\(key\)/.test(translateSeg));
    // 4c) overrides are ranked above the dict; learned are not.
    check("source: override keys tracked (FA_AI_OVERRIDE_KEYS.has)", /FA_AI_OVERRIDE_KEYS\.has\(key\)/.test(translateSeg));
    check("source: override set built in ensureFaAiCache", /FA_AI_OVERRIDE_KEYS\.add\(k\)/.test(translateSeg));
    // 4d) the norm layer runs BEFORE the learned cache (precedence order).
    const normIdx = translateSeg.indexOf("FA_TEAMS_NORM.get(key)");
    const learnedIdx = translateSeg.indexOf("const aiHit = FA_AI_CACHE.get(key)");
    check("source: norm-dict layer precedes the AI-learned cache", normIdx >= 0 && learnedIdx > normIdx);
    // 4e) reset clears the override set too.
    check("source: resetFaAiCache clears FA_AI_OVERRIDE_KEYS", /FA_AI_OVERRIDE_KEYS = null/.test(translateSeg));
    // 4f) the website builder still loads the glossary (unchanged surface).
    const pubSeg = src.slice(src.indexOf("// ===== src/public-matches.ts ====="), src.indexOf("// ===== src/bot-ui.ts ====="));
    check("source: public-matches builder still calls ensureFaAiCache (website side)", /ensureFaAiCache\(env\)/.test(pubSeg));
    // 4g) the UCL league-stage label carries the SAME Persian value on both
    // surfaces (bot STAGE_FA / website ROUND_FA) — the label sibling of the
    // glossary-sync contract (v13.108 follow-up: the new UCL format's
    // LEAGUE_STAGE rendered English on BOTH surfaces before this).
    const tablesSeg = src.slice(src.indexOf("// ===== src/tables.ts ====="), src.indexOf("// ===== src/grounds.ts ====="));
    const leagueStageFa = /"LEAGUE_STAGE":\s*"((?:[^"\\]|\\.)*)"/.exec(tablesSeg);
    const leagueStageRoundFa = /"LEAGUE_STAGE":\s*"((?:[^"\\]|\\.)*)"/.exec(pubSeg);
    // decode both (tables.ts writes \u escapes, public-matches.ts raw Persian)
    const decode = (s) => { try { return JSON.parse('"' + s + '"'); } catch (e) { return s; } };
    check("source: LEAGUE_STAGE mapped in the bot's STAGE_FA", !!leagueStageFa);
    check("source: LEAGUE_STAGE mapped in the website's ROUND_FA", !!leagueStageRoundFa);
    check("source: LEAGUE_STAGE value identical on both surfaces", !!leagueStageFa && !!leagueStageRoundFa && decode(leagueStageFa[1]) === decode(leagueStageRoundFa[1]), leagueStageFa && leagueStageRoundFa ? decode(leagueStageFa[1]) + " vs " + decode(leagueStageRoundFa[1]) : "missing");
    // 4h) behavioral: the Farsi featured card renders the Persian stage label
    // for a LEAGUE_STAGE match (was italic English "_LEAGUE STAGE_").
    const stageCard = formatBigMatchMessage({
      homeTeam: { name: "Paris Saint-Germain FC" },
      awayTeam: { name: "FC Barcelona" },
      competition: { code: "CL" },
      utcDate: "2026-10-20T19:00:00Z",
      stage: "LEAGUE_STAGE"
    }, { STATE: { get: async () => null } }, "fa");
    check("behavioral: featured card stage label is Persian for LEAGUE_STAGE", stageCard.indexOf("\u0645\u0631\u062D\u0644\u0647 \u0644\u06CC\u06AF") >= 0 && !/LEAGUE ?STAGE/.test(stageCard), stageCard.replace(/\n/g, " | "));
  } finally {
    h.restore();
  }

  console.log(failed ? `\n${failed} FAIL` : "\nAll fasync checks passed");
  process.exit(failed ? 1 : 0);
})();
