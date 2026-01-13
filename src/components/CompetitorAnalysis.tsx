"use client";

import { useState } from "react";
import { AlertCircle, Copy, Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GenerationProgress } from "@/components/GenerationProgress";
import { api, ClientAPIError } from "@/lib/client-api";

interface AnalysisResult {
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

const steps = [
  {
    label: "Fetching TikTok ad",
    detail: "Loading the video metadata and caption",
  },
  {
    label: "Extracting transcript",
    detail: "Pulling subtitles or transcribing audio",
  },
  {
    label: "Template-izing script",
    detail: "Turning it into a reusable framework",
  },
];

export function CompetitorAnalysis() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!url.trim()) {
      setError("Please paste a TikTok URL to analyze.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setStep(0);

    const timerOne = setTimeout(() => setStep(1), 1200);
    const timerTwo = setTimeout(() => setStep(2), 3200);

    try {
      const response = await api.analyzeUrl(url.trim());
      setResult(response);
    } catch (err) {
      if (err instanceof ClientAPIError) {
        setError(err.message);
      } else {
        setError("Unable to analyze that URL. Please try again.");
      }
    } finally {
      clearTimeout(timerOne);
      clearTimeout(timerTwo);
      setLoading(false);
    }
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold mb-2">Competitor Analysis</h1>
        <p className="text-gray-600 mb-6">
          Paste a TikTok ad URL and we&apos;ll extract the transcript, highlight
          the hook, and turn it into a reusable script template.
        </p>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.tiktok.com/@brand/video/123..."
              className="pl-10"
              disabled={loading}
            />
          </div>
          <Button type="submit" className="h-11" disabled={loading}>
            {loading ? "Analyzing..." : "Analyze URL"}
          </Button>
        </form>
        {error && (
          <div
            className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </section>

      {loading && <GenerationProgress step={step} steps={steps} />}

      {result && (
        <div className="space-y-6">
          <section className="rounded-2xl border bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-sm text-gray-500">Source</p>
                <p className="text-lg font-semibold">
                  {result.title || "TikTok Ad"}
                </p>
                {result.author && (
                  <p className="text-sm text-gray-500">@{result.author}</p>
                )}
              </div>
              <div className="text-xs text-gray-500">
                Transcript source: {result.transcriptSource}
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
              {result.transcript}
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copy(result.transcript, "transcript")}
              >
                {copied === "transcript" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="ml-2">Copy transcript</span>
              </Button>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white p-6">
              <h2 className="text-lg font-semibold mb-3">Hook</h2>
              <p className="text-gray-700 text-base">“{result.hook}”</p>
            </div>
            <div className="rounded-2xl border bg-white p-6">
              <h2 className="text-lg font-semibold mb-3">CTA</h2>
              <p className="text-gray-700 text-base">
                {result.cta || "CTA not detected"}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Structure breakdown</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {result.structure.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {item.label}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{item.summary}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Reusable template</h2>
            <div className="space-y-3">
              {result.template.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">
                      {item.label}
                    </p>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
                      onClick={() => copy(item.script, item.label)}
                    >
                      {copied === item.label ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      Copy
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
                    {item.script}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {result.notes && result.notes.length > 0 && (
            <section className="rounded-2xl border bg-white p-6">
              <h2 className="text-lg font-semibold mb-3">Strategic notes</h2>
              <ul className="space-y-2 text-sm text-gray-600">
                {result.notes.map((note) => (
                  <li key={note}>• {note}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
