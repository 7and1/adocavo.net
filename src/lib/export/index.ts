/**
 * Export Library
 * Unified export functionality for scripts
 * Supports PDF, Notion, TXT, JSON, copy-all, and email formats
 */

export type {
  ExportData,
  ExportFormat,
  ExportOptions,
  ExportResult,
} from "./types";
export { exportToPDF } from "./pdf-exporter";
export { toNotionMarkdown, copyToNotionFormat } from "./notion-formatter";
export {
  exportAsTxt,
  copyAllScripts,
  shareViaEmail,
  generateMailtoLink,
  exportAsJson,
  copyJsonToClipboard,
} from "./txt-exporter";

import type { ExportData } from "./types";
import { exportToPDF } from "./pdf-exporter";
import { copyToNotionFormat } from "./notion-formatter";
import {
  exportAsTxt,
  copyAllScripts,
  shareViaEmail,
  exportAsJson,
} from "./txt-exporter";
import type { ExportFormat } from "./types";

/**
 * Main export function that routes to appropriate exporter
 */
export async function exportScripts(
  data: ExportData,
  format: ExportFormat,
): Promise<boolean> {
  try {
    switch (format) {
      case "pdf":
        await exportToPDF(data);
        return true;
      case "notion":
        return await copyToNotionFormat(data);
      case "txt":
        exportAsTxt(data);
        return true;
      case "json":
        exportAsJson(data);
        return true;
      case "copy-all":
        return await copyAllScripts(data);
      case "email":
        shareViaEmail(data);
        return true;
      default:
        return false;
    }
  } catch {
    return false;
  }
}
