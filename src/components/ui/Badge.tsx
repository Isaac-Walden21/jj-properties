import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "type" | "status" | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  type: "bg-teal text-sand",
  status: "bg-gold text-sand",
  default: "bg-stone text-sand",
};

export default function Badge({
  variant = "default",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
