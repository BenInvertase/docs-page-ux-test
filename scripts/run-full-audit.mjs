#!/usr/bin/env node
/**
 * Full UX audit data collection for docs.page vs Mintlify rubric v1.2.
 * Writes gitignored outputs: .docs/audit-data.json, .docs/feature-completeness.md, screenshots/*.png
 */
import { runFullAudit } from "../lib/audit/run-audit.mjs";

runFullAudit()
  .then(({ ctx }) => {
    console.log(`Wrote ${ctx.outFile}`);
    console.log(`Wrote ${ctx.completenessFile}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
