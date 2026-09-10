# Design System — UCL & Big Match Notifier

> **Source of truth:** this project has no separate component library. The
> shipped UI lives **inside `src/worker.ts`** as three server-rendered templates:
> `PUBLIC_PAGE` (the fan-facing match page), `LOGIN_PAGE` (admin auth), and
> `ADMIN_PAGE` (the admin panel). Read this file for the *intent*; read the
> templates for the *implementation*. The templates always win.

**Product:** a Persian-first Telegram football match notifier. The web page
exists to show what the Telegram bot delivers: upcoming matches, an
auto-updating "next big match" hero, results, and league standings — localized
into Persian for an Iranian fan audience.
**Audience:** Iranian football fans, on phone and desktop, dark-mode default,
reading right-to-left Persian.

---

## Brand Voice

- **Language:** Persian (فارسی) is the home language; English is a full
  toggle (`fa` / `en`) that flips `dir`/`lang` on `<html>`.
- **Localization depth:** Persian digits (`faNum`), manually re-ordered
  `fa-IR` dates (never year-first `toLocaleString` output), and Vazirmatn.
- **Emoji as identity:** the brand glyph is `⚽`; emoji do icon work all over
  the UI (flags, competitions, live dot, derby badge). This is a deliberate
  Telegram-native voice, kept even where an icon set would be "cleaner".

## Color System

Dark is the default and the identity; light is a fully-supported second theme
via `[data-theme="light"]` on `<html>` (persisted in `localStorage`).

| Role | Dark | Light |
|---|---|---|
| Background `--bg` | `#0f172a` | `#f8fafc` |
| Surface `--card` | `#1e293b` | `#ffffff` |
| Surface glass | `rgba(30,41,59,.55)` | `rgba(255,255,255,.62)` |
| Text `--text` | `#e2e8f0` | `#0f172a` |
| Muted `--muted` | `#94a3b8` | `#64748b` |
| Border `--border` | `#334155` | `#e2e8f0` |
| Accent `--accent` | `#2563eb` / `#1d4ed8` | same |
| Link `--link` | `#93c5fd` | `#1d4ed8` |
| Score `--score` | `#4ade80` | `#15803d` |
| Countdown `--countdown` | `#93c5fd` | `#2563eb` |
| Danger `--danger` | `#f87171` | `#dc2626` |
| Footer `--footer` | `#94a3b8` | `#64748b` |

**Contrast policy (AA):** muted/secondary text on dark sits at ≥ 4.5:1. If you
brighten the page background, re-check the muted footer and score tokens before
shipping — these are the first to slip.

**Glow language:** a restrained brand glow is part of the identity — the LIVE
dot ping, the derby amber, the UCL gold, the green big-match progress bar.
Keep alphas low (≤ ~0.3) and blurs tight; the page should read *premium dark*,
not neon.

## Typography

- **Family:** Vazirmatn (variable-capable Persian face), **self-hosted** in
  `assets/fonts/` as woff2 for weights 400/500/600/700/800 — do not revert to
  the CDN `<link>`.
- **Scale (public page):** ~10.5–15px for meta/labels/info, 17px scores,
  27px display heads. Weights do hierarchy: 600 meta, 700 team names, 800
  display/score.
- **Numerals:** `font-variant-numeric: tabular-nums` on scores, standings
  points, the bigbar clock, and overlay timers so countdown text never reflows.

## Layout & Surfaces

- **Container:** ~760px centered column; the page is a long scroll of
  self-contained glass cards (`backdrop-filter` blur) over the `/bg.jpg` photo
  with `--glow1/--glow2` radial washes and a scrim.
- **The hero:** the **bigbar** at the top is the *single* live countdown on the
  page (progress bar + `fmtCountdown` clock). Every other "when" is a **static
  kickoff time** (`fmtKick`) — list pills, standings "first match" overlays,
  and cards. Do not add more ticking countdowns; one is the design.
- **Re-render policy:** `load()` re-fetches every 60s, but `render()` skips
  redrawing a list whose signature (`listSig`) is unchanged — so the DOM, scroll
  position, and focus survive an unchanged tick. Entrance `rise` animation plays
  only on first render (`.stable` class suppresses it on updates).
- **Themes:** dark default; `prefers-reduced-motion` kills all animation;
  `prefers-reduced-transparency` demotes glass cards to solid.

## Accessibility Floor

- `:focus-visible` outline (2px `--accent`) on all interactive elements.
- Focusable controls keep their focus ring — never `outline:none` on a form
  control (timezone select/filter was the historical offender).
- Forms: `label[for]` + `id` pairing, `name` attributes for password managers,
  `role="alert"` on error regions, `aria-live` on toasts.
- Filled buttons are `disabled` while their request is in flight
  (`busy()`/`done()` guards — broadcast/test/simulate).
- Touch targets ≥ ~40px; the topbar wraps on narrow screens.

## Admin Panel

- **Auth:** username/password → PBKDF2-hashed credential (or `ADMIN_PASS`
  secret as bootstrap) → HttpOnly `admin_auth` cookie. `ADMIN_TOKEN` is the
  Bearer equivalent for API tooling. No empty passwords, no grace backdoors.
- **Dangerous actions:** broadcast confirms with the recipient count before
  sending and disables while in flight.

## Team-Name Translation (Persian)

Persian club names come from **Persian Wikipedia** (the English-article `fa`
interwiki link is the canonical Persian name), not from a hand-written list for
every club — that doesn't scale. `translateTeam` reads the in-memory `FA_TEAMS`
dict (a fast cache) with exact → normalized → stem fallbacks. The dict is
**seeded/grown by `scripts/fa-names-from-wikipedia.js`**: it pulls the live
rosters, resolves each club via en.wikipedia → fa langlink, strips the
"باشگاه فوتبال " prefix, and prints ready-to-paste `FA_TEAMS` lines.

- Run it whenever new clubs appear; review the output (rare disambiguation
  misses — e.g. a player/car article winning the search — fix those a handful
time) and paste the new lines into `FA_TEAMS`.
- Wikipedia's anonymous API is rate-limited: the script paces (~1s) and backs
off; for production bulk you'd cache results in KV long-term instead of the
worker hitting Wikipedia at runtime (the 50-subrequest budget doesn't allow
per-pixel runtime lookups).

## File Ownership

- `src/worker.ts` — the three UI templates (also the bot + API bundle).
- `assets/bg.jpg`, `assets/fonts/Vazirmatn-*.woff2` — page assets served by the
  worker.
- `scripts/check-*.js` — regression scripts that regex-extract logic from
  `src/worker.ts` (canonical normalizer `normTeamName`, `canonDedupe`, FA
  dictionary, etc.). If you refactor any of those symbols, update the scripts in
  the same change.
