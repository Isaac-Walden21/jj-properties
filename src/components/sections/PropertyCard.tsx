import Link from "next/link";
import { MapPin } from "lucide-react";
import Badge from "@/components/ui/Badge";
import type { Property } from "@/types";

interface PropertyCardProps {
  property: Property;
}

const gradientPalettes = [
  "from-pine via-timber to-lake",
  "from-timber via-pine to-ink",
  "from-lake via-pine to-timber",
  "from-ink via-timber to-pine",
  "from-pine via-lake to-timber",
];

export function PropertyCard({ property }: PropertyCardProps) {
  const gradient =
    gradientPalettes[
      property.slug.length % gradientPalettes.length
    ];

  return (
    <Link
      href={`/properties/${property.slug}`}
      className="sleek-lift group block overflow-hidden rounded-2xl border border-timber/10 bg-cream shadow-card"
    >
      {/* Image placeholder */}
      <div
        className={`aspect-[4/3] bg-gradient-to-br ${gradient} relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-ink/10 transition-opacity duration-300 group-hover:bg-ink/5" />
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
    </Link>
  );
}
