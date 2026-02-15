"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { site } from "@/content/site";
import { ButtonLink } from "@/components/ui/ButtonLink";

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.45, 0.75]);

  const { hero } = site;

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      {/* Background gradient placeholder (replace with image later) */}
      <div className="absolute inset-0 bg-gradient-to-br from-timber via-pine to-ink" />

      {/* Dark overlay */}
      <motion.div
        className="absolute inset-0 bg-ink"
        style={
          prefersReducedMotion ? { opacity: 0.5 } : { opacity: overlayOpacity }
        }
      />

      {/* Grain texture */}
      <div className="grain-overlay absolute inset-0" />

      {/* Content */}
      <motion.div
        className="relative z-10 px-6 text-center"
        style={prefersReducedMotion ? {} : { y: textY }}
      >
        <motion.h1
          className="font-display mx-auto max-w-5xl text-5xl font-bold uppercase tracking-tight text-cream md:text-7xl lg:text-8xl"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          {hero.headline}
        </motion.h1>

        <motion.p
          className="mx-auto mt-6 max-w-2xl text-lg text-cream/80 md:text-xl"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {hero.subheadline}
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <ButtonLink href={hero.cta.href} variant="primary" size="lg">
            {hero.cta.label}
          </ButtonLink>
          <ButtonLink
            href={hero.secondaryCta.href}
            variant="secondary"
            size="lg"
            className="border-cream text-cream hover:bg-cream hover:text-timber"
          >
            {hero.secondaryCta.label}
          </ButtonLink>
        </motion.div>
      </motion.div>
    </section>
  );
}
