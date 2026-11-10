# SportSignal Match Centre — Locked Decisions Register

This register records the decisions agreed during the design conversation. Treat them as locked unless current repository evidence reveals a real contradiction or implementation blocker. Ask the product owner before changing a locked product decision.

## Foundation and product
1. Deliver both a complete long-page Match Centre overview and separate detailed section mockups.
2. Persian-first native RTL; document intentional English LTR adaptation.
3. Mobile-first; detailed mobile mockups per section, intentional desktop adaptation, tablet where useful.
4. Include representative missing-data states and a shared resilience blueprint.
5. High-fidelity mockups plus annotated implementation blueprints (dimensions/proportions/spacing/hierarchy/responsive behaviour/interaction).
6. Adaptive modular composition; desktop complementary columns/grids, mobile deliberate single column.
7. Hero portraits only when both available; otherwise central scoreboard with crests/names.
8. On mobile, both portraits side by side in upper hero area; if either missing, no-portrait scoreboard.
9. Layered hero hierarchy: match identity/score/status in hero; date/kickoff/venue in restrained secondary strip when available; detailed facts below.
10. Same hero framework across lifecycle with adaptive priorities: upcoming context, live score/status, finished result/scorers.
11. Sticky horizontal section navigation below hero.
12. Navigation contains only primary sections; no empty-section links.
13. Five destinations: خلاصه، جدول، فرم، بازی‌ها، ورزشگاه. FAQs/SEO outside nav.
14. Mobile nav horizontally scrollable, readable Persian labels, native RTL, subtle active underline.
15. Editorial continuous dark page with selective modules; avoid a card for every section.
16. Icy-blue accent restrained to active nav, selected controls, links and key interactions; semantic colors separate.
17. Editorial typography pairing; inspect existing Persian font and display numerals before introducing fonts.
18. Compact status labels; score dominant; live status not visually overpowering.
19. Summary includes editorial briefing and facts panel only when reliable data exists.
20. Deterministic library of conditional editorial templates; no AI.
21. Facts panel uses structured Persian label/value rows; omit missing values.
22. Standings show five-row neighbourhood around each team; merge overlapping/touching ranges; ellipsis if distant.
23. (Decision numbering continued; no separate new foundation decision was recorded.)

## Standings, form, schedule, editorial and lower-page sections
24. Standings columns: رتبه، تیم، بازی، تفاضل، امتیاز.
25. Highlight participating teams by typography only: stronger names/ranks and icy-blue text; no row background.
26. Separate standings windows use explicit discreet ellipsis; don't show intervening teams.
27. Standings are static; no expandable rows, team-page links or extra controls.
28. Form uses traditional compact W/D/L indicators plus separate latest-five list.
29. Form teams side by side on desktop; home right, away left in RTL; adapt if mobile readability requires.
30. Five compact circular W/D/L badges; restrained green/grey/red; accessible labels.
31. Form circles are non-interactive.
32. Latest-five results are compact vertical lists; opponent/score primary, date/competition secondary, W/D/L; link only if Match Centre page exists.
33. Home/away stats compared side by side: goals scored, goals conceded, clean sheets; competition-specific and sample-labelled.
34. Shared sample-window label per team's stats; disclose metric-specific differences only when material.
35. Clean numerical comparison; no decorative bars/charts.
36. On mobile stack home list first, away list below; no tabs/horizontal scroll.
37. Venue is a compact information panel: verified stadium, city, country.
38. No venue map, preview, external navigation or map dependency.
39. Seven-day schedule anchored to selected match date; daily groups; next 48h emphasized; remaining days expandable; cached data only.
40. One «نمایش روزهای بعد» control reveals remaining days; no per-day expanders.
41. Fixture rows are broadcast-style: kickoff, competition, teams/crests, score/upcoming indicator, status.
42. One discreet schedule coverage note; never imply empty dataset means no matches.
43. Prominent editorial briefing near beginning of Summary, conditional on sufficient verified info.
44. Editorial briefing uses open layout, not prominent card background.
45. One primary storyline plus optional one distinct secondary storyline.
46. Use a global editorial priority ranking to resolve competing narratives; factual validity and match relevance remain mandatory.
47. Narrative categories use fixed explicit thresholds and eligibility conditions; examples discussed are not automatic production defaults.
48. Each category has multiple manually written Persian variants; deterministic stable selection, no awkward auto-combination.
49. Lifecycle-specific narrative wording: upcoming pre-match, live retains pre-match, finished verified result/significance.
50. Hybrid narrative evidence: figures only when materially useful and already available at negligible cost; no extra provider/KV.
51. If no narrative qualifies, use concise factual briefing if useful; otherwise omit.
52. Factual briefing is one natural editorial paragraph.
53. Supporting facts live naturally in paragraph; no duplicate stat chips/evidence panel.
54. Desktop facts panel beside briefing; mobile beneath it.
55. Facts panel uses compact editorial label/value rows with dividers.
56. No additional heading before the briefing.
57. Compact editorial FAQ at bottom; useful answerable questions only; no FAQPage schema solely for rich results.
58. Multiple FAQ answers can remain open briefly; older opened answers collapse after a short delay when a new one opens.
59. Related matches use relevant cached fixtures only.
60. Prioritize upcoming fixtures involving either team, then previous meetings between the two teams.
61. Maximum four related matches; fewer when fewer qualify.
62. Compact broadcast-style related rows.
63. One unified list: upcoming first, then previous meetings.
64. Related matches after FAQ.
65. Reuse existing global website footer.
66. Include contextual Telegram channel promotion near page bottom (later refined).
67. Preferred concept: «اسپورت‌سیگنال را در تلگرام دنبال کنید تا هیچ مسابقه مهمی را از دست ندهید.» Optional supporting line about upcoming important matches.
68. Telegram promotion is a featured promotional block, not a tiny banner; distinct background, supporting illustration, Telegram branding, one CTA.
69. Original football-themed illustration incorporating Telegram; no stock/oversized Telegram logo.
70. Mobile Telegram block full-width; illustration adapts above/alongside text; clear tappable CTA.
71. Show Telegram promotion on every Match Centre lifecycle state.
72. Place it after related matches and immediately before global footer.

## Design system, responsive behaviour and interactions
73. Centered editorial desktop layout and reuse current SportSignal design system.
74. Controlled evolution: preserve design language; selectively improve components, spacing, typography and responsive behaviour.
75. Selective two-column desktop composition; hero and major editorial sections full-width.
76. Adaptive pairing; pair sections only where content and width justify it; don't force symmetry.
77. At intermediate widths switch to one column relatively early.
78. Adaptive spacing: compact tables/fixtures, generous editorial content.
79. Narrow mobile standings: all five columns visible; compact responsive table, no horizontal scroll or hidden columns.
80. Subtle functional motion for nav/accordions/expandable areas; no continuous decoration; respect reduced motion.
81. Sticky nav tracks active section on scroll and scrolls to selected destination; account for nav height.
82. Selecting tab updates active state immediately and smooth-scrolls; scroll tracking takes over.
83. Small floating back-to-top button appears after meaningful scroll; accessible and respects reduced motion.
84. Reuse existing loading patterns; no new framework.
85. Graceful branded image fallbacks; if one hero portrait fails, hide both and use central scoreboard; no extra retries.
86. Preserve page with compact fallbacks when optional data fails; distinguish missing, temporary unavailable and not applicable.
87. No dedicated desktop sidebar.
88. No additional desktop navigation; sticky horizontal nav only.
89. Small contextual freshness labels beside relevant data, especially live/time-sensitive; no misleading global timestamp or repetitive warnings.
90. Live match presentation is score and status only; no separate live strip, extra stats, event timeline or minute component.
91. Finished hero is score-focused with clear final status; available scorers below, grouped by team.
92. Upcoming hero gives kickoff time prominence; no countdown dependency.
93. Kickoff uses visitor's local timezone.
94. 24-hour time format; localized numerals.
95. Localized full date in hero; use visitor-local date when timezone conversion changes calendar day.

## Final hero decisions
96. Balanced face-off: both teams equal prominence, crests and names symmetrically around central score.
97. Subtle «میزبان» / «میهمان» labels; no extra color coding; home right and away left in Persian RTL.
98. Compact competition header above teams; secondary to teams and score; omit unavailable crest.
99. Subtle cinematic stadium atmosphere; dark texture/image and restrained lighting; never overpower foreground information.

**Implementation note:** Some earlier decisions contain shorthand. `specification.md` is the full behavioural interpretation and should be read alongside this register.
