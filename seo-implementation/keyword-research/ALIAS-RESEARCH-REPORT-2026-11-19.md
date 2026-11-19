# Persian Club-Alias SEO Research Report — 2026-11-19

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

- **Task:** `PERSIAN-CLUB-ALIAS-SEO-SPEC.md` (repository root, v1.0, 2026-11-19) — Persian club-alias + match-intent SEO coverage.
- **Method:** repository-first audit (spec §3) of the real checkout + the EXISTING keyword research; every figure below was machine-derived this session from the source files listed; nothing was hand-estimated; no search-volume tool was ever available (GSC impressions are site impressions, not market volume).
- **Companion deliverable:** `ALIAS-KEYWORD-RESEARCH-2026-11-19.csv` (additive, 34 rows) + the generator `scripts/extract-alias-evidence.js` / `scripts/build-alias-keyword-csv.js`.

## 1. Source files actually used

| Source | What it supplied | Verified state |
|---|---|---|
| `seo-implementation/keyword-research/VALIDATED-KEYWORD-MAP.csv` | 369 unique rows; 198 GSC-observed (2026-11-15 export, `Queries.csv` site metrics); 38 Autocomplete-validated (post-dedupe); 133 Research-candidates; 20 hold rows | Read-only; **never overwritten** (additive file created instead) |
| `seo-implementation/keyword-research/EVIDENCE-LOG.md` §A2 | The 20-head Google Suggest run (fa/IR, hl=fa gl=IR, 2026-11-16, 177 completions) — the ambiguity evidence («بازی بعدی اینتر» → اینتر میامی / اینترنت before اینترمیلان) + «ساعت بازی بارسلونا و پاریسن ژرمن» | Read-only |
| `seo-implementation/keyword-research/SERP-SAMPLES.md` | Position reality («بازی بعدی بارسا» 9.97 / «بازی بعدی بارسلونا» 9.99 / «بازی بعدی بایرن مونیخ» 7.49; «بارسلونا مقابل منچستر سیتی ۲۰۲۶» 3.25 — the match template is the strongest surface) | Read-only |
| `src/fa-dict.ts`, `src/teams.ts`, `src/slugs.ts`, `src/seo/team-names.ts`, `src/seo/jsonld.ts`, `src/seo/pages.ts`, `src/seo/data.ts`, `src/seo/config.ts` | The canonical Persian names, the normTeamKey folds, the TEAM_SLUGS canonical URLs (incl. the live provider-derived `internazionale-milano` / `club-atletico-de-madrid`), the S11 `SEO_EXTRA_ALIASES` pattern, the JSON-LD wiring, the 13-club selected-team allowlist (`CONFIG.BIG_TEAMS_BY_LEAGUE` PL/PD/SA/FL1/BL1 via `isSelectedTeam`) | Audited in full |
| `docs/DECISIONS.md`, `docs/HANDOFF.md`, `seo-implementation/FINAL-SEO-IMPLEMENTATION-REPORT.md` §4 | The freeze/gate status | See §5 |

**Data ranges/locale:** GSC export 2026-11-15 (16-month window per the program's baseline), autocomplete 2026-11-16, locale fa-IR (Iran = 98.4% of clicks; Mobile = 94.8% per the GSC country/device reports recorded in the monitoring view).

## 2. Verified alias dictionary (evidence-labelled)

Counts machine-derived this session (`scripts/extract-alias-evidence.js` → `scripts/alias-evidence.json`):

| Club (canonical URL) | Accepted alias | Evidence | Ambiguity |
|---|---|---|---|
| FC Barcelona `/teams/barcelona` | بارسا | GSC 21 rows / 245 impr («بازی بعدی بارسا» 179 impr pos 9.97 — the S11 anchor) | unambiguous |
| Real Madrid `/teams/real-madrid` | رئال | GSC «بازی رئال بعدی» + «تاریخ بازی ارسنال و رئال» + «بازی رئال و آرسنال کی است» (5 impr in club context; رئال مادرید rows total 322 impr) | entity-scoped only (بتیس/سوسیداد autocomplete collisions) |
| Bayern `/teams/bayern-munich` | بایرن | GSC «بازی بعدی بایرن» 16 impr pos 7.94 + «برنامه بازی بایرن» 4 impr | unambiguous |
| Man City `/teams/manchester-city` | من سیتی + منچستر سیتی | GSC «بازی بعدی من سیتی» 2 impr; منچستر سیتی 7 rows / 286 impr | unambiguous (the bare منچستر is NOT) |
| Arsenal `/teams/arsenal` | ارسنال (no-madda) | GSC «بازی بعدی ارسنال» 10 impr + «تاریخ بازی ارسنال و رئال» 3 impr | unambiguous |
| Inter `/teams/internazionale-milano` | اینتر + اینترمیلان | GSC «بازی بعدی اینتر» 22 impr pos 9.41 + «بازی بعدی اینترمیلان» 22 impr pos 8.82 | AMBIGUOUS bare اینتر (Miami/اینترنت) — entity-scoped + competition-qualified unlocks only |
| AC Milan `/teams/ac-milan` | میلان | GSC «بازی بعدی میلان» 6 impr + «بازی میلان» 1 impr | AMBIGUOUS bare میلان (city / Inter compound) |
| PSG `/teams/paris-saint-germain` | پی‌اس‌جی + پاریسن ژرمن | GSC «لو آور مقابل پی‌اس‌جی» 16 impr; autocomplete «ساعت بازی بارسلونا و پاریسن ژرمن» | پاریس bare is NEVER an alias |
| Dortmund `/teams/borussia-dortmund` | بروسیا دورتموند | GSC «بروسیا دورتموند مقابل رئال بتیس» 11 impr (دورتموند is already canonical, 19 impr) | unambiguous |
| Liverpool, Chelsea, Atlético, Man United | none | لیورپول/چلسی ARE the canonical names with no evidenced variant; اتلتیکو 4 impr always as the full اتلتیکو مادرید; من یونایتد/منچستریونایتد 0 rows | منچستر bare NEVER resolves |

**Deferred (research-only, NOT production):** بارسلنا (1 impr misspelling), رئال‌مادرید/بایرن‌مونیخ/آث‌میلان/پاری‌سن‌ژرمن (ZWNJ joins, 0 rows), پی اس جي spaced + Latin PSG (0 rows in fa), بوروسیا دورتموند (0 rows), من یونایتد (0 rows).

**Ambiguity decisions (spec §7.3):** اینتر، میلان، منچستر، پاریس، اتلتیکو — none globally assigned; each unlocks only with its compound qualifier or (اینتر only) the European-only UCL phrase «لیگ قهرمانان اروپا» (the validated map targets that exact autocomplete row at the Inter page; a generic cup phrase like «لیگز کاپ» unlocks nothing — Inter Miami plays cups too).

**Excluded-intent register (spec §5.9, observed in data):** ساعت پخش زنده فوتبال، ساعت بازی بارسلونا امشب پخش زنده، ترکیب رئال مادرید/اسپورتینگ … (lineup), بلیت رئال مادرید … (ticketing), مکان تماشای … (101 + 72 impr — watch-where intent deliberately not targeted). Recorded in the CSV with the exclusion reason; never targeted with promises.

## 3. What already existed (no duplication)

- The S11 `SEO_EXTRA_ALIASES` mechanism (Barcelona «بارسا» only) — this task EXTENDED the same map rather than creating a parallel one.
- The keyword-to-URL one-destination law + the 369-row validated map + the cannibalization policy (`KEYWORD-TO-URL-MAP.md` §1.1: spelling/ZWNJ/digit variants are absorbed by on-page wording per cluster, never by new URLs).
- The `SEO_TEAM_NAME_OVERRIDES` layer (Leipzig/Nordsjaelland/Roma) — untouched.
- The FAQ contract (`buildTeamFaqItems` — «بازی بعدی X کی است؟» already rides both the visible team page and the FAQPage JSON-LD; a new alias FAQ would violate "do not add FAQ questions just to repeat synonyms").

## 4. Gaps found and closed

1. The alias map covered only Barcelona; 8 more evidenced clubs now ride it (Real, Bayern, City, Arsenal, Inter, AC Milan, PSG, Dortmund).
2. No query-side resolver existed: `src/seo/persian-alias.ts` adds the ambiguity-guarded entity resolution (spec §7.3) — a self-contained static module, zero imports, not wired into any request path (research/QA tooling + future use per the repository's own freeze discipline).
3. The research dataset had no alias-labelled additive layer: `ALIAS-KEYWORD-RESEARCH-2026-11-19.csv`.

## 5. Freeze/gate status (re-verified, not assumed)

- The **Dec 4–8, 2026 GSC measurement freeze HOLDS** (today is Nov 19; `HANDOFF.md` standing limits: "the Dec 4-8 freeze HOLDS"; `FINAL-SEO-IMPLEMENTATION-REPORT.md` §4 lists the byte-frozen surfaces; DECISIONS S15-2: "the session runs before Dec 9, the Dec 4-8 freeze HOLDS").
- **Respected:** the aliases ride the JSON-LD `alternateName` arrays ONLY — the same freeze-safe class as S11 (machine-readable, not a SERP-snippet byte). Verified by gate: the visible `faName` bytes, the team-page title/H1 ladders, and `fa-dict.ts` are byte-identical (`git diff` = zero bytes in those files).
- **No deploy performed** (also avoiding the Nov 20 Bayern–Köln no-deploy windows; work is committed + pushed only — see the implementation report).

## 6. Priority rationale

The A++/A+/A tiers from the spec §4 match the repository's own GSC shape: Barcelona (245 alias-cluster impr) and Real Madrid (341) dominate; Bayern (80) and the Manchester pair (286 combined, mostly City) lead A+; the rest follow the map's observed impressions. Tiers are implementation priorities, not market-volume claims.

## 7. Gaps and uncertainties

- PSG's Latin acronym `PSG` and the spaced «پی اس جي» have ZERO rows in the current export — the Persian «پی‌اس‌جی» form is the only evidenced acronym; the Latin form rides the fa-dict provider key, not this map.
- «بایرن» evidence is next-match-cluster only (20 impr direct); no bare-alias GSC row exists for any club (all rows are intent phrasings) — bare-alias demand is inferred from the phrasing evidence + autocomplete, never presented as measured.
- Matchup alias pairs resolve to fixtures only through the existing pool participants + date (the resolver returns the pair; the fixture eligibility stays with the existing match-lifecycle rules — no hypothetical URLs).
