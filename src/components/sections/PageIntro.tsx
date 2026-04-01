import { type ReactNode } from "react";
import Reveal from "@/components/motion/Reveal";

interface PageIntroProps {
  kicker: string;
  title: string;
  intro: string;
  children?: ReactNode;
}

export function PageIntro({ kicker, title, intro, children }: PageIntroProps) {
  return (
    <section className="section-shell bg-gradient-to-br from-sand-light via-sand to-sand-light">
      <div className="grid-shell">
        <Reveal immediate>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">
            {kicker}
          </p>

          <h1 className="font-display mt-4 text-5xl font-semibold text-navy md:text-6xl">
            {title}
          </h1>

          <p className="text-balance mt-6 max-w-2xl text-base text-navy/80 md:text-lg">
            {intro}
          </p>

          {children && <div className="mt-8">{children}</div>}
        </Reveal>
      </div>
    </section>
  );
}
