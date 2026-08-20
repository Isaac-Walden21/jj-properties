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

/**
 * Hosts that are allowed to be indexed by search engines.
 *
 * Everything else the site is reachable on — the nip.io origin it runs on until
 * the client buys the real domain, the old *.vercel.app host, localhost — must
 * stay out of the index. This is deliberately keyed off the canonical origin
 * rather than a separate NEXT_PUBLIC_INDEXABLE flag: one variable to set at
 * cutover instead of two, and the pair cannot drift out of step.
 *
 * It fails closed. An unrecognised host is treated as not-production and gets a
 * blanket disallow, so the cost of forgetting to update this list is an
 * unindexed site, not a duplicate of the whole site indexed on a junk origin.
 *
 * Add the real domain here at cutover — see TWE-114 (which domain) and TWE-211
 * (the *.vercel.app host was publicly indexable; same failure, different host).
 */
const INDEXABLE_HOSTS = ["jjresortproperties.com", "www.jjresortproperties.com"];

export const IS_INDEXABLE = (() => {
  try {
    return INDEXABLE_HOSTS.includes(new URL(SITE_URL).hostname);
  } catch {
    return false;
  }
})();
