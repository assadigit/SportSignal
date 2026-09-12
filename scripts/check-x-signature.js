// check-x-signature.js — v12.33-xpost OAuth 1.0a HMAC-SHA1 signature check.
// Asserts that xPercentEncode / xBuildBaseString / xBuildAuthHeader implement
// the OAuth 1.0a "user context" signing flow used by POST /2/tweets:
//  1) xPercentEncode — RFC 3986 percent-encoding (unreserved A-Za-z0-9-._~
//     preserved, everything else %XX uppercase; the !'()* set encodeURIComponent
//     leaves behind is also encoded — required by OAuth 1.0a).
//  2) xBuildBaseString — produces the canonical RFC 5849 §3.4.1.1 base string
//     (METHOD & percent-encoded(URL) & percent-encoded(sorted params joined
//     by &), with the params double-encoded since they are themselves a value
//     in the base string).
//  3) xBuildAuthHeader — produces a valid "OAuth key=\"value\",..." header
//     whose oauth_signature is the base64 HMAC-SHA1 of the base string with
//     the signing key percent-encoded(consumerSecret) + "&" +
//     percent-encoded(tokenSecret).
//
// The HMAC-SHA1 expected value is computed by Node's standard `crypto`
// module against the hand-verified canonical base string — this is the
// canonical reference implementation. Asserting the worker's crypto.subtle
// HMAC-SHA1 output matches Node's crypto HMAC-SHA1 output is the spec
// compliance check (no external OAuth library is consulted).
//
// Usage: node scripts/check-x-signature.js (extracts functions from src/worker.ts)
// NOTE: no "use strict" — sloppy-mode eval leaks function decls to module scope.
const fs = require("fs");
const crypto = require("crypto");
const src = fs.readFileSync("src/worker.ts", "utf8");

function grabFn(sig) {
  const i = src.indexOf(sig);
  if (i < 0) throw new Error("missing " + sig);
  const open = src.indexOf("{", i);
  let depth = 0, j = open;
  for (; j < src.length; j++) {
    const ch = src[j];
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) break; }
  }
  return src.slice(i, j + 1);
}

let fails = 0;
function chk(cond, msg) { if (!cond) { fails++; console.log("FAIL " + msg); } else console.log("OK   " + msg); }

// ---------- worker-side functions under test ----------
eval([
  grabFn("function xPercentEncode(s)"),
  grabFn("async function xHmacSha1Base64(keyStr, baseStr)"),
  grabFn("async function xBuildBaseString(method, url, allParams)"),
  grabFn("async function xBuildAuthHeader(method, url, env, opts)")
].join("\n"));

// ---------- canonical OAuth 1.0a test inputs ----------
// The consumer/token keys + nonce/timestamp below mirror RFC 5849 §1.2 / the
// OAuth Core 1.0a appendix examples. The expected *base string* is hand-
// verified; the expected *signature* is computed by Node's standard crypto
// HMAC-SHA1 implementation against that base string (canonical reference).
const CONSUMER_KEY = "dpf43f3p2l4k3l03";
const CONSUMER_SECRET = "jDdNnl6gUgV0OX7L4lLcFwt9b1k";
const TOKEN = "nnch734d00sl2jdk";
const TOKEN_SECRET = "wD0v3F4qJlJSFa8Gwlz1V4y0KIBZRqCD0gXt5ZBcOAlhUZ5N";
const NONCE = "kllo9940pd9333jh";
const TIMESTAMP = 1191242096;
const METHOD = "POST";
const URL = "http://api.example.com/resource";
const EXTRA = { body: "Hello World", include_entities: "true" };

// Canonical RFC 5849 §3.4.1.1 base string (hand-verified; params sorted
// alphabetically by key, each percent-encoded, joined with &, then the
// whole param string percent-encoded again as a single value in the base
// string).
const EXPECTED_BASE =
  "POST&http%3A%2F%2Fapi.example.com%2Fresource&" +
  "body%3DHello%2520World%26" +
  "include_entities%3Dtrue%26" +
  "oauth_consumer_key%3Ddpf43f3p2l4k3l03%26" +
  "oauth_nonce%3Dkllo9940pd9333jh%26" +
  "oauth_signature_method%3DHMAC-SHA1%26" +
  "oauth_timestamp%3D1191242096%26" +
  "oauth_token%3Dnnch734d00sl2jdk%26" +
  "oauth_version%3D1.0";

// Reference signature via Node's standard crypto HMAC-SHA1.
const SIGNING_KEY = encodeURIComponent(CONSUMER_SECRET) + "&" + encodeURIComponent(TOKEN_SECRET);
const EXPECTED_SIG = crypto.createHmac("sha1", SIGNING_KEY).update(EXPECTED_BASE).digest("base64");

(async () => {
  console.log("Reference HMAC-SHA1 (Node crypto): " + EXPECTED_SIG);

  // 1. xPercentEncode — RFC 3986 unreserved set: A-Za-z0-9-._~; everything
  //    else %XX (uppercase). The !'()* set encodeURIComponent leaves behind
  //    must also be encoded.
  chk(xPercentEncode("Hello World") === "Hello%20World", "percent-encode space");
  chk(xPercentEncode("a-b.c_d~e") === "a-b.c_d~e", "percent-encode unreserved preserved");
  chk(xPercentEncode("a!b'c(d)e*f") === "a%21b%27c%28d%29e%2Af", "percent-encode !'()* → %XX");
  chk(xPercentEncode("Hello+World") === "Hello%2BWorld", "percent-encode + (reserved)");
  chk(xPercentEncode("a=b&c") === "a%3Db%26c", "percent-encode = and & (reserved)");
  chk(xPercentEncode("") === "", "percent-encode empty");
  chk(xPercentEncode("سلام") === "%D8%B3%D9%84%D8%A7%D9%85", "percent-encode Persian chars (UTF-8 bytes)");

  // 2. xBuildBaseString — exact RFC 5849 §3.4.1.1 canonical base string
  const allParams = {
    oauth_consumer_key: CONSUMER_KEY,
    oauth_nonce: NONCE,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(TIMESTAMP),
    oauth_token: TOKEN,
    oauth_version: "1.0",
    body: "Hello World",
    include_entities: "true"
  };
  const base = await xBuildBaseString(METHOD, URL, allParams);
  chk(base === EXPECTED_BASE, "base string matches RFC 5849 §3.4.1.1 canonical");

  // 3. xBuildAuthHeader — the full Authorization header carries the signature
  //    as oauth_signature (percent-encoded). The header value parses to the
  //    Node-crypto reference signature.
  const env = {
    X_API_KEY: CONSUMER_KEY,
    X_API_SECRET: CONSUMER_SECRET,
    X_ACCESS_TOKEN: TOKEN,
    X_ACCESS_TOKEN_SECRET: TOKEN_SECRET
  };
  const header = await xBuildAuthHeader(METHOD, URL, env, {
    nonce: NONCE,
    timestamp: TIMESTAMP,
    extraParams: EXTRA
  });
  chk(/^OAuth /.test(header), "header starts with 'OAuth '");
  chk(header.includes('oauth_signature_method="HMAC-SHA1"'), "header carries HMAC-SHA1 method");
  chk(header.includes('oauth_version="1.0"'), "header carries OAuth 1.0");
  chk(header.includes('oauth_consumer_key="' + CONSUMER_KEY + '"'), "header carries consumer key");
  chk(header.includes('oauth_token="' + TOKEN + '"'), "header carries token");
  chk(header.includes('oauth_nonce="' + NONCE + '"'), "header carries pinned nonce");
  chk(header.includes('oauth_timestamp="' + TIMESTAMP + '"'), "header carries pinned timestamp");
  // Extract oauth_signature value, URL-decode, compare with Node-crypto reference
  const m = header.match(/oauth_signature="([^"]+)"/);
  chk(!!m, "header has oauth_signature");
  if (m) {
    const gotSig = decodeURIComponent(m[1]);
    chk(gotSig === EXPECTED_SIG, "signature matches Node crypto HMAC-SHA1 reference: " + gotSig);
  }

  // 4. Cross-check: build the header WITHOUT extra params (the real /2/tweets
  //    call signs only oauth_* params — JSON body is NOT part of the
  //    signature). The base string should be a pure oauth_* param list.
  const headerTweet = await xBuildAuthHeader("POST", "https://api.x.com/2/tweets", env, {
    nonce: "abc123",
    timestamp: 1700000000
  });
  const tweetParams = headerTweet.match(/oauth_[a-z_]+="[^"]+"/g);
  chk(tweetParams && tweetParams.length === 7, "tweet header has exactly 7 oauth_* params (incl signature)");
  chk(tweetParams && tweetParams.some((p) => p.startsWith('oauth_nonce="abc123"')), "tweet header carries pinned nonce");
  chk(tweetParams && tweetParams.some((p) => p.startsWith('oauth_timestamp="1700000000"')), "tweet header carries pinned timestamp");

  // 5. Signing-key composition: HMAC-SHA1 uses
  //    percent-encoded(consumerSecret) + "&" + percent-encoded(tokenSecret).
  //    Confirm directly that xHmacSha1Base64 produces the Node-crypto
  //    reference signature when fed the canonical base string + composed key.
  const directSig = await xHmacSha1Base64(SIGNING_KEY, EXPECTED_BASE);
  chk(directSig === EXPECTED_SIG, "direct HMAC-SHA1 over canonical base string with composed key matches Node crypto reference");

  // 6. Special chars in secrets — signing key percent-encodes them via
  //    xPercentEncode (which encodes the !'()* set encodeURIComponent leaves
  //    behind) so the HMAC key bytes are the canonical encoded form.
  //    Confirm with a secret containing reserved chars.
  const headerSpecial = await xBuildAuthHeader("POST", "https://api.x.com/2/tweets", {
    X_API_KEY: "ck-with-special",
    X_API_SECRET: "cs+with/special=chars&",
    X_ACCESS_TOKEN: "tk-1",
    X_ACCESS_TOKEN_SECRET: "ts!secret"
  }, { nonce: "n1", timestamp: 1 });
  const mSpecial = headerSpecial.match(/oauth_signature="([^"]+)"/);
  chk(!!mSpecial, "special-chars header has oauth_signature");
  if (mSpecial) {
    // Use xPercentEncode (the worker's actual encoder) — not bare
    // encodeURIComponent — so the HMAC key bytes match what the worker
    // composes internally.
    const signingKeySpecial = xPercentEncode("cs+with/special=chars&") + "&" + xPercentEncode("ts!secret");
    const bsSpecial = "POST&https%3A%2F%2Fapi.x.com%2F2%2Ftweets&" +
      "oauth_consumer_key%3Dck-with-special%26" +
      "oauth_nonce%3Dn1%26" +
      "oauth_signature_method%3DHMAC-SHA1%26" +
      "oauth_timestamp%3D1%26" +
      "oauth_token%3Dtk-1%26" +
      "oauth_version%3D1.0";
    const expectedSpecial = crypto.createHmac("sha1", signingKeySpecial).update(bsSpecial).digest("base64");
    chk(decodeURIComponent(mSpecial[1]) === expectedSpecial, "special-chars signature matches Node crypto reference (secrets percent-encoded via xPercentEncode into the HMAC key): " + decodeURIComponent(mSpecial[1]));
  }

  console.log(fails === 0 ? "\n✅ check-x-signature: ALL PASS" : `\n❌ check-x-signature: ${fails} FAILURE(S)`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
