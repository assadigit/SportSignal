// SportSignal — Wikipedia Persian Gulf League table provider (the PGL
// standings fallback when FD/sportscore carry no table). Extracted from
// providers.ts in v13.74-providersplit.
import type { Env } from "./types";
import { fetchJSON } from "./utils";

export async function fetchPglTableFromWikipedia(env: Env) {
  try {
    const y = (new Date()).getUTCFullYear();
    const m = (new Date()).getUTCMonth() + 1;
    const startYear = m >= 7 ? y : y - 1;
    const nextYY = String((startYear + 1) % 100).padStart(2, "0");
    const season = startYear + "\u2013" + nextYY;
    const page = "Template:" + season + " Persian Gulf Pro League table";
    const u = "https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&page=" + encodeURIComponent(page);
    const data = await fetchJSON(u, 1, { "User-Agent": "SportSignalBot/1.0 (football.sportsignal.ir)" });
    const wt = data && data.parse && data.parse.wikitext ? String(data.parse.wikitext) : "";
    if (!wt) return null;
    const orderMatch = wt.match(/team_order\s*=\s*([A-Z]{2,4}(?:\s*,\s*[A-Z]{2,4})*)/);
    if (!orderMatch) return null;
    const codes = orderMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
    const teams = [];
    const stat = (code, key) => {
      const m2 = wt.match(new RegExp("\\|" + key + "_" + code + "\\s*=\\s*(-?\\d+)"));
      return m2 ? parseInt(m2[1]) : null;
    };
    const nameOf = (code) => {
      const m2 = wt.match(new RegExp("\\|name_" + code + "\\s*=\\s*\\[\\[[^\\]|]*\\|([^\\]]+)\\]\\]"));
      if (m2) return m2[1];
      const m3 = wt.match(new RegExp("\\|name_" + code + "\\s*=\\s*\\[\\[([^\\]|]+)\\]\\]"));
      return m3 ? m3[1] : code;
    };
    for (let i = 0; i < codes.length; i++) {
      const c = codes[i];
      const w = stat(c, "win"), d = stat(c, "draw"), l = stat(c, "loss"), gf = stat(c, "gf"), ga = stat(c, "ga");
      if (w == null || d == null || l == null) continue;
      teams.push({
        name: nameOf(c),
        pos: i + 1,
        points: w * 3 + d,
        played: w + d + l,
        won: w,
        draw: d,
        lost: l,
        gf: gf == null ? null : gf,
        ga: ga == null ? null : ga,
        gd: gf != null && ga != null ? gf - ga : null
      });
    }
    if (teams.length < 8) return null;
    return { matchday: null, started: true, source: "wikipedia", teams };
  } catch (e) {
    console.error("PGL wikipedia table failed: " + e.message);
    return null;
  }
}
