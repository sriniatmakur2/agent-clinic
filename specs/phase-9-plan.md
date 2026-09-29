# Phase 9 — Auth & roles: implementation plan

Scope, per `specs/roadmap.md`: simple session-based login, three roles
(Agent, Therapist, Supervisor), and route-level access control so each role
sees only its own slice of the views built in Phases 2–8.

**Status: implemented** (see `specs/progress.md`, Phase 9).

## Decisions made with the user before implementation

- **Username + password login**, backed by a new `users` table (not
  passwordless "pick who you are", and not credential columns bolted onto
  `agents`/`therapists`/`supervisors`). Each user has exactly one role and
  links to exactly one agent, therapist, or supervisor row.
- **Catalog pages stay public** (read-only): home, `/agents` + `/agents/:id`,
  `/therapies` + `/therapies/:id`, `/therapists` + `/therapists/:id`. Every
  dashboard, every appointment page, and every POST requires login and the
  right role.
- **Booking is agent-only and books for yourself.** The therapist detail
  page's booking form only renders for a logged-in agent and has no agent
  dropdown — the agent comes from the session. The agent detail page's
  ailment-report and booking forms only render on *your own* agent page.
- **Supervisors can open `/appointments/:id`** for appointments belonging to
  agents they supervise, read-only (no cancel/reschedule/prescribe forms).

## Decisions I'm proposing (not yet discussed — flag any you disagree with)

- **Session library: `@fastify/cookie` + `@fastify/session`** with the
  default in-memory store. Sessions are lost on server restart (including
  `tsx watch` reloads) — acceptable for a local-only demo, and avoids adding
  a session table or a key-file setup. Cookie is `httpOnly`, `sameSite:
  "lax"`, `secure: false` (plain http locally). Secret from
  `SESSION_SECRET` env var, with a hard-coded dev fallback (≥32 chars, as
  `@fastify/session` requires).
- **Password hashing: Node's built-in `crypto.scrypt`** (random salt, stored
  as `salt:hash`, compared with `timingSafeEqual`). No bcrypt/argon2
  dependency — no new native build to approve (see the Phase 0 npm
  install-script note).
- **Demo accounts:** every seeded agent, therapist, and supervisor gets a
  login, all with the shared password `clinic`. Usernames are lowercase
  first names: agents `ava`, `percy`, `ledger`, `nova`, `hank`; therapists
  `ada`, `tokenia`, `grace`, `retry`; supervisors `marge`, `dale`, `priya`.
  The login page shows a small "demo accounts" hint listing these, so a
  presenter doesn't need to remember them.
- **No sign-up / registration UI.** Accounts are seed-only, matching how
  supervisor assignment was seed-only in Phase 8.
- **Unauthenticated → redirect, wrong role → 403.** Hitting a protected
  GET while logged out 302s to `/login?next=<path>` (and back there after
  login; `next` only honoured if it's a same-site path starting with a
  single `/`). Logged in but not allowed → a shared 403 page
  (`src/views/forbidden.ejs`). Unknown ids still 404 as today (404 checked
  before 403, so e.g. `/therapists/999/appointments` stays a 404).
- **After login, redirect to your own home view**: agent →
  `/appointments` (their list), therapist → `/therapists/:id/appointments`,
  supervisor → `/supervisors/:id` — unless a `next` is present.
- **Logout is a `POST /logout`** (a button, not a link), destroying the
  session and redirecting to `/`.

## Schema changes

- New `users` table in `src/db/schema.ts`: `id`, `username` (not null,
  **unique**), `passwordHash` (not null), `role` (not null text —
  `"agent" | "therapist" | "supervisor"`, free text like
  `appointments.status`), and nullable `agentId` / `therapistId` /
  `supervisorId` FKs (exactly one set, matching `role`). Separate typed FKs
  rather than a polymorphic `profileId`, so the references stay real.
- One migration via `npm run db:generate`. Additive only — no changes to
  existing tables.

## Seed data (`src/db/seed.ts`)

- `seedUsers()`: builds the 12 accounts above by name lookup against the
  existing agents/therapists/supervisors rows (the same find-by-name pattern
  as `seedAgentSupervisors()`), hashing `clinic` with the shared helper.
  Same skip-if-non-empty idempotency. Wired into `seed()` after the
  agent/therapist/supervisor seeds. Works against an existing dev DB,
  since `users` is a new, empty table.

## Auth module (`src/auth.ts`, new)

- `hashPassword()` / `verifyPassword()` (scrypt, described above).
- Session typing: augment `@fastify/session`'s `FastifySessionObject` with
  `userId?: number`.
- An `onRequest`/`preHandler` hook (registered in `src/app.ts`) that loads
  the current user from `request.session.userId` and puts it on
  `request.currentUser` (type-augmented) **and** `reply.locals.currentUser`,
  so every EJS view — including `layout.ejs` — can read it without each
  route passing it explicitly. `@fastify/view` merges `reply.locals` into
  view data.
- Small guard helpers used inside route handlers (explicit per-route checks
  read more clearly here than a generic role/route table, since most checks
  depend on the specific record — "is this *your* appointment"):
  - `requireLogin(request, reply)` → returns the user, or sends the
    `/login?next=` redirect and returns `null`.
  - `forbid(reply)` → renders `forbidden.ejs` with a 403.
  - Plain predicates like `isAgent(user, agentId)`,
    `isTherapist(user, therapistId)`, `isSupervisorOf(user, agent)`.

## Routes

New `src/routes/auth.ts`:

- `GET /login` — form (username, password, hidden `next`), plus the demo
  accounts hint. Already logged in → redirect to your home view.
- `POST /login` — 400 with an inline error ("Invalid username or
  password", same message whether the username or password was wrong) and
  the username kept; on success, regenerate the session, set `userId`, and
  redirect as described above.
- `POST /logout` — destroy session, 302 to `/`.

Access control added to existing routes:

| Route | Who |
|---|---|
| `/`, `/agents`, `/agents/:id`, `/therapies*`, `/therapists`, `/therapists/:id` | public (forms on them role-gated, see below) |
| `POST /agents/:id/ailments` | that agent |
| `POST /agents/:id/appointments` | that agent |
| `POST /therapists/:id/appointments` | any agent — books for the session's agent; any submitted `agentId` is ignored |
| `GET /therapists/:id/appointments` | that therapist |
| `GET /appointments` | agents only — renders their own list; the agent picker and `?agentId=` go away (other roles → 403) |
| `GET /appointments/:id` | the appointment's agent, its therapist, or the agent's supervisor |
| `POST /appointments/:id/prescription` | the appointment's therapist |
| `POST /appointments/:id/cancel`, `/reschedule` | the appointment's agent |
| `GET /supervisors` | supervisors only — redirects straight to your own dashboard (picker removed) |
| `GET /supervisors/:id` | that supervisor |

Notable code changes this implies:

- `renderAppointmentsIndex()` no longer takes an arbitrary agent or passes
  `allAgents`; `renderActionError()`'s `returnTo` check becomes
  `returnTo === "/appointments"` instead of `?agentId=`.
- `renderAppointmentShow()` gets which controls to show from the viewer:
  manage section only for the owning agent, prescribe form only for the
  owning therapist, neither for a supervisor. The back link points at the
  viewer's own dashboard.
- `renderTherapistShow()` drops `getBookableAgents()` (no agent dropdown);
  the form shows only when the viewer is an agent with ≥1 ailment (the
  existing server-side ailment check in `createAppointment()` still
  applies).
- `renderAgentShow()` shows the ailment/booking forms only when the viewer
  is that agent.
- Register `@fastify/cookie`, `@fastify/session`, the auth hook, and
  `authRoutes` in `src/app.ts`.

## Views

- `src/views/login.ejs` (new) — login form + demo accounts hint.
- `src/views/forbidden.ejs` (new) — 403 page with a link home (and to log
  in as someone else).
- `src/views/layout.ejs` — a thin top bar: "Logged in as Ava (agent) ·
  Log out" when logged in, "Log in" otherwise. Kept minimal; the real
  design pass is Phase 10. (Incidentally gives every page a way back to
  `/`, which overlaps Phase 11 — I'll note it in `progress.md` rather than
  expand this phase to cover Phase 11 fully.)
- `src/views/home.ejs` — role-aware buttons: public catalog links for
  everyone; "My appointments" only for agents, "My dashboard" for
  therapists/supervisors; "Log in" when logged out. The standalone
  "Supervisor view" button goes away (reached via login).
- `agents/show.ejs`, `therapists/show.ejs`, `appointments/show.ejs`,
  `appointments/index.ejs`, `supervisors/index.ejs` (possibly deleted, since
  `/supervisors` now only redirects) — adjusted for the gating above.
  "View appointments" links on the agent/therapist detail pages only shown
  to that agent/therapist.

## Out of scope for this phase

- Sign-up, password change/reset, account admin UI.
- CSRF tokens (the `sameSite: "lax"` cookie blocks the cross-site-POST case
  for a local demo; worth revisiting if the app is ever deployed).
- Persistent session store / surviving restarts.
- Login rate limiting / lockout.
- Any role beyond the three (roadmap defers full RBAC).
- Visual polish of the new pages (Phase 10) and the full Phase 11 nav fix.
- Automated tests — though `hashPassword`/`verifyPassword` and the guard
  predicates are the first logic that might justify adding Vitest; I'd
  leave that for you to call, not add it unasked.

## Verification plan

- `npm install` (two new deps), `npm run db:generate` + `db:migrate` +
  `db:seed` (12 users), re-run `db:seed` to confirm the skip path;
  `sqlite3` check that no plaintext passwords are stored.
- `npm run dev` + `curl` with a cookie jar (`-c`/`-b`), per role:
  - Logged out: public pages 200; every protected GET 302s to
    `/login?next=…`; every POST is rejected; login with a bad password 400,
    good password 302 to the right home view; `next` honoured, and an
    off-site `next` (`//evil.com`, `https://…`) ignored.
  - Agent (`ava`): own list + own appointment pages 200; another agent's
    appointment 403; report ailment + book (from both pages) on self works,
    on another agent's id 403; cancel/reschedule own works, others' 403;
    prescribe 403; therapist dashboard / supervisor dashboard 403.
  - Therapist (`ada`): own dashboard 200, another therapist's 403; own
    appointment pages 200 with the prescribe form; prescribe works; other
    therapist's appointment 403; cancel/reschedule/book/ailment POSTs 403.
  - Supervisor (`marge`): `/supervisors` redirects to own dashboard; other
    supervisor 403; supervised agent's appointment page 200 with no forms;
    unsupervised agent's appointment 403; all POSTs 403.
  - Logout clears the session (protected page redirects again).
  - 404s for unknown ids unchanged.
- Re-check that the Phase 5–8 happy paths still work when performed by the
  right role.
- `npm run lint` and `tsc --noEmit` clean.
- No browser click-through by Claude (no browser available) — flagged for a
  manual look, as in every prior phase.
- Afterwards, reset any test data (bookings, cancellations, prescriptions)
  as in prior phases.
