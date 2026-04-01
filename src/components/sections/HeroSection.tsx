"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  AnimatePresence,
} from "framer-motion";
import { MapPin } from "lucide-react";
import Image from "next/image";
import { site } from "@/content/site";
import { properties } from "@/content/properties";

const heroImages = [
  { src: "/hero/hero-1.jpg", alt: "Lakeside vacation on Mackinac Island", position: "center" },
  { src: "/hero/hero-2.jpg", alt: "Northern Michigan resort scenery", position: "center bottom" },
  { src: "/hero/hero-3.jpg", alt: "Upper Peninsula waterfront", position: "center" },
  { src: "/hero/hero-4.jpg", alt: "Aerial view of Les Cheneaux Islands", position: "center" },
];

const SLIDE_INTERVAL = 7000;

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.45, 0.75]);

  const { hero } = site;

  const advance = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % heroImages.length);
  }, []);

  const jumpTo = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = setInterval(advance, SLIDE_INTERVAL);
    return () => clearInterval(id);
  }, [prefersReducedMotion, advance]);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
    >
      {/* Crossfading background montage */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={currentIndex}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.8, ease: "easeInOut" }}
        >
          <Image
            src={heroImages[currentIndex].src}
            alt={heroImages[currentIndex].alt}
            fill
            priority={currentIndex === 0}
            className="object-cover"
            style={{ objectPosition: heroImages[currentIndex].position }}
            sizes="100vw"
          />
        </motion.div>
      </AnimatePresence>

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
        <motion.p
          className="font-display mb-4 flex items-center justify-center gap-4 text-base font-medium uppercase tracking-[0.3em] text-sand md:text-lg"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="h-px w-10 bg-sand/50 md:w-16" />
          {site.name}
          <span className="h-px w-10 bg-sand/50 md:w-16" />
        </motion.p>

        <motion.h1
          className="font-display mx-auto max-w-4xl text-4xl font-bold uppercase tracking-tight text-sand md:text-5xl lg:text-6xl"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          {hero.headline}
        </motion.h1>

        <motion.p
          className="mx-auto mt-5 max-w-2xl text-base text-sand/80 md:text-lg"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {hero.subheadline}
        </motion.p>

        {/* Progress indicator */}
        <div className="mx-auto mt-8 flex items-center justify-center gap-2">
          {heroImages.map((_, i) => (
            <button
              key={i}
              onClick={() => jumpTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="relative h-1.5 w-8 overflow-hidden rounded-full bg-sand/30 transition-colors duration-300"
            >
              {i === currentIndex && !prefersReducedMotion ? (
                <span
                  key={currentIndex}
                  className="absolute inset-0 origin-left rounded-full bg-sand"
                  style={{
                    animation: `progress-fill ${SLIDE_INTERVAL}ms linear forwards`,
                  }}
                />
              ) : i === currentIndex ? (
                <span className="absolute inset-0 rounded-full bg-sand" />
              ) : null}
            </button>
          ))}
        </div>

        {/* Property bubbles */}
        <motion.div
          className="mx-auto mt-12 flex max-w-5xl snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-4 sm:justify-center sm:overflow-x-visible sm:flex-wrap"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {properties.map((property) => (
            <a
              key={property.slug}
              href={property.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex w-52 shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-sand/20 bg-ink/50 backdrop-blur-md transition-all duration-300 hover:border-gold/40 hover:bg-ink/60 sm:w-44"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={property.image.src}
                  alt={property.image.alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 208px, 176px"
                />
              </div>
              <div className="p-3">
                <h3 className="font-display text-sm font-semibold text-sand">
                  {property.name}
                </h3>
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-sand/60">
                  <MapPin className="h-3 w-3" />
                  {property.location}
                </span>
              </div>
            </a>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
