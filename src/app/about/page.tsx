import Image from "next/image";
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

      {/* Team */}
      <section className="section-shell bg-sand-light">
        <div className="grid-shell">
          <Reveal>
            <h2 className="font-display mb-10 text-center text-3xl font-semibold text-navy md:text-4xl">
              Meet the Team
            </h2>
          </Reveal>

          <Reveal>
            <div className="relative mx-auto mb-10 aspect-[16/9] max-w-4xl overflow-hidden rounded-2xl border border-navy/10 shadow-card">
              <Image
                src="/jeff-jack.jpg"
                alt="Jeff and Jack"
                fill
                className="object-cover"
              />
            </div>
          </Reveal>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
            {team.map((member) => (
              <TeamBio key={member.name} member={member} showImage={false} />
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="section-shell">
        <div className="grid-shell">
          <Reveal>
            <div className="mx-auto max-w-3xl">
              <h2 className="font-display text-center text-3xl font-semibold text-navy md:text-4xl">
                Our Story
              </h2>
              <p className="mt-6 text-base leading-relaxed text-navy/80 md:text-lg">
                Jeff and Jack are no strangers to acquiring and successfully
                managing vacation properties in Northern Michigan. It all started
                when Jeff decided to leave his career as a retirement advisor to
                purchase and manage some of the very same resorts his family grew
                up vacationing at each summer — Island View Resort in Hessel,
                Michigan. Today, Island View still hosts Jeff and Jack&apos;s
                family for its annual traditions and has expanded its guest list
                to include syndicated shows such as the casts of Michigan Out of
                Doors and Under the Radar.
              </p>
              <p className="mt-4 text-base leading-relaxed text-navy/80 md:text-lg">
                In 2022, Jeff and Jack closed on Papin&apos;s Resort, offering
                its previous owners the opportunity to move to Florida and enjoy
                retirement worry-free. In 2023, they expanded into hotels,
                acquiring the Cedarville Hotel and Tahquamenon Suites Lodging.
                The prior owner was able to retire and move south, and Jack
                subsequently left his corporate finance career to pursue his
                passion in real estate full-time.
              </p>
              <p className="mt-4 text-base leading-relaxed text-navy/80 md:text-lg">
                Today, JJ Resort Properties operates five distinctive hotels, resorts,
                and inns across Michigan&apos;s Upper Peninsula — each with its
                own character, all united by a commitment to genuine U.P.
                hospitality and a deep appreciation for the region&apos;s natural
                beauty.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <CTABanner
        title="Interested in Working Together?"
        description="Whether you have a property to sell or want to explore investment opportunities, we'd love to hear from you."
        ctaLabel="Start a Conversation"
        ctaHref="/contact"
        variant="navy"
      />
    </>
  );
}
