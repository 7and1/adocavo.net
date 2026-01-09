import { getAllBlogPosts } from "@/lib/blog";
import { getBindings } from "@/lib/cloudflare";
import { getCategories, getHooks } from "@/lib/services/hooks";

interface SitemapEntry {
  url: string;
  lastModified?: string | Date;
  changeFrequency?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: number;
}

function getPriorityFromEngagement(score: number): number {
  if (score >= 80) return 0.8;
  if (score >= 60) return 0.7;
  return 0.6;
}

export default async function sitemap(): Promise<SitemapEntry[]> {
  const baseUrl = "https://adocavo.net";
  const urls: SitemapEntry[] = [
    { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/blog`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/pricing`, changeFrequency: "monthly", priority: 0.6 },
  ];

  const blogPosts = getAllBlogPosts();
  blogPosts.forEach((post) => {
    urls.push({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  });

  const env = getBindings();
  if (env.DB) {
    const [hooks, categories] = await Promise.all([
      getHooks(env.DB as D1Database, { limit: 500, page: 1 }),
      getCategories(env.DB as D1Database),
    ]);

    // Category pages have high priority for SEO
    categories.forEach((category) => {
      urls.push({
        url: `${baseUrl}/category/${category.category}`,
        changeFrequency: "weekly",
        priority: 0.9,
      });
    });

    // Hook pages with dynamic priority based on engagement
    hooks.forEach((hook) => {
      urls.push({
        url: `${baseUrl}/hook/${hook.id}`,
        lastModified: new Date(hook.updatedAt),
        changeFrequency: "monthly",
        priority: getPriorityFromEngagement(hook.engagementScore),
      });
    });
  }

  return urls;
}
