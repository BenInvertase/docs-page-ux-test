import { test, expect } from "@playwright/test";
import {
  MIN_MOBILE_NAV_LINKS,
  PAGES,
  VIEWPORTS,
} from "../../lib/audit/constants.mjs";
import { detectChrome } from "../../lib/audit/chrome.mjs";
import { countHeadingAnchors } from "../../lib/audit/metrics.mjs";
import { auditMobileNav } from "../../lib/audit/mobile-nav.mjs";
import { auditMeta } from "../../lib/audit/meta.mjs";
import { fetchLlms, fetchTextResource } from "../../lib/audit/resources.mjs";
import { toRelativePath } from "../../lib/audit/utils.mjs";

const PLATFORM = "docspage";

test.describe("docs.page fixture regression", () => {
  test("core fixture pages return 200", async ({ page }) => {
    for (const [id, pagePath] of Object.entries(PAGES)) {
      if (id.startsWith("P7") || id.startsWith("P8")) continue;
      const response = await page.goto(toRelativePath(pagePath), { waitUntil: "domcontentloaded" });
      expect.soft(response?.status(), `${id} ${pagePath}`).toBe(200);
    }
  });

  test("mobile nav drawer lists all sidebar pages", async ({ page, baseURL }) => {
    const result = await auditMobileNav(page, PLATFORM, { baseURL, shotsDir: null });
    expect(result.hasTrigger, "mobile nav trigger visible").toBe(true);
    expect(result.opens, "mobile nav drawer opens").toBe(true);
    expect(
      result.links.length,
      `expected ≥${MIN_MOBILE_NAV_LINKS} nav links, got ${result.links.length}: ${result.links.join(", ")}`,
    ).toBeGreaterThanOrEqual(MIN_MOBILE_NAV_LINKS);
  });

  test("mobile specification page uses drawer nav without visible TOC rail", async ({ page, baseURL }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    const response = await page.goto(toRelativePath(PAGES.P2), { waitUntil: "domcontentloaded" });
    expect(response?.status(), `expected 200 for ${baseURL}${PAGES.P2}`).toBe(200);
    await page.waitForTimeout(800);

    const chrome = await detectChrome(page);
    expect(chrome.sidebar, "sidebar collapses to drawer on mobile").toBe("drawer");
    expect(chrome.outline, "no visible in-viewport TOC rail on mobile P2").toBe("hidden");
  });

  test("specification headings expose permalink controls", async ({ page, baseURL }) => {
    const response = await page.goto(toRelativePath(PAGES.P2), { waitUntil: "domcontentloaded" });
    expect(response?.status(), `expected 200 for ${baseURL}${PAGES.P2}`).toBe(200);
    await page.waitForTimeout(800);

    const stats = await countHeadingAnchors(page);
    expect(stats.headingsWithAnchors, "headings with permalink affordance").toBeGreaterThan(3);
    expect(stats.adjacentCount, "docs.page uses adjacent hover permalink buttons").toBeGreaterThan(0);
    expect(stats.style, "permalink pattern detected").toBe("adjacent");
  });

  test("homepage has favicon and Open Graph meta", async ({ page, baseURL }) => {
    await page.goto(toRelativePath("/"), { waitUntil: "domcontentloaded" });
    const meta = await auditMeta(page, PLATFORM, { baseURL, shotsDir: null });
    expect(meta.favicon, "favicon link present").toBe(true);
    expect(meta.ogTitle, "og:title present").toBeTruthy();
    expect(meta.ogDescription, "og:description present").toBeTruthy();
  });

  test("llms.txt, robots.txt, and sitemap.xml are available", async ({ baseURL }) => {
    const llms = await fetchLlms(PLATFORM, baseURL);
    expect(llms.ok, "llms.txt reachable").toBe(true);
    expect(llms.pageCount, "llms.txt lists pages").toBeGreaterThanOrEqual(3);

    const robots = await fetchTextResource(PLATFORM, "/robots.txt", baseURL);
    expect(robots.ok, "robots.txt reachable").toBe(true);

    const sitemap = await fetchTextResource(PLATFORM, "/sitemap.xml", baseURL);
    expect(sitemap.ok, "sitemap.xml reachable").toBe(true);
  });
});
