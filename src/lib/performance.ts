/**
 * Performance monitoring and optimization utilities
 */

export interface PerformanceMetrics {
  cacheHitRate: number;
  avgQueryTime: number;
  avgCacheTime: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
}

class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private cacheHits = 0;
  private cacheMisses = 0;

  recordQuery(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);
  }

  recordCacheHit(): void {
    this.cacheHits++;
  }

  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  getMetrics(): PerformanceMetrics {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const cacheHitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;

    const allDurations = Array.from(this.metrics.values()).flat();
    const avgQueryTime =
      allDurations.length > 0
        ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length
        : 0;

    return {
      cacheHitRate,
      avgQueryTime,
      avgCacheTime: 0, // Would need to track separately
      totalRequests,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
    };
  }

  reset(): void {
    this.metrics.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

let monitorInstance: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!monitorInstance) {
    monitorInstance = new PerformanceMonitor();
  }
  return monitorInstance;
}

/**
 * Measure execution time of an async function
 */
export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    getPerformanceMonitor().recordQuery(operation, duration);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    getPerformanceMonitor().recordQuery(`${operation}_error`, duration);
    throw error;
  }
}

/**
 * Debounce function for performance optimization
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for performance optimization
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Batch requests to avoid N+1 queries
 */
export class DataLoader<K, V> {
  private batchLoadFn: (keys: K[]) => Promise<Map<K, V>>;
  private cache: Map<K, Promise<V>> = new Map();
  private batch: K[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(
    batchLoadFn: (keys: K[]) => Promise<Map<K, V>>,
    private batchDelay = 10,
  ) {
    this.batchLoadFn = batchLoadFn;
  }

  async load(key: K): Promise<V> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const promise = new Promise<V>(() => {
      this.batch.push(key);

      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
      }

      this.batchTimer = setTimeout(async () => {
        const keysToLoad = [...this.batch];
        this.batch = [];

        try {
          const results = await this.batchLoadFn(keysToLoad);
          keysToLoad.forEach((k) => {
            const cachedPromise = this.cache.get(k);
            if (cachedPromise) {
              if (results.has(k)) {
                // Resolve the promise
                Promise.resolve()
                  .then(() => results.get(k))
                  .then((value) => {
                    // Store the value for future access
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (cachedPromise as any)._value = value;
                  });
              } else {
                // Reject if not found
                Promise.resolve()
                  .then(() => {
                    throw new Error(`Key not found: ${k}`);
                  })
                  .catch((err) => {
                    // Reject the promise
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (cachedPromise as any)._error = err;
                  });
              }
            }
          });
        } catch {
          // Handle error
        }
      }, this.batchDelay);
    });

    this.cache.set(key, promise);
    return promise;
  }

  clear(): void {
    this.cache.clear();
    this.batch = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }
}
