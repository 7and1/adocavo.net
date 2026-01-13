import type { HookCategory } from "@/lib/validations";

export interface ExamplePlaybook {
  slug: string;
  title: string;
  description: string;
  hooks: string[];
  angles: string[];
  bestPractices: string[];
  keywords: string[];
  categories?: HookCategory[];
}

export const nichePlaybooks: ExamplePlaybook[] = [
  {
    slug: "real-estate-tiktok-hooks",
    title: "Real Estate TikTok Hooks & Ad Scripts",
    description:
      "Scroll-stopping hooks for agents, brokers, and listings that generate tours, calls, and qualified leads.",
    hooks: [
      "Stop scrolling if you're house hunting this year",
      "This $0 staging trick sold our listing in 48 hours",
      "Why every first-time buyer misses this one step",
      "I walked into this open house and said wow",
      "The one neighborhood I'd buy in 2026",
      "If you're renting, watch this before your lease ends",
      "We dropped the price and got 12 offers",
      "This 3-minute video tour saved my client $15k",
      "Don't list your home until you do this",
      "What $500k buys you in {city}",
      "I wish every seller knew this inspection hack",
      "The loan mistake that killed this deal",
    ],
    angles: [
      "Listing transformation",
      "Buyer education",
      "Neighborhood highlight",
      "Price repositioning",
    ],
    bestPractices: [
      "Lead with a dramatic before/after or pricing shift in the first 2 seconds.",
      "Use on-screen stats (days on market, offer count) to build proof.",
      "End with a clear CTA: book a tour, DM for the list, or claim a guide.",
    ],
    keywords: [
      "real estate tiktok hooks",
      "real estate ad scripts",
      "realtor tiktok ads",
      "listing video hooks",
      "real estate marketing tiktok",
    ],
    categories: ["finance"],
  },
  {
    slug: "dropshipping-video-ads",
    title: "Dropshipping Video Ad Hooks",
    description:
      "Conversion-focused TikTok hooks for dropshipping brands to test new products and scale winning creatives.",
    hooks: [
      "Stop scrolling if you want a product that sells itself",
      "This $12 product turned into my best ad",
      "I tested 5 creatives and this one doubled ROAS",
      "Don't run another ad before you see this hook",
      "The 3-second clip that got 2.3x CTR",
      "Why this product wins in the first 2 seconds",
      "I spent $50 and found a winner",
      "This was my worst product…until I changed the hook",
      "UGC ad formula that scaled past $10k/day",
      "If your CPMs are high, try this angle",
      "My supplier hated this, but it converts",
      "The pattern in every winning TikTok ad",
    ],
    angles: [
      "Product demo payoff",
      "UGC-style review",
      "Problem/solution speed",
      "Price/value contrast",
    ],
    bestPractices: [
      "Show the transformation or payoff within the first 3 seconds.",
      "Mention price or shipping time to build trust fast.",
      "End with a scarcity CTA tied to stock or a limited bundle.",
    ],
    keywords: [
      "dropshipping video ads",
      "dropshipping tiktok hooks",
      "product ad hooks",
      "ugc dropshipping ads",
      "tiktok ad creatives dropshipping",
    ],
    categories: ["tech", "beauty"],
  },
  {
    slug: "saas-marketing-hooks",
    title: "SaaS Marketing Hooks for TikTok",
    description:
      "B2B and SaaS hook ideas that highlight time saved, workflow upgrades, and measurable ROI.",
    hooks: [
      "This dashboard saved me 6 hours every week",
      "If you're still doing reports manually, stop",
      "Our churn dropped 18% after we fixed this",
      "The 30-second demo that closed our biggest deal",
      "I replaced 3 tools with this one",
      "How we onboarded users 2x faster",
      "This workflow stopped our support tickets",
      "POV: you finally have visibility into your pipeline",
      "Don't buy this software until you see the setup",
      "We tried every CRM…then this happened",
      "Your team is wasting time on this one task",
      "This 2-minute automation pays for itself",
    ],
    angles: [
      "Before/after workflow",
      "Time-saved proof",
      "Team productivity win",
      "ROI/metric improvement",
    ],
    bestPractices: [
      "Lead with a hard number (hours saved, % lift) in the hook.",
      "Show the product screen quickly, then narrate the outcome.",
      "Close with a low-friction CTA (free trial, demo, audit).",
    ],
    keywords: [
      "saas marketing hooks",
      "saas tiktok ads",
      "b2b tiktok hooks",
      "software demo hooks",
      "saas ad scripts",
    ],
    categories: ["tech", "finance"],
  },
];

export const nichePlaybookBySlug = nichePlaybooks.reduce<
  Record<string, ExamplePlaybook>
>((acc, playbook) => {
  acc[playbook.slug] = playbook;
  return acc;
}, {});

export const nicheSlugs = nichePlaybooks.map((playbook) => playbook.slug);
