import path from "node:path";
import { VIEWPORTS } from "./constants.mjs";
import { pageUrl } from "./utils.mjs";

export async function auditSearch(page, platform, ctx) {
  await page.goto(pageUrl(platform, "/", ctx.baseURL), { waitUntil: "domcontentloaded" });
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

  if (ctx.shotsDir) {
    await page.screenshot({
      path: path.join(ctx.shotsDir, platform, "S5-search-empty-light.png"),
      fullPage: false,
    });
  }

  return { configured: true, opens: true, openMs, queries, emptyStateMessage };
}

export async function auditKeyboardSearch(page, platform, ctx) {
  await page.setViewportSize(VIEWPORTS.desktop);
  await page.goto(pageUrl(platform, "/", ctx.baseURL), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await page.keyboard.press("Meta+k").catch(() => page.keyboard.press("Control+k"));
  await page.waitForTimeout(600);
  const input = page
    .locator('input[type="search"], input[placeholder*="Search" i], [cmdk-input], input[role="combobox"]')
    .first();
  return { opens: await input.isVisible().catch(() => false) };
}
