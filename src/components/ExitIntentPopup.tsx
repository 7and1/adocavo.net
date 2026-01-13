"use client";

import { useEffect, useState } from "react";
import { X, Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function ExitIntentPopup() {
  const [open, setOpen] = useState(false);
  const dismissed = false; // Can be extended to track dismissed state

  useEffect(() => {
    const hasShown = localStorage.getItem("exit-intent-shown");
    const hasInteracted = sessionStorage.getItem("has-interacted");

    if (hasShown || !hasInteracted) {
      return;
    }

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !dismissed && !open) {
        setOpen(true);
        localStorage.setItem("exit-intent-shown", "true");
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [dismissed, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-intent-title"
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-6">
          <Gift className="h-8 w-8 text-white" />
        </div>

        <h2
          id="exit-intent-title"
          className="text-2xl font-bold text-gray-900 mb-3 text-center"
        >
          Wait! Don&apos;t Leave Empty-Handed
        </h2>

        <p className="text-gray-600 text-center mb-6">
          Get our top 10 performing TikTok hooks sent straight to your inbox.
          These are the exact patterns that have generated millions of views.
        </p>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 flex-shrink-0 mt-0.5">
              <span className="text-green-600 text-sm">✓</span>
            </div>
            <span className="text-sm text-gray-700">
              10 proven viral hook templates
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 flex-shrink-0 mt-0.5">
              <span className="text-green-600 text-sm">✓</span>
            </div>
            <span className="text-sm text-gray-700">
              Examples from real viral videos
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 flex-shrink-0 mt-0.5">
              <span className="text-green-600 text-sm">✓</span>
            </div>
            <span className="text-sm text-gray-700">
              Bonus: 3 script generation credits
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <Button asChild className="w-full gap-2" size="lg">
            <Link href="/auth/signin?email-capture=true">
              <Sparkles className="h-5 w-5" />
              Get My Free Hooks
            </Link>
          </Button>

          <button
            onClick={() => setOpen(false)}
            className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors py-2"
          >
            No thanks, I&apos;ll browse for now
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          No credit card required. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}
