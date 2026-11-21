"use client";

type GtagParams = Record<string, string | number | boolean | undefined>;
type GtagWindow = Window & {
  gtag?: (command: "event", name: string, params?: GtagParams) => void;
  fbq?: (command: "track" | "trackCustom", name: string, params?: GtagParams) => void;
};

// GA4 event -> Meta Pixel standard event (only conversions worth optimising ads for).
const META_EVENTS: Record<string, string> = { generate_lead: "Lead", begin_checkout: "InitiateCheckout", add_payment_info: "AddPaymentInfo" };

/**
 * Send a GA4 event (and the matching Meta Pixel standard event when the pixel is configured). GA is only loaded after the visitor accepts analytics
 * (see analytics-consent.tsx), so this is a safe no-op before consent or when
 * NEXT_PUBLIC_GA_MEASUREMENT_ID is not configured.
 * Never pass names, emails, phone numbers or booking references: GA4 forbids PII.
 */
export function trackEvent(name: string, params: GtagParams = {}): void {
  if (typeof window === "undefined") return;
  const w = window as GtagWindow;
  try {
    if (typeof w.gtag === "function") w.gtag("event", name, params);
    const metaEvent = META_EVENTS[name];
    if (metaEvent && typeof w.fbq === "function") w.fbq("track", metaEvent, { content_category: String(params.lead_type ?? params.payment_type ?? "reservation"), ...(params.value ? { value: params.value, currency: String(params.currency ?? "INR") } : {}) });
  } catch {
    /* analytics must never break a guest flow */
  }
}
