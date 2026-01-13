import React from "react";

interface VideoPlaceholderProps {
  title: string;
  category?: string;
  thumbnail?: string;
  duration?: string;
}

export function VideoPlaceholder({
  title,
  category = "tiktok-ad",
  thumbnail,
  duration = "0:30",
}: VideoPlaceholderProps) {
  return (
    <div className="relative aspect-[9/16] w-full max-w-sm mx-auto bg-gray-900 rounded-lg overflow-hidden group cursor-pointer">
      {/* Thumbnail or placeholder background */}
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
          <svg
            className="w-16 h-16 text-white opacity-80"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <svg
            className="w-16 h-16 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {/* Title overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
        <p className="text-white text-sm font-medium line-clamp-2">{title}</p>
      </div>

      {/* Duration badge */}
      <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
        {duration}
      </div>

      {/* Category badge */}
      {category && (
        <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded capitalize">
          {category}
        </div>
      )}
    </div>
  );
}

interface VideoEmbedPlaceholderProps {
  videoUrl?: string;
  title: string;
  description?: string;
}

export function VideoEmbedPlaceholder({
  videoUrl,
  title,
  description,
}: VideoEmbedPlaceholderProps) {
  return (
    <div className="my-8">
      <div className="relative aspect-[9/16] w-full max-w-md mx-auto bg-gray-900 rounded-lg overflow-hidden">
        {/* Video placeholder */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
          <div className="text-center text-white p-8">
            <svg
              className="w-20 h-20 mx-auto mb-4 opacity-80"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-lg font-semibold mb-2">Video Example</p>
            <p className="text-sm opacity-80">{title}</p>
          </div>
        </div>

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button className="bg-white bg-opacity-20 hover:bg-opacity-30 transition-all rounded-full p-4">
            <svg
              className="w-12 h-12 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      {description && (
        <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>{description}</p>
        </div>
      )}

      {videoUrl && (
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block text-center text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400"
        >
          View on TikTok →
        </a>
      )}
    </div>
  );
}

interface VideoGridProps {
  videos: Array<{
    title: string;
    category?: string;
    thumbnail?: string;
    duration?: string;
  }>;
}

export function VideoGrid({ videos }: VideoGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {videos.map((video, index) => (
        <VideoPlaceholder
          key={index}
          title={video.title}
          category={video.category}
          thumbnail={video.thumbnail}
          duration={video.duration}
        />
      ))}
    </div>
  );
}
