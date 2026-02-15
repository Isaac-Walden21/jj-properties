"use client";

import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
} from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useState } from "react";

export function ScrollToTopButton() {
  const { scrollY } = useScroll();
  const reduce = useReducedMotion();
  const smoothedY = useSpring(scrollY, {
    stiffness: 120,
    damping: 20,
    mass: 0.25,
  });
  const [shouldShow, setShouldShow] = useState(false);

  useMotionValueEvent(smoothedY, "change", (latest) => {
    setShouldShow(latest > 420);
  });

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <AnimatePresence>
      {shouldShow ? (
        <motion.button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          initial={{ opacity: 0, y: 20, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.92 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          whileHover={reduce ? undefined : { y: -2, scale: 1.05 }}
          whileTap={reduce ? undefined : { scale: 0.96 }}
          className="fixed bottom-6 right-6 z-40 rounded-full border border-timber/20 bg-cream/90 p-3 text-timber shadow-lg backdrop-blur-md hover:text-amber"
        >
          <ArrowUp size={18} />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
