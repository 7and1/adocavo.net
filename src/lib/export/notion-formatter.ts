/**
 * Notion Markdown Formatter
 * Converts script data to Notion-compatible markdown format
 */

import type { ExportData } from "./types";

interface NotionFormatterOptions {
  includeTimestamp?: boolean;
  includeDescription?: boolean;
}

/**
 * Formats visual/audio cues for Notion
 * Notion supports code blocks, bold, italic, and callouts
 */
function formatScriptForNotion(script: string): string {
  return script
    .replace(/\[Visual:([^\]]+)\]/g, "> **[Visual]** $1\n")
    .replace(/\(Audio:([^)]+)\)/g, "> **(Audio)** $1\n")
    .replace(/\[([^\]]+)\]/g, "**[$1]**")
    .replace(/\(([^)]+)\)/g, "($1)");
}

/**
 * Converts script data to Notion markdown format
 */
export function toNotionMarkdown(
  data: ExportData,
  options: NotionFormatterOptions = {},
): string {
  const { includeTimestamp = true, includeDescription = true } = options;

  let markdown = "";

  // Title
  markdown += `# ${data.title}\n\n`;

  // Timestamp
  if (includeTimestamp && data.generatedAt) {
    markdown += `*Generated: ${data.generatedAt.toLocaleString()}*\n\n`;
  }

  // Description
  if (includeDescription && data.description) {
    markdown += `## Product Description\n\n${data.description}\n\n`;
  }

  // Scripts
  markdown += `## Scripts\n\n`;

  data.scripts.forEach(({ angle, script, index }) => {
    markdown += `### ${angle} (Variation ${index + 1})\n\n`;
    markdown += "```text\n";
    markdown += formatScriptForNotion(script);
    markdown += "\n```\n\n";
    markdown += "---\n\n";
  });

  // Footer
  markdown += `\n*Generated with [Adocavo](https://adocavo.net)*`;

  return markdown;
}

/**
 * Copies Notion-formatted markdown to clipboard
 */
export async function copyToNotionFormat(
  data: ExportData,
  options?: NotionFormatterOptions,
): Promise<boolean> {
  try {
    const markdown = toNotionMarkdown(data, options);
    await navigator.clipboard.writeText(markdown);
    return true;
  } catch {
    return false;
  }
}
