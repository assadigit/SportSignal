// SportSignal — the /admin dashboard inline JS (login, settings editor,
// club autocomplete, members, AI Farsi names, broadcast, upcoming matches,
// visitor stats). Extracted from the old admin.ts monolith in v13.83.

export const ADMIN_SCRIPT = `// (Audit fix 8: auth is the HttpOnly session cookie — no token in JS.)
var STATE = null;
var lastUsers = null;
var LNAMES = {CL:"\u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627",PL:"\u0644\u06CC\u06AF \u0628\u0631\u062A\u0631 \u0627\u0646\u06AF\u0644\u0633\u062A\u0627\u0646",PD:"\u0644\u0627\u0644\u06CC\u06AF\u0627",SA:"\u0633\u0631\u06CC \u0622",FL1:"\u0644\u06CC\u06AF \u06CC\u06A9 \u0641\u0631\u0627\u0646\u0633\u0647",BL1:"\u0628\u0648\u0646\u062F\u0633\u200C\u0644\u06CC\u06AF\u0627",EL:"\u0644\u06CC\u06AF \u0627\u0631\u0648\u067E\u0627",ECL:"\u0644\u06CC\u06AF \u06A9\u0646\u0641\u0631\u0627\u0646\u0633",FA_CUP:"\u062C\u0627\u0645 \u062D\u0630\u0641\u06CC \u0627\u0646\u06AF\u0644\u0633\u062A\u0627\u0646",EFL_CUP:"\u062C\u0627\u0645 \u0627\u062A\u062D\u0627\u062F\u06CC\u0647 \u0627\u0646\u06AF\u0644\u0633\u062A\u0627\u0646",CDR:"\u062C\u0627\u0645 \u062D\u0630\u0641\u06CC \u0627\u0633\u067E\u0627\u0646\u06CC\u0627",COPPA_ITALIA:"\u062C\u0627\u0645 \u062D\u0630\u0641\u06CC \u0627\u06CC\u062A\u0627\u0644\u06CC\u0627"};
var LNAMES_EN = {CL:"Champions League",PL:"Premier League",PD:"La Liga",SA:"Serie A",FL1:"Ligue 1",BL1:"Bundesliga",EL:"Europa League",ECL:"Conference League",FA_CUP:"FA Cup",EFL_CUP:"EFL Cup",CDR:"Copa del Rey",COPPA_ITALIA:"Coppa Italia",DFB_POKAL:"DFB Pokal"};
function lname(l){return curLang()==="en"?(LNAMES_EN[l]||l):(LNAMES[l]||l);}
function hd(){ var h = new Headers(); h.append("Content-Type","application/json"); return h; }
async function api(url, method, body){
  var r = await fetch(url,{method:method||"GET",headers:hd(),credentials:"same-origin",body:body?JSON.stringify(body):undefined});
  if(r.status===401){ msg(T("mToken")); return null; }
  if(!r.ok){ msg(fmt("mErr")+r.status); return null; }
  return r.json();
}
function login(){
  var p = document.getElementById("token").value;
  if(!p){ msg(T("mEnterToken")); return; }
  fetch("/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({username:"admin",password:p})}).then(function(r){ return r.ok ? r.json() : null; }).then(function(r){
    if(!r){ msg(T("mToken")); return; }
    try{ localStorage.removeItem("admin_token"); }catch(e){}
    // v13.11-admin-fix: wait 400ms so the session KV write is visible on the
    // API calls below (KV eventual consistency).
    setTimeout(function(){ load(); refreshStatus(); loadNextMatches(); loadMembers(); }, 400);
  }).catch(function(){ msg(T("mErr")); });
}
function msg(t){ var m=document.getElementById("msg"); m.textContent=t; m.style.display="block"; setTimeout(function(){m.style.display="none";},2500); }
async function load(){
  var s = await api("/api/settings");
  if(!s) return;
  STATE = s;
  document.getElementById("tz").value = s.timezone || "Asia/Tehran";
  document.getElementById("leagues").value = (s.leagues||[]).join(",");
  renderTeams();
  loadClubsMeta();
}
function renderTeams(){
  var el = document.getElementById("teams"); el.innerHTML = "";
  var all = {};
  (STATE.leagues||[]).forEach(function(l){ all[l] = []; });
  Object.keys(STATE.teams||{}).forEach(function(l){ all[l] = STATE.teams[l]||[]; });
  Object.keys(all).forEach(function(l){
    var box = document.createElement("div");
    var label = document.createElement("label"); label.textContent = lname(l);
    box.appendChild(label);
    // v12.15: the CL box is auto-populated from every league \u2014 say so.
    if(l==="CL"){
      var uh = document.createElement("div"); uh.className = "muted";
      uh.textContent = T("uclSync");
      box.appendChild(uh);
    }
    var chips = document.createElement("div");
    (all[l]||[]).forEach(function(t){
      var c = document.createElement("span"); c.className="chip"; c.textContent = t;
      var x = document.createElement("button"); x.textContent="\u2715"; x.type="button"; x.setAttribute("aria-label",(curLang()==="en"?"Remove ":"\u062D\u0630\u0641 ")+t);
      x.onclick = function(){ STATE.teams[l]=(STATE.teams[l]||[]).filter(function(y){return y!==t;}); renderTeams(); };
      c.appendChild(x); chips.appendChild(c);
    });
    box.appendChild(chips);
    // v12.14: the add-club row is an autocomplete wrap \u2014 typing \u22652 chars queries
    // /api/clubs and the dropdown offers the EXACT provider names (crest +
    // short name + league badges); picking one stores the chip instantly.
    var row = document.createElement("div"); row.className="row acwrap";
    var inp = document.createElement("input"); inp.placeholder = T("teamPh");
    inp.setAttribute("autocomplete","off");
    inp.setAttribute("data-lg", l);
    inp.setAttribute("role","combobox");
    inp.setAttribute("aria-autocomplete","list");
    inp.setAttribute("aria-expanded","false");
    var dd = document.createElement("div"); dd.className="acbox"; dd.setAttribute("role","listbox");
    var btn = document.createElement("button"); btn.textContent = T("btnAdd");
    btn.onclick = function(){ addTeamFor(l, inp.value.trim()); };
    attachClubsAc(inp, dd, l, function(name){ addTeamFor(l, name); });
    row.appendChild(inp); row.appendChild(btn); row.appendChild(dd); box.appendChild(row);
    el.appendChild(box);
  });
}
// v12.15: name-variant duplicate guard + UCL auto-selection. anorm()
// mirrors the worker's normalizeTeamName + TEAM_ALIASES fold (case /
// diacritics / punctuation / club-prefix tokens), so "Bayern Munich" and
// "FC Bayern M\xFCnchen" are recognized as the SAME club \u2014 one chip per
// club, and the duplicate toast names the EXISTING entry.
// v13.102-bayernfix: the bayern fold direction FLIPPED to match the worker's
// TRANSLIT_FOLDS (munchen\u2192munich, applied inside normalizeTeamName). The
// old bayernmunich\u2192bayernmunchen entry mirrored the pre-v13.8 server alias
// and left the two spellings on OPPOSITE keys client-side vs server-side.
var AC_TOKENS = /^(fc|cf|sc|ac|as|ssc|bc|ud|cd|kv|jc|fk|nk|gnk|msk|sk|sl|rsc|bsc|jk|tc|pfc|sv|tsg)$/;
var AC_ALIAS = { clubatleticodemadrid:"atleticomadrid", atleticodemadrid:"atleticomadrid", internazionale:"intermilan", internazionalemilano:"intermilan", bayernmunchen:"bayernmunich" };
function anorm(s){
  var n = String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036F]/g,"");
  var parts = n.split(/[^a-z0-9]+/).filter(function(p){ return p && !AC_TOKENS.test(p); });
  n = parts.join("");
  return AC_ALIAS[n] || n;
}
function addTeamFor(l, v){
  if(!v) return;
  STATE.teams[l]=STATE.teams[l]||[];
  var k=anorm(v), ex=null;
  for(var i=0;i<STATE.teams[l].length;i++){ if(anorm(STATE.teams[l][i])===k){ ex=STATE.teams[l][i]; break; } }
  if(ex){ msg(fmt("acDup",ex)); return; }
  STATE.teams[l].push(v);
  // v12.15 (the user's rule): every club added in ANY league box is also
  // selected for the Champions League \u2014 its UCL matches then surface (UCL
  // box, standings \u2B50, notifications) with zero extra clicks.
  var uclToo = false;
  if(l!=="CL"){
    STATE.teams.CL = STATE.teams.CL || [];
    var has = STATE.teams.CL.some(function(y){ return anorm(y)===k; });
    if(!has){ STATE.teams.CL.push(v); uclToo = true; }
  }
  msg(uclToo ? fmt("acAddUcl",v) : fmt("acAdd",v));
  renderTeams();
  var again = document.querySelector('#teams input[data-lg="'+l+'"]');
  if(again) again.focus();
}
// v12.14 club autocomplete engine: debounced /api/clubs queries (170ms),
// keyboard navigation (arrows/Enter/Esc), crest + short-name + league badges
// per row, first suggestion pre-highlighted so "type Ro, press Enter" stores
// the club with the exact API name. Free-typed names still work via the add
// button \u2014 the catalog is a guardrail, not a gate.
function attachClubsAc(inp, dd, lg, onPick){
  var timer=null, seq=0, items=[], hi=-1;
  function close(){ dd.classList.remove("open"); dd.innerHTML=""; items=[]; hi=-1; inp.setAttribute("aria-expanded","false"); }
  function paint(){
    for(var i=0;i<dd.children.length;i++) dd.children[i].classList.toggle("hi", i===hi);
    if(dd.children[hi] && dd.children[hi].scrollIntoView) dd.children[hi].scrollIntoView({block:"nearest"});
  }
  function pick(it){ close(); onPick(it.name); }
  function show(list){
    items=list; hi=list.length?0:-1; dd.innerHTML="";
    if(!list.length){
      var d=document.createElement("div"); d.className="acnone muted"; d.textContent=T("acNone");
      dd.appendChild(d); dd.classList.add("open"); inp.setAttribute("aria-expanded","true"); return;
    }
    list.forEach(function(it){
      var d=document.createElement("div"); d.className="acitem"; d.setAttribute("role","option");
      var img=document.createElement("img"); img.alt=""; img.loading="lazy";
      if(it.crest){ img.src=it.crest; } else { img.className="noimg"; }
      img.onerror=function(){ img.className="noimg"; };
      var nm=document.createElement("span"); nm.className="nm"; nm.textContent=it.name;
      d.appendChild(img); d.appendChild(nm);
      if(it.short){ var sh=document.createElement("span"); sh.className="sh"; sh.textContent=it.short; d.appendChild(sh); }
      var lgs=document.createElement("span"); lgs.className="lgs";
      (it.leagues||[]).forEach(function(x){ var s=document.createElement("span"); s.textContent=x; lgs.appendChild(s); });
      if(lgs.children.length) d.appendChild(lgs);
      d.addEventListener("mousedown", function(ev){ ev.preventDefault(); pick(it); });
      dd.appendChild(d);
    });
    dd.classList.add("open"); inp.setAttribute("aria-expanded","true"); paint();
  }
  function query(v){
    var my=++seq;
    api("/api/clubs?q="+encodeURIComponent(v)+"&hint="+encodeURIComponent(lg)).then(function(r){
      if(my!==seq || !r || !r.ok) return;
      show(r.results||[]);
    }).catch(function(){});
  }
  inp.addEventListener("input", function(){
    var v=inp.value.trim();
    if(timer) clearTimeout(timer);
    if(v.length<2){ close(); return; }
    timer=setTimeout(function(){ query(v); },170);
  });
  inp.addEventListener("keydown", function(ev){
    if(ev.key==="ArrowDown"||ev.key==="ArrowUp"){
      if(!items.length) return;
      ev.preventDefault();
      hi=ev.key==="ArrowDown"?(hi+1)%items.length:(hi<=0?items.length-1:hi-1);
      paint();
    } else if(ev.key==="Enter"){
      if(items.length && dd.classList.contains("open")){ ev.preventDefault(); pick(items[hi<0?0:hi]); }
    } else if(ev.key==="Escape"){ close(); }
  });
  inp.addEventListener("blur", function(){ setTimeout(close,200); });
}
async function loadClubsMeta(){
  var el=document.getElementById("clubsMeta"); if(!el) return;
  var r=await api("/api/clubs");
  if(!r){ el.textContent=""; return; }
  if(!r.ok || !r.count){ el.textContent=T("clubsNone"); return; }
  el.textContent=fmt("clubsMeta", String(r.count), (r.fetchedAt||"").slice(0,10));
}
function refreshClubs(){
  if(busy("btnClubs")) return;
  api("/api/clubs?refresh=1").then(function(r){
    done("btnClubs");
    if(!r || !r.ok || !r.count){ msg(T("clubsErr")); return; }
    msg(fmt("mClubs", String(r.count)));
    loadClubsMeta();
  }).catch(function(){ done("btnClubs"); msg(T("clubsErr")); });
}
function save(){
  if(!STATE){ msg(T("mLoginFirst")); return; }
  STATE.timezone = document.getElementById("tz").value.trim() || "Asia/Tehran";
  STATE.leagues = document.getElementById("leagues").value.split(",").map(function(x){return x.trim().toUpperCase();}).filter(Boolean);
  api("/api/settings","PUT",STATE).then(function(s){ if(s){ STATE=s; renderTeams(); msg(T("mSaved")); } });
}
function backup(){
  if(!STATE){ msg(T("mLoginFirst")); return; }
  var blob = new Blob([JSON.stringify(STATE,null,2)],{type:"application/json"});
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "ucl-notifier-settings-backup.json"; a.click();
  msg(T("mBackup"));
}
function changePass(){
  var a = document.getElementById("np1").value, b = document.getElementById("np2").value;
  if(!a || a.length < 8){ msg(T("mPassShort")); return; }
  if(a !== b){ msg(T("mPassMismatch")); return; }
  api("/admin/change-password","POST",{password:a}).then(function(r){ if(r) msg(T("mPassOk")); });
}
async function refreshStatus(){
  var s = await api("/api/status");
  if(!s){ document.getElementById("status").innerHTML = T("stErr"); return; }
  lastUsers = s.users != null ? s.users : lastUsers;
  document.getElementById("status").innerHTML =
    T("stLastRun")+": "+(s.last_cron||"\u2014")+"<br>"+
    T("stApi")+": "+(s.api_source||"\u2014")+"<br>"+
    T("stUsers")+": "+s.users+"<br>"+
    (s.chat_ids && s.chat_ids.length ? T("stIds")+": "+s.chat_ids.join(curLang()==="en"?", ":"\u060C ")+"<br>" : "")+
    T("stTz")+": "+s.timezone;
}
function busy(id){ var b=document.getElementById(id); if(!b||b.dataset.busy) return true; b.dataset.busy="1"; b.disabled=true; return false; }
function done(id){ var b=document.getElementById(id); if(!b) return; delete b.dataset.busy; b.disabled=false; }
function broadcast(){
  var t = document.getElementById("broadcastText").value.trim();
  if(!t){ msg(T("mEnterText")); return; }
  if(!confirm(curLang()==="en"?"Send to all "+lastUsers+" user(s)?":"\u0628\u0631\u0627\u06CC \u0647\u0645\u0647 \u06A9\u0627\u0631\u0628\u0631\u0627\u0646 \u0627\u0631\u0633\u0627\u0644 \u0634\u0648\u062F\u061F ("+(lastUsers==null?"\u061F":lastUsers)+" \u06A9\u0627\u0631\u0628\u0631)")) return;
  if(busy("btnBroadcast")) return;
  api("/api/broadcast","POST",{text:t}).then(function(r){ if(r) msg(fmt("mSentTo",r.sent,r.total)); }).catch(function(){ msg(T("mErr")); }).then(function(){ done("btnBroadcast"); });
}
function sendTest(){
  if(busy("btnTest")) return;
  api("/api/test","POST",{}).then(function(r){ if(r) msg(fmt("mTestSent",r.sent)); }).catch(function(){ msg(T("mErr")); }).then(function(){ done("btnTest"); });
}
function simulate(){
  if(busy("btnSim")) return;
  api("/api/simulate","POST",{}).then(function(r){
    if(!r) return;
    var t = "";
    if(r.failures && r.failures.length){ t = "\u274C " + r.failures.join(" ; "); }
    if(r.passed) t = "\u2705 " + (curLang()==="en"?"All "+r.probes.length+" tests passed":"\u0647\u0631 "+r.probes.length+" \u062A\u0633\u062A \u0645\u0648\u0641\u0642");
    var keys = Object.keys(r.sent||{});
    if(!keys.length && !t){ msg(T("mNoNotif")); return; }
    msg(t);
  }).catch(function(){ msg(T("mErr")); }).then(function(){ done("btnSim"); });
}
function checkSources(){
  api("/api/sources").then(function(r){
    if(!r) return;
    var en = curLang()==="en";
    var t = "\u{1F4E1} ";
    Object.keys(r).forEach(function(k){
      t += k+": "+(r[k].ok ? r[k].matches+(en?" games (":" \u0628\u0627\u0632\u06CC (")+r[k].worthy+(en?" worthy)":" \u0645\u0637\u0644\u0648\u0628)") : T("mErrSrc"))+" | ";
    });
    msg(t);
  });
}
// v12.16: bot members directory \u2014 /api/members (admin-gated) feeds the card:
// telegram id, @username ("slug"), display name, join date. Cached in-page;
// the \u{1F504} button re-fetches (the worker backfills unknown members via getChat,
// \u226440 per call, cached into KV so each member is fetched at most once).
var MEMBERS = null;
function faNum(s){ return curLang()==="fa" ? String(s).replace(/[0-9]/g, function(d){ return "\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9"[+d]; }) : String(s); }
async function loadMembers(force){
  var el = document.getElementById("members");
  if(!el) return;
  if(!force && MEMBERS){ renderMembers(); return; }
  if(force && busy("btnMembers")) return;
  el.textContent = T("stLoading");
  var d = await api("/api/members");
  if(force) done("btnMembers");
  if(!d){ el.textContent = "\u2014"; return; }
  MEMBERS = d;
  renderMembers();
}
function renderMembers(){
  var el = document.getElementById("members");
  if(!el) return;
  el.innerHTML = "";
  var d = MEMBERS;
  if(!d || !d.members || !d.members.length){
    var e = document.createElement("div"); e.className = "muted"; e.textContent = T("membersNone");
    el.appendChild(e); return;
  }
  var box = document.createElement("div"); box.className = "membox";
  var head = document.createElement("div"); head.className = "memhead";
  [T("memId"), T("memSlug"), T("memName"), T("memJoined")].forEach(function(h, i){
    var s = document.createElement("span"); s.textContent = h; if(i === 2) s.className = "hname";
    head.appendChild(s);
  });
  box.appendChild(head);
  d.members.forEach(function(m){
    var row = document.createElement("div"); row.className = "memrow";
    var id = document.createElement("span"); id.className = "mid"; id.textContent = String(m.id);
    var slug = document.createElement("span"); slug.className = "slug"; slug.textContent = m.username ? "@" + m.username : "\u2014";
    var nm = document.createElement("span"); nm.className = "mname"; nm.textContent = m.first_name || m.title || "\u2014";
    var jd = document.createElement("span"); jd.className = "mdate"; jd.textContent = m.joined ? String(m.joined).slice(0, 10) : "\u2014";
    row.appendChild(id); row.appendChild(slug); row.appendChild(nm); row.appendChild(jd);
    box.appendChild(row);
  });
  el.appendChild(box);
  var cnt = document.createElement("div"); cnt.className = "muted"; cnt.style.marginTop = "2px";
  cnt.textContent = fmt("memCount", faNum(d.count));
  el.appendChild(cnt);
}
var onLang = function(){ refreshStatus(); loadNextMatches(); renderMembers(); loadFai(); renderStats(); };
// v12.17: \u{1F9E0} smart Farsi club names \u2014 stats + sample of the AI-learned
// dictionary; ?run=1 (the \u{1F504} button) forces one learning round now.
var FAI_BUSY = false;
async function loadFai(force){
  var el = document.getElementById("fai"), btn = document.getElementById("btnFai");
  if(!el) return;
  if(FAI_BUSY) return;
  FAI_BUSY = true;
  if(force && btn){ btn.disabled = true; btn.textContent = "\u2026"; }
  try{
    // force: FIRST trigger the learning round (toast from its result), THEN
    // re-read the stats so the card shows TOTALS + the sample list, not the
    // single round's counters.
    if(force){
      var r = await api("/api/fa-teams?run=1");
      if(r){
        if(r.ai === false) msg(T("faiOff"));
        else if(r.error) msg(T("mErr") + r.error);
        else msg(r.learned > 0 ? fmt("faiRun", faNum(r.learned)) : T("faiNoNew"));
      }
    }
    var d = await api("/api/fa-teams");
    if(!d){ el.textContent = T("mErrSrc"); return; }
    el.innerHTML = "";
    var meta = document.createElement("div"); meta.className = "muted"; meta.style.margin = "6px 0 2px";
    meta.textContent = fmt("faiMeta", faNum(d.learned || 0), faNum(d.pending || 0)) + (d.lastRun ? " \u2014 " + String(d.lastRun).slice(0, 16).replace("T", " ") : "");
    el.appendChild(meta);
    if(d.ai === false){
      var off = document.createElement("div"); off.className = "muted"; off.textContent = T("faiOff");
      el.appendChild(off);
    }
    if(d.sample && d.sample.length){
      var box = document.createElement("div"); box.className = "faibox";
      d.sample.forEach(function(s){
        var row = document.createElement("div"); row.className = "fairow";
        var en = document.createElement("span"); en.className = "fen"; en.textContent = s.key;
        var fa = document.createElement("span"); fa.className = "ffa"; fa.textContent = s.fa;
        row.appendChild(fa); row.appendChild(en);
        box.appendChild(row);
      });
      el.appendChild(box);
    } else {
      var none = document.createElement("div"); none.className = "muted"; none.style.marginTop = "4px";
      none.textContent = T("faiNone");
      el.appendChild(none);
    }
  } finally {
    FAI_BUSY = false;
    if(btn){ btn.disabled = false; }
    // skipHook=true: re-translates the static labels (restores the \u{1F504} button
    // text after its "\u2026" busy state) WITHOUT re-firing onLang \u2192 no loop.
    applyLang(true);
  }
}
async function forgetFai(){
  var inp = document.getElementById("faiForget");
  var name = inp && inp.value ? inp.value.trim() : "";
  if(!name){ msg(T("mEnterText")); return; }
  var d = await api("/api/fa-teams?forget=" + encodeURIComponent(name));
  if(d && d.ok){ msg(fmt("faiForgot", name)); inp.value = ""; loadFai(false); }
  else { msg(fmt("faiNotfound", name)); }
}
// v12.x-admin-override: set/correct a Farsi team name manually.
async function overrideFai(){
  var enEl = document.getElementById("ovrEn");
  var faEl = document.getElementById("ovrFa");
  var msgEl = document.getElementById("ovrMsg");
  var en = enEl && enEl.value ? enEl.value.trim() : "";
  var fa = faEl && faEl.value ? faEl.value.trim() : "";
  if(!en || !fa){ if(msgEl) msgEl.textContent = "Both fields required"; return; }
  if(msgEl) msgEl.textContent = "Saving...";
  var d = await api("/api/fa-teams/override", "POST", { en: en, fa: fa });
  if(d && d.ok){ if(msgEl) msgEl.textContent = "\u2705 " + d.en + " \u2192 " + d.fa; enEl.value = ""; faEl.value = ""; loadFai(false); }
  else { if(msgEl) msgEl.textContent = "\u274C " + (d && d.error ? d.error : "failed"); }
}
async function loadNextMatches(){
  var d = await api("/next-matches");
  var el = document.getElementById("matches");
  if(!d){ el.innerHTML = T("mErrMatches"); return; }
  if(!d.matches || !d.matches.length){ el.innerHTML = T("mNoMatches"); return; }
  el.innerHTML = "";
  var en = curLang()==="en";
  d.matches.forEach(function(m){
    var row = document.createElement("div"); row.className = "match";
    var t = document.createElement("span"); t.className = "teams";
    t.textContent = (en?m.home_en:m.home) + " \u2013 " + (en?m.away_en:m.away) + " \u2014 " + (en?(I18N.en.comps[m.code]||m.competition):m.competition);
    var w = document.createElement("span"); w.className = "when";
    w.textContent = (en?m.time_en:m.tehran_time) || m.utc_date || "";
    row.appendChild(t); row.appendChild(w);
    el.appendChild(row);
  });
}
async function logout(){
  await fetch("/admin/logout",{method:"POST"});
  localStorage.removeItem("admin_token");
  location.reload();
}
// v13.56-visitcount: visitor stats card \u2014 /api/stats (admin-gated) feeds
// today/yesterday/7d/30d/all-time pageviews + a 90-day per-day bar chart.
// Cookieless, IP-free, bot-filtered (see src/stats.ts + /privacy).
var STATS = null;
async function loadStats(force){
  var el = document.getElementById("stats");
  if(!el) return;
  if(!force && STATS){ renderStats(); return; }
  if(force && busy("btnStats")) return;
  el.textContent = T("stLoading");
  var d = await api("/api/stats");
  if(force) done("btnStats");
  if(!d){ el.textContent = "\u2014"; return; }
  STATS = d;
  renderStats();
}
function renderStats(){
  var el = document.getElementById("stats");
  if(!el || !STATS) return;
  var d = STATS, en = curLang()==="en";
  if(!d.configured){
    el.innerHTML = '<div class="muted">\u26A0\uFE0F STATS_DB '+(en?"not configured":"\u067E\u06CC\u06A9\u0631\u0628\u0646\u062F\u06CC \u0646\u0634\u062F\u0647")+'</div>';
    return;
  }
  var chip = function(label, val, cls){ return '<div class="statcard"><div class="statnum'+(cls?' '+cls:'')+'">'+faNum(val)+'</div><div class="statlbl">'+label+'</div></div>'; };
  var html = '<div class="statcards">';
  html += chip(en?"Online now":"\u0622\u0646\u0644\u0627\u06CC\u0646 \u0627\u06A9\u0646\u0648\u0646", d.online, "live");
  html += chip(en?"Today (views)":"\u0627\u0645\u0631\u0648\u0632 (\u0628\u0627\u0632\u062F\u06CC\u062F)", d.today_views);
  html += chip(en?"Today (unique)":"\u0627\u0645\u0631\u0648\u0632 (\u0628\u0627\u0632\u062F\u06CC\u062F\u06A9\u0646\u062F\u0647)", d.today_visitors);
  html += chip(en?"Yesterday (views)":"\u062F\u06CC\u0631\u0648\u0632 (\u0628\u0627\u0632\u062F\u06CC\u062F)", d.yesterday_views);
  html += chip(en?"Yesterday (unique)":"\u062F\u06CC\u0631\u0648\u0632 (\u0628\u0627\u0632\u062F\u06CC\u062F\u06A9\u0646\u062F\u0647)", d.yesterday_visitors);
  html += chip(en?"7d (views)":"\u06F7 \u0631\u0648\u0632 (\u0628\u0627\u0632\u062F\u06CC\u062F)", d.last_7_views);
  html += chip(en?"7d (unique)":"\u06F7 \u0631\u0648\u0632 (\u0628\u0627\u0632\u062F\u06CC\u062F\u06A9\u0646\u062F\u0647)", d.last_7_visitors);
  html += chip(en?"30d (views)":"\u06F3\u06F0 \u0631\u0648\u0632 (\u0628\u0627\u0632\u062F\u06CC\u062F)", d.last_30_views);
  html += chip(en?"30d (unique)":"\u06F3\u06F0 \u0631\u0648\u0632 (\u0628\u0627\u0632\u062F\u06CC\u062F\u06A9\u0646\u062F\u0647)", d.last_30_visitors);
  html += chip(en?"This month (views)":"\u0627\u06CC\u0646 \u0645\u0627\u0647 (\u0628\u0627\u0632\u062F\u06CC\u062F)", d.month_views);
  html += chip(en?"This month (unique)":"\u0627\u06CC\u0646 \u0645\u0627\u0647 (\u0628\u0627\u0632\u062F\u06CC\u062F\u06A9\u0646\u062F\u0647)", d.month_visitors);
  html += chip(en?"All-time (views)":"\u06A9\u0644 (\u0628\u0627\u0632\u062F\u06CC\u062F)", d.all_time_views);
  html += chip(en?"All-time (unique)":"\u06A9\u0644 (\u0628\u0627\u0632\u062F\u06CC\u062F\u06A9\u0646\u062F\u0647)", d.all_time_visitors);
  html += '</div>';
  if(d.tracking_since){
    html += '<div class="muted" style="margin:4px 0 8px;font-size:12px">'+(en?"Counting since: ":"\u0634\u0645\u0627\u0631\u0634 \u0627\u0632: ")+faNum(d.tracking_since)+'</div>';
  }
  // 90-day per-day breakdown (views bar + unique bar).
  if(d.days && d.days.length){
    var max = 1;
    for(var i=0;i<d.days.length;i++){ if(d.days[i].pageviews>max) max=d.days[i].pageviews; }
    html += '<div class="statsec">'+(en?"Per day (last 90 days) \u2014 bar: views / unique":"\u0631\u0648\u0632\u0627\u0646\u0647 (\u06F9\u06F0 \u0631\u0648\u0632 \u0627\u062E\u06CC\u0631) \u2014 \u0646\u0648\u0627\u0631: \u0628\u0627\u0632\u062F\u06CC\u062F / \u0628\u0627\u0632\u062F\u06CC\u062F\u06A9\u0646\u062F\u0647")+'</div>';
    html += '<div class="statbox">';
    d.days.forEach(function(r){
      var pct = Math.max(2, Math.round((r.pageviews/max)*100));
      var upct = max ? Math.max(2, Math.round((r.visitors/max)*100)) : 0;
      html += '<div class="statrow"><span class="sday">'+faNum(r.day)+'</span><span class="sbar" style="width:'+pct+'%"></span><span class="sbar2" style="width:'+upct+'%"></span><span class="sval">'+faNum(r.pageviews)+'</span></div>';
    });
    html += '</div>';
  }
  // Country tables.
  function countryTable(rows, title){
    if(!rows || !rows.length) return '';
    var h = '<div class="statsec">'+title+'</div>';
    h += '<table class="ctbl"><thead><tr><th>'+(en?"Country":"\u06A9\u0634\u0648\u0631")+'</th><th>'+(en?"Unique":"\u0628\u0627\u0632\u062F\u06CC\u062F\u06A9\u0646\u062F\u0647")+'</th><th>'+(en?"Views":"\u0628\u0627\u0632\u062F\u06CC\u062F")+'</th><th>%</th></tr></thead><tbody>';
    rows.forEach(function(c){
      h += '<tr><td><span class="ccountry"><span class="cflag">'+c.flag+'</span>'+c.name+'</span></td><td class="cnum">'+faNum(c.visitors)+'</td><td class="cnum">'+faNum(c.pageviews)+'</td><td class="cpct">'+faNum(c.pct)+'\u066A</td></tr>';
    });
    h += '</tbody></table>';
    return h;
  }
  html += countryTable(d.countries_today, en?"Top countries today":"\u06A9\u0634\u0648\u0631\u0647\u0627\u06CC \u0628\u0631\u062A\u0631 \u0627\u0645\u0631\u0648\u0632");
  html += countryTable(d.countries_30d, en?"Top countries (last 30 days)":"\u06A9\u0634\u0648\u0631\u0647\u0627\u06CC \u0628\u0631\u062A\u0631 (\u06F3\u06F0 \u0631\u0648\u0632 \u0627\u062E\u06CC\u0631)");
  el.innerHTML = html;
}
setTheme(initTheme()); applyLang(true); load(); refreshStatus(); loadNextMatches(); loadMembers(); loadFai(); loadStats();`;
