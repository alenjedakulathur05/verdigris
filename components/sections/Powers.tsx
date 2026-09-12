import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { character } from "@/content/character";

export function Powers() {
  const { eyebrow, title, items } = character.powers;

  return (
    <section id="powers" className="section relative bg-base">
      <div className="container-page">
        <Reveal className="mb-16 max-w-3xl">
          <p className="label-mono mb-6">{eyebrow}</p>
          <h2 className="font-display text-3xl font-extrabold leading-[1.05] tracking-[-0.02em]">
            {title}
          </h2>
        </Reveal>

        <RevealGroup
          as="ul"
          rhythm="slow"
          className="grid gap-px overflow-hidden rounded-lg bg-line-subtle md:grid-cols-3"
        >
          {items.map((power, i) => {
            // The third capability is a LIMITATION, not a power. Giving a
            // character a real weakness is what makes them read as a person
            // instead of a feature list — so it gets the copper accent rather
            // than patina, and the eye registers the difference before the
            // reader consciously does.
            const isLimitation = power.id === "long-night";

            return (
              <RevealItem
                as="li"
                key={power.id}
                className="group relative bg-raised p-8 transition-colors duration-300 hover:bg-elevated lg:p-10"
              >
                {/* Growth creeps in from the top edge on hover. Transform-only
                    (scaleX), so it stays on the compositor — no layout, no paint. */}
                <span
                  aria-hidden
                  className={`absolute inset-x-0 top-0 h-px origin-left scale-x-0 transition-transform duration-500 ease-bloom group-hover:scale-x-100 ${
                    isLimitation ? "bg-copper-400" : "bg-patina-500"
                  }`}
                />

                <span
                  className={`label-mono ${
                    isLimitation ? "text-copper-400" : "text-patina-500"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <h3 className="mt-6 font-display text-xl font-bold tracking-[-0.01em]">
                  {power.name}
                </h3>

                <p
                  className={`mt-2 text-sm font-medium ${
                    isLimitation ? "text-copper-400" : "text-patina-300"
                  }`}
                >
                  {power.summary}
                </p>

                <p className="mt-6 text-ink-muted">{power.body}</p>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
