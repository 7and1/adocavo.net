import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { getCloudflareContext, type EnvBindings } from "./cloudflare";

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Database = ReturnType<typeof createDb>;

export async function getDb() {
  const ctx = await getCloudflareContext();
  const env = ctx?.env as EnvBindings | undefined;
  if (!env?.DB) {
    throw new Error(
      "D1 Binding not found. Ensure you are running in Cloudflare context.",
    );
  }
  return createDb(env.DB as D1Database);
}
