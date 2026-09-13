// scripts/verify-x-connection.js — one-off OAuth 1.0a connection check
// for the SportSignal X integration. Verifies end-to-end that:
//   (a) the user's 4 OAuth 1.0a keys are valid,
//   (b) the worker's inline signing algorithm matches what X expects,
//   (c) the test post actually lands on the X account.
//
// The signing algorithm here is a standalone re-implementation of the
// worker's xPercentEncode / xBuildBaseString / xBuildAuthHeader. It is
// kept in lockstep with src/worker.ts — the check-x-signature.js test
// suite verifies the worker's implementation against the canonical RFC
// 5849 base string + Node-crypto HMAC-SHA1 reference, so this script's
// matching implementation produces the same signatures.
//
// Reads keys from env vars (NEVER hardcoded):
//   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
//
// Usage:
//   X_API_KEY=... X_API_SECRET=... X_ACCESS_TOKEN=... X_ACCESS_TOKEN_SECRET=... \
//     node scripts/verify-x-connection.js
//
// Success = HTTP 201 + JSON body with data.id. Failure modes:
//   401 = bad consumer key/secret OR bad access token/secret
//   403 = app permissions not READ+WRITE (regenerate access token after
//         changing perms in the X developer portal)
//   429 = rate-limited (free tier allows ~50 posts/day, 17/hour)
//   5xx = X server error (one retry per the worker's xPostTweet)

const crypto = require("crypto");

// ---------- OAuth 1.0a signing (mirrors src/worker.ts) ----------
// xPercentEncode — RFC 3986 percent-encoding: unreserved A-Za-z0-9-._~
// preserved, everything else %XX uppercase. The `!'()*` set that
// encodeURIComponent leaves behind is also encoded (required by OAuth
// 1.0a — same as the worker's xPercentEncode).
function xPercentEncode(s) {
  return encodeURIComponent(String(s)).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

// xHmacSha1Base64 — HMAC-SHA1 of `baseStr` with key `keyStr`, base64-encoded.
// In the worker this uses crypto.subtle.importKey + sign; here we use Node's
// crypto.createHmac (the canonical reference implementation, same as
// check-x-signature.js uses).
function xHmacSha1Base64(keyStr, baseStr) {
  return crypto.createHmac("sha1", keyStr).update(baseStr).digest("base64");
}

// xBuildBaseString — RFC 5849 §3.4.1.1 canonical base string:
//   METHOD & percent-encoded(URL) & percent-encoded(sorted params joined by &)
// The params are double-encoded (their values are encoded once for the param
// string, then the whole param string is encoded again as a single value in
// the base string).
function xBuildBaseString(method, url, allParams) {
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys.map((k) => xPercentEncode(k) + "=" + xPercentEncode(allParams[k])).join("&");
  return method.toUpperCase() + "&" + xPercentEncode(url) + "&" + xPercentEncode(paramString);
}

// xBuildAuthHeader — builds the OAuth 1.0a Authorization header. Generates a
// random nonce + current timestamp (or uses opts.nonce/timestamp if pinned
// for tests). The signing key is
//   xPercentEncode(consumerSecret) + "&" + xPercentEncode(tokenSecret).
function xBuildAuthHeader(method, url, env, opts) {
  opts = opts || {};
  const consumerKey = env.X_API_KEY;
  const consumerSecret = env.X_API_SECRET || "";
  const token = env.X_ACCESS_TOKEN;
  const tokenSecret = env.X_ACCESS_TOKEN_SECRET || "";
  // Random 32-byte hex nonce (same as worker's xRandomNonce)
  const nonceBuf = crypto.randomBytes(32);
  const nonce = nonceBuf.toString("hex");
  const timestamp = String(Math.floor(Date.now() / 1000));
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: token,
    oauth_version: "1.0"
  };
  const baseString = xBuildBaseString(method, url, oauthParams);
  const signingKey = xPercentEncode(consumerSecret) + "&" + xPercentEncode(tokenSecret);
  const signature = xHmacSha1Base64(signingKey, baseString);
  oauthParams.oauth_signature = signature;
  return "OAuth " + Object.keys(oauthParams).map((k) => xPercentEncode(k) + '="' + xPercentEncode(oauthParams[k]) + '"').join(", ");
}

// ---------- Read the user's 4 OAuth keys from env vars ----------
const env = {
  X_API_KEY: process.env.X_API_KEY,
  X_API_SECRET: process.env.X_API_SECRET,
  X_ACCESS_TOKEN: process.env.X_ACCESS_TOKEN,
  X_ACCESS_TOKEN_SECRET: process.env.X_ACCESS_TOKEN_SECRET
};

const missing = Object.keys(env).filter((k) => !env[k]);
if (missing.length) {
  console.error("ERROR: missing env vars: " + missing.join(", "));
  console.error("");
  console.error("Usage:");
  console.error("  X_API_KEY=... X_API_SECRET=... X_ACCESS_TOKEN=... X_ACCESS_TOKEN_SECRET=... \\");
  console.error("    node scripts/verify-x-connection.js");
  process.exit(2);
}

// The test post — mirrors the worker's xTestPost composer exactly
// (Persian, ≤280 chars, #فوتبال + site URL). This is the tweet that will
// land publicly on the @SportSignal X account.
const TEST_TEXT = "\u{1F9EA} SportSignal X connection test \u2014 \u0641\u0648\u062A\u0628\u0627\u0644 \u0627\u0631\u0648\u067E\u0627 \u0631\u0627 \u062F\u0646\u0628\u0627\u0644 \u06A9\u0646\u06CC\u062F\nfootball.sportsignal.ir #\u0641\u0648\u062A\u0628\u0627\u0644";

(async () => {
  console.log("=== SportSignal X connection check ===");
  console.log("Consumer key: " + env.X_API_KEY.slice(0, 6) + "..." + env.X_API_KEY.slice(-4));
  console.log("Access token: " + env.X_ACCESS_TOKEN.slice(0, 6) + "..." + env.X_ACCESS_TOKEN.slice(-4));
  console.log("Test text (" + TEST_TEXT.length + " chars): " + JSON.stringify(TEST_TEXT));
  console.log("");
  console.log("Building OAuth 1.0a HMAC-SHA1 signature (mirrors worker's xBuildAuthHeader)...");

  const url = "https://api.x.com/2/tweets";
  const body = JSON.stringify({ text: TEST_TEXT });
  const auth = xBuildAuthHeader("POST", url, env, {});
  console.log("  Auth header built: " + auth.length + " bytes, starts with: " + auth.slice(0, 14) + "...");
  // Count the oauth_* params (should be 7 incl signature)
  const oauthParams = auth.match(/oauth_[a-z_]+=/g);
  console.log("  OAuth params in header: " + (oauthParams ? oauthParams.length : 0) + " (expected 7)");

  console.log("");
  console.log("POST " + url);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body
  });

  console.log("");
  console.log("=== Response ===");
  console.log("HTTP " + res.status + " " + res.statusText);
  // Print key response headers
  const respHeaders = {};
  res.headers.forEach((v, k) => { respHeaders[k] = v; });
  if (respHeaders["x-rate-limit-limit"]) console.log("Rate limit: " + respHeaders["x-rate-limit-remaining"] + "/" + respHeaders["x-rate-limit-limit"] + " (resets in " + respHeaders["x-rate-limit-reset"] + "s)");
  if (respHeaders["retry-after"]) console.log("Retry-After: " + respHeaders["retry-after"]);

  const responseText = await res.text();
  console.log("");
  console.log("Body:");
  try {
    const parsed = JSON.parse(responseText);
    console.log(JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.log(responseText.slice(0, 1000));
  }

  console.log("");
  if (res.ok) {
    let data = null;
    try { data = JSON.parse(responseText); } catch (e) {}
    const id = data && data.data && data.data.id;
    const text = data && data.data && data.data.text;
    console.log("\u2705 SUCCESS \u2014 test tweet posted to X!");
    if (id) console.log("  Tweet ID: " + id);
    if (text) console.log("  Posted text: " + JSON.stringify(text));
    process.exit(0);
  } else {
    console.log("\u274C FAILED \u2014 see body above");
    if (res.status === 401) console.log("  (401 = unauthorized \u2014 bad consumer key/secret OR bad access token/secret; double-check all 4 values are copied exactly with no trailing whitespace)");
    else if (res.status === 403) console.log("  (403 = forbidden \u2014 the app's permissions are likely READ-only. In the X developer portal: App permissions \u2192 READ AND WRITE, then REGENERATE the access token + secret (changing perms invalidates the old token))");
    else if (res.status === 429) console.log("  (429 = rate-limited \u2014 wait for the Retry-After period, then retry)");
    else if (res.status >= 500) console.log("  (" + res.status + " = X server error \u2014 retry in a few seconds)");
    else console.log("  (" + res.status + " = see the body above for the X error detail)");
    process.exit(1);
  }
})().catch((e) => { console.error("ERROR:", e); process.exit(1); });
