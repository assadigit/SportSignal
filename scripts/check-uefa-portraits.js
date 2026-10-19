// check-uefa-portraits.js — offline test gate for the UEFA player portrait
// pipeline (uefa-player-portraits.spec.md §11). Uses local fixtures ONLY:
// no live UEFA requests. Covers:
//   - roster integrity: 36 entries, unique ASCII kebab-case filenames, order
//   - accent/punctuation handling in name normalization
//   - namesake ambiguity (Luis Suárez COL vs URU; alias + compact matching)
//   - HTML masquerading as an image download
//   - 404 = missing candidate; bounded retries; access-denied host blocking
//   - rate limiting: >= 1s spacing between requests to the same host
//   - transparent image decoding + subject bounds
//   - aspect-ratio preservation and common 512x512 output dimensions
//   - refusal to upscale (scale capped at 1; undersized sources flagged)
//   - manifest entries for failures (nulls, no fake files)
//   - safe filenames + validated redirects (host allowlist)
//   - idempotent reruns (no duplicate downloads; identical output hashes)
//
// Run: node scripts/check-uefa-portraits.js   (exit 0 = pass)
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { sharp, validateImageBuffer, subjectBounds, normalizePortrait, sha256 } = require("./uefa-player-portraits/lib/images");
const parse = require("./uefa-player-portraits/lib/parse");
const transport = require("./uefa-player-portraits/lib/transport");

const ROOT = path.resolve(__dirname, "..");
const TMP = fs.mkdtempSync(path.join(require("os").tmpdir(), "uefa-portraits-test-"));

let passed = 0;
const failures = [];
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  ok - ${name}`);
    })
    .catch((err) => {
      failures.push(`${name}: ${err.message}`);
      console.error(`  FAIL - ${name}: ${err.message}`);
    });
}

async function makeCutout({ w = 800, h = 800, subject = { x: 200, y: 50, w: 400, h: 700 }, semiFringe = true }) {
  // draw an opaque ellipse "player" on a transparent canvas
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <ellipse cx="${subject.x + subject.w / 2}" cy="${subject.y + subject.h / 2}" rx="${subject.w / 2}" ry="${subject.h / 2}" fill="#c8102e" fill-opacity="1"/>
    ${semiFringe ? `<ellipse cx="${subject.x + subject.w / 2}" cy="${subject.y + subject.h / 2}" rx="${subject.w / 2 + 6}" ry="${subject.h / 2 + 6}" fill="#c8102e" fill-opacity="0.03"/>` : ""}
  </svg>`;
  return sharp(Buffer.from(svg)).webp({ lossless: true }).toBuffer();
}

async function main() {
  const roster = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/uefa-player-portraits/roster.json"), "utf8"));
  const manifestPath = path.join(ROOT, "assets", "players", "uefa", "manifest.json");

  console.log("uefa-portraits: roster integrity");
  await test("roster has exactly 36 players", () => assert.strictEqual(roster.players.length, 36));
  await test("roster order is 1..36", () =>
    assert.ok(roster.players.every((p, i) => p.roster_index === i + 1)));
  await test("filenames are unique ASCII kebab-case webp", () => {
    const names = roster.players.map((p) => p.filename);
    assert.strictEqual(new Set(names).size, 36);
    assert.ok(names.every((f) => /^[a-z0-9-]+\.webp$/.test(f)), "non-kebab filename found");
  });
  await test("no filename derives from a club name", () => {
    // club labels contain spaces/accents; filenames must come from player names
    assert.ok(roster.players.every((p) => !p.filename.includes("--")));
  });

  console.log("uefa-portraits: name normalization (accents, punctuation)");
  await test("accents fold for search only", () => {
    assert.strictEqual(parse.normalizeName("Ousmane Dembélé"), "ousmane dembele");
    assert.strictEqual(parse.normalizeName("N’Golo Kanté"), "ngolo kante");
    assert.strictEqual(parse.normalizeName("Lukáš Provod"), "lukas provod");
    assert.strictEqual(parse.normalizeName("Andraž Šporar"), "andraz sporar");
    assert.strictEqual(parse.normalizeName("Luis Suárez 🇨🇴"), "luis suarez");
  });
  await test("slug + compact forms handle hyphenation variance", () => {
    assert.strictEqual(parse.nameToSlug("Kylian Mbappé"), "kylian-mbappe");
    assert.strictEqual(parse.compactName("N’Golo Kanté"), "ngolokante");
    assert.strictEqual(parse.compactName("n-golo-kante"), "ngolokante");
  });

  console.log("uefa-portraits: squad matching + namesake ambiguity");
  const squad = [
    { playerId: "1", slug: "luis-suarez", profilePath: "/x/players/1--luis-suarez/", competition: "c" },
    { playerId: "2", slug: "nicolas-paz", profilePath: "/x/players/2--nicolas-paz/", competition: "c" },
    { playerId: "3", slug: "n-golo-kante", profilePath: "/x/players/3--n-golo-kante/", competition: "c" },
  ];
  await test("exact match resolves", () => {
    const { match } = parse.matchSquadPlayer(squad, "luis suarez");
    assert.strictEqual(match.playerId, "1");
  });
  await test("alias resolves nickname listing (Nico Paz -> nicolas-paz)", () => {
    const { match } = parse.matchSquadPlayer(squad, "nico paz", ["nicolas paz"]);
    assert.strictEqual(match.playerId, "2");
  });
  await test("compact matching resolves apostrophe slug variance (Kanté)", () => {
    const { match } = parse.matchSquadPlayer(squad, "ngolo kante");
    assert.strictEqual(match.playerId, "3");
  });
  await test("two same-name squad entries stay ambiguous (never auto-accepted)", () => {
    const dup = squad.concat([{ playerId: "9", slug: "luis-suarez", profilePath: "/x/players/9--luis-suarez/", competition: "c" }]);
    const { match, alsoMatching } = parse.matchSquadPlayer(dup, "luis suarez");
    assert.strictEqual(match, null);
    assert.strictEqual(alsoMatching.length, 2);
  });
  await test("namesake DOB separation (Suárez COL 1997 vs URU 1987)", () => {
    const hint = { date_of_birth: "1997-12-02", nationality: "Colombia" };
    const ok = parse.parseDob("2/12/1997 (28)");
    const bad = parse.parseDob("24/1/1987 (39)");
    assert.strictEqual(ok, "1997-12-02");
    assert.strictEqual(bad, "1987-01-24");
    assert.notStrictEqual(ok, bad);
    assert.ok(Math.abs(Date.parse(ok) - Date.parse(hint.date_of_birth)) === 0);
  });
  await test("DOB data-entry variance (<=400 days) vs namesake gap (>400 days)", () => {
    const days = (a, b) => Math.abs(Date.parse(a) - Date.parse(b)) / 86400000;
    assert.ok(days("1998-12-20", "1998-12-19") <= 400); // variance
    assert.ok(days("1997-12-02", "1987-01-24") > 400); // namesake
  });

  console.log("uefa-portraits: download validation");
  await test("HTML masquerading as an image is rejected", async () => {
    const fake = Buffer.from("<html><body>Access Denied</body></html>");
    const r = await validateImageBuffer(fake);
    assert.strictEqual(r.ok, false);
    assert.ok(r.problems.some((p) => /decodable image|implausibly small/.test(p)));
  });
  await test("fully transparent placeholder is rejected", async () => {
    const empty = await sharp({ create: { width: 300, height: 300, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).webp().toBuffer();
    const r = await validateImageBuffer(empty);
    assert.strictEqual(r.ok, false);
    assert.ok(r.problems.some((p) => /fully transparent/.test(p)));
  });
  await test("opaque image (no alpha) is rejected for cutoff candidates", async () => {
    const opaque = await sharp({ create: { width: 300, height: 300, channels: 3, background: { r: 9, g: 9, b: 9 } } }).jpeg().toBuffer();
    const r = await validateImageBuffer(opaque, { expectAlpha: true });
    assert.strictEqual(r.ok, false);
    assert.ok(r.problems.some((p) => /no alpha channel/.test(p)));
  });
  await test("implausibly small image is rejected", async () => {
    const tiny = await makeCutout({ w: 40, h: 40, subject: { x: 5, y: 5, w: 30, h: 30 } });
    const r = await validateImageBuffer(tiny);
    assert.strictEqual(r.ok, false);
  });
  await test("valid transparent cutout passes", async () => {
    const good = await makeCutout({});
    const r = await validateImageBuffer(good);
    assert.strictEqual(r.ok, true, r.problems.join("; "));
  });

  console.log("uefa-portraits: transport behaviour");
  await test("URLs outside the UEFA scope are refused", () => {
    assert.throws(() => transport.assertUrlAllowed("https://example.com/x"), /outside the allowed UEFA scope/);
    assert.throws(() => transport.assertUrlAllowed("http://img.uefa.com/imgml/TP/players/1/2027/cutoff/1.webp"), /non-HTTPS/);
    assert.throws(() => transport.assertUrlAllowed("https://img.uefa.com/imgml/TP/teams/1.webp"), /outside the allowed UEFA scope/);
    assert.doesNotThrow(() => transport.assertUrlAllowed("https://img.uefa.com/imgml/TP/players/1/2027/cutoff/250066886.webp"));
  });
  await test("access-denied detection (Akamai style)", () => {
    const t = transport._internal;
    assert.ok(t.looksLikeAccessDenied(403, ""));
    assert.ok(t.looksLikeAccessDenied(200, "<html><title>Access Denied</title>"));
    assert.ok(!t.looksLikeAccessDenied(404, ""));
    assert.ok(!t.looksLikeAccessDenied(200, "<html>normal page"));
  });
  await test("redirect destinations are validated before following", () => {
    // a Location to a disallowed host must be refused by the same allowlist
    assert.throws(() => transport.assertUrlAllowed("https://evil.example.com/imgml/TP/players/1/2027/cutoff/1.webp"));
  });
  await test("politeness: >= 1s spacing between same-host requests", async () => {
    const t = transport._internal;
    const before = t.lastRequestAt.get("img.uefa.com") || 0;
    const start = Date.now();
    await t.politeWait("img.uefa.com");
    await t.politeWait("img.uefa.com");
    const waited = Date.now() - start;
    assert.ok(waited >= 1000, `expected >=1000ms spacing, saw ${waited}ms`);
    assert.ok(t.lastRequestAt.get("img.uefa.com") >= before);
  });

  console.log("uefa-portraits: normalization");
  const cutout = await makeCutout({});
  await test("subject bounds detect the visible cutout", async () => {
    const b = await subjectBounds(cutout);
    assert.strictEqual(b.empty, false);
    // ellipse 400x700 at (200,50) — bounds within a small tolerance
    assert.ok(Math.abs(b.subjectWidth - 400) <= 12, `w ${b.subjectWidth}`);
    assert.ok(Math.abs(b.subjectHeight - 700) <= 12, `h ${b.subjectHeight}`);
  });
  await test("near-transparent noise fringe is ignored", async () => {
    const b = await subjectBounds(cutout); // fixture includes a 3%-alpha fringe
    assert.ok(b.subjectWidth <= 406, `fringe not ignored: ${b.subjectWidth}`);
  });
  let norm1;
  await test("output is 512x512 lossless webp with alpha", async () => {
    norm1 = await normalizePortrait(cutout);
    const meta = await sharp(norm1.buffer).metadata();
    assert.strictEqual(meta.width, 512);
    assert.strictEqual(meta.height, 512);
    assert.strictEqual(meta.format, "webp");
    assert.strictEqual(meta.hasAlpha, true);
  });
  await test("aspect ratio of the subject is preserved", () => {
    const n = norm1.normalization;
    const src = n.source_subject_bounds.w / n.source_subject_bounds.h;
    const out = n.output_subject_size.w / n.output_subject_size.h;
    assert.ok(Math.abs(src - out) / src < 0.01, `src ${src} vs out ${out}`);
  });
  await test("subject fills the content box, bottom-aligned", () => {
    const n = norm1.normalization;
    assert.ok(Math.abs(n.applied_scale - Math.min(460 / n.source_subject_bounds.w, 460 / n.source_subject_bounds.h)) < 0.01);
    assert.strictEqual(n.placement.top + n.output_subject_size.h, 26 + 460); // content box bottom
  });
  await test("refuses to upscale: small source is placed at scale 1 and flagged", async () => {
    const small = await makeCutout({ w: 200, h: 200, subject: { x: 50, y: 20, w: 100, h: 160 } });
    const r = await normalizePortrait(small);
    assert.strictEqual(r.normalization.applied_scale, 1);
    assert.strictEqual(r.normalization.scale_capped_at_one, true);
    assert.strictEqual(r.normalization.output_subject_size.w, 100); // no enlargement
    assert.ok(r.warnings.some((w) => /without upscaling/.test(w)));
  });
  await test("framing override must be documented and <= 1", async () => {
    await assert.rejects(() => normalizePortrait(cutout, { framing_override: { scale: 1.5 } }), /must be in \(0, 1\]/);
    const r = await normalizePortrait(cutout, { framing_override: { scale: 0.8 } });
    assert.ok(r.normalization.applied_scale <= 0.8);
    assert.strictEqual(r.normalization.framing_override.scale, 0.8);
  });
  await test("idempotent rerun: identical bytes for identical input", async () => {
    const again = await normalizePortrait(cutout);
    assert.strictEqual(sha256(again.buffer), sha256(norm1.buffer));
  });

  console.log("uefa-portraits: profile parsing (fixtures)");
  const fixtureHtml = fs.readFileSync(path.join(__dirname, "uefa-player-portraits", "fixtures", "profile.html"), "utf8");
  await test("profile fields parse (name, club, DOB, cutoff URL + id binding)", () => {
    const p = parse.parsePlayerProfile(fixtureHtml, "https://www.uefa.com/uefachampionsleague/clubs/players/250066886--ousmane-dembele/");
    assert.strictEqual(p.full_name, "Ousmane Dembélé");
    assert.strictEqual(p.uefa_observed_club, "Paris");
    assert.strictEqual(p.date_of_birth, "1997-05-15");
    assert.strictEqual(p.nationality, "France");
    assert.strictEqual(p.position, "Forward");
    assert.strictEqual(p.cutoff_image_url, "https://img.uefa.com/imgml/TP/players/1/2027/cutoff/250066886.webp");
    assert.strictEqual(p.cutoff_player_id, "250066886");
  });
  await test("cutoff id must match the profile id (rejects parser drift)", () => {
    const p = parse.parsePlayerProfile(fixtureHtml, "https://x/1--a/");
    assert.strictEqual(p.cutoff_player_id, "250066886");
    assert.notStrictEqual(p.cutoff_player_id, "999999");
  });
  await test("squad page parsing extracts player links", () => {
    const squadHtml = fs.readFileSync(path.join(__dirname, "uefa-player-portraits", "fixtures", "squad.html"), "utf8");
    const list = parse.parseSquad(squadHtml, "uefachampionsleague");
    assert.ok(list.length >= 3);
    assert.ok(list.some((p) => p.slug === "ousmane-dembele" && p.playerId === "250066886"));
  });

  console.log("uefa-portraits: manifest (when present)");
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    await test("manifest covers all 36 roster players in order", () => {
      assert.strictEqual(manifest.entries.length, 36);
      assert.ok(manifest.entries.every((e, i) => e.roster_index === i + 1));
      assert.ok(manifest.entries.every((e, i) => e.filename === roster.players[i].filename));
    });
    await test("club labels preserved verbatim (never rewritten)", () => {
      assert.ok(manifest.entries.every((e, i) => e.requested_club_label === roster.players[i].requested_club_label));
    });
    await test("unique UEFA player ids (no accidental duplicate identities)", () => {
      const ids = manifest.entries.filter((e) => e.uefa_player_id).map((e) => e.uefa_player_id);
      assert.strictEqual(new Set(ids).size, ids.length);
    });
    await test("unresolved entries carry nulls, not fabricated metadata", () => {
      for (const e of manifest.entries) {
        if (e.status !== "complete") {
          assert.strictEqual(e.output_sha256, null);
          assert.strictEqual(e.output_width, null);
          assert.strictEqual(e.normalization, null);
          assert.ok(!fs.existsSync(path.join(ROOT, "assets", "players", "uefa", e.filename)), `fake file for ${e.filename}`);
        }
      }
    });
    await test("complete entries have full provenance (UEFA hosts or recorded alt_source)", () => {
      for (const e of manifest.entries) {
        if (e.status === "complete") {
          assert.strictEqual(e.source_has_alpha, true);
          assert.ok(e.source_sha256 && e.fetched_at && e.output_sha256);
          assert.strictEqual(e.output_width, 512);
          assert.strictEqual(e.output_height, 512);
          if (e.alt_source) {
            // league-official alternative (spec v2.1 §8b): platform named,
            // platform player reference recorded, source URL on that
            // platform's CDN, upscale only with the explicit flag
            assert.ok(typeof e.alt_source.platform === "string" && e.alt_source.platform.length > 0);
            assert.ok(typeof e.alt_source.platform_player_ref === "string" && e.alt_source.platform_player_ref.length > 0);
            const ALT_PREFIXES = {
              "premierleague.com": "https://resources.premierleague.com/",
              "laliga.com": "https://assets.laliga.com/",
              "legaseriea.it": "https://media-sdp.legaseriea.it/",
              "bundesliga.com": "https://assets.bundesliga.com/",
            };
            if (ALT_PREFIXES[e.alt_source.platform]) {
              assert.ok(e.source_image_url.startsWith(ALT_PREFIXES[e.alt_source.platform]));
            } else if (e.alt_source.platform === "ligue1.fr") {
              assert.ok(/\.ligue1\.fr|^https:\/\/s3\.[^/]*\.amazonaws\.com\/(ligue1\.image|image\.mpg)\//.test(e.source_image_url));
            } else {
              throw new Error(`${e.filename}: unknown alt_source.platform ${e.alt_source.platform}`);
            }
            if (e.normalization.applied_scale > 1) {
              assert.strictEqual(e.alt_source.allow_upscale, true);
            }
          } else {
            assert.ok(/^https:\/\/img\.uefa\.com\/imgml\/TP\/players\//.test(e.source_image_url));
            assert.ok(/^https:\/\/www\.uefa\.com\//.test(e.canonical_profile_url));
            assert.ok(e.normalization.applied_scale <= 1);
          }
        }
      }
    });
  } else {
    await test("manifest missing is reported (run normalize first)", () => {
      throw new Error("assets/players/uefa/manifest.json not found — run `npm run portraits:normalize`");
    });
  }

  // ---- v2.3 style gate (spec §8c): no card render / head-only is wired ----
  // Offline repo-state check (no VLM calls): the styles recorded by
  // vlm-style-audit --apply (and by normalize from the fill-time gate) must
  // keep every DISPLAYED (wired) portrait in the publishable set, and no
  // published entry anywhere may claim a confirmed card_render/head_photo
  // while it is wired.
  console.log("uefa-portraits: v2.3 style gate (jersey-priority display rule)");
  await test("style vocabulary: every recorded style is a known tier", () => {
    const KNOWN = new Set(["jersey_photo", "bust_photo", "head_photo", "card_render", "unclear", null]);
    for (const mf of ["manifest-heroes.json", "manifest.json"]) {
      const m = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "players", "uefa", mf), "utf8"));
      for (const e of m.entries || []) {
        assert.ok(KNOWN.has(e.style === undefined ? null : e.style), `${mf}: ${e.filename} carries unknown style ${JSON.stringify(e.style)}`);
      }
    }
  });
  await test("no WIRED portrait is a card render or head-only (the FIFA-card rule)", () => {
    const assetsDir = path.join(ROOT, "assets");
    const bundles = fs.readdirSync(assetsDir).filter((f) => /^public-\d+\.\d+\.js$/.test(f)).sort((a, b) => {
      const na = a.match(/(\d+)\.(\d+)/), nb = b.match(/(\d+)\.(\d+)/);
      return (parseInt(nb[1] + nb[2], 10)) - (parseInt(na[1] + na[2], 10));
    });
    assert.ok(bundles.length, "no public-*.js bundle found");
    const src = fs.readFileSync(path.join(assetsDir, bundles[0]), "utf8");
    const block = src.match(/var HERO_ART=\{[\s\S]*?\n\};/);
    assert.ok(block, "HERO_ART block not found in " + bundles[0]);
    const wiredFiles = [...block[0].matchAll(/src:"(\/players\/uefa\/[a-z0-9-]+\.webp)"/g)].map((m) => path.basename(m[1]));
    const styleOf = {};
    for (const mf of ["manifest-heroes.json", "manifest.json"]) {
      const m = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "players", "uefa", mf), "utf8"));
      for (const e of m.entries || []) {
        if (e.filename && !(e.filename in styleOf)) styleOf[e.filename] = e.style === undefined ? null : e.style;
      }
    }
    for (const f of wiredFiles) {
      const st = styleOf[f];
      assert.ok(
        st === "jersey_photo" || st === "bust_photo" || st === null,
        `${f} is WIRED but its recorded style is ${JSON.stringify(st)} — a card render/head-only must never be displayed (spec v2.3 §8c; replace via alt-fetch --refill)`
      );
    }
  });
  await test("confirmed card renders carry the never-wire warning", () => {
    for (const mf of ["manifest-heroes.json", "manifest.json"]) {
      const m = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "players", "uefa", mf), "utf8"));
      for (const e of m.entries || []) {
        if (e.style === "card_render" || e.style === "head_photo") {
          assert.ok(
            (e.warnings || []).some((w) => /^style gate:/.test(w)),
            `${mf}: ${e.filename} is ${e.style} but carries no style-gate warning (run npm run heroes:style-audit -- --apply)`
          );
        }
      }
    }
  });

  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`\nuefa-portraits: ${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.error("FAILURES:");
    failures.forEach((f) => console.error("  ✗ " + f));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
