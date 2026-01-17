/**
 * Blog post loading skeleton component
 * Provides visual feedback while blog content loads
 */

export function BlogPostSkeleton() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      {/* Breadcrumb */}
      <div className="mb-4 flex gap-2">
        <div className="h-5 bg-gray-200 rounded w-16" />
        <div className="h-5 bg-gray-200 rounded w-4" />
        <div className="h-5 bg-gray-200 rounded w-16" />
        <div className="h-5 bg-gray-200 rounded w-4" />
        <div className="h-5 bg-gray-200 rounded w-32" />
      </div>

      {/* Header */}
      <div className="mb-8">
        {/* Tags */}
        <div className="flex gap-2 mb-4">
          <div className="h-7 bg-gray-200 rounded-full w-20" />
          <div className="h-7 bg-gray-200 rounded-full w-24" />
        </div>
        {/* Title */}
        <div className="h-10 bg-gray-200 rounded w-3/4 mb-4" />
        <div className="h-10 bg-gray-200 rounded w-1/2 mb-4" />
        {/* Meta */}
        <div className="flex gap-4">
          <div className="h-5 bg-gray-200 rounded w-32" />
          <div className="h-5 bg-gray-200 rounded w-24" />
        </div>
      </div>

      {/* Featured Image */}
      <div className="w-full aspect-[1200/630] bg-gray-200 rounded-xl mb-8" />

      {/* Content */}
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-8 bg-gray-200 rounded w-1/3 mt-8" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-4/5" />
        <div className="h-8 bg-gray-200 rounded w-1/4 mt-8" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>
    </div>
  );
}

/**
 * Blog card skeleton for list views
 */
export function BlogCardSkeleton() {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white overflow-hidden animate-pulse">
      {/* Image */}
      <div className="w-full h-40 bg-gray-200" />
      {/* Content */}
      <div className="p-5 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-32" />
        <div className="h-6 bg-gray-200 rounded w-full" />
        <div className="h-6 bg-gray-200 rounded w-2/3" />
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    </article>
  );
}
