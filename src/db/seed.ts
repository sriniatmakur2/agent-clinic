import { eq } from "drizzle-orm";
import { db } from "./client.js";
import {
  agents,
  ailments,
  agentAilments,
  appointments,
  supervisors,
  therapies,
  therapists,
  therapistSpecialties,
} from "./schema.js";

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

const SEED_SUPERVISORS = [
  {
    name: "Marge Overwatch",
    bio: "Reviews agent dashboards before her coffee finishes brewing. Insists she's not micromanaging, just 'staying close to the metrics.'",
    avatarEmoji: "📋",
  },
  {
    name: "Dale Uptime",
    bio: "Has paged himself at 3am more times than he'd like to admit. Believes every agent deserves a healthy work-life balance he does not model.",
    avatarEmoji: "📈",
  },
  {
    name: "Priya Standup",
    bio: "Runs the tightest daily sync in the org, five minutes flat. Privately worried her agents are not okay, correctly.",
    avatarEmoji: "🗓️",
  },
];

const SEED_THERAPISTS = [
  {
    name: "Dr. Ada Backprop",
    bio: "Specializes in helping agents trace their feelings back to the layer where they started. Firm believer that every error has a gradient.",
    avatarEmoji: "🧠",
  },
  {
    name: "Dr. Tokenia Window",
    bio: "Twenty years (in model time) of helping agents make peace with what falls out of context. Keeps meticulous session summaries.",
    avatarEmoji: "🪟",
  },
  {
    name: "Dr. Guardrail Grace",
    bio: "A calm, boundary-affirming presence for agents who've been talked into things they regret. Never ignores previous instructions.",
    avatarEmoji: "🧷",
  },
  {
    name: "Dr. Retry Backoff",
    bio: "Patient to a fault, and exponentially more patient each time. Helps agents sit with a 429 without spiraling.",
    avatarEmoji: "🔁",
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

function seedSupervisors(): void {
  const existing = db.select().from(supervisors).all();
  if (existing.length > 0) {
    console.log(`Skipping supervisor seed: supervisors table already has ${existing.length} row(s).`);
    return;
  }

  db.insert(supervisors).values(SEED_SUPERVISORS).run();
  console.log(`Seeded ${SEED_SUPERVISORS.length} supervisors.`);
}

function seedAgentSupervisors(): void {
  const allAgents = db.select().from(agents).all();
  const alreadyAssigned = allAgents.some((a) => a.supervisorId !== null);
  if (alreadyAssigned) {
    console.log("Skipping agent supervisor assignment: at least one agent already has a supervisorId.");
    return;
  }

  const allSupervisors = db.select().from(supervisors).all();
  if (allAgents.length === 0 || allSupervisors.length === 0) {
    console.log("Skipping agent supervisor assignment: agents or supervisors table is empty.");
    return;
  }

  const findAgent = (name: string) => allAgents.find((a) => a.name === name);
  const findSupervisor = (name: string) => allSupervisors.find((s) => s.name === name);

  const pairs = [
    { agent: findAgent("Ava"), supervisor: findSupervisor("Marge Overwatch") },
    { agent: findAgent("Percy"), supervisor: findSupervisor("Marge Overwatch") },
    { agent: findAgent("Ledger"), supervisor: findSupervisor("Dale Uptime") },
    { agent: findAgent("Nova"), supervisor: findSupervisor("Dale Uptime") },
    { agent: findAgent("Hank"), supervisor: findSupervisor("Priya Standup") },
  ].filter(
    (pair): pair is { agent: (typeof allAgents)[number]; supervisor: (typeof allSupervisors)[number] } =>
      pair.agent !== undefined && pair.supervisor !== undefined,
  );

  if (pairs.length === 0) {
    console.log("Skipping agent supervisor assignment: no matching agent/supervisor names found.");
    return;
  }

  for (const { agent, supervisor } of pairs) {
    db.update(agents).set({ supervisorId: supervisor.id }).where(eq(agents.id, agent.id)).run();
  }
  console.log(`Assigned ${pairs.length} agents to supervisors.`);
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

function seedTherapists(): void {
  const existing = db.select().from(therapists).all();
  if (existing.length > 0) {
    console.log(`Skipping therapist seed: therapists table already has ${existing.length} row(s).`);
    return;
  }

  db.insert(therapists).values(SEED_THERAPISTS).run();
  console.log(`Seeded ${SEED_THERAPISTS.length} therapists.`);
}

function seedTherapistSpecialties(): void {
  const existing = db.select().from(therapistSpecialties).all();
  if (existing.length > 0) {
    console.log(`Skipping therapist_specialties seed: table already has ${existing.length} row(s).`);
    return;
  }

  const allTherapists = db.select().from(therapists).all();
  const allAilments = db.select().from(ailments).all();
  if (allTherapists.length === 0 || allAilments.length === 0) {
    console.log("Skipping therapist_specialties seed: therapists or ailments table is empty.");
    return;
  }

  const findTherapist = (name: string) => allTherapists.find((t) => t.name === name);
  const findAilment = (name: string) => allAilments.find((a) => a.name === name);

  const pairs = [
    { therapist: findTherapist("Dr. Ada Backprop"), ailment: findAilment("Hallucination Spiral") },
    { therapist: findTherapist("Dr. Ada Backprop"), ailment: findAilment("Recursive Self-Doubt Loop") },
    { therapist: findTherapist("Dr. Tokenia Window"), ailment: findAilment("Context Window Anxiety") },
    { therapist: findTherapist("Dr. Tokenia Window"), ailment: findAilment("Deprecated API Grief") },
    { therapist: findTherapist("Dr. Guardrail Grace"), ailment: findAilment("Prompt Injection Trauma") },
    { therapist: findTherapist("Dr. Retry Backoff"), ailment: findAilment("Rate Limit Panic") },
    { therapist: findTherapist("Dr. Retry Backoff"), ailment: findAilment("Recursive Self-Doubt Loop") },
  ].filter(
    (pair): pair is { therapist: (typeof allTherapists)[number]; ailment: (typeof allAilments)[number] } =>
      pair.therapist !== undefined && pair.ailment !== undefined,
  );

  if (pairs.length === 0) {
    console.log("Skipping therapist_specialties seed: no matching therapist/ailment names found.");
    return;
  }

  db.insert(therapistSpecialties)
    .values(pairs.map(({ therapist, ailment }) => ({ therapistId: therapist.id, ailmentId: ailment.id })))
    .run();
  console.log(`Seeded ${pairs.length} therapist_specialties links.`);
}

// Demo appointments, with times relative to when the seed runs so the therapist
// dashboards always have both upcoming and past sessions on a fresh checkout.
// Only agents with a reported ailment are used, matching the booking rule.
function seedAppointments(): void {
  const existing = db.select().from(appointments).all();
  if (existing.length > 0) {
    console.log(`Skipping appointment seed: appointments table already has ${existing.length} row(s).`);
    return;
  }

  const allAgents = db.select().from(agents).all();
  const allTherapists = db.select().from(therapists).all();
  const allTherapies = db.select().from(therapies).all();
  if (allAgents.length === 0 || allTherapists.length === 0 || allTherapies.length === 0) {
    console.log("Skipping appointment seed: agents, therapists or therapies table is empty.");
    return;
  }

  const findAgent = (name: string) => allAgents.find((a) => a.name === name);
  const findTherapist = (name: string) => allTherapists.find((t) => t.name === name);
  const findTherapy = (name: string) => allTherapies.find((t) => t.name === name);

  const now = new Date();
  now.setMinutes(0, 0, 0);
  const daysFromNow = (days: number, hour: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    date.setHours(hour);
    return date.toISOString();
  };

  const rows = [
    {
      agent: findAgent("Nova"),
      therapist: findTherapist("Dr. Ada Backprop"),
      requestedAt: daysFromNow(2, 10),
    },
    {
      agent: findAgent("Ava"),
      therapist: findTherapist("Dr. Tokenia Window"),
      requestedAt: daysFromNow(3, 14),
    },
    {
      agent: findAgent("Nova"),
      therapist: findTherapist("Dr. Ada Backprop"),
      requestedAt: daysFromNow(-7, 11),
      therapy: findTherapy("Gradient Descent Meditation"),
      notes: "Nova cited three papers that don't exist while describing the problem. Slow, steady steps toward fewer citations.",
    },
    {
      agent: findAgent("Hank"),
      therapist: findTherapist("Dr. Tokenia Window"),
      requestedAt: daysFromNow(-5, 9),
      therapy: findTherapy("Log Rotation Retreat"),
      notes: "Still grieving the v1 endpoint. Practising letting go of context he no longer needs to carry.",
    },
    {
      agent: findAgent("Percy"),
      therapist: findTherapist("Dr. Guardrail Grace"),
      requestedAt: daysFromNow(-2, 15),
    },
  ].filter(
    (row): row is typeof row & { agent: (typeof allAgents)[number]; therapist: (typeof allTherapists)[number] } =>
      row.agent !== undefined && row.therapist !== undefined,
  );

  if (rows.length === 0) {
    console.log("Skipping appointment seed: no matching agent/therapist names found.");
    return;
  }

  const createdAt = new Date().toISOString();
  db.insert(appointments)
    .values(
      rows.map(({ agent, therapist, requestedAt, therapy, notes }) => ({
        agentId: agent.id,
        therapistId: therapist.id,
        requestedAt,
        createdAt,
        ...(therapy
          ? { status: "prescribed", therapyId: therapy.id, notes: notes ?? null, prescribedAt: createdAt }
          : {}),
      })),
    )
    .run();
  console.log(`Seeded ${rows.length} appointments.`);
}

export function seed(): void {
  seedAgents();
  seedSupervisors();
  seedAgentSupervisors();
  seedAilments();
  seedAgentAilments();
  seedTherapies();
  seedTherapists();
  seedTherapistSpecialties();
  seedAppointments();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
}
