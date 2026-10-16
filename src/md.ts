// SportSignal — the MarkdownV2 ENTITY BUILDER (v13.106-mdstyle): the one
// home for rich-formatting construction. Every styled Telegram message in
// the bot composes through these helpers so the parse-safety discipline is
// structural, not per-call-site:
//
//   mdEscape(text) — escape EVERY reserved char (plain-text segments)
//   mdBold(text)   — *text*        (match headers, section titles)
//   mdItalic(text) — _text_        (competition / round labels)
//   mdCode(text)   — `text`        (kickoff times, ids, versions, commands)
//
// THE RULES (the v13.71/v13.90/v13.104 parse-400 graveyard, distilled):
//   1. OUTSIDE entity spans, every reserved char MUST be escaped. Telegram
//      rejects the WHOLE message on a single unescaped `(`, `.` or `>` —
//      deterministic parse-400, 3 retries, no outbox (non-dead 4xx never
//      outboxes), the owner sees nothing. mdEscape covers all 18 reserved
//      chars INCLUDING the three the legacy escapeMarkdownCharacters left
//      raw (`*`, `` ` `` and the backslash itself).
//   2. INSIDE code spans nothing is escaped — the backtick is the only
//      special char, so content stays RAW (escape-inside-code renders a
//      literal backslash: the v13.104 `13\.103\-…` lesson). mdCode therefore
//      takes digit/id/version/command strings only — never free text that
//      could carry a backtick.
//   3. Entities wrap ESCAPED inner text (mdBold/mdItalic escape their
//      content); a team name carrying `(` or `.` can never break the span.
//   4. No entity NESTING — Telegram's MarkdownV2 cannot nest bold inside
//      italic or vice versa; builders compose spans side by side.
//   5. RTL: the delimiters are ASCII-neutral markup that Telegram strips
//      at render time — no invisible direction-control characters are ever
//      injected (the fa strings keep their exact bidi shape).
//
// Pure leaf module (Layer 0): NO imports, NO type annotations on the
// exported functions (the eval harness slices and evals them as plain JS —
// the same discipline as toFaDigits/escapeMarkdownCharacters in utils.ts).

// All 18 MarkdownV2 reserved characters + the backslash itself. Outside
// code/pre spans every one of these must arrive escaped or as a deliberate
// entity delimiter.
var MDV2_RESERVED = "_*[]()~`>#+-=|{}.!\\";

// The escape regex is BUILT from a string (not a /…/ literal): the char
// class contains a backtick, and the eval harness's function slicer treats
// a raw backtick inside a regex literal as a template-literal opener — a
// RegExp built from a plain double-quoted string keeps every scanner that
// slices this module happy (same semantics, zero ambiguity). The class
// metacharacters ([, ], \, -, ^) are escaped so the class covers ALL of
// MDV2_RESERVED (an unescaped ] would terminate the class early — that
// bug made the first cut escape NOTHING, caught by check-mdstyle).
var MDV2_ESCAPE_SRC = MDV2_RESERVED.replace(/[-\\^\[\]]/g, "\\$&");
var MDV2_ESCAPE_RE = new RegExp("[" + MDV2_ESCAPE_SRC + "]", "g");

export function mdEscape(text) {
  return String(text == null ? "" : text).replace(MDV2_ESCAPE_RE, "\\$&");
}

// *bold* — the match header / section title entity. Inner text escaped.
export function mdBold(text) {
  return "*" + mdEscape(text) + "*";
}

// _italic_ — the competition / round / stage label entity. Inner text
// escaped. Never nested inside mdBold (rule 4).
export function mdItalic(text) {
  return "_" + mdEscape(text) + "_";
}

// `code` — monospace for kickoff times, chat ids, versions, slash commands.
// Content stays RAW (rule 2): code spans have no inner escaping, so callers
// pass digit/identifier strings only — never team names or free text.
export function mdCode(text) {
  return "`" + String(text == null ? "" : text) + "`";
}
