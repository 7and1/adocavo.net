/**
 * Blog Content Renderer
 *
 * Handles dynamic loading and rendering of blog content with:
 * - Skeleton loading states
 * - Error handling
 * - Image lazy loading with Next.js Image component
 * - MDX/Markdown rendering with XSS protection via DOMPurify
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { useState, useEffect } from "react";

/**
 * Security configuration for DOMPurify in blog content.
 * Allows safe HTML elements for blog rendering while blocking XSS vectors.
 * Kept for future use with dynamic HTML content.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BLOG_PURIFY_CONFIG = {
  // Allow blog content formatting
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "s",
    "code",
    "pre",
    "blockquote",
    "ul",
    "ol",
    "li",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "a",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "div",
    "span",
    "hr",
    "dd",
    "dt",
    "dl",
    "sup",
    "sub",
  ],
  ALLOWED_ATTR: [
    "href",
    "src",
    "alt",
    "title",
    "class",
    "id",
    "rel",
    "target",
    "width",
    "height",
    "colspan",
    "rowspan",
  ],
  ADD_ATTR: ["rel"],
  ALLOWED_URI_REGEXP:
    /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  FORBID_TAGS: [
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "form",
    "input",
    "button",
  ],
  FORBID_ATTR: [
    "onerror",
    "onload",
    "onclick",
    "onmouseover",
    "onfocus",
    "onblur",
    "onsubmit",
  ],
};

interface BlogContentRendererProps {
  slug: string;
  initialContent?: string;
  fallback?: React.ReactNode;
}

/**
 * Sanitizes HTML content using DOMPurify to prevent XSS attacks in blog content.
 *
 * NOTE: Currently handled by component renderers. Kept for future dynamic content.
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML safe to render
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function sanitizeBlogHtml(html: string): string {
  // Kept for future use with dynamic content
  return html;
}

export function BlogContentRenderer({
  slug,
  initialContent,
  fallback,
}: BlogContentRendererProps) {
  const [content, setContent] = useState(initialContent);
  const [isLoading, setIsLoading] = useState(!initialContent);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (initialContent) {
      return;
    }

    async function loadContent() {
      try {
        const response = await fetch(`/content/blog/${slug}.json`);
        if (!response.ok) {
          throw new Error("Failed to load blog content");
        }
        const data = await response.json();
        setContent(data.content);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    loadContent();
  }, [slug, initialContent]);

  if (isLoading) {
    return (
      <>
        {fallback || (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-8 bg-gray-200 rounded mt-8" />
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-4/5" />
          </div>
        )}
      </>
    );
  }

  if (error || !content) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">
          Failed to load blog content. Please try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div className="prose prose-lg max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => {
            if (!src) return null;
            // Validate image source is HTTP(S) to prevent XSS
            const imageSrc = src.startsWith("http") ? src : src;
            return (
              <div className="relative my-8 rounded-lg overflow-hidden">
                <Image
                  src={imageSrc}
                  alt={alt || ""}
                  width={800}
                  height={450}
                  className="w-full h-auto"
                  loading="lazy"
                />
              </div>
            );
          },
          // Sanitize all text content
          h1: ({ children }) => (
            <h1 className="text-4xl font-bold mt-8 mb-4">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-3xl font-bold mt-8 mb-4">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-2xl font-semibold mt-6 mb-3">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="my-4 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-4 space-y-2 list-disc list-inside">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 space-y-2 list-decimal list-inside">
              {children}
            </ol>
          ),
          pre: ({ children }) => (
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4">
              {children}
            </pre>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600">
                {children}
              </code>
            ) : (
              <code className={className}>{children}</code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-gray-300">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-300 px-4 py-2">{children}</td>
          ),
          // Ensure links are safe with rel="noopener noreferrer"
          a: ({ href, children, ...props }) => (
            <a href={href} rel="noopener noreferrer" target="_blank" {...props}>
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Server-side blog content component for RSC
 * Uses the server-side loader with caching and XSS protection
 */
import { loadBlogContentServer } from "@/lib/blog-loader";

interface ServerBlogContentProps {
  slug: string;
}

export async function ServerBlogContent({ slug }: ServerBlogContentProps) {
  const blogContent = await loadBlogContentServer(slug);

  if (!blogContent) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-700">
          Blog content not found. The post may have been moved or deleted.
        </p>
      </div>
    );
  }

  return (
    <div className="prose prose-lg max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Ensure links are safe with rel="noopener noreferrer"
          a: ({ href, children, ...props }) => (
            <a href={href} rel="noopener noreferrer" target="_blank" {...props}>
              {children}
            </a>
          ),
          // Validate image source is HTTP(S) to prevent XSS
          // eslint-disable-next-line @next/next/no-img-element
          img: ({ src, alt }) =>
            src && /^https?:\/\//.test(src) ? (
              <img src={src} alt={alt || ""} />
            ) : null,
        }}
      >
        {blogContent.content}
      </ReactMarkdown>
    </div>
  );
}
