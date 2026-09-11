# ⚽ Football-alert: UCL & Big Match Notifier (Cloudflare Worker V3)

> **Current build:** v11.52-live · full history in [`CHANGELOG.md`](CHANGELOG.md)

This project is a high-efficiency, serverless notification bot built on **Cloudflare Workers** using the **Football-Data.org V4 API**. Its primary purpose is to deliver timely, consolidated, and Persian-localized alerts for major European football matches to a designated Telegram channel.

---

## ⚡ TL;DR (Context Restorer)

This is the **V3 architecture** of the Football Notifier.

| Component | Function | Key Feature |
| :--- | :--- | :--- |
| **Data Source** | Football-Data.org V4 API | Stable, provides match data, scores, and status. |
| **Platform** | Cloudflare Worker (TypeScript) | Serverless execution, runs every 10 minutes via cron. |
| **State/Cache** | Cloudflare KV (`STATE`) | **Cache TTL: 6 Hours.** Prevents API quota overuse. |
| **Alert Logic** | 6 countdown offsets (2d, 1d, 12h, 1h, 30m, 0m). | Uses KV locks (`sent:`) to guarantee single message delivery per offset. |
| **Results** | Final scores for **UCL matches are CONSOLIDATED** into a single message; domestic big match results are sent individually. | Uses KV lock (`result_sent:`) to prevent resending final scores. |
| **Localization** | Full **Persian (فارسی)** support for teams, leagues, times, and digital format. | All output is formatted for an Iranian audience. |

---

## ⚙️ Detailed Architecture

### 1. Worker Execution Flow

The worker is triggered by a cron job (`*/10 * * * *`) defined in `wrangler.toml`. The main execution involves three phases:

1.  **Cache Management:** Checks the `STATE` KV store. If the match data is older than the `CACHE_TTL` (6 hours), a new request is made to the Football-Data API to fetch matches for the next 10 days. This minimizes API usage.
2.  **Notification Logic (Timed):** Iterates through scheduled matches and checks if they are due for any of the 6 countdown alerts. A unique key (`sent:<ID>:<offset>`) is used to lock the notification for that specific match and time offset, guaranteeing no duplicate alerts.
3.  **Results Logic (Finished):** Collects all matches with `status: "FINISHED"` that have not yet been reported (checked via the `result_sent:<ID>` lock).
    * **UCL Matches:** Grouped together and sent in a single, comprehensive "Final Results" message.
    * **Domestic Big Matches:** Sent individually.
    * A `result_sent` lock with a 7-day TTL is applied after sending to prevent score re-alerts.

### 2. Configuration & Environment Variables

These variables **must** be set in your Cloudflare Worker environment and are deliberately excluded from this repository via `.gitignore`.

| Variable | Usage | Security Note |
| :--- | :--- | :--- |
| `BOT_TOKEN` | Telegram Bot API token. | **HIGH: KEEP SECRET** |
| `CHAT_ID` | Target Telegram Channel/Group ID. | **HIGH: KEEP SECRET** |
| `API_TOKEN` | Football-Data.org API Key. | **HIGH: KEEP SECRET** |
| `ADMIN_TOKEN` | Admin panel auth token (Bearer header / login cookie). | **HIGH: KEEP SECRET** |
| `ADMIN_PASS` | Bootstrap admin password (PBKDF2 hash overrides it once changed). | **HIGH: KEEP SECRET** |
| `WEBHOOK_SECRET` | Telegram webhook secret token (`X-Telegram-Bot-Api-Secret-Token`). | **HIGH: KEEP SECRET** |
| `TEHRAN_TZ` | `"Asia/Tehran"` | Used for correct Persian timezone localization. |

### Bot commands (onboarding / per-user)

Anyone can join by starting the bot (`/start`); registration is stored in the
`users` KV key. Commands are Persian-first (see `/help` in the bot):

| Command | Action |
| :--- | :--- |
| `/start` | Join & receive notifications (idempotent) |
| `/stop` | Leave & stop notifications |
| `/help` | Full command reference |
| `/teams` | List followable teams w/ Persian names + numbers |
| `/follow 1,3,7` / `follow all` | Follow specific / all teams |
| `/next` | Upcoming matches for the teams you follow |
| `/timezone london` / `reset` | Set / reset your timezone |

### Testing

Run the full regression suite (self-check gates against the real `worker.ts`):

```sh
npm test
```

`npm run deploy` deploys via `wrangler` (requires `CLOUDFLARE_API_TOKEN` / account
secrets).

### 3. File Structure

* `src/worker.ts`: The core TypeScript worker code containing all configuration, API logic, translation functions, and notification logic.
* `src/teams.js` / `src/dedupe.js`: Shared helper modules (team-name normalization, match dedupe) imported by the worker.
* `wrangler.toml`: Cloudflare Worker configuration, defining the cron trigger and KV namespace binding (`STATE`).
* `assets/`: Static assets (`bg.jpg`) + self-hosted `Vazirmatn` web fonts (served by the `[assets]` binding; referenced via `@font-face`).
* `design-system/ucl-notifier/MASTER.md`: Visual design system / MASTER reference for the public page.
* `scripts/`: Self-check regression gates (assert real `worker.ts` behavior) — run by `npm test`.
* `CHANGELOG.md`: Per-version change history.
* `package.json` / `tsconfig.json`: Standard Node/TypeScript dependency and compiler configuration.
* `.dev.vars`: Local development secrets file (IGNORED by Git).