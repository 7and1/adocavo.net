"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
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
  const { data: session } = useSession();
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

  const isGuest = !session?.user?.id;
  const creditsLabel =
    session?.user?.credits != null ? `${session.user.credits} credits` : null;

  // Handle empty hooks array with friendly UI
  if (hooks.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            No hooks available
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            We&apos;re unable to load hooks at the moment. Please refresh the
            page or try again later.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
            aria-label="Refresh page to load hooks"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

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
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            {isGuest ? "Guest mode" : "Signed in"}
          </p>
          <h2 className="text-lg font-semibold text-gray-900">
            Generate scripts instantly
          </h2>
        </div>
        <span className="text-xs font-medium text-gray-500">
          {isGuest
            ? "3 generations/day"
            : (creditsLabel ?? "Credits available")}
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
        {isGuest && (
          <p className="text-xs text-gray-500">
            Want more than 3/day?{" "}
            <Link href="/auth/signin" className="text-primary-600 underline">
              Sign in
            </Link>{" "}
            for extra credits.
          </p>
        )}
      </div>

      <div className="mt-6">
        {/* selectedHook is guaranteed to be defined here due to early return above */}
        <ScriptGenerator
          hook={selectedHook!}
          allowAnonymous
          key={selectedHook!.id}
        />
      </div>
    </div>
  );
}
