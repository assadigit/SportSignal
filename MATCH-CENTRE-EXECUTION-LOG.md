# SportSignal Match Centre — Execution Log

Append a dated section after every completed session. Preserve all earlier records. Keep entries factual; never include secrets.

## Session entry template

### Sxx — Session title
- Date:
- Milestone:
- Starting commit:
- Ending commit:
- Branch:
- Scope:
- Files changed:
- Implementation summary:
- Tests/checks and outcomes:
- RTL/mobile/desktop verification:
- Data/cache/provider/KV/CPU audit:
- Performance observations:
- Commit SHA:
- Push result:
- Preview/staging deployment (milestone end only):
- Deployment URL/ID:
- Smoke-test result:
- Known issues:
- Approval/gate:
- Next session:

## Deployment entry template

### Mx preview/staging deployment
- Date/time:
- Environment:
- URL:
- Deployment ID:
- Commit SHA:
- Tests:
- Smoke-test result:
- Errors/metrics:
- Rollback reference:

---

## Sessions

### S03 — Responsive, spacing and RTL/LTR foundation (+ the M1 gate)
- Date: 2026-11-11
- Milestone: M1 (Page foundation) — closing session; the M1 gate rides this session
- Starting commit: `ac13a1e` (feat/match-centre)
- Ending commit: this session's commit (see below)
- Branch: `feat/match-centre`
- Scope: the responsive/spacing/RTL foundation for the mcentre-* section family — existing tokens/breakpoints/components reused, native Persian RTL with the LTR-mirror discipline, the adaptive two-column→one-column collapse utility, adaptive section spacing. NO global redesign, no hero/nav/standings/form/venue/schedule/faq/telegram work (S04–S18 own those), no data work, no asset renames.
- Files changed: `src/seo/page-shell.ts` (the shared inline `<style>` block gains the S03 foundation run — 2,285 rendered bytes, appended after the S02 component styles); `scripts/check-match-centre.js` (+ the S03 assertion group, 10 new); the M1-gate version triple (`src/config.ts` `13.256-mcfound`, `package.json` + `package-lock.json` `13.256.0.0`) with `scripts/check-stats.js` co-evolved (the live version pins moved in place, the S44.1 precedent — the v13.254 block's VERSION/CHANGELOG pins and the release-wiring block's pkg.version; the v13.255 spelling-fix survivors re-pinned under 13.256-mcfound); `CHANGELOG.md` (the release entry retitled to the `# v13.256-mcfound` house format); this log + the ledger. **`src/seo/match-centre.ts` and `src/seo/pages.ts` are byte-unchanged** — the audit §12 file plan listed match-centre.ts as a possible S03 file, but the id-attribute selector needs no hook class: S03 ships zero body bytes (the deviation is deliberate, documented here).
- Implementation summary: (1) **section rhythm** — `section[id^="mcentre-"]+section[id^="mcentre-"]{margin-block-start:28px}`, 20px at ≤600px. The bare section wrapper is a margin-collapse conduit, so the rule WINS the collapsed chain instead of adding (28px = exactly 2× the design system's 14px card micro-rhythm; a browser experiment rejected the display:flow-root alternative — its additive gaps came out uneven (30/36px) because they leak the inner margins' differences). Adjacent-sibling so the first section stays flush with the h1 block and an omitted section never strands a gap. (2) **the `.mcentre-cols` collapse utility** — one `minmax(0,1fr)` column by default, two tracks ONLY at ≥1080px (the site's wide threshold, where .page-col widens 760→1400px — the pairing room the internal S07 briefing|facts and S12 home|away compositions need); `gap:14px` on the card scale; `>*{min-width:0}` so long team names wrap instead of blowing out the tracks. NOT applied to any current section (decision 76: pair only where content justifies — today's five sections are full-width hero/editorial/dense; every section-internal pairing in the spec belongs to S07/S12/S13) — it ships as the contract-ready pattern those sessions consume, exactly like S02's six empty-optional slots. (3) **RTL/LTR discipline** — the block uses CSS logical properties only (margin-block-start; no physical left/right anywhere), so the native-Persian RTL composition mirrors cleanly under a dir flip; live-verified (identical 28px rhythm, zero overflow under dir=ltr). No colors, fonts, sizes or new breakpoints — public-13.87.css tokens only.
- Tests/checks and outcomes: `npm test` → **exit 0, 2,989 OK (baseline 2,979 + 10 new check-match-centre S03 assertions), 0 failures**, re-run green immediately before commit. `git diff --check` clean. The 10 S03 assertions gate: the rhythm values (28/20), the collapse contract (one-column base, two tracks only at 1080px, min-width:0 children), exactly the design system's own two breakpoints (600px/1080px — no invented widths), logical-property discipline, no new colors/fonts, and the CSS-only law (the S02 wrapper stays attribute-only). Local `wrangler dev` smoke with seeded local KV (rebuilt this session — the S02 seeding tooling did not survive the sandbox: 3 lifecycle states + 2 sibling fixtures + a long-Persian-names BL1 fixture + 6 archive form rows + a 10-team standings cache + the payload compact; tooling outside the repo at /home/z/s03-tools/): **91/91 structural assertions** — the S02 set re-verified (five sections in registry order, future slots absent, no hollow wrappers, header/footer/.page-col intact, JSON-LD trio, breadcrumbs, answercard, lifecycle content, wrapper shape unchanged) + the S03 set (the four foundation rules ship on every render, every lifecycle state and the long-names page) + 13 unrelated routes (200s, no mcentre sections, the css bytes ship on page-shell routes with zero render effect). Live layout measurements: inter-section 28px / intra-card 14px at 1440px; 20px at 390px; zero horizontal overflow at 390px/768px/1440px; `.mcentre-cols` verified at the exact 1079/1080 boundary (720px single track → two tracks); icy-blue 2px focus ring on summary links; no console errors. Screenshots at mobile 390 / intermediate 768 / desktop 1440 for upcoming/live/finished + the long-names fixture (+ an LTR-mirror capture) — session tooling, kept outside the repo.
- GSC byte-proof (the S03 critical requirement): base-vs-new render diff via a `git worktree` at `9e6c0c1` + a second local dev server against a copy of the same seeded KV state — for all three lifecycle states + the long-names fixture, **the only delta is the +2,285-byte S03 CSS run** inside the shared `<style>` block: stripping that run makes the entire page byte-identical (head incl. the title ladder, meta description, canonical, OG/Twitter, JSON-LD — and the whole `<body>`, byte-for-byte, since S03 is CSS-only). 18 unrelated routes verified: nine page-shell routes byte-identical modulo the same +2,285-byte run (rendering unchanged by construction — the run is id-scoped), the homepage (its own template, +0 B) and /api/matches.json, /feed.xml, /calendar.ics byte-identical outright, the sitemap index byte-identical modulo its render-time `<lastmod>` stamps, and the unknown-match 404 identical. (Methodology notes: the first comparison round tripped on two session-tooling bugs, both fixed before the recorded run — a chunked-UTF-8 decode flaw in the fetch helper (per-chunk latin1 concatenation mangling multibyte chars at socket-chunk boundaries) and the local Cache-API render holds serving pre-change pages until cleared, the same S02 lesson; plus the sitemap's render-time lastmod, normalized and documented.)
- Data/cache/provider/KV/CPU audit: zero new data work by construction — S03 changes one template string in page-shell.ts (CSS bytes) and nothing else in the render path; `buildMatchPage`'s awaits unchanged (the three pre-existing loads); no KV keys, fetches, timers or client scripts added; no asset renames, no `sw.js` bump (ADR-006 respected — the inline style-block pattern). Page-size delta: exactly +2,285 B on every page-shell page (40,953→43,238 B upcoming under the seed; same order as the M0 production baseline). Per-route CPU remains uninstrumented (stated as a measurement limitation); the CSS is static text — no parsing/computation cost beyond the 2.3 KB of bytes on the wire.
- Performance observations: TTFB ~3–5 ms local (cache-warm, same order as S02's 11–16 ms); no asset changes; version string moves only at this M1 gate (`13.256-mcfound`).
- Commit SHA: `ce1befd` (`ce1befd35d6c4a15d2c4a58d662c028f1eed99ea`) — `feat(match-centre): apply the responsive/spacing/RTL foundation (S03 + M1)` on `feat/match-centre` (9 files, 348 insertions; this entry landed in it with placeholder SHA fields, finalized in the immediate follow-up docs commit — the M0/S02 precedent).
- Push result: Pushed to `origin/feat/match-centre` on 2026-11-11 via the one-shot token URL (never persisted in git config); verified with `git ls-remote` — remote ref = `ce1befd35d…` = local HEAD. `git fetch` before the commit confirmed no owner uploads since S02.
- Preview/staging deployment (milestone end only): **the M1 gate — DONE.** `npx wrangler versions upload` (from `ce1befd`): **Worker Version ID `8053ea4c-d4ed-4224-9f3d-c61aca10ced9`, preview URL https://8053ea4c-ucl-notifier.sportsignal.workers.dev — uploaded, NEVER activated** (production traffic stays on `13.255-seospell` / deployment `88649642`; no routes, domains or crons touched — `wrangler versions deploy` was never run). One config deviation, documented: the upload used a session-tooling config (`/home/z/s03-tools/preview.toml`, outside the repo) identical to `wrangler.toml` EXCEPT the two D1 bindings are omitted — the provided Cloudflare token cannot generate D1 bindings (API error 10021 on every attempt, isolated on a throwaway worker since deleted; D1 read access works, so it is a token-permission limit, not an account outage). The worker treats D1 as optional by design (the v13.92 contract: absent = exactly the legacy KV path), and the M1 smoke surfaces (SSR match pages, hubs, header/footer, unrelated navigation) never touch D1 — the preview is faithful for everything this gate tests. The repo's `wrangler.toml` is untouched; the production S22 deploy will need a token with D1 binding permission (flagged to the owner).
- Smoke-test result: **read-only preview smoke PASSED** (same-KV caveat respected — GETs only against production KV): `/healthz` → `ok:true`, **`version:"13.256-mcfound"`** (the preview runs the S03 build); two real production match pages (Arsenal–Dortmund UCL upcoming, Barcelona–Villarreal upcoming) → HTTP 200 (~48–49 KB), all five sections in registry order, no hollow wrappers, all four S03 foundation rules in the `<head>`, global header/footer, answercard + title ladder intact; mobile 390px on the live preview: uniform 20px section rhythm, zero horizontal overflow; unrelated routes `/`, `/matches`, `/teams`, `/competitions` → all HTTP 200. Production re-verified untouched after the upload: `sportsignal.ir/healthz` → `ok:true`, `13.255-seospell`. Screenshots (desktop 1440 + mobile 390, real production data) captured as session evidence.
- Known issues/limitations: (1) the `.mcentre-cols` utility is deliberately unconsumed until S07/S12 (dead CSS by design, ~130 bytes of rules — the contract-ready pattern, mirroring S02's empty-optional slots); (2) at ≥1080px the summary's answercard/facts still stretch the full 1400px page-col measure (pre-existing since v13.128, unchanged by S03 — S07's briefing|facts pairing is the designed fix); (3) the near-duplicate landmark labels (S02 known issue) remain for S20's a11y pass; (4) the rhythm math depends on the design system's 14px card margin — a future builder shipping larger inner margins would degrade the section rhythm gracefully (gap = the largest collapsed margin), documented in the CSS comment.
- Approval/gate: none needed for the session itself (M1 session; routine commit/push authorized by the M0-approved runbook). **The M1 gate passed**: the diff/screenshots review evidence + the version preview (`8053ea4c`) + the read-only smoke matrix are recorded here and in the deployment entry below; no owner approval was required (the next approval gate is M9). One owner action flagged (non-blocking): the Cloudflare token cannot generate D1 bindings — the S22 production deploy will need a token with D1 binding permission.
- Next session: S04 — hero identity and lifecycle (M2 opens: competition header, home-right/away-left face-off, central scoreboard, «میزبان/میهمان», upcoming/live/finished variants; finished scorers stay omitted per Q4=A).

### S02 — Route shell and semantic structure
- Date: 2026-11-11
- Milestone: M1 (Page foundation)
- Starting commit: `4083016` (feat/match-centre)
- Ending commit: this session's commit (see below)
- Branch: `feat/match-centre`
- Scope: Match Centre page shell + semantic section anchors, NO global redesign — the new section-composer module, the buildMatchPage delegation, harness co-evolution, and the S02 records. No data work, no styling work (S03 owns responsive/RTL), no deploy.
- Files changed: NEW `src/seo/match-centre.ts` (the section composer: 11-slot `MC_SECTION_ORDER` registry in spec §3 order + `matchCentreMain()` + the no-empty-cards `sectionHtml` wrapper; pure string composition, zero runtime imports); `src/seo/pages.ts` (+ the `matchCentreMain` import; the flat `main` concat replaced by the five-part delegation — hero/summary/form/related/footerHook, existing builders untouched); `scripts/lib/worker-src.js` (+ `seo/match-centre.ts` opening the seo group after `api.ts`); NEW `scripts/check-match-centre.js` (18 assertions) + `package.json` test-chain wiring; `scripts/check-stats.js` (one v13.87 assertion re-pointed at the delegated assembly — the only sibling-check change); `CHANGELOG.md`; this log + the ledger.
- Implementation summary: the match page body is now composed through a semantic section registry — eleven `mcentre-*` slots (hero, nav, summary, standings, form, venue, schedule, faq, related, telegram, footer-hook; the `mcentre-` prefix avoids the mobile-card family's `mc` spelling). Five slots render today (the ones with existing content); the six future slots (S06/S10/S11/S14/S15/S16/S18) are optional parts in the composer contract and stay omitted until their sessions — never empty placeholders. One deliberate DOM-order change: the finished «نتیجه نهایی» result block moved from after the similar card (v13.82 position) into the summary section — it is the answer sentence restated; documented for the S07 briefing rework.
- Tests/checks and outcomes: `npm test` → **exit 0, 2,979 OK (baseline 2,961 + 18 new from check-match-centre.js), 0 failures** — re-run green immediately before commit. `git diff --check` clean. Local `wrangler dev` (wrangler.dev.toml, no cron/AI) smoke with seeded local KV (3 lifecycle states + 6 form-history rows + 8-team standings; zero production interaction): all three pages HTTP 200 (40.0–41.5 KB — same order as the 45,187-byte M0 production baseline; +414 bytes/page from the wrappers), 72/72 structural assertions (sections in registry order, anchors once each, no empty wrappers, header/footer/.page-col intact, JSON-LD trio, breadcrumbs, answercard, lifecycle content: kickoff+countdown mount / live score+minute+dot / finished final score+result card, form dots vs season-chip fallback, calendar action only when not finished, future slots absent).
- RTL/mobile/desktop verification: S02 adds no CSS — the wrappers are inert block elements and the `<head>` (incl. the entire `<style>` block) is byte-identical to base, so RTL/LTR and mobile/desktop rendering are unchanged by construction (proven, not just asserted). The responsive/RTL application is S03 scope.
- GSC byte-proof (the S02 critical requirement): base-vs-new render diff via a `git worktree` at `4083016` + a second local dev server against the same seeded KV — for all three lifecycle states the `<head>` (title ladder, meta description, canonical, OG/Twitter, JSON-LD), the post-`</main>` tail (global footer + beacons) and the entire main content (modulo the five wrappers + the result-block relocation, verified by programmatic strip-and-reconstruct) are **byte-identical**; the answer-first sentence, facts table, form strip, similar card and related-links card round-trip unchanged. Also byte-identical: 15 unrelated routes (/, /matches, /matches/today, /matches/this-week, /teams, two team pages, /competitions, a competition page, /about, /methodology, /sitemap, an unknown-match 404, /api/matches.json, /healthz) — zero unrelated-route regression. (One methodology note: the first base capture of the upcoming page was a stale edge-cache hit from the copied `.wrangler` state — re-captured after a cache clear; live/finished holds had already expired.)
- Data/cache/provider/KV/CPU audit: zero new data work. `src/seo/match-centre.ts` is a pure leaf (no runtime imports, no KV/fetch/DOM/timer code — gated by check-match-centre). `buildMatchPage`'s awaits unchanged: exactly the three pre-existing loads (hydrateMatchVenue, loadArchive, fullByCodeFor); the venue-hydration path was never reached in the smoke (all seeded rows carry venues → the curated/provider guard returns early; no FD calls, no `venue_v1_*` reads/writes). KV reads/render holds in `router.ts` untouched. The composer is O(1) string concatenation per section — no new parses, no measurable CPU addition (per-route CPU remains uninstrumented; stated as a measurement limitation).
- Performance observations: page sizes 40,048 / 41,465 / 41,524 bytes (upcoming/live/finished) vs base 39,634 / 41,051 / 41,110 — the +414 bytes/page are exactly the five `<section>` wrappers; TTFB ~11–16 ms local. No asset changes, no `sw.js` bump, version string untouched (`13.255-seospell`).
- Commit SHA: `9e6c0c1` (`9e6c0c193d2326e1b0ef5caf523d092b775af294`) — `feat(match-centre): add responsive route shell (S02)` on `feat/match-centre` (9 files, 361 insertions; this entry and the feature landed in it; the SHA/push-result fields were finalized in the immediate follow-up docs commit, the M0 precedent).
- Push result: Pushed to `origin/feat/match-centre` on 2026-11-11 via the one-shot token URL (never persisted in git config; GitHub's moved-repository notice for assadigit/SportSignal is the known redirect and harmless); verified with `git ls-remote` — remote ref = `9e6c0c193d…` = local HEAD.
- Preview/staging deployment (milestone end only): none — M1's first preview (`wrangler versions upload`) comes at the M1 gate after S03.
- Smoke-test result: local-only (Option B). Production untouched at `13.255-seospell` (deployment `88649642`); no deploy of any kind this session.
- Known issues/limitations: (1) the inner matchhead keeps its historical aria-label «خلاصه بازی» while the summary section is «خلاصه و مشخصات بازی» — near-duplicate landmark names are mildly noisy for screen readers; revisit at S20's a11y audit with a byte-safe plan (the label is pinned by check-stats v13.81 assertions). (2) The eleven labels are S02 choices; S06's nav wording may want them aligned — the registry is the single place to change. (3) `wrangler dev` local KV seeding is session tooling kept OUTSIDE the repo (`/home/z/my-project/scripts/s02-*.js` on the agent machine) — not part of the repo's harness.
- Approval/gate: none needed (M1 session; routine commit/push authorized by the M0-approved runbook).
- Next session: S03 — responsive, spacing and RTL/LTR foundation (existing tokens/breakpoints from `public-13.87.css`, two-column→one-column collapse, inline page-shell style block extension; audit §16 row S03).

### S00 — Session bootstrap, repository safety and product reconciliation
- Date: 2026-11-11
- Milestone: M0
- Starting commit: `114426b` (main)
- Ending commit: `82ee82b` (feat/match-centre — M0 docs commit; recorded post-approval)
- Branch: `feat/match-centre` (created from `main` at `114426b` after owner approval)
- Scope: package extraction/verification, complete package reading, repository/design-system/conventions audit, baseline checks.
- Files changed (new): 16 extracted package files (12 documents — package README as `MATCH-CENTRE-PACKAGE-README.md` due to the filename conflict with the repository README, the only conflict — plus 4 `design-reference/*.png`; ZIP kept intact and git-tracked at root), plus this log, `MATCH-CENTRE-MILESTONE-LEDGER.md`, `MATCH-CENTRE-IMPLEMENTATION-AUDIT.md` (started in S00). All landed in commit `82ee82b`.
- Implementation summary: no application code touched.
- Tests/checks and outcomes: `npm install` (npm 11.19.1, node 24.22.2) then `npm test` → **exit 0, 2,961 OK, 0 failures** (baseline recorded). No provider/KV stress tests, no production mutation, no deploy.
- RTL/mobile/desktop verification: N/A (audit only). Design references inspected (all four `design-reference/*.png`).
- Data/cache/provider/KV/CPU audit: see `MATCH-CENTRE-IMPLEMENTATION-AUDIT.md` §§4–6.
- Performance observations: production match page measured 45,187 bytes, HTTP 200 (baseline for M9 comparison).
- Commit SHA: `82ee82b` (with S01; see below).
- Push result: Pushed to `origin/feat/match-centre` on 2026-11-11 via the one-shot token URL after the M0 approval; verified with `git ls-remote`.
- Known issues: none.
- Approval/gate: M0 gate approved 2026-11-11 (see the M0 gate approval entry below).
- Next session: S02.

### S01 — Architecture, data, cost and deployment audit
- Date: 2026-11-11
- Milestone: M0
- Starting commit: `114426b` (main)
- Ending commit: `82ee82b` (feat/match-centre — M0 docs commit; recorded post-approval)
- Branch: `feat/match-centre` (created from `main` at `114426b` after owner approval)
- Scope: route/SSR/data-assembly trace; data-availability matrix for every proposed section; cache/freshness/failure behaviour; provider/KV/CPU/subrequest/payload costs; dated-audit re-verification against HEAD; preview/production/rollback verification; branch/commit/preview/production/rollback plan; file-by-file session plan.
- Files changed (new): completed `MATCH-CENTRE-IMPLEMENTATION-AUDIT.md`; `MATCH-CENTRE-MILESTONE-LEDGER.md` initialized; this log initialized. All landed in commit `82ee82b`.
- Implementation summary: audit only; no application code touched.
- Tests/checks and outcomes: `npm test` re-run → exit 0 (2,961 OK). Read-only verifications: GitHub API (branch protection: none on `main`; repo public; token admin/push), Cloudflare API (bindings present incl. 6 secrets — values never read; two production domains; workers.dev alias serving; deployments list), 4 production GETs (`/healthz` ×2 hosts, one match page, earlier `/api/matches.json` not re-fetched — superseded by the dated audit's record).
- RTL/mobile/desktop verification: N/A (audit only).
- Data/cache/provider/KV/CPU audit: **completed — audit doc §4 (matrix), §5 (dated-audit re-verification incl. the finished-scorers correction), §6 (costs)**. Key result: every proposed section implementable at zero incremental provider requests and zero incremental KV ops.
- Performance observations: healthz `ok:true`, `kv_writes_day 636/1000`, `subreq_last_tick 41`, `sched_mode IDLE`; live version `13.255-seospell` = HEAD.
- Commit SHA: `82ee82b` — `docs(match-centre): extract v1.2 package and record M0 audit (S00+S01)` on `feat/match-centre` (19 files, 1,849 insertions; includes the S00 extraction and these log/ledger updates as first written).
- Push result: Pushed to `origin/feat/match-centre` on 2026-11-11 via the one-shot token URL (never persisted in git config); verified with `git ls-remote`.
- Known issues / flagged risks: CPU free-plan ceiling; SEO title/spelling measurement in flight (do not disturb before Dec 4–8); finished scorers unavailable (Q4 = A, stays omitted); venue city/country unavailable (Q2 = A, omitted); push-CI trigger mangled (`branches: ain]`); no branch protection.
- Approval/gate: **M0 gate — APPROVED by the owner on 2026-11-11** ("Approve. give me the session for next session. commit push and update change logs."). Blanket approval of the presented plan; the six audit §15 decision points resolve to their recommended options (Q1=A Tehran+UTC, Q2=A stadium-name-only, Q3=A existing assets, Q4=A scorers omitted, Q5=A+B version previews + local, Q6=A PR merge at M10). Full record: ledger "M0 gate decision record".
- Next session: S02 — route shell and semantic structure, on `feat/match-centre` (starting files: audit §16).

### M0 gate approval (owner decision, 2026-11-11)
- Date/time: 2026-11-11 (Asia/Tehran).
- Owner instruction: "Approve. give me the session for next session. commit push and update change logs."
- Effect: the M0 gate is passed; `feat/match-centre` is the approved working branch; preview strategy A+B (Workers version previews + local dev) is in force; merge to `main` happens via owner PR at the M10 gate; Q1–Q4 product decisions locked to the recommended options (owner may still override Q1–Q4 before sessions S05/S14/S18/S04 respectively).
- Actions taken: branch `feat/match-centre` created from `main` at `114426b`; M0 deliverables committed (`82ee82b`); this log + the ledger updated with the approval record; CHANGELOG entry added; branch pushed to origin and verified.
- No application code was touched; no deployment of any kind occurred; production remains at `13.255-seospell` (deployment `88649642`).

### M1 preview/staging deployment (the M1 gate, 2026-11-11)
- Date/time: 2026-11-11 ~12:55–13:05 UTC.
- Environment: Workers version preview on the workers.dev subdomain (Option A, the M0-approved preview target) — the first Match Centre preview of the engagement.
- URL: **https://8053ea4c-ucl-notifier.sportsignal.workers.dev**
- Deployment ID: Worker Version **`8053ea4c-d4ed-4224-9f3d-c61aca10ced9`** (uploaded, NEVER activated — not a deployment in the traffic sense; production traffic remains on deployment `88649642` / `13.255-seospell`).
- Commit SHA: `ce1befd35d6c4a15d2c4a58d662c028f1eed99ea` (`feat/match-centre`).
- Tests: `npm test` exit 0 (2,989 OK, 0 failures) immediately before the push; the upload ran from the pushed commit's tree.
- Smoke-test result: PASSED, read-only (same-KV caveat respected): preview `/healthz` `ok:true` + `13.256-mcfound`; two real production-data match pages 200 with all five mcentre sections in order, the four S03 rules in the head, header/footer/answercard/title intact, 20px mobile rhythm + zero overflow at 390px; `/`, `/matches`, `/teams`, `/competitions` all 200; production `sportsignal.ir/healthz` re-verified `ok:true` / `13.255-seospell` after the upload. Local matrix: 91/91 + the byte-proof (see S03).
- Errors/metrics: one config deviation (the session-tooling preview config omits the two D1 bindings — the provided token cannot generate D1 bindings, API error 10021, isolated on a throwaway worker since deleted; the repo's wrangler.toml is untouched; the D1-optional contract keeps every smoke surface faithful). One throwaway diagnostic worker (`ucl-notifier-m1probe`) was created and DELETED during the isolation (verified: only `ucl-notifier` + `uefa-image-relay` remain on the account).
- Rollback reference: none needed — the version was never activated; a preview version is abandoned by simply never deploying it. Production rollback path is unchanged: `npx wrangler deployments list` → `npx wrangler rollback`.
