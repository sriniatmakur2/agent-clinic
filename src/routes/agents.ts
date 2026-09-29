import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { agents, ailments, agentAilments } from "../db/schema.js";

function getAgentAilments(agentId: number) {
  return db
    .select({ id: ailments.id, name: ailments.name, description: ailments.description })
    .from(agentAilments)
    .innerJoin(ailments, eq(agentAilments.ailmentId, ailments.id))
    .where(eq(agentAilments.agentId, agentId))
    .all();
}

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
      agentAilments: getAgentAilments(id),
      allAilments: db.select().from(ailments).all(),
      error: null,
    });
  });

  app.post<{
    Params: { id: string };
    Body: { ailmentId?: string; newAilmentName?: string; newAilmentDescription?: string };
  }>("/agents/:id/ailments", async (request, reply) => {
    const id = Number(request.params.id);
    const agent = db.select().from(agents).where(eq(agents.id, id)).get();

    if (!agent) {
      return reply.code(404).view("agents/not-found.ejs", {
        title: "Agent not found — AgentClinic",
      });
    }

    const { ailmentId, newAilmentName, newAilmentDescription } = request.body ?? {};
    const trimmedName = newAilmentName?.trim();
    const trimmedDescription = newAilmentDescription?.trim();

    let resolvedAilmentId: number | undefined;

    if (ailmentId) {
      resolvedAilmentId = Number(ailmentId);
    } else if (trimmedName && trimmedDescription) {
      const inserted = db.insert(ailments).values({ name: trimmedName, description: trimmedDescription }).run();
      resolvedAilmentId = Number(inserted.lastInsertRowid);
    }

    if (!resolvedAilmentId) {
      return reply.code(400).view("agents/show.ejs", {
        title: `${agent.name} — AgentClinic`,
        agent,
        agentAilments: getAgentAilments(id),
        allAilments: db.select().from(ailments).all(),
        error: "Pick an ailment from the list, or describe a new one with both a name and a description.",
      });
    }

    db.insert(agentAilments)
      .values({ agentId: id, ailmentId: resolvedAilmentId, reportedAt: new Date().toISOString() })
      .run();

    return reply.redirect(`/agents/${id}`);
  });
}
