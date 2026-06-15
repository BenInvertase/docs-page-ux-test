#!/usr/bin/env node
/**
 * Full UX audit data collection for docs.page vs Mintlify rubric v1.2.
 * Writes gitignored outputs: .docs/audit-data.json, .docs/feature-completeness.md, screenshots/*.png
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.env.AUDIT_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const shots = path.join(root, "screenshots");
const outFile = path.join(root, ".docs/audit-data.json");
const completenessFile = path.join(root, ".docs/feature-completeness.md");

const PLATFORMS = {
  mintlify: "https://agentskills.io",
  docspage:
    "https://docspage-production.up.railway.app/BenInvertase/docs-page-ux-test",
};

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 834, height: 1194 },
  mobile: { width: 390, height: 844 },
};

const PAGES = {
  P1: "/",
  P2: "/specification",
  P3: "/clients",
  P4: "/skill-creation/quickstart",
  P5: "/skill-creation/using-scripts",
  P6: "/client-implementation/adding-skills-support",
  P7: "/integrate-skills",
  P8: "/what-are-skills",
};

const P404 = "/this-page-does-not-exist-ux-audit";

const FEATURE_META = [
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

function url(platform, pagePath) {
  return `${PLATFORMS[platform]}${pagePath === "/" ? "" : pagePath}`;
}

function yn(value) {
  if (value === true || value === "y") return "y";
  if (value === "partial") return "partial";
  return "n";
}

function parseRgb(color) {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function luminance([r, g, b]) {
  const s = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
}

function contrastRatio(fg, bg) {
  const L1 = luminance(fg);
  const L2 = luminance(bg);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function detectChrome(page) {
  const sidebarPersistent = await page
    .locator('[data-sidebar="sidebar"], aside nav, nav[aria-label="Pages"]')
    .first()
    .isVisible()
    .catch(() => false);

  const sidebarTrigger = await page
    .locator('[data-sidebar="trigger"], button.lg\\:hidden')
    .filter({ hasText: /navigation|menu|sidebar/i })
    .first()
    .isVisible()
    .catch(() => false);

  const mintlifyNavBtn = await page
    .locator("button.lg\\:hidden")
    .filter({ hasText: "Navigation" })
    .first()
    .isVisible()
    .catch(() => false);

  const tocVisible = await page
    .locator('#table-of-contents, [class*="table-of-contents"], :text("On this page")')
    .first()
    .isVisible()
    .catch(() => false);

  const mainWidth = await page.locator("main").first().boundingBox().catch(() => null);
  const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  const horizontalScroll = bodyScrollWidth > viewportWidth + 2;

  let sidebar = "hidden";
  if (sidebarPersistent) sidebar = "persistent";
  else if (sidebarTrigger || mintlifyNavBtn) sidebar = "drawer";

  let outline = "hidden";
  if (tocVisible) outline = "right-rail";

  return {
    sidebar,
    outline,
    mainWidth: mainWidth?.width ?? null,
    horizontalScroll,
  };
}

async function measureTypography(page) {
  return page.evaluate(() => {
    const main = document.querySelector("main") || document.body;
    const p = main.querySelector("p");
    const h2 = main.querySelector("h2");
    const link = main.querySelector("a[href]:not([href^='#'])");
    const cs = (el) => (el ? getComputedStyle(el) : null);

    const pStyle = cs(p);
    const charsPerLine =
      p && p.textContent
        ? Math.round(p.getBoundingClientRect().width / (parseFloat(pStyle?.fontSize || "16") * 0.5))
        : null;

    return {
      charsPerLine,
      body: pStyle
        ? {
            fontSize: pStyle.fontSize,
            lineHeight: pStyle.lineHeight,
            marginBlock: pStyle.marginBlock,
          }
        : null,
      h2: h2
        ? {
            marginTop: cs(h2).marginTop,
            fontSize: cs(h2).fontSize,
          }
        : null,
      link: link
        ? {
            textDecoration: cs(link).textDecorationLine,
            color: cs(link).color,
          }
        : null,
    };
  });
}

async function measureContrast(page) {
  return page.evaluate(() => {
    const main = document.querySelector("main") || document.body;
    const p = main.querySelector("p");
    const link = main.querySelector("a[href]:not([href^='#'])");
    if (!p) return { bodyAA: null, linkAA: null, bodyRatio: null, linkRatio: null };

    const parseRgb = (color) => {
      const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return null;
      return [Number(m[1]), Number(m[2]), Number(m[3])];
    };
    const lum = ([r, g, b]) => {
      const s = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
    };
    const ratio = (fg, bg) => {
      const L1 = lum(fg);
      const L2 = lum(bg);
      return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    };

    const pStyle = getComputedStyle(p);
    const bg = parseRgb(pStyle.backgroundColor) || parseRgb(getComputedStyle(document.body).backgroundColor);
    const fg = parseRgb(pStyle.color);
    const bodyRatio = bg && fg ? ratio(fg, bg) : null;

    let linkRatio = null;
    if (link) {
      const lStyle = getComputedStyle(link);
      const lfg = parseRgb(lStyle.color);
      linkRatio = bg && lfg ? ratio(lfg, bg) : null;
    }

    return {
      bodyRatio: bodyRatio ? Math.round(bodyRatio * 100) / 100 : null,
      linkRatio: linkRatio ? Math.round(linkRatio * 100) / 100 : null,
      bodyAA: bodyRatio ? bodyRatio >= 4.5 : null,
      linkAA: linkRatio ? linkRatio >= 4.5 : null,
    };
  });
}

async function countCopyButtons(page) {
  const ariaCopy = await page
    .locator('button[aria-label*="Copy" i], button:has-text("Copy")')
    .count();
  const figcaptionCopy = await page.locator("pre figcaption button, figure button").count();
  const preCount = await page.locator("pre").count();
  const blocksWithCopy = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("pre")).filter((pre) => {
      const fig = pre.closest("figure");
      if (fig?.querySelector("button")) return true;
      const parent = pre.parentElement;
      if (parent?.querySelector('button[aria-label*="Copy" i]')) return true;
      const wrapper = pre.closest("div");
      if (wrapper?.querySelector('button[aria-label*="Copy" i]')) return true;
      return false;
    }).length;
  });
  const effectiveCopy =
    preCount > 0 && (blocksWithCopy >= preCount || ariaCopy >= preCount);
  return {
    ariaCopy,
    figcaptionCopy,
    preCount,
    blocksWithCopy,
    allBlocksHaveCopy: effectiveCopy,
  };
}

async function auditPage(page, platform, pageId, pagePath, viewportName) {
  const target = url(platform, pagePath);
  const response = await page.goto(target, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(1200);

  const finalUrl = page.url();
  const title = await page.title();
  const chrome = await detectChrome(page);

  const h1 = await page.locator("main h1, h1").first().textContent().catch(() => "");

  const prevNext = await page
    .locator(
      'a:has-text("Previous"), a:has-text("Next"), nav[aria-label*="pagination" i] a, footer a:has-text("Previous"), footer a:has-text("Next")',
    )
    .allTextContents()
    .catch(() => []);

  const searchBtn = await page
    .getByRole("button", { name: /search/i })
    .or(page.locator("#search-bar-entry, #search-bar-entry-mobile"))
    .first()
    .isVisible()
    .catch(() => false);

  const copyStats = await countCopyButtons(page);

  const callouts = await page
    .locator('[class*="callout"], [class*="note"], [class*="info"], [data-callout]')
    .count();

  const noteCallouts = await page.locator('[class*="note"], [data-callout="note"]').count();
  const tipCallouts = await page.locator('[class*="tip"], [data-callout="tip"]').count();

  const tabs = await page.locator('[role="tab"], [data-slot="tabs-trigger"]').count();
  const cards = await page.locator('[class*="card"], [data-slot="card"]').count();
  const tables = await page.locator("main table, article table, table").count();

  const brokenImages = await page.evaluate(async () => {
    await new Promise((r) => setTimeout(r, 1500));
    return Array.from(document.images)
      .filter((img) => img.naturalWidth === 0 && img.src && !img.src.startsWith("data:"))
      .map((img) => img.src)
      .slice(0, 10);
  });

  const headingAnchors = await page
    .locator('main h2 a[href^="#"], h2 a[href^="#"], main h3 a[href^="#"]')
    .count();

  const skipLink = await page
    .locator('a[href="#content"], a:has-text("Skip to content"), a:has-text("Skip to main")')
    .count();

  const banner = await page
    .locator('[class*="banner"], :text("Discord server")')
    .first()
    .isVisible()
    .catch(() => false);

  const bannerDismiss = await page
    .locator('[class*="banner"] button, [aria-label*="dismiss" i], [aria-label*="close" i]')
    .first()
    .isVisible()
    .catch(() => false);

  const copyPage = await page
    .locator('button:has-text("Copy page"), [aria-label*="Copy page" i], button:has-text("Copy")')
    .filter({ hasNot: page.locator("pre") })
    .first()
    .isVisible()
    .catch(() => false);

  const editOnGitHub = await page
    .locator('a[href*="github.com"][href*="edit"], a:has-text("Edit"), a:has-text("View source")')
    .first()
    .isVisible()
    .catch(() => false);

  const breadcrumbs = await page
    .locator('[aria-label*="breadcrumb" i], nav[class*="breadcrumb"], :text("›")')
    .first()
    .isVisible()
    .catch(() => false);

  const sectionNumbers = await page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return false;
    return /^\d+\.\s/.test(main.innerText.slice(0, 2000));
  });

  const codeBlockTitles = await page.evaluate(() => {
    const titles = [];
    for (const pre of document.querySelectorAll("pre")) {
      const fig = pre.closest("figure");
      const cap = fig?.querySelector("figcaption");
      if (cap?.textContent?.trim()) titles.push(cap.textContent.trim());
      const prev = pre.previousElementSibling;
      if (prev?.matches("p, span, div") && prev.textContent?.includes(".")) {
        titles.push(prev.textContent.trim().slice(0, 80));
      }
    }
    return titles.slice(0, 8);
  });

  const carouselMotion = await page.evaluate(() => {
    const animated = document.querySelector('[class*="carousel"], [class*="logo"]');
    if (!animated) return false;
    const style = getComputedStyle(animated);
    return style.animationName !== "none" || style.transitionDuration !== "0s";
  });

  const assistantVisible = await page
    .locator(
      'button:has-text("Ask"), button:has-text("Assistant"), [data-agent], [aria-label*="assistant" i], [aria-label*="AI" i]',
    )
    .first()
    .isVisible()
    .catch(() => false);

  const themeToggle = await page
    .locator(
      'button[aria-label*="theme" i], button[aria-label*="dark" i], button[aria-label*="light" i], [data-theme-toggle]',
    )
    .first()
    .isVisible()
    .catch(() => false);

  const typography = viewportName === "desktop" && ["P2", "P4"].includes(pageId)
    ? await measureTypography(page)
    : null;

  const contrast =
    viewportName === "desktop" && ["P2", "P3"].includes(pageId)
      ? await measureContrast(page)
      : null;

  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    return nav
      ? {
          domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
          load: Math.round(nav.loadEventEnd),
        }
      : null;
  });

  if (["P1", "P2", "P3", "P4", "P5", "P6"].includes(pageId) && viewportName === "desktop") {
    await page.screenshot({
      path: path.join(shots, platform, `${pageId}-${viewportName}-light.png`),
      fullPage: false,
    });
  }
  if (pageId === "P2" && ["tablet", "mobile"].includes(viewportName)) {
    await page.screenshot({
      path: path.join(shots, platform, `${pageId}-${viewportName}-light.png`),
      fullPage: false,
    });
  }
  if (pageId === "P6" && viewportName === "mobile") {
    await page.screenshot({
      path: path.join(shots, platform, `N4-P6-mobile-light-closed.png`),
      fullPage: false,
    });
  }

  return {
    pageId,
    pagePath,
    requestedUrl: target,
    finalUrl,
    status: response?.status() ?? null,
    title,
    chrome,
    h1: h1?.trim(),
    searchBtn,
    copyStats,
    callouts,
    noteCallouts,
    tipCallouts,
    tabs,
    cards,
    tables,
    brokenImages,
    headingAnchors,
    skipLink,
    banner,
    bannerDismiss,
    copyPage,
    editOnGitHub,
    breadcrumbs,
    sectionNumbers,
    codeBlockTitles,
    carouselMotion,
    assistantVisible,
    themeToggle,
    typography,
    contrast,
    prevNext,
    perf,
  };
}

async function testSearch(page, platform) {
  await page.goto(url(platform, "/"), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  const searchTrigger = page
    .getByRole("button", { name: /search/i })
    .or(page.locator("#search-bar-entry, #search-bar-entry-mobile"))
    .first();

  const hasSearch = (await searchTrigger.count()) > 0;
  if (!hasSearch) return { configured: false };

  const t0 = Date.now();
  await searchTrigger.click({ timeout: 5000 }).catch(async () => {
    await page.keyboard.press("Meta+k").catch(() => page.keyboard.press("Control+k"));
  });
  await page.waitForTimeout(600);
  const openMs = Date.now() - t0;

  const input = page
    .locator('input[type="search"], input[placeholder*="Search" i], [cmdk-input], input[role="combobox"]')
    .first();

  const dialogOpen = await input.isVisible().catch(() => false);
  if (!dialogOpen) return { configured: true, opens: false, openMs };

  const queries = {};
  for (const q of ["SKILL.md", "description", "uvx", "zzzznotfound"]) {
    await input.fill("");
    await input.fill(q);
    await page.waitForTimeout(700);
    const results = await page
      .locator('[cmdk-item], [role="option"], [data-search-result]')
      .allTextContents()
      .catch(() => []);
    queries[q] = results.slice(0, 5).map((t) => t.replace(/\s+/g, " ").trim());
  }

  const emptyStateMessage = (queries.zzzznotfound?.length ?? 0) > 0;

  await page.screenshot({
    path: path.join(shots, platform, "S5-search-empty-light.png"),
    fullPage: false,
  });

  return { configured: true, opens: true, openMs, queries, emptyStateMessage };
}

async function testKeyboardSearch(page, platform) {
  await page.setViewportSize(VIEWPORTS.desktop);
  await page.goto(url(platform, "/"), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await page.keyboard.press("Meta+k").catch(() => page.keyboard.press("Control+k"));
  await page.waitForTimeout(600);
  const input = page
    .locator('input[type="search"], input[placeholder*="Search" i], [cmdk-input], input[role="combobox"]')
    .first();
  return { opens: await input.isVisible().catch(() => false) };
}

async function testMobileNav(page, platform) {
  await page.setViewportSize(VIEWPORTS.mobile);
  await page.goto(url(platform, PAGES.P6), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  const trigger =
    platform === "mintlify"
      ? page.locator("button.lg\\:hidden").filter({ hasText: "Navigation" }).first()
      : page.locator('[data-sidebar="trigger"]').first();

  const hasTrigger = (await trigger.count()) > 0 && (await trigger.isVisible().catch(() => false));
  let opens = false;
  let links = [];

  if (hasTrigger) {
    await trigger.click();
    await page.waitForTimeout(600);
    opens = true;
    links = await page
      .getByRole("link")
      .allTextContents()
      .then((t) => t.filter(Boolean).slice(0, 12));
    await page.screenshot({
      path: path.join(shots, platform, "N4-P6-mobile-light-open.png"),
      fullPage: false,
    });
  }

  return { hasTrigger, opens, links };
}

async function fetchTextResource(platform, resourcePath) {
  const base = PLATFORMS[platform];
  try {
    const res = await fetch(`${base}${resourcePath}`);
    const text = res.ok ? await res.text() : null;
    return { ok: res.ok, status: res.status, text: text?.slice(0, 500) ?? null };
  } catch (err) {
    return { ok: false, status: 0, error: String(err) };
  }
}

async function fetchLlms(platform) {
  const res = await fetchTextResource(platform, "/llms.txt");
  const pageCount = res.text ? (res.text.match(/^- \[/gm) || []).length : 0;
  return { ok: res.ok, status: res.status, pageCount, sample: res.text };
}

async function test404(page, platform) {
  const resp = await page.goto(url(platform, P404), {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(800);
  const status = resp?.status() ?? null;
  const bodyText = await page.locator("main, body").first().textContent().catch(() => "");
  const hasNav = await page.getByRole("link").count().then((c) => c > 3);
  const helpful =
    /not found|404|doesn't exist|does not exist/i.test(bodyText || "") && hasNav;
  await page.screenshot({
    path: path.join(shots, platform, "F18-P404-light.png"),
    fullPage: false,
  });
  return { status, helpful, snippet: bodyText?.slice(0, 200)?.trim() };
}

async function testMeta(page, platform) {
  await page.goto(url(platform, "/"), { waitUntil: "domcontentloaded" });
  return page.evaluate(() => {
    const og = (prop) => document.querySelector(`meta[property="${prop}"]`)?.content;
    const name = (n) => document.querySelector(`meta[name="${n}"]`)?.content;
    return {
      ogTitle: og("og:title") || null,
      ogDescription: og("og:description") || null,
      ogImage: og("og:image") || null,
      twitterCard: name("twitter:card") || null,
      favicon: !!document.querySelector('link[rel="icon"], link[rel="shortcut icon"]'),
    };
  });
}

async function testMcp(platform) {
  for (const p of ["/mcp", "/.well-known/mcp", "/api/mcp"]) {
    const res = await fetchTextResource(platform, p);
    if (res.ok) return { found: true, path: p, status: res.status };
  }
  return { found: false };
}

async function testThemePersistence(page, platform) {
  await page.setViewportSize(VIEWPORTS.desktop);
  await page.goto(url(platform, "/"), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);

  const toggle = page
    .locator(
      'button[aria-label*="theme" i], button[aria-label*="dark" i], button[aria-label*="light" i], [data-theme-toggle]',
    )
    .first();

  if ((await toggle.count()) === 0) return { hasToggle: false, persists: false };

  const before = await page.evaluate(() => document.documentElement.className);
  await toggle.click();
  await page.waitForTimeout(400);
  const afterToggle = await page.evaluate(() => document.documentElement.className);

  await page.goto(url(platform, "/specification"), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const afterNav = await page.evaluate(() => document.documentElement.className);

  return {
    hasToggle: true,
    toggled: before !== afterToggle,
    persists: afterToggle === afterNav,
  };
}

async function testDiscoverability(page, platform) {
  const results = {};

  // D1 — search find & open (desktop)
  await page.setViewportSize(VIEWPORTS.desktop);
  await page.goto(url(platform, "/"), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const tSearch = Date.now();
  const searchBtn = page
    .getByRole("button", { name: /search/i })
    .or(page.locator("#search-bar-entry"))
    .first();
  const searchVisible = await searchBtn.isVisible().catch(() => false);
  if (searchVisible) await searchBtn.click();
  await page.waitForTimeout(500);
  const searchInput = page.locator('[cmdk-input], input[role="combobox"]').first();
  results.search = {
    visible: searchVisible,
    openMs: Date.now() - tSearch,
    dialogOpen: await searchInput.isVisible().catch(() => false),
  };

  // D2 — search mobile
  await page.setViewportSize(VIEWPORTS.mobile);
  await page.goto(url(platform, "/"), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const mobileSearch = page
    .getByRole("button", { name: /search/i })
    .or(page.locator("#search-bar-entry-mobile"))
    .first();
  results.searchMobile = {
    visible: await mobileSearch.isVisible().catch(() => false),
  };

  // D3 — theme (reuse testThemePersistence summary)
  results.theme = await testThemePersistence(page, platform);

  // D4 — assistant
  await page.setViewportSize(VIEWPORTS.desktop);
  await page.goto(url(platform, "/"), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const assistant = page
    .locator(
      'button:has-text("Ask"), button:has-text("Assistant"), [data-agent], [aria-label*="assistant" i]',
    )
    .first();
  results.assistant = {
    desktopVisible: await assistant.isVisible().catch(() => false),
  };
  await page.setViewportSize(VIEWPORTS.mobile);
  await page.goto(url(platform, "/"), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  results.assistant.mobileVisible = await assistant.isVisible().catch(() => false);

  // D5 — GitHub link
  await page.setViewportSize(VIEWPORTS.desktop);
  await page.goto(url(platform, "/"), { waitUntil: "domcontentloaded" });
  const github = page.locator('a[href*="github.com"]').first();
  results.github = {
    visible: await github.isVisible().catch(() => false),
    href: await github.getAttribute("href").catch(() => null),
  };

  return results;
}

/** Paired screenshots for enhancement-log items in the HTML report. */
async function captureEnhancementScreenshots(page) {
  for (const platform of Object.keys(PLATFORMS)) {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(url(platform, PAGES.P2), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const h2 = page.locator("main h2").first();
    if ((await h2.count()) > 0) await h2.hover();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(shots, platform, "O3-heading-anchors-light.png"),
      fullPage: false,
    });

    await page.goto(url(platform, "/"), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(shots, platform, "A1-skip-link-light.png"),
      fullPage: false,
    });

    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(url(platform, PAGES.P6), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(shots, platform, "N5-P6-mobile-light.png"),
      fullPage: false,
    });

    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(url(platform, PAGES.P4), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(shots, platform, "C1-P4-callouts-light.png"),
      fullPage: false,
    });

    await page.goto(url(platform, PAGES.P5), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(shots, platform, "PF2-P5-desktop-light.png"),
      fullPage: false,
    });
  }
}

function buildFeatureCompleteness(data) {
  const fc = {};
  for (const platform of Object.keys(PLATFORMS)) {
    const p2 = data.pages[platform]?.P2;
    const p4 = data.pages[platform]?.P4;
    const p5 = data.pages[platform]?.P5;
    const p3 = data.pages[platform]?.P3;
    const p6 = data.pages[platform]?.P6;
    const p1 = data.pages[platform]?.P1;
    const search = data.search[platform] || {};
    const mobileNav = data.mobileNav[platform] || {};
    const llms = data.llms[platform] || {};
    const meta = data.meta[platform] || {};
    const theme = data.discoverability[platform]?.theme || {};
    const keyboard = data.keyboardSearch[platform] || {};
    const notFound = data.notFound[platform] || {};
    const robots = data.robots[platform] || {};
    const sitemap = data.sitemap[platform] || {};
    const mcp = data.mcp[platform] || {};
    const tabletP2 = data.chromeChecklist[platform]?.tablet?.P2;
    const desktopP2 = data.chromeChecklist[platform]?.desktop?.P2;

    fc[platform] = {
      F1:
        search.configured &&
        search.opens &&
        ["SKILL.md", "description", "uvx"].some((q) => (search.queries?.[q]?.length ?? 0) > 0),
      F2: keyboard.opens === true,
      F3: theme.hasToggle || p1?.themeToggle,
      F4: theme.persists === true,
      F5:
        mobileNav.hasTrigger &&
        mobileNav.opens &&
        (mobileNav.links?.length ?? 0) >= 8,
      F6: p1?.banner === true && p1?.bannerDismiss === true,
      F7: (p2?.headingAnchors ?? 0) > 0,
      F8: (p1?.skipLink ?? 0) > 0,
      F9: (p2?.prevNext?.length ?? 0) > 0,
      F10: p2?.copyPage === true,
      F11: llms.ok && llms.pageCount >= 3,
      F12: (() => {
        const p7 = data.redirects[platform]?.P7;
        const p8 = data.redirects[platform]?.P8;
        return (
          p7?.finalUrl?.includes("adding-skills-support") &&
          p8?.finalUrl &&
          !p8.finalUrl.includes("what-are-skills")
        );
      })(),
      F13: platform === "mintlify" ? p1?.carouselMotion === true : "partial",
      F14: platform === "mintlify" ? true : "partial",
      F15: p2?.sectionNumbers === true,
      F16:
        platform === "mintlify"
          ? (p4?.noteCallouts ?? 0) > 0 || (p4?.tipCallouts ?? 0) > 0
          : (p4?.noteCallouts ?? 0) > 0 && (p4?.tipCallouts ?? 0) > 0
            ? true
            : "partial",
      F17: p1?.editOnGitHub === true,
      F18: notFound.helpful === true,
      F19: !!(meta.ogTitle && meta.ogDescription),
      F20: !!(meta.twitterCard || meta.ogImage),
      F21: mcp.found === true,
      F22: p1?.assistantVisible === true,
      F23: p6?.breadcrumbs === true,
      F24: desktopP2?.outline === "right-rail",
      F25: tabletP2?.outline === "right-rail" || tabletP2?.outline === "inline",
      F26: meta.favicon === true,
      F27: robots.ok === true,
      F28: sitemap.ok === true,
      F29: p2?.copyStats?.allBlocksHaveCopy === true,
      F30: (p4?.codeBlockTitles?.length ?? 0) > 0,
      F31: (p5?.tabs ?? 0) >= 6,
      F32: (p1?.cards ?? 0) > 0 && (p2?.cards ?? 0) > 0,
      F33: (p3?.brokenImages?.length ?? 0) === 0,
      F34: search.emptyStateMessage === true,
      F35: "n/a",
    };
  }
  return fc;
}

function featureStatus(value) {
  if (value === "n/a") return "n/a";
  if (value === "partial") return "partial";
  return value ? "y" : "n";
}

function isFeatureGap(mintlifyVal, docspageVal) {
  if (mintlifyVal === "n/a" || docspageVal === "n/a") return false;
  if (docspageVal === true) return false;
  if (docspageVal === "partial" && mintlifyVal !== true) return false;
  if (docspageVal === false && mintlifyVal === false) return false;
  return docspageVal === false || docspageVal === "partial";
}

function writeFeatureCompletenessMd(data) {
  const fc = data.featureCompleteness;
  const gaps = FEATURE_META.filter((meta) => {
    if (meta.owner === "Out of scope") return false;
    return isFeatureGap(fc.mintlify?.[meta.id], fc.docspage?.[meta.id]);
  });

  const lines = [
    "# Feature completeness — outstanding gaps",
    "",
    "Features where **docs.page is behind Mintlify**. Parity and wins omitted.",
    "",
    `Audited: ${data.auditedAt}`,
    "",
    "| ID | Feature | Owner | Mintlify | docs.page | Notes |",
    "|---|---|---|---|---|---|",
  ];

  for (const meta of gaps) {
    const m = fc.mintlify?.[meta.id];
    const d = fc.docspage?.[meta.id];
    const mStr = featureStatus(m);
    const dStr = featureStatus(d);
    let notes = "";
    if (meta.id === "F5" && !fc.docspage?.F5) notes = "Drawer opens but fewer than 8 nav links (incomplete tree)";
    if (meta.id === "F13") notes = "Fixture uses static logos";
    if (meta.id === "F14") notes = "CardGroup vs ClientShowcase";
    if (meta.id === "F16") notes = "Info-only callouts in fixture";
    lines.push(`| ${meta.id} | ${meta.feature} | ${meta.owner} | ${mStr} | ${dStr} | ${notes} |`);
  }

  lines.push("");
  lines.push(`**${gaps.length} feature gaps** behind Mintlify. Cross-reference [enhancement-log.md](./enhancement-log.md).`);
  lines.push("");
  lines.push("Full raw matrix: `audit-data.json` → `featureCompleteness`.");

  fs.mkdirSync(path.dirname(completenessFile), { recursive: true });
  fs.writeFileSync(completenessFile, lines.join("\n") + "\n");
}

async function testDarkMode(page, platform, pagePath) {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(url(platform, pagePath), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(shots, platform, `P2-dark.png`),
    fullPage: false,
  });
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const color = await page.evaluate(() => getComputedStyle(document.body).color);
  const contrast = await measureContrast(page);
  return { bg, color, contrast };
}

async function testWarmNav(page, platform) {
  await page.setViewportSize(VIEWPORTS.desktop);
  const t0 = Date.now();
  await page.goto(url(platform, "/"), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await page.goto(url(platform, "/clients"), { waitUntil: "domcontentloaded" });
  const t1 = Date.now() - t0;
  await page.goto(url(platform, "/skill-creation/using-scripts"), {
    waitUntil: "domcontentloaded",
  });
  const t2 = Date.now() - t0;
  return { toClientsMs: t1, toScriptsMs: t2 };
}

async function main() {
  for (const p of ["mintlify", "docspage"]) {
    fs.mkdirSync(path.join(shots, p), { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const data = {
    auditedAt: new Date().toISOString(),
    rubricVersion: "1.2",
    platforms: PLATFORMS,
    viewports: VIEWPORTS,
    chromeChecklist: {},
    pages: {},
    redirects: {},
    search: {},
    keyboardSearch: {},
    mobileNav: {},
    llms: {},
    robots: {},
    sitemap: {},
    mcp: {},
    meta: {},
    notFound: {},
    darkMode: {},
    warmNav: {},
    discoverability: {},
    featureCompleteness: {},
  };

  // Chrome checklist P2 + P6
  for (const platform of Object.keys(PLATFORMS)) {
    data.chromeChecklist[platform] = {};
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(vp);
      data.chromeChecklist[platform][vpName] = {};
      for (const pid of ["P2", "P6"]) {
        await page.goto(url(platform, PAGES[pid]), { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1000);
        data.chromeChecklist[platform][vpName][pid] = await detectChrome(page);
      }
    }
  }

  // All pages desktop
  for (const platform of Object.keys(PLATFORMS)) {
    data.pages[platform] = {};
    await page.setViewportSize(VIEWPORTS.desktop);
    for (const [pid, ppath] of Object.entries(PAGES)) {
      if (pid.startsWith("P7") || pid.startsWith("P8")) continue;
      data.pages[platform][pid] = await auditPage(page, platform, pid, ppath, "desktop");
    }
  }

  // Redirects
  for (const platform of Object.keys(PLATFORMS)) {
    data.redirects[platform] = {};
    for (const [pid, ppath] of Object.entries({ P7: PAGES.P7, P8: PAGES.P8 })) {
      const resp = await page.goto(url(platform, ppath), { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      data.redirects[platform][pid] = {
        from: ppath,
        finalUrl: page.url(),
        status: resp?.status(),
      };
    }
  }

  // Search, mobile nav, llms, meta, 404, dark, warm nav, discoverability
  for (const platform of Object.keys(PLATFORMS)) {
    data.search[platform] = await testSearch(page, platform);
    data.keyboardSearch[platform] = await testKeyboardSearch(page, platform);
    data.mobileNav[platform] = await testMobileNav(page, platform);
    data.llms[platform] = await fetchLlms(platform);
    data.robots[platform] = await fetchTextResource(platform, "/robots.txt");
    data.sitemap[platform] = await fetchTextResource(platform, "/sitemap.xml");
    data.mcp[platform] = await testMcp(platform);
    data.meta[platform] = await testMeta(page, platform);
    data.notFound[platform] = await test404(page, platform);
    data.darkMode[platform] = await testDarkMode(page, platform, "/specification");
    data.warmNav[platform] = await testWarmNav(page, platform);
    data.discoverability[platform] = await testDiscoverability(page, platform);
  }

  // P5 tabs at tablet/mobile
  data.tabsViewports = {};
  for (const platform of Object.keys(PLATFORMS)) {
    data.tabsViewports[platform] = {};
    for (const [vpName, vp] of Object.entries({ tablet: VIEWPORTS.tablet, mobile: VIEWPORTS.mobile })) {
      await page.setViewportSize(vp);
      await page.goto(url(platform, PAGES.P5), { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      const tabCount = await page.locator('[role="tab"], [data-slot="tabs-trigger"]').count();
      await page.screenshot({
        path: path.join(shots, platform, `P5-${vpName}-light.png`),
        fullPage: false,
      });
      data.tabsViewports[platform][vpName] = { tabCount };
    }
  }

  data.featureCompleteness = buildFeatureCompleteness(data);

  await captureEnhancementScreenshots(page);

  await browser.close();
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
  writeFeatureCompletenessMd(data);
  console.log(`Wrote ${outFile}`);
  console.log(`Wrote ${completenessFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
