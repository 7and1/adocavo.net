import { ImageResponse } from "next/og";

export const alt = "Adocavo - TikTok Hooks & Ad Script Generator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          "linear-gradient(135deg, #faf5ff 0%, #f0fdfa 50%, #ffffff 100%)",
        color: "#1f2937",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "0.02em" }}>
        Adocavo Intelligence
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1 }}>
          TikTok Hooks & Ad Script Generator
        </div>
        <div style={{ fontSize: 24, color: "#4b5563" }}>
          50+ viral hook patterns. 3 script angles. AI remix in seconds.
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 16,
          fontSize: 20,
          color: "#6b7280",
        }}
      >
        <span>adocavo.net</span>
        <span>•</span>
        <span>Creator-grade TikTok ad scripts</span>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
