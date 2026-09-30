// SportSignal — admin session auth routes (split from api.ts in
// v13.47-seams): the /admin login flow (rate-limited credentials + the
// stateless HMAC session cookie), logout, and password change. The dispatch
// if-lines live in api.ts; these are the bodies, byte-identical.

import type { Env } from "./types";
import { readJson, jsonResponse, hashPassword, getAdminPassHash, timingSafeEqualStr } from "./utils";
import { isAdminAuthed, getAdminCookieToken } from "./admin";

// v13.30-login-fix: GET /admin/login used to fall into the admin auth gate
// and return a bare 401 JSON — humans who bookmark /admin/login got a raw
// error instead of the login page. The login form lives at /admin.
export function handleAdminLoginGet(): Response {
  return new Response(null, { status: 302, headers: { "location": "/admin", "cache-control": "no-store" } });
}

export async function handleAdminLoginPost(req: Request, env: Env): Promise<Response> {
  const body = await readJson(req);
  const ip = req.headers.get("CF-Connecting-IP") || "unknown";
  const username = body && body.username || "";
  const failKey = "login_fail_" + ip + "_" + username;
  const fails = parseInt(await env.STATE.get(failKey).catch(() => null)) || 0;
  if (fails >= 5) {
    console.warn("admin login rate-limited: ip=" + ip + " fails=" + fails);
    return new Response(JSON.stringify({ error: "Too many attempts, try later" }), { status: 429, headers: { "content-type": "application/json", "retry-after": "600" } });
  }
  if (!env.ADMIN_TOKEN) {
    return jsonResponse({ error: "ADMIN_TOKEN secret is not set" }, 500);
  }
  const storedHash = await getAdminPassHash(env);
  let ok = !!(body && username === "admin" && body.password && env.ADMIN_PASS && timingSafeEqualStr(body.password, env.ADMIN_PASS));
  if (!ok && body && username === "admin" && body.password && storedHash) {
    ok = timingSafeEqualStr(await hashPassword(body.password, storedHash.salt), storedHash.hash);
  }
  if (!ok) {
    // v13.11-admin-fix: if neither ADMIN_PASS nor a stored hash is set,
    // tell the user clearly (so they know to run `wrangler secret put
    // ADMIN_PASS`) instead of the generic "Invalid credentials".
    if (!env.ADMIN_PASS && !storedHash) {
      return jsonResponse({ error: "Admin password not configured. Run: wrangler secret put ADMIN_PASS" }, 500);
    }
    await env.STATE.put(failKey, String(fails + 1), { expirationTtl: 600 }).catch(() => {
    });
    return jsonResponse({ error: "Invalid credentials" }, 401);
  }
  await env.STATE.delete(failKey).catch(() => {
  });
  const sid = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  // v13.30-login-fix: the session cookie is now ALWAYS the stateless
  // HMAC-signed token (sid.HMAC(sid, ADMIN_TOKEN)). v13.26 only used the
  // signed token when the KV session WRITE failed — but the equally real
  // failure mode is the KV READ-after-write miss (eventual consistency,
  // up to 60s global propagation): the write succeeded, the immediate
  // /admin read-back saw nothing, isValidAdminSession returned false and
  // the user was bounced straight back to the login page — the reported
  // "I cannot login although I could before" loop. A signed token
  // verifies locally with zero KV reads, so login can never race storage.
  // The KV write is kept (audit/observability + revocation best-effort
  // via /admin/logout), but is no longer on the auth critical path.
  let sessionToken = sid;
  try {
    await env.STATE.put("admin_sess_" + sid, JSON.stringify({ created: Date.now(), ip }), { expirationTtl: 43200 });
  } catch (putErr) {
    console.warn("admin session KV write failed (stateless token unaffected): " + putErr.message);
  }
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.ADMIN_TOKEN), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(sid));
    const sigHex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
    sessionToken = sid + "." + sigHex;
  } catch (e2) {
    // HMAC path failed (should not happen) — the plain sid + the KV
    // record written above remain the fallback.
    console.error("admin session HMAC signing failed, using KV-backed sid: " + e2.message);
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": "admin_auth=" + sessionToken + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200"
    }
  });}

export async function handleAdminLogout(req: Request, env: Env): Promise<Response> {
  const sid = getAdminCookieToken(req);
  // v13.30-login-fix: stateless tokens are "sid.signature" — the KV audit
  // record is keyed by sid alone, so strip the signature before deleting.
  const bareSid = sid ? sid.split(".")[0] : null;
  if (bareSid) await env.STATE.delete("admin_sess_" + bareSid).catch(() => {
  });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": "admin_auth=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"
    }
  });}

export async function handleAdminChangePassword(req: Request, env: Env): Promise<Response> {
  if (!await isAdminAuthed(req, env)) return jsonResponse({ error: "Unauthorized" }, 401);
  const body = await readJson(req);
  const np = body && body.password;
  if (!np || np.length < 8) return jsonResponse({ error: "Password too short (min 8)" }, 400);
  const salt = crypto.randomUUID();
  const hash = await hashPassword(np, salt);
  await env.STATE.put("admin_pass_hash", JSON.stringify({ salt, hash }));
  return jsonResponse({ ok: true });}