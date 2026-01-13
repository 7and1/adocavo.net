import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getPostBySlug,
  getRelatedPosts,
  type BlogPostWithMeta,
} from "@/lib/blog";
import { getArticleJsonLd, getBreadcrumbJsonLd } from "@/lib/seo";
import { formatDate } from "@/lib/utils";
import { BlogCard } from "@/components/BlogCard";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = getPostBySlug(slug);
    const baseUrl = "https://adocavo.net";
    const ogImage = `${baseUrl}/blog/${post.slug}/opengraph-image`;
    return {
      title: `${post.title} | Adocavo Blog`,
      description: post.excerpt,
      keywords: [
        "tiktok ads",
        "ad script writing",
        "ugc content",
        "tiktok marketing",
        "tiktok creative strategy",
        "viral hooks",
        ...post.tags,
      ],
      openGraph: {
        type: "article",
        url: `${baseUrl}/blog/${post.slug}`,
        title: post.title,
        description: post.excerpt,
        publishedTime: post.publishedAt,
        modifiedTime: post.updatedAt,
        authors: ["Adocavo Intelligence"],
        tags: post.tags,
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: post.title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: post.title,
        description: post.excerpt,
        images: [ogImage],
      },
      alternates: {
        canonical: `${baseUrl}/blog/${post.slug}`,
      },
    };
  } catch {
    return { title: "Post not found" };
  }
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  let post: BlogPostWithMeta;
  try {
    post = getPostBySlug(slug);
  } catch {
    notFound();
  }

  const related = getRelatedPosts(post.id, 3);

  const articleJsonLd = getArticleJsonLd(post);

  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "Home", url: "https://adocavo.net/" },
    { name: "Blog", url: "https://adocavo.net/blog" },
    { name: post.title, url: `https://adocavo.net/blog/${post.slug}` },
  ]);

  return (
    <article className="max-w-4xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex gap-2 text-sm text-gray-500">
          <li>
            <Link href="/" className="hover:text-gray-700">
              Home
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/blog" className="hover:text-gray-700">
              Blog
            </Link>
          </li>
          <li>/</li>
          <li
            className="text-gray-700 truncate max-w-[200px]"
            title={post.title}
          >
            {post.title}
          </li>
        </ol>
      </nav>

      <header className="mb-8">
        <div className="flex gap-2 mb-4">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm"
            >
              {tag}
            </span>
          ))}
        </div>
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        <div className="flex gap-4 text-sm text-gray-500">
          <time dateTime={post.publishedAt}>
            {formatDate(post.publishedAt)}
          </time>
          <span>{post.readingTime} min read</span>
        </div>
      </header>

      {post.featuredImage && (
        <div className="relative w-full aspect-[1200/630] rounded-xl overflow-hidden mb-8">
          <Image
            src={post.featuredImage}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      <div className="prose prose-lg max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {post.content}
        </ReactMarkdown>
      </div>

      <div className="my-12 p-8 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl text-center">
        <h3 className="text-2xl font-bold mb-4">
          Ready to Generate Your Own Scripts?
        </h3>
        <p className="text-gray-600 mb-6">
          Browse our library of 50+ viral hooks and create custom ad scripts
          instantly.
        </p>
        <Link href="/">
          <Button size="lg">Explore Hook Library</Button>
        </Link>
      </div>

      {related.length > 0 && (
        <section className="mt-12 pt-8 border-t">
          <h2 className="text-xl font-semibold mb-4">Related Articles</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {related.map((relatedPost) => (
              <BlogCard key={relatedPost.id} post={relatedPost} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
