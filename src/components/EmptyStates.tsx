import { Sparkles, FileText, Search, Zap } from "lucide-react";
import Link from "next/link";

export function EmptyHistory() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
        <FileText className="h-10 w-10 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No scripts yet
      </h3>
      <p className="text-gray-500 max-w-md mb-6">
        You haven&apos;t generated any scripts yet. Start by browsing our hook
        library and creating your first viral TikTok script.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
      >
        <Sparkles className="h-5 w-5" />
        Browse Hooks
      </Link>
    </div>
  );
}

export function EmptyFavorites() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
        <Zap className="h-10 w-10 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No favorites yet
      </h3>
      <p className="text-gray-500 max-w-md mb-6">
        Save your best scripts here for quick access. Just click the bookmark
        icon on any script to add it to your favorites.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
      >
        <Sparkles className="h-5 w-5" />
        Generate Scripts
      </Link>
    </div>
  );
}

export function EmptySearch() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
        <Search className="h-10 w-10 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No hooks found
      </h3>
      <p className="text-gray-500 max-w-md mb-6">
        Try adjusting your search or filters to find what you&apos;re looking
        for.
      </p>
    </div>
  );
}

export function EmptyAnalyses() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
        <Search className="h-10 w-10 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No competitor analyses yet
      </h3>
      <p className="text-gray-500 max-w-md mb-6">
        Analyze TikTok videos to extract their hooks, structure, and templates.
        Paste a TikTok URL to get started.
      </p>
    </div>
  );
}
