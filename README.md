# VERDIGRIS

**A help portal for the parts of a city everyone agreed to stop thinking about.**

🔗 **Live:** https://verdigris-sable.vercel.app

Built for the WhiteMatrix / TechAscent machine test: an original superhero, a
site that tells their story, and a chatbot that talks to visitors, collects
what it needs, and gets their request to a human.

---

## What it does

A visitor arrives, an entry sequence surveys the district, and Verdigris opens
a conversation unprompted. Over five questions the chat collects a name, age,
location and email, then asks what they need help with. The request is
triaged by urgency, emailed, and written to Postgres — and the visitor is
shown how it was classified before they leave.

| | |
|---|---|
| **Conversational intake** | Five fields collected in natural conversation, not a form |
| **AI-written, rule-governed** | A model supplies the words; a state machine owns the flow |
| **Priority triage** | Each request classified `critical` / `high` / `standard` / `low` |
| **Email notification** | Priority in the subject line, arrives the moment it's sent |
| **Postgres persistence** | Every request stored, with a live counter on the site |
| **Location by GPS or by typing** | Offered, never required |
| **Review before submit** | Everything read back before anything is sent |

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · Framer Motion · Lenis
Gemini + Groq · Resend · Supabase Postgres · Vercel

**Five runtime dependencies.** No UI kit, no icon library, no AI SDKs, no
database client. Every external service — Gemini, Groq, Resend, Supabase — is
reached with plain `fetch`, because each is a single HTTP request and an SDK
would be a dependency wrapping twelve lines. Icons are hand-written SVG; the
design system is CSS custom properties.

---

## Decisions worth defending

### The model never controls the conversation

The chat engine is a `useReducer` state machine that walks a list of steps
defined as data. The AI writes Verdigris's wording and judges whether a
message actually answers the question — it cannot skip a step, loop, invent a
question, or decide the conversation is over.

This split came from a real failure. Three successive regex fixes tried to
tell an answer from a non-answer, and each one caught the phrasing that broke
it and missed the next: `"will my name be safe with u"` was stored as a name,
then `"i dont want to tell that"` as a city, then `"still not telling"`. The
distinction is semantic, so it moved to the model — while bounds, validation
and flow stayed in code. **The model decides meaning; the server decides what
is allowed.**

### Instructions steer a model, they don't constrain it

Told not to ask a question after a valid answer, the model did anyway. So
every AI response is verified before use: a reaction containing `?` after a
valid answer is rejected, as is one over 160 characters, and the caller falls
back to a written line. Triage output is clamped to a four-value union and a
database `CHECK` constraint — a model returning `"VERY URGENT!!"` can never
become a stored value.

### Failures are not equivalent

An AI failure is cosmetic: the written fallback is already in character and
the visitor notices nothing. An email failure means the request never reached
a human, so the chat says so and offers a retry that doesn't make anyone
retype their story. A database failure is logged and swallowed — it must never
cost a visitor their reply.

### Data minimisation

Stored: the five answers, the reply, which model wrote it, whether the email
sent, the triage band. **Not stored:** IP, user agent, referrer, or GPS
coordinates. Location fixes are rounded to ~1 km, exchanged for a place name
server-side, and discarded.

### Security

Row-level security **on with no policies**, so the public anon key can't touch
the table — only the server's service-role key, which never reaches a browser.
The one public read path returns a count and is structurally incapable of
returning rows. Full write-up, including known limitations, in
[SECURITY.md](./SECURITY.md).

### Motion with a single hand

One easing curve (`--ease-bloom`) on every reveal. Fluid `clamp()` type with
no breakpoint jumps. Everything animates `transform` and `opacity` only.
`prefers-reduced-motion` is handled centrally in the reveal primitives, so no
section can forget it, and Save-Data visitors get a still image instead of the
hero video.

---

## Running it

```bash
npm install
cp .env.example .env.local   # fill in the keys
npm run dev
```

Then run `db/schema.sql` in the Supabase SQL editor.

Every variable is server-only — nothing is prefixed `NEXT_PUBLIC_`, and the
site degrades rather than crashes when one is missing: no AI key falls back to
written lines, no Supabase means requests still email.

## Structure

```
app/
  api/request/    submit: validate, triage, email, store
  api/turn/       per-message AI reactions and answer extraction
  api/stats/      public count — never rows
  api/geocode/    coordinates in, place name out
components/
  chat/           panel, input, bubbles, review card, location
  sections/       hero, origin, powers, mission
  ui/             motion primitives, boot sequence, atmosphere
hooks/            the conversation state machine
lib/              ai providers, db, email, validation, design tokens
db/schema.sql     table, constraints, indexes, RLS
```

---

Built by **Aj** — [github.com/alenjedakulathur05/verdigris](https://github.com/alenjedakulathur05/verdigris)
