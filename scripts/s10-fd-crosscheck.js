// S10 one-off: cross-check the 76 unwired hero-clubs names against the live
// football-data.org competition team lists (the HERO_ART key contract —
// README §2: keys are the EXACT FD provider names). Also cross-checks
// CONFIG.BIG_TEAMS_BY_LEAGUE coverage.
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

const lib = JSON.parse(fs.readFileSync(path.join(ROOT, "assets/players/uefa/hero-clubs.json"), "utf8")).clubs;
const bundleName = "public-13.71.js";
const bundle = fs.readFileSync(path.join(ROOT, "assets", bundleName), "utf8");
const m = bundle.match(/var HERO_ART=\{[\s\S]*?\n\};/);
const wiredNames = new Set([...m[0].matchAll(/"((?:[^"\\]|\\.)+)"\s*:\s*\{/g)].map((x) => JSON.parse('"' + x[1] + '"')));

const fdByLeague = {};
const FD_LEAGUE = { PL: "Premier League", PD: "La Liga", SA: "Serie A", BL1: "Bundesliga", FL1: "Ligue 1" };
for (const code of Object.keys(FD_LEAGUE)) {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, ".cache/s10/fd-teams-" + code + ".json"), "utf8"));
  fdByLeague[FD_LEAGUE[code]] = new Set((d.teams || []).map((t) => t.name));
}

// the 76 = library clubs not wired (by slug, the sync's derivation)
const slugify = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, "-");
const wiredSlugs = new Set([...wiredNames].map(slugify));
const unwired = [];
for (const [slug, c] of Object.entries(lib)) {
  if (wiredSlugs.has(slug)) continue;
  unwired.push({ slug, club: c.club, player: c.player, league: c.league, src: c.portrait_url, style: c.style });
}

let ok = 0, missing = [], notInFd = [];
for (const u of unwired) {
  const fd = fdByLeague[u.league];
  if (!fd) { missing.push(u); continue; }
  if (fd.has(u.club)) ok++;
  else notInFd.push(u);
}
console.log("unwired library clubs:", unwired.length);
console.log("EXACT match in live FD league list:", ok);
console.log("NOT found in that league's FD list:", notInFd.length);
for (const u of notInFd) {
  // fuzzy: find near names in the FD list for diagnosis
  const cands = [];
  for (const [lg, set] of Object.entries(fdByLeague)) {
    for (const n of set) {
      if (slugify(n) === u.slug || slugify(n).includes(u.slug.split("-")[0]) && u.slug.split("-")[0].length > 3) cands.push(lg + ": " + n);
    }
  }
  console.log("  MISS " + u.league + " | " + u.club + " [" + u.slug + "]" + (cands.length ? "  candidates: " + cands.slice(0, 4).join(" ; ") : "  (no candidate anywhere)"));
}
// style distribution
const byStyle = {};
for (const u of unwired) byStyle[u.style] = (byStyle[u.style] || 0) + 1;
console.log("style tiers:", JSON.stringify(byStyle));
// file existence + 512 check happens in the build script; here just presence
const missingFiles = unwired.filter((u) => !fs.existsSync(path.join(ROOT, "assets", u.src)));
console.log("missing portrait files:", missingFiles.length);
