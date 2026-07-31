/**
 * The canonical origin for this deployment, used for canonical tags, Open Graph
 * URLs, robots.txt, and the sitemap.
 *
 * There is deliberately no production fallback. The previous default was
 * `https://www.jjproperties.com` — a domain J&J does not own; it is parked on
 * Afternic and listed for sale (TWE-191), and which domain the brand will
 * actually use is still an open client decision (TWE-114). Shipping that
 * default would have pointed every canonical tag on the site at an origin
 * someone else controls.
 *
 * So a production build without NEXT_PUBLIC_SITE_URL fails loudly instead of
 * publishing the wrong origin quietly. Development falls back to localhost.
 */
const DEV_FALLBACK = "http://localhost:3004";

function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;

  if (configured) {
    // Trailing slash would double up in `${SITE_URL}${route}`.
    return configured.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be set for production builds. " +
        "Set it to the site's canonical origin (e.g. https://example.com) " +
        "in the deployment environment. There is no default — see TWE-193."
    );
  }

  return DEV_FALLBACK;
}

export const SITE_URL = resolveSiteUrl();
