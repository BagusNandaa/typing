import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

/** Namespace identifiers the DOM uses. Browsers do not fetch these. */
const DOM_NAMESPACE_URLS = new Set([
  "http://www.w3.org/1999/xhtml",
  "http://www.w3.org/2000/svg",
  "http://www.w3.org/1999/xlink",
]);

const TAG_WITH_RESOURCE =
  /<(?:script|link|img|source|video|audio|iframe|object|embed|use|track)\b[^>]*>/gi;
const RESOURCE_ATTR =
  /\b(?:src|href|poster|action)\s*=\s*("([^"]*)"|'([^']*)')/gi;
const CSS_URL = /url\(\s*("([^"]*)"|'([^']*)'|([^)"'\s]+))\s*\)/gi;

function isInlineResource(value: string): boolean {
  return value.startsWith("data:") || value.startsWith("#");
}

function attributeValue(match: RegExpExecArray): string {
  return match[2] ?? match[3] ?? "";
}

/**
 * Reasons the built page would touch the network or another file.
 * Data URIs and in-page hashes are the only allowed resource targets.
 */
export function findHtmlProblems(html: string): string[] {
  const problems: string[] = [];

  for (const tag of html.matchAll(TAG_WITH_RESOURCE)) {
    for (const attr of tag[0].matchAll(RESOURCE_ATTR)) {
      const value = attributeValue(attr);
      if (!isInlineResource(value)) {
        problems.push(`loads ${value || "(empty)"}`);
      }
    }
    if (/\btype\s*=\s*["']module["']/i.test(tag[0])) {
      problems.push("module script");
    }
    if (/\brel\s*=\s*["']modulepreload["']/i.test(tag[0])) {
      problems.push("modulepreload");
    }
    if (/\btype\s*=\s*["']importmap["']/i.test(tag[0])) {
      problems.push("import map");
    }
  }

  for (const style of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const match of style[1].matchAll(CSS_URL)) {
      const value = match[2] ?? match[3] ?? match[4] ?? "";
      if (!isInlineResource(value)) {
        problems.push(`css url ${value || "(empty)"}`);
      }
    }
  }

  if (
    /\bnew\s+(?:Shared)?Worker\b|\bimportScripts\s*\(|serviceWorker\s*\.\s*register\s*\(/.test(
      html,
    )
  ) {
    problems.push("worker");
  }

  if (/[#@]\s*sourceMappingURL=(?!data:)/.test(html)) {
    problems.push("external source map");
  }

  const withoutInlineResources = html
    .replace(TAG_WITH_RESOURCE, (tag) => tag.replace(RESOURCE_ATTR, ""))
    .replace(CSS_URL, "url()");
  const urls = withoutInlineResources.match(/https?:\/\/[^"'`\\\s)<]+/g) ?? [];
  for (const raw of urls) {
    const url = raw.replace(/[),.;]+$/u, "");
    if (!DOM_NAMESPACE_URLS.has(url)) {
      problems.push(`external url ${url}`);
    }
  }

  if (/\bfile:\/\//i.test(withoutInlineResources)) {
    problems.push("file url");
  }

  return problems;
}

export function listDistFiles(distDir: string): string[] {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        files.push(relative(distDir, full).split("\\").join("/"));
      }
    }
  };
  walk(distDir);
  files.sort();
  return files;
}
