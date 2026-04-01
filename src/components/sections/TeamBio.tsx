import Image from "next/image";
import Reveal from "@/components/motion/Reveal";
import type { TeamMember } from "@/types";

interface TeamBioProps {
  member: TeamMember;
  showImage?: boolean;
}

export function TeamBio({ member, showImage = true }: TeamBioProps) {
  return (
    <Reveal>
      <div className="overflow-hidden rounded-2xl border border-navy/10 bg-sand shadow-card">
        {showImage && (
          <div className="relative aspect-[4/3]">
            {member.image ? (
              <Image
                src={member.image}
                alt={member.name}
                fill
                className="object-cover object-[center_15%]"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-navy via-teal to-lake" />
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          <h3 className="font-display text-2xl text-navy">
            {member.name}
          </h3>

          <p className="mt-1 text-sm uppercase tracking-wider text-gold">
            {member.role}
          </p>

          <p className="mt-4 text-base text-navy/80">
            {member.bio}
          </p>
        </div>
      </div>
    </Reveal>
  );
}
