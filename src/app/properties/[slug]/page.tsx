import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Check, MapPin, ExternalLink } from "lucide-react";
import { createPageMetadata } from "@/lib/seo";
import { properties } from "@/content/properties";
import { PropertyGallery } from "@/components/sections/PropertyGallery";
import { PropertyAmenities } from "@/components/sections/PropertyAmenities";
import { CTABanner } from "@/components/sections/CTABanner";
import Reveal from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/ButtonLink";
import Badge from "@/components/ui/Badge";

interface PropertyPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return properties.map((property) => ({
    slug: property.slug,
  }));
}

export async function generateMetadata({
  params,
}: PropertyPageProps): Promise<Metadata> {
  const { slug } = await params;
  return createPageMetadata(`/properties/${slug}`);
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { slug } = await params;
  const property = properties.find((p) => p.slug === slug);

  if (!property) {
    notFound();
  }

  return (
    <>
      {/* Gallery hero */}
      <PropertyGallery
        images={property.images}
        propertyName={property.name}
      />

      {/* Property details */}
      <section className="section-shell">
        <div className="grid-shell">
          <div className="grid gap-12 md:grid-cols-3">
            {/* Main content */}
            <div className="md:col-span-2">
              <Reveal>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <Badge variant="type">{property.type}</Badge>
                  <span className="inline-flex items-center gap-1 text-sm text-stone">
                    <MapPin className="h-4 w-4" />
                    {property.location}
                  </span>
                </div>

                <p className="text-lg italic text-timber/70">
                  {property.tagline}
                </p>

                <p className="mt-6 text-base leading-relaxed text-timber/80">
                  {property.description}
                </p>
              </Reveal>

              {/* Highlights */}
              <Reveal delay={0.15}>
                <div className="mt-10">
                  <h2 className="font-display text-2xl font-semibold text-timber">
                    Highlights
                  </h2>
                  <ul className="mt-4 space-y-3">
                    {property.highlights.map((highlight) => (
                      <li
                        key={highlight}
                        className="flex items-start gap-3"
                      >
                        <span className="mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-pine/10 p-1 text-pine">
                          <Check className="h-4 w-4" />
                        </span>
                        <span className="text-sm text-timber/80 md:text-base">
                          {highlight}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>

            {/* Sidebar */}
            <div>
              <Reveal delay={0.2}>
                <div className="sticky top-32 space-y-4">
                  {property.bookingUrl && (
                    <ButtonLink
                      href={property.bookingUrl}
                      variant="primary"
                      size="lg"
                      className="w-full justify-center"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Book a Stay
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </ButtonLink>
                  )}

                  <ButtonLink
                    href={`/contact?type=buy&property=${property.slug}`}
                    variant="secondary"
                    size="lg"
                    className="w-full justify-center"
                  >
                    Inquire About This Property
                  </ButtonLink>

                  {property.externalUrl && (
                    <a
                      href={property.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block text-center text-sm text-amber transition-colors hover:text-amber-dark"
                    >
                      Visit property website
                      <ExternalLink className="ml-1 inline h-3 w-3" />
                    </a>
                  )}
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section className="section-shell bg-birch">
        <div className="grid-shell">
          <Reveal>
            <h2 className="font-display mb-8 text-3xl font-semibold text-timber md:text-4xl">
              Amenities
            </h2>
          </Reveal>
          <PropertyAmenities amenities={property.amenities} />
        </div>
      </section>

      <CTABanner
        title="Plan Your Visit"
        description={`Experience ${property.name} and everything the Upper Peninsula has to offer.`}
        ctaLabel="Get in Touch"
        ctaHref="/contact"
        variant="pine"
      />
    </>
  );
}
