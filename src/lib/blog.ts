import { blogPosts, type BlogPost } from "@/data/blog-posts";
import { additionalBlogPosts } from "@/lib/additional-blog-posts";
import { comparisonPages } from "@/data/comparison-pages";
import { categoryDeepDives } from "@/data/category-deep-dives";

// Combine all content sources
export const allBlogPosts: BlogPost[] = [
  ...blogPosts,
  ...additionalBlogPosts,
  ...comparisonPages,
  ...categoryDeepDives,
];

export interface BlogPostWithMeta extends BlogPost {
  readingTime: number;
}

function calculateReadingTime(content: string) {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function getAllBlogPosts(): BlogPostWithMeta[] {
  return allBlogPosts
    .map((post) => ({
      ...post,
      readingTime: calculateReadingTime(post.content),
    }))
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export function getPostBySlug(slug: string): BlogPostWithMeta {
  const post = allBlogPosts.find((p) => p.slug === slug);
  if (!post) {
    throw new Error("Post not found");
  }
  return { ...post, readingTime: calculateReadingTime(post.content) };
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
