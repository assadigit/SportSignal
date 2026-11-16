# DECISIONS — decision history (add only, never rewrite)

Format: date · decision · options considered · reason · who · revisit when.
(Adopted with the universal AGENTS.md rules on 2026-11-08; this file is new —
earlier decisions live in README §"Architecture decisions" and docs/adr/.)

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
