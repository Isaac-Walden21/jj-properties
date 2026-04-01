"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { properties } from "@/content/properties";
import Reveal from "@/components/motion/Reveal";

export function PortfolioStrip() {
  return (
    <section className="section-shell">
      <div className="grid-shell">
        <Reveal>
          {/* Header */}
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-display text-4xl font-semibold text-navy md:text-5xl">
              Our Properties
            </h2>
            <Link
              href="/properties"
              className="text-sm font-semibold uppercase tracking-wider text-gold transition-colors hover:text-gold-dark"
            >
              View All
            </Link>
          </div>
        </Reveal>

        {/* Horizontal scroll container */}
        <Reveal delay={0.15}>
          <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 md:-mx-0 md:px-0">
            {properties.map((property) => (
                <a
                  key={property.slug}
                  href={property.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sleek-lift w-80 shrink-0 snap-start overflow-hidden rounded-2xl border border-navy/10 bg-sand shadow-card"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={property.image.src}
                      alt={property.image.alt}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-display text-xl text-navy">
                      {property.name}
                    </h3>
                    <p className="mt-1 text-sm text-stone">
                      {property.tagline}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs text-stone">
                      <MapPin className="h-3 w-3" />
                      {property.location}
                    </span>
                  </div>
                </a>
              ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
