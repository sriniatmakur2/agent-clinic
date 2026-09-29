import { buildApp } from "./app.js";
import { runMigrations } from "./db/migrate.js";
import { db } from "./db/client.js";
import { bootLog } from "./db/schema.js";

runMigrations();
db.insert(bootLog).values({ bootedAt: new Date().toISOString() }).run();

const app = buildApp();

const port = Number(process.env.PORT ?? 3000);

app.listen({ port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
