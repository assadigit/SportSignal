# Engineering Guardrails — SportSignal Match Centre

## 1. Default cost policy

The default implementation target is:
- **Zero incremental provider requests.**
- **Zero incremental KV operations.**
- No client-side polling or retries for missing live data.
- No new dependency unless demonstrably necessary and approved.
- No casual expansion of shared SEO pools or payloads.

Any proposed exception must include:
1. Exact data need and user benefit.
2. Current source availability.
3. Expected provider request, KV read/write, CPU, memory and payload cost.
4. Failure/stale behaviour.
5. Measurement and rollback plan.
6. Explicit product-owner approval before implementation.

## 2. Audit context — dated, must be reverified

Planning referenced an API/data audit based on commit `e4973cc`, live observation version `13.249-ranktip`, dated 9 November 2026.

The audit summary discussed:
- Match pages rendered server-side; data assembled from existing cached/KV paths rather than client API composition.
- Cloudflare Workers free-plan constraints, including a 10 ms CPU rolling budget, 1,000 KV writes/day cap, and subrequest ceilings.
- Prior CPU kills, quota exhaustion and subrequest-ceiling incidents.
- SEO pool JSON parse around 331 KB in the audited snapshot; pool growth taxes SEO routes and daily cron work.
- Existing caches mentioned included `matches_v13_tracked`, `public_matches_v1`, `cache:snapshot:v1`, `live_overlay_v1`, standings/venue caches, prewarm-only `live_detail_<id>`, SEO archive and HTML Cache API.
- The audit did not establish per-route CPU/KV amplification measurements, did not verify the deployed worker byte-for-byte, and did not run tests/install/Wrangler/KV/provider/load tests.
- Some health values were dated observations.

These are historical audit notes, not guarantees about current HEAD or current production. Locate and read the full audit file if available, then verify each relevant implementation detail against the current repository and deployment configuration. Do not assume the old cache names, limits or call graph remain unchanged.

## 3. Data and resilience rules

- Use only verified fields already available to the page.
- Missing data is not zero.
- Distinguish available, partial, temporarily unavailable, not applicable and stale-but-usable.
- Stale cached data may remain visible with a small contextual freshness label.
- Never imply stale data is freshly verified.
- No empty cards, fake zeroes, blank charts or empty image frames.
- Do not turn an empty dataset into a claim that no matches exist.
- No client retry/poll loop to repair missing data.
- A single unavailable optional dataset must not fail the whole page.

## 4. Existing low-cost opportunities noted in audit (verify first)

The dated audit discussed possible conditional improvements using already available data:
- Fix duplicate Persian venue text as a pure string correction.
- Show finished score/scorers when available in existing pool data.
- Add standings context using already-read standings.
- Group related fixtures by round/stage using existing similar-match data.
- Enrich form with home/away split and goals for/against from existing rows, with minimum sample gates.
- Show half-time score only if already available without meaningful extra cost.
- Existing hero portrait mapping covered a limited set of clubs; both portraits or neither.

Do not assume these opportunities remain safe or available without checking current HEAD.

## 5. SSR, caching and SEO

- Preserve the current SSR and cache architecture.
- Do not add per-route upstream fetches or per-page provider calls.
- Avoid pool growth; investigate shared payload impact before adding fields.
- SEO/schema must reflect visible verified facts.
- Partial data does not automatically mean noindex.
- Preserve existing route, canonical, metadata and cache behaviour unless a separately justified change is approved.

## 6. Performance and quality gates

Measure or inspect:
- Worker CPU and subrequests where available.
- KV reads/writes where observable.
- HTML response size.
- TTFB.
- Core Web Vitals / layout stability.
- Mobile rendering and interaction cost.
- SSR output and cache behaviour.
- Accessibility and RTL/LTR.

Do not claim a performance improvement without measurements. If production measurement is unavailable, state that limitation and use reproducible local or staging proxies.

## 7. Safety of changes

- Inspect current HEAD and working tree before editing.
- Do not overwrite unrelated user changes.
- Do not run destructive commands.
- Do not deploy, push, merge or commit unless explicitly requested.
- Avoid parallel agents modifying the same files or deploying concurrently.
- Keep changes small and reviewable.
- Add tests for data states and RTL/mobile behaviour where feasible.
- Report what was tested and what could not be tested.

## 8. Incremental implementation and release controls

- Follow `milestones-and-sessions.md` and `deployment-runbook.md`; do not implement the full page in one unreviewed pass.
- Every completed session must receive focused tests, relevant data/cost audit, diff review, an atomic commit and a push to the approved feature branch.
- Every completed milestone must receive a safe preview/staging deployment and smoke test where configured.
- Do not invent a preview target or command. If only production is configured, stop and ask for the release-target strategy in M0.
- Production deployment is gated at M10/S22 after release-candidate checks and owner approval. Do not expose partially implemented sections to production.
- Record commit SHAs, deployment identifiers, test outcomes and rollback details in repository logs. Never include secrets.
