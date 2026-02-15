import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary";
export type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-amber text-cream hover:bg-amber-dark",
  secondary:
    "border-2 border-timber text-timber bg-transparent hover:bg-timber hover:text-cream",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-5 py-2 text-xs",
  md: "px-7 py-3 text-sm",
  lg: "px-9 py-4 text-base",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "relative inline-flex items-center justify-center",
    "rounded-full font-semibold uppercase tracking-wider",
    "transition-colors duration-300",
    "cinematic-glow button-sheen",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber",
    variantStyles[variant],
    sizeStyles[size],
    className
  );
}
