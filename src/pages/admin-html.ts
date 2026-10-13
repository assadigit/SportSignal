// SportSignal — the /admin dashboard body markup (extracted from the old
// admin.ts monolith in v13.83). Carries the ${VERSION} footer line.

import { VERSION } from "../config";

export const ADMIN_BODY = `<div id="topbar"><button id="lbtn" onclick="switchLang()"></button><button id="tbtn" onclick="toggleTheme()"></button></div>
<h1 data-i="h1A">\u2699\uFE0F \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0631\u0628\u0627\u062A \u0627\u0639\u0644\u0627\u0646 \u0645\u0633\u0627\u0628\u0642\u0627\u062A</h1>
<div class="card">
<h2 data-i="hLogin">\u{1F511} \u0648\u0631\u0648\u062F</h2>
<div class="row"><input id="token" type="password" autocomplete="off" onkeydown="if(event.key==='Enter')login()" data-p="tokenPh"><button onclick="login()" data-i="btnLogin">\u0648\u0631\u0648\u062F</button></div>
</div>
<div class="card">
<h2 data-i="hStatus">\u{1F4CA} \u0648\u0636\u0639\u06CC\u062A</h2>
<div id="status">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</div>
<button id="btnRefresh" onclick="refreshStatus()" data-i="btnRefresh">\u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0648\u0636\u0639\u06CC\u062A</button>
<button id="btnTest" onclick="sendTest()" data-i="btnTest">\u{1F4E8} \u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645 \u062A\u0633\u062A</button>
<button id="btnSim" onclick="simulate()" data-i="btnSim">\u{1F9EA} \u0634\u0628\u06CC\u0647\u200C\u0633\u0627\u0632\u06CC \u06F5 \u0627\u0639\u0644\u0627\u0646</button>
<button onclick="checkSources()" data-i="btnSources">\u{1F4E1} \u0628\u0631\u0631\u0633\u06CC \u0645\u0646\u0627\u0628\u0639 API</button>
<button onclick="logout()" data-i="btnLogout">\u{1F6AA} \u062E\u0631\u0648\u062C</button>
</div>
<!-- v13.56-visitcount: visitor stats \u2014 today/yesterday/7d/30d/all-time page
     views + a 90-day per-day bar breakdown. Backed by the dedicated STATS_DB
     D1 database (isolated from the STATE KV write quota). Cookieless, IP-free,
     bot-filtered \u2014 see /privacy. -->
<div class="card">
<h2 data-i="hStats">\u{1F4CA} \u0622\u0645\u0627\u0631 \u0628\u0627\u0632\u062F\u06CC\u062F</h2>
<div id="stats">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</div>
<button id="btnStats" onclick="loadStats(true)" data-i="btnStats">\u{1F504} \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0622\u0645\u0627\u0631</button>
</div>
<!-- v12.16: bot members directory \u2014 every chat that /start-ed the bot with
     its Telegram id, @username ("slug"), display name and join date (the
     user's ask). \u{1F504} re-fetches; unknown members are backfilled via getChat. -->
<div class="card">
<h2 data-i="hMembers">\u{1F465} \u0627\u0639\u0636\u0627\u06CC \u0631\u0628\u0627\u062A</h2>
<div id="members">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</div>
<button id="btnMembers" onclick="loadMembers(true)" data-i="btnMembers">\u{1F504} \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0627\u0639\u0636\u0627</button>
</div>
<!-- v12.17: AI-learned Farsi club names (Cloudflare Workers AI). New club
     names the static dict misses are translated incrementally (one batched
     AI call), validated, stored in KV and served from the next payload
     build. \u{1F504} forces a learning round now; the input forgets a bad learned
     translation so the next round re-asks (or the dict stays English). -->
<div class="card">
<h2 data-i="hFai">\u{1F9E0} \u062A\u0631\u062C\u0645\u0647 \u0647\u0648\u0634\u0645\u0646\u062F \u0646\u0627\u0645 \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627</h2>
<div class="muted" data-i="faiHint">\u0646\u0627\u0645\u200C\u0647\u0627\u06CC \u062C\u062F\u06CC\u062F \u0628\u0647\u200C\u062A\u062F\u0631\u06CC\u062C \u0628\u0627 Workers AI \u062A\u0631\u062C\u0645\u0647 \u0648 \u0630\u062E\u06CC\u0631\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F \u2014 \u0627\u0632 \u0628\u0627\u0631 \u0628\u0639\u062F \u0645\u0633\u062A\u0642\u06CC\u0645 \u0641\u0627\u0631\u0633\u06CC \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F.</div>
<div id="fai">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</div>
<button id="btnFai" onclick="loadFai(true)" data-i="btnFai">\u{1F504} \u062A\u0631\u062C\u0645\u0647 \u0647\u0648\u0634\u0645\u0646\u062F (AI)</button>
<div class="row" style="margin-top:8px">
<input id="faiForget" data-p="faiForget">
<button onclick="forgetFai()" data-i="btnFaiForget">\u062D\u0630\u0641 \u062A\u0631\u062C\u0645\u0647</button>
</div>
<!-- v12.x-admin-override: manual name correction — admin can set/correct
     the Farsi name for ANY team (overrides AI + static dictionary). -->
<div class="row" style="margin-top:10px;gap:6px">
<input id="ovrEn" placeholder="English name (e.g. Sunderland AFC)" style="flex:1;min-width:120px">
<input id="ovrFa" placeholder="\u0646\u0627\u0645 \u0641\u0627\u0631\u0633\u06CC (\u0645\u062B\u0644: \u0633\u0627\u0646\u062F\u0631\u0644\u0646\u062F)" style="flex:1;min-width:120px">
<button onclick="overrideFai()">\u2705 \u062B\u0628\u062A / \u0627\u0635\u0644\u0627\u062D</button>
</div>
<div id="ovrMsg" class="muted" style="margin-top:4px;font-size:12px"></div>
</div>
<div class="card">
<h2 data-i="hBroadcast">\u{1F4E3} \u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645 \u0628\u0647 \u0647\u0645\u0647 \u06A9\u0627\u0631\u0628\u0631\u0627\u0646</h2>
<label data-i="lbBroadcast">\u0645\u062A\u0646 \u067E\u06CC\u0627\u0645 (\u0628\u0647 \u0641\u0627\u0631\u0633\u06CC \u06CC\u0627 \u0627\u0646\u06AF\u0644\u06CC\u0633\u06CC)</label>
<input id="broadcastText" data-p="bcPh">
<button id="btnBroadcast" onclick="broadcast()" data-i="btnBroadcast">\u{1F4E3} \u0627\u0631\u0633\u0627\u0644 \u0628\u0631\u0627\u06CC \u0647\u0645\u0647</button>
</div>
<div class="card">
<h2 data-i="hMatches">\u26BD \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648</h2>
<div id="matches">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</div>
<button onclick="loadNextMatches()" data-i="btnRefreshM">\u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0645\u0633\u0627\u0628\u0642\u0627\u062A</button>
</div>
<div class="card">
<h2 data-i="hSettings">\u2699\uFE0F \u062A\u0646\u0638\u06CC\u0645\u0627\u062A</h2>
<label data-i="lbTz">\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC</label>
<input id="tz" placeholder="Asia/Tehran">
<label data-i="lbLeagues">\u0644\u06CC\u06AF\u200C\u0647\u0627\u06CC \u062A\u062D\u062A \u067E\u0648\u0634\u0634 (\u06A9\u062F\u0647\u0627 \u0628\u0627 \u06A9\u0627\u0645\u0627)</label>
<input id="leagues" placeholder="CL,PL,PD,SA,FL1">
<div class="muted" data-i="elNote">EL \u0648 ECL \u062A\u0648\u0633\u0637 SportScore \u067E\u0648\u0634\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F \u0648 \u0646\u06CC\u0627\u0632\u06CC \u0628\u0647 \u0627\u0641\u0632\u0648\u062F\u0646 \u0646\u062F\u0627\u0631\u0646\u062F.</div>
<label data-i="lbTeams">\u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0645\u0646\u062A\u062E\u0628 \u0647\u0631 \u0644\u06CC\u06AF</label>
<div id="teams"></div>
<div class="muted" data-i="acHint">\u{1F4A1} \u0647\u0646\u06AF\u0627\u0645 \u062A\u0627\u06CC\u067E\u060C \u0646\u0627\u0645 \u062F\u0642\u06CC\u0642 \u0628\u0627\u0634\u06AF\u0627\u0647 \u0627\u0632 \u0641\u0647\u0631\u0633\u062A API \u067E\u06CC\u0634\u0646\u0647\u0627\u062F \u0645\u06CC\u200C\u0634\u0648\u062F</div>
<div class="muted" id="clubsMeta"></div>
<button id="btnClubs" onclick="refreshClubs()" data-i="btnClubs">\u{1F504} \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627</button>
<button onclick="save()" data-i="btnSave">\u{1F4BE} \u0630\u062E\u06CC\u0631\u0647 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A</button>
<button onclick="backup()" data-i="btnBackup">\u2B07\uFE0F \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u200C\u06AF\u06CC\u0631\u06CC \u062A\u0646\u0638\u06CC\u0645\u0627\u062A</button>
</div>
<div class="card">
<h2 data-i="hPass">\u{1F511} \u062A\u063A\u06CC\u06CC\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631</h2>
<label data-i="lbNp1">\u0631\u0645\u0632 \u062C\u062F\u06CC\u062F (\u062D\u062F\u0627\u0642\u0644 \u06F8 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631)</label>
<input id="np1" type="password" autocomplete="new-password">
<label data-i="lbNp2">\u062A\u06A9\u0631\u0627\u0631 \u0631\u0645\u0632 \u062C\u062F\u06CC\u062F</label>
<input id="np2" type="password" autocomplete="new-password">
<button onclick="changePass()" data-i="btnCp">\u062A\u063A\u06CC\u06CC\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631</button>
</div>
<div class="muted">\u0646\u0633\u062E\u0647 ${VERSION} \u2014 \u0645\u0639\u0645\u0627\u0631\u06CC \u0645\u0627\u0686\u0648\u0644\u0627\u0631\u060C \u062D\u0630\u0641 \u0628\u062F\u0647\u06CC\u0627\u062A \u0642\u062F\u06CC\u0645\u06CC \u0648 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC \u0633\u0631\u06CC\u0639 \u062C\u0627\u0648\u0627 \u0633\u06CC\u0633\u062A\u0645 (\u0641\u0627\u06CC\u0644\u200C\u0647\u0627\u06CC CSS/JS \u062C\u062F\u0627 \u0648 \u0642\u0627\u0628\u0644 \u06A9\u0634 \u062F\u0627\u062F\u0646)</div>
<div id="msg" role="status" aria-live="polite"></div>`;
