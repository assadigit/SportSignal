#!/usr/bin/env node
// scripts/check-seo-image-sitemap.js
// SEO Follow-up Track Session 16 (S16-M2 — the image sitemap, the P2-4
// gap fix). The sitemap entries now declare the page's image(s) to Google
// Image search via the <image:image> extension (xmlns:image). The match
// pages declare their specific per-match OG image (/og/match-<slug>.png);
// the team/competition/static pages declare the site OG default
// (/og/default.png — mirrors their og:image meta).
//
// Freeze-safe: a machine-file extension (NOT a byte-frozen title/H1/
// description/answer-sentence byte). Pure string concatenation on the
// already-iterated rows — zero new KV-read/subrequest/CPU.
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

let failures = 0;
let oks = 0;
function ok(msg) { oks++; console.log("OK   check-seo-image-sitemap: " + msg); }
function bad(msg) { console.error("FAIL check-seo-image-sitemap: " + msg); failures++; }

const filesSrc = fs.readFileSync(path.join(root, "src", "seo", "files.ts"), "utf8");

// 1. urlNode accepts an optional images param.
if (/function urlNode\s*\(\s*path:\s*string,\s*lastmod:\s*string,\s*images\?:\s*string\[\]\s*\)/.test(filesSrc)) ok("urlNode accepts an optional images param (the image-sitemap extension hook)");
else bad("urlNode does NOT accept an images param (the image-sitemap extension NOT wired)");

// 2. urlNode emits <image:image><image:loc> for each image.
if (/imageNodes\(images\)/.test(filesSrc) && /<image:image><image:loc>/.test(filesSrc)) ok("urlNode emits <image:image><image:loc> for each image (the Google Image-sitemap extension)");
else bad("urlNode does NOT emit the <image:image> extension");

// 3. urlsetXml declares the xmlns:image namespace.
if (/xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/.test(filesSrc)) ok("urlsetXml declares the xmlns:image namespace (http://www.google.com/schemas/sitemap-image/1.1)");
else bad("urlsetXml does NOT declare the xmlns:image namespace");

// 4. ogImageForPath computes the per-match OG image for /matches/ paths.
if (/function ogImageForPath[\s\S]*?\/matches\/[\s\S]*?\/og\/match-/.test(filesSrc)) ok("ogImageForPath computes the per-match OG image (/og/match-<slug>.png) for /matches/ paths — the specific, self-hosted dynamic image");
else bad("ogImageForPath does NOT compute the per-match OG image for /matches/ paths");

// 5. ogImageForPath falls back to SEO.OG_DEFAULT_IMAGE for non-match paths.
if (/ogImageForPath[\s\S]*?SEO\.OG_DEFAULT_IMAGE/.test(filesSrc)) ok("ogImageForPath falls back to SEO.OG_DEFAULT_IMAGE for non-match paths (the team/competition/static pages — mirrors their og:image meta)");
else bad("ogImageForPath does NOT fall back to the site OG default for non-match paths");

// 6. The matches sitemap builder passes ogImageForPath.
if (/for \(const c of candidates\) rows \+= urlNode\(c\.path, map\[c\.path\], ogImageForPath\(c\.path\)\)/.test(filesSrc)) ok("the matches sitemap builder passes ogImageForPath(c.path) — the per-match OG image declared on every match URL");
else bad("the matches sitemap builder does NOT pass ogImageForPath");

// 7. The teams sitemap builder passes ogImageForPath.
if (/teams[\s\S]*?for \(const c of candidates\) rows \+= urlNode\(c\.path, map\[c\.path\], ogImageForPath\(c\.path\)\)/.test(filesSrc)) ok("the teams sitemap builder passes ogImageForPath(c.path) — the site OG default declared on every selected-team URL");
else bad("the teams sitemap builder does NOT pass ogImageForPath");

// 8. The competitions sitemap builder passes ogImageForPath.
if (/competitions[\s\S]*?for \(const c of candidates\) rows \+= urlNode\(c\.path, map\[c\.path\], ogImageForPath\(c\.path\)\)/.test(filesSrc)) ok("the competitions sitemap builder passes ogImageForPath(c.path) — the site OG default declared on every competition URL");
else bad("the competitions sitemap builder does NOT pass ogImageForPath");

// 9. The pages sitemap builder passes ogImageForPath.
if (/for \(const p of STATIC_PAGES\) rows \+= urlNode\(p, SEO\.CONTENT_VERSION, ogImageForPath\(p\)\)/.test(filesSrc)) ok("the pages sitemap builder passes ogImageForPath(p) — the site OG default declared on every static page");
else bad("the pages sitemap builder does NOT pass ogImageForPath");

// 10. The freeze-coordination: the image extension is a machine-file change — no byte-frozen surface touched.
//     Scoped to the urlNode + imageNodes + ogImageForPath helper bodies (the S16-M2 surface).
const s16m2Surface = (filesSrc.match(/\/\/ S16-M2[\s\S]*?function ogImageForPath[\s\S]*?\n}/) || [""])[0];
if (s16m2Surface && !/(<h[1-6]|<title|<meta name="description"|pageh1|heroH1)/i.test(s16m2Surface)) ok("the freeze-coordination: the image extension is a machine-file change ONLY — no byte-frozen title/H1/description HTML touched (scoped to the S16-M2 surface)");
else bad("the freeze-coordination: the S16-M2 surface appears to touch a byte-frozen HTML surface (review needed)");

if (failures) { console.error("\ncheck-seo-image-sitemap: " + failures + " failure(s)"); process.exit(1); }
console.log("OK   check-seo-image-sitemap: all " + oks + " image-sitemap gates passed (S16-M2: the <image:image> extension on every sitemap entry, the xmlns:image namespace, the per-match OG image + the site OG default fallback, the freeze-coordination)");
