# SportSignal — API & Data Efficiency Audit
## Discovery Specification + Agent Kickoff Prompt

**Purpose:** Perform a read-only, evidence-based audit of SportSignal's existing APIs, cached data, provider responses, and rendering pipeline. Identify useful football data that the system already possesses—or can expose from already-fetched/cached data—without materially increasing Cloudflare Worker CPU, subrequests, KV operations, scheduled work, or provider usage.

**This is an audit, not an implementation task.** The agent must not change application behavior, add endpoints, modify schemas, introduce provider calls, or deploy anything. The resulting report will be reviewed before the primary Match Centre specification is optimized.

**Repository:** `https://github.com/assadigit/sportsignal`  
**Application:** `https://sportsignal.ir/`  
**Expected architecture (verify against the current repository; do not assume it is unchanged):** a single Cloudflare Worker serving the website and Telegram bot, TypeScript without a frontend framework, Cloudflare KV, scheduled refreshes, and existing public-match caching/prewarming.

---

# Part 1 — Audit objectives

Answer these questions with source-code evidence:

1. What API endpoints exist today, including public, internal, bot-facing, administrative, diagnostic, and scheduled-job interfaces?
2. What data does each endpoint return, and which fields are actually consumed by the website, Telegram bot, or other clients?
3. What data is already fetched from football-data providers, stored in memory/KV/snapshots, normalized, or computed—but is not currently exposed in public responses or used by the Match Centre?
4. Which additional useful match-page data can be derived from existing cached payloads with negligible incremental cost?
5. Which potentially useful data is available only from an upstream provider, and what would it cost to obtain? Treat this as a separate, opt-in category—not a recommendation to fetch it.
6. Can any existing API response or cache be reused to improve Match Centre content, related fixtures, competition context, team form, standings, venue information, or match status without new provider requests?
7. What are the actual resource costs and limits of the current data pipeline?
8. What is the safest shortlist of improvements that adds useful information while staying within the existing operational envelope?

The report must distinguish **known and measured facts** from **inferences, hypotheses, and unknowns**.

---

# Part 2 — Non-negotiable safety and scope rules

## 2.1 Read-only operation

- Do not edit, create, delete, rename, or reformat project files.
- Do not modify API contracts, caches, KV keys, cron schedules, provider integrations, or frontend rendering.
- Do not add dependencies, scripts, endpoints, migrations, tests, or telemetry.
- Do not deploy, publish, push, commit, merge, or change Cloudflare configuration.
- Do not trigger production refreshes or administrative actions.
- Do not run load tests, stress tests, benchmarks that generate material traffic, or repeated live API requests.
- Do not make direct requests to paid/provider APIs merely to see what they return.
- Do not use production credentials, secrets, tokens, bot tokens, or private user data in the report.

You may run existing, safe, local inspection commands and tests if they do not mutate tracked files, contact external services, or trigger expensive work. If uncertain, do not run the command; explain why.

## 2.2 Resource protection

The audit must not increase production resource usage. Prefer static source inspection, local fixtures, existing logs/metrics if already available, and a small number of manually inspected public HTTP responses.

Do not:
- add polling or refresh loops;
- add new cron jobs or scheduled tasks;
- add upstream provider calls;
- add KV reads/writes;
- add Workers AI calls;
- introduce N+1 lookups;
- perform per-match repeated parsing or sorting where a shared cached result already exists;
- fetch a full season or competition dataset to populate a single match page;
- assume that an upstream field is free merely because it exists in a provider's API;
- recommend a new data source without estimating its request, CPU, storage, and freshness costs.

If a live request is necessary, use at most one request per relevant public endpoint, avoid cache-busting query parameters, and record the timestamp and response headers. Do not call private endpoints.

## 2.3 Repository integrity

- Inspect the current repository state and its instructions before analysis.
- Follow `AGENTS.md`, `README.md`, `docs/RUNBOOK.md`, and any more specific repository guidance.
- Do not assume file paths, endpoint names, data schemas, provider behavior, or deployment architecture from this document. Verify everything against the current code.
- Preserve unrelated functionality. This audit makes no code changes.
- Never print secrets. Redact credentials, authorization headers, cookies, private IDs, and sensitive environment values from all notes and output.

---

# Part 3 — Required investigation

## 3.1 Establish the actual architecture

Document:

- Worker entry point(s) and routing mechanism.
- Public website/API route registration.
- Internal, bot, admin, webhook, health, and diagnostic routes.
- Scheduled handlers and queue/consumer handlers, if any.
- KV namespaces and the logical purpose of each key family.
- Cache layers: in-memory, Cache API, KV, static snapshots, provider caches, stale-while-revalidate, prewarming, and client-side caching.
- Data flow from provider fetch → normalization → cache/storage → API response → website/Telegram rendering.
- Any data shared between the website and Telegram bot.
- Whether the Match Centre page is server-rendered, client-rendered, or assembled from a combination.

Produce a compact architecture diagram, preferably Mermaid, showing the actual data flow. Mark unverified edges as unknown rather than guessing.

## 3.2 Inventory every API endpoint

Create a complete endpoint inventory. Include routes even if they are not intended for public use, but do not invoke private routes.

For each endpoint record:

| Attribute | Required detail |
|---|---|
| Method + path | Exact route and HTTP method |
| Access | Public, internal, admin, bot, webhook, health/diagnostic |
| Handler | Exact source file and function |
| Purpose | What the endpoint is intended to do |
| Response shape | Top-level structure and important fields |
| Data source | KV, cache, provider, snapshot, computed, static, other |
| Freshness | TTL, stale window, refresh trigger, or unknown |
| Consumer | Website page/component, Telegram bot, external client, or unknown |
| Cost | Provider calls, subrequests, KV reads/writes, CPU-heavy work |
| Evidence | Source file and line/function references |

For endpoints with dynamic or large responses, do not paste full payloads. Describe schemas and provide a small redacted example only if necessary.

Identify:
- endpoints that duplicate the same data;
- endpoints that return more data than their consumers use;
- fields available in one endpoint but absent from another;
- endpoints that trigger work on request;
- endpoints that may cause repeated KV reads or provider calls;
- endpoints whose cache/freshness behavior is unclear.

## 3.3 Build a data-field inventory

This is the most important part of the audit.

Inspect:
- provider client response types and parsing;
- provider adapters and fallback logic;
- normalization/mapping functions;
- cached objects and serialized KV payloads;
- snapshots and prewarmed public payloads;
- public API response types;
- match detail page data assembly;
- frontend components and client-side fetches;
- Telegram message construction;
- standings, competition, team, venue, and fixture data already present in the repository.

For each useful field, classify it:

- **A — Already public:** currently returned by a public API.
- **B — Already cached/stored:** present in KV, a snapshot, or another cache, but not exposed in the relevant public response.
- **C — Already fetched in the same existing provider request:** present in the provider response already being fetched, but discarded or not normalized.
- **D — Cheaply derivable:** can be computed from existing cached data with negligible additional work.
- **E — Requires a new upstream request:** not currently available from the existing fetch/cache path.
- **F — Unknown:** insufficient evidence to classify.

Do not classify a field as A/B/C/D without source evidence.

Create a data catalogue with these columns:

| Data item | Example fields | Classification | Existing source | Current consumer | Potential Match Centre use | Freshness | Incremental cost | Confidence |
|---|---|---|---|---|---|---|---|---|

Investigate at least the following categories. Include only those actually supported by current data; mark unsupported or unknown categories clearly.

### Match identity and schedule
- Provider match ID (do not expose internal identifiers without checking whether they are safe/useful).
- Competition, season, stage, round/matchday.
- Kick-off timestamp, timezone handling, local date/time.
- Match status and status detail (scheduled, live, postponed, suspended, abandoned, finished, etc.).
- Venue name, city, capacity, coordinates, if already present.
- Neutral-ground flag.
- Matchday grouping and official competition-round membership.

### Teams
- Canonical team IDs and names.
- Short names, country, crest/logo paths.
- Existing hero/portrait asset mapping and availability.
- Home/away designation.
- Team season statistics already cached.
- Any existing club metadata that is reliable and safe to publish.

### Form and performance
- Recent results already present in current cached match history.
- Home-only and away-only form, if derivable from already available results.
- Goals for/against in the available sample.
- Clean sheets, scoring streaks, win/draw/loss sequence, if derivable.
- Head-to-head history, only if already stored/fetched.
- Clearly state sample size and date range. Never imply a complete season if the underlying sample is partial.

### Competition context
- Standings/table position, points, played, goal difference, if already available.
- Promotion/relegation/qualification labels only if grounded in existing competition rules/data.
- Competition round fixtures already included in the existing payload.
- Other same-round matches and their dates/statuses.
- Whether the current system has enough data to group same-round fixtures without another request.

### Match events and live data
- Goals, scorers, assists, cards, substitutions, penalties, VAR, half-time/full-time scores.
- Live minute/status and last-updated timestamp.
- Whether event data is already fetched, cached, or only available through an additional provider call.
- Whether event data is retained after a match finishes.

### Editorial and explanatory data
- Existing data suitable for a factual match briefing.
- Facts that can be computed deterministically from current data.
- Fields that would require editorial inference or external research.
- Do not generate predictions, betting advice, or unsupported claims.

### Venue and location
- Venue canonical name and city/country.
- Existing venue ID or mapping.
- Whether venue data comes from provider payloads, a local static map, or manual metadata.
- Whether venue artwork is already available.
- Do not invent stadium details, capacities, or venue identities.

### Media and assets
- Club crests, hero portraits, generic stadium artwork, venue illustrations, competition logos.
- Existing asset manifests and lookup functions.
- Asset dimensions, format, approximate size, caching headers, and whether assets are local/static or remote.
- Identify existing assets that can be reused; do not create or download assets.

## 3.4 Trace the existing Match Centre data path

Use the current sample route as a reference, but verify the current implementation and URL format from the repository.

Trace, step by step:

1. How a match URL is resolved to a match record.
2. Where the match record originates.
3. Whether the page reads from the public cached payload or a separate data source.
4. Which fields are used to render the hero, match facts, form, related fixtures, venue, and CTA.
5. Which fields are available in the source object but not rendered.
6. Whether the page makes additional client-side API requests.
7. Whether any page section causes additional provider/KV work.
8. How invalid, missing, postponed, and completed match records are handled.
9. Whether HTML is useful to search crawlers without executing JavaScript.
10. Whether Persian text, date, team names, and W/D/L values are transformed consistently.

Specifically check for the previously observed symptoms, without assuming their root cause:
- duplicated venue wording (for example, a repeated `ورزشگاه`);
- malformed Persian recent-form strings or W/D/L labels;
- repeated facts across the introductory copy and match-details sections.

Find the exact source of each symptom if it still exists. If it no longer exists, record that it is not reproducible in the current code or live response.

## 3.5 Identify low-cost, high-value data opportunities

Create a ranked opportunity list. The central question is:

**What can SportSignal show that is genuinely useful to a football fan, using data it already has, without increasing production workload in a meaningful way?**

For each opportunity, state:

- User value: what new question it answers for a visitor.
- Exact fields required.
- Whether the fields are A/B/C/D/E/F.
- Where the data already exists.
- Whether the data can be added to an existing cached payload or requires a new endpoint.
- Incremental Worker CPU estimate: negligible / low / medium / high, with reasoning.
- Incremental KV reads and writes: zero / one / multiple / unknown.
- Incremental provider requests/subrequests: zero / one / multiple / unknown.
- Response-size impact: negligible / low / medium / high.
- Freshness requirement.
- Failure/fallback behavior.
- Confidence and evidence.

Prioritize in this order:
1. Useful data already in the public response but not displayed.
2. Useful data already in the existing cached/prewarmed object but not returned.
3. Useful data already present in the same provider response and safely normalizable without another request.
4. Cheap deterministic calculations from existing cached data.
5. Anything requiring new upstream requests — list separately and do not recommend as a default.

Examples of opportunities to evaluate (not pre-approved features):
- competition round/stage context;
- other fixtures in the same official round, if already available;
- team form with transparent sample size;
- home/away form derived from the same cached match history;
- table position and points, if already cached;
- venue city and basic facts, if already available;
- last-updated/freshness information;
- live match events/status, only if already in the existing data pipeline;
- useful match facts that are currently hidden in API responses.

Do not recommend adding all of these. Recommend only what the repository proves is available and worthwhile.

## 3.6 Measure the current resource envelope

Use existing configuration, source code, existing logs/metrics, and safe local inspection. Do not create load.

Record what can be established about:

- Cloudflare Worker CPU time, if visible in existing logs/dashboards or test output.
- Number of upstream requests/subrequests per scheduled refresh.
- KV reads and writes per refresh and per public request, if measurable from code or existing telemetry.
- Cache hit/miss and stale-while-revalidate behavior.
- Existing cron frequency and the work done per tick.
- Existing provider rate limits and fallback behavior as documented in code/config/docs.
- Public API response sizes.
- HTML document size and major static asset sizes.
- Current cache-control/ETag behavior.
- Existing error, timeout, and retry behavior.

For every metric, label it as one of:
- **Measured:** obtained from a real existing measurement.
- **Counted:** statically counted from source or a known payload.
- **Estimated:** reasoned estimate with assumptions.
- **Unavailable:** not currently observable.

Do not invent precise CPU or KV figures from code inspection. If the system does not currently expose a metric, say so and suggest the lightest way to observe it later—but do not implement instrumentation.

## 3.7 SEO and public API relationship

This is a data audit, not a full SEO implementation audit. Still document:

- Which data is embedded in the initial HTML for a match page.
- Which useful facts are available only after client-side JavaScript.
- Whether the public API payload can support server-rendered match content without extra provider calls.
- Whether canonical match URLs and invalid-match behavior are consistent with the available data.
- Whether structured data could be generated from existing fields without guessing.
- Which data is too volatile or unreliable to put in indexable copy.

Do not promise Google rich results, ranking improvements, or indexing outcomes.

---

# Part 4 — Deliverables

Create exactly one report file in the repository root:

`SPORTSIGNAL-API-DATA-AUDIT.md`

Do not create or modify any other file.

The report must contain these sections:

1. **Executive summary** — concise findings and the most important conclusions.
2. **Repository and audit scope** — commit hash/branch inspected, date, instructions read, commands used, and limitations.
3. **Verified architecture** — concise diagram and explanation.
4. **Complete API endpoint inventory** — with source references.
5. **Data catalogue** — A/B/C/D/E/F classifications.
6. **Match Centre data-flow trace** — exact path from source to rendered HTML/client.
7. **Currently unused or underused data** — verified fields and their current locations.
8. **Low-cost opportunity matrix** — ranked by user value and incremental cost.
9. **Provider-only opportunities** — separate list with explicit request/cost implications.
10. **Resource and performance baseline** — measured/counted/estimated/unavailable labels.
11. **Data quality and correctness findings** — including Persian text, dates, venue names, missing fields, partial samples, stale data, and invalid match behavior.
12. **Caching and freshness analysis** — TTLs, stale behavior, prewarming, cache invalidation, and risks.
13. **Risks and unknowns** — what could not be proven.
14. **Recommendations** — conservative, prioritized, no implementation.
15. **Evidence appendix** — file paths, symbols, line ranges, safe redacted examples, and commands.

## Required recommendation format

Every recommendation must use this template:

| Field | Detail |
|---|---|
| Recommendation | Short name |
| User benefit | What useful question it answers |
| Data classification | A/B/C/D/E/F |
| Existing source | Exact object, endpoint, cache, or file |
| Required change (conceptual only) | What would eventually need to change |
| New provider requests | Exact expected incremental count, or unknown |
| New KV operations | Exact expected incremental count, or unknown |
| CPU impact | Negligible / low / medium / high / unknown + reason |
| Payload impact | Negligible / low / medium / high + reason |
| Freshness | Required and currently achieved |
| Risk | Data quality, staleness, privacy, or operational risk |
| Priority | P0 / P1 / P2 / Defer |
| Evidence | File/function/line reference |

A recommendation is not acceptable if its cost is simply labelled “low” without explaining why.

---

# Part 5 — Evidence and reporting standards

- Cite repository evidence with exact paths and line ranges wherever possible.
- Name exact functions, types, route definitions, KV key prefixes, cache keys, and provider methods.
- Separate code facts from runtime observations.
- For runtime observations, record timestamp, URL/route, status code, relevant headers, and a redacted response summary.
- Do not paste secrets, tokens, cookies, authorization headers, or private account data.
- Do not claim a field is cached unless you identify the cache/storage mechanism and write/read path.
- Do not claim a field is available from a provider unless its current integration/type/parser proves it.
- Do not infer provider API availability from documentation alone; classify documentation-only possibilities as unverified.
- Do not confuse a field being present in a raw provider response with it being retained in the normalized/cached object.
- Do not call an API field “free” unless it is already in the response from an existing request and does not require an additional request.
- If line numbers are unavailable, cite file paths and symbol names.
- Include confidence: High / Medium / Low.
- Include a “not checked” list so the next reviewer can see what remains unknown.

---

# Part 6 — Final decision gate

The audit is complete only when it answers:

1. What does the current system already know about each match?
2. Where is that information stored and how fresh is it?
3. What does the public match page currently show?
4. What useful information is currently hidden or discarded?
5. What can be exposed or derived at essentially zero additional provider/KV cost?
6. What would require additional provider requests or recurring work?
7. What are the actual current resource constraints and what is not measurable?
8. What are the best five low-risk opportunities, ranked by user value?
9. What should explicitly NOT be added because the cost or data-quality risk is unjustified?

**Stop after producing the report. Do not implement recommendations.** The report will be reviewed externally and used to revise the primary Match Centre specification.

---

# Part 7 — Agent kickoff prompt

Copy the prompt below into the coding agent after uploading this file to the repository root.

---

## START PROMPT — READ AND EXECUTE THE SPORTSIGNAL API & DATA AUDIT

You are working in:

`https://github.com/assadigit/sportsignal`

The repository root contains:

`SPORTSIGNAL-API-DATA-AUDIT-SPEC.md`

Read that entire file before doing anything else. Then inspect the repository's own instructions, especially:

- `AGENTS.md`
- `README.md`
- `docs/RUNBOOK.md`
- any more specific instructions relevant to API routes, providers, caching, Cloudflare Workers, or Match Centre rendering.

### Your mission

Execute the read-only audit defined in `SPORTSIGNAL-API-DATA-AUDIT-SPEC.md` and create exactly one output file:

`SPORTSIGNAL-API-DATA-AUDIT.md`

The goal is to give the product owner an accurate map of SportSignal's existing APIs and data, and identify genuinely useful information that could be exposed on match pages without materially increasing Worker CPU, KV operations, provider requests, cron work, or operational risk.

### Mandatory working rules

1. **Audit only. No implementation.** Do not change application source, configuration, dependencies, tests, assets, API schemas, cache behavior, or deployment settings.
2. Do not add endpoints, fields, KV keys, provider calls, cron jobs, telemetry, or background work.
3. Do not deploy, push, commit, merge, or publish.
4. Do not call private/admin APIs or trigger production refreshes.
5. Do not run load tests or repeated live requests. Prefer source inspection and existing evidence.
6. Never expose secrets or private data in the report.
7. Do not assume this specification's description of the architecture is still accurate. Verify it from the current repository.
8. Do not invent data availability, cache behavior, performance metrics, or provider capabilities.
9. Preserve unrelated functionality. Since this is read-only, the only permitted repository change is the single audit report file.
10. If you discover that a command would modify files, contact external services, or create material load, do not run it.

### Required process

**Step 1 — Establish baseline**
- Record current branch and commit hash.
- Check working-tree status before starting.
- Read repository instructions.
- Record the audit date and the exact commands you use.
- Do not overwrite or discard pre-existing user changes.

**Step 2 — Map the system**
- Find all route registration and handler code.
- Inventory public, internal, bot-facing, admin, webhook, health, and diagnostic endpoints.
- Map scheduled jobs and all provider integrations.
- Map KV/cache/snapshot/prewarm paths.
- Trace the data flow from upstream provider response to normalized objects, storage, public API, Match Centre HTML, client-side requests, and Telegram output.

**Step 3 — Catalogue data**
- Inspect provider types/parsers/adapters, normalized types, cache payloads, public API schemas, Match Centre rendering, and bot message builders.
- Build the A/B/C/D/E/F data catalogue defined in the spec.
- Identify fields that are fetched and then discarded, cached but not exposed, exposed but unused, or cheaply derivable.
- For every claim, identify exact source evidence.

**Step 4 — Evaluate cost**
- For every promising data opportunity, count or estimate incremental provider calls, subrequests, KV reads/writes, CPU work, payload growth, and freshness requirements.
- Separate genuinely zero-incremental-cost opportunities from opportunities that merely seem inexpensive.
- Do not present a static estimate as a measured runtime metric.
- Do not recommend new provider calls as if they were free.

**Step 5 — Trace Match Centre**
- Follow one representative valid match from route resolution to final HTML and any client-side requests.
- Check invalid/missing and relevant match-state handling from code; do not trigger production mutations.
- Investigate duplicate venue wording, malformed Persian form labels/sequences, and repeated facts if they still exist.
- Identify exact source/root cause when possible. If not proven, label it unresolved.

**Step 6 — Write the report**
Create only `SPORTSIGNAL-API-DATA-AUDIT.md` in the repository root.
Follow every required report section and table in the specification.
Make it useful to a non-technical product owner: explain the user value and operational trade-offs in plain English, while retaining enough file/function/line evidence for an engineer to verify each conclusion.

**Step 7 — Self-review**
Before finishing:
- Confirm that no application files were modified.
- Confirm that the only new/changed file is `SPORTSIGNAL-API-DATA-AUDIT.md`.
- Confirm that no secrets or private data appear in the report.
- Check that every A/B/C/D/E/F classification is evidence-backed.
- Check that every cost estimate explains its assumptions.
- Check that recommendations do not quietly require new provider requests or recurring work.
- Check that unknowns are explicitly labelled.
- Do not run a build or test if it would mutate files or contact external services; explain any skipped validation.

### Completion response

When finished, report:
1. The path to `SPORTSIGNAL-API-DATA-AUDIT.md`.
2. The commit hash and branch audited.
3. Confirmation that the audit was read-only apart from creating the report.
4. Confirmation that you did not deploy, push, commit, or merge.
5. A concise summary of the five best low-cost opportunities.
6. The most important unknowns or risks.
7. Any commands or checks intentionally skipped for safety.

**Do not start implementing the recommendations. Stop and wait for the product owner's review.**

---

**End of specification and kickoff prompt.**
