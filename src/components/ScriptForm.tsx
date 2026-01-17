"use client";

import { useState, useCallback, useRef } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Link2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client-api";

export interface ScriptFormProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  minLength?: number;
  maxLength?: number;
  disabled?: boolean;
}

export function ScriptForm({
  value,
  onChange,
  error,
  minLength = 20,
  maxLength = 500,
  disabled = false,
}: ScriptFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [touched, setTouched] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const charCount = value.length;
  const isValid = charCount >= minLength && charCount <= maxLength;
  const showValidationError = touched && charCount > 0 && charCount < minLength;

  const getCharCountColor = () => {
    if (charCount > maxLength) return "text-red-500";
    if (charCount < minLength && charCount > 0) return "text-amber-500";
    if (isValid) return "text-green-600";
    return "text-gray-500";
  };

  const getCharCountLabel = () => {
    if (charCount >= maxLength) return "Maximum reached";
    if (isValid) return "Good length";
    if (charCount < minLength && charCount > 0) return "Too short";
    return `Minimum ${minLength} characters`;
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        // Trigger parent's generate via custom event
        const form = e.currentTarget.closest("form");
        if (form) {
          const submitEvent = new Event("submit", {
            bubbles: true,
            cancelable: true,
          });
          form.dispatchEvent(submitEvent);
        }
      }
    },
    [],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      setFetchError(null);
    },
    [onChange],
  );

  const handleFetchFromUrl = useCallback(async () => {
    if (!urlInput.trim()) return;

    setIsFetching(true);
    setFetchError(null);
    setAiAnalysis(null);

    try {
      const result = await api.analyzeProductUrl(urlInput.trim());
      onChange(result.formatted);
      if (result.aiAnalysis) {
        setAiAnalysis(result.aiAnalysis);
      }
      setUrlInput("");
      setShowUrlInput(false);
    } catch (err) {
      if (err instanceof Error) {
        setFetchError(err.message);
      } else {
        setFetchError("Failed to fetch product information");
      }
    } finally {
      setIsFetching(false);
    }
  }, [urlInput, onChange]);

  const handleUrlKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !isFetching) {
        e.preventDefault();
        handleFetchFromUrl();
      }
    },
    [isFetching, handleFetchFromUrl],
  );

  return (
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
            {charCount}/{maxLength}
          </span>
          <span className={`text-xs ${getCharCountColor()}`}>
            {getCharCountLabel()}
          </span>
        </div>
      </div>

      {showUrlInput ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="Paste product URL (TikTok, Amazon, Shopify, or any website)"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={handleUrlKeyDown}
              disabled={isFetching || disabled}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={handleFetchFromUrl}
              disabled={!urlInput.trim() || isFetching || disabled}
              variant="default"
              size="default"
              className="gap-2"
            >
              {isFetching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Fetch
                </>
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowUrlInput(false);
                setUrlInput("");
                setFetchError(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
              disabled={disabled}
            >
              Cancel
            </button>
            <span className="text-xs text-gray-400">
              Supports TikTok, Amazon, Shopify stores, and generic websites
            </span>
          </div>
          {fetchError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{fetchError}</p>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowUrlInput(true)}
          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
          disabled={disabled}
        >
          <Link2 className="h-4 w-4" />
          Import from URL (TikTok, Amazon, etc.)
        </button>
      )}

      {aiAnalysis && (
        <div className="flex gap-2 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200">
          <Sparkles className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-purple-700 mb-1">
              AI-Generated Selling Points:
            </p>
            <p className="text-sm text-gray-700">{aiAnalysis}</p>
          </div>
        </div>
      )}

      <div className="relative">
        <Textarea
          ref={textareaRef}
          id="product-description"
          data-testid="product-input"
          placeholder="e.g., A portable blender that charges via USB and can make smoothies in 30 seconds. Perfect for gym-goers and busy professionals. Costs $29.99."
          value={value}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          onKeyDown={handleKeyDown}
          rows={4}
          maxLength={maxLength}
          disabled={disabled}
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
            Please enter at least {minLength} characters for best results.
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
  );
}
