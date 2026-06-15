import path from "node:path";
import { fileURLToPath } from "node:url";

const libDir = path.dirname(fileURLToPath(import.meta.url));

export function getAuditRoot() {
  return process.env.AUDIT_ROOT || path.join(libDir, "../..");
}

export function createAuditContext(root = getAuditRoot()) {
  return {
    root,
    shotsDir: path.join(root, "screenshots"),
    outFile: path.join(root, ".docs/audit-data.json"),
    completenessFile: path.join(root, ".docs/feature-completeness.md"),
  };
}
