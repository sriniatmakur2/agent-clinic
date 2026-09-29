import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyInstance } from "fastify";
import fastifyView from "@fastify/view";
import fastifyStatic from "@fastify/static";
import fastifyFormbody from "@fastify/formbody";
import ejs from "ejs";
import { homeRoutes } from "./routes/home.js";
import { agentRoutes } from "./routes/agents.js";
import { therapyRoutes } from "./routes/therapies.js";
import { therapistRoutes } from "./routes/therapists.js";
import { appointmentRoutes } from "./routes/appointments.js";
import { supervisorRoutes } from "./routes/supervisors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });

  app.register(fastifyView, {
    engine: { ejs },
    root: path.join(__dirname, "views"),
    layout: "layout.ejs",
  });

  app.register(fastifyStatic, {
    root: path.join(__dirname, "..", "public"),
    prefix: "/public/",
  });

  app.register(fastifyFormbody);

  app.register(homeRoutes);
  app.register(agentRoutes);
  app.register(therapyRoutes);
  app.register(therapistRoutes);
  app.register(appointmentRoutes);
  app.register(supervisorRoutes);

  return app;
}
