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
            <h2 className="font-display text-4xl font-semibold text-timber md:text-5xl">
              Our Properties
            </h2>
            <Link
              href="/properties"
              className="text-sm font-semibold uppercase tracking-wider text-amber transition-colors hover:text-amber-dark"
            >
              View All
            </Link>
          </div>
        </Reveal>

        {/* Horizontal scroll container */}
        <Reveal delay={0.15}>
          <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 md:-mx-0 md:px-0">
            {properties.map((property) => {
              const heroImage = property.images.find((img) => img.featured) ?? property.images[0];

              return (
                <Link
                  key={property.slug}
                  href={`/properties/${property.slug}`}
                  className="sleek-lift w-80 shrink-0 snap-start overflow-hidden rounded-2xl border border-timber/10 bg-cream shadow-card"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {heroImage ? (
                      <Image
                        src={heroImage.src}
                        alt={heroImage.alt}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-pine via-timber to-lake" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-display text-xl text-timber">
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
                </Link>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
