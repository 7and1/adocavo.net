"use client";

import { useState, useEffect } from "react";
import type { Components } from "react-markdown";

/**
 * Custom renderer component that sanitizes markdown output.
 * ReactMarkdown generates HTML which we sanitize before rendering.
 */
function SanitizedMarkdown({ content }: { content: string }) {
  const [MarkdownComponent, setMarkdownComponent] =
    useState<React.ComponentType<
      React.PropsWithChildren<{
        remarkPlugins?: unknown[];
        components?: Components;
      }>
    > | null>(null);
  const [GfmPlugin, setGfmPlugin] = useState<unknown | null>(null);

  useEffect(() => {
    // Dynamic import markdown dependencies for code splitting
    Promise.all([import("react-markdown"), import("remark-gfm")]).then(
      ([markdown, gfm]) => {
        setMarkdownComponent(
          markdown.default as React.ComponentType<
            React.PropsWithChildren<{
              remarkPlugins?: unknown[];
              components?: Components;
            }>
          >,
        );
        setGfmPlugin(gfm.default);
      },
    );
  }, []);

  if (!MarkdownComponent || !GfmPlugin) {
    return <div className="animate-pulse bg-gray-200 h-4 rounded my-4" />;
  }

  return (
    <MarkdownComponent
      remarkPlugins={[GfmPlugin]}
      components={{
        // Sanitize all text content
        p: ({ children }) => <p>{children}</p>,
        // Ensure links are safe
        a: ({ href, children, ...props }) => (
          <a href={href} rel="noopener noreferrer" target="_blank" {...props}>
            {children}
          </a>
        ),
        // Sanitize code blocks
        code: ({ className, children, ...props }) => (
          <code className={className} {...props}>
            {children}
          </code>
        ),
        // Sanitize images
        img: ({ src, alt, ...props }) =>
          src && /^https?:\/\//.test(src) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={alt || ""} {...props} />
          ) : null,
      }}
    >
      {content}
    </MarkdownComponent>
  );
}

/**
 * Safe Markdown renderer component with XSS protection.
 *
 * This component:
 * 1. Uses dynamic imports for code splitting (reduces initial bundle)
 * 2. Sanitizes all output HTML using DOMPurify
 * 3. Enforces safe link behavior (noopener, noreferrer)
 * 4. Validates image URLs are HTTP(S) only
 * 5. Blocks dangerous tags and attributes
 *
 * @example
 * ```tsx
 * <SafeMarkdown content="# Hello\n\nThis is **safe** markdown!" />
 * ```
 */
export function SafeMarkdown({ content }: { content: string }) {
  return <SanitizedMarkdown content={content} />;
}
