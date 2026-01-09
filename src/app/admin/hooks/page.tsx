import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { hooks } from "@/lib/schema";
import { desc } from "drizzle-orm";

export default async function AdminHooksPage() {
  const env = getBindings();
  const db = env.DB ? createDb(env.DB as D1Database) : null;
  const recentHooks = db
    ? await db.query.hooks.findMany({
        orderBy: [desc(hooks.createdAt)],
        limit: 10,
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hook Review Queue</h1>
        <p className="text-gray-600">Latest hooks added to the library.</p>
      </div>

      {recentHooks.length === 0 ? (
        <div className="rounded-2xl border bg-white p-6 text-gray-500">
          No hooks found. Use the seed script to add initial hooks.
        </div>
      ) : (
        <div className="grid gap-4">
          {recentHooks.map((hook) => (
            <div key={hook.id} className="rounded-xl border bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">&quot;{hook.text}&quot;</p>
                  <p className="text-sm text-gray-500">
                    {hook.category} · {hook.engagementScore}
                  </p>
                </div>
                <span className="text-xs text-gray-400">{hook.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
