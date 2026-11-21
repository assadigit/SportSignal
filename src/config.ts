// SportSignal — central configuration & static data tables.
// KV keys and semantics are LIVE-STATE contracts — never rename casually.

// v13.275.0-endigits (2026-11-19): the Peyda font-digit repair — the
// owner's EN-numerals directive ("In language EN of sportsignal the numerals
// are farsi. make sure the En version always has English and latin
// numerals"). ROOT CAUSE (measured, not guessed): the shipped Peyda webfont
// build maps the LATIN digit codepoints U+0030-0039 to Persian-Indic glyph
// outlines (glyph 'zero'..'nine' outlines are IDENTICAL to 'uni06F0'..
// 'uni06F9' in all six weights), so even when the app correctly puts Latin
// digits in the DOM (fmtNum() is EN-aware; the JS re-render swaps every SSR
// Persian-codepoint numeral for Latin codepoints on load) the browser paints
// Persian numerals in EN mode — countdown, kickoff times, standings, rank
// chips, Top-N badges, dates, the sync line. THE FIX: the six Peyda woff2
// files are patched IN PLACE (same filenames — the existence pins + preloads
// keep passing): the ten Latin digit glyphs now carry the true Latin outlines
// from Poppins (the site's own numerics font — the "Poppins Digits"
// unicode-range subset already pairs with Peyda on the hero card),
// weight-matched 400/500/600/700/800/900, natural proportional advances
// (Peyda's original digits were proportional too; a forced tabular advance
// made "114" read "1 14" in browser QA). The Persian digit codepoints
// U+06F0-06F9 stay byte-identical — FA rendering unchanged in shape. The
// documented Latin-island convention (the tzstamp «(تهران 3:30 GMT)» + the
// utcnote «18:00 UTC» + Latin team names like "Telstar 1963") now renders
// its Latin digits AS Latin — previously «Telstar 1963» displayed «۱۹۶۳»
// inside the Latin name via the remap. SW cache sportsignal-v126 -> v127
// (fonts are cache-first assets; the v13.39 rule — the bump strands the
// stale Persian-digit copies). NO JS/CSS bundle change (public-13.80.js +
// public-13.87.css stay); NO font filename change (the 7-day /fonts/*
// freshness policy + the SW bump carry the rollout).
// v13.274-persianalias (PERSIAN-CLUB-ALIAS-SEO, 2026-11-19): the Persian
// club-alias layer — the evidenced SEO_EXTRA_ALIASES extension (13-club
// GSC-observed alias dictionary riding the JSON-LD alternateName arrays
// ONLY) + the SEO-only query resolver (src/seo/persian-alias.ts — the
// ambiguity-guarded entity resolution, never wired into any request path).
// Freeze-safe: zero byte-frozen title/H1/description/answer bytes touched.
export const VERSION = "13.277.0-clubdata";

export const CONFIG: Record<string, any> = {
  API_URL: "https://api.football-data.org/v4/matches",
  API_RETRY_ATTEMPTS: 2,
  API_RETRY_DELAY: 1e3,
  LEAGUES: ["CL", "PL", "PD", "SA", "FL1", "BL1"],
  // v13.113-alquiet: leagues the BOT must never push — the owner's rule
  // (2026-10-17): "Do not notify Australia league in the robot." The rows
  // keep flowing into the pool (the WEBSITE keeps its A-League lists,
  // finished rows and standings boxes — shouldReport is untouched); every
  // BOT push surface checks this list first: the individual notification
  // tier (shouldNotify — covers the engine's cards, HT/postponement alerts
  // and the audit universe), the big-match kickoff/FT broadcasts, the
  // morning/week-ahead/night digests. An AL-following user keeps the site
  // and loses the push — the explicit product trade the owner asked for.
  BOT_SILENT_LEAGUES: ["AL"],
  // v13.273-dayhub (S20, DECISIONS S20-1/S20-2): the day-hub data universe
  // extension — 4 extra football-data FREE-tier competitions (Eredivisie /
  // Primeira Liga / EFL Championship / Brasileirão) appended ONLY to the FD
  // fetch URLs (provider-fd.ts fetchFootballData + providers.ts
  // fetchLongView), so /matches/today («بازی‌های امروز») and /matches/tomorrow
  // («بازی‌های فردا») list every senior club fixture of the day — BSA plays
  // THROUGH FIFA windows (the break-day filler), ELC fills midweek club days.
  // Same single batched FD call (verified live: all 10 comps accepted,
  // errorCode none) → +0 subrequests. CONFIG.LEAGUES stays UNTOUCHED: it is
  // live-mutable ADMIN state (applySettings overwrites it from the KV
  // settings blob, src/admin.ts:84) — the monitored-league/bot semantics
  // must not silently change (the audit §4 trap; check-s20-dayhubs.js
  // fails if these codes ever leak into CONFIG.LEAGUES). Rows from these
  // comps reach ONLY the time hubs + pool-backed match pages (the audit's
  // side-effect map: homepage//matches/sitemap/teams/bot all stay gated).
  FD_DAYVIEW_COMPS: ["DED", "PPL", "ELC", "BSA"],
  // v13.173-noal (owner): "Avoid Australian League and Games altogether,
  // currently shows melbourn city vs melbourne victory." The website now
  // hides every SITE_HIDDEN_LEAGUES row at ALL public read surfaces: the
  // hero pick + public payload (fetchPublicMatches — upcoming/live/
  // finished/topSpot/thisWeek/nextWeek/cups/UCL + the KV snapshot the
  // degraded path re-serves), every SEO page (getSeoCtx — /matches/*,
  // /teams/*, /competitions/*, sitemaps, feed.xml, calendar.ics,
  // matches.json, the homepage JSON-LD + meta description) and the og
  // card route. The rows keep flowing into the pool (matches_v13_tracked)
  // so the bot keeps its v13.113-alquiet rules and admin diagnostics stay
  // honest — but no visitor-facing surface can surface them again.
  SITE_HIDDEN_LEAGUES: ["AL"],
  // Season-dependent cup phase windows (review/update each August): EL/ECL are
  // in the qualifying phase until their league phase starts (late Sep); the FA
  // Cup's big clubs enter at the First Round Proper (~early Nov). sportscore's
  // fixture list exposes no round field, so cups are classified by calendar.
  CUP_PHASE_WINDOWS: { EURO_LL_START: "2026-09-28T00:00:00Z", FA_ROUND1: "2026-11-09T00:00:00Z" },
  BIG_TEAMS_BY_LEAGUE: {
    "PL": [
      "Arsenal FC",
      "Chelsea FC",
      "Manchester United FC",
      "Manchester City FC",
      "Liverpool FC"
    ],
    "PD": [
      "FC Barcelona",
      "Real Madrid CF",
      "Atl\xE9tico Madrid"
    ],
    "SA": [
      "Inter Milan",
      "AC Milan"
    ],
    "FL1": [
      "Paris Saint-Germain"
    ],
    // v12.15: ONE exact provider name per club. "Bayern Munich" (a
    // pre-12.x variant spelling) duplicated "FC Bayern M\u00FCnchen" in the
    // admin chips — the exact duplicate the user reported. Variant names
    // are now folded onto the catalog name by canonicalizeTeams() instead
    // of being stored side by side.
    "BL1": [
      "FC Bayern M\xFCnchen",
      "Borussia Dortmund"
    ],
    "AL": [
      "Melbourne Victory",
      "Melbourne City",
      "Sydney FC",
      "Adelaide United",
      "Western Sydney Wanderers"
    ],
    "EL": [
      "Arsenal FC",
      "Chelsea FC",
      "Manchester United FC",
      "Manchester City FC",
      "Liverpool FC",
      "FC Barcelona",
      "Real Madrid CF",
      "Atl\xE9tico Madrid",
      "Inter Milan",
      "AC Milan",
      "Paris Saint-Germain"
    ],
    "ECL": [
      "Arsenal FC",
      "Chelsea FC",
      "Manchester United FC",
      "Manchester City FC",
      "Liverpool FC",
      "FC Barcelona",
      "Real Madrid CF",
      "Atl\xE9tico Madrid",
      "Inter Milan",
      "AC Milan",
      "Paris Saint-Germain"
    ]
  },
  // v13.82-matchday: HOME-GROUND table for the followed clubs. For league
  // and group-stage fixtures the venue IS the home team's stadium — a
  // stable mapping no provider needs to confirm (FD's list endpoint returns
  // no venue at all; its detail endpoint returns null for regular matches —
  // verified 2026-10-13 on three CL fixtures). hydrateMatchVenue consults
  // this table BEFORE any FD detail call: followed-team match pages get
  // their venue instantly (zero subrequests), and the FD fetch only runs
  // for long-tail home teams. One-off NEUTRAL stages (FINAL / third-place;
  // roundRaw "Final" but never "semi"/"quarter") skip the table — the
  // administrative home team doesn't host there, and a real provider venue
  // (when one exists) always wins anyway. Persian names are the ones
  // Persian football media actually use (ورزشگاه امارات، سن سیرو، …).
  TEAM_STADIUMS: {
    "Arsenal FC": { en: "Emirates Stadium", fa: "ورزشگاه امارات" },
    "Chelsea FC": { en: "Stamford Bridge", fa: "ورزشگاه استمفورد بریج" },
    "Manchester United FC": { en: "Old Trafford", fa: "ورزشگاه اولد ترافورد" },
    "Manchester City FC": { en: "Etihad Stadium", fa: "ورزشگاه اتیهاد" },
    "Liverpool FC": { en: "Anfield", fa: "ورزشگاه آنفیلد" },
    "Tottenham Hotspur FC": { en: "Tottenham Hotspur Stadium", fa: "ورزشگاه تاتنهام" },
    "FC Barcelona": { en: "Camp Nou", fa: "ورزشگاه کمپ نو" },
    "Real Madrid CF": { en: "Santiago Bernab\u00E9u", fa: "ورزشگاه سانتیاگو برنابئو" },
    "Atl\xE9tico de Madrid": { en: "Riyadh Air Metropolitano", fa: "ورزشگاه متروپولیتانو" },
    // v13.86-groundsfix: providers disagree on the name form - FD sends
    // "Club Atl\xE9tico de Madrid" (normTeamKey folds the Club prefix onto
    // the key above), sportscore/TSP send the short form below. Two keys,
    // one ground.
    "Atl\xE9tico Madrid": { en: "Riyadh Air Metropolitano", fa: "ورزشگاه متروپولیتانو" },
    // v13.86-groundsfix: FD's form for Inter is "FC Internazionale Milano";
    // "Inter Milan" covers the sportscore/TSP form. Both key the same ground.
    "FC Internazionale Milano": { en: "San Siro", fa: "ورزشگاه سن سیرو" },
    "Inter Milan": { en: "San Siro", fa: "ورزشگاه سن سیرو" },
    "AC Milan": { en: "San Siro", fa: "ورزشگاه سن سیرو" },
    // v13.86-groundsfix: the followed Serie A clubs missing from the v13.85 table.
    "Juventus FC": { en: "Allianz Stadium", fa: "ورزشگاه آلیانز تورین" },
    "AS Roma": { en: "Stadio Olimpico", fa: "ورزشگاه المپیکو" },
    "Paris Saint-Germain": { en: "Parc des Princes", fa: "ورزشگاه پارک ده پرنس" },
    "FC Bayern M\xFCnchen": { en: "Allianz Arena", fa: "ورزشگاه آلیانز آرنا" },
    "Borussia Dortmund": { en: "Signal Iduna Park", fa: "ورزشگاه سیگنال ایدونا پارک" },
    "Melbourne Victory": { en: "AAMI Park", fa: "ورزشگاه آمی پارک" },
    "Melbourne City": { en: "AAMI Park", fa: "ورزشگاه آمی پارک" },
    "Sydney FC": { en: "Allianz Stadium Sydney", fa: "ورزشگاه آلیانز سیدنی" },
    "Adelaide United": { en: "Hindmarsh Stadium", fa: "ورزشگاه هیندمارش" },
    "Western Sydney Wanderers": { en: "CommBank Stadium", fa: "ورزشگاه کم\u200cبنک" },
    // v13.277-clubdata (2026-11-21): full current-coverage extension —
    // every 2026-27 in-scope club (PL/ELC/EL1, SA/SB, BL1/BL2, FL1, PD/SD)
    // + the UCL historical layer's active clubs. Sources: 2026-27 season
    // articles (stadium tables), club infoboxes, fa.wikipedia stadium
    // titles where they exist — every entry's evidence + confidence in
    // docs/audits/club-translation-data/clubdata-2026-27.json. Existing
    // entries above are preserved byte-for-byte (sponsor forms kept).
    "Wrexham AFC": { en: "Racecourse Ground", fa: "ورزشگاه ریس‌کورس" },
    "Bolton Wanderers FC": { en: "Toughsheet Community Stadium", fa: "ورزشگاه تاف‌شیت" },
    "Lincoln City FC": { en: "Sincil Bank", fa: "ورزشگاه سینسیل بانک" },
    "Barnsley FC": { en: "Oakwell", fa: "ورزشگاه اوک‌ول" },
    "Blackpool FC": { en: "Bloomfield Road", fa: "ورزشگاه بلومفیلد رود" },
    "Burton Albion FC": { en: "Pirelli Stadium", fa: "ورزشگاه پیرلی" },
    "Cambridge United FC": { en: "Cledara Abbey Stadium", fa: "ورزشگاه ابی" },
    "Doncaster Rovers FC": { en: "Eco-Power Stadium", fa: "ورزشگاه اکو پاور" },
    "Huddersfield Town AFC": { en: "Kirklees Stadium", fa: "ورزشگاه کرکلیس" },
    "Milton Keynes Dons FC": { en: "Stadium MK", fa: "ورزشگاه ام‌کی" },
    "Notts County FC": { en: "Meadow Lane", fa: "ورزشگاه میدو لین" },
    "Plymouth Argyle FC": { en: "Home Park", fa: "ورزشگاه هوم پارک" },
    "Stockport County FC": { en: "Edgeley Park", fa: "ورزشگاه اجلی پارک" },
    "Stevenage FC": { en: "Broadhall Way", fa: "ورزشگاه برادهال وی" },
    "Wycombe Wanderers FC": { en: "Adams Park", fa: "ورزشگاه آدامز پارک" },
    "Bromley FC": { en: "Hayes Lane", fa: "ورزشگاه هیز لین" },
    "Leyton Orient FC": { en: "Brisbane Road", fa: "ورزشگاه بریزبین رود" },
    "AFC Wimbledon": { en: "Plough Lane", fa: "ورزشگاه پلاو لین" },
    "SS Arezzo": { en: "Stadio Città di Arezzo", fa: "ورزشگاه شهر آرتزو" },
    "Ascoli Calcio 1898 FC": { en: "Stadio Cino e Lillo Del Duca", fa: "ورزشگاه دل دوکا" },
    "US Avellino 1912": { en: "Stadio Partenio-Adriano Lombardi", fa: "ورزشگاه پارتنیو" },
    "Benevento Calcio": { en: "Stadio Ciro Vigorito", fa: "ورزشگاه چیرو ویگوریتو" },
    "Carrarese Calcio 1908": { en: "Stadio dei Marmi", fa: "ورزشگاه دی مارمی" },
    "US Catanzaro 1929": { en: "Stadio Nicola Ceravolo", fa: "ورزشگاه نیکولا چراوولو" },
    "Cesena FC": { en: "Stadio Dino Manuzzi", fa: "ورزشگاه دینو مانوتسی" },
    "SS Juve Stabia": { en: "Stadio Romeo Menti", fa: "ورزشگاه رومئو مینتی" },
    "Mantova 1911": { en: "Stadio Danilo Martelli", fa: "ورزشگاه دانیلو مارتلی" },
    "Modena FC 2018": { en: "Stadio Alberto Braglia", fa: "ورزشگاه آلبرتو برالیا" },
    "Calcio Padova": { en: "Stadio Comunale Euganeo", fa: "ورزشگاه ائوگانئو" },
    "Palermo FC": { en: "Stadio Renzo Barbera", fa: "ورزشگاه رنزو باربرا" },
    "UC Sampdoria": { en: "Stadio Luigi Ferraris", fa: "ورزشگاه لوئیجی فراریس" },
    "FC Südtirol": { en: "Stadio Marco Druso", fa: "ورزشگاه مارکو دروزو" },
    "LR Vicenza": { en: "Stadio Romeo Menti", fa: "ورزشگاه رومئو مینتی" },
    "Virtus Entella": { en: "Stadio Comunale", fa: "ورزشگاه کیاواری" },
    "SV 07 Elversberg": { en: "Waldstadion an der Kaiserlinde", fa: "ورزشگاه والداشتادیون" },
    "Hertha BSC": { en: "Olympiastadion", fa: "ورزشگاه المپیک برلین" },
    "Arminia Bielefeld": { en: "Schüco-Arena", fa: "ورزشگاه شیکوآرنا" },
    "Eintracht Braunschweig": { en: "Eintracht-Stadion", fa: "ورزشگاه اینتراخت" },
    "FC Energie Cottbus": { en: "LEAG Energie Stadion", fa: "ورزشگاه لیگ انرژی" },
    "Dynamo Dresden": { en: "Rudolf-Harbig-Stadion", fa: "ورزشگاه رودلف هاربیگ" },
    "SpVgg Greuther Fürth": { en: "Sportpark Ronhof Thomas Sommer", fa: "ورزشگاه رون‌هوف" },
    "1. FC Kaiserslautern": { en: "Fritz-Walter-Stadion", fa: "ورزشگاه فریتس والتر" },
    "Karlsruher SC": { en: "BBBank Wildpark", fa: "ورزشگاه ویلدپارک" },
    "1. FC Nürnberg": { en: "Max-Morlock-Stadion", fa: "ورزشگاه ماکس مورلوک" },
    "VfL Osnabrück": { en: "Stadion an der Bremer Brücke", fa: "ورزشگاه برمر بریکه" },
    "ES Troyes AC": { en: "Stade de l'Aube", fa: "ورزشگاه لوب" },
    "Real Racing Club de Santander": { en: "Campos de Sport de El Sardinero", fa: "ورزشگاه ساردینرو" },
    "Albacete Balompié": { en: "Estadio Carlos Belmonte", fa: "ورزشگاه کارلوس بل‌مونته" },
    "FC Andorra": { en: "Nou Estadi Encamp", fa: "ورزشگاه انکمپ" },
    "Burgos CF": { en: "Estadio Municipal El Plantío", fa: "ورزشگاه ال پلانتیو" },
    "Cádiz CF": { en: "Estadio Nuevo Mirandilla", fa: "ورزشگاه نوئوو میراندیلا" },
    "CD Castellón": { en: "Estadio SkyFi Castàlia", fa: "ورزشگاه کاستالیا" },
    "RC Celta Fortuna": { en: "Estadio ABANCA Balaídos", fa: "ورزشگاه بالایدوس" },
    "AD Ceuta FC": { en: "Estadio Alfonso Murube", fa: "ورزشگاه آلفونسو موروبه" },
    "Córdoba CF": { en: "Estadio Nuevo Arcángel", fa: "ورزشگاه نوئوو آرکانخل" },
    "SD Eibar": { en: "Estadio Municipal de Ipurúa", fa: "ورزشگاه ایپوروآ" },
    "CD Eldense": { en: "Estadio Municipal Nuevo Pepico Amat", fa: "ورزشگاه پپیکو آمات" },
    "Granada CF": { en: "Estadio Nuevo Los Cármenes", fa: "ورزشگاه نوئوو لوس کارمنس" },
    "Real Oviedo": { en: "Estadio Carlos Tartiere", fa: "ورزشگاه کارلوس تارتی‌یره" },
    "Real Sociedad B": { en: "Zubieta", fa: "ورزشگاه زوبی‌یتا" },
    "CE Sabadell FC": { en: "Nova Creu Alta", fa: "ورزشگاه نوا کرو آلتا" },
    "Sporting de Gijón": { en: "El Molinón", fa: "ورزشگاه ال مولینون" },
    "CD Tenerife": { en: "Estadio Heliodoro Rodríguez López", fa: "ورزشگاه هلیودورو رودریگز لوپز" },
    undefined: { en: "Stade de la Beaujoire", fa: "ورزشگاه بوجوآر" },
    "SC Heerenveen": { en: "Abe Lenstra Stadion", fa: "ورزشگاه آبه لنسترا" },
    "Willem II": { en: "Koning Willem II Stadion", fa: "ورزشگاه کونینگ ویلم دوم" },
    "Brøndby IF": { en: "Brøndby Stadium", fa: "ورزشگاه بروندبی" },
    "IFK Göteborg": { en: "Gamla Ullevi", fa: "ورزشگاه گاملا اولوی" },
    "AIK Fotboll": { en: "Friends Arena", fa: "ورزشگاه فرندز آرنا" },
    "Helsingborgs IF": { en: "Olympia", fa: "ورزشگاه المپیا هلسینگبور" },
    "Widzew Łódź": { en: "Widzew Łódź Stadium", fa: "ورزشگاه ویدزف" },
    "Boavista FC": { en: "Estádio do Bessa", fa: "ورزشگاه دو بسا" },
    "Paphos FC": { en: "Stelios Kyriakides Stadium", fa: "ورزشگاه استلیوس کیریاکیدیس" },
    "Royale Union Saint-Gilloise": { en: "Joseph Marien Stadium", fa: "ورزشگاه ژوزف مارین" },
    "Aston Villa FC": { en: "Villa Park", fa: "ورزشگاه ویلا پارک" },
    "AFC Bournemouth": { en: "Vitality Stadium", fa: "ورزشگاه وایتالیتی" },
    "Brentford FC": { en: "Gtech Community Stadium", fa: "ورزشگاه جی‌تک" },
    "Brighton & Hove Albion FC": { en: "American Express Stadium", fa: "ورزشگاه آمکس" },
    "Crystal Palace FC": { en: "Selhurst Park", fa: "ورزشگاه سلهارست پارک" },
    "Everton FC": { en: "Hill Dickinson Stadium", fa: "ورزشگاه هیل دیکینسون" },
    "Fulham FC": { en: "Craven Cottage", fa: "ورزشگاه کریون کاتج" },
    "Hull City AFC": { en: "MKM Stadium", fa: "ورزشگاه ام‌کی‌ام" },
    "Ipswich Town FC": { en: "Portman Road", fa: "ورزشگاه پورتمن رود" },
    "Leeds United FC": { en: "Elland Road", fa: "ورزشگاه الاند رود" },
    "Newcastle United FC": { en: "St James' Park", fa: "ورزشگاه سنت جیمز پارک" },
    "Nottingham Forest FC": { en: "City Ground", fa: "ورزشگاه سیتی گراوند" },
    "Sunderland AFC": { en: "Stadium of Light", fa: "ورزشگاه آو لایت" },
    "Coventry City FC": { en: "Coventry Building Society Arena", fa: "ورزشگاه سی‌بی‌اس آرنا" },
    "Middlesbrough FC": { en: "Riverside Stadium", fa: "ورزشگاه ریورساید" },
    "Stoke City FC": { en: "bet365 Stadium", fa: "ورزشگاه بت ۳۶۵" },
    "Wolverhampton Wanderers FC": { en: "Molineux Stadium", fa: "ورزشگاه مولینو" },
    "Birmingham City FC": { en: "St Andrew's", fa: "ورزشگاه سنت اندروز" },
    "West Bromwich Albion FC": { en: "The Hawthorns", fa: "ورزشگاه هاوتورنز" },
    "Southampton FC": { en: "St Mary's Stadium", fa: "ورزشگاه سنت مری" },
    "Queens Park Rangers FC": { en: "Loftus Road", fa: "ورزشگاه لافت رود" },
    "Swansea City AFC": { en: "Swansea.com Stadium", fa: "ورزشگاه سوانسی کام" },
    "Sheffield United FC": { en: "Bramall Lane", fa: "ورزشگاه برامال لین" },
    "West Ham United FC": { en: "London Stadium", fa: "ورزشگاه المپیک لندن" },
    "Norwich City FC": { en: "Carrow Road", fa: "ورزشگاه کارو رود" },
    "Portsmouth FC": { en: "Fratton Park", fa: "ورزشگاه فراتون پارک" },
    "Blackburn Rovers FC": { en: "Ewood Park", fa: "ورزشگاه ایوود پارک" },
    "Cardiff City FC": { en: "Cardiff City Stadium", fa: "ورزشگاه کاردیف سیتی" },
    "Millwall FC": { en: "The Den", fa: "ورزشگاه دن" },
    "Bristol City FC": { en: "Ashton Gate", fa: "ورزشگاه اشتون گیت" },
    "Charlton Athletic FC": { en: "The Valley", fa: "ورزشگاه ولی" },
    "Watford FC": { en: "Vicarage Road", fa: "ورزشگاه ویکاریج رود" },
    "Burnley FC": { en: "Turf Moor", fa: "ورزشگاه ترف مور" },
    "Derby County FC": { en: "Pride Park Stadium", fa: "ورزشگاه پراید پارک" },
    "Preston North End FC": { en: "Deepdale", fa: "ورزشگاه دیپدایل" },
    "Bradford City AFC": { en: "Valley Parade", fa: "ورزشگاه ولی پارید" },
    "Leicester City FC": { en: "King Power Stadium", fa: "ورزشگاه کینگ‌پاور" },
    "Luton Town FC": { en: "Kenilworth Road", fa: "ورزشگاه کنیلوورث رود" },
    "Mansfield Town FC": { en: "Field Mill", fa: "ورزشگاه فیلد میل" },
    "Oxford United FC": { en: "Kassam Stadium", fa: "ورزشگاه کسام" },
    "Peterborough United FC": { en: "London Road Stadium", fa: "ورزشگاه لندن رود" },
    "Reading FC": { en: "Madejski Stadium", fa: "ورزشگاه مادیسکی" },
    "Sheffield Wednesday FC": { en: "Hillsborough Stadium", fa: "ورزشگاه هیلزبورو" },
    "Wigan Athletic FC": { en: "Brick Community Stadium", fa: "ورزشگاه بریک کامونیتی" },
    "SS Lazio": { en: "Stadio Olimpico", fa: "ورزشگاه المپیکو" },
    "Como 1907": { en: "Stadio Giuseppe Sinigaglia", fa: "ورزشگاه جوزپه سینیگالیا" },
    "Frosinone Calcio": { en: "Stadio Benito Stirpe", fa: "ورزشگاه بنیتو استیرپه" },
    "Bologna FC 1909": { en: "Stadio Renato Dall'Ara", fa: "ورزشگاه رناتو دال‌آرا" },
    "SSC Napoli": { en: "Stadio Diego Armando Maradona", fa: "ورزشگاه دیگو آرماندو مارادونا" },
    "Cagliari Calcio": { en: "Unipol Domus", fa: "ورزشگاه یونیپول دوموس" },
    "Torino FC": { en: "Stadio Olimpico Grande Torino", fa: "ورزشگاه المپیکو گرانده تورینو" },
    "Atalanta BC": { en: "New Balance Arena", fa: "ورزشگاه نیو بالانس آرنا" },
    "Genoa CFC": { en: "Stadio Luigi Ferraris", fa: "ورزشگاه لوئیجی فراریس" },
    "US Lecce": { en: "Stadio Via del mare", fa: "ورزشگاه ویا دل ماره" },
    "ACF Fiorentina": { en: "Stadio Artemio Franchi", fa: "ورزشگاه آرتمیو فرانکی" },
    "Parma Calcio 1913": { en: "Stadio Ennio Tardini", fa: "ورزشگاه انیو تاردینی" },
    "US Sassuolo Calcio": { en: "Mapei Stadium", fa: "ورزشگاه ماپی" },
    "AC Monza": { en: "Stadio Brianteo", fa: "ورزشگاه بریانته‌ئو" },
    "Venezia FC": { en: "Stadio Pier Luigi Penzo", fa: "ورزشگاه پیر لوییجی پنتزو" },
    "Udinese Calcio": { en: "Bluenergy Stadium", fa: "ورزشگاه بلوانرژی" },
    "Bayer 04 Leverkusen": { en: "BayArena", fa: "ورزشگاه بای‌آرنا" },
    "Eintracht Frankfurt": { en: "Deutsche Bank Park", fa: "ورزشگاه دویچه بانک پارک" },
    "VfB Stuttgart": { en: "MHPArena", fa: "ورزشگاه ام‌اچ‌پی آرنا" },
    "SC Freiburg": { en: "Europa-Park Stadion", fa: "ورزشگاه اروپا پارک" },
    "Borussia Mönchengladbach": { en: "Borussia-Park", fa: "ورزشگاه بروسیا پارک" },
    "SV Werder Bremen": { en: "Weserstadion", fa: "ورزشگاه وزراشتادیون" },
    "Hamburger SV": { en: "Volksparkstadion", fa: "ورزشگاه فولکسپارکشتادیون" },
    "RB Leipzig": { en: "Red Bull Arena (Leipzig)", fa: "ورزشگاه رد بول آرنا" },
    "1. FC Union Berlin": { en: "Stadion An der Alten Försterei", fa: "ورزشگاه آلتن فورسترای" },
    "FC Augsburg": { en: "WWK Arena", fa: "ورزشگاه دبلیودبلیوکی آرنا" },
    "TSG 1899 Hoffenheim": { en: "PreZero Arena", fa: "ورزشگاه پری‌زیرو آرنا" },
    "1. FC Köln": { en: "RheinEnergieStadion", fa: "ورزشگاه راین‌انرژی" },
    "1. FSV Mainz 05": { en: "MEWA Arena", fa: "ورزشگاه موا آرنا" },
    "FC Schalke 04": { en: "Veltins-Arena", fa: "ورزشگاه فلتینس‌آرنا" },
    "SC Paderborn 07": { en: "Home Deluxe Arena", fa: "ورزشگاه هوم دلوکس آرنا" },
    "Olympique de Marseille": { en: "Stade Vélodrome", fa: "ورزشگاه ولودروم" },
    "Olympique Lyonnais": { en: "Groupama Stadium", fa: "ورزشگاه گروپاما" },
    "Lille OSC": { en: "Stade Pierre-Mauroy", fa: "ورزشگاه پیر مائوروی" },
    "OGC Nice": { en: "Allianz Riviera", fa: "ورزشگاه آلیانز ریویرا" },
    "AS Monaco FC": { en: "Stade Louis II", fa: "ورزشگاه لوئی دوم" },
    "Stade Brestois 29": { en: "Stade Francis-Le Blé", fa: "ورزشگاه فرانسیس لو بله" },
    "Stade Rennais FC 1901": { en: "Roazhon Park", fa: "ورزشگاه روازون" },
    "Racing Club de Lens": { en: "Stade Bollaert-Delelis", fa: "ورزشگاه بولارت-دللیس" },
    "Toulouse FC": { en: "Stadium de Toulouse", fa: "ورزشگاه تولوز" },
    "RC Strasbourg Alsace": { en: "Stade de la Meinau", fa: "ورزشگاه لا مینو" },
    "AJ Auxerre": { en: "Stade Abbé Deschamps", fa: "ورزشگاه آبه دشان" },
    "Angers SCO": { en: "Stade Raymond Kopa", fa: "ورزشگاه ریمون کوپا" },
    "Le Havre AC": { en: "Stade Océane", fa: "ورزشگاه اوسئان" },
    "FC Lorient": { en: "Stade du Moustoir", fa: "ورزشگاه موستوار" },
    "Paris FC": { en: "Stade Jean-Bouin", fa: "ورزشگاه ژان بویون" },
    "Le Mans FC": { en: "Stade Marie-Marvingt", fa: "ورزشگاه ماری مارونگت" },
    "Real Betis Balompié": { en: "Estadio Benito Villamarín", fa: "ورزشگاه بنیتو ویامارین" },
    "Real Sociedad de Fútbol": { en: "Reale Arena", fa: "ورزشگاه آنوئتا" },
    "Sevilla FC": { en: "Estadio Ramón Sánchez-Pizjuán", fa: "ورزشگاه رامون سانچز پیسخوان" },
    "Valencia CF": { en: "Camp de Mestalla", fa: "ورزشگاه مستایا" },
    "Villarreal CF": { en: "Estadio de la Cerámica", fa: "ورزشگاه سرامیکا" },
    "Deportivo Alavés": { en: "Campo de Fútbol de Mendizorrotza", fa: "ورزشگاه مندی‌زوروتزا" },
    "Getafe CF": { en: "Estadio Coliseum", fa: "ورزشگاه کولیسئوم آلفونسو پرز" },
    "CA Osasuna": { en: "Estadio El Sadar", fa: "ورزشگاه ال سادار" },
    "RC Celta de Vigo": { en: "Estadio Balaídos", fa: "ورزشگاه بالایدوس" },
    "RCD Espanyol de Barcelona": { en: "Stage Front Stadium", fa: "ورزشگاه کورنلا-ال پرت" },
    "Rayo Vallecano de Madrid": { en: "Estadio de Vallecas", fa: "ورزشگاه والکاس" },
    "RC Deportivo La Coruña": { en: "Estadio Riazor", fa: "ورزشگاه ریاثور" },
    "Elche CF": { en: "Estadio Martínez Valero", fa: "ورزشگاه مارتینس والرو" },
    "Levante UD": { en: "Estadi Ciutat de València", fa: "ورزشگاه سیوتات د والنسیا" },
    "Málaga CF": { en: "Estadio La Rosaleda", fa: "ورزشگاه لا روسالدا" },
    "UD Almería": { en: "UD Almería Stadium", fa: "ورزشگاه آلمریا" },
    "Girona FC": { en: "Estadi Montilivi", fa: "ورزشگاه مونتیلیوی" },
    "RCD Mallorca": { en: "Estadi Mallorca Son Moix", fa: "ورزشگاه سون مویش" },
    "UD Las Palmas": { en: "Estadio Gran Canaria", fa: "ورزشگاه گرند کاناریا" },
    "CD Leganés": { en: "Estadio Butarque", fa: "ورزشگاه بوتارکه" },
    "Real Valladolid": { en: "Estadio José Zorrilla", fa: "ورزشگاه خوزه سوریا" },
    "Galatasaray SK": { en: "RAMS Park", fa: "ورزشگاه رامس پارک" },
    "Fenerbahçe SK": { en: "Şükrü Saracoğlu Stadium", fa: "ورزشگاه شوکرو ساراج‌اوغلو" },
    "Panathinaikos FC": { en: "Apostolos Nikolaidis Stadium", fa: "ورزشگاه آپوستولوس نیکولایدیس" },
    "PAE AEK": { en: "OPAP Arena", fa: "ورزشگاه اوپاپ آرنا" },
    "Dinamo Zagreb": { en: "Maksimir Stadium", fa: "ورزشگاه ماکسیمیر" },
    "Red Star Belgrade": { en: "Stadion Rajko Mitić", fa: "ورزشگاه راجکو میتیچ" },
    "FCSB": { en: "Arena Națională", fa: "ورزشگاه ملی بخارست" },
    "Legia Warsaw": { en: "Stadion Wojska Polskiego", fa: "ورزشگاه لگیا" },
    "Lech Poznań": { en: "Stadion Poznań", fa: "ورزشگاه پوزنان" },
    "SK Rapid Wien": { en: "Allianz Stadion", fa: "ورزشگاه آلیانز وین" },
    "FK Austria Wien": { en: "Generali Arena", fa: "ورزشگاه ژنرالی آرنا" },
    "SK Sturm Graz": { en: "Merkur Arena", fa: "ورزشگاه مرکور آرنا" },
    "FC Basel": { en: "St. Jakob-Park", fa: "ورزشگاه سنت یاکوب" },
    "BSC Young Boys": { en: "Wankdorf Stadium", fa: "ورزشگاه وانکدورف" },
    "FC Red Bull Salzburg": { en: "Red Bull Arena (Salzburg)", fa: "ورزشگاه رد بول آرنا" },
    "FC Copenhagen": { en: "Parken Stadium", fa: "ورزشگاه پارکن" },
    "FC Midtjylland": { en: "MCH Arena", fa: "ورزشگاه ام‌سی‌اچ آرنا" },
    "Rosenborg BK": { en: "Lerkendal Stadion", fa: "ورزشگاه لرکندال" },
    "Molde FK": { en: "Aker Stadion", fa: "ورزشگاه آکر" },
    "FK Bodø/Glimt": { en: "Aspmyra Stadion", fa: "ورزشگاه آسپمیرا" },
    "Malmö FF": { en: "Eleda Stadion", fa: "ورزشگاه الدا" },
    "Djurgårdens IF": { en: "Tele2 Arena", fa: "ورزشگاه تل۲" },
    "Sparta Praha": { en: "Letná Stadium", fa: "ورزشگاه لتنا" },
    "SK Slavia Praha": { en: "Fortuna Arena", fa: "ورزشگاه فورتونا" },
    "AC Sparta Prague": { en: "Letná Stadium", fa: "ورزشگاه لتنا" },
    "FC Porto": { en: "Estádio do Dragão", fa: "ورزشگاه دراگائو" },
    "SL Benfica": { en: "Estádio da Luz", fa: "ورزشگاه دا لوز" },
    "Sporting CP": { en: "Estádio José Alvalade", fa: "ورزشگاه ژوزه آلوالاده" },
    "SC Braga": { en: "Estádio Municipal de Braga", fa: "ورزشگاه براگا" },
    "RSC Anderlecht": { en: "Lotto Park", fa: "ورزشگاه لوتو پارک" },
    "Club Brugge KV": { en: "Jan Breydel Stadium", fa: "ورزشگاه یان بریدل" },
    "KRC Genk": { en: "Cegeka Arena", fa: "ورزشگاه سگکا آرنا" },
    "KAA Gent": { en: "Planet Group Arena", fa: "ورزشگاه گیلامو" },
    "Royal Antwerp FC": { en: "Bosuilstadion", fa: "ورزشگاه بوسویل" },
    "Standard Liège": { en: "Stade Maurice Dufrasne", fa: "ورزشگاه اسکارسین" },
    "PSV": { en: "Philips Stadion", fa: "ورزشگاه فیلیپس" },
    "Feyenoord": { en: "Stadion Feijenoord", fa: "ورزشگاه دکویپ" },
    "AFC Ajax": { en: "Johan Cruyff Arena", fa: "ورزشگاه یوهان کرایف" },
    "AZ Alkmaar": { en: "AFAS Stadion", fa: "ورزشگاه آفاس" },
    "FC Twente": { en: "De Grolsch Veste", fa: "ورزشگاه خرولش فسته" },
    "Celtic FC": { en: "Celtic Park", fa: "ورزشگاه سلتیک پارک" },
    "Rangers FC": { en: "Ibrox Stadium", fa: "ورزشگاه ایبروکس" },
    "Olympiacos FC": { en: "Karaiskakis Stadium", fa: "ورزشگاه کاراییسکاکیس" },
    "PAOK FC": { en: "Toumba Stadium", fa: "ورزشگاه تومبا" },
    "FC Dynamo Kyiv": { en: "Dynamo Stadium", fa: "ورزشگاه دینامو" },
    "FC Shakhtar Donetsk": { en: "Arena Lviv", fa: "ورزشگاه آرنا لویو" },
    "PFC CSKA Moscow": { en: "VEB Arena", fa: "ورزشگاه وب آرنا" },
    "FC Spartak Moscow": { en: "Otkritie Arena", fa: "ورزشگاه اوتکریتیه" },
    "FC Zenit Saint Petersburg": { en: "Gazprom Arena", fa: "ورزشگاه گازپروم" },
    "FC Lokomotiv Moscow": { en: "Lokomotiv Stadium", fa: "ورزشگاه لوکوموتیو" },
    "FC Kairat Almaty": { en: "Ortalyq Stadion", fa: "ورزشگاه اورتالیق" },
    "ŠK Slovan Bratislava": { en: "Tehelné Pole", fa: "ورزشگاه تهلنه پوله" },
    "Viking FK": { en: "Viking Stadion", fa: "ورزشگاه وایکینگ" },
    "Sabah FK": { en: "Bank Respublika Arena", fa: "ورزشگاه صباح" },
    "LASK": { en: "Raiffeisen Arena", fa: "ورزشگاه رایفایزن" },
    "Ferencvárosi TC": { en: "Groupama Aréna", fa: "ورزشگاه گروپاما آرنا" },
    "Maccabi Haifa FC": { en: "Sammy Ofer Stadium", fa: "ورزشگاه سامی اوفر" },
    "Maccabi Tel Aviv FC": { en: "Bloomfield Stadium", fa: "ورزشگاه بلومفیلد" },
    "Qarabağ FK": { en: "Azersun Arena", fa: "ورزشگاه آذرسون" },
    "FC Astana": { en: "Astana Arena", fa: "ورزشگاه آستانه" },
    // (the 2026-11-21 follow-up batch: stadium-only additions for clubs whose
    // provider name forms fold differently — Nantes (Ligue 2 returner),
    // Athletic Club, the already-covered Serie B / 2. Bundesliga clubs, and
    // the FD legal-form aliases for Sporting CP / Feyenoord / LASK)
    "FC Nantes": { en: "Stade de la Beaujoire", fa: "ورزشگاه بوجوآر" },
    "Athletic Club": { en: "San Mamés", fa: "ورزشگاه سن مامس" },
    "US Cremonese": { en: "Stadio Giovanni Zini", fa: "ورزشگاه جووانی زینی" },
    "Empoli FC": { en: "Stadio Carlo Castellani", fa: "ورزشگاه کارلو کاستلانی" },
    "Hellas Verona FC": { en: "Stadio Marcantonio Bentegodi", fa: "ورزشگاه بنتگودی" },
    "Pisa SC": { en: "Arena Garibaldi", fa: "ورزشگاه آرنا گاریبالدی" },
    "Sampdoria": { en: "Stadio Luigi Ferraris", fa: "ورزشگاه لوئیجی فراریس" },
    "VfL Bochum": { en: "Vonovia Ruhrstadion", fa: "ورزشگاه رورشتادیون" },
    "SV Darmstadt 98": { en: "Merck-Stadion am Böllenfalltor", fa: "ورزشگاه مرک" },
    "Hannover 96": { en: "Heinz von Heiden Arena", fa: "ورزشگاه هاینتس فون هایدن" },
    "1. FC Heidenheim": { en: "Voith-Arena", fa: "ورزشگاه فویت" },
    "Holstein Kiel": { en: "Holstein-Stadion", fa: "ورزشگاه هولشتاین" },
    "1. FC Magdeburg": { en: "Avnet Arena", fa: "ورزشگاه اونت آرنا" },
    "FC St. Pauli": { en: "Millerntor-Stadion", fa: "ورزشگاه میلرنتور" },
    "VfL Wolfsburg": { en: "Volkswagen Arena", fa: "ورزشگاه فولکس‌واگن آرنا" },
    "Sporting Clube de Portugal": { en: "Estádio José Alvalade", fa: "ورزشگاه ژوزه آلوالاده" },
    "Feyenoord Rotterdam": { en: "Stadion Feijenoord", fa: "ورزشگاه دکویپ" },
    "LASK Linz": { en: "Raiffeisen Arena", fa: "ورزشگاه رایفایزن" },

  },
  DOMESTIC_CUP_IDS: {
    "FA_CUP": 2055,
    // football-data FA Cup (was 2018 = Euro Championship — cups never fetched!)
    "EFL_CUP": 2139,
    // Carabao Cup (Football League Cup)
    "CDR": 2079,
    // Copa del Rey (was 2013 = Brasileirão Série A)
    "COPPA_ITALIA": 2122,
    // Coppa Italia (was 2022 = Austrian Playoffs)
    "DFB_POKAL": 4555
    // DFB Pokal (German Cup)
  },
  // International tournaments (world/continental cups). Fetched near-term only and
  // shown in the app only while in process (a fixture on the horizon). Kept OUT of
  // LEAGUES: national teams never match the followed clubs, so they can't notify.
  INTL_COMPETITIONS: {
    "WC": 2e3,
    // FIFA World Cup
    "EC": 2018,
    // UEFA Euro
    "COPA": 2029,
    // Copa América
    "AFCON": 2088,
    // Africa Cup of Nations
    "AFC": 2092
    // AFC Asian Cup
  },
  LATE_STAGES: [
    "QUARTER_FINALS",
    "QUARTER_FINAL",
    "SEMI_FINALS",
    "SEMI_FINAL",
    "FINAL",
    "THIRD_PLACE"
  ],
  PRIORITY: {
    "CL": 1,
    "EL": 2,
    "ECL": 3,
    "PL": 4,
    "PD": 5,
    "SA": 6,
    "FL1": 7,
    "FA_CUP": 8,
    "EFL_CUP": 9,
    "CDR": 10,
    "COPPA_ITALIA": 11,
    "DEFAULT": 12
  },
  // FIXED: Wider windows to account for cron timing
  PRE_MATCH_NOTIFICATION_HOURS: 24,
  BIG_MATCH_NOTIFICATION_HOURS: 72,
  REMINDER_3_HOURS: 3,
  REMINDER_1_HOUR: 1,
  // Future-plan fix: MATCH_START_WINDOW_MINUTES (45) is REMOVED — it opened
  // the "match started" window 45 minutes BEFORE kickoff, so a 22:30 match
  // was announced as live from 21:45. isMatchStartingNow() now fires only
  // after the real kickoff (see its comment).
  POST_MATCH_NOTIFICATION_HOURS: 6,
  // 24h — cache is used only when ALL providers fail, so staleness is fine and
  // helps the bot survive a weekend API outage without missing matches
  CACHE_STALE_TTL: 86400,
  // v13.54-livestamp: the pool's fetchedAt stamp is the "Last updated"
  // clock the site header prints. cacheMatches is change-only (v13.31 KV
  // budget), and on break weeks NOTHING changes — fixtures sit TIMED for
  // days — so the stamp froze at the last content change (2026-09-28: the
  // header said "دوشنبه ۱۵:۳۹ · cached (1407m ago)" for 41h while sweeps
  // ran clean every 2h). Now a successful re-cache whose content is
  // unchanged STILL rewrites the pool when the stamp is >90min old — the
  // full sweep's 2h cadence makes every sweep advance it (≤12 writes/day
  // of the 1,000/day quota; live content changes keep their instant
  // write). The stamp means "last sweep that verified this data", which
  // is exactly what the header claims to print.
  POOL_STAMP_REFRESH_MS: 90 * 60 * 1e3,
  // v13.54-livestamp: the "cached (Nm ago)" badge shows ONLY when the data
  // epoch (the pool stamp riding in the served payload) is older than
  // this. Steady state: sweep advances ≤2h + rebuild propagation ≤~10min
  // → no badge on healthy days (it used to show on EVERY snapshot-serve,
  // i.e. every >10-min-gap visitor, with a frozen write-time age that
  // grew for days). A dead-sweep outage (>3h) still gets the truthful
  // badge with the age of the DATA, not of the KV write.
  CACHED_BADGE_MS: 3 * 60 * 60 * 1e3,
  TELEGRAM_RETRY_ATTEMPTS: 3,
  // v13.69-pacenotify: proactive Telegram pacing + bounded 429-pause waits.
  // Telegram's global bot limit is ~30 messages/sec; broadcast fan-outs fire
  // every send in parallel, so ≥30 chats = a guaranteed 429 cascade. A 40ms
  // floor between Telegram API calls (~25/sec) paces the fan-out under the
  // limit (a wall-clock sleep — zero CPU against the free plan's 10ms
  // rolling average; a cron tick has minutes of wall-time headroom). When a
  // 429 pause IS active, senders wait it out (bounded below) instead of
  // dropping the send — Telegram's global-limit retry_after is 1-5s.
  TELEGRAM_MIN_SEND_GAP_MS: 40,
  // v13.94-fanoutfix: THE FAN-OUT RESERVATION. The runtime's ~50-subrequest
  // ceiling is per-invocation and Cloudflare's accounting is coarser than
  // our fetch-only meter (the 2026-10-13 15:30Z tick: meter claimed
  // "50/48" while sportscore/standings/wikipedia calls were already being
  // rejected; the 15:40Z tick ran 30 fetches + 30 KV ops = 60 "true" and
  // survived — the accounting includes per-colo variance we cannot see).
  // A notification fan-out that starts too late in a hot tick dies
  // MID-FLIGHT: the earliest chats (the admin is first in roster order)
  // get their cards, the tail chats lose card + text + outbox entry in one
  // cascade — under a write-first dedupe record that means PERMANENT
  // silent loss for exactly those users (the reported "I get all 3, the
  // other account got 1"). The reservation gate below defers a whole
  // (match, type) instead: no dedupe write happened, the next tick
  // retries inside the same window (every window is ≥45 min wide and
  // the backfill legs cover the rest).
  SUBREQUEST_FANOUT_CAP: 46,
  // v13.124-weeklyfanout: the WEEKLY digest's own reservation ceiling (true
  // subrequests = fetches + KV ops, the fanoutReservation accounting). The
  // Monday digest fans out ~12 sends per chat (5 stickers + 6 tables +
  // week-ahead) × the whole roster — 10 chats ≈ 120 subrequests against one
  // invocation's ~50: it MUST run in budget-checked bursts resumed across
  // the 10-minute ticks via the KV cursor (weekly_tables_cursor_v1). A
  // burst only starts when its worst-case cost (WEEKLY_BURST_RESERVE)
  // fits under this cap. Slightly under the notify cap (46): Monday 01:30
  // Tehran has no live matches, but the tick's tail phases keep headroom.
  WEEKLY_FANOUT_CAP: 44,
  // Worst-case cost of ONE chat's digest burst: 5 stickers + 7 tables +
  // week-ahead + retry margin + the cursor put. The reservation projects
  // the WORST case (the v13.94 doctrine) — a burst that starts always
  // finishes inside the budget envelope.
  WEEKLY_BURST_RESERVE: 15,
  // v13.117-kickoff: THE DEFERRED-FAN-OUT DRAIN CHAIN (kickoff-drain.ts).
  // When the reservation above defers in-window units (the classic: two
  // simultaneous kickoffs — the second's full dice+card+text fan-out cannot
  // fit ONE invocation's ~50-subrequest ceiling), the tick chains the
  // deferred keys to a NEW invocation of THIS SAME WORKER through the
  // self-referencing service binding env.DRAIN_SELF (wrangler.toml
  // [[services]]) — the bound invocation has its OWN fresh subrequest
  // budget, so the deferred unit's full fan-out lands ~40-60s after kickoff
  // — same-minute as the first match — instead of at the next 10-minute
  // tick, lean and card-less. (A plain fetch to the worker's own public
  // origin is NOT usable here: Cloudflare refuses it with error 1042
  // "recursive fetch" — probed live 2026-10-17.) Caps: MAX_UNITS bounds the
  // payload per chained invocation (excess rides the old next-tick path);
  // MAX_DEPTH bounds the recursion (a drain that defers again — 3+
  // simultaneous kickoffs — chains once more, never unboundedly).
  KICKOFF_DRAIN_MAX_UNITS: 10,
  KICKOFF_DRAIN_MAX_DEPTH: 2,
  // v13.94-fanoutfix: maintenance (cup scans / far probe / standings
  // refresh / stamp-advance) is cosmetic — it must never take the budget
  // a pending fan-out needs. Skipped on ticks whose true count is already
  // high (the notify phase just spent it, or a live sweep did).
  FANOUT_MAINT_MAX: 30,
  TELEGRAM_PAUSE_WAIT_MAX_MS: 8000,
  // v13.115-trialfoot → v13.119-hbfix: the owner's trial marker (2026-10-17):
  // «نسخه آزمایشی.» rides the FOOTER of every text-bearing message the
  // bot delivers — sendMessage texts (all three sender paths + menu edits)
  // AND photo/GIF captions. Applied in telegram.ts's withTrialFooter at the
  // SENDER layer (one choke point, composers stay footer-free). The
  // 2026-10-18 owner ask added the trailing period — a MarkdownV2 RESERVED
  // character — so the sender escapes the footer on the MarkdownV2 paths
  // (the md flag: sendMessage texts, menu edits, MarkdownV2 photo captions)
  // while the plain-text caption paths (the UCL GIF banner, a
  // parseMode-less photo caption) append the raw display string (no visible
  // backslash). The idempotency guard matches the marker with OR without
  // the trailing period, so outbox entries queued by an older deploy are
  // recognized on the drain and never double. sendSticker / sendDice carry
  // no text at all — physically beyond the footer's reach. Empty string
  // disables the footer everywhere (config-only kill switch).
  TRIAL_FOOTER: "نسخه آزمایشی.",
  KV_USERS_KEY: "telegram_users_v6",
  // v13.129-herogaploop: the hero-portrait gap registry (src/hero-gaps.ts) —
  // teams the tick sees on live/upcoming rows (and on the featured hero
  // match) that have no wired HERO_ART artwork. Write-disciplined: one write
  // per new gap team + one daily bump per team (see mergeHeroGapRegistry).
  KV_HERO_GAPS: "hero_gaps_v1",
  // v13.133-clubalt: the TRANSFER WATCH registry (src/hero-rotation.ts) —
  // departure events for clubs whose active hero left (FD.org squad
  // checks), plus the watch cursor. Write-disciplined: one write per sweep
  // tick that checked clubs (≤ ~6/day normal, ≤ ~48/day inside transfer
  // windows — the 700/day budget holds).
  KV_HERO_ROTATION: "hero_rotation_v1",
  KV_MATCHES_KEY: "matches_v13_tracked",
  KV_NOTIFIED_KEY: "notified_matches_v6",
  KV_SETTINGS_KEY: "bot_settings_v1",
  KV_LAST_SOURCE: "last_api_source",
  // v13.99-uclgif: the UCL night GIF banner. The asset lives at
  // assets/bot/ucl-night.gif (TELEGRAM BOT ASSET — see assets/_headers;
  // Workers Static Assets serves it at https://sportsignal.ir/bot/ucl-night.gif
  // before the worker runs). Telegram fetches that URL ONCE, caches the
  // upload as a file_id under KV_UCL_GIF_FILEID (90-day TTL) and every later
  // send rides the file_id — instant + independent of our site. Replacing
  // the GIF in place needs a KV key clear to re-upload immediately.
  UCL_GIF_URL: "https://sportsignal.ir/bot/ucl-night.gif",
  KV_UCL_GIF_FILEID: "ucl_gif_fileid_v1",
  // v13.114-stickers: the league-logo sticker pack — Telegram-side picture
  // infrastructure (the owner's rule: pictures ride Telegram's CDN, never
  // the worker's render/upload path). The pack was created ONCE by
  // scripts/make-sticker-pack.js from assets/stickers/*.png (512×512,
  // WHITE background — v13.115: the owner's logos are intentional
  // white-background recreations; the first pass wrongly stripped it);
  // KV stickers_v1 holds the per-league file_ids harvested
  // from getStickerSet (set position order = STICKER_LEAGUE_CODES). The
  // weekly digest (and /tables) sends the league's sticker right before
  // its table message.
  KV_STICKERS: "stickers_v1",
  STICKER_SET_URL: "https://t.me/addstickers/sportsignal_leagues_by_SportSignalAlertsBot",
  STICKER_LEAGUE_CODES: ["PL", "PD", "SA", "BL1", "FL1"],
  // v13.99-botmenu: the "/" command menu flag (setMyCommands) — value = the
  // VERSION that last registered the menu, so every version bump re-registers
  // (idempotent) and the harness pins the command lists in telegram.ts.
  KV_BOT_MENU_FLAG: "bot_menu_v1",
  // v13.99-uclgif: the UCL night preview window — fires on the first tick
  // inside [firstCLKickoff − 6h, firstCLKickoff − 10min]. 6h catches the
  // evening's games while the day is still "ahead" (16:45Z UCL games =
  // 20:15 Tehran); the 10min tail stops previews for a ball already rolling.
  UCL_PREVIEW_LEAD_MS: 6 * 60 * 60 * 1e3,
  UCL_PREVIEW_TAIL_MS: 10 * 60 * 1e3,
  KV_STANDINGS_SNAP: "standings_snap_",
  KV_STANDINGS_CACHE: "standings_cache_",
  // v13.53-standsteady: standings freshness + cache tunables. The old values
  // (10-min freshness gate / 8h KV TTL) were the "2 of 5 league tables
  // don't load" bug's fuel: every payload rebuild re-hit football-data for
  // the rotation pair, FD 429s left nothing cached for the other codes, and
  // the 8h TTL expired the box to «جدول هنوز در دسترس نیست». Standings only
  // change around finished matches, so:
  //   STANDINGS_FRESH_MS       — default re-fetch gate (6h; callers that need
  //                              post-FT freshness pass opts.freshMs = 6e5);
  //   STANDINGS_FRESH_JITTER_MS— per-code stagger (see STAND_CODE_ORDER) so
  //                              the 6h expiries NEVER coincide: no rebuild
  //                              fetches the whole set at once (FD free tier
  //                              is 10 req/min); worst case ~1 code/rebuild;
  //   STANDINGS_CACHE_TTL      — KV TTL of a successful fetch (24h; a
  //                              day-old table beats an empty box when the
  //                              upstream is down/suspended).
  STANDINGS_FRESH_MS: 6 * 60 * 60 * 1e3,
  STANDINGS_FRESH_JITTER_MS: 17 * 60 * 1e3,
  STANDINGS_CACHE_TTL: 24 * 60 * 60,
  KV_PUBLIC_MATCHES: "public_matches_v1",
  // v13.55-epochflow: the cron tick's SELF-FETCH prewarm target. The in-tick
  // prewarm rebuilt the public payload INSIDE the sweep invocation — after
  // the 3-provider sequential sweep the tick already sits at ~40-50 real
  // subrequests, so the rebuild's final payload + snapshot puts crossed CF's
  // real ~50 ceiling and died silently (.catch(() => {})) on every sweep
  // (the 2026-09-30 frozen-epoch bug: the snapshot last wrote 05:43 while
  // sweeps ran clean every 2h). The tick now fires ONE fetch at this URL —
  // a fresh invocation with a full 50-subrequest budget of its own, whose
  // serve path + waitUntil rebuild land the writes reliably. The query
  // string is cache-busting only; the route treats it like any visitor.
  SELF_PREWARM_URL: "https://sportsignal.ir/api/public-matches",
  // v13.55-epochflow: the cron standings-refresh phase marker (see cron.ts).
  // Standings fetch authority moved OFF the serve path (visitor rebuilds are
  // cache-only) into a dedicated quiet-tick phase gated by this 2h marker —
  // the 6h per-code freshness gates + jitter inside fetchStandings stay the
  // real throttle; the marker just keeps the phase off every single tick.
  KV_STAND_REFRESH: "stand_refresh_v1",
  STAND_REFRESH_MS: 2 * 60 * 60 * 1e3,
  // v12.x-resilience: long-TTL (7 day) snapshot of the last successful
  // public-matches build. Read ONLY when the live fetch fails (or returns
  // an empty pool) so the page can still render last week's fixtures with
  // a subtle "cached data" indicator instead of empty cards.
  KV_PUBLIC_SNAPSHOT: "cache:snapshot:v1",
  KV_PUBLIC_SNAPSHOT_TTL: 7 * 24 * 60 * 60,
  // v13.52-swrsolid: the LIVE OVERLAY — a tiny blob the cron tick writes
  // whenever live data changes (goal / kickoff / HT / FT) and at least every
  // 10 min while live rows exist. The public serve path reads it (one KV
  // read) and patches live rows into EVERY payload it serves — fixtures can
  // cache for hours, but a LIVE match is never served stale and a FINISHED
  // one is purged from the live lists immediately (the user's rule: "you
  // can't cache a live game — it would still show as playing").
  KV_LIVE_OVERLAY: "live_overlay_v1",
  KV_LIVE_OVERLAY_TTL: 6 * 60 * 60,
  KV_USER_PREFS: "user_prefs_v1",
  // v12.16: bot-member profiles (telegram username/"slug" + first name + join
  // date), captured from every incoming message and backfilled via getChat
  // when the admin opens the members card. Keyed by chat id.
  KV_USER_PROFILES: "user_profiles_v1",
  KV_MATCH_STATUS: "match_status_v1",
  // v13.276-slim (A1): the S19 goal-event layer's KV snapshot map + its
  // per-tick fan-out cap are REMOVED with the layer itself — the
  // owner-approved live strip. Any orphaned snapshot key expires via its
  // own 2-day TTL; no data rollback is needed.
  // v13.230-channelbase: the Telegram Channel Mirror PAUSE marker. Written
  // ONLY on state transitions (paused on a permanent channel error class,
  // resumed on config-change detection / owner action — DISCOVERY §7.6),
  // never per tick; read through the isolate-memoized pausedChannel()
  // (src/channel-mirror.ts). Shape: {paused: bool, reason: <class>|null,
  // at, resumed_at?} — reason is a sanitized CLASS ('permanent-403'), never
  // a raw error/payload/token. Absent = not paused (fresh deploy).
  KV_CHANNEL_MIRROR: "channel_mirror_v1",
  // v13.37-nospam2: audit admin-alert rate-limit stamp (one gap alert / 6h).
  KV_AUDIT_ALERT: "audit_alert_v1",
  // v13.276-slim (A4): the scorer-enrichment layer's 90s live-detail cache
  // key prefix is REMOVED with the enrichment fetch itself (≤4 FD
  // /v4/matches/{id} calls per prewarm tick + their KV rows).
  // applyLiveDetail stays (tree-shaken, still unit-tested); orphaned
  // detail rows expire via their own 90s TTL within minutes.
  // v13.82-matchday: per-match venue cache for the match-page hydration
  // (hydrateMatchVenue in seo/data.ts) — {v: "Stadium Name"|null} per FD
  // numeric id, 24h TTL, positive AND negative (a venue-less match is
  // re-checked at most once a day; the page HTML cache keeps real fetch
  // rates far below that). Written only from the match-page render path.
  KV_VENUE_CACHE: "venue_v1_",
  // v12.9: end-of-week league-tables digest. KV_WEEKLY_TABLES stores the ISO
  // week key ("2026-W37") of the last delivered digest; WEEKLY_TABLES is the
  // delivery window — Monday 01:30–06:00 Tehran, i.e. after the LAST European
  // Sunday kickoff wraps (La Liga's late slot ends ~01:20 Tehran) and before
  // the morning — the "end of the week's work" for football.
  KV_WEEKLY_TABLES: "weekly_tables_v1",
  // v13.124-weeklyfanout: the chunked digest's resumable state.
  // CURSOR: {week, ts, pending: {fa: [chatIds], en: [...]}} — the
  // still-pending chats, persisted BEFORE each burst (remove-before-send,
  // the marker's never-spam precedence). Deleted on completion; TTL 8d;
  // a cursor older than 12h is stale and dropped (never resumed into a
  // wrong week). PAYLOAD: the week's rendered snapshot (per-lang table
  // texts + sticker file_ids + week-ahead) — standings fetched ONCE per
  // week; continuation ticks read it from KV (zero fetches) and bursts
  // are pure Telegram sends.
  KV_WEEKLY_CURSOR: "weekly_tables_cursor_v1",
  KV_WEEKLY_PAYLOAD: "weekly_tables_payload_v1",
  WEEKLY_TABLES: { day: 1, fromMin: 90, toMin: 360 },
  // Fallback API providers (used only when the primary API fails)
  FALLBACK_DAYS_PAST: 1,
  FALLBACK_DAYS_FUTURE: 2,
  KNOWN_LEAGUE_CODES: [
    "CL",
    "PL",
    "PD",
    "SA",
    "FL1",
    "BL1",
    "EL",
    "ECL",
    "FA_CUP",
    "EFL_CUP",
    "CDR",
    "COPPA_ITALIA",
    "DFB_POKAL"
  ],
  // v12.14: club-name autocomplete catalog for the admin panel's "add club"
  // inputs. The roster is pre-downloaded from the SAME providers the matcher
  // uses (football-data /teams + sportscore for the A-League) and cached in
  // KV; /api/clubs serves prefix matches so the panel stores the EXACT API
  // name ("AS Roma", not a guessed "Roma"). Stale after 14 days (rosters
  // move in windows, not daily).
  KV_CLUBS_CATALOG: "clubs_catalog",
  CLUBS_STALE_MS: 12096e5,
  // v12.17: AI-learned Farsi club names (Workers AI, binding "AI" in
  // wrangler.toml). Layer 2 of the translation stack — the static FA_TEAMS
  // dict always wins; names the dict misses (UCL's 36-team table brings clubs
  // from 16+ countries — SK Slavia Praha, Viking FK, PAE AEK…) are learned
  // INCREMENTALLY: one batched AI call for whatever is currently unknown,
  // results validated + stored in KV, then served forever (the user's
  // "translate → store in db → show Farsi next sessions" design). A failed
  // or rejected name cools down FA_AI_FAIL_RETRY_MS before being re-asked;
  // the learner itself runs at most every FA_AI_RUN_EVERY_MS and only when
  // unknown names exist — zero AI calls when everything is translated.
  KV_FA_TEAMS: "fa_teams_ai",
  KV_FA_LAST_RUN: "fa_ai_last_run",
  // v13.13-venues: AI-learned Persian stadium/venue names. Separate KV
  // from fa_teams_ai (stadiums translate differently — "Emirates Stadium" →
  // "امارات"). The AI learner collects unknown venue names from the match
  // pool and translates them in the same batch as team names.
  KV_FA_VENUES: "fa_venues_ai",
  FA_AI_MAX_BATCH: 16,
  FA_AI_RUN_EVERY_MS: 9e5,
  FA_AI_FAIL_RETRY_MS: 432e5,
  // v12.18: varzesh3.com directory (the user's pointer) — canonical Persian
  // club names scraped from varzesh3 league tables by
  // scripts/varzesh3-catalog.js and pushed here via the Cloudflare API. The
  // AI learner uses it as GROUNDING: candidate names ride in the prompt and
  // accepted answers snap to the exact varzesh3 spelling. KV-only read in the
  // worker — zero extra fetches.
  KV_V3_CATALOG: "varzesh3_clubs_v1",
  // ✅ UPDATED: Bumped version after TTL fix
  KV_LAST_CRON: "last_cron_execution",
  KV_HEARTBEAT: "heartbeat",
  KV_EXECUTION_LOCK: "execution_lock",
  LOCK_TIMEOUT: 24e4,
  // v13.9-reliability: dependability infrastructure KV keys (all v1, additive).
  // #3 Dead-letter outbox for Telegram sends that exhausted their 3 retries
  // (Telegram 5xx/429/network). Drained at the start of every cron sweep
  // with exponential backoff. A message here is NEVER lost — retried until
  // success or the chat is dead.
  KV_OUTBOX: "pending_sends_v1",
  KV_OUTBOX_MAX: 200,
  // #1 Pre-scheduled notifications: RETIRED in v13.43-cpukeeper — the
  // sched_v1:* records were never read back (the fire-leg was never built);
  // the v13.42 isBackfillEligible legs + the outbox cover recovery for real.
  // Old sched_v1:* keys expire via their 7-day TTL; the prefix constant is
  // kept ONLY as documentation (no writer, no reader).
  KV_SCHEDULE_PREFIX: "sched_v1:",
  // v13.9-reliability #4: canonical kickoff-time KV — REMOVED in v13.46-trim:
  // kickoff_v1: had zero writers and zero readers in practice (the helpers in
  // admin.ts were never called by detectStatusChanges or anyone else), so the
  // prefix constant went with them. Guard flipped to absence (check-reliability
  // #4). Notification windows have always used the pool's own utcDate.
  // #5 Canary match: RETIRED in v13.44-quotaguard (audit F9). The injection
  // could never persist — cacheMatches runs BEFORE the injection, so every
  // tick minted a fresh +25h kickoff whose windows never opened — while
  // burning a canary_match_v1 write EVERY tick (~144/day of the 1,000/day
  // free quota for zero value, plus notify-path reads for a phantom match).
  // Pipeline liveness is proven by real matches + the 6h admin heartbeat +
  // the last_cron-completion healthz + the v13.42 notify breadcrumb. Old
  // canary_match_v1 keys expire via their own 7-day TTL.
  // v13.44-quotaguard: the KV-write budget governor thresholds (free tier =
  // 1,000 writes/day). SOFT (700): shed cosmetic writes (public prewarm,
  // FA-AI learning). HARD (850): also hold the pool-cache write + page the
  // admin once/12h. The anti-spam set (dedupe records, outbox, execution
  // lock, status blob) is NEVER gated — spam prevention beats budget
  // pressure, and a send whose dedupe write fails is deferred fail-closed.
  KV_WRITES_SOFT: 700,
  KV_WRITES_HARD: 850,
  // #9 Heartbeat: the bot sends a "✅ alive" to the admin chat every 6h.
  // If the admin doesn't see it, something broke (cron, worker, KV, Telegram).
  KV_HEARTBEAT_LAST: "heartbeat_sent_v1",
  HEARTBEAT_INTERVAL_MS: 6 * 60 * 60 * 1e3,
  // v13.11-migration: bot migration broadcast. Sends a "this bot is
  // deprecated, join the new bot" message to all registered chats, every
  // 3 days for 2 weeks (5 sends: day 0, 3, 6, 9, 12). Per-chat KV dedupe
  // so each user gets it exactly once per send-round. The admin starts the
  // migration via POST /api/migrate/start; it auto-expires after 14 days.
  KV_MIGRATION: "migration_v1",
  MIGRATION_INTERVAL_DAYS: 3,
  MIGRATION_TOTAL_DAYS: 14,
  MIGRATION_NEW_BOT_URL: "https://t.me/SportSignalAlertsBot",
  MIGRATION_NEW_BOT_HANDLE: "@SportSignalAlertsBot",
  // v13.231-channelmirror: the CHANNEL FOOTER's required links (spec PART II
  // §4 — every channel post ends with the website + bot links). The bot URL
  // mirrors MIGRATION_NEW_BOT_URL (the verified live username — the owner's
  // brief and the STICKER_SET_URL spelling agree on SportSignalAlertsBot);
  // the site is the public origin the v13.22 promo footer already carries.
  // MarkdownV2-escaping happens at the footer builder (channel-mirror.ts).
  CHANNEL_SITE_URL: "https://sportsignal.ir",
  CHANNEL_BOT_URL: "https://t.me/SportSignalAlertsBot",
  DATE_RANGE_DAYS: 10,
  DAYS_IN_PAST: 2,
  DAYS_IN_FUTURE: 8,
  LONG_VIEW_DAYS: 92,
  NOTIFICATION_COOLDOWN_HOURS: 6,
  EXECUTION_FREQUENCY_MINUTES: 10,
  // v12.16 (API frugality, the user's ask): the cron still ticks every 10 min
  // but the full provider sweep only runs when it MATTERS — a followed match
  // is live, kicks off within 1h, or ended <8h ago (result pending). Quiet
  // periods re-sweep at most every QUIET_SWEEP_MS; pre-match reminders keep
  // firing from the KV pool (fixtures are known days ahead).
  // v13.43-cpukeeper: QUIET_SWEEP_MS is now ALSO the cap on full sweeps
  // during ACTIVE windows (previously every active tick re-swept — ~100ms
  // CPU × 6/hour over the free-plan 10ms rolling average = the Sep-14
  // CPU-limit outages). Between full sweeps, active ticks run the cheap
  // live sweep (fetchLiveSweep) instead.
  QUIET_SWEEP_MS: 2 * 60 * 60 * 1e3,
  ACTIVE_WINDOW_AHEAD_MS: 60 * 60 * 1e3,
  // v13.112-estgate: the active tail is now ESTIMATE-GATED (the owner's rule:
  // "game starts at 17 → 17 + 90 + extra ≈ end of match — poll by the
  // schedule, not around the clock"). Was 8h: every tracked kickoff kept the
  // live sweep running for 9 hours (1h ahead + 8h behind) when a match
  // resolves in ~1h45 — measured on the Oct-16 pool: 64% of ticks
  // live-sweeping, mostly long-dead fixtures; the 8h tail was pure quota
  // burn. The 195min (3h15) tail is the estimate + full feature margin:
  //   - league FT lands at ko+~105min (90 + 15 HT break + stoppage) ✓
  //   - cup KO with extra time + penalties lands at ko+~150min ✓
  //   - the match-start backfill leg needs live statuses to ko+180min ✓
  //   - delays/suspensions beyond 195min self-heal: isLiveStatus(cached)
  //     keeps the tick active the moment a full sweep catches the row still
  //     IN_PLAY, and the every-2h full sweep re-syncs FINISHED + final score
  //     regardless (the result notification window is 6h — the cached pool
  //     serves it; worst case a pathological-delay result fires at full-sweep
  //     cadence instead of 10-min cadence).
  // Features unchanged: HT alerts (real half-time score), result
  // notifications (real final score), postponement/cancellation detection,
  // pre-match reminders (always fired from the KV pool). Measured effect:
  // ~−37% live sweeps on a matchday (75→47 ticks), quiet days unchanged.
  ACTIVE_WINDOW_BEHIND_MS: 195 * 60 * 1e3,
  // v13.118-fixsched: the FIXTURE-AWARE SCHEDULER (src/scheduler.ts) — the
  // mode layer that decides how much work each 10-min tick does from the
  // ACTUAL fixture calendar (never a fixed clock window alone). Flat keys,
  // scheduler.ts reads them through schedCfg with these exact defaults so
  // narrow harness evals (stub CONFIG objects) stay runnable.
  //   SCHED_MAX_LIVE_SPAN_MS  — a live status whose kickoff is older than
  //                             this is NOT plausible (ko+90+HT+stoppage,
  //                             ET/pens margin — the same 195min estimate
  //                             ACTIVE_WINDOW_BEHIND_MS pins). The serve
  //                             path downgrades such rows to FINISHED with
  //                             the last-known score (the 4 AM stale-live
  //                             screenshot bug); the pool write converges
  //                             them after the confirmation grace.
  //   SCHED_CONFIRM_GRACE_MS  — how long an unconfirmed finish (stale-live)
  //                             keeps POST_MATCH confirmation sweeps running
  //                             before the row is reconciled away.
  //   SCHED_UPCOMING_SOON_MS  — the "match within N hours" tier: refresh
  //                             schedule/status on the ~20min slot cadence
  //                             (the 10-min tick grid's closest step to the
  //                             task's 15min guidance).
  //   SCHED_IDLE_HORIZON_MS   — a known next fixture beyond this keeps the
  //                             historical 2h maintenance cadence (UPCOMING);
  //                             nothing within it → IDLE.
  //   SCHED_IDLE_DISCOVERY_MS — IDLE fixture-discovery cadence (the task's
  //                             "no relevant matches → discovery ~6h"). The
  //                             far-cup probe rides the quiet ticks (the
  //                             4-hourly lean cron was removed in
  //                             v13.276-slim — CUP_FAR_SCAN_MS gates it).
  //   SCHED_DEGRADED_IN_MS / _OUT_MS — the feed-fail fallback cadences:
  //                             inside the Baku window 2h (conservative),
  //                             outside 4h. A FAILED sweep is never read as
  //                             "no football" (feed_fail_v1 marker).
  //   SCHED_FEED_FAIL_MS      — how long a feed failure keeps DEGRADED armed.
  //   BAKU_WINDOW_OPEN_MIN/_CLOSE_MIN — the 13:00–02:00 Asia/Baku fallback
  //                             coverage window (UTC+4 fixed, pure
  //                             arithmetic — docs/spec-pack/…). FALLBACK
  //                             only: real fixtures always override it.
  SCHED_MAX_LIVE_SPAN_MS: 195 * 60 * 1e3,
  SCHED_CONFIRM_GRACE_MS: 45 * 60 * 1e3,
  SCHED_UPCOMING_SOON_MS: 6 * 60 * 60 * 1e3,
  SCHED_IDLE_HORIZON_MS: 48 * 60 * 60 * 1e3,
  SCHED_IDLE_DISCOVERY_MS: 6 * 60 * 60 * 1e3,
  SCHED_DEGRADED_IN_MS: 2 * 60 * 60 * 1e3,
  SCHED_DEGRADED_OUT_MS: 4 * 60 * 60 * 1e3,
  SCHED_FEED_FAIL_MS: 12 * 60 * 60 * 1e3,
  BAKU_WINDOW_OPEN_MIN: 13 * 60,
  BAKU_WINDOW_CLOSE_MIN: 2 * 60,
  KV_FEED_FAIL: "feed_fail_v1",
  // v12.16: week-ahead fixtures section of the weekly digest — days covered.
  WEEK_AHEAD_DAYS: 7,
  // v12.16: provider circuit breaker — when a provider fails across a whole
  // sweep (sportscore is currently serving a bot challenge), suspend it for
  // this long instead of burning subrequests on every 10-min tick.
  PROVIDER_SUSPEND_MS: 45 * 60 * 1e3,
  // Time constants
  ONE_HOUR_MS: 60 * 60 * 1e3,
  TWO_HOURS_MS: 2 * 60 * 60 * 1e3,
  // v13.50-cupscan: the EFL/FA Cup team-scan cadence (marker cup_scan_v1
  // TTL). A scan runs on the first NON-sweep tick after the marker ages
  // out; during a cup match window [-1h, +4h] it re-runs at most every
  // CUP_SCAN_HOT_TTL_MS so live scores/FT flow at near-tick cadence.
  KV_CUP_SCAN_KEY: "cup_scan_v1",
  CUP_SCAN_TTL_MS: 5 * 3600 * 1e3,
  CUP_SCAN_HOT_TTL_MS: 30 * 60 * 1e3,
  // v14.0.5-cupgap: the far-cup probe cadence (ECL Thursdays + the Hazfi
  // grid — see probeCupFarFixtures in provider-cups.ts). 4h: ~6 runs/day
  // max, 7 fetches each — since v13.276-slim (C4) the probe runs ONLY on
  // quiet ticks (cron-maintenance.ts); the "27 */4" lean cron trigger and
  // its api.ts scheduled branch are removed.
  KV_CUP_FAR_SCAN: "cup_far_scan_v1",
  CUP_FAR_SCAN_MS: 4 * 3600 * 1e3,
  ONE_DAY_MS: 24 * 60 * 60 * 1e3,
  // A-League Men season start (review each year): sportscore serves the prior
  // season's final table in pre-season, so before this date AL standings are
  // zeroed and shown as not-started rather than presenting a stale table.
  SEASON_STARTS: { AL: "2026-10-17T00:00:00Z" }
};

// v13.48-xtrim: the X (Twitter) path is REMOVED (X_CONFIG retired with it).
// X never ran in production — no X_* secrets were ever set and x_enabled_v1
// was never written. To restore: revert the 13.48-xtrim commit, re-add the
// X_* secrets via `wrangler secret put`, then set x_enabled_v1=1 in KV.
