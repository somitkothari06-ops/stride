import { z } from "zod";
import type { Appearance } from "./themes";
import type { CourseMaterial, CourseExcerpt } from "./course-types";
import { LifeContextSchema, type LifeContext } from "./personal-context";
import type { EvidenceEntry } from "./evidence";
import type { Continuation, FocusSession } from "./focus-session";

export const IntakeSchema = z.object({
  title: z.string().min(1).max(160),
  subject: z.string().min(1).max(80),
  kind: z.enum(["assignment", "exam", "project", "revision"]),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  summary: z.string().max(1000),
  uncertainty: z.string().max(500),
});
export type Intake = z.infer<typeof IntakeSchema>;
export type View = "today" | "work" | "memory" | "direction";
export type Mode = "guided" | "live";
export type Work = Intake & {
  id: string;
  source: string;
  sourceType: string;
  createdAt: string;
  completed: boolean;
};
export type Observation = {
  id: string;
  workId: string;
  title: string;
  answer: string;
  feedback: string;
  method: "self-report" | "model-assessment";
  createdAt: string;
  removed: boolean;
};
export type Plan = {
  id: string;
  workId: string;
  title: string;
  description: string;
  minutes: number;
  reasons: string[];
  sourceIds: string[];
  contextRevision: number;
  mode: Mode;
  createdAt: string;
};
export type Prepared = {
  courseSources?: CourseExcerpt[];
  workId: string;
  title: string;
  context: string;
  steps: string[];
  question: string;
  mode: Mode;
  contextRevision: number;
};
export type RoleSource = {
  url: string;
  title: string;
  excerpt: string;
  retrievedAt: string;
};
export type Direction = {
  role: string;
  summary: string;
  courseConnection?: string;
  nextMove?: string;
  requirements: {
    requirement: string;
    friendlyLabel?: string;
    evidenceIds: string[];
    sourceQuotes?: { sourceIndex: number; quote: string }[];
    nextStep: string;
  }[];
  sources: RoleSource[];
  mode: Mode;
  updatedAt: string;
};
export type PipSource = { originId?:string; id: string; title: string; url?: string; locator?: string; excerpt: string };
export type PipMessage = { id: string; turnId: string; role: "user" | "assistant"; text: string; createdAt: string; intent?: "talk" | "teach" | "search"; sources?: PipSource[]; searchStatus?: "used" | "unavailable" };
export type PipChat = { version: number; messages: PipMessage[] };
export type PipThread = {id:string;title:string;createdAt:string;updatedAt:string;titleMode?:"auto"|"manual";titledVersion?:number;chat:PipChat};
export type PipThreads = {revision:number;activeId:string;items:PipThread[]};
export type PipThreadSummary = {id:string;title:string;updatedAt:string;messageCount:number;needsTitle:boolean};
export type PipSnapshot = {chat:PipChat;threadId:string;threadRevision:number;threads:PipThreadSummary[]};
export type EvidenceJournal = { entries: EvidenceEntry[] };
export type Workspace = {
  pipChat?: PipChat;
  pipThreads?: PipThreads;
  notes?: { id: string; text: string; createdAt: string }[];
  materials?: CourseMaterial[];
  appearance?: Appearance;
  dailyPreferences?: {enabled:boolean;hour:number;version:number};
  preferencesVersion?: number;
  evidence?: EvidenceJournal;
  focus?: FocusSession | null;
  returnCard?: Continuation | null;
  version: 1;
  revision: number;
  sample: boolean;
  profile: {
    lifeContext?: LifeContext;
    onboardingComplete?: boolean;
    name: string;
    year: string;
    goal: string;
    minutes: number;
    timezone: string;
  };
  works: Work[];
  observations: Observation[];
  plan: Plan | null;
  prepared: Prepared | null;
  direction: Direction | null;
  notice: string | null;
};

const validDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + "T12:00:00Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Enter a valid date");
export const ConfirmSchema = IntakeSchema.extend({
  dueDate: validDate.nullable(),
  source: z.string().min(1).max(12000),
  sourceType: z.enum([
    "My own words",
    "Class notes",
    "WhatsApp",
    "Email",
    "Assignment",
    "Project",
    "Voice capture",
    "Companion",
  ]),
  uncertainty: z.string().max(500).default(""),
});
export const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("saveNote"), text: z.string().trim().min(1).max(6000) }),
  z.object({ action: z.literal("deleteNote"), id: z.string().min(1) }),
  z.object({ action: z.literal("aboutYou"), name: z.string().trim().min(1).max(60), year: z.enum(["2nd year", "3rd year"]), goal: z.string().max(120), minutes: z.number().int().min(5).max(180), context: LifeContextSchema }),
  z.object({
    action: z.literal("profile"),
    name: z.string().min(1).max(60),
    year: z.enum(["2nd year", "3rd year"]),
    goal: z.string().max(120),
    minutes: z.number().int().min(5).max(180),
  }),
  z.object({ action: z.literal("add"), work: ConfirmSchema }),
  z.object({
    action: z.literal("editWork"),
    id: z.string(),
    title: z.string().min(1).max(160),
    dueDate: validDate.nullable(),
  }),
  z.object({ action: z.literal("complete"), id: z.string() }),
  z.object({ action: z.literal("deleteWork"), id: z.string() }),
  z.object({ action: z.literal("removeObservation"), id: z.string() }),
  z.object({ action: z.literal("plan") }),
  z.object({ action: z.literal("prepare"), id: z.string() }),
  z.object({
    action: z.literal("attempt"),
    id: z.string(),
    answer: z.string().min(10).max(6000),
  }),
  z.object({
    action: z.literal("direction"),
    role: z.string().min(3).max(120),
  }),
  z.object({ action: z.literal("reset"), sample: z.boolean() }),
]);
