import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline-light" | "light";
export type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-gold text-sand border-2 border-gold hover:bg-gold-dark hover:border-gold-dark",
  secondary:
    "border-2 border-navy text-navy bg-transparent hover:bg-navy hover:text-sand",
  "outline-light":
    "border-2 border-sand text-sand bg-transparent hover:bg-sand hover:text-navy",
  light:
    "bg-sand text-gold border-2 border-sand hover:bg-gold hover:text-sand hover:border-gold",
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
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
    variantStyles[variant],
    sizeStyles[size],
    className
  );
}
