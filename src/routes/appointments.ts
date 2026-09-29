import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { agentAilments, agents, appointments, therapists } from "../db/schema.js";

// Matches what <input type="datetime-local"> submits, e.g. "2026-10-01T14:30" (seconds optional).
const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

export function formatAppointmentTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
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

export async function appointmentRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>("/appointments/:id", async (request, reply) => {
    const id = Number(request.params.id);
    const appointment = db
      .select({
        id: appointments.id,
        requestedAt: appointments.requestedAt,
        status: appointments.status,
        agent: agents,
        therapist: therapists,
      })
      .from(appointments)
      .innerJoin(agents, eq(appointments.agentId, agents.id))
      .innerJoin(therapists, eq(appointments.therapistId, therapists.id))
      .where(eq(appointments.id, id))
      .get();

    if (!appointment) {
      return reply.code(404).view("appointments/not-found.ejs", {
        title: "Appointment not found — AgentClinic",
      });
    }

    return reply.view("appointments/show.ejs", {
      title: "Appointment requested — AgentClinic",
      appointment,
      requestedAtLabel: formatAppointmentTime(appointment.requestedAt),
    });
  });
}
