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
              <Suspense fallback={<div className="min-h-[320px] animate-pulse rounded-2xl bg-sand-light" />}>
                <ContactForm />
              </Suspense>
            </Reveal>

            {/* Contact info */}
            <Reveal delay={0.15}>
              <div className="space-y-8">
                <h2 className="font-display text-2xl font-semibold text-navy">
                  Other Ways to Reach Us
                </h2>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <span className="flex shrink-0 items-center justify-center rounded-full bg-teal/10 p-3 text-teal">
                      <Phone className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-medium text-navy">Phone</p>
                      <a
                        href="tel:+12488944867"
                        className="text-sm text-navy/70 transition-colors hover:text-gold"
                      >
                        (248) 894-4867
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <span className="flex shrink-0 items-center justify-center rounded-full bg-teal/10 p-3 text-teal">
                      <Mail className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-medium text-navy">Email</p>
                      <a
                        href="mailto:info@jjproperties.com"
                        className="text-sm text-navy/70 transition-colors hover:text-gold"
                      >
                        info@jjproperties.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <span className="flex shrink-0 items-center justify-center rounded-full bg-teal/10 p-3 text-teal">
                      <MapPin className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-medium text-navy">Location</p>
                      <p className="text-sm text-navy/70">
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
