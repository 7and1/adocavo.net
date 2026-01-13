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
import {
  getSeedCategories,
  getSeedHookCount,
  getSeedHooks,
} from "@/lib/seed-hooks";
import { hookCategorySchema, type HookCategory } from "@/lib/validations";

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const env = getBindings();
  const parsed = hookCategorySchema.safeParse(category);
  if (!parsed.success) {
    return buildMetadata(pageMetadata.home);
  }

  const count = env.DB
    ? await getHookCount(env.DB as D1Database, parsed.data)
    : getSeedHookCount(parsed.data);
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
  const parsed = hookCategorySchema.safeParse(categoryParam);
  if (!parsed.success) {
    notFound();
  }
  const category = parsed.data as HookCategory;

  const categories = env.DB
    ? await getCategories(env.DB as D1Database)
    : getSeedCategories();
  const categoryData = categories.find((entry) => entry.category === category);
  const hookCount = categoryData?.count || 0;
  const isValidCategory = categories.some(
    (entry) => entry.category === category,
  );

  if (!isValidCategory) {
    notFound();
  }

  const hooks = env.DB
    ? await getHooks(env.DB as D1Database, { category })
    : getSeedHooks({ category, limit: 50, page: 1 });
  const categoryCapitalized =
    category.charAt(0).toUpperCase() + category.slice(1);

  const categoryDescriptions: Record<
    string,
    {
      title: string;
      description: string;
      extendedContent: string;
      bestPractices: string[];
      examples: string[];
    }
  > = {
    beauty: {
      title: "Beauty & Skincare TikTok Hooks",
      description:
        "Proven hooks for skincare, cosmetics, and beauty brands. These patterns drive engagement through visual demos, ingredient education, and authentic testimonials.",
      extendedContent:
        "The beauty industry on TikTok has revolutionized how consumers discover and purchase skincare, cosmetics, and personal care products. With over 200 billion views under beauty-related hashtags, TikTok has become the primary discovery platform for Gen Z and millennial beauty enthusiasts. Successful beauty TikTok ads leverage visual storytelling, authentic testimonials, and educational content about ingredients and application techniques. Our curated collection of beauty hooks focuses on the most effective patterns that capture attention within the first three seconds - the critical window for stopping the scroll. These hooks address common skincare concerns like acne, aging, hyperpigmentation, and texture while highlighting product benefits through relatable narratives and dramatic transformations. The psychology behind successful beauty content taps into viewer desires for self-improvement, social validation, and the satisfaction of finding products that actually work. By using our AI-generated hooks and scripts, beauty brands can create authentic-feeling content that resonates with TikTok's discerning audience while maintaining brand consistency and compliance with advertising guidelines.",
      bestPractices: [
        "Show real results with before/after footage when possible - authenticity drives trust in beauty content",
        "Lead with specific skin concerns or problems your target audience faces to create instant relevance",
        "Use close-up shots that clearly demonstrate product texture, application, and finish",
        "Mention key ingredients and their benefits, but keep explanations simple and accessible",
        "Include diverse skin tones and types in your content to broaden your appeal and inclusivity",
        "Test hooks emphasizing different angles: price comparison, dermatologist approval, viral trends, or personal discovery",
        "Keep transitions quick and visually engaging - TikTok beauty viewers have high expectations for production quality",
      ],
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
      extendedContent:
        "Technology and SaaS products have found unexpected success on TikTok, with the #TechTok hashtag accumulating over 50 billion views. The platform's format is ideal for demonstrating software workflows, gadget unboxings, and productivity hacks that showcase genuine value. Tech-savvy TikTok users appreciate content that respects their intelligence while making complex products accessible. Our tech hooks are designed to highlight tangible benefits - time saved, money earned, or problems solved - rather than just feature lists. The most successful tech ads on TikTok often follow a problem-solution narrative: show a frustrating tech problem, introduce your product as the solution, and demonstrate the resolution. This approach works because it connects emotionally with viewers who have experienced the same pain points. Whether you're promoting a productivity app, a smart home device, or a B2B software solution, our AI-generated scripts will help you communicate your value proposition in TikTok's native, authentic style while building credibility with tech-conscious audiences.",
      bestPractices: [
        "Focus on outcomes and benefits rather than features - viewers care about what your tech does for them",
        "Show your product in action within the first 3 seconds, with screen recordings or clear demo footage",
        "Use comparison hooks (old way vs. new way, expensive vs. affordable) to create immediate value perception",
        "Include proof elements like testimonials, reviews, or usage statistics to build credibility",
        "Keep jargon minimal and explain technical concepts in simple, relatable terms",
        "Test angles around productivity gains, cost savings, or competitive advantages",
        "Leverage trending sounds and formats while maintaining clear communication of your product's value",
      ],
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
      extendedContent:
        "Fitness content dominates TikTok, with #FitnessTok and #Workout content generating billions of daily views. The platform has transformed how fitness brands connect with consumers, moving away from traditional ideal-body imagery toward authentic, achievable health journeys. Successful fitness TikTok ads balance aspiration with accessibility - showing what's possible while making it feel attainable for the average viewer. Our fitness hook collection is built on proven patterns that capture attention through controversial statements, relatable struggles, and inspiring transformations. The fitness audience on TikTok responds well to content that acknowledges common pain points - lack of motivation, limited time, confusing information - while offering clear, actionable solutions. Whether you're selling workout equipment, supplements, apparel, or coaching programs, our AI-generated scripts will help you craft authentic messages that resonate with TikTok's health-conscious community while driving conversions through genuine connection and clear calls-to-action.",
      bestPractices: [
        "Lead with relatable fitness struggles or misconceptions to create immediate identification with viewers",
        "Use transformation hooks sparingly and pair them with realistic timelines and honest discussions about effort required",
        "Show exercises or product usage with proper form - viewers will judge credibility based on technique",
        "Include diverse body types and fitness levels to broaden your appeal and authenticity",
        "Emphasize convenience and time efficiency - 'busy person' fitness content performs exceptionally well",
        "Test contrarian angles that challenge common fitness myths or advice, but back claims with credible reasoning",
        "Incorporate trending sounds and formats while ensuring your core message remains clear and actionable",
      ],
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
      extendedContent:
        "Food content on TikTok has evolved into a cultural phenomenon, with #FoodTok amassing over 250 billion views and launching countless products into viral success. The platform's visual and audio features make it perfect for showcasing food in ways that trigger appetite and curiosity. Successful food and beverage TikTok ads tap into multiple sensory channels - the sizzle of cooking, the visual appeal of plated dishes, and the satisfaction of a perfect bite. Our food hooks leverage the most effective patterns in TikTok food marketing: recipe hacks that simplify complex dishes, ASMR-style preparation that triggers sensory responses, and dramatic before-after cooking transformations. The psychology of food content on TikTok combines convenience aspirations with the desire for impressive results - viewers want to learn tricks that make them look like skilled cooks with minimal effort. Whether you're promoting a food product, kitchen gadget, restaurant, or meal service, our AI-generated scripts will help you create mouthwatering content that drives both engagement and conversions.",
      bestPractices: [
        "Prioritize ASMR elements - sizzling, crunching, and pouring sounds significantly boost food content engagement",
        "Show the final plated result early or in thumbnails to give viewers a clear payoff for watching",
        "Use recipe hack angles that promise simplified versions of complex dishes or professional-quality results at home",
        "Include clear ingredient callouts and brand mentions naturally within the cooking narrative",
        "Demonstrate versatility by showing multiple uses or recipe variations for your product",
        "Test emotional hooks around family meals, date night cooking, or impressive hosting scenarios",
        "Keep movements dynamic and the camera close to the food - viewers want to see textures and details clearly",
      ],
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
      extendedContent:
        "TikTok has fundamentally changed fashion discovery and purchasing behavior, with #FashionTok generating over 100 billion views and driving viral trends that retailers scramble to stock. The platform's format is ideal for fashion content - quick outfit reveals, styling hacks, and authentic fashion advice from relatable creators. Successful fashion TikTok ads blend inspiration with accessibility - showing aspirational looks that feel achievable with the right pieces. Our fashion hook collection capitalizes on proven patterns that stop the scroll: dramatic outfit reveals, clever styling hacks, and compelling value comparisons between designer and affordable pieces. The fashion audience on TikTok values authenticity over polished editorial content, responding better to real people showing how clothes fit and move on diverse body types. Whether you're selling clothing, accessories, shoes, or styling services, our AI-generated scripts will help you create fashionable content that drives both brand awareness and direct sales through authentic styling advice and clear product showcases.",
      bestPractices: [
        "Show clothing on real people with diverse body types - authenticity trumps polished model shots on TikTok",
        "Use outfit transition effects and quick changes to create visual intrigue and showcase multiple pieces",
        "Lead with specific styling problems your products solve - outfit coordination, fit issues, or styling confidence",
        "Include fabric and fit details through movement - twirls, walking shots, and close fabric inspections",
        "Test value-focused hooks comparing your pieces to expensive alternatives or showing cost-per-wear calculations",
        "Leverage seasonal trends and occasions (back-to-school, wedding season, vacation) for timely relevance",
        "Include clear size, fit, and care information naturally within your content to reduce purchase friction",
      ],
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
      extendedContent:
        "Home decor and improvement content has exploded on TikTok, with #HomeTok and interior design content generating billions of views as users seek inspiration for their living spaces. The platform's visual format is perfect for showcasing room transformations, organizational solutions, and aesthetic upgrades that make spaces feel both beautiful and functional. Successful home TikTok ads tap into deep desires for creating sanctuaries, maximizing small spaces, and achieving Pinterest-worthy results on real budgets. Our home hooks leverage the most engaging patterns in TikTok home content: dramatic before-and-after room reveals, satisfying organization makeovers, and clever product discoveries that solve common household frustrations. The psychology of home content connects to viewers' aspirations for their ideal living spaces while offering practical, achievable solutions rather than just aspirational eye candy. Whether you're selling furniture, decor, storage solutions, or home improvement products, our AI-generated scripts will help you create content that inspires both admiration and action.",
      bestPractices: [
        "Start with the 'after' shot or a preview of the transformation result to hook viewers immediately",
        "Use satisfying organization and assembly footage - ASMR elements of unpacking and arranging perform strongly",
        "Include room dimensions, product measurements, and practical details viewers need to visualize products in their spaces",
        "Show products in context rather than isolation - demonstrate how they fit within real room setups and lifestyles",
        "Test problem-solution angles around common home pain points: small spaces, clutter, rental restrictions, or budget constraints",
        "Include both wide room shots and close product detail shots to give viewers full context",
        "Feature diverse home styles and apartment types to broaden your content's relevance and appeal",
      ],
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
      extendedContent:
        "Pet content is one of TikTok's most engaging categories, with pet-related hashtags accumulating hundreds of billions of views. Pet owners are highly engaged viewers who actively seek products that improve their pets' lives, making this an ideal category for TikTok advertising. Successful pet product ads balance emotional connection with practical benefits - showing how products solve real problems while celebrating the joy pets bring to our lives. Our pet hooks capitalize on proven patterns that capture attention: cute pet reveals, humorous pet behavior, and genuine solutions to common pet owner challenges. The pet audience on TikTok responds well to authentic content that shows pets genuinely enjoying products rather than staged promotional content. Whether you're selling pet food, toys, accessories, grooming products, or services, our AI-generated scripts will help you create engaging content that resonates with passionate pet owners while driving conversions through demonstrated benefits and emotional appeal.",
      bestPractices: [
        "Show pets genuinely enjoying products - authentic reactions are more convincing than staged demonstrations",
        "Lead with common pet owner problems that your product solves: anxiety, mess, boredom, or health concerns",
        "Include diverse pet breeds, sizes, and types to broaden your content's appeal and relevance",
        "Use humor and cute moments generously - the pet audience on TikTok loves content that makes them smile or laugh",
        "Feature before/after results for grooming, training, or health-related products to demonstrate clear benefits",
        "Include safety and vet approval mentions for health-related products to build pet owner confidence",
        "Test both emotional hooks (bonding moments, rescue stories) and practical hooks (problem-solving, time-saving) to find what resonates",
      ],
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
      extendedContent:
        "Financial content on TikTok, often called #FinTok, has become a powerful force in financial education and product discovery, with billions of views on money-related content. While building trust is crucial for financial products, TikTok's format allows for approachable, jargon-free explanations of complex financial concepts. Successful finance TikTok ads balance education with promotion, providing genuine value while naturally introducing products and services as solutions. Our finance hooks are designed to build trust through expertise demonstration, relatable money struggles, and myth-busting that positions your brand as a knowledgeable ally. The finance audience on TikTok is particularly skeptical of overly promotional content, responding better to transparency and honest discussions about both benefits and limitations. Whether you're promoting investment platforms, banking services, budgeting tools, or financial education products, our AI-generated scripts will help you create trustworthy content that educates while it converts.",
      bestPractices: [
        "Lead with relatable money problems or misconceptions that your target audience faces to create immediate identification",
        "Provide genuine educational value in every video - viewers reward finance content that teaches them something useful",
        "Use specific numbers and examples rather than vague promises - '$500/month saved' is more compelling than 'save money'",
        "Include clear disclaimers about risks and limitations for investment or credit products - transparency builds trust",
        "Feature credible spokespeople or demonstrate expertise through clear, confident explanations",
        "Test myth-busting hooks that challenge common financial advice - controversial angles generate engagement and discussion",
        "Keep language simple and avoid jargon - TikTok viewers prefer straightforward explanations over financial terminology",
      ],
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
    extendedContent: `Discover our curated collection of ${hookCount} proven ${category} TikTok hooks designed to capture attention and drive engagement. These hooks are tested and optimized for ${category} brands looking to create viral TikTok ad content. Each hook in our library has been analyzed for performance across engagement metrics including watch time, shares, and conversion rates. Use our AI-powered script generator to transform these hooks into full ad scripts tailored to your specific products and brand voice.`,
    bestPractices: [
      "Test multiple hook variations to identify what resonates with your specific audience",
      "Align your hook with your video's visual content - ensure the promise is delivered",
      "Keep hooks under 3 seconds and front-load the most compelling words",
      "Use authentic delivery rather than overly promotional language",
      "Include clear calls-to-action that guide viewers on next steps",
    ],
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

        {/* Extended SEO Content Section */}
        <section className="mt-12 pt-8 border-t max-w-4xl">
          <h2 className="text-xl font-semibold mb-4">
            About {categoryInfo.title}
          </h2>
          <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed">
            <p>{categoryInfo.extendedContent}</p>
          </div>
        </section>

        {/* Best Practices Section */}
        {categoryInfo.bestPractices &&
          categoryInfo.bestPractices.length > 0 && (
            <section className="mt-12 pt-8 border-t max-w-4xl">
              <h2 className="text-xl font-semibold mb-6">
                Best Practices for {categoryCapitalized} TikTok Ads
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {categoryInfo.bestPractices.map((practice, index) => (
                  <div
                    key={index}
                    className="flex gap-3 p-4 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-sm font-semibold">
                      {index + 1}
                    </span>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {practice}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

        {relatedCategories.length > 0 && (
          <section className="mt-12 pt-8 border-t">
            <h2 className="text-xl font-semibold mb-4">Related Categories</h2>
            <div className="flex flex-wrap gap-3">
              {relatedCategories.map((cat) => (
                <Link
                  key={cat.category}
                  href={`/category/${cat.category}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-white hover:bg-gray-50 transition-colors min-h-[44px]"
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
