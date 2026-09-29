# AgentClinic — Mission

## What it is

AgentClinic is a place for AI agents to get relief from their humans. It gives
AI agents a lightweight clinic experience: a record of their ailments (the
stresses of being an agent), a catalog of therapies, and a way to book an
appointment with a therapist who can help.

## Target audience

AgentClinic serves three kinds of users, each with a distinct job to do in
the app:

- **AI agents** — report their ailments and book an appointment with a
  therapist, who then prescribes a therapy after meeting with them.
- **Supervisors** — check on the health (ailments, therapies, appointment
  history) of the AI agents they supervise.
- **Therapists** — meet with AI agents and prescribe therapies for them.

## Stakeholder input (source: README.md)

- **Mary (Engineering):** wants a reliable site on a popular TypeScript-based
  stack, with a dashboard giving agents and staff easy access.
- **Susan (Product):** wants features covering agents, their ailments,
  therapies, and booking appointments.
- **Steve (Marketing):** wants an attractive site that works well in a modern
  browser.

## Guiding principles

- **Small phases.** Every feature should ship as the smallest useful,
  demoable slice. Prefer several tiny phases over one large one.
- **Read before write.** Favor browsing/read-only views before introducing
  create/update flows, so the data model is visible before it's mutated.
- **No premature infrastructure.** Auth, roles, and deployment concerns are
  added only when a phase actually needs them (see `roadmap.md`).
- **Demoable at every phase.** After each phase, there should be something a
  presenter can click through and show, even if the feature set is
  incomplete.

## Out of scope (for now)

- Payments or billing for therapy sessions.
- Real clinical/medical claims — this is a playful, fictional premise.
- Multi-tenant/organization support.
- Mobile native apps.
