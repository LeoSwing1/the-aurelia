import type { MetadataRoute } from "next";
import { BRAND_COLOR, SITE_NAME, SITE_SHORT_NAME } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: "Rooms, weddings, banquets, meetings and guest facilities at The Aurelia Hotel & Resort.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4efe4",
    theme_color: BRAND_COLOR,
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
