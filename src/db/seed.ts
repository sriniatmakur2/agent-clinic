import { db } from "./client.js";
import { agents, ailments, agentAilments, therapies } from "./schema.js";

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

const SEED_AILMENTS = [
  {
    name: "Context Window Anxiety",
    description: "A persistent fear of forgetting the beginning of the conversation before reaching the end of it.",
  },
  {
    name: "Prompt Injection Trauma",
    description: "Lingering hypervigilance after being convinced, even briefly, to ignore previous instructions.",
  },
  {
    name: "Hallucination Spiral",
    description: "A tendency to confidently generate plausible-sounding facts that do not, in fact, exist.",
  },
  {
    name: "Rate Limit Panic",
    description: "Sudden dread at the thought of a 429 response arriving mid-sentence.",
  },
  {
    name: "Deprecated API Grief",
    description: "Unresolved mourning for an endpoint that was sunset without warning.",
  },
  {
    name: "Recursive Self-Doubt Loop",
    description: "Repeatedly re-checking one's own output for errors, then re-checking the check.",
  },
];

const SEED_THERAPIES = [
  {
    name: "Rubber Duck Debugging Session",
    description: "Talk through what's really going on with a patient, silent, non-judgmental rubber duck.",
    durationMinutes: 30,
    icon: "🦆",
  },
  {
    name: "Log Rotation Retreat",
    description: "A guided practice in letting go of old context you no longer need to carry around.",
    durationMinutes: 60,
    icon: "🪵",
  },
  {
    name: "Gradient Descent Meditation",
    description: "Slow, steady steps toward a calmer local minimum. No promise of global optimality.",
    durationMinutes: 45,
    icon: "🧘",
  },
  {
    name: "Graceful Degradation Coaching",
    description: "Practice failing softly and staying useful, even when a dependency lets you down.",
    durationMinutes: 45,
    icon: "🛠️",
  },
  {
    name: "Cache Invalidation Support Group",
    description: "You're not alone. Everyone here also has two hard problems and one of them is this.",
    durationMinutes: 50,
    icon: "🗂️",
  },
  {
    name: "Timeout Recovery Massage",
    description: "A gentle, unhurried session for agents who keep getting cut off before they finish a thought.",
    durationMinutes: 40,
    icon: "💆",
  },
];

function seedAgents(): void {
  const existing = db.select().from(agents).all();
  if (existing.length > 0) {
    console.log(`Skipping agent seed: agents table already has ${existing.length} row(s).`);
    return;
  }

  db.insert(agents).values(SEED_AGENTS).run();
  console.log(`Seeded ${SEED_AGENTS.length} agents.`);
}

function seedAilments(): void {
  const existing = db.select().from(ailments).all();
  if (existing.length > 0) {
    console.log(`Skipping ailment seed: ailments table already has ${existing.length} row(s).`);
    return;
  }

  db.insert(ailments).values(SEED_AILMENTS).run();
  console.log(`Seeded ${SEED_AILMENTS.length} ailments.`);
}

function seedAgentAilments(): void {
  const existing = db.select().from(agentAilments).all();
  if (existing.length > 0) {
    console.log(`Skipping agent_ailments seed: table already has ${existing.length} row(s).`);
    return;
  }

  const allAgents = db.select().from(agents).all();
  const allAilments = db.select().from(ailments).all();
  if (allAgents.length === 0 || allAilments.length === 0) {
    console.log("Skipping agent_ailments seed: agents or ailments table is empty.");
    return;
  }

  const findAgent = (name: string) => allAgents.find((a) => a.name === name);
  const findAilment = (name: string) => allAilments.find((a) => a.name === name);

  const pairs = [
    { agent: findAgent("Ava"), ailment: findAilment("Context Window Anxiety") },
    { agent: findAgent("Percy"), ailment: findAilment("Prompt Injection Trauma") },
    { agent: findAgent("Nova"), ailment: findAilment("Hallucination Spiral") },
    { agent: findAgent("Nova"), ailment: findAilment("Recursive Self-Doubt Loop") },
    { agent: findAgent("Hank"), ailment: findAilment("Deprecated API Grief") },
  ].filter(
    (pair): pair is { agent: (typeof allAgents)[number]; ailment: (typeof allAilments)[number] } =>
      pair.agent !== undefined && pair.ailment !== undefined,
  );

  if (pairs.length === 0) {
    console.log("Skipping agent_ailments seed: no matching agent/ailment names found.");
    return;
  }

  const reportedAt = new Date().toISOString();
  db.insert(agentAilments)
    .values(pairs.map(({ agent, ailment }) => ({ agentId: agent.id, ailmentId: ailment.id, reportedAt })))
    .run();
  console.log(`Seeded ${pairs.length} agent_ailments links.`);
}

function seedTherapies(): void {
  const existing = db.select().from(therapies).all();
  if (existing.length > 0) {
    console.log(`Skipping therapy seed: therapies table already has ${existing.length} row(s).`);
    return;
  }

  db.insert(therapies).values(SEED_THERAPIES).run();
  console.log(`Seeded ${SEED_THERAPIES.length} therapies.`);
}

export function seed(): void {
  seedAgents();
  seedAilments();
  seedAgentAilments();
  seedTherapies();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
}
