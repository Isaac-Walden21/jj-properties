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
        intro="From lakefront resorts on Lake Michigan to historic inns in downtown Cedarville, our collection spans the best of Michigan's Upper Peninsula. Each property is unique, but they all share a commitment to genuine hospitality and the natural beauty of the U.P."
      />

      <section className="section-shell">
        <div className="grid-shell">
          <Reveal>
            <StaggerItems className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {properties.map((property) => (
                <PropertyCard key={property.slug} property={property} />
              ))}
            </StaggerItems>
          </Reveal>
        </div>
      </section>
    </>
  );
}
