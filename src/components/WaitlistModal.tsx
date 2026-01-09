"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Sparkles, Mail } from "lucide-react";

export interface WaitlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FeatureInterest = "unlimited" | "team" | "api" | "spy";

const features: {
  value: FeatureInterest;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "unlimited",
    label: "Unlimited Scripts",
    description: "Generate as many scripts as you need",
    icon: "∞",
  },
  {
    value: "team",
    label: "Team Features",
    description: "Collaborate with your marketing team",
    icon: "👥",
  },
  {
    value: "api",
    label: "API Access",
    description: "Integrate with your existing tools",
    icon: "⚡",
  },
  {
    value: "spy",
    label: "Competitor Analysis",
    description: "Analyze any TikTok ad URL",
    icon: "🔍",
  },
];

function deriveTier(credits?: number) {
  if (credits == null) return undefined;
  if (credits <= 0) return "out_of_credits";
  if (credits <= 2) return "low_credits";
  if (credits <= 5) return "active";
  return "new";
}

export function WaitlistModal({ open, onOpenChange }: WaitlistModalProps) {
  const { data: session } = useSession();

  const [email, setEmail] = useState(session?.user?.email || "");
  const [featureInterest, setFeatureInterest] =
    useState<FeatureInterest>("unlimited");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userTier = useMemo(
    () => deriveTier(session?.user?.credits),
    [session?.user?.credits],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          featureInterest,
          sourceUrl: window.location.href,
          userTier,
        }),
      });

      if (!response.ok) throw new Error("Failed to join waitlist");

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Reset form when modal opens
  useMemo(() => {
    if (open) {
      setEmail(session?.user?.email || "");
      setSubmitted(false);
      setError(null);
    }
  }, [open, session?.user?.email]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="waitlist-modal">
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2 text-xl"
            data-testid="waitlist-title"
          >
            <Sparkles className="h-5 w-5 text-primary-500" />
            {submitted ? "You're on the List!" : "Out of Credits"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {submitted
              ? "We'll email you when premium features launch."
              : "Join the waitlist to get early access to premium features and exclusive discounts."}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center py-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="rounded-full bg-green-100 p-3 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-gray-700 font-medium">
              Thanks for your interest! Check your email for confirmation.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="waitlist-email" className="text-sm font-medium">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="waitlist-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="pl-10"
                  required
                  aria-invalid={!!error}
                  aria-describedby={error ? "email-error" : undefined}
                />
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium px-0">
                Which feature interests you most?
              </legend>
              <RadioGroup
                value={featureInterest}
                onValueChange={(v) => setFeatureInterest(v as FeatureInterest)}
                className="space-y-2"
              >
                {features.map((feature) => (
                  <label
                    key={feature.value}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      "hover:bg-gray-50 hover:border-gray-300",
                      featureInterest === feature.value
                        ? "bg-primary-50 border-primary-300 ring-1 ring-primary-300"
                        : "border-gray-200",
                    )}
                  >
                    <RadioGroupItem
                      value={feature.value}
                      id={`feature-${feature.value}`}
                      className="mt-0.5"
                    />
                    <span className="flex-1">
                      <span className="font-medium text-sm flex items-center gap-2">
                        <span
                          className="text-lg"
                          role="img"
                          aria-label={feature.label}
                        >
                          {feature.icon}
                        </span>
                        {feature.label}
                      </span>
                      <span className="block text-sm text-gray-500 ml-6">
                        {feature.description}
                      </span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </fieldset>

            {error && (
              <p
                id="email-error"
                className="text-sm text-red-600 flex items-center gap-1.5"
                role="alert"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              {loading ? undefined : "Join Waitlist"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
