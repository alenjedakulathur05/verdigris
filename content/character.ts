/**
 * The character, as data.
 *
 * All of Verdigris's voice lives in this one file — the site copy and the
 * chatbot script both read from it. That matters more than it looks: if the
 * landing page is brooding and the chatbot is chirpy, the illusion collapses
 * immediately. One source for the voice keeps the character consistent.
 */

export const character = {
  name: "VERDIGRIS",
  tagline: "Nothing forgotten stays forgotten",

  intro:
    "Some things get left behind. Buildings, streets, people. I find what the city decided wasn't worth keeping — and I make it grow back.",

  origin: {
    eyebrow: "Case file — origin",
    title: "They demolished the block in March.",
    body: [
      "Nobody called it a tragedy. It was redevelopment. Forty-one families, a bakery that had been on that corner since 1971, and my grandmother's flat on the third floor with the window that never closed properly. Cleared in nine days.",
      "I went back at night, after the machines stopped. I still don't know what I was looking for. I put my hand on a length of broken pipe, and something in it answered.",
      "It grew. Copper gone green, concrete splitting open, light coming up out of the cracks — the kind of green you only see in deep water. By morning the lot nobody wanted was the brightest thing in the district.",
      "The council still lists it as a hazard. They've sent crews to clear it twice. It grows back every time.",
    ],
  },

  powers: {
    eyebrow: "Case file — capability",
    title: "What I can actually do.",
    items: [
      {
        id: "reclamation",
        name: "Reclamation",
        summary: "Rot becomes growth.",
        body: "Anything left to rot, I can bring back — louder than it was. Rust turns to growth. Concrete splits and blooms. It is not gentle, and it does not ask the city for permission.",
      },
      {
        id: "residue",
        name: "Residue",
        summary: "Neglect leaves a mark.",
        body: "If I put my hand on a thing, I know how long it has been since anyone cared about it, and roughly who stopped. This is the one that's useful to you.",
      },
      {
        id: "long-night",
        name: "The Long Night",
        summary: "And what I can't.",
        body: "None of it holds in daylight. The growth needs dark to set. So I work nights, I work alone, and I am slower to reach you than either of us would like.",
      },
    ],
  },

  mission: {
    eyebrow: "Case file — mission",
    title: "I'm not interested in saving the world.",
    body: "The world is fine. It's the parts of it that got written off that I pay attention to — the building, the street, the person everyone quietly agreed to stop thinking about. If that's you, say so. I'm listening, and I have nowhere else to be.",
  },

  cta: {
    title: "Tell me what you need.",
    body: "No forms. Just talk to me.",
    button: "Ask for help",
  },
} as const;

export type Power = (typeof character.powers.items)[number];
