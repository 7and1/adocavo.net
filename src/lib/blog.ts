import { blogPosts, type BlogPost } from "@/data/blog-posts";

export interface BlogPostWithMeta extends BlogPost {
  readingTime: number;
}

function calculateReadingTime(content: string) {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function getAllBlogPosts(): BlogPostWithMeta[] {
  return blogPosts
    .map((post) => ({
      ...post,
      readingTime: calculateReadingTime(post.content),
    }))
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export function getPostBySlug(slug: string): BlogPostWithMeta {
  const post = blogPosts.find((p) => p.slug === slug);
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
