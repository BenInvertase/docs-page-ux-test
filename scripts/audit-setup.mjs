#!/usr/bin/env node
/** Copy example scorecard templates into gitignored output paths (skip if already present). */
import fs from 'node:fs';
import path from 'node:path';

const docs = path.join(process.cwd(), '.docs');
const pairs = [
  ['example.enhancement-log.md', 'enhancement-log.md'],
  ['example.ux-audit-results.md', 'ux-audit-results.md'],
];

for (const [src, dest] of pairs) {
  const from = path.join(docs, src);
  const to = path.join(docs, dest);
  if (!fs.existsSync(from)) {
    console.error(`Missing template: ${from}`);
    process.exit(1);
  }
  if (fs.existsSync(to)) {
    console.log(`Skip ${dest} (already exists)`);
    continue;
  }
  fs.copyFileSync(from, to);
  console.log(`Created ${dest} from ${src} — edit with scores from audit-data.json`);
}

console.log('Next: npm run audit → update scorecard files → npm run report');
