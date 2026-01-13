"use client";

import { useSession } from "next-auth/react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function CreditBalance() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  const credits = session.user.credits;
  const isLow = credits <= 2;

  return (
    <div
      className={cn(
        "user-credits flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium transition-colors",
        isLow
          ? "bg-amber-50 text-amber-700 border border-amber-200"
          : "bg-primary-50 text-primary-700",
      )}
      title={`${credits} credits remaining`}
    >
      <Sparkles className={cn("h-4 w-4", isLow && "animate-pulse")} />
      <span>
        {credits} credit{credits !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
