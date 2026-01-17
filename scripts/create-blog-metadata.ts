/**
 * Create lightweight blog metadata from existing blog post files
 * Extracts only the metadata (id, slug, title, excerpt, etc.) without the content
 */

import fs from "fs";
import path from "path";

interface BlogPostMetadata {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  updatedAt: string;
  tags: string[];
  featuredImage?: string;
}

const inputFiles = [
  path.join(process.cwd(), "src/data/blog-posts.ts"),
  path.join(process.cwd(), "src/data/category-deep-dives.ts"),
  path.join(process.cwd(), "src/lib/additional-blog-posts.ts"),
];

const outputFile = path.join(process.cwd(), "src/data/blog-metadata.ts");

const allMetadata: BlogPostMetadata[] = [];

interface PostBuilder {
  id?: string;
  slug?: string;
  title?: string;
  excerpt?: string;
  publishedAt?: string;
  updatedAt?: string;
  tags?: string[];
  featuredImage?: string;
  inContent: boolean;
  backtickDepth: number;
  accumulatingTitle: string[];
  accumulatingExcerpt: string[];
  previousKey: string;
}

inputFiles.forEach((filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  const current: PostBuilder = {
    inContent: false,
    backtickDepth: 0,
    accumulatingTitle: [],
    accumulatingExcerpt: [],
    previousKey: "",
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip non-data lines
    if (
      trimmed.startsWith("export interface") ||
      trimmed.startsWith("import") ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("export const blogPosts") ||
      trimmed.startsWith("export const additionalBlogPosts") ||
      trimmed.startsWith("export const categoryDeepDives") ||
      trimmed === "[" ||
      trimmed === "]"
    ) {
      continue;
    }

    // Check for content start
    if (trimmed.startsWith("content:")) {
      current.inContent = true;
      current.backtickDepth = trimmed.includes("`") ? 1 : 0;
      current.previousKey = "content";
      continue;
    }

    // Skip content lines
    if (current.inContent) {
      const backtickCount = (line.match(/`/g) || []).length;
      if (trimmed.includes("`")) {
        current.backtickDepth += backtickCount;
        if (
          current.backtickDepth >= 2 &&
          (trimmed.endsWith("`,") || trimmed.endsWith("`,"))
        ) {
          current.inContent = false;
          current.backtickDepth = 0;
          // Save the post
          if (current.id && current.slug) {
            allMetadata.push({
              id: current.id,
              slug: current.slug,
              title:
                current.accumulatingTitle.join("").trim() ||
                current.slug
                  .split("-")
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" "),
              excerpt: current.accumulatingExcerpt.join(" ").trim() || "",
              publishedAt: current.publishedAt || "2026-01-01",
              updatedAt: current.updatedAt || "2026-01-01",
              tags: current.tags || [],
              featuredImage: current.featuredImage || "/og-default.svg",
            });
          }
          // Reset
          current.id = undefined;
          current.slug = undefined;
          current.title = undefined;
          current.excerpt = undefined;
          current.publishedAt = undefined;
          current.updatedAt = undefined;
          current.tags = undefined;
          current.featuredImage = undefined;
          current.accumulatingTitle = [];
          current.accumulatingExcerpt = [];
          current.previousKey = "";
        }
      }
      continue;
    }

    // Extract ID
    const idMatch = line.match(/id:\s*"([^"]+)"/);
    if (idMatch) {
      current.id = idMatch[1];
      current.previousKey = "id";
      continue;
    }

    // Extract Slug
    const slugMatch = line.match(/slug:\s*"([^"]+)"/);
    if (slugMatch) {
      current.slug = slugMatch[1];
      current.previousKey = "slug";
      continue;
    }

    // Extract Title
    const titleMatch = line.match(/title:\s*"([^"]+)"/);
    if (titleMatch) {
      current.title = titleMatch[1];
      current.accumulatingTitle = [titleMatch[1]];
      current.previousKey = "title";
    } else if (current.previousKey === "title" && trimmed.startsWith('"')) {
      // Continuation of multiline title
      const contMatch = trimmed.match(/^"(.+)"$/);
      if (contMatch) {
        current.accumulatingTitle.push(contMatch[1]);
      }
    }

    // Extract Excerpt
    const excerptMatch = line.match(/excerpt:\s*"([^"]+)"/);
    if (excerptMatch) {
      current.excerpt = excerptMatch[1];
      current.accumulatingExcerpt = [excerptMatch[1]];
      current.previousKey = "excerpt";
    } else if (current.previousKey === "excerpt" && trimmed.startsWith('"')) {
      // Continuation of multiline excerpt
      const contMatch = trimmed.match(/^"(.+)"$/);
      if (contMatch) {
        current.accumulatingExcerpt.push(contMatch[1]);
      }
    }

    // Extract Published Date
    const publishedMatch = line.match(/publishedAt:\s*"([^"]+)"/);
    if (publishedMatch) {
      current.publishedAt = publishedMatch[1];
      current.previousKey = "publishedAt";
    }

    // Extract Updated Date
    const updatedMatch = line.match(/updatedAt:\s*"([^"]+)"/);
    if (updatedMatch) {
      current.updatedAt = updatedMatch[1];
      current.previousKey = "updatedAt";
    }

    // Extract Tags
    const tagsMatch = line.match(/tags:\s*\[([^\]]+)\]/);
    if (tagsMatch) {
      const tagsStr = tagsMatch[1];
      current.tags = tagsStr
        .split(",")
        .map((t: string) => t.trim().replace(/"/g, "").replace(/'/g, ""));
      current.previousKey = "tags";
    }

    // Extract Featured Image
    const imageMatch = line.match(/featuredImage:\s*"([^"]+)"/);
    if (imageMatch) {
      current.featuredImage = imageMatch[1];
      current.previousKey = "featuredImage";
    }

    // Check for post end
    if (trimmed === "}," && !current.inContent) {
      // Save the post if we have enough data
      if (current.id && current.slug) {
        allMetadata.push({
          id: current.id,
          slug: current.slug,
          title:
            current.accumulatingTitle.join("").trim() ||
            current.slug
              .split("-")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" "),
          excerpt: current.accumulatingExcerpt.join(" ").trim() || "",
          publishedAt: current.publishedAt || "2026-01-01",
          updatedAt: current.updatedAt || "2026-01-01",
          tags: current.tags || [],
          featuredImage: current.featuredImage || "/og-default.svg",
        });
      }
      // Reset
      current.id = undefined;
      current.slug = undefined;
      current.title = undefined;
      current.excerpt = undefined;
      current.publishedAt = undefined;
      current.updatedAt = undefined;
      current.tags = undefined;
      current.featuredImage = undefined;
      current.accumulatingTitle = [];
      current.accumulatingExcerpt = [];
      current.previousKey = "";
    }
  }
});

// Sort by published date
allMetadata.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));

// Generate TypeScript file
const metadataCode = allMetadata
  .map(
    (m) => `  {
    id: "${m.id}",
    slug: "${m.slug}",
    title: "${m.title.replace(/"/g, '\\"')}",
    excerpt: "${m.excerpt.replace(/"/g, '\\"')}",
    publishedAt: "${m.publishedAt}",
    updatedAt: "${m.updatedAt}",
    tags: [${m.tags.map((t) => `"${t}"`).join(", ")}],
    featuredImage: "${m.featuredImage}",
  }`,
  )
  .join(",\n");

const output = `// Auto-generated lightweight blog metadata
// Content is loaded dynamically from /public/content/blog/{slug}.json
// Regenerate with: npx tsx scripts/create-blog-metadata.ts

export interface BlogPostMetadata {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  updatedAt: string;
  tags: string[];
  featuredImage?: string;
}

export const blogMetadata: BlogPostMetadata[] = [
${metadataCode},
];
`;

fs.writeFileSync(outputFile, output, "utf8");
console.log(
  `Created metadata file with ${allMetadata.length} posts: ${outputFile}`,
);
