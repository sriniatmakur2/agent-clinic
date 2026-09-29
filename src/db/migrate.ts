import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./client.js";

export function runMigrations(): void {
  migrate(db, { migrationsFolder: "./drizzle" });
}

// Allow `npm run db:migrate` to invoke this directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
  console.log("Migrations applied.");
}
