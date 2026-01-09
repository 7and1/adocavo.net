import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const hooksPath = resolve("data/hooks-seed.json");
const hooks = JSON.parse(readFileSync(hooksPath, "utf-8")) as Array<{
  id: string;
  text: string;
  category: string;
  engagementScore: number;
  source?: string;
}>;

const hookStatements = hooks
  .map((hook) => {
    const text = hook.text.replace(/'/g, "''");
    const source = hook.source
      ? `'${hook.source.replace(/'/g, "''")}'`
      : "NULL";
    return `INSERT INTO hooks (id, text, category, engagement_score, source, is_active, created_at, updated_at)
VALUES ('${hook.id}', '${text}', '${hook.category}', ${hook.engagementScore}, ${source}, 1, unixepoch(), unixepoch())
ON CONFLICT(id) DO UPDATE SET
  text = excluded.text,
  category = excluded.category,
  engagement_score = excluded.engagement_score,
  source = excluded.source,
  is_active = 1,
  updated_at = unixepoch();`;
  })
  .join("\n\n");

const outPath = resolve("data/seed.sql");
writeFileSync(outPath, `${hookStatements}\n`);

console.log(`Seed SQL written to ${outPath}`);

if (process.env.SEED_EXECUTE === "true") {
  const dbName = process.env.SEED_DB_NAME || "adocavo-db";
  console.log(`Executing seed against ${dbName}...`);
  execSync(`wrangler d1 execute ${dbName} --file=${outPath}`, {
    stdio: "inherit",
  });
} else {
  console.log(
    "To execute seed: SEED_EXECUTE=true SEED_DB_NAME=adocavo-db npm run seed:all",
  );
}
