// SportSignal — the public page template (RTL Persian UI: hero countdown,
// big-matches box, UCL card + table, standings grid, cups, live section).
// Everything between the backticks is CLIENT-side code (a string literal).
import { UCL_LOGO_CHIP, UCL_BALL } from "../config";

export const PUBLIC_PAGE = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0f172a">
<meta name="apple-mobile-web-app-title" content="SportSignal">
<meta name="application-name" content="SportSignal">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0f172a">
<meta name="apple-mobile-web-app-title" content="SportSignal">
<meta name="application-name" content="SportSignal">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0f172a">
<meta name="apple-mobile-web-app-title" content="SportSignal">
<meta name="application-name" content="SportSignal">
<!-- v12.x-live-lottie: the dotLottie player web component — renders the
     Live.lottie animation (a pulsing "LIVE" badge) used as the live-chip
     for live-broadcasting games. Loaded from the LottieFiles CDN. The
     <dotlottie-player> custom element is used in the livechip + the
     #liveCard h2 heading. -->
<script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>
<meta name="description" content="\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648\u060C \u0631\u0642\u0627\u0628\u062A\u200C\u0647\u0627\u06CC \u0635\u062F\u0631 \u062C\u062F\u0648\u0644 \u0648 \u0646\u062A\u0627\u06CC\u062C \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0645\u0646\u062A\u062E\u0628 \u2014 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u062E\u0648\u062F\u06A9\u0627\u0631">
<meta property="og:type" content="website">
<meta property="og:title" content="SportSignal \u2014 \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648">
<meta property="og:description" content="\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648\u060C \u0631\u0642\u0627\u0628\u062A\u200C\u0647\u0627\u06CC \u0635\u062F\u0631 \u062C\u062F\u0648\u0644 \u0648 \u0646\u062A\u0627\u06CC\u062C \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0645\u0646\u062A\u062E\u0628">
<meta property="og:url" content="https://football.sportsignal.ir/">
<meta property="og:image" content="https://football.sportsignal.ir/android-chrome-512x512.png">
<meta property="og:locale" content="fa_IR">
<meta property="og:locale:alternate" content="en_US">
<meta property="og:site_name" content="SportSignal">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="SportSignal \u2014 \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648">
<meta name="twitter:description" content="\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648\u060C \u0631\u0642\u0627\u0628\u062A\u200C\u0647\u0627\u06CC \u0635\u062F\u0631 \u062C\u062F\u0648\u0644 \u0648 \u0646\u062A\u0627\u06CC\u062C \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0645\u0646\u062A\u062E\u0628">
<meta name="twitter:image" content="https://football.sportsignal.ir/android-chrome-512x512.png">
<link rel="canonical" href="https://football.sportsignal.ir/">
<link rel="preload" href="/fonts/Vazirmatn-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/Vazirmatn-Bold.woff2" as="font" type="font/woff2" crossorigin>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"SportSignal","alternateName":"\u0627\u0633\u067E\u0648\u0631\u062A \u0633\u06CC\u06AF\u0646\u0627\u0644","url":"https://football.sportsignal.ir/","description":"\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648\u060C \u0631\u0642\u0627\u0628\u062A\u200C\u0647\u0627\u06CC \u0635\u062F\u0631 \u062C\u062F\u0648\u0644 \u0648 \u0646\u062A\u0627\u06CC\u062C \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0645\u0646\u062A\u062E\u0628","inLanguage":["fa","en"]}<\/script>
<script>try{var t=localStorage.getItem("ucl_theme")||"dark",l=localStorage.getItem("ucl_lang")||"fa",d=document.documentElement;d.setAttribute("data-theme",t);d.setAttribute("lang",l);d.setAttribute("dir",l==="en"?"ltr":"rtl");}catch(e){}<\/script>
<!-- v12.x-force-dark: the default theme is ALWAYS dark, regardless of the
     user's system preference (prefers-color-scheme). The color-scheme meta
     tells the browser to render form controls + scrollbars in dark mode.
     The user can still toggle to light via the theme button. -->
<meta name="color-scheme" content="dark light">
<title data-i="title">\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u0631\u0648 \u2014 \u0627\u0639\u0644\u0627\u0646\u200C\u062F\u0647\u0646\u062F\u0647 \u0645\u0633\u0627\u0628\u0642\u0627\u062A</title>
<style>@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Regular.woff2') format('woff2');font-weight:400;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-SemiBold.woff2') format('woff2');font-weight:600;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Bold.woff2') format('woff2');font-weight:700;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-ExtraBold.woff2') format('woff2');font-weight:800;font-display:swap}</style>
<style>
:root{color-scheme:dark;--bg:#0f172a;--card:#1e293b;--field:#0f172a;--text:#e2e8f0;--muted:#94a3b8;--border:#334155;--accent:#2563eb;--accent-strong:#1d4ed8;--link:#93c5fd;--score:#4ade80;--countdown:#93c5fd;--countdown-bg:rgba(96,165,250,.12);--danger:var(--t-danger);--chip:#334155;--hover:rgba(148,163,184,.08);--footer:#94a3b8;--glass:rgba(30,41,59,.55);--glass-border:rgba(148,163,184,.16);--glass-hi:rgba(255,255,255,.07);--glass-shadow:0 8px 32px rgba(0,0,0,.35);--glow1:rgba(37,99,235,.17);--glow2:rgba(29,78,216,.11);--scrim:rgba(2,6,23,.62);--rowsurf:rgba(15,23,42,.42);--t-primary:#2563eb;--t-success:#15803d;--t-success-ink:#4ade80;--t-success-soft:rgba(34,197,94,.14);--t-success-line:rgba(34,197,94,.35);--t-warning:#b45309;--t-highlight:#7e22ce;--t-danger:#f87171;--t-neutral:#334155;--t-neutral-soft:rgba(148,163,184,.14);--badge-top:#b45309;--badge-hot:var(--t-warning);--badge-derby:var(--t-highlight);--badge-league:var(--t-neutral);--badge-live:var(--t-success-ink);--nav-link:#cbd5e1;--nav-link-hover:#f1f5f9;--pill-primary-bg:var(--accent);--pill-primary-ink:#fff;--pill-primary-line:rgba(255,255,255,.22);--pill-hype-bg:linear-gradient(90deg,var(--badge-hot),var(--badge-derby));--pill-hype-ink:#fff;--pill-hype-line:rgba(255,255,255,.18);--pill-neutral-bg:rgba(148,163,184,.16);--pill-neutral-ink:#e2e8f0;--pill-neutral-line:rgba(148,163,184,.28)}
[data-theme="light"]{color-scheme:light;--bg:#f8fafc;--card:#ffffff;--field:#f8fafc;--text:#0f172a;--muted:#64748b;--border:#e2e8f0;--accent:#2563eb;--accent-strong:#1d4ed8;--link:#1d4ed8;--score:#15803d;--countdown:#2563eb;--countdown-bg:rgba(37,99,235,.1);--danger:var(--t-danger);--chip:#e2e8f0;--hover:rgba(15,23,42,.045);--footer:#64748b;--glass:rgba(255,255,255,.62);--glass-border:rgba(15,23,42,.08);--glass-hi:rgba(255,255,255,.7);--glass-shadow:0 8px 32px rgba(15,23,42,.08);--glow1:rgba(37,99,235,.09);--glow2:rgba(96,165,250,.08);--scrim:rgba(248,250,252,.78);--rowsurf:rgba(241,245,249,.72);--t-primary:#2563eb;--t-success:#15803d;--t-success-ink:#15803d;--t-success-soft:rgba(21,128,61,.12);--t-success-line:rgba(21,128,61,.32);--t-warning:#b45309;--t-highlight:#7e22ce;--t-danger:#dc2626;--t-neutral:#e2e8f0;--t-neutral-soft:rgba(15,23,42,.05);--badge-top:#b45309;--badge-hot:var(--t-warning);--badge-derby:var(--t-highlight);--badge-league:var(--t-neutral);--badge-live:var(--t-success-ink);--nav-link:#334155;--nav-link-hover:#0f172a;--pill-primary-bg:var(--accent);--pill-primary-ink:#fff;--pill-primary-line:rgba(255,255,255,.22);--pill-hype-bg:linear-gradient(90deg,var(--badge-hot),var(--badge-derby));--pill-hype-ink:#fff;--pill-hype-line:rgba(255,255,255,.18);--pill-neutral-bg:rgba(15,23,42,.08);--pill-neutral-ink:#1e293b;--pill-neutral-line:rgba(15,23,42,.16)}
html{overflow-x:hidden;scroll-behavior:smooth}/* v12.23 (the user's bug report): the floodlight sweep once rode an UNCLIPPED .card.bighero::after translating to \xB1140% of the card \u2014 every pass (6.5s, faster when urgent) widened the DOCUMENT's scrollable width, so a scrollbar popped in and out and the page visibly "heartbeat" every few seconds (a slide flash on phones). Every animated layer is now clipped inside its card; this root clip is the hard net so no fx can ever widen the page again. */
body{font-family:'Vazirmatn',system-ui,sans-serif;background-color:var(--bg);color:var(--text);max-width:760px;margin:0 auto;padding:24px 20px 36px;line-height:1.6;-webkit-font-smoothing:antialiased;transition:background .25s,color .25s}body::before{content:"";position:fixed;inset:0;z-index:-1;background:radial-gradient(900px 520px at 88% -8%,var(--glow1),transparent 60%),radial-gradient(820px 620px at -12% 32%,var(--glow2),transparent 60%),linear-gradient(var(--scrim),var(--scrim)),url('/bg.jpg') center/cover no-repeat}
#topbar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;position:relative}
#topbar button{background:var(--glass);-webkit-backdrop-filter:blur(10px) saturate(1.3);backdrop-filter:blur(10px) saturate(1.3);color:var(--text);border:1px solid var(--glass-border);border-radius:10px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:border-color .15s,transform .15s cubic-bezier(.16,1,.3,1),background .15s}
#topbar button:hover{border-color:var(--accent);background:var(--hover)}
/* v12.27: the cluster's icon buttons are FLAT (transparent, borderless) \u2014 the shell is the chrome \u2014 so their hover swaps a soft fill instead of a border. */
.tb-btns button:hover{border-color:transparent;background:var(--hover)}
.tb-btns button:active{transform:scale(.94)}
#topbar button:active{transform:scale(.96)}
/* v12.24 (the user's ask): the top bar is a real WEBSITE HEADER \u2014 the
   SportSignal logo pinned to the start corner, the settings icons + the
   Telegram CTA grouped at the opposite end: [settings icons] [telegram
   cta] \xB7\xB7\xB7 [logo]. Fixed width/height attrs on the img so the header can
   never shift while loading; the logo png is served from the worker's
   assets directory.
   v12.25: the white plate was retired for the transparent png.
   v12.26 (the user's ask): "in darkmode it turns to a white sillohuette.
   fix this. show the given logo in both light and dark mode" \u2014 the
   TWO-variant swap is RETIRED (the white remap logo-light.png deleted);
   the uploaded logo.png now rides BOTH themes unchanged (its own navy +
   white inks read on dark, its navy reads on light). PC size TRIMMED by
   40% per the ask: 84px \u2192 50px (phones already 50px \u2014 one size fits all). */
.brand{display:inline-flex;align-items:center;text-decoration:none;flex-shrink:0}
.brand img{display:block;height:50px;width:auto;transition:transform .15s cubic-bezier(.16,1,.3,1)}
/* v12.32 (the user's ask): "increase the size of sportsignal logo by 15% in
   pc mode" \u2014 phones keep the compact 50px header height, >=601px the logo
   grows to 57.5px (50 x 1.15); width rides width:auto, so the mark scales
   proportionally with its raster. */
@media (min-width:601px){.brand img{height:57.5px}}
.brand:hover img{transform:none}
/* v12.27 (review items 3+7): the UTILITY CLUSTER \u2014 the settings gear, the
   language switch and the theme toggle live in ONE visually grouped control
   (.tb-btns: 6px internal gap, a subtle glass shell) anchored to the LOGICAL
   inline-end of the header, opposite the logo \u2014 inset-inline-start:auto on
   the .head-actions group (logical properties only, so an LTR flip stays
   correct). The old margin-inline-start:auto on .tb-btns itself is retired:
   it shoved the buttons away from the CTA with an uneven gap that read as
   accidental. Each icon button keeps a 44\xD744px hit area (min-width/height,
   icon visually unchanged) per the touch-target minimum. */
.head-actions{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-inline-start:auto}
/* v12.52-mobile-header: Telegram icon button — hidden on desktop, shown
   on mobile where the text CTA is too wide. Uses the same glass button
   styling as the other icon buttons. */
#tgbtn{display:none;align-items:center;justify-content:center;background:var(--glass);-webkit-backdrop-filter:blur(10px) saturate(1.3);backdrop-filter:blur(10px) saturate(1.3);color:var(--text);border:1px solid var(--glass-border);border-radius:10px;width:40px;height:40px;cursor:pointer;transition:border-color .15s,transform .15s cubic-bezier(.16,1,.3,1)}
#tgbtn:hover{border-color:var(--accent);background:var(--hover)}
#tgbtn:active{transform:scale(.96)}
#topbar .cta{margin-top:0}
#topbar .sync{flex:1 1 100%;margin:2px 0 0}
.tb-btns{display:inline-flex;align-items:center;gap:6px;padding:3px;border-radius:14px;background:var(--hover);border:1px solid var(--glass-border)}
.tb-btns button{min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:4px 10px;font-size:16px;line-height:1;background:transparent;border:none}
/* v12.19 (the user's ask): the timezone search + select were permanent topbar
   clutter \u2014 they now hide behind ONE settings-gear button next to the theme
   toggle. The popover is a glass card with a full-width search + select (far
   bigger touch targets than the old 100px sliver); picking a zone, the \u2715,
   the gear again, an outside click or Esc closes it. */
#tzpanel{display:none;position:absolute;top:calc(100% + 10px);inset-inline-end:0;z-index:60;width:min(340px,calc(100vw - 40px));flex-direction:column;gap:8px;background:var(--glass);-webkit-backdrop-filter:blur(12px) saturate(1.4);backdrop-filter:blur(12px) saturate(1.4);border:1px solid var(--glass-border);border-radius:14px;padding:12px;box-shadow:var(--glass-shadow),inset 0 1px 0 var(--glass-hi)}
#tzpanel.open{display:flex}
.tz-head{display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:700}
#tzclose{background:none;border:none;color:var(--muted);font-size:15px;line-height:1;cursor:pointer;padding:2px 8px;border-radius:8px;font-family:inherit;transition:color .15s,background .15s}
#tzclose:hover{color:var(--text);background:var(--hover)}
#sbtn[aria-expanded="true"]{transform:rotate(90deg);border-color:var(--accent)}
#tzfilter{background:var(--field);color:var(--text);border:1px solid var(--border);border-radius:10px;padding:9px 11px;font-size:13px;font-family:inherit;width:100%;box-sizing:border-box;transition:border-color .15s}
#tzsel{background:var(--field);color:var(--text);border:1px solid var(--border);border-radius:10px;padding:10px 11px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;width:100%;box-sizing:border-box;transition:border-color .15s}
/* v12.x-tz-search-fix: when the select becomes a listbox (size>1 via
   the render function), let it grow to fit the visible rows instead of
   staying at one-line dropdown height. */
#tzsel[size]{height:auto;max-height:280px;overflow-y:auto}
#tzsel:hover{border-color:var(--accent)}
#tzfilter:focus,#tzsel:focus{border-color:var(--accent);outline:none}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
h1{font-size:27px;font-weight:800;margin:0 0 6px;letter-spacing:-.01em}
.sub{color:var(--muted);font-size:13.5px;margin:0 0 6px}
.sub a{color:var(--link);text-decoration:none;border-bottom:1px solid transparent;transition:border-bottom-color .15s}
.sub a:hover{border-bottom-color:var(--link)}
/* v12.20: proof for the "auto-updated" claim \u2014 the payload's fetchedAt stamp,
   aged live ("\u06F2 \u062F\u0642\u06CC\u0642\u0647 \u067E\u06CC\u0634" / "2 min ago"). */
.sync{font-size:11.5px;opacity:.9;margin:0 0 4px;font-variant-numeric:tabular-nums}
.cta{display:inline-flex;align-items:center;gap:8px;margin-top:14px;background:var(--accent);color:#fff;font-size:13px;font-weight:600;padding:10px 18px;border-radius:999px;text-decoration:none;transition:background .15s,transform .15s cubic-bezier(.16,1,.3,1),box-shadow .15s}
.cta:hover{background:var(--accent-strong);transform:translateY(-1px);box-shadow:0 6px 16px rgba(37,99,235,.2)}
/* v12.20 (the user's ask): the join CTA vanishes once you scroll into the match
   list \u2014 this sticky bottom bar brings it back (safe-area aware on phones;
   hides again the moment the hero button is back in view). */
#joinSticky{position:fixed;bottom:0;left:0;right:0;z-index:70;display:none;justify-content:center;padding:10px 16px calc(10px + env(safe-area-inset-bottom,0px));background:var(--glass);-webkit-backdrop-filter:blur(14px) saturate(1.4);backdrop-filter:blur(14px) saturate(1.4);border-top:1px solid var(--glass-border);box-shadow:0 -8px 28px rgba(2,6,23,.45);text-decoration:none}
#joinSticky.show{display:flex}
/* v12.x-no-sticky-pc: hide the sliding sticky Telegram bar on PC — the
   floating FAB (#tgFab) covers the PC CTA. Only show #joinSticky on
   mobile (max-width:600px). */
@media (min-width:601px){#joinSticky{display:none !important}}
#joinSticky .js-inner{display:inline-flex;align-items:center;gap:9px;background:var(--accent);color:#fff;font-size:13px;font-weight:700;padding:12px 22px;border-radius:999px;transition:background .15s,transform .15s cubic-bezier(.16,1,.3,1)}
#joinSticky .js-inner:hover{background:var(--accent-strong);transform:translateY(-1px)}
#joinSticky svg{flex-shrink:0}
body.joinsticky{padding-bottom:88px}
/* v12.x-tg-fab: a floating Telegram FAB for PC view — a 56px circular
   button in Telegram brand blue (#229ED9) with the white paper-plane
   logo. Fixed to the bottom-RIGHT corner in BOTH Farsi (RTL) and
   English (LTR) — per the user's explicit ask (must be right for both
   English and Farsi). Uses the physical right:24px (not the logical
   inset-inline-start which would flip to left in LTR). Hidden on
   mobile (the #joinSticky bottom bar covers the mobile CTA). The
   header CTA pill (#topbar .cta) is retired on PC; this FAB replaces
   it. The tooltip + aria-label are static Telegram in both
   languages. A subtle pulse animation (2.6s, ease-in-out, infinite)
   draws the eye without being annoying. The FAB has a soft drop
   shadow (filter:drop-shadow follows the circle, unlike box-shadow
   which can render as a square on overflow:hidden + border-radius
   elements — same fix as the hero logos). */
#tgFab{position:fixed;bottom:24px;right:24px;z-index:65;display:none;align-items:center;justify-content:center;width:56px;height:56px;border-radius:50%;background:#229ED9;text-decoration:none;cursor:pointer;filter:drop-shadow(0 3px 8px rgba(34,158,217,.35)) drop-shadow(0 1px 3px rgba(0,0,0,.2));transition:transform .15s cubic-bezier(.16,1,.3,1),filter .15s,opacity .3s ease;animation:tgFab-pulse 2.6s ease-in-out infinite}
#tgFab:hover{transform:scale(1.08);filter:drop-shadow(0 5px 12px rgba(34,158,217,.5)) drop-shadow(0 2px 5px rgba(0,0,0,.25))}
#tgFab:active{transform:scale(.96)}
#tgFab svg{flex-shrink:0;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))}
@keyframes tgFab-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}

/* v12.x-fab-promo: a white promotional bubble that appears next to the
   Telegram FAB every ~60s to promote the bot. The bubble shows a
   bilingual message ("عضویت در ربات تلگرام، برای دنبال کردن مسابقات
   مهم" / "Join the Telegram bot, never miss a match") in a white
   rounded pill. The bubble fades in, holds for ~5s, then fades out.
   The cycle repeats every 60s. The bubble sits to the LEFT of the FAB
   (above-left, anchored to the FAB's top-left corner). A small
   triangle points to the FAB. The bubble uses a CSS animation with a
   60s cycle (5s visible, 55s hidden). */
#tgFab::after{content:attr(data-promo);position:absolute;bottom:50%;right:100%;margin-right:10px;margin-bottom:0;white-space:nowrap;background:#fff;color:#0f172a;font-size:13px;font-weight:700;padding:8px 16px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.18);opacity:0;pointer-events:none;transform:translateY(50%) translateX(8px);transition:opacity .4s ease,transform .4s ease;filter:none}
#tgFab::before{content:"";position:absolute;bottom:50%;right:100%;margin-right:-2px;margin-bottom:-6px;width:0;height:0;border-style:solid;border-width:6px 0 6px 8px;border-color:transparent transparent transparent #fff;opacity:0;pointer-events:none;transform:translateY(50%);transition:opacity .4s ease}
#tgFab.promo-show::after{opacity:1;transform:translateY(50%) translateX(0)}
#tgFab.promo-show::before{opacity:1}
/* v12.x-tg-fab: hide the FAB on mobile — the #joinSticky bottom bar
   covers the mobile CTA. Show it only on PC (min-width:601px). */
@media (min-width:601px){#tgFab{display:inline-flex}}
/* v12.x-tg-fab: retire the header CTA pill on PC — the FAB replaces it.
   The #tgbtn icon (already display:none on desktop, display:flex on
   mobile) is unaffected. Mobile keeps the #joinSticky bar. */
@media (min-width:601px){#topbar .cta{display:none}}
/* v12.12: the .viewtoggle block is retired (the page is always big-only) */
.bigbar{margin:14px 0 4px;background:var(--glass);-webkit-backdrop-filter:blur(12px) saturate(1.4);backdrop-filter:blur(12px) saturate(1.4);border:1px solid var(--glass-border);border-radius:16px;padding:12px 16px;box-shadow:var(--glass-shadow),inset 0 1px 0 var(--glass-hi)}
/* v12.38-hero: Fix 3 — the label + clock + percentage now group TOGETHER
   on the same side of the row (was space-between, which parked the label
   at the opposite edge from the values it describes). justify-content:
   flex-end groups them at the inline-end (left in RTL, right in LTR); the
   label sits directly adjacent to the .bb-end group with a small gap
   matching the gap already used between the percentage and the timer. */
.bigbar-top{display:flex;align-items:center;justify-content:flex-end;gap:8px;font-size:13px;font-weight:600;color:var(--muted);margin-bottom:8px}
/* v12.24: the clock and the new PROGRESS PERCENT chip group at the row's
   end \u2014 the percent makes the bar's base explicit (0% far out \u2192 100% at
   kickoff) instead of a mystery fill. */
.bb-end{display:inline-flex;align-items:center;gap:8px;min-width:0}
/* v12.32 (the user's ask): the navy bar's #bigbarDate run is RETIRED \u2014 the
   kickoff weekday+date moved OUT of the bar, down under the hero's big time
   chip (the .kickdate rule in the .kick block below: the time over
   "weekday day month", the date one step smaller). The bar itself is back to
   label + clock + percent + track, nothing else. */
/* v12.38-hero: Fix 1+4+5: the progress bar + percentage badge now track the
   FINAL 24 HOURS before kickoff (not the old 14-day window) so the fill and
   the countdown clock always agree. The percentage badge also switches to
   the NEUTRAL pill token (was blue, low-contrast) with a visible period
   suffix "۲۴" / "24h" so the percentage is never ambiguous. Reduced to
   11px/700 so the kickoff-time pill reads as the primary headline number. */
.bigbar-pct{display:none !important}
.bigbar-pct:empty{display:none}
.bigbar-clock{font-weight:700;color:#22c55e;font-variant-numeric:tabular-nums}
/* v12.x-green-clock (the user's ask): the hero countdown clock is now GREEN
   (matches the .bigbar-fill progress bar gradient #22c55e → #16a34a). Was
   var(--countdown) (light blue #93c5fd dark / #2563eb light). Green keeps
   the clock visually unified with the progress bar that fills under it. */
[data-theme="light"] .bigbar-clock{color:#16a34a}
/* v12.39-minbar: the track is a THIN 4px hairline, flush at the bottom of
   the .bigbar container — minimal, integrated into the container rather
   than a heavy 14px rectangle. Fully rounded (border-radius:999px) so the
   ends are pill-shaped. The heavy inset shadow is retired. */
.bigbar-track{position:relative;height:5px;border-radius:999px;background:rgba(148,163,184,.18);overflow:hidden;margin-top:2px}
[data-theme="light"] .bigbar-track{background:rgba(15,23,42,.08)}
/* v12.39-minbar: the fill is the same thin 4px line, fully rounded, with a
   subtle gradient + a soft glow. The animated stripes + the fuse-tip ::after
   pseudo-element are retired (they added visual weight the user didn't
   want). The fill now reads as a clean minimal progress line. */
.bigbar-fill{position:absolute;top:0;left:0;height:100%;width:0%;border-radius:999px;background:linear-gradient(90deg,#22c55e,#16a34a);box-shadow:0 0 6px rgba(34,197,94,.22);transition:width .7s cubic-bezier(.16,1,.3,1)}
.bigbar-fill.live{background:linear-gradient(90deg,#f59e0b,#ef4444);box-shadow:0 0 8px rgba(239,68,68,.28);animation:bigbar-pulse 1.2s ease-in-out infinite}
.bigbar-fill.idle{width:12%}
@keyframes bigbar-pulse{0%,100%{opacity:1}50%{opacity:.7}}
/* v12.10/v12.11 HERO CARD: the countdown bar lives INSIDE the hero card,
   flush \u2014 with its own match right below it, so the bar and the match read
   as ONE unit. v12.11: the card is a PLAIN standard .card \u2014 no golden
   chrome, identical to every other section (streamlined, per the user). */
/* v12.27 (review item 1): the countdown bar gets its scrim BACK \u2014 it was
   transparent since v12.26, so the clock + the \u06F8\u06F8\u066A percent chip sat directly
   on the video/crest artwork. A soft horizontal gradient plate guarantees
   contrast for the bar's live text ("no live text ever sits directly on the
   high-contrast part of the crest artwork"). */
/* v12.42-livesection: the hero's .bigbar background is now TRANSPARENT
   (was a navy gradient scrim — the user's ask: "there is a background
   rectangle which I don't like — it's white-ish"). The bar sits directly
   on the hero card's own background, with no separate container. The
   border-bottom divider is also retired — the thin 4px track is the
   only divider. padding adjusted for the label/clock/pct row + track. */
.bighero .bigbar{margin:0 0 12px;padding:2px 2px 8px;background:transparent;border:none;border-radius:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}
[data-theme="light"] .bighero .bigbar{background:transparent}
.bighero .bigbar-clock{text-shadow:0 1px 10px rgba(2,6,23,.55)}
[data-theme="light"] .bighero .bigbar-clock{text-shadow:0 1px 8px rgba(248,250,252,.9)}
/* v12.38-hero: the hero's .bigbar-pct already inherits the neutral pill token
   from the base rule above; the old blue override (rgba(96,165,250,.22)) is
   retired. The neutral token has enough contrast on the hero's dark scrim
   in both themes. */
/* v12.22 (the user's ask): the countdown hero is the page's ADRENALINE box \u2014
   "css js effects, making it excitement, adrenalin, and evoking emotions",
   not just a color change. It is now a STAGE, and nothing else on the page
   behaves like it: an emerald spotlight gradient + border, a heartbeat glow
   that lub-dubs, a floodlight sweep washing over the teams, embers rising
   from the bottom, a white-hot FUSE TIP burning at the draining edge of the
   bar, a per-second tick pop on the clock (now 18px/800), and the two sides
   entering the stage from their own edges. The intensity ESCALATES toward
   kickoff via [data-urgent] (set by updateBigBar): far = calm emerald
   breathing; soon (\u226424h) = amber + faster pulse; final (\u226460min) = red alarm
   heartbeat + pulsing label; live = the red stage around the live bar.
   Every layer is an opacity/transform animation (compositor friendly) and
   the global prefers-reduced-motion rule silences all of them. */
/* v12.53: min-height so the hero card doesn't collapse when .hero-data is
   position:absolute (the data layer is now absolute to center the content).
   240px on phones gives enough room for the match row + countdown bar.
   Desktop gets a larger min-height via the media query below. */
.card.bighero{position:relative;overflow:hidden;border-radius:16px;margin:0;min-height:200px;border-color:rgba(30,58,138,.6);border-width:2px;background-image:radial-gradient(130% 100% at 50% -30%,rgba(52,211,153,.18),transparent 55%),linear-gradient(168deg,rgba(6,95,70,.34),rgba(2,6,23,.14))}
[data-theme="light"] .card.bighero{border-color:rgba(30,58,138,.6);border-width:2px;background-image:radial-gradient(130% 100% at 50% -30%,rgba(16,185,129,.20),transparent 55%),linear-gradient(168deg,rgba(209,250,229,.70),rgba(255,255,255,.30))}
/* v12.27 (review item 1): HERO CLIP \u2014 the card itself now clips everything to
   its own 16px radius (overflow:hidden). Before, only the inner layers clipped
   themselves at 15px \u2014 a 1px-radius mismatch at the corners, and (the real
   report) WebKit renders a FILTERED child escaping border-radius+overflow
   clipping in some versions, so the crest artwork could paint outside the
   card's rounded corners. The card-level clip is the guarantee. Because a
   child's outer box-shadow would also be clipped, the heartbeat AURA moved to
   a wrapper that owns the OUTER glow (.herowrap::before) while the card's
   ::before keeps the inner emerald wash; updateBigBar mirrors data-urgent on
   the wrapper so the escalation ladder drives both. The crest imgs' brightness
   filter moved onto the .hero-wm LAYER (a filtered container clips its own
   children \u2014 the imgs themselves stay unfiltered). */
.herowrap{position:relative;margin:14px 0}
.card.bighero{filter:drop-shadow(0 4px 16px rgba(0,0,0,.36))}
.herowrap::before{content:"";position:absolute;inset:0;border-radius:16px;pointer-events:none;box-shadow:0 0 40px rgba(5,150,105,.24);opacity:.4;animation:hero-heart 2.6s ease-in-out infinite}
.card.bighero::before{content:"";position:absolute;inset:0;border-radius:16px;pointer-events:none;box-shadow:inset 0 0 64px rgba(16,185,129,.10);opacity:.4;animation:hero-heart 2.6s ease-in-out infinite}
@keyframes hero-heart{0%,100%{opacity:.35}8%{opacity:.9}16%{opacity:.5}24%{opacity:.75}36%{opacity:.35}}
/* v12.26 (the user's ask): the hero is a VIDEO STAGE now \u2014 the user's own
   clip plays as the deepest layer behind the next big match, with the exact
   layer ladder the user specified:
     A. DEEPEST  .hero-video  \u2014 the looping muted mp4 (z:0), under a light
        theme-aware scrim (data keeps its own plates, v12.27)
     B.          .hero-wm    \u2014 the faded club crests (z:1)
     C.          .hero-fx    \u2014 the css effects: sweep + embers (z:2)
     D. SURFACE  .hero-data  \u2014 the actual data: countdown bar + the match
        row (z:3, position:relative \u2014 above every fx layer)
   The video (768\xD7254 h264, 7.2s, no audio) is served from the worker's
   [assets] directory as /hero-stage.mp4: autoplay+ muted + loop + playsinline
   (autoplay-safe everywhere), object-fit:cover (crops to the card).
   v12.28 (the user's report: "Video still doesnt play. (it's just a picture)
   - on chrome"): the stage was tuned so dim (video .42 + a .58 scrim \u2014 the
   clip's own motion is subtle, ~4% per-channel frame deltas) that a PLAYING
   video was indistinguishable from a still, and reduced-motion users got an
   explicit pause. Now: the video runs at .78 with only a light .38/.18 scrim
   (the live text keeps its own plates \u2014 the bar's v12.27 gradient, the
   rowsurf boxes), motion is actually PERCEIVABLE, and the boot kicker no
   longer pauses the stage for prefers-reduced-motion (the user's twice-
   repeated explicit ask: it must autoplay; the CSS fx still respect the
   media query). */
.hero-video{position:absolute;inset:0;z-index:0;border-radius:16px;overflow:hidden;pointer-events:none;background:transparent}
/* v12.30 (the user's ask): "add a 30% dark navy overlay on the video of the
   next upcoming match + some gaussian blur just a touch" \u2014 the stage was
   competing with the data on top of it (the user's phone report: "the
   header of upcoming match in mobile looks distracting. disorganized and
   messy with a lot of noise"). The scrim becomes a FLAT 30% dark-navy veil
   (rgba(2,6,23,.30) \u2014 the old .38/.18 gradient retired), and the clip
   itself gets a TOUCH of gaussian blur (2.5px) with a 1.06 scale so the
   blur's edge smear never paints inside the clipped card. Motion stays
   perceivable (v12.28's autoplay work untouched \u2014 large-scale movement
   survives a 2.5px blur easily); the stage now reads as ONE calm navy
   backdrop the data sits on, not a rival beside it. Light theme keeps
   its white veil (a navy fill would muddy the light card), same flat cut. */
.hero-video video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.78;filter:blur(2.5px) saturate(1.18) brightness(1.02);transform:scale(1.06)}
.hero-video::after{content:"";position:absolute;inset:0;background:rgba(2,6,23,.30)}
[data-theme="light"] .hero-video::after{background:rgba(248,250,252,.42)}
/* v12.50: hero-data is vertically centered — the match row + the countdown
   bar sit in the MIDDLE of the hero card, not aligned to the top. */
.hero-data{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;justify-content:center;gap:12px;padding:80px 18px 18px}
/* v12.23: the sweep MOVED from .card.bighero::after (unclipped \u2014 the heartbeat-scrollbar bug) into the already-clipped .hero-fx layer, so the light band can wash over the stage but never escape the card. Same gradient, same rhythm. v12.26: the fx layer sits ABOVE the video + crests and BELOW the data (the user's ladder: video < logos < css effects < data). */
.hero-fx::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 32%,rgba(255,255,255,.05) 44%,rgba(255,255,255,.13) 50%,rgba(255,255,255,.05) 56%,transparent 68%);transform:translateX(-140%);animation:hero-sweep 6.5s cubic-bezier(.55,0,.45,1) infinite}
@keyframes hero-sweep{0%{transform:translateX(-140%)}42%,100%{transform:translateX(140%)}}
.hero-fx{position:absolute;inset:0;z-index:2;border-radius:16px;overflow:hidden;pointer-events:none}
.hero-fx i{position:absolute;bottom:-8px;width:5px;height:5px;border-radius:50%;background:radial-gradient(circle,rgba(110,231,183,.95),rgba(52,211,153,0) 70%);opacity:0;animation:hero-ember 7s linear infinite}
.hero-fx i:nth-child(1){left:16%;animation-duration:6.5s}
.hero-fx i:nth-child(2){left:46%;width:4px;height:4px;animation-delay:2.3s;animation-duration:8.2s}
.hero-fx i:nth-child(3){left:78%;animation-delay:4.6s;animation-duration:7.4s}
@keyframes hero-ember{0%{transform:translateY(0) translateX(0);opacity:0}12%{opacity:.75}70%{opacity:.3}100%{transform:translateY(-200px) translateX(16px);opacity:0}}
/* v12.32 (the user's ask): "decrease the size of countdown numbers in both
   pc and mobile" \u2014 the bar's clock (1 day 02:43:44) drops from the v12.28
   display size (18px) back to a quiet label-class 14px PC / 12.5px phones
   (the <=600px block below); the bar reads label, clock, track \u2014 and the
   HERO'S OWN headline number stays the big one (the 24px time chip in the
   match row, untouched). */
.bighero .bigbar-clock{font-size:14px;font-weight:800;letter-spacing:.01em}
#bigbarClock.tick{animation:hero-tick .34s cubic-bezier(.34,1.56,.64,1)}
@keyframes hero-tick{0%{transform:scale(1)}35%{transform:scale(1.055);filter:brightness(1.4)}100%{transform:scale(1)}}
/* v12.39-minbar: the .bigbar-fill::after fuse-tip pseudo-element is RETIRED
   — it was the white-hot burning edge of the old 14px striped bar. The new
   4px minimal line has no fuse tip; the fill's own gradient + soft glow are
   the whole visual. */
.bighero .team{font-size:16px;font-weight:800}
/* v12.x-hero-nowrap (the user's ask): 'In Top-big-incoming-box (single
   featured) the clubs never, whatever long they're, should never be in
   two row, always one row' AND 'never truncate the club's name — always
   mention full name of club in same row'. The hero's team names are
   forced to a SINGLE line via white-space:nowrap (no wrapping) with NO
   truncation (no overflow:hidden, no text-overflow:ellipsis). Instead,
   the font-size is FLUID via clamp(9px, 2.5vw, 16px) so the longest
   names (e.g. 'Manchester United FC', ~20 chars) fit on one row even on
   a 390px phone (each team column ~140px; at 9-10px the full name
   fits). On desktop the clamp maxes at 16px (the normal hero size).
   Specificity (0,3,1) beats both .bighero .team (0,2,1) and
   .match .side .team (0,3,0). */
.bighero .match .side .team{white-space:nowrap;overflow:visible;text-overflow:clip;overflow-wrap:normal;word-wrap:normal;min-width:0;font-size:clamp(9px,2.5vw,16px)}
/* v12.x-no-logo-shadow (the user's ask): 'Remove the shadows behind all
   club teams logos it created noise.' All logo drop-shadows + ring
   shadows are RETIRED — the hero crests, the topspot crests, and any
   other .logo elements now render flat with just their circular border
   + background plate (no filter:drop-shadow, no box-shadow ring). The
   crest image + the navy circle plate remain; only the shadow noise
   is gone. Dark + light mode both clean. */
.bighero .logo{filter:none}
[data-theme="light"] .bighero .logo{filter:none}
#topspotCard .spotitem .logo{box-shadow:none;filter:none;width:43px;height:43px;font-size:20px}
/* v12.x-topspot-promoted (the user's ask): the big upcoming matches box is
   a PROMOTED section (right below the hero) — its club crests are LARGER
   than the regular match boxes (51px desktop / 46px mobile) to mark the
   promotion. 64px desktop / 54px mobile, between the regular 51/46 and
   the hero's 102/46. Font-size scales for the monogram fallback (28/24).
   The soft shadow switched from box-shadow to filter:drop-shadow() (same
   fix as the hero — avoids the overflow:hidden + border-radius
   square-shadow Chromium bug). The 1px ring stays as box-shadow (zero-blur
   box-shadow respects border-radius). */
@media (min-width:601px){#topspotCard .spotitem .logo{width:51px;height:51px;font-size:22px}}
/* v12.24 (the user's ask): the countdown hero's team crests DOUBLE on PC
   (51px \u2192 102px, the monogram fallback scales with the circle) \u2014 the
   face-off reads like a big-match poster. Phones keep their own 46px size
   from the mobile block below. */
@media (min-width:601px){.bighero .logo{width:102px;height:102px;font-size:44px}}
.bighero .match .side{animation:hero-side .5s cubic-bezier(.16,1,.3,1) both}
.bighero .match .side:first-child{--sx:34px}
.bighero .side.away{--sx:-34px}
[dir="ltr"] .bighero .match .side:first-child{--sx:-34px}
[dir="ltr"] .bighero .side.away{--sx:34px}
@keyframes hero-side{from{opacity:0;transform:translateX(var(--sx,20px))}to{opacity:1;transform:none}}
/* v12.23: the clubs' EXPANDED crests, faded to a watermark, sit in the
   background of the next big upcoming match \u2014 "[faded logo big on
   background] [club logo] club name". One giant crest per club, anchored
   behind that club's half of the row, far under the content (z:1 \u2014 below
   the fx and the row itself, above the video), clipped inside the card and
   pointer-transparent. The layer is STATIC markup (like the embers) so
   re-renders never disturb it; renderHeroSpot \u2192 heroWm() swaps the two
   crest srcs.
   v12.24 (the user's ask): the crests went 320px at .40.
   v12.25: reduced by 30% \u2192 .28. A soft radial SCRIM behind the card's
   center plus a gentle text-shadow on the team names keep the countdown
   and names fully readable (WCAG contrast preserved).
   v12.26 (the user's ask \u2014 "reduce the opacity of background logos by 30%
   (it's still too visible)"): .28 \u2192 .196 on BOTH themes (phones too),
   same 320px/210px canvas \u2014 one more honest 30% cut. */
.hero-wm{position:absolute;inset:0;z-index:1;border-radius:16px;overflow:hidden;pointer-events:none;filter:brightness(1.28) saturate(1.05)}
/* v12.28 (the user's ask): crest watermarks another 20% fainter (.196 \u2192 .157)
   so they read as background texture, never competition for the stage. */
/* v12.32 (the user's ask): the crest watermarks LEFT their mid-card slots for
   the card's BOTTOM CORNERS \u2014 the first team's badge anchors to the
   bottom-LEFT corner, the second team's to the bottom-RIGHT. Each circle's
   center sits 88px inward from its corner on BOTH axes (27.5% of its own
   320px diameter), so the top + inner-facing arc stay visible while the
   rest of the circle extends 72px past the side edge and the bottom edge;
   the layer's overflow:hidden (above) clips those overhangs away \u2014 the
   full circle reads as a partial crescent hugging each corner. The offsets
   are PHYSICAL left/right (the wireframe's corners line up with the
   screen's edges, not with text direction \u2014 checked: nothing else in this
   container relies on overflowing it; the layer holds only these two imgs
   + the scrim, and the card itself already clips at its 16px radius). */
/* v12.46-herofix: the watermark images are SWAPPED to match the team
   positions. In RTL (Persian), the first .side (home) is on the RIGHT
   (inline-start), so the first watermark (home crest) must also be on
   the RIGHT. Was using inset-inline-end (LEFT in RTL) → was swapped.
   Now:
   - img:first-child (home crest) → inset-inline-start (RIGHT in RTL, LEFT in LTR)
   - img:last-child (away crest) → inset-inline-end (LEFT in RTL, RIGHT in LTR)
   This matches the team logos' positions in both directions. */
.hero-wm img{position:absolute;width:320px;height:320px;object-fit:contain;opacity:.157;transform:none}
.hero-wm img:first-child{inset-inline-start:-72px;bottom:-72px;top:auto}
.hero-wm img:last-child{inset-inline-end:-72px;bottom:-72px;top:auto}
.hero-wm::after{content:"";position:absolute;inset:0;background:radial-gradient(58% 62% at 50% 58%,rgba(2,6,23,.32),transparent 72%)}
[data-theme="light"] .hero-wm::after{background:radial-gradient(58% 62% at 50% 58%,rgba(248,250,252,.38),transparent 72%)}
[data-theme="light"] .hero-wm img{opacity:.157}
[data-theme="light"] .hero-wm{filter:none}
.bighero .team{text-shadow:0 1px 12px rgba(2,6,23,.65)}
[data-theme="light"] .bighero .team{text-shadow:0 1px 12px rgba(255,255,255,.8)}
/* v12.30 (the user's phone report \u2014 the hero header read "distracting and
   messy"): the crest watermarks are a PC atmosphere; on a ~350px phone
   card the two 210px ghosts sat right behind the face-off names and the
   big time number and fought them for attention. The whole layer is OFF
   below 601px now (the old phone-size rule is retired with it); the flat
   navy veil + blur is the phone stage's only backdrop. PC keeps the
   atmospheric .157 pair untouched. */
@media (max-width:600px){.hero-wm{display:none}}
/* v12.23: the face-off entrance slides each side in from its own edge \u2014 the
   \xB134px overshoot once briefly widened the page on every hero re-render
   (another heartbeat-scrollbar source); the row now clips it, and the \u22EF
   share popover (in the info line, OUTSIDE .match) is unaffected. */
.bighero .match{overflow:hidden;gap:24px}
/* escalation ladder: soon (≤24h) → blue; final (≤60min) & live → red alarm.
   v12.x-blue-urgent-border (the user's ask): the 'soon' border was amber
   (#fbbf24/.5) — the user said 'remove the yellow/green-ish border around
   the section, instead use a blue one'. Changed to the site's --accent
   blue (#2563eb/.55) for the 'soon' state. The final/live red alarm stays
   (that's the urgency escalation, not a color preference). */
#bigHeroCard[data-urgent="soon"]{border-color:rgba(30,58,138,.6);border-width:2px}
#bigHeroCard[data-urgent="soon"]::before{box-shadow:inset 0 0 70px rgba(245,158,11,.09);animation-duration:1.7s}
.herowrap[data-urgent="soon"]::before{box-shadow:0 0 46px rgba(245,158,11,.26);animation-duration:1.7s}
#bigHeroCard[data-urgent="soon"] .hero-fx::after{animation-duration:4.2s}
#bigHeroCard[data-urgent="soon"] .bigbar-clock{color:#60a5fa}
#bigHeroCard[data-urgent="soon"] .hero-fx i{background:radial-gradient(circle,rgba(253,224,71,.95),rgba(245,158,11,0) 70%)}
[data-theme="light"] #bigHeroCard[data-urgent="soon"] .bigbar-clock{color:#2563eb}
#bigHeroCard[data-urgent="final"],#bigHeroCard[data-urgent="live"]{border-color:rgba(239,68,68,.55)}
#bigHeroCard[data-urgent="final"]::before,#bigHeroCard[data-urgent="live"]::before{box-shadow:inset 0 0 84px rgba(239,68,68,.11)}
.herowrap[data-urgent="final"]::before,.herowrap[data-urgent="live"]::before{box-shadow:0 0 52px rgba(239,68,68,.28)}
#bigHeroCard[data-urgent="final"] .hero-fx::after{animation-duration:3s}
#bigHeroCard[data-urgent="final"]::before{animation-duration:1.1s}
.herowrap[data-urgent="final"]::before{animation-duration:1.1s}
#bigHeroCard[data-urgent="live"]::before{animation-duration:.9s}
.herowrap[data-urgent="live"]::before{animation-duration:.9s}
#bigHeroCard[data-urgent="live"] .hero-fx::after{animation-duration:2.2s}
#bigHeroCard[data-urgent="final"] .bigbar-clock,#bigHeroCard[data-urgent="live"] .bigbar-clock{color:#f87171}
#bigHeroCard[data-urgent="final"] .hero-fx i,#bigHeroCard[data-urgent="live"] .hero-fx i{background:radial-gradient(circle,rgba(252,165,165,.95),rgba(239,68,68,0) 70%)}
#bigHeroCard[data-urgent="final"] #bigbarLabel{animation:hero-label .9s ease-in-out infinite}
@keyframes hero-label{0%,100%{opacity:1}50%{opacity:.55}}
[data-theme="light"] #bigHeroCard[data-urgent="final"] .bigbar-clock,[data-theme="light"] #bigHeroCard[data-urgent="live"] .bigbar-clock{color:#dc2626}
/* v12.27 (review item 10): the LIVE chip rides the SUCCESS tokens (soft fill,
   ink text, line border) \u2014 the theme-aware pair replaces the light override. */
.livechip{display:inline-flex;align-items:center;gap:6px;background:var(--t-success-soft);color:var(--t-success-ink);border:1px solid var(--t-success-line);border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700;margin:0 6px;vertical-align:middle}
.livechip .dot{width:8px;height:8px;border-radius:50%;background:var(--badge-live);animation:live-beep 1.1s ease-in-out infinite}
/* v12.x-live-lottie: the Live.lottie animation (a pulsing "LIVE" badge)
   replaces the CSS-animated dot + "در حال برگزاری" text in the livechip
   and the #liveCard h2 heading. The <dotlottie-player> element renders
   the .lottie file (served from /Live.lottie). Sized to match the chip:
   40x16px in the livechip, 56x22px in the h2 heading. The autoplay +
   loop attributes keep the animation running. The background stays
   transparent so it blends into the chip / heading plate. */
dotlottie-player.live-lottie{display:inline-block;width:40px;height:16px;vertical-align:middle}
.livechip dotlottie-player.live-lottie{width:40px;height:16px}
#liveCard h2 dotlottie-player.live-lottie{width:56px;height:22px;vertical-align:middle;margin-inline-end:4px}
@keyframes live-beep{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.35);transform:scale(1)}50%{box-shadow:0 0 0 6px rgba(34,197,94,0);transform:scale(1.15)}}
/* v12.44-livepolish: the liveCard heading carries a BREATHING GREEN LIGHT
   — a 12px green dot that pulses softly (opacity + box-shadow + scale),
   conveying "these games are now playing" at a glance. Uses a slower 2s
   rhythm (vs the 1.1s livechip beep) so it reads as a calm breath, not
   an alarm. The 🔴 emoji in the heading is replaced by this dot via JS
   (renderLive strips the emoji and injects the .live-breath span). */
.live-breath{display:inline-block;width:12px;height:12px;border-radius:50%;background:#22c555;box-shadow:0 0 0 0 rgba(34,197,94,.5);animation:live-breath 2s ease-in-out infinite;vertical-align:-1px;margin-inline-end:8px;flex-shrink:0}
@keyframes live-breath{0%,100%{opacity:.5;box-shadow:0 0 0 0 rgba(34,197,94,.4);transform:scale(.85)}50%{opacity:1;box-shadow:0 0 12px 4px rgba(34,197,94,.25);transform:scale(1.15)}}
#liveCard h2{display:flex;align-items:center}
/* v12.45-compact-live: compact the liveCard's spotitems ~50% — smaller logos
   (28px vs 51px), tighter padding, hide the share button + the info line
   (the league badge is the only context needed for live matches; the
   share + full info line is overkill when there are 3-20 live matches
   stacked). The score + team names are the essential data. */
#liveCard .spotitem{padding:1px 0;border-bottom:1px solid var(--border)}
#liveCard .spotitem:last-child{border-bottom:none}
#liveCard .match{padding:2px 0;gap:6px}
#liveCard .logo{width:28px;height:28px;font-size:12px;border-radius:50%}
#liveCard .logo img{width:100%;height:100%;object-fit:contain}
#liveCard .team{font-size:12px;font-weight:700}
#liveCard .kick{flex:0 0 72px;gap:1px}
#liveCard .kick .score{font-size:14px;flex:0 0 auto}
#liveCard .uclspot-info{display:none}
#liveCard .sharewrap{display:none}
.bighero .sharewrap{display:none}
.lmin{display:inline-block;background:rgba(37,99,235,.12);color:var(--accent);border-radius:6px;padding:1px 7px;font-size:12px;font-weight:700;vertical-align:middle}
[data-theme="light"] .lmin{background:rgba(37,99,235,.1)}
.scorers{flex:1 1 100%;margin-top:8px;display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--muted)}
.scorers .srow{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
/* v12.11: the .match.derby box rule is RETIRED \u2014 derby rows (Man Utd\u2013City,
   Atl\xE9tico\u2013Real, Marseille\u2013PSG \u2026) carried an amber border + amber\u2192violet
   gradient while equally big non-derbies (Liverpool\u2013Man City, Roma\u2013Inter)
   stayed plain. Per the user's ask every match row is now IDENTICAL: no
   border, no gradient, no glow. The "derby" class stays in the DOM (inert)
   and the \xAB\u062F\u0631\u0628\u06CC\xBB badge pill in the info row carries the label. */
/* v12.38-hero: Fix 5 — semantic pill tokens. The derby badge now uses the
   --pill-hype-* token (was a one-off gradient; formalized). The league badge
   (.comp) and the percentage badge (.bigbar-pct) use the --pill-neutral-*
   token. The CTA button + the hero's kickoff-time pill use --pill-primary-*.
   A shared token system lets users learn "this color always means this kind
   of information" instead of decoding each badge individually. */
.derbybadge{display:inline-flex;align-items:center;gap:4px;background:var(--pill-hype-bg);color:var(--pill-hype-ink);border:1px solid var(--pill-hype-line);border-radius:999px;padding:2px 10px;font-size:11.5px;font-weight:800;margin-inline-start:6px;vertical-align:middle}
.bigcard{border:2px solid rgba(52,211,153,.38);border-radius:16px;padding:14px 16px 6px;margin:14px 0;background:radial-gradient(120% 160% at 15% 0%,rgba(16,185,129,.20),transparent 55%),linear-gradient(135deg,#064e3b,#065f46 55%,#047857);box-shadow:0 0 10px rgba(5,150,105,.16),0 8px 26px rgba(0,0,0,.35),var(--glass-shadow),inset 0 1px 0 rgba(255,255,255,.16);color:#fff}
.bigcard .match{border-bottom-color:rgba(255,255,255,.16)}
.bigcard .match:hover{background:rgba(255,255,255,.08)}
.bigcard .team,.bigcard .info{color:#ecfdf5}
.bigcard .comp{background:rgba(255,255,255,.16);color:#fff}
.bigcard .countdown{background:rgba(255,255,255,.2);color:#fff}
.bigcard .venue{background:rgba(255,255,255,.14);color:#fff}
.bigcard .logo{background:rgba(0,0,0,.28);border-color:rgba(255,255,255,.35)}
[data-theme="light"] .bigcard{background:linear-gradient(135deg,#ecfdf5,#d1fae5 55%,#a7f3d0);border-color:rgba(5,150,105,.42);color:#064e3b;box-shadow:0 8px 24px rgba(5,150,105,.16),var(--glass-shadow),inset 0 1px 0 rgba(255,255,255,.85)}
[data-theme="light"] .bigcard .match{border-bottom-color:rgba(5,46,22,.14)}
[data-theme="light"] .bigcard .match:hover{background:rgba(255,255,255,.4)}
[data-theme="light"] .bigcard .team,[data-theme="light"] .bigcard .info{color:#064e3b}
[data-theme="light"] .bigcard .comp{background:rgba(5,46,22,.14);color:#052e16}
[data-theme="light"] .bigcard .countdown{background:rgba(5,46,22,.16);color:#052e16}
[data-theme="light"] .bigcard .venue{background:rgba(5,46,22,.12);color:#052e16}
[data-theme="light"] .bigcard .logo{background:rgba(255,255,255,.55);border-color:rgba(5,46,22,.18)}
.bigcard-head{font-size:13px;font-weight:800;color:var(--accent);margin-bottom:4px}
.bigcard .bigcard-head{color:#a7f3d0}
[data-theme="light"] .bigcard-head{color:var(--accent-strong)}
[data-theme="light"] .bigcard .bigcard-head{color:#047857}
/* v12.12: the .msec section rules are retired with renderSections (the
   \xAB\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648\xBB list card is gone; the boxes are the presentation). */
.card{background:var(--glass);-webkit-backdrop-filter:blur(16px) saturate(1.4);backdrop-filter:blur(16px) saturate(1.4);border:1px solid var(--glass-border);border-radius:16px;padding:18px;margin:14px 0;box-shadow:var(--glass-shadow),inset 0 1px 0 var(--glass-hi)}
/* v12.11: the UCL gold chrome is RETIRED too \u2014 .uclcard (UCL list) and
   .uclspot (next big UCL match) were the last golden boxes around matches;
   they are plain .card sections now, uniform with everything else. The
   container classes stay in the HTML (inert hooks + reduced-transparency
   selector) and .uclspot-logo/info/wait below remain as layout rules. */
.uclspot-logo{width:72px;height:72px;object-fit:contain;display:block;margin:4px auto 12px;filter:drop-shadow(0 2px 8px rgba(0,0,0,.35))}
.uclspot-info{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;font-size:12.5px;color:var(--muted);text-align:center}
.uclspot-wait{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 0 8px}
/* v12.21 (the user's ask): the UCL box is DEDICATED to the Champions League \u2014
   it now carries the UCL brand: the starball mark on a white chip inside a
   navy gradient header plate, a deep-navy glass body with a faint star-tile
   watermark and a UCL-blue border, so it reads instantly as the
   competition's own box and nothing else on the page looks like it. The UCL
   standings card shares the plate + border + watermark on the standard glass
   body. Light theme keeps the navy identity (light navy-tinted body).
   Brand colors are literals, the same way .bigcard carries its greens. */
/* v12.x-matchday-pos (the user's ask): the matchday chip ('هفته ۱') must be
   flush to the FAR LEFT edge of the UCL header (the user drew a black
   rectangle at the far left to show the desired position). Previously
   margin-inline-start:auto left a ~72px gap because flex gap:10px
   interfered with the auto-margin free-space absorption. Switched to
   justify-content:space-between — the first DOM child (logo) sits at the
   inline-start (RIGHT in RTL), the last DOM child (matchday chip) sits at
   the inline-end (LEFT in RTL, flush to the edge), and the title text
   floats in the center between them. The margin-inline-start:auto on the
   chip is retired (space-between handles the distribution). */
.uclh2{display:flex;align-items:center;gap:10px}
/* v12.x-ucl-title-next-to-logo: the title text sits NEXT TO the starball
   logo (at the inline-start), NOT in the center. The title span gets
   margin-inline-end:auto so ALL free space goes after the title — this
   groups the logo + title together at the start and pushes the matchday
   chip (.ucl-md) to the far inline-end. Removed justify-content:space-
   between (it conflicted with the auto-margin approach — space-between
   distributes free space between all items, keeping the title in the
   center). flex:0 1 auto so the title doesn't stretch. */
.uclh2 > span[data-i]{text-align:end;flex:0 1 auto;min-width:0;margin-inline-end:auto}
.ucl-logo{flex-shrink:0;width:34px;height:34px;border-radius:50%;background:#fff;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(2,6,23,.45),inset 0 0 0 1px rgba(14,32,88,.10)}
.ucl-logo svg{width:29px;height:29px;display:block}
.ucl-logo.sm{width:26px;height:26px}
.ucl-logo.sm svg{width:22px;height:22px}
.uclspot-ball{width:64px;height:64px;margin:0 auto;filter:drop-shadow(0 4px 14px rgba(0,0,0,.45))}
.uclspot-ball svg{width:100%;height:100%;display:block}
#uclSpotCard h2{font-size:19px;color:#fff;background:linear-gradient(135deg,#0e2058,#1b3480);border-color:rgba(126,161,245,.30);border-inline-start-color:#7ea1f5}
.uclcard h2{color:#fff;background:linear-gradient(135deg,#0e2058,#1b3480);border-color:rgba(126,161,245,.30);border-inline-start-color:#7ea1f5}
#uclSpotCard{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0%200%2048%2048'%3E%3Cpath fill='%23ffffff' fill-opacity='.028' d='M24%2015L26%2021.2%2032.6%2021.2%2027.3%2025.1%2029.3%2031.3%2024%2027.4%2018.7%2031.3%2020.7%2025.1%2015.4%2021.2%2022%2021.2Z'/%3E%3C/svg%3E"),linear-gradient(168deg,rgba(27,52,128,.72),rgba(13,28,71,.80));background-repeat:repeat,no-repeat;background-size:54px 54px,100% 100%;border-color:rgba(126,161,245,.26)}
.uclcard{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0%200%2048%2048'%3E%3Cpath fill='%23ffffff' fill-opacity='.028' d='M24%2015L26%2021.2%2032.6%2021.2%2027.3%2025.1%2029.3%2031.3%2024%2027.4%2018.7%2031.3%2020.7%2025.1%2015.4%2021.2%2022%2021.2Z'/%3E%3C/svg%3E");background-repeat:repeat;background-size:54px 54px;border-color:rgba(126,161,245,.22)}
[data-theme="light"] #uclSpotCard{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0%200%2048%2048'%3E%3Cpath fill='%230e2058' fill-opacity='.04' d='M24%2015L26%2021.2%2032.6%2021.2%2027.3%2025.1%2029.3%2031.3%2024%2027.4%2018.7%2031.3%2020.7%2025.1%2015.4%2021.2%2022%2021.2Z'/%3E%3C/svg%3E"),linear-gradient(168deg,rgba(226,234,255,.94),rgba(201,216,248,.90));border-color:rgba(23,42,105,.22)}
[data-theme="light"] .uclcard{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0%200%2048%2048'%3E%3Cpath fill='%230e2058' fill-opacity='.04' d='M24%2015L26%2021.2%2032.6%2021.2%2027.3%2025.1%2029.3%2031.3%2024%2027.4%2018.7%2031.3%2020.7%2025.1%2015.4%2021.2%2022%2021.2Z'/%3E%3C/svg%3E");border-color:rgba(23,42,105,.16)}
/* v12.35-uclfix: light-mode override for the UCL h2 plates. The base
   [data-theme="light"] h2 rule (specificity 0,1,1) was overriding .uclcard h2
   and #uclSpotCard h2 (also 0,1,1) because it came later in the cascade —
   replacing the navy gradient with rgba(15,23,42,.04) (near-white) while
   keeping color:#fff, producing white-on-near-white unreadable text. These
   rules have specificity (0,2,1) so they WIN.
   v12.x-light-ucl (the user's ask): in LIGHT mode the dark navy
   (#0e2058 → #1b3480) background acts as a CTA — it grabs attention from
   the hero card. Switched to a LIGHTER blue gradient (#dbeafe → #bfdbfe,
   blue-100 → blue-200) with dark navy TEXT (#0f172a) so the UCL headers
   read as soft brand-tinted plates, not loud CTAs. Dark mode keeps the
   navy gradient + white text. */
[data-theme="light"] .uclcard h2,[data-theme="light"] #uclSpotCard h2{color:#0f172a;background:linear-gradient(135deg,#dbeafe,#bfdbfe);border-color:rgba(37,99,235,.22);border-inline-start-color:#3b82f6}
/* v12.11: the .topspot golden box chrome is RETIRED \u2014 the hero card and the
   big-matches box are plain .card sections now, uniform with every other
   card on the page (the \u{1F525} heading carries the "big" signal; per the user
   no match or box gets a special border). No element carries the class
   anymore \u2014 the rules and glow keyframes below were removed with it. */
/* v12.7/v12.8 multi-match TOP BOX: up to six TRUE big matches (strict kickoff
   order \u2014 closest on top) stacked in the card \u2014 .spotitem wraps one entry
   (teams row + info + share). v12.25: the entry is a boxed unit (border +
   gap below separates it from the next entry \u2014 see the match-box rules). */
.spotitem .match{margin:0 0 6px}
/* v12.17: \xAB\u062F\u0631 \u0627\u06CC\u0646 \u0647\u0641\u062A\u0647\xBB expired games \u2014 kickoff passed \u2192 the entry renders
   "turned off": dimmed + slightly desaturated (score/time still readable,
   but clearly no longer ahead). Live entries are NEVER past. */
.spotitem.past{opacity:.48;filter:saturate(.55)}
.spotitem.past:hover{opacity:.72}
.spotitem.past .match{animation:none}
.spotitem.past .logo{filter:grayscale(.5)}
.spotitem.past .score{opacity:.85}
/* \u231B expired chip (kickoff passed, score not in payload yet) \u2014 muted, flat */
.wkdone{color:var(--muted);font-weight:700;font-size:11.5px;background:var(--t-neutral-soft);border-radius:999px;padding:3px 10px;display:inline-block;margin-left:6px}
.ucl-head{display:flex;align-items:center;gap:8px;font-weight:800;font-size:14.5px;margin-bottom:8px}
.ucl-emblem{width:26px;height:26px;border-radius:6px;flex-shrink:0}
/* v12.35-uclfix: the matchday chip now lives INSIDE the h2.uclh2 (same row as
   the title), not in a separate .ucl-head div below. White text on the navy
   gradient h2 plate, with a semi-transparent white pill background for
   visual separation. */
/* v12.50: the matchday chip sits at the END of the h2 (after the logo +
   title), pushed to the far edge. v12.x-matchday-pos: the push is now via
   justify-content:space-between on the .uclh2 (see above) instead of
   margin-inline-start:auto (which left a gap). The order is: [logo]
   [title] ... [matchday]. */
.uclh2 .ucl-md{font-size:12px;color:rgba(255,255,255,.92);font-weight:700;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:2px 10px;flex-shrink:0;white-space:nowrap;margin-left:0;margin-inline-end:0}
/* v12.x-light-ucl: the matchday chip needs dark ink + a darker pill on the
   lighter blue h2 plate in light mode (the white-on-translucent-white pill
   was designed for the navy plate). */
[data-theme="light"] .uclh2 .ucl-md{color:#1e3a8a;background:rgba(37,99,235,.12);border-color:rgba(37,99,235,.28)}
.ucl-md{margin-left:auto;font-size:11.5px;color:var(--muted);font-weight:600}
.ucl-stand-wrap{position:relative;margin-top:10px}
/* v12.27 (review item 2): the star tiles sit strictly BEHIND the table now \u2014
   the .ucl-stand container's body is opaque enough (was rgba(30,41,59,.45))
   that the watermark cannot read through the rows, and the tiles themselves
   were dimmed another ~45% (.05\u2192.028 dark, .07\u2192.04 light). The star is
   purely decorative (no favorite-league toggle behind it), so it stays a
   background layer \u2014 the functional UCL brand is the small .ucl-logo chip in
   the headings. */
.ucl-stand{max-height:360px;overflow-y:auto;border:1px solid var(--border);border-radius:12px;padding:6px 10px;background:rgba(15,23,42,.72)}
[data-theme="light"] .ucl-stand{background:rgba(248,250,252,.78)}
.ucl-stand-wrap .stnot-overlay{top:6px;left:6px;right:6px;bottom:6px;background:rgba(2,6,23,.6)}
[data-theme="light"] .ucl-stand-wrap .stnot-overlay{background:rgba(248,250,252,.7)}
/* v12.21 (the user's ask): the section titles were 15px plain text \u2014 easy
   to skim past and "not clear what they are about at first glance". Every
   card h2 is now a SECTION PLATE: bigger and bolder on its own tinted
   background with a 4px accent edge, so each box announces itself. The two
   flagship headers run one size larger with themed plates \u2014 hot amber for
   the big-matches box, UCL navy + starball for the Champions League boxes
   (rules in the UCL block above). */
h2{font-size:17px;font-weight:800;line-height:1.55;letter-spacing:-.005em;margin:0 0 14px;padding:9px 14px;background:rgba(148,163,184,.09);border:1px solid rgba(148,163,184,.15);border-inline-start:4px solid var(--accent);border-radius:12px}
[data-theme="light"] h2{background:rgba(15,23,42,.04);border-color:rgba(15,23,42,.09)}
#topspotCard h2{font-size:19px;background:rgba(59,95,173,.12);border-color:rgba(59,95,173,.3);border-inline-start-color:#3b5fad}
[data-theme="light"] #topspotCard h2{background:rgba(59,95,173,.06);border-color:rgba(59,95,173,.2)}
/* v12.25 (the user's ask \u2014 "alignment, alignment alignment"): every
   fixture is ONE self-contained MATCH BOX. The old hairline divider sat
   BETWEEN a row's teams and its OWN info line \u2014 the kickoff time read
   as if it belonged to the row BELOW (the user's exact misattribution
   report: "sometimes you incorrectly think the game match time belong
   to a row, but actually it belongs to upper row"). The divider is
   retired: .mrow/.spotitem are real bordered boxes \u2014 teams row + info
   chips live INSIDE the box, boxes are separated by a gap, and hover
   highlights the whole unit. Nothing can leak across a row boundary
   anymore:
   \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
   \u2502 A        [ match info ]        B \u2502
   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
   \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
   \u2502 C        [ match info ]        D \u2502
   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518 */
.mrow,.spotitem{position:relative;border:1px solid var(--border);border-radius:14px;padding:10px 12px;margin:0 0 10px;background:var(--rowsurf);transition:background .15s,border-color .15s;display:flex;flex-direction:column;justify-content:center}
.mrow:last-child,.spotitem:last-child{margin-bottom:0}
.mrow:hover,.spotitem:hover{filter:brightness(1.07);border-color:rgba(37,99,235,.4)}
/* v12.47-nospotbox: the hero's .spotitem is STRIPPED of its container styling
   — no border, no background, no border-radius, no padding. The hero card
   itself is the container; a bordered box inside it was "a container inside
   a container" (visual noise, the user's ask). The match row + info line
   + share button stay — just the box chrome is gone. */
.bighero .spotitem{border:none;background:none;border-radius:0;padding:0;margin:0}
.match{display:flex;align-items:center;gap:12px;padding:2px 0;border-radius:10px;animation:rise .35s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(var(--i,0)*40ms)}
.stable .match{animation:none}
/* v12.23 (the user's ask \u2014 "everything must be aligned"): both sides share
   the row EXACTLY 50/50 (flex-basis 0, was auto \u2014 content-width bases made
   the score's x position wander per row); the score below is a FIXED
   CENTERED SLOT, so every scored row on the page carries its result at the
   same x line and team columns line up across rows and cards. */
.side{display:flex;align-items:center;gap:8px;flex:1 1 0;min-width:0;flex-wrap:nowrap}
.side .team{flex:1;min-width:0}
.side.away .team{text-align:end}
/* v12.18: PC crests +35% (38px \u2192 51px, the user's ask) \u2014 the monogram
   fallback scales with the circle. Phones keep their own 46px size below. */
.logo{width:41px;height:41px;border-radius:50%;background:var(--bg);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:18px;overflow:hidden;flex-shrink:0}
.logo img{width:100%;height:100%;object-fit:contain}
.team{flex:1;font-weight:700;font-size:14.5px}
/* v12.18: the "vs" slot is GONE for unplayed matches \u2014 first the \u{1F19A} emoji
   (mis-aligned noise), then the hairline divider (still noise, per the user).
   v12.25: unplayed rows carry the KICKOFF TIME in the center slot (.kick);
   finished/live rows keep the score element in the middle (.score). */
.score{font-weight:800;font-size:17px;color:var(--score);flex:0 0 92px;text-align:center;white-space:nowrap;font-variant-numeric:tabular-nums}
/* v12.44-livepolish: when the .score is inside .kick (column layout), the
   92px flex-basis would apply to the HEIGHT, stretching the score to 92px
   tall and misaligning it with the team names. Override: inside .kick, the
   score gets flex:0 0 auto so it's only as tall as its content, and the
   .kick's justify-content:center vertically centers it against the sides. */
.kick .score{flex:0 0 auto}
/* v12.27 (review item 6): the WINNER's digit is unmistakable \u2014 the winning
   number renders as a <b> (weight 900 + a soft success glow) while the
   losing number dims to .55; a draw keeps both plain. The pairing is now
   READ, not inferred. */
.score b{font-weight:900;text-shadow:0 0 12px rgba(74,222,128,.45)}
[data-theme="light"] .score b{text-shadow:0 0 10px rgba(21,128,61,.25)}
.score .lose{font-weight:600;opacity:.55}
.score .sep{opacity:.5;font-weight:600}
/* v12.25 (the user's ask): the kickoff TIME owns the CENTER slot of every
   unplayed row \u2014 "A [match info] B" \u2014 on the exact x line the score takes
   on live/finished rows (both slots 92px PC / 80px phones, so team columns
   align across EVERY fixture on the page). The time can never be misread
   as another row's: it sits between its own two teams, inside its own
   box. */
/* v12.40-datebelow: the .kick slot is now a COLUMN for every spotitem
   (was horizontal row) — the time chip on top, the .kickdate below.
   flex-direction:column + gap:4px stacks them cleanly. The hero keeps
   its own larger gap (6px) via the .bighero .kick override below. */
/* v12.61: the .kick column (time over date) was centered with the .side's
   center, but the TIME (top element) appeared higher than the team name.
   Added a margin-top of 7px (~half the kickdate height) to push the .kick
   down so the countdown time aligns with the team name's vertical level. */
.kick{flex:0 0 92px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-width:0;margin-top:7px}
.kick .countdown{margin:0;font-size:13px;padding:4px 12px}
/* v12.28 (the user's ask \u2014 "<span class="countdown">\u{1F552} \u06F1\u06F9:\u06F0\u06F0</span> this
   must be bigger for next big upcoming match. make it considerably
   larger"): the hero's kickoff chip is the NEXT BIG MATCH's headline
   number. Scoped to the hero card ONLY (every other box keeps the 13px
   chip): the hero's center slot auto-sizes \u2014 the chip dictates its own
   width, the two sides flex around it \u2014 and the chip jumps to DISPLAY
   size: 24px PC / 20px phones, weight 800, tabular digits, riding its own
   soft plate + hairline ring + drop shadow so it pops off the video stage
   while the countdown color keeps the system hue. The hero's LIVE score
   takes the same display treatment (one headline system per card), and
   the hero's info line (comp logo + derby badge) runs one step larger
   under it. v12.31: the share \u22EF to the box's top corner. v12.32: the
   hero's date line moved AGAIN \u2014 out of the navy bar, UNDER the big time
   chip: the .kick slot becomes a COLUMN [time chip over .kickdate
   \u2014 "weekday day month", 12.5px PC, one step smaller per the user's
   sketch "19 / weekday 22 month"], so the time and its date read as ONE
   centered stack between the two clubs. */
.bighero .kick{flex:0 0 auto;flex-direction:column;gap:6px;margin-top:20px;align-self:center}
/* v12.32: the date line under the hero's time chip \u2014 plain rows never
   carry it (their weekday/date stays in the info line); the hero's stack
   is [big time / smaller date]. */
/* v12.41-datecolor: the .kickdate now uses the same --countdown color as
   the .countdown time chip above it (was var(--text) — black, while the
   time was blue; the user's ask: 'must be same color'). Both the time and
   its date now read in the same blue hue, visually unified. */
.kickdate{font-size:11px;font-weight:700;color:var(--countdown);text-align:center;font-variant-numeric:tabular-nums;white-space:nowrap}
.bighero .kickdate{font-size:18px;font-weight:800;text-shadow:0 1px 10px rgba(2,6,23,.55)}
[data-theme="light"] .bighero .kickdate{text-shadow:0 1px 8px rgba(248,250,252,.9)}
/* v12.38-hero: Fix 2 + Fix 5 — the hero's kickoff-time pill is bumped to
   28px/900 PC (was 24px/800) so it's clearly the largest, most prominent
   number on the card. It now uses the --pill-primary-* token (blue bg +
   white ink) matching the CTA button, establishing a semantic color
   system: primary = action/headline, hype = derby, neutral = info. The
   mid-band (601-900px) scales to 20px, phones keep 18px. */
.bighero .kick .countdown{font-size:28px;font-weight:900;padding:8px 22px;border-radius:14px;line-height:1;font-variant-numeric:tabular-nums;background:var(--pill-primary-bg);color:var(--pill-primary-ink);box-shadow:inset 0 0 0 1px var(--pill-primary-line),0 6px 24px rgba(37,99,235,.32);text-shadow:0 1px 14px rgba(2,6,23,.5);display:flex;align-items:center;justify-content:center}
[data-theme="light"] .bighero .kick .countdown{box-shadow:inset 0 0 0 1px var(--pill-primary-line),0 6px 20px rgba(37,99,235,.22);text-shadow:0 1px 10px rgba(255,255,255,.5)}
.bighero .score{font-size:24px;flex:0 0 auto;padding:0 8px}
.bighero .uclspot-info{font-size:13.5px}
.bighero .info{font-size:13.5px}
/* v12.28: the NARROW-PC band (601\u2013900px) \u2014 the 2x hero crests (102px) plus
   the (now big) time chip squeezed the name columns to ~50\u201399px there, so
   names like Manchester United wrapped even before this release. Mid-band
   scale: crest 56px, chip 18px, hero names 13px \u2192 each name keeps ~125px,
   one line (measured: "Manchester United" \u2248114px). \u2265901px the full poster
   treatment (102px crest + 24px chip) has room again. */
@media (min-width:601px) and (max-width:900px){
/* v12.x-hero-bigger: hero logos 72px in the mid-band (vs topspot 64px)
   so the featured match stays bigger than the list below. Was 56px
   (smaller than the topspot's 64px — the reverse of the hierarchy). */
.bighero .logo{width:72px;height:72px;font-size:32px}
.bighero .kick .countdown{font-size:20px;padding:6px 16px;border-radius:12px}
.bighero .score{font-size:20px}
.bighero .team{font-size:13px}
}
/* v12.x-kick-5px-pc: move the time box 5px further down on PC (≥901px).
   The base margin-top is 20px (applies to all viewports). On desktop
   only, bump to 25px (+5px) per the user's ask. Mobile + mid-band
   keep 20px. */
@media (min-width:901px){.bighero .kick{margin-top:25px}}
/* v12.23 (the user's ask): the finished card's info line now matches the
   spot boxes' .uclspot-info exactly \u2014 one centered chip line under every
   match row on the page (same flex/wrap/gap/font), so all cards read as
   one aligned system instead of two different row styles. */
.info{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;font-size:12.5px;color:var(--muted);margin-top:6px;text-align:center}
/* v12.38-hero: Fix 5 — .comp (league badge) now uses the --pill-neutral-*
   token, matching the percentage badge. Was var(--badge-league) (solid
   grey); now the soft neutral bg + line + ink for a consistent system. */
.comp{display:inline-block;background:var(--pill-neutral-bg);color:var(--pill-neutral-ink);border:1px solid var(--pill-neutral-line);border-radius:999px;padding:3px 10px;font-size:11px;margin-inline-start:6px;font-weight:600}
.complogo{width:14px;height:14px;border-radius:3px;vertical-align:-2.5px;margin-inline-end:5px}
.countdown{color:var(--countdown);font-weight:700;font-size:11.5px;background:var(--countdown-bg);border-radius:999px;padding:3px 10px;display:inline-block;margin-left:6px}
.venue{display:inline-block;background:var(--t-neutral-soft);border-radius:999px;padding:3px 10px;font-size:11px;margin-left:6px;font-weight:600;color:var(--text)}
/* v12.13: the standings grid is EXPLICIT, per the user's ask \u2014 2 columns on
   phones, 3 columns everywhere else (the page caps at 760px, so 3 boxes/row
   at ~233px each, two tidy rows for the 6 leagues). The old auto-fit
   minmax(150px,1fr) packed FOUR boxes per row on desktop. */
.grid4{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
@media (min-width:601px){.grid4{grid-template-columns:repeat(3,minmax(0,1fr))}}
.stbox{position:relative;background:var(--glass);-webkit-backdrop-filter:blur(12px) saturate(1.3);backdrop-filter:blur(12px) saturate(1.3);border:1px solid var(--glass-border);border-radius:12px;padding:10px 12px;box-shadow:var(--glass-shadow),inset 0 1px 0 var(--glass-hi);min-width:0}
.stbox-head{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;margin-bottom:6px;min-width:0}
.stbox-head img{width:20px;height:20px;border-radius:3px;flex-shrink:0}
/* v12.37-pclogo: on PC (≥1440px, the wide-rail layout) the league emblem
   images in the standings card headers are doubled (20px → 40px = +100%,
   the user's ask). Phones + tablets keep the 20px size. */
@media (min-width:1440px){.stbox-head img{width:40px;height:40px;border-radius:5px}}
.strow{display:flex;align-items:center;gap:6px;font-size:11.5px;padding:2.5px 0;border-bottom:1px dashed var(--border)}
.strow:last-child{border-bottom:none}
/* v12.27 (review item 4): the compact boxes carry a COLUMN HEADER for the
   points number (\xAB\u0627\u0645\u062A\u06CC\u0627\u0632\xBB / \xABPts\xBB) \u2014 the full UCL table already labels every
   column; the same data type is no longer unlabeled in the mini grids. The
   header row rides the same 6px-gap flex line the rows use, so the label
   sits exactly over the numbers column (stpts gets a fixed 34px end-aligned
   slot to lock the pair). */
.sthead{display:flex;align-items:center;gap:6px;padding:0 2px 3px;border-bottom:1px solid var(--border)}
.sthead-fill{flex:1}
.sthead-p{font-size:9.5px;font-weight:700;color:var(--muted);min-width:34px;text-align:end;flex-shrink:0}
.stpos{width:16px;text-align:center;font-weight:800;color:var(--muted);flex-shrink:0}
.stpos.top3{color:var(--accent)}
/* v12.x-bold-top1: the leader (position 1) of each league is bolded —
   the entire row (position number + team name + points) gets a heavier
   font-weight so the table leader stands out at a glance. The font-size
   is also 2 units larger (11.5px → 13.5px) for the leader's name. */
.strow.top1{font-weight:800;font-size:13.5px}
.strow.top1 .stname{font-weight:800;font-size:13.5px}
.strow.top1 .stpts{font-weight:800}
.strow.top1 .stpos{font-weight:800}
.stname{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* v12.18: UCL rows carry a ROUND club crest (the user's ask) \u2014 same circle
   language as the match rows, miniaturized for the dense table. */
.stname.haslogo{display:flex;align-items:center;gap:5px;overflow:hidden}
.stname.haslogo .sttxt{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.stlogo{width:19px;height:19px;border-radius:50%;background:var(--bg);border:1px solid var(--border);object-fit:contain;flex-shrink:0}
.stpts{font-weight:800;flex-shrink:0;min-width:34px;text-align:end;font-variant-numeric:tabular-nums}
/* v12.16: the UCL card is a COMPLETE league table \u2014 MP/W/D/L/GF/GA/GD/Pts
   stat columns + a sticky header row; the W/D/L/GF/GA middle columns fold
   away on phones (\u2264600px), leaving # | team | MP | GD | Pts. */
.stnum{width:26px;text-align:center;flex-shrink:0;font-variant-numeric:tabular-nums;color:var(--muted)}
.strow.uclhead{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--border);z-index:1;font-weight:700}
.strow.uclhead .stnum{font-size:9.5px;font-weight:700;color:var(--muted);line-height:1.3}
.strow.uclhead .stpts{font-size:10px;color:var(--muted)}
@media (max-width:600px){.ucl-hidem{display:none}}
.stempty{color:var(--muted);font-size:11.5px;padding:4px 0}
.stnot-overlay{position:absolute;top:38px;left:8px;right:8px;bottom:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:rgba(2,6,23,.52);-webkit-backdrop-filter:blur(7px) saturate(1.2);backdrop-filter:blur(7px) saturate(1.2);border-radius:10px;text-align:center;z-index:2;box-shadow:inset 0 1px 0 var(--glass-hi)}
[data-theme="light"] .stnot-overlay{background:rgba(248,250,252,.6)}
.stnot-ovl-label{font-size:12px;font-weight:800;color:var(--text)}
.stnot-ovl-timer{font-size:10.5px;font-weight:700;color:var(--countdown);background:var(--countdown-bg);border-radius:999px;padding:2px 10px;font-variant-numeric:tabular-nums}
.cupgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.cupbox{background:var(--glass);-webkit-backdrop-filter:blur(12px) saturate(1.3);backdrop-filter:blur(12px) saturate(1.3);border:1px solid var(--glass-border);border-radius:12px;padding:10px 12px;box-shadow:var(--glass-shadow),inset 0 1px 0 var(--glass-hi)}
.cupbox-head{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;margin-bottom:4px}
.cupbox-head img{width:18px;height:18px;border-radius:4px}
.cupgroup-title{margin:12px 0 6px;font-size:12.5px;font-weight:800;color:var(--muted);display:flex;align-items:center;gap:6px}
.cupgroup-title:first-child{margin-top:0}
.cupmatch{font-size:11.5px;line-height:1.7}
.cupmatch .teams{font-weight:700}
.cupdate{color:var(--muted);font-size:11px}
.cupdate .live-tag{color:var(--t-success-ink);font-weight:700}
/* v12.31 (the user's ask): "the '...' button caused match time and day not
   be perfectly aligned on center, we need to relocate this '...' to
   somewhere else like top corner (left or right) based on RTL/LTR". The \u22EF
   was a flex item INSIDE the centered info line \u2014 its 44px footprint
   pushed the weekday/date text off the box's true center. The toggle now
   owns the match box's TOP INLINE-END corner (position:absolute on
   .mrow/.spotitem, which are position:relative since this release \u2014
   logical inset-inline-end mirrors RTL/LTR automatically: left corner on
   the fa page, right corner on the en page). The 16px dots icon is
   CORNER-ANCHORED (padding-block-start/inset-inline-end offsets, not
   centered) so on PC it clears the round crest that hugs that corner \u2014
   a crest's square corner is empty space, the circle's ink starts
   ~10px in along the diagonal; the centered hit area (44\xD744) may overlap
   the crest's empty corner harmlessly (the crest is not interactive).
   Phones have the corner fully free (face-off crests are centered in
   their half-width columns). The info line centers across the FULL row
   width again; the popover unfolds under the corner dots as before. */
.sharewrap{position:absolute;top:0;inset-inline-end:0;z-index:6;width:44px;height:44px}
.sharetoggle{display:inline-flex;align-items:flex-start;justify-content:flex-end;width:44px;height:44px;padding-block-start:8px;padding-inline-end:4px;border-radius:14px;background:transparent;border:none;cursor:pointer;font-family:inherit;color:#93c5fd;transition:color .15s,background .15s}
/* v12.x-dots-color (the user's ask): the 3-dot share toggle is LIGHT BLUE
   in dark mode (#93c5fd — matches the site's --link/--countdown) and
   SILVER in light mode (#9ca3af — gray-400, reads as silver on white).
   The hover state still brightens to var(--text) for feedback. */
[data-theme="light"] .sharetoggle{color:#9ca3af}
.sharetoggle:hover{color:var(--text);background:var(--hover)}
.sharetoggle:active{transform:scale(.88)}
.sharetoggle:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.sharetoggle svg{display:block;fill:currentColor}
.share{display:none;position:absolute;top:40px;inset-inline-end:0;align-items:center;gap:5px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:6px;box-shadow:0 12px 32px rgba(2,6,23,.45),inset 0 1px 0 var(--glass-hi);z-index:7}
.sharewrap.open .share{display:inline-flex}
.share a,.share button{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;background:var(--chip);border:1px solid var(--border);padding:0;cursor:pointer;font-family:inherit;color:var(--muted);text-decoration:none;transition:transform .15s,background .15s}
.share a:hover,.share button:hover{transform:translateY(-1px);background:var(--hover)}
.share a:active,.share button:active{transform:scale(.9)}
.share svg{display:block}
/* v12.31 (the user's ask): "remove the 3d-gradient vibe of \u0635\u062F\u0631 \u062C\u062F\u0648\u0644 use less
   3d effect, more 2d colors. (3d is visual noise)". The v12.29 metallic
   trophy plate (vertical highlight\u2192deep-gold gradient + inset sheen + amber
   glow + engraved text-light) is RETIRED \u2014 the badge is a FLAT 2D pill now.
   v12.34-pastel (the user's ask): the saturated amber #fbbf24 was too loud
   \u2014 it grabbed the eye too much. Switched to a PASTEL yellow field
   (#fef9c3 \u2014 Tailwind yellow-100) with a deeper pastel edge (#fde68a
   \u2014 yellow-200, replaces the --badge-top dark-gold outline) and the same
   dark engraved ink (#451a03 \u2014 reads on both themes). opacity:.92 keeps
   the pill from screaming on glass surfaces. \u{1F3C6} stays (v12.29):
   leading the table = lifting the cup, but quietly now. */
.topbadge{display:inline-flex;align-items:center;background:#fef9c3;color:#451a03;border-radius:999px;padding:2px 10px;font-size:11.5px;font-weight:800;margin-inline-start:6px;vertical-align:middle;border:1px solid #fde68a;opacity:.92}
#msg{text-align:center;color:var(--muted);font-size:13px;padding:12px}
.empty{color:var(--muted);text-align:center;padding:24px;font-size:14px}
/* v12.56: loading animation — a subtle spinner shown while cards fetch
   new data. The .card-loading class is added to content containers (e.g.
   #standings, #topSpot, #finished) while load() is in progress. The
   existing content fades to .4 opacity + a spinner appears centered.
   v12.x-loading-lottie: the CSS spinner is RETIRED — replaced by the
   loading.lottie animation (a 500x500 Lottie, shown at 48x48px). The
   Lottie player is injected via JS (addLoadingLottie helper) when the
   .card-loading class is added, and removed when it's removed. The
   ::after pseudo-element is now transparent (no border spinner). */
.card-loading{position:relative;min-height:60px;opacity:.4;transition:opacity .25s;pointer-events:none}
.card-loading::after{content:"";position:absolute;top:50%;left:50%;width:48px;height:48px;margin:-24px 0 0 -24px;opacity:1;z-index:10;background:transparent}
.card-loading dotlottie-player.loading-lottie{position:absolute;top:50%;left:50%;width:48px;height:48px;margin:-24px 0 0 -24px;z-index:10;opacity:1;pointer-events:none}
@keyframes card-spin{to{transform:rotate(360deg)}}
/* v12.x-loading-lottie: the .empty loading state (initial load) now
   shows the loading.lottie animation centered instead of the 'در حال
   بارگذاری...' text. The text is kept for screen readers (sr-only)
   but the Lottie animation is the visual. */
.empty.loading-empty{position:relative;min-height:80px;padding:24px;display:flex;align-items:center;justify-content:center}
.empty.loading-empty dotlottie-player.loading-lottie{width:48px;height:48px}
.empty.loading-empty .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
/* v12.32 (the user's ask): the «بیشتر» expander under the finished card's
   first five rows \u2014 one tap shows the latest 20 (server cap), the pill
   flips to «کمتر» to collapse. Same pill on PC and phones. */
.finmore{display:flex;align-items:center;justify-content:center;gap:6px;width:fit-content;margin:12px auto 2px;padding:7px 20px;border-radius:999px;background:var(--chip);border:1px solid var(--border);color:var(--muted);font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer;transition:color .15s,background .15s,transform .15s cubic-bezier(.16,1,.3,1)}
.finmore:hover{color:var(--text);background:var(--hover);transform:translateY(-1px)}
.finmore:active{transform:scale(.96)}
.finmore:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
/* v12.26 (the user's ask): "the \u062A\u0645\u0627\u0633 \u0628\u0627 \u0645\u0627 and \u062F\u0631\u0628\u0627\u0631\u0647 \u0645\u0627 must be right
   aligned. currently they're center aligned" \u2014 the footer block (and the
   nav rows that carry \u062F\u0631\u0628\u0627\u0631\u0647/\u062A\u0645\u0627\u0633, header + phone footer) align to the
   START edge now: right in the RTL fa page (left in the EN ltr mirror),
   the natural reading edge \u2014 no longer dead-center. */
/* v12.34-pastel: the About + Contact blocks at the foot of the page
   (the user's ask). About carries the SportSignal origin story (fa+en);
   Contact carries the bug-hunt / suggestion email sportsignal@atomicmail.io.
   Both sit in the footer's #about anchor block. */
.aboutbox,.contactbox{margin:0 0 16px;padding:14px 16px;border:1px solid var(--border);border-radius:12px;background:var(--card)}
.aboutbox h3,.contactbox h3{font-size:14.5px;font-weight:800;color:var(--text);margin:0 0 8px;display:flex;align-items:center;gap:8px}
.aboutbox p,.contactbox p{font-size:13px;line-height:1.85;color:var(--muted);margin:0 0 8px}
.aboutbox p:last-child,.contactbox p.contact-cta{margin:0}
.contactbox .contact-cta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:6px}
.contactbox .contact-cta a{font-weight:800;color:var(--link);text-decoration:none;padding:6px 14px;border:1px solid var(--border);border-radius:999px;font-size:13px;background:var(--bg);transition:background .15s,border-color .15s}
.contactbox .contact-cta a:hover{background:var(--hover);border-color:var(--link)}
.contactbox .contact-email{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;color:var(--text);direction:ltr;display:inline-block}
.aboutbox .about-tag{font-size:14.5px;font-weight:800;color:var(--text);line-height:1.6;margin:0 0 12px;padding:8px 12px;border-inline-start:3px solid var(--link);background:var(--bg);border-radius:0 8px 8px 0}
footer{text-align:start;color:var(--footer);font-size:12px;margin-top:28px;line-height:2}
footer a{color:var(--link);text-decoration:none}
footer a:hover{text-decoration:underline}
/* v12.25 (the user's ask): the \xAB\u062E\u0627\u0646\u0647 \u062F\u0631\u0628\u0627\u0631\u0647 \u062A\u0645\u0627\u0633\xBB nav \u2014 PCs get it in the
   header, phones get the same three links at the top of the footer. All
   three are REAL destinations: home reloads, about anchors to the
   footer's identity block (id="about"), contact opens the Telegram bot \u2014
   the site's contact channel.
   v12.26 (the user's ask): the nav rows align to the START edge (right on
   the RTL page) \u2014 hugging the logo on PC, right-aligned in the footer \u2014
   no longer centered. */
.mainnav{display:none}
.footnav{display:none}
@media (min-width:601px) and (max-width:1439px){
.mainnav{display:flex;order:3;flex:1 1 100%;justify-content:flex-start;align-items:center;gap:2px}
}
@media (min-width:1440px){
.mainnav{display:flex;flex:1 1 auto;justify-content:flex-start;align-items:center;gap:2px;min-width:0}
}
.mainnav a{color:var(--nav-link);text-decoration:none;font-size:13.5px;font-weight:700;padding:8px 16px;border-radius:10px;transition:color .15s,background .15s;white-space:nowrap}
.mainnav a:hover{color:var(--nav-link-hover);background:var(--hover)}
@media (max-width:600px){
.footnav{display:flex;justify-content:flex-start;align-items:center;gap:2px;flex-wrap:wrap;margin:0 0 8px}
.footnav a{color:var(--link);text-decoration:none;font-size:13px;font-weight:700;padding:4px 12px;border-radius:8px}
.footnav a:hover{text-decoration:underline}
}
@media (max-width:600px){
body{padding:16px 12px 28px;background-attachment:scroll}
h1{font-size:23px}
.sub{font-size:12.5px}
/* v12.26: the header CTA is a COMPACT pill now (it lives in the website
   header, not a hero block) \u2014 the old full-width hero button rule is
   retired; the sticky bottom join bar still covers scroll-time CTA. */
#topbar .cta{font-size:11.5px;padding:8px 12px;gap:6px}
.head-actions{gap:6px}
#topbar{margin-bottom:8px}
/* v12.52-mobile-header: on mobile, the header shows 3 icon buttons (lang,
   theme, Telegram) grouped on the LEFT + the logo on the RIGHT. The text
   CTA button is hidden (the Telegram icon button replaces it). The
   timezone button (⚙️) is hidden on mobile (it's a desktop power-user
   feature; the timezone is also in the admin panel). The 3 buttons sit
   in the .tb-btns container with a glass background + rounded corners. */
#topbar .cta{display:none}
#tgbtn{display:flex}
#sbtn{display:none}
.tb-btns{display:inline-flex;gap:4px;padding:4px;background:var(--glass);-webkit-backdrop-filter:blur(10px) saturate(1.3);backdrop-filter:blur(10px) saturate(1.3);border:1px solid var(--glass-border);border-radius:12px}
.card{padding:13px 9px}
h2{font-size:15.5px;padding:8px 12px}
#topspotCard h2,#uclSpotCard h2{font-size:17px}
/* v12.28 (the user's ask): "find out why the place is limited in mobile
   mode, so a club name like Manchester United, became two rows, which is
   ugly. (i think it's because of padding and spacing.)" \u2014 diagnosis: the
   horizontal A [time] B row inside a 314px phone box (body 2\xD712 + card
   2\xD710 + spotitem 2\xD710 + match 2\xD76 + 2\xD78px gaps + the fixed 80px time
   slot + 2\xD746px crests + 2\xD78px side gaps) left each name column ~55px \u2014
   even \xAB\u0645\u0646\u0686\u0633\u062A\u0631\u06CC\u0648\u0646\u0627\u06CC\u062A\u062F\xBB wrapped. Fix \u2014 the phone row becomes a FACE-OFF:
   both sides ride one line as COLUMNS (crest above its centered name \u2014
   a name now gets ~half the row, never a 55px sliver), and the time/
   score slot moves to its OWN centered line BELOW via flex order (the
   v12.25 rule "the time sits with ITS two teams" survives vertically:
   both teams sandwich it). Padding trimmed around the row (card 10\u21929,
   match 10px 6px\u21926px 2px, gap 8\u21926) buys back more name width; the hero's
   big 20px chip centers on that same full-width line.
   v12.32 (the user's ask): "in mobile view, move the match time, between
   the clubs' logos. and align with them" \u2014 the time/score slot is BACK
   ON the crest line: order:1 slots it BETWEEN the two side columns (DOM
   order [home][time][away] \u2192 visual home|time|away), align-self:flex-start
   + height:46px centers the chip exactly on the crest's vertical center
   line (the crest is 46px tall on phones), and the names stay under their
   crests. The hero's kick COLUMN ([chip + date]) rides the same slot with
   height:auto + a 3px top offset so its BIG chip centers on the crest
   line (chip \u224838px, (46-38)/2 \u22484px); its .kickdate follows below into
   the names' band, centered between the two name columns. */
.match{flex-wrap:wrap;gap:6px;padding:6px 2px}
.match .side{order:1;flex-direction:column;align-items:center;gap:3px}
.match .side .team{flex:0 0 auto;width:100%;min-width:0;text-align:center;font-size:13px;word-wrap:break-word;overflow-wrap:anywhere}
.match .side.away{flex-direction:column-reverse}
/* v12.32: direct children only (the hero's score is NESTED inside its .kick
   column \u2014 the old descendant selector would have re-flowed it). */
/* v12.54: separated .match>.kick (column: time over date) from
   .match>.score (row: "2 - 2" on one line). Was sharing one rule with
   flex-direction:column which stacked the score digits vertically. */
.match>.kick{order:1;flex:0 0 auto;align-self:center;height:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;margin-top:0;min-width:0}
.match>.score{order:1;flex:0 0 auto;align-self:center;height:auto;display:flex;flex-direction:row;align-items:center;justify-content:center;margin-top:0;min-width:0;white-space:nowrap}
.bighero .match>.kick{height:auto;margin-top:3px;gap:4px}
.logo{width:37px;height:37px;font-size:16px}
/* v12.x-hero-bigger (the user's ask): the hero (featured single box) logos
   must be BIGGER than the topspot list logos (54px mobile) + the regular
   box logos (46px mobile) — the featured match is more important and
   imminent. The hero logos are now 64px on mobile (vs 54px topspot, 46px
   regular). Specificity (0,2,0) beats the .logo (0,1,0) base + the
   #topspotCard .spotitem .logo (1,2,0) is a different selector so no
   conflict. Desktop keeps the 102px hero (already bigger than the 64px
   topspot). */
.bighero .logo{width:64px;height:64px;font-size:28px}
.score{font-size:15px}
.kick .countdown{font-size:11.5px;padding:3px 9px}
.bighero .kick .countdown{font-size:20px;padding:6px 16px;border-radius:12px}
.bighero .kickdate{font-size:14px}
.bighero .bigbar-clock{font-size:12.5px}
.bighero .score{font-size:20px}
.bighero .uclspot-info,.bighero .info{font-size:12.5px}
/* v12.30 (the user's phone report \u2014 "the header of upcoming match in
   mobile looks distracting. disorganized and messy with a lot of
   noise"): the phone hero sheds its noise layers and gains real
   breathing room \u2014
     \xB7 the bar's decorative percent chip is OFF (it is aria-hidden
       garnish; the label + clock + track carry the story, and the freed
       ~56px stops the top row pinching on a 390px screen)
     \xB7 every seam gets air: more space under the bar, a taller gap
       before the big time number, room under the info chips so nothing
       is crammed against the card's edge (the VLM review of the user's
       screenshot flagged exactly those cramped seams)
   With the crest ghosts gone (the .hero-wm rule above) and the navy
   veil + blur calming the video, the phone hero is one quiet stack with
   a single hierarchy: bar \u2192 face-off \u2192 the big time number \u2192 info. The
   v12.28 display-size time chip (20px) and the face-off columns are
   untouched \u2014 the ask is less noise, not a smaller headline. */
.bighero .bigbar-pct{display:none}
/* v12.57: min-height only on mobile — the video stage needs room on
   phones. On PC the card sizes to its content (no excess space). */
/* v12.57: min-height only on mobile — the video stage needs room on
   phones. On PC the card also gets a min-height so the video/watermark
   background is visible even when the heroSpot is empty, but smaller
   than mobile (200px vs 240px) to avoid excessive empty space. */
.card.bighero{min-height:200px}
.bighero .bigbar{margin-bottom:0;padding:2px 2px 4px}
/* v12.32: retired .bighero .kick{margin-top:8px} \u2014 the kick column now sits
   BETWEEN the crests (rule above: margin-top:3px centers its chip on the
   46px crest line), not on its own line below the face-off. */
.bighero .uclspot-info{margin-top:10px;gap:6px}
/* v12.47-nospotbox: retired the old .bighero .spotitem padding — the
   spotitem is now borderless + backgroundless (see the v12.47 rule
   above), so the padding that framed the old box is gone too. The
   match row + info + share sit directly on the hero card's own
   surface, no inner container. */
.bighero .spotitem{padding:0}
.mrow,.spotitem{padding:8px 10px}
.info{font-size:11px;line-height:1.7}
#topbar button{padding:7px 12px}
#tzpanel{width:min(320px,calc(100vw - 24px))}
/* v12.27: phones keep the cluster's 44\xD744px hit areas \u2014 the base .tb-btns button rule applies unchanged below 600px. */
}
/* v12.21 (the user's ask): the v12.20 auto-placed two-per-row grid read as
   RANDOM on PC \u2014 shared grid rows dragged shorter cards down to ragged Y
   offsets (a ~500px hole opened under the UCL box, the standings pair
   started ~2100px below its column neighbor, and the results card sat alone
   in the last row). The \u22651440px layout now follows a REAL grid with
   hierarchy: full-width chrome (topbar \u2192 hero \u2192 countdown hero \u2192 footer), a
   MAIN column (inline start) carrying every match box, and a reference RAIL
   with the three table boxes \u2014 each column stacks flush, no shared rows, no
   holes. setWide() (page script) regroups the cards into #wideMain/#wideSide
   at the breakpoint and restores the exact single-column DOM order below
   it; the hero centers above the full-width countdown, whose match row is
   capped to a readable width. */
@media (min-width:1440px){
body{max-width:1400px;display:grid;grid-template-columns:minmax(0,1fr) minmax(400px,460px);column-gap:28px;row-gap:14px;align-items:start}
/* v12.24: the WEBSITE header spans the full chrome row \u2014 logo pinned to
   the start corner, settings + Telegram CTA at the other end (the old
   centered-controls bar + hero title block are retired). */
#topbar{margin-bottom:0}
#heroSpot{max-width:880px;margin:0 auto}
#wideMain,#wideSide{display:flex;flex-direction:column;gap:14px}
#wideMain>*,#wideSide>*{margin:0}
#wideSide .grid4{grid-template-columns:repeat(2,minmax(0,1fr))}
footer{margin-top:0}
#topbar,.herowrap,footer{grid-column:1/-1}
}
@keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}.bigcard{box-shadow:0 0 10px rgba(5,150,105,.16),0 8px 26px rgba(0,0,0,.35),var(--glass-shadow),inset 0 1px 0 rgba(255,255,255,.16)}}
@media (prefers-reduced-transparency:reduce){body{background:var(--bg)}.card,#topbar button,.bigbar,.stbox,.cupbox,.uclcard,.uclspot,#tzsel,#tzfilter,#tzpanel,#joinSticky{background:var(--card);-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:0 1px 2px rgba(15,23,42,.05)}}
</style>
</head>
<body>
<!-- v12.24 (the user's ask): a real WEBSITE header \u2014 the uploaded SportSignal
     logo rides the start corner ("Like websites logo"), the settings icons
     and the Telegram CTA group on the opposite end:
     [settings icons etc] [telegram cta button] \xB7\xB7\xB7\xB7 [logo].
     The old \xAB\u26BD \u0627\u0639\u0644\u0627\u0646\u200C\u062F\u0647\u0646\u062F\u0647 \u0645\u0633\u0627\u0628\u0642\u0627\u062A\xBB h1 and its subtitle are RETIRED per the
     ask; the v12.20 sync stamp becomes the header's quiet second row. The
     tz popover still anchors to this bar (same ids, same wiring \u2014 only the
     chrome around them changed). -->
<header id="topbar">
<!-- v12.26 (the user's ask): "in darkmode it turns to a white sillohuette.
     fix this. show the given logo in both light and dark mode" \u2014 the white
     remap variant is RETIRED; the uploaded transparent png rides BOTH themes
     (its navy + white inks read on dark, its navy on light), 40% SMALLER on
     PC per the ask (84px \u2192 50px, phones already 50px); the classic
     \xAB\u062E\u0627\u0646\u0647 \u062F\u0631\u0628\u0627\u0631\u0647 \u062A\u0645\u0627\u0633\xBB nav rides the header's start side on PC (phones get
     it in the footer) \u2014 v12.26 right-aligned with the logo, not centered. -->
<a class="brand" href="/" aria-label="SportSignal"><img src="/logo.png" alt="SportSignal" width="146" height="50" referrerpolicy="no-referrer"></a>
<nav class="mainnav" aria-label="\u0646\u0627\u0648\u0628\u0631\u06CC \u0627\u0635\u0644\u06CC"><a href="/" data-i="navHome">\u062E\u0627\u0646\u0647</a><a href="#about" data-i="navAbout">\u062F\u0631\u0628\u0627\u0631\u0647</a><a href="#contact" data-i="navContact">\u062A\u0645\u0627\u0633</a></nav>
<div class="head-actions"><a class="cta" href="https://t.me/SportSignalAlertsBot" target="_blank" rel="noopener" data-i="join">\u0639\u0636\u0648\u06CC\u062A \u062F\u0631 \u0631\u0628\u0627\u062A \u062A\u0644\u06AF\u0631\u0627\u0645</a><span class="tb-btns"><button id="sbtn" onclick="toggleTz()" aria-expanded="false" aria-controls="tzpanel" title="\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC" aria-label="\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC">\u2699\uFE0F</button><button id="lbtn" onclick="switchLang()"></button><button id="tbtn" onclick="toggleTheme()"></button><a id="tgbtn" href="https://t.me/SportSignalAlertsBot" target="_blank" rel="noopener" class="icon-tg" aria-label="Telegram" title="Telegram"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg></a></span></div>
<div id="tzpanel" role="group" aria-label="\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC"><div class="tz-head"><span data-i="tzTitle">\u{1F30D} \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC</span><button id="tzclose" onclick="toggleTz()" title="\u0628\u0633\u062A\u0646" aria-label="\u0628\u0633\u062A\u0646">\u2715</button></div><input id="tzfilter" type="search" placeholder="\u062C\u0633\u062A\u062C\u0648\u06CC \u06A9\u0634\u0648\u0631 \u06CC\u0627 \u0634\u0647\u0631\u2026" data-p="tzSearch" aria-label="\u062C\u0633\u062A\u062C\u0648\u06CC \u06A9\u0634\u0648\u0631 \u06CC\u0627 \u0634\u0647\u0631"><select id="tzsel" title="\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC" aria-label="\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC"></select></div>
<!-- v12.20: visible PROOF for the auto-update claim. v12.26: the sync line
     prints the TRUTHFUL absolute stamp of the last real API refresh \u2014
     \xAB\u0622\u062E\u0631\u06CC\u0646 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC: \u062C\u0645\u0639\u0647 \u06F2\u06F1:\u06F3\u06F0 \u0634\u0628\xBB (weekday + time + period word) \u2014
     rendered by renderSync()/fmtStamp() from the payload's fetchedAt. -->
<p class="sub sync" id="lastSync" role="status" aria-live="polite"></p>
</header>
<!-- v12.12: the view toggle is RETIRED \u2014 the page is permanently big-only
     (\xAB\u0641\u0642\u0637 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF\xBB, the user's default). The hero card + the topspot
     box + the UCL box ARE the upcoming presentation. -->
<!-- v12.10/v12.11 HERO CARD: the countdown bar and ITS match are ONE card at
     the very top \u2014 the closest upcoming big match (the big-matches box's
     slot 1, the match the countdown tracks) sits STUCK to the bar, separated
     from the other big matches in the box below (user ask: the next big
     match must be stuck to its countdown). v12.11: the card is a PLAIN
     standard card \u2014 same glass/border as every other section \u2014 and its match
     row is styled like any other match row (no special box; streamlined).
     #bigbar keeps its id \u2014 updateBigBar drives label/clock/fill every
     second; #heroSpot is filled by renderHeroSpot from the SAME barTarget()
     pick, so the card under the countdown is always exactly the match being
     counted down to. -->
<!-- v12.27 (review item 1): .herowrap \u2014 the clip host's shell. The card
     inside carries overflow:hidden (clips the video/crest/fx layers to its
     16px radius), while this wrapper's ::before owns the OUTER heartbeat
     aura (a child's outer box-shadow would be clipped by the card). updateBigBar
     mirrors data-urgent here so the escalation ladder keeps driving both. -->
<div class="herowrap">
<div class="card bighero" id="bigHeroCard" style="display:none">
<!-- v12.26 (the user's ask): layer A \u2014 the VIDEO STAGE, deepest of the four:
     video \u203A background logos \u203A css effects \u203A actual data. The user's own
     7.2s clip loops muted+autoplay+playsinline from /hero-stage.mp4
     (worker [assets]), clipped + scrimmed so the data above stays king;
     a prefers-reduced-motion user keeps autoplay too (v12.28 \u2014 the user's
     twice-repeated ask outweighs the media query for this one element). -->
<div class="hero-video" aria-hidden="true"><video src="/hero-stage.mp4" autoplay muted loop playsinline preload="auto" tabindex="-1" disablepictureinpicture referrerpolicy="no-referrer"></video></div>
<!-- v12.22: the hero stage's ember layer \u2014 static markup OUTSIDE #heroSpot
     so it survives every re-render, clipped to the card, pointer-transparent. -->
<div class="hero-fx" aria-hidden="true"><i></i><i></i><i></i></div>
<!-- v12.23 (the user's ask): the clubs' EXPANDED, faded crests behind the
     stage \u2014 "[faded logo big on background] [club logo] club name". Static
     layer OUTSIDE #heroSpot (like the ember layer) so re-renders never
     disturb it; renderHeroSpot \u2192 heroWm() swaps the two crest srcs per
     match; a club without a crest hides its watermark. -->
<div class="hero-wm" aria-hidden="true"><img alt="" referrerpolicy="no-referrer" onerror="this.style.display='none'"><img alt="" referrerpolicy="no-referrer" onerror="this.style.display='none'"></div>
<!-- v12.26: layer D \u2014 the DATA SURFACE. The countdown bar and its match row
     ride ONE positioned layer (z:3) above the video (z:0), the crests (z:1)
     and the css fx (z:2) \u2014 exactly the user's ladder. -->
<div class="hero-data">
<!-- v12.46-herofix: the match row (heroSpot) rides ABOVE the countdown bar
     (the user's ask: "move this loading to below team names"). The bigbar
     now sits BELOW the match row, not above it. A ⚽ football emoji is
     prepended to the bigbar label for visual identity. -->
<div id="heroSpot"></div>
<div id="bigbar" class="bigbar">
<div class="bigbar-top"><span id="bigbarLabel" data-i="barNext">\u26A1 \u062A\u0627 \u0628\u0627\u0632\u06CC \u0628\u0632\u0631\u06AF \u0628\u0639\u062F\u06CC</span><span class="bb-end"><span id="bigbarClock" class="bigbar-clock">--:--:--</span><span id="bigbarPct" class="bigbar-pct" aria-hidden="true"></span></span></div>
<div class="bigbar-track" id="bigbarTrack" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="bigbarFill" class="bigbar-fill"></div></div>
</div>
</div>
</div>
</div>
<!-- v12.3/v12.4/v12.7/v12.8 TOP BOX (league), per the user's rules: TOP CL GAME (two
     selected teams in the Champions League) \u2192 the UCL BOX below; big DOMESTIC
     matches (derbies like the Madrid derby, top-of-the-table clashes and
     selected-vs-selected clashes like the Manchester derby) \u2192 THIS box,
     heading the games list so a derby can never sit 3rd/4th in kickoff order.
     v12.7: the card consolidates the big upcoming matches (user's ask \u2014
     Atl\xE9tico\u2013Real Madrid and the Manchester derby in the SAME box); a match
     that is BOTH a derby and a top-of-the-table clash shows BOTH tags.
     v12.8: only TRUE big matches qualify (A: two selected teams / B: both
     sides top-3 / C: derby; fallback when A/B/C run short: a selected team
     vs a TOP-5 side of that league \u2014 never a routine selected fixture like
     Liverpool\u2013Fulham) and the order is STRICTLY kickoff \u2014 closest upcoming
     on top, live first.
     v12.10: slot 1 \u2014 the countdown's own match \u2014 now lives in the HERO CARD
     at the very top (bar + match stuck together, per the user's ask); THIS
     box presents the REMAINING big matches. Box fixtures are
     excluded from the upcoming list below \u2014 this box IS their presentation.
     Hidden when nothing qualifies \u2014 or when the hero took the only entry.
     v12.11: plain .card \u2014 no golden chrome; entries are uniform match rows.
     v12.12: capacity raised \u2014 up to TEN entries (11 picked server-side,
     slot 1 = the hero; the user's ask).
     v12.13: THIS box now sits BETWEEN the hero and the UCL box (user's ask \u2014
     order: [next big match countdown and teams] \u2192 [big upcoming matches] \u2192
     [big upcoming UCL matches]). -->
<!-- v12.42-livesection: the LIVE section — matches currently playing/broadcasting
     (whether 1 or 20), with a special LIVE badge. The card auto-hides when no
     matches are live (display:none via renderLive). Matches stay here as long
     as the match status is LIVE/IN_PLAY/PAUSED. -->
<div class="card" id="liveCard" style="display:none">
<h2 data-i="hLive">\u{1F534} \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0632\u0646\u062F\u0647</h2>
<div id="liveMatches"><div class="empty loading-empty"><dotlottie-player class="loading-lottie" src="/loading.lottie" autoplay loop background="transparent" aria-hidden="true"></dotlottie-player><span class="sr-only" data-i="loading">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</span></div></div>
</div>
<div class="card" id="topspotCard" style="display:none">
<h2 data-i="hLgNext" id="topSpotTitle">\u{1F525} \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0628\u0632\u0631\u06AF \u067E\u06CC\u0634\u200C\u0631\u0648</h2>
<div id="topSpot"><div class="empty loading-empty"><dotlottie-player class="loading-lottie" src="/loading.lottie" autoplay loop background="transparent" aria-hidden="true"></dotlottie-player><span class="sr-only" data-i="loading">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</span></div></div>
</div>
<!-- v12.2: the UCL box sits above the games list (was below it). v12.4: while
     the selected-vs-selected CL pairing is far away the box headlines the
     nearest CL match with \u22651 selected team (live scores too).
     v12.12: the box is GENERALIZED (the user's ask) \u2014 up to EIGHT upcoming
     CL fixtures in kickoff order (live first; "two today, two tomorrow"),
     and ONLY matches with \u22651 SELECTED club (Sabah FK vs SK Slavia Praha is
     noise). Same spotitem rows as every other box (v12.11 uniform). Hidden
     when nothing qualifies; the pre-draw wait state counts to the projected
     first kickoff.
     v12.13: moved BELOW the big-matches box (user's ask \u2014 the domestic big
     matches outrank the UCL ones in reading order; hero \u2192 topspot \u2192 uclspot). -->
<div class="card uclspot" id="uclSpotCard">
<!-- v12.21 (the user's ask): the UCL-dedicated box carries the brand \u2014 the
     starball on its white chip inside the navy plate. data-i moved to the
     INNER span so trText() can never clobber the logo. -->
<h2 id="uclSpotTitle" class="uclh2"><span class="ucl-logo" aria-hidden="true">${UCL_LOGO_CHIP}</span><span data-i="hUclNext">\u{1F525} \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0645\u0647\u0645 \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627</span></h2>
<div id="uclSpot"><div class="empty loading-empty"><dotlottie-player class="loading-lottie" src="/loading.lottie" autoplay loop background="transparent" aria-hidden="true"></dotlottie-player><span class="sr-only" data-i="loading">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</span></div></div>
</div>
<!-- v12.16: \xAB\u062F\u0631 \u0627\u06CC\u0646 \u0647\u0641\u062A\u0647\xBB \u2014 the CURRENT Iranian week (Saturday\u2192Friday)
     agenda: every followed/top-3 game of this week in one box, live first,
     then kickoff order; games already played this week keep their final
     score. Zero extra API calls (same pool as the big boxes); hidden when
     the week has no followed games. -->
<div class="card" id="weekCard" style="display:none">
<h2 data-i="hWeek" id="weekTitle">\u{1F4C5} \u062F\u0631 \u0627\u06CC\u0646 \u0647\u0641\u062A\u0647</h2>
<div id="weekBox"><div class="empty loading-empty"><dotlottie-player class="loading-lottie" src="/loading.lottie" autoplay loop background="transparent" aria-hidden="true"></dotlottie-player><span class="sr-only" data-i="loading">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</span></div></div>
</div>
<!-- v12.12: the \xAB\u{1F4C5} \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648\xBB list card is RETIRED \u2014 with the view
     toggle gone (always big-only) it only ever held the redundant "\u0647\u0645\u0647 \u062F\u0631
     \u062C\u0639\u0628\u0647 \u0628\u0627\u0644\u0627 \u0647\u0633\u062A\u0646\u062F" note; the hero card + the topspot box + the UCL box
     ARE the upcoming presentation (the user's ask). -->

</div>
<div class="card uclcard" id="uclCard">
<h2 class="uclh2"><span class="ucl-logo sm" aria-hidden="true">${UCL_LOGO_CHIP}</span><span data-i="hUcl">\u{1F3C6} \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627</span></h2>
<div id="ucl"><div class="empty loading-empty"><dotlottie-player class="loading-lottie" src="/loading.lottie" autoplay loop background="transparent" aria-hidden="true"></dotlottie-player><span class="sr-only" data-i="loading">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</span></div></div>
</div>
<div class="card" id="standingsCard">
<h2 data-i="hStandings">\u{1F4CA} \u062C\u062F\u0648\u0644 \u0644\u06CC\u06AF\u200C\u0647\u0627</h2>
<div id="standings"><div class="empty loading-empty"><dotlottie-player class="loading-lottie" src="/loading.lottie" autoplay loop background="transparent" aria-hidden="true"></dotlottie-player><span class="sr-only" data-i="loading">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</span></div></div>
</div>
<div class="card" id="cupsCard">
<h2 data-i="hCups">\u{1F3C6} \u062A\u0648\u0631\u0646\u0645\u0646\u062A\u200C\u0647\u0627</h2>
<div id="cups"><div class="empty loading-empty"><dotlottie-player class="loading-lottie" src="/loading.lottie" autoplay loop background="transparent" aria-hidden="true"></dotlottie-player><span class="sr-only" data-i="loading">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</span></div></div>
</div>

</div>
<!-- v12.5: the Iran card is gone \u2014 the PGL table lives inside the league
     standings grid above (#standings), per the user's request. -->
<div class="card" id="finishedCard">
<h2 data-i="hFinished">\u{1F3C1} \u0646\u062A\u0627\u06CC\u062C \u0627\u062E\u06CC\u0631</h2>
<div id="finished"><div class="empty loading-empty"><dotlottie-player class="loading-lottie" src="/loading.lottie" autoplay loop background="transparent" aria-hidden="true"></dotlottie-player><span class="sr-only" data-i="loading">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</span></div></div>
</div>
<footer id="about"><nav class="footnav" aria-label="\u0646\u0627\u0648\u0628\u0631\u06CC \u0627\u0635\u0644\u06CC"><a href="/" data-i="navHome">\u062E\u0627\u0646\u0647</a><a href="#about" data-i="navAbout">\u062F\u0631\u0628\u0627\u0631\u0647</a><a href="#contact" data-i="navContact">\u062A\u0645\u0627\u0633</a></nav>
<div class="aboutbox">
<h3 data-i="hAbout">\u{1F4D8} \u062F\u0631\u0628\u0627\u0631\u0647 SportSignal</h3>
<p data-i="aboutTag" class="about-tag">\u0642\u0631\u0627\u0631 \u0646\u06CC\u0633\u062A \u0647\u0631 \u0645\u0633\u0627\u0628\u0642\u0647\u200C\u0627\u06CC \u0631\u0627 \u0628\u0628\u06CC\u0646\u06CC\u061B \u0641\u0642\u0637 \u0646\u0628\u0627\u06CC\u062F \u0628\u0627\u0632\u06CC \u0645\u0647\u0645 \u0631\u0627 \u0627\u0632 \u062F\u0633\u062A \u0628\u062F\u0647\u06CC.</p>
<p data-i="aboutP1">\u0645\u0646 \u0647\u0645\u06CC\u0634\u0647 \u0641\u0648\u062A\u0628\u0627\u0644 \u0631\u0627 \u062F\u0648\u0633\u062A \u062F\u0627\u0634\u062A\u0645\u060C \u0627\u0645\u0627 \u0646\u0647 \u0622\u0646\u200C\u0642\u062F\u0631 \u06A9\u0647 \u062A\u06A9\u200C\u062A\u06A9 \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0631\u0627 \u062F\u0646\u0628\u0627\u0644 \u06A9\u0646\u0645 \u06CC\u0627 \u0647\u0631 \u0647\u0641\u062A\u0647 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0644\u06CC\u06AF \u062F\u0627\u062E\u0644\u06CC \u0631\u0627 \u0628\u0628\u06CC\u0646\u0645. \u0686\u06CC\u0632\u06CC \u06A9\u0647 \u0647\u0645\u06CC\u0634\u0647 \u0628\u0631\u0627\u06CC\u0645 \u0645\u0647\u0645 \u0628\u0648\u062F\u060C \u067E\u06CC\u062F\u0627 \u06A9\u0631\u062F\u0646 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF \u0628\u0648\u062F\u061B \u0627\u0644\u200C\u06A9\u0644\u0627\u0633\u06CC\u06A9\u0648\u060C \u062F\u0631\u0628\u06CC\u200C\u0647\u0627\u06CC \u062D\u0633\u0627\u0633 \u0644\u06CC\u06AF \u0628\u0631\u062A\u0631 \u0627\u0646\u06AF\u0644\u06CC\u0633\u060C \u0634\u0628\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627 \u0648 \u0647\u0631 \u0645\u0633\u0627\u0628\u0642\u0647\u200C\u0627\u06CC \u06A9\u0647 \u0627\u0631\u0632\u0634 \u0648\u0642\u062A \u06AF\u0630\u0627\u0634\u062A\u0646 \u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F.</p>
<p data-i="aboutP2">\u0645\u0634\u06A9\u0644 \u0627\u06CC\u0646 \u0628\u0648\u062F \u06A9\u0647 \u0631\u0627\u0647 \u0633\u0627\u062F\u0647\u200C\u0627\u06CC \u0628\u0631\u0627\u06CC \u067E\u06CC\u062F\u0627 \u06A9\u0631\u062F\u0646 \u0627\u06CC\u0646 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627 \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0634\u062A. \u06CC\u0627 \u0628\u0627\u06CC\u062F \u0627\u067E\u0644\u06CC\u06A9\u06CC\u0634\u0646\u200C\u0647\u0627\u06CC\u06CC \u0646\u0635\u0628 \u0645\u06CC\u200C\u06A9\u0631\u062F\u0645 \u06A9\u0647 \u067E\u0631 \u0627\u0632 \u0627\u0639\u0644\u0627\u0646\u060C \u062E\u0628\u0631 \u0648 \u062D\u0627\u0634\u06CC\u0647 \u0628\u0648\u062F\u0646\u062F\u060C \u06CC\u0627 \u0633\u0627\u0639\u062A\u200C\u0647\u0627 \u062F\u0631 \u0633\u0627\u06CC\u062A\u200C\u0647\u0627\u06CC \u0648\u0631\u0632\u0634\u06CC \u0645\u06CC\u200C\u06AF\u0634\u062A\u0645 \u062A\u0627 \u0628\u0641\u0647\u0645\u0645 \u0628\u0627\u0632\u06CC \u0645\u0647\u0645 \u0628\u0639\u062F\u06CC \u06A9\u06CC \u0648 \u06A9\u062C\u0627\u0633\u062A.</p>
<p data-i="aboutP3">SportSignal \u0627\u0632 \u0647\u0645\u06CC\u0646\u200C\u062C\u0627 \u0634\u0631\u0648\u0639 \u0634\u062F.</p>
<p data-i="aboutP4">\u06CC\u06A9 \u067E\u0644\u062A\u0641\u0631\u0645 \u0633\u0627\u062F\u0647 \u0648 \u0645\u0646\u062A\u062E\u0628 \u0628\u0631\u0627\u06CC \u067E\u06CC\u062F\u0627 \u06A9\u0631\u062F\u0646 \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0645\u0647\u0645\u061B \u0628\u062F\u0648\u0646 \u063A\u0631\u0642 \u0634\u062F\u0646 \u062F\u0631 \u0627\u062E\u0628\u0627\u0631 \u0648 \u062D\u0627\u0634\u06CC\u0647\u200C\u0647\u0627. \u0641\u0642\u0637 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC\u06CC \u06A9\u0647 \u0648\u0627\u0642\u0639\u0627\u064B \u0627\u0631\u0632\u0634 \u062F\u06CC\u062F\u0646 \u062F\u0627\u0631\u0646\u062F.</p>
<p data-i="aboutP5">\u0686\u0648\u0646 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF \u0641\u0648\u062A\u0628\u0627\u0644 \u0641\u0642\u0637 \u06F9\u06F0 \u062F\u0642\u06CC\u0642\u0647 \u0645\u0633\u0627\u0628\u0642\u0647 \u0646\u06CC\u0633\u062A\u0646\u062F\u061B \u0644\u062D\u0638\u0647\u200C\u0647\u0627\u06CC\u06CC \u0647\u0633\u062A\u0646\u062F \u06A9\u0647 \u0645\u06CC\u0644\u06CC\u0648\u0646\u200C\u0647\u0627 \u0646\u0641\u0631 \u0631\u0627\u060C \u0641\u0627\u0631\u063A \u0627\u0632 \u0627\u06CC\u0646\u06A9\u0647 \u06A9\u062C\u0627 \u0632\u0646\u062F\u06AF\u06CC \u0645\u06CC\u200C\u06A9\u0646\u0646\u062F\u060C \u0628\u0647 \u0647\u0645 \u0648\u0635\u0644 \u0645\u06CC\u200C\u06A9\u0646\u0646\u062F.</p>
<p data-i="aboutP6">\u0641\u0631\u0642\u06CC \u0646\u0645\u06CC\u200C\u06A9\u0646\u062F \u0627\u0632 \u0627\u06CC\u0631\u0627\u0646 \u0628\u0627\u0634\u06CC\u060C \u0627\u0633\u062A\u0631\u0627\u0644\u06CC\u0627 \u06CC\u0627 \u0698\u0627\u067E\u0646. \u0648\u0642\u062A\u06CC \u0631\u0626\u0627\u0644 \u0645\u0627\u062F\u0631\u06CC\u062F \u0648 \u0628\u0627\u0631\u0633\u0644\u0648\u0646\u0627 \u0628\u0647 \u0645\u0635\u0627\u0641 \u0647\u0645 \u0645\u06CC\u200C\u0631\u0648\u0646\u062F\u060C \u0647\u0645\u0647 \u0645\u06CC\u200C\u062F\u0627\u0646\u06CC\u0645 \u06A9\u0647 \u06CC\u06A9 \u0628\u0627\u0632\u06CC \u0645\u0647\u0645 \u062F\u0631 \u0631\u0627\u0647 \u0627\u0633\u062A.</p>
<p data-i="aboutP7">SportSignal \u0633\u0627\u062E\u062A\u0647 \u0634\u062F \u062A\u0627 \u06A9\u0645\u06A9 \u06A9\u0646\u062F \u0622\u0646 \u0644\u062D\u0638\u0647\u200C\u0647\u0627 \u0631\u0627 \u0627\u0632 \u062F\u0633\u062A \u0646\u062F\u0647\u06CC.</p>
</div>
<div class="contactbox" id="contact">
<h3 data-i="hContact">\u{1F4E7} \u062A\u0645\u0627\u0633 \u0628\u0627 \u0645\u0627</h3>
<p data-i="contactP1">\u0627\u06AF\u0631 \u067E\u06CC\u0634\u0646\u0647\u0627\u062F\u06CC\u060C \u0627\u0646\u062A\u0642\u0627\u062F\u06CC\u060C \u06AF\u0632\u0627\u0631\u0634 \u0628\u0627\u06AF (Bug Hunt) \u06CC\u0627 \u0647\u0631 \u0646\u0648\u0639 \u0628\u0627\u0632\u062E\u0648\u0631\u062F\u06CC \u062F\u0627\u0631\u06CC\u062F\u060C \u062E\u0648\u0634\u062D\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0645 \u0622\u0646 \u0631\u0627 \u0628\u0627 \u0645\u0646 \u062F\u0631 \u0645\u06CC\u0627\u0646 \u0628\u06AF\u0630\u0627\u0631\u06CC\u062F.</p>
<p data-i="contactP2">\u0647\u0631 \u067E\u06CC\u0627\u0645 \u0631\u0627 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC\u062F \u0628\u0647 \u0627\u06CC\u0646 \u0622\u062F\u0631\u0633 \u0627\u06CC\u0645\u06CC\u0644 \u0627\u0631\u0633\u0627\u0644 \u06A9\u0646\u06CC\u062F:</p>
<div class="contact-cta"><a href="mailto:sportsignal@atomicmail.io" class="contact-email">sportsignal@atomicmail.io</a></div>
</div>
</div>
<div><span data-i="madeWith">\u0633\u0627\u062E\u062A\u0647\u200C\u0634\u062F\u0647 \u0628\u0627 \u2764\uFE0F</span> \u2014 <a href="/admin" data-i="adminLink">\u0648\u0631\u0648\u062F \u0645\u062F\u06CC\u0631\u06CC\u062A</a> \u2014 <a href="https://t.me/SportSignalAlertsBot" target="_blank" rel="noopener" data-i="botLink">\u0631\u0628\u0627\u062A \u062A\u0644\u06AF\u0631\u0627\u0645</a></div></footer>
<!-- v12.20 (the user's ask): sticky Telegram join CTA \u2014 the hero button
     scrolls away with the header; once the user is past it, this bottom bar
     keeps the primary call-to-action one tap away (safe-area padded). -->
<a id="joinSticky" href="https://t.me/SportSignalAlertsBot" target="_blank" rel="noopener" aria-label="\u062A\u0644\u06AF\u0631\u0627\u0645"><span class="js-inner"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="#fff" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg><span data-i="join">\u0639\u0636\u0648\u06CC\u062A \u062F\u0631 \u0631\u0628\u0627\u062A \u062A\u0644\u06AF\u0631\u0627\u0645</span></span></a>
<!-- v12.x-tg-fab: a floating Telegram FAB for PC view — a circular
     Telegram-brand-blue button with the paper-plane logo, fixed to
     the bottom-RIGHT corner in Farsi (RTL) and bottom-LEFT in English
     (LTR). Encourages users to follow the bot. Hidden on mobile (the
     #joinSticky bottom bar covers mobile CTA). The header CTA pill is
     retired on PC (see the #topbar .cta{display:none} rule below); this
     FAB replaces it. The tooltip + aria-label carry the join-i18n
     string so the language toggle updates it. -->
<a id="tgFab" href="https://t.me/SportSignalAlertsBot" target="_blank" rel="noopener" aria-label="Telegram" title="Telegram" data-promo="\u0628\u0631\u0627\u06CC \u062F\u0633\u062A \u0646\u062F\u0627\u062F\u0646 \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0645\u0647\u0645\u060C \u0628\u0647 \u0631\u0628\u0627\u062A \u062A\u0644\u06AF\u0631\u0627\u0645 \u0628\u067E\u06CC\u0648\u0646\u062F\u06CC\u062F \u2728"><svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path fill="#fff" d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg></a>
<script>
var I18N={
fa:{title:"\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648 \u2014 \u0627\u0639\u0644\u0627\u0646\u200C\u062F\u0647\u0646\u062F\u0647 \u0645\u0633\u0627\u0628\u0642\u0627\u062A",h1:"\u26BD \u0627\u0639\u0644\u0627\u0646\u200C\u062F\u0647\u0646\u062F\u0647 \u0645\u0633\u0627\u0628\u0642\u0627\u062A",sub1:"\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648\u060C \u0631\u0642\u0627\u0628\u062A\u200C\u0647\u0627\u06CC \u0635\u062F\u0631 \u062C\u062F\u0648\u0644 \u0648 \u0646\u062A\u0627\u06CC\u062C \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0645\u0646\u062A\u062E\u0628 \u2014 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u062E\u0648\u062F\u06A9\u0627\u0631",join:"\u0639\u0636\u0648\u06CC\u062A \u062F\u0631 \u0631\u0628\u0627\u062A \u062A\u0644\u06AF\u0631\u0627\u0645",hUpcoming:"\u{1F4C5} \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648",hFinished:"\u{1F3C1} \u0646\u062A\u0627\u06CC\u062C \u0627\u062E\u06CC\u0631",hLive:"\u{1F534} \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0632\u0646\u062F\u0647",moreResults:"\u0628\u06CC\u0634\u062A\u0631",lessResults:"\u06A9\u0645\u062A\u0631",loading:"\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...",noMatches:"\u0645\u0633\u0627\u0628\u0642\u0647\u200C\u0627\u06CC \u062F\u0631 \u0631\u0627\u0647 \u0646\u06CC\u0633\u062A",errLoad:"\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u062F\u0627\u062F\u0647\u200C\u0647\u0627",madeWith:"\u0633\u0627\u062E\u062A\u0647\u200C\u0634\u062F\u0647 \u0628\u0627 \u2764\uFE0F",adminLink:"\u0648\u0631\u0648\u062F \u0645\u062F\u06CC\u0631\u06CC\u062A",botLink:"\u0631\u0628\u0627\u062A \u062A\u0644\u06AF\u0631\u0627\u0645",soon:"\u0628\u0647\u200C\u0632\u0648\u062F\u06CC",inDays:"\u062F\u0631 %d \u0631\u0648\u0632",barNext:"\u26A1 \u062A\u0627 \u0628\u0627\u0632\u06CC \u0628\u0632\u0631\u06AF \u0628\u0639\u062F\u06CC",barFallback:"\u23F3 \u062A\u0627 \u0645\u0633\u0627\u0628\u0642\u0647 \u0628\u0639\u062F\u06CC",barLive:"\u{1F534} \u062F\u0631 \u062C\u0631\u06CC\u0627\u0646",barIdle:"\u23F3 \u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u0628\u0627\u0632\u06CC \u0628\u0639\u062F\u06CC",barBase:"\u0646\u0648\u0627\u0631 \u067E\u06CC\u0634\u0631\u0641\u062A \u062F\u0631 \u06F2\u06F4 \u0633\u0627\u0639\u062A \u067E\u0627\u06CC\u0627\u0646\u06CC \u0642\u0628\u0644 \u0627\u0632 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC \u067E\u0631 \u0645\u06CC\u200C\u0634\u0648\u062F \u0648 \u062F\u0631 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC \u0628\u0647 \u06F1\u06F0\u06F0\u066A \u0645\u06CC\u200C\u0631\u0633\u062F",uDay:"\u0631\u0648\u0632",uHour:"\u0633\u0627\u0639\u062A",uMin:"\u062F\u0642\u06CC\u0642\u0647",uSec:"\u062B\u0627\u0646\u06CC\u0647",live:"\u062F\u0631 \u062D\u0627\u0644 \u0628\u0631\u06AF\u0632\u0627\u0631\u06CC",pen:"\u067E\u0646\u0627\u0644\u062A\u06CC",own:"\u06AF\u0644 \u0628\u0647 \u062E\u0648\u062F\u06CC",derby:"\u{1F525} \u062F\u0631\u0628\u06CC",hUcl:"\u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627",hUclNext:"\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0645\u0647\u0645 \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627",hLgNext:"\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0628\u0632\u0631\u06AF \u067E\u06CC\u0634\u200C\u0631\u0648",hWeek:"\u{1F4C5} \u062F\u0631 \u0627\u06CC\u0646 \u0647\u0641\u062A\u0647",hWeekNext:"\u{1F4C5} \u0647\u0641\u062A\u0647 \u0628\u0639\u062F",wkDone:"\u067E\u0627\u06CC\u0627\u0646\u200C\u06CC\u0627\u0641\u062A\u0647",navHome:"\u062E\u0627\u0646\u0647",navAbout:"\u062F\u0631\u0628\u0627\u0631\u0647",navContact:"\u062A\u0645\u0627\u0633",thP:"\u0628\u0627\u0632\u06CC",thW:"\u0628\u0631\u062F",thD:"\u0645\u0633\u0627\u0648\u06CC",thL:"\u0628\u0627\u062E\u062A",thGF:"\u06AF\u0644 \u0632\u062F\u0647",thGA:"\u06AF\u0644 \u062E\u0648\u0631\u062F\u0647",thGD:"\u062A\u0641\u0627\u0636\u0644",thPts:"\u0627\u0645\u062A\u06CC\u0627\u0632",topBadge:"\u0635\u062F\u0631 \u062C\u062F\u0648\u0644",hStandings:"\u{1F4CA} \u062C\u062F\u0648\u0644 \u0644\u06CC\u06AF\u200C\u0647\u0627",hCups:"\u{1F3C6} \u062C\u0627\u0645\u200C\u0647\u0627\u06CC \u062D\u0630\u0641\u06CC",stEmpty:"\u062C\u062F\u0648\u0644 \u0647\u0646\u0648\u0632 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A",stNot:"\u0634\u0631\u0648\u0639 \u0646\u0634\u062F\u0647",tierGold:"\u{1F947} \u0633\u0637\u062D \u0637\u0644\u0627 \u2014 \u0627\u0631\u0648\u067E\u0627 \u0648 \u0628\u06CC\u0646\u0627\u0644\u0645\u0644\u0644",tierSilver:"\u{1F948} \u0633\u0637\u062D \u0646\u0642\u0631\u0647 \u2014 \u0627\u0631\u0648\u067E\u0627",tierBronze:"\u{1F949} \u0633\u0637\u062D \u0628\u0631\u0646\u0632 \u2014 \u0627\u0631\u0648\u067E\u0627",cEN:"\u{1F3F4} \u0627\u0646\u06AF\u0644\u0633\u062A\u0627\u0646",cES:"\u{1F1EA}\u{1F1F8} \u0627\u0633\u067E\u0627\u0646\u06CC\u0627",cIT:"\u{1F1EE}\u{1F1F9} \u0627\u06CC\u062A\u0627\u0644\u06CC\u0627",cIR:"\u{1F1EE}\u{1F1F7} \u0627\u06CC\u0631\u0627\u0646",cDE:"\u{1F1E9}\u{1F1EA} \u0622\u0644\u0645\u0627\u0646",cupsNone:"\u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0627\u06CC \u0647\u0646\u0648\u0632 \u0627\u0639\u0644\u0627\u0645 \u0646\u0634\u062F\u0647",tierEurope:"\u{1F3C6} \u0644\u06CC\u06AF\u200C\u0647\u0627\u06CC \u0642\u0627\u0631\u0647 \u0627\u0631\u0648\u067E\u0627",intlCups:"\u{1F3C6} \u062C\u0627\u0645\u200C\u0647\u0627\u06CC \u0628\u06CC\u0646\u200C\u0627\u0644\u0645\u0644\u0644\u06CC",share:"\u0627\u0634\u062A\u0631\u0627\u06A9\u200C\u06AF\u0630\u0627\u0631\u06CC",copy:"\u06A9\u067E\u06CC \u0645\u062A\u0646",copied:"\u06A9\u067E\u06CC \u0634\u062F \u2713",titleL:"\u0648\u0631\u0648\u062F \u2014 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0631\u0628\u0627\u062A",loginH1:"\u{1F510} \u0648\u0631\u0648\u062F \u0628\u0647 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0631\u0628\u0627\u062A",lbUser:"\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC",lbPass:"\u0631\u0645\u0632 \u0639\u0628\u0648\u0631",btnLogin:"\u0648\u0631\u0648\u062F",errUser:"\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F",errRate:"\u062A\u0644\u0627\u0634 \u0628\u06CC\u0634 \u0627\u0632 \u062D\u062F \u2014 \u0686\u0646\u062F \u062F\u0642\u06CC\u0642\u0647 \u062F\u06CC\u06AF\u0631 \u0627\u0645\u062A\u062D\u0627\u0646 \u06A9\u0646\u06CC\u062F",errCreds:"\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC \u06CC\u0627 \u0631\u0645\u0632 \u0627\u0634\u062A\u0628\u0627\u0647 \u0627\u0633\u062A",titleA:"\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0631\u0628\u0627\u062A \u0627\u0639\u0644\u0627\u0646 \u0645\u0633\u0627\u0628\u0642\u0627\u062A",h1A:"\u2699\uFE0F \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0631\u0628\u0627\u062A \u0627\u0639\u0644\u0627\u0646 \u0645\u0633\u0627\u0628\u0642\u0627\u062A",hLogin:"\u{1F511} \u0648\u0631\u0648\u062F",tokenPh:"\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0645\u062F\u06CC\u0631\u06CC\u062A (admin password)",hStatus:"\u{1F4CA} \u0648\u0636\u0639\u06CC\u062A",stLoading:"\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...",stErr:"\u274C \u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u0648\u0636\u0639\u06CC\u062A \u2014 \u062F\u0648\u0628\u0627\u0631\u0647 \u0648\u0627\u0631\u062F \u0634\u0648\u06CC\u062F \u06CC\u0627 \u062A\u0648\u06A9\u0646 \u0631\u0627 \u0628\u0631\u0631\u0633\u06CC \u06A9\u0646\u06CC\u062F",stLastRun:"\u{1F552} \u0622\u062E\u0631\u06CC\u0646 \u0627\u062C\u0631\u0627",stApi:"\u{1F4E1} \u0645\u0646\u0628\u0639 API",stUsers:"\u{1F465} \u06A9\u0627\u0631\u0628\u0631\u0627\u0646",stIds:"\u{1F194} \u0634\u0646\u0627\u0633\u0647\u200C\u0647\u0627",stTz:"\u{1F30D} \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC",btnRefresh:"\u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0648\u0636\u0639\u06CC\u062A",btnTest:"\u{1F4E8} \u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645 \u062A\u0633\u062A",btnSim:"\u{1F9EA} \u0634\u0628\u06CC\u0647\u200C\u0633\u0627\u0632\u06CC \u06F5 \u0627\u0639\u0644\u0627\u0646",btnSources:"\u{1F4E1} \u0628\u0631\u0631\u0633\u06CC \u0645\u0646\u0627\u0628\u0639 API",btnLogout:"\u{1F6AA} \u062E\u0631\u0648\u062C",hBroadcast:"\u{1F4E3} \u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645 \u0628\u0647 \u0647\u0645\u0647 \u06A9\u0627\u0631\u0628\u0631\u0627\u0646",lbBroadcast:"\u0645\u062A\u0646 \u067E\u06CC\u0627\u0645 (\u0628\u0647 \u0641\u0627\u0631\u0633\u06CC \u06CC\u0627 \u0627\u0646\u06AF\u0644\u06CC\u0633\u06CC)",bcPh:"\u0645\u062A\u0646 \u067E\u06CC\u0627\u0645...",btnBroadcast:"\u{1F4E3} \u0627\u0631\u0633\u0627\u0644 \u0628\u0631\u0627\u06CC \u0647\u0645\u0647",hMatches:"\u26BD \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648",btnRefreshM:"\u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0645\u0633\u0627\u0628\u0642\u0627\u062A",hSettings:"\u2699\uFE0F \u062A\u0646\u0638\u06CC\u0645\u0627\u062A",lbTz:"\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC",lbLeagues:"\u0644\u06CC\u06AF\u200C\u0647\u0627\u06CC \u062A\u062D\u062A \u067E\u0648\u0634\u0634 (\u06A9\u062F\u0647\u0627 \u0628\u0627 \u06A9\u0627\u0645\u0627)",elNote:"EL \u0648 ECL \u062A\u0648\u0633\u0637 SportScore \u067E\u0648\u0634\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F \u0648 \u0646\u06CC\u0627\u0632\u06CC \u0628\u0647 \u0627\u0641\u0632\u0648\u062F\u0646 \u0646\u062F\u0627\u0631\u0646\u062F.",lbTeams:"\u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0645\u0646\u062A\u062E\u0628 \u0647\u0631 \u0644\u06CC\u06AF",teamPh:"\u0646\u0627\u0645 \u062A\u06CC\u0645 \u062C\u062F\u06CC\u062F",btnAdd:"+ \u0627\u0641\u0632\u0648\u062F\u0646",btnSave:"\u{1F4BE} \u0630\u062E\u06CC\u0631\u0647 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A",btnBackup:"\u2B07\uFE0F \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u200C\u06AF\u06CC\u0631\u06CC \u062A\u0646\u0638\u06CC\u0645\u0627\u062A",hPass:"\u{1F511} \u062A\u063A\u06CC\u06CC\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631",lbNp1:"\u0631\u0645\u0632 \u062C\u062F\u06CC\u062F (\u062D\u062F\u0627\u0642\u0644 \u06F8 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631)",lbNp2:"\u062A\u06A9\u0631\u0627\u0631 \u0631\u0645\u0632 \u062C\u062F\u06CC\u062F",btnCp:"\u062A\u063A\u06CC\u06CC\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631",cal:"\u0627\u0641\u0632\u0648\u062F\u0646 \u0628\u0647 \u06AF\u0648\u06AF\u0644 \u062A\u0642\u0648\u06CC\u0645",tzBtn:"\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC",tzTitle:"\u{1F30D} \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC",tzSearch:"\u062C\u0633\u062A\u062C\u0648\u06CC \u06A9\u0634\u0648\u0631 \u06CC\u0627 \u0634\u0647\u0631\u2026",tzClose:"\u0628\u0633\u062A\u0646",lastUpd:"\u0622\u062E\u0631\u06CC\u0646 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC: %s",ver:"\u0646\u0633\u062E\u0647 \u06F1\u06F2.\u06F3\u06F3-xpost \u2014 \u067E\u0631\u0648\u0641\u0627\u06CC\u0644 \u062E\u0648\u062F\u06A9\u0627\u0631 X\u060C \u0627\u0645\u0636\u0627\u06CC OAuth 1.0a \u0628\u0627 HMAC-SHA1\u060C \u0622\u06CC\u0646\u0647\u200C\u06CC \u0641\u0627\u0631\u0633\u06CC \u0627\u0639\u0644\u0627\u0646\u200C\u0647\u0627\u06CC \u0635\u062F\u0631\u0646\u0634\u06CC\u0646\u060C \u0646\u062A\u06CC\u062C\u0647\u060C \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC \u0648 \u062C\u062F\u0648\u0644 \u0647\u0641\u062A\u06AF\u06CC\u060C \u0645\u062D\u062F\u0648\u062F\u06AF\u0631 \u0628\u0648\u062F\u062C\u0647 KV (\u06F4\u06F5\u06F0 \u0645\u0627\u0647\u0627\u0646\u0647\u060C \u06F1\u06F2 \u0631\u0648\u0632\u0627\u0646\u0647)\u060C \u062D\u0627\u0644\u062A dry-run \u0648 \u06A9\u0627\u0631\u062A \u0648\u0636\u0639\u06CC\u062A X \u062F\u0631 \u067E\u0646\u0644 \u0645\u062F\u06CC\u0631\u06CC\u062A",mToken:"\u0648\u0631\u0648\u062F \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u2014 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u06CC\u0627 \u0646\u0634\u0633\u062A \u0645\u0646\u0642\u0636\u06CC \u0634\u062F\u0647",mErr:"\u062E\u0637\u0627: ",mEnterToken:"\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F",mSaved:"\u2705 \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F",mLoginFirst:"\u0627\u0628\u062A\u062F\u0627 \u0648\u0627\u0631\u062F \u0634\u0648\u06CC\u062F",mBackup:"\u2B07\uFE0F \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u200C\u06AF\u06CC\u0631\u06CC \u0634\u062F",mPassShort:"\u0631\u0645\u0632 \u0628\u0627\u06CC\u062F \u062D\u062F\u0627\u0642\u0644 \u06F8 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631 \u0628\u0627\u0634\u062F",mPassMismatch:"\u0631\u0645\u0632\u0647\u0627 \u06CC\u06A9\u0633\u0627\u0646 \u0646\u06CC\u0633\u062A\u0646\u062F",mPassOk:"\u{1F511} \u0631\u0645\u0632 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062A\u063A\u06CC\u06CC\u0631 \u06A9\u0631\u062F",mSentTo:"\u{1F4E3} \u0627\u0631\u0633\u0627\u0644 \u0634\u062F \u0628\u0647 %s \u0627\u0632 %s \u06A9\u0627\u0631\u0628\u0631",mTestSent:"\u{1F4E8} \u062A\u0633\u062A \u0627\u0631\u0633\u0627\u0644 \u0634\u062F \u0628\u0647 %s \u06A9\u0627\u0631\u0628\u0631",mSimPrefix:"\u{1F9EA} \u0634\u0628\u06CC\u0647\u200C\u0633\u0627\u0632\u06CC: ",mNoNotif:"\u26A0\uFE0F \u0647\u06CC\u0686 \u0627\u0639\u0644\u0627\u0646\u06CC \u0627\u0631\u0633\u0627\u0644 \u0646\u0634\u062F",mNoMatches:"\u0645\u0633\u0627\u0628\u0642\u0647\u200C\u0627\u06CC \u062F\u0631 \u0631\u0627\u0647 \u0646\u06CC\u0633\u062A",mErrMatches:"\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u0645\u0633\u0627\u0628\u0642\u0627\u062A",mEnterText:"\u0645\u062A\u0646 \u067E\u06CC\u0627\u0645 \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F",mErrSrc:"\u274C \u062E\u0637\u0627",acHint:"\u{1F4A1} \u0647\u0646\u06AF\u0627\u0645 \u062A\u0627\u06CC\u067E\u060C \u0646\u0627\u0645 \u062F\u0642\u06CC\u0642 \u0628\u0627\u0634\u06AF\u0627\u0647 \u0627\u0632 \u0641\u0647\u0631\u0633\u062A API \u067E\u06CC\u0634\u0646\u0647\u0627\u062F \u0645\u06CC\u200C\u0634\u0648\u062F \u2014 \u0628\u0631\u0627\u06CC \u062B\u0628\u062A \u0628\u06CC\u200C\u062E\u0637\u0627 \u06CC\u06A9\u06CC \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F.",acNone:"\u0628\u0627\u0634\u06AF\u0627\u0647\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u0646\u0627\u0645 \u062F\u0631 \u0641\u0647\u0631\u0633\u062A \u0646\u06CC\u0633\u062A",acAdd:"\u2705 %s \u0627\u0641\u0632\u0648\u062F\u0647 \u0634\u062F",acAddUcl:"\u2705 %s \u0627\u0641\u0632\u0648\u062F\u0647 \u0634\u062F \u2014 \u0628\u0631\u0627\u06CC \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627 \u0647\u0645 \u0627\u0646\u062A\u062E\u0627\u0628 \u0634\u062F",uclSync:"\u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627\u06CC \u0647\u0631 \u0644\u06CC\u06AF \u0628\u0647\u200C\u0635\u0648\u0631\u062A \u062E\u0648\u062F\u06A9\u0627\u0631 \u0628\u0631\u0627\u06CC \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627 \u0647\u0645 \u0627\u0646\u062A\u062E\u0627\u0628 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F",acDup:"\u26A0\uFE0F %s \u0627\u0632 \u0642\u0628\u0644 \u062F\u0631 \u0627\u06CC\u0646 \u0644\u06CC\u06AF \u0647\u0633\u062A",btnClubs:"\u{1F504} \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627",clubsMeta:"\u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627: %s \u0628\u0627\u0634\u06AF\u0627\u0647 \u2014 \u0622\u062E\u0631\u06CC\u0646 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC: %s",clubsNone:"\u26A0\uFE0F \u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627 \u0647\u0646\u0648\u0632 \u0633\u0627\u062E\u062A\u0647 \u0646\u0634\u062F\u0647 \u2014 \u062F\u06A9\u0645\u0647 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0631\u0627 \u0628\u0632\u0646\u06CC\u062F",mClubs:"\u2705 \u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0634\u062F (%s \u0628\u0627\u0634\u06AF\u0627\u0647)",clubsErr:"\u274C \u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A",hMembers:"\u{1F465} \u0627\u0639\u0636\u0627\u06CC \u0631\u0628\u0627\u062A",btnMembers:"\u{1F504} \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0627\u0639\u0636\u0627",membersNone:"\u0647\u0646\u0648\u0632 \u0639\u0636\u0648\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A \u2014 \u06A9\u0627\u0631\u0628\u0631\u0627\u0646 \u0628\u0627\u06CC\u062F \u0631\u0628\u0627\u062A \u0631\u0627 /start \u06A9\u0646\u0646\u062F",memId:"\u0634\u0646\u0627\u0633\u0647",memSlug:"\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC",memName:"\u0646\u0627\u0645",memJoined:"\u062A\u0627\u0631\u06CC\u062E \u0639\u0636\u0648\u06CC\u062A",memCount:"%s \u0639\u0636\u0648",hAbout:"\u{1F4D8} \u062F\u0631\u0628\u0627\u0631\u0647 SportSignal",aboutTag:"\u0642\u0631\u0627\u0631 \u0646\u06CC\u0633\u062A \u0647\u0631 \u0645\u0633\u0627\u0628\u0642\u0647\u200C\u0627\u06CC \u0631\u0627 \u0628\u0628\u06CC\u0646\u06CC\u061B \u0641\u0642\u0637 \u0646\u0628\u0627\u06CC\u062F \u0628\u0627\u0632\u06CC \u0645\u0647\u0645 \u0631\u0627 \u0627\u0632 \u062F\u0633\u062A \u0628\u062F\u0647\u06CC.",aboutP1:"\u0645\u0646 \u0647\u0645\u06CC\u0634\u0647 \u0641\u0648\u062A\u0628\u0627\u0644 \u0631\u0627 \u062F\u0648\u0633\u062A \u062F\u0627\u0634\u062A\u0645\u060C \u0627\u0645\u0627 \u0646\u0647 \u0622\u0646\u200C\u0642\u062F\u0631 \u06A9\u0647 \u062A\u06A9\u200C\u062A\u06A9 \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0631\u0627 \u062F\u0646\u0628\u0627\u0644 \u06A9\u0646\u0645 \u06CC\u0627 \u0647\u0631 \u0647\u0641\u062A\u0647 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0644\u06CC\u06AF \u062F\u0627\u062E\u0644\u06CC \u0631\u0627 \u0628\u0628\u06CC\u0646\u0645. \u0686\u06CC\u0632\u06CC \u06A9\u0647 \u0647\u0645\u06CC\u0634\u0647 \u0628\u0631\u0627\u06CC\u0645 \u0645\u0647\u0645 \u0628\u0648\u062F\u060C \u067E\u06CC\u062F\u0627 \u06A9\u0631\u062F\u0646 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF \u0628\u0648\u062F\u061B \u0627\u0644\u200C\u06A9\u0644\u0627\u0633\u06CC\u06A9\u0648\u060C \u062F\u0631\u0628\u06CC\u200C\u0647\u0627\u06CC \u062D\u0633\u0627\u0633 \u0644\u06CC\u06AF \u0628\u0631\u062A\u0631 \u0627\u0646\u06AF\u0644\u06CC\u0633\u060C \u0634\u0628\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627 \u0648 \u0647\u0631 \u0645\u0633\u0627\u0628\u0642\u0647\u200C\u0627\u06CC \u06A9\u0647 \u0627\u0631\u0632\u0634 \u0648\u0642\u062A \u06AF\u0630\u0627\u0634\u062A\u0646 \u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F.",aboutP2:"\u0645\u0634\u06A9\u0644 \u0627\u06CC\u0646 \u0628\u0648\u062F \u06A9\u0647 \u0631\u0627\u0647 \u0633\u0627\u062F\u0647\u200C\u0627\u06CC \u0628\u0631\u0627\u06CC \u067E\u06CC\u062F\u0627 \u06A9\u0631\u062F\u0646 \u0627\u06CC\u0646 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627 \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0634\u062A. \u06CC\u0627 \u0628\u0627\u06CC\u062F \u0627\u067E\u0644\u06CC\u06A9\u06CC\u0634\u0646\u200C\u0647\u0627\u06CC\u06CC \u0646\u0635\u0628 \u0645\u06CC\u200C\u06A9\u0631\u062F\u0645 \u06A9\u0647 \u067E\u0631 \u0627\u0632 \u0627\u0639\u0644\u0627\u0646\u060C \u062E\u0628\u0631 \u0648 \u062D\u0627\u0634\u06CC\u0647 \u0628\u0648\u062F\u0646\u062F\u060C \u06CC\u0627 \u0633\u0627\u0639\u062A\u200C\u0647\u0627 \u062F\u0631 \u0633\u0627\u06CC\u062A\u200C\u0647\u0627\u06CC \u0648\u0631\u0632\u0634\u06CC \u0645\u06CC\u200C\u06AF\u0634\u062A\u0645 \u062A\u0627 \u0628\u0641\u0647\u0645\u0645 \u0628\u0627\u0632\u06CC \u0645\u0647\u0645 \u0628\u0639\u062F\u06CC \u06A9\u06CC \u0648 \u06A9\u062C\u0627\u0633\u062A.",aboutP3:"SportSignal \u0627\u0632 \u0647\u0645\u06CC\u0646\u200C\u062C\u0627 \u0634\u0631\u0648\u0639 \u0634\u062F.",aboutP4:"\u06CC\u06A9 \u067E\u0644\u062A\u0641\u0631\u0645 \u0633\u0627\u062F\u0647 \u0648 \u0645\u0646\u062A\u062E\u0628 \u0628\u0631\u0627\u06CC \u067E\u06CC\u062F\u0627 \u06A9\u0631\u062F\u0646 \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0645\u0647\u0645\u061B \u0628\u062F\u0648\u0646 \u063A\u0631\u0642 \u0634\u062F\u0646 \u062F\u0631 \u0627\u062E\u0628\u0627\u0631 \u0648 \u062D\u0627\u0634\u06CC\u0647\u200C\u0647\u0627. \u0641\u0642\u0637 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC\u06CC \u06A9\u0647 \u0648\u0627\u0642\u0639\u0627\u064B \u0627\u0631\u0632\u0634 \u062F\u06CC\u062F\u0646 \u062F\u0627\u0631\u0646\u062F.",aboutP5:"\u0686\u0648\u0646 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF \u0641\u0648\u062A\u0628\u0627\u0644 \u0641\u0642\u0637 \u06F9\u06F0 \u062F\u0642\u06CC\u0642\u0647 \u0645\u0633\u0627\u0628\u0642\u0647 \u0646\u06CC\u0633\u062A\u0646\u062F\u061B \u0644\u062D\u0638\u0647\u200C\u0647\u0627\u06CC\u06CC \u0647\u0633\u062A\u0646\u062F \u06A9\u0647 \u0645\u06CC\u0644\u06CC\u0648\u0646\u200C\u0647\u0627 \u0646\u0641\u0631 \u0631\u0627\u060C \u0641\u0627\u0631\u063A \u0627\u0632 \u0627\u06CC\u0646\u06A9\u0647 \u06A9\u062C\u0627 \u0632\u0646\u062F\u06AF\u06CC \u0645\u06CC\u200C\u06A9\u0646\u0646\u062F\u060C \u0628\u0647 \u0647\u0645 \u0648\u0635\u0644 \u0645\u06CC\u200C\u06A9\u0646\u0646\u062F.",aboutP6:"\u0641\u0631\u0642\u06CC \u0646\u0645\u06CC\u200C\u06A9\u0646\u062F \u0627\u0632 \u0627\u06CC\u0631\u0627\u0646 \u0628\u0627\u0634\u06CC\u060C \u0627\u0633\u062A\u0631\u0627\u0644\u06CC\u0627 \u06CC\u0627 \u0698\u0627\u067E\u0646. \u0648\u0642\u062A\u06CC \u0631\u0626\u0627\u0644 \u0645\u0627\u062F\u0631\u06CC\u062F \u0648 \u0628\u0627\u0631\u0633\u0644\u0648\u0646\u0627 \u0628\u0647 \u0645\u0635\u0627\u0641 \u0647\u0645 \u0645\u06CC\u200C\u0631\u0648\u0646\u062F\u060C \u0647\u0645\u0647 \u0645\u06CC\u200C\u062F\u0627\u0646\u06CC\u0645 \u06A9\u0647 \u06CC\u06A9 \u0628\u0627\u0632\u06CC \u0645\u0647\u0645 \u062F\u0631 \u0631\u0627\u0647 \u0627\u0633\u062A.",aboutP7:"SportSignal \u0633\u0627\u062E\u062A\u0647 \u0634\u062F \u062A\u0627 \u06A9\u0645\u06A9 \u06A9\u0646\u062F \u0622\u0646 \u0644\u062D\u0638\u0647\u200C\u0647\u0627 \u0631\u0627 \u0627\u0632 \u062F\u0633\u062A \u0646\u062F\u0647\u06CC.",hContact:"\u{1F4E7} \u062A\u0645\u0627\u0633 \u0628\u0627 \u0645\u0627",contactP1:"\u0627\u06AF\u0631 \u067E\u06CC\u0634\u0646\u0647\u0627\u062F\u06CC\u060C \u0627\u0646\u062A\u0642\u0627\u062F\u06CC\u060C \u06AF\u0632\u0627\u0631\u0634 \u0628\u0627\u06AF (Bug Hunt) \u06CC\u0627 \u0647\u0631 \u0646\u0648\u0639 \u0628\u0627\u0632\u062E\u0648\u0631\u062F\u06CC \u062F\u0627\u0631\u06CC\u062F\u060C \u062E\u0648\u0634\u062D\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0645 \u0622\u0646 \u0631\u0627 \u0628\u0627 \u0645\u0646 \u062F\u0631 \u0645\u06CC\u0627\u0646 \u0628\u06AF\u0630\u0627\u0631\u06CC\u062F.",contactP2:"\u0647\u0631 \u067E\u06CC\u0627\u0645 \u0631\u0627 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC\u062F \u0628\u0647 \u0627\u06CC\u0646 \u0622\u062F\u0631\u0633 \u0627\u06CC\u0645\u06CC\u0644 \u0627\u0631\u0633\u0627\u0644 \u06A9\u0646\u06CC\u062F:"},
en:{title:"Upcoming Matches \u2014 Match Notifier",h1:"\u26BD Match Notifier",sub1:"Fixtures, top-of-the-table clashes & results \u2014 auto-refreshed",join:"Join the Telegram bot",hUpcoming:"\u{1F4C5} Upcoming Matches",hFinished:"\u{1F3C1} Recent Results",hLive:"\u{1F534} Live Matches",moreResults:"More",lessResults:"Less",loading:"Loading...",noMatches:"No matches ahead",errLoad:"Error loading data",madeWith:"Made with \u2764\uFE0F",adminLink:"Admin login",botLink:"Telegram bot",soon:"Soon",inDays:"in %d days",barNext:"\u26A1 Until the next big match",barFallback:"\u23F3 Until the next match",barLive:"\u{1F534} Live now",barIdle:"\u23F3 Waiting for the next match",barBase:"The bar fills during the final 24 hours before kickoff and reaches 100% at kickoff",uDay:"d",uHour:"h",uMin:"m",uSec:"s",live:"LIVE",pen:"Penalty",own:"Own goal",derby:"\u{1F525} Derby",hUcl:"UEFA Champions League",hUclNext:"Big UCL Matches",hLgNext:"Big Upcoming Matches",hWeek:"\u{1F4C5} This Week",hWeekNext:"\u{1F4C5} Next Week",wkDone:"Finished",navHome:"Home",navAbout:"About",navContact:"Contact",thP:"P",thW:"W",thD:"D",thL:"L",thGF:"GF",thGA:"GA",thGD:"GD",thPts:"Pts",topBadge:"Top 3",hStandings:"\u{1F4CA} League Standings",hCups:"\u{1F3C6} Tournaments",stEmpty:"Standings not available yet",stNot:"Not started",tierGold:"\u{1F947} Gold tier \u2014 Europe & international",tierSilver:"\u{1F948} Silver tier \u2014 Europe",tierBronze:"\u{1F949} Bronze tier \u2014 Europe",cEN:"\u{1F3F4} England",cES:"\u{1F1EA}\u{1F1F8} Spain",cIT:"\u{1F1EE}\u{1F1F9} Italy",cIR:"\u{1F1EE}\u{1F1F7} Iran",cupsNone:"No fixture announced yet",tierEurope:"\u{1F3C6} European Continental Leagues",intlCups:"\u{1F3C6} International Cups",share:"Share",copy:"Copy text",copied:"Copied \u2713",titleL:"Login \u2014 Bot Admin",loginH1:"\u{1F510} Bot Admin Login",lbUser:"Username",lbPass:"Password",btnLogin:"Login",errUser:"Enter your username",errRate:"Too many attempts \u2014 try again in a few minutes",errCreds:"Wrong username or password",titleA:"Match Bot Settings",h1A:"\u2699\uFE0F Bot Settings",hLogin:"\u{1F511} Login",tokenPh:"Admin password",hStatus:"\u{1F4CA} Status",stLoading:"Loading...",stErr:"\u274C Status error \u2014 re-login or check token",stLastRun:"\u{1F552} Last run",stApi:"\u{1F4E1} API source",stUsers:"\u{1F465} Users",stIds:"\u{1F194} IDs",stTz:"\u{1F30D} Timezone",btnRefresh:"Refresh status",btnTest:"\u{1F4E8} Send test message",btnSim:"\u{1F9EA} Simulate 5 alerts",btnSources:"\u{1F4E1} Check API sources",btnLogout:"\u{1F6AA} Logout",hBroadcast:"\u{1F4E3} Broadcast to all users",lbBroadcast:"Message text (FA or EN)",bcPh:"Message...",btnBroadcast:"\u{1F4E3} Send to all",hMatches:"\u26BD Upcoming Matches",btnRefreshM:"Refresh matches",hSettings:"\u2699\uFE0F Settings",lbTz:"Timezone",lbLeagues:"Leagues (comma-separated codes)",elNote:"EL & ECL are covered by SportScore \u2014 no need to add them.",lbTeams:"Selected teams per league",teamPh:"New team name",btnAdd:"+ Add",btnSave:"\u{1F4BE} Save settings",btnBackup:"\u2B07\uFE0F Backup settings",hPass:"\u{1F511} Change password",lbNp1:"New password (min 8 chars)",lbNp2:"Repeat new password",btnCp:"Change password",cal:"Add to Google Calendar",tzBtn:"Timezone",tzTitle:"\u{1F30D} Timezone",tzSearch:"Search country or city\u2026",tzClose:"Close",lastUpd:"Last updated: %s",ver:"v12.33-xpost \u2014 X (Twitter) automated profile: OAuth 1.0a HMAC-SHA1 signing inline, Persian mirrors of coronation/FT/kickoff/weekly-tables, KV budget governor (450/month, 12/day), dry-run toggle + admin X status card",mToken:"Invalid login \u2014 wrong password or expired session",mErr:"Error: ",mEnterToken:"Enter the admin password",mSaved:"\u2705 Saved",mLoginFirst:"Log in first",mBackup:"\u2B07\uFE0F Backup downloaded",mPassShort:"Password must be at least 8 characters",mPassMismatch:"Passwords do not match",mPassOk:"\u{1F511} Password changed",mSentTo:"\u{1F4E3} Sent to %s of %s users",mTestSent:"\u{1F4E8} Test sent to %s users",mSimPrefix:"\u{1F9EA} Simulate: ",mNoNotif:"\u26A0\uFE0F No notifications sent",mNoMatches:"No matches ahead",mErrMatches:"Error loading matches",mEnterText:"Enter a message",mErrSrc:"\u274C error",acHint:"\u{1F4A1} As you type, the exact API club name is suggested \u2014 pick one to store it safely.",acNone:"No club with that name in the catalog",acAdd:"\u2705 %s added",acAddUcl:"\u2705 %s added \u2014 also selected for the Champions League",uclSync:"Clubs added in any league are auto-selected for the Champions League too",acDup:"\u26A0\uFE0F %s is already in this league",btnClubs:"\u{1F504} Refresh club list",clubsMeta:"Club catalog: %s clubs \u2014 last updated: %s",clubsNone:"\u26A0\uFE0F Club catalog not built yet \u2014 press Refresh",mClubs:"\u2705 Club list refreshed (%s clubs)",clubsErr:"\u274C Club list unavailable",hMembers:"\u{1F465} Bot Members",btnMembers:"\u{1F504} Refresh members",membersNone:"No members yet \u2014 users must /start the bot",memId:"ID",memSlug:"Username",memName:"Name",memJoined:"Joined",memCount:"%s members",hAbout:"\u{1F4D8} About SportSignal",aboutTag:"You don't need to watch every match. You just shouldn't miss the important ones.",aboutP1:"I've always loved football, but never enough to follow every single match or keep up with every game in the domestic league. What I always cared about was finding the big games \u2014 El Cl\u00e1sico, the biggest Premier League derbies, Champions League nights, and any match that was genuinely worth making time for.",aboutP2:"The problem was, there was never an easy way to find them. I either had to install apps that drained my battery and buried me under endless notifications, news, and football drama, or spend hours browsing sports websites just to figure out when the next big game was.",aboutP3:"That's where SportSignal started.",aboutP4:"A simple, curated platform for discovering the matches that matter \u2014 without getting lost in the noise, news, and endless football coverage. Just the games that are actually worth watching.",aboutP5:"Because big football matches are more than 90 minutes of football. They are moments that bring millions of people together, no matter where they live.",aboutP6:"It doesn't matter whether you're from Iran, Australia, or Japan. When Real Madrid and Barcelona face each other, we all know a big game is coming.",aboutP7:"SportSignal was built to make sure you never miss those moments.",hContact:"\u{1F4E7} Get in touch",contactP1:"Have a suggestion, a correction, a bug to report, or any other feedback? I'd love to hear from you.",contactP2:"You can send any message to:",comps:{CL:"Champions League",PL:"Premier League",PD:"La Liga",SA:"Serie A",FL1:"Ligue 1",BL1:"Bundesliga",EL:"Europa League",ECL:"Conference League",FA_CUP:"FA Cup",EFL_CUP:"EFL Cup",CDR:"Copa del Rey",COPPA_ITALIA:"Coppa Italia",DFB_POKAL:"DFB Pokal"}}};
function curLang(){try{return localStorage.getItem("ucl_lang")||"fa";}catch(e){return "fa";}}
var PAGE_TZ = "__PAGE_TZ__";
// Complete IANA timezone list (the same set websites ship): Intl.supportedValuesOf
// returns every CLDR zone. Fallback list below covers legacy browsers. Labels
// carry the REAL GMT offset computed from the zone data itself, so fractional
// offsets (Tehran +3:30, Kathmandu +5:45, Chatham +12:45) are always exact.
// v12.19: labels are fully bilingual \u2014 Farsi regions/cities from the
// hand-transliterated dictionary below + \xAB\u06AF\u0631\u06CC\u0646\u0648\u06CC\u0686+\u06F3:\u06F3\u06F0\xBB in fa mode,
// "Asia/Tehran GMT+3:30" in en mode. Every fixed Etc/GMT\xB1N offset is
// appended so ALL GMT times are pickable, and a \u2B50 popular group pins
// Tehran at the very top (the user could not find +3:30 deep in Asia).
var TZ_ALL = [];
var TZ_ANCHOR = Date.UTC(2026, 0, 1);
var TZ_COMMON = ["UTC","Asia/Tehran","Asia/Dubai","Europe/Istanbul","Europe/London","Europe/Paris","Europe/Berlin","America/New_York","America/Los_Angeles"];
var FA_TZ_REGION = {africa:"\u0622\u0641\u0631\u06CC\u0642\u0627",america:"\u0622\u0645\u0631\u06CC\u06A9\u0627",antarctica:"\u062C\u0646\u0648\u0628\u06AF\u0627\u0646",arctic:"\u0642\u0637\u0628 \u0634\u0645\u0627\u0644",asia:"\u0622\u0633\u06CC\u0627",atlantic:"\u0627\u0642\u06CC\u0627\u0646\u0648\u0633 \u0627\u0637\u0644\u0633",australia:"\u0627\u0633\u062A\u0631\u0627\u0644\u06CC\u0627",europe:"\u0627\u0631\u0648\u067E\u0627",indian:"\u0627\u0642\u06CC\u0627\u0646\u0648\u0633 \u0647\u0646\u062F",pacific:"\u0627\u0642\u06CC\u0627\u0646\u0648\u0633 \u0622\u0631\u0627\u0645",us:"\u0622\u0645\u0631\u06CC\u06A9\u0627",etc:"\u062B\u0627\u0628\u062A",general:"\u0639\u0645\u0648\u0645\u06CC"};
// Hand-transliterated Farsi names for every IANA zone city (key = the zone
// path after the region, lowercased). Multi-segment keys cover the
// Argentina/Indiana/Kentucky/North_Dakota subtrees; bare keys catch the
// legacy aliases of the same zones. Unknown zones fall back to Latin.
var FA_TZ = {
"abidjan":"\u0622\u0628\u06CC\u062C\u0627\u0646","accra":"\u0622\u06A9\u0631\u0627","addis_ababa":"\u0622\u062F\u06CC\u0633\u200C\u0622\u0628\u0627\u0628\u0627","algiers":"\u0627\u0644\u062C\u0632\u06CC\u0631\u0647","asmera":"\u0627\u0633\u0645\u0631\u0627","bamako":"\u0628\u0627\u0645\u0627\u06A9\u0648","bangui":"\u0628\u0627\u0646\u06AF\u06CC","banjul":"\u0628\u0627\u0646\u062C\u0648\u0644","bissau":"\u0628\u06CC\u0633\u0627\u0626\u0648","blantyre":"\u0628\u0644\u0627\u0646\u062A\u0627\u06CC\u0631","brazzaville":"\u0628\u0631\u0627\u0632\u0627\u0648\u06CC\u0644","bujumbura":"\u0628\u0648\u062C\u0648\u0645\u0628\u0648\u0631\u0627","cairo":"\u0642\u0627\u0647\u0631\u0647","casablanca":"\u06A9\u0627\u0632\u0627\u0628\u0644\u0627\u0646\u06A9\u0627","ceuta":"\u0633\u0626\u0648\u062A\u0627","conakry":"\u06A9\u0648\u0646\u0627\u06A9\u0631\u06CC","dakar":"\u062F\u0627\u06A9\u0627\u0631","dar_es_salaam":"\u062F\u0627\u0631\u0627\u0644\u0633\u0644\u0627\u0645","djibouti":"\u062C\u06CC\u0628\u0648\u062A\u06CC","douala":"\u062F\u0648\u0627\u0644\u0627","el_aaiun":"\u0627\u0644\u0639\u06CC\u0648\u0646","freetown":"\u0641\u0631\u06CC\u200C\u062A\u0627\u0648\u0646","gaborone":"\u06AF\u0627\u0628\u0648\u0631\u0648\u0646","harare":"\u0647\u0631\u0627\u0631\u0647","johannesburg":"\u0698\u0648\u0647\u0627\u0646\u0633\u0628\u0648\u0631\u06AF","juba":"\u062C\u0648\u0628\u0627","kampala":"\u06A9\u0627\u0645\u067E\u0627\u0644\u0627","khartoum":"\u062E\u0627\u0631\u0637\u0648\u0645","kigali":"\u06A9\u06CC\u06AF\u0627\u0644\u06CC","kinshasa":"\u06A9\u06CC\u0646\u0634\u0627\u0633\u0627","lagos":"\u0644\u0627\u06AF\u0648\u0633","libreville":"\u0644\u06CC\u0628\u0631\u0648\u06CC\u0644","lome":"\u0644\u0648\u0645\u0647","luanda":"\u0644\u0648\u0622\u0646\u062F\u0627","lubumbashi":"\u0644\u0648\u0628\u0648\u0645\u0628\u0627\u0634\u06CC","lusaka":"\u0644\u0648\u0632\u0627\u06A9\u0627","malabo":"\u0645\u0627\u0644\u0627\u0628\u0648","maputo":"\u0645\u0627\u067E\u0648\u062A\u0648","maseru":"\u0645\u0627\u0633\u0631\u0648","mbabane":"\u0627\u0645\u0628\u0627\u0628\u0627\u0646\u0647","mogadishu":"\u0645\u0648\u06AF\u0627\u062F\u06CC\u0634\u0648","monrovia":"\u0645\u0648\u0646\u0631\u0648\u0648\u06CC\u0627","nairobi":"\u0646\u0627\u06CC\u0631\u0648\u0628\u06CC","ndjamena":"\u0627\u0646\u062C\u0627\u0645\u0646\u0627","niamey":"\u0646\u06CC\u0627\u0645\u06CC","nouakchott":"\u0646\u0648\u0627\u06A9\u0634\u0648\u062A","ouagadougou":"\u0627\u0648\u0622\u06AF\u0627\u062F\u0648\u06AF\u0648","porto-novo":"\u067E\u0648\u0631\u062A\u0648\u200C\u0646\u0648\u0648\u0648","sao_tome":"\u0633\u0627\u0626\u0648\u062A\u0648\u0645\u0647","tripoli":"\u0637\u0631\u0627\u0628\u0644\u0633","tunis":"\u062A\u0648\u0646\u0633","windhoek":"\u0648\u06CC\u0646\u062F\u0647\u0648\u06A9",
"adak":"\u0622\u062F\u06A9","anchorage":"\u0627\u0646\u06A9\u0631\u06CC\u062C","anguilla":"\u0622\u0646\u06AF\u0648\u06CC\u0644\u0627","antigua":"\u0622\u0646\u062A\u06CC\u06AF\u0648\u0627","araguaina":"\u0622\u0631\u0627\u06AF\u0648\u0627\u06CC\u0646\u0627","aruba":"\u0622\u0631\u0648\u0628\u0627","asuncion":"\u0622\u0633\u0648\u0646\u0633\u06CC\u0648\u0646","bahia":"\u0628\u0627\u0647\u06CC\u0627","bahia_banderas":"\u0628\u0627\u0647\u06CC\u0627 \u0628\u0627\u0646\u062F\u0631\u0627\u0633","barbados":"\u0628\u0627\u0631\u0628\u0627\u062F\u0648\u0633","belem":"\u0628\u0644\u0645","belize":"\u0628\u0644\u06CC\u0632","blanc-sablon":"\u0628\u0644\u0627\u0646\u200C\u0633\u0627\u0628\u0644\u0648\u0646","boa_vista":"\u0628\u0648\u0622\u0648\u06CC\u0633\u062A\u0627","bogota":"\u0628\u0648\u06AF\u0648\u062A\u0627","boise":"\u0628\u0648\u0627\u06CC\u0633\u06CC","buenos_aires":"\u0628\u0648\u0626\u0646\u0648\u0633\u200C\u0622\u06CC\u0631\u0633","cambridge_bay":"\u06A9\u0645\u0628\u0631\u06CC\u062C\u200C\u0628\u06CC","campo_grande":"\u06A9\u0627\u0645\u067E\u0648\u06AF\u0631\u0627\u0646\u062F\u0647","cancun":"\u06A9\u0627\u0646\u06A9\u0648\u0646","caracas":"\u06A9\u0627\u0631\u0627\u06A9\u0627\u0633","catamarca":"\u06A9\u0627\u062A\u0627\u0645\u0627\u0631\u06A9\u0627","cayenne":"\u06A9\u0627\u06CC\u0646","cayman":"\u06A9\u06CC\u0645\u0646","chicago":"\u0634\u06CC\u06A9\u0627\u06AF\u0648","chihuahua":"\u0686\u06CC\u0648\u0627\u0648\u0627","ciudad_juarez":"\u0633\u06CC\u0648\u062F\u0627\u062F\u062E\u0648\u0627\u0631\u0632","coral_harbour":"\u06A9\u0648\u0631\u0627\u0644\u200C\u0647\u0627\u0631\u0628\u0631","cordoba":"\u06A9\u0648\u0631\u062F\u0648\u0628\u0627","costa_rica":"\u06A9\u0627\u0633\u062A\u0627\u0631\u06CC\u06A9\u0627","coyhaique":"\u06A9\u0648\u06CC\u0627\u06CC\u06A9\u0647","creston":"\u06A9\u0631\u0633\u062A\u0648\u0646","cuiaba":"\u06A9\u0648\u06CC\u0627\u0628\u0627","curacao":"\u06A9\u0648\u0631\u0627\u0633\u0627\u0626\u0648","danmarkshavn":"\u062F\u0627\u0646\u0645\u0627\u0631\u06A9\u0633\u0647\u0627\u0648\u0646","dawson":"\u062F\u0627\u0648\u0633\u0648\u0646","dawson_creek":"\u062F\u0627\u0648\u0633\u0648\u0646\u200C\u06A9\u0631\u06CC\u06A9","denver":"\u062F\u0646\u0648\u0631","detroit":"\u062F\u06CC\u062A\u0631\u0648\u06CC\u062A","dominica":"\u062F\u0648\u0645\u06CC\u0646\u06CC\u06A9\u0627","edmonton":"\u0627\u062F\u0645\u0648\u0646\u062A\u0648\u0646","eirunepe":"\u0627\u06CC\u0631\u0648\u0646\u067E\u0647","el_salvador":"\u0627\u0644\u0633\u0627\u0644\u0648\u0627\u062F\u0648\u0631","fort_nelson":"\u0641\u0648\u0631\u062A\u200C\u0646\u0644\u0633\u0648\u0646","fortaleza":"\u0641\u0648\u0631\u062A\u0627\u0644\u0632\u0627","glace_bay":"\u06AF\u0644\u06CC\u0633\u200C\u0628\u06CC","godthab":"\u06AF\u0648\u062F\u0647\u0627\u0628","goose_bay":"\u06AF\u0648\u0632\u0628\u06CC","grand_turk":"\u06AF\u0631\u0646\u062F\u062A\u0631\u06A9","grenada":"\u06AF\u0631\u0646\u0627\u062F\u0627","guadeloupe":"\u06AF\u0648\u0627\u062F\u0644\u0648\u067E","guatemala":"\u06AF\u0648\u0627\u062A\u0645\u0627\u0644\u0627","guayaquil":"\u06AF\u0648\u0627\u06CC\u0627\u06A9\u06CC\u0644","guyana":"\u06AF\u0648\u06CC\u0627\u0646","halifax":"\u0647\u0627\u0644\u06CC\u0641\u0627\u06A9\u0633","havana":"\u0647\u0627\u0648\u0627\u0646\u0627","hermosillo":"\u0627\u0631\u0645\u0648\u06CC\u0648","indianapolis":"\u0627\u06CC\u0646\u062F\u06CC\u0627\u0646\u0627\u067E\u0644\u06CC\u0633","inuvik":"\u0627\u06CC\u0646\u0648\u0648\u06CC\u06A9","iqaluit":"\u0627\u06CC\u06A9\u0627\u0644\u0648\u06CC\u062A","jamaica":"\u062C\u0627\u0645\u0627\u0626\u06CC\u06A9\u0627","juneau":"\u0698\u0648\u0646\u0648","kralendijk":"\u06A9\u0631\u0627\u0644\u0646\u062F\u06CC\u06A9","la_paz":"\u0644\u0627\u067E\u0627\u0632","lima":"\u0644\u06CC\u0645\u0627","los_angeles":"\u0644\u0633\u200C\u0622\u0646\u062C\u0644\u0633","louisville":"\u0644\u0648\u0626\u06CC\u0632\u0648\u06CC\u0644","lower_princes":"\u0644\u0648\u0626\u0631\u067E\u0631\u06CC\u0646\u0633\u0632","maceio":"\u0645\u0627\u0633\u0626\u06CC\u0648","managua":"\u0645\u0627\u0646\u0627\u06AF\u0648\u0627","manaus":"\u0645\u0627\u0646\u0627\u0626\u0648\u0633","marigot":"\u0645\u0627\u0631\u06CC\u06AF\u0648","martinique":"\u0645\u0627\u0631\u062A\u06CC\u0646\u06CC\u06A9","matamoros":"\u0645\u0627\u062A\u0627\u0645\u0648\u0631\u0648\u0633","mazatlan":"\u0645\u0627\u0632\u0627\u062A\u0644\u0627\u0646","mendoza":"\u0645\u0646\u062F\u0648\u0632\u0627","menominee":"\u0645\u0646\u0648\u0645\u06CC\u0646\u06CC","merida":"\u0645\u0631\u06CC\u062F\u0627","metlakatla":"\u0645\u062A\u0644\u0627\u06A9\u0627\u062A\u0644\u0627","mexico_city":"\u0645\u06A9\u0632\u06CC\u06A9\u0648\u0633\u06CC\u062A\u06CC","miquelon":"\u0645\u06CC\u06A9\u0644\u0646","moncton":"\u0645\u0648\u0646\u06A9\u062A\u0648\u0646","monterrey":"\u0645\u0648\u0646\u062A\u0631\u06CC","montevideo":"\u0645\u0648\u0646\u062A\u0647\u200C\u0648\u06CC\u062F\u0626\u0648","montserrat":"\u0645\u0648\u0646\u062A\u0633\u0631\u0627\u062A","nassau":"\u0646\u0627\u0633\u0627\u0626\u0648","new_york":"\u0646\u06CC\u0648\u06CC\u0648\u0631\u06A9","nome":"\u0646\u0648\u0645","noronha":"\u0646\u0648\u0631\u0648\u0646\u06CC\u0627","ojinaga":"\u0627\u0648\u062E\u06CC\u0646\u0627\u06AF\u0627","panama":"\u067E\u0627\u0646\u0627\u0645\u0627","paramaribo":"\u067E\u0627\u0631\u0627\u0645\u0627\u0631\u06CC\u0628\u0648","phoenix":"\u0641\u06CC\u0646\u06CC\u06A9\u0633","port-au-prince":"\u067E\u0648\u0631\u062A\u200C\u0627\u0648\u067E\u0631\u0646\u0633","port_of_spain":"\u067E\u0648\u0631\u062A\u200C\u0622\u0648\u0627\u0633\u067E\u06CC\u0646","porto_velho":"\u067E\u0648\u0631\u062A\u0648\u0644\u0648","puerto_rico":"\u067E\u0648\u0631\u062A\u0648\u0631\u06CC\u06A9\u0648","punta_arenas":"\u067E\u0648\u0646\u062A\u0627 \u0622\u0631\u0646\u0627\u0633","rankin_inlet":"\u0631\u0646\u06A9\u06CC\u0646\u200C\u0627\u06CC\u0646\u0644\u062A","recife":"\u0631\u0633\u06CC\u0641\u06CC","regina":"\u0631\u062C\u06CC\u0646\u0627","resolute":"\u0631\u0632\u0648\u0644\u0648\u062A","rio_branco":"\u0631\u06CC\u0648 \u0628\u0631\u0627\u0646\u06A9\u0648","santarem":"\u0633\u0627\u0646\u062A\u0627\u0631\u0645","santiago":"\u0633\u0627\u0646\u062A\u06CC\u0627\u06AF\u0648","santo_domingo":"\u0633\u0627\u0646\u062A\u0648 \u062F\u0648\u0645\u06CC\u0646\u06AF\u0648","sao_paulo":"\u0633\u0627\u0626\u0648\u067E\u0627\u0626\u0648\u0644\u0648","scoresbysund":"\u0627\u0633\u06A9\u0648\u0631\u0633\u0628\u06CC\u0633\u0648\u0646\u062F","sitka":"\u0633\u06CC\u062A\u06A9\u0627","st_barthelemy":"\u0633\u0646\u200C\u0628\u0627\u0631\u062A\u0644\u0645\u06CC","st_johns":"\u0633\u0646\u062A\u200C\u062C\u0627\u0646\u0632","st_kitts":"\u0633\u0646\u062A\u200C\u06A9\u06CC\u062A\u0633","st_lucia":"\u0633\u0646\u062A\u200C\u0644\u0648\u0633\u06CC\u0627","st_thomas":"\u0633\u0646\u062A\u200C\u062A\u0648\u0645\u0627\u0633","st_vincent":"\u0633\u0646\u062A\u200C\u0648\u06CC\u0646\u0633\u0646\u062A","swift_current":"\u0633\u0648\u0626\u06CC\u0641\u062A\u200C\u06A9\u0627\u0631\u0646\u062A","tegucigalpa":"\u062A\u06AF\u0648\u0633\u06CC\u06AF\u0627\u0644\u067E\u0627","thule":"\u062A\u0648\u0644","tijuana":"\u062A\u06CC\u062E\u0648\u0627\u0646\u0627","toronto":"\u062A\u0648\u0631\u0646\u062A\u0648","tortola":"\u062A\u0648\u0631\u062A\u0648\u0644\u0627","vancouver":"\u0648\u0646\u06A9\u0648\u0648\u0631","whitehorse":"\u0648\u0627\u06CC\u062A\u0647\u0627\u0631\u0633","winnipeg":"\u0648\u06CC\u0646\u06CC\u067E\u06AF","yakutat":"\u06CC\u0627\u06A9\u0648\u062A\u0627\u062A",
"argentina/la_rioja":"\u0644\u0627 \u0631\u06CC\u0648\u062E\u0627","argentina/rio_gallegos":"\u0631\u06CC\u0648 \u06AF\u0627\u0644\u06AF\u0648\u0633","argentina/salta":"\u0633\u0627\u0644\u062A\u0627","argentina/san_juan":"\u0633\u0627\u0646\u200C\u062E\u0648\u0627\u0646","argentina/san_luis":"\u0633\u0627\u0646\u200C\u0644\u0648\u0626\u06CC\u0633","argentina/tucuman":"\u062A\u0648\u06A9\u0648\u0645\u0627\u0646","argentina/ushuaia":"\u0627\u0648\u0634\u0648\u0627\u06CC\u0627","argentina/buenos_aires":"\u0628\u0648\u0626\u0646\u0648\u0633\u200C\u0622\u06CC\u0631\u0633","argentina/catamarca":"\u06A9\u0627\u062A\u0627\u0645\u0627\u0631\u06A9\u0627","argentina/cordoba":"\u06A9\u0648\u0631\u062F\u0648\u0628\u0627","argentina/jujuy":"\u062E\u0648\u062E\u0648\u06CC","argentina/mendoza":"\u0645\u0646\u062F\u0648\u0632\u0627","la_rioja":"\u0644\u0627 \u0631\u06CC\u0648\u062E\u0627","rio_gallegos":"\u0631\u06CC\u0648 \u06AF\u0627\u0644\u06AF\u0648\u0633","salta":"\u0633\u0627\u0644\u062A\u0627","san_juan":"\u0633\u0627\u0646\u200C\u062E\u0648\u0627\u0646","san_luis":"\u0633\u0627\u0646\u200C\u0644\u0648\u0626\u06CC\u0633","tucuman":"\u062A\u0648\u06A9\u0648\u0645\u0627\u0646","ushuaia":"\u0627\u0648\u0634\u0648\u0627\u06CC\u0627","jujuy":"\u062E\u0648\u062E\u0648\u06CC","catamarca":"\u06A9\u0627\u062A\u0627\u0645\u0627\u0631\u06A9\u0627","cordoba":"\u06A9\u0648\u0631\u062F\u0648\u0628\u0627","mendoza":"\u0645\u0646\u062F\u0648\u0632\u0627","buenos_aires":"\u0628\u0648\u0626\u0646\u0648\u0633\u200C\u0622\u06CC\u0631\u0633",
"indiana/knox":"\u0646\u0627\u06A9\u0633","indiana/marengo":"\u0645\u0627\u0631\u0646\u06AF\u0648","indiana/petersburg":"\u067E\u06CC\u062A\u0631\u0632\u0628\u0648\u0631\u06AF","indiana/tell_city":"\u062A\u0644\u200C\u0633\u06CC\u062A\u06CC","indiana/vevay":"\u0648\u06CC\u0648\u06CC","indiana/vincennes":"\u0648\u06CC\u0646\u0633\u0646\u0633","indiana/winamac":"\u0648\u06CC\u0646\u0627\u0645\u06A9","kentucky/monticello":"\u0645\u0648\u0646\u062A\u06CC\u0686\u0644\u0648","north_dakota/beulah":"\u0628\u06CC\u0648\u0644\u0627","north_dakota/center":"\u0633\u0646\u062A\u0631","north_dakota/new_salem":"\u0646\u06CC\u0648\u0633\u0627\u0644\u0645",
"casey":"\u06A9\u06CC\u0633\u06CC","davis":"\u062F\u06CC\u0648\u06CC\u0633","dumontdurville":"\u062F\u0648\u0645\u0648\u0646\u200C\u062F\u0648\u0631\u0648\u06CC\u0644","macquarie":"\u0645\u06A9\u0648\u0627\u0631\u06CC","mawson":"\u0645\u0627\u0648\u0633\u0648\u0646","mcmurdo":"\u0645\u06A9\u200C\u0645\u0648\u0631\u062F\u0648","palmer":"\u067E\u0627\u0644\u0645\u0631","rothera":"\u0631\u0648\u062A\u0631\u0627","syowa":"\u0634\u06CC\u0648\u0648\u0627","troll":"\u062A\u0631\u0648\u0644","vostok":"\u0648\u0633\u062A\u0648\u06A9","longyearbyen":"\u0644\u0627\u0646\u06AF\u06CC\u200C\u06CC\u0631\u0628\u06CC\u0646",
"aden":"\u0639\u062F\u0646","almaty":"\u0622\u0644\u0645\u0627\u062A\u06CC","amman":"\u0627\u0645\u0627\u0646","anadyr":"\u0622\u0646\u0627\u062F\u06CC\u0631","aqtau":"\u0622\u0642\u062A\u0627\u0648","aqtobe":"\u0622\u0642\u062A\u0648\u0628\u0647","ashgabat":"\u0639\u0634\u0642\u200C\u0622\u0628\u0627\u062F","atyrau":"\u0622\u062A\u06CC\u0631\u0627\u0648","baghdad":"\u0628\u063A\u062F\u0627\u062F","bahrain":"\u0628\u062D\u0631\u06CC\u0646","baku":"\u0628\u0627\u06A9\u0648","bangkok":"\u0628\u0627\u0646\u06A9\u0648\u06A9","barnaul":"\u0628\u0627\u0631\u0646\u0627\u0626\u0648\u0644","beirut":"\u0628\u06CC\u0631\u0648\u062A","bishkek":"\u0628\u06CC\u0634\u06A9\u06A9","brunei":"\u0628\u0631\u0648\u0646\u0626\u06CC","calcutta":"\u06A9\u0644\u06A9\u062A\u0647","chita":"\u0686\u06CC\u062A\u0627","colombo":"\u06A9\u0644\u0645\u0628\u0648","damascus":"\u062F\u0645\u0634\u0642","dhaka":"\u062F\u0627\u06A9\u0627","dili":"\u062F\u06CC\u0644\u06CC","dubai":"\u062F\u0628\u06CC","dushanbe":"\u062F\u0648\u0634\u0646\u0628\u0647","famagusta":"\u0641\u0627\u0645\u0627\u06AF\u0648\u0633\u062A\u0627","gaza":"\u063A\u0632\u0647","hebron":"\u0627\u0644\u062E\u0644\u06CC\u0644","hong_kong":"\u0647\u0646\u06AF\u200C\u06A9\u0646\u06AF","hovd":"\u062E\u0648\u0648\u062F","irkutsk":"\u0627\u06CC\u0631\u06A9\u0648\u062A\u0633\u06A9","jakarta":"\u062C\u0627\u06A9\u0627\u0631\u062A\u0627","jayapura":"\u062C\u0627\u06CC\u0627\u067E\u0648\u0631\u0627","jerusalem":"\u0642\u062F\u0633","kabul":"\u06A9\u0627\u0628\u0644","kamchatka":"\u06A9\u0627\u0645\u0686\u0627\u062A\u06A9\u0627","karachi":"\u06A9\u0631\u0627\u0686\u06CC","katmandu":"\u06A9\u0627\u062A\u0645\u0627\u0646\u062F\u0648","khandyga":"\u062E\u0627\u0646\u062F\u06CC\u06AF\u0627","krasnoyarsk":"\u06A9\u0631\u0627\u0633\u0646\u0648\u06CC\u0627\u0631\u0633\u06A9","kuala_lumpur":"\u06A9\u0648\u0627\u0644\u0627\u0644\u0627\u0645\u067E\u0648\u0631","kuching":"\u06A9\u0648\u0686\u06CC\u0646\u06AF","kuwait":"\u06A9\u0648\u06CC\u062A","macau":"\u0645\u0627\u06A9\u0627\u0626\u0648","magadan":"\u0645\u06AF\u0627\u062F\u0627\u0646","makassar":"\u0645\u0627\u06A9\u0627\u0633\u0627\u0631","manila":"\u0645\u0627\u0646\u06CC\u0644","muscat":"\u0645\u0633\u0642\u0637","nicosia":"\u0646\u06CC\u06A9\u0648\u0632\u06CC\u0627","novokuznetsk":"\u0646\u0648\u0648\u06A9\u0648\u0632\u0646\u062A\u0633\u06A9","novosibirsk":"\u0646\u0648\u0648\u0633\u06CC\u0628\u06CC\u0631\u0633\u06A9","omsk":"\u0627\u0648\u0645\u0633\u06A9","oral":"\u0627\u0648\u0631\u0627\u0644","phnom_penh":"\u067E\u0646\u0648\u0645\u200C\u067E\u0646","pontianak":"\u067E\u0648\u0646\u062A\u06CC\u0627\u0646\u0627\u06A9","pyongyang":"\u067E\u06CC\u0648\u0646\u06AF\u200C\u06CC\u0627\u0646\u06AF","qatar":"\u0642\u0637\u0631","qostanay":"\u0642\u0648\u0633\u062A\u0627\u0646\u0627\u06CC","qyzylorda":"\u0642\u06CC\u0632\u06CC\u0644\u200C\u0627\u0648\u0631\u062F\u0627","rangoon":"\u06CC\u0627\u0646\u06AF\u0648\u0646","riyadh":"\u0631\u06CC\u0627\u0636","saigon":"\u0633\u0627\u06CC\u06AF\u0648\u0646","sakhalin":"\u0633\u0627\u062E\u0627\u0644\u06CC\u0646","samarkand":"\u0633\u0645\u0631\u0642\u0646\u062F","seoul":"\u0633\u0626\u0648\u0644","shanghai":"\u0634\u0627\u0646\u06AF\u0647\u0627\u06CC","singapore":"\u0633\u0646\u06AF\u0627\u067E\u0648\u0631","srednekolymsk":"\u0633\u0631\u062F\u0646\u06CC\u200C\u06A9\u0648\u0644\u06CC\u0645\u0633\u06A9","taipei":"\u062A\u0627\u06CC\u067E\u0647","tashkent":"\u062A\u0627\u0634\u06A9\u0646\u062F","tbilisi":"\u062A\u0641\u0644\u06CC\u0633","tehran":"\u062A\u0647\u0631\u0627\u0646","thimphu":"\u062A\u06CC\u0645\u0641\u0648","tokyo":"\u062A\u0648\u06A9\u06CC\u0648","tomsk":"\u062A\u0648\u0645\u0633\u06A9","ulaanbaatar":"\u0627\u0648\u0644\u0627\u0646\u200C\u0628\u0627\u062A\u0648\u0631","urumqi":"\u0627\u0631\u0648\u0645\u0686\u06CC","ust-nera":"\u0627\u0648\u0633\u062A\u200C\u0646\u0631\u0627","vientiane":"\u0648\u06CC\u0646\u062A\u06CC\u0627\u0646","vladivostok":"\u0648\u0644\u0627\u062F\u06CC\u200C\u0648\u0633\u062A\u0648\u06A9","yakutsk":"\u06CC\u0627\u06A9\u0648\u062A\u0633\u06A9","yekaterinburg":"\u06CC\u06A9\u0627\u062A\u0631\u06CC\u0646\u0628\u0648\u0631\u06AF","yerevan":"\u0627\u06CC\u0631\u0648\u0627\u0646",
"azores":"\u0622\u0632\u0648\u0631","bermuda":"\u0628\u0631\u0645\u0648\u062F\u0627","canary":"\u0642\u0646\u0627\u0631\u06CC","cape_verde":"\u06A9\u06CC\u067E\u200C\u0648\u0631\u062F","faeroe":"\u0641\u0627\u0631\u0648","madeira":"\u0645\u0627\u062F\u06CC\u0631\u0627","reykjavik":"\u0631\u06CC\u06A9\u06CC\u0627\u0648\u06CC\u06A9","south_georgia":"\u062C\u0646\u0648\u0628 \u062C\u0648\u0631\u062C\u06CC\u0627","st_helena":"\u0633\u0646\u062A\u200C\u0647\u0644\u0646\u0627","stanley":"\u0627\u0633\u062A\u0646\u0644\u06CC",
"adelaide":"\u0622\u062F\u0644\u0627\u06CC\u062F","brisbane":"\u0628\u0631\u06CC\u0632\u0628\u0646","broken_hill":"\u0628\u0631\u0648\u06A9\u0646\u200C\u0647\u06CC\u0644","canberra":"\u06A9\u0627\u0646\u0628\u0631\u0627","darwin":"\u062F\u0627\u0631\u0648\u06CC\u0646","eucla":"\u06CC\u0648\u06A9\u0644\u0627","hobart":"\u0647\u0648\u0628\u0627\u0631\u062A","lindeman":"\u0644\u06CC\u0646\u062F\u0645\u0646","lord_howe":"\u0644\u0631\u062F \u0647\u0627\u0648","melbourne":"\u0645\u0644\u0628\u0648\u0631\u0646","perth":"\u067E\u0631\u062A","sydney":"\u0633\u06CC\u062F\u0646\u06CC",
"amsterdam":"\u0622\u0645\u0633\u062A\u0631\u062F\u0627\u0645","andorra":"\u0622\u0646\u062F\u0648\u0631\u0627","astrakhan":"\u0622\u0633\u062A\u0631\u0627\u062E\u0627\u0646","athens":"\u0622\u062A\u0646","belgrade":"\u0628\u0644\u06AF\u0631\u0627\u062F","berlin":"\u0628\u0631\u0644\u06CC\u0646","bratislava":"\u0628\u0631\u0627\u062A\u06CC\u0633\u0644\u0627\u0648\u0627","brussels":"\u0628\u0631\u0648\u06A9\u0633\u0644","bucharest":"\u0628\u062E\u0627\u0631\u0633\u062A","budapest":"\u0628\u0648\u062F\u0627\u067E\u0633\u062A","busingen":"\u0628\u0648\u0632\u06CC\u0646\u06AF\u0646","chisinau":"\u06A9\u06CC\u0634\u06CC\u0646\u0627\u0648","copenhagen":"\u06A9\u067E\u0646\u0647\u0627\u06AF","dublin":"\u062F\u0648\u0628\u0644\u06CC\u0646","gibraltar":"\u062C\u0628\u0644\u200C\u0627\u0644\u0637\u0627\u0631\u0642","guernsey":"\u06AF\u0631\u0646\u0632\u06CC","helsinki":"\u0647\u0644\u0633\u06CC\u0646\u06A9\u06CC","isle_of_man":"\u062C\u0632\u06CC\u0631\u0647\u200C\u0645\u0627\u0646","istanbul":"\u0627\u0633\u062A\u0627\u0646\u0628\u0648\u0644","jersey":"\u062C\u0631\u0633\u06CC","kaliningrad":"\u06A9\u0627\u0644\u06CC\u0646\u06CC\u0646\u06AF\u0631\u0627\u062F","kiev":"\u06A9\u06CC\u0641","kirov":"\u06A9\u06CC\u0631\u0648\u0641","lisbon":"\u0644\u06CC\u0633\u0628\u0648\u0646","ljubljana":"\u0644\u06CC\u0648\u0628\u0644\u06CC\u0627\u0646\u0627","london":"\u0644\u0646\u062F\u0646","luxembourg":"\u0644\u0648\u06A9\u0632\u0627\u0645\u0628\u0648\u0631\u06AF","madrid":"\u0645\u0627\u062F\u0631\u06CC\u062F","malta":"\u0645\u0627\u0644\u062A","mariehamn":"\u0645\u0627\u0631\u06CC\u200C\u0647\u0645\u0646","minsk":"\u0645\u06CC\u0646\u0633\u06A9","moscow":"\u0645\u0633\u06A9\u0648","monaco":"\u0645\u0648\u0646\u0627\u06A9\u0648","oslo":"\u0627\u0633\u0644\u0648","paris":"\u067E\u0627\u0631\u06CC\u0633","podgorica":"\u067E\u0648\u062F\u06AF\u0648\u0631\u06CC\u062A\u0633\u0627","prague":"\u067E\u0631\u0627\u06AF","riga":"\u0631\u06CC\u06AF\u0627","rome":"\u0631\u0645","samara":"\u0633\u0627\u0645\u0627\u0631\u0627","san_marino":"\u0633\u0627\u0646\u200C\u0645\u0627\u0631\u06CC\u0646\u0648","sarajevo":"\u0633\u0627\u0631\u0627\u06CC\u0648\u0648","saratov":"\u0633\u0627\u0631\u0627\u062A\u0648\u0641","simferopol":"\u0633\u06CC\u0645\u0641\u0631\u0648\u067E\u0644","skopje":"\u0627\u0633\u06A9\u0648\u067E\u06CC\u0647","sofia":"\u0635\u0648\u0641\u06CC\u0647","stockholm":"\u0627\u0633\u062A\u06A9\u0647\u0644\u0645","tallinn":"\u062A\u0627\u0644\u06CC\u0646","tirane":"\u062A\u06CC\u0631\u0627\u0646\u0627","ulyanovsk":"\u0627\u0648\u0644\u06CC\u0627\u0646\u0648\u0641\u0633\u06A9","vaduz":"\u0641\u0627\u062F\u0648\u062A\u0633","vatican":"\u0648\u0627\u062A\u06CC\u06A9\u0627\u0646","vienna":"\u0648\u06CC\u0646","vilnius":"\u0648\u06CC\u0644\u0646\u06CC\u0648\u0633","volgograd":"\u0648\u0644\u06AF\u0648\u06AF\u0631\u0627\u062F","warsaw":"\u0648\u0631\u0634\u0648","zagreb":"\u0632\u0627\u06AF\u0631\u0628","zurich":"\u0632\u0648\u0631\u06CC\u062E",
"antananarivo":"\u0622\u0646\u062A\u0627\u0646\u0627\u0646\u0627\u0631\u06CC\u0648\u0648","chagos":"\u0686\u0627\u06AF\u0648\u0633","christmas":"\u06A9\u0631\u06CC\u0633\u0645\u0633","cocos":"\u06A9\u0648\u06A9\u0648\u0633","comoro":"\u06A9\u0627\u0645\u0648\u0631\u0648","kerguelen":"\u06A9\u0631\u06AF\u0648\u0644\u0646","mahe":"\u0645\u0627\u0647\u0647","maldives":"\u0645\u0627\u0644\u062F\u06CC\u0648","mauritius":"\u0645\u0648\u0631\u06CC\u0633","mayotte":"\u0645\u0627\u06CC\u0648\u062A","reunion":"\u0631\u06CC\u0648\u0646\u06CC\u0648\u0646",
"apia":"\u0622\u067E\u06CC\u0627","auckland":"\u0627\u0648\u06A9\u0644\u0646\u062F","bougainville":"\u0628\u0648\u06AF\u0646\u0648\u06CC\u0644","chatham":"\u0686\u062A\u0645","easter":"\u0627\u06CC\u0633\u062A\u0631","efate":"\u0627\u0641\u0627\u062A\u0647","enderbury":"\u0627\u0646\u062F\u0631\u062A\u0631\u06CC","fakaofo":"\u0641\u0627\u06A9\u0627\u0626\u0648\u0641\u0648","fiji":"\u0641\u06CC\u062C\u06CC","funafuti":"\u0641\u0648\u0646\u0627\u0641\u0648\u062A\u06CC","galapagos":"\u06AF\u0627\u0644\u0627\u067E\u0627\u06AF\u0648\u0633","gambier":"\u06AF\u0627\u0645\u0628\u06CC\u0647","guadalcanal":"\u06AF\u0648\u0627\u062F\u0627\u0644\u06A9\u0627\u0646\u0627\u0644","guam":"\u06AF\u0648\u0627\u0645","honolulu":"\u0647\u0648\u0646\u0648\u0644\u0648\u0644\u0648","kiritimati":"\u06A9\u06CC\u0631\u06CC\u062A\u06CC\u0645\u0627\u062A\u06CC","kosrae":"\u06A9\u0648\u0633\u0631\u0627\u06CC","kwajalein":"\u06A9\u0648\u0627\u062C\u0627\u0644\u06CC\u0646","majuro":"\u0645\u0627\u0698\u0648\u0631\u0648","marquesas":"\u0645\u0627\u0631\u06A9\u06CC\u0632\u0627\u0633","midway":"\u0645\u06CC\u062F\u0648\u06CC","nauru":"\u0646\u0627\u0626\u0648\u0631\u0648","niue":"\u0646\u06CC\u0648\u0626\u0647","norfolk":"\u0646\u0648\u0631\u0641\u0648\u0644\u06A9","noumea":"\u0646\u0648\u0645\u0626\u0627","pago_pago":"\u067E\u0627\u06AF\u0648 \u067E\u0627\u06AF\u0648","palau":"\u067E\u0627\u0644\u0627\u0626\u0648","pitcairn":"\u067E\u06CC\u062A\u06A9\u0631\u0646","ponape":"\u067E\u0648\u0646\u0627\u067E\u0647","port_moresby":"\u067E\u0648\u0631\u062A \u0645\u0648\u0631\u0633\u0628\u06CC","rarotonga":"\u0631\u0627\u0631\u0648\u062A\u0648\u0646\u06AF\u0627","saipan":"\u0633\u0627\u06CC\u067E\u0646","tahiti":"\u062A\u0627\u0647\u06CC\u062A\u06CC","tarawa":"\u062A\u0627\u0631\u0627\u0648\u0627","tongatapu":"\u062A\u0648\u0646\u06AF\u0627\u062A\u0627\u067E\u0648","truk":"\u062A\u0631\u0648\u06A9","wake":"\u0648\u06CC\u06A9","wallis":"\u0648\u0627\u0644\u06CC\u0633"
};
var TZ_INFO = {};
function tzOffsetMin(tz){
  try{
    var p = new Intl.DateTimeFormat("en-US",{timeZone:tz,hour12:false,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"}).formatToParts(new Date(TZ_ANCHOR));
    var m = {};
    for(var i = 0; i < p.length; i++) m[p[i].type] = p[i].value;
    var asUTC = Date.UTC(+m.year, (+m.month) - 1, +m.day, (+m.hour) % 24, +m.minute, +m.second);
    return Math.round((asUTC - TZ_ANCHOR) / 6e4);
  }catch(e){ return null; }
}
function tzGmtLabel(min, lang){
  if(min === null || min !== min) return "";
  var sign = min < 0 ? "-" : "+", abs = Math.abs(min), h = Math.floor(abs / 60), mm = abs % 60;
  if(lang === "fa") return " \u06AF\u0631\u06CC\u0646\u0648\u06CC\u0686" + sign + faNum(h) + (mm ? ":" + faNum(mm < 10 ? "0" + mm : "" + mm) : "");
  return " GMT" + sign + h + (mm ? ":" + (mm < 10 ? "0" + mm : "" + mm) : "");
}
function tzPathFa(rest){
  var k = rest.toLowerCase();
  if(FA_TZ[k]) return FA_TZ[k];
  var last = k.slice(k.lastIndexOf("/") + 1);
  if(FA_TZ[last]) return FA_TZ[last];
  return rest.replace(/_/g, " ");
}
function tzOptionLabel(tz, lang){
  if(tz === "UTC") return "UTC";
  if(tz.indexOf("Etc/") === 0){
    if(tz === "Etc/UTC") return lang === "fa" ? "UTC (\u062B\u0627\u0628\u062A)" : "UTC (fixed)";
    var eb = tzGmtLabel(tzOffsetMin(tz), lang).trim() || "GMT";
    return lang === "fa" ? eb + " (\u062B\u0627\u0628\u062A)" : eb + " (fixed)";
  }
  var parts = tz.split("/");
  if(lang === "fa") return (FA_TZ_REGION[parts[0].toLowerCase()] || parts[0]) + "/" + tzPathFa(parts.slice(1).join("/")) + tzGmtLabel(tzOffsetMin(tz), "fa");
  return tz.replace(/_/g, " ") + tzGmtLabel(tzOffsetMin(tz), "en");
}
function tzInfo(tz){
  if(!TZ_INFO[tz]) TZ_INFO[tz] = { value: tz.toLowerCase(), en: tzOptionLabel(tz, "en"), fa: tzOptionLabel(tz, "fa") };
  return TZ_INFO[tz];
}
function buildTzAll(){
  var out = [];
  try{ out = Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : []; }catch(e){ out = []; }
  if(!out.length) out = ["UTC","Asia/Tehran","Europe/London","Europe/Berlin","Europe/Paris","Europe/Rome","Asia/Dubai","Europe/Istanbul","America/New_York","America/Los_Angeles","America/Toronto","Asia/Tokyo","Australia/Sydney","Australia/Melbourne","Australia/Brisbane","Australia/Adelaide","Australia/Canberra","Australia/Perth"];
  var seen = {}, list = [];
  out.forEach(function(x){ var s = String(x); if(!seen[s]){ seen[s] = 1; list.push(s); } });
  // v12.19: the full fixed-offset ladder (IANA Etc sign is INVERTED \u2014
  // Etc/GMT+5 is UTC-5) so every pure GMT time from -14 to +14 exists.
  var extra = ["UTC","Etc/UTC","Etc/GMT"];
  for(var u = 1; u <= 14; u++) extra.push("Etc/GMT-" + u);
  for(var w = 1; w <= 14; w++) extra.push("Etc/GMT+" + w);
  extra.forEach(function(x){ if(!seen[x]){ seen[x] = 1; list.push(x); } });
  return list.sort();
}
function curTz(){
  try{ var v = localStorage.getItem("ucl_tz"); if(v){ new Intl.DateTimeFormat("en",{timeZone:v}); return v; } }catch(e){}
  return PAGE_TZ;
}
function T(k){var l=curLang(),d=I18N[l];return (d&&d[k])||I18N.fa[k]||k;}
function fmt(k){var s=T(k);for(var i=1;i<arguments.length;i++)s=s.replace("%s",arguments[i]).replace("%d",arguments[i]);return s;}
function trText(){var l=curLang();document.querySelectorAll("[data-i]").forEach(function(el){el.textContent=T(el.getAttribute("data-i"));});}
function trPlace(){document.querySelectorAll("[data-p]").forEach(function(el){el.setAttribute("placeholder",T(el.getAttribute("data-p")));});}
function initTheme(){try{return localStorage.getItem("ucl_theme")||"dark";}catch(e){return "dark";}}
function setTheme(t){document.documentElement.setAttribute("data-theme",t);try{localStorage.setItem("ucl_theme",t);}catch(e){}var b=document.getElementById("tbtn");if(b)b.textContent=t==="dark"?"\u{1F319}":"\u2600\uFE0F";}
function toggleTheme(){setTheme(document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark");}
function switchLang(){var l=curLang()==="fa"?"en":"fa";try{localStorage.setItem("ucl_lang",l);}catch(e){}applyLang();}
function applyLang(skipHook){var l=curLang();document.documentElement.setAttribute("lang",l);document.documentElement.setAttribute("dir",l==="en"?"ltr":"rtl");var b=document.getElementById("lbtn");if(b)b.textContent=l==="en"?"\u0641\u0627":"EN";trText();trPlace();if(!skipHook&&typeof onLang==="function")onLang();}
var fmtDate = function(iso){
  var l=curLang();
  try{
    var d = new Date(iso);
    if(l==="fa"){
      // Persian order: weekday\u060C day month-name year (\u06F3\u06F0 \u0645\u0631\u062F\u0627\u062F \u06F1\u06F4\u06F0\u06F5) \u2014 fa-IR
      // toLocaleString yields year-first (\u06F1\u06F4\u06F0\u06F5 \u0645\u0631\u062F\u0627\u062F \u06F3\u06F0), which is wrong for Persian.
      var parts = new Intl.DateTimeFormat("fa-IR",{day:"numeric",month:"long",year:"numeric",weekday:"long",hour:"2-digit",minute:"2-digit",hour12:false,timeZone:curTz()}).formatToParts(d);
      var g = function(t){ var p=parts.find(function(x){return x.type===t;}); return p?p.value:""; };
      return g("weekday")+"\u060C "+g("day")+" "+g("month")+" "+g("year")+" \u0633\u0627\u0639\u062A "+g("hour")+":"+g("minute");
    }
    return d.toLocaleString("en-GB",{dateStyle:"full",timeStyle:"short",timeZone:curTz()});
  }
  catch(e){ return new Date(iso).toString(); }
};
// v12.32: the HERO's short date \u2014 weekday + day + month ONLY ("Sunday 22
// September"), the run that rides under the big time chip (.kickdate).
// No year, no clock: the chip above already owns the time, and the
// weekday+date answers "WHEN is that" at a glance.
var fmtHeroDate = function(iso){
  var l=curLang();
  try{
    var d = new Date(iso);
    if(l==="fa"){
      var parts = new Intl.DateTimeFormat("fa-IR",{day:"numeric",month:"long",weekday:"long",timeZone:curTz()}).formatToParts(d);
      var g = function(t){ var p=parts.find(function(x){return x.type===t;}); return p?p.value:""; };
      return g("weekday")+" "+g("day")+" "+g("month");
    }
    return d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",timeZone:curTz()});
  }
  catch(e){ return ""; }
};
var faNum = function(n){ return String(n).replace(/[0-9]/g,function(d){return "\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9"[d];}); };
var fmtNum = function(n){ return curLang()==="en"?String(n):faNum(n); };
function compName(m){
  if(curLang()==="en") return (I18N.en.comps&&I18N.en.comps[m.competition.code])||m.competition.code;
  return m.competition.faName||m.competition.code;
}
function monogram(t){
  // Future-plan fix (club badges not loading): a failed or missing crest now
  // falls back to a clean two-letter club monogram instead of a bare \u26BD.
  // NOTE: this lives inside a template literal \u2014 \\s+ emits the s+ regex
  // (a single s would be cooked to a literal "s" and split on the letter!).
  var n = String((t && (t.faName || t.name)) || "");
  var w = n.split(/\\s+/).filter(Boolean);
  if(!w.length) return "\u26BD";
  if(w.length === 1) return w[0].substring(0, 2);
  return w[0].substring(0, 1) + w[w.length - 1].substring(0, 1);
}
function logo(t){
  var el = document.createElement("span"); el.className = "logo";
  if(t.crest){
    var img = document.createElement("img");
    img.src = t.crest; img.alt = ""; img.loading = "lazy"; img.decoding = "async"; img.referrerPolicy = "no-referrer";
    img.onerror = function(){ el.textContent = monogram(t); };
    el.appendChild(img);
  } else { el.textContent = monogram(t); }
  return el;
}
function shareText(m, finished){
  var en = curLang()==="en";
  var h = en ? m.homeTeam.name : (m.homeTeam.faName||m.homeTeam.name);
  var a = en ? m.awayTeam.name : (m.awayTeam.faName||m.awayTeam.name);
  var txt = h + " \u2013 " + a + " \u2014 " + compName(m);
  if((finished || m.status==="LIVE"||m.status==="IN_PLAY"||m.status==="PAUSED") && m.score && m.score.home!==null) txt += " \u2014 " + fmtNum(m.score.home) + ":" + fmtNum(m.score.away);
  return txt + " \u2014 " + fmtDate(m.utcDate);
}
var S_ICONS = {
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
  wa: '<path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>',
  tg: '<path fill="#2AABEE" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>',
  mail: '<rect x="2.5" y="5" width="19" height="14.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"></rect><path d="M3.5 6l8.5 6.5 8.5-6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.8"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>',
  check: '<polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline>',
  cal: '<rect x="3" y="4.5" width="18" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"></rect><path d="M8 2.5v4M16 2.5v4M3 10h18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>',
  dots: '<circle cx="5" cy="12" r="2.1"/><circle cx="12" cy="12" r="2.1"/><circle cx="19" cy="12" r="2.1"/>'
};
function sBtn(tag, href, body, title){
  var el = document.createElement(tag);
  el.className = "sbtn";
  el.title = title; el.setAttribute("aria-label", title);
  if(tag === "a"){ el.href = href; el.target = "_blank"; el.rel = "noopener"; }
  else el.type = "button";
  el.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">' + body + '</svg>';
  return el;
}
function gcalDates(iso){
  var s = new Date(iso), e = new Date(s.getTime() + 2*60*60*1000);
  var z = function(n){ return n < 10 ? "0"+n : ""+n; };
  var f = function(d){ return "" + d.getUTCFullYear() + z(d.getUTCMonth()+1) + z(d.getUTCDate()) + "T" + z(d.getUTCHours()) + z(d.getUTCMinutes()) + "00Z"; };
  return f(s) + "/" + f(e);
}
function shareRow(m, finished){
  var t = encodeURIComponent(shareText(m, finished));
  var u = encodeURIComponent(location.origin + location.pathname);
  var row = document.createElement("div"); row.className = "share";
  row.appendChild(sBtn("a", "https://wa.me/?text=" + t, S_ICONS.wa, T("share") + " WhatsApp"));
  row.appendChild(sBtn("a", "https://t.me/share/url?url=" + u + "&text=" + t, S_ICONS.tg, T("share") + " Telegram"));
  row.appendChild(sBtn("a", "mailto:?subject=" + t + "&body=" + t, S_ICONS.mail, T("share") + " Email"));
  if(!finished){
    var calU = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + t + "&dates=" + gcalDates(m.utcDate) + "&details=" + t;
    row.appendChild(sBtn("a", calU, S_ICONS.cal, T("cal")));
  }
  var cb = sBtn("button", null, S_ICONS.copy, T("copy"));
  cb.onclick = function(){
    var raw = shareText(m, finished), ok = function(){
      cb.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">' + S_ICONS.check + '</svg>'; cb.title = T("copied"); cb.setAttribute("aria-label", T("copied"));
      setTimeout(function(){ cb.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">' + S_ICONS.copy + '</svg>'; cb.title = T("copy"); cb.setAttribute("aria-label", T("copy")); }, 1600);
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(raw).then(ok, function(){ fallbackCopy(raw); ok(); });
    } else { fallbackCopy(raw); ok(); }
  };
  row.appendChild(cb);
  // v12.21 (the user's ask): the labeled \xABShare\xBB pill on every row was visual
  // noise. The toggle is now a QUIET ghost \u22EF \u2014 icon-only, borderless, muted,
  // 44\xD744 hit area; the options unfold in a popover (outside click / Esc /
  // the next \u22EF close it \u2014 see closeShare and the document listeners below).
  // aria-expanded + tooltip stay.
  // v12.31: the \u22EF moved to the box's top inline-end corner (see the .sharewrap
  // CSS note) \u2014 the icon is 16px and CORNER-ANCHORED so it clears the round
  // crest that hugs that corner on PC (the crest's square corner is empty).
  var wrap = document.createElement("div"); wrap.className = "sharewrap";
  var tg = sBtn("button", null, S_ICONS.dots, T("share"));
  tg.className = "sharetoggle";
  tg.setAttribute("aria-expanded", "false");
  tg.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' + S_ICONS.dots + '</svg>';
  tg.onclick = function(){
    var open = wrap.classList.toggle("open");
    tg.setAttribute("aria-expanded", open ? "true" : "false");
  };
  wrap.appendChild(tg);
  wrap.appendChild(row);
  return wrap;
}
// v12.21: the share popover closes from ANYWHERE \u2014 an outside click, Esc, or
// another \u22EF opening \u2014 so at most one popover is ever on screen and the
// collapsed rows carry nothing but three quiet dots.
function closeShare(w){
  w.classList.remove("open");
  var t = w.querySelector(".sharetoggle");
  if(t) t.setAttribute("aria-expanded", "false");
}
document.addEventListener("click", function(ev){
  var open = document.querySelectorAll(".sharewrap.open");
  for(var i = 0; i < open.length; i++) if(!open[i].contains(ev.target)) closeShare(open[i]);
});
document.addEventListener("keydown", function(ev){
  if(ev.key === "Escape"){
    var open = document.querySelectorAll(".sharewrap.open");
    for(var i = 0; i < open.length; i++) closeShare(open[i]);
  }
});
function fallbackCopy(text){
  var ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand("copy"); }catch(e){}
  document.body.removeChild(ta);
}
function countdown(iso){
  var ms = new Date(iso).getTime() - Date.now();
  if(ms <= 0) return T("soon");
  var h = Math.floor(ms/36e5), m = Math.floor(ms%36e5/6e4);
  if(h > 24) return fmt("inDays",fmtNum(Math.floor(h/24)));
  return "\u23F3 " + fmtNum(h) + ":" + fmtNum(m);
}
// Static local kickoff time \u2014 the bigbar is the ONE live countdown; everywhere
// else shows a stable time so the page stays quiet (no per-second reflow).
function fmtKick(iso){
  try{
    var t = new Date(iso).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:curTz()});
    return "\u{1F552} " + fmtNum(t);
  }catch(e){ return ""; }
}
function keyOf(m){ return (m.id||"")+"|"+((m.status||"")[0]||"")+(m.score?(m.score.home+"-"+m.score.away):"")+m.utcDate; }
function listSig(list){ var s=""; for(var i=0;i<(list||[]).length;i++) s+=keyOf(list[i])+";"; return s; }
// v12.27 (review item 6): the shared SCORE builder \u2014 the winning side's
// number renders as <b> (900 + glow, see .score b), the losing side dims
// (.score .lose); a draw keeps both plain. Used by render() (mrow rows) and
// spotItemNode() (the hero / big-matches / UCL / week boxes) \u2014 one anatomy.
function scoreNode(score){
  var vs = document.createElement("div"); vs.className = "score";
  var h = (score.home==null?0:score.home), a = (score.away==null?0:score.away);
  var hEl = document.createElement(h>a ? "b" : "span"); if(h<a) hEl.className = "lose"; hEl.textContent = fmtNum(score.home);
  var sep = document.createElement("span"); sep.className = "sep"; sep.textContent = " - ";
  var aEl = document.createElement(a>h ? "b" : "span"); if(a<h) aEl.className = "lose"; aEl.textContent = fmtNum(score.away);
  vs.appendChild(hEl); vs.appendChild(sep); vs.appendChild(aEl);
  return vs;
}
// v12.27 (review item 8): bidi isolation for Latin club names. Policy (one
// rule, consistently): names are PERSIAN-FIRST \u2014 the dict, the AI-learned
// cache and the stem fallback translate everything they can; whatever still
// has no Persian rendering falls back to the Latin provider name, and THAT
// run is wrapped in an isolated <bdi dir="ltr"> so dashes/punctuation next
// to embedded Latin text can never flip order inside the RTL paragraph.
// (In EN mode the page itself is LTR \u2014 no wrap needed.)
function nameInto(el, s){
  // v12.x-team-title-tooltip: set the title attribute so hovering a
  // truncated team name shows the full name as a tooltip. The hero
  // card's team names use white-space:nowrap + fluid clamp() font-size
  // (no truncation), but other boxes may truncate long names — the
  // tooltip gives users the full name on hover.
  el.title = s;
  if(curLang()!=="en" && /[A-Za-z]/.test(s) && !/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF]/.test(s)){
    el.textContent = "";
    var b = document.createElement("bdi"); b.setAttribute("dir","ltr"); b.textContent = s;
    el.appendChild(b);
  } else { el.textContent = s; }
  return el;
}
function render(list, el, finished){
  var sig0 = listSig(list)+"|"+(finished?1:0);
  if(el.dataset.sig===sig0) return;
  el.dataset.sig=sig0;
  if(el.childElementCount) el.classList.add("stable");
  el.innerHTML = "";
  if(!list || !list.length){ el.innerHTML = "<div class='empty'>"+T("noMatches")+"</div>"; return; }
  list.forEach(function(m, idx){
    var row = document.createElement("div"); row.className = "match";
    if(m.derby) row.className += " derby";
    row.style.setProperty("--i", idx);
    var h = logo(m.homeTeam), a = logo(m.awayTeam);
    var en = curLang()==="en";
    var hName = document.createElement("div"); hName.className = "team"; nameInto(hName, en ? m.homeTeam.name : (m.homeTeam.faName || m.homeTeam.name));
    var aName = document.createElement("div"); aName.className = "team"; nameInto(aName, en ? m.awayTeam.name : (m.awayTeam.faName || m.awayTeam.name));
    var hs = document.createElement("div"); hs.className = "side"; hs.appendChild(h); hs.appendChild(hName);
    var as = document.createElement("div"); as.className = "side away"; as.appendChild(aName); as.appendChild(a);
    var live = !finished && (m.status==="LIVE"||m.status==="IN_PLAY"||m.status=="PAUSED");
    if((finished || live) && m.score && m.score.home !== null){
      var vs = scoreNode(m.score);
      row.appendChild(hs); row.appendChild(vs); row.appendChild(as);
    } else {
      // v12.25: every unplayed row's center slot carries its kickoff TIME \u2014
      // the same x line the score takes on played rows (one aligned system).
      var kt = document.createElement("div"); kt.className = "kick";
      var kc = document.createElement("span"); kc.className = "countdown"; kc.textContent = fmtKick(m.utcDate);
      kt.appendChild(kc);
      row.appendChild(hs); row.appendChild(kt); row.appendChild(as);
    }
    var info = document.createElement("div"); info.className = "info";
    var c = document.createElement("span"); c.className = "comp";
    if(m.competition.emblem){
      var cimg = document.createElement("img"); cimg.className = "complogo"; cimg.src = m.competition.emblem; cimg.alt = ""; cimg.loading = "lazy"; cimg.decoding = "async";
      cimg.onerror = function(){ this.remove(); };
      c.appendChild(cimg);
    }
    c.appendChild(document.createTextNode(compName(m)));
    info.appendChild(c);
    if(m.derby){ var db = document.createElement("span"); db.className = "derbybadge"; db.textContent = T("derby"); info.appendChild(db); }
    if(m.top){ var tb = document.createElement("span"); tb.className = "topbadge"; tb.textContent = "\u{1F3C6} " + T("topBadge"); info.appendChild(tb); }
    info.appendChild(document.createTextNode(fmtDate(m.utcDate)));
    if(live){
      var chip = document.createElement("span"); chip.className = "livechip";
      var lottie = document.createElement("dotlottie-player"); lottie.className = "live-lottie"; lottie.setAttribute("src","/Live.lottie"); lottie.setAttribute("autoplay",""); lottie.setAttribute("loop",""); lottie.setAttribute("background","transparent");
      chip.appendChild(lottie);
      info.appendChild(chip);
      if(m.minute != null){
        var lmin = document.createElement("span"); lmin.className = "lmin"; lmin.textContent = fmtNum(m.minute) + "\u02B9";
        info.appendChild(lmin);
      }
    }
    // v12.25: no kickoff-time chip in the info line anymore \u2014 the time rides
    // the row's CENTER slot (.kick) between its own two teams.
    if(live && m.scorers && m.scorers.length){
      var sc = document.createElement("div"); sc.className = "scorers";
      m.scorers.forEach(function(s){
        var row = document.createElement("div"); row.className = "srow";
        var icon = s.type==="PENALTY" ? "\u{1F3AF}" : (s.type==="OWN_GOAL" ? "\u{1F945}" : "\u26BD");
        var lbl = s.type==="PENALTY" ? T("pen") : (s.type==="OWN_GOAL" ? T("own") : "");
        row.textContent = icon + " " + fmtNum(s.minute) + "\u02B9 ";
        // v12.27 (review item 8): player names are Latin provider strings \u2014
        // the same isolated <bdi dir="ltr"> wrap the club names get.
        if(s.scorer){ var sb = document.createElement("bdi"); sb.setAttribute("dir","ltr"); sb.textContent = s.scorer; row.appendChild(sb); }
        if(lbl) row.appendChild(document.createTextNode(" (" + lbl + ")"));
        var t = scorerTeam(m, s.team);
        if(t) row.appendChild(document.createTextNode(" \u2014 " + t));
        sc.appendChild(row);
      });
      info.appendChild(sc);
    }
    if(m.venue){ var vn = document.createElement("span"); vn.className = "venue"; vn.textContent = "\u{1F3DF}\uFE0F " + m.venue; info.appendChild(vn); }
    // v12.23: the stray re-append of hs/vs/as that sat here is REMOVED \u2014 it
    // re-ordered the row's children after the fact on scored rows and
    // CRASHED the whole render on any unscored row (appendChild(undefined)),
    // dragging the page's data down with it through load()'s catch. The row
    // was already fully assembled at the score branch above.
    // v12.31: the share \u22EF no longer rides the info line (it pushed the
    // centered chips off-center) \u2014 it is the box's top inline-end corner.
    var sr = shareRow(m, finished);
    var wrap = document.createElement("div"); wrap.className = "mrow"; wrap.appendChild(row); wrap.appendChild(info); wrap.appendChild(sr);
    el.appendChild(wrap);
  });
}
async function load(){
  // v12.56: show loading animation on all card content areas while fetching
  var loadingIds = ["topSpot","uclSpot","weekBox","standings","cups","finished","liveMatches","ucl"];
  if(!DATA.upcoming.length){ loadingIds.forEach(function(id){ var el = document.getElementById(id); if(el){ el.classList.add("card-loading"); addLoadingLottie(el); } }); }
  try{
    var r = await fetch("/api/public-matches");
    if(!r.ok) throw new Error("HTTP " + r.status);
    var d = await r.json();
    DATA = { upcoming: d.upcoming || [], finished: d.finished || [], nextBig: d.nextBig || null, topSpot: d.topSpot || null, thisWeek: d.thisWeek || [], nextWeek: d.nextWeek || [], standings: d.standings || null, cups: d.cups || null, ucl: d.ucl || null, cached: !!d.cached, cachedAt: d.cachedAt || null };
    SYNC_TS = d.fetchedAt ? new Date(d.fetchedAt).getTime() : (d.cachedAt ? new Date(d.cachedAt).getTime() : Date.now());
    applyView();
    updateBigBar();
    renderStandings(d.standings);
    renderCups(d.cups);
    renderUcl(d.ucl);
    renderUclSpot(d.ucl);
    renderTopSpot(d.topSpot);
    renderWeek(d.thisWeek, d.nextWeek);
    renderLive();
    renderHeroSpot();
    loadingIds.forEach(function(id){ var el = document.getElementById(id); if(el){ el.classList.remove("card-loading"); removeLoadingLottie(el); } });
  }catch(e){
    ["ucl","standings","cups","finished","liveMatches"].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.innerHTML = "<div class='empty'>"+T("errLoad")+"</div>";
    });
    renderTopSpot(null);
    renderWeek(null);
    renderHeroSpot();
    loadingIds.forEach(function(id){ var el = document.getElementById(id); if(el){ el.classList.remove("card-loading"); removeLoadingLottie(el); } });
  }
}
// v12.x-loading-lottie: inject a <dotlottie-player> loading animation into
// a container that has the .card-loading class. The animation (loading.lottie,
// a 500x500 Lottie shown at 48x48px) replaces the old CSS border spinner.
// Idempotent — if the player is already present, no-op. removeLoadingLottie
// cleans up after the data arrives.
function addLoadingLottie(el){
  if(!el || el.querySelector("dotlottie-player.loading-lottie")) return;
  var p = document.createElement("dotlottie-player");
  p.className = "loading-lottie";
  p.setAttribute("src","/loading.lottie");
  p.setAttribute("autoplay","");
  p.setAttribute("loop","");
  p.setAttribute("background","transparent");
  p.setAttribute("aria-hidden","true");
  el.appendChild(p);
}
function removeLoadingLottie(el){
  if(!el) return;
  var p = el.querySelector("dotlottie-player.loading-lottie");
  if(p) p.remove();
}
var DATA = { upcoming: [], finished: [], nextBig: null, topSpot: null, thisWeek: [], nextWeek: [], standings: null, cups: null, cached: false, cachedAt: null };
var FLAGS = { PL: "\u{1F3F4}", PD: "\u{1F1EA}\u{1F1F8}", SA: "\u{1F1EE}\u{1F1F9}", FL1: "\u{1F1EB}\u{1F1F7}", BL1: "\u{1F1E9}\u{1F1EA}", PGL: "\u{1F1EE}\u{1F1F7}" };
// v12.19 (the user's ask): the timezone controls no longer squat in the
// topbar \u2014 ONE settings-gear button next to the theme toggle opens this
// popover. Pick a zone (times re-render instantly), click the \u2715, the gear
// again, outside, or press Esc to close.
function toggleTz(){
  var p = document.getElementById("tzpanel"), b = document.getElementById("sbtn");
  if(!p || !b) return;
  var open = !p.classList.contains("open");
  p.classList.toggle("open", open);
  b.setAttribute("aria-expanded", open ? "true" : "false");
  if(open){
    // v12.19: reopening always shows the FULL list \u2014 a stale search filter
    // from the previous visit would otherwise hide every other zone.
    var f = document.getElementById("tzfilter");
    if(f && f.value){ f.value = ""; if(f.oninput) f.oninput(); }
    if(f){ try{ f.focus(); }catch(e){} }
  }
}
function closeTz(){
  var p = document.getElementById("tzpanel"), b = document.getElementById("sbtn");
  if(p) p.classList.remove("open");
  if(b) b.setAttribute("aria-expanded", "false");
}
document.addEventListener("mousedown", function(ev){
  var p = document.getElementById("tzpanel");
  if(!p || !p.classList.contains("open")) return;
  var t = ev.target, inside = false;
  while(t){ if(t === p || t.id === "sbtn"){ inside = true; break; } t = t.parentNode; }
  if(!inside) closeTz();
});
document.addEventListener("keydown", function(ev){ if((ev.key || "") === "Escape") closeTz(); });
function tzGroupLabel(g){
  if(curLang() === "fa"){
    if(g === "Etc") return "\u231A \u0622\u0641\u0633\u062A\u200C\u0647\u0627\u06CC \u062B\u0627\u0628\u062A GMT";
    if(g === "General") return "\u0639\u0645\u0648\u0645\u06CC";
    return FA_TZ_REGION[g.toLowerCase()] || g;
  }
  if(g === "Etc") return "Fixed GMT offsets";
  if(g === "General") return "General";
  return g;
}
function initTz(){
  var sel = document.getElementById("tzsel");
  if(!sel) return;
  if(!TZ_ALL.length) TZ_ALL = buildTzAll();
  var filter = document.getElementById("tzfilter");
  var gear = document.getElementById("sbtn");
  if(gear){ gear.title = T("tzBtn"); gear.setAttribute("aria-label", T("tzBtn")); }
  var cb = document.getElementById("tzclose");
  if(cb){ cb.title = T("tzClose"); cb.setAttribute("aria-label", T("tzClose")); }
  if(filter) filter.setAttribute("aria-label", T("tzSearch"));
  sel.title = T("tzBtn");
  var render = function(){
    var l = curLang();
    var q = (filter && filter.value || "").trim().toLowerCase();
    sel.innerHTML = "";
    var addGroup = function(label, zones){
      var og = document.createElement("optgroup"); og.label = label;
      zones.forEach(function(tz){
        var inf = tzInfo(tz);
        var lbl = l === "fa" ? inf.fa : inf.en;
        if(q){
          // v12.19: the search matches BOTH scripts \u2014 \xAB\u062A\u0647\u0631\u0627\u0646\xBB, "tehran"
          // and "3:30" all find Asia/Tehran.
          var other = (l === "fa" ? inf.en : inf.fa).toLowerCase();
          if(lbl.toLowerCase().indexOf(q) < 0 && other.indexOf(q) < 0 && inf.value.indexOf(q) < 0) return;
        }
        var o = document.createElement("option"); o.value = tz; o.textContent = lbl;
        og.appendChild(o);
      });
      if(og.children.length) sel.appendChild(og);
    };
    // v12.19: the \u2B50 popular group pins Tehran/Dubai/London... at the very
    // top \u2014 the user could not find Tehran +3:30 buried deep in Asia.
    addGroup(l === "fa" ? "\u2B50 \u067E\u0631\u06A9\u0627\u0631\u0628\u0631\u062F" : "\u2B50 Popular", TZ_COMMON.filter(function(tz){ return TZ_ALL.indexOf(tz) >= 0; }));
    var groups = {};
    TZ_ALL.forEach(function(tz){
      var g = tz.indexOf("/") > 0 ? tz.split("/")[0] : "General";
      (groups[g] = groups[g] || []).push(tz);
    });
    var keys = Object.keys(groups).sort().filter(function(g){ return g !== "Etc" && g !== "General"; });
    if(groups.General) keys.push("General");
    if(groups.Etc) keys.push("Etc");
    keys.forEach(function(g){ addGroup(tzGroupLabel(g), groups[g]); });
    try{ sel.value = curTz(); }catch(e){}
    // v12.x-tz-search-fix: when the filter narrows results, the <select>
    // defaults to a dropdown (size=1) which shows BLANK if curTz() isn't
    // in the filtered list (the user typed 'sydney' but the select shows
    // nothing — they have to click the arrow to see the 1 result). Fix:
    // (1) if the current selection is empty (curTz not in filtered list),
    //     default to the first option so the user immediately sees a result.
    // (2) switch the select to a LISTBOX (size>1) when filtered so ALL
    //     results are visible without clicking the dropdown arrow. When
    //     no filter, keep it a compact dropdown (size=1) so the full 458-
    //     option list doesn't dominate the panel. The listbox size scales
    //     with result count (min 1, max 8 rows).
    if(!sel.value && sel.options.length){ sel.value = sel.options[0].value; }
    var n = sel.options.length;
    sel.size = q ? Math.min(Math.max(n, 1), 8) : 1;
  };
  render();
  if(filter) filter.oninput = render;
  sel.onchange = function(){
    try{ localStorage.setItem("ucl_tz", sel.value); }catch(e){}
    rerenderAll();
    closeTz();
  };
}
function rerenderAll(){
  applyView();
  renderStandings(DATA.standings);
  renderCups(DATA.cups);
  renderUcl(DATA.ucl);
  renderUclSpot(DATA.ucl);
  renderTopSpot(DATA.topSpot);
  renderWeek(DATA.thisWeek, DATA.nextWeek);
  renderHeroSpot();
  updateBigBar();
}
// v12.18: language switch re-renders the two cards whose dynamic titles/names
// trText() would otherwise clobber (the week card's \xAB\u0647\u0641\u062A\u0647 \u0628\u0639\u062F\xBB header and the
// UCL table's language-dependent names). v12.19: it also rebuilds the timezone
// popover options \u2014 labels swap between \xAB\u0622\u0633\u06CC\u0627/\u062A\u0647\u0631\u0627\u0646 \u06AF\u0631\u06CC\u0646\u0648\u06CC\u0686+\u06F3:\u06F3\u06F0\xBB and
// "Asia/Tehran GMT+3:30".
var onLang = function(){ renderWeek(DATA.thisWeek, DATA.nextWeek); renderUcl(DATA.ucl); renderHeroSpot(); renderTopSpot(DATA.topSpot); renderLive(); renderFinished(true); initTz(); };
// v12.12: catOf/renderSections (and the CAT_CUPS table) are retired \u2014 they
// fed the \xAB\u{1F4C5} \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648\xBB sections list, which is gone together with the
// view toggle (the page is always big-only now; the hero + the topspot box
// + the UCL box ARE the presentation).
function matchKey(m){ return String(m.id||"") + "|" + m.utcDate; }
// v12.12: the view toggle is RETIRED \u2014 the page is permanently big-only
// (\xAB\u0641\u0642\u0637 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF\xBB, the user's default). The \xAB\u{1F4C5} \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648\xBB list
// card is retired with it: the hero card, the topspot box and the UCL box
// ARE the upcoming presentation. All that remains of the old per-view
// rendering is the finished card \u2014 the week's selected-team results.
// v12.32 (the user's ask): "for showing recent result, show the last 5, and
// add a 'more' button that shows the latest 20 match results (do it in pc
// as well)" \u2014 the finished card renders the latest FIVE by default with a
// pill expander under the rows; one tap \u2192 the latest TWENTY (the server
// cap, raised 12 \u2192 20 this release), the pill flips to collapse. PC and
// phones share the behavior. force=true clears render()'s signature so a
// language switch rebuilds the rows + the pill in the new locale.
var FIN_EXPANDED = false;
var FIN_MIN = 5, FIN_MAX = 20;
// v12.42-livesection: renderLive — filters DATA.upcoming for live matches
// (LIVE/IN_PLAY/PAUSED) and renders them in the #liveCard. The card auto-hides
// (display:none) when no matches are live; shows up to 20 live matches.
// Matches stay here as long as the match status is live. Uses spotItemNode
// (same anatomy as every other match row on the page) with finished:true
// so live scores render in the center slot.
function renderLive(){
  var card = document.getElementById("liveCard"), el = document.getElementById("liveMatches");
  if(!card || !el) return;
  el.innerHTML = "";
  // v12.x-live-lottie: replace the breathing green dot with the Live.lottie
  // animation (a pulsing "LIVE" badge). The <dotlottie-player> is injected
  // once per renderLive call (removed if already present from a previous
  // call). The h2 text node keeps the "مسابقات زنده" heading (the 🔴 emoji
  // is stripped). The Lottie animation replaces the .live-breath CSS dot.
  var h2 = card.querySelector("h2");
  if(h2){
    var oldBreath = h2.querySelector(".live-breath");
    if(oldBreath) oldBreath.remove();
    var oldLottie = h2.querySelector("dotlottie-player.live-lottie");
    if(oldLottie) oldLottie.remove();
    var lottie = document.createElement("dotlottie-player"); lottie.className = "live-lottie"; lottie.setAttribute("src","/Live.lottie"); lottie.setAttribute("autoplay",""); lottie.setAttribute("loop",""); lottie.setAttribute("background","transparent"); lottie.setAttribute("aria-hidden","true");
    h2.insertBefore(lottie, h2.firstChild);
    // Strip the 🔴 emoji from the text node (the data-i="hLive" i18n string starts with 🔴)
    h2.childNodes.forEach(function(n){ if(n.nodeType === 3 && n.textContent.indexOf("\u{1F534}") !== -1) n.textContent = n.textContent.replace(/\u{1F534}\s*/g, ""); });
  }
  var live = (DATA.upcoming || []).filter(function(m){ return m.status==="LIVE"||m.status==="IN_PLAY"||m.status==="PAUSED"; });
  if(!live.length){ card.style.display = "none"; return; }
  card.style.display = "";
  live.sort(function(a, b){ return (a.minute||0) - (b.minute||0) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime(); });
  live.slice(0, 20).forEach(function(m, idx){ el.appendChild(spotItemNode(m, idx, { finished: true, isLiveCard: true })); });
}
function renderFinished(force){
  var el = document.getElementById("finished"); if(!el) return;
  var list = DATA.finished.filter(function(m){ return m.big || m.top || m.clash || m.sel; });
  if(force) delete el.dataset.sig;
  render(list.slice(0, FIN_EXPANDED ? FIN_MAX : FIN_MIN), el, true);
  var old = el.querySelector(".finmore");
  if(old) old.remove();
  if(list.length > FIN_MIN){
    var b = document.createElement("button");
    b.className = "finmore"; b.type = "button";
    b.textContent = FIN_EXPANDED ? T("lessResults") : T("moreResults");
    b.setAttribute("aria-expanded", FIN_EXPANDED ? "true" : "false");
    b.onclick = function(){ FIN_EXPANDED = !FIN_EXPANDED; renderFinished(false); };
    el.appendChild(b);
  }
}
function applyView(){
  renderFinished(false);
}
// v12.10: renderSpecial removed \u2014 the far nextBig fallback card now lives
// in the HERO CARD at the very top (stuck to its countdown bar), not at the
// head of the upcoming list.
function compOf(c){ if(!c) return ""; return curLang()==="en" ? c.name : (c.faName||c.name); }
function firstMatchOf(code){
  var best = null;
  if(!DATA || !DATA.upcoming) return best;
  DATA.upcoming.forEach(function(m){
    if(m.competition && m.competition.code === code && m.status !== "FINISHED" && (!best || m.utcDate < best.utcDate)) best = m;
  });
  return best;
}
function renderStandings(d){
  var el = document.getElementById("standings"); if(!el) return;
  el.innerHTML = "";
  if(!d) return;
  var grid = document.createElement("div"); grid.className = "grid4";
  // v12.5: PGL joins the grid \u2014 the Iran card's table moved here.
  // v12.12: A-League (AL) removed (the user's ask) \u2014 six boxes remain.
  ["PL","PD","SA","FL1","BL1","PGL"].forEach(function(code){
    var st = d[code], box = document.createElement("div"); box.className = "stbox";
    var h = document.createElement("div"); h.className = "stbox-head";
    // v12.36-enfix: the country-flag emoji prefix (FLAGS[code] + " ") is RETIRED
    // — the user's ask. In English mode the flag emoji rendered as "EN"/"ES"/
    // "IT"/"FR" grey text labels (font fallback) before the league emblem
    // image, which the user found noisy. The league emblem image alone is the
    // brand mark now, bumped ~25% (16px → 20px via .stbox-head img above).
    if(st && st.emblem){ var img = document.createElement("img"); img.src = st.emblem; img.alt = ""; img.onerror = function(){ this.remove(); }; h.appendChild(img); }
    h.appendChild(document.createTextNode(compOf(st) || code));
    if(st && st.started === false){
      var first = firstMatchOf(code);
      var ov = document.createElement("div"); ov.className = "stnot-overlay";
      var l = document.createElement("div"); l.className = "stnot-ovl-label"; l.textContent = T("stNot");
      ov.appendChild(l);
      if(first){
        var trow = document.createElement("div"); trow.className = "stnot-ovl-timer";
        trow.appendChild(document.createTextNode(curLang()==="en" ? "First match: " : "\u0627\u0648\u0644\u06CC\u0646 \u0628\u0627\u0632\u06CC: "));
        trow.appendChild(document.createTextNode(fmtKick(first.utcDate)));
        ov.appendChild(trow);
      }
      box.appendChild(ov);
    }
    box.appendChild(h);
    if(st && st.teams && st.teams.length){
      // v12.27 (review item 4): the compact grid's Pts COLUMN HEADER \u2014 \xAB\u0627\u0645\u062A\u06CC\u0627\u0632\xBB
      // (T("thPts"), "Pts" in EN) rides its own header row over the numbers,
      // exactly like the full UCL table labels every column.
      var th = document.createElement("div"); th.className = "sthead";
      var thf = document.createElement("span"); thf.className = "sthead-fill";
      var thp = document.createElement("span"); thp.className = "sthead-p"; thp.textContent = T("thPts");
      th.appendChild(thf); th.appendChild(thp); box.appendChild(th);
      st.teams.forEach(function(t){
        var r = document.createElement("div"); r.className = "strow" + (t.pos===1 ? " top1" : "");
        var p = document.createElement("span"); p.className = "stpos" + (t.pos<=3 ? " top3" : ""); p.textContent = fmtNum(t.pos);
        var n = document.createElement("span"); n.className = "stname"; nameInto(n, curLang()==="en" ? t.name : (t.faName||t.name));
        var pt = document.createElement("span"); pt.className = "stpts"; pt.textContent = fmtNum(t.points);
        r.appendChild(p); r.appendChild(n); r.appendChild(pt);
        box.appendChild(r);
      });
    } else {
      var e = document.createElement("div"); e.className = "stempty"; e.textContent = T("stEmpty");
      box.appendChild(e);
    }
    grid.appendChild(box);
  });
  el.appendChild(grid);
}
function cupBox(c){
  var box = document.createElement("div"); box.className = "cupbox";
  var h = document.createElement("div"); h.className = "cupbox-head";
  if(c.emblem){ var img = document.createElement("img"); img.src = c.emblem; img.alt=""; img.onerror = function(){ this.remove(); }; h.appendChild(img); }
  h.appendChild(document.createTextNode(compOf(c) + (c.qualifying ? (curLang()==="en" ? " (Qualifying)" : " (\u0645\u0642\u062F\u0645\u0627\u062A\u06CC)") : "")));
  var tierEm = c.tier === "gold" ? "\u{1F947} " : c.tier === "silver" ? "\u{1F948} " : c.tier === "bronze" ? "\u{1F949} " : "";
  h.appendChild(document.createTextNode(tierEm));
  box.appendChild(h);
  if(c.next){
    var n = c.next, en = curLang()==="en";
    var m = document.createElement("div"); m.className = "cupmatch";
    var teams = document.createElement("div"); teams.className = "teams";
    var t1 = document.createElement("span"); nameInto(t1, en ? n.homeTeam.name : (n.homeTeam.faName||n.homeTeam.name)); teams.appendChild(t1);
    teams.appendChild(document.createTextNode(" \u2013 "));
    var t2 = document.createElement("span"); nameInto(t2, en ? n.awayTeam.name : (n.awayTeam.faName||n.awayTeam.name)); teams.appendChild(t2);
    m.appendChild(teams);
    var live = n.status==="LIVE"||n.status==="IN_PLAY"||n.status==="PAUSED";
    var dt = document.createElement("div"); dt.className = "cupdate";
    if(live){ var sp = document.createElement("span"); sp.className = "live-tag"; sp.textContent = "\u{1F534} "+T("live"); dt.appendChild(sp); }
    else dt.appendChild(document.createTextNode(fmtDate(n.utcDate)));
    m.appendChild(dt);
    box.appendChild(m);
  } else {
    var e = document.createElement("div"); e.className = "stempty"; e.textContent = T("cupsNone");
    box.appendChild(e);
  }
  return box;
}
function renderCups(d){
  var el = document.getElementById("cups"); if(!el) return;
  el.innerHTML = "";
  if(!d || !d.length){ el.innerHTML = "<div class='empty'>"+T("cupsNone")+"</div>"; return; }
  // v12.x-cups-2col: merge ALL domestic cups into ONE shared grid so they
  // pair up in 2-column rows: [Spain][Italy] / [Germany][Iran] / [Eng FA][Eng EFL].
  // Previously each country created its own .cupgrid — single-cup countries
  // (Spain, Italy, Germany, Iran) rendered as full-width single boxes.
  var euro = [], intl = [], dom = {};
  d.forEach(function(c){
    if(c.code === "CL" || c.code === "EL" || c.code === "ECL") euro.push(c);
    else if(c.tier === "gold") intl.push(c);
    else { (dom[c.country||""] = dom[c.country||""] || []).push(c); }
  });
  var groups = [];
  if(euro.length) groups.push({ title: T("tierEurope"), items: euro });
  if(intl.length) groups.push({ title: T("intlCups"), items: intl });
  // Collect all domestic cups in country order (EN, ES, IT, DE, IR) — ONE grid
  var allDom = [];
  ["EN","ES","IT","DE","IR"].forEach(function(cc){ if(dom[cc]) allDom = allDom.concat(dom[cc]); });
  if(allDom.length) groups.push({ title: curLang()==="en" ? "Domestic Cups" : "\u062C\u0627\u0645\u200C\u0647\u0627\u06CC \u062D\u0630\u0641\u06CC", items: allDom });
  var frag = document.createElement("div");
  groups.forEach(function(g){
    var t = document.createElement("div"); t.className = "cupgroup-title"; t.textContent = g.title;
    frag.appendChild(t);
    var grid = document.createElement("div"); grid.className = "cupgrid";
    g.items.forEach(function(c){ grid.appendChild(cupBox(c)); });
    frag.appendChild(grid);
  });
  el.appendChild(frag);
}
// Dedicated UCL box: upcoming CL fixtures + the FULL league table (36-team
// Swiss-model standings, not truncated). v12.16: the table is COMPLETE \u2014
// every row carries matches played, wins, draws, losses and goal difference
// next to the points (the user's ask), with a sticky header row.
function renderUcl(d){
  var el = document.getElementById("ucl"); if(!el) return;
  el.innerHTML = "";
  if(!d){ el.innerHTML = "<div class='empty'>"+T("errLoad")+"</div>"; return; }
  // v12.35-uclfix: the matchday chip now lives INSIDE the h2.uclh2 (same row
  // as the title), not in a separate .ucl-head div below. The UCL emblem
  // image is retired (the starball SVG in the h2 is the UCL brand mark).
  // Append the matchday span to the existing h2 element (already in the
  // DOM with the starball + "UEFA Champions League" title). Remove any
  // previous matchday chip first (renderUcl runs on every language switch).
  // Use querySelector for robustness (previousElementSibling had a timing
  // issue on the initial page load).
  var h2ucl = document.querySelector("#uclCard h2.uclh2");
  if(h2ucl){
    var oldMd3 = h2ucl.querySelector(".ucl-md");
    if(oldMd3) oldMd3.remove();
    if(d.matchday){
      var md2 = document.createElement("span"); md2.className="ucl-md";
      md2.textContent = (curLang()==="en"?"Matchday ":"\u0647\u0641\u062A\u0647 ")+fmtNum(d.matchday);
      h2ucl.appendChild(md2);
    }
  }
  // v12.12: the all-fixtures list is GONE from this card (Sabah FK vs SK
  // Slavia Praha noise) \u2014 upcoming CL fixtures live in the uclspot box above
  // (\u22651 selected club, up to 8). This card is standings-only now.
  var wrap = document.createElement("div"); wrap.className = "ucl-stand-wrap";
  var st = document.createElement("div"); st.className = "ucl-stand";
  if(d.started === false){
    var ov = document.createElement("div"); ov.className = "stnot-overlay";
    var l = document.createElement("div"); l.className = "stnot-ovl-label"; l.textContent = T("stNot");
    ov.appendChild(l);
    var firstDate = (d.matches && d.matches.length) ? d.matches[0].utcDate : (d.firstStart || null);
    if(firstDate){
      var trow = document.createElement("div"); trow.className = "stnot-ovl-timer";
      trow.appendChild(document.createTextNode(curLang()==="en" ? "First match: " : "\u0627\u0648\u0644\u06CC\u0646 \u0628\u0627\u0632\u06CC: "));
      trow.appendChild(document.createTextNode(fmtKick(firstDate)));
      ov.appendChild(trow);
    }
    wrap.appendChild(ov);
  }
  if(d.teams && d.teams.length){
    // v12.16: header row \u2014 # | team | MP | W | D | L | GF | GA | GD | Pts in
    // the standard league-table order (the W/D/L/GF/GA middle columns fold
    // away on phones, leaving # | team | MP | GD | Pts). Missing stats render
    // as "\u2014" until the standings cache rotates in the new shape.
    var hr = document.createElement("div"); hr.className = "strow uclhead";
    var hpos = document.createElement("span"); hpos.className = "stpos"; hpos.textContent = "#";
    var hname = document.createElement("span"); hname.className = "stname"; hname.textContent = curLang()==="en" ? "Team" : "\u062A\u06CC\u0645";
    var hmp = document.createElement("span"); hmp.className = "stnum"; hmp.textContent = T("thP");
    var hw = document.createElement("span"); hw.className = "stnum ucl-hidem"; hw.textContent = T("thW");
    var hd = document.createElement("span"); hd.className = "stnum ucl-hidem"; hd.textContent = T("thD");
    var hl = document.createElement("span"); hl.className = "stnum ucl-hidem"; hl.textContent = T("thL");
    var hgf = document.createElement("span"); hgf.className = "stnum ucl-hidem"; hgf.textContent = T("thGF");
    var hga = document.createElement("span"); hga.className = "stnum ucl-hidem"; hga.textContent = T("thGA");
    var hgd = document.createElement("span"); hgd.className = "stnum"; hgd.textContent = T("thGD");
    var hpt = document.createElement("span"); hpt.className = "stpts"; hpt.textContent = T("thPts");
    hr.appendChild(hpos); hr.appendChild(hname); hr.appendChild(hmp); hr.appendChild(hw); hr.appendChild(hd); hr.appendChild(hl); hr.appendChild(hgf); hr.appendChild(hga); hr.appendChild(hgd); hr.appendChild(hpt);
    st.appendChild(hr);
    var num = function(v){ return (v == null || isNaN(v)) ? "\u2014" : fmtNum(v); };
    var gdTxt = function(t2){ if(t2.gd == null) return (t2.gf == null || t2.ga == null) ? "\u2014" : fmtNum(t2.gf - t2.ga); return (t2.gd>0?"+":"")+fmtNum(t2.gd); };
    d.teams.forEach(function(t){
      var r = document.createElement("div"); r.className = "strow" + (t.pos===1 ? " top1" : "");
      var p = document.createElement("span"); p.className = "stpos" + (t.pos<=8 ? " top3" : ""); p.textContent = fmtNum(t.pos);
      // v12.18: round club crest before the name (the user's ask) \u2014 resolved
      // server-side against the clubs catalog; rows without one render
      // text-only, exactly as before.
      var n = document.createElement("span"); n.className = "stname" + (t.crest ? " haslogo" : "");
      if(t.crest){
        var lg = document.createElement("img"); lg.className = "stlogo"; lg.src = t.crest; lg.alt = ""; lg.loading = "lazy"; lg.decoding = "async"; lg.referrerPolicy = "no-referrer";
        lg.onerror = function(){ this.remove(); n.classList.remove("haslogo"); };
        n.appendChild(lg);
        var txt = document.createElement("span"); txt.className = "sttxt"; nameInto(txt, curLang()==="en" ? t.name : (t.faName||t.name));
        n.appendChild(txt);
      } else {
        nameInto(n, curLang()==="en" ? t.name : (t.faName||t.name));
      }
      var mp = document.createElement("span"); mp.className = "stnum"; mp.textContent = num(t.played);
      var w = document.createElement("span"); w.className = "stnum ucl-hidem"; w.textContent = num(t.won);
      var dd = document.createElement("span"); dd.className = "stnum ucl-hidem"; dd.textContent = num(t.draw);
      var ll = document.createElement("span"); ll.className = "stnum ucl-hidem"; ll.textContent = num(t.lost);
      var gf = document.createElement("span"); gf.className = "stnum ucl-hidem"; gf.textContent = num(t.gf);
      var ga = document.createElement("span"); ga.className = "stnum ucl-hidem"; ga.textContent = num(t.ga);
      var gd = document.createElement("span"); gd.className = "stnum"; gd.textContent = gdTxt(t);
      var pt = document.createElement("span"); pt.className = "stpts"; pt.textContent = fmtNum(t.points);
      r.appendChild(p); r.appendChild(n); r.appendChild(mp); r.appendChild(w); r.appendChild(dd); r.appendChild(ll); r.appendChild(gf); r.appendChild(ga); r.appendChild(gd); r.appendChild(pt);
      st.appendChild(r);
    });
  } else {
    var e2 = document.createElement("div"); e2.className = "stempty"; e2.textContent = T("stEmpty");
    st.appendChild(e2);
  }
  wrap.appendChild(st);
  el.appendChild(wrap);
}
// v12.12: the UCL box is GENERALIZED (the user's ask) \u2014 up to EIGHT upcoming
// CL fixtures in strict kickoff order (live first; "two important today, two
// important tomorrow"), and ONLY matches with \u22651 SELECTED club: the server
// filters (Sabah FK vs SK Slavia Praha is noise and never boxes). Same
// spotitem anatomy as the topspot box + hero, so the page stays uniform
// (v12.11). Pre-draw: the wait state counts to the projected first kickoff;
// otherwise the card hides when the box is empty.
// v12.21: the UCL pre-draw wait state carries the starball mark \u2014 the same
// inline SVG the headers use (white stars on the navy ball), injected from
// the worker-side const so page and brand stay in lockstep.
var UCL_BALL = ${JSON.stringify(UCL_BALL)};
function renderUclSpot(d){
  var card = document.getElementById("uclSpotCard"), el = document.getElementById("uclSpot");
  if(!el) return;
  el.innerHTML = "";
  var list = (d && d.matches && d.matches.length) ? d.matches.slice(0, 8) : [];
  if(!list.length){
    if(d && d.firstStart){
      if(card) card.style.display = "";
      var fw = document.createElement("div"); fw.className = "uclspot-wait";
      var fb = document.createElement("div"); fb.className = "uclspot-ball"; fb.setAttribute("aria-hidden", "true"); fb.innerHTML = UCL_BALL;
      fw.appendChild(fb);
      var fl = document.createElement("div"); fl.className = "stnot-ovl-label"; fl.textContent = T("stNot");
      fw.appendChild(fl);
      var ft = document.createElement("div"); ft.className = "stnot-ovl-timer";
      ft.appendChild(document.createTextNode(curLang()==="en" ? "First match: " : "\u0627\u0648\u0644\u06CC\u0646 \u0628\u0627\u0632\u06CC: "));
      ft.appendChild(document.createTextNode(fmtKick(d.firstStart)));
      fw.appendChild(ft);
      el.appendChild(fw);
    } else if(card){
      card.style.display = "none";
    }
    return;
  }
  if(card) card.style.display = "";
  list.forEach(function(m, idx){
    // v12.26: noComp \u2014 the box is UCL-dedicated, the per-row league tag is
    // redundant there (the user's ask).
    el.appendChild(spotItemNode(m, idx, {noComp:true}));
  });
}
// v12.3/v12.4/v12.7/v12.8/v12.12 TOP BOX (league): the consolidated
// big-matches card \u2014 up to TEN entries + the hero's slot 1 (the user's ask;
// e.g. the Madrid derby and the Manchester derby in the SAME box). The
// server picks TRUE big matches only (A: two selected teams;
// B: both sides top-3 \u2014 \u0635\u062F\u0631 \u062C\u062F\u0648\u0644; C: derby; fallback: a selected team vs a
// top-5 side of that league) and orders them STRICTLY by kickoff \u2014 live first
// (kickoff in the past), then the closest upcoming on top. v12.10: slot 1 \u2014
// the countdown's own match \u2014 renders in the HERO CARD at the very top (the
// bar and its match stuck together); this box carries the REMAINING entries.
// v12.12: spotItemNode is the shared anatomy of the hero, the topspot box AND
// the generalized UCL box (live score + LIVE chip, BOTH tags \u2014 a fixture that
// is a derby AND a top-of-the-table clash shows both badges). The card hides
// when nothing qualifies; box fixtures are excluded from the upcoming list
// server-side \u2014 this box IS their presentation. Stale KV payloads (\u22645 min)
// may still carry the old single-match shape {next:\u2026} \u2014 accepted for rollout.
function spotItemNode(m, idx, opts){
  var item = document.createElement("div"); item.className = "spotitem";
  // v12.17: \xAB\u062F\u0631 \u0627\u06CC\u0646 \u0647\u0641\u062A\u0647\xBB passes opts.past for games whose kickoff already
  // ran out \u2014 the whole entry renders "turned off" (dimmed, see .spotitem.past)
  // and the time chip swaps to the \xAB\u067E\u0627\u06CC\u0627\u0646\u200C\u06CC\u0627\u0641\u062A\u0647\xBB (expired) state.
  if(opts && opts.past) item.className += " past";
  var row = document.createElement("div"); row.className = "match";
  if(m.derby) row.className += " derby";
  row.style.setProperty("--i", idx);
  var en = curLang()==="en";
  var hName = document.createElement("div"); hName.className = "team"; nameInto(hName, en ? m.homeTeam.name : (m.homeTeam.faName || m.homeTeam.name));
  var aName = document.createElement("div"); aName.className = "team"; nameInto(aName, en ? m.awayTeam.name : (m.awayTeam.faName || m.awayTeam.name));
  var hs = document.createElement("div"); hs.className = "side"; hs.appendChild(logo(m.homeTeam)); hs.appendChild(hName);
  var as = document.createElement("div"); as.className = "side away"; as.appendChild(aName); as.appendChild(logo(m.awayTeam));
  var live = m.status==="LIVE"||m.status==="IN_PLAY"||m.status==="PAUSED";
  // v12.16: opts.finished (the \xAB\u062F\u0631 \u0627\u06CC\u0646 \u0647\u0641\u062A\u0647\xBB agenda) also shows final scores.
  // v12.25: unplayed rows carry the KICKOFF TIME in the center slot (.kick) \u2014
  // "A [match info] B" on the user's sketch \u2014 same x line as the score; the
  // time belongs to ITS teams, inside ITS box, never to the row above/below.
  var done = !!(opts && opts.finished);
  // v12.32 (the user's ask): the HERO (opts.noDate) center slot is a COLUMN
  // now \u2014 the big time chip (or the live score) with the .kickdate run
  // ("weekday day month", fmtHeroDate) UNDER it: "time / date" as ONE
  // stack between the two clubs (the date moved out of the navy bar,
  // #bigbarDate retired). Every other box keeps the plain single-element
  // center slot; their weekday/date line stays in the info row.
  var hero = !!(opts && opts.noDate);
  var kd = null;
  // v12.44-livepolish: for LIVE matches the kickdate is HIDDEN — the date
  // is redundant when the match is playing (the score is what matters).
  // This also fixes the vertical alignment: the score sits centered in the
  // .kick column (no date below it pushing the score up), matching the team
  // name's vertical center.
  if(m.utcDate && !live && !done){ kd = document.createElement("div"); kd.className = "kickdate"; kd.textContent = fmtHeroDate(m.utcDate); }
  if((live || done) && m.score && m.score.home !== null){
    var vs = scoreNode(m.score);
    if(hero){ var kw = document.createElement("div"); kw.className = "kick"; kw.appendChild(vs); if(kd) kw.appendChild(kd); row.appendChild(hs); row.appendChild(kw); row.appendChild(as); }
    else { var kw2 = document.createElement("div"); kw2.className = "kick"; kw2.appendChild(vs); if(kd) kw2.appendChild(kd); row.appendChild(hs); row.appendChild(kw2); row.appendChild(as); }
  } else {
    var kt = document.createElement("div"); kt.className = "kick";
    var kc = document.createElement("span"); kc.className = "countdown"; kc.textContent = fmtKick(m.utcDate);
    kt.appendChild(kc);
    if(kd) kt.appendChild(kd);
    row.appendChild(hs); row.appendChild(kt); row.appendChild(as);
  }
  item.appendChild(row);
  var info = document.createElement("div"); info.className = "uclspot-info";
  // v12.26 (the user's ask): "remove this tag from UCL box \u2026 because it's
  // redundant since that box is already UCL dedicated" \u2014 the competition
  // chip is skipped for the UCL box's rows (opts.noComp): its heading already
  // says \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627. Every OTHER box (hero, big matches, week) keeps
  // the chip \u2014 there it distinguishes mixed competitions.
  if(!(opts && opts.noComp)){
    var c = document.createElement("span"); c.className = "comp";
    if(m.competition && m.competition.emblem){ var cimg = document.createElement("img"); cimg.className="complogo"; cimg.src=m.competition.emblem; cimg.alt=""; cimg.loading="lazy"; cimg.decoding="async"; cimg.onerror=function(){this.remove();}; c.appendChild(cimg); }
    c.appendChild(document.createTextNode(compName(m)));
    info.appendChild(c);
  }
  // v12.7 tag rule: a match can be BOTH a derby and a top-of-the-table
  // clash \u2014 each badge renders independently, never either/or.
  if(m.derby){ var db = document.createElement("span"); db.className = "derbybadge"; db.textContent = T("derby"); info.appendChild(db); }
  if(m.top){ var tb = document.createElement("span"); tb.className = "topbadge"; tb.textContent = "\u{1F3C6} " + T("topBadge"); info.appendChild(tb); }
  // v12.31→v12.32 (the user's ask): the HERO passes opts.noDate \u2014 its date
  // rides under the big time chip inside the kick column (.kickdate, see
  // the row assembly above), NOT in this info line. Every other box keeps
  // the full weekday/date/time run right here.
  // v12.40-datebelow: the redundant fmtDate text node is RETIRED — the date
  // now rides under the time chip in the kick column (.kickdate) for EVERY
  // spotitem, not just the hero. The info line carries only the competition
  // chip + badges + live/expired chips + venue. No date, no time.
  if(live){
    // v12.44-livepolish: the livechip "در حال برگزاری" is SKIPPED when the
    // spotitem is inside the #liveCard (the card itself is the live section —
    // the chip is redundant). The check uses opts.isLiveCard (passed from
    // renderLive) because item.closest() doesn't work at build time — the
    // element isn't in the DOM yet. For the hero + big-matches + week cards
    // the chip still renders (those cards mix live + upcoming, so the chip
    // distinguishes).
    var inLiveCard = !!(opts && opts.isLiveCard);
    if(!inLiveCard){
      var chip = document.createElement("span"); chip.className = "livechip";
      var lottie = document.createElement("dotlottie-player"); lottie.className = "live-lottie"; lottie.setAttribute("src","/Live.lottie"); lottie.setAttribute("autoplay",""); lottie.setAttribute("loop",""); lottie.setAttribute("background","transparent");
      chip.appendChild(lottie);
      info.appendChild(chip);
    }
    if(m.minute != null){ var lmin = document.createElement("span"); lmin.className = "lmin"; lmin.textContent = fmtNum(m.minute) + "\u02B9"; info.appendChild(lmin); }
  } else if(opts && opts.past){
    // v12.17/v12.25: kickoff passed, no final score yet \u2014 the expired marker
    // (\xAB\u231B \u067E\u0627\u06CC\u0627\u0646\u200C\u06CC\u0627\u0641\u062A\u0647\xBB) stays in the info line; the kickoff TIME itself now
    // rides the row's center slot (v12.25), dimmed with the box it belongs to.
    var cd = document.createElement("span");
    cd.className = "wkdone";
    cd.textContent = "\u231B " + T("wkDone");
    info.appendChild(cd);
  }
  if(m.venue){ var vn = document.createElement("span"); vn.className="venue"; vn.textContent="\u{1F3DF}\uFE0F " + m.venue; info.appendChild(vn); }
  // v12.21: the share control was a full-width row of its own under the
  // entry. v12.31: it left the info chip line (it pushed the centered
  // chips off-center) for the box's top inline-end corner.
  var sr = shareRow(m, false);
  item.appendChild(info);
  item.appendChild(sr);
  return item;
}
// v12.10/v12.11 HERO: renders the countdown's OWN match (barTarget \u2014 box
// top, live entries leading) stuck directly under the countdown bar inside
// the hero card \u2014 the card the bar belongs to. Same spotitem anatomy as the
// box entries so the headline and the box share one visual language.
// v12.11: always a plain "card bighero" \u2014 no golden topspot chrome; the
// countdown's match row looks exactly like every other match row.
// v12.31→v12.32: the hero's entry passes noDate \u2014 its weekday/date line rides
// under the big time chip INSIDE the kick column (not in the navy bar, not
// in the info row).
function renderHeroSpot(){
  var card = document.getElementById("bigHeroCard"), el = document.getElementById("heroSpot");
  if(!card || !el) return;
  el.innerHTML = "";
  card.className = "card bighero";
  var m = barTarget().m;
  heroWm(card, m);
  // v12.32: #bigbarDate is gone \u2014 spotItemNode({noDate:true}) renders the
  // date itself, under the big time chip (.kickdate in the kick column).
  if(m) el.appendChild(spotItemNode(m, 0, {noDate:true}));
}
// v12.23 (the user's ask): the giant faded crests behind the hero stage \u2014
// "the expanded logo of clubs in lower opacity on the background of the
// next big upcoming match". One watermark per club, anchored to its club's
// half; a missing crest hides that side, and the whole layer hides when
// neither club has one (monogram-only fallbacks stay clean, no broken imgs).
function heroWm(card, m){
  var wm = card.querySelector(".hero-wm"); if(!wm) return;
  var imgs = wm.querySelectorAll("img");
  var c0 = m && m.homeTeam && m.homeTeam.crest, c1 = m && m.awayTeam && m.awayTeam.crest;
  [c0, c1].forEach(function(c, i){
    if(c){ imgs[i].src = c; imgs[i].style.display = ""; }
    else { imgs[i].removeAttribute("src"); imgs[i].style.display = "none"; }
  });
  wm.style.display = (c0 || c1) ? "" : "none";
}
function renderTopSpot(d){
  var card = document.getElementById("topspotCard"), el = document.getElementById("topSpot");
  if(!card || !el) return;
  el.innerHTML = "";
  // v12.12: capacity raised \u2014 the server sends up to ELEVEN big matches
  // (the user's ask: the box shows up to TEN after the hero takes slot 1).
  var list = d && d.matches && d.matches.length ? d.matches.slice(0, 11) : (d && d.next ? [d.next] : []);
  // v12.10: slot 1 \u2014 the closest upcoming big match, the countdown's own
  // match \u2014 lives in the HERO CARD above, stuck to the countdown bar; this
  // box presents the REMAINING big matches, separated from the headline.
  var rest = list.slice(1);
  if(!rest.length){ card.style.display = "none"; return; }
  card.style.display = "";
  rest.forEach(function(m, idx){
    el.appendChild(spotItemNode(m, idx + 1));
  });
}
// v12.16: \xAB\u062F\u0631 \u0627\u06CC\u0646 \u0647\u0641\u062A\u0647\xBB \u2014 the current Iranian week's agenda (Saturday\u2192
// Friday): every followed/top-3 game of THIS week, live first; already-played
// games show their final score. Same spotitem anatomy as every other box;
// the card hides when the week has no followed games.
// v12.17: games whose kickoff has PASSED (finished, or the clock ran out
// while no score arrived yet) are rendered "turned off" \u2014 dimmed rows + the
// \xAB\u067E\u0627\u06CC\u0627\u0646\u200C\u06CC\u0627\u0641\u062A\u0647\xBB chip instead of a fresh kickoff time \u2014 so users instantly
// see what's still ahead vs what's expired. Order: live \u2192 upcoming (soonest
// first) \u2192 past (most recent first at the bottom).
// v12.18 (the Friday problem, the user's ask): when the current week has
// NOTHING left ahead \u2014 late Friday, everything kicked off \u2014 a wall of dimmed
// past games is pointless. The card then switches to NEXT week's fixtures
// (header \xAB\u{1F4C5} \u0647\u0641\u062A\u0647 \u0628\u0639\u062F\xBB) so the box always answers "what's coming". Mid-week
// it stays "this week" with the dimmed past games below the upcoming ones.
function weekPast(m){
  if(m.status === "FINISHED") return true;
  if(m.status==="LIVE"||m.status==="IN_PLAY"||m.status==="PAUSED") return false;
  if(!m.utcDate) return false;
  return new Date(m.utcDate).getTime() < Date.now() - 9e4;
}
function renderWeek(list, nextList){
  var card = document.getElementById("weekCard"), el = document.getElementById("weekBox"), title = document.getElementById("weekTitle");
  if(!card || !el) return;
  el.innerHTML = "";
  // v12.45-compact-live: remove LIVE matches from the week card — they have
  // their own dedicated #liveCard now. Only show upcoming not-yet-played
  // (or past-but-not-finished) matches. The week card is "what's ahead".
  var isLive = function(m){ return m.status==="LIVE"||m.status==="IN_PLAY"||m.status==="PAUSED"; };
  var upcomingThis = (list || []).filter(function(m){ return !weekPast(m) && !isLive(m); });
  var mode = "this";
  if(!upcomingThis.length){
    // Nothing left THIS week → show next week's upcoming fixtures instead.
    mode = "next";
    list = (nextList || []).filter(function(m){ return !isLive(m); });
  } else {
    list = upcomingThis;
  }
  if(title) title.textContent = mode === "next" ? T("hWeekNext") : T("hWeek");
  if(!list || !list.length){ card.style.display = "none"; return; }
  card.style.display = "";
  var sorted = list.slice().sort(function(a, b){
    var pa = weekPast(a), pb = weekPast(b);
    if(pa !== pb) return pa ? 1 : -1; // upcoming before past
    var ta = a.utcDate ? new Date(a.utcDate).getTime() : 0, tb = b.utcDate ? new Date(b.utcDate).getTime() : 0;
    return pa ? tb - ta : ta - tb; // past: recent first · upcoming: soonest first
  });
  sorted.forEach(function(m, idx){
    el.appendChild(spotItemNode(m, idx, { finished: m.status === "FINISHED", past: mode === "this" && weekPast(m) }));
  });
}
// v12.5: renderIran/initIran/toggleIran removed \u2014 the Iran card is retired
// and the PGL table renders through renderStandings like every other league.
// v12.12: setView is retired with the view toggle \u2014 the page is always
// big-only (a stored ucl_view preference is ignored and never re-read).
function scorerTeam(m, teamName){
  if(!teamName) return "";
  var en = curLang()==="en";
  var norm = function(s){ return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036F]/g,"").replace(/\b(fc|cf|sc|ac|as|ssc|bc|ud|cd|kv|jc)\b/g," ").replace(/[^a-z0-9]/g,""); };
  var t = norm(teamName);
  if(t && t===norm(m.homeTeam.name)) return en ? m.homeTeam.name : (m.homeTeam.faName || m.homeTeam.name);
  if(t && t===norm(m.awayTeam.name)) return en ? m.awayTeam.name : (m.awayTeam.faName || m.awayTeam.name);
  return "";
}
function fmtCountdown(ms){
  ms = Math.max(0, ms|0);
  var en = curLang()==="en";
  var d = Math.floor(ms/864e5), h = Math.floor(ms%864e5/36e5), m = Math.floor(ms%36e5/6e4), s = Math.floor(ms%6e4/1e3);
  if(ms <= 0) return T("soon");
  // v12.x-countdown-words (the user's ask): show the countdown in full
  // words instead of HH:MM:SS — e.g. '۱۴ ساعت و ۱۵ دقیقه و ۴۸ ثانیه'
  // (fa) / '14 hours 15 minutes 48 seconds' (en). Each non-zero unit is
  // shown with its full name + the Persian connector between units.
  // English uses a space-separated style. Zero units are skipped.
  var andWord = en ? " " : " \u0648 ";
  var parts = [];
  if(d) parts.push(fmtNum(d) + " " + T("uDay"));
  if(h) parts.push(fmtNum(h) + " " + T("uHour"));
  if(m) parts.push(fmtNum(m) + " " + T("uMin"));
  if(s) parts.push(fmtNum(s) + " " + T("uSec"));
  if(parts.length === 0) return T("soon");
  if(en){ return parts.join(" "); } else { return parts.join(andWord); }
}
// v12.10: the ONE pick the countdown bar AND the hero card agree on \u2014 box
// top (closest upcoming big match; live entries lead) \u2192 far nextBig \u2192
// nearest big upcoming \u2192 plain upcoming[0]. renderHeroSpot renders exactly
// this match stuck under the bar, so the countdown can never point at a
// card rendered somewhere else on the page.
function barTarget(){
  var ts = DATA.topSpot || null;
  var boxTop = ts ? ((ts.matches && ts.matches.length ? ts.matches[0] : null) || ts.next) : null;
  var next = boxTop || DATA.nextBig || null, i;
  if(!next){ for(i=0;i<DATA.upcoming.length;i++){ if(DATA.upcoming[i].big){ next = DATA.upcoming[i]; break; } } }
  var isBig = !!next;
  if(!next) next = DATA.upcoming[0] || null;
  return { m: next, big: isBig };
}
function updateBigBar(){
  var card = document.getElementById("bigHeroCard"), fill = document.getElementById("bigbarFill"),
      lbl = document.getElementById("bigbarLabel"), clk = document.getElementById("bigbarClock"),
      pct = document.getElementById("bigbarPct"), tr = document.getElementById("bigbarTrack");
  if(!card||!fill||!lbl||!clk) return;
  // v12.8/v12.10: the countdown belongs to the match on TOP of the big
  // matches presentation \u2014 the hero card right under this bar (box top,
  // kickoff-sorted, so the closest upcoming big match; live entries lead,
  // kickoff in the past). Stale KV (\u22643 min) may still carry the legacy
  // single-match shape {next:\u2026}.
  var t = barTarget(), next = t.m;
  if(!next){
    lbl.textContent = ""; clk.textContent = "--:--:--";
    if(pct) pct.textContent = "";
    fill.className = "bigbar-fill idle";
    if(tr) tr.setAttribute("aria-valuenow", "0");
    card.style.display = ""; card.dataset.urgent = "far"; return;
  }
  var isBig = t.big;
  var kick = new Date(next.utcDate).getTime(), rem = kick - Date.now(),
      live = next.status==="LIVE"||next.status==="IN_PLAY"||next.status==="PAUSED"||rem<=0;
  // v12.22 (the user's ask): the hero ESCALATES as kickoff nears \u2014 far (calm
  // emerald breathing) \u2192 soon (\u226424h: amber, faster heartbeat, amber embers)
  // \u2192 final (\u226460min: red alarm heartbeat, pulsing label, red embers) \u2192 live
  // (the red stage around the live bar). One data-urgent attribute drives the
  // whole CSS intensity ladder; it only flips when the mode actually changes.
  var urgent = live ? "live" : (rem <= 36e5 ? "final" : (rem <= 864e5 ? "soon" : "far"));
  if(card.dataset.urgent !== urgent) card.dataset.urgent = urgent;
  // v12.27 (review item 1): the wrapper carries the same data-urgent \u2014 its
  // ::before owns the OUTER heartbeat aura now, so the escalation ladder's
  // color + speed keep driving both pseudo-elements.
  var hw = card.parentNode;
  if(hw && hw.classList && hw.classList.contains("herowrap") && hw.dataset.urgent !== urgent) hw.dataset.urgent = urgent;
  // v12.50: the label text is removed — the countdown is enough (the user's
  // ask: 'remove this text ⚽ ⚡ تا بازی بزرگ بعدی, the countdown is enough').
  // The bigbar-top now shows only the clock + percentage, no label.
  lbl.textContent = "";
  // v12.24: the percent chip speaks the bar's BASE \u2014 100% at kickoff/live.
  var pctTxt = function(v){ return fmtNum(v) + (curLang()==="en" ? "%" : "\u066A"); };
  if(live){
    fill.className = "bigbar-fill live"; fill.style.width = "100%";
    clk.textContent = "-:--:--";
    var liveSuffix = curLang()==="en" ? "/24h" : "/\u06F2\u06F4";
    if(pct) pct.textContent = pctTxt(100) + liveSuffix;
    if(tr){ tr.setAttribute("aria-valuenow", "100"); if(tr.getAttribute("title") !== T("barBase")) tr.setAttribute("title", T("barBase")); }
  }else{
    // v12.38-hero: Fix 1 — the progress bar + percentage now track the FINAL
    // 24 HOURS before kickoff (was 14 days). Both the fill and the countdown
    // clock now reference the same 24h window, so the fill level and the
    // remaining time always agree. Before 24h the bar reads 0% (idle); at
    // kickoff 100%. The percentage badge carries a visible "۲۴" / "24h"
    // suffix so the period is never ambiguous (an unlabeled percentage with
    // no visible total reads as broken even when the math is correct).
    var q = 1 - rem/(24*36e5);
    if(q<0) q=0; if(q>1) q=1;
    fill.className = "bigbar-fill";
    fill.style.width = Math.max(2, Math.round(q*100)) + "%";
    clk.textContent = fmtCountdown(rem);
    // v12.38-hero: the percentage now carries a visible period suffix
    // ("۹۴٪ / ۲۴" in fa, "94% / 24h" in en) so the total is always visible.
    var pctSuffix = curLang()==="en" ? "/24h" : "/\u06F2\u06F4";
    if(pct) pct.textContent = pctTxt(Math.round(q*100)) + pctSuffix;
    // v12.22: the clock POPS every second \u2014 a tiny scale + brightness tick,
    // re-triggered on each pass (tickBigBar runs every second; the reflow
    // between remove/add restarts the CSS animation).
    clk.classList.remove("tick"); void clk.offsetWidth; clk.classList.add("tick");
    if(tr){
      tr.setAttribute("aria-valuenow", Math.round(q*100));
      if(tr.getAttribute("title") !== T("barBase")) tr.setAttribute("title", T("barBase"));
    }
  }
  card.style.display = "";
}
// v12.20: visible proof for the "auto-updated" claim \u2014 the payload's stamp.
// v12.26 (the user's ask): "instead of showing this: \xAB\u0622\u062E\u0631\u06CC\u0646 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC:
// \u0647\u0645\u06CC\u0646 \u062D\u0627\u0644\u0627\xBB show a truthful API call update like: \xAB\u0622\u062E\u0631\u06CC\u0646 \u0628\u0647 \u0631\u0648\u0632 \u0631\u0633\u0627\u0646\u06CC:
// \u062C\u0645\u0639\u0647 21:30 \u0634\u0628\xBB" \u2014 the sync line now prints the ABSOLUTE stamp of the
// last real API refresh (weekday + HH:MM + a Persian period word), in the
// user's selected timezone and Persian digits. The server side carries the
// upstream pool's true fetchedAt (see fetchPublicMatches), so a quiet
// window honestly shows the last sweep that actually changed anything
// instead of a fake "\u0647\u0645\u06CC\u0646 \u062D\u0627\u0644\u0627".
var SYNC_TS = 0;
function fmtStamp(ts){
  try{
    var d = new Date(ts);
    var t = d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:curTz()});
    if(curLang()==="en") return d.toLocaleDateString("en-GB",{weekday:"long",timeZone:curTz()}) + " " + t;
    var h = parseInt((t.split(":")[0] || "0"),10) || 0; if(h >= 24) h -= 24;
    var per = (h < 5 || h >= 19) ? "\u0634\u0628" : (h < 12 ? "\u0635\u0628\u062D" : (h < 16 ? "\u0638\u0647\u0631" : "\u0639\u0635\u0631"));
    return d.toLocaleDateString("fa-IR",{weekday:"long",timeZone:curTz()}) + " " + faNum(t) + " " + per;
  }catch(e){ return ""; }
}
function renderSync(){
  var el = document.getElementById("lastSync"); if(!el) return;
  if(!SYNC_TS){ el.textContent = ""; return; }
  // v12.x-resilience: when the API failed and we're serving the 7-day
  // snapshot, append a small "cached data" badge after the last-update
  // stamp so the user knows the data might be stale. Inline bilingual.
  var base = fmt("lastUpd", fmtStamp(SYNC_TS));
  if (DATA && DATA.cached) {
    var en = curLang() === "en";
    var mins = DATA.cachedAt ? Math.max(1, Math.round((Date.now() - new Date(DATA.cachedAt).getTime()) / 6e4)) : null;
    var cachedLabel = en ? "cached" : "\u0630\u062E\u06CC\u0631\u0647\u200C\u0634\u062F\u0647";
    if (mins != null) {
      var ageLabel = en ? (mins + "m ago") : (faNum(String(mins)) + " \u062F\u0642\u06CC\u0642\u0647 \u067E\u06CC\u0634");
      base += " \u00B7 " + cachedLabel + " (" + ageLabel + ")";
    } else {
      base += " \u00B7 " + cachedLabel;
    }
  }
  el.textContent = base;
}
function tickBigBar(){ if(DATA && DATA.upcoming) updateBigBar(); renderSync(); }
// v12.19: this final onLang declaration is the one that WINS at runtime
// (JS var re-assignment) \u2014 language switch rebuilds the tz popover labels
// (fa/en) and re-fetches so every dynamic string swaps language. The
// renderWeek/renderUcl declaration above documents the v12.18 intent; the
// full load() re-render covers those cards too.
var onLang = function(){ initTz(); load(); };
setTheme(initTheme()); applyLang(true); initTz(); load();
// v12.27 (the user's ask: "the background video doesnt play it must be auto
// play"): the autoplay+muted+playsinline attribute trio already satisfies
// every modern autoplay policy, but some browsers still refuse (Safari Low
// Power Mode, iOS data saver, Firefox block-autoplay policies) and leave the
// stage frozen on its first frame. heroVideoKick() is the belt-and-braces
// driver: it calls play() (promise rejections swallowed) at boot, on every
// canplay/loadeddata, whenever the tab becomes visible again, on the FIRST
// user gesture (pointer/key/touch \u2014 a gesture unlocks autoplay in every
// browser), and on a quiet 5s retry ladder (6 tries) while the video sits
// paused.
// v12.28 (the user's report: "Video still doesnt play. (it's just a picture)
// - on chrome"): two changes. (1) The reduced-motion hard-pause is RETIRED \u2014
// the user has now asked twice, unconditionally, that the video autoplay;
// the clip is a dim ambient stage (the CSS fx layers still honor the media
// query), and an OS "reduce motion" setting was freezing the stage on its
// first frame \u2014 exactly "just a picture". (2) muted is also set as a JS
// PROPERTY (hv.muted = true) in addition to the attribute \u2014 Safari's
// autoplay gate reads the property, and some engines reset the parsed
// attribute on re-insertion. The stage itself was also re-tuned in CSS
// (video .78 + a light scrim) so a PLAYING clip is visibly moving.
var heroVideoKick = function(){
  try{
    var hv = document.querySelector(".hero-video video");
    if(!hv) return;
    try{ hv.muted = true; }catch(e){}
    var kick = function(){
      if(hv.ended) return;
      try{ var p = hv.play(); if(p && p.catch) p.catch(function(){}); }catch(e){}
    };
    hv.addEventListener("canplay", kick);
    hv.addEventListener("loadeddata", kick);
    if(document.visibilityState === "visible" || document.visibilityState === "hidden"){
      document.addEventListener("visibilitychange", function(){ if(!document.hidden) kick(); });
    }
    ["pointerdown","keydown","touchstart"].forEach(function(ev){
      document.addEventListener(ev, kick, { once: true, passive: true });
    });
    kick();
    var tries = 0;
    var iv = setInterval(function(){
      if(!document.body.contains(hv)){ clearInterval(iv); return; }
      if(hv.paused){ kick(); if(++tries >= 6) clearInterval(iv); }
      else clearInterval(iv);
    }, 5000);
  }catch(e){}
};
heroVideoKick();
setInterval(load, 60000);
setInterval(tickBigBar, 1000);
// v12.21 (the user's ask): PC-wide HIERARCHY \u2014 the auto-placed 2-column grid
// read as random (ragged shared-row offsets, holes under shorter cards, the
// results card alone at the bottom). setWide() regroups the section cards
// into a MAIN column (every match box) and a reference RAIL (the three table
// boxes) at \u22651440px, and restores the exact single-column DOM order below
// the breakpoint. Runs once at boot (before first paint \u2014 the script is
// synchronous at the end of body) and again on breakpoint change; the
// renderers only touch card CONTENT, so the columns survive every re-render.
var WIDE_MQ = window.matchMedia ? window.matchMedia("(min-width:1440px)") : null;
var WIDE_MAIN = ["topspotCard","uclSpotCard","weekCard","finishedCard"];
var WIDE_RAIL = ["liveCard","uclCard","standingsCard","cupsCard"];
// v12.45-compact-live: on mobile (<1440px, single column), the liveCard
// appears as the SECOND card after the hero (bigHeroCard, which is always
// first in the DOM). Since bigHeroCard is not in WIDE_ORDER, liveCard at
// index 0 puts it right after the hero, before topspotCard.
var WIDE_ORDER = ["liveCard","topspotCard","uclSpotCard","weekCard","uclCard","standingsCard","cupsCard","finishedCard"];
function setWide(on){
  var footer = document.querySelector("footer");
  if(!footer) return;
  if(on){
    if(document.getElementById("wideMain")) return;
    var main = document.createElement("div"); main.id = "wideMain";
    var side = document.createElement("div"); side.id = "wideSide";
    footer.parentNode.insertBefore(main, footer);
    footer.parentNode.insertBefore(side, footer);
    WIDE_MAIN.forEach(function(id){ var e = document.getElementById(id); if(e) main.appendChild(e); });
    WIDE_RAIL.forEach(function(id){ var e = document.getElementById(id); if(e) side.appendChild(e); });
  } else {
    if(!document.getElementById("wideMain") && !document.getElementById("wideSide")) return;
    WIDE_ORDER.forEach(function(id){ var e = document.getElementById(id); if(e) footer.parentNode.insertBefore(e, footer); });
    var main = document.getElementById("wideMain"), side = document.getElementById("wideSide");
    if(main && main.parentNode) main.parentNode.removeChild(main);
    if(side && side.parentNode) side.parentNode.removeChild(side);
  }
}
if(WIDE_MQ){
  setWide(WIDE_MQ.matches);
  var wideChange = function(e){ setWide(e.matches); };
  if(WIDE_MQ.addEventListener) WIDE_MQ.addEventListener("change", wideChange);
  else if(WIDE_MQ.addListener) WIDE_MQ.addListener(wideChange);
}
// v12.20 (the user's ask): sticky join CTA \u2014 visible only while the hero
// button is scrolled PAST (not merely below the fold); scrolling back up
// hides it again. body.joinsticky adds bottom clearance so the bar never
// covers content while shown.
// v12.25: once the FOOTER itself is in view the bar stands down \u2014 the
// footer carries its own Telegram link (and the phone \xAB\u062E\u0627\u0646\u0647 \u062F\u0631\u0628\u0627\u0631\u0647 \u062A\u0645\u0627\u0633\xBB
// row), so a \xAB\u062F\u0631\u0628\u0627\u0631\u0647\xBB anchor lands on clean content instead of under the
// floating bar (the bar's own CTA duty is done at page end).
(function(){
  var stick = document.getElementById("joinSticky");
  var foot = document.getElementById("about");
  if(!stick || !("IntersectionObserver" in window)) return;
  // v12.x-joinsticky-fix: the IntersectionObserver used to watch a.cta (the
  // header CTA button), but that button is now display:none on both mobile
  // AND desktop (retired in v12.x-tg-fab — the floating FAB replaced it on
  // desktop, and the mobile header icon replaced it on mobile). A
  // display:none element has no layout box, so the observer never fired and
  // the sticky bar never appeared on mobile. Fix: observe the hero card
  // (#bigHeroCard) instead — it's always visible. When it scrolls out of
  // view (past = true), show the sticky bar. When the footer comes into
  // view (footIn = true), hide it (the footer carries its own Telegram link).
  var anchor = document.getElementById("bigHeroCard") || document.querySelector(".card");
  if(!anchor) return;
  var past = false, footIn = false;
  var apply = function(){ var show = past && !footIn; stick.classList.toggle("show", show); document.body.classList.toggle("joinsticky", show); };
  var io = new IntersectionObserver(function(entries){
    var e = entries[entries.length - 1];
    past = !e.isIntersecting && e.boundingClientRect.top < 0;
    apply();
  }, { threshold: 0 });
  io.observe(anchor);
  if(foot){
    var fo = new IntersectionObserver(function(entries){
      footIn = entries[entries.length - 1].isIntersecting;
      apply();
    }, { threshold: 0 });
    fo.observe(foot);
  }
})();
if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){});}
// v12.x-fab-promo: the Telegram FAB shows a white promotional bubble every
// 60s to promote the bot. The bubble fades in for 5s, then fades out. The
// cycle repeats indefinitely. The bubble text comes from the data-promo
// attribute (bilingual: Persian in fa mode, English in en mode — set at
// render time + updated on language switch).
// v12.x-fab-scroll-hide: on PC, hide the FAB while the user is scrolling
// (avoids the floating button covering content during active scrolling).
// The FAB reappears 1s after scrolling stops. Mobile is unaffected (the
// FAB is already hidden on mobile via @media).
(function(){
  var fab = document.getElementById('tgFab');
  if(!fab) return;
  var show = function(){ fab.classList.add('promo-show'); setTimeout(function(){ fab.classList.remove('promo-show'); }, 5000); };
  setTimeout(show, 5000);
  setInterval(show, 60000);
  // Hide FAB while scrolling on PC (min-width:601px)
  var scrollTimer = null;
  window.addEventListener('scroll', function(){
    if(window.innerWidth < 601) return;
    fab.style.opacity = '0';
    fab.style.pointerEvents = 'none';
    if(scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function(){
      fab.style.opacity = '';
      fab.style.pointerEvents = '';
    }, 800);
  }, { passive: true });
})();
<\/script>
</body>
</html>`;
