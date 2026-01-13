import { z } from "zod";
import { nanoid } from "nanoid";
import { createDb } from "@/lib/db";
import { competitorAnalyses } from "@/lib/schema";
import {
  ANALYSIS_SYSTEM_PROMPT,
  buildAnalysisPrompt,
} from "@/lib/analysis-prompts";
import { logError } from "@/lib/logger";

const analysisSchema = z.object({
  hook: z.string().min(3),
  structure: z
    .array(z.object({ label: z.string().min(2), summary: z.string().min(3) }))
    .min(3),
  template: z
    .array(z.object({ label: z.string().min(2), script: z.string().min(3) }))
    .min(3),
  cta: z.string().optional(),
  notes: z.array(z.string()).optional(),
});

const TRANSCRIBE_MODEL =
  process.env.AI_TRANSCRIBE_MODEL || "@cf/openai/whisper-large-v3-turbo";
const TRANSCRIBE_ENABLED =
  (process.env.AI_TRANSCRIBE || "false").toLowerCase() === "true";
const MAX_TRANSCRIBE_BYTES =
  Number(process.env.AI_TRANSCRIBE_MAX_BYTES) || 12_000_000;

export interface CompetitorAnalysisResult {
  id: string;
  tiktokUrl: string;
  title?: string | null;
  author?: string | null;
  transcript: string;
  transcriptSource: string;
  hook: string;
  structure: Array<{ label: string; summary: string }>;
  template: Array<{ label: string; script: string }>;
  cta?: string;
  notes?: string[];
  createdAt: string;
}

export interface AnalyzeInput {
  userId: string;
  url: string;
}

export async function analyzeTikTokUrl(
  ai: Ai,
  d1: D1Database,
  input: AnalyzeInput,
): Promise<
  | { success: true; result: CompetitorAnalysisResult }
  | { success: false; error: string }
> {
  const db = createDb(d1);
  try {
    const metadata = await fetchTikTokMetadata(input.url, ai);

    if (!metadata.transcript) {
      return { success: false, error: "TRANSCRIPT_NOT_FOUND" };
    }

    const prompt = buildAnalysisPrompt({
      transcript: metadata.transcript,
      caption: metadata.caption,
      title: metadata.title,
      author: metadata.author,
      source: metadata.transcriptSource,
    });

    const response = await ai.run("@cf/meta/llama-3.1-70b-instruct", {
      messages: [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.35,
      max_tokens: 1200,
    });

    const content = String(response.response || "");
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: "INVALID_AI_RESPONSE" };
    }

    const parsed = analysisSchema.safeParse(JSON.parse(jsonMatch[0]));
    if (!parsed.success) {
      return { success: false, error: "INVALID_AI_RESPONSE" };
    }

    const id = nanoid();
    const createdAt = new Date().toISOString();

    await db.insert(competitorAnalyses).values({
      id,
      userId: input.userId,
      tiktokUrl: metadata.canonicalUrl,
      title: metadata.title,
      author: metadata.author,
      transcript: metadata.transcript,
      transcriptSource: metadata.transcriptSource,
      hook: parsed.data.hook,
      structure: JSON.stringify(parsed.data.structure),
      template: JSON.stringify(parsed.data.template),
      cta: parsed.data.cta ?? null,
      notes: JSON.stringify(parsed.data.notes ?? []),
    });

    return {
      success: true,
      result: {
        id,
        tiktokUrl: metadata.canonicalUrl,
        title: metadata.title,
        author: metadata.author,
        transcript: metadata.transcript,
        transcriptSource: metadata.transcriptSource,
        hook: parsed.data.hook,
        structure: parsed.data.structure,
        template: parsed.data.template,
        cta: parsed.data.cta,
        notes: parsed.data.notes,
        createdAt,
      },
    };
  } catch (error) {
    logError("Competitor analysis failed", error, { url: input.url });
    return { success: false, error: "ANALYSIS_FAILED" };
  }
}

interface TikTokMetadata {
  canonicalUrl: string;
  title?: string | null;
  author?: string | null;
  caption?: string | null;
  transcript?: string | null;
  transcriptSource: string;
  videoUrl?: string | null;
}

async function fetchTikTokMetadata(
  url: string,
  ai: Ai,
): Promise<TikTokMetadata> {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "accept-language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch TikTok page (${response.status})`);
  }

  const html = await response.text();
  const canonicalUrl = response.url || url;
  const json = extractTikTokJson(html);
  const item = extractItemData(json);

  const subtitleUrl = item.subtitleUrl;
  let transcript = "";
  let transcriptSource = "caption";

  if (subtitleUrl) {
    const subtitleText = await fetchSubtitleText(subtitleUrl);
    if (subtitleText) {
      transcript = subtitleText;
      transcriptSource = "subtitles";
    }
  }

  if (!transcript && item.caption) {
    transcript = item.caption;
    transcriptSource = "caption";
  }

  if (!transcript && item.videoUrl && TRANSCRIBE_ENABLED) {
    const transcribed = await transcribeWithAi(ai, item.videoUrl);
    if (transcribed) {
      transcript = transcribed;
      transcriptSource = "whisper";
    }
  }

  return {
    canonicalUrl,
    title: item.title,
    author: item.author,
    caption: item.caption,
    transcript: transcript || null,
    transcriptSource,
    videoUrl: item.videoUrl,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTikTokJson(html: string): any {
  const sigiMatch = html.match(
    /<script id="SIGI_STATE" type="application\/json">([\s\S]*?)<\/script>/i,
  );
  if (sigiMatch) {
    try {
      return JSON.parse(sigiMatch[1]);
    } catch {
      // fall through
    }
  }

  const universalMatch = html.match(
    /__UNIVERSAL_DATA_FOR_REHYDRATION__\s*=\s*(\{[\s\S]*?\})\s*<\/script>/i,
  );
  if (universalMatch) {
    try {
      return JSON.parse(universalMatch[1]);
    } catch {
      // fall through
    }
  }

  return {};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractItemData(json: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidates: any[] = [];

  if (json?.ItemModule) {
    candidates.push(...Object.values(json.ItemModule));
  }

  if (json?.__DEFAULT_SCOPE__?.webapp?.itemModule) {
    candidates.push(...Object.values(json.__DEFAULT_SCOPE__.webapp.itemModule));
  }

  if (json?.__DEFAULT_SCOPE__?.webapp?.itemInfo?.itemStruct) {
    candidates.push(json.__DEFAULT_SCOPE__.webapp.itemInfo.itemStruct);
  }

  const item = candidates.find((entry) => entry && (entry.desc || entry.video));
  const video = item?.video || item?.videoInfo || {};

  return {
    title: item?.desc || item?.title || null,
    author:
      item?.author ||
      item?.authorNickname ||
      item?.authorName ||
      item?.authorInfo?.nickname ||
      null,
    caption: item?.desc || null,
    subtitleUrl: pickSubtitleUrl(video?.subtitleInfos || item?.subtitleInfos),
    videoUrl: pickVideoUrl(video),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickSubtitleUrl(subtitleInfos: any): string | null {
  if (!Array.isArray(subtitleInfos)) return null;
  const preferred = subtitleInfos.find((sub) =>
    String(sub?.Language || sub?.language || "")
      .toLowerCase()
      .includes("en"),
  );
  const candidate = preferred || subtitleInfos[0];
  return candidate?.Url || candidate?.url || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickVideoUrl(video: any): string | null {
  const playAddr = video?.playAddr || video?.downloadAddr || null;
  if (!playAddr) return null;
  if (typeof playAddr === "string") return playAddr;
  if (Array.isArray(playAddr?.urlList) && playAddr.urlList.length > 0) {
    return playAddr.urlList[0];
  }
  if (Array.isArray(playAddr?.UrlList) && playAddr.UrlList.length > 0) {
    return playAddr.UrlList[0];
  }
  return null;
}

async function fetchSubtitleText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) return null;
    const vtt = await response.text();
    return parseVtt(vtt);
  } catch {
    return null;
  }
}

function parseVtt(vtt: string): string {
  return vtt
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (trimmed === "WEBVTT") return false;
      if (/^\d+$/.test(trimmed)) return false;
      if (trimmed.includes("-->")) return false;
      return true;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

async function transcribeWithAi(ai: Ai, videoUrl: string) {
  try {
    const response = await fetch(videoUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) return null;

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength && contentLength > MAX_TRANSCRIBE_BYTES) {
      return null;
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_TRANSCRIBE_BYTES) return null;

    const audio = Buffer.from(buffer).toString("base64");
    const result = await ai.run(TRANSCRIBE_MODEL, {
      audio,
      task: "transcribe",
      language: "en",
    });

    const text =
      (result as { text?: string })?.text ||
      (result as { result?: { text?: string } })?.result?.text ||
      "";

    return text.trim() || null;
  } catch {
    return null;
  }
}
