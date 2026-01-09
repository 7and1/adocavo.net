import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { Header } from "@/components/Header";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/admin");
  }

  const env = getBindings();
  const db = env.DB ? createDb(env.DB as D1Database) : null;

  if (db) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user || user.role !== "admin") {
      redirect("/");
    }
  } else {
    redirect("/");
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-10">{children}</main>
    </>
  );
}
