import type { FastifyInstance, FastifyReply } from "fastify";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { DEMO_PASSWORD, findUserByUsername, homePathFor, isSafePath, verifyPassword } from "../auth.js";

function renderLogin(
  reply: FastifyReply,
  options: { code?: number; error?: string; username?: string; next?: string } = {},
) {
  const allUsers = db.select({ username: users.username, role: users.role }).from(users).all();
  const usernamesFor = (role: string) => allUsers.filter((u) => u.role === role).map((u) => u.username);

  return reply.code(options.code ?? 200).view("login.ejs", {
    title: "Log in — AgentClinic",
    error: options.error ?? null,
    username: options.username ?? "",
    next: isSafePath(options.next) ? options.next : "",
    demoAccounts: [
      { label: "Agents", usernames: usernamesFor("agent") },
      { label: "Therapists", usernames: usernamesFor("therapist") },
      { label: "Supervisors", usernames: usernamesFor("supervisor") },
    ],
    demoPassword: DEMO_PASSWORD,
  });
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { next?: string } }>("/login", async (request, reply) => {
    if (request.currentUser) {
      return reply.redirect(request.currentUser.homePath);
    }
    return renderLogin(reply, { next: request.query.next });
  });

  app.post<{ Body: { username?: string; password?: string; next?: string } }>("/login", async (request, reply) => {
    const { username, password, next } = request.body ?? {};
    const trimmedUsername = username?.trim().toLowerCase() ?? "";
    const user = trimmedUsername ? findUserByUsername(trimmedUsername) : undefined;

    // Same message whether the username or the password was wrong.
    if (!user || !password || !(await verifyPassword(password, user.passwordHash))) {
      return renderLogin(reply, { code: 400, error: "Invalid username or password.", username, next });
    }

    await request.session.regenerate();
    request.session.userId = user.id;

    return reply.redirect(isSafePath(next) ? next : homePathFor(user));
  });

  app.post("/logout", async (request, reply) => {
    await request.session.destroy();
    return reply.redirect("/");
  });
}
