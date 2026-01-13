import type { Metadata } from "next";

export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { generateMetadata as buildMetadata } from "@/lib/seo";
import { CompetitorAnalysis } from "@/components/CompetitorAnalysis";

export const metadata: Metadata = buildMetadata({
  title: "Analyze TikTok Ad",
  description:
    "Break down any TikTok ad into a reusable hook and script template with AI.",
  noindex: true,
});

export default async function AnalyzePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/analyze`);
  }

  return (
    <div className="space-y-8">
      <CompetitorAnalysis />
    </div>
  );
}
