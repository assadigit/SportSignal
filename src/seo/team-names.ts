// SportSignal — SEO-only team-name overrides (S1 M2, the F3 spelling fix).
//
// The 2026-11-10 GSC audit (docs/audits/2026-11-10-gsc-audit.md, F3) found
// that searchers spell three clubs differently from the site dictionary
// (src/fa-dict.ts): the mismatch cost ~800 impressions in 4 weeks (Leipzig
// 337, Nordsjaelland 275, Roma 210). This map changes ONLY what the SEO
// pages render — titles, H1, meta descriptions, answer sentences, visible
// page text and JSON-LD alternateName — so pages match what people type
// while showing the dictionary spelling once in visible text.
//
// THE SCOPE LAW (plan §8 M2): the bot, the Telegram SVG cards and the
// digests keep the dictionary spelling. They render from src/fa-dict.ts via
// translateTeam and never import this module. Never move these overrides
// into fa-dict.ts — the display surfaces must stay byte-identical.
//
// S11 (Persian entity naming/metadata polish, 2026-11-17): the
// SEO_EXTRA_ALIASES map carries ADDITIONAL Persian alternateName aliases —
// the GSC-observed short-form / variant spellings the GSC-AUDIT-BASELINE
// surfaces for selected clubs that are NOT already in the override layer.
// The aliases ride the JSON-LD alternateName array ONLY (machine-readable,
// invisible to the SERP snippet) — the visible faName / SEO name bytes
// stay byte-identical (the Dec 4-8 freeze holds). The S-05 no-invented-data
// rule holds: every alias has GSC evidence (the impression count + the query
// string are recorded in the per-alias comment).

import { normTeamKey } from "../teams";

export interface SeoTeamNameOverride {
  /** The spelling searchers type — the SEO-visible name. */
  fa: string;
  /** The site's dictionary spelling — shown once in visible page text. */
  alt: string;
}

// Keys are normTeamKey() forms of the provider names (club-prefix tokens
// are stripped, so "AS Roma" and "Roma" both key to "roma"; the bare-city
// variants ride along so provider naming differences cannot dodge the fix).
const SEO_TEAM_NAME_OVERRIDES: Record<string, SeoTeamNameOverride> = {
  // Searchers type «لایپزیگ» / «آربی لایپزیگ»; the dict says «لایپزیش».
  rbleipzig: { fa: "لایپزیگ", alt: "لایپزیش" },
  leipzig: { fa: "لایپزیگ", alt: "لایپزیش" },
  // Searchers type «نورشلان»; the dict says «نوردشیلند». Two keys: the ASCII
  // provider form ("Nordsjaelland" → nordsjaelland) and the æ form
  // ("FC Nordsjælland" — normTeamKey strips æ entirely → nordsjlland).
  nordsjaelland: { fa: "نورشلان", alt: "نوردشیلند" },
  nordsjlland: { fa: "نورشلان", alt: "نوردشیلند" },
  // «رم» stays the visible name; searchers also write «آ س رم» — alt only.
  roma: { fa: "رم", alt: "آ س رم" }
};

// S11: ADDITIONAL Persian alternateName aliases for selected clubs — the
// GSC-observed short-form / variant spellings the audit surfaced that are
// NOT already in SEO_TEAM_NAME_OVERRIDES. The aliases ride the JSON-LD
// alternateName array ONLY (machine-readable) — the visible faName / SEO
// name bytes stay byte-identical (the Dec 4-8 freeze holds). Every entry
// carries its GSC evidence (the impression count + the query string from
// GSC-AUDIT-BASELINE.md — the S-05 no-invented-data rule holds).
//
// Keys are normTeamKey() forms of the provider names. normTeamKey folds the
// known provider variants ("FC Barcelona" → "fcbarcelona"; the bare "Barcelona"
// → "barcelona") so the alias resolves for every provider spelling.
//
// PERSIAN-CLUB-ALIAS-SEO (2026-11-19, the additive extension): the map grew
// from the 1-club S11 seed to the evidenced 13-club alias dictionary. The
// SAME laws hold — every entry cites its evidence in the per-alias comment
// (the additive research file: seo-implementation/keyword-research/
// ALIAS-KEYWORD-RESEARCH-2026-11-19.csv, generated from the EXISTING
// VALIDATED-KEYWORD-MAP.csv — never overwritten); ambiguous short strings
// (اینتر/میلان/منچستر/پاریس/اتلتیکو) NEVER ride as a global normalization
// key — an entity-scoped alternateName on the ONE canonical entity is
// context-safe (schema.org alternateName is entity metadata, not a query
// router); the canonical visible name stays the PRIMARY name byte.
const SEO_EXTRA_ALIASES: Record<string, string[]> = {
  // GSC-AUDIT-BASELINE.md (the 2026-11-15 export) row:
  //   «بازی بعدی بارسا» — 0 clicks / 179 impressions / avg pos 9.97
  // Searchers type the short form «بارسا» (Barça) for FC Barcelona; the
  // dict + the SEO-visible name carry «بارسلونا» (the full name). The
  // short form rides the alternateName JSON-LD array so the entity is
  // reachable by either query form (the S1 M2 alternateName discipline,
  // extended to the GSC-observed short form for a non-overridden club).
  // The visible faName/SEO name bytes are byte-frozen — only the JSON-LD
  // alternateName gains the alias (the Dec 4-8 freeze holds).
  fcbarcelona: ["بارسا"],
  barcelona: ["بارسا"],
  // Real Madrid — «رئال» (GSC: «بازی رئال بعدی» 1 impr + «تاریخ بازی ارسنال
  // و رئال» 3 impr + «بازی رئال و آرسنال کی است» 1 impr, 2026-11-15 export;
  // every row carries club context). Entity-scoped alternateName only — the
  // bare «رئال» is never a global key (autocomplete: رئال بتیس/سوسیداد
  // collisions — EVIDENCE-LOG A2 language-intent note).
  realmadrid: ["رئال"],
  // Bayern — «بایرن» (GSC: «بازی بعدی بایرن» 16 impr avg pos 7.94 +
  // «برنامه بازی بایرن» 4 impr, 2026-11-15 export). The strongest
  // non-Barcelona short form in the team-page cluster.
  bayernmunich: ["بایرن"],
  bayernmunchen: ["بایرن"],
  // Manchester City — «من سیتی» (GSC: «بازی بعدی من سیتی» 2 impr avg pos 6)
  // + the separated spelling «منچستر سیتی» (7 rows / 286 impr incl.
  // «بارسلونا مقابل منچستر سیتی ۲۰۲۶» 103 impr, 2026-11-15 export). The
  // dict spelling «منچسترسیتی» stays the canonical VISIBLE name byte.
  manchestercity: ["من سیتی", "منچستر سیتی"],
  // Arsenal — «ارسنال» without the madda (GSC: «بازی بعدی ارسنال» 10 impr +
  // «تاریخ بازی ارسنال و رئال» 3 impr, 2026-11-15 export). The canonical
  // visible name «آرسنال» keeps the madda (the dict byte).
  arsenal: ["ارسنال"],
  // Liverpool — no distinct evidenced alias («لیورپول» IS the canonical
  // name; 4 GSC rows / 36 impr all use it). No entry — nothing to alias.
  // Inter Milan — «اینتر» is AMBIGUOUS (EVIDENCE-LOG A2: the autocomplete
  // head «بازی بعدی اینتر» completes to اینتر میامی / اینترنت before
  // اینترمیلان) and «اینترمیلان» is the GSC-observed joined form
  // («بازی بعدی اینترمیلان» 22 impr avg pos 8.82 + «بازی بعدی اینتر» 22
  // impr — both already target /teams/internazionale-milano). Both ride as
  // entity-scoped alternateName values of the Inter Milan entity ONLY — a
  // schema.org alternateName never claims the bare string globally (the
  // entity IS the disambiguator; the ambiguity guard lives in the
  // query-normalization layer, never here).
  internazionalemilano: ["اینتر", "اینترمیلان"],
  intermilan: ["اینتر", "اینترمیلان"],
  // AC Milan — «میلان» is AMBIGUOUS (the city; also the substring of
  // «اینترمیلان»). GSC: «بازی بعدی میلان» 6 impr + «بازی میلان» 1 impr
  // (both target /teams/ac-milan). Entity-scoped alternateName only.
  milan: ["میلان"],
  // PSG — «پی‌اس‌جی» (GSC: «لو آور مقابل پی‌اس‌جی» 16 impr, 2026-11-15
  // export) + «پاریسن ژرمن» (autocomplete: «ساعت بازی بارسلونا و پاریسن
  // ژرمن», EVIDENCE-LOG A2 fa/IR 2026-11-16 — a real Google-returned joined
  // misspelling; a normalization INPUT, never preferred copy). The bare
  // «پاریس» is NEVER listed (city/club ambiguity — the map's «پاریس…» rows
  // all carry the ژرمن qualifier).
  parissaintgermain: ["پی‌اس‌جی", "پاریسن ژرمن"],
  // Borussia Dortmund — the full transliteration «بروسیا دورتموند»
  // (GSC: «بروسیا دورتموند مقابل رئال بتیس» 11 impr; the canonical VISIBLE
  // name is «دورتموند» per fa-dict). «بوروسیا دورتموند» (the other common
  // transliteration) has ZERO rows in the current exports — deferred, NOT
  // enabled (the no-invented-data rule).
  borussiadortmund: ["بروسیا دورتموند"]
  // Chelsea / Liverpool / Atlético / Manchester United — NO extra aliases:
  // «چلسی»/«لیورپول» ARE the canonical names with no evidenced variants;
  // «اتلتیکو» (4 impr, always as «اتلتیکو مادرید») and «من یونایتد» /
  // «منچستریونایتد» (0 direct rows) stay deferred pending evidence. The
  // bare «منچستر» is NEVER an alias (City/United ambiguity — every GSC row
  // carries the full club word).
};

/**
 * The SEO-visible Farsi name for a team row ({name, faName}): the override
 * when one exists, else the row's own faName/name (the dictionary value —
 * byte-identical to pre-M2 pages for every team not in the map).
 */
export function seoTeamFaName(t: any): string {
  if (t && t.name) {
    const o = SEO_TEAM_NAME_OVERRIDES[normTeamKey(t.name)];
    if (o) return o.fa;
  }
  return String((t && (t.faName || t.name)) || "");
}

/**
 * The alternate (dictionary) spelling to show ONCE in visible page text —
 * null when the team has no override, so those pages render exactly as
 * before (change hygiene: untouched pages stay byte-identical).
 */
export function seoTeamAltName(t: any): string | null {
  if (!t || !t.name) return null;
  const o = SEO_TEAM_NAME_OVERRIDES[normTeamKey(t.name)];
  return o ? o.alt : null;
}

/**
 * JSON-LD alternateName list for a team: the SEO name first, the alternate,
 * then the row's own faName when it differs — every spelling the page is
 * reachable by, all real (the S-05 no-invented-data rule holds).
 *
 * S11: the list ALSO appends the GSC-observed short-form / variant aliases
 * from SEO_EXTRA_ALIASES (e.g. «بارسا» for Barcelona — GSC evidence: 179
 * impressions for «بازی بعدی بارسا»). The aliases ride the JSON-LD array
 * ONLY (machine-readable, invisible to the SERP snippet) — the visible
 * faName / SEO name bytes stay byte-identical (the Dec 4-8 freeze holds).
 */
export function seoTeamAltNames(t: any): string[] {
  const out: string[] = [];
  const o = t && t.name ? SEO_TEAM_NAME_OVERRIDES[normTeamKey(t.name)] : null;
  if (o) {
    out.push(o.fa);
    if (o.alt && o.alt !== o.fa && !out.includes(o.alt)) out.push(o.alt);
  }
  const fa = t && t.faName ? String(t.faName) : "";
  if (fa && !out.includes(fa)) out.push(fa);
  // S11: append the GSC-observed short-form / variant aliases (the JSON-LD
  // alternateName array — machine-readable, NOT the visible faName bytes).
  // Deduplicated against the visible-name list so the array never carries
  // a duplicate (e.g. «بارسلونا» is already the SEO name for Barcelona —
  // not duplicated here; «بارسا» is the NEW alias that rides only here).
  const extra = t && t.name ? SEO_EXTRA_ALIASES[normTeamKey(t.name)] : null;
  if (extra) {
    for (const a of extra) {
      if (a && !out.includes(a)) out.push(a);
    }
  }
  return out;
}
