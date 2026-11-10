# 2026-11-10 (continuation) — S1 reconciliation + the duplicate-worker deletion + the rename blocker

> **Type: continue/verify a spec'd session after a parallel run collided;
> execute the safe half of the owner's infra instruction.**

## What happened

This was a second agent run on the same S1 prompt, running in parallel with
another session that had (unknown to it) already verified M1/M2 and pushed
its own M3 + session record (`ffd0165`, `7bf78b2`). The continuation run had
completed M1, M2 (deployed live as v13.255-seospell), and its own M3 when
the push was rejected — the remote had moved.

## What was done

1. **Reconciled:** the remote was adopted as canonical (the continuation
   run's duplicate M3 commit is preserved on the local branch `keep-my-m3`;
   nothing was force-pushed). The duplicate M3's independent measurements
   CONFIRM the canonical one: its deeper T-25 variant counted 57 window
   matches (the sitemap's big matches + every followed-team fixture
   discovered on hubs/team pages) and found all ≥3 links once the second
   team's page is counted at crawl depth 4 — the same invariant, measured
   wider. The canonical T-25 (sitemap scope, 21/21) stands.
2. **Verified the canonical M3 claims:** the T-25 code was read line by
   line; the FD "paid tier lineups" claim was re-verified against the FD
   docs (the Match-resource example does document `lineup`/`bench` — the
   claim stands; FD has NO lineup *endpoint*, `/v4/matches/{id}/lineups`
   404s, and the free-tier object carries none).
3. **Deleted the duplicate worker `sportsignal-site`** (the owner's
   instruction; verified unrouted first — no custom domain, no zone routes,
   only the dormant workers.dev URL; deletion verified 404; the live worker
   untouched). `uefa-image-relay` kept (portrait utility, not a duplicate).
4. **Identified the exact rename blocker** (no rename API; ADMIN_PASS,
   ADMIN_TOKEN, CHAT_ID are write-only secrets that cannot migrate — losing
   them locks /admin and the owner's bot-admin identity). Options A/B/C
   handed to the owner; recorded in DECISIONS. WEBHOOK_SECRET is
   regenerable (setWebhook re-register); HEALTHCHECK_PING_URL is not set.
5. **Appended the investigation addendum** (§8): a positive
   `lookuplineup.php` probe (full lineup for a finished EPL match —
   positions, numbers, starter/sub flags, player images) + the FD
   no-lineup-endpoint re-verification.

## Verification

- `sportsignal-site.sportsignal.workers.dev` → 404 (deleted).
- Account workers: `ucl-notifier` (live), `uefa-image-relay` (utility).
- `https://sportsignal.ir/healthz` → ok:true, version 13.255-seospell
  before and after; one transient free-tier CPU 503 on `/` resolved on
  retry (the known v13.186 class, not an outage).
- The M2 live verification from this run stands (three club pages + JSON-LD
  + facts rows + team pages + production seo:check 240/0, before T-25
  existed).

## Notes for the next session

- **Do not run two sessions on the same prompt in parallel** — this round
  spent real effort reconciling a duplicate M3. Fetch remote FIRST; if the
  S1 story is already on `main` (it is), verify instead of rebuilding.
- The worker-rename question (A/B/C) is with the owner. Option B execution
  steps: deploy new worker `sportsignal` (wrangler.toml `name` + DRAIN_SELF
  service), set all 6 secrets, move both custom domains via the API,
  re-register the Telegram webhook (new WEBHOOK_SECRET), verify /healthz +
  /admin + a bot command, update wrangler.toml/wrangler.dev.toml/
  seo-check `workersDev`/AGENTS §11/RUNBOOK, delete `ucl-notifier`.
- S2 needs the owner's fresh Search Console export on/after Dec 4, 2026.
