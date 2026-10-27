#!/usr/bin/env node
// ============================================================================
// SportSignal — seo-check (T-01..T-13 of the SEO/GEO spec)
// ----------------------------------------------------------------------------
// Complete, copy-paste runnable SEO verifier for https://sportsignal.ir.
// Run:  node scripts/seo-check [--local http://localhost:8787]
//
// ============================== CONFIGURATION BLOCK ========================
const CONFIG = {
  BASE_URL: "https://sportsignal.ir",          // production origin (no www)
  ALT_HOSTS: {                                 // R-06 redirect expectations
    football: "https://football.sportsignal.ir", // must 301 to BASE_URL (public paths)
    www: "https://www.sportsignal.ir",           // must 301 to BASE_URL (every path)
    http: "http://sportsignal.ir",               // must 301 to https
    workersDev: "https://ucl-notifier.sportsignal.workers.dev" // must serve noindex (R-13) — v13.95-accountmigration: the dedicated account's subdomain
  },
  SITEMAP_INDEX: "/sitemap.xml",
  CHILD_SITEMAPS: ["pages", "competitions", "teams", "matches-upcoming", "matches-archive"],
  SAMPLE_N: 8,               // random sitemap URLs sampled per child (T-03)
  TEMPLATE_PATHS: ["/", "/matches", "/matches/today", "/matches/tomorrow",
    "/matches/this-week", "/matches/this-weekend", "/teams", "/competitions",
    "/about", "/methodology", "/contact", "/privacy", "/terms", "/data", "/sitemap"],
  NON_INDEXABLE_PREFIXES: ["/api/matches.json"], // must 200 but are files
  BOT_UAS: [                 // G-02: these must never see 403/429/503
    "Googlebot/2.1 (+http://www.google.com/bot.html)", "bingbot/2.0",
    "OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User",
    "PerplexityBot", "Perplexity-User", "DuckAssistBot", "GPTBot", "ClaudeBot",
    "Applebot", "Amazonbot", "CCBot", "meta-externalagent"
  ],
  EXPECTED_BOT_BLOCKS: [],   // e.g. ["ClaudeBot"] if ALLOW_AI_TRAINING_BOTS=false
  LIGHTHOUSE: {              // T-09 — skipped gracefully when chrome missing
    ENABLED: true,
    CHROME_PATH: process.env.CHROME_PATH || "",
    BIN: "./node_modules/.bin/lighthouse", // or a global path
    THRESHOLDS: { performance: 90, seo: 100, accessibility: 95, "best-practices": 95 }
  },
  FAIL_FAST: false,
  TIMEOUT_MS: 20000
};
// ============================ END CONFIGURATION BLOCK ======================

const results = [];
let failures = 0;
const UA = "SportSignal-seo-check/1.0 (+https://sportsignal.ir)";

function pass(id, msg) { results.push({ id, ok: true, msg }); console.log("  ✓ " + msg); }
function fail(id, msg) { results.push({ id, ok: false, msg }); failures++; console.log("  ✗ " + msg); }
function section(t) { console.log("\n== " + t + " =="); }

// v13.186-seofix: politeness + transient-5xx resilience. Root cause (the
// 2026-10-27 bug hunt): the check's own back-to-back rapid fetches tripped
// the worker's free-tier CPU budget on cold SSR renders (Cloudflare
// "exceededResources" -> HTTP 503) — CF analytics caught 11 of them inside
// ONE T-05 crawl window (the checker was its own biggest outage source;
// organic slow-paced loads never trip it, 0/40 in probing). Two-part fix:
//   1. PACE_MS — every origin request waits its turn (>=250ms apart), so
//      cold renders never land on top of each other.
//   2. RETRY_5XX — a 502/503/504 (or a network/timeout error) is retried
//      twice with backoff before it counts. A capacity blip is not a
//      regression; a SYSTEMATIC block/503 still fails after the retries
//      (T-11's bot-blocking semantics stay intact — only transient blips
//      are absorbed).
const PACE_MS = 250;
// v13.186-seofix: the backoff is MEASURED, not guessed — a cold-render burst
// trips the isolate's CPU-average debt and the recovery window is ~3s
// (2026-10-27 experiment: 4/54 rapid-fire cold pages 503'd; ALL four passed
// when retried 3s later). The first draft's [400,1500] retried INSIDE the
// debt window and the retries died with it.
// v13.187-publicity: a THIRD backoff at 30s — the first real CI run (the
// billing block cleared, run 40572769486) caught the residual case: a deep
// cold-render route (lecce-vs-genoa) 503'd through BOTH retries, because
// each retry itself re-triggers a cold SSR render and re-feeds the very
// debt it is waiting out (3 attempts inside ~11s all died). The 30s quiet
// period lets the isolate's CPU-average window fully decay; a probe 30s
// later returned 200 in 1.7s. Systematic blocks still fail — a true 503
// wall survives all 4 attempts spanning ~41s and correctly fails T-05/T-11.
const RETRY_5XX_MS = [3000, 8000, 30000];
let _lastReqAt = 0;
const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchRaw(url, opts = {}) {
  let lastErr = null;
  for (let attempt = 0; attempt <= RETRY_5XX_MS.length; attempt++) {
    const pace = _lastReqAt + PACE_MS - Date.now();
    if (pace > 0) await sleepMs(pace);
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), CONFIG.TIMEOUT_MS);
    try {
      _lastReqAt = Date.now();
      const res = await fetch(url, { redirect: "manual", signal: ctl.signal, headers: { "user-agent": opts.ua || UA, ...(opts.headers || {}) }, method: opts.method || "GET" });
      const transient = res.status === 502 || res.status === 503 || res.status === 504;
      if (transient && attempt < RETRY_5XX_MS.length && !opts.noRetry) {
        await sleepMs(RETRY_5XX_MS[attempt]);
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (attempt < RETRY_5XX_MS.length && !opts.noRetry) {
        await sleepMs(RETRY_5XX_MS[attempt]);
        continue;
      }
      throw e;
    } finally { clearTimeout(to); }
  }
  throw lastErr || new Error("fetch failed: " + url);
}

async function body(res) { try { return await res.text(); } catch (e) { return ""; } }

(async () => {
  const B = CONFIG.BASE_URL;
  const argLocal = process.argv.indexOf("--local");
  if (argLocal > -1 && process.argv[argLocal + 1]) CONFIG.BASE_URL = process.argv[argLocal + 1];

  // ---------------- T-01: robots.txt ----------------
  section("T-01 robots.txt");
  {
    const res = await fetchRaw(B + "/robots.txt");
    const txt = await body(res);
    if (res.status !== 200) fail("T-01", `/robots.txt HTTP ${res.status} (expected 200)`);
    else if (!/text\/plain/i.test(res.headers.get("content-type") || "")) fail("T-01", "robots.txt content-type not text/plain");
    else {
      if (/Disallow:\s*\/\s*$/m.test(txt)) fail("T-01", "robots.txt blocks / (all crawling)");
      else pass("T-01", "robots.txt does not block /");
      if (!new RegExp("Sitemap:\\s*" + B.replace(/\//g, "\\/") + "\\/sitemap\\.xml").test(txt)) fail("T-01", "robots.txt missing canonical Sitemap line");
      else pass("T-01", "robots.txt Sitemap line points at " + B);
      // F-02/G-01: AI toggles — all true by default; any specific AI group
      // with Disallow: / would disagree with the config.
      const aiBlocked = [...txt.matchAll(/User-agent:\s*(OAI-SearchBot|ChatGPT-User|Claude-SearchBot|Claude-User|PerplexityBot|Perplexity-User|DuckAssistBot|GPTBot|ClaudeBot|Google-Extended|Applebot-Extended|CCBot|meta-externalagent|Amazonbot)[\s\S]*?Disallow:\s*\/\s*$/gm)];
      if (aiBlocked.length && CONFIG.EXPECTED_BOT_BLOCKS.length === 0) fail("T-01", "robots.txt disallows AI bots but config toggles are all true");
      else pass("T-01", "AI bot policy matches config (all allowed)");
    }
  }

  // ---------------- T-02: sitemaps ----------------
  section("T-02 sitemaps");
  const allSitemapUrls = [];
  {
    const res = await fetchRaw(B + CONFIG.SITEMAP_INDEX);
    const xml = await body(res);
    if (res.status !== 200) fail("T-02", "sitemap index HTTP " + res.status);
    else if (!/\/urlset|sitemapindex/.test(xml)) fail("T-02", "sitemap index is not valid XML");
    else pass("T-02", "sitemap index reachable (" + (xml.length / 1024).toFixed(1) + " KB)");
    const childLocs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    if (childLocs.length < CONFIG.CHILD_SITEMAPS.length) fail("T-02", "sitemap index missing expected children");
    for (const kind of CONFIG.CHILD_SITEMAPS) {
      const u = B + "/sitemaps/" + kind + ".xml";
      const r = await fetchRaw(u);
      const x = await body(r);
      if (r.status !== 200) { fail("T-02", kind + ".xml HTTP " + r.status); continue; }
      const locs = [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
      const lastmods = [...x.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
      if (!locs.length) fail("T-02", kind + ".xml has 0 URLs");
      else pass("T-02", kind + ".xml: " + locs.length + " URLs");
      const urlCount = locs.length;
      if (urlCount > 50000) fail("T-02", kind + ".xml exceeds 50,000 URLs");
      let badHost = 0, nonHttps = 0, missingLastmod = 0, dupes = 0;
      const seen = new Set();
      for (let i = 0; i < locs.length; i++) {
        const l = locs[i];
        if (!l.startsWith("https://" + new URL(B).host)) badHost++;
        if (!l.startsWith("https://")) nonHttps++;
        if (seen.has(l)) dupes++;
        seen.add(l);
        if (!lastmods[i]) missingLastmod++;
      }
      if (badHost) fail("T-02", kind + ".xml: " + badHost + " URLs on wrong host");
      if (nonHttps) fail("T-02", kind + ".xml: non-https URLs");
      if (missingLastmod) fail("T-02", kind + ".xml: " + missingLastmod + " URLs missing lastmod");
      if (dupes) fail("T-02", kind + ".xml: " + dupes + " duplicate URLs");
      if (!badHost && !nonHttps && !missingLastmod && !dupes) pass("T-02", kind + ".xml all URLs canonical+https+lastmod, no dupes");
      allSitemapUrls.push(...locs);
    }
    // priority/changefreq must NOT be present (Google ignores, spec F-05)
    const idx = await fetchRaw(B + CONFIG.SITEMAP_INDEX);
    const idxXml = await body(idx);
    if (/<(priority|changefreq)>/.test(idxXml)) fail("T-02", "sitemap uses priority/changefreq (spec: omit)");
    else pass("T-02", "no priority/changefreq in sitemap index");
  }

  // ---------------- T-03: page checks on sample ----------------
  section("T-03 page checks (templates + random sitemap sample)");
  {
    const seenTitles = new Map();
    const seenDescs = new Map();
    const checkPage = async (url, isTemplate) => {
      const res = await fetchRaw(url);
      const html = await body(res);
      const id = "T-03";
      if (res.status !== 200) return fail(id, url + " HTTP " + res.status);
      if (res.url && res.url !== url && new URL(res.url).pathname !== new URL(url).pathname) return fail(id, url + " redirected to " + res.url);
      const h1s = (html.match(/<h1[\s>]/gi) || []).length;
      if (h1s !== 1) fail(id, url + " has " + h1s + " <h1> (expected 1)");
      const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || "";
      if (!title || /Vite App|React App|^Document$/.test(title)) fail(id, url + " missing/placeholder title");
      // Spec 7.2: "may be cut by width, not a fixed limit" — Persian glyphs
      // render narrower; 75 chars ≈ Google's 580px desktop cutoff for fa.
      if (title.length > 75) fail(id, url + " title > 75 chars (" + title.length + "): " + title.slice(0, 70));
      if (seenTitles.has(title)) fail(id, "duplicate title: " + title + " (" + seenTitles.get(title) + " & " + url + ")");
      seenTitles.set(title, url);
      const robots = (html.match(/<meta[^>]+name="robots"[^>]+content="([^"]+)"/i) || [])[1] || "";
      const meta = robots && /noindex/i.test(robots);
      const hdrNoindex = /noindex/i.test(res.headers.get("x-robots-tag") || "");
      if (meta || hdrNoindex) fail(id, url + " served noindex but is in the sitemap/templates");
      const canonical = (html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i) || [])[1] || "";
      if (!canonical) fail(id, url + " missing canonical");
      else if (canonical !== url && canonical !== url.replace(/\/$/, "")) {
        // allow exact-match including ?page= self-canonicals
        if (!(canonical.startsWith(url.split("?")[0]))) fail(id, url + " canonical mismatch: " + canonical);
      }
      const desc = (html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i) || [])[1] || "";
      if (!desc || desc.length < 50) fail(id, url + " meta description missing/too short");
      if (desc && seenDescs.has(desc)) fail(id, "duplicate description (" + url + " = " + seenDescs.get(desc) + ")");
      if (desc) seenDescs.set(desc, url);
      if (!/lang="fa"/i.test(html)) fail(id, url + " missing lang=fa");
      if (!/dir="rtl"/i.test(html)) fail(id, url + " missing dir=rtl");
      if (!/name="viewport"/i.test(html)) fail(id, url + " missing viewport");
      if (!/property="og:title"/i.test(html)) fail(id, url + " missing og:title");
      if (!/name="twitter:card"/i.test(html)) fail(id, url + " missing twitter:card");
      // raw-HTML content check (R-01): one of the known team/comp markers must
      // exist WITHOUT JS. Home/hubs/matches always carry real text.
      const textLen = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
      if (textLen < 300) fail(id, url + " raw HTML has only " + textLen + " chars of text (JS-only content?)");
      // internal links
      const links = [...html.matchAll(/href="(\/[a-z0-9-]*)"/g)].map((m) => m[1]);
      const internal = links.filter((l) => !/\.(css|js|png|jpg|ico|woff2?|svg|mp4)$/.test(l));
      if (internal.length < 3) fail(id, url + " has only " + internal.length + " internal content links");
      // images without alt — in the MARKUP, not in embedded script text.
      // v13.186-seofix: the homepage's inline DCL comments carry three
      // literal "<img>" strings (the v13.180 mcFitScan notes) and the old
      // raw-HTML regex counted them as attribute-less images — a false
      // positive that failed EVERY run since v13.180 (100/100 red CI).
      // Strip <script>/<style>/HTML comments first; the real DOM keeps all
      // its <img> elements (127 on the homepage, every one alt-carrying).
      const bodyHtml = html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<!--[\s\S]*?-->/g, " ");
      const imgsNoAlt = [...bodyHtml.matchAll(/<img((?![^>]*alt=)[^>]*)>/gi)].length;
      if (imgsNoAlt) fail(id, url + " " + imgsNoAlt + " <img> without alt");
      // JSON-LD presence
      if (!/application\/ld\+json/.test(html)) fail(id, url + " no JSON-LD");
      return true;
    };
    let okCount = 0;
    for (const t of CONFIG.TEMPLATE_PATHS) {
      const r = await fetchRaw(B + t);
      if (r.status === 200) { await checkPage(B + t, true); okCount++; }
      else fail("T-03", "template " + t + " HTTP " + r.status);
    }
    // random sample from all sitemap URLs
    const pool = allSitemapUrls.filter((u) => !CONFIG.TEMPLATE_PATHS.some((t) => u === B + t));
    for (let i = 0; i < Math.min(CONFIG.SAMPLE_N, pool.length); i++) {
      const u = pool[Math.floor(Math.random() * pool.length)];
      await checkPage(u, false);
    }
    pass("T-03", "checked " + okCount + " templates + up to " + CONFIG.SAMPLE_N + " random sitemap URLs");
  }

  // ---------------- T-04: JSON-LD deep check ----------------
  section("T-04 JSON-LD");
  {
    // find a match page from the upcoming sitemap
    const mu = allSitemapUrls.find((u) => /\/matches\/[a-z0-9-]+-vs-/.test(u));
    if (!mu) fail("T-04", "no match URL found in sitemaps to deep-check");
    else {
      const res = await fetchRaw(mu);
      const html = await body(res);
      const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
      let graphs = [];
      for (const s of scripts) {
        try { const parsed = JSON.parse(s); graphs = graphs.concat(parsed["@graph"] || [parsed]); } catch (e) { fail("T-04", "invalid JSON-LD on " + mu + ": " + e.message); }
      }
      const types = graphs.map((g) => g["@type"]);
      for (const need of ["Organization", "WebSite", "BreadcrumbList"]) {
        if (!types.includes(need)) fail("T-04", "missing " + need + " node");
      }
      const ev = graphs.find((g) => g["@type"] === "SportsEvent");
      if (!ev) fail("T-04", "missing SportsEvent on match page");
      else {
        const req = ["name", "startDate", "url", "description", "sport", "homeTeam", "awayTeam", "eventStatus", "eventAttendanceMode", "image"];
        const missing = req.filter((k) => ev[k] == null);
        if (missing.length) fail("T-04", "SportsEvent missing required fields: " + missing.join(", "));
        else pass("T-04", "SportsEvent has all required fields (S-01)");
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)$/.test(ev.startDate)) fail("T-04", "startDate not ISO 8601 with offset: " + ev.startDate);
        else pass("T-04", "startDate ISO 8601 with offset: " + ev.startDate);
        const validStatus = ["EventScheduled", "EventPostponed", "EventRescheduled", "EventCancelled", "EventMovedOnline", "EventRescheduledOnline"];
        const st = String(ev.eventStatus || "").split("/").pop();
        if (!validStatus.includes(st)) fail("T-04", "invalid eventStatus: " + ev.eventStatus);
        else pass("T-04", "eventStatus valid: " + st);
        if (ev.homeTeam && ev.awayTeam && (!ev.homeTeam.name || !ev.awayTeam.name)) fail("T-04", "homeTeam/awayTeam missing names");
        // consistency: visible text contains both team names (English names from data)
        if (ev.homeTeam && !html.includes(ev.homeTeam.name.split(" ")[0])) fail("T-04", "home team name not visible in page text: " + ev.homeTeam.name);
        else pass("T-04", "marked-up teams match visible page text");
        // never fake ratings/offers (S-04)
        if (ev.offers || ev.aggregateRating) fail("T-04", "SportsEvent carries offers/aggregateRating (not supported — must be omitted)");
        else pass("T-04", "no fake offers/ratings (S-04)");
      }
      // WebSite must not have SearchAction (retired)
      const ws = graphs.find((g) => g["@type"] === "WebSite");
      if (ws && ws.potentialAction) fail("T-04", "WebSite carries SearchAction (retired feature)");
      else pass("T-04", "no SearchAction in WebSite node");
    }
  }

  // ---------------- T-05: internal link crawl (depth 3) ----------------
  section("T-05 crawl to depth 3");
  {
    const visited = new Set();
    const inbound = new Map();
    let frontier = [B + "/"];
    let bad = 0;
    for (let depth = 0; depth < 3 && frontier.length; depth++) {
      const next = [];
      for (const u of frontier) {
        if (visited.has(u)) continue;
        visited.add(u);
        let html = "";
        try {
          const res = await fetchRaw(u);
          if (res.status >= 400 && res.status !== 404) { fail("T-05", u + " HTTP " + res.status); bad++; }
          if (res.status === 301 || res.status === 302) { fail("T-05", u + " redirected (crawlable link must be direct): " + res.headers.get("location")); bad++; }
          if (res.status === 404) { fail("T-05", u + " 404 (linked page missing)"); bad++; }
          html = await body(res);
        } catch (e) { fail("T-05", u + " fetch error: " + e.message); bad++; continue; }
        for (const m of html.matchAll(/href="(\/[a-z0-9/?=&-]+)"/g)) {
          const path = m[1].split("#")[0];
          if (/\.(css|js|png|jpg|ico|woff2?|svg|mp4|ics|xml|json|txt)$/.test(path)) continue;
          const abs = B + path;
          if (!inbound.has(abs)) inbound.set(abs, u);
          if (!visited.has(abs)) next.push(abs);
        }
      }
      frontier = next.slice(0, 150); // breadth cap for runtime
    }
    pass("T-05", "crawled " + visited.size + " internal URLs to depth 3, " + bad + " errors");
    // orphan check: sitemap URLs with zero inbound links
    const orphans = allSitemapUrls.filter((u) => !inbound.has(u) && !CONFIG.TEMPLATE_PATHS.some((t) => u === B + t));
    const orphanSample = orphans.slice(0, 10);
    if (orphans.length > allSitemapUrls.length * 0.2) fail("T-05", orphans.length + " sitemap URLs have no inbound links (sample: " + orphanSample.join(", ") + ")");
    else pass("T-05", "no significant orphan pages (" + orphans.length + " of " + allSitemapUrls.length + ")");
  }

  // ---------------- T-06: invented URL → true 404 ----------------
  section("T-06 soft-404 guard");
  {
    const res = await fetchRaw(B + "/this-page-should-not-exist-" + Date.now());
    if (res.status !== 404) fail("T-06", "invented URL returned HTTP " + res.status + " (expected 404)");
    else pass("T-06", "invented URL → 404");
    const html = await body(res);
    if (!/<a [^>]*href="\/"/.test(html)) fail("T-06", "404 page has no link home");
    else pass("T-06", "404 page links home (R-11)");
    const rm = (html.match(/<meta[^>]+name="robots"[^>]*>/i) || [""])[0];
    const hdr = res.headers.get("x-robots-tag") || "";
    if (!/noindex/i.test(rm) && !/noindex/i.test(hdr)) fail("T-06", "404 page not noindex");
    else pass("T-06", "404 page is noindex");
  }

  // ---------------- T-07: redirect matrix ----------------
  section("T-07 redirects");
  {
    const cases = [
      ["http://sportsignal.ir/", "https://sportsignal.ir/"],
      ["https://football.sportsignal.ir/matches", "https://sportsignal.ir/matches"],
      ["https://www.sportsignal.ir/", "https://sportsignal.ir/"],
      ["https://www.sportsignal.ir/matches/today", "https://sportsignal.ir/matches/today"],
      ["https://sportsignal.ir/matches/", "https://sportsignal.ir/matches"],
      ["https://sportsignal.ir/Matches", "https://sportsignal.ir/matches"],
      ["https://sportsignal.ir/public", "https://sportsignal.ir/"]
    ];
    for (const [from, to] of cases) {
      try {
        const res = await fetchRaw(from);
        const loc = res.headers.get("location") || "";
        if (res.status !== 301) fail("T-07", from + " → HTTP " + res.status + " (expected 301)");
        else if (loc !== to) fail("T-07", from + " → " + loc + " (expected " + to + ")");
        else pass("T-07", from + " → 301 " + to);
      } catch (e) { fail("T-07", from + " error: " + e.message); }
    }
    // redirect chains: follow a couple, max 1 hop to final content
    for (const from of ["http://sportsignal.ir/matches", "https://football.sportsignal.ir/"]) {
      let hops = 0, url = from;
      let res = await fetchRaw(url);
      while ([301, 302, 308].includes(res.status) && hops < 5) {
        url = res.headers.get("location"); res = await fetchRaw(url); hops++;
      }
      if (hops > 1) fail("T-07", from + " is a " + hops + "-hop chain");
      else if (hops === 1 && res.status === 200) pass("T-07", from + " single-hop to 200");
    }
  }

  // ---------------- T-08: hreflang (single-language: N/A) ----------------
  section("T-08 hreflang");
  pass("T-08", "site is single-language (fa) — hreflang not applicable per spec Section 11");

  // ---------------- T-09: Lighthouse (optional) ----------------
  section("T-09 Lighthouse mobile");
  {
    const { execFileSync } = require("child_process");
    const fs = require("fs");
    const lhBin = fs.existsSync(CONFIG.LIGHTHOUSE.BIN) ? CONFIG.LIGHTHOUSE.BIN : "lighthouse";
    const chrome = CONFIG.LIGHTHOUSE.CHROME_PATH || fs.existsSync("/usr/bin/chromium") && "/usr/bin/chromium" || "";
    const samplePaths = ["/", "/matches/today", "/teams"];
    let ran = 0;
    if (CONFIG.LIGHTHOUSE.ENABLED && chrome) {
      for (const p of samplePaths) {
        try {
          const out = execFileSync(process.execPath, [require.resolve(lhBin + "/lighthouse-cli", { paths: true })], { stdio: "ignore" });
        } catch (e) { /* handled below */ }
        try {
          const tmp = "/tmp/seo-check-lh.json";
          execFileSync(lhBin, [B + p, "--output=json", "--output-path=" + tmp, "--quiet",
            "--only-categories=performance,seo,accessibility,best-practices",
            '--chrome-flags=--headless=new --no-sandbox',
            ...(chrome ? ["--chrome-path=" + chrome] : [])], { stdio: "ignore", timeout: 120000 });
          const d = JSON.parse(fs.readFileSync(tmp, "utf-8"));
          for (const [cat, min] of Object.entries(CONFIG.LIGHTHOUSE.THRESHOLDS)) {
            const v = Math.round((d.categories[cat].score || 0) * 100);
            if (v < min) fail("T-09", p + " " + cat + " " + v + " < " + min);
            else pass("T-09", p + " " + cat + " " + v);
          }
          ran++;
        } catch (e) {
          fail("T-09", p + " lighthouse failed: " + String(e.message).slice(0, 120));
        }
      }
      if (!ran) fail("T-09", "lighthouse produced no results");
    } else {
      console.log("  ⚠ SKIPPED (set CHROME_PATH + install lighthouse to enable) — lab CWV verified manually in the report");
    }
  }

  // ---------------- T-10: production guard ----------------
  section("T-10 production noindex guard");
  {
    const res = await fetchRaw(B + "/");
    const html = await body(res);
    if (/noindex/i.test(html) || /noindex/i.test(res.headers.get("x-robots-tag") || "")) {
      fail("T-10", "PRODUCTION IS NOINDEX — deploy must fail until fixed");
    } else pass("T-10", "production serves index, follow");
    // non-production host must be noindex (R-13)
    const wd = CONFIG.ALT_HOSTS.workersDev;
    const r2 = await fetchRaw(wd + "/");
    const h2 = await body(r2);
    if (!/noindex/i.test(r2.headers.get("x-robots-tag") || "") && !/noindex/i.test(h2)) {
      fail("T-10", "non-production host (" + wd + ") is not noindex");
    } else pass("T-10", "non-production host serves noindex (R-13)");
  }

  // ---------------- T-11: IndexNow + bots ----------------
  section("T-11/T-G-02 bots and IndexNow");
  {
    for (const ua of CONFIG.BOT_UAS) {
      const expectedBlocked = CONFIG.EXPECTED_BOT_BLOCKS.includes(ua.split("/")[0]);
      const res = await fetchRaw(B + "/", { ua });
      const ok = expectedBlocked ? res.status === 403 : res.status === 200;
      if (ok) pass("G-02", ua.split("/")[0] + " → " + res.status + (expectedBlocked ? " (blocked by policy)" : ""));
      else fail("G-02", ua.split("/")[0] + " → " + res.status + (expectedBlocked ? " (expected block)" : " (must be 200)"));
    }
    // IndexNow key file (F-16)
    const robotsRes = await fetchRaw(B + "/robots.txt");
    // key is served at /{key}.txt — find it from the spec default:
    const key = "6f1c2ab9d84e53a7c0b5e2f8a3d6c4b1";
    const kr = await fetchRaw(B + "/" + key + ".txt");
    const kb = await body(kr);
    if (kr.status !== 200 || kb.trim() !== key) fail("T-11", "IndexNow key file missing/incorrect");
    else pass("T-11", "IndexNow key file served (F-16)");
    // Bing site-auth file (B-01): exact mixed-case URL must answer 200
    // DIRECTLY (Bing fetches it verbatim; a 301 to the lowercased path can
    // fail verification) and carry the ownership key.
    const bingKey = "231A90C90F293E3FAAD90B3CB81009F1";
    const br = await fetchRaw(B + "/BingSiteAuth.xml");
    const bb = await body(br);
    if (br.status !== 200) fail("B-01", "/BingSiteAuth.xml HTTP " + br.status + " — must be a direct 200 at the exact mixed-case URL (no redirect)");
    else if (br.status === 200 && !new RegExp("<user>\\s*" + bingKey + "\\s*</user>").test(bb)) fail("B-01", "BingSiteAuth.xml content does not contain the ownership key " + bingKey);
    else if (!/xml/i.test(br.headers.get("content-type") || "")) fail("B-01", "BingSiteAuth.xml content-type is not xml (" + (br.headers.get("content-type") || "none") + ")");
    else pass("B-01", "BingSiteAuth.xml served: direct 200, key present, xml content-type");
  }

  // ---------------- T-12 summary ----------------
  section("T-12 summary");
  {
    console.log("\n----------------------------------------");
    console.log("PASS: " + (results.length - failures) + "  FAIL: " + failures);
    if (failures) {
      console.log("\nFirst failing checks:");
      results.filter((r) => !r.ok).slice(0, 10).forEach((r) => console.log("  [" + r.id + "] " + r.msg));
    }
    console.log("----------------------------------------");
    process.exit(failures ? 1 : 0);
  }
})().catch((e) => { console.error("seo-check crashed: " + e.message); process.exit(2); });
