import { createPageMetadata } from "@/lib/seo";
import { site } from "@/content/site";
import { PageIntro } from "@/components/sections/PageIntro";
import { ValuePropSection } from "@/components/sections/ValuePropSection";
import { CTABanner } from "@/components/sections/CTABanner";
import Reveal from "@/components/motion/Reveal";
import StaggerItems from "@/components/motion/StaggerItems";

export const metadata = createPageMetadata("/sell");

const steps = [
  {
    number: "01",
    title: "Initial Discussion",
    description:
      "We schedule a conversation to learn about your property, your goals, expectations, and any concerns you may have. No pressure, no obligations.",
  },
  {
    number: "02",
    title: "Due Diligence",
    description:
      "Our team conducts a thorough examination of the property in person, gathering the details needed to ensure a smooth transition upon sale.",
  },
  {
    number: "03",
    title: "Closing",
    description:
      "Once we reach an agreement, we handle the paperwork, transfer ownership, and you walk away with peace of mind and funds in hand.",
  },
];

const faqs = [
  {
    question: "Why shouldn't I just list with a real estate agent?",
    answer:
      "You're welcome to, but most agents are limited in their ability to market a unique hospitality property outside their small geographic area — which can mean a long process to find a serious buyer. When you sell to us, there are no agent fees (typically ~6%), and we recommend you spend a fraction of that on an attorney to review all the paperwork instead.",
  },
  {
    question: "How do you determine what my property is worth?",
    answer:
      "We pay for a professional appraisal during the purchase process. There are many factors that affect a property's value — including the income it generates, comparable sales, and the cost to rebuild. Appraisers consider all of these to ensure you receive equitable value, and we're happy to walk you through the details.",
  },
  {
    question: "Do I need to make repairs before selling?",
    answer:
      "No. We buy properties in as-is condition — no matter the state of repair. You don't need to worry about fixing anything up or cleaning before the sale.",
  },
  {
    question: "How quickly can you close?",
    answer:
      "We can close quickly or on your schedule — whatever works best for you. We have established relationships with multiple lenders and a proven track record, which allows us to move fast when you're ready.",
  },
];

export default function SellPage() {
  return (
    <>
      <PageIntro
        kicker="Sell"
        title={site.pages.sell.headline}
        intro={site.pages.sell.subheadline}
      />

      <ValuePropSection
        title="Why Sell to JJ Resort Properties"
        intro="With ownership of multiple resorts and hotels, we have a proven track record of successfully acquiring and operating hospitality properties. We understand the unique challenges of running a hospitality business and are committed to preserving the hard work you've invested in building your property's reputation."
        benefits={[
          "No broker fees or hidden costs — ever",
          "We buy properties in as-is condition",
          "Confidential process from first conversation to closing",
          "Quick timelines — we close when you're ready",
          "We preserve the legacy and character of your property",
          "Customized solutions tailored to your specific needs",
        ]}
        ctaLabel={site.pages.sell.cta.label}
        ctaHref="/contact?type=sell"
      />

      {/* How It Works */}
      <section className="section-shell bg-sand-light">
        <div className="grid-shell">
          <Reveal>
            <h2 className="font-display text-center text-3xl font-semibold text-navy md:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base text-navy/80 md:text-lg">
              Selling your property can be a quick and simple process. Here&apos;s how we make it happen.
            </p>
          </Reveal>

          <StaggerItems className="mx-auto mt-12 grid max-w-4xl gap-8 md:grid-cols-3" delayStep={0.1}>
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <span className="font-display text-5xl font-bold text-teal/20">
                  {step.number}
                </span>
                <h3 className="font-display mt-2 text-xl font-semibold text-navy">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-navy/70">
                  {step.description}
                </p>
              </div>
            ))}
          </StaggerItems>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-shell">
        <div className="grid-shell">
          <Reveal>
            <h2 className="font-display text-center text-3xl font-semibold text-navy md:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base text-navy/80 md:text-lg">
              Have questions? Here are answers to the ones we hear most. If you still have a question, don&apos;t hesitate to reach out.
            </p>
          </Reveal>

          <div className="mx-auto mt-12 max-w-3xl space-y-8">
            {faqs.map((faq) => (
              <Reveal key={faq.question}>
                <div>
                  <h3 className="font-display text-lg font-semibold text-navy">
                    {faq.question}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy/70 md:text-base">
                    {faq.answer}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CTABanner
        title="See What We Can Offer"
        description="Start with a confidential conversation about your property. No pressure, no obligations — just a straightforward discussion about what your property is worth."
        ctaLabel="Get Your Offer"
        ctaHref="/contact?type=sell"
        variant="navy"
      />
    </>
  );
}
