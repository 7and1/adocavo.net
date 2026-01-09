import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TikTok Hooks & Ad Script Generator | Adocavo",
    template: "%s | Adocavo",
  },
  description:
    "Generate high-converting TikTok ad scripts with AI. Browse 50+ proven viral hooks, create UGC-style content, and scale your creative testing in seconds.",
  keywords: [
    "tiktok hooks",
    "viral tiktok hooks",
    "tiktok ad generator",
    "ad script generator",
    "ugc script generator",
    "tiktok ad scripts",
    "tiktok creative",
    "ad copy generator",
    "tiktok marketing",
  ],
  authors: [{ name: "Adocavo Intelligence", url: "https://adocavo.net" }],
  creator: "Adocavo Intelligence",
  publisher: "Adocavo Intelligence",
  metadataBase: new URL("https://adocavo.net"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://adocavo.net",
    title: "TikTok Hooks & Ad Script Generator | Adocavo",
    description:
      "Generate high-converting TikTok ad scripts with AI. Browse 50+ proven viral hooks.",
    siteName: "Adocavo",
    images: [
      {
        url: "https://adocavo.net/og-default.svg",
        width: 1200,
        height: 630,
        alt: "Adocavo - TikTok Ad Script Generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@adocavo",
    creator: "@adocavo",
    title: "TikTok Hooks & Ad Script Generator | Adocavo",
    description:
      "Generate high-converting TikTok ad scripts with AI. Browse 50+ proven viral hooks.",
    images: ["https://adocavo.net/og-default.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "google-site-verification-token",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="canonical" href="https://adocavo.net" />
      </head>
      <body className="min-h-screen bg-white font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
