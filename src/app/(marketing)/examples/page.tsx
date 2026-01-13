import type { Metadata } from "next";
import Link from "next/link";
import { generateMetadata, pageMetadata } from "@/lib/seo";
import { nichePlaybooks } from "@/data/example-niches";

export const metadata: Metadata = generateMetadata(pageMetadata.examplesIndex);

const categoryCards = [
  {
    category: "beauty",
    slug: "beauty-tiktok-ads",
    title: "Beauty TikTok Ad Examples",
    description:
      "Skincare and makeup hooks that lead with transformations, texture fixes, and ingredient proof.",
    hooks: [
      "Stop scrolling if you have acne",
      "This $9 serum fixed my textured skin",
      "I stopped using foundation because of this",
    ],
  },
  {
    category: "tech",
    slug: "tech-tiktok-ads",
    title: "Tech TikTok Ad Examples",
    description:
      "Gadget and app hooks that highlight time saved, setup wins, and before/after workflows.",
    hooks: [
      "This app saved me 10 hours a week",
      "The $20 gadget every remote worker needs",
      "This gadget replaced three things on my desk",
    ],
  },
  {
    category: "fitness",
    slug: "fitness-tiktok-ads",
    title: "Fitness TikTok Ad Examples",
    description:
      "Workout and wellness hooks that promise visible results, simple routines, and habit upgrades.",
    hooks: [
      "My gym routine changed after this",
      "This 10-minute workout changed my mornings",
      "I lost 5 pounds doing this simple switch",
    ],
  },
  {
    category: "food",
    slug: "food-tiktok-ads",
    title: "Food TikTok Ad Examples",
    description:
      "Recipe and kitchen hooks that emphasize convenience, taste, and satisfying visuals.",
    hooks: [
      "Wait til the end, trust me",
      "If you hate cooking, watch this",
      "Air fryer hack that saves so much time",
    ],
  },
  {
    category: "finance",
    slug: "finance-tiktok-ads",
    title: "Finance TikTok Ad Examples",
    description:
      "Money and fintech hooks that focus on outcomes, clarity, and quick wins.",
    hooks: [
      "This is your sign to start that side hustle",
      "Stop doing this if you want to save money",
      "I made my first $1,000 online with this",
    ],
  },
  {
    category: "pets",
    slug: "pets-tiktok-ads",
    title: "Pet TikTok Ad Examples",
    description:
      "Pet product hooks that show problem-solving, cuteness, and quick improvements.",
    hooks: [
      "Your dog will thank you for this",
      "The toy that finally tires my dog out",
      "If your cat ignores toys, try this",
    ],
  },
];

export default function ExamplesIndexPage() {
  return (
    <div className="space-y-10">
      <section className="text-center max-w-2xl mx-auto space-y-4">
        <h1 className="text-4xl font-bold">TikTok Ad Examples by Category</h1>
        <p className="text-lg text-gray-600">
          Explore proven hook patterns and ad angles across the most popular
          TikTok categories. Use these examples to spark your next campaign or
          jump straight into script generation.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            prefetch
            className="px-5 py-2.5 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
          >
            Browse Hook Library
          </Link>
          <Link
            href="/blog"
            prefetch
            className="px-5 py-2.5 rounded-lg border border-gray-200 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Read the Blog
          </Link>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {categoryCards.map((card) => (
          <div
            key={card.slug}
            className="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
              {card.category} category
            </p>
            <h2 className="text-2xl font-semibold mb-3">{card.title}</h2>
            <p className="text-gray-600 mb-4">{card.description}</p>
            <div className="space-y-2 mb-5">
              {card.hooks.map((hook) => (
                <div
                  key={hook}
                  className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                >
                  &ldquo;{hook}&rdquo;
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/examples/${card.slug}`}
                prefetch
                className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
              >
                View examples
              </Link>
              <Link
                href={`/category/${card.category}`}
                prefetch
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Browse hooks
              </Link>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-3xl font-semibold">Niche Playbooks</h2>
          <p className="text-gray-600">
            Programmatic examples for high-growth verticals. Use these hooks to
            tailor your scripts to specific audiences.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {nichePlaybooks.map((playbook) => (
            <div
              key={playbook.slug}
              className="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
                niche playbook
              </p>
              <h3 className="text-2xl font-semibold mb-3">{playbook.title}</h3>
              <p className="text-gray-600 mb-4">{playbook.description}</p>
              <div className="space-y-2 mb-5">
                {playbook.hooks.slice(0, 3).map((hook) => (
                  <div
                    key={hook}
                    className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                  >
                    &ldquo;{hook}&rdquo;
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/examples/${playbook.slug}`}
                  className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
                >
                  View playbook
                </Link>
                <Link
                  href="/"
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Browse hooks
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-gradient-to-r from-primary-50 to-secondary-50 p-8 text-center">
        <h2 className="text-2xl font-semibold mb-3">
          Ready to generate your own scripts?
        </h2>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Pick a hook, drop in your product details, and get three UGC-style
          scripts in seconds. Start with the examples above or explore the full
          library.
        </p>
        <Link
          href="/"
          prefetch
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-primary-700 font-medium shadow-sm hover:shadow-md transition-shadow"
        >
          Generate with Adocavo
        </Link>
      </section>
    </div>
  );
}
