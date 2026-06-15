import path from "node:path";
import { VIEWPORTS } from "./constants.mjs";
import { measureContrast } from "./metrics.mjs";
import { pageUrl } from "./utils.mjs";

export async function auditThemePersistence(page, platform, ctx) {
  await page.setViewportSize(VIEWPORTS.desktop);
  await page.goto(pageUrl(platform, "/", ctx.baseURL), { waitUntil: "domcontentloaded" });
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

  await page.goto(pageUrl(platform, "/specification", ctx.baseURL), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const afterNav = await page.evaluate(() => document.documentElement.className);

  return {
    hasToggle: true,
    toggled: before !== afterToggle,
    persists: afterToggle === afterNav,
  };
}

export async function auditDiscoverability(page, platform, ctx) {
  const results = {};

  await page.setViewportSize(VIEWPORTS.desktop);
  await page.goto(pageUrl(platform, "/", ctx.baseURL), { waitUntil: "domcontentloaded" });
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

  await page.setViewportSize(VIEWPORTS.mobile);
  await page.goto(pageUrl(platform, "/", ctx.baseURL), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const mobileSearch = page
    .getByRole("button", { name: /search/i })
    .or(page.locator("#search-bar-entry-mobile"))
    .first();
  results.searchMobile = {
    visible: await mobileSearch.isVisible().catch(() => false),
  };

  results.theme = await auditThemePersistence(page, platform, ctx);

  await page.setViewportSize(VIEWPORTS.desktop);
  await page.goto(pageUrl(platform, "/", ctx.baseURL), { waitUntil: "domcontentloaded" });
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
  await page.goto(pageUrl(platform, "/", ctx.baseURL), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  results.assistant.mobileVisible = await assistant.isVisible().catch(() => false);

  await page.setViewportSize(VIEWPORTS.desktop);
  await page.goto(pageUrl(platform, "/", ctx.baseURL), { waitUntil: "domcontentloaded" });
  const github = page.locator('a[href*="github.com"]').first();
  results.github = {
    visible: await github.isVisible().catch(() => false),
    href: await github.getAttribute("href").catch(() => null),
  };

  return results;
}

export async function auditDarkMode(page, platform, pagePath, ctx) {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(pageUrl(platform, pagePath, ctx.baseURL), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  if (ctx.shotsDir) {
    await page.screenshot({
      path: path.join(ctx.shotsDir, platform, `P2-dark.png`),
      fullPage: false,
    });
  }
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const color = await page.evaluate(() => getComputedStyle(document.body).color);
  const contrast = await measureContrast(page);
  return { bg, color, contrast };
}

export async function auditWarmNav(page, platform, ctx) {
  await page.setViewportSize(VIEWPORTS.desktop);
  const t0 = Date.now();
  await page.goto(pageUrl(platform, "/", ctx.baseURL), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await page.goto(pageUrl(platform, "/clients", ctx.baseURL), { waitUntil: "domcontentloaded" });
  const t1 = Date.now() - t0;
  await page.goto(pageUrl(platform, "/skill-creation/using-scripts", ctx.baseURL), {
    waitUntil: "domcontentloaded",
  });
  const t2 = Date.now() - t0;
  return { toClientsMs: t1, toScriptsMs: t2 };
}
