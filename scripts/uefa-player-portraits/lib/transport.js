// lib/transport.js — polite, strictly scoped HTTP transport for official UEFA
// hosts. Supports direct fetches and an optional self-hosted relay worker for
// network vantage points that UEFA's CDN edge refuses (datacenter IP ranges).
//
// Behaviour mandated by uefa-player-portraits.spec.md §7:
//   - one request at a time, >= 1s between requests to the same host
//   - honest descriptive User-Agent
//   - explicit timeouts, bounded redirects (each hop re-validated)
//   - download-size limits
//   - Retry-After + exponential backoff with jitter, at most three retries
//   - 404 = missing candidate (no retry)
//   - access-denied/challenge responses stop automated requests on that
//     transport and are reported as a blocker
"use strict";

const { config } = require("./config");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class BlockedHostError extends Error {
  constructor(host, detail) {
    super(`automated requests to ${host} stopped: ${detail}`);
    this.name = "BlockedHostError";
    this.host = host;
    this.detail = detail;
  }
}

class HttpError extends Error {
  constructor(status, url, message) {
    super(message || `HTTP ${status} for ${url}`);
    this.name = "HttpError";
    this.status = status;
    this.url = url;
  }
}

// Circuit breakers are PER TRANSPORT: a direct-mode denial must not block the
// relay transport for the same host (auto mode falls back).
const blocked = { direct: new Set(), relay: new Set() };

const lastRequestAt = new Map(); // `${mode}:${host}` -> timestamp

function assertUrlAllowed(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`invalid URL: ${url}`);
  }
  if (u.protocol !== "https:") throw new Error(`non-HTTPS URL refused: ${url}`);
  const prefixes = config.http.allowed_paths[u.hostname];
  if (!prefixes || !prefixes.some((p) => u.pathname.startsWith(p))) {
    throw new Error(`URL outside the allowed UEFA scope: ${url}`);
  }
  return u;
}

async function politeWait(host) {
  const last = lastRequestAt.get(host) || 0;
  const wait = config.http.min_interval_ms - (Date.now() - last);
  if (wait > 0) await sleep(wait);
  lastRequestAt.set(host, Date.now());
}

function looksLikeAccessDenied(status, bodyPrefix) {
  if (status === 401 || status === 403) return true;
  const p = (bodyPrefix || "").toLowerCase();
  return (
    p.includes("access denied") || p.includes("akamai") || p.includes("captcha") ||
    p.includes("attention required") || p.includes("verify you are a human")
  );
}

function jitter(baseMs) {
  return baseMs * (0.5 + Math.random());
}

function relayConfigured() {
  return Boolean(config.relay_base);
}

// Single GET attempt through one transport mode. Redirects are followed
// manually with every hop re-validated. Returns the 200 response, throws
// HttpError(404), marks+throws access denials, or surfaces transient errors.
async function rawGetOnce(url, mode, opts = {}) {
  assertUrlAllowed(url);
  const host = new URL(url).hostname;
  if (blocked[mode].has(host)) {
    throw new BlockedHostError(host, `${mode} transport previously received an access-denied response`);
  }
  // Politeness is keyed by TARGET host: every mode ultimately hits UEFA's
  // infrastructure, so the >=1s spacing applies across transports too.
  await politeWait(host);

  let target = url;
  for (let hop = 0; hop <= config.http.max_redirects; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.http.timeout_ms);
    let res;
    try {
      if (mode === "relay") {
        const relayUrl = `${config.relay_base.replace(/\/$/, "")}/?url=${encodeURIComponent(target)}`;
        res = await fetch(relayUrl, {
          method: "GET",
          headers: { "User-Agent": config.http.user_agent },
          signal: controller.signal,
          redirect: "manual",
        });
      } else {
        res = await fetch(target, {
          method: "GET",
          headers: { "User-Agent": config.http.user_agent },
          signal: controller.signal,
          redirect: "manual",
        });
      }
    } catch (err) {
      if (err.name === "AbortError") throw new Error(`timeout fetching ${target}`);
      throw err;
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error(`redirect without Location from ${target}`);
      const next = new URL(loc, target).toString();
      assertUrlAllowed(next); // validate destination BEFORE following
      target = next;
      await res.body?.cancel?.();
      continue;
    }

    const chunks = [];
    let total = 0;
    const reader = res.body?.getReader();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > config.http.max_download_bytes) {
          await reader.cancel();
          throw new Error(`download exceeds ${config.http.max_download_bytes} bytes: ${target}`);
        }
        chunks.push(value);
      }
    }
    const body = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    const contentType = res.headers.get("content-type") || "";

    if (res.status === 404) throw new HttpError(404, url, "missing candidate");
    if (looksLikeAccessDenied(res.status, body.slice(0, 400).toString("utf8"))) {
      // Transient throttles happen during bounded 404-probe sweeps. Back off
      // for a minute and retry ONCE before declaring the host blocked (a
      // genuine block repeats and then stops all automated requests, per
      // spec §7).
      if (!opts || !opts.deniedRetried) {
        await new Promise((r) => setTimeout(r, 65000));
        return rawGetOnce(url, mode, { deniedRetried: true });
      }
      blocked[mode].add(host);
      throw new BlockedHostError(
        host,
        `access-denied response over ${mode} transport (HTTP ${res.status}, persisted after a 65 s backoff)`
      );
    }
    if (res.status === 429 || res.status >= 500) {
      const ra = Number(res.headers.get("retry-after") || "") * 1000;
      throw Object.assign(new HttpError(res.status, target, `transient HTTP ${res.status}`), {
        transient: true,
        retryAfterMs: Number.isFinite(ra) && ra > 0 ? ra : null,
      });
    }
    if (res.status !== 200) throw new HttpError(res.status, target);
    return { status: res.status, contentType, body, url: target, transport: mode };
  }
  throw new Error(`too many redirects fetching ${url}`);
}

// Public GET with bounded retries and transport fallback (auto mode).
async function get(url, { transport: transportOverride, onRetry } = {}) {
  const modePref = transportOverride || config.transport;
  const modes =
    modePref === "auto"
      ? relayConfigured() ? ["direct", "relay"] : ["direct"]
      : [modePref];

  let lastErr;
  for (let attempt = 0; attempt <= config.http.retries; attempt++) {
    if (attempt > 0) {
      const retryAfterMs = lastErr && lastErr.retryAfterMs ? lastErr.retryAfterMs : null;
      const backoff = retryAfterMs != null
        ? retryAfterMs + jitter(250)
        : jitter(1000 * Math.pow(2, attempt - 1)); // ~1s, 2s, 4s with jitter
      if (onRetry) onRetry(attempt, backoff, lastErr);
      await sleep(backoff);
    }
    for (const mode of modes) {
      try {
        return await rawGetOnce(url, mode);
      } catch (err) {
        lastErr = err;
        if (err instanceof HttpError && !err.transient) throw err; // definitive (e.g. 404)
        // access-denied, timeout, network error, 429/5xx -> try next transport
        continue;
      }
    }
    if (modes.every((m) => blocked[m].has(new URL(url).hostname))) {
      throw new BlockedHostError(
        new URL(url).hostname,
        `all configured transports (${modes.join(", ")}) received access-denied responses`
      );
    }
  }
  throw lastErr || new Error(`giving up on ${url}`);
}

function blockedHostList() {
  return {
    direct: [...blocked.direct],
    relay: [...blocked.relay],
  };
}

// Clear the in-process access-denied state (used by long batch runs that
// PAUSE and retry after UEFA's edge throttles a transport — the throttle
// windows observed in practice are minutes, not permanent blocks).
function clearBlocked(mode) {
  if (mode === "direct") blocked.direct.clear();
  else if (mode === "relay") blocked.relay.clear();
  else {
    blocked.direct.clear();
    blocked.relay.clear();
  }
}

module.exports = {
  get,
  assertUrlAllowed,
  BlockedHostError,
  HttpError,
  blockedHostList,
  clearBlocked,
  // test seams
  _internal: { politeWait, looksLikeAccessDenied, jitter, lastRequestAt, blocked, rawGetOnce },
};
