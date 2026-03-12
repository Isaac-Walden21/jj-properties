import type { Metadata } from "next";
import { seoByRoute } from "@/content/seo";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.jjproperties.com";

export function createPageMetadata(route: string): Metadata {
  const seo = seoByRoute[route] ?? seoByRoute["/404"]!;

  const url = `${BASE_URL}${route === "/" ? "" : route}`;

  return {
    title: seo.title,
    description: seo.description,
    metadataBase: new URL(BASE_URL),
    alternates: { canonical: url },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url,
      siteName: "JJ Resort Properties",
      images: [{ url: seo.ogImage, width: 1200, height: 630 }],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [seo.ogImage],
    },
  };
}
