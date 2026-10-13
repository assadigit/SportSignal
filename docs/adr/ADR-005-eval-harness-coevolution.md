# ADR-005: The eval harness — real source, co-evolved in the same commit

- **Status:** Accepted (since inception; codified as a rule in RUNBOOK §11)
- **Context:** The check scripts don't test a BUILD — they `eval` the REAL
  TypeScript source (transformed: imports stripped, exports de-moduled,
  type annotations erased) via `scripts/lib/worker-src.js`, which
  concatenates root `src/*.ts` files in a hardcoded order with
  `// ===== src/<file>.ts =====` markers. Behavioral evals grab functions
  by signature (`grabFn`) — position-independent — but SEGMENT checks
  slice by marker, and several ORDER checks compare positions in the
  concat.
- **Decision:**
  1. Any file split MUST update `worker-src.js`'s order array in the SAME
     commit (groups contiguous, mirroring runtime order).
  2. Segment regexes that spanned the old file re-anchor to span the new
     GROUP (e.g. `cronSeg`: cron-preflight → monitoring).
  3. Order-sensitive checks must keep their meaning: the cron phases were
     placed BEFORE the shell precisely so "prewarm writes fold into the
     completion blob" (a position comparison) still reads true.
  4. Add structural locks per split (`#cronsplit`, `#matchsplit`,
     `#digestnotify`, `#botui`) so the next refactor can't silently
     satisfy a stale check with module content that wandered.
  5. `handleTelegramUpdate` stays whole in `bot.ts`: check-bot-edges
     slices the command/callback chains by content markers — that
     boundary is load-bearing.
- **Consequences:** The 817 checks test exactly what ships. The cost: any
  signature/module-layout change co-evolves harness + checks (the
  discipline every split in v13.74–v13.78 followed). `src/seo/` is NOT
  in the harness (real imports only) — that is why it is the clean
  exemplar and the path for new code.
