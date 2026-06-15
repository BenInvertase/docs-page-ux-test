import path from "node:path";
import { detectChrome } from "./chrome.mjs";
import { countCopyButtons, countHeadingAnchors, measureContrast, measureTypography } from "./metrics.mjs";
import { pageUrl } from "./utils.mjs";

export async function auditPage(page, platform, pageId, pagePath, viewportName, ctx) {
  const target = pageUrl(platform, pagePath, ctx.baseURL);
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

  const headingAnchorStats = await countHeadingAnchors(page);

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

  const typography =
    viewportName === "desktop" && ["P2", "P4"].includes(pageId)
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

  if (ctx.shotsDir) {
    if (["P1", "P2", "P3", "P4", "P5", "P6"].includes(pageId) && viewportName === "desktop") {
      await page.screenshot({
        path: path.join(ctx.shotsDir, platform, `${pageId}-${viewportName}-light.png`),
        fullPage: false,
      });
    }
    if (pageId === "P2" && ["tablet", "mobile"].includes(viewportName)) {
      await page.screenshot({
        path: path.join(ctx.shotsDir, platform, `${pageId}-${viewportName}-light.png`),
        fullPage: false,
      });
    }
    if (pageId === "P6" && viewportName === "mobile") {
      await page.screenshot({
        path: path.join(ctx.shotsDir, platform, `N4-P6-mobile-light-closed.png`),
        fullPage: false,
      });
    }
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
    headingAnchors: headingAnchorStats.headingsWithAnchors,
    headingAnchorStats,
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
