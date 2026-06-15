import { PLATFORMS } from "./constants.mjs";

export function resolveBaseUrl(platform, baseURL) {
  return baseURL || PLATFORMS[platform];
}

export function pageUrl(platform, pagePath, baseURL) {
  const base = resolveBaseUrl(platform, baseURL);
  return `${base}${pagePath === "/" ? "" : pagePath}`;
}

/** Playwright baseURL with a path segment requires ./-prefixed relative navigation. */
export function toRelativePath(pagePath) {
  if (pagePath === "/") return "./";
  return `.${pagePath.startsWith("/") ? pagePath : `/${pagePath}`}`;
}

export function yn(value) {
  if (value === true || value === "y") return "y";
  if (value === "partial") return "partial";
  return "n";
}

export function parseRgb(color) {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function luminance([r, g, b]) {
  const s = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
}

export function contrastRatio(fg, bg) {
  const L1 = luminance(fg);
  const L2 = luminance(bg);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function featureStatus(value) {
  if (value === "n/a") return "n/a";
  if (value === "partial") return "partial";
  return value ? "y" : "n";
}

export function isFeatureGap(mintlifyVal, docspageVal) {
  if (mintlifyVal === "n/a" || docspageVal === "n/a") return false;
  if (docspageVal === true) return false;
  if (docspageVal === "partial" && mintlifyVal !== true) return false;
  if (docspageVal === false && mintlifyVal === false) return false;
  return docspageVal === false || docspageVal === "partial";
}
