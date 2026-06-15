export async function measureTypography(page) {
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

export async function measureContrast(page) {
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

/**
 * Count heading permalink affordances.
 * Mintlify: inline link inside the heading. docs.page: adjacent hover button linking to [data-heading] id.
 */
export async function countHeadingAnchors(page) {
  return page.evaluate(() => {
    const main = document.querySelector("main") || document.body;
    const headings = Array.from(main.querySelectorAll("h2, h3, h4")).filter((heading) => {
      if (
        heading.closest(
          '#table-of-contents, [class*="table-of-contents"], nav[aria-label*="on this page" i]',
        )
      ) {
        return false;
      }
      const text = heading.textContent?.trim() ?? "";
      if (/^on this page$/i.test(text)) return false;
      return true;
    });

    let inlineCount = 0;
    let adjacentCount = 0;

    for (const heading of headings) {
      if (heading.querySelector('a[href^="#"]')) {
        inlineCount++;
        continue;
      }

      const container = heading.parentElement;
      if (!container) continue;

      const anchor = container.querySelector('a[href^="#"]');
      if (!anchor) continue;

      const href = anchor.getAttribute("href");
      const id = href?.startsWith("#") ? href.slice(1) : null;
      if (!id) continue;

      const target = container.querySelector(`[id="${CSS.escape(id)}"]`);
      if (target) adjacentCount++;
    }

    const headingsWithAnchors = inlineCount + adjacentCount;

    return {
      inlineCount,
      adjacentCount,
      headingsWithAnchors,
      totalHeadings: headings.length,
      style:
        inlineCount > 0 && adjacentCount > 0
          ? "mixed"
          : inlineCount > 0
            ? "inline"
            : adjacentCount > 0
              ? "adjacent"
              : "none",
    };
  });
}

export async function countCopyButtons(page) {
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
