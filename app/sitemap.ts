import type { MetadataRoute } from "next";
import { PROJECTS } from "./content";
import { WEBSITE } from "./cv";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: WEBSITE, priority: 1 },
    { url: `${WEBSITE}/resume`, priority: 0.8 },
    ...PROJECTS.map((p) => ({ url: `${WEBSITE}/p/${p.slug}`, priority: 0.7 })),
  ];
}
