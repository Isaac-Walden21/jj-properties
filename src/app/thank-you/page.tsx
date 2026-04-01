import { createPageMetadata } from "@/lib/seo";
import { ButtonLink } from "@/components/ui/ButtonLink";

export const metadata = createPageMetadata("/thank-you");

export default function ThankYouPage() {
  return (
    <section className="section-shell">
      <div className="grid-shell flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h1 className="font-display text-5xl font-semibold text-navy md:text-6xl">
          Thank You
        </h1>

        <p className="mt-6 max-w-md text-lg text-navy/80">
          We&apos;ve received your message and will be in touch soon.
        </p>

        <div className="mt-10">
          <ButtonLink href="/" variant="primary" size="lg">
            Back to Home
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
