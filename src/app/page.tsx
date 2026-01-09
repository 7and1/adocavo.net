import { Suspense } from "react";
import { Header } from "@/components/Header";
import { HookGrid } from "@/components/HookGrid";
import { HookGridSkeleton } from "@/components/skeletons";
import { FakeDoorAnalyzeUrl } from "@/components/FakeDoorAnalyzeUrl";
import { SocialProof } from "@/components/SocialProof";
import { FAQ } from "@/components/FAQ";
import { getHooks, getCategories } from "@/lib/services/hooks";
import { getBindings } from "@/lib/cloudflare";
import {
  generateMetadata,
  pageMetadata,
  getWebApplicationJsonLd,
} from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export const metadata: Metadata = generateMetadata(pageMetadata.home);

async function HooksSection() {
  const env = getBindings();
  const db = env.DB as D1Database | undefined;
  if (!db) {
    return <HookGrid initialHooks={[]} categories={[]} />;
  }

  const [hooks, categories] = await Promise.all([
    getHooks(db),
    getCategories(db),
  ]);

  return <HookGrid initialHooks={hooks} categories={categories} />;
}

export default function HomePage() {
  const jsonLd = getWebApplicationJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main id="main-content" className="container mx-auto px-4 py-8">
        <section className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1 text-sm text-gray-500 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-primary-500" />
            50+ verified hook patterns
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 mt-6">
            Viral TikTok Hooks Library
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-6">
            Browse proven ad hooks and generate custom scripts instantly with
            AI. Perfect for e-commerce sellers, marketers, and UGC creators.
          </p>
          <div className="flex justify-center gap-4">
            <FakeDoorAnalyzeUrl />
          </div>
        </section>

        <Suspense fallback={<HookGridSkeleton />}>
          <HooksSection />
        </Suspense>

        <SocialProof />

        <section className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-4">
            What is a TikTok Hook?
          </h2>
          <p className="text-gray-600 text-center mb-8">
            A TikTok hook is the critical first 3 seconds of your ad that
            captures attention and stops the scroll. The best hooks create
            curiosity, address pain points, or make bold claims that viewers
            can&apos;t ignore. Our library contains 50+ proven patterns across
            beauty, tech, fitness, food, fashion, and more.
          </p>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="p-6 rounded-xl border bg-white">
              <div className="text-3xl mb-2">1-3</div>
              <div className="text-sm text-gray-500">Seconds to hook</div>
            </div>
            <div className="p-6 rounded-xl border bg-white">
              <div className="text-3xl mb-2">50+</div>
              <div className="text-sm text-gray-500">Proven patterns</div>
            </div>
            <div className="p-6 rounded-xl border bg-white">
              <div className="text-3xl mb-2">3</div>
              <div className="text-sm text-gray-500">
                Scripts per generation
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <FAQ />
        </section>

        <section className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">
            Ready to Create Viral TikTok Ads?
          </h2>
          <p className="text-gray-600 mb-6 max-w-xl mx-auto">
            Join 500+ marketers and creators using Adocavo to scale their
            creative testing.
          </p>
          <Link
            href="/blog"
            className="inline-block px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
          >
            Learn More About TikTok Ads
          </Link>
        </section>
      </main>
    </>
  );
}
