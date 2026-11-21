/**
 * Canonical public origin of the site, without a trailing slash.
 *
 * NEXT_PUBLIC_SITE_URL wins when it is a real address. If it is missing or still the local
 * development value in a Vercel deployment, fall back to Vercel's own production domain so that
 * payment links in guest emails, canonical URLs, the sitemap and robots.txt never point at localhost.
 */
export function resolveSiteUrl(): string {
  const explicit = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  const isLocal = !explicit || /localhost|127\.0\.0\.1/.test(explicit);
  if (!isLocal) return explicit;
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (process.env.VERCEL && vercelProduction) return `https://${vercelProduction.replace(/\/$/, "")}`;
  if (process.env.VERCEL && process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return explicit || "http://localhost:3000";
}

export const isPublicSiteUrl = () => !/localhost|127\.0\.0\.1/.test(resolveSiteUrl());

/** True only for a real GA4 measurement ID (rejects empty values and the G-XXXXXXXXXX placeholder). */
export function isValidGaId(id: string | undefined | null): id is string {
  return Boolean(id && /^G-[A-Z0-9]{6,12}$/.test(id) && !/X{4,}/.test(id));
}

const FREE_MAIL = /@(gmail|googlemail|yahoo|ymail|outlook|hotmail|live|rediffmail|icloud|proton|protonmail)\./i;
/** Brevo/Resend cannot authenticate (SPF/DKIM/DMARC) mail sent "from" a free mailbox provider. */
export const isFreeMailSender = (address: string | undefined | null) => Boolean(address && FREE_MAIL.test(address));

/** True only for a numeric Meta (Facebook) Pixel / dataset ID. */
export function isValidMetaPixelId(id: string | undefined | null): id is string {
  return Boolean(id && /^\d{10,20}$/.test(id));
}
