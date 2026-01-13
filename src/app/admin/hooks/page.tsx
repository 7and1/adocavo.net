import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { hookReviewQueue, hooks } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { AdminHooksManager } from "@/components/admin/AdminHooksManager";
import { HOOK_CATEGORIES } from "@/lib/validations";

export const dynamic = "force-dynamic";

export default async function AdminHooksPage() {
  const env = getBindings();
  const db = env.DB ? createDb(env.DB as D1Database) : null;
  const [recentHooks, reviewQueue] = db
    ? await Promise.all([
        db.query.hooks.findMany({
          orderBy: [desc(hooks.createdAt)],
          limit: 200,
        }),
        db.query.hookReviewQueue.findMany({
          orderBy: [desc(hookReviewQueue.createdAt)],
          limit: 200,
        }),
      ])
    : [[], []];

  const hooksData = recentHooks.map((hook) => ({
    ...hook,
    createdAt: hook.createdAt?.toISOString?.() ?? null,
    updatedAt: hook.updatedAt?.toISOString?.() ?? null,
  }));

  const reviewData = reviewQueue.map((item) => ({
    ...item,
    status: item.status as "pending" | "approved" | "rejected",
    createdAt: item.createdAt?.toISOString?.() ?? null,
    updatedAt: item.updatedAt?.toISOString?.() ?? null,
    reviewedAt: item.reviewedAt?.toISOString?.() ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hook Review Queue</h1>
        <p className="text-gray-600">
          Manage the hook library, approve new submissions, and track review
          status.
        </p>
      </div>

      {db ? (
        <AdminHooksManager
          initialHooks={hooksData}
          initialReviewQueue={reviewData}
          categories={[...HOOK_CATEGORIES]}
        />
      ) : (
        <div className="rounded-2xl border bg-white p-6 text-gray-500">
          No database binding detected. Configure D1 to manage hooks.
        </div>
      )}
    </div>
  );
}
