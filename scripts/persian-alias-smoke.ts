// persian-alias-smoke.ts — the local behavioral smoke for the Persian
// club-alias resolver (the s11/s17/s18/s19/s20 harness precedent; NOT in
// the npm test chain — the static+behavioral gates there cover the same
// laws; this harness exercises the REAL compiled module through tsx).
//
// Run: npx tsx scripts/persian-alias-smoke.ts
import { resolvePersianClubQuery, resolvePersianMatchupPair, normPersianQuery } from "../src/seo/persian-alias";

let pass = 0, fail = 0;
function ok(name: string, cond: boolean) {
  if (cond) { pass++; console.log("PASS  " + name); }
  else { fail++; console.log("FAIL  " + name); }
}

// --- the spec's own example queries (PERSIAN-CLUB-ALIAS-SEO-SPEC intro) ---
ok("«بارسلونا» → barcelona", resolvePersianClubQuery("بارسلونا")?.clubId === "barcelona");
ok("«بارسا» → barcelona", resolvePersianClubQuery("بارسا")?.clubId === "barcelona");
ok("«رئال مادرید» → realmadrid", resolvePersianClubQuery("رئال مادرید")?.clubId === "realmadrid");
ok("«رئال» → realmadrid", resolvePersianClubQuery("رئال")?.clubId === "realmadrid");
ok("«منچسترسیتی» → manchestercity", resolvePersianClubQuery("منچسترسیتی")?.clubId === "manchestercity");
ok("«منچستر سیتی» → manchestercity", resolvePersianClubQuery("منچستر سیتی")?.clubId === "manchestercity");
ok("«من سیتی» → manchestercity", resolvePersianClubQuery("من سیتی")?.clubId === "manchestercity");
ok("«بایرن مونیخ» → bayernmunich", resolvePersianClubQuery("بایرن مونیخ")?.clubId === "bayernmunich");
ok("«بایرن» → bayernmunich", resolvePersianClubQuery("بایرن")?.clubId === "bayernmunich");
ok("«بازی بعدی بارسا» → barcelona (natural-language next-match)", resolvePersianClubQuery("بازی بعدی بارسا")?.clubId === "barcelona");
ok("«ساعت بازی بارسلونا امشب» → barcelona (kickoff intent)", resolvePersianClubQuery("ساعت بازی بارسلونا امشب")?.clubId === "barcelona");
ok("«نتیجه بازی رئال مادرید» → realmadrid (result intent — the page answers from verified data)", resolvePersianClubQuery("نتیجه بازی رئال مادرید")?.clubId === "realmadrid");

// --- ambiguity (spec §7.3) ---
ok("«اینتر» alone → null", resolvePersianClubQuery("اینتر") === null);
ok("«میلان» alone → null", resolvePersianClubQuery("میلان") === null);
ok("«منچستر» alone → null", resolvePersianClubQuery("منچستر") === null);
ok("«پاریس» alone → null", resolvePersianClubQuery("پاریس") === null);
ok("«اتلتیکو» alone → null", resolvePersianClubQuery("اتلتیکو") === null);
ok("«بازی بعدی اینتر در لیگ قهرمانان اروپا» → intermilan (European-only UCL phrase unlocks)", resolvePersianClubQuery("بازی بعدی اینتر در لیگ قهرمانان اروپا")?.clubId === "intermilan");
ok("«بازی بعدی اینتر میامی» → null (Inter Miami is NOT a covered selected club)", resolvePersianClubQuery("بازی بعدی اینتر میامی") === null);

// --- matchup (spec §5.5 — resolves the PAIR; the fixture itself comes from the real pool) ---
const pair = resolvePersianMatchupPair("بازی بارسا با بایرن");
ok("«بازی بارسا با بایرن» pair = barcelona+bayernmunich", !!pair && pair.home.clubId === "barcelona" && pair.away.clubId === "bayernmunich");
const pair2 = resolvePersianMatchupPair("بازی رئال و منچسترسیتی کی است؟");
ok("«بازی رئال و منچسترسیتی کی است؟» pair = realmadrid+manchestercity", !!pair2 && pair2.home.clubId === "realmadrid" && pair2.away.clubId === "manchestercity");

// --- normalization (spec §8) ---
ok("ZWNJ fold: «رئال‌مادرید» → «رئال مادرید»", normPersianQuery("رئال\u200Cمادرید") === "رئال مادرید");
const arabicYeh = "لیورپول".replace(/\u06CC/g, "\u064A");
ok("Arabic yeh fold", normPersianQuery(arabicYeh) === "لیورپول");
ok("«بارسلونا ۲۰۲۶» digit fold + resolution", resolvePersianClubQuery("بارسلونا ۲۰۲۶")?.clubId === "barcelona");

// --- the canonical URL law (spec §7.1: one club one destination) ---
ok("«بارسا» resolves to /teams/barcelona (the EXISTING canonical URL)", resolvePersianClubQuery("بارسا")?.url === "/teams/barcelona");
ok("«من سیتی» resolves to /teams/manchester-city", resolvePersianClubQuery("من سیتی")?.url === "/teams/manchester-city");
ok("«اینترمیلان» resolves to /teams/internazionale-milano (the provider-derived live slug)", resolvePersianClubQuery("اینترمیلان")?.url === "/teams/internazionale-milano");

console.log(`\npersian-alias-smoke: ${pass}/${pass + fail}`);
if (fail > 0) process.exit(1);
