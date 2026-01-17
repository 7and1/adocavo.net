/**
 * Extract blog content from TypeScript files to JSON
 * Run this after adding/editing blog posts
 */

import fs from "fs";
import path from "path";

const files = [
  path.join(process.cwd(), "src/data/blog-posts.ts"),
  path.join(process.cwd(), "src/data/category-deep-dives.ts"),
  path.join(process.cwd(), "src/lib/additional-blog-posts.ts"),
];

const outputDir = path.join(process.cwd(), "public/content/blog");

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

interface PostInfo {
  id: string;
  slug: string;
  content: string;
}

const extractedPosts: PostInfo[] = [];

files.forEach((filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  let currentPost: Partial<PostInfo> = {};
  let inContent = false;
  let contentLines: string[] = [];
  let braceDepth = 0;
  let lookingForContentStart = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Extract ID
    const idMatch = line.match(/id:\s*"([^"]+)"/);
    if (idMatch && !inContent) {
      currentPost.id = idMatch[1];
    }

    // Extract Slug
    const slugMatch = line.match(/slug:\s*"([^"]+)"/);
    if (slugMatch && !inContent) {
      currentPost.slug = slugMatch[1];
    }

    // Look for content start
    if (trimmed === "content:" || trimmed.startsWith("content: `")) {
      if (trimmed === "content:") {
        lookingForContentStart = true;
        continue;
      }
      if (trimmed.startsWith("content: `")) {
        inContent = true;
        contentLines = [];
        // Extract content after the backtick
        const afterBacktick = line.substring(line.indexOf("`") + 1);
        if (afterBacktick) {
          contentLines.push(afterBacktick);
        }
        continue;
      }
    }

    if (lookingForContentStart && trimmed.startsWith("`")) {
      inContent = true;
      contentLines = [];
      lookingForContentStart = false;
      // Extract content after the backtick
      const afterBacktick = line.substring(line.indexOf("`") + 1);
      if (afterBacktick) {
        contentLines.push(afterBacktick);
      }
      continue;
    }

    // Collect content lines
    if (inContent) {
      // Check for content end
      if (trimmed.endsWith("`,") || trimmed === "`") {
        inContent = false;
        lookingForContentStart = false;

        if (currentPost.id && currentPost.slug && contentLines.length > 0) {
          const postContent = contentLines.join("\n");
          extractedPosts.push({
            id: currentPost.id,
            slug: currentPost.slug!,
            content: postContent,
          } as PostInfo);

          // Write individual JSON file
          const jsonPath = path.join(outputDir, `${currentPost.slug}.json`);
          fs.writeFileSync(
            jsonPath,
            JSON.stringify(
              {
                id: currentPost.id,
                slug: currentPost.slug,
                content: postContent,
              },
              null,
              2,
            ),
            "utf8",
          );
          console.log(`Extracted: ${currentPost.slug}`);
        }

        currentPost = {};
        contentLines = [];
        continue;
      }

      contentLines.push(line);
    }
  }
});

// Write index file with all slugs
const indexPath = path.join(outputDir, "index.json");
fs.writeFileSync(
  indexPath,
  JSON.stringify(
    extractedPosts.map((p) => p.slug),
    null,
    2,
  ),
  "utf8",
);

console.log(`\nExtracted ${extractedPosts.length} blog posts to ${outputDir}`);
console.log(`Index file: ${indexPath}`);
