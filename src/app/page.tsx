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

      <ValuePropSection
        title={site.pages.sell.headline}
        intro={site.pages.sell.subheadline}
        benefits={[
          "We acquire properties at fair market value",
          "Quick, hassle-free closings",
          "Decades of local market expertise",
          "Confidential evaluation process",
        ]}
        ctaLabel={site.pages.sell.cta.label}
        ctaHref="/contact?type=sell"
      />

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
        ctaHref="/contact?type=invest"
        reversed
      />

      <CTABanner
        title="Ready to Explore?"
        description="Whether you're planning a visit, looking to sell, or interested in investing, we'd love to connect."
        ctaLabel="Contact Us"
        ctaHref="/contact"
      />
    </>
  );
}
