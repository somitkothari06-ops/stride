export type BuildStep = { title: string; task: string; deliverable: string; question: string; minutes: number; subject: string };
export type BuildFeedback = { noticed: string; improve: string; question: string; next: BuildStep; sourceIds: string[] };
export type BuildAttempt = { id: string; requestId: string; step: BuildStep; text: string; evidenceId?: string; createdAt: string; feedback: BuildFeedback; sources: {id:string;title:string;excerpt:string;locator?:string}[] };
export type StudentBuild = { id: string; title: string; idea: string; subject: string; why: string; createdAt: string; paused: boolean; current: BuildStep; milestones: BuildStep[]; attempts: BuildAttempt[]; awaitingNext: boolean; createRequestId: string; receipts: string[] };
export type BuildState = { version: number; project: StudentBuild | null; receipts?: {id:string;fingerprint:string}[] };
export type BuildSnapshot = { build: BuildState; evidence: { id: string; activity: string; createdAt: string }[]; coursework: { id: string; title: string; subject: string }[] };
