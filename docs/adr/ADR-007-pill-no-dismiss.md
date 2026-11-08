# ADR-007: The floating pill carries no dismiss — the blue Telegram mark replaces the close button

- **Status:** Accepted (v13.244-grasspill, S33, 2026-11-08)
- **Context:** The owner's S33 direction, verbatim: "instead of current
  close button, replace it with telegram icon (Blue) with some glowing
  around it". The floating channel pill (phones, `<=600px`) had ONE link
  (the pill body) + a separate sibling x close button (the v13.241
  law: dismissing can never trigger the channel).
- **Decision:** The x close RETIRES. A second link — `#tgPillGo`, the
  official circled Telegram mark on the Telegram brand-blue capsule
  (`#2AABEE -> #1E96D3`) with its own standing sky-blue glow — takes
  its place at the pill's inline-end. BOTH controls open the channel
  and seed the same 30-day `sp_pill_joined3` silence. The pill therefore
  carries NO dismiss: a visitor who never taps sees it on every visit
  (within the 20% scroll gate), which matches the owner's
  maximum-promotion direction for this surface.
- **Alternatives considered:** (a) keep a hidden/secondary dismiss —
  rejected: contradicts the explicit "replace the close button"
  instruction; (b) make the blue mark dismiss instead of navigate —
  rejected: a Telegram icon that closes a Telegram promotion is
  misleading UX.
- **Consequences:** The dismissed localStorage verdict can no longer be
  written; the joined key moved to the `3` suffix (a one-shot reset so
  every verdict stored under the S30-S32 keys is zeroed exactly once —
  every returning visitor sees the redesigned pill). If the owner later
  wants a way to hide the pill without joining, re-add a sibling close
  per the v13.241 pattern (never inside the link) and re-key the memory
  again. Rollback: revert the v13.244 commit.
