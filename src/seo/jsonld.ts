// SportSignal — JSON-LD builders (Phase 4, S-01..S-06). All data comes from
// the real pool; fields the data source does not provide are OMITTED, never
// invented (S-05). Dates are ISO 8601 with offset computed from the UTC
// kickoff + the venue/tehran timezone context. No SearchAction (retired),
// no fake offers/ratings/authors.

import { SEO, absUrl } from "./config";
import { matchPath, teamSlug, compSlug } from "../slugs";
import { tehranParts } from "./utils";
import { COMP_EN } from "../tables";
import { translateCompetition } from "../translate";
import { TEAM_ENTITY_LINKS, COMP_ENTITY_LINKS } from "./entity-links";
import type { SeoMatch, TeamEntry, CompEntry, SeoCtx } from "./data";
import { compNameFa } from "./markup";

// ISO 8601 with the Tehran offset (the site's display timezone; venue tz is
// not in the data, so we never pretend it is — documented in the report).
export function isoWithTehranOffset(utcIso: string): string {
  const dt = new Date(utcIso);
  const t = tehranParts(utcIso);
  // Tehran = UTC+03:30 (fixed since 2022). Compute from wall-clock delta.
  const wall = Date.UTC(t.y, t.m - 1, t.d, t.hh, t.mm);
  const offMin = Math.round((wall - dt.getTime()) / 60000);
  const sign = offMin >= 0 ? "+" : "-";
  const a = Math.abs(offMin);
  const z = (n: number) => (n < 10 ? "0" + n : "" + n);
  return dt.toISOString().replace("Z", sign + z(Math.floor(a / 60)) + ":" + z(a % 60));
}

export function organizationNode(): any {
  return {
    "@type": "Organization",
    "@id": SEO.SITE_URL + "/#organization",
    name: SEO.SITE_NAME,
    alternateName: SEO.SITE_NAME_FA,
    url: SEO.SITE_URL + "/",
    logo: {
      "@type": "ImageObject",
      url: absUrl(SEO.LOGO_PATH),
      width: 512,
      height: 512
    },
    // SS-04 (Phase-2 spec): sameAs from the SEO.ORG_SAMEAS config array —
    // real, owned, live profiles only (the Telegram bot today; the owner
    // appends future profiles in config.ts, never invented here).
    ...(SEO.ORG_SAMEAS && SEO.ORG_SAMEAS.length ? { sameAs: SEO.ORG_SAMEAS } : {})
  };
}

export function websiteNode(): any {
  return {
    "@type": "WebSite",
    "@id": SEO.SITE_URL + "/#website",
    url: SEO.SITE_URL + "/",
    name: SEO.SITE_NAME,
    alternateName: SEO.SITE_NAME_FA,
    description: SEO.SITE_TAGLINE,
    inLanguage: "fa-IR",
    publisher: { "@id": SEO.SITE_URL + "/#organization" }
  };
}

export function breadcrumbNode(trail: { name: string; href?: string }[]): any {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(c.href ? { item: absUrl(c.href) } : {})
    }))
  };
}

function teamRef(name: string): any {
  return {
    "@type": "SportsTeam",
    name: name,
    sport: "Football",
    url: absUrl("/teams/" + teamSlug(name))
  };
}

export function eventStatusOf(status: string): string {
  switch (String(status || "").toUpperCase()) {
    case "POSTPONED":
      return "https://schema.org/EventPostponed";
    case "SUSPENDED":
      return "https://schema.org/EventScheduled"; // temporarily halted, not a schema status
    case "CANCELLED":
    case "CANCELED":
    case "CANCEL":
      return "https://schema.org/EventCancelled";
    case "IN_PLAY":
    case "LIVE":
    case "PAUSED":
    case "FINISHED":
    case "TIMED":
    case "SCHEDULED":
    default:
      return "https://schema.org/EventScheduled";
  }
}

// S-01: the SportsEvent node for a match page. Only real fields.
export function sportsEventNode(sm: SeoMatch, why: string): any {
  const m = sm.s;
  const mp = matchPath(m.homeTeam.name, m.awayTeam.name, m.utcDate);
  const url = absUrl(mp);
  // SS-05 (Phase-2 spec): the organizer's entity grounding — the same
  // verified static map as sportsOrganizationNode (pure lookup, no
  // fetching; an unverified competition omits sameAs).
  const organizerName = COMP_EN[m.competition.code] || m.competition.code;
  const organizerLinks = COMP_ENTITY_LINKS[organizerName];
  const ev: any = {
    "@type": "SportsEvent",
    "@id": url + "#event",
    name: m.homeTeam.name + " vs " + m.awayTeam.name,
    url,
    sport: "Football",
    startDate: isoWithTehranOffset(m.utcDate),
    eventStatus: eventStatusOf(sm.raw.status || m.status),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    homeTeam: teamRef(m.homeTeam.name),
    awayTeam: teamRef(m.awayTeam.name),
    organizer: {
      "@type": "SportsOrganization",
      name: organizerName,
      url: absUrl("/competitions/" + compSlug(m.competition.code)),
      ...(organizerLinks && organizerLinks.length ? { sameAs: organizerLinks } : {})
    },
    mainEntityOfPage: url,
    // SS-15 (Phase-2 spec §3): the per-match OG PNG — the SAME art the
    // page's og:image/meta carries (the /og/match-<slug>.png route renders
    // this match's names + kickoff) — with the site default as the fallback
    // shape (schema.org image accepts an array; consumers use the first
    // usable entry, so the per-match art wins and the default guarantees a
    // valid image even where a consumer cannot fetch the route).
    image: [absUrl("/og/match-" + mp.slice("/matches/".length) + ".png"), absUrl(SEO.OG_DEFAULT_IMAGE)]
  };
  // description = the answer-first sentence (matches visible text).
  ev.description = why;
  // location: stadium name only when the data has one (S-05: no invented
  // city/country — the data source does not carry them).
  if (m.venue) {
    ev.location = {
      "@type": "StadiumOrArena",
      name: m.venue
    };
  }
  // competitor + alternateName (G-05): Persian name as alternateName.
  if (m.homeTeam.faName) ev.homeTeam.alternateName = m.homeTeam.faName;
  if (m.awayTeam.faName) ev.awayTeam.alternateName = m.awayTeam.faName;
  // Finished: score in the name/description happens at page level; here we
  // keep the event clean (no invented endDate/offers/ratings — S-03/S-04).
  return ev;
}

export function webPageNode(path: string, dateModified: string | null, extra?: any): any {
  const node: any = {
    "@type": "WebPage",
    "@id": absUrl(path) + "#webpage",
    url: absUrl(path),
    inLanguage: "fa-IR",
    isPartOf: { "@id": SEO.SITE_URL + "/#website" },
    ...(extra || {})
  };
  if (dateModified) node.dateModified = dateModified;
  return node;
}

export function collectionPageNode(path: string, name: string, dateModified: string | null, extra?: any): any {
  const node: any = {
    "@type": "CollectionPage",
    "@id": absUrl(path) + "#webpage",
    url: absUrl(path),
    name,
    inLanguage: "fa-IR",
    isPartOf: { "@id": SEO.SITE_URL + "/#website" },
    ...(extra || {})
  };
  if (dateModified) node.dateModified = dateModified;
  return node;
}

// ItemList of matches (home / hubs / team / competition pages).
export function itemListNode(list: SeoMatch[], name?: string): any {
  return {
    "@type": "ItemList",
    name: name || "مسابقات پیش‌رو",
    numberOfItems: list.length,
    itemListElement: list.slice(0, 50).map((sm, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absUrl(matchPath(sm.s.homeTeam.name, sm.s.awayTeam.name, sm.s.utcDate)),
      name: sm.s.homeTeam.name + " vs " + sm.s.awayTeam.name
    }))
  };
}

// SS-06 (Phase-2 spec §3): the FAQPage node. NOTE: Google retired FAQ
// rich results in August 2023 — this node is NOT a SERP-enrichment play;
// it exists so AI answer engines (AI Overviews, ChatGPT, Perplexity,
// Claude) can quote the EXACT visible Q&A text with a citation. The
// contract (seo-check T-20): the q/a strings fed here are the very same
// strings the page renders visibly — byte-identical, one source array
// shared by faqHtml() (visible) and this node (machine). Answers are
// factual from the real pool/config only (rule §1.1); hub answers are
// generated from the same upcomingFollowed list the page renders.
export function faqNode(qas: { q: string; a: string }[]): any {
  return {
    "@type": "FAQPage",
    mainEntity: qas.map((qa) => ({
      "@type": "Question",
      name: qa.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: qa.a
      }
    }))
  };
}

// SS-13 (Phase-2 spec §3): ItemList of CHILD LINKS for the /teams and
// /competitions indexes — the same hub pattern (numberOfItems + ListItem
// position/name/url) but the elements are the child pages, not matches.
// The names are the SAME strings the visible tiles render, so the machine
// list and the visible grid describe one another exactly.
export function linkItemList(items: { name: string; url: string }[], name?: string): any {
  return {
    "@type": "ItemList",
    name: name || "فهرست صفحه‌ها",
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: it.url
    }))
  };
}

// SS-14 (Phase-2 spec §3): the Dataset node for /data — the site's machine
// surfaces described as a dataset. Every field is real: creator → the
// Organization @id already in every graph; distribution → DataDownload per
// REAL file (matches.json / calendar.ics / feed.xml) with the media types
// the routes actually serve; the license points at /terms where the
// attribution requirement lives (honest: attribution required, and the
// description says so — never a license we do not actually grant);
// isAccessibleForFree: true (no paywall exists).
export function datasetNode(): any {
  return {
    "@type": "Dataset",
    "@id": absUrl("/data") + "#dataset",
    name: "داده‌های ماشین‌خوان بازی‌های بزرگ فوتبال SportSignal",
    description: "داده‌های بازی‌های بزرگ فوتبال که SportSignal دنبال می‌کند — به‌صورت JSON، تقویم iCalendar و فید Atom با زمان‌های ISO 8601 (UTC). استفاده با ذکر منبع (SportSignal) مجاز است؛ داده‌های پایه از football-data.org دریافت می‌شود.",
    url: absUrl("/data"),
    isAccessibleForFree: true,
    license: absUrl("/terms"),
    creator: { "@id": SEO.SITE_URL + "/#organization" },
    distribution: [
      {
        "@type": "DataDownload",
        name: "matches.json",
        encodingFormat: "application/json",
        contentUrl: absUrl("/api/matches.json")
      },
      {
        "@type": "DataDownload",
        name: "calendar.ics",
        encodingFormat: "text/calendar",
        contentUrl: absUrl("/calendar.ics")
      },
      {
        "@type": "DataDownload",
        name: "feed.xml",
        encodingFormat: "application/atom+xml",
        contentUrl: absUrl("/feed.xml")
      }
    ]
  };
}

export function sportsTeamNode(entry: TeamEntry): any {
  const node: any = {
    "@type": "SportsTeam",
    "@id": absUrl("/teams/" + entry.slug) + "#team",
    name: entry.name,
    sport: "Football",
    url: absUrl("/teams/" + entry.slug)
  };
  if (entry.faName) node.alternateName = entry.faName;
  // SS-05 (Phase-2 spec §3): entity grounding from the static verified map
  // (src/seo/entity-links.ts — every URL fetch-and-confirmed, provenance in
  // that file's header). sameAs = [English Wikipedia article, Wikidata
  // entity]; teams without a verified pair omit sameAs (rule §1.1 — never
  // guessed). No logo (crest licence unconfirmed — spec default: none).
  const links = TEAM_ENTITY_LINKS[entry.name];
  if (links && links.length) node.sameAs = links;
  return node;
}

export function sportsOrganizationNode(code: string): any {
  const name = COMP_EN[code] || code;
  const node: any = {
    "@type": "SportsOrganization",
    "@id": absUrl("/competitions/" + compSlug(code)) + "#org",
    name,
    alternateName: translateCompetition(code) || undefined,
    sport: "Football",
    url: absUrl("/competitions/" + compSlug(code))
  };
  // SS-05 (Phase-2 spec §3): same verified-map grounding as sportsTeamNode
  // — keyed by the COMP_EN canonical name (the map's own key contract).
  if (node.alternateName === undefined) delete node.alternateName;
  const links = COMP_ENTITY_LINKS[name];
  if (links && links.length) node.sameAs = links;
  return node;
}

export function jsonldScript(nodes: any[]): string {
  return '<script type="application/ld+json">' +
    JSON.stringify({ "@context": "https://schema.org", "@graph": nodes }).replace(/</g, "\\u003c") +
    "</script>";
}

// Convenience: the site-wide graph nodes every page carries.
export function siteNodes(): any[] {
  return [organizationNode(), websiteNode()];
}
