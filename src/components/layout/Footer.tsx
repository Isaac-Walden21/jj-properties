import Link from "next/link";

import { navItems } from "@/content/navigation";
import { site } from "@/content/site";

export function Footer() {
  return (
    <footer className="bg-timber text-cream">
      <div className="mx-auto grid w-[min(1500px,92vw)] gap-12 py-16 md:grid-cols-3">
        {/* Brand column */}
        <div className="flex flex-col gap-3">
          <Link href="/">
            <img
              src="/logo.png"
              alt="JJ Properties"
              className="h-12 w-auto brightness-0 invert"
            />
          </Link>
          <p className="text-sm leading-relaxed text-stone">
            {site.tagline}
          </p>
          <p className="mt-4 text-xs text-cream/50">
            &copy; {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
        </div>

        {/* Quick Links column */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-cream/50">
            Quick Links
          </h3>
          <ul className="flex flex-col gap-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-cream/70 transition-colors hover:text-amber"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact column */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-cream/50">
            Get In Touch
          </h3>
          <ul className="flex flex-col gap-2 text-sm text-cream/70">
            <li>
              <a
                href="mailto:info@jjproperties.com"
                className="transition-colors hover:text-amber"
              >
                info@jjproperties.com
              </a>
            </li>
            <li>
              <a
                href="tel:+19065550100"
                className="transition-colors hover:text-amber"
              >
                (906) 555-0100
              </a>
            </li>
            <li className="text-cream/50">Upper Peninsula, Michigan</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
