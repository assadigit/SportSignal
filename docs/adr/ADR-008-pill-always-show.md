# ADR-008: The pill always shows — the 30-day tap-silence memory retires

- **Status:** Accepted (v13.253-alwaysshow, S43, 2026-11-10)
- **Context:** The owner's S43 directive, verbatim: "Do not add the quiet
  down option if user has tapped already. always show it." Since v13.241
  the floating channel pill had carried a no-nag memory: ANY tap on the
  bar body or the blue mark saved `sp_pill_joined<N>` (the suffix bumped
  once per redesign round; v13.252's generation was 7) and silenced the
  bar for that browser for 30 days. The memory kept biting the owner
  personally (checking their own channel = a tap = 30 days of silence):
  it was the root cause behind the S32 "invisible pill" and S42 "gone
  bar" reports, and S42's fix (a one-shot re-key) only reset the clock.
- **Decision:** The tap-silence memory is RETIRED outright. The inline
  controller reads and writes NO localStorage verdict at all — every key
  the earlier rounds left behind is simply never consulted again, so a
  browser holding an old verdict (the owner's included) sees the bar on
  the very next load, no migration needed. A tap (the bar body OR the
  blue mark) now does exactly ONE thing: opens the channel in a new tab
  (ADR-007's no-dismiss law stands — there is still no close button).
  The bar shows on every visit within the standing reveal gates: the 20%
  scroll rule (v13.242) and the <=600px mobile-only law (>=601px keeps
  showing the #tgFab bot FAB instead). Dropping below the scroll line is
  now the ONLY way the bar ever leaves the screen.
- **Alternatives considered:** (a) another one-shot re-key (the S42 fix)
  — rejected: it re-arms the same 30-day silence and guarantees the same
  owner report within days of any channel tap; (b) keep the memory but
  shorten the window — rejected: still "gone" whenever the owner checks
  their own channel; (c) also remove the 20% scroll gate — rejected: out
  of scope, that gate is a separate owner-directed reveal behavior (S31),
  not a tap memory, and it shows the bar within the first screen of
  scrolling on any page with content.
- **Consequences:** The bar is now a permanent surface on mobile: every
  visitor sees it on every visit (after the first 20% of scroll), even
  immediately after tapping through to the channel. Orphaned `sp_pill_*`
  keys left in visitors' localStorage become dead bytes (never read again
  — the same one-shot semantics as every re-key, but final). The one-shot
  re-key trick retires with it: any future "the bar is gone" report can
  no longer be the memory (suspect the SW cache or a desktop check first
  — the pill stays mobile-only). If the owner ever wants a no-nag window
  again, re-introduce a versioned key read+write pair in the controller
  (and re-pin the live check). Rollback: revert the v13.253 commit.
