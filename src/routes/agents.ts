import type { FastifyInstance, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { agents, ailments, agentAilments, therapists, therapistSpecialties } from "../db/schema.js";
import { createAppointment } from "./appointments.js";
import { type CurrentUser, forbid, isAgent, requireLogin } from "../auth.js";

type Agent = typeof agents.$inferSelect;

function getAgentAilments(agentId: number) {
  return db
    .select({ id: ailments.id, name: ailments.name, description: ailments.description })
    .from(agentAilments)
    .innerJoin(ailments, eq(agentAilments.ailmentId, ailments.id))
    .where(eq(agentAilments.agentId, agentId))
    .all();
}

// All therapists, with those who specialize in one of the agent's ailments listed first.
function getBookableTherapists(agentAilmentIds: number[]) {
  const allTherapists = db.select().from(therapists).all();
  const specialties = db.select().from(therapistSpecialties).all();

  const withMatch = allTherapists.map((therapist) => ({
    ...therapist,
    matchesAilments: specialties.some(
      (s) => s.therapistId === therapist.id && agentAilmentIds.includes(s.ailmentId),
    ),
  }));

  return [...withMatch.filter((t) => t.matchesAilments), ...withMatch.filter((t) => !t.matchesAilments)];
}

// The report-ailment and booking forms only render on your own agent page.
function renderAgentShow(
  reply: FastifyReply,
  agent: Agent,
  viewer: CurrentUser | null,
  options: {
    code?: number;
    ailmentError?: string;
    bookingError?: string;
    bookingForm?: { therapistId?: string; requestedAt?: string };
  } = {},
) {
  const reported = getAgentAilments(agent.id);
  const isSelf = isAgent(viewer, agent.id);

  return reply.code(options.code ?? 200).view("agents/show.ejs", {
    title: `${agent.name} · AgentClinic`,
    agent,
    isSelf,
    agentAilments: reported,
    allAilments: isSelf ? db.select().from(ailments).all() : [],
    error: options.ailmentError ?? null,
    bookableTherapists: isSelf ? getBookableTherapists(reported.map((a) => a.id)) : [],
    bookingError: options.bookingError ?? null,
    bookingForm: options.bookingForm ?? {},
  });
}

export async function agentRoutes(app: FastifyInstance): Promise<void> {
  app.get("/agents", async (_request, reply) => {
    const allAgents = db.select().from(agents).all();

    return reply.view("agents/index.ejs", {
      title: "Agents · AgentClinic",
      agents: allAgents,
    });
  });

  app.get<{ Params: { id: string } }>("/agents/:id", async (request, reply) => {
    const id = Number(request.params.id);
    const agent = db.select().from(agents).where(eq(agents.id, id)).get();

    if (!agent) {
      return reply.code(404).view("agents/not-found.ejs", {
        title: "Agent not found · AgentClinic",
      });
    }

    return renderAgentShow(reply, agent, request.currentUser);
  });

  app.post<{
    Params: { id: string };
    Body: { ailmentId?: string; newAilmentName?: string; newAilmentDescription?: string };
  }>("/agents/:id/ailments", async (request, reply) => {
    const user = requireLogin(request, reply);
    if (!user) {
      return reply;
    }

    const id = Number(request.params.id);
    const agent = db.select().from(agents).where(eq(agents.id, id)).get();

    if (!agent) {
      return reply.code(404).view("agents/not-found.ejs", {
        title: "Agent not found · AgentClinic",
      });
    }
    if (!isAgent(user, agent.id)) {
      return forbid(reply);
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
      return renderAgentShow(reply, agent, user, {
        code: 400,
        ailmentError: "Pick an ailment from the list, or describe a new one with both a name and a description.",
      });
    }

    db.insert(agentAilments)
      .values({ agentId: id, ailmentId: resolvedAilmentId, reportedAt: new Date().toISOString() })
      .run();

    return reply.redirect(`/agents/${id}`);
  });

  app.post<{
    Params: { id: string };
    Body: { therapistId?: string; requestedAt?: string };
  }>("/agents/:id/appointments", async (request, reply) => {
    const user = requireLogin(request, reply);
    if (!user) {
      return reply;
    }

    const id = Number(request.params.id);
    const agent = db.select().from(agents).where(eq(agents.id, id)).get();

    if (!agent) {
      return reply.code(404).view("agents/not-found.ejs", {
        title: "Agent not found · AgentClinic",
      });
    }
    if (!isAgent(user, agent.id)) {
      return forbid(reply);
    }

    const { therapistId, requestedAt } = request.body ?? {};
    const result = createAppointment({ agentId: id, therapistId: Number(therapistId), requestedAt });

    if ("error" in result) {
      return renderAgentShow(reply, agent, user, {
        code: 400,
        bookingError: result.error,
        bookingForm: { therapistId, requestedAt },
      });
    }

    return reply.redirect(`/appointments/${result.id}`);
  });
}
