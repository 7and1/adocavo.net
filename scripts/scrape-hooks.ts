/*
  Optional scraper for TikTok Creative Center hooks.
  Requires: npm install -D puppeteer
*/
import { writeFileSync } from "node:fs";

interface ScrapedHook {
  text: string;
  engagementScore: number;
  source: string;
  category: string;
  scrapedAt: string;
}

async function scrapeTikTokCreativeCenter(
  category: string,
): Promise<ScrapedHook[]> {
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(
    "https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en?period=7&region=US",
    { waitUntil: "networkidle2" },
  );

  await page.waitForSelector('[data-testid="ad-card"]', { timeout: 10000 });

  const hooks = await page.evaluate(() => {
    const cards = document.querySelectorAll('[data-testid="ad-card"]');
    return Array.from(cards)
      .slice(0, 20)
      .map((card) => {
        const textEl = card.querySelector(".ad-text");
        const likesEl = card.querySelector(".likes-count");
        return {
          text: textEl?.textContent?.slice(0, 100) || "",
          likes: parseInt(likesEl?.textContent?.replace(/[^0-9]/g, "") || "0"),
        };
      });
  });

  await browser.close();

  return hooks
    .filter((h) => h.text.length > 10)
    .map((h) => ({
      text: h.text,
      engagementScore: Math.min(100, Math.floor(h.likes / 10000)),
      source: "tiktok_creative_center",
      category,
      scrapedAt: new Date().toISOString(),
    }));
}

async function main() {
  const categories = ["beauty", "tech", "finance", "pets", "fitness", "food"];
  const allHooks: ScrapedHook[] = [];

  for (const category of categories) {
    console.log(`Scraping ${category}...`);
    const hooks = await scrapeTikTokCreativeCenter(category);
    allHooks.push(...hooks);
    await new Promise((r) => setTimeout(r, 3000));
  }

  writeFileSync(
    `data/hook-review-queue-${Date.now()}.json`,
    JSON.stringify(allHooks, null, 2),
  );

  console.log(`Scraped ${allHooks.length} hooks for review`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
