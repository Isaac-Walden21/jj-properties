"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";

/**
 * Decides whether a page gets the public marketing chrome.
 *
 * The root layout wrapped every route in the site header, footer, page
 * transition and scroll-to-top button, plus a <main>. That is right for the
 * marketing pages and wrong for the two surfaces that are not the marketing
 * site:
 *
 *   /admin/*  the staff portal, which has its own header and its own <main> in
 *             AdminShell. Without this a signed-in staff member sees two
 *             stacked navs, the public one invites them out of the portal, and
 *             the page ships a <main> nested inside another <main> -- invalid
 *             HTML, and the same shape as the nested-root-layout bug that
 *             killed the Cedarville admin renderer.
 *   /u/*      the unsubscribe landing page. Someone who has just asked to stop
 *             receiving email should not be handed a marketing nav, and the
 *             page must render for a visitor with no session.
 *
 * The properly idiomatic fix is a `(site)` route group holding the public pages
 * with its own layout, leaving the root layout to html/body/fonts. That is a
 * better end state and a larger change -- it relocates every public page -- so
 * it is deliberately not being done in the middle of a marketing build. This is
 * the contained version of the same decision.
 *
 * `footer` arrives as a prop rather than an import because Footer is a server
 * component and this one is a client component.
 */
export function SiteChrome({
  footer,
  children,
}: {
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const isPortal = pathname === "/admin" || pathname.startsWith("/admin/");
  const isUnsub = pathname === "/u" || pathname.startsWith("/u/");

  // Bare: the route supplies its own shell, including its own <main>.
  if (isPortal || isUnsub) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <PageTransition>
        <main>{children}</main>
      </PageTransition>
      <ScrollToTopButton />
      {footer}
    </>
  );
}
