"use client";

import { useSession } from "next-auth/react";

export interface CreditBalanceReturn {
  credits: number | null;
  isLow: boolean;
  hasCredits: boolean;
  canGenerate: boolean;
}

const CREDIT_THRESHOLD_LOW = 2;
const CREDITS_PER_GENERATION = 1;

export function useCreditBalance(): CreditBalanceReturn {
  const { data: session } = useSession();

  const credits = session?.user?.credits ?? null;

  const isLow = credits !== null && credits <= CREDIT_THRESHOLD_LOW;
  const hasCredits = credits !== null && credits > 0;
  const canGenerate = credits !== null && credits >= CREDITS_PER_GENERATION;

  return {
    credits,
    isLow,
    hasCredits,
    canGenerate,
  };
}
