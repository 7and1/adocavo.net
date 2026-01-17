# Export Feature Implementation

## Overview

Comprehensive export functionality for TikTok video scripts with multiple format support.

## Supported Formats

### 1. **Copy to Clipboard** (`copy-all`)

- Copies all scripts as formatted plain text
- Includes metadata (title, description, timestamp)
- Visual/audio cues preserved
- Instant feedback with checkmark icon

### 2. **Notion Format** (`notion`)

- Notion-compatible markdown
- Code blocks for script content
- Callouts for visual/audio cues
- Optimized for direct paste into Notion

### 3. **TXT Download** (`txt`)

- Clean plain text file
- Professional formatting with separators
- Includes all metadata
- Filename: `tiktok-scripts-{timestamp}.txt`

### 4. **JSON Download** (`json`)

- Structured data format
- Includes metadata and timestamps
- Array of script objects
- Filename: `tiktok-scripts-{timestamp}.json`

### 5. **PDF Download** (`pdf`)

- Professional PDF with jsPDF
- Formatted headers and sections
- Automatic page breaks
- Footer with attribution
- Filename: `tiktok-scripts-{timestamp}.pdf`

### 6. **Email Share** (`email`)

- Opens default email client
- Pre-filled subject line
- Formatted body content
- Mailto link generation

## File Structure

```
src/lib/export/
├── index.ts           # Main export router
├── types.ts           # TypeScript interfaces
├── txt-exporter.ts    # TXT, JSON, copy-all, email
├── pdf-exporter.ts    # PDF generation
└── notion-formatter.ts # Notion markdown

src/components/
└── ExportButton.tsx   # UI component with dropdown
```

## API Usage

```typescript
import { exportScripts } from "@/lib/export";
import type { ExportData } from "@/lib/export";

const data: ExportData = {
  title: "My TikTok Scripts",
  description: "Product description",
  scripts: [
    {
      angle: "Hook-driven",
      script: "Script content...",
      index: 0,
    },
  ],
  generatedAt: new Date(),
};

// Export to any format
await exportScripts(data, "pdf");
await exportScripts(data, "json");
await exportScripts(data, "notion");
await exportScripts(data, "email");
```

## Component Usage

```tsx
import { ExportButton } from "@/components/ExportButton";

<ExportButton
  data={exportData}
  trackingId="generation-123"
  size="sm"
  variant="outline"
/>;
```

## Features

### Responsive Design

- Mobile-friendly dropdown
- Touch-optimized buttons
- Adaptive sizing

### Loading States

- Spinner during PDF generation
- Disabled state while exporting
- Visual feedback for copy operations

### Error Handling

- Graceful fallback on clipboard errors
- Silent failure handling
- User-friendly error messages

### Accessibility

- ARIA labels and roles
- Keyboard navigation
- Screen reader support
- Focus management

## Testing

All export formats tested:

- ✅ TXT file generation
- ✅ JSON file generation
- ✅ Clipboard copy (plain text)
- ✅ Clipboard copy (Notion format)
- ✅ Email client integration
- ✅ PDF generation
- ✅ Format validation

Run tests:

```bash
pnpm test tests/unit/lib/export.test.ts
```

## Dependencies

- `jspdf`: PDF generation
- `lucide-react`: Icons
- Native Clipboard API: Copy operations
- Native Blob/File API: Downloads

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support

## Analytics

Export events tracked with format:

```typescript
trackEvent("script_export", {
  format: "pdf",
  trackingId: "generation-123",
  scriptCount: 3,
});
```

## Future Enhancements

- Word/DOCX export
- Google Docs integration
- Cloud storage export (Dropbox, GDrive)
- Export history
- Custom templates
