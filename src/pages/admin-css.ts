// SportSignal — the /admin dashboard CSS (extracted from the old 683-line
// admin.ts monolith in v13.83). Byte-frozen by scripts/check-admin-parity.js
// (the composed ADMIN_PAGE output must stay byte-identical).

export const ADMIN_MAIN_STYLE = `<style>
:root{color-scheme:dark;--bg:#0f172a;--card:#1e293b;--field:#0f172a;--text:#e2e8f0;--muted:#94a3b8;--border:#334155;--accent:#2563eb;--accent-strong:#1d4ed8;--link:#93c5fd;--score:#4ade80;--danger:#f87171;--chip:#334155;--hover:rgba(148,163,184,.08);--glass:rgba(30,41,59,.55);--glass-border:rgba(148,163,184,.16);--glass-hi:rgba(255,255,255,.07);--glass-shadow:0 8px 32px rgba(0,0,0,.35);--glow1:rgba(37,99,235,.17);--glow2:rgba(29,78,216,.11);--scrim:rgba(2,6,23,.62);--badge-live:#22c55e}
[data-theme="light"]{color-scheme:light;--bg:#f8fafc;--card:#ffffff;--field:#f8fafc;--text:#0f172a;--muted:#64748b;--border:#e2e8f0;--accent:#2563eb;--accent-strong:#1d4ed8;--link:#1d4ed8;--score:#15803d;--danger:#dc2626;--chip:#e2e8f0;--hover:rgba(15,23,42,.045);--glass:rgba(255,255,255,.62);--glass-border:rgba(15,23,42,.08);--glass-hi:rgba(255,255,255,.7);--glass-shadow:0 8px 32px rgba(15,23,42,.08);--glow1:rgba(37,99,235,.09);--glow2:rgba(96,165,250,.08);--scrim:rgba(248,250,252,.78);--badge-live:#22c55e}
body{font-family:'Vazirmatn',system-ui,sans-serif;background-color:var(--bg);color:var(--text);max-width:760px;margin:0 auto;padding:24px 20px 36px;line-height:1.6;transition:background .25s,color .25s}body::before{content:"";position:fixed;inset:0;z-index:-1;background:radial-gradient(900px 520px at 88% -8%,var(--glow1),transparent 60%),radial-gradient(820px 620px at -12% 32%,var(--glow2),transparent 60%),linear-gradient(var(--scrim),var(--scrim)),url('/bg.jpg') center/cover no-repeat}
#topbar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:22px}
#topbar button{background:var(--glass);-webkit-backdrop-filter:blur(10px) saturate(1.3);backdrop-filter:blur(10px) saturate(1.3);color:var(--text);border:1px solid var(--glass-border);border-radius:10px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:border-color .15s,transform .15s cubic-bezier(.16,1,.3,1),background .15s}
#topbar button:hover{border-color:var(--accent);background:var(--hover)}
#topbar button:active{transform:scale(.96)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
h1{font-size:27px;font-weight:800;letter-spacing:-.01em}h2{font-size:15px;font-weight:700;margin:0 0 10px}
.card{background:var(--glass);-webkit-backdrop-filter:blur(16px) saturate(1.4);backdrop-filter:blur(16px) saturate(1.4);border:1px solid var(--glass-border);border-radius:16px;padding:18px;margin:14px 0;box-shadow:var(--glass-shadow),inset 0 1px 0 var(--glass-hi)}
input,button{font-size:14px;padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:var(--field);color:var(--text);box-sizing:border-box;font-family:inherit}
input{width:100%;margin:4px 0 10px}
button{background:var(--accent);border:none;cursor:pointer;margin:4px 4px 0 0;color:#fff;transition:background .15s,transform .15s cubic-bezier(.16,1,.3,1);font-family:inherit}
button:hover{background:var(--accent-strong)}
button:active{transform:scale(.98)}
.chip{display:inline-flex;align-items:center;gap:6px;background:var(--chip);border-radius:999px;padding:4px 12px;margin:4px 4px 0 0;font-size:13px}
.chip button{background:none;color:var(--muted);padding:0 2px;margin:0}
.chip button:hover{color:var(--danger)}
label{display:block;font-size:13px;color:var(--muted);margin:10px 0 2px}
.row{display:flex;gap:8px}.row input{flex:1}
/* v12.14: club-name autocomplete dropdown (attached to every "add club" input) */
.acwrap{position:relative}
.acbox{position:absolute;top:100%;left:0;right:0;margin-top:2px;z-index:6;background:var(--card);border:1px solid var(--border);border-radius:10px;box-shadow:var(--glass-shadow);max-height:262px;overflow-y:auto;display:none}
.acbox.open{display:block}
.acitem{display:flex;align-items:center;gap:8px;padding:8px 10px;font-size:13px;cursor:pointer;border-bottom:1px solid var(--border);flex-wrap:wrap}
.acitem:last-child,.acnone{border-bottom:none}
.acitem.hi,.acitem:hover{background:var(--hover)}
.acitem img{width:20px;height:20px;flex:0 0 20px;object-fit:contain}
.acitem img.noimg{visibility:hidden}
.acitem .nm{font-weight:600}
.acitem .sh{color:var(--muted);font-size:11px}
.acitem .lgs{margin-inline-start:auto;display:flex;gap:3px;flex:0 0 auto}
.acitem .lgs span{background:var(--chip);color:var(--muted);border-radius:5px;padding:1px 5px;font-size:10px;line-height:1.5}
.acnone{padding:8px 10px}
#clubsMeta{margin-top:6px}
#msg{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:var(--score);color:#fff;padding:10px 20px;border-radius:10px;display:none;z-index:9}
#status{font-size:14px;line-height:1.9}
.muted{color:var(--muted);font-size:12px}
.match{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;border-radius:8px}
.match:last-child{border-bottom:none}
.match:hover{background:var(--hover)}
.match .teams{font-weight:600}
.match .when{color:var(--muted);font-size:12px;text-align:left}
/* v12.16: bot members directory rows \u2014 telegram id / @slug / name / joined. */
.membox{max-height:330px;overflow-y:auto;border:1px solid var(--border);border-radius:10px;margin:2px 0 8px;background:var(--field)}
.memhead,.memrow{display:grid;grid-template-columns:110px 1fr 1fr 84px;gap:6px;align-items:center;padding:7px 10px;font-size:12px}
.memhead{position:sticky;top:0;background:var(--card);border-bottom:1px solid var(--border);font-weight:700;color:var(--muted);z-index:1}
.memrow{border-bottom:1px solid var(--border)}
.memrow:last-child{border-bottom:none}
.memrow:hover{background:var(--hover)}
.mid{font-variant-numeric:tabular-nums;font-weight:700;direction:ltr;text-align:left}
.slug{color:var(--link);direction:ltr;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mname{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mdate{color:var(--muted);font-size:11px;direction:ltr;text-align:left}
@media (max-width:600px){.memhead,.memrow{grid-template-columns:96px 1fr 70px}.memhead .hname,.memrow .mname{display:none}}
/* v12.17: AI-learned Farsi club names \u2014 sample list of learned pairs. */
.faibox{max-height:260px;overflow-y:auto;border:1px solid var(--border);border-radius:10px;margin:2px 0 8px;background:var(--field)}
.fairow{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 10px;font-size:12px;border-bottom:1px solid var(--border)}
.fairow:last-child{border-bottom:none}
.fairow:hover{background:var(--hover)}
.fairow .fen{color:var(--muted);direction:ltr;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fairow .ffa{font-weight:700;white-space:nowrap}
/* v13.57-uniqueregions: admin visitor-stats card \u2014 online now +
   views/unique chips (today/yesterday/7d/30d/all-time) + a 90-day per-day
   bar breakdown + today + 30-day country tables. */
.statcards{display:flex;flex-wrap:wrap;gap:8px;margin:2px 0 10px}
.statcard{background:var(--field);border:1px solid var(--border);border-radius:10px;padding:8px 12px;min-width:92px;text-align:center}
.statnum{font-size:18px;font-weight:800;font-variant-numeric:tabular-nums;direction:ltr}
.statnum.live{color:var(--badge-live)}
.statlbl{font-size:11px;color:var(--muted);margin-top:2px}
.statsec{margin:10px 0 2px;font-size:12px;color:var(--muted);font-weight:600}
.statbox{max-height:300px;overflow-y:auto;border:1px solid var(--border);border-radius:10px;margin:2px 0 8px;background:var(--field)}
.statrow{display:grid;grid-template-columns:90px 1fr 1fr 58px;gap:8px;align-items:center;padding:6px 10px;font-size:12px;border-bottom:1px solid var(--border)}
.statrow:last-child{border-bottom:none}
.statrow .sday{direction:ltr;text-align:left;color:var(--muted)}
.statrow .sbar{height:7px;background:var(--accent);border-radius:4px;min-width:2px;opacity:.8}
.statrow .sbar2{height:7px;background:var(--badge-live);border-radius:4px;min-width:2px;opacity:.7}
.statrow .sval{font-variant-numeric:tabular-nums;font-weight:700;text-align:left;direction:ltr}
.statrow .sval2{font-variant-numeric:tabular-nums;font-weight:600;text-align:left;direction:ltr;color:var(--muted);font-size:11px}
.ccountry{display:flex;align-items:center;gap:6px}
.ccountry .cflag{font-size:1.05em}
.ctbl{width:100%;border-collapse:collapse;font-size:12px;margin:2px 0 8px}
.ctbl th,.ctbl td{padding:5px 8px;text-align:start;border-bottom:1px solid var(--border)}
.ctbl th{color:var(--muted);font-weight:600;font-size:11px}
.ctbl .cnum{font-variant-numeric:tabular-nums;font-weight:700;direction:ltr;text-align:left}
.ctbl .cpct{color:var(--muted);direction:ltr;text-align:left;width:3.5em}
@media (max-width:600px){
body{padding:16px 12px 28px;background-attachment:scroll}
h1{font-size:23px}
.card{padding:14px 12px}
.row{flex-direction:column;gap:4px}
.row button{width:100%}
button{width:100%}
#topbar button{width:auto;padding:7px 12px}
.chip button{width:auto}
.match{flex-wrap:wrap;gap:4px;padding:8px 2px}
.match .when{width:100%;text-align:left}
#msg{left:12px;right:12px;transform:none;text-align:center}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
@media (prefers-reduced-transparency:reduce){body{background:var(--bg)}.card,#topbar button{background:var(--card);-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:0 1px 2px rgba(15,23,42,.05)}}
</style>`;
