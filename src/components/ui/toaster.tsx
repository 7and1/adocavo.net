"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import {
  ToastProvider as RadixToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
} from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <RadixToastProvider>
      <React.Fragment>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            variant={
              toast.variant as "default" | "destructive" | "success" | undefined
            }
            onOpenChange={(open) => {
              if (!open) dismiss(toast.id);
            }}
          >
            <div className="grid gap-1">
              {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
              {toast.description && (
                <ToastDescription>{toast.description}</ToastDescription>
              )}
            </div>
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport />
      </React.Fragment>
    </RadixToastProvider>
  );
}
