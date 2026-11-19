// extract-alias-evidence.js — derive the per-alias GSC evidence from the
// EXISTING validated keyword map (never overwritten — read-only input).
// Output: JSON with every candidate alias + the GSC rows that contain it,
// so the SEO_EXTRA_ALIASES extension + the additive CSV stay traceable to
// the original evidence (PERSIAN-CLUB-ALIAS-SEO-SPEC §6 rules).
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const MAP = path.join(root, "seo-implementation", "keyword-research", "VALIDATED-KEYWORD-MAP.csv");

function parseCSVLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

const lines = fs.readFileSync(MAP, "utf8").split(/\r?\n/).filter(Boolean);
const header = parseCSVLine(lines[0]);
const rows = lines.slice(1).map(parseCSVLine);
const idx = {};
header.forEach((h, i) => (idx[h] = i));

// The candidate alias table (spec §4.1) — canonical club + alias candidates,
// each with the normTeamKey(s) the provider names fold to, and the canonical
// URL (verified against src/slugs.ts TEAM_SLUGS + the live provider-derived
// slugs internazionale-milano / club-atletico-de-madrid).
const CLUBS = [
  { club: "FC Barcelona", normKeys: ["fcbarcelona", "barcelona"], url: "/teams/barcelona", tier: "A++",
    aliases: ["بارسا", "بارسلنا"] },
  { club: "Real Madrid CF", normKeys: ["realmadrid"], url: "/teams/real-madrid", tier: "A++",
    aliases: ["رئال", "رئال مادرید", "رئال‌مادرید", "رئال مادرید"] },
  { club: "FC Bayern München", normKeys: ["bayernmunich", "bayernmunchen"], url: "/teams/bayern-munich", tier: "A+",
    aliases: ["بایرن", "بایرن مونیخ", "بایرن‌مونیخ"] },
  { club: "Manchester City FC", normKeys: ["manchestercity"], url: "/teams/manchester-city", tier: "A+",
    aliases: ["من سیتی", "منچستر سیتی", "منچسترسیتی"] },
  { club: "Arsenal FC", normKeys: ["arsenal"], url: "/teams/arsenal", tier: "A+",
    aliases: ["ارسنال", "آرسنال"] },
  { club: "Liverpool FC", normKeys: ["liverpool"], url: "/teams/liverpool", tier: "A+",
    aliases: ["لیورپول"] },
  { club: "FC Internazionale Milano", normKeys: ["intermilan", "internazionale"], url: "/teams/internazionale-milano", tier: "A+",
    aliases: ["اینتر", "اینتر میلان", "اینترمیلان"] },
  { club: "AC Milan", normKeys: ["acmilan"], url: "/teams/ac-milan", tier: "A+",
    aliases: ["آ.ث. میلان", "میلان", "آث میلان", "آث‌میلان"] },
  { club: "Paris Saint-Germain", normKeys: ["parissaintgermain"], url: "/teams/paris-saint-germain", tier: "A",
    aliases: ["پی‌اس‌جی", "پی اس جی", "PSG", "پاری سن ژرمن", "پاری‌سن‌ژرمن", "پاریسن ژرمن", "پاریس ژرمن"] },
  { club: "Manchester United FC", normKeys: ["manchesterunited"], url: "/teams/manchester-united", tier: "A",
    aliases: ["من یونایتد", "منچستریونایتد", "منچستر یونایتد", "منچستر"] },
  { club: "Borussia Dortmund", normKeys: ["borussiadortmund"], url: "/teams/borussia-dortmund", tier: "A",
    aliases: ["دورتموند", "بروسیا دورتموند", "بوروسیا دورتموند"] },
  { club: "Club Atlético de Madrid", normKeys: ["atleticomadrid"], url: "/teams/club-atletico-de-madrid", tier: "A",
    aliases: ["اتلتیکو", "اتلتیکو مادرید"] },
  { club: "Chelsea FC", normKeys: ["chelsea"], url: "/teams/chelsea", tier: "A",
    aliases: ["چلسی"] }
];

const out = { source: MAP, generated: "2026-11-19", clubs: [] };
for (const c of CLUBS) {
  const aliasEvidence = {};
  for (const a of c.aliases) {
    const hits = rows
      .filter((r) => r[idx.keyword] && r[idx.keyword].includes(a) && r[idx.evidence_class] === "GSC-observed")
      .map((r) => ({
        keyword: r[idx.keyword],
        clicks: Number(r[idx.gsc_clicks] || 0),
        impressions: Number(r[idx.gsc_impressions] || 0),
        position: r[idx.gsc_position] || "",
        target: r[idx.target_url] || ""
      }));
    aliasEvidence[a] = hits;
  }
  out.clubs.push({ ...c, aliasEvidence });
}
fs.writeFileSync(path.join(__dirname, "alias-evidence.json"), JSON.stringify(out, null, 2));
for (const c of out.clubs) {
  for (const a of c.aliases) {
    const ev = c.aliasEvidence[a];
    const tot = ev.reduce((s, r) => s + r.impressions, 0);
    console.log(c.club + " | " + a + " | " + ev.length + " GSC rows | " + tot + " impr");
  }
}
console.log("wrote scripts/alias-evidence.json");
