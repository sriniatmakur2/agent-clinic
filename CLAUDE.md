# AgentClinic — Instructions for Claude Code

This repo is built one roadmap phase at a time, each in its own conversation.
Read this file first, every time — it's what lets a brand-new conversation,
with no memory of prior ones, pick up correctly.

## Before starting a phase

1. Read `specs/mission.md`, `specs/tech-stack.md`, `specs/roadmap.md`, and
   `specs/progress.md` (current status, what's done, and any deviations
   from the specs made along the way).
2. `specs/progress.md` says which phase is next and what's already true
   about the codebase — trust it over assumptions, and verify anything
   load-bearing (a named file, table, or script) still exists before
   relying on it.
3. Propose an implementation plan for that phase's slice only (see
   `specs/roadmap.md` for the phase's scope). Ask clarifying questions
   (`AskUserQuestion`) for anything the specs leave ambiguous.
4. Do not write code until the user has explicitly approved the plan and
   asked you to proceed — this holds even once the plan looks locked in.

## While implementing

- Build only what that phase's roadmap entry lists. No premature
  infrastructure, no scope creep into later phases.
- Boot the app and exercise the feature for real (curl / browser / db
  inspection) before calling the phase done — don't rely on type-checking
  alone.

## After finishing a phase

1. Update `specs/progress.md`: mark the phase done, note the commit hash,
   record any decisions or deviations from the specs (e.g. a library
   major-version difference that changed the setup), and name the next
   phase.
2. Never commit or push without the user explicitly asking for it.
3. Leave the working tree in a state where a fresh conversation could
   start the next phase cold, using only this file + `specs/`.
