import type { Metadata } from "next";
import { getAllBlogPosts } from "@/lib/blog";
import { BlogCard } from "@/components/BlogCard";
import { generateMetadata, pageMetadata } from "@/lib/seo";
import { getFAQJsonLd } from "@/lib/seo";

export const metadata: Metadata = generateMetadata(pageMetadata.blogIndex);

export default function BlogPage() {
  const posts = getAllBlogPosts();
  const featuredPost = posts[0];
  const remainingPosts = posts.slice(1);

  const jsonLd = getFAQJsonLd([
    {
      q: "What types of TikTok ad content do you cover?",
      a: "We cover everything from viral hook patterns and scriptwriting frameworks to category-specific strategies for beauty, tech, fitness, and more. Our posts include real examples, templates, and actionable tactics you can apply immediately.",
    },
    {
      q: "Are your script templates free to use?",
      a: "Yes. All the script frameworks and templates shared in our blog posts are free to use and adapt for your own TikTok ads. They're based on proven patterns from viral ads across multiple categories.",
    },
  ]);

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-3">
          TikTok Ad Script & Marketing Blog
        </h1>
        <p className="text-lg text-gray-600">
          Learn TikTok ad scriptwriting, hook strategies, and creative scaling
          tactics from marketing experts.
        </p>
      </div>

      {featuredPost && (
        <section>
          <h2 className="text-sm uppercase tracking-wide text-gray-400 mb-3">
            Featured
          </h2>
          <BlogCard post={featuredPost} />
        </section>
      )}

      <section>
        <h2 className="text-sm uppercase tracking-wide text-gray-400 mb-3">
          Latest Articles
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {remainingPosts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      </section>

      <section className="pt-8 border-t">
        <h2 className="text-2xl font-semibold mb-4">Topics we cover</h2>
        <div className="flex flex-wrap gap-3">
          {[
            "TikTok Ad Scripts",
            "Viral Hooks",
            "UGC Content",
            "Copywriting Frameworks",
            "Creative Testing",
            "E-commerce Marketing",
            "Beauty Ads",
            "Tech Product Ads",
            "Fitness Marketing",
            "Platform Strategy",
          ].map((topic) => (
            <span
              key={topic}
              className="px-4 py-2 rounded-full border bg-white text-gray-700"
            >
              {topic}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
