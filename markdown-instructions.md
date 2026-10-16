# Task: Implement Consistent Telegram Message Formatting Across Sportsignal

You are working on **Sportsignal**, an existing Telegram bot that provides football information, match schedules, scores, results, and related updates.

Your task is to audit, improve, and implement a consistent, professional message-formatting system across **all user-facing communications sent by the bot**.

I have provided a screenshot of a current Sportsignal message as a visual reference. The existing message contains useful information, but its visual hierarchy is weak, section headings do not stand out sufficiently, and the long list of results is difficult to scan quickly.

I want the bot to feel like a polished football information service, with clean typography, consistent formatting, and easily readable match updates.

**This is an implementation task, not merely a recommendation or planning task. Inspect the repository, implement the changes, run the relevant tests, and report the results.**

## 1. First, audit the existing codebase

Before modifying anything, inspect the repository to understand how Sportsignal works.

Identify:

- The programming language, Telegram framework/library, versions, and application entry points.
- All functions, modules, templates, and utilities responsible for generating Telegram message text.
- All paths through which the bot sends or edits text messages.
- Messages containing match results, fixtures, live scores, competitions, standings, notifications, subscriptions, commands, help information, welcome messages, error messages, and empty-state responses.
- Scheduled jobs, background workers, callback handlers, administrative notifications, and other less obvious message-producing code paths.
- Photo, video, document, and other media captions that contain text.
- Existing localization, Persian-language support, configuration, and message templates.
- Any existing parse modes, HTML escaping, Markdown formatting, or shared message-building utilities.

Search the entire repository for message-sending and message-editing operations. Do not assume every message passes through one central function.

Create an internal checklist of all outgoing message paths and use it to verify complete coverage.

Do not start by blindly changing every Telegram API call or setting a global parse mode. First understand the existing implementation and identify the safest integration strategy.

## 2. Choose an appropriate Telegram formatting strategy

Inspect the installed Telegram library and its supported features.

For ordinary text messages and captions, **prefer Telegram's HTML parse mode as the default formatting strategy** unless the project already has a reliable, consistently implemented MarkdownV2 system or another technically superior, supported approach.

HTML is preferred here because it provides straightforward formatting for football messages without requiring MarkdownV2's extensive punctuation escaping.

You may evaluate Telegram's newer structured Rich Messages if the installed library and actual deployment environment support them properly. Do not introduce an unnecessary API migration or upgrade dependencies solely to achieve basic styling.

Requirements:

- Use formatting syntax actually supported by Telegram's Bot API and the chosen library.
- Never assume ordinary GitHub/CommonMark Markdown renders correctly in bot messages.
- Do not use Telegram's legacy Markdown mode for a new implementation.
- Do not mix HTML and Markdown syntax within the same message.
- Keep the formatting approach consistent across the codebase.
- Verify how the selected library passes parse-mode options for messages, captions, and edited messages.
- Preserve existing inline keyboards, buttons, callback data, reply behavior, links, and interaction flows.

Consult the official documentation when necessary: https://core.telegram.org/bots/api#formatting-options

## 3. Build a centralized formatting system

Create or improve a shared message-formatting module that fits the existing architecture and programming language.

Do not scatter raw HTML tags or Markdown fragments throughout dozens of unrelated files.

The shared formatting system should provide suitable reusable helpers for:

- Building formatted message sections and headings.
- Formatting individual matches and scorelines.
- Formatting competition names and grouped result lists.
- Escaping dynamic text safely.
- Building notifications, fixture updates, live-score messages, and summaries.
- Applying a consistent style to messages that are edited after their initial delivery.
- Handling media captions where formatting is supported.

Adapt the names and structure of these helpers to the project's existing conventions rather than imposing an unrelated architecture.

### Critical escaping and reliability rules

When using HTML formatting:

- Escape all dynamic text before inserting it into a formatted template. This includes team names, league names, competition names, user-provided text, external data, and API-provided descriptions.
- Use the language's standard HTML-escaping utility or an equivalent well-tested implementation.
- Apply formatting tags only around the intended text segments.
- Do not escape the entire completed message after adding HTML tags, because that would cause the tags to appear as literal text.
- Never assume that external strings are safe HTML.
- Validate or safely handle dynamic URLs used in HTML links.
- Use only Telegram-supported HTML tags and attributes.
- Handle punctuation, ampersands, angle brackets, quotation marks, Persian characters, Latin team names, and emoji without corrupting messages.

Formatting failures must not silently prevent important football results from reaching users.

Do not suppress Telegram API errors or hide malformed markup behind a broad exception handler.

## 4. Establish Sportsignal's visual design system

Use the following principles for all applicable messages.

### A. Clear visual hierarchy

Use bold text for the main title and section headings.

Use smaller amounts of emphasis for match scores, important statuses, and key information.

Keep ordinary descriptive text unformatted unless there is a clear reason to emphasize it.

Distinguish between:

- The overall message title.
- The date or reporting period.
- Major sections, such as personalized matches and nightly results.
- Competition or league names.
- Individual fixtures and their results.
- Secondary information, such as match status or kickoff time.

Telegram's ordinary message formatting does not automatically create web-style heading sizes. Establish hierarchy through supported text formatting, concise labels, emoji, and line spacing.

### B. Consistent spacing

- Put each match on its own line.
- Separate major sections with a single blank line.
- Keep matches within the same competition grouped together.
- Avoid excessively large gaps between individual matches.
- Avoid uninterrupted walls of text.
- Keep messages compact enough to scan comfortably on mobile.
- Preserve logical grouping when a message becomes long.

Use actual newlines rather than unsupported HTML layout tags.

### C. Restrained, meaningful emoji

Use emoji as visual signposts, not decoration on every line.

Examples include:

- 🌙 for nightly summaries.
- ⚽ for football match sections.
- 🏆 for competitions and important results.
- 🔴 for live matches, where appropriate.
- ✅ or other suitable symbols for completed statuses.

Use the existing language and visual conventions where appropriate. Do not overload messages with emoji or randomly introduce new symbols.

### D. Consistent score presentation

Adopt a predictable format for every scoreline.

For example:

`Team A 2–1 Team B`

Apply this consistently to completed fixtures. Distinguish live, postponed, upcoming, and cancelled matches using the existing data and appropriate status labels.

Do not invent missing scores, change the meaning of a result, or assume that the first team is always the home team.

Highlight scores or important status labels selectively. Do not bold the entire contents of every line.

### E. Preserve language and direction

Sportsignal currently has Persian-language content and may display English club and competition names in the same message.

Preserve existing language selection, Persian wording, Unicode characters, Persian or Arabic numerals, emoji, and right-to-left readability.

Do not translate content, alter team names, introduce invisible direction-control characters, or add unsupported direction attributes as a formatting workaround.

Where Persian and Latin text appear together, use a consistent score format and neutral separators, then verify the resulting presentation in Telegram.

## 5. Redesign the nightly football-results message

Use the screenshot as the primary example of what needs improvement.

The redesigned message should follow a recognizable structure similar to this illustrative template:

🌙 **خلاصه نتایج شب**

*پنجشنبه ۲۳ مهر ۱۴۰۵*

⚽ **بازی‌های شما**

• تیم میزبان **۴–۰** تیم میهمان  
• تیم میزبان **۲–۱** تیم میهمان

🏆 **نتایج مهم شب**

**لیگ اروپا**

• تیم الف **۲–۱** تیم ب  
• تیم ج **۱–۰** تیم د

**لیگ کنفرانس اروپا**

• تیم ه **۰–۲** تیم و  
• تیم ز **۳–۱** تیم ح

📊 **سایر نتایج**

تعداد نتایج باقی‌مانده یا خلاصه مناسب آن‌ها

This is a formatting example, not a request to change the actual data, fixture order, competition selection, or result calculations. Use the existing source data and terminology.

Implement the example using the project's selected Telegram formatting syntax, rather than literally sending the Markdown characters shown above.

For the real message:

- Give the title and date a clear hierarchy.
- Keep personalized or otherwise prioritized matches near the top, preserving the current intended behavior.
- Group results by competition when the source data supports it.
- Make competition names immediately distinguishable from match lines.
- Keep scores easy to locate visually.
- Preserve all current result entries and existing business rules.
- Improve overly long messages without arbitrarily discarding useful information.

Do not try to implement ordinary Markdown tables using pipe characters. Use structured, readable text lines unless a supported structured Rich Messages implementation is deliberately selected.

## 6. Apply the same system to EVERY outgoing communication

The nightly results screenshot is only the initial example. The implementation must cover all applicable outgoing messages in Sportsignal.

Audit and update, as applicable:

1. Start and welcome messages.
2. Main menu responses and help messages.
3. Command responses.
4. Match schedules and upcoming fixtures.
5. Live-score updates and match alerts.
6. Completed match results.
7. Daily and nightly summaries.
8. League and competition results.
9. Standings, statistics, and team information.
10. User-specific match selections and personalized updates.
11. Subscription, preference, and notification messages.
12. Empty states, no-results responses, and unavailable-data messages.
13. User-facing errors and recovery messages.
14. Callback responses that edit an existing formatted message.
15. Administrative reports or other Telegram messages produced by the bot.
16. Text accompanying media, where Telegram supports formatted captions.

This list is not exhaustive. Discover additional message types in the repository and include them.

Do not force text formatting onto API fields that do not support it, inline keyboard labels, callback data, command metadata, or non-text content. Keep their current functionality intact.

Messages that are intentionally plain, such as very short acknowledgements or technical interface prompts, may remain plain where formatting would not help. However, they must still be reviewed, and every applicable message type must be accounted for.

## 7. Preserve all existing functionality

This is a presentation and message-rendering improvement, not a feature rewrite.

Do not change:

- Football data providers or API integrations.
- Match selection and filtering logic.
- Score calculations or match statuses.
- Competition grouping rules.
- Scheduling and notification timing.
- User preferences or subscription behavior.
- Database schemas or persisted data without a genuine necessity.
- Inline keyboard layouts, callback data, or navigation behavior.
- Existing language-selection and localization logic.

Avoid unrelated refactoring.

If you discover an existing bug directly related to formatting or message delivery, fix it where appropriate and explain the change.

## 8. Add meaningful tests

Implement tests for the new formatting system and update existing tests where necessary.

Cover at least:

**Escaping and formatting**
- Team and competition names containing `&`, `<`, `>`, quotes, and other problematic characters.
- Persian text mixed with English team names.
- Emoji, Unicode punctuation, and different numeral systems.
- Dynamic text containing strings that resemble HTML tags.
- Correct formatting of headers, scores, sections, links, and captions.

**Message coverage**
- Representative tests for every major outgoing message family.
- Confirmation that formatting options are passed correctly to Telegram.
- Edited messages retaining their intended formatting.
- Existing keyboards, buttons, and callback behavior remaining unchanged.

**Long and unusual messages**
- Large match summaries.
- Empty fixture lists.
- Missing or incomplete data.
- Unusually long competition or team names.
- Telegram message and caption length limits.

When a message must be split, split it safely at sensible section or match boundaries without breaking formatting entities or dropping results.

Use mocks, fixtures, snapshots, or other testing approaches that fit the existing project. Do not send experimental messages to real users or production chats just to test formatting.

Run the available automated tests, linting, type checks, and relevant project checks. Fix any regressions introduced by your changes.

## 9. Verify the implementation is complete

After implementation, perform a second repository-wide audit of all outgoing Telegram messaging operations.

For each discovered message path, confirm whether it:

- Uses the shared formatting system.
- Uses an intentionally supported alternative formatting approach.
- Remains plain by deliberate design.
- Cannot support formatting because of Telegram API or framework limitations.

Investigate and fix any accidental omissions.

Confirm that raw Markdown syntax is not accidentally displayed to users, HTML tags do not leak into messages, dynamic text is safely escaped, and valid messages are not rejected due to malformed formatting.

Where practical, provide representative before-and-after previews for the nightly summary, fixture list, live-score update, and a command response.

## 10. Final deliverables

Implement the changes directly in the repository.

At completion, provide a concise report containing:

1. The selected formatting strategy and why it was chosen.
2. The shared formatter or messaging infrastructure introduced or updated.
3. The message types and communication paths covered.
4. The main files changed.
5. The automated tests and checks run, including any failures.
6. Any remaining unformatted paths and the reason they could not be changed.
7. Any limitations of the selected Telegram library or API.

**Definition of done:** Sportsignal delivers consistently formatted, readable Telegram communications throughout the application, with correct escaping, preserved football functionality, no accidental loss of data, and tests demonstrating that the implementation works.

Do not stop after auditing the repository or writing a plan. Complete the implementation and verification within the current task, subject to the capabilities of the existing environment.