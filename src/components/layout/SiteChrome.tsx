"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { PageTransition } from "@/components/layout/PageTransition";

/** Public-site header, footer and page transitions — skipped on the /admin back office. */
export function SiteChrome({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  if (usePathname().startsWith("/admin")) return <>{children}</>;
  return (
    <>
      {header}
      <PageTransition>
        <main>{children}</main>
      </PageTransition>
      {footer}
    </>
  );
}
