/**
 * Dynamic Blog Content Loader
 *
 * This module provides lazy-loading functionality for blog content to reduce
 * the initial bundle size. Blog content is stored in /public/content/blog/
 * as individual JSON files that are fetched on-demand.
 */

import { cache } from "react";

export interface BlogContent {
  id: string;
  slug: string;
  content: string;
}

// In-memory cache for server-side requests
const contentCache = new Map<string, BlogContent>();

/**
 * Server-side content loader with caching
 * Uses React.cache for automatic memoization in RSC
 */
export const loadBlogContentServer = cache(
  async (slug: string): Promise<BlogContent | null> => {
    // Check cache first
    if (contentCache.has(slug)) {
      return contentCache.get(slug)!;
    }

    try {
      // Import the content file directly (works for /public in Next.js)
      // Note: For Cloudflare Pages, we use fetch instead
      if (typeof window === "undefined") {
        // Server-side: try direct file access or fetch
        const baseUrl =
          process.env.NEXT_PUBLIC_SITE_URL || "https://adocavo.net";
        const response = await fetch(`${baseUrl}/content/blog/${slug}.json`, {
          next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (!response.ok) {
          return null;
        }

        const content: BlogContent = await response.json();
        contentCache.set(slug, content);
        return content;
      }

      return null;
    } catch {
      return null;
    }
  },
);

/**
 * Client-side content loader
 * Fetches content from /public/content/blog/{slug}.json
 */
export async function loadBlogContentClient(
  slug: string,
): Promise<BlogContent | null> {
  try {
    const response = await fetch(`/content/blog/${slug}.json`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Prefetch multiple blog contents for caching
 * Useful for related posts sections
 */
export async function prefetchBlogContents(
  slugs: string[],
): Promise<Map<string, BlogContent>> {
  const results = new Map<string, BlogContent>();

  await Promise.all(
    slugs.map(async (slug) => {
      const content = await loadBlogContentServer(slug);
      if (content) {
        results.set(slug, content);
      }
    }),
  );

  return results;
}

/**
 * Get all available blog slugs
 */
export async function getAllBlogSlugs(): Promise<string[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://adocavo.net";
    const response = await fetch(`${baseUrl}/content/blog/index.json`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      return [];
    }
    return await response.json();
  } catch {
    return [];
  }
}
