// SportSignal — <head> builder (P-01..P-11) + the HTML shell shared by every
// NEW public page (match/team/competition/hubs/trust). The shell reuses the
// site's versioned stylesheet (currently /public-13.87.css) so the design
// (cards, rows, tables, fonts, themes) is identical to the homepage, plus a
// small inline block for page-specific components (breadcrumbs, facts,
// prose). No home-page JS is loaded — these pages are complete server HTML.

import { SEO, absUrl } from "./config";
import { esc } from "./utils";
import * as JL from "./jsonld";
import { FONT_FACES_STYLE } from "../pages/styles-shared";

export interface HeadInput {
  // v13.208-lastmod (F-L1, Phase 5): path is OPTIONAL — a page with no real
  // URL (the 404 builder) emits NO canonical and NO og:url instead of the
  // old fictional canonical → /404 (a path that 404s itself). Real pages
  // always pass their clean path (no query).
  path?: string;                // clean path, no query — omit on URL-less pages
  title: string;                // unique per URL (P-04)
  description: string;          // 70–160 chars (P-05)
  indexable: boolean;           // P-07
  ogImage?: string;             // absolute URL (SO-01..SO-04)
  ogType?: string;              // website | article
  jsonldNodes: any[];           // P-10
  extraHead?: string;           // e.g. feeds alternates
}

export function buildHead(h: HeadInput): string {
  // F-L1: canonical/og:url only when the page HAS a URL. A canonical that
  // points at a non-existent path (/404) is ignored by crawlers anyway (the
  // 404 status + meta noindex decide), but emitting a fictional URL was
  // cosmetic dishonesty — the Phase 5 audit's F-L1 cleanup.
  const canonical = h.path ? absUrl(h.path) : "";
  const robots = h.indexable
    ? "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
    : "noindex, follow";
  const img = h.ogImage || absUrl(SEO.OG_DEFAULT_IMAGE);
  let s = "<title>" + esc(h.title) + "</title>\n";
  s += '<meta name="description" content="' + esc(h.description) + "\">\n";
  if (canonical) s += '<link rel="canonical" href="' + esc(canonical) + "\">\n";
  s += '<meta name="robots" content="' + robots + "\">\n";
  // Icons + manifest (F-08..F-10)
  s += '<link rel="icon" href="/favicon.ico" sizes="any">\n';
  s += '<link rel="icon" type="image/svg+xml" href="/favicon.svg">\n';
  s += '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">\n';
  s += '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">\n';
  s += '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">\n';
  s += '<link rel="manifest" href="/site.webmanifest">\n';
  s += '<meta name="theme-color" content="' + SEO.THEME_COLOR + '">\n';
  s += '<meta name="color-scheme" content="dark light">\n';
  // Open Graph (SO-01)
  s += '<meta property="og:type" content="' + (h.ogType || "website") + '">\n';
  s += '<meta property="og:site_name" content="SportSignal">\n';
  s += '<meta property="og:title" content="' + esc(h.title) + "\">\n";
  s += '<meta property="og:description" content="' + esc(h.description) + "\">\n";
  if (canonical) s += '<meta property="og:url" content="' + esc(canonical) + "\">\n";
  s += '<meta property="og:locale" content="fa_IR">\n';
  s += '<meta property="og:image" content="' + esc(img) + '">\n';
  s += '<meta property="og:image:width" content="1200">\n';
  s += '<meta property="og:image:height" content="630">\n';
  s += '<meta property="og:image:alt" content="' + esc(h.title) + '">\n';
  // Twitter (SO-02)
  s += '<meta name="twitter:card" content="summary_large_image">\n';
  // v13.225-socialsec (SS-26): the verified X profile handle, config-driven
  // (SEO.TWITTER_SITE); emitted only when set — the same conditional shape
  // as ORG_SAMEAS (nothing invented, nothing empty-rendered).
  if (SEO.TWITTER_SITE) s += '<meta name="twitter:site" content="' + SEO.TWITTER_SITE + '">\n';
  s += '<meta name="twitter:title" content="' + esc(h.title) + "\">\n";
  s += '<meta name="twitter:description" content="' + esc(h.description) + "\">\n";
  s += '<meta name="twitter:image" content="' + esc(img) + "\">\n";
  s += '<meta name="twitter:image:alt" content="' + esc(h.title) + "\">\n";
  // Machine files (F-11..F-14)
  s += '<link rel="alternate" type="text/calendar" href="/calendar.ics" title="تقویم SportSignal">\n';
  s += '<link rel="alternate" type="application/atom+xml" href="/feed.xml" title="به‌روزرسانی‌های SportSignal">\n';
  if (h.extraHead) s += h.extraHead;
  // JSON-LD last in head (P-10)
  s += JL.jsonldScript(h.jsonldNodes);
  return s;
}

// The shell for new pages. navMain = the real-path nav (R-02, P-18).
export function pageShell(opts: {
  head: string;
  bodyDate?: string;
  h1: string;
  crumbHtml?: string;
  bodyClass?: string;
  mainHtml: string;
  updatedHtml?: string; // last-updated + source line (G-06/G-07)
}): string {
  const themeInit = '<script>try{var t=localStorage.getItem("ucl_theme")||"dark";document.documentElement.setAttribute("data-theme",t);}catch(e){}</script>';
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${themeInit}
<!-- v13.239-seofont: the Persian design-system fonts, EXACTLY like the
     homepage — the SEO shell used to preload the retired v13.6 Vazirmatn
     faces and never declared @font-face at all, so the shared
     stylesheet's Peyda/Morabba assignments fell through to 'Segoe UI'/Tahoma (the
     owner-spotted default-font bug on every per-match SEO page). The fix
     reuses the homepage's own FONT_FACES_STYLE byte-for-byte (Morabba
     variable 250–900 + Peyda 400–900 + Chakra Petch + Poppins Digits,
     all self-hosted, CSP font-src 'self') and the homepage's preload
     trio (body face 400/800 + the heading variable font). -->
<link rel="preload" href="/fonts/Peyda-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/Peyda-ExtraBold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/MorabbaVF.woff2" as="font" type="font/woff2" crossorigin>
${FONT_FACES_STYLE}
<link rel="stylesheet" href="/public-13.87.css">
<style>
/* Page-specific components for server-rendered SEO pages (breadcrumbs,
   answer-first block, facts table, prose). Reuses the site's CSS vars. */
.crumbs{font-size:.78rem;color:var(--muted,#9aa4b2);padding:10px 0 2px}
.crumbs ol{list-style:none;display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0}
.crumbs li:not(:first-child)::before{content:"›";margin-inline-start:6px;opacity:.55}
.crumbs a{color:inherit;text-decoration:none}
.crumbs a:hover{text-decoration:underline}
.answercard{background:linear-gradient(135deg,rgba(56,132,255,.12),rgba(56,132,255,.04));border:1px solid rgba(56,132,255,.25);border-radius:14px;padding:14px 16px;margin:10px 0 14px;font-size:1.02rem;line-height:1.9}
.facts{width:100%;border-collapse:collapse;margin:8px 0 4px;font-size:.92rem}
.facts caption{text-align:start;font-weight:700;padding:6px 0;color:var(--fg,#e8eefc)}
.facts th,.facts td{padding:8px 10px;border:1px solid rgba(148,163,184,.22);text-align:start;vertical-align:top}
.facts th[scope=row]{white-space:nowrap;color:var(--muted,#9aa4b2);font-weight:600}
.prose{line-height:2;padding:4px 0}
.prose h2{margin:18px 0 8px;font-size:1.12rem}
.prose h3{margin:14px 0 6px;font-size:1rem}
.prose p{margin:8px 0}
.prose a{color:#5ea0ff}
.pageh1{font-size:clamp(1.15rem,2.6vw,1.6rem);font-weight:800;margin:6px 0 2px;line-height:1.6}
.pagesub{color:var(--muted,#9aa4b2);font-size:.9rem;margin:2px 0 10px}
.srcline a{color:inherit}
.hubgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;padding:6px 0}
.hubtile{display:block;text-decoration:none;color:inherit;background:rgba(148,163,184,.07);border:1px solid rgba(148,184,214,.18);border-radius:12px;padding:12px 14px;transition:border-color .15s}
.hubtile:hover{border-color:rgba(94,160,255,.5)}
.hubtile .t{font-weight:700;font-size:1rem}
.hubtile .d{font-size:.8rem;color:var(--muted,#9aa4b2);margin-top:4px;line-height:1.7}
.match a.match,.mrow a.match,.spotitem a.match{color:inherit;text-decoration:none}
.listhead{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;justify-content:space-between;margin:14px 0 4px}
.listhead h2{margin:0;font-size:1.05rem}
.dategroup{font-weight:700;color:var(--muted,#9aa4b2);margin:16px 0 4px;font-size:.95rem;border-inline-start:3px solid #5ea0ff;padding-inline-start:8px}
/* SS-06 (Phase-2 spec): the visible FAQ card — plain h3+p pairs inside the
   .prose card; a hairline between items for scannability, nothing hidden. */
.faqcard .faqitem{padding:6px 0;border-bottom:1px dashed rgba(148,163,184,.16)}
.faqcard .faqitem:last-child{border-bottom:none}
.faqcard .faqq{margin:6px 0 4px;font-size:.98rem}
.faqcard .faqa{margin:0;font-size:.92rem;line-height:2;color:var(--fg,#e8eefc)}
.pagination{display:flex;gap:10px;justify-content:center;padding:14px 0;flex-wrap:wrap}
.pagination a,.pagination span{padding:8px 14px;border-radius:10px;border:1px solid rgba(148,184,214,.25);text-decoration:none;color:inherit;font-size:.9rem}
.pagination .cur{background:rgba(94,160,255,.15);border-color:rgba(94,160,255,.5)}
/* v13.240-edgegut: padding-block replaces the old padding:16px 0 26px
   shorthand — the shorthand's zero horizontal padding out-specified the
   generic footer rule (footer{...padding-inline:20px} / 12px at 600px /
   24px at 1080px), leaving the SEO footer flush at the edges while the
   homepage footer followed the responsive gutter. Vertical rhythm (the
   16px/26px around the border-top) is unchanged. */
footer.pagesfoot{margin-top:26px;border-top:1px solid rgba(148,163,184,.18);padding-block:16px 26px;font-size:.85rem;color:var(--muted,#9aa4b2)}
footer.pagesfoot nav{display:flex;flex-wrap:wrap;gap:14px;padding:6px 0}
footer.pagesfoot a{color:inherit;text-decoration:none;}
/* v13.209-a11y (F-M6): the compact footer nav links clear the WCAG 2.5.8
   AA 24px floor via padding; the 44px enhancement target is a documented
   exception for this compact row (RESULTS §17). */
footer.pagesfoot nav a{display:inline-block;padding:7px 2px}
footer.pagesfoot a:hover{text-decoration:underline}
.pagenotfound{padding:30px 6px}
.pagenotfound h1{font-size:1.5rem}
/* v13.56-visitcount: footer page-view counter. Fixed min-width on the number
   span so the arriving digits never cause layout shift. */
.visitcount{font-size:.8rem;color:var(--muted,#9aa4b2);margin-top:10px;line-height:1.9;direction:rtl}
.visitcount .vc-n{display:inline-block;min-width:3.4em;text-align:center;font-variant-numeric:tabular-nums;font-weight:600;color:var(--fg,#e8eefc)}
.visitcount .vc-sep{margin:0 6px;opacity:.5}
.visitcount .vc-l{opacity:.85}
/* ---- v13.81-matchpage → Match Centre S04/S05 (M2): the mcentre-hero ----
   The hero presentation: the legacy .matchhead card became the .mcentre-hero
   block (src/seo/match-centre.ts renders the markup — matchHeroHtml — and
   pages.ts delegates the data projection; audit §12). The competition chip
   (.mchip) is promoted ABOVE the face-off (.mcentre-hero-comp) — a compact,
   restrained line secondary to the teams and score (specification §5,
   decision 98); the three-track face-off grid (.mcentre-hero-face) keeps
   home right / away left under the native Persian RTL document order with
   one shared side shape (decisions 96/97: balanced face-off, subtle
   «میزبان»/«میهمان» labels, no additional team color coding); the central
   scoreboard owns the dominant display numerals (.mscore/.mkick — decision
   10: one core identity across the lifecycle), the live status keeps the
   .mlive pulse (decisions 18/90: no extra live apparatus) and the finished
   state gains the «پایان بازی» status pill (.mfin — the .mcount sky
   family; NO scorer block: finished scorers are not in the data pool,
   Q4=A). Background/border/radius/pill tokens are the v13.81 block's own;
   CSS logical properties only, so a deliberate LTR mirror stays clean.
   Match Centre S05 (M2) — decision 99 (atmosphere): a restrained stadium
   light-wash rides ABOVE the S04 gradient (a soft radial from the top —
   floodlight depth, never overpowering the foreground: names, crests and
   the score stay the legible hierarchy; the block's own icy/navy tokens,
   zero new assets, zero new requests). */
.mcentre-hero{background:radial-gradient(130% 100% at 50% -25%,rgba(56,132,255,.13),rgba(56,132,255,0) 55%),linear-gradient(160deg,rgba(56,132,255,.10),rgba(56,132,255,.03) 55%,rgba(148,163,184,.05));border:1px solid rgba(94,160,255,.28);border-radius:18px;padding:18px 14px;margin-block:12px 10px}
.mcentre-hero-comp{display:flex;justify-content:center;padding-block-end:12px}
.mcentre-hero-face{display:grid;grid-template-columns:1fr minmax(150px,auto) 1fr;align-items:center;gap:10px}
.mteam{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0}
.mteam .mname{font-weight:800;font-size:clamp(.95rem,2.4vw,1.18rem);text-align:center;line-height:1.6;overflow-wrap:anywhere}
.mteam .mside-lbl{font-size:.68rem;color:var(--muted,#9aa4b2);letter-spacing:.4px}
.mcrest{width:64px;height:64px;object-fit:contain;filter:drop-shadow(0 3px 8px rgba(2,8,23,.35))}
.mcrest-mono{display:flex;align-items:center;justify-content:center;font-size:1.6rem;font-weight:800;color:#5ea0ff;background:rgba(94,160,255,.12);border:1px solid rgba(94,160,255,.3);border-radius:14px}
/* Match Centre S05 (decisions 7/8/85): the both-or-neither hero portraits —
   circular frames at the TOP of each side column (on mobile the 560px grid
   areas keep them side-by-side above the scoreboard, decision 8), one
   shared shape like the crests. The dark navy backing + icy ring give the
   alpha-cutout library art its restrained stadium depth (decision 99);
   the fixed square box is CLS-neutral, and the S05 onerror DOM walk (in
   the projection's portrait atom) removes BOTH imgs when either fails —
   decision 85: no retry, the S04 no-portrait scoreboard restores exactly. */
.mport{width:88px;height:88px;border-radius:50%;object-fit:cover;object-position:center 18%;background:rgba(2,8,23,.45);border:1px solid rgba(94,160,255,.30);box-shadow:0 6px 18px rgba(2,8,23,.45)}
.mcenter{display:flex;flex-direction:column;align-items:center;gap:5px;text-align:center;min-width:0}
.mchip{display:inline-flex;align-items:center;gap:6px;font-size:.78rem;color:var(--muted,#9aa4b2);background:rgba(148,163,184,.10);border:1px solid rgba(148,163,184,.22);border-radius:999px;padding:3px 11px;white-space:nowrap;max-width:100%;overflow:hidden}
.mchip a{color:inherit;text-decoration:none}
.mchip a:hover{text-decoration:underline}
.mcomplogo{width:15px;height:15px;object-fit:contain}
.mkick{font-size:clamp(2rem,5.5vw,2.9rem);font-weight:800;font-variant-numeric:tabular-nums;line-height:1.25}
/* Match Centre S05 (Q1=A, decisions 93/94): the kickoff line's muted notes
   beside the prominent time — «به وقت تهران» + the Latin UTC island
   (fullWhenHtml's tznote/utcnote vocabulary). The selectors nest under
   .mkick ONLY, so the facts table's own .tznote/.utcnote spans (the
   «تاریخ» row) keep rendering with their inherited size, untouched. */
.mkick .tznote{font-size:.8rem;font-weight:600;color:var(--muted,#9aa4b2)}
.mkick .utcnote{font-size:.74rem;font-weight:600;color:var(--muted,#9aa4b2);font-variant-numeric:tabular-nums}
/* Match Centre S04: the central scoreboard's display numerals — dominant
   (specification §5; the finished final score and the live score share this
   scale, the upcoming kickoff time rides the .mkick tier just below it). */
.mscore{font-size:clamp(2.1rem,6vw,3.1rem);font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:2px}
/* Match Centre S04: the finished «پایان بازی» status pill (decision 91 /
   specification §5) — the .mcount/.mlive scale in the block's own sky
   family; the retired .mkicksub showed the generic «پایان‌یافته» label. */
.mfin{display:inline-flex;align-items:center;gap:7px;font-size:.84rem;font-weight:700;color:#7dd3fc;background:rgba(125,211,252,.10);border:1px solid rgba(125,211,252,.28);border-radius:999px;padding:3px 12px}
.mkickdate{font-size:.82rem;color:var(--muted,#9aa4b2)}
/* Match Centre S05 (decision 95): the date line is now the D1 FULL localized
   date («شنبه ۱۵ آبان ۱۴۰۵ (۵ نوامبر ۲۰۲۶)») — the extra length wraps to a
   second line on narrow viewports by design (the .mcenter column centers
   it; no fixed heights, no truncation). */
.mkickdate{line-height:1.8}
.mkickdate .jdate{opacity:.85}
.mcount{font-size:.86rem;font-weight:700;color:#7dd3fc;background:rgba(125,211,252,.10);border:1px solid rgba(125,211,252,.28);border-radius:999px;padding:3px 12px;font-variant-numeric:tabular-nums}
.mlive{display:inline-flex;align-items:center;gap:7px;font-size:.84rem;font-weight:700;color:#fca5a5}
.mdot{width:8px;height:8px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 0 rgba(239,68,68,.5);animation:mdot-pulse 1.6s infinite}
@keyframes mdot-pulse{0%{box-shadow:0 0 0 0 rgba(239,68,68,.5)}70%{box-shadow:0 0 0 7px rgba(239,68,68,0)}100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}}
.mvenue{font-size:.76rem;color:var(--muted,#9aa4b2)}
/* v13.82-matchday: the venue is a place — a Maps search link now. Pill
   treatment consistent with .mcount, hover lift + underline; the ↗ arrow
   signals off-site. Also used by the facts-table row (inherits link
   colors there via .mvenue-map alone). */
a.mvenue-map{display:inline-flex;align-items:center;gap:5px;font-size:.78rem;font-weight:600;color:#7dd3fc;background:rgba(125,211,252,.08);border:1px solid rgba(125,211,252,.22);border-radius:999px;padding:3px 12px;text-decoration:none;transition:border-color .15s,background .15s,transform .15s}
a.mvenue-map:hover{border-color:rgba(125,211,252,.55);background:rgba(125,211,252,.14);text-decoration:underline}
a.mvenue-map:active{transform:scale(.97)}
.mven-arrow{font-size:.72em;opacity:.75}
/* the sibling-fixtures card: rows reuse the site-wide .mrow/.match styles;
   the h2 count chip matches the site's pill vocabulary */
.simcard{margin-top:14px}
/* v13.87-formtable: the team page's standings window — reuses .stbox/.strow
   (public-13.28.css); .strow-me highlights the team's own row with the
   site's sky accent (same family as .mcount/.mvenue-map); .stmore is the
   "full table" footer link. */
.stwin{margin:0}
.strow-me{background:rgba(125,211,252,.10);border:1px solid rgba(125,211,252,.32);border-inline-start:3px solid rgba(125,211,252,.55);border-radius:8px;padding:4px 6px;font-weight:700;transition:background .15s}
.strow-me:hover{background:rgba(125,211,252,.16)}
.stmore{display:flex;align-items:center;gap:6px;font-size:.78rem;font-weight:600;color:#7dd3fc;text-decoration:none;padding:12px 2px 4px;margin-top:2px;border-top:1px dashed var(--border,#334155)}
.stmore:hover{text-decoration:underline}
/* v13.87-formtable: the match page's recent-form strip — one row per side,
   dots ب/م/ش (win/draw/loss) colored green/gray/red, hover title with
   opponent + score + date, and a W·D·L count summary. */
.formstrip .formrow{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:7px 0;border-bottom:1px dashed var(--border,#334155)}
.formstrip .formrow:last-child{border-bottom:none}
.formteam{font-size:.85rem;font-weight:700;min-width:86px}
.formdots{display:inline-flex;gap:4px;align-items:center}
.fdot{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:7px;font-size:.72rem;font-weight:800;font-style:normal;font-variant-numeric:tabular-nums;transition:transform .12s}
.fdot:hover{transform:scale(1.14)}
.fw{color:#4ade80;background:rgba(74,222,128,.14);border:1px solid rgba(74,222,128,.35)}
.fd{color:#cbd5e1;background:rgba(148,163,184,.14);border:1px solid rgba(148,163,184,.30)}
.fl{color:#f87171;background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.32)}
.formsum{font-size:.72rem;color:var(--muted,#9aa4b2);margin-inline-start:auto;white-space:nowrap}
/* v13.88-formagg: the season-record chip — the aggregate fallback when the
   per-match dots are still dark. Three count segments in the same
   win/draw/loss hues as the dots (fw/fd/fl families) but flat pills, no
   per-match granularity implied; tabular digits; the played suffix is
   muted italic. */
.fseason{display:inline-flex;align-items:center;gap:7px;background:rgba(148,163,184,.07);border:1px solid rgba(148,184,214,.20);border-radius:10px;padding:4px 10px;font-size:.78rem;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
.fseason b{font-weight:800}
.fseason .fsw{color:#4ade80}
.fseason .fsd{color:#cbd5e1}
.fseason .fsl{color:#f87171}
/* v13.93-fullrec: the standings-position badge («ردیف ۲») — the rank context
   that makes the W/D/L counts readable at a glance. Sky accent (the
   .strow-me/.mcount family) so the eye tracks rank → counts → comp. */
.fseason .fspos{color:#7dd3fc;background:rgba(125,211,252,.12);border:1px solid rgba(125,211,252,.30);border-radius:7px;padding:1px 7px;font-size:.68rem;font-weight:800}
.fseason .fsplayed{font-style:normal;font-size:.68rem;font-weight:600;color:var(--muted,#9aa4b2);border-inline-start:1px dashed rgba(148,163,184,.35);padding-inline-start:7px;margin-inline-start:2px}
/* v13.88-formagg: the dot legend — muted microcopy that decodes ب/م/ش for
   first-time visitors; the dots reuse .fdot sizing at reduced footprint. */
.formlegend{display:flex;align-items:center;gap:6px;margin:2px 0 6px;font-size:.72rem;color:var(--muted,#9aa4b2)}
.formlegend .fdot{width:16px;height:16px;font-size:.62rem;border-radius:5px}
/* S1 M2 (F3): the alternate-spelling note on overridden team pages — muted
   microcopy in the .formlegend family («لایپزیگ با نام «لایپزیش» هم
   شناخته می‌شود.»); the dictionary spelling stays visible exactly once. */
.altnote{margin:6px 0 0;font-size:.72rem;color:var(--muted,#9aa4b2)}
/* v13.89-stdetail: the compact W·D·L standings column — «۶-۲-۱» per row,
   each count in its win/draw/loss hue (fw/fd/fl family), tabular digits,
   en-dash separators. Desktop-visible; hidden ≤600px (the .ucl-hidem
   pattern) so mobile keeps pos/name/pts only. .strow-me keeps its
   highlight through the extra cell (no border on the segments). */
.stwdl{display:inline-flex;align-items:center;gap:2px;min-width:52px;justify-content:center;flex-shrink:0;font-variant-numeric:tabular-nums;font-weight:700;font-size:10.5px}
.stwdl i{font-style:normal;opacity:.4;font-weight:400}
.stwdl .stw-w{color:#4ade80}
.stwdl .stw-d{color:#cbd5e1}
.stwdl .stw-l{color:#f87171}
.sthead-wdl{font-size:9.5px;font-weight:700;color:var(--muted,#94a3b8)}
@media (max-width:600px){.stwdl,.sthead-wdl{display:none}}
/* v13.89-stdetail: interaction polish — keyboard-visible focus rings on
   every interactive surface (a11y), a subtle lift on hover for the
   stand-alone tiles/links, and prefers-reduced-motion disarm (the .mdot
   rule above covers the live pulse). */
a:focus-visible,.mact:focus-visible,button:focus-visible{outline:2px solid #7dd3fc;outline-offset:2px;border-radius:8px}
.hubtile{transition:border-color .15s,transform .15s}
.hubtile:hover{border-color:rgba(94,160,255,.5);transform:translateY(-1px)}
.stmore{transition:color .15s}
.stmore:hover{color:#a5e3fc}
.pagination a{transition:border-color .15s,background .15s}
.pagination a:hover{border-color:rgba(94,160,255,.5);background:rgba(94,160,255,.08)}
@media (prefers-reduced-motion:reduce){.hubtile,.hubtile:hover{transform:none}.mact:active{transform:none}.fdot,.fdot:hover{transform:none}.strow-me{transition:none}}
.simcount{display:inline-block;font-size:.72rem;font-weight:600;color:#b6c5da;background:rgba(148,163,184,.12);border:1px solid rgba(148,163,184,.24);border-radius:999px;padding:1px 9px;margin-inline-start:8px;vertical-align:middle}
.mactions{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:2px 0 14px}
/* v13.209-a11y (F-L3/WCAG 2.4.1): the sub-page bypass - the shell pages
   had NO skip link at all (only the homepage carried one), leaving
   keyboard users to tab through brand + 6 nav links + the CTA before
   reaching #main on every page. Same off-canvas-until-focus pattern
   as the homepage; first focusable in the DOM. */
.skip-link{position:absolute;inset-inline-start:-9999px}
.skip-link:focus{inset-inline-start:8px;top:8px;z-index:99;background:#0f172a;color:#fff;padding:14px 18px;border-radius:8px}
.mact{display:inline-flex;align-items:center;gap:6px;font-size:.82rem;font-weight:600;color:var(--fg,#e8eefc);background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.28);border-radius:11px;padding:8px 14px;text-decoration:none;cursor:pointer;font-family:inherit;transition:border-color .15s,background .15s,transform .15s}
.mact:hover{border-color:rgba(94,160,255,.55);background:rgba(94,160,255,.12)}
.mact:active{transform:scale(.97)}
.mact-cal{background:rgba(94,160,255,.13);border-color:rgba(94,160,255,.4)}
@media (max-width:560px){.mcentre-hero{padding:14px 8px}.mcentre-hero-comp{padding-block-end:8px}.mcentre-hero-face{grid-template-columns:1fr 1fr;grid-template-areas:"home away" "center center"}.mteam{grid-area:home}.mteam.away{grid-area:away}.mcenter{grid-area:center;margin-block-start:8px}.mcrest{width:48px;height:48px}.mport{width:64px;height:64px}}
@media (prefers-reduced-motion:reduce){.mdot{animation:none}}
/* ---- Match Centre S06 (M2): the sticky section nav + back-to-top ----
   Q10=C responsive: desktop (≥601px) sticky-top, mobile (≤600px) fixed-bottom
   tab-bar — thumb-reachable. Q9=B adaptive: the nav items render only for
   present mcentre-* sections (pages.ts matchNavHtml filters — a bare <nav>
   never renders). Q11=A IntersectionObserver (the inline script in pages.ts)
   drives the .is-active highlight; the scroll-margin-top on desktop keeps a
   clicked destination clear of the sticky bar. Q12: the .mtop back-to-top
   button is fixed bottom-end (logical properties — RTL/LTR clean), raised
   above the mobile nav, and toggles via the hero's IntersectionObserver
   (hidden while the hero is in view). Reduced motion = instant, no
   transitions. CSS logical properties ONLY — the native-Persian RTL nav
   mirrors cleanly under a dir flip (decision 2). The block's own icy/navy
   tokens, zero new assets/requests. */
.mnav{position:sticky;top:0;z-index:50;display:flex;justify-content:center;gap:2px;background:rgba(2,8,23,.92);backdrop-filter:blur(8px);border-block-end:1px solid rgba(94,160,255,.22);padding-block:4px;padding-inline:8px;margin-block:10px 12px}
.mnav-item{display:inline-block;padding:8px 14px;border-radius:8px;color:var(--muted,#9aa4b2);text-decoration:none;font-size:.88rem;font-weight:600;transition:color .15s,background .15s}
.mnav-item:hover{color:#e8eefc;background:rgba(94,160,255,.10)}
.mnav-item.is-active{color:#7dd3fc;background:rgba(125,211,252,.12)}
.mtop{position:fixed;inset-block-end:1rem;inset-inline-end:1rem;z-index:51;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:rgba(94,160,255,.18);border:1px solid rgba(94,160,255,.45);color:#7dd3fc;cursor:pointer;box-shadow:0 4px 14px rgba(2,8,23,.5);transition:opacity .2s,background .15s}
.mtop:hover{background:rgba(94,160,255,.28)}
.mtop[hidden]{display:none}
@media (min-width:601px){section[id^="mcentre-"]{scroll-margin-top:48px}}
@media (max-width:600px){.mnav{position:fixed;inset-block-end:0;inset-inline:0;top:auto;justify-content:space-around;border-block-end:none;border-block-start:1px solid rgba(94,160,255,.22);border-radius:0;padding-block:6px;padding-inline:0;margin:0;background:rgba(2,8,23,.95)}.mnav-item{flex:1 1 0;text-align:center;padding:10px 4px;font-size:.82rem}.mtop{inset-block-end:calc(60px + .5rem)}}
@media (prefers-reduced-motion:reduce){.mnav-item{transition:none}.mtop{transition:none}}
/* ---- Match Centre S03 (M1): the responsive/spacing/RTL foundation for the
   mcentre-* section family (src/seo/match-centre.ts, S02). Id-scoped — zero
   effect on any page without a mcentre-* section. Breakpoints and tokens are
   the design system's own (public-13.87.css: 600px = the site's mobile
   breakpoint; 1080px = the wide threshold where .page-col widens 760→1400px);
   no new colors, fonts or components. CSS logical properties ONLY, so the
   native-Persian RTL composition mirrors cleanly into a deliberate English
   LTR adaptation if dir ever flips (decision 2; the homepage's fa/en pattern). */
/* Section rhythm (spec §4, decision 78): the page's MACRO rhythm lives on the
   sections; the cards inside keep their own micro-rhythm (.card margin 14px).
   The bare <section> wrapper is a margin-collapse conduit, so this rule WINS
   the collapsed chain (28px = exactly 2× the 14px card rhythm on the design
   system's own scale) instead of adding to the inner margins — no
   double-spacing, and it degrades gracefully if a later session's builder
   ever carries a larger inner margin. Adjacent-sibling so the first section
   stays flush with the h1 block and an omitted section (the no-empty-cards
   law) never strands a gap. */
section[id^="mcentre-"]+section[id^="mcentre-"]{margin-block-start:28px}
@media (max-width:600px){section[id^="mcentre-"]+section[id^="mcentre-"]{margin-block-start:20px}}
/* The two-column→one-column collapse (spec §4, decisions 75–77): the pairing
   grid the section builders wrap their internal pairs in (S07 briefing|
   facts panel, S12 home|away form). Two tracks ONLY at the wide threshold —
   .page-col is 1400px there, giving each track a comfortable measure — and
   ONE column below it ("collapse to one column relatively early", decision
   77), so intermediate widths never squeeze a pair into the 760px column.
   RTL-neutral: grid auto-flow follows document direction. minmax(0,1fr)
   tracks + min-width:0 children keep long team names from blowing out the
   grid (overflow-wrap does the wrapping). */
.mcentre-cols{display:grid;grid-template-columns:minmax(0,1fr);gap:14px}
.mcentre-cols>*{min-width:0}
@media (min-width:1080px){.mcentre-cols{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
${opts.head}
</head>
<body class="${opts.bodyClass || ""}" data-ss-generated="${opts.bodyDate || ""}">
<a class="skip-link" href="#main">پرش به محتوا</a>
<header id="topbar">
<a class="brand" href="/" aria-label="SportSignal"><img src="/logo.png" alt="SportSignal" width="146" height="50" referrerpolicy="no-referrer"></a>
<nav class="mainnav" aria-label="ناوبری اصلی"><a href="/">خانه</a><a href="/matches">بازی‌ها</a><a href="/teams">تیم‌ها</a><a href="/competitions">رقابت‌ها</a><a href="/methodology">روش کار</a><a href="/about">درباره</a></nav>
<div class="head-actions"><a class="cta" href="https://t.me/SportSignalAlertsBot" target="_blank" rel="noopener">عضویت در ربات تلگرام</a></div>
</header>
<!-- v13.240-edgegut: the SEO pages join the site's own edge-gutter system —
     the shell used to drop .sub.sync + main's children directly into body
     (body padding is 24px 0 36px — ZERO horizontal), so every sub-page ran
     edge-to-edge (the owner's screenshot of /about: H1, meta line and cards
     at ~0px from the screen edge). The homepage has never had this problem
     because its whole below-hero life lives inside ONE .page-col (public-
     the stylesheet (v13.81 era): max-width 760px centered, padding-inline 20px; 12px ≤600px;
     max-width 1400px + 24px ≥1080px). The shell now reuses that exact
     component — the sync line moves INSIDE main>page-col mirroring the
     homepage's own placement, so the skip-link target still leads to the
     full content and the gutter convention is identical to the index. -->
<main id="main">
<div class="page-col">
<p class="sub sync">${opts.updatedHtml || ""}</p>
${opts.crumbHtml || ""}
<div class="pageh1-wrap"><h1 class="pageh1">${opts.h1}</h1></div>
${opts.mainHtml}
</div>
</main>
<footer class="pagesfoot" id="about">
<nav aria-label="ناوبری پابرگ"><a href="/">خانه</a><a href="/matches">بازی‌ها</a><a href="/matches/today">بازی‌های امروز</a><a href="/matches/this-week">بازی‌های این هفته</a><a href="/teams">تیم‌ها</a><a href="/competitions">رقابت‌ها</a><a href="/about">درباره</a><a href="/methodology">روش انتخاب بازی‌ها</a><a href="/contact">تماس</a><a href="/data">داده‌ها</a><a href="/privacy">حریم خصوصی</a><a href="/terms">شرایط استفاده</a><a href="/sitemap">نقشه سایت</a></nav>
<p>© SportSignal — <span id="footYear">۱۴۰۵</span> · ساخته‌شده با ❤️</p>
<p class="srcline">منبع داده: <a href="${SEO.DATA_SOURCE_URL}" target="_blank" rel="noopener">${SEO.DATA_SOURCE_NAME}</a></p>
<!-- v13.225-socialsec (SS-26, S9 2026-11-06): the footer social line — the
     owner-verified X profile (x.com/sportsignalz, display name «اسپرت سیگنال»,
     verified live 2026-11-05 21:33 UTC) + the Telegram bot, the two real,
     owned, live profiles (the same URLs ride SEO.ORG_SAMEAS; the handle rides
     SEO.TWITTER_SITE). Verified-live-only rule — never a dead link. -->
<p class="srcline">ایکس (توییتر): <a href="https://x.com/sportsignalz" target="_blank" rel="noopener">@sportsignalz</a> · ربات تلگرام: <a href="https://t.me/SportSignalAlertsBot" target="_blank" rel="noopener">@SportSignalAlertsBot</a></p>
<div class="visitcount" id="visitCount"><span class="vc-l">بازدید امروز:</span> <span class="vc-n" id="vcToday">—</span> <span class="vc-sep">·</span> <span class="vc-l">بازدیدکننده دیروز:</span> <span class="vc-n" id="vcYesterday">—</span> <span class="vc-sep">·</span> <span class="vc-l">بازدیدکننده این ماه:</span> <span class="vc-n" id="vcMonth">—</span> <span class="vc-sep">·</span> <span class="vc-l">بازدید کل:</span> <span class="vc-n" id="vcTotal">—</span></div>
</footer>
<script>/* v13.57-uniqueregions: cookieless page-view beacon. One same-origin GET
/api/visit per page load (never from prerender); the worker counts it in the
background (ctx.waitUntil: page view + daily unique dedup + country + online)
and returns the public stats block for the footer counter. No cookies, no IP
storage — see /privacy. */
(function(){if(document.visibilityState==='prerender')return;
function faNum(n){try{return Number(n).toLocaleString('fa-IR')}catch(e){return String(n)}}
function set(id,v){var e=document.getElementById(id);if(e)e.textContent=v;}
try{fetch('/api/visit',{cache:'no-store',keepalive:true,credentials:'same-origin'}).then(function(r){return r.ok?r.json():null;}).then(function(d){if(!d)return;set('vcToday',faNum(d.today_views||0));set('vcYesterday',faNum(d.yesterday_visitors||0));set('vcMonth',faNum(d.month_visitors||0));set('vcTotal',faNum(d.total_views||0));}).catch(function(){});}catch(e){}
})();
</script>
<!-- v13.208-lastmod (F-H3, Phase 5): Cloudflare Web Analytics beacon — the
MANUAL insertion (OWNER_TODO §11 step 6). The zone's Web Analytics site has
existed since 2026-10-13 with auto_install:true, but Cloudflare's automatic
injection never reaches Worker-rendered HTML (live-verified: zero
cloudflareinsights occurrences + /cdn-cgi/rum 404 for 3+ weeks), so the
field-CWV source Phase 7 needs was silently absent. Cookieless, aggregate
RUM only; CSP-allowed since v13.188. The token is public by design (it rides
every served page).
v13.227-rumzone (2026-11-06, S11): the send.to override. CF cut this site's
beacon ingestion over to the ZONE-RELATIVE endpoint at 2026-11-05 00:00 UTC
— the legacy absolute https://cloudflareinsights.com/cdn-cgi/rum (where a
token-only snippet sends, per beacon 2026.10.1's "version === undefined →
absolute" rule) started 404ing every POST, and ZERO RUM events landed for
the whole 11-05 UTC day (verified: verbatim payload replay → 404 absolute,
204 zone-relative + the replay event visible in the GraphQL ~7 min later;
site/token mapping intact per rum/site_info/list — one site, this exact
site_tag/site_token pair). The override uses the beacon's own config hook
(send.to takes precedence in its endpoint const) to post same-origin
/cdn-cgi/rum — the same route the zone ruleset serves for auto-install —
covered by connect-src 'self'. Gate: check-seo-lastmod #9 requires the
override on BOTH templates. -->
<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "fb7e7f1d66e84ed3b4572545c93ef538", "send": {"to": "/cdn-cgi/rum"}}'></script>
</body>
</html>`;
}
