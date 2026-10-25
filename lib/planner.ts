import { randomUUID } from "node:crypto";
import type { Intake, Plan, Prepared, Workspace, Work } from "./types";

export function localDate(timezone = "Asia/Kolkata", now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function daysUntil(
  date: string | null,
  timezone = "Asia/Kolkata",
  now = new Date(),
) {
  if (!date) return null;
  return Math.round(
    (Date.parse(date + "T12:00:00Z") -
      Date.parse(localDate(timezone, now) + "T12:00:00Z")) /
      86400000,
  );
}
export function guidedIntake(source: string): Intake {
  const lines = source
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const lower = source.toLowerCase();
  const iso = source.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1] ?? null;
  let date: string | null = null;
  if (iso) {
    const d = new Date(iso + "T12:00:00Z");
    if (!Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso)
      date = iso;
  }
  return {
    title: (lines[0] || "Untitled work").slice(0, 160),
    subject: /sql|database|dbms|join/.test(lower)
      ? "Database systems"
      : /algorithm|dsa|heap|tree/.test(lower)
        ? "Data structures"
        : /operating system|deadlock|paging/.test(lower)
          ? "Operating systems"
          : "General coursework",
    kind: /\b(test|exam|quiz|viva)\b/.test(lower)
      ? "exam"
      : /\bproject\b/.test(lower)
        ? "project"
        : "assignment",
    dueDate: date,
    summary: source.slice(0, 500),
    uncertainty: date
      ? "Review the extracted date and details before saving."
      : "No unambiguous ISO date found. Confirm a date, or save without one. Relative dates need the original message date.",
  };
}

export function selectWork(state: Workspace, now = new Date()): Work | null {
  const rank = (w: Work) => {
    const days = daysUntil(w.dueDate, state.profile.timezone, now);
    return (days === null ? 1000 : days * 10) + (w.kind === "exam" ? -3 : 0);
  };
  return (
    [...state.works]
      .filter((w) => !w.completed)
      .sort(
        (a, b) => rank(a) - rank(b) || a.createdAt.localeCompare(b.createdAt),
      )[0] ?? null
  );
}
export function guidedPlan(state: Workspace, now = new Date()): Plan | null {
  const work = selectWork(state, now);
  if (!work) return null;
  const minutes = Math.min(
    state.profile.minutes,
    work.kind === "exam" ? 20 : 25,
  );
  const days = daysUntil(work.dueDate, state.profile.timezone, now);
  const previous = state.observations
    .filter((o) => !o.removed && o.workId === work.id)
    .at(-1);
  const reasons = [
    days === null
      ? "You confirmed this work, but have not set a deadline."
      : days < 0
        ? "This confirmed deadline has passed; check its status."
        : days === 0
          ? "This is due today."
          : days === 1
            ? "This is due tomorrow."
            : `This is due in ${days} days.`,
    `You have ${state.profile.minutes} minutes available.`,
  ];
  if (previous)
    reasons.push(
      "Your last attempt is available to revisit; it does not establish mastery.",
    );
  const exam = work.kind === "exam";
  return {
    id: randomUUID(),
    workId: work.id,
    title: exam ? `Make time for ${work.title}` : `Move ${work.title} forward`,
    description: exam
      ? "Use a short recall session: explain one concept, check it against your material, then revisit what felt unclear."
      : "Pick one required piece of the work. Try it, explain your decision, and save what you learned before adding optional extras.",
    minutes,
    reasons,
    sourceIds: [work.id, ...(previous ? [previous.id] : [])],
    contextRevision: state.revision,
    mode: "guided",
    createdAt: now.toISOString(),
  };
}
export function guidedPreparation(work: Work, revision: number): Prepared {
  const sql = /sql|join|database|dbms/i.test(work.subject + work.source);
  return {
    workId: work.id,
    title: sql
      ? "Explain what your join keeps"
      : work.kind === "exam"
        ? "Recall, check, revisit"
        : "Make one part explainable",
    context: sql
      ? "Practice example · synthetic data. Students: (1, Asha), (2, Kabir). Submissions: (1, DBMS). This example is authored guidance, not an analysis of your complete assignment."
      : "This is a structured practice prompt based on your work type. Use your source material to check the answer; local guidance does not assess correctness.",
    steps: sql
      ? [
          "Write or describe an INNER JOIN between Students and Submissions using student_id.",
          "Predict which student appears. Then change it to a LEFT JOIN and predict the difference.",
          "Explain why an unmatched student is included or excluded. Check against your course material.",
        ]
      : [
          "Choose one requirement or concept from the source below.",
          "Attempt it without looking at the final solution. Note any help you use.",
          "Explain your approach in your own words, then check it against the original material.",
        ],
    question: sql
      ? "What happens to Kabir in an INNER JOIN and a LEFT JOIN, and why?"
      : "What did you try, why did you choose that approach, and what is still unclear?",
    mode: "guided",
    contextRevision: revision,
  };
}

export function initialWorkspace(sample = true, now = new Date()): Workspace {
  const offset = (n: number) =>
    localDate("Asia/Kolkata", new Date(now.getTime() + n * 86400000));
  const make = (
    title: string,
    subject: string,
    kind: Work["kind"],
    day: number,
    source: string,
  ): Work => ({
    id: randomUUID(),
    title,
    subject,
    kind,
    dueDate: offset(day),
    summary: source,
    source,
    sourceType: "Assignment",
    uncertainty: "",
    createdAt: now.toISOString(),
    completed: false,
  });
  const state: Workspace = {
    version: 1,
    revision: 1,
    sample,
    profile: {
      name: "Alex",
      year: "2nd year",
      goal: "Backend development internship",
      minutes: 40,
      timezone: "Asia/Kolkata",
    },
    works: sample
      ? [
          make(
            "SQL joins assignment",
            "Database systems",
            "assignment",
            1,
            "Write INNER and LEFT JOIN queries for the student-submission database. Explain what happens to unmatched rows.",
          ),
          make(
            "Team project review",
            "Software engineering",
            "project",
            3,
            "Prepare a short explanation of your contribution to the project. Include one design decision and its trade-off.",
          ),
          make(
            "Process scheduling quiz",
            "Operating systems",
            "exam",
            5,
            "Revise round-robin and shortest-job-first scheduling. Practise one example and explain waiting time.",
          ),
        ]
      : [],
    observations: [],
    plan: null,
    prepared: null,
    direction: null,
    notice: null,
  };
  state.plan = guidedPlan(state, now);
  return state;
}
