import { ChatTrigger } from "@/components/chat/ChatTrigger";
import { Reveal } from "@/components/ui/Reveal";
import { character } from "@/content/character";

export function Mission() {
  const { eyebrow, title, body } = character.mission;

  return (
    <section id="mission" className="section relative overflow-hidden">
      {/* Second ambient bloom, mirrored to the right. Two light sources across
          the whole page — placed at the start and the end — so the composition
          has a direction rather than random glows scattered about. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-1/4 top-0 h-[70vh] w-[70vh] rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgb(255 31 69 / 0.18) 0%, transparent 70%)",
        }}
      />

      <div className="container-page relative">
        <Reveal className="max-w-4xl">
          <p className="label-mono mb-6">{eyebrow}</p>

          <h2 className="font-display text-3xl font-extrabold leading-[1.05] tracking-[-0.02em]">
            {title}
          </h2>

          <p className="measure mt-8 text-lg text-ink-muted">{body}</p>
        </Reveal>

        <Reveal delay={0.15} className="mt-16">
          <div className="border-t border-line-subtle pt-12">
            <h3 className="font-display text-2xl font-bold tracking-[-0.02em]">
              {character.cta.title}
            </h3>
            <p className="mt-3 text-ink-muted">{character.cta.body}</p>
            <div className="mt-8">
              <ChatTrigger size="lg">{character.cta.button}</ChatTrigger>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
