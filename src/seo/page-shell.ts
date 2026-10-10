// SportSignal — <head> builder (P-01..P-11) + the HTML shell shared by every
// NEW public page (match/team/competition/hubs/trust). The shell reuses the
// site's existing stylesheet (/public-13.13.css) so the design language
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
<link rel="stylesheet" href="/public-13.13.css">
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
.updatedline{font-size:.8rem;color:var(--muted,#9aa4b2);padding:8px 0 2px}
.updatedline a{color:inherit}
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
</style>
${opts.head}
</head>
<body class="${opts.bodyClass || ""}">
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
</footer>
</body>
</html>`;
}
