"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScriptForm } from "@/components/ScriptForm";
import { ToneSelector } from "@/components/ToneSelector";
import { GeneratedResults } from "@/components/GeneratedResults";
import { WaitlistModal } from "@/components/WaitlistModal";
import { GenerationProgress } from "@/components/GenerationProgress";
import { api } from "@/lib/client-api";
import { trackEvent } from "@/lib/analytics";
import type { Hook } from "@/lib/schema";
import { useFavorites } from "@/hooks/useFavorites";
import { useScriptGeneration } from "@/hooks/useScriptGeneration";
import type { RemixTone } from "@/lib/validations";

export interface ScriptGeneratorProps {
  hook: Hook;
  allowAnonymous?: boolean;
}

export function ScriptGenerator({
  hook,
  allowAnonymous = false,
}: ScriptGeneratorProps) {
  const { data: session } = useSession();

  const [productDescription, setProductDescription] = useState("");
  const [remixTone, setRemixTone] = useState<RemixTone>("default");
  const [remixInstruction, setRemixInstruction] = useState("");
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [justGenerated, setJustGenerated] = useState(false);
  const [ratings, setRatings] = useState<Record<number, number>>({});

  const { favoriteIds, toggleFavorite } = useFavorites();

  const {
    scripts,
    generationId,
    loading,
    error,
    progressStep,
    generate,
    regenerate,
    setError,
  } = useScriptGeneration({
    hookId: hook.id,
    allowAnonymous,
    onSuccess: () => {
      setJustGenerated(true);
    },
    onError: (errorMessage) => {
      if (
        errorMessage.includes("credits") ||
        errorMessage.includes("INSUFFICIENT_CREDITS")
      ) {
        setShowWaitlist(true);
      }
    },
  });

  const progressSteps = [
    {
      label: "Analyzing prompt",
      detail: "Understanding your product and audience",
    },
    {
      label: "Generating hook angles",
      detail: "Building scroll-stopping openings",
    },
    {
      label: "Polishing scripts",
      detail: "Refining tone and CTA",
    },
  ];

  const isValid =
    productDescription.length >= 20 && productDescription.length <= 500;

  const handleGenerate = useCallback(async () => {
    if (!isValid) return;

    await generate(
      productDescription,
      remixTone,
      remixInstruction.trim() || undefined,
    );
  }, [
    productDescription,
    remixTone,
    remixInstruction,
    isValid,
    generate,
  ]);

  const handleToggleFavorite = useCallback(async () => {
    if (!generationId) return;
    try {
      await toggleFavorite(generationId);
    } catch {
      setError("Unable to update favorites. Please try again.");
    }
  }, [generationId, toggleFavorite, setError]);

  const handleRate = useCallback(
    async (scriptIndex: number, rating: number) => {
      if (!generationId) return;
      setRatings((prev) => ({ ...prev, [scriptIndex]: rating }));
      try {
        await api.rateScript(generationId, { scriptIndex, rating });
        trackEvent("script_rate", { generationId, scriptIndex, rating });
      } catch {
        setError("Failed to save rating. Please try again.");
      }
    },
    [generationId, setError],
  );

  const canInteract = !!session?.user?.id;

  return (
    <div className="space-y-8 script-generator">
      <div className="p-6 rounded-xl bg-gradient-to-br from-primary-50 to-secondary-50 border border-primary-100 transition-all hover:shadow-md">
        <p className="text-sm text-primary-600 font-medium mb-2">
          Selected Hook
        </p>
        <blockquote className="text-xl font-semibold text-gray-900">
          &quot;{hook.text}&quot;
        </blockquote>
      </div>

      <ScriptForm
        value={productDescription}
        onChange={setProductDescription}
        error={error}
        minLength={20}
        maxLength={500}
        disabled={loading}
      />

      <ToneSelector
        tone={remixTone}
        onToneChange={setRemixTone}
        instruction={remixInstruction}
        onInstructionChange={setRemixInstruction}
        disabled={loading}
      />

      <Button
        onClick={handleGenerate}
        disabled={!isValid || loading}
        data-testid="generate-button"
        className="w-full h-12 text-lg gap-2 shadow-md hover:shadow-lg transition-shadow"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Generating Scripts...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            Generate 3 Script Variations
          </>
        )}
      </Button>

      {loading && (
        <GenerationProgress step={progressStep} steps={progressSteps} />
      )}

      {scripts && (
        <GeneratedResults
          scripts={scripts}
          generationId={generationId}
          favoriteIds={canInteract ? favoriteIds : undefined}
          ratings={canInteract ? ratings : undefined}
          onToggleFavorite={canInteract ? handleToggleFavorite : undefined}
          onRegenerate={canInteract ? regenerate : undefined}
          onRate={canInteract ? handleRate : undefined}
          shouldScroll={justGenerated}
        />
      )}

      <WaitlistModal open={showWaitlist} onOpenChange={setShowWaitlist} />
    </div>
  );
}
