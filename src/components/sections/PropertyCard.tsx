import Image from "next/image";
import { MapPin } from "lucide-react";
import Badge from "@/components/ui/Badge";
import type { Property } from "@/types";

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const heroImage = property.images.find((img) => img.featured) ?? property.images[0];

  return (
    <a
      href={property.externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="sleek-lift group block overflow-hidden rounded-2xl border border-timber/10 bg-cream shadow-card"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {heroImage ? (
          <Image
            src={heroImage.src}
            alt={heroImage.alt}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-pine via-timber to-lake" />
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="type">{property.type}</Badge>
          <span className="inline-flex items-center gap-1 text-xs text-stone">
            <MapPin className="h-3 w-3" />
            {property.location}
          </span>
        </div>

        <h3 className="font-display text-2xl text-timber">
          {property.name}
        </h3>

        <p className="mt-1 text-sm text-stone">{property.tagline}</p>
      </div>
    </a>
  );
}
