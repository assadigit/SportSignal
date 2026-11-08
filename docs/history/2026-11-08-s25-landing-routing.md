# 2026-11-08 — Session 25: the corrected landing page goes LIVE at the apex (account-level routing change, ZERO ucl-notifier code changes)

> **Type: ACCOUNT-LEVEL ROUTING CHANGE — docs-only for this repo.**
> No `ucl-notifier` code was modified, no worker redeploy happened, and
> `npm test`'s pins are untouched. This note exists so future sessions
> know the apex homepage is now served by a SECOND worker and where the
> rollback lever is.

## 1) What changed (and why)

The owner's final-corrected **landing page** (the Persian RTL Next.js 16
site iterated in the sandbox — promo banner `[question → headline →
channel CTA → bot CTA]` in corrected RTL order, edge-to-edge hero player
artwork, clean header, mobile after-hero fixed-bottom banner) is now
**live at https://sportsignal.ir/**.

The site's source lives in its own repo:
**`assadigit/SportSignal-Site`** (private) — deployed as Cloudflare
Worker **`sportsignal-site`** via `@opennextjs/cloudflare`
(version `7dc809cb-2550-4e80-af5c-bd6fcbde353d`, workers.dev enabled:
`sportsignal-site.sportsignal.workers.dev`).

## 2) The routing table (sportsignal.ir zone, as of this session)

The apex Custom Domain was **detached** from `ucl-notifier` (it was the
whole-hostname owner) and replaced by a proxied apex DNS record
(`AAAA 100::`) + zone Workers routes. Custom domains take precedence
over routes, so while the Custom Domain existed the new routes were
dormant; the switch was: add routes first → detach domain → create DNS.

| Pattern | Worker | Serves |
|---|---|---|
| `sportsignal.ir/` | `sportsignal-site` | the new landing page |
| `sportsignal.ir/_next/*` | `sportsignal-site` | Next.js build assets |
| `sportsignal.ir/img/*` | `sportsignal-site` | hero artwork (edge-to-edge players) |
| `sportsignal.ir/logo.svg` | `sportsignal-site` | landing logo |
| `sportsignal.ir/*` (catch-all) | `ucl-notifier` | **everything else** |
| `www.sportsignal.ir/*` | `ucl-notifier` | 301 → apex (R-06 unchanged) |
| `football.sportsignal.ir` | `ucl-notifier` | Custom Domain — Telegram webhook + API |

Route precedence was **empirically verified** before the switch on a
throwaway `rt-test.sportsignal.ir` hostname (specific `/` beat the
catch-all `/​*`; the test routes + DNS were deleted afterwards).

**Unchanged, all verified live post-switch (2026-11-08):**
`/healthz` 200 ok:true · `/admin` 200 · `/matches*` `/teams`
`/competitions` `/about` `/privacy` `/terms` `/data` `/sitemap` 200 ·
`/api/matches.json` 200 · `/robots.txt` `/sitemap.xml` 200 ·
`/players/*` `/ui/*` legacy assets 200 · `football.sportsignal.ir/webhook`
403 (protected, as designed) · www → 301 → apex (which now renders the
landing). The bot, crons, KV/D1, and the whole notify pipeline are
untouched (`/healthz` shows the cron heartbeat 5 min fresh).

The retired v13.236 public homepage markup is no longer served at `/`
(it lives on in `src/pages/public.ts` + git history). The landing page
carries its own matches list (football-data.org big-5 + UCL, live
verified: `source: "live"`, featured Man Utd–Aston Villa, 8 upcoming).

## 3) Rollback (restore the single-worker homepage)

1. Delete the four `sportsignal-site` zone routes (`/`, `/_next/*`,
   `/img/*`, `/logo.svg`) and the apex `AAAA 100::` DNS record.
2. Re-attach `sportsignal.ir` as a Custom Domain of `ucl-notifier`
   (Workers → ucl-notifier → Settings → Domains & Routes, or the
   `workers/domains` API).

No code changes needed in either repo — the rollback is pure routing.

## 4) Consequences for future sessions

- **Deploying `ucl-notifier` (`npx wrangler deploy`) is still safe** —
  its wrangler config owns only the `www.sportsignal.ir/*` route; the
  apex catch-all + landing routes were added via the API/zone config and
  wrangler will not remove them (they don't belong to its config).
  Verified against wrangler's route-reconciliation behavior (routes not
  in the deploying worker's config are left alone).
- The apex `/` response no longer comes from this repo's
  `src/pages/public.ts` — SEO parity baselines for the public page are
  NOT to be "fixed" to match the landing page; the landing is a separate
  surface with its own repo.
- The landing's `/api/matches` (its own route, same name as the
  protected one here) is NOT exposed on the zone — `/api/*` on the zone
  hits `ucl-notifier` (catch-all). The landing's API is reachable only
  on its workers.dev hostname.
