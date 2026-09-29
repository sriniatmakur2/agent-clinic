import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { therapies } from "../db/schema.js";

export async function therapyRoutes(app: FastifyInstance): Promise<void> {
  app.get("/therapies", async (_request, reply) => {
    const allTherapies = db.select().from(therapies).all();

    return reply.view("therapies/index.ejs", {
      title: "Therapies · AgentClinic",
      therapies: allTherapies,
    });
  });

  app.get<{ Params: { id: string } }>("/therapies/:id", async (request, reply) => {
    const id = Number(request.params.id);
    const therapy = db.select().from(therapies).where(eq(therapies.id, id)).get();

    if (!therapy) {
      return reply.code(404).view("therapies/not-found.ejs", {
        title: "Therapy not found · AgentClinic",
      });
    }

    return reply.view("therapies/show.ejs", {
      title: `${therapy.name} · AgentClinic`,
      therapy,
    });
  });
}
