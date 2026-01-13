import { writeFileSync } from "fs";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const MODEL = process.env.AI_MODEL || "@cf/meta/llama-3.1-70b-instruct";

const niches = [
  {
    slug: "real-estate-tiktok-hooks",
    title: "Real Estate TikTok Hooks",
    description: "Hooks for agents, brokers, and listing marketing.",
  },
  {
    slug: "dropshipping-video-ads",
    title: "Dropshipping Video Ads",
    description: "Product-led hooks for dropshipping campaigns.",
  },
  {
    slug: "saas-marketing-hooks",
    title: "SaaS Marketing Hooks",
    description: "B2B SaaS hooks that highlight ROI and time saved.",
  },
];

if (!ACCOUNT_ID || !API_TOKEN) {
  console.error("Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN.");
  process.exit(1);
}

async function run() {
  const results = [] as Array<Record<string, unknown>>;

  for (const niche of niches) {
    const prompt = `Generate 12 TikTok ad hook examples, 4 angles, and 3 best practices for the niche: ${niche.title}.
Return JSON: { "hooks": [], "angles": [], "bestPractices": [] }`;

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "You are a TikTok ad strategist." },
            { role: "user", content: prompt },
          ],
          temperature: 0.6,
          max_tokens: 900,
        }),
      },
    );

    const json = await response.json();
    const content = json?.result?.response || json?.result?.message || "";
    const match = String(content).match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error(`Invalid AI response for ${niche.slug}`);
    }

    const parsed = JSON.parse(match[0]);
    results.push({
      slug: niche.slug,
      title: niche.title,
      description: niche.description,
      ...parsed,
    });
  }

  writeFileSync(
    "data/niche-examples.generated.json",
    JSON.stringify(results, null, 2),
  );

  console.log("Generated niche examples -> data/niche-examples.generated.json");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
