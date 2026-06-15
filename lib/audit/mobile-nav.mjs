import path from "node:path";
import { PAGES, VIEWPORTS } from "./constants.mjs";
import { pageUrl } from "./utils.mjs";

export async function auditMobileNav(page, platform, ctx) {
  await page.setViewportSize(VIEWPORTS.mobile);
  await page.goto(pageUrl(platform, PAGES.P6, ctx.baseURL), { waitUntil: "domcontentloaded" });
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
      .then((t) => t.filter(Boolean).slice(0, 20));
    if (ctx.shotsDir) {
      await page.screenshot({
        path: path.join(ctx.shotsDir, platform, "N4-P6-mobile-light-open.png"),
        fullPage: false,
      });
    }
  }

  return { hasTrigger, opens, links };
}
