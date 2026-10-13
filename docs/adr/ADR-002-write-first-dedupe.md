# ADR-002: Write-first dedupe — a saved record before every send

- **Status:** Accepted (v13.36-nospam, hardened v13.42-rekindle)
- **Context:** The original flow sent a Telegram message, then saved the
  dedupe record. A failed KV write re-armed the send → duplicate
  notifications on every sweep (the "bot is spamming" incidents). Garbage
  messages are worse than silence: users mute the bot and silence is
  permanent.
- **Decision:** The dedupe record is persisted BEFORE the send. If the KV
  save fails, the send is deferred to the next tick (fail-closed). MEM_DEDUPE
  (the in-memory isolate Set) covers the same-isolate case when KV is down;
  it is only seeded on SUCCESSFUL saves so failed sends stay retryable.
  "Once an event has fired it never fires again" — `expiresAt` is KV-size
  hygiene, never a re-arm.
- **Consequences:** Under KV quota exhaustion, notifications pause rather
  than duplicate. Every send path (`notify-engine`'s gate,
  `digest-bigmatch`'s broadcasts, `digest-morning`'s mark-before-send)
  follows the same order. Locked by `#nospam*` checks + behavioral evals
  (the send-deferred tests in check-no-miss).
