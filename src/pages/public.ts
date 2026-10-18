// SportSignal — the public page template (RTL Persian UI: hero countdown,
// big-matches box, UCL card + table, standings grid, cups, live section).
// Everything between the backticks is CLIENT-side code (a string literal).
import { UCL_LOGO_CHIP } from "../tables";
import { THEME_INIT_SCRIPT, FONT_FACES_STYLE } from "./styles-shared";

export const PUBLIC_PAGE = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0f172a">
<meta name="apple-mobile-web-app-title" content="SportSignal">
<meta name="application-name" content="SportSignal">
<!-- v13.4-live-css: live badges / loading states are pure CSS
     (live-beep / live-breath / loading-spin keyframes) — zero payload,
     zero third-party requests. (The dotLottie CDN player was removed.) -->
<meta name="description" content="__SEO_DESC__">
<meta name="robots" content="__SEO_ROBOTS__">
<link rel="alternate" type="text/calendar" href="/calendar.ics" title="تقویم SportSignal">
<link rel="alternate" type="application/atom+xml" href="/feed.xml" title="به‌روزرسانی‌های SportSignal">
<meta property="og:type" content="website">
<meta property="og:title" content="__SEO_OG_TITLE__">
<meta property="og:description" content="__SEO_OG_DESC__">
<meta property="og:url" content="https://sportsignal.ir/">
<meta property="og:image" content="__SEO_OG_IMAGE__">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="SportSignal — بازی‌های بزرگ فوتبال">
<meta property="og:locale" content="fa_IR">
<meta property="og:locale:alternate" content="en_US">
<meta property="og:site_name" content="SportSignal">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="__SEO_OG_TITLE__">
<meta name="twitter:description" content="__SEO_OG_DESC__">
<meta name="twitter:image" content="__SEO_OG_IMAGE__">
<meta name="twitter:image:alt" content="SportSignal — بازی‌های بزرگ فوتبال">
<link rel="canonical" href="https://sportsignal.ir/">
<link rel="preload" href="/fonts/Vazirmatn-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/Vazirmatn-Bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/Vazirmatn-ExtraBold.woff2" as="font" type="font/woff2" crossorigin>
__SEO_JSONLD__
${THEME_INIT_SCRIPT}
<!-- v12.x-force-dark: the default theme is ALWAYS dark, regardless of the
     user's system preference (prefers-color-scheme). The color-scheme meta
     tells the browser to render form controls + scrollbars in dark mode.
     The user can still toggle to light via the theme button. -->
<meta name="color-scheme" content="dark light">
<title>__SEO_TITLE__</title>
${FONT_FACES_STYLE}
<style>/* v13.56-visitcount: footer page-view counter. The number span has a
     fixed min-width so the arriving digits never cause layout shift. */
.visitcount{font-size:.78rem;color:var(--muted,#94a3b8);margin-top:10px;line-height:1.9;direction:rtl}
.visitcount .vc-n{display:inline-block;min-width:3.4em;text-align:center;font-variant-numeric:tabular-nums;font-weight:600;color:var(--text,#e2e8f0)}
.visitcount .vc-sep{margin:0 6px;opacity:.5}
.visitcount .vc-l{opacity:.85}
/* v13.57-uniqueregions: live visitor-stats box (below the cups card). */
#statsCard .sbox{font-size:.9rem;line-height:1.9}
#statsCard .srow{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(148,163,184,.16)}
#statsCard .srow:last-child{border-bottom:none}
#statsCard .slbl{color:var(--muted,#94a3b8)}
#statsCard .sval{font-weight:700;font-variant-numeric:tabular-nums;direction:ltr}
#statsCard .sval.live{color:#22c55e}
#statsCard .scap{margin:10px 0 2px;font-size:.78rem;color:var(--muted,#94a3b8);font-weight:600}
#statsCard stable{width:100%;border-collapse:collapse;font-size:.84rem}
#statsCard stable th,#statsCard stable td{padding:5px 6px;text-align:start;border-bottom:1px solid rgba(148,163,184,.12)}
#statsCard stable th{color:var(--muted,#94a3b8);font-weight:600;font-size:.74rem}
#statsCard stable .cflag{font-size:1rem}
#statsCard stable .cnum{font-variant-numeric:tabular-nums;font-weight:700;direction:ltr;text-align:left}
#statsCard stable .cpct{color:var(--muted,#94a3b8);direction:ltr;text-align:left;width:3.5em}
#statsCard .sbar{height:5px;background:rgba(94,160,255,.18);border-radius:3px;overflow:hidden;margin-top:2px}
#statsCard .sbar i{display:block;height:100%;background:#5ea0ff;border-radius:3px}
/* v13.58-herofix: hero countdown timezone label (below the kickoff time). */
.kicktz{display:block;font-size:.72rem;opacity:.62;margin-top:3px;font-weight:400;white-space:nowrap}</style>
<link rel="stylesheet" href="/public-13.26.css">
<style>/* v13.66-flatglow: flat outer glow (no inset bevel), uniform tint+border
     \u2014 the LIST variant of .match-featured (big matches inside the boxes
     below the hero) keeps this green treatment unchanged.
     v13.120-hero: the HERO card (#bigHeroCard.match-featured) gets the new
     Stadium-Pulse lighting \u2014 controlled blue + green instead of green-only,
     a slower masked sheen (9s), a soft dual glow pulse (5s) and the hover
     lift (desktop). Reduced-motion disables every animation. */
:root{--feat-accent:#4CBB17;--feat-blur:22px;--feat-glow:22%;--feat-tint:6%;--feat-border:55%}
.match-featured{position:relative;border-color:color-mix(in srgb,var(--feat-accent) var(--feat-border),transparent)!important;background-image:linear-gradient(color-mix(in srgb,var(--feat-accent) var(--feat-tint),transparent),color-mix(in srgb,var(--feat-accent) var(--feat-tint),transparent))!important;box-shadow:0 0 var(--feat-blur) color-mix(in srgb,var(--feat-accent) var(--feat-glow),transparent)!important}
.match-featured::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(110deg,transparent 35%,rgba(180,255,120,.14) 45%,rgba(180,255,120,.04) 55%,transparent 65%);background-size:250% 100%;animation:feat-shimmer 2.5s linear infinite}
@keyframes feat-shimmer{0%{background-position:200% 0}100%{background-position:-150% 0}}
.match-featured::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:radial-gradient(ellipse at 70% 0%,color-mix(in srgb,var(--feat-accent) 10%,transparent),transparent 60%);animation:feat-glow-shift 4s ease-in-out infinite alternate}
@keyframes feat-glow-shift{0%{opacity:.4}100%{opacity:.9}}
.match-featured .match{background:transparent!important;border:none!important;overflow:visible!important}
/* === v13.120-hero: Stadium-Pulse featured lighting on the hero card === */
#bigHeroCard.match-featured{background-image:none!important;animation:hero-pulse 5s ease-in-out infinite}
#bigHeroCard.match-featured::before{background:linear-gradient(110deg,transparent 38%,rgba(39,194,255,.17) 50%,rgba(72,239,155,.07) 56%,transparent 62%);background-size:300% 100%;-webkit-mask-image:linear-gradient(to right,transparent 0%,black 13%,black 87%,transparent 100%);mask-image:linear-gradient(to right,transparent 0%,black 13%,black 87%,transparent 100%);animation:hero-sheen 9s ease-in-out infinite}
@keyframes hero-sheen{0%{background-position:150% 0}30%{background-position:-50% 0}100%{background-position:-50% 0}}
#bigHeroCard.match-featured::after{background:linear-gradient(to top,rgba(72,239,155,.05),transparent 55%);-webkit-mask-image:linear-gradient(to right,transparent 0%,black 14%,black 86%,transparent 100%);mask-image:linear-gradient(to right,transparent 0%,black 14%,black 86%,transparent 100%);animation:none;opacity:1}
@keyframes hero-pulse{0%,100%{box-shadow:0 0 22px rgba(40,104,255,.22),0 0 44px rgba(72,239,155,.07)!important}50%{box-shadow:0 0 26px rgba(40,104,255,.32),0 0 56px rgba(72,239,155,.12)!important}}
@media(hover:hover){#bigHeroCard.match-featured{transition:transform .2s ease,box-shadow .2s ease;cursor:pointer}#bigHeroCard.match-featured:hover{transform:translateY(-3px);box-shadow:0 0 29px rgba(40,104,255,.34),0 0 60px rgba(72,239,155,.14)!important}}
@media(prefers-reduced-motion:reduce){.match-featured{animation:none}.match-featured::before{display:none}.match-featured::after{animation:none;opacity:.6}#bigHeroCard.match-featured{animation:none}#bigHeroCard.match-featured::before{display:none}}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}</style>
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
<p class="sub sync" id="lastSync" role="status" aria-live="polite">__SEO_SYNC__</p>
</header>
<a class="skip-link" href="#main">پرش به محتوا</a>
<main id="main">
<!-- v12.12: the view toggle is RETIRED \u2014 the page is permanently big-only
     (\xAB\u0641\u0642\u0637 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF\xBB, the user's default). The hero card + the topspot
     box + the UCL box ARE the upcoming presentation. -->
<!-- v13.120-hero: Stadium Pulse + Match Protocol — the featured-match HERO.
     Same product skeleton as v12.10 (the countdown and ITS match are ONE
     card at the very top; #heroSpot is filled by renderHeroSpot from the
     SAME barTarget() pick; #bigbar keeps its id — updateBigBar drives the
     label/digits/fill every second), rebuilt as a three-zone broadcast
     card: home team | blue kickoff panel | away team, over the cinematic
     video stage. The countdown strip is a four-unit digital clock
     (روز/ساعت/دقیقه/ثانیه) — ONLY the digit nodes change each second.
     v13.121-portraits: player artwork is LIVE — heroArt() resolves the
     flanks through the HERO_ART mapping (official UEFA cutoff portraits;
     contract: /assets/hero/players/README.md). Unmapped teams keep the
     crest-only look — the card is complete either way.
     v13.122-heroart: the figures BREAK OUT of the card — full-height
     flanks in front of the card edges, heads slightly above its top edge
     (the owner's reference mockup, 2026-10-19); the layer moved from
     inside the card to a .herowrap sibling (see the v13.122 note below). -->
<!-- v12.27 (review item 1): .herowrap — the clip host's shell. The card
     inside carries overflow:hidden (clips the video/crest/fx layers to its
     radius), while this wrapper's ::before owns the OUTER heartbeat
     aura (a child's outer box-shadow would be clipped by the card). updateBigBar
     mirrors data-urgent here so the escalation ladder keeps driving both. -->
<div class="herowrap">
<div class="card bighero" id="bigHeroCard" style="display:none">
<!-- v12.26 (the user's ask): layer A — the VIDEO STAGE, deepest of the four:
     video › background logos › css effects › actual data. The user's own
     7.2s clip loops muted+autoplay+playsinline from /hero-stage.mp4
     (worker [assets]), clipped + scrimmed so the data above stays king;
     a prefers-reduced-motion user keeps autoplay too (v12.28 — the user's
     twice-repeated ask outweighs the media query for this one element). -->
<div class="hero-video" aria-hidden="true"><video src="/hero-stage.mp4" poster="/hero-poster.jpg" autoplay muted loop playsinline preload="auto" tabindex="-1" disablepictureinpicture referrerpolicy="no-referrer"></video></div>
<!-- v12.22: the hero stage's ember layer — static markup OUTSIDE #heroSpot
     so it survives every re-render, clipped to the card, pointer-transparent. -->
<div class="hero-fx" aria-hidden="true"><i></i><i></i><i></i></div>
<!-- v12.23 (the user's ask): the clubs' EXPANDED, faded crests behind the
     stage \u2014 "[faded logo big on background] [club logo] club name". Static
     layer OUTSIDE #heroSpot (like the ember layer) so re-renders never
     disturb it; renderHeroSpot \u2192 heroWm() swaps the two crest srcs per
     match; a club without a crest hides its watermark. -->
<div class="hero-wm" aria-hidden="true"><img alt="" referrerpolicy="no-referrer" onerror="this.style.display='none'"><img alt="" referrerpolicy="no-referrer" onerror="this.style.display='none'"></div>
<!-- v13.120-hero: Match-Protocol HUD chrome \u2014 two restrained cyan corner
     brackets + a top light line, pointer-transparent, decorative only. -->
<div class="hero-hud" aria-hidden="true"><i></i><i></i></div>
<!-- v12.26: layer D \u2014 the DATA SURFACE. The countdown bar and its match row
     ride ONE positioned layer (z:3) above the video (z:0), the crests (z:1)
     and the css fx (z:2) \u2014 exactly the user's ladder. v13.122-heroart:
     the player artwork (now a .herowrap sibling, z:2) also reads BELOW
     this surface \u2014 text stays on top even where a figure overlaps a
     crest/name zone at narrow widths. -->
<div class="hero-data">
<!-- v12.46-herofix (kept): the match row (heroSpot) rides ABOVE the
     countdown strip. renderHeroSpot paints the three-zone grid here. -->
<div id="heroSpot">__SEO_HERO__</div>
<div id="bigbar" class="hero-count">
<!-- v13.120-hero: the COUNTDOWN STRIP \u2014 a four-unit digital clock driven by
     updateBigBar() every second. Only the <b> digit nodes change; the unit
     labels ride data-i (translated on language switch). The __SEO_HC*__
     placeholders are filled server-side from the hero kickoff at render
     time (honest for no-JS visitors; the client corrects them on load).
     #hcSr is the screen-reader summary \u2014 polite, refreshed only when the
     remaining MINUTE changes (never announced per second). The bottom
     3px fill is the final-24h progress (same contract as the old bar). -->
<div class="hc-row"><span id="bigbarLabel" class="hc-label" data-i="barNext">\u26A1 \u062A\u0627 \u0628\u0627\u0632\u06CC \u0628\u0632\u0631\u06AF \u0628\u0639\u062F\u06CC</span><span class="hc-units" dir="ltr"><span class="hc-u"><b class="hc-v" id="hcD">__SEO_HCD__</b><i data-i="uDay">\u0631\u0648\u0632</i></span><span class="hc-c" aria-hidden="true">:</span><span class="hc-u"><b class="hc-v" id="hcH">__SEO_HCH__</b><i data-i="uHour">\u0633\u0627\u0639\u062A</i></span><span class="hc-c" aria-hidden="true">:</span><span class="hc-u"><b class="hc-v" id="hcM">__SEO_HCM__</b><i data-i="uMin">\u062F\u0642\u06CC\u0642\u0647</i></span><span class="hc-c" aria-hidden="true">:</span><span class="hc-u"><b class="hc-v" id="hcS">__SEO_HCS__</b><i data-i="uSec">\u062B\u0627\u0646\u06CC\u0647</i></span></span></div>
<span id="hcSr" class="sr-only" aria-live="polite"></span>
<div class="hc-track" id="bigbarTrack" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="__SEO_HCPCT__" title="\u0646\u0648\u0627\u0631 \u067E\u06CC\u0634\u0631\u0641\u062A \u062F\u0631 \u06F2\u06F4 \u0633\u0627\u0639\u062A \u067E\u0627\u06CC\u0627\u0646\u06CC \u0642\u0628\u0644 \u0627\u0632 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC \u067E\u0631 \u0645\u06CC\u200C\u0634\u0648\u062F"><div id="bigbarFill" class="bigbar-fill"></div></div>
</div>
</div>
</div>
<!-- v13.122-heroart: player-artwork slots (decorative flanks), filled
     by heroArt() through the HERO_ART mapping when a side resolves; the
     layer only renders for a mapped team (no reserved blank space, no
     broken img element; spelled out because seo-check's T-03 regex scans
     raw HTML and would trip on a literal img tag here). MOVED out of the
     card (was a sibling of .hero-video through v13.121): the card's
     overflow:hidden clipped the figures to the rounded rect, but the
     owner's reference mockup (2026-10-19) wants the heads to POP ABOVE
     the card's top edge for a 3D breakout — so the layer now rides as the
     LAST child of .herowrap (DOM-after the card ⇒ paints in front of the
     card shell at its z:2; the z:3 data surface inside the card still
     reads above the figures). Geometry lives in public-13.26.css. -->
<div class="hero-art" aria-hidden="true"><img alt="" referrerpolicy="no-referrer"><img alt="" referrerpolicy="no-referrer"></div>
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
<div id="liveMatches">__SEO_LIVE__</div>
</div>
<div class="card" id="topspotCard" style="display:none">
<h2 data-i="hLgNext" id="topSpotTitle">دیدارهای جذاب لیگ‌ها</h2>
<div id="topSpot">__SEO_TOPSPOT__</div>
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
<div id="uclSpot">__SEO_UCLSPOT__</div>
</div>
<!-- v12.16: \xAB\u062F\u0631 \u0627\u06CC\u0646 \u0647\u0641\u062A\u0647\xBB \u2014 the CURRENT Iranian week (Saturday\u2192Friday)
     agenda: every followed/top-3 game of this week in one box, live first,
     then kickoff order; games already played this week keep their final
     score. Zero extra API calls (same pool as the big boxes); hidden when
     the week has no followed games. -->
<div class="card" id="weekCard" style="display:none">
<h2 data-i="hWeek" id="weekTitle">\u{1F4C5} \u062F\u0631 \u0627\u06CC\u0646 \u0647\u0641\u062A\u0647</h2>
<div id="weekBox">__SEO_WEEK__</div>
</div>
<!-- v12.12: the \xAB\u{1F4C5} \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648\xBB list card is RETIRED \u2014 with the view
     toggle gone (always big-only) it only ever held the redundant "\u0647\u0645\u0647 \u062F\u0631
     \u062C\u0639\u0628\u0647 \u0628\u0627\u0644\u0627 \u0647\u0633\u062A\u0646\u062F" note; the hero card + the topspot box + the UCL box
     ARE the upcoming presentation (the user's ask). -->

</div>
<div class="card uclcard" id="uclCard">
<h2 class="uclh2"><span class="ucl-logo sm" aria-hidden="true">${UCL_LOGO_CHIP}</span><span data-i="hUcl">\u{1F3C6} \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627</span></h2>
<div id="ucl">__SEO_UCL__</div>
</div>
<div class="card" id="standingsCard">
<h2 data-i="hStandings">\u{1F4CA} \u062C\u062F\u0648\u0644 \u0644\u06CC\u06AF\u200C\u0647\u0627</h2>
<div id="standings">__SEO_STANDINGS__</div>
</div>
<div class="card" id="cupsCard">
<h2 data-i="hCups">\u{1F3C6} \u062A\u0648\u0631\u0646\u0645\u0646\u062A\u200C\u0647\u0627</h2>
<div id="cups">__SEO_CUPS__</div>
</div>

</div>
<!-- v12.5: the Iran card is gone \u2014 the PGL table lives inside the league
     standings grid above (#standings), per the user's request. -->
<div class="card" id="finishedCard">
<h2 data-i="hFinished">\u{1F3C1} \u0646\u062A\u0627\u06CC\u062C \u0627\u062E\u06CC\u0631</h2>
<div id="finished">__SEO_FINISHED__</div>
</div>
<!-- v13.58-herofix: live visitor-stats box \u2014 the LAST section before the
     footer. On desktop the JS layout engine (WIDE_RAIL in public-13.17.js)
     relocates #statsCard into #wideSide, directly below #cupsCard. On mobile
     (no JS relocation) the DOM order keeps it last, after #finishedCard.
     Filled client-side by the single /api/visit beacon (one fetch per page
     load fills BOTH this box and the footer counter). Shows online-now,
     today's views + unique visitors, total views, and today's top countries
     with percentages. Cookieless; the unique dedup uses a salted one-way hash
     (IP never stored) \u2014 see /privacy. -->
<div class="card" id="statsCard">
<h2>\u{1F4CA} \u0622\u0645\u0627\u0631 \u0628\u0627\u0632\u062F\u06CC\u062F \u0632\u0646\u062F\u0647</h2>
<div class="sbox" id="statsBox"><span class="slbl">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC…</span></div>
</div>
</main>
<footer id="about"><nav class="footnav" aria-label="\u0646\u0627\u0648\u0628\u0631\u06CC \u0627\u0635\u0644\u06CC"><a href="/" data-i="navHome">\u062E\u0627\u0646\u0647</a><a href="/matches">\u0628\u0627\u0632\u06CC\u200C\u0647\u0627</a><a href="/matches/today">\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0627\u0645\u0631\u0648\u0632</a><a href="/teams">\u062A\u06CC\u0645\u200C\u0647\u0627</a><a href="/competitions">\u0631\u0642\u0627\u0628\u062A\u200C\u0647\u0627</a><a href="/about" data-i="navAbout">\u062F\u0631\u0628\u0627\u0631\u0647</a><a href="/methodology">\u0631\u0648\u0634 \u06A9\u0627\u0631</a><a href="/contact" data-i="navContact">\u062A\u0645\u0627\u0633</a><a href="/data">\u062F\u0627\u062F\u0647\u200C\u0647\u0627</a><a href="/privacy">\u062D\u0631\u06CC\u0645 \u062E\u0635\u0648\u0635\u06CC</a><a href="/terms">\u0634\u0631\u0627\u06CC\u0637 \u0627\u0633\u062A\u0641\u0627\u062F\u0647</a><a href="/sitemap">\u0646\u0642\u0634\u0647 \u0633\u0627\u06CC\u062A</a></nav>
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
<div><span data-i="madeWith">\u0633\u0627\u062E\u062A\u0647\u200C\u0634\u062F\u0647 \u0628\u0627 \u2764\uFE0F</span> \u2014 <a href="/admin" data-i="adminLink">\u0648\u0631\u0648\u062F \u0645\u062F\u06CC\u0631\u06CC\u062A</a> \u2014 <a href="https://t.me/SportSignalAlertsBot" target="_blank" rel="noopener" data-i="botLink">\u0631\u0628\u0627\u062A \u062A\u0644\u06AF\u0631\u0627\u0645</a></div>
<div class="visitcount" id="visitCount"><span class="vc-l">بازدید امروز:</span> <span class="vc-n" id="vcToday">—</span> <span class="vc-sep">·</span> <span class="vc-l">بازدیدکننده دیروز:</span> <span class="vc-n" id="vcYesterday">—</span> <span class="vc-sep">·</span> <span class="vc-l">بازدیدکننده این ماه:</span> <span class="vc-n" id="vcMonth">—</span> <span class="vc-sep">·</span> <span class="vc-l">بازدید کل:</span> <span class="vc-n" id="vcTotal">—</span></div></footer>
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
<button id="backTop" type="button" aria-label="بازگشت به بالا / Back to top" title="بازگشت به بالا / Back to top"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg></button>
<script src="/core-13.11.js" defer><\/script>
<script>var PAGE_TZ = "__PAGE_TZ__";<\/script>
<script src="/public-13.30.js" defer><\/script>
<script>/* v13.57-uniqueregions: cookieless page-view beacon. ONE same-origin
     GET /api/visit per page load (never from prerender); the worker counts it
     in the background (ctx.waitUntil: page view + daily unique dedup via a
     salted one-way hash + country code + online-now). The JSON response fills
     BOTH the footer counter and the live stats box. No cookies, no IP storage
     — see /privacy. */
(function(){if(document.visibilityState==='prerender')return;
function faNum(n){try{return Number(n).toLocaleString('fa-IR')}catch(e){return String(n)}}
function set(id,v){var e=document.getElementById(id);if(e)e.textContent=v;}
function renderStatsBox(d){
  var box=document.getElementById('statsBox');if(!box)return;
  var h='';
  h+='<div class="srow"><span class="slbl">\u{1F534} \u0622\u0646\u0644\u0627\u06CC\u0646 \u0627\u06A9\u0646\u0648\u0646</span><span class="sval live">'+faNum(d.online||0)+'</span></div>';
  h+='<div class="srow"><span class="slbl">\u0628\u0627\u0632\u062F\u06CC\u062F \u0627\u0645\u0631\u0648\u0632</span><span class="sval">'+faNum(d.today_views||0)+'</span></div>';
  h+='<div class="srow"><span class="slbl">\u0628\u0627\u0632\u062F\u06CC\u062F\u06A9\u0646\u0646\u062F\u0647 \u0627\u0645\u0631\u0648\u0632</span><span class="sval">'+faNum(d.today_visitors||0)+'</span></div>';
  h+='<div class="srow"><span class="slbl">\u0628\u0627\u0632\u062F\u06CC\u062F\u06A9\u0646\u0646\u062F\u0647 \u062F\u06CC\u0631\u0648\u0632</span><span class="sval">'+faNum(d.yesterday_visitors||0)+'</span></div>';
  h+='<div class="srow"><span class="slbl">\u0628\u0627\u0632\u062F\u06CC\u062F\u06A9\u0646\u0646\u062F\u0647 \u0627\u06CC\u0646 \u0645\u0627\u0647</span><span class="sval">'+faNum(d.month_visitors||0)+'</span></div>';
  h+='<div class="srow"><span class="slbl">\u0628\u0627\u0632\u062F\u06CC\u062F \u06A9\u0644</span><span class="sval">'+faNum(d.total_views||0)+'</span></div>';
  var cs=d.countries||[];
  if(cs.length){
    h+='<div class="scap">\u0628\u0627\u0632\u062F\u06CC\u062F\u06A9\u0646\u062F\u0647\u0627\u06CC \u0627\u0645\u0631\u0648\u0632 \u0628\u0647 \u06A9\u0634\u0648\u0631</div>';
    h+='<table><thead><tr><th>\u06A9\u0634\u0648\u0631</th><th>\u062A\u0639\u062F\u0627\u062F</th><th>\u062F\u0631\u0635\u062F</th></tr></thead><tbody>';
    cs.forEach(function(c){
      h+='<tr><td><span class="cflag">'+c.flag+'</span> '+c.name+'</td><td class="cnum">'+faNum(c.visitors)+'</td><td class="cpct">'+faNum(c.pct)+'\u066A</td></tr>';
    });
    h+='</tbody></table>';
  }
  box.innerHTML=h;
}
try{fetch('/api/visit',{cache:'no-store',keepalive:true,credentials:'same-origin'}).then(function(r){return r.ok?r.json():null;}).then(function(d){
  if(!d)return;
  set('vcToday',faNum(d.today_views||0));set('vcYesterday',faNum(d.yesterday_visitors||0));set('vcMonth',faNum(d.month_visitors||0));set('vcTotal',faNum(d.total_views||0));
  renderStatsBox(d);
}).catch(function(){});}catch(e){}
})();<\/script>
</body>
</html>`;
