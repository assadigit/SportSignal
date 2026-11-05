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
  const url = absUrl(matchPath(m.homeTeam.name, m.awayTeam.name, m.utcDate));
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
    image: [absUrl(SEO.OG_DEFAULT_IMAGE)]
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
