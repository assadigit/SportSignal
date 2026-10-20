// SportSignal — the /admin dashboard template composer. v13.83 split the
// old 683-line monolith into four modules (css/html/js + shared styles);
// this file is the thin assembler that produces the SAME ADMIN_PAGE bytes.
// Guard: scripts/check-admin-parity.js (byte-parity vs frozen fixtures).

import { VERSION } from "../config";
import { THEME_INIT_SCRIPT, FONT_FACES_STYLE } from "./styles-shared";
import { ADMIN_MAIN_STYLE } from "./admin-css";
import { ADMIN_BODY } from "./admin-html";
import { ADMIN_SCRIPT } from "./admin-js";

export const ADMIN_PAGE = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${THEME_INIT_SCRIPT}
<title data-i="titleA">\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0631\u0628\u0627\u062A \u0627\u0639\u0644\u0627\u0646 \u0645\u0633\u0627\u0628\u0642\u0627\u062A</title>
${FONT_FACES_STYLE}
${ADMIN_MAIN_STYLE}
</head>
<body>
${ADMIN_BODY}
<script src="/core-13.13.js"><\/script>
<script>
${ADMIN_SCRIPT}
<\/script>
</body></html>`;
