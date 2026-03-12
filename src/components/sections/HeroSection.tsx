"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { Bed, Building2, Handshake, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { site } from "@/content/site";

const funnels = [
  {
    icon: Bed,
    title: "Stay with Us",
    tagline: "Lakefront resorts & historic inns across the U.P.",
    href: "/properties",
  },
  {
    icon: Building2,
    title: "Sell Your Property",
    tagline: "Fair offers, fast closings — no agents, no fees.",
    href: "/sell",
  },
  {
    icon: Handshake,
    title: "Partner with Us",
    tagline: "Invest in Upper Peninsula hospitality.",
    href: "/invest",
  },
];

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
      {/* Background hero image */}
      <Image
        src="/jj-resort-properties-hero.jpg"
        alt="Upper Peninsula lakefront resort"
        fill
        priority
        className="absolute inset-0 object-cover"
      />

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
        className="relative z-10 w-full max-w-6xl px-6 text-center"
        style={prefersReducedMotion ? {} : { y: textY }}
      >
        <motion.h1
          className="font-display mx-auto max-w-4xl text-4xl font-bold uppercase tracking-tight text-cream md:text-5xl lg:text-6xl"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          {hero.headline}
        </motion.h1>

        <motion.p
          className="mx-auto mt-5 max-w-2xl text-base text-cream/80 md:text-lg"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {hero.subheadline}
        </motion.p>

        {/* Funnel cards */}
        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3 sm:gap-5">
          {funnels.map((funnel, i) => (
            <motion.div
              key={funnel.title}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.55 + i * 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <Link
                href={funnel.href}
                className="group flex h-full flex-row items-center gap-4 rounded-xl border border-cream/10 bg-cream/[0.07] px-5 py-5 text-left backdrop-blur-md transition-all duration-300 hover:border-amber/40 hover:bg-cream/[0.12] sm:flex-col sm:items-start sm:gap-3 sm:px-6 sm:py-6 sm:text-left"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber/20 text-amber transition-colors duration-300 group-hover:bg-amber/30 sm:h-12 sm:w-12">
                  <funnel.icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-base font-semibold text-cream sm:text-lg">
                    {funnel.title}
                  </h3>
                  <p className="mt-1 text-sm leading-snug text-cream/60 sm:mt-2">
                    {funnel.tagline}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-cream/40 transition-all duration-300 group-hover:translate-x-1 group-hover:text-amber sm:mt-auto sm:self-end" />
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
