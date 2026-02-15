import { createPageMetadata } from "@/lib/seo";
import { site } from "@/content/site";
import { PageIntro } from "@/components/sections/PageIntro";
import { ValuePropSection } from "@/components/sections/ValuePropSection";
import { CTABanner } from "@/components/sections/CTABanner";

export const metadata = createPageMetadata("/sell");

export default function SellPage() {
  return (
    <>
      <PageIntro
        kicker="Sell"
        title={site.pages.sell.headline}
        intro={site.pages.sell.subheadline}
      />

      <ValuePropSection
        title="Why Sell to JJ Properties"
        intro="We understand what makes Upper Peninsula hospitality properties special. When we acquire a property, we're committed to preserving its character while investing in its future."
        benefits={[
          "Fair market valuations backed by local expertise",
          "Confidential process from first conversation to closing",
          "Quick timelines — we move when you're ready",
          "We preserve the legacy and character of your property",
          "No broker fees or hidden costs",
        ]}
        ctaLabel={site.pages.sell.cta.label}
        ctaHref="/contact?type=sell"
      />

      <CTABanner
        title="Ready to Discuss?"
        description="Start with a confidential conversation about your property. No pressure, no obligations — just a straightforward discussion about what your property is worth."
        ctaLabel="Start a Conversation"
        ctaHref="/contact?type=sell"
        variant="timber"
      />
    </>
  );
}
