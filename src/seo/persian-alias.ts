// SportSignal — SEO-only Persian club-alias query normalization
// (PERSIAN-CLUB-ALIAS-SEO-SPEC §7.3/§8, 2026-11-19).
//
// ONE purpose: given a raw Persian SEARCH QUERY, resolve the club entity it
// names — or return null when the query is ambiguous or names no selected
// club. It is the ambiguity-guard layer the spec §7.3 demands («a
// normalization function must not map ambiguous short strings globally
// without context»).
//
// THE SEPARATION LAW (spec §8 "Important separation"): this module NEVER
// touches provider identity. It does not import fa-dict, it does not feed
// translateTeam, it does not join fixture matching, it never changes
// normTeamKey/normAlias consumers. SEO alias handling stays separate from
// provider identity normalization. It reads the SAME alias evidence table
// team-names.ts carries (via a tiny re-declared local map — a shared import
// would couple the SEO layers; the values are co-reviewed in the
// check-seo-persian-alias.js gate so they can never drift).
//
// RESOURCE LAW (spec §13): zero KV, zero fetches, zero subrequests — a
// static typed map + pure functions; built once per isolate, O(1) lookups.
// NO query router, NO new URLs, NO doorway pages: resolving returns the
// EXISTING canonical team URL (slugs.ts TEAM_SLUGS-derived, verified against
// the live provider-derived slugs) — one club, one canonical destination
// (spec §7.1).
//
// THE AMBIGUITY LAW (spec §7.3): the bare ambiguous strings — «اینتر»,
// «میلان», «منچستر», «پاریس», «اتلتیکو» — NEVER resolve on their own.
// They resolve ONLY when the query carries a disambiguating qualifier:
//   «اینتر» + «میلان»/«میلانو»-compound or a competition phrase (لیگ
//   قهرمانان) + the entity context the map's own GSC rows exhibit;
//   «میلان» alone stays unresolved (the city + the Inter compound);
//   «منچستر» resolves ONLY with سیتی/یونایتد;
//   «پاریس» resolves ONLY with ژرمن;
//   «اتلتیکو» resolves ONLY with مادرید.
// Unresolved is an explicit result, never a guess (spec §7.3: «leave the
// query unresolved rather than assigning the wrong club»).

/** The resolved club entity — the canonical identity + its EXISTING URL. */
export interface AliasResolution {
  /** The canonical internal club id (the normTeamKey form of the provider name). */
  clubId: string;
  /** The canonical provider name (the allowlist spelling). */
  clubName: string;
  /** The canonical Persian display name (the fa-dict/SEO spelling — frozen). */
  faName: string;
  /** The EXISTING canonical team URL path (never a new alias slug). */
  url: string;
  /** Which surfaced form the query used (canonical or alias). */
  matchedForm: string;
}

// The alias table — clubId → the accepted query forms (canonical + the
// evidence-cited aliases). Mirrors SEO_EXTRA_ALIASES in team-names.ts (the
// JSON-LD layer) + the canonical fa-dict spellings; co-gated so they cannot
// drift. Every alias cites its evidence in team-names.ts + the additive
// research CSV (seo-implementation/keyword-research/
// ALIAS-KEYWORD-RESEARCH-2026-11-19.csv).
const CLUB_ALIAS_FORMS: Record<string, { name: string; fa: string; url: string; forms: string[] }> = {
  barcelona: { name: "FC Barcelona", fa: "بارسلونا", url: "/teams/barcelona", forms: ["بارسلونا", "بارسا"] },
  realmadrid: { name: "Real Madrid CF", fa: "رئال مادرید", url: "/teams/real-madrid", forms: ["رئال مادرید", "رئال"] },
  bayernmunich: { name: "FC Bayern München", fa: "بایرن مونیخ", url: "/teams/bayern-munich", forms: ["بایرن مونیخ", "بایرن"] },
  manchestercity: { name: "Manchester City FC", fa: "منچسترسیتی", url: "/teams/manchester-city", forms: ["منچسترسیتی", "منچستر سیتی", "من سیتی"] },
  arsenal: { name: "Arsenal FC", fa: "آرسنال", url: "/teams/arsenal", forms: ["آرسنال", "ارسنال"] },
  liverpool: { name: "Liverpool FC", fa: "لیورپول", url: "/teams/liverpool", forms: ["لیورپول"] },
  intermilan: { name: "FC Internazionale Milano", fa: "اینتر میلان", url: "/teams/internazionale-milano", forms: ["اینتر میلان", "اینترمیلان"] },
  acmilan: { name: "AC Milan", fa: "آ.ث میلان", url: "/teams/ac-milan", forms: ["آ.ث میلان", "آث میلان"] },
  parissaintgermain: { name: "Paris Saint-Germain", fa: "پاری سن ژرمن", url: "/teams/paris-saint-germain", forms: ["پاری سن ژرمن", "پاریسن ژرمن", "پی‌اس‌جی"] },
  manchesterunited: { name: "Manchester United FC", fa: "منچستر یونایتد", url: "/teams/manchester-united", forms: ["منچستر یونایتد"] },
  borussiadortmund: { name: "Borussia Dortmund", fa: "دورتموند", url: "/teams/borussia-dortmund", forms: ["دورتموند", "بروسیا دورتموند"] },
  atleticomadrid: { name: "Club Atlético de Madrid", fa: "اتلتیکو مادرید", url: "/teams/club-atletico-de-madrid", forms: ["اتلتیکو مادرید"] },
  chelsea: { name: "Chelsea FC", fa: "چلسی", url: "/teams/chelsea", forms: ["چلسی"] }
};

// The AMBIGUOUS bare strings — never resolved alone (spec §7.3). Each maps
// to the qualifier words/phrases that unlock it (all still must name ONE
// club). Competition context is a valid disambiguator ONLY where the
// competition is continental-exclusive: «لیگ قهرمانان اروپا» (the UEFA
// Champions League) is European-only — Inter Miami cannot appear in it —
// so «اینتر در لیگ قهرمانان اروپا» resolves to Inter Milan (the validated
// keyword map targets that exact autocomplete row at
// /teams/internazionale-milano; spec §7.3 lists competition context among
// the preferred disambiguators). «لیگز کاپ» (Leagues Cup — Inter Miami's
// actual competition, EVIDENCE-LOG A2) unlocks nothing.
const AMBIGUOUS_QUALIFIERS: Record<string, { qualifiers: string[]; clubId: string }> = {
  // «اینتر» alone: Inter Miami / اینترنت collisions (EVIDENCE-LOG A2).
  // Unlocked by the «میلان»/«میلانو» compound OR the European-only UCL
  // phrase. A generic cup phrase unlocks NOTHING (Inter Miami plays cups
  // too — the «لیگز کاپ» autocomplete row).
  "اینتر": { qualifiers: ["میلان", "میلانو", "لیگ قهرمانان اروپا"], clubId: "intermilan" },
  // «میلان» alone: the city + the Inter compound → unresolved. The A.C.
  // qualifier («آ.ث»/«آث») unlocks AC Milan.
  "میلان": { qualifiers: ["آ.ث", "آث", "ای سی"], clubId: "acmilan" },
  // «منچستر» alone: City vs United → unresolved.
  "منچستر": { qualifiers: ["سیتی", "یونایتد"], clubId: null as any },
  // «پاریس» alone: the city vs PSG → resolved ONLY with «ژرمن» (any of the
  // observed compound spellings; the fold handles the joined forms).
  "پاریس": { qualifiers: ["ژرمن"], clubId: "parissaintgermain" },
  // «اتلتیکو» alone: Atlético Madrid vs Athletic Bilbao («اتلتیک») →
  // resolved ONLY with «مادرید».
  "اتلتیکو": { qualifiers: ["مادرید"], clubId: "atleticomadrid" }
};

/**
 * The Persian text normalizer for QUERY-side comparison (spec §8 "Text
 * normalization"). Folds, never over-folds:
 *   - Arabic ي/ك → Persian ی/ک (the shared keyboard-variant fold);
 *   - ZWNJ (U+200C) → ordinary space, then repeated whitespace → one space;
 *   - strip leading/trailing whitespace;
 *   - Persian/Arabic-Indic digits → Latin (affects query matching only).
 * It does NOT fold distinct letters, does NOT remove diacritics that carry
 * identity, and does NOT merge distinct club words: «اتلتیکو» and «اتلتیک»
 * stay distinct strings (the Bilbao/Madrid trap), «بروسیا» and «بوروسیا»
 * stay distinct (deferred variants never auto-fold onto the accepted one).
 * The RAW query is preserved by the caller for research records; this key
 * is an internal comparison form only.
 */
export function normPersianQuery(q: string): string {
  let s = String(q || "");
  s = s
    .replace(/\u064A/g, "\u06CC") // Arabic yeh → Persian yeh
    .replace(/\u0643/g, "\u06A9") // Arabic kaf → Persian kaf
    .replace(/\u200C/g, " ")      // ZWNJ → space
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // Arabic-Indic digits
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0)); // Persian digits
  return s.replace(/\s+/g, " ").trim();
}

// The internal comparison key: the normalized query with punctuation and
// dots removed (so «آ.ث میلان» and «آث میلان» share a key — the spec §8
// punctuation fold — but ONLY inside this comparison layer).
function persianKey(q: string): string {
  return normPersianQuery(q)
    .replace(/[.\u06D4\u064B-\u0652]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// The reverse lookup: comparison-key → { clubId, form } for every ACCEPTED
// form (canonical + aliases). Built once per isolate (a module-level lazy
// map — pure static data, zero per-request cost).
let keyIndex: Map<string, { clubId: string; form: string }> | null = null;
function indexForms(): Map<string, { clubId: string; form: string }> {
  if (keyIndex) return keyIndex;
  const m = new Map<string, { clubId: string; form: string }>();
  for (const clubId in CLUB_ALIAS_FORMS) {
    const entry = CLUB_ALIAS_FORMS[clubId];
    for (const form of entry.forms) {
      m.set(persianKey(form), { clubId, form });
    }
  }
  keyIndex = m;
  return m;
}

/**
 * Resolve a raw Persian query to ONE canonical club entity — or null.
 *
 * Resolution order (the ambiguity law):
 *   1. The whole normalized query EQUALS an accepted form (canonical or
 *      alias) — the unambiguous full-name/alias match.
 *   2. A CONTAINED accepted form (the natural-language phrasings: «بازی
 *      بعدی بارسا», «ساعت بازی بارسلونا امشب») — longest form wins (so
 *      «منچستر سیتی» beats a bare «منچستر» scan; «اینتر میلان» beats
 *      «اینتر»).
 *   3. A bare AMBIGUOUS string — ONLY when its qualifier appears elsewhere
 *      in the query («پاریس … ژرمن» → PSG; «منچستر … سیتی» → City). The
 *      ambiguous string alone NEVER resolves.
 * Null otherwise. One club, one existing canonical URL, every time.
 */
export function resolvePersianClubQuery(q: string): AliasResolution | null {
  const norm = normPersianQuery(q);
  if (!norm) return null;
  const key = persianKey(norm);
  const idx = indexForms();

  // 1. Exact full-query match.
  const exact = idx.get(key);
  if (exact) return build(exact.clubId, exact.form);

  // 2. Contained accepted form — longest match first (sort the candidate
  // forms by length so «منچستر سیتی» outranks a shorter overlapping form).
  const candidates: { clubId: string; form: string; at: number }[] = [];
  for (const [k, v] of idx) {
    const at = key.indexOf(k);
    if (at >= 0) candidates.push({ ...v, at });
  }
  if (candidates.length) {
    candidates.sort((a, b) => b.form.length - a.form.length);
    const best = candidates[0];
    // Two different clubs BOTH contained (e.g. «بازی بارسا با بایرن» — a
    // matchup query, not a club-page query) → NOT a single-club resolution.
    // Matchup queries resolve by the fixture pair (spec §5.5/§7.2), never
    // by picking one club's page. Return null for the single-entity path.
    const distinct = new Set(candidates.map((c) => c.clubId));
    if (distinct.size === 1) return build(best.clubId, best.form);
    return null;
  }

  // 3. The ambiguous bare string + its qualifier.
  for (const amb in AMBIGUOUS_QUALIFIERS) {
    const keyAmb = persianKey(amb);
    if (key.indexOf(keyAmb) < 0) continue;
    const rule = AMBIGUOUS_QUALIFIERS[amb];
    for (const qual of rule.qualifiers) {
      if (key.indexOf(persianKey(qual)) >= 0) {
        // «منچستر» + qualifier: the qualifier word itself decides the club
        // (سیتی → City, یونایتد → United) — re-resolve through the
        // full-form index («منچستر سیتی»/«منچستر یونایتد» are accepted
        // forms; the GSC evidence: every «منچستر…» row carries the full
        // club word).
        if (!rule.clubId) {
          const full = idx.get(persianKey(amb + " " + qual));
          if (full) return build(full.clubId, full.form);
          continue;
        }
        const hit = idx.get(persianKey(rule.clubId === "parissaintgermain" ? "پاری سن ژرمن" : amb + " " + qual));
        if (hit) return build(hit.clubId, hit.form);
        // «پاریس» + «ژرمن»: the accepted full form «پاری سن ژرمن» may itself
        // be split across the query; the PSG entry resolves directly.
        const direct = CLUB_ALIAS_FORMS[rule.clubId];
        if (direct) return build(rule.clubId, amb);
      }
    }
  }
  return null;
}

function build(clubId: string, matchedForm: string): AliasResolution {
  const e = CLUB_ALIAS_FORMS[clubId];
  return { clubId, clubName: e.name, faName: e.fa, url: e.url, matchedForm };
}

/**
 * The fixture-resolution predicate for MATCHUP queries (spec §5.5/§7.2):
 * does the query name BOTH clubs of a REAL, covered fixture? Returns the
 * resolved pair ONLY when both sides resolve unambiguously to two DISTINCT
 * clubs — the caller (research/analysis tooling) then matches the pair +
 * date against the pool's canonical participants (the eligibility law —
 * this module never creates or guesses fixture URLs; the match URL comes
 * from the existing matchPath() on the real fixture).
 */
export function resolvePersianMatchupPair(q: string): { home: AliasResolution; away: AliasResolution } | null {
  const norm = normPersianQuery(q);
  if (!norm) return null;
  const key = persianKey(norm);
  const idx = indexForms();
  // Collect every accepted form contained in the query, with its position.
  const hits: { clubId: string; form: string; at: number; end: number }[] = [];
  for (const [k, v] of idx) {
    const at = key.indexOf(k);
    if (at >= 0) hits.push({ ...v, at, end: at + k.length });
  }
  if (hits.length < 2) return null;
  // QUERY-ORDER contract: the FIRST-mentioned club is `home` (the caller
  // matches the pair against the real fixture's participants; the fixture's
  // own homeTeam decides the final URL via the existing matchPath()).
  // Overlapping hits for the same position (a form and its substring, e.g.
  // «اینتر میلان» vs the «میلان» inside it) collapse to the LONGEST form.
  hits.sort((a, b) => a.at - b.at || b.end - a.end);
  const first = hits[0];
  let second = null;
  for (const h of hits) {
    if (h.clubId === first.clubId) continue;
    // skip hits that overlap the first club's span (the substring trap:
    // «میلان» inside «اینتر میلان» is not a second club)
    if (h.at < first.end && h.end > first.at) continue;
    if (!second || h.at < second.at) second = h;
  }
  if (!second) return null;
  return { home: build(first.clubId, first.form), away: build(second.clubId, second.form) };
}

export const PERSIAN_ALIAS_CLUBS = CLUB_ALIAS_FORMS;
