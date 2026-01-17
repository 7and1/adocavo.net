export type ExportFormat =
  | "pdf"
  | "notion"
  | "txt"
  | "json"
  | "copy-all"
  | "email";

export interface ExportData {
  title: string;
  description?: string;
  scripts: Array<{
    angle: string;
    script: string;
    index: number;
  }>;
  generatedAt?: Date;
}

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeTimestamp?: boolean;
  includeDescription?: boolean;
}

export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  error?: string;
}
