// lib/parse.js — narrowly scoped extraction of the exact fields this pipeline
// needs from official UEFA pages. Selectors were discovered from the live
// pages themselves (2026/27 season) and are intentionally strict: anything
// unexpected is surfaced as an error or a missing field, never guessed.
"use strict";

// --- name utilities ---------------------------------------------------------

// Fold a display name to a plain lowercase ASCII search/compare key.
// Used ONLY for matching; display names are never rewritten (spec §4).
function normalizeName(s) {
  return (s || "")
    // letters that NFD does not decompose but UEFA slugs transliterate
    .replace(/ı/g, "i").replace(/İ/g, "i") // Turkish dotless/dotted I
    .replace(/ß/g, "ss")
    .replace(/ø/g, "o").replace(/Ø/g, "o")
    .replace(/æ/g, "ae").replace(/œ/g, "oe")
    .replace(/đ/g, "d").replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining marks (accents)
    .replace(/[’'`´]/g, "") // apostrophes: N’Golo -> ngolo
    .replace(/[^\p{L}\p{N}]+/gu, " ") // punctuation -> space
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// Fold to the kebab-case form UEFA uses in URL slugs.
function nameToSlug(s) {
  return normalizeName(s).replace(/\s+/g, "-");
}

// Compact form with ALL separators removed — UEFA slug conventions vary for
// apostrophes (N’Golo -> "ngolo-kante" or "n-golo-kante"), so compact
// comparison catches hyphenation variance.
function compactName(s) {
  return normalizeName(s).replace(/[\s-]+/g, "");
}

// Minimal HTML entity decode (numeric + the common named entities,
// including Latin-1 accented forms used in player names).
const NAMED_ENTITIES = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", yacute: "ý",
  agrave: "à", egrave: "è", igrave: "ì", ograve: "ò", ugrave: "ù",
  acirc: "â", ecirc: "ê", icirc: "î", ocirc: "ô", ucirc: "û",
  atilde: "ã", ntilde: "ñ", otilde: "õ",
  auml: "ä", euml: "ë", iuml: "ï", ouml: "ö", uuml: "ü", yuml: "ÿ",
  ccedil: "ç", oslash: "ø",aring: "å", aelig: "æ", oe: "oe",
  Eacute: "É", Egrave: "È", Agrave: "À", Ccedil: "Ç", Ouml: "Ö", Uuml: "Ü",
  Ndquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", ndash: "–", mdash: "—",
};
function decodeEntities(s) {
  if (!s) return "";
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, name) =>
      Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, name) ? NAMED_ENTITIES[name] : m
    );
}
function safeCodePoint(cp) {
  try { return String.fromCodePoint(cp); } catch { return ""; }
}

// Parse "15/5/1997 (29)" -> "1997-05-15" (D/M/YYYY as used on UEFA profiles).
// Returns null when the text does not match.
function parseDob(text) {
  const m = (text || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const d = String(Number(m[1])).padStart(2, "0");
  const mo = String(Number(m[2])).padStart(2, "0");
  return `${m[3]}-${mo}-${d}`;
}

// --- page parsers -----------------------------------------------------------

// Competition URL contexts the pipeline is allowed to walk.
const COMPETITIONS = [
  { prefix: "uefachampionsleague", name: "UEFA Champions League" },
  { prefix: "uefaeuropaleague", name: "UEFA Europa League" },
  { prefix: "uefaconferenceleague", name: "UEFA Conference League" },
];

// Clubs list page -> ["52747--paris", ...] (unique club path suffixes).
function parseClubsList(html) {
  const out = new Set();
  const re = /href="\/(uefachampionsleague|uefaeuropaleague|uefaconferenceleague)\/clubs\/(\d+--[a-z0-9-]+)\/"/g;
  let m;
  while ((m = re.exec(html))) out.add(m[2]);
  return [...out];
}

// Squad page -> [{ playerId, slug, profilePath, competition }]
function parseSquad(html, competition) {
  const out = new Map();
  const re = /href="\/(uefachampionsleague|uefaeuropaleague|uefaconferenceleague)\/clubs\/players\/(\d+)--([a-z0-9-]+)\/"/g;
  let m;
  while ((m = re.exec(html))) {
    const comp = m[1] || competition;
    if (!out.has(m[2])) {
      out.set(m[2], {
        playerId: m[2],
        slug: m[3],
        profilePath: `/${comp}/clubs/players/${m[2]}--${m[3]}/`,
        competition: comp,
      });
    }
  }
  return [...out.values()];
}

// Match a requested player against parsed squad entries by normalized name
// (slug and display-name safe: accents, apostrophes, punctuation folded).
// Aliases cover known nickname forms (e.g. "Nico Paz" -> "Nicolas Paz").
// Never auto-accepts an ambiguous multi-match.
function matchSquadPlayer(squad, searchName, aliases = []) {
  const names = [searchName, ...(aliases || [])];
  // exact slug match for any name form
  for (const n of names) {
    const bySlug = squad.filter((p) => p.slug === nameToSlug(n));
    if (bySlug.length === 1) return { match: bySlug[0], alsoMatching: [] };
    if (bySlug.length > 1) return { match: null, alsoMatching: bySlug };
  }
  // normalized + compact display-name match on the slug text
  for (const n of names) {
    const norm = normalizeName(n);
    const comp = compactName(n);
    const matches = squad.filter(
      (p) => normalizeName(p.slug.replace(/-/g, " ")) === norm || compactName(p.slug) === comp
    );
    if (matches.length === 1) return { match: matches[0], alsoMatching: [] };
    if (matches.length > 1) return { match: null, alsoMatching: matches };
  }
  // partial containment as a last resort (single hit only)
  const partial = new Map();
  for (const n of names) {
    const wc = compactName(n);
    for (const p of squad) {
      const pc = compactName(p.slug);
      if (pc.includes(wc) || wc.includes(pc)) partial.set(p.playerId, p);
    }
  }
  const arr = [...partial.values()];
  if (arr.length === 1) return { match: arr[0], alsoMatching: [] };
  return { match: null, alsoMatching: arr };
}

// Player profile page -> identity fields + portrait candidates.
function parsePlayerProfile(html, canonicalUrl) {
  const out = {
    canonical_profile_url: canonicalUrl || null,
    full_name: null,
    uefa_observed_club: null,
    competition: null,
    season: null,
    nationality: null,
    date_of_birth: null,
    position: null,
    height: null,
    weight: null,
    cutoff_image_url: null,
    fallback_image_url: null,
    cutoff_alt_text: null,
  };

  // Title variants observed on live pages:
  //   UCL-style:  "Ousmane Dembélé | Paris | UEFA Champions League 2026/27 | UEFA.com"
  //   UEL/UECL:   "Bart Verbruggen | UEFA Conference League 2026/27 | UEFA.com"
  //               (no club part — the club is recovered from the page's club
  //               link /clubs/{id}--{slug}/ instead)
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  const titleParts = title.split("|").map((s) => decodeEntities(s).trim());
  const looksLikeCompetition = (s) => /^UEFA\b/i.test(s) && /(League|Champions|Cup|Euro)/i.test(s);
  if (titleParts.length >= 3) {
    out.full_name = titleParts[0] || null;
    let comp;
    if (looksLikeCompetition(titleParts[1] || "")) {
      comp = titleParts[1] || "";
      const clubLink = html.match(
        /href="\/(?:uefachampionsleague|uefaeuropaleague|uefaconferenceleague)\/clubs\/(\d+--[a-z0-9-]+)\/"/
      );
      out.uefa_observed_club = clubLink ? clubLink[1].split("--")[1] : null;
    } else {
      out.uefa_observed_club = titleParts[1] || null;
      comp = titleParts[2] || "";
    }
    out.competition = comp || null;
    const seasonMatch = comp.match(/(\d{4}\/\d{2})/);
    if (seasonMatch) out.season = seasonMatch[1];
  }

  // player-profile-category / player-profile-value pairs
  const catRe = /class="player-profile-category"[^>]*>([^<]*)<\/span>\s*<span[^>]*class="player-profile-value"[^>]*>([^<]*)<\/span>/g;
  let m;
  const fields = {};
  while ((m = catRe.exec(html))) {
    fields[decodeEntities(m[1]).trim()] = decodeEntities(m[2]).trim();
  }
  if (fields["Date of birth"]) out.date_of_birth = parseDob(fields["Date of birth"]);
  if (fields["Country"]) out.nationality = fields["Country"];
  if (fields["Position"]) out.position = fields["Position"];
  if (fields["Height"]) out.height = fields["Height"];
  if (fields["Weight"]) out.weight = fields["Weight"];

  // Transparent cutout portrait: <img class="player-header__cutoff-image ..."
  // data-src="https://img.uefa.com/imgml/TP/players/{segment}/{season}/cutoff/{id}.webp"
  // The segment maps to the competition context (observed: UCL=1, UEL=14,
  // UECL=2019).
  const cutRe = /class="player-header__cutoff-image[^"]*"[^>]*?(?:data-src|src)="(https:\/\/img\.uefa\.com\/imgml\/TP\/players\/(\d+)\/(\d{4})\/cutoff\/(\d+)\.webp)"/;
  const cut = html.match(cutRe);
  if (cut) {
    out.cutoff_image_url = cut[1];
    out.cutoff_asset_season = cut[3];
    out.cutoff_player_id = cut[4];
    const alt = html.match(/class="player-header__cutoff-image[^"]*"[^>]*?alt="([^"]*)"/);
    if (alt) out.cutoff_alt_text = decodeEntities(alt[1]);
  }

  // Opaque fallback portrait (324x324 jpg) — recorded as a non-preferred
  // candidate, never accepted as the final asset (spec §8: do not silently
  // mix opaque photos with transparent cutouts).
  const fb = html.match(/https:\/\/img\.uefa\.com\/imgml\/TP\/players\/(\d+)\/(\d{4})\/324x324\/(\d+)\.jpg/);
  if (fb) out.fallback_image_url = fb[0];

  return out;
}

// UEFA asset-season label -> competition season label (2027 -> "2026/27").
// The asset season is treated as an opaque identifier until confirmed; this
// helper only formats it for reports.
function assetSeasonToLabel(assetSeason) {
  const y = Number(assetSeason);
  if (!Number.isInteger(y) || y < 2000) return null;
  return `${y - 1}/${String(y).slice(2)}`;
}

module.exports = {
  normalizeName,
  nameToSlug,
  compactName,
  decodeEntities,
  parseDob,
  parseClubsList,
  parseSquad,
  matchSquadPlayer,
  parsePlayerProfile,
  assetSeasonToLabel,
  COMPETITIONS,
};
