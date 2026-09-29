import type { FastifyInstance, FastifyReply } from "fastify";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { agentAilments, agents, ailments, appointments, therapies, therapists } from "../db/schema.js";

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

// Renders the appointment page from GET and from the prescription form's 400.
// The form is pre-filled with the current prescription so it doubles as "revise".
function renderAppointmentShow(
  reply: FastifyReply,
  appointment: Appointment,
  options: { code?: number; prescriptionError?: string; prescriptionForm?: { therapyId?: string; notes?: string } } = {},
) {
  const isPrescribed = appointment.status === "prescribed";

  return reply.code(options.code ?? 200).view("appointments/show.ejs", {
    title: `${isPrescribed ? "Therapy prescribed" : "Appointment requested"} — AgentClinic`,
    appointment,
    isPrescribed,
    requestedAtLabel: formatAppointmentTime(appointment.requestedAt),
    agentAilments: getAilmentsByAgent([appointment.agent.id]).get(appointment.agent.id) ?? [],
    allTherapies: db.select().from(therapies).all(),
    prescriptionError: options.prescriptionError ?? null,
    prescriptionForm: options.prescriptionForm ?? {
      therapyId: appointment.therapy ? String(appointment.therapy.id) : "",
      notes: appointment.notes ?? "",
    },
  });
}

function renderNotFound(reply: FastifyReply) {
  return reply.code(404).view("appointments/not-found.ejs", {
    title: "Appointment not found — AgentClinic",
  });
}

export async function appointmentRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>("/appointments/:id", async (request, reply) => {
    const appointment = findAppointment(Number(request.params.id));
    if (!appointment) {
      return renderNotFound(reply);
    }

    return renderAppointmentShow(reply, appointment);
  });

  // The therapist prescribes (or revises) a therapy and session notes. Allowed
  // on upcoming and past appointments alike.
  app.post<{
    Params: { id: string };
    Body: { therapyId?: string; notes?: string };
  }>("/appointments/:id/prescription", async (request, reply) => {
    const appointment = findAppointment(Number(request.params.id));
    if (!appointment) {
      return renderNotFound(reply);
    }

    const { therapyId, notes } = request.body ?? {};
    const therapy = db
      .select()
      .from(therapies)
      .where(eq(therapies.id, Number(therapyId)))
      .get();

    if (!therapy) {
      return renderAppointmentShow(reply, appointment, {
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
}
