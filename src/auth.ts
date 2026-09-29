import { randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "./db/client.js";
import { agents, supervisors, therapists, users } from "./db/schema.js";

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;
const KEY_LENGTH = 64;

// Every seeded account shares this password; the login page shows it as a demo hint.
export const DEMO_PASSWORD = "clinic";

export type Role = "agent" | "therapist" | "supervisor";

export type CurrentUser = {
  id: number;
  username: string;
  role: Role;
  agentId: number | null;
  therapistId: number | null;
  supervisorId: number | null;
  // The linked agent/therapist/supervisor's name, for the top bar.
  displayName: string;
  // Where "my dashboard" lives for this role; also the post-login redirect.
  homePath: string;
};

declare module "fastify" {
  interface Session {
    userId?: number;
  }

  interface FastifyRequest {
    currentUser: CurrentUser | null;
  }

  interface FastifyReply {
    // Set by @fastify/view and merged into every view's data (layout included).
    locals: Record<string, unknown>;
  }
}

// Stored as "salt:hash", both hex. Sync is fine: only the seed script hashes.
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) {
    return false;
  }
  const expected = Buffer.from(hash, "hex");
  const actual = await scryptAsync(password, salt, KEY_LENGTH);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function homePathFor(user: typeof users.$inferSelect): string {
  if (user.role === "therapist") {
    return `/therapists/${user.therapistId}/appointments`;
  }
  if (user.role === "supervisor") {
    return `/supervisors/${user.supervisorId}`;
  }
  return "/appointments";
}

function displayNameFor(user: typeof users.$inferSelect): string {
  const profile =
    user.role === "therapist"
      ? db.select({ name: therapists.name }).from(therapists).where(eq(therapists.id, user.therapistId ?? 0)).get()
      : user.role === "supervisor"
        ? db.select({ name: supervisors.name }).from(supervisors).where(eq(supervisors.id, user.supervisorId ?? 0)).get()
        : db.select({ name: agents.name }).from(agents).where(eq(agents.id, user.agentId ?? 0)).get();
  return profile?.name ?? user.username;
}

export function findUserByUsername(username: string) {
  return db.select().from(users).where(eq(users.username, username)).get();
}

// preHandler hook: loads the session's user onto the request and into every view.
export async function loadCurrentUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const userId = request.session.userId;
  const user = userId ? db.select().from(users).where(eq(users.id, userId)).get() : undefined;

  request.currentUser = user
    ? {
        id: user.id,
        username: user.username,
        role: user.role as Role,
        agentId: user.agentId,
        therapistId: user.therapistId,
        supervisorId: user.supervisorId,
        displayName: displayNameFor(user),
        homePath: homePathFor(user),
      }
    : null;
  reply.locals.currentUser = request.currentUser;
}

// A same-site path to redirect to: must start with a single "/" (so not
// "//evil.com" or "/\evil.com", which browsers treat as off-site).
export function isSafePath(path: string | undefined): path is string {
  return typeof path === "string" && /^\/(?![/\\])/.test(path);
}

// Returns the logged-in user, or sends a redirect to the login page and returns
// null. GETs come back to the same page after login; a POST can't be replayed,
// so it just goes to the login page.
export function requireLogin(request: FastifyRequest, reply: FastifyReply): CurrentUser | null {
  if (request.currentUser) {
    return request.currentUser;
  }
  const next = request.method === "GET" ? `?next=${encodeURIComponent(request.url)}` : "";
  reply.redirect(`/login${next}`);
  return null;
}

export function forbid(reply: FastifyReply) {
  return reply.code(403).view("forbidden.ejs", {
    title: "Not allowed — AgentClinic",
  });
}

export function isAgent(user: CurrentUser | null, agentId: number): boolean {
  return user?.role === "agent" && user.agentId === agentId;
}

export function isTherapist(user: CurrentUser | null, therapistId: number): boolean {
  return user?.role === "therapist" && user.therapistId === therapistId;
}

export function isSupervisorOf(user: CurrentUser | null, agent: { supervisorId: number | null }): boolean {
  return user?.role === "supervisor" && agent.supervisorId !== null && user.supervisorId === agent.supervisorId;
}
