# DECISIONS — decision history (add only, never rewrite)

Format: date · decision · options considered · reason · who · revisit when.
(Adopted with the universal AGENTS.md rules on 2026-11-08; this file is new —
earlier decisions live in README §"Architecture decisions" and docs/adr/.)

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
