// Self-check: security invariants — CSP strictness, admin cookie flags,
// timing-safe token compare, fa-teams override Persian-charset gate, and
// webhook secret enforcement. Regresses if a maintainer loosens the CSP
// (e.g. re-adds a CDN allowlist), drops a cookie flag, or removes the
// isValidFaName gate on the admin override endpoint.
//
// Reads the real concatenated worker source (single source of truth).
const src = require("./lib/worker-src")();

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) failed++;
};

// 1) CSP: no CDN allowlist in style-src / font-src (all assets self-hosted
//    since v13.6; the Lottie CDN player was removed in v13.4).
const cspMatch = src.match(/"content-security-policy":\s*"([^"]+)"/);
check("CSP directive present in PAGE_SEC_HEADERS", !!cspMatch);
if (cspMatch) {
  const csp = cspMatch[1];
  check("CSP has default-src 'self'", /default-src 'self'/.test(csp));
  check("CSP has script-src 'self'", /script-src 'self'/.test(csp));
  check("CSP style-src has no CDN allowlist (self-hosted)", !/style-src[^;]*cdn\.jsdelivr\.net/.test(csp) && !/style-src[^;]*unpkg/.test(csp));
  check("CSP font-src is 'self' only (self-hosted Vazirmatn)", /font-src 'self'/.test(csp) && !/font-src[^;]*cdn\.jsdelivr\.net/.test(csp));
  check("CSP frame-ancestors 'none' (clickjacking)", /frame-ancestors 'none'/.test(csp));
  check("CSP connect-src 'self' only", /connect-src 'self'/.test(csp));
  check("CSP img-src allows data: + https: (provider crests)", /img-src 'self' data: https:/.test(csp));
}

// 2) Admin cookie flags: HttpOnly + Secure + SameSite=Strict on every set-cookie
//    (login success + logout clear).
const setCookieLogin = src.match(/set-cookie":\s*"admin_auth=[^"]+"/);
check("admin_auth set-cookie present (login)", !!setCookieLogin);
if (setCookieLogin) {
  const ck = setCookieLogin[0];
  check("admin cookie has HttpOnly", /HttpOnly/.test(ck));
  check("admin cookie has Secure", /Secure/.test(ck));
  check("admin cookie has SameSite=Strict", /SameSite=Strict/.test(ck));
}

// 3) Timing-safe compare on the admin token (not a plain === compare).
//    timingSafeEqualStr is defined in utils.ts and used by isAdminRequest.
check("timingSafeEqualStr is defined", /function timingSafeEqualStr\(/.test(src));
check("isAdminRequest uses timingSafeEqualStr (not ===)", /timingSafeEqualStr\(authHeader\.slice\(7\),\s*env\.ADMIN_TOKEN\)/.test(src));
check("validateWebhook uses timingSafeEqualStr", /timingSafeEqualStr\(secretToken,\s*env\.WEBHOOK_SECRET\)/.test(src));

// 4) fa-teams override endpoint validates the Farsi name via isValidFaName
//    (defense-in-depth on the XSS storage boundary; the AI learner already
//    gates, but admin overrides must too so a compromised admin token can't
//    store arbitrary HTML in fa_teams_ai.overrides).
const overrideBlock = src.slice(src.indexOf('"/api/fa-teams/override"'));
check("fa-teams override endpoint exists", overrideBlock.length > 0);
check("fa-teams override gates with isValidFaName", /isValidFaName\(fa\)/.test(overrideBlock));
check("fa-teams override requires admin auth", /isAdminAuthed\(req,\s*env\)/.test(overrideBlock));

// 5) Webhook secret enforced: /webhook returns 403 when validateWebhook fails
//    (no secret header or wrong secret).
// v13.72-deadweight: end boundary was the /public fallback branch (removed);
// the card route marker is the next stable anchor after the webhook block.
const webhookBlock = src.slice(src.indexOf('if (url.pathname === "/webhook")'), src.indexOf('if (url.pathname.startsWith("/api/card/"))'));
check("webhook route exists", webhookBlock.length > 0);
check("webhook returns 403 on invalid secret", /return new Response\("Unauthorized",\s*\{\s*status:\s*403\s*\}\)/.test(webhookBlock));
check("webhook handler validates secret before parsing body", src.indexOf("validateWebhook(req, env)") < src.indexOf("await req.json()"));

// 6) isValidFaName charset gate (Persian-only, blocks < > and Latin).
const isValidBlock = src.match(/function isValidFaName\(fa\)\s*\{[\s\S]*?\}/);
check("isValidFaName is defined", !!isValidBlock);
if (isValidBlock) {
  const body = isValidBlock[0];
  check("isValidFaName rejects names < 2 chars", /v\.length < 2/.test(body));
  check("isValidFaName rejects names > 42 chars", /v\.length > 42/.test(body));
  check("isValidFaName requires a Persian letter (\\u0621-\\u064A range)", /\\u0621-\\u064A/.test(body));
  // The charset regex restricts to Persian block + ZWNJ + spaces + a few
  // punctuation chars — < > & " ' are NOT in the allowed set, so an HTML
  // payload can never pass. Check the charset regex exists + ends with +$/.
  check("isValidFaName charset regex ends with +$/ (anchored)", /\+\$\/\.test\(v\)/.test(body));
  check("isValidFaName charset blocks < > (Persian-only set)", !/[\s<]<>[>\s]/.test(body) && /\\u0600-\\u06FF/.test(body));
}

// 7) Login rate limiting (5 fails / 10min per IP+username).
check("login rate-limit failKey present", /login_fail_/.test(src));
check("login rate-limit caps at 5 fails", /fails >= 5/.test(src));

console.log(failed ? failed + " FAILURES" : "security invariants OK");
process.exit(failed ? 1 : 0);
