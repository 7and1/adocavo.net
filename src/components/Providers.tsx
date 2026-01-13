"use client";

import { SessionProvider } from "next-auth/react";
import { ToastContextProvider } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastContextProvider>
        <>
          {children}
          <Toaster />
        </>
      </ToastContextProvider>
    </SessionProvider>
  );
}
