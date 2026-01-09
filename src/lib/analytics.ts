export const trackEvent = (
  event: string,
  properties?: Record<string, unknown>,
) => {
  if (typeof window === "undefined") return;
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void })
    .gtag;
  if (gtag) {
    gtag("event", event, properties);
  }
};
