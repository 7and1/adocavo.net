import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/blog";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function OpengraphImage({ params }: Props) {
  const { slug } = await params;
  let title = "Adocavo Blog";
  let subtitle = "TikTok ad scripts, hook strategies, and creative testing.";

  try {
    const post = getPostBySlug(slug);
    title = post.title;
    subtitle = post.excerpt;
  } catch {
    // Fallback to defaults
  }

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px",
        background:
          "linear-gradient(135deg, #ffffff 0%, #f3e8ff 45%, #ecfeff 100%)",
        color: "#111827",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 600, color: "#6b7280" }}>
        Adocavo Blog
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1 }}>
          {title}
        </div>
        <div style={{ fontSize: 24, color: "#4b5563", lineHeight: 1.4 }}>
          {subtitle}
        </div>
      </div>
      <div style={{ fontSize: 18, color: "#6b7280" }}>adocavo.net/blog</div>
    </div>,
    {
      ...size,
    },
  );
}
