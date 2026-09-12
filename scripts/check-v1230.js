// Self-check: v12.30-herocalm — the user's asks:
//   "The header of upcoming match in mobile looks distracting.
//    disorganized and messy with a lot of noise, what do you think we
//    should do?" + "add a 30% dark navy overlay on the video of the next
//    upcoming match + some gussian blur just a touch."
// The hero video's scrim becomes a FLAT 30% dark-navy veil
// (rgba(2,6,23,.30), the .38/.18 gradient retired) and the clip gets a
// touch of gaussian blur (2.5px) with a 1.06 edge-safe scale; the phone
// hero sheds its noise layers (crest watermarks OFF below 601px, the
// bar's decorative percent chip OFF) and gains breathing room at every
// seam. Light theme keeps a flat white veil. The v12.28 autoplay +
// display-size time chip work is untouched.
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../src/worker.ts"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"));
let pass = 0, fail = 0;
function ok(cond, label){ if(cond){ pass++; console.log("  ✔ " + label); } else { fail++; console.log("  ✘ " + label); } }

console.log("A) THE NAVY VEIL — a flat 30% dark-navy overlay on the video");
ok(src.includes('.hero-video::after{content:"";position:absolute;inset:0;background:rgba(2,6,23,.30)}'), "A1 the veil is FLAT rgba(2,6,23,.30) — exactly 30% dark navy");
ok(src.includes('[data-theme="light"] .hero-video::after{background:rgba(248,250,252,.42)}'), "A2 light theme keeps a flat white veil (a navy fill would muddy the light card)");
ok(!src.includes('linear-gradient(168deg,rgba(2,6,23,.38),rgba(2,6,23,.18))') && !src.includes('linear-gradient(168deg,rgba(248,250,252,.44),rgba(248,250,252,.26))'), "A3 the old .38/.18 gradient scrims (dark + light) are RETIRED");
ok(src.includes('object-fit:cover;opacity:.78;filter:blur(2.5px)'), "A4 the stage is not re-dimmed to a still (v12.28's .78 opacity survives the veil)");

console.log("B) THE BLUR TOUCH — just a touch of gaussian blur");
ok(src.includes('filter:blur(2.5px) saturate(1.18) brightness(1.02)'), "B1 a 2.5px gaussian blur on the clip itself");
ok(src.includes('transform:scale(1.06)}\n.hero-video::after'), "B2 a 1.06 edge-safe scale so the blur's edge smear never paints inside the card");
ok(src.includes('<video src="/hero-stage.mp4" autoplay muted loop playsinline preload="auto"'), "B3 the autoplay ladder is untouched (autoplay muted loop playsinline still in the initial HTML)");
ok(src.includes('hv.muted = true') && src.includes('var p = hv.play(); if(p && p.catch) p.catch'), "B4 heroVideoKick's belt-and-braces play() retry survives verbatim");

console.log("C) THE PHONE DECLUTTER — less noise, more air (≤600px)");
ok(src.includes('@media (max-width:600px){.hero-wm{display:none}}'), "C1 the crest watermark layer is OFF below 601px (the 210px ghosts fought the face-off)");
ok(!src.includes('.hero-wm img{width:210px'), "C2 the old phone-size watermark rule is retired with it");
ok(src.includes('.bighero .bigbar-pct{display:none}'), "C3 the bar's decorative percent chip is OFF on phones (label + clock + track carry the story)");
ok(src.includes('.bighero .bigbar{margin-bottom:14px;padding:2px 2px 10px}'), "C4a more air under the countdown bar");
ok(src.includes('.bighero .kick{margin-top:8px}') && src.includes('.bighero .uclspot-info{margin-top:10px;gap:6px}') && src.includes('.bighero .spotitem{padding:8px 6px 12px}'), "C4b a taller gap before the time number, room under the info chips, nothing crammed against the card edge");
ok(src.includes('.bighero .kick .countdown{font-size:20px;padding:6px 16px;border-radius:12px}'), "C5 the v12.28 display-size 20px phone time chip is PRESERVED (less noise, not a smaller headline)");
ok(src.includes('.hero-wm img{position:absolute;top:52%;width:320px;height:320px;object-fit:contain;opacity:.157'), "C6 PC keeps its atmospheric .157 crest pair untouched");
ok(src.includes('.bighero .bigbar{margin:0 0 12px;padding:2px 2px 8px;'), "C7 the bar's own text scrim (v12.27 review item 1) still guards the clock's contrast");

console.log("D) VERSION + ROLLING GATES");
ok(src.includes('const VERSION = "12.30-herocalm";'), "D1 VERSION = 12.30-herocalm");
ok((src.match(/ver:"نسخه ۱۲\.۳۰ — صحنهٔ بازی بزرگ بعدی آرام‌تر شد/g) || []).length === 3, "D2 fa ver strings (public + login + admin dicts) all ۱۲.۳۰");
ok((src.match(/data-i="ver">نسخه ۱۲\.۳۰ — صحنهٔ بازی بزرگ بعدی آرام‌تر شد/g) || []).length === 1, "D3 the static footer ver div ۱۲.۳۰");
ok((src.match(/ver:"v12\.30 — the next big match stage is calmer/g) || []).length === 3, "D4 en ver strings all v12.30");
ok(pkg.version === "12.30.0" && pkg.scripts.test.includes("check-v1230.js"), "D5 package.json 12.30.0 + this suite wired into npm test");

console.log(`\n${pass} passed, ${fail} failed (v12.30-herocalm checks)`);
process.exit(fail ? 1 : 0);
