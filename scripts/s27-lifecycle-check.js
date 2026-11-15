// s27-lifecycle-check.js — the H1 live/finished lifecycle PRODUCTION PROBE.
//
// A thin, dependency-free (Node built-ins only) probe that fetches the REAL
// production /healthz + the match page HTML and verifies the lifecycle
// markers from docs/mc/post-m10-hardening-report.md §1.2 against the expected
// window (live | finished | upcoming | auto). It is NOT a regression gate
// (it needs network + a real match in the expected state) — it is wired ONLY
// into .github/workflows/s27-lifecycle-verify.yml (the Nov 20 M1 live + M2
// finished schedule + workflow_dispatch), NOT into `npm test`.
//
// THE MARKERS (from src/seo/match-centre.ts lines 213-221, the hero center
// column — the ONLY place the lifecycle branches):
//   scored + live     → .mscore (aria-label="در جریان") + .mlive (with .mdot)
//   scored + finished → .mscore (no aria) + .mfin (contains «پایان بازی»)
//   not scored        → .mkick + .mkickdate + .mcount (the countdown)
// The scorer block (.mscorer/.mgoals/.mscorers) is STRUCTURALLY ABSENT — Q4=A
// (the scorer NEVER renders, even when finished). The result block
// <h2>نتیجه نهایی</h2> (src/seo/pages.ts:1107) renders ONLY when finished.
//
// USAGE (the workflow sets these env vars):
//   MATCH_URL        — the match page URL (default: the Bayern vs Köln page)
//   HEALTHZ_URL      — the /healthz URL (default: production)
//   EXPECTED_WINDOW   — live | finished | upcoming | auto (default: auto)
//   MAX_WAIT_SEC      — poll budget for the live/finished window (default 360)
//   POLL_SEC          — poll interval (default 60)
//
// OUTPUT:
//   - a markdown report on stdout (captured to $GITHUB_STEP_SUMMARY + a file
//     for the issue body),
//   - /tmp/s27-verdict.json (structured verdict),
//   - exit 0 = PASS or PENDING (not a red X — the issue carries the nuance),
//     exit 1 = FAIL (a real marker violation — needs a human/agent look).
//
// NOTE: the GSC <title> MAY carry the live/FT score if the projection updates
// it — that is the EXPECTED live→finished title update, NOT a byte-freeze
// violation (per §1.2 + §1.4.4). The script REPORTS the title + the diff vs
// the §1.4.2 baseline but does NOT hard-fail on a title change in the
// live/finished windows.

const https = require("https");
const fs = require("fs");

const MATCH_URL =
  process.env.MATCH_URL ||
  "https://sportsignal.ir/matches/bayern-munich-vs-1-koln-2026-11-20";
const HEALTHZ_URL = process.env.HEALTHZ_URL || "https://sportsignal.ir/healthz";
const EXPECTED_WINDOW = (process.env.EXPECTED_WINDOW || "auto").toLowerCase();
const MAX_WAIT_SEC = parseInt(process.env.MAX_WAIT_SEC || "360", 10);
const POLL_SEC = parseInt(process.env.POLL_SEC || "60", 10);

// The §1.4.2 byte-frozen baseline title (the upcoming-state title). The
// live/finished title MAY differ (the projection carries the score) — that
// is EXPECTED, NOT a violation. Reported as a diff, not a hard-fail.
const BASELINE_TITLE =
  "⚽ بایرن مونیخ – کلن | بوندسلیگا، ۲۹ آبان | اسپرت سیگنال";

function fetchText(url, redirectsLeft) {
  if (redirectsLeft === undefined) redirectsLeft = 5;
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { "User-Agent": "s27-lifecycle-check/1.0 (+SportSignal)" } },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          if (redirectsLeft <= 0) return reject(new Error("too many redirects"));
          res.resume();
          var next = new URL(res.headers.location, url).href;
          return resolve(fetchText(next, redirectsLeft - 1));
        }
        var body = "";
        res.setEncoding("utf8");
        res.on("data", function (c) { body += c; });
        res.on("end", function () {
          resolve({
            status: res.statusCode,
            bytes: Buffer.byteLength(body),
            body: body,
          });
        });
      }
    );
    req.setTimeout(30000, function () { req.destroy(new Error("timeout")); });
    req.on("error", reject);
  });
}

function countClass(html, cls) {
  var re = new RegExp('class=["\'][^"\']*\\b' + cls + '\\b[^"\']*["\']', "g");
  return (html.match(re) || []).length;
}

function countString(html, s) {
  var i = 0, n = 0;
  while ((i = html.indexOf(s, i)) !== -1) { n++; i += s.length; }
  return n;
}

function analyze(html) {
  return {
    mscore: countClass(html, "mscore"),
    mscore_live_aria: countString(html, 'class="mscore" aria-label="در جریان"'),
    mlive: countClass(html, "mlive"),
    mdot: countClass(html, "mdot"),
    mfin: countClass(html, "mfin"),
    mkick: countClass(html, "mkick"),
    mcount: countClass(html, "mcount"),
    dataKickoff: (html.match(/data-kickoff="([^"]*)"/) || [])[1] || null,
    mscorer: countClass(html, "mscorer"),
    mgoals: countClass(html, "mgoals"),
    mscorers: countClass(html, "mscorers"),
    resultH2: countString(html, "<h2>نتیجه نهایی</h2>"),
    pazanBazi_raw: countString(html, "پایان بازی"),
    darJaryan_raw: countString(html, "در جریان"),
    title: (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || null,
    hero_is_div: /<div class="mcentre-hero">/.test(html),
    hero_is_section: /<section class="mcentre-hero">/.test(html),
    bytes: Buffer.byteLength(html),
  };
}

function detectWindow(m) {
  if (m.mlive >= 1 && m.mscore >= 1) return "live";
  if (m.mfin >= 1 && m.mscore >= 1) return "finished";
  if (m.mkick >= 1) return "upcoming";
  return "unknown";
}

function verdictFor(window, m, healthz) {
  var scorer = m.mscorer + m.mgoals + m.mscorers; // Q4=A — always 0
  var problems = [];
  if (window === "live") {
    if (m.mscore < 1) problems.push(".mscore absent (expected present in live)");
    if (m.mlive < 1) problems.push(".mlive pulse absent (expected present in live)");
    if (m.mscore_live_aria < 1)
      problems.push('.mscore aria-label="در جریان" absent (the live marker)');
    if (m.mfin > 0) problems.push(".mfin present (expected absent in live)");
    if (m.mkick > 0)
      problems.push(".mkick present (expected absent in live — score replaces it)");
    if (scorer > 0)
      problems.push("scorer block present (Q4=A violation — must NEVER render)");
    if (m.resultH2 > 0)
      problems.push("result <h2>نتیجه نهایی</h2> present (lives ONLY when finished)");
    if (healthz && healthz.sched_live_now < 1)
      problems.push(
        "/healthz sched_live_now=" + healthz.sched_live_now + " (expected >0 during live window)"
      );
  } else if (window === "finished") {
    if (m.mscore < 1) problems.push(".mscore absent (expected present in finished)");
    if (m.mfin < 1)
      problems.push(".mfin «پایان بازی» absent (expected present in finished)");
    if (m.mlive > 0) problems.push(".mlive present (expected absent in finished)");
    if (m.mkick > 0) problems.push(".mkick present (expected absent in finished)");
    if (scorer > 0)
      problems.push("scorer block present (Q4=A violation — NEVER renders, even finished)");
    if (m.resultH2 < 1)
      problems.push("result <h2>نتیجه نهایی</h2> absent (expected present in finished)");
  } else if (window === "upcoming") {
    if (m.mkick < 1) problems.push(".mkick absent (expected present in upcoming)");
    if (m.mcount < 1) problems.push(".mcount absent (expected present in upcoming)");
    if (!m.dataKickoff) problems.push("data-kickoff attr absent");
    if (m.mscore > 0 || m.mlive > 0 || m.mfin > 0)
      problems.push("a live/finished marker present (expected all absent in upcoming)");
    if (scorer > 0) problems.push("scorer block present (Q4=A violation)");
    if (m.resultH2 > 0) problems.push("result block present (expected absent in upcoming)");
  }
  return { problems: problems, scorer: scorer };
}

function buildReport(o) {
  var m = o.m;
  var lines = [];
  lines.push("# S27 Lifecycle Check — " + o.status);
  lines.push("");
  lines.push("- **Match URL:** " + MATCH_URL);
  lines.push("- **Expected window:** " + o.expected);
  lines.push("- **Detected window:** " + o.window);
  lines.push("- **Check time (UTC):** " + new Date().toISOString());
  lines.push("- **Poll attempts:** " + o.attempts);
  lines.push("");
  lines.push("## /healthz");
  lines.push("```json");
  lines.push(JSON.stringify(o.healthz, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Match-page markers");
  lines.push("| Marker | Count |");
  lines.push("|---|---|");
  lines.push("| .mscore | " + m.mscore + " |");
  lines.push('| .mscore aria-label="در جریان" (live) | ' + m.mscore_live_aria + " |");
  lines.push("| .mlive (live pulse) | " + m.mlive + " |");
  lines.push("| .mdot | " + m.mdot + " |");
  lines.push("| .mfin «پایان بازی» (finished) | " + m.mfin + " |");
  lines.push("| .mkick (upcoming) | " + m.mkick + " |");
  lines.push("| .mcount (countdown) | " + m.mcount + " |");
  lines.push("| data-kickoff | " + (m.dataKickoff || "—") + " |");
  lines.push(
    "| scorer .mscorer/.mgoals/.mscorers (Q4=A — always 0) | " +
      m.mscorer + "/" + m.mgoals + "/" + m.mscorers + " |"
  );
  lines.push("| result <h2>نتیجه نهایی</h2> (finished only) | " + m.resultH2 + " |");
  lines.push("| raw «پایان بازی» hits (incl. lifecycle text) | " + m.pazanBazi_raw + " |");
  lines.push("| raw «در جریان» hits (incl. lifecycle text) | " + m.darJaryan_raw + " |");
  lines.push("| page bytes | " + m.bytes + " |");
  lines.push("| F1 fix: hero is <div> (NOT <section>) | " + (m.hero_is_div ? "YES ✓" : "NO ✗") + " |");
  lines.push("");
  lines.push("## GSC <title>");
  lines.push("```");
  lines.push(m.title || "(none)");
  lines.push("```");
  lines.push("- §1.4.2 baseline: `" + BASELINE_TITLE + "`");
  lines.push(
    "- Title " +
      (m.title === BASELINE_TITLE
        ? "**byte-frozen** (matches §1.4.2)"
        : "**differs** from baseline — EXPECTED if the projection carries the live/FT score (NOT a byte-freeze violation per §1.4.4)")
  );
  if (o.titleDiff) lines.push("- diff note: " + o.titleDiff);
  lines.push("");
  lines.push("## Verdict");
  return lines.join("\n");
}

(async function () {
  var attempts = 0;
  var status = "PENDING";
  var healthz = null;
  var m = null;
  var window = "unknown";
  var expected = EXPECTED_WINDOW;

  var deadline = Date.now() + MAX_WAIT_SEC * 1000;
  while (Date.now() < deadline) {
    attempts++;
    try {
      var hz = await fetchText(HEALTHZ_URL);
      healthz = hz.status === 200 ? JSON.parse(hz.body) : { _http: hz.status };
      var pg = await fetchText(MATCH_URL);
      if (pg.status !== 200) {
        console.error("match page HTTP " + pg.status);
      } else {
        m = analyze(pg.body);
        window = detectWindow(m);
        var target = expected === "auto" ? window : expected;
        if (target === "upcoming" || target === window || expected === "auto") {
          var r = verdictFor(target, m, healthz);
          m._scorer = r.scorer;
          if (r.problems.length === 0) {
            status = "PASS";
            break;
          } else if (expected === "auto") {
            m._problems = r.problems;
            status = "FAIL";
            break;
          } else {
            m._problems = r.problems;
          }
        }
      }
    } catch (e) {
      console.error("poll " + attempts + " error: " + e.message);
    }
    if (Date.now() + POLL_SEC * 1000 >= deadline) break;
    await new Promise(function (r) { setTimeout(r, POLL_SEC * 1000); });
  }

  if (!m) {
    console.error("no match-page result captured");
    process.exit(1);
  }
  var r2 = verdictFor(expected === "auto" ? window : expected, m, healthz);
  m._scorer = r2.scorer;
  m._problems = r2.problems;
  if (status !== "PASS") {
    if (r2.problems.length === 0) status = "PASS";
    else if (expected !== "auto" && window !== expected) status = "PENDING";
    else status = "FAIL";
  }

  var titleDiff =
    m.title === BASELINE_TITLE
      ? null
      : "the title changed — verify this is the EXPECTED live/finished score update, not drift";

  var report = buildReport({
    window: window,
    expected: expected,
    m: m,
    healthz: healthz,
    attempts: attempts,
    status: status,
    titleDiff: titleDiff,
  });
  var fullReport =
    report +
    (r2.problems.length
      ? "\n## Problems\n" + r2.problems.map(function (p) { return "- " + p; }).join("\n") + "\n"
      : "\n_No marker violations detected._\n");

  fs.writeFileSync("/tmp/s27-report.md", fullReport);
  fs.writeFileSync(
    "/tmp/s27-verdict.json",
    JSON.stringify(
      { status: status, window: window, expected: expected, attempts: attempts, healthz: healthz, markers: m, problems: r2.problems },
      null,
      2
    )
  );
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, fullReport);
  }
  console.log(fullReport);
  console.log(
    "\n[verdict] " +
      status +
      " (window=" + window + ", expected=" + expected + ", attempts=" + attempts + ")"
  );

  process.exit(status === "FAIL" ? 1 : 0);
})().catch(function (e) {
  console.error("fatal:", e);
  process.exit(1);
});
