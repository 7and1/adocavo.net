// import { safeJsonLdStringify } from "./seo"; // Unused import

/**
 * Enhanced SEO structured data for TikTok ad platform
 * Includes VideoObject, Review, and additional Organization schemas
 */

export function getVideoObjectJsonLd({
  name,
  description,
  thumbnailUrl,
  uploadDate,
  duration,
  contentUrl,
  embedUrl,
}: {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration?: string; // ISO 8601 duration format (e.g., "PT30S" for 30 seconds)
  contentUrl?: string;
  embedUrl?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name,
    description,
    thumbnailUrl,
    uploadDate,
    duration: duration || "PT30S", // Default 30 seconds
    contentUrl: contentUrl || "https://adocavo.net",
    embedUrl: embedUrl || "https://adocavo.net",
    publication: {
      "@type": "Organization",
      name: "Adocavo Intelligence",
      logo: {
        "@type": "ImageObject",
        url: "https://adocavo.net/og-default.svg",
      },
    },
  };
}

export function getReviewJsonLd({
  itemReviewed,
  reviewRating,
  author,
  reviewBody,
  datePublished,
}: {
  itemReviewed: string;
  reviewRating: {
    ratingValue: number;
    bestRating: number;
    worstRating: number;
  };
  author?: string;
  reviewBody?: string;
  datePublished?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "SoftwareApplication",
      name: itemReviewed,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
    },
    reviewRating: {
      "@type": "Rating",
      ...reviewRating,
    },
    author: {
      "@type": "Person",
      name: author || "Anonymous User",
    },
    reviewBody,
    datePublished: datePublished || new Date().toISOString(),
  };
}

export function getOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Adocavo Intelligence",
    url: "https://adocavo.net",
    logo: "https://adocavo.net/og-default.svg",
    description:
      "AI-powered TikTok ad script generator with a library of 50+ proven viral hooks",
    sameAs: [
      "https://www.tiktok.com/@adocavo",
      "https://twitter.com/adocavo",
      "https://www.linkedin.com/company/adocavo",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      email: "support@adocavo.net",
      availableLanguage: "English",
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "US",
    },
    founders: [
      {
        "@type": "Person",
        name: "Adocavo Team",
      },
    ],
  };
}

export function getAggregateRatingJsonLd({
  itemName,
  ratingValue,
  ratingCount,
  bestRating = 5,
  worstRating = 1,
}: {
  itemName: string;
  ratingValue: number;
  ratingCount: number;
  bestRating?: number;
  worstRating?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "AggregateRating",
    itemReviewed: {
      "@type": "SoftwareApplication",
      name: itemName,
      applicationCategory: "BusinessApplication",
    },
    ratingValue,
    ratingCount,
    bestRating,
    worstRating,
  };
}

export function getProductJsonLd({
  name,
  description,
  brand,
  aggregateRating,
  offers,
}: {
  name: string;
  description: string;
  brand?: string;
  aggregateRating?: {
    ratingValue: number;
    ratingCount: number;
  };
  offers?: {
    price: string;
    priceCurrency: string;
    availability: string;
  };
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const product: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    brand: {
      "@type": "Brand",
      name: brand || "Adocavo",
    },
  };

  if (aggregateRating) {
    product.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: aggregateRating.ratingValue,
      ratingCount: aggregateRating.ratingCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (offers) {
    product.offers = {
      "@type": "Offer",
      price: offers.price,
      priceCurrency: offers.priceCurrency,
      availability: `https://schema.org/${offers.availability}`,
      url: "https://adocavo.net",
    };
  }

  return product;
}

export function getHowToJsonLd({
  name,
  description,
  steps,
  estimatedCost,
  totalTime,
}: {
  name: string;
  description: string;
  steps: Array<{ name: string; text: string }>;
  estimatedCost?: {
    currency: string;
    value: string;
  };
  totalTime?: string; // ISO 8601 duration
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
    estimatedCost: estimatedCost
      ? {
          "@type": "MonetaryAmount",
          currency: estimatedCost.currency,
          value: estimatedCost.value,
        }
      : undefined,
    totalTime,
  };
}

export function getFAQPageJsonLd(
  faqs: Array<{ question: string; answer: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function getItemListJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Thing",
        name: item.name,
        url: `https://adocavo.net${item.url}`,
      },
    })),
  };
}

export function getEventJsonLd({
  name,
  startDate,
  endDate,
  location,
  description,
}: {
  name: string;
  startDate: string;
  endDate?: string;
  location: {
    name: string;
    address: string;
  };
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    startDate,
    endDate,
    location: {
      "@type": "Place",
      name: location.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: location.address,
      },
    },
    description,
  };
}

/**
 * Generate breadcrumb schema with rich structured data
 */
export function getBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `https://adocavo.net${item.url}`,
    })),
  };
}

/**
 * Generate Person schema for team members or authors
 */
export function getPersonJsonLd({
  name,
  jobTitle,
  url,
  image,
  sameAs,
}: {
  name: string;
  jobTitle?: string;
  url?: string;
  image?: string;
  sameAs?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    jobTitle,
    url: url || "https://adocavo.net",
    image,
    sameAs,
    worksFor: {
      "@type": "Organization",
      name: "Adocavo Intelligence",
    },
  };
}
