import type { MetadataRoute } from "next";
import { SITE_URL as BASE_URL } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "/",
    "/properties",
    "/about",
    "/sell",
    "/invest",
    "/contact",
  ];

  // No per-property routes here. There is no /properties/[slug] page — the
  // /properties index links straight out to each property's own site — so
  // emitting them advertised five 404s to search engines (TWE-194). If detail
  // pages are ever built, add the routes back alongside them.
  return staticRoutes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route === "/properties" ? 0.9 : 0.7,
  }));
}
