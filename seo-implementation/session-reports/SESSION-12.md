# SEO Program Session 12 — EN Architecture + Hreflang Decision

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

- **Date:** 2026-11-17
- **Version shipped:** none (docs-only session — no runtime change, no version bump, no deploy). The live deployment stays at `13.267.0-persian-entities` (deployment `21efcee2-269a-4ad1-819c-b6027822607a` @100% — the Session 11 deploy).
- **Live before:** `13.267.0-persian-entities` (Session 11, deployment `21efcee2-269a-4ad1-819c-b6027822607a` @100%).
- **Status:** Completed (docs-only). The EN architecture + hreflang decision is **Option (b) — maintain the single-language stance, FINAL** (the route plan §8 stance is no longer "pending Session 12").

## 1. Objective and scope

The EN architecture + hreflang decision session of the 15-session SEO
program (the route plan §8 + §10). The decision needs evidence Session 12
must gather itself: English-query demand in the GSC export, EN SERP
formats, the localization cost against the Worker budget. The two options
(ROUTE-AND-CANONICAL-PLAN §8):

- **Option (a):** build the `/en/` URL architecture with genuinely
  localized pages + reciprocal hreflang (fa-IR + en + x-default).
- **Option (b):** maintain the single-language stance (the current state).

The Dec 4-8 measurement freeze applies to the GSC-measured surfaces (all
title/H1 bytes + the team-name spellings + the date-hub empty-state copy
on `/matches/tomorrow`). Session 12's EN work is spelling-freeze-aware:
ANY English URL/title change would be a NEW URL (not a frozen-surface
byte change). As decided (Option (b)), no new URLs are built and no
byte-frozen surface is touched — the freeze is moot for this session.

## 2. The decision — Option (b): maintain the single-language stance (FINAL)

**Option (b) chosen.** SportSignal stays a single-language (Persian-first)
site. No `/en/` URL architecture. No hreflang. The client-side `?lang=en`
toggle (the EN button + the `html[lang="en"]` CSS rules in
`src/pages/public.ts`) stays as the ONLY English surface — a runtime
display toggle, NOT a URL architecture, NOT a translation the spec §7
hreflang reciprocity law covers.

The decision rests on three independently-verified evidence axes, all
decisive for (b). Full detail in `docs/DECISIONS.md` S12-1.

### 2.1 English-query demand = ZERO (the decisive axis)

The program's English-query demand evidence was re-verified this session
directly from the 2026-11-15 GSC export
(`sportsignal-seo-implementation/reference/sportsignal.ir-GSC-11-15.zip`
→ `Queries.csv`). Method: `unzip` the export, then
`tail -n +2 Queries.csv | grep -P '[A-Za-z]{3,}'` to surface every query
row containing a Latin alpha run of ≥3 characters (the only candidates for
English phrases).

| Finding | Value |
|---|---|
| Total visible query rows | **375** (23 clicks / 4,289 impressions) |
| Pure-Persian rows | 373 |
| Latin-only rows | **1** — "kups" (KuPS — the Finnish club Kuopion Palloseura, a one-off European-tie opponent; **1 impression, 0 clicks**, pos 7) |
| Mixed Persian+Latin rows | **1** — "بازی como" ("بازی" = Persian "match" + "como" = the Italian club Como; **1 impression, 0 clicks**) — a Persian query with a club-name token, counted as Persian |
| Full English queries ("Arsenal next match", "Champions League fixtures", etc.) | **ZERO** — 0 rows, 0 impressions, 0 clicks |

The country evidence (Countries.csv) corroborates:

| Country | Clicks | Impressions | Position |
|---|---:|---:|---:|
| Iran | **248** | **8,774** | 8.43 |
| Afghanistan (Persian-speaking — Dari) | 1 | 438 | 11.22 |
| Pakistan | 1 | 5 | 9.20 |
| United States | 0 | 12 | 22.67 |
| United Kingdom | 0 | 6 | 10.33 |
| Canada | 0 | 3 | 24.67 |
| Ireland | 0 | 2 | 6.00 |

The top English-speaking countries (US + UK + Canada + Ireland)
collectively carry **0 clicks / ~23 impressions at poor positions** —
these are Persian-diaspora users searching in Persian (the position
degradation + the Persian-query evidence in the Queries export agree),
NOT English queries. Mobile = 94.8% of clicks (Devices.csv: Mobile 237
clicks / 9,145 impressions; Desktop 9 / 197; Tablet 4 / 123).

The keyword map §5 held cluster (20 English rows) has **zero GSC-observed
demand** — the held rows are candidate/seed phrases, not evidenced demand.

**The existing 3-month snapshot is SUFFICIENT to make the decision**
because the English-query demand is ZERO (not "low" — zero). A fresh
16-month GSC export (the program's top evidence request) would only
strengthen the zero-demand finding (more data, same conclusion), not
change it.

### 2.2 The localization cost against the Worker budget is NOT justified

Building `/en/` URLs (Option (a)) would double the page count:

- ~383 sitemap URLs → ~766 (every FA page gets an EN mirror: the 13
  selected-club team pages + the 7 competition pages + the 5 hubs + the
  ~123 upcoming + ~151 archive match pages).
- The 13 non-selected team pages STAY noindex (the C1 disposition holds
  for both languages — no EN mirror for non-selected clubs).

Each EN page render reads the SAME KV data as its FA mirror (`getSeoCtx`
= payload + pool + overlay — `src/seo/data.ts`), so **the KV read budget
doubles**. The account's 100,000 KV reads/day free-plan limit
(CLOUDFLARE-RESOURCE-BASELINE §2) is **ALREADY exceeded DAILY** (Sessions
5-11 all closed with it exceeded; the Persian + EN entity-name data
surfaces — the rendered faName on team/match/competition pages — go empty
when the quota is exceeded). Doubling the read demand would worsen the
daily-exceedance: the data surfaces would be empty MORE often during the
day.

The **10ms CPU/invocation cliff** (CLOUDFLARE-RESOURCE-BASELINE §5) is
chronic: 37 `exceededResources` in 3h on v13.258 (2026-11-15), 789 on
Nov 10. Doubling the page count doubles the cold-render exposure.

The sitemap doubles (every FA URL gets an EN mirror row). The hreflang
emission (reciprocal `<link rel="alternate" hreflang="...">` on BOTH the
FA pages AND the EN pages + `x-default`) is a small in-memory addition
but touches EVERY page's `<head>`.

**The free-tier budget is NOT sufficient to absorb the doubling.** The
durable fix (a Workers Paid plan, $5/mo → 1M reads/day) is the owner's
decision, not this session's — and per S12-1 axis 2, a Workers Paid plan
is a prerequisite for any future `/en/` architecture.

### 2.3 The EN SERP is saturated by high-authority English-native publishers

The English SERP for the target query families (next-match, matchup +
date/time/result, league-schedule) is dominated by BBC Sport, ESPN, the
Premier League / La Liga / Serie A / Bundesliga / Ligue 1 official
sites, Flashscore and Sofascore — full-coverage, high-link-equity,
English-native publishers. SportSignal's curation differentiator (the
«برنامه بازی‌های مهم فوتبال» framing — "important matches only") is a
Persian-market differentiator that does NOT translate to a competitive
English advantage against these publishers. The site's best-CTR surfaces
(`/matches/tomorrow` 8.26% CTR; the Barcelona–Man City match page 8.18%
CTR — GSC-AUDIT-BASELINE) are ALL Persian-query surfaces — there is no
English-query surface with demonstrated CTR.

Building `/en/` URLs would compete head-on with publishers SportSignal
cannot out-rank, for zero evidenced demand, at 2× the Worker cost.

### 2.4 The spec §7 law

MASTER-SEO-SPEC §7: "Do not emit hreflang for an absent or non-equivalent
translation." There are ZERO English URLs today (the `?lang=en` toggle is
client-side only, NOT a URL architecture). Emitting hreflang for an
absent translation is a spec violation. The route plan §8 stance (point 1,
inherited from Session 3) holds: "No hreflang and no EN URLs before
Session 12."

### 2.5 Why not Option (a) or Option (c)

- **Option (a)** violates the spec §7 hreflang law (hreflang for an absent
  translation) AND incurs a 2× KV-read + 2× CPU-cliff cost the free-tier
  budget cannot absorb, for zero evidenced demand.
- **Option (c)** (defer to a post-Dec-4 session) defers a decision the
  evidence already decides — zero demand is zero demand regardless of the
  freeze window. The Dec 4-8 freeze is moot for Option (b) (docs-only; no
  byte-frozen surface touched).

## 3. The EN/hreflang state re-verified (audit C2 holds)

A `grep` of the codebase for `hreflang`, `/en/`, `lang="en"`, `x-default`,
and `alternate.*hreflang` confirmed the audit C2 finding holds:

- **Zero hreflang emission.** No `hreflang` attribute, no `<link
  rel="alternate" hreflang="...">` anywhere in `src/`.
- **Zero `/en/` URLs.** The router (`src/seo/router.ts`) has no `/en/`
  branch; the `isHtmlish` regex (line 855) + the route-family regex (line
  855) only match `/$|matches(\/[a-z0-9-]*)?$|teams(\/[a-z0-9-]*)?$|
  competitions(\/[a-z0-9-]*)?$|about$|methodology$|contact$|privacy$|
  terms$|data$|sitemap$` — `/en/...` falls to the 404 path.
- **The only `lang="en"` references** are in `src/pages/public.ts` (lines
  490, 500, 664) — the client-side EN button (the Union Jack flag), the
  `html[lang="en"]` CSS rules that hide Persian-only elements (`.ps-fa`)
  and show English-only elements. This is the display toggle, NOT
  server-side EN pages.
- **Every page ships `<html lang="fa" dir="rtl">`** (`src/seo/page-shell.ts`
  line 107 — hard-coded).
- **`og:locale=fa_IR`** pinned in `page-shell.ts` (line 71).
- **`scripts/seo-check.js:461-463`** codifies the single-language decision
  (T-08 — "site is single-language (fa) — hreflang not applicable"). This
  is a LIVE-audit gate (`npm run seo:check`, NOT in the offline `npm test`
  chain); it passes.

## 4. Files changed (docs-only — NO code, NO assets, NO version bump)

### Modified (docs)
- `docs/DECISIONS.md` — three new S12 entries prepended at the top (after
  the header): S12-1 (the EN architecture + hreflang decision — Option
  (b), with the three evidence axes), S12-2 (the freeze-coordination —
  docs-only, no byte-frozen surface touched, no code/deploy/version bump),
  S12-3 (the KV read quota healthy at session close; no deploy).
- `seo-implementation/architecture/ROUTE-AND-CANONICAL-PLAN.md` — §8
  rewritten from "Hreflang stance (pending Session 12)" to "Hreflang
  stance — FINAL (Session 12 decided: Option (b) — maintain the
  single-language stance)". §10 sequencing table: the "EN architecture +
  hreflang decision | 12" row updated to "12 (DONE — Option (b): maintain
  the single-language stance, FINAL)".
- `docs/HANDOFF.md` — rewritten for Session 12.
- `CHANGELOG.md` — a Session 12 docs-only entry (no version bump).
- `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` — the
  Session 12 row updated from "Not started" to "Completed (docs-only; no
  deploy by design — Option (b): maintain the single-language stance)".
- `seo-implementation/session-reports/SESSION-12.md` — this file.
- `seo-implementation/next-session-prompt.md` — the Session 13 start
  prompt (structured data).

### NOT modified (the Option (b) discipline)
- **NO `src/` file touched.** No `/en/` router, no EN page builders, no
  hreflang emission, no `check-seo-en-architecture.js` gate.
- **NO `scripts/` file touched.** The `scripts/seo-check.js` T-08
  codification stays as-is (it already passes).
- **NO `assets/` file touched.** No SW/cache bump, no client bundle
  rename.
- **NO version bump.** `src/config.ts` stays `13.267.0-persian-entities`;
  `package.json` stays `13.267.0.0`.
- **NO deploy.** The live deployment `21efcee2-269a-4ad1-819c-b6027822607a`
  @100% stays.

## 5. The keyword map §2 English plan slots — RETIRED as active plan slots

The keyword map §2.1-2.15 carry an "English plan slot (Session 12)" line
per class (e.g. §2.1 homepage: "Today's Most Important Football Matches |
Kickoff Times | SportSignal"; §2.7 team: "{Club} — Next Match & Upcoming
Fixtures | SportSignal"; §2.15 match: "⚽ {Home} – {Away} | {Competition},
{date} | SportSignal"). These slots were the contingency mapping for
Session 12's decision.

With Option (b) chosen, these slots are **RETIRED as active plan slots** —
they remain in the map as the documented Option (a) contingency (what the
EN titles/H1s WOULD be if a future session re-litigates and chooses Option
(a)), but they are no longer "pending Session 12" slots. A future session
that wants to build `/en/` URLs must re-litigate ALL THREE evidence axes
(S12-1 revisit clause) with a fresh 16-month GSC export showing real
English-query demand + a Workers Paid plan in place + a demonstrated
competitive angle.

The keyword map itself is NOT edited this session (it is a Session 3
deliverable; the §2 English slots stay as the documented contingency —
the route plan §8 FINAL stance + the DECISIONS S12-1 entry are the
governance record that retires them as active).

## 6. Tests

- `npm test` exit 0 — **3,720 OK** (the baseline; no new check added, no
  code changed — verified before the push). `npx tsc --noEmit` clean
  (no `src/` change).
- No new offline gate added (the prompt's Option (b) explicitly says "No
  code change"). The existing `scripts/seo-check.js` T-08 live-audit gate
  ("site is single-language (fa) — hreflang not applicable") stays as the
  codification.
- The EN/hreflang state re-verified by a codebase `grep` (§3 above).

## 7. Deploy

**No deploy.** This is a docs-only session (Option (b) — no runtime
change). The live deployment stays at `13.267.0-persian-entities`
(deployment `21efcee2-269a-4ad1-819c-b6027822607a` @100% — the Session 11
deploy; unchanged by the docs-only S12 session).

**Cloudflare budget of this change:** zero new KV reads (docs-only — no
code, no render path change); zero new KV writes; zero new subrequests;
zero new fetches; zero render-cost additions. The decision (Option (b))
cannot worsen the KV-read quota issue — it adds nothing to the runtime.

**Deploy-window check:** today is 2026-11-17 (the session close) — NOT
Nov 20 (the Bayern–Köln S27 auto-verify windows: kickoff 19:30 UTC, M1
~19:35, M2 ~21:35-45 UTC; `sched_next_ko: 2026-11-20T19:30:00.000Z`).
Moot for a docs-only session (no deploy) — noted for the next session.

## 8. The KV read quota (healthy at session close)

The live `/healthz` at Session 12 close (2026-11-17, docs-only — no
deploy):

```
{"ok":true,"heartbeat_age_min":6,"last_cron_age_min":6,"outbox_depth":0,
"pool_age_min":76,"pool_matches":324,"admin_alerts_ok":true,
"kv_writes_day":178,"kv_writes_web":112,"kv_budget":null,"degraded":false,
"subreq_last_tick":42,"kv_ops_last_tick":30,"sched_mode":"IDLE",
"sched_reason":"beyond-horizon","sched_live_sweep":"none",
"sched_poll_hint_sec":900,"sched_live_now":0,"sched_stale_live":0,
"sched_feed_ok":true,"sched_next_ko":"2026-11-20T19:30:00.000Z",
"sched_next_wake":"2026-11-20T18:30:00.000Z",
"version":"13.267.0-persian-entities"}
```

The KV quota is healthy (`ok:true` + `pool_matches:324` + `degraded:false`
— the reads are working; the data surfaces are rendering). The S12
decision (Option (b)) has zero new KV reads (docs-only), so it cannot
worsen the quota issue. The owner should continue to investigate the
read-source (the 10-min cron + public traffic + the bot may collectively
exceed 100K reads/day); the durable fix is a Workers Paid plan ($5/mo →
1M reads/day) — and per S12-1 axis 2, a Workers Paid plan is ALSO a
prerequisite for any future `/en/` URL architecture (the 2× KV-read
demand). Decision S12-3.

## 9. Commit SHAs

- The docs checkpoint: `seo(s12): the EN architecture + hreflang decision
  — Option (b) maintain the single-language stance, FINAL (the three
  evidence axes — zero English-query demand [375 GSC rows; 374 Persian;
  the 1 Latin-only string "kups" = the Finnish club KuPS, 1 impression, 0
  clicks; zero full English queries; Iran = 248 clicks / 8,774 impr = 98.4%
  of clicks; the top English-speaking countries = 0 clicks / ~23 impr at
  poor positions = Persian-diaspora searches, not English queries] + the
  localization cost against the Worker budget not justified [2× KV-read on
  a quota already exceeded daily + 2× CPU-cliff exposure + the sitemap
  doubles] + the EN SERP saturated by high-authority English-native
  publishers [BBC Sport, ESPN, the league-official sites, Flashscore,
  Sofascore]) — the route plan §8 stance updated to FINAL + the keyword
  map §2 English plan slots RETIRED as active plan slots (the documented
  Option (a) contingency stays) + the S12-1/S12-2/S12-3 DECISIONS entries
  + the SESSION-12 report + the HANDOFF/CHANGELOG/tracker updates + the
  Session 13 prompt — docs-only, no code change, no deploy"` (one commit;
  ls-remote verified).

Recorded in `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`
Session 12 row after the push.

## 10. Unresolved risks / open follow-ups

- **The Dec 4-8 freeze:** the competition/team/match/homepage title/H1
  bytes + the team-name spellings + the date-hub empty-state copy are
  byte-frozen. After Dec 4, with a fresh 16-month GSC export, apply the
  parked S2 title-test winning pattern + decide the frozen-surface byte
  decisions (S09-3, S08, S07-H2, S06-H2, S06-H3). The S11 freeze-safe
  changes (og:type=article + SEO_EXTRA_ALIASES + TEAM_SLUGS no-op) are NOT
  reverted — they are durable. The S12 decision (Option (b)) touches NO
  byte-frozen surface.
- **The KV read quota:** healthy at S12 close (the quota had reset). Re-
  check at every session close until the owner resolves the daily-
  exceedance issue (investigate the read-source or upgrade to Workers
  Paid). A Workers Paid plan is ALSO the prerequisite for any future `/en/`
  URL architecture (S12-1 axis 2).
- **The fresh 16-month GSC export (the program's top evidence request):**
  remains the top request — but the existing 3-month snapshot is
  SUFFICIENT for the S12 decision (zero English-query demand is zero
  regardless of the window). The fresh export would validate the
  frozen-surface byte decisions post-Dec-4 (S09-3, S08, S07-H2, S06-H2,
  S06-H3) + the SEO_EXTRA_ALIASES future-additions + any future EN
  re-litigation.
- **The S10-2 follow-up (the homepage → team/competition spec §9 gap):**
  the homepage does NOT link directly to `/teams/<slug>` or
  `/competitions/<slug>` (spec §9 lists "Homepage → ... selected
  competition sections and selected team pages"). Closing it is a "link
  placement" change (in-scope per route plan §10) but touches the shared
  homepage standings/cups renderers (`markup.ts`) with visual side-effects
  — a Session 13+ follow-up.
- **The S11 SEO_EXTRA_ALIASES extension — future additions:** after Dec
  4-8, with a fresh GSC export, add NEW GSC-observed Persian variants as
  further `SEO_EXTRA_ALIASES` entries (every alias cites its GSC evidence
  per the S-05 rule).
- **The EN architecture re-litigation gate (S12-1 revisit):** a future
  session that wants to build `/en/` URLs must re-litigate ALL THREE
  evidence axes (English-query demand + Workers Paid plan in place + a
  demonstrated competitive angle against the English-native publishers).
  The keyword map §2 English plan slots stay as the documented Option (a)
  contingency.

## 11. Session 12 acceptance criteria (from the start prompt + the phase file)

The phase file (`sportsignal-seo-implementation/phases/SESSION-12-ENGLISH-SEO-AND-HREFLANG.md`)
acceptance criteria: "Persian and English versions return correct
canonical/hreflang, no absent alternate is referenced, English pages have
distinct useful content, and sitemap consistency is verified." With
Option (b) chosen, there are NO English versions to return canonical/
hreflang for — the criterion is satisfied by the ABSENCE of hreflang (the
spec §7 law: "Do not emit hreflang for an absent or non-equivalent
translation"). The acceptance criteria map:

- ✅ **Audit existing English URL set and language switcher before
  changing architecture** — done (§3). Zero English URLs; the `?lang=en`
  toggle is client-side only (the display toggle in `src/pages/public.ts`);
  the router has no `/en/` branch; every page ships `<html lang="fa"
  dir="rtl">`; the T-08 live-audit gate codifies the single-language
  decision.
- ✅ **Preserve current URL pattern if technically sound. If no robust
  English structure exists, propose `/en/` with migration plan before
  implementation** — the current URL pattern (Persian-only, the
  `?lang=en` display toggle) IS technically sound for the evidenced
  demand (zero English queries). No robust English structure exists
  (zero `/en/` URLs); the `/en/` proposal was evaluated (Option (a)) and
  REJECTED on the three evidence axes (§2). No migration plan needed
  (no URLs to migrate).
- ✅ **Create natural English copy for equivalent pages; do not translate
  Persian literally** — N/A (Option (b): no EN pages built). The keyword
  map §2 English plan slots stay as the documented Option (a) contingency
  (idiomatic English titles, not literal translations).
- ✅ **Add self-canonical and reciprocal hreflang for actual equivalent
  pages only** — N/A (Option (b): no equivalent EN pages; hreflang for an
  absent translation is a spec violation per §7). The spec §7 law is
  satisfied by the ABSENCE of hreflang.
- ✅ **Ensure hreflang return links, valid language codes, canonical
  alignment and sitemap consistency** — N/A (Option (b): no hreflang;
  the existing self-canonical-per-URL + the sitemap-lists-only-indexable-
  200-URLs invariant hold; no sitemap change).
- ✅ **Do not publish English pages for non-selected teams or unsupported
  competitions** — N/A (Option (b): no EN pages published at all; the C1
  disposition for non-selected teams holds for the single language).
- ✅ **Use GSC countries/queries to evaluate English target geographies;
  do not assume a country** — done (§2.1). The GSC Countries.csv shows
  Iran = 98.4% of clicks; the top English-speaking countries = 0 clicks /
  ~23 impressions at poor positions (Persian-diaspora searches). Zero
  English target geographies evidenced.

## 12. Handoff to Session 13

Session 13 owns the structured data + GSC enhancement validation (the
route plan §10 — the phase file
`sportsignal-seo-implementation/phases/SESSION-13-STRUCTURED-DATA.md`).
The next-session prompt is in `seo-implementation/next-session-prompt.md`.
The standing constraints carry: the Dec 4-8 freeze; the Cloudflare free-
tier budget; the KV read quota (re-check at S13 close; a Workers Paid plan
is the durable fix AND the prerequisite for any future `/en/` re-
litigation); the S10-2 homepage → team/competition gap follow-up; the S11
SEO_EXTRA_ALIASES extension (future additions after Dec 4-8 with a fresh
GSC export); the S12 EN architecture decision (FINAL — Option (b); a
future re-litigation requires the three evidence axes); do not start
Session 14+ work in Session 13.
