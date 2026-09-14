# Security

How this site handles other people's data, and why it is built the way it is.

Everything below is verifiable from the code or from the response headers —
none of it is a claim you have to take on trust.

---

## 1. Secrets

| Secret | Where it lives | Reaches the browser? |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Server env only | No |
| `GEMINI_API_KEY` / `GROQ_API_KEY` | Server env only | No |
| `RESEND_API_KEY` | Server env only | No |

* No variable is prefixed `NEXT_PUBLIC_`. That prefix is the *only* way Next.js
  inlines a value into the client bundle, so its absence is what guarantees
  these never ship to a browser.
* Every `process.env` read happens in a route handler or in a module reached
  only from one — never in a file marked `"use client"`.
* `.env` and `.env*.local` are gitignored; `.env.example` documents the *names*
  with empty values so the project is reproducible without leaking anything.
* API keys are sent as request **headers**, never query strings. Query strings
  end up in server logs, proxy logs and browser history.

## 2. The database

The table has **row-level security enabled with no policies**.

Supabase publishes an anonymous key to the internet by design. With RLS on and
zero policies granting access, that key can neither read nor write `requests` —
the default is deny. Only the server's service-role key, which never leaves the
server, can insert.

Forgetting that single line is the most common way Supabase projects leak their
users' data.

* The only public read path is `/api/stats`, which returns a **count and
  nothing else**. It has no id parameter, no list mode and no field selection —
  not filtered out, never built. An endpoint that cannot express a dangerous
  query cannot be tricked into running one.
* `priority` is constrained by a database `CHECK`, so a model returning
  something unexpected can never become a stored value.

## 3. Data minimisation

Stored: the five answers the visitor deliberately typed, Verdigris's reply,
which model wrote it, whether the email sent, and the triage band.

**Deliberately not stored:** IP address, user agent, referrer, device
fingerprint, or GPS coordinates. When a visitor uses the location button their
coordinates are rounded to ~1 km, exchanged for a place name server-side, and
discarded. Nothing about answering someone's request needs their precise
position.

## 4. Input handling

* **Validated twice.** The chat validates in the browser as a courtesy; the
  route handler re-validates everything on arrival, because anyone can POST to
  the endpoint directly. Client validation is UX, server validation is the
  boundary.
* **Every field is length-capped** before it reaches a model prompt, a database
  or an email — unbounded input is both a cost and an injection surface.
* **HTML is escaped** before any visitor text is interpolated into the
  notification email.
* **The model never controls the conversation.** It supplies wording and
  judges meaning; the state machine decides what happens next and the server
  clamps every value it returns. A model cannot skip a question, invent a
  priority band, or cause a value to bypass a rule a typed answer obeys.
* **Rate limited** per client: 3/min on submission, 25/min on per-turn replies,
  10/min on geocoding.

## 5. Browser-enforced headers

Set in `next.config.ts`, applied to every response:

| Header | Purpose |
|---|---|
| `Content-Security-Policy` | Restricts what can load or execute |
| `X-Frame-Options: DENY` + `frame-ancestors 'none'` | Clickjacking |
| `X-Content-Type-Options: nosniff` | MIME-type confusion |
| `Referrer-Policy` | Stops URL leakage to third parties |
| `Permissions-Policy` | Camera, mic, payment refused outright |
| `Strict-Transport-Security` | HTTPS only, 2 years |
| `Cache-Control: no-store` | On routes carrying personal data |

`connect-src 'self'` means the browser talks only to this origin. Reverse
geocoding is server-side specifically so no third-party host is needed here.

### Known limitations

Stated plainly rather than hidden:

* The CSP allows `'unsafe-inline'` for scripts and styles. Next's App Router
  injects inline hydration data, and Tailwind and Framer Motion both write
  inline style attributes. Removing it requires per-request nonces, which are
  incompatible with the static prerendering this site uses. `'unsafe-eval'` is
  development-only.
* Rate limiting is in-memory, so it resets on cold starts and is per-instance.
  It stops casual abuse, not a determined attacker. A shared store (Redis)
  would be the production answer.
* There is no admin UI. Request data is read through the Supabase dashboard,
  which is authenticated by Supabase. An unprotected `/admin` route would be a
  data breach with a URL.
