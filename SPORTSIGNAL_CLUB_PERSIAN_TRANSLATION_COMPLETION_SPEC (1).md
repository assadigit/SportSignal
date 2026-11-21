# SportSignal — Club Persian Translation & Stadium Data Completion

**Document type:** Agent implementation specification  
**Repository:** `https://github.com/assadigit/sportsignal`  
**Target location:** Repository root  
**Primary objective:** Complete the existing local club-name translation data (and available stadium data) so match rendering does not need runtime AI translation or extra backend work.

---

## 1. Objective and product rationale

SportSignal displays upcoming football matches from European competitions. Some provider-supplied club names do not currently have reliable Persian equivalents in the repository. The current fallback/AI translation path creates avoidable work for a backend with limited resources.

Replace that repeated runtime work with a curated, static, repository-owned catalogue:

- Find and preserve all correct translations already present.
- Identify missing, incorrect, ambiguous, duplicate, or stale records.
- Research and add verified Persian club names and useful Persian aliases.
- Audit and complete current home-stadium data for the in-scope competitions, prioritising prominent clubs.
- Build a separate, controlled historical Champions League coverage layer.
- Keep runtime behaviour local and deterministic. The site must not need an AI request, search request, external fetch, or new provider request to translate a club name or retrieve its stored stadium name.

This is a **data-completion task**, not a redesign of SportSignal's match pipeline.

## 2. Non-negotiable constraints

1. **Inspect before changing.** Read the repository's current architecture, club/team data model, database and seed files, translation dictionaries, provider-name normalization, stadium fields, import scripts, runtime AI fallback, and tests before proposing edits.
2. **Preserve stable identity.** Never replace provider IDs, internal club IDs, competition IDs, foreign keys, or existing match references merely to improve a name.
3. **Preserve good data.** Do not rewrite a correct Persian name just to make it stylistically different. Record it as complete unless a sourced correction is justified.
4. **Do not create duplicate clubs.** Alternative spellings and short forms belong in the existing alias/search mechanism, not as duplicate club entities.
5. **No runtime research.** Internet access is for the one-time research and curation process only. Do not add runtime calls to Wikipedia, Persian media, search engines, translation APIs, LLMs, or new football-data providers.
6. **No unnecessary architecture changes.** Reuse the existing database/data structures and existing lookup path. Do not introduce a new service, queue, scheduled job, or runtime dependency for this work.
7. **Safe, idempotent data updates.** Re-running the import/build process must not duplicate rows or change already-correct data unexpectedly.
8. **Do not invent facts.** Unknown stadiums or uncertain translations must be flagged for review rather than silently guessed.
9. **Do not expose credentials.** Never copy personal access tokens, API keys, or secrets into source files, logs, reports, commits, or this specification.
10. **Keep scope bounded.** Do not bulk-add every European club. Follow the competition and historical scope below.

## 3. Scope

### 3.1 Current competitions — full coverage

Use the **current season at the time the agent runs**. Determine the season from the repository's own conventions and the official competition calendars. Do not hard-code a season year into permanent logic. At the time this specification was prepared (21 November 2026), the active season is expected to be 2026/27; verify this when executing.

| Country | Required competitions | Coverage target |
|---|---|---|
| England | Premier League, Championship, League One | Every current club |
| Italy | Serie A, Serie B | Every current club |
| Germany | Bundesliga, 2. Bundesliga | Every current club |
| France | Ligue 1 | Every current club |
| Spain | La Liga, LaLiga 2 / Segunda División | Every current club |

**English-tier interpretation:** This specification interprets “English 1-2-3 leagues” as the top three tiers of English men's football: Premier League, Championship, and League One. League Two is excluded unless the owner changes this scope.

Do not substitute league naming for the official competition identity. For example, League One is the third tier in England, while the Championship is the second tier. Preserve the repository's current competition IDs and naming conventions.

For each competition:

- Obtain its current club roster from an authoritative or high-quality source.
- Cross-check the roster against a second independent source where feasible.
- Compare that roster with SportSignal's current database and identify missing, extra, moved, duplicated, and stale club records.
- Record promotions/relegations and competition membership as season-specific facts. Do not treat a club's current division as permanent identity.

### 3.2 Champions League historical coverage — separate supplemental layer

Build a bounded historical catalogue using UEFA Champions League **main-competition participants** from the last 30 completed seasons. Use the 30-season window ending with the most recently completed season at execution time. Include the currently active season's participants separately if it has already started and reliable participation data is available.

The historical layer is intended to reduce future translation gaps when a club outside the current domestic scope qualifies for the Champions League.

Prioritisation:

1. **Highest priority:** Historical Champions League participants that are still active and currently play in the top two tiers of their domestic league.
2. **High priority:** Active historic participants currently near the top of their domestic division, recently promoted, or with a realistic route back to UEFA competition.
3. **Normal priority:** Other active clubs that appeared in the Champions League main competition during the 30-season window.
4. **Review/deferred:** Defunct, dissolved, merged, renamed, or very low-tier former participants. Preserve historical identity only where the current data model and SportSignal's actual historical fixture coverage require it. Do not create misleading active-club records for defunct entities.

Use the Champions League group-stage / league-phase / main-draw boundary consistently. Do not silently mix qualifying-round-only clubs into the main-competition dataset. Qualifying-only clubs may be added when they independently satisfy the active/high-priority criteria above; label their provenance clearly.

The agent must:

- Build a deduplicated list of clubs appearing in the defined seasons.
- Resolve historical naming changes and mergers carefully; retain distinct historical entities when they are genuinely distinct clubs.
- Match historical clubs to existing internal/provider IDs wherever possible.
- Add verified Persian names and aliases for selected clubs without changing unrelated historical match records.
- Report the number of unique clubs found, matched, already translated, newly translated, deferred, and unresolved.

### 3.3 Stadium coverage

Stadium data is part of this task, but it must not be allowed to derail the primary translation objective.

- **Full current coverage:** Audit and populate the current home stadium for every club in the current competitions in section 3.1, wherever a reliable source exists.
- **Prominent European clubs:** Audit stadium names for well-known current European clubs already in SportSignal's database, especially clubs likely to appear in the Champions League or major European competitions.
- **Historical Champions League layer:** Add stadium details only when the stadium is still relevant to an active club or SportSignal has a meaningful current use for the record. Historical stadium names can be recorded as notes/aliases only when the existing schema supports them.

For each stadium, capture only fields supported by the existing data model. Desired information, where supported:

- Official/current stadium name (source-language form).
- Established Persian rendering.
- City and country.
- Club association / current home status.
- Alternate or former name(s), only when useful for matching or recognition.
- Source URL and verification date in the audit/source report (not necessarily in the production database).

Do not assume a club plays in a stadium just because the venue shares its name. Verify shared grounds, temporary homes, relocations, stadium renovations, and sponsor-driven renamings. Prefer current official club or stadium information. If a current venue cannot be verified, leave it unresolved and explain why.

If the current database has no stadium field or data structure, do not create a broad schema migration without first documenting the smallest compatible option. Prefer an additive static mapping keyed by the existing stable club ID and integrated into the current local lookup path. Do not key the mapping solely by translated or English display names.

## 4. Repository-first audit (mandatory first phase)

Before editing production data, inspect and document:

- Where club entities are stored and how they are keyed.
- Which data is persistent database content versus seed/static JSON/TypeScript/Go/Python data.
- Which football-data provider(s) supply club IDs and names.
- How provider names are normalized or matched to internal clubs.
- Existing Persian translation fields, aliases, fallback logic, and lookup order.
- Whether translation currently calls an AI model or any remote service; locate all call sites and determine exactly when they run.
- Existing stadium fields, stadium translation data, and all stadium consumers.
- Import/seed/migration scripts, test fixtures, validation scripts, and deployment behaviour.
- Any caching or lookup assumptions that could be affected by adding aliases or fields.

Do not infer the schema from filenames alone. Follow the actual read/write path from provider input through normalization, database lookup, and Persian rendering.

### 4.1 Baseline audit output

Create an audit report before modifying the data. For each relevant club, record as many of these columns as the repository allows:

- Internal club ID.
- Provider ID(s).
- Official/provider English name.
- Country.
- Current competition and season (for current-scope clubs).
- Existing Persian canonical name.
- Existing Persian aliases.
- Existing stadium name and Persian stadium name, if any.
- Classification: `correct`, `missing`, `incorrect`, `ambiguous`, `duplicate`, `stale`, or `needs_review`.
- Reason for the classification.
- Source evidence for any proposed correction.

The report should separate current-scope clubs, historical Champions League clubs, and stadium records. Keep this report in an appropriate existing data/audit location; avoid scattering temporary files through the repository root.

### 4.2 Audit the runtime AI fallback

Identify whether the current AI translation path is:

- Triggered on every render/request, only on cache misses, or by a background job.
- Persisting the result to the database or returning it transiently.
- Repeated for alternate provider spellings of the same club.
- Used by any non-match feature that must remain functional.

The intended final state is that all in-scope club names are resolved from local curated data. Do not remove a fallback blindly if it is also used by unrelated features. After static coverage is complete, propose the safest way to disable, bypass, or retain the fallback only for out-of-scope names. Do not introduce an aggressive runtime failure for a rare unknown club.

## 5. Research and Persian naming rules

### 5.1 Source hierarchy

Use sources in this order, taking account of what each source can actually prove:

1. Official club, league, federation, or stadium website for official identity, competition membership, and current venue.
2. Established Persian football media for how the club or stadium is commonly named in Persian. Examples to search include Varzesh3, Tarafdari, Football360, and other reputable Persian sports publications.
3. Persian Wikipedia, preferably where the article is well maintained and its references support the name.
4. Reputable international football databases and encyclopaedias for identity, history, and cross-checking.
5. General web search only as a discovery aid; follow the result to the original source before treating it as evidence.

For a Persian canonical name, seek at least one credible Persian-language usage source and preferably two independent sources. An official English name or English Wikipedia page does not, by itself, prove the established Persian rendering.

Do not use Google Translate, browser auto-translation, or raw machine transliteration as the sole authority for a canonical name. They may help generate candidates but cannot validate them.

### 5.2 Choosing the canonical Persian name

The canonical name should be the Persian form that a Persian football audience is most likely to recognise, not necessarily a literal translation of every word in the English name.

- Prefer established usage in reputable Persian football media.
- Preserve recognisable club identity and naming convention.
- Transliterate proper nouns naturally into Persian; do not mechanically translate words such as “United”, “City”, “Town”, “Athletic”, “Rovers”, or “Wanderers” unless established Persian usage does so.
- Preserve distinctions between clubs with similar names (for example, city-based clubs and reserve/youth teams).
- Do not invent a familiar short form that is not used by credible Persian sources.
- Use the same canonical spelling consistently for the same club across competitions and provider-name variants.

### 5.3 Persian orthography and aliases

Follow the repository's existing Persian normalization conventions. At minimum, inspect and consistently handle:

- Persian Yeh (`ی`) and Kaf (`ک`) versus Arabic code points.
- Arabic/Persian digits and punctuation according to existing project conventions.
- Extra spaces, non-breaking spaces, and zero-width non-joiner where appropriate.
- Unicode normalization and duplicate detection.
- Mixed Persian/Latin strings, abbreviations, and punctuation.

Store:

- **Canonical name:** One preferred Persian display name per club.
- **Aliases:** Only meaningful, evidenced Persian alternatives that users or provider feeds may use (short names, common media variants, established spellings, and genuinely common abbreviations).

Aliases must resolve to the same stable club ID. Do not create aliases that are too generic, collide with another club, or could plausibly match several clubs without context. Keep English/provider variants in the existing normalization mechanism if that is where they belong; do not mix them into Persian alias fields unless the current design explicitly does so.

### 5.4 Confidence and evidence

For each newly researched name, retain source URLs and a confidence status in the audit report:

- `verified`: credible Persian-language evidence, ideally corroborated independently.
- `probable`: one credible Persian source or strong consistent usage, but limited corroboration.
- `uncertain`: conflicting sources, no credible Persian usage, or transliteration inferred by the agent.

Only `verified` entries should be silently promoted to the production canonical dataset. `probable` entries may be added only if the current data schema supports a review status or if the audit report clearly marks them for human approval. Keep `uncertain` entries out of the verified production map; present proposed forms in a separate review queue.

Do not fabricate source quotations. Store URLs, source titles, access dates, and a concise explanation of the evidence.

## 6. Current-season roster verification

For each competition in section 3.1:

1. Find the official current-season club list/table/fixtures from the league or governing body.
2. Cross-check with one independent source (for example, a reputable football database, current-season squad/fixture listing, or established sports publication).
3. Build the expected roster from stable club identities, not display names alone.
4. Compare expected roster with the repository's provider/database records.
5. Resolve promotions/relegations, renamed teams, reserve teams, and provider naming differences.
6. Record the source and verification date.

Do not use a generic third-party list as the sole source for final roster membership if an official competition source is available. A source such as FootballSquads' current-season index can be useful as a discovery/cross-check starting point, but verify final membership from official competition sources.

## 7. Data model and implementation requirements

The agent must adapt to the repository's real schema. The following is conceptual, not a mandate to rename or redesign existing fields.

| Concept | Required behaviour |
|---|---|
| Stable club identity | Preserve current internal/provider IDs and relationships |
| Canonical Persian name | One verified display value per club |
| Persian aliases | Zero or more alternate names resolving to that same club |
| Official/provider names | Preserve current provider matching/normalization behaviour |
| Stadium identity | Store current venue against the stable club identity, where schema supports it |
| Provenance | Keep source URL and verification evidence in an audit/source artefact; production schema changes are optional and should remain minimal |
| Historical status | Distinguish active/current clubs from historic-only entities where the current schema supports it |

Implementation rules:

- Prefer additions/updates to existing seed/static data and local DB records.
- If a migration is required, make it additive, reversible where feasible, and compatible with current deployed data.
- Make import scripts deterministic and idempotent.
- Never use a club's Persian name as its primary key.
- Do not rely on fuzzy matching as the only mechanism for provider-name resolution.
- Detect and report alias collisions before importing.
- Keep all added data local to the existing application/database path.
- Do not add large libraries or services for simple catalogue updates.

## 8. Recommended work phases

### Phase A — Audit only

- Inspect repository and data flow.
- Export the existing club translation and stadium inventory.
- Build current-season expected club lists.
- Build the historical Champions League club candidate list.
- Produce coverage, mismatch, duplicate, and uncertainty reports.
- Report the exact location and conditions of the current AI translation fallback.

**Do not make production data changes until the audit is complete.** The agent should summarise the findings and a concrete edit plan in its work log/PR description before proceeding.

### Phase B — Research and curate

- Research missing/incorrect canonical Persian names.
- Research aliases separately from canonical names.
- Verify current stadiums and Persian venue names.
- Resolve club identity and historical naming carefully.
- Prepare a machine-readable change set with source evidence and confidence classifications.
- Keep uncertain entries in a review file.

### Phase C — Apply static data changes

- Apply only validated additions/corrections.
- Preserve IDs, existing correct data, and unrelated features.
- Add the historical Champions League coverage as a separate tagged group/source if the schema permits; otherwise keep the grouping in the audit artefact without complicating runtime data.
- Populate the supported stadium fields or the smallest compatible stable-ID mapping.
- Do not remove the generic AI fallback until its other uses and residual out-of-scope behaviour have been understood.

### Phase D — Validation

Run all applicable existing tests, import checks, type checks, linters, and build commands discovered in the repository. Add focused validation tests for the new data.

Minimum checks:

- Every current in-scope club maps to exactly one stable club identity.
- Every current in-scope club has a non-empty verified Persian canonical name, unless an explicitly documented unresolved case remains.
- All aliases resolve to the intended club and do not ambiguously collide with another club.
- No duplicate club rows or accidental duplicate IDs are introduced.
- Existing correct translations remain unchanged unless a sourced correction is documented.
- Current stadium data is present for every reliably verifiable current in-scope club; every omission is listed with a reason.
- Historical Champions League records are deduplicated and correctly separated from current competition membership.
- Provider name variants still resolve to the right clubs.
- No new runtime AI, translation API, search-engine, Wikipedia, or upstream football-provider calls are introduced.
- No extra per-match or per-page backend request is introduced.
- The build and tests pass.

Add a test or static validation script that can be rerun after future seasons' roster refreshes. It should report missing translations rather than silently invoking an AI service.

## 9. Deliverables

The completed work must include:

1. **Baseline audit report:** existing translation/stadium coverage and discovered runtime fallback behaviour.
2. **Coverage report:** totals by country/competition, with counts for complete, missing, corrected, uncertain, and unresolved.
3. **Historical Champions League report:** 30-season window, participant source, unique club count, active/inactive classification, current domestic tier where known, and translation coverage.
4. **Stadium report:** verified current venues, Persian renderings, source links, and unresolved cases.
5. **Source/evidence file:** source URL, source title, verification date, affected stable club ID, field verified, and confidence/reason.
6. **Production data changes:** canonical Persian names, supported aliases, and stadium fields/mapping.
7. **Validation:** tests/scripts executed and their results.
8. **Runtime impact note:** confirm exactly how the work reduces or bypasses runtime AI translation and confirm that no new external requests have been added.
9. **Uncertainty queue:** all conflicting, low-confidence, and unresolved entries, kept out of verified production data unless the schema explicitly supports a review state.

In the final summary, report exact counts. Do not claim “complete” without stating the population used as the denominator and listing unresolved exceptions.

## 10. Completion criteria

This task is complete when:

- Every club in the current in-scope competitions for the verified season has a correct, locally stored Persian canonical name or is explicitly listed as unresolved with evidence.
- Useful, non-conflicting Persian aliases are added where supported by actual usage.
- Current stadium names are populated for all reliably verifiable current in-scope clubs, with gaps disclosed.
- The defined historical Champions League catalogue is built, deduplicated, and populated according to its priority rules.
- The existing application lookup resolves names locally without making translation/search/provider requests for covered clubs.
- Stable IDs, match rendering, database integrity, and unrelated features remain intact.
- Tests/build checks pass, and audit/source/coverage reports are delivered.

## 11. Useful research starting points

These are discovery starting points, not blanket approval to trust a page without checking it:

- Official competition websites: Premier League, English Football League, Lega Serie A, Lega B, Bundesliga, Ligue 1, LFP, LaLiga, and UEFA.
- UEFA Champions League official competition history and club records: `https://www.uefa.com/uefachampionsleague/`
- Current-season multi-league discovery index: `https://www.footballsquads.co.uk/squads.htm` (cross-check against official league sources).
- Persian football media: `https://www.varzesh3.com/`, `https://www.tarafdari.com/`, and `https://football360.ir/` (use actual article/team pages as evidence, not search snippets alone).
- Persian Wikipedia: `https://fa.wikipedia.org/` (check page quality and citations).
- English Wikipedia and reputable international databases may help identify official names/history, but they do not by themselves validate Persian usage.

---

## 12. Launch prompt for the coding agent

You are working in the existing SportSignal repository. First read `SPORTSIGNAL_CLUB_PERSIAN_TRANSLATION_COMPLETION_SPEC.md` at the repository root from beginning to end.

Follow the specification exactly. Begin with a repository-first audit; do not assume the database schema, translation-file location, provider IDs, or runtime AI behaviour. Trace the real data path from provider club name to stable club identity to Persian display output. Produce the baseline audit and a concise implementation plan before changing production data.

Then research the current club rosters and Persian names using official competition sources and credible Persian-language sources. Complete the in-scope current competitions, audit current stadiums, and build the separate 30-year Champions League historical catalogue using the prioritisation and confidence rules in the specification. Preserve every stable ID and every correct existing translation. Put uncertain cases in a review queue instead of guessing.

Implement the smallest compatible, deterministic, local-data-only changes. Do not add runtime AI translation, web requests, search-engine requests, new provider calls, scheduled jobs, or unnecessary schema redesign. Do not remove an existing fallback until you have verified all of its call sites and documented the effect on out-of-scope clubs and unrelated features.

Run the repository's relevant tests, validation, and build commands. Add a repeatable check for future missing translations. Deliver the baseline audit, coverage reports, Champions League report, stadium report, source/evidence file, uncertainty queue, implementation diff, test results, and a precise runtime-impact summary.

If a requirement cannot be met from the available data or reliable sources, do not fabricate a value. Document the gap, why it is unresolved, and what evidence would be needed. Preserve unrelated functionality and keep the changes focused on club translation and stadium data.
