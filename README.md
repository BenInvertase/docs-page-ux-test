# docs-page-ux-test

Agent Skills documentation fixture for comparing **docs.page** vs **Mintlify** reader UX.

## What's in the repo

| Path | Committed? | Purpose |
|---|---|---|
| `docs/`, `docs.json` | Yes | MDX fixture served by docs.page |
| `.docs/ux-audit-rubric.md` | Yes | Scoring methodology (v1.2) |
| `.docs/example.*` | Yes | Templates showing output file shape |
| `scripts/run-full-audit.mjs` | Yes | Playwright data collection + screenshots |
| `scripts/generate-scorecards.mjs` | Yes | Derives scorecards from audit-data.json |
| `scripts/build-audit-report.mjs` | Yes | Builds standalone HTML report |
| `.docs/audit-data.json`, scorecards, HTML, `screenshots/*.png` | **No** (gitignored) | Per-run outputs |

## UX audit — clean run

Requires Node 18+, network access, and both comparison sites to be live.

```bash
npm install
npx playwright install chromium
npm run setup          # copies example scorecard templates (once)
npm run audit          # ~2 min → audit-data.json, feature-completeness.md, screenshots/
npm run scorecards     # generates ux-audit-results.md + enhancement-log.md from audit data
npm run report         # → .docs/ux-audit-report.html
open .docs/ux-audit-report.html
```

Or `npm run audit:full` after setup (audit → scorecards → report).

### Comparison URLs

Configured in `scripts/run-full-audit.mjs` → `PLATFORMS`:

- **Mintlify:** https://agentskills.io
- **docs.page:** Railway pre-release URL for this fixture (update if the deploy moves)

