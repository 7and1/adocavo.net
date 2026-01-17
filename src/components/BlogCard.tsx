import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import type { BlogPostWithMeta } from "@/lib/blog";

export function BlogCard({ post }: { post: BlogPostWithMeta }) {
  return (
    <article className="group rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200">
      {post.featuredImage && (
        <Link
          href={`/blog/${post.slug}`}
          className="block overflow-hidden"
          aria-label={`Read article: ${post.title}`}
        >
          <Image
            src={post.featuredImage}
            alt=""
            width={400}
            height={160}
            className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 400px"
          />
        </Link>
      )}
      <div className="p-5 space-y-3">
        <p className="text-xs uppercase tracking-wide text-gray-400">
          {formatDate(post.publishedAt)} · {post.readingTime} min read
        </p>
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
          <Link
            href={`/blog/${post.slug}`}
            className="hover:text-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded focus-visible:ring-inset"
          >
            {post.title}
          </Link>
        </h3>
        <p className="text-sm text-gray-600 line-clamp-3">{post.excerpt}</p>
        <Link
          href={`/blog/${post.slug}`}
          className="text-sm font-medium text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 group/link focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
        >
          Read more
          <span
            className="transition-transform group-hover/link:translate-x-0.5"
            aria-hidden="true"
          >
            →
          </span>
        </Link>
      </div>
    </article>
  );
}
