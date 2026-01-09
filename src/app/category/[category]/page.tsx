import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { HookGrid } from "@/components/HookGrid";
import { getBindings } from "@/lib/cloudflare";
import { getCategories, getHooks, getHookCount } from "@/lib/services/hooks";
import {
  generateMetadata as buildMetadata,
  pageMetadata,
  getBreadcrumbJsonLd,
  getCollectionPageJsonLd,
  safeJsonLdStringify,
} from "@/lib/seo";
import { hookCategorySchema, type HookCategory } from "@/lib/validations";

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const env = getBindings();
  if (!env.DB) {
    return buildMetadata(pageMetadata.home);
  }

  const parsed = hookCategorySchema.safeParse(category);
  if (!parsed.success) {
    return buildMetadata(pageMetadata.home);
  }

  const count = await getHookCount(env.DB as D1Database, parsed.data);
  const seo = pageMetadata.category(parsed.data, count);
  return buildMetadata({
    ...seo,
    alternatives: {
      canonical: `https://adocavo.net/category/${category}`,
    },
  });
}

export default async function CategoryPage({ params }: Props) {
  const { category: categoryParam } = await params;
  const env = getBindings();
  if (!env.DB) {
    return (
      <div className="text-center text-gray-500">Database unavailable.</div>
    );
  }

  const parsed = hookCategorySchema.safeParse(categoryParam);
  if (!parsed.success) {
    notFound();
  }
  const category = parsed.data as HookCategory;

  const categories = await getCategories(env.DB as D1Database);
  const categoryData = categories.find((entry) => entry.category === category);
  const hookCount = categoryData?.count || 0;
  const isValidCategory = categories.some(
    (entry) => entry.category === category,
  );

  if (!isValidCategory) {
    notFound();
  }

  const hooks = await getHooks(env.DB as D1Database, { category });
  const categoryCapitalized =
    category.charAt(0).toUpperCase() + category.slice(1);

  const categoryDescriptions: Record<
    string,
    { title: string; description: string; examples: string[] }
  > = {
    beauty: {
      title: "Beauty & Skincare TikTok Hooks",
      description:
        "Proven hooks for skincare, cosmetics, and beauty brands. These patterns drive engagement through visual demos, ingredient education, and authentic testimonials.",
      examples: [
        "Stop scrolling if you have textured skin",
        "I found a $12 dupe for a $80 serum",
        "Wait for my 30-day transformation",
      ],
    },
    tech: {
      title: "Tech & SaaS TikTok Hooks",
      description:
        "High-converting hooks for tech products, apps, and gadgets. Focus on productivity gains, value comparisons, and before/after setup transformations.",
      examples: [
        "This app saves me 2 hours every day",
        "This $30 gadget replaced my $150 one",
        "I finally found a charging cable that doesn't break",
      ],
    },
    fitness: {
      title: "Fitness & Wellness TikTok Hooks",
      description:
        "Viral hooks for fitness equipment, supplements, and workout programs. Use contrarian advice, transformation timelines, and specific problem-solving.",
      examples: [
        "Stop doing cardio if you want to lose fat",
        "My 90-day transformation using only this",
        "This fixed my knee pain in two weeks",
      ],
    },
    food: {
      title: "Food & Beverage TikTok Hooks",
      description:
        "Engaging hooks for food brands, CPG products, and kitchen gadgets. Lean into ASMR, recipe hacks, and meal prep transformations.",
      examples: [
        "This meal prep hack saved me hours",
        "You need to taste this to believe it",
        "Wait for the before and after",
      ],
    },
    fashion: {
      title: "Fashion & Apparel TikTok Hooks",
      description:
        "Style-focused hooks for clothing brands and accessories. Use outfit reveals, fashion hacks, and value comparisons.",
      examples: [
        "This $20 top looks like the $80 version",
        "Stop wearing this with that",
        "The fashion hack nobody knows",
      ],
    },
    home: {
      title: "Home & Decor TikTok Hooks",
      description:
        "Hooks for home goods, decor, and lifestyle products. Focus on room transformations, organization hacks, and aesthetic upgrades.",
      examples: [
        "My room before vs. after this one purchase",
        "This organization hack changed everything",
        "Why did nobody tell me about this",
      ],
    },
    pets: {
      title: "Pet Products TikTok Hooks",
      description:
        "Engaging hooks for pet products, accessories, and pet brands. Use cute reveals, problem-solving for pet owners, and funny moments.",
      examples: [
        "My dog finally stopped barking at this",
        "The cat toy that broke the internet",
        "Every pet owner needs this",
      ],
    },
    finance: {
      title: "Finance & Fintech TikTok Hooks",
      description:
        "Trust-building hooks for financial products and services. Use education-first approaches, myth-busting, and relatable money struggles.",
      examples: [
        "This is your sign to start investing",
        "Stop saving money if you want to build wealth",
        "I wish I knew this before investing",
      ],
    },
  };

  const categoryInfo = categoryDescriptions[category] || {
    title: `${categoryCapitalized} TikTok Hooks`,
    description: `Browse ${hookCount} proven ${category} TikTok hooks that drive engagement. Generate custom ad scripts for your ${category} products with AI.`,
    examples: [],
  };

  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "Home", url: "https://adocavo.net/" },
    {
      name: categoryInfo.title,
      url: `https://adocavo.net/category/${category}`,
    },
  ]);

  const collectionJsonLd = getCollectionPageJsonLd(
    categoryInfo.title,
    `Browse ${hookCount} proven ${category} TikTok hooks to generate viral ad scripts.`,
    `/category/${category}`,
    hooks.map((hook) => ({ name: hook.text, url: `/hook/${hook.id}` })),
  );

  const relatedCategories = categories
    .filter((c) => c.category !== category)
    .slice(0, 5);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLdStringify(breadcrumbJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLdStringify(collectionJsonLd),
        }}
      />
      <Header />
      <main className="container mx-auto px-4 py-10">
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex gap-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-gray-700">
                Home
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-700">{categoryInfo.title}</li>
          </ol>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-3">{categoryInfo.title}</h1>
          <p className="text-gray-600 mb-4">{categoryInfo.description}</p>
          {categoryInfo.examples.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categoryInfo.examples.map((example, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm"
                >
                  &ldquo;{example}&rdquo;
                </span>
              ))}
            </div>
          )}
        </div>

        <HookGrid initialHooks={hooks} categories={categories} />

        <section className="mt-12 pt-8 border-t max-w-3xl">
          <h2 className="text-xl font-semibold mb-4">
            Best Practices for {categoryCapitalized} TikTok Ads
          </h2>
          <div className="prose text-gray-600">
            <p>
              When creating {category} TikTok ads, focus on authentic delivery
              and specific details. Show the product in action, include real
              results or testimonials, and always lead with your strongest hook.
              Test multiple angles to find what resonates with your audience.
            </p>
          </div>
        </section>

        {relatedCategories.length > 0 && (
          <section className="mt-12 pt-8 border-t">
            <h2 className="text-xl font-semibold mb-4">Related Categories</h2>
            <div className="flex flex-wrap gap-3">
              {relatedCategories.map((cat) => (
                <Link
                  key={cat.category}
                  href={`/category/${cat.category}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-white hover:bg-gray-50 transition-colors"
                >
                  <span className="capitalize">{cat.category}</span>
                  <span className="text-sm text-gray-400">({cat.count})</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
