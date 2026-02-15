import { Check } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import StaggerItems from "@/components/motion/StaggerItems";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cn } from "@/lib/utils";

interface ValuePropSectionProps {
  title: string;
  intro: string;
  benefits: string[];
  ctaLabel: string;
  ctaHref: string;
  reversed?: boolean;
}

export function ValuePropSection({
  title,
  intro,
  benefits,
  ctaLabel,
  ctaHref,
  reversed = false,
}: ValuePropSectionProps) {
  return (
    <section className="section-shell">
      <div className="grid-shell">
        <div
          className={cn(
            "grid items-center gap-12 md:grid-cols-2 md:gap-16",
            reversed && "md:[&>*:first-child]:order-2"
          )}
        >
          {/* Text content */}
          <div>
            <Reveal>
              <h2 className="font-display text-4xl font-semibold text-timber md:text-5xl">
                {title}
              </h2>

              <p className="text-balance mt-4 max-w-xl text-base text-timber/80 md:text-lg">
                {intro}
              </p>
            </Reveal>

            <StaggerItems className="mt-8 space-y-4" delayStep={0.08}>
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3">
                  <span className="mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-pine/10 p-1 text-pine">
                    <Check className="h-4 w-4" />
                  </span>
                  <span className="text-sm text-timber/80 md:text-base">
                    {benefit}
                  </span>
                </div>
              ))}
            </StaggerItems>

            <Reveal delay={0.3}>
              <div className="mt-8">
                <ButtonLink href={ctaHref} variant="primary">
                  {ctaLabel}
                </ButtonLink>
              </div>
            </Reveal>
          </div>

          {/* Decorative gradient (image placeholder) */}
          <Reveal delay={0.15}>
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-pine via-timber to-lake shadow-warm" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
