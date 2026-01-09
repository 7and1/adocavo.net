import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { getBindings } from "@/lib/cloudflare";
import { getHookById, getHooks } from "@/lib/services/hooks";
import {
  generateMetadata as buildMetadata,
  pageMetadata,
  getBreadcrumbJsonLd,
  getCreativeWorkJsonLd,
  safeJsonLdStringify,
} from "@/lib/seo";
import type { HookCategory } from "@/lib/validations";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const env = getBindings();
  if (!env.DB) {
    return buildMetadata({
      title: "Hook Not Found",
      description: "Database unavailable",
    });
  }

  const hook = await getHookById(env.DB as D1Database, id);
  if (!hook) {
    return buildMetadata({
      title: "Hook Not Found",
      description: "The requested hook could not be found",
    });
  }

  const seo = pageMetadata.hook(hook.text, hook.category, hook.engagementScore);
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
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  });
}

export default async function HookDetailPage({ params }: Props) {
  const { id } = await params;
  const env = getBindings();
  if (!env.DB) {
    return (
      <div className="text-center text-gray-500">Database unavailable.</div>
    );
  }

  const hook = await getHookById(env.DB as D1Database, id);
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

  const creativeWorkJsonLd = getCreativeWorkJsonLd({
    id: hook.id,
    text: hook.text,
    category: hook.category,
    engagementScore: hook.engagementScore,
  });

  const relatedHooks = await getHooks(env.DB as D1Database, {
    category: hook.category as HookCategory,
    limit: 4,
  }).then((hooks) => hooks.filter((h) => h.id !== hook.id).slice(0, 3));

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

          <div className="flex items-center gap-3">
            <Button asChild>
              <Link href={`/remix/${hook.id}`}>Remix this Hook</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/category/${hook.category}`}>
                Browse {hook.category} hooks
              </Link>
            </Button>
          </div>

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
