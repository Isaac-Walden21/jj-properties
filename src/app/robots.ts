import type { MetadataRoute } from "next";
import { SITE_URL as BASE_URL, IS_INDEXABLE } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  // Until the brand domain is bought and NEXT_PUBLIC_SITE_URL points at it, the
  // site is served from a temporary nip.io origin. Letting that get crawled
  // would put the whole site in the index under a host we intend to throw away,
  // and then compete with the real domain for it. Disallow everything, and omit
  // the sitemap so there is nothing to follow either.
  if (!IS_INDEXABLE) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
