import Reveal from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cn } from "@/lib/utils";

interface CTABannerProps {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  variant?: "navy" | "teal";
}

const variantStyles: Record<"navy" | "teal", string> = {
  navy: "bg-navy text-sand",
  teal: "bg-teal text-sand",
};

export function CTABanner({
  title,
  description,
  ctaLabel,
  ctaHref,
  variant = "navy",
}: CTABannerProps) {
  return (
    <section className="section-shell">
      <div className="grid-shell">
        <Reveal>
          <div
            className={cn(
              "grain-overlay relative overflow-hidden rounded-3xl px-8 py-16 text-center md:px-16 md:py-20",
              variantStyles[variant]
            )}
          >
            <div className="relative z-10">
              <h2 className="font-display text-3xl font-semibold md:text-4xl lg:text-5xl">
                {title}
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-base opacity-90 md:text-lg">
                {description}
              </p>

              <div className="mt-8">
                <ButtonLink
                  href={ctaHref}
                  variant="light"
                  size="lg"
                >
                  {ctaLabel}
                </ButtonLink>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
