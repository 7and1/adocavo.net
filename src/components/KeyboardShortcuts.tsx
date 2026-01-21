"use client";

import { useEffect, useState } from "react";
import { Keyboard, X } from "lucide-react";

interface Shortcut {
  key: string;
  description: string;
  action: () => void;
}

const shortcuts: Shortcut[] = [
  {
    key: "?",
    description: "Show keyboard shortcuts",
    action: () => {},
  },
  {
    key: "c",
    description: "Focus on search",
    action: () => {
      const searchInput = document.querySelector(
        "input[type='search']",
      ) as HTMLInputElement;
      searchInput?.focus();
    },
  },
  {
    key: "n",
    description: "Generate new script",
    action: () => {
      const generateButton = document.querySelector(
        "[data-testid='generate-button']",
      ) as HTMLButtonElement;
      generateButton?.click();
    },
  },
  {
    key: "h",
    description: "Go to homepage",
    action: () => {
      window.location.href = "/";
    },
  },
  {
    key: "Escape",
    description: "Close modal/dialog",
    action: () => {
      const closeButton = document.querySelector(
        "[aria-label='Close']",
      ) as HTMLButtonElement;
      closeButton?.click();
    },
  },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "?" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }

      if (!open) return;

      const shortcut = shortcuts.find(
        (s) => s.key.toLowerCase() === e.key.toLowerCase(),
      );
      if (shortcut && e.key !== "?") {
        e.preventDefault();
        shortcut.action();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setOpen(false)}
      />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-shortcuts-title"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-gray-700" />
            <h2
              id="keyboard-shortcuts-title"
              className="text-lg font-semibold text-gray-900"
            >
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm text-gray-700">
                {shortcut.description}
              </span>
              <kbd className="px-2 py-1 text-xs font-mono font-medium text-gray-500 bg-gray-100 rounded border border-gray-200">
                {shortcut.key === "Escape" ? "Esc" : shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Press{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-gray-100 font-mono text-xs">
            Cmd
          </kbd>{" "}
          +{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-gray-100 font-mono text-xs">
            ?
          </kbd>{" "}
          to toggle
        </p>
      </div>
    </>
  );
}
