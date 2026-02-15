import StaggerItems from "@/components/motion/StaggerItems";
import type { Amenity } from "@/types";

interface PropertyAmenitiesProps {
  amenities: Amenity[];
}

export function PropertyAmenities({ amenities }: PropertyAmenitiesProps) {
  return (
    <StaggerItems className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {amenities.map((amenity) => {
        const Icon = amenity.icon;
        return (
          <div
            key={amenity.label}
            className="flex items-center gap-3"
          >
            <span className="flex shrink-0 items-center justify-center rounded-full bg-pine/10 p-2 text-pine">
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-sm text-timber">{amenity.label}</span>
          </div>
        );
      })}
    </StaggerItems>
  );
}
