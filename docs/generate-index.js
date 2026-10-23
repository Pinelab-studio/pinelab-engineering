#!/usr/bin/env node

// Run with: node docs/generate-index.js
// Generates root index.md from best-practice and recipe frontmatter descriptions.
// Validates every description before overwriting the index.

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

async function section(folder, heading) {
  const files = (await findMarkdown(path.join(__dirname, folder)))
    .map((filename) => path.relative(root, filename).split(path.sep).join('/'))
    .sort((a, b) => {
      const aReference = a.startsWith(`docs/${folder}/references/`);
      const bReference = b.startsWith(`docs/${folder}/references/`);
      if (aReference !== bReference) return aReference ? -1 : 1;
      return a < b ? -1 : a > b ? 1 : 0;
    });

  const bullets = await Promise.all(files.map(async (filename) => {
    const content = await fs.readFile(path.join(root, filename), 'utf8');
    const description = getDescription(content, filename);
    return `* ${description} - always fetch \`curl ${baseUrl}${filename}\``;
  }));
  return `# ${heading}\n\n${bullets.join('\n')}`;
}

async function main() {
  const sections = await Promise.all([
    section('best-practices', 'Pinelab General Best Practices'),
    section('recipes', 'Feature Specific Recipes'),
  ]);
  await fs.writeFile(path.join(root, 'index.md'), `${sections.join('\n\n')}\n`);
  console.log('Generated index.md with best practices and recipes.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
