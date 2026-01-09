import type { Metadata } from "next";
import { generateMetadata, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = generateMetadata(pageMetadata.about);

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-4xl font-bold">About Adocavo</h1>
      <p className="text-lg text-gray-600">
        Adocavo helps e-commerce brands and creators generate high-performing
        TikTok ad scripts using proven hook patterns and AI remixing. Our
        mission is to make viral creative accessible without spending thousands
        on copywriters.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="text-xl font-semibold mb-2">Hook-first strategy</h2>
          <p className="text-gray-600">
            We curate hooks that grab attention in the first three seconds and
            keep viewers watching.
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="text-xl font-semibold mb-2">AI remix engine</h2>
          <p className="text-gray-600">
            Generate three unique script angles instantly so you can test fast
            and iterate faster.
          </p>
        </div>
      </div>

      <section className="pt-8 border-t">
        <h2 className="text-2xl font-semibold mb-4">Why Adocavo?</h2>
        <ul className="space-y-3">
          <li className="flex gap-3">
            <span className="text-primary-500 font-bold">50+</span>
            <span>Proven viral TikTok hooks across multiple categories</span>
          </li>
          <li className="flex gap-3">
            <span className="text-primary-500 font-bold">AI-powered</span>
            <span>Generate unique script angles in seconds</span>
          </li>
          <li className="flex gap-3">
            <span className="text-primary-500 font-bold">Data-driven</span>
            <span>Engagement scores help you pick winning hooks</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
