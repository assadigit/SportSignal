> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

# 2026-11-22 — S21: the Farsi site-name swap (v13.278.0-farsisitename)

## The owner's ask (verbatim)

"The seo Title of pages of sport signal are like this:
بارسلونا – منچسترسیتی | لیگ قهرمانان اروپا، ۱۷ آذر - SportSignal
I want the english version of name becomes farsi in search and
'sportsignal' becomes ' اسپرت سیگنال ' ... in latin version : SportSignal
in farsi searches: اسپرت سیگنال"

## The measured diagnosis (live fetch 2026-11-22, before any edit)

- The LIVE match page `/matches/barcelona-vs-manchester-city-2026-12-08`
  serves `<title>⚽ بارسلونا – منچسترسیتی | لیگ قهرمانان اروپا، ۱۷ آذر</title>`
  — 53 chars, NO brand rung: the SS-10 65-char trim ladder drops the
  «| اسپرت سیگنال» rung on the long marquee titles (with it: 68 chars).
- The " - SportSignal" in the owner's SERP example is GOOGLE's site-name
  append. The signals Google read were all LATIN at the time:
  `WebSite` JSON-LD `name:"SportSignal"` (Google's PRIMARY site-name
  signal) + `og:site_name content="SportSignal"` on every page — while
  `inLanguage` is fa-IR and every title brand rung is already
  «اسپرت سیگنال» (v13.228-farsibrand).
- Live version at diagnosis: 13.277.0-clubdata (the repo HEAD, deploy
  7b254f47 of 2026-11-21).

## The swap (one commit, v13.278.0-farsisitename)

1. `src/seo/jsonld.ts` — BOTH `organizationNode()` + `websiteNode()`:
   `name: SEO.SITE_NAME_FA` + `alternateName: SEO.SITE_NAME` (per Google's
   site-name guidance: alternateName carries the other-language form).
2. `src/seo/page-shell.ts` — `og:site_name` renders `SEO.SITE_NAME_FA`;
   the feed/calendar link-alternate titles carry the Farsi brand.
3. `src/pages/public.ts` — the homepage template's `og:site_name`,
   `og:image:alt`, `twitter:image:alt` + the two link-alternate titles.
4. `src/seo/files.ts` — ICS `X-WR-CALNAME` + Atom `<title>`
   «بازی‌های بزرگ فوتبال — اسپرت سیگنال».
5. The Latin form keeps its own contexts (DECISIONS S21-1): the domain,
   the PWA install names, the ICS PRODID, llms.txt/llms-full.txt (English
   machine surfaces, already dual-named), twitter:site, the body copy.

## The gates + wiring

- SW cache v127 -> v128 (the routine served-HTML evict; no asset renamed).
- Version triple 13.277.0 -> 13.278.0; the check-stats LIVE pins + the
  NEW v13.278 wiring check (the swapped nodes, og:site_name, the Farsi
  head phrases, the PWA names staying Latin, the feeds, the PRODID); the
  check-s20 ride-forward pin; the check-mc-heroes SW pin.
- `check-admin-parity --update`: only the public baseline re-frozen.
- Freeze-safe: zero byte-frozen title/H1/description/answer bytes; the
  Dec 4-8 freeze holds; zero new KV-read/subrequest/CPU.

## Honest notes

- Google re-renders the SERP site name on its own re-crawl cadence — the
  live swap is verifiable immediately in the HTML/JSON-LD; the SERP flip
  itself takes days. No GSC metrics were fabricated.
- The PERSIAN-ALIAS PHASE-2 date-gate (HANDOFF) is untouched: this round
  changes JSON-LD/head metadata only, NOT the byte-frozen title/H1/
  description/answer surfaces the Dec 4-8 GSC measurement rides on.
