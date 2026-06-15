import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { detectChrome } from "./chrome.mjs";
import { PAGES, PLATFORMS, VIEWPORTS } from "./constants.mjs";
import {
  auditDarkMode,
  auditDiscoverability,
  auditWarmNav,
} from "./discoverability.mjs";
import {
  buildFeatureCompleteness,
  writeFeatureCompletenessMd,
} from "./feature-completeness.mjs";
import { audit404, auditMeta } from "./meta.mjs";
import { auditMobileNav } from "./mobile-nav.mjs";
import { auditPage } from "./page-audit.mjs";
import { createAuditContext } from "./paths.mjs";
import {
  fetchLlms,
  fetchTextResource,
  testMcp,
} from "./resources.mjs";
import { auditKeyboardSearch, auditSearch } from "./search.mjs";
import { captureEnhancementScreenshots } from "./screenshots.mjs";
import { pageUrl } from "./utils.mjs";

/**
 * Run the full UX audit data collection pipeline.
 * Writes gitignored outputs: audit-data.json, feature-completeness.md, screenshots/.
 */
export async function runFullAudit(options = {}) {
  const ctx = {
    ...createAuditContext(options.root),
    baseURL: options.baseURL,
  };

  for (const p of Object.keys(PLATFORMS)) {
    fs.mkdirSync(path.join(ctx.shotsDir, p), { recursive: true });
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

  for (const platform of Object.keys(PLATFORMS)) {
    data.chromeChecklist[platform] = {};
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(vp);
      data.chromeChecklist[platform][vpName] = {};
      for (const pid of ["P2", "P6"]) {
        await page.goto(pageUrl(platform, PAGES[pid], ctx.baseURL), {
          waitUntil: "domcontentloaded",
        });
        await page.waitForTimeout(1000);
        data.chromeChecklist[platform][vpName][pid] = await detectChrome(page);
      }
    }
  }

  for (const platform of Object.keys(PLATFORMS)) {
    data.pages[platform] = {};
    await page.setViewportSize(VIEWPORTS.desktop);
    for (const [pid, ppath] of Object.entries(PAGES)) {
      if (pid.startsWith("P7") || pid.startsWith("P8")) continue;
      data.pages[platform][pid] = await auditPage(
        page,
        platform,
        pid,
        ppath,
        "desktop",
        ctx,
      );
    }
  }

  for (const platform of Object.keys(PLATFORMS)) {
    data.redirects[platform] = {};
    for (const [pid, ppath] of Object.entries({ P7: PAGES.P7, P8: PAGES.P8 })) {
      const resp = await page.goto(pageUrl(platform, ppath, ctx.baseURL), {
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(500);
      data.redirects[platform][pid] = {
        from: ppath,
        finalUrl: page.url(),
        status: resp?.status(),
      };
    }
  }

  for (const platform of Object.keys(PLATFORMS)) {
    data.search[platform] = await auditSearch(page, platform, ctx);
    data.keyboardSearch[platform] = await auditKeyboardSearch(page, platform, ctx);
    data.mobileNav[platform] = await auditMobileNav(page, platform, ctx);
    data.llms[platform] = await fetchLlms(platform, ctx.baseURL);
    data.robots[platform] = await fetchTextResource(platform, "/robots.txt", ctx.baseURL);
    data.sitemap[platform] = await fetchTextResource(platform, "/sitemap.xml", ctx.baseURL);
    data.mcp[platform] = await testMcp(platform, ctx.baseURL);
    data.meta[platform] = await auditMeta(page, platform, ctx);
    data.notFound[platform] = await audit404(page, platform, ctx);
    data.darkMode[platform] = await auditDarkMode(page, platform, "/specification", ctx);
    data.warmNav[platform] = await auditWarmNav(page, platform, ctx);
    data.discoverability[platform] = await auditDiscoverability(page, platform, ctx);
  }

  data.tabsViewports = {};
  for (const platform of Object.keys(PLATFORMS)) {
    data.tabsViewports[platform] = {};
    for (const [vpName, vp] of Object.entries({
      tablet: VIEWPORTS.tablet,
      mobile: VIEWPORTS.mobile,
    })) {
      await page.setViewportSize(vp);
      await page.goto(pageUrl(platform, PAGES.P5, ctx.baseURL), {
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(800);
      const tabCount = await page.locator('[role="tab"], [data-slot="tabs-trigger"]').count();
      if (ctx.shotsDir) {
        await page.screenshot({
          path: path.join(ctx.shotsDir, platform, `P5-${vpName}-light.png`),
          fullPage: false,
        });
      }
      data.tabsViewports[platform][vpName] = { tabCount };
    }
  }

  // P2 at tablet/mobile — used by enhancement-log N9 and L5 in the HTML report
  for (const platform of Object.keys(PLATFORMS)) {
    for (const [vpName, vp] of Object.entries({
      tablet: VIEWPORTS.tablet,
      mobile: VIEWPORTS.mobile,
    })) {
      await page.setViewportSize(vp);
      await page.goto(pageUrl(platform, PAGES.P2, ctx.baseURL), {
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(800);
      if (ctx.shotsDir) {
        await page.screenshot({
          path: path.join(ctx.shotsDir, platform, `P2-${vpName}-light.png`),
          fullPage: false,
        });
      }
    }
  }

  data.featureCompleteness = buildFeatureCompleteness(data);

  await captureEnhancementScreenshots(page, ctx);

  await browser.close();
  fs.mkdirSync(path.dirname(ctx.outFile), { recursive: true });
  fs.writeFileSync(ctx.outFile, JSON.stringify(data, null, 2));
  writeFeatureCompletenessMd(data, ctx.completenessFile);

  return { data, ctx };
}
