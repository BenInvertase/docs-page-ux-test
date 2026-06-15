#!/usr/bin/env node
/**
 * Build standalone .docs/ux-audit-report.html from markdown sources + embedded screenshots.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.AUDIT_ROOT || process.cwd();
const DOCS = path.join(ROOT, '.docs');
const REPORT_PATH = path.join(DOCS, 'ux-audit-report.html');

const SHOTS_DIR = path.join(ROOT, 'screenshots');

/** Screenshot file + captions for each enhancement-log ID. */
const ENHANCEMENT_SHOTS = {
  N4: { file: 'N4-P6-mobile-light-open.png', capM: 'Full doc tree in menu', capD: 'Full doc tree in menu' },
  N9: { file: 'P2-tablet-light.png', capM: 'Sidebar in drawer — ~802px main', capD: 'Persistent sidebar — ~530px main' },
  L5: { file: 'P2-mobile-light.png', capM: 'Single column, no TOC rail', capD: 'Single column, no TOC rail' },
  O3: { file: 'O3-heading-anchors-light.png', capM: 'Permalink icon on heading hover', capD: 'Hover permalink button beside heading' },
  A1: {
    file: 'A1-skip-link-light.png',
    capM: '“Skip to main content” visible after keyboard focus',
    capD: 'Same tab stop — no skip link (focus moves to search)',
  },
  D4: { file: 'P1-desktop-light.png', capM: '“Ask Assistant” in header', capD: 'No assistant entry in header' },
  N5: { file: 'N5-P6-mobile-light.png', capM: 'Breadcrumb path on deep page', capD: 'Title only — no breadcrumbs' },
  R1: { file: 'P2-desktop-light.png', capM: 'Wide prose column (~1376px main)', capD: 'Narrower column (~784px main)' },
  PF1: { file: 'P1-desktop-light.png', capM: 'Cold load ~184ms DCL (P1)', capD: 'Cold load ~610ms DCL (P1)' },
  PF2: { file: 'PF2-P5-desktop-light.png', capM: 'Warm nav ~1238ms to scripts page', capD: 'Warm nav ~2174ms to scripts page' },
  S5: { file: 'S5-search-empty-light.png', capM: 'Empty-state suggestions for bad query', capD: 'Blank results for “zzzznotfound”' },
  C1: { file: 'C1-P4-callouts-light.png', capM: 'Distinct Note / Tip callout styles', capD: 'Generic Info-style callouts' },
  C7: { file: 'P3-desktop-light.png', capM: 'Client logos load correctly', capD: 'Broken / slow-loading logo images' },
  F18: { file: 'F18-P404-light.png', capM: 'HTTP 404 with helpful message', capD: 'HTTP 200 for unknown URL' },
  C6: { file: 'P1-desktop-light.png', capM: 'Animated partner logo carousel', capD: 'Static logo row (fixture)' },
  O5: { file: 'P1-desktop-light.png', capM: 'Dismissible Discord banner', capD: 'No announcement banner configured' },
};

const imageDataUriCache = new Map();

function imageDataUri(platform, filename) {
  const key = `${platform}/${filename}`;
  if (imageDataUriCache.has(key)) return imageDataUriCache.get(key);
  const fp = path.join(SHOTS_DIR, platform, filename);
  if (!fs.existsSync(fp)) {
    imageDataUriCache.set(key, null);
    return null;
  }
  const uri = `data:image/png;base64,${fs.readFileSync(fp).toString('base64')}`;
  imageDataUriCache.set(key, uri);
  return uri;
}

function buildCompareHtml(shotConfig) {
  if (!shotConfig) return '';
  const { file, capM, capD } = shotConfig;
  const m = imageDataUri('mintlify', file);
  const d = imageDataUri('docspage', file);
  if (!m && !d) {
    return `<p class="meta shot-missing">Screenshot missing (<code>${escapeHtml(file)}</code>) — re-run <code>run-full-audit.mjs</code> then rebuild.</p>`;
  }
  const parts = ['<div class="compare">'];
  if (m) {
    parts.push(
      `<figure><figcaption>Mintlify — ${escapeHtml(capM)}</figcaption><img src="${m}" alt="Mintlify: ${escapeHtml(capM)}" loading="lazy" /></figure>`
    );
  }
  if (d) {
    parts.push(
      `<figure><figcaption>docs.page — ${escapeHtml(capD)}</figcaption><img src="${d}" alt="docs.page: ${escapeHtml(capD)}" loading="lazy" /></figure>`
    );
  }
  parts.push('</div>');
  return parts.join('\n');
}

const FEATURE_LABELS = {
  F1: 'Full-text search',
  F2: '⌘K / Ctrl+K shortcut',
  F3: 'Dark mode toggle',
  F4: 'Dark mode persistence',
  F5: 'Mobile nav drawer',
  F6: 'Dismissible announcement banner',
  F7: 'Heading anchor links',
  F8: 'Skip to content link',
  F9: 'Previous / next page links',
  F10: 'Copy page / view as markdown',
  F11: 'llms.txt index',
  F12: 'URL redirects',
  F13: 'Logo carousel / animated strip',
  F14: 'Client showcase (shuffle/sort)',
  F15: 'Section numbers (Specification)',
  F16: 'Note / Tip callout variants',
  F17: 'Edit on GitHub / view source',
  F18: 'Custom 404 page',
  F19: 'Open Graph meta',
  F20: 'Twitter / social card meta',
  F21: 'MCP / agent API endpoint',
  F22: 'In-docs AI assistant',
  F23: 'Breadcrumbs on nested pages',
  F24: 'Desktop right-rail TOC',
  F25: 'Tablet TOC',
  F26: 'Favicon',
  F27: 'robots.txt',
  F28: 'sitemap.xml',
  F29: 'Per-code-block copy button',
  F30: 'Code block filename labels',
  F31: 'Tabbed code examples',
  F32: 'Card / CardGroup components',
  F33: 'Client logo images',
  F34: 'Search empty-state messaging',
  F35: 'Analytics / feedback widget',
};

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveHref(href) {
  const map = {
    './ux-audit-rubric.md': '#appendix-a',
    './ux-audit-results.md': '#appendix-b',
    './enhancement-log.md': '#appendix-c',
    './feature-completeness.md': '#appendix-d',
    './audit-data.json': '#appendix-e',
  };
  if (map[href]) return map[href];
  if (href.startsWith('./') && href.endsWith('.md')) {
    return `#appendix-${href.slice(2, -3)}`;
  }
  return href;
}

function inlineMd(text) {
  const parts = [];
  const re = /\[((?:[^[\]`]|`[^`]*`)*)\]\(([^)]+)\)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    parts.push(inlineMdInner(text.slice(last, m.index)));
    parts.push(`<a href="${escapeHtml(resolveHref(m[2]))}">${inlineMdInner(m[1])}</a>`);
    last = re.lastIndex;
  }
  parts.push(inlineMdInner(text.slice(last)));
  return parts.join('');
}

function inlineMdInner(text) {
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return s;
}

function markdownToHtml(md, { appendixPrefix = false } = {}) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  const flushParagraph = (buf) => {
    if (buf.length) out.push(`<p>${inlineMd(buf.join(' '))}</p>`);
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      i++;
      const code = [];
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      i++;
      out.push(`<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    if (/^#{1,6}\s/.test(line)) {
      const m = line.match(/^(#{1,6})\s+(.*)$/);
      const level = m[1].length;
      const text = m[2];
      const id = appendixPrefix ? slugify(text) : slugify(text);
      out.push(`<h${level} id="${id}">${inlineMd(text)}</h${level}>`);
      i++;
      continue;
    }

    if (line.trim() === '---') {
      out.push('<hr />');
      i++;
      continue;
    }

    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i]);
        i++;
      }
      if (rows.length < 2) continue;
      const parseRow = (r) =>
        r
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
      const header = parseRow(rows[0]);
      const bodyRows = rows.slice(2).map(parseRow);
      out.push('<table><thead><tr>');
      for (const h of header) out.push(`<th>${inlineMd(h)}</th>`);
      out.push('</tr></thead><tbody>');
      for (const row of bodyRows) {
        out.push('<tr>');
        for (const cell of row) out.push(`<td>${inlineMd(cell)}</td>`);
        out.push('</tr>');
      }
      out.push('</tbody></table>');
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      out.push('<ul>');
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        out.push(`<li>${inlineMd(lines[i].replace(/^[-*]\s+/, ''))}</li>`);
        i++;
      }
      out.push('</ul>');
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      out.push('<ol>');
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        out.push(`<li>${inlineMd(lines[i].replace(/^\d+\.\s+/, ''))}</li>`);
        i++;
      }
      out.push('</ol>');
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    const para = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^#{1,6}\s/.test(lines[i]) && !lines[i].startsWith('|') && !lines[i].startsWith('```') && !/^[-*]\s/.test(lines[i]) && !/^\d+\.\s/.test(lines[i]) && lines[i].trim() !== '---') {
      para.push(lines[i]);
      i++;
    }
    flushParagraph(para);
  }

  return out.join('\n');
}

function fmtBool(v) {
  if (v === true) return 'y';
  if (v === false) return 'n';
  if (v === 'partial') return 'partial';
  if (v === 'n/a') return 'n/a';
  return String(v);
}

function buildFeatureMatrixTable(data) {
  const m = data.featureCompleteness?.mintlify || {};
  const d = data.featureCompleteness?.docspage || {};
  const rows = Object.keys(FEATURE_LABELS)
    .sort()
    .map((id) => {
      const mv = fmtBool(m[id]);
      const dv = fmtBool(d[id]);
      const gap = mv !== dv && !(mv === 'n' && dv === 'partial');
      return `<tr class="${gap ? 'row-gap' : ''}"><td>${id}</td><td>${FEATURE_LABELS[id]}</td><td>${mv}</td><td>${dv}</td></tr>`;
    });
  return `<table class="compact"><thead><tr><th>ID</th><th>Feature</th><th>Mintlify</th><th>docs.page</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function buildChromeTable(data) {
  const rows = [];
  for (const platform of ['mintlify', 'docspage']) {
    const label = platform === 'mintlify' ? 'Mintlify' : 'docs.page';
    const chrome = data.chromeChecklist?.[platform] || {};
    for (const vp of ['desktop', 'tablet', 'mobile']) {
      const p2 = chrome[vp]?.P2;
      if (!p2) continue;
      rows.push(
        `<tr><td>${vp}</td><td>${label}</td><td>${p2.sidebar}</td><td>${p2.outline}</td><td>${p2.mainWidth}px</td></tr>`
      );
    }
  }
  return `<table><thead><tr><th>Viewport</th><th>Platform</th><th>Sidebar</th><th>Outline</th><th>Main width</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function parseEnhancementLog(md) {
  const groups = [];
  let current = null;
  for (const line of md.split('\n')) {
    const pri = line.match(/^## (P[123] — .+)$/);
    if (pri) {
      current = { label: pri[1], items: [] };
      groups.push(current);
      continue;
    }
    const item = line.match(/^### \[([^\]]+)\] (.+)$/);
    if (item && current) {
      current.items.push({ id: item[1], title: item[2], bullets: [] });
      continue;
    }
    if (current?.items.length && /^- /.test(line)) {
      current.items.at(-1).bullets.push(line.slice(2));
    }
  }
  return groups;
}

function buildEnhancementMainHtml(md) {
  const groups = parseEnhancementLog(md);
  const priClass = { P1: 'badge-blocker', P2: 'badge-gap', P3: 'badge-gap' };
  const parts = [
    '<p>All 16 outstanding gaps with paired Mintlify vs docs.page screenshots. P1 = core reading &amp; wayfinding; P2 = polish; P3 = nice-to-have.</p>',
  ];
  for (const group of groups) {
    const pri = group.label.slice(0, 2);
    parts.push(`<h3>${escapeHtml(group.label)}</h3>`);
    for (const item of group.items) {
      parts.push(`<div class="backlog-item" id="gap-${escapeHtml(item.id.toLowerCase())}">`);
      parts.push(`<span class="badge ${priClass[pri] || 'badge-gap'}">${escapeHtml(pri)}</span>`);
      parts.push(`<h4>[${escapeHtml(item.id)}] ${escapeHtml(item.title)}</h4>`);
      parts.push('<ul class="plain">');
      for (const b of item.bullets) parts.push(`<li>${inlineMd(b)}</li>`);
      parts.push('</ul>');
      parts.push(buildCompareHtml(ENHANCEMENT_SHOTS[item.id]));
      parts.push('</div>');
    }
  }
  return parts.join('\n');
}

function prepareFeatureHtml(html) {
  return html.replace(/v1\.2 Appendix A/g, 'Appendix A (rubric definitions) / Appendix D (gaps)');
}

function prepareRubricHtml(html) {
  return html
    .replace(
      /<h2 id="[^"]*">Appendix A — Feature completeness matrix<\/h2>/,
      '<h2 id="rubric-feature-matrix">Feature completeness criteria (F1–F35)</h2>\n<p class="meta">Criterion definitions only. Current gaps vs Mintlify are in <a href="#appendix-d">Appendix D</a>.</p>'
    )
    .replace(/Feature completeness inventory \(Appendix A\)/g, 'Feature completeness inventory (F1–F35)')
    .replace(/\(Appendix A\) is recorded separately/g, '(F1–F35 matrix) is recorded separately')
    .replace(/Review Appendix A table/g, 'Review Appendix D gap list')
    .replace(/Appendix A feature matrix/g, 'F1–F35 feature matrix');
}

function buildMetricsSection(data) {
  const disc = data.discoverability || {};
  const warm = data.warmNav || {};
  const mobile = data.mobileNav || {};
  const perf = data.pages?.docspage?.P1?.perf || data.pages?.mintlify?.P1?.perf;

  const perfMint = data.pages?.mintlify?.P1?.perf;
  const perfDocs = data.pages?.docspage?.P1?.perf;

  return `
    <h3 id="metrics-session">Session</h3>
    <table>
      <tbody>
        <tr><th>Audited at</th><td>${escapeHtml(data.auditedAt || '')}</td></tr>
        <tr><th>Rubric</th><td>${escapeHtml(data.rubricVersion || '1.2')}</td></tr>
        <tr><th>Mintlify</th><td><a href="${escapeHtml(data.platforms?.mintlify || '')}">${escapeHtml(data.platforms?.mintlify || '')}</a></td></tr>
        <tr><th>docs.page</th><td><a href="${escapeHtml(data.platforms?.docspage || '')}">${escapeHtml(data.platforms?.docspage || '')}</a></td></tr>
      </tbody>
    </table>

    <h3 id="metrics-chrome">Layout chrome (P2)</h3>
    ${buildChromeTable(data)}

    <h3 id="metrics-mobile-nav">Mobile nav links (P6)</h3>
    <table>
      <thead><tr><th>Platform</th><th>Opens</th><th>Link count</th><th>Links</th></tr></thead>
      <tbody>
        <tr>
          <td>Mintlify</td>
          <td>${mobile.mintlify?.opens ? 'yes' : 'no'}</td>
          <td>${mobile.mintlify?.links?.length ?? '—'}</td>
          <td><code>${escapeHtml((mobile.mintlify?.links || []).join(' · '))}</code></td>
        </tr>
        <tr>
          <td>docs.page</td>
          <td>${mobile.docspage?.opens ? 'yes' : 'no'}</td>
          <td>${mobile.docspage?.links?.length ?? '—'}</td>
          <td><code>${escapeHtml((mobile.docspage?.links || []).join(' · '))}</code></td>
        </tr>
      </tbody>
    </table>

    <h3 id="metrics-discoverability">Discoverability</h3>
    <table class="compact">
      <thead><tr><th>Check</th><th>Mintlify</th><th>docs.page</th></tr></thead>
      <tbody>
        <tr><td>Search open (ms)</td><td>${disc.mintlify?.search?.openMs ?? '—'}</td><td>${disc.docspage?.search?.openMs ?? '—'}</td></tr>
        <tr><td>AI assistant visible (desktop)</td><td>${disc.mintlify?.assistant?.desktopVisible ? 'yes' : 'no'}</td><td>${disc.docspage?.assistant?.desktopVisible ? 'yes' : 'no'}</td></tr>
        <tr><td>Theme toggle + persists</td><td>${disc.mintlify?.theme?.toggled && disc.mintlify?.theme?.persists ? 'yes' : 'no'}</td><td>${disc.docspage?.theme?.toggled && disc.docspage?.theme?.persists ? 'yes' : 'no'}</td></tr>
      </tbody>
    </table>

    <h3 id="metrics-performance">Performance</h3>
    <table>
      <thead><tr><th>Metric</th><th>Mintlify</th><th>docs.page</th></tr></thead>
      <tbody>
        <tr><td>Cold load DCL (P1, ms)</td><td>${perfMint?.domContentLoaded ?? '—'}</td><td>${perfDocs?.domContentLoaded ?? '—'}</td></tr>
        <tr><td>Warm nav → clients (ms)</td><td>${warm.mintlify?.toClientsMs ?? '—'}</td><td>${warm.docspage?.toClientsMs ?? '—'}</td></tr>
        <tr><td>Warm nav → scripts (ms)</td><td>${warm.mintlify?.toScriptsMs ?? '—'}</td><td>${warm.docspage?.toScriptsMs ?? '—'}</td></tr>
      </tbody>
    </table>

    <h3 id="metrics-feature-matrix">Full feature matrix (F1–F35)</h3>
    <p>Automated pass/fail from <code>run-full-audit.mjs</code>. Rows highlighted where platforms differ.</p>
    ${buildFeatureMatrixTable(data)}
  `;
}

const CSS = `
    :root {
      --bg: #fafafa;
      --card: #fff;
      --text: #1a1a1a;
      --muted: #666;
      --border: #e5e5e5;
      --bad: #b42318;
      --warn: #b54708;
      --ok: #027a48;
      --accent: #444;
      --appendix-bg: #f5f5f7;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: var(--text);
      background: var(--bg);
      margin: 0;
      padding: 2rem 1.5rem 4rem;
      max-width: 1100px;
      margin-inline: auto;
    }
    h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1.35rem; margin-top: 2.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; scroll-margin-top: 1rem; }
    h3 { font-size: 1.1rem; margin-top: 1.75rem; color: var(--accent); scroll-margin-top: 1rem; }
    h4 { font-size: 1rem; margin-top: 1.25rem; scroll-margin-top: 1rem; }
    p, li { color: var(--text); }
    .meta { color: var(--muted); font-size: 0.9rem; margin-bottom: 2rem; }
    .doc-toc {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1rem 1.25rem;
      margin: 1.5rem 0 2rem;
      font-size: 0.9rem;
    }
    .doc-toc ul { margin: 0.5rem 0 0; padding-left: 1.25rem; }
    .doc-toc li { margin-bottom: 0.35rem; }
    .doc-toc a { color: var(--accent); }
    .part-label {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
      margin-top: 2.5rem;
    }
    .score-box {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 1rem;
      margin: 1.5rem 0;
    }
    .score-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1rem;
      text-align: center;
    }
    .score-card .big { font-size: 2rem; font-weight: 700; }
    .score-card .label { font-size: 0.8rem; color: var(--muted); }
    .verdict {
      background: #fef3f2;
      border: 1px solid #fecdca;
      border-radius: 10px;
      padding: 1rem 1.25rem;
      margin: 1.5rem 0;
    }
    .win {
      background: #ecfdf3;
      border: 1px solid #abefc6;
      border-radius: 10px;
      padding: 1rem 1.25rem;
      margin: 1.5rem 0;
    }
    .issue {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.25rem;
      margin: 1.5rem 0;
    }
    .issue h3 { margin-top: 0; }
    .backlog-item {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1rem 1.25rem;
      margin: 1rem 0;
    }
    .backlog-item h4 { margin: 0.35rem 0 0.5rem; font-size: 1rem; color: var(--text); }
    .backlog-item .compare { margin-top: 1rem; }
    .shot-missing { color: var(--warn); }
    .badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }
    .badge-blocker { background: #fee4e2; color: var(--bad); }
    .badge-gap { background: #fef0c7; color: var(--warn); }
    .badge-win { background: #d1fadf; color: var(--ok); }
    .compare {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-top: 1rem;
    }
    @media (max-width: 700px) {
      .compare { grid-template-columns: 1fr; }
    }
    .compare figure { margin: 0; }
    .compare figcaption {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--muted);
      margin-bottom: 0.35rem;
      text-align: center;
    }
    .compare img {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 8px;
      display: block;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
      margin: 1rem 0;
    }
    table.compact { font-size: 0.82rem; }
    th, td {
      border: 1px solid var(--border);
      padding: 0.5rem 0.75rem;
      text-align: left;
      vertical-align: top;
    }
    th { background: #f5f5f5; }
    tr.row-gap td { background: #fffaeb; }
    ul.plain { padding-left: 1.25rem; }
    ul.plain li { margin-bottom: 0.5rem; }
    .appendix {
      background: var(--appendix-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem 1.5rem 2rem;
      margin-top: 3rem;
    }
    .appendix > h2 {
      margin-top: 0;
      border-bottom-color: #d0d0d5;
    }
    .appendix .md-body h2 { font-size: 1.15rem; margin-top: 2rem; }
    .appendix .md-body h3 { font-size: 1rem; }
    .appendix .md-body h4 { font-size: 0.95rem; }
    .appendix pre {
      background: #1e1e1e;
      color: #e8e8e8;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.8rem;
    }
    .appendix code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.85em;
    }
    .appendix p code, .appendix td code, .appendix li code {
      background: #e8e8ed;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
    }
    footer.report-footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
      font-size: 0.85rem;
      color: var(--muted);
    }
    @media print {
      body { max-width: none; padding: 0.5in; }
      .appendix { break-inside: avoid; page-break-inside: avoid; }
      .issue { break-inside: avoid; }
      a { color: inherit; text-decoration: none; }
    }
`;

function readMd(name) {
  const fp = path.join(DOCS, name);
  if (!fs.existsSync(fp)) {
    throw new Error(
      `Missing ${fp}. Run: npm run setup && npm run audit, then fill in ${name} from the rubric and audit-data.json.`
    );
  }
  return fs.readFileSync(fp, 'utf8');
}

function main() {
  const auditDataPath = path.join(DOCS, 'audit-data.json');
  if (!fs.existsSync(auditDataPath)) {
    throw new Error(`Missing ${auditDataPath}. Run: npm run audit`);
  }
  const auditData = JSON.parse(fs.readFileSync(auditDataPath, 'utf8'));

  const enhancementMd = readMd('enhancement-log.md');
  const rubricHtml = prepareRubricHtml(markdownToHtml(readMd('ux-audit-rubric.md')));
  const resultsHtml = markdownToHtml(readMd('ux-audit-results.md'));
  const enhancementMainHtml = buildEnhancementMainHtml(enhancementMd);
  const enhancementHtml = markdownToHtml(enhancementMd);
  const featureHtml = prepareFeatureHtml(markdownToHtml(readMd('feature-completeness.md')));
  const metricsHtml = buildMetricsSection(auditData);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>docs.page vs Mintlify — UX Audit Report</title>
  <style>${CSS}</style>
</head>
<body>

  <h1>docs.page vs Mintlify — UX Audit Report</h1>
  <p class="meta">
    Same content (Agent Skills docs) · 15 June 2026 · Rubric v1.2 · Self-contained report<br />
    Mintlify: <a href="https://agentskills.io">agentskills.io</a> ·
    docs.page: <a href="https://docspage-production.up.railway.app/BenInvertase/docs-page-ux-test">Railway pre-release (ai branch)</a>
  </p>

  <div class="score-box">
    <div class="score-card">
      <div class="big">57%</div>
      <div class="label">docs.page overall<br />(Mintlify = 100%)</div>
    </div>
    <div class="score-card">
      <div class="big">0</div>
      <div class="label">Hard blockers<br />(none at score 0)</div>
    </div>
    <div class="score-card">
      <div class="big">16</div>
      <div class="label">Outstanding gaps<br />(deduplicated)</div>
    </div>
    <div class="score-card">
      <div class="big">11</div>
      <div class="label">Feature gaps<br />(behind Mintlify)</div>
    </div>
  </div>

  <p class="part-label">Part I — Executive report</p>

  <div class="verdict">
    <strong>Bottom line:</strong> On desktop, docs.page is competitive — readability, search, theme, and code blocks hold up well (57% overall on rubric v1.2).
    On tablet and mobile it still falls behind: the nav drawer opens but shows only a partial page tree, and the layout keeps too much chrome.
    The in-docs AI assistant is missing from the header, load times are slower, and accessibility basics (skip link, heading anchors) need attention.
  </div>

  <nav class="doc-toc" aria-label="Table of contents">
    <strong>Contents</strong>
    <ul>
      <li><a href="#executive-summary">Executive summary</a></li>
      <li><a href="#category-scores">Category scores</a></li>
      <li><a href="#outstanding-gaps">Outstanding gaps (16)</a></li>
      <li><a href="#whats-working">What’s working</a></li>
      <li><a href="#appendices">Appendices</a>
        <ul>
          <li><a href="#appendix-a">A — Scoring rubric</a></li>
          <li><a href="#appendix-b">B — Full scorecard</a></li>
          <li><a href="#appendix-c">C — Enhancement backlog</a></li>
          <li><a href="#appendix-d">D — Feature completeness</a></li>
          <li><a href="#appendix-e">E — Automated metrics</a></li>
        </ul>
      </li>
    </ul>
  </nav>

  <h2 id="executive-summary">Executive summary</h2>
  <p>This report compares the <strong>reader experience</strong> of two sites serving the same Agent Skills documentation: Mintlify (production baseline) and docs.page (pre-release build on Railway). Scoring uses rubric v1.2 — weighted UX criteria (D*, R*, N*, etc.) plus a separate feature completeness matrix (F1–F35).</p>
  <p><strong>Method:</strong> Chromium/Playwright automated checks, paired screenshots, and manual spot-checks on fixture pages P1–P8 at desktop (1440×900), tablet (834×1194), and mobile (390×844). Mintlify scores 100% by definition; docs.page scores relative to that baseline.</p>
  <p><strong>Interpretation band:</strong> 57% falls in the “meaningful gaps” range (&lt;60%) — competitive on desktop reading, but not yet at parity for responsive layout, discoverability, and performance on this content profile.</p>

  <h2 id="category-scores">Category scores</h2>
  <table>
    <thead>
      <tr><th>Area</th><th>Weight</th><th>Score (/3)</th><th>Weighted %</th><th>Plain summary</th></tr>
    </thead>
    <tbody>
      <tr><td>Navigation &amp; wayfinding</td><td>18%</td><td>1.53</td><td>9.2</td><td>Desktop OK; mobile tree incomplete; tablet cramped</td></tr>
      <tr><td>Readability &amp; typography</td><td>18%</td><td>2.00</td><td>12.0</td><td>Strong typography; narrow column; code labels win</td></tr>
      <tr><td>Rich components</td><td>14%</td><td>1.57</td><td>7.3</td><td>Tabs/cards fine; callouts/logos weaker</td></tr>
      <tr><td>On-page aids</td><td>9%</td><td>1.60</td><td>4.8</td><td>TOC works; missing anchors; mobile TOC awkward</td></tr>
      <tr><td>Search</td><td>7%</td><td>1.80</td><td>4.2</td><td>Works well; empty state weak</td></tr>
      <tr><td>Discoverability</td><td>10%</td><td>1.67</td><td>5.6</td><td>Search/theme easy; AI assistant hard to find</td></tr>
      <tr><td>Performance</td><td>9%</td><td>1.60</td><td>4.8</td><td>~2× slower load and navigation</td></tr>
      <tr><td>Accessibility</td><td>9%</td><td>1.83</td><td>5.5</td><td>Missing skip link and heading links</td></tr>
      <tr><td>Agent surfaces</td><td>6%</td><td>1.80</td><td>3.6</td><td>llms.txt + MCP parity; assistant gap</td></tr>
      <tr><td><strong>Overall</strong></td><td><strong>100%</strong></td><td>—</td><td><strong>57.0%</strong></td><td>See <a href="#appendix-b">Appendix B</a> for every criterion</td></tr>
    </tbody>
  </table>

  <h2 id="outstanding-gaps">Outstanding gaps (16)</h2>
  ${enhancementMainHtml}

  <h2 id="whats-working">What’s working</h2>
  <div class="win">
    <span class="badge badge-win">Win</span>
  <p><strong>R6 — Code block titles:</strong> docs.page scores 3/3; filename/language labels on fenced blocks are clearer than Mintlify in this fixture.</p>
  </div>
  <ul class="plain">
    <li><strong>Search &amp; theme (D1–D3, S1–S4):</strong> ⌘K search, mobile search, and light/dark toggle all work with persistence.</li>
    <li><strong>Code copy (R5):</strong> Per-block copy buttons present (figcaption icons); earlier false negative corrected.</li>
    <li><strong>Agent surfaces (G1–G3, G5):</strong> llms.txt, MCP endpoint, and copy-page action at parity.</li>
    <li><strong>Tablet TOC (O6):</strong> docs.page keeps outline at 834px where Mintlify hides it — a minor win on reference pages.</li>
  </ul>

  <p class="part-label" id="appendices">Part II — Appendices</p>

  <section class="appendix" id="appendix-a">
    <h2>Appendix A — Scoring rubric &amp; methodology (v1.2)</h2>
    <p class="meta">Source: <code>ux-audit-rubric.md</code> — scoring scale, test matrix, weighted criteria, F1–F35 definitions, audit procedure. (The rubric’s internal “feature completeness matrix” section is renamed here to avoid clashing with report Appendix D.)</p>
    <div class="md-body">${rubricHtml}</div>
  </section>

  <section class="appendix" id="appendix-b">
    <h2>Appendix B — Full audit results</h2>
    <p class="meta">Source: <code>ux-audit-results.md</code> — every criterion score including parity and wins.</p>
    <div class="md-body">${resultsHtml}</div>
  </section>

  <section class="appendix" id="appendix-c">
    <h2>Appendix C — Enhancement log (source)</h2>
    <p class="meta">Source markdown for <a href="#outstanding-gaps">Outstanding gaps (16)</a> in Part I — same content, original format.</p>
    <div class="md-body">${enhancementHtml}</div>
  </section>

  <section class="appendix" id="appendix-d">
    <h2>Appendix D — Feature completeness</h2>
    <p class="meta">Source: <code>feature-completeness.md</code> — features where docs.page is behind Mintlify.</p>
    <div class="md-body">${featureHtml}</div>
  </section>

  <section class="appendix" id="appendix-e">
    <h2>Appendix E — Automated audit metrics</h2>
    <p class="meta">Source: <code>audit-data.json</code> — raw Playwright output from <code>scripts/run-full-audit.mjs</code>.</p>
    ${metricsHtml}
  </section>

  <footer class="report-footer">
    Self-contained UX audit report · Generated ${new Date().toISOString().slice(0, 10)} ·
    Rebuild: <code>AUDIT_ROOT=${ROOT} node scripts/build-audit-report.mjs</code>
  </footer>

</body>
</html>`;

  fs.writeFileSync(REPORT_PATH, html);
  const sizeMb = (Buffer.byteLength(html) / 1024 / 1024).toFixed(2);
  console.log(`Wrote ${REPORT_PATH} (${sizeMb} MB)`);
}

main();
