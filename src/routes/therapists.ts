import type { FastifyInstance, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  agentAilments,
  agents,
  ailments,
  appointments,
  therapies,
  therapists,
  therapistSpecialties,
} from "../db/schema.js";
import { createAppointment, formatAppointmentTime, getAilmentsByAgent } from "./appointments.js";
import { type CurrentUser, forbid, isTherapist, requireLogin } from "../auth.js";

type Therapist = typeof therapists.$inferSelect;

// Booking is for a logged-in agent, for themselves: the form has no agent
// dropdown and only shows once the agent has reported an ailment.
function renderTherapistShow(
  reply: FastifyReply,
  therapist: Therapist,
  viewer: CurrentUser | null,
  options: { code?: number; bookingError?: string; bookingForm?: { requestedAt?: string } } = {},
) {
  const specialties = db
    .select({ id: ailments.id, name: ailments.name, description: ailments.description })
    .from(therapistSpecialties)
    .innerJoin(ailments, eq(therapistSpecialties.ailmentId, ailments.id))
    .where(eq(therapistSpecialties.therapistId, therapist.id))
    .all();

  const viewerAgentId = viewer?.role === "agent" ? viewer.agentId : null;
  const viewerHasAilment =
    viewerAgentId !== null &&
    db.select().from(agentAilments).where(eq(agentAilments.agentId, viewerAgentId)).get() !== undefined;

  return reply.code(options.code ?? 200).view("therapists/show.ejs", {
    title: `${therapist.name} — AgentClinic`,
    therapist,
    specialties,
    isSelf: isTherapist(viewer, therapist.id),
    viewerAgentId,
    viewerHasAilment,
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

    return renderTherapistShow(reply, therapist, request.currentUser);
  });

  // The therapist's dashboard: their appointments split into upcoming and past,
  // with each agent's reported ailments for context.
  app.get<{ Params: { id: string } }>("/therapists/:id/appointments", async (request, reply) => {
    const user = requireLogin(request, reply);
    if (!user) {
      return reply;
    }

    const id = Number(request.params.id);
    const therapist = db.select().from(therapists).where(eq(therapists.id, id)).get();

    if (!therapist) {
      return reply.code(404).view("therapists/not-found.ejs", {
        title: "Therapist not found — AgentClinic",
      });
    }
    if (!isTherapist(user, therapist.id)) {
      return forbid(reply);
    }

    const specialtyIds = db
      .select({ ailmentId: therapistSpecialties.ailmentId })
      .from(therapistSpecialties)
      .where(eq(therapistSpecialties.therapistId, therapist.id))
      .all()
      .map((s) => s.ailmentId);

    const rows = db
      .select({
        id: appointments.id,
        requestedAt: appointments.requestedAt,
        status: appointments.status,
        agent: agents,
        therapy: therapies,
      })
      .from(appointments)
      .innerJoin(agents, eq(appointments.agentId, agents.id))
      .leftJoin(therapies, eq(appointments.therapyId, therapies.id))
      .where(eq(appointments.therapistId, therapist.id))
      .all();

    const ailmentsByAgent = getAilmentsByAgent([...new Set(rows.map((r) => r.agent.id))]);
    const withContext = rows.map((row) => ({
      ...row,
      requestedAtLabel: formatAppointmentTime(row.requestedAt),
      ailments: (ailmentsByAgent.get(row.agent.id) ?? []).map((ailment) => ({
        ...ailment,
        isSpecialty: specialtyIds.includes(ailment.id),
      })),
    }));

    const now = Date.now();
    const time = (row: { requestedAt: string }) => new Date(row.requestedAt).getTime();
    const upcoming = withContext.filter((r) => time(r) > now).sort((a, b) => time(a) - time(b));
    const past = withContext.filter((r) => time(r) <= now).sort((a, b) => time(b) - time(a));

    return reply.view("therapists/appointments.ejs", {
      title: `${therapist.name}'s appointments — AgentClinic`,
      therapist,
      upcoming,
      past,
    });
  });

  // Any agent can book with any therapist — always for themselves; the agent
  // comes from the session, never from the form.
  app.post<{
    Params: { id: string };
    Body: { requestedAt?: string };
  }>("/therapists/:id/appointments", async (request, reply) => {
    const user = requireLogin(request, reply);
    if (!user) {
      return reply;
    }

    const id = Number(request.params.id);
    const therapist = db.select().from(therapists).where(eq(therapists.id, id)).get();

    if (!therapist) {
      return reply.code(404).view("therapists/not-found.ejs", {
        title: "Therapist not found — AgentClinic",
      });
    }
    if (user.role !== "agent" || user.agentId === null) {
      return forbid(reply);
    }

    const { requestedAt } = request.body ?? {};
    const result = createAppointment({ agentId: user.agentId, therapistId: id, requestedAt });

    if ("error" in result) {
      return renderTherapistShow(reply, therapist, user, {
        code: 400,
        bookingError: result.error,
        bookingForm: { requestedAt },
      });
    }

    return reply.redirect(`/appointments/${result.id}`);
  });
}
