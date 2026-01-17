export function measureBlogLoad(slug: string, callback: () => Promise<void>) {
  const startTime = performance.now();
  return callback().then(() => {
    const endTime = performance.now();
    const loadTime = endTime - startTime;
    if (process.env.NODE_ENV === "development") {
      const timeStr = loadTime.toFixed(2);
      console.log(`[Performance] Blog "${slug}" loaded in ${timeStr}ms`);
    }
    return loadTime;
  });
}

export function trackCoreWebVitals() {
  if (typeof window === "undefined") return;
  if ("PerformanceObserver" in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as Array<
          PerformanceEntry & {
            renderTime?: number;
            loadTime?: number;
          }
        >;
        const lastEntry = entries[entries.length - 1];
        const lcp = lastEntry?.renderTime || lastEntry?.loadTime;
        const lcpStr = lcp?.toFixed(2) || "N/A";
        console.log(`[CWV] LCP: ${lcpStr}ms`);
      });
      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
    } catch {
      console.warn("LCP observer not supported");
    }
  }
}

export function initPerformanceMonitoring() {
  if (typeof window === "undefined") return;
  trackCoreWebVitals();
}
