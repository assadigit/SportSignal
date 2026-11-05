// scripts/s10-herowire-bundle.js — the S10 bundle leg (v13.226): creates
// assets/public-13.72.js from public-13.71.js with the 76 new HERO_ART
// entries appended (grouped by league, ASCII-escaped keys, trailing
// provenance comments). Verifies the result with the SAME extraction the
// coverage sync uses (111 entries expected).
"use strict";
const fs = require("fs");
const path = require("path");
const { extractHeroArt } = require("./sync-hero-coverage.js");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "assets", "public-13.71.js");
const DST = path.join(ROOT, "assets", "public-13.72.js");

const slugify = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, "-");
const escKey = (s) => String(s).split("").map((ch) => (ch.charCodeAt(0) > 0x7e ? "\\u" + ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0") : ch)).join("");

const LEAGUE_ORDER = ["Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1"];
const LEAGUE_TAG = { "Premier League": "PL", "La Liga": "La Liga", "Serie A": "Serie A", "Bundesliga": "Bundesliga", "Ligue 1": "Ligue 1" };

function main() {
  if (fs.existsSync(DST)) throw new Error(DST + " already exists");
  const lib = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "players", "uefa", "hero-clubs.json"), "utf8")).clubs;
  const src = fs.readFileSync(SRC, "utf8");
  const wired = extractHeroArt(src);
  const wiredSlugs = new Set(wired.map((w) => slugify(w.name)));
  const unwired = [];
  for (const [slug, c] of Object.entries(lib)) {
    if (wiredSlugs.has(slug)) continue;
    if (!c || c.status !== "complete" || !c.portrait_url) continue;
    unwired.push({ slug, club: c.club, player: c.player, league: c.league, file: path.basename(c.portrait_url), style: c.style });
  }
  if (unwired.length !== 76) throw new Error("expected 76 unwired, got " + unwired.length);

  // group by league, club-sorted inside
  const byLeague = new Map(LEAGUE_ORDER.map((l) => [l, []]));
  for (const u of unwired) {
    if (!byLeague.has(u.league)) throw new Error("unknown league: " + u.league);
    byLeague.get(u.league).push(u);
  }
  for (const [, arr] of byLeague) arr.sort((a, b) => a.club.localeCompare(b.club));

  const lines = [];
  lines.push("/* v13.226-herowire (the owner's S9 WIRE decision, executed S10 2026-11-06): the 76");
  lines.push("   published big-5 library portraits join HERO_ART — every hero-clubs.json club");
  lines.push("   with a complete VLM-style-gated portrait now renders. The library is FULLY");
  lines.push("   wired: 96/96 big-5 + the 15 non-big-5 UCL-era clubs + Chelsea/Tottenham = 111");
  lines.push("   entries. Keys are EXACT football-data.org provider names (cross-checked against");
  lines.push("   the live FD league team lists, 2026-11-05); srcs are the standard v13.131");
  lines.push("   alpha-trimmed /players/hero/ canvases (alpha-bbox thr 8 + 2px pad, lossless);");
  lines.push("   casts are the deterministic make-hero-casts.js bakes (the 37 pre-existing cast");
  lines.push("   files re-baked byte-identical). Fade tiers: the v13.123 bottom-luminance scan");
  lines.push("   ran on all 76 (scripts/s10-fadescan.js, bright-quartile metric calibrated on");
  lines.push("   Yamal-hi/Šimić-deep/Baumgartner-default) — ZERO entries clear the tier bar");
  lines.push("   (the 5 flagged candidates are gradual dark-kit bottoms at 65-147 luma, not the");
  lines.push("   Šimić sharp bright-to-invisible drop at ~30); every entry ships the DEFAULT");
  lines.push("   ramp. Kit-timing was verified at publish time (the 2026-10-20 v2.3 style audit)");
  lines.push("   — never re-probed. */");
  for (const league of LEAGUE_ORDER) {
    const arr = byLeague.get(league);
    lines.push("/* --- " + league + " (" + arr.length + " clubs) --- */");
    for (const u of arr) {
      lines.push('"' + escKey(u.club) + '":{src:"/players/hero/' + u.file + '",alt:""},' + " ".repeat(Math.max(1, 44 - u.club.length)) + "/* " + LEAGUE_TAG[u.league] + ": " + u.player + " (" + u.style + ") */");
    }
  }

  // insert before the HERO_ART closing brace
  const m = src.match(/var HERO_ART=\{[\s\S]*?\n\};/);
  if (!m) throw new Error("HERO_ART block not found");
  const block = m[0];
  const trimmed = block.replace(/\n\};$/, "");
  const nextBlock = trimmed + ",\n" + lines.join("\n") + "\n};";
  fs.writeFileSync(DST, src.replace(block, nextBlock));

  // verification: the sync's own extraction reads 111
  const next = fs.readFileSync(DST, "utf8");
  const entries = extractHeroArt(next);
  if (entries.length !== 111) throw new Error("expected 111 entries in the new bundle, got " + entries.length);
  const dup = entries.map((e) => slugify(e.name)).filter((s, i, a) => a.indexOf(s) !== i);
  if (dup.length) throw new Error("duplicate keys: " + dup.join(", "));
  // every src resolves
  for (const e of entries) {
    if (!fs.existsSync(path.join(ROOT, "assets", e.src))) throw new Error("missing canvas: " + e.src);
    if (!fs.existsSync(path.join(ROOT, "assets", e.src.replace(/\.webp$/, ".cast.webp")))) throw new Error("missing cast: " + e.src);
  }
  console.log("OK   public-13.72.js: HERO_ART 35 -> 111 entries (+" + unwired.length + "); all srcs + casts resolve; no dup keys");
  console.log("     leagues: " + LEAGUE_ORDER.map((l) => LEAGUE_TAG[l] + " " + byLeague.get(l).length).join(", "));
}

main();
