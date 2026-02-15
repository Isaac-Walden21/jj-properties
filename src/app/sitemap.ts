import type { MetadataRoute } from "next";
import { properties } from "@/content/properties";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.jjproperties.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "/",
    "/properties",
    "/about",
    "/sell",
    "/invest",
    "/contact",
  ];

  const propertyRoutes = properties.map(
    (p) => `/properties/${p.slug}`
  );

  const allRoutes = [...staticRoutes, ...propertyRoutes];

  return allRoutes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route === "/properties" ? 0.9 : 0.7,
  }));
}
