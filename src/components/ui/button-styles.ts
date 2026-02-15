import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline-light" | "light";
export type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-amber text-cream border-2 border-amber hover:bg-amber-dark hover:border-amber-dark",
  secondary:
    "border-2 border-timber text-timber bg-transparent hover:bg-timber hover:text-cream",
  "outline-light":
    "border-2 border-cream text-cream bg-transparent hover:bg-cream hover:text-timber",
  light:
    "bg-cream text-amber border-2 border-cream hover:bg-amber hover:text-cream hover:border-amber",
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
