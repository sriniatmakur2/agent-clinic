import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { agents, supervisors } from "../db/schema.js";
import { buildAgentAppointmentRows, getAilmentsByAgent } from "./appointments.js";
import { forbid, requireLogin } from "../auth.js";

export async function supervisorRoutes(app: FastifyInstance): Promise<void> {
  // No picker any more: a supervisor goes straight to their own dashboard.
  app.get("/supervisors", async (request, reply) => {
    const user = requireLogin(request, reply);
    if (!user) {
      return reply;
    }
    if (user.role !== "supervisor") {
      return forbid(reply);
    }

    return reply.redirect(user.homePath);
  });

  // The dashboard: each supervised agent's ailments and full appointment
  // history (read-only — the manage controls are agent-side actions).
  app.get<{ Params: { id: string } }>("/supervisors/:id", async (request, reply) => {
    const user = requireLogin(request, reply);
    if (!user) {
      return reply;
    }

    const id = Number(request.params.id);
    const supervisor = db.select().from(supervisors).where(eq(supervisors.id, id)).get();

    if (!supervisor) {
      return reply.code(404).view("supervisors/not-found.ejs", {
        title: "Supervisor not found · AgentClinic",
      });
    }
    if (user.role !== "supervisor" || user.supervisorId !== supervisor.id) {
      return forbid(reply);
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
      title: `${supervisor.name}'s team · AgentClinic`,
      supervisor,
      agentSections,
    });
  });
}
