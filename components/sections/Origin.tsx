import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { character } from "@/content/character";

export function Origin() {
  const { eyebrow, title, body } = character.origin;

  return (
    <section id="origin" className="section relative">
      <div className="container-page">
        {/* Asymmetric two-column: the heading holds the left rail and the prose
            sits in a narrow measure on the right. Equal halves would read as a
            template; the imbalance is what makes it feel art-directed. */}
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <Reveal>
              <p className="label-mono mb-6">{eyebrow}</p>
              <h2 className="font-display text-3xl font-extrabold leading-[1.05] tracking-[-0.02em]">
                {title}
              </h2>
            </Reveal>

            {/* Hairline rule — a quiet structural marker that repeats in every
                section, so the page has a visible skeleton. */}
            <Reveal delay={0.1}>
              <div className="mt-10 h-px w-24 bg-patina-700" />
            </Reveal>
          </div>

          <RevealGroup className="lg:col-span-6 lg:col-start-7">
            {body.map((paragraph, i) => (
              <RevealItem
                as="p"
                key={i}
                className="measure mb-6 text-lg text-ink-muted last:mb-0"
              >
                {paragraph}
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
