"use client";

import { useState, useCallback, useRef } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

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
    },
    [onChange],
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
