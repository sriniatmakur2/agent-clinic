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

## Phase 1 — Browse agents: NOT STARTED

Next up per `specs/roadmap.md`:

- `agents` table (name, short bio/role, avatar/placeholder).
- Seed data: a handful of fictional AI agents.
- List page of all agents, detail page per agent.

No plan written yet — start by reading `specs/roadmap.md`'s Phase 1
section and proposing a plan per `CLAUDE.md`.
