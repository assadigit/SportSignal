// Phase 3 F-C1 local render harness — renders buildHomePage with a fixture
// payload (Real Madrid vs FC Barcelona — both teams have HERO_ART coverage)
// and verifies the SSR reveal output. Run: node --experimental-strip-types scripts/phase3-render-check.ts
import { buildHomePage } from "../src/seo/router.ts";
import { HERO_COVERAGE_RAW } from "../src/hero-coverage.ts";

const mk = (home: string, away: string, code = "PD", daysAhead = 3) => ({
  homeTeam: { name: home, faName: home, crest: "https://crests.football-data.org/86.png" },
  awayTeam: { name: away, faName: away, crest: "https://crests.football-data.org/65.png" },
  utcDate: new Date(Date.now() + daysAhead * 864e5).toISOString(),
  competition: { code, faName: "لالیگا", emblem: null },
  status: "TIMED",
  big: true,
  pair: true,
  venue: "Santiago Bernabéu",
});

const payload = {
  heroMatches: [mk("Real Madrid CF", "FC Barcelona")],
  upcoming: [mk("Real Madrid CF", "FC Barcelona"), mk("Arsenal FC", "Chelsea FC", "PL", 4)],
  finished: [],
  topSpot: { matches: [mk("Arsenal FC", "Chelsea FC", "PL", 4)] },
  thisWeek: [],
  ucl: { matches: [] },
  standings: { PL: { code: "PL", name: "Premier League", faName: "لیگ برتر", emblem: "/emblems/pl.webp", teams: [] } },
  cups: [],
  fetchedAt: new Date().toISOString(),
};

const ctx: any = { payload, fetchedAt: payload.fetchedAt, env: null };
async function main() {
const html = await buildHomePage(ctx, false);

const checks: [string, boolean][] = [
  ["mc-clean class on anchor", /<a class="hero-mcard mc-clean" id="heroMCard" href="#" dir="ltr">/.test(html)],
  ["scene-4 preload (fetchpriority, media-scoped)", /<link rel="preload" href="\/ui\/mc\/scene-4-2\.webp" as="image" media="\(max-width:899px\)" fetchpriority="high">/.test(html)],
  ["SSR home portrait", /<div class="mc-port mc-port-h"><img src="\/players\/hero\/kylian-mbappe\.webp" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"><\/div>/.test(html)],
  ["SSR away portrait", /<div class="mc-port mc-port-a"><img src="\/players\/hero\/lamine-yamal\.webp" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"><\/div>/.test(html)],
  ["hero card unhidden", /<a class="hero-card" id="bigHeroCard" href="#">/.test(html)],
  ["mcHint unhidden", /<a class="mc-hint" id="mcHint" href="#topspotCard">/.test(html)],
  ["standings emblem local", /<img src="\/emblems\/pl\.webp"/.test(html)],
  ["hud-2 + lazy", /<img class="card-hud" src="\/ui\/sportsignal-pc-match-hud-2\.webp"[^>]*loading="lazy"/.test(html)],
  ["stadium-lights-2", /<img class="bg-lights" src="\/ui\/stadium-lights-2\.webp"/.test(html)],
  ["stylesheet 13.80", /\/public-13\.80\.css/.test(html)],
  ["no scene-2 preload (covered hero)", !/scene-2\.webp" as="image/.test(html)],
  ["no api-sports emblems", !/media\.api-sports\.io/.test(html)],
];
let fail = 0;
for (const [name, ok] of checks) {
  console.log((ok ? "OK  " : "FAIL") + "  " + name);
  if (!ok) fail++;
}

// ALSO test the uncovered-hero path (PGL teams — no HERO_ART coverage → scene-2, no portraits)
const payload2 = JSON.parse(JSON.stringify(payload));
payload2.heroMatches = [mk("Esteghlal Tehran", "Persepolis", "PGL", 2)];
payload2.upcoming = payload2.heroMatches;
payload2.fetchedAt = new Date().toISOString();
const html2 = await buildHomePage({ ...ctx, payload: payload2, fetchedAt: payload2.fetchedAt }, false);
const checks2: [string, boolean][] = [
  ["uncovered: anchor WITHOUT mc-clean", /<a class="hero-mcard" id="heroMCard" href="#" dir="ltr">/.test(html2)],
  ["uncovered: scene-2 preload", /<link rel="preload" href="\/ui\/mc\/scene-2\.webp" as="image" media="\(max-width:899px\)" fetchpriority="high">/.test(html2)],
  ["uncovered: empty ports (ghost-figure fallback)", /<div class="mc-port mc-port-h"><\/div>/.test(html2) && /<div class="mc-port mc-port-a"><\/div>/.test(html2)],
];
for (const [name, ok] of checks2) {
  console.log((ok ? "OK  " : "FAIL") + "  " + name);
  if (!ok) fail++;
}

// sanity: coverage data actually contains both teams
console.log("coverage has Real Madrid:", HERO_COVERAGE_RAW.wired.some((w: any) => w.name === "Real Madrid CF"));
console.log("coverage has Barcelona:", HERO_COVERAGE_RAW.wired.some((w: any) => w.name === "FC Barcelona"));
process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error("CRASH", e); process.exit(1); });
