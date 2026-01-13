import { ImageResponse } from "next/og";
import { getBindings } from "@/lib/cloudflare";
import { getHookById } from "@/lib/services/hooks";
import { getSeedHookById } from "@/lib/seed-hooks";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OpengraphImage({ params }: Props) {
  const { id } = await params;

  let hookText = "Viral TikTok Hook";
  let category = "Category";
  let engagement = "";

  try {
    const env = getBindings();
    const hook = env.DB
      ? await getHookById(env.DB as D1Database, id)
      : getSeedHookById(id);

    if (hook) {
      hookText = `"${hook.text}"`;
      category = hook.category;
      engagement = `${hook.engagementScore}/100 engagement`;
    }
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
          "linear-gradient(135deg, #f0fdfa 0%, #fdf2f8 45%, #ffffff 100%)",
        color: "#111827",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 600, color: "#6b7280" }}>
        {category.toUpperCase()} HOOK
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 50, fontWeight: 800, lineHeight: 1.1 }}>
          {hookText}
        </div>
        {engagement && (
          <div style={{ fontSize: 22, color: "#4b5563" }}>{engagement}</div>
        )}
      </div>
      <div style={{ fontSize: 18, color: "#6b7280" }}>
        Generate 3 script angles on adocavo.net
      </div>
    </div>,
    {
      ...size,
    },
  );
}
