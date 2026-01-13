"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Shield, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PricingTier {
  name: string;
  subtitle: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
  badge?: string;
}

const pricingTiers: PricingTier[] = [
  {
    name: "Anonymous",
    subtitle: "Quick access without any setup",
    price: "$0 /month",
    description: "10 credits/day rate limit",
    features: [
      "Access to 50+ proven hooks",
      "Basic script generation",
      "3 script variations per generation",
      "No account required",
      "No API key required",
    ],
    cta: "Try It Now",
    href: "/",
  },
  {
    name: "Free",
    subtitle: "Sign in with GitHub",
    price: "$0 /month",
    description: "Higher limits with a free account",
    features: [
      "50 credits/day rate limit",
      "Save favorites to wishlist",
      "Personal dashboard",
      "Generation history tracking",
      "All Anonymous features",
    ],
    cta: "Get Free Account",
    href: "/auth/signin",
    highlighted: true,
    badge: "Recommended",
  },
  {
    name: "Pro",
    subtitle: "Coming Soon",
    price: "TBA",
    description: "High-volume with dedicated support",
    features: [
      "Unlimited generations",
      "Priority generation speed",
      "Advanced AI models",
      "Export to PDF/Notion",
      "Custom tone remixing",
      "Priority email support",
      "All Free features",
    ],
    cta: "Join Waitlist",
    href: "#waitlist",
  },
];

const faqs = [
  {
    question: "What is a credit?",
    answer:
      "One credit equals one script generation (3 variations). So 10 credits = 30 script variations. Credits reset daily at midnight UTC.",
  },
  {
    question: "Why should I sign up?",
    answer:
      "Signing up with GitHub gives you 5x more daily credits (50 vs 10), plus a personal dashboard to save your favorite hooks and track your generation history.",
  },
  {
    question: "Do I need a credit card?",
    answer:
      "No credit card required. Both the Anonymous and Free tiers are completely free with no hidden fees.",
  },
  {
    question: "When will Pro be available?",
    answer:
      "Pro is coming soon. Join the waitlist to get notified when we launch, and you'll receive an exclusive early-bird discount.",
  },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
            Start free with 10 generations per day. Sign in with GitHub to
            unlock 50 generations per day, a dashboard, and usage tracking.
          </p>
          <p className="text-gray-500">No credit card required.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl p-6 transition-all ${
                tier.highlighted
                  ? "bg-primary-600 text-white shadow-xl scale-105 border-2 border-primary-500"
                  : "bg-white border border-gray-200 shadow-sm hover:shadow-lg"
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    {tier.badge}
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3
                  className={`text-xl font-bold mb-1 ${
                    tier.highlighted ? "text-white" : "text-gray-900"
                  }`}
                >
                  {tier.name}
                </h3>
                <p
                  className={`text-sm mb-3 ${
                    tier.highlighted ? "text-primary-100" : "text-gray-500"
                  }`}
                >
                  {tier.subtitle}
                </p>
                <div className="mb-2">
                  <span
                    className={`text-2xl font-bold ${
                      tier.highlighted ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {tier.price}
                  </span>
                </div>
                <p
                  className={`text-sm ${
                    tier.highlighted ? "text-primary-100" : "text-gray-500"
                  }`}
                >
                  {tier.description}
                </p>
              </div>

              <Button
                asChild
                className={`w-full mb-6 ${
                  tier.highlighted
                    ? "bg-white text-primary-600 hover:bg-gray-100"
                    : ""
                }`}
                variant={tier.highlighted ? "default" : "outline"}
              >
                <Link href={tier.href}>{tier.cta}</Link>
              </Button>

              <ul className="space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check
                      className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                        tier.highlighted ? "text-primary-200" : "text-green-500"
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        tier.highlighted ? "text-white" : "text-gray-600"
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
            <Shield className="h-8 w-8 text-green-500 flex-shrink-0" />
            <div>
              <div className="font-semibold text-gray-900">Free Forever</div>
              <div className="text-sm text-gray-500">
                No credit card required
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
            <Clock className="h-8 w-8 text-blue-500 flex-shrink-0" />
            <div>
              <div className="font-semibold text-gray-900">Daily Reset</div>
              <div className="text-sm text-gray-500">
                Credits refresh every day
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
            <Zap className="h-8 w-8 text-yellow-500 flex-shrink-0" />
            <div>
              <div className="font-semibold text-gray-900">Instant Access</div>
              <div className="text-sm text-gray-500">
                Start generating immediately
              </div>
            </div>
          </div>
        </div>

        <section className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden"
              >
                <button
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  aria-expanded={openFaq === index}
                >
                  <span className="font-medium text-gray-900">
                    {faq.question}
                  </span>
                  <ChevronIcon isOpen={openFaq === index} />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4 text-gray-600">{faq.answer}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">
            Not sure which plan is right for you?
          </h2>
          <p className="text-gray-600 mb-6">
            Start with anonymous access and sign up when you need more credits.
          </p>
          <Button asChild size="lg">
            <Link href="/">Get Started Free</Link>
          </Button>
        </section>
      </div>
    </div>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`h-5 w-5 text-gray-500 transition-transform ${
        isOpen ? "rotate-180" : ""
      }`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}
