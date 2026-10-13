# ADR-003: Fail-closed KV — when state can't persist, degrade to silence

- **Status:** Accepted (v13.36-nospam, extended v13.71-admintools)
- **Context:** The execution lock, dedupe records, status maps and admin
  gates all guard against duplicate or unauthorized behavior. Their
  failure mode must be chosen deliberately, not inherited.
- **Decision:** Every stateful guard fails CLOSED: the execution-lock put
  failing defers the whole tick (no single-flight = no dedupe = no sends);
  the status-map save failing suppresses status-change alerts that tick;
  admin routes fail to 401/login; the outbox drain aborts when its
  keep-list can't persist. The exception: provider/pool reads fail OPEN
  to the cached pool (fixtures are static; a stale row beats a dead bot)
  — but writes still never happen unrecorded.
- **Consequences:** Quota exhaustion and KV outages produce a QUIET bot
  with loud logs + healthz degradation, never a spamming one. Locked by
  `#nospam8`/`#nospam10` and the phase-error `alertPhaseError` pages.
