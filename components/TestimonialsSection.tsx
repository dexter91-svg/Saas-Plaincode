import Card from "@/components/Card";
import AnimatedSection from "@/components/AnimatedSection";

const testimonials = [
  {
    quote:
      "Plainbot cut our support tickets by 60% in the first month.",
    store: "Veloura Threads",
    meta: "Fashion Store, United States",
  },
  {
    quote:
      "Setup took 8 minutes. Our chatbot was live before I finished my coffee.",
    store: "Oak & Hearth Living",
    meta: "Home Goods Store, United Kingdom",
  },
  {
    quote:
      "We recovered 3 abandoned carts in the first week. Paid for itself immediately.",
    store: "PureFuel Labs",
    meta: "Supplements Store, Canada",
  },
] as const;

function StarRow() {
  return (
    <p className="mt-4 text-base tracking-wider text-amber-400" aria-label="5 out of 5 stars">
      {"\u2605\u2605\u2605\u2605\u2605"}
    </p>
  );
}

export default function TestimonialsSection({
  showHeading = false,
}: {
  showHeading?: boolean;
}) {
  return (
    <section
      className="border-t border-slate-800 bg-black px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
      aria-labelledby="testimonials-heading"
    >
      <div className="mx-auto max-w-7xl">
        {showHeading ? (
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-400">
              Social proof
            </p>
            <h2
              id="testimonials-heading"
              className="mt-2 text-2xl font-bold text-slate-100 sm:text-3xl"
            >
              What merchants say
            </h2>
          </div>
        ) : (
          <h2 id="testimonials-heading" className="sr-only">
            Customer testimonials
          </h2>
        )}
        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          {testimonials.map((t, idx) => (
            <AnimatedSection key={t.store} variant="fade-up" delay={80 + idx * 90}>
              <Card className="flex h-full flex-col transition-all hover:border-primary-500/30 hover:shadow-soft-lg">
                <blockquote className="flex-1">
                  <p className="text-lg font-medium leading-relaxed text-slate-100">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </blockquote>
                <footer className="mt-6 border-t border-slate-700/80 pt-6">
                  <p className="font-semibold text-slate-200">{t.store}</p>
                  <p className="mt-1 text-sm text-slate-400">{t.meta}</p>
                  <StarRow />
                </footer>
              </Card>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
