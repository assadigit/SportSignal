// scripts/lib/mdv2.js — the SHARED entity-aware MarkdownV2 parse-safety
// validator (v13.106-mdstyle). One gate, every message surface.
//
// Born from the parse-400 graveyard: v13.71's raw `>` killed /admin for
// weeks, v13.90's raw `(` killed /members, v13.104 built the first
// entity-aware mdv2Safe in check-admin.js (models *bold*, `code`, escapes).
// v13.106 extends the model to the FULL entity set the styled bot uses —
// *bold*, _italic_, __underline__, ~strikethrough~, ||spoiler||, `code`,
// ```pre```, [text](url) links, > blockquotes — and shares it across every
// check that lints bot output (check-admin, check-join-flow, check-mdstyle,
// check-uclnight).
//
// THE CONTRACT (mirrors Telegram's MarkdownV2 spec):
//   - outside entities, EVERY reserved char must be backslash-escaped
//     (an unescaped `(` anywhere = parse-400 = the whole message dies)
//   - inside code/pre spans, content is RAW (no escapes — only the backtick
//     is special; escape-inside-code renders a literal backslash)
//   - link URLs ride RAW inside the (…) of [text](url)
//   - entity delimiters must pair up (an unclosed * or _ is a parse error)
//   - `>` unescaped is legal ONLY as a line-start blockquote marker
//   - a `\` consumes the following character (any code 1–126 is escapable)
//   - a trailing lone `\` is invalid
//
// FAIL-FORM by construction: any unescaped reserved char, unclosed entity,
// or malformed link returns false — a red build, never a silent pass.
"use strict";

var MDV2_RESERVED_SET = "_*[]()~`>#+-=|{}.!";

// Parse-safety verdict. true ⇔ the string parses under MarkdownV2 with the
// entity subset modeled here.
function mdv2Safe(text) {
  const s = String(text == null ? "" : text);
  let i = 0;
  let bold = 0, ital = 0, under = 0, strike = 0, spoil = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "`") {
      // ```pre``` (raw until the closing triple) or `code` (raw until the
      // closing backtick) — content needs NO escaping inside either.
      if (s.startsWith("```", i)) {
        const cl = s.indexOf("```", i + 3);
        if (cl < 0) return false;
        i = cl + 3;
        continue;
      }
      const cl = s.indexOf("`", i + 1);
      if (cl < 0) return false;
      i = cl + 1;
      continue;
    }
    if (c === "\\") {
      // escape: consumes the next char (any escapable char, incl. `\` itself)
      if (i + 1 >= s.length) return false;
      i += 2;
      continue;
    }
    if (c === "[") {
      // [text](url) — the inner text is a normal region (recursively
      // validated), the URL rides raw until its `)`.
      const close = s.indexOf("]", i + 1);
      if (close < 0) return false;
      if (!mdv2Safe(s.slice(i + 1, close))) return false;
      if (s[close + 1] !== "(") return false;
      const pc = s.indexOf(")", close + 2);
      if (pc < 0) return false;
      i = pc + 1;
      continue;
    }
    if (c === "|") {
      if (s.startsWith("||", i)) {
        spoil = 1 - spoil;
        i += 2;
        continue;
      }
      return false; // lone | is reserved
    }
    if (c === "*") {
      bold = 1 - bold;
      i++;
      continue;
    }
    if (c === "_") {
      if (s[i + 1] === "_") {
        under = 1 - under;
        i += 2;
        continue;
      }
      ital = 1 - ital;
      i++;
      continue;
    }
    if (c === "~") {
      strike = 1 - strike;
      i++;
      continue;
    }
    if (c === ">") {
      // blockquote marker — legal ONLY at the start of a line
      if (i === 0 || s[i - 1] === "\n") {
        i++;
        continue;
      }
      return false;
    }
    if (MDV2_RESERVED_SET.indexOf(c) >= 0) return false; // unescaped reserved
    i++;
  }
  // every entity delimiter must be closed
  return bold === 0 && ital === 0 && under === 0 && strike === 0 && spoil === 0;
}

// Entity EXTRACTOR (behavioral assertions): returns the raw inner texts of
// every bold / italic / code span in order, e.g.
//   mdv2Entities("*Arsenal* — `۲۱:۰۰` — _لیگ قهرمانان_") →
//   { bold: ["Arsenal"], italic: ["لیگ قهرمانان"], code: ["۲۱:۰۰"] }
// Code/pre spans are extracted FIRST (their content is raw — entity
// delimiters inside them are literal text, not markup).
function mdv2Entities(text) {
  const s = String(text == null ? "" : text);
  const out = { bold: [], italic: [], code: [] };
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "`") {
      if (s.startsWith("```", i)) {
        const cl = s.indexOf("```", i + 3);
        if (cl < 0) break;
        out.code.push(s.slice(i + 3, cl));
        i = cl + 3;
        continue;
      }
      const cl = s.indexOf("`", i + 1);
      if (cl < 0) break;
      out.code.push(s.slice(i + 1, cl));
      i = cl + 1;
      continue;
    }
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === "*") {
      const cl = s.indexOf("*", i + 1);
      if (cl < 0) break;
      out.bold.push(s.slice(i + 1, cl));
      i = cl + 1;
      continue;
    }
    if (c === "_") {
      if (s[i + 1] === "_") {
        const cl = s.indexOf("__", i + 2);
        if (cl < 0) break;
        i = cl + 2;
        continue;
      }
      const cl = s.indexOf("_", i + 1);
      if (cl < 0) break;
      out.italic.push(s.slice(i + 1, cl));
      i = cl + 1;
      continue;
    }
    i++;
  }
  return out;
}

module.exports = { mdv2Safe, mdv2Entities };
module.exports.mdv2Safe = mdv2Safe;
module.exports.mdv2Entities = mdv2Entities;
