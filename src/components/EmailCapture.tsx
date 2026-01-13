"use client";

import { useState } from "react";
import { Mail, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackEvent } from "@/lib/analytics";

interface EmailCaptureProps {
  onCapture?: (email: string) => void;
  onSkip?: () => void;
  context?: "generate" | "browse";
}

export function EmailCapture({
  onCapture,
  onSkip,
  context = "browse",
}: EmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sourceUrl: window.location.pathname }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to join waitlist");
      }

      setSuccess(true);
      trackEvent("email_captured", { context });
      onCapture?.(email);

      // Auto-dismiss after success
      setTimeout(() => {
        setDismissed(true);
      }, 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    trackEvent("email_capture_skipped", { context });
    setDismissed(true);
    onSkip?.();
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-medium text-green-900">
              You&apos;re on the list!
            </p>
            <p className="text-sm text-green-700">
              We&apos;ll send updates about new features and tips.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary-50 to-secondary-50 border border-primary-100 rounded-xl p-6 relative">
      <button
        onClick={handleSkip}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        aria-label="Dismiss"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex items-start gap-4 mb-4">
        <div className="h-12 w-12 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
          <Mail className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {context === "generate"
              ? "Get your scripts via email"
              : "Stay updated with new features"}
          </h3>
          <p className="text-sm text-gray-600">
            {context === "generate"
              ? "We'll email your generated scripts so you never lose them. Plus get tips for better conversions."
              : "Join 500+ creators getting TikTok ad tips and feature updates."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !email} className="gap-2">
            {loading ? (
              <>Joining...</>
            ) : (
              <>
                Join <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {context === "browse" && (
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Maybe later
          </button>
        )}
      </form>

      <p className="text-xs text-gray-500 mt-3">
        No spam, unsubscribe anytime. Read our{" "}
        <a href="/privacy" className="text-primary-600 hover:underline">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
