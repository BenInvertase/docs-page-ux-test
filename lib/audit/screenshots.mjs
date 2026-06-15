import path from "node:path";
import { PAGES, PLATFORMS, VIEWPORTS } from "./constants.mjs";
import { pageUrl } from "./utils.mjs";

const SKIP_LINK_PATTERN = /skip to (main )?content/i;
const SKIP_LINK_HREFS = new Set(["#content", "#content-area", "#main"]);

async function isSkipLinkFocused(page) {
  return page.evaluate(
    ({ patternSource, hrefs }) => {
      const el = document.activeElement;
      if (!el || el.tagName !== "A") return false;
      const text = el.textContent?.trim() ?? "";
      const href = el.getAttribute("href") ?? "";
      const pattern = new RegExp(patternSource, "i");
      return pattern.test(text) || hrefs.includes(href);
    },
    { patternSource: SKIP_LINK_PATTERN.source, hrefs: [...SKIP_LINK_HREFS] },
  );
}

/** Tab until skip link is focused, or stop after maxTabs. Returns tab count when found, else null. */
async function tabUntilSkipLinkFocused(page, maxTabs = 15) {
  for (let i = 1; i <= maxTabs; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);
    if (await isSkipLinkFocused(page)) return i;
  }
  return null;
}

async function tabNTimes(page, count) {
  for (let i = 0; i < count; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);
  }
}

/**
 * Capture paired skip-link evidence: Mintlify tabs to visible skip link;
 * docs.page tabs the same number of times to show no equivalent control.
 */
async function captureSkipLinkScreenshot(page, platform, ctx, referenceTabStop) {
  await page.goto(pageUrl(platform, "/", ctx.baseURL), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  let tabStop = referenceTabStop;

  if (platform === "mintlify") {
    tabStop = (await tabUntilSkipLinkFocused(page)) ?? referenceTabStop;
  } else {
    await tabNTimes(page, tabStop);
  }

  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(ctx.shotsDir, platform, "A1-skip-link-light.png"),
    fullPage: false,
  });

  return tabStop;
}

/** Paired screenshots for enhancement-log items in the HTML report. */
export async function captureEnhancementScreenshots(page, ctx) {
  if (!ctx.shotsDir) return;

  let skipLinkTabStop = 2;

  for (const platform of Object.keys(PLATFORMS)) {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(pageUrl(platform, PAGES.P2, ctx.baseURL), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const h2 = page.locator("main h2").first();
    if ((await h2.count()) > 0) await h2.hover();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(ctx.shotsDir, platform, "O3-heading-anchors-light.png"),
      fullPage: false,
    });

    skipLinkTabStop = await captureSkipLinkScreenshot(page, platform, ctx, skipLinkTabStop);

    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(pageUrl(platform, PAGES.P6, ctx.baseURL), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ctx.shotsDir, platform, "N5-P6-mobile-light.png"),
      fullPage: false,
    });

    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(pageUrl(platform, PAGES.P4, ctx.baseURL), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ctx.shotsDir, platform, "C1-P4-callouts-light.png"),
      fullPage: false,
    });

    await page.goto(pageUrl(platform, PAGES.P5, ctx.baseURL), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ctx.shotsDir, platform, "PF2-P5-desktop-light.png"),
      fullPage: false,
    });
  }
}
