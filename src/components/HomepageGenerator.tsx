"use client";

import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import type { Hook } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { ScriptGenerator } from "@/components/ScriptGenerator";

export interface HomepageGeneratorProps {
  hooks: Hook[];
}

function formatHookLabel(hook: Hook) {
  const text =
    hook.text.length > 90 ? `${hook.text.slice(0, 90).trim()}...` : hook.text;
  return `${hook.category.toUpperCase()} - ${text}`;
}

export function HomepageGenerator({ hooks }: HomepageGeneratorProps) {
  const initialHookId = hooks[0]?.id ?? "";
  const [selectedHookId, setSelectedHookId] = useState(initialHookId);

  // Properly handle empty hooks array - selectedHook will be undefined if hooks is empty
  const selectedHook = useMemo(
    () => hooks.find((hook) => hook.id === selectedHookId),
    [hooks, selectedHookId],
  );

  const handleRandom = () => {
    if (hooks.length === 0) return;
    const next = hooks[Math.floor(Math.random() * hooks.length)];
    setSelectedHookId(next.id);
  };

  if (!selectedHook) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Generate scripts instantly
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Initializing hook selection...
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-primary-200 bg-white p-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-primary-600 font-semibold">
            Free access
          </p>
          <h2 className="text-xl font-bold text-gray-900">
            Generate scripts instantly
          </h2>
        </div>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          Captcha verification required
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <label
          htmlFor="hook-select"
          className="text-sm font-medium text-gray-700"
        >
          Choose a hook
        </label>
        <div className="flex flex-wrap gap-2">
          <select
            id="hook-select"
            value={selectedHookId}
            onChange={(event) => setSelectedHookId(event.target.value)}
            className="flex-1 min-w-[220px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {hooks.map((hook) => (
              <option key={hook.id} value={hook.id}>
                {formatHookLabel(hook)}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRandom}
            className="gap-2"
          >
            <Shuffle className="h-4 w-4" aria-hidden="true" />
            Random
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          Complete the verification below to run a generation.
        </p>
      </div>

      <div className="mt-6">
        <ScriptGenerator
          hook={selectedHook}
          allowAnonymous
          key={selectedHook.id}
        />
      </div>
    </div>
  );
}
