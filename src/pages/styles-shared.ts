// SportSignal — byte-identical snippets shared by the three page templates
// (admin/login/public). v13.83: these were triplicated inline across the
// templates (~2KB of source); they now live once and are interpolated into
// each template at the exact same byte position. Output is unchanged
// (byte-parity harness: scripts/check-admin-parity.js).
// v13.133-persiantype: the font stack is the owner's Persian design system —
// Morabba (headings, ONE variable file wght 250–900) + Peyda (body/UI,
// static 400–900, FaNum editions with Persian-default digits). Both
// self-hosted under /fonts/ (immutable, week-fresh per _headers). The
// family↔weight map is the typography contract; public-13.55.css assigns
// them (body=Peyda; h1-h6 + display classes=Morabba via --font-heading).
// v13.134-typelight: the numeric/meta surfaces (time-digits, venue-pill,
//   count-num, count-label) moved to Peyda at lighter weights; the theme
//   init pins dark (the dark/light toggle is temporarily retired).

export const THEME_INIT_SCRIPT = `<script>try{var t="dark",l=localStorage.getItem("ucl_lang")||"fa",d=document.documentElement;d.setAttribute("data-theme",t);d.setAttribute("lang",l);d.setAttribute("dir",l==="en"?"ltr":"rtl");}catch(e){}<\/script>`;

export const FONT_FACES_STYLE = `<style>@font-face{font-family:'Morabba';src:url('/fonts/MorabbaVF.woff2') format('woff2');font-weight:250 900;font-style:normal;font-display:swap}@font-face{font-family:'Peyda';src:url('/fonts/Peyda-Regular.woff2') format('woff2');font-weight:400;font-style:normal;font-display:swap}@font-face{font-family:'Peyda';src:url('/fonts/Peyda-Medium.woff2') format('woff2');font-weight:500;font-style:normal;font-display:swap}@font-face{font-family:'Peyda';src:url('/fonts/Peyda-SemiBold.woff2') format('woff2');font-weight:600;font-style:normal;font-display:swap}@font-face{font-family:'Peyda';src:url('/fonts/Peyda-Bold.woff2') format('woff2');font-weight:700;font-style:normal;font-display:swap}@font-face{font-family:'Peyda';src:url('/fonts/Peyda-ExtraBold.woff2') format('woff2');font-weight:800;font-style:normal;font-display:swap}@font-face{font-family:'Peyda';src:url('/fonts/Peyda-Black.woff2') format('woff2');font-weight:900;font-style:normal;font-display:swap}
/* v13.164-matchcard: the mobile HUD card's squared techno face (the owner's
     reference card's own typography). Self-hosted latin subsets (~10KB
     each); fetched ONLY when the mobile card's rules match text — no
     download on desktop or non-home pages. */
@font-face{font-family:'Chakra Petch';src:url('/fonts/ChakraPetch-Medium.woff2') format('woff2');font-weight:500;font-style:normal;font-display:swap}
@font-face{font-family:'Chakra Petch';src:url('/fonts/ChakraPetch-SemiBold.woff2') format('woff2');font-weight:600;font-style:normal;font-display:swap}
@font-face{font-family:'Chakra Petch';src:url('/fonts/ChakraPetch-Bold.woff2') format('woff2');font-weight:700;font-style:normal;font-display:swap}
@font-face{font-family:'Poppins Digits';src:url('/fonts/Poppins-Bold.woff2') format('woff2');font-weight:600 700;font-style:normal;font-display:swap;unicode-range:U+0030-0039,U+003A,U+0020,U+002D}
@font-face{font-family:'Poppins Digits';src:url('/fonts/Poppins-ExtraBold.woff2') format('woff2');font-weight:800;font-style:normal;font-display:swap;unicode-range:U+0030-0039,U+003A,U+0020,U+002D}</style>`;
