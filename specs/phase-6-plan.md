# Phase 6 — Therapist view & prescribing: implementation plan

Drafted in a planning conversation on 2026-09-29 so implementation can start
in a fresh conversation. Scope comes from the Phase 6 entry in
`specs/roadmap.md`. Starting state: `specs/progress.md` (Phase 5 done,
commit `f3b4026`).

**Status: implemented** (approved by the user; see `specs/progress.md`,
Phase 6). The open question at the bottom was resolved: the user approved
deleting the 3 local test appointments.

## Decisions made with the user

- **Dashboard location:** a new page, `GET /therapists/:id/appointments`,
  linked from the therapist detail page. Kept separate from the public
  profile/booking page (maps cleanly onto Phase 9 role scoping).
- **Prescribe UI:** on the existing appointment page, `/appointments/:id`
  (therapy dropdown + notes textarea). Dashboard rows link there.
- **Status:** prescribing sets `status` from `"requested"` to
  `"prescribed"`. It stays **editable** — the therapist can revise the
  therapy/notes later. Therapy is required; notes are optional.
- **Timing:** prescribing is allowed on upcoming **and** past appointments.
- **Seed data:** seed a few demo appointments (mix of past/upcoming,
  some already prescribed) so the dashboard has content on a fresh checkout.

## Codebase facts this plan relies on (verify before relying on them)

- `appointments` (`src/db/schema.ts`) already has nullable `therapyId` →
  `therapies`, `status` text default `"requested"`, `requestedAt` /
  `createdAt` as ISO strings.
- `src/routes/appointments.ts` has `createAppointment()`,
  `formatAppointmentTime()`, and `GET /appointments/:id` (renders
  `appointments/show.ejs`, 404 via `appointments/not-found.ejs`).
- `src/routes/therapists.ts` has a `renderTherapistShow()` helper and the
  pattern for grouping join rows in JS (see the `/therapists` list's
  specialties).
- `src/db/seed.ts` uses one `seedX()` function per table with
  skip-if-non-empty idempotency; link seeds look rows up by name
  (see `seedAgentAilments()`), all wired into `seed()`.
- Booking only accepts future times, so without seed data every appointment
  is "upcoming" until time passes.

## Plan

### 1. Schema + migration
- Add nullable `notes` (text) and nullable `prescribedAt` (text, ISO) to
  `appointments` in `src/db/schema.ts`.
- `npm run db:generate` → `drizzle/0006_*.sql` (applied on server start).
- Update the schema comment on `appointments` to describe the
  `requested` → `prescribed` lifecycle.

### 2. Seed (`src/db/seed.ts`)
- `seedAppointments()` wired into `seed()`, same skip-if-non-empty check,
  looking agents/therapists/therapies up by name.
- ~5 appointments with times relative to seed time:
  - 2 upcoming, `requested`
  - 2 past, `prescribed`, with a therapy + notes
  - 1 past, still `requested` (the "prescribe after the session" case)
- Spread across therapists so at least one dashboard has both sections
  populated. Only use agents who have a reported ailment (matches the
  Phase 5 booking rule).

### 3. Therapist dashboard — `GET /therapists/:id/appointments`
(in `src/routes/therapists.ts`)
- 404 via `therapists/not-found.ejs` for unknown/non-numeric ids.
- Query this therapist's appointments joined to the agent, left-joined to
  the therapy.
- One query for the relevant agents' ailments, grouped in JS; highlight
  ailments that match this therapist's specialties.
- Split by `requestedAt` vs now:
  - **Upcoming** — soonest first
  - **Past** — most recent first
- Each row: agent (linked), formatted time, status badge, prescribed
  therapy or "Not yet prescribed", ailment tags, and a
  "Review / prescribe" link to `/appointments/:id`.
- New view `src/views/therapists/appointments.ejs` with empty states for
  both sections.
- Add a "View appointments" link on `src/views/therapists/show.ejs`.

### 4. Appointment page + prescribing (`src/routes/appointments.ts`)
- Extract a `renderAppointmentShow()` helper (same pattern as
  `renderTherapistShow()`), used by GET and the POST 400 re-render.
- `appointments/show.ejs` gains:
  - the agent's reported ailments, for context
  - prescribed therapy (linked to `/therapies/:id`) + session notes, once set
  - a "Prescribe a therapy" form: dropdown of all therapies (icon, name,
    duration) + notes textarea, pre-filled with current values so the same
    form handles revisions
  - header copy that depends on status ("Appointment requested" vs
    "Therapy prescribed")
  - a "Back to <therapist>'s appointments" link
- `POST /appointments/:id/prescription`:
  - 404 if the appointment doesn't exist
  - 400 with inline error for missing/unknown/garbage therapy, re-rendering
    the page with submitted values kept (use `request.body ?? {}` — empty
    bodies arrive as `undefined`, see Phase 2 notes)
  - trim notes; empty → null
  - set `therapyId`, `notes`, `status = "prescribed"`, `prescribedAt`,
    then 302 back to `/appointments/:id`

### 5. Out of scope
- Cancel/reschedule and the agent-side appointment list (Phase 7).
- Auth/scoping — any visitor can use any therapist's dashboard (Phase 9).
- Design pass (Phase 10).

### 6. Verification
1. `db:generate` + `db:migrate` + `db:seed`; re-run `db:seed` to confirm
   the skip path.
2. `npm run dev` + `curl`:
   - dashboards for each therapist (incl. one with no appointments) and
     the 404s (unknown / non-numeric id)
   - prescribe on a fresh appointment, then revise it
   - 400s for missing, unknown, and garbage therapy, and an empty body
   - 404s for unknown appointment, GET and POST
3. Check the rows in `sqlite3`.
4. Re-check every existing page and both Phase 5 booking flows.
5. `npm run lint` and `tsc --noEmit`.
6. Update `specs/progress.md`. Don't commit unless the user asks.

## Open question (ask before implementing)

The local dev DB (`data/agentclinic.db`) already holds 3 test appointments
from Phase 5 verification, so `seedAppointments()`'s skip-if-non-empty
check would skip locally. Proposed: delete those 3 rows so the seed runs.
The user hasn't confirmed this yet.
