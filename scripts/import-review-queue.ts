import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";
import { nanoid } from "nanoid";

type QueueEntry = {
  id?: string;
  text: string;
  category: string;
  engagementScore: number;
  source?: string;
  notes?: string;
};

const dataDir = resolve("data");
const explicitFile = process.env.REVIEW_QUEUE_FILE;

function getLatestQueueFile() {
  const files = readdirSync(dataDir)
    .filter((file) => file.startsWith("hook-review-queue-"))
    .map((file) => ({
      file,
      mtime: statSync(join(dataDir, file)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  return files[0]?.file;
}

const queueFile = explicitFile || getLatestQueueFile();

if (!queueFile) {
  throw new Error(
    "No review queue file found. Set REVIEW_QUEUE_FILE or run scrape-hooks first.",
  );
}

const filePath = resolve(
  queueFile.startsWith("data/") ? queueFile : `data/${queueFile}`,
);
const entries = JSON.parse(readFileSync(filePath, "utf-8")) as QueueEntry[];

const statements = entries
  .map((entry) => {
    const id = entry.id || `queue_${nanoid(10)}`;
    const text = entry.text.replace(/'/g, "''");
    const source = entry.source
      ? `'${entry.source.replace(/'/g, "''")}'`
      : "NULL";
    const notes = entry.notes ? `'${entry.notes.replace(/'/g, "''")}'` : "NULL";
    return `INSERT INTO hook_review_queue (id, text, category, engagement_score, source, status, notes, created_at, updated_at)
VALUES ('${id}', '${text}', '${entry.category}', ${entry.engagementScore}, ${source}, 'pending', ${notes}, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  notes = excluded.notes,
  status = 'pending',
  updated_at = unixepoch();`;
  })
  .join("\n\n");

const outPath = resolve("data/review-queue.sql");
writeFileSync(outPath, statements);

console.log(`Review queue SQL written to ${outPath}`);

if (process.env.SEED_EXECUTE === "true") {
  const dbName = process.env.SEED_DB_NAME || "adocavo-db";
  console.log(`Executing review queue import against ${dbName}...`);
  execSync(`wrangler d1 execute ${dbName} --file=${outPath}`, {
    stdio: "inherit",
  });
} else {
  console.log(
    "To execute import: SEED_EXECUTE=true SEED_DB_NAME=adocavo-db npm run seed:review-queue",
  );
}
