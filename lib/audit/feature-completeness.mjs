import fs from "node:fs";
import path from "node:path";
import { FEATURE_META, PLATFORMS } from "./constants.mjs";
import { featureStatus, isFeatureGap } from "./utils.mjs";

export function buildFeatureCompleteness(data) {
  const fc = {};
  for (const platform of Object.keys(PLATFORMS)) {
    const p2 = data.pages[platform]?.P2;
    const p4 = data.pages[platform]?.P4;
    const p5 = data.pages[platform]?.P5;
    const p3 = data.pages[platform]?.P3;
    const p6 = data.pages[platform]?.P6;
    const p1 = data.pages[platform]?.P1;
    const search = data.search[platform] || {};
    const mobileNav = data.mobileNav[platform] || {};
    const llms = data.llms[platform] || {};
    const meta = data.meta[platform] || {};
    const theme = data.discoverability[platform]?.theme || {};
    const keyboard = data.keyboardSearch[platform] || {};
    const notFound = data.notFound[platform] || {};
    const robots = data.robots[platform] || {};
    const sitemap = data.sitemap[platform] || {};
    const mcp = data.mcp[platform] || {};
    const tabletP2 = data.chromeChecklist[platform]?.tablet?.P2;
    const desktopP2 = data.chromeChecklist[platform]?.desktop?.P2;

    fc[platform] = {
      F1:
        search.configured &&
        search.opens &&
        ["SKILL.md", "description", "uvx"].some((q) => (search.queries?.[q]?.length ?? 0) > 0),
      F2: keyboard.opens === true,
      F3: theme.hasToggle || p1?.themeToggle,
      F4: theme.persists === true,
      F5:
        mobileNav.hasTrigger &&
        mobileNav.opens &&
        (mobileNav.links?.length ?? 0) >= 8,
      F6: p1?.banner === true && p1?.bannerDismiss === true,
      F7: (p2?.headingAnchors ?? 0) > 0,
      F8: (p1?.skipLink ?? 0) > 0,
      F9: (p2?.prevNext?.length ?? 0) > 0,
      F10: p2?.copyPage === true,
      F11: llms.ok && llms.pageCount >= 3,
      F12: (() => {
        const p7 = data.redirects[platform]?.P7;
        const p8 = data.redirects[platform]?.P8;
        return (
          p7?.finalUrl?.includes("adding-skills-support") &&
          p8?.finalUrl &&
          !p8.finalUrl.includes("what-are-skills")
        );
      })(),
      F13: platform === "mintlify" ? p1?.carouselMotion === true : "partial",
      F14: platform === "mintlify" ? true : "partial",
      F15: p2?.sectionNumbers === true,
      F16:
        platform === "mintlify"
          ? (p4?.noteCallouts ?? 0) > 0 || (p4?.tipCallouts ?? 0) > 0
          : (p4?.noteCallouts ?? 0) > 0 && (p4?.tipCallouts ?? 0) > 0
            ? true
            : "partial",
      F17: p1?.editOnGitHub === true,
      F18: notFound.helpful === true,
      F19: !!(meta.ogTitle && meta.ogDescription),
      F20: !!(meta.twitterCard || meta.ogImage),
      F21: mcp.found === true,
      F22: p1?.assistantVisible === true,
      F23: p6?.breadcrumbs === true,
      F24: desktopP2?.outline === "right-rail",
      F25: tabletP2?.outline === "right-rail" || tabletP2?.outline === "inline",
      F26: meta.favicon === true,
      F27: robots.ok === true,
      F28: sitemap.ok === true,
      F29: p2?.copyStats?.allBlocksHaveCopy === true,
      F30: (p4?.codeBlockTitles?.length ?? 0) > 0,
      F31: (p5?.tabs ?? 0) >= 6,
      F32: (p1?.cards ?? 0) > 0 && (p2?.cards ?? 0) > 0,
      F33: (p3?.brokenImages?.length ?? 0) === 0,
      F34: search.emptyStateMessage === true,
      F35: "n/a",
    };
  }
  return fc;
}

export function writeFeatureCompletenessMd(data, completenessFile) {
  const fc = data.featureCompleteness;
  const gaps = FEATURE_META.filter((meta) => {
    if (meta.owner === "Out of scope") return false;
    return isFeatureGap(fc.mintlify?.[meta.id], fc.docspage?.[meta.id]);
  });

  const lines = [
    "# Feature completeness — outstanding gaps",
    "",
    "Features where **docs.page is behind Mintlify**. Parity and wins omitted.",
    "",
    `Audited: ${data.auditedAt}`,
    "",
    "| ID | Feature | Owner | Mintlify | docs.page | Notes |",
    "|---|---|---|---|---|---|",
  ];

  for (const meta of gaps) {
    const m = fc.mintlify?.[meta.id];
    const d = fc.docspage?.[meta.id];
    const mStr = featureStatus(m);
    const dStr = featureStatus(d);
    let notes = "";
    if (meta.id === "F5" && !fc.docspage?.F5) notes = "Drawer opens but fewer than 8 nav links (incomplete tree)";
    if (meta.id === "F13") notes = "Fixture uses static logos";
    if (meta.id === "F14") notes = "CardGroup vs ClientShowcase";
    if (meta.id === "F16") notes = "Info-only callouts in fixture";
    lines.push(`| ${meta.id} | ${meta.feature} | ${meta.owner} | ${mStr} | ${dStr} | ${notes} |`);
  }

  lines.push("");
  lines.push(`**${gaps.length} feature gaps** behind Mintlify. Cross-reference [enhancement-log.md](./enhancement-log.md).`);
  lines.push("");
  lines.push("Full raw matrix: `audit-data.json` → `featureCompleteness`.");

  fs.mkdirSync(path.dirname(completenessFile), { recursive: true });
  fs.writeFileSync(completenessFile, lines.join("\n") + "\n");
}
