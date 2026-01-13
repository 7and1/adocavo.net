"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Shield, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PricingTier {
  name: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  description: string;
  credits: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
}

const pricingTiers: PricingTier[] = [
  {
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Perfect for trying out the platform",
    credits: "10 credits",
    features: [
      "Access to 50+ proven hooks",
      "Basic script generation",
      "3 script variations per generation",
      "Standard AI models",
      "Community support",
      "Export to text",
    ],
    cta: "Get Started",
  },
  {
    name: "Pro",
    monthlyPrice: 29,
    annualPrice: 278,
    description: "For serious creators and marketers",
    credits: "500 credits/month",
    features: [
      "Everything in Free",
      "500 credits per month",
      "Advanced AI models",
      "Priority generation speed",
      "Email support",
      "Export to PDF",
      "Save to Notion",
      "Remove watermarks",
      "Custom tone remixing",
    ],
    cta: "Start Pro Trial",
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "Team",
    monthlyPrice: 99,
    annualPrice: 950,
    description: "For agencies and growing teams",
    credits: "2000 credits/month",
    features: [
      "Everything in Pro",
      "5 team members",
      "2000 credits shared pool",
      "Team collaboration tools",
      "Script history (unlimited)",
      "Priority support",
      "Custom brand templates",
      "API access",
    ],
    cta: "Contact Sales",
  },
  {
    name: "Enterprise",
    monthlyPrice: null,
    annualPrice: null,
    description: "For large organizations with custom needs",
    credits: "Unlimited",
    features: [
      "Everything in Team",
      "Unlimited team members",
      "Unlimited credits",
      "Dedicated account manager",
      "Custom AI model training",
      "SSO & advanced security",
      "Custom integrations",
      "SLA guarantee",
      "Onboarding & training",
    ],
    cta: "Contact Sales",
  },
];

const faqs = [
  {
    question: "What is a credit?",
    answer:
      "One credit equals one script generation (3 variations). So 10 credits = 30 script variations. Credits reset monthly for paid plans.",
  },
  {
    question: "Can I change plans anytime?",
    answer:
      "Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll get immediate access to your new credits. When downgrading, changes take effect at the next billing cycle.",
  },
  {
    question: "Is there a free trial for paid plans?",
    answer:
      "Yes! Pro and Team plans come with a 7-day free trial. No credit card required to start. You'll get full access to all features during the trial.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, American Express) and PayPal. For Enterprise plans, we also offer invoicing.",
  },
  {
    question: "Do unused credits roll over?",
    answer:
      "Credits reset each month and don't roll over. However, we'll send you a reminder before your renewal so you can use any remaining credits.",
  },
  {
    question: "Is there a refund policy?",
    answer:
      "Yes! We offer a 30-day money-back guarantee. If you're not satisfied with your purchase, contact our support team for a full refund, no questions asked.",
  },
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const getPrice = (tier: PricingTier) => {
    if (tier.monthlyPrice === null || tier.annualPrice === null)
      return "Custom";
    const price = isAnnual ? tier.annualPrice / 12 : tier.monthlyPrice;
    return price === 0 ? "Free" : `$${Math.round(price)}`;
  };

  const getAnnualSavings = (tier: PricingTier) => {
    if (tier.monthlyPrice === null || tier.annualPrice === null) return null;
    const annualTotal = tier.monthlyPrice * 12;
    const discount = annualTotal - tier.annualPrice;
    const percentage = Math.round((discount / annualTotal) * 100);
    return percentage;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include our core
            hook library and AI-powered script generation.
          </p>

          <div className="inline-flex items-center gap-4 bg-white rounded-full p-1 shadow-sm border">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                !isAnnual
                  ? "bg-primary-500 text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                isAnnual
                  ? "bg-primary-500 text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Annual
              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
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
                  className={`text-xl font-bold mb-2 ${
                    tier.highlighted ? "text-white" : "text-gray-900"
                  }`}
                >
                  {tier.name}
                </h3>
                <div className="mb-2">
                  <span
                    className={`text-3xl font-bold ${
                      tier.highlighted ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {getPrice(tier)}
                  </span>
                  {tier.monthlyPrice !== null && tier.monthlyPrice > 0 && (
                    <>
                      <span
                        className={`text-sm ${
                          tier.highlighted
                            ? "text-primary-100"
                            : "text-gray-500"
                        }`}
                      >
                        /month
                      </span>
                      {isAnnual && (
                        <div className="text-xs text-green-300 mt-1">
                          Save {getAnnualSavings(tier)}% annually
                        </div>
                      )}
                    </>
                  )}
                </div>
                <p
                  className={`text-sm ${
                    tier.highlighted ? "text-primary-100" : "text-gray-500"
                  }`}
                >
                  {tier.description}
                </p>
              </div>

              <div className="mb-4">
                <div className="text-sm font-semibold mb-1">Credits:</div>
                <div className="text-2xl font-bold">{tier.credits}</div>
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
                <Link
                  href={
                    tier.name === "Free"
                      ? "/auth/signin"
                      : tier.name === "Enterprise"
                        ? "#contact"
                        : "/auth/signin?trial=true"
                  }
                >
                  {tier.cta}
                </Link>
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
              <div className="font-semibold text-gray-900">
                Money-Back Guarantee
              </div>
              <div className="text-sm text-gray-500">30-day full refund</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
            <Clock className="h-8 w-8 text-blue-500 flex-shrink-0" />
            <div>
              <div className="font-semibold text-gray-900">Cancel Anytime</div>
              <div className="text-sm text-gray-500">No questions asked</div>
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
            Start with our free plan and upgrade when you need more credits.
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
