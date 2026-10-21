#!/usr/bin/env node

// Run with: node recipes/generate-index.js
// Generates root recipe_index.md from Markdown frontmatter descriptions in recipes/.
// Lists references first, then recipes, with curl commands to fetch each file.
// Always overwrites the index, but only after all descriptions pass validation.

const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const baseUrl = 'https://raw.githubusercontent.com/Pinelab-studio/pinelab-engineering/heads/main/';

async function findMarkdown(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) return findMarkdown(filename);
    return entry.isFile() && entry.name.endsWith('.md') ? [filename] : [];
  }));
  return files.flat();
}

function getDescription(content, filename) {
  const frontmatter = content.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const match = frontmatter?.[1].match(/^description:[ \t]*(.*)$/m);
  let description = match?.[1].trim();
  if (!description) throw new Error(`${filename}: missing frontmatter description`);

  if (description.startsWith('"')) {
    description = JSON.parse(description);
  } else if (description.startsWith("'") && description.endsWith("'")) {
    description = description.slice(1, -1).replace(/''/g, "'");
  }

  if (!description.trim() || /^[>|][+-]?\d?$/.test(description)) {
    throw new Error(`${filename}: description must be a non-empty single line`);
  }
  return description;
}

async function main() {
  const files = (await findMarkdown(__dirname))
    .map((filename) => path.relative(root, filename).split(path.sep).join('/'))
    .sort((a, b) => {
      const aReference = a.startsWith('recipes/references/');
      const bReference = b.startsWith('recipes/references/');
      if (aReference !== bReference) return aReference ? -1 : 1;
      return a < b ? -1 : a > b ? 1 : 0;
    });

  // Read and validate every description before touching the existing index.
  const bullets = await Promise.all(files.map(async (filename) => {
    const content = await fs.readFile(path.join(root, filename), 'utf8');
    const description = getDescription(content, filename);
    return `* ${description} - always fetch \`curl ${baseUrl}${filename}\``;
  }));

  await fs.writeFile(path.join(root, 'recipe_index.md'), `${bullets.join('\n')}\n`);
  console.log(`Generated recipe_index.md with ${bullets.length} entries.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
