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
  barcelona: ["بارسا"]
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
