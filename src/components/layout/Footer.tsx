import Link from "next/link";

import { navItems } from "@/content/navigation";
import { site } from "@/content/site";

export function Footer() {
  return (
    <footer className="bg-navy text-sand">
      <div className="mx-auto grid w-[min(1500px,92vw)] gap-12 py-16 md:grid-cols-3">
        {/* Brand column */}
        <div className="flex flex-col gap-3">
          <Link href="/" className="transition-colors hover:text-gold">
            <span className="font-display text-xl font-bold tracking-tight">
              JJ Properties
            </span>
          </Link>
          <p className="text-sm leading-relaxed text-stone">
            {site.tagline}
          </p>
          <p className="mt-4 text-xs text-sand/50">
            &copy; {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
        </div>

        {/* Quick Links column */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-sand/50">
            Quick Links
          </h3>
          <ul className="flex flex-col gap-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-sand/70 transition-colors hover:text-gold"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact column */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-sand/50">
            Get In Touch
          </h3>
          <ul className="flex flex-col gap-2 text-sm text-sand/70">
            <li>
              <a
                href="mailto:info@jjproperties.com"
                className="transition-colors hover:text-gold"
              >
                info@jjproperties.com
              </a>
            </li>
            <li>
              <a
                href="tel:+12488944867"
                className="transition-colors hover:text-gold"
              >
                (248) 894-4867
              </a>
            </li>
            <li className="text-sand/50">Upper Peninsula, Michigan</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
