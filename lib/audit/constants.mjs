/** Shared audit configuration for regression tests and full UX audit runs. */

export const PLATFORMS = {
  mintlify: process.env.MINTLIFY_URL || "https://agentskills.io",
  docspage:
    process.env.DOCSPAGE_URL ||
    "https://docspage-production.up.railway.app/BenInvertase/docs-page-ux-test",
};

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 834, height: 1194 },
  mobile: { width: 390, height: 844 },
};

export const PAGES = {
  P1: "/",
  P2: "/specification",
  P3: "/clients",
  P4: "/skill-creation/quickstart",
  P5: "/skill-creation/using-scripts",
  P6: "/client-implementation/adding-skills-support",
  P7: "/integrate-skills",
  P8: "/what-are-skills",
};

/** Distinct sidebar pages in docs.json (used for mobile nav regression). */
export const FIXTURE_SIDEBAR_PAGE_COUNT = 9;

/** Minimum nav links expected in the mobile drawer after docs.json sidebar fix. */
export const MIN_MOBILE_NAV_LINKS = 8;

export const P404 = "/this-page-does-not-exist-ux-audit";

export const FEATURE_META = [
  { id: "F1", feature: "Full-text search", owner: "Platform" },
  { id: "F2", feature: "⌘K / Ctrl+K shortcut", owner: "Platform" },
  { id: "F3", feature: "Dark mode toggle", owner: "Platform" },
  { id: "F4", feature: "Dark mode persistence", owner: "Platform" },
  { id: "F5", feature: "Mobile nav drawer", owner: "Platform" },
  { id: "F6", feature: "Dismissible announcement banner", owner: "Config" },
  { id: "F7", feature: "Heading anchor links", owner: "Platform" },
  { id: "F8", feature: "Skip to content link", owner: "Platform" },
  { id: "F9", feature: "Previous / next page links", owner: "Platform" },
  { id: "F10", feature: "Copy page / view as markdown", owner: "Platform" },
  { id: "F11", feature: "llms.txt index", owner: "Platform" },
  { id: "F12", feature: "URL redirects", owner: "Config" },
  { id: "F13", feature: "Logo carousel / animated strip", owner: "Content" },
  { id: "F14", feature: "Client showcase (shuffle/sort)", owner: "Content" },
  { id: "F15", feature: "Section numbers (Specification)", owner: "Content" },
  { id: "F16", feature: "Note / Tip callout variants", owner: "Content" },
  { id: "F17", feature: "Edit on GitHub / view source", owner: "Platform" },
  { id: "F18", feature: "Custom 404 page", owner: "Platform" },
  { id: "F19", feature: "Open Graph meta", owner: "Platform" },
  { id: "F20", feature: "Twitter / social card meta", owner: "Platform" },
  { id: "F21", feature: "MCP / agent API endpoint", owner: "Platform" },
  { id: "F22", feature: "In-docs AI assistant", owner: "Platform" },
  { id: "F23", feature: "Breadcrumbs on nested pages", owner: "Platform" },
  { id: "F24", feature: "Desktop right-rail TOC", owner: "Platform" },
  { id: "F25", feature: "Tablet TOC", owner: "Platform" },
  { id: "F26", feature: "Favicon", owner: "Platform" },
  { id: "F27", feature: "robots.txt", owner: "Platform" },
  { id: "F28", feature: "sitemap.xml", owner: "Platform" },
  { id: "F29", feature: "Per-code-block copy button", owner: "Platform" },
  { id: "F30", feature: "Code block filename labels", owner: "Platform" },
  { id: "F31", feature: "Tabbed code examples", owner: "Content" },
  { id: "F32", feature: "Card / CardGroup components", owner: "Content" },
  { id: "F33", feature: "Client logo images", owner: "Content" },
  { id: "F34", feature: "Search empty-state messaging", owner: "Platform" },
  { id: "F35", feature: "Analytics / feedback widget", owner: "Out of scope" },
];
