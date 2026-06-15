export async function detectChrome(page) {
  const sidebarPersistent = await page
    .locator('[data-sidebar="sidebar"], aside nav, nav[aria-label="Pages"]')
    .first()
    .isVisible()
    .catch(() => false);

  const docspageSidebarTrigger = await page
    .locator('[data-sidebar="trigger"]')
    .first()
    .isVisible()
    .catch(() => false);

  const sidebarTrigger = await page
    .locator('button.lg\\:hidden')
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

  const outline = await detectOutline(page);

  const mainWidth = await page.locator("main").first().boundingBox().catch(() => null);
  const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  const horizontalScroll = bodyScrollWidth > viewportWidth + 2;

  let sidebar = "hidden";
  if (sidebarPersistent) sidebar = "persistent";
  else if (docspageSidebarTrigger || sidebarTrigger || mintlifyNavBtn) sidebar = "drawer";

  return {
    sidebar,
    outline,
    mainWidth: mainWidth?.width ?? null,
    horizontalScroll,
  };
}

/**
 * Detect a visible in-viewport table of contents.
 * Ignores hidden DOM nodes and loose text matches (e.g. ":text('On this page')").
 */
export async function detectOutline(page) {
  return page.evaluate(() => {
    const selectors = [
      "#table-of-contents",
      '[class*="table-of-contents"]',
      'nav[aria-label*="on this page" i]',
      '[data-table-of-contents]',
    ];

    const seen = new Set();
    const candidates = [];
    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        if (seen.has(el)) continue;
        seen.add(el);
        candidates.push(el);
      }
    }

    for (const el of candidates) {
      if (el.closest('[data-sidebar="sidebar"], [role="dialog"], [aria-modal="true"]')) {
        continue;
      }

      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
        continue;
      }
      if (rect.width < 48 || rect.height < 80) continue;
      if (rect.bottom <= 8 || rect.top >= window.innerHeight - 8) continue;
      if (rect.right <= 0 || rect.left >= window.innerWidth) continue;

      if (rect.left >= window.innerWidth * 0.55) return "right-rail";
      return "inline";
    }

    return "hidden";
  });
}
