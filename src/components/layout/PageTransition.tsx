"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [isInitialPaint, setIsInitialPaint] = useState(true);

  useEffect(() => {
    setIsInitialPaint(false);
  }, []);

  if (reduce) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={
          isInitialPaint
            ? false
            : { opacity: 0, y: 10, filter: "blur(1px)" }
        }
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -10, filter: "blur(1px)" }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
