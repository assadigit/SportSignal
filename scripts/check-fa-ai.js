// Self-check: v12.17-fai — three user asks in one release:
//   A) the 🆚 emoji is retired — upcoming-match slots render a faded hairline
//      divider (perfectly centered, RTL-safe) instead of the mis-aligned emoji;
//   B) «در این هفته» games whose kickoff passed render "turned off" — dimmed
//      rows, expired chip, future games first, most-recent past at the bottom;
//   C) incremental Farsi club-name learning via Cloudflare Workers AI —
//      dict → KV ai-cache → stem layering in translateTeam, a batched +
//      validated + cooldown-gated learner, cron/page wiring, /api/fa-teams
//      admin route and the 🧠 admin card.
// Extracts the REAL blocks from worker source and exercises them with stubs.
const fs = require("fs");
const src = fs.readFileSync("src/worker.ts", "utf8");
const { normTeamKey } = require("../src/teams.js");

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.error("  ✗ FAIL: " + name); }
}

console.log("A) VS emoji → (v12.18) NO separator at all");
// v12.17 replaced the emoji with a hairline; v12.18 removed even that (the
// user: "it's just visual noise. remove it fully"). Unplayed matches render
// ONLY the two team sides; the middle slot exists just for real scores.
const emojiCount = (src.match(/🆚/g) || []).length;
ok(emojiCount === 1 && /v12\.18: the "vs" slot is GONE[\s\S]*?the 🆚 emoji/.test(src), "A1 zero 🆚 render sites (only the history comment remains)");
ok(!/\.vs\{/.test(src) && !src.includes('className = "vs"'), "A2 no .vs CSS rule and no .vs element anywhere (fully removed)");
ok((src.match(/row\.appendChild\(hs\); row\.appendChild\(as\);/g) || []).length === 2, "A3 render() + spotItemNode(): no middle slot when there is no score");
ok((src.match(/var vs = document\.createElement\("div"\); vs\.className = "score";/g) || []).length === 2, "A3b the score element is created only when a score exists");
ok(src.includes(".score{font-weight:800"), "A4 .score styling untouched (finished/live rows keep their score)");
ok((src.match(/" – "/g) || []).length >= 3, "A5 share/cup/admin text lines use a low-key \" – \" separator");
ok(!/🆚/.test(src.replace(/\/\* v12\.[0-9]+:[\s\S]*?the 🆚 emoji[\s\S]*?\*\//, "")), "A5b no emoji anywhere outside that comment");

console.log("B) «در این هفته» — past games turned off");
ok(src.includes("function weekPast(m)") && src.includes("m.status === \"FINISHED\"") && src.includes("Date.now() - 9e4"), "B1 weekPast(): FINISHED or kickoff older than 90s → past; live never");
ok(src.includes("{ finished: m.status === \"FINISHED\", past: mode === \"this\" && weekPast(m) }"), "B2 renderWeek passes {finished, past} into spotItemNode (dimming scoped to this-week mode)");
ok(src.includes("pa ? tb - ta : ta - tb"), "B3 order: live → upcoming soonest-first → past most-recent-last");
ok(src.includes('item.className += " past"'), "B4 spotItemNode applies the .past class");
ok(src.includes('cd.className = "wkdone"') && src.includes('"⌛ " + T("wkDone")'), "B5 expired chip (wkdone) replaces the fresh time chip");
ok(/\.spotitem\.past\{opacity:\.48;filter:saturate\(\.55\)\}/.test(src), "B6 .spotitem.past dims + desaturates the whole entry");
ok(src.includes('.spotitem.past .logo{filter:grayscale(.5)}'), "B6b crests gray out on past entries");
ok(src.includes('wkDone:"پایان‌یافته"') && src.includes('wkDone:"Finished"'), "B7 wkDone i18n (fa+en public dict)");

console.log("C) FA club-name learning via Workers AI");
// C1: config + KV keys
ok(src.includes('KV_FA_TEAMS: "fa_teams_ai"') && src.includes('KV_FA_LAST_RUN: "fa_ai_last_run"'), "C1 KV keys fa_teams_ai + fa_ai_last_run");
ok(src.includes("FA_AI_MAX_BATCH: 16") && src.includes("FA_AI_RUN_EVERY_MS: 9e5") && src.includes("FA_AI_FAIL_RETRY_MS: 432e5"), "C1b batch=16 · run cooldown 15min · fail retry 12h");

// ── extract & exercise the real functions ──
const dictSrc = src.match(/const FA_TEAMS = (\{[\s\S]*?\n  \});/)[1];
const FA_TEAMS = eval("(" + dictSrc + ")");
function extractFn(name) {
  const m = src.match(new RegExp("(?:async )?function " + name + "\\([\\s\\S]*?\\n}\\n(?=__name\\(" + name + ",)"));
  if (!m) throw new Error("cannot extract " + name);
  // re-attach the async keyword the regex start may have cut off
  const decl = "function " + name + "(";
  const full = src.indexOf(m[0]);
  return (src.slice(Math.max(0, full - 6), full) === "async " ? "async " : "") + m[0];
}
const ctx = {
  FA_TEAMS_DICT: null, FA_TEAMS_NORM: null, FA_TEAMS_STEM: null, FA_AI_CACHE: null,
  normTeamKey, console, CONFIG: {
    KV_FA_TEAMS: "fa_teams_ai", KV_FA_LAST_RUN: "fa_ai_last_run", KV_PUBLIC_MATCHES: "public_matches_v1",
    FA_AI_MAX_BATCH: 16, FA_AI_RUN_EVERY_MS: 9e5, FA_AI_FAIL_RETRY_MS: 432e5
  }
};
const vm = require("vm");
const sandbox = vm.createContext(ctx);
vm.runInContext("function buildFaTeamDict(){ return (" + dictSrc + "); }", sandbox);
vm.runInContext(extractFn("translateTeam"), sandbox);
vm.runInContext(extractFn("ensureFaAiCache"), sandbox);
vm.runInContext(extractFn("resetFaAiCache"), sandbox);
vm.runInContext(extractFn("isValidFaName"), sandbox);
vm.runInContext(extractFn("collectUnknownTeamNames"), sandbox);
vm.runInContext(extractFn("parseAiNameMap"), sandbox);
vm.runInContext(extractFn("runFaAiLearner"), sandbox);
vm.runInContext(extractFn("askedAndFailed"), sandbox);
vm.runInContext(extractFn("maybeRunFaAi"), sandbox);
vm.runInContext("var __res = null; async function __call(f){ __res = await f; }", sandbox);

// C2: layering — dict wins over the AI cache
vm.runInContext('FA_TEAMS_DICT = buildFaTeamDict(); FA_TEAMS_NORM = new Map(); FA_TEAMS_STEM = []; for (const [en, fa] of Object.entries(FA_TEAMS_DICT)) { FA_TEAMS_NORM.set(normTeamKey(en), fa); FA_TEAMS_STEM.push([normTeamKey(en).replace(/\\d+/g, ""), fa]); } FA_AI_CACHE = new Map([["arsenalfc","غلط عمدی"],["slaviapraha","اسلاویا پراگ"]]);', sandbox);
ok(vm.runInContext('translateTeam("Arsenal FC")', sandbox) === "آرسنال", "C2 static dict ALWAYS beats the AI cache");
ok(vm.runInContext('translateTeam("SK Slavia Praha")', sandbox) === "اسلاویا پراگ", "C2b AI cache resolves a name the dict misses");
ok(vm.runInContext('translateTeam("Some Unknown FC")', sandbox) === "Some Unknown FC", "C2c unknown names still fall through as English");

// C3: validation gate
ok(vm.runInContext('isValidFaName("اسلاویا پراگ")', sandbox) === true, "C3a valid Persian name accepted");
ok(vm.runInContext('isValidFaName("Viking FK")', sandbox) === false, "C3b Latin parrot rejected");
ok(vm.runInContext('isValidFaName("")', sandbox) === false && vm.runInContext('isValidFaName(null)', sandbox) === false, "C3c empty/null rejected");
ok(vm.runInContext('isValidFaName("آ")', sandbox) === false, "C3d too-short rejected");
ok(vm.runInContext('isValidFaName("باشگاه" + "۱".repeat(45))', sandbox) === false, "C3e too-long rejected");
ok(vm.runInContext('isValidFaName("رئال مادرید ⚽")', sandbox) === false, "C3f emoji-only noise rejected (no Persian letters → also C3a path)");
ok(vm.runInContext('isValidFaName("بودو/گلیمت")', sandbox) === true, "C3g compound names with / accepted (بودو/گلیمت)");

// C4: collector — harvests ucl/standings/matches, skips Persian + known
vm.runInContext('FA_AI_CACHE = new Map([["slaviapraha","اسلاویا پراگ"]]);', sandbox);
vm.runInContext('__call(collectUnknownTeamNames({ ucl:{teams:[{name:"SK Slavia Praha"},{name:"Arsenal FC"},{name:"پرسپولیس"}]}, standings:{PL:{teams:[{name:"Liverpool FC"}]}}, upcoming:[{homeTeam:{name:"Viking FK"},awayTeam:{name:"Chelsea FC"}}], thisWeek:[], finished:[], topSpot:{matches:[],next:null} }))', sandbox).then ?
  null : null;
const collectorData = {
  ucl: { teams: [{ name: "SK Slavia Praha" }, { name: "Arsenal FC" }, { name: "پرسپولیس" }] },
  standings: { PL: { teams: [{ name: "Liverpool FC" }] } },
  upcoming: [{ homeTeam: { name: "Viking FK" }, awayTeam: { name: "Chelsea FC" } }],
  thisWeek: [], finished: [], topSpot: { matches: [], next: null }
};
(async () => {
  const unknown = await vm.runInContext("collectUnknownTeamNames(" + JSON.stringify(collectorData) + ")", sandbox);
  ok(unknown.length === 1 && unknown[0] === "Viking FK", "C4 collector: only the untranslated Latin name is pending (dict+AI+Persian skipped)");

  // C5: the learner end-to-end with a stubbed Workers AI
  const kv = {};
  const env = {
    AI: { run: async () => ({ choices: [{ message: { content: '{"SK Slavia Praha":"اسلاویا پراگ","Viking FK":"Viking FK","LASK Linz":"لاسک لینتس","PAE AEK":"آیک آتن"}' } }] }) }, // llama-3.3-70b live shape: OpenAI-style choices[0].message.content
    STATE: {
      get: async (k) => { const v = kv[k]; if (v == null) return null; try { return JSON.parse(v); } catch (e) { return v; } },
      put: async (k, v) => { kv[k] = v; }
    }
  };
  vm.runInContext("FA_AI_CACHE = null;", sandbox);
  sandbox.__env = env;
  const res1 = await vm.runInContext('runFaAiLearner(__env, ["SK Slavia Praha","Viking FK","LASK Linz","PAE AEK"])', sandbox);
  ok(res1.ok === true && res1.learned === 3 && res1.failed === 1 && res1.asked === 4, "C5 one batched AI call: 3 valid learned, 1 parrot rejected");
  const rec = JSON.parse(kv["fa_teams_ai"]);
  ok(rec.learned["slaviapraha"] === "اسلاویا پراگ" && rec.learned["lasklinz"] === "لاسک لینتس" && rec.learned["paeaek"] === "آیک آتن", "C5b KV fa_teams_ai stores validated pairs under normalized keys");
  ok(rec.failed["viking"] != null, "C5c the rejected name lands in failed{} (cooldown marker)");
  // C6: nothing is re-asked while learned/cooling
  const res2 = await vm.runInContext('runFaAiLearner(__env, ["SK Slavia Praha","Viking FK","LASK Linz","PAE AEK"])', sandbox);
  ok(res2.learned === 0 && res2.pending === 0 && res2.asked === undefined, "C6 repeat run re-asks NOTHING (learned + 12h cooldown)");
  // C7: ai-disabled degrade
  sandbox.__env2 = { STATE: env.STATE };
  const res3 = await vm.runInContext('runFaAiLearner(__env2, ["Whatever FC"])', sandbox);
  ok(res3.ok === false && res3.skipped === "ai-disabled", "C7 env.AI absent → graceful ai-disabled skip");
  // C8: ensureFaAiCache loads the record into the module cache
  vm.runInContext("FA_AI_CACHE = null;", sandbox);
  sandbox.__env3 = env;
  const cache = await vm.runInContext("ensureFaAiCache(__env3)", sandbox);
  ok(cache && typeof cache.get === "function" && cache.get("slaviapraha") === "اسلاویا پراگ", "C8 ensureFaAiCache hydrates from KV fa_teams_ai");

  // C8b: the response parser salvages every common LLM output shape
  const parseT = (raw, batch) => vm.runInContext("parseAiNameMap(" + JSON.stringify(raw) + ", " + JSON.stringify(batch) + ")", sandbox);
  const BN = ["SK Slavia Praha", "Viking FK"];
  ok(parseT('{"SK Slavia Praha":"اسلاویا پراگ","Viking FK":"وایکینگ"}', BN) && parseT('{"SK Slavia Praha":"اسلاویا پراگ","Viking FK":"وایکینگ"}', BN)["Viking FK"] === "وایکینگ", "C8b-1 flat JSON object accepted");
  ok(parseT('```json\n{"SK Slavia Praha":"اسلاویا پراگ","Viking FK":"وایکینگ"}\n```', BN) && parseT('```json\n{"SK Slavia Praha":"اسلاویا پراگ","Viking FK":"وایکینگ"}', BN) !== null, "C8b-2 fenced markdown accepted");
  ok(parseT('Here you go:\n{"SK Slavia Praha":"اسلاویا پراگ","Viking FK":"وایکینگ"} hope it helps', BN) && parseT('Here you go:\n{"SK Slavia Praha":"اسلاویا پراگ","Viking FK":"وایکینگ"}', BN)["SK Slavia Praha"] === "اسلاویا پراگ", "C8b-3 prose-wrapped JSON salvaged via brace slice");
  ok(parseT('{"translations":{"SK Slavia Praha":"اسلاویا پراگ","Viking FK":"وایکینگ"}}', BN) && parseT('{"translations":{"SK Slavia Praha":"اسلاویا پراگ"}}', BN) !== null, "C8b-4 one-level-nested wrapper salvaged");
  ok(parseT('[{"name":"SK Slavia Praha","fa":"اسلاویا پراگ"},{"name":"Viking FK","translation":"وایکینگ"}]', BN) && parseT('[{"name":"SK Slavia Praha","fa":"اسلاویا پراگ"}]', BN)["SK Slavia Praha"] === "اسلاویا پراگ", "C8b-5 array-of-rows shape salvaged");
  ok(parseT('Sorry, I cannot do that.', BN) === null, "C8b-6 garbage → null (all rejected, cooldown engages)");
  ok(parseT('{"SK Slavia Praha":"اسلاویا پراگ"}', BN)["Viking FK"] === undefined, "C8b-7 partial map still yields the covered names");

  // C9: wiring — fetchPublicMatches + cron load the cache; page hits and the
  // cron run the learner; the admin route exists with run/forget params.
  ok(/await ensureFaAiCache\(env\)\.catch\(\(\) => \{\}\);/.test(src) && src.includes("every translateTeam() below"), "C9a fetchPublicMatches loads the AI cache before payload assembly");
  ok(src.includes("const data = await fetchPublicMatches(env, req);") && src.includes("ctx.waitUntil(maybeRunFaAi(env).catch"), "C9b the public route fires the learner via ctx.waitUntil");
  ok(src.includes("// v12.17: load AI-learned Farsi names once per isolate"), "C9c executeScheduledLogic loads the cache (Telegram messages translate too)");
  ok(src.includes("const fa = await maybeRunFaAi(env);"), "C9d the cron runs the cooldown-gated learner before the no-users skip");
  ok(src.includes('"/api/fa-teams"') && src.includes('url.searchParams.get("run") === "1"') && src.includes('url.searchParams.get("forget")'), "C9e /api/fa-teams route: stats + ?run=1 force + ?forget= correction");

  // C10: admin card + i18n + boot
  ok(src.includes('data-i="hFai"') && src.includes('id="fai"') && src.includes('id="btnFai"') && src.includes('id="faiForget"'), "C10a the 🧠 card markup (title/list/run button/forget input)");
  ok(src.includes("async function loadFai(force)") && src.includes("async function forgetFai()"), "C10b loadFai + forgetFai handlers");
  ok(src.includes("loadMembers(); loadFai();"), "C10c boot sequence loads the card");
  ok((src.match(/hFai:"/g) || []).length === 4, "C10d fai i18n keys in login+admin dicts (fa+en ×2 pages)");
  ok(src.includes('faiMeta:"%s نام ترجمه‌شده — %s در انتظار"') && src.includes('faiMeta:"%s translated — %s pending"'), "C10e faiMeta strings");
  ok(src.includes("applyLang(true);") && src.includes("WITHOUT re-firing onLang"), "C10f loadFai restores labels with skipHook (no re-render loop)");

  // C11: binding + versions
  const toml = fs.readFileSync("wrangler.toml", "utf8");
  ok(/\[ai\]/.test(toml) && /binding = "AI"/.test(toml), "C11a wrangler.toml carries the [ai] binding");
  ok(src.includes('const VERSION = "12.23-watermark";'), "C11b VERSION = 12.23-watermark");
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  ok(pkg.version === "12.23.0", "C11c package.json 12.23.0");
  ok((src.match(/نسخه ۱۲\.۲۳/g) || []).length >= 3 && (src.match(/v12\.23 — giant faded club crests/g) || []).length >= 3, "C11d ver strings bumped across the page dicts + static footer");

  console.log(`\n${pass} passed, ${fail} failed (v12.17-fai checks)`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("HARNESS ERROR: " + e.message); process.exit(1); });
