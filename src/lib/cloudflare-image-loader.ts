import type { ImageLoaderProps } from "next/image";

const DEFAULT_QUALITY = 85;
const DEFAULT_SITE_URL = "https://adocavo.net";

function resolveSiteUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && envUrl.startsWith("http")) {
    return envUrl.replace(/\/$/, "");
  }
  return DEFAULT_SITE_URL;
}

function normalizeSource(src: string) {
  if (src.startsWith("http")) return src;
  if (src.startsWith("//")) return `https:${src}`;
  const base = resolveSiteUrl();
  return new URL(src, base).toString();
}

export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  const enableCloudflare =
    process.env.NEXT_PUBLIC_IMAGE_LOADER === "cloudflare" ||
    process.env.NODE_ENV === "production";

  if (!enableCloudflare) {
    return src;
  }

  const resolvedQuality = quality || DEFAULT_QUALITY;
  const origin = resolveSiteUrl();
  const sourceUrl = normalizeSource(src);

  const params = new URLSearchParams({
    width: String(width),
    quality: String(resolvedQuality),
    format: "auto",
    fit: "scale-down",
  });

  return `${origin}/cdn-cgi/image/${params.toString()}/${sourceUrl}`;
}
