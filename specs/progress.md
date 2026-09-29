# AgentClinic — Progress

Status tracker so a new conversation can resume work without re-deriving
context. Update this at the end of every phase (see `CLAUDE.md`).

## Phase 0 — Walking skeleton: DONE

- Commit: `fa8748b` ("Phase 0: walking skeleton") on `main`.
- Fastify server, `@fastify/view` + EJS for rendering, Tailwind CSS for
  styling, Drizzle ORM + `better-sqlite3` against `data/agentclinic.db`
  (WAL mode).
- One trivial table, `boot_log` (`src/db/schema.ts`). Migration under
  `drizzle/`, applied automatically on every server start
  (`src/db/migrate.ts`, called from `src/server.ts`). A row is inserted on
  every boot and the count/timestamp is displayed on the placeholder page
  (`src/routes/home.ts` → `src/views/home.ejs`), proving the full
  Fastify → Drizzle → SQLite → view round trip, not just a static page.
- `npm run dev` runs the Tailwind CLI watcher and `tsx watch src/server.ts`
  concurrently (via `concurrently`). Verified booting from a clean
  `data/`/`public/css/output.css` state.
- Tooling added this phase: git (initialized, `main` branch), ESLint (flat
  config, `eslint.config.js`), Prettier (`.prettierrc`/`.prettierignore`).
  No tests yet — deferred per `specs/tech-stack.md` until real logic exists.

### Deviations from the specs (read before touching build/CSS setup)

- **Tailwind CSS is v4**, not the config-file-based v3 the original Phase 0
  plan assumed. V4 has no `tailwind.config.js` — content sources are
  declared via `@source` directives inside the CSS itself
  (`public/css/input.css` has `@import "tailwindcss";` +
  `@source "../../src/views";`). The absence of `tailwind.config.js` in
  this repo is expected, not a gap.
- The Tailwind CLI binary comes from the separate **`@tailwindcss/cli`**
  package in v4 (not from the `tailwindcss` package directly).
- npm 11's install-script gating blocked native builds for
  `better-sqlite3`, `@parcel/watcher`, and `esbuild` on first install.
  Fixed via `npm install-scripts approve better-sqlite3 "@parcel/watcher" esbuild`.
  Only relevant again if `node_modules` is wiped and reinstalled from
  scratch.

## Phase 1 — Browse agents: DONE

- Commit: `fd99ff0` ("Phase 1: browse agents") on `main`.
- `agents` table added to `src/db/schema.ts` (`name`, `role`, `bio`,
  `avatarEmoji`). Migration `drizzle/0001_ambitious_nick_fury.sql`,
  applied automatically on server start like `boot_log`.
- Seed data via a one-off script, `src/db/seed.ts` (`npm run db:seed`) —
  5 fictional AI agents. Idempotent: skips inserting if the table is
  non-empty, so it's safe to re-run.
- Avatars render as an emoji badge (`avatarEmoji` column), not an image
  — decided with the user to avoid introducing image assets/uploads
  this phase.
- Routes in `src/routes/agents.ts`: `GET /agents` (list) and
  `GET /agents/:id` (detail, 404s via `agents/not-found.ejs` if the id
  doesn't exist). Registered in `src/app.ts`.
- Views: `src/views/agents/index.ejs`, `show.ejs`, `not-found.ejs`.
  Home page (`src/views/home.ejs`) got a "Meet the agents" link so the
  app is click-through navigable end to end.
- Verified: `npm run db:generate` + `db:migrate` + `db:seed` (and
  re-ran `db:seed` to confirm the no-op path); `curl`'d `/agents`,
  `/agents/:id`, and a missing id (200/200/404); clicked through from
  `/` in the browser. `npm run lint` and `tsc --noEmit` both clean.

### Deviations from the specs

- None beyond the two points already called out above (emoji badge
  instead of an image field; one-off seed script instead of
  seed-on-boot) — both were explicitly decided with the user before
  implementation, not discovered mid-way.

## Phase 2 — Ailments: DONE

- Commit: `4b897e6` ("Phase 2: ailments") on `main`.
- `ailments` table (`name`, `description`) and `agent_ailments` join
  (`agentId`, `ailmentId`, `reportedAt`) added to `src/db/schema.ts`.
  Migration `drizzle/0002_minor_toad.sql`, applied automatically on
  server start like the existing tables.
- Seed data extended in `src/db/seed.ts`: a 6-entry ailment catalog plus
  a handful of `agent_ailments` links to seeded agents, so the detail
  page has demo data before anyone reports anything new. Same
  idempotent pattern as the Phase 1 agent seed (three independent
  skip-if-non-empty checks, one per table).
- "Report an ailment" is **both** picking from the catalog and writing
  a brand-new one (decided with the user) — `POST /agents/:id/ailments`
  in `src/routes/agents.ts` handles either: an `ailmentId` from a
  dropdown, or a `newAilmentName`/`newAilmentDescription` pair that
  inserts a new `ailments` row before linking it. No uniqueness
  constraint — an agent can report the same ailment more than once by
  design.
- Added `@fastify/formbody` (not previously installed) to parse the
  report form's `application/x-www-form-urlencoded` POST body;
  registered in `src/app.ts` alongside the existing plugins.
- View: `src/views/agents/show.ejs` now shows the agent's reported
  ailments and the two report forms inline on the same page — no new
  routes/views for a standalone ailment catalog (that pattern is
  deferred to Phase 3's therapy catalog, which the roadmap actually
  calls for).
- Verified: `npm run db:generate` + `db:migrate` + `db:seed` (and
  re-ran `db:seed` to confirm idempotency across all three tables).
  Exercised the running dev server with `curl`: agent detail page
  renders seeded ailments; POSTing an existing `ailmentId` and POSTing
  a brand-new name/description both 302-redirect and the new/linked
  ailment shows up immediately (including in other agents' dropdowns,
  since the catalog is shared); a 404 for an unknown agent id; a 400
  with an inline error and fully re-rendered page for an empty
  submission. `npm run lint` and `tsc --noEmit` both clean.

### Deviations from the specs

- Caught and fixed one bug during verification, not a spec deviation:
  an empty POST body comes through from `@fastify/formbody` as
  `undefined` rather than `{}`, which crashed the destructuring
  assignment in the route handler with a 500. Fixed with
  `request.body ?? {}`.

## Phase 3 — Therapy catalog: NOT STARTED

Next up per `specs/roadmap.md`:

- `therapies` table (name, description, duration).
- List page and detail page for therapies.

No plan written yet — start by reading `specs/roadmap.md`'s Phase 3
section and proposing a plan per `CLAUDE.md`.
