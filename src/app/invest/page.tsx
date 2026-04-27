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
        kicker="Partner"
        title={site.pages.invest.headline}
        intro={site.pages.invest.subheadline}
      />

      <ValuePropSection
        title="Why Partner with JJ Resort Properties"
        intro="Michigan's Upper Peninsula is one of the Midwest's best-kept secrets — and the tourism market is growing. Our commitment extends beyond the transaction. We remain dedicated to supporting our partners' success and fostering ongoing growth in the hospitality industry."
        benefits={[
          "Proven portfolio of revenue-generating properties",
          "Growing tourism market with year-round demand",
          "Experienced operators with deep local knowledge and a hands-on approach",
          "Flexible partnership structures tailored to your goals",
          "Transparent reporting and open communication",
          "Long-term commitment to mutual success",
        ]}
        ctaLabel={site.pages.invest.cta.label}
        ctaHref="/contact?type=invest"
        image={{
          src: "/images/les-cheneaux-islands.jpeg",
          alt: "Les Cheneaux Islands in Michigan's Upper Peninsula",
        }}
      />

      <CTABanner
        title="Let's Explore the Opportunity"
        description="We're always open to conversations with aligned partners who share our vision for Upper Peninsula hospitality. No matter where you are in the process, we'd love to hear from you."
        ctaLabel="Get in Touch"
        ctaHref="/contact?type=invest"
        variant="navy"
      />
    </>
  );
}
