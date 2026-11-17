import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AnalyticsConsent } from "@/components/analytics-consent";
import { AureliaLoadingSplash } from "@/components/aurelia-loading-splash";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
export const metadata: Metadata = {
  metadataBase: siteUrl && !siteUrl.includes("localhost") ? new URL(siteUrl) : undefined,
  title: { default: "The Aurelia | Hotel & Resort", template: "%s | The Aurelia Hotel & Resort" },
  description: "Discover The Aurelia Hotel & Resort — accommodation, celebrations, venues and guest experiences. Contact the hotel for verified availability and details.",
  applicationName: "The Aurelia Hotel & Resort",
  category: "travel",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: { type: "website", locale: "en_IN", siteName: "The Aurelia Hotel & Resort", title: "The Aurelia | Hotel & Resort", description: "Accommodation, celebrations, venues and guest experiences at The Aurelia." },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  twitter: { card: "summary_large_image", title: "The Aurelia | Hotel & Resort", description: "Accommodation, celebrations, venues and guest experiences at The Aurelia." },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#20372d" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const hotelSchema = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: "The Aurelia Hotel & Resort",
    description: "Hotel and resort offering accommodation, celebrations and event venues.",
    sameAs: [process.env.NEXT_PUBLIC_GOOGLE_BUSINESS_URL, process.env.NEXT_PUBLIC_INSTAGRAM_URL].filter(Boolean),
  };
  return <html lang="en-IN"><body><a className="skip-link" href="#main-content">Skip to main content</a>{children}<AureliaLoadingSplash /><AnalyticsConsent /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelSchema) }} /></body></html>;
}
