import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { includedDocuments } from "../included-documents.ts";

/**
 * Build the Workers article catalogue from repository Markdown.
 * Bundle workflows, best practices and on-demand recipes; arbitrary paths are excluded.
 * Runs before checks/tests and during Wrangler builds; output is generated, not committed.
 * Paths use import.meta.url so generation does not depend on the invoking shell's cwd.
 */
const root = new URL("../../../docs/", import.meta.url);
const generated = new URL("../generated/", import.meta.url);
const articles = [];
for (const folder of ["workflow", "best-practices", "recipes"]) {
  for (const file of (await readdir(new URL(folder, root))).sort()) {
    if (!file.endsWith(".md")) continue;
    articles.push({
      id: `${folder}/${file.slice(0, -3)}`,
      text: await readFile(new URL(`${folder}/${file}`, root), "utf8"),
    });
  }
}
// Fail publication before writing a catalogue with broken or circular inclusions.
for (const article of articles) includedDocuments(article, articles);
// Replace the whole catalogue so removed/renamed articles cannot linger in the deployed bundle.
await mkdir(generated, { recursive: true });
await writeFile(
  new URL("skills.json", generated),
  JSON.stringify(articles, null, 2) + "\n",
);
