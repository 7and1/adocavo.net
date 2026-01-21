"use client";

import { useState, useEffect } from "react";
import { X, Mail, Sparkles, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EmailCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture?: (email: string) => void;
  context?: "generate" | "browse" | "exit";
}

export function EmailCaptureModal({
  open,
  onOpenChange,
  onCapture,
  context = "browse",
}: EmailCaptureModalProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem("email-capture-dismissed");
    const captured = localStorage.getItem("email-captured");

    if (captured) {
      return;
    }

    if (context === "exit" && !dismissed) {
      const timer = setTimeout(() => {
        const hasInteracted = sessionStorage.getItem("has-interacted");
        if (hasInteracted && !open) {
          onOpenChange(true);
        }
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [context, open, onOpenChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          sourceUrl: window.location.pathname,
          featureInterest: context,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit email");
      }

      setSubmitted(true);
      localStorage.setItem("email-captured", "true");
      onCapture?.(email);

      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
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
    localStorage.setItem("email-capture-dismissed", "true");
    onOpenChange(false);
  };

  const content = {
    generate: {
      title: "Get 3 Free Hook Examples",
      description:
        "Enter your email to receive 3 proven viral hooks you can use immediately, plus a quick-start guide.",
      cta: "Send Me The Hooks",
    },
    browse: {
      title: "Get the Free Hook Pack",
      description:
        "Join the list to receive creator-tested hooks and updates as we launch new features.",
      cta: "Get the Free Pack",
    },
    exit: {
      title: "Wait! Don't Leave Empty-Handed",
      description:
        "Get our top 10 performing TikTok hooks sent straight to your inbox. No credit card required.",
      cta: "Send Me The Hooks",
    },
  }[context];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleSkip();
      }}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-capture-title"
      >
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {!submitted ? (
          <>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 mb-4">
              <Mail className="h-6 w-6 text-primary-600" />
            </div>

            <h2
              id="email-capture-title"
              className="text-2xl font-bold text-gray-900 mb-2"
            >
              {content.title}
            </h2>
            <p className="text-gray-600 mb-6">{content.description}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full"
                  aria-label="Email address"
                />
                {error && (
                  <p className="text-sm text-red-600 mt-2" role="alert">
                    {error}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gap-2"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {content.cta}
                    </>
                  )}
                </Button>

                {context !== "generate" && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors py-2"
                  >
                    No thanks, I&apos;ll browse for now
                  </button>
                )}
              </div>
            </form>

            <p className="text-xs text-gray-400 mt-4 text-center">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4 mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              You&apos;re In!
            </h3>
            <p className="text-gray-600">
              Check your inbox for your free hooks. Let&apos;s create some viral
              content!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
