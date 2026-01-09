import { createDb } from "../db";
import { users } from "../schema";
import { eq } from "drizzle-orm";

export async function getUserCredits(d1: D1Database, userId: string) {
  const db = createDb(d1);
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  return user?.credits ?? 0;
}
