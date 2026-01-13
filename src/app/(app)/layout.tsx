import { Header } from "@/components/Header";
import { OnboardingTour } from "@/components/OnboardingTour";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <OnboardingTour />
      <main className="container mx-auto px-4 py-10">
        <div className="mb-6 flex flex-wrap gap-2 text-sm text-gray-600">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard" prefetch>
              My Scripts
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/analyze" prefetch>
              Analyze Competitors
            </Link>
          </Button>
        </div>
        {children}
      </main>
    </>
  );
}
