import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { ailments, therapists, therapistSpecialties } from "../db/schema.js";

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

    const specialties = db
      .select({ id: ailments.id, name: ailments.name, description: ailments.description })
      .from(therapistSpecialties)
      .innerJoin(ailments, eq(therapistSpecialties.ailmentId, ailments.id))
      .where(eq(therapistSpecialties.therapistId, id))
      .all();

    return reply.view("therapists/show.ejs", {
      title: `${therapist.name} — AgentClinic`,
      therapist,
      specialties,
    });
  });
}
