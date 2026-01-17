/**
 * TXT Exporter
 * Exports script data as plain text file or copies all to clipboard
 */

import type { ExportData } from "./types";

interface TxtExporterOptions {
  filename?: string;
  includeTimestamp?: boolean;
  includeDescription?: boolean;
}

/**
 * Formats all scripts as plain text
 */
function formatAllAsText(
  data: ExportData,
  options: TxtExporterOptions = {},
): string {
  const { includeTimestamp = true, includeDescription = true } = options;

  let text = "";

  // Title
  text += `${"=".repeat(50)}\n`;
  text += `${data.title}\n`;
  text += `${"=".repeat(50)}\n\n`;

  // Timestamp
  if (includeTimestamp && data.generatedAt) {
    text += `Generated: ${data.generatedAt.toLocaleString()}\n\n`;
  }

  // Description
  if (includeDescription && data.description) {
    text += `PRODUCT DESCRIPTION:\n${data.description}\n\n`;
  }

  // Scripts
  data.scripts.forEach(({ angle, script, index }) => {
    text += `${"-".repeat(40)}\n`;
    text += `${angle} - Variation ${index + 1}\n`;
    text += `${"-".repeat(40)}\n\n`;
    text += `${script}\n\n`;
  });

  text += `\n${"=".repeat(50)}\n`;
  text += `Generated with Adocavo.net\n`;

  return text;
}

/**
 * Downloads all scripts as TXT file
 */
export function exportAsTxt(
  data: ExportData,
  options: TxtExporterOptions = {},
): void {
  const { filename } = options;
  const defaultFilename = `tiktok-scripts-${Date.now()}.txt`;
  const finalFilename = filename || defaultFilename;

  const text = formatAllAsText(data, options);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = finalFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copies all scripts to clipboard
 */
export async function copyAllScripts(
  data: ExportData,
  options?: TxtExporterOptions,
): Promise<boolean> {
  try {
    const text = formatAllAsText(data, options);
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates mailto link for sharing scripts via email
 */
export function generateMailtoLink(
  data: ExportData,
  options: TxtExporterOptions = {},
): string {
  const { includeTimestamp = false, includeDescription = true } = options;

  let body = "";

  // Title
  body += `${data.title}\n`;
  body += `${"=".repeat(50)}\n\n`;

  // Timestamp (optional - usually not needed in email)
  if (includeTimestamp && data.generatedAt) {
    body += `Generated: ${data.generatedAt.toLocaleString()}\n\n`;
  }

  // Description
  if (includeDescription && data.description) {
    body += `PRODUCT:\n${data.description}\n\n`;
  }

  // Scripts
  data.scripts.forEach(({ angle, script, index }) => {
    body += `\n${angle} (Variation ${index + 1}):\n`;
    body += `${"-".repeat(40)}\n`;
    body += `${script}\n`;
  });

  body += `\n${"=".repeat(50)}\n`;
  body += `Generated with Adocavo.net\n`;

  const subject = encodeURIComponent(data.title);
  const formattedBody = encodeURIComponent(body);

  return `mailto:?subject=${subject}&body=${formattedBody}`;
}

/**
 * Opens email client with pre-filled content
 */
export function shareViaEmail(
  data: ExportData,
  options: TxtExporterOptions = {},
): void {
  const mailtoLink = generateMailtoLink(data, options);
  window.open(mailtoLink, "_blank");
}

/**
 * Formats data as JSON
 */
function formatAsJSON(data: ExportData): string {
  const exportData = {
    title: data.title,
    description: data.description,
    generatedAt: data.generatedAt?.toISOString(),
    scripts: data.scripts.map(({ angle, script, index }) => ({
      variation: index + 1,
      angle,
      script,
    })),
    exportedAt: new Date().toISOString(),
    generator: "Adocavo.net",
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Downloads data as JSON file
 */
export function exportAsJson(data: ExportData, filename?: string): void {
  const defaultFilename = `tiktok-scripts-${Date.now()}.json`;
  const finalFilename = filename || defaultFilename;

  const json = formatAsJSON(data);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = finalFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copies JSON data to clipboard
 */
export async function copyJsonToClipboard(data: ExportData): Promise<boolean> {
  try {
    const json = formatAsJSON(data);
    await navigator.clipboard.writeText(json);
    return true;
  } catch {
    return false;
  }
}
