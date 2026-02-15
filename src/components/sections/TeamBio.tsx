import Reveal from "@/components/motion/Reveal";
import type { TeamMember } from "@/types";

interface TeamBioProps {
  member: TeamMember;
}

export function TeamBio({ member }: TeamBioProps) {
  return (
    <Reveal>
      <div className="overflow-hidden rounded-2xl border border-timber/10 bg-cream shadow-card">
        {/* Photo placeholder (gradient until real images are available) */}
        <div className="aspect-[4/3] bg-gradient-to-br from-timber via-pine to-lake" />

        {/* Content */}
        <div className="p-6">
          <h3 className="font-display text-2xl text-timber">
            {member.name}
          </h3>

          <p className="mt-1 text-sm uppercase tracking-wider text-amber">
            {member.role}
          </p>

          <p className="mt-4 text-base text-timber/80">
            {member.bio}
          </p>
        </div>
      </div>
    </Reveal>
  );
}
