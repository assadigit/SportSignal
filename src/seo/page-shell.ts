// SportSignal — <head> builder (P-01..P-11) + the HTML shell shared by every
// NEW public page (match/team/competition/hubs/trust). The shell reuses the
// site's versioned stylesheet (currently /public-13.38.css) so the design
// (cards, rows, tables, fonts, themes) is identical to the homepage, plus a
// small inline block for page-specific components (breadcrumbs, facts,
// prose). No home-page JS is loaded — these pages are complete server HTML.

import { SEO, absUrl } from "./config";
import { esc } from "./utils";
import * as JL from "./jsonld";

export interface HeadInput {
  path: string;                 // clean path, no query
  title: string;                // unique per URL (P-04)
  description: string;          // 70–160 chars (P-05)
  indexable: boolean;           // P-07
  ogImage?: string;             // absolute URL (SO-01..SO-04)
  ogType?: string;              // website | article
  jsonldNodes: any[];           // P-10
  extraHead?: string;           // e.g. feeds alternates
}

export function buildHead(h: HeadInput): string {
  const canonical = absUrl(h.path);
  const robots = h.indexable
    ? "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
    : "noindex, follow";
  const img = h.ogImage || absUrl(SEO.OG_DEFAULT_IMAGE);
  let s = "<title>" + esc(h.title) + "</title>\n";
  s += '<meta name="description" content="' + esc(h.description) + "\">\n";
  s += '<link rel="canonical" href="' + esc(canonical) + "\">\n";
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
  s += '<meta property="og:url" content="' + esc(canonical) + "\">\n";
  s += '<meta property="og:locale" content="fa_IR">\n';
  s += '<meta property="og:image" content="' + esc(img) + '">\n';
  s += '<meta property="og:image:width" content="1200">\n';
  s += '<meta property="og:image:height" content="630">\n';
  s += '<meta property="og:image:alt" content="' + esc(h.title) + '">\n';
  // Twitter (SO-02)
  s += '<meta name="twitter:card" content="summary_large_image">\n';
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
<meta name="viewport" content="width=device-width, initial-scale=1">
${themeInit}
<link rel="preload" href="/fonts/Vazirmatn-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/Vazirmatn-Bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/public-13.38.css">
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
.pagination{display:flex;gap:10px;justify-content:center;padding:14px 0;flex-wrap:wrap}
.pagination a,.pagination span{padding:8px 14px;border-radius:10px;border:1px solid rgba(148,184,214,.25);text-decoration:none;color:inherit;font-size:.9rem}
.pagination .cur{background:rgba(94,160,255,.15);border-color:rgba(94,160,255,.5)}
footer.pagesfoot{margin-top:26px;border-top:1px solid rgba(148,163,184,.18);padding:16px 0 26px;font-size:.85rem;color:var(--muted,#9aa4b2)}
footer.pagesfoot nav{display:flex;flex-wrap:wrap;gap:14px;padding:6px 0}
footer.pagesfoot a{color:inherit;text-decoration:none}
footer.pagesfoot a:hover{text-decoration:underline}
.pagenotfound{padding:30px 6px}
.pagenotfound h1{font-size:1.5rem}
/* v13.56-visitcount: footer page-view counter. Fixed min-width on the number
   span so the arriving digits never cause layout shift. */
.visitcount{font-size:.8rem;color:var(--muted,#9aa4b2);margin-top:10px;line-height:1.9;direction:rtl}
.visitcount .vc-n{display:inline-block;min-width:3.4em;text-align:center;font-variant-numeric:tabular-nums;font-weight:600;color:var(--fg,#e8eefc)}
.visitcount .vc-sep{margin:0 6px;opacity:.5}
.visitcount .vc-l{opacity:.85}
/* ---- v13.81-matchpage: the scoreboard head + actions row ---- */
.matchhead{display:grid;grid-template-columns:1fr minmax(150px,auto) 1fr;align-items:center;gap:10px;background:linear-gradient(160deg,rgba(56,132,255,.10),rgba(56,132,255,.03) 55%,rgba(148,163,184,.05));border:1px solid rgba(94,160,255,.28);border-radius:18px;padding:18px 14px;margin:12px 0 10px}
.mteam{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0}
.mteam .mname{font-weight:800;font-size:clamp(.95rem,2.4vw,1.18rem);text-align:center;line-height:1.6;overflow-wrap:anywhere}
.mteam .mside-lbl{font-size:.68rem;color:var(--muted,#9aa4b2);letter-spacing:.4px}
.mcrest{width:64px;height:64px;object-fit:contain;filter:drop-shadow(0 3px 8px rgba(2,8,23,.35))}
.mcrest-mono{display:flex;align-items:center;justify-content:center;font-size:1.6rem;font-weight:800;color:#5ea0ff;background:rgba(94,160,255,.12);border:1px solid rgba(94,160,255,.3);border-radius:14px}
.mcenter{display:flex;flex-direction:column;align-items:center;gap:5px;text-align:center;min-width:0}
.mchip{display:inline-flex;align-items:center;gap:6px;font-size:.78rem;color:var(--muted,#9aa4b2);background:rgba(148,163,184,.10);border:1px solid rgba(148,163,184,.22);border-radius:999px;padding:3px 11px;white-space:nowrap;max-width:100%;overflow:hidden}
.mchip a{color:inherit;text-decoration:none}
.mchip a:hover{text-decoration:underline}
.mcomplogo{width:15px;height:15px;object-fit:contain}
.mkick{font-size:clamp(1.7rem,5vw,2.35rem);font-weight:800;font-variant-numeric:tabular-nums;line-height:1.25}
.mscore{font-size:clamp(1.8rem,5vw,2.5rem);font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:2px}
.mkicksub{font-size:.8rem;color:var(--muted,#9aa4b2)}
.mkickdate{font-size:.82rem;color:var(--muted,#9aa4b2)}
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
.stmore{display:flex;align-items:center;gap:6px;font-size:.78rem;font-weight:600;color:#7dd3fc;text-decoration:none;padding:8px 2px 2px;margin-top:5px;border-top:1px dashed var(--border,#334155)}
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
.simcount{display:inline-block;font-size:.72rem;font-weight:600;color:var(--muted,#9aa4b2);background:rgba(148,163,184,.12);border:1px solid rgba(148,163,184,.24);border-radius:999px;padding:1px 9px;margin-inline-start:8px;vertical-align:middle}
.mactions{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:2px 0 14px}
.mact{display:inline-flex;align-items:center;gap:6px;font-size:.82rem;font-weight:600;color:var(--fg,#e8eefc);background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.28);border-radius:11px;padding:8px 14px;text-decoration:none;cursor:pointer;font-family:inherit;transition:border-color .15s,background .15s,transform .15s}
.mact:hover{border-color:rgba(94,160,255,.55);background:rgba(94,160,255,.12)}
.mact:active{transform:scale(.97)}
.mact-cal{background:rgba(94,160,255,.13);border-color:rgba(94,160,255,.4)}
@media (max-width:560px){.matchhead{grid-template-columns:1fr 1fr;grid-template-areas:"home away" "center center";padding:14px 8px}.mteam{grid-area:home}.mteam.away{grid-area:away}.mcenter{grid-area:center;margin-top:8px}.mcrest{width:48px;height:48px}}
@media (prefers-reduced-motion:reduce){.mdot{animation:none}}
</style>
${opts.head}
</head>
<body class="${opts.bodyClass || ""}" data-ss-generated="${opts.bodyDate || ""}">
<header id="topbar">
<a class="brand" href="/" aria-label="SportSignal"><img src="/logo.png" alt="SportSignal" width="146" height="50" referrerpolicy="no-referrer"></a>
<nav class="mainnav" aria-label="ناوبری اصلی"><a href="/">خانه</a><a href="/matches">بازی‌ها</a><a href="/teams">تیم‌ها</a><a href="/competitions">رقابت‌ها</a><a href="/methodology">روش کار</a><a href="/about">درباره</a></nav>
<div class="head-actions"><a class="cta" href="https://t.me/SportSignalAlertsBot" target="_blank" rel="noopener">عضویت در ربات تلگرام</a></div>
</header>
<p class="sub sync">${opts.updatedHtml || ""}</p>
<main id="main">
${opts.crumbHtml || ""}
<div class="pageh1-wrap"><h1 class="pageh1">${opts.h1}</h1></div>
${opts.mainHtml}
</main>
<footer class="pagesfoot" id="about">
<nav aria-label="ناوبری پابرگ"><a href="/">خانه</a><a href="/matches">بازی‌ها</a><a href="/matches/today">بازی‌های امروز</a><a href="/matches/this-week">بازی‌های این هفته</a><a href="/teams">تیم‌ها</a><a href="/competitions">رقابت‌ها</a><a href="/about">درباره</a><a href="/methodology">روش انتخاب بازی‌ها</a><a href="/contact">تماس</a><a href="/data">داده‌ها</a><a href="/privacy">حریم خصوصی</a><a href="/terms">شرایط استفاده</a><a href="/sitemap">نقشه سایت</a></nav>
<p>© SportSignal — <span id="footYear">۱۴۰۵</span> · ساخته‌شده با ❤️</p>
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
</body>
</html>`;
}
