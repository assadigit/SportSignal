// SportSignal — the /admin login page. v13.83: theme-init + font-face
// moved to styles-shared.ts (byte-identical interpolation).

import { THEME_INIT_SCRIPT, FONT_FACES_STYLE } from "./styles-shared";
// SportSignal — the /admin login page template.


export const LOGIN_PAGE = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${THEME_INIT_SCRIPT}
<title data-i="titleL">\u0648\u0631\u0648\u062F \u2014 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0631\u0628\u0627\u062A</title>
${FONT_FACES_STYLE}
<style>
:root{color-scheme:dark;--bg:#0f172a;--card:#1e293b;--field:#0f172a;--text:#e2e8f0;--muted:#94a3b8;--border:#334155;--accent:#2563eb;--accent-strong:#1d4ed8;--danger:#f87171;--hover:rgba(148,163,184,.08);--glass:rgba(30,41,59,.55);--glass-border:rgba(148,163,184,.16);--glass-hi:rgba(255,255,255,.07);--glass-shadow:0 8px 32px rgba(0,0,0,.35);--glow1:rgba(37,99,235,.17);--glow2:rgba(29,78,216,.11);--scrim:rgba(2,6,23,.62);}
[data-theme="light"]{color-scheme:light;--bg:#f8fafc;--card:#ffffff;--field:#f8fafc;--text:#0f172a;--muted:#64748b;--border:#e2e8f0;--accent:#2563eb;--accent-strong:#1d4ed8;--danger:#dc2626;--hover:rgba(15,23,42,.045);--glass:rgba(255,255,255,.62);--glass-border:rgba(15,23,42,.08);--glass-hi:rgba(255,255,255,.7);--glass-shadow:0 8px 32px rgba(15,23,42,.08);--glow1:rgba(37,99,235,.09);--glow2:rgba(96,165,250,.08);--scrim:rgba(248,250,252,.78);}
body{font-family:'Vazirmatn',system-ui,sans-serif;background-color:var(--bg);color:var(--text);display:flex;align-items:center;justify-content:center;min-height:100vh;min-height:100dvh;margin:0;padding:16px;transition:background .25s,color .25s}body::before{content:"";position:fixed;inset:0;z-index:-1;background:radial-gradient(900px 520px at 88% -8%,var(--glow1),transparent 60%),radial-gradient(820px 620px at -12% 32%,var(--glow2),transparent 60%),linear-gradient(var(--scrim),var(--scrim)),url('/bg.jpg') center/cover no-repeat}
#topbar{position:fixed;top:12px;right:12px;left:12px;display:flex;justify-content:space-between;align-items:center}
#topbar button{background:var(--glass);-webkit-backdrop-filter:blur(10px) saturate(1.3);backdrop-filter:blur(10px) saturate(1.3);color:var(--text);border:1px solid var(--glass-border);border-radius:10px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:border-color .15s,transform .15s cubic-bezier(.16,1,.3,1),background .15s}
#topbar button:hover{border-color:var(--accent);background:var(--hover)}
#topbar button:active{transform:scale(.96)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.login{background:var(--glass);-webkit-backdrop-filter:blur(16px) saturate(1.4);backdrop-filter:blur(16px) saturate(1.4);border:1px solid var(--glass-border);border-radius:16px;padding:28px;width:320px;max-width:100%;box-shadow:var(--glass-shadow),inset 0 1px 0 var(--glass-hi)}
h1{font-size:20px;font-weight:800;margin:0 0 16px;text-align:center}
input{font-size:15px;padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:var(--field);color:var(--text);box-sizing:border-box;width:100%;margin:4px 0 10px;display:block;font-family:inherit}
button{font-size:15px;padding:9px 12px;border-radius:10px;border:none;background:var(--accent);color:#fff;cursor:pointer;width:100%;transition:background .15s,transform .15s cubic-bezier(.16,1,.3,1);font-family:inherit}
button:hover{background:var(--accent-strong)}
button:active{transform:scale(.98)}
.err{color:var(--danger);font-size:13px;margin-top:10px;display:none;text-align:center}
label{display:block;font-size:13px;color:var(--muted)}
@media (max-width:600px){
body{padding:12px;background-attachment:scroll}
.login{padding:22px 16px}
h1{font-size:18px}
#topbar button{padding:7px 12px}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
@media (prefers-reduced-transparency:reduce){body{background:var(--bg)}.login,#topbar button{background:var(--card);-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:0 1px 2px rgba(15,23,42,.05)}}
</style>
</head>
<body>
<div id="topbar"><button id="lbtn" onclick="switchLang()"></button><button id="tbtn" onclick="toggleTheme()"></button></div>
<div class="login">
<h1 data-i="loginH1">\u{1F510} \u0648\u0631\u0648\u062F \u0628\u0647 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0631\u0628\u0627\u062A</h1>
<label for="user" data-i="lbUser">\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC</label>
<input id="user" name="username" autocomplete="username" data-p="lbUser">
<label for="pass" data-i="lbPass">\u0631\u0645\u0632 \u0639\u0628\u0648\u0631</label>
<input id="pass" name="password" type="password" autocomplete="current-password" data-p="lbPass">
<button id="btnLogin" onclick="doLogin()" data-i="btnLogin">\u0648\u0631\u0648\u062F</button>
<div class="err" id="err" role="alert"></div>
</div>
<script src="/core-13.15.js"><\/script>
<script>
function err(t){ var e=document.getElementById("err"); e.textContent=t; e.style.display="block"; }
async function doLogin(){
  var btn=document.getElementById("btnLogin");
  if(btn.disabled) return;
  var u=document.getElementById("user").value.trim();
  var p=document.getElementById("pass").value;
  if(!u){ err(T("errUser")); return; }
  btn.disabled=true;
  var r=await fetch("/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({username:u,password:p})});
  if(r.status===429){ btn.disabled=false; err(T("errRate")); return; }
  if(!r.ok){ btn.disabled=false; err(T("errCreds")); return; }
  // v13.30-login-fix: the session cookie is a stateless HMAC-signed token —
  // it verifies on the next request with zero KV reads, so a short delay is
  // no longer required for correctness. Kept (150ms) purely as a UX beat so
  // the button's disabled state is perceivable before the reload.
  setTimeout(function(){ location.reload(); }, 150);
}
document.getElementById("pass").addEventListener("keydown",function(e){ if(e.key==="Enter") doLogin(); });
setTheme(initTheme()); applyLang(true);
<\/script>
</body></html>`;
