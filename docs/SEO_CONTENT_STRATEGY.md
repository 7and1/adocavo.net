# SEO & Content Strategy - Adocavo Intelligence

## Document Purpose

This document outlines the comprehensive SEO and content marketing strategy for Adocavo Intelligence, including on-page optimization, content pillars, and the hook library as an SEO magnet.

**Version**: 1.0.0
**Last Updated**: 2026-01-09
**Reference**: [BLUEPRINT.md](./BLUEPRINT.md)

---

## 1. SEO Foundation

### 1.1 Target Keywords

#### Primary Keywords (High Intent)

| Keyword                    | Monthly Volume | Difficulty | Intent        |
| -------------------------- | -------------- | ---------- | ------------- |
| tiktok ad script generator | 2,400          | Medium     | Transactional |
| tiktok hook generator      | 1,600          | Low        | Transactional |
| ugc script template        | 1,900          | Medium     | Informational |
| tiktok ad copy generator   | 1,200          | Low        | Transactional |
| viral tiktok hooks         | 3,600          | Medium     | Informational |

#### Secondary Keywords (Supporting)

| Keyword                  | Monthly Volume | Difficulty | Intent        |
| ------------------------ | -------------- | ---------- | ------------- |
| tiktok ad examples       | 8,100          | High       | Informational |
| how to write tiktok ads  | 2,900          | Medium     | Informational |
| ugc ad script            | 1,300          | Low        | Transactional |
| tiktok ad hooks examples | 880            | Low        | Informational |
| best tiktok ad hooks     | 720            | Low        | Informational |

#### Long-Tail Keywords (Quick Wins)

- "tiktok ad script template for [niche]" (beauty, fitness, tech, etc.)
- "viral hook examples for [category]"
- "ugc script generator free"
- "tiktok ad copywriting tips"
- "how to start a tiktok ad script"

### 1.2 Site Architecture for SEO

```
adocavo.net/
|
+-- / (Home - Hook Library)
|   Primary: "viral tiktok hooks", "tiktok hook generator"
|   H1: "Viral TikTok Hooks Library - Generate Ad Scripts in Seconds"
|
+-- /category/[category]
|   |-- /category/beauty
|   |   Primary: "beauty tiktok ad hooks", "skincare ad scripts"
|   |
|   |-- /category/tech
|   |   Primary: "tech product tiktok ads", "gadget ad hooks"
|   |
|   |-- /category/fitness
|   |   Primary: "fitness tiktok hooks", "gym product ad scripts"
|   |
|   +-- /category/[other categories...]
|
+-- /remix/[hook-id]
|   Dynamic pages, noindex (user-generated content)
|
+-- /blog/
|   |-- /blog/tiktok-ad-script-guide
|   |   Primary: "how to write tiktok ads", "tiktok ad script template"
|   |
|   |-- /blog/viral-hook-patterns
|   |   Primary: "viral tiktok hooks", "tiktok hook examples"
|   |
|   +-- /blog/[other posts...]
|
+-- /examples/
|   |-- /examples/beauty-tiktok-ads
|   |   Primary: "beauty tiktok ad examples", "skincare ad scripts"
|   |
|   +-- /examples/[category]-tiktok-ads
|
+-- /about
+-- /pricing (Coming Soon page)
```

---

## 2. On-Page SEO Implementation

### 2.1 Meta Tags Component

```typescript
// src/lib/seo.ts
export interface SEOMetadata {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
}

export function generateMetadata(seo: SEOMetadata): Metadata {
  const baseUrl = "https://adocavo.net";
  const defaultOgImage = `${baseUrl}/og-default.png`;

  return {
    title: {
      default: seo.title,
      template: "%s | Adocavo Intelligence",
    },
    description: seo.description,
    keywords: seo.keywords,
    openGraph: {
      type: "website",
      locale: "en_US",
      url: seo.canonical || baseUrl,
      title: seo.title,
      description: seo.description,
      siteName: "Adocavo Intelligence",
      images: [
        {
          url: seo.ogImage || defaultOgImage,
          width: 1200,
          height: 630,
          alt: seo.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [seo.ogImage || defaultOgImage],
    },
    alternates: {
      canonical: seo.canonical,
    },
    robots: seo.noindex ? { index: false, follow: false } : undefined,
  };
}

// Page-specific metadata generators
export const pageMetadata = {
  home: {
    title: "Viral TikTok Hooks Library - Generate Ad Scripts in Seconds",
    description:
      "Browse 50+ proven viral TikTok hooks and generate AI-powered ad scripts instantly. Free to start, perfect for e-commerce sellers and marketers.",
    keywords: [
      "tiktok hooks",
      "viral hooks",
      "tiktok ad generator",
      "ugc script generator",
      "ad copy generator",
    ],
  },

  category: (category: string, count: number) => ({
    title: `${capitalize(category)} TikTok Ad Hooks - ${count} Viral Examples`,
    description: `Discover ${count} proven ${category} TikTok hooks that drive engagement. Generate custom ad scripts for your ${category} products in seconds.`,
    keywords: [
      `${category} tiktok hooks`,
      `${category} ad scripts`,
      `${category} viral ads`,
      `${category} ugc content`,
    ],
    canonical: `https://adocavo.net/category/${category}`,
  }),

  blog: (title: string, excerpt: string, slug: string) => ({
    title,
    description: excerpt,
    canonical: `https://adocavo.net/blog/${slug}`,
  }),
};

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
```

### 2.2 Home Page SEO

```typescript
// src/app/page.tsx
import { generateMetadata, pageMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = generateMetadata(pageMetadata.home);

export default async function HomePage() {
  return (
    <main>
      {/* H1 - Primary keyword */}
      <h1 className="text-4xl font-bold">
        Viral TikTok Hooks Library
      </h1>

      {/* Subheading with secondary keywords */}
      <p className="text-xl text-gray-600">
        Browse 50+ proven ad hooks and generate custom scripts instantly with AI.
        Perfect for e-commerce sellers, marketers, and UGC creators.
      </p>

      {/* SEO-rich content section */}
      <section className="prose max-w-none">
        <h2>What is a TikTok Hook?</h2>
        <p>
          A TikTok hook is the critical first 3 seconds of your ad that captures
          attention and stops the scroll. The best hooks create curiosity, address
          pain points, or make bold claims that viewers can't ignore.
        </p>

        <h2>How Our Hook Library Works</h2>
        <p>
          Our curated library contains viral hook patterns from top-performing
          TikTok ads across categories like beauty, tech, fitness, and more.
          Each hook is scored by engagement level, so you can prioritize
          the most effective patterns.
        </p>
      </section>

      {/* Hook grid with proper markup */}
      <HookGrid />
    </main>
  );
}
```

### 2.3 Category Pages SEO

```typescript
// src/app/category/[category]/page.tsx
import { generateMetadata, pageMetadata } from '@/lib/seo';
import { getHooksByCategory, getCategoryCount } from '@/lib/services/hooks';
import type { Metadata } from 'next';
import type { HookCategory } from '@/lib/schema';

interface Props {
  params: { category: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = params.category as HookCategory;
  const count = await getCategoryCount(category);
  return generateMetadata(pageMetadata.category(category, count));
}

export async function generateStaticParams() {
  return [
    { category: 'beauty' },
    { category: 'tech' },
    { category: 'fitness' },
    { category: 'finance' },
    { category: 'pets' },
    { category: 'food' },
  ];
}

export default async function CategoryPage({ params }: Props) {
  const category = params.category as HookCategory;
  const hooks = await getHooksByCategory(category);

  const categoryDescriptions: Record<HookCategory, string> = {
    beauty: 'skincare, makeup, and beauty product ads',
    tech: 'gadgets, apps, and technology product ads',
    fitness: 'gym equipment, supplements, and fitness program ads',
    finance: 'financial services, courses, and investment ads',
    pets: 'pet products, food, and accessories ads',
    food: 'food products, recipes, and kitchen gadget ads',
  };

  return (
    <main>
      {/* H1 with category keyword */}
      <h1 className="text-3xl font-bold capitalize">
        {category} TikTok Ad Hooks
      </h1>

      {/* Category description for SEO */}
      <p className="text-lg text-gray-600">
        Discover {hooks.length} proven hooks for {categoryDescriptions[category]}.
        These viral patterns have generated millions of views and conversions.
      </p>

      {/* Breadcrumb for structured navigation */}
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex gap-2">
          <li><a href="/">Home</a></li>
          <li>/</li>
          <li className="capitalize">{category} Hooks</li>
        </ol>
      </nav>

      {/* Hook grid */}
      <HookGrid hooks={hooks} />

      {/* Category-specific content for SEO */}
      <section className="prose max-w-none mt-12">
        <h2>Best Practices for {capitalize(category)} TikTok Ads</h2>
        <CategoryContent category={category} />
      </section>
    </main>
  );
}
```

### 2.4 Structured Data (JSON-LD)

```typescript
// src/components/StructuredData.tsx
export function HomePageSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Adocavo Intelligence',
    description: 'AI-powered TikTok ad script generator with viral hook library',
    url: 'https://adocavo.net',
    applicationCategory: 'MarketingApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: '10 free credits to start',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '127',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function HookSchema({ hook }: { hook: Hook }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `TikTok Ad Hook: "${hook.text}"`,
    description: `Use this viral ${hook.category} hook pattern to create engaging TikTok ads`,
    step: [
      {
        '@type': 'HowToStep',
        name: 'Start with the hook',
        text: hook.text,
      },
      {
        '@type': 'HowToStep',
        name: 'Add your product details',
        text: 'Describe your product features and benefits',
      },
      {
        '@type': 'HowToStep',
        name: 'Generate scripts',
        text: 'Get 3 AI-generated script variations',
      },
    ],
    tool: {
      '@type': 'HowToTool',
      name: 'Adocavo Intelligence',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function BlogPostSchema({ post }: { post: BlogPost }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImage,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      '@type': 'Organization',
      name: 'Adocavo Intelligence',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Adocavo Intelligence',
      logo: {
        '@type': 'ImageObject',
        url: 'https://adocavo.net/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://adocavo.net/blog/${post.slug}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function FAQSchema({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

---

## 3. Hook Library as SEO Magnet

### 3.1 Strategy Overview

The hook library serves dual purposes:

1. **User Value**: Help users discover viral patterns
2. **SEO Value**: Generate organic traffic through category/keyword pages

### 3.2 Category Landing Pages

Each category page targets specific keyword clusters:

| Category | Primary Keyword     | Secondary Keywords                          |
| -------- | ------------------- | ------------------------------------------- |
| Beauty   | beauty tiktok hooks | skincare ad scripts, makeup ad examples     |
| Tech     | tech product ads    | gadget tiktok hooks, app marketing scripts  |
| Fitness  | fitness tiktok ads  | gym equipment hooks, supplement ad scripts  |
| Finance  | finance tiktok ads  | investment hook examples, course ad scripts |
| Pets     | pet product hooks   | dog product ads, cat product tiktok         |
| Food     | food tiktok hooks   | recipe ad scripts, kitchen gadget ads       |

### 3.3 Hook Detail Pages (SEO-Optimized)

```typescript
// src/app/hook/[id]/page.tsx
// Note: These are public, indexable pages showing hook details

import { getHookById } from '@/lib/services/hooks';
import { HookSchema } from '@/components/StructuredData';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const hook = await getHookById(params.id);
  if (!hook) return { title: 'Hook Not Found' };

  return {
    title: `"${hook.text.slice(0, 50)}..." - ${hook.category} TikTok Hook`,
    description: `Use this viral ${hook.category} hook pattern for your TikTok ads. Engagement score: ${hook.engagementScore}/100. Generate custom scripts instantly.`,
    openGraph: {
      title: `Viral ${hook.category} Hook`,
      description: hook.text,
      images: [generateHookOGImage(hook)],
    },
  };
}

export default async function HookDetailPage({ params }: Props) {
  const hook = await getHookById(params.id);
  if (!hook) notFound();

  // Get similar hooks for internal linking
  const relatedHooks = await getRelatedHooks(hook.category, hook.id);

  return (
    <main>
      <HookSchema hook={hook} />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <ol className="flex gap-2 text-sm">
          <li><a href="/">Hooks</a></li>
          <li>/</li>
          <li><a href={`/category/${hook.category}`} className="capitalize">{hook.category}</a></li>
          <li>/</li>
          <li>Hook Details</li>
        </ol>
      </nav>

      {/* Hook display */}
      <h1 className="text-2xl font-bold mt-6">
        {hook.category.charAt(0).toUpperCase() + hook.category.slice(1)} TikTok Hook
      </h1>

      <blockquote className="text-3xl font-semibold my-6 p-6 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl">
        "{hook.text}"
      </blockquote>

      {/* CTA */}
      <div className="flex gap-4 my-8">
        <Link href={`/remix/${hook.id}`}>
          <Button size="lg">Remix This Hook</Button>
        </Link>
      </div>

      {/* SEO content */}
      <section className="prose max-w-none">
        <h2>How to Use This Hook</h2>
        <p>
          This hook works best for {hook.category} products because it immediately
          addresses a common pain point or desire in this market. The key is to
          deliver on the hook's promise in the first few seconds of your video.
        </p>

        <h2>Script Structure Tips</h2>
        <ul>
          <li>Start with the hook as your opening line</li>
          <li>Show the problem/solution within 5 seconds</li>
          <li>Include a clear call-to-action</li>
          <li>Keep total length under 30 seconds for best engagement</li>
        </ul>
      </section>

      {/* Related hooks for internal linking */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-4">
          More {hook.category} Hooks
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {relatedHooks.map((related) => (
            <HookCard key={related.id} hook={related} />
          ))}
        </div>
      </section>
    </main>
  );
}
```

---

## 4. Content Marketing Plan

### 4.1 Content Pillars

| Pillar           | Purpose                      | Frequency | Target Keywords                       |
| ---------------- | ---------------------------- | --------- | ------------------------------------- |
| Hook Tutorials   | Educate on hook patterns     | 2x/month  | "tiktok hook examples", "viral hooks" |
| Script Templates | Provide actionable templates | 2x/month  | "tiktok ad script template"           |
| Case Studies     | Show results/proof           | 1x/month  | "tiktok ad examples that work"        |
| Industry Guides  | Category-specific deep dives | 1x/month  | "[category] tiktok marketing"         |

### 4.2 Blog Post Templates

#### Template 1: Hook Breakdown Post

```markdown
# [Number] [Category] TikTok Hooks That Convert (+ Script Templates)

## Introduction

Brief intro on why [category] hooks matter, mention engagement stats.

## Hook #1: "[Hook Text]"

### Why It Works

Psychological principle behind the hook.

### Example Script

Full script with [Visual] and (Audio) formatting.

### Best For

Product types this hook works best with.

[Repeat for each hook]

## How to Use These Hooks

Step-by-step guide to remixing.

## FAQ

Common questions about [category] TikTok ads.

## Generate Your Own Scripts

CTA to hook library.
```

#### Template 2: Strategy Guide

```markdown
# The Complete Guide to [Category] TikTok Advertising in 2026

## Why [Category] Brands Are Winning on TikTok

Market data, growth stats.

## The Anatomy of a Viral [Category] Ad

Breakdown of successful ad structure.

## Top [Category] Hooks We've Analyzed

Examples with engagement scores.

## Script Writing Best Practices

Dos and don'ts for [category] scripts.

## Tools and Resources

Link to hook library, mention AI script generator.

## Conclusion

Summary and CTA.
```

### 4.3 Editorial Calendar (First 3 Months)

#### Month 1: Foundation

| Week | Post                                          | Target Keyword      | Type     |
| ---- | --------------------------------------------- | ------------------- | -------- |
| 1    | "50 Viral TikTok Hooks That Stop the Scroll"  | viral tiktok hooks  | Listicle |
| 2    | "How to Write TikTok Ad Scripts That Convert" | tiktok ad script    | Guide    |
| 3    | "Beauty Brand TikTok Ads: 10 Hooks That Work" | beauty tiktok ads   | Category |
| 4    | "TikTok Hook Formula: The 3-Second Rule"      | tiktok hook formula | Tutorial |

#### Month 2: Category Expansion

| Week | Post                                           | Target Keyword           | Type       |
| ---- | ---------------------------------------------- | ------------------------ | ---------- |
| 1    | "Tech Product TikTok Ads: Hook Examples"       | tech product tiktok ads  | Category   |
| 2    | "UGC Script Templates for E-commerce"          | ugc script template      | Template   |
| 3    | "Fitness TikTok Marketing Guide 2026"          | fitness tiktok marketing | Guide      |
| 4    | "How This Brand 10x'd Sales with TikTok Hooks" | -                        | Case Study |

#### Month 3: Depth & Authority

| Week | Post                                      | Target Keyword        | Type       |
| ---- | ----------------------------------------- | --------------------- | ---------- |
| 1    | "Finance TikTok Ads That Actually Work"   | finance tiktok ads    | Category   |
| 2    | "TikTok Ad Copywriting: Complete Course"  | tiktok ad copywriting | Pillar     |
| 3    | "Pet Product TikTok Marketing Strategy"   | pet product marketing | Category   |
| 4    | "AI Script Generation vs. Manual Writing" | -                     | Comparison |

### 4.4 Blog Post Page Implementation

```typescript
// src/app/blog/[slug]/page.tsx
import { getPostBySlug, getRelatedPosts } from '@/lib/blog';
import { BlogPostSchema } from '@/components/StructuredData';
import { MDXRemote } from 'next-mdx-remote/rsc';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: ['Adocavo Intelligence'],
      tags: post.tags,
    },
  };
}

export default async function BlogPost({ params }: Props) {
  const post = await getPostBySlug(params.slug);
  const related = await getRelatedPosts(post.id, 3);

  return (
    <article>
      <BlogPostSchema post={post} />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <ol className="flex gap-2 text-sm mb-4">
          <li><a href="/">Home</a></li>
          <li>/</li>
          <li><a href="/blog">Blog</a></li>
          <li>/</li>
          <li>{post.title}</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        <div className="flex gap-4 text-sm text-gray-500">
          <time dateTime={post.publishedAt}>
            {formatDate(post.publishedAt)}
          </time>
          <span>{post.readingTime} min read</span>
        </div>
      </header>

      {/* Featured image */}
      {post.featuredImage && (
        <img
          src={post.featuredImage}
          alt={post.title}
          className="w-full rounded-xl mb-8"
        />
      )}

      {/* Content */}
      <div className="prose prose-lg max-w-none">
        <MDXRemote source={post.content} />
      </div>

      {/* CTA */}
      <div className="my-12 p-8 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl text-center">
        <h3 className="text-2xl font-bold mb-4">
          Ready to Generate Your Own Scripts?
        </h3>
        <p className="text-gray-600 mb-6">
          Browse our library of {50}+ viral hooks and create custom ad scripts instantly.
        </p>
        <Link href="/">
          <Button size="lg">Explore Hook Library</Button>
        </Link>
      </div>

      {/* Related posts */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Related Articles</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {related.map((relatedPost) => (
            <BlogCard key={relatedPost.id} post={relatedPost} />
          ))}
        </div>
      </section>
    </article>
  );
}
```

---

## 5. Social Proof Strategy

### 5.1 Trust Signals

```typescript
// src/components/SocialProof.tsx
export function SocialProof() {
  const stats = [
    { value: '10K+', label: 'Scripts Generated' },
    { value: '500+', label: 'Active Users' },
    { value: '4.8', label: 'User Rating' },
    { value: '50+', label: 'Viral Hooks' },
  ];

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">
          Trusted by E-commerce Sellers & Marketers
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-primary-600">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Testimonials() {
  const testimonials = [
    {
      quote: "Generated 20 scripts in an hour that would have taken me days to write.",
      author: "Sarah M.",
      role: "Shopify Store Owner",
      avatar: "/testimonials/sarah.jpg",
    },
    {
      quote: "The hooks library is gold. Found patterns I never would have thought of.",
      author: "Mike R.",
      role: "Performance Marketer",
      avatar: "/testimonials/mike.jpg",
    },
    {
      quote: "Finally an AI tool that actually sounds like a real TikToker.",
      author: "Jessica L.",
      role: "UGC Creator",
      avatar: "/testimonials/jessica.jpg",
    },
  ];

  return (
    <section className="py-12">
      <h2 className="text-2xl font-bold text-center mb-8">
        What Our Users Say
      </h2>

      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <blockquote
            key={i}
            className="p-6 border rounded-xl bg-white"
          >
            <p className="text-gray-700 mb-4">"{t.quote}"</p>
            <footer className="flex items-center gap-3">
              <img
                src={t.avatar}
                alt={t.author}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <cite className="font-medium not-italic">{t.author}</cite>
                <p className="text-sm text-gray-500">{t.role}</p>
              </div>
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
```

### 5.2 User-Generated Social Proof

Encourage users to share results:

- Twitter/X share button after generation
- "Share Your Results" CTA
- Community showcase section

---

## 6. Technical SEO Checklist

### 6.1 Performance

- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] First Input Delay (FID) < 100ms
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] Images optimized with next/image
- [ ] JavaScript bundle < 100KB initial load

### 6.2 Indexability

- [ ] XML sitemap at /sitemap.xml
- [ ] robots.txt properly configured
- [ ] Canonical URLs on all pages
- [ ] No duplicate content issues
- [ ] Proper 404/500 error pages

### 6.3 Sitemap Generation

```typescript
// src/app/sitemap.ts
import { MetadataRoute } from "next";
import { getAllHooks } from "@/lib/services/hooks";
import { getAllBlogPosts } from "@/lib/blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://adocavo.net";

  // Static pages
  const staticPages = [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/blog`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
  ];

  // Category pages
  const categories = ["beauty", "tech", "fitness", "finance", "pets", "food"];
  const categoryPages = categories.map((cat) => ({
    url: `${baseUrl}/category/${cat}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Hook detail pages
  const hooks = await getAllHooks();
  const hookPages = hooks.map((hook) => ({
    url: `${baseUrl}/hook/${hook.id}`,
    lastModified: hook.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Blog posts
  const posts = await getAllBlogPosts();
  const blogPages = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    ...staticPages,
    ...categoryPages,
    ...hookPages,
    ...blogPages,
  ] as MetadataRoute.Sitemap;
}
```

### 6.4 Robots.txt

```typescript
// src/app/robots.ts
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/remix/", // User-generated pages
          "/dashboard/", // Authenticated pages
          "/admin/",
        ],
      },
    ],
    sitemap: "https://adocavo.net/sitemap.xml",
  };
}
```

---

## 7. Link Building Strategy

### 7.1 Guest Posting Targets

| Site         | DA  | Topic                  | Status   |
| ------------ | --- | ---------------------- | -------- |
| IndieHackers | 72  | Product launches       | Planned  |
| ProductHunt  | 91  | Launch post            | Week 2   |
| Dev.to       | 62  | Technical build        | Week 3   |
| Shopify Blog | 94  | E-commerce marketing   | Outreach |
| Later Blog   | 61  | Social media marketing | Outreach |

### 7.2 Resource Link Opportunities

Create linkable assets:

- "Complete TikTok Hook Database" (downloadable PDF)
- "TikTok Ad Script Calculator" (interactive tool)
- "2026 TikTok Marketing Statistics" (data-driven post)

### 7.3 Community Engagement

- Reddit: r/tiktokmarketing, r/ecommerce, r/dropshipping
- Facebook Groups: TikTok Ads, E-commerce Marketing
- Discord: Marketing communities, Shopify sellers

---

## 8. Analytics & Tracking

### 8.1 Key Metrics to Track

| Metric           | Tool                  | Target                        |
| ---------------- | --------------------- | ----------------------------- |
| Organic traffic  | Google Analytics 4    | 5K/month by month 3           |
| Keyword rankings | Google Search Console | Top 10 for 5 primary keywords |
| Backlinks        | Ahrefs/Moz            | 50 referring domains          |
| Domain authority | Moz                   | DA 20+                        |
| Page speed       | PageSpeed Insights    | 90+ score                     |

### 8.2 Google Search Console Setup

```typescript
// src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Google Search Console verification */}
        <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 8.3 Analytics Events

```typescript
// src/lib/analytics.ts
export const trackEvent = (
  event: string,
  properties?: Record<string, unknown>,
) => {
  // Google Analytics 4
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", event, properties);
  }
};

// Usage
trackEvent("hook_view", { hookId: "hook_123", category: "beauty" });
trackEvent("script_generated", { hookId: "hook_123", angle: "Pain Point" });
trackEvent("copy_script", { scriptIndex: 0 });
```

---

## 9. Success Metrics

### 9.1 Month 1 Goals

- [ ] 500 organic sessions
- [ ] 10 blog posts published
- [ ] Top 20 for 3 primary keywords
- [ ] 10 referring domains

### 9.2 Month 3 Goals

- [ ] 5,000 organic sessions
- [ ] 30 blog posts published
- [ ] Top 10 for 5 primary keywords
- [ ] 50 referring domains
- [ ] DA 15+

### 9.3 Month 6 Goals

- [ ] 20,000 organic sessions
- [ ] 50+ blog posts published
- [ ] Top 5 for 3 primary keywords
- [ ] 150 referring domains
- [ ] DA 25+

---

## 10. Related Documentation

| Document                                           | Purpose                       |
| -------------------------------------------------- | ----------------------------- |
| [BLUEPRINT.md](./BLUEPRINT.md)                     | Master implementation guide   |
| [ROUTING_DEPLOYMENT.md](./ROUTING_DEPLOYMENT.md)   | Page structure and deployment |
| [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) | Content calendar integration  |

---

**Document Owner**: Marketing Team
**Review Cycle**: Monthly
