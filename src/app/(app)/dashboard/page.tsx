import { auth } from "@/lib/auth";
import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { generatedScripts } from "@/lib/schema";
import { and, desc, eq } from "drizzle-orm";
import { ScriptHistory } from "@/components/ScriptHistory";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="text-center text-gray-600">
        Script history isn&apos;t stored in free mode.
      </div>
    );
  }

  const env = getBindings();
  const db = env.DB ? createDb(env.DB as D1Database) : null;

  if (!db) {
    return (
      <div className="text-center text-gray-500">Database unavailable.</div>
    );
  }

  const scripts = await db.query.generatedScripts.findMany({
    where: eq(generatedScripts.userId, session.user.id),
    orderBy: [desc(generatedScripts.createdAt)],
    with: {
      hook: true,
    },
  });

  const formatted = scripts.map((script) => ({
    id: script.id,
    hookText: script.hook?.text ?? "",
    productDescription: script.productDescription,
    scripts:
      typeof script.scripts === "string"
        ? JSON.parse(script.scripts)
        : (script.scripts as Array<{ angle: string; script: string }>),
    createdAt: script.createdAt,
  }));

  async function handleDelete(id: string) {
    "use server";
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }
    if (!env.DB) return;
    const db = createDb(env.DB as D1Database);
    await db
      .delete(generatedScripts)
      .where(
        and(
          eq(generatedScripts.id, id),
          eq(generatedScripts.userId, session.user.id),
        ),
      );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Your Scripts</h1>
        <p className="text-gray-600">
          Review and manage your generated scripts.
        </p>
      </div>
      <ScriptHistory scripts={formatted} onDelete={handleDelete} />
    </div>
  );
}
