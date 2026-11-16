import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const routes = ["", "/rooms", "/weddings", "/venues", "/facilities", "/contact", "/book"];
  return routes.map((route) => ({ url: `${base.replace(/\/$/, "")}${route}`, changeFrequency: route === "" ? "weekly" : "monthly", priority: route === "" ? 1 : 0.7 }));
}
