import { createPageMetadata } from "@/lib/seo";
import { site } from "@/content/site";
import { HeroSection } from "@/components/sections/HeroSection";
import { PortfolioStrip } from "@/components/sections/PortfolioStrip";
import { ValuePropSection } from "@/components/sections/ValuePropSection";
import { CTABanner } from "@/components/sections/CTABanner";

export const metadata = createPageMetadata("/");

export default function HomePage() {
  return (
    <>
      <HeroSection />

      <PortfolioStrip />

      {/* Stay with Us */}
      <ValuePropSection
        title="Stay with Us"
        intro="Five distinctive properties across Michigan's Upper Peninsula — from lakefront resorts on Lake Michigan to historic inns in the heart of Cedarville. Each one offers genuine U.P. hospitality and a connection to the region's natural beauty."
        benefits={[
          "Waterfront resorts, cozy inns, and modern suites",
          "Year-round activities from fishing to snowshoeing",
          "Family-friendly properties with decades of hospitality heritage",
          "Direct booking available at each property",
        ]}
        ctaLabel="Explore Properties"
        ctaHref="/properties"
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
