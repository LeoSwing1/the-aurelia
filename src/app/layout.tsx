import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AnalyticsConsent } from "@/components/analytics-consent";
import { AureliaLoadingSplash } from "@/components/aurelia-loading-splash";
import { BRAND_COLOR, SITE_NAME, SITE_SHORT_NAME, siteUrl as siteUrlFn, INDEXABLE_ROBOTS } from "@/lib/seo";

const siteUrl = siteUrlFn();
const defaultDescription = "Discover The Aurelia Hotel & Resort: rooms and suites, wedding and banquet venues, meetings, celebrations and guest facilities. Contact the hotel for verified availability.";
const verificationOther: Record<string, string> = {};
if (process.env.BING_SITE_VERIFICATION) verificationOther["msvalidate.01"] = process.env.BING_SITE_VERIFICATION;
export const metadata: Metadata = {
  metadataBase: siteUrl && !siteUrl.includes("localhost") ? new URL(siteUrl) : undefined,
  title: { default: "The Aurelia | Hotel & Resort", template: `%s | ${SITE_NAME}` },
  description: defaultDescription,
  applicationName: SITE_NAME,
  generator: "Next.js",
  category: "travel",
  keywords: ["The Aurelia", "hotel", "resort", "hotel rooms", "wedding venue", "banquet hall", "event venue", "conference room"],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  referrer: "strict-origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },
  robots: INDEXABLE_ROBOTS,
  openGraph: { type: "website", locale: "en_IN", siteName: SITE_NAME, title: "The Aurelia | Hotel & Resort", description: defaultDescription },
  twitter: { card: "summary_large_image", title: "The Aurelia | Hotel & Resort", description: defaultDescription },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: Object.keys(verificationOther).length ? verificationOther : undefined,
  },
  appleWebApp: { capable: true, title: SITE_SHORT_NAME, statusBarStyle: "black-translucent" },
};
// The brand splash plays once per browser session; later page loads in the same session open instantly.
// Runs before first paint so returning pages never flash the overlay.
const SPLASH_SEEN_SCRIPT = "try{var c=document.documentElement.classList;if(sessionStorage.getItem('aurelia-splash-seen'))c.add('aurelia-splash-seen');var a=localStorage.getItem('aurelia-analytics-consent');if(a==='accepted'||a==='rejected')c.add('aurelia-consent-set')}catch(e){}";
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: BRAND_COLOR, colorScheme: "light" };

function hotelJsonLd() {
  const url = siteUrlFn();
  const street = process.env.NEXT_PUBLIC_HOTEL_STREET_ADDRESS;
  const locality = process.env.NEXT_PUBLIC_HOTEL_CITY;
  const region = process.env.NEXT_PUBLIC_HOTEL_STATE;
  const postal = process.env.NEXT_PUBLIC_HOTEL_POSTAL_CODE;
  const phone = process.env.NEXT_PUBLIC_HOTEL_PHONE;
  const email = process.env.NEXT_PUBLIC_HOTEL_PUBLIC_EMAIL;
  const sameAs = [process.env.NEXT_PUBLIC_GOOGLE_BUSINESS_URL, process.env.NEXT_PUBLIC_INSTAGRAM_URL, process.env.NEXT_PUBLIC_FACEBOOK_URL].filter(Boolean);
  // Address, phone and email are only published once the hotel has verified them (set the env vars).
  const hotel: Record<string, unknown> = {
    "@type": "Hotel",
    "@id": `${url}/#hotel`,
    name: SITE_NAME,
    url,
    image: `${url}/opengraph-image`,
    logo: `${url}/icon`,
    description: "Hotel and resort offering Deluxe and Executive rooms, wedding and banquet venues, a conference room, restaurant and poolside garden.",
    amenityFeature: ["Swimming pool", "Fitness centre", "Restaurant", "Parking", "Banquet hall", "Conference room"].map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true })),
    ...(sameAs.length ? { sameAs } : {}),
    ...(phone ? { telephone: phone } : {}),
    ...(email ? { email } : {}),
    ...(street && locality ? { address: { "@type": "PostalAddress", streetAddress: street, addressLocality: locality, addressRegion: region, postalCode: postal, addressCountry: "IN" } } : {}),
  };
  const website = { "@type": "WebSite", "@id": `${url}/#website`, url, name: SITE_NAME, inLanguage: "en-IN", publisher: { "@id": `${url}/#hotel` } };
  return { "@context": "https://schema.org", "@graph": [hotel, website] };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const hotelSchema = hotelJsonLd();
  return <html lang="en-IN" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: SPLASH_SEEN_SCRIPT }} /></head><body><a className="skip-link" href="#main-content">Skip to main content</a>{children}<AureliaLoadingSplash /><AnalyticsConsent /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(hotelSchema).replace(/</g, "\\u003c") }} /></body></html>;
}
