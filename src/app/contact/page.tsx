import { Suspense } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { createPageMetadata } from "@/lib/seo";
import { site } from "@/content/site";
import { PageIntro } from "@/components/sections/PageIntro";
import { ContactForm } from "@/components/forms/ContactForm";
import Reveal from "@/components/motion/Reveal";

export const metadata = createPageMetadata("/contact");

export default function ContactPage() {
  return (
    <>
      <PageIntro
        kicker="Contact"
        title={site.pages.contact.headline}
        intro={site.pages.contact.subheadline}
      />

      <section className="section-shell">
        <div className="grid-shell">
          <div className="grid gap-12 md:grid-cols-2">
            <Reveal>
              <Suspense fallback={<div className="min-h-[320px] animate-pulse rounded-2xl bg-birch" />}>
                <ContactForm />
              </Suspense>
            </Reveal>

            {/* Contact info */}
            <Reveal delay={0.15}>
              <div className="space-y-8">
                <h2 className="font-display text-2xl font-semibold text-timber">
                  Other Ways to Reach Us
                </h2>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <span className="flex shrink-0 items-center justify-center rounded-full bg-pine/10 p-3 text-pine">
                      <Phone className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-medium text-timber">Phone</p>
                      <a
                        href="tel:+19065551234"
                        className="text-sm text-timber/70 transition-colors hover:text-amber"
                      >
                        (906) 555-1234
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <span className="flex shrink-0 items-center justify-center rounded-full bg-pine/10 p-3 text-pine">
                      <Mail className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-medium text-timber">Email</p>
                      <a
                        href="mailto:info@jjproperties.com"
                        className="text-sm text-timber/70 transition-colors hover:text-amber"
                      >
                        info@jjproperties.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <span className="flex shrink-0 items-center justify-center rounded-full bg-pine/10 p-3 text-pine">
                      <MapPin className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-medium text-timber">Location</p>
                      <p className="text-sm text-timber/70">
                        Cedarville, Michigan
                        <br />
                        Upper Peninsula
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
