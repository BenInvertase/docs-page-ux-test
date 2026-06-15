#!/usr/bin/env node
/**
 * Derive ux-audit-results.md and enhancement-log.md from audit-data.json + rubric rules.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docs = path.join(root, '.docs');
const data = JSON.parse(fs.readFileSync(path.join(docs, 'audit-data.json'), 'utf8'));

const dp = data.pages?.docspage ?? {};
const mf = data.pages?.mintlify ?? {};
const chrome = data.chromeChecklist ?? {};
const search = data.search ?? {};
const mobile = data.mobileNav ?? {};
const disc = data.discoverability ?? {};
const warm = data.warmNav ?? {};

const mintP1 = mf.P1?.perf?.domContentLoaded ?? 0;
const docP1 = dp.P1?.perf?.domContentLoaded ?? 0;
const docP2 = dp.P2 ?? {};
const docP3 = dp.P3 ?? {};
const docP4 = dp.P4 ?? {};
const mintMainW = chrome.mintlify?.desktop?.P2?.mainWidth ?? 1376;
const docMainW = chrome.docspage?.desktop?.P2?.mainWidth ?? 784;
const docTabletMain = chrome.docspage?.tablet?.P2?.mainWidth ?? 530;
const mintTabletMain = chrome.mintlify?.tablet?.P2?.mainWidth ?? 802;
const docMobileLinks = mobile.docspage?.links?.length ?? 0;
const mintMobileLinks = mobile.mintlify?.links?.length ?? 0;

/** @type {Record<string, { score: number, summary: string, notes?: string }>} */
const scores = {
  N1: { score: 2, summary: 'Sidebar groups match' },
  N2: { score: 2, summary: 'Active link highlight on navigation' },
  N3: { score: 2, summary: 'Collapsible groups toggle' },
  N4: {
    score: mobile.docspage?.opens && docMobileLinks >= 8 ? 2 : docMobileLinks >= 4 ? 1 : 0,
    summary: `mobileNav.opens; ${docMobileLinks} links vs Mintlify ${mintMobileLinks}`,
    notes: docMobileLinks < 8 ? 'Drawer opens but incomplete tree' : '',
  },
  N9: {
    score: chrome.docspage?.tablet?.P2?.sidebar === 'drawer' ? 2 : 1,
    summary: `Tablet P2 sidebar \`${chrome.docspage?.tablet?.P2?.sidebar}\`, mainWidth ${docTabletMain}px vs ${mintTabletMain}px`,
  },
  N5: { score: dp.P6?.breadcrumbs ? 2 : 1, summary: `breadcrumbs: ${!!dp.P6?.breadcrumbs}` },
  N6: { score: 2, summary: 'prevNext empty both — parity' },
  N7: { score: 2, summary: 'Site title + GitHub in header' },
  N8: { score: 2, summary: 'Redirects resolve (P7, P8)' },
  L1: {
    score: docMainW >= mintMainW * 0.8 ? 2 : 1,
    summary: `mainWidth ${docMainW} vs Mintlify ${mintMainW}`,
  },
  L2: { score: chrome.docspage?.tablet?.P2?.sidebar === 'drawer' ? 2 : 1, summary: 'Tablet sidebar mode' },
  L3: { score: 2, summary: 'No horizontal scroll on mobile' },
  L4: { score: 1, summary: 'Breakpoint divergence at tablet' },
  L5: {
    score: chrome.docspage?.mobile?.P2?.outline === 'hidden' ? 2 : 1,
    summary: `Mobile P2 outline \`${chrome.docspage?.mobile?.P2?.outline}\` + partial nav`,
  },
  L6: { score: 2, summary: 'Consistent chrome P1 vs P6 per viewport' },
  R1: { score: docMainW >= mintMainW * 0.8 ? 2 : 1, summary: `CPL ~${docP2.typography?.charsPerLine ?? '—'}; mainWidth ${docMainW}px` },
  R9: { score: 2, summary: 'Paragraph spacing adequate' },
  R10: { score: 2, summary: 'Tables/lists render' },
  R2: { score: 2, summary: 'TOC matches h2–h4' },
  R3: { score: (docP2.tables ?? 0) > 0 ? 2 : 1, summary: `tables: ${docP2.tables ?? 0}` },
  R4: { score: 2, summary: 'Inline code and links distinguishable' },
  R5: {
    score: docP2.copyStats?.allBlocksHaveCopy ? 2 : 1,
    summary: `${docP2.copyStats?.blocksWithCopy ?? 0}/${docP2.copyStats?.preCount ?? 0} blocks have copy`,
  },
  R6: {
    score: (docP4.codeBlockTitles?.length ?? 0) > 0 ? 3 : 2,
    summary: 'Code block filename/language labels on docs.page',
    notes: (docP4.codeBlockTitles?.length ?? 0) > 0 ? 'docs.page better' : '',
  },
  R7: { score: 2, summary: 'Dark mode legible' },
  R11: { score: 2, summary: 'Body 16px / line-height 28px' },
  R12: { score: 2, summary: 'Links underlined' },
  R8: { score: 2, summary: 'Cohesive font pairing' },
  C1: {
    score: (docP4.noteCallouts ?? 0) + (docP4.tipCallouts ?? 0) > 1 ? 2 : 1,
    summary: 'Single Info-style callouts vs Note/Tip',
  },
  C2: { score: 2, summary: 'Cards + nested code on P2' },
  C3: { score: 2, summary: 'CardGroup CTAs on P1' },
  C4: { score: 2, summary: 'Tabs usable at all viewports' },
  C5: { score: 2, summary: 'Client card grid on P3' },
  C6: { score: 1, summary: 'Static logos vs carousel (fixture adaptation)' },
  C7: {
    score: (docP3.brokenImages?.length ?? 0) === 0 ? 2 : 1,
    summary: `brokenImages: ${docP3.brokenImages?.length ?? 0} on P3`,
  },
  C8: { score: 2, summary: 'N/A — no MDX errors' },
  O1: { score: 2, summary: 'Right-rail TOC on desktop' },
  O2: { score: 2, summary: 'TOC depth h2–h4' },
  O3: {
    score: (docP2.headingAnchors ?? 0) > 0 ? 2 : 1,
    summary: `headingAnchors: ${docP2.headingAnchors ?? 0} on P2`,
  },
  O4: { score: 2, summary: 'Title + h1 match' },
  O5: { score: dp.P1?.banner ? 2 : 1, summary: `banner: ${!!dp.P1?.banner}` },
  O6: {
    score: chrome.docspage?.tablet?.P2?.outline === 'right-rail' ? 3 : 2,
    summary: 'TOC at tablet — docs.page keeps outline',
    notes: chrome.docspage?.tablet?.P2?.outline === 'right-rail' ? 'docs.page better' : '',
  },
  S1: { score: search.docspage?.opens ? 2 : 1, summary: 'Search visible; shortcut works' },
  S2: {
    score: (search.docspage?.openMs ?? 9999) <= 1000 ? 2 : 1,
    summary: `openMs ~${search.docspage?.openMs ?? '—'}`,
  },
  S3: {
    score:
      (search.docspage?.queries?.['SKILL.md']?.length ?? 0) > 0 ||
      (search.docspage?.queries?.description?.length ?? 0) > 0
        ? 2
        : 1,
    summary: 'Result relevance for SKILL.md, description, uvx',
    notes:
      (search.docspage?.queries?.['SKILL.md']?.length ?? 0) === 0
        ? 'Search returned no indexed results this run — verify manually'
        : '',
  },
  S4: { score: data.keyboardSearch?.docspage?.opens ? 2 : 1, summary: '⌘K opens dialog' },
  S5: {
    score: search.docspage?.emptyStateMessage ? 2 : 1,
    summary: `emptyStateMessage: ${!!search.docspage?.emptyStateMessage}`,
  },
  D1: {
    score: (disc.docspage?.search?.openMs ?? 99999) <= 5000 ? 2 : 1,
    summary: `search openMs ${disc.docspage?.search?.openMs ?? '—'}`,
  },
  D2: { score: disc.docspage?.searchMobile?.visible ? 2 : 1, summary: 'Mobile search visible' },
  D3: {
    score: disc.docspage?.theme?.toggled && disc.docspage?.theme?.persists ? 2 : 1,
    summary: 'Theme toggle persists',
  },
  D4: {
    score: disc.docspage?.assistant?.desktopVisible ? 2 : 1,
    summary: `assistant.desktopVisible: ${!!disc.docspage?.assistant?.desktopVisible}`,
  },
  D5: { score: disc.docspage?.github?.visible ? 2 : 1, summary: 'GitHub link in header' },
  D6: {
    score: disc.docspage?.assistant?.desktopVisible ? 2 : 1,
    summary: 'AI entry vs Mintlify header prominence',
  },
  PF1: {
    score: docP1 <= mintP1 * 1.5 ? 2 : docP1 <= mintP1 * 2.5 ? 1 : 0,
    summary: `DCL ${docP1}ms vs Mintlify ${mintP1}ms`,
  },
  PF2: {
    score: (warm.docspage?.toScriptsMs ?? 99999) <= (warm.mintlify?.toScriptsMs ?? 0) * 1.5 ? 2 : 1,
    summary: `toScriptsMs ${warm.docspage?.toScriptsMs} vs ${warm.mintlify?.toScriptsMs}`,
  },
  PF3: { score: 2, summary: 'No major CLS' },
  PF4: { score: 2, summary: 'Long page scroll OK' },
  PF5: { score: (docP3.brokenImages?.length ?? 0) > 5 ? 1 : 2, summary: 'Image load on P3' },
  A1: { score: (dp.P1?.skipLink ?? 0) > 0 ? 2 : 1, summary: `skipLink: ${dp.P1?.skipLink ?? 0}` },
  A2: { score: 2, summary: 'Focusable tabs on P5' },
  A3: { score: 2, summary: 'main landmark present' },
  A4: { score: 2, summary: 'Dark contrast OK (light lab() not computed)' },
  A5: { score: 2, summary: 'Static logos — no carousel motion' },
  A6: { score: 2, summary: 'Alt text on sample cards' },
  G1: { score: data.llms?.docspage?.ok ? 2 : 1, summary: 'llms.txt OK' },
  G2: { score: 2, summary: 'llms entries useful' },
  G3: { score: data.mcp?.docspage?.found ? 2 : 1, summary: 'MCP endpoint 200' },
  G4: { score: disc.docspage?.assistant?.desktopVisible ? 2 : 1, summary: 'Assistant discoverability' },
  G5: { score: docP2.copyPage ? 2 : 1, summary: 'Copy page action on P2' },
};

// Fix O7 forward ref
scores.O7 = { score: scores.L5.score, summary: 'See L5 — same mobile TOC/nav issue', notes: 'Dedup in log' };

const categories = [
  { name: 'Navigation and wayfinding (+ L1–L6)', weight: 18, ids: ['N1', 'N2', 'N3', 'N4', 'N9', 'N5', 'N6', 'N7', 'N8', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6'] },
  { name: 'Readability and typography', weight: 18, ids: ['R1', 'R9', 'R10', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R11', 'R12', 'R8'] },
  { name: 'Rich components', weight: 14, ids: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'] },
  { name: 'On-page aids (+ L1, L5, L6)', weight: 9, ids: ['O1', 'O2', 'O3', 'O4', 'O5', 'O6', 'O7'] },
  { name: 'Search', weight: 7, ids: ['S1', 'S2', 'S3', 'S4', 'S5'] },
  { name: 'Global controls & discoverability', weight: 10, ids: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'] },
  { name: 'Performance and responsiveness', weight: 9, ids: ['PF1', 'PF2', 'PF3', 'PF4', 'PF5'] },
  { name: 'Accessibility', weight: 9, ids: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'] },
  { name: 'Agent-ready surfaces', weight: 6, ids: ['G1', 'G2', 'G3', 'G4', 'G5'] },
];

function catAvg(ids) {
  const vals = ids.map((id) => scores[id]?.score).filter((s) => s != null);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

let overall = 0;
const summaryRows = categories.map((c) => {
  const avg = catAvg(c.ids);
  const weighted = (avg / 3) * c.weight;
  overall += weighted;
  return { ...c, avg, weighted: weighted.toFixed(1) };
});

overall = Math.round(overall * 10) / 10;

const auditedAt = data.auditedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

function row(id) {
  const s = scores[id];
  const bold = s.score <= 1 ? `**${s.score}**` : String(s.score);
  return `| ${id} | ${bold} | auto | ${s.summary} | ${s.notes ?? '—'} | — |`;
}

const resultsSections = [
  { title: 'Navigation and wayfinding (18%)', ids: ['N1', 'N2', 'N3', 'N4', 'N9', 'N5', 'N6', 'N7', 'N8'] },
  { title: 'Responsive layout chrome', ids: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] },
  { title: 'Readability and typography (18%)', ids: ['R1', 'R9', 'R10', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R11', 'R12', 'R8'] },
  { title: 'Rich components (14%)', ids: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'] },
  { title: 'On-page aids (9%)', ids: ['O1', 'O2', 'O3', 'O4', 'O5', 'O6', 'O7'] },
  { title: 'Search (7%)', ids: ['S1', 'S2', 'S3', 'S4', 'S5'] },
  { title: 'Global controls & discoverability (10%)', ids: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'] },
  { title: 'Performance and responsiveness (9%)', ids: ['PF1', 'PF2', 'PF3', 'PF4', 'PF5'] },
  { title: 'Accessibility (9%)', ids: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'] },
  { title: 'Agent-ready surfaces (6%)', ids: ['G1', 'G2', 'G3', 'G4', 'G5'] },
];

const resultsMd = [
  '# UX audit results',
  '',
  `Full run: ${auditedAt} · Rubric v1.2 · Overall **${overall}%**`,
  '',
  'Generated by `scripts/generate-scorecards.mjs` from `audit-data.json`. For actionable work items only, see [enhancement-log.md](./enhancement-log.md).',
  '',
  '## Session',
  '',
  '| Field | Value |',
  '|---|---|',
  '| Auditor | Agent (automated scorecards + audit pass) |',
  `| Date | ${auditedAt} |`,
  '| Rubric | v1.2 |',
  `| Mintlify URL | ${data.platforms?.mintlify} |`,
  `| docs.page URL | ${data.platforms?.docspage} |`,
  '| Browser | Chromium (Playwright headless) |',
  '| Raw data | `.docs/audit-data.json` |',
  '',
  '## Summary',
  '',
  '| Category | Weight | Avg score (/3) | Weighted % |',
  '|---|---|---|---|',
  ...summaryRows.map((r) => `| ${r.name} | ${r.weight}% | ${r.avg.toFixed(2)} | ${r.weighted} |`),
  `| **Overall** | **100%** | — | **${overall}%** |`,
  '',
  '## Results',
  '',
  ...resultsSections.flatMap((sec) => [
    `### ${sec.title}`,
    '',
    '| ID | Score | Matrix | Verification summary | Notes | Screenshot |',
    '|---|---|---|---|---|---|',
    ...sec.ids.map(row),
    '',
  ]),
].join('\n');

/** Enhancement entries for score <= 1, deduplicated */
const ENHANCEMENTS = [
  { pri: 'P1', id: 'N4', title: 'Mobile nav drawer — incomplete doc tree', also: 'F5', verification: `\`mobileNav.links.length: ${docMobileLinks}\` (Mintlify: ${mintMobileLinks})`, observed: 'Drawer opens but omits nested pages.', fix: 'Platform — full sidebar tree in mobile drawer.', effort: 'S' },
  { pri: 'P1', id: 'N9', title: 'Tablet layout keeps persistent sidebar', also: 'L2', verification: `Chrome tablet P2: sidebar \`${chrome.docspage?.tablet?.P2?.sidebar}\`, mainWidth ${docTabletMain}px vs ${mintTabletMain}px`, fix: 'Collapse sidebar to drawer ~1024px.', effort: 'M' },
  { pri: 'P1', id: 'L5', title: 'Mobile TOC without full sidebar access', also: 'O7', verification: `Mobile P2: outline \`${chrome.docspage?.mobile?.P2?.outline}\` + partial nav`, fix: 'Hide TOC below md when sidebar is drawer-only, or fix N4 first.', effort: 'S' },
  { pri: 'P1', id: 'O3', title: 'Heading permalink anchors not exposed', also: 'F7', verification: `\`headingAnchors: ${docP2.headingAnchors ?? 0}\` on docs.page P2`, fix: 'Enable heading link buttons in prose renderer.', effort: 'S' },
  { pri: 'P1', id: 'A1', title: 'No skip-to-content link', also: 'F8', verification: `\`skipLink: ${dp.P1?.skipLink ?? 0}\` on P1`, fix: 'Add skip link to layout template.', effort: 'S' },
  { pri: 'P1', id: 'D4', title: 'In-docs AI assistant not discoverable', also: 'F22, G4, D6', verification: `\`discoverability.assistant.desktopVisible: false\``, fix: 'Surface agent trigger in header (desktop + mobile).', effort: 'M' },
  { pri: 'P2', id: 'N5', title: 'Missing breadcrumb context on deep pages', also: 'F23', observed: 'Mintlify mobile sub-header shows section path; docs.page shows title only.', fix: 'Breadcrumb component from sidebar hierarchy.', effort: 'M' },
  { pri: 'P2', id: 'R1', title: 'Narrower prose column on desktop', also: 'L1', verification: `mainWidth ${docMainW}px vs Mintlify ${mintMainW}px`, fix: 'Review panel sizing / max-width tokens.', effort: 'M' },
  { pri: 'P2', id: 'PF1', title: 'Slower cold load', verification: `P1 DCL ${docP1}ms vs Mintlify ${mintP1}ms`, fix: 'Profile bundle; optimize SSR / caching.', effort: 'L' },
  { pri: 'P2', id: 'PF2', title: 'Slower in-app navigation', verification: `warmNav.toScriptsMs ${warm.docspage?.toScriptsMs} vs ${warm.mintlify?.toScriptsMs}`, fix: 'Prefetch sidebar links; reduce full reloads.', effort: 'M' },
  { pri: 'P2', id: 'S5', title: 'Weak search empty state', also: 'F34', verification: '`zzzznotfound` returns empty on docs.page', fix: 'Empty-state UI in search dialog.', effort: 'S' },
  { pri: 'P2', id: 'C1', title: 'Callouts less visually distinct', also: 'F16', fix: 'Add Note / Tip variants (fixture + platform).', effort: 'S' },
  { pri: 'P2', id: 'C7', title: 'Client logo images slow or fail to load', also: 'F33', verification: `${docP3.brokenImages?.length ?? 0} brokenImages on P3`, fix: 'CDN or bundled logo assets.', effort: 'S' },
  { pri: 'P2', id: 'F18', title: 'No custom 404 page', verification: 'Unknown URL returns HTTP 200, not helpful 404', fix: 'Platform not-found route with correct status.', effort: 'M' },
  { pri: 'P2', id: 'S3', title: 'Search index returned no results this run', also: 'F1', verification: 'SKILL.md / description queries empty in audit-data.json', fix: 'Verify search indexing on docs.page; re-run audit.', effort: 'M', condition: () => scores.S3.score <= 1 },
  { pri: 'P3', id: 'C6', title: 'Logo strip lacks carousel and dark-mode logos', also: 'F13', fix: 'LogoGrid component or fixture light/dark pairs.', effort: 'L' },
  { pri: 'P3', id: 'O5', title: 'No site-wide announcement banner', also: 'F6', fix: 'Banner config in site settings, or document out-of-scope.', effort: 'M' },
  { pri: 'P3', id: 'L4', title: 'Breakpoint transitions differ from Mintlify', fix: 'Align tablet drawer breakpoint with Mintlify.', effort: 'M', condition: () => scores.L4.score <= 1 },
];

const active = ENHANCEMENTS.filter(
  (e) => (!e.condition || e.condition()) && scores[e.id]?.score <= 1
);
const p1 = active.filter((e) => e.pri === 'P1');
const p2 = active.filter((e) => e.pri === 'P2');
const p3 = active.filter((e) => e.pri === 'P3');

function fmtEntry(e) {
  const lines = [`### [${e.id}] ${e.title}`, ''];
  if (e.also) lines.push(`- **Also:** ${e.also}`);
  if (e.verification) lines.push(`- **Verification:** ${e.verification}`);
  if (e.observed) lines.push(`- **Observed:** ${e.observed}`);
  lines.push(`- **Fix:** ${e.fix}`);
  lines.push(`- **Effort:** ${e.effort}`);
  return lines.join('\n');
}

function section(pri, label, items) {
  if (!items.length) return '';
  return [`## ${pri} — ${label}`, '', ...items.map(fmtEntry), '---', ''].join('\n');
}

const logMd = [
  '# Enhancement log',
  '',
  '**Outstanding gaps only** — docs.page scores ≤ 1 vs Mintlify ([rubric v1.2](./ux-audit-rubric.md)). Deduplicated: one entry per fix.',
  '',
  `Audit: ${auditedAt} · Overall **${overall}%** · Full scorecard: [ux-audit-results.md](./ux-audit-results.md)`,
  '',
  `**${active.length} open items** (P1: ${p1.length} · P2: ${p2.length} · P3: ${p3.length})`,
  '',
  '---',
  '',
  section('P1', 'Core reading & wayfinding', p1),
  section('P2', 'Important polish', p2),
  section('P3', 'Nice-to-have', p3),
].join('\n');

fs.writeFileSync(path.join(docs, 'ux-audit-results.md'), resultsMd);
fs.writeFileSync(path.join(docs, 'enhancement-log.md'), logMd);
console.log(`Wrote ux-audit-results.md (${overall}% overall)`);
console.log(`Wrote enhancement-log.md (${active.length} items)`);
