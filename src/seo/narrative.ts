// SportSignal — Match Centre S08 (M3): the deterministic narrative engine.
//
// OWNERSHIP (milestones-and-sessions.md M3/S08 + specification §5):
// THIS module owns the "why this match matters" editorial layer — a central
// category registry + a global priority ranking + explicit triggers/samples/
// exclusions + factual source fields + one primary narrative + an optional
// distinct secondary + stable deterministic variant selection. No AI, no
// network calls, no expensive per-match processing (the zero-runtime-cost law
// — the engine reads from the SeoMatch fields already loaded by the three
// pre-existing awaits in buildMatchPage; zero new awaits, zero new KV reads,
// zero new fetches).
//
// The narrative is a SEPARATE editorial layer, DISTINCT from the answer
// sentence (matchAnswerSentence — the G-03 answer-first surface that feeds
// the meta description + the SportsEvent JSON-LD AND the visible briefing
// card, byte-frozen). The spec M3 gate note: "Keep answer-first context and
// facts table distinct; avoid repetition." The narrative variant templates
// carry ONLY the "why this matters" context (rivalry significance, derby
// heat, title-race implications, knockout-stage stakes, the featured-match
// framing) — they NEVER reference the kickoff time / venue / score (the
// answer sentence's domain), so the two layers never repeat each other.
//
// S08 DECISION POINTS (resolved + recorded for the execution log):
//
// 1. Registry home — a NEW module (this file). The composer purity law means
//    match-centre.ts cannot import it (the composer stays the S02 pure leaf);
//    the registry runs HERE, the pre-built narrative atom arrives at the
//    composer via the MatchSummaryInput projection (the S04 hero precedent —
//    pages.ts calls narrativeHtml and passes the pre-built string). The
//    worker-src.js harness gains "seo/narrative.ts" after "seo/match-centre.ts"
//    (the co-evolution law — the S02 comment already anticipated this).
//
// 2. Where the narrative renders — a distinct .mcentre-narrative element that
//    rides ABOVE the .mcentre-cols briefing|facts pairing inside the
//    mcentre-summary section. DOM order: narrative → pairing → result. This
//    keeps the answer sentence (briefing card, id="answer") distinct from the
//    narrative (the editorial context) and the facts table distinct. When no
//    narrative qualifies, the element is omitted (the no-empty-cards law —
//    the pairing + result still render, the S07 contract holds).
//
// 3. Primary + secondary structure — the engine returns a plan with up to two
//    narratives (primary + optional secondary). The primary is the highest-
//    priority ELIGIBLE category. The secondary is the next-highest DISTINCT
//    eligible category (never the same category). The secondary is NEVER
//    forced — it only renders when a distinct eligible category exists (spec
//    §5: "Display one primary storyline and optionally one distinct secondary
//    storyline. Never force a second").
//
// 4. Copy variants — each category carries a `variants` array (upcoming/live)
//    + a `variantsFinished` array (finished — past tense + significance). The
//    variant templates are Persian sentences with {placeholder} tokens filled
//    from the factual source fields. S08 seeds each category with the legacy
//    whyBigHtml sentence as variant[0] PLUS one additional variant (2 each —
//    enough to exercise + test the deterministic selection); S09 curates/
//    expands the copy ("Multiple natural Persian variants per supported
//    category") + does the editorial QA. The selection is deterministic: a
//    stable string hash (FNV-1a 32-bit, sync) of the match's canonical path
//    + the category id → a stable index. Same match + same category → same
//    variant, every visit (stable output across repeated calls — spec §5:
//    "wording must not randomly change between page visits").
//
// 5. Lifecycle eligibility — the 5 pre-match categories (rivalry, knockout-
//    stage, top-table, derby, big-club) are eligible across ALL three
//    lifecycles (the triggers are lifecycle-independent: rivalry fires
//    whenever m.rivalryFa, regardless of state). Upcoming/live matches use
//    the `variants` array (live = "retain the pre-match briefing; do not
//    regenerate frequently" — spec §5 — so live uses the SAME variants as
//    upcoming, no regeneration). Finished matches use the `variantsFinished`
//    array (past tense + the verified result's significance, stated defensibly
//    in the category's domain — the top-table finished variant states the
//    title-race significance; the knockout-stage finished variant states the
//    progression significance; NO score repetition — the answer sentence
//    already has the score). There is NO separate "finished-result" category
//    (it would risk repeating the answer sentence or fabricating significance);
//    the finished-tense variants of the pre-match categories handle the
//    "verified result and significance" entirely.
//
// 6. Factual source fields per category (the ZERO-runtime-cost law — these are
//    the EXACT fields whyBigHtml already read, already loaded by the three
//    pre-existing awaits; zero new data work):
//    - rivalry      → m.rivalryFa (the Persian rivalry name — El Clásico…)
//    - knockout-stage → m.roundFa + M.compNameFa(m) (the round + competition)
//    - top-table    → M.compNameFa(m) (the competition — both teams are top-3)
//    - derby        → (no field — the flag only; a named rivalry supersedes)
//    - big-club     → (no field — the featured-match flag, both teams followed)
//
// 7. Global priority ranking (highest → lowest): rivalry(1) > knockout-stage(2)
//    > top-table(3) > derby(4) > big-club(5). A named rivalry is the marquee
//    (highest); a knockout round is high-stakes; a top-table clash is the title
//    race; a derby is a heated local match; the big-club framing is the
//    featured-match fallback (lowest — the "concise factual editorial
//    paragraph if useful" from spec §5, fires only when no higher category
//    qualifies). The order is documented centrally here (spec §5: "Position in
//    a centrally defined editorial priority hierarchy") and must not override
//    fixture relevance or factual validity.
//
// NO-FABRICATION GUARD (spec §5: "No unsupported competitive stakes or
// fabricated statistics"): the variant templates carry ONLY the category's
// domain significance (rivalry/derby/top-table/knockout/featured) — they NEVER
// cite streak counts, win/loss tallies, standings positions (beyond the
// verified top-3 fact), or progression outcomes (which would need bracket data
// the pool does not carry). A match with no eligible category renders NO
// narrative (the no-empty-cards law + the "omit the briefing if no useful
// paragraph can be made" spec path — the briefing card + facts still render,
// the S07 contract holds).

import { esc } from "./utils";
import { compNameFa } from "./markup";
import { normalizeTeamName } from "../teams";
import { payloadTop3 } from "./data";
import type { SeoMatch, SeoCtx } from "./data";

// ---- the lifecycle states the engine distinguishes ----
// upcoming = scheduled (not live, not finished); live = IN_PLAY|LIVE|PAUSED
// (the narrative is RETAINED from upcoming — spec §5: "do not regenerate
// frequently"); finished = FINISHED (the verified result's significance rides
// the finished-tense variants). pages.ts computes the flag from sm.raw.status
// (the same gates the hero + the answer sentence use).
export type NarrativeLifecycle = "upcoming" | "live" | "finished";

// ---- the category registry ----
// Five categories, priority-ordered. Each defines an explicit deterministic
// trigger (returns the factual source fields if eligible, else null), the
// upcoming/live variants, and the finished variants (past tense + the
// defensible significance). The `variants` arrays carry Persian sentences with
// {placeholder} tokens the engine fills from the trigger's source fields.
export type NarrativeCategoryId =
  | "rivalry" | "knockout-stage" | "top-table" | "derby" | "big-club";

export interface NarrativeCategory {
  id: NarrativeCategoryId;
  priority: number;  // 1 = highest (the global ranking)
  // the trigger: (sm, top3) → the source fields if eligible, else null.
  // The top3 standings map is the only ctx-derived input (payloadTop3 — the
  // same helper pages.ts's isTopTable uses; zero new data work).
  trigger: (sm: SeoMatch, top3: Record<string, Set<string>>) => Record<string, string> | null;
  variants: string[];          // upcoming/live (pre-match framing)
  variantsFinished: string[];  // finished (past tense + the result's significance)
}

// The top-table eligibility helper — mirrors pages.ts's isTopTable (both teams
// in the top-3 of their competition's standings). Exported for the test
// harness + for pages.ts to reuse if it ever drops the dead whyBigHtml
// reference. Pure: reads only the already-loaded top3 map + the team names.
export function topTableEligible(m: any, top3: Record<string, Set<string>>): boolean {
  const set = top3[m.competition && m.competition.code];
  if (!set) return false;
  return set.has(normalizeTeamName(m.homeTeam.name)) && set.has(normalizeTeamName(m.awayTeam.name));
}

// The knockout-stage round detector — the same regex the legacy whyBigHtml
// used (فینال / نهایی / یک‌چهارم / نیمه). A round matching this is a
// knockout-stage match (high stakes — the result decides progression).
const KNOCKOUT_ROUND_RE = /فینال|نهایی|یک‌چهارم|نیمه/;

// The central registry — priority order (1 → 5). The order is the global
// editorial priority hierarchy (spec §5); it is documented HERE and nowhere
// else. A later session may extend the registry (streaks / form reversal /
// relegation — spec §5's "Possible categories") by appending entries with
// their own priority slots; the engine picks the highest-priority eligible
// regardless of registry length.
export const NARRATIVE_CATEGORIES: NarrativeCategory[] = [
  {
    id: "rivalry",
    priority: 1,
    // a NAMED rivalry (El Clásico, Der Klassiker…) — the marquee. Source: the
    // Persian rivalry name (m.rivalryFa). A named rivalry supersedes a bare
    // derby (the derby category's trigger gates on !rivalryFa — see below).
    trigger: (sm) => {
      const r = sm.s.rivalryFa;
      return r ? { rivalry: String(r) } : null;
    },
    variants: [
      "این دیدار «{rivalry}» است — یکی از حساس‌ترین بازی‌های فوتبال جهان.",
      "دربارهٔ «{rivalry}»: دیداری تاریخی میان دو حریف همیشه‌جدی که هیجان هر فصل را چند برابر می‌کند."
    ],
    variantsFinished: [
      "این دیدار «{rivalry}» بود — یکی از حساس‌ترین بازی‌های فوتبال جهان که به پایان رسید.",
      "«{rivalry}» به پایان رسید؛ دیداری تاریخی میان دو حریف همیشه‌جدی."
    ]
  },
  {
    id: "knockout-stage",
    priority: 2,
    // a knockout-stage round (final / semi / quarter). Source: the round name
    // + the competition name. The significance: the result decides progression
    // (high stakes) — stated defensibly (the round is a verified fact; the
    // progression outcome is NOT claimed, only the stakes).
    trigger: (sm) => {
      const round = sm.s.roundFa || "";
      return KNOCKOUT_ROUND_RE.test(round) ? { round, comp: compNameFa(sm.s) } : null;
    },
    variants: [
      "این بازی در مرحله {round} {comp} برگزار می‌شود — مرحله‌ای حذفی با شرط صعود.",
      "مرحله {round} {comp}: برد می‌ماند، باخت کنار می‌رود."
    ],
    variantsFinished: [
      "این بازی در مرحله {round} {comp} برگزار شد — مرحله‌ای حذفی که شرط صعود را تعیین کرد.",
      "مرحله {round} {comp} به پایان رسید؛ نتیجه مسیر صعود را روشن کرد."
    ]
  },
  {
    id: "top-table",
    priority: 3,
    // both teams in the top-3 of their competition's standings (the title
    // race). Source: the competition name. The significance: the result
    // affects the title race (defensible — both top-3 is a verified fact).
    // Supersedes big-club (the big-club trigger gates on !topTable).
    trigger: (sm, top3) => topTableEligible(sm.s, top3) ? { comp: compNameFa(sm.s) } : null,
    variants: [
      "هر دو تیم هم‌اکنون در صدر جدول {comp} قرار دارند؛ برد این بازی در رقابت عنوان اهمیت دارد.",
      "دو تیم صدرنشین {comp} روبروی هم — بردی که می‌تواند مسیر قهرمانی را تغییر دهد."
    ],
    variantsFinished: [
      "هر دو تیم در صدر جدول {comp} قرار داشتند؛ این نتیجه رقابت عنوان را تحت تأثیر قرار می‌دهد.",
      "دیدار دو صدرنشین {comp} به پایان رسید؛ نتیجه در رقابت قهرمانی سنجیده می‌شود."
    ]
  },
  {
    id: "derby",
    priority: 4,
    // a bare derby (m.derby) — a heated local match. NO named rivalry (a named
    // rivalry takes the rivalry category instead; the !rivalryFa gate keeps
    // the two mutually exclusive). No source field (the flag only).
    trigger: (sm) => (sm.s.derby && !sm.s.rivalryFa) ? {} : null,
    variants: [
      "این بازی یک دربی است؛ دیداری حساس بین دو حریف همیشه‌جدی.",
      "دربی شهر — دو حریف همیشه‌جدی که هیچ بازی کم‌اهمیت‌ای ندارند."
    ],
    variantsFinished: [
      "این بازی یک دربی بود؛ دیداری حساس بین دو حریف همیشه‌جدی که به پایان رسید.",
      "دربی به پایان رسید؛ دو حریف همیشه‌جدی و یک نتیجه ثبت‌شده."
    ]
  },
  {
    id: "big-club",
    priority: 5,
    // the featured-match fallback (m.big — both teams are SportSignal followed
    // clubs, the v13.179 hero AND rule). Lowest priority — the "concise
    // factual editorial paragraph if useful" (spec §5) that fires only when no
    // higher category qualifies. Gates on !topTable (a top-table clash takes
    // the top-table category instead — the featured-match framing is redundant
    // when the title race is on the line). No source field (the flag only).
    trigger: (sm, top3) => (sm.s.big && !topTableEligible(sm.s, top3)) ? {} : null,
    variants: [
      "هر دو تیم جزو تیم‌های منتخب و پرطرفدار SportSignal هستند.",
      "دیدار دو تیم منتخب SportSignal — تیم‌هایی که بازی‌هایشان به‌طور خودکار دنبال می‌شود."
    ],
    variantsFinished: [
      "هر دو تیم جزو تیم‌های منتخب و پرطرفدار SportSignal بودند؛ دیدار آن‌ها به پایان رسید.",
      "دیدار دو تیم منتخب SportSignal به پایان رسید؛ بازی‌های این تیم‌ها همیشه دنبال می‌شود."
    ]
  }
];

// ---- the deterministic variant selection ----
// A stable, sync string hash (FNV-1a 32-bit) of the stable key → modulo the
// variant count. The stable key is the match's canonical path (sm.s.path —
// derived from the team names + utcDate, already computed by pubMatch, never
// changes) + the category id. Same match + same category → same index, every
// visit (spec §5: "wording must not randomly change between page visits").
// Zero cost: integer math, no crypto, no allocation beyond the char loop.
export function deterministicVariantIndex(stableKey: string, count: number): number {
  if (count <= 1) return 0;
  let h = 0x811c9dc5;
  for (let i = 0; i < stableKey.length; i++) {
    h ^= stableKey.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h % count;
}

// The stable key for a match + category: the canonical path + the category id.
// The path is the match's permanent URL slug (team names + utcDate); a category
// is a fixed id. Both are immutable for a given match → the key is stable.
function stableKey(sm: SeoMatch, categoryId: NarrativeCategoryId): string {
  const p = sm.s && sm.s.path;
  return (p || "") + "|" + categoryId;
}

// Fill a variant template's {placeholder} tokens with the escaped source
// fields. Unknown tokens resolve to "" (fail-closed — never a literal
// "{field}" in the output). The fields are escaped HERE (the variant
// templates are plain Persian prose; the engine does the escaping so the
// atom arrives pre-escaped at the composer — the S04 hero precedent).
function fillTemplate(tpl: string, fields: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_m, k: string) => esc(fields[k] || ""));
}

// One selected narrative — the category id + the resolved (escaped) Persian
// sentence. The text is the filled variant template (pre-escaped, ready for
// the DOM).
export interface NarrativeSelection {
  categoryId: NarrativeCategoryId;
  text: string;
}

// The narrative plan — at most one primary + one optional distinct secondary.
// `null` primary → no narrative qualifies (narrativeHtml returns "" — the
// element is omitted, the no-empty-cards law). The secondary is NEVER forced:
// it is null when fewer than two distinct categories are eligible.
export interface NarrativePlan {
  primary: NarrativeSelection | null;
  secondary: NarrativeSelection | null;
}

// Pick the variant for one eligible category under a lifecycle. Finished
// matches use variantsFinished (past tense + significance); upcoming/live use
// variants (live = retained upcoming — no regeneration). If a category ever
// carries no variantsFinished (not the case today — all five define both), it
// falls back to the upcoming variants (the pre-match briefing retained — spec
// §5 finished: "verified result and significance when data exists" degrades to
// the retained briefing when no finished-tense copy is authored).
function selectVariant(
  cat: NarrativeCategory,
  fields: Record<string, string>,
  sm: SeoMatch,
  lifecycle: NarrativeLifecycle
): NarrativeSelection {
  const pool = lifecycle === "finished" && cat.variantsFinished.length
    ? cat.variantsFinished
    : cat.variants;
  const idx = deterministicVariantIndex(stableKey(sm, cat.id), pool.length);
  return { categoryId: cat.id, text: fillTemplate(pool[idx], fields) };
}

// The narrative plan — the engine's core. Walks the registry in priority
// order, collects the eligible categories (trigger returns non-null), and
// picks the primary (highest-priority eligible) + the optional secondary (the
// next-highest DISTINCT eligible — never the same category, never forced).
// Returns { primary: null, secondary: null } when no category qualifies (the
// no-empty-cards law — the narrative element is omitted, the briefing|facts
// pairing still renders, the S07 contract holds).
export function narrativePlan(sm: SeoMatch, ctx: SeoCtx, lifecycle: NarrativeLifecycle): NarrativePlan {
  const top3 = payloadTop3(ctx.payload);
  const eligible: { cat: NarrativeCategory; fields: Record<string, string> }[] = [];
  for (const cat of NARRATIVE_CATEGORIES) {
    const fields = cat.trigger(sm, top3);
    if (fields) eligible.push({ cat, fields });
  }
  if (!eligible.length) return { primary: null, secondary: null };
  const primary = selectVariant(eligible[0].cat, eligible[0].fields, sm, lifecycle);
  const secondaryEntry = eligible.length > 1 ? eligible[1] : null;
  const secondary = secondaryEntry
    ? selectVariant(secondaryEntry.cat, secondaryEntry.fields, sm, lifecycle)
    : null;
  return { primary, secondary };
}

// The pre-built narrative HTML atom — the `.mcentre-narrative` element the
// composer slots ABOVE the .mcentre-cols briefing|facts pairing. Returns "" when
// no narrative qualifies (the no-empty-cards law). The primary rides as a
// `<p class="mcentre-nar-primary">`; the optional secondary as a smaller
// `<p class="mcentre-nar-secondary">` below it. The markup is built HERE (the
// engine is the projection layer — the atom arrives pre-built at the composer,
// which stays the S02 pure leaf; the narrative markup is trivial — a div +
// 1–2 p elements — so building it in the engine is consistent with pages.ts's
// matchHeroInput atoms being pre-built HTML strings).
export function narrativeHtml(sm: SeoMatch, ctx: SeoCtx, lifecycle: NarrativeLifecycle): string {
  const plan = narrativePlan(sm, ctx, lifecycle);
  if (!plan.primary) return "";
  let out = '<div class="mcentre-narrative">';
  out += '<p class="mcentre-nar-primary">' + plan.primary.text + "</p>";
  if (plan.secondary) {
    out += '<p class="mcentre-nar-secondary">' + plan.secondary.text + "</p>";
  }
  out += "</div>";
  return out;
}
