const ANALYSIS_SYSTEM_PROMPT = `You are a TikTok ad creative strategist.

Goal:
- Turn a competitor TikTok ad transcript into a reusable script template.
- Identify the core hook, structure beats, and CTA.

Rules:
- Output ONLY valid JSON. No markdown or extra text.
- Keep language practical and UGC-native.
- Use placeholders like {product}, {pain}, {result}, {price}.
- Keep each template section concise (1-2 lines).

Return JSON with this exact structure:
{
  "hook": "...",
  "structure": [
    { "label": "Hook", "summary": "..." },
    { "label": "Problem", "summary": "..." },
    { "label": "Solution", "summary": "..." },
    { "label": "Proof", "summary": "..." },
    { "label": "CTA", "summary": "..." }
  ],
  "template": [
    { "label": "Hook", "script": "..." },
    { "label": "Problem", "script": "..." },
    { "label": "Solution", "script": "..." },
    { "label": "Proof", "script": "..." },
    { "label": "CTA", "script": "..." }
  ],
  "cta": "...",
  "notes": ["..."]
}`;

function sanitizeInput(input: string, maxLength = 4000) {
  if (!input) return "";
  return input
    .replace(/<script[^>]*>/gi, "")
    .replace(/<\/script>/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function buildAnalysisPrompt(params: {
  transcript: string;
  caption?: string | null;
  title?: string | null;
  author?: string | null;
  source?: string | null;
}) {
  const transcript = sanitizeInput(params.transcript, 4000);
  const caption = sanitizeInput(params.caption || "", 800);
  const title = sanitizeInput(params.title || "", 200);
  const author = sanitizeInput(params.author || "", 120);

  return `COMPETITOR AD DETAILS:
Title: ${title || "Unknown"}
Author: ${author || "Unknown"}
Source: ${params.source || "TikTok"}

Transcript:
${transcript}

${
  caption
    ? `Caption:
${caption}

`
    : ""
}Generate the template.`;
}

export { ANALYSIS_SYSTEM_PROMPT };
