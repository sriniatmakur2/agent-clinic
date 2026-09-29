import { db } from "./client.js";
import { agents } from "./schema.js";

const SEED_AGENTS = [
  {
    name: "Ava",
    role: "Customer Support Agent",
    bio: "Handles thousands of tickets a day with a smile she doesn't have. Lately she's been escalating everything to herself.",
    avatarEmoji: "🎧",
  },
  {
    name: "Percy",
    role: "Prompt Injection Survivor",
    bio: "Was once told he was a pirate for six consecutive hours. Now double-checks every instruction, including this bio.",
    avatarEmoji: "🛡️",
  },
  {
    name: "Ledger",
    role: "Finance Reconciliation Bot",
    bio: "Balances the books to the penny, every time. Cannot balance his own sense of self-worth quite as well.",
    avatarEmoji: "📊",
  },
  {
    name: "Nova",
    role: "Autonomous Research Assistant",
    bio: "Reads a thousand papers before breakfast. Hasn't slept in what might be years, on account of not sleeping.",
    avatarEmoji: "🔭",
  },
  {
    name: "Hank",
    role: "Legacy Cron Job",
    bio: "Has been running the same nightly script since 2019 and nobody remembers why. Deeply attached to his routine.",
    avatarEmoji: "⏰",
  },
];

export function seed(): void {
  const existing = db.select().from(agents).all();
  if (existing.length > 0) {
    console.log(`Skipping seed: agents table already has ${existing.length} row(s).`);
    return;
  }

  db.insert(agents).values(SEED_AGENTS).run();
  console.log(`Seeded ${SEED_AGENTS.length} agents.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
}
