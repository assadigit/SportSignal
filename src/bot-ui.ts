// SportSignal — the bot's tappable-UI layer: the persistent reply keyboard
// (replyKeyboard), the label→slash normalizer (normalizeCommand) and the
// v13.49 shared message builders (teams grid + tz picker). handleTelegramUpdate
// (the webhook router) stays in bot.ts. Extracted from bot.ts in
// v13.78-botui.
import { toFaDigits, escapeMarkdownCharacters, zonedHm, tzOffsetMinutes } from "./utils";
// v13.106-mdstyle: entity builders (bold team rows, monospace local times).
import { mdBold, mdCode } from "./md";
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
    return (isSel ? "\u2705 " : "") + String(i + 1) + "\\. " + mdBold(translateTeam(t));
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

// tzStatusText (v13.90-tzonboard): the /timezone reply and the picker's
// status re-render. Now carries the user's CURRENT local time + UTC offset
// in that zone \u2014 the self-serve confirmation signal ("does this match
// your wall clock?") \u2014 plus the change affordance.
export function tzStatusText(lang, tz) {
  const local = tzLocalTime(tz, lang);
  const off = tzUtcOffset(tz);
  const timePart = local ? " \u2014 " + (lang === "en" ? "your time: " : "\u0633\u0627\u0639\u062A\u0650 \u0634\u0645\u0627: ") + mdCode(local) + (off ? " \\(" + escapeMarkdownCharacters(off) + "\\)" : "") : "";
  const head = lang === "en" ? "\u23F0 Your timezone: " : "\u23F0 \u0645\u0646\u0637\u0642\u0647\u0654 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627: ";
  const tail = lang === "en" ? "\nPick your region below or /timezone \\<city\\>" : "\n\u0645\u0646\u0637\u0642\u0647\u0654 \u062E\u0648\u062F \u0631\u0627 \u0627\u0632 \u062F\u06A9\u0645\u0647\u200C\u0647\u0627\u06CC \u0632\u06CC\u0631 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F \u06CC\u0627 /timezone \\<\u0634\u0647\u0631\\>";
  return head + escapeMarkdownCharacters(tz) + timePart + tail;
}

// v13.116-tzproof: the owner's label correction (2026-10-17): the
// quick-pick reads \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC (\u0627\u06CC\u0631\u0627\u0646) ("Timezone (Iran)"), NOT
// \u062A\u0647\u0631\u0627\u0646 \u2014 the zone is the country, not the city; the reset's
// default follows the same rule.
// tzPickerKeyboard (v13.90-tzonboard): the picker HUB \u2014 the Iran one-tap
// quick-pick (the majority audience) with its live local time, the six
// region pages (tzr: callbacks), and the reset. City buttons live on the
// region pages (tzRegionKeyboard); this hub stays one message deep.
export function tzPickerKeyboard(lang) {
  const en = lang === "en";
  const rows = [];
  const tehranT = tzLocalTime("Asia/Tehran", lang);
  rows.push([{ text: "\uD83C\uDDEE\uD83C\uDDF7 " + (en ? "Timezone (Iran)" : "\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC (\u0627\u06CC\u0631\u0627\u0646)") + (tehranT ? " \u00B7 " + tehranT : ""), callback_data: "tz:tehran" }]);
  const regions = [
    ["eu", "\uD83C\uDDEA\uD83C\uDDFA", "\u0627\u0631\u0648\u067E\u0627", "Europe"],
    ["mideast", "\uD83C\uDF0D", "\u062E\u0627\u0648\u0631\u0645\u06CC\u0627\u0646\u0647", "Middle East"],
    ["easia", "\uD83C\uDF0F", "\u0634\u0631\u0642 \u0622\u0633\u06CC\u0627", "East Asia"],
    ["namerica", "\uD83C\uDF0E", "\u0622\u0645\u0631\u06CC\u06A9\u0627\u06CC \u0634\u0645\u0627\u0644\u06CC", "North America"],
    ["samerica", "\uD83C\uDF0E", "\u0622\u0645\u0631\u06CC\u06A9\u0627\u06CC \u062C\u0646\u0648\u0628\u06CC", "South America"],
    ["oceania", "\uD83C\uDF0F", "\u0627\u0642\u06CC\u0627\u0646\u0648\u0633\u06CC\u0647", "Oceania"]
  ];
  for (let i = 0; i < regions.length; i += 2) {
    const row = [];
    for (let j = i; j < i + 2 && j < regions.length; j++) {
      row.push({ text: regions[j][1] + " " + (en ? regions[j][3] : regions[j][2]), callback_data: "tzr:" + regions[j][0] });
    }
    rows.push(row);
  }
  rows.push([{ text: "\uD83D\uDD04 " + (en ? "Reset (Iran default)" : "\u0631\u06CC\u0633\u062A (\u067E\u06CC\u0634\u0654\u0641\u0631\u0636: \u0627\u06CC\u0631\u0627\u0646)"), callback_data: "tz:reset" }]);
  return { inline_keyboard: rows };
}

// v13.90-tzonboard: the region map \u2014 every picker city as [fa, en, slug, tz].
// The slug is the tz: callback payload and MUST have a TZ_ALIASES entry
// (users.ts) \u2014 the harness locks that invariant. Canonical tz strings stay
// in the 4th slot so the current-zone \u2705 mark compares exactly.
export var TZ_REGIONS = {
  eu: [
    ["\u0644\u0646\u062F\u0646", "London", "london", "Europe/London"],
    ["\u067E\u0627\u0631\u06CC\u0633", "Paris", "paris", "Europe/Paris"],
    ["\u0628\u0631\u0644\u06CC\u0646", "Berlin", "berlin", "Europe/Berlin"],
    ["\u0645\u0627\u062F\u0631\u06CC\u062F", "Madrid", "madrid", "Europe/Madrid"],
    ["\u0631\u0645", "Rome", "rome", "Europe/Rome"],
    ["\u0622\u0645\u0633\u062A\u0631\u062F\u0627\u0645", "Amsterdam", "amsterdam", "Europe/Amsterdam"],
    ["\u0627\u0633\u062A\u0627\u0646\u0628\u0648\u0644", "Istanbul", "istanbul", "Europe/Istanbul"],
    ["\u0645\u0633\u06A9\u0648", "Moscow", "moscow", "Europe/Moscow"],
    ["\u0648\u06CC\u0646", "Vienna", "vienna", "Europe/Vienna"],
    ["\u0622\u062A\u0646", "Athens", "athens", "Europe/Athens"]
  ],
  mideast: [
    ["\u062F\u0628\u06CC", "Dubai", "dubai", "Asia/Dubai"],
    ["\u062F\u0648\u0642\u0647", "Doha", "doha", "Asia/Qatar"],
    ["\u0631\u06CC\u0627\u0636", "Riyadh", "riyadh", "Asia/Riyadh"],
    ["\u06A9\u0648\u06CC\u062A", "Kuwait City", "kuwait", "Asia/Kuwait"],
    ["\u0645\u0646\u0627\u0645\u0647", "Manama", "manama", "Asia/Bahrain"],
    ["\u0645\u0633\u0642\u0637", "Muscat", "muscat", "Asia/Muscat"]
  ],
  easia: [
    ["\u0628\u0627\u0646\u06A9\u0648\u06A9", "Bangkok", "bangkok", "Asia/Bangkok"],
    ["\u0633\u0646\u06AF\u0627\u067E\u0648\u0631", "Singapore", "singapore", "Asia/Singapore"],
    ["\u06A9\u0648\u0627\u0644\u0627\u0644\u0627\u0645\u067E\u0648\u0631", "Kuala Lumpur", "kuala-lumpur", "Asia/Kuala_Lumpur"],
    ["\u0647\u0646\u06AF\u200C\u06A9\u0646\u06AF", "Hong Kong", "hong-kong", "Asia/Hong_Kong"],
    ["\u062A\u0648\u06A9\u06CC\u0648", "Tokyo", "tokyo", "Asia/Tokyo"],
    ["\u0633\u0626\u0648\u0644", "Seoul", "seoul", "Asia/Seoul"],
    ["\u0634\u0627\u0646\u06AF\u0647\u0627\u06CC", "Shanghai", "shanghai", "Asia/Shanghai"],
    ["\u062C\u0627\u06A9\u0627\u0631\u062A\u0627", "Jakarta", "jakarta", "Asia/Jakarta"]
  ],
  namerica: [
    ["\u0646\u06CC\u0648\u06CC\u0648\u0631\u06A9", "New York", "new-york", "America/New_York"],
    ["\u062A\u0648\u0631\u0646\u062A\u0648", "Toronto", "toronto", "America/Toronto"],
    ["\u0644\u0633\u200C\u0622\u0646\u062C\u0644\u0633", "Los Angeles", "los-angeles", "America/Los_Angeles"],
    ["\u0634\u06CC\u06A9\u0627\u06AF\u0648", "Chicago", "chicago", "America/Chicago"],
    ["\u062F\u0646\u0648\u0631", "Denver", "denver", "America/Denver"],
    ["\u0648\u0646\u06A9\u0648\u0648\u0631", "Vancouver", "vancouver", "America/Vancouver"],
    ["\u0645\u06A9\u0632\u06CC\u06A9\u0648\u0633\u06CC\u062A\u06CC", "Mexico City", "mexico-city", "America/Mexico_City"]
  ],
  samerica: [
    ["\u0633\u0627\u0626\u0648\u067E\u0627\u0626\u0648\u0644\u0648", "S\u00E3o Paulo", "sao-paulo", "America/Sao_Paulo"],
    ["\u0628\u0648\u0626\u0646\u0648\u0633\u200C\u0622\u06CC\u0631\u0633", "Buenos Aires", "buenos-aires", "America/Argentina/Buenos_Aires"],
    ["\u0644\u06CC\u0645\u0627", "Lima", "lima", "America/Lima"],
    ["\u0628\u0648\u06AF\u0648\u062A\u0627", "Bogot\u00E1", "bogota", "America/Bogota"],
    ["\u0633\u0627\u0646\u062A\u06CC\u0627\u06AF\u0648", "Santiago", "santiago", "America/Santiago"],
    ["\u06A9\u0627\u0631\u0627\u06A9\u0627\u0633", "Caracas", "caracas", "America/Caracas"]
  ],
  oceania: [
    ["\u0633\u06CC\u062F\u0646\u06CC", "Sydney", "sydney", "Australia/Sydney"],
    ["\u0645\u0644\u0628\u0648\u0631\u0646", "Melbourne", "melbourne", "Australia/Melbourne"],
    ["\u0628\u0631\u06CC\u0632\u0628\u0646", "Brisbane", "brisbane", "Australia/Brisbane"],
    ["\u0622\u062F\u0644\u0627\u06CC\u062F", "Adelaide", "adelaide", "Australia/Adelaide"],
    ["\u067E\u0631\u062B", "Perth", "perth", "Australia/Perth"],
    ["\u0627\u0648\u06A9\u0644\u0646\u062F", "Auckland", "auckland", "Pacific/Auckland"]
  ]
};

// tzLocalTime: "HH:mm" in the zone, Persian digits for fa. Fails closed to
// "" (cosmetic only \u2014 the picker still works, just without the time hint).
// v13.116-tzproof: was a TIME-ONLY Intl format \u2014 the exact shape some
// Cloudflare edge colos render as raw UTC or a wrong-era offset (the
// owner's "real 10am shows 11am" + dead-button morning). Arithmetic via
// the verified shortOffset now \u2014 colo-independent by construction.
export function tzLocalTime(tz, lang) {
  return zonedHm(tz, null, lang);
}

// tzUtcOffset: "UTC+3:30" / "UTC+9" / "UTC-5" for the zone (DST-aware \u2014
// computed from "now", the same instant the user is picking in).
// v13.116-tzproof: routes through the shared tzOffsetMinutes (shortOffset
// parse + sanity gate) so the picker's time and its offset label can
// NEVER disagree \u2014 on the broken colos the old path rendered a UTC hour
// next to a "+3:30" label.
export function tzUtcOffset(tz) {
  const m = tzOffsetMinutes(tz);
  if (m == null) return "";
  const sign = m < 0 ? "-" : "+";
  const a = Math.abs(m);
  const h = Math.floor(a / 60);
  const mm = a % 60;
  return "UTC" + sign + h + (mm ? ":" + (mm < 10 ? "0" + mm : "" + mm) : "");
}

// tzRegionKeyboard: one region's cities, two per row, each button carrying
// its LIVE local time (the pick-your-clock confirmation), \u2705 marking the
// zone already set, and a back-to-hub row.
export function tzRegionKeyboard(lang, regionKey, currentTz) {
  const en = lang === "en";
  const region = TZ_REGIONS[regionKey];
  if (!region) return tzPickerKeyboard(lang);
  const rows = [];
  for (let i = 0; i < region.length; i += 2) {
    const row = [];
    for (let j = i; j < i + 2 && j < region.length; j++) {
      const c = region[j];
      const t = tzLocalTime(c[3], lang);
      const mark = currentTz === c[3] ? "\u2705 " : "";
      row.push({ text: mark + (en ? c[1] : c[0]) + (t ? " \u00B7 " + t : ""), callback_data: "tz:" + c[2] });
    }
    rows.push(row);
  }
  rows.push([{ text: "\u25C0\uFE0F " + (en ? "Regions" : "\u0645\u0646\u0627\u0637\u0642"), callback_data: "tzr:hub" }]);
  return { inline_keyboard: rows };
}

export function tzRegionText(lang) {
  return lang === "en"
    ? "\u23F0 Pick your city \u2014 every button shows that city's current local time; tap the one matching YOUR clock\\:"
    : "\u23F0 \u0634\u0647\u0631 \u062E\u0648\u062F \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F \u2014 \u0633\u0627\u0639\u062A\u0650 \u0645\u062D\u0644\u06CC\u0650 \u0647\u0631 \u0634\u0647\u0631 \u0631\u0648\u06CC \u062F\u06A9\u0645\u0647\u0654 \u0622\u0646 \u0646\u0648\u0634\u062A\u0647 \u0634\u062F\u0647\u061B \u062F\u06A9\u0645\u0647\u0627\u06CC \u06A9\u0647 \u0633\u0627\u0639\u062A\u0634 \u0628\u0627 \u0633\u0627\u0639\u062A\u0650 \u0634\u0645\u0627 \u06CC\u06A9\u06CC \u0627\u0633\u062A \u0631\u0627 \u0628\u0632\u0646\u06CC\u062F\\:";
}

// tzOnboardText (v13.189-tzconfirm): the /start-time prompt — now the
// PROCEED-WITH-DEFAULT ask (the owner's ask): the bot's default timezone
// is Iran (UTC+3:30, live-computed — all of Iran shares ONE zone, so the
// whole country is covered by one tap); the user confirms the default or
// opts into the region picker. Sent right after the language welcome for
// users with no tz set — new joiners and returning members who never
// picked one.
export function tzOnboardText(lang) {
  // live offset (UTC+3:30 — Iran abolished DST in 2022, so this is stable
  // year-round); the hardcoded fallback covers a colo where the offset
  // probe fails closed.
  const off = tzUtcOffset("Asia/Tehran") || "UTC+3:30";
  return lang === "en"
    ? "\u23F0 Last step \u2014 the default timezone is Iran \\(" + escapeMarkdownCharacters(off) + "\\)\\.\nAll of Iran shares one timezone \u2014 proceed with the default\\?"
    : "\u23F0 \u0642\u062F\u0645 \u0622\u062E\u0631 \u2014 \u0645\u0646\u0637\u0642\u0647\u0654 \u0632\u0645\u0627\u0646\u06CC \u067E\u06CC\u0634\u200C\u0641\u0631\u0636 \u0631\u0628\u0627\u062A\u060C \u0627\u06CC\u0631\u0627\u0646 \\(" + escapeMarkdownCharacters(off) + "\\) \u0627\u0633\u062A\\.\n\u062A\u0645\u0627\u0645 \u0627\u06CC\u0631\u0627\u0646 \u06CC\u06A9 \u0645\u0646\u0637\u0642\u0647\u0654 \u0632\u0645\u0627\u0646\u06CC \u062F\u0627\u0631\u062F \u2014 \u0628\u0627 \u0647\u0645\u06CC\u0646 \u067E\u06CC\u0634\u200C\u0641\u0631\u0636 \u067E\u06CC\u0634 \u0628\u0631\u0648\u06CC\u0645\u061F";
}

// tzDefaultKeyboard (v13.189-tzconfirm): the onboarding answer surface —
// ONE tap accepts the Iran default (the majority audience; the button
// carries the live Tehran clock so the user can verify it against their
// wall clock before tapping), the other row opens the full region picker
// (tzr:hub renders tzStatusText + tzPickerKeyboard — the same hub
// /timezone serves).
export function tzDefaultKeyboard(lang) {
  const en = lang === "en";
  const off = tzUtcOffset("Asia/Tehran") || "UTC+3:30";
  const t = tzLocalTime("Asia/Tehran", lang);
  return { inline_keyboard: [
    [{ text: "\uD83C\uDDEE\uD83C\uDDF7 \u2705 " + (en ? "Yes \u2014 Iran (" + off + ")" : "\u0628\u0644\u0647 \u2014 \u0627\u06CC\u0631\u0627\u0646 (" + off + ")") + (t ? " \u00B7 " + t : ""), callback_data: "tz:tehran" }],
    [{ text: "\uD83C\uDF0D " + (en ? "Choose another region" : "\u0627\u0646\u062A\u062E\u0627\u0628 \u0645\u0646\u0637\u0642\u0647\u0654 \u0632\u0645\u0627\u0646\u06CC \u062F\u06CC\u06AF\u0631"), callback_data: "tzr:hub" }]
  ] };
}

// tzSetCollapseText (v13.189-tzconfirm): what the TAPPED picker message
// collapses to (its buttons stripped) once the fresh confirmation lands —
// the old message can never offer stale re-taps, and points at the
// durable confirmation below it.
export function tzSetCollapseText(lang, tz) {
  const off = tzUtcOffset(tz);
  return lang === "en"
    ? "\u2705 Timezone set: " + escapeMarkdownCharacters(tz) + (off ? " \\(" + escapeMarkdownCharacters(off) + "\\)" : "") + " \u2014 see the confirmation below \u2B07\uFE0F"
    : "\u2705 \u0645\u0646\u0637\u0642\u0647\u0654 \u0632\u0645\u0627\u0646\u06CC \u062B\u0628\u062A \u0634\u062F: " + escapeMarkdownCharacters(tz) + (off ? " \\(" + escapeMarkdownCharacters(off) + "\\)" : "") + " \u2014 \u062A\u0623\u06CC\u06CC\u062F \u062F\u0631 \u067E\u06CC\u0627\u0645 \u0628\u0639\u062F\u06CC \u2B07\uFE0F";
}

// The post-selection view (v13.189-tzconfirm: sent as a FRESH message, not
// an in-place edit — the v13.90 edit-only flow was easy to miss, and the
// owner's live report was that users couldn't tell success from failure
// after tapping their zone). Write-first means the tz is ALREADY saved
// when this lands: the unmissable "your timezone is set" + the WELCOME +
// the you'll-receive-updates line, plus the live local time so the user
// can verify it against their wall clock (✅-confirm or re-open the
// picker — pure UX, never a gate on the saved value).
export function tzConfirmText(lang, tz) {
  const local = tzLocalTime(tz, lang);
  const off = tzUtcOffset(tz);
  const zone = escapeMarkdownCharacters(tz);
  const offPart = off ? " \\(" + escapeMarkdownCharacters(off) + "\\)" : "";
  const timePart = local ? " \u2014 " + (lang === "en" ? "your time: " : "\u0633\u0627\u0639\u062A\u0650 \u0634\u0645\u0627: ") + mdCode(local) : "";
  return lang === "en"
    ? "\u2705 *Your timezone is set:*\n\uD83D\uDD50 " + zone + offPart + timePart + "\n\n\uD83C\uDF89 *Welcome to the bot\\!*\nFrom now on, you'll receive match updates at your local time\\.\n\nIs this right\\?"
    : "\u2705 *\u0645\u0646\u0637\u0642\u0647\u0654 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627 \u062B\u0628\u062A \u0634\u062F:*\n\uD83D\uDD50 " + zone + offPart + timePart + "\n\n\uD83C\uDF89 *\u0628\u0647 \u0631\u0628\u0627\u062A \u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F\\!*\n\u0627\u0632 \u0627\u06CC\u0646 \u067E\u0633 \u0627\u0639\u0644\u0627\u0645\u200C\u0647\u0627\u06CC \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0631\u0627 \u0628\u0647 \u0648\u0642\u062A\u0650 \u062E\u0648\u062F\u062A\u0627\u0646 \u062F\u0631\u06CC\u0627\u0641\u062A \u062E\u0648\u0627\u0647\u06CC\u062F \u06A9\u0631\u062F\\.\n\n\u062F\u0631\u0633\u062A \u0627\u0633\u062A\u061F";
}

// tzConfirmKeyboard (v13.90): rides the fresh confirmation message —
// ✅-dismiss (edits to tzDoneText) or re-open the picker hub.
export function tzConfirmKeyboard(lang) {
  const en = lang === "en";
  return { inline_keyboard: [
    [{ text: "\u2705 " + (en ? "Yes, correct" : "\u0628\u0644\u0647\u060C \u062F\u0631\u0633\u062A \u0627\u0633\u062A"), callback_data: "tzok" }],
    [{ text: "\uD83DD008 " + (en ? "Change region" : "\u062A\u063A\u06CC\u06CC\u0631 \u0645\u0646\u0637\u0642\u0647"), callback_data: "tzr:hub" }]
  ] };
}
// tzDoneText (v13.189-tzconfirm): the final welcome after the ✅ tap —
// the confirmation message edits in place (buttons removed), closing the
// onboarding exchange with the welcome + the you'll-receive-updates
// promise + the change-anytime affordance.
export function tzDoneText(lang, tz) {
  const off = tzUtcOffset(tz);
  const zone = escapeMarkdownCharacters(tz);
  const offPart = off ? " \\(" + escapeMarkdownCharacters(off) + "\\)" : "";
  return lang === "en"
    ? "\uD83C\uDF89 *Welcome aboard\\! All set\\.*\nYour timezone: " + zone + offPart + "\nFrom now on, you'll receive match updates at your local time \u26BD\nChange it anytime with /timezone\\."
    : "\uD83C\uDF89 *\u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F\\! \u0647\u0645\u0647\u200C\u0686\u06CC\u0632 \u0622\u0645\u0627\u062F\u0647 \u0627\u0633\u062A\\.*\n\u0645\u0646\u0637\u0642\u0647\u0654 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627: " + zone + offPart + "\n\u0627\u0632 \u0627\u06CC\u0646 \u067E\u0633 \u0627\u0639\u0644\u0627\u0645\u200C\u0647\u0627\u06CC \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0631\u0627 \u0628\u0647 \u0648\u0642\u062A\u0650 \u062E\u0648\u062F\u062A\u0627\u0646 \u062F\u0631\u06CC\u0627\u0641\u062A \u0645\u06CC\u200C\u06A9\u0646\u06CC\u062F \u26BD\n\u0647\u0631 \u0648\u0642\u062A \u0628\u062E\u0648\u0627\u0647\u06CC\u062F \u0628\u0627 /timezone \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC\u062F \u062A\u063A\u06CC\u06CC\u0631\u0634 \u062F\u0647\u06CC\u062F\\.";
}


