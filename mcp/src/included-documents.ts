import type { Article } from "./mcp.js";

/** Resolve declared repository-relative documents, rejecting missing references and cycles. */
export function includedDocuments(article: Article, articles: Article[]): Article[] {
  const included: Article[] = [];
  const seen = new Set<string>();
  function visit(current: Article, ancestors: Set<string>) {
    if (ancestors.has(current.id)) throw new Error(`Circular includedDocuments: ${current.id}`);
    if (seen.has(current.id)) return;
    seen.add(current.id);
    included.push(current);
    const frontmatter = current.text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
    const declaration = frontmatter?.match(/^includedDocuments:[^\S\r\n]*(.*)\r?$/m);
    if (!declaration) return;
    if (declaration[1].trim()) throw new Error(`includedDocuments must be a block list: ${current.id}`);
    const rest = frontmatter!.slice(declaration.index! + declaration[0].length);
    const block = rest.match(/^(?:\r?\n(?:[ \t]+[^\r\n]*|[ \t]*))*/)?.[0] ?? "";
    const paths = block.split(/\r?\n/).filter((line) => line.trim()).map((line) => {
      const item = line.match(/^\s+-\s+([^\s]+)\s*$/);
      if (!item) throw new Error(`includedDocuments must contain plain repository paths: ${current.id}`);
      return item[1];
    });
    if (!paths.length) throw new Error(`includedDocuments must contain at least one path: ${current.id}`);
    for (const path of paths) {
      const target = articles.find((candidate) => `docs/${candidate.id}.md` === path);
      if (!target) throw new Error(`Unknown includedDocuments: ${path}`);
      visit(target, new Set([...ancestors, current.id]));
    }
  }
  visit(article, new Set());
  return included;
}
