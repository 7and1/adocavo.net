import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBindings } from "@/lib/cloudflare";
import { getHookById } from "@/lib/services/hooks";
import { ScriptGenerator } from "@/components/ScriptGenerator";
import { generateMetadata as buildMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return buildMetadata({
    title: "Remix Hook",
    description:
      "Generate three TikTok ad script angles from a proven hook in seconds.",
    canonical: `https://adocavo.net/remix/${id}`,
    noindex: true,
  });
}

export default async function RemixPage({ params }: Props) {
  const { id } = await params;

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
      <ScriptGenerator hook={hook} allowAnonymous />
    </div>
  );
}
