import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { agents, supervisors } from "../db/schema.js";
import { buildAgentAppointmentRows, getAilmentsByAgent } from "./appointments.js";

export async function supervisorRoutes(app: FastifyInstance): Promise<void> {
  // The supervisor picker: no standalone browse/detail pages, just a list of
  // links straight into each supervisor's dashboard.
  app.get("/supervisors", async (_request, reply) => {
    const allSupervisors = db.select().from(supervisors).all();
    const allAgents = db.select().from(agents).all();

    const withCounts = allSupervisors.map((supervisor) => ({
      ...supervisor,
      agentCount: allAgents.filter((a) => a.supervisorId === supervisor.id).length,
    }));

    return reply.view("supervisors/index.ejs", {
      title: "Supervisors — AgentClinic",
      supervisors: withCounts,
    });
  });

  // The dashboard: each supervised agent's ailments and full appointment
  // history (read-only — the manage controls are agent-side actions).
  app.get<{ Params: { id: string } }>("/supervisors/:id", async (request, reply) => {
    const id = Number(request.params.id);
    const supervisor = db.select().from(supervisors).where(eq(supervisors.id, id)).get();

    if (!supervisor) {
      return reply.code(404).view("supervisors/not-found.ejs", {
        title: "Supervisor not found — AgentClinic",
      });
    }

    const supervisedAgents = db.select().from(agents).where(eq(agents.supervisorId, supervisor.id)).all();
    const ailmentsByAgent = getAilmentsByAgent(supervisedAgents.map((a) => a.id));

    const agentSections = supervisedAgents.map((agent) => {
      const { upcoming, past } = buildAgentAppointmentRows(agent.id);
      // Read-only on this dashboard: hide the agent-side cancel/reschedule controls.
      const readOnly = (rows: typeof upcoming) => rows.map((row) => ({ ...row, canManage: false }));

      return {
        agent,
        ailments: ailmentsByAgent.get(agent.id) ?? [],
        upcoming: readOnly(upcoming),
        past: readOnly(past),
      };
    });

    return reply.view("supervisors/show.ejs", {
      title: `${supervisor.name}'s team — AgentClinic`,
      supervisor,
      agentSections,
    });
  });
}
