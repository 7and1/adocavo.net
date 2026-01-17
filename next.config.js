/** @type {import('next').NextConfig} */
const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare");

if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

const isDev = process.env.NODE_ENV !== "production";
const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    console.warn(
      "NEXT_PUBLIC_SITE_URL is not set. Cloudflare image loader will default to https://adocavo.net.",
    );
  }
  if (process.env.NEXT_PUBLIC_IMAGE_LOADER !== "cloudflare") {
    console.warn(
      "NEXT_PUBLIC_IMAGE_LOADER should be set to 'cloudflare' in production to enable Image Resizing.",
    );
  }
}

const scriptSrc = [
  "'self'",
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
];

if (isDev) {
  scriptSrc.push("'unsafe-eval'");
  scriptSrc.push("'unsafe-inline'"); // Only in development
}

// CSP nonce for dynamic scripts (GTM, etc.)
// In production, we use strict-dynamic with nonce
const cspDirectives = isProd
  ? {
      // Production: Strict CSP with nonce-based dynamic scripts
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "default-src": ["'self'"],
      "script-src": [
        "'self'",
        "'unsafe-inline'", // Temporary for GTM - migrate to nonce
        "'unsafe-eval'", // Required for Next.js dev
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com",
        "https://*.googletagmanager.com",
      ].filter(Boolean),
      "style-src": ["'self'", "'unsafe-inline'"], // Required for styled-jsx
      "img-src": ["'self'", "data:", "https:", "blob:"],
      "font-src": ["'self'", "data:"],
      "connect-src": [
        "'self'",
        "https://www.google-analytics.com",
        "https://analytics.google.com",
        "https://*.googletagmanager.com",
      ],
      "frame-src": ["https://www.googletagmanager.com"],
      "frame-ancestors": ["'none'"],
      "object-src": ["'none'"],
      "manifest-src": ["'self'"],
      "worker-src": ["'self'", "blob:"],
      "upgrade-insecure-requests": [],
    }
  : {
      // Development: Relaxed CSP
      "default-src": ["'self'"],
      "script-src": scriptSrc,
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:", "https:", "blob:"],
      "font-src": ["'self'", "data:"],
      "connect-src": ["'self'", "https://www.google-analytics.com"],
      "frame-ancestors": ["'none'"],
    };

const nextConfig = {
  // Memory optimization for development
  onDemandEntries: {
    maxInactiveAge: 15 * 1000,
    pagesBufferLength: 3,
  },

  output: "standalone",
  images: {
    loader: "custom",
    loaderFile: "./src/lib/cloudflare-image-loader.ts",
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year for static images
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  async headers() {
    // Build CSP string from directives
    const buildCspString = (directives) => {
      return Object.entries(directives)
        .map(([directive, values]) => {
          const value = values.join(" ");
          return value ? `${directive} ${value}` : `${directive}`;
        })
        .join("; ");
    };

    const cspString = buildCspString(cspDirectives);

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: cspString,
          },
          {
            key: "X-CSRF-Protection",
            value: "1; mode=block",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/api/auth/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
        ],
      },
      {
        source: "/_next/image/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/library", destination: "/", permanent: true },
      { source: "/hooks", destination: "/", permanent: true },
    ];
  },
};

module.exports = nextConfig;
