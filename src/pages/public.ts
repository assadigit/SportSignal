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
<!-- v13.133-persiantype: preloads follow the new stack — the body face
     (Peyda 400/800) + the heading variable font (MorabbaVF, one file for
     every heading weight). SemiBold/Bold arrive lazily with the tables. -->
<link rel="preload" href="/fonts/Peyda-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/Peyda-ExtraBold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/MorabbaVF.woff2" as="font" type="font/woff2" crossorigin>
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
<link rel="stylesheet" href="/public-13.71.css">
<style>/* v13.66-flatglow: flat outer glow (no inset bevel), uniform tint+border
     \u2014 the LIST variant of .match-featured (big matches inside the boxes
     below the hero) keeps this green treatment unchanged.
     v13.126-herolook: the hero card left the featured system entirely
     (the desired-look hero is its own design language, public-13.31.css);
     these rules now style ONLY the LIST variant. Reduced-motion disables
     every animation. */
:root{--feat-accent:#4CBB17;--feat-blur:22px;--feat-glow:22%;--feat-tint:6%;--feat-border:55%}
.match-featured{position:relative;border-color:color-mix(in srgb,var(--feat-accent) var(--feat-border),transparent)!important;background-image:linear-gradient(color-mix(in srgb,var(--feat-accent) var(--feat-tint),transparent),color-mix(in srgb,var(--feat-accent) var(--feat-tint),transparent))!important;box-shadow:0 0 var(--feat-blur) color-mix(in srgb,var(--feat-accent) var(--feat-glow),transparent)!important}
.match-featured::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(110deg,transparent 35%,rgba(180,255,120,.14) 45%,rgba(180,255,120,.04) 55%,transparent 65%);background-size:250% 100%;animation:feat-shimmer 2.5s linear infinite}
@keyframes feat-shimmer{0%{background-position:200% 0}100%{background-position:-150% 0}}
.match-featured::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:radial-gradient(ellipse at 70% 0%,color-mix(in srgb,var(--feat-accent) 10%,transparent),transparent 60%);animation:feat-glow-shift 4s ease-in-out infinite alternate}
@keyframes feat-glow-shift{0%{opacity:.4}100%{opacity:.9}}
.match-featured .match{background:transparent!important;border:none!important;overflow:visible!important}
@media(prefers-reduced-motion:reduce){.match-featured{animation:none}.match-featured::before{display:none}.match-featured::after{animation:none;opacity:.6}}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
/* v13.173-noal (owner: "the icons (calender clock clock) must be removed"):
     the three outline icons inside the countdown tiles are GONE from the
     markup — this re-centers the surviving number+label pair dead-center
     vertically (the public-13.71.css (0,2,0) rules left them in the
     icon-era lower positions; these (0,3,0) overrides win regardless of
     link order). */
.hero-mcard .mc-tile .mc-num{top:43%}.hero-mcard .mc-tile .mc-lbl{bottom:25.5%}
/* v13.174-mcfix (owner): the scene asset swap — scene-2.webp is scene.webp
     with the logo-cutout zone fully cleared: the original extraction left a
     ghost of the reference's own logo+reflection in the cutout's patchy
     alpha (the "mirrored Premier League logo" the owner saw under the
     lockup). NEW filename on purpose — /ui/mc/* is immutable-pinned, a
     same-name content swap never reaches returning browsers; this (0,2,0)
     override takes the 13.71 rule by cascade order. */
.hero-mcard .mc-scene{background-image:url('/ui/mc/scene-2.webp')}
/* v13.174-mcfix (owner): the top-of-hero gradient fade — the card's bright
     scene melts into the flat header band (#040F23, the sampled page-top
     navy) so the header + the hero read as one continuous background.
     ~18% of the card height, pure vertical gradient (symmetric, RTL-
     agnostic); the white PL lockup (z2, later DOM) rides ABOVE the veil and
     stays fully readable.
     v13.175-mccrop (owner: "protect the player's head"): the veil drops to
     z1 and the players (z2) now ride ABOVE it — the fade melts ONLY the
     stadium scene, the head tops stay fully bright, never dimmed. */
.hero-mcard .mc-topfade{position:absolute;left:0;right:0;top:0;height:18%;z-index:1;pointer-events:none;background:linear-gradient(180deg,#040F23 0%,rgba(4,15,35,.94) 30%,rgba(4,15,35,.6) 58%,rgba(4,15,35,.22) 82%,rgba(4,15,35,0) 100%)}
/* v13.175-mccrop (owner) — the 3-request player-image round:
     (1) CROP: the portrait boxes shrink 50%W x 43%H -> 48%W x 41%H and the
         imgs switch to object-fit:cover + object-position:center top — the
         frame now ENDS at the player's chest (the UEFA cutoffs are 464px
         tall with the bust line at ~row 394; at the box's 41%H the crop
         lands exactly there), the container uses less vertical space, and
         the cover fit fills the box width so the player reads ~10-15%
         LARGER (the current fixtures: Yamal +12%, Mbappe +7%).
     (2) HEAD: the ports rise to z2 (above the z1 topfade veil — the fade
         never touches the heads again); object-position top-anchored + the
         headroom baked into every source portrait keep a >=8px gap of
         empty space above the hair at every screen width, and nothing
         clips at the top edge.
     (3) FADE: a mask-image linear-gradient (with the -webkit- prefix)
         fades ONLY the bottom 27% of each portrait box (73% -> 100% of the
         image height, so the effect is identical at every screen width) —
         the player dissolves into the dark scene above the HUD panel; the
         panel itself stays above the ports in stacking order (later DOM at
         the same z2), so the HUD always draws over the fade.
     THE BANDS (the HERO_ART library spans aspect 0.44-0.925 — one rule
     cannot frame them all): the DCL script below classifies each loaded
     portrait by naturalWidth/naturalHeight. The 0.53-0.66 band (17 wired
     portraits + both MC_ART arts) gets the cover design above. Outside the
     band (14 wide-shoulder + 4 narrow portraits) .mc-fit-w keeps the
     whole player visible (object-fit:contain, bottom-anchored — no
     mid-air shoulder cuts, no +40% inflation) inside the same shorter
     faded box. The MC_ART reference cutouts (470x718, aspect 0.655) ride
     the cover path at +12% via a wider-than-port frame (116.7% x 100%,
     margins -6.25%/-10.4% -> box centers stay 25%/75%W, shoulders bleed
     ~3%W off-card exactly like the reference composition); the card's
     overflow:hidden clips the bleed at the card edge (no h-scroll). */
.hero-mcard .mc-ports{z-index:2}
.hero-mcard .mc-ports .mc-port{height:41%;width:48%}
.hero-mcard .mc-ports .mc-port.mc-port-a{left:52%}
.hero-mcard .mc-ports .mc-port img{object-fit:cover;object-position:center top;-webkit-mask-image:linear-gradient(180deg,#000 0 73%,transparent 100%);mask-image:linear-gradient(180deg,#000 0 73%,transparent 100%)}
.hero-mcard .mc-ports .mc-port img.mc-fill{object-fit:cover;object-position:center top;width:116.7%;height:100%;margin-left:-6.25%}
.hero-mcard .mc-ports .mc-port.mc-port-a img.mc-fill{margin-left:-10.4%}
.hero-mcard .mc-ports .mc-port img.mc-fit-w{object-fit:contain;object-position:center bottom}</style>
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
<div class="head-actions"><span class="tb-btns"><button id="sbtn" onclick="toggleTz()" aria-expanded="false" aria-controls="tzpanel" title="منطقه زمانی" aria-label="منطقه زمانی"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg></button><button id="lbtn" onclick="switchLang()"></button><!-- v13.134-typelight: the dark/light toggle is TEMPORARILY RETIRED (owner directive — the app is always dark). toggleTheme()/setTheme() in core JS stay null-guarded; the bundle init pins setTheme("dark"). Re-add this button to re-enable. --></span></div>
<div id="tzpanel" role="group" aria-label="\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC"><div class="tz-head"><span data-i="tzTitle">\u{1F30D} \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC</span><button id="tzclose" onclick="toggleTz()" title="\u0628\u0633\u062A\u0646" aria-label="\u0628\u0633\u062A\u0646">\u2715</button></div><input id="tzfilter" type="search" placeholder="\u062C\u0633\u062A\u062C\u0648\u06CC \u06A9\u0634\u0648\u0631 \u06CC\u0627 \u0634\u0647\u0631\u2026" data-p="tzSearch" aria-label="\u062C\u0633\u062A\u062C\u0648\u06CC \u06A9\u0634\u0648\u0631 \u06CC\u0627 \u0634\u0647\u0631"><select id="tzsel" title="\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC" aria-label="\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC"></select></div>
<!-- v12.20: visible PROOF for the auto-update claim. v12.26: the sync line
     prints the TRUTHFUL absolute stamp of the last real API refresh \u2014
     \xAB\u0622\u062E\u0631\u06CC\u0646 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC: \u062C\u0645\u0639\u0647 \u06F2\u06F1:\u06F3\u06F0 \u0634\u0628\xBB (weekday + time + period word) \u2014
     rendered by renderSync()/fmtStamp() from the payload's fetchedAt. -->
</header>
<a class="skip-link" href="#main">پرش به محتوا</a>
<main id="main">
<!-- v12.12: the view toggle is RETIRED \u2014 the page is permanently big-only
     (\xAB\u0641\u0642\u0637 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF\xBB, the user's default). The hero card + the topspot
     box + the UCL box ARE the upcoming presentation. -->
<!-- v13.126-herolook: the featured-match HERO, "Stadium Night" —
     restyled to the owner's desired-look.jpg reference. The scene is a
     FULL-BLEED graded night photo behind the whole section (the transparent
     header floats over it — see the header note above); the match info lives
     on a centred GLASS card (a.hero-card) painted into #heroSpot by
     renderHeroSpot (server mirror: heroCardHtml fills the hero spot for
     no-JS); the countdown panel sits BELOW the card as a chamfered
     cyan->aqua wrapper; the players flank the card popping out of it (3D);
     corner pills: the static carousel (inline-start) + the bell
     (inline-end, -> #topspotCard). Same data, states and countdown contract
     (#bigbar ids driven by updateBigBar every second), fa/en + dark/light
     preserved — the full note lives in public-13.31.css. -->
<div class="herowrap">
<div class="hero-bg" aria-hidden="true">
<img class="bg-photo" src="/hero-poster.jpg" alt="" decoding="async" referrerpolicy="no-referrer">
<div class="bg-grade"></div>
<div class="bg-flood"></div>
<svg class="bg-swoosh sw-left" viewBox="0 0 560 320" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false"><defs><linearGradient id="swLg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#0087FA" stop-opacity="0.95"/><stop offset="0.7" stop-color="#00D3FF" stop-opacity="0.45"/><stop offset="1" stop-color="#00D3FF" stop-opacity="0"/></linearGradient><filter id="swLglow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g fill="none" stroke-linecap="round" filter="url(#swLglow)"><path class="band-primary" d="M-20 236 C 130 196, 300 252, 470 116" stroke="url(#swLg)" stroke-width="14" opacity="0.8"/><path class="band-secondary" d="M-20 268 C 150 238, 320 286, 520 168" stroke="url(#swLg)" stroke-width="8" opacity="0.85"/><path class="band-secondary" d="M-20 252 C 140 217, 310 268, 495 142" stroke="#CBEFFF" stroke-width="2.2" opacity="0.9"/></g></svg>
<svg class="bg-swoosh sw-right" viewBox="0 0 560 320" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false"><defs><linearGradient id="swRg" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#06F9C3" stop-opacity="0.95"/><stop offset="0.55" stop-color="#00D3FF" stop-opacity="0.5"/><stop offset="1" stop-color="#0087FA" stop-opacity="0"/></linearGradient><filter id="swRglow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g fill="none" stroke-linecap="round" filter="url(#swRglow)"><path class="band-primary" d="M580 236 C 430 196, 260 252, 90 116" stroke="url(#swRg)" stroke-width="14" opacity="0.8"/><path class="band-secondary" d="M580 268 C 410 238, 240 286, 40 168" stroke="url(#swRg)" stroke-width="8" opacity="0.85"/><path class="band-secondary" d="M580 252 C 420 217, 250 268, 65 142" stroke="#D8FFF4" stroke-width="2.2" opacity="0.9"/></g></svg>
<img class="bg-wm wm-home" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none'">
<img class="bg-wm wm-away" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none'">
<div class="bg-vignette"></div>
<div class="bg-scrim"></div>
<!-- v13.155-herodepth (spec 02): the ambient particle layer — ~9 fixed,
deterministic 1-3px cool-blue points in the open stadium areas (outer
thirds + the band above the HUD; the vars carry position/size/duration/
negative delay/drift so no two share a rhythm and no JS is involved).
Rides BEFORE .bg-lights so the floodlight overlay stays .hero-bg's last
child (its v13.134 contract); decorative only — aria-hidden,
pointer-transparent, parked under prefers-reduced-motion (CSS). -->
<div class="hero-particles" aria-hidden="true">
<i class="hero-particle" style="--p-x:6%;--p-y:9%;--p-s:2px;--p-dur:29s;--p-del:-11s;--p-drift:14px"></i>
<i class="hero-particle" style="--p-x:14%;--p-y:16%;--p-s:1px;--p-dur:23s;--p-del:-7s;--p-drift:-10px"></i>
<i class="hero-particle" style="--p-x:24%;--p-y:7%;--p-s:2px;--p-dur:33s;--p-del:-19s;--p-drift:18px"></i>
<i class="hero-particle" style="--p-x:10%;--p-y:34%;--p-s:1px;--p-dur:27s;--p-del:-3s;--p-drift:-12px"></i>
<i class="hero-particle" style="--p-x:19%;--p-y:52%;--p-s:2px;--p-dur:31s;--p-del:-23s;--p-drift:9px"></i>
<i class="hero-particle" style="--p-x:76%;--p-y:6%;--p-s:1px;--p-dur:26s;--p-del:-9s;--p-drift:12px"></i>
<i class="hero-particle" style="--p-x:86%;--p-y:14%;--p-s:2px;--p-dur:35s;--p-del:-15s;--p-drift:-16px"></i>
<i class="hero-particle" style="--p-x:93%;--p-y:27%;--p-s:1px;--p-dur:21s;--p-del:-5s;--p-drift:10px"></i>
<i class="hero-particle" style="--p-x:80%;--p-y:44%;--p-s:2px;--p-dur:30s;--p-del:-25s;--p-drift:-14px"></i>
</div>
<!-- v13.134-typelight (owner, lighting round): the stadium-lights overlay — the supplied
     transparent PNG (/stadium-lights-hero.png, 1400x467) as a subtle atmospheric
     light layer over the composed scene (screen blend, .799 opacity in
     public-13.45.css; the raise chain .35 -> .5 -> .6 -> .66 -> .726 -> .799). LAST child of .hero-bg: above photo/grade/swooshes/watermarks/
     vignette/scrim, below the card, players and header. Decorative only. -->
<img class="bg-lights" src="/stadium-lights-hero.png" alt="" aria-hidden="true" decoding="async" referrerpolicy="no-referrer">
</div>
<!-- the players: absolute at section level, flanking the glass card; filled
     by heroArt() through the HERO_ART mapping (no src here — the layer
     renders only for a mapped team; spelled out because seo-check's T-03
     regex scans raw HTML).
     v13.159-bakedcast (owner: "there are still line and hard edges and
     rectangles" — the live v13.158 verified failing, twice over): each
     lane wrapper carries TWO imgs — the .hero-cast SHADOW img FIRST (DOM
     order = behind the figure) and the figure img second, both filled from
     the SAME heroArtFor entry by heroArt(); the cast src is the entry's
     <slug>.cast.webp — the player's own portrait PRE-BAKED into a shadow
     by scripts/make-hero-casts.js (blackened + gaussian-blurred +
     floor-faded IN PIXELS, padded so the blur fringe never meets a file
     edge) and shown with NO filter and NO mask (public-13.62.css), only
     opacity + the lane-split translate+skewX: plain alpha pixels, zero
     engine-sensitive compositing primitives — the three-round
     live-compositing post-mortem lives in SHADOW-CONSULTATION.md. -->
<div class="hero-player hero-player--cinematic player-home" aria-hidden="true"><img class="hero-cast" alt="" referrerpolicy="no-referrer"><img alt="" referrerpolicy="no-referrer"></div>
<div class="hero-player hero-player--cinematic player-away" aria-hidden="true"><img class="hero-cast" alt="" referrerpolicy="no-referrer"><img alt="" referrerpolicy="no-referrer"></div>
<!-- the match card: ONE real link to the match page wraps the whole HUD;
     renderHeroSpot paints #heroSpot (class-for-class with the server
     mirror so the client re-render is seamless).
     v13.150-hud (owner): the previous THREE artworks (the wide card frame
     PNG, the match-time chip PNG and the countdown panel PNG) are RETIRED —
     the whole HUD is now ONE supplied frame: /ui/sportsignal-pc-match-hud.png
     (1000×406: wings + clock pod + date shelf + three countdown pockets +
     venue tail, the clock/stadium icons BAKED IN). The card renders the
     frame at its exact 1000:406 aspect and the content is a stack of
     absolutely-positioned overlay zones measured from the artwork's pixels
     (hud-visual-reference.png: crest+name wings, time in the clock pod,
     DAYS/HOURS/MINUTES in the pockets, venue in the tail, league block
     above the frame). -->
<a class="hero-card" id="bigHeroCard" style="display:none" href="#">
<!-- the supplied PC-Match HUD frame — absolute visual layer BEHIND all
     content (pointer-events:none, decorative only; its RGBA glow halo must
     not be clipped, so nothing here may clip the card). It rides as a
     static sibling BEFORE #heroSpot so the client-side renderHeroSpot
     rebuild (which rewrites only #heroSpot's innerHTML) never removes it. -->
<img class="card-hud" src="/ui/sportsignal-pc-match-hud.png" alt="" aria-hidden="true" decoding="async" referrerpolicy="no-referrer">
<!-- v13.155-herodepth (spec 03): the interior-face depth overlay — a
     translucent navy deepening gradient clipped to the artwork's measured
     inner face (card-relative %; measured from the PC-Match frame PNG with
     the same ≥10px-inset method the v13.155 shadow plane used before its
     v13.157 retirement — this overlay's polygon is its OWN, kept). Static
     inside the card anchor (survives the
     renderHeroSpot rebuild like .hud-cells); z0 with DOM-after the frame =
     painted above the frame, under every content zone (z1). -->
<div class="hud-depth" aria-hidden="true"></div>
<!-- v13.150-hud: the countdown cells — a STATIC layer over the artwork's
     three pockets, driven by updateBigBar every second (same #hcD/#hcH/#hcM
     ids and data-i labels as the old #bigbar tiles; the seconds tile
     retires with the old panel — the frame has exactly three pockets).
     Label rides ABOVE the number per the visual reference. Static inside
     the card anchor so renderHeroSpot never rebuilds it. The __SEO_HC*__
     placeholders are filled server-side from the hero kickoff at render
     time (honest for no-JS visitors; the client corrects them on load);
     the router ships the layer hidden for non-upcoming heroes and
     updateBigBar keeps the same rule every tick. #hcSr + the sr-only 24h
     progress track keep their ids (a11y contract untouched). -->
<div class="hud-cells" role="timer" dir="ltr">
<span class="count-tile"><i class="count-unit" data-i="uDay">روز</i><b class="count-num" id="hcD">__SEO_HCD__</b></span>
<span class="count-tile"><i class="count-unit" data-i="uHour">ساعت</i><b class="count-num" id="hcH">__SEO_HCH__</b></span>
<span class="count-tile"><i class="count-unit" data-i="uMin">دقیقه</i><b class="count-num" id="hcM">__SEO_HCM__</b></span>
</div>
<span id="hcSr" class="sr-only" aria-live="polite"></span>
<div class="hc-track" id="bigbarTrack" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="__SEO_HCPCT__" title="نوار پیشرفت در ۲۴ ساعت پایانی قبل از شروع بازی پر می‌شود"><div id="bigbarFill" class="bigbar-fill"></div></div>
<div id="heroSpot">__SEO_HERO__</div>
</a>
<!-- v13.170-mcv3 (owner): the MOBILE hero — the reference-rebuild HUD match
     card (the owner's 13-instruction round against Visual reference v2.png;
     built + QA'd as a standalone demo first — VLM 98/100 side-by-side, every
     element position verified within 2%W on a 50%-opacity overlay). The
     baked V2 frame img RETIRES (the old /ui/sportsignal-hud-mobile-v2.webp
     stays served + pinned one SEO TTL); the card is DRAWN LIVE, every
     element sized in cqw on a full-bleed 9:16 container-type:inline-size
     canvas with square outer corners:
     · .mc-bg — the layered stadium scene: a synthetic navy base (floodlit
       corners, edge bands, light shaft, bloom band at y20-26%, crowd-stand
       texture, pitch strip with a converging centre line + flare hotspots,
       corner vignette) UNDER the extracted photographic scene
       /ui/mc/scene.webp (the reference's own top 43% minus the players and
       the competition logo, alpha-masked at 92% — the synthetic layers stay
       under it so a dead asset degrades gracefully).
     · .mc-ports — the STATIC portrait containers (home left / away right,
       v13.175-mccrop: 48%W x 41%H each, z2 above the topfade veil);
       renderMCard fills them with the MC_ART owner-reference cutouts
       FIRST (object-fit:cover, top-anchored, +12% via the wider-than-port
       frame, the crop ends at the chest) and falls back to the HERO_ART
       library cutouts for unmapped clubs (cover for the 0.53-0.66 aspect
       band — same chest-crop design; .mc-fit-w contain for the wider /
       narrower ones, classified by the DCL script). Every portrait's
       bottom 27% melts into the scene via a mask-image gradient so the
       transition into the HUD below stays soft.
     · svg.mc-panel — the chamfered HUD frame drawn as an inline SVG path:
       45deg corner cuts, a raised tab with angled shoulders sitting ON the
       continuous top border, a DOUBLE border (pure-cyan #00E9FD outer line
       + #3E9BE8 inner line), blue inner-glow strokes (clip-path +
       feGaussianBlur), white-hot corner nodes, the centre divider (faded
       ends), and the strong blue outer glow via filter:drop-shadow ON the
       SVG (box-shadow would be clipped by clip-path); the tab emits a blue
       glow ABOVE the panel over the players.
     · #mcardSpot — the data zone rebuilt client-side (renderMCard, called
       from BOTH renderHeroSpot exits — same lifecycle as the PC hero) and
       filled server-side by mcardHtml (seo/markup.ts): the white
       competition lockup (MC_WL — /ui/mc/wl-*.webp), the crests (MC_CREST
       white overrides or the FD crest URLs), the names, the WEEKDAY+date
       line and the kickoff time. LATIN digits everywhere on the card (the
       owner's instruction 8): «سه شنبه 27 مهر» renders the Jalali
       weekday+day+month with Latin day digits, «23:00» stays en-GB 24h,
       tabular-nums so the countdown never jitters.
     · svg.mc-capsule — the elongated hexagon date/time capsule with
       gradient border (dim blue ends, white-cyan center) + glowing chevron
       marks at both pointed ends.
     · .mc-cells — three chamfered countdown tiles, each stacking an
       outline icon (calendar/clock/stopwatch), the two-digit Latin number
       (mcD/mcH/mcM — the updateBigBar ticking contract, ids unchanged) and
       the FA label (data-i hooks, core-13.15 I18N).
     · .mc-venue — the chamfered venue bar (static frame + the #mcVenue
       text node renderMCard/mcardHtml fill; the localized neutral fallback
       «استادیوم نامشخص»/Venue TBA; v13.174-mcfix (owner): the outline
       stadium icon is REMOVED — it painted on top of the text; the bar now
       carries the centered venue text only).
     · .mc-topfade — v13.174-mcfix (owner): the top-of-hero gradient veil
       (#040F23 → transparent, ~18%H) that melts the card's bright scene
       into the flat header band so the header + hero read as one
       continuous background (the hard seam the owner reported).
       v13.175-mccrop (owner: "protect the player's head"): the veil is
       z1 — it darkens ONLY the scene; the players (z2) ride above it
       with fully bright, never-dimmed head tops.
     · .mc-state — the LIVE/FT/postponed chip in the middle tile zone
       (unchanged v13.169 contract — the status comes from the match data,
       never inferred from the clock).
     dir="ltr" is pinned on the anchor AND in the CSS so the RTL page can
     never mirror the layout; the Persian strings ride the Unicode bidi
     algorithm inside the LTR block. Visibility: display:none by default;
     the router unhides it exactly like the PC card when a hero exists; CSS
     shows it ONLY <=899px. renderMCard keeps inline display="" so the CSS
     breakpoint always decides. -->
<a class="hero-mcard" id="heroMCard" style="display:none" href="#" dir="ltr">
<div class="mc-bg" aria-hidden="true">
<div class="mc-base"></div>
<div class="mc-scene"></div>
<div class="mc-edges"></div>
<div class="mc-beams"></div>
<div class="mc-shaft"></div>
<div class="mc-bloom"></div>
<div class="mc-orbs"></div>
<div class="mc-stands"></div>
<div class="mc-streaks"></div>
<div class="mc-pitch"></div>
<div class="mc-pitchwedge"></div>
<div class="mc-pitchglow"></div>
<div class="mc-pitchline"></div>
<div class="mc-vignette"></div>
</div>
<div class="mc-ports" aria-hidden="true">
<div class="mc-port mc-port-h"></div>
<div class="mc-port mc-port-a"></div>
</div>
<div class="mc-topfade" aria-hidden="true"></div>
<svg class="mc-panel" viewBox="0 0 100 177.778" preserveAspectRatio="none" aria-hidden="true">
<defs>
<linearGradient id="pfill" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#06204E"/>
<stop offset=".18" stop-color="#041739"/>
<stop offset="1" stop-color="#020E26"/>
</linearGradient>
<linearGradient id="tstroke" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="#0A9FE0"/>
<stop offset=".5" stop-color="#F4FCFF"/>
<stop offset="1" stop-color="#0A9FE0"/>
</linearGradient>
<linearGradient id="pstroke" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#17DDF6"/>
<stop offset=".55" stop-color="#5EE7FF"/>
<stop offset="1" stop-color="#EAFDFF"/>
</linearGradient>
<linearGradient id="divgrad" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#0F92FF" stop-opacity="0"/>
<stop offset=".35" stop-color="#22C4FF" stop-opacity=".85"/>
<stop offset=".625" stop-color="#FFFFFF" stop-opacity="1"/>
<stop offset=".8" stop-color="#0BE6FF" stop-opacity=".8"/>
<stop offset="1" stop-color="#0F92FF" stop-opacity="0"/>
</linearGradient>
<filter id="pblur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".55"/></filter>
<filter id="pblur2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.1"/></filter>
<clipPath id="pclip"><path d="M 16.9 75.9 L 83.1 75.9 L 88.6 81.4 L 88.6 165.0 L 83.1 170.5 L 16.9 170.5 L 11.4 165.0 L 11.4 81.4 Z"/></clipPath>
</defs>
<path d="M 16.9 75.9 L 83.1 75.9 L 88.6 81.4 L 88.6 165.0 L 83.1 170.5 L 16.9 170.5 L 11.4 165.0 L 11.4 81.4 Z" fill="url(#pfill)" opacity=".97"/>
<path d="M 29.5 75.9 L 35.5 69.1 L 38.8 68.4 L 61.2 68.4 L 64.5 69.1 L 70.5 75.9 Z" fill="url(#pfill)" opacity=".97"/>
<path d="M 33 75.9 L 37 66.5 L 63 66.5 L 67 75.9 Z" fill="rgba(10,120,255,.5)" filter="url(#pblur2)"/>
<path d="M 36 75.9 L 38.5 69.5 L 61.5 69.5 L 64 75.9 Z" fill="rgba(0,150,255,.55)" filter="url(#pblur)"/>
<g clip-path="url(#pclip)">
<path d="M 16.9 75.9 L 83.1 75.9 L 88.6 81.4 L 88.6 165.0 L 83.1 170.5 L 16.9 170.5 L 11.4 165.0 L 11.4 81.4 Z" fill="none" stroke="#0A73E8" stroke-width="2.4" opacity=".6" filter="url(#pblur2)"/>
<path d="M 16.9 75.9 L 83.1 75.9 L 88.6 81.4 L 88.6 165.0 L 83.1 170.5 L 16.9 170.5 L 11.4 165.0 L 11.4 81.4 Z" fill="none" stroke="#0B82F2" stroke-width="1.2" opacity=".7" filter="url(#pblur)"/>
</g>
<path d="M 18.1 78.1 L 81.9 78.1 L 86.4 82.6 L 86.4 163.8 L 81.9 168.3 L 18.1 168.3 L 13.6 163.8 L 13.6 82.6 Z" fill="none" stroke="#3E9BE8" stroke-width=".34" opacity=".9"/>
<path d="M 16.9 75.9 L 83.1 75.9 L 88.6 81.4 L 88.6 165.0 L 83.1 170.5 L 16.9 170.5 L 11.4 165.0 L 11.4 81.4 Z" fill="none" stroke="url(#pstroke)" stroke-width=".78" stroke-linejoin="miter"/>
<path d="M 29.5 75.9 L 35.5 69.1 L 38.8 68.4 L 61.2 68.4 L 64.5 69.1 L 70.5 75.9" fill="none" stroke="#2CF5FE" stroke-width=".78" stroke-linejoin="miter"/>
<path d="M 17.4 75.9 L 82.6 75.9" stroke="#66F7FF" stroke-width=".88" opacity=".97"/>
<path d="M 39.3 68.4 L 60.7 68.4" stroke="#37F0FE" stroke-width=".62" opacity=".95"/>
<path d="M 17.4 170.5 L 82.6 170.5" stroke="#9FF2FF" stroke-width=".8" opacity=".95"/>
<g fill="#DFF4FF" filter="drop-shadow(0 0 .8 rgba(60,160,255,.95))">
<circle cx="16.9" cy="75.9" r=".6"/><circle cx="83.1" cy="75.9" r=".6"/>
<circle cx="11.4" cy="81.4" r=".6"/><circle cx="88.6" cy="81.4" r=".6"/>
<circle cx="11.4" cy="165.0" r=".6"/><circle cx="88.6" cy="165.0" r=".6"/>
<circle cx="16.9" cy="170.5" r=".6"/><circle cx="83.1" cy="170.5" r=".6"/>
</g>
<circle cx="50" cy="75.9" r=".8" fill="#FFFFFF" filter="drop-shadow(0 0 1.2 rgba(160,240,255,.95))"/>
<rect x="49.8" y="78.6" width=".42" height="27.5" fill="url(#divgrad)" filter="drop-shadow(0 0 1.3 rgba(0,225,255,1))"/>
</svg>
<svg class="mc-capsule" viewBox="0 0 100 177.778" preserveAspectRatio="none" aria-hidden="true">
<defs>
<linearGradient id="cfill" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#052550"/>
<stop offset=".5" stop-color="#031635"/>
<stop offset="1" stop-color="#020D22"/>
</linearGradient>
<linearGradient id="cstroke" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="#011F3F"/>
<stop offset=".12" stop-color="#02B6F6"/>
<stop offset=".22" stop-color="#0BF2FF"/>
<stop offset=".36" stop-color="#DFFBFF"/>
<stop offset=".5" stop-color="#FFFFFF"/>
<stop offset=".64" stop-color="#DFFBFF"/>
<stop offset=".78" stop-color="#0BF2FF"/>
<stop offset=".88" stop-color="#02B6F6"/>
<stop offset="1" stop-color="#011F3F"/>
</linearGradient>
<filter id="cblur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".45"/></filter>
<filter id="cblur2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".9"/></filter>
<clipPath id="cclip"><path d="M 25.6 117.2 L 74.4 117.2 L 84.3 125.6 L 74.4 135.8 L 25.6 135.8 L 15.7 125.6 Z"/></clipPath>
</defs>
<path d="M 25.6 117.2 L 74.4 117.2 L 84.3 125.6 L 74.4 135.8 L 25.6 135.8 L 15.7 125.6 Z" fill="url(#cfill)" opacity=".92"/>
<g clip-path="url(#cclip)">
<path d="M 25.6 117.2 L 74.4 117.2 L 84.3 125.6 L 74.4 135.8 L 25.6 135.8 L 15.7 125.6 Z" fill="none" stroke="#0A73E8" stroke-width="1.8" opacity=".7" filter="url(#cblur2)"/>
<path d="M 25.6 117.2 L 74.4 117.2 L 84.3 125.6 L 74.4 135.8 L 25.6 135.8 L 15.7 125.6 Z" fill="none" stroke="#0B82F2" stroke-width=".9" opacity=".75" filter="url(#cblur)"/>
</g>
<path d="M 27.3 118.6 L 72.7 118.6 L 81.8 125.6 L 72.7 134.2 L 27.3 134.2 L 18.2 125.6 Z" fill="none" stroke="#3E9BE8" stroke-width=".3" opacity=".9"/>
<path d="M 25.6 117.2 L 74.4 117.2 L 84.3 125.6 L 74.4 135.8 L 25.6 135.8 L 15.7 125.6 Z" fill="none" stroke="url(#cstroke)" stroke-width=".6" stroke-linejoin="miter"/>
<g stroke="#7CD5F5" fill="none" stroke-linecap="round" stroke-linejoin="round">
<path d="M 10.0 121.6 L 7.3 125.6 L 10.0 129.5" stroke-width=".62" filter="drop-shadow(0 0 .5 rgba(120,200,255,.95))"/>
<path d="M 89.9 121.6 L 92.6 125.6 L 89.9 129.5" stroke-width=".62" filter="drop-shadow(0 0 .5 rgba(120,200,255,.95))"/>
<path d="M 10.15 115.8 L 10.15 135.2" stroke-width=".38" opacity=".6"/>
<path d="M 89.85 115.8 L 89.85 135.2" stroke-width=".38" opacity=".6"/>
</g>
</svg>
<div id="mcardSpot">__SEO_MHERO__</div>
<div class="mc-cells" id="mcCells" role="timer" dir="ltr">
<div class="mc-tile">
<svg viewBox="0 0 100 46" preserveAspectRatio="none" aria-hidden="true">
<path d="M 4 1.5 L 96 1.5 L 98.5 4 L 98.5 42 L 96 44.5 L 4 44.5 L 1.5 42 L 1.5 4 Z" fill="#04152E" opacity=".95"/>
<path d="M 6 4.2 L 94 4.2 L 95.8 6 L 95.8 40 L 94 41.8 L 6 41.8 L 4.2 40 L 4.2 6 Z" fill="none" stroke="#3E9BE8" stroke-width=".42" opacity=".85"/>
<path d="M 4 1.5 L 96 1.5 L 98.5 4 L 98.5 42 L 96 44.5 L 4 44.5 L 1.5 42 L 1.5 4 Z" fill="none" stroke="url(#tstroke)" stroke-width=".6" stroke-linejoin="miter"/>
</svg>
<b class="mc-num" id="mcD">__SEO_MCD__</b>
<i class="mc-lbl" aria-hidden="true"><span class="mc-lbl-t" data-i="mcD">روز</span></i>
</div>
<div class="mc-tile">
<svg viewBox="0 0 100 46" preserveAspectRatio="none" aria-hidden="true">
<path d="M 4 1.5 L 96 1.5 L 98.5 4 L 98.5 42 L 96 44.5 L 4 44.5 L 1.5 42 L 1.5 4 Z" fill="#04152E" opacity=".95"/>
<path d="M 6 4.2 L 94 4.2 L 95.8 6 L 95.8 40 L 94 41.8 L 6 41.8 L 4.2 40 L 4.2 6 Z" fill="none" stroke="#3E9BE8" stroke-width=".42" opacity=".85"/>
<path d="M 4 1.5 L 96 1.5 L 98.5 4 L 98.5 42 L 96 44.5 L 4 44.5 L 1.5 42 L 1.5 4 Z" fill="none" stroke="url(#tstroke)" stroke-width=".6" stroke-linejoin="miter"/>
</svg>
<b class="mc-num" id="mcH">__SEO_MCH__</b>
<i class="mc-lbl" aria-hidden="true"><span class="mc-lbl-t" data-i="mcH">ساعت</span></i>
</div>
<div class="mc-tile">
<svg viewBox="0 0 100 46" preserveAspectRatio="none" aria-hidden="true">
<path d="M 4 1.5 L 96 1.5 L 98.5 4 L 98.5 42 L 96 44.5 L 4 44.5 L 1.5 42 L 1.5 4 Z" fill="#04152E" opacity=".95"/>
<path d="M 6 4.2 L 94 4.2 L 95.8 6 L 95.8 40 L 94 41.8 L 6 41.8 L 4.2 40 L 4.2 6 Z" fill="none" stroke="#3E9BE8" stroke-width=".42" opacity=".85"/>
<path d="M 4 1.5 L 96 1.5 L 98.5 4 L 98.5 42 L 96 44.5 L 4 44.5 L 1.5 42 L 1.5 4 Z" fill="none" stroke="url(#tstroke)" stroke-width=".6" stroke-linejoin="miter"/>
</svg>
<b class="mc-num" id="mcM">__SEO_MCM__</b>
<i class="mc-lbl" aria-hidden="true"><span class="mc-lbl-t" data-i="mcM">دقیقه</span></i>
</div>
</div>
<div class="mc-slot mc-state" id="mcState" style="display:none" aria-hidden="true"></div>
<div class="mc-venue" aria-hidden="true">
<svg viewBox="0 0 100 8" preserveAspectRatio="none">
<defs><linearGradient id="vstroke" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="#023159"/>
<stop offset=".1" stop-color="#03538F"/>
<stop offset=".22" stop-color="#00B6F0"/>
<stop offset=".36" stop-color="#8FEBFF"/>
<stop offset=".5" stop-color="#F2FEFF"/>
<stop offset=".64" stop-color="#8FEBFF"/>
<stop offset=".78" stop-color="#00B6F0"/>
<stop offset=".9" stop-color="#03538F"/>
<stop offset="1" stop-color="#023159"/>
</linearGradient></defs>
<path d="M 3 1 L 97 1 L 98.3 2.3 L 98.3 5.7 L 97 7 L 3 7 L 1.7 5.7 L 1.7 2.3 Z" fill="#02193C" opacity=".97"/>
<path d="M 4.4 1.9 L 95.6 1.9 L 96.2 2.5 L 96.2 5.5 L 95.6 6.1 L 4.4 6.1 L 3.8 5.5 L 3.8 2.5 Z" fill="none" stroke="#2E86D6" stroke-width=".26" opacity=".85"/>
<path d="M 3 1 L 97 1 L 98.3 2.3 L 98.3 5.7 L 97 7 L 3 7 L 1.7 5.7 L 1.7 2.3 Z" fill="none" stroke="url(#vstroke)" stroke-width=".3" stroke-linejoin="miter"/>
<path d="M 3.4 7 L 96.6 7" stroke="#B5DBFB" stroke-width=".38" opacity=".9"/>
</svg>
<div class="v-group">
<span class="v-txt" id="mcVenue">__SEO_MVEN__</span>
</div>
</div>
<span id="mcSr" class="sr-only" aria-live="polite"></span>
</a>
<!-- v13.159-bakedcast (owner: "there are still line and hard edges and
     rectangles" — the live v13.158 verified failing, twice over): the
     projected player shadow is a PRE-BAKED IMAGE — img.hero-cast (the
     first child of each lane wrapper above) filled by heroArt() with
     <slug>.cast.webp (scripts/make-hero-casts.js: the player's own
     portrait blackened + blurred + floor-faded IN PIXELS, padded so the
     fringe never meets a file edge), carried with NO filter and NO mask
     (public-13.62.css) — only opacity + the lane-split translate+skewX toward
     the card (v13.160: stronger sigma/alpha bake, the skew leans the head-
     shadow toward the card per the player's lane; the wide-pose figures
     shift inward via --ss-pose-shift so they never kiss the viewport edge). THE POST-MORTEM (three rounds, one root cause — every
     round built the shadow from LIVE filter/mask/clip compositing, and
     those primitives diverge per engine at their geometric edges):
     v13.155/.156 (filter+mask on a copy) — mask-clip:border-box cropped
     the filtered paint to the img rectangle (the razor rectangle);
     v13.157 (drop-shadow on the masked wrapper) — engine-fragile
     ancestor-filter compositing + the wrapper clip-path hard cuts ("a
     black line and rectangle"); v13.158 (brightness(0)+blur+mask-clip:
     no-clip on a copy) — Chromium leaks the mask-extended fringe BELOW
     the hero onto the match list (60,848 toggle-verified px at 1920×900,
     which the v13.158 QA misattributed to "the live match list"),
     while engines without no-clip razor-cut the fringe at the img box.
     Baked pixels have no failure modes: identical in every engine, not
     croppable into a rectangle, unable to paint outside their own file
     bounds. Retires ≤1019px with the figures automatically (the cast
     rides the wrapper). Full dossier: SHADOW-CONSULTATION.md. -->
<!-- v13.150-hud: the old #bigbar countdown PANEL (head row + four tiles on
     the 474×204 capsule artwork) is RETIRED — the countdown now lives
     INSIDE the card as the .hud-cells layer over the PC-Match frame's own
     pockets (the ids/contract moved with it, see the card anchor above).
     The «تا بازی بزرگ بعدی» head caption retires with the panel — the
     pockets carry their own روز/ساعت/دقیقه labels per the reference. -->
<!-- v13.142-cinematic (owner): the "آخرین به‌روزرسانی" line sits BELOW the
     card — a SIBLING of the card, NOT part of it — on ALL viewports
     (public-13.45.css; renderSync in public-13.36.js keeps mirroring
     #lastSync into it).
     v13.144-lights (owner): "add آخرین به‌روزرسانی INSTANTLY after this
     box" — the gap tightens 6px -> 4px (#lastSyncM margin, CSS).
     v13.147-syncdate: the label reads تاریخ به‌روزرسانی: … .
     v13.149-syncfix: position:relative + z-index:2 (CSS) — it was painted
     UNDERNEATH the z1 stadium photo, invisible since v13.142.
     v13.150-hud: still 4px below the card — now below the ONE-frame HUD.
     v13.161-tzstamp (owner): the line carries the display zone + GMT offset
     in parentheses — «تاریخ به‌روزرسانی: چهارشنبه ۱۵:۲۰ ظهر (تهران 3:30 GMT)»,
     the owner's literal example. Server: lastUpdatedHtml (seo/markup.ts)
     always stamps Tehran; client: fmtStamp()+tzStamp() (public-13.47.js)
     renders the same shape from the user's ss_tz-selected zone — so this
     pre-JS paint matches the post-JS render line-for-line (PF-08). The
     /__SEO_SYNC__/g replace in seo/router.ts now fills BOTH copies (the
     old first-occurrence-only replace left #lastSync as a raw placeholder
     until the client overwrote it). -->
<p class="hero-sync-m" id="lastSyncM" aria-hidden="true">__SEO_SYNC__</p>
<!-- v13.165-mcfa (owner: "it's unclear for first-time viewers that they
     should scroll to see the rest; no sign of below containers"): the
     scroll hint — a centred pill UNDER the sync caption, the LAST hero
     child. <=899px only (the CSS breakpoint owns it; >=900px the base
     .mc-hint{display:none} stands), bobbing gently (parked under
     prefers-reduced-motion). It is a REAL link (#topspotCard — the first
     card below the hero) whose click the public JS intercepts for a
     smooth scroll to the first VISIBLE card (live > topspot > week >
     ucl > standings; .page-col the hidden-everything fallback);
     reduced-motion visitors get an instant jump. The label carries the
     data-i hook (core-13.15 I18N: mcHint — «بازی‌های دیگر» / "More
     matches") so the language toggle flips it with everything else.
     Lifecycle: display:none by default; the router unhides it under the
     SAME rule as the card (a hero exists — no hero, no hint), and
     renderMCard hides it with the card client-side (inline display=""
     so the breakpoint always decides).
     v13.168-mchint (owner: "Make the button of «بازی‌های دیگر» 50% bigger
     and more attention grabbing. in mobile"): the pill's SIZE lives in
     the CSS (public-13.71.css .mc-hint — every dimension ×1.5 + the
     cyan-button treatment + the 44px touch-target floor); this MARKUP is
     byte-unchanged (the label, the icon, the hooks, the lifecycle all
     stay — the size is presentation). -->
<a class="mc-hint" id="mcHint" style="display:none" href="#topspotCard"><svg class="mc-hint-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"/></svg><span data-i="mcHint">بازی‌های دیگر</span></a>
<!-- v13.131-playerpresence: BOTH corner pills are RETIRED (the carousel in
     v13.129, the bell now — owner directive); heroPills() in public-13.36.js
     null-guards their absence. -->
</div>
<!-- v13.126-herolook: the sync line moved out of the header, under the hero
     (P1.3) — renderSync() keeps filling #lastSync (same id, same wiring).
     v13.128-layoutrefine: .page-col — the centered content column wrapping
     EVERYTHING below the hero (the sync line + all the boxes). <body> is the
     full-width page shell now (the old 760px body column + the 100vw breakout
     trick are gone — 100vw pushed the header controls out of the viewport);
     at >=1080px the JS layout engine (setWide in public-13.36.js) adds .wide
     and this becomes the two-column grid: #wideMain (the important games +
     the containers, inline-START) | #wideSide (the tables sidebar,
     inline-END) — the 47.png reference layout.
     v13.133-persiantype: on phones (<900px) the CSS hides THIS copy — the
     in-hero #lastSyncM above owns the slot there. -->
<div class="page-col">
<p class="sub sync hero-sync" id="lastSync" role="status" aria-live="polite">__SEO_SYNC__</p>
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
<script src="/core-13.15.js" defer><\/script>
<script>var PAGE_TZ = "__PAGE_TZ__";<\/script>
<script src="/public-13.51.js" defer><\/script>
<script>/* v13.174-mcfix (owner): the cache-busted hero-art swap — REAL
     official portraits (Cole Palmer / Dominic Solanke — each club's own
     published hero cutoff from /players/clubs/, the same manifest provenance
     + kit verification as the PC hero) replace the reference render's
     placeholder-looking player figures, and the crest overrides move to the
     cleaned crest-2 files (the navy plate + edge speckles removed). The
     maps live in the immutable-pinned public-13.51.js (a same-name edit
     never reaches returning browsers), so this fresh server-rendered page
     re-assigns them on DOMContentLoaded — AFTER the deferred 13.51.js has
     evaluated its own var declarations, and BEFORE the payload's async
     renderHeroSpot/renderMCard reads them (the payload fetch cannot
     resolve before DOMContentLoaded fires — its response task is queued
     behind the DCL task). Re-renders (language toggle, poll refresh) read
     the already-patched maps. */
document.addEventListener("DOMContentLoaded",function(){
try{
if(typeof MC_ART!=="undefined")MC_ART={"Chelsea FC":{src:"/ui/mc/art-chelsea-2.webp"},"Tottenham Hotspur FC":{src:"/ui/mc/art-tottenham-2.webp"}};
if(typeof MC_CREST!=="undefined")MC_CREST={"Chelsea FC":"/ui/mc/crest-chelsea-2.webp","Tottenham Hotspur FC":"/ui/mc/crest-tottenham-2.webp"};
/* v13.175-mccrop (owner): the portrait framing classifier — every img
   renderMCard drops into a .mc-port gets measured (naturalWidth /
   naturalHeight) once it has loaded. Aspect 0.53-0.66 keeps the plain
   cover design (the chest crop); anything wider or narrower gets
   .mc-fit-w (the whole-player contain look, no mid-air shoulder cuts).
   A MutationObserver per port re-runs the scan on every re-render
   (language toggle, poll refresh) — renderMCard wipes innerHTML and
   rebuilds, firing childList each time. The dataset guard makes it
   idempotent; a failed load just never classifies (the img removes
   itself). The mc-fill reference arts (0.655) always stay in-band. */
var mcFitScan=function(){
document.querySelectorAll(".hero-mcard .mc-port img").forEach(function(im){
if(im.dataset.mcfit)return;
if(!im.naturalWidth){im.addEventListener("load",mcFitScan,{once:true});return}
im.dataset.mcfit="1";
var a=im.naturalWidth/im.naturalHeight;
if(a<0.53||a>0.66)im.classList.add("mc-fit-w");
});
};
document.querySelectorAll(".hero-mcard .mc-port").forEach(function(p){
new MutationObserver(mcFitScan).observe(p,{childList:true});
});
mcFitScan();
}catch(e){}
});<\/script>
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
