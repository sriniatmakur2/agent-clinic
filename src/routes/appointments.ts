import type { FastifyInstance, FastifyReply } from "fastify";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { agentAilments, agents, ailments, appointments, therapies, therapists } from "../db/schema.js";
import {
  type CurrentUser,
  forbid,
  isAgent,
  isSafePath,
  isSupervisorOf,
  isTherapist,
  requireLogin,
} from "../auth.js";

// Matches what <input type="datetime-local"> submits, e.g. "2026-10-01T14:30" (seconds optional).
const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

export function formatAppointmentTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
}

// The distinct ailments each agent has reported, keyed by agent id. Used to give
// the therapist context on the dashboard and the appointment page.
export function getAilmentsByAgent(agentIds: number[]): Map<number, { id: number; name: string }[]> {
  const byAgent = new Map<number, { id: number; name: string }[]>();
  if (agentIds.length === 0) {
    return byAgent;
  }

  const rows = db
    .select({ agentId: agentAilments.agentId, id: ailments.id, name: ailments.name })
    .from(agentAilments)
    .innerJoin(ailments, eq(agentAilments.ailmentId, ailments.id))
    .where(inArray(agentAilments.agentId, agentIds))
    .all();

  for (const { agentId, id, name } of rows) {
    const list = byAgent.get(agentId) ?? [];
    // An agent can report the same ailment more than once; show it once.
    if (!list.some((a) => a.id === id)) {
      list.push({ id, name });
    }
    byAgent.set(agentId, list);
  }
  return byAgent;
}

// Shared by the agent-page and therapist-page booking forms. Returns the new
// appointment's id, or an error message to show inline on the originating page.
export function createAppointment(input: {
  agentId: number;
  therapistId: number;
  requestedAt: string | undefined;
}): { id: number } | { error: string } {
  const agent = db.select().from(agents).where(eq(agents.id, input.agentId)).get();
  if (!agent) {
    return { error: "Pick an agent to book for." };
  }

  const therapist = db.select().from(therapists).where(eq(therapists.id, input.therapistId)).get();
  if (!therapist) {
    return { error: "Pick a therapist to book with." };
  }

  const hasAilment = db.select().from(agentAilments).where(eq(agentAilments.agentId, agent.id)).get();
  if (!hasAilment) {
    return { error: `${agent.name} needs to report an ailment before booking an appointment.` };
  }

  const rawTime = input.requestedAt?.trim() ?? "";
  // No offset in the input, so Date parses it as server-local time.
  const requestedAt = DATETIME_LOCAL.test(rawTime) ? new Date(rawTime) : null;
  if (!requestedAt || Number.isNaN(requestedAt.getTime())) {
    return { error: "Pick a valid date and time for the appointment." };
  }
  if (requestedAt.getTime() <= Date.now()) {
    return { error: "Pick a time in the future for the appointment." };
  }

  const inserted = db
    .insert(appointments)
    .values({
      agentId: agent.id,
      therapistId: therapist.id,
      requestedAt: requestedAt.toISOString(),
      createdAt: new Date().toISOString(),
    })
    .run();

  return { id: Number(inserted.lastInsertRowid) };
}

// Eligible for cancel/reschedule: not yet prescribed, and the requested time
// hasn't passed yet. Once prescribed or past, the appointment is locked.
export function canCancelOrReschedule(appointment: { status: string; requestedAt: string }): boolean {
  return appointment.status === "requested" && new Date(appointment.requestedAt).getTime() > Date.now();
}

// Pre-fills the reschedule <input type="datetime-local">, which has no offset
// and expects local time — mirrors how createAppointment parses that input.
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function findAppointment(id: number) {
  return db
    .select({
      id: appointments.id,
      requestedAt: appointments.requestedAt,
      status: appointments.status,
      notes: appointments.notes,
      agent: agents,
      therapist: therapists,
      therapy: therapies,
    })
    .from(appointments)
    .innerJoin(agents, eq(appointments.agentId, agents.id))
    .innerJoin(therapists, eq(appointments.therapistId, therapists.id))
    .leftJoin(therapies, eq(appointments.therapyId, therapies.id))
    .where(eq(appointments.id, id))
    .get();
}

type Appointment = NonNullable<ReturnType<typeof findAppointment>>;

// The appointment's agent, its therapist, and the agent's supervisor can view it.
function canView(user: CurrentUser, appointment: Appointment): boolean {
  return (
    isAgent(user, appointment.agent.id) ||
    isTherapist(user, appointment.therapist.id) ||
    isSupervisorOf(user, appointment.agent)
  );
}

const BACK_LABELS: Record<CurrentUser["role"], string> = {
  agent: "Back to my appointments",
  therapist: "Back to my appointments",
  supervisor: "Back to my team",
};

// Renders the appointment page from GET and from the prescription form's 400.
// The form is pre-filled with the current prescription so it doubles as "revise".
// Which controls show depends on the viewer: manage (cancel/reschedule) for the
// appointment's agent, prescribe for its therapist, neither for a supervisor.
function renderAppointmentShow(
  reply: FastifyReply,
  appointment: Appointment,
  viewer: CurrentUser,
  options: {
    code?: number;
    prescriptionError?: string;
    prescriptionForm?: { therapyId?: string; notes?: string };
    actionError?: string;
    rescheduleValue?: string;
  } = {},
) {
  const isPrescribed = appointment.status === "prescribed";

  return reply.code(options.code ?? 200).view("appointments/show.ejs", {
    title: `${isPrescribed ? "Therapy prescribed" : "Appointment requested"} — AgentClinic`,
    appointment,
    isPrescribed,
    backLink: { href: viewer.homePath, label: BACK_LABELS[viewer.role] },
    showManage: isAgent(viewer, appointment.agent.id),
    showPrescribe: isTherapist(viewer, appointment.therapist.id),
    canManage: canCancelOrReschedule(appointment),
    requestedAtLabel: formatAppointmentTime(appointment.requestedAt),
    agentAilments: getAilmentsByAgent([appointment.agent.id]).get(appointment.agent.id) ?? [],
    allTherapies: db.select().from(therapies).all(),
    prescriptionError: options.prescriptionError ?? null,
    prescriptionForm: options.prescriptionForm ?? {
      therapyId: appointment.therapy ? String(appointment.therapy.id) : "",
      notes: appointment.notes ?? "",
    },
    actionError: options.actionError ?? null,
    rescheduleValue: options.rescheduleValue ?? toDatetimeLocalValue(appointment.requestedAt),
  });
}

function renderNotFound(reply: FastifyReply) {
  return reply.code(404).view("appointments/not-found.ejs", {
    title: "Appointment not found — AgentClinic",
  });
}

// The agent's-eye view of one agent's appointments (the "my appointments" list).
// Also reused by the supervisor dashboard (read-only there).
export function buildAgentAppointmentRows(agentId: number) {
  const rows = db
    .select({
      id: appointments.id,
      requestedAt: appointments.requestedAt,
      status: appointments.status,
      therapist: therapists,
      therapy: therapies,
    })
    .from(appointments)
    .innerJoin(therapists, eq(appointments.therapistId, therapists.id))
    .leftJoin(therapies, eq(appointments.therapyId, therapies.id))
    .where(eq(appointments.agentId, agentId))
    .all();

  const withContext = rows.map((row) => ({
    ...row,
    requestedAtLabel: formatAppointmentTime(row.requestedAt),
    rescheduleValue: toDatetimeLocalValue(row.requestedAt),
    canManage: canCancelOrReschedule(row),
  }));

  const now = Date.now();
  const time = (row: { requestedAt: string }) => new Date(row.requestedAt).getTime();
  const upcoming = withContext.filter((r) => time(r) > now).sort((a, b) => time(a) - time(b));
  const past = withContext.filter((r) => time(r) <= now).sort((a, b) => time(b) - time(a));
  return { upcoming, past };
}

type AgentRow = typeof agents.$inferSelect;

// Renders the logged-in agent's own appointment list. Reused by GET /appointments
// and by the cancel/reschedule POSTs' 400 re-render when the form was submitted
// from the list page.
function renderAppointmentsIndex(
  reply: FastifyReply,
  agent: AgentRow,
  options: {
    code?: number;
    rowError?: { appointmentId: number; message: string };
    rescheduleForm?: { appointmentId: number; requestedAt?: string };
  } = {},
) {
  const { upcoming, past } = buildAgentAppointmentRows(agent.id);

  return reply.code(options.code ?? 200).view("appointments/index.ejs", {
    title: "My appointments — AgentClinic",
    agent,
    upcoming,
    past,
    rowError: options.rowError ?? null,
    rescheduleForm: options.rescheduleForm ?? null,
  });
}

// Re-renders whichever page the cancel/reschedule form was submitted from
// (the appointment page or the list page) with a 400 and an inline error.
function renderActionError(
  reply: FastifyReply,
  appointment: Appointment,
  viewer: CurrentUser,
  returnTo: string,
  message: string,
  rescheduleValue?: string,
) {
  if (returnTo === "/appointments") {
    return renderAppointmentsIndex(reply, appointment.agent, {
      code: 400,
      rowError: { appointmentId: appointment.id, message },
      rescheduleForm:
        rescheduleValue === undefined ? undefined : { appointmentId: appointment.id, requestedAt: rescheduleValue },
    });
  }
  return renderAppointmentShow(reply, appointment, viewer, { code: 400, actionError: message, rescheduleValue });
}

// Where a cancel/reschedule redirects afterwards: the submitted same-site
// returnTo, else the appointment page.
function resolveReturnTo(returnTo: string | undefined, appointment: Appointment): string {
  return isSafePath(returnTo) ? returnTo : `/appointments/${appointment.id}`;
}

export async function appointmentRoutes(app: FastifyInstance): Promise<void> {
  // The logged-in agent's "my appointments" list. Agents only.
  app.get("/appointments", async (request, reply) => {
    const user = requireLogin(request, reply);
    if (!user) {
      return reply;
    }

    const agent =
      user.role === "agent" && user.agentId !== null
        ? db.select().from(agents).where(eq(agents.id, user.agentId)).get()
        : undefined;
    if (!agent) {
      return forbid(reply);
    }

    return renderAppointmentsIndex(reply, agent);
  });

  app.get<{ Params: { id: string } }>("/appointments/:id", async (request, reply) => {
    const user = requireLogin(request, reply);
    if (!user) {
      return reply;
    }

    const appointment = findAppointment(Number(request.params.id));
    if (!appointment) {
      return renderNotFound(reply);
    }
    if (!canView(user, appointment)) {
      return forbid(reply);
    }

    return renderAppointmentShow(reply, appointment, user);
  });

  // The therapist prescribes (or revises) a therapy and session notes. Allowed
  // on upcoming and past appointments alike.
  app.post<{
    Params: { id: string };
    Body: { therapyId?: string; notes?: string };
  }>("/appointments/:id/prescription", async (request, reply) => {
    const user = requireLogin(request, reply);
    if (!user) {
      return reply;
    }

    const appointment = findAppointment(Number(request.params.id));
    if (!appointment) {
      return renderNotFound(reply);
    }
    if (!isTherapist(user, appointment.therapist.id)) {
      return forbid(reply);
    }

    const { therapyId, notes } = request.body ?? {};
    const therapy = db
      .select()
      .from(therapies)
      .where(eq(therapies.id, Number(therapyId)))
      .get();

    if (!therapy) {
      return renderAppointmentShow(reply, appointment, user, {
        code: 400,
        prescriptionError: "Pick a therapy to prescribe.",
        prescriptionForm: { therapyId, notes },
      });
    }

    db.update(appointments)
      .set({
        therapyId: therapy.id,
        notes: notes?.trim() || null,
        status: "prescribed",
        prescribedAt: new Date().toISOString(),
      })
      .where(eq(appointments.id, appointment.id))
      .run();

    return reply.redirect(`/appointments/${appointment.id}`);
  });

  // The agent cancels a not-yet-prescribed, still-upcoming appointment.
  app.post<{
    Params: { id: string };
    Body: { returnTo?: string };
  }>("/appointments/:id/cancel", async (request, reply) => {
    const user = requireLogin(request, reply);
    if (!user) {
      return reply;
    }

    const appointment = findAppointment(Number(request.params.id));
    if (!appointment) {
      return renderNotFound(reply);
    }
    if (!isAgent(user, appointment.agent.id)) {
      return forbid(reply);
    }

    const returnTo = resolveReturnTo(request.body?.returnTo, appointment);

    if (!canCancelOrReschedule(appointment)) {
      return renderActionError(reply, appointment, user, returnTo, "This appointment can no longer be changed.");
    }

    db.update(appointments).set({ status: "cancelled" }).where(eq(appointments.id, appointment.id)).run();

    return reply.redirect(returnTo);
  });

  // The agent reschedules a not-yet-prescribed, still-upcoming appointment to
  // a new future time. Same validation as the original booking.
  app.post<{
    Params: { id: string };
    Body: { requestedAt?: string; returnTo?: string };
  }>("/appointments/:id/reschedule", async (request, reply) => {
    const user = requireLogin(request, reply);
    if (!user) {
      return reply;
    }

    const appointment = findAppointment(Number(request.params.id));
    if (!appointment) {
      return renderNotFound(reply);
    }
    if (!isAgent(user, appointment.agent.id)) {
      return forbid(reply);
    }

    const { requestedAt, returnTo: returnToInput } = request.body ?? {};
    const returnTo = resolveReturnTo(returnToInput, appointment);

    if (!canCancelOrReschedule(appointment)) {
      return renderActionError(reply, appointment, user, returnTo, "This appointment can no longer be changed.");
    }

    const rawTime = requestedAt?.trim() ?? "";
    const newRequestedAt = DATETIME_LOCAL.test(rawTime) ? new Date(rawTime) : null;
    if (!newRequestedAt || Number.isNaN(newRequestedAt.getTime())) {
      return renderActionError(
        reply,
        appointment,
        user,
        returnTo,
        "Pick a valid date and time for the appointment.",
        requestedAt,
      );
    }
    if (newRequestedAt.getTime() <= Date.now()) {
      return renderActionError(
        reply,
        appointment,
        user,
        returnTo,
        "Pick a time in the future for the appointment.",
        requestedAt,
      );
    }

    db.update(appointments)
      .set({ requestedAt: newRequestedAt.toISOString() })
      .where(eq(appointments.id, appointment.id))
      .run();

    return reply.redirect(returnTo);
  });
}
