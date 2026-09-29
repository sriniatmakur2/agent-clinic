# AgentClinic — Roadmap

High-level implementation order, broken into the smallest phases that each
produce something demoable. Each phase should become its own spec/feature
when implemented — this file is the sequencing, not the detailed spec.

No code has been written yet. This roadmap is a plan for review before any
implementation begins.

## Phase 0 — Walking skeleton

Get the stack wired end-to-end with nothing but a placeholder page.

- Fastify server serving a single page.
- SQLite file + Drizzle configured, with one trivial table and a migration.
- Tailwind CSS building and applied to the placeholder page.
- `npm run dev` boots the whole thing from a clean checkout.

**Demo:** "Here's AgentClinic running locally, stack fully wired."

## Phase 1 — Browse agents

Introduce the core entity and a read-only view of it.

- `agents` table (name, a short bio/role, avatar/placeholder, etc.).
- Seed data: a handful of fictional AI agents.
- List page of all agents.
- Detail page per agent.

**Demo:** "Here are the agents in the clinic's care."

## Phase 2 — Ailments

Attach the "why they're here" data to each agent.

- `ailments` table (name, description) — a small fixed catalog to start
  (e.g. "context window anxiety", "prompt injection trauma").
- `agent_ailments` join, linking agents to one or more ailments.
- Ailments shown on the agent detail page, and an agent can report a new
  ailment about themselves.

**Demo:** "Here's what's actually wrong with each agent, and here's an
agent reporting a new one."

## Phase 3 — Therapy catalog

Introduce the treatments available at the clinic, still read-only. Not yet
linked to agents or appointments — this is reference data the therapist
will draw on when prescribing in Phase 6.

- `therapies` table (name, description, duration).
- List page and detail page for therapies.

**Demo:** "Here's what the clinic offers."

## Phase 4 — Browse therapists

Introduce the other person in the booking relationship, so there's someone
to actually book an appointment with.

- `therapists` table (name, short bio, specialty/placeholder).
- Seed data: a handful of therapists.
- List page and detail page for therapists.

**Demo:** "Here are the therapists on staff."

## Phase 5 — Book an appointment

The first write/mutation flow: an agent, having reported an ailment, sets
up an appointment with a therapist. No therapy is chosen yet — that comes
from the therapist, in Phase 6.

- `appointments` table (agent, therapist, requested time, status,
  therapy — nullable until prescribed).
- Booking form on an agent or therapist detail page.
- Confirmation view after booking.

**Demo:** "Watch an agent report an ailment and book a session with a
therapist."

## Phase 6 — Therapist view & prescribing

The therapist meets the agent (conceptually) and prescribes a therapy —
this is where the appointment's `therapy` field actually gets set.

- Therapist dashboard: list of the therapist's own upcoming/past
  appointments, with the reporting agent's ailment(s) visible for context.
- Ability for the therapist to prescribe a therapy (from the Phase 3
  catalog) and add session notes on an appointment.

**Demo:** "Here's a therapist reviewing an agent's ailment and prescribing
a therapy."

## Phase 7 — View & manage bookings

Let the flow be inspected and undone from the agent's side too, not just
created and prescribed.

- "My appointments" list for an agent, showing status and, once
  prescribed, the therapy (still no auth — treat as a single global list,
  or scoped by a simple agent picker).
- Cancel/reschedule an appointment (before it's been held).

**Demo:** "Here's the full booking lifecycle, start to prescription."

## Phase 8 — Supervisor view

Give supervisors a way to check on the agents they supervise.

- `supervisor_agents` relationship (which agents a supervisor supervises).
- Supervisor dashboard: list of supervised agents with their ailments and
  appointment/prescription history at a glance.

**Demo:** "Here's what a supervisor sees for their team of agents."

## Phase 9 — Auth & roles

Only now introduce login, once there's something worth protecting in each
of the three views built above.

- Simple session-based login.
- Three roles: **Agent** (reports ailments, books/manages their own
  appointments), **Therapist** (Phase 6 dashboard, scoped to their own
  appointments), and **Supervisor** (Phase 8 dashboard, scoped to their
  supervised agents).
- Route-level access control matching those roles.

**Demo:** "Log in as an agent, a therapist, or a supervisor and see three
different views."

## Phase 10 — Visual polish

Address Steve's "attractive, modern-browser" ask directly, once the
information architecture has settled.

- Consistent Tailwind design pass across all pages (typography, spacing,
  color, empty/loading/error states).
- Responsive check on common modern browser sizes.

**Demo:** "The full clinic, and it actually looks good."

## Phase 11 — Navigation back to home

> **Folded into Phase 10.** Phase 10's layout nav bar (logo link to `/`,
> plus Agents / Therapies / Therapists and the viewer's dashboard) appears
> on every page, including both list pages, so no separate phase is
> needed. Kept here for the record.

Found while testing Phase 3: the `/agents` and `/therapies` list pages
have no way to get back to the home page (`/`) — only the browser's back
button.

- Add a link back to `/` on the `/agents` and `/therapies` list pages.

**Demo:** "From any list page, one click takes you back home."

## Explicitly deferred (not in initial phases)

- Cloud deployment / shareable public URL.
- Full RBAC beyond Agent/Therapist/Supervisor.
- Payments/billing.
- Automated test suite build-out (added incrementally as logic warrants,
  per `tech-stack.md`).

---

**This roadmap is a proposal.** Please review the phase breakdown and
sequencing above — nothing will be implemented until you confirm the plan
(and no code will be written until you explicitly ask for it).
