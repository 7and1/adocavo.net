import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { getBindings } from "@/lib/cloudflare";
import { getHookById, getHooks } from "@/lib/services/hooks";
import { getHookRatingStats } from "@/lib/services/ratings";
import {
  generateMetadata as buildMetadata,
  pageMetadata,
  getBreadcrumbJsonLd,
  getCreativeWorkJsonLd,
  safeJsonLdStringify,
} from "@/lib/seo";
import { getSeedHookById, getSeedHooks } from "@/lib/seed-hooks";
import type { HookCategory } from "@/lib/validations";
import { HookDetailContent } from "./HookDetailContent";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const env = getBindings();
  const hook = env.DB
    ? await getHookById(env.DB as D1Database, id)
    : getSeedHookById(id);
  if (!hook) {
    return buildMetadata({
      title: "Hook Not Found",
      description: "The requested hook could not be found",
    });
  }

  const seo = pageMetadata.hook(hook.text, hook.category, hook.engagementScore);
  const ogImage = `https://adocavo.net/hook/${id}/opengraph-image`;
  return buildMetadata({
    ...seo,
    alternatives: {
      canonical: `https://adocavo.net/hook/${id}`,
    },
    openGraph: {
      type: "article",
      title: seo.title,
      description: seo.description,
      url: `https://adocavo.net/hook/${id}`,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: seo.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [ogImage],
    },
  });
}

export default async function HookDetailPage({ params }: Props) {
  const { id } = await params;
  const env = getBindings();
  const hook = env.DB
    ? await getHookById(env.DB as D1Database, id)
    : getSeedHookById(id);
  if (!hook) {
    notFound();
  }

  const categoryCapitalized =
    hook.category.charAt(0).toUpperCase() + hook.category.slice(1);

  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "Home", url: "https://adocavo.net/" },
    {
      name: `${categoryCapitalized} TikTok Hooks`,
      url: `https://adocavo.net/category/${hook.category}`,
    },
    { name: hook.text.substring(0, 40), url: `https://adocavo.net/hook/${id}` },
  ]);

  const ratingStats = env.DB
    ? await getHookRatingStats(env.DB as D1Database, hook.id)
    : null;

  const creativeWorkJsonLd = getCreativeWorkJsonLd(
    {
      id: hook.id,
      text: hook.text,
      category: hook.category,
      engagementScore: hook.engagementScore,
    },
    ratingStats && ratingStats.totalRatings > 0 ? ratingStats : undefined,
  );

  const relatedHooks = (
    env.DB
      ? await getHooks(env.DB as D1Database, {
          category: hook.category as HookCategory,
          limit: 4,
        })
      : getSeedHooks({
          category: hook.category as HookCategory,
          limit: 4,
          page: 1,
        })
  )
    .filter((h) => h.id !== hook.id)
    .slice(0, 3);

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
          __html: safeJsonLdStringify(creativeWorkJsonLd),
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
            <li>
              <Link
                href={`/category/${hook.category}`}
                className="hover:text-gray-700 capitalize"
              >
                {hook.category} Hooks
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-700 truncate max-w-[200px]">
              {hook.text.substring(0, 30)}...
            </li>
          </ol>
        </nav>

        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium">
            <span className="capitalize">{hook.category}</span>
            <span>·</span>
            <span>Engagement {hook.engagementScore}/100</span>
          </div>

          <h1 className="text-4xl font-bold">&quot;{hook.text}&quot;</h1>

          <p className="text-lg text-gray-600">
            Remix this proven {hook.category} hook with your product details to
            generate three unique TikTok ad script angles.
          </p>

          <HookDetailContent hook={hook} />

          <section className="pt-8 border-t">
            <h2 className="text-xl font-semibold mb-4">About this hook</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border bg-gray-50 p-4">
                <p className="text-sm text-gray-500 mb-1">Category</p>
                <p className="font-medium capitalize">{hook.category}</p>
              </div>
              <div className="rounded-xl border bg-gray-50 p-4">
                <p className="text-sm text-gray-500 mb-1">Engagement Score</p>
                <p className="font-medium">{hook.engagementScore}/100</p>
              </div>
              {ratingStats && ratingStats.totalRatings > 0 && (
                <div className="rounded-xl border bg-gray-50 p-4">
                  <p className="text-sm text-gray-500 mb-1">
                    Average Script Rating
                  </p>
                  <p className="font-medium">
                    {ratingStats.averageRating.toFixed(1)} / 5 (
                    {ratingStats.totalRatings} ratings)
                  </p>
                </div>
              )}
            </div>
          </section>

          {relatedHooks.length > 0 && (
            <section className="pt-8 border-t">
              <h2 className="text-xl font-semibold mb-4">
                More {hook.category} hooks
              </h2>
              <div className="space-y-3">
                {relatedHooks.map((relatedHook) => (
                  <Link
                    key={relatedHook.id}
                    href={`/hook/${relatedHook.id}`}
                    className="block p-4 rounded-xl border hover:bg-gray-50 transition-colors"
                  >
                    <p className="font-medium">
                      &quot;{relatedHook.text}&quot;
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Engagement: {relatedHook.engagementScore}/100
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
