import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { bootLog } from "../db/schema.js";

export async function homeRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (_request, reply) => {
    const rows = db.select().from(bootLog).all();

    return reply.view("home.ejs", {
      title: "AgentClinic",
      bootCount: rows.length,
      bootedAt: rows.at(-1)?.bootedAt ?? "never",
    });
  });
}
