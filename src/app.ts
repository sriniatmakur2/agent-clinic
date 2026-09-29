import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyInstance } from "fastify";
import fastifyView from "@fastify/view";
import fastifyStatic from "@fastify/static";
import fastifyFormbody from "@fastify/formbody";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import ejs from "ejs";
import { homeRoutes } from "./routes/home.js";
import { agentRoutes } from "./routes/agents.js";
import { therapyRoutes } from "./routes/therapies.js";
import { therapistRoutes } from "./routes/therapists.js";
import { appointmentRoutes } from "./routes/appointments.js";
import { supervisorRoutes } from "./routes/supervisors.js";
import { authRoutes } from "./routes/auth.js";
import { loadCurrentUser } from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// @fastify/session requires a secret of at least 32 characters.
const SESSION_SECRET = process.env.SESSION_SECRET ?? "agentclinic-local-dev-session-secret-not-for-prod";

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

  // In-memory session store: sessions don't survive a restart (fine for a local demo).
  app.register(fastifyCookie);
  app.register(fastifySession, {
    secret: SESSION_SECRET,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: false },
  });

  app.decorateRequest("currentUser", null);
  app.addHook("preHandler", loadCurrentUser);

  app.register(authRoutes);

  app.register(homeRoutes);
  app.register(agentRoutes);
  app.register(therapyRoutes);
  app.register(therapistRoutes);
  app.register(appointmentRoutes);
  app.register(supervisorRoutes);

  // Unknown URLs and unhandled errors render inside the normal layout, not as JSON.
  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).view("not-found.ejs", { title: "Page not found · AgentClinic" });
  });

  app.setErrorHandler((error: { statusCode?: number }, request, reply) => {
    const code = error.statusCode && error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 500;
    if (code === 500) {
      request.log.error(error);
    }
    return reply.code(code).view("error.ejs", { title: "Something went wrong · AgentClinic", code });
  });

  return app;
}
