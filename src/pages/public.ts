// SportSignal — the public page template (RTL Persian UI: hero countdown,
// big-matches box, UCL card + table, standings grid, cups, live section).
// Everything between the backticks is CLIENT-side code (a string literal).
import { UCL_LOGO_CHIP } from "../tables";
import { THEME_INIT_SCRIPT, FONT_FACES_STYLE } from "./styles-shared";

// v13.241-mobilecta (S30): the ONE shared Telegram CHANNEL link — the
// promo banner's channel CTA (.ps-ch), the mobile header icon (#tgHead)
// and the mobile floating pill (#tgPill) all render from this single
// constant, so the three surfaces can never drift apart. (The BOT links
// stay literal: @SportSignalAlertsBot is a different destination.)
const TG_CHANNEL_URL = "https://t.me/sportsignalz";

export const PUBLIC_PAGE = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
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
<meta property="og:site_name" content="SportSignal">
<meta name="twitter:card" content="summary_large_image">
<!-- v13.225-socialsec (SS-26): the verified X profile handle — hardcoded
     here like og:site_name above (the template's own precedent); the twin
     lives in SEO.TWITTER_SITE and rides every page-shell head. -->
<meta name="twitter:site" content="@sportsignalz">
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
<!-- v13.224-herolcp (SS-20, Phase-2 S6): the hero poster preload — the
     Phase-7 final diagnostic (docs/WEB_OPTIMIZATION_RESULTS.md §18.4) and this
     session's fresh BEFORE series both attribute the mobile lab LCP to
     div.hero-bg > img.bg-photo (/hero-poster.jpg, 412×900, 40 KB):
     lighthouse's own lcp-discovery-insight says "fetchpriority=high
     should be applied" (priorityHinted:false) — the poster rides at
     MEDIUM priority behind the VeryHigh CSS + the High fonts/scene and,
     discovered mid-document (after the ~135 KB inline head styles), its
     throttled fetch lands ~4 s after FCP. The scene got exactly this
     treatment at v13.205 (media-scoped (max-width:899px) fetchpriority=
     high preload) and stopped being the LCP; the poster now gets the
     same: the head link discovers it at HTML-byte-0 (before the inline
     style blocks), the matching fetchpriority="high" on the img itself
     (below) keeps the priority when the element parses, and the media
     scope leaves the desktop queue untouched (desktop lab LCP is
     already 0.9 s). Unconditional element hint + mobile-scoped preload
     = the LCP image fetches in parallel with the CSS from byte-0. -->
<link rel="preload" href="/hero-poster.jpg" as="image" media="(max-width:899px)" fetchpriority="high">
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
<!-- v13.205-lcpreveal (F-H2, Phase 3): the stylesheet rename 13.79 -> 13.80 —
     the ONE client-referenced change inside: body:before's photographic
     background url(/bg.jpg) 92 KB -> url(/bg-2.webp) 39 KB (WebP q63,
     VLM-reviewed clean under the dark scrim the rule itself stacks on
     top; 13.79.css stays served + pinned one SEO TTL per the retention
     rule). Was 13.78 -> 13.79 since v13.202-threaddiet (F-M1) —
     the conservative dead-rule pass (31 provably-dead rules / 2654 bytes raw
     retired: .bb-end, the .bigcard family, .uclspot-logo/.ucl-head/
     .ucl-emblem, the .empty.loading-empty trio, .hero-mcard .t-icon/
     .v-icon, .mc-port img.mc-fill — every removal verified dead against
     every client-referencing surface + the dynamic-class audit + git
     history; no live rule, state, lang, theme or media variant touched). -->
<link rel="stylesheet" href="/public-13.82.css">
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
/* v13.180-mcequal (owner: "Remove the silhouettes behind the players"):
     scene-3.webp = scene-2 with BOTH player-shaped holes inpainted (the
     left figure zone x 33-328 + the right x 599-928 measured off the
     file's alpha, the hole core + the anti-aliased fringe refilled to the
     scene's own 235 standard alpha, Navier-Stokes fill; the center logo
     zone x 361-596 stays cleared — it is the MC_WL lockup's clean
     backdrop, the v13.174 design). The .mc-clean class rides the card
     whenever ANY port carries an <img> (the mcFitScan mutation toggle in
     the DCL below): the clean scene serves ONLY behind real cutouts;
     the crest-only fallback (a fixture with NO portrait at all) keeps
     scene-2's ghost figures as the placeholder look. (0,3,0) beats both
     scene rules; NEW filename on purpose — /ui/mc/* is immutable-pinned.
     v13.182-mcmirror (owner: "a dark shape is STILL visible between the
     players"): scene-3's inpainting killed the two PLAYER holes but left
     (a) the near-black roof/scoreboard void across the whole top band,
     (b) the transparent cleared logo zone reading as a floating black
     box, and (c) the crowd's own spectator-silhouette shapes whose
     shoulder-like "M" edge rose from the stands at the center — together
     they still read as a dark head-and-shoulders GHOST between the two
     players. scene-4.webp = scene-3 with the whole between-players band
     (core x 340-600, feathered 240-340 / 600-700; the outer thirds stay
     pixel-identical behind the players) rebuilt as the BRIGHT stadium
     glow the owner's Visual reference v2.png prescribes for the center
     axis: dark navy only in the header-melt rows (0-2.4%H), a rising
     blue glow behind the MC_WL lockup (6-16%H), the cyan floodlight
     peak at the bloom row (22.8%H), easing into crowd haze and fading
     behind the panel — measured off the reference's own center-axis
     luminance profile (lum 24-29 top -> 59-136 glow/peak), NO figure
     shapes anywhere in the band. Same immutability rule: NEW filename.
     v13.206-scenediet (Phase 3 close-out): the file re-encodes as
     scene-4-2.webp — the v13.182 save was effectively LOSSLESS (257.6KB,
     4.7x its 55KB siblings), and the v13.205 F-C1 preload shipping it at
     fetchpriority=high put 264KB at the head of the throttled mobile
     queue, eating the discovery win (simulated LCP stayed 6.1-7.4s).
     The q90/alpha95 re-encode (44.3KB, -83%) is VLM-verified visually
     indistinguishable at 2x zoom in the two worst regions (the cyan
     floodlight glow band, the crowd stipple + alpha feather). Same art,
     same 941x718 alpha contract — the lossless scene-4.webp stays on
     disk under the /ui/mc/* wildcard pin per the retention rule. */
.hero-mcard.mc-clean .mc-scene{background-image:url('/ui/mc/scene-4-2.webp')}
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
/* v13.238-mchedge (owner, the concept-mockup mobile hero — the S27
     instruction verbatim: «Remove the fade (the gradient mask) from the
     inner side of each player image. The hands near the center must
     stay fully opaque. Remove the fade at the bottom edge of each
     player image. Place the match card above the player images in the
     stacking order (z-index). Let the card overlap the lower part of
     the players. Scale each player image up moderately (~110-125%).
     Anchor the Atletico Madrid player to the left edge of the
     viewport. Anchor the Barcelona player to the right edge. Adjust
     the position of each image until the outer hand touches the
     viewport edge. Let the viewport crop that hand. Set the hero
     container to clip its overflow horizontally. Keep the LaLiga logo
     above both images in the stacking order.» — matching the Visual
     reference v2.png mockup frame instead of the faded look):
     THE FADE IS GONE — the v13.198 two-axis mask (the --mc-fade
     vertical dissolve + the --mc-side 6% side softeners) is RETIRED
     from the ONE shared img rule: the inward-facing hands stay fully
     opaque and sharp, and the bottom edge now ends crisp BEHIND the
     panel — the card's near-opaque fill overlaps and hides the lower
     torso, which is what the fade used to hide.
     THE SIZE: img height 98.6 -> 116cqw — the owner's ~110-125% band
     (1.18x): the Alvarez/Yamal heads land ~24cqw and the crowns ride
     at ~3cqw, the same library-default crown band just under the
     header melt that v13.198 set.
     THE FIT: cover -> CONTAIN. With the side fades gone, cover's
     inner column crop would slice a hard vertical edge through the
     wide poses' inward arms (alvarez .619 / yamal .560 both trimmed
     at the old .436 box); contain renders each source's FULL width,
     so the inner hands stay whole and the only crop left is the
     viewport edge itself. Each port becomes a full-width 104cqw lane
     so every source up to aspect .897 stays height-constrained at
     the full 116cqw (wider poses fit the lane width and ride a touch
     shorter — always the full figure, never a head cut).
     THE ANCHOR — PHYSICAL left/right ON PURPOSE (the owner's note:
     the artwork is a fixed picture, Atletico left / Barcelona right,
     and must NOT mirror in the RTL layout — no logical properties on
     these rules; the card anchor's dir="ltr" pins the card anyway):
     the home lane hangs 2cqw PAST the card's LEFT edge, the away lane
     2cqw past the RIGHT — the card's own overflow:hidden crops each
     outer hand at the screen edge (the outer hands reach ~1% of the
     source width, so ~1.3cqw of each hand lands beyond the edge and
     the viewport crops it), and each img aligns its figure to its OWN
     outer edge (object-position left/right bottom): the inner sides
     meet naturally near the centre, the away lane painting over the
     home lane where the two figures interleave (DOM-later wins at the
     shared z2).
     THE STACK: unchanged where it already matched the mockup — the
     PANEL (z3) crosses OVER the players (z2): the card overlaps the
     lower torso; the competition lockup rides #mcardSpot (z5) above
     both images; the topfade veil stays z1 under the players. The
     .herowrap gains overflow-x:clip at <=899px (the rule below the
     v13.199 margin note) so the scaled lanes can never open a
     sideways scrollbar.
     HISTORY: v13.175-.180 the crop/melt/equal-columns rounds ->
     v13.182-mcmirror the logical-property mirror -> v13.183-mchero
     the canonical 356x574 windows -> v13.197-mcdesktop one image set,
     one rule -> v13.198-mcsize the original size back + the short
     fades -> this round: the mockup hero — no fades, edge-anchored,
     viewport-cropped outer hands. */
.hero-mcard .mc-ports{z-index:2}
.hero-mcard .mc-panel{z-index:3}
/* v13.238-mchedge: ONE SHARED img rule for both sides (contain + the
     fixed 116cqw height; no per-file geometry, no .mc-pre/.mc-fit-w
     variants) + exactly TWO per-side overrides, both PHYSICAL: the
     lane anchor (left vs right past the card edge) and the img's
     outer object-position — the artwork must never mirror in RTL. */
.hero-mcard .mc-ports .mc-port{height:67%;width:104cqw}
.hero-mcard .mc-ports .mc-port.mc-port-h{left:-2cqw}
.hero-mcard .mc-ports .mc-port.mc-port-a{left:auto;right:-2cqw}
.hero-mcard .mc-ports .mc-port img{position:absolute;bottom:0;left:0;right:0;width:100%;height:116cqw;object-fit:contain;object-position:center bottom}
.hero-mcard .mc-ports .mc-port.mc-port-h img{object-position:left bottom}
.hero-mcard .mc-ports .mc-port.mc-port-a img{object-position:right bottom}
/* v13.199-mcspace (owner: "I want a little margin padding (just slightly
     from the header)" + the note "the head of harry kane is too much
     close to the website's logo, just slightly add some safe space"):
     the mobile card drops 16px lower under the transparent topbar —
     margin-top 68 -> 84px in the <=899px zone. The v13.166-settled 68
     put the card top ~66px from the page top, so the tallest crown
     (Kane, .6% source headroom -> ~80px) rode LEVEL with the brand
     logo's bottom edge (~82px) inside the logo's x-band (RTL pins the
     brand top-right, exactly over the away lane) — the owner's
     "too much close". 84 lifts EVERY crown ~16px: Kane's hair-line
     lands ~96px = ~13px daylight under the logo box at 390px (~15px
     at 412px — the gap is width-driven, the logo is fixed-px, so it
     only grows), the mc-pl lockup and the topfade veil ride down with
     the card (the melt into the header band is untouched — the strip
     the card vacates shows the same full-bleed hero-bg photo the
     header already floats on). The 16px is paid from the below-card
     peek (the v13.168 first-screen reserve), never from the card. */
@media (max-width:899px){.hero-mcard{margin-top:84px}}
/* v13.238-mchedge (the owner's instruction: «Set the hero container to
     clip its overflow horizontally (overflow-x: clip or hidden). The
     scaled images must not cause sideways scrolling.»): the wrap clips
     its own horizontal overflow in the phone zone — belt-and-braces
     on top of the card's own overflow:hidden (the 104cqw lanes hung
     2cqw past the card edges can never open a sideways scrollbar).
     clip is declared after hidden so engines that support it win
     (clip keeps overflow-y visible — no scroll-container side
     effects); the .hero-player cinematic lanes are display:none at
     <=1019px, so nothing that intentionally bleeds is affected. */
@media (max-width:899px){.herowrap{overflow-x:hidden;overflow-x:clip}}
/* v13.199-mcspace (owner: "make the league or ucl logo 30% larger in
     mobile view"): the white competition lockup scales x1.3 — width
     22.6 -> 29.4cqw, height 5.4 -> 7% (object-fit:contain scales the
     artwork exactly 1.3x whatever its own aspect). The translate(-50%,
     -50%) center keeps the box symmetric about (50%W, 6.7%H): the top
     edge rises 4.0 -> 3.2%H (still under the header melt), the 29.4cqw
     span (35.3-64.7%W) stays clear of both head columns (the crowns'
     outer edges land ~35/65%W — the gap between the players is exactly
     where the lockup lives). (0,2,0) later in the cascade beats the
     public-13.76.css rule; the stylesheet file itself stays
     byte-frozen (the v13.39 rename-on-edit rule — served-HTML edits
     ride this inline block). */
.hero-mcard .mc-pl{width:29.4cqw;height:7%}
/* v13.199-mcspace (owner: "make the match time written in farsi numerals
     (use farsi font)"): the FA kickoff swaps the Latin techno faces for
     the PERSIAN DISPLAY FACE — Morabba (the heading variable 250-900,
     already preloaded) carries «۲۰:۰۰» exactly the way it carries the
     FA names above it; the DIGITS themselves arrive faNum-mapped from
     renderMCard (public-13.63.js — the 13.62 -> 13.63 rename carries
     this round) and from mcardHtml (the SSR mirror, seo/markup.ts), so
     the no-JS paint and every re-render (carousel slide, language
     toggle, poll refresh) agree; EN keeps the Latin Poppins/Chakra
     treatment untouched, and the mset countdown writer stays
     fmtNum-free (tabular Latin — the countdown never jitters). The
     gradient fill + stroke + glow ride any glyph; letter-spacing keeps
     the .35cqw (Persian digits never join). (0,3,1) beats the base
     (0,2,0) exactly like the FA name/date overrides in
     public-13.76.css. */
html[lang="fa"] .hero-mcard .mc-ko{font-family:Morabba,Peyda,'Segoe UI',Tahoma,sans-serif;font-weight:800}
/* v13.242-faglow (S31, owner: "Make the countdown timer in both mobile
     and desktop, for farsi language, farsi numerals (mobile is latin
     numbers now)"): the mobile card's three countdown pockets join the
     FA presentation — the digits arrive faNum-mapped from mset (the
     public-13.73.js -> 13.74.js rename: mset REGAINS fmtNum, so FA
     renders «۰۹» exactly like the desktop hcD/hcH/hcM trio while EN
     keeps the Latin tabular Poppins/Chakra) and from the SSR mirror
     (seo/router.ts — mcD/mcH/mcM now pass through toFaDigits the same
     way hcD/hcH/hcM always did, so the no-JS paint and every re-render
     agree), and this FA font override swaps the techno faces for the
     SAME Persian display face the kickoff already rides (Morabba 800,
     the preloaded heading variable). The pockets change at most once a
     minute (no seconds tile), so the non-tabular glyph widths never
     jitter a ticking readout; EN is untouched. (0,3,1) beats the base
     (0,2,0) exactly like the mc-ko override above. */
html[lang="fa"] .hero-mcard .mc-num{font-family:Morabba,Peyda,'Segoe UI',Tahoma,sans-serif;font-weight:800}
/* v13.179-mcsilo (owner: the "More games" scroll cue — "animate the
     button with a vertical bounce loop ... small amplitude, suggested:
     ~6-8px"): the bob amplitude rides the owner's 6-8px band — this
     LATER same-name @keyframes declaration overrides the pinned
     public-13.71.css 5px version (the cascade takes the last-defined
     keyframes; the css71 file itself stays byte-frozen). The pill keeps
     its 2.6s ease-in-out infinite cadence, its ~45px height (>= the 44px
     touch-target floor), the prefers-reduced-motion parking (css71) and
     the smooth-scroll interception (public-13.53.js). */
@keyframes mc-hint-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(7px)}}
/* ==========================================================================
   v13.241-mobilecta (S30 — the owner's four-change mobile round). Every
   rule here is scoped to the site's ONE phone breakpoint max-width:600px
   (the same line #joinSticky/#tgFab/#promoStrip-phones already use); the
   601-899px tablet zone and the >=901px desktop are untouched.
   (1) THE LALIGA LOCKUP MOVES ONTO THE CARD TAB — .mc-pl drops from its
       top-of-hero float (top:6.7%) onto the raised centre tab of the HUD
       frame: bottom edge at 58.2% from the card bottom (= 41.8% from the
       top), INSIDE the tab band (the panel's tab spans 38.5-42.7%H in
       the 100x177.778 viewBox: flat top y=68.4, baseline y=75.9), safely
       above the card's continuous top border line (42.7%H) and never
       touching it; width clamp(56px,16vw,84px), height auto (each
       league's natural lockup aspect). The slot stays inside #mcardSpot
       (z5) — above the players (z2) and the panel (z3) at every width;
       a soft DARK drop-shadow replaces the cyan glow so the white mark
       reads over the red/blue jerseys behind the tab. Desktop keeps the
       .league-logo in the PC hero grid (untouched); 601-899px keeps the
       old top float (this block's media scope).
   (2) THE PLAYERS SHRINK + SHIFT — img height 116 -> 109cqw (~6%
       smaller) with the OUTER bottom corner as the origin: contain +
       object-position outer-bottom keeps each lane's outer-bottom corner
       FIXED, so the outer edge stays at the viewport edge while the
       inner edge pulls away from the centre; then each lane hangs
       3.5cqw (2cqw further out, inside the owner's <=3% band) past its
       own PHYSICAL outer card edge — home left / away right, no logical
       properties (the artwork never mirrors in RTL; the v13.238 law).
       The outer hand stays visible AT the screen edge (the crop grows
       ~6px at 390px; the wedge + arm remain), the two faces gain a
       clear centred gap, and the stacking order (away over home at the
       shared z2) is untouched. No fade anywhere (the v13.238 no-mask
       round); .herowrap keeps clipping horizontal overflow (<=899px).
   (3) THE MOBILE HEADER ICON — #tgHead (markup: the topbar .tb-btns
       row): the Telegram paper-plane in the site's cyan #17CDF0, same
       44x44 round style as the EN button, shown ONLY at <=600px (base
       display:none). RTL geometry: .tb-btns sits at the screen's left
       end; DOM-before-#lbtn places the icon visually to the EN button's
       RIGHT — the side facing the centre of the screen.
   (4) THE FLOATING BAR — #tgPillBox (markup: end of body): ONE link
       (the whole bar body is the tap target) + the blue 58px Telegram
       mark-link #tgPillGo riding ON the grass at the inline end
       (v13.244-grasspill: it REPLACES the old x close — the pill
       carries no dismiss; the bar body and the mark both open the
       channel; v13.246-fullbar: the S34 arrow between them RETIRES
       and the mark leaves the flex row for position:absolute — no
       transparent seam at the screen edge). The surface is the
       owner's grass photograph melted over the grass-green gradient
       (the v13.244 rule block below carries the full law). z58:
       above page content, below the tz panel overlay (z60).
       v13.246-fullbar (S35, owner: "make the sticky area full
       width"): the box drops the 12px float gutters — bottom:0 +
       inset-inline:0, an edge-to-edge bar with 16px top corners and
       square bottom corners flush at the screen edge, the height
       growing to calc(74px + env(safe-area-inset-bottom,0px)) so
       the grass itself fills the iPhone home-indicator strip (the
       head viewport meta carries viewport-fit=cover so the inset
       resolves; the v13.242 compact collapse stays retired with
       S33: the heading + rotating sub-headline lockup IS the bar).
       The controller script (end of body) drives
       show/hide/pulse/rotation/memory.
   While the bar is visible, body.tg-pill-on pads the page bottom
   (the fixed bar height + safe-area — the bar never covers the last
   content/footer) and lifts #backTop above the bar band (the round
   button and the bar share the bottom strip; without the lift the
   z65 button paints over the bar's inline-end at every phone width —
   measured overlap; the lift keeps BOTH usable). */
/* (3) the header icon — v13.242-faglow (S31, owner: "divide EN with
   Telegram icon in mobile. Instead use a real telegram Icon."): the
   icon LEAVES the .tb-btns glass pill and becomes its OWN standalone
   round button — a hard visual divide between the EN language control
   and the channel icon (the two were twins inside one pill and read as
   one merged control). It rides .head-actions (DOM-before the pill, so
   the RTL row keeps it on the pill's centre-facing side) with its own
   8px margin + the flex gap = the division; its chrome mirrors the
   pill's own glass law (rgba(1,13,35,.6) + the white .16 border + the
   backdrop blur, set in the <=600px rule below — the base stays a bare
   transparent 44x44 hit area). The GLYPH is the REAL Telegram mark —
   the circled plane (the #joinSticky/#tgFab logo path) in the site's
   cyan #17CDF0 — replacing the bare paper-plane. Desktop keeps
   display:none (the base rule); the href still renders from the ONE
   shared TG_CHANNEL_URL constant. */
#tgHead{display:none;box-sizing:border-box;flex:0 0 auto;width:44px;height:44px;min-width:44px;min-height:44px;padding:0;border-radius:999px;background:transparent;border:none;color:#17CDF0;text-decoration:none;cursor:pointer;font-family:inherit;transition:background .2s ease,color .2s ease}
#tgHead svg{display:block}
#tgHead:hover{background:rgba(0,211,255,.14);color:#1FFFFF}
#tgHead:active{transform:scale(.94)}
#tgHead:focus-visible{outline:2px solid #1FFFFF;outline-offset:1px}
@media (max-width:600px){
/* (1) the lockup rests on the tab */
.hero-mcard .mc-pl{top:auto;bottom:58.2%;width:clamp(56px,16vw,84px);height:auto;transform:translateX(-50%);filter:drop-shadow(0 2px 6px rgba(2,10,25,.62))}
.hero-mcard .mc-pl img{height:auto}
/* (2) the players: ~6% smaller + 2cqw further out, outer-bottom origin.
   v13.242-faglow (S31, owner: "slighltly the player's jersey bottom and
   edges are out of the HUD, (in mobile) ... or better yet, fade it
   smoothly (the bottom part of jersey.)"): THE FLANK DISSOLVE — a
   bottom-anchored mask on the ONE shared img rule melts each figure's
   lower torso into the HUD zone instead of the hard mid-air cut the
   flanks ended with beside the panel's side edges: fully transparent
   at the img's own bottom edge, ~55% at 9% up, fully opaque again by
   21% up (the band starts BELOW the panel's top border, so only the
   jersey bits that poke out PAST the panel's side edges dissolve — the
   faces, the shoulders beside the tab and both hands keep the v13.238
   fully-opaque contract). Phones only (<=600px); the 601-899px tablet
   zone and the desktop keep the crisp cut. -webkit- prefix first, the
   standard property after.
   v13.243-langflag (S32, owner: "add more fade strength on bottom of
   jersey's"): the dissolve DEEPENS — fully transparent to ~3% up, ~30%
   at 18%, ~75% at 30% and fully opaque only by 42% up (was ~55% at 9% /
   opaque at 21%): the melt band grows ~2x taller on a much softer
   curve, so every bit that pokes past the panel's side edges now melts
   away well before the cut line instead of ending in a visible hard
   step; the crowns, faces, shoulders, the chest numbers and both hands
   stay fully opaque (the opaque zone starts at 42% of the 109cqw
   column, above the chest — only the lower torso and shorts ride the
   gradient; pixel-diff-verified the melt lands on the visible flank
   strip beside the panel bevel, the covered bits are unchanged). */
.hero-mcard .mc-ports .mc-port.mc-port-h{left:-3.5cqw}
.hero-mcard .mc-ports .mc-port.mc-port-a{left:auto;right:-3.5cqw}
.hero-mcard .mc-ports .mc-port img{height:109cqw;-webkit-mask-image:linear-gradient(to top,transparent 0,rgba(0,0,0,.3) 18%,rgba(0,0,0,.75) 30%,#000 42%);mask-image:linear-gradient(to top,transparent 0,rgba(0,0,0,.3) 18%,rgba(0,0,0,.75) 30%,#000 42%)}
/* (3) the header icon joins the phone header as its OWN glass island
   (AFTER the base rule — the same-specificity cascade needs the media
   rule later); the 8px margin + the .head-actions gap draw the divide
   the owner asked for between the icon and the EN pill */
#tgHead{display:inline-flex;align-items:center;justify-content:center;margin-inline-end:8px;background:rgba(1,13,35,.6);border:1px solid rgba(255,255,255,.16);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:0 0 16px rgba(23,205,240,.25)}
/* (4) v13.243-langflag (S32, owner: "add a british Flag, next to EN and
   Iran flag next to FA"): the language pill grows its TARGET-language
   flag. ZERO bundle edits: #lbtn's label is core JS's textContent (EN
   while the site is FA / «فا» while the site is EN) and a ::before
   pseudo-element SURVIVES every textContent write; html[lang] —
   applyLang's own attribute — drives WHICH flag rides: html[lang="fa"]
   -> the Union Jack beside "EN", html[lang="en"] -> the Iran tricolor
   beside «فا». The fixed 44px box widens to fit the pair (width:auto;
   the min-width keeps the pre-JS empty-boot floor at the touch-target
   size); both flags are inline base64 SVGs (crisp at every DPR, zero
   network requests); the hairline white keyline reads on the glass.
   Phones only (<=600px) — the desktop header stays byte-identical per
   the standing desktop-freeze law. */
#lbtn{width:auto;min-width:44px;padding:4px 10px;gap:5px}
#lbtn::before{content:"";flex:0 0 auto;width:21px;height:12px;border-radius:2px;background-repeat:no-repeat;background-position:center;background-size:100% 100%;box-shadow:0 0 0 1px rgba(255,255,255,.28)}
html[lang="fa"] #lbtn::before{background-image:url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCAzMCI+PGNsaXBQYXRoIGlkPSJ4Ij48cGF0aCBkPSJNMCAwTDYwIDMwTTYwIDBMMCAzMCIvPjwvY2xpcFBhdGg+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjMDAyNDdkIi8+PHBhdGggZD0iTTAgMEw2MCAzME02MCAwTDAgMzAiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSI2Ii8+PHBhdGggZD0iTTAgMEw2MCAzME02MCAwTDAgMzAiIGNsaXAtcGF0aD0idXJsKCN4KSIgc3Ryb2tlPSIjY2YxNDJiIiBzdHJva2Utd2lkdGg9IjQiLz48cGF0aCBkPSJNMzAgMFYzME0wIDE1SDYwIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMTAiLz48cGF0aCBkPSJNMzAgMFYzME0wIDE1SDYwIiBzdHJva2U9IiNjZjE0MmIiIHN0cm9rZS13aWR0aD0iNiIvPjwvc3ZnPg==")}
html[lang="en"] #lbtn::before{background-image:url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MyAzNiI+PHJlY3Qgd2lkdGg9IjYzIiBoZWlnaHQ9IjM2IiBmaWxsPSIjZmZmIi8+PHJlY3Qgd2lkdGg9IjYzIiBoZWlnaHQ9IjEyIiBmaWxsPSIjMjM5ZjQwIi8+PHJlY3QgeT0iMjQiIHdpZHRoPSI2MyIgaGVpZ2h0PSIxMiIgZmlsbD0iI2RhMDAwMCIvPjxwYXRoIGZpbGw9IiNkYTAwMDAiIGQ9Ik0zMS41IDExLjhjLTIuNyAyLjEtNC4yIDMuOS00LjIgNS45IDAgMS4zLjYgMi40IDEuNiAzLjEtLjQtLjYtLjctMS40LS43LTIuMSAwLTEuMy43LTIuNSAxLjYtMy40LS4yIDEuOC4zIDMuMyAxLcgNC45IDEuNC0xLjYgMS45LTMuMSAxLjctNC45LjkuOSAxLjYgMi4xIDEuNiAzLjQgMCAuNy0uMyAxLjUtLjcgMi4xIDEtLjcgMS42LTEuOCAxLjYtMy4xIDAtMi0xLjUtMy44LTQuMi01Ljl6Ii8+PC9zdmc+")}
}
/* (4) the floating pill — hidden state: translated below the screen,
   opacity 0, visibility hidden (+ the inert attribute from the
   controller), so it can never be focused or tapped while hidden */
#tgPillBox{position:fixed;bottom:0;inset-inline:0;z-index:58;transform:translateY(calc(100% + 8px));opacity:0;visibility:hidden;pointer-events:none;transition:transform .35s cubic-bezier(.16,1,.3,1),opacity .35s ease-out,visibility 0s linear .35s}
#tgPillBox.show{transform:none;opacity:1;visibility:visible;pointer-events:auto;transition:transform .35s cubic-bezier(.16,1,.3,1),opacity .35s ease-out}
@media (min-width:601px){#tgPillBox{display:none!important}}
/* v13.244-grasspill (S33, owner: "Use this for background of sticky
   bottom, add some fading to it (around it)" + "i want heading and
   sub heading ... sub heading (changing) with some effects"): the
   pill's surface becomes the owner's own grass photograph —
   /bg-sticky-bottom-mobile-grass.jpg (500x176, served from assets/)
   — floating over the v13.242 grass-green gradient and MELTED into
   it so no hard photo edge ever shows: .tgp-bg (the photo,
   cover-cropped, opacity .62) rides under .tgp-fade (a radial
   vignette that dissolves the photo's side/corner edges into the
   deep green + a top/bottom wash in the surface's OWN two greens +
   a flat dark scrim that keeps both text lines >=4.5:1 over the
   blades). Every layer carries border-radius:inherit, so the
   capsule clips them all while overflow stays VISIBLE — the ::after
   glow keeps breathing OUTSIDE the surface (inset:-5px). THE TEXT
   LOCKUP: .tgp-head (v13.246-fullbar: the owner's REWORDED sentence
   «با عضویت در کانال، بازی مهم بعدی رو از دست نده!», 14px/800 white,
   wrapped to at most TWO lines by the -webkit-line-clamp box — the
   old one-line 15.5px nowrap/ellipsis law could never carry the
   longer wording) over .tgp-sub (the FIVE
   owner-worded lines rotating every 3.2s — the controller script at
   the end of body; fade+rise+de-blur entrance, .tgp-in). The
   v13.242 compact/collapse state RETIRES: the two-line lockup IS
   the bar (74px + the safe-area strip, always); the first-show
   double pulse (grass-green then; cyan-blue since v13.247), then the
   standing breathe, remain. */
#tgPill{position:relative;isolation:isolate;display:flex;align-items:center;justify-content:flex-start;gap:12px;height:calc(74px + env(safe-area-inset-bottom,0px));padding:0 16px;padding-inline-end:84px;border-radius:16px 16px 0 0;background:linear-gradient(180deg,#1f9d58 0%,#115c33 100%);border:1.5px solid rgba(74,222,128,.65);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 8px 26px -6px rgba(2,44,66,.8),0 12px 34px rgba(1,8,20,.55),0 0 34px rgba(34,211,238,.55),0 0 10px rgba(103,232,249,.4);color:#FFFFFF;text-decoration:none;font-family:var(--font-body)}
#tgPill .tgp-bg{position:absolute;inset:0;border-radius:inherit;background:#115c33 url("/bg-sticky-bottom-mobile-grass.jpg") center/cover no-repeat;opacity:.62;pointer-events:none}
#tgPill .tgp-fade{position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:radial-gradient(ellipse farthest-side at 50% 50%,rgba(9,64,33,0) 42%,rgba(9,64,33,.55) 80%,rgba(6,44,24,.95) 100%),linear-gradient(180deg,rgba(31,157,88,.92) 0%,rgba(31,157,88,0) 30%,rgba(8,52,28,0) 55%,rgba(6,40,22,.88) 100%),linear-gradient(180deg,rgba(6,44,24,.16) 0%,rgba(6,44,24,.3) 100%)}
#tgPill .tgp-txt{position:relative;min-width:0;display:flex;flex-direction:column;gap:3px}
#tgPill .tgp-head{font-size:14px;font-weight:800;line-height:1.5;color:#FFFFFF;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;text-shadow:0 1px 3px rgba(3,32,16,.6)}
#tgPill .tgp-sub{min-width:0;font-size:12.5px;font-weight:500;line-height:1.45;color:rgba(224,255,238,.96);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 2px rgba(3,32,16,.55)}
#tgPill .tgp-sub.tgp-in{animation:tgpSubIn .55s cubic-bezier(.16,1,.3,1) both}
@keyframes tgpSubIn{from{opacity:0;transform:translateY(9px);filter:blur(3px)}to{opacity:1;transform:none;filter:none}}
/* the glow pulse — a ::after carrying a STATIC box-shadow; ONLY opacity
   and transform animate (box-shadow never repaints frame-by-frame on
   weak phones); 2 iterations x 1.2s, played once per page view.
   v13.247-cyanglow (S36, owner: "Make the surrounding glow, Cyan-Blueish,
   so it doesnt mixed up with website's bg, it's currectly green.
   (just glow)"): the halo LEAVES the grass-green family — every OUTER
   glow layer re-hues to the CYAN-BLUE family: the standing 0 0 34px
   halo (was the grass-green rgba(34,197,…)) -> rgba(34,211,238,.55)
   (cyan #22D3EE), the 0 0 10px close glow (was the emerald
   rgba(52,211,…)) -> rgba(103,232,249,.4) (pale cyan-300), the
   breathing ::after cast (was the same emerald) -> rgba(34,211,238,.7)
   and its mint inner ring -> the icy rgb(165,243,252) twin, and the
   dark under-shadow (was the deep grass tone) -> the deep blue-teal
   rgb(2,44,66) — so the bar reads against the dark navy page instead
   of melting into the grass.
   NOTHING ELSE changes (the "just glow" scope): the green surface
   gradient, the grass photo, the green border, every alpha, blur
   radius, offset and the animation timing stay byte-identical, and the
   promo strip's own green accents + the blue mark's Telegram-blue glow
   are untouched. v13.244: the S31 breathe moves onto the BASE ::after
   (the compact state is gone) — it takes over the moment the first-show
   pulse hands the surface back */
#tgPill::after{content:"";position:absolute;inset:-5px;border-radius:16px 16px 0 0;pointer-events:none;opacity:0;box-shadow:0 0 34px 7px rgba(34,211,238,.7),inset 0 0 0 1.5px rgba(165,243,252,.55);transform:scale(.985);animation:tgpBreathe 3.2s ease-in-out .8s infinite}
#tgPill.pulse::after{animation:tgpGlow 1.2s ease-in-out 2}
@keyframes tgpGlow{0%{opacity:0;transform:scale(.985)}45%{opacity:1;transform:scale(1.02)}100%{opacity:0;transform:scale(1)}}
@keyframes tgpBreathe{0%,100%{opacity:.12;transform:scale(.99)}50%{opacity:.62;transform:scale(1.008)}}
/* v13.244-grasspill (S33, owner: "instead of current close button,
   replace it with telegram icon (Blue) with some glowing around it"):
   the x close RETIRES — the official circled Telegram mark (the
   #tgHead logo path) on the Telegram brand-blue capsule takes its
   place, with its OWN standing sky-blue glow ring (::after carries
   the STATIC box-shadow; ONLY opacity+transform animate — the
   v13.242 law). Tapping it opens the channel exactly like the bar
   body and starts the same 30-day joined silence — the pill carries
   NO dismiss anymore (the owner's one-control direction;
   docs/adr/ADR-007-pill-no-dismiss.md). v13.246-fullbar (S35): the
   mark leaves the flex row (the S34 arrow that rode between them is
   RETIRED) for position:absolute INSIDE the box — inset-inline-end
   12px, bottom calc(10px + safe-area/2) keeps it centred on the
   bar's 74px content zone at every inset, z-index:2 above the
   isolated surface — so the grass runs edge-to-edge UNDER it with
   no transparent seam at the screen edge (the .tgp-txt lane is
   reserved by the body's padding-inline-end:84px). */
#tgPillGo{position:absolute;inset-inline-end:12px;bottom:calc(10px + env(safe-area-inset-bottom,0px)/2);z-index:2;box-sizing:border-box;width:58px;height:58px;min-width:58px;min-height:58px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#2AABEE 0%,#1E96D3 100%);border:1.5px solid rgba(255,255,255,.55);color:#FFFFFF;text-decoration:none;cursor:pointer;font-family:inherit;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 6px 18px rgba(1,8,20,.5),0 0 16px rgba(42,171,238,.5);transition:transform .2s ease,filter .2s ease}
#tgPillGo svg{width:34px;height:34px;display:block;filter:drop-shadow(0 1px 2px rgba(1,32,54,.4))}
#tgPillGo:hover{filter:brightness(1.08)}
#tgPillGo:active{transform:scale(.94)}
#tgPillGo:focus-visible{outline:2px solid #1FFFFF;outline-offset:2px}
#tgPillGo::after{content:"";position:absolute;inset:-4px;border-radius:999px;pointer-events:none;opacity:0;box-shadow:0 0 22px 6px rgba(42,171,238,.75);transform:scale(.96);animation:tgpGoPulse 2.6s ease-in-out 1.2s infinite}
@keyframes tgpGoPulse{0%,100%{opacity:0;transform:scale(.96)}45%{opacity:.9;transform:scale(1.05)}}
/* v13.246-fullbar (S35, owner: "Remove the arrow animated"): the S34
   .tgp-arrow — its markup, flex-child CSS, dir mirror, nudge
   keyframes and the reduced-motion kill — is RETIRED outright; the
   bar body and the blue mark are the box's only children again. */
/* page spacing while the bar is visible (phones only): the fixed
   full-width bar (74px body + 3px of border + the safe-area inset
   the grass itself fills), so the bar never covers the last content
   or the footer; #backTop lifts above the bar band */
@media (max-width:600px){
body.tg-pill-on{padding-bottom:calc(78px + env(safe-area-inset-bottom,0px))}
body.tg-pill-on #backTop{bottom:calc(90px + env(safe-area-inset-bottom,0px))}
}
/* reduced motion: no slide, no pulse, no breathe, no rotation entrance
   — a plain fade-in; the sub-headline still changes, instantly (the
   controller skips the .tgp-in class under rm) */
@media (prefers-reduced-motion:reduce){
#tgPillBox{transform:none!important;transition:opacity .3s ease!important}
#tgPill::after{animation:none!important}
#tgPill .tgp-sub{animation:none!important}
#tgPillGo::after{animation:none!important}
}</style>
<style>/* v13.237-promobar (the S26 owner direction: «I only wanted to
     change the top bar of the site… You were only supposed to build
     that top part» — the S25 landing-page detour is ROLLED BACK at the
     account level (sportsignal.ir is ucl-notifier's Custom Domain
     again; the sportsignal-site zone routes + the apex AAAA are
     deleted) and the approved banner design rides THE ORIGINAL PAGE.
     THE DESIGN — a static message pair + two CTAs: .ps-q the question
     (13px, 400, muted emerald rgba(209,250,229,.6)) → .ps-h the
     headline (17px, 800, white) → .ps-ch the channel pill (natural
     football-grass green linear-gradient(180deg,#1f9d58,#146c3c) +
     the inset top light + the 5.5s ::after sweep — the subtle green
     reflection, compositor-only) → .ps-bot the bot pill
     (rgba(8,15,24,.85) + the icy-blue rgba(125,211,252,.45) border —
     clearly secondary, independently clickable). THE RTL LAW: the
     document is dir=rtl, so the DOM order IS the visual order
     (question rightmost, bot pill leftmost) — NO row-reverse, no
     double inversion; the question+headline ride one .ps-msg flex
     group so a wrap keeps them adjacent ABOVE the CTAs. The bar:
     #04140c near-black green + a 1px rgba(52,211,153,.15) bottom
     edge. GEOMETRY UNCHANGED: after the skip link, before #topbar,
     the -24px/-16px full bleed, z-30. THE LANGUAGE LAW: .ps-fa/.ps-en
     ride every text; applyLang() flips html[lang] (zero bundle edits).
     MOBILE (<=600px): tighter strip; the bot pill retires (#joinSticky
     owns the mobile bot CTA — one primary action per strip, the
     site's standing law); the channel pill grows to the 44px
     touch-target floor. REDUCED MOTION: the sweep parks (the
     bundle's global *{animation:none!important} kill is honored).
     RETIRED WITH THIS RELEASE: the v13.236 rotator (.ps-rot/.ps-fr/
     @keyframes ps-rot), the pure-CSS signal mark (.ps-mark/.ps-ring/
     @keyframes ps-ping/ps-float), the 44px dismiss (#psClose) and the
     7-day ps_hide memory — the approved design carries no close
     button. */
#promoStrip{position:relative;z-index:30;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px 20px;width:100%;box-sizing:border-box;margin:-24px 0 0;padding:8px 16px;background:#04140c;border-bottom:1px solid rgba(52,211,153,.15)}
.ps-msg{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:2px 14px;min-width:0;max-width:100%}
.ps-q{margin:0;font-size:13px;font-weight:400;color:rgba(209,250,229,.6);letter-spacing:.01em}
.ps-h{margin:0;font-size:17px;font-weight:800;color:#fff;letter-spacing:.005em}
.ps-ctas{display:flex;align-items:center;gap:10px;flex:0 0 auto}
.ps-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 16px;border-radius:8px;font-size:12.5px;font-weight:700;text-decoration:none;font-family:inherit;cursor:pointer;transition:filter .25s ease,box-shadow .25s ease,border-color .25s ease,background-color .25s ease,transform .25s ease}
.ps-btn svg{flex:0 0 auto}
.ps-btn:active{transform:translateY(1px)}
.ps-btn:focus-visible{outline:2px solid #1FFFFF;outline-offset:2px}
.ps-ch{position:relative;isolation:isolate;overflow:hidden;color:#fff;background:linear-gradient(180deg,#1f9d58 0%,#146c3c 100%);border:1px solid rgba(74,222,128,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 6px 18px -6px rgba(21,128,61,.55)}
.ps-ch::after{content:"";position:absolute;inset:-20% -10%;z-index:-1;background:linear-gradient(105deg,transparent 42%,rgba(209,250,229,.28) 50%,transparent 58%);transform:translateX(-160%);animation:ps-sweep 5.5s ease-in-out infinite;pointer-events:none}
@keyframes ps-sweep{0%,55%{transform:translateX(-160%)}85%,100%{transform:translateX(160%)}}
.ps-ch:hover{filter:brightness(1.08);box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 8px 22px -6px rgba(21,128,61,.65)}
.ps-bot{color:#e0f2fe;background:rgba(8,15,24,.85);border:1px solid rgba(125,211,252,.45);box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
.ps-bot svg{color:rgba(125,211,252,.9)}
.ps-bot:hover{border-color:rgba(125,211,252,.8);background:rgba(12,24,38,.9);box-shadow:0 0 0 1px rgba(125,211,252,.15)}
/* the language toggle contract: applyLang() sets html[lang]; both texts
   ride every element, exactly one is ever visible */
html[lang="fa"] .ps-en{display:none}
html[lang="en"] .ps-fa{display:none}
/* phones: tighter strip; the bot pill retires (#joinSticky owns the
   mobile bot CTA — one primary action per strip); the channel pill
   grows to the 44px touch-target floor */
@media (max-width:600px){
#promoStrip{margin-top:-16px;gap:4px 10px;padding:6px 10px}
.ps-msg{gap:1px 8px}
.ps-q{font-size:11.5px}
.ps-h{font-size:14px}
.ps-ctas{gap:8px}
.ps-btn{height:44px;padding:0 14px;font-size:12px}
.ps-bot{display:none}
}
/* reduced motion: the sweep parks where the global kill froze it */
@media (prefers-reduced-motion:reduce){
.ps-ch::after{animation:none}
}
/* v13.241-mobilecta (S30): phones retire the strip — display:none at the
   site's ONE mobile line (max-width:600px, the same breakpoint
   #joinSticky/#tgFab already use). The markup and every >=601px rule
   stay untouched. Nothing depends on the strip's height: it rides the
   normal flow between the skip link and the header, and the hero's
   -100px pull is relative to the header's own bottom — so when the
   strip's box disappears, the header AND the hero island move up
   together and the card/header geometry is byte-identical (measured:
   no empty gap at the page top; the scene pulls up behind the
   transparent header exactly as pre-v13.235). The phone channel CTA
   moves into the header icon (#tgHead, styled in the block above) and
   the floating pill (#tgPillBox, end of body). */
@media (max-width:600px){#promoStrip{display:none}}
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
<!-- v13.209-a11y (F-L3, WCAG 2.4.1/2.4.3): the skip link is the FIRST
     focusable element in the DOM \u2014 it rode AFTER the topbar since v12.24,
     making it the 3rd tab stop (brand \u2192 lang button \u2192 skip) at phone
     widths where the nav is display:none and #sbtn hides. A bypass that
     keyboard users must tab INTO the header to reach is not a bypass;
     moving it before <header> restores the WCAG 2.4.3 expected order
     without touching the visual (it stays off-canvas until :focus). -->
<a class="skip-link" href="#main">پرش به محتوا</a>
<!-- v13.237-promobar (owner): the approved top-bar design replaces the
     v13.236 rotator — a static message pair + two CTAs (the style block
     above carries the full design law). Rides AFTER the skip link (the
     v13.209-a11y first-focusable contract) and BEFORE <header> at full
     bleed, same as every strip since v13.235. The DOM order IS the
     visual RTL order — question → headline → channel CTA → bot CTA
     (no row-reverse; html[dir=rtl] does the work). No dismiss, no
     signal mark, no rotator, no inline script — pure static markup,
     zero JS, zero requests, zero API calls. -->
<div id="promoStrip" role="region" aria-label="پیشنهاد عضویت در کانال تلگرام اسپورت‌سیگنال">
<div class="ps-msg">
<p class="ps-q"><span class="ps-fa" dir="rtl">می‌خوای از زمان مهم‌ترین بازی‌ها مطلع باشی؟</span><span class="ps-en" dir="ltr">Want to know when the biggest matches kick off?</span></p>
<p class="ps-h"><span class="ps-fa" dir="rtl">با عضویت در کانال، بازی مهم بعدی رو از دست نده!</span><span class="ps-en" dir="ltr">Join the channel and never miss the next big match!</span></p>
</div>
<div class="ps-ctas">
<a class="ps-btn ps-ch" href="${TG_CHANNEL_URL}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M9.04 15.51l-.38 5.32c.54 0 .78-.23 1.06-.5l2.55-2.44 5.28 3.87c.97.53 1.66.25 1.92-.9L23.9 4.6c.31-1.42-.51-1.98-1.46-1.63L1.4 10.86c-1.39.54-1.37 1.32-.24 1.67l5.35 1.67L19.36 6.6c.57-.38 1.09-.17.66.21L9.04 15.51z"/></svg><span class="ps-fa">عضو کانالمون شو</span><span class="ps-en">Join our channel</span></a>
<a class="ps-btn ps-bot" href="https://t.me/SportSignalAlertsBot" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M9.04 15.51l-.38 5.32c.54 0 .78-.23 1.06-.5l2.55-2.44 5.28 3.87c.97.53 1.66.25 1.92-.9L23.9 4.6c.31-1.42-.51-1.98-1.46-1.63L1.4 10.86c-1.39.54-1.37 1.32-.24 1.67l5.35 1.67L19.36 6.6c.57-.38 1.09-.17.66.21L9.04 15.51z"/></svg><span class="ps-fa">ربات هوشمند</span><span class="ps-en">Smart bot</span></a>
</div>
</div>
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
<div class="head-actions"><!-- v13.242-faglow (S31): the phone-only Telegram CHANNEL icon — now a
     STANDALONE button DIVIDED from the EN language pill (the owner's
     "divide EN with Telegram icon in mobile"): it sits OUTSIDE .tb-btns
     as .head-actions' first child, so the RTL row keeps it on the pill's
     centre-facing side with a hard 14px gap (its own 8px margin + the
     flex gap) and its own glass circle (the <=600px rule in the inline
     style). The glyph is the REAL Telegram mark — the circled plane, the
     same path #joinSticky/#tgFab carry — in the site's cyan #17CDF0,
     replacing the bare paper-plane. v13.243-langflag (S32, owner:
     "make the telegram logo in header 50% bigger"): the glyph grows
     21 -> 32px (+52%) — still comfortably inside the 44px glass circle
     (6px clear ring all around). At >=601px it is display:none and
     the header is exactly as before. The href renders from the ONE
     shared TG_CHANNEL_URL constant; new tab + noopener noreferrer; the
     accessible name stays the owner's exact «عضویت در کانال تلگرام». --><a id="tgHead" href="${TG_CHANNEL_URL}" target="_blank" rel="noopener noreferrer" aria-label="عضویت در کانال تلگرام"><svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true"><path fill="currentColor" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg></a><span class="tb-btns"><button id="sbtn" onclick="toggleTz()" aria-expanded="false" aria-controls="tzpanel" title="منطقه زمانی" aria-label="منطقه زمانی"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg></button><button id="lbtn" onclick="switchLang()"></button><!-- v13.134-typelight: the dark/light toggle is TEMPORARILY RETIRED (owner directive — the app is always dark). toggleTheme()/setTheme() in core JS stay null-guarded; the bundle init pins setTheme("dark"). Re-add this button to re-enable. --></span></div>
<div id="tzpanel" role="group" aria-label="\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC"><div class="tz-head"><span data-i="tzTitle">\u{1F30D} \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC</span><button id="tzclose" onclick="toggleTz()" title="\u0628\u0633\u062A\u0646" aria-label="\u0628\u0633\u062A\u0646">\u2715</button></div><input id="tzfilter" type="search" placeholder="\u062C\u0633\u062A\u062C\u0648\u06CC \u06A9\u0634\u0648\u0631 \u06CC\u0627 \u0634\u0647\u0631\u2026" data-p="tzSearch" aria-label="\u062C\u0633\u062A\u062C\u0648\u06CC \u06A9\u0634\u0648\u0631 \u06CC\u0627 \u0634\u0647\u0631"><select id="tzsel" title="\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC" aria-label="\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC"></select></div>
<!-- v12.20: visible PROOF for the auto-update claim. v12.26: the sync line
     prints the TRUTHFUL absolute stamp of the last real API refresh \u2014
     \xAB\u0622\u062E\u0631\u06CC\u0646 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC: \u062C\u0645\u0639\u0647 \u06F2\u06F1:\u06F3\u06F0 \u0634\u0628\xBB (weekday + time + period word) \u2014
     rendered by renderSync()/fmtStamp() from the payload's fetchedAt. -->
</header>
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
<img class="bg-photo" src="/hero-poster.jpg" alt="" fetchpriority="high" decoding="async" referrerpolicy="no-referrer">
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
     vignette/scrim, below the card, players and header. Decorative only.
     v13.205-lcpreveal (F-H2, Phase 3): the overlay re-encodes as
     /ui/stadium-lights-2.webp (q68/aq68, 192 -> 70 KB — the ~97%
     semi-transparent soft-gradient content sets WebP's floor near 65 KB
     at visually-safe quality; VLM-reviewed clean against the original
     under the real screen-blend composite; explicit 1400×467 dimensions).
     The retired PNG stays served + pinned one SEO TTL per the retention
     rule. -->
<img class="bg-lights" src="/ui/stadium-lights-2.webp" width="1400" height="467" alt="" aria-hidden="true" decoding="async" referrerpolicy="no-referrer">
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
     live-compositing post-mortem lives in docs/SHADOW-CONSULTATION.md. -->
<div class="hero-player hero-player--cinematic player-home" aria-hidden="true"><img class="hero-cast" alt="" referrerpolicy="no-referrer"><img alt="" referrerpolicy="no-referrer"></div>
<div class="hero-player hero-player--cinematic player-away" aria-hidden="true"><img class="hero-cast" alt="" referrerpolicy="no-referrer"><img alt="" referrerpolicy="no-referrer"></div>
<!-- v13.194-herocarousel (docs/SPORTSIGNAL_HERO_CAROUSEL_SPEC.md): the hero
     becomes a ONE-MATCH-PER-SLIDE carousel. #heroCarRegion wraps the TWO
     existing card anchors (the PC card + the mobile card — the SAME two
     responsive renderings of the ACTIVE slide, never two independent
     carousels) plus the control bar; it carries the carousel region
     semantics. A plain static wrapper (no styles of its own — the cards'
     margin-top collapses through it exactly as before; every hero query in
     the client is .herowrap-descendant-scoped, unaffected). -->
<div class="hero-car-region" id="heroCarRegion" role="region" aria-roledescription="carousel" aria-label="دیدارهای ویژه">
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
<!-- v13.195-carsides: the positioning wrapper for BOTH responsive cards
     + the side arrows (position:relative — top:50% of the VISIBLE card at
     every breakpoint; the cards' margin-top still collapses through it,
     exactly as through the region). -->
<div class="hero-cards">
<a class="hero-card" id="bigHeroCard" style="display:none" href="#">
<!-- the supplied PC-Match HUD frame — absolute visual layer BEHIND all
     content (pointer-events:none, decorative only; its RGBA glow halo must
     not be clipped, so nothing here may clip the card). It rides as a
     static sibling BEFORE #heroSpot so the client-side renderHeroSpot
     rebuild (which rewrites only #heroSpot's innerHTML) never removes it.
     v13.205-lcpreveal (F-H2, Phase 3): the frame re-encodes as
     /ui/sportsignal-pc-match-hud-2.webp (q86, 122 -> 57 KB, VLM-reviewed
     pixel-aligned on the real dark-card composite; explicit 1000×406
     dimensions) AND turns loading=lazy — the PC card is display:none
     at ≤899px, so phones stop paying the 125 KB frame download entirely;
     on desktop the card is the above-fold hero, so the lazy load fires
     immediately after layout (unchanged visual timing). The retired PNG
     stays served + pinned one SEO TTL per the retention rule. -->
<img class="card-hud" src="/ui/sportsignal-pc-match-hud-2.webp" width="1000" height="406" alt="" aria-hidden="true" loading="lazy" decoding="async" referrerpolicy="no-referrer">
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
<div class="hud-cells" role="timer" dir="ltr" aria-hidden="true"><!-- v13.209-a11y (F-M3b, WCAG 2.5.3): same treatment as the mobile mc-cells \u2014 the ticking digits retire from the accessible tree; #hcSr (moved below, outside the anchor) carries the countdown. -->
<span class="count-tile"><i class="count-unit" data-i="uDay">روز</i><b class="count-num" id="hcD">__SEO_HCD__</b></span>
<span class="count-tile"><i class="count-unit" data-i="uHour">ساعت</i><b class="count-num" id="hcH">__SEO_HCH__</b></span>
<span class="count-tile"><i class="count-unit" data-i="uMin">دقیقه</i><b class="count-num" id="hcM">__SEO_HCM__</b></span>
</div>
<div class="hc-track" id="bigbarTrack" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="__SEO_HCPCT__" title="نوار پیشرفت در ۲۴ ساعت پایانی قبل از شروع بازی پر می‌شود"><div id="bigbarFill" class="bigbar-fill"></div></div>
<div id="heroSpot">__SEO_HERO__</div>
</a>
<!-- v13.209-a11y (F-M3b): #hcSr moved OUTSIDE the desktop card anchor \u2014 same tick-in-the-name problem as #mcSr; same id, same polite wiring. -->
<span id="hcSr" class="sr-only" aria-live="polite"></span>
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
     · .mc-ports — the STATIC portrait containers (home left / away
       right, full-width 104cqw lanes hung 2cqw past their own OUTER
       card edge — physical left/right, the artwork never mirrors;
       z2 above the topfade veil); v13.197-mcdesktop (owner: use the
       desktop player images on mobile too): renderMCard fills them
       with the SAME heroArtFor() HERO_ART desktop library portraits
       the PC cinematic flanks read — ONE image set on every screen
       (the MC_ART mobile cutouts + their .mc-fill mapping retire; the
       /ui/mc files stay on disk). ONE shared CSS rule fits every
       source (the inline style): width 100% of the lane, fixed 116cqw
       height (the v13.238-mchedge concept-mockup round, 1.18x — heads
       ~24%W, crowns ~1.7%H), object-fit contain, object-position
       per-side OUTER bottom — full figures, bottom-anchored deep
       behind the panel top, the outer hand cropped by the card edge,
       and NO mask fade anywhere (the v13.198 two-axis dissolve
       retired — the hands near the centre stay fully opaque). The
       .mc-clean toggle swaps in the hole-free scene-4 behind any
       real cutout (v13.180: the silhouettes are gone).
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
       line and the kickoff time. LATIN digits on the card (the owner's
       instruction 8): «سه شنبه 27 مهر» renders the Jalali
       weekday+day+month with Latin day digits, tabular-nums so the
       countdown never jitters — EXCEPT the kickoff time since
       v13.199-mcspace (owner: "make the match time written in farsi
       numerals (use farsi font)"): FA renders «۲۰:۰۰» (faNum-mapped
       digits, the Morabba face via the inline-style override) while EN
       keeps the Latin «23:00».
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
<div class="mc-cells" id="mcCells" role="timer" dir="ltr" aria-hidden="true"><!-- v13.209-a11y (F-M3b, WCAG 2.5.3): the per-second ticking digits are decorative \u2014 the polite #mcSr announcements (now OUTSIDE the anchor) carry the live countdown for assistive tech, and keeping the digits in the accessible tree made the anchor's label-content-name-mismatch unresolvable (a ticking number can never sit inside a static accessible name). -->
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
</a>
<!-- v13.209-a11y (F-M3b): #mcSr moved OUTSIDE the card anchor \u2014 the live-region text ticked every second and sat inside the link's visible-text computation, so no accessible name could ever contain it. It still announces the countdown politely (same id, same wiring). -->
<span id="mcSr" class="sr-only" aria-live="polite"></span>
<!-- v13.195-carsides (owner: "the buttons are too big, also they must
     appear at the sides of the players"): the arrows leave the bar —
     small chevron circles at the players' flanks, vertically centred on
     the VISIBLE card (the wrapper spans both responsive cards; CSS
     display:nones the inactive one, so top:50% is exact at every
     breakpoint). They sit OUTSIDE the card anchors (never a nested
     interactive inside the match link) and are PHYSICAL: #carLeft at
     the left edge, #carRight at the right; their MEANING flips with
     direction — RTL: the LEFT chevron advances (the reading direction,
     the same rule the swipe + keyboard handlers already use), so the FA
     defaults below label carLeft «مسابقه بعدی» and carRight «مسابقه
     قبلی»; LTR keeps left=previous (the controller re-labels both on
     load + every language toggle via the core-13.16.js dictionary —
     carPrev/carNext/carRegion). display:none by default; the client
     adds .on at TWO or more slides — a single hero keeps the plain card
     and a no-JS visitor never sees dead controls. -->
<button class="car-side" id="carLeft" type="button" aria-label="مسابقه بعدی" aria-controls="heroCarRegion"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m15 18-6-6 6-6"/></svg></button>
<button class="car-side" id="carRight" type="button" aria-label="مسابقه قبلی" aria-controls="heroCarRegion"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m9 18 6-6-6-6"/></svg></button>
<!-- v13.200-carsmooth (owner: "The sliding carousel of concurrent matches are not smooth I want a smooth, a little delayed and exciting sliding animation."):
     the LIGHT SWEEP overlay — one skewed cyan-white band crosses the card
     per slide change, in the direction the tape moves (the controller's
     carSheen toggles .run and sets --car-sa/--car-sb per travel side; the
     band itself is the ::after gradient in public-13.78.css). Decorative
     only: aria-hidden, pointer-transparent, z7 above the card + arrows,
     invisible at rest. The cross-slide choreography (the ghost-exit
     clones + the staggered springy enter across the five lanes) lives in
     the public-13.65.js carGhost/carEnter pair + the public-13.78.css
     keyframes. -->
<div class="car-sheen" aria-hidden="true"></div>
</div>
<!-- v13.194-herocarousel → v13.195-carsides → v13.196-carlive: the
     CONTROL BAR keeps only the dots + count — the prev/next buttons moved
     to the players' flanks (above) and the play/pause control RETIRED
     (owner: "the play button is redundant"). v13.196 (owner: "Auto slide
     is not default on make it on"): the automatic pauses are now ONLY the
     hidden tab — the hover/focus/reduced-motion gates retired with it.
     One shared controller drives BOTH card renderings (public-13.65.js
     CAR). display:none by default; the client adds .on when the active
     slate holds TWO or more slides. The count is dir="ltr" so «۲ / ۵»
     always reads current-first. #carSr is the polite announcement slot
     — the controller only writes it on USER-triggered navigation
     (autoplay stays quiet). -->
<div class="hero-car" id="heroCar">
<span id="carSr" class="sr-only" aria-live="polite"></span>
<div class="car-dots" id="carDots"></div>
<span class="car-count" id="carCount" dir="ltr"></span>
</div>
</div>
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
     rides the wrapper). Full dossier: docs/SHADOW-CONSULTATION.md. -->
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
     matches"; v13.179-mcsilo: the EN label rides the owner's exact
     "More games" wording via the DCL I18N re-assignment below) so the
     language toggle flips it with everything else.
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
<div class="foot-base"><span data-i="madeWith">\u0633\u0627\u062E\u062A\u0647\u200C\u0634\u062F\u0647 \u0628\u0627 \u2764\uFE0F</span> \u2014 <a href="/admin" data-i="adminLink">\u0648\u0631\u0648\u062F \u0645\u062F\u06CC\u0631\u06CC\u062A</a> \u2014 <a href="https://t.me/SportSignalAlertsBot" target="_blank" rel="noopener" data-i="botLink">\u0631\u0628\u0627\u062A \u062A\u0644\u06AF\u0631\u0627\u0645</a> \u2014 <a href="https://x.com/sportsignalz" target="_blank" rel="noopener">@sportsignalz</a></div>
<!-- v13.215-attribution (SS-08): the site-wide data-source attribution —
     «منبع داده: football-data.org» linked to the provider, small +
     secondary (the footer's 12px var(--footer) baseline), below the fold.
     Mirrors the pageShell footers (src/seo/page-shell.ts) so every SEO
     page type carries it. -->
<div class="src-attrib">\u0645\u0646\u0628\u0639 \u062F\u0627\u062F\u0647: <a href="https://www.football-data.org/" target="_blank" rel="noopener" style="color:inherit">football-data.org</a></div>
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
<!-- v13.241-mobilecta (S30) + v13.242-faglow (S31) + v13.244-grasspill
     (S33) + v13.246-fullbar (S35): the floating Telegram CHANNEL bar —
     phones only (the site's 600px line). THE S33 SURFACE: the owner's
     grass photograph (/bg-sticky-bottom-mobile-grass.jpg) melted over
     the grass-green gradient by the .tgp-bg/.tgp-fade layers; the fixed
     heading (v13.246: the owner's reworded sentence «با عضویت در کانال،
     بازی مهم بعدی رو از دست نده!», wrapped to two lines) over the
     FIVE-LINE ROTATING sub-headline (the controller script below
     re-reads html[lang] every tick; the static boot pair below rides
     the .ps-fa/.ps-en flip law until the first tick takes over). THE
     S35 GEOMETRY: the box is a FULL-WIDTH edge-to-edge bar (bottom:0 +
     inset-inline:0, 16px top corners, the safe-area strip filled by
     the grass itself; the S34 arrow between the body and the mark is
     RETIRED) and the blue mark rides position:absolute ON the grass at
     the inline end. THE S33 CONTROLS: ONE link (the whole bar body is
     the tap target) + the sibling BLUE Telegram mark-link #tgPillGo
     where the x close used to sit — the pill carries NO dismiss; the
     bar body and the ENLARGED mark both open the channel (each href
     renders from the ONE shared TG_CHANNEL_URL constant). Rides at
     the very end of body so the keyboard order stays natural (footer
     -> backTop -> bar). Ships inert + hidden (the controller's
     scroll-progress gate reveals it within the FIRST 20% of the page
     scroll and hides it again below it). -->
<div id="tgPillBox" inert>
<a id="tgPill" href="${TG_CHANNEL_URL}" target="_blank" rel="noopener noreferrer">
<span class="tgp-bg" aria-hidden="true"></span>
<span class="tgp-fade" aria-hidden="true"></span>
<span class="tgp-txt">
<strong class="tgp-head"><span class="ps-fa" dir="rtl">با عضویت در کانال، بازی مهم بعدی رو از دست نده!</span><span class="ps-en" dir="ltr">Join the channel and don't miss the next big match!</span></strong>
<span class="tgp-sub" id="tgpSub"><span class="ps-fa" dir="rtl">بازیهای مهم رو از دست نده</span><span class="ps-en" dir="ltr">Don't miss the big matches</span></span>
</span>
</a>
<a id="tgPillGo" href="${TG_CHANNEL_URL}" target="_blank" rel="noopener noreferrer" aria-label="عضویت در کانال تلگرام"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg></a>
</div>
<script src="/core-13.16.js" defer><\/script>
<script>var PAGE_TZ = "__PAGE_TZ__";<\/script>
<!-- v13.201-carstack: the JS rename 13.64 -> 13.65 (the stacking
     repair: carGhost strips the carried .car-in class from every ghost
     clone — a clone still wearing it played the ENTER keyframes over
     the exit; the companion CSS rename gives #heroSpot/#mcardSpot the
     explicit z-index:5 that keeps the data zone above the veil/panel/
     capsule after the fill-mode transform creates its stacking context
     — the "blank HUD + dim league logo on the second slide" fix). -->
<!-- v13.212-shamsifirst (SS-27 / CALENDAR_DISPLAY_v2): the JS rename
     13.70 -> 13.71 — fmtDate/fmtHeroDate/renderUcl's ucl-next now render
     Shamsi-first with the Gregorian date in parentheses (the FA_GREG
     site-vocabulary month map; the spotitem .kickdate drops its weekday per
     the spec's canonical D2 shape «۱۵ آبان (۵ نوامبر)»; en renders and the
     mcard's Latin-digit date line are untouched), mirroring the server's
     faDateD1/faDateD2 helpers byte-for-byte (the v13.120/v13.169 contracts). -->
<!-- v13.248-rankchip (S37): the JS rename 13.74 -> 13.75 — render() and
     spotItemNode() build their team blocks through the new teamRow()
     (rankBadge(): a number-only circular rank chip beside each team's name,
     from the payload's homeTeam.rank/awayTeam.rank resolved server-side from
     the standings caches; no rank -> the plain .team markup, byte-identical).
     The stylesheet renames in step (13.81 -> 13.82: .rankchip/.team-r). -->
<script src="/public-13.75.js" defer><\/script>
<!-- v13.202-threaddiet + v13.203-warmdefer + v13.204-foldsplit (F-M2,
     the full arc): v13.202 split the boot render chain at the fold
     (the above-fold trio updateBigBar/renderHeroSpot/fitHeroNames in
     the fetch task; the nine below-fold render groups one per idle
     slot via __belowFoldQueue/__idleSlot reading DATA; initTz at the
     head of the idle callback with the toggleTz lazy-build guard; the
     belt-and-braces carWarm on the window load event). v13.203
     reverted it on a lab measurement that was later shown
     CONTAMINATED (the runs executed while a local wrangler dev +
     browsers ate the sandbox CPU — the clean v13.203 re-measurement
     landed exactly on the v13.201 baseline, and the parallel
     close-out session's clean v13.202 runs measured bootup 0.9s ->
     0.35s / TTI 9.9s -> 7.4s with the 629ms render monolith replaced
     by interleavable <=356ms tasks). v13.204 re-applies the fold-split
     bundle byte-identical to v13.202's 13.66.js, re-verified clean.
     The poll cadence is untouched throughout. -->

<!-- v13.199-mcspace (owner: the header-space round — "a little margin
     padding (just slightly from the header)", "make the league or ucl
     logo 30% larger in mobile view", "make the match time written in
     farsi numerals (use farsi font)" + the Kane-head/logo safe-space
     note): the JS rename 13.62 -> 13.63 carries the ONE bundle edit —
     renderMCard's FA kickoff maps its digits through faNum (the en-GB
     24h SHAPE stays, the glyphs become Persian-Indic «۲۰:۰۰»; EN stays
     Latin), matching the PC pocket's fmtNum time. The margin-top
     68 -> 84px, the .mc-pl x1.3 (29.4cqw x 7%) and the FA .mc-ko
     Morabba override all ride the page inline style above (the CSS
     bundle stays byte-frozen, 13.76.css). -->
<!-- v13.197-mcdesktop (owner: use the desktop player images on mobile
     too): the JS rename 13.61 -> 13.62 carries the ONE-IMAGE-SET round —
     putPort serves the SAME heroArtFor() HERO_ART desktop library for
     BOTH cards (the MC_ART mobile-cutout priority + the .mc-fill class
     retire; the bundle's own var MC_ART default + carWarm's MC_ART/
     MC_SIDE bust warming are gone — the library portrait + baked cast +
     crest + lockup warm covers every slide). The ready-gated swap (hide
     at swap, fade in on decode) keeps the carlive contract byte-intact.
     The mobile fit rides the page's inline style (ONE shared .mc-port
     img rule); the CSS bundle is untouched (13.76.css stays). -->
<!-- v13.196-carlive: the JS rename 13.58 -> 13.61 (13.59/13.60 were
     in-field cuts) carries the owner's
     autoplay round + the warm-cache reveal fix — the 6s rotation is DEFAULT-ON for everyone (the
     hover/focus/reduced-motion pause gates retire; the hidden tab is
     the only pause left) and the slide portraits can never go stale:
     ALL slides' art warms when the slate is built (carWarm, re-run on
     slate change + once at DOMContentLoaded so the inline MC_ART -h
     busts are covered) while the portrait swap itself is ready-gated
     (heroArt's put + renderMCard's putPort hide the old bitmap at the
     swap and fade the new one in on decode — a slow network shows an
     empty lane for a beat, never the previous slide's players under
     the new names). The CSS is untouched (13.76.css stays). -->
<!-- v13.195-carsides: the JS rename 13.57 -> 13.58 carried the owner's
     arrow round (the side arrows at the players' flanks with
     direction-aware action, the play/pause control retirement, the
     direction-aware slide+fade). The CSS rename 13.75 -> 13.76 rode the
     same release — the immutable-pin rule: a same-name edit never
     reaches returning browsers. (v13.194-herocarousel: the rename
     13.56 -> 13.57 carried the hero CAROUSEL controller — the CAR
     module: active-slide state, 6s rotation, keyboard + touch, payload
     reconciliation by canonical identity, kickoff roll-off.) -->
<!-- v13.181-herokeep (owner bug: "the whole hero section opens up for a
     millisecond then it hides and compacts"): the JS rename 13.52 -> 13.53
     carries the load() DEGRADED/HERO-LESS PAYLOAD GUARD + the SSR-preserving
     catch, ON TOP of the v13.179-heroand pair rule and the v13.180-mcequal
     card (both kept byte-intact inside the bundle). Root cause (reproduced
     845px -> 28px): the client hid BOTH hero cards whenever barTarget()
     returned null — either from a 200-but-empty /api/public-matches (the
     route's degraded catch tail OR the empty-view KV payload cached 720s)
     or from the pair rule's designed "no qualifier = no hero" while the
     <=5min-old SSR mirror still painted a hero (the edge hold). The guard
     mirrors barTarget's EXACT null-ness (ok() + the AND() pair gate):
     such a payload keeps whatever is on screen (the SSR mirror on a
     first load, the last-good render once HERO_PRIMED), drops the
     skeletons and lets the 60s poll retry; the catch path also stops
     overwriting the SSR lists with errLoad boxes / hiding the
     topspot+week cards on a network blip. Same-name edits never reach
     returning browsers — hence the rename (the immutable-pin rule). -->
<script>/* v13.174-mcfix (owner): the cache-busted hero-art swap — REAL
     official portraits (Cole Palmer / Dominic Solanke — each club's own
     published hero cutoff from /players/clubs/, the same manifest provenance
     + kit verification as the PC hero) replace the reference render's
     placeholder-looking player figures, and the crest overrides move to the
     cleaned crest-2 files (the navy plate + edge speckles removed). The
     maps live in the immutable-pinned public-13.53.js (a same-name edit
     never reaches returning browsers), so this fresh server-rendered page
     re-assigns them on DOMContentLoaded — AFTER the deferred 13.53.js has
     evaluated its own var declarations, and BEFORE the payload's async
     renderHeroSpot/renderMCard reads them (the payload fetch cannot
     resolve before DOMContentLoaded fires — its response task is queued
     behind the DCL task). Re-renders (language toggle, poll refresh) read
     the already-patched maps. */
document.addEventListener("DOMContentLoaded",function(){
try{
/* v13.197-mcdesktop (owner: use the desktop player images on mobile too):
   the MC_ART re-assignment RETIRES — putPort in public-13.63.js serves
   the heroArtFor() HERO_ART desktop library for BOTH cards (the PC
   cinematic flanks and the mobile featured-match ports read ONE image
   set, fitted on mobile by the ONE shared .mc-port img rule in the
   inline style); the /ui/mc mobile cutout files + the mc-heroes registry
   + pipeline stay on disk under the immutable-pin rule (nothing is
   deleted). MC_CREST below is UNCHANGED: the cleaned crest-2 overrides
   still win over the FD crest URLs. The DCL contract itself is
   unchanged — AFTER the deferred bundle has evaluated its own var
   declarations and BEFORE the payload's async renderHeroSpot/renderMCard
   reads them (the payload fetch cannot resolve before DOMContentLoaded
   fires). Re-renders (language toggle, poll refresh) read the
   already-patched maps. HISTORY: v13.180-mcequal carried the five
   rebuilt .62-window files, v13.182-mcmirror added the mirrored bruno
   pair, v13.183-mchero + v13.184-mcbig5 grew the map to the 14-club
   canonical set. */
if(typeof MC_CREST!=="undefined")MC_CREST={"Chelsea FC":"/ui/mc/crest-chelsea-2.webp","Tottenham Hotspur FC":"/ui/mc/crest-tottenham-2.webp"};
/* v13.179-mcsilo (owner: the "More games" scroll cue — 'Show the label
   in Farsi on the Farsi version and in English on the EN version'): the
   EN label of the mcHint pill rides the owner's exact wording "More
   games" (was "More matches"). The dict lives in the immutable-pinned
   core-13.15.js, so this DCL script re-assigns the ONE entry the same
   way the maps above are re-assigned — AFTER the deferred bundle has
   evaluated (function declarations + var I18N are global) and BEFORE
   the next applyLang (language toggle / poll re-render) reads it; the
   already-painted label is refreshed in place when the current
   language is EN. The FA label «بازی‌های دیگر» keeps its own wording
   (unchanged markup default). */
if(typeof I18N!=="undefined"&&I18N&&I18N.en)I18N.en.mcHint="More games";
try{if(typeof curLang==="function"&&curLang()==="en"){var mhl=document.querySelector('#mcHint [data-i="mcHint"]');if(mhl)mhl.textContent="More games"}}catch(e){}
/* v13.197-mcdesktop: the framing classifier RETIRES (no .mc-pre windows,
   no .mc-fit-w contain band, no per-file --mcfade stops, no MC_SIDE
   home/away variant swap — the ONE shared .mc-port img rule in the
   inline style fits every desktop source, cover + center bottom + the
   two-axis fade, no measurement, no per-file classes). The scan keeps
   its ONE remaining job (v13.180): the .mc-clean scene toggle — ANY
   port carrying an <img> swaps the scene to the hole-free scene-4 (the
   silhouettes hide ONLY behind real cutouts); a card with no portraits
   at all keeps scene-2's ghost figures as the placeholder fallback. A
   MutationObserver per port re-runs the scan on every re-render
   (renderMCard wipes innerHTML and rebuilds, firing childList each time
   — including onerror removals). */
var mcFitScan=function(){
var mc=document.getElementById("heroMCard");
if(mc){if(mc.querySelectorAll(".mc-ports .mc-port img").length>0)mc.classList.add("mc-clean");else mc.classList.remove("mc-clean")}
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
<!-- v13.208-lastmod (F-H3, Phase 5): Cloudflare Web Analytics beacon — the
MANUAL insertion (OWNER_TODO §11 step 6). The zone's Web Analytics site has
existed since 2026-10-13 with auto_install:true, but Cloudflare's automatic
injection never reaches Worker-rendered HTML (live-verified: zero
cloudflareinsights occurrences + /cdn-cgi/rum 404 for 3+ weeks), so the
field-CWV source Phase 7 needs was silently absent. Cookieless, aggregate
RUM only; CSP-allowed since v13.188. The token is public by design (it rides
every served page).
v13.227-rumzone (2026-11-06, S11): the send.to override — CF cut this
site's beacon ingestion to the ZONE-RELATIVE endpoint at 2026-11-05 00:00
UTC (the legacy absolute cloudflareinsights.com/cdn-cgi/rum 404s every
POST; zero RUM events landed 11-05; the zone-relative POST returns 204 and
ingests — replay-verified in the GraphQL). send.to is the beacon's own
endpoint hook; the same-origin POST is covered by connect-src 'self'.
Gate: check-seo-lastmod #9 requires the override on BOTH templates. -->
<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "fb7e7f1d66e84ed3b4572545c93ef538", "send": {"to": "/cdn-cgi/rum"}}'><\/script>
<script>/* v13.241-mobilecta (S30) + v13.242-faglow (S31) + v13.243-langflag
   (S32) + v13.244-grasspill (S33) + v13.246-fullbar (S35): the
   floating-bar controller. (S35's full-width geometry + the arrow
   retirement are CSS/markup-only — they ride the box's own show/hide
   slide, so they need no wiring here.) THE
   REVEAL GATE (v13.242, owner: "it must start faster while scrolling
   like in first 20% of scrolling"): a rAF-throttled passive
   SCROLL-PROGRESS rule — the bar shows once the visitor has scrolled
   20% of ONE viewport height (and hides again below it; a mid-page
   reload shows it at once; a page with nothing to scroll never shows
   it). First show: slide-up (~350ms), then 2 cyan-blue pulses on the
   #tgPill::after (v13.247-cyanglow re-hues the glow out of the
   grass-green family — opacity+transform only, the box-shadow itself
   never animates); the v13.242 animationend COLLAPSE is RETIRED (S33: the
   two-line heading+sub lockup IS the bar — the standing breathe takes
   the surface back the moment the pulse ends). THE ROTATING
   SUB-HEADLINE (S33, owner: "sub heading (changing) with some
   effects"): the FIVE owner-worded lines cycle every 3.2s with a
   fade+rise+de-blur entrance (.tgp-in, restarted via the reflow
   trick); the active language is re-read from html[lang] on EVERY tick
   so a mid-view EN/FA switch self-heals within one tick; a hidden tab
   (document.hidden) or a hidden bar skips the DOM write;
   prefers-reduced-motion swaps the text with no animation.
   localStorage memory — every read and write inside try/catch, so a
   blocked storage never breaks anything: ANY channel tap (the bar
   body OR the blue mark) saves sp_pill_joined6 (30-day silence).
   v13.247: the key carries the 6 suffix — a ONE-SHOT memory reset for
   the cyan-glow round (the same trick as S32's 2 / S33's 3 / S34's
   4 / S35's 5): the S35 joined5 verdict is zeroed exactly once so
   every returning visitor, the owner included, sees the re-hued
   cyan-blue halo even if a previous round's tap had silenced the bar
   (fresh taps re-seed the 30-day window under the new name).
   prefers-reduced-motion: no slide, no pulse — a plain fade. While
   visible, body.tg-pill-on carries the page's bottom padding + the
   #backTop lift (the CSS block above). */
(function(){
"use strict";
var box=document.getElementById("tgPillBox");
if(!box)return;
var link=document.getElementById("tgPill");
var goBtn=document.getElementById("tgPillGo");
if(!link||!goBtn)return;
var sub=document.getElementById("tgpSub");
var rm=false;
try{rm=window.matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){}
var DAY=86400000;
function lsGet(k){try{return window.localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{window.localStorage.setItem(k,v)}catch(e){}}
var now=Date.now(),joinedAt=Number(lsGet("sp_pill_joined6"))||0;
if(joinedAt&&now-joinedAt<30*DAY)return;
var shown=false,pulsed=false,tDelay=null,tFall=null;
function endPulse(){
  if(tFall){clearTimeout(tFall);tFall=null}
  link.classList.remove("pulse")
}
function firstShow(){
  if(pulsed)return;
  pulsed=true;
  if(rm)return;
  tDelay=setTimeout(function(){
    tDelay=null;
    if(!shown)return;
    var fell=false;
    var onEnd=function(ev){
      if(ev&&ev.animationName!=="tgpGlow")return;
      fell=true;endPulse()
    };
    link.addEventListener("animationend",onEnd);
    link.classList.add("pulse");
    tFall=setTimeout(function(){if(!fell)endPulse()},3500)
  },380)
}
function apply(on){
  if(on===shown)return;
  shown=on;
  if(on){
    box.classList.add("show");
    box.removeAttribute("inert");
    document.body.classList.add("tg-pill-on");
    firstShow()
  }else{
    box.classList.remove("show");
    box.setAttribute("inert","");
    document.body.classList.remove("tg-pill-on");
    if(tDelay){clearTimeout(tDelay);tDelay=null}
  }
}
/* v13.242-faglow: the 20% reveal — scrollY >= 20% of ONE viewport
   height shows the pill (the user's "first 20% of scrolling" read as
   screen units: ~160-170px on a phone — FAR earlier than the old
   hero-out gate, which waited for the whole ~700px hero to clear; the
   hero is still partly on screen when the pill slides in). Scrolling
   back above the line hides it again. ONE rAF-throttled handler on
   passive scroll+resize + one immediate probe (a mid-page reload shows
   the pill without waiting for a scroll); the max>0 guard keeps a
   nothing-to-scroll page pill-free. */
var ticking=false;
function onScroll(){
  if(ticking)return;
  ticking=true;
  requestAnimationFrame(function(){
    ticking=false;
    var doc=document.documentElement;
    var max=Math.max(0,(doc?doc.scrollHeight:document.body?document.body.scrollHeight:0)-window.innerHeight);
    var y=window.scrollY||window.pageYOffset||0;
    apply(max>0&&y>=window.innerHeight*.2)
  })
}
window.addEventListener("scroll",onScroll,{passive:true});
window.addEventListener("resize",onScroll,{passive:true});
onScroll();
/* v13.244-grasspill: the rotating sub-headline — the owner's five
   exact lines (fa) + their EN mirrors, cycled every 3.2s; the current
   language is re-read from html[lang] on every tick (applyLang's own
   attribute), the dir attribute flips with it, and the .tgp-in
   entrance restarts through the classic remove/reflow/add retrigger;
   reduced motion and hidden states skip the animation/DOM write */
var SUBS={
fa:["بازیهای مهم رو از دست نده","اعلان بازیهای مهم در تلگرام","پیگیری بازیها در تلگرام","فوتبالهای مهم کی هستند؟","ناتیفیکیشن دریافت کن!"],
en:["Don't miss the big matches","Big-match alerts on Telegram","Follow the matches on Telegram","Which football matches matter?","Get notified!"]};
var subI=0;
function tickSub(){
  if(!sub||!shown||document.hidden)return;
  subI=(subI+1)%SUBS.fa.length;
  var lang=(document.documentElement.getAttribute("lang")==="en")?"en":"fa";
  sub.textContent=SUBS[lang][subI];
  sub.setAttribute("dir",lang==="en"?"ltr":"rtl");
  if(!rm){sub.classList.remove("tgp-in");void sub.offsetWidth;sub.classList.add("tgp-in")}
}
if(sub){setInterval(tickSub,3200)}
function joined(){lsSet("sp_pill_joined6",String(Date.now()));apply(false)}
link.addEventListener("click",joined);
goBtn.addEventListener("click",joined);
})();<\/script>
</body>
</html>`;
