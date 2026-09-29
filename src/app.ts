import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyInstance } from "fastify";
import fastifyView from "@fastify/view";
import fastifyStatic from "@fastify/static";
import ejs from "ejs";
import { homeRoutes } from "./routes/home.js";

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

  app.register(homeRoutes);

  return app;
}
