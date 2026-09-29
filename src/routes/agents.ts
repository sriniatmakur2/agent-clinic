import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { agents } from "../db/schema.js";

export async function agentRoutes(app: FastifyInstance): Promise<void> {
  app.get("/agents", async (_request, reply) => {
    const allAgents = db.select().from(agents).all();

    return reply.view("agents/index.ejs", {
      title: "Agents — AgentClinic",
      agents: allAgents,
    });
  });

  app.get<{ Params: { id: string } }>("/agents/:id", async (request, reply) => {
    const id = Number(request.params.id);
    const agent = db.select().from(agents).where(eq(agents.id, id)).get();

    if (!agent) {
      return reply.code(404).view("agents/not-found.ejs", {
        title: "Agent not found — AgentClinic",
      });
    }

    return reply.view("agents/show.ejs", {
      title: `${agent.name} — AgentClinic`,
      agent,
    });
  });
}
