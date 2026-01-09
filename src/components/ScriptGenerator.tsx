"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Sparkles, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScriptDisplay } from "@/components/ScriptDisplay";
import { WaitlistModal } from "@/components/WaitlistModal";
import { api, ClientAPIError } from "@/lib/client-api";
import type { Hook } from "@/lib/schema";

interface Script {
  angle: string;
  script: string;
}

export interface ScriptGeneratorProps {
  hook: Hook;
}

export function ScriptGenerator({ hook }: ScriptGeneratorProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const [productDescription, setProductDescription] = useState("");
  const [scripts, setScripts] = useState<Script[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [touched, setTouched] = useState(false);
  const [justGenerated, setJustGenerated] = useState(false);

  const charCount = productDescription.length;
  const isValid = charCount >= 20 && charCount <= 500;
  const showValidationError = touched && charCount > 0 && charCount < 20;

  const getCharCountColor = () => {
    if (charCount > 500) return "text-red-500";
    if (charCount < 20 && charCount > 0) return "text-amber-500";
    if (isValid) return "text-green-600";
    return "text-gray-500";
  };

  const getCharCountLabel = () => {
    if (charCount >= 500) return "Maximum reached";
    if (isValid) return "Good length";
    if (charCount < 20 && charCount > 0) return "Too short";
    return "Minimum 20 characters";
  };

  const handleGenerate = useCallback(async () => {
    if (!session) {
      router.push(`/auth/signin?callbackUrl=/remix/${hook.id}`);
      return;
    }

    setTouched(true);
    if (!isValid) return;

    setLoading(true);
    setError(null);
    setScripts(null);
    setJustGenerated(false);

    try {
      const result = await api.generate(hook.id, productDescription);
      setScripts(result.scripts);
      setJustGenerated(true);
      router.refresh();
    } catch (err) {
      if (err instanceof ClientAPIError) {
        if (err.isCreditsError) {
          setShowWaitlist(true);
        } else {
          setError(err.message);
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [session, router, hook.id, productDescription, isValid]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleGenerate();
      }
    },
    [handleGenerate],
  );

  // Scroll to scripts when generated
  useEffect(() => {
    if (justGenerated && scripts) {
      const element = document.getElementById("generated-scripts");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setJustGenerated(false);
    }
  }, [justGenerated, scripts]);

  return (
    <div className="space-y-8">
      <div className="p-6 rounded-xl bg-gradient-to-br from-primary-50 to-secondary-50 border border-primary-100 transition-all hover:shadow-md">
        <p className="text-sm text-primary-600 font-medium mb-2">
          Selected Hook
        </p>
        <blockquote className="text-xl font-semibold text-gray-900">
          &quot;{hook.text}&quot;
        </blockquote>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
          <label
            htmlFor="product-description"
            className="text-sm font-medium text-gray-700"
          >
            Describe your product or service
            <span className="text-red-500 ml-1" aria-hidden="true">
              *
            </span>
          </label>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${getCharCountColor()}`}>
              {charCount}/500
            </span>
            <span className={`text-xs ${getCharCountColor()}`}>
              {getCharCountLabel()}
            </span>
          </div>
        </div>

        <div className="relative">
          <Textarea
            id="product-description"
            data-testid="product-input"
            placeholder="e.g., A portable blender that charges via USB and can make smoothies in 30 seconds. Perfect for gym-goers and busy professionals. Costs $29.99."
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            onBlur={() => setTouched(true)}
            onKeyDown={handleKeyDown}
            rows={4}
            maxLength={500}
            aria-describedby={
              error
                ? "input-error"
                : showValidationError
                  ? "validation-error"
                  : "input-hint"
            }
            aria-invalid={showValidationError || !!error}
            className={
              showValidationError
                ? "border-amber-300 focus:border-amber-400 focus:ring-amber-500"
                : ""
            }
          />
          {isValid && (
            <CheckCircle2
              className="absolute right-3 bottom-3 h-5 w-5 text-green-500"
              aria-hidden="true"
            />
          )}
        </div>

        <p id="input-hint" className="text-sm text-gray-500">
          Include key features, benefits, price point, and target audience for
          best results.
          <span className="hidden sm:inline">
            {" "}
            Press{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 text-xs font-mono">
              Cmd+Enter
            </kbd>{" "}
            to generate.
          </span>
        </p>

        {showValidationError && (
          <div
            id="validation-error"
            className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 text-amber-700"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm">
              Please enter at least 20 characters for best results.
            </p>
          </div>
        )}

        {error && (
          <div
            id="input-error"
            className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

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

      {scripts && (
        <div
          id="generated-scripts"
          className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Your Scripts
            </h2>
            <span className="text-sm text-gray-500">
              3 variations generated
            </span>
          </div>
          <div className="grid gap-4 md:gap-6 lg:grid-cols-3 xl:grid-cols-3">
            {scripts.map((script, index) => (
              <ScriptDisplay key={index} script={script} index={index} />
            ))}
          </div>
        </div>
      )}

      <WaitlistModal open={showWaitlist} onOpenChange={setShowWaitlist} />
    </div>
  );
}
