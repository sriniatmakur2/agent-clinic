import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

// Trivial table proving Fastify -> Drizzle -> SQLite is wired end to end.
// Each server boot inserts one row here (see routes/home.ts).
export const bootLog = sqliteTable("boot_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bootedAt: text("booted_at").notNull(),
});

export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  bio: text("bio").notNull(),
  avatarEmoji: text("avatar_emoji").notNull(),
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
