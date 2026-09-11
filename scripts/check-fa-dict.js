// Self-check: every top-division team for supported leagues must translate to Persian.
// Extracts FA_TEAMS + normTeamKey from worker source (single source of truth), then
// runs the same lookup logic (exact, then normalized) against full 2025-26 rosters
// plus known provider name variants (football-data vs TheSportsDB).
const fs = require("fs");
const src = fs.readFileSync("src/worker.ts", "utf8");

const dictSrc = src.match(/const FA_TEAMS = (\{[\s\S]*?\n  \});/)[1];
const FA_TEAMS = eval("(" + dictSrc + ")");

const { normTeamKey } = require("../src/teams.js");

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
  "PL (20)": ["Arsenal FC", "Aston Villa FC", "AFC Bournemouth", "Brentford FC", "Brighton & Hove Albion FC",
    "Chelsea FC", "Crystal Palace FC", "Everton FC", "Fulham FC", "Liverpool FC",
    "Manchester City FC", "Manchester United FC", "Newcastle United FC", "Nottingham Forest FC",
    "Tottenham Hotspur FC", "West Ham United FC", "Wolverhampton Wanderers FC",
    "Leeds United FC", "Burnley FC", "Sheffield United FC"],
  "PD (20)": ["FC Barcelona", "Real Madrid CF", "Atlético Madrid", "Athletic Club", "Real Sociedad",
    "Real Betis", "Villarreal CF", "Sevilla FC", "Valencia CF", "Deportivo Alavés", "Getafe CF",
    "Girona FC", "CA Osasuna", "RC Celta de Vigo", "RCD Mallorca", "Rayo Vallecano",
    "Real Valladolid CF", "Leganés", "UD Las Palmas", "RCD Espanyol de Barcelona"],
  "SA (20)": ["Inter Milan", "AC Milan", "Juventus FC", "SSC Napoli", "AS Roma", "Lazio", "Atalanta BC",
    "Fiorentina", "Bologna FC 1909", "Torino FC", "Udinese Calcio", "Genoa CFC",
    "Parma Calcio 1913", "Como 1907", "US Lecce", "Cagliari Calcio", "Hellas Verona",
    "Pisa SC", "Sassuolo Calcio", "Empoli FC"],
  "BL1 (18)": ["FC Bayern München", "Borussia Dortmund", "RB Leipzig", "Bayer 04 Leverkusen",
    "Eintracht Frankfurt", "VfB Stuttgart", "SC Freiburg", "Borussia Mönchengladbach", "VfL Wolfsburg",
    "1. FC Union Berlin", "1. FC Heidenheim 1846", "FC Augsburg", "Holstein Kiel", "SV Werder Bremen",
    "VfL Bochum", "1. FSV Mainz 05", "FC St. Pauli", "Hamburger SV"],
  "FL1 (18)": ["Paris Saint-Germain", "Olympique de Marseille", "Olympique Lyonnais", "Lille OSC", "OGC Nice",
    "AS Monaco", "Stade Rennais FC", "RC Lens", "Toulouse FC", "Montpellier HSC", "FC Nantes",
    "RC Strasbourg Alsace", "Stade de Reims", "AJ Auxerre", "Angers SCO", "Stade Brestois 29",
    "Le Havre AC", "FC Metz"],
  "extras (promoted/variants)": ["Coventry City FC", "Hull City AFC", "Levante UD", "SD Huesca", "UD Almería",
    "AC Monza", "Venezia FC", "Spezia Calcio", "US Cremonese", "1. FC Köln", "Hannover 96",
    "Bayern Munich", "Bayer Leverkusen", "Athletic Bilbao", "Manchester City", "Chelsea",
    "Arsenal", "Real Madrid", "Barcelona", "Juventus", "Napoli", "Inter", "Milan", "Roma",
    "PSG", "Paris Saint Germain", "Atletico Madrid"],
  "UCL history (20-season participants)": ["Málaga CF", "FC Schalke 04", "TSG Hoffenheim",
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
const VARIANTS = ["Kobenhavn", "Malmo", "Malmö", "Basaksehir",
  "Red Star Belgrade", "Crvena Zvezda", "Young Boys", "Benfica", "Anderlecht",
  "Beşiktaş JK", "Beşiktaş", "Besiktas", "Dinamo Zagreb", "Partizan", "Sturm Graz",
  "Maribor", "FC København", "København", "Copenhagen", "FC Copenhagen",
  "Red Bull Salzburg", "Salzburg", "Royal Antwerp", "Antwerp", "Ludogorets",
  "Ferencváros", "Ferencvaros", "Ferencvárosi", "TSG 1899 Hoffenheim", "1899 Hoffenheim",
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
  "Anorthosis Famagusta", "Malmö FF"];

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