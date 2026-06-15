import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(root, "docs");
const clientsPath = "/tmp/agentskills/docs/snippets/clients.jsx";

const clientsSource = fs.readFileSync(clientsPath, "utf8");
const clientsMatch = clientsSource.match(
  /export const clients = (\[[\s\S]*?\n\]);/,
);
if (!clientsMatch) {
  throw new Error("Could not parse clients.jsx");
}
// eslint-disable-next-line no-eval
const clients = eval(clientsMatch[1]);

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function adaptMdx(source) {
  return (
    source
      .replace(/^import .+from .+;\n/gm, "")
      .replace(/<Note>/g, "<Info>")
      .replace(/<\/Note>/g, "</Info>")
      .replace(/<Tip>/g, "<Info>")
      .replace(/<\/Tip>/g, "</Info>")
      .replace(/<Tabs sync={false}>/g, "<Tabs>")
      .replace(/<Tab title="([^"]+)">/g, (_, title) => {
        const value = slugify(title);
        return `<TabItem label="${title}" value="${value}">`;
      })
      .replace(/<\/Tab>/g, "</TabItem>")
      .replace(/ noZoom/g, "")
  );
}

function clientCard(client) {
  const links = [];
  if (client.instructionsUrl) {
    links.push(`[Setup instructions](${client.instructionsUrl})`);
  }
  if (client.sourceCodeUrl) {
    links.push(`[Source code](${client.sourceCodeUrl})`);
  }

  const footer = links.length > 0 ? `\n\n${links.join(" · ")}` : "";

  return `  <Card title="${client.name}" href="${client.url}">
![${client.name}](${client.lightSrc})

${client.description}${footer}
  </Card>`;
}

function logoWall() {
  return clients
    .map(
      (client) =>
        `[![${client.name}](${client.lightSrc})](${client.url})`,
    )
    .join(" ");
}

function writeClientsPage() {
  const body = `---
title: "Client Showcase"
description: "Agent products that support the Agent Skills format."
---

<CardGroup cols={2}>
${clients.map(clientCard).join("\n")}
</CardGroup>
`;

  fs.writeFileSync(path.join(docsDir, "clients.mdx"), body);
}

function patchIndexPage() {
  const indexPath = path.join(docsDir, "index.mdx");
  let source = fs.readFileSync(indexPath, "utf8");
  source = adaptMdx(source);
  source = source.replace(
    /<LogoCarousel clients={clients} \/>/,
    logoWall(),
  );
  fs.writeFileSync(indexPath, source);
}

function walkMdx(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMdx(fullPath);
      continue;
    }
    if (!entry.name.endsWith(".mdx")) {
      continue;
    }
    if (entry.name === "clients.mdx" || entry.name === "index.mdx") {
      continue;
    }
    const source = fs.readFileSync(fullPath, "utf8");
    fs.writeFileSync(fullPath, adaptMdx(source));
  }
}

writeClientsPage();
patchIndexPage();
walkMdx(docsDir);

console.log(`Ported ${clients.length} clients and adapted MDX files.`);
