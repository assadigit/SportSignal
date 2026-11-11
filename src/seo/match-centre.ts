// SportSignal — Match Centre (M1/S02): the match page's section composer.
//
// OWNERSHIP SPLIT (MATCH-CENTRE-IMPLEMENTATION-AUDIT.md §12/§16):
// src/seo/pages.ts buildMatchPage keeps every GSC measurement surface (the
// <title> ladder, the meta-description funnel, canonical, JSON-LD nodes,
// breadcrumbs, the h1) and every data load (hydrateMatchVenue / loadArchive
// / fullByCodeFor — the three pre-existing bounded reads; the S1/S2 SEO
// measurement runs until Dec 4–8, so those surfaces stay byte-for-byte).
// THIS module owns the page BODY composition: the semantic section registry
// and the anchored <section> wrappers.
//
// S02 LAWS (milestones-and-sessions.md M1/S02 + engineering-guardrails §1/§3):
// - Pure string composition: no imports, no KV, no fetch, no client script,
//   no new dependencies. The section content arrives fully built from ctx by
//   the existing pages.ts builders — zero new data work by construction.
// - The no-empty-cards law (specification §3/§16): a section with no content
//   is OMITTED entirely — never an empty placeholder, never a fake zero.
// - NO global redesign: the wrappers are inert <section> anchors (no CSS of
//   their own — the shell's .page-col stays the centered editorial
//   container). S03 applies the design system (responsive/RTL/spacing);
//   S04+ migrate the section builders into this module one session at a
//   time (S04 hero, S06 nav, S07 facts layout, S10/S11 standings, S12 form
//   lists, S14 venue, S15 schedule, S16 faq, S18 telegram).
//
// THE ANCHOR VOCABULARY — specification §3 page order. The five sticky-nav
// destinations (decisions 11/13: خلاصه، جدول، فرم، بازی‌ها، ورزشگاه) land on
// summary/standings/form/schedule/venue once S06 ships. The `mcentre-` id
// prefix is deliberately NOT `mc-`: the mobile-card family (mcCells,
// mcHint, the mc-heroes toolchain) already owns that spelling — the two
// vocabularies never mix.

// One registry entry: the HTML id anchor + the Persian landmark label.
export interface MatchCentreSectionDef {
  slot: string;  // HTML id anchor ("mcentre-hero" …)
  label: string; // Persian aria-label (the landmark name)
}

// The registry — specification §3 order, the locked anchor vocabulary every
// later session fills. S02 renders hero/summary/form/related/footer-hook
// (the slots that carry existing content today); nav (S06), standings
// (S10/S11), venue (S14), schedule (S15), faq (S16) and telegram (S18)
// join as their sessions land. The order here is the DOM order — the
// composer never reorders.
export const MC_SECTION_ORDER: MatchCentreSectionDef[] = [
  { slot: "mcentre-hero", label: "تیم‌ها و وضعیت بازی" },
  { slot: "mcentre-nav", label: "ناوبری بخش‌های صفحه" },
  { slot: "mcentre-summary", label: "خلاصه و مشخصات بازی" },
  { slot: "mcentre-standings", label: "جدول رقابت" },
  { slot: "mcentre-form", label: "فرم تیم‌ها" },
  { slot: "mcentre-venue", label: "ورزشگاه" },
  { slot: "mcentre-schedule", label: "بازی‌های هفته" },
  { slot: "mcentre-faq", label: "سوالات متداول" },
  { slot: "mcentre-related", label: "بازی‌های مرتبط" },
  { slot: "mcentre-telegram", label: "کانال تلگرام اسپرت‌سیگنال" },
  { slot: "mcentre-footer-hook", label: "پیوندهای مرتبط" }
];

// The section payloads — the existing builders' output, byte-identical
// (the S02 delegation moves composition, never content). The five S02 keys
// are required (a key may still be "" — that section is then omitted);
// the six later-milestone keys are optional so S06/S10/S14/S15/S16/S18 can
// start passing them without touching this contract again.
export interface MatchCentreParts {
  hero: string;       // scoreboard head + actions row + the inline countdown/copy script
  summary: string;    // answer-first card + facts table (+ the finished result block)
  form: string;       // W/D/L strip — "" fail-closed when neither side has history
  related: string;    // sibling-fixtures card — "" when none qualify
  footerHook: string; // the related-links card just before the global footer
  nav?: string;         // sticky section navigation (S06)
  standings?: string;   // five-row context windows (S10/S11)
  venue?: string;       // verified venue panel (S14)
  schedule?: string;    // seven-day fixture schedule (S15)
  faq?: string;         // editorial FAQ (S16)
  telegram?: string;    // featured Telegram promotion (S18)
}

// One anchored wrapper. The no-empty-cards law lives HERE: empty or
// whitespace-only content returns "" — a section never renders hollow, so
// a missing dataset can never leave a blank box on the page.
function sectionHtml(def: MatchCentreSectionDef, inner: string): string {
  if (!inner || !inner.trim()) return "";
  return '<section id="' + def.slot + '" aria-label="' + def.label + '">' + inner + "</section>";
}

// The composer: registry order, always. Every non-empty part is wrapped in
// its semantic anchor; empty parts are skipped (never reordered, never
// padded) so the DOM order equals the specification §3 order for every
// lifecycle state (upcoming / live / finished render the same shell — the
// sections differ only by content).
export function matchCentreMain(parts: MatchCentreParts): string {
  const bySlot: Record<string, string> = {
    "mcentre-hero": parts.hero,
    "mcentre-nav": parts.nav || "",
    "mcentre-summary": parts.summary,
    "mcentre-standings": parts.standings || "",
    "mcentre-form": parts.form,
    "mcentre-venue": parts.venue || "",
    "mcentre-schedule": parts.schedule || "",
    "mcentre-faq": parts.faq || "",
    "mcentre-related": parts.related,
    "mcentre-telegram": parts.telegram || "",
    "mcentre-footer-hook": parts.footerHook
  };
  let out = "";
  for (const def of MC_SECTION_ORDER) out += sectionHtml(def, bySlot[def.slot] || "");
  return out;
}
