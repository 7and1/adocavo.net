import { blogPosts, type BlogPost } from "@/data/blog-posts";
import { additionalBlogPosts } from "@/lib/additional-blog-posts";
import { comparisonPages } from "@/data/comparison-pages";
import { categoryDeepDives } from "@/data/category-deep-dives";
import { loadBlogContentServer } from "./blog-loader";

// Combine all content sources (metadata only - content loaded separately)
export const allBlogPosts: BlogPost[] = [
  ...blogPosts,
  ...additionalBlogPosts,
  ...comparisonPages,
  ...categoryDeepDives,
];

export interface BlogPostWithMeta extends Omit<BlogPost, "content"> {
  content?: string;
  readingTime: number;
}

function calculateReadingTime(content: string) {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

// Estimated reading time based on excerpt (for list views)
function calculateEstimatedReadingTime(excerpt: string) {
  const words = excerpt.split(/\s+/).filter(Boolean).length;
  // Estimate: ~300 words per minute for blog posts
  const estimatedWords = words * 15; // Assume full post is ~15x excerpt
  return Math.max(1, Math.ceil(estimatedWords / 200));
}

/**
 * Get all blog posts with metadata (no content loaded)
 * Use this for list views to minimize bundle size
 * Optimized to exclude content field from bundle
 */
export function getAllBlogPosts(): BlogPostWithMeta[] {
  return allBlogPosts
    .map((post) => {
      // Explicitly exclude content to prevent bundling
      const { content, ...postWithoutContent } = post;
      return {
        ...postWithoutContent,
        readingTime: content
          ? calculateReadingTime(content)
          : calculateEstimatedReadingTime(post.excerpt),
      };
    })
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

/**
 * Get a single blog post by slug with full content
 * For RSC/server components - loads content from JSON files
 */
export async function getPostBySlug(slug: string): Promise<BlogPostWithMeta> {
  const post = allBlogPosts.find((p) => p.slug === slug);
  if (!post) {
    throw new Error("Post not found");
  }

  // Try to load content from JSON file first (new optimized path)
  const blogContent = await loadBlogContentServer(slug);

  const content = blogContent?.content || post.content || "";

  return {
    ...post,
    content,
    readingTime: calculateReadingTime(content || post.excerpt),
  };
}

/**
 * Get a single blog post by slug (synchronous version)
 * Falls back to embedded content if available
 * Use this for static generation or when async is not available
 */
export function getPostBySlugSync(slug: string): BlogPostWithMeta {
  const post = allBlogPosts.find((p) => p.slug === slug);
  if (!post) {
    throw new Error("Post not found");
  }

  const content = post.content || "";

  return {
    ...post,
    content,
    readingTime: calculateReadingTime(content || post.excerpt),
  };
}

export function getRelatedPosts(currentId: string, limit = 3) {
  return getAllBlogPosts()
    .filter((post) => post.id !== currentId)
    .slice(0, limit);
}

export function getPostsByTag(tag: string): BlogPostWithMeta[] {
  return getAllBlogPosts().filter((post) =>
    post.tags.some((t) => t.toLowerCase() === tag.toLowerCase()),
  );
}

export function getPostsByCategory(category: string): BlogPostWithMeta[] {
  const categoryLower = category.toLowerCase();
  return getAllBlogPosts().filter((post) =>
    post.tags.some((t) => t.toLowerCase().includes(categoryLower)),
  );
}
