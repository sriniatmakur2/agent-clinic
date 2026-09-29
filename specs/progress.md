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

## Phase 2 — Ailments: NOT STARTED

Next up per `specs/roadmap.md`:

- `ailments` table (name, description) — small fixed catalog.
- `agent_ailments` join, linking agents to one or more ailments.
- Ailments shown on the agent detail page, and an agent can report a
  new ailment about themselves.

No plan written yet — start by reading `specs/roadmap.md`'s Phase 2
section and proposing a plan per `CLAUDE.md`.
