import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import { Analytics } from "@/components/Analytics";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import { getOrganizationJsonLd } from "@/lib/enhanced-seo";
import { safeJsonLdStringify } from "@/lib/seo";
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
        url: "https://adocavo.net/opengraph-image",
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
    images: ["https://adocavo.net/opengraph-image"],
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
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  themeColor: "#3b82f6",
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  preload: true,
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizationJsonLd = getOrganizationJsonLd();

  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="canonical" href="https://adocavo.net" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLdStringify(organizationJsonLd),
          }}
        />
      </head>
      <body className="min-h-screen bg-white font-sans antialiased">
        <Providers>{children}</Providers>
        <Analytics />
        <PerformanceMonitor />
      </body>
    </html>
  );
}
