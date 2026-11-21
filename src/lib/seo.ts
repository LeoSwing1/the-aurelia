import type { Metadata } from "next";
import { resolveSiteUrl } from "@/lib/site-url";

export const SITE_NAME = "The Aurelia Hotel & Resort";
export const SITE_SHORT_NAME = "The Aurelia";
export const BRAND_COLOR = "#20372d";
export const OG_IMAGE_ALT = "The Aurelia Hotel & Resort: stays, weddings, banquets and events";

/** Canonical production origin without a trailing slash. Falls back to localhost for development. */
export function siteUrl(): string {
  return resolveSiteUrl();
}

export function absoluteUrl(path = "/"): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export const INDEXABLE_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: true,
  follow: true,
  googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
};

type PageSeo = {
  title: string;
  description: string;
  /** Route path, e.g. "/rooms". Used for the canonical URL and og:url. */
  path: string;
  /** Use for transactional or private pages that must not appear in search results. */
  noIndex?: boolean;
  /** Set to true for the homepage so the title is not suffixed by the layout template. */
  absoluteTitle?: boolean;
  keywords?: string[];
};

/**
 * One place to build per-page metadata so every public page gets a canonical URL,
 * page-specific Open Graph / Twitter tags and consistent robots directives.
 * Page-level openGraph replaces the inherited file-based image, so the generated
 * /opengraph-image and /twitter-image routes are referenced explicitly here.
 */
export function pageMetadata({ title, description, path, noIndex, absoluteTitle, keywords }: PageSeo): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: SITE_NAME,
      url: path,
      title: fullTitle,
      description,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: OG_IMAGE_ALT, type: "image/png" }],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [{ url: "/twitter-image", alt: OG_IMAGE_ALT }] },
    // Always emit robots: an undefined key would wipe the layout's index/follow directives.
    robots: noIndex
      ? { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } }
      : INDEXABLE_ROBOTS,
  };
}
