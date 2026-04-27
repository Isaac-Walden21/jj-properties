import { createPageMetadata } from "@/lib/seo";
import { site } from "@/content/site";
import { HeroSection } from "@/components/sections/HeroSection";
import { ValuePropSection } from "@/components/sections/ValuePropSection";
import { CTABanner } from "@/components/sections/CTABanner";

export const metadata = createPageMetadata("/");

export default function HomePage() {
  return (
    <>
      <HeroSection />

      {/* Stay with Us */}
      <ValuePropSection
        title="Stay with Us"
        intro="Five properties across Michigan's Upper Peninsula — from island resorts to small-town inns. Each one offers genuine U.P. hospitality and a connection to the region's natural beauty."
        benefits={[
          "Waterfront resorts, cozy inns, and modern suites",
          "Year-round activities from fishing to snowshoeing",
          "Family-friendly properties with decades of hospitality heritage",
          "Direct booking available at each property",
        ]}
        ctaLabel="Explore Properties"
        ctaHref="/properties"
        image={{
          src: "/JJ-resort-property-maps.png",
          alt: "Map showing JJ Properties resort locations across Michigan's Upper Peninsula",
        }}
      />

      {/* Sell to Us */}
      <ValuePropSection
        title={site.pages.sell.headline}
        intro={site.pages.sell.subheadline}
        benefits={[
          "We acquire properties at fair market value",
          "Quick, hassle-free closings — no agents, no fees",
          "We buy properties in as-is condition",
          "Confidential evaluation process",
        ]}
        ctaLabel={site.pages.sell.cta.label}
        ctaHref="/sell"
        reversed
        image={{
          src: "/images/cedarville-bay.jpg",
          alt: "Cedarville Bay waterfront in Michigan's Upper Peninsula",
        }}
      />

      {/* Partner with Us */}
      <ValuePropSection
        title={site.pages.invest.headline}
        intro={site.pages.invest.subheadline}
        benefits={[
          "Proven portfolio of revenue-generating properties",
          "Growing tourism market with year-round demand",
          "Experienced operators with deep local knowledge",
          "Flexible partnership structures",
        ]}
        ctaLabel={site.pages.invest.cta.label}
        ctaHref="/invest"
        image={{
          src: "/images/year-round-adventure.jpg",
          alt: "Year-round adventure in Michigan's Upper Peninsula",
        }}
      />

      <CTABanner
        title="Ready to Connect?"
        description="Whether you're planning a visit, looking to sell, or interested in partnering, we'd love to hear from you."
        ctaLabel="Contact Us"
        ctaHref="/contact"
      />
    </>
  );
}
