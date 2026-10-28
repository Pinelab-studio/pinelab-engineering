import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, copyFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { includedDocuments } from "./included-documents.js";

test("catalogue generation rejects missing included documents", async () => {
  const result = await generate("docs/missing.md");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown includedDocuments: docs\/missing.md/);
});

test("catalogue generation rejects inclusion cycles", async () => {
  const result = await generate("docs/workflow/review.md");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Circular includedDocuments: workflow\/review/);
});

test("multiple inclusions retain declaration order and deduplicate transitive documents", () => {
  const root = { id: "workflow/review", text: "---\nincludedDocuments:\n  - docs/best-practices/global.md\n  - docs/best-practices/vendure.md\n---\nReview" };
  const global = { id: "best-practices/global", text: "Global" };
  const vendure = { id: "best-practices/vendure", text: "---\nincludedDocuments:\n  - docs/best-practices/global.md\n---\nVendure" };
  assert.deepEqual(includedDocuments(root, [root, global, vendure]).map(({ id }) => id), [
    "workflow/review", "best-practices/global", "best-practices/vendure",
  ]);
});

test("scalar declarations are rejected", () => {
  const article = { id: "workflow/review", text: "---\nincludedDocuments: docs/global.md\n---\nReview" };
  assert.throws(() => includedDocuments(article, [article]), /must be a block list/);
});

/** Run the real generator against an isolated repository fixture without changing source documents. */
async function generate(includedDocument: string) {
  const root = await mkdtemp(join(tmpdir(), "pinelab-articles-"));
  try {
    // Preserve repository layout because generation resolves paths relative to its own script.
    await mkdir(join(root, "mcp/src/scripts"), { recursive: true });
    await mkdir(join(root, "docs/workflow"), { recursive: true });
    await mkdir(join(root, "docs/recipes"), { recursive: true });
    await mkdir(join(root, "docs/best-practices"), { recursive: true });
    await copyFile(new URL("./scripts/generate-skills.mjs", import.meta.url), join(root, "mcp/src/scripts/generate-skills.mjs"));
    await copyFile(new URL("./included-documents.ts", import.meta.url), join(root, "mcp/src/included-documents.ts"));
    await writeFile(join(root, "docs/workflow/review.md"), `---\nincludedDocuments:\n  - ${includedDocument}\n---\nReview`);
    return spawnSync(process.execPath, ["--import", import.meta.resolve("tsx"), join(root, "mcp/src/scripts/generate-skills.mjs")], { encoding: "utf8" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
