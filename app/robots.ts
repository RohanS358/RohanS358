import type { MetadataRoute } from "next";
import { WEBSITE } from "./cv";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/studio"] },
    sitemap: `${WEBSITE}/sitemap.xml`,
  };
}
