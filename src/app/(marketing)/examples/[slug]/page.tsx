import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  generateMetadata as buildMetadata,
  pageMetadata,
  getBreadcrumbJsonLd,
  getCollectionPageJsonLd,
  safeJsonLdStringify,
} from "@/lib/seo";
import {
  HOOK_CATEGORIES,
  hookCategorySchema,
  type HookCategory,
} from "@/lib/validations";
import { nichePlaybookBySlug, nichePlaybooks } from "@/data/example-niches";

interface Props {
  params: Promise<{ slug: string }>;
}

const slugByCategory: Record<HookCategory, string> = {
  beauty: "beauty-tiktok-ads",
  tech: "tech-tiktok-ads",
  fitness: "fitness-tiktok-ads",
  food: "food-tiktok-ads",
  finance: "finance-tiktok-ads",
  pets: "pets-tiktok-ads",
};

const categoryPlaybooks: Record<
  HookCategory,
  {
    title: string;
    description: string;
    hooks: string[];
    angles: string[];
    bestPractices: string[];
    categories?: HookCategory[];
  }
> = {
  beauty: {
    title: "Beauty TikTok Ad Examples",
    description:
      "High-converting skincare and makeup ads that lead with transformations, texture fixes, and ingredient proof.",
    hooks: [
      "Stop scrolling if you have acne",
      "This $9 serum fixed my textured skin",
      "I stopped using foundation because of this",
      "Don't buy another cleanser until you see this",
    ],
    angles: [
      "Before/after transformation",
      "Budget dupe discovery",
      "Routine upgrade with results",
    ],
    bestPractices: [
      "Show a close-up texture or blemish in the first 2 seconds.",
      "Call out a specific ingredient or price point to build trust.",
      "Pair the hook with a quick routine demo and a results timeline.",
    ],
  },
  tech: {
    title: "Tech TikTok Ad Examples",
    description:
      "Gadget and app ads that highlight time saved, workflow upgrades, and simple before/after wins.",
    hooks: [
      "This app saved me 10 hours a week",
      "The $20 gadget every remote worker needs",
      "This gadget replaced three things on my desk",
      "If you work from home, you need this",
    ],
    angles: ["Time-saved proof", "Replacement value", "Workflow before/after"],
    bestPractices: [
      "Show the problem screen or messy setup before the solution.",
      "Quantify the benefit (minutes saved, tabs reduced, tasks automated).",
      "End with a quick demo of the key feature in action.",
    ],
  },
  fitness: {
    title: "Fitness TikTok Ad Examples",
    description:
      "Workout, wellness, and supplement ads that promise visible results with simple, repeatable routines.",
    hooks: [
      "My gym routine changed after this",
      "This 10-minute workout changed my mornings",
      "I lost 5 pounds doing this simple switch",
      "Stop stretching like this if you get sore",
    ],
    angles: [
      "Short routine with quick payoff",
      "Pain relief or recovery fix",
      "Result timeline",
    ],
    bestPractices: [
      "Lead with a specific outcome (less pain, more energy, visible change).",
      "Keep the routine steps under 3 and show each one visually.",
      "Add a clear timeframe for results to build urgency.",
    ],
  },
  food: {
    title: "Food TikTok Ad Examples",
    description:
      "Recipe, snack, and kitchen tool ads that focus on convenience, taste, and satisfying visuals.",
    hooks: [
      "Wait til the end, trust me",
      "If you hate cooking, watch this",
      "Air fryer hack that saves so much time",
      "This 5-minute recipe tastes expensive",
    ],
    angles: ["Fast prep convenience", "Taste reaction", "Meal prep"],
    bestPractices: [
      "Show the finished bite or final texture within the first 3 seconds.",
      "Use quick cuts to prove how fast the recipe is.",
      "Highlight a single hero ingredient or tool for recall.",
    ],
  },
  finance: {
    title: "Finance TikTok Ad Examples",
    description:
      "Money and fintech ads that focus on outcomes, clarity, and easy-to-follow systems.",
    hooks: [
      "This is your sign to start that side hustle",
      "Stop doing this if you want to save money",
      "I made my first $1,000 online with this",
      "The money move I made at 25",
    ],
    angles: ["Outcome promise", "Simple system", "Myth busting"],
    bestPractices: [
      "Lead with a clear result or milestone to establish credibility.",
      "Use on-screen steps or a checklist to reduce skepticism.",
      "Close with a low-friction CTA (free guide, calculator, demo).",
    ],
  },
  pets: {
    title: "Pet TikTok Ad Examples",
    description:
      "Pet product ads that highlight problem-solving, comfort upgrades, and adorable reveals.",
    hooks: [
      "Your dog will thank you for this",
      "The toy that finally tires my dog out",
      "If your cat ignores toys, try this",
      "No one tells you this about pet hair",
    ],
    angles: ["Behavior fix", "Comfort upgrade", "Cute reveal"],
    bestPractices: [
      "Show the pet reaction as early as possible.",
      "Call out the specific pain point (shedding, barking, boredom).",
      "End with a quick before/after of the pet's behavior.",
    ],
  },
};

function getCategoryFromSlug(slug: string): HookCategory | null {
  const normalized = slug.toLowerCase();
  for (const category of HOOK_CATEGORIES) {
    if (normalized === slugByCategory[category]) {
      return category;
    }
  }
  return null;
}

export async function generateStaticParams() {
  return [
    ...HOOK_CATEGORIES.map((category) => ({
      slug: slugByCategory[category],
    })),
    ...nichePlaybooks.map((playbook) => ({ slug: playbook.slug })),
  ];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryFromSlug(slug);
  if (!category) {
    const niche = nichePlaybookBySlug[slug];
    if (!niche) {
      return buildMetadata(pageMetadata.examplesIndex);
    }
    const seo = pageMetadata.examplesNiche(niche, niche.hooks.length);
    return buildMetadata({
      ...seo,
      alternatives: {
        canonical: `https://adocavo.net/examples/${slug}`,
      },
    });
  }
  const seo = pageMetadata.examplesCategory(category, 10);
  return buildMetadata({
    ...seo,
    alternatives: {
      canonical: `https://adocavo.net/examples/${slug}`,
    },
  });
}

export default async function ExamplesCategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = getCategoryFromSlug(slug);
  const isCategory = Boolean(
    category && hookCategorySchema.safeParse(category).success,
  );
  const niche = nichePlaybookBySlug[slug];

  if (!isCategory && !niche) {
    notFound();
  }

  const playbook = isCategory
    ? categoryPlaybooks[category as HookCategory]
    : niche!;
  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "Home", url: "https://adocavo.net/" },
    { name: "Examples", url: "https://adocavo.net/examples" },
    { name: playbook.title, url: `https://adocavo.net/examples/${slug}` },
  ]);

  const collectionJsonLd = getCollectionPageJsonLd(
    playbook.title,
    playbook.description,
    `/examples/${slug}`,
    playbook.hooks.map((hook) => ({
      name: hook,
      url: isCategory ? `/category/${category}` : `/`,
    })),
  );

  return (
    <div className="space-y-10">
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

      <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
        <ol className="flex gap-2">
          <li>
            <Link href="/" className="hover:text-gray-700">
              Home
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/examples" className="hover:text-gray-700">
              Examples
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-700">{playbook.title}</li>
        </ol>
      </nav>

      <section className="space-y-4">
        <h1 className="text-4xl font-bold">{playbook.title}</h1>
        <p className="text-lg text-gray-600 max-w-3xl">
          {playbook.description}
        </p>
        <div className="flex flex-wrap gap-3">
          {isCategory ? (
            <Link
              href={`/category/${category}`}
              className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              Browse {category} hooks
            </Link>
          ) : (
            <Link
              href="/"
              className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              Browse Hook Library
            </Link>
          )}
          <Link
            href="/"
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Generate scripts
          </Link>
        </div>
        {!isCategory &&
          playbook.categories &&
          playbook.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
              <span>Recommended categories:</span>
              {playbook.categories.map((categoryName) => (
                <Link
                  key={categoryName}
                  href={`/category/${categoryName}`}
                  className="rounded-full border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50"
                >
                  {categoryName}
                </Link>
              ))}
            </div>
          )}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="text-lg font-semibold mb-3">Angles to test</h2>
          <ul className="space-y-2 text-gray-600">
            {playbook.angles.map((angle) => (
              <li key={angle}>• {angle}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border bg-white p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-3">Example hooks</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {playbook.hooks.map((hook) => (
              <div
                key={hook}
                className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700"
              >
                &ldquo;{hook}&rdquo;
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-gray-50 p-6">
        <h2 className="text-lg font-semibold mb-3">Best practices</h2>
        <ul className="space-y-2 text-gray-600">
          {playbook.bestPractices.map((tip) => (
            <li key={tip}>• {tip}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border bg-gradient-to-r from-primary-50 to-secondary-50 p-8 text-center">
        <h2 className="text-2xl font-semibold mb-3">
          Build your {isCategory ? category : "next"} scripts in minutes
        </h2>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Choose a hook from the library and generate three high-performing
          angles instantly. Perfect for rapid creative testing.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {isCategory ? (
            <Link
              href={`/category/${category}`}
              className="px-5 py-2.5 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
            >
              Explore {category} hooks
            </Link>
          ) : (
            <Link
              href="/"
              className="px-5 py-2.5 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
            >
              Explore hook library
            </Link>
          )}
          <Link
            href="/blog"
            className="px-5 py-2.5 rounded-lg border border-gray-200 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Learn hook strategy
          </Link>
        </div>
      </section>
    </div>
  );
}
