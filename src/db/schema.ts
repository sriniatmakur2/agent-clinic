import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

// Trivial table proving Fastify -> Drizzle -> SQLite is wired end to end.
// Each server boot inserts one row here (see routes/home.ts).
export const bootLog = sqliteTable("boot_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bootedAt: text("booted_at").notNull(),
});

export const supervisors = sqliteTable("supervisors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  bio: text("bio").notNull(),
  avatarEmoji: text("avatar_emoji").notNull(),
});

export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  bio: text("bio").notNull(),
  avatarEmoji: text("avatar_emoji").notNull(),
  supervisorId: integer("supervisor_id").references(() => supervisors.id),
});

export const ailments = sqliteTable("ailments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
});

export const agentAilments = sqliteTable("agent_ailments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id")
    .notNull()
    .references(() => agents.id),
  ailmentId: integer("ailment_id")
    .notNull()
    .references(() => ailments.id),
  reportedAt: text("reported_at").notNull(),
});

export const therapies = sqliteTable("therapies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  icon: text("icon").notNull(),
});

export const therapists = sqliteTable("therapists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  bio: text("bio").notNull(),
  avatarEmoji: text("avatar_emoji").notNull(),
});

// A therapist's specialties are the ailments (from the Phase 2 catalog) they treat.
export const therapistSpecialties = sqliteTable("therapist_specialties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  therapistId: integer("therapist_id")
    .notNull()
    .references(() => therapists.id),
  ailmentId: integer("ailment_id")
    .notNull()
    .references(() => ailments.id),
});

// A login. Each user has exactly one role and links to exactly one agent,
// therapist, or supervisor row — the FK matching `role` is set, the others null.
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  // scrypt, stored as "salt:hash" (hex) — see src/auth.ts.
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  agentId: integer("agent_id").references(() => agents.id),
  therapistId: integer("therapist_id").references(() => therapists.id),
  supervisorId: integer("supervisor_id").references(() => supervisors.id),
});

// An agent's request for a session with a therapist. Starts as "requested"
// with therapyId/notes/prescribedAt null; the therapist prescribing a therapy
// moves it to "prescribed" (and can revise the prescription afterwards).
export const appointments = sqliteTable("appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id")
    .notNull()
    .references(() => agents.id),
  therapistId: integer("therapist_id")
    .notNull()
    .references(() => therapists.id),
  requestedAt: text("requested_at").notNull(),
  status: text("status").notNull().default("requested"),
  therapyId: integer("therapy_id").references(() => therapies.id),
  notes: text("notes"),
  prescribedAt: text("prescribed_at"),
  createdAt: text("created_at").notNull(),
});
