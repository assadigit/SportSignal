// SportSignal — byte-identical snippets shared by the three page templates
// (admin/login/public). v13.83: these were triplicated inline across the
// templates (~2KB of source); they now live once and are interpolated into
// each template at the exact same byte position. Output is unchanged
// (byte-parity harness: scripts/check-admin-parity.js).

export const THEME_INIT_SCRIPT = `<script>try{var t=localStorage.getItem("ucl_theme")||"dark",l=localStorage.getItem("ucl_lang")||"fa",d=document.documentElement;d.setAttribute("data-theme",t);d.setAttribute("lang",l);d.setAttribute("dir",l==="en"?"ltr":"rtl");}catch(e){}<\/script>`;

export const FONT_FACES_STYLE = `<style>@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Regular.woff2') format('woff2');font-weight:400;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-SemiBold.woff2') format('woff2');font-weight:600;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Bold.woff2') format('woff2');font-weight:700;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-ExtraBold.woff2') format('woff2');font-weight:800;font-display:swap}</style>`;
