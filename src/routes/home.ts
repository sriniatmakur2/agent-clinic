import type { FastifyInstance } from "fastify";

export async function homeRoutes(app: FastifyInstance): Promise<void> {
  // boot_log is still written on every boot (src/server.ts); the landing page just no longer shows it.
  app.get("/", async (_request, reply) => {
    return reply.view("home.ejs", {
      title: "AgentClinic",
    });
  });
}
