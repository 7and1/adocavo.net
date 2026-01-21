"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api, ClientAPIError } from "@/lib/client-api";
import { trackEvent } from "@/lib/analytics";

export interface Script {
  angle: string;
  script: string;
}

export interface GenerationResult {
  scripts: Script[];
  generationId: string;
}

export interface UseScriptGenerationOptions {
  hookId: string;
  allowAnonymous?: boolean;
  onSuccess?: (result: GenerationResult) => void;
  onError?: (error: string) => void;
}

export interface UseScriptGenerationReturn {
  scripts: Script[] | null;
  generationId: string | null;
  loading: boolean;
  error: string | null;
  progressStep: number;
  generate: (
    productDescription: string,
    remixTone?: string,
    remixInstruction?: string,
    turnstileToken?: string,
  ) => Promise<void>;
  regenerate: (angle: string) => Promise<void>;
  setError: (error: string | null) => void;
  clearScripts: () => void;
}

export function useScriptGeneration({
  hookId,
  allowAnonymous = true,
  onSuccess,
  onError,
}: UseScriptGenerationOptions): UseScriptGenerationReturn {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [scripts, setScripts] = useState<Script[] | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState(0);

  const generate = useCallback(
    async (
      productDescription: string,
      remixTone?: string,
      remixInstruction?: string,
      turnstileToken?: string,
    ) => {
      const hasUser = !!session?.user?.id;
      if (!hasUser && !allowAnonymous) {
        return;
      }

      const isGuest = !hasUser && allowAnonymous;

      setLoading(true);
      setError(null);
      setScripts(null);
      setGenerationId(null);

      try {
        trackEvent("generate_start", {
          hookId,
          remixTone,
        });

        const result = await api.generate(
          hookId,
          productDescription.trim(),
          remixTone,
          remixInstruction?.trim(),
          turnstileToken,
        );

        setScripts(result.scripts);
        setGenerationId(result.generationId);

        trackEvent("generate_success", {
          hookId,
          generationId: result.generationId,
          remixTone,
        });

        onSuccess?.(result);
        await update?.();
        router.refresh();
      } catch (err) {
        let errorMessage =
          err instanceof ClientAPIError
            ? err.message
            : "Something went wrong. Please try again.";

        if (err instanceof ClientAPIError && isGuest) {
          if (err.code === "RATE_LIMIT_EXCEEDED") {
            errorMessage =
              "Free usage limit reached. Please try again later.";
          } else if (err.isAuthError) {
            errorMessage = "Verification required to continue.";
          }
        }

        trackEvent("generate_error", {
          hookId,
          code: err instanceof ClientAPIError ? err.code : "unknown",
        });

        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [allowAnonymous, hookId, onError, onSuccess, router, session, update],
  );

  const regenerate = useCallback(
    async (angle: string) => {
      if (!generationId) return;

      try {
        const result = await api.regenerate(generationId, angle);
        setScripts((prev) => {
          if (!prev) return prev;
          const next = [...prev];
          const index = next.findIndex((s) => s.angle === angle);
          if (index >= 0) {
            next[index] = result.script;
          }
          return next;
        });

        trackEvent("script_regenerate", { generationId, angle });
        await update?.();
        router.refresh();
      } catch (err) {
        const errorMessage =
          err instanceof ClientAPIError ? err.message : "Failed to regenerate.";

        trackEvent("script_regenerate_error", { generationId, angle });
        setError(errorMessage);
        onError?.(errorMessage);
      }
    },
    [generationId, update, router, onError],
  );

  const clearScripts = useCallback(() => {
    setScripts(null);
    setGenerationId(null);
    setError(null);
  }, []);

  // Progress step animation
  useEffect(() => {
    if (!loading) {
      setProgressStep(0);
      return;
    }

    const timers = [
      setTimeout(() => setProgressStep(1), 1400),
      setTimeout(() => setProgressStep(2), 3200),
    ];

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [loading]);

  return {
    scripts,
    generationId,
    loading,
    error,
    progressStep,
    generate,
    regenerate,
    setError,
    clearScripts,
  };
}
