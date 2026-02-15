import type { Metadata } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import { site } from "@/content/site";

import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans-3",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.hero.subheadline,
  metadataBase: new URL(site.siteUrl),
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.hero.subheadline,
    url: site.siteUrl,
  },
};

function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: site.siteUrl,
    description: site.hero.subheadline,
    foundingLocation: {
      "@type": "Place",
      name: "Michigan's Upper Peninsula",
    },
    areaServed: {
      "@type": "Place",
      name: "Upper Peninsula, Michigan",
    },
    industry: "Hospitality",
    sameAs: [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${sourceSans.variable}`}>
      <head>
        <OrganizationSchema />
      </head>
      <body className="font-body antialiased">
        <Header />
        <PageTransition>
          <main>{children}</main>
        </PageTransition>
        <ScrollToTopButton />
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
