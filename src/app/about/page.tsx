import { createPageMetadata } from "@/lib/seo";
import { site } from "@/content/site";
import { team } from "@/content/team";
import { PageIntro } from "@/components/sections/PageIntro";
import { TeamBio } from "@/components/sections/TeamBio";
import { CTABanner } from "@/components/sections/CTABanner";
import Reveal from "@/components/motion/Reveal";

export const metadata = createPageMetadata("/about");

export default function AboutPage() {
  return (
    <>
      <PageIntro
        kicker="About"
        title={site.pages.about.headline}
        intro={site.pages.about.subheadline}
      />

      {/* Our Story */}
      <section className="section-shell">
        <div className="grid-shell">
          <Reveal>
            <div className="mx-auto max-w-3xl">
              <h2 className="font-display text-3xl font-semibold text-timber md:text-4xl">
                Our Story
              </h2>
              <p className="mt-6 text-base leading-relaxed text-timber/80 md:text-lg">
                Jack and Jeff didn&apos;t set out to build a hospitality
                portfolio. It started with a single property and a shared
                conviction that the Upper Peninsula deserved better lodging
                options — places that honored the rugged beauty of the region
                while delivering the comfort and warmth guests remember long
                after they leave. Over the years, that conviction grew into JJ
                Properties: five distinctive hotels, resorts, and inns, each
                with its own character, all united by a commitment to genuine
                U.P. hospitality. From waterfront cabins on Lake Michigan to a
                historic hotel in the heart of Cedarville, every property in the
                portfolio reflects the hands-on approach Jack and Jeff bring to
                everything they do.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Team */}
      <section className="section-shell bg-birch">
        <div className="grid-shell">
          <Reveal>
            <h2 className="font-display mb-10 text-center text-3xl font-semibold text-timber md:text-4xl">
              Meet the Team
            </h2>
          </Reveal>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
            {team.map((member) => (
              <TeamBio key={member.name} member={member} />
            ))}
          </div>
        </div>
      </section>

      <CTABanner
        title="Interested in Working Together?"
        description="Whether you have a property to sell or want to explore investment opportunities, we'd love to hear from you."
        ctaLabel="Start a Conversation"
        ctaHref="/contact"
        variant="pine"
      />
    </>
  );
}
