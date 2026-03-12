"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { navItems } from "@/content/navigation";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const { scrollYProgress } = useScroll();
  const progressScaleX = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 28,
    mass: 0.25,
  });

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 20);

      if (open) {
        setHidden(false);
        lastScrollY.current = currentY;
        return;
      }

      if (currentY <= 24) {
        setHidden(false);
      } else if (currentY > lastScrollY.current + 4) {
        setHidden(true);
      } else if (currentY < lastScrollY.current) {
        setHidden(false);
      }

      lastScrollY.current = currentY;
    };

    onScroll();
    window.addEventListener("scroll", onScroll);

    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  useEffect(() => {
    setOpen(false);
    setHidden(false);
    lastScrollY.current = 0;
  }, [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-all duration-300 will-change-transform",
        hidden ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100",
        scrolled
          ? "border-timber/10 bg-cream/90 backdrop-blur-lg"
          : "border-transparent bg-cream/55 backdrop-blur-sm"
      )}
    >
      <div className="mx-auto flex w-[min(1500px,92vw)] items-center justify-between gap-6 py-4">
        <Link href="/" className="group shrink-0">
          <img
            src="/logo.png"
            alt="JJ Resort Properties — Commercial Real Estate, Upper Peninsula MI"
            className="-mb-4 mt-1 h-28 w-auto transition-transform group-hover:scale-[1.02] sm:h-32"
          />
        </Link>

        <button
          className="rounded-full border border-timber/25 p-2 text-timber lg:hidden"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Toggle navigation"
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className="hidden lg:block" aria-label="Main">
          <ul className="flex items-center gap-5 text-sm font-semibold uppercase tracking-[0.12em] text-timber">
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "relative py-1 transition-colors hover:text-amber after:absolute after:-bottom-0.5 after:left-0 after:h-[1.5px] after:w-full after:origin-left after:scale-x-0 after:bg-amber after:transition-transform after:duration-300 after:content-[''] hover:after:scale-x-100",
                      isActive ? "text-amber" : "text-timber"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <nav
        id="mobile-nav"
        className={cn(
          "overflow-hidden border-t border-timber/10 bg-cream transition-all duration-300 lg:hidden",
          open ? "max-h-[70vh]" : "max-h-0"
        )}
        aria-label="Mobile"
      >
        <ul className="mx-auto flex w-[min(1500px,92vw)] flex-col gap-1 py-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm font-medium",
                    isActive
                      ? "bg-timber text-cream"
                      : "text-timber hover:bg-timber/5"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <motion.div
        aria-hidden
        className="h-[2px] origin-left bg-gradient-to-r from-amber via-[#e0a060] to-amber/40"
        style={{ scaleX: progressScaleX }}
      />
    </header>
  );
}
