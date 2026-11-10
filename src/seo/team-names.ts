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
  return out;
}
