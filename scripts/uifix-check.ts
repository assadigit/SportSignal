// Quick verification of the v14.0.1-uifix markup changes (not shipped).
import { mrowHtml, spotItemHtml } from "../src/seo/markup";

const mk = (over = {}) => ({
  s: Object.assign({
    id: 1,
    homeTeam: { name: "Arsenal FC", faName: "آرسنال", crest: "https://x/57.png" },
    awayTeam: { name: "Lille OSC", faName: "لیل", crest: "https://x/521.png" },
    utcDate: "2026-10-13T19:00:00Z",
    competition: { code: "CL", faName: "لیگ قهرمانان اروپا" },
    status: "TIMED",
    round: "LEAGUE_STAGE",
    roundFa: null,
    minute: null,
    derby: false, rivalry: null, rivalryFa: null,
    venue: null, venueFa: null, score: null, top: false,
  }, over),
});

let fail = 0;
const check = (name: string, cond: boolean) => { console.log((cond ? "PASS " : "FAIL ") + name); if (!cond) fail++; };

// 1. spotitem with raw round data → NO roundchip at all
const sp = spotItemHtml(mk(), 0, { noComp: true });
check("spotitem has no roundchip", !sp.includes("roundchip"));
check("spotitem has no LEAGUE_STAGE", !sp.includes("LEAGUE_STAGE"));

// 2. spotitem in liveCard → no livechip
const spLive = spotItemHtml(mk({ status: "IN_PLAY", score: { home: 1, away: 1 }, minute: 33 }), 0, { finished: true, isLiveCard: true });
check("liveCard spotitem has no livechip", !spLive.includes("livechip"));
check("liveCard spotitem has lmin", spLive.includes("lmin"));

// 3. spotitem NOT in liveCard but live → livechip present (hero/topspot/week)
const spLive2 = spotItemHtml(mk({ status: "IN_PLAY", score: { home: 1, away: 1 } }), 0, {});
check("week/hero live spotitem KEEPS livechip", spLive2.includes("livechip"));

// 4. mrow (list row) → date text present, roundFa-only chip
const mr = mrowHtml(mk({ status: "FINISHED", score: { home: 2, away: 1 } }), 0, true);
check("mrow includes date text", mr.includes("ساعت") && mr.includes("مهر"));
check("mrow has no raw round", !mr.includes("LEAGUE_STAGE"));

// 5. mrow with roundFa → chip present
const mr2 = mrowHtml(mk({ status: "FINISHED", score: { home: 0, away: 0 }, roundFa: "هفته ۶" }), 0, true);
check("mrow with roundFa shows chip", mr2.includes("هفته ۶"));

// 6. title attributes on team names
check("team names carry title attr", sp.includes('title="آرسنال"'));

// 7. h1 markup — verify router change compiles + produces sr-only (manual check in deploy step)
console.log(fail === 0 ? "\nALL MARKUP CHECKS PASS" : "\n" + fail + " FAILURES");
process.exit(fail === 0 ? 0 : 1);
