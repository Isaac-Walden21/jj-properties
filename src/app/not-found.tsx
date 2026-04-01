import { ButtonLink } from "@/components/ui/ButtonLink";

export default function NotFound() {
  return (
    <section className="section-shell">
      <div className="grid-shell flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
          404
        </p>

        <h1 className="mt-3 font-display text-5xl font-semibold text-navy md:text-6xl">
          Page Not Found
        </h1>

        <p className="mt-6 max-w-md text-lg text-navy/80">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
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
