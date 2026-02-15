import { createPageMetadata } from "@/lib/seo";
import { site } from "@/content/site";
import { PageIntro } from "@/components/sections/PageIntro";
import { ValuePropSection } from "@/components/sections/ValuePropSection";
import { CTABanner } from "@/components/sections/CTABanner";

export const metadata = createPageMetadata("/invest");

export default function InvestPage() {
  return (
    <>
      <PageIntro
        kicker="Invest"
        title={site.pages.invest.headline}
        intro={site.pages.invest.subheadline}
      />

      <ValuePropSection
        title="Why Invest in the U.P."
        intro="Michigan's Upper Peninsula is one of the Midwest's best-kept secrets — and the tourism market is growing. Partnering with JJ Properties gives you access to a proven portfolio with experienced operators at the helm."
        benefits={[
          "Proven portfolio of revenue-generating properties",
          "Growing tourism market with year-round demand",
          "Experienced operators with deep local knowledge",
          "Flexible partnership structures",
          "Transparent reporting and communication",
        ]}
        ctaLabel={site.pages.invest.cta.label}
        ctaHref="/contact?type=invest"
      />

      <CTABanner
        title="Let's Talk About the Opportunity"
        description="We're always open to conversations with aligned investors who share our vision for Upper Peninsula hospitality."
        ctaLabel="Get in Touch"
        ctaHref="/contact?type=invest"
        variant="pine"
      />
    </>
  );
}
