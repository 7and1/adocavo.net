/**
 * Product URL Scraper
 * Extracts product information from Shopify, Amazon, and generic web pages
 */

export interface ProductInfo {
  title: string;
  description: string;
  price?: string;
  imageUrl?: string;
  source: "shopify" | "amazon" | "tiktok" | "generic";
}

export interface ScrapeError {
  code: string;
  message: string;
}

type ScrapeResult = ProductInfo | ScrapeError;

/**
 * Validates if a URL is accessible and allowed
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http/https
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }
    // Block private IPs and localhost
    const hostname = parsed.hostname.toLowerCase();
    const blocked = [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "::1",
      "10.",
      "192.168.",
      "172.16.",
      "172.17.",
      "172.18.",
      "172.19.",
      "172.20.",
      "172.21.",
      "172.22.",
      "172.23.",
      "172.24.",
      "172.25.",
      "172.26.",
      "172.27.",
      "172.28.",
      "172.29.",
      "172.30.",
      "172.31.",
    ];
    if (blocked.some((b) => hostname === b || hostname.startsWith(b))) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Detects the platform from URL
 */
function detectPlatform(
  url: string,
): "shopify" | "amazon" | "tiktok" | "generic" {
  const hostname = new URL(url).hostname.toLowerCase();

  // TikTok domains
  const tiktokDomains = [
    "tiktok.com",
    "www.tiktok.com",
    "vm.tiktok.com",
    "vt.tiktok.com",
  ];

  if (tiktokDomains.some((d) => hostname === d || hostname.endsWith("." + d))) {
    return "tiktok";
  }

  // Amazon domains
  const amazonDomains = [
    "amazon.com",
    "amazon.co.uk",
    "amazon.de",
    "amazon.fr",
    "amazon.es",
    "amazon.it",
    "amazon.ca",
    "amazon.com.au",
    "amazon.co.jp",
    "amazon.in",
    "amazon.cn",
    "amazon.sg",
    "amazon.mx",
    "amazon.br",
  ];

  if (amazonDomains.some((d) => hostname === d || hostname.endsWith("." + d))) {
    return "amazon";
  }

  // Shopify stores have /products/ in path or myshopify.com in domain
  if (
    hostname.includes("myshopify.com") ||
    new URL(url).pathname.includes("/products/")
  ) {
    return "shopify";
  }

  return "generic";
}

/**
 * Parses Open Graph meta tags from HTML
 */
function parseOpenGraph(html: string): Partial<ProductInfo> {
  const result: Partial<ProductInfo> = {
    title: "",
    description: "",
    imageUrl: undefined,
  };

  // Helper to extract meta content
  const extractMeta = (property: string, name: string): string | null => {
    const propRegex = new RegExp(
      '<meta[^>]*property=["' +
        "'" +
        "]" +
        property +
        '["' +
        "'" +
        '][^>]*content=["' +
        "'" +
        ']([^"' +
        "'" +
        ']+) ["' +
        "'" +
        "]",
      "i",
    );
    const nameRegex = new RegExp(
      '<meta[^>]*name=["' +
        "'" +
        "]" +
        name +
        '["' +
        "'" +
        '][^>]*content=["' +
        "'" +
        ']([^"' +
        "'" +
        ']+) ["' +
        "'" +
        "]",
      "i",
    );
    const match = propRegex.exec(html) || nameRegex.exec(html);
    return match ? match[1].trim() : null;
  };

  result.title = extractMeta("og:title", "title") || "";
  result.description = extractMeta("og:description", "description") || "";
  result.imageUrl = extractMeta("og:image", "image") || undefined;

  // Try Twitter card as fallback
  if (!result.title) {
    result.title = extractMeta("twitter:title", "twitter:title") || "";
  }
  if (!result.description) {
    result.description =
      extractMeta("twitter:description", "twitter:description") || "";
  }
  if (!result.imageUrl) {
    result.imageUrl =
      extractMeta("twitter:image", "twitter:image") || undefined;
  }

  return result;
}

/**
 * Extracts title from HTML title tag
 */
function extractHtmlTitle(html: string): string {
  const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  return titleMatch ? titleMatch[1].trim() : "";
}

/**
 * Extracts description from meta description tag
 */
function extractMetaDescription(html: string): string {
  const descMatch =
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i.exec(
      html,
    );
  return descMatch ? descMatch[1].trim() : "";
}

/**
 * Scrapes Amazon product page
 */
async function scrapeAmazon(
  url: string,
  timeoutMs: number,
): Promise<ScrapeResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        code: "FETCH_ERROR",
        message: "HTTP " + response.status + ": " + response.statusText,
      };
    }

    const html = await response.text();

    // Amazon product title
    const titleMatch =
      /<span[^>]*id=["']productTitle["'][^>]*>([^<]+)<\/span>/i.exec(html);
    const title = titleMatch ? titleMatch[1].trim() : "";

    // Amazon price (multiple formats)
    const priceWholeMatch =
      /<span[^>]*class=["']a-price-whole["'][^>]*>([^<]+)<\/span>/i.exec(html);
    const priceFracMatch =
      /<span[^>]*class=["']a-price-fraction["'][^>]*>([^<]+)<\/span>/i.exec(
        html,
      );
    let price: string | undefined;
    if (priceWholeMatch && priceFracMatch) {
      price = "$" + priceWholeMatch[1].trim() + "." + priceFracMatch[1].trim();
    } else {
      const priceMatch =
        /<span[^>]*class=["']a-price[^"']*["'][^>]*>[\s\S]*?<span[^>]*class=["']a-offscreen["'][^>]*>\$?([\d.,]+)<\/span>/i.exec(
          html,
        );
      if (priceMatch) {
        price = "$" + priceMatch[1].trim();
      }
    }

    // Product description/bullets
    const bulletsMatch =
      /<div[^>]*id=["']feature-bullets["'][^>]*>[\s\S]*?<ul[^>]*class=["']a-unordered-list[^"']*["'][^>]*>([\s\S]+?)<\/ul>/i.exec(
        html,
      );
    let description = "";
    if (bulletsMatch) {
      const bulletMatches = bulletsMatch[1].match(
        /<span[^>]*class=["']a-list-item["'][^>]*>([^<]+(?:<[^>]+>[^<]+)*?)<\/span>/gi,
      );
      if (bulletMatches) {
        description = bulletMatches
          .map((b) =>
            b
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim(),
          )
          .filter((b) => b.length > 5)
          .join(" ")
          .substring(0, 500);
      }
    }

    // Fallback to meta tags if no description found
    if (!description) {
      const ogData = parseOpenGraph(html);
      description = ogData.description || extractMetaDescription(html);
    }

    // Main image
    const imageMatch =
      /<img[^>]*id=["']landingImage["'][^>]*src=["']([^"']+)["']/i.exec(html);
    const imageUrl = imageMatch ? imageMatch[1] : undefined;

    return {
      title: title || parseOpenGraph(html).title || "",
      description: description || "",
      price,
      imageUrl,
      source: "amazon",
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return { code: "TIMEOUT", message: "Request timed out" };
    }
    return {
      code: "FETCH_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Scrapes Shopify product page
 */
async function scrapeShopify(
  url: string,
  timeoutMs: number,
): Promise<ScrapeResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        code: "FETCH_ERROR",
        message: "HTTP " + response.status + ": " + response.statusText,
      };
    }

    const html = await response.text();

    // Try to extract from JSON-LD first
    const jsonLdMatch =
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]+?)<\/script>/i.exec(
        html,
      );
    let title = "";
    let description = "";
    let price: string | undefined;
    let imageUrl: string | undefined;

    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        const productData = Array.isArray(jsonLd)
          ? jsonLd.find(
              (item: unknown) =>
                typeof item === "object" && item && "@type" in item,
            )
          : jsonLd;

        if (productData && typeof productData === "object") {
          title = (productData as { name?: string }).name || "";
          description =
            (productData as { description?: string }).description || "";
          const offers = (
            productData as {
              offers?: Array<{ price?: string; priceCurrency?: string }>;
            }
          ).offers;
          if (Array.isArray(offers) && offers[0]) {
            const priceValue = offers[0].price;
            const currency = offers[0].priceCurrency || "USD";
            if (priceValue) {
              price =
                (currency === "USD" ? "$" : currency) + String(priceValue);
            }
          }
          imageUrl = (productData as { image?: string | string[] }).image as
            | string
            | undefined;
          if (Array.isArray(imageUrl)) {
            imageUrl = imageUrl[0];
          }
        }
      } catch {
        // JSON-LD parse failed, fall back to HTML parsing
      }
    }

    // Fallback to Open Graph and HTML parsing
    const ogData = parseOpenGraph(html);
    if (!title) title = ogData.title || "";
    if (!description) description = ogData.description || "";
    if (!imageUrl) imageUrl = ogData.imageUrl;

    if (!title) title = extractHtmlTitle(html);
    if (!description) description = extractMetaDescription(html);

    // Try to get price from meta
    if (!price) {
      const priceMatch =
        /<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i.exec(
          html,
        );
      if (priceMatch) {
        const currencyMatch =
          /<meta[^>]*property=["']product:price:currency["'][^>]*content=["']([^"']+)["']/i.exec(
            html,
          );
        const currency = currencyMatch
          ? currencyMatch[1] === "USD"
            ? "$"
            : currencyMatch[1]
          : "$";
        price = currency + priceMatch[1];
      }
    }

    return {
      title,
      description,
      price,
      imageUrl,
      source: "shopify",
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return { code: "TIMEOUT", message: "Request timed out" };
    }
    return {
      code: "FETCH_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Scrapes a generic web page
 */
async function scrapeGeneric(
  url: string,
  timeoutMs: number,
): Promise<ScrapeResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        code: "FETCH_ERROR",
        message: "HTTP " + response.status + ": " + response.statusText,
      };
    }

    const html = await response.text();
    const ogData = parseOpenGraph(html);
    const title = ogData.title || extractHtmlTitle(html);
    const description = ogData.description || extractMetaDescription(html);

    return {
      title,
      description,
      imageUrl: ogData.imageUrl,
      source: "generic",
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return { code: "TIMEOUT", message: "Request timed out" };
    }
    return {
      code: "FETCH_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Scrapes TikTok product/video page
 */
async function scrapeTikTok(
  url: string,
  timeoutMs: number,
): Promise<ScrapeResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        code: "FETCH_ERROR",
        message: "HTTP " + response.status + ": " + response.statusText,
      };
    }

    const html = await response.text();
    const ogData = parseOpenGraph(html);

    // Extract TikTok specific data from JSON-LD or inline scripts
    let title = ogData.title || "";
    let description = ogData.description || "";
    const imageUrl = ogData.imageUrl;

    // Try to extract from TikTok's data in script tags
    const scriptDataMatch =
      /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]+?)<\/script>/i.exec(
        html,
      );
    if (scriptDataMatch) {
      try {
        const data = JSON.parse(scriptDataMatch[1]);
        const props =
          data?.props?.pageProps ||
          data?.props?.initialProps?.pageProps ||
          data;
        if (props?.itemInfo?.itemStruct?.desc) {
          description = props.itemInfo.itemStruct.desc;
        }
        if (props?.itemInfo?.itemStruct?.title) {
          title = props.itemInfo.itemStruct.title;
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    // Fallback to meta tags
    if (!title) {
      title = extractHtmlTitle(html);
    }
    if (!description) {
      description = extractMetaDescription(html);
    }

    return {
      title,
      description,
      imageUrl,
      source: "tiktok",
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return { code: "TIMEOUT", message: "Request timed out" };
    }
    return {
      code: "FETCH_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Main function to scrape product URL
 */
export async function scrapeProductUrl(
  url: string,
  options: { timeout?: number } = {},
): Promise<ProductInfo> {
  const { timeout = 10000 } = options;

  // Validate URL
  if (!isValidUrl(url)) {
    throw new Error("Invalid or blocked URL");
  }

  const platform = detectPlatform(url);
  let result: ScrapeResult;

  switch (platform) {
    case "amazon":
      result = await scrapeAmazon(url, timeout);
      break;
    case "shopify":
      result = await scrapeShopify(url, timeout);
      break;
    case "tiktok":
      result = await scrapeTikTok(url, timeout);
      break;
    default:
      result = await scrapeGeneric(url, timeout);
  }

  // Check for error result
  if ("code" in result) {
    throw new Error(result.message);
  }

  // Validate we have at least some data
  if (!result.title && !result.description) {
    throw new Error("Could not extract product information from this page");
  }

  return result;
}

/**
 * Formats product info into a description string
 */
export function formatProductDescription(product: ProductInfo): string {
  const parts: string[] = [];

  if (product.title) {
    parts.push(product.title);
  }

  if (product.description) {
    parts.push(product.description);
  }

  if (product.price) {
    parts.push("Price: " + product.price);
  }

  return parts.join(". ").substring(0, 500);
}
