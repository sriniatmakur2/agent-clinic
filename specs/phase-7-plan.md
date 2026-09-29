# Phase 7 — View & manage bookings: implementation plan

Scope per `specs/roadmap.md`: an agent-facing "my appointments" list, and
cancel/reschedule for appointments that haven't been prescribed or held yet.

## Decisions (confirmed with the user)

- **Scoping:** simple agent picker, mirroring the Phase 6 therapist dashboard
  pattern — no global list.
- **Cancel/reschedule eligibility:** only appointments with `status ===
  "requested"` (not yet prescribed) **and** `requestedAt` still in the
  future. Once prescribed, or once the time has passed, the appointment is
  locked (matches "before it's held").
- **UI placement:** both the appointment's own page (`/appointments/:id`)
  and inline on the "my appointments" list page get cancel/reschedule
  controls.
- **Cancelled status:** new `status = "cancelled"` value. Cancelled
  appointments stay in the list (not hidden), shown with a distinct visual
  style (e.g. greyed out / struck through), matching the "never delete
  appointments" pattern already used elsewhere.

## Data model

No schema change needed for the status value itself — `appointments.status`
is already a free-text column (`"requested"` / `"prescribed"` so far);
`"cancelled"` is just a new string value, no migration required.

Reschedule updates `requestedAt` in place on the existing row (no new
column, no new appointment row) — same validation as the original booking
(future `datetime-local`, via `DATETIME_LOCAL` regex + parse, same as
`createAppointment`).

## Routes (`src/routes/appointments.ts`, extended)

- `GET /appointments` — the agent picker. Query param `?agentId=<id>`:
  - No `agentId` (or unknown one): render a picker (dropdown of all agents,
    reusing the pattern from the booking form's therapist/agent dropdowns).
  - With a valid `agentId`: render that agent's appointments, upcoming
    soonest-first then past most-recent-first (same ordering convention as
    `therapists/appointments.ejs`), each row showing status, therapy (once
    prescribed), and — for eligible rows — inline cancel + reschedule forms.
  - New view `src/views/appointments/index.ejs`, reusing an
    `_appointment-row.ejs`-style partial parameterized for the agent's-eye
    view (status badge, therapist name, therapy once prescribed, cancel/
    reschedule controls when eligible). Considering whether to share the
    existing therapist-side partial or add a sibling partial — will decide
    once both views are side by side; they show different columns
    (therapist dashboard shows the agent + ailments for context, this page
    shows the therapist + status for the agent), so likely a separate
    partial rather than forcing one shared one.
- `POST /appointments/:id/cancel` — sets `status = "cancelled"` if eligible
  (else 400, e.g. re-render the appointment page or list row with an inline
  error — appointment already prescribed/passed/cancelled). 302 back to
  wherever the form was submitted from (appointment page or list page, via
  a hidden `returnTo` field or `Referer`-independent redirect target passed
  in the form).
- `POST /appointments/:id/reschedule` — same eligibility gate; body is a new
  `requestedAt`; validated with the same future-time check as booking; on
  success updates `requestedAt` and 302s back; on failure re-renders with an
  inline error, submitted value kept.
- Both new POSTs 404 for an unknown appointment id (matching existing
  `renderNotFound` behavior).

Shared eligibility check factored into a small helper, e.g.
`canCancelOrReschedule(appointment): boolean` (status is `"requested"` and
`requestedAt` is in the future), used by both the route guards and the
views (to decide whether to render the controls at all).

## Views

- `src/views/appointments/index.ejs` (new): agent picker + that agent's
  appointment list, cancel/reschedule forms inline per eligible row,
  cancelled rows visually de-emphasized (grey/strikethrough), a link back
  to `/`.
- `src/views/appointments/show.ejs` (extend): add agent-facing cancel and
  reschedule forms, shown only when `canCancelOrReschedule` is true,
  alongside the existing therapist prescription form. Locked appointments
  (prescribed, cancelled, or past) show a short explanatory note instead of
  the forms (e.g. "This appointment can no longer be changed.").
- Home page: add a "My appointments" link next to the existing "Meet the
  agents" / "Browse therapies" / "Meet the therapists" buttons.
- Each agent's own detail page (`agents/show.ejs`) also gets a link to
  `/appointments?agentId=<id>` for convenience (mirrors how the therapist
  page links to its own dashboard).

## Verification plan

- `npm run db:migrate` (no-op, no schema change) + existing seed data.
- Boot `npm run dev`, `curl`:
  - `/appointments` (bare picker), `/appointments?agentId=<seeded id>` (list
    renders, correct ordering, cancelled rows styled differently once one
    exists).
  - Cancel a `requested` future appointment → 302, status becomes
    `cancelled`, row updates on reload, forms disappear.
  - Attempt to cancel/reschedule a `prescribed` appointment and a past
    `requested` one → 400/blocked, forms not rendered.
  - Reschedule a `requested` future appointment to a new future time → 302,
    time updates; reschedule to a past time or garbage → 400 inline error,
    submitted value kept.
  - 404s for `/appointments/999/cancel` and `/appointments/999/reschedule`.
  - Every existing page (agents/therapies/therapists lists & details,
    therapist dashboards, Phase 5/6 booking and prescribing flows) still
    200s and behaves as before.
  - Any test appointments created/cancelled during verification removed
    afterward (or reset), consistent with prior phases.
- `npm run lint` and `tsc --noEmit` clean.
- No browser click-through by Claude (per prior phases) — flag for a quick
  manual look, as usual.

## Explicitly out of scope for this phase

- Auth/roles (Phase 9).
- Supervisor view (Phase 8).
- Visual design pass beyond the minimal cancelled-row styling described
  above (Phase 10).
- Any change to the therapist-side prescribing flow from Phase 6.
