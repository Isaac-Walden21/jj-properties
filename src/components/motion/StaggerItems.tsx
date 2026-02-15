"use client";

import { Children, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StaggerItemsProps {
  children: ReactNode;
  className?: string;
  delayStep?: number;
}

export default function StaggerItems({
  children,
  className,
  delayStep = 0.1,
}: StaggerItemsProps) {
  const prefersReducedMotion = useReducedMotion();
  const items = Children.toArray(children);

  if (prefersReducedMotion) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <div className={cn(className)}>
      {items.map((child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{
            duration: 0.42,
            delay: index * delayStep,
            ease: "easeOut",
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
