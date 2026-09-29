# Phase 8 — Supervisor view: implementation plan

Scope, per `specs/roadmap.md`: give supervisors a way to check on the agents
they supervise — a `supervisor_agents` relationship and a supervisor
dashboard showing each supervised agent's ailments and
appointment/prescription history.

## Decisions made with the user before implementation

- **No standalone supervisor browse pages.** Supervisors get a `supervisors`
  table, but no list/detail pages of their own (unlike agents/therapists in
  Phases 1/4). A simple picker page doubles as the entry point, mirroring
  the agent picker built for `/appointments` in Phase 7. The dashboard *is*
  the detail view.
- **One supervisor per agent**, not many-to-many. A nullable `supervisorId`
  column on `agents` (no join table, despite the roadmap's "relationship"
  wording — simpler, and matches how the rest of the app treats
  single-valued relationships like `appointments.therapistId`).
- **Full history on the dashboard.** For each supervised agent: their
  reported ailments, and their full appointment list (status, therapist,
  prescribed therapy, notes) — the same level of detail as the therapist
  dashboard, not just a summary.
- **Seed data:** 2–3 supervisors, with every seeded agent assigned to
  exactly one, so every dashboard has real data.

## Schema changes

- New `supervisors` table in `src/db/schema.ts`: `id`, `name`, `bio`,
  `avatarEmoji` — same shape as `therapists`.
- `agents` gains a nullable `supervisorId` column
  (`.references(() => supervisors.id)`), added at the bottom of the
  existing table definition (Drizzle/SQLite requires new columns to be
  nullable or defaulted when added via migration to an existing table).
- One migration (`npm run db:generate`) covering both changes.

## Seed data (`src/db/seed.ts`)

- `SEED_SUPERVISORS`: 3 entries, same playful/fictional tone as the other
  seeds (name, bio, avatarEmoji) — e.g. supervisors of AI agents with a
  wry, overworked-manager flavor.
- `seedSupervisors()`: same skip-if-non-empty idempotency pattern as
  `seedTherapists()`.
- `seedAgentSupervisors()`: assigns each of the 5 `SEED_AGENTS` to one of
  the 3 supervisors by name lookup (mirroring `seedAgentAilments()`'s
  find-by-name pattern), via `db.update(agents).set({ supervisorId })`.
  Guarded by checking whether any agent already has a `supervisorId` set,
  to stay idempotent.
- Wire both into `seed()`, after `seedAgents()`/`seedTherapists()` and
  before `seedAgentAilments()`/`seedAppointments()` run (order doesn't
  actually matter here since this only touches `agents`/`supervisors`, but
  keeping it next to the other seed calls for readability).

## Routes (`src/routes/supervisors.ts`, new file)

- `GET /supervisors` — picker page: lists all supervisors (name, avatar,
  count of supervised agents) as links to their dashboard. Mirrors the
  shape of `/appointments`'s bare picker, but as its own list rather than
  a query-string-driven single page, since there's no "no supervisor
  selected" state to render — each supervisor link goes straight to their
  dashboard route.
- `GET /supervisors/:id` — the dashboard. 404 via a new
  `supervisors/not-found.ejs` for an unknown or non-numeric id (matching
  the therapists/therapies pattern). For each agent with
  `supervisorId === id`:
  - reported ailments (via the existing `getAilmentsByAgent()` helper from
    `src/routes/appointments.ts`, already exported for reuse).
  - full appointment list (status, therapist name, prescribed therapy,
    notes), split into upcoming/past the same way
    `buildAgentAppointmentRows()` does it in `appointments.ts` — that
    function is agent-scoped already but is `function`-private (not
    exported) to that file. **Plan:** export `buildAgentAppointmentRows()`
    from `appointments.ts` and reuse it here, rather than duplicating the
    query, so both dashboards share one source of truth for "this agent's
    appointment history."
  - Supervised agents with zero appointments show an empty state (matches
    the empty-dashboard treatment already used for Dr. Retry Backoff in
    Phase 6).
- Register `supervisorRoutes` in `src/app.ts`.

## Views

- `src/views/supervisors/index.ejs` — picker list.
- `src/views/supervisors/show.ejs` — dashboard: one section per supervised
  agent (name, avatar, ailments as tags, then their appointment rows).
  Reuses `src/views/appointments/_row.ejs` for each appointment row rather
  than introducing a third row partial (the "agent's-eye" columns —
  therapist, status, therapy, notes — match what a supervisor should see
  too; `_row.ejs`'s cancel/reschedule controls are agent-side actions, so
  the supervisor dashboard renders it in a read-only mode by not passing
  the `canManage` forms' context, matching how `therapists/appointments.ejs`
  already omits agent-only controls).
- `src/views/supervisors/not-found.ejs` — 404, mirrors
  `therapists/not-found.ejs`.
- Home page (`src/views/home.ejs`) gets a "Supervisor view" link to
  `/supervisors`.

## Out of scope for this phase

- No auth/session — anyone can view any supervisor's dashboard by URL,
  same as therapist dashboards today. Phase 9 adds login.
- No UI for assigning/reassigning an agent's supervisor — seed-only for
  now, matching how therapist specialties etc. were seed-only before any
  admin UI existed.
- No changes to the agent or therapist detail pages.

## Verification plan

- `npm run db:generate` + `db:migrate` + `db:seed` (3 supervisors, 5 agents
  assigned), re-run `db:seed` to confirm both new seed functions skip
  cleanly.
- `npm run dev` + `curl`: `/` has the new link; `/supervisors` lists all 3
  with correct supervised-agent counts; `/supervisors/:id` for each of the
  3 (including one whose agents have no appointments yet, if the seed
  assignment lands that way) and confirm ailments + appointment history
  render correctly against `sqlite3` ground truth; `/supervisors/999` and
  `/supervisors/abc` 404.
  Every existing route (agents, therapies, therapists, appointments,
  booking, prescribing, cancel/reschedule) still responds as before.
- `npm run lint` and `tsc --noEmit` clean.
- No browser click-through by Claude (no browser available) — flagged for
  a manual look, as in every prior phase.
