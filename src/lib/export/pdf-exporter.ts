/**
 * PDF Exporter
 * Exports script data as PDF using jsPDF
 */

import type { ExportData } from "./types";

interface PDFExporterOptions {
  filename?: string;
  includeTimestamp?: boolean;
  includeDescription?: boolean;
}

/**
 * Loads jsPDF dynamically
 */
async function loadJsPDF() {
  const mod = await import("jspdf");
  return mod.default;
}

/**
 * Formats script with visual/audio cues highlighted
 */
function formatScriptText(script: string): string {
  return script
    .replace(/\[Visual:([^\]]+)\]/g, "\n[Visual: $1]\n")
    .replace(/\(Audio:([^)]+)\)/g, "\n(Audio: $1)\n");
}

/**
 * Exports data as PDF
 */
export async function exportToPDF(
  data: ExportData,
  options: PDFExporterOptions = {},
): Promise<void> {
  const jsPDF = await loadJsPDF();

  const {
    filename,
    includeTimestamp = true,
    includeDescription = true,
  } = options;

  const defaultFilename = `tiktok-scripts-${Date.now()}.pdf`;
  const finalFilename = filename || defaultFilename;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let yPosition = margin;

  // Helper to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }
  };

  // Title
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  const titleLines = pdf.splitTextToSize(data.title, maxWidth);
  titleLines.forEach((line: string) => {
    checkPageBreak(10);
    pdf.text(line, margin, yPosition);
    yPosition += 8;
  });
  yPosition += 5;

  // Timestamp
  if (includeTimestamp && data.generatedAt) {
    checkPageBreak(10);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `Generated: ${data.generatedAt.toLocaleString()}`,
      margin,
      yPosition,
    );
    yPosition += 10;
  }

  // Description
  if (includeDescription && data.description) {
    checkPageBreak(15);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("Product Description:", margin, yPosition);
    yPosition += 7;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const descLines = pdf.splitTextToSize(data.description, maxWidth);
    descLines.forEach((line: string) => {
      checkPageBreak(7);
      pdf.text(line, margin, yPosition);
      yPosition += 5;
    });
    yPosition += 5;
  }

  // Scripts
  data.scripts.forEach(({ angle, script, index }) => {
    checkPageBreak(20);

    // Script header
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${angle} - Variation ${index + 1}`, margin, yPosition);
    yPosition += 8;

    // Script content
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");

    const formattedScript = formatScriptText(script);
    const lines = pdf.splitTextToSize(formattedScript, maxWidth);

    lines.forEach((line: string) => {
      checkPageBreak(7);
      pdf.text(line, margin, yPosition);
      yPosition += 5;
    });

    yPosition += 5;
  });

  // Footer
  const pageCount = pdf.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "italic");
    pdf.text("Generated with Adocavo.net", pageWidth / 2, pageHeight - 10, {
      align: "center",
    });
  }

  pdf.save(finalFilename);
}
