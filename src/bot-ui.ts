// SportSignal — the bot's tappable-UI layer: the persistent reply keyboard
// (replyKeyboard), the label→slash normalizer (normalizeCommand) and the
// v13.49 shared message builders (teams grid + tz picker). handleTelegramUpdate
// (the webhook router) stays in bot.ts. Extracted from bot.ts in
// v13.78-botui.
import { toFaDigits, escapeMarkdownCharacters } from "./utils";
import { normalizeTeamName } from "./teams";
import { translateTeam } from "./translate";

// v13.23-buttons: persistent reply keyboard (buttons at the bottom of the
// chat). Users tap buttons instead of typing slash commands. The button
// labels are Persian (fa) or English (en). When tapped, Telegram sends the
// label as a message — handled as a command alias below.
// v13.24-featured: added a "⭐ Featured match" button (first row, full width).
export function replyKeyboard(lang) {
  if (lang === "en") {
    return { keyboard: [
      [{ text: "\u2B50 Featured match" }],
      [{ text: "Upcoming" }, { text: "Tables" }],
      [{ text: "Teams" }, { text: "Timezone" }],
      [{ text: "Language" }, { text: "Help" }],
      [{ text: "Stop" }]
    ], resize_keyboard: true };
  }
  return { keyboard: [
    [{ text: "\u2B50 \u0628\u0627\u0632\u06CC \u0628\u0631\u062A\u0631" }],
    [{ text: "\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648" }, { text: "\u062C\u062F\u0648\u0644\u200C\u0647\u0627" }],
    [{ text: "\u062A\u06CC\u0645\u200C\u0647\u0627" }, { text: "\u0632\u0645\u0627\u0646" }],
    [{ text: "\u0632\u0628\u0627\u0646" }, { text: "\u0631\u0627\u0647\u0646\u0645\u0627" }],
    [{ text: "\u0627\u0646\u0635\u0631\u0627\u0641" }]
  ], resize_keyboard: true };
}

// Normalize button labels to slash commands (so the existing if-chain
// handles them without duplication).
export function normalizeCommand(text) {
  if (!text) return text;
  const t = text.trim();
  // Persian button labels → slash commands
  const faMap = {
    "\u2B50 \u0628\u0627\u0632\u06CC \u0628\u0631\u062A\u0631": "/featured",
    "\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648": "/next",
    "\u062C\u062F\u0648\u0644\u200C\u0647\u0627": "/tables",
    "\u062A\u06CC\u0645\u200C\u0647\u0627": "/teams",
    "\u0632\u0628\u0627\u0646": "/lang",
    "\u0632\u0645\u0627\u0646": "/timezone",
    "\u0631\u0627\u0647\u0646\u0645\u0627": "/help",
    "\u0627\u0646\u0635\u0631\u0627\u0641": "/stop"
  };
  if (faMap[t]) return faMap[t];
  // English button labels → slash commands
  const enMap = { "\u2B50 Featured match": "/featured", "Upcoming": "/next", "Tables": "/tables", "Teams": "/teams", "Timezone": "/timezone", "Language": "/lang", "Help": "/help", "Stop": "/stop" };
  if (enMap[t]) return enMap[t];
  return text;
}

// v13.49-buttons: shared message builders (grid + pickers)
// teamsMessageText: the /teams body — numbered list kept for the
// /follow <numbers> flow, status line, and the tap hint. The inline grid
// below the text is the tap-to-toggle surface (teamsGridKeyboard).
export function teamsMessageText(lang, selected, master) {
  const lines = master.map((t, i) => {
    const isSel = selected && selected.some((s) => normalizeTeamName(s) === normalizeTeamName(t));
    return (isSel ? "\u2705 " : "") + String(i + 1) + "\\. " + escapeMarkdownCharacters(translateTeam(t));
  });
  const status = selected
    ? (lang === "en" ? "Selected teams: " + selected.length : "\u062A\u0639\u062F\u0627\u062F \u062A\u06CC\u0645 \u0627\u0646\u062A\u062E\u0627\u0628\u06CC: " + toFaDigits(String(selected.length)))
    : (lang === "en" ? "Following all teams\\." : "\u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627 \u062F\u0646\u0628\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F\\.");
  const header = lang === "en" ? "*Teams you can follow:*" : "*\u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0642\u0627\u0628\u0644 \u062F\u0646\u0628\u0627\u0644\u200C\u06A9\u0631\u062F\u0646:*";
  const footer = lang === "en" ? "Tap a button to follow/unfollow, or /follow 1,3,7" : "\u0628\u0631\u0627\u06CC \u0627\u0646\u062A\u062E\u0627\u0628/\u062D\u0630\u0641 \u0631\u0648\u06CC \u062F\u06A9\u0645\u0647\u200C\u0647\u0627 \u0628\u0632\u0646\u06CC\u062F \u06CC\u0627 /follow 1,3,7";
  return header + "\n\n" + lines.join("\n") + "\n\n" + status + "\n\n" + footer;
}

// The inline toggle grid: row 0 = follow-all reset; then the master list
// two per row, \u2705 on followed teams. callback_data tf:<1-based index>.
export function teamsGridKeyboard(selected, master) {
  const rows = [[{ text: "\u2705 " + "\u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627", callback_data: "tf:all" }]];
  for (let i = 0; i < master.length; i += 2) {
    const row = [];
    for (let j = i; j < i + 2 && j < master.length; j++) {
      const isSel = selected && selected.some((s) => normalizeTeamName(s) === normalizeTeamName(master[j]));
      row.push({ text: (isSel ? "\u2705 " : "") + translateTeam(master[j]), callback_data: "tf:" + (j + 1) });
    }
    rows.push(row);
  }
  return { inline_keyboard: rows };
}

// tzStatusText + tzPickerKeyboard: the /timezone reply and its quick-pick
// grid (cities resolve via the same TZ_ALIASES as /timezone <city>).
export function tzStatusText(lang, tz) {
  const head = lang === "en" ? "Your timezone: " : "\u23F0 \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627: ";
  const tail = lang === "en" ? "\nPick below or /timezone <city>" : "\n\u0627\u0632 \u062F\u06A9\u0645\u0647\u200C\u0647\u0627\u06CC \u067E\u0627\u06CC\u06CC\u0646 \u06CC\u0627 /timezone <\u0634\u0647\u0631>";
  return head + escapeMarkdownCharacters(tz) + tail;
}

export function tzPickerKeyboard(lang) {
  const cities = lang === "en"
    ? [["Tehran", "tehran"], ["London", "london"], ["Paris", "paris"], ["Berlin", "berlin"], ["New York", "new-york"], ["Los Angeles", "los-angeles"], ["Dubai", "dubai"], ["Sydney", "sydney"], ["Tokyo", "tokyo"]]
    : [["\u062A\u0647\u0631\u0627\u0646", "tehran"], ["\u0644\u0646\u062F\u0646", "london"], ["\u067E\u0627\u0631\u06CC\u0633", "paris"], ["\u0628\u0631\u0644\u06CC\u0646", "berlin"], ["\u0646\u06CC\u0648\u06CC\u0648\u0631\u06A9", "new-york"], ["\u0644\u0633\u200C\u0622\u0646\u062C\u0644\u0633", "los-angeles"], ["\u062F\u0628\u06CC", "dubai"], ["\u0633\u06CC\u062F\u0646\u06CC", "sydney"], ["\u062A\u0648\u06A9\u06CC\u0648", "tokyo"]];
  const rows = [];
  for (let i = 0; i < cities.length; i += 3) {
    rows.push(cities.slice(i, i + 3).map((c) => ({ text: c[0], callback_data: "tz:" + c[1] })));
  }
  rows.push([{ text: "\uD83D\uDD04 " + (lang === "en" ? "Reset" : "\u0631\u06CC\u0633\u062A"), callback_data: "tz:reset" }]);
  return { inline_keyboard: rows };
}

