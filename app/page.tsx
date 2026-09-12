import { Hero } from "@/components/sections/Hero";
import { Mission } from "@/components/sections/Mission";
import { Origin } from "@/components/sections/Origin";
import { Powers } from "@/components/sections/Powers";

/**
 * The page is a composition of sections and nothing else — no layout logic, no
 * content, no styling decisions. Each section owns its own concerns, so this
 * file stays readable as the site grows and the narrative order is visible at
 * a glance.
 */
export default function Home() {
  return (
    <main id="main">
      <Hero />
      <Origin />
      <Powers />
      <Mission />
    </main>
  );
}
