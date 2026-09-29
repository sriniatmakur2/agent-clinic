import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

// Trivial table proving Fastify -> Drizzle -> SQLite is wired end to end.
// Each server boot inserts one row here (see routes/home.ts).
export const bootLog = sqliteTable("boot_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bootedAt: text("booted_at").notNull(),
});
