import path from "node:path";
import { P404 } from "./constants.mjs";
import { pageUrl } from "./utils.mjs";

export async function audit404(page, platform, ctx) {
  const resp = await page.goto(pageUrl(platform, P404, ctx.baseURL), {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(800);
  const status = resp?.status() ?? null;
  const bodyText = await page.locator("main, body").first().textContent().catch(() => "");
  const hasNav = await page.getByRole("link").count().then((c) => c > 3);
  const helpful =
    /not found|404|doesn't exist|does not exist/i.test(bodyText || "") && hasNav;
  if (ctx.shotsDir) {
    await page.screenshot({
      path: path.join(ctx.shotsDir, platform, "F18-P404-light.png"),
      fullPage: false,
    });
  }
  return { status, helpful, snippet: bodyText?.slice(0, 200)?.trim() };
}

export async function auditMeta(page, platform, ctx) {
  await page.goto(pageUrl(platform, "/", ctx.baseURL), { waitUntil: "domcontentloaded" });
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
