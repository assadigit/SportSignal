// SportSignal — Workers AI Farsi-name learner (layer 2 of the translation
// stack). Batches unknown Latin team names, validates Persian answers against
// the varzesh3 catalog, stores results in KV (fa_teams_ai.learned).


import { CONFIG } from "./config";
import type { Env } from "./types";
import { normTeamKey } from "./teams.js";
import { translateTeam, resetFaAiCache, ensureFaAiCache, isValidFaName, faAiCacheSize } from "./translate";

export function collectUnknownTeamNames(data: any) {
  const out = new Set();
  const addName = (n) => {
    const s = String(n || "").trim();
    if (!s || s.length > 48) return;
    if (/[\u0600-\u06FF]/.test(s)) return;
    if (translateTeam(s) !== s) return;
    out.add(s);
  };
  if (!data) return [...out];
  if (data.ucl && Array.isArray((data.ucl as any).teams)) data.ucl.teams.forEach((t) => addName(t && t.name));
  if (data.standings && typeof data.standings === "object") {
    Object.values(data.standings).forEach((st: any) => {
      if (st && Array.isArray(st.teams)) st.teams.forEach((t) => addName(t && t.name));
    });
  }
  // v12.x-cups-ai: scan the cups data too — each cup has a .next match with
  // homeTeam.name + awayTeam.name that needs AI translation. Previously the
  // cups were not scanned, so cup-only teams (e.g. Omonia Nicosia, Celta Vigo
  // in EL qualifying) never got AI-translated to Farsi.
  if (data.cups && Array.isArray(data.cups)) {
    data.cups.forEach(function(c) {
      if (c && c.next && c.next.homeTeam) addName(c.next.homeTeam.name);
      if (c && c.next && c.next.awayTeam) addName(c.next.awayTeam.name);
    });
  }
  const pools = [
    Array.isArray(data.upcoming) ? data.upcoming : [],
    Array.isArray(data.finished) ? data.finished : [],
    Array.isArray(data.thisWeek) ? data.thisWeek : [],
    Array.isArray(data.nextWeek) ? data.nextWeek : [],
    // v12.x-audit: scan ucl.matches too — UCL fixtures have team names
    data.ucl && Array.isArray(data.ucl.matches) ? data.ucl.matches : []
  ];
  if (data.topSpot && Array.isArray(data.topSpot.matches)) pools.push(data.topSpot.matches);
  if (data.topSpot && data.topSpot.next) pools.push([data.topSpot.next]);
  if (data.nextBig) pools.push([data.nextBig]);
  for (const pool of pools) {
    for (const m of pool) {
      if (!m) continue;
      if (m.homeTeam) addName(m.homeTeam.name);
      if (m.awayTeam) addName(m.awayTeam.name);
    }
  }
  return [...out];
}
export function parseAiNameMap(raw, batch) {
  if (!raw) return null;
  const cleaned = String(raw).replace(/```(?:json)?/gi, "").trim();
  let parsed = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    parsed = null;
  }
  if (parsed == null) {
    const a = cleaned.indexOf("{"), b = cleaned.lastIndexOf("}");
    if (a >= 0 && b > a) {
      try {
        parsed = JSON.parse(cleaned.slice(a, b + 1));
      } catch (e) {
        parsed = null;
      }
    }
  }
  if (parsed == null) {
    const a = cleaned.indexOf("["), b = cleaned.lastIndexOf("]");
    if (a >= 0 && b > a) {
      try {
        parsed = JSON.parse(cleaned.slice(a, b + 1));
      } catch (e) {
        parsed = null;
      }
    }
  }
  if (parsed == null || typeof parsed !== "object") return null;
  const sources = Array.isArray(parsed) ? parsed : [parsed].concat(Object.values(parsed).filter((v) => v && typeof v === "object"));
  const flat = {};
  for (const name of batch) {
    for (const src of sources) {
      if (typeof src[name] === "string") {
        flat[name] = src[name];
        break;
      }
    }
    if (flat[name] === void 0 && Array.isArray(parsed)) {
      for (const row of parsed) {
        if (!row || typeof row !== "object") continue;
        const id = row.name || row.club || row.input || row.en;
        if (typeof id === "string" && id.trim() === name) {
          const fa = row.fa || row.farsi || row.persian || row.translation || row.translated || row.fa_name;
          if (typeof fa === "string") {
            flat[name] = fa;
            break;
          }
        }
        if (typeof row[name] === "string") {
          flat[name] = row[name];
          break;
        }
      }
    }
  }
  return Object.keys(flat).length ? flat : null;
}
export async function runFaAiLearner(env: Env, names, force) {
  if (!env || !env.AI) return { ok: false, skipped: "ai-disabled", learned: 0, failed: 0, pending: (names || []).length };
  const rec: any = await env.STATE.get(CONFIG.KV_FA_TEAMS, "json").catch(() => null) || { v: 1, learned: {}, failed: {} };
  if (!rec.learned) rec.learned = {};
  if (!rec.failed) rec.failed = {};
  const now = Date.now();
  const pending = (names || []).filter((n) => {
    const k = normTeamKey(n);
    if (!k || rec.learned[k]) return false;
    if (force) return true;
    const failTs = parseInt(rec.failed[k]) || 0;
    return !(failTs && now - failTs < CONFIG.FA_AI_FAIL_RETRY_MS);
  });
  if (!pending.length) return { ok: true, learned: 0, failed: 0, pending: 0, totalLearned: Object.keys(rec.learned).length };
  const batch = pending.slice(0, CONFIG.FA_AI_MAX_BATCH);
  const v3 = await env.STATE.get(CONFIG.KV_V3_CATALOG, "json").catch(() => null);
  const normFa = (s) => String(s || "").replace(/[\s\u200c]/g, "");
  const v3Norm = new Map();
  let v3Hint = "";
  if (v3 && Array.isArray(v3.clubs) && v3.clubs.length) {
    const byLeague: Record<string, any> = {};
    for (const c of v3.clubs) {
      if (!c || !c.n) continue;
      v3Norm.set(normFa(c.n), c.n);
      (byLeague[c.c || "other"] = byLeague[c.c || "other"] || []).push(c.n);
    }
    v3Hint = Object.entries(byLeague).map(([lg, names2]) => lg + ": " + names2.join(", ")).join(" | ");
    if (v3Hint.length > 2600) v3Hint = v3Hint.slice(0, 2600);
  }
  const sys = 'You translate football (soccer) club names to Persian (Farsi) as used by Iranian sports media. Reply with ONLY a minified JSON object mapping every EXACT input name to its Persian name. Use the established common short form (e.g. "Sporting CP"\u2192"\u0627\u0633\u067E\u0648\u0631\u062A\u06CC\u0646\u06AF \u0644\u06CC\u0633\u0628\u0648\u0646", "SK Slavia Praha"\u2192"\u0627\u0633\u0644\u0627\u0648\u06CC\u0627 \u067E\u0631\u0627\u06AF", "PAE AEK"\u2192"\u0622\u06CC\u06A9 \u0622\u062A\u0646"). Transliterate unknown clubs phonetically. NEVER use Latin letters. No markdown, no explanations.' + (v3Hint ? "\nCanonical Persian club names from varzesh3.com (the reference Iranian sports media) \u2014 when a club appears below, return EXACTLY that spelling: " + v3Hint : "");
  const user = JSON.stringify(batch);
  let raw = null, model = null, rawDump = null;
  for (const m of ["@cf/meta/llama-3.3-70b-instruct-fp8-fast", "@cf/meta/llama-3.1-8b-instruct"]) {
    try {
      const r = await env.AI.run(m, { messages: [{ role: "system", content: sys }, { role: "user", content: user }], max_tokens: 1200 });
      try {
        rawDump = JSON.stringify(r).slice(0, 400);
      } catch (e) {
        rawDump = String(r).slice(0, 400);
      }
      raw = r && (r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content || r.choices && r.choices[0] && r.choices[0].text || r.response || r.text || (typeof r === "string" ? r : null));
      if (raw) {
        model = m;
        break;
      }
    } catch (e) {
      console.warn("FA-AI model " + m + " failed: " + e.message);
    }
  }
  const map = parseAiNameMap(raw, batch);
  let learned = 0, failed = 0;
  for (const name of batch) {
    const k = normTeamKey(name);
    if (!k) continue;
    const fa = map ? map[name] : null;
    if (isValidFaName(fa)) {
      const snap = v3Norm.get(normFa(fa));
      rec.learned[k] = snap || String(fa).trim();
      delete rec.failed[k];
      learned++;
    } else {
      rec.failed[k] = String(now);
      failed++;
    }
  }
  rec.ts = now;
  await env.STATE.put(CONFIG.KV_FA_TEAMS, JSON.stringify(rec)).catch(() => {
  });
  resetFaAiCache();
  const out: any = { ok: true, learned, failed, model, pending: pending.length - batch.length, asked: batch.length, totalLearned: Object.keys(rec.learned).length };
  if (askedAndFailed(out)) out.rawHead = rawDump || (raw ? String(raw).slice(0, 160) : "(no model output)");
  return out;
}
export function askedAndFailed(out) {
  return out && out.asked > 0 && out.learned === 0;
}
export async function maybeRunFaAi(env: Env, force?) {
  try {
    if (!env || !env.AI) return { ok: false, skipped: "ai-disabled" };
    if (!force) {
      const last = parseInt(await env.STATE.get(CONFIG.KV_FA_LAST_RUN).catch(() => null)) || 0;
      if (last && Date.now() - last < CONFIG.FA_AI_RUN_EVERY_MS) return { ok: true, skipped: "cooldown", sinceMin: Math.round((Date.now() - last) / 6e4) };
    }
    await env.STATE.put(CONFIG.KV_FA_LAST_RUN, String(Date.now()), { expirationTtl: Math.ceil(CONFIG.FA_AI_FAIL_RETRY_MS / 1e3) }).catch(() => {
    });
    await ensureFaAiCache(env);
    const cached = await env.STATE.get(CONFIG.KV_PUBLIC_MATCHES, "json").catch(() => null);
    const names = cached && cached.data ? collectUnknownTeamNames(cached.data) : [];
    if (!names.length) return { ok: true, learned: 0, failed: 0, pending: 0, totalLearned: faAiCacheSize() };
    const res: any = await runFaAiLearner(env, names, force);
    console.log(`\u{1F9E0} FA-AI learner: asked=${res.asked || 0} learned=${res.learned || 0} rejected=${res.failed || 0} pending=${res.pending || 0} model=${res.model || "-"}`);
    return res;
  } catch (e) {
    console.error("FA-AI learner failed: " + e.message);
    return { ok: false, error: e.message };
  }
}
