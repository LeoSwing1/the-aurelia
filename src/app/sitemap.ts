import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

// Only indexable public pages. /pay, /reservation-status, /staff-login and /admin are noindex and excluded.
const routes: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/rooms", changeFrequency: "weekly", priority: 0.9 },
  { path: "/book", changeFrequency: "monthly", priority: 0.9 },
  { path: "/weddings", changeFrequency: "monthly", priority: 0.8 },
  { path: "/venues", changeFrequency: "monthly", priority: 0.8 },
  { path: "/facilities", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map(({ path, changeFrequency, priority }) => ({ url: absoluteUrl(path), lastModified, changeFrequency, priority }));
}
