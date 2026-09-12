import { Button } from "@/components/ui/Button";
import { ArrowDown } from "@/components/ui/Icons";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/Reveal";
import { character } from "@/content/character";

export function Hero() {
  return (
    <section className="relative flex min-h-[100dvh] flex-col justify-center overflow-hidden">
      {/* Ambient bloom. Anchored off-canvas bottom-left so the dark surface
          reads as lit from somewhere rather than flat. pointer-events-none is
          not optional — a full-screen decorative div will happily swallow
          clicks otherwise. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-1/3 -left-1/4 h-[80vh] w-[80vh] rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgb(52 224 176 / 0.18) 0%, transparent 70%)",
        }}
      />

      <div className="container-page relative py-24">
        <RevealGroup>
          <RevealItem as="p" className="label-mono mb-6">
            Case file 001 — active
          </RevealItem>

          <RevealItem>
            <h1 className="font-display text-hero font-black leading-[0.92] tracking-[-0.03em]">
              VERDI<span className="text-patina-500">GRIS</span>
            </h1>
          </RevealItem>

          <RevealItem as="p" className="measure mt-8 text-lg text-ink-muted">
            {character.intro}
          </RevealItem>

          <RevealItem className="mt-12 flex flex-wrap items-center gap-4">
            <Button size="lg">{character.cta.button}</Button>
            <Button variant="secondary" size="lg">
              Read the file
            </Button>
          </RevealItem>
        </RevealGroup>
      </div>

      {/* Scroll affordance. Sits in the gutter rhythm, not floating arbitrarily. */}
      <Reveal
        delay={0.6}
        className="container-page relative flex items-center gap-3 pb-12"
      >
        <ArrowDown size={16} className="text-patina-500" />
        <span className="label-mono">Scroll</span>
      </Reveal>
    </section>
  );
}
