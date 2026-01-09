import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBindings } from "@/lib/cloudflare";
import { getHookById } from "@/lib/services/hooks";
import { ScriptGenerator } from "@/components/ScriptGenerator";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RemixPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/remix/${id}`);
  }

  const env = getBindings();
  if (!env.DB) {
    return (
      <div className="text-center text-gray-500">Database unavailable.</div>
    );
  }

  const hook = await getHookById(env.DB as D1Database, id);
  if (!hook) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Remix Hook</h1>
        <p className="text-gray-600">
          Generate 3 script angles from this hook.
        </p>
      </div>
      <ScriptGenerator hook={hook} />
    </div>
  );
}
