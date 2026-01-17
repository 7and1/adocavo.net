"use client";

import { useEffect } from "react";
import { trackCoreWebVitals } from "@/lib/performance-monitor";

export function PerformanceMonitor() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === "true") {
      trackCoreWebVitals();
    }
  }, []);

  return null;
}
