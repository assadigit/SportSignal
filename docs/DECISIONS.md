# DECISIONS — decision history (add only, never rewrite)

Format: date · decision · options considered · reason · who · revisit when.
(Adopted with the universal AGENTS.md rules on 2026-11-08; this file is new —
earlier decisions live in README §"Architecture decisions" and docs/adr/.)

## 2026-11-19 — Persian Club-Alias SEO (PCA-2): the phase-2 reminder layer — a standing, self-verifying "finish the remaining work" tripwire (the owner's ask: remind yourself even if the owner forgets).

- **Decision:** phase 2 of the Persian-alias SEO work (the post-freeze follow-up to PCA-1 / commit `6fd2f1d` / `v13.274.0-persianalias`) is blocked until the Dec 4-8 2026 GSC measurement freeze lifts, and the owner asked (2026-11-19) for a durable reminder "to remind yourself, even if i forgot — like i say finish remaining work, you find it and do it on time." The reminder layer, all read-only/docs-only, four surfaces: (1) the date-gated phase-2 banner at the top of `docs/HANDOFF.md` (the three unblocks: the date Dec 9+; the owner's freeze-lift decision + the final measurement record — a date passing alone is NOT proof; the uploaded Dec 4-8 GSC export — absent means stop and report, never fabricate); (2) the rewritten `seo-implementation/next-session-prompt.md` — the full phase-2 work order (the export re-derivation via `scripts/extract-alias-evidence.js`, the owner-gated S18 editorial alias mentions, the deferred candidates, the gates, the non-negotiables) that any future session reads first; (3) the standing GitHub issue **assadigit/SportSignal#4** (`[PERSIAN-ALIAS-PHASE-2]`, labeled `phase-2-reminder`, opened 2026-11-19 carrying the full prompt in its body) + the scheduled workflow `.github/workflows/phase2-freeze-lift-reminder.yml` (Dec 9 + Dec 16 2026 UTC, year-guarded to 202612, `issues: write` ONLY, no deploy, no secrets — the s27-lifecycle-verify pattern) that pings it with a comment (+ reopens it if closed early), so the owner — the issue creator and repo watcher — gets the GitHub notification even if they forget, and the prompt survives outside the repo docs; the workflow's completion guard is the gate file's own retirement from `main` (absence = phase 2 shipped → the workflow no-ops); (4) the gate `scripts/check-phase2-freeze-lift.js` (in `npm test`) pinning every surface so the reminder cannot silently rot across future sessions' doc churn.
- **Options considered:** (a) the four-surface docs+issue+workflow+gate layer [chosen — every discovery path a future session or the owner takes is covered: the repo docs, the GitHub tracker, the scheduled ping; the gate makes it self-verifying; zero runtime/SEO-surface bytes]; (b) a dated cron/Telegram ping [rejected — needs a live secret in the repo or an external scheduler dependency; the GitHub issue comment notification reaches the owner through GitHub's own watch, secret-free]; (c) a docs note only [rejected — the S19 lesson: doc-only reminders rot when the next session rewrites the HANDOFF; a gate + a scheduled issue ping cannot]; (d) start phase 2 early on a smaller scope [rejected — the freeze is the owner's measurement discipline; PCA-1's revisit clause explicitly defers to post-Dec-8 + the export].
- **Reason:** the owner's 2026-11-19 ask; the 20-day gap to Dec 9 makes forgetting likely; the S19 cron-job precedent (self-deleting scheduled jobs) + the s27 scheduled-workflow precedent (year-guarded, read-only, issue-pinging) are both proven in this repo.
- **Who decided.** The agent, on the owner's direct ask (the reminder layer); the phase-2 gating itself was the owner's phase-2 brief (the freeze-lift verification requirement).
- **When to revisit.** When phase 2 ships (post-Dec-8 + the export): close the issue, disable the workflow, retire the HANDOFF banner + the gate the same session (the check is co-evolved with the retirement). If Dec 16 passes with no owner action, the backup nudge has fired — leave the layer standing until phase 2 actually ships.

## 2026-11-19 — Persian Club-Alias SEO (PCA-1): the evidenced alias dictionary rides the S11 JSON-LD alternateName pattern; the ambiguity-guarded resolver is a SEPARATE SEO-only module, not wired into any request path.

- **Decision:** the GSC-evidenced Persian club aliases extend `SEO_EXTRA_ALIASES` (`src/seo/team-names.ts`) from its 1-club S11 seed (Barcelona «بارسا») to 9 clubs — «رئال» (5 impr direct + 322 in the رئال مادرید rows), «بایرن» (20 impr), «من سیتی» (2 impr) + «منچستر سیتی» (286 impr), «ارسنال» (13 impr), «اینتر» + «اینترمیلان» (44 impr combined), «میلان» (7 impr), «پی‌اس‌جی» + «پاریسن ژرمن» (16 impr + autocomplete), «بروسیا دورتموند» (11 impr). Liverpool/Chelsea/Atlético/United gain NOTHING (no evidenced variant / the canonical name IS the only form). The aliases ride the JSON-LD alternateName arrays ONLY — the same freeze-safe class as S11 (machine-readable, NOT a SERP-snippet byte): the visible faName bytes, the team-page title/H1 ladders and `fa-dict.ts` are byte-identical (the Dec 4-8 freeze holds — verified by the check gates). A NEW `src/seo/persian-alias.ts` carries the query-side resolver: the ambiguity law (اینتر/میلان/منچستر/پاریس/اتلتیکو NEVER resolve alone; «اینتر» unlocks ONLY via the میلان compound or the European-only «لیگ قهرمانان اروپا» phrase — the validated map's own autocomplete row — never a generic cup phrase), the normalization folds (Arabic ي/ك, ZWNJ→space, digits, dots — WITHOUT merging اتلتیکو/اتلتیک or بروسیا/بوروسیا), and the matchup-pair resolver (query order + the «میلان»-inside-«اینتر میلان» substring trap). It imports NOTHING (the spec §8 separation law: SEO alias handling stays separate from provider identity normalization) and is wired into NO request path (research/QA tooling + the future freeze-lifted use). The additive research layer: `seo-implementation/keyword-research/ALIAS-KEYWORD-RESEARCH-2026-11-19.csv` (34 rows, evidence-labelled) + `ALIAS-RESEARCH-REPORT-2026-11-19.md` + the generators — the original VALIDATED-KEYWORD-MAP.csv is NEVER overwritten.
- **Options considered:** (a) extend the S11 map + a separate resolver module [chosen — the established freeze-safe pattern; the separation law; zero new page bytes]; (b) put the aliases into fa-dict.ts [rejected — the display surfaces (bot/cards/digests) render from it; the S1 M2 scope law]; (c) alias-specific URLs (/teams/barsa) [rejected — the one-URL law; the spec §7.1 explicitly forbids doorway pages]; (d) add alias FAQ questions [rejected — the S17 FAQ already carries «بازی بعدی X کی است؟»; spec §9.3 forbids synonym-repetition FAQs]; (e) defer everything to post-Dec-8 [rejected — the S11 precedent proved the JSON-LD alternateName class freeze-safe; only the VISIBLE surfaces are frozen].
- **Reason:** the PERSIAN-CLUB-ALIAS-SEO-SPEC (repo root, v1.0) — the 13-club GSC evidence is present in the existing validated map; the S11 mechanism already shipped the pattern for one club; the ambiguous forms needed an explicit guard (the Inter Miami / اینترنت autocomplete collisions documented in EVIDENCE-LOG A2).
- **Who decided.** The agent (the spec's repository-first workflow; the S11 freeze-safety precedent; the DECISIONS S15-2 freeze-coordination).
- **When to revisit.** Post-Dec-8 freeze-lift: the alias surface may extend to a natural visible mention in the S18 editorial body (spec §9.2 — the owner's call after the measurement gate reads); the deferred candidates (من یونایتد, بوروسیا دورتموند, Latin PSG…) need evidence before production; a fresh 16-month GSC export re-derives the whole evidence table via `scripts/extract-alias-evidence.js`.


## 2026-11-17 — SEO Follow-up Session 17 (S17-1): the team-page FAQ — the 3 authored Qs + the faqcard placement + the FAQPage node in the @graph.

- **Decision:** the team page carries a real, data-sourced, Persian FAQ: «بازی بعدی [team] کی است؟» (the next fixture — ALWAYS, the honest empty answer «ثبت نشده است…» on the empty window, the hub empty-state precedent), «بازی‌های [team] در کدام لیگ است؟» (the DISTINCT competitions the team's own upcoming fixtures name, joined with «و» — league + cup both named honestly; CONDITIONAL), «ساعت بازی بعدی [team] به وقت تهران چند است؟» (the Tehran kickoff + the true UTC pointer; CONDITIONAL). The authored content lives in `buildTeamFaqItems` (`src/seo/faq-content.ts` — the module's ownership extends from the match Q&A to the team Q&A); the visible section is the hub faqcard pattern (`M.faqHtml`) as the LAST section of main (AFTER the schedule/standings/form/results/related cards — the match page's FAQ-after-related placement; BELOW the answer-sentence; zero new CSS); the FAQPage node (`JL.faqNode`) sits in the @graph after the optional ItemList + before the BreadcrumbList (the hub order). ONE source array feeds both — the T-20 byte-identical contract (harness-verified). Freeze-safe (additive only — the git diff shows zero removed byte-frozen expressions). Zero new KV-read/subrequest/CPU (reads the already-loaded `teamMatches` list).
- **Options considered:** (a) the 3 spec Qs + the faqcard at the end of main [chosen — the spec's Q set verbatim; the match page's placement precedent; zero visual disruption to the existing card order]; (b) the spec Qs placed right after the answer card [rejected — pushes the standings/form/sim cards down; the hub precedent places the faqcard after the content list, the match page after related — the end of main matches both]; (c) a 4th timezone-policy Q (the hub/match precedent) [rejected — the spec names exactly 3 Qs; Q3's answer already carries the Tehran-time + UTC policy content]; (d) build the Q&A inline in pages.ts (the hub buildHub precedent) [rejected — faq-content.ts already owns the authored FAQ copy; one module for both detail-page FAQs keeps the phrasing discipline in one place].
- **Reason:** the P1-6 gap (the audit): the team page — the page class that earns the «بازی بعدی X» queries — had NO FAQ (neither visible nor machine). The Q set matches the GSC-observed query heads; the honest multi-competition answer + the honest empty answer follow the no-fabrication law (a team in league + cup names BOTH; an empty window is never a fabricated fixture).
- **Who decided.** The agent (SEO Follow-up Session 17), on the spec §Session 17 S17-M1 + the gap audit P1-6 + the hub/match FAQ precedents.
- **When to revisit.** S18 (the content-depth session) adds the editorial body content to the same page — the FAQ placement may be re-coordinated with the new body sections then.

## 2026-11-17 — SEO Follow-up Session 17 (S17-2): the match-page FAQPage emit — the S17 spec supersedes the Match Centre S16-Schema omit decision (the owner-authorized GEO emit path).

- **Decision:** the match page's @graph now carries `faqHtml ? JL.faqNode(buildMatchFaqItems(sm)) : null` — the FAQPage node fed from the SAME `buildMatchFaqItems(sm)` array that feeds the visible accordion (byte-identical q/a, one source — the T-20 contract; harness-verified against the rendered accordion). The Match Centre S16-Schema decision ("OMIT the FAQPage JSON-LD node for the match page") is SUPERSEDED: that decision's own record anticipated this exact path («the raw { q, a } return shape mirrors the hub faqHtml() contract so the SAME authored content could feed a future FAQPage node IF THE OWNER AUTHORIZES the GEO emit path»), and the S17 spec (`docs/specs/seo-followup-track.md` §Session 17 S17-M2 — the owner fired the session) IS that authorization. The emit is NOT «solely to pursue Google FAQ rich results» (Google retired them in August 2023 — the spec §12 law is honored): it is a GEO surface so AI answer engines (AI Overviews, ChatGPT, Perplexity, Claude) can quote the EXACT visible Q&A with a citation — the same rationale the hub pages have carried the FAQPage since v13.219-faq. The three `check-match-centre.js` gates that pinned the omit decision are re-pinned to the emit contract (the (g) no-FAQPage gate → the emit gate; the S20 (a1) 4-node @graph → the 5-node contract; the S20 (c1) no-unsupported-type gate → the emit + still-no-Article/BlogPosting/Event, with the naive `indexOf("]")` extraction replaced by the S20(a1) bracket-depth match); the S16 import pin accepts the extended `buildTeamFaqItems` import.
- **Options considered:** (a) wire the FAQPage from the existing authored accordion source [chosen — the anticipated path; byte-identical by construction; zero new content to author]; (b) keep the omit (a second visible FAQ section per the spec's example phrasings instead) [rejected — the spec's phrasings were illustrative of the CONTENT (kickoff/venue/league), which the live accordion already covers + lifecycle-aware + deployed; a second FAQ section would duplicate content on one page]; (c) re-author the match Q&A to the spec's exact example phrasings [rejected — would churn the live authored bytes + lose the lifecycle-aware past-tense variants; the T-20 contract requires the node to match the VISIBLE text, and the visible text is the Match Centre S16's].
- **Reason:** the P1-6 gap is the FAQPage NODE on the detail pages (the audit's own evidence was "0 FAQPage nodes"; the visible accordion has been live since Nov 14 — the S17 investigation's correction to the audit, recorded as S17-3). The spec mandates the node on the match page; the T-20 byte-identical contract requires the single-source wiring; the superseded omit decision's stated precondition (the owner's authorization) is met by the spec.
- **Who decided.** The owner (firing the S17 session on the spec that mandates S17-M2), executed by the agent (SEO Follow-up Session 17); the supersession is recorded here per the decision-log discipline.
- **When to revisit.** If a future spec re-litigates the FAQPage on the match page (e.g. a schema-policy change), the gates now pin the EMIT contract — a revert must re-pin them back (the git history carries both states).

## 2026-11-17 — SEO Follow-up Session 17 (S17-3): the P1-6 audit correction — the match page HAS a visible FAQ (since Nov 14); the gap was the FAQPage NODE.

- **Decision:** the gap audit's P1-6 ("the detail pages (team/competition/match) have NO FAQ") is corrected: the MATCH page has had a VISIBLE FAQ — the Match Centre S16 accordion (commit `c14c58a`, 2026-11-14: the kickoff / venue-conditional / competition / timezone Q&A) — since three days BEFORE the audit. What was genuinely missing on BOTH the team and match pages was the `FAQPage` JSON-LD node (the audit's own evidence — "0 FAQPage nodes on /teams/barcelona" — was correct). P1-6 STANDS as the S17 objective (the node was the gap); the correction prevents a future reader from re-adding a duplicate visible FAQ to the match page. Running total: 6 of 18 audit gaps now carry corrections (the 5 verification errors from S16 + the S17 investigation, plus this P1-6 scope correction — P1-6 was RIGHT about the node, WRONG about "no FAQ" on the match page).
- **Options considered:** (a) correct the record + scope S17 to the node [chosen — the honest reading of the live state]; (b) implement the audit as written (a second visible FAQ on the match page) [rejected — duplicate content, contrary to the T-20 one-source contract].
- **Reason:** the S17 investigation (reading the live source before building — the S16-3 discipline) found the accordion; the audit's grep methodology (FAQPage nodes) measured the machine surface only.
- **Who decided.** The agent (SEO Follow-up Session 17), on the source + git-history evidence.
- **When to revisit.** The audit doc amendment (all corrections, a docs-only pass) remains a documented follow-up (S16-3 notes it).

## 2026-11-17 — SEO Follow-up Session 16 (S16-1): the entity-grounding parity — the match-page SportsTeam `sameAs` = the team-page SportsTeam `sameAs` (the P1-2 gap fix).

- **Decision:** the `teamRef` function (`src/seo/jsonld.ts`) now looks up `TEAM_ENTITY_LINKS[name]` + adds the `sameAs` (Wikipedia + Wikidata) to the match-page `SportsEvent` `homeTeam`/`awayTeam` `SportsTeam` nodes — the same verified-map lookup the team-page `sportsTeamNode` uses. The match page is the click-earner page type; the entity grounding is now consistent across the page types. Live-verified: Barcelona→Q7156 + Man City→Q50602 on the match page (was bare before). Freeze-safe (a JSON-LD field). Zero new KV-read/subrequest/CPU.
- **Options considered:** (a) add the sameAs to teamRef [chosen — the parity fix; pure static-map lookup; freeze-safe]; (b) leave the match-page SportsTeam bare [rejected — the click-earner page type had the weaker grounding].
- **Reason:** the gap audit (P1-2) found the match-page SportsTeam nodes lacked the sameAs the team-page SportsTeam had. The entity grounding (the knowledge-graph reconciliation) was weaker on the highest-traffic page type.
- **Who decided.** The agent (SEO Follow-up Session 16), on the gap audit P1-2 + the spec §3/SS-05 entity-grounding rule.
- **When to revisit.** If the TEAM_ENTITY_LINKS map is extended (new teams), the parity applies automatically (the same lookup).

## 2026-11-17 — SEO Follow-up Session 16 (S16-2): the image sitemap — the `<image:image>` extension on every sitemap entry + the xmlns:image namespace (the P2-4 gap fix).

- **Decision:** the sitemap entries now declare the page's image(s) to Google Image search via the `<image:image>` extension. The match pages declare their specific per-match OG image (`/og/match-<slug>.png`); the team/competition/static pages declare the site OG default (`/og/default.png`). The `urlNode` + `urlsetXml` + a new `ogImageForPath` helper in `src/seo/files.ts`. Live-verified: 13 image:image on teams.xml + 130 on matches-upcoming + the xmlns:image namespace. Freeze-safe (a machine-file extension). Zero new KV-read/subrequest/CPU.
- **Options considered:** (a) declare the per-match OG image + the site default [chosen — the specific image for the matches + a consistent default for the others]; (b) declare the crest images [rejected — the crest isn't easily available in the sitemap builder's candidate data + the external crest is already discoverable via the HTML crawl]; (c) no image sitemap [rejected — the P2-4 gap].
- **Reason:** the gap audit (P2-4) found no image sitemap. The image-search visibility was undeclared. The match-page OG images (the self-hosted dynamic images) are the most valuable to declare.
- **Who decided.** The agent (SEO Follow-up Session 16), on the gap audit P2-4.
- **When to revisit.** If the team/competition pages gain per-page OG images (beyond the default), the `ogImageForPath` can be extended to declare them.

## 2026-11-17 — SEO Follow-up Session 16 (S16-3): the gap-audit corrections — 3 of 18 gaps were verification errors (the P1-3 breadcrumb + the P2-1 beacon + the P3-1 /teams.xml are NOT gaps).

- **Decision:** three gaps from the `docs/audits/2026-11-17-seo-gap-and-swot-audit.md` were re-verified during the S16 implementation + found to be NON-gaps. (1) P1-3 (the visible breadcrumb) — the breadcrumb IS visible (`<nav class="crumbs" aria-label="مسیر صفحه">` — Persian aria-label; the audit's English grep missed it). (2) P2-1 (the Cloudflare beacon on SEO pages) — the beacon IS on every SEO page (the page-shell.ts includes it; live-verified: 4 references). (3) P3-1 (the /teams.xml soft-404) — /teams.xml returns HTTP 404 (a correct 404; the audit saw the HTML 404 page + misread it as a 200 soft-404). These three are removed from the follow-up track.
- **Options considered:** (a) re-verify every audit gap before implementing [chosen — the audit had a 17% error rate from English greps on a Persian site + a missed HTTP status check]; (b) implement the audit as-is [rejected — would have "fixed" non-gaps + wasted effort].
- **Reason:** the audit's verification methodology was insufficient for a Persian-language site (English grep patterns) + didn't check the HTTP status code for the /teams.xml claim. The re-verification caught 3 false positives before any wasted implementation.
- **Who decided.** The agent (SEO Follow-up Session 16), on the live re-verification.
- **When to revisit.** The audit doc (`docs/audits/2026-11-17-seo-gap-and-swot-audit.md`) should be amended with these corrections (a future docs-only pass).

## 2026-11-17 — SEO Session 15 (S15-1): the final regression is CLEAN — no bug found; no deploy. The 15-session SEO program close-out (the route plan §10 — the phase file SESSION-15-FINAL-QA-REGRESSION-AND-HANDOFF.md).

- **Decision:** the final regression is CLEAN. `npm test` exit 0 (3,738 OK =
  the S14 baseline; no new check added — the regression is read-only; `npx
  tsc --noEmit` clean). The live crawl of 19 HTML pages + 4 machine files:
  EVERY page returns HTTP 200 + the correct canonical + the correct robots +
  the title/H1/description + the JSON-LD + the S14 preconnect + ZERO hreflang.
  The MISSING-IS-NOT-ZERO law holds (the with-venue match emits `location: Camp
  Nou`; the no-venue match correctly OMITS location; no
  endDate/offers/aggregateRating fabricated). The 13-club allowlist + the C1
  disposition hold (the teams.xml = exactly 13 rows; 4 non-selected team slugs
  verified `noindex, follow`). The /teams tile ordering holds (the 13 selected
  clubs first). The no-fake-offers / no-invented-data law holds (zero
  live-broadcast claims on the match page). The Cloudflare budget is healthy
  (`ok:true` + `pool_matches:324` + `kv_writes_day:403` + `subreq_last_tick:31`
  + `degraded:false`). The Workers Analytics GraphQL confirms the chronic C7
  10ms CPU cliff (4,832 exceededResources over Nov 16-17 — NOT caused by the
  SEO program, zero Worker CPU added across S4-S14). The cron triggers
  unchanged. **No deploy** (docs-only — the same discipline as S12 Option (b)
  + S13 docs-only). The live deployment `a4cc2982-c6fa-493f-907b-e71d89c1f33f`
  @100% = `13.268.0-perf-preconnect` STAYS.
- **Options considered:** (a) docs-only, no deploy (the regression is clean)
  [chosen — no bug found; every URL class 200 + the correct SEO contracts; all
  56 check scripts pass; the byte-frozen surfaces unchanged; no unsupported
  claims; no unselected club page indexable]; (b) deploy a fix [rejected —
  there is no fix to deploy; the regression surfaced no bug].
- **Reason:** the phase file's acceptance criteria: "All changes have
  commit/push/deploy evidence; no known Critical regression; unresolved
  data/access limits documented; production verification results are
  factual." The regression satisfies all four: the commit/push evidence is the
  `seo(s15)` docs checkpoint (ls-remote verified); no Critical regression (the
  crawl is clean); the unresolved access limits (the fresh GSC export + the
  CrUX data) are documented; the production verification is factual (every
  claim verified live). Deploying without a code change would be a no-op
  versioned deploy (pointless + a budget waste).
- **Who decided.** The agent (SEO Session 15), on the phase file's required
  work + the route plan §10 Session 15 row + the Dec 4-8 freeze (the session
  runs before Dec 9 — read-only) + the S12/S13/S14 inherited decisions (STAY).
- **When to revisit.** The post-Dec-8 freeze-lift decisions (the S2 title-test
  re-fire, the S06-H3 follow-up, the S1 spelling-fix judgement, the S11
  SEO_EXTRA_ALIASES extension, the S13-1 option (c) Events rich-result
  eligibility revisit) — all need the fresh 16-month GSC export. The
  measurement requests (the fresh GSC export + the CrUX data) + the
  infrastructure decisions (the Workers Paid plan) are owner-driven.

## 2026-11-17 — SEO Session 15 (S15-2): the freeze-coordination — the session runs before Dec 9, the Dec 4-8 freeze HOLDS; the regression is read-only on the byte-frozen surfaces.

- **Decision:** Session 15 runs before Dec 9 (2026-11-17). The Dec 4-8
  measurement freeze HOLDS — the regression is read-only on the byte-frozen
  surfaces. `git status` is clean — zero `src/` changes this session (the
  definitive proof: the byte-frozen source surfaces are untouched). Session 15
  is docs-only (the deliverables are markdown reports — no
  `src/`/`scripts/`/`assets/` change, no version bump, no deploy). The
  byte-frozen surfaces verified UNCHANGED (the live crawl confirms the bytes
  match the documented frozen values): the homepage title/H1 (S6); the
  match-page title/H1/description/answer-sentence (S7); the team-page
  title/H1/description/answer (S8); the competition-page
  title/H1/description/answer (S9); the date-hub empty-state copy on
  `/matches/tomorrow` (S06-H3 — the source bytes in `src/seo/pages.ts`
  unchanged); the team-name spellings in `fa-dict.ts` (the S1 M2 F3 fix —
  mid-measurement, judge ~Dec 8). The S11 freeze-safe changes
  (og:type=article + SEO_EXTRA_ALIASES + TEAM_SLUGS no-op) stay durable (live:
  og:type=article confirmed on all 3 detail page types). The S12 EN decision
  (FINAL — Option (b)) stays. The S13 structured-data decision (docs-only)
  stays. The S14 preconnect (freeze-safe) + the GA4 DEFER stay.
- **Options considered:** (a) read-only freeze verification (the session runs
  before Dec 9) [chosen — the freeze holds; the regression verifies the
  byte-frozen surfaces are unchanged; no byte-frozen surface touched]; (b)
  touch the byte-frozen surfaces [rejected — the Dec 4-8 freeze holds; the
  regression surfaced no bug that needs a byte change].
- **Reason:** the prompt's standing constraint: "NEVER change the byte-frozen
  title/H1/description/answer-sentence bytes if the session runs before Dec 9
  (the Dec 4-8 freeze holds)." The regression is the final verification — it
  does not touch the frozen surfaces. The post-Dec-8 freeze-lift decisions are
  the residual backlog.
- **Who decided.** The agent (SEO Session 15), on the Dec 4-8 freeze
  constraint + the S06-H3/S1/S2/S11/S13-1 inherited freeze-lift gates.
- **When to revisit.** Dec 9+ (the freeze lifts) — the post-Dec-8 freeze-lift
  decisions (S15-1's revisit list).

## 2026-11-17 — SEO Session 15 (S15-3): the 15-session SEO program is COMPLETE. There is no Session 16.

- **Decision:** the 15-session SportSignal SEO implementation program is
  COMPLETE. The route plan §10 sequencing (Sessions 1-15) is DONE. The
  implementation work delivered: the crawl/index foundation (C1/C6/C8); the
  match-URL lifecycle mechanism (INERT — the May 2027 decision); the homepage
  one-month window + carousel crawlability + curated-selection promise; the
  match-detail footer-hook team-link gating; the team-page @graph WebPage node
  + the competition-page @graph CollectionPage node; the /teams index tile
  ordering (the 13 selected clubs first); the Persian entity-naming/metadata
  polish (og:type=article + SEO_EXTRA_ALIASES); the EN architecture decision
  (FINAL — Option (b)); the structured-data validation (the
  MISSING-IS-NOT-ZERO law; the SportsEvent JSON-LD is schema.org-VALID); the
  mobile-performance preconnect (freeze-safe) + the GSC monitoring view + the
  GA4 DEFER + the GA4 evaluation. The residual work is owner-driven follow-ups
  (the post-Dec-8 freeze-lift decisions + the measurement requests + the
  Workers Paid plan + the product/UX follow-ups) — NOT a further
  implementation session. The "project complete" handoff is delivered in
  `seo-implementation/next-session-prompt.md`.
- **Options considered:** (a) declare the program COMPLETE (the route plan
  §10 is DONE; the regression is clean) [chosen]; (b) open a Session 16
  [rejected — the route plan is a 15-session program; there is no Session 16
  scope; the residual work is owner-driven, not an implementation session].
- **Reason:** the route plan §10 sequencing defines 15 sessions; Session 15 is
  the final regression + the handoff. The residual follow-ups (the post-Dec-8
  freeze-lift decisions + the measurement requests + the Workers Paid plan +
  the product/UX follow-ups) are owner-driven decisions that need owner
  input/data (the fresh GSC export, the CrUX data, the paid-plan decision) —
  they are NOT further implementation work the agent can do autonomously.
- **Who decided.** The agent (SEO Session 15), on the route plan §10
  sequencing (Sessions 1-15) + the phase file's deliverables (the
  FINAL-SEO-IMPLEMENTATION-REPORT.md + the "project complete" handoff).
- **When to revisit.** When the owner supplies the fresh 16-month GSC export
  AND/OR decides on the Workers Paid plan AND/OR wants to pursue a specific
  follow-up (the S2 title-test re-fire, the S06-H3 follow-up, the S1
  spelling-fix judgement, the S11 SEO_EXTRA_ALIASES extension, the S13-1
  option (c) Events rich-result eligibility revisit, the S26 UI/UX iteration,
  the S10-2 homepage→team/competition gap, the S14 Cloudflare beacon extension
  to SEO pages) — a fresh session prompt would be written then (the
  `seo-implementation/next-session-prompt.md` "project complete" handoff lists
  these as the owner's options).

## 2026-11-17 — SEO Session 14 (S14-1): the preconnect to crests.football-data.org — IMPLEMENTED, freeze-safe (the S24-P2 item). A `<link rel="preconnect" href="https://crests.football-data.org">` added to BOTH the homepage `<head>` (`src/pages/public.ts`) AND the SEO page shell `<head>` (`src/seo/page-shell.ts` — covers match/team/competition/hubs/static). The DNS+TCP+TLS handshake starts at HTML-byte-0 so the first crest `<img>` that parses below the fold fetches without the handshake delay.

- **Decision:** IMPLEMENT the preconnect (the S24-P2 parked item — the post-Dec-8 perf/CWV track). The preconnect is a render-performance HINT — the browser opens the DNS+TCP+TLS connection to crests.football-data.org at HTML-parse time (byte-0) instead of waiting for the first `<img class="mcrest|stcrest|...">` discovery below the fold. Zero new runtime fetch, zero subrequest, zero KV read, zero Worker CPU (the `<link>` is a static string in the HTML template; the browser MAY open the connection but the Worker does NOT fetch). NO `crossorigin` attribute — crest `<img>` requests are non-CORS (`referrerpolicy="no-referrer"`; simple image requests); a `crossorigin` preconnect would open a SEPARATE connection that the image fetches would NOT reuse, defeating the optimization. Placed EARLY in `<head>` (after the viewport meta, before the icons / the themeInit / the font preloads / the stylesheet) so the handshake precedes the render-blocking stylesheet parse. Version bump: 13.267.0-persian-entities → 13.268.0-perf-preconnect. Deployed: version `a4cc2982-c6fa-493f-907b-e71d89c1f33f` @100%. Live-verified: the preconnect is present in the homepage HTML + the match-page HTML + the team-page HTML + the competition-page HTML. The new `check-seo-performance.js` gate (17 gates) pins the contract. `npm test` 3,720 → 3,738 OK.
- **Options considered:** (a) IMPLEMENT the preconnect now [chosen — the S24-P2 item is a documented parked candidate; the crest domain is confirmed live (`crests.football-data.org/64.png` etc.); the preconnect is freeze-safe (a render-performance HINT, NOT a title/H1/description/answer byte); zero runtime cost]; (b) defer the preconnect to post-Dec-8 [rejected — the preconnect is freeze-safe NOW; deferring would delay a zero-cost optimization that benefits the mobile-first audience (Mobile = 94.8% of clicks) during the measurement window]; (c) add `crossorigin` to the preconnect [rejected — crest `<img>` requests are non-CORS; a crossorigin preconnect opens a separate connection the image fetches would NOT reuse].
- **Reason:** the S24 parked items (the post-Dec-8 perf/CWV track) are the Session 14 scope (the route plan §10 + the phase file). P2 (preconnect to crests.football-data.org) is a standard, safe CWV optimization for third-party image origins. The crest images are the primary external render-dependency on every page (the homepage big-matches box + the UCL table + the cups; the match/team/competition facts panel + standings + the breadcrumb competition chip). The preconnect eliminates the DNS+TLS handshake latency for these fetches. The freeze-safety: the preconnect is a `<link>` in `<head>` — NOT a GSC-measured title/H1/description/answer-sentence byte (the same discipline as the S11 og:type=article + SEO_EXTRA_ALIASES non-title metadata changes — freeze-safe per Dec 4-8). The render-path audit (the SESSION-14 report §2) confirmed the preconnect does NOT add to the Worker CPU (it is a client-side hint; the 10ms CPU cliff on cold match renders is the Worker-side render cost, NOT the client-side fetch cost).
- **Who decided:** the agent (the S24-P2 item is a documented parked candidate; the implementation is the standard CWV optimization; the freeze-safety is the same discipline as S11).
- **Revisit:** if the owner supplies the CrUX / PageSpeed Insights data post-deploy, measure the mobile LCP/INP/CLS before/after the preconnect (the CWV improvement may take weeks to show in CrUX; the structural improvement is verified by the render-path audit + the check gate). If a future session extends the crest images to a different domain (a CDN migration), update the preconnect href + the check gate.

## 2026-11-17 — SEO Session 14 (S14-2): the S24-P1 hero `loading="lazy"` — REJECTED with reasoning. The hero poster (`/hero-poster.jpg`) is the above-the-fold LCP image. It already ships `fetchpriority="high"` + a media-scoped `(max-width:899px)` preload (v13.224-herolcp). Adding `loading="lazy"` to an above-the-fold LCP image would DELAY the LCP. The below-the-fold images (crests, mc-port portraits, emblems, standings logos) ALREADY use `loading="lazy"`.

- **Decision:** REJECT the S24-P1 item (do NOT add `loading="lazy"` to the hero poster). The hero poster is the LCP (Largest Contentful Paint) element on mobile (the `div.hero-bg > img.bg-photo` — the v13.224-herolcp diagnostic). It already ships the LCP protection: `fetchpriority="high"` on the `<img>` + a media-scoped `(max-width:899px)` `<link rel="preload" as="image" fetchpriority="high">` in the `<head>` (so the fetch starts at HTML-byte-0, before the render-blocking stylesheet applies the element's display rule). Adding `loading="lazy"` would tell the browser to DEFER the fetch until the image is near the viewport — but the hero IS the viewport (above-the-fold); the deferral would delay the LCP fetch, regressing the mobile LCP. The S24-P1 INTENT (lazy-load below-the-fold images) is ALREADY satisfied: the crest images (`markup.ts:62`, `pages.ts:169/1981`, etc.), the mc-port portraits (`router.ts:349`), the emblems (`markup.ts:148/266/349/453/499`, `pages.ts:258/1754/1943/2261`), the standings logos ALL ship `loading="lazy" + decoding="async"`. The hero league logo ships `loading="eager"` (correct — it is part of the above-the-fold hero presentation). The `check-seo-performance.js` gate pins: (1) the hero poster preload with `fetchpriority="high"` is present; (2) the hero-bg img does NOT carry `loading="lazy"`; (3) the below-the-fold crest/portrait images DO carry `loading="lazy"`.
- **Options considered:** (a) REJECT P1 — the hero is the LCP, lazy would delay it [chosen]; (b) IMPLEMENT P1 — add `loading="lazy"` to the hero [rejected — would regress the mobile LCP, the #1 CWV metric for the mobile-first audience]; (c) add `loading="lazy"` to the hero ONLY on desktop [rejected — the hero is above-the-fold on desktop too; the desktop lab LCP is already 0.9s (the v13.224-herolcp diagnostic); lazy would not help + risks regressing].
- **Reason:** the S24-P1 item was parked with the note "the hero image is above-the-fold — loading='lazy' may NOT be right for it; evaluate". The evaluation confirms: the hero IS the LCP, the LCP protection (`fetchpriority="high"` + the preload) is already in place, and lazy-loading the LCP image is an anti-pattern. The below-the-fold lazy discipline is already satisfied. P1 is correctly NOT applied to the hero.
- **Who decided:** the agent (the LCP-protection discipline — the v13.224-herolcp diagnostic established the hero-as-LCP fact; the standard CWV guidance is "do not lazy-load the LCP image").
- **Revisit:** if the hero presentation changes (a different LCP element), re-evaluate. If the owner supplies the CrUX data showing the LCP is NOT the hero poster (e.g., a text block is the LCP), re-evaluate.

## 2026-11-17 — SEO Session 14 (S14-3): the GA4 DEFER decision. GA4 is NOT installed. The Cloudflare Web Analytics (cookieless RUM) IS already installed on the homepage. The consent management platform + the privacy policy + the performance budget are the prerequisites. The Workers Paid plan is the budget priority.

- **Decision:** DEFER the GA4 install (do NOT install GA4 this session — the default per the phase file's item 6: "Do not install it automatically if configuration/consent is unclear"). GA4 is NOT installed (no `<script>` tag, no `gtag()` call, no GA4 measurement ID `G-XXXXXXXXXX` in the codebase — verified). The Cloudflare Web Analytics (cookieless RUM) IS already installed on the homepage (`src/pages/public.ts` — the `beacon.min.js` with `send.to: /cdn-cgi/rum`; cookieless, deferred via `type="module"`, ~10KB). The consent management platform (CMP) is NOT established (no cookie banner, no consent dialog). The privacy policy is NOT updated for analytics cookies (the site has `/methodology` + `/about` but no `/privacy` page disclosing analytics cookies). The performance budget for the GA4 script is NOT allocated (the GA4 script is a render-blocking fetch + a JS execution cost per page — against the 10ms CPU cliff [client-side, not Worker-side] + the mobile-first audience [Mobile = 94.8% of clicks] on throttled connections). The jurisdictional assessment is NOT done (Iran = 98.4% of clicks — Iran's 2022 Personal Data Protection Act; the Persian-diaspora in GDPR jurisdictions [Germany 50 impr, Netherlands, UK] — the ePrivacy Directive + the UK GDPR/PECR require EXPLICIT CONSENT before the GA4 script loads; the Schrems II ruling adds a data-transfer assessment for EU → US data flows). The prerequisites for a future GA4 install: (1) a CMP that meets the GDPR/ePrivacy + UK GDPR/PECR bar; (2) a `/privacy` page disclosing the analytics cookies + the data collection + the data-transfer assessment; (3) a performance budget (the GA4 script + the CMP must NOT regress the mobile LCP/INP/CLS by more than 100ms — measured with the PageSpeed Insights API with an API key); (4) the jurisdictional assessment; (5) the Workers Paid plan decision ($5/mo → 1M KV reads/day — the budget priority over the GA4 consent infrastructure). The recommended path: extend the Cloudflare beacon to the SEO pages (one-line, cookieless, freeze-safe) + use the GSC monitoring view + pursue the Workers Paid plan first. The full evaluation is in `docs/specs/GA4-EVALUATION.md`.
- **Options considered:** (a) DEFER GA4 — the consent/perf prerequisites are not met [chosen — the default per the phase file]; (b) INSTALL GA4 now with `async` + a basic banner [rejected — the CMP does not meet the GDPR bar (freely given, specific, informed, unambiguous consent; no pre-ticked boxes); the privacy policy is not updated; the jurisdictional assessment is not done; the performance budget is not measured]; (c) INSTALL GA4 on the homepage only [rejected — the same consent/perf prerequisites apply to the homepage too].
- **Reason:** the phase file's item 6 says "Evaluate GA4 as optional: first check existing analytics, privacy/legal/consent setup and performance impact. Do not install it automatically if configuration/consent is unclear." The existing analytics check revealed the Cloudflare Web Analytics (cookieless RUM) is ALREADY installed — this covers the core measurement needs (page views + CWV + country/device) WITHOUT the GA4 consent burden. The GSC monitoring view (the S14-4 deliverable) covers the SERP performance. The marginal measurement GA4 adds (the session/engagement/funnel) is NOT the SEO program's measurement gap. The Workers Paid plan is the budget priority (the KV-read quota is exceeded daily; the $5/mo is the durable fix + the prerequisite for any future `/en/` URL architecture [the S12-1 axis 2]). The GA4 consent infrastructure (the CMP + the privacy policy + the legal assessment) would cost more than $5/mo in owner/contractor time.
- **Who decided:** the agent (the default per the phase file; the consent/perf prerequisites are objectively not met).
- **Revisit:** when the owner wants the per-user behavior / the conversion funnel data that GSC + the Cloudflare beacon do NOT cover; AND the Workers Paid plan is in place; AND the CMP + the privacy policy are established; AND the performance budget is measured. The `docs/specs/GA4-EVALUATION.md` §7 documents the revisit triggers.

## 2026-11-17 — SEO Session 14 (S14-4): the GSC monitoring view — the per-page-class markdown report + the monitoring cadence + the GSC filter instructions. No dashboard tool is built.

- **Decision:** ESTABLISH the GSC monitoring view as a DOCUMENTATION deliverable (`seo-implementation/GSC-MONITORING-VIEW.md`). The report defines: (1) the per-page-class URL patterns (match-detail, homepage, selected-team detail, competition detail, date hubs, matches hub + pagination, index pages); (2) the GSC filter instructions for each class (the exact Page filter / regex); (3) the baseline metrics from the 2026-11-15 GSC export (250 clicks / 9,465 impressions / 412 URLs; Mobile = 94.8% of clicks; Iran = 98.4% of clicks); (4) the monitoring cadence (weekly for the top 4 page classes — match-detail, homepage, date-hub tomorrow, selected-team detail; monthly for the full snapshot; post-Dec-8 for the freeze-lift measurement); (5) the GSC report URLs / filter sets the owner should check (Search Results, Pages, Queries, Devices, Countries, Enhancements/Events, Coverage/Pages). No dashboard tool is built (the phase file's item 5: "a markdown report + the GSC filter instructions is sufficient"). The report is the documentation deliverable — the owner runs the GSC exports per the cadence.
- **Options considered:** (a) a markdown report + the GSC filter instructions [chosen — the phase file's stated sufficiency]; (b) a dashboard tool (a script that fetches the GSC API + renders a dashboard) [rejected — the GSC API requires an API key + a service account; the phase file says "a markdown report is sufficient"; the dashboard would be a new runtime dependency against the free-tier budget]; (c) defer the monitoring view to a future session [rejected — the phase file's item 5 is a Session 14 deliverable].
- **Reason:** the phase file's item 5 says "Establish a GSC monitoring view/report for homepage, match, selected-team, competition and date pages." The 2026-11-15 GSC export is the baseline (the existing reference). The per-page-class aggregation (the Pages.csv → the 9 page classes) is the view. The monitoring cadence (weekly/monthly/post-Dec-8) is the discipline. The GSC filter instructions are the owner's checklist. The report does NOT fabricate CWV numbers (the PageSpeed Insights API was quota-blocked; the CrUX API requires a key — the structural analysis is the fallback, documented in the report's §5).
- **Who decided:** the agent (the phase file's item 5 is a documentation deliverable; the markdown report is the stated sufficiency).
- **Revisit:** the FIRST fresh 16-month GSC export after Dec 8 replaces the 2026-11-15 baseline as the new reference point (the post-Dec-8 freeze-lift measurement). The owner should export on Dec 9 (or the first business day after Dec 8).

## 2026-11-17 — SEO Session 14 (S14-5): the freeze-coordination — the preconnect is a render-performance HINT (NOT a GSC-measured title/H1/description/answer byte). The Dec 4-8 freeze holds. The S14 mobile-performance work is spelling-freeze-aware.

- **Decision:** the S14 mobile-performance work (the preconnect to crests.football-data.org — S14-1) is freeze-safe. The preconnect is a `<link>` in `<head>` — NOT a GSC-measured title/H1/description/answer-sentence byte. The byte-frozen surfaces — the match-page title/H1/description/answer-sentence (Session 7), the team-page title/H1/description/answer (Session 8), the competition-page title/H1/description/answer (Session 9), the homepage title/H1 (Session 6), the date-hub empty-state copy on `/matches/tomorrow` (S06-H3), the team-name spellings in fa-dict.ts (the S1 M2 F3 spelling fix is LIVE and mid-measurement — judge ~Dec 8) — are ALL untouched. The S14 preconnect is the same class as the S11 og:type=article + SEO_EXTRA_ALIASES non-title metadata changes (freeze-safe per Dec 4-8). The S24-P1 hero-lazy REJECTION (S14-2) touches NOTHING (it is a REJECTION — no code change). The GA4 DEFER (S14-3) touches NOTHING (no script installed). The GSC monitoring view (S14-4) is documentation-only. The version bump (13.267.0 → 13.268.0) records the preconnect change (a render-performance HINT, NOT a byte-frozen surface). The `check-seo-performance.js` gate pins the freeze-coordination: the preconnect is a `<head>` `<link>` only — it does NOT touch any byte-frozen title/H1/description/answer-sentence byte.
- **Options considered:** (a) implement the preconnect now (freeze-safe) [chosen]; (b) defer the preconnect to post-Dec-8 [rejected — the preconnect is freeze-safe NOW; deferring would delay a zero-cost optimization].
- **Reason:** the prompt's Step 4 says "the mobile-performance optimizations (image loading, preconnect, render-cost reductions) are NOT GSC-measured title/H1 bytes — safe under the freeze IF they do not touch the byte-frozen title/H1/description/answer-sentence bytes (the same discipline as the S11 og:type=article + SEO_EXTRA_ALIASES freeze-safe changes). Adding loading='lazy' to below-the-fold images or a <link rel='preconnect'> is a render-performance change (NOT a title/H1 byte change) — freeze-safe." The preconnect is exactly this case.
- **Who decided:** the agent (the freeze-safety is the same discipline as S11; the preconnect is a render-performance HINT).
- **Revisit:** the Dec 4-8 freeze lifts on Dec 9. The post-Dec-8 sessions can touch the byte-frozen surfaces (the S2 title-test re-fire, the S06-H3 follow-up, the S1 spelling-fix judgement, the S11 SEO_EXTRA_ALIASES extension, the S13-1 option (c) Events rich-result eligibility revisit).



- **Decision:** the GSC "Events" enhancement report behind the 13 "Missing field location" Critical items was inspected directly this session (`docs/assets/gsc/sportsignal.ir-Events-2026-11-15.zip` → `Critical issues.csv` + `Non-critical issues.csv`). The schema type IS confirmed as **SportsEvent** (the GSC "Events" report groups Event/SportsEvent; the live JSON-LD on the click-earner `/matches/barcelona-vs-manchester-city-2026-12-08` emits `@type: SportsEvent` — verified). The report shows ONE Critical issue type + FOUR non-critical issue types, ALL of which are the honest "missing recommended field" class — NONE is a real structured-data error:
  1. **`Missing field 'location'` — 13 items, Critical.** These are the no-venue matches (matches where NEITHER the deterministic home-ground table `src/grounds.ts` NOR the FD v4 detail call `hydrateMatchVenue` returned a venue). The `sportsEventNode` builder (`src/seo/jsonld.ts:149-154`) emits the `location` property ONLY when `m.venue` is truthy — the `if (m.venue)` guard. The 13 items are Google's rich-result ELIGIBILITY warning (the Events rich result recommends `location`), NOT a schema.org validation error. Google does NOT penalize recommended-field absence. The MISSING-IS-NOT-ZERO law holds — verified live: 6 upcoming no-venue matches (`/matches/lazio-vs-lecce-2026-11-21`, `/matches/parma-vs-roma-2026-11-21`, `/matches/hull-city-vs-brighton-and-hove-albion-2026-11-22`, `/matches/sv-07-elversberg-vs-freiburg-2026-11-21`, `/matches/lille-osc-vs-olympique-lyonnais-2026-11-21`, `/matches/borussia-monchengladbach-vs-borussia-dortmund-2026-11-21`) all correctly OMIT the `location` property.
  2. **`Missing field 'address' (in 'location')` — 18 items, Non-critical.** These are the matches WITH a venue name (the `location` node is a `StadiumOrArena` with `name`) but WITHOUT an address. The data source (FD v4 detail + the home-ground table) carries the venue NAME only, NOT the address. Per the MISSING-IS-NOT-ZERO law, the address is OMITTED (never invented). Google does not penalize recommended-field absence.
  3. **`Missing field 'endDate'` — 31 items, Non-critical.** The SportsEvent node lacks `endDate`. The FD data does NOT carry the match end time. Per the S-05 no-invented-data law, `endDate` is OMITTED (never fabricated as startDate + 105min). The `eventStatus` field already reflects whether the match is scheduled/finished/postponed/cancelled — the endDate is not in the data.
  4. **`Missing field 'offers'` — 31 items, Non-critical.** The SportsEvent node lacks `offers` (ticket offers). SportSignal does NOT sell tickets and does NOT carry ticket data. Per the S-04 no-fake-offers law, `offers` is OMITTED. The existing `check-match-centre.js` S20 gate + the `seo-check.js` T-04 live-audit gate already pin the ABSENCE of `offers`/`aggregateRating` (the honesty law).
  5. **`Missing field 'performer'` — 31 items, Non-critical.** The SportsEvent node lacks `performer`. For a team sport, the teams are already in `homeTeam`/`awayTeam` (SportsTeam nodes). Adding individual player names as `performer` is NOT part of the page's visible content contract + would be filler (the spec "Do not add filler text to match a word count"). Per the no-filler law, `performer` is OMITTED.

  NO `location`/`address`/`endDate`/`offers`/`performer` is added where no true value exists. The MISSING-IS-NOT-ZERO law holds. Fabricating any of these would be a spec violation (MASTER-SEO-SPEC §6 — "Never fabricate an address or use a generic placeholder. Only add schema matching visible page content") + a data-integrity violation (the S-05 no-invented-data rule). The SportsEvent type is correct (NOT Event — SportsEvent is the more-specific schema.org type for a football match; the existing `check-match-centre.js` S16-Schema gate pins that SportsEvent is the ONLY event-type node). Rich results for SportsEvent are NOT guaranteed (Google's rich-result eligibility is language/region-dependent; the Persian/IR market may not be eligible for all rich-result types) — the structured data is for entity grounding + the knowledge graph, NOT a rich-result guarantee (per the phase file step 5: "do not promise a rich result"). NO code change. NO deploy.
- **Options:** (a) keep the MISSING-IS-NOT-ZERO law — omit `location`/`address`/`endDate`/`offers`/`performer` where no true value exists; document the decision; no code change, no deploy (chosen — the same discipline as Session 12 Option (b)); (b) fabricate a generic `location`/`address`/`endDate`/`offers`/`performer` for the flagged matches to satisfy the rich-result eligibility (a spec violation + a data-integrity violation — explicitly forbidden by MASTER-SEO-SPEC §6 + the S-05 rule); (c) add a `location` from an external source (a stadium database / Wikidata) for the no-venue matches (out of scope — the data source is FD v4 + the curated home-ground table; an external stadium lookup would add a new fetch path against the Cloudflare free-tier budget + the provenance would need per-entry verification — a post-Dec-4 decision with a fresh GSC export IF the owner wants to pursue Events rich-result eligibility).
- **Reason:** the phase file (`SESSION-13-STRUCTURED-DATA.md`) step 4 says "Add only properties supported by accurate source data. Never invent stadium/venue/address." Session 7's audit (S07-H3) verified the 13 items are the no-venue matches. This session re-confirmed the schema type (SportsEvent — from the GSC Events report filename + the live JSON-LD) + re-verified the MISSING-IS-NOT-ZERO law holds (the `if (m.venue)` guard in `jsonld.ts:149-154` + the fail-closed `hydrateMatchVenue` in `data.ts:506-567` + the live no-venue matches). The inspection ALSO surfaced 4 non-critical issue types (endDate/offers/performer/address) — ALL the same honest "missing recommended field" class (no source data for any of them). The Schema Markup Validator (validator.schema.org — the authoritative schema.org validator) confirms BOTH the with-venue match (Barcelona–Man City) AND the no-venue match (Lazio–Lecce) are schema.org-VALID — "no errors, no warnings" on WebPage + BreadcrumbList + SportsEvent (schema.org treats `location`/`address`/`endDate`/`offers`/`performer` as RECOMMENDED, not required — so the validator does not flag their absence). The GSC "Missing field" items are Google's RICH-RESULT ELIGIBILITY warnings (the Events rich result recommends these fields), NOT schema.org validation errors. Google does NOT penalize recommended-field absence; the items are informational ("if you have this data, add it"), not errors. The existing gates (`check-match-centre.js` S20 SportsEvent-facts gate at lines 4037-4038 + the `seo-check.js` T-04 live-audit gate) ALREADY pin the SportsEvent contract + the MISSING-IS-NOT-ZERO law (the `if (m.venue)` guard) + the absence of `endDate`/`offers`/`aggregateRating`/`review` (the S-03/S-04 honesty law) — so no new `check-seo-structured-data.js` gate is needed (the contract is already covered comprehensively). Option (b) is the spec violation the law forbids; option (c) is a future-scope decision (a post-Dec-4 decision with a fresh GSC export IF the owner wants to pursue Events rich-result eligibility via an external stadium-lookup — out of scope for Session 13). The Dec 4-8 freeze is moot: the S13 inspection is read-only (no code change, no byte-frozen surface touched).
- **Who decided:** the agent (the GSC Events enhancement report is conclusive — the schema type is confirmed + the items are ALL the honest "missing recommended field" class; the MISSING-IS-NOT-ZERO law is the standing spec §6 rule; the Schema Markup Validator independently confirms the structured data is schema.org-valid; the existing gates already pin the contract; the decision is within the Session 13 scope per the route plan §10 + the phase file).
- **Revisit:** after Dec 4-8, with a fresh 16-month GSC export (the program's top evidence request), IF the owner wants to pursue Events rich-result eligibility (to potentially gain the Events rich-result snippet), evaluate option (c): a curated, per-entry-verified stadium-lookup (the home-ground table `src/grounds.ts` extended to cover the no-venue matches' home teams, OR a Wikidata sameAs stadium lookup) — ONLY where a true venue value exists + the provenance is verified per entry. NEVER fabricate. Until then, the MISSING-IS-NOT-ZERO law stands + the 13 "Missing field location" items + the 4 non-critical issue types stay as honest "missing recommended field" warnings (no penalty, no schema error).

## 2026-11-17 — SEO Session 13 (S13-2): the freeze-coordination — the S13 inspection is read-only (NO code change, NO byte-frozen surface touched, NO deploy, NO version bump); the structured-data JSON-LD is machine-readable (NOT a GSC-measured surface) — safe under the Dec 4-8 freeze; the existing gates already pin the SportsEvent contract

- **Decision:** the S13 deliverable is documentation-only: `docs/DECISIONS.md` (this S13-1/S13-2/S13-3 block), `seo-implementation/architecture/ROUTE-AND-CANONICAL-PLAN.md` §10 (a Session 13 sequencing note), `seo-implementation/session-reports/SESSION-13.md` (the session report), `docs/HANDOFF.md` (rewritten for Session 13), `CHANGELOG.md` (a Session 13 docs-only entry), `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` (the Session 13 row), `docs/assets/gsc/s13/` (the validation evidence — the GSC Events CSVs + the live JSON-LD snapshots + the Schema Markup Validator screenshots + this README), and `seo-implementation/next-session-prompt.md` (the Session 14 prompt). NO `src/` file is touched (the `sportsEventNode` builder + the `hydrateMatchVenue` function + the `buildMatchPage` call site stay as-is — they are already correct). NO `scripts/` file is touched (no new `check-seo-structured-data.js` gate — the existing `check-match-centre.js` S20 SportsEvent-facts gate + the `seo-check.js` T-04 live-audit gate ALREADY pin the SportsEvent contract + the MISSING-IS-NOT-ZERO law + the absence of `endDate`/`offers`/`aggregateRating`/`review`; adding a new gate would be redundant). NO `assets/` file is touched. NO version bump (the version stays `13.267.0-persian-entities`; `package.json` stays `13.267.0.0`). NO deploy (the live deployment `21efcee2-269a-4ad1-819c-b6027822607a` @100% stays). The byte-frozen surfaces — the match-page title/H1/description/answer-sentence (Session 7), the team-page title/H1/description/answer (Session 8), the competition-page title/H1/description/answer (Session 9), the homepage title/H1 (Session 6), the date-hub empty-state copy on `/matches/tomorrow` (the S06-H3 follow-up is post-Dec-4), the team-name spellings in fa-dict.ts (the S1 M2 F3 spelling fix is LIVE and mid-measurement — judge ~Dec 8) — are ALL untouched. The structured-data JSON-LD is machine-readable (NOT in the SERP snippet, NOT a GSC-measured title/H1 byte) — safe under the freeze. The S13 inspection is read-only (no JSON-LD addition, no JSON-LD removal — the inspection confirmed the existing JSON-LD is correct).
- **Options:** (a) ship a docs-only inspection record (chosen — the inspection found NO real structured-data errors, only the honest "missing recommended field" class); (b) add a new `check-seo-structured-data.js` gate pinning the @graph node contract per page class + the `location` property emission logic + the MISSING-IS-NOT-ZERO law (a code change the inspection does not justify — the existing `check-match-centre.js` S20 gate already pins this comprehensively at lines 4037-4038); (c) deploy a no-op version bump to stamp the session (unnecessary — the prompt's docs-only discipline says "No deploy").
- **Reason:** the prompt's scope (Step 4) says "If the inspection confirms NO real errors (the 13 items are the honest 'missing recommended field' class — the no-venue matches, the MISSING-IS-NOT-ZERO law holds): Document the decision in `docs/DECISIONS.md` (S13-1). No code change. No deploy. Say so explicitly (the same discipline as Session 12 Option (b))." The inspection confirmed exactly that. The existing `check-match-centre.js` S20 SportsEvent-facts gate (lines 4037-4038) pins: `if (m.venue)` guard present + `ev.location =` present + `ev.description = why` present + `startDate: isoWithTehranOffset` + `homeTeam: teamRef` + `awayTeam: teamRef` + `organizer:` + NO `endDate:`/`offers:`/`aggregateRating:`/`review:` — the comment explicitly states "the venue omits when absent — the MISSING-IS-NOT-ZERO law". The `seo-check.js` T-04 live-audit gate checks the match page's @graph has a SportsEvent node + all required fields + NO offers/aggregateRating. The `check-match-centre.js` S16-Schema gate (lines 4089-4102) pins that SportsEvent is the ONLY event-type node (no Event/Article/BlogPosting). The contract is already covered — adding a new `check-seo-structured-data.js` gate (option b) would be redundant + a code change the docs-only discipline forbids. The freeze is moot: no byte-frozen surface is touched by a read-only inspection. `npm test` stays at the **3,720 OK** baseline (no new check added, no code changed — verified before the push).
- **Who decided:** the agent (the prompt's docs-only discipline is explicit for the "no real errors" case; the existing gate coverage is verified; the freeze-safe discipline is the standing constraint).
- **Revisit:** if a future session (post-Dec-4, with a fresh GSC export) pursues Events rich-result eligibility (option (c) of S13-1 — a curated stadium-lookup for the no-venue matches), THAT session adds the `check-seo-structured-data.js` gate pinning the new `location` emission + the provenance-verification contract + the version bump + the deploy. Until then, no code change.

## 2026-11-17 — SEO Session 13 (S13-3): the validation evidence + the KV read quota healthy at session close (no deploy — docs-only session; the live deployment stays at 13.267.0-persian-entities)

- **Decision:** the validation evidence is saved in `docs/assets/gsc/s13/`: (1) the GSC Events enhancement report CSVs — `sportsignal.ir-Events-Critical-issues-2026-11-15.csv` (the 13 "Missing field location" items) + `sportsignal.ir-Events-Noncritical-issues-2026-11-15.csv` (the 4 non-critical issue types: endDate 31 / offers 31 / performer 31 / address-in-location 18) + `sportsignal.ir-Events-Chart-2026-11-15.csv` (the daily Invalid/Valid Events count); (2) the live JSON-LD snapshots — `live-jsonld-with-venue-barcelona-vs-mancity-2026-12-08.json` (the click-earner match WITH a venue — the SportsEvent node carries `location: { @type: StadiumOrArena, name: "Camp Nou" }`) + `live-jsonld-no-venue-lazio-vs-lecce-2026-11-21.json` (a no-venue match — the SportsEvent node correctly OMITS `location` + `endDate` + `offers` + `performer` + `aggregateRating` — the MISSING-IS-NOT-ZERO law holds); (3) the Schema Markup Validator screenshots — `smv-with-venue-barcelona-vs-mancity-2026-12-08.png` + `smv-no-venue-lazio-vs-lecce-2026-11-21.png` (both pages pass validator.schema.org with "no errors, no warnings" on WebPage + BreadcrumbList + SportsEvent — schema.org treats `location`/`address`/`endDate`/`offers`/`performer` as RECOMMENDED, not required). The Rich Results Test (https://search.google.com/test/rich-results) was reCAPTCHA-blocked for automated browser access (expected — Google blocks automated access to the Rich Results Test); the GSC Events enhancement report IS the batch Rich Results Test result (GSC runs Google's rich-result parser across all crawled pages), so the GSC report IS the Rich Results Test evidence. The live `/healthz` at Session 13 close (2026-11-17, docs-only — no deploy) returned `ok:true` + `pool_matches:324` + `pool_age_min:54` + `kv_writes_day:329` + `kv_writes_web:151` + `degraded:false` + `subreq_last_tick:29` + `version:13.267.0-persian-entities`. The KV quota is healthy (the reads are working — the data surfaces are rendering; the live JSON-LD on the click-earner match + the 6 no-venue matches all rendered correctly). The live deployment stays at `13.267.0-persian-entities` (deployment `21efcee2-269a-4ad1-819c-b6027822607a` @100% — the Session 11 deploy; unchanged by the docs-only S13 session). The `sched_next_ko: 2026-11-20T19:30:00.000Z` (the Bayern–Köln S27 auto-verify window) is days away — irrelevant for a docs-only session (no deploy), and noted for the next session's deploy-window check.
- **Options:** (a) save the validation evidence as text + screenshots in `docs/assets/gsc/s13/` + check `/healthz` at session close + record the state + no deploy (chosen — docs-only session; the phase file step 6 says "Save the validation evidence (screenshots or text) in `docs/assets/`"); (b) skip the validation evidence (the phase file step 6 explicitly requires it); (c) deploy a no-op version bump to stamp the session (unnecessary — the prompt's docs-only discipline says "No deploy").
- **Reason:** the phase file (`SESSION-13-STRUCTURED-DATA.md`) step 6 says "Validate representative pages with Rich Results Test and structured data validators. Use the Rich Results Test (https://search.google.com/test/rich-results) + the Schema Markup Validator (https://validator.schema.org/) on representative pages (a match page with a venue, a match page without a venue, a team page, a competition page, a hub). Save the validation evidence (screenshots or text) in `docs/assets/`." This session validated TWO representative match pages (a with-venue match — the Barcelona–Man City click-earner; a no-venue match — Lazio–Lecce) with the Schema Markup Validator (the authoritative schema.org validator). Both pass with "no errors, no warnings" — confirming the structured data is schema.org-VALID regardless of whether the venue is present. The Rich Results Test was reCAPTCHA-blocked (Google blocks automated browsers); the GSC Events enhancement report IS the batch Rich Results Test result (the report's "Missing field location" Critical items + the 4 non-critical issue types ARE the Rich Results Test's findings across all crawled match pages). The standing constraint (carried from Sessions 5-12): "re-check the KV quota at every session close." The quota is healthy at Session 13 close (it had reset; the reads are working — the live JSON-LD rendered correctly on all sampled pages). The S13 decision (docs-only) has zero new KV reads (no code, no render path change), so it cannot worsen the quota issue. The owner should continue to investigate the read-source; the durable fix is a Workers Paid plan ($5/mo → 1M reads/day).
- **Who decided:** the agent (the phase file step 6 is explicit; the standing constraint is explicit; the docs-only session needs no deploy).
- **Revisit:** at every session close until the owner resolves the daily-exceedance issue. The next session (Session 14 — mobile performance + GSC monitoring + optional GA4) DEPLOYS if it makes runtime changes; re-check the quota before that deploy. The Rich Results Test should be re-run manually by the owner (in a non-automated browser) on the representative pages to capture Google's rich-result eligibility view (the GSC Events report is the batch equivalent, but a single-URL Rich Results Test run gives the per-page detail).

## 2026-11-17 — SEO Session 12 (S12-1): the EN architecture + hreflang decision — Option (b) chosen: maintain the single-language stance (FINAL — not pending a future session); zero English-query demand + the localization cost against the Worker budget is not justified + the EN SERP is saturated by high-authority English-native publishers

- **Decision:** SportSignal stays a single-language (Persian-first) site. NO `/en/` URL architecture is built. NO hreflang is emitted. The client-side `?lang=en` toggle (the EN button + the `html[lang="en"]` CSS rules in `src/pages/public.ts`) stays as the ONLY English surface — it is a runtime display toggle, NOT a URL architecture, NOT a translation the spec §7 hreflang reciprocity law covers. The route plan §8 stance is now FINAL (no longer "pending Session 12"): emitting hreflang for an absent or non-equivalent translation is a spec violation (MASTER-SEO-SPEC §7 — "Do not emit hreflang for an absent or non-equivalent translation"), and there is zero English-query evidence to justify building the URLs. The `scripts/seo-check.js` T-08 codification ("site is single-language (fa) — hreflang not applicable") stays as the live-audit gate. No code change. No deploy.
- **Options:** (a) build the `/en/` URL architecture with genuinely localized pages + reciprocal hreflang (fa-IR + en + x-default); (b) maintain the single-language stance (chosen); (c) defer the decision to a post-Dec-4 session.
- **Reason (three independently-verified evidence axes — all decisive for (b)):**
  1. **English-query demand = ZERO (the decisive axis).** The program's English-query demand evidence was re-verified this session directly from the 2026-11-15 GSC export (`sportsignal-seo-implementation/reference/sportsignal.ir-GSC-11-15.zip` → `Queries.csv`). Across **375 visible query rows** (23 clicks / 4,289 impressions), **374 are Persian** (or Persian-with-a-club-name-token). The **1 Latin-only string is "kups"** (KuPS — the Finnish club Kuopion Palloseura, a one-off European-tie opponent; **1 impression, 0 clicks**, pos 7). One mixed row "بازی como" ("بازی" = Persian "match" + "como" = the Italian club Como; **1 impression, 0 clicks**) is a Persian query with a club-name token, counted as Persian. **ZERO full English queries** — there is no "Arsenal next match", "Champions League fixtures", "Barcelona next game" or any English phrase in the export. The country evidence corroborates: Iran = **248 clicks / 8,774 impressions** (98.4% of clicks, 92.8% of impressions); Afghanistan = 1 click / 438 impressions (Persian-speaking — Dari); the top English-speaking countries (United States 0 clicks / 12 impr pos 22.67, United Kingdom 0 clicks / 6 impr pos 10.33, Canada 0 clicks / 3 impr pos 24.67, Ireland 0 clicks / 2 impr) collectively carry **0 clicks / ~23 impressions at poor positions** — these are Persian-diaspora users searching in Persian, NOT English queries. Mobile = 94.8% of clicks (Persian-first, mobile-first audience). The keyword map §5 held cluster (20 English rows) has **zero GSC-observed demand** — the held rows are candidate/seed phrases, not evidenced demand. **The existing 3-month snapshot is SUFFICIENT to make the decision** because the English-query demand is ZERO (not "low" — zero); a fresh 16-month export would only strengthen the zero-demand finding (more data, same conclusion), not change it.
  2. **The localization cost against the Worker budget is NOT justified.** Building `/en/` URLs doubles the page count (every FA page gets an EN mirror: ~383 sitemap URLs → ~766; the 13 selected-club team pages + the 7 competition pages + the 5 hubs + the ~123 upcoming + ~151 archive match pages). Each EN page render reads the SAME KV data as its FA mirror (`getSeoCtx` = payload + pool + overlay), so **the KV read budget doubles** — and the account's 100,000 KV reads/day free-plan limit is **ALREADY exceeded DAILY** (Sessions 5-11 all closed with it exceeded; the Persian + EN entity-name data surfaces — the rendered faName on team/match/competition pages — go empty when the quota is exceeded). Doubling the read demand would worsen the daily-exceedance: the data surfaces would be empty MORE often during the day. The **10ms CPU/invocation cliff** (CLOUDFLARE-RESOURCE-BASELINE §5) is chronic (37 `exceededResources` in 3h on v13.258, 789 on Nov 10); doubling the page count doubles the cold-render exposure. The sitemap doubles (every FA URL gets an EN mirror row). The free-tier budget is NOT sufficient to absorb the doubling; the durable fix (Workers Paid $5/mo → 1M reads/day) is the owner's decision, not this session's.
  3. **The EN SERP is saturated by high-authority English-native publishers.** The English SERP for the target query families (next-match, matchup + date/time/result, league-schedule) is dominated by BBC Sport, ESPN, the Premier League / La Liga / Serie A / Bundesliga / Ligue 1 official sites, Flashscore and Sofascore — full-coverage, high-link-equity, English-native publishers. SportSignal's curation differentiator (the «برنامه بازی‌های مهم فوتبال» framing — "important matches only") is a Persian-market differentiator that does NOT translate to a competitive English advantage against these publishers. The site's best-CTR surfaces (`/matches/tomorrow` 8.26% CTR; the Barcelona–Man City match page 8.18% CTR) are ALL Persian-query surfaces — there is no English-query surface with demonstrated CTR. Building `/en/` URLs would compete head-on with publishers SportSignal cannot out-rank, for zero evidenced demand, at 2× the Worker cost.
  Option (a) violates the spec §7 hreflang law (hreflang for an absent translation — there are zero EN URLs today) AND incurs a 2× KV-read + 2× CPU-cliff cost the free-tier budget cannot absorb, for zero evidenced demand. Option (c) defers a decision the evidence already decides (zero demand is zero demand regardless of the freeze window). The Dec 4-8 freeze is moot for this decision: Option (b) touches NO byte-frozen surface (no title/H1/description/answer bytes; no team-name spellings; no `/matches/tomorrow` empty-state copy) — it is docs-only.
- **Who decided:** the agent (the evidence is conclusive and independently verified this session from the actual GSC export; the spec §7 law + the route plan §8 stance + the Cloudflare free-tier budget are all explicit; the decision is within the Session 12 scope per the route plan §10).
- **Revisit:** the decision is FINAL for this program. A future session that wants to build `/en/` URLs must re-litigate ALL THREE evidence axes with a FRESH 16-month GSC export (the program's top evidence request) showing **real English-query demand** (full English phrases, not club-name-only strings) + a Workers Paid plan in place (the KV-read budget headroom) + a demonstrated competitive angle against the English-native publishers. Until then, the single-language stance stands. The client-side `?lang=en` toggle stays for the Persian-diaspora / English-reading visitor who wants the EN display — it is NOT an SEO surface and was never the basis for an EN URL architecture.

## 2026-11-17 — SEO Session 12 (S12-2): the freeze-coordination — Option (b) is docs-only; NO byte-frozen surface is touched (no code change, no deploy, no version bump)

- **Decision:** the S12 deliverable is documentation-only: `docs/DECISIONS.md` (this S12-1/S12-2/S12-3 block), `seo-implementation/architecture/ROUTE-AND-CANONICAL-PLAN.md` §8 (the stance updated to FINAL), `seo-implementation/session-reports/SESSION-12.md` (the session report), `docs/HANDOFF.md` (rewritten for Session 12), `CHANGELOG.md` (a Session 12 docs-only entry), `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` (the Session 12 row), and `seo-implementation/next-session-prompt.md` (the Session 13 prompt). NO `src/` file is touched. NO `scripts/` file is touched (no new `check-seo-en-architecture.js` gate — the prompt's Option (b) explicitly says "No code change"). NO `assets/` file is touched. NO version bump (the version stays `13.267.0-persian-entities`; `package.json` stays `13.267.0.0`). NO deploy (the live deployment `21efcee2-269a-4ad1-819c-b6027822607a` @100% stays). The byte-frozen surfaces — the match-page title/H1/description/answer-sentence (Session 7), the team-page title/H1/description/answer (Session 8), the competition-page title/H1/description/answer (Session 9), the homepage title/H1 (Session 6), the date-hub empty-state copy on `/matches/tomorrow` (the S06-H3 follow-up is post-Dec-4), the team-name spellings in fa-dict.ts (the S1 M2 F3 spelling fix is LIVE and mid-measurement — judge ~Dec 8) — are ALL untouched. The S11 freeze-safe changes (og:type=article + SEO_EXTRA_ALIASES + TEAM_SLUGS no-op) stay durable.
- **Options:** (a) ship a docs-only decision record (chosen — Option (b) is a decision, not an implementation); (b) also add an offline `check-seo-en-architecture.js` gate pinning the single-language stance (zero hreflang / zero `/en/` URLs); (c) also update the `scripts/seo-check.js` T-08 wording to "FINAL".
- **Reason:** the prompt's Option (b) explicitly says "No code change. No deploy. Say so explicitly." A decision to maintain the status quo does not need a new offline gate — the existing T-08 live-audit gate ("site is single-language (fa) — hreflang not applicable") already codifies the stance, and the DECISIONS.md S12-1 entry + the route plan §8 FINAL stance are the governance record. Adding a new `check-seo-en-architecture.js` gate (option b) would be a code change the prompt forbids for Option (b), and would also be slightly redundant (the T-08 gate + the DECISIONS record + the route plan §8 FINAL already pin the stance). Updating the T-08 wording (option c) is a cosmetic script change with no behavioral effect — deferred to a future session that touches `seo-check.js` for another reason. The freeze is moot: no byte-frozen surface is touched by a docs-only decision. `npm test` stays at the **3,720 OK** baseline (no new check added, no code changed — verified before the push).
- **Who decided:** the agent (the prompt's Option (b) discipline is explicit; the freeze-safe discipline is the standing constraint).
- **Revisit:** if a future session re-litigates the EN architecture decision (per S12-1's revisit clause) and chooses Option (a), THAT session adds the `check-seo-en-architecture.js` gate + the `/en/` router + the EN page builders + the reciprocal hreflang + the version bump + the deploy. Until then, no code change.

## 2026-11-17 — SEO Session 12 (S12-3): the KV read quota healthy at session close (no deploy — docs-only session; the live deployment stays at 13.267.0-persian-entities)

- **Decision:** the live `/healthz` at Session 12 close (2026-11-17, docs-only session — no deploy) returned `ok:true` + `pool_matches:324` + `pool_age_min:76` + `kv_writes_day:178` + `kv_writes_web:112` + `degraded:false` + `subreq_last_tick:42` + `version:13.267.0-persian-entities`. The KV quota is healthy (the reads are working — the data surfaces are rendering). The live deployment stays at `13.267.0-persian-entities` (deployment `21efcee2-269a-4ad1-819c-b6027822607a` @100% — the Session 11 deploy; unchanged by the docs-only S12 session). The `sched_next_ko: 2026-11-20T19:30:00.000Z` (the Bayern–Köln S27 auto-verify window) is days away — irrelevant for a docs-only session (no deploy), and noted for the next session's deploy-window check.
- **Options:** (a) check `/healthz` at session close + record the state + no deploy (chosen — docs-only session); (b) deploy a no-op version bump to stamp the session (unnecessary — the prompt's Option (b) says "No deploy"); (c) skip the `/healthz` check (the standing constraint says "re-check at every session close").
- **Reason:** the standing constraint (carried from Sessions 5-11): "re-check the KV quota at every session close until the owner resolves the daily-exceedance issue." The quota is healthy at Session 12 close (it had reset; the reads are working). The S12 decision (Option (b)) has zero new KV reads (docs-only — no code, no render path change), so it cannot worsen the quota issue. The owner should continue to investigate the read-source (the 10-min cron + public traffic + the bot may collectively exceed 100K reads/day); the durable fix is a Workers Paid plan ($5/mo → 1M reads/day) — and per S12-1 axis 2, a Workers Paid plan is ALSO a prerequisite for any future `/en/` URL architecture (the 2× KV-read demand).
- **Who decided:** the agent (the standing constraint is explicit; the docs-only session needs no deploy).
- **Revisit:** at every session close until the owner resolves the daily-exceedance issue. The next session (Session 13 — structured data) DEPLOYS if it makes runtime changes; re-check the quota before that deploy.

## 2026-11-17 — SEO Session 11 (S11-1): og:type=article on the 3 detail page types (the S07-H4 follow-up — spec §8 + keyword map §2.7/2.8-2.13/2.15; the byte-frozen title/H1/description/answer-sentence bytes are untouched — the Dec 4-8 freeze holds)

- **Decision:** `buildMatchPage` + `buildTeamPage` + `buildCompetitionPage` (in `src/seo/pages.ts`) now pass `ogType: "article"` to `buildHead`. The 3 detail page types emit `<meta property="og:type" content="article">`. Hubs/index pages (the homepage, `/matches` hub, the 4 time hubs, `/teams` index, `/competitions` index) keep the default `og:type=website` (they pass NO `ogType` — the `page-shell.ts` default stands). The S07-H4 decision (Session 7's prompt: "og:type stays 'website' (not 'article') — deferred to a post-Dec-4 decision") is now DECIDED — the audit verified the current state (every page defaulted to `og:type=website`) + the refinement (match/team/competition detail pages emit `og:type=article`; hubs/index pages keep `og:type=website`) is freeze-safe.
- **Options:** (a) keep `og:type=website` everywhere (the pre-S11 state — every page defaulted to `website`); (b) refine: detail pages emit `article`, hubs/index keep `website` (chosen); (c) defer to a post-Dec-4 session.
- **Reason:** spec §8 + the keyword map §2.7/2.8-2.13/2.15 plan distinguish the detail pages (article) from the hubs/index pages (website). og:type is a `<meta>` tag in `<head>` — it is NOT in the SERP snippet, NOT a GSC-measured surface (machine-readable metadata only). The byte-frozen title/H1/description/answer-sentence bytes (Session 7/8/9 verified) are untouched (the Dec 4-8 freeze holds). Zero KV/fetch/CPU cost (a small `ogType: "article"` string in the buildHead call — in-memory). Option (a) leaves the spec §8 plan unimplemented; option (c) defers a freeze-safe change for no benefit.
- **Who decided:** the agent (the spec §8 plan + the keyword map §2.7/2.8-2.13/2.15 are explicit; the change is freeze-safe per the S11 prompt's standing constraint).
- **Revisit:** after Dec 4-8, with a fresh GSC export, verify the og:type=article did not affect the SERP snippet (it should not — og:type is invisible to the SERP snippet). If a GSC report surfaces a CTR change, revisit.

## 2026-11-17 — SEO Session 11 (S11-2): the SEO_EXTRA_ALIASES map + the Barcelona «بارسا» JSON-LD alias (the S1 M2 alternateName discipline, extended to the GSC-observed short form for a non-overridden selected club; the visible faName/SEO name bytes stay byte-frozen through Dec 4-8)

- **Decision:** `src/seo/team-names.ts` gains a new `SEO_EXTRA_ALIASES` map keyed by `normTeamKey()`; `seoTeamAltNames` now consults it and appends the aliases to the JSON-LD alternateName array. The first entry is the Barcelona «بارسا» alias — GSC evidence: 179 impressions for «بازی بعدی بارسا» in `sportsignal-seo-implementation/GSC-AUDIT-BASELINE.md` (the 2026-11-15 export). The alias rides BOTH the match-page `SportsEvent.homeTeam.alternateName` AND the team-page `SportsTeam.alternateName` (both nodes call `seoTeamAltNames`). The visible faName/SEO name bytes («بارسلونا» in the title/H1/answer/breadcrumbs) stay byte-frozen — only the JSON-LD alternateName gains the alias. The S1 M2 / F3 override layer (Leipzig «لایپزیگ»/«لایپزیش», Nordsjaelland «نورشلان»/«نوردشیلند», Roma «رم»/«آ س رم») stays byte-frozen through Dec 4-8 — verified by the existing `check-seo-teamnames.js` gate (the type-strip regex extended to handle the new `: Record<string, string[]> =` annotation; the 7 override cases + the 4 control teams pass byte-identical). The S-05 no-invented-data rule holds: every alias cites its GSC evidence (the impression count + the query string in the per-alias comment).
- **Options:** (a) add the SEO_EXTRA_ALIASES map with the Barcelona «بارسا» alias (chosen); (b) defer to a post-Dec-4 session; (c) extend fa-dict.ts to add «بارسا» as an alternate spelling (the dictionary spelling change).
- **Reason:** the GSC-AUDIT-BASELINE surfaces 179 impressions for «بازی بعدی بارسا» — the short form «بارسا» is a real GSC-observed Persian query variant for FC Barcelona that is NOT already in the S1 M2 override layer (which covers Leipzig/Nordsjaelland/Roma only). The alternateName JSON-LD array is the schema.org mechanism for alias grounding — the alias rides the machine-readable array ONLY (invisible to the SERP snippet), so the page matches either query form («بارسلونا» OR «بارسا») WITHOUT changing the visible faName/SEO name bytes (the Dec 4-8 freeze holds). Option (b) defers a freeze-safe change for no benefit; option (c) touches fa-dict.ts (the dictionary spelling — the bot/cards/digests render from it; ANY change there is a frozen-surface change for selected clubs).
- **Who decided:** the agent (the GSC evidence is in the audit baseline; the alternateName JSON-LD discipline is the spec §7 + §8 contract; the change is freeze-safe per the S11 prompt's standing constraint — "NEW alternateName aliases ... safe under the freeze IF they do not touch the byte-frozen title/H1/description/answer-sentence bytes").
- **Revisit:** after Dec 4-8, with a fresh 16-month GSC export (the program's top evidence request), validate the alias coverage — add NEW GSC-observed Persian variants as further `SEO_EXTRA_ALIASES` entries (every alias cites its GSC evidence per the S-05 rule). If a GSC report surfaces a NEW GSC-observed short form for another selected club (e.g. «رئال» for Real Madrid, «بایرن» for Bayern), add it then.

## 2026-11-17 — SEO Session 11 (S11-3): the TEAM_SLUGS no-op tidiness fix (route plan §7 — the live provider-derived slugs for Inter + Atlético are now EXPLICIT pins; zero URL change, zero byte-frozen surface change)

- **Decision:** `src/slugs.ts` `TEAM_SLUGS` gains two NEW explicit pins: `"Club Atlético de Madrid": "club-atletico-de-madrid"` and `"FC Internazionale Milano": "internazionale-milano"`. These match the live canonical URLs (the football-data.org provider names produce these slugs through `teamSlug()`'s NFD-strip derivation — the explicit pins align the table with reality). The dead `inter-milan` / `atletico-madrid` entries stay for the sportscore/TSP short-form providers (they remain valid for the short spellings — never dead code, just the alternate-key form). The pinned values match the derivation output EXACTLY (verified: `teamSlug("FC Internazionale Milano") === "internazionale-milano"`; `teamSlug("Club Atlético de Madrid") === "club-atletico-de-madrid"`).
- **Options:** (a) add the explicit pins for the provider-name keys (chosen); (b) remove the dead `inter-milan` / `atletico-madrid` entries (the sportscore/TSP short forms); (c) leave TEAM_SLUGS untouched (the pre-S11 state — the derivation already produces the correct slugs).
- **Reason:** the route plan §7 audit recommended "optionally Session 8 aligns the pinned table to reality (adding the provider-name keys) as a no-op tidiness fix with zero URL effect" — Session 11 (the Persian entity-naming/metadata polish session) is the right place to do it. The explicit pins make the table reflect reality (the live canonical URLs ARE in the table now, not derived). Option (b) breaks the sportscore/TSP short-form providers (which use "Inter Milan" / "Atlético Madrid" spellings); option (c) leaves the table inconsistent with the live URLs (cosmetic, but a future maintainer might wonder why the live URLs are missing from the table). Zero KV/fetch/CPU cost (a constant-time lookup vs. a derivation that produces the same string).
- **Who decided:** the agent (the route plan §7 audit explicitly recommended this; the change is freeze-safe per the S11 prompt's standing constraint — "the team-slug URL identity ... zero URL change, zero byte-frozen surface change").
- **Revisit:** never — the explicit pins stay; if a future provider name change shifts the derivation output, the explicit pin would catch the divergence (the new `check-seo-persian-entities.js` gate's no-op proof pins the equivalence).

## 2026-11-17 — SEO Session 11 (S11-4): the freeze-coordination — the alternateName JSON-LD aliases + the non-title metadata (og:type, og:locale) are NOT GSC-measured surfaces; the byte-frozen title/H1/description/answer-sentence bytes are untouched (the Dec 4-8 freeze holds)

- **Decision:** the S11 changes (og:type=article + SEO_EXTRA_ALIASES + TEAM_SLUGS no-op tidiness fix) are freeze-safe. The byte-frozen surfaces — the match-page title/H1/description/answer-sentence (Session 7 verified), the team-page title/H1/description/answer (Session 8 verified), the competition-page title/H1/description/answer (Session 9 verified), the homepage title/H1 (Session 6 verified), the date-hub empty-state copy on `/matches/tomorrow` (the S06-H3 follow-up is post-Dec-4) — are ALL untouched. The team-name spellings in fa-dict.ts (the S1 M2 F3 spelling fix + the non-selected team dictionary) are byte-frozen — the SEO_EXTRA_ALIASES extension lives in `src/seo/team-names.ts` only (the scope law from S1 M2 holds: nothing outside `src/seo/` references the override layer; the bot/cards/digests render from fa-dict.ts and stay byte-identical — verified by the existing `check-seo-teamnames.js` scope-law gate).
- **Options:** (a) ship the S11 freeze-safe changes now (chosen); (b) defer ALL S11 changes to a post-Dec-4 session; (c) ship the S11 changes + ALSO change a byte-frozen surface (the team-page title for Barcelona to lead with «بارسا» instead of «بارسلونا» — a frozen-surface change).
- **Reason:** the S11 prompt's Step 4 + Step 6 standing constraints explicitly say "the alternateName JSON-LD aliases + the non-title metadata (og:type, og:locale) ... are NOT GSC-measured surfaces (machine-readable JSON-LD / non-title metadata) — safe under the freeze IF they do not touch the byte-frozen title/H1/description/answer-sentence bytes." The og:type=article pin lives in the `<meta>` tag in `<head>` (machine-readable, invisible to the SERP snippet). The SEO_EXTRA_ALIASES extension appends the alias to the JSON-LD alternateName array (machine-readable, invisible to the SERP snippet). The TEAM_SLUGS no-op tidiness fix changes no URL (the explicit pins match the derivation output). Option (b) defers freeze-safe changes for no benefit; option (c) would violate the freeze (a byte-frozen surface change before Dec 4-8 — explicitly forbidden by the S11 prompt's Step 6).
- **Who decided:** the agent (the freeze-safe discipline is the S11 prompt's explicit standing constraint).
- **Revisit:** after Dec 4-8, with a fresh 16-month GSC export, apply the parked frozen-surface byte decisions (S09-3 competition-page title/H1, S08 team-page title-test, S07-H2 match-page title/H1, S06-H2 homepage H1, S06-H3 tomorrow empty-state, the M5 marquee-slug refinement). The S11 freeze-safe changes are NOT reverted — they are durable.

## 2026-11-17 — SEO Session 11 (S11-5): the KV read quota healthy at deploy (the S11 data-surface self-verify is COMPLETE)

- **Decision:** the live `/healthz` at S11 deploy (2026-11-17 02:35 UTC) returned `ok:true` + `pool_matches:324` + `kv_writes_day:153` + `degraded:false`. The KV quota had reset at UTC midnight (early UTC). The S11 data-surface self-verify is COMPLETE: the match page `/matches/barcelona-vs-villarreal-2026-11-22` renders `og:type=article` + the SportsEvent.homeTeam.alternateName carries BOTH «بارسلونا» + «بارسا» (the GSC-evidenced short form rides the JSON-LD array); the team page `/teams/barcelona` renders `og:type=article` + the SportsTeam.alternateName carries BOTH spellings; the competition page `/competitions/la-liga` renders `og:type=article` + the SportsOrganization.alternateName carries «لالیگا»; the homepage renders `og:type=website` (the default). The byte-frozen titles on all 4 page types are unchanged. The S11 change has zero new KV reads (the og:type=article pin + the SEO_EXTRA_ALIASES lookup + the TEAM_SLUGS pin are all in-memory operations on data already in scope).
- **Options:** (a) deploy now (chosen — the KV quota is healthy + the deploy-window check holds: today is 2026-11-17, NOT Nov 20); (b) wait for the next UTC-midnight reset (unnecessary — the quota is healthy now); (c) defer the deploy (no reason — the change is freeze-safe + the data surfaces self-verify).
- **Reason:** the deploy ritual (RUNBOOK §2): `npm test` (exit 0) → local `wrangler dev` smoke (worker boots cleanly; the homepage renders `og:type=website` + the byte-frozen title; the team/competition pages return 404 on the empty local KV — same as Session 8/9/10 local smoke) → versioned deploy (`npx wrangler versions upload` → `npx wrangler versions deploy --version-id 21efcee2-269a-4ad1-819c-b6027822607a --percentage 100 --yes`) → live verify. The KV quota had reset at UTC midnight (early UTC 2026-11-17); the S11 data-surface self-verify is COMPLETE (the live pages confirm the og:type=article + the alternateName «بارسا» alias + the byte-frozen titles).
- **Who decided:** the agent (the deploy ritual is the standing approval per AGENTS.md §5; the deploy-window check holds).
- **Revisit:** at every session close until the owner resolves the daily-exceedance issue (the account's 100,000 KV reads/day free-plan limit gets exceeded DAILY during peak traffic — investigate the read-source or upgrade to Workers Paid ($5/mo → 1M reads/day); the durable fix).

## 2026-11-16 — SEO Session 8: the team-page @graph gains a WebPage node (structural JSON-LD hygiene — the team page was the lone page-class without one; the byte-frozen title/H1/description/answer untouched)

- **Decision:** `buildTeamPage` (`src/seo/pages.ts`) gains a `JL.webPageNode(path, ctx.fetchedAt, { name: "برنامه بازی‌های " + name })` node in its `jsonldNodes` array, between `siteNodes()` (Organization + WebSite) and `sportsTeamNode`. The team-page @graph is now: Organization + WebSite + WebPage + SportsTeam + ItemList (when indexable) + BreadcrumbList — matching the spec contract (the Session 8 prompt Step 3: "the @graph carries Organization + WebSite + WebPage + BreadcrumbList"). The team page was the lone page-class without a WebPage/CollectionPage node: the match page emits `webPageNode`; the hubs + the `/teams` index + the `/competitions` index emit `collectionPageNode`; the competition detail page ALSO lacks one (the same gap — deferred to Session 9, which owns competition pages). The WebPage node describes the page itself (path + dateModified + inLanguage fa-IR + site membership + the page's H1 intent), never a fixture (no SportsEvent — the team page is not an event; the MISSING-IS-NOT-ZERO law holds).
- **Options:** (a) add the WebPage node now (chosen), (b) defer the whole JSON-LD hygiene to a post-Dec-4 session, (c) add both the team-page AND the competition-page WebPage nodes in this session.
- **Reason:** the WebPage node is STRUCTURAL JSON-LD hygiene — it is machine-readable, invisible to the SERP title/H1 snippet, so it does NOT contaminate the Dec 4-8 GSC measurement (the team-page title/H1 bytes are the GSC-measured surfaces, and they are byte-frozen — verified by the new `check-seo-teampages.js` freeze gates). The spec contract explicitly names WebPage in the @graph; the team page was non-conformant. Option (b) leaves a known spec gap live; option (c) widens the scope into Session 9's territory (competition pages) — the prompt's Step 6 standing constraint says "Do not start Session 9 work in this session." Zero KV/fetch/CPU cost (the `webPageNode` call is an in-memory object literal built from `path` + `ctx.fetchedAt` already in scope).
- **Who decided:** the agent (the spec Step-3 contract is explicit; the WebPage node is freeze-safe structural hygiene; the Session 8 scope is the team pages only).
- **Revisit:** the competition detail page has the same gap (no WebPage/CollectionPage node) — Session 9 owns it. After Dec 4-8, the parked S2 team-page title test reads GSC; if the winning pattern changes the title/H1 bytes, the WebPage node's `name` field should track the new H1 (one-line update).

## 2026-11-16 — SEO Session 8: the audit confirms the team-page content + indexability + internal links are already complete (Session 4's C1 disposition + the S1 M2 spelling fix + the v13.229-teamladder title trim all hold) — no further content changes pre-Dec-4

- **Decision:** the Session 8 audit (read-first) confirms `buildTeamPage` is already complete against the phase file + the keyword map §2.7 + the spec §2/§9: the title ladder (the byte-frozen template + the v13.229-teamladder >65 rung), the H1 («برنامه بازی‌های X»), the answer sentence (leads with «بازی بعدی X» when there is a next match — the GSC query head «بازی بعدی بارسا» 179 impr / pos 9.97), the meta description (derived from the answer, sliced to 165), the content blocks (the upcoming fixtures list «بازی‌های پیش‌روی X», the standings window card with the competition link, the form/season record card, the recent results «نتایج اخیر», the related-matches card), the internal links (crawlable `<a href>` match URLs via `dateGroupedRows` → `mrowHtml` → `matchHref` → the canonical `/matches/{home}-vs-{away}-{YYYY-MM-DD}`), the indexable rule (the C1 disposition: `isSelectedTeam(entry.name) && upcoming.length >= SEO.MIN_UPCOMING_FOR_INDEX`), the team-name overrides (the S1 M2 F3 spelling fix), and the teams.xml 13-row filter (Session 4). NO further content changes pre-Dec-4 — the title/H1 bytes are byte-frozen (the parked S2 title test reads GSC on Dec 4).
- **Options:** (a) audit-only + the one structural WebPage-node fix (chosen), (b) expand the content blocks (filler word-count expansion), (c) change the title/H1 bytes now.
- **Reason:** the phase file says "Preserve useful content; no filler word-count expansion" + "Do not add filler text to match a word count." The spec §2 says "Keep the current fairly complete team page experience." The keyword map §2.7 says "What Session 8 may do before the gate: nothing on titles." Option (b) violates the no-filler rule; option (c) violates the Dec 4-8 freeze (the GSC-measured surfaces). The team page already answers next-match intent with the three required blocks (upcoming fixtures + competition link + recent results) — the audit confirms it.
- **Who decided:** the agent (the phase file + the keyword map §2.7 + the spec §2 are explicit; the freeze is the program's measurement discipline).
- **Revisit:** after Dec 4-8, with a fresh GSC export — apply the S2 title-test winning pattern (if any), then continue the content-depth work. The KV read quota (the pre-existing infrastructure issue) must reset before the data-dependent surfaces (the upcoming-matches list, the competition chips, the recent results) can be live-verified — they self-verify at UTC midnight.

## 2026-11-16 — SEO Session 8: the KV read quota is STILL exceeded at Session 8 close (pre-existing, NOT a code issue — the team-page data surfaces self-verify at UTC midnight; the owner should investigate the read-source or upgrade to Workers Paid)

- **Decision:** the account's 100,000 KV reads/day free-plan limit was exceeded at Session 5 close and was STILL exceeded at Session 6/7 close. Live `/healthz` at Session 8 close (2026-11-16 19:59 UTC) shows `ok:false` + `pool_matches:0` + `pool_age_min:-1` — the pool is unreadable. This is a pre-existing infrastructure issue, NOT a code issue (KV was already failing before the Session 5 deploy served traffic). The team-page data surfaces (the upcoming approved matches list, the competition chips, the recent/final results) CANNOT be live-verified while the quota is exceeded — they self-verify once the quota resets at UTC midnight. The SSR-structural change (the WebPage node) is verified by the `check-seo-teampages.js` offline gates + the tsx render harness (14/14 assertions pass on a seeded ctx). The owner should investigate the read-source (the 10-min cron + public traffic + the bot may collectively exceed 100K reads/day); the durable fix is a Workers Paid plan ($5/mo → 1M reads/day).
- **Options:** (a) document + proceed (the code change is verified structurally; the data surfaces self-verify) (chosen), (b) block the deploy until the quota resets, (c) reduce the read load.
- **Reason:** the code change (the WebPage node) has zero new KV reads (it is an in-memory object literal). The deploy is safe regardless of the quota state — it cannot worsen the quota issue (no new read paths). Option (b) delays a freeze-safe structural fix for an unrelated infrastructure issue; option (c) is a separate investigation (the read-source), not Session 8's scope. The Session 7 close-out documented the same issue and proceeded; Session 8 follows the same discipline.
- **Who decided:** the agent (the issue is pre-existing + documented across S5/S6/S7/S8; the code change is quota-neutral; the deploy ritual is followed).
- **Revisit:** the owner should investigate the read-source + consider the Workers Paid plan upgrade. This decision records the issue is STILL open at S8 close — it should be re-checked at every session close until resolved.

## 2026-11-17 — SEO Session 7: the match-detail footer-hook team links are gated on isSelectedTeam (spec §9 / the C1 disposition — only the 13 selected clubs get a crawlable <a href>; non-selected clubs render as plain text)

- **Decision:** the match-detail footer-hook («پیوندهای مرتبط» → «تیم‌ها» line) gates the `<a href="/teams/...">` on `isSelectedTeam(m.homeTeam.name)` / `isSelectedTeam(m.awayTeam.name)` — the SAME predicate that gates the team-page indexable rule (`buildTeamPage`) + the sitemap `teams.xml` filter. A selected club renders `<a href="/teams/{slug}">{name}</a>`; a non-selected club renders its Persian name as plain text (the name stays visible for the reader; the crawlable link is gated). The competition link + the date links are unchanged. This is BODY-ONLY — the byte-frozen `<head>` (title/H1/description/answer-sentence funnel + the SportsEvent JSON-LD) is untouched.
- **Options:** (a) gate on `isSelectedTeam` + plain-text fallback for non-selected (chosen), (b) omit the «تیم‌ها» line entirely when neither team is selected, (c) keep the unconditional links (the status quo — the spec §9 violation).
- **Reason:** spec §9 is explicit: "Do not generate a link to an unindexable/thin team page simply because the team exists in the provider database." The C1 disposition (Session 4) already established that only 13 selected clubs get indexable team pages; non-selected clubs get `noindex, follow` (200 + self-canonical + crawlable, but NOT indexable). The match-detail page is the site's primary click surface (264 GSC URLs / 190 clicks) — linking to noindexed pages from the primary surface wastes crawl budget on pages Google won't index. Option (a) is the smallest change that satisfies the spec while keeping the team names visible for the reader; option (b) would remove useful context (the team names at the page bottom); option (c) is the spec violation. The `isSelectedTeam` predicate is a pure in-memory set lookup (zero KV/fetch cost — the `selectedTeamMemo` cached Set).
- **Who decided:** the agent (the spec §9 rule is explicit; the C1 disposition was the owner's Session 4 decision; Session 7 extends it to the match-page link emission per the prompt's explicit instruction: "non-selected clubs do NOT get a team-page link — the C1 disposition").
- **Revisit:** if the owner widens the selected-club allowlist beyond 13 (a product decision) — the `isSelectedTeam` predicate + the footer-hook gating both follow the config automatically (the admin-overlay sig pattern).

## 2026-11-17 — SEO Session 7: the metadata audit is read-first, no byte changes (the Dec 4-8 freeze holds — the match-page title/H1/description/answer-sentence funnel is byte-frozen)

- **Decision:** Session 7 audits the match-detail metadata (title ladder, H1, meta description, OG data, SportsEvent JSON-LD, the `matchAnswerSentence` funnel, the date/time/timezone) and verifies it is correct + matches the keyword map §2.15 plan — but does NOT change any byte-frozen surface. The match-page title/description/H1 bytes are GSC-measured surfaces (264 URLs / 190 clicks / 6,338 impr). The `matchAnswerSentence` funnel (meta-desc === answer-sentence === SportsEvent-description) is byte-frozen (check-match-centre.js S20/S25). The actual title/H1/description byte change is a post-Dec-4 decision with a fresh GSC export.
- **Options:** (a) audit-only, no byte changes (chosen), (b) refine the title/H1/description bytes now (before the Dec 4-8 gate), (c) change the `matchAnswerSentence` source.
- **Reason:** the keyword map §2.15 says "Keep the template; Session 7 refines metadata within it. No change before the gates." The ROUTE-AND-CANONICAL-PLAN §10 row 7 says "Match-detail metadata refinements | 7 | within the existing template; frozen-surface changes only after Dec 4-8." Changing the bytes before the gate would contaminate the GSC measurement (the Dec 4-8 window is the program's measurement discipline). The fresh 16-month GSC export is the top evidence request — it would validate the title ladder against the actual query surface (the «X مقابل Y 2026» matchup heads, the «تاریخ بازی X و Y» date heads, the «نتیجه بازی X و Y» result heads). Option (b) violates the freeze; option (c) breaks the byte-frozen funnel (the S20/S25 gates would fail).
- **Who decided:** the agent (the freeze is the program's measurement discipline; the keyword map §2.15 + the route plan §10 are explicit).
- **Revisit:** after Dec 4-8, with a fresh GSC export — re-fire the S2 title-test session or a Session 7 follow-up to apply the title/H1 byte changes (if any) and record the before/after GSC position.

## 2026-11-17 — SEO Session 7: the 13 GSC "Missing field location" items are the no-venue matches (the MISSING-IS-NOT-ZERO law holds — never fabricate)

- **Decision:** the 13 GSC enhancement report "Missing field location" items are the SportsEvent nodes WITHOUT a `location` (the matches where `m.venue` is absent). The current behavior (omit `location` when `m.venue` is absent, via the `if (m.venue)` guard in `sportsEventNode`, `jsonld.ts:149`) is CORRECT. NO change — do not fabricate a `location`.
- **Options:** (a) keep the MISSING-IS-NOT-ZERO law — omit `location` when venue is absent (chosen), (b) fabricate a generic `location` (e.g. the competition's host country) for the 13 matches, (c) add a `location` from an external source (a stadium database).
- **Reason:** MASTER-SEO-SPEC §6 is explicit: "Never fabricate an address or use a generic placeholder. Only add schema matching visible page content and current Google eligibility guidelines." The venue data comes from the FD v4 detail call (`hydrateMatchVenue`) — if FD doesn't have it, it stays empty. Fabricating a location would be dishonest schema (a stadium the data doesn't confirm). The 13 items are Google's informational warning ("if you have a location, add it"), NOT errors — Google is not saying the schema is broken. The MISSING-IS-NOT-ZERO law (the S-03/S-04 honesty law + spec §17) holds: a missing field is NOT a zero — it's an honest absence. Option (b) violates spec §6; option (c) introduces a new data source (out of scope for Session 7 + a Cloudflare budget concern per spec §10).
- **Who decided:** the agent (the spec §6 rule is explicit; the MISSING-IS-NOT-ZERO law is test-pinned by check-match-centre.js S20).
- **Revisit:** if the owner wants to add a stadium-lookup data source (a future session — would need a bounded, cached, change-only KV path per the Cloudflare budget).

## 2026-11-17 — SEO Session 7: og:type stays "website" (not "article") — deferred to a post-Dec-4 decision

- **Decision:** the match page does NOT pass `ogType` to `buildHead`, so `og:type` defaults to `"website"`. A match is a time-bound event (closer to an article), but changing `og:type` to `"article"` would ideally want `article:published_time` / `article:modified_time` / `article:author` fields — the match page doesn't carry a clean "published" date (the page is created when the fixture enters the pool, but that's not in the data). Deferred to a post-Dec-4 decision with a fresh GSC export.
- **Options:** (a) keep `og:type = "website"` (chosen), (b) change to `"article"` + add `article:modified_time` from `ctx.fetchedAt`, (c) change to `"article"` without extra fields.
- **Reason:** the OG data is already unique per match (og:title=title, og:description=answer-sentence, og:image=per-match PNG, og:url=canonical); `og:type=website` is not wrong (just not the most precise). A half-measure (article without the full field set) is borderline filler — the spec says "Do not add filler text to match a word count." The `og:type` is NOT a GSC-measured surface (GSC measures title/description/H1/URL, not OG type) — so it's NOT byte-frozen through Dec 4-8. But changing it now without evidence (does `og:type=article` improve social sharing CTR?) is premature. The fresh GSC/social export would show if it matters.
- **Who decided:** the agent (the conservative default — don't change without evidence; the OG data is already unique + accurate).
- **Revisit:** after Dec 4-8, with a fresh export — if the social sharing CTR data suggests `og:type=article` would help, re-fire the decision with the full `article:` field set.

## 2026-11-17 — SEO Session 5: the season-end noindex transition ships INERT (flag false + empty dates map — the first real run awaits owner approval)

- **Decision:** the lifecycle MECHANISM ships now (`isSeasonEndedOrdinary` predicate + `HeadInput.noindex` field + `buildMatchPage` wiring + the sitemap archive filter + the 23-gate transition test + the policy + the classification CSV), but `SEO.SEASON_END_NOINDEX_ENABLED = false` and `SEO.SEASON_END_DATES = {}` (empty map) mean NO real page transitions. The live behavior is byte-identical to Session 4.
- **Options:** (a) ship mechanism INERT + defer the first run to owner approval (chosen), (b) ship mechanism + immediately enable with the publicly-known 2025-26 season-end dates, (c) docs-only (policy + CSV, no code).
- **Reason:** MASTER-SEO-SPEC §4 + the session contract require "propose, do not execute, the first batch unless the owner explicitly approves it in-session." The 2025-26 season is closed, but all 151 current archive matches are 2026-27 season (still open — ends May 2027), so even with the flag on + dates populated, no current match would transition. The mechanism is test-proven (23 gates) and zero-marginal-cost; the flag gate is the honest expression of "the first real transition is an owner decision." Option (b) would execute URL-level effects without in-session approval; option (c) would leave the code unwritten and the transition unproven.
- **Who decided:** the agent (the safe, reversible default per AGENTS.md §1; the owner lifts the flag in a future session after confirming the FD `season.endDate` values).
- **Revisit:** when the owner approves the first batch — confirm the dates against a fresh FD standings fetch, populate `SEASON_END_DATES`, set `SEASON_END_NOINDEX_ENABLED = true`, versioned deploy, verify live.

## 2026-11-17 — SEO Session 5: the marquee retention signals M1-M5 + the ≥1-click M5 threshold

- **Decision:** a finished match stays indexable through season-end when ANY of: M1 selected-club involvement (`shouldReport`), M2 the curated `s.big` featured list, M3 QF+ knockout stage, M4 derby/historic rivalry, M5 slug in `SEO.MARQUEE_MATCH_SLUGS` (demonstrated GSC demand). The M5 set is seeded with every match-detail URL that earned ≥1 click in the 2026-11-15 GSC export (51 slugs, 190 clicks — conservative, retains MORE not fewer).
- **Options:** (a) ≥1 click threshold (chosen), (b) ≥2 or ≥3 clicks (stricter), (c) impressions-based threshold, (d) no M5 slug override (rely on M1-M4 structural signals only).
- **Reason:** the site's match-detail total is 190 clicks across 264 URLs; 51 URLs earned ≥1 click. A threshold of ≥1 retains the entire evidenced-demand surface. A stricter threshold would drop 1-click URLs — NOT chosen because a single click is demonstrated intent and the noindex transition is reversible (flipping the flag back restores the page). Impressions alone do not retain (the Atalanta–Kairat class: 329 impr, 0 clicks, pos 12.36 = passive one-off intent). M5 is the override for matches with demonstrated demand but no structural marquee signal (e.g. bologna-vs-monza, getafe-vs-rayo-vallecano). A fresh 16-month GSC export would refine the set.
- **Who decided:** the agent (evidence-based threshold from the 2026-11-15 GSC export; recorded in MATCH-LIFECYCLE-POLICY.md §4).
- **Revisit:** when a fresh GSC export arrives — refresh `MARQUEE_MATCH_SLUGS` with the updated click-earner list.

## 2026-11-17 — SEO Session 5: the noindex transition is robots-meta level ONLY (like C1 — never robots.txt, never 404/301 for ordinary season-end pages)

- **Decision:** the season-end ordinary transition flips ONLY the `<meta name="robots">` to `noindex, follow` and removes the URL from `matches-archive.xml`. The page stays HTTP 200 + self-canonical + crawlable. No robots.txt entry. No 301. No 404. No KV/data deletion.
- **Options:** (a) robots-meta + sitemap removal only (chosen), (b) 301 redirect to the competition page, (c) 404/410 the page, (d) robots.txt Disallow.
- **Reason:** MASTER-SEO-SPEC §4 Phase C ("A noindex page must remain crawlable so Google can see the directive. Do not block it in robots.txt at the same time.") + the C1 precedent (Session 4: non-selected team pages serve `noindex, follow` + 200 + crawlable, fully reversible per URL). The three separated concerns: index eligibility ≠ page availability ≠ data retention. Option (b) violates route plan §9 (no bulk redirects); (c) loses the page (data retention concern); (d) violates the crawlability law (test-pinned: robots.txt = Allow: / + Disallow: /admin only). The transition is fully reversible (flip the flag back → the page returns to `index, follow` + re-enters the sitemap on the next build; the KV row was never touched).
- **Who decided:** the agent (the law is explicit in MASTER-SEO-SPEC §4; recorded in MATCH-LIFECYCLE-POLICY.md §6).
- **Revisit:** only if the owner wants a different disposition for a specific URL class (a per-URL editorial override).

## 2026-11-17 — SEO Session 5: the S19-safe implementation pattern (a sibling noindex field, not a variable indexable)

- **Decision:** `buildMatchPage` keeps its literal `indexable: true` (the `check-match-centre.js` S19 regex forbids a variable there). The season-end transition hooks through a NEW sibling `noindex?: boolean` field on `HeadInput` (`src/seo/page-shell.ts`); `buildHead` derives `robots = "noindex, follow"` when `h.noindex` is true, falling through to the existing `indexable` logic otherwise.
- **Options:** (a) sibling `noindex?: boolean` field (chosen), (b) change `indexable: true` to `indexable: !isSeasonEndedOrdinary(sm)` (variable), (c) a separate robots-meta override string field.
- **Reason:** option (b) is forbidden by the S19 noindex law (`check-match-centre.js:3634-3655`: the regex `/indexable:\s*[a-zA-Z_?&|]/` catches any variable or conditional expression after stripping the literal `true,`). Option (a) preserves the S19 invariant (exactly one `indexable:` occurrence, the literal `true`) while enabling the transition — the `noindex:` field name has no `indexable:` substring so the regex doesn't trip. Option (c) would be a broader surface than needed. The 23-gate test proves the S19 law holds + the `noindex:` field is wired correctly.
- **Who decided:** the agent (the S19 constraint is test-pinned; the sibling-field pattern is the smallest safe surface).
- **Revisit:** only if the S19 law is ever relaxed (which would require updating `check-match-centre.js`).

## 2026-11-17 — SEO Session 5: the season-boundary source is the FD v4 season.endDate field (not invented — the code map starts empty)

- **Decision:** a competition's season is "closed" when `now > SEO.SEASON_END_DATES[code]`, where the map is populated from the football-data.org v4 `season.endDate` field (the same field `src/composers.ts:286` reads for pre-season detection). The code map starts EMPTY — the owner confirms the dates against a fresh FD standings fetch before enabling.
- **Options:** (a) FD `season.endDate` as the source, empty map in code (chosen), (b) publicly-known 2025-26 close dates baked into code, (c) a date-based heuristic (finished + age > N days).
- **Reason:** the session contract says "do not invent dates." The FD `season.endDate` is the authoritative source the site already uses. An empty map is conservative (no code in the map = season assumed still open = no transitions, regardless of the flag). The publicly-known 2025-26 close dates are recorded in MATCH-LIFECYCLE-POLICY.md §3 as REFERENCE (with the "confirm against FD before enabling" caveat) — NOT baked into code. Option (c) would be a heuristic, not a real season boundary. The tests use injected fixtures (not the production map) so the mechanism is proven without depending on the dates.
- **Who decided:** the agent (the honest, conservative choice; the owner controls the actual values).
- **Revisit:** when the owner enables the first run — populate the map from a fresh FD standings fetch.

## 2026-11-17 — SEO Session 5: the render-time predicate design (no batch job — bounded/idempotent/resumable by construction)

- **Decision:** the season-end transition is a pure render-time predicate evaluated at page-render time and at sitemap-build time. No batch job, no per-match cron, no sweep.
- **Options:** (a) render-time predicate (chosen), (b) a bounded seasonal batch job, (c) a manual admin action.
- **Reason:** MASTER-SEO-SPEC §4 Phase C + §10 require "bounded, idempotent, resumable." A render-time predicate is inherently all three: every render evaluates it (no state to corrupt), no sweep to resume, zero KV writes. It's the smallest possible surface — an in-memory predicate on data already loaded (the `sm` fields from the existing pool/archive read). Option (b) would add a new job (the spec says "prefer the existing deployment/data-management job; do not create per-match cron jobs"); option (c) would require a new admin endpoint. The predicate is zero-marginal-cost (exactly like C1's `isSelectedTeam` Set membership test).
- **Who decided:** the agent (the smallest surface that satisfies the spec).
- **Revisit:** only if the transition needs to be applied retroactively to a large historical batch (a one-time admin action would be the tool, not a recurring job).

## 2026-11-16 — SEO Session 4: C1 implemented as Option A's core with a named predicate (isSelectedTeam)

- **Decision:** the selected-club allowlist test lives as `isSelectedTeam(name)` in `src/seo/data.ts` (an in-memory Set over the domestic-league keys of `CONFIG.BIG_TEAMS_BY_LEAGUE`, `normAlias` lookups, the `teamNormCache`-style admin-overlay memo), consumed by exactly two sites: the teams.xml branch (`src/seo/files.ts`, filter before any row is pushed) and the team-page robots rule (`src/seo/pages.ts`, `indexable = selected AND ≥1 upcoming`).
- **Options:** (a) Option A's core with the named predicate (chosen), (b) Option B's broader `teamPageEligibility()` helper consumed by sitemap + robots-meta + future internal-link weighting, (c) inline membership tests at each consumer.
- **Reason:** the two current consumers need exactly one shared test; Option B's extra surface has no consumer before Session 10 (internal linking) and would be speculative code; (c) would drift. The named predicate IS Option A plus the one-source-of-truth property B wanted. Decided by the agent (a cheap, reversible choice per AGENTS.md §1); recorded as the route plan §2.3 implementation.
- **Revisit:** Session 8/10 if internal-link weighting or tile ordering needs the broader eligibility surface.

## 2026-11-16 — SEO Session 4: the selected-13 set = the domestic league keys only (AL excluded)

- **Decision:** `SEO_SELECTED_LEAGUES = ["PL","PD","SA","FL1","BL1"]` — the A-League (AL) clubs are NOT part of the SEO selected set even though they sit in `CONFIG.BIG_TEAMS_BY_LEAGUE`.
- **Options:** (a) domestic keys only (chosen), (b) all `BIG_TEAMS_BY_LEAGUE` names (would include the 5 site-hidden A-League clubs).
- **Reason:** AL is site-hidden at every public read surface (v13.173-noal) and the program's selected-13 definition (Sessions 2-3, machine-verified) is the 13 European clubs; EL/ECL entries repeat the domestic names. Decided per the Session 3 blueprint (route plan §2.3); pinned by a test gate (13 names asserted).
- **Revisit:** only if the owner un-hides A-League or promotes a club via the admin overlay (the memo handles overlay changes without redeploy).

## 2026-11-16 — SEO Session 4: C6 guard applied OUTSIDE the edge cache (post-cache), not baked into renders

- **Decision:** `guardNonProdMachineFile(res, isProd)` wraps the seven machine-file route responses AFTER `wantCached` returns, cloning headers only on non-prod; production responses pass through untouched.
- **Options:** (a) post-cache application (chosen), (b) bake `...(isProd ? {} : {x-robots-tag…})` into each render's headers (the robots.txt pattern).
- **Reason:** the edge cache key is host-independent (`edge-internal.sportsignal.ir` + path), so a baked header leaks across environments — a workers.dev render would stamp noindex into a cached copy later served to production (violating "production must NOT get the header"), and a production render would serve workers.dev unguarded. Post-cache application makes the guard per-request. robots.txt/BingSiteAuth keep the baked form (they are not cache-served). Decided by the agent; verified live in both directions.
- **Revisit:** only if a machine file ever becomes non-cached or per-host cache keys appear.

## 2026-11-16 — SEO Session 4: C8 record-and-skip (the s-maxage fix measured ineffective on the free plan)

- **Decision:** the one-line `s-maxage=60` normalization for `/api/public-matches` was shipped (13.260.0), live-measured (zone HITs still stamp `max-age=14400` — the Workers free-plan edge floor overrides both `max-age` and `s-maxage` on Cache API entries), and REVERTED (13.260.1) per the phase contract ("normalize only if it's a one-line cache-header fix, else record and skip"). The record-and-skip marker + evidence pointer stay in `src/public-swr.ts`; the outcome is test-pinned.
- **Options:** (a) revert + record (chosen), (b) keep the harmless-but-ineffective declaration, (c) escalate to a client-asset change (poll fetch `cache` option + bundle rename + SW bump) or a zone Cache Rule.
- **Reason:** shipping an ineffective declaration is dead code with a false comment; the client-side fix is out of Session 4's server-side scope and needs the owner's call. (b) rejected on the repo's smallest-change law; (c) flagged, not executed.
- **Revisit:** owner decision — the client-side poll fix or the zone Cache Rule would remove the residual staleness vector (a browser honors the stamped 14400 max-age on the poll path for up to ~4h). Evidence: `seo-implementation/audit/CRAWL-INDEX-CHANGELOG.md` §C8.


## 2026-11-09 — Team rank badge placement: beside the name, outer flank (S37)

- **Decision:** the rank chip sits immediately beside the team NAME (never on
  the crest), on the name's outer flank (between name and crest), as
  `[badge, name]` on home `.team` and `[name, badge]` on away `.team` with
  logical `justify-content` — direction-agnostic for RTL/LTR, and centered as
  a group under the crest on the mobile stacked layout.
- **Options:** (a) outer flank of the name (chosen), (b) inner flank toward
  the kickoff column (spec forbids: "do not let it drift toward the central
  time/date area"), (c) beside the crest (spec's default warning: crowded).
- **Reason:** the spec's "outer side of the team's area" resolves to the crest
  side in this 3-column layout; hugging the name keeps the identity-row law
  ("name and badge read as one compact row"). Decided by the agent per the
  design pack; revisit if the owner dislikes the crest-adjacent slot.

## 2026-11-09 — Rank resolution reuses appendTableOrPhase's applicability law (S37)

- **Decision:** a badge shows only when the code is not a domestic cup, the
  stage is NOT in the explicit KO-only set (PLAYOFF_ROUND/ROUND_OF_16/32/
  QUARTER_FINAL(S)/SEMI_FINAL(S)/FINAL/THIRD_PLACE — STAGE_EN's vocabulary),
  and the code has a LIVE (non `started:false`) table in `stMap` — the bot's
  `appendTableOrPhase` law, corrected to an explicit set: `faStageName`'s
  STAGE_FA also carries LEAGUE_STAGE/LEAGUE_PHASE display labels, and league-
  phase fixtures MUST rank (spec §4). CL league-phase positions show; CL
  KO-stage rows and all domestic cups hide.
- **Options:** (a) reuse the bot's stage gate (chosen), (b) also parse
  `roundRaw` for sportscore KO rows, (c) show CL league-phase rank on KO rows
  as "final league-phase standing".
- **Reason:** one rule for both surfaces; the repo's own semantics (README
  "do not assume … the repository is the source of truth"). (b) would diverge
  from the bot; (c) risks ambiguity a bare number cannot carry. Revisit if
  the owner asks for KO-phase ranks.

## 2026-11-09 — The rank tooltip content reuses the accessible-name string, competition name included (S38)

- **Decision:** the tooltip shows the exact localized label the badge
  already carries as `aria-label` — «رتبه ۳ در لیگ برتر انگلیس» /
  "3rd in Premier League" — i.e., the owner's requested pattern («رتبه در
  پریمیرلیگ») WITH the rank digit and the site-standard competition name
  (the payload's `faName`: لیگ برتر انگلیس، لیگ قهرمانان اروپا، …), not a
  new short-form dictionary.
- **Options:** (a) reuse the aria-label string (chosen), (b) the owner's
  literal short form without the digit («رتبه در لیگ برتر انگلیس»), (c) a
  bespoke per-competition nickname map (پریمیرلیگ، …).
- **Reason:** one string = one translation surface, already S37-tested in
  both languages; the digit makes the bubble self-contained; (c) adds a
  second naming of every competition the site already names one way.
  Decided by the agent; revisit if the owner prefers the short form.

## 2026-11-09 — One delegated listener set + one shared bubble; tap beats the card link (S38)

- **Decision:** hover (200ms rest) + tap (instant toggle, outside
  tap/Escape/scroll to close) ride ONE document-level delegated listener
  set (capture-phase click, the sharewrap-closer precedent) and ONE reused
  `#rankTip` bubble in `body`. Tapping the badge `preventDefault()`s the
  card-link navigation (the tooltip IS the tap's purpose; the card body
  still navigates). `(hover: none)` devices skip the hover path so the
  tap-emulated mouseover never double-fires. The chip gains no
  `tabindex` — ~60 badges would flood the tab order; screen-reader a11y
  stays on `aria-label` + `aria-describedby` while visible.
- **Options:** (a) delegated + shared bubble (chosen), (b) per-chip
  listeners + inline bubble per badge (rebind on every re-render/lang
  switch, ~120 extra nodes), (c) native `title` only (invisible on touch —
  the owner's exact complaint).
- **Reason:** delegation survives the poll re-renders and language flips
  for free; a single fixed-position bubble is trivially viewport-clamped
  in both directions. Decided by the agent.

## 2026-11-09 — The unpushed S39 round (v13.250-ranksup): recover the static assets as retention files, supersede the rest (S40)

- **Decision:** live serves `public-13.77.js` + `public-13.84.css` + sw v123
  from an S39 session ("ranksup": the chip parked as a physical top-right
  superscript on the `.tn` name box — `top:-8px;right:-8px`, the exact
  overlap the owner then reported) that was **deployed but never pushed**.
  S40 recovers the two asset files verbatim from the live server into
  `assets/` (the retention rule: stale SW-v123-cached clients keep
  referencing them, so every future deploy must keep serving them), numbers
  the new round AFTER the deployed one (13.251, 13.78.js, 13.85.css, sw
  v124), and lets the S40 markup/style completely replace S39's
  presentation. No attempt is made to reconstruct S39's worker-side source
  or its `_headers`/check-script state (unrecoverable — the deployed worker
  bundle and headers are not introspectable byte-for-byte; a fake
  "faithful" recovery would be guesswork and would break `npm test` at that
  commit).
- **Options:** (a) recover static assets + supersede (chosen), (b) full S39
  reconstruction commit then S40 on top (rejected: worker source and
  headers unrecoverable, checks would fail at that commit), (c) ignore the
  drift and number S40 as 13.250 (rejected: version would go backwards on
  `/api/status` and the live 13.77.js/13.84.css names would collide with
  new content).
- **Reason:** the retention files are the only live-only artifacts that must
  survive future deploys; everything else S39 touched is overwritten by the
  owner's new directive anyway. Decided by the agent; documented per
  AGENTS.md §2.2 ("pick up where the last session stopped").
- **Revisit:** none needed — S40 deploys over it; rollback path is
  `git revert` of S40 (repo state 13.249 + retention files, a
  live-verified look).

## 2026-11-09 — The rank number rides the name's CENTER-FACING flank as a plain text span (S40)

- **Decision:** the standing renders as a quiet plain number (no circle,
  border, background or icon) in the name's own flex row — home
  `[name,num]` / away `[num,name]` in logical DOM order — so it sits on
  the side of the name facing the card's center for both teams in both
  directions with zero physical left/right CSS. The name (`.tn`) gains
  nowrap+ellipsis; the number is `flex-shrink:0`, never wraps.
- **Options:** (a) center-facing plain number (chosen, the owner's
  directive), (b) keep the S37 outer-flank slot as a plain number
  (rejected: the owner explicitly asked for the center-facing side), (c)
  repair the S39 superscript (rejected: the owner asked for the same-row
  treatment, and the superscript's overhang is what collided with the
  name and the share menu).
- **Reason:** supersedes the 2026-11-09 outer-flank decision (S37) and
  the never-pushed S39 superscript; the plain span needs no positioning
  context at all, so the overlap class of bugs is structurally gone.
  Decided by the owner; recorded by the agent.

## 2026-11-09 — The rank label names the table; the fallback keeps the digit (S40)

- **Decision:** `title`/`aria-label`/`data-tip` read «رتبه N در جدول
  <competition>» ("Nth in <competition> table"); when the fixture carries
  no competition object the label falls back to «رتبه N در جدول» /
  "Nth in the table" — the digit STAYS in the fallback (the owner's
  example pattern «رتبه ۳ در جدول لیگ قهرمانان اروپا» includes it, and
  the visible number is self-explanatory only with the table context).
- **Options:** (a) digit in the fallback (chosen), (b) the owner's
  literal fallback words without the digit («رتبه در جدول») — the tooltip
  would then name neither the rank nor the table it belongs to.
- **Reason:** one string shape in both renderers; the S38 tooltip shows
  the same label. Decided by the agent (safe reading of the owner's
  fallback wording); revisit if the owner prefers the digit-less form.

## 2026-11-09 — The rank ink: dark #94a3b8, light #5b6b82 — measured, gated (S40)

- **Decision:** the number's muted blue-gray ink is `#94a3b8` (dark
  theme, the site's own `--muted` value as a dedicated `--rank-chip-ink`
  token) and `#5b6b82` (light theme — one step darker than the light
  `--muted` `#64748b`, which measures 4.44:1 on the light row composite
  and fails the owner's ≥4.5:1 bar). The WCAG ratios are recomputed from
  the live stylesheet tokens on every `npm test` run (check-team-ranks.js
  §5b), compositing page bg (+glow worst case) → `.card` glass → row
  surface.
- **Options:** (a) dedicated token pair with the gate (chosen), (b)
  `var(--muted)` per theme (rejected: fails in light), (c) the S39
  72%-alpha whisper ink (rejected: ~3.4:1, fails).
- **Reason:** the owner set a measurable bar; the gate keeps it measured.
  Decided by the agent.

## 2026-11-09 — The light-theme rank ink stays #5b6b82 despite a 4.45:1 real-pixel worst (S41)

- **Decision:** do NOT change the light ink now. The S41 re-verification
  measured the real-pixel worst on live light surfaces at 4.45:1 (bluest
  glow spots; the modeled gate says 4.94:1) — technically below the owner's
  4.5:1 bar, but the light theme is unreachable for users: the page boot
  script hard-codes `data-theme="dark"` on every load, `#tbtn` is not in
  the DOM and `toggleTheme()` is never bound. Changing the ink would force
  the full ADR-006 release ritual (asset rename, `_headers` cap sweep #21
  at the 100-rule cap, SW bump, check co-evolution, version bump, deploy)
  for zero user-visible effect.
- **Options:** (a) leave it, document, fix only if the light theme ships
  (chosen), (b) darken the light ink to ~`#52637c` (≈4.9:1 vs the worst
  measured surface) with the full release ritual now, (c) also strengthen
  the permanent gate to model the real glow peak.
- **Reason:** smallest change that fully satisfies the directive on the
  reachable UI (dark real-pixel worst 5.67:1, PASS); the owner's
  "don't ask" instruction this session said pick the safest option and
  mention it. Decided by the agent; revisit the moment a theme toggle
  ships or the owner asks.

## 2026-11-09 — The featured cards' green shimmer stays; its transient contrast dip on the number is accepted (S41)

- **Decision:** leave the pre-existing featured-card treatment
  (v13.66-flatglow: `--feat-tint` 6%, `--feat-glow` 22% border+glow, the
  animated `::before` shimmer band) untouched. S41 measured the number's
  effective contrast dipping to ~3.4–3.8:1 for the fraction of a second
  the shimmer band sweeps over it — but the band washes EVERY content
  element on those 6 cards equally (the white club names dip from ~15:1 to
  >7:1 and stay fine), it predates the rank feature by ~90 versions, and
  the task constraint forbids changing card colors/decoration outside the
  number. Making the ink bright enough to clear 4.5:1 under the flash
  (~#c2cede) would visibly violate the owner's "low-key" directive.
- **Options:** (a) accept + document (chosen), (b) brighten the number's
  ink to clear the flash (rejected: not low-key), (c) dim/remove the
  shimmer (rejected: out of scope, owner-designed card look).
- **Reason:** the 4.5:1 bar applies to the card background (static
  surfaces — the number passes there: dark 5.67:1 real-pixel worst); the
  shimmer is a passing whole-card animation, not the background. Decided by
  the agent; revisit if the owner ever wants the featured cards quieter.

## 2026-11-10 — The "gone" sticky bar is restored by re-keying the pill's tap-silence memory, not by code repair (S42)

- **Decision:** the owner's "the sticky bottom bar is gone, restore it"
  report was diagnosed LIVE before any edit: the bar (the grass channel
  pill, #tgPillBox) was serving and rendering perfectly for fresh
  visitors (browser + VLM verified in fa and en). What hid it on the
  owner's own browser was the pill's 30-day tap-silence memory — any tap
  on the bar body or the blue mark (checking their own channel!) saves
  `sp_pill_joined6` and silences the bar for 30 days; a tap after
  v13.247 put the owner's browser inside that window. The fix is the
  established one-shot re-key (`sp_pill_joined6 -> sp_pill_joined7`,
  the S32/S33/S34/S35/S36 trick): the old key is never read again, so
  every silenced visitor — the owner included — sees the bar again
  immediately, while fresh taps re-seed the 30-day window under the new
  name (verified live: joined6-set browser shows the bar; joined7-set
  browser hides it).
- **Options:** (a) the one-shot re-key (chosen — the repo's own
  precedent for this exact report class, zero visual changes), (b) remove
  the tap-silence entirely so the bar never hides (rejected: the
  30-day law is owner-approved design — it keeps the bar from nagging
  people who already joined), (c) code repair of a "broken" bar
  (rejected: nothing was broken; every surface verified healthy live).
- **Reason:** smallest change that fully satisfies "restore it" — the
  bar reappears for exactly the population that had lost it, and the
  design's no-nag law survives. Decided by the agent per the session's
  don't-ask instruction; revisit if the owner reports the bar "gone"
  again within a week of a genuine fresh visit (that would point at
  something else entirely — e.g. the SW cache serving stale HTML, or a
  desktop expectation: the pill is mobile-only by design, ≥601px shows
  the #tgFab bot FAB instead).

## 2026-11-10 — The pill's 30-day tap-silence is retired for good: the sticky bar always shows (S43)

- **Decision:** per the owner's directive ("Do not add the quiet down
  option if user has tapped already. always show it."), the floating
  channel bar's tap-silence memory is REMOVED outright
  (v13.253-alwaysshow): the controller no longer reads or writes ANY
  localStorage verdict, so a browser holding any old tap verdict — the
  owner's included — sees the bar on the next load; a tap (bar body or
  blue mark) only opens the channel in a new tab; the bar returns on
  every visit. This supersedes the S42 option-(b) rejection (the 30-day
  no-nag law was then owner-approved design; the owner has now decided
  otherwise) and closes the S32/S42 report class permanently (ADR-008).
- **Options:** (a) retire the memory outright (chosen — the directive is
  unconditional: "always show it"), (b) another one-shot re-key
  (rejected: re-arms the same 30-day silence; the owner would hit it
  again on their next channel check), (c) session-only dismissal
  (rejected: the directive says always show — a bar that vanishes after
  a tap and only returns on reload is not what was asked).
- **Reason:** the memory was the only mechanism that could ever hide the
  bar; removing it is the smallest change that makes "always show" true
  for every visitor state. The 20% scroll reveal and the mobile-only law
  are presentation gates, not tap memories — left untouched. Decided by
  the owner (directive); recorded by the agent. Revisit only if the
  owner ever asks for a quieter bar again.

## 2026-11-10 — S44: the rank badge becomes the owner-approved crest pill (production mapping of the sandbox sign-off)

- **Decision:** the league standing rides the team crest as an anchored "#N"
  pill (the owner's approved container from the sandbox round: "I only
  approve the number container (e.g #5)" — the sandbox's popover and
  section-info extras were already reverted there before this round). This
  supersedes the S40 quiet-plain-number directive (the owner has now decided
  otherwise; S40's spec §12 stays as history).
- **Mapping decisions (sandbox design -> production surfaces):** (1) the
  pill keeps the .rankchip CLASS so the S38 tap+hover tooltip engine and its
  checks ride untouched — the tooltip is a pre-existing feature, not one of
  the reverted sandbox extras; (2) the outer span keeps the PAGE direction
  and only the inner #N text span is dir="ltr" (the approved structure) —
  this is load-bearing: an ltr outer span flips its own inset-inline-*
  resolution (the S44.1 bug); (3) the mirror uses ONE logical rule per side
  (home = inset-inline-start, away = inset-inline-end) so the outer-flank
  corner holds in both RTL and LTR; (4) the #liveCard 28px crests and the
  narrow-screen 37px crests get scaled step-downs (14px/16px) to keep the
  pill:crest ratio; the top-spot's larger crests ride the base 18px; (5) the
  hero carousel stays badge-free (the standing spec scope law); (6) light
  theme gets its own disc pair (#f1f5f9/#94a3b8/#1e293b, 13.35:1; the dark
  disc measures 16.43:1 — both above the owner's 4.5:1 bar, now gated
  against the pill's own solid surface in check-team-ranks.js).
- **Options:** (a) map the approved container onto the production surfaces
  as above (chosen — the smallest change that makes the approved design
  live), (b) port the whole sandbox card UI to production (rejected: the
  sandbox is a demo-data prototype; production has real data, deep links,
  SEO surfaces), (c) keep the S40 plain number (rejected: the owner
  explicitly approved the container and asked why it wasn't deployed).
- **Reason:** the owner's approval was for the container itself; every
  production-specific adaptation follows an existing repo law (S38 tooltip
  contract, spec scope, contrast gate, step-down precedent). Decided by the
  owner (the sandbox sign-off + the deploy expectation); recorded by the
  agent. Revisit if the owner wants the tooltip gone from the badge too.

## 2026-11-10 — S44.1: the ADR-006 hotfix (fresh names after the in-place edit mistake)

- **Decision:** the first S44 deploy published the corner-mirror bug under
  public-13.79.js + public-13.86.css (immutable pins), and the fix was
  initially re-uploaded under the SAME names — violating ADR-006
  rename-on-edit. Corrected ~8 minutes later: the fixed bytes ship under
  public-13.80.js + public-13.87.css, SW v125 -> v126, pins swapped (still
  exactly 100 _headers rules), the buggy-window files stay on disk riding
  default cache headers.
- **Root cause:** the corner bug itself (ltr on the outer span flipping the
  inset-inline-* resolution) was caught by the live geometry verification
  BEFORE any owner report; the rename violation was caught while
  investigating why the verification browser still measured the old
  geometry (it held the immutable first-deploy bytes).
- **Options:** (a) fresh-name rename per ADR-006 (chosen — strands the
  buggy immutable copies safely), (b) keep the same names and rely on edge
  purges (rejected: ADR-006's exact failure mode — browsers hold immutable
  for a year), (c) full revert and re-round (rejected: the fix was verified
  correct; only the name hygiene needed repair).
- **Reason:** ADR-006 is a standing repo law with a hotfix precedent
  (v13.226.1-herowirefix). Decided by the agent (the law); recorded for the
  owner. No revisit needed — the rule held.

## 2026-11-10 — S1 M3: S3 "where to watch" closed; lineups deferred to owner; TSP key dead; worker rename deferred

- **Context:** the S1 M3 broadcast/lineup investigation
  (`docs/audits/2026-11-10-broadcast-lineup-data.md`, report only) answered
  whether the repo's existing data providers can supply broadcaster or lineup
  data for the SEO growth plan's S3 (plan §8).
- **Decision 1 — S3 "where to watch" block is CLOSED.** TheSportsDB's free
  `lookuptv.php` does return real broadcaster data (channel, country, logo),
  but every event probed carried channels for India, Brazil, US, Iceland —
  **zero Iran or Afghanistan entries**. The site's audience is 91% Iran, 6%
  Afghanistan (GSC audit F10). Showing off-audience channels is worse than
  showing nothing. football-data.org has no broadcaster data on any tier;
  SportScore's public free API has none either. No audience-fit source exists
  in the current providers. Reopen only if an Iran-specific broadcast source
  is licensed or found.
- **Decision 2 — S3 lineups: owner decision (plan Q2), not auto-built.**
  Lineup data is technically reachable via: (a) football-data.org PAID tier
  (~49 €/month — reliable, covers the repo's competitions, lineup/bench arrays
  documented but absent from the free `/v4/matches/{id}` response, confirmed
  empirically); (b) TheSportsDB free `lookuplineup.php` (sparse, near-kickoff
  only — returned `null` for every event probed); (c) SportScore via a paid
  RapidAPI key (lineups exist per the listing but are NOT in the public free
  API the repo uses — all detail endpoints returned HTML). None is free AND
  reliable AND complete. The owner decides whether the spend is worth it.
- **Side finding (flagged, not fixed — out of M3 scope): the repo's TSP key
  `3` is permanently disabled.** `src/provider-tsp.ts` calls
  `https://www.thesportsdb.com/api/v1/json/3/…`; TheSportsDB disabled that
  key and every request now returns a plain-text "key disabled" message
  (not JSON), so TSP silently contributes zero rows. The site still works
  (FD + SportScore cover). The new free test key is `123` (confirmed live).
  Fixing it is a one-line change but touches a runtime provider, so it
  belongs in its own small session — NOT done here.
- **Decision 3 — the worker rename (`ucl-notifier` → `sportsignal`) + duplicate
  worker deletion is DEFERRED to a dedicated session.** The owner asked for it
  at the end of the S1 prompt, but it is outside S1's scope (the plan's S1 is
  M1/M2/M3 SEO quick wins), and it is a risky operation: it changes the live
  deploy target, requires re-pointing the `sportsignal.ir` custom domain route
  to the new worker name, re-attaching the KV/D1/AI bindings to the new worker,
  and deleting the old worker + an unidentified "duplicate". A botched rename
  takes the live site down. Read-only investigation of the account's workers
  was done this session; the actual rename needs the owner's explicit go-ahead
  in a session dedicated to it. The standing deploy instruction in this
  HANDOFF (`wrangler.toml` `name` is the source of truth) already covers the
  case where a future session performs the rename.
- **Options considered:** (a) do the worker rename inside S1 (rejected — out
  of scope and risky); (b) skip it silently (rejected — the owner asked);
  (c) investigate read-only and defer with a clear handoff (chosen).
- **Reason:** AGENTS.md §5 (stay in scope; stop-and-ask before risky
  irreversible-ish infra changes) and §4 (smallest change that solves the
  request). The SEO plan's S1 is done and verified; the infra task is
  separable and safer alone. Decided by the agent; recorded for the owner.
  Revisit: when the owner opens the dedicated worker-rename session.
## 2026-11-10 (continuation session) — duplicate worker deleted; rename blocked by unreadable secrets, question to the owner

- **Decision 1 — the duplicate worker `sportsignal-site` is DELETED.** The
  owner's instruction ("remove the duplicated worker which doesnt belong to
  sportsignal.ir") was executed after verifying it served nothing: no custom
  domain, no zone routes (deleted in the S26 rollback per the RUNBOOK note),
  only its dormant `sportsignal-site.sportsignal.workers.dev` URL (the
  rolled-back S25 Next.js landing experiment — the RUNBOOK itself
  pre-authorized deleting it "if the landing direction is ever abandoned").
  Deletion verified: the workers.dev URL now 404s; the account carries
  `ucl-notifier` (the live worker) + `uefa-image-relay` (the portrait-pipeline
  utility — NOT a duplicate, kept). sportsignal.ir unaffected throughout
  (healthz ok:true before and after).
- **Decision 2 — the rename `ucl-notifier` → `sportsignal` stays deferred,
  now with the exact blocker identified.** There is no rename API (PATCH on
  the script is rejected for this auth scheme; no rename endpoint exists), so
  renaming = deploy a NEW worker + move the two custom domains
  (sportsignal.ir, football.sportsignal.ir) + re-set ALL secrets + delete the
  old worker. Secrets are write-only: the prompt supplied BOT_TOKEN and
  API_TOKEN; **ADMIN_PASS, ADMIN_TOKEN and CHAT_ID cannot be read or
  migrated** — without them the /admin panel locks, the owner's bot-admin
  identity (Alitagram, env.CHAT_ID gates every admin command) and the admin
  alerts die, with no recovery path that does not involve the owner handing
  over new values. WEBHOOK_SECRET is regenerable (re-register the Telegram
  webhook with the bot token); HEALTHCHECK_PING_URL is not set on the live
  worker (one less). Options for the owner: **A. keep the name
  `ucl-notifier`** (recommended — the name is internal, invisible to
  visitors; zero risk), **B. supply the three values** (ADMIN_PASS,
  ADMIN_TOKEN, CHAT_ID — from wherever they were stored at the 2026-10-13
  account migration) and a continuation session executes the full rename,
  **C. have the session generate new ADMIN values and accept that they must
  be handed over once through a channel the owner chooses** (against the
  repo's credential-handling rules — only if the owner insists).
- **Reason:** AGENTS.md §5's stop-and-ask list covers domain changes and
  actions without an undo path; a rename that silently breaks the owner's
  own admin tools is not a "working result end to end". The duplicate
  deletion carried no such risk and is done.
- **Who:** the continuation agent. **Revisit:** the owner answers A/B/C
  (final report); any later session executes B or C if chosen.

## 2026-11-10 (S2 parking) — S2 fired 24 days before its gate: park it, doc-only

- **Decision:** the S2 title test («X مقابل Y» on half the match pages,
  control = the other half, behind an off-by-default switch in
  `src/seo/config.ts`) stays **parked until the Dec 4, 2026 GSC gate**. The
  S2 start prompt was re-fired on 2026-11-10 claiming the gate had passed
  with a fresh export attached — but no export was attached (verified: none
  in the prompt, none in the workspace), and no export dated on or after
  Dec 4, 2026 can exist yet (2026-11-10 is 24 days before the gate; the
  gate exists to give 4 clean weeks on the Nov 6 title change). The parking
  is recorded as a note at the top of `docs/HANDOFF.md` (plus this row and
  a CHANGELOG entry); the commit is **doc-only — no code, no deploy, no
  title change** — so the Nov 6 baseline stays clean.
- **Options considered:** (a) park it with a HANDOFF note (chosen — the
  owner's "A option"); (b) run S2 now anyway on the stale Nov 10 export
  (rejected — the S2 prompt's own gate says STOP when the export is
  missing or dated before Dec 4, and a title test without its baseline
  read breaks plan §5's measurement discipline: 3–4 week waits, one change
  per page group); (c) build the off-by-default switch now, deploy nothing,
  flip it on Dec 4 (rejected — Option A explicitly says no code; an early
  build invites scope creep into the measurement window and buys nothing —
  the switch is a ~1-hour build on the day).
- **Reason:** the plan's §5 rules exist because the site changed several
  times in its first month and no single change could be judged; the owner
  chose A to keep the measurement backbone intact at zero cost.
- **Who:** the owner (Option A), recorded by the parking agent.
  **Revisit:** on/after Dec 4, 2026 — re-fire the unchanged S2 start prompt
  with the fresh GSC export attached.

---

## 2026-11-15 — S23: the post-M10 hardening track session 1 (DISCOVERY + DOCUMENTATION)

**Context:** the M10 milestone is CLOSED — the Match Centre ships to production
(deployment `ab1395ee` / version `10c0a004` / `13.257-mcmatchcentre`). The
post-M10 hardening track opens with S23 — a discovery + documentation session
that produces a hardening report (`docs/mc/post-m10-hardening-report.md`),
NOT a code deploy. The session ran 5 days before the Bayern vs Köln kickoff
(`2026-11-20T19:30:00Z`) — so the live/finished lifecycle verification (H1,
the #1 gap from the S20 gate) is deferred to S27 after the kickoff.

**Decision 1 — NO hotfix for the MEDIUM a11y finding F1 (the hero double-wrap).**
The S23 bug hunt found a systematic presentation-layer issue: the hero is
double-wrapped in two `<section>` landmarks (`<section id="mcentre-hero"
aria-label="تیم‌ها و وضعیت بازی">` from `pages.ts` sectionHtml wrapping
`<section class="mcentre-hero" aria-label="خلاصه بازی">` from `match-centre.ts:223`).
The inner aria-label «خلاصه بازی» (match summary) is semantically wrong for
the hero. The one-line fix is `<section class="mcentre-hero" aria-label="خلاصه
بازی">` → `<div class="mcentre-hero">` (+ the closing tag) — matching the
other 10 sections' pattern. **The decision: do NOT hotfix.** The finding is
MEDIUM (a11y landmark redundancy + a wrong label — confusing for screen reader
users, NOT a visual breakage, NOT customer-facing, reversible, doesn't touch
the GSC surfaces). Per AGENTS.md §5, production deploys are NOT under standing
approval — a hotfix deploy would need the owner's explicit approval + the full
S22 6-point post-deploy smoke matrix. The cost/benefit (a MEDIUM a11y fix vs.
the deploy overhead + the SEO measurement window contamination risk) favors
deferring the fix to S25 (a11y deep-dive), which will batch F1 + F2 + F3 + F4
into a single deploy. The finding is documented in the hardening report for the
owner to review + the fix is proposed for S25.
- **Options considered:** (a) defer the fix to S25 (chosen — the MEDIUM
  severity doesn't justify a hotfix deploy + the SEO measurement window
  [Dec 4-8] is protected by minimizing production changes); (b) hotfix now on
  a `fix/post-m10-hardening` branch + a fresh `wrangler versions upload` +
  deploy (rejected — the deploy overhead + the owner-approval gate + the
  smoke-matrix cost outweigh the MEDIUM-severity benefit; F1 is not
  customer-facing); (c) ignore the finding (rejected — the finding is real +
  systematic + documented for the follow-up session).
- **Reason:** the S23 scope is DISCOVERY + DOCUMENTATION (the session produces
  the report, NOT a deploy). The owner's prompt explicitly says "IF a critical
  bug is found, S23 cuts a fix branch" — F1 is MEDIUM, not critical. The
  hardening report proposes S25 as the fix session for F1-F4.
- **Who:** the S23 agent (decision recorded per AGENTS.md §8 decision-log
  discipline). **Revisit:** S25 (a11y deep-dive) — the owner may escalate to a
  hotfix if they judge F1 urgent.

**Decision 2 — the recommended follow-up session order (S25 → S27 → S24 → S26).**
The hardening report proposes four follow-up sessions: S25 (a11y deep-dive),
S27 (live/finished verification, after Nov 20), S24 (perf/CWV review, after
Dec 8), S26 (UI/UX iteration). The recommended order optimizes for: (a) the
a11y fixes first (the highest-impact findings F1-F4 + the cross-browser gap);
(b) the live/finished verification at the natural Nov 20 window; (c) the perf
review after the CWV data matures (needs ~1-2 weeks post-deploy + after the
SEO measurement window close); (d) the UI/UX iteration last (the most
subjective — builds on a clean a11y base).
- **Options considered:** (a) S25 → S27 → S24 → S26 (chosen — the a11y fixes
  first + the natural windows respected); (b) S24 first (rejected — the CWV
  data needs ~1-2 weeks to be statistically meaningful + the SEO measurement
  window [Dec 4-8] is the binding constraint); (c) S26 first (rejected — the
  UI/UX iterations should build on a clean a11y base, not before).
- **Reason:** the order minimizes the total elapsed time to a hardened
  production + respects the binding constraints (the Nov 20 kickoff + the Dec
  4-8 SEO window + the CWV data maturation). The owner may reorder.
- **Who:** the S23 agent (the recommendation). **Revisit:** the owner picks the
  next session from the proposed plan.

---

## 2026-11-15 — S25: the post-M10 hardening track session 2 (the a11y deep-dive — F1-F4 fixes + audit + deploy)

**Context:** the M10 milestone is CLOSED + the post-M10 hardening track is OPEN.
S23 (the hardening report) documented four a11y findings (F1-F4) + proposed S25
as the fix session. S25 runs the full WCAG-AA audit (axe-core + WAVE style — the
DOM/ARIA check categories), the cross-browser compatibility analysis (Safari/
Firefox/Edge — the S23 §2.5 gap), the screen-reader announcement prediction
(NVDA/VoiceOver — the accessibility tree), implements the F1-F4 fixes, and ships
them to production. The audit is `docs/audits/2026-11-15-s25-a11y-audit.md`.

**Decision 1 — the F4 fix: keep the outer `<section id="mcentre-nav">` as a
non-landmark container (do NOT drop it).**
The S23 F4 finding said "drop the wrapper or add the aria-label." S25's audit
discovered the outer `<section id="mcentre-nav">` is LOAD-BEARING for the S06
desktop sticky-nav fix: `page-shell.ts` carries
`@media (min-width:601px){#mcentre-nav{display:contents}}` which dissolves the
section's box so `.mnav{position:sticky;top:0}` sticks relative to `.page-col`
(the grandparent) instead of the 48px-tall section. Dropping the section would
break the desktop sticky nav (the nav would scroll away mid-content — the
documented S06 defect). The fix: keep the outer `<section id="mcentre-nav">`
but DROP its `aria-label` (a `<section>` without an accessible name is NOT
exposed as a landmark per the HTML/ARIA spec) → the inner
`<nav class="mnav" aria-label="ناوبری بخش‌های صفحه">` becomes the SINGLE
landmark. The double-landmark (region + navigation with the same label) is
collapsed to one (the navigation landmark). The `id="mcentre-nav"` anchor +
the `display:contents` sticky-nav CSS + the `getElementById` references are
all preserved. The S23 report's F4 wording ("has no aria-label") was slightly
inaccurate — the outer section DID carry the aria-label (from `sectionHtml` +
`MC_SECTION_ORDER`); the REAL issue was the double-landmark. The fix is the
same (consolidate to one landmark), but the diagnosis is corrected here.
- **Options considered:** (a) keep the outer section + drop its aria-label
  (chosen — the non-landmark container preserves the sticky-nav architecture +
  the id anchor + the display:contents rule; the inner nav is the single
  landmark); (b) drop the outer section entirely (rejected — it would break
  the S06 desktop sticky nav, a UX regression worse than the a11y finding);
  (c) keep the outer section aria-label + change the inner `<nav>` to a `<div>`
  (rejected — loses the native `<nav>` semantics for navigation; the outer
  `<section>` "region" landmark is semantically weaker than the `<nav>`
  "navigation" landmark); (d) keep both aria-labels (rejected — the
  double-landmark is the F4 finding).
- **Reason:** the outer section is load-bearing for the sticky nav; the
  non-landmark container is the only fix that preserves the architecture +
  collapses the double-landmark. The other 10 sections keep the `sectionHtml`
  wrapper (their content starts with a `<div>`, so the outer
  `<section aria-label>` is the needed landmark — the nav is the special case).
- **Who:** the S25 agent (decision recorded per AGENTS.md §8 decision-log
  discipline). **Revisit:** if the sticky-nav architecture is reworked (e.g.
  the `display:contents` rule is retired), re-evaluate whether the outer
  section is still needed.

**Decision 2 — the F2 fix: descriptive alt with the Latin player name (the
Persian transliteration is out of scope for S25).**
The S23 F2 finding said "add descriptive alt or a visually-hidden span with the
player names." S25's audit found the `player` field in
`HERO_COVERAGE_RAW.wired` is the LATIN name (e.g. "Ellyes Skhiri", "Harry
Kane"). The S23 report's example used the PERSIAN transliteration («هری کین»)
which would require a Latin→Persian transliteration (a dictionary mapping or
a transliteration library). S25 decided to use the LATIN name (honest +
accurate + announced correctly by modern screen readers — NVDA + VoiceOver
handle mixed-script text). The alt is `alt="تصویر ${player}، بازیکن ${teamFa}"`
(the Persian lead «تصویر» + the Latin player name + the Persian «بازیکن» +
the Persian team name). The Persian transliteration is a future enhancement
(S26 UI/UX or a dedicated transliteration session). The `heroArtMetaSrv(t)`
data-layer function exposes the `{src, player}`; the backward-compat
`heroArtSrv(t)` (returns the `src` only) is preserved (the homepage `.mc-port`
SSR mirror is UNTOUCHED — the byte-frozen surfaces hold). The defensive
fallback (player empty → alt="") keeps the img never-broken.
- **Options considered:** (a) descriptive alt with the Latin player name +
  the Persian team name (chosen — honest, accurate, the data is available,
  universally announced by modern screen readers; the Persian transliteration
  is out of scope); (b) a Persian transliteration of the player name (rejected
  — requires a Latin→Persian dictionary or a transliteration library, a new
  dependency surface + a translation-quality risk; defer to S26 or a
  dedicated transliteration session); (c) a visually-hidden `<span>` with the
  player name adjacent to the portraits (rejected — the descriptive alt is
  simpler + the img is the semantic container for the player identity; a
  visually-hidden span is an alternative pattern but adds DOM nodes); (d)
  keep `alt=""` (rejected — the F2 finding; a screen-reader user does not
  learn the featured player).
- **Reason:** the Latin name is the honest, accurate, available data; the
  descriptive alt is the simplest semantic fix; the Persian transliteration
  is a future enhancement that does not block the a11y improvement. The
  defensive fallback + the backward-compat `heroArtSrv` preserve the homepage
  byte-frozen surfaces.
- **Who:** the S25 agent (decision recorded per AGENTS.md §8). **Revisit:** S26
  (UI/UX iteration) or a dedicated transliteration session — the owner may
  want the Persian player names (the report's F2 example used «هری کین»).

**Decision 3 — the F3 fix: MODIFY the existing S06 nav script (NOT a new
script) — the composer purity holds.**
The S25 standing law says "S25 adds NO new script." The F3 fix needs the
IntersectionObserver to toggle `aria-current` on scroll (alongside the
existing `is-active` class). S25 decided this is a MODIFICATION of the
existing S06 nav script (the `matchNavScript` function in `pages.ts`), NOT a
new script. The composer purity (the S04 countdown / S06 nav / S15 schedule /
S16 FAQ are the ONLY inline-JS exceptions) holds — S25 does NOT add a new
exception; it modifies an existing one. The added lines
(`i.removeAttribute('aria-current')` in the loop +
`it.setAttribute('aria-current','true')` on the active item) are pure DOM
(no fetch/timer/polling — the S06 cost law holds). The first nav item also
carries `aria-current="true"` at render (server-side, in `matchNavHtml`) — a
screen-reader user navigating by landmarks hears «خلاصه link, current»
immediately at page load (no waiting for the scroll observer).
- **Options considered:** (a) modify the existing S06 nav script to also
  toggle aria-current (chosen — the aria-current is the screen-reader
  contract alongside the is-active class [the visual contract]; the
  modification is pure DOM, no new script, the composer purity holds); (b) a
  new inline script for aria-current (rejected — violates the "S25 adds NO
  new script" standing law + a new exception); (c) aria-current at render only,
  no scroll update (rejected — the active section would not update on scroll,
  defeating the purpose); (d) keep the is-active class only, no aria-current
  (rejected — the F3 finding; the class is visual, the attribute is the
  screen-reader contract).
- **Reason:** the aria-current attribute is the screen-reader contract (WCAG
  2.4.8 Location — the best-practice rule); the is-active class is the visual
  contract. Both are needed (belt-and-braces). The modification of the existing
  S06 nav script is within the S25 scope (the standing law prohibits NEW
  scripts, not modifications of existing exceptions).
- **Who:** the S25 agent (decision recorded per AGENTS.md §8). **Revisit:**
  if a future session reworks the nav (e.g. a progress indicator or a 6th nav
  item), re-evaluate the aria-current wiring.

**Decision 4 — the deploy landed BEFORE Dec 8 (the cross-track SEO measurement
window).**
The S25 standing law says "S25 can deploy BEFORE Dec 8 IF the fixes don't
touch the GSC surfaces (F1/F3/F4 are body-only; F2 is body-only — all safe)."
S25's byte-frozen verification (MANDATORY before the deploy) PASSED: the
source-level diff (the head-building files `page-shell.ts`/`jsonld.ts`/
`markup.ts` UNCHANGED) + the runtime diff (the preview URL `<head>` vs the
production `<head>` = DIFF 0 — the GSC surfaces title/canonical/og/twitter/h1/
meta-desc/JSON-LD all BYTE-IDENTICAL; the homepage byte-frozen surfaces all
present). The deploy landed at 2026-11-15T02:38:53Z (Version 181285b8 at
100% traffic). The cross-track SEO measurement window (Dec 4-8) is PROTECTED
— the GSC surfaces are byte-frozen.
- **Options considered:** (a) deploy before Dec 8 (chosen — the F1-F4 fixes
  are body-only, the byte-frozen diff is DIFF 0, the SEO measurement is
  protected, the a11y fixes are safe to land now); (b) wait until after Dec 8
  (rejected — no SEO-measurement risk since the GSC surfaces are byte-frozen;
  delaying would postpone the a11y improvement unnecessarily); (c) do not
  deploy, keep the fixes on a branch (rejected — the fixes are verified + the
  audit is complete + the owner asked for the deploy).
- **Reason:** the byte-frozen diff is DIFF 0 (the GSC surfaces are
  byte-identical pre- and post-fix); the F1-F4 fixes are body-only; the SEO
  measurement window is protected. The deploy is safe + the owner asked for it.
- **Who:** the S25 agent (the deploy decision) + the owner (the credentials +
  the session prompt = the explicit approval). **Revisit:** none (the deploy
  landed; the rollback point is the S22 + post-merge re-deploy
  `ab1395ee`/`10c0a004`/`13.257-mcmatchcentre`).

---

## 2026-11-15 — S27: the post-M10 hardening track session 3 (the live/finished lifecycle verification — the pre-match baseline + the Nov 20 deferral; VERIFICATION, NO code change)

**Context:** the M10 milestone is CLOSED + the post-M10 hardening track is OPEN.
S25 (the a11y deep-dive) is DONE + DEPLOYED at `13.258-mca11y` (the F1-F4 fixes
LIVE). S27 is the live/finished lifecycle verification session (the H1 deferred
work from the S23 hardening report §1.2). The session was started on 2026-11-15
(Sun Nov 15, 2026, Asia/Tehran) — **5 days before the Bayern vs Köln kickoff**
(`2026-11-20T19:30:00Z` = Fri Nov 20 23:00 Tehran). The live window (during the
match, after the 19:30 UTC kickoff) + the finished window (after FT + the 900s
render-hold) are BOTH in the future. The `/healthz` confirmed `sched_live_now:0`
(NO live matches in the pool) + the 30 homepage match links are ALL dated Nov 20+
(NO finished matches in the pool to verify against). S27 therefore ran the
**pre-match baseline** (the H1-upcoming re-verification + the byte-frozen GSC
baseline that the Nov 20 windows will be compared against) + documented the exact
M1 (live) + M2 (finished) verification plan for Nov 20. **NO code changes, NO
deploy.** H1 stays OPEN.

**Decision 1 — the pre-match baseline is the S27 deliverable (NOT the live +
finished verification).** The live + finished marker verification (H1-live +
H1-finished) cannot run in this session — the match is 5 days away + there are NO
live or finished matches in the pool. The cheap, valuable, time-independent work
S27 CAN do is the pre-match baseline: re-verify the Bayern page's UPCOMING state
5 days closer to the match (the `.mkick` + `.mcount` + `data-kickoff` markers +
the live/finished/scorer markers ABSENT) + capture the byte-frozen GSC surfaces
(the title, canonical, og/twitter, h1, meta-description, JSON-LD, og:image,
robots) that the Nov 20 live/finished windows will be compared against. This
directly serves H1 (the baseline is the reference for the live→finished title
update verification) + confirms the production is healthy 5 days out. The S27
pre-match baseline is recorded at `docs/mc/post-m10-hardening-report.md` §1.4 +
the 2 screenshots in `docs/assets/s27-lifecycle/`.
- **Options considered:** (a) run the pre-match baseline + document the Nov 20
  plan + defer M1/M2 to the Nov 20 windows (chosen — the only honest option; the
  live + finished windows are not reachable 5 days before the match); (b) wait
  + do nothing until Nov 20 (rejected — the pre-match baseline is cheap +
  valuable + captures the byte-frozen reference; waiting wastes the session);
  (c) pretend M1/M2 are done (rejected — violates AGENTS.md §1 honesty + §9 the
  done-criteria; the live + finished states were NOT observed in this session).
- **Reason:** AGENTS.md §1 (honesty — never say "done" unless run in this
  session) + §9 (the done-criteria — be strict) + the S27 stop-and-ask rule (the
  Nov 20 kickoff missed → defer to the next live match; the finished state
  persists in the pool until the cron rolls it off). The session ran 5 days
  before the kickoff; the live + finished windows are in the future; the
  pre-match baseline is the valuable, safe, time-independent work.
- **Who:** the S27 agent (decision recorded per AGENTS.md §8 decision-log
  discipline). **Revisit:** the Nov 20 windows (the H1-live + H1-finished
  verification — the owner's choice on how to run them: the S27 TLDR's A/B/C/D
  options).

**Decision 2 — H1 stays OPEN; the Nov 20 verification plan is documented (NOT
executed).** The S23 hardening report §1.2 documented the H1 markers checklist
(the upcoming + live + finished columns). S27 re-verified the upcoming column
(the pre-match baseline) + documented the exact M1 (live) + M2 (finished)
verification steps for the Nov 20 windows (the `LIVE_PAGE_TTL:120` render-hold
for the live state; the `SEO_PAGE_TTL:900` render-hold for the finished state;
the `.mlive` pulse + the `.mfin` «پایان بازی» + the result block «نتیجه نهایی»
+ the scorer block ABSENT [Q4=A] + the GSC surfaces byte-frozen or the title
update verified). H1 is NOT closed — the live + finished marker verification is
deferred. The owner's choice on how to run the Nov 20 windows (the S27 TLDR's
A/B/C/D options) is the next decision.
- **Options considered:** (a) keep H1 OPEN + document the Nov 20 plan (chosen —
  the honest status; the live + finished verification did not run); (b) mark H1
  CLOSED on the pre-match baseline alone (rejected — the live + finished markers
  were NOT observed; marking H1 closed would violate the done-criteria); (c)
  mark H1 CLOSED + note the deferral (rejected — "CLOSED + deferred" is
  contradictory + misleading).
- **Reason:** the S27 done-criteria (the task prompt) says "mark H1 CLOSED" ONLY
  if the live + finished verification is done. Since it is NOT done (the match is
  5 days away), H1 stays OPEN. The pre-match baseline is a PARTIAL completion
  (H1-upcoming re-verified) — recorded honestly.
- **Who:** the S27 agent (the status decision). **Revisit:** the Nov 20 windows
  (after the live + finished marker verification runs, H1 can be CLOSED).

**Decision 3 — the Nov 20 windows: the owner's choice (A/B/C/D), the
recommended path is B.** The Nov 20 live + finished verification needs the owner's
input on how to run it (the windows are time-sensitive + the cron-fired-agent
reliability is uncertain). The options:
- **(A)** the agent schedules cron jobs (via the `cron` tool) to auto-run M1
  [live, Nov 20 ~19:35 UTC — 5 min after the kickoff] + M2 [finished, Nov 20
  ~21:35 UTC — ~15 min after FT+900s]. The cron-fired agent would be a fresh
  context (it would need to read AGENTS.md + the docs + use the agent-browser +
  verify + commit + push). The reliability of a cron-fired agent doing a full
  verification + commit + push is uncertain.
- **(B)** the owner starts a new session during the live window (Nov 20, ~19:35
  UTC — after the kickoff) for M1 + another after FT+900s (~21:35 UTC) for M2
  (the recommended reliable path — a fresh session with the full context + the
  owner's oversight; the next-session prompt is at the end of the S27 TLDR).
- **(C)** defer to a single session after FT+900s (skip M1 live, do M2 finished
  + rely on the render-hold to confirm the live→finished transition logic — a
  weaker verification, but a single session).
- **(D)** other (the owner's call).
- **Options considered:** (a) A (the cron auto-run) — automated but the
  reliability is uncertain + the timing is tricky (the match duration varies);
  (b) B (the owner's two short sessions) — chosen as the recommended path (the
  most reliable + the owner's oversight); (c) C (the single finished-only
  session) — a weaker verification; (d) D (the owner's call).
- **Reason:** the Nov 20 windows are time-sensitive (the live window is during
  the match; the finished window is after FT+900s) + the verification needs the
  full agent context (AGENTS.md + the docs + the agent-browser + the commit +
  push). A fresh owner-started session (B) is the most reliable path. The cron
  auto-run (A) is feasible but the cron-fired agent's reliability is uncertain
  (it would be a fresh context + the timing risks missing the window). The owner
  decides.
- **Who:** the S27 agent (the recommendation). **Revisit:** the owner picks an
  option; the Nov 20 verification runs; H1 can then be CLOSED.

## 2026-11-15 — S27-cont: the option-B continuation attempted 5 days before the kickoff (BLOCKED by timing; the pre-match baseline re-confirmed byte-frozen DIFF 0; NO code change, NO deploy, NO cron; H1 stays OPEN)

The owner fired the S27-cont continuation session on 2026-11-15 (the same day as
S27, ~50 min after the §1.4.2 baseline capture) to run **option B** (decision 3 —
the owner starts a new session during the live window + another after FT+900s)
against the REAL Bayern vs Köln match. **The session was started 5 days before
the kickoff** (`2026-11-20T19:30:00Z`). The M1 (live) + M2 (finished) windows are
BOTH in the future + could NOT run — the production scheduler itself confirms the
match is not yet live (`/healthz` `sched_mode:IDLE / sched_reason:beyond-horizon /
sched_live_now:0`). This is a **timing block, NOT a bug**.

**Decision 4 — the S27-cont timing block: record honestly + re-confirm the Nov 20
re-fire windows; NO code change, NO deploy, NO cron scheduling (the owner chose
option B).** S27-cont ran the read-only pre-match baseline drift-check (DIFF 0 vs
§1.4.2 — the GSC surfaces byte-frozen, no drift since the S27 capture ~50 min
earlier; the markers match; the F1 fix LIVE; the scorer ABSENT [Q4=A]; zero
console errors; mobile 390 no horizontal scroll) + re-confirmed the Nov 20
re-fire windows. **H1 stays OPEN** until the owner re-fires option B on Nov 20.
- **Options considered:** (a) record the timing block + re-confirm the Nov 20
  re-fire windows + commit the honest docs record (chosen — the only honest
  option; the M1/M2 windows cannot run 5 days before the kickoff); (b) silently
  switch to option A (schedule cron jobs for Nov 20 ~19:35 UTC + ~21:35 UTC) —
  REJECTED (the owner explicitly chose option B; overriding the owner's explicit
  choice violates AGENTS.md's collision order — the owner's explicit instruction
  beats the file; + the cron-fired agent's reliability is uncertain per decision
  3 + the credential/sandbox-persistence risk across 5 days); (c) fabricate the
  live/finished verification against a non-live page — REJECTED (AGENTS.md §9 —
  be strict; never claim "done" for anything weaker than verified-live); (d) stop
  + ask the owner before recording — REJECTED (§5's stop-and-ask covers risky
  irreversible actions [force-push, data deletion, customer-facing actions, DNS
  changes], NOT a calendar mismatch; the read-only drift-check + the honest docs
  record are within the standing approval for commits/pushes).
- **Reason:** the M1/M2 windows are time-bound to the Nov 20 match (the live
  window is during the match; the finished window is after FT+900s). The session
  was fired 5 days early. The only honest, AGENTS.md-compliant action is to record
  the timing block + re-confirm the pre-match baseline (DIFF 0 — protects the
  Dec 4-8 SEO measurement window) + re-confirm the exact Nov 20 re-fire windows
  for option B. NO code change (no bug found). NO deploy (the version stays
  `13.258-mca11y`). NO cron (the owner chose option B, NOT option A). H1 stays
  OPEN.
- **The Nov 20 re-fire windows (option B):** M1 (live) at ~19:35 UTC (kickoff
  19:30 UTC + 5 min, clears the `LIVE_PAGE_TTL:120` render-hold); M2 (finished)
  at ~21:35–21:45 UTC (FT ~21:15–21:25 UTC + the `SEO_PAGE_TTL:900` render-hold =
  ~21:30–21:40 UTC; visit ~21:40 UTC to be safe). The owner re-fires the S27-cont
  prompt verbatim at those times.
- **Who:** the S27-cont agent (the status decision). **Revisit:** the owner
  re-fires option B on Nov 20 (M1 + M2); the live/finished marker verification
  runs; H1 can then be CLOSED (IF both windows verify + no critical bug). IF a
  critical lifecycle bug is found in either window, STOP + present the bug + the
  proposed fix + the deploy plan (the `wrangler deploy` FORBIDDEN — use
  `wrangler versions deploy` if a fix is needed).

## 2026-11-15 — S28 (SEO weekly read): serve finished match pages from the 365-day archive (v13.259-archserve) — the GSC 404-cliff fix

**Context.** The Nov 15 Search Console export (`docs/audits/2026-11-15-gsc-read.md`)
showed 159 not-found URLs: every finished match page 404s ~7 days after kickoff
(the pool retention in `src/match-pool.ts`), while the 365-day `seo_archive_v1`
(U-05) already stored 158 finished big matches that no serving path read. 161
of 264 match pages in the GSC report were dead URLs carrying 52% of
match-page impressions — including the whole positions-8–20 growth zone and
the M2 spelling-fix measurement pages.

**Decision.** Serve archived finished matches from `seo_archive_v1` when the
slug misses the pool (`findArchivedMatchBySlug`), list them in the
`matches-archive` sitemap child, and serve their per-match OG images. The
archive load in `buildMatchPage` is hoisted (same single KV read, await
count stays 3); venue hydration skips the home-ground table for archived
rows (the archive shape loses stage/roundRaw — a neutral final could
otherwise hydrate a wrong stadium); the FD-detail path stays (real data
only). Frozen GSC surfaces untouched — verified DIFF 0 on live pages after
deploy; restored pages render through the same frozen templates.

**Options considered.**
1. Serve the existing big-match archive (CHOSEN) — zero new data pipeline,
   covers ~70% of the 404 impression mass including every page with clicks.
2. Extend `syncArchive` to ALL finished matches — covers the ~1,400-impression
   long tail but ~4x the KV blob and more write budget per change; deferred
   to the owner as an A/B (audit §4) to decide with the Dec 4 export.
3. Do nothing until the Dec 4 read — rejected: the 404 cliff deletes
   ~30–40 pages of accumulated position history every week and was
   invalidating the M2 measurement itself.

**Who decided.** The agent (S28), under the growth plan's URL-stability rule
(§4 "After the game: keep URL stable") and AGENTS.md §5's standing approval
for deploys; the archive-scope extension (option 2) is explicitly left to the
owner.

**When to revisit.** With the Dec 4–8 GSC export: 404 count draining from
159 toward <40, indexed count rising from 659, restored pages holding
position; the owner's A/B on extending the archive scope to all finished
matches.

**Follow-up (same session):** `scripts/seo-check.js` T-05's orphan rule is now
archive-aware — matches-archive URLs are exempt from the orphan ratio (explicit,
counted + reported; every other child + T-25's >=3-link upcoming rule keep the
full discipline). This is a check-semantics update for the new by-design
sitemap-discovery surface, not a weakening: the crawl still fails on any
404/redirect among linked pages, and non-archive orphans still fail the ratio.

**Follow-up 2 (v13.259.1-archttl, same session):** the post-deploy live
browser check surfaced "Worker exceeded resource limits" on fresh renders —
Cloudflare analytics proved the condition PRE-EXISTED (37 exceededResources
in the 3h before the deploy on 13.258; 789 on Nov 10): cold match-page
renders run near the free-plan 10ms CPU cliff. Because the restore made 151
immutable URLs crawlable, the re-render cadence was cut: ARCHIVE_PAGE_TTL
6h for archived pages (a successful render with a pool miss) + wantCached
edge caching for the resvg OG route (1h). The root render-cost problem is
pre-existing, chronic, and documented as the follow-up (audit §6) — not
caused by and not fully fixable within this session's scope.

## 2026-11-16 — SEO Program S1: start the 15-session spec-pack program; audit-only Session 1 + the pipeline-verification deploy of identical code

**Context.** The owner uploaded `sportsignal-seo-implementation.zip`
(spec pack v1.0 — a 15-session, audit-first SEO program with its own
AGENT-INSTRUCTIONS contract, 200-phrase keyword bank and GSC baseline) and
fired Session 1 with a start prompt requiring extraction, full audit, and
deploy-through-the-existing-mechanism even for the audit session.

**Decision.** (1) Extract the pack to the repo root as
`sportsignal-seo-implementation/` (mandated by the spec; the folder did not
exist; the zip stays — never delete owner files). (2) Create
`seo-implementation/` as the program's working tree (audits, session
reports, next-session prompts) so the spec pack stays pristine except its
tracker. (3) Session 1 makes NO worker code change (phase acceptance
criteria) — the "deploy" requirement is satisfied by a versioned deploy of
byte-identical code (pipeline verification; instant rollback untouched),
verified post-deploy via healthz + surface spot-checks. (4) The program's
sessions run alongside the repo's internal S1/S2 SEO mini-track; the Dec 4-8
measurement freeze and the team-name spelling freeze bind BOTH tracks, and
the Session 2 prompt carries the coordination notes.

**Who decided.** The agent (SEO Session 1), under the owner's start prompt +
AGENT-INSTRUCTIONS §7.9 (deploy via the existing mechanism) and the phase
file's no-code-change acceptance criterion.

**When to revisit.** Session 2 (keyword research validation — docs-only, no
deploy) starts only when the owner fires
`seo-implementation/next-session-prompt.md` in a new session. The C1 team-page
scope decision (87 pool-derived team URLs vs the 14-club allowlist) belongs
to Sessions 3+8 with GSC/backlink evidence — never a blind deletion.


## 2026-11-16 — SEO Program S2: keyword validation facts that bind later sessions (13-club correction; one-URL rules; exclusions; no-volume discipline)

**Context.** Session 2 (the dedicated keyword session) validated the
200-phrase seed bank against the 2026-11-15 GSC export and produced the
374-row validated keyword map. Four non-obvious judgment calls were made
that later sessions must inherit rather than re-litigate without new
evidence.

**Decisions.** (1) **Allowlist count correction:** the selected-club
allowlist is **13 European clubs** (PL 5 + PD 3 + SA 2 + FL1 1 + BL1 2,
machine-verified from `src/config.ts:38-100`), not the "14" recorded in the
Session 1 audit and the Session 2 start prompt — a propagated miscount; all
later docs use 13. (2) **One-URL-per-intent mapping law** (time-qualified →
time hubs; club-dominant → team page; competition-dominant → competition
page; both-clubs → match detail CONDITIONAL on editorial coverage; result →
match detail post-match; derby-discovery → homepage; English → Session 12
future) plus the 7-entry cannibalization register — Session 3's blueprint
inherits these; deviations need evidence. (3) **Exclusions documented, not
silently dropped:** broadcast («مکان تماشای/ساعت پخش», incl. the export's
#1 clicking visible query, 8 clicks), lineup («ترکیب»), ticket («بلیت»)
intents and all non-selected-club team-page targeting are excluded with
reasons in the map; the non-selected demand (~102 visible next-match
impressions; 114 URLs / 8 clicks / 0.62% CTR) is preserved as the C1/S1
evidence pack for the Session 3 architecture decision — flagged, not
solved. (4) **No-volume discipline:** no volume tool existed, so every
volume field reads "unavailable — never invented"; GSC site metrics are kept
in separate labeled columns and are never treated as market volume; the
match-detail "conditional" status encodes that no URL may be created for a
hypothetical fixture.

**Who decided.** The agent (SEO Session 2), under the phase file's
acceptance criteria and AGENT-INSTRUCTIONS §5 (the keyword-research
contract: never fabricate volume/CPC/difficulty; map to one canonical URL;
exclude unsupported intents).

**When to revisit.** Session 3 (keyword-to-URL architecture) consumes the
map as-is; the C1/S1 team-page disposition and the top-3-standings
coverage-route decision belong to Session 3 with owner sign-off; volume
validation becomes possible only if the owner supplies Keyword
Planner/Trends access or a fresh GSC export (top evidence request,
SESSION-02.md §9).


## 2026-11-16 — SEO Program S2 (verification pass): four corrections to the first-build deliverables, applied in place

**Context.** After the Session 2 deliverables were committed, a second
verification sweep re-derived every headline number from the raw GSC export
and repo source. It confirmed the segmentation arithmetic exactly (privacy
gap 55.8%/90.8%; Iran 99.2%/92.7%; mobile 94.8%/96.6%; the 13-vs-114
team-page split; all 70 seed GSC claims) and found four defects in the
first-build map and its companion docs.

**Decisions.** (1) **Row 73's literal `TEAM?` placeholder target** («بازی
بعدی اینتر») corrected to the live slug `/teams/internazionale-milano`
(provider-derived; the pinned `inter-milan` is NOT the served URL). (2)
**Five exact-duplicate keyword rows removed** (222, 293, 295, 302, 358);
the both-clubs duplicate «بازی بارسلونا و پاریس کی است» was re-resolved to
match-detail-conditional per one-URL rule 4 — the conflicting team-page
mapping was a mis-build, not a judgment call. (3) **The "174 of 264 (66%)"
non-selected-club share of match-detail rows was a miscount — the exact
value is 184 of 264 (70%)**; corrected in the validation report, session
report, Session 3 prompt, and this log. (4) **Evidence-class counts restated
as unique counts: 198 GSC-observed / 38 autocomplete / 133 candidates =
369 rows** (the "202/39" figures double-counted duplicates). The corrected
map passes all integrity checks; details in KEYWORD-VALIDATION-REPORT.md
§12 and SESSION-02.md §4a.

**Who decided.** The agent (SEO Session 2 verification pass), applying the
program's verify-before-handing-off rule; no strategic conclusion changed —
the corrections are counts and build artifacts, not judgments.

**When to revisit.** Session 3 consumes the corrected map (369 rows). The
184/264 figure feeds Session 3's top-3-standings-route decision.


## 2026-11-16 — SEO Program S3: the C1 team-page disposition — 74 non-selected team URLs go noindex (never blocked, never deleted), sitemap 87→13

**Context.** Session 3 (keyword-to-URL architecture) had to decide the
fate of the 87-URL teams sitemap: `teamsIndex`
(`src/seo/data.ts:276-310`) generates team pages for BOTH sides of every
eligible pool match, so 74 non-selected-club URLs are live, indexable,
self-canonical and sitemapped today (verified live 2026-11-16). GSC
(2026-11-15 export, machine-derived this session): 114 non-selected team
URLs / 8 clicks / 1,297 impressions / 0.62% CTR vs the 13 selected clubs
/ 8 clicks / 1,159 / 0.69%. The spec's law (MASTER-SEO-SPEC §2 "Team
pages") requires demand/backlink review before noindex/redirect/404 —
never blind deletion.

**Decision.** (1) The 74 non-selected team URLs become `noindex, follow`
and are removed from `teams.xml` (87 → 13 rows, total sitemap 383 → 309).
(2) NEVER robots-blocked (robots.txt stays `Disallow: /admin` only),
never 404/410, never redirected, never deleted: the pages keep serving
200, self-canonical, with ALL internal links intact (`/teams` index
tiles, match-page «تیم‌ها» links) so Google can read the noindex
directive. (3) The demand review is executed per-URL (ROUTE-AND-CANONICAL-
PLAN §2.2): the 8 click-earners are 1-click-each URLs over ~3 months
(Sporting CP 36 impr, Napoli 19, Thun 11, Tottenham 9, Bochum 7, Union
Berlin 5, Hertha 3, Egnatia 1); the impression heads are matchup
spillover (Sabah/Copenhagen/Twente are selected clubs' UCL opponents —
served by the match-detail pages); top-10 URLs carry 48% of the
impressions. (4) No backlink tool exists in this program — recorded
honestly; the compensating controls are full per-URL reversibility (one
meta tag) and a season-end re-read of the demand table (any non-selected
club with sustained clicks becomes an owner-decision allowlist-promotion
candidate — a product decision, never automated). (5) Implementation =
Session 4, Option A preferred (sitemap child filter + team-page
indexable-rule flip via the in-memory 13-club allowlist; zero marginal
KV/subrequest/CPU).

**Options considered.** (a) noindex + keep 200/crawlable/linked
(chosen); (b) 404/410 the non-selected URLs (rejected: breaks the
internal-link graph and deletes served content for real fixtures; spec
Phase D requires content-gone); (c) 301 to competition/homepage
(rejected: no true equivalent destination; spec Phase D forbids); (d)
keep everything indexable (rejected: contradicts the owner's
selected-clubs-only decision and concentrates crawl budget away from the
13 keepers); (e) restrict `teamsIndex` generation itself (rejected as
the vehicle: it also powers the `/teams` index and match-page links that
must KEEP working for all teams — the noindex crawlability law).

**Who decided.** The agent (SEO Session 3), under the phase file's
disposition mandate, the spec's demand-review-first law, and the owner's
standing selected-clubs-only team-page decision (GSC-AUDIT-BASELINE:
"keep dedicated, indexable team pages only for manually selected
clubs").

**When to revisit.** Session 4 implements and verifies (GSC coverage:
the 74 URLs moving to "Excluded by noindex"; watch for anomalies).
Season end, or whenever a fresh GSC export with URL-level data arrives:
re-read the demand table for promotion candidates. If the owner ever
wants aggressive pruning instead, that is a new decision requiring new
evidence.


## 2026-11-16 — SEO Program S3: the top-3-standings coverage route STAYS as the "independently important match" implementation

**Context.** `isBigForSeo` (`src/seo/data.ts:114-122`) marks a fixture
SEO-eligible when either side sits in the competition's top-3 standings,
independent of the selected-club allowlist. 184 of 264 (70%) observed
match-detail GSC rows exist via this route (Session 2 verification-pass
count). The phase file required Session 3 to say explicitly whether the
route stays.

**Decision.** It stays, unchanged, as the de-facto implementation of
PRODUCT-AND-SEO-STRATEGY §4.B ("important non-selected-club matches …
verified table/competition signals"). It is bounded (top-3 of covered
competitions only), automated from the cached standings (no new
fetches), and it produces the URLs behind the observed one-off matchup
demand (Atalanta–Kairat 329 impr, Monaco–Nordsjaelland 244, Man
Utd–Roma 210 — passive heads at pos 12+). Removing it would orphan ~70%
of observed match-detail demand. The owner may narrow or overlay it with
manual exceptions later — flagged as revisit-able, not changed here.

**Who decided.** The agent (SEO Session 3), on the demand evidence and
the spec's exception model.

**When to revisit.** Any season boundary or owner product decision about
match coverage breadth; Session 5 (lifecycle) inherits the route as
eligibility law either way.


## 2026-11-16 — SEO Program S3: architecture stances — pagination self-canonical kept, empty hubs stay indexable, provider-derived Inter/Atlético slugs are canonical, hreflang zero until Session 12

**Context.** The phase file required dispositions on the remaining
route-class questions: `?page=N` canonicalization, empty-hub
indexability (C5), the `/teams`+`/competitions` index pages, and the
Inter/Atlético slug divergence (the live URLs are the provider-derived
`/teams/internazionale-milano` and `/teams/club-atletico-de-madrid`,
NOT the pinned `TEAM_SLUGS` values `inter-milan`/`atletico-madrid`).

**Decisions.** (1) **Pagination:** each `?page=N≥2` keeps its
self-canonical INCLUDING the query (SS-03 policy, verified live on pages
2-3): each page is a distinct 50-match slice with its own GSC rows;
consolidating would de-index real content. `?page=1`/bare → `/matches`.
Sitemaps never list pagination URLs (correct). The suspected S2 item
(Google honoring the query-kept canonical) is carried to Session 4's
verify list for a fresh GSC export — no policy change on suspicion. (2)
**Empty hubs stay indexable** (C5 resolved as deliberate): daily
noindex oscillation would be worse than the thin day;
`/matches/tomorrow` is the site's best-CTR surface (8.26%) WITH the
honest empty state. (3) **`/teams` and `/competitions` index pages stay
indexable** — they are the crawl backbone for the noindexed team URLs.
(4) **The provider-derived slugs ARE the canonical URLs** (what GSC, the
sitemap and every internal link use); no slug "fix" — that would be a
URL migration for zero benefit; Session 8 may align the dead
`TEAM_SLUGS` pins as a no-op tidiness fix. URL identity, not a spelling
change — the Dec 8 freeze is untouched. (5) **hreflang: zero until
Session 12** (spec §7 forbids hreflang for absent translations; zero
English-query evidence); every URL class carries an English title/H1
plan SLOT only.

**Who decided.** The agent (SEO Session 3), on live verification
(pagination canonicals, index pages, slug presence) and the inherited
evidence base.

**When to revisit.** S2 with a fresh GSC export (Session 4); empty-state
content refinement in Session 9 (indexability itself is final);
Session 12 owns the EN-architecture/hreflang decision with its own
evidence gathering.

## 2026-11-17 — SEO Program S6: the homepage one-month window + carousel crawlability + curated-selection promise (the 92→30 DISPLAY split; the hero-card anchor href; the curated-selection sr-only paragraph; the H1 + tomorrow-empty-state freezes)

**Context.** Session 6 turned to the homepage. The trace (Task 2-a) found
five concrete divergences between the code and MASTER-SEO-SPEC §1/§2: (D1)
the spec says "up to one month" / "Show up to 30 days ahead" but the code used
92 days on the listing surfaces (`upcomingBig`/`upcomingFollowed`), 90 days on
the homepage boxes (`public-matches.ts` topspot/uclspot), and a third value
(end-of-current-month) on the payload's `upcoming` array; (D2) the spec §2
H1 «مهم‌ترین بازی‌های فوتبال اروپا را از دست ندهید» vs the live dynamic H1
«بازی بزرگ بعدی: {home} – {away}»; (D3) no curated-selection promise copy on
the homepage (spec §2 "Do not claim all matches are covered. Say
selected/important matches"); (D4) the `/matches/tomorrow` empty-state copy
diverges from the spec's exact copy; (D5/D6) the hero card anchor shipped
`href="#"` in SSR — the real `/matches/{slug}` URL was set client-side only
(`public-13.80.js` `renderHeroSpot`), a JS-only-navigation defect. The Dec 4-8
freeze applies to GSC-measured surfaces (the homepage title/H1 are
GSC-measured).

**Decisions.**

- **S06-H1 — the horizon reconciliation (the 92→30 DISPLAY split).** The
  92-day horizon is the DATA/DISCOVERY window: the KV pool fetch
  (`CONFIG.LONG_VIEW_DAYS = 92`, so fixtures are available before they enter
  the display window) + the sitemap-upcoming child + `feed.xml` +
  `matches.json` (broad URL discovery — the URLs are canonical + indexable, so
  the sitemap carrying them is spec §5-compliant). A NEW
  `SEO.UPCOMING_DISPLAY_DAYS = 30` constant (`src/seo/config.ts`) is the
  DISPLAY window: the surfaces a visitor sees (the homepage topspot/uclspot
  boxes + the `/matches` hub listing + the payload `upcoming` array that feeds
  the JSON-LD ItemList). `upcomingBig`/`upcomingFollowed` (data.ts) stay at 92
  (the discovery horizon); the display surfaces narrow to 30. The payload's
  `upcoming` array changed from "end-of-current-month" (a variable ≤30-day
  window that under-represented the visible boxes early in the month) to 30
  days from now — so the JSON-LD ItemList agrees with the visible boxes.

- **S06-H2 — the homepage H1 stays byte-frozen (the dynamic H1 vs the
  keyword-map §2.1 plan H1).** The live dynamic H1 «بازی بزرگ بعدی: {home} –
  {away}» (with the «بازی‌های بزرگ فوتبال» fallback) is byte-frozen through
  Dec 4-8 (a GSC-measured surface). The keyword-map §2.1 plan H1 «مهم‌ترین
  بازی‌های فوتبال اروپا را از دست ندهید»-family is a post-Dec-4 decision. The
  live dynamic H1 captures the «بازی بعدی بارسا» (179 impr, pos 9.97) /
  «بازی بعدی بایرن مونیخ» (37 impr, pos 7.49) / «بازی بعدی لیورپول» (24 impr) /
  «بازی بعدی آرسنال» (14 impr) next-match query heads — real GSC demand.
  Session 6 verifies the title/H1/visible-copy agreement (the dynamic H1
  describes the next big match; the static title describes the curated program
  — they agree); the H1-byte change is deferred past Dec 4-8 with a fresh GSC
  export.

- **S06-H3 — the `/matches/tomorrow` empty-state copy stays as-is (the
  best-CTR surface — do not regress).** The current copy «در برنامه فعلی اسپرت
  سیگنال بازی‌ای برای فردا ثبت نشده است؛ به‌محض اعلام برنامه بازی‌های جدید،
  همین صفحه به‌روزرسانی می‌شود.» is honest (scoped to SportSignal's program,
  no "no football tomorrow" claim) and the hub is the site's best-CTR surface
  (8.26%). The spec's exact copy «برای فردا مسابقه مهمی در میان دیدارهای منتخب
  اسپرت سیگنال ثبت نشده است. برنامه بازی‌های مهم روزهای آینده را بررسی کنید.»
  is a post-Dec-4 refinement (clearer curation framing + a link out to the
  matches hub). The hub STAYS indexable (C5) regardless.

- **S06-H4 — the curated-selection promise rides as a NEW sr-only paragraph
  (additive, no title/H1 byte change).** The spec §2 + the phase file require
  the curated-selection promise to be explicit. The homepage had no such copy
  (only a sr-only page-contents summary). Added a NEW sr-only `<p>` with the
  promise «از دیدارهای بزرگ لیگ برتر انگلیس، لالیگا، سری‌آ، بوندسلیگا و لیگ یک
  فرانسه تا حساس‌ترین رقابت‌های لیگ قهرمانان اروپا و جام‌های حذفی؛ اسپرت سیگنال
  مهم‌ترین بازی‌های پیش‌رو را گلچین و معرفی می‌کند.» — additive to the existing
  sr-only page-summary, no visible layout change (the phase file "Preserve
  homepage layout and current design system"). The competition-name spellings
  match the site's live forms (router.ts meta description + pages-static.ts +
  pages.ts:2107). Visible copy (vs sr-only) is a UI decision for a later UI
  iteration — the sr-only paragraph satisfies "make the promise explicit in
  the DOM" without a layout change.

- **S06-H5 — the hero-card carousel crawlability fix (the SSR href + the
  sr-only carousel nav).** The hero card anchor's SSR href is now
  `M.matchHref(nextBig.s)` (slide 1's canonical match URL — was `#`); the client
  rewrites it per active slide (progressive enhancement — the SSR href is the
  crawlable fallback for slide 1 + the no-JS destination). The carousel slides
  2-6 (which the single anchor reuses per active slide) get a NEW sr-only
  `<nav>` (`carouselNavHtml`) with a real `<a href>` to every slide, emitted
  when the carousel has ≥ 2 slides. This satisfies spec §2 "Keep the card
  accessible, crawlable through a regular anchor link" + §9 "Homepage →
  current featured match" without changing the visible carousel UI. Zero
  KV/fetch cost (built from the existing `p.heroMatches` payload rows).

- **S06-H6 — the featured-match logic NOT changed (the v13.194 priority
  behavior is owner-approved).** The spec §1 line 21 says "Featured hero match:
  nearest upcoming match (not the highest-rated future match)". The code's
  `pickHeroMatch` returns the highest-PRIORITY match in the 8-hour carousel
  envelope (v13.194-herocarousel, owner-approved — the 2026-10-14 lesson:
  priority dominates kickoff recency across the slate). This is a documented
  divergence from the spec's "nearest upcoming"; the carousel's 8-hour
  envelope IS the spec's "same day/night grouping". NOT changed this session
  (owner-approved behavior; changing it is a product decision — flagged for
  owner awareness in the session report §9). The carousel's accessibility +
  crawlability (the spec's actual Session 6 ask) ARE fixed (S06-H5).

**Who decided.** The agent (SEO Session 6), on the trace evidence (Task 2-a),
the keyword map §2.1, the spec §1/§2, the Dec 4-8 freeze (the inherited
constraint), and the v13.194 owner-approved history (for S06-H6).

**When to revisit.** S06-H2 (the H1 byte change) + S06-H3 (the tomorrow
empty-state copy) after Dec 4-8 with a fresh 16-month GSC export; S06-H4
(visible curation copy) in a future UI iteration (Session 26 or a dedicated UI
round); S06-H6 (the featured-match priority vs nearest) when the owner
reviews the divergence (a product decision, not an SEO one).

---

## S09 — SEO Session 9: the competition-page @graph CollectionPage node + the date-hub/empty-state verification (2026-11-17)

**The decision set.** Session 9 owns the competition pages (the
`/competitions/{slug}` family — keyword map §2.8-2.13; 7 live competition
pages: PL, PD, SA, FL1, BL1, UCL, DFB-Pokal) + the date hub pages
(`/matches/today`, `/matches/tomorrow`, `/matches/this-week`,
`/matches/this-weekend`) + the empty-state behavior. The audit (read-first)
confirmed the competition-page content + the date-hub machinery are already
complete + byte-frozen; the ONE code change is the competition-page @graph
CollectionPage node (the Session 8-noted gap — the competition detail page
was the lone competition-family page without a WebPage/CollectionPage node).

- **S09-1 — the competition-page @graph CollectionPage node.**
  `buildCompetitionPage`'s `jsonldNodes` gains
  `JL.collectionPageNode(path, "برنامه بازی‌های " + String(cNameFa),
  ctx.fetchedAt)` between `siteNodes()` and `sportsOrganizationNode`. The
  @graph is now Organization + WebSite + CollectionPage + SportsOrganization +
  ItemList (when indexable) + BreadcrumbList — matching the spec Step-3
  contract ("the @graph carries Organization + WebSite + WebPage +
  BreadcrumbList"). CollectionPage is the accurate type here: the page's
  primary content is a collection of that competition's upcoming fixtures
  (the `itemListNode` when indexable) + the full standings table — the
  `sportsOrganizationNode` already carries the competition-entity semantics,
  so the page-level node describes the collection, not the entity. This
  mirrors the Session 8 team-page fix (the team page gained `webPageNode`;
  the competition detail page gains `collectionPageNode` for parity with its
  sibling pages — the `/competitions` index + the `/matches` hub + the time
  hubs all use `collectionPageNode`). Structural JSON-LD hygiene only (the
  CollectionPage node is machine-readable, invisible to the SERP snippet —
  does NOT contaminate the Dec 4-8 GSC measurement). Zero KV/fetch/CPU cost
  (in-memory object literal built from `path` + `ctx.fetchedAt` + the
  already-computed `cNameFa`). Verified by the new
  `check-seo-competitionpages.js` 8 gates + the seeded tsx render harness
  (`scripts/s9-competition-smoke.ts` — 30/30 assertions pass: the @graph
  carries the CollectionPage node with the correct @id/url/name/inLanguage/
  dateModified/isPartOf; NO SportsEvent; the @graph node order; the
  byte-frozen title/H1; the answer lead; the indexable rule; the
  self-canonical; the crawlable `<a href>` match row).

- **S09-2 — the audit confirms the date-hub + empty-state behavior is already
  correct (the S06-H3 refinement is post-Dec-4).** `buildHub`
  (`src/seo/pages.ts`) already emits `JL.collectionPageNode(def.path,
  def.h1, ctx.fetchedAt)` + `JL.itemListNode` + `JL.faqNode` +
  `JL.breadcrumbNode` in its `jsonldNodes`; the hubs are self-canonical +
  indexable (the C5 decision: empty hubs stay indexable —
  `/matches/tomorrow` is the site's best-CTR surface at 8.26% WITH an honest
  empty state). The empty-state behavior is correct: a hub with zero
  upcoming matches renders «مسابقه‌ای در راه نیست» in the list + the FAQ
  answers honestly + the answer sentence uses `def.desc`. The S06-H3
  follow-up (the tomorrow-empty-state refinement to the spec's suggested
  Persian copy «برای فردا مسابقه مهمی در میان دیدارهای منتخب اسپرت سیگنال
  ثبت نشده است…») is a post-Dec-4 decision with a fresh GSC export —
  documented, NOT changed this session (the empty-state copy is a
  GSC-measured surface on `/matches/tomorrow` — byte-frozen through Dec 4-8).
  No code change to the date hubs.

- **S09-3 — the competition-page title/H1 bytes ARE byte-frozen (the actual
  byte change is a post-Dec-4 decision with a fresh GSC export).** The
  competition-page title («{لیگ} — برنامه بازی‌های بزرگ پیش‌رو | اسپرت
  سیگنال» — the curated framing «بازی‌های بزرگ پیش‌رو» is the differentiator
  vs the full-coverage competitors) + the H1 («برنامه بازی‌های X») + the meta
  description + the answer sentence + the competition-name spellings are ALL
  GSC-measured surfaces byte-frozen through Dec 4-8. Session 9 owns them but
  defers the bytes — the actual byte change is a post-Dec-4 decision with a
  fresh 16-month GSC export (the program's top evidence request — it would
  validate the competition-page title/H1 against the actual query surface:
  the «بازی‌های لیگ برتر انگلیس» / «برنامه سری‌آ» / «بازی‌های لالیگا»
  competition-schedule heads). The CollectionPage node (S09-1) is NOT a
  GSC-measured surface — safe under the freeze. Verified by the
  `check-seo-competitionpages.js` freeze gates (gates 3 + 4 pin the
  byte-frozen title template + the H1).

- **S09-4 — the KV read quota is STILL exceeded at Session 9 close
  (pre-existing, NOT a code issue).** Live `/healthz` at Session 9 close
  (2026-11-16 23:50 UTC): `ok:false` + `pool_matches:0` + `pool_age_min:-1`
  — the pool is unreadable. This is the SAME pre-existing infrastructure
  issue tracked since Session 5 close (the account's 100,000 KV reads/day
  free-plan limit is exceeded; the pool/archive data persists but can't be
  read until the quota resets at UTC midnight). The competition-page data
  surfaces (the upcoming matches list, the full standings table, the rendered
  CollectionPage node on a detail page WITH upcoming matches) CANNOT be
  live-verified while the quota is exceeded — they self-verify once the quota
  resets at UTC midnight. The SSR-structural change (the CollectionPage node)
  is verified by the `check-seo-competitionpages.js` offline gates + the tsx
  render harness (30/30 assertions pass on a seeded ctx). The deploy is safe
  regardless of the quota state — the code change has zero new KV reads (it
  cannot worsen the quota issue). The owner should investigate the
  read-source; a Workers Paid plan ($5/mo → 1M reads/day) is the durable fix.

**Who decided.** The agent (SEO Session 9), on the trace evidence (the
buildCompetitionPage audit), the keyword map §2.8-2.13, the spec §2/§9, the
route plan §5 (the competition-page indexable rule + the empty-hub C5
decision), the Dec 4-8 freeze (the inherited constraint), and the Session 8
note that the competition detail page has the SAME @graph gap the team page
had.

**When to revisit.** S09-3 (the competition-page title/H1 byte change) after
Dec 4-8 with a fresh 16-month GSC export; the S06-H3 follow-up (the
tomorrow-empty-state refinement) after Dec 4-8 with the same export; S09-4
(the KV read quota) at every session close until the owner resolves it
(investigate the read-source or upgrade to Workers Paid).

---

## SEO Session 10 — internal linking + navigation (2026-11-17)

- **S10-1 — the `/teams` index tile ordering: the 13 selected clubs surface
  FIRST (the ONE explicit Session 10 decision — route plan §2.3 + §10).**
  `buildTeamsIndexPage` (`src/seo/pages.ts`) now sorts the `teamsIndex(ctx)`
  return so the 13 selected clubs (isSelectedTeam) lead the `/teams` index tile
  grid + the linkItemList JSON-LD, with the chronological-by-next-kickoff
  tiebreaker WITHIN each group. The route plan §2.3 named this "Session 10's
  call, cosmetic only" — the call is YES. Cosmetic only: the non-selected tiles
  stay (the crawlability law — a noindex page stays crawlable so Google can read
  the directive; the 74 non-selected team URLs keep their internal links from
  the `/teams` index tiles + the match-page footer-hook). Zero KV cost
  (in-memory isSelectedTeam check on data already in scope). The visible==machine
  contract holds (the tile grid + the linkItemList JSON-LD consume the same
  sorted `entries` array — SS-13). The sitemap `teams.xml` membership is
  unaffected (the isSelectedTeam filter is post-iteration in `files.ts`). The
  bySlug de-dup (U-03 one-URL-per-content) is stable under the reordering
  (slug-colliding entries share the same isSelectedTeam result via normAlias
  normalization). **The sort rides in the PRESENTATION layer
  (buildTeamsIndexPage), NOT in teamsIndex itself** — the Session 4 C1 law
  (`check-seo-crawlindex.js`) requires teamsIndex to generate BOTH sides
  unfiltered (the sitemap teams.xml filter + the team-page indexable rule apply
  isSelectedTeam; teamsIndex stays the raw chronological generator that powers
  the `/teams` tiles for ALL teams so the noindex stays crawlable). The
  `check-seo-internallinks.js` gate re-asserts this (gate 1 + the C1-regression
  assertion). Verified live: `/teams` renders 87 tiles (13 selected + 74
  non-selected); the first 13 are bayern-munich, manchester-city,
  borussia-dortmund, chelsea, paris-saint-germain, arsenal, real-madrid,
  barcelona, liverpool, manchester-united, ac-milan, internazionale-milano,
  club-atletico-de-madrid — the 13 indexable team pages; the linkItemList
  numberOfItems=87 + the first 4 ListItem urls mirror the tile hrefs (visible
  ==machine). Verified by the new `check-seo-internallinks.js` (9 gates) + the
  seeded render harness (`scripts/s10-internallinks-smoke.ts` — 29/29
  assertions pass).

- **S10-2 — the cross-page internal-link audit: every surface verified
  crawlable `<a href>`; the anchor wording already aligned; the homepage →
  team/competition spec §9 gap documented as a Session 11+ follow-up.** The
  audit (read-first, no code) traced every cross-page link surface: the
  homepage hero-card anchor + the sr-only carousel nav (S6), the match-page
  footer-hook «تیم‌ها» line + the competition link + the date links (S7, the
  isSelectedTeam gating intact), the team-page upcoming-matches block + the
  standings-window `.stmore` link (S8), the competition-page upcoming-matches
  block + the full standings table (S9), the `/teams` + `/competitions` index
  tile grids + the linkItemList JSON-LD (SS-13 visible==machine), the date-hub
  hubTiles() shortcut grid (all 4 sibling hubs), the `/matches` paginated hub,
  + the breadcrumbs on every page (home → section → page). Every internal link
  is a crawlable `<a href>` (no JS-only navigation, no `href="#"` placeholders
  in the tile grids). The anchor wording is already aligned with the
  destination page's H1 intent (the `/teams` tile carries the team name; the
  `/competitions` tile carries the competition faName; the match-page
  facts-table competition link carries `<compFa>`; the team-page `.stmore`
  link carries «جدول کامل <compFa>»). The cannibalization checklist (keyword
  map §3 — the 7 resolved overlaps) is NOT worsened by the tile-ordering change
  (the selected-clubs-first sort does not create a new overlap or worsen a
  resolved one — the tiles point to the same URLs in a reordered sequence;
  the homepage-vs-matches rule is unaffected). **The ONE spec §9 gap the audit
  surfaced: the homepage does NOT link directly to `/teams/<slug>` or
  `/competitions/<slug>` (spec §9 lists "Homepage → ... selected competition
  sections and selected team pages").** Closing this gap is a "link placement"
  change (in-scope per route plan §10) but touches the shared homepage
  standings/cups renderers (`markup.ts`) with visual side-effects — documented
  as a Session 11+ follow-up (the Persian/entity naming session or a dedicated
  internal-link pass), NOT changed this session (the route plan §2.3 named the
  tile ordering as "the ONE explicit Session 10 decision"; closing the homepage
  gap is a broader change that deserves its own scoped pass).

- **S10-3 — the freeze-coordination: the tile ordering is markup-only + the
  Dec 4-8 freeze holds.** The teamsIndex sort is NOT a GSC-measured surface
  (it reorders tiles, not the page's title/H1/description/answer — the `/teams`
  index title/H1 are unchanged: «تیم‌های فوتبال دنبال‌شده — برنامه بازی‌ها |
  اسپرت سیگنال» / «تیم‌های دنبال‌شده»). The anchor text in the tiles is the team
  name (unchanged). The linkItemList JSON-LD is machine-readable (invisible to
  the SERP snippet). The CollectionPage + WebPage + BreadcrumbList JSON-LD nodes
  are unchanged. The byte-frozen surfaces (the competition-page title/H1
  [S9], the team-page title/H1 [S8], the match-page title/H1 [S7], the
  homepage title/H1 [S6], the date-hub empty-state copy on /matches/tomorrow
  [S06-H3]) are all untouched. Anchor text in `<a href>` link text is NOT a
  GSC-measured surface (it's not in the SERP snippet) — but the visible link
  text IS user-facing, so the (unchanged) anchor wording is diff-verified +
  recorded here. Safe under the freeze.

- **S10-4 — the KV read quota: healthy at Session 10 deploy (the quota had
  reset at UTC midnight).** Live `/healthz` at Session 10 deploy (2026-11-17
  01:10 UTC): `ok:true` + `pool_matches:324` + `pool_age_min:50` +
  `kv_writes_day:72` + `degraded:false`. The KV quota is healthy (early UTC,
  just after midnight). The S10 data-surface self-verify is COMPLETE: the
  `/teams` index renders 87 real tiles (13 selected + 74 non-selected) with
  the selected clubs leading, + the linkItemList JSON-LD mirrors the tile
  order (visible==machine). The S10 change has zero new KV reads (the
  isSelectedTeam check is an in-memory Set membership lookup), so it cannot
  worsen the quota issue. The owner should continue to investigate the
  read-source (the quota gets exceeded DAILY during peak traffic — Sessions
  5-9 all closed with it exceeded at end-of-day); a Workers Paid plan ($5/mo →
  1M reads/day) remains the durable fix.

**Who decided.** The agent (SEO Session 10), on the trace evidence (the
cross-page internal-link audit), the keyword map §3 (the cannibalization
checklist), the route plan §2.3 + §10 (the ONE explicit Session 10 decision +
the markup-only scope), MASTER-SEO-SPEC §9 (the internal-links contract), the
Dec 4-8 freeze (the inherited constraint), and the Session 4 C1 law (teamsIndex
stays the raw unfiltered generator — the sort rides in the presentation layer).

**When to revisit.** S10-2 (the homepage → team/competition spec §9 gap) in
Session 11+ (the Persian/entity naming session or a dedicated internal-link
pass); S10-4 (the KV read quota) at every session close until the owner
resolves it; the Dec 4-8 freeze surfaces (the competition/team/match/homepage
title/H1 byte changes) after Dec 4 with a fresh 16-month GSC export.


## S18 (2026-11-17) — SEO Follow-up Session 18: the editorial body content

- **S18-1 — the module home.** A NEW `src/seo/editorial.ts` owns the authored
  editorial copy for the team + competition pages (the `faq-content.ts` S17
  sibling discipline: one file one responsibility; pages.ts stays the
  assembler; never pages.ts bloat). Decided by the agent (the session brief's
  deliverable named this option; the AGENTS.md god-module rule points the
  same way).
- **S18-2 — the placement.** The editorial card sits BELOW the answer-sentence
  and ABOVE the S17 faqcard on the team page (the content, then the Q&A); on
  the competition page AFTER the standings table and BEFORE the fixtures list.
  Decided by the agent from the S18 brief's placement directive (freeze-safe:
  additive body content below the answer-sentence).
- **S18-3 — the match page takes NO new editorial prose.** The Match Centre
  S08 narrative engine + the facts table + the S16/S17 FAQ already give the
  match page editorial depth; the audit's P1-1 named the team/competition
  pages. Decided by the agent (no thin surface left on the match page worth
  new prose; the freeze surface untouched).
- **S18-4 — the session-numbering reconciliation.** The S18 owner prompt
  assumed P1-7 (BreadcrumbList) + P1-8 (internal linking). The repo's audit
  (`docs/audits/2026-11-17-seo-gap-and-swot-audit.md`) numbers the gaps
  P1-1..P1-6 only. Per the prompt's own Task 18-0 rule, the repo audit file
  governs: both prompt-assumed items were already shipped (visible
  breadcrumbs live since P-17 — the S16 investigation corrected the P1-3
  claim as a verification error; the internal-link system live across
  v13.85/v13.87/v13.93 + the Match Centre related block), so S18 executed
  the repo's real next open item per the track spec §Session 18: P1-1, the
  content depth on the team + competition detail pages. Revisit: none — the
  follow-up track's next sessions are the data-dependent owner phase.
- **S18-5 — the E-E-A-T source note.** Every editorial card carries one
  Persian provenance line (football-data.org — the footer srcline's mirror,
  `.editorsrc`) instead of a new DOM element or a link farm. Decided by the
  agent (the footer already links the source; the prose cites provenance
  once, per the E-E-A-T grounding ask).

## S19 (2026-11-17) — Telegram Alerts Track Session 19: the live goal alerts

- **S19-1 — the snapshot store: one compact KV key (`goal_snapshots_v1`).**
  The last-known-score state lives in a single KV map written
  write-only-when-changed (the `match_status_v1` discipline, TTL 2 days),
  read only on ticks with live-scored in-window matches. Options rejected:
  extending the LIVE overlay (that is the public serve path's blob, written
  under budget/headroom gates — internal bot state must not ride it), and
  extending the pool row (the pool is the full-sweep snapshot, not per-tick
  state; the live sweep merges in memory). Decided by the agent from the
  notify-status precedent (the audit's §4).
- **S19-2 — the event model: one alert per (tick, match, delta-side), keyed
  by the post-goal score tuple.** The claim ntype is `goal:<h>-<a>` — the
  score AFTER the goal: a 2-1 then 3-1 match alerts twice, a re-sweep of
  the same 3-1 alerts zero times, at most one alert per score tuple per
  match ever (a disallowed-goal correction that re-crosses the same tuple
  is suppressed — the repo's fail-toward-fewer-notifications law). First
  sighting seeds, never fires; backward movement (correction) advances the
  baseline silently; a multi-goal same-side tick is one honest alert («۲ گل
  برای X»); a both-sides tick credits both WITHOUT inventing an order (the
  order is not in the data). Decided by the agent from the owner's S19
  brief (the per-goal claim-key directive) + the never-fabricate law.
- **S19-3 — red-card alerts SCOPED OUT (the honesty gate).** The audit
  verified: football-data v4 free tier exposes fixtures + scores only (no
  live incidents endpoint); the LIVE sweep's shape carries scores only;
  sportscore's wired day-fixture payload carries status + scores (the
  per-event detail the website's scorer enrichment fetches is not part of
  the sweep and carries no card data). No real incident source exists on
  the wired providers → red-card alerts are NOT built, never fabricated,
  never half-guessed. Revisit: only when a real incident source is actually
  wired (then a new audit + a new session).
- **S19-4 — goals fire from LIVE rows only.** A LIVE→FINISHED score delta
  (the last-minute goal) does NOT fire a goal alert: the engine's FT push
  lands within minutes carrying the final score, and post-FT provider
  corrections (FD does correct scores after the whistle) would otherwise
  fabricate «گُل!» hours after the match. A FINISHED row that flickers back
  to LIVE is a FIRST-SIGHTING seed (the snapshot row was dropped on
  finish), so a zombie flicker can never fake a goal. Decided by the agent
  (the correction-noise vs the minutes-late-goal trade-off; the FT push
  covers the information).
- **S19-5 — the channel-mirror goal post + the sportscore scorer
  enrichment are S20 backlog.** The S19 brief's no-scope-creep rule (no
  channel/broadcast features): the goal alert is private-fan-out only in
  S19. The claim-key shape extends naturally (`channelEventKeyMatch` +
  the tuple) when S20 wires it. The scorer enrichment (scorer names +
  minutes from the sportscore per-event detail the website already uses)
  is a per-match extra fetch — an S20 budget decision, never invented in
  S19.
- **S19-6 — the alert shape: compact, cache-only, capped.** The goal alert
  follows the HT-alert shape (headline + teams + competition + score +
  attribution; NO promo footer — a live moment, `withChannelCta` rides it
  per the parity law); the card is `cachedCardPng` ONLY (the v13.94.1
  CPU-keeper law — a goal burst must never resvg-render); lean (text-only)
  applies to every goal unit when the full cost does not fit (the text IS
  the payload); `GOAL_ALERT_MAX_UNITS = 6` per tick bounds the Saturday
  3pm-slate burst (audience-size sorted; the tail defers cleanly and rides
  the next tick with the baseline retained — an accurate, slightly late
  alert). Decided by the agent from the engine's own reservation semantics
  + the free-tier budget statement.
- **S20-1 — the day-hub universe: FD free-4 + senior internationals,
  senior men only.** The owner's «بازی‌های امروز/فردا» ask is a data
  universe problem (the hubs already list every pool match big-first +
  chronological — audit §1). The v1 universe adds the FD free-tier
  Eredivisie/Primeira Liga/Championship/Brasileirão (same single batched
  FD call, verified live) and a curated senior-international set from
  sportscore (friendlies, AFCON, CONCACAF NL, UEFA NL — the verified
  Nov-2026 window content incl. Iraq–IR Iran). Youth and women's football
  are filtered out (reversible). Notable non-free leagues (Saudi, MLS,
  Argentina) are out of scope v1 — a future owner decision. Decided by
  the agent from the audit; the owner may override before/during S20.
- **S20-2 — `CONFIG.LEAGUES` is untouchable for this feature.** It is
  live-mutable admin state (the KV settings blob overwrites it via
  `applySettings`); adding codes there would silently change the admin
  monitored-league semantics. The 4 FD comps ride a separate
  `FD_DAYVIEW_COMPS` constant appended only to the FD fetch URLs; a
  check gate fails if the codes leak into `CONFIG.LEAGUES`. Decided by
  the agent (the audit §4 trap).
- **S20-3 — the emptiness gate for the international scan.** The
  sportscore intl slugs scan [today−1d, tomorrow] only when NO club match
  (the tracked club codes) kicks off in [now−1d, now+1d] — club days pay
  zero extra subrequests; window days fill. The gate tests club rows only
  (never the intl rows it fetched, or it would close itself). The
  44-metered budget-stop stays the hard backstop. Decided by the agent
  (budget flat on normal days).
- **S20-4 — the ranking law stays as-is.** `upcomingFollowed`'s
  big-first → live-first → chronological sort already delivers "more
  important clubs higher, sorted chronologically". No builder sort
  changes in S20. Decided by the agent (the audit §1 finding).
- **S20-5 — window days sweep like matchdays.** Senior-intl rows count
  as cadence-relevant in the cron-pool relevance filter + live-sweep
  eligibility, so break-day internationals get matchday-fresh statuses
  and 10-min live scores instead of multi-hour staleness. Bot pushes stay
  gated by shouldNotify (internationals never notify). Decided by the
  agent (UX freshness vs a bounded sweep-cost increase during windows
  only).
- **S20-6 — the international data-hygiene law.** No intl row enters the
  pool without the senior-men name filter and the unordered-pair+date
  collapse keeping the most-progressed row — the verified reversed-dup
  and ghost-row classes must never render, and a phantom "upcoming" row
  for a finished game must never persist. Decided by the agent (the
  audit §3 landmines).
- **S20-7 — the women-marker set carries the provider's "(w)" form.** The
  spec's women markers (Women/Frauen/Femenino/Femenil) miss sportscore's
  actual senior-women naming form — live-verified in the 2026-11-19 feed:
  women's internationals are named like "Italy (w)" / "Germany U16 Women".
  The hygiene LAW (senior men only) is the contract; the marker set is its
  implementation — so the filter also tests the literal "(w)". Without it a
  senior women's row whose names carry only the "(w)" marker (no "Women"
  text, no U-age marker) could pass as a senior-men row. Decided by the
  agent from live provider evidence during the S20 build (the audit §3
  women-noise landmine).
- **S20-8 — the national-team fa-dict seed ships ~110 entries, not the
  spec's "~40".** Every entry is either a name form harvested LIVE from the
  Nov-2026 sportscore feeds (the exact spellings the showcase window will
  actually render: IR Iran, Turkiye, Czechia Republic, South Korea, USA,
  United Arab Emirates, Bosnia and Herzegovina, Saint Vincent and the
  Grenadines …) or the standard form of a flagship nation certain to appear
  in a future UEFA-NL/AFCON/CONCACAF window (England, France, Germany,
  Spain, Italy, Netherlands, Egypt, Morocco, Mexico …). No invented names;
  uncovered minor nations keep the honest English fallback + the AI learner
  path. The wider seed means the showcase rows (ایران–عراق etc.) render
  Persian on day one. Decided by the agent during the S20 build (the
  spec's "~40" was an approximation; the criterion stayed "curated,
  provider-form, no AI-translated flagships").


## S21 (2026-11-22) — the Farsi site-name swap: which surfaces flip, which stay Latin

- **S21-1 — the two-form brand law.** The brand has exactly TWO forms and
  each carries its own surfaces: the FARSI «اسپرت سیگنال» leads every
  SEARCH-FACING site-name signal — the WebSite + Organization JSON-LD
  `name` (Google's primary site-name system input), `og:site_name` on the
  page-shell + the homepage, and every Farsi head phrase (the ICS
  X-WR-CALNAME, the Atom feed `<title>`, the feed/calendar
  link-alternate titles, the homepage og/twitter image alts) — with the
  LATIN "SportSignal" riding `alternateName` (per Google's site-name
  guidance, the other-language form of the same entity). The LATIN form
  keeps its own contexts: the domain, the PWA install names
  (`application-name`/`apple-mobile-web-app-title`), the ICS `PRODID` (a
  technical identifier, not a display name), llms.txt/llms-full.txt (the
  English machine surfaces, already dual-named), the `twitter:site`
  handle, and the visible body copy (the narrative big-club variants, the
  footer © line — the optional follow-up, owner's call). Decided by the
  agent from the owner's 2026-11-22 directive ("in latin version :
  SportSignal / in farsi searches: اسپرت سیگنال"); the diagnosis + the
  surface map live in docs/history/2026-11-22-s21-farsisitename.md.

## 2026-11-23 — GSC 404 remediation (v13.279.0-gsc404remediation): the fix-phase scope decisions

- **Decision:** implement the 2026-11-23/24 audit's fix plan. (1) **Archive scope = Option B** (the audit-recommended default, taken per the brief's "no answer → recommended defaults" rule): `syncArchive` retains ALL finished tracked matches (365d, change-only writes) — the big-gate's 141 dead small-market URLs were the PRIMARY driver. (2) **410 for true strangers** (pattern-valid match slugs with no pool/redirect/archive row) + **410 for a-league** (the intentional death, v13.173-noal) + **200+noindex fallback shells for known entities** (the C1 noindex-must-stay-crawlable precedent; never in sitemaps). (3) **P6 = render-cost trimming (free)**, not the Workers Paid plan — the lite pool-miss path reads the ONE ~1KB per-match archive key instead of the full getSeoCtx + multi-MB blob parse. (4) **The one-time backfill** is implemented and dry-run-verified (340 FD candidates; PGL/EL/ECL/cups documented residuals draining as 410) — its WRITE and the P3 cup-tie seed ride the owner's deploy checkpoint. (5) One audit-table correction live-verified this session: the Levante–Atlético redirect twin is `…-2026-10-31` (the brief's `…-10-30` answered 404 live; 404/200 probes recorded in the remediation report).
- **Options considered:** Option A (big-only archive + 410 dead slugs) [rejected — the audit's own recommendation was B; the long tail carried ~1,400 impressions]; Workers Paid plan [rejected — the free render-trimming achieves the cliff goal without the $5/mo]; blanket redirects [rejected — the no-blanket-redirect law; only verified equivalents].
- **Reason:** the audit's evidence (the 404 cliff's growth curve 4→220 over 6 weeks); the owner pre-approved the fix phase with the Step-4 deploy checkpoint.
- **Who decided:** the agent under the brief's defaults rule (archive scope, 410 class, P6-free) + the owner's pre-approval of the fix phase itself.
- **Revisit when:** the Dec 4-8 measurement gate (the byte-freeze surfaces stay frozen; the remediation report's expectations: January 404 count ≤ ~10, indexed count rising from 659). Watch item: if the archive blob ever exceeds ~5,000 entries, the matches-archive sitemap child needs pagination (steady-state math says ~2,500-4,400 — under the trigger; the growth is now all-FINISHED-scope so re-check after a full season).

## 2026-11-23/24 — GSC 404 remediation (v13.279.0-gsc404remediation): the deploy execution + the interrupt handling

- **Decision:** execute the owner-approved deploy ("I approve, Push commit merge deploy.") in the deploy-plan order, and handle the smallmarket script's key-phase interrupt by completing the 21 missing keys post-UTC-midnight rather than immediately. (1) **Merge = fast-forward** (main had not moved since the branch); (2) **deploy inside the verified no-live window** (sched_live_now 0, next kickoff ~21h out — the discipline held, no owner-forcing needed this time); (3) **the three KV writes against a fresh (22:40 UTC) pre-write backup** — the earlier 21:24 UTC backup alone would not have satisfied §6's "right now" rule; (4) **the interrupt completion timing**: the session tool's 10-min window killed the smallmarket script mid-key-phase (blob write complete, ~319/340 keys) — the 21 remaining keys were deferred to ~00:05 UTC (the fresh quota day) instead of being written immediately at ~23:15 UTC, to avoid stacking ~500 script writes onto the bot's 630-count day near the account's daily write ceiling; the blob fallback kept every affected URL correct in the interim (the keys are the CPU-cost optimization, not correctness). (5) The sweep's 107-URL transient 503 class was **recorded as a watch item** (the pre-existing pool-HIT CPU cliff; a P6-style lite render for pool-HIT finished rows is the follow-up candidate) rather than scope-crept into this deploy.
- **Options considered:** writing the 21 keys immediately at 23:15 UTC [rejected — quota-headroom risk to the bot's overnight writes outweighed the pure-optimization value of the keys]; re-running the full smallmarket script [rejected — its FD phase re-fetches 13 competition windows; the idempotent backfill-archive-keys diff writes only the missing keys]; deploying outside the no-live window [not needed — the window was clean].
- **Reason:** AGENTS.md §5/§6 (backup-right-now, quota prudence, deploy verification) + the deploy plan recorded in the fix-phase HANDOFF banner.
- **Who decided:** the agent (the interrupt handling + the deferral timing) under the standing deploy approval of the owner.
- **Revisit when:** the next GSC export read (the 404 drain curve); the pool-HIT lite-render watch item rides the S23+ planning.
