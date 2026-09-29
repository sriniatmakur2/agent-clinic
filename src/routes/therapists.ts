import type { FastifyInstance, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { agentAilments, agents, ailments, therapists, therapistSpecialties } from "../db/schema.js";
import { createAppointment } from "./appointments.js";

type Therapist = typeof therapists.$inferSelect;

// Only agents who have reported an ailment can book; those with an ailment
// this therapist specializes in are listed first.
function getBookableAgents(specialtyAilmentIds: number[]) {
  const allAgents = db.select().from(agents).all();
  const reported = db.select().from(agentAilments).all();

  const withMatch = allAgents
    .filter((agent) => reported.some((r) => r.agentId === agent.id))
    .map((agent) => ({
      ...agent,
      matchesSpecialties: reported.some(
        (r) => r.agentId === agent.id && specialtyAilmentIds.includes(r.ailmentId),
      ),
    }));

  return [...withMatch.filter((a) => a.matchesSpecialties), ...withMatch.filter((a) => !a.matchesSpecialties)];
}

function renderTherapistShow(
  reply: FastifyReply,
  therapist: Therapist,
  options: { code?: number; bookingError?: string; bookingForm?: { agentId?: string; requestedAt?: string } } = {},
) {
  const specialties = db
    .select({ id: ailments.id, name: ailments.name, description: ailments.description })
    .from(therapistSpecialties)
    .innerJoin(ailments, eq(therapistSpecialties.ailmentId, ailments.id))
    .where(eq(therapistSpecialties.therapistId, therapist.id))
    .all();

  return reply.code(options.code ?? 200).view("therapists/show.ejs", {
    title: `${therapist.name} — AgentClinic`,
    therapist,
    specialties,
    bookableAgents: getBookableAgents(specialties.map((s) => s.id)),
    bookingError: options.bookingError ?? null,
    bookingForm: options.bookingForm ?? {},
  });
}

export async function therapistRoutes(app: FastifyInstance): Promise<void> {
  app.get("/therapists", async (_request, reply) => {
    const allTherapists = db.select().from(therapists).all();
    const specialties = db
      .select({ therapistId: therapistSpecialties.therapistId, name: ailments.name })
      .from(therapistSpecialties)
      .innerJoin(ailments, eq(therapistSpecialties.ailmentId, ailments.id))
      .all();

    const therapistsWithSpecialties = allTherapists.map((therapist) => ({
      ...therapist,
      specialties: specialties.filter((s) => s.therapistId === therapist.id).map((s) => s.name),
    }));

    return reply.view("therapists/index.ejs", {
      title: "Therapists — AgentClinic",
      therapists: therapistsWithSpecialties,
    });
  });

  app.get<{ Params: { id: string } }>("/therapists/:id", async (request, reply) => {
    const id = Number(request.params.id);
    const therapist = db.select().from(therapists).where(eq(therapists.id, id)).get();

    if (!therapist) {
      return reply.code(404).view("therapists/not-found.ejs", {
        title: "Therapist not found — AgentClinic",
      });
    }

    return renderTherapistShow(reply, therapist);
  });

  app.post<{
    Params: { id: string };
    Body: { agentId?: string; requestedAt?: string };
  }>("/therapists/:id/appointments", async (request, reply) => {
    const id = Number(request.params.id);
    const therapist = db.select().from(therapists).where(eq(therapists.id, id)).get();

    if (!therapist) {
      return reply.code(404).view("therapists/not-found.ejs", {
        title: "Therapist not found — AgentClinic",
      });
    }

    const { agentId, requestedAt } = request.body ?? {};
    const result = createAppointment({ agentId: Number(agentId), therapistId: id, requestedAt });

    if ("error" in result) {
      return renderTherapistShow(reply, therapist, {
        code: 400,
        bookingError: result.error,
        bookingForm: { agentId, requestedAt },
      });
    }

    return reply.redirect(`/appointments/${result.id}`);
  });
}
