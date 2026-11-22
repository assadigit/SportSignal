# National-Team Football Tournaments — The Complete Watch List

> Compiled for SportSignal on 22 Nov 2026. All dates, hosts and champions verified via web
> research (FIFA, UEFA, CAF, AFC, CONCACAF, CONMEBOL, OFC, Wikipedia, ESPN) on that date.
> Companion machine-readable dataset: `national-tournaments.json`.
> Purpose: (1) the definitive list of every national-team tournament worth watching across all
> continents, and (2) an audit of what SportSignal currently covers, so nothing national-team
> level slips through.

---

## 1. The short answer

**~42 distinct national-team tournaments** are worth listing worldwide. They break down as:

| Category | Count | Events |
|---|---|---|
| Global flagship | 1 | FIFA World Cup |
| Continental championships (men) | 6 | Euro, Copa America, AFC Asian Cup, AFCON, Gold Cup, OFC Nations Cup |
| Continental Nations Leagues | 2 | UEFA Nations League, CONCACAF Nations League |
| Intercontinental / pan-regional | 3 | Finalissima, FIFA Arab Cup, Olympic football |
| World Cup qualifying | 6 campaigns | WCQ in each confederation + intercontinental playoffs |
| Regional (sub-confederation) | 9 | Gulf Cup, ASEAN Championship, SAFF, EAFF E-1, CAFA, WAFF, COSAFA, CECAFA, CHAN |
| Women's tournaments | 10 | WWC + 6 continental + Women's Nations League + Women's Finalissima + Olympic |
| Youth / age-group | 5+ | U-20 WC, U-17 WC, U-21 Euro, U-23 Asian Cup, continental youth |

Of these, roughly **12-14 are genuinely global "must-cover" events** (Tier 1-2 below); the rest are
high-value for specific audiences. For SportSignal's Persian/Gulf audience the priority set is
wider than a European product's: Asian Cup, Gulf Cup, CAFA, WAFF, Arab Cup, AFC WCQ and friendlies
matter as much as Euro or Copa America.

---

## 2. How to read this list

- **Tier 1** — global elite, unmissable for any audience.
- **Tier 2** — major continental championships and top Nations Leagues.
- **Tier 3** — intercontinental events, strong regional championships, women's flagship events.
- **Tier 4** — niche regional cups; cover them for the local audience, not for the world.
- **Watch rating** — 5/5 (watch every match) to 1/5 (score-check only).
- **SportSignal status**:
  - `OK-FD` — working today via football-data.org (free token).
  - `OK-SS` — working today via the sportscore day-fill (`INTL_DAY_CODES`).
  - `BROKEN` — configured in `CONFIG.INTL_COMPETITIONS` but the free FD token gets HTTP 403.
  - `MISSING` — no provider, no slug, nothing.
  - `FILTERED` — data exists upstream but SportSignal's hygiene law drops it by policy
    (currently: all women's and all youth rows — see section 8).

---

## 3. Global and intercontinental (men)

### 3.1 FIFA World Cup — Tier 1, 5/5 — `OK-FD`
- The pinnacle: 48 teams since 2026, 211 FIFA members enter qualifying.
- Last: 2026, USA/Canada/Mexico (11 Jun – 19 Jul) — **Spain beat Argentina 1-0 aet** at New York
  New Jersey Stadium for a second title.
- Next: **2030, Spain / Portugal / Morocco**, with three centenary opening matches in Uruguay,
  Argentina and Paraguay; all six hosts are already qualified. Expected June–July 2030.
- SportSignal: `WC` (FD id 2000), free tier, working. Emblem + COMP_EN entry exist.

### 3.2 FIFA World Cup Qualifiers — Tier 2, 4/5 — `MISSING`
- The biggest sustained national-team content stream in football — CONMEBOL's round-robin
  (Brazil-Argentina etc.) is arguably the best qualifying football anywhere.
- 2026 cycle complete. 2030 cycle: CONCACAF format announced (starts Sep 2027); CONMEBOL starts
  H2 2027; other confederations ramp up from late 2027.
- SportSignal: no FD competition on the free tier, no sportscore slug. football-data.org sells
  WCQ for UEFA/AFC/CAF/CONMEBOL/CONCACAF in paid tiers (OFC qualifying is not listed at all).

### 3.3 Finalissima (UEFA vs CONMEBOL champions) — Tier 3, 3/5 — `MISSING`
- 2022: Argentina 3-0 Italy. The 2026 edition (Spain vs Argentina, 27 Mar 2026, Lusail) was
  **cancelled** on 15 Mar 2026 due to the Middle East conflict. Next edition opportunistic/TBD.
- A one-off showcase, not a calendar fixture — cover when announced.

### 3.4 FIFA Arab Cup — Tier 3, 3/5 — `MISSING`
- 22 Arab nations from AFC + CAF; big following across MENA (relevant to a Persian audience).
- Last: Qatar, Dec 2025 — **Morocco beat Jordan 3-2 aet** (18 Dec 2025, Lusail), Morocco's 2nd title.
- Next: 2029.
- Not on football-data.org at all; would need sportscore or another source.

### 3.5 Olympic Games football — Tier 3, 3/5 — `MISSING` (and would be `FILTERED`)
- Men: U-23 + 3 overage; Women: full senior (see 6.9). Next: **Los Angeles 2028** (Jul–Aug 2028).
- football-data.org lists "Summer Olympics" in paid tiers. Note: SportSignal's
  `INTL_YOUTH_WOMEN_RE` filter drops U-23 rows — Olympic men's football would be filtered out by
  the current hygiene law even with a data source.

---

## 4. Continental championships (men)

### 4.1 UEFA European Championship (Euro) — Tier 1, 5/5 — `OK-FD`
- Last: 2024, Germany — Spain beat England 2-1.
- Next: **2028, UK & Ireland** (venues across England, Scotland, Wales and the island of Ireland),
  **9 Jun – 9 Jul 2028**. Qualifying draw: Belfast, 6 Dec 2026; group stage through 2027;
  playoffs March 2028 (12 group winners + 8 best runners-up join the hosts).
- SportSignal: `EC` (FD id 2018), free tier, working. The Euro *qualifiers* are a separate,
  paid-tier FD competition — currently not covered (see 8.2).

### 4.2 UEFA Nations League — Tier 2, 4/5 — `OK-SS`
- Biennial (league phase autumn of even years, finals the following June). Portugal won the
  2024-25 finals (June 2025).
- 2026-27: league phase concluded Nov 2026; **finals June 2027** — England, Spain and France have
  all registered hosting interest; host TBD.
- SportSignal: `UEFA_NL` sportscore slug, verified live in the day-fill (Nov 2026).

### 4.3 Copa America — Tier 1, 5/5 — `BROKEN` (priority gap)
- Last: 2024, USA — Argentina beat Colombia 1-0.
- Next: **2028** — host not officially confirmed; US hosting widely reported as expected
  (Nov 2026 reports), with Ecuador and a Uruguay-centred option having been candidates.
- SportSignal: configured as `COPA` (FD id 2029) but the free token gets **403 restricted** on
  every sweep. Not on any sportscore slug. High-priority gap.

### 4.4 AFC Asian Cup — Tier 2, 4/5 — `BROKEN` (priority gap)
- Asia's championship, 24 teams. Last: 2023 edition (played Jan–Feb 2024, Qatar) — Qatar beat
  Jordan 3-1.
- Next: **Saudi Arabia, 23 Dec 2027 – 21 Jan 2028** (postponed from Jan–Feb 2027, announced
  3 Nov 2026). 24 teams, 51 matches.
- SportSignal: configured as `AFC` (FD id 2092) but **403 restricted**. Not on football-data.org's
  public coverage page; no sportscore slug. High-priority gap for this audience.

### 4.5 Africa Cup of Nations (AFCON) — Tier 2, 4/5 — `OK-SS`
- Biennial, 24 teams. Last: 2025, Morocco (21 Dec 2025 – 18 Jan 2026): Senegal won the final 1-0
  on the pitch, but a CAF appeal ruling (March 2026) awarded the title to **Morocco** — record as
  "Morocco (on appeal)".
- Next: **2027 PAMOJA — Kenya / Uganda / Tanzania, 19 Jun – 17 Jul 2027** (first summer AFCON,
  70th anniversary; final qualification window March 2027).
- SportSignal: `AFCON_Q` sportscore slug (caf-africa-cup-of-nations), verified live (18 rows,
  Nov 2026) + broken FD id 2088 configured. Working for display.

### 4.6 CONCACAF Gold Cup — Tier 2, 3.5/5 — `MISSING`
- Biennial, 16 teams. Last: 2025, USA — **Mexico beat the USA** (two-time defending champions).
- Next: **17 Jun – 11 Jul 2027**, host TBA; Prelims March 2027; qualification via the
  2026-27 Nations League.
- Not on football-data.org; no slug. Gap.

### 4.7 CONCACAF Nations League — Tier 3, 3/5 — `OK-SS`
- 2026-27 edition: group phase 24 Sep – 5 Oct 2026; quarter-finals 12–17 Nov 2026 (just played);
  **Finals 25–28 Mar 2027 at SoFi Stadium** (Inglewood). Most recent champions: Mexico (Mar 2025).
- Doubles as Gold Cup qualification. SportSignal: `CONCACAF_NL` slug, verified live (Nov 2026).

### 4.8 OFC Men's Nations Cup — Tier 3, 2.5/5 — `MISSING`
- Oceania's championship; New Zealand dominant (won the 2024 edition in Fiji/Vanuatu).
- Next: **2028, Fiji, 3–16 Jul 2028** (qualifying hosted by Cook Islands in 2027).
- Not on football-data.org; no slug. Low urgency unless OFC audience exists.

---

## 5. Regional championships (men)

These decide nothing globally, but they are the passionate core of their regions — and several
are core audience events for a Persian/Gulf product.

| # | Tournament | Region | Frequency | Latest / Next | Tier | Status |
|---|---|---|---|---|---|---|
| 5.1 | Arabian Gulf Cup (Khaleeji) | Gulf (8 nations) | ~biennial | 27th: Saudi Arabia, 23 Sep–6 Oct 2026, **Saudi Arabia beat UAE 2-0**; 28th expected ~2028 | 3 | `MISSING` — the 27th ran with zero SportSignal coverage |
| 5.2 | ASEAN Championship (AFF, now ASEAN Hyundai Cup) | SE Asia | biennial | 2026: 24 Jul–26 Aug, **Vietnam beat Thailand 4-2 agg** (4th title); next 2028. Note: a new **FIFA ASEAN Cup** launched Oct 2026 — Division 1 won by Indonesia (beat Thailand on pens, Jakarta) | 3 | `MISSING` |
| 5.3 | SAFF Championship | South Asia | biennial-ish | Champions: India (2023, Bengaluru); next edition unannounced | 4 | `MISSING` |
| 5.4 | EAFF E-1 Championship | East Asia | biennial (odd years) | Last played 2025; Japan / Korea Republic dominate | 4 | `MISSING` |
| 5.5 | CAFA Nations Cup | Central Asia | biennial | 2025 (Uzbekistan): **Uzbekistan beat IR Iran 1-0**; Iran won the 2023 inaugural; next expected 2027 | 4 (Tier 2 for this audience) | `MISSING` — high priority: Team Melli plays here |
| 5.6 | WAFF Championship | West Asia | irregular | Last played 2019 (Iraq); future editions uncertain | 4 | `MISSING` |
| 5.7 | COSAFA Cup | Southern Africa | ~annual (Jun–Jul) | Zambia most successful historically | 4 | `MISSING` |
| 5.8 | CECAFA Cup | East/Central Africa | irregular | Long-running regional cup | 4 | `MISSING` |
| 5.9 | CHAN (African Nations Championship) | Africa (domestic-based players only) | biennial | 2024 edition played Aug–Sep 2025 in Kenya/Uganda/Tanzania — **Morocco 3-2 Madagascar** (record 3rd title); next TBD | 4 | `MISSING` |

---

## 6. Women's national tournaments

All currently `FILTERED`: SportSignal's hygiene law (`isSeniorMenName`) deliberately drops
women's rows from the intl feed ("senior men only, v1"). If covering women's football is a goal,
that filter plus a data source are both needed. The events themselves:

| # | Tournament | Frequency | Latest / Next | Tier |
|---|---|---|---|---|
| 6.1 | FIFA Women's World Cup | 4-yearly | 2023: Spain. **Next: Brazil 2027, 24 Jun – 25 Jul, 32 teams, 8 cities** (opens at the Maracana) | 1W |
| 6.2 | UEFA Women's Euro | 4-yearly | 2025 (Switzerland): **England beat Spain on pens** (Basel). Next: **Germany 2029** | 1W |
| 6.3 | UEFA Women's Nations League | biennial | 2025: Spain retained (3-0 agg v Germany, Seville). Next 2027 | 2W |
| 6.4 | Copa America Femenina | 4-yearly | 2025 (Ecuador): **Brazil beat Colombia 5-4 on pens** (9th title). Next 2029 | 2W |
| 6.5 | AFC Women's Asian Cup | 4-yearly | 2026 (Australia, March): **Japan beat Australia** in the final (3rd title). Next 2030 | 2W |
| 6.6 | Women's AFCON (WAFCON) | biennial (even years) | 2024 ed. (Jul 2025, Morocco): Nigeria (10th title). **2026 ed. (Aug 2026, Rabat): Cameroon beat Malawi 3-0 — first title**. Next 2028 | 2W |
| 6.7 | CONCACAF W Gold Cup | biennial | 2024 inaugural: USA champions. Next expected 2027 | 2W |
| 6.8 | OFC Women's Nations Cup | ~biennial | New Zealand the dominant force | 3W |
| 6.9 | Olympic women's football | 4-yearly | 2024: USA (Paris). Next: LA 2028 | 2W |
| 6.10 | Women's Finalissima | opportunistic | 2023: England beat Brazil (Wembley). Next TBD | 3W |

football-data.org carries only two of these (Women's World Cup, UEFA Women's Euro — paid tiers).

---

## 7. Youth and age-group

All currently `FILTERED` by the youth markers in `INTL_YOUTH_WOMEN_RE` (U16-U23).

| # | Tournament | Notes | Tier |
|---|---|---|---|
| 7.1 | FIFA U-20 World Cup | Biennial. Next: **Azerbaijan & Uzbekistan, 17 Sep – 9 Oct 2027** (25th edition; Canada and Mexico already qualified) | 3Y |
| 7.2 | FIFA U-17 World Cup | **Now annual**, 48 teams. 2025 (Qatar): Portugal beat Austria 1-0. **2026 edition LIVE NOW: Qatar, 19 Nov – 13 Dec 2026.** Qatar hosts the men's editions through 2029; Morocco hosts the women's editions 2025-2029 | 3Y |
| 7.3 | UEFA U-21 Euro | Biennial (odd years). England back-to-back champions (2023, 2025). Next 2027 | 4Y |
| 7.4 | AFC U-23 Asian Cup | Biennial; Olympic-cycle qualifier. Most recent: Saudi Arabia, Jan 2026 | 4Y |
| 7.5 | Continental U-20 / U-17 championships | All six confederations; the talent pipelines | 5Y |

---

## 8. SportSignal coverage audit (as of 22 Nov 2026)

### 8.1 Working today
- **football-data.org free tier (national):** `WC` (2000) and `EC` (2018) — both accessible with
  the current token.
- **sportscore day-fill (`INTL_DAY_CODES`):** `INTL_FR` (international friendlies), `AFCON_Q`
  (CAF Africa Cup of Nations — qualifiers now, finals in June-July 2027), `CONCACAF_NL`,
  `UEFA_NL`. Verified live in the repo's own audit (Nov 2026: 44 friendlies incl. Iraq–IR Iran,
  18 AFCON rows, 9 CONCACAF NL, 8 UEFA NL).
- Caveats by design: the day-fill is emptiness-gated (runs only when the club calendar is idle),
  scans only [today-1d, tomorrow], and is capped by the 44-metered subrequest budget. It fills
  the day hubs; it is not a long-horizon fixture feed.

### 8.2 Configured but broken — the free-tier trap
`CONFIG.INTL_COMPETITIONS` also lists `COPA` (2029), `AFCON` (2088) and `AFC` (2092). Verified
against the live API with the current token on 22 Nov 2026: **all three return HTTP 403
"restricted... check your subscription"**. They are paid-tier competitions (Free = 12 comps;
paid tiers = 30/50/100 comps). Consequences:
1. Copa America, Asian Cup and FD-side AFCON silently fail on every full sweep.
2. Each failure burns up to 2 retry subrequests (API_RETRY_ATTEMPTS=2) against the free tier's
   10 req/min quota — wasted budget on every sweep. Consider gating them on the FD plan or
   removing them until the token is upgraded.

### 8.3 Not covered at all (no provider, no slug)
Copa America (no fallback either — double gap), Gold Cup, OFC Nations Cup, all World Cup
qualifiers, Euro 2028 qualifiers (draw 6 Dec 2026, matches from March 2027 — calendar is about
to fill with these), Gulf Cup (27th edition ran 23 Sep–6 Oct 2026 with no coverage), ASEAN
Championship / FIFA ASEAN Cup, SAFF, EAFF E-1, CAFA (Team Melli's regional cup), WAFF, COSAFA,
CECEFA, CHAN, Arab Cup, Finalissima, Olympics, plus every women's and youth competition (policy
filter).

### 8.4 The notification gap (bigger than the data gap)
Per the repo's own comment in `config.ts` (INTL_COMPETITIONS): *"national teams never match the
followed clubs, so they can't notify."* National-team rows ride the pool and the day hubs, but
the bot's followed-club matching cannot fire for them. If the product goal is "users get alerts
for national-team matches", SportSignal needs a national-team notification path (e.g. a
national-team follow list / big-match broadcast tier for Tier 1-2 tournaments) independent of
club following.

---

## 9. football-data.org reference (national teams)

| Competition | FD code / id | Free token |
|---|---|---|
| FIFA World Cup | `WC` / 2000 | Yes |
| European Championship | `EC` / 2018 | Yes |
| Copa America | `CA` / 2029 (config key `COPA`) | No — 403 |
| Africa Cup of Nations | `AC` / 2088 (config key `AFCON`) | No — 403 |
| AFC Asian Cup | id 2092 (config key `AFC`) | No — 403 |
| UEFA Nations League | listed on coverage page | No |
| European Championship Qualifiers | listed | No |
| WC Qualification UEFA / AFC / CAF / CONMEBOL / CONCACAF | listed | No |
| AFCON Qualification | listed | No |
| UEFA Women's Euro | listed | No |
| FIFA Women's World Cup | listed | No |
| Summer Olympics | listed | No |

Not on football-data.org at all: Gold Cup, CONCACAF Nations League, OFC (men's or WCQ), AFC
Asian Cup is absent from the public coverage page (id exists behind the paywall), and every
regional cup, Arab Cup, Finalissima, youth and non-European women's tournament.

Paid tiers (monthly): Standard 49 EUR (30 comps, 60 calls/min, live scores, lineups),
Advanced 99 EUR (50 comps, 100 calls/min), Pro 199 EUR (100 comps, 120 calls/min). Which tier
unlocks which national-team competition is not published per-competition — confirm with
football-data.org before upgrading. Free tier also caps date ranges at 10 days per request.

---

## 10. Recommended actions (priority order)

1. **Fix Copa America + Asian Cup first** (Tier 1/2, user-stated requirements). Options:
   (a) upgrade the FD token and keep the existing config; or (b) add sportscore slugs to the
   day-fill (candidate slugs to verify live, following the repo's slug-verification convention:
   `copa-america`, `afc-asian-cup`). Either way, stop burning retries on 403s if staying free.
2. **Add a national-team notification path** (8.4) — otherwise "coverage" is website-only.
3. **World Cup qualifiers**: on FD these are paid-tier; sportscore slugs per confederation
   (candidates to verify: `world-cup-qualification-uefa`, `-afc`, `-caf`, `-conmebol`,
   `-concacaf`) or a fixtures-by-date source. Euro 2028 qualifiers start March 2027 — there is
   time, but the draw is 6 Dec 2026.
4. **Audience-specific adds for sportsignal.ir**: Gulf Cup (`arabian-gulf-cup` candidate),
   CAFA Nations Cup, FIFA Arab Cup, WAFF. The Gulf Cup 27th (Sep-Oct 2026) already slipped
   through uncovered.
5. **Gold Cup + Olympics + U-17 World Cup** (live in Qatar right now): decide product stance,
   then source. Note the U-23/Olympic and women's rows are dropped by the current hygiene law —
   relaxing it for specific competitions needs a deliberate decision (S20-6).
6. **If budget allows**: FD Standard (49 EUR/mo) unlocks Copa America, AFCON, WCQ, Euro
   qualifiers and UEFA NL with lineups/scorers — verify the exact competition list with
   football-data.org for the tier before paying.
7. **Women's football**: a growing, high-engagement vertical (Women's World Cup 2027 in Brazil
   is the next anchor). Requires both a source (FD has WWC + Women's Euro; others via sportscore)
   and relaxing the women's filter for chosen competitions.

---

## 11. Master table

| # | Tournament | Scope | Frequency | Next edition | Tier | SportSignal |
|---|---|---|---|---|---|---|
| 1 | FIFA World Cup | Global | 4-yearly | 2030 ESP/POR/MAR (+ centenary matches) | 1 | OK-FD |
| 2 | World Cup Qualifiers | Global (6 confeds) | 4-yearly cycle | from late 2027 (CONCACAF Sep 2027, CONMEBOL H2 2027) | 2 | MISSING |
| 3 | Euro (UEFA) | Europe | 4-yearly | 2028 UK & Ireland, 9 Jun–9 Jul | 1 | OK-FD |
| 4 | Euro Qualifiers | Europe | per cycle | draw 6 Dec 2026; matches 2027 | 3 | MISSING |
| 5 | UEFA Nations League | Europe | biennial | finals Jun 2027 (host TBD) | 2 | OK-SS |
| 6 | Copa America | South America | 4-yearly | 2028 (host TBA, USA expected) | 1 | BROKEN |
| 7 | AFC Asian Cup | Asia | 4-yearly | KSA, 23 Dec 2027–21 Jan 2028 | 2 | BROKEN |
| 8 | AFCON | Africa | biennial | PAMOJA KEN/UGA/TZA, 19 Jun–17 Jul 2027 | 2 | OK-SS |
| 9 | CONCACAF Gold Cup | N/C America | biennial | 17 Jun–11 Jul 2027 (host TBA) | 2 | MISSING |
| 10 | CONCACAF Nations League | N/C America | annual cycle | finals 25–28 Mar 2027, SoFi Stadium | 3 | OK-SS |
| 11 | OFC Nations Cup | Oceania | 4-yearly | Fiji, 3–16 Jul 2028 | 3 | MISSING |
| 12 | Finalissima | UEFA vs CONMEBOL | opportunistic | TBD (2026 edition cancelled) | 3 | MISSING |
| 13 | FIFA Arab Cup | Arab world | 4-yearly | 2029 | 3 | MISSING |
| 14 | Olympic football | Global | 4-yearly | LA 2028 (Jul–Aug) | 3 | MISSING/FILTERED |
| 15 | Arabian Gulf Cup | Gulf | ~biennial | 28th, ~2028 | 3 | MISSING |
| 16 | ASEAN Championship (+ FIFA ASEAN Cup) | SE Asia | biennial | 2028 (new FIFA ASEAN Cup: Oct 2026 inaugurated) | 3 | MISSING |
| 17 | SAFF Championship | South Asia | biennial-ish | TBD | 4 | MISSING |
| 18 | EAFF E-1 Championship | East Asia | biennial | 2027 | 4 | MISSING |
| 19 | CAFA Nations Cup | Central Asia | biennial | 2027 (expected) | 4 | MISSING |
| 20 | WAFF Championship | West Asia | irregular | TBD | 4 | MISSING |
| 21 | COSAFA Cup | Southern Africa | ~annual | 2027 | 4 | MISSING |
| 22 | CECAFA Cup | East Africa | irregular | TBD | 4 | MISSING |
| 23 | CHAN | Africa (domestic players) | biennial | TBD | 4 | MISSING |
| 24 | International friendlies | Global | windows | continuous (FIFA windows) | 3 | OK-SS |
| 25 | FIFA Women's World Cup | Global | 4-yearly | Brazil, 24 Jun–25 Jul 2027 | 1W | FILTERED/MISSING |
| 26 | UEFA Women's Euro | Europe | 4-yearly | Germany 2029 | 1W | FILTERED/MISSING |
| 27 | UEFA Women's Nations League | Europe | biennial | 2027 | 2W | FILTERED/MISSING |
| 28 | Copa America Femenina | South America | 4-yearly | 2029 | 2W | FILTERED/MISSING |
| 29 | AFC Women's Asian Cup | Asia | 4-yearly | 2030 | 2W | FILTERED/MISSING |
| 30 | Women's AFCON | Africa | biennial | 2028 | 2W | FILTERED/MISSING |
| 31 | CONCACAF W Gold Cup | N/C America | biennial | 2027 (expected) | 2W | FILTERED/MISSING |
| 32 | OFC Women's Nations Cup | Oceania | ~biennial | TBD | 3W | FILTERED/MISSING |
| 33 | Women's Olympic football | Global | 4-yearly | LA 2028 | 2W | FILTERED/MISSING |
| 34 | Women's Finalissima | UEFA vs CONMEBOL | opportunistic | TBD | 3W | FILTERED/MISSING |
| 35 | FIFA U-20 World Cup | Global | biennial | AZE & UZB, 17 Sep–9 Oct 2027 | 3Y | FILTERED/MISSING |
| 36 | FIFA U-17 World Cup | Global | annual | Qatar 2026 LIVE NOW (19 Nov–13 Dec) | 3Y | FILTERED/MISSING |
| 37 | UEFA U-21 Euro | Europe | biennial | 2027 | 4Y | FILTERED/MISSING |
| 38 | AFC U-23 Asian Cup | Asia | biennial | 2028 cycle | 4Y | FILTERED/MISSING |
| 39 | Continental U-20/U-17 championships | per confed | annual/biennial | continuous | 5Y | FILTERED/MISSING |
| 40 | FIFA Confederations Cup | Global | — | discontinued after 2017 | — | historical |
| 41 | FIFA Women's U-17 World Cup | Global | annual (from 2025) | Morocco hosts through 2029 | 4Y | FILTERED/MISSING |
| 42 | FIFA Futsal / Beach Soccer World Cups | Global | 4-yearly / biennial | separate disciplines | 5 | out of scope (11-a-side only) |

---

*Maintainer note: dates marked for 2027+ (Gold Cup host, Copa America 2028 host, UEFA NL finals
host, CAFA/EAFF/SAFF schedules) were unconfirmed at compile time — re-verify each confederation's
announcements quarterly. Sportscore slug names in section 10 are candidates, not verified —
verify live before wiring them in, per the repo's slug-verification convention.*
