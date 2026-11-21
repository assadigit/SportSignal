// Self-check: every top-division team for supported leagues must translate to Persian.
// Extracts FA_TEAMS + normTeamKey from worker source (single source of truth), then
// runs the same lookup logic (exact, then normalized) against full rosters
// plus known provider name variants (football-data vs TheSportsDB).
//
// v13.277-clubdata (2026-11-21): rosters refreshed to the VERIFIED 2026-27
// season (FD API currentSeason + Wikipedia season articles; evidence in
// docs/audits/club-translation-data/) and extended to the FULL spec scope:
// England PL/Championship/League One, Italy Serie A/B, Germany BL1/BL2,
// France Ligue 1, Spain LaLiga/LaLiga 2 + the UCL 30-season historical
// layer's active clubs. See also scripts/check-club-coverage.js (the
// stadium + roster-completeness gate for the same dataset).
const fs = require("fs");
const src = require("./lib/worker-src")();

const dictSrc = src.match(/const FA_TEAMS = (\{[\s\S]*?\n  \});/)[1];
const FA_TEAMS = eval("(" + dictSrc + ")");

const { normTeamKey } = require("../src/teams.ts");

function lookup(name) {
  if (FA_TEAMS[name]) return FA_TEAMS[name];
  const key = normTeamKey(name);
  if (!key) return name;
  for (const [en, fa] of Object.entries(FA_TEAMS)) {
    if (normTeamKey(en) === key) return fa;
  }
  return name;
}

const ROSTERS = {
  "PL 2026-27 (20)": ["Arsenal FC", "Brighton & Hove Albion FC", "Manchester City FC", "AFC Bournemouth", "Liverpool FC", "Leeds United FC", "Everton FC", "Chelsea FC", "Tottenham Hotspur FC", "Brentford FC", "Aston Villa FC", "Newcastle United FC", "Coventry City FC", "Hull City AFC", "Fulham FC", "Ipswich Town FC", "Nottingham Forest FC", "Sunderland AFC", "Manchester United FC", "Crystal Palace FC"],
  "ELC 2026-27 (24)": ["Middlesbrough FC", "Stoke City FC", "Wolverhampton Wanderers FC", "Birmingham City FC", "West Bromwich Albion FC", "Southampton FC", "Queens Park Rangers FC", "Swansea City AFC", "Sheffield United FC", "West Ham United FC", "Norwich City FC", "Portsmouth FC", "Blackburn Rovers FC", "Cardiff City FC", "Wrexham AFC", "Millwall FC", "Bolton Wanderers FC", "Bristol City FC", "Charlton Athletic FC", "Lincoln City FC", "Watford FC", "Burnley FC", "Derby County FC", "Preston North End FC"],
  "EL1 2026-27 (24)": ["Barnsley FC", "Blackpool FC", "Bradford City AFC", "Burton Albion FC", "Cambridge United FC", "Doncaster Rovers FC", "Huddersfield Town AFC", "Leicester City FC", "Luton Town FC", "Mansfield Town FC", "Milton Keynes Dons FC", "Notts County FC", "Oxford United FC", "Peterborough United FC", "Plymouth Argyle FC", "Reading FC", "Sheffield Wednesday FC", "Stockport County FC", "Stevenage FC", "Wigan Athletic FC", "Wycombe Wanderers FC", "Bromley FC", "Leyton Orient FC", "AFC Wimbledon"],
  "SA 2026-27 (20)": ["SS Lazio", "AS Roma", "FC Internazionale Milano", "Como 1907", "AC Milan", "Frosinone Calcio", "Juventus FC", "Bologna FC 1909", "SSC Napoli", "Cagliari Calcio", "Torino FC", "Atalanta BC", "Genoa CFC", "US Lecce", "ACF Fiorentina", "Parma Calcio 1913", "US Sassuolo Calcio", "AC Monza", "Venezia FC", "Udinese Calcio"],
  "SB 2026-27 (20)": ["SS Arezzo", "Ascoli Calcio 1898 FC", "US Avellino 1912", "Benevento Calcio", "Carrarese Calcio 1908", "US Catanzaro 1929", "Cesena FC", "US Cremonese", "Empoli FC", "Hellas Verona FC", "SS Juve Stabia", "Mantova 1911", "Modena FC 2018", "Calcio Padova", "Palermo FC", "Pisa SC", "UC Sampdoria", "FC Südtirol", "LR Vicenza", "Virtus Entella"],
  "BL1 2026-27 (18)": ["Borussia Dortmund", "FC Bayern München", "SC Freiburg", "RB Leipzig", "Bayer 04 Leverkusen", "SV Werder Bremen", "Eintracht Frankfurt", "VfB Stuttgart", "SV 07 Elversberg", "TSG 1899 Hoffenheim", "Hamburger SV", "1. FSV Mainz 05", "1. FC Köln", "SC Paderborn 07", "FC Augsburg", "FC Schalke 04", "1. FC Union Berlin", "Borussia Mönchengladbach"],
  "BL2 2026-27 (18)": ["Hertha BSC", "Arminia Bielefeld", "VfL Bochum", "Eintracht Braunschweig", "FC Energie Cottbus", "SV Darmstadt 98", "Dynamo Dresden", "SpVgg Greuther Fürth", "Hannover 96", "1. FC Heidenheim", "1. FC Kaiserslautern", "Karlsruher SC", "Holstein Kiel", "1. FC Magdeburg", "1. FC Nürnberg", "VfL Osnabrück", "FC St. Pauli", "VfL Wolfsburg"],
  "FL1 2026-27 (18)": ["Paris Saint-Germain FC", "Lille OSC", "Paris FC", "Olympique de Marseille", "Olympique Lyonnais", "OGC Nice", "AS Monaco FC", "Stade Brestois 29", "Stade Rennais FC 1901", "FC Lorient", "Racing Club de Lens", "Toulouse FC", "RC Strasbourg Alsace", "ES Troyes AC", "AJ Auxerre", "Le Mans FC", "Angers SCO", "Le Havre AC"],
  "PD 2026-27 (20)": ["FC Barcelona", "Real Madrid CF", "Club Atlético de Madrid", "Real Betis Balompié", "Real Sociedad de Fútbol", "Sevilla FC", "Athletic Club", "Deportivo Alavés", "Villarreal CF", "RCD Espanyol de Barcelona", "RC Deportivo La Coruña", "RC Celta de Vigo", "Real Racing Club de Santander", "Rayo Vallecano de Madrid", "Getafe CF", "CA Osasuna", "Valencia CF", "Levante UD", "Elche CF", "Málaga CF"],
  "SD 2026-27 (22)": ["Albacete Balompié", "UD Almería", "FC Andorra", "Burgos CF", "Cádiz CF", "CD Castellón", "RC Celta Fortuna", "AD Ceuta FC", "Córdoba CF", "SD Eibar", "CD Eldense", "Girona FC", "Granada CF", "UD Las Palmas", "CD Leganés", "RCD Mallorca", "Real Oviedo", "Real Sociedad B", "CE Sabadell FC", "Sporting de Gijón", "CD Tenerife", "Real Valladolid"],
  "UCL 2026-27 league phase (36)": ["Paris Saint-Germain FC", "Real Madrid CF", "Arsenal FC", "Como 1907", "FC Barcelona", "Aston Villa FC", "Manchester City FC", "Liverpool FC", "Club Brugge KV", "Sporting Clube de Portugal", "Real Betis Balompié", "Borussia Dortmund", "FC Bayern München", "VfB Stuttgart", "FC Internazionale Milano", "LASK Linz", "Manchester United FC", "Galatasaray SK", "Fenerbahçe SK", "AS Roma", "FK Shakhtar Donetsk", "Viking FK", "Club Atlético de Madrid", "PSV", "FK Bodø/Glimt", "FC Porto", "SSC Napoli", "Villarreal CF", "PAE AEK", "RB Leipzig", "Sabah FK", "Feyenoord Rotterdam", "Racing Club de Lens", "SK Slavia Praha", "Lille OSC", "ŠK Slovan Bratislava"],
  "UCL 2025-26 league phase additions": ["Paphos FC", "Royale Union Saint-Gilloise", "PAE Olympiakos SFP", "Qarabağ Ağdam FK", "FC København", "AFC Ajax", "Eintracht Frankfurt"],
  "UCL history 1996-97 to 2004-05 (30-season window, active clubs)": ["FC Nantes", "SC Heerenveen", "Willem II", "Brøndby IF", "IFK Göteborg", "AIK Fotboll", "Helsingborgs IF", "Widzew Łódź", "Boavista FC", "1. FC Kaiserslautern", "Hertha BSC", "AC Sparta Prague", "SK Rapid Wien", "FK Austria Wien", "SK Sturm Graz", "Brøndby IF"],
  "extras (variants/aliases)": ["Bayern Munich", "Bayer Leverkusen", "Athletic Bilbao", "Manchester City", "Chelsea",
    "Arsenal", "Real Madrid", "Barcelona", "Juventus", "Napoli", "Inter", "Milan", "Roma",
    "PSG", "Paris Saint Germain", "Atletico Madrid", "Inter Milan",
    "Wrexham", "Bolton Wanderers", "Lincoln City", "Sampdoria", "Palermo", "Hertha Berlin", "Tenerife",
    "Eibar", "Granada", "Real Oviedo", "Sporting Gijón", "Bromley", "Leyton Orient", "Stevenage",
    "Blackpool", "Barnsley", "Notts County", "Plymouth Argyle", "Stockport County", "Wycombe Wanderers",
    "MK Dons", "Doncaster Rovers", "Burton Albion", "Cambridge United", "Huddersfield Town",
    "Ascoli", "Avellino", "Benevento", "Carrarese", "Catanzaro", "Cesena", "Juve Stabia", "Mantova",
    "Modena", "Padova", "Vicenza", "Elversberg", "Arminia Bielefeld", "Eintracht Braunschweig",
    "Energie Cottbus", "Dynamo Dresden", "Greuther Fürth", "Karlsruher SC", "Troyes", "Racing Santander",
    "Albacete", "Burgos", "Cadiz CF", "Castellón", "Celta Fortuna", "AD Ceuta", "Cordoba CF", "Eldense",
    "Boavista", "IFK Göteborg", "AIK", "Helsingborg", "Widzew Łódź", "Union Saint-Gilloise"],
  "UCL history (2005-06 to 2024-25 participants)": ["Málaga CF", "FC Schalke 04", "TSG Hoffenheim",
    "FC Girondins de Bordeaux", "Standard Liège", "KRC Genk", "KAA Gent", "AEK Athens",
    "PFC CSKA Moscow", "FC Zenit Saint Petersburg", "FC Spartak Moscow", "FC Lokomotiv Moscow",
    "FC Rubin Kazan", "FC Rostov", "FC Krasnodar", "SK Rapid Wien", "FK Austria Wien",
    "Grasshopper Club Zürich", "FC Thun", "AaB Aalborg", "FC Nordsjælland", "Unirea Urziceni",
    "FC Oțelul Galați", "AEL Limassol", "Anorthosis Famagusta", "Rosenborg BK", "Molde FK",
    "Malmö FF", "Maccabi Haifa FC", "Maccabi Tel Aviv FC", "Lech Poznań", "ŠK Slovan Bratislava",
    "MŠK Žilina", "FK Artmedia Bratislava", "NK Olimpija Ljubljana", "Debreceni VSC",
    "FC BATE Borisov", "FC Sheriff Tiraspol", "Qarabağ FK", "FC Astana", "SC Braga",
    "İstanbul Başakşehir", "Bursaspor", "PFC CSKA Sofia", "PFC Levski Sofia"]
};

// Provider variants: bare short names / alternate spellings that arrive in live
// API payloads (football-data vs TheSportsDB vs common feeds). Each must resolve
// to a Farsi name, not fall through as the English string.
// v13.108-fasync: + the LIVE legal-name forms observed in the production match
// pool / UCL feed (they previously translated only via the AI-learned KV
// glossary — the bot's cold isolates rendered them in ENGLISH while the
// cache-loaded website showed Persian; now baked into the dict + resolvable
// through the normalized-key layer of translateTeam).
const VARIANTS = ["Kobenhavn", "Malmo", "Malmö", "Basaksehir",
  "Red Star Belgrade", "Crvena Zvezda", "Young Boys", "Benfica", "Anderlecht",
  "Beşiktaş JK", "Beşiktaş", "Besiktas", "Dinamo Zagreb", "Partizan", "Sturm Graz",
  "Maribor", "FC København", "København", "Copenhagen", "FC Copenhagen",
  "Red Bull Salzburg", "Salzburg", "Royal Antwerp", "Antwerp", "Ludogorets",
  "Ferencváros", "Ferencvaros", "Ferencvárosi", "TSG 1899 Hoffenheim", "1899 Hoffenheim",
  "Frosinone Calcio", "Frosinone",
  "Dynamo Kyiv", "Dynamo Kiev", "Shakhtar Donetsk", "Shakhtar", "Galatasaray SK", "PAOK",
  "Olympiacos", "FC Basel", "Basel", "FC Zürich", "Zürich", "Porto", "FC Porto",
  "Sporting Lisbon", "Sporting Lisboa", "Ajax Amsterdam", "AFC Ajax", "FK Partizan",
  "GNK Dinamo Zagreb", "SK Sturm Graz", "NK Maribor", "BSC Young Boys", "SL Benfica",
  "RSC Anderlecht", "Royal Antwerp FC", "FC Red Bull Salzburg", "FC Shakhtar Donetsk",
  "FC Dynamo Kyiv", "TSG Hoffenheim", "Ferencvárosi TC", "Ludogorets Razgrad",
  "FK Crvena zvezda", "PFC CSKA Moscow", "FC Spartak Moscow", "FC Zenit Saint Petersburg",
  "FC Lokomotiv Moscow", "Lokomotiv Moscow", "CSKA Moscow", "Spartak Moscow",
  "FC Rubin Kazan", "Rubin Kazan", "FC Rostov", "Rostov", "FC Krasnodar", "Krasnodar",
  "SK Rapid Wien", "Rapid Wien", "FK Austria Wien", "Grasshopper", "Aalborg BK",
  "FC Nordsjælland", "FC Unirea Urziceni", "Oțelul Galați", "AEL Limassol",
  "Anorthosis Famagusta", "Malmö FF",
  // v13.108-fasync — live-feed legal names (the cold-bot English leaks):
  "Paris Saint-Germain FC", "Sporting Clube de Portugal", "FK Bodø/Glimt",
  "LASK Linz", "SK Slavia Praha", "FC Kairat Almaty", "Viking FK", "Sabah FK",
  "PAE AEK", "FC Lorient", "Le Mans FC", "RC Deportivo La Coruña", "Magdeburg",
  "Cuarte", "SG Sonnenhof Grossaspach", "Gol Gohar FC", "FK Shakhtar Donetsk",
  "SS Lazio", "ACF Fiorentina", "Real Betis Balompié", "US Sassuolo Calcio",
  "Racing Club de Lens", "Feyenoord Rotterdam", "Como", "Cremonese", "Esteghlal Tehran"];

let failed = 0;
for (const t of VARIANTS) {
  const fa = lookup(t);
  if (!fa || fa === t) {
    console.error(`FAIL [variant] ${t} -> ${fa}`);
    failed++;
  }
}

let checked = Object.values(ROSTERS).flat().length + VARIANTS.length;
for (const [league, teams] of Object.entries(ROSTERS)) {
  for (const t of teams) {
    const fa = lookup(t);
    if (!fa || fa === t) {
      console.error(`FAIL [${league}] ${t} -> ${fa}`);
      failed++;
    }
  }
}
console.log(`Checked ${checked} names, ${failed} failures`);
process.exit(failed ? 1 : 0);