import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createPageMetadata } from "@/lib/seo";
import { properties } from "@/content/properties";
import { PageIntro } from "@/components/sections/PageIntro";
import { PropertyCard } from "@/components/sections/PropertyCard";
import Reveal from "@/components/motion/Reveal";
import StaggerItems from "@/components/motion/StaggerItems";

export const metadata = createPageMetadata("/properties");

export default function PropertiesPage() {
  return (
    <>
      <PageIntro
        kicker="Portfolio"
        title="Our Properties"
        intro="From island resorts to small-town inns, our collection spans the best of Michigan's Upper Peninsula. Each property is unique, but they all share a commitment to genuine hospitality and the natural beauty of the U.P."
      />

      <section className="section-shell">
        <div className="grid-shell">
          <Reveal>
            <StaggerItems className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {properties.map((property) => (
                <PropertyCard key={property.slug} property={property} />
              ))}

              {/* Sell CTA card */}
              <Link
                href="/sell"
                className="sleek-lift group block overflow-hidden rounded-2xl border border-dashed border-gold/30 bg-sand shadow-card"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-gold/20 via-navy/15 to-teal/20 relative flex items-center justify-center overflow-hidden">
                  <span className="font-display text-6xl text-navy/20 transition-transform duration-300 group-hover:scale-110">
                    ?
                  </span>
                </div>
                <div className="p-5 text-center">
                  <p className="font-display text-2xl text-navy">
                    Our Next Property
                  </p>
                  <p className="mt-1 text-sm text-stone">
                    Could it be yours?
                  </p>
                  <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-gold transition-colors group-hover:text-gold-dark">
                    Learn More
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </StaggerItems>
          </Reveal>
        </div>
      </section>
    </>
  );
}
