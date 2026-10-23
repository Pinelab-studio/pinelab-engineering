import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";

// Bundle only approved article directories. Workers have no runtime checkout/filesystem.
const root = new URL("../../", import.meta.url);
const generated = new URL("../generated/", import.meta.url);
const articles = [];
for (const folder of ["workflow", "knowledge"]) {
  for (const file of (await readdir(new URL(folder, root))).sort()) {
    if (!file.endsWith(".md")) continue;
    articles.push({
      id: `${folder}/${file.slice(0, -3)}`,
      text: await readFile(new URL(`${folder}/${file}`, root), "utf8"),
    });
  }
}
await mkdir(generated, { recursive: true });
await writeFile(
  new URL("skills.json", generated),
  JSON.stringify(articles, null, 2) + "\n",
);
