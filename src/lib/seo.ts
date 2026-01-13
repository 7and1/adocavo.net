import type { Metadata } from "next";

/**
 * Safely serializes JSON-LD data for use in dangerouslySetInnerHTML.
 * Escapes the closing script tag to prevent XSS attacks while keeping JSON valid.
 * This prevents injection of </script> tags that could break out of the JSON-LD script block.
 */
export function safeJsonLdStringify(data: unknown): string {
  const json = JSON.stringify(data);
  // Escape </script> in any form (case-insensitive) to prevent script breakout
  return json.replace(/<\s*\/\s*script/gi, "<\\/script>");
}

export interface SEOMetadata {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
  openGraph?: {
    type?: "website" | "article";
    url?: string;
    title?: string;
    description?: string;
    images?: { url: string; width?: number; height?: number; alt?: string }[];
  };
  twitter?: {
    card?: "summary" | "summary_large_image";
    title?: string;
    description?: string;
    images?: string[];
  };
  alternatives?: {
    canonical?: string;
    languages?: Record<string, string>;
  };
}

export function generateMetadata(seo: SEOMetadata): Metadata {
  const baseUrl = "https://adocavo.net";
  const defaultOgImage = `${baseUrl}/opengraph-image`;

  return {
    title: {
      default: seo.title,
      template: "%s | Adocavo",
    },
    description: seo.description,
    keywords: seo.keywords,
    authors: [{ name: "Adocavo Intelligence", url: baseUrl }],
    creator: "Adocavo Intelligence",
    publisher: "Adocavo Intelligence",
    openGraph: {
      type: seo.openGraph?.type || "website",
      locale: "en_US",
      alternateLocale: ["en_GB", "en_CA", "en_AU"],
      url: seo.openGraph?.url || seo.canonical || baseUrl,
      title: seo.openGraph?.title || seo.title,
      description: seo.openGraph?.description || seo.description,
      siteName: "Adocavo",
      images: seo.openGraph?.images || [
        {
          url: seo.ogImage || defaultOgImage,
          width: 1200,
          height: 630,
          alt: seo.title,
        },
      ],
    },
    twitter: {
      card: seo.twitter?.card || "summary_large_image",
      site: "@adocavo",
      creator: "@adocavo",
      title: seo.twitter?.title || seo.title,
      description: seo.twitter?.description || seo.description,
      images: seo.twitter?.images || [seo.ogImage || defaultOgImage],
    },
    alternates: {
      canonical: seo.alternatives?.canonical || seo.canonical,
      languages: seo.alternatives?.languages,
    },
    robots: seo.noindex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    verification: {
      google: "google-site-verification-token",
      yandex: "yandex-verification-token",
    },
    category: "Marketing",
  };
}

export const pageMetadata = {
  home: {
    title: "TikTok Hooks & Ad Script Generator | 50+ Viral Examples",
    description:
      "Generate high-converting TikTok ad scripts with AI. Browse 50+ proven viral hooks, create UGC-style content, and scale your creative testing in seconds.",
    keywords: [
      "tiktok hooks",
      "viral tiktok hooks",
      "tiktok ad generator",
      "ad script generator",
      "ugc script generator",
      "tiktok ad scripts",
      "tiktok creative",
      "ad copy generator",
      "tiktok marketing",
      "tiktok ads for ecommerce",
    ],
  },
  category: (category: string, count: number) => {
    const capitalized = capitalize(category);
    const categoryVariations = getCategoryVariations(category);
    return {
      title: `${capitalized} TikTok Hooks | ${count} Viral ${capitalized} Ad Examples`,
      description: `Discover ${count} proven ${category} TikTok hooks driving real results. Generate custom ${category} ad scripts with AI. Perfect for ${categoryVariations.products}.`,
      keywords: [
        `${category} tiktok hooks`,
        `${category} ad scripts`,
        `${category} tiktok ads`,
        `viral ${category} hooks`,
        `${category} ugc content`,
        `${category} creative ideas`,
        `${category} marketing`,
        `${category} tiktok creative`,
      ],
      openGraph: {
        type: "website" as const,
        title: `${capitalized} TikTok Hooks - ${count} Viral Examples`,
        description: `Browse ${count} proven ${category} TikTok hooks. Generate custom ad scripts for ${categoryVariations.products}.`,
      },
    };
  },
  hook: (text: string, category: string, engagementScore: number) => {
    const preview =
      text.length > 60 ? text.substring(0, 57) + "..." : `"${text}"`;
    const categoryCapitalized = capitalize(category);
    return {
      title: `${preview} | ${categoryCapitalized} TikTok Hook`,
      description: `Use this proven ${category} TikTok hook: "${text}". Engagement score: ${engagementScore}/100. Generate custom ad scripts with AI.`,
      keywords: [
        `${category} tiktok hook`,
        `viral ${category} hook`,
        "tiktok ad script",
        "ugc script generator",
        text.toLowerCase().substring(0, 30),
      ],
      openGraph: {
        type: "article" as const,
      },
    };
  },
  blog: (
    title: string,
    excerpt: string,
    slug: string,
    tags: string[] = [],
  ) => ({
    title,
    description: excerpt,
    keywords: [
      "tiktok ads",
      "ad script writing",
      "ugc content",
      "tiktok marketing",
      "tiktok creative strategy",
      "viral hooks",
      "tiktok advertising tips",
      ...tags,
    ],
    openGraph: {
      type: "article" as const,
    },
  }),
  blogIndex: {
    title: "TikTok Ad Script & Marketing Blog | Adocavo",
    description:
      "Learn TikTok ad scriptwriting, hook strategies, and creative scaling tactics from marketing experts.",
    keywords: [
      "tiktok ads blog",
      "tiktok marketing tips",
      "ad script writing guide",
      "ugc content strategy",
      "tiktok creative best practices",
      "tiktok advertising blog",
    ],
  },
  about: {
    title: "About Adocavo | AI-Powered TikTok Ad Script Generator",
    description:
      "Adocavo helps e-commerce brands and creators generate viral TikTok ad scripts using AI. Learn about our mission to democratize creative testing.",
    keywords: [
      "about adocavo",
      "tiktok ad script tool",
      "ai ad generator",
      "ugc script platform",
    ],
  },
  pricing: {
    title: "Pricing | AI TikTok Ad Script Generator",
    description:
      "Simple, transparent pricing for AI-powered TikTok ad script generation. Start free, scale as you grow.",
    keywords: [
      "adocavo pricing",
      "tiktok ad generator price",
      "script generator pricing",
      "ugc script tool cost",
    ],
  },
  privacy: {
    title: "Privacy Policy | Adocavo",
    description:
      "Learn how Adocavo collects, uses, and protects your data when you use our TikTok ad script generator.",
    keywords: ["adocavo privacy", "privacy policy", "data protection"],
  },
  terms: {
    title: "Terms of Service | Adocavo",
    description:
      "Review the terms for using Adocavo's TikTok hook library and AI script generator.",
    keywords: ["adocavo terms", "terms of service", "usage policy"],
  },
  examplesIndex: {
    title: "TikTok Ad Examples by Category | Adocavo",
    description:
      "Explore TikTok ad examples by category and niche with proven hook patterns and script angles. Find the right style for your beauty, tech, fitness, food, finance, pet, or niche brand.",
    keywords: [
      "tiktok ad examples",
      "tiktok ad script examples",
      "ugc ad examples",
      "viral tiktok hooks",
      "tiktok ad ideas",
      "tiktok marketing examples",
    ],
  },
  examplesNiche: (
    niche: {
      title: string;
      description: string;
      slug: string;
      keywords?: string[];
    },
    count = 0,
  ) => {
    const countLabel = count > 0 ? `${count}+` : "10+";
    return {
      title: niche.title,
      description: niche.description,
      keywords: niche.keywords || [
        niche.slug.replace(/-/g, " "),
        "tiktok hooks",
        "tiktok ad scripts",
        "ugc ad examples",
      ],
      openGraph: {
        type: "website" as const,
        title: niche.title,
        description: `Browse ${countLabel} hook ideas and script angles for ${niche.title}.`,
      },
    };
  },
  examplesCategory: (category: string, count = 0) => {
    const capitalized = capitalize(category);
    const categoryVariations = getCategoryVariations(category);
    const countLabel = count > 0 ? `${count}+` : "10+";
    return {
      title: `${capitalized} TikTok Ad Examples | ${countLabel} Hook Ideas`,
      description: `Browse ${countLabel} ${capitalized.toLowerCase()} TikTok ad examples and hook patterns. Generate scripts for ${categoryVariations.products} in seconds.`,
      keywords: [
        `${category} tiktok ad examples`,
        `${category} tiktok hooks`,
        `${category} ad script examples`,
        `${category} ugc ads`,
        `${category} marketing ideas`,
      ],
      openGraph: {
        type: "website" as const,
        title: `${capitalized} TikTok Ad Examples`,
        description: `Proven ${category} TikTok ad hooks and script ideas for ${categoryVariations.products}.`,
      },
    };
  },
};

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getCategoryVariations(category: string): { products: string } {
  const productMap: Record<string, string> = {
    beauty: "skincare, cosmetics, and beauty brands",
    fashion: "clothing, accessories, and fashion brands",
    food: "food, beverage, and CPG brands",
    fitness: "fitness, wellness, and supplement brands",
    tech: "tech, gadgets, and software products",
    home: "home goods, decor, and lifestyle products",
    pets: "pet products, accessories, and pet brands",
    gaming: "gaming, esports, and gaming accessories",
    finance: "fintech, banking, and financial services",
    education: "edtech, courses, and learning platforms",
    travel: "travel, tourism, and hospitality brands",
    automotive: "automotive, car accessories, and transportation",
  };
  return {
    products: productMap[category] || `${category} products and brands`,
  };
}

export function getBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function getWebApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Adocavo",
    url: "https://adocavo.net",
    description:
      "AI-powered TikTok ad script generator with a library of 50+ proven viral hooks",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free tier available with premium upgrades",
    },
    featureList: [
      "50+ viral TikTok hooks library",
      "AI-powered script generation",
      "Multiple creative angles per hook",
      "Category-based hook organization",
      "Engagement score tracking",
    ],
    browserRequirements:
      "Requires JavaScript. Compatible with all modern browsers.",
  };
}

export function getCreativeWorkJsonLd(
  hook: {
    id: string;
    text: string;
    category: string;
    engagementScore: number;
  },
  rating?: { averageRating: number; totalRatings: number },
) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: hook.text,
    text: hook.text,
    genre: hook.category,
    keywords: `${hook.category},tiktok hook,viral hook,ad script,ugc content`,
    aggregateRating:
      rating && rating.totalRatings > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: rating.averageRating,
            ratingCount: rating.totalRatings,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    author: {
      "@type": "Organization",
      name: "Adocavo Intelligence",
      url: "https://adocavo.net",
    },
    publisher: {
      "@type": "Organization",
      name: "Adocavo Intelligence",
      url: "https://adocavo.net",
      logo: {
        "@type": "ImageObject",
        url: "https://adocavo.net/og-default.svg",
      },
    },
  };
}

export function getArticleJsonLd(post: {
  title: string;
  excerpt: string;
  publishedAt: string;
  updatedAt: string;
  slug: string;
  featuredImage?: string;
  tags?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImage
      ? `https://adocavo.net${post.featuredImage}`
      : "https://adocavo.net/og-default.svg",
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Organization",
      name: "Adocavo Intelligence",
      url: "https://adocavo.net",
    },
    publisher: {
      "@type": "Organization",
      name: "Adocavo Intelligence",
      url: "https://adocavo.net",
      logo: {
        "@type": "ImageObject",
        url: "https://adocavo.net/og-default.svg",
        width: 1200,
        height: 630,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://adocavo.net/blog/${post.slug}`,
    },
    keywords: post.tags?.join(", "),
    articleSection: "Marketing",
    inLanguage: "en-US",
  };
}

export function getCollectionPageJsonLd(
  name: string,
  description: string,
  url: string,
  items: { name: string; url: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: `https://adocavo.net${url}`,
    numberOfItems: items.length,
    itemListElement: items.slice(0, 10).map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "CreativeWork",
        name: item.name,
        url: `https://adocavo.net${item.url}`,
      },
    })),
  };
}

export function getFAQJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}
