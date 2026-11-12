# Match Centre — Narrative Trigger Matrix (M3 gate)

**Session**: S09 (M3 gate) — the Persian copy + factual fallback + editorial QA.
**Engine**: `src/seo/narrative.ts` (S08 — the deterministic narrative engine).
**Specification**: §5 "Deterministic narrative library" + milestones-and-sessions.md M3/S09.

This document is the M3 gate's "trigger matrix and rendered examples" deliverable
(specification §5, M3 gate note: "Provide trigger matrix and rendered examples;
preview deployment; verify SSR and no extra fetch/KV work"). It carries:

1. The five narrative categories × their explicit deterministic triggers ×
   their eligibility boundaries.
2. The global editorial priority hierarchy (the ranking).
3. The lifecycle eligibility (upcoming/live → pre-match variants; finished →
   past-tense + significance variants).
4. The figure policy + the no-fabricated-stats guard.
5. The OMIT fallback decision (no sixth "fallback" category).
6. Representative matches per lifecycle (upcoming/live/finished) with the
   rendered primary + optional secondary output — the actual engine output,
   captured via the real `narrativeHtml`/`narrativePlan` against fake SeoMatch
   objects (the same transpile harness `scripts/check-match-centre.js` uses).

---

## 1. The trigger matrix — five categories × triggers × eligibility boundaries

| # | Category | Priority | Trigger (deterministic) | Source fields | Eligibility boundaries |
|---|----------|----------|-------------------------|---------------|------------------------|
| 1 | `rivalry` | 1 (highest) | `m.rivalryFa` truthy | `{rivalry}` = the Persian rivalry name (El Clásico, Der Klassiker…) | Fires whenever a NAMED rivalry is set, regardless of lifecycle. A named rivalry supersedes a bare derby (the derby trigger gates on `!rivalryFa`). |
| 2 | `knockout-stage` | 2 | `m.roundFa` matches `/فینال\|نهایی\|یک‌چهارم\|نیمه/` | `{round}` = the round name (e.g. «یک‌چهارم نهایی»), `{comp}` = the competition name | Fires on a knockout round (final / semi / quarter). A league round («هفته ۱۲») does NOT match → no knockout category (no unsupported stakes). The round IS an already-available figure (loaded by the pre-existing awaits). |
| 3 | `top-table` | 3 | both teams in the top-3 of their competition's standings (`topTableEligible`) | `{comp}` = the competition name | Fires when BOTH `m.homeTeam` + `m.awayTeam` are in the top-3 set. A SINGLE top-3 team is insufficient (the both-teams gate — sample-size floor). Supersedes `big-club` (the big-club trigger gates on `!topTable`). The top-3 fact is verified (the standings payload), not fabricated. |
| 4 | `derby` | 4 | `m.derby` truthy AND `!m.rivalryFa` | (no source field — the flag only) | Fires on a bare derby (a heated local match). A NAMED rivalry takes the `rivalry` category instead (mutually exclusive via the `!rivalryFa` gate). No source field — the defining term «دربی» is in every variant. |
| 5 | `big-club` | 5 (lowest) | `m.big` truthy AND `!topTable` | (no source field — the flag only) | The featured-match fallback (both teams are SportSignal followed clubs — the v13.179 hero AND rule). Fires ONLY when no higher category qualifies. Gates on `!topTable` (a top-table clash takes the top-table category — the featured-match framing is redundant when the title race is on the line). |

### The global editorial priority hierarchy

```
rivalry (1) > knockout-stage (2) > top-table (3) > derby (4) > big-club (5)
```

A named rivalry is the marquee (highest); a knockout round is high-stakes; a
top-table clash is the title race; a derby is a heated local match; the
big-club framing is the featured-match fallback (lowest — the "concise
factual editorial paragraph if useful" from spec §5).

The engine walks the registry in priority order, collects the eligible
categories, and picks:
- **primary** = the highest-priority eligible category.
- **secondary** = the next-highest DISTINCT eligible category (never the same
  category; NEVER forced when only one is eligible — spec §5: "Display one
  primary storyline and optionally one distinct secondary storyline. Never
  force a second"). At most TWO narratives render (never a third).

### Lifecycle eligibility (lifecycle-independent triggers)

The 5 categories' TRIGGERS are lifecycle-independent (rivalry fires whenever
`m.rivalryFa` is set, regardless of `m.raw.status`). The lifecycle picks the
VARIANT TENSE:

| Lifecycle | Variant pool | Tense | Spec §5 |
|-----------|--------------|-------|---------|
| `upcoming` (SCHEDULED) | `variants` | present-tense framing ("pre-match form and competition context") | "Upcoming: pre-match form and competition context." |
| `live` (IN_PLAY/PAUSED) | `variants` (RETAINED — same as upcoming) | present-tense (no regeneration) | "Live: retain the pre-match briefing; do not regenerate frequently." |
| `finished` (FINISHED) | `variantsFinished` | past-tense + significance (the «به پایان رسید» marker) | "Finished: verified result and significance when data exists." |

`pages.ts` computes the flag: `finished ? "finished" : (live ? "live" : "upcoming")`
— the same gates the hero + the answer sentence use. Live = retained upcoming
(the SAME variant renders for a match across the upcoming→live transition — no
flicker, no regeneration).

---

## 2. The figure policy + the no-fabricated-stats guard

**Spec §5**: "Use figures only when they materially strengthen the narrative
and are already available without extra provider requests, KV operations or
expensive computation. Avoid duplicating prominent figures elsewhere."

**S09 decision (S09-3)**: the no-fabricated-stats guard HOLDS UNCHANGED. The
already-available figures are ALREADY cited via the placeholders:

| Placeholder | Source field | Already loaded by | Example |
|-------------|--------------|-------------------|---------|
| `{rivalry}` | `m.rivalryFa` | the pre-existing `hydrateMatchVenue` await | «ال کلاسیکو» |
| `{round}` | `m.roundFa` | the pre-existing match payload | «یک‌چهارم نهایی» |
| `{comp}` | `compNameFa(m)` (from `m.competition`) | the pre-existing match payload | «لیگ قهرمانان اروپا» |

No NEW figure is available without new data work. Streak counts / win-loss
tallies / progression outcomes / standings positions beyond top-3 stay
EXCLUDED — they would need bracket/form data the pool does not carry. The
variant templates NEVER cite:
- a digit + «برد»/«باخت»/«مساوی» (e.g. "۳ برد پیاپی" — a fabricated streak);
- «پیاپی» / «متوالی» (consecutive/successive — fabricated runs);
- «صعود کرد» / «حذف شد» (the claimed progression OUTCOME — the stakes
  «شرط صعود» are stated defensibly, never the outcome).

The knockout variants cite the round (an available figure) + the STAKES
(«شرط صعود» — the noun "condition of progression", defensible because the
round is a verified knockout round); they NEVER claim the outcome («صعود کرد»).

---

## 3. The OMIT fallback decision (S09-2)

**Spec §5**: "If no narrative qualifies, show one concise factual editorial
paragraph if useful, combining verified facts naturally. If no useful
paragraph can be made, omit the briefing. Never use generic filler or
unsupported predictions."

**S09 decision**: OMIT. When no category qualifies, `narrativeHtml` returns
`""` — the `.mcentre-narrative` element is omitted (the briefing card + facts
table still render; the S07 contract holds byte-for-byte: `"" + pair + result`
=== `pair + result`).

**Rationale**: a generic match's only verified facts are the kickoff time /
venue / competition / round — ALREADY covered by:
- the **answer sentence** (`matchAnswerSentence` — the G-03 answer-first
  briefing card, byte-frozen, feeds the meta description + the JSON-LD);
- the **facts table** (the date / venue / competition / round rows).

A fallback editorial paragraph would EITHER:
- restate those facts → violating the M3 gate no-repetition discipline
  ("Keep answer-first context and facts table distinct; avoid repetition"); OR
- fabricate significance → violating the no-fabrication guard.

No sixth "fallback" category is added to the registry. The spec's "If no
useful paragraph can be made, omit the briefing" path is the correct
resolution.

---

## 4. Rendered examples — representative matches per lifecycle

The outputs below are the ACTUAL engine output (`narrativePlan` /
`narrativeHtml`), captured via the real `src/seo/narrative.ts` transpiled +
run against fake SeoMatch objects (the same harness
`scripts/check-match-centre.js` uses). The deterministic selection (FNV-1a
hash of the match's canonical path + the category id → a stable index) picks
ONE variant per category per match; the same match → the same variant every
visit (spec §5: "wording must not randomly change between page visits").

### 4.1 rivalry — El Clásico (Real Madrid vs Barcelona, La Liga)

**Match**: `rivalryFa="ال کلاسیکو"`, competition «لالیگا», path
`/matches/real-madrid-vs-barcelona-2026-11-14`.

| Lifecycle | Primary | Secondary |
|-----------|---------|-----------|
| upcoming | `(rivalry)` «ال کلاسیکو» تنها یک بازی نیست؛ تقابل دو مکتب رقیب است که هر بار فضایی متفاوت می‌سازد. | — (only one category eligible — never forced) |
| live | `(rivalry)` «ال کلاسیکو» تنها یک بازی نیست؛ تقابل دو مکتب رقیب است که هر بار فضایی متفاوت می‌سازد. (RETAINED — same as upcoming) | — |
| finished | `(rivalry)` «ال کلاسیکو» به پایان رسید؛ دوباره دو حریف همیشه‌جدی روبروی هم بودند و هیجانی که با این دیدار گره خورده، تکرار شد. | — |

**Note**: the finished variant carries «به پایان رسید» (the past-tense +
significance marker); the upcoming/live variants carry present-tense framing
(NO «به پایان رسید»). Live = retained upcoming (the same variant — no
regeneration).

### 4.2 knockout-stage — UCL quarter-final (Bayern vs PSG)

**Match**: `roundFa="یک‌چهارم نهایی"`, competition «لیگ قهرمانان اروپا», path
`/matches/bayern-vs-psg-2026-11-14`.

| Lifecycle | Primary | Secondary |
|-----------|---------|-----------|
| upcoming | `(knockout-stage)` مرحله یک‌چهارم نهایی لیگ قهرمانان اروپا: برد می‌ماند، باخت کنار می‌رود. | — |
| live | `(knockout-stage)` مرحله یک‌چهارم نهایی لیگ قهرمانان اروپا: برد می‌ماند، باخت کنار می‌رود. (RETAINED) | — |
| finished | `(knockout-stage)` مرحله یک‌چهارم نهایی لیگ قهرمانان اروپا به پایان رسید؛ نتیجه مسیر صعود را روشن کرد. | — |

**Note**: the round name «یک‌چهارم نهایی» is an already-available figure
(cited via `{round}`). The stakes «شرط صعود» / «مسیر صعود» are stated
defensibly (the noun, never the claimed outcome «صعود کرد»).

### 4.3 top-table — two top-3 teams (Arsenal vs Dortmund, Premier League)

**Match**: both teams in the top-3 standings, `big=true`, competition «لیگ برتر
انگلیس», path `/matches/arsenal-vs-dortmund-2026-11-14`.

| Lifecycle | Primary | Secondary |
|-----------|---------|-----------|
| upcoming | `(top-table)` هر دو تیم هم‌اکنون در صدر جدول لیگ برتر انگلیس قرار دارند؛ برد این بازی در رقابت عنوان اهمیت دارد. | — (big-club gated out by `!topTable`) |
| live | `(top-table)` هر دو تیم هم‌اکنون در صدر جدول لیگ برتر انگلیس قرار دارند؛ برد این بازی در رقابت عنوان اهمیت دارد. (RETAINED) | — |
| finished | `(top-table)` هر دو تیم در صدر جدول لیگ برتر انگلیس قرار داشتند؛ این نتیجه رقابت عنوان را تحت تأثیر قرار می‌دهد. | — |

**Note**: the `big` flag is set BUT the big-club category does NOT fire (it
gates on `!topTable` — a top-table clash takes the top-table category; the
featured-match framing is redundant when the title race is on the line).

### 4.4 derby — a bare city derby (Inter vs Milan, Serie A)

**Match**: `derby=true`, no `rivalryFa`, competition «سری آ», path
`/matches/inter-vs-milan-2026-11-14`.

| Lifecycle | Primary | Secondary |
|-----------|---------|-----------|
| upcoming | `(derby)` این بازی یک دربی است؛ دیداری حساس بین دو حریف همیشه‌جدی. | — |
| live | `(derby)` این بازی یک دربی است؛ دیداری حساس بین دو حریف همیشه‌جدی. (RETAINED) | — |
| finished | `(derby)` این بازی یک دربی بود؛ دیداری حساس بین دو حریف همیشه‌جدی که به پایان رسید. | — |

**Note**: no source field — the defining term «دربی» is in every variant. A
named rivalry would take the `rivalry` category instead (the derby trigger
gates on `!rivalryFa`).

### 4.5 big-club — two SportSignal featured clubs (Liverpool vs Chelsea)

**Match**: `big=true`, not top-table, competition «لیگ برتر انگلیس», path
`/matches/liverpool-vs-chelsea-2026-11-14`.

| Lifecycle | Primary | Secondary |
|-----------|---------|-----------|
| upcoming | `(big-club)` وقتی دو تیم منتخب SportSignal روبروی هم می‌شوند، دیداری است که به‌طور پیش‌فرض دنبال می‌شود. | — |
| live | `(big-club)` وقتی دو تیم منتخب SportSignal روبروی هم می‌شوند، دیداری است که به‌طور پیش‌فرض دنبال می‌شود. (RETAINED) | — |
| finished | `(big-club)` دیدار دو تیم منتخب SportSignal به پایان رسید — تیم‌هایی که بازی‌هایشان همیشه دنبال می‌شود. | — |

**Note**: the lowest-priority category — fires only when no higher category
qualifies. The defining term «SportSignal» is in every variant.

### 4.6 no-category — the OMIT fallback (Brentford vs Brighton)

**Match**: no `rivalryFa` / `derby` / `big` / knockout round / top-3, path
`/matches/brentford-vs-brighton-2026-11-14`.

| Lifecycle | Primary | narrativeHtml |
|-----------|---------|---------------|
| upcoming | `null` (OMIT) | `""` — the `.mcentre-narrative` element is OMITTED |
| live | `null` (OMIT) | `""` |
| finished | `null` (OMIT) | `""` |

**Note**: a generic match's only verified facts are the kickoff/venue/
competition/round — already in the answer sentence + the facts table. A
fallback editorial paragraph would repeat them (M3 gate no-repetition) or
fabricate significance (no-fabrication guard). The OMIT resolution: the
briefing card + facts table render; the `.mcentre-narrative` element does
not. The S07 contract holds byte-for-byte.

### 4.7 multi-category — primary + optional secondary (El Clásico UCL semi-final)

**Match**: `rivalryFa="ال کلاسیکو"` AND `roundFa="نیمه‌نهایی"`, competition
«لیگ قهرمانان اروپا», path
`/matches/real-madrid-vs-barcelona-ucl-sf-2026-11-14`.

| Lifecycle | Primary | Secondary |
|-----------|---------|-----------|
| upcoming | `(rivalry)` این دیدار «ال کلاسیکو» است — یکی از حساس‌ترین بازی‌های فوتبال جهان. | `(knockout-stage)` این بازی در مرحله نیمه‌نهایی لیگ قهرمانان اروپا برگزار می‌شود — مرحله‌ای حذفی با شرط صعود. |
| live | `(rivalry)` این دیدار «ال کلاسیکو» است — یکی از حساس‌ترین بازی‌های فوتبال جهان. (RETAINED) | `(knockout-stage)` این بازی در مرحله نیمه‌نهایی لیگ قهرمانان اروپا برگزار می‌شود — مرحله‌ای حذفی با شرط صعود. (RETAINED) |
| finished | `(rivalry)` این دیدار «ال کلاسیکو» بود — یکی از حساس‌ترین بازی‌های فوتبال جهان که به پایان رسید. | `(knockout-stage)` این بازی در مرحله نیمه‌نهایی لیگ قهرمانان اروپا برگزار شد — مرحله‌ای حذفی که شرط صعود را تعیین کرد. |

**Note**: when TWO distinct categories are eligible, the primary is the
highest-priority (rivalry, priority 1) + the secondary is the next-highest
DISTINCT (knockout-stage, priority 2). The secondary is NEVER forced — it
only renders when a distinct eligible category exists (spec §5). At most TWO
render (never a third — the remaining eligible categories are dropped).

---

## 5. The variant corpus — counts per category per lifecycle

S09 expanded each category's variant arrays from the S08 seed pair (2) to 4
entries each (the spec §5 "Multiple manually written Persian wording variants"
target, in the 3–5 range). The S08 seeds are preserved as entries 0–1
(continuity); entries 2–3 are S09-authored.

| Category | `variants` (upcoming/live) | `variantsFinished` (finished) |
|----------|----------------------------|-------------------------------|
| rivalry | 4 | 4 |
| knockout-stage | 4 | 4 |
| top-table | 4 | 4 |
| derby | 4 | 4 |
| big-club | 4 | 4 |
| **Total** | **20** | **20** (40 strings) |

The deterministic selection (FNV-1a hash of the canonical path + the category
id → modulo the variant count) yields a stable index per match per category.
With 4 buckets per category per lifecycle, the selection distributes
meaningfully across matches (no single always-selected variant).

### Factual equivalence

Every variant of a category cites the SAME source field (the category's
factual evidence), worded differently:
- **rivalry** — every variant carries `{rivalry}`;
- **knockout-stage** — every variant carries `{round}` + `{comp}`;
- **top-table** — every variant carries `{comp}`;
- **derby** — every variant carries «دربی» (the defining term);
- **big-club** — every variant carries «SportSignal» (the defining term).

### Grammar + RTL punctuation discipline

The full corpus uses Persian typography only:
- Persian comma «،» (not Latin comma);
- Persian semicolon «؛» (the clause separator);
- Persian guillemets ««»» (around the rivalry name — not Latin double-quotes);
- the ZWNJ (U+200C) in compound words (همیشه‌جدی / صدرنشین / به‌طور /
  پرطرفدار / کم‌اهمیت‌ای / همشهری / پیش‌فرض);
- no Latin mixing; no byte-duplicate variants within a category.

---

## 6. The M3 gate verification

| Gate requirement | Status |
|------------------|--------|
| Trigger matrix (5 categories × triggers × boundaries) | This document, §1. |
| Rendered examples (primary + optional secondary across lifecycles) | This document, §4 (7 representative matches — 5 single-category + 1 multi-category + 1 no-category fallback). |
| Preview deployment (mcM3x, NEVER activated) | `wrangler versions upload --config wrangler.preview.toml` — the version ID + URL recorded in `MATCH-CENTRE-EXECUTION-LOG.md` (the M3 gate entry). |
| Verify SSR + no extra fetch/KV work | `buildMatchPage`'s await count stays 3 (hydrateMatchVenue, loadArchive, fullByCodeFor); the engine adds ZERO awaits (it reads the already-loaded SeoMatch fields). The `check-match-centre.js` cost-law assertion gates this. The agent-browser read-only smoke on the preview verifies the runtime narrative render on real match pages (the preview shares the production STATE KV — the documented seeder gap is closed at the gate). |
