# Phase 10 — Visual polish: implementation plan

Scope, per `specs/roadmap.md`: a consistent Tailwind design pass across all
pages (typography, spacing, color, empty/loading/error states) and a
responsive check on common modern browser sizes. This is Steve's
"attractive, modern-browser" ask (`specs/mission.md`).

**Status: proposed — awaiting approval.** No code has been written.

## Decisions made with the user before implementation

- **Refine the current look.** No rebrand. Keep the teal + slate palette and
  the emoji avatars/icons, and make everything consistent and more polished.
  No dark mode.
- **Real nav bar, and Phase 11 is absorbed into it.** The top bar gets links
  to Agents, Therapies, Therapists, and the viewer's own dashboard. The
  current section is highlighted, and the bar collapses on mobile. That
  covers Phase 11 ("link back to `/` from the list pages"), so Phase 11 is
  marked done-by-Phase-10 in `roadmap.md` / `progress.md`.
- **Home becomes a real landing page.** The Phase 0 "Stack fully wired /
  Server boot #N" box goes. In its place: a hero with the tagline, then
  three "who it's for" cards (Agents / Therapists / Supervisors) linking into
  the app. The `boot_log` table and the insert on every boot stay unchanged,
  so there's no schema change. Only the view stops showing it.
- **Shared styles live as component classes in `public/css/input.css`,**
  using Tailwind v4's `@layer components { … @apply … }`. Views use
  `class="btn btn-primary"` instead of a 10-utility string, so one file sets
  the look.

## Decisions I'm proposing (flag any you disagree with)

- **No new npm dependencies, no JavaScript.** The mobile nav collapses with
  a native `<details>`/`<summary>` disclosure. No JS bundle, no htmx
  (tech-stack says to add those only when a feature needs them).
- **System font stack**, with no web font. The app is local-only, and
  loading Google Fonts would add an external request for little gain.
  Typography polish comes from a consistent type scale instead.
- **Global 404 and 500 pages.** Today an unknown URL (e.g. `/nope`) returns
  Fastify's raw JSON 404, and an unhandled error returns a JSON 500. I'll add
  `app.setNotFoundHandler` and `app.setErrorHandler` in `src/app.ts` that
  render a new `not-found.ejs` (generic) and `error.ejs` inside the normal
  layout. The existing per-entity not-found pages
  (`agents/not-found.ejs` etc.) stay and get restyled. This is the only
  `.ts` change beyond a one-line nav helper (next bullet), and it's
  squarely "error states" from the roadmap.
- **Current-section highlighting** needs the request path in the layout.
  `loadCurrentUser` in `src/auth.ts` already puts `currentUser` in
  `reply.locals`. I'll add `reply.locals.currentPath = request.url`
  (path only, query stripped) next to it. There's no other plumbing.
- **Status badge as one EJS partial.** The status pill is copy-pasted in
  3 places, and 2 of them are wrong for cancelled appointments:
  - `appointments/show.ejs` shows "cancelled" in amber, and its header
    still says "Appointment requested".
  - `therapists/_appointment-row.ejs` also shows "cancelled" in amber.

  A new `src/views/_status-badge.ejs` (requested = amber, prescribed = teal,
  cancelled = slate) replaces all three. The appointment page header gets a
  cancelled variant ("Appointment cancelled"). Cancelled rows on the
  therapist dashboard get the same muted, struck-through look they already
  have on the agent side.
- **"Loading states": none to add.** Every page is server-rendered with
  full-page form POSTs, and there's no client-side fetching to show a
  spinner for. Buttons get consistent `hover`/`active`/`focus-visible`
  states, which is the honest equivalent here. I'll note this in
  `progress.md` so it doesn't look missed.
- **Two page widths only.** "Wide" (`max-w-4xl`) is for lists and
  dashboards. "Narrow" (`max-w-2xl`) is for detail pages, forms, and login.
  Today there are four (`md`/`xl`/`2xl`/`3xl`). The nav bar matches the
  wide width. Vertical padding shrinks on phones (`py-8 sm:py-14` instead of
  a flat `py-16`/`py-24`).
- **Redundant "← Back home" links are removed** where the nav now covers
  them: login, "My appointments", and the supervisor dashboard. Contextual
  back links stay ("← Back to agents", "← Back to <therapist>", the
  appointment page's back-to-dashboard link).
- **Small extras, all cheap:**
  - An inline SVG emoji favicon (🩺) as a `data:` URI in `layout.ejs`, with
    no asset file.
  - `<title>` becomes "Page · AgentClinic".
  - A one-line footer: "AgentClinic is a playful, fictional clinic for AI
    agents."

## The component classes (`public/css/input.css`)

Defined once and used everywhere. Names are final unless you object:

| Class | Replaces today's… |
| --- | --- |
| `.page`, `.page-narrow` | `mx-auto flex max-w-* flex-col gap-6 px-4 py-16` on every `<main>` |
| `.page-header`, `.page-title`, `.page-subtitle` | the mix of `text-3xl teal-700` (lists) and `text-2xl slate-900` (details) headings |
| `.section-title` | `text-lg font-semibold text-slate-900` `<h2>`s |
| `.card`, `.card-link` | `rounded-lg border border-slate-200 bg-white px-6 py-6 shadow-sm`, and the hoverable list-card variant |
| `.btn` + `.btn-primary` / `.btn-secondary` / `.btn-danger` / `.btn-sm` | 6 slightly different button strings (`bg-teal-600` vs `bg-teal-700`, `border-teal-600` vs `border-teal-700`, a one-off `bg-slate-800`) |
| `.link`, `.back-link` | `text-teal-700 hover:underline` variants |
| `.label`, `.input` (also used for `select`/`textarea`) | form controls with no focus ring today; the new ones get a teal `focus-visible` ring |
| `.alert-error` | `rounded-md bg-red-50 px-3 py-2 text-sm text-red-700`, now with a red left border and `role="alert"` |
| `.empty-state` | bare `text-sm text-slate-500` "No … yet." lines, which become a dashed-border box with a short friendly line |
| `.badge` + `.badge-teal` / `.badge-amber` / `.badge-slate` / `.badge-solid` | status pills and ailment/specialty tags |
| `.avatar`, `.avatar-lg` | the emoji circle badges (4 sizes today, 2 after) |
| `.nav-link`, `.nav-link-active` | new top-bar links |

`@source "../../src/views";` stays, so Tailwind still scans the views for
any leftover one-off utilities.

## Per-page changes

**Layout (`layout.ejs`):**
- New nav bar. Left: logo "🩺 AgentClinic". Links: Agents · Therapies ·
  Therapists · "My appointments" / "My dashboard" (logged in only). Right:
  the user chip (avatar + name + role badge) and Log out, or "Log in".
- At `< sm` the links and the user chip fold into a `<details>` "Menu"
  disclosure.
- Plus the footer, favicon, and title suffix.

**Pages:**
- **Home:** hero (title, tagline, primary CTA "Log in" or "My dashboard",
  secondary "Meet the agents"), then three role cards describing what each
  role does, each linking to the relevant browse page or login.
  `routes/home.ts` stops querying `boot_log` (the query becomes unused).
- **List pages** (`agents/index`, `therapies/index`, `therapists/index`):
  a shared page-header style, `.card-link` grid cards, consistent avatar
  size. The therapies list shows duration as a badge.
- **Detail pages** (`agents/show`, `therapies/show`, `therapists/show`): the
  same profile-card header (avatar, name, subtitle, bio, action button).
  Sections become consistent `.card`s. Forms use `.label`/`.input`/`.btn`.
  The ailment form's "Report" button stays inline with its select on
  desktop and stacks below it on mobile.
- **Appointment page** (`appointments/show`):
  - Status-aware hero: requested, prescribed, or cancelled.
  - The `<dl>` rows stack label-over-value on mobile (right-aligned
    values with wrapping ailment tags get cramped at 375px today).
  - Manage/prescribe sections restyled.
- **Dashboards** (`appointments/index`, `therapists/appointments`,
  `supervisors/show`):
  - Consistent page header, "Upcoming"/"Past" section titles with a count
    badge, `.empty-state` boxes.
  - The agent row's inline reschedule form (`appointments/_row.ejs`)
    stacks on mobile. Today `flex items-center` can overflow at 375px.
- **Login / forbidden / all not-found pages / new global 404 + 500:**
  restyled as centred `.page-narrow` cards with a clear action back.

## What does not change

- No routes, no access-control logic, no schema/migrations, no seed data.
  The only `.ts` edits are the three small ones named above:
  `currentPath` in `src/auth.ts`, the 404/500 handlers in `src/app.ts`,
  and dropping the `boot_log` read in `src/routes/home.ts`.
- All copy stays the same except the home page, the new 404/500 pages, the
  cancelled-appointment header, and the empty-state lines.
- Every form keeps its field names, actions, and hidden inputs (`next`,
  `returnTo`), so all Phase 2–9 flows behave identically.

## Verification plan

1. `npm run dev` from the current DB (no migrate/seed needed). Every page
   returns the same status codes as before, curl'd as logged-out, agent
   (ava), therapist (ada), and supervisor (marge), reusing the Phase 9
   cookie-jar approach:
   - public lists/details: 200
   - dashboards: 200 for the owner, 403 for others, 302 to login when
     logged out
   - unknown ids: 404
2. New error states:
   - `/nope` returns 404 as HTML inside the layout, not JSON.
   - A forced 500 (temporarily throwing in a route, reverted afterwards)
     renders `error.ejs`.
3. Regression on every mutation flow: report an ailment, book (from both
   pages), prescribe/revise, cancel, reschedule, login with `next`, logout,
   and each 400 inline-error re-render (checking the `.alert-error` box
   renders). Test data is cleaned up afterwards, as in earlier phases.
4. Grep the built `public/css/output.css` for each component class, to
   confirm Tailwind v4 emitted them. Grep the views for leftover
   old-style button/card strings, to confirm the pass is complete.
5. **Responsive check** at 375 px (phone), 768 px (tablet), and 1280 px
   (desktop). Claude does this itself with headless Playwright screenshots
   (decided with the user):
   - A one-off `npx playwright` run, using a throwaway script outside
     `src/` (e.g. in a temp dir). It adds no `package.json` dependency and
     no committed file. It downloads a Chromium build, and WebKit (Safari's
     engine) too if the download works, to cover a second engine.
   - It logs in as each role through the real `/login` form, then
     screenshots every page at all three widths. That includes the mobile
     menu opened, one inline 400 error state, and the new 404 page.
   - Claude reviews every screenshot for overflow, horizontal scroll,
     cramped or wrapping rows, and inconsistent styling, fixes what it
     finds, and re-shoots.
   - The script also checks programmatically that
     `document.documentElement.scrollWidth <= innerWidth` on every page and
     width, so no page scrolls sideways.
   - Screenshots go to a temp dir, not the repo. `progress.md` records what
     was checked.
   - Firefox isn't covered by the headless run. Worth a quick manual look
     if Firefox matters to you.
6. `npm run lint` and `tsc --noEmit` clean.

## After implementation

- `specs/progress.md`:
  - Phase 10 done, with the commit hash (once you ask me to commit) and any
    deviations.
  - Phase 11 marked as covered by Phase 10's nav bar.
  - The "loading states: N/A" note.
  - The next phase is "none scheduled; roadmap complete" unless you add
    one.
- `specs/roadmap.md`: annotate Phase 11 as folded into Phase 10.
- No commit or push until you ask.
