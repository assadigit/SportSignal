// Bootstrap: resolve Persian (Farsi) club names from Persian Wikipedia.
//
// WHY: we can't hand-maintain a translation dictionary for every club. Persian
// Wikipedia has an article (and thus the canonical Persian name) for essentially
// every football club. We map EN-club-name -> en.wikipedia article -> its `fa`
// interwiki link (the exact Persian article title), strip the "باشگاه فوتبال "
// ("football club") prefix, and emit FA_TEAMS-style lines.
//
// USAGE:  node scripts/fa-names-from-wikipedia.js [--codes AL,PGL,PL,PD,SA,FL1,BL1,CL]
//   Requires UCL_BASE (worker URL) and UCL_TOKEN (admin bearer) in the environment.
//   Pulls the club rosters from the live worker's standings, resolves each club's
//   Persian name, and prints a ready-to-paste FA_TEAMS block. Review, then add to
//   translateTeam in src/worker.ts. Wikipedia is hit once per name; pace/retry to
//   respect the anonymous rate limit.
const BASE = process.env.UCL_BASE;
const TOKEN = process.env.UCL_TOKEN;
const codes = process.argv.includes('--codes')
  ? process.argv[process.argv.indexOf('--codes') + 1].split(',')
  : ['AL', 'PGL', 'PL', 'PD', 'SA', 'FL1', 'BL1', 'CL'];
if (!BASE || !TOKEN) { console.error('Set UCL_BASE and UCL_TOKEN in the environment.'); process.exit(1); }
const enc = encodeURIComponent;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const json = async (u) => { try { const r = await fetch(u, { signal: AbortSignal.timeout(25000) }); return await r.json(); } catch (e) { return { err: e.message }; } };

// Resolve EN club name -> Persian display name via en.wikipedia search -> fa langlink.
// Returns { fa, enTitle } or { enTitle:null } on failure. Retries a couple times for
// anonymous rate-limit flakiness.
async function faName(englishName) {
  const strip = (t) => String(t || '').replace(/^باشگاه فوتبال\s*/, '').trim();
  for (let attempt = 0; attempt < 3; attempt++) {
    let enTitle = null;
    for (const q of [englishName, englishName + ' football club']) {
      const s = await json('https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&srsearch=' + enc(q) + '&format=json&origin=*');
      if (s.query && s.query.search && s.query.search[0]) { enTitle = s.query.search[0].title; break; }
      await sleep(900);
    }
    if (!enTitle) { await sleep(900); continue; }
    const ll = await json('https://en.wikipedia.org/w/api.php?action=query&titles=' + enc(enTitle) + '&prop=langlinks&lllang=fa&format=json&origin=*&lllimit=1');
    const page = ll.query && ll.query.pages ? Object.values(ll.query.pages)[0] : null;
    const fa = page && page.langlinks && page.langlinks[0] ? page.langlinks[0]['*'] : null;
    if (fa) return { fa: strip(fa), enTitle };
    await sleep(900);
  }
  return { fa: null, enTitle: null };
}

(async () => {
  const H = { Authorization: 'Bearer ' + TOKEN };
  const clubs = new Map(); // en -> display fa (resolved)
  for (const code of codes) {
    const r = await fetch(BASE + '/api/standings?code=' + code, { headers: H }).catch(() => null);
    if (!r) { console.log('-- ' + code + ': no response'); continue; }
    const j = await r.json().catch(() => ({}));
    for (const t of j.teams || []) if (t.name && !clubs.has(t.name)) clubs.set(t.name, null);
  }
  // Also union in the live match pool (for clubs not in standings)
  try {
    const d = await (await fetch(BASE + '/api/public-matches')).json();
    for (const m of [...(d.upcoming || []), ...(d.finished || [])]) {
      for (const s of ['homeTeam', 'awayTeam']) if (m[s] && m[s].name && !clubs.has(m[s].name)) clubs.set(m[s].name, null);
    }
  } catch (e) {}

  const names = [...clubs.keys()].sort();
  console.log('// Resolving ' + names.length + ' clubs via Persian Wikipedia...');
  const out = [];
  let ok = 0;
  for (const n of names) {
    const res = await faName(n);
    if (res.fa) { out.push({ en: n, fa: res.fa }); ok++; }
    else console.log('//   (no fa) ' + n);
    await sleep(900); // pace for wikipedia's anonymous rate limit
  }
  console.log('// Resolved ' + ok + '/' + names.length + '\n');
  for (const o of out) console.log('    "' + o.en.replace(/"/g, '\\"') + '": "' + o.fa.replace(/"/g, '\\"') + '",');
})().catch((e) => { console.error(e); process.exit(1); });
