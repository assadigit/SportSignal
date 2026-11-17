# GA4 Evaluation — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

SEO Program Session 14 deliverable (route plan §10 + the phase file
`sportsignal-seo-implementation/phases/SESSION-14-PERFORMANCE-GSC-AND-OPTIONAL-GA4.md`).
This is a DOCUMENTATION deliverable — the GA4 evaluation (the phase file's
item 6: "Evaluate GA4 as optional: first check existing analytics,
privacy/legal/consent setup and performance impact. Do not install it
automatically if configuration/consent is unclear. Document pros/cons and
request owner approval in the report if necessary.").

## Decision: DEFER (do NOT install GA4 this session)

**Default: GA4 is NOT installed.** The consent management platform is NOT
established, the privacy policy is NOT updated for analytics cookies, and the
performance budget for the GA4 script is NOT allocated (the 10ms CPU cliff +
the mobile-first audience). The prerequisites (§5) must be met before any GA4
install. This is the phase file's stated default: "Do not install it
automatically if configuration/consent is unclear."

## 1. Existing analytics — what is ALREADY installed

**GA4 is NOT installed.** There is no `<script>` tag for GA4, no `gtag()`
call, no GA4 measurement ID (`G-XXXXXXXXXX`) anywhere in the codebase
(verified — `grep -rn "gtag\|G-[A-Z0-9]\{10\}" src/` returns zero matches).

**Cloudflare Web Analytics (cookieless RUM) IS installed.** The homepage
(`src/pages/public.ts`) ships the Cloudflare Insights beacon:

```html
<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js"
  data-cf-beacon='{"token": "fb7e7f1d66e84ed3b4572545c93ef538",
  "send": {"to": "/cdn-cgi/rum"}}'></script>
```

This is Cloudflare's **cookieless** Real User Monitoring (RUM) — it measures
page views, core web vitals (LCP/CLS/INP via the `elementTiming` + the
`web-vitals` library), and the country/device breakdown WITHOUT setting a
cookie. The `send.to: /cdn-cgi/rum` routes the beacon to the same origin (the
Cloudflare edge), NOT to a third-party analytics domain. The beacon is loaded
with `type="module"` (deferred by default — module scripts are deferred) so it
does NOT block the HTML parse or the first paint.

**This is the key finding: the site ALREADY has a privacy-respecting,
cookieless RUM that covers the core measurement needs (page views + CWV +
country/device) without the GA4 consent burden.** The owner can view this
data in the Cloudflare dashboard → Workers & Pages → `ucl-notifier` →
Analytics, OR the Cloudflare Web Analytics dashboard (if the zone is
registered for Web Analytics).

The SEO pages (match/team/competition/hubs — `src/seo/page-shell.ts`) do NOT
ship the Cloudflare beacon (it is on the homepage only). A future session
could extend the beacon to the SEO pages IF the owner wants the per-page-class
RUM — this is a one-line addition (the beacon `<script>` in the `pageShell`
head) with no consent burden (cookieless). This is the recommended path for
the per-page-class traffic data WITHOUT GA4 (see §4).

## 2. Privacy / legal / consent — NOT established

- **No cookie banner.** There is no consent management platform (CMP), no
  cookie banner, no consent dialog anywhere in the codebase.
- **No privacy policy page for analytics cookies.** The site has a
  `/methodology` + `/about` page but NO dedicated privacy policy that
  discloses analytics cookies or the GA4 data collection.
- **The jurisdictional assessment:**
  - Iran = 98.4% of clicks (248 / 250 — the 2026-11-15 GSC Countries.csv).
    Iran's data-protection regime (the 2022 Personal Data Protection Act +
    the 2023 bylaw) regulates personal-data processing; GA4's IP-based
    geolocation + the advertising-features default-on would need an
    assessment.
  - The Persian-speaking diaspora in GDPR jurisdictions (Germany 50 impr,
    Netherlands, UK — the S12 evidence) means a non-trivial share of
    impressions reach users in the EU/UK where GA4 requires EXPLICIT CONSENT
    before the script loads (the GDPR + the ePrivacy Directive — consent
    must be freely given, specific, informed, unambiguous; a pre-ticked box
    or a "by continuing to browse" banner does NOT meet the bar; the
    Schrems II ruling adds a data-transfer assessment for EU → US data
    flows).
  - The UK (UK GDPR + the PECR) mirrors the EU requirement.
- **The conclusion: a consent management platform + a privacy policy update
  are PREREQUISITES for any GA4 install.** The cookieless Cloudflare Web
  Analytics (§1) does NOT require consent (it sets no cookie, collects no
  personal data) — it is the right measurement path for the current state.

## 3. Performance impact — the GA4 script cost

GA4 adds a **render-blocking `<script>` tag + a `gtag()` call per page**:
- The `gtag.js` library (`https://www.googletagmanager.com/gtag/js?id=G-XXXX`)
  is a render-blocking fetch (unless loaded with `async` — but even `async`
  adds a network request + a JS parse/execute cost).
- The `gtag()` config call sends a beacon to Google on every page load.
- The `gtag()` event calls (page_view, scroll, click, etc.) add further JS
  execution.
- The GA4 script is ~50KB gzipped + the configuration + the event calls.

Against the SportSignal budget:
- The **10ms CPU cliff** on cold match renders (the C7 audit — 37
  exceededResources in 3h on v13.258; P99 up to ~124ms on cold renders). The
  GA4 script executes on the CLIENT (not the Worker), so it does NOT add to
  the Worker CPU. BUT the mobile-first audience (Mobile = 94.8% of clicks)
  on throttled 3G/4G connections in Iran would feel the GA4 script's
  fetch + parse + execute cost as a TBT (Total Blocking Time) + FCP (First
  Contentful Paint) regression.
- The **mobile-first audience** — the GA4 script is a render-cost addition
  that the mobile audience pays for every page load. The Cloudflare beacon
  (cookieless, deferred via `type="module"`, ~10KB) is the lighter
  alternative.
- The **render-cost law** (the spec §10 guardrail: "Avoid dynamic rendering
  work that materially increases Worker CPU, memory, KV operations or
  provider requests" — the GA4 script is CLIENT-side, not Worker-side, but
  the spirit of the guardrail — "do not add a render-cost addition without
  stating the budget" — applies). The GA4 script is a render-cost addition;
  the Cloudflare beacon is NOT (it is deferred + cookieless + lightweight).

## 4. Pros / cons

### Pros (the case for GA4)
- **Per-URL traffic data.** GA4 gives the page-path × the session count ×
  the engagement time. The Cloudflare beacon gives the page views but NOT
  the session/engagement-time dimension (it is page-view RUM, not session
  analytics).
- **The conversion funnel.** GA4 can track the Telegram CTA click → the
  bot join (if the owner wires the events). The Cloudflare beacon does NOT
  do funnel tracking.
- **User behavior.** GA4's engagement-rate, the scroll depth, the
  exit-pages, the user-flow reports. The Cloudflare beacon gives the CWV +
  the page views but NOT the behavior flow.
- **The query-to-page join.** GA4 + GSC linked gives the query → the page →
  the engagement (the "which query earns the engaged session" view). GSC
  alone gives the query → the page → the click, but NOT the engagement.

### Cons (the case against GA4)
- **The consent burden.** A CMP + a privacy policy update + the
  jurisdictional assessment (Iran + the EU/UK diaspora) are prerequisites
  (§2). This is a non-trivial legal + UX effort.
- **The performance cost.** The GA4 script is a render-blocking fetch + a
  JS execution cost per page (§3). The mobile-first audience on throttled
  connections pays this cost on every page load.
- **The privacy risk.** GA4's default configuration sets a cookie +
  collects the IP-based geolocation + the advertising-features default-on.
  The Schrems II data-transfer assessment (EU → US) adds a legal risk for
  the diaspora users.
- **The measurement redundancy.** The Cloudflare Web Analytics (cookieless,
  already installed — §1) covers the core measurement needs (page views +
  CWV + country/device). The GSC (the primary SEO measurement source —
  spec §11) covers the query → page → click. The marginal measurement that
  GA4 adds (the session/engagement/funnel) is the per-user behavior, which
  is NOT the SEO program's measurement gap (the SEO program measures the
  SERP performance, not the on-site behavior).
- **The Workers AI / Workers Paid plan priority.** A Workers Paid plan
  ($5/mo → 1M KV reads/day) is the durable fix for the KV-read quota issue
  (exceeded daily — Sessions 5-9) AND the prerequisite for any future `/en/`
  URL architecture (the S12-1 axis 2). The $5/mo is better spent on the
  Workers Paid plan than on the GA4 consent infrastructure (the CMP + the
  privacy policy + the legal assessment would cost more than $5/mo in
  owner/contractor time).

## 5. The prerequisites (the conditions for a future GA4 install)

If the owner decides to install GA4 in a future session, these prerequisites
MUST be met first:

1. **A consent management platform (CMP).** A cookie banner that meets the
   GDPR/ePrivacy + the UK GDPR/PECR bar (freely given, specific, informed,
   unambiguous consent; no pre-ticked boxes; no "by continuing to browse").
   The CMP must gate the GA4 script load (the script loads ONLY after the
   user consents). The CMP itself must be lightweight (the banner's CSS/JS
   must not regress the mobile FCP/LCP).
2. **A privacy policy update.** A dedicated `/privacy` page that discloses:
   the analytics cookies, the data collected (the GA4 measurement ID, the
   data retention, the data sharing with Google), the user's right to
   withdraw consent, the data-transfer assessment (Schrems II for the EU →
   US flow), the Iran data-protection compliance.
3. **A performance budget for the GA4 script.** The GA4 script must load
   with `async` (NOT render-blocking) + the CMP must gate the load (the
   script does NOT load until consent). The performance budget: the GA4
   script + the CMP must NOT regress the mobile LCP/INP/CLS by more than
   100ms (the CrUX / PageSpeed measurement before + after). The owner should
   measure the before + after with the PageSpeed Insights API (with an API
   key — the Session 14 attempt was quota-blocked without one).
4. **The jurisdictional assessment.** A documented decision on: whether the
   Iran data-protection regime applies (the 98.4% Iran audience); whether
   the EU/UK GDPR/ePrivacy applies (the diaspora impressions); whether the
   Schrems II data-transfer assessment is needed; whether the GA4
   advertising-features stay default-off (recommended — the site does NOT
   run ads).
5. **The Workers Paid plan decision.** The Workers Paid plan ($5/mo → 1M KV
   reads/day) is the priority budget allocation. The GA4 consent
   infrastructure (the CMP + the privacy policy + the legal assessment)
   should NOT be pursued BEFORE the Workers Paid plan — the KV-read quota
   issue is the chronic infrastructure problem; the GA4 measurement is a
   secondary measurement improvement.

## 6. The recommended path (the GA4 alternative)

**Do NOT install GA4.** Instead:

1. **Extend the Cloudflare Web Analytics beacon to the SEO pages.** The
   homepage already ships the cookieless beacon (§1). A future session could
   add the same one-line `<script>` to the `pageShell` head
   (`src/seo/page-shell.ts`) so the match/team/competition/hub pages get the
   same cookieless RUM (page views + CWV + country/device). This is a
   freeze-safe, no-consent, low-cost change (one line + the beacon is
   deferred via `type="module"`). The per-page-class traffic data is then
   available in the Cloudflare dashboard WITHOUT the GA4 consent burden.
   This is the recommended Session-14+ follow-up IF the owner wants the
   per-page-class RUM.
2. **Use the GSC monitoring view (the Session 14 deliverable).** The
   `seo-implementation/GSC-MONITORING-VIEW.md` report defines the per-page-
   class GSC monitoring view + the cadence. GSC is the primary SEO
   measurement source (spec §11). The GSC data covers the SERP performance
   (clicks / impressions / CTR / position per page class) WITHOUT any
   on-site script.
3. **Pursue the Workers Paid plan first.** The $5/mo is the durable fix for
   the KV-read quota + the prerequisite for any future `/en/` architecture
   (the S12-1 axis 2). This is the budget priority over the GA4 consent
   infrastructure.

## 7. When to revisit this decision

The GA4 DEFER decision should be revisited when:
- The owner wants the per-user behavior / the conversion funnel data that
  GSC + the Cloudflare beacon do NOT cover (the "which query earns the
  engaged session + the Telegram CTA click + the bot join" view).
- The Workers Paid plan is in place (the budget priority is resolved).
- The CMP + the privacy policy are established (the consent prerequisites
  are met).
- The performance budget is measured (the GA4 script + the CMP do NOT
  regress the mobile CWV by more than 100ms).

Until then, the Cloudflare Web Analytics (cookieless) + the GSC monitoring
view are the measurement stack. **Default: DEFER.**
