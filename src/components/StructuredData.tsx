import { safeJsonLdStringify } from "@/lib/seo";
import type { BlogPostWithMeta } from "@/lib/blog";

export function BlogPostSchema({ post }: { post: BlogPostWithMeta }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    description: post.excerpt,
    author: {
      "@type": "Organization",
      name: "Adocavo Intelligence",
    },
    publisher: {
      "@type": "Organization",
      name: "Adocavo Intelligence",
      logo: {
        "@type": "ImageObject",
        url: "https://adocavo.net/og-default.svg",
      },
    },
    image: post.featuredImage
      ? `https://adocavo.net${post.featuredImage}`
      : "https://adocavo.net/og-default.svg",
    mainEntityOfPage: `https://adocavo.net/blog/${post.slug}`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(data) }}
    />
  );
}
