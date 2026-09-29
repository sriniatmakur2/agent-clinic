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

## Phase 3 — Therapy catalog: DONE

- Commit: `64cb762` ("Phase 3: therapy catalog") on `main`.
- Decisions made with the user before implementation:
  - `durationMinutes`: integer minutes (not free text).
  - Therapies get an `icon` emoji field, matching the `avatarEmoji`
    pattern from agents (Phase 1).
  - 6 seed therapies, same playful/fictional tone as the ailments catalog.
- `therapies` table (`name`, `description`, `durationMinutes`, `icon`)
  added to `src/db/schema.ts`. Migration `drizzle/0003_known_satana.sql`,
  applied automatically on server start like the existing tables.
- `SEED_THERAPIES` (6 entries) + `seedTherapies()` in `src/db/seed.ts`,
  wired into `seed()`; same skip-if-non-empty idempotency as the other
  seed functions.
- Routes in `src/routes/therapies.ts`: `GET /therapies` (list) and
  `GET /therapies/:id` (detail, 404 via `therapies/not-found.ejs` —
  non-numeric ids also 404). Registered in `src/app.ts`.
- Views: `src/views/therapies/index.ejs`, `show.ejs`, `not-found.ejs`,
  mirroring `src/views/agents/*`. `show.ejs` is display-only — therapies
  aren't linked to agents or ailments until Phase 6.
- Home page (`src/views/home.ejs`) now has a "Browse therapies" button
  next to "Meet the agents".
- Verified: `npm run db:migrate` + `db:seed` (6 therapies inserted), and
  re-ran `db:seed` to confirm the skip path. Booted `npm run dev` and
  `curl`'d `/` (has `/therapies` link), `/therapies` (all 6 listed),
  `/therapies/1` and `/therapies/6` (200), `/therapies/999` and
  `/therapies/abc` (404 with the not-found page); `/agents/1` still 200.
  `npm run lint` and `tsc --noEmit` both clean. Browser click-through
  was not done by Claude (no browser available) — worth a quick manual
  look.

### Deviations from the specs

- None.
- Note (pre-existing, not introduced this phase): `prettier --check src`
  already flagged `src/routes/agents.ts` and `src/db/seed.ts` as of the
  Phase 2 commit; `src/routes/therapies.ts` has the same long-line
  style. Not fixed here to keep the phase's diff scoped — run
  `npm run format` as a separate cleanup if wanted.

## Phase 4 — Browse therapists: DONE

- Commit: `ee918e7` ("Phase 4: browse therapists") on `main`.
- Decisions made with the user before implementation:
  - **Specialty is linked to the ailments catalog**, not a free-text
    column — a `therapist_specialties` join table, mirroring
    `agent_ailments` (minus the timestamp). This is a deliberate
    deviation from the roadmap's "specialty/placeholder" wording.
  - Therapists get an `avatarEmoji` field, matching agents.
  - 4 seed therapists, same playful/fictional tone as the other seeds.
  - Home page gets a "Meet the therapists" button.
- `therapists` (`name`, `bio`, `avatarEmoji`) and `therapist_specialties`
  (`therapistId`, `ailmentId`) added to `src/db/schema.ts`. Migration
  `drizzle/0004_brown_unicorn.sql`, applied automatically on server start.
- `SEED_THERAPISTS` + `seedTherapists()` and `seedTherapistSpecialties()`
  in `src/db/seed.ts` (7 links, looked up by therapist/ailment name like
  `seedAgentAilments()`), wired into `seed()`; same skip-if-non-empty
  idempotency.
- Routes in `src/routes/therapists.ts`: `GET /therapists` (list, with
  specialty ailment names as tags) and `GET /therapists/:id` (detail with
  each specialty's name + description; 404 via `therapists/not-found.ejs`,
  non-numeric ids also 404). Registered in `src/app.ts`.
- Views: `src/views/therapists/index.ejs`, `show.ejs`, `not-found.ejs`,
  mirroring `src/views/therapies/*`. Display-only — no booking UI (Phase 5).
  Specialty tags are plain text since ailments have no page of their own.
- Verified: `npm run db:generate` + `db:migrate` + `db:seed` (4 therapists,
  7 links), re-ran `db:seed` to confirm the skip path. Booted `npm run dev`
  and `curl`'d `/` (has `/therapists` link), `/therapists` (all 4 with
  specialties), `/therapists/1` and `/therapists/4` (200),
  `/therapists/999` and `/therapists/abc` (404 with not-found page);
  `/agents/1` and `/therapies/1` still 200. `npm run lint` and
  `tsc --noEmit` clean. No browser click-through by Claude — worth a
  quick manual look.

### Deviations from the specs

- Specialty-as-ailment-link (see above), decided with the user.

## Phase 5 — Book an appointment: DONE

- Commit: `f3b4026` ("Phase 5: book an appointment") on `main`.
- Decisions made with the user before implementation:
  - Booking form on **both** the agent and therapist detail pages.
  - An agent must have reported at least one ailment to book (the form
    is hidden on the agent page otherwise; the server enforces it too).
  - Requested time is a `datetime-local` input and must be in the future.
  - The therapist dropdown (agent page) lists all therapists, with those
    whose specialties match the agent's ailments first, marked "specializes
    in your ailments". The agent dropdown (therapist page) lists only
    agents with ≥1 ailment, with those matching the therapist's
    specialties first.
- `appointments` table (`agentId`, `therapistId`, `requestedAt`,
  `status` default `"requested"`, nullable `therapyId` → therapies,
  `createdAt`) added to `src/db/schema.ts`. Migration
  `drizzle/0005_pale_wrecking_crew.sql`, applied on server start. No seed
  appointments — nothing lists appointments until Phase 6/7.
- `src/routes/appointments.ts`: `createAppointment()` (shared validation +
  insert: agent/therapist exist, agent has an ailment, time valid and in
  the future; returns `{ id }` or `{ error }`), `formatAppointmentTime()`,
  and `GET /appointments/:id` (confirmation page; 404 via
  `appointments/not-found.ejs`). Registered in `src/app.ts`.
- The two POST endpoints live next to the page they re-render on error:
  `POST /agents/:id/appointments` in `src/routes/agents.ts` and
  `POST /therapists/:id/appointments` in `src/routes/therapists.ts`. Both
  call `createAppointment()`, 302 to `/appointments/:id` on success, and
  400 with an inline error (and the submitted values kept) otherwise. The
  plan had these routes in `appointments.ts`; moved to keep each page's
  render helper private to its own route file.
- Agent/therapist detail rendering is now centralised in
  `renderAgentShow()` / `renderTherapistShow()` helpers (the agent page
  renders from three places: GET, ailment 400, booking 400). The ailment
  form's error variable is still `error`; the booking one is
  `bookingError`, so each shows in its own section.
- Times: `datetime-local` has no offset, so it's parsed as server-local
  time, stored as ISO/UTC, and displayed back in server-local time. Fine
  while the app is local-only.
- Verified with `npm run dev` + `curl` + `sqlite3`: both endpoints book and
  302 to a 200 confirmation page; therapist/agent match ordering checked
  against the DB; 400s for past, garbage and missing time, missing/unknown
  therapist or agent, and empty body; the no-ailment gate on both
  endpoints, the hidden form, and exclusion from the therapist dropdown
  (via a temporary agent, deleted afterwards); 404s for unknown agent or
  therapist POSTs and for `/appointments/999` and `/appointments/abc`; the
  ailment form 400 still works; every existing page still 200.
  `npm run lint` and `tsc --noEmit` clean. The local dev DB keeps the two
  test appointments. No browser click-through by Claude — worth a quick
  manual look.

### Deviations from the specs

- None beyond the route placement noted above.

## Phase 6 — Therapist view & prescribing: DONE

- Commit: `3d33808` ("Phase 6: therapist view & prescribing") on `main`.
- Implemented from `specs/phase-6-plan.md`; the design decisions there were
  made with the user (dashboard as its own page, prescribe form on the
  appointment page, editable prescriptions, allowed on past and upcoming
  appointments, seeded demo appointments).
- `appointments` gains nullable `notes` and `prescribedAt` (ISO text).
  Migration `drizzle/0006_mushy_inhumans.sql`, applied on server start.
  Lifecycle: `"requested"` → `"prescribed"`; stays revisable after that.
- `seedAppointments()` in `src/db/seed.ts` (wired into `seed()`, same
  skip-if-non-empty check): 5 appointments with times relative to seed
  time — 2 upcoming requested, 2 past prescribed (therapy + notes), 1 past
  still requested. Dr. Ada Backprop and Dr. Tokenia Window have both
  sections populated; Dr. Retry Backoff has none (empty-state demo).
- `getAilmentsByAgent()` in `src/routes/appointments.ts` — one query for a
  set of agents' distinct reported ailments, keyed by agent id. Used by the
  dashboard and the appointment page.
- `GET /therapists/:id/appointments` in `src/routes/therapists.ts` → new
  `src/views/therapists/appointments.ejs` (+ an `_appointment-row.ejs`
  partial via EJS `include`). Upcoming soonest-first, past most-recent-first;
  ailments matching the therapist's specialties are highlighted. 404 for
  unknown/non-numeric ids. "View appointments" link added to
  `therapists/show.ejs`.
- `src/routes/appointments.ts`: `findAppointment()` +
  `renderAppointmentShow()` (used by GET and the 400 re-render) and
  `POST /appointments/:id/prescription` (404 unknown appointment; 400 inline
  error for missing/unknown/garbage therapy or empty body, keeping submitted
  values; notes trimmed, empty → null; sets status/therapy/notes/
  prescribedAt and 302s back). `appointments/show.ejs` now shows the agent's
  ailments, the prescribed therapy (linked) + notes, status-dependent header
  copy, a back link to the therapist's dashboard, and the prescribe/revise
  form pre-filled with current values.
- Verified with `npm run dev` + `curl` + `sqlite3`: migrate, seed, and the
  seed skip path; all 4 dashboards (incl. the empty one) and the 404s;
  prescribe then revise (blank notes stored as NULL); the 400s and 404s
  above; every existing page still 200; both Phase 5 booking endpoints still
  302 and the new bookings show on the dashboard; past-time booking still
  400. `npm run lint` and `tsc --noEmit` clean. Verification data was
  removed afterwards (test bookings deleted, seeded appointment reset to
  `requested`). The 3 Phase 5 test appointments were deleted, with the
  user's OK, so the seed could run locally. No browser click-through by
  Claude — worth a quick manual look.

### Deviations from the specs

- None. Small extra: the dashboard link reads "Review / revise" for
  prescribed rows, "Review / prescribe" otherwise.
- Local dev DB only: Nova also has "Context Window Anxiety" from earlier
  manual testing — not part of the seed.
- `prettier --check src` still flags the same long-line style noted in
  Phase 3; not reformatted, to keep the diff scoped.

## Phase 7 — View & manage bookings: DONE

- Implemented from `specs/phase-7-plan.md`; decisions there were made with
  the user (simple agent picker mirroring the Phase 6 therapist dashboard,
  eligibility = `status === "requested"` and `requestedAt` still future,
  controls on both the list and the appointment page, cancelled rows kept
  and de-emphasized rather than hidden).
- No schema/migration change — `status` is already free-text;
  `"cancelled"` is just a new value alongside `"requested"`/`"prescribed"`.
  Reschedule updates `requestedAt` in place on the existing row.
- `src/routes/appointments.ts` gains: `canCancelOrReschedule()` (shared
  eligibility check — status `"requested"` and `requestedAt` in the
  future), `toDatetimeLocalValue()` (pre-fills the reschedule
  `datetime-local` input from a stored ISO string), `buildAgentAppointmentRows()`
  + `renderAppointmentsIndex()` (agent picker + upcoming/past list, same
  ordering convention as the therapist dashboard), and `renderActionError()`
  (re-renders whichever page — appointment or list — a cancel/reschedule
  POST was submitted from, based on a hidden `returnTo` field, with a 400
  and inline error).
- New routes: `GET /appointments` (bare picker, or a given agent's list via
  `?agentId=`), `POST /appointments/:id/cancel`, `POST
  /appointments/:id/reschedule` (same future-time validation as
  `createAppointment`). Both POSTs 404 for an unknown id via the existing
  `renderNotFound`.
- Views: `src/views/appointments/index.ejs` (new, agent picker + list) and
  `src/views/appointments/_row.ejs` (new partial for the agent's-eye
  row — separate from `therapists/_appointment-row.ejs` since the two
  views show different columns, as anticipated in the plan).
  `appointments/show.ejs` gained a "Manage your appointment" section
  (cancel + reschedule forms when eligible, an explanatory note
  otherwise). Cancelled rows are shown greyed out + struck through, not
  hidden. Home page got a "My appointments" link; `agents/show.ejs` got a
  "View appointments" link to `/appointments?agentId=<id>` (mirroring the
  therapist page's own link to its dashboard).
- Verified with `npm run dev` + `curl` + `sqlite3` against the seeded data
  (5 appointments from Phase 6's seed): bare picker and a populated list
  both 200; cancel/reschedule controls present only on the one eligible
  seeded appointment (`requested` + future), absent on prescribed and
  past-`requested` ones; cancel and reschedule both 400 with an inline
  error and no DB change when attempted on a locked appointment (and via
  the list-page `returnTo` path too); reschedule 400 for a past time and
  for garbage input, submitted value kept; successful reschedule (302,
  `requestedAt` updated) then cancel (302, `status` → `cancelled`);
  cancelling an already-cancelled appointment 400s; 404s for
  `/appointments/999/cancel` and `/appointments/999/reschedule`; every
  existing page (agents/therapies/therapists lists & details, therapist
  dashboards, Phase 5 booking, Phase 6 prescribing) still 200s/302s as
  before. `npm run lint` and `tsc --noEmit` both clean. Test data (a
  throwaway booking, and the reschedule/cancel exercised on seeded
  appointment 5) was cleaned up / reset afterwards. No browser
  click-through by Claude — worth a quick manual look.

### Deviations from the specs

- None beyond what `specs/phase-7-plan.md` already called out (a separate
  `_row.ejs` partial rather than sharing the therapist-side one).

## Phase 8 — Supervisor view: DONE

- Not yet committed as of writing this — commit hash to be filled in once
  the user asks for a commit.
- Implemented from `specs/phase-8-plan.md`; decisions there were made with
  the user (no standalone supervisor browse pages — a picker doubles as the
  entry point and the dashboard is the detail view; one supervisor per
  agent via a nullable `agents.supervisorId`, not a join table; full
  ailment + appointment history on the dashboard; 3 seeded supervisors with
  every seeded agent assigned).
- New `supervisors` table (`name`, `bio`, `avatarEmoji`) added to
  `src/db/schema.ts`, defined *above* `agents` in the file so
  `agents.supervisorId`'s `.references(() => supervisors.id)` resolves
  cleanly for `drizzle-kit generate`. `agents` gains a nullable
  `supervisorId` column. Migration `drizzle/0007_regular_mystique.sql`,
  applied automatically on server start like the existing tables.
- `SEED_SUPERVISORS` (3 entries) + `seedSupervisors()` in `src/db/seed.ts`,
  same skip-if-non-empty idempotency as `seedTherapists()`.
  `seedAgentSupervisors()` assigns each of the 5 `SEED_AGENTS` to one of the
  3 supervisors by name lookup (mirroring `seedAgentAilments()`), guarded by
  checking whether any agent already has a `supervisorId` set. Both wired
  into `seed()` right after `seedAgents()`.
- `buildAgentAppointmentRows()` in `src/routes/appointments.ts` is now
  exported (was file-private) so the supervisor dashboard can reuse the
  same agent-scoped upcoming/past appointment query as the "my
  appointments" list, per the plan.
- `src/routes/supervisors.ts` (new): `GET /supervisors` (picker — name,
  avatar, supervised-agent count, linking straight to each dashboard) and
  `GET /supervisors/:id` (dashboard; 404 via `supervisors/not-found.ejs`
  for an unknown/non-numeric id). For each supervised agent, the dashboard
  shows reported ailments (`getAilmentsByAgent()`) and full appointment
  history (`buildAgentAppointmentRows()`), with `canManage: false` forced
  on every row so the reused `appointments/_row.ejs` partial renders
  read-only (no cancel/reschedule forms) on this dashboard. Registered in
  `src/app.ts`.
- Views: `src/views/supervisors/index.ejs`, `show.ejs` (one section per
  supervised agent, reusing `../appointments/_row.ejs` for each
  appointment row), `not-found.ejs`. Home page got a "Supervisor view"
  link to `/supervisors`.
- Verified with `npm run dev` + `curl` + `sqlite3` against the seeded data:
  `npm run db:generate` + `db:migrate` + `db:seed` (3 supervisors, 5 agents
  assigned across them 2/2/1), re-ran `db:seed` to confirm both new seed
  functions skip cleanly; `/` has the new link; `/supervisors` lists all 3
  with correct supervised-agent counts (2, 2, 1); each of the 3 dashboards
  shows the right agents, ailments, and appointment rows/statuses
  (including a cancelled one) matching `sqlite3` ground truth, with no
  cancel/reschedule forms rendered anywhere on any dashboard;
  `/supervisors/999` and `/supervisors/abc` 404; every existing route
  (agents, therapies, therapists, therapist dashboards, appointments list
  and detail) still responds as before. `npm run lint` and `tsc --noEmit`
  both clean. No browser click-through by Claude — worth a quick manual
  look.

### Deviations from the specs

- None beyond what `specs/phase-8-plan.md` already called out (single
  `supervisorId` column instead of a join table, no standalone
  browse/detail pages for supervisors).

## Next phase

Phase 9 — Auth & roles. See `specs/roadmap.md` for its scope.

Backlog note: Phase 11 (navigation back to home from the list pages —
now `/agents`, `/therapies`, and `/therapists`) is in `specs/roadmap.md`,
to be tackled separately — it doesn't change the order above.
