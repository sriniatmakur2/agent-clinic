# AgentClinic — Tech Stack

Decisions below were made explicitly with the user; anything marked
"default" is a low-stakes choice made to keep the stack coherent and can be
revisited without re-litigating the constitution.

## Language

- **TypeScript**, server-side, throughout the codebase (server, data access,
  and view helpers).

## Web framework

- **Fastify** — chosen over Next.js/Remix (too much framework machinery for
  a course/demo project) and over plain Express (Fastify's schema
  validation and plugin model give a bit more structure while staying
  simple to read).

## Database

- **SQLite** — single-file database, zero external services to run, ideal
  for local demos and course checkouts.

## Data access

- **Drizzle ORM** — TypeScript-first, lightweight, type-safe queries and
  migrations against SQLite. Chosen over Prisma (avoids a generated-client
  build step) and over raw `better-sqlite3` (keeps queries type-checked as
  the schema evolves across phases).

## Views / UI

- **Server-rendered views** (no SPA framework) styled with **Tailwind CSS**.
  Chosen over server views + htmx to avoid introducing an extra
  interactivity layer before it's needed; htmx (or similar) can be added in
  a later phase if a feature genuinely needs partial-page updates.

## Auth

- **None for the MVP.** The app starts fully public/demo-mode. Three roles —
  **Agent**, **Supervisor**, and **Therapist** — and login are introduced as
  a dedicated later phase — see `roadmap.md`.

## Running / deployment

- **Local only for now.** The project is run with a single `npm run dev`
  command against a local SQLite file. No cloud deployment target is
  in scope yet; if/when a shareable public demo URL is needed, that will be
  scoped as its own phase.

## Defaults (not explicitly discussed, low-stakes)

- **Package manager:** npm.
- **Testing:** Vitest, added once there's meaningful logic worth testing
  (not required for the very first walking-skeleton phase).
- **Dev runtime:** `tsx` for running TypeScript directly in development.
- **Linting/formatting:** ESLint + Prettier with default TypeScript configs.

These defaults can be changed at any time by asking — they were not treated
as constitution-level decisions requiring sign-off.
